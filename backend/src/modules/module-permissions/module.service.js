const { AppError } = require('../../middleware/error.handler');

class ModuleService {
  constructor(repository) {
    this.repository = repository;
  }

  async getModules() {
    return this.repository.findAllActive();
  }

  async getUserModules(userId, requesterBusinessId) {
    const targetUser = await this.repository.findUser(userId);

    if (!targetUser || targetUser.businessId !== requesterBusinessId) {
      throw new AppError('Usuario no encontrado en tu empresa', 404);
    }

    const [allModules, userPermissions] = await Promise.all([
      this.repository.findAllActive(),
      this.repository.findUserPermissions(userId)
    ]);

    const permMap = {};
    for (const p of userPermissions) {
      permMap[p.moduleId] = p.granted;
    }

    const modulesWithPerms = allModules.map(m => ({
      ...m,
      granted: permMap[m.id] !== undefined ? permMap[m.id] : null,
      inherited: permMap[m.id] === undefined
    }));

    return {
      user: targetUser,
      modules: modulesWithPerms
    };
  }

  async updateUserModules(requester, targetUserId, permissions) {
    if (!Array.isArray(permissions)) {
      throw new AppError('Se requiere un array de permisos', 400);
    }

    if (requester.role !== 'ADMIN' && requester.role !== 'SUPERADMIN') {
      throw new AppError('No tienes permisos para gestionar módulos', 403);
    }

    if (requester.role !== 'SUPERADMIN') {
      const business = await this.repository.findBusiness(requester.businessId);

      if (business) {
        const plan = await this.repository.findPlanByCode(business.plan);

        if (!plan?.hasModuleControl) {
          throw new AppError(
            'Tu plan de suscripción no incluye la gestión de módulos por usuario. Actualiza tu plan para acceder a esta función.',
            403
          );
        }
      }
    }

    const targetUser = await this.repository.findUserWithRole(targetUserId);

    if (!targetUser || targetUser.businessId !== requester.businessId) {
      throw new AppError('Usuario no encontrado en tu empresa', 404);
    }

    if (targetUser.role === 'ADMIN') {
      throw new AppError('No se pueden modificar los permisos de un ADMIN. Los administradores tienen acceso completo.', 400);
    }

    if (targetUser.id === requester.id) {
      throw new AppError('No puedes modificar tus propios permisos de módulo', 400);
    }

    const moduleIds = permissions.map(p => p.moduleId);
    const existingModules = await this.repository.findModulesByIds(moduleIds);
    const validIds = new Set(existingModules.map(m => m.id));

    const invalidIds = moduleIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Módulos no encontrados: ${invalidIds.join(', ')}`, 400);
    }

    await this.repository.transaction(async (tx) => {
      await tx.userModulePermission.deleteMany({ where: { userId: targetUserId } });

      if (permissions.length > 0) {
        await tx.userModulePermission.createMany({
          data: permissions.map(p => ({
            userId: targetUserId,
            moduleId: p.moduleId,
            granted: p.granted
          }))
        });
      }
    });

    return { success: true, message: 'Permisos de módulo actualizados correctamente' };
  }

  async getModuleControlStatus(businessId) {
    if (!businessId) {
      return { hasModuleControl: false };
    }

    const business = await this.repository.findBusiness(businessId);

    if (!business) {
      return { hasModuleControl: false };
    }

    const plan = await this.repository.findPlanByCode(business.plan);

    return { hasModuleControl: plan?.hasModuleControl || false };
  }
}

module.exports = ModuleService;
