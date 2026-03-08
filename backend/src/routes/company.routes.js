import {Router} from 'express'
import * as companyController from '../controllers/companyController.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate, companyUpdateValidation, awsCredentialsValidation } from '../middleware/validation.js';

const companyRouter = Router();

companyRouter.use(auth);
companyRouter.get('/', companyController.getCompany);
companyRouter.put('/', requireRole('admin'), companyUpdateValidation, validate, companyController.updateCompany);

// AWS credentials
companyRouter.post('/aws-credentials', requireRole('admin'), awsCredentialsValidation, validate, companyController.setAwsCredentials);
companyRouter.get('/aws-credentials', companyController.getAwsCredentialsMasked);
companyRouter.post('/aws-credentials/decrypt', requireRole('admin'), companyController.decryptAwsCredentials);

// Infrastructure & Agent settings
companyRouter.put('/infrastructure', requireRole('admin'), companyController.updateInfrastructure);
companyRouter.put('/agent-settings', requireRole('admin'), companyController.updateAgentSettings);

// LLM key (legacy)
companyRouter.post('/llm-key', requireRole('admin'), companyController.setLlmApiKey);

// LLM configurations (multiple saved configs)
companyRouter.get('/llm-configs', companyController.getLlmConfigs);
companyRouter.post('/llm-configs', requireRole('admin'), companyController.saveLlmConfig);
companyRouter.put('/llm-configs/active', requireRole('admin'), companyController.setActiveLlmConfig);
companyRouter.delete('/llm-configs/:index', requireRole('admin'), companyController.deleteLlmConfig);

export default companyRouter;
