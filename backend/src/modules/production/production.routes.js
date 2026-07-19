const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const requireCompanyContext = require('../../middleware/requireCompanyContext');
const productionController = require('./production.controller');

// Toda la producción (recetas y registros) es de la empresa del usuario.
router.use(verifyToken, requireCompanyContext);

router.get('/api/recipes', productionController.getRecipes);
router.post('/api/recipes', productionController.createRecipe);
router.put('/api/recipes/:id', productionController.updateRecipe);
router.delete('/api/recipes/:id', productionController.deleteRecipe);

router.post('/api/production', productionController.registerProduction);
router.get('/api/production', productionController.getProductionRecords);

module.exports = router;
