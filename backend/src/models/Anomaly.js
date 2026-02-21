import mongoose from "mongoose";

const anomalySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  anomalyId: {
    type: String,
    unique: true,
    required: true,
  },
  type: {
    type: String,
    enum: ['spike', 'dip', 'trend', 'pattern', 'outlier', 'threshold_breach'],
    required: true,
  },
  metric: {
    name: { type: String, required: true },
    type: { type: String, enum: ['cpu', 'memory', 'disk', 'network', 'latency', 'error_rate', 'custom'] },
    unit: String,
  },
  source: {
    service: String,
    instance: String,
    resource: String,
    region: String,
  },
  detection: {
    method: { type: String, enum: ['statistical', 'ml', 'threshold', 'pattern'] },
    model: String,
    score: { type: Number, min: 0, max: 1 },
    confidence: { type: Number, min: 0, max: 1 },
    baseline: mongoose.Schema.Types.Mixed,
    observed: mongoose.Schema.Types.Mixed,
    deviation: Number,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'false_positive'],
    default: 'active',
  },
  prediction: {
    isPredictive: { type: Boolean, default: false },
    predictedTime: Date,
    predictedImpact: String,
    probability: { type: Number, min: 0, max: 1 },
  },
  correlations: [{
    anomalyId: String,
    metric: String,
    correlation: Number,
  }],
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    value: Number,
  }],
  analysis: {
    llmInsights: String,
    suggestedActions: [String],
    relatedPatterns: [String],
  },
  relatedIncident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
  detectedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
anomalySchema.index({ company: 1, status: 1 });
anomalySchema.index({ company: 1, severity: 1 });
anomalySchema.index({ company: 1, detectedAt: -1 });
anomalySchema.index({ company: 1, 'metric.type': 1 });

const Anomaly = mongoose.model('Anomaly', anomalySchema);
export default Anomaly;