import { DataTypes } from 'sequelize';
import { orderStatuses } from './checkoutValidation.js';

const getDatabaseErrorCode = (error) => error.original?.code || error.parent?.code;

const describeTable = async (queryInterface, tableName) => {
  try {
    return await queryInterface.describeTable(tableName);
  } catch (error) {
    if (
      getDatabaseErrorCode(error) === 'ER_NO_SUCH_TABLE'
      || error.message?.includes(`No description found for "${tableName}" table`)
    ) {
      return null;
    }

    throw error;
  }
};

const addColumnIfMissing = async (queryInterface, tableDescription, tableName, columnName, definition) => {
  if (!tableDescription || tableDescription[columnName]) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
  tableDescription[columnName] = definition;
};

export const ensureVariationQuantityColumn = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const tableDescription = await describeTable(queryInterface, 'produto_variacoes');

  if (!tableDescription) {
    return;
  }

  if (!tableDescription.quantidade) {
    await queryInterface.addColumn('produto_variacoes', 'quantidade', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }

  if (tableDescription.stock) {
    await sequelize.query(`
      UPDATE produto_variacoes
      SET quantidade = stock
      WHERE quantidade = 0
        AND stock IS NOT NULL
    `);
  }
};

export const ensureCatalogVariationColumns = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const variationTable = await describeTable(queryInterface, 'produto_variacoes');
  const imageTable = await describeTable(queryInterface, 'produto_imagens');
  const orderItemTable = await describeTable(queryInterface, 'pedido_itens');

  await addColumnIfMissing(queryInterface, variationTable, 'produto_variacoes', 'color_hex', {
    type: DataTypes.STRING(20),
    allowNull: true
  });

  await addColumnIfMissing(queryInterface, imageTable, 'produto_imagens', 'color', {
    type: DataTypes.STRING(60),
    allowNull: true
  });

  await addColumnIfMissing(queryInterface, imageTable, 'produto_imagens', 'color_hex', {
    type: DataTypes.STRING(20),
    allowNull: true
  });

  await addColumnIfMissing(queryInterface, orderItemTable, 'pedido_itens', 'variation_color', {
    type: DataTypes.STRING(60),
    allowNull: true
  });

  await addColumnIfMissing(queryInterface, orderItemTable, 'pedido_itens', 'variation_size', {
    type: DataTypes.STRING(30),
    allowNull: true
  });
};

export const ensureCategoryHomeColumns = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const categoryTable = await describeTable(queryInterface, 'categorias');

  await addColumnIfMissing(queryInterface, categoryTable, 'categorias', 'display_order', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  });

  await addColumnIfMissing(queryInterface, categoryTable, 'categorias', 'show_on_home', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  const hadFeaturedCategoryColumn = Boolean(categoryTable?.show_as_featured_category);
  await addColumnIfMissing(queryInterface, categoryTable, 'categorias', 'show_as_featured_category', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  if (categoryTable && !hadFeaturedCategoryColumn && categoryTable.show_on_home) {
    await sequelize.query(`
      UPDATE categorias
      SET show_as_featured_category = show_on_home
      WHERE show_on_home IS NOT NULL
    `);
  }

  await addColumnIfMissing(queryInterface, categoryTable, 'categorias', 'show_in_navbar', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
};

export const ensureSiteSettingsTable = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const settingsTable = await describeTable(queryInterface, 'site_configuracoes');

  if (settingsTable) {
    return;
  }

  await queryInterface.createTable('site_configuracoes', {
    setting_key: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });
};

export const ensureCheckoutColumns = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await describeTable(queryInterface, 'pedidos');
  if (!table) return;
  if (orderStatuses.some((status) => !table.status.type.includes(`'${status}'`))) {
    await queryInterface.changeColumn('pedidos', 'status', {
      type: DataTypes.ENUM(...orderStatuses), allowNull: false, defaultValue: 'aguardando_pagamento'
    });
  }
  for (const [name, definition] of Object.entries({
    address_snapshot: { type: DataTypes.JSON, allowNull: true },
    contact_snapshot: { type: DataTypes.JSON, allowNull: true },
    shipping_mode: { type: DataTypes.STRING(30), allowNull: true },
    shipping_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'confirmed' },
    shipping_details: { type: DataTypes.JSON, allowNull: true },
    shipping_confirmed_at: { type: DataTypes.DATE, allowNull: true },
    preferred_payment_method: { type: DataTypes.STRING(30), allowNull: true }
  })) await addColumnIfMissing(queryInterface, table, 'pedidos', name, definition);
};

export const runStartupMigrations = async (sequelize) => {
  await ensureSiteSettingsTable(sequelize);
  await ensureCategoryHomeColumns(sequelize);
  await ensureVariationQuantityColumn(sequelize);
  await ensureCatalogVariationColumns(sequelize);
  await ensureCheckoutColumns(sequelize);
};
