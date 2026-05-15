const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const moduleController = require('../controllers/module.controller');

// Listar todos los módulos disponibles
router.get('/api/business/modules', verifyToken, moduleController.getModules);

// Verificar si el plan tiene control de módulos habilitado
router.get('/api/business/module-control-status', verifyToken, moduleController.getModuleControlStatus);

// Obtener permisos de módulo de un usuario específico
router.get('/api/business/users/:userId/modules', verifyToken, moduleController.getUserModules);

// Actualizar permisos de módulo de un usuario
router.put('/api/business/users/:userId/modules', verifyToken, moduleController.updateUserModules);

module.exports = router;
