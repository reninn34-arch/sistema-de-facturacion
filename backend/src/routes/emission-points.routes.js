const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const prisma = require('../../prisma/client');

router.get('/api/emission-points', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) return res.json([]);

    let points = await prisma.emissionPoint.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' }
    });

    if (points.length === 0) {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const defaultPoint = await prisma.emissionPoint.create({
        data: {
          businessId,
          establishmentCode: business?.establishmentCode || '001',
          emissionPointCode: business?.emissionPointCode || '001',
          description: 'Punto Principal'
        }
      });
      points = [defaultPoint];
    }

    res.json(points);
  } catch (error) {
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar puntos de emision' });
  }
});

router.post('/api/emission-points', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { establishmentCode, emissionPointCode, description } = req.body;
    if (!establishmentCode || !emissionPointCode) {
      return res.status(400).json({ message: 'Codigo de establecimiento y punto de emision requeridos' });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: business?.plan || 'FREE' } });
    const maxPoints = plan?.maxEmissionPoints ?? 1;

    const count = await prisma.emissionPoint.count({ where: { businessId, isActive: true } });
    if (count >= maxPoints) {
      return res.status(400).json({ message: `Tu plan (${plan?.name || 'actual'}) permite maximo ${maxPoints} punto(s) de emision. Actualiza tu plan para agregar mas.` });
    }

    const point = await prisma.emissionPoint.create({
      data: { businessId, establishmentCode, emissionPointCode, description: description || null }
    });
    res.status(201).json(point);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un punto de emision con esos codigos' });
    }
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al crear punto de emision' });
  }
});

router.delete('/api/emission-points/:id', verifyToken, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const point = await prisma.emissionPoint.findFirst({ where: { id: req.params.id, businessId } });
    if (!point) return res.status(404).json({ message: 'Punto de emision no encontrado' });

    const count = await prisma.emissionPoint.count({ where: { businessId, isActive: true } });
    if (count <= 1) {
      return res.status(400).json({ message: 'Debe mantener al menos un punto de emision activo' });
    }

    await prisma.emissionPoint.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al eliminar' });
  }
});

module.exports = router;
