import {
  Cart,
  CartItem,
  Product,
  ProductImage,
  ProductVariation
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSiteSettings } from '../utils/siteSettings.js';
import { getVariationQuantity } from '../utils/stock.js';

const includeItems = [
  {
    model: CartItem,
    as: 'items',
    include: [
      { model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] },
      { model: ProductVariation, as: 'variation' }
    ]
  }
];

const getCartFilter = (req) => {
  if (req.user) {
    return { user_id: req.user.id, status: 'active' };
  }

  const sessionId = req.headers['x-cart-session'] || req.body.sessionId || req.query.sessionId;

  if (!sessionId) {
    const error = new Error('Informe x-cart-session para carrinhos anonimos.');
    error.status = 400;
    throw error;
  }

  return { sessionId, status: 'active' };
};

const getOrCreateCart = async (req) => {
  const where = getCartFilter(req);
  const [cart] = await Cart.findOrCreate({ where, defaults: where });
  return cart;
};

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req);
  const hydratedCart = await Cart.findByPk(cart.id, { include: includeItems });
  res.json({ cart: hydratedCart });
});

export const addCartItem = asyncHandler(async (req, res) => {
  const { productId, variationId, quantity = 1 } = req.body;
  const requestedQuantity = Number(quantity);
  const settings = await getSiteSettings();
  const cart = await getOrCreateCart(req);
  const product = await Product.findByPk(productId);

  if (!product || !product.active) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  const activeVariationCount = await ProductVariation.count({
    where: { product_id: product.id, active: true }
  });
  const variation = variationId
    ? await ProductVariation.findOne({
      where: {
        id: variationId,
        product_id: product.id,
        active: true
      }
    })
    : null;

  if (activeVariationCount > 0 && !variation) {
    res.status(422).json({ message: 'Escolha uma variacao disponivel do produto.' });
    return;
  }

  if (variationId && !variation) {
    res.status(422).json({ message: 'Variacao invalida para este produto.' });
    return;
  }

  const availableStock = variation ? getVariationQuantity(variation) : Number(product.stock || 0);
  const unitPrice = Number(variation?.price || product.salePrice || product.price);
  const existingItem = await CartItem.findOne({
    where: {
      cart_id: cart.id,
      product_id: product.id,
      variation_id: variation?.id || null
    }
  });
  const quantityInCart = Number(existingItem?.quantity || 0);

  if (!settings.allowOutOfStockPurchase && availableStock < quantityInCart + requestedQuantity) {
    res.status(409).json({ message: `Estoque insuficiente para ${product.name}.` });
    return;
  }

  if (existingItem) {
    await existingItem.update({ quantity: existingItem.quantity + requestedQuantity });
  } else {
    await CartItem.create({
      cart_id: cart.id,
      product_id: product.id,
      variation_id: variation?.id || null,
      quantity: requestedQuantity,
      unitPrice
    });
  }

  const hydratedCart = await Cart.findByPk(cart.id, { include: includeItems });
  res.status(201).json({ cart: hydratedCart });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const item = await CartItem.findByPk(req.params.itemId, {
    include: [
      { model: Product, as: 'product' },
      { model: ProductVariation, as: 'variation' }
    ]
  });
  const settings = await getSiteSettings();

  if (!item) {
    res.status(404).json({ message: 'Item do carrinho nao encontrado.' });
    return;
  }

  const quantity = Number(req.body.quantity);
  const availableStock = item.variation
    ? getVariationQuantity(item.variation)
    : Number(item.product?.stock || 0);

  if (!settings.allowOutOfStockPurchase && availableStock < quantity) {
    res.status(409).json({ message: `Estoque insuficiente para ${item.product?.name || 'este produto'}.` });
    return;
  }

  await item.update({ quantity });
  const cart = await Cart.findByPk(item.cart_id, { include: includeItems });
  res.json({ cart });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const item = await CartItem.findByPk(req.params.itemId);

  if (!item) {
    res.status(404).json({ message: 'Item do carrinho nao encontrado.' });
    return;
  }

  const cartId = item.cart_id;
  await item.destroy();
  const cart = await Cart.findByPk(cartId, { include: includeItems });
  res.json({ cart });
});
