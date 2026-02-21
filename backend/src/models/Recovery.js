import mongoose from "mongoose";

const recoverySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  recoveryId: {
    type: String,
    unique: true,
    required: true,
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  type: {
    type: String,
    enum: ['restart', 'scale', 'rollback', 'failover', 'configuration', 'custom'],
    required: true,
  },
  action: {
    name: { type: String, required: true },
    description: String,
    command: String,
    parameters: mongoose.Schema.Types.Mixed,
  },
  target: {
    type: { type: String, enum: ['service', 'pod', 'instance', 'deployment', 'container'] },
    name: String,
    resourceId: String,
    namespace: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_progress', 'completed', 'failed', 'rolled_back', 'cancelled'],
    default: 'pending',
  },
  riskLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  approval: {
    required: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    autoApproved: { type: Boolean, default: false },
    reason: String,
  },
  execution: {
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
  },
  snapshot: {
    taken: { type: Boolean, default: false },
    id: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: Date,
  },
  rollback: {
    performed: { type: Boolean, default: false },
    reason: String,
    performedAt: Date,
    success: Boolean,
  },
  healthCheck: {
    performed: { type: Boolean, default: false },
    passed: Boolean,
    checkedAt: Date,
    results: mongoose.Schema.Types.Mixed,
  },
  result: {
    success: Boolean,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    error: {
      code: String,
      message: String,
      stack: String,
    },
  },
  triggeredBy: {
    type: { type: String, enum: ['agent', 'user', 'workflow'] },
    agentName: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
    message: String,
  }],
}, {
  timestamps: true,
});

// Indexes
recoverySchema.index({ company: 1, status: 1 });
recoverySchema.index({ company: 1, createdAt: -1 });
recoverySchema.index({ company: 1, incident: 1 });

const Recovery = mongoose.model('Recovery', recoverySchema);
export default Recovery;