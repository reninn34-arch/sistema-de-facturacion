const { validatePayment } = require('../../services/paypal.service');
const { AppError } = require('../../middleware/error.handler');

const PaymentService = {
  async validatePaypalOrder(orderId) {
    if (!orderId) {
      throw new AppError('Se requiere el ID de la orden de PayPal', 400);
    }
    const validation = await validatePayment(orderId);
    if (!validation.valid) {
      throw new AppError(validation.error, 400);
    }
    return validation;
  }
};

module.exports = PaymentService;
