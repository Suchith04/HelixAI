import mongoose from "mongoose";

const stepExecutionSchema = new mongoose.Schema({
  stepOrder: Number,
  agent: String,
  action: String,
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending',
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in ms
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  error: {
    message: String,
    stack: String,
    code: String,
  },
  retryCount: { type: Number, default: 0 },
});

const workflowExecutionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },
  workflowName: String,
  workflowVersion: Number,
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending',
  },
  triggeredBy: {
    type: {
      type: String,
      enum: ['user', 'schedule', 'event', 'agent'],
    },
    userId: mongoose.Schema.Types.ObjectId,
    agentName: String,
    eventName: String,
  },
  startTime: Date,
  endTime: Date,
  duration: Number,
  currentStep: {
    type: Number,
    default: 0,
  },
  totalSteps: Number,
  steps: [stepExecutionSchema],
  initialData: mongoose.Schema.Types.Mixed,
  finalResult: mongoose.Schema.Types.Mixed,
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
  }],
  relatedIncidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  }],
}, {
  timestamps: true,
});

// Indexes
workflowExecutionSchema.index({ company: 1, status: 1 });
workflowExecutionSchema.index({ company: 1, workflow: 1 });
workflowExecutionSchema.index({ company: 1, createdAt: -1 });
workflowExecutionSchema.index({ startTime: -1 });

const WorkflowExecution = mongoose.model('WorkflowExecution', workflowExecutionSchema);
export default WorkflowExecution;
