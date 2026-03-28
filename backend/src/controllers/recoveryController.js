import { Company, PendingAction } from '../models/index.js';
import RecoveryManager from '../services/RecoveryManager.js';
import * as awsCloudService from '../services/awsCloudService.js';

/**
 * GET /recovery/pending — List pending actions for the user's company
 */
export const getPendingActions = async (req, res) => {
  try {
    const actions = await RecoveryManager.getPendingActions(req.user.company);
    res.json({ success: true, data: actions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /recovery/audit — Full audit trail (all actions, all statuses)
 */
export const getAuditTrail = async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    const actions = await RecoveryManager.getAuditTrail(req.user.company, { limit: parseInt(limit), status });
    res.json({ success: true, data: actions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /recovery/:actionId/approve — Approve a pending action
 */
export const approveAction = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company?.awsCredentials?.isConfigured) {
      return res.status(400).json({ success: false, error: 'AWS credentials not configured' });
    }
    const creds = company.getAwsCredentials();
    const result = await RecoveryManager.approveAction(req.params.actionId, req.user._id, creds);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /recovery/:actionId/reject — Reject a pending action
 */
export const rejectAction = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await RecoveryManager.rejectAction(req.params.actionId, req.user._id, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /recovery/aws-resources — Fetch real-time EC2/Lambda/RDS state
 */
export const getAwsResources = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company?.awsCredentials?.isConfigured) {
      return res.status(400).json({ success: false, error: 'AWS credentials not configured' });
    }
    const creds = company.getAwsCredentials();

    const [ec2, lambda, rds, alarms] = await Promise.all([
      awsCloudService.getEC2Instances(creds).catch(e => []),
      awsCloudService.getLambdaFunctions(creds).catch(e => []),
      awsCloudService.getRDSInstances(creds).catch(e => []),
      awsCloudService.getCloudWatchAlarms(creds).catch(e => []),
    ]);

    res.json({
      success: true,
      data: {
        ec2: { total: ec2.length, running: ec2.filter(i => i.state === 'running').length, stopped: ec2.filter(i => i.state === 'stopped').length, instances: ec2 },
        lambda: { total: lambda.length, functions: lambda },
        rds: { total: rds.length, available: rds.filter(d => d.status === 'available').length, instances: rds },
        alarms: { total: alarms.length, inAlarm: alarms.filter(a => a.state === 'ALARM').length, list: alarms },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /recovery/aws-metrics — Fetch CloudWatch metrics for a specific resource
 */
export const getAwsMetrics = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company?.awsCredentials?.isConfigured) {
      return res.status(400).json({ success: false, error: 'AWS credentials not configured' });
    }
    const creds = company.getAwsCredentials();
    const { namespace, metricName, dimensions, period, stat, hours } = req.body;
    const data = await awsCloudService.getCloudWatchMetrics(creds, { namespace, metricName, dimensions, period, stat, hours });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /recovery/validate-creds — Validate AWS credentials
 */
export const validateCreds = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company?.awsCredentials?.isConfigured) {
      return res.json({ success: true, data: { valid: false, error: 'Not configured' } });
    }
    const creds = company.getAwsCredentials();
    const result = await awsCloudService.validateCredentials(creds);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
