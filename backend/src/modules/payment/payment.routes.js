const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');

router.post('/api/payment/validate-paypal', paymentController.validatePaypal);

module.exports = router;
