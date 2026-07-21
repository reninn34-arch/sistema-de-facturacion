const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const checkRole = require('../../middleware/role.middleware');
const requireCompanyContext = require('../../middleware/requireCompanyContext');
const controller = require('./emission-points.controller');

// Los puntos de emisión pertenecen a la empresa del usuario.
router.use(verifyToken, requireCompanyContext);

// Configuración fiscal: listar lo puede cualquier usuario (se necesita al
// emitir), pero crear/eliminar solo ADMIN.
const onlyAdmin = checkRole(['ADMIN', 'SUPERADMIN']);
router.get('/api/emission-points', controller.list);
router.post('/api/emission-points', onlyAdmin, controller.create);
router.delete('/api/emission-points/establishment/:code', onlyAdmin, controller.removeEstablishment);
router.delete('/api/emission-points/:id', onlyAdmin, controller.remove);

module.exports = router;
