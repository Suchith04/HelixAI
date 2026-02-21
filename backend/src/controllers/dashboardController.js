import { Agent, AgentState, Incident, Anomaly, Resource, CostAnalysis, WorkflowExecution } from '../models/index.js';
import mongoose from 'mongoose';

// Get dashboard overview
export const getOverview = async (req, res, next) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId);

    const [agentStats, incidentStats, resourceStats, recentActivity] = await Promise.all([
      // Agent status summary
      AgentState.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Incident summary
      Incident.aggregate([
        { $match: { company: companyId } },
        {
          $facet: {
            open: [{ $match: { status: { $nin: ['resolved', 'closed'] } } }, { $count: 'count' }],
            today: [{ $match: { createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } } }, { $count: 'count' }],
            critical: [{ $match: { severity: 'critical', status: { $nin: ['resolved', 'closed'] } } }, { $count: 'count' }],
          },
        },
      ]),
      // Resource health
      Resource.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: '$health.status', count: { $sum: 1 } } },
      ]),
      // Recent activity
      WorkflowExecution.find({ company: companyId }).sort({ createdAt: -1 }).limit(5)
        .select('workflowName status startTime endTime'),
    ]);

    res.json({
      agents: agentStats,
      incidents: incidentStats[0],
      resources: resourceStats,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

// Get metrics for charts
export const getMetrics = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const companyId = new mongoose.Types.ObjectId(req.companyId);

    const [incidentTrend, anomalyTrend] = await Promise.all([
      Incident.aggregate([
        { $match: { company: companyId, createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Anomaly.aggregate([
        { $match: { company: companyId, detectedAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ incidentTrend, anomalyTrend });
  } catch (error) {
    next(error);
  }
};

// Get agent performance
export const getAgentPerformance = async (req, res, next) => {
  try {
    const states = await AgentState.find({ company: req.companyId });
    const performance = states.map(s => ({
      name: s.agentName,
      status: s.status,
      tasksCompleted: s.metrics?.tasksCompleted || 0,
      successRate: s.metrics?.successRate || 0,
      confidence: s.confidence || 0,
    }));
    res.json({ performance });
  } catch (error) {
    next(error);
  }
};

// Get cost overview
export const getCostOverview = async (req, res, next) => {
  try {
    const latestAnalysis = await CostAnalysis.findOne({ company: req.companyId })
      .sort({ 'period.end': -1 });
    
    const resourceCosts = await Resource.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(req.companyId) } },
      { $group: { _id: '$type', totalCost: { $sum: '$costs.monthly' }, count: { $sum: 1 } } },
    ]);

    res.json({ latestAnalysis, resourceCosts });
  } catch (error) {
    next(error);
  }
};
