const prisma = require('../../../prisma/client');

const ActivationRequestService = {
  async getAll(status) {
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.activationRequest.findMany({
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
  },

  async getById(id) {
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
      const err = new Error('Solicitud no encontrada');
      err.statusCode = 404;
      throw err;
    }

    return request;
  },

  async create(data) {
    const { businessId, plan, amount, paymentMethod, referenceNumber } = data;

    if (!businessId || !plan || !amount) {
      const err = new Error('Faltan datos requeridos');
      err.statusCode = 400;
      throw err;
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      const err = new Error('Empresa no encontrada');
      err.statusCode = 404;
      throw err;
    }

    return prisma.activationRequest.create({
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
  },

  async uploadProof(id, data) {
    const { paymentProofUrl, paymentProofName } = data;

    return prisma.activationRequest.update({
      where: { id },
      data: {
        paymentProofUrl: paymentProofUrl || null,
        paymentProofName: paymentProofName || null
      }
    });
  },

  async approve(id, adminNotes, adminId) {
    const currentRequest = await prisma.activationRequest.findUnique({
      where: { id },
      include: { business: true }
    });

    if (!currentRequest) {
      const err = new Error('Solicitud no encontrada');
      err.statusCode = 404;
      throw err;
    }

    if (currentRequest.status !== 'PENDING') {
      const err = new Error('La solicitud ya ha sido procesada');
      err.statusCode = 400;
      throw err;
    }

    // Fuente única de verdad: la duración configurada del plan en la BD (igual que
    // admin.service). Antes un switch hardcodeado daba duraciones equivocadas para
    // planes no listados (p.ej. YEARLY/SEMIANNUAL/MONTHLY caían a 30 días) y
    // contradecía los valores editables del plan.
    const planRecord = await prisma.subscriptionPlan.findUnique({
      where: { code: currentRequest.plan },
      select: { durationDays: true }
    });
    const durationDays = planRecord?.durationDays || 30;

    const now = new Date();
    let startDate = now;
    let endDate = new Date();

    const business = await prisma.business.findUnique({
      where: { id: currentRequest.businessId }
    });

    if (business && business.subscriptionEnd && new Date(business.subscriptionEnd) > now) {
      startDate = now;
      endDate = new Date(business.subscriptionEnd);
      endDate.setDate(endDate.getDate() + durationDays);
    } else {
      endDate.setDate(endDate.getDate() + durationDays);
    }

    // Todas las escrituras en una transacción: si algo falla, no queda estado
    // parcial (ej. empresa activada pero solicitud aún PENDING).
    const { updatedBusiness, activationRequest } = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: currentRequest.businessId },
        data: {
          plan: currentRequest.plan,
          isActive: true,
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: startDate,
          subscriptionEnd: endDate
        }
      });

      await tx.subscription.create({
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

      const lastDocument = await tx.document.findFirst({
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

      await tx.document.create({
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

      const activationRequest = await tx.activationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminNotes,
          processedBy: adminId,
          processedAt: new Date()
        }
      });

      return { updatedBusiness, activationRequest };
    });

    return { request: activationRequest, business: updatedBusiness };
  },

  async reject(id, adminNotes, adminId) {
    const currentRequest = await prisma.activationRequest.findUnique({
      where: { id }
    });

    if (!currentRequest) {
      const err = new Error('Solicitud no encontrada');
      err.statusCode = 404;
      throw err;
    }

    if (currentRequest.status !== 'PENDING') {
      const err = new Error('La solicitud ya ha sido procesada');
      err.statusCode = 400;
      throw err;
    }

    const activationRequest = await prisma.activationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes,
        processedBy: adminId,
        processedAt: new Date()
      }
    });

    return activationRequest;
  },

  async getByBusiness(businessId) {
    return prisma.activationRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });
  }
};

module.exports = ActivationRequestService;
