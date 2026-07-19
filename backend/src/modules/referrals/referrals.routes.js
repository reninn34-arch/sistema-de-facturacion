const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const requireCompanyContext = require('../../middleware/requireCompanyContext');
const controller = require('./referrals.controller');

// Todas las rutas de referidos operan sobre la empresa del usuario.
router.use(verifyToken, requireCompanyContext);

router.get('/api/referrals/code', controller.getCode);
router.get('/api/referrals', controller.getHistory);
router.post('/api/referrals', controller.register);
router.post('/api/referrals/redeem', controller.redeem);
router.get('/api/referrals/prizes', controller.getPrizes);

module.exports = router;
