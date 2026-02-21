import BaseAgent from './base/BaseAgent.js';
import { Recovery, Incident } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RecoveryAgent - Executes auto-healing actions
 * Restarts services, rolls back deployments, routes traffic
 */
class RecoveryAgent extends BaseAgent {
  constructor(orchestrator, companyId) {
    super('Recovery', orchestrator, companyId);
    
    this.activeRecoveries = new Map();
    this.config = {
      ...this.config,
      approvalRequired: true,
      maxRiskLevel: 3,
      healthCheckDelay: 5000,
      rollbackEnabled: true,
    };

    // Available recovery actions
    this.actions = new Map([
      ['restart-service', {
        name: 'Restart Service',
        riskLevel: 2,
        requiresApproval: false,
        execute: this.restartService.bind(this),
        rollback: this.rollbackRestart.bind(this),
      }],
      ['scale-up', {
        name: 'Scale Up',
        riskLevel: 2,
        requiresApproval: false,
        execute: this.scaleUp.bind(this),
        rollback: this.scaleDown.bind(this),
      }],
      ['scale-out', {
        name: 'Scale Out',
        riskLevel: 2,
        requiresApproval: false,
        execute: this.scaleOut.bind(this),
        rollback: this.scaleIn.bind(this),
      }],
      ['rollback-deployment', {
        name: 'Rollback Deployment',
        riskLevel: 4,
        requiresApproval: true,
        execute: this.rollbackDeployment.bind(this),
        rollback: null,
      }],
      ['failover', {
        name: 'Failover',
        riskLevel: 4,
        requiresApproval: true,
        execute: this.executeFailover.bind(this),
        rollback: this.failback.bind(this),
      }],
      ['update-config', {
        name: 'Update Configuration',
        riskLevel: 3,
        requiresApproval: true,
        execute: this.updateConfig.bind(this),
        rollback: this.revertConfig.bind(this),
      }],
    ]);
  }

  getSystemPrompt() {
    return `You are the Recovery Agent, an AI specialized in executing auto-healing actions for cloud infrastructure.
Your capabilities include:
- Restarting failed services and pods
- Scaling resources up/out based on demand
- Rolling back problematic deployments
- Executing failover procedures
- Updating configurations to fix issues

Safety is paramount. Always:
1. Assess risk before taking action
2. Take snapshots before changes
3. Verify health after actions
4. Be prepared to rollback

Provide action plans in JSON format:
{
  "action": "action_type",
  "target": {"type": "service|pod|deployment", "name": "name"},
  "riskLevel": 1-5,
  "requiresApproval": true|false,
  "steps": ["step1", "step2"],
  "healthChecks": ["check1", "check2"],
  "rollbackPlan": "How to undo if needed"
}`;
  }

  /**
   * Main processing method
   */
  async process(data) {
    return this.executeWithTracking('recovery_action', async () => {
      const { action, data: actionData } = data;

      switch (action) {
        case 'auto_heal':
          return await this.handleAutoHeal(actionData);
        case 'scale_resources':
          return await this.handleScaleResources(actionData);
        case 'execute':
          return await this.executeAction(actionData);
        case 'rollback':
          return await this.rollbackAction(actionData);
        case 'approve':
          return await this.approveAction(actionData);
        default:
          return await this.handleAutoHeal(actionData);
      }
    });
  }

  /**
   * Handle auto-healing request
   */
  async handleAutoHeal(data) {
    const { rootCauses, investigations, autoApprove } = data;
    this.log(`Processing auto-heal request for ${rootCauses?.length || 0} issues`, 'info');

    const actions = [];

    for (const rootCause of (rootCauses || [])) {
      const suggestedAction = await this.determineBestAction(rootCause);
      
      if (suggestedAction) {
        const result = await this.executeRecoveryAction(
          suggestedAction,
          rootCause,
          autoApprove
        );
        actions.push(result);
      }
    }

    // Notify Recommendation Agent
    await this.sendMessage('Recommendation', {
      type: 'notification',
      payload: {
        action: 'recovery_actions',
        actions,
        source: 'Recovery',
      },
      priority: 3,
    });

    return {
      actionsInitiated: actions.length,
      successful: actions.filter(a => a.status === 'success').length,
      pending: actions.filter(a => a.status === 'pending_approval').length,
      failed: actions.filter(a => a.status === 'failed').length,
      actions,
    };
  }

  /**
   * Handle scale resources request
   */
  async handleScaleResources(data) {
    const { bottlenecks, recommendations } = data;
    this.log(`Scaling resources for ${bottlenecks?.length || 0} bottlenecks`, 'info');

    const results = [];

    for (const bottleneck of (bottlenecks || [])) {
      let actionType;
      
      switch (bottleneck.metric) {
        case 'cpu':
        case 'memory':
          actionType = 'scale-up';
          break;
        default:
          actionType = 'scale-out';
      }

      const result = await this.executeRecoveryAction(
        actionType,
        {
          target: {
            type: bottleneck.type,
            name: bottleneck.name,
            resourceId: bottleneck.resourceId,
          },
          reason: `${bottleneck.metric} at ${bottleneck.value}%`,
        },
        bottleneck.severity === 'critical' // Auto-approve critical
      );

      results.push(result);
    }

    return { results };
  }

  /**
   * Determine best action for a root cause
   */
  async determineBestAction(rootCause) {
    // Use LLM to determine action
    try {
      const response = await this.queryLLM(
        'Based on this root cause, what recovery action should be taken?',
        { rootCause, availableActions: Array.from(this.actions.keys()) }
      );

      // Parse response to get action type
      const actionMatch = response.match(/(restart|scale|rollback|failover|config)/i);
      if (actionMatch) {
        const actionMap = {
          restart: 'restart-service',
          scale: 'scale-up',
          rollback: 'rollback-deployment',
          failover: 'failover',
          config: 'update-config',
        };
        return actionMap[actionMatch[1].toLowerCase()] || 'restart-service';
      }
    } catch (e) {
      this.log('LLM action determination failed, using default', 'warn');
    }

    // Default to restart
    return 'restart-service';
  }

  /**
   * Execute a recovery action
   */
  async executeRecoveryAction(actionType, context, autoApprove = false) {
    const actionDef = this.actions.get(actionType);
    
    if (!actionDef) {
      return { status: 'failed', error: `Unknown action: ${actionType}` };
    }

    const recoveryId = `REC-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Create recovery record
    const recovery = await Recovery.create({
      company: this.companyId,
      recoveryId,
      type: actionType.split('-')[0],
      action: {
        name: actionDef.name,
        description: `Auto-healing: ${context.reason || 'Issue detected'}`,
      },
      target: context.target || {},
      status: 'pending',
      riskLevel: actionDef.riskLevel,
      approval: {
        required: actionDef.requiresApproval && !autoApprove,
        autoApproved: autoApprove,
      },
      triggeredBy: {
        type: 'agent',
        agentName: context.source || 'Recovery',
      },
    });

    // Check if approval required
    if (actionDef.requiresApproval && !autoApprove && actionDef.riskLevel > this.config.maxRiskLevel) {
      this.log(`Action ${actionType} requires approval`, 'info');
      
      // Broadcast for human approval
      await this.broadcast({
        type: 'approval_required',
        recoveryId,
        action: actionDef.name,
        riskLevel: actionDef.riskLevel,
        context,
      });

      return {
        status: 'pending_approval',
        recoveryId,
        action: actionType,
        riskLevel: actionDef.riskLevel,
      };
    }

    // Execute action
    return await this.executeAction({
      recoveryId,
      actionType,
      context,
    });
  }

  /**
   * Execute approved action
   */
  async executeAction(data) {
    const { recoveryId, actionType, context } = data;

    const recovery = await Recovery.findOne({
      company: this.companyId,
      recoveryId,
    });

    if (!recovery) {
      return { status: 'failed', error: 'Recovery record not found' };
    }

    const actionDef = this.actions.get(actionType);
    if (!actionDef) {
      return { status: 'failed', error: `Unknown action: ${actionType}` };
    }

    // Update status
    recovery.status = 'in_progress';
    recovery.execution = { startedAt: new Date() };
    await recovery.save();

    this.log(`Executing ${actionType} for ${recoveryId}`, 'info');

    try {
      // Take snapshot before action
      if (this.config.rollbackEnabled) {
        const snapshot = await this.takeSnapshot(context.target);
        recovery.snapshot = {
          taken: true,
          data: snapshot,
          createdAt: new Date(),
        };
        await recovery.save();
      }

      // Execute action
      const result = await actionDef.execute(context);

      // Wait and perform health check
      await this.sleep(this.config.healthCheckDelay);
      const healthResult = await this.performHealthCheck(context.target);

      if (!healthResult.healthy) {
        // Rollback if unhealthy
        if (actionDef.rollback && this.config.rollbackEnabled) {
          this.log(`Health check failed, rolling back ${recoveryId}`, 'warn');
          await actionDef.rollback(context, recovery.snapshot.data);
          
          recovery.rollback = {
            performed: true,
            reason: 'Health check failed',
            performedAt: new Date(),
            success: true,
          };
        }

        recovery.status = 'rolled_back';
        recovery.result = {
          success: false,
          message: 'Action rolled back due to failed health check',
        };
      } else {
        recovery.status = 'completed';
        recovery.result = {
          success: true,
          message: 'Action completed successfully',
          data: result,
        };
        recovery.healthCheck = {
          performed: true,
          passed: true,
          checkedAt: new Date(),
          results: healthResult,
        };
      }

      recovery.execution.completedAt = new Date();
      recovery.execution.duration = 
        recovery.execution.completedAt - recovery.execution.startedAt;
      await recovery.save();

      return {
        status: recovery.status,
        recoveryId,
        result: recovery.result,
      };

    } catch (error) {
      recovery.status = 'failed';
      recovery.result = {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
      };
      await recovery.save();

      this.log(`Action failed: ${error.message}`, 'error');

      return {
        status: 'failed',
        recoveryId,
        error: error.message,
      };
    }
  }

  /**
   * Approve a pending action
   */
  async approveAction(data) {
    const { recoveryId, userId, approved, reason } = data;

    const recovery = await Recovery.findOne({
      company: this.companyId,
      recoveryId,
      status: 'pending',
    });

    if (!recovery) {
      return { status: 'failed', error: 'Recovery not found or not pending' };
    }

    if (approved) {
      recovery.approval.approvedBy = userId;
      recovery.approval.approvedAt = new Date();
      recovery.approval.reason = reason;
      await recovery.save();

      // Execute the action
      return await this.executeAction({
        recoveryId,
        actionType: `${recovery.type}-${recovery.action.name.toLowerCase().replace(/ /g, '-')}`,
        context: recovery.target,
      });
    } else {
      recovery.status = 'cancelled';
      recovery.approval.reason = reason || 'Rejected by user';
      await recovery.save();

      return { status: 'cancelled', recoveryId };
    }
  }

  /**
   * Rollback a completed action
   */
  async rollbackAction(data) {
    const { recoveryId } = data;

    const recovery = await Recovery.findOne({
      company: this.companyId,
      recoveryId,
      status: 'completed',
    });

    if (!recovery || !recovery.snapshot?.taken) {
      return { status: 'failed', error: 'Cannot rollback - no snapshot available' };
    }

    const actionType = `${recovery.type}-service`;
    const actionDef = this.actions.get(actionType);

    if (!actionDef?.rollback) {
      return { status: 'failed', error: 'Rollback not available for this action' };
    }

    try {
      await actionDef.rollback(recovery.target, recovery.snapshot.data);

      recovery.rollback = {
        performed: true,
        reason: 'Manual rollback requested',
        performedAt: new Date(),
        success: true,
      };
      recovery.status = 'rolled_back';
      await recovery.save();

      return { status: 'rolled_back', recoveryId };
    } catch (error) {
      recovery.rollback = {
        performed: true,
        reason: error.message,
        performedAt: new Date(),
        success: false,
      };
      await recovery.save();

      return { status: 'failed', error: error.message };
    }
  }

  // Action implementations (stubs - would integrate with actual infrastructure)
  async restartService(context) {
    this.log(`Restarting service: ${context.target?.name}`, 'info');
    // In production: call K8s API to restart pod/deployment
    await this.sleep(2000); // Simulate restart time
    return { restarted: true, service: context.target?.name };
  }

  async rollbackRestart(context, snapshot) {
    // Restart doesn't need rollback
    return { rolledBack: false, reason: 'Restart is idempotent' };
  }

  async scaleUp(context) {
    this.log(`Scaling up: ${context.target?.name}`, 'info');
    // In production: call cloud API to resize instance
    await this.sleep(3000);
    return { scaledUp: true, target: context.target?.name };
  }

  async scaleDown(context, snapshot) {
    this.log(`Scaling down: ${context.target?.name}`, 'info');
    await this.sleep(3000);
    return { scaledDown: true };
  }

  async scaleOut(context) {
    this.log(`Scaling out: ${context.target?.name}`, 'info');
    await this.sleep(5000);
    return { scaledOut: true, newInstances: 1 };
  }

  async scaleIn(context, snapshot) {
    this.log(`Scaling in: ${context.target?.name}`, 'info');
    await this.sleep(3000);
    return { scaledIn: true };
  }

  async rollbackDeployment(context) {
    this.log(`Rolling back deployment: ${context.target?.name}`, 'info');
    await this.sleep(10000);
    return { rolledBack: true };
  }

  async executeFailover(context) {
    this.log(`Executing failover for: ${context.target?.name}`, 'info');
    await this.sleep(15000);
    return { failedOver: true };
  }

  async failback(context, snapshot) {
    this.log(`Failing back: ${context.target?.name}`, 'info');
    await this.sleep(10000);
    return { failedBack: true };
  }

  async updateConfig(context) {
    this.log(`Updating config for: ${context.target?.name}`, 'info');
    await this.sleep(2000);
    return { configUpdated: true };
  }

  async revertConfig(context, snapshot) {
    this.log(`Reverting config for: ${context.target?.name}`, 'info');
    await this.sleep(2000);
    return { configReverted: true };
  }

  // Helper methods
  async takeSnapshot(target) {
    return {
      target,
      timestamp: new Date(),
      state: 'snapshot_placeholder',
    };
  }

  async performHealthCheck(target) {
    // Simulate health check
    await this.sleep(1000);
    return { healthy: true, checks: ['connectivity', 'response_time'] };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RecoveryAgent;