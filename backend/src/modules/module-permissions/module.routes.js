const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const moduleController = require('./module.controller');

router.get('/api/business/modules', verifyToken, moduleController.getModules);
router.get('/api/business/module-control-status', verifyToken, moduleController.getModuleControlStatus);
router.get('/api/business/users/:userId/modules', verifyToken, moduleController.getUserModules);
router.put('/api/business/users/:userId/modules', verifyToken, moduleController.updateUserModules);

module.exports = router;
