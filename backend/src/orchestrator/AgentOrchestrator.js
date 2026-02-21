import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { subscribeToQueue, publishToAgent, broadcastMessage, QUEUES } from '../config/rabbitmq.js';
import { getRedisClient, publishEvent } from '../config/redis.js';
import { Agent, AgentState, Workflow, WorkflowExecution } from '../models/index.js';

// imp all agents
import LogIntelligenceAgent from '../agents/LogIntelligenceAgent.js';
import CrashDiagnosticAgent from '../agents/CrashDiagnosticAgent.js';
import ResourceOptimizationAgent from '../agents/ResourceOptimizationAgent.js';
import AnomalyDetectionAgent from '../agents/AnomalyDetectionAgent.js';
import RecoveryAgent from '../agents/RecoveryAgent.js';
import RecommendationAgent from '../agents/RecommendationAgent.js';
import CostOptimizationAgent from '../agents/CostOptimizationAgent.js';

/**
 * AgentOrchestrator - Central coordinator for all agents
 * Manages agent lifecycle, message routing, and workflow execution
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

  /**
   * Initialize the orchestrator and all agents
   */
  async initialize() {
    logger.info(`[Orchestrator] Initializing for company: ${this.companyId}`);

    // Initialize all agents
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

    // Load workflows from database
    await this.loadWorkflows();

    // Set up message subscriptions
    await this.setupMessageHandlers();

    this.initialized = true;
    logger.info(`[Orchestrator] Initialization complete. ${this.agents.size} agents active.`);
    
    return this;
  }

  /**
   * Register a new agent
   */
  registerAgent(agent) {
    this.agents.set(agent.name, agent);
    logger.info(`[Orchestrator] Registered agent: ${agent.name}`);
  }

  /**
   * Get an agent by name
   */
  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * Route message from one agent to another
   */
  async routeMessage(from, to, message) {
    const targetAgent = this.agents.get(to);
    
    if (!targetAgent) {
      logger.warn(`[Orchestrator] Unknown target agent: ${to}`);
      return null;
    }

    // Publish to message queue for async processing
    return await publishToAgent(to, {
      from,
      to,
      ...message,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(from, message) {
    const results = [];
    
    for (const [name, agent] of this.agents) {
      if (name !== from) {
        const result = await this.routeMessage(from, name, message);
        results.push({ agent: name, messageId: result });
      }
    }
    
    return results;
  }

  /**
   * Execute collaborative query across multiple agents
   */
  async collaborativeQuery(agentNames, query) {
    const correlationId = uuidv4();
    const results = [];

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

  /**
   * Load workflows from database
   */
  async loadWorkflows() {
    try {
      const workflows = await Workflow.find({
        company: this.companyId,
        isActive: true,
      });

      for (const workflow of workflows) {
        this.workflows.set(workflow.name, workflow);
      }

      logger.info(`[Orchestrator] Loaded ${workflows.length} workflows`);
    } catch (error) {
      logger.error('[Orchestrator] Failed to load workflows:', error);
    }
  }

  /**
   * Define a new workflow
   */
  async defineWorkflow(name, steps, options = {}) {
    const workflow = await Workflow.create({
      company: this.companyId,
      name,
      steps: steps.map((step, index) => ({
        order: index + 1,
        ...step,
      })),
      type: options.type || 'custom',
      trigger: options.trigger || { type: 'manual' },
      description: options.description,
      createdBy: options.createdBy,
    });

    this.workflows.set(name, workflow);
    logger.info(`[Orchestrator] Defined workflow: ${name}`);
    
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowName, initialData, triggeredBy = {}) {
    const workflow = this.workflows.get(workflowName);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    const executionId = uuidv4();
    
    // Create execution record
    const execution = await WorkflowExecution.create({
      company: this.companyId,
      workflow: workflow._id,
      workflowName,
      workflowVersion: workflow.version,
      status: 'running',
      triggeredBy,
      startTime: new Date(),
      totalSteps: workflow.steps.length,
      initialData,
      steps: workflow.steps.map(step => ({
        stepOrder: step.order,
        agent: step.agent,
        action: step.action,
        status: 'pending',
      })),
    });

    this.activeWorkflows.set(executionId, execution);
    
    logger.info(`[Orchestrator] Starting workflow: ${workflowName} (${executionId})`);

    // Execute steps sequentially
    let context = { ...initialData };
    
    try {
      for (const step of workflow.steps) {
        const stepIndex = step.order - 1;
        
        // Check condition if exists
        if (step.condition) {
          try {
            const conditionFn = new Function('prevResult', `return ${step.condition}`);
            if (!conditionFn(context)) {
              execution.steps[stepIndex].status = 'skipped';
              continue;
            }
          } catch (e) {
            logger.warn(`[Orchestrator] Condition evaluation failed for step ${step.order}`);
          }
        }

        // Update step status
        execution.steps[stepIndex].status = 'running';
        execution.steps[stepIndex].startTime = new Date();
        execution.currentStep = step.order;
        await execution.save();

        // Get agent and execute
        const agent = this.agents.get(step.agent);
        if (!agent) {
          throw new Error(`Agent not found: ${step.agent}`);
        }

        try {
          // Apply input mapping if exists
          let input = context;
          if (step.inputMapping) {
            input = this.applyMapping(context, step.inputMapping);
          }

          // Execute with timeout
          const result = await Promise.race([
            agent.process({ action: step.action, data: input }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Step timeout')), step.timeout || 30000)
            ),
          ]);

          // Apply output mapping if exists
          if (step.outputMapping) {
            context = { ...context, ...this.applyMapping(result, step.outputMapping) };
          } else {
            context = { ...context, [`step${step.order}Result`]: result };
          }

          execution.steps[stepIndex].status = 'completed';
          execution.steps[stepIndex].endTime = new Date();
          execution.steps[stepIndex].output = result;
          execution.steps[stepIndex].duration = 
            execution.steps[stepIndex].endTime - execution.steps[stepIndex].startTime;

        } catch (error) {
          execution.steps[stepIndex].status = 'failed';
          execution.steps[stepIndex].error = {
            message: error.message,
            stack: error.stack,
          };

          if (!step.continueOnError) {
            throw error;
          }
        }

        await execution.save();
      }

      // Workflow completed successfully
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.finalResult = context;
      
      // Update workflow metrics
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { 'metrics.executionCount': 1, 'metrics.successCount': 1 },
        $set: { 'metrics.lastExecution': new Date() },
      });

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      
      // Update workflow metrics
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: { 'metrics.executionCount': 1, 'metrics.failureCount': 1 },
        $set: { 'metrics.lastExecution': new Date() },
      });

      logger.error(`[Orchestrator] Workflow failed: ${workflowName}`, error);
    }

    await execution.save();
    this.activeWorkflows.delete(executionId);

    // Emit completion event
    await publishEvent('workflow:completed', {
      workflowName,
      executionId,
      status: execution.status,
      companyId: this.companyId,
    });

    return execution;
  }

  /**
   * Apply mapping to transform data
   */
  applyMapping(data, mapping) {
    const result = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.getNestedValue(data, path);
    }
    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set up message queue handlers
   */
  async setupMessageHandlers() {
    // Subscribe orchestrator queue
    await subscribeToQueue('ORCHESTRATOR', async (message) => {
      logger.debug('[Orchestrator] Received message:', message.type);
      await this.handleMessage(message);
    });
  }

  /**
   * Handle incoming messages
   */
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

  /**
   * Handle agent error
   */
  async handleAgentError(message) {
    const { agent, error } = message.payload;
    logger.error(`[Orchestrator] Agent error from ${agent}:`, error);

    // Check error rate and potentially disable agent
    const agentInstance = this.agents.get(agent);
    if (agentInstance) {
      const errorRate = agentInstance.state.failedTasks / 
        (agentInstance.state.tasksProcessed || 1);
      
      if (errorRate > 0.5) {
        logger.warn(`[Orchestrator] High error rate for ${agent}, consider disabling`);
        // Could implement circuit breaker pattern here
      }
    }
  }

  /**
   * Handle collaboration request
   */
  async handleCollaborationRequest(message) {
    const { agents, query, correlationId } = message.payload;
    const results = await this.collaborativeQuery(agents, query);
    
    // Send results back to requesting agent
    await this.routeMessage('Orchestrator', message.from, {
      type: 'collaboration-response',
      correlationId,
      results,
    });
  }

  /**
   * Get status of all agents
   */
  async getAgentsStatus() {
    const statuses = [];
    
    for (const [name, agent] of this.agents) {
      statuses.push(agent.getStatus());
    }
    
    return statuses;
  }

  /**
   * Get active workflow executions
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Shutdown all agents
   */
  async shutdown() {
    logger.info('[Orchestrator] Shutting down...');
    
    for (const [name, agent] of this.agents) {
      await agent.updateState({ status: 'idle' });
    }
    
    this.agents.clear();
    this.activeWorkflows.clear();
    this.initialized = false;
    
    logger.info('[Orchestrator] Shutdown complete');
  }
}

// Singleton instances per company
const orchestrators = new Map();

export const getOrchestrator = async (companyId) => {
  if (!orchestrators.has(companyId)) {
    const orchestrator = new AgentOrchestrator(companyId);
    await orchestrator.initialize();
    orchestrators.set(companyId, orchestrator);
  }
  return orchestrators.get(companyId);
};
