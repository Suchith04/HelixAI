import mongoose from "mongoose";

const costAnalysisSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly'] },
  },
  summary: {
    totalCost: { type: Number, required: true },
    previousPeriodCost: Number,
    percentChange: Number,
    currency: { type: String, default: 'USD' },
    projectedMonthly: Number,
  },
  breakdown: {
    byService: [{
      service: String,
      cost: Number,
      percentage: Number,
      change: Number,
    }],
    byRegion: [{
      region: String,
      cost: Number,
      percentage: Number,
    }],
    byResourceType: [{
      type: String,
      cost: Number,
      count: Number,
      percentage: Number,
    }],
  },
  topResources: [{
    resourceId: String,
    name: String,
    type: String,
    cost: Number,
    utilization: Number,
    recommendation: String,
  }],
  waste: {
    total: Number,
    categories: [{
      type: { type: String, enum: ['unused', 'underutilized', 'oversized', 'idle'] },
      amount: Number,
      resources: Number,
      description: String,
    }],
  },
  savings: {
    potential: Number,
    implemented: Number,
    recommendations: [{
      type: String,
      description: String,
      estimatedSavings: Number,
      priority: { type: String, enum: ['low', 'medium', 'high'] },
    }],
  },
  budgets: [{
    name: String,
    allocated: Number,
    used: Number,
    remaining: Number,
    percentUsed: Number,
    forecast: Number,
    status: { type: String, enum: ['on_track', 'warning', 'exceeded'] },
  }],
  trends: {
    daily: [{
      date: Date,
      cost: Number,
    }],
    serviceGrowth: [{
      service: String,
      trend: { type: String, enum: ['increasing', 'stable', 'decreasing'] },
      rate: Number,
    }],
  },
  analysis: {
    llmInsights: String,
    anomalies: [String],
    opportunities: [String],
  },
  generatedBy: {
    type: String,
    default: 'CostOptimization',
  },
}, {
  timestamps: true,
});

// Indexes
costAnalysisSchema.index({ company: 1, 'period.end': -1 });
costAnalysisSchema.index({ company: 1, 'period.type': 1 });

const CostAnalysis = mongoose.model('CostAnalysis', costAnalysisSchema);
export default CostAnalysis;