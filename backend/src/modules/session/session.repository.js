const prisma = require('../../../prisma/client');

class SessionRepository {
  async create(data) {
    return await prisma.session.create({ data });
  }

  async findByBusiness(businessId) {
    return await prisma.session.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } }
      },
      orderBy: { loginAt: 'desc' },
      take: 100
    });
  }

  async findByUser(userId) {
    return await prisma.session.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } }
      },
      orderBy: { loginAt: 'desc' },
      take: 100
    });
  }

  async findById(id) {
    return await prisma.session.findUnique({
      where: { id },
      include: { user: { select: { id: true, businessId: true } } }
    });
  }

  async updateStatus(id, status) {
    return await prisma.session.update({
      where: { id },
      data: { status }
    });
  }
}

module.exports = SessionRepository;
