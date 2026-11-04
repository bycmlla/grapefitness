import { createHash } from 'node:crypto';
import { setDefaultResultOrder } from 'node:dns';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Product, ProductVariation } from '../models/index.js';
import {
  checkoutError,
  freightAmount,
  isLocalDelivery,
  normalizeZipCode,
  states
} from '../utils/checkoutValidation.js';

// Prioriza IPv4 para consultar serviços externos também em redes sem rota IPv6.
setDefaultResultOrder('ipv4first');

const cepCache = new Map();
export const lookupZipCode = async (value) => {
  const zipCode = normalizeZipCode(value);
  const cached = cepCache.get(zipCode);
  if (cached && cached.expires > Date.now()) return cached.address;
  let data;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`, {
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) throw new Error('CEP service unavailable');
    data = await response.json();
  } catch {
    throw checkoutError(
      'Não foi possível consultar o CEP. Preencha o endereço e tente consultar novamente.',
      503
    );
  }
  if (data.erro) throw checkoutError('CEP não encontrado. Confira os dígitos.', 422);
  if (!data.localidade || !states.has(data.uf))
    throw checkoutError('Não foi possível identificar cidade e estado deste CEP.', 503);
  const address = {
    zipCode,
    street: data.logradouro || '',
    district: data.bairro || '',
    city: data.localidade,
    state: data.uf
  };
  if (cepCache.size >= 500) cepCache.delete(cepCache.keys().next().value);
  cepCache.set(zipCode, { address, expires: Date.now() + 3600000 });
  return address;
};

// Assina a cotação com CEP, conta, carrinho e prazo. Valores do navegador não são utilizados.
export const cartFingerprint = (items) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        items
          .map((item) => [item.productId, item.variationId || null, Number(item.quantity)])
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      )
    )
    .digest('hex');

export const signShippingQuote = (quote, { zipCode, userId, items }) =>
  jwt.sign(
    {
      purpose: 'shipping_quote',
      zipCode,
      userId,
      cart: cartFingerprint(items),
      quote
    },
    env.jwtSecret,
    { expiresIn: '10m', audience: 'uva-shipping', algorithm: 'HS256' }
  );

export const verifyShippingQuote = (token, { zipCode, userId, items }) => {
  try {
    const data = jwt.verify(token, env.jwtSecret, {
      audience: 'uva-shipping',
      algorithms: ['HS256']
    });
    if (
      data.purpose !== 'shipping_quote' ||
      data.zipCode !== zipCode ||
      data.userId !== userId ||
      data.cart !== cartFingerprint(items)
    )
      throw new Error('Quote mismatch');
    return data.quote;
  } catch {
    throw checkoutError('A cotação de frete mudou ou expirou. Consulte o CEP novamente.', 409);
  }
};

export const quoteTransport = async (zipCode, items) => {
  if (!env.shippingQuoteUrl) return null;
  // Adaptador opcional de transporte; origem e credenciais são configuradas somente no servidor.
  const products = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    const variation = item.variationId
      ? await ProductVariation.findOne({
          where: { id: item.variationId, product_id: item.productId, active: true }
        })
      : null;
    if (!product?.active || (item.variationId && !variation))
      throw checkoutError('Produto inválido para cotação.');
    products.push({
      productId: product.id,
      sku: variation?.sku || product.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(variation?.price ?? product.salePrice ?? product.price)
    });
  }
  try {
    const response = await fetch(env.shippingQuoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.shippingQuoteToken ? { Authorization: `Bearer ${env.shippingQuoteToken}` } : {})
      },
      body: JSON.stringify({
        originZipCode: env.shippingOriginZipCode,
        destinationZipCode: zipCode,
        items: products
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    const rates = (Array.isArray(data.rates) ? data.rates : []).flatMap((rate) => {
      try {
        if (typeof rate.service !== 'string' || !rate.service.trim() || rate.service.length > 120)
          return [];
        return [
          {
            service: rate.service.trim(),
            amount: freightAmount(rate.amount),
            deliveryDays:
              Number.isInteger(rate.deliveryDays) && rate.deliveryDays > 0
                ? rate.deliveryDays
                : null
          }
        ];
      } catch {
        return [];
      }
    });
    return rates.sort((a, b) => a.amount - b.amount)[0] || null;
  } catch {
    return null;
  }
};

export const resolveDelivery = async ({
  zipCode,
  items,
  settings,
  userId,
  quoteToken,
  forOrder = false
}) => {
  const address = await lookupZipCode(zipCode);
  const local = isLocalDelivery(address, settings.localDeliveryRegions);
  let quote = null;
  if (!local)
    quote = quoteToken
      ? verifyShippingQuote(quoteToken, { zipCode: address.zipCode, userId, items })
      : forOrder
        ? null
        : await quoteTransport(address.zipCode, items);
  return {
    address,
    shipping: {
      mode: local ? 'local' : 'regional',
      label: local ? 'Entrega local' : 'Entrega para sua região',
      status: quote ? 'quoted' : 'pending',
      amount: quote?.amount ?? null,
      service: quote?.service || null,
      deliveryDays: quote?.deliveryDays || null,
      message: local
        ? 'Valor da entrega a combinar com a loja'
        : quote
          ? 'Frete calculado para seu endereço'
          : 'O frete será informado pela loja antes do pagamento.',
      quoteToken: quote
        ? signShippingQuote(quote, { zipCode: address.zipCode, userId, items })
        : null
    }
  };
};
