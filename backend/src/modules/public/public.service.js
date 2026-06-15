const prisma = require('../../../prisma/client');

async function getActivationStatus(ruc) {
  const business = await prisma.business.findUnique({
    where: { ruc },
    select: {
      name: true,
      ruc: true,
      plan: true,
      subscriptionStatus: true,
      isActive: true,
      subscriptionStart: true,
      subscriptionEnd: true,
      createdAt: true
    }
  });

  if (!business) {
    const activationReq = await prisma.activationRequest.findFirst({
      where: { business: { ruc } },
      include: { business: { select: { name: true, ruc: true, plan: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return { business: null, activationReq };
  }

  return { business, activationReq: null };
}

module.exports = { getActivationStatus };
