import { Router } from 'express';
import * as workflowController from '../controllers/workflowController.js';
import { auth, requirePermission } from '../middleware/auth.js';
import { validate, workflowValidation, mongoIdValidation } from '../middleware/validation.js';

const workflowRoutes = Router();

workflowRoutes.use(auth);
workflowRoutes.get('/', workflowController.getWorkflows);
workflowRoutes.post('/', requirePermission('execute_workflows'), workflowValidation, validate, workflowController.createWorkflow);
workflowRoutes.get('/executions', workflowController.getExecutions);
workflowRoutes.get('/executions/:id', mongoIdValidation, validate, workflowController.getExecution);
workflowRoutes.get('/:id', mongoIdValidation, validate, workflowController.getWorkflow);
workflowRoutes.put('/:id', requirePermission('execute_workflows'), workflowController.updateWorkflow);
workflowRoutes.delete('/:id', requirePermission('execute_workflows'), workflowController.deleteWorkflow);
workflowRoutes.post('/:id/execute', requirePermission('execute_workflows'), workflowController.executeWorkflow);

export default workflowRoutes;