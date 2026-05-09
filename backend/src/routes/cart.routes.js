import { Router } from 'express';
import { body } from 'express-validator';
import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem
} from '../controllers/cartController.js';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const cartRoutes = Router();

cartRoutes.get('/', optionalAuthenticate, getCart);

cartRoutes.post(
  '/items',
  optionalAuthenticate,
  [
    body('productId').notEmpty().withMessage('Informe o produto.'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantidade invalida.')
  ],
  validate,
  addCartItem
);

cartRoutes.patch(
  '/items/:itemId',
  optionalAuthenticate,
  [body('quantity').isInt({ min: 1 }).withMessage('Quantidade invalida.')],
  validate,
  updateCartItem
);

cartRoutes.delete('/items/:itemId', optionalAuthenticate, removeCartItem);

