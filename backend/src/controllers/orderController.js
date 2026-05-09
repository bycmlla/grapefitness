import {
  Address,
  Order,
  OrderItem,
  Payment,
  PickupStore,
  Product,
  ProductVariation,
  User,
  sequelize
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createOrderNumber } from '../utils/orderNumber.js';
import { getSiteSettings } from '../utils/siteSettings.js';
import {
  getVariationQuantity,
  syncProductStockFromVariations
} from '../utils/stock.js';

const orderInclude = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
  {
    model: OrderItem,
    as: 'items',
    include: [
      { model: Product, as: 'product' },
      { model: ProductVariation, as: 'variation' }
    ]
  },
  { model: Payment, as: 'payment' },
  { model: Address, as: 'address' },
  { model: PickupStore, as: 'pickupStore' }
];

const getUnitPrice = (product, variation) =>
  Number(variation?.price || product.salePrice || product.price);

const restoreOrderStock = async (order, transaction) => {
  const items = order.items || (await OrderItem.findAll({
    where: { order_id: order.id },
    transaction
  }));
  const variationProductIds = new Set();

  for (const item of items) {
    const quantity = Number(item.quantity);
    const variationId = item.variation_id || item.variation?.id;

    if (variationId) {
      const variation = await ProductVariation.findByPk(variationId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (variation) {
        await variation.increment('quantity', { by: quantity, transaction });
        variationProductIds.add(variation.product_id || item.product_id);
        continue;
      }
    }

    if (item.product_id) {
      await Product.increment('stock', {
        by: quantity,
        where: { id: item.product_id },
        transaction
      });
    }
  }

  for (const productId of variationProductIds) {
    if (productId) {
      await syncProductStockFromVariations(productId, { transaction });
    }
  }
};

export const createOrder = asyncHandler(async (req, res) => {
  const {
    items = [],
    fulfillmentType,
    addressId,
    address,
    pickupStoreId,
    paymentMethod = 'pix',
    couponCode
  } = req.body;

  if (!items.length) {
    res.status(400).json({ message: 'Adicione produtos antes de finalizar o pedido.' });
    return;
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const settings = await getSiteSettings();
    let orderAddressId = addressId || null;
    let orderPickupStoreId = pickupStoreId || null;

    if (fulfillmentType === 'delivery' && !orderAddressId && address) {
      const createdAddress = await Address.create({
        ...address,
        user_id: req.user.id
      }, { transaction });
      orderAddressId = createdAddress.id;
    }

    if (fulfillmentType === 'pickup') {
      const pickupStore = await PickupStore.findByPk(orderPickupStoreId, { transaction });

      if (!pickupStore || !pickupStore.active) {
        const error = new Error('Loja de retirada invalida.');
        error.status = 422;
        throw error;
      }
    }

    const orderItems = [];
    const variationProductIds = new Set();
    let subtotal = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = await Product.findByPk(item.productId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const variation = item.variationId
        ? await ProductVariation.findOne({
          where: {
            id: item.variationId,
            product_id: item.productId,
            active: true
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        })
        : null;

      if (!product || !product.active || quantity < 1 || !Number.isInteger(quantity)) {
        const error = new Error('Produto invalido no pedido.');
        error.status = 422;
        throw error;
      }

      const activeVariationCount = await ProductVariation.count({
        where: {
          product_id: product.id,
          active: true
        },
        transaction
      });

      if (activeVariationCount > 0 && !variation) {
        const error = new Error(`Escolha cor e tamanho para ${product.name}.`);
        error.status = 422;
        throw error;
      }

      if (item.variationId && !variation) {
        const error = new Error(`Variacao invalida para ${product.name}.`);
        error.status = 422;
        throw error;
      }

      const availableStock = variation ? getVariationQuantity(variation) : Number(product.stock || 0);

      if (!settings.allowOutOfStockPurchase && availableStock < quantity) {
        const error = new Error(`Estoque insuficiente para ${product.name}.`);
        error.status = 409;
        throw error;
      }

      const unitPrice = getUnitPrice(product, variation);
      const total = unitPrice * quantity;
      subtotal += total;

      orderItems.push({
        product_id: product.id,
        variation_id: variation?.id || null,
        productName: product.name,
        sku: variation?.sku || product.sku,
        variationColor: variation?.color || null,
        variationSize: variation?.size || null,
        quantity,
        unitPrice,
        total
      });

      if (variation) {
        await variation.update({ quantity: availableStock - quantity }, { transaction });
        variationProductIds.add(product.id);
      } else {
        await product.update({ stock: availableStock - quantity }, { transaction });
      }
    }

    for (const productId of variationProductIds) {
      await syncProductStockFromVariations(productId, { transaction });
    }

    const discountTotal = 0;
    const shippingTotal = fulfillmentType === 'delivery' ? 0 : 0;
    const total = subtotal - discountTotal + shippingTotal;

    const order = await Order.create({
      user_id: req.user.id,
      address_id: orderAddressId,
      pickup_store_id: orderPickupStoreId,
      orderNumber: createOrderNumber(),
      fulfillmentType,
      subtotal,
      discountTotal,
      shippingTotal,
      total,
      couponCode
    }, { transaction });

    await OrderItem.bulkCreate(
      orderItems.map((item) => ({
        ...item,
        order_id: order.id
      })),
      { transaction }
    );

    await Payment.create({
      order_id: order.id,
      method: paymentMethod,
      provider: 'manual_placeholder',
      status: 'pending',
      total,
      metadata: {
        preparedFor: ['mercado_pago', 'pagseguro', 'pagarme', 'stripe', 'asaas']
      }
    }, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const createdOrder = await Order.findByPk(order.id, { include: orderInclude });
    res.status(201).json({ order: createdOrder });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
    }
    throw error;
  }
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { user_id: req.user.id },
    include: orderInclude,
    order: [['createdAt', 'DESC']]
  });

  res.json({ orders });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: {
      id: req.params.id,
      user_id: req.user.id
    },
    include: orderInclude
  });

  if (!order) {
    res.status(404).json({ message: 'Pedido nao encontrado.' });
    return;
  }

  res.json({ order });
});

export const listOrders = asyncHandler(async (req, res) => {
  const where = {};

  if (req.query.status) {
    where.status = req.query.status;
  }

  if (req.query.userId) {
    where.user_id = req.query.userId;
  }

  const orders = await Order.findAll({
    where,
    include: orderInclude,
    order: [['createdAt', 'DESC']]
  });

  res.json({ orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: orderInclude });

  if (!order) {
    res.status(404).json({ message: 'Pedido nao encontrado.' });
    return;
  }

  res.json({ order });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Payment, as: 'payment' },
        { model: OrderItem, as: 'items' }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!order) {
      await transaction.rollback();
      transactionFinished = true;
      res.status(404).json({ message: 'Pedido nao encontrado.' });
      return;
    }

    const previousStatus = order.status;

    if (req.body.status === 'cancelado' && previousStatus !== 'cancelado') {
      await restoreOrderStock(order, transaction);
    }

    await order.update({ status: req.body.status }, { transaction });

    if (req.body.status === 'pagamento_aprovado' && order.payment?.status !== 'approved') {
      await order.payment.update({
        status: 'approved',
        paidAt: new Date()
      }, { transaction });
    }

    await transaction.commit();
    transactionFinished = true;

    const updatedOrder = await Order.findByPk(order.id, { include: orderInclude });
    res.json({ order: updatedOrder });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
    }
    throw error;
  }
});
