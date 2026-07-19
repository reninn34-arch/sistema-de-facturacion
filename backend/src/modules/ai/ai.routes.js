const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const requireCompanyContext = require('../../middleware/requireCompanyContext');
const { chat, insights, audit, getProviders } = require('./ai.controller');

// La IA es para usuarios de empresa; se evita que tokens sin empresa (p.ej. de
// CLIENTE) consuman la cuota/costo de los proveedores de IA del operador.
router.use(verifyToken, requireCompanyContext);

router.post('/api/ai/chat', chat);
router.post('/api/ai/insights', insights);
router.get('/api/ai/audit', audit);
router.get('/api/ai/providers', getProviders);

module.exports = router;
