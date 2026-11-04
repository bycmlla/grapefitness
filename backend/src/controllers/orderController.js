import { randomUUID } from 'node:crypto';
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
  checkoutError,
  freightAmount,
  normalizeAddress,
  normalizeCity,
  normalizeContact,
  orderStatuses,
  paymentMethods
} from '../utils/checkoutValidation.js';
import { resolveDelivery } from '../services/shippingService.js';
import { publicUser } from '../utils/publicUser.js';
import { getVariationQuantity, syncProductStockFromVariations } from '../utils/stock.js';

const orderInclude = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
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

const createPendingPayment = (order, method, transaction) =>
  Payment.create(
    {
      order_id: order.id,
      method,
      provider: 'manual_placeholder',
      status: 'pending',
      total: order.total,
      metadata: { preparedFor: ['mercado_pago', 'pagseguro', 'pagarme', 'stripe', 'asaas'] }
    },
    { transaction }
  );

const restoreOrderStock = async (order, transaction) => {
  const items =
    order.items ||
    (await OrderItem.findAll({
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

  if (paymentMethod === 'pickup_payment' && fulfillmentType !== 'pickup')
    throw checkoutError('Pagamento na retirada exige retirada na loja.');
  const contact = normalizeContact(req.body.contact, req.user);
  const settings = await getSiteSettings();
  let deliveryAddress = null;
  let shipping = { mode: 'pickup', status: 'quoted', amount: 0, service: 'Retirada na loja' };
  let ownedAddress = null;
  if (fulfillmentType === 'delivery') {
    if (addressId) {
      ownedAddress = await Address.findOne({ where: { id: addressId, user_id: req.user.id } });
      if (!ownedAddress) throw checkoutError('Endereço não encontrado.', 404);
    }
    deliveryAddress = normalizeAddress(ownedAddress ? ownedAddress.toJSON() : address);
    const resolved = await resolveDelivery({
      zipCode: deliveryAddress.zipCode,
      items,
      settings,
      userId: req.user.id,
      quoteToken: req.body.shippingQuoteToken,
      forOrder: true
    });
    shipping = resolved.shipping;
    // Uma cidade corrigida manualmente exige conferência da loja antes de definir o frete.
    if (
      normalizeCity(deliveryAddress.city) !== normalizeCity(resolved.address.city) ||
      deliveryAddress.state !== resolved.address.state
    ) {
      shipping = { mode: 'regional', status: 'pending', amount: null, service: null };
    }
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    let orderAddressId = ownedAddress?.id || null;
    const orderPickupStoreId = fulfillmentType === 'pickup' ? pickupStoreId || null : null;

    if (fulfillmentType === 'delivery' && !orderAddressId) {
      const createdAddress = await Address.create(
        {
          ...deliveryAddress,
          user_id: req.user.id
        },
        { transaction }
      );
      orderAddressId = createdAddress.id;
    }

    await req.user.update(contact, { transaction });

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

      const availableStock = variation
        ? getVariationQuantity(variation)
        : Number(product.stock || 0);

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
    const awaitingFreight = shipping.status === 'pending';
    const shippingTotal = shipping.amount ?? 0;
    const total = subtotal - discountTotal + shippingTotal;

    const order = await Order.create(
      {
        user_id: req.user.id,
        address_id: orderAddressId,
        pickup_store_id: orderPickupStoreId,
        orderNumber: createOrderNumber(),
        fulfillmentType,
        status: awaitingFreight ? 'aguardando_definicao_frete' : 'aguardando_pagamento',
        addressSnapshot: deliveryAddress,
        contactSnapshot: contact,
        shippingMode: shipping.mode,
        shippingStatus: awaitingFreight ? 'pending' : 'confirmed',
        shippingDetails: { service: shipping.service, deliveryDays: shipping.deliveryDays || null },
        shippingConfirmedAt: awaitingFreight ? null : new Date(),
        preferredPaymentMethod: paymentMethod,
        subtotal,
        discountTotal,
        shippingTotal,
        total,
        couponCode
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      orderItems.map((item) => ({
        ...item,
        order_id: order.id
      })),
      { transaction }
    );

    if (!awaitingFreight) await createPendingPayment(order, paymentMethod, transaction);

    await transaction.commit();
    transactionFinished = true;

    const createdOrder = await Order.findByPk(order.id, { include: orderInclude });
    res.status(201).json({ order: createdOrder, user: publicUser(req.user) });
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
  if (!orderStatuses.includes(req.body.status)) throw checkoutError('Status de pedido inválido.');
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

    if (['aguardando_definicao_frete', 'aguardando_confirmacao_frete'].includes(req.body.status)) {
      throw checkoutError('Use a definição de frete para alterar esta etapa.');
    }
    if (order.shippingStatus !== 'confirmed' && req.body.status !== 'cancelado') {
      throw checkoutError(
        'A cliente precisa confirmar o frete e o total antes de prosseguir.',
        409
      );
    }
    if (
      ['cancelado', 'reembolsado'].includes(previousStatus) &&
      req.body.status !== previousStatus
    ) {
      throw checkoutError('Este pedido já foi encerrado.', 409);
    }
    if (req.body.status === 'pagamento_aprovado' && !order.payment)
      throw checkoutError('O pagamento deste pedido ainda não foi liberado.', 409);

    if (req.body.status === 'cancelado' && previousStatus !== 'cancelado') {
      await restoreOrderStock(order, transaction);
    }

    await order.update({ status: req.body.status }, { transaction });

    if (req.body.status === 'pagamento_aprovado' && order.payment?.status !== 'approved') {
      await order.payment.update(
        {
          status: 'approved',
          paidAt: new Date()
        },
        { transaction }
      );
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

export const setOrderFreight = asyncHandler(async (req, res) => {
  const amount = freightAmount(req.body.amount);
  await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!order) throw checkoutError('Pedido não encontrado.', 404);
    if (
      order.fulfillmentType !== 'delivery' ||
      !['aguardando_definicao_frete', 'aguardando_confirmacao_frete'].includes(order.status)
    ) {
      throw checkoutError('O frete só pode ser definido antes da confirmação da cliente.', 409);
    }
    const total = Number(
      (Number(order.subtotal) - Number(order.discountTotal) + amount).toFixed(2)
    );
    await order.update(
      {
        shippingTotal: amount,
        total,
        shippingStatus: 'awaiting_confirmation',
        status: 'aguardando_confirmacao_frete',
        shippingConfirmedAt: null,
        shippingDetails: {
          ...order.shippingDetails,
          service:
            order.shippingDetails?.service ||
            (order.shippingMode === 'local' ? 'Entrega local' : 'Entrega para sua região'),
          revision: randomUUID()
        }
      },
      { transaction }
    );
  });
  res.json({ order: await Order.findByPk(req.params.id, { include: orderInclude }) });
});

export const confirmOrderFreight = asyncHandler(async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!order) throw checkoutError('Pedido não encontrado.', 404);
    if (
      order.status !== 'aguardando_confirmacao_frete' ||
      order.shippingStatus !== 'awaiting_confirmation'
    ) {
      throw checkoutError('Este pedido não está aguardando confirmação do frete.', 409);
    }
    if (
      !req.body.shippingRevision ||
      req.body.shippingRevision !== order.shippingDetails?.revision
    ) {
      throw checkoutError('O frete foi atualizado. Atualize o pedido e confira o novo total.', 409);
    }
    const method = req.body.paymentMethod || order.preferredPaymentMethod || 'pix';
    if (!paymentMethods.includes(method) || method === 'pickup_payment')
      throw checkoutError('Escolha uma forma de pagamento válida para entrega.');
    await order.update(
      {
        shippingStatus: 'confirmed',
        shippingConfirmedAt: new Date(),
        status: 'aguardando_pagamento',
        preferredPaymentMethod: method
      },
      { transaction }
    );
    await createPendingPayment(order, method, transaction);
  });
  res.json({ order: await Order.findByPk(req.params.id, { include: orderInclude }) });
});
