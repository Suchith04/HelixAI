import { Incident, LogEntry, Anomaly, Recovery } from '../models/index.js';

// Get all incidents
export const getIncidents = async (req, res, next) => {
  try {
    const { status, severity, limit = 50 } = req.query;
    const filter = { company: req.companyId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ incidents });
  } catch (error) {
    next(error);
  }
};

// Get incident by ID
export const getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ company: req.companyId, _id: req.params.id })
      .populate('assignee', 'firstName lastName email');
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  } catch (error) {
    next(error);
  }
};

// Update incident
export const updateIncident = async (req, res, next) => {
  try {
    const { status, assignee, notes, rootCause } = req.body;
    const incident = await Incident.findOne({ company: req.companyId, _id: req.params.id });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    if (status) {
      incident.status = status;
      incident.timeline.push({ event: 'status_change', description: `Status changed to ${status}`, by: 'user', actor: req.user._id });
      if (status === 'resolved') incident.resolvedAt = new Date();
      if (status === 'closed') incident.closedAt = new Date();
    }
    if (assignee) incident.assignee = assignee;
    if (rootCause) incident.rootCause = { ...incident.rootCause, ...rootCause };
    if (notes) incident.notes.push({ content: notes, author: req.user._id });

    await incident.save();
    res.json({ incident });
  } catch (error) {
    next(error);
  }
};

// Get incident stats using aggregation
export const getIncidentStats = async (req, res, next) => {
  try {
    const stats = await Incident.aggregate([
      { $match: { company: req.companyId } },
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
          byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
          recent: [{ $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { incidentId: 1, title: 1, severity: 1, status: 1, createdAt: 1 } }],
          total: [{ $count: 'count' }],
        },
      },
    ]);
    res.json({ stats: stats[0] });
  } catch (error) {
    next(error);
  }
};

// Get related data for an incident
export const getIncidentDetails = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ company: req.companyId, _id: req.params.id });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const [logs, anomalies, recoveries] = await Promise.all([
      LogEntry.find({ relatedIncident: incident._id }).limit(20),
      Anomaly.find({ relatedIncident: incident._id }),
      Recovery.find({ incident: incident._id }),
    ]);

    res.json({ incident, logs, anomalies, recoveries });
  } catch (error) {
    next(error);
  }
};
