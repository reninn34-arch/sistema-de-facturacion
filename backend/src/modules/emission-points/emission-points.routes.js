const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const checkRole = require('../../middleware/role.middleware');
const controller = require('./emission-points.controller');

// Los puntos de emisión son configuración fiscal: listar lo puede cualquier
// usuario (se necesita al emitir), pero crear/eliminar solo ADMIN.
const onlyAdmin = checkRole(['ADMIN', 'SUPERADMIN']);
router.get('/api/emission-points', verifyToken, controller.list);
router.post('/api/emission-points', verifyToken, onlyAdmin, controller.create);
router.delete('/api/emission-points/:id', verifyToken, onlyAdmin, controller.remove);

module.exports = router;
