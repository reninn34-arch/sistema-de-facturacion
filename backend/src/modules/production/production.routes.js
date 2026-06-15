const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const productionController = require('./production.controller');

router.get('/api/recipes', verifyToken, productionController.getRecipes);
router.post('/api/recipes', verifyToken, productionController.createRecipe);
router.put('/api/recipes/:id', verifyToken, productionController.updateRecipe);
router.delete('/api/recipes/:id', verifyToken, productionController.deleteRecipe);

router.post('/api/production', verifyToken, productionController.registerProduction);
router.get('/api/production', verifyToken, productionController.getProductionRecords);

module.exports = router;
