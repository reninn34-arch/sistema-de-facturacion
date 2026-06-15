const service = require('./public.service');

async function getActivationStatus(req, res) {
  try {
    const { ruc } = req.query;
    if (!ruc || typeof ruc !== 'string' || ruc.length < 10) {
      return res.status(400).json({ success: false, message: 'Ingrese un RUC valido (13 digitos).' });
    }

    const { business, activationReq } = await service.getActivationStatus(ruc);

    if (!business) {
      if (!activationReq) {
        return res.json({
          success: true,
          found: false,
          message: 'No se encontro ninguna solicitud con ese RUC. Verifique los datos o registrese primero.'
        });
      }

      return res.json({
        success: true,
        found: true,
        status: activationReq.status,
        plan: activationReq.plan,
        businessName: activationReq.business.name,
        ruc: activationReq.business.ruc,
        adminNotes: activationReq.adminNotes || null,
        requestedAt: activationReq.createdAt,
        processedAt: activationReq.processedAt || null
      });
    }

    res.json({
      success: true,
      found: true,
      businessName: business.name,
      ruc: business.ruc,
      plan: business.plan,
      subscriptionStatus: business.subscriptionStatus,
      isActive: business.isActive,
      subscriptionStart: business.subscriptionStart,
      subscriptionEnd: business.subscriptionEnd,
      createdAt: business.createdAt
    });
  } catch (error) {
    console.error('[PUBLIC] Error consultando estado:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

module.exports = { getActivationStatus };
