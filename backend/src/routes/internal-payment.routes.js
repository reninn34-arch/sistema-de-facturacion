const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwt.middleware');
const prisma = require('../../prisma/client');

// POST /api/subscriptions/payment-internal - Procesar pago interno de suscripción
router.post('/api/subscriptions/payment-internal', jwtMiddleware, async (req, res) => {
  try {
    const { businessId, plan, paymentMethod, amount, paymentDetails } = req.body;
    
    // Validar datos requeridos
    if (!businessId || !plan || !paymentMethod || !amount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Buscar la empresa
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Calcular nueva fecha de vencimiento según el plan
    const now = new Date();
    let newEndDate = new Date();
    let planDuration = 1; // meses por defecto
    
    // Determinar la duración según el plan
    switch (plan) {
      case 'MONTHLY':
      case 'BASIC':
      case 'FREE':
        planDuration = 1;
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        break;
      case 'GASTRONOMICO':
        planDuration = 1;
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        break;
      case 'SEMIANNUAL':
      case 'PRO':
        planDuration = 6;
        newEndDate.setMonth(newEndDate.getMonth() + 6);
        break;
      case 'YEARLY':
      case 'ENTERPRISE':
        planDuration = 12;
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        break;
      default:
        newEndDate.setMonth(newEndDate.getMonth() + 1);
    }

    // Si la suscripción actual está vencida, extendemos desde hoy
    // Si está activa, extendemos DESDE la fecha actual de vencimiento (sumamos tiempo)
    if (business.subscriptionEnd && new Date(business.subscriptionEnd) > now) {
      // La suscripción está activa, extender desde la fecha de vencimiento actual
      newEndDate = new Date(business.subscriptionEnd);
      
      // Determinar los días a agregar según el plan
      let daysToAdd = 30;
      switch (plan) {
        case 'MONTHLY':
        case 'BASIC':
        case 'FREE':
        case 'GASTRONOMICO':
          daysToAdd = 30;
          break;
        case 'SEMIANNUAL':
        case 'PRO':
          daysToAdd = 180;
          break;
        case 'YEARLY':
        case 'ENTERPRISE':
          daysToAdd = 365;
          break;
        default:
          daysToAdd = 30;
      }
      
      // Agregar los días a la fecha actual de vencimiento
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    }

    let planCode = plan;
    if (plan === 'MONTHLY') planCode = 'BASIC';
    else if (plan === 'SEMIANNUAL') planCode = 'PRO';
    else if (plan === 'YEARLY') planCode = 'ENTERPRISE';

    // Actualizar la empresa con la nueva suscripción
    // NOTA: El plan se actualiza al nuevo plan (el usuario quiere que el nuevo plan sea el anual)
    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: {
        plan: planCode,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
        subscriptionEnd: newEndDate,
        subscriptionStart: now
      }
    });

    // Crear registro de suscripción
    const subscription = await prisma.subscription.create({
      data: {
        businessId: businessId,
        plan: planCode,
        status: 'ACTIVE',
        startDate: now,
        endDate: newEndDate,
        paymentMethod: paymentMethod,
        amount: amount,
        currency: 'USD',
        invoiceNumber: `INV-${Date.now()}`,
        notes: `Pago interno - Plan ${plan} - ${paymentMethod === 'CARD' ? 'Tarjeta' : paymentMethod === 'PAYPAL' ? 'PayPal' : 'Transferencia'}`
      }
    });

    // Generar número de factura secuencial para SaaS
    const lastDocument = await prisma.document.findFirst({
      where: { businessId: businessId, type: 'INVOICE' },
      orderBy: { createdAt: 'desc' }
    });
    let nextNumber = 1;
    if (lastDocument && lastDocument.number) {
      const parts = lastDocument.number.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2]) + 1;
      }
    }
    const invoiceNumber = `001-001-${String(nextNumber).padStart(7, '0')}`;
    const accessKey = `${now.toISOString().split('T')[0].replace(/-/g, '')}01${now.getTime().toString().slice(-11)}${String(Math.floor(Math.random() * 99999999999)).padStart(13, '0')}1`;

    // Crear documento de factura para que aparezca en Devoluciones
    await prisma.document.create({
      data: {
        businessId: businessId,
        type: 'INVOICE',
        number: invoiceNumber,
        accessKey: accessKey,
        issueDate: now,
        status: 'LOCAL',
        total: parseFloat(amount) || 0,
        entityName: business.name,
        entityRuc: business.ruc,
        entityEmail: business.email,
        paymentStatus: 'PAGADO',
        source: 'WEB',
        invoiceType: 'SaaS'
      }
    });

    console.log(`✅ Pago interno procesado para empresa ${business.name}: Plan ${plan}, hasta ${newEndDate.toISOString()}`);

    res.json({
      success: true,
      message: 'Pago procesado correctamente',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status
      },
      business: {
        id: updatedBusiness.id,
        plan: updatedBusiness.plan,
        subscriptionEnd: updatedBusiness.subscriptionEnd,
        subscriptionStatus: updatedBusiness.subscriptionStatus,
        isActive: updatedBusiness.isActive
      }
    });

  } catch (error) {
    console.error('Error en pago interno:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});

// GET /api/subscriptions/status - Verificar estado de suscripción (para el frontend)
router.get('/api/subscriptions/status', jwtMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.businessId) {
      return res.status(401).json({ error: 'Usuario sin empresa asignada' });
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Verificar si la suscripción está vencida
    const now = new Date();
    const isExpired = !business.subscriptionEnd || new Date(business.subscriptionEnd) < now;
    const isActive = business.isActive && !isExpired;

    // Calcular días restantes o días vencidos
    let daysRemaining = null;
    let daysOverdue = null;
    
    if (business.subscriptionEnd) {
      const diffTime = new Date(business.subscriptionEnd).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        daysRemaining = diffDays;
      } else {
        daysOverdue = Math.abs(diffDays);
      }
    }

    res.json({
      businessId: business.id,
      businessName: business.name,
      plan: business.plan,
      subscriptionStatus: business.subscriptionStatus,
      subscriptionEnd: business.subscriptionEnd,
      isActive: isActive,
      isExpired: isExpired,
      daysRemaining: daysRemaining,
      daysOverdue: daysOverdue,
      requirePayment: isExpired || !isActive
    });

  } catch (error) {
    console.error('Error verificando suscripción:', error);
    res.status(500).json({ error: 'Error al verificar suscripción' });
  }
});

module.exports = router;
