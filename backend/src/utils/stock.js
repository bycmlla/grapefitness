import {
  Product,
  ProductVariation
} from '../models/index.js';

export const LOW_STOCK_THRESHOLD = 5;

export const getVariationQuantity = (variation) => {
  const value = variation?.quantity ?? variation?.stock ?? variation?.quantidade ?? 0;
  return Number(value) || 0;
};

export const getProductTotalStock = (product) => {
  const data = product?.toJSON ? product.toJSON() : product;
  const variations = data?.variations || [];

  if (variations.length) {
    return variations
      .filter((variation) => variation.active !== false)
      .reduce((total, variation) => total + getVariationQuantity(variation), 0);
  }

  return Number(data?.stock || 0);
};

export const getStockStatus = (totalStock, lowStockThreshold = LOW_STOCK_THRESHOLD) => {
  if (totalStock <= 0) {
    return 'out_of_stock';
  }

  if (totalStock <= lowStockThreshold) {
    return 'low_stock';
  }

  return 'available';
};

const serializeVariation = (variation) => {
  const data = variation?.toJSON ? variation.toJSON() : variation;
  const quantity = getVariationQuantity(data);

  return {
    ...data,
    quantity,
    stock: quantity
  };
};

export const serializeProductStock = (product, lowStockThreshold = LOW_STOCK_THRESHOLD) => {
  const data = product?.toJSON ? product.toJSON() : product;
  const variations = (data.variations || []).map(serializeVariation);
  const totalStock = getProductTotalStock({ ...data, variations });

  return {
    ...data,
    variations,
    stock: totalStock,
    totalStock,
    stockStatus: getStockStatus(totalStock, lowStockThreshold),
    lowStock: totalStock > 0 && totalStock <= lowStockThreshold,
    outOfStock: totalStock <= 0
  };
};

export const serializeProductsStock = (products, lowStockThreshold = LOW_STOCK_THRESHOLD) => (
  products.map((product) => serializeProductStock(product, lowStockThreshold))
);

export const sumProductVariationStock = async (productId, { transaction } = {}) => {
  const variations = await ProductVariation.findAll({
    where: {
      product_id: productId,
      active: true
    },
    attributes: ['id', 'quantity', 'active'],
    transaction
  });

  return variations.reduce((total, variation) => total + getVariationQuantity(variation), 0);
};

export const syncProductStockFromVariations = async (productId, { transaction } = {}) => {
  const totalStock = await sumProductVariationStock(productId, { transaction });

  await Product.update(
    { stock: totalStock },
    {
      where: { id: productId },
      transaction
    }
  );

  return totalStock;
};
