import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  incidentId: {
    type: String,
    unique: true,
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
    maxlength: 2000,
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'],
    default: 'open',
  },
  category: {
    type: String,
    enum: ['crash', 'performance', 'resource', 'security', 'availability', 'other'],
    required: true,
  },
  source: {
    agent: String,
    service: String,
    resource: String,
    region: String,
  },
  affectedServices: [{
    name: String,
    type: String,
    impact: { type: String, enum: ['none', 'minor', 'major', 'critical'] },
  }],
  rootCause: {
    identified: { type: Boolean, default: false },
    description: String,
    confidence: { type: Number, min: 0, max: 1 },
    identifiedBy: String,
    identifiedAt: Date,
  },
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    event: String,
    description: String,
    by: { type: String, enum: ['system', 'agent', 'user'] },
    actor: String,
  }],
  actions: [{
    type: { type: String, enum: ['automated', 'manual', 'recommendation'] },
    action: String,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'] },
    agent: String,
    startedAt: Date,
    completedAt: Date,
    result: mongoose.Schema.Types.Mixed,
  }],
  metrics: {
    timeToDetection: Number, // in seconds
    timeToAcknowledge: Number,
    timeToResolve: Number,
    totalDowntime: Number,
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  relatedIncidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  }],
  relatedLogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogEntry',
  }],
  relatedAnomalies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anomaly',
  }],
  tags: [String],
  notes: [{
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  resolvedAt: Date,
  closedAt: Date,
}, {
  timestamps: true,
});

// Indexes
incidentSchema.index({ company: 1, status: 1 });
incidentSchema.index({ company: 1, severity: 1 });
incidentSchema.index({ company: 1, createdAt: -1 });
incidentSchema.index({ company: 1, category: 1 });

const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;