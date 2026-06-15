const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const quickSaleController = require('./quicksale.controller');

// =================================================================
// GESTIÓN DE VENTAS RÁPIDAS (TICKETS / POS)
// =================================================================

// Listar todas las ventas rápidas (tickets) de la empresa
router.get('/api/quicksales', verifyToken, quickSaleController.getQuickSales);

// Crear una venta rápida (ticket)
router.post('/api/quicksales', verifyToken, quickSaleController.createQuickSale);

// Actualizar una venta rápida
router.put('/api/quicksales/:id', verifyToken, quickSaleController.updateQuickSale);

// Eliminar una venta rápida
router.delete('/api/quicksales/:id', verifyToken, quickSaleController.deleteQuickSale);

// Actualizar múltiples tickets en lote (cambiar estado, asignar batchId, etc.)
router.post('/api/quicksales/batch-update', verifyToken, quickSaleController.batchUpdateStatus);

module.exports = router;
