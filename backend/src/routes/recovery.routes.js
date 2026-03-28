import { Router } from 'express';
import * as recoveryController from '../controllers/recoveryController.js';
import { auth, requirePermission } from '../middleware/auth.js';

const recoveryRouter = Router();

recoveryRouter.use(auth);

// Read endpoints
recoveryRouter.get('/pending', recoveryController.getPendingActions);
recoveryRouter.get('/audit', recoveryController.getAuditTrail);
recoveryRouter.get('/aws-resources', recoveryController.getAwsResources);
recoveryRouter.get('/validate-creds', recoveryController.validateCreds);

// Action endpoints (require permission)
recoveryRouter.post('/:actionId/approve', requirePermission('manage_agents'), recoveryController.approveAction);
recoveryRouter.post('/:actionId/reject', requirePermission('manage_agents'), recoveryController.rejectAction);
recoveryRouter.post('/aws-metrics', recoveryController.getAwsMetrics);

export default recoveryRouter;
