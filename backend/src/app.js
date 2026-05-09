import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, isDevelopment } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { adminRoutes } from './routes/admin.routes.js';
import { addressRoutes } from './routes/address.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { cartRoutes } from './routes/cart.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import { orderRoutes } from './routes/order.routes.js';
import { pickupStoreRoutes } from './routes/pickupStore.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadPath = path.resolve(__dirname, '..', env.uploadDir);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (isDevelopment) {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(uploadPath));

app.get('/api/health', (req, res) => {
  res.json({
    name: 'Uva Moda Fitness API',
    status: 'online'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pickup-stores', pickupStoreRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
