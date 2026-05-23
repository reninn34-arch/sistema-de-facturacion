const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middleware/jwt.middleware');
const businessController = require('../controllers/business.controller');

// Rutas de autenticación

// Login principal (panel administrativo)
router.post('/api/login', authController.login);

// Refresh token (mantener sesión sin re-login)
router.post('/api/refresh-token', authController.refreshToken);

// Registro de nuevos usuarios (Suscripción Pública)
router.post('/api/register', authController.register);

// Verificación de email
router.post('/api/verify-email', authController.verifyEmail);
router.post('/api/resend-verification', verifyToken, authController.resendVerification);

// Actualizar perfil propio
router.put('/api/profile', verifyToken, authController.updateUserProfile);

// Cambio de contraseña
router.post('/api/change-password', verifyToken, authController.changeUserPassword);

// Recuperación de contraseña
router.post('/api/forgot-password', authController.forgotPassword);
router.post('/api/reset-password', authController.resetPassword);

// ==========================================
// Rutas de Portal de Clientes
// ==========================================

// Login de clientes (portal público)
router.post('/api/auth/client/login', authController.clientLogin);

// Recuperación de contraseña de clientes
router.post('/api/auth/client/forgot-password', authController.clientForgotPassword);
router.post('/api/auth/client/reset-password', authController.clientResetPassword);

// Cambio de contraseña de clientes (requiere token)
router.post('/api/auth/client/change-password', verifyToken, authController.changeClientPassword);

// Obtener documentos del cliente (portal de clientes)
router.get('/api/client/documents', verifyToken, authController.getClientDocuments);

module.exports = router;
