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
  
  for (const type of sequenceTypes) {
    await prisma.sequence.upsert({
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
    });
  }

  console.log(`📊 Secuenciales creados para Superadmin`);

  // ============================================
  // 4. CREAR SECUENCIALES PARA EMPRESA DEMO
  // ============================================
  for (const type of sequenceTypes) {
    await prisma.sequence.upsert({
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
    });
  }

  console.log(`📊 Secuenciales creados para Demo`);

  // ============================================
  // 5. CREAR PLANES DE SUSCRIPCIÓN POR DEFECTO
  // ============================================
  const plans = [
    { code: 'FREE', name: 'Plan Gratuito', price: 0, priceWithTax: 0, period: 'mensual', durationDays: 30, features: ['facturas_basicas', '5_clientes', 'soporte_email'], maxInvoicesPerMonth: 10, maxBusinesses: 1, hasAIAssistant: false },
    { code: 'BASIC', name: 'Plan Básico', price: 29.99, priceWithTax: 34.49, period: 'mensual', durationDays: 30, features: ['facturas', '50_clientes', 'reportes_basicos', 'soporte_email'], maxInvoicesPerMonth: 100, maxBusinesses: 1, hasAIAssistant: false },
    { code: 'PRO', name: 'Plan Profesional', price: 149.99, priceWithTax: 172.49, period: 'mensual', durationDays: 30, features: ['facturas', 'clientes_ilimitados', 'reportes_avanzados', 'ai_assistant', 'soporte_prioritario'], maxInvoicesPerMonth: 500, maxBusinesses: 3, hasAIAssistant: true, hasPrioritySupport: true },
    { code: 'ENTERPRISE', name: 'Plan Empresarial', price: 249.99, priceWithTax: 287.49, period: 'mensual', durationDays: 30, features: ['facturas', 'clientes_ilimitados', 'reportes_avanzados', 'ai_assistant', 'soporte_prioritario', 'api_access', 'multi_usuarios'], maxInvoicesPerMonth: 2000, maxBusinesses: 10, hasAIAssistant: true, hasPrioritySupport: true },
    { code: 'UNLIMITED', name: 'Plan Ilimitado', price: 0, priceWithTax: 0, period: 'indefinido', durationDays: 36500, features: ['facturas', 'clientes_ilimitados', 'reportes_avanzados', 'ai_assistant', 'soporte_prioritario', 'api_access', 'multi_usuarios'], maxInvoicesPerMonth: 999999, maxBusinesses: 999, hasAIAssistant: true, hasPrioritySupport: true }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }

  console.log(`📦 Planes de suscripción creados`);

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
