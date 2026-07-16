// backend/prisma/client.js
// Instancia compartida de PrismaClient para evitar múltiples conexiones

const { PrismaClient } = require('@prisma/client');

// Mapeo automático de base de datos Neon de Vercel (DB_SAAS_DATABASE_URL) a DATABASE_URL para Prisma
if ((!process.env.DATABASE_URL || process.env.DATABASE_URL === "") && process.env.DB_SAAS_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DB_SAAS_DATABASE_URL;
}
if ((!process.env.DIRECT_URL || process.env.DIRECT_URL === "") && process.env.DB_SAAS_DATABASE_URL_UNPOOLED) {
  process.env.DIRECT_URL = process.env.DB_SAAS_DATABASE_URL_UNPOOLED;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
