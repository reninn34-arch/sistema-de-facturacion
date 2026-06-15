const express = require('express');
const router = express.Router();
const subscriptionPlansController = require('./subscription-plans.controller');
const jwtMiddleware = require('../../middleware/jwt.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { initializePlans } = require('./subscription-plans.service');

initializePlans();

router.get('/api/subscription-plans', subscriptionPlansController.getActivePlans);
router.get('/api/subscription-plans/admin', jwtMiddleware, roleMiddleware(['SUPERADMIN']), subscriptionPlansController.getAllPlans);
router.get('/api/subscription-plans/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), subscriptionPlansController.getPlanById);
router.post('/api/subscription-plans', jwtMiddleware, roleMiddleware(['SUPERADMIN']), subscriptionPlansController.createPlan);
router.put('/api/subscription-plans/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), subscriptionPlansController.updatePlan);
router.delete('/api/subscription-plans/:id', jwtMiddleware, roleMiddleware(['SUPERADMIN']), subscriptionPlansController.deletePlan);

module.exports = router;
