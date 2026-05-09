import { Router } from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  getMyOrder,
  listMyOrders
} from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const orderRoutes = Router();

orderRoutes.post(
  '/',
  authenticate,
  [
    body('fulfillmentType').isIn(['delivery', 'pickup']).withMessage('Escolha entrega ou retirada.'),
    body('paymentMethod').isIn(['pix', 'credit_card', 'debit_card', 'boleto', 'pickup_payment']).withMessage('Forma de pagamento invalida.'),
    body('items').isArray({ min: 1 }).withMessage('O pedido precisa ter itens.')
  ],
  validate,
  createOrder
);

orderRoutes.get('/me', authenticate, listMyOrders);
orderRoutes.get('/me/:id', authenticate, getMyOrder);

