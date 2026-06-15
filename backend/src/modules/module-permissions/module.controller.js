const { catchAsync } = require('../../middleware/error.handler');
const ModuleRepository = require('./module.repository');
const ModuleService = require('./module.service');

const repository = new ModuleRepository();
const moduleService = new ModuleService(repository);

const moduleController = {
  getModules: catchAsync(async (req, res) => {
    const modules = await moduleService.getModules();
    res.json(modules);
  }),

  getUserModules: catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await moduleService.getUserModules(userId, req.user.businessId);
    res.json(result);
  }),

  updateUserModules: catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { permissions } = req.body;
    const result = await moduleService.updateUserModules(req.user, userId, permissions);
    res.json(result);
  }),

  getModuleControlStatus: catchAsync(async (req, res) => {
    const result = await moduleService.getModuleControlStatus(req.user.businessId);
    res.json(result);
  })
};

module.exports = moduleController;
