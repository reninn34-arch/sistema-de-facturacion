const catchAsync = require('../../middleware/error.handler').catchAsync;
const AiRepository = require('./ai.repository');
const AiService = require('./ai.service');

const repository = new AiRepository();
const service = new AiService(repository);

const chat = catchAsync(async (req, res) => {
  const { message, context, provider, model } = req.body;
  const result = await service.chat(message, context, { provider, model });
  res.json(result);
});

const insights = catchAsync(async (req, res) => {
  const { salesData } = req.body;
  const result = await service.insights(salesData);
  res.json(result);
});

const audit = catchAsync(async (req, res) => {
  const { businessId } = req.user;
  const { role } = req.user;
  const result = await service.audit(req.user.id, role, businessId);
  res.json(result);
});

const getProviders = catchAsync(async (req, res) => {
  const providers = service.getAvailableProviders();
  res.json({ providers });
});

module.exports = { chat, insights, audit, getProviders };
