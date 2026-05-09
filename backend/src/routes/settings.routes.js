import { Router } from 'express';
import {
  getSettings,
  updateSettings
} from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { uploadSettingsImages } from '../middlewares/upload.js';

export const settingsRoutes = Router();

settingsRoutes.get('/', getSettings);
settingsRoutes.put('/', authenticate, requireAdmin, uploadSettingsImages, updateSettings);
