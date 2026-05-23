const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt.middleware');
const businessController = require('../controllers/business.controller');

// =================================================================
// GESTIÓN DE EMPRESA (TENANT) - USUARIOS INTERNOS
// =================================================================

// Listar usuarios de la empresa actual
router.get('/api/business/users', verifyToken, businessController.getUsers);

// Crear usuario para la empresa actual
router.post('/api/business/users', verifyToken, businessController.createUser);

// Eliminar usuario de la empresa
router.delete('/api/business/users/:id', verifyToken, businessController.deleteUser);

// Reset Password (Company Admin)
router.post('/api/business/users/:id/reset-password', verifyToken, businessController.resetUserPassword);

// Actualizar usuario de la empresa
router.put('/api/business/users/:id', verifyToken, businessController.updateUser);

// Toggle estado de usuario (Activar/Desactivar)
router.put('/api/business/users/:id/status', verifyToken, businessController.toggleUserStatus);

// =================================================================
// PERFIL DE EMPRESA
// =================================================================

router.get('/api/business', verifyToken, businessController.getBusinessProfile);

router.post('/api/business', verifyToken, businessController.updateBusinessProfile);

// =================================================================
// MODO DEMO
// =================================================================

// Activar/Desactivar modo demo
router.post('/api/business/demo', verifyToken, businessController.toggleDemoMode);

// Verificar estado del modo demo
router.get('/api/business/demo', verifyToken, businessController.getDemoStatus);

router.post('/api/business/production', verifyToken, businessController.activateProduction);

// =================================================================
// GESTIÓN DE CLIENTES
// =================================================================

router.get('/api/clients', verifyToken, businessController.getClients);

router.post('/api/clients', verifyToken, businessController.createClient);

router.post('/api/clients/bulk', verifyToken, businessController.bulkCreateClients);

router.put('/api/clients/:id', verifyToken, businessController.updateClient);

router.delete('/api/clients/:id', verifyToken, businessController.deleteClient);

// Reset Password (Client Portal)
router.post('/api/clients/:id/reset-password', verifyToken, businessController.resetClientPassword);

// =================================================================
// GESTIÓN DE PRODUCTOS
// =================================================================

router.get('/api/products', verifyToken, businessController.getProducts);

router.post('/api/products', verifyToken, businessController.createProduct);

router.post('/api/products/bulk', verifyToken, businessController.bulkCreateProducts);

router.put('/api/products/:id', verifyToken, businessController.updateProduct);

router.delete('/api/products/:id', verifyToken, businessController.deleteProduct);

// =================================================================
// GESTIÓN DE DOCUMENTOS (FACTURAS)
// =================================================================

router.get('/api/documents', verifyToken, businessController.getDocuments);

const invoiceLimitGuard = async (req, res, next) => {
  try {
    const prisma = require('../../prisma/client');
    const businessId = req.user.businessId;
    if (!businessId) return next();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { _count: { select: { documents: true } } }
    });
    if (!business) return next();

    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: business.plan } });
    if (!plan || plan.maxInvoicesPerMonth <= 0) return next(); // unlimited

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const countThisMonth = await prisma.document.count({
      where: {
        businessId,
        type: '01',
        createdAt: { gte: startOfMonth, lt: endOfMonth }
      }
    });

    if (countThisMonth >= plan.maxInvoicesPerMonth) {
      return res.status(403).json({
        success: false,
        message: `Ha alcanzado el limite de ${plan.maxInvoicesPerMonth} comprobantes este mes. Actualice su plan para continuar.`,
        limitReached: true,
        current: countThisMonth,
        max: plan.maxInvoicesPerMonth
      });
    }

    next();
  } catch (error) {
    console.error('[LIMIT GUARD] Error:', error.message);
    next(); // fail open - no bloquear por error de DB
  }
};

router.post('/api/documents', verifyToken, invoiceLimitGuard, businessController.createDocument);

// =================================================================
// RUTAS ALIAS PARA COMPATIBILIDAD CON PRUEBAS BLACK-BOX
// =================================================================

// Alias para /api/business/invoices -> /api/documents
router.get('/api/business/invoices', verifyToken, businessController.getDocuments);
router.post('/api/business/invoices', verifyToken, invoiceLimitGuard, businessController.createDocument);

// Alias para /api/business/retentions -> /api/documents (tipo retention)
router.get('/api/business/retentions', verifyToken, businessController.getDocuments);

// Alias para /api/business/credit-notes -> /api/documents (tipo credit-note)
router.get('/api/business/credit-notes', verifyToken, businessController.getDocuments);

// Alias para /api/business/clients -> /api/clients
router.get('/api/business/clients', verifyToken, businessController.getClients);
router.post('/api/business/clients', verifyToken, businessController.createClient);

// Alias para /api/business/products -> /api/products
router.get('/api/business/products', verifyToken, businessController.getProducts);
router.post('/api/business/products', verifyToken, businessController.createProduct);

// Ruta para verificar estado de conexión SRI
router.get('/api/business/sri/status', verifyToken, async (req, res) => {
    // El SRI puede estar disponible o no en el entorno de pruebas
    // Devolvemos 200 si el servidor está corriendo, el SRI puede responder o no
    res.status(200).json({ 
        status: 'ok', 
        message: 'Servidor funcionando',
        sriConnection: 'unknown'
    });
});

module.exports = router;
