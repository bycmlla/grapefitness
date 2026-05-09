import { PickupStore } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPickupStores = asyncHandler(async (req, res) => {
  const stores = await PickupStore.findAll({
    where: { active: true },
    order: [['name', 'ASC']]
  });

  res.json({ stores });
});

