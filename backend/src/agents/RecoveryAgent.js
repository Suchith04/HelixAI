import BaseAgent from './base/BaseAgent.js';
import { Recovery, Incident } from '../models/index.js';
import RecoveryManager from '../services/RecoveryManager.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RecoveryAgent - Automated infrastructure recovery with REAL AWS integration
 * Uses RecoveryManager for HITL approval on high-risk actions
 */
class RecoveryAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('Recovery', orchestrator, companyId);

    this.config = {
      ...this.config,
      maxRetries: 3,
      snapshotBeforeRecovery: true,
      autoApproveThreshold: 0.95,
    };

    // Map action types to risk levels
    this.riskMap = {
      reboot_instance: 'Low',
      start_instance: 'Low',
      invoke_lambda: 'Low',
      stop_instance: 'High',
      reboot_rds: 'High',
      scale_up: 'High',
      rollback: 'High',
    };
  }

  getSystemPrompt() {
    return `You are the Recovery Agent for AWS cloud infrastructure. You analyze system issues and recommend specific recovery actions.
You have access to REAL AWS services: EC2, Lambda, RDS via API.

When analyzing an issue, you MUST return a structured JSON response:
{
  "analysis": "Root cause description based on evidence",
  "recommended_action": "reboot_instance|stop_instance|start_instance|invoke_lambda|reboot_rds",
  "target": {
    "resourceType": "ec2|lambda|rds",
    "resourceId": "i-xxx or function-name or db-instance-id",
    "resourceName": "Human-friendly name"
  },
  "risk_level": "Low|High",
  "reasoning": "Why this action is necessary and its potential impact",
  "confidence": 0.0-1.0
}

Risk level guidelines:
- Low: Non-destructive (reboot running instance, start stopped instance, invoke lambda)
- High: Potentially destructive or impactful (stop instance, reboot database, scale changes)

If no action is needed, return:
{
  "analysis": "Description of findings",
  "recommended_action": "none",
  "reasoning": "Why no action is needed",
  "confidence": 0.0-1.0
}`;
  }

  async process(data) {
    return this.executeWithTracking('recovery_action', async () => {
      const { action, data: actionData } = data;
      switch (action) {
        case 'analyze_and_recover': return await this.analyzeAndRecover(actionData);
        case 'auto_heal':           return await this.autoHeal(actionData);
        case 'scale_resources':     return await this.scaleResources(actionData);
        case 'get_aws_overview':    return await this.getAwsOverview(actionData);
        default:                    return await this.analyzeAndRecover(actionData);
      }
    });
  }

  /**
   * Main flow: Analyze issue → LLM suggests action → RecoveryManager handles execution/HITL
   */
  async analyzeAndRecover(data) {
    const creds = await this.getAwsCredentials();
    if (!creds) {
      return { status: 'error', message: 'AWS credentials not configured', severity: 'high', confidence: 0 };
    }

    // Gather current AWS state for context
    const aws = this.aws();
    let awsState = {};
    try {
      const [instances, lambdas, rds, alarms] = await Promise.all([
        aws.getEC2Instances(creds).catch(() => []),
        aws.getLambdaFunctions(creds).catch(() => []),
        aws.getRDSInstances(creds).catch(() => []),
        aws.getCloudWatchAlarms(creds).catch(() => []),
      ]);
      awsState = {
        ec2: instances.map(i => ({ id: i.instanceId, name: i.name, state: i.state, type: i.instanceType })),
        lambda: lambdas.map(f => ({ name: f.functionName, state: f.state, runtime: f.runtime })),
        rds: rds.map(d => ({ id: d.dbInstanceId, engine: d.engine, status: d.status })),
        activeAlarms: alarms.filter(a => a.state === 'ALARM').map(a => ({ name: a.alarmName, metric: a.metricName, reason: a.stateReason?.substring(0, 100) })),
      };
    } catch (err) {
      this.log(`AWS state fetch failed: ${err.message}`, 'warn');
    }

    // Query LLM for action intent
    let actionIntent;
    try {
      const llmResponse = await this.queryLLM(
        'Analyze this issue and recommend a specific AWS recovery action:',
        { issue: data, awsState, logs: data?.logs?.slice(0, 20), cloudwatchSource: data?._cloudwatchSource }
      );

      // Parse structured JSON response
      try {
        actionIntent = JSON.parse(llmResponse);
      } catch (e) {
        // Try extracting JSON from markdown code block
        const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          actionIntent = JSON.parse(jsonMatch[1]);
        } else {
          actionIntent = { analysis: llmResponse, recommended_action: 'none', reasoning: 'Could not parse structured response', confidence: 0.3 };
        }
      }
    } catch (err) {
      this.log(`LLM action intent failed: ${err.message}`, 'error');
      return { status: 'error', message: 'Failed to generate action intent', error: err.message };
    }

    // If no action needed, return analysis only
    if (!actionIntent.recommended_action || actionIntent.recommended_action === 'none') {
      return {
        status: 'no_action',
        analysis: actionIntent.analysis,
        reasoning: actionIntent.reasoning,
        confidence: actionIntent.confidence || 0.5,
        severity: 'low',
        llmInsights: actionIntent.analysis,
      };
    }

    // Determine risk level (LLM suggestion + our risk map)
    const riskLevel = this.riskMap[actionIntent.recommended_action] || actionIntent.risk_level || 'High';

    // Delegate to RecoveryManager
    const result = await RecoveryManager.processAction({
      companyId: this.companyId,
      credentials: creds,
      agentName: this.name,
      analysis: actionIntent.analysis,
      recommendedAction: {
        type: actionIntent.recommended_action,
        target: actionIntent.target,
        params: actionIntent.params || {},
        awsApiCall: this.getAwsApiCall(actionIntent.recommended_action),
      },
      riskLevel,
      reasoning: actionIntent.reasoning,
    });

    return {
      status: result.status,
      actionId: result.actionId,
      analysis: actionIntent.analysis,
      action: actionIntent.recommended_action,
      target: actionIntent.target,
      riskLevel,
      reasoning: actionIntent.reasoning,
      confidence: actionIntent.confidence || 0.7,
      severity: riskLevel === 'High' ? 'high' : 'medium',
      llmInsights: actionIntent.analysis,
      result: result.result || null,
    };
  }

  /**
   * Auto-heal flow (triggered by other agents like CrashDiagnostic)
   */
  async autoHeal(data) {
    const { rootCauses, investigations, autoApprove } = data;
    this.log(`Auto-heal initiated with ${rootCauses?.length || 0} root causes`, 'info');

    const results = [];
    for (const rc of (rootCauses || [])) {
      const result = await this.analyzeAndRecover({
        issue: rc.description,
        rootCause: rc,
        source: 'auto_heal',
        autoApprove,
      });
      results.push(result);
    }

    return {
      totalActions: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      pending: results.filter(r => r.status === 'pending_approval').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
      severity: results.some(r => r.riskLevel === 'High') ? 'high' : 'medium',
      confidence: 0.75,
    };
  }

  /**
   * Scale resources (triggered by ResourceOptimization)
   */
  async scaleResources(data) {
    const { bottlenecks, recommendations } = data;
    this.log(`Scale request for ${bottlenecks?.length || 0} bottlenecked resources`, 'info');

    const results = [];
    for (const bn of (bottlenecks || [])) {
      const result = await this.analyzeAndRecover({
        issue: `Resource bottleneck: ${bn.metric} at ${bn.value}% on ${bn.service} ${bn.resourceId}`,
        bottleneck: bn,
        source: 'scale_resources',
      });
      results.push(result);
    }

    return {
      totalActions: results.length,
      results,
      severity: 'high',
      confidence: 0.7,
    };
  }

  /**
   * Get a full AWS infrastructure overview
   */
  async getAwsOverview() {
    const creds = await this.getAwsCredentials();
    if (!creds) return { error: 'AWS credentials not configured' };

    const aws = this.aws();
    const [ec2, lambda, rds, alarms] = await Promise.all([
      aws.getEC2Instances(creds).catch(() => []),
      aws.getLambdaFunctions(creds).catch(() => []),
      aws.getRDSInstances(creds).catch(() => []),
      aws.getCloudWatchAlarms(creds).catch(() => []),
    ]);

    return {
      ec2: { total: ec2.length, running: ec2.filter(i => i.state === 'running').length, stopped: ec2.filter(i => i.state === 'stopped').length, instances: ec2 },
      lambda: { total: lambda.length, functions: lambda },
      rds: { total: rds.length, available: rds.filter(d => d.status === 'available').length, instances: rds },
      alarms: { total: alarms.length, inAlarm: alarms.filter(a => a.state === 'ALARM').length, alarms },
    };
  }

  getAwsApiCall(actionType) {
    const map = {
      reboot_instance: 'EC2:RebootInstances',
      stop_instance: 'EC2:StopInstances',
      start_instance: 'EC2:StartInstances',
      invoke_lambda: 'Lambda:Invoke',
      reboot_rds: 'RDS:RebootDBInstance',
    };
    return map[actionType] || actionType;
  }
}

export default RecoveryAgent;