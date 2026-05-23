const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const prisma = require('../../prisma/client');

// Middleware de rol: solo SUPERADMIN
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'Solo el Superadministrador puede acceder' });
  }
  next();
};

// Obtener configuracion global de puntos
router.get('/api/admin/points-config', verifyToken, superAdminOnly, async (req, res) => {
  try {
    let config = await prisma.pointsConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.pointsConfig.create({ data: { id: 'global' } });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar configuracion' });
  }
});

// Actualizar configuracion global
router.put('/api/admin/points-config', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { enabled, pointsPerReferral, maxRedemptionsPerMonth } = req.body;
    const data = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (pointsPerReferral !== undefined) data.pointsPerReferral = parseInt(pointsPerReferral);
    if (maxRedemptionsPerMonth !== undefined) data.maxRedemptionsPerMonth = parseInt(maxRedemptionsPerMonth);

    const config = await prisma.pointsConfig.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data }
    });
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar configuracion' });
  }
});

// Ver puntos de todas las empresas
router.get('/api/admin/points', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true, ruc: true, points: true, referralCode: true, plan: true },
      orderBy: { points: 'desc' }
    });
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar puntos' });
  }
});

// Ajustar puntos manualmente (+/- n)
router.put('/api/admin/points/:businessId', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || isNaN(parseInt(amount))) {
      return res.status(400).json({ message: 'Cantidad de puntos requerida' });
    }

    const increment = parseInt(amount);

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { points: { increment } },
      select: { id: true, name: true, points: true }
    });

    res.json({ success: true, business, adjustment: increment, reason: reason || 'Ajuste manual' });
  } catch (error) {
    res.status(500).json({ message: 'Error al ajustar puntos' });
  }
});

// Ver todos los referidos del sistema
router.get('/api/admin/referrals/all', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const referrals = await prisma.referral.findMany({
      include: {
        referrer: { select: { id: true, name: true, ruc: true, points: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar referidos' });
  }
});

// ========================================
// GESTION DE PREMIOS (CRUD)
// ========================================

router.get('/api/admin/prizes', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const prizes = await prisma.prize.findMany({ orderBy: { displayOrder: 'asc' } });
    res.json(prizes);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar premios' });
  }
});

router.post('/api/admin/prizes', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { name, description, points, icon, isActive, displayOrder } = req.body;
    if (!name || !points) return res.status(400).json({ message: 'Nombre y puntos requeridos' });

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
    res.status(201).json(prize);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear premio' });
  }
});

router.put('/api/admin/prizes/:id', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const { name, description, points, icon, isActive, displayOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (points !== undefined) data.points = parseInt(points);
    if (icon !== undefined) data.icon = icon;
    if (isActive !== undefined) data.isActive = isActive;
    if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder);

    const prize = await prisma.prize.update({ where: { id: req.params.id }, data });
    res.json(prize);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar premio' });
  }
});

router.delete('/api/admin/prizes/:id', verifyToken, superAdminOnly, async (req, res) => {
  try {
    await prisma.prize.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar premio' });
  }
});

// Estadisticas del programa
router.get('/api/admin/points-stats', verifyToken, superAdminOnly, async (req, res) => {
  try {
    const totalPoints = await prisma.business.aggregate({ _sum: { points: true } });
    const totalReferrals = await prisma.referral.count();
    const completedReferrals = await prisma.referral.count({ where: { status: 'COMPLETED' } });
    const totalRedeemedPoints = await prisma.referral.aggregate({ _sum: { pointsAwarded: true } });

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

    res.json({
      totalPoints: totalPoints._sum.points || 0,
      totalReferrals,
      completedReferrals,
      totalRedeemedPoints: totalRedeemedPoints._sum.pointsAwarded || 0,
      topReferrers: topReferrerDetails
    });
  } catch (error) {
    console.error('[PointsStats] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar estadisticas' });
  }
});

module.exports = router;
