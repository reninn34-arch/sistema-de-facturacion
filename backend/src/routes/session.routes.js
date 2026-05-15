const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const sessionController = require('../controllers/session.controller');

// Listar sesiones (ADMIN ve todas las de su empresa, usuario normal solo las suyas)
router.get('/api/business/sessions', verifyToken, sessionController.getSessions);

// Revocar una sesión
router.put('/api/business/sessions/:id/revoke', verifyToken, sessionController.revokeSession);

module.exports = router;
