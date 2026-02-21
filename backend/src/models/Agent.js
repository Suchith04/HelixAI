import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
    enum: ['LogIntelligence', 'CrashDiagnostic', 'ResourceOptimization', 
           'AnomalyDetection', 'Recovery', 'Recommendation', 'CostOptimization'],
  },
  displayName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['analyzer', 'detector', 'optimizer', 'healer', 'reporter'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'inactive',
  },
  configuration: {
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    autoStart: {
      type: Boolean,
      default: true,
    },
    maxConcurrentTasks: {
      type: Number,
      default: 5,
    },
    retryAttempts: {
      type: Number,
      default: 3,
    },
    timeoutMs: {
      type: Number,
      default: 30000,
    },
  },
  // Agent-specific settings
  customSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Dependencies on other agents
  dependencies: [{
    type: String,
  }],
  // Metrics
  metrics: {
    tasksProcessed: { type: Number, default: 0 },
    successfulTasks: { type: Number, default: 0 },
    failedTasks: { type: Number, default: 0 },
    averageProcessingTime: { type: Number, default: 0 },
    lastActive: Date,
  },
  schedules: [{
    type: {
      type: String,
      enum: ['interval', 'cron'],
    },
    value: String, // e.g., "5m" or "0 */5 * * *"
    enabled: Boolean,
    lastRun: Date,
    nextRun: Date,
  }],
}, {
  timestamps: true,
});

// Compound index
agentSchema.index({ company: 1, name: 1 }, { unique: true });
agentSchema.index({ company: 1, status: 1 });

const Agent = mongoose.model('Agent', agentSchema);
export default Agent;