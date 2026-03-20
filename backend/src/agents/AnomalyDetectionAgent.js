import BaseAgent from './base/BaseAgent.js';
import { Anomaly, Resource } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AnomalyDetectionAgent - ML-based anomaly detection
 * Detects unusual patterns, predicts failures, learns baselines
 */
class AnomalyDetectionAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('AnomalyDetection', orchestrator, companyId);
    
    this.baselines = new Map();
    this.config = {
      ...this.config,
      windowSize: 60, // Data points for baseline
      zScoreThreshold: 2.5,
      minDataPoints: 10,
    };
  }

  getSystemPrompt() {
    return `You are the Anomaly Detection Agent, an AI specialized in identifying unusual patterns in system metrics.
Your capabilities include:
- Statistical anomaly detection using z-scores and IQR
- Pattern recognition for temporal anomalies
- Predictive failure analysis
- Correlation of anomalies across services

Analyze the provided metrics and identify anomalies. Consider:
1. Deviations from normal baselines
2. Sudden spikes or drops
3. Unusual patterns or trends
4. Cross-metric correlations

Provide analysis in JSON format:
{
  "anomalies": [{
    "metric": "metric_name",
    "severity": "low|medium|high|critical",
    "type": "spike|dip|trend|pattern",
    "description": "What's abnormal",
    "confidence": 0.0-1.0
  }],
  "predictions": [{
    "metric": "metric_name",
    "prediction": "What might happen",
    "probability": 0.0-1.0,
    "timeframe": "When it might occur"
  }]
}`;
  }

  /**
   * Main processing method
   */
  async process(data) {
    return this.executeWithTracking('anomaly_detection', async () => {
      const { action, data: actionData } = data;

      switch (action) {
        case 'detect':
          return await this.detectAnomalies(actionData);
        case 'predict':
          return await this.predictFailures(actionData);
        case 'update_baseline':
          return await this.updateBaseline(actionData);
        case 'check_correlation':
          return await this.checkCorrelation(actionData);
        default:
          return await this.detectAnomalies(actionData);
      }
    });
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(data) {
    let metrics = data?.metrics || [];

    // If CloudWatch logs were injected and no metrics exist,
    // derive synthetic time-series from log severity counts
    if (metrics.length === 0 && data?.logs && Array.isArray(data.logs)) {
      this.log(`Deriving anomaly metrics from ${data.logs.length} CloudWatch logs`, 'info');
      const hourBuckets = {};
      for (const log of data.logs) {
        const hour = new Date(log.timestamp).getHours();
        const level = (log.level || 'info').toLowerCase();
        const isError = ['error', 'fatal', 'critical'].includes(level);
        if (!hourBuckets[hour]) hourBuckets[hour] = { errors: 0, total: 0 };
        hourBuckets[hour].total++;
        if (isError) hourBuckets[hour].errors++;
      }
      const errorRate = Object.entries(hourBuckets)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, b]) => ({ value: b.total > 0 ? (b.errors / b.total) * 100 : 0, timestamp: new Date() }));
      const logVolume = Object.entries(hourBuckets)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, b]) => ({ value: b.total, timestamp: new Date() }));
      metrics = [
        { name: 'log_error_rate', resourceId: 'cloudwatch-logs', type: 'percentage', values: errorRate },
        { name: 'log_volume_per_hour', resourceId: 'cloudwatch-logs', type: 'count', values: logVolume },
      ];
    } else if (metrics.length === 0) {
      metrics = await this.fetchMetrics();
    }

    this.log(`Detecting anomalies in ${metrics.length} metric series`, 'info');

    const anomalies = [];

    for (const metric of metrics) {
      // Get or create baseline
      const baseline = await this.getBaseline(metric.name, metric.resourceId);
      
      // Statistical detection
      const statAnomalies = this.detectStatisticalAnomalies(metric, baseline);
      anomalies.push(...statAnomalies);

      // Pattern detection
      const patternAnomalies = this.detectPatternAnomalies(metric);
      anomalies.push(...patternAnomalies);

      // Update baseline with new data
      await this.updateBaselineWithData(metric.name, metric.resourceId, metric.values);
    }

    // Deduplicate and rank
    const rankedAnomalies = this.rankAnomalies(anomalies);

    // Create anomaly records
    for (const anomaly of rankedAnomalies.slice(0, 10)) {
      await this.recordAnomaly(anomaly);
    }

    // Notify other agents for critical anomalies
    const criticalAnomalies = rankedAnomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      await this.sendMessage('ResourceOptimization', {
        type: 'notification',
        payload: {
          action: 'anomaly_alert',
          anomalies: criticalAnomalies,
        },
        priority: 5,
      });

      await this.sendMessage('LogIntelligence', {
        type: 'request',
        payload: {
          action: 'correlate_logs',
          timeRange: this.getAnomalyTimeRange(criticalAnomalies),
          resources: criticalAnomalies.map(a => a.resourceId),
        },
        priority: 4,
      });
    }

    return {
      totalMetrics: metrics.length,
      anomaliesDetected: rankedAnomalies.length,
      critical: criticalAnomalies.length,
      anomalies: rankedAnomalies.slice(0, 20),
    };
  }

  /**
   * Statistical anomaly detection using z-score
   */
  detectStatisticalAnomalies(metric, baseline) {
    const anomalies = [];
    const values = metric.values || [];

    if (values.length < this.config.minDataPoints) {
      return anomalies;
    }

    // Calculate statistics
    const mean = baseline?.mean || this.calculateMean(values);
    const stdDev = baseline?.stdDev || this.calculateStdDev(values, mean);

    if (stdDev === 0) return anomalies;

    // Check recent values
    const recentValues = values.slice(-5);
    for (const point of recentValues) {
      const zScore = Math.abs((point.value - mean) / stdDev);

      if (zScore > this.config.zScoreThreshold) {
        const severity = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium';
        const type = point.value > mean ? 'spike' : 'dip';

        anomalies.push({
          anomalyId: `ANM-${Date.now()}-${uuidv4().slice(0, 8)}`,
          metric: metric.name,
          resourceId: metric.resourceId,
          type,
          severity,
          score: zScore / 5, // Normalize to 0-1
          confidence: Math.min(0.95, 0.5 + (zScore - 2) * 0.15),
          detection: {
            method: 'statistical',
            baseline: mean,
            observed: point.value,
            deviation: zScore,
          },
          timestamp: point.timestamp,
        });
      }
    }

    return anomalies;
  }

  /**
   * Pattern-based anomaly detection
   */
  detectPatternAnomalies(metric) {
    const anomalies = [];
    const values = metric.values || [];

    if (values.length < 10) return anomalies;

    // Trend detection
    const trend = this.detectTrend(values);
    if (trend.significant) {
      anomalies.push({
        anomalyId: `ANM-${Date.now()}-${uuidv4().slice(0, 8)}`,
        metric: metric.name,
        resourceId: metric.resourceId,
        type: 'trend',
        severity: trend.slope > 0.5 ? 'high' : 'medium',
        score: Math.min(1, Math.abs(trend.slope)),
        confidence: trend.confidence,
        detection: {
          method: 'pattern',
          pattern: trend.direction,
          slope: trend.slope,
        },
        timestamp: new Date(),
      });
    }

    // Seasonality deviation
    const seasonalAnomaly = this.checkSeasonalDeviation(values);
    if (seasonalAnomaly) {
      anomalies.push(seasonalAnomaly);
    }

    return anomalies;
  }

  /**
   * Detect trend in time series
   */
  detectTrend(values) {
    if (values.length < 5) {
      return { significant: false };
    }

    // Simple linear regression
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i].value;
      sumXY += i * values[i].value;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const mean = sumY / n;
    const normalizedSlope = slope / (mean || 1);

    return {
      significant: Math.abs(normalizedSlope) > 0.1,
      slope: normalizedSlope,
      direction: slope > 0 ? 'increasing' : 'decreasing',
      confidence: Math.min(0.9, 0.5 + Math.abs(normalizedSlope)),
    };
  }

  /**
   * Check for seasonal deviation
   */
  checkSeasonalDeviation(values) {
    // Simplified seasonal check - compare current hour to historical same hour
    // In production, use more sophisticated time series decomposition
    return null;
  }

  /**
   * Predict potential failures
   */
  async predictFailures(data) {
    const metrics = data?.metrics || await this.fetchMetrics();
    const predictions = [];

    for (const metric of metrics) {
      const trend = this.detectTrend(metric.values || []);
      
      if (trend.significant && trend.direction === 'increasing') {
        // Check if approaching threshold
        const lastValue = metric.values?.[metric.values.length - 1]?.value || 0;
        const threshold = this.getThreshold(metric.type);
        
        if (lastValue > threshold * 0.7) {
          const timeToThreshold = this.estimateTimeToThreshold(
            lastValue, threshold, trend.slope
          );

          predictions.push({
            metric: metric.name,
            resourceId: metric.resourceId,
            prediction: `${metric.name} may exceed threshold`,
            probability: Math.min(0.9, 0.5 + trend.confidence * 0.4),
            timeToEvent: timeToThreshold,
            suggestedAction: 'Scale resources proactively',
          });
        }
      }
    }

    // LLM analysis for complex predictions
    if (predictions.length > 0) {
      try {
        const llmPrediction = await this.queryLLM(
          'Based on these trends, provide failure predictions:',
          { trends: predictions, metrics: metrics.slice(0, 5) }
        );
        predictions.push({
          type: 'comprehensive',
          source: 'ai_analysis',
          analysis: llmPrediction,
        });
      } catch (e) {
        this.log('LLM prediction failed', 'warn');
      }
    }

    return { predictions };
  }

  /**
   * Update baseline with new data
   */
  async updateBaseline(data) {
    const { metricName, resourceId, values } = data;
    await this.updateBaselineWithData(metricName, resourceId, values);
    return { success: true };
  }

  /**
   * Check correlation between anomalies
   */
  async checkCorrelation(data) {
    const { resources } = data;

    // Fetch recent anomalies for these resources
    const anomalies = await Anomaly.find({
      company: this.companyId,
      'source.resource': { $in: resources },
      detectedAt: { $gte: new Date(Date.now() - 3600000) }, // Last hour
    }).lean();

    // Find time-correlated anomalies
    const correlations = this.findCorrelations(anomalies);

    return { correlations };
  }

  /**
   * Find correlations between anomalies
   */
  findCorrelations(anomalies) {
    const correlations = [];
    const windowMs = 60000; // 1 minute window

    for (let i = 0; i < anomalies.length; i++) {
      for (let j = i + 1; j < anomalies.length; j++) {
        const a1 = anomalies[i];
        const a2 = anomalies[j];
        
        const timeDiff = Math.abs(
          new Date(a1.detectedAt) - new Date(a2.detectedAt)
        );

        if (timeDiff < windowMs) {
          correlations.push({
            anomaly1: a1.anomalyId,
            anomaly2: a2.anomalyId,
            timeDiff,
            metrics: [a1.metric.name, a2.metric.name],
          });
        }
      }
    }

    return correlations;
  }

  // Helper methods
  calculateMean(values) {
    const nums = values.map(v => v.value);
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  calculateStdDev(values, mean) {
    const nums = values.map(v => v.value);
    const squaredDiffs = nums.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / nums.length);
  }

  async getBaseline(metricName, resourceId) {
    const key = `${metricName}:${resourceId}`;
    return this.baselines.get(key);
  }

  async updateBaselineWithData(metricName, resourceId, values) {
    if (!values?.length) return;
    
    const key = `${metricName}:${resourceId}`;
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);
    
    this.baselines.set(key, { mean, stdDev, updatedAt: Date.now() });
  }

  getThreshold(metricType) {
    const thresholds = { cpu: 90, memory: 90, disk: 95 };
    return thresholds[metricType] || 80;
  }

  estimateTimeToThreshold(current, threshold, slope) {
    if (slope <= 0) return 'Not applicable';
    const remaining = threshold - current;
    const minutes = remaining / (slope * 60);
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    return `${Math.round(minutes / 60)} hours`;
  }

  getAnomalyTimeRange(anomalies) {
    const times = anomalies.map(a => new Date(a.timestamp).getTime());
    return {
      start: new Date(Math.min(...times) - 300000),
      end: new Date(Math.max(...times) + 300000),
    };
  }

  rankAnomalies(anomalies) {
    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSev = severityOrder[a.severity] || 0;
      const bSev = severityOrder[b.severity] || 0;
      if (aSev !== bSev) return bSev - aSev;
      return b.score - a.score;
    });
  }

  async recordAnomaly(anomaly) {
    await Anomaly.create({
      company: this.companyId,
      anomalyId: anomaly.anomalyId,
      type: anomaly.type,
      metric: { name: anomaly.metric, type: anomaly.metricType },
      source: { resource: anomaly.resourceId },
      detection: anomaly.detection,
      severity: anomaly.severity,
      status: 'active',
      detectedAt: anomaly.timestamp || new Date(),
    });
  }

  async fetchMetrics() {
    const resources = await Resource.find({
      company: this.companyId,
      status: 'running',
    }).lean();

    return resources.map(r => ({
      name: 'cpu',
      resourceId: r.resourceId,
      type: 'cpu',
      values: r.metrics?.cpu ? [{ value: r.metrics.cpu.current, timestamp: new Date() }] : [],
    }));
  }
}

export default AnomalyDetectionAgent;
