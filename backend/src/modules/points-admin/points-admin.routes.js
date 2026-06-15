const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const controller = require('./points-admin.controller');

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'Solo el Superadministrador puede acceder' });
  }
  next();
};

router.get('/api/admin/points-config', verifyToken, superAdminOnly, controller.getConfig);
router.put('/api/admin/points-config', verifyToken, superAdminOnly, controller.updateConfig);
router.get('/api/admin/points', verifyToken, superAdminOnly, controller.getAllPoints);
router.put('/api/admin/points/:businessId', verifyToken, superAdminOnly, controller.adjustPoints);
router.get('/api/admin/referrals/all', verifyToken, superAdminOnly, controller.getAllReferrals);
router.get('/api/admin/prizes', verifyToken, superAdminOnly, controller.getPrizes);
router.post('/api/admin/prizes', verifyToken, superAdminOnly, controller.createPrize);
router.put('/api/admin/prizes/:id', verifyToken, superAdminOnly, controller.updatePrize);
router.delete('/api/admin/prizes/:id', verifyToken, superAdminOnly, controller.deletePrize);
router.get('/api/admin/points-stats', verifyToken, superAdminOnly, controller.getStats);

module.exports = router;
