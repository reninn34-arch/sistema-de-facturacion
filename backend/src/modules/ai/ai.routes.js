const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const { chat, insights, audit } = require('./ai.controller');

router.post('/api/ai/chat', verifyToken, chat);
router.post('/api/ai/insights', verifyToken, insights);
router.get('/api/ai/audit', verifyToken, audit);

module.exports = router;
