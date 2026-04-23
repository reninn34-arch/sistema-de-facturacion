const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const businesses = await prisma.business.count();
    const users = await prisma.user.count();
    console.log('Businesses:', businesses);
    console.log('Users:', users);
    
    // Ver si hay empresas
    if (businesses > 0) {
      const allBusinesses = await prisma.business.findMany({ take: 5 });
      console.log('Sample businesses:', JSON.stringify(allBusinesses, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
