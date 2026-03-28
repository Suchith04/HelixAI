import { Agent, AgentState, AgentHistory, Company } from '../models/index.js';
import { getOrchestrator } from '../orchestrator/AgentOrchestrator.js';
import { listLogGroups, fetchLogs, filterAndGroupLogs } from '../services/awsCloudWatchService.js';
import logger from '../utils/logger.js';

// Get all agents for company
export const getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find({ company: req.companyId });
    const states = await AgentState.find({ company: req.companyId });
    
    const agentsWithState = agents.map(agent => {
      const state = states.find(s => s.agentName === agent.name);
      return { ...agent.toObject(), currentState: state };
    });

    res.json({ agents: agentsWithState });
  } catch (error) {
    next(error);
  }
};

// Get agent details
export const getAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ company: req.companyId, _id: req.params.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const state = await AgentState.findOne({ company: req.companyId, agentName: agent.name });
    res.json({ agent: { ...agent.toObject(), currentState: state } });
  } catch (error) {
    next(error);
  }
};

// Update agent configuration
export const updateAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { company: req.companyId, _id: req.params.id },
      { configuration: req.body.configuration, customSettings: req.body.customSettings },
      { new: true }
    );
    res.json({ agent });
  } catch (error) {
    next(error);
  }
};

// Trigger agent action — uses the same CloudWatch pattern as cloudwatchController.analyzeLogs
export const triggerAgent = async (req, res, next) => {
  try {
    const { agentName, action, data = {}, logGroupName } = req.body;

    // Update agent state to 'working' before processing
    await AgentState.findOneAndUpdate(
      { company: req.companyId, agentName },
      { status: 'working' }
    );

    // ── Fetch CloudWatch logs (same pattern as cloudwatchController) ─────
    let cloudwatchMeta = null;
    const enrichedData = { ...data };

    // Only fetch if the caller didn't already provide logs
    if (!enrichedData.logs || enrichedData.logs.length === 0) {
      try {
        // 1. Load company & get decrypted AWS creds (exact same as cloudwatchController)
        const company = await Company.findById(req.companyId);
        const creds = company ? company.getAwsCredentials() : null;

        if (creds) {
          // 2. Resolve which log group to use
          let targetGroup = logGroupName;
          if (!targetGroup) {
            const groups = await listLogGroups(creds);
            if (groups && groups.length > 0) {
              targetGroup = groups[0].logGroupName;
            }
          }

          if (targetGroup) {
            // 3. Fetch raw logs from CloudWatch (same as cloudwatchController.analyzeLogs)
            const rawLogs = await fetchLogs(creds, targetGroup, {
              startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              endTime: new Date().toISOString(),
              limit: 1000,
            });

            logger.info(`[AgentController] CloudWatch: fetched ${rawLogs.length} raw logs from ${targetGroup}`);

            // 4. Filter & group (same as cloudwatchController)
            const { important, grouped, meta } = filterAndGroupLogs(rawLogs);

            // Use important logs if available, otherwise use ALL raw logs
            // (important can be empty if all logs are info/debug level)
            const logsForAgent = important.length > 0 ? important : rawLogs;

            if (logsForAgent.length > 0) {
              enrichedData.logs = logsForAgent;
              enrichedData._cloudwatchSource = targetGroup;
              cloudwatchMeta = {
                logGroupName: targetGroup,
                totalRaw: meta.totalRaw,
                totalImportant: meta.totalImportant,
                logsUsed: logsForAgent.length,
                reductionRatio: meta.reductionRatio,
                processedAt: meta.processedAt,
              };
              logger.info(`[AgentController] Injected ${logsForAgent.length} CloudWatch logs into ${agentName}`);
            }
          } else {
            logger.info('[AgentController] No CloudWatch log groups found');
          }
        } else {
          logger.info('[AgentController] AWS credentials not configured — agents will use DB fallback');
        }
      } catch (cwErr) {
        // Log the full error so it's not silently swallowed
        logger.error(`[AgentController] CloudWatch fetch failed: ${cwErr.message}`, { stack: cwErr.stack });
      }
    }

    let result;
    try {
      const orchestrator = await getOrchestrator(req.companyId);
      const agent = orchestrator.getAgent(agentName);

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found in orchestrator' });
      }

      result = await agent.process({ action, data: enrichedData });
    } catch (orchErr) {
      logger.warn(`Orchestrator unavailable for trigger, using direct processing: ${orchErr.message}`);
      // Fallback: import agent classes directly
      const agentClasses = await import('../agents/index.js');
      const AgentClass = agentClasses[`${agentName}Agent`] || agentClasses[agentName];
      if (!AgentClass) {
        return res.status(404).json({ error: `Agent '${agentName}' not found` });
      }
      const agentInstance = new AgentClass(null, req.companyId);
      await agentInstance.initialize();
      result = await agentInstance.process({ action, data: enrichedData });
    }

    // Update agent state back to 'idle' and increment metrics
    await AgentState.findOneAndUpdate(
      { company: req.companyId, agentName },
      {
        status: 'idle',
        $inc: { 'metrics.tasksCompleted': 1 },
        'metrics.successRate': 1,
        lastAction: {
          type: action || 'process',
          timestamp: new Date(),
          result: { severity: result?.severity, confidence: result?.confidence },
        },
      }
    );

    // ── Save to AgentHistory collection ─────────────────────────────────
    try {
      // Find the agent record for the display name
      const agentRecord = await Agent.findOne({ company: req.companyId, name: agentName });
      const logSource = enrichedData._cloudwatchSource || 'database';

      await AgentHistory.create({
        company: req.companyId,
        agentName,
        agentDisplayName: agentRecord?.displayName || agentName,
        logSource,
        severity: result?.severity || 'unknown',
        confidence: result?.confidence || 0,
        llmInsights: result?.llmInsights || null,
        summary: {
          totalLogs: result?.totalLogs || 0,
          errors: result?.categorized?.errors || 0,
          warnings: result?.categorized?.warnings || 0,
          info: result?.categorized?.info || 0,
        },
        patterns: result?.patterns || [],
        cloudwatchMeta: cloudwatchMeta || null,
        logsAnalyzedFrom: enrichedData.logs && enrichedData.logs.length > 0
          ? new Date(Date.now() - 24 * 60 * 60 * 1000)
          : null,
        logsAnalyzedTo: enrichedData.logs && enrichedData.logs.length > 0
          ? new Date()
          : null,
      });
      logger.info(`[AgentController] Saved analysis history for ${agentName} (source: ${logSource})`);
    } catch (histErr) {
      logger.error(`[AgentController] Failed to save agent history: ${histErr.message}`);
    }

    res.json({ result, cloudwatchMeta });
  } catch (error) {
    // On error, update state to reflect the error
    try {
      await AgentState.findOneAndUpdate(
        { company: req.companyId, agentName: req.body.agentName },
        {
          status: 'error',
          'metrics.lastError': { message: error.message, timestamp: new Date() },
          $inc: { 'metrics.errorCount': 1 },
        }
      );
    } catch (stateErr) {
      logger.error('Failed to update agent error state:', stateErr);
    }
    next(error);
  }
};

// Get agent states
export const getAgentStates = async (req, res, next) => {
  try {
    const states = await AgentState.find({ company: req.companyId });
    res.json({ states });
  } catch (error) {
    next(error);
  }
};

// Initialize agents for company
export const initializeAgents = async (req, res, next) => {
  try {
    const agentDefinitions = [
      { name: 'LogIntelligence', displayName: 'Log Intelligence', type: 'analyzer', description: 'Analyzes application logs using AI to detect patterns, errors, and anomalies' },
      { name: 'CrashDiagnostic', displayName: 'Crash Diagnostic', type: 'analyzer', description: 'Investigates application crashes and identifies root causes' },
      { name: 'ResourceOptimization', displayName: 'Resource Optimization', type: 'optimizer', description: 'Monitors and optimizes cloud resource utilization' },
      { name: 'AnomalyDetection', displayName: 'Anomaly Detection', type: 'detector', description: 'Detects unusual patterns and potential issues in real-time' },
      { name: 'Recovery', displayName: 'Recovery', type: 'healer', description: 'Executes auto-healing and recovery procedures' },
      { name: 'Recommendation', displayName: 'Recommendation', type: 'reporter', description: 'Generates actionable insights and optimization recommendations' },
      { name: 'CostOptimization', displayName: 'Cost Optimization', type: 'optimizer', description: 'Analyzes cloud costs and suggests savings opportunities' },
    ];

    const agents = [];
    for (const def of agentDefinitions) {
      // Upsert Agent record
      let agent = await Agent.findOne({ company: req.companyId, name: def.name });
      if (!agent) {
        agent = await Agent.create({ company: req.companyId, ...def, status: 'active' });
      } else {
        // Update status to active
        agent.status = 'active';
        await agent.save();
      }
      agents.push(agent);

      // Upsert AgentState record so the frontend can display status
      await AgentState.findOneAndUpdate(
        { company: req.companyId, agentName: def.name },
        {
          company: req.companyId,
          agent: agent._id,
          agentName: def.name,
          status: 'idle',
          confidence: 0.5,
          metrics: {
            tasksCompleted: 0,
            tasksToday: 0,
            averageConfidence: 0.5,
            successRate: 1,
            errorCount: 0,
            uptime: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({ message: 'Agents initialized successfully', agents });
  } catch (error) {
    next(error);
  }
};

// Get agent analysis history
export const getAgentHistory = async (req, res, next) => {
  try {
    const { agentName, logSource } = req.query;
    const filter = { company: req.companyId };

    if (agentName) filter.agentName = agentName;
    if (logSource) filter.logSource = logSource;

    const history = await AgentHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ history });
  } catch (error) {
    next(error);
  }
};
