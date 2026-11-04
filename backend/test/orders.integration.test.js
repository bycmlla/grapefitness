import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { Sequelize, DataTypes } from 'sequelize';
import { env } from '../src/config/env.js';

describe('checkout com MySQL isolado', { skip: process.env.TEST_MYSQL !== 'true' }, () => {
  const databaseName = `uva_checkout_test_${randomUUID().replaceAll('-', '')}`;
  const nativeFetch = globalThis.fetch;
  let manager,
    models,
    server,
    baseUrl,
    customer,
    other,
    admin,
    store,
    token,
    otherToken,
    adminToken;
  let signToken;
  const deliveryAddress = {
    zipCode: '44056000',
    street: 'Rua de teste',
    number: '10',
    district: 'Conceição',
    city: 'Feira de Santana',
    state: 'BA'
  };
  const request = async (path, method = 'GET', body, auth = token) => {
    const response = await nativeFetch(`${baseUrl}/api${path}`, {
      method,
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json()
    };
  };
  const product = async (withVariation = false) => {
    const id = randomUUID();
    const row = await models.Product.create({
      id,
      name: 'Produto de teste',
      slug: id,
      sku: id,
      price: 100,
      stock: 10
    });
    const variation = withVariation
      ? await models.ProductVariation.create({
          product_id: id,
          sku: randomUUID(),
          color: 'Uva',
          size: 'M',
          quantity: 10
        })
      : null;
    return {
      row,
      variation,
      item: { productId: id, variationId: variation?.id || null, quantity: 2 }
    };
  };
  const makeOrder = async (item, extra = {}) =>
    request('/orders', 'POST', {
      fulfillmentType: 'delivery',
      paymentMethod: 'pix',
      address: deliveryAddress,
      items: [item],
      ...extra
    });

  before(async () => {
    manager = new Sequelize(env.database.name, env.database.user, env.database.password, {
      dialect: 'mysql',
      host: env.database.host,
      port: env.database.port,
      logging: false
    });
    assert.match(databaseName, /^uva_checkout_test_[a-f0-9]{32}$/);
    await manager.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    env.database.name = databaseName;
    env.nodeEnv = 'test';
    env.shippingQuoteUrl = '';
    models = await import('../src/models/index.js');
    models.sequelize.options.logging = false;
    await models.sequelize.sync();
    ({ signToken } = await import('../src/utils/token.js'));
    customer = await models.User.create({
      name: 'Cliente',
      email: 'cliente@example.test',
      phone: '75999999999'
    });
    other = await models.User.create({
      name: 'Outra cliente',
      email: 'outra@example.test',
      phone: '11999999999'
    });
    admin = await models.User.create({
      name: 'Admin',
      email: 'admin@example.test',
      role: 'admin',
      phone: '75999999999'
    });
    store = await models.PickupStore.create({
      name: 'Loja de teste',
      address: 'Rua de teste, 1',
      city: 'Feira de Santana',
      state: 'BA'
    });
    token = signToken(customer);
    otherToken = signToken(other);
    adminToken = signToken(admin);
    globalThis.fetch = async (url) => {
      if (String(url).includes('viacep.com.br')) {
        const zip = String(url).match(/ws\/(\d+)/)?.[1];
        if (zip === '99999999') return Response.json({ erro: true });
        if (zip === '44099000')
          return Response.json({ localidade: 'Anguera', uf: 'BA', logradouro: '', bairro: '' });
        return Response.json(
          zip?.startsWith('440')
            ? {
                localidade: 'Feira de Santana',
                uf: 'BA',
                logradouro: 'Rua de teste',
                bairro: 'Conceição'
              }
            : { localidade: 'São Paulo', uf: 'SP', logradouro: 'Praça da Sé', bairro: 'Sé' }
        );
      }
      if (String(url) === 'https://shipping.example.test/quote')
        return Response.json({
          rates: [
            { service: 'Expresso', amount: 40, deliveryDays: 2 },
            { service: 'Econômico', amount: 25.5, deliveryDays: 5 }
          ]
        });
      throw new Error('Unexpected external request');
    };
    const { default: app } = await import('../src/app.js');
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    globalThis.fetch = nativeFetch;
    if (server) await new Promise((resolve) => server.close(resolve));
    if (models) await models.sequelize.close();
    if (manager) {
      assert.match(databaseName, /^uva_checkout_test_[a-f0-9]{32}$/);
      await manager.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await manager.close();
    }
  });

  test('migração idempotente preserva um pedido antigo e seu pagamento', async () => {
    const legacy = await models.Order.create({
      user_id: customer.id,
      orderNumber: randomUUID(),
      fulfillmentType: 'pickup',
      subtotal: 100,
      total: 100
    });
    await models.Payment.create({ order_id: legacy.id, method: 'pix', total: 100 });
    const qi = models.sequelize.getQueryInterface();
    for (const column of [
      'address_snapshot',
      'contact_snapshot',
      'shipping_mode',
      'shipping_status',
      'shipping_details',
      'shipping_confirmed_at',
      'preferred_payment_method'
    ])
      await qi.removeColumn('pedidos', column);
    await qi.changeColumn('pedidos', 'status', {
      type: DataTypes.ENUM(
        'aguardando_pagamento',
        'pagamento_aprovado',
        'em_separacao',
        'pronto_para_retirada',
        'enviado',
        'entregue',
        'cancelado',
        'reembolsado'
      ),
      allowNull: false,
      defaultValue: 'aguardando_pagamento'
    });
    const { ensureCheckoutColumns } = await import('../src/utils/databaseMigrations.js');
    await ensureCheckoutColumns(models.sequelize);
    await ensureCheckoutColumns(models.sequelize);
    await legacy.reload();
    assert.equal(legacy.shippingStatus, 'confirmed');
    assert.equal(legacy.status, 'aguardando_pagamento');
    assert.equal(await models.Payment.count({ where: { order_id: legacy.id } }), 1);
  });

  test('frete local exige definição e confirmação, sem criar pagamento antecipado', async () => {
    const { row, item } = await product();
    const result = await makeOrder(item, {
      shippingTotal: 0,
      total: 1,
      contact: { name: 'Cliente atualizada', phone: '(75) 98888-8888', role: 'admin' }
    });
    assert.equal(result.status, 201);
    const order = result.data.order;
    assert.equal(order.status, 'aguardando_definicao_frete');
    assert.equal(order.shippingMode, 'local');
    assert.equal(order.payment, null);
    assert.equal(Number(order.total), 200);
    assert.equal(order.addressSnapshot.street, deliveryAddress.street);
    assert.equal(order.contactSnapshot.phone, '75988888888');
    await customer.reload();
    assert.equal(customer.name, 'Cliente atualizada');
    assert.equal(customer.role, 'customer');
    await row.reload();
    assert.equal(row.stock, 8);
    for (const status of ['aguardando_pagamento', 'pagamento_aprovado', 'enviado'])
      assert.equal(
        (await request(`/admin/orders/${order.id}/status`, 'PATCH', { status }, adminToken)).status,
        409
      );
    assert.equal(
      (await request(`/orders/me/${order.id}/confirm-freight`, 'POST', { paymentMethod: 'pix' }))
        .status,
      409
    );
    assert.equal(
      (await request(`/admin/orders/${order.id}/freight`, 'PATCH', { amount: 15 }, token)).status,
      403
    );
    assert.equal(
      (await request(`/admin/orders/${order.id}/freight`, 'PATCH', { amount: -1 }, adminToken))
        .status,
      422
    );
    const freight = await request(
      `/admin/orders/${order.id}/freight`,
      'PATCH',
      { amount: 15 },
      adminToken
    );
    assert.equal(freight.status, 200);
    assert.equal(Number(freight.data.order.total), 215);
    assert.equal(freight.data.order.payment, null);
    const oldRevision = freight.data.order.shippingDetails.revision;
    assert.equal(
      (
        await request(
          `/orders/me/${order.id}/confirm-freight`,
          'POST',
          { shippingRevision: oldRevision },
          otherToken
        )
      ).status,
      404
    );
    const revised = await request(
      `/admin/orders/${order.id}/freight`,
      'PATCH',
      { amount: 20 },
      adminToken
    );
    assert.equal(
      (
        await request(`/orders/me/${order.id}/confirm-freight`, 'POST', {
          shippingRevision: oldRevision
        })
      ).status,
      409
    );
    const confirmed = await request(`/orders/me/${order.id}/confirm-freight`, 'POST', {
      shippingRevision: revised.data.order.shippingDetails.revision,
      paymentMethod: 'credit_card',
      shippingTotal: 0,
      total: 1
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.data.order.status, 'aguardando_pagamento');
    assert.equal(Number(confirmed.data.order.payment.total), 220);
    assert.equal(confirmed.data.order.payment.method, 'credit_card');
    assert.equal(
      (await request(`/admin/orders/${order.id}/freight`, 'PATCH', { amount: 30 }, adminToken))
        .status,
      409
    );
    assert.equal(
      (
        await request(`/orders/me/${order.id}/confirm-freight`, 'POST', {
          shippingRevision: revised.data.order.shippingDetails.revision
        })
      ).status,
      409
    );
    await row.reload();
    assert.equal(row.stock, 8);
    assert.equal(
      (
        await request(
          `/admin/orders/${order.id}/status`,
          'PATCH',
          { status: 'pagamento_aprovado' },
          adminToken
        )
      ).data.order.payment.status,
      'approved'
    );
    const address = await models.Address.findByPk(order.address_id);
    await address.update({ street: 'Rua alterada depois' });
    assert.equal(
      (await request(`/orders/me/${order.id}`)).data.order.addressSnapshot.street,
      deliveryAddress.street
    );
  });

  test('retirada grátis mantém pagamento e estoque por variação; cancelar devolve uma vez', async () => {
    const { row, variation, item } = await product(true);
    const result = await makeOrder(item, {
      fulfillmentType: 'pickup',
      pickupStoreId: store.id,
      paymentMethod: 'pickup_payment',
      address: undefined,
      shippingTotal: 99
    });
    assert.equal(result.status, 201);
    const order = result.data.order;
    assert.equal(Number(order.shippingTotal), 0);
    assert.equal(order.addressSnapshot, null);
    assert.equal(order.payment.method, 'pickup_payment');
    await row.reload();
    await variation.reload();
    assert.equal(row.stock, 8);
    assert.equal(variation.quantity, 8);
    assert.equal(
      (
        await request(
          `/admin/orders/${order.id}/status`,
          'PATCH',
          { status: 'cancelado' },
          adminToken
        )
      ).status,
      200
    );
    assert.equal(
      (
        await request(
          `/admin/orders/${order.id}/status`,
          'PATCH',
          { status: 'cancelado' },
          adminToken
        )
      ).status,
      200
    );
    await variation.reload();
    assert.equal(variation.quantity, 10);
    assert.equal(
      (
        await request(
          `/admin/orders/${order.id}/status`,
          'PATCH',
          { status: 'aguardando_pagamento' },
          adminToken
        )
      ).status,
      409
    );
  });

  test('validação de endereço, CEP e posse acontece antes de reservar estoque', async () => {
    const { row, item } = await product();
    for (const field of ['zipCode', 'street', 'number', 'district', 'city', 'state'])
      assert.equal(
        (await makeOrder(item, { address: { ...deliveryAddress, [field]: '' } })).status,
        422
      );
    assert.equal(
      (await makeOrder(item, { address: { ...deliveryAddress, zipCode: '99999999' } })).status,
      422
    );
    const otherAddress = await models.Address.create({ ...deliveryAddress, user_id: other.id });
    assert.equal((await makeOrder(item, { addressId: otherAddress.id })).status, 404);
    await row.reload();
    assert.equal(row.stock, 10);
    const noNumber = await makeOrder(item, {
      address: { ...deliveryAddress, number: '', noNumber: true }
    });
    assert.equal(noNumber.status, 201);
    assert.equal(noNumber.data.order.addressSnapshot.number, 'S/N');
  });

  test('região remota fica pendente sem integração e usa somente a cotação assinada quando disponível', async () => {
    const { item } = await product();
    const remoteAddress = {
      ...deliveryAddress,
      zipCode: '01001000',
      city: 'São Paulo',
      state: 'SP'
    };
    const pending = await makeOrder(item, { address: remoteAddress });
    assert.equal(pending.status, 201);
    assert.equal(pending.data.order.shippingMode, 'regional');
    assert.equal(pending.data.order.payment, null);
    env.shippingQuoteUrl = 'https://shipping.example.test/quote';
    const quote = await request('/shipping/quote', 'POST', { zipCode: '01001000', items: [item] });
    assert.equal(quote.status, 200);
    assert.equal(quote.data.shipping.amount, 25.5);
    assert.equal(quote.data.shipping.service, 'Econômico');
    const placed = await makeOrder(item, {
      address: remoteAddress,
      shippingQuoteToken: quote.data.shipping.quoteToken,
      shippingTotal: 0
    });
    assert.equal(placed.status, 201);
    assert.equal(Number(placed.data.order.shippingTotal), 25.5);
    assert.equal(Number(placed.data.order.payment.total), 225.5);
    assert.equal(
      (
        await makeOrder(
          { ...item, quantity: 1 },
          { address: remoteAddress, shippingQuoteToken: quote.data.shipping.quoteToken }
        )
      ).status,
      409
    );
    env.shippingQuoteUrl = '';
  });

  test('configuração administrativa define as cidades locais independentemente do prefixo do CEP', async () => {
    const { item } = await product();
    const samePrefix = await request('/shipping/quote', 'POST', {
      zipCode: '44099000',
      items: [item]
    });
    assert.equal(samePrefix.status, 200);
    assert.equal(samePrefix.data.address.city, 'Anguera');
    assert.equal(samePrefix.data.shipping.mode, 'regional');
    assert.equal(
      (await request('/settings', 'PUT', { localDeliveryRegions: [] }, token)).status,
      403
    );
    assert.equal(
      (
        await request(
          '/settings',
          'PUT',
          { localDeliveryRegions: [{ city: 'Cidade', state: 'ZZ' }] },
          adminToken
        )
      ).status,
      422
    );
    const configured = await request(
      '/settings',
      'PUT',
      { localDeliveryRegions: [{ city: 'São Paulo', state: 'SP' }] },
      adminToken
    );
    assert.equal(configured.status, 200);
    const local = await request('/shipping/quote', 'POST', { zipCode: '01001000', items: [item] });
    assert.equal(local.data.shipping.mode, 'local');
    assert.equal(local.data.shipping.status, 'pending');
    await request(
      '/settings',
      'PUT',
      { localDeliveryRegions: [{ city: 'Feira de Santana', state: 'BA' }] },
      adminToken
    );
  });

  test('endereços mantêm nome e preferência; alterações não podem transferir sua posse', async () => {
    const created = await request('/addresses', 'POST', {
      ...deliveryAddress,
      number: '',
      noNumber: true,
      label: 'Casa',
      isDefault: true,
      user_id: other.id
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.address.number, 'S/N');
    assert.equal(created.data.address.label, 'Casa');
    assert.equal(created.data.address.isDefault, true);
    assert.equal(created.data.address.user_id, customer.id);
    const updated = await request(`/addresses/${created.data.address.id}`, 'PUT', {
      label: 'Trabalho',
      isDefault: false,
      user_id: other.id
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.address.label, 'Trabalho');
    assert.equal(updated.data.address.user_id, customer.id);
    assert.equal(
      (
        await request(
          `/addresses/${created.data.address.id}`,
          'PUT',
          { street: 'Outro endereço' },
          otherToken
        )
      ).status,
      404
    );
  });

  test('cancelamento de solicitação pendente devolve o estoque sem liberar pagamento', async () => {
    const { row, item } = await product();
    const created = await makeOrder(item);
    const cancelled = await request(
      `/admin/orders/${created.data.order.id}/status`,
      'PATCH',
      { status: 'cancelado' },
      adminToken
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.data.order.payment, null);
    await row.reload();
    assert.equal(row.stock, 10);
    assert.equal(
      (
        await request(
          `/admin/orders/${created.data.order.id}/freight`,
          'PATCH',
          { amount: 10 },
          adminToken
        )
      ).status,
      409
    );
  });

  test('duas confirmações simultâneas criam somente um pagamento', async () => {
    const { item } = await product();
    const created = await makeOrder(item);
    const orderId = created.data.order.id;
    const freight = await request(
      `/admin/orders/${orderId}/freight`,
      'PATCH',
      { amount: 0 },
      adminToken
    );
    const body = {
      shippingRevision: freight.data.order.shippingDetails.revision,
      paymentMethod: 'pix'
    };
    const responses = await Promise.all([
      request(`/orders/me/${orderId}/confirm-freight`, 'POST', body),
      request(`/orders/me/${orderId}/confirm-freight`, 'POST', body)
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    assert.equal(await models.Payment.count({ where: { order_id: orderId } }), 1);
  });
});
