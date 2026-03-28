import BaseAgent from './base/BaseAgent.js';
import { Incident, LogEntry } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CrashDiagnosticAgent - Investigates crashes and errors
 * Enriched with REAL-TIME AWS EC2 status + Lambda error metrics for context
 */
class CrashDiagnosticAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('CrashDiagnostic', orchestrator, companyId);
    
    this.knownIssues = new Map();
    this.config = {
      ...this.config,
      confidenceThreshold: 0.8,
      escalationThreshold: 0.5,
    };
  }

  getSystemPrompt() {
    return `You are the Crash Diagnostic Agent, an AI specialized in investigating application crashes and errors in AWS infrastructure.
Your capabilities include:
- Analyzing stack traces to identify crash points
- Finding root causes from error patterns in CloudWatch logs
- Correlating crashes with AWS infrastructure state (EC2 health, Lambda errors)
- Identifying known issues and their solutions

When investigating crashes, consider:
1. Stack trace analysis — identify the failing function/line
2. AWS infrastructure state — EC2 instance status, Lambda error rates
3. Error propagation — trace how the error moved through the system
4. Resource state — memory, CPU, disk conditions at crash time from CloudWatch
5. Recent changes — deployments, config changes

Provide your analysis in JSON format:
{
  "rootCause": {
    "identified": true|false,
    "description": "Description of root cause",
    "component": "Affected component/service",
    "awsResource": "i-xxx or function-name",
    "confidence": 0.0-1.0
  },
  "severity": "critical|high|medium|low",
  "impact": "Description of impact",
  "suggestedActions": ["action1", "action2"],
  "requiresHuman": true|false
}`;
  }

  async process(data) {
    return this.executeWithTracking('crash_investigation', async () => {
      const { action, data: actionData } = data;

      let effectiveData = actionData || {};
      if (!effectiveData.errors && effectiveData.logs && Array.isArray(effectiveData.logs)) {
        const errorLogs = effectiveData.logs.filter(l => {
          const level = (l.level || '').toLowerCase();
          return ['error', 'fatal', 'critical'].includes(level);
        });
        if (errorLogs.length > 0) {
          this.log(`Extracted ${errorLogs.length} error logs from CloudWatch for crash investigation`, 'info');
          effectiveData = { ...effectiveData, errors: errorLogs, source: effectiveData._cloudwatchSource || 'CloudWatch' };
        }
      }

      switch (action) {
        case 'investigate':     return await this.investigateCrashes(effectiveData);
        case 'analyze_dump':    return await this.analyzeDump(effectiveData);
        case 'find_root_cause': return await this.findRootCause(effectiveData);
        case 'correlate':       return await this.correlateErrors(effectiveData);
        default:                return await this.investigateCrashes(effectiveData);
      }
    });
  }

  /**
   * Fetch AWS infrastructure context for enriching crash investigations
   */
  async fetchAwsContext() {
    const creds = await this.getAwsCredentials();
    if (!creds) return null;

    const aws = this.aws();
    const context = { ec2: [], lambda: [], alarms: [] };

    try {
      const instances = await aws.getEC2Instances(creds);
      const runningIds = instances.filter(i => i.state === 'running').map(i => i.instanceId);
      if (runningIds.length > 0) {
        const statuses = await aws.getEC2InstanceStatus(creds, runningIds.slice(0, 20));
        context.ec2 = statuses.map(s => ({
          instanceId: s.instanceId, instanceState: s.instanceState,
          systemStatus: s.systemStatus, instanceStatus: s.instanceStatus,
          healthy: s.systemStatus === 'ok' && s.instanceStatus === 'ok',
        }));
      }
    } catch (err) { this.log(`EC2 status fetch failed: ${err.message}`, 'warn'); }

    try {
      const fns = await aws.getLambdaFunctions(creds);
      for (const fn of fns.slice(0, 10)) {
        try {
          const metrics = await aws.getLambdaMetrics(creds, fn.functionName, 1);
          const errs = metrics.Errors?.datapoints || [];
          const totalErrors = errs.reduce((s, d) => s + d.value, 0);
          if (totalErrors > 0) {
            context.lambda.push({ functionName: fn.functionName, errors: totalErrors, runtime: fn.runtime, state: fn.state });
          }
        } catch (e) { /* skip */ }
      }
    } catch (err) { this.log(`Lambda metrics fetch failed: ${err.message}`, 'warn'); }

    try {
      const alarms = await aws.getCloudWatchAlarms(creds);
      context.alarms = alarms.filter(a => a.state === 'ALARM');
    } catch (err) { /* skip */ }

    return context;
  }

  async investigateCrashes(data) {
    const { errors, patterns, source } = data;
    this.log(`Investigating ${errors?.length || 0} crashes from ${source}`, 'info');

    // Fetch real AWS context
    const awsContext = await this.fetchAwsContext();

    const investigations = [];
    for (const error of (errors || []).slice(0, 10)) {
      const investigation = await this.investigateSingleCrash(error, awsContext);
      investigations.push(investigation);
    }

    const rootCauses = investigations.filter(i => i.rootCause?.identified).map(i => i.rootCause);
    const avgConfidence = investigations.reduce((sum, i) => sum + (i.confidence || 0), 0) / (investigations.length || 1);

    if (avgConfidence > this.config.confidenceThreshold) {
      await this.sendMessage('Recovery', {
        type: 'request',
        payload: { action: 'auto_heal', rootCauses, investigations, source: 'CrashDiagnostic', autoApprove: avgConfidence > 0.9 },
        priority: 5,
      });
    } else if (avgConfidence > this.config.escalationThreshold) {
      await this.requestHelp(['LogIntelligence', 'AnomalyDetection'], { type: 'correlation_request', data: errors });
    } else {
      await this.createIncident({ errors, investigations, reason: 'Low confidence analysis - requires human review' });
    }

    await this.sendMessage('Recommendation', {
      type: 'notification',
      payload: { action: 'analyze_incident', investigations, patterns },
      priority: 3,
    });

    return {
      investigationsCompleted: investigations.length,
      rootCausesIdentified: rootCauses.length,
      confidence: avgConfidence,
      investigations,
      awsContext: awsContext ? {
        unhealthyEC2: awsContext.ec2.filter(i => !i.healthy).length,
        lambdaWithErrors: awsContext.lambda.length,
        activeAlarms: awsContext.alarms.length,
      } : null,
      severity: avgConfidence > 0.8 ? 'critical' : avgConfidence > 0.5 ? 'high' : 'medium',
      action: avgConfidence > this.config.confidenceThreshold ? 'recovery_initiated'
            : avgConfidence > this.config.escalationThreshold ? 'collaboration_requested'
            : 'incident_created',
    };
  }

  async investigateSingleCrash(error, awsContext) {
    const knownSolution = await this.checkKnownIssues(error.message || error.signature);
    if (knownSolution) {
      return {
        rootCause: { identified: true, description: knownSolution.cause, confidence: 0.95 },
        solution: knownSolution.solution, confidence: 0.95, isKnownIssue: true,
      };
    }

    let stackAnalysis = null;
    if (error.stackTrace || error.parsed?.stackTrace) {
      stackAnalysis = this.parseStackTrace(error.stackTrace || error.parsed?.stackTrace);
    }

    let llmAnalysis = null;
    try {
      llmAnalysis = await this.queryLLM('Analyze this crash and identify root cause:', {
        error: { message: error.message, level: error.level, service: error.source?.service, stackTrace: stackAnalysis?.summary },
        awsInfraState: awsContext ? {
          unhealthyInstances: awsContext.ec2.filter(i => !i.healthy),
          lambdaErrors: awsContext.lambda,
          activeAlarms: awsContext.alarms.map(a => a.alarmName),
        } : 'AWS context not available',
      });
    } catch (e) { this.log('LLM analysis failed', 'warn'); }

    let parsedAnalysis = null;
    if (llmAnalysis) {
      try { parsedAnalysis = JSON.parse(llmAnalysis); } catch (e) { parsedAnalysis = { description: llmAnalysis }; }
    }

    return {
      error: { message: error.message?.substring(0, 200), service: error.source?.service, signature: error.signature },
      stackAnalysis,
      rootCause: parsedAnalysis?.rootCause || { identified: false, description: 'Unable to determine root cause', confidence: 0.3 },
      suggestedActions: parsedAnalysis?.suggestedActions || [],
      confidence: parsedAnalysis?.rootCause?.confidence || 0.3,
      isKnownIssue: false,
    };
  }

  async checkKnownIssues(signature) {
    if (this.knownIssues.has(signature)) return this.knownIssues.get(signature);
    const similarIncident = await Incident.findOne({
      company: this.companyId, 'rootCause.identified': true, status: { $in: ['resolved', 'closed'] },
    }).sort({ resolvedAt: -1 }).lean();
    if (similarIncident?.rootCause) {
      const solution = { cause: similarIncident.rootCause.description, solution: similarIncident.actions?.[0]?.action || 'See historical incident', incidentId: similarIncident.incidentId };
      this.knownIssues.set(signature, solution);
      return solution;
    }
    return null;
  }

  parseStackTrace(stackTrace) {
    if (!stackTrace) return null;
    const frames = [];
    for (const line of stackTrace.split('\n')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) frames.push({ function: match[1], file: match[2], line: parseInt(match[3]), column: parseInt(match[4]) });
    }
    return { frames: frames.slice(0, 10), totalFrames: frames.length, topFrame: frames[0], summary: frames.slice(0, 3).map(f => `${f.function} (${f.file}:${f.line})`).join(' -> ') };
  }

  async analyzeDump(dumpData) {
    this.log('Analyzing crash dump', 'info');
    const analysis = { crashType: this.identifyCrashType(dumpData), memoryState: this.analyzeMemoryState(dumpData), threadState: this.analyzeThreadState(dumpData), timestamp: dumpData.timestamp || new Date() };
    if (dumpData.raw) {
      try {
        analysis.llmInsight = await this.queryLLM('Analyze this crash dump and identify issues:', { dump: dumpData.raw.substring(0, 5000) });
      } catch (e) { this.log('LLM dump analysis failed', 'warn'); }
    }
    return analysis;
  }

  identifyCrashType(dumpData) {
    const indicators = { oom: ['out of memory', 'OOM', 'heap space'], segfault: ['segmentation fault', 'SIGSEGV'], nullPointer: ['null pointer', 'NullPointerException', 'undefined is not'], timeout: ['timeout', 'timed out', 'deadline exceeded'] };
    const message = JSON.stringify(dumpData).toLowerCase();
    for (const [type, keywords] of Object.entries(indicators)) {
      for (const kw of keywords) { if (message.includes(kw.toLowerCase())) return type; }
    }
    return 'unknown';
  }
  analyzeMemoryState(d) { return { heapUsed: d.memory?.heapUsed, heapTotal: d.memory?.heapTotal, external: d.memory?.external, rss: d.memory?.rss }; }
  analyzeThreadState(d) { return { activeThreads: d.threads?.length, blockedThreads: d.threads?.filter(t => t.state === 'blocked')?.length || 0, waitingThreads: d.threads?.filter(t => t.state === 'waiting')?.length || 0 }; }

  async findRootCause(data) {
    const { stackTraces, metrics, logs } = data;
    const evidence = [];
    if (stackTraces?.length) {
      for (const st of stackTraces) {
        const parsed = this.parseStackTrace(st);
        if (parsed?.topFrame) evidence.push({ type: 'stack_trace', component: parsed.topFrame.file, function: parsed.topFrame.function, confidence: 0.7 });
      }
    }
    const llmAnalysis = await this.queryLLM('Based on the following evidence, identify the root cause:', { evidence, metricsSnapshot: metrics, recentLogs: logs?.slice(0, 5) });
    return { evidence, analysis: llmAnalysis, confidence: evidence.length > 2 ? 0.8 : 0.5 };
  }

  async correlateErrors(data) {
    const { errors, timeWindow = 300000 } = data;
    const serviceErrors = new Map();
    for (const error of errors) {
      const service = error.source?.service || 'unknown';
      if (!serviceErrors.has(service)) serviceErrors.set(service, []);
      serviceErrors.get(service).push(error);
    }
    const correlations = [];
    for (const [s1, e1] of serviceErrors) {
      for (const [s2, e2] of serviceErrors) {
        if (s1 >= s2) continue;
        for (const a of e1) { for (const b of e2) {
          const diff = Math.abs(new Date(a.timestamp) - new Date(b.timestamp));
          if (diff < timeWindow) correlations.push({ service1: s1, service2: s2, timeDiff: diff, error1: a.signature, error2: b.signature });
        }}
      }
    }
    return { correlations, serviceCount: serviceErrors.size, totalErrors: errors.length };
  }

  async createIncident(data) {
    const incidentId = `INC-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const incident = await Incident.create({
      company: this.companyId, incidentId, title: 'Crash Investigation - Requires Review',
      description: data.reason, severity: 'medium', status: 'open', category: 'crash',
      source: { agent: 'CrashDiagnostic' },
      timeline: [{ event: 'created', description: 'Created by CrashDiagnostic agent', by: 'agent', actor: 'CrashDiagnostic' }],
    });
    this.log(`Created incident: ${incidentId}`, 'info');
    return incident;
  }
}

export default CrashDiagnosticAgent;
