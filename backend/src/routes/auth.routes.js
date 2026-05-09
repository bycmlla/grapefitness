import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  googleLoginPlaceholder,
  login,
  register
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Informe o nome.'),
    body('email').isEmail().withMessage('Informe um e-mail valido.'),
    body('password').isLength({ min: 6 }).withMessage('A senha precisa ter ao menos 6 caracteres.')
  ],
  validate,
  register
);

authRoutes.post(
  '/login',
  [
    body('email').isEmail().withMessage('Informe um e-mail valido.'),
    body('password').notEmpty().withMessage('Informe a senha.')
  ],
  validate,
  login
);

authRoutes.get('/me', authenticate, getProfile);
authRoutes.post('/google', googleLoginPlaceholder);

