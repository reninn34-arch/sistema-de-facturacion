const prisma = require('../../../prisma/client');

const defaultPlans = [
  {
    code: 'FREE',
    name: 'Plan Gratuito',
    description: 'Plan gratuito para pruebas y micro-emprendedores',
    price: 0,
    priceWithTax: 0,
    period: 'mensual',
    durationDays: 30,
    features: ['1 empresa', '10 facturas/mes', 'Soporte por email'],
    maxBusinesses: 1,
    maxInvoicesPerMonth: 10,
    hasAIAssistant: false,
    hasPrioritySupport: false,
    hasAudit: false,
    isActive: true,
    displayOrder: 1
  },
  {
    code: 'BASIC',
    name: 'Plan Básico',
    description: 'Plan básico para pequeñas empresas',
    price: 29.99,
    priceWithTax: 34.49,
    period: 'mensual',
    durationDays: 30,
    features: ['1 empresa', '100 facturas/mes', 'Reportes básicos', 'Soporte por email'],
    maxBusinesses: 1,
    maxInvoicesPerMonth: 100,
    hasAIAssistant: false,
    hasPrioritySupport: false,
    hasAudit: false,
    isActive: true,
    displayOrder: 2
  },
  {
    code: 'GASTRONOMICO',
    name: 'Plan Gastronómico',
    description: 'Para restaurantes, panaderías, cafeterías y negocios de comida',
    price: 79.99,
    priceWithTax: 91.99,
    period: 'mensual',
    durationDays: 30,
    features: ['1 empresa', '300 facturas/mes', 'Caja POS', 'Recetas y Producción', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario'],
    maxBusinesses: 1,
    maxInvoicesPerMonth: 300,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    hasAudit: true,
    isActive: true,
    displayOrder: 3
  },
  {
    code: 'PRO',
    name: 'Plan Profesional',
    description: 'Plan profesional para negocios en crecimiento',
    price: 149.99,
    priceWithTax: 172.49,
    period: 'mensual',
    durationDays: 30,
    features: ['3 empresas', '500 facturas/mes', 'Clientes ilimitados', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario'],
    maxBusinesses: 3,
    maxInvoicesPerMonth: 500,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    hasAudit: true,
    isActive: true,
    displayOrder: 4
  },
  {
    code: 'ENTERPRISE',
    name: 'Plan Empresarial',
    description: 'Plan empresarial para grandes organizaciones',
    price: 249.99,
    priceWithTax: 287.49,
    period: 'mensual',
    durationDays: 30,
    features: ['10 empresas', '2000 facturas/mes', 'Clientes ilimitados', 'Asistente IA', 'Reportes avanzados', 'Soporte 24/7', 'API Access', 'Multi-usuarios'],
    maxBusinesses: 10,
    maxInvoicesPerMonth: 2000,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    hasAudit: true,
    isActive: true,
    displayOrder: 5
  },
  {
    code: 'UNLIMITED',
    name: 'Plan Ilimitado',
    description: 'Plan ilimitado para superadmins y distribuidores',
    price: 0,
    priceWithTax: 0,
    period: 'indefinido',
    durationDays: 36500,
    features: ['Empresas ilimitadas', 'Facturas ilimitadas', 'Asistente IA', 'Soporte 24/7', 'API Access', 'Gestión de resellers'],
    maxBusinesses: 999,
    maxInvoicesPerMonth: 999999,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    hasAudit: true,
    isActive: true,
    displayOrder: 6
  },
  {
    code: 'PENDING',
    name: 'Pendiente',
    description: 'Suscripción pendiente de pago o confirmación',
    price: 0,
    priceWithTax: 0,
    period: 'mensual',
    durationDays: 0,
    features: ['Sin acceso hasta confirmar pago'],
    maxBusinesses: 0,
    maxInvoicesPerMonth: 0,
    hasAIAssistant: false,
    hasPrioritySupport: false,
    hasAudit: false,
    isActive: true,
    displayOrder: 0
  }
];

async function initializePlans() {
  try {
    const count = await prisma.subscriptionPlan.count();
    if (count === 0) {
      console.log('Inicializando planes de suscripción por defecto...');
      await prisma.subscriptionPlan.createMany({
        data: defaultPlans
      });
      console.log('Planes de suscripción inicializados correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar planes:', error);
  }
}

const SubscriptionPlanService = {
  async getActivePlans() {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
  },

  async getAllPlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: 'asc' }
    });
  },

  async getPlanById(id) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    if (!plan) {
      const err = new Error('Plan no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return plan;
  },

  async createPlan(data) {
    const { code, name, description, price, priceWithTax, period, durationDays, features, maxBusinesses, maxInvoicesPerMonth, hasAIAssistant, hasPrioritySupport, hasAudit, isActive, displayOrder } = data;

    if (!code || !name) {
      const err = new Error('Código y nombre son obligatorios');
      err.statusCode = 400;
      throw err;
    }

    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: code.toUpperCase() }
    });
    if (existingPlan) {
      const err = new Error('Ya existe un plan con ese código');
      err.statusCode = 400;
      throw err;
    }

    return prisma.subscriptionPlan.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || '',
        price: parseFloat(price) || 0,
        priceWithTax: parseFloat(price) || 0,
        period: period || 'mensual',
        durationDays: parseInt(durationDays) || 30,
        features: features || [],
        maxBusinesses: parseInt(maxBusinesses) || 1,
        maxInvoicesPerMonth: parseInt(maxInvoicesPerMonth) || 10,
        hasAIAssistant: hasAIAssistant || false,
        hasPrioritySupport: hasPrioritySupport || false,
        hasAudit: hasAudit || false,
        isActive: isActive !== false,
        displayOrder: parseInt(displayOrder) || 0,
        ctaType: data.ctaType || 'NORMAL',
        ctaWhatsapp: data.ctaWhatsapp || null
      }
    });
  },

  async updatePlan(id, data) {
    let existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: id }
      });
    }

    if (!existingPlan) {
      const err = new Error('Plan no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const { code, name, description, price, priceWithTax, period, durationDays, features, maxBusinesses, maxInvoicesPerMonth, hasAIAssistant, hasPrioritySupport, hasAudit, isActive, displayOrder } = data;

    if (code && code.toUpperCase() !== existingPlan.code) {
      const planWithCode = await prisma.subscriptionPlan.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (planWithCode) {
        const err = new Error('Ya existe un plan con ese código');
        err.statusCode = 400;
        throw err;
      }
    }

    const finalPrice = parseFloat(price) || existingPlan.price;

    return prisma.subscriptionPlan.update({
      where: { id: existingPlan.id },
      data: {
        code: code ? code.toUpperCase() : existingPlan.code,
        name: name || existingPlan.name,
        description: description !== undefined ? description : existingPlan.description,
        price: finalPrice,
        priceWithTax: finalPrice,
        period: period || existingPlan.period,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : existingPlan.durationDays,
        features: features || existingPlan.features,
        maxBusinesses: maxBusinesses !== undefined ? parseInt(maxBusinesses) : existingPlan.maxBusinesses,
        maxInvoicesPerMonth: maxInvoicesPerMonth !== undefined ? parseInt(maxInvoicesPerMonth) : existingPlan.maxInvoicesPerMonth,
        hasAIAssistant: hasAIAssistant !== undefined ? hasAIAssistant : existingPlan.hasAIAssistant,
        hasPrioritySupport: hasPrioritySupport !== undefined ? hasPrioritySupport : existingPlan.hasPrioritySupport,
        hasAudit: hasAudit !== undefined ? hasAudit : existingPlan.hasAudit,
        isActive: isActive !== undefined ? isActive : existingPlan.isActive,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : existingPlan.displayOrder,
        ctaType: data.ctaType !== undefined ? data.ctaType : existingPlan.ctaType,
        ctaWhatsapp: data.ctaWhatsapp !== undefined ? data.ctaWhatsapp : existingPlan.ctaWhatsapp,
      }
    });
  },

  async deletePlan(id) {
    let existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: id }
      });
    }

    if (!existingPlan) {
      const err = new Error('Plan no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const activePlans = await prisma.subscriptionPlan.count({
      where: { isActive: true }
    });
    if (activePlans === 1 && existingPlan.isActive) {
      const err = new Error('No puedes eliminar el último plan activo');
      err.statusCode = 400;
      throw err;
    }

    await prisma.subscriptionPlan.delete({
      where: { id: existingPlan.id }
    });
  }
};

module.exports = { SubscriptionPlanService, defaultPlans, initializePlans };
