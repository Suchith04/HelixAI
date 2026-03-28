import mongoose from "mongoose";

const agentHistorySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  agentName: {
    type: String,
    required: true,
  },
  agentDisplayName: {
    type: String,
  },
  logSource: {
    type: String,
    default: 'database',
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'unknown'],
    default: 'unknown',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  llmInsights: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  summary: {
    totalLogs: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    info: { type: Number, default: 0 },
  },
  patterns: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  cloudwatchMeta: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  logsAnalyzedFrom: {
    type: Date,
    default: null,
  },
  logsAnalyzedTo: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for efficient querying
agentHistorySchema.index({ company: 1, agentName: 1, logSource: 1, createdAt: -1 });

const AgentHistory = mongoose.model('AgentHistory', agentHistorySchema);
export default AgentHistory;
