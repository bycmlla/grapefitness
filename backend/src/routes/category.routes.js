import { Router } from 'express';
import { body } from 'express-validator';
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  getCategory,
  listCategories,
  listHomeCategories,
  updateCategory
} from '../controllers/categoryController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const categoryRoutes = Router();

categoryRoutes.get('/', optionalAuthenticate, listCategories);
categoryRoutes.get('/home', listHomeCategories);
categoryRoutes.get('/:slug', getCategory);

categoryRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  [body('name').trim().notEmpty().withMessage('Informe o nome da categoria.')],
  validate,
  createCategory
);

categoryRoutes.put('/:id', authenticate, requireAdmin, updateCategory);
categoryRoutes.patch('/:id/deactivate', authenticate, requireAdmin, deactivateCategory);
categoryRoutes.delete('/:id', authenticate, requireAdmin, deleteCategory);

