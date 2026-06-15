const express = require('express');
const router = express.Router();
const internalPaymentController = require('./internal-payment.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');

router.post('/api/subscriptions/payment-internal', jwtMiddleware, internalPaymentController.processPayment);
router.get('/api/subscriptions/status', jwtMiddleware, internalPaymentController.getStatus);

module.exports = router;
