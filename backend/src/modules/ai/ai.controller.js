const catchAsync = require('../../middleware/error.handler').catchAsync;
const AiRepository = require('./ai.repository');
const AiService = require('./ai.service');

const repository = new AiRepository();
const service = new AiService(repository);

const chat = catchAsync(async (req, res) => {
  const { message, context } = req.body;
  const result = await service.chat(message, context);
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

module.exports = { chat, insights, audit };
