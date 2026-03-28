import { Router } from 'express';
import * as agentController from '../controllers/agentController.js';
import { auth, requirePermission } from '../middleware/auth.js';

const agentRouter = Router();

agentRouter.use(auth);
agentRouter.get('/', agentController.getAgents);
agentRouter.get('/states', agentController.getAgentStates);
agentRouter.get('/history', agentController.getAgentHistory);
agentRouter.post('/initialize', requirePermission('manage_agents'), agentController.initializeAgents);
agentRouter.get('/:id', agentController.getAgent);
agentRouter.put('/:id', requirePermission('manage_agents'), agentController.updateAgent);
agentRouter.post('/trigger', requirePermission('execute_workflows'), agentController.triggerAgent);

export default agentRouter;