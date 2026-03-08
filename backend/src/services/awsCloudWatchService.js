import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import logger from '../utils/logger.js';

/**
 * AWS CloudWatch Service
 * Fetches, filters, and groups logs from CloudWatch for agent consumption.
 *
 * SCALABILITY DESIGN:
 *  - Pagination: uses nextToken to fetch logs in batches
 *  - Smart filtering: only surfaces important logs (ERROR/WARN/FATAL) by default
 *  - Grouping: deduplicates repetitive messages using signature hashing,
 *    so the agent receives grouped summaries instead of thousands of raw lines
 *  - Configurable limits: max events, time windows, and filter patterns
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_PRIORITY = { fatal: 5, critical: 5, error: 4, warn: 3, warning: 3, info: 2, debug: 1, trace: 0 };

/**
 * Parse the severity level from a raw log message string.
 */
function parseLevel(message) {
  const upper = message.toUpperCase();
  if (upper.includes('FATAL'))    return 'fatal';
  if (upper.includes('CRITICAL')) return 'fatal';
  if (upper.includes('ERROR'))    return 'error';
  if (upper.includes('WARN'))     return 'warn';
  if (upper.includes('DEBUG'))    return 'debug';
  if (upper.includes('TRACE'))    return 'debug';
  return 'info';
}

/**
 * Create a short signature from a message for grouping similar logs.
 * Strips numbers, IDs, timestamps so that "Connection timeout after 3012ms"
 * and "Connection timeout after 7844ms" collapse into the same group.
 */
function createSignature(message) {
  return message
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\dZ]*/g, '<TS>')   // timestamps
    .replace(/[0-9a-f]{8,}/gi, '<ID>')                                       // hex IDs
    .replace(/\d+/g, '<N>')                                                   // numbers
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

// ─── Client factory ───────────────────────────────────────────────────────────

function buildClient(credentials) {
  return new CloudWatchLogsClient({
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all CloudWatch Log Groups the IAM user can see.
 * @param {Object} credentials  { accessKeyId, secretAccessKey, region }
 * @returns {Promise<Array>}    [{ logGroupName, storedBytes, creationTime, retentionInDays }]
 */
export async function listLogGroups(credentials) {
  const client = buildClient(credentials);
  const logGroups = [];
  let nextToken;

  do {
    const cmd = new DescribeLogGroupsCommand({ nextToken, limit: 50 });
    const res = await client.send(cmd);
    for (const lg of res.logGroups || []) {
      logGroups.push({
        logGroupName: lg.logGroupName,
        storedBytes: lg.storedBytes,
        creationTime: lg.creationTime,
        retentionInDays: lg.retentionInDays || 'Never expire',
      });
    }
    nextToken = res.nextToken;
  } while (nextToken);

  logger.info(`[CloudWatch] Found ${logGroups.length} log groups`);
  return logGroups;
}

/**
 * Fetch raw log events from a specific log group.
 *
 * @param {Object} credentials    Decrypted AWS creds
 * @param {string} logGroupName   e.g. "/aws/ec2/taskflow-planner"
 * @param {Object} options
 *   - startTime  {number|Date}  Start of time window (default: 24 h ago)
 *   - endTime    {number|Date}  End of time window   (default: now)
 *   - filterPattern {string}    CloudWatch filter syntax (optional)
 *   - limit      {number}       Max events to return (default 500, max 10 000)
 * @returns {Promise<Array>}     Normalised log objects
 */
export async function fetchLogs(credentials, logGroupName, options = {}) {
  const client = buildClient(credentials);

  const startTime = options.startTime
    ? new Date(options.startTime).getTime()
    : Date.now() - 24 * 60 * 60 * 1000; // 24 h ago
  const endTime = options.endTime
    ? new Date(options.endTime).getTime()
    : Date.now();
  const maxEvents = Math.min(options.limit || 500, 10000);

  const events = [];
  let nextToken;

  do {
    const params = {
      logGroupName,
      startTime,
      endTime,
      limit: Math.min(maxEvents - events.length, 100),  // page size capped at 100
      ...(options.filterPattern ? { filterPattern: options.filterPattern } : {}),
      ...(nextToken ? { nextToken } : {}),
    };

    const res = await client.send(new FilterLogEventsCommand(params));

    for (const event of res.events || []) {
      events.push({
        timestamp: new Date(event.timestamp),
        message: event.message?.trim() || '',
        level: parseLevel(event.message || ''),
        source: {
          service: logGroupName,
          instance: event.logStreamName || 'unknown',
        },
        raw: event.message,
        ingestionTime: event.ingestionTime,
        eventId: event.eventId,
      });
    }

    nextToken = res.nextToken;
  } while (nextToken && events.length < maxEvents);

  logger.info(`[CloudWatch] Fetched ${events.length} events from ${logGroupName}`);
  return events;
}

/**
 * Filter & group logs so only important data is sent to the agent.
 *
 * Strategy (scalable):
 *  1. Separate logs into importance tiers:
 *       CRITICAL = fatal, error, critical
 *       WARNING  = warn
 *       NOISE    = info, debug, trace
 *  2. Keep ALL critical-tier logs (usually a small set).
 *  3. Group warning-tier by signature, keep top N groups.
 *  4. Sample noise-tier: keep 1 representative per signature (up to M).
 *  5. Return a structured object the agent can consume efficiently.
 *
 * @param {Array}  rawLogs   Output of fetchLogs()
 * @param {Object} options
 *   - maxCritical   {number}  Max critical logs to keep (default all)
 *   - maxWarnings   {number}  Max warning groups (default 50)
 *   - maxInfoSample {number}  Max info-tier samples (default 20)
 * @returns {Object} { important, grouped, meta }
 */
export function filterAndGroupLogs(rawLogs, options = {}) {
  const maxCritical   = options.maxCritical   ?? rawLogs.length;
  const maxWarnings   = options.maxWarnings   ?? 50;
  const maxInfoSample = options.maxInfoSample ?? 20;

  // ── Tier separation ─────────────────────────────────────────────────────
  const critical = [];
  const warnings = [];
  const info     = [];

  for (const log of rawLogs) {
    const p = LEVEL_PRIORITY[log.level] ?? 2;
    if (p >= 4)      critical.push(log);
    else if (p === 3) warnings.push(log);
    else              info.push(log);
  }

  // ── Group by signature ──────────────────────────────────────────────────
  function groupBySignature(logs, maxGroups) {
    const map = new Map();
    for (const log of logs) {
      const sig = createSignature(log.message);
      if (!map.has(sig)) {
        map.set(sig, {
          signature: sig,
          level: log.level,
          count: 0,
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          sample: log,          // keep one representative
          source: log.source,
        });
      }
      const grp = map.get(sig);
      grp.count++;
      if (log.timestamp > grp.lastSeen) grp.lastSeen = log.timestamp;
      if (log.timestamp < grp.firstSeen) grp.firstSeen = log.timestamp;
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxGroups);
  }

  const criticalLogs = critical.slice(0, maxCritical);
  const warningGroups = groupBySignature(warnings, maxWarnings);
  const infoSamples = groupBySignature(info, maxInfoSample);

  // ── Build the agent-ready payload ───────────────────────────────────────
  // The "important" array is what gets fed directly into LogIntelligenceAgent.
  // It contains all critical logs + one sample per warning group,
  // giving the agent a dense, de-noised view.
  const important = [
    ...criticalLogs,
    ...warningGroups.map(g => g.sample),
  ];

  return {
    important,        // array of log objects → feed to agent
    grouped: {
      critical:  { count: critical.length, logs: criticalLogs },
      warnings:  { count: warnings.length, groups: warningGroups },
      info:      { count: info.length, samples: infoSamples },
    },
    meta: {
      totalRaw: rawLogs.length,
      totalImportant: important.length,
      reductionRatio: rawLogs.length > 0
        ? ((1 - important.length / rawLogs.length) * 100).toFixed(1) + '%'
        : '0%',
      processedAt: new Date(),
    },
  };
}
