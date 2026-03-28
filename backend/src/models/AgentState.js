import mongoose from "mongoose";

const memorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  event: String,
  context: mongoose.Schema.Types.Mixed,
  outcome: mongoose.Schema.Types.Mixed,
  importance: { type: Number, min: 0, max: 1, default: 0.5 },
});

const agentStateSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  agentName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['idle', 'working', 'error', 'waiting', 'paused'],
    default: 'idle',
  },
  currentTask: {
    id: String,
    type: String,
    description: String,
    startTime: Date,
    progress: { type: Number, min: 0, max: 100, default: 0 },
    estimatedCompletion: Date,
  },
  lastAction: {
    type: {
      type: String,
      timestamp: Date,
      result: {
        severity: String,
        confidence: Number
      }
    },
  },
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    tasksToday: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 },
    successRate: { type: Number, default: 1 },
    errorCount: { type: Number, default: 0 },
    uptime: { type: Number, default: 0 }, // in seconds
    lastError: {
      message: String,
      timestamp: Date,
      stack: String,
    },
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  memory: {
    type: [memorySchema],
    default: [],
    validate: [arrayLimit, 'Memory cannot exceed 100 items'],
  },
  collaborations: [{
    withAgent: String,
    timestamp: Date,
    query: String,
    response: mongoose.Schema.Types.Mixed,
  }],
  resourceUsage: {
    cpu: { type: Number, default: 0 },
    memory: { type: Number, default: 0 },
    lastUpdated: Date,
  },
}, {
  timestamps: true,
});

function arrayLimit(val) {
  return val.length <= 100;
}

// TTL index - auto-cleanup old states (keep for 30 days)
agentStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 2592000 });
agentStateSchema.index({ company: 1, agentName: 1 });

const AgentState = mongoose.model('AgentState', agentStateSchema);
export default AgentState;