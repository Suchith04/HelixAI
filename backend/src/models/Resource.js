import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  resourceId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['ec2', 'rds', 'lambda', 's3', 'ecs', 'eks', 'elb', 'ebs', 'elasticache', 'other'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['running', 'stopped', 'terminated', 'pending', 'unknown'],
    default: 'unknown',
  },
  metadata: {
    instanceType: String,
    az: String,
    vpc: String,
    subnet: String,
    securityGroups: [String],
    tags: mongoose.Schema.Types.Mixed,
    launchTime: Date,
    platform: String,
    architecture: String,
  },
  metrics: {
    cpu: {
      current: Number,
      avg: Number,
      max: Number,
      lastUpdated: Date,
    },
    memory: {
      current: Number,
      avg: Number,
      max: Number,
      used: Number,
      total: Number,
      lastUpdated: Date,
    },
    disk: {
      used: Number,
      total: Number,
      readOps: Number,
      writeOps: Number,
      lastUpdated: Date,
    },
    network: {
      bytesIn: Number,
      bytesOut: Number,
      packetsIn: Number,
      packetsOut: Number,
      lastUpdated: Date,
    },
  },
  health: {
    status: { type: String, enum: ['healthy', 'unhealthy', 'degraded', 'unknown'], default: 'unknown' },
    lastCheck: Date,
    checks: [{
      name: String,
      status: { type: String, enum: ['passing', 'failing', 'warning'] },
      message: String,
      lastChecked: Date,
    }],
  },
  costs: {
    hourly: Number,
    daily: Number,
    monthly: Number,
    currency: { type: String, default: 'USD' },
    lastCalculated: Date,
  },
  optimization: {
    recommendations: [{
      type: String,
      description: String,
      estimatedSavings: Number,
      priority: { type: String, enum: ['low', 'medium', 'high'] },
      createdAt: Date,
    }],
    utilizationScore: { type: Number, min: 0, max: 100 },
    rightSizingRecommendation: String,
  },
  lastSyncAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound unique index
resourceSchema.index({ company: 1, resourceId: 1 }, { unique: true });
resourceSchema.index({ company: 1, type: 1 });
resourceSchema.index({ company: 1, status: 1 });
resourceSchema.index({ company: 1, region: 1 });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;