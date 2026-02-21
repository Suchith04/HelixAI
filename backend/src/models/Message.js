import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['request', 'response', 'notification', 'broadcast', 'error', 'collaboration'],
    required: true,
  },
  category: {
    type: String,
    enum: ['log_analysis', 'crash_report', 'resource_alert', 'anomaly', 
           'recovery_action', 'recommendation', 'cost_alert', 'system'],
    default: 'system',
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'processed', 'failed', 'expired'],
    default: 'pending',
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  correlationId: {
    type: String,
    index: true,
  },
  workflowExecutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowExecution',
  },
  metadata: {
    processingTime: Number,
    retryCount: { type: Number, default: 0 },
    deliveredAt: Date,
    processedAt: Date,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
}, {
  timestamps: true,
});

// TTL index for auto-cleanup
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ company: 1, createdAt: -1 });
messageSchema.index({ company: 1, from: 1, to: 1 });
messageSchema.index({ company: 1, status: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message