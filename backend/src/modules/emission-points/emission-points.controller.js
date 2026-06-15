const service = require('./emission-points.service');

async function list(req, res) {
  try {
    const businessId = req.user.businessId;
    if (!businessId) return res.json([]);

    const points = await service.list(businessId);
    res.json(points);
  } catch (error) {
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al cargar puntos de emision' });
  }
}

async function create(req, res) {
  try {
    const businessId = req.user.businessId;
    const { establishmentCode, emissionPointCode, description } = req.body;
    if (!establishmentCode || !emissionPointCode) {
      return res.status(400).json({ message: 'Codigo de establecimiento y punto de emision requeridos' });
    }

    const point = await service.create(businessId, { establishmentCode, emissionPointCode, description });
    res.status(201).json(point);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un punto de emision con esos codigos' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al crear punto de emision' });
  }
}

async function remove(req, res) {
  try {
    const businessId = req.user.businessId;
    const result = await service.remove(businessId, req.params.id);
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[EmissionPoints] Error:', error.message);
    res.status(500).json({ message: 'Error al eliminar' });
  }
}

module.exports = { list, create, remove };
