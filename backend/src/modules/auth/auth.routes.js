const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const verifyToken = require('../../middleware/jwt.middleware');
router.post('/api/login', authController.login);
router.post('/api/logout', authController.logout);
router.post('/api/refresh-token', authController.refreshToken);
router.post('/api/register', authController.register);
router.post('/api/verify-email', authController.verifyEmail);
router.post('/api/resend-verification', verifyToken, authController.resendVerification);
router.put('/api/profile', verifyToken, authController.updateUserProfile);
router.post('/api/change-password', verifyToken, authController.changeUserPassword);
router.post('/api/forgot-password', authController.forgotPassword);
router.post('/api/reset-password', authController.resetPassword);
router.post('/api/auth/client/login', authController.clientLogin);
router.post('/api/auth/client/logout', authController.clientLogout);
router.post('/api/auth/client/forgot-password', authController.clientForgotPassword);
router.post('/api/auth/client/reset-password', authController.clientResetPassword);
router.post('/api/auth/client/change-password', verifyToken, authController.changeClientPassword);
router.get('/api/client/documents', verifyToken, authController.getClientDocuments);
router.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
