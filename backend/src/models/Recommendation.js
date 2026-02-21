import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  recommendationId: {
    type: String,
    unique: true,
    required: true,
  },
  type: {
    type: String,
    enum: ['prevention', 'optimization', 'security', 'cost', 'performance', 'architecture'],
    required: true,
  },
  category: {
    type: String,
    enum: ['infrastructure', 'application', 'database', 'network', 'security', 'process'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'implemented', 'deferred'],
    default: 'pending',
  },
  source: {
    agent: { type: String, required: true },
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    anomaly: { type: mongoose.Schema.Types.ObjectId, ref: 'Anomaly' },
    analysis: mongoose.Schema.Types.Mixed,
  },
  impact: {
    estimated: String,
    area: [String],
    risk: { type: String, enum: ['low', 'medium', 'high'] },
  },
  implementation: {
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    estimatedTime: String,
    steps: [String],
    resources: [String],
    automatable: { type: Boolean, default: false },
  },
  metrics: {
    estimatedSavings: Number,
    estimatedPerformanceGain: Number,
    currency: { type: String, default: 'USD' },
  },
  feedback: {
    helpful: Boolean,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date,
  },
  expiresAt: Date,
}, {
  timestamps: true,
});

// Indexes
recommendationSchema.index({ company: 1, status: 1 });
recommendationSchema.index({ company: 1, priority: 1 });
recommendationSchema.index({ company: 1, type: 1 });
recommendationSchema.index({ company: 1, createdAt: -1 });

const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;