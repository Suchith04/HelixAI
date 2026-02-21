import { Agent, AgentState } from '../models/index.js';
import { getOrchestrator } from '../orchestrator/AgentOrchestrator.js';

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

    const state = await AgentState.findOne({ company: req.companyId, agent: agent._id });
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

// Trigger agent action
export const triggerAgent = async (req, res, next) => {
  try {
    const { agentName, action, data } = req.body;
    const orchestrator = await getOrchestrator(req.companyId);
    const agent = orchestrator.getAgent(agentName);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const result = await agent.process({ action, data });
    res.json({ result });
  } catch (error) {
    next(error);
  }
};

// Get agent states
export const getAgentStates = async (req, res, next) => {
  try {
    const orchestrator = await getOrchestrator(req.companyId);
    const states = await orchestrator.getAgentsStatus();
    res.json({ states });
  } catch (error) {
    next(error);
  }
};

// Initialize agents for company
export const initializeAgents = async (req, res, next) => {
  try {
    const agentDefinitions = [
      { name: 'LogIntelligence', displayName: 'Log Intelligence', type: 'analyzer', description: 'Analyzes application logs' },
      { name: 'CrashDiagnostic', displayName: 'Crash Diagnostic', type: 'analyzer', description: 'Investigates crashes' },
      { name: 'ResourceOptimization', displayName: 'Resource Optimization', type: 'optimizer', description: 'Monitors resources' },
      { name: 'AnomalyDetection', displayName: 'Anomaly Detection', type: 'detector', description: 'Detects anomalies' },
      { name: 'Recovery', displayName: 'Recovery', type: 'healer', description: 'Executes auto-healing' },
      { name: 'Recommendation', displayName: 'Recommendation', type: 'reporter', description: 'Generates insights' },
      { name: 'CostOptimization', displayName: 'Cost Optimization', type: 'optimizer', description: 'Analyzes costs' },
    ];

    const agents = [];
    for (const def of agentDefinitions) {
      const existing = await Agent.findOne({ company: req.companyId, name: def.name });
      if (!existing) {
        const agent = await Agent.create({ company: req.companyId, ...def, status: 'inactive' });
        agents.push(agent);
      } else {
        agents.push(existing);
      }
    }

    res.json({ message: 'Agents initialized', agents });
  } catch (error) {
    next(error);
  }
};
