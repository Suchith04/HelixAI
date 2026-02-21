import {Router} from 'express'
import * as companyController from '../controllers/companyController.js';
import { auth, requireRole } from '../middleware/auth.js';
import { validate, companyUpdateValidation, awsCredentialsValidation } from '../middleware/validation.js';

const companyRouter = Router();

companyRouter.use(auth);
companyRouter.get('/', companyController.getCompany);
companyRouter.put('/', requireRole('admin'), companyUpdateValidation, validate, companyController.updateCompany);
companyRouter.post('/aws-credentials', requireRole('admin'), awsCredentialsValidation, validate, companyController.setAwsCredentials);
companyRouter.put('/infrastructure', requireRole('admin'), companyController.updateInfrastructure);
companyRouter.put('/agent-settings', requireRole('admin'), companyController.updateAgentSettings);
companyRouter.post('/llm-key', requireRole('admin'), companyController.setLlmApiKey);

export default companyRouter;
