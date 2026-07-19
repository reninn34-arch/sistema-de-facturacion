const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const requireCompanyContext = require('../../middleware/requireCompanyContext');
const quickSaleController = require('./quicksale.controller');

// =================================================================
// GESTIÓN DE VENTAS RÁPIDAS (TICKETS / POS)
// =================================================================
// Todas las ventas rápidas pertenecen a la empresa del usuario.
router.use(verifyToken, requireCompanyContext);

// Listar todas las ventas rápidas (tickets) de la empresa
router.get('/api/quicksales', quickSaleController.getQuickSales);

// Crear una venta rápida (ticket)
router.post('/api/quicksales', quickSaleController.createQuickSale);

// Actualizar una venta rápida
router.put('/api/quicksales/:id', quickSaleController.updateQuickSale);

// Eliminar una venta rápida
router.delete('/api/quicksales/:id', quickSaleController.deleteQuickSale);

// Actualizar múltiples tickets en lote (cambiar estado, asignar batchId, etc.)
router.post('/api/quicksales/batch-update', quickSaleController.batchUpdateStatus);

module.exports = router;
