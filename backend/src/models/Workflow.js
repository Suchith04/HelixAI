import mongoose from "mongoose";

const workflowStepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  agent: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  description: String,
  condition: {
    type: String, // JavaScript expression as string
    default: null,
  },
  timeout: {
    type: Number,
    default: 30000, // 30 seconds
  },
  retryOnFail: {
    type: Boolean,
    default: true,
  },
  continueOnError: {
    type: Boolean,
    default: false,
  },
  inputMapping: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  outputMapping: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const workflowSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['diagnostic', 'recovery', 'analysis', 'optimization', 'custom'],
    default: 'custom',
  },
  trigger: {
    type: {
      type: String,
      enum: ['manual', 'scheduled', 'event', 'condition'],
      default: 'manual',
    },
    schedule: String, // cron expression
    event: String, // event name
    condition: String, // condition expression
  },
  steps: [workflowStepSchema],
  graph: {
    nodes: [{
      id: { type: String, required: true },
      agent: { type: String, required: true },
      action: { type: String, default: 'process' },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
      },
    }],
    edges: [{
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
    }],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSystem: {
    type: Boolean,
    default: false, // System workflows can't be deleted
  },
  version: {
    type: Number,
    default: 1,
  },
  tags: [String],
  metrics: {
    executionCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },
    lastExecution: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

workflowSchema.index({ company: 1, name: 1 }, { unique: true });
workflowSchema.index({ company: 1, type: 1 });
workflowSchema.index({ company: 1, isActive: 1 });

const Workflow = mongoose.model('Workflow', workflowSchema);
export default Workflow;