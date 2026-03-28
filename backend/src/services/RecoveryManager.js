import { PendingAction } from '../models/index.js';
import { publishEvent } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';
import * as awsCloudService from './awsCloudService.js';
import logger from '../utils/logger.js';

/**
 * RecoveryManager - Decision engine for automated recovery with HITL
 *
 * Flow:
 *   Low Risk  → dry-run → execute → audit
 *   High Risk → PendingAction → WebSocket alert → await approval
 *   Approved  → execute → audit
 *   Rejected  → mark rejected → audit
 */
class RecoveryManager {

  /**
   * Process an action intent from an agent
   * @param {Object} params
   * @param {string} params.companyId
   * @param {Object} params.credentials   - decrypted AWS credentials
   * @param {string} params.agentName
   * @param {Object} params.analysis      - LLM root cause analysis
   * @param {Object} params.recommendedAction - { type, target, params }
   * @param {string} params.riskLevel     - "Low" | "High"
   * @param {string} params.reasoning     - LLM explanation
   * @returns {Promise<Object>}
   */
  static async processAction({ companyId, credentials, agentName, analysis, recommendedAction, riskLevel, reasoning }) {
    const actionId = `ACT-${Date.now()}-${uuidv4().slice(0, 8)}`;
    logger.info(`[RecoveryManager] Processing ${riskLevel} risk action: ${actionId} (${recommendedAction?.type})`);

    // Always attempt dry-run first
    let dryRunResult = null;
    try {
      dryRunResult = await RecoveryManager.executeAwsAction(credentials, recommendedAction, true);
    } catch (err) {
      logger.warn(`[RecoveryManager] Dry-run failed: ${err.message}`);
      dryRunResult = { success: false, error: err.message };
    }

    if (riskLevel === 'Low') {
      // ── Low Risk: auto-execute ─────────────────────────────────────────
      const action = await PendingAction.create({
        company: companyId, actionId, agentName, analysis, recommendedAction, riskLevel,
        reasoning, status: 'executing', dryRunResult,
        executionLogs: [
          { message: `Dry-run completed: ${dryRunResult?.success ? 'OK' : 'FAILED'}`, level: 'info' },
          { message: 'Auto-executing low-risk action...', level: 'info' },
        ],
      });

      try {
        const execResult = await RecoveryManager.executeAwsAction(credentials, recommendedAction, false);
        action.status = 'completed';
        action.executionResult = execResult;
        action.executionLogs.push({ message: `Execution completed successfully`, level: 'success', timestamp: new Date() });
        await action.save();

        // Emit real-time event
        await publishEvent('recovery:executed', { companyId, actionId, agentName, riskLevel, status: 'completed', result: execResult });
        logger.info(`[RecoveryManager] Low-risk action ${actionId} completed`);
        return { status: 'completed', actionId, result: execResult };
      } catch (err) {
        action.status = 'failed';
        action.executionResult = { error: err.message };
        action.executionLogs.push({ message: `Execution failed: ${err.message}`, level: 'error', timestamp: new Date() });
        await action.save();
        await publishEvent('recovery:executed', { companyId, actionId, agentName, riskLevel, status: 'failed', error: err.message });
        return { status: 'failed', actionId, error: err.message };
      }
    } else {
      // ── High Risk: create pending action → await human approval ────────
      const action = await PendingAction.create({
        company: companyId, actionId, agentName, analysis, recommendedAction, riskLevel,
        reasoning, status: 'pending', dryRunResult,
        executionLogs: [
          { message: `Dry-run completed: ${dryRunResult?.success ? 'OK' : 'FAILED'}`, level: 'info' },
          { message: 'Awaiting human approval for high-risk action', level: 'warn' },
        ],
      });

      // Emit real-time WebSocket alert
      await publishEvent('recovery:pending', {
        companyId, actionId, agentName, riskLevel,
        actionType: recommendedAction?.type,
        target: recommendedAction?.target,
        reasoning, dryRunResult,
      });

      logger.info(`[RecoveryManager] High-risk action ${actionId} pending approval`);
      return { status: 'pending_approval', actionId, action: action.toObject() };
    }
  }

  /**
   * Approve a pending action and execute it
   */
  static async approveAction(actionId, userId, credentials) {
    const action = await PendingAction.findOne({ actionId, status: 'pending' });
    if (!action) throw new Error(`Action ${actionId} not found or not pending`);

    action.status = 'executing';
    action.approvedBy = userId;
    action.approvedAt = new Date();
    action.executionLogs.push({ message: `Approved by user ${userId}`, level: 'info', timestamp: new Date() });
    await action.save();

    await publishEvent('recovery:approved', { companyId: action.company, actionId, approvedBy: userId });

    try {
      const execResult = await RecoveryManager.executeAwsAction(credentials, action.recommendedAction, false);
      action.status = 'completed';
      action.executionResult = execResult;
      action.executionLogs.push({ message: 'Execution completed successfully', level: 'success', timestamp: new Date() });
      await action.save();

      await publishEvent('recovery:executed', {
        companyId: action.company, actionId, agentName: action.agentName,
        riskLevel: action.riskLevel, status: 'completed', result: execResult,
      });

      return { status: 'completed', result: execResult };
    } catch (err) {
      action.status = 'failed';
      action.executionResult = { error: err.message };
      action.executionLogs.push({ message: `Execution failed: ${err.message}`, level: 'error', timestamp: new Date() });
      await action.save();

      await publishEvent('recovery:executed', {
        companyId: action.company, actionId, agentName: action.agentName,
        riskLevel: action.riskLevel, status: 'failed', error: err.message,
      });

      throw err;
    }
  }

  /**
   * Reject a pending action
   */
  static async rejectAction(actionId, userId, reason = '') {
    const action = await PendingAction.findOne({ actionId, status: 'pending' });
    if (!action) throw new Error(`Action ${actionId} not found or not pending`);

    action.status = 'rejected';
    action.rejectedBy = userId;
    action.rejectedAt = new Date();
    action.rejectionReason = reason;
    action.executionLogs.push({ message: `Rejected by user: ${reason || 'No reason provided'}`, level: 'warn', timestamp: new Date() });
    await action.save();

    await publishEvent('recovery:executed', {
      companyId: action.company, actionId, agentName: action.agentName,
      riskLevel: action.riskLevel, status: 'rejected',
    });

    return { status: 'rejected', actionId };
  }

  /**
   * Execute an AWS action (centralized dispatcher)
   */
  static async executeAwsAction(credentials, recommendedAction, dryRun = true) {
    const { type, target, params } = recommendedAction || {};
    if (!credentials) throw new Error('No AWS credentials available');
    if (!type) throw new Error('No action type specified');

    const resourceId = target?.resourceId;

    switch (type) {
      case 'reboot_instance':
        return await awsCloudService.rebootEC2Instance(credentials, resourceId, dryRun);
      case 'stop_instance':
        return await awsCloudService.stopEC2Instance(credentials, resourceId, dryRun);
      case 'start_instance':
        return await awsCloudService.startEC2Instance(credentials, resourceId, dryRun);
      case 'invoke_lambda':
        return await awsCloudService.invokeLambda(credentials, resourceId, params?.payload || {}, dryRun);
      case 'reboot_rds':
        return await awsCloudService.rebootRDSInstance(credentials, resourceId, dryRun);
      default:
        logger.warn(`[RecoveryManager] Unknown action type: ${type}`);
        return { success: false, error: `Unknown action type: ${type}`, dryRun };
    }
  }

  /**
   * Get all pending actions for a company
   */
  static async getPendingActions(companyId) {
    return PendingAction.find({ company: companyId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get full audit trail for a company
   */
  static async getAuditTrail(companyId, { limit = 50, status } = {}) {
    const filter = { company: companyId };
    if (status) filter.status = status;
    return PendingAction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')
      .lean();
  }
}

export default RecoveryManager;
