const prisma = require('../../../prisma/client');

class QuickSaleRepository {
  async findByBusiness(businessId) {
    return prisma.quickSale.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLastByBusiness(businessId) {
    return prisma.quickSale.findFirst({
      where: { businessId },
      orderBy: { sequential: 'desc' },
    });
  }

  async create(data) {
    return prisma.quickSale.create({ data });
  }

  async findByIdAndBusiness(id, businessId) {
    return prisma.quickSale.findFirst({ where: { id, businessId } });
  }

  async update(id, data) {
    return prisma.quickSale.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.quickSale.delete({ where: { id } });
  }

  async updateManyByBusiness(ids, businessId, data) {
    return prisma.quickSale.updateMany({
      where: { id: { in: ids }, businessId },
      data,
    });
  }
}

module.exports = QuickSaleRepository;
