const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwt.middleware');
const roleMiddleware = require('../middleware/role.middleware');

// Importar Prisma
const prisma = require('../../prisma/client');

// Datos por defecto para inicializar si no hay planes
// NOTA: Los precios son los valores base sin IVA adicional
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

// Función para inicializar planes por defecto si no existen
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

// Inicializar planes al cargar el módulo
initializePlans();

// GET / - Obtener todos los planes (público para clientes)
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
    res.json({ plans });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// GET /admin - Obtener todos los planes (solo admin)
router.get('/admin', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    res.json({ plans });
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// GET /:id - Obtener un plan específico
router.get('/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: req.params.id }
    });
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json({ plan });
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
});

// POST / - Crear un nuevo plan
router.post('/', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { code, name, description, price, priceWithTax, period, durationDays, features, maxBusinesses, maxInvoicesPerMonth, hasAIAssistant, hasPrioritySupport, hasAudit, isActive, displayOrder } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }

    // Verificar que el código no exista
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: code.toUpperCase() }
    });
    if (existingPlan) {
      return res.status(400).json({ error: 'Ya existe un plan con ese código' });
    }

    // El precio que ingresa el usuario ya es el precio final (con o sin IVA según corresponda)
    // Se guarda directamente sin agregar IVA adicional

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || '',
        price: parseFloat(price) || 0,
        priceWithTax: parseFloat(price) || 0, // Guardamos el mismo valor
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
        ctaType: req.body.ctaType || 'NORMAL',
        ctaWhatsapp: req.body.ctaWhatsapp || null
      }
    });

    res.status(201).json({ plan: newPlan });
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

// PUT /:id - Actualizar un plan
router.put('/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { code, name, description, price, priceWithTax, period, durationDays, features, maxBusinesses, maxInvoicesPerMonth, hasAIAssistant, hasPrioritySupport, hasAudit, isActive, displayOrder } = req.body;
    const id = req.params.id;

    // Buscar plan por ID o por código
    let existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });

    // Si no encuentra por ID, buscar por código
    if (!existingPlan) {
      existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: id }
      });
    }

    if (!existingPlan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // Verificar que el código no exista en otro plan
    if (code && code.toUpperCase() !== existingPlan.code) {
      const planWithCode = await prisma.subscriptionPlan.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (planWithCode) {
        return res.status(400).json({ error: 'Ya existe un plan con ese código' });
      }
    }

    // El precio que ingresa el usuario ya es el precio final (con o sin IVA según corresponda)
    // Se guarda directamente sin agregar IVA adicional
    const finalPrice = parseFloat(price) || existingPlan.price;

    const updatedPlan = await prisma.subscriptionPlan.update({
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
        ctaType: req.body.ctaType !== undefined ? req.body.ctaType : existingPlan.ctaType,
        ctaWhatsapp: req.body.ctaWhatsapp !== undefined ? req.body.ctaWhatsapp : existingPlan.ctaWhatsapp,
      }
    });

    res.json({ plan: updatedPlan });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// DELETE /:id - Eliminar un plan
router.delete('/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const id = req.params.id;

    // Buscar plan por ID o por código
    let existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });

    // Si no encuentra por ID, buscar por código
    if (!existingPlan) {
      existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: id }
      });
    }

    if (!existingPlan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // No permitir eliminar si es el último plan activo
    const activePlans = await prisma.subscriptionPlan.count({
      where: { isActive: true }
    });
    if (activePlans === 1 && existingPlan.isActive) {
      return res.status(400).json({ error: 'No puedes eliminar el último plan activo' });
    }

    await prisma.subscriptionPlan.delete({
      where: { id: existingPlan.id }
    });

    res.json({ message: 'Plan eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
});

module.exports = router;
