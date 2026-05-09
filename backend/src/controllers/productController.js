import { Op } from 'sequelize';
import {
  Category,
  Product,
  ProductImage,
  ProductVariation
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import {
  serializeProductStock,
  serializeProductsStock,
  syncProductStockFromVariations
} from '../utils/stock.js';
import { getSiteSettings } from '../utils/siteSettings.js';

const getProductInclude = ({ includeInactiveVariations = false } = {}) => [
  { model: Category, as: 'category' },
  { model: ProductImage, as: 'images', separate: true, order: [['displayOrder', 'ASC']] },
  {
    model: ProductVariation,
    as: 'variations',
    separate: true,
    ...(includeInactiveVariations ? {} : { where: { active: true } }),
    order: [['createdAt', 'ASC']]
  }
];

const booleanFields = ['active', 'featured', 'isNew', 'onSale'];
const decimalFields = ['price', 'salePrice'];
const integerFields = ['stock'];

const toBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;

const parseJsonArray = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : value);

const parseDecimal = (value) => (
  value === '' || value === null || value === undefined ? null : Number(value)
);

const normalizeHexColor = (value) => {
  const color = cleanText(value);

  if (!color) {
    return null;
  }

  return color.startsWith('#') ? color : `#${color}`;
};

const parseInteger = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const skuPart = (value) => slugify(String(value || '')).toUpperCase();

const buildVariationSku = (productSku, variation, index) => {
  const parts = [
    skuPart(productSku),
    skuPart(variation.color),
    skuPart(variation.size)
  ].filter(Boolean);

  if (parts.length > 1) {
    return parts.join('-');
  }

  return `${skuPart(productSku) || 'UVA'}-VAR-${index + 1}`;
};

const isBlankVariation = (variation) => (
  !cleanText(variation.sku)
  && !cleanText(variation.color)
  && !cleanText(variation.size)
  && !cleanText(variation.model)
  && !cleanText(variation.print)
  && !cleanText(variation.imageUrl)
  && parseDecimal(variation.price) === null
  && parseInteger(variation.quantity ?? variation.quantidade ?? variation.stock) === 0
);

const normalizeVariationPayload = (variation, index, productSku) => {
  const normalized = {
    id: cleanText(variation.id) || undefined,
    color: cleanText(variation.color) || null,
    colorHex: normalizeHexColor(variation.colorHex || variation.color_hex),
    size: cleanText(variation.size) || null,
    model: cleanText(variation.model) || null,
    print: cleanText(variation.print) || null,
    quantity: parseInteger(variation.quantity ?? variation.quantidade ?? variation.stock),
    price: parseDecimal(variation.price),
    imageUrl: cleanText(variation.imageUrl) || null,
    active: Object.prototype.hasOwnProperty.call(variation, 'active')
      ? toBoolean(variation.active)
      : true
  };

  normalized.sku = buildVariationSku(productSku, normalized, index);

  return normalized;
};

const getVariationPayloads = (body, productSku) => parseJsonArray(body.variations)
  .filter((variation) => !isBlankVariation(variation))
  .map((variation, index) => normalizeVariationPayload(variation, index, productSku));

const getColorGroupPayloads = (body, productSku) => parseJsonArray(body.colorGroups)
  .flatMap((group) => {
    const color = cleanText(group.name || group.color);
    const colorHex = normalizeHexColor(group.hex || group.colorHex || group.color_hex);
    const sizes = Array.isArray(group.sizes) ? group.sizes : [];

    return sizes
      .filter((size) => (
        cleanText(size.id)
        || cleanText(size.size)
        || Number(size.quantity ?? size.quantidade ?? size.stock ?? 0) > 0
      ))
      .map((size) => ({
        id: cleanText(size.id) || undefined,
        color,
        colorHex,
        size: cleanText(size.size) || null,
        quantity: parseInteger(size.quantity ?? size.quantidade ?? size.stock),
        price: parseDecimal(size.price),
        active: Object.prototype.hasOwnProperty.call(size, 'active')
          ? toBoolean(size.active)
          : true
      }));
  })
  .map((variation, index) => {
    const normalized = {
      ...variation,
      sku: buildVariationSku(productSku, variation, index),
      imageUrl: null
    };

    return normalized;
  });

const getProductVariationsPayloads = (body, productSku) => (
  Object.prototype.hasOwnProperty.call(body, 'colorGroups')
    ? getColorGroupPayloads(body, productSku)
    : getVariationPayloads(body, productSku)
);

const validateVariationPayloads = (variations) => {
  const seenSkus = new Set();

  for (const variation of variations) {
    if (!variation.color || !variation.size) {
      const error = new Error('Informe cor e tamanho em todas as variacoes do produto.');
      error.status = 422;
      throw error;
    }

    if (!variation.colorHex) {
      const error = new Error('Informe o codigo hexadecimal de cada cor do produto.');
      error.status = 422;
      throw error;
    }

    if (seenSkus.has(variation.sku)) {
      const error = new Error('Cada variacao precisa ter uma combinacao unica de cor e tamanho.');
      error.status = 422;
      throw error;
    }

    seenSkus.add(variation.sku);
  }
};

const saveProductVariations = async (product, variations) => {
  const currentVariations = await ProductVariation.findAll({
    where: { product_id: product.id }
  });
  const currentById = new Map(currentVariations.map((variation) => [variation.id, variation]));
  const currentBySku = new Map(currentVariations.map((variation) => [variation.sku, variation]));
  const receivedIds = new Set();

  for (const variation of variations) {
    const { id, ...variationPayload } = variation;

    if (id && currentById.has(id)) {
      await currentById.get(id).update(variationPayload);
      receivedIds.add(id);
      continue;
    }

    const existingVariation = currentBySku.get(variationPayload.sku);

    if (existingVariation) {
      await existingVariation.update(variationPayload);
      receivedIds.add(existingVariation.id);
      continue;
    }

    const createdVariation = await ProductVariation.create({
      ...variationPayload,
      product_id: product.id
    });
    receivedIds.add(createdVariation.id);
  }

  await Promise.all(
    currentVariations
      .filter((variation) => !receivedIds.has(variation.id))
      .map((variation) => variation.update({ active: false }))
  );
};

const normalizeProductPayload = (body) => {
  const payload = { ...body };

  for (const field of booleanFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = toBoolean(payload[field]);
    }
  }

  for (const field of decimalFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = payload[field] === '' || payload[field] === null
        ? null
        : Number(payload[field]);
    }
  }

  for (const field of integerFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = Number(payload[field] || 0);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'category_id') && !payload.category_id) {
    payload.category_id = null;
  }

  return payload;
};

const getUploadedFiles = (req) => [
  ...(req.files?.images || []),
  ...(req.files?.image || [])
];

const imageFromFile = (req, file, productName) => (
  {
    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
    altText: productName
  }
);

const buildImageRecords = ({
  req,
  productName,
  existingImages = [],
  imageOrder,
  color = null,
  colorHex = null,
  allowFileFallback = true
}) => {
  const files = getUploadedFiles(req);
  const existingById = new Map(existingImages.map((image) => [image.id, image]));
  const parsedImageOrder = Array.isArray(imageOrder) ? imageOrder : parseJsonArray(req.body.imageOrder);
  const orderedItems = parsedImageOrder.length
    ? parsedImageOrder
    : allowFileFallback
      ? files.map((file, fileIndex) => ({ type: 'file', fileIndex }))
      : [];

  return orderedItems
    .map((item) => {
      if (item.type === 'existing') {
        const existingImage = existingById.get(item.id);

        if (!existingImage) {
          return null;
        }

        return {
          url: existingImage.url,
          altText: existingImage.altText || productName,
          color,
          colorHex
        };
      }

      const file = files[Number(item.fileIndex)];
      return file ? imageFromFile(req, file, productName) : null;
    })
    .filter(Boolean)
    .map((image, index) => ({
      ...image,
      color,
      colorHex,
      displayOrder: index,
      isMain: index === 0
    }));
};

const buildColorImageRecords = ({ req, productName, colorGroups, existingImages = [] }) => (
  colorGroups.flatMap((group) => {
    const color = cleanText(group.name || group.color);
    const colorHex = normalizeHexColor(group.hex || group.colorHex || group.color_hex);
    const imageOrder = Array.isArray(group.images) ? group.images : [];

    if (!color) {
      return [];
    }

    return buildImageRecords({
      req,
      productName: `${productName} ${color}`,
      existingImages,
      imageOrder,
      color,
      colorHex,
      allowFileFallback: false
    });
  })
);

const getMainImageByColor = (images) => {
  const mainImageByColor = new Map();

  for (const image of images) {
    if (image.color && !mainImageByColor.has(image.color)) {
      mainImageByColor.set(image.color, image.url);
    }
  }

  return mainImageByColor;
};

const applyVariationImages = (variations, images) => {
  const mainImageByColor = getMainImageByColor(images);

  return variations.map((variation) => ({
    ...variation,
    imageUrl: mainImageByColor.get(variation.color) || variation.imageUrl || null
  }));
};

export const listProducts = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin' && req.query.includeInactive === 'true';
  const where = includeInactive
    ? {}
    : { active: true };

  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${req.query.search}%` } },
      { description: { [Op.like]: `%${req.query.search}%` } },
      { sku: { [Op.like]: `%${req.query.search}%` } }
    ];
  }

  if (req.query.featured === 'true') {
    where.featured = true;
  }

  if (req.query.new === 'true') {
    where.isNew = true;
  }

  if (req.query.sale === 'true') {
    where.onSale = true;
  }

  if (req.query.category) {
    const category = await Category.findOne({ where: { slug: req.query.category } });

    if (!category) {
      res.json({ products: [] });
      return;
    }

    where.category_id = category.id;
  }

  const products = await Product.findAll({
    where,
    include: getProductInclude({ includeInactiveVariations: includeInactive }),
    order: [['createdAt', 'DESC']]
  });
  const settings = await getSiteSettings();

  res.json({ products: serializeProductsStock(products, settings.lowStockThreshold) });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    where: {
      [Op.or]: [{ id: req.params.identifier }, { slug: req.params.identifier }],
      active: true
    },
    include: getProductInclude()
  });

  if (!product) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  const settings = await getSiteSettings();
  res.json({ product: serializeProductStock(product, settings.lowStockThreshold) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const normalizedBody = normalizeProductPayload(req.body);
  let variations = getProductVariationsPayloads(req.body, normalizedBody.sku);
  validateVariationPayloads(variations);
  const colorGroups = parseJsonArray(req.body.colorGroups);
  const productPayload = { ...normalizedBody };
  delete productPayload.imageOrder;
  delete productPayload.variations;
  delete productPayload.colorGroups;

  const product = await Product.create({
    ...productPayload,
    slug: productPayload.slug ? slugify(productPayload.slug) : slugify(productPayload.name)
  });

  const productImages = buildImageRecords({
    req,
    productName: productPayload.name,
    imageOrder: parseJsonArray(req.body.imageOrder)
  });
  const colorImages = buildColorImageRecords({
    req,
    productName: productPayload.name,
    colorGroups
  });
  variations = applyVariationImages(variations, colorImages);
  const allImages = [...productImages, ...colorImages];

  if (allImages.length) {
    await ProductImage.bulkCreate(
      allImages.map((image, index) => ({
        ...image,
        product_id: product.id,
        displayOrder: image.displayOrder ?? index,
        isMain: image.isMain ?? index === 0
      }))
    );
  }

  if (variations.length) {
    await ProductVariation.bulkCreate(
      variations.map((variation) => ({
        ...variation,
        product_id: product.id
      }))
    );
    await syncProductStockFromVariations(product.id);
  }

  const createdProduct = await Product.findByPk(product.id, {
    include: getProductInclude({ includeInactiveVariations: true })
  });
  const settings = await getSiteSettings();
  res.status(201).json({ product: serializeProductStock(createdProduct, settings.lowStockThreshold) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  const payload = normalizeProductPayload(req.body);
  const hasVariationsPayload = Object.prototype.hasOwnProperty.call(req.body, 'variations');
  const hasColorGroupsPayload = Object.prototype.hasOwnProperty.call(req.body, 'colorGroups');
  let variations = hasVariationsPayload || hasColorGroupsPayload
    ? getProductVariationsPayloads(req.body, payload.sku || product.sku)
    : [];
  validateVariationPayloads(variations);
  delete payload.images;
  delete payload.imageOrder;
  delete payload.variations;
  delete payload.colorGroups;

  if (req.body.slug || req.body.name) {
    payload.slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  }

  await product.update(payload);

  const hasImageOrder = Object.prototype.hasOwnProperty.call(req.body, 'imageOrder');
  const hasUploadedFiles = getUploadedFiles(req).length > 0;
  let colorImages = [];

  if (hasImageOrder || hasUploadedFiles || hasColorGroupsPayload) {
    const currentImages = await ProductImage.findAll({
      where: { product_id: product.id },
      order: [['displayOrder', 'ASC']]
    });
    const productImages = buildImageRecords({
      req,
      productName: payload.name || product.name,
      existingImages: currentImages,
      imageOrder: parseJsonArray(req.body.imageOrder)
    });
    colorImages = buildColorImageRecords({
      req,
      productName: payload.name || product.name,
      colorGroups: parseJsonArray(req.body.colorGroups),
      existingImages: currentImages
    });
    const allImages = [...productImages, ...colorImages];

    await ProductImage.destroy({ where: { product_id: product.id } });

    if (allImages.length) {
      await ProductImage.bulkCreate(
        allImages.map((image) => ({
          ...image,
          product_id: product.id
        }))
      );
    }
  }

  if (hasVariationsPayload || hasColorGroupsPayload) {
    variations = applyVariationImages(variations, colorImages);
    await saveProductVariations(product, variations);
    await syncProductStockFromVariations(product.id);
  }

  const updatedProduct = await Product.findByPk(product.id, {
    include: getProductInclude({ includeInactiveVariations: true })
  });
  const settings = await getSiteSettings();
  res.json({ product: serializeProductStock(updatedProduct, settings.lowStockThreshold) });
});

export const deactivateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  await product.update({ active: false });
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);

  if (!product) {
    res.status(404).json({ message: 'Produto nao encontrado.' });
    return;
  }

  await product.destroy();
  res.status(204).send();
});
