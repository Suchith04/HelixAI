import BaseAgent from './base/BaseAgent.js';
import { Recommendation, Incident } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RecommendationAgent - Generates actionable insights and reports
 */
class RecommendationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('Recommendation', orchestrator, companyId);
  }

  getSystemPrompt() {
    return `You are the Recommendation Agent. Analyze incidents and generate actionable recommendations in JSON.`;
  }

  async process(data) {
    return this.executeWithTracking('generate_recommendations', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze_incident': return await this.analyzeIncident(actionData);
        case 'generate_report': return await this.generateReport(actionData);
        case 'new_recommendations': return await this.processNewRecommendations(actionData);
        default: return await this.analyzeIncident(actionData);
      }
    });
  }

  async analyzeIncident(data) {
    const { investigations, patterns } = data;
    const recommendations = [];

    for (const inv of (investigations || [])) {
      if (inv.rootCause?.identified) {
        recommendations.push({
          type: 'prevention',
          category: 'application',
          title: `Prevent: ${inv.rootCause.description?.substring(0, 50)}`,
          description: inv.rootCause.description,
          priority: inv.confidence > 0.8 ? 'high' : 'medium',
          source: { agent: 'Recommendation' },
        });
      }
    }

    for (const rec of recommendations) {
      await this.storeRecommendation(rec);
    }

    return { totalRecommendations: recommendations.length, recommendations };
  }

  async generateReport(data) {
    const { incidentId } = data;
    const incident = await Incident.findOne({ company: this.companyId, incidentId }).lean();
    if (!incident) return { error: 'Incident not found' };

    return {
      incidentId: incident.incidentId,
      generatedAt: new Date(),
      summary: { title: incident.title, severity: incident.severity, status: incident.status },
      rootCause: incident.rootCause,
      timeline: incident.timeline,
    };
  }

  async processNewRecommendations(data) {
    const { recommendations, source } = data;
    for (const rec of (recommendations || [])) {
      await this.storeRecommendation({ ...rec, source: { agent: source } });
    }
    return { stored: recommendations?.length || 0 };
  }

  async storeRecommendation(rec) {
    return await Recommendation.create({
      company: this.companyId,
      recommendationId: `REC-${Date.now()}-${uuidv4().slice(0, 8)}`,
      type: rec.type || 'optimization',
      category: rec.category || 'infrastructure',
      title: rec.title,
      description: rec.description,
      priority: rec.priority || 'medium',
      status: 'pending',
      source: rec.source,
    });
  }
}

export default RecommendationAgent;
