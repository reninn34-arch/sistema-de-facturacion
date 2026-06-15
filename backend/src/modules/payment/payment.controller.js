const { catchAsync } = require('../../middleware/error.handler');
const PaymentService = require('./payment.service');

const paymentController = {
  validatePaypal: catchAsync(async (req, res) => {
    const { orderId } = req.body;
    const validation = await PaymentService.validatePaypalOrder(orderId);
    res.json({
      success: true,
      valid: true,
      orderId: validation.orderId,
      amount: validation.amount,
      currency: validation.currency,
      captureId: validation.captureId
    });
  })
};

module.exports = paymentController;
