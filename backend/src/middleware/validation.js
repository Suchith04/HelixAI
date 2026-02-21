import { body, param, validationResult } from 'express-validator';

// Validation middleware
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Common validations
export const registerValidation = [
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const companyUpdateValidation = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('industry').optional().isIn(['technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'other']),
];

export const awsCredentialsValidation = [
  body('accessKeyId').notEmpty().withMessage('Access Key ID is required'),
  body('secretAccessKey').notEmpty().withMessage('Secret Access Key is required'),
  body('region').optional().isString(),
];

export const workflowValidation = [
  body('name').trim().notEmpty().withMessage('Workflow name is required'),
  body('steps').isArray({ min: 1 }).withMessage('At least one step is required'),
  body('steps.*.agent').notEmpty().withMessage('Agent is required for each step'),
  body('steps.*.action').notEmpty().withMessage('Action is required for each step'),
];

export const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];
