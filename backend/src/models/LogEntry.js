import mongoose from "mongoose";

const logEntrySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  source: {
    service: String,
    instance: String,
    pod: String,
    container: String,
    file: String,
    function: String,
    line: Number,
  },
  metadata: {
    traceId: String,
    spanId: String,
    requestId: String,
    userId: String,
    sessionId: String,
    environment: String,
    version: String,
  },
  parsed: {
    errorType: String,
    errorCode: String,
    stackTrace: String,
    signature: String, // Extracted error signature for grouping
  },
  analysis: {
    processed: { type: Boolean, default: false },
    processedAt: Date,
    processedBy: String, // Agent name
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    category: String,
    patterns: [String],
    llmInsights: String,
    confidence: { type: Number, min: 0, max: 1 },
  },
  relatedIncident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  raw: {
    type: String,
    maxlength: 10000,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
logEntrySchema.index({ company: 1, timestamp: -1 });
logEntrySchema.index({ company: 1, level: 1, timestamp: -1 });
logEntrySchema.index({ company: 1, 'source.service': 1, timestamp: -1 });
logEntrySchema.index({ company: 1, 'parsed.signature': 1 });
logEntrySchema.index({ company: 1, 'analysis.processed': 1 });

// Text index for searching
logEntrySchema.index({ message: 'text', 'parsed.stackTrace': 'text' });

// TTL index - auto-cleanup old logs (90 days)
logEntrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const LogEntry = mongoose.model('LogEntry', logEntrySchema);
export default LogEntry;