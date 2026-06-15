const prisma = require('../../../prisma/client');

class BusinessRepository {
  async findUsersByBusiness(businessId) {
    return prisma.user.findMany({
      where: { businessId },
      select: { id: true, email: true, role: true, name: true, isActive: true }
    });
  }

  async findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(data) {
    return prisma.user.create({ data });
  }

  async updateUser(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id) {
    return prisma.user.delete({ where: { id } });
  }

  async countUsersByBusiness(businessId) {
    return prisma.user.count({ where: { businessId } });
  }

  async findBusinessById(id) {
    return prisma.business.findUnique({ where: { id } });
  }

  async findFirstBusinessByRuc(ruc) {
    return prisma.business.findFirst({ where: { ruc } });
  }

  async updateBusiness(id, data) {
    return prisma.business.update({ where: { id }, data });
  }

  async findSubscriptionPlan(code) {
    return prisma.subscriptionPlan.findUnique({ where: { code } });
  }

  async findClients(filtro) {
    return prisma.client.findMany({ where: filtro });
  }

  async findClientById(id) {
    return prisma.client.findUnique({ where: { id } });
  }

  async findClientByRucAndBusiness(ruc, businessId) {
    return prisma.client.findFirst({ where: { ruc, businessId } });
  }

  async createClient(data) {
    return prisma.client.create({ data });
  }

  async updateClient(id, data) {
    return prisma.client.update({ where: { id, businessId: data.businessId }, data });
  }

  async deleteClient(id, businessId) {
    return prisma.client.delete({ where: { id, businessId } });
  }

  async findProducts(filtro) {
    return prisma.product.findMany({ where: filtro });
  }

  async createProduct(data) {
    return prisma.product.create({ data });
  }

  async updateProduct(id, data) {
    return prisma.product.update({ where: { id, businessId: data.businessId }, data });
  }

  async deleteProduct(id, businessId) {
    return prisma.product.delete({ where: { id, businessId } });
  }

  async findDocuments(filtro) {
    return prisma.document.findMany({
      where: filtro,
      include: { items: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async countDocuments(filtro) {
    return prisma.document.count({ where: filtro });
  }

  async findProductsByIds(ids, businessId) {
    return prisma.product.findMany({ where: { id: { in: ids }, businessId }, select: { id: true } });
  }

  // Transacciones
  async $transaction(callback) {
    return prisma.$transaction(callback);
  }

  async upsertSequence(tx, type, establishmentCode, emissionPointCode, businessId) {
    return tx.sequence.upsert({
      where: {
        type_establishmentCode_emissionPointCode_businessId: {
          type, establishmentCode, emissionPointCode, businessId
        }
      },
      update: { currentValue: { increment: 1 } },
      create: { type, establishmentCode, emissionPointCode, businessId, currentValue: 1 }
    });
  }

  async createDocument(tx, data) {
    return tx.document.create({ data, include: { items: true } });
  }

  async findDocument(tx, where) {
    return tx.document.findFirst({ where });
  }

  async updateDocument(tx, where, data) {
    return tx.document.update({ where, data });
  }

  async findProductById(tx, id) {
    return tx.product.findUnique({ where: { id } });
  }

  async updateProductStock(tx, id, data) {
    return tx.product.update({ where: { id }, data });
  }

  async createInventoryMovement(tx, data) {
    return tx.inventoryMovement.create({ data });
  }

  async bulkUpsertClient(data) {
    return prisma.client.upsert(data);
  }

  async bulkUpsertProduct(data) {
    return prisma.product.upsert(data);
  }
}

module.exports = BusinessRepository;
