const { catchAsync } = require('../../middleware/error.handler');
const QuickSaleService = require('./quicksale.service');
const QuickSaleRepository = require('./quicksale.repository');

const repo = new QuickSaleRepository();
const service = new QuickSaleService(repo);

const quickSaleController = {
  getQuickSales: catchAsync(async (req, res) => {
    const quickSales = await service.getQuickSales(req.user.businessId);
    res.json(quickSales);
  }),

  createQuickSale: catchAsync(async (req, res) => {
    const result = await service.createQuickSale(req.user.businessId, req.body);
    res.status(201).json(result);
  }),

  updateQuickSale: catchAsync(async (req, res) => {
    const updated = await service.updateQuickSale(req.params.id, req.user.businessId, req.body);
    res.json(updated);
  }),

  deleteQuickSale: catchAsync(async (req, res) => {
    const result = await service.deleteQuickSale(req.params.id, req.user.businessId);
    res.json(result);
  }),

  batchUpdateStatus: catchAsync(async (req, res) => {
    const { ticketIds, status, batchId, documentId } = req.body;
    const result = await service.batchUpdateStatus(req.user.businessId, ticketIds, status, batchId, documentId);
    res.json(result);
  }),
};

module.exports = quickSaleController;
