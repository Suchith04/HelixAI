import { Company } from '../models/index.js';
import { listLogGroups, fetchLogs, filterAndGroupLogs } from '../services/awsCloudWatchService.js';
import { getOrchestrator } from '../orchestrator/AgentOrchestrator.js';

/**
 * Helper: load company + decrypt AWS credentials, or send an error response.
 */
async function getCredentials(req, res) {
  const company = await Company.findById(req.companyId);
  if (!company) {
    res.status(404).json({ error: 'Company not found' });
    return null;
  }
  const creds = company.getAwsCredentials();
  if (!creds) {
    res.status(400).json({ error: 'AWS credentials not configured. Go to Settings → AWS Credentials.' });
    return null;
  }
  return creds;
}

// ─── GET /api/cloudwatch/log-groups ───────────────────────────────────────────
export const getLogGroups = async (req, res, next) => {
  try {
    const creds = await getCredentials(req, res);
    if (!creds) return;

    const logGroups = await listLogGroups(creds);
    res.json({ logGroups });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cloudwatch/logs ────────────────────────────────────────────────
// Body: { logGroupName, startTime?, endTime?, filterPattern?, limit? }
export const getLogs = async (req, res, next) => {
  try {
    const creds = await getCredentials(req, res);
    if (!creds) return;

    const { logGroupName, startTime, endTime, filterPattern, limit } = req.body;
    if (!logGroupName) {
      return res.status(400).json({ error: 'logGroupName is required' });
    }

    const rawLogs = await fetchLogs(creds, logGroupName, {
      startTime,
      endTime,
      filterPattern,
      limit,
    });

    // Apply intelligent filtering & grouping
    const result = filterAndGroupLogs(rawLogs);

    res.json({
      logGroupName,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cloudwatch/analyze ─────────────────────────────────────────────
// Body: { logGroupName, startTime?, endTime?, filterPattern?, limit? }
// Fetches logs → filters → feeds important logs into LogIntelligenceAgent
export const analyzeLogs = async (req, res, next) => {
  try {
    const creds = await getCredentials(req, res);
    if (!creds) return;

    const { logGroupName, startTime, endTime, filterPattern, limit } = req.body;
    if (!logGroupName) {
      return res.status(400).json({ error: 'logGroupName is required' });
    }

    // 1. Fetch from CloudWatch
    const rawLogs = await fetchLogs(creds, logGroupName, {
      startTime,
      endTime,
      filterPattern,
      limit: limit || 1000,
    });

    // 2. Filter & group
    const { important, grouped, meta } = filterAndGroupLogs(rawLogs);

    if (important.length === 0) {
      return res.json({
        logGroupName,
        analysis: null,
        message: 'No important logs found in the selected time range.',
        grouped,
        meta,
      });
    }

    // 3. Feed important logs into LogIntelligenceAgent
    const orchestrator = await getOrchestrator(req.companyId);
    const agent = orchestrator.getAgent('LogIntelligence');

    if (!agent) {
      return res.status(500).json({ error: 'LogIntelligence agent not initialized. Click "Initialize Agents" on the Agents page first.' });
    }

    const analysis = await agent.process({
      action: 'analyze',
      data: { logs: important },
    });

    res.json({
      logGroupName,
      analysis,
      grouped,
      meta,
    });
  } catch (error) {
    next(error);
  }
};
