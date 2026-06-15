const prisma = require('../../../prisma/client');

class AiRepository {
  findBusiness(businessId) {
    return prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true, subscriptionEnd: true, subscriptionStatus: true, isActive: true, sriEnabled: true, electronicSignature: true }
    });
  }

  findPlanByCode(code) {
    return prisma.subscriptionPlan.findUnique({
      where: { code },
      select: { hasAudit: true }
    });
  }

  findDocuments(businessId) {
    return prisma.document.findMany({
      where: { businessId },
      select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, accessKey: true },
      orderBy: { issueDate: 'desc' }
    });
  }

  findDocumentsGroupedByEntityRuc(businessId) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    return prisma.document.groupBy({
      by: ['entityRuc'],
      where: {
        businessId,
        issueDate: { gte: sixtyDaysAgo },
        entityRuc: { not: null }
      },
      _count: { id: true }
    });
  }

  findLowStockProducts(businessId) {
    return prisma.product.findMany({
      where: {
        businessId,
        type: 'FISICO',
        stock: { lte: 5 }
      },
      select: { id: true, description: true, stock: true, minStock: true },
      orderBy: { stock: 'asc' },
      take: 10
    });
  }

  findClients(businessId) {
    return prisma.client.findMany({
      where: { businessId },
      select: { id: true, name: true }
    });
  }

  findSequences(businessId) {
    return prisma.sequence.findMany({
      where: { businessId },
      select: { type: true, currentValue: true }
    });
  }
}

module.exports = AiRepository;
