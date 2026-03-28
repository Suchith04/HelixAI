import BaseAgent from './base/BaseAgent.js';
import { Anomaly, Resource } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AnomalyDetectionAgent - ML-based anomaly detection
 * Detects unusual patterns in REAL-TIME AWS metrics, predicts failures, learns baselines
 */
class AnomalyDetectionAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('AnomalyDetection', orchestrator, companyId);
    
    this.baselines = new Map();
    this.config = {
      ...this.config,
      windowSize: 60,
      zScoreThreshold: 2.5,
      minDataPoints: 10,
    };
  }

  getSystemPrompt() {
    return `You are the Anomaly Detection Agent, an AI specialized in identifying unusual patterns in AWS CloudWatch metrics and infrastructure data.
Your capabilities include:
- Statistical anomaly detection using z-scores and IQR on real-time AWS metrics
- Pattern recognition for temporal anomalies in EC2, Lambda, and RDS metrics
- Predictive failure analysis using CloudWatch metric trends
- Correlation of anomalies across AWS services
- Analysis of CloudWatch Alarms

Analyze the provided AWS metrics and identify anomalies. Consider:
1. Deviations from normal baselines
2. Sudden spikes or drops in CPU, memory, network, invocations, errors
3. Unusual patterns or trends
4. Cross-service correlations (EC2 CPU spike + RDS connection spike)
5. Active CloudWatch alarms

Provide analysis in JSON format:
{
  "anomalies": [{
    "metric": "metric_name",
    "resource": "resource_id",
    "severity": "low|medium|high|critical",
    "type": "spike|dip|trend|pattern|alarm",
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

  async process(data) {
    return this.executeWithTracking('anomaly_detection', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'detect':           return await this.detectAnomalies(actionData);
        case 'predict':          return await this.predictFailures(actionData);
        case 'update_baseline':  return await this.updateBaseline(actionData);
        case 'check_correlation':return await this.checkCorrelation(actionData);
        default:                 return await this.detectAnomalies(actionData);
      }
    });
  }

  /**
   * Fetch REAL-TIME metrics from AWS CloudWatch for all EC2, Lambda, RDS resources
   */
  async fetchAwsMetrics() {
    const creds = await this.getAwsCredentials();
    if (!creds) {
      this.log('No AWS credentials — falling back to DB metrics', 'warn');
      return this.fetchFallbackMetrics();
    }

    const metrics = [];
    const aws = this.aws();

    // EC2 instance metrics
    try {
      const instances = await aws.getEC2Instances(creds);
      for (const inst of instances.filter(i => i.state === 'running')) {
        const cwMetrics = await aws.getEC2Metrics(creds, inst.instanceId, 1);
        
        if (cwMetrics.CPUUtilization?.datapoints?.length) {
          metrics.push({
            name: 'CPUUtilization', resourceId: inst.instanceId, resourceName: inst.name,
            type: 'cpu', service: 'EC2',
            values: cwMetrics.CPUUtilization.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
        if (cwMetrics.NetworkIn?.datapoints?.length) {
          metrics.push({
            name: 'NetworkIn', resourceId: inst.instanceId, resourceName: inst.name,
            type: 'network', service: 'EC2',
            values: cwMetrics.NetworkIn.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
        if (cwMetrics.StatusCheckFailed?.datapoints?.length) {
          metrics.push({
            name: 'StatusCheckFailed', resourceId: inst.instanceId, resourceName: inst.name,
            type: 'status', service: 'EC2',
            values: cwMetrics.StatusCheckFailed.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
      }
    } catch (err) { this.log(`EC2 metrics fetch failed: ${err.message}`, 'warn'); }

    // Lambda metrics
    try {
      const fns = await aws.getLambdaFunctions(creds);
      for (const fn of fns.slice(0, 20)) {
        const cwMetrics = await aws.getLambdaMetrics(creds, fn.functionName, 1);
        if (cwMetrics.Errors?.datapoints?.length) {
          metrics.push({
            name: 'LambdaErrors', resourceId: fn.functionName, resourceName: fn.functionName,
            type: 'errors', service: 'Lambda',
            values: cwMetrics.Errors.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
        if (cwMetrics.Duration?.datapoints?.length) {
          metrics.push({
            name: 'LambdaDuration', resourceId: fn.functionName, resourceName: fn.functionName,
            type: 'latency', service: 'Lambda',
            values: cwMetrics.Duration.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
      }
    } catch (err) { this.log(`Lambda metrics fetch failed: ${err.message}`, 'warn'); }

    // RDS metrics
    try {
      const dbs = await aws.getRDSInstances(creds);
      for (const db of dbs) {
        const cwMetrics = await aws.getRDSMetrics(creds, db.dbInstanceId, 1);
        if (cwMetrics.CPUUtilization?.datapoints?.length) {
          metrics.push({
            name: 'RDS_CPUUtilization', resourceId: db.dbInstanceId, resourceName: db.dbInstanceId,
            type: 'cpu', service: 'RDS',
            values: cwMetrics.CPUUtilization.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
        if (cwMetrics.DatabaseConnections?.datapoints?.length) {
          metrics.push({
            name: 'DatabaseConnections', resourceId: db.dbInstanceId, resourceName: db.dbInstanceId,
            type: 'connections', service: 'RDS',
            values: cwMetrics.DatabaseConnections.datapoints.map(d => ({ value: d.value, timestamp: d.timestamp })),
          });
        }
      }
    } catch (err) { this.log(`RDS metrics fetch failed: ${err.message}`, 'warn'); }

    // CloudWatch Alarms (instant anomaly indicators)
    try {
      const alarms = await aws.getCloudWatchAlarms(creds);
      const activeAlarms = alarms.filter(a => a.state === 'ALARM');
      for (const alarm of activeAlarms) {
        metrics.push({
          name: `Alarm:${alarm.alarmName}`, resourceId: alarm.alarmName,
          resourceName: alarm.alarmName, type: 'alarm', service: 'CloudWatch',
          values: [{ value: 1, timestamp: alarm.updatedAt || new Date() }],
          alarmMeta: { threshold: alarm.threshold, reason: alarm.stateReason, metric: alarm.metricName },
        });
      }
    } catch (err) { this.log(`CloudWatch alarms fetch failed: ${err.message}`, 'warn'); }

    this.log(`Fetched ${metrics.length} real-time AWS metric series`, 'info');
    return metrics;
  }

  async fetchFallbackMetrics() {
    // Fallback to CloudWatch logs or DB
    const resources = await Resource.find({ company: this.companyId, status: 'running' }).lean();
    return resources.map(r => ({
      name: 'cpu', resourceId: r.resourceId, type: 'cpu', service: 'DB',
      values: r.metrics?.cpu ? [{ value: r.metrics.cpu.current, timestamp: new Date() }] : [],
    }));
  }

  /**
   * Detect anomalies — now with REAL-TIME AWS metrics
   */
  async detectAnomalies(data) {
    let metrics = data?.metrics || [];

    // If CloudWatch logs were injected, derive synthetic series
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
      const errorRate = Object.entries(hourBuckets).sort(([a],[b]) => Number(a)-Number(b))
        .map(([, b]) => ({ value: b.total > 0 ? (b.errors/b.total)*100 : 0, timestamp: new Date() }));
      const logVolume = Object.entries(hourBuckets).sort(([a],[b]) => Number(a)-Number(b))
        .map(([, b]) => ({ value: b.total, timestamp: new Date() }));
      metrics = [
        { name: 'log_error_rate', resourceId: 'cloudwatch-logs', type: 'percentage', values: errorRate },
        { name: 'log_volume_per_hour', resourceId: 'cloudwatch-logs', type: 'count', values: logVolume },
      ];
    }
    
    // Fetch real AWS metrics if none provided
    if (metrics.length === 0) {
      metrics = await this.fetchAwsMetrics();
    }

    this.log(`Detecting anomalies in ${metrics.length} metric series`, 'info');

    const anomalies = [];

    for (const metric of metrics) {
      // Handle alarm-type metrics as immediate anomalies
      if (metric.type === 'alarm') {
        anomalies.push({
          anomalyId: `ANM-${Date.now()}-${uuidv4().slice(0, 8)}`,
          metric: metric.name,
          resourceId: metric.resourceId,
          type: 'alarm',
          severity: 'critical',
          score: 1.0,
          confidence: 0.95,
          detection: { method: 'cloudwatch_alarm', ...metric.alarmMeta },
          timestamp: metric.values[0]?.timestamp || new Date(),
        });
        continue;
      }

      const baseline = await this.getBaseline(metric.name, metric.resourceId);
      const statAnomalies = this.detectStatisticalAnomalies(metric, baseline);
      anomalies.push(...statAnomalies);
      const patternAnomalies = this.detectPatternAnomalies(metric);
      anomalies.push(...patternAnomalies);
      await this.updateBaselineWithData(metric.name, metric.resourceId, metric.values);
    }

    const rankedAnomalies = this.rankAnomalies(anomalies);

    for (const anomaly of rankedAnomalies.slice(0, 10)) {
      await this.recordAnomaly(anomaly);
    }

    const criticalAnomalies = rankedAnomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      await this.sendMessage('ResourceOptimization', {
        type: 'notification',
        payload: { action: 'anomaly_alert', anomalies: criticalAnomalies },
        priority: 5,
      });
      await this.sendMessage('LogIntelligence', {
        type: 'request',
        payload: { action: 'correlate_logs', timeRange: this.getAnomalyTimeRange(criticalAnomalies), resources: criticalAnomalies.map(a => a.resourceId) },
        priority: 4,
      });
    }

    // LLM analysis of detected anomalies
    let llmInsights = null;
    if (rankedAnomalies.length > 0) {
      try {
        llmInsights = await this.queryLLM(
          'Analyze these detected anomalies from AWS CloudWatch metrics and provide insights:',
          { anomalies: rankedAnomalies.slice(0, 10), metricsAnalyzed: metrics.length }
        );
      } catch (e) { this.log('LLM anomaly analysis failed', 'warn'); }
    }

    return {
      totalMetrics: metrics.length,
      anomaliesDetected: rankedAnomalies.length,
      critical: criticalAnomalies.length,
      anomalies: rankedAnomalies.slice(0, 20),
      llmInsights,
      severity: criticalAnomalies.length > 0 ? 'critical' : rankedAnomalies.length > 3 ? 'high' : rankedAnomalies.length > 0 ? 'medium' : 'low',
      confidence: rankedAnomalies.length > 0 ? rankedAnomalies[0].confidence : 0.5,
    };
  }

  // ── Statistical detection (unchanged) ───────────────────────────────────

  detectStatisticalAnomalies(metric, baseline) {
    const anomalies = [];
    const values = metric.values || [];
    if (values.length < this.config.minDataPoints) return anomalies;

    const mean = baseline?.mean || this.calculateMean(values);
    const stdDev = baseline?.stdDev || this.calculateStdDev(values, mean);
    if (stdDev === 0) return anomalies;

    const recentValues = values.slice(-5);
    for (const point of recentValues) {
      const zScore = Math.abs((point.value - mean) / stdDev);
      if (zScore > this.config.zScoreThreshold) {
        const severity = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium';
        anomalies.push({
          anomalyId: `ANM-${Date.now()}-${uuidv4().slice(0, 8)}`,
          metric: metric.name, resourceId: metric.resourceId,
          type: point.value > mean ? 'spike' : 'dip', severity,
          score: zScore / 5,
          confidence: Math.min(0.95, 0.5 + (zScore - 2) * 0.15),
          detection: { method: 'statistical', baseline: mean, observed: point.value, deviation: zScore },
          timestamp: point.timestamp,
        });
      }
    }
    return anomalies;
  }

  detectPatternAnomalies(metric) {
    const anomalies = [];
    const values = metric.values || [];
    if (values.length < 10) return anomalies;

    const trend = this.detectTrend(values);
    if (trend.significant) {
      anomalies.push({
        anomalyId: `ANM-${Date.now()}-${uuidv4().slice(0, 8)}`,
        metric: metric.name, resourceId: metric.resourceId,
        type: 'trend', severity: trend.slope > 0.5 ? 'high' : 'medium',
        score: Math.min(1, Math.abs(trend.slope)), confidence: trend.confidence,
        detection: { method: 'pattern', pattern: trend.direction, slope: trend.slope },
        timestamp: new Date(),
      });
    }
    return anomalies;
  }

  detectTrend(values) {
    if (values.length < 5) return { significant: false };
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += values[i].value; sumXY += i * values[i].value; sumX2 += i * i;
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

  async predictFailures(data) {
    const metrics = data?.metrics || await this.fetchAwsMetrics();
    const predictions = [];
    for (const metric of metrics) {
      const trend = this.detectTrend(metric.values || []);
      if (trend.significant && trend.direction === 'increasing') {
        const lastValue = metric.values?.[metric.values.length - 1]?.value || 0;
        const threshold = this.getThreshold(metric.type);
        if (lastValue > threshold * 0.7) {
          const timeToThreshold = this.estimateTimeToThreshold(lastValue, threshold, trend.slope);
          predictions.push({
            metric: metric.name, resourceId: metric.resourceId, service: metric.service,
            prediction: `${metric.name} may exceed threshold`,
            probability: Math.min(0.9, 0.5 + trend.confidence * 0.4),
            timeToEvent: timeToThreshold,
            suggestedAction: 'Scale resources proactively',
          });
        }
      }
    }
    if (predictions.length > 0) {
      try {
        const llmPrediction = await this.queryLLM('Based on these AWS metric trends, provide failure predictions:', { trends: predictions });
        predictions.push({ type: 'comprehensive', source: 'ai_analysis', analysis: llmPrediction });
      } catch (e) { this.log('LLM prediction failed', 'warn'); }
    }
    return { predictions };
  }

  async updateBaseline(data) {
    const { metricName, resourceId, values } = data;
    await this.updateBaselineWithData(metricName, resourceId, values);
    return { success: true };
  }

  async checkCorrelation(data) {
    const { resources } = data;
    const anomalies = await Anomaly.find({
      company: this.companyId,
      'source.resource': { $in: resources },
      detectedAt: { $gte: new Date(Date.now() - 3600000) },
    }).lean();
    return { correlations: this.findCorrelations(anomalies) };
  }

  findCorrelations(anomalies) {
    const correlations = [];
    const windowMs = 60000;
    for (let i = 0; i < anomalies.length; i++) {
      for (let j = i + 1; j < anomalies.length; j++) {
        const timeDiff = Math.abs(new Date(anomalies[i].detectedAt) - new Date(anomalies[j].detectedAt));
        if (timeDiff < windowMs) {
          correlations.push({ anomaly1: anomalies[i].anomalyId, anomaly2: anomalies[j].anomalyId, timeDiff, metrics: [anomalies[i].metric?.name, anomalies[j].metric?.name] });
        }
      }
    }
    return correlations;
  }

  // Helpers
  calculateMean(values) { const nums = values.map(v => v.value); return nums.reduce((a, b) => a + b, 0) / nums.length; }
  calculateStdDev(values, mean) { const nums = values.map(v => v.value); return Math.sqrt(nums.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / nums.length); }
  async getBaseline(metricName, resourceId) { return this.baselines.get(`${metricName}:${resourceId}`); }
  async updateBaselineWithData(metricName, resourceId, values) {
    if (!values?.length) return;
    const key = `${metricName}:${resourceId}`;
    this.baselines.set(key, { mean: this.calculateMean(values), stdDev: this.calculateStdDev(values, this.calculateMean(values)), updatedAt: Date.now() });
  }
  getThreshold(metricType) { return { cpu: 90, memory: 90, disk: 95, errors: 10, connections: 100, latency: 5000 }[metricType] || 80; }
  estimateTimeToThreshold(current, threshold, slope) {
    if (slope <= 0) return 'Not applicable';
    const minutes = (threshold - current) / (slope * 60);
    return minutes < 60 ? `${Math.round(minutes)} minutes` : `${Math.round(minutes / 60)} hours`;
  }
  getAnomalyTimeRange(anomalies) {
    const times = anomalies.map(a => new Date(a.timestamp).getTime());
    return { start: new Date(Math.min(...times) - 300000), end: new Date(Math.max(...times) + 300000) };
  }
  rankAnomalies(anomalies) {
    return anomalies.sort((a, b) => {
      const ord = { critical: 4, high: 3, medium: 2, low: 1 };
      return (ord[b.severity] || 0) - (ord[a.severity] || 0) || b.score - a.score;
    });
  }
  async recordAnomaly(anomaly) {
    await Anomaly.create({
      company: this.companyId, anomalyId: anomaly.anomalyId, type: anomaly.type,
      metric: { name: anomaly.metric, type: anomaly.metricType },
      source: { resource: anomaly.resourceId },
      detection: anomaly.detection, severity: anomaly.severity,
      status: 'active', detectedAt: anomaly.timestamp || new Date(),
    });
  }
}

export default AnomalyDetectionAgent;
