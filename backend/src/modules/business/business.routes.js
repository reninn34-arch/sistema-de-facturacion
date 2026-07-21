const express = require('express');
const router = express.Router();
const businessController = require('./business.controller');
const verifyToken = require('../../middleware/jwt.middleware');
const checkRole = require('../../middleware/role.middleware');
const prisma = require('../../../prisma/client');

const invoiceLimitGuard = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) return next();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true, isProduction: true }
    });
    if (!business) return next();
    if (!business.isProduction) return next();

    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: business.plan } });
    if (!plan || plan.maxInvoicesPerMonth < 0) return next();
    if (plan.code === 'PENDING' || plan.maxInvoicesPerMonth === 0) {
      return res.status(403).json({
        success: false,
        message: 'Su plan PENDIENTE no permite emitir facturas. Complete el pago para activar su suscripcion.',
        limitReached: true, current: 0, max: 0
      });
    }
    if (plan.code === 'UNLIMITED') return next();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const countThisMonth = await prisma.document.count({
      where: {
        businessId, type: '01',
        status: { not: 'CANCELLED' },
        issueDate: { gte: startOfMonth, lt: endOfMonth }
      }
    });

    if (countThisMonth >= plan.maxInvoicesPerMonth) {
      return res.status(403).json({
        success: false,
        message: `Ha alcanzado el limite de ${plan.maxInvoicesPerMonth} comprobantes este mes. Actualice su plan para continuar.`,
        limitReached: true, current: countThisMonth, max: plan.maxInvoicesPerMonth
      });
    }

    next();
  } catch (error) {
    console.error('[LIMIT GUARD] Error:', error.message);
    next();
  }
};

// Usuarios — solo ADMIN de la empresa (y SUPERADMIN) pueden gestionarlos
const onlyAdmin = checkRole(['ADMIN', 'SUPERADMIN']);
router.get('/api/business/users', verifyToken, onlyAdmin, businessController.getUsers);
router.post('/api/business/users', verifyToken, onlyAdmin, businessController.createUser);
router.delete('/api/business/users/:id', verifyToken, onlyAdmin, businessController.deleteUser);
router.put('/api/business/users/:id', verifyToken, onlyAdmin, businessController.updateUser);
router.post('/api/business/users/:id/reset-password', verifyToken, onlyAdmin, businessController.resetUserPassword);
router.put('/api/business/users/:id/status', verifyToken, onlyAdmin, businessController.toggleUserStatus);

// Perfil de Empresa — leer lo puede cualquier usuario; EDITAR el perfil fiscal solo ADMIN
router.get('/api/business', verifyToken, businessController.getBusinessProfile);
router.post('/api/business', verifyToken, onlyAdmin, businessController.updateBusinessProfile);

// Firma electrónica (.p12) — configuración sensible: solo ADMIN gestiona el certificado
router.get('/api/business/signature', verifyToken, onlyAdmin, businessController.getSignatureStatus);
router.post('/api/business/signature', verifyToken, onlyAdmin, businessController.uploadSignature);
router.delete('/api/business/signature', verifyToken, onlyAdmin, businessController.deleteSignature);

// Modo Demo y Producción — cambiar el ambiente afecta a toda la empresa: solo ADMIN
router.post('/api/business/demo', verifyToken, onlyAdmin, businessController.toggleDemoMode);
router.get('/api/business/demo', verifyToken, businessController.getDemoStatus);
router.post('/api/business/production', verifyToken, onlyAdmin, businessController.activateProduction);
router.post('/api/business/toggle-demo', verifyToken, onlyAdmin, businessController.toggleDemoMode);
router.get('/api/business/demo-status', verifyToken, businessController.getDemoStatus);
router.post('/api/business/activate-production', verifyToken, onlyAdmin, businessController.activateProduction);

// Clientes
router.get('/api/clients', verifyToken, businessController.getClients);
router.post('/api/clients', verifyToken, businessController.createClient);
router.post('/api/clients/bulk', verifyToken, businessController.bulkCreateClients);
router.put('/api/clients/:id', verifyToken, businessController.updateClient);
router.delete('/api/clients/:id', verifyToken, businessController.deleteClient);
router.post('/api/clients/:id/reset-password', verifyToken, businessController.resetClientPassword);

// Productos
router.get('/api/products', verifyToken, businessController.getProducts);
router.post('/api/products', verifyToken, businessController.createProduct);
router.post('/api/products/bulk', verifyToken, businessController.bulkCreateProducts);
router.post('/api/products/transfer-stock', verifyToken, businessController.transferProductStock);
router.put('/api/products/:id', verifyToken, businessController.updateProduct);
router.delete('/api/products/:id', verifyToken, businessController.deleteProduct);

// Documentos
router.get('/api/documents', verifyToken, businessController.getDocuments);
router.post('/api/documents', verifyToken, invoiceLimitGuard, businessController.createDocument);
router.post('/api/documents/next-sequence', verifyToken, businessController.reserveNextSequence);

// Alias para compatibilidad
router.get('/api/business/invoices', verifyToken, businessController.getDocuments);
router.post('/api/business/invoices', verifyToken, invoiceLimitGuard, businessController.createDocument);
router.get('/api/business/retentions', verifyToken, businessController.getDocuments);
router.get('/api/business/credit-notes', verifyToken, businessController.getDocuments);
router.get('/api/business/clients', verifyToken, businessController.getClients);
router.post('/api/business/clients', verifyToken, businessController.createClient);
router.get('/api/business/products', verifyToken, businessController.getProducts);
router.post('/api/business/products', verifyToken, businessController.createProduct);
router.get('/api/business/documents', verifyToken, businessController.getDocuments);
router.post('/api/business/documents', verifyToken, invoiceLimitGuard, businessController.createDocument);
router.post('/api/business/documents/reserve-sequence', verifyToken, businessController.reserveNextSequence);
router.post('/api/business/bulk-clients', verifyToken, businessController.bulkCreateClients);
router.post('/api/business/bulk-products', verifyToken, businessController.bulkCreateProducts);

module.exports = router;
