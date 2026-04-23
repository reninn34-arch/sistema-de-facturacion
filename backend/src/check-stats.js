const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStats() {
  try {
    const totalBusinesses = await prisma.business.count();
    const activeBusinesses = await prisma.business.count({ where: { isActive: true } });
    const expiredBusinesses = await prisma.business.count({
      where: { subscriptionEnd: { lt: new Date() } }
    });
    const totalUsers = await prisma.user.count();
    
    console.log('Total Businesses:', totalBusinesses);
    console.log('Active Businesses:', activeBusinesses);
    console.log('Expired Businesses:', expiredBusinesses);
    console.log('Total Users:', totalUsers);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStats();
