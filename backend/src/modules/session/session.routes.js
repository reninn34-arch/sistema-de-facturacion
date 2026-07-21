const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const sessionController = require('./session.controller');

router.get('/api/business/sessions', verifyToken, sessionController.getSessions);

router.put('/api/business/sessions/:id/revoke', verifyToken, sessionController.revokeSession);
router.post('/api/business/sessions/revoke-others', verifyToken, sessionController.revokeOtherSessions);

module.exports = router;
