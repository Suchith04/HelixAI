import BaseAgent from './base/BaseAgent.js';
import { CostAnalysis, Resource, Recommendation } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CostOptimizationAgent - Analyzes REAL AWS cloud spending via Cost Explorer
 * + correlates with EC2/Lambda/RDS utilization for waste detection
 */
class CostOptimizationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('CostOptimization', orchestrator, companyId);
  }

  getSystemPrompt() {
    return `You are the Cost Optimization Agent. You analyze REAL AWS spending data from Cost Explorer and correlate it with live resource utilization from CloudWatch to identify waste and savings opportunities.
Return your analysis as JSON:
{
  "totalCost": 123.45,
  "topSpenders": [{"service": "Amazon EC2", "cost": 80}],
  "wasteIdentified": 45.00,
  "recommendations": [{"type": "terminate|downsize|reserved", "resource": "id", "savings": 20, "reason": "..."}]
}`;
  }

  async process(data) {
    return this.executeWithTracking('cost_analysis', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze':         return await this.analyzeSpending(actionData);
        case 'identify_waste':  return await this.identifyWaste(actionData);
        case 'suggest_savings': return await this.suggestSavings(actionData);
        default:                return await this.analyzeSpending(actionData);
      }
    });
  }

  async analyzeSpending(data) {
    const creds = await this.getAwsCredentials();
    let costData = [], forecast = null, resources = [];

    if (creds) {
      const aws = this.aws();
      // Real AWS Cost Explorer data
      try {
        costData = await aws.getCostAndUsage(creds, { days: 30, granularity: 'MONTHLY', groupBy: 'SERVICE' });
        this.log(`Fetched ${costData.length} cost entries from AWS`, 'info');
      } catch (err) { this.log(`Cost Explorer failed: ${err.message}`, 'warn'); }

      // Forecast
      try {
        forecast = await aws.getCostForecast(creds, { days: 30 });
      } catch (err) { this.log(`Cost forecast failed: ${err.message}`, 'warn'); }

      // Real resource inventory for utilization cross-reference
      try {
        const [ec2, lambdas, rdsList] = await Promise.all([
          aws.getEC2Instances(creds).catch(() => []),
          aws.getLambdaFunctions(creds).catch(() => []),
          aws.getRDSInstances(creds).catch(() => []),
        ]);
        resources = [
          ...ec2.map(i => ({ id: i.instanceId, name: i.name, type: 'ec2', state: i.state, instanceType: i.instanceType })),
          ...lambdas.map(f => ({ id: f.functionName, name: f.functionName, type: 'lambda', state: f.state, memorySize: f.memorySize })),
          ...rdsList.map(d => ({ id: d.dbInstanceId, name: d.dbInstanceId, type: 'rds', state: d.status, instanceClass: d.instanceClass })),
        ];
      } catch (err) { this.log(`Resource inventory failed: ${err.message}`, 'warn'); }
    } else {
      // Fallback to MongoDB
      const dbResources = await Resource.find({ company: this.companyId }).lean();
      resources = dbResources.map(r => ({ id: r.resourceId, name: r.name, type: r.type, state: r.status, costs: r.costs }));
    }

    const totalCost = costData.reduce((sum, c) => sum + c.cost, 0);
    const byService = this.groupCostsByService(costData);

    const waste = await this.identifyWaste({ resources, costData, creds });
    const savings = await this.suggestSavings({ resources, waste, costData });

    // LLM insights
    let llmInsights = null;
    try {
      llmInsights = await this.queryLLM('Analyze this AWS cloud spending data and provide cost optimization recommendations:', {
        totalCost, topServices: byService.slice(0, 5), forecast, wasteTotal: waste.total,
        resourceCount: resources.length, stoppedResources: resources.filter(r => r.state === 'stopped').length,
      });
    } catch (e) { this.log('LLM cost analysis failed', 'warn'); }

    const analysis = await CostAnalysis.create({
      company: this.companyId,
      period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date(), type: 'monthly' },
      summary: { totalCost, currency: 'USD', projectedMonthly: forecast?.totalForecast || totalCost },
      breakdown: { byService },
      waste,
      savings,
    });

    await this.sendMessage('Recommendation', {
      type: 'notification',
      payload: { action: 'new_recommendations', recommendations: savings.recommendations, source: 'CostOptimization' },
      priority: 3,
    });

    return {
      totalCost, byService, waste, savings, forecast, llmInsights,
      analysisId: analysis._id,
      severity: waste.total > 100 ? 'high' : waste.total > 20 ? 'medium' : 'low',
      confidence: costData.length > 0 ? 0.9 : 0.4,
    };
  }

  groupCostsByService(costData) {
    const groups = {};
    for (const c of costData) {
      groups[c.service] = (groups[c.service] || 0) + c.cost;
    }
    return Object.entries(groups).map(([service, cost]) => ({ service, cost })).sort((a, b) => b.cost - a.cost);
  }

  async identifyWaste(data) {
    const { resources = [], costData = [], creds } = data;
    const categories = [];

    // Stopped resources still costing (EBS volumes, Elastic IPs)
    const stopped = resources.filter(r => r.state === 'stopped');
    if (stopped.length > 0) {
      categories.push({
        type: 'stopped_resources', amount: stopped.length * 5, // Estimate $5/month per stopped resource (EBS)
        resources: stopped.length,
        description: `${stopped.length} stopped resources still incurring costs (EBS, Elastic IPs)`,
        resourceIds: stopped.map(r => r.id),
      });
    }

    // Underutilized — fetch live CloudWatch CPU for running EC2 instances
    if (creds) {
      const aws = this.aws();
      const runningEC2 = resources.filter(r => r.type === 'ec2' && r.state === 'running');
      const underutilized = [];
      for (const inst of runningEC2.slice(0, 10)) {
        try {
          const cpuMetric = await aws.getCloudWatchMetrics(creds, {
            namespace: 'AWS/EC2', metricName: 'CPUUtilization',
            dimensions: [{ Name: 'InstanceId', Value: inst.id }],
            hours: 24, stat: 'Average',
          });
          const avgCpu = cpuMetric.datapoints?.length
            ? cpuMetric.datapoints.reduce((s, d) => s + d.value, 0) / cpuMetric.datapoints.length
            : null;
          if (avgCpu !== null && avgCpu < 10) {
            underutilized.push({ ...inst, avgCpu });
          }
        } catch (err) { /* skip */ }
      }
      if (underutilized.length > 0) {
        categories.push({
          type: 'underutilized', amount: underutilized.length * 20, // Estimate savings
          resources: underutilized.length,
          description: `${underutilized.length} EC2 instances with <10% avg CPU — candidates for downsizing`,
          resourceIds: underutilized.map(r => r.id),
        });
      }
    }

    const total = categories.reduce((s, c) => s + c.amount, 0);
    return { total, categories };
  }

  async suggestSavings(data) {
    const { resources, waste, costData } = data;
    const recommendations = [];
    let potential = 0;

    if (waste?.categories) {
      for (const cat of waste.categories) {
        potential += cat.amount;
        recommendations.push({
          type: cat.type === 'stopped_resources' ? 'terminate' : 'downsize',
          description: cat.description,
          estimatedSavings: cat.amount,
          priority: cat.amount > 50 ? 'high' : 'medium',
          resourceIds: cat.resourceIds,
        });
      }
    }

    // Check for reserved instance opportunities from cost data
    const ec2Costs = costData?.filter(c => c.service?.includes('EC2')) || [];
    const ec2Total = ec2Costs.reduce((s, c) => s + c.cost, 0);
    if (ec2Total > 100) {
      recommendations.push({
        type: 'reserved',
        description: `EC2 spending is $${ec2Total.toFixed(2)}/month — consider Reserved Instances for up to 40% savings`,
        estimatedSavings: ec2Total * 0.3,
        priority: 'high',
      });
      potential += ec2Total * 0.3;
    }

    return { potential, implemented: 0, recommendations };
  }
}

export default CostOptimizationAgent;
