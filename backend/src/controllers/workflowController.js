import { Workflow, WorkflowExecution } from '../models/index.js';
import { getOrchestrator } from '../orchestrator/AgentOrchestrator.js';

// Get all workflows
export const getWorkflows = async (req, res, next) => {
  try {
    const workflows = await Workflow.find({ company: req.companyId }).sort({ createdAt: -1 });
    res.json({ workflows });
  } catch (error) {
    next(error);
  }
};

// Get workflow by ID
export const getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({ company: req.companyId, _id: req.params.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ workflow });
  } catch (error) {
    next(error);
  }
};

// Create workflow
export const createWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.create({ company: req.companyId, createdBy: req.user._id, ...req.body });
    res.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
};

// Update workflow
export const updateWorkflow = async (req, res, next) => {
  try {
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

// Delete workflow
export const deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOneAndDelete({ company: req.companyId, _id: req.params.id, isSystem: false });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found or is system workflow' });
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    next(error);
  }
};

// Execute workflow
export const executeWorkflow = async (req, res, next) => {
  try {
    const orchestrator = await getOrchestrator(req.companyId);
    const execution = await orchestrator.executeWorkflow(req.params.id, req.body.data || {}, {
      type: 'user',
      userId: req.user._id,
    });
    res.json({ execution });
  } catch (error) {
    next(error);
  }
};

// Get workflow executions
export const getExecutions = async (req, res, next) => {
  try {
    const executions = await WorkflowExecution.find({ company: req.companyId })
      .sort({ createdAt: -1 }).limit(50).populate('workflow', 'name');
    res.json({ executions });
  } catch (error) {
    next(error);
  }
};

// Get execution by ID
export const getExecution = async (req, res, next) => {
  try {
    const execution = await WorkflowExecution.findOne({ company: req.companyId, _id: req.params.id });
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json({ execution });
  } catch (error) {
    next(error);
  }
};
