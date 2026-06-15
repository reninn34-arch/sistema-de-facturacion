const express = require('express');
const router = express.Router();
const activationRequestsController = require('./activation-requests.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');
const roleMiddleware = require('../../middleware/role.middleware');

router.get('/api/activation-requests', jwtMiddleware, roleMiddleware(['SUPERADMIN']), activationRequestsController.getAll);
router.get('/api/activation-requests/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), activationRequestsController.getById);
router.post('/api/activation-requests', jwtMiddleware, activationRequestsController.create);
router.put('/api/activation-requests/:id/upload-proof', activationRequestsController.uploadProof);
router.put('/api/activation-requests/:id/approve', jwtMiddleware, roleMiddleware(['SUPERADMIN']), activationRequestsController.approve);
router.put('/api/activation-requests/:id/reject', jwtMiddleware, roleMiddleware(['SUPERADMIN']), activationRequestsController.reject);
router.get('/api/activation-requests/business/:businessId', jwtMiddleware, activationRequestsController.getByBusiness);

module.exports = router;
