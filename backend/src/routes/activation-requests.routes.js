const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwt.middleware');
const roleMiddleware = require('../middleware/role.middleware');
// Usar cliente compartido de Prisma
const prisma = require('../../prisma/client');

// GET /api/activation-requests - Obtener todas las solicitudes (solo SUPERADMIN)
router.get('/', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.activationRequest.findMany({
      where,
      include: {
        business: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching activation requests:', error);
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

// GET /api/activation-requests/:id - Obtener una solicitud específica
router.get('/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.activationRequest.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            users: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Error fetching activation request:', error);
    res.status(500).json({ error: 'Error al obtener la solicitud' });
  }
});

// POST /api/activation-requests - Crear una nueva solicitud (empresa)
router.post('/', jwtMiddleware, async (req, res) => {
  try {
    const { businessId, plan, amount, paymentMethod, referenceNumber } = req.body;

    if (!businessId || !plan || !amount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Verificar que la empresa existe
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const activationRequest = await prisma.activationRequest.create({
      data: {
        businessId,
        plan,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'TRANSFER',
        referenceNumber,
        status: 'PENDING'
      },
      include: {
        business: true
      }
    });

    res.status(201).json({ request: activationRequest });
  } catch (error) {
    console.error('Error creating activation request:', error);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
});

// PUT /api/activation-requests/:id/upload-proof - Subir comprobante de pago
router.put('/:id/upload-proof', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentProofUrl, paymentProofName } = req.body;
    
    console.log('Upload proof - Request ID:', id);
    console.log('Upload proof - paymentProofUrl length:', paymentProofUrl ? paymentProofUrl.length : 0);
    console.log('Upload proof - paymentProofName:', paymentProofName);

    const request = await prisma.activationRequest.update({
      where: { id },
      data: {
        paymentProofUrl: paymentProofUrl || null,
        paymentProofName: paymentProofName || null
      }
    });

    res.json({ request });
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({ error: 'Error al subir el comprobante' });
  }
});

// PUT /api/activation-requests/:id/approve - Aprobar solicitud (SUPERADMIN)
router.put('/:id/approve', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    // Obtener el usuario que aprueba
    const adminId = req.user?.id || 'SYSTEM';

    // Obtener la solicitud actual
    const currentRequest = await prisma.activationRequest.findUnique({
      where: { id },
      include: { business: true }
    });

    if (!currentRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (currentRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'La solicitud ya ha sido procesada' });
    }

    // Calcular la fecha de fin de suscripción según el plan
    let durationDays = 30; // Por defecto 30 días
    switch (currentRequest.plan) {
      case 'BASIC':
        durationDays = 30; // 1 mes
        break;
      case 'PRO':
        durationDays = 180; // 6 meses
        break;
      case 'ENTERPRISE':
        durationDays = 365; // 1 año
        break;
      case 'UNLIMITED':
        durationDays = 365 * 10; // 10 años para ilimitado
        break;
      default:
        durationDays = 30;
    }

    const now = new Date();
    let startDate = now;
    let endDate = new Date();
    
    // Obtener la empresa para verificar si ya tiene suscripción activa
    const business = await prisma.business.findUnique({
      where: { id: currentRequest.businessId }
    });

    // Si la suscripción actual está activa, extendemos desde la fecha de vencimiento actual (sumamos tiempo)
    if (business && business.subscriptionEnd && new Date(business.subscriptionEnd) > now) {
      // La suscripción está activa, extender desde la fecha de vencimiento actual
      startDate = now; // El nuevo período de suscripción empieza desde ahora
      endDate = new Date(business.subscriptionEnd); // Pero la fecha de fin se extiende desde la fecha actual de vencimiento
      endDate.setDate(endDate.getDate() + durationDays);
    } else {
      // La suscripción está vencida o no existe, crear desde hoy
      endDate.setDate(endDate.getDate() + durationDays);
    }

    // Actualizar la empresa con el nuevo plan y fechas (el plan se actualiza al nuevo plan)
    const updatedBusiness = await prisma.business.update({
      where: { id: currentRequest.businessId },
      data: {
        plan: currentRequest.plan,
        isActive: true,
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: startDate,
        subscriptionEnd: endDate
      }
    });

    // Crear registro de suscripción
    await prisma.subscription.create({
      data: {
        businessId: currentRequest.businessId,
        plan: currentRequest.plan,
        status: 'ACTIVE',
        startDate,
        endDate,
        paymentMethod: currentRequest.paymentMethod,
        amount: currentRequest.amount,
        currency: currentRequest.currency,
        paymentId: currentRequest.referenceNumber,
        notes: `Activación aprobada por transferencia - ${adminNotes || 'Sin notas'}`
      }
    });

    // Generar número de factura secuencial para SaaS
    const lastDocument = await prisma.document.findFirst({
      where: { businessId: currentRequest.businessId, type: 'INVOICE' },
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
        businessId: currentRequest.businessId,
        type: 'INVOICE',
        number: invoiceNumber,
        accessKey: accessKey,
        issueDate: now,
        status: 'LOCAL',
        total: parseFloat(currentRequest.amount) || 0,
        entityName: business.name,
        entityRuc: business.ruc,
        entityEmail: business.email,
        paymentStatus: 'PAGADO',
        source: 'WEB',
        invoiceType: 'SaaS'
      }
    });

    // Actualizar la solicitud como aprobada
    const activationRequest = await prisma.activationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminNotes,
        processedBy: adminId,
        processedAt: new Date()
      }
    });

    res.json({ 
      request: activationRequest,
      business: updatedBusiness,
      message: 'Solicitud aprobada y suscripción activada correctamente'
    });
  } catch (error) {
    console.error('Error approving activation request:', error);
    res.status(500).json({ error: 'Error al aprobar la solicitud' });
  }
});

// PUT /api/activation-requests/:id/reject - Rechazar solicitud (SUPERADMIN)
router.put('/:id/reject', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    // Obtener el usuario que rechaza
    const adminId = req.user?.id || 'SYSTEM';

    const currentRequest = await prisma.activationRequest.findUnique({
      where: { id }
    });

    if (!currentRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (currentRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'La solicitud ya ha sido procesada' });
    }

    // Actualizar la solicitud como rechazada
    const activationRequest = await prisma.activationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes,
        processedBy: adminId,
        processedAt: new Date()
      }
    });

    res.json({ 
      request: activationRequest,
      message: 'Solicitud rechazada'
    });
  } catch (error) {
    console.error('Error rejecting activation request:', error);
    res.status(500).json({ error: 'Error al rechazar la solicitud' });
  }
});

// GET /api/activation-requests/business/:businessId - Obtener solicitudes de una empresa
router.get('/business/:businessId', jwtMiddleware, async (req, res) => {
  try {
    const { businessId } = req.params;

    const requests = await prisma.activationRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching business activation requests:', error);
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
});

module.exports = router;
