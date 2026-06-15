const service = require('./points-admin.service');

async function getConfig(req, res) {
  try {
    const config = await service.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar configuracion' });
  }
}

async function updateConfig(req, res) {
  try {
    const result = await service.updateConfig(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar configuracion' });
  }
}

async function getAllPoints(req, res) {
  try {
    const businesses = await service.getAllPoints();
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar puntos' });
  }
}

async function adjustPoints(req, res) {
  try {
    const { businessId } = req.params;
    const { amount, reason } = req.body;
    const result = await service.adjustPoints(businessId, amount, reason);
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al ajustar puntos' });
  }
}

async function getAllReferrals(req, res) {
  try {
    const referrals = await service.getAllReferrals();
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar referidos' });
  }
}

async function getPrizes(req, res) {
  try {
    const prizes = await service.getPrizes();
    res.json(prizes);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar premios' });
  }
}

async function createPrize(req, res) {
  try {
    const prize = await service.createPrize(req.body);
    res.status(201).json(prize);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error al crear premio' });
  }
}

async function updatePrize(req, res) {
  try {
    const prize = await service.updatePrize(req.params.id, req.body);
    res.json(prize);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar premio' });
  }
}

async function deletePrize(req, res) {
  try {
    const result = await service.deletePrize(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar premio' });
  }
}

async function getStats(req, res) {
  try {
    const stats = await service.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[PointsStats] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar estadisticas' });
  }
}

module.exports = { getConfig, updateConfig, getAllPoints, adjustPoints, getAllReferrals, getPrizes, createPrize, updatePrize, deletePrize, getStats };
