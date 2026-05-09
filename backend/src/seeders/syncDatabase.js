import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import {
  Category,
  PickupStore,
  User,
  sequelize
} from '../models/index.js';
import { runStartupMigrations } from '../utils/databaseMigrations.js';
import { slugify } from '../utils/slugify.js';

const categories = [
  'Leggings',
  'Tops',
  'Shorts',
  'Macacoes',
  'Camisetas',
  'Conjuntos',
  'Acessorios',
  'Promocoes',
  'Uva Shoes'
];

const defaultNavbarSlugs = ['conjuntos', 'uva-shoes'];

const pickupStores = [
  {
    name: 'Conceicao',
    address: 'Avenida Ayrton Senna, 5302, Conceicao, Feira de Santana - BA',
    zipCode: '44056-000'
  },
  {
    name: 'Centro - Prof. Geminiano Costa',
    address: 'R. Prof. Geminiano Costa, 65 - Centro, Feira de Santana - BA',
    zipCode: '44001-120'
  },
  {
    name: 'Centro - Barao do Rio Branco',
    address: 'R. Barao do Rio Branco, 1686 - Centro, Feira de Santana - BA',
    zipCode: '44001-232'
  }
];

const syncDatabase = async () => {
  await sequelize.authenticate();
  await runStartupMigrations(sequelize);
  await sequelize.sync({ alter: true });
  await runStartupMigrations(sequelize);

  for (const [index, name] of categories.entries()) {
    await Category.findOrCreate({
      where: { slug: slugify(name) },
      defaults: {
        name,
        slug: slugify(name),
        displayOrder: index + 1,
        showOnHome: index < 6,
        showAsFeaturedCategory: index < 6,
        showInNavbar: defaultNavbarSlugs.includes(slugify(name))
      }
    });
  }

  for (const store of pickupStores) {
    await PickupStore.findOrCreate({
      where: { name: store.name },
      defaults: store
    });
  }

  const adminEmail = env.adminSeedEmail.toLowerCase();
  const passwordHash = await bcrypt.hash(env.adminSeedPassword, 12);

  await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      name: 'Administrador Uva',
      email: adminEmail,
      passwordHash,
      role: 'admin'
    }
  });

  await sequelize.close();
  console.log('Banco sincronizado e dados iniciais criados.');
};

syncDatabase().catch(async (error) => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
