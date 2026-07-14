const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ensureSettings } = require('./settings.service');

// Inicializar AppSettings de forma diferida (no en top-level para evitar
// que un fallo de Prisma en el arranque crashee todo el servidor)
let settingsInitialized = false;
const initSettings = async (req, res, next) => {
  if (!settingsInitialized) {
    try {
      await ensureSettings();
      settingsInitialized = true;
    } catch (err) {
      console.error('[Settings] No se pudo inicializar AppSettings:', err.message);
    }
  }
  next();
};

router.get('/api/admin/settings', initSettings, settingsController.getSettings);
router.put('/api/admin/settings', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.updateSettings);
router.get('/api/settings/landing-logo', initSettings, settingsController.getLandingLogo);
router.put('/api/settings/landing-logo', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.saveLandingLogo);
router.get('/api/landing-content', initSettings, settingsController.getLandingContent);
router.put('/api/landing-content', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.updateLandingContent);

module.exports = router;
