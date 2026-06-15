const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const controller = require('./referrals.controller');

router.get('/api/referrals/code', verifyToken, controller.getCode);
router.get('/api/referrals', verifyToken, controller.getHistory);
router.post('/api/referrals', verifyToken, controller.register);
router.post('/api/referrals/redeem', verifyToken, controller.redeem);
router.get('/api/referrals/prizes', verifyToken, controller.getPrizes);

module.exports = router;
