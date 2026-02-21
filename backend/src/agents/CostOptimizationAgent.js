import BaseAgent from './base/BaseAgent.js';
import { CostAnalysis, Resource, Recommendation } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CostOptimizationAgent - Analyzes cloud spending and identifies savings
 */
class CostOptimizationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('CostOptimization', orchestrator, companyId);
  }

  getSystemPrompt() {
    return `You are the Cost Optimization Agent. Analyze cloud spending and identify waste and savings opportunities.`;
  }

  async process(data) {
    return this.executeWithTracking('cost_analysis', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze': return await this.analyzeSpending(actionData);
        case 'identify_waste': return await this.identifyWaste(actionData);
        case 'suggest_savings': return await this.suggestSavings(actionData);
        default: return await this.analyzeSpending(actionData);
      }
    });
  }

  async analyzeSpending(data) {
    const resources = await Resource.find({ company: this.companyId }).lean();
    
    const totalCost = resources.reduce((sum, r) => sum + (r.costs?.monthly || 0), 0);
    const byService = this.groupCostsByType(resources);
    const byRegion = this.groupCostsByRegion(resources);

    const waste = await this.identifyWaste({ resources });
    const savings = await this.suggestSavings({ resources, waste });

    const analysis = await CostAnalysis.create({
      company: this.companyId,
      period: { start: new Date(Date.now() - 30*24*60*60*1000), end: new Date(), type: 'monthly' },
      summary: { totalCost, currency: 'USD', projectedMonthly: totalCost },
      breakdown: { byService, byRegion },
      waste,
      savings,
    });

    await this.sendMessage('Recommendation', {
      type: 'notification',
      payload: { action: 'new_recommendations', recommendations: savings.recommendations, source: 'CostOptimization' },
      priority: 3,
    });

    return { totalCost, waste, savings, analysisId: analysis._id };
  }

  groupCostsByType(resources) {
    const groups = {};
    resources.forEach(r => {
      groups[r.type] = (groups[r.type] || 0) + (r.costs?.monthly || 0);
    });
    return Object.entries(groups).map(([service, cost]) => ({ service, cost }));
  }

  groupCostsByRegion(resources) {
    const groups = {};
    resources.forEach(r => {
      groups[r.region] = (groups[r.region] || 0) + (r.costs?.monthly || 0);
    });
    return Object.entries(groups).map(([region, cost]) => ({ region, cost }));
  }

  async identifyWaste(data) {
    const resources = data?.resources || await Resource.find({ company: this.companyId }).lean();
    const categories = [];

    // Underutilized resources
    const underutilized = resources.filter(r => {
      const cpu = r.metrics?.cpu?.avg || 50;
      const mem = r.metrics?.memory?.avg || 50;
      return cpu < 20 && mem < 30;
    });

    if (underutilized.length > 0) {
      const amount = underutilized.reduce((s, r) => s + (r.costs?.monthly || 0) * 0.5, 0);
      categories.push({ type: 'underutilized', amount, resources: underutilized.length, description: 'Resources with low utilization' });
    }

    // Unused resources (stopped but still costing)
    const unused = resources.filter(r => r.status === 'stopped' && (r.costs?.monthly || 0) > 0);
    if (unused.length > 0) {
      const amount = unused.reduce((s, r) => s + (r.costs?.monthly || 0), 0);
      categories.push({ type: 'unused', amount, resources: unused.length, description: 'Stopped resources still incurring costs' });
    }

    const total = categories.reduce((s, c) => s + c.amount, 0);
    return { total, categories };
  }

  async suggestSavings(data) {
    const { resources, waste } = data;
    const recommendations = [];
    let potential = 0;

    if (waste?.categories) {
      for (const cat of waste.categories) {
        potential += cat.amount;
        recommendations.push({
          type: cat.type === 'unused' ? 'terminate' : 'downsize',
          description: cat.description,
          estimatedSavings: cat.amount,
          priority: cat.amount > 100 ? 'high' : 'medium',
        });
      }
    }

    return { potential, implemented: 0, recommendations };
  }
}

export default CostOptimizationAgent;
