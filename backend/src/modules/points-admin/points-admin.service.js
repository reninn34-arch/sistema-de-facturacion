const prisma = require('../../../prisma/client');

async function getConfig() {
  let config = await prisma.pointsConfig.findUnique({ where: { id: 'global' } });
  if (!config) {
    config = await prisma.pointsConfig.create({ data: { id: 'global' } });
  }
  return config;
}

async function updateConfig(body) {
  const { enabled, pointsPerReferral, maxRedemptionsPerMonth } = body;
  const data = {};
  if (enabled !== undefined) data.enabled = enabled;
  if (pointsPerReferral !== undefined) data.pointsPerReferral = parseInt(pointsPerReferral);
  if (maxRedemptionsPerMonth !== undefined) data.maxRedemptionsPerMonth = parseInt(maxRedemptionsPerMonth);

  const config = await prisma.pointsConfig.upsert({
    where: { id: 'global' },
    update: data,
    create: { id: 'global', ...data }
  });
  return { success: true, config };
}

async function getAllPoints() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, ruc: true, points: true, referralCode: true, plan: true },
    orderBy: { points: 'desc' }
  });
  return businesses;
}

async function adjustPoints(businessId, amount, reason) {
  if (!amount || isNaN(parseInt(amount))) {
    const error = new Error('Cantidad de puntos requerida');
    error.statusCode = 400;
    throw error;
  }

  const increment = parseInt(amount);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { points: { increment } },
    select: { id: true, name: true, points: true }
  });

  return { success: true, business, adjustment: increment, reason: reason || 'Ajuste manual' };
}

async function getAllReferrals() {
  const referrals = await prisma.referral.findMany({
    include: {
      referrer: { select: { id: true, name: true, ruc: true, points: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  return referrals;
}

async function getPrizes() {
  const prizes = await prisma.prize.findMany({ orderBy: { displayOrder: 'asc' } });
  return prizes;
}

async function createPrize(body) {
  const { name, description, points, icon, isActive, displayOrder } = body;
  if (!name || !points) {
    const error = new Error('Nombre y puntos requeridos');
    error.statusCode = 400;
    throw error;
  }

  const prize = await prisma.prize.create({
    data: {
      name,
      description: description || '',
      points: parseInt(points),
      icon: icon || '🎁',
      isActive: isActive !== false,
      displayOrder: parseInt(displayOrder) || 0
    }
  });
  return prize;
}

async function updatePrize(id, body) {
  const { name, description, points, icon, isActive, displayOrder } = body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (points !== undefined) data.points = parseInt(points);
  if (icon !== undefined) data.icon = icon;
  if (isActive !== undefined) data.isActive = isActive;
  if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder);

  const prize = await prisma.prize.update({ where: { id }, data });
  return prize;
}

async function deletePrize(id) {
  await prisma.prize.delete({ where: { id } });
  return { success: true };
}

async function getStats() {
  const [totalPoints, totalReferrals, completedReferrals, totalRedeemedPoints] = await Promise.all([
    prisma.business.aggregate({ _sum: { points: true } }),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'COMPLETED' } }),
    prisma.referral.aggregate({ _sum: { pointsAwarded: true } })
  ]);

  const topReferrers = await prisma.referral.groupBy({
    by: ['referrerBusinessId'],
    _count: { id: true },
    _sum: { pointsAwarded: true },
    where: { status: 'COMPLETED' },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  const topReferrerDetails = await Promise.all(
    topReferrers.map(async (r) => {
      const biz = await prisma.business.findUnique({ where: { id: r.referrerBusinessId }, select: { name: true, ruc: true } });
      return { name: biz?.name || 'N/A', ruc: biz?.ruc || '', count: r._count.id, points: r._sum.pointsAwarded || 0 };
    })
  );

  return {
    totalPoints: totalPoints._sum.points || 0,
    totalReferrals,
    completedReferrals,
    totalRedeemedPoints: totalRedeemedPoints._sum.pointsAwarded || 0,
    topReferrers: topReferrerDetails
  };
}

module.exports = { getConfig, updateConfig, getAllPoints, adjustPoints, getAllReferrals, getPrizes, createPrize, updatePrize, deletePrize, getStats };
