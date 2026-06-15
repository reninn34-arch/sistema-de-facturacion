const { catchAsync } = require('../../middleware/error.handler');
const AuthService = require('./auth.service');
const AuthRepository = require('./auth.repository');
const SessionRepository = require('../session/session.repository');
const SessionService = require('../session/session.service');
const sessionController = new SessionService(new SessionRepository());
const emailService = require('../../services/email.service');

const repo = new AuthRepository();
const service = new AuthService(repo);

const authController = {
  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;

    const result = await service.login(email, password, ip, userAgent, sessionController);
    res.json({ success: true, ...result });
  }),

  verify: catchAsync(async (req, res) => {
    const user = await service.verify(req.user.id);
    res.json({ success: true, user });
  }),

  register: catchAsync(async (req, res) => {
    const result = await service.register(req.body);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/verify-email?token=${result.verifyToken}`;
    const emailContent = emailService.buildVerificationEmail(verifyLink, result.user.name || req.body.businessName);
    emailService.sendEmail({ to: req.body.email, ...emailContent }).catch(e =>
      console.error('[EMAIL] Error enviando verificación:', e.message)
    );

    const { verifyToken, ...response } = result;
    res.json({ success: true, ...response });
  }),

  updateUserProfile: catchAsync(async (req, res) => {
    const { name, email } = req.body;
    const updatedUser = await service.updateProfile(req.user.id, { name, email });
    res.json({ success: true, user: updatedUser });
  }),

  forgotPassword: catchAsync(async (req, res) => {
    const result = await service.forgotPassword(req.body.email);
    if (!result) {
      return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${result.resetToken}`;
    const emailContent = emailService.buildPasswordResetEmail(resetLink, result.name);
    await emailService.sendEmail({ to: result.email, ...emailContent });
    res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  }),

  resetPassword: catchAsync(async (req, res) => {
    await service.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya puede iniciar sesión.' });
  }),

  clientLogin: catchAsync(async (req, res) => {
    const result = await service.clientLogin(req.body.identification, req.body.password);
    if (result.requirePasswordSetup) {
      return res.status(401).json({
        message: 'Para su primer acceso, ingrese su número de Cédula o RUC como contraseña',
        requirePasswordSetup: true
      });
    }
    res.json(result);
  }),

  clientForgotPassword: catchAsync(async (req, res) => {
    const result = await service.clientForgotPassword(req.body.identification);
    if (!result) {
      return res.json({ success: true, message: 'Si los datos son correctos, recibirás un enlace en tu correo.' });
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/portal/reset-password?token=${result.resetToken}&id=${result.ruc}`;
    const emailContent = emailService.buildPasswordResetEmail(resetLink, result.name);
    await emailService.sendEmail({ to: result.email, ...emailContent });
    res.json({ success: true, message: 'Si los datos son correctos, recibirás un enlace en tu correo.' });
  }),

  clientResetPassword: catchAsync(async (req, res) => {
    const { token, identification, newPassword } = req.body;
    await service.clientResetPassword(token, identification, newPassword);
    res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya puede iniciar sesión en el portal.' });
  }),

  changeClientPassword: catchAsync(async (req, res) => {
    await service.changeClientPassword(req.user?.id, req.body.newPassword);
    res.json({ message: 'Contraseña actualizada correctamente' });
  }),

  changeUserPassword: catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await service.changeUserPassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  }),

  getClientDocuments: catchAsync(async (req, res) => {
    const result = await service.getClientDocuments(req.user);
    res.json(result);
  }),

  refreshToken: catchAsync(async (req, res) => {
    const result = await service.refreshToken(req.body.refreshToken);
    res.json({ success: true, ...result });
  }),

  verifyEmail: catchAsync(async (req, res) => {
    await service.verifyEmail(req.body.token);
    res.json({ success: true, message: 'Correo verificado correctamente.' });
  }),

  resendVerification: catchAsync(async (req, res) => {
    const result = await service.resendVerification(req.user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/verify-email?token=${result.verifyToken}`;
    const emailContent = emailService.buildVerificationEmail(verifyLink, result.name);
    await emailService.sendEmail({ to: result.email, ...emailContent });
    res.json({ success: true, message: 'Correo de verificación reenviado.' });
  }),
};

module.exports = authController;
