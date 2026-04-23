// Configuración global de pruebas
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración global before all tests
beforeAll(async () => {
  // Limpiar base de datos de prueba
  try {
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida para pruebas');
  } catch (error) {
    console.error('❌ Error conectando a base de datos:', error);
  }
});

// Limpiar después de cada test
afterEach(async () => {
  // Cleanup de datos de prueba si es necesario
});

// Cerrar conexión después de todos los tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Conexión a base de datos cerrada');
});

module.exports = { prisma };
