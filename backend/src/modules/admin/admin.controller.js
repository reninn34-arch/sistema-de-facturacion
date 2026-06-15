const { catchAsync } = require('../../middleware/error.handler');
const AdminService = require('./admin.service');
const AdminRepository = require('./admin.repository');

const repository = new AdminRepository();
const service = new AdminService(repository);

const adminController = {
  createBusiness: catchAsync(async (req, res) => {
    const result = await service.createBusiness(req.body);
    res.json(result);
  }),

  getExpiringBusinesses: catchAsync(async (req, res) => {
    const result = await service.getExpiringBusinesses();
    res.json(result);
  }),

  getAllBusinesses: catchAsync(async (req, res) => {
    const result = await service.getAllBusinesses();
    res.json(result);
  }),

  updateBusiness: catchAsync(async (req, res) => {
    const result = await service.updateBusiness(req.params.id, req.body);
    res.json(result);
  }),

  toggleBusinessStatus: catchAsync(async (req, res) => {
    const result = await service.toggleBusinessStatus(req.params.id, req.body);
    res.json(result);
  }),

  updateSubscriptionDays: catchAsync(async (req, res) => {
    const result = await service.updateSubscriptionDays(req.params.id, req.body.days);
    res.json(result);
  }),

  deleteBusiness: catchAsync(async (req, res) => {
    const result = await service.deleteBusiness(req.params.id);
    res.json(result);
  }),

  addSubscriptionTime: catchAsync(async (req, res) => {
    const result = await service.addSubscriptionTime(req.body.businessId, req.body.months);
    res.json(result);
  }),

  getAllUsers: catchAsync(async (req, res) => {
    const result = await service.getAllUsers();
    res.json(result);
  }),

  createUser: catchAsync(async (req, res) => {
    const result = await service.createUser(req.body, req.user.businessId);
    res.json(result);
  }),

  getBusinessUsers: catchAsync(async (req, res) => {
    const result = await service.getBusinessUsers(req.params.businessId);
    res.json(result);
  }),

  deleteUser: catchAsync(async (req, res) => {
    const result = await service.deleteUser(req.params.id);
    res.json(result);
  }),

  updateUser: catchAsync(async (req, res) => {
    const result = await service.updateUser(req.params.id, req.body);
    res.json(result);
  }),

  resetUserPassword: catchAsync(async (req, res) => {
    const result = await service.resetUserPassword(req.params.id, req.body.temporaryPassword);
    res.json(result);
  }),

  toggleUserStatus: catchAsync(async (req, res) => {
    const result = await service.toggleUserStatus(req.params.id);
    res.json(result);
  }),

  getUsersWithBusiness: catchAsync(async (req, res) => {
    const result = await service.getUsersWithBusiness();
    res.json(result);
  }),

  getSubscriptionStats: catchAsync(async (req, res) => {
    const result = await service.getSubscriptionStats();
    res.json(result);
  }),

  getSubscriptions: catchAsync(async (req, res) => {
    const result = await service.getSubscriptions(req.query);
    res.json(result);
  }),

  getSubscription: catchAsync(async (req, res) => {
    const result = await service.getSubscription(req.params.id);
    res.json(result);
  }),

  createSubscription: catchAsync(async (req, res) => {
    const result = await service.createSubscription(req.body);
    res.json(result);
  }),

  updateSubscription: catchAsync(async (req, res) => {
    const result = await service.updateSubscription(req.params.id, req.body);
    res.json(result);
  }),

  deleteSubscription: catchAsync(async (req, res) => {
    const result = await service.deleteSubscription(req.params.id);
    res.json(result);
  }),

  getSubscriptionRevenueStats: catchAsync(async (req, res) => {
    const result = await service.getSubscriptionRevenueStats(req.query);
    res.json(result);
  }),

  emitSaaSInvoice: catchAsync(async (req, res) => {
    const result = await service.emitSaaSInvoice(req.body);
    res.json(result);
  }),

  processSaaSCreditNote: catchAsync(async (req, res) => {
    const result = await service.processSaaSCreditNote(req.body);
    res.json(result);
  }),

  getDocuments: catchAsync(async (req, res) => {
    const result = await service.getDocuments(req.query);
    res.json(result);
  })
};

module.exports = adminController;
