import { Address } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.findAll({
    where: { user_id: req.user.id },
    order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
  });

  res.json({ addresses });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await Address.create({
    ...req.body,
    user_id: req.user.id
  });

  res.status(201).json({ address });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    where: {
      id: req.params.id,
      user_id: req.user.id
    }
  });

  if (!address) {
    res.status(404).json({ message: 'Endereco nao encontrado.' });
    return;
  }

  await address.update(req.body);
  res.json({ address });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    where: {
      id: req.params.id,
      user_id: req.user.id
    }
  });

  if (!address) {
    res.status(404).json({ message: 'Endereco nao encontrado.' });
    return;
  }

  await address.destroy();
  res.status(204).send();
});

