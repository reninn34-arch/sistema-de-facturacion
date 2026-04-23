const express = require('express');
const router = express.Router();
const { validatePayment } = require('../services/paypal.service');
const { catchAsync, AppError } = require('../middleware/error.handler');

/**
 * Endpoint para validar un pago de PayPal
 * POST /api/payment/validate-paypal
 */
router.post('/validate-paypal', catchAsync(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('Se requiere el ID de la orden de PayPal', 400);
  }

  const validation = await validatePayment(orderId);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }

  res.json({
    success: true,
    valid: true,
    orderId: validation.orderId,
    amount: validation.amount,
    currency: validation.currency,
    captureId: validation.captureId
  });
}));

module.exports = router;
