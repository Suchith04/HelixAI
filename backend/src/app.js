import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { 
  authRouter, 
  companyRouter, 
  agentRouter, 
  workflowRouter, 
  incidentRouter,
  dashboardRouter,
  cloudwatchRouter,
  recoveryRouter,
} from './routes/index.js';
const app = express();

// security middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

// req parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// logging
app.use(morgan('dev', { stream: logger.stream }));

// health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// routes
app.use('/api/auth',authRouter);
app.use('/api/company',companyRouter);
app.use('/api/agents',agentRouter);
app.use('/api/workflows', workflowRouter);
app.use('/api/incidents', incidentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/cloudwatch', cloudwatchRouter);
app.use('/api/recovery', recoveryRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorHandler);

export default app;
