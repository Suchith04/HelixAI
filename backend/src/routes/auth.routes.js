import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import {auth} from '../middleware/auth.js';
import { validate, registerValidation, loginValidation } from '../middleware/validation.js';

const authRouter = Router();

authRouter.post('/register', registerValidation, validate, authController.register);
authRouter.post('/login', loginValidation, validate, authController.login);
authRouter.get('/me', auth, authController.getMe);
authRouter.put('/password', auth, authController.updatePassword);

export default authRouter;
