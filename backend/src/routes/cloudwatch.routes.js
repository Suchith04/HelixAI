import { Router } from 'express';
import * as cloudwatchController from '../controllers/cloudwatchController.js';
import { auth } from '../middleware/auth.js';

const cloudwatchRouter = Router();

cloudwatchRouter.use(auth);

// List all CloudWatch log groups
cloudwatchRouter.get('/log-groups', cloudwatchController.getLogGroups);

// Fetch + filter + group logs from a log group
cloudwatchRouter.post('/logs', cloudwatchController.getLogs);

// Fetch + filter + analyze logs via LogIntelligenceAgent
cloudwatchRouter.post('/analyze', cloudwatchController.analyzeLogs);

export default cloudwatchRouter;
