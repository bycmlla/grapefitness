import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress
} from '../controllers/addressController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const addressRoutes = Router();

addressRoutes.use(authenticate);
addressRoutes.get('/', listAddresses);

addressRoutes.post(
  '/',
  [
    body('zipCode').notEmpty().withMessage('Informe o CEP.'),
    body('street').notEmpty().withMessage('Informe a rua.'),
    body('number').notEmpty().withMessage('Informe o numero.'),
    body('district').notEmpty().withMessage('Informe o bairro.'),
    body('city').notEmpty().withMessage('Informe a cidade.'),
    body('state').isLength({ min: 2, max: 2 }).withMessage('Informe a UF.')
  ],
  validate,
  createAddress
);

addressRoutes.put('/:id', updateAddress);
addressRoutes.delete('/:id', deleteAddress);

