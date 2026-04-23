const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const checkRole = require('../middleware/role.middleware');
const adminController = require('../controllers/admin.controller');

// =================================================================
// RUTAS DE ADMINISTRACIÓN SAAS (SUPERADMIN)
// =================================================================

// 1. Crear Nueva Empresa (Tenant)
router.post('/api/admin/businesses', verifyToken, checkRole(['SUPERADMIN']), adminController.createBusiness);

// 1.2 Obtener empresas con suscripciones por vencer
router.get('/api/admin/subscriptions/expiring', verifyToken, checkRole(['SUPERADMIN']), adminController.getExpiringBusinesses);

// 1.3 Listar empresas con sus usuarios
router.get('/api/admin/businesses/:businessId/users', verifyToken, checkRole(['SUPERADMIN']), adminController.getBusinessUsers);

// 1.3 Listar todas las empresas (Para dropdown)
router.get('/api/admin/businesses', verifyToken, checkRole(['SUPERADMIN']), adminController.getAllBusinesses);

// 1.1 Actualizar Empresa y Permisos
router.put('/api/admin/businesses/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.updateBusiness);

// 1.2 Pausar/Activar Empresa
router.post('/api/admin/businesses/:id/toggle-status', verifyToken, checkRole(['SUPERADMIN']), adminController.toggleBusinessStatus);

// 2. Crear Usuario Administrador para una Empresa
router.post('/api/admin/users', verifyToken, checkRole(['SUPERADMIN']), adminController.createUser);

// 2.1 Actualizar Usuario Administrador
router.put('/api/admin/users/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.updateUser);

// 3. Listar todos los usuarios del sistema
router.get('/api/admin/users', verifyToken, checkRole(['SUPERADMIN']), adminController.getAllUsers);

// 7. Eliminar Usuario
router.delete('/api/admin/users/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.deleteUser);

// Reset Password
router.post('/api/admin/users/:id/reset-password', verifyToken, checkRole(['SUPERADMIN']), adminController.resetUserPassword);

// Toggle User Status (Activar/Desactivar usuario)
router.put('/api/admin/users/:id/status', verifyToken, checkRole(['SUPERADMIN']), adminController.toggleUserStatus);

// 8. Eliminar Empresa
router.delete('/api/admin/businesses/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.deleteBusiness);

// 4. Modificar tiempo de suscripción (días)
router.post('/api/admin/businesses/:id/subscription', verifyToken, checkRole(['SUPERADMIN']), adminController.updateSubscriptionDays);

// =================================================================
// GESTIÓN DE SUSCRIPCIONES (FACTURACIÓN SAAS)
// =================================================================

// Obtener todas las suscripciones
router.get('/api/admin/subscriptions', verifyToken, checkRole(['SUPERADMIN']), adminController.getSubscriptions);

// Obtener una suscripción específica
router.get('/api/admin/subscriptions/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.getSubscription);

// Crear una nueva suscripción
router.post('/api/admin/subscriptions', verifyToken, checkRole(['SUPERADMIN']), adminController.createSubscription);

// Actualizar una suscripción
router.put('/api/admin/subscriptions/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.updateSubscription);

// Eliminar una suscripción
router.delete('/api/admin/subscriptions/:id', verifyToken, checkRole(['SUPERADMIN']), adminController.deleteSubscription);

// Obtener estadísticas de ingresos por suscripciones
router.get('/api/admin/subscriptions/stats', verifyToken, checkRole(['SUPERADMIN']), adminController.getSubscriptionRevenueStats);

// 5. Obtener lista completa de usuarios con estado de empresa
router.get('/api/users', verifyToken, checkRole(['SUPERADMIN']), adminController.getUsersWithBusiness);

// 6. Agregar tiempo a la suscripción de una empresa (meses)
router.post('/api/subscriptions/add-time', verifyToken, checkRole(['SUPERADMIN']), adminController.addSubscriptionTime);

// 7. Estadísticas de suscripciones para Dashboard
router.get('/api/admin/subscription-stats', verifyToken, checkRole(['SUPERADMIN']), adminController.getSubscriptionStats);

// 8. Emitir factura SaaS y renovar suscripción
router.post('/api/admin/subscriptions/emit', verifyToken, checkRole(['SUPERADMIN']), adminController.emitSaaSInvoice);

// 9. Procesar nota de crédito SaaS (cancelar/rescindir suscripción)
router.post('/api/admin/subscriptions/credit-note', verifyToken, checkRole(['SUPERADMIN']), adminController.processSaaSCreditNote);

// 10. Obtener documentos del SaaS (para devoluciones)
router.get('/api/admin/documents', verifyToken, checkRole(['SUPERADMIN']), adminController.getDocuments);

module.exports = router;
