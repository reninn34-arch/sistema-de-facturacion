const prisma = require('../../../prisma/client');

class ModuleRepository {
  async findAllActive() {
    return prisma.module.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async findUser(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, businessId: true, name: true, email: true }
    });
  }

  async findUserWithRole(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, businessId: true, role: true }
    });
  }

  async findUserPermissions(userId) {
    return prisma.userModulePermission.findMany({
      where: { userId }
    });
  }

  async deleteUserPermissions(userId) {
    return prisma.userModulePermission.deleteMany({ where: { userId } });
  }

  async createUserPermissions(data) {
    return prisma.userModulePermission.createMany({ data });
  }

  async findBusiness(businessId) {
    return prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true }
    });
  }

  async findPlanByCode(code) {
    return prisma.subscriptionPlan.findUnique({
      where: { code }
    });
  }

  async findModulesByIds(ids) {
    return prisma.module.findMany({
      where: { id: { in: ids } },
      select: { id: true }
    });
  }

  async transaction(callback) {
    return prisma.$transaction(callback);
  }
}

module.exports = ModuleRepository;
