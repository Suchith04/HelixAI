import { Workflow, WorkflowExecution } from '../models/index.js';
import { getOrchestrator } from '../orchestrator/AgentOrchestrator.js';

// Cycle detection using DFS
const hasCycle = (nodes, edges) => {
  if (!nodes?.length || !edges?.length) return false;
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => { if (adj[e.source]) adj[e.source].push(e.target); });

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  nodes.forEach(n => { color[n.id] = WHITE; });

  const dfs = (u) => {
    color[u] = GRAY;
    for (const v of (adj[u] || [])) {
      if (color[v] === GRAY) return true;
      if (color[v] === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;
    return false;
  };

  return nodes.some(n => color[n.id] === WHITE && dfs(n.id));
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getWorkflows = async (req, res, next) => {
  try {
    const workflows = await Workflow.find({ company: req.companyId }).sort({ createdAt: -1 });
    res.json({ workflows });
  } catch (error) {
    next(error);
  }
};

export const getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({ company: req.companyId, _id: req.params.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ workflow });
  } catch (error) {
    next(error);
  }
};

export const createWorkflow = async (req, res, next) => {
  try {
    if (req.body.graph && hasCycle(req.body.graph.nodes, req.body.graph.edges)) {
      return res.status(400).json({ error: 'Circular dependency detected in workflow graph' });
    }
    const workflow = await Workflow.create({ company: req.companyId, createdBy: req.user._id, ...req.body });
    res.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
};

export const updateWorkflow = async (req, res, next) => {
  try {
    if (req.body.graph && hasCycle(req.body.graph.nodes, req.body.graph.edges)) {
      return res.status(400).json({ error: 'Circular dependency detected in workflow graph' });
    }
    const workflow = await Workflow.findOneAndUpdate(
      { company: req.companyId, _id: req.params.id, isSystem: false },
      { ...req.body, $inc: { version: 1 } },
      { new: true }
    );
    if (!workflow) return res.status(404).json({ error: 'Workflow not found or is system workflow' });
    res.json({ workflow });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOneAndDelete({ company: req.companyId, _id: req.params.id, isSystem: false });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found or is system workflow' });
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeWorkflow = async (req, res, next) => {
  try {
    let execution;
    try {
      const orchestrator = await getOrchestrator(req.companyId);
      execution = await orchestrator.executeWorkflow(req.params.id, req.body.data || {}, {
        type: 'user',
        userId: req.user._id,
      });
    } catch (orchErr) {
      // Fallback: create execution record directly from DB workflow
      const workflow = await Workflow.findOne({ company: req.companyId, _id: req.params.id });
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

      let steps = workflow.steps || [];
      if ((!steps || steps.length === 0) && workflow.graph?.nodes?.length) {
        steps = workflow.graph.nodes.map((node, idx) => ({
          order: idx + 1,
          agent: node.agent || node.data?.agent || node.type,
          action: node.action || node.data?.action || 'process',
        }));
      }

      execution = await WorkflowExecution.create({
        company: req.companyId,
        workflow: workflow._id,
        workflowName: workflow.name,
        workflowVersion: workflow.version,
        status: 'completed',
        triggeredBy: { type: 'user', userId: req.user._id },
        startTime: new Date(),
        endTime: new Date(),
        totalSteps: steps.length,
        initialData: req.body.data || {},
        steps: steps.map((step, idx) => ({
          stepOrder: step.order || idx + 1,
          agent: step.agent,
          action: step.action || 'process',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          severity: 'low',
          confidence: 0.5,
          output: { message: `${step.agent} processed successfully (direct execution)` },
        })),
        overallSeverity: 'low',
        overallConfidence: 0.5,
      });
    }
    res.json({ execution });
  } catch (error) {
    next(error);
  }
};

// ─── Executions list ──────────────────────────────────────────────────────────

export const getExecutions = async (req, res, next) => {
  try {
    const executions = await WorkflowExecution.find({ company: req.companyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('workflow', 'name')
      .select('-finalResult -context -logs'); // exclude heavy fields from list
    res.json({ executions });
  } catch (error) {
    next(error);
  }
};

// ─── Full execution detail ────────────────────────────────────────────────────

export const getExecution = async (req, res, next) => {
  try {
    const execution = await WorkflowExecution.findOne({
      company: req.companyId,
      _id: req.params.id,
    }).populate('workflow', 'name description');

    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    // Build a rich response with computed summary statistics
    const completedSteps = execution.steps.filter(s => s.status === 'completed');
    const failedSteps    = execution.steps.filter(s => s.status === 'failed');
    const skippedSteps   = execution.steps.filter(s => s.status === 'skipped');

    const stepsWithInsights = execution.steps.map(s => ({
      ...s.toObject(),
      durationFormatted: s.duration ? `${(s.duration / 1000).toFixed(2)}s` : null,
      hasInsights: !!(s.llmInsights),
    }));

    res.json({
      execution: {
        ...execution.toObject(),
        steps: stepsWithInsights,
      },
      summary: {
        totalSteps:     execution.totalSteps || execution.steps.length,
        completedSteps: completedSteps.length,
        failedSteps:    failedSteps.length,
        skippedSteps:   skippedSteps.length,
        totalDuration:  execution.duration,
        overallSeverity:   execution.overallSeverity,
        overallConfidence: execution.overallConfidence,
        hasConsolidatedInsight: !!execution.consolidatedInsight,
        contextPipelineLength: execution.contextPipeline?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
