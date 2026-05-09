import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getSiteSettings,
  updateSiteSettings
} from '../utils/siteSettings.js';

const imageUrlFromFile = (req, file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

const getUploadedSettingsImages = (req) => {
  const payload = {};

  if (req.files?.logo?.[0]) {
    payload.logoUrl = imageUrlFromFile(req, req.files.logo[0]);
  }

  if (req.files?.favicon?.[0]) {
    payload.faviconUrl = imageUrlFromFile(req, req.files.favicon[0]);
  }

  if (req.files?.headerLogo?.[0]) {
    payload.headerLogoUrl = imageUrlFromFile(req, req.files.headerLogo[0]);
  }

  if (req.files?.footerLogo?.[0]) {
    payload.footerLogoUrl = imageUrlFromFile(req, req.files.footerLogo[0]);
  }

  return payload;
};

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getSiteSettings();
  res.json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await updateSiteSettings({
    ...req.body,
    ...getUploadedSettingsImages(req)
  });

  res.json({ settings });
});
