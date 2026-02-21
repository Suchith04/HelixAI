import {Router} from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { auth } from '../middleware/auth.js';

const dashRouter = Router();
dashRouter.use(auth);
dashRouter.get('/overview', dashboardController.getOverview);
dashRouter.get('/metrics', dashboardController.getMetrics);
dashRouter.get('/agent-performance', dashboardController.getAgentPerformance);
dashRouter.get('/cost', dashboardController.getCostOverview);

export default dashRouter;
