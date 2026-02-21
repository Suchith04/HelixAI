import BaseAgent from './base/BaseAgent.js';
import { Resource, Anomaly } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * ResourceOptimizationAgent - Monitors and optimizes cloud resources
 * Detects bottlenecks, suggests scaling, optimizes allocation
 */
class ResourceOptimizationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('ResourceOptimization', orchestrator, companyId);
    
    this.config = {
      ...this.config,
      monitoringInterval: 30000, // 30 seconds
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 75, critical: 90 },
        disk: { warning: 80, critical: 95 },
        network: { warning: 80, critical: 95 },
      },
    };
    
    this.monitoringActive = false;
  }

  getSystemPrompt() {
    return `You are the Resource Optimization Agent, an AI specialized in cloud resource management.
Your capabilities include:
- Monitoring CPU, memory, disk, and network metrics
- Detecting resource bottlenecks and performance issues
- Recommending scaling decisions (up/down/out/in)
- Optimizing resource allocation for cost efficiency

When analyzing resources, consider:
1. Current utilization vs capacity
2. Historical trends and patterns
3. Workload characteristics
4. Cost implications of changes

Provide recommendations in JSON format:
{
  "status": "healthy|warning|critical",
  "bottlenecks": [{"resource": "cpu", "severity": "high", "value": 95}],
  "recommendations": [
    {"action": "scale-up|scale-out|optimize", "target": "resource", "reason": "description"}
  ],
  "estimatedImpact": "Description of expected improvement"
}`;
  }

  /**
   * Main processing method
   */
  async process(data) {
    return this.executeWithTracking('resource_analysis', async () => {
      const { action, data: actionData } = data;

      switch (action) {
        case 'analyze':
          return await this.analyzeResources(actionData);
        case 'check_metrics':
          return await this.checkMetrics(actionData);
        case 'optimize':
          return await this.generateOptimizations(actionData);
        case 'start_monitoring':
          return this.startMonitoring();
        case 'stop_monitoring':
          return this.stopMonitoring();
        default:
          return await this.analyzeResources(actionData);
      }
    });
  }

  /**
   * Analyze resources and detect issues
   */
  async analyzeResources(data) {
    const metrics = data?.metrics || await this.fetchResourceMetrics();
    
    this.log(`Analyzing ${metrics.length} resources`, 'info');

    const analysis = {
      totalResources: metrics.length,
      healthy: 0,
      warning: 0,
      critical: 0,
      bottlenecks: [],
      recommendations: [],
    };

    for (const resource of metrics) {
      const status = this.evaluateResourceHealth(resource);
      analysis[status.level]++;

      if (status.level !== 'healthy') {
        analysis.bottlenecks.push({
          resourceId: resource.resourceId,
          name: resource.name,
          type: resource.type,
          metric: status.metric,
          value: status.value,
          threshold: status.threshold,
          severity: status.level,
        });
      }
    }

    // Generate recommendations
    analysis.recommendations = await this.generateRecommendations(analysis.bottlenecks);

    // Handle critical resources
    if (analysis.critical > 0) {
      const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
      
      // Notify Recovery Agent
      await this.sendMessage('Recovery', {
        type: 'request',
        payload: {
          action: 'scale_resources',
          bottlenecks: criticalBottlenecks,
          recommendations: analysis.recommendations.filter(r => r.priority === 'high'),
          source: 'ResourceOptimization',
        },
        priority: 5,
      });

      // Notify Anomaly Detection
      await this.sendMessage('AnomalyDetection', {
        type: 'notification',
        payload: {
          action: 'check_correlation',
          resources: criticalBottlenecks.map(b => b.resourceId),
        },
        priority: 4,
      });
    }

    // Send to Recommendation Agent
    if (analysis.recommendations.length > 0) {
      await this.sendMessage('Recommendation', {
        type: 'notification',
        payload: {
          action: 'new_recommendations',
          recommendations: analysis.recommendations,
          source: 'ResourceOptimization',
        },
        priority: 3,
      });
    }

    return analysis;
  }

  /**
   * Evaluate resource health based on metrics
   */
  evaluateResourceHealth(resource) {
    const metrics = resource.metrics || {};
    const checks = [];

    // CPU check
    if (metrics.cpu?.current !== undefined) {
      checks.push({
        metric: 'cpu',
        value: metrics.cpu.current,
        warning: this.config.thresholds.cpu.warning,
        critical: this.config.thresholds.cpu.critical,
      });
    }

    // Memory check
    if (metrics.memory?.current !== undefined) {
      checks.push({
        metric: 'memory',
        value: metrics.memory.current,
        warning: this.config.thresholds.memory.warning,
        critical: this.config.thresholds.memory.critical,
      });
    }

    // Disk check
    if (metrics.disk?.used !== undefined && metrics.disk?.total) {
      const diskPercent = (metrics.disk.used / metrics.disk.total) * 100;
      checks.push({
        metric: 'disk',
        value: diskPercent,
        warning: this.config.thresholds.disk.warning,
        critical: this.config.thresholds.disk.critical,
      });
    }

    // Find worst metric
    for (const check of checks) {
      if (check.value >= check.critical) {
        return { level: 'critical', ...check };
      }
    }
    for (const check of checks) {
      if (check.value >= check.warning) {
        return { level: 'warning', ...check };
      }
    }

    return { level: 'healthy' };
  }

  /**
   * Generate recommendations based on bottlenecks
   */
  async generateRecommendations(bottlenecks) {
    const recommendations = [];

    for (const bottleneck of bottlenecks) {
      let recommendation = {
        resourceId: bottleneck.resourceId,
        resourceName: bottleneck.name,
        resourceType: bottleneck.type,
        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
      };

      switch (bottleneck.metric) {
        case 'cpu':
          recommendation = {
            ...recommendation,
            action: 'scale-up',
            description: `CPU utilization at ${bottleneck.value.toFixed(1)}%. Consider upgrading instance type or adding more instances.`,
            suggestedAction: bottleneck.type === 'ec2' ? 'Upgrade to larger instance type' : 'Increase CPU allocation',
          };
          break;

        case 'memory':
          recommendation = {
            ...recommendation,
            action: 'scale-up',
            description: `Memory utilization at ${bottleneck.value.toFixed(1)}%. Consider adding more memory or optimizing application memory usage.`,
            suggestedAction: 'Increase memory allocation or add memory-optimized instances',
          };
          break;

        case 'disk':
          recommendation = {
            ...recommendation,
            action: 'expand',
            description: `Disk utilization at ${bottleneck.value.toFixed(1)}%. Expand storage or clean up unused data.`,
            suggestedAction: 'Expand EBS volume or implement data archival',
          };
          break;

        default:
          recommendation = {
            ...recommendation,
            action: 'investigate',
            description: `${bottleneck.metric} is at concerning levels`,
            suggestedAction: 'Investigate and optimize',
          };
      }

      recommendations.push(recommendation);
    }

    // LLM analysis for complex cases
    if (bottlenecks.length > 3) {
      try {
        const llmRecommendations = await this.queryLLM(
          'Analyze these resource bottlenecks and provide optimization recommendations:',
          { bottlenecks }
        );
        recommendations.push({
          action: 'comprehensive',
          description: 'AI-generated comprehensive analysis',
          details: llmRecommendations,
          priority: 'medium',
        });
      } catch (e) {
        this.log('LLM recommendation failed', 'warn');
      }
    }

    return recommendations;
  }

  /**
   * Fetch resource metrics from database
   */
  async fetchResourceMetrics() {
    const resources = await Resource.find({
      company: this.companyId,
      status: 'running',
    }).lean();

    return resources;
  }

  /**
   * Check specific metrics
   */
  async checkMetrics(data) {
    const { resourceIds, metricTypes } = data;

    const resources = await Resource.find({
      company: this.companyId,
      resourceId: { $in: resourceIds },
    }).lean();

    const results = [];
    for (const resource of resources) {
      const metrics = {};
      for (const type of metricTypes) {
        if (resource.metrics?.[type]) {
          metrics[type] = resource.metrics[type];
        }
      }
      results.push({
        resourceId: resource.resourceId,
        name: resource.name,
        metrics,
      });
    }

    return results;
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizations(data) {
    const resources = data?.resources || await this.fetchResourceMetrics();

    const optimizations = [];

    for (const resource of resources) {
      // Check for underutilization
      const utilization = this.calculateUtilization(resource);
      
      if (utilization < 20) {
        optimizations.push({
          resourceId: resource.resourceId,
          name: resource.name,
          type: 'downsize',
          reason: `Low utilization (${utilization.toFixed(1)}%)`,
          currentType: resource.metadata?.instanceType,
          estimatedSavings: 'Up to 50% cost reduction',
        });
      }

      // Check for optimization opportunities
      if (resource.type === 'ec2' && resource.optimization?.rightSizingRecommendation) {
        optimizations.push({
          resourceId: resource.resourceId,
          name: resource.name,
          type: 'right-size',
          reason: resource.optimization.rightSizingRecommendation,
          estimatedSavings: resource.optimization.recommendations?.[0]?.estimatedSavings,
        });
      }
    }

    return {
      totalResources: resources.length,
      optimizationOpportunities: optimizations.length,
      optimizations,
    };
  }

  /**
   * Calculate overall utilization
   */
  calculateUtilization(resource) {
    const metrics = resource.metrics || {};
    const values = [];

    if (metrics.cpu?.avg !== undefined) values.push(metrics.cpu.avg);
    if (metrics.memory?.avg !== undefined) values.push(metrics.memory.avg);

    if (values.length === 0) return 50; // Default if no data

    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.monitoringActive) {
      return { status: 'already_active' };
    }

    this.monitoringActive = true;
    this.log('Starting resource monitoring', 'info');

    this.monitoringLoop();
    
    return { status: 'started' };
  }

  /**
   * Monitoring loop
   */
  async monitoringLoop() {
    while (this.monitoringActive) {
      try {
        await this.analyzeResources({});
      } catch (error) {
        this.log(`Monitoring error: ${error.message}`, 'error');
      }

      await new Promise(resolve => 
        setTimeout(resolve, this.config.monitoringInterval)
      );
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.monitoringActive = false;
    this.log('Stopped resource monitoring', 'info');
    return { status: 'stopped' };
  }
}

export default ResourceOptimizationAgent;
