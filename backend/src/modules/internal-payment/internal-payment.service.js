const prisma = require('../../../prisma/client');

const InternalPaymentService = {
  async processInternalPayment(data) {
    const { businessId, plan, paymentMethod, amount, paymentDetails } = data;

    if (!businessId || !plan || !paymentMethod || !amount) {
      throw new Error('Faltan datos requeridos');
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      throw new Error('Empresa no encontrada');
    }

    const now = new Date();
    let newEndDate = new Date();
    let planDuration = 1;

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

    if (business.subscriptionEnd && new Date(business.subscriptionEnd) > now) {
      newEndDate = new Date(business.subscriptionEnd);
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
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    }

    let planCode = plan;
    if (plan === 'MONTHLY') planCode = 'BASIC';
    else if (plan === 'SEMIANNUAL') planCode = 'PRO';
    else if (plan === 'YEARLY') planCode = 'ENTERPRISE';

    const [updatedBusiness, subscription, lastDocument] = await Promise.all([
      prisma.business.update({
        where: { id: businessId },
        data: {
          plan: planCode,
          subscriptionStatus: 'ACTIVE',
          isActive: true,
          subscriptionEnd: newEndDate,
          subscriptionStart: now
        }
      }),
      prisma.subscription.create({
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
      }),
      prisma.document.findFirst({
        where: { businessId: businessId, type: 'INVOICE' },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    let nextNumber = 1;
    if (lastDocument && lastDocument.number) {
      const parts = lastDocument.number.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2]) + 1;
      }
    }
    const invoiceNumber = `001-001-${String(nextNumber).padStart(7, '0')}`;
    const accessKey = `${now.toISOString().split('T')[0].replace(/-/g, '')}01${now.getTime().toString().slice(-11)}${String(Math.floor(Math.random() * 99999999999)).padStart(13, '0')}1`;

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

    return {
      subscription,
      business: {
        id: updatedBusiness.id,
        plan: updatedBusiness.plan,
        subscriptionEnd: updatedBusiness.subscriptionEnd,
        subscriptionStatus: updatedBusiness.subscriptionStatus,
        isActive: updatedBusiness.isActive
      }
    };
  },

  async checkSubscriptionStatus(user) {
    if (!user || !user.businessId) {
      throw new Error('Usuario sin empresa asignada');
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId }
    });

    if (!business) {
      throw new Error('Empresa no encontrada');
    }

    const now = new Date();
    const isExpired = !business.subscriptionEnd || new Date(business.subscriptionEnd) < now;
    const isActive = business.isActive && !isExpired;

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

    return {
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
    };
  }
};

module.exports = InternalPaymentService;
