import { Router } from 'express';
import { listPickupStores } from '../controllers/pickupStoreController.js';

export const pickupStoreRoutes = Router();

pickupStoreRoutes.get('/', listPickupStores);

