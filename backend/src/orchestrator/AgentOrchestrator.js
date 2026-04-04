import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { subscribeToQueue, publishToAgent, broadcastMessage, QUEUES } from '../config/rabbitmq.js';
import { getRedisClient, publishEvent } from '../config/redis.js';
import { Agent, AgentState, Workflow, WorkflowExecution, Company } from '../models/index.js';
import { queryLLM } from '../config/langchain.js';

// import all agents
import LogIntelligenceAgent from '../agents/LogIntelligenceAgent.js';
import CrashDiagnosticAgent from '../agents/CrashDiagnosticAgent.js';
import ResourceOptimizationAgent from '../agents/ResourceOptimizationAgent.js';
import AnomalyDetectionAgent from '../agents/AnomalyDetectionAgent.js';
import RecoveryAgent from '../agents/RecoveryAgent.js';
import RecommendationAgent from '../agents/RecommendationAgent.js';
import CostOptimizationAgent from '../agents/CostOptimizationAgent.js';

// CloudWatch service (optional — gracefully skipped if not configured)
import { fetchLogs, filterAndGroupLogs } from '../services/awsCloudWatchService.js';

/**
 * AgentOrchestrator - Central coordinator for all agents
 * Manages agent lifecycle, message routing, and intelligent workflow execution.
 *
 * Intelligence features:
 *  - CloudWatch log injection before each step
 *  - Inter-agent context pipeline (each step's output feeds the next)
 *  - Per-step LLM insight + severity + confidence extraction
 *  - Consolidated LLM analysis after all steps complete
 */
export class AgentOrchestrator {
  constructor(companyId) {
    this.companyId = companyId;
    this.agents = new Map();
    this.workflows = new Map();
    this.activeWorkflows = new Map();
    this.initialized = false;

    // Agent class map
    this.agentClasses = {
      LogIntelligence: LogIntelligenceAgent,
      CrashDiagnostic: CrashDiagnosticAgent,
      ResourceOptimization: ResourceOptimizationAgent,
      AnomalyDetection: AnomalyDetectionAgent,
      Recovery: RecoveryAgent,
      Recommendation: RecommendationAgent,
      CostOptimization: CostOptimizationAgent,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Init / teardown
  // ─────────────────────────────────────────────────────────────────────────

  async initialize() {
    logger.info(`[Orchestrator] Initializing for company: ${this.companyId}`);

    for (const [name, AgentClass] of Object.entries(this.agentClasses)) {
      try {
        const agent = new AgentClass(this, this.companyId);
        await agent.initialize();
        this.agents.set(name, agent);
        logger.info(`[Orchestrator] Initialized agent: ${name}`);
      } catch (error) {
        logger.error(`[Orchestrator] Failed to initialize ${name}:`, error);
      }
    }

    await this.loadWorkflows();

    try {
      await this.setupMessageHandlers();
    } catch (err) {
      logger.warn(`[Orchestrator] Message handlers setup failed (RabbitMQ may not be running): ${err.message}`);
    }

    this.initialized = true;
    logger.info(`[Orchestrator] Initialization complete. ${this.agents.size} agents active.`);
    return this;
  }

  registerAgent(agent) {
    this.agents.set(agent.name, agent);
    logger.info(`[Orchestrator] Registered agent: ${agent.name}`);
  }

  getAgent(name) {
    return this.agents.get(name);
  }

  async shutdown() {
    logger.info('[Orchestrator] Shutting down...');
    for (const [, agent] of this.agents) {
      await agent.updateState({ status: 'idle' });
    }
    this.agents.clear();
    this.activeWorkflows.clear();
    this.initialized = false;
    logger.info('[Orchestrator] Shutdown complete');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Messaging
  // ─────────────────────────────────────────────────────────────────────────

  async routeMessage(from, to, message) {
    const targetAgent = this.agents.get(to);
    if (!targetAgent) {
      logger.warn(`[Orchestrator] Unknown target agent: ${to}`);
      return null;
    }
    return await publishToAgent(to, { from, to, ...message, timestamp: Date.now() });
  }

  async broadcastMessage(from, message) {
    const results = [];
    for (const [name] of this.agents) {
      if (name !== from) {
        const result = await this.routeMessage(from, name, message);
        results.push({ agent: name, messageId: result });
      }
    }
    return results;
  }

  async collaborativeQuery(agentNames, query) {
    const promises = agentNames.map(async (name) => {
      const agent = this.agents.get(name);
      if (agent) {
        try {
          const result = await agent.process(query);
          return { agent: name, result, success: true };
        } catch (error) {
          return { agent: name, error: error.message, success: false };
        }
      }
      return { agent: name, error: 'Agent not found', success: false };
    });
    return await Promise.all(promises);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Workflow management
  // ─────────────────────────────────────────────────────────────────────────

  async loadWorkflows() {
    try {
      const workflows = await Workflow.find({ company: this.companyId, isActive: true });
      for (const workflow of workflows) {
        this.workflows.set(workflow.name, workflow);
      }
      logger.info(`[Orchestrator] Loaded ${workflows.length} workflows`);
    } catch (error) {
      logger.error('[Orchestrator] Failed to load workflows:', error);
    }
  }

  async defineWorkflow(name, steps, options = {}) {
    const workflow = await Workflow.create({
      company: this.companyId,
      name,
      steps: steps.map((step, index) => ({ order: index + 1, ...step })),
      type: options.type || 'custom',
      trigger: options.trigger || { type: 'manual' },
      description: options.description,
      createdBy: options.createdBy,
    });
    this.workflows.set(name, workflow);
    logger.info(`[Orchestrator] Defined workflow: ${name}`);
    return workflow;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CloudWatch log injection helper
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Attempt to fetch & filter CloudWatch logs for a given step.
   * Returns { logs, meta } or null if AWS is not configured / fetch fails.
   */
  async _injectCloudWatchLogs(stepAgentName) {
    try {
      const company = await Company.findById(this.companyId);
      if (!company?.awsCredentials?.isConfigured) return null;

      const creds = company.getAwsCredentials();
      if (!creds?.accessKeyId) return null;

      // Heuristic: pick a relevant log group based on agent type
      const logGroupHints = {
        LogIntelligence:       '/aws/lambda',
        CrashDiagnostic:       '/aws/ec2',
        AnomalyDetection:      '/aws/ecs',
        ResourceOptimization:  '/aws/ec2',
        Recovery:              '/aws/lambda',
        Recommendation:        '/aws/ecs',
        CostOptimization:      '/aws/lambda',
      };

      // Use first available log group or the hinted prefix
      const hint = logGroupHints[stepAgentName] || '/aws';
      const rawLogs = await fetchLogs(creds, hint, {
        limit: 200,
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // last 6h
      });

      const filtered = filterAndGroupLogs(rawLogs, {
        maxCritical: 50,
        maxWarnings: 30,
        maxInfoSample: 10,
      });

      logger.info(`[Orchestrator][CW] Injected ${filtered.important.length} logs for step ${stepAgentName}`);

      return {
        logs: filtered.important,
        meta: {
          injected: true,
          logCount: filtered.important.length,
          logGroup: hint,
          reductionRatio: filtered.meta.reductionRatio,
          totalRaw: filtered.meta.totalRaw,
        },
      };
    } catch (err) {
      logger.warn(`[Orchestrator][CW] Log injection failed for ${stepAgentName}: ${err.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Extract intelligence from an agent result
  // ─────────────────────────────────────────────────────────────────────────

  _extractIntelligence(result) {
    if (!result || typeof result !== 'object') {
      return { llmInsights: null, severity: 'low', confidence: 0, contextKeys: [] };
    }

    const llmInsights = result.llmInsights ?? result.insights ?? result.analysis ?? null;
    const severity    = result.severity ?? 'low';
    const confidence  = typeof result.confidence === 'number' ? result.confidence : 0;

    // Gather meaningful context keys to pass forward
    const contextKeys = Object.keys(result).filter(k =>
      !['timestamp', 'agent', '_id'].includes(k) && result[k] != null
    );

    return { llmInsights, severity, confidence, contextKeys };
  }

  _severityRank(s) {
    return { low: 0, medium: 1, high: 2, critical: 3 }[s] ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Consolidated LLM summary
  // ─────────────────────────────────────────────────────────────────────────

  async _generateConsolidatedInsight(workflowName, steps, executions) {
    const systemPrompt = `You are the Helix AI Workflow Analyst. Your role is to synthesize the results of a multi-agent intelligence workflow into a single, coherent, executive-level analysis.

You receive the individual step results from multiple specialized AI agents that were run in sequence, each building on the previous agent's findings. Your job is to:
1. Identify the overarching themes and critical findings across all agents
2. Highlight the most important risks, anomalies, or opportunities discovered
3. Connect the dots between different agent findings to surface deeper insights
4. Provide a prioritized list of actionable recommendations

Respond as JSON:
{
  "headline": "One-sentence summary of the overall situation",
  "overallStatus": "healthy|warning|critical|degraded",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "crossAgentInsights": ["insight connecting multiple agent findings"],
  "prioritizedActions": [
    { "priority": 1, "action": "...", "owner": "agent-name", "urgency": "immediate|soon|planned" }
  ],
  "riskScore": 0-100,
  "confidence": 0.0-1.0
}`;

    const stepSummaries = steps
      .filter(s => s.status === 'completed')
      .map(s => ({
        step: s.stepOrder,
        agent: s.agent,
        severity: s.severity,
        confidence: s.confidence,
        insights: s.llmInsights
          ? (typeof s.llmInsights === 'string'
              ? s.llmInsights.substring(0, 500)
              : JSON.stringify(s.llmInsights).substring(0, 500))
          : 'No LLM insights generated',
        duration: s.duration ? `${(s.duration / 1000).toFixed(1)}s` : 'unknown',
      }));

    const prompt = `Workflow: "${workflowName}"
Total steps: ${steps.length}
Completed: ${steps.filter(s => s.status === 'completed').length}
Failed: ${steps.filter(s => s.status === 'failed').length}

Step Results:
${JSON.stringify(stepSummaries, null, 2)}

Synthesize these multi-agent results into a consolidated workflow insight.`;

    try {
      const response = await queryLLM(systemPrompt, prompt, { companyId: this.companyId });
      return response;
    } catch (err) {
      logger.warn(`[Orchestrator] Consolidated insight LLM call failed: ${err.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Main workflow execution
  // ─────────────────────────────────────────────────────────────────────────

  async executeWorkflow(workflowIdOrName, initialData, triggeredBy = {}) {
    // ── Resolve workflow ─────────────────────────────────────────────────────
    let workflow = null;
    try {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.Types.ObjectId.isValid(workflowIdOrName)) {
        workflow = await Workflow.findOne({ _id: workflowIdOrName, company: this.companyId });
      }
    } catch (err) {
      logger.warn(`[Orchestrator] DB lookup by _id failed: ${err.message}`);
    }

    if (!workflow) workflow = this.workflows.get(workflowIdOrName);
    if (!workflow) workflow = await Workflow.findOne({ name: workflowIdOrName, company: this.companyId });
    if (!workflow) throw new Error(`Workflow not found: ${workflowIdOrName}`);

    // ── Resolve steps ────────────────────────────────────────────────────────
    let executableSteps = workflow.steps || [];
    if ((!executableSteps || executableSteps.length === 0) && workflow.graph?.nodes?.length) {
      executableSteps = this.graphToSteps(workflow.graph);
    }

    const executionId = uuidv4();
    const workflowName = workflow.name;

    // ── Create execution record ──────────────────────────────────────────────
    const execution = await WorkflowExecution.create({
      company: this.companyId,
      workflow: workflow._id,
      workflowName,
      workflowVersion: workflow.version,
      status: 'running',
      triggeredBy,
      startTime: new Date(),
      totalSteps: executableSteps.length,
      initialData,
      steps: executableSteps.map((step, idx) => ({
        stepOrder: step.order || idx + 1,
        agent: step.agent,
        action: step.action || 'process',
        status: 'pending',
      })),
    });

    this.activeWorkflows.set(executionId, execution);
    logger.info(`[Orchestrator] Starting workflow: ${workflowName} (${executionId})`);

    // ── Context pipeline — carries both initial data and inter-step intel ────
    let pipelineContext = { ...initialData };
    const contextPipeline = [];

    try {
      for (let si = 0; si < executableSteps.length; si++) {
        const step = executableSteps[si];
        const stepIndex = (step.order || si + 1) - 1;

        // ── Condition check ────────────────────────────────────────────────
        if (step.condition) {
          try {
            const conditionFn = new Function('prevResult', `return ${step.condition}`);
            if (!conditionFn(pipelineContext)) {
              execution.steps[stepIndex].status = 'skipped';
              continue;
            }
          } catch (e) {
            logger.warn(`[Orchestrator] Condition evaluation failed for step ${step.order}`);
          }
        }

        // ── Update step status ─────────────────────────────────────────────
        execution.steps[stepIndex].status = 'running';
        execution.steps[stepIndex].startTime = new Date();
        execution.currentStep = step.order;
        await execution.save();

        // ── Resolve agent ──────────────────────────────────────────────────
        const agent = this.agents.get(step.agent);
        if (!agent) throw new Error(`Agent not found: ${step.agent}`);

        // ── CloudWatch log injection ───────────────────────────────────────
        let cwMeta = { injected: false, logCount: 0 };
        const cwResult = await this._injectCloudWatchLogs(step.agent);
        let stepInput = pipelineContext;

        if (cwResult) {
          cwMeta = cwResult.meta;
          stepInput = {
            ...pipelineContext,
            logs: cwResult.logs,
            _cloudwatchSource: cwResult.meta.logGroup,
          };
          logger.info(`[Orchestrator] Injected ${cwResult.meta.logCount} CW logs into step ${step.order} (${step.agent})`);
        }

        // ── Apply input mapping if provided ───────────────────────────────
        if (step.inputMapping) {
          stepInput = this.applyMapping(stepInput, step.inputMapping);
        }

        // ── Record context received from prior steps ───────────────────────
        const prevStepKeys = Object.keys(pipelineContext).filter(k =>
          k.startsWith('step') || k === 'previousStepContext'
        );

        execution.steps[stepIndex].contextReceived = {
          fromStep: si > 0 ? (executableSteps[si - 1].order || si) : null,
          fromAgent: si > 0 ? executableSteps[si - 1].agent : null,
          keys: prevStepKeys,
          snippets: prevStepKeys.reduce((acc, k) => {
            const val = pipelineContext[k];
            acc[k] = JSON.stringify(val).substring(0, 150);
            return acc;
          }, {}),
        };
        execution.steps[stepIndex].cloudwatchLogsMeta = cwMeta;

        // ── Execute step with timeout ──────────────────────────────────────
        try {
          const result = await Promise.race([
            agent.process({ action: step.action, data: stepInput }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Step timeout')), step.timeout || 60000)
            ),
          ]);

          // ── Extract intelligence from result ───────────────────────────
          const intel = this._extractIntelligence(result);

          execution.steps[stepIndex].status = 'completed';
          execution.steps[stepIndex].endTime = new Date();
          execution.steps[stepIndex].output = result;
          execution.steps[stepIndex].duration =
            new Date() - execution.steps[stepIndex].startTime;
          execution.steps[stepIndex].llmInsights = intel.llmInsights;
          execution.steps[stepIndex].severity    = intel.severity;
          execution.steps[stepIndex].confidence  = intel.confidence;

          // ── Build context for next step ────────────────────────────────
          const stepKey = `step${step.order || si + 1}Result`;
          const nextStepContext = {
            severity: intel.severity,
            confidence: intel.confidence,
            insights: intel.llmInsights,
            patterns: result?.patterns,
            summary: result?.summary,
            recommendations: result?.recommendations,
          };

          // Apply output mapping or default pipeline pass-through
          if (step.outputMapping) {
            pipelineContext = { ...pipelineContext, ...this.applyMapping(result, step.outputMapping) };
          } else {
            pipelineContext = {
              ...pipelineContext,
              [stepKey]: result,
              previousStepContext: nextStepContext,
            };
          }

          // ── Record context pipeline entry ──────────────────────────────
          if (si + 1 < executableSteps.length) {
            contextPipeline.push({
              fromStep: step.order || si + 1,
              toStep: executableSteps[si + 1].order || si + 2,
              fromAgent: step.agent,
              toAgent: executableSteps[si + 1].agent,
              keys: intel.contextKeys,
            });
          }

        } catch (error) {
          execution.steps[stepIndex].status = 'failed';
          execution.steps[stepIndex].endTime = new Date();
          execution.steps[stepIndex].duration =
            new Date() - execution.steps[stepIndex].startTime;
          execution.steps[stepIndex].error = {
            message: error.message,
            stack: error.stack,
          };

          if (!step.continueOnError) throw error;
        }

        await execution.save();
      }

      // ── All steps done — generate consolidated insight ───────────────────
      logger.info(`[Orchestrator] All steps complete. Generating consolidated insight for: ${workflowName}`);

      const consolidatedRaw = await this._generateConsolidatedInsight(
        workflowName,
        execution.steps,
        execution
      );

      // ── Compute overall severity + confidence ────────────────────────────
      const completedSteps = execution.steps.filter(s => s.status === 'completed');
      let maxSeverityRank = 0;
      let totalConf = 0;

      for (const s of completedSteps) {
        const rank = this._severityRank(s.severity);
        if (rank > maxSeverityRank) maxSeverityRank = rank;
        totalConf += (s.confidence || 0);
      }

      const overallSeverity = ['low', 'medium', 'high', 'critical'][maxSeverityRank];
      const overallConfidence = completedSteps.length > 0
        ? totalConf / completedSteps.length
        : 0;

      // ── Finalize execution ───────────────────────────────────────────────
      execution.status            = 'completed';
      execution.endTime           = new Date();
      execution.duration          = new Date() - execution.startTime;
      execution.finalResult       = pipelineContext;
      execution.consolidatedInsight = consolidatedRaw;
      execution.overallSeverity   = overallSeverity;
      execution.overallConfidence = overallConfidence;
      execution.contextPipeline   = contextPipeline;

      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { 'metrics.executionCount': 1, 'metrics.successCount': 1 },
        $set: { 'metrics.lastExecution': new Date() },
      });

    } catch (error) {
      execution.status  = 'failed';
      execution.endTime = new Date();
      execution.duration = new Date() - execution.startTime;

      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { 'metrics.executionCount': 1, 'metrics.failureCount': 1 },
        $set: { 'metrics.lastExecution': new Date() },
      });

      logger.error(`[Orchestrator] Workflow failed: ${workflowName}`, error);
    }

    await execution.save();
    this.activeWorkflows.delete(executionId);

    try {
      await publishEvent('workflow:completed', {
        workflowName,
        executionId,
        status: execution.status,
        companyId: this.companyId,
      });
    } catch (_) {}

    return execution;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Graph utilities
  // ─────────────────────────────────────────────────────────────────────────

  graphToSteps(graph) {
    const { nodes, edges } = graph;
    if (!nodes?.length) return [];

    const adj = {};
    const inDegree = {};
    nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
    (edges || []).forEach(e => {
      if (adj[e.source]) {
        adj[e.source].push(e.target);
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      }
    });

    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const sorted = [];
    while (queue.length > 0) {
      const curr = queue.shift();
      sorted.push(curr);
      for (const neighbor of (adj[curr] || [])) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      }
    }

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });
    return sorted.map((id, idx) => ({
      order: idx + 1,
      agent: nodeMap[id].agent,
      action: nodeMap[id].action || 'process',
      timeout: 60000,
      retryOnFail: true,
      continueOnError: false,
    }));
  }

  applyMapping(data, mapping) {
    const result = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.getNestedValue(data, path);
    }
    return result;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Message handlers
  // ─────────────────────────────────────────────────────────────────────────

  async setupMessageHandlers() {
    await subscribeToQueue('ORCHESTRATOR', async (message) => {
      logger.debug('[Orchestrator] Received message:', message.type);
      await this.handleMessage(message);
    });
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'agent-error':
        await this.handleAgentError(message);
        break;
      case 'collaboration-request':
        await this.handleCollaborationRequest(message);
        break;
      case 'workflow-trigger':
        await this.executeWorkflow(message.payload.workflowName, message.payload.data, {
          type: 'event',
          eventName: message.payload.event,
        });
        break;
      default:
        logger.debug(`[Orchestrator] Unhandled message type: ${message.type}`);
    }
  }

  async handleAgentError(message) {
    const { agent, error } = message.payload;
    logger.error(`[Orchestrator] Agent error from ${agent}:`, error);
    const agentInstance = this.agents.get(agent);
    if (agentInstance) {
      const errorRate = agentInstance.state.failedTasks /
        (agentInstance.state.tasksProcessed || 1);
      if (errorRate > 0.5) {
        logger.warn(`[Orchestrator] High error rate for ${agent}, consider disabling`);
      }
    }
  }

  async handleCollaborationRequest(message) {
    const { agents, query, correlationId } = message.payload;
    const results = await this.collaborativeQuery(agents, query);
    await this.routeMessage('Orchestrator', message.from, {
      type: 'collaboration-response',
      correlationId,
      results,
    });
  }

  async getAgentsStatus() {
    return Array.from(this.agents.values()).map(a => a.getStatus());
  }

  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }
}

// ── Singleton instances per company ────────────────────────────────────────────
const orchestrators = new Map();

export const getOrchestrator = async (companyId) => {
  if (!orchestrators.has(companyId)) {
    const orchestrator = new AgentOrchestrator(companyId);
    await orchestrator.initialize();
    orchestrators.set(companyId, orchestrator);
  }
  return orchestrators.get(companyId);
};
