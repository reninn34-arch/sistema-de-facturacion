const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const aiController = require('../controllers/ai.controller');


// =================================================================
// MÓDULO DE INTELIGENCIA ARTIFICIAL
// =================================================================

router.post('/api/ai/chat', verifyToken, aiController.chat);
router.post('/api/ai/insights', verifyToken, aiController.insights);

module.exports = router;
