import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  RebootInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
  InvokeCommand,
} from '@aws-sdk/client-lambda';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
  RebootDBInstanceCommand,
  DescribeEventsCommand,
} from '@aws-sdk/client-rds';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  ListMetricsCommand,
  DescribeAlarmsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from '@aws-sdk/client-cost-explorer';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import logger from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
//  Client Factories
// ═══════════════════════════════════════════════════════════════════════════

function buildCreds(credentials) {
  return {
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  };
}

const buildCWLogsClient = (c) => new CloudWatchLogsClient(buildCreds(c));
const buildEC2Client    = (c) => new EC2Client(buildCreds(c));
const buildLambdaClient = (c) => new LambdaClient(buildCreds(c));
const buildRDSClient    = (c) => new RDSClient(buildCreds(c));
const buildCWClient     = (c) => new CloudWatchClient(buildCreds(c));
const buildCEClient     = (c) => new CostExplorerClient(buildCreds(c));
const buildSTSClient    = (c) => new STSClient(buildCreds(c));

// ═══════════════════════════════════════════════════════════════════════════
//  CloudWatch Logs (existing functionality preserved)
// ═══════════════════════════════════════════════════════════════════════════

const LEVEL_PRIORITY = { fatal: 5, critical: 5, error: 4, warn: 3, warning: 3, info: 2, debug: 1, trace: 0 };

function parseLevel(message) {
  const upper = message.toUpperCase();
  if (upper.includes('FATAL') || upper.includes('CRITICAL')) return 'fatal';
  if (upper.includes('ERROR')) return 'error';
  if (upper.includes('WARN'))  return 'warn';
  if (upper.includes('DEBUG') || upper.includes('TRACE')) return 'debug';
  return 'info';
}

function createSignature(message) {
  return message
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\dZ]*/g, '<TS>')
    .replace(/[0-9a-f]{8,}/gi, '<ID>')
    .replace(/\d+/g, '<N>')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

export async function listLogGroups(credentials) {
  const client = buildCWLogsClient(credentials);
  const logGroups = [];
  let nextToken;
  do {
    const res = await client.send(new DescribeLogGroupsCommand({ nextToken, limit: 50 }));
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

export async function fetchLogs(credentials, logGroupName, options = {}) {
  const client = buildCWLogsClient(credentials);
  const startTime = options.startTime ? new Date(options.startTime).getTime() : Date.now() - 24 * 60 * 60 * 1000;
  const endTime = options.endTime ? new Date(options.endTime).getTime() : Date.now();
  const maxEvents = Math.min(options.limit || 500, 10000);
  const events = [];
  let nextToken;
  do {
    const params = {
      logGroupName, startTime, endTime,
      limit: Math.min(maxEvents - events.length, 100),
      ...(options.filterPattern ? { filterPattern: options.filterPattern } : {}),
      ...(nextToken ? { nextToken } : {}),
    };
    const res = await client.send(new FilterLogEventsCommand(params));
    for (const event of res.events || []) {
      events.push({
        timestamp: new Date(event.timestamp),
        message: event.message?.trim() || '',
        level: parseLevel(event.message || ''),
        source: { service: logGroupName, instance: event.logStreamName || 'unknown' },
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

export function filterAndGroupLogs(rawLogs, options = {}) {
  const maxCritical   = options.maxCritical   ?? rawLogs.length;
  const maxWarnings   = options.maxWarnings   ?? 50;
  const maxInfoSample = options.maxInfoSample ?? 20;

  const critical = [], warnings = [], info = [];
  for (const log of rawLogs) {
    const p = LEVEL_PRIORITY[log.level] ?? 2;
    if (p >= 4) critical.push(log);
    else if (p === 3) warnings.push(log);
    else info.push(log);
  }

  function groupBySignature(logs, maxGroups) {
    const map = new Map();
    for (const log of logs) {
      const sig = createSignature(log.message);
      if (!map.has(sig)) {
        map.set(sig, { signature: sig, level: log.level, count: 0, firstSeen: log.timestamp, lastSeen: log.timestamp, sample: log, source: log.source });
      }
      const grp = map.get(sig);
      grp.count++;
      if (log.timestamp > grp.lastSeen) grp.lastSeen = log.timestamp;
      if (log.timestamp < grp.firstSeen) grp.firstSeen = log.timestamp;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, maxGroups);
  }

  const criticalLogs = critical.slice(0, maxCritical);
  const warningGroups = groupBySignature(warnings, maxWarnings);
  const infoSamples = groupBySignature(info, maxInfoSample);
  const important = [...criticalLogs, ...warningGroups.map(g => g.sample)];

  return {
    important,
    grouped: {
      critical: { count: critical.length, logs: criticalLogs },
      warnings: { count: warnings.length, groups: warningGroups },
      info:     { count: info.length, samples: infoSamples },
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

// ═══════════════════════════════════════════════════════════════════════════
//  STS — Validate Credentials
// ═══════════════════════════════════════════════════════════════════════════

export async function validateCredentials(credentials) {
  try {
    const client = buildSTSClient(credentials);
    const res = await client.send(new GetCallerIdentityCommand({}));
    return { valid: true, account: res.Account, arn: res.Arn, userId: res.UserId };
  } catch (err) {
    logger.warn(`[AWS] Credential validation failed: ${err.message}`);
    return { valid: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EC2
// ═══════════════════════════════════════════════════════════════════════════

export async function getEC2Instances(credentials) {
  const client = buildEC2Client(credentials);
  const instances = [];
  let nextToken;
  do {
    const res = await client.send(new DescribeInstancesCommand({ NextToken: nextToken }));
    for (const reservation of res.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        const nameTag = inst.Tags?.find(t => t.Key === 'Name');
        instances.push({
          instanceId: inst.InstanceId,
          name: nameTag?.Value || inst.InstanceId,
          instanceType: inst.InstanceType,
          state: inst.State?.Name,
          publicIp: inst.PublicIpAddress || null,
          privateIp: inst.PrivateIpAddress || null,
          launchTime: inst.LaunchTime,
          platform: inst.PlatformDetails || 'Linux',
          availabilityZone: inst.Placement?.AvailabilityZone,
          vpcId: inst.VpcId,
          subnetId: inst.SubnetId,
          tags: inst.Tags || [],
        });
      }
    }
    nextToken = res.NextToken;
  } while (nextToken);
  logger.info(`[EC2] Found ${instances.length} instances`);
  return instances;
}

export async function getEC2InstanceStatus(credentials, instanceIds) {
  const client = buildEC2Client(credentials);
  const res = await client.send(new DescribeInstanceStatusCommand({ InstanceIds: instanceIds, IncludeAllInstances: true }));
  return (res.InstanceStatuses || []).map(s => ({
    instanceId: s.InstanceId,
    instanceState: s.InstanceState?.Name,
    systemStatus: s.SystemStatus?.Status,
    instanceStatus: s.InstanceStatus?.Status,
  }));
}

export async function rebootEC2Instance(credentials, instanceId, dryRun = true) {
  const client = buildEC2Client(credentials);
  logger.info(`[EC2] ${dryRun ? 'DRY-RUN ' : ''}Rebooting instance: ${instanceId}`);
  try {
    await client.send(new RebootInstancesCommand({ InstanceIds: [instanceId], DryRun: dryRun }));
    return { success: true, instanceId, dryRun, action: 'reboot' };
  } catch (err) {
    if (dryRun && err.Code === 'DryRunOperation') {
      return { success: true, instanceId, dryRun: true, action: 'reboot', message: 'Dry-run succeeded — would reboot' };
    }
    throw err;
  }
}

export async function stopEC2Instance(credentials, instanceId, dryRun = true) {
  const client = buildEC2Client(credentials);
  logger.info(`[EC2] ${dryRun ? 'DRY-RUN ' : ''}Stopping instance: ${instanceId}`);
  try {
    const res = await client.send(new StopInstancesCommand({ InstanceIds: [instanceId], DryRun: dryRun }));
    return { success: true, instanceId, dryRun, action: 'stop', stoppingInstances: res.StoppingInstances };
  } catch (err) {
    if (dryRun && err.Code === 'DryRunOperation') {
      return { success: true, instanceId, dryRun: true, action: 'stop', message: 'Dry-run succeeded — would stop' };
    }
    throw err;
  }
}

export async function startEC2Instance(credentials, instanceId, dryRun = true) {
  const client = buildEC2Client(credentials);
  logger.info(`[EC2] ${dryRun ? 'DRY-RUN ' : ''}Starting instance: ${instanceId}`);
  try {
    const res = await client.send(new StartInstancesCommand({ InstanceIds: [instanceId], DryRun: dryRun }));
    return { success: true, instanceId, dryRun, action: 'start', startingInstances: res.StartingInstances };
  } catch (err) {
    if (dryRun && err.Code === 'DryRunOperation') {
      return { success: true, instanceId, dryRun: true, action: 'start', message: 'Dry-run succeeded — would start' };
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Lambda
// ═══════════════════════════════════════════════════════════════════════════

export async function getLambdaFunctions(credentials) {
  const client = buildLambdaClient(credentials);
  const functions = [];
  let marker;
  do {
    const res = await client.send(new ListFunctionsCommand({ Marker: marker, MaxItems: 50 }));
    for (const fn of res.Functions || []) {
      functions.push({
        functionName: fn.FunctionName,
        runtime: fn.Runtime,
        handler: fn.Handler,
        memorySize: fn.MemorySize,
        timeout: fn.Timeout,
        lastModified: fn.LastModified,
        codeSize: fn.CodeSize,
        state: fn.State || 'Active',
        description: fn.Description || '',
      });
    }
    marker = res.NextMarker;
  } while (marker);
  logger.info(`[Lambda] Found ${functions.length} functions`);
  return functions;
}

export async function getLambdaFunction(credentials, functionName) {
  const client = buildLambdaClient(credentials);
  const res = await client.send(new GetFunctionCommand({ FunctionName: functionName }));
  return {
    functionName: res.Configuration.FunctionName,
    runtime: res.Configuration.Runtime,
    state: res.Configuration.State,
    lastModified: res.Configuration.LastModified,
    memorySize: res.Configuration.MemorySize,
    timeout: res.Configuration.Timeout,
    handler: res.Configuration.Handler,
    layers: res.Configuration.Layers?.map(l => l.Arn) || [],
  };
}

export async function invokeLambda(credentials, functionName, payload = {}, dryRun = true) {
  if (dryRun) {
    logger.info(`[Lambda] DRY-RUN invoke: ${functionName}`);
    return { success: true, functionName, dryRun: true, message: 'Dry-run — would invoke function' };
  }
  const client = buildLambdaClient(credentials);
  logger.info(`[Lambda] Invoking: ${functionName}`);
  const res = await client.send(new InvokeCommand({
    FunctionName: functionName,
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
    InvocationType: 'RequestResponse',
  }));
  const responsePayload = new TextDecoder().decode(res.Payload);
  return { success: true, functionName, dryRun: false, statusCode: res.StatusCode, payload: responsePayload };
}

// ═══════════════════════════════════════════════════════════════════════════
//  RDS
// ═══════════════════════════════════════════════════════════════════════════

export async function getRDSInstances(credentials) {
  const client = buildRDSClient(credentials);
  const instances = [];
  let marker;
  do {
    const res = await client.send(new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 }));
    for (const db of res.DBInstances || []) {
      instances.push({
        dbInstanceId: db.DBInstanceIdentifier,
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        instanceClass: db.DBInstanceClass,
        status: db.DBInstanceStatus,
        endpoint: db.Endpoint ? `${db.Endpoint.Address}:${db.Endpoint.Port}` : null,
        multiAZ: db.MultiAZ,
        storageType: db.StorageType,
        allocatedStorage: db.AllocatedStorage,
        availabilityZone: db.AvailabilityZone,
      });
    }
    marker = res.Marker;
  } while (marker);
  logger.info(`[RDS] Found ${instances.length} DB instances`);
  return instances;
}

export async function getRDSClusters(credentials) {
  const client = buildRDSClient(credentials);
  const res = await client.send(new DescribeDBClustersCommand({}));
  return (res.DBClusters || []).map(c => ({
    clusterId: c.DBClusterIdentifier,
    engine: c.Engine,
    status: c.Status,
    endpoint: c.Endpoint,
    readerEndpoint: c.ReaderEndpoint,
    multiAZ: c.MultiAZ,
    members: c.DBClusterMembers?.length || 0,
  }));
}

export async function rebootRDSInstance(credentials, dbInstanceId, dryRun = true) {
  if (dryRun) {
    logger.info(`[RDS] DRY-RUN reboot: ${dbInstanceId}`);
    return { success: true, dbInstanceId, dryRun: true, message: 'Dry-run — would reboot DB instance' };
  }
  const client = buildRDSClient(credentials);
  logger.info(`[RDS] Rebooting: ${dbInstanceId}`);
  await client.send(new RebootDBInstanceCommand({ DBInstanceIdentifier: dbInstanceId }));
  return { success: true, dbInstanceId, dryRun: false, action: 'reboot' };
}

export async function getRDSEvents(credentials, sourceId, duration = 60) {
  const client = buildRDSClient(credentials);
  const res = await client.send(new DescribeEventsCommand({
    SourceIdentifier: sourceId,
    SourceType: 'db-instance',
    Duration: duration,
  }));
  return (res.Events || []).map(e => ({
    date: e.Date,
    message: e.Message,
    sourceType: e.SourceType,
    eventCategory: e.EventCategories,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
//  CloudWatch Metrics
// ═══════════════════════════════════════════════════════════════════════════

export async function getCloudWatchMetrics(credentials, { namespace, metricName, dimensions, period = 300, stat = 'Average', hours = 1 }) {
  const client = buildCWClient(credentials);
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  const metricId = metricName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const res = await client.send(new GetMetricDataCommand({
    StartTime: startTime,
    EndTime: endTime,
    MetricDataQueries: [{
      Id: metricId || 'm1',
      MetricStat: {
        Metric: { Namespace: namespace, MetricName: metricName, Dimensions: dimensions },
        Period: period,
        Stat: stat,
      },
    }],
  }));

  const data = res.MetricDataResults?.[0];
  return {
    metricName,
    namespace,
    datapoints: (data?.Timestamps || []).map((ts, i) => ({
      timestamp: ts,
      value: data.Values[i],
    })).sort((a, b) => a.timestamp - b.timestamp),
  };
}

export async function getEC2Metrics(credentials, instanceId, hours = 1) {
  const metrics = {};
  const metricNames = ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadOps', 'DiskWriteOps', 'StatusCheckFailed'];
  for (const metricName of metricNames) {
    try {
      metrics[metricName] = await getCloudWatchMetrics(credentials, {
        namespace: 'AWS/EC2',
        metricName,
        dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        hours,
      });
    } catch (err) {
      logger.warn(`[CW] Failed to get ${metricName} for ${instanceId}: ${err.message}`);
    }
  }
  return metrics;
}

export async function getLambdaMetrics(credentials, functionName, hours = 1) {
  const metrics = {};
  const metricNames = ['Invocations', 'Errors', 'Duration', 'Throttles', 'ConcurrentExecutions'];
  for (const metricName of metricNames) {
    try {
      metrics[metricName] = await getCloudWatchMetrics(credentials, {
        namespace: 'AWS/Lambda',
        metricName,
        dimensions: [{ Name: 'FunctionName', Value: functionName }],
        hours,
      });
    } catch (err) {
      logger.warn(`[CW] Failed to get ${metricName} for ${functionName}: ${err.message}`);
    }
  }
  return metrics;
}

export async function getRDSMetrics(credentials, dbInstanceId, hours = 1) {
  const metrics = {};
  const metricNames = ['CPUUtilization', 'FreeableMemory', 'DatabaseConnections', 'ReadIOPS', 'WriteIOPS', 'FreeStorageSpace'];
  for (const metricName of metricNames) {
    try {
      metrics[metricName] = await getCloudWatchMetrics(credentials, {
        namespace: 'AWS/RDS',
        metricName,
        dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbInstanceId }],
        hours,
      });
    } catch (err) {
      logger.warn(`[CW] Failed to get ${metricName} for ${dbInstanceId}: ${err.message}`);
    }
  }
  return metrics;
}

export async function getCloudWatchAlarms(credentials) {
  const client = buildCWClient(credentials);
  const res = await client.send(new DescribeAlarmsCommand({ MaxRecords: 100 }));
  return (res.MetricAlarms || []).map(a => ({
    alarmName: a.AlarmName,
    state: a.StateValue,
    metricName: a.MetricName,
    namespace: a.Namespace,
    threshold: a.Threshold,
    comparisonOperator: a.ComparisonOperator,
    stateReason: a.StateReason,
    updatedAt: a.StateUpdatedTimestamp,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
//  Cost Explorer
// ═══════════════════════════════════════════════════════════════════════════

export async function getCostAndUsage(credentials, { days = 30, granularity = 'MONTHLY', groupBy = 'SERVICE' } = {}) {
  const client = buildCEClient(credentials);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const res = await client.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: start.toISOString().split('T')[0],
      End: end.toISOString().split('T')[0],
    },
    Granularity: granularity,
    Metrics: ['UnblendedCost', 'UsageQuantity'],
    GroupBy: [{ Type: 'DIMENSION', Key: groupBy }],
  }));

  const results = [];
  for (const period of res.ResultsByTime || []) {
    for (const group of period.Groups || []) {
      results.push({
        period: { start: period.TimePeriod.Start, end: period.TimePeriod.End },
        service: group.Keys?.[0] || 'Unknown',
        cost: parseFloat(group.Metrics?.UnblendedCost?.Amount || 0),
        unit: group.Metrics?.UnblendedCost?.Unit || 'USD',
        usage: parseFloat(group.Metrics?.UsageQuantity?.Amount || 0),
      });
    }
  }

  logger.info(`[CostExplorer] Fetched ${results.length} cost entries`);
  return results;
}

export async function getCostForecast(credentials, { days = 30 } = {}) {
  const client = buildCEClient(credentials);
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  try {
    const res = await client.send(new GetCostForecastCommand({
      TimePeriod: {
        Start: start.toISOString().split('T')[0],
        End: end.toISOString().split('T')[0],
      },
      Metric: 'UNBLENDED_COST',
      Granularity: 'MONTHLY',
    }));
    return {
      totalForecast: parseFloat(res.Total?.Amount || 0),
      unit: res.Total?.Unit || 'USD',
      forecastByPeriod: (res.ForecastResultsByTime || []).map(f => ({
        period: f.TimePeriod,
        mean: parseFloat(f.MeanValue || 0),
        lower: parseFloat(f.PredictionIntervalLowerBound || 0),
        upper: parseFloat(f.PredictionIntervalUpperBound || 0),
      })),
    };
  } catch (err) {
    logger.warn(`[CostExplorer] Forecast failed: ${err.message}`);
    return { totalForecast: 0, error: err.message };
  }
}
