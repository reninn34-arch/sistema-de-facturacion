const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const rateLimit = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiadas consultas. Intente mas tarde.' }
});

router.get('/api/public/activation-status', publicLimiter, async (req, res) => {
  try {
    const { ruc } = req.query;
    if (!ruc || typeof ruc !== 'string' || ruc.length < 10) {
      return res.status(400).json({ success: false, message: 'Ingrese un RUC valido (13 digitos).' });
    }

    const business = await prisma.business.findUnique({
      where: { ruc },
      select: {
        name: true,
        ruc: true,
        plan: true,
        subscriptionStatus: true,
        isActive: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true
      }
    });

    if (!business) {
      const activationReq = await prisma.activationRequest.findFirst({
        where: { business: { ruc } },
        include: { business: { select: { name: true, ruc: true, plan: true } } },
        orderBy: { createdAt: 'desc' }
      });

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
});

module.exports = router;
