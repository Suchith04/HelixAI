import { Router } from 'express';
import * as incidentController from '../controllers/incidentController.js';
import { auth } from '../middleware/auth.js';
import { validate, mongoIdValidation } from '../middleware/validation.js';

const incidentRoutes = Router();

incidentRoutes.use(auth);
incidentRoutes.get('/', incidentController.getIncidents);
incidentRoutes.get('/stats', incidentController.getIncidentStats);
incidentRoutes.get('/:id', mongoIdValidation, validate, incidentController.getIncident);
incidentRoutes.get('/:id/details', mongoIdValidation, validate, incidentController.getIncidentDetails);
incidentRoutes.put('/:id', mongoIdValidation, validate, incidentController.updateIncident);

export default incidentRoutes;