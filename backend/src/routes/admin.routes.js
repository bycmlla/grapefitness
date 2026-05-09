import { Router } from 'express';
import { getDashboard, listUsers } from '../controllers/adminController.js';
import {
  getOrder,
  listOrders,
  updateOrderStatus
} from '../controllers/orderController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireAdmin);

adminRoutes.get('/dashboard', getDashboard);
adminRoutes.get('/users', listUsers);
adminRoutes.get('/orders', listOrders);
adminRoutes.get('/orders/:id', getOrder);
adminRoutes.patch('/orders/:id/status', updateOrderStatus);

