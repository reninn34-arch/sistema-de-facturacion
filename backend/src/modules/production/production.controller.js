const { catchAsync, AppError } = require('../../middleware/error.handler');
const ProductionService = require('./production.service');
const ProductionRepository = require('./production.repository');

const repo = new ProductionRepository();
const service = new ProductionService(repo);

const productionController = {
  getRecipes: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const recipes = await service.getRecipes(businessId);

    res.json({ success: true, recipes });
  }),

  createRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const recipe = await service.createRecipe(businessId, req.body);

    res.status(201).json({ success: true, recipe });
  }),

  updateRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    const { id } = req.params;

    const recipe = await service.updateRecipe(id, businessId, req.body);

    res.json({ success: true, recipe });
  }),

  deleteRecipe: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    const { id } = req.params;

    await service.deleteRecipe(id, businessId);

    res.json({ success: true, message: 'Receta eliminada' });
  }),

  registerProduction: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const result = await service.registerProduction(businessId, req.body);

    res.status(201).json({
      success: true,
      record: result.record,
      message: `Producción registrada: ${result.producedUnits} unidades`
    });
  }),

  getProductionRecords: catchAsync(async (req, res) => {
    const businessId = req.user.businessId;
    if (!businessId) throw new AppError('No se encontró el ID de empresa', 400);

    const records = await service.getProductionRecords(businessId);

    res.json({ success: true, records });
  })
};

module.exports = productionController;
