// backend/prisma/client.js
// Instancia compartida de PrismaClient para evitar múltiples conexiones

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
