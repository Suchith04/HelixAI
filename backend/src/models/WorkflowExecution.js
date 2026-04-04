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

  // ── Intelligence fields ───────────────────────────────────────────────────
  /** AI-generated analysis for this step (from agent's LLM) */
  llmInsights: mongoose.Schema.Types.Mixed,

  /** Severity level determined by this step's agent */
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },

  /** Confidence score 0-1 returned by the agent */
  confidence: { type: Number, default: 0 },

  /** Metadata about CloudWatch logs injected into this step */
  cloudwatchLogsMeta: {
    injected: { type: Boolean, default: false },
    logCount: { type: Number, default: 0 },
    logGroup: String,
    reductionRatio: String,
  },

  /** Summary of context piped in from previous steps */
  contextReceived: {
    fromStep: Number,
    fromAgent: String,
    keys: [String], // list of context keys passed in
    snippets: mongoose.Schema.Types.Mixed, // small preview of passed data
  },
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

  // ── Workflow-level intelligence ───────────────────────────────────────────
  /** Consolidated LLM narrative synthesizing all step results */
  consolidatedInsight: mongoose.Schema.Types.Mixed,

  /** Highest severity observed across all steps */
  overallSeverity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },

  /** Weighted average confidence across all steps */
  overallConfidence: { type: Number, default: 0 },

  /** Sequential context pipeline summary — what each step passed forward */
  contextPipeline: [{
    fromStep: Number,
    toStep: Number,
    fromAgent: String,
    toAgent: String,
    keys: [String],
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
