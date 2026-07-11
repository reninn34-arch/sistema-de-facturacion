// backend/prisma/seed.js
// Semilla de datos inicial para el sistema
// Uso: npx prisma db seed (configurado en package.json)
// Este seed incluye:
// 1. Empresa Superadmin (ECUAFACT SAAS GLOBAL) - Para administración del SaaS
// 2. Empresa Demo de Pruebas - Para pruebas que emulan producción

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');
  console.log('═══════════════════════════════════════');

  // ============================================
  // 1. CREAR EMPRESA SUPERADMIN (Producción/SaaS)
  // ============================================
  const superAdminBusiness = await prisma.business.upsert({
    where: { ruc: '0953443769' },
    update: {},
    create: {
      name: 'ECUAFACT SAAS GLOBAL',
      ruc: '0953443769',
      email: 'adriplaza23@gmail.com',
      address: 'Guayaquil, Ecuador',
      phone: '0982414546',
      plan: 'UNLIMITED',
      isActive: true,
      isProduction: true,
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 20)),
      subscriptionStatus: 'ACTIVE',
      features: { inventory: true, accounting: true, billing: true, ai: true, reports: true },
      isDemo: false
    },
  });

  console.log(`🏢 Empresa Superadmin creada: ${superAdminBusiness.name}`);

  // Crear Usuario Superadmin
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@admin.com' },
    update: {
      password: superAdminPassword,
      businessId: superAdminBusiness.id
    },
    create: {
      email: 'superadmin@admin.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPERADMIN',
      isActive: true,
      businessId: superAdminBusiness.id
    },
  });

  console.log(`👤 Usuario Superadmin creado: ${superAdminUser.email} / Password: superadmin123`);

  // ============================================
  // 2. CREAR EMPRESA DEMO (Para pruebas de producción)
  // ============================================
  const demoBusiness = await prisma.business.upsert({
    where: { ruc: '0999999999001' },
    update: {},
    create: {
      name: 'EMPRESA DEMO S.A.',
      ruc: '0999999999001',
      email: 'demo@empresa.com',
      address: 'Quito, Ecuador',
      phone: '0999999999',
      plan: 'PRO',
      isActive: true,
      isProduction: false,
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      features: { inventory: true, accounting: true, billing: true, ai: true, reports: true },
      isDemo: true
    },
  });

  console.log(`🏢 Empresa Demo creada: ${demoBusiness.name}`);

  // Crear Usuario Admin Demo
  const demoPassword = await bcrypt.hash('demo123456', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@empresa.com' },
    update: {
      password: demoPassword,
      businessId: demoBusiness.id
    },
    create: {
      email: 'demo@empresa.com',
      password: demoPassword,
      name: 'Admin Demo',
      role: 'ADMIN',
      isActive: true,
      businessId: demoBusiness.id
    },
  });

  console.log(`👤 Usuario Demo creado: ${demoUser.email} / Password: demo123456`);

  // ============================================
  // 3. CREAR SECUENCIALES PARA EMPRESA SUPERADMIN
  // ============================================
  const sequenceTypes = ['01', '04', '07', '03']; // Factura, Nota Crédito, Retención, Liquidación
  
  await Promise.all(
    sequenceTypes.map(type =>
      prisma.sequence.upsert({
        where: {
          type_establishmentCode_emissionPointCode_businessId: {
            type: type,
            establishmentCode: '001',
            emissionPointCode: '001',
            businessId: superAdminBusiness.id
          }
        },
        update: {},
        create: {
          type: type,
          establishmentCode: '001',
          emissionPointCode: '001',
          currentValue: 1,
          businessId: superAdminBusiness.id
        }
      })
    )
  );

  console.log(`📊 Secuenciales creados para Superadmin`);

  // ============================================
  // 4. CREAR SECUENCIALES PARA EMPRESA DEMO
  // ============================================
  await Promise.all(
    sequenceTypes.map(type =>
      prisma.sequence.upsert({
        where: {
          type_establishmentCode_emissionPointCode_businessId: {
            type: type,
            establishmentCode: '001',
            emissionPointCode: '001',
            businessId: demoBusiness.id
          }
        },
        update: {},
        create: {
          type: type,
          establishmentCode: '001',
          emissionPointCode: '001',
          currentValue: 1,
          businessId: demoBusiness.id
        }
      })
    )
  );

  console.log(`📊 Secuenciales creados para Demo`);

  // ============================================
  // 5. CREAR MÓDULOS DEL SISTEMA
  // ============================================
  const modules = [
    { code: 'invoices', name: 'Facturación', description: 'Emisión de facturas electrónicas', icon: 'DocumentTextIcon', displayOrder: 1 },
    { code: 'credit-notes', name: 'Notas de Crédito', description: 'Emisión de notas de crédito', icon: 'ArrowPathIcon', displayOrder: 2 },
    { code: 'retentions', name: 'Retenciones', description: 'Comprobantes de retención', icon: 'BanknotesIcon', displayOrder: 3 },
    { code: 'remittances', name: 'Guías de Remisión', description: 'Guías de remisión electrónicas', icon: 'TruckIcon', displayOrder: 4 },
    { code: 'settlements', name: 'Liquidaciones', description: 'Liquidaciones de compra', icon: 'ClipboardDocumentListIcon', displayOrder: 5 },
    { code: 'reports', name: 'Reportes', description: 'Reportes y análisis', icon: 'ChartBarIcon', displayOrder: 6 },
    { code: 'caja', name: 'Caja (Venta Rápida)', description: 'Punto de venta rápido', icon: 'TicketIcon', displayOrder: 7 },
    { code: 'clients', name: 'Clientes', description: 'Gestión de clientes y proveedores', icon: 'UsersIcon', displayOrder: 8 },
    { code: 'products', name: 'Productos', description: 'Inventario y productos', icon: 'TagIcon', displayOrder: 9 },
    { code: 'production', name: 'Producción', description: 'Recetas y registros de producción', icon: 'BeakerIcon', displayOrder: 10 },
    { code: 'config', name: 'Configuración', description: 'Perfil de empresa y ajustes', icon: 'Cog6ToothIcon', displayOrder: 11 },
    { code: 'integrations', name: 'Integraciones', description: 'Integración con tiendas web', icon: 'LinkIcon', displayOrder: 12 },
    { code: 'ai-assistant', name: 'Asistente IA', description: 'Asistente de inteligencia artificial', icon: 'SparklesIcon', displayOrder: 13 },
    { code: 'audit', name: 'Auditoría en Tiempo Real', description: 'Análisis inteligente del negocio', icon: 'MegaphoneIcon', displayOrder: 14 },
  ];

  await Promise.all(
    modules.map(mod =>
      prisma.module.upsert({
        where: { code: mod.code },
        update: mod,
        create: mod
      })
    )
  );

  console.log(`📦 Módulos del sistema creados (${modules.length})`);

  // ============================================
  // 6. CREAR PLANES DE SUSCRIPCIÓN POR DEFECTO
  // ============================================
  const plans = [
    { code: 'FREE', name: 'Plan Gratuito', description: 'Plan gratuito para pruebas y micro-emprendedores', price: 0, priceWithTax: 0, period: 'mensual', durationDays: 30, features: ['1 empresa', '10 facturas/mes', 'Soporte por email'], maxInvoicesPerMonth: 10, maxBusinesses: 1, maxUsers: 1, maxEmissionPoints: 1, hasAIAssistant: false, hasPrioritySupport: false, hasAudit: false, hasModuleControl: false, isActive: true, displayOrder: 1 },
    { code: 'BASIC', name: 'Plan Básico', description: 'Plan básico para pequeñas empresas', price: 30.43, priceWithTax: 35.00, period: 'mensual', durationDays: 30, features: ['1 empresa', '100 facturas/mes', 'Reportes básicos', 'Soporte por email'], maxInvoicesPerMonth: 100, maxBusinesses: 1, maxUsers: 3, maxEmissionPoints: 1, hasAIAssistant: false, hasPrioritySupport: false, hasAudit: false, hasModuleControl: false, isActive: true, displayOrder: 2 },
    { code: 'GASTRONOMICO', name: 'Plan Gastronómico', description: 'Para restaurantes, panaderías, cafeterías y negocios de comida', price: 78.26, priceWithTax: 90.00, period: 'mensual', durationDays: 30, features: ['1 empresa', '300 facturas/mes', 'Caja POS', 'Recetas y producción', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario'], maxInvoicesPerMonth: 300, maxBusinesses: 1, maxUsers: 5, maxEmissionPoints: 2, hasAIAssistant: true, hasPrioritySupport: true, hasAudit: true, hasModuleControl: true, isActive: true, displayOrder: 3 },
    { code: 'PRO', name: 'Plan Profesional', description: 'Plan profesional para negocios en crecimiento', price: 130.43, priceWithTax: 150.00, period: 'mensual', durationDays: 30, features: ['3 empresas', '500 facturas/mes', 'Clientes ilimitados', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario'], maxInvoicesPerMonth: 500, maxBusinesses: 3, maxUsers: 10, maxEmissionPoints: 2, hasAIAssistant: true, hasPrioritySupport: true, hasAudit: true, hasModuleControl: true, isActive: true, displayOrder: 4 },
    { code: 'ENTERPRISE', name: 'Plan Empresarial', description: 'Plan empresarial para grandes organizaciones', price: 217.39, priceWithTax: 250.00, period: 'mensual', durationDays: 30, features: ['10 empresas', '2000 facturas/mes', 'Clientes ilimitados', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario', 'Acceso a la API', 'Multi-usuarios'], maxInvoicesPerMonth: 2000, maxBusinesses: 10, maxUsers: 50, maxEmissionPoints: 3, hasAIAssistant: true, hasPrioritySupport: true, hasAudit: true, hasModuleControl: true, isActive: true, displayOrder: 5 },
    { code: 'UNLIMITED', name: 'Plan Ilimitado', description: 'Plan ilimitado para superadmins y distribuidores', price: 0, priceWithTax: 0, period: 'indefinido', durationDays: 36500, features: ['Empresas ilimitadas', 'Facturas ilimitadas', 'Clientes ilimitados', 'Asistente IA', 'Reportes avanzados', 'Soporte prioritario', 'Acceso a la API', 'Multi-usuarios', 'Gestión de distribuidores'], maxInvoicesPerMonth: 999999, maxBusinesses: 999, maxUsers: 999999, maxEmissionPoints: 3, hasAIAssistant: true, hasPrioritySupport: true, hasAudit: true, hasModuleControl: true, isActive: true, displayOrder: 6 }
  ];

  await Promise.all(
    plans.map(plan =>
      prisma.subscriptionPlan.upsert({
        where: { code: plan.code },
        update: plan,
        create: plan
      })
    )
  );

  console.log(`📦 Planes de suscripción creados`);

  // ============================================
  // 7. CONFIGURACIÓN DE PUNTOS Y PREMIOS
  // ============================================
  await prisma.pointsConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', enabled: true, pointsPerReferral: 50, maxRedemptionsPerMonth: 3 }
  });

  const prizes = [
    { name: '1 Mes Adicional Gratis', description: 'Extiende tu suscripcion 30 dias', points: 100, icon: '🎁', displayOrder: 1 },
    { name: 'Facturas Ilimitadas x 1 Mes', description: 'Sin limite de facturas por 30 dias', points: 200, icon: '📄', displayOrder: 2 },
    { name: 'Descuento 25% en Renovacion', description: '25% de descuento en tu proxima renovacion', points: 150, icon: '💰', displayOrder: 3 },
    { name: 'Asistente IA Premium x 3 Meses', description: 'Gemini AI sin restricciones por 3 meses', points: 250, icon: '🤖', displayOrder: 4 },
    { name: 'Logo Personalizado en PDF', description: 'Diseno de logo para tus facturas', points: 300, icon: '🎨', displayOrder: 5 },
  ];

  await Promise.all(
    prizes.map(prize =>
      prisma.prize.upsert({
        where: { id: `prize_${prize.displayOrder}` },
        update: prize,
        create: { id: `prize_${prize.displayOrder}`, ...prize }
      })
    )
  );

  console.log(`📦 Puntos: configuración y ${prizes.length} premios creados`);

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Seed completado exitosamente!');
  console.log('═══════════════════════════════════════');
  console.log('\n📌 Credenciales de acceso:');
  console.log('\n🔧 SUPERADMIN (Gestión del SaaS):');
  console.log('   - Email: superadmin@admin.com');
  console.log('   - Password: superadmin123');
  console.log('\n🧪 EMPRESA DEMO (Pruebas de producción):');
  console.log('   - Email: demo@empresa.com');
  console.log('   - Password: demo123456');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
