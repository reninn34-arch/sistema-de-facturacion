const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const crypto = require('crypto');
const prisma = require('../../prisma/client');

// Obtener config activa (cache breve) - chequea si el programa esta enabled
async function getConfig() {
  let config = await prisma.pointsConfig.findUnique({ where: { id: 'global' } });
  if (!config) {
    config = await prisma.pointsConfig.create({ data: { id: 'global', enabled: true, pointsPerReferral: 50, maxRedemptionsPerMonth: 3 } });
  }
  return config;
}

// Obtener codigo de referido del negocio (lo genera si no existe)
router.get('/api/referrals/code', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) return res.status(400).json({ message: 'Sin negocio asociado' });

    const config = await getConfig();

    let business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ message: 'Negocio no encontrado' });

    if (!business.referralCode) {
      const code = business.name.substring(0, 4).toUpperCase().replace(/\s/g, '') + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      business = await prisma.business.update({ where: { id: businessId }, data: { referralCode: code } });
    }

    res.json({
      referralCode: business.referralCode,
      points: business.points,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/suscripcion?ref=${business.referralCode}`,
      programEnabled: config.enabled,
      pointsPerReferral: config.pointsPerReferral
    });
  } catch (error) {
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al obtener codigo' });
  }
});

// Historial de referidos del negocio
router.get('/api/referrals', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const referrals = await prisma.referral.findMany({
      where: { referrerBusinessId: businessId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(referrals);
  } catch (error) {
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar referidos' });
  }
});

// Registrar un referido (cuando alguien se registra con codigo)
router.post('/api/referrals', verifyToken, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const businessId = req.user.businessId;
    if (!referralCode) return res.status(400).json({ message: 'Codigo de referido requerido' });

    const config = await getConfig();
    if (!config.enabled) return res.status(400).json({ message: 'El programa de puntos esta desactivado temporalmente.' });

    const referrer = await prisma.business.findUnique({ where: { referralCode } });
    if (!referrer) return res.status(404).json({ message: 'Codigo de referido no valido' });
    if (referrer.id === businessId) return res.status(400).json({ message: 'No puedes referirte a ti mismo' });

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const existing = await prisma.referral.findFirst({
      where: { referrerBusinessId: referrer.id, referredRuc: business?.ruc || undefined }
    });
    if (existing) return res.status(400).json({ message: 'Este negocio ya fue referido' });

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

    res.status(201).json({ success: true, referral, pointsAwarded: config.pointsPerReferral });
  } catch (error) {
    console.error('[Referrals] Error:', error.message);
    res.status(500).json({ message: 'Error al registrar referido' });
  }
});

// Canjear puntos por un premio
router.post('/api/referrals/redeem', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { prizeId } = req.body;
    if (!prizeId) return res.status(400).json({ message: 'ID del premio requerido' });

    const config = await getConfig();
    if (!config.enabled) return res.status(400).json({ message: 'El programa de puntos esta desactivado temporalmente.' });

    const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
    if (!prize || !prize.isActive) return res.status(400).json({ message: 'Premio no valido o no disponible' });

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if ((business?.points || 0) < prize.points) {
      return res.status(400).json({ message: `Necesitas ${prize.points} puntos. Tienes ${business?.points || 0}.` });
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
      return res.status(400).json({ message: `Has alcanzado el limite de ${config.maxRedemptionsPerMonth} canjes este mes.` });
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
    res.json({ success: true, message: `Canjeaste "${prize.name}" por ${prize.points} puntos!`, remainingPoints: updated?.points || 0 });
  } catch (error) {
    console.error('[Referrals] Redeem error:', error.message);
    res.status(500).json({ message: 'Error al canjear premio' });
  }
});

// Catalogo de premios (desde BD)
router.get('/api/referrals/prizes', verifyToken, async (req, res) => {
  try {
    const prizes = await prisma.prize.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
    res.json({ prizes });
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar premios' });
  }
});

module.exports = router;
