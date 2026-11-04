import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSiteSettings } from '../utils/siteSettings.js';
import { resolveDelivery } from '../services/shippingService.js';

export const shippingRoutes = Router();
shippingRoutes.post(
  '/quote',
  authenticate,
  [
    body('items').isArray({ min: 1, max: 100 }),
    body('items.*.productId').isUUID(),
    body('items.*.variationId').optional({ nullable: true }).isUUID(),
    body('items.*.quantity').isInt({ min: 1, max: 1000 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    res.json(
      await resolveDelivery({
        zipCode: req.body.zipCode,
        items: req.body.items,
        settings: await getSiteSettings(),
        userId: req.user.id
      })
    );
  })
);
