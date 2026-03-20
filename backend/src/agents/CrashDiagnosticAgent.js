import BaseAgent from './base/BaseAgent.js';
import { Incident, LogEntry } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CrashDiagnosticAgent - Investigates crashes and errors
 * Analyzes stack traces, finds root causes, correlates errors
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
    return `You are the Crash Diagnostic Agent, an AI specialized in investigating application crashes and errors.
Your capabilities include:
- Analyzing stack traces to identify crash points
- Finding root causes from error patterns
- Correlating crashes across multiple services
- Identifying known issues and their solutions

When investigating crashes, consider:
1. Stack trace analysis - identify the failing function/line
2. Error propagation - trace how the error moved through the system
3. Resource state - memory, CPU, disk conditions at crash time
4. Recent changes - deployments, config changes
5. Historical data - has this happened before?

Provide your analysis in JSON format:
{
  "rootCause": {
    "identified": true|false,
    "description": "Description of root cause",
    "component": "Affected component/service",
    "confidence": 0.0-1.0
  },
  "severity": "critical|high|medium|low",
  "impact": "Description of impact",
  "suggestedActions": ["action1", "action2"],
  "relatedIncidents": ["incident_id1"],
  "requiresHuman": true|false
}`;
  }

  /**
   * Main processing method
   */
  async process(data) {
    return this.executeWithTracking('crash_investigation', async () => {
      const { action, data: actionData } = data;

      // If we received CloudWatch logs but no specific crash data,
      // extract errors from the logs and investigate them
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
        case 'investigate':
          return await this.investigateCrashes(effectiveData);
        case 'analyze_dump':
          return await this.analyzeDump(effectiveData);
        case 'find_root_cause':
          return await this.findRootCause(effectiveData);
        case 'correlate':
          return await this.correlateErrors(effectiveData);
        default:
          return await this.investigateCrashes(effectiveData);
      }
    });
  }

  /**
   * Investigate crashes from error data
   */
  async investigateCrashes(data) {
    const { errors, patterns, source } = data;
    this.log(`Investigating ${errors?.length || 0} crashes from ${source}`, 'info');

    const investigations = [];

    for (const error of (errors || []).slice(0, 10)) {
      const investigation = await this.investigateSingleCrash(error);
      investigations.push(investigation);
    }

    // Aggregate findings
    const rootCauses = investigations
      .filter(i => i.rootCause?.identified)
      .map(i => i.rootCause);

    // Calculate overall confidence
    const avgConfidence = investigations.reduce((sum, i) => sum + (i.confidence || 0), 0) / 
      (investigations.length || 1);

    // Decide on action
    if (avgConfidence > this.config.confidenceThreshold) {
      // High confidence - notify Recovery Agent
      await this.sendMessage('Recovery', {
        type: 'request',
        payload: {
          action: 'auto_heal',
          rootCauses,
          investigations,
          source: 'CrashDiagnostic',
          autoApprove: avgConfidence > 0.9,
        },
        priority: 5,
      });
    } else if (avgConfidence > this.config.escalationThreshold) {
      // Medium confidence - request help
      await this.requestHelp(
        ['LogIntelligence', 'AnomalyDetection'],
        { type: 'correlation_request', data: errors }
      );
    } else {
      // Low confidence - create incident for human review
      await this.createIncident({
        errors,
        investigations,
        reason: 'Low confidence analysis - requires human review',
      });
    }

    // Notify Recommendation Agent
    await this.sendMessage('Recommendation', {
      type: 'notification',
      payload: {
        action: 'analyze_incident',
        investigations,
        patterns,
      },
      priority: 3,
    });

    return {
      investigationsCompleted: investigations.length,
      rootCausesIdentified: rootCauses.length,
      confidence: avgConfidence,
      investigations,
      action: avgConfidence > this.config.confidenceThreshold ? 'recovery_initiated' : 
              avgConfidence > this.config.escalationThreshold ? 'collaboration_requested' : 
              'incident_created',
    };
  }

  /**
   * Investigate a single crash
   */
  async investigateSingleCrash(error) {
    // Check for known issues
    const knownSolution = await this.checkKnownIssues(error.message || error.signature);
    
    if (knownSolution) {
      return {
        rootCause: {
          identified: true,
          description: knownSolution.cause,
          confidence: 0.95,
        },
        solution: knownSolution.solution,
        confidence: 0.95,
        isKnownIssue: true,
      };
    }

    // Parse stack trace if available
    let stackAnalysis = null;
    if (error.stackTrace || error.parsed?.stackTrace) {
      stackAnalysis = this.parseStackTrace(error.stackTrace || error.parsed?.stackTrace);
    }

    // LLM analysis
    let llmAnalysis = null;
    try {
      llmAnalysis = await this.queryLLM('Analyze this crash and identify root cause:', {
        error: {
          message: error.message,
          level: error.level,
          service: error.source?.service,
          stackTrace: stackAnalysis?.summary,
        },
      });
    } catch (e) {
      this.log('LLM analysis failed', 'warn');
    }

    // Parse LLM response
    let parsedAnalysis = null;
    if (llmAnalysis) {
      try {
        parsedAnalysis = JSON.parse(llmAnalysis);
      } catch (e) {
        parsedAnalysis = { description: llmAnalysis };
      }
    }

    return {
      error: {
        message: error.message?.substring(0, 200),
        service: error.source?.service,
        signature: error.signature,
      },
      stackAnalysis,
      rootCause: parsedAnalysis?.rootCause || {
        identified: false,
        description: 'Unable to determine root cause',
        confidence: 0.3,
      },
      suggestedActions: parsedAnalysis?.suggestedActions || [],
      confidence: parsedAnalysis?.rootCause?.confidence || 0.3,
      isKnownIssue: false,
    };
  }

  /**
   * Check for known issues
   */
  async checkKnownIssues(signature) {
    // Check in-memory cache
    if (this.knownIssues.has(signature)) {
      return this.knownIssues.get(signature);
    }

    // Check from historical incidents
    const similarIncident = await Incident.findOne({
      company: this.companyId,
      'rootCause.identified': true,
      status: { $in: ['resolved', 'closed'] },
    }).sort({ resolvedAt: -1 }).lean();

    if (similarIncident?.rootCause) {
      const solution = {
        cause: similarIncident.rootCause.description,
        solution: similarIncident.actions?.[0]?.action || 'See historical incident',
        incidentId: similarIncident.incidentId,
      };
      this.knownIssues.set(signature, solution);
      return solution;
    }

    return null;
  }

  /**
   * Parse stack trace
   */
  parseStackTrace(stackTrace) {
    if (!stackTrace) return null;

    const lines = stackTrace.split('\n');
    const frames = [];
    
    for (const line of lines) {
      // Match common stack trace patterns
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4]),
        });
      }
    }

    return {
      frames: frames.slice(0, 10),
      totalFrames: frames.length,
      topFrame: frames[0],
      summary: frames.slice(0, 3).map(f => `${f.function} (${f.file}:${f.line})`).join(' -> '),
    };
  }

  /**
   * Analyze crash dump
   */
  async analyzeDump(dumpData) {
    this.log('Analyzing crash dump', 'info');

    // Extract key information
    const analysis = {
      crashType: this.identifyCrashType(dumpData),
      memoryState: this.analyzeMemoryState(dumpData),
      threadState: this.analyzeThreadState(dumpData),
      timestamp: dumpData.timestamp || new Date(),
    };

    // LLM analysis for complex dumps
    if (dumpData.raw) {
      try {
        const llmInsight = await this.queryLLM(
          'Analyze this crash dump and identify issues:',
          { dump: dumpData.raw.substring(0, 5000) }
        );
        analysis.llmInsight = llmInsight;
      } catch (e) {
        this.log('LLM dump analysis failed', 'warn');
      }
    }

    return analysis;
  }

  /**
   * Identify crash type
   */
  identifyCrashType(dumpData) {
    const indicators = {
      oom: ['out of memory', 'OOM', 'heap space', 'memory allocation failed'],
      segfault: ['segmentation fault', 'SIGSEGV', 'access violation'],
      nullPointer: ['null pointer', 'NullPointerException', 'undefined is not'],
      assertion: ['assertion failed', 'assert', 'AssertionError'],
      timeout: ['timeout', 'timed out', 'deadline exceeded'],
    };

    const message = JSON.stringify(dumpData).toLowerCase();
    
    for (const [type, keywords] of Object.entries(indicators)) {
      for (const keyword of keywords) {
        if (message.includes(keyword.toLowerCase())) {
          return type;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Analyze memory state
   */
  analyzeMemoryState(dumpData) {
    return {
      heapUsed: dumpData.memory?.heapUsed || null,
      heapTotal: dumpData.memory?.heapTotal || null,
      external: dumpData.memory?.external || null,
      rss: dumpData.memory?.rss || null,
    };
  }

  /**
   * Analyze thread state
   */
  analyzeThreadState(dumpData) {
    return {
      activeThreads: dumpData.threads?.length || null,
      blockedThreads: dumpData.threads?.filter(t => t.state === 'blocked')?.length || 0,
      waitingThreads: dumpData.threads?.filter(t => t.state === 'waiting')?.length || 0,
    };
  }

  /**
   * Find root cause from multiple data sources
   */
  async findRootCause(data) {
    const { stackTraces, metrics, logs, timeline } = data;

    // Aggregate evidence
    const evidence = [];

    if (stackTraces?.length) {
      for (const st of stackTraces) {
        const parsed = this.parseStackTrace(st);
        if (parsed?.topFrame) {
          evidence.push({
            type: 'stack_trace',
            component: parsed.topFrame.file,
            function: parsed.topFrame.function,
            confidence: 0.7,
          });
        }
      }
    }

    // Analyze with LLM
    const llmAnalysis = await this.queryLLM(
      'Based on the following evidence, identify the root cause:',
      { evidence, metricsSnapshot: metrics, recentLogs: logs?.slice(0, 5) }
    );

    return {
      evidence,
      analysis: llmAnalysis,
      confidence: evidence.length > 2 ? 0.8 : 0.5,
    };
  }

  /**
   * Correlate errors across services
   */
  async correlateErrors(data) {
    const { errors, timeWindow = 300000 } = data; // 5 min window

    const correlations = [];
    const serviceErrors = new Map();

    // Group by service
    for (const error of errors) {
      const service = error.source?.service || 'unknown';
      if (!serviceErrors.has(service)) {
        serviceErrors.set(service, []);
      }
      serviceErrors.get(service).push(error);
    }

    // Find time-correlated errors
    for (const [service1, errors1] of serviceErrors) {
      for (const [service2, errors2] of serviceErrors) {
        if (service1 >= service2) continue;

        for (const e1 of errors1) {
          for (const e2 of errors2) {
            const timeDiff = Math.abs(
              new Date(e1.timestamp) - new Date(e2.timestamp)
            );
            if (timeDiff < timeWindow) {
              correlations.push({
                service1,
                service2,
                timeDiff,
                error1: e1.signature,
                error2: e2.signature,
              });
            }
          }
        }
      }
    }

    return {
      correlations,
      serviceCount: serviceErrors.size,
      totalErrors: errors.length,
    };
  }

  /**
   * Create incident for human review
   */
  async createIncident(data) {
    const incidentId = `INC-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const incident = await Incident.create({
      company: this.companyId,
      incidentId,
      title: 'Crash Investigation - Requires Review',
      description: data.reason,
      severity: 'medium',
      status: 'open',
      category: 'crash',
      source: {
        agent: 'CrashDiagnostic',
      },
      timeline: [{
        event: 'created',
        description: 'Created by CrashDiagnostic agent',
        by: 'agent',
        actor: 'CrashDiagnostic',
      }],
    });

    this.log(`Created incident: ${incidentId}`, 'info');
    return incident;
  }
}

export default CrashDiagnosticAgent;
