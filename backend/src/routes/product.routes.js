import { Router } from 'express';
import { body } from 'express-validator';
import {
  createProduct,
  deactivateProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from '../controllers/productController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middlewares/auth.js';
import { uploadProductImages } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';

export const productRoutes = Router();

productRoutes.get('/', optionalAuthenticate, listProducts);
productRoutes.get('/:identifier', getProduct);

productRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  uploadProductImages,
  [
    body('name').trim().notEmpty().withMessage('Informe o nome do produto.'),
    body('sku').trim().notEmpty().withMessage('Informe o SKU.'),
    body('price').isFloat({ gt: 0 }).withMessage('Informe um preco valido.')
  ],
  validate,
  createProduct
);

productRoutes.put('/:id', authenticate, requireAdmin, uploadProductImages, updateProduct);
productRoutes.patch('/:id/deactivate', authenticate, requireAdmin, deactivateProduct);
productRoutes.delete('/:id', authenticate, requireAdmin, deleteProduct);
