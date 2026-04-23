// Script unificado para configurar la base de datos
// Uso: node prisma/setup.js
// Este script:
// 1. Genera el cliente Prisma
// 2. Ejecuta las migraciones
// 3. Si es necesario, ejecuta el seed

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completado`);
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
    process.exit(1);
  }
}

async function seedDatabase() {
  console.log('\n🌱 Ejecutando seed...');

  try {
    // 1. Crear Empresa
    const business = await prisma.business.upsert({
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
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        features: { inventory: true, accounting: true, billing: true }
      },
    });

    console.log(`🏢 Empresa creada/actualizada: ${business.name}`);

    // 2. Crear Usuario Superadmin
    const passwordHash = await bcrypt.hash('superadmin123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'superadmin@admin.com' },
      update: {
        password: passwordHash,
        businessId: business.id
      },
      create: {
        email: 'superadmin@admin.com',
        password: passwordHash,
        name: 'Super Admin',
        role: 'SUPERADMIN',
        isActive: true,
        businessId: business.id
      },
    });

    console.log(`👤 Usuario creado/actualizado: ${user.email}`);

    // 3. Crear Secuencial por defecto para facturas
    await prisma.sequence.upsert({
      where: {
        type_establishmentCode_emissionPointCode_businessId: {
          type: '01',
          establishmentCode: '001',
          emissionPointCode: '001',
          businessId: business.id
        }
      },
      update: {},
      create: {
        type: '01',
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: business.id
      }
    });

    // 4. Crear Secuencial para notas de crédito
    await prisma.sequence.upsert({
      where: {
        type_establishmentCode_emissionPointCode_businessId: {
          type: '04',
          establishmentCode: '001',
          emissionPointCode: '001',
          businessId: business.id
        }
      },
      update: {},
      create: {
        type: '04',
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: business.id
      }
    });

    // 5. Crear Secuencial para retenciones
    await prisma.sequence.upsert({
      where: {
        type_establishmentCode_emissionPointCode_businessId: {
          type: '07',
          establishmentCode: '001',
          emissionPointCode: '001',
          businessId: business.id
        }
      },
      update: {},
      create: {
        type: '07',
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: business.id
      }
    });

    // 6. Crear Secuencial para liquidaciones de compra
    await prisma.sequence.upsert({
      where: {
        type_establishmentCode_emissionPointCode_businessId: {
          type: '03',
          establishmentCode: '001',
          emissionPointCode: '001',
          businessId: business.id
        }
      },
      update: {},
      create: {
        type: '03',
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: business.id
      }
    });

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📌 Credenciales de acceso:');
    console.log('   - Email: superadmin@admin.com');
    console.log('   - Password: superadmin123');

  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🚀 CONFIGURACIÓN DE BASE DE DATOS');
  console.log('═══════════════════════════════════════');

  const args = process.argv.slice(2);
  const skipSeed = args.includes('--skip-seed');

  // 1. Generar cliente Prisma
  runCommand('npx prisma generate', 'Generando cliente Prisma');

  // 2. Ejecutar migraciones
  runCommand('npx prisma migrate deploy', 'Ejecutando migraciones');

  // 3. Ejecutar seed (a menos que se indique lo contrario)
  if (!skipSeed) {
    await seedDatabase();
  } else {
    console.log('\n⏭️ Seed omitido (--skip-seed)');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('✅ CONFIGURACIÓN COMPLETA');
  console.log('═══════════════════════════════════════');

  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
