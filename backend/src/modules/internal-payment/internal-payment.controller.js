const InternalPaymentService = require('./internal-payment.service');

const internalPaymentController = {
  async processPayment(req, res) {
    try {
      const { businessId, plan, paymentMethod, amount, paymentDetails } = req.body;
      const result = await InternalPaymentService.processInternalPayment({
        businessId, plan, paymentMethod, amount, paymentDetails
      });

      res.json({
        success: true,
        message: 'Pago procesado correctamente',
        subscription: {
          id: result.subscription.id,
          plan: result.subscription.plan,
          startDate: result.subscription.startDate,
          endDate: result.subscription.endDate,
          status: result.subscription.status
        },
        business: result.business
      });
    } catch (error) {
      if (error.message === 'Faltan datos requeridos') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Empresa no encontrada') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error en pago interno:', error);
      res.status(500).json({ error: 'Error al procesar el pago' });
    }
  },

  async getStatus(req, res) {
    try {
      const status = await InternalPaymentService.checkSubscriptionStatus(req.user);
      res.json(status);
    } catch (error) {
      if (error.message === 'Usuario sin empresa asignada') {
        return res.status(401).json({ error: error.message });
      }
      if (error.message === 'Empresa no encontrada') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error verificando suscripción:', error);
      res.status(500).json({ error: 'Error al verificar suscripción' });
    }
  }
};

module.exports = internalPaymentController;
