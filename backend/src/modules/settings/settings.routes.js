const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ensureSettings } = require('./settings.service');

ensureSettings();

router.get('/api/admin/settings', settingsController.getSettings);
router.put('/api/admin/settings', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.updateSettings);
router.get('/api/settings/landing-logo', settingsController.getLandingLogo);
router.put('/api/settings/landing-logo', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.saveLandingLogo);
router.get('/api/landing-content', settingsController.getLandingContent);
router.put('/api/landing-content', jwtMiddleware, roleMiddleware(['SUPERADMIN']), settingsController.updateLandingContent);

module.exports = router;
