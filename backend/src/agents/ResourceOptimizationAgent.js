import BaseAgent from './base/BaseAgent.js';
import { Resource, Anomaly } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * ResourceOptimizationAgent - Monitors and optimizes cloud resources
 * Now reads REAL-TIME AWS data: EC2 instances, Lambda functions, RDS, CloudWatch metrics
 */
class ResourceOptimizationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('ResourceOptimization', orchestrator, companyId);
    
    this.config = {
      ...this.config,
      monitoringInterval: 30000,
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 75, critical: 90 },
        disk: { warning: 80, critical: 95 },
        network: { warning: 80, critical: 95 },
        connections: { warning: 80, critical: 95 },
      },
    };
    this.monitoringActive = false;
  }

  getSystemPrompt() {
    return `You are the Resource Optimization Agent, an AI specialized in AWS cloud resource management.
You analyze REAL-TIME data from EC2, Lambda, RDS, and CloudWatch.
Your capabilities include:
- Monitoring live CPU, memory, network, database metrics from CloudWatch
- Detecting resource bottlenecks using real AWS instance/function states
- Recommending scaling decisions (up/down/out/in) based on actual utilization
- Optimizing resource allocation for cost efficiency with specific AWS instance type recommendations

Provide recommendations in JSON format:
{
  "status": "healthy|warning|critical",
  "bottlenecks": [{"resource": "i-xxx", "service": "EC2", "metric": "cpu", "severity": "high", "value": 95}],
  "recommendations": [
    {"action": "scale-up|scale-out|optimize|right-size", "target": "instance_id", "currentType": "t3.micro", "suggestedType": "t3.medium", "reason": "description"}
  ],
  "estimatedImpact": "Description of expected improvement"
}`;
  }

  async process(data) {
    return this.executeWithTracking('resource_analysis', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze':          return await this.analyzeResources(actionData);
        case 'check_metrics':    return await this.checkMetrics(actionData);
        case 'optimize':         return await this.generateOptimizations(actionData);
        case 'start_monitoring': return this.startMonitoring();
        case 'stop_monitoring':  return this.stopMonitoring();
        default:                 return await this.analyzeResources(actionData);
      }
    });
  }

  /**
   * Fetch real-time resource inventory + metrics from AWS
   */
  async fetchAwsResourceMetrics() {
    const creds = await this.getAwsCredentials();
    if (!creds) {
      this.log('No AWS credentials — falling back to DB', 'warn');
      return this.fetchFallbackMetrics();
    }

    const aws = this.aws();
    const resources = [];

    // EC2 Instances
    try {
      const instances = await aws.getEC2Instances(creds);
      for (const inst of instances) {
        const resource = {
          resourceId: inst.instanceId,
          name: inst.name,
          type: 'ec2',
          status: inst.state,
          service: 'EC2',
          metadata: { instanceType: inst.instanceType, az: inst.availabilityZone, publicIp: inst.publicIp },
          metrics: {},
        };

        if (inst.state === 'running') {
          try {
            const cwMetrics = await aws.getEC2Metrics(creds, inst.instanceId, 1);
            const lastVal = (m) => m?.datapoints?.length ? m.datapoints[m.datapoints.length - 1].value : null;
            const avgVal = (m) => m?.datapoints?.length ? m.datapoints.reduce((s, d) => s + d.value, 0) / m.datapoints.length : null;

            resource.metrics.cpu = { current: lastVal(cwMetrics.CPUUtilization), avg: avgVal(cwMetrics.CPUUtilization) };
            resource.metrics.networkIn = { current: lastVal(cwMetrics.NetworkIn) };
            resource.metrics.networkOut = { current: lastVal(cwMetrics.NetworkOut) };
            resource.metrics.statusFailed = { current: lastVal(cwMetrics.StatusCheckFailed) };
          } catch (err) { this.log(`Metrics for ${inst.instanceId}: ${err.message}`, 'warn'); }
        }
        resources.push(resource);
      }
    } catch (err) { this.log(`EC2 fetch failed: ${err.message}`, 'warn'); }

    // Lambda Functions
    try {
      const fns = await aws.getLambdaFunctions(creds);
      for (const fn of fns) {
        const resource = {
          resourceId: fn.functionName,
          name: fn.functionName,
          type: 'lambda',
          status: fn.state === 'Active' ? 'running' : fn.state,
          service: 'Lambda',
          metadata: { runtime: fn.runtime, memorySize: fn.memorySize, timeout: fn.timeout },
          metrics: {},
        };

        try {
          const cwMetrics = await aws.getLambdaMetrics(creds, fn.functionName, 1);
          const lastVal = (m) => m?.datapoints?.length ? m.datapoints[m.datapoints.length - 1].value : null;
          resource.metrics.invocations = { current: lastVal(cwMetrics.Invocations) };
          resource.metrics.errors = { current: lastVal(cwMetrics.Errors) };
          resource.metrics.duration = { current: lastVal(cwMetrics.Duration) };
          resource.metrics.throttles = { current: lastVal(cwMetrics.Throttles) };
        } catch (err) { /* ignore */ }
        resources.push(resource);
      }
    } catch (err) { this.log(`Lambda fetch failed: ${err.message}`, 'warn'); }

    // RDS Instances
    try {
      const dbs = await aws.getRDSInstances(creds);
      for (const db of dbs) {
        const resource = {
          resourceId: db.dbInstanceId,
          name: db.dbInstanceId,
          type: 'rds',
          status: db.status === 'available' ? 'running' : db.status,
          service: 'RDS',
          metadata: { engine: db.engine, instanceClass: db.instanceClass, multiAZ: db.multiAZ, storage: db.allocatedStorage },
          metrics: {},
        };

        try {
          const cwMetrics = await aws.getRDSMetrics(creds, db.dbInstanceId, 1);
          const lastVal = (m) => m?.datapoints?.length ? m.datapoints[m.datapoints.length - 1].value : null;
          resource.metrics.cpu = { current: lastVal(cwMetrics.CPUUtilization) };
          resource.metrics.freeMemory = { current: lastVal(cwMetrics.FreeableMemory) };
          resource.metrics.connections = { current: lastVal(cwMetrics.DatabaseConnections) };
          resource.metrics.freeStorage = { current: lastVal(cwMetrics.FreeStorageSpace) };
        } catch (err) { /* ignore */ }
        resources.push(resource);
      }
    } catch (err) { this.log(`RDS fetch failed: ${err.message}`, 'warn'); }

    this.log(`Fetched ${resources.length} AWS resources with live metrics`, 'info');
    return resources;
  }

  async fetchFallbackMetrics() {
    return await Resource.find({ company: this.companyId, status: 'running' }).lean();
  }

  /**
   * Analyze resources — now with REAL-TIME AWS data
   */
  async analyzeResources(data) {
    const metrics = data?.metrics || await this.fetchAwsResourceMetrics();
    this.log(`Analyzing ${metrics.length} resources`, 'info');

    const analysis = { totalResources: metrics.length, healthy: 0, warning: 0, critical: 0, bottlenecks: [], recommendations: [] };

    for (const resource of metrics) {
      const status = this.evaluateResourceHealth(resource);
      analysis[status.level]++;
      if (status.level !== 'healthy') {
        analysis.bottlenecks.push({
          resourceId: resource.resourceId, name: resource.name, type: resource.type,
          service: resource.service, metric: status.metric, value: status.value,
          threshold: status.threshold, severity: status.level,
          instanceType: resource.metadata?.instanceType,
        });
      }
    }

    analysis.recommendations = await this.generateRecommendations(analysis.bottlenecks);

    if (analysis.critical > 0) {
      const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
      await this.sendMessage('Recovery', {
        type: 'request',
        payload: { action: 'scale_resources', bottlenecks: criticalBottlenecks, recommendations: analysis.recommendations.filter(r => r.priority === 'high'), source: 'ResourceOptimization' },
        priority: 5,
      });
      await this.sendMessage('AnomalyDetection', {
        type: 'notification',
        payload: { action: 'check_correlation', resources: criticalBottlenecks.map(b => b.resourceId) },
        priority: 4,
      });
    }

    if (analysis.recommendations.length > 0) {
      await this.sendMessage('Recommendation', {
        type: 'notification',
        payload: { action: 'new_recommendations', recommendations: analysis.recommendations, source: 'ResourceOptimization' },
        priority: 3,
      });
    }

    // LLM analysis
    let llmInsights = null;
    try {
      llmInsights = await this.queryLLM('Analyze these AWS resource metrics and provide optimization recommendations:', {
        resources: metrics.length, bottlenecks: analysis.bottlenecks, healthy: analysis.healthy,
      });
    } catch (e) { this.log('LLM resource analysis failed', 'warn'); }

    return {
      ...analysis,
      llmInsights,
      severity: analysis.critical > 0 ? 'critical' : analysis.warning > 0 ? 'high' : 'low',
      confidence: analysis.totalResources > 0 ? 0.85 : 0.3,
    };
  }

  evaluateResourceHealth(resource) {
    const metrics = resource.metrics || {};
    const checks = [];

    if (metrics.cpu?.current !== undefined && metrics.cpu.current !== null) {
      checks.push({ metric: 'cpu', value: metrics.cpu.current, warning: this.config.thresholds.cpu.warning, critical: this.config.thresholds.cpu.critical });
    }
    if (metrics.memory?.current !== undefined && metrics.memory.current !== null) {
      checks.push({ metric: 'memory', value: metrics.memory.current, warning: this.config.thresholds.memory.warning, critical: this.config.thresholds.memory.critical });
    }
    // Lambda error check: errors > 0 is warning, > 5 is critical
    if (resource.type === 'lambda' && metrics.errors?.current > 0) {
      checks.push({ metric: 'errors', value: metrics.errors.current, warning: 1, critical: 5 });
    }
    // Lambda throttle check
    if (resource.type === 'lambda' && metrics.throttles?.current > 0) {
      checks.push({ metric: 'throttles', value: metrics.throttles.current, warning: 1, critical: 10 });
    }

    for (const check of checks) {
      if (check.value >= check.critical) return { level: 'critical', ...check };
    }
    for (const check of checks) {
      if (check.value >= check.warning) return { level: 'warning', ...check };
    }
    return { level: 'healthy' };
  }

  async generateRecommendations(bottlenecks) {
    const recommendations = [];
    for (const bn of bottlenecks) {
      let rec = { resourceId: bn.resourceId, resourceName: bn.name, resourceType: bn.type, service: bn.service, priority: bn.severity === 'critical' ? 'high' : 'medium' };
      switch (bn.metric) {
        case 'cpu':
          rec = { ...rec, action: 'scale-up', description: `CPU at ${bn.value?.toFixed(1)}% on ${bn.service} ${bn.resourceId}. ${bn.instanceType ? `Current type: ${bn.instanceType}` : ''}`, suggestedAction: bn.type === 'ec2' ? 'Upgrade instance type' : 'Increase provisioned concurrency' };
          break;
        case 'errors':
          rec = { ...rec, action: 'investigate', description: `${bn.value} errors on Lambda ${bn.resourceId}`, suggestedAction: 'Check function logs and increase timeout/memory' };
          break;
        case 'throttles':
          rec = { ...rec, action: 'scale-out', description: `${bn.value} throttles on Lambda ${bn.resourceId}`, suggestedAction: 'Increase reserved concurrency' };
          break;
        default:
          rec = { ...rec, action: 'investigate', description: `${bn.metric} at concerning levels on ${bn.resourceId}`, suggestedAction: 'Investigate and optimize' };
      }
      recommendations.push(rec);
    }

    if (bottlenecks.length > 3) {
      try {
        const llmRecs = await this.queryLLM('Analyze these AWS resource bottlenecks and provide optimization recommendations:', { bottlenecks });
        recommendations.push({ action: 'comprehensive', description: 'AI-generated comprehensive analysis', details: llmRecs, priority: 'medium' });
      } catch (e) { this.log('LLM recommendation failed', 'warn'); }
    }
    return recommendations;
  }

  async checkMetrics(data) {
    const { resourceIds } = data;
    const creds = await this.getAwsCredentials();
    if (!creds) return [];
    const results = [];
    for (const id of (resourceIds || [])) {
      try {
        const metrics = await this.aws().getEC2Metrics(creds, id, 1);
        results.push({ resourceId: id, metrics });
      } catch (err) { results.push({ resourceId: id, error: err.message }); }
    }
    return results;
  }

  async generateOptimizations(data) {
    const resources = data?.resources || await this.fetchAwsResourceMetrics();
    const optimizations = [];
    for (const resource of resources) {
      const utilization = this.calculateUtilization(resource);
      if (utilization < 20 && resource.status === 'running') {
        optimizations.push({
          resourceId: resource.resourceId, name: resource.name, type: 'downsize', service: resource.service,
          reason: `Low utilization (${utilization.toFixed(1)}%)`,
          currentType: resource.metadata?.instanceType, estimatedSavings: 'Up to 50% cost reduction',
        });
      }
    }
    return { totalResources: resources.length, optimizationOpportunities: optimizations.length, optimizations };
  }

  calculateUtilization(resource) {
    const m = resource.metrics || {};
    const values = [];
    if (m.cpu?.current != null) values.push(m.cpu.current);
    if (m.cpu?.avg != null) values.push(m.cpu.avg);
    return values.length === 0 ? 50 : values.reduce((a, b) => a + b, 0) / values.length;
  }

  startMonitoring() {
    if (this.monitoringActive) return { status: 'already_active' };
    this.monitoringActive = true;
    this.log('Starting resource monitoring', 'info');
    this.monitoringLoop();
    return { status: 'started' };
  }

  async monitoringLoop() {
    while (this.monitoringActive) {
      try { await this.analyzeResources({}); } catch (error) { this.log(`Monitoring error: ${error.message}`, 'error'); }
      await new Promise(resolve => setTimeout(resolve, this.config.monitoringInterval));
    }
  }

  stopMonitoring() {
    this.monitoringActive = false;
    this.log('Stopped resource monitoring', 'info');
    return { status: 'stopped' };
  }
}

export default ResourceOptimizationAgent;
