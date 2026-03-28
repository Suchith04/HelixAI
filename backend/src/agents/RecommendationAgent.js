import BaseAgent from './base/BaseAgent.js';
import { Recommendation, Incident } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RecommendationAgent - Generates actionable insights using REAL AWS resource context
 */
class RecommendationAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('Recommendation', orchestrator, companyId);
  }

  getSystemPrompt() {
    return `You are the Recommendation Agent for AWS cloud infrastructure. You analyze incidents, agent reports, and REAL-TIME AWS resource state to generate actionable, infrastructure-aware recommendations.
When other agents send you data, correlate it with live AWS state to provide specific recommendations (e.g., "Instance i-0abc is at 95% CPU — resize from t3.micro to t3.medium").

Return JSON:
{
  "recommendations": [{
    "type": "prevention|optimization|scaling|security",
    "priority": "critical|high|medium|low",
    "title": "Short title",
    "description": "Detailed recommendation",
    "awsAction": "Specific AWS action if applicable",
    "estimatedImpact": "Expected improvement"
  }]
}`;
  }

  async process(data) {
    return this.executeWithTracking('generate_recommendations', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze_incident':     return await this.analyzeIncident(actionData);
        case 'generate_report':      return await this.generateReport(actionData);
        case 'new_recommendations':  return await this.processNewRecommendations(actionData);
        default:                     return await this.analyzeIncident(actionData);
      }
    });
  }

  /**
   * Fetch current AWS resource state for context-aware recommendations
   */
  async fetchAwsResourceContext() {
    const creds = await this.getAwsCredentials();
    if (!creds) return null;
    const aws = this.aws();

    const context = { ec2: [], lambda: [], rds: [] };
    try { context.ec2 = await aws.getEC2Instances(creds); } catch (e) { /* skip */ }
    try { context.lambda = (await aws.getLambdaFunctions(creds)).slice(0, 20); } catch (e) { /* skip */ }
    try { context.rds = await aws.getRDSInstances(creds); } catch (e) { /* skip */ }
    return context;
  }

  async analyzeIncident(data) {
    const { investigations, patterns, actions, anomalies } = data;
    const recommendations = [];
    const awsContext = await this.fetchAwsResourceContext();

    for (const inv of (investigations || [])) {
      if (inv.rootCause?.identified) {
        recommendations.push({
          type: 'prevention', category: 'application',
          title: `Prevent: ${inv.rootCause.description?.substring(0, 50)}`,
          description: inv.rootCause.description,
          priority: inv.confidence > 0.8 ? 'high' : 'medium',
          source: { agent: 'Recommendation' },
        });
      }
    }

    // LLM-enhanced: generate AWS-specific recommendations using real resource state
    if (awsContext && (investigations?.length || anomalies?.length)) {
      try {
        const llmResponse = await this.queryLLM(
          'Based on these incidents/anomalies and the current AWS infrastructure state, generate specific actionable recommendations:',
          {
            investigations: investigations?.slice(0, 5),
            anomalies: anomalies?.slice(0, 5),
            awsResources: {
              ec2Count: awsContext.ec2.length,
              ec2Running: awsContext.ec2.filter(i => i.state === 'running').length,
              lambdaCount: awsContext.lambda.length,
              rdsCount: awsContext.rds.length,
              ec2Types: [...new Set(awsContext.ec2.map(i => i.instanceType))],
            },
          }
        );
        recommendations.push({
          type: 'ai_generated', category: 'infrastructure',
          title: 'AI Infrastructure Recommendations',
          description: llmResponse,
          priority: 'medium',
          source: { agent: 'Recommendation', model: 'LLM' },
        });
      } catch (e) { this.log('LLM recommendation generation failed', 'warn'); }
    }

    for (const rec of recommendations) {
      await this.storeRecommendation(rec);
    }

    return {
      totalRecommendations: recommendations.length,
      recommendations,
      severity: recommendations.some(r => r.priority === 'high') ? 'high' : 'medium',
      confidence: recommendations.length > 0 ? 0.75 : 0.3,
      llmInsights: recommendations.find(r => r.type === 'ai_generated')?.description || null,
    };
  }

  async generateReport(data) {
    const { incidentId } = data;
    const incident = await Incident.findOne({ company: this.companyId, incidentId }).lean();
    if (!incident) return { error: 'Incident not found' };

    const awsContext = await this.fetchAwsResourceContext();

    return {
      incidentId: incident.incidentId, generatedAt: new Date(),
      summary: { title: incident.title, severity: incident.severity, status: incident.status },
      rootCause: incident.rootCause, timeline: incident.timeline,
      currentInfraState: awsContext ? {
        ec2Running: awsContext.ec2.filter(i => i.state === 'running').length,
        lambdaActive: awsContext.lambda.filter(f => f.state === 'Active').length,
        rdsAvailable: awsContext.rds.filter(d => d.status === 'available').length,
      } : null,
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
      type: rec.type || 'optimization', category: rec.category || 'infrastructure',
      title: rec.title, description: rec.description,
      priority: rec.priority || 'medium', status: 'pending',
      source: rec.source,
    });
  }
}

export default RecommendationAgent;
