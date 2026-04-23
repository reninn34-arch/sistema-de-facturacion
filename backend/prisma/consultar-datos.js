// Script para consultar datos de la base de datos usando Prisma
// Uso: node prisma/consultar-datos.js

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Consultando datos de la base de datos...\n');
  
  try {
    // Consultar empresas
    const businesses = await prisma.business.findMany();
    console.log('📊 EMPRESAS:', businesses.length);
    businesses.forEach(b => {
      console.log(`  - ID: ${b.id}`);
      console.log(`    RUC: ${b.ruc}`);
      console.log(`    Nombre: ${b.name}`);
      console.log(`    Email: ${b.email}`);
      console.log('');
    });

    // Consultar usuarios
    const users = await prisma.user.findMany();
    console.log('👥 USUARIOS:', users.length);
    users.forEach(u => {
      console.log(`  - ID: ${u.id}`);
      console.log(`    Email: ${u.email}`);
      console.log(`    Rol: ${u.role}`);
      console.log(`    Negocio: ${u.businessId || 'N/A'}`);
      console.log('');
    });

    // Consultar clientes
    const clients = await prisma.client.findMany();
    console.log('🤝 CLIENTES:', clients.length);
    clients.slice(0, 10).forEach(c => {
      console.log(`  - ID: ${c.id}`);
      console.log(`    RUC: ${c.ruc}`);
      console.log(`    Nombre: ${c.name}`);
      console.log(`    Email: ${c.email || 'N/A'}`);
      console.log('');
    });
    if (clients.length > 10) {
      console.log(`  ... y ${clients.length - 10} clientes más`);
    }

    // Consultar productos
    const products = await prisma.product.findMany();
    console.log('📦 PRODUCTOS:', products.length);
    products.slice(0, 10).forEach(p => {
      console.log(`  - ID: ${p.id}`);
      console.log(`    Código: ${p.code}`);
      console.log(`    Descripción: ${p.description}`);
      console.log(`    Precio: ${p.price}`);
      console.log('');
    });
    if (products.length > 10) {
      console.log(`  ... y ${products.length - 10} productos más`);
    }

    // Consultar documentos (facturas, retenciones, notas de crédito, etc.)
    const documents = await prisma.document.findMany();
    console.log('📄 DOCUMENTOS:', documents.length);
    documents.slice(0, 10).forEach(d => {
      console.log(`  - ID: ${d.id}`);
      console.log(`    Tipo: ${d.type}`);
      console.log(`    Número: ${d.number}`);
      console.log(`    Fecha: ${d.issueDate}`);
      console.log(`    Total: ${d.total}`);
      console.log(`    Estado: ${d.status}`);
      console.log('');
    });
    if (documents.length > 10) {
      console.log(`  ... y ${documents.length - 10} documentos más`);
    }

    // Consultar movimientos de inventario
    const movements = await prisma.inventoryMovement.findMany();
    console.log('📦 MOVIMIENTOS DE INVENTARIO:', movements.length);

    // Consultar secuencias
    const sequences = await prisma.sequence.findMany();
    console.log('🔢 SECUENCIAS:', sequences.length);

    // Resumen
    console.log('═══════════════════════════════════');
    console.log('📈 RESUMEN:');
    console.log(`  - Empresas: ${businesses.length}`);
    console.log(`  - Usuarios: ${users.length}`);
    console.log(`  - Clientes: ${clients.length}`);
    console.log(`  - Productos: ${products.length}`);
    console.log(`  - Documentos: ${documents.length}`);
    console.log(`  - Movimientos de Inventario: ${movements.length}`);
    console.log(`  - Secuencias: ${sequences.length}`);
    console.log('═══════════════════════════════════');

  } catch (error) {
    console.error('❌ Error al consultar datos:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
