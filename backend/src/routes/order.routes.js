import { Router } from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  confirmOrderFreight,
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
    body('items').isArray({ min: 1, max: 100 }).withMessage('O pedido precisa ter itens.'),
    body('items.*.productId').isUUID().withMessage('Produto inválido.'),
    body('items.*.variationId').optional({ nullable: true }).isUUID().withMessage('Variação inválida.'),
    body('items.*.quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantidade inválida.')
  ],
  validate,
  createOrder
);

orderRoutes.get('/me', authenticate, listMyOrders);
orderRoutes.get('/me/:id', authenticate, getMyOrder);
orderRoutes.post('/me/:id/confirm-freight', authenticate, confirmOrderFreight);
