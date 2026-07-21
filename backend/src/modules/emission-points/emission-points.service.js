const prisma = require('../../../prisma/client');

async function list(businessId) {
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

  return points;
}

async function create(businessId, { establishmentCode, emissionPointCode, description }) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: business?.plan || 'FREE' } });
  const maxPoints = plan?.maxEmissionPoints ?? 1;

  const count = await prisma.emissionPoint.count({ where: { businessId, isActive: true } });
  if (count >= maxPoints) {
    const error = new Error(`Tu plan (${plan?.name || 'actual'}) permite maximo ${maxPoints} punto(s) de emision. Actualiza tu plan para agregar mas.`);
    error.statusCode = 400;
    throw error;
  }

  const point = await prisma.emissionPoint.create({
    data: { businessId, establishmentCode, emissionPointCode, description: description || null }
  });

  return point;
}

async function remove(businessId, id) {
  const point = await prisma.emissionPoint.findFirst({ where: { id, businessId } });
  if (!point) {
    const error = new Error('Punto de emision no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const count = await prisma.emissionPoint.count({ where: { businessId, isActive: true } });
  if (count <= 1) {
    const error = new Error('Debe mantener al menos un punto de emision activo');
    error.statusCode = 400;
    throw error;
  }

  await prisma.emissionPoint.delete({ where: { id } });
  return { success: true };
}

async function deleteEstablishment(businessId, establishmentCode) {
  if (establishmentCode === '001') {
    const error = new Error('No se puede eliminar la Matriz Principal (001)');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.emissionPoint.deleteMany({
    where: {
      businessId,
      establishmentCode
    }
  });

  return { success: true, count: result.count };
}

module.exports = { list, create, remove, deleteEstablishment };
