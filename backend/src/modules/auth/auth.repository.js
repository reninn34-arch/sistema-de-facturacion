const prisma = require('../../../prisma/client');

class AuthRepository {
  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email }, include: { business: true } });
  }

  async findUserById(id) {
    return prisma.user.findUnique({ where: { id }, include: { business: true } });
  }

  async updateUser(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async createUser(data) {
    return prisma.user.create({ data });
  }

  async findUserByResetToken(token) {
    return prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } }
    });
  }

  async findUserByVerificationToken(token) {
    return prisma.user.findFirst({ where: { verificationToken: token } });
  }

  async findUserByRefreshToken(token) {
    return prisma.user.findFirst({ where: { refreshToken: token } });
  }

  async findClientByIdentification(ruc) {
    return prisma.client.findFirst({ where: { ruc } });
  }

  async findClientByResetToken(token, ruc) {
    return prisma.client.findFirst({
      where: { ruc, passwordResetToken: token, passwordResetExpires: { gt: new Date() } }
    });
  }

  async updateClient(id, data) {
    return prisma.client.update({ where: { id }, data });
  }

  async findUsersByBusiness(businessId) {
    return prisma.user.findMany({ where: { businessId } });
  }

  async findSubscriptionPlan(code) {
    if (!code) return null;
    return prisma.subscriptionPlan.findUnique({ where: { code } });
  }

  async findBusinessByRuc(ruc) {
    return prisma.business.findFirst({ where: { ruc } });
  }

  async findBusinessByReferralCode(code) {
    return prisma.business.findUnique({ where: { referralCode: code } });
  }

  async createBusiness(data) {
    return prisma.business.create({ data });
  }

  async createActivationRequest(data) {
    return prisma.activationRequest.create({ data });
  }

  async createReferral(data) {
    return prisma.referral.create({ data });
  }

  async updateBusinessPoints(id, increment) {
    return prisma.business.update({
      where: { id },
      data: { points: { increment } }
    });
  }

  async findPointsConfig() {
    return prisma.pointsConfig.findUnique({ where: { id: 'global' } });
  }

  async findUserModulePermissions(userId) {
    return prisma.userModulePermission.findMany({
      where: { userId },
      select: { moduleId: true, granted: true, module: { select: { code: true } } }
    });
  }

  async findDocumentsByEntityRuc(ruc, filter) {
    return prisma.document.findMany({
      where: { entityRuc: ruc, ...filter },
      include: { business: { select: { id: true, name: true, ruc: true } } },
      orderBy: { issueDate: 'desc' }
    });
  }
}

module.exports = AuthRepository;
