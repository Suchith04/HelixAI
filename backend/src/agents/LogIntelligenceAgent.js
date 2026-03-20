import BaseAgent from './base/BaseAgent.js';
import { LogEntry, Incident } from '../models/index.js';
import { extractErrorSignature } from '../utils/helpers.js';

/**
 * LogIntelligenceAgent - Analyzes application logs
 * Detects error patterns, extracts signatures, uses LLM for semantic analysis
 */
class LogIntelligenceAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('LogIntelligence', orchestrator, companyId);
    
    this.config = {
      ...this.config,
      batchSize: 100,
      errorPatterns: [
        /error/i,
        /exception/i,
        /failed/i,
        /timeout/i,
        /crash/i,
        /fatal/i,
        /critical/i,
      ],
      severityKeywords: {
        critical: ['crash', 'fatal', 'oom', 'out of memory', 'kernel panic'],
        high: ['error', 'exception', 'failed', 'timeout'],
        medium: ['warn', 'warning', 'deprecated'],
        low: ['info', 'debug', 'trace'],
      },
    };
  }

  getSystemPrompt() {
    return `You are the Log Intelligence Agent, an AI specialized in analyzing application and infrastructure logs.
Your capabilities include:
- Detecting error patterns and anomalies in log data
- Extracting meaningful error signatures for grouping similar issues
- Identifying root causes from log sequences
- Correlating logs across different services

When analyzing logs, focus on:
1. Error severity and impact
2. Temporal patterns (when issues occur)
3. Service relationships (which services are affected)
4. Actionable insights

Provide your analysis in JSON format with the following structure:
{
  "severity": "critical|high|medium|low",
  "summary": "Brief description of findings",
  "patterns": ["pattern1", "pattern2"],
  "rootCause": "Suspected root cause if identifiable",
  "recommendations": ["action1", "action2"],
  "confidence": 0.0-1.0
}`;
  }

  /**
   * Main processing method
   */
  async process(data) {
    return this.executeWithTracking('analyze_logs', async () => {
      const { action, data: actionData } = data;

      // Helper to get logs: use provided (CloudWatch-injected) logs or fetch from DB
      const getLogs = async (input) => {
        if (Array.isArray(input)) return input;
        if (input?.logs && Array.isArray(input.logs)) {
          if (input._cloudwatchSource) {
            this.log(`Using ${input.logs.length} pre-processed CloudWatch logs from ${input._cloudwatchSource}`, 'info');
          } else {
            this.log(`Using ${input.logs.length} provided logs`, 'info');
          }
          return input.logs;
        }
        // No logs provided — fetch recent logs from DB as fallback
        this.log('No CloudWatch logs available, fetching recent logs from database', 'info');
        const recentLogs = await LogEntry.find({ company: this.companyId })
          .sort({ timestamp: -1 })
          .limit(100)
          .lean();
        return recentLogs;
      };

      switch (action) {
        case 'analyze':
          return await this.analyzeLogs(await getLogs(actionData));
        case 'detect_patterns':
          return await this.detectPatterns(await getLogs(actionData));
        case 'extract_errors':
          return await this.extractErrors(await getLogs(actionData));
        case 'query':
          return await this.queryLogs(actionData || {});
        default:
          return await this.analyzeLogs(await getLogs(actionData));
      }
    });
  }

  /**
   * Analyze logs for issues and patterns
   */
  async analyzeLogs(logs) {
    if (!Array.isArray(logs)) logs = [];
    this.log(`Analyzing ${logs.length} log entries`, 'info');

    // Categorize logs
    const categorized = this.categorizeLogs(logs);
    
    // Extract errors
    const errors = await this.extractErrors(categorized.errors);
    
    // Detect patterns
    const patterns = await this.detectPatterns(logs);
    
    // LLM analysis for issues, patterns, or general behavior
    let llmInsights = null;
    if (categorized.errors.length > 0 || patterns.length > 0) {
      llmInsights = await this.getLLMInsights({
        errors: categorized.errors.slice(0, 20),
        patterns: patterns
      });
    } else if (logs.length > 0) {
      // General summary if no errors and no patterns detect
      llmInsights = await this.getLLMInsights({
        generalSummary: `Analyzed ${logs.length} logs. Info: ${categorized.info.length}, Warnings: ${categorized.warnings.length}. No notable errors or patterns found.`
      });
    }

    // Determine overall severity
    const severity = this.calculateSeverity(categorized, patterns);

    // If critical, notify Crash Diagnostic Agent
    if (severity === 'critical') {
      await this.sendMessage('CrashDiagnostic', {
        type: 'request',
        payload: {
          action: 'investigate',
          errors: categorized.errors.slice(0, 50),
          patterns,
          source: 'LogIntelligence',
        },
        priority: 5,
      });
    }

    const analysis = {
      totalLogs: logs.length,
      categorized: {
        errors: categorized.errors.length,
        warnings: categorized.warnings.length,
        info: categorized.info.length,
      },
      severity,
      patterns,
      errors: errors.slice(0, 20),
      llmInsights,
      confidence: this.calculateConfidence({
        dataQuality: logs.length > 10 ? 0.8 : 0.5,
        modelConfidence: llmInsights ? 0.7 : 0.4,
        historicalAccuracy: 0.75,
        corroboration: patterns.length > 0 ? 0.8 : 0.4,
      }),
      timestamp: new Date(),
    };

    // Store memory
    await this.storeMemory({
      type: 'log_analysis',
      context: { logsAnalyzed: logs.length, severity },
      outcome: analysis,
      importance: severity === 'critical' ? 1 : 0.5,
    });

    return analysis;
  }

  /**
   * Categorize logs by level
   */
  categorizeLogs(logs) {
    const categorized = {
      errors: [],
      warnings: [],
      info: [],
      debug: [],
    };

    for (const log of logs) {
      const level = (log.level || 'info').toLowerCase();
      
      if (['error', 'fatal', 'critical'].includes(level)) {
        categorized.errors.push(log);
      } else if (['warn', 'warning'].includes(level)) {
        categorized.warnings.push(log);
      } else if (['info'].includes(level)) {
        categorized.info.push(log);
      } else {
        categorized.debug.push(log);
      }
    }

    return categorized;
  }

  /**
   * Extract and analyze errors
   */
  async extractErrors(logs) {
    const errors = [];
    const signatureMap = new Map();

    for (const log of logs) {
      const signature = extractErrorSignature(log.message || '');
      
      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, {
          signature,
          count: 0,
          samples: [],
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
        });
      }

      const entry = signatureMap.get(signature);
      entry.count++;
      entry.lastSeen = log.timestamp;
      if (entry.samples.length < 3) {
        entry.samples.push(log);
      }
    }

    // Sort by frequency
    const sortedErrors = Array.from(signatureMap.values())
      .sort((a, b) => b.count - a.count);

    return sortedErrors;
  }

  /**
   * Detect patterns in logs
   */
  async detectPatterns(logs) {
    const patterns = [];
    
    // Time-based patterns
    const timePatterns = this.detectTimePatterns(logs);
    patterns.push(...timePatterns);

    // Service-based patterns
    const servicePatterns = this.detectServicePatterns(logs);
    patterns.push(...servicePatterns);

    // Error message patterns
    const messagePatterns = this.detectMessagePatterns(logs);
    patterns.push(...messagePatterns);

    return patterns;
  }

  /**
   * Detect time-based patterns
   */
  detectTimePatterns(logs) {
    const patterns = [];
    const hourlyCount = new Map();

    for (const log of logs) {
      const hour = new Date(log.timestamp).getHours();
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
    }

    // Find spike hours
    const avg = logs.length / 24;
    for (const [hour, count] of hourlyCount) {
      if (count > avg * 2) {
        patterns.push({
          type: 'time_spike',
          description: `High log volume at hour ${hour}`,
          hour,
          count,
          significance: count / avg,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect service-based patterns
   */
  detectServicePatterns(logs) {
    const patterns = [];
    const serviceErrors = new Map();

    for (const log of logs) {
      const service = log.source?.service || 'unknown';
      const level = (log.level || '').toLowerCase();
      
      if (['error', 'fatal'].includes(level)) {
        serviceErrors.set(service, (serviceErrors.get(service) || 0) + 1);
      }
    }

    // Find problematic services
    for (const [service, count] of serviceErrors) {
      if (count > 5) {
        patterns.push({
          type: 'service_errors',
          description: `Multiple errors in service: ${service}`,
          service,
          errorCount: count,
          significance: count / logs.length,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect message patterns using keywords
   */
  detectMessagePatterns(logs) {
    const patterns = [];
    const keywordCounts = new Map();

    const keywords = ['timeout', 'connection', 'memory', 'disk', 'cpu', 'database', 'network'];

    for (const log of logs) {
      const message = (log.message || '').toLowerCase();
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
        }
      }
    }

    for (const [keyword, count] of keywordCounts) {
      if (count > 3) {
        patterns.push({
          type: 'keyword_pattern',
          description: `Recurring keyword: ${keyword}`,
          keyword,
          count,
          significance: count / logs.length,
        });
      }
    }

    return patterns;
  }

  /**
   * Get LLM insights for comprehensive analysis
   */
  async getLLMInsights(insightData) {
    try {
      let contextData = {};
      let promptMessage = 'Analyze the following log data and provide insights:';

      if (insightData.errors && insightData.errors.length > 0) {
        contextData.errors = insightData.errors.map(e => ({
          message: e.message?.substring(0, 200),
          level: e.level,
          service: e.source?.service,
          timestamp: e.timestamp,
        }));
      }

      if (insightData.patterns && insightData.patterns.length > 0) {
        contextData.patterns = insightData.patterns;
      }

      if (insightData.generalSummary) {
        contextData.generalSummary = insightData.generalSummary;
        promptMessage = 'Provide a brief summary and assurance based on this log report:';
      }

      const response = await this.queryLLM(
        promptMessage,
        contextData
      );

      return response;
    } catch (error) {
      this.log(`LLM analysis failed: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Calculate overall severity
   */
  calculateSeverity(categorized, patterns) {
    if (categorized.errors.length > 50) return 'critical';
    if (categorized.errors.length > 20) return 'high';
    if (categorized.errors.length > 5 || categorized.warnings.length > 20) return 'medium';
    return 'low';
  }

  /**
   * Query logs from database
   */
  async queryLogs(query) {
    const { service, level, startTime, endTime, limit = 100 } = query;

    const filter = { company: this.companyId };
    
    if (service) filter['source.service'] = service;
    if (level) filter.level = level;
    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = new Date(startTime);
      if (endTime) filter.timestamp.$lte = new Date(endTime);
    }

    const logs = await LogEntry.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return logs;
  }
}

export default LogIntelligenceAgent;