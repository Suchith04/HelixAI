import mongoose from 'mongoose';

const pendingActionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  actionId: {
    type: String,
    unique: true,
    required: true,
  },
  agentName: {
    type: String,
    required: true,
  },
  analysis: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  recommendedAction: {
    type: {
      type: String, // reboot_instance, stop_instance, start_instance, invoke_lambda, reboot_rds, etc.
    },
    target: {
      resourceType: String, // ec2, lambda, rds
      resourceId: String,
      resourceName: String,
    },
    params: mongoose.Schema.Types.Mixed,
    awsApiCall: String, // e.g. "EC2:RebootInstances"
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'High'],
    required: true,
  },
  reasoning: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'executing', 'completed', 'failed'],
    default: 'pending',
  },
  dryRunResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  executionResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  executionLogs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'success'], default: 'info' },
    message: String,
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rejectionReason: String,
}, {
  timestamps: true,
});

pendingActionSchema.index({ company: 1, status: 1 });
pendingActionSchema.index({ company: 1, createdAt: -1 });
pendingActionSchema.index({ actionId: 1 }, { unique: true });

const PendingAction = mongoose.model('PendingAction', pendingActionSchema);
export default PendingAction;
