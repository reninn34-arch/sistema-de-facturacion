const prisma = require('../../../prisma/client');
const crypto = require('crypto');

async function getConfig() {
  let config = await prisma.pointsConfig.findUnique({ where: { id: 'global' } });
  if (!config) {
    config = await prisma.pointsConfig.create({ data: { id: 'global', enabled: true, pointsPerReferral: 50, maxRedemptionsPerMonth: 3 } });
  }
  return config;
}

async function getCode(businessId) {
  let business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    const error = new Error('Negocio no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (!business.referralCode) {
    const code = business.name.substring(0, 4).toUpperCase().replace(/\s/g, '') + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    business = await prisma.business.update({ where: { id: businessId }, data: { referralCode: code } });
  }

  return business;
}

async function getHistory(businessId) {
  const referrals = await prisma.referral.findMany({
    where: { referrerBusinessId: businessId },
    orderBy: { createdAt: 'desc' }
  });
  return referrals;
}

async function register(referralCode, businessId) {
  const config = await getConfig();
  if (!config.enabled) {
    const error = new Error('El programa de puntos esta desactivado temporalmente.');
    error.statusCode = 400;
    throw error;
  }

  const referrer = await prisma.business.findUnique({ where: { referralCode } });
  if (!referrer) {
    const error = new Error('Codigo de referido no valido');
    error.statusCode = 404;
    throw error;
  }
  if (referrer.id === businessId) {
    const error = new Error('No puedes referirte a ti mismo');
    error.statusCode = 400;
    throw error;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const existing = await prisma.referral.findFirst({
    where: { referrerBusinessId: referrer.id, referredRuc: business?.ruc || undefined }
  });
  if (existing) {
    const error = new Error('Este negocio ya fue referido');
    error.statusCode = 400;
    throw error;
  }

  const referral = await prisma.referral.create({
    data: {
      referrerBusinessId: referrer.id,
      referredName: business?.name || 'Nuevo Negocio',
      referredRuc: business?.ruc || null,
      referralCode,
      pointsAwarded: config.pointsPerReferral,
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  await prisma.business.update({
    where: { id: referrer.id },
    data: { points: { increment: config.pointsPerReferral } }
  });

  return { referral, pointsAwarded: config.pointsPerReferral };
}

async function redeem(prizeId, businessId) {
  const config = await getConfig();
  if (!config.enabled) {
    const error = new Error('El programa de puntos esta desactivado temporalmente.');
    error.statusCode = 400;
    throw error;
  }

  const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
  if (!prize || !prize.isActive) {
    const error = new Error('Premio no valido o no disponible');
    error.statusCode = 400;
    throw error;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if ((business?.points || 0) < prize.points) {
    const error = new Error(`Necesitas ${prize.points} puntos. Tienes ${business?.points || 0}.`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const redemptionsThisMonth = await prisma.referral.count({
    where: {
      referrerBusinessId: businessId,
      status: 'REDEEMED',
      completedAt: { gte: startOfMonth }
    }
  });

  if (redemptionsThisMonth >= config.maxRedemptionsPerMonth) {
    const error = new Error(`Has alcanzado el limite de ${config.maxRedemptionsPerMonth} canjes este mes.`);
    error.statusCode = 400;
    throw error;
  }

  await prisma.referral.create({
    data: {
      referrerBusinessId: businessId,
      referredName: `Canje: ${prize.name}`,
      referralCode: 'REDEEM',
      pointsAwarded: -prize.points,
      status: 'REDEEMED',
      completedAt: new Date()
    }
  });

  await prisma.business.update({
    where: { id: businessId },
    data: { points: { decrement: prize.points } }
  });

  const updated = await prisma.business.findUnique({ where: { id: businessId } });
  return { prize, remainingPoints: updated?.points || 0 };
}

async function getPrizes() {
  const prizes = await prisma.prize.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  });
  return { prizes };
}

module.exports = { getConfig, getCode, getHistory, register, redeem, getPrizes };
