const { catchAsync } = require('../middleware/error.handler');
const prisma = require('../../prisma/client');

const moduleController = {
  // Listar todos los módulos disponibles (para el admin de empresa)
  getModules: catchAsync(async (req, res) => {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
    res.json(modules);
  }),

  // Obtener permisos de módulo de un usuario específico
  getUserModules: catchAsync(async (req, res) => {
    const { userId } = req.params;

    // Verificar que el usuario pertenece a la misma empresa
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, businessId: true, name: true, email: true }
    });

    if (!targetUser || targetUser.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Usuario no encontrado en tu empresa' });
    }

    // Obtener todos los módulos + los permisos del usuario
    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });

    const userPermissions = await prisma.userModulePermission.findMany({
      where: { userId }
    });

    const permMap = {};
    for (const p of userPermissions) {
      permMap[p.moduleId] = p.granted;
    }

    // Construir respuesta: módulo + si tiene permiso explícito
    // Si no tiene permiso explícito, inherited = true (usa rol por defecto)
    const modulesWithPerms = allModules.map(m => ({
      ...m,
      granted: permMap[m.id] !== undefined ? permMap[m.id] : null,
      inherited: permMap[m.id] === undefined
    }));

    res.json({
      user: targetUser,
      modules: modulesWithPerms
    });
  }),

  // Actualizar permisos de módulo de un usuario (ADMIN de la empresa)
  updateUserModules: catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { permissions } = req.body; // Array de { moduleId, granted }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Se requiere un array de permisos' });
    }

    // Solo ADMIN o SUPERADMIN pueden gestionar módulos
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'No tienes permisos para gestionar módulos' });
    }

    // Verificar que el plan de la empresa tiene hasModuleControl
    if (req.user.role !== 'SUPERADMIN') {
      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { plan: true }
      });

      if (business) {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { code: business.plan },
          select: { hasModuleControl: true }
        });

        if (!plan?.hasModuleControl) {
          return res.status(403).json({
            message: 'Tu plan de suscripción no incluye la gestión de módulos por usuario. Actualiza tu plan para acceder a esta función.'
          });
        }
      }
    }

    // Verificar que el usuario pertenece a la misma empresa
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, businessId: true, role: true }
    });

    if (!targetUser || targetUser.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Usuario no encontrado en tu empresa' });
    }

    // No permitir modificar permisos de un ADMIN (los ADMIN siempre ven todo)
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ message: 'No se pueden modificar los permisos de un ADMIN. Los administradores tienen acceso completo.' });
    }

    // No permitir auto-modificarse
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes modificar tus propios permisos de módulo' });
    }

    // Validar que los moduleIds existen
    const moduleIds = permissions.map(p => p.moduleId);
    const existingModules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true }
    });
    const validIds = new Set(existingModules.map(m => m.id));

    const invalidIds = moduleIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: `Módulos no encontrados: ${invalidIds.join(', ')}` });
    }

    // Actualizar permisos en transacción: borrar existentes y crear nuevos
    await prisma.$transaction(async (tx) => {
      // Eliminar permisos existentes del usuario
      await tx.userModulePermission.deleteMany({ where: { userId } });

      // Crear nuevos permisos
      if (permissions.length > 0) {
        await tx.userModulePermission.createMany({
          data: permissions.map(p => ({
            userId,
            moduleId: p.moduleId,
            granted: p.granted
          }))
        });
      }
    });

    res.json({ success: true, message: 'Permisos de módulo actualizados correctamente' });
  }),

  // Verificar si el plan actual tiene habilitado el control de módulos
  getModuleControlStatus: catchAsync(async (req, res) => {
    if (!req.user.businessId) {
      return res.json({ hasModuleControl: false });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { plan: true }
    });

    if (!business) {
      return res.json({ hasModuleControl: false });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: business.plan },
      select: { hasModuleControl: true }
    });

    res.json({ hasModuleControl: plan?.hasModuleControl || false });
  })
};

module.exports = moduleController;
