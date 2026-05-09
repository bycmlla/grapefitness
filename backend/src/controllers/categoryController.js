import {
  Category,
  Product,
  ProductImage,
  ProductVariation,
  sequelize
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { getSiteSettings } from '../utils/siteSettings.js';
import { serializeProductsStock } from '../utils/stock.js';

const homeCategoryOrder = [
  ['displayOrder', 'ASC'],
  ['name', 'ASC']
];

const homeProductInclude = [
  { model: ProductImage, as: 'images', separate: true, order: [['displayOrder', 'ASC']] },
  {
    model: ProductVariation,
    as: 'variations',
    separate: true,
    where: { active: true },
    required: false,
    order: [['createdAt', 'ASC']]
  }
];

const getActiveCategoryProducts = (categoryId) => Product.findAll({
  where: {
    active: true,
    category_id: categoryId
  },
  include: homeProductInclude,
  order: [['createdAt', 'DESC']]
});

const toBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;

const normalizeCategoryPayload = (body) => {
  const payload = { ...body };
  const booleanFields = ['active', 'showOnHome', 'showAsFeaturedCategory', 'showInNavbar'];

  if (Object.prototype.hasOwnProperty.call(payload, 'show_as_featured_category')) {
    payload.showAsFeaturedCategory = payload.show_as_featured_category;
    delete payload.show_as_featured_category;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'show_on_home')) {
    payload.showOnHome = payload.show_on_home;
    delete payload.show_on_home;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'show_in_navbar')) {
    payload.showInNavbar = payload.show_in_navbar;
    delete payload.show_in_navbar;
  }

  for (const field of booleanFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = toBoolean(payload[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'displayOrder')) {
    payload.displayOrder = Number(payload.displayOrder || 0);
  }

  return payload;
};

export const listCategories = asyncHandler(async (req, res) => {
  const where = req.user?.role === 'admin' && req.query.includeInactive === 'true'
    ? {}
    : { active: true };

  const categories = await Category.findAll({
    where,
    order: [
      ['displayOrder', 'ASC'],
      ['name', 'ASC']
    ]
  });

  res.json({ categories });
});

export const listHomeCategories = asyncHandler(async (req, res) => {
  const settings = await getSiteSettings();
  const sectionCategories = await Category.findAll({
    where: { active: true, showOnHome: true },
    order: homeCategoryOrder
  });
  const featuredCategories = await Category.findAll({
    where: { active: true, showAsFeaturedCategory: true },
    order: homeCategoryOrder
  });

  const categoriesWithProducts = await Promise.all(
    sectionCategories.map(async (category) => {
      const products = await getActiveCategoryProducts(category.id);

      if (!products.length) {
        return null;
      }

      return {
        ...category.toJSON(),
        products: serializeProductsStock(products, settings.lowStockThreshold)
      };
    })
  );

  res.json({
    categories: categoriesWithProducts.filter(Boolean),
    featuredCategories: featuredCategories.map((category) => category.toJSON())
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    where: {
      slug: req.params.slug,
      active: true
    }
  });

  if (!category) {
    res.status(404).json({ message: 'Categoria nao encontrada.' });
    return;
  }

  res.json({ category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = {
    ...normalizeCategoryPayload(req.body),
    slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.name)
  };

  const category = await Category.create(payload);
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    res.status(404).json({ message: 'Categoria nao encontrada.' });
    return;
  }

  const payload = normalizeCategoryPayload(req.body);

  if (req.body.slug || req.body.name) {
    payload.slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  }

  await category.update(payload);
  await category.reload();
  res.json({ category });
});

export const deactivateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    res.status(404).json({ message: 'Categoria nao encontrada.' });
    return;
  }

  await category.update({ active: false });
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    res.status(404).json({ message: 'Categoria nao encontrada.' });
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    await Product.update(
      { category_id: null },
      {
        where: { category_id: category.id },
        transaction
      }
    );

    await category.destroy({ transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  res.status(204).send();
});
