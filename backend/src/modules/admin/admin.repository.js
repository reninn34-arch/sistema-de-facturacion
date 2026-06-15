const prisma = require('../../../prisma/client');

class AdminRepository {
  // ─── Business ─────────────────────────────────────────────────────────────

  findBusinessById(id, tx = null) {
    const client = tx || prisma;
    return client.business.findUnique({ where: { id } });
  }

  findBusinessByRuc(ruc, tx = null) {
    const client = tx || prisma;
    return client.business.findUnique({ where: { ruc } });
  }

  createBusiness(data, tx = null) {
    const client = tx || prisma;
    return client.business.create({ data });
  }

  updateBusiness(id, data, tx = null) {
    const client = tx || prisma;
    return client.business.update({ where: { id }, data });
  }

  deleteBusiness(id, tx = null) {
    const client = tx || prisma;
    return client.business.delete({ where: { id } });
  }

  findAllBusinesses(options, tx = null) {
    const client = tx || prisma;
    return client.business.findMany(options);
  }

  countBusinesses(where = {}, tx = null) {
    const client = tx || prisma;
    return client.business.count({ where });
  }

  groupBusinessesByPlan(options, tx = null) {
    const client = tx || prisma;
    return client.business.groupBy(options);
  }

  findRecentBusinesses(options, tx = null) {
    const client = tx || prisma;
    return client.business.findMany(options);
  }

  // ─── User ─────────────────────────────────────────────────────────────────

  findUserById(id, tx = null) {
    const client = tx || prisma;
    return client.user.findUnique({ where: { id } });
  }

  findUserByEmail(email, tx = null) {
    const client = tx || prisma;
    return client.user.findUnique({ where: { email } });
  }

  createUser(data, tx = null) {
    const client = tx || prisma;
    return client.user.create({ data });
  }

  updateUser(id, data, select = null, tx = null) {
    const client = tx || prisma;
    const args = { where: { id }, data };
    if (select) args.select = select;
    return client.user.update(args);
  }

  deleteUser(id, tx = null) {
    const client = tx || prisma;
    return client.user.delete({ where: { id } });
  }

  updateUsersByBusiness(businessId, data, roleNot, tx = null) {
    const client = tx || prisma;
    return client.user.updateMany({ where: { businessId, role: { not: roleNot } }, data });
  }

  deleteUsersByBusiness(businessId, tx = null) {
    const client = tx || prisma;
    return client.user.deleteMany({ where: { businessId } });
  }

  findAllUsers(options, tx = null) {
    const client = tx || prisma;
    return client.user.findMany(options);
  }

  findUsersByBusiness(businessId, select, tx = null) {
    const client = tx || prisma;
    return client.user.findMany({ where: { businessId }, select, orderBy: { createdAt: 'desc' } });
  }

  countUsers(tx = null) {
    const client = tx || prisma;
    return client.user.count();
  }

  groupUsersByRole(options, tx = null) {
    const client = tx || prisma;
    return client.user.groupBy(options);
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  findSubscriptionById(id, include = null, tx = null) {
    const client = tx || prisma;
    const args = { where: { id } };
    if (include) args.include = include;
    return client.subscription.findUnique(args);
  }

  createSubscription(data, include = null, tx = null) {
    const client = tx || prisma;
    const args = { data };
    if (include) args.include = include;
    return client.subscription.create(args);
  }

  updateSubscription(id, data, include = null, tx = null) {
    const client = tx || prisma;
    const args = { where: { id }, data };
    if (include) args.include = include;
    return client.subscription.update(args);
  }

  deleteSubscription(id, tx = null) {
    const client = tx || prisma;
    return client.subscription.delete({ where: { id } });
  }

  findSubscriptions(where, include, orderBy, skip, take, tx = null) {
    const client = tx || prisma;
    return client.subscription.findMany({ where, include, orderBy, skip, take });
  }

  countSubscriptions(where = {}, tx = null) {
    const client = tx || prisma;
    return client.subscription.count({ where });
  }

  aggregateSubscriptionAmount(where, tx = null) {
    const client = tx || prisma;
    return client.subscription.aggregate({ where, _sum: { amount: true } });
  }

  groupSubscriptionsBy(field, where, tx = null) {
    const client = tx || prisma;
    return client.subscription.groupBy({ by: [field], where, _sum: { amount: true }, _count: { id: true } });
  }

  findFirstSubscription(orderBy, tx = null) {
    const client = tx || prisma;
    return client.subscription.findFirst({ orderBy });
  }

  findSubscriptionsByBusiness(businessId, excludeId, status, tx = null) {
    const client = tx || prisma;
    return client.subscription.findMany({ where: { businessId, id: { not: excludeId }, status } });
  }

  rawSubscriptionsByMonth(since, tx = null) {
    const client = tx || prisma;
    return client.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM "Subscription"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;
  }

  // ─── Sequence ─────────────────────────────────────────────────────────────

  createSequence(data, tx = null) {
    const client = tx || prisma;
    return client.sequence.create({ data });
  }

  deleteSequencesByBusiness(businessId, tx = null) {
    const client = tx || prisma;
    return client.sequence.deleteMany({ where: { businessId } });
  }

  // ─── Client ───────────────────────────────────────────────────────────────

  deleteClientsByBusiness(businessId, tx = null) {
    const client = tx || prisma;
    return client.client.deleteMany({ where: { businessId } });
  }

  // ─── Product ──────────────────────────────────────────────────────────────

  deleteProductsByBusiness(businessId, tx = null) {
    const client = tx || prisma;
    return client.product.deleteMany({ where: { businessId } });
  }

  // ─── Document ─────────────────────────────────────────────────────────────

  findDocumentById(id, tx = null) {
    const client = tx || prisma;
    return client.document.findUnique({ where: { id } });
  }

  createDocument(data, tx = null) {
    const client = tx || prisma;
    return client.document.create({ data });
  }

  updateDocument(id, data, tx = null) {
    const client = tx || prisma;
    return client.document.update({ where: { id }, data });
  }

  deleteDocument(id, tx = null) {
    const client = tx || prisma;
    return client.document.delete({ where: { id } });
  }

  findDocuments(where, include, orderBy, take, tx = null) {
    const client = tx || prisma;
    return client.document.findMany({ where, include, orderBy, take });
  }

  // ─── SubscriptionPlan ─────────────────────────────────────────────────────

  findAllPlans(select, tx = null) {
    const client = tx || prisma;
    return client.subscriptionPlan.findMany({ select });
  }

  // ─── Transaction ──────────────────────────────────────────────────────────

  executeTransaction(callback) {
    return prisma.$transaction(callback);
  }
}

module.exports = AdminRepository;
