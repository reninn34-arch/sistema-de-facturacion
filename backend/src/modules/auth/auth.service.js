const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AppError } = require('../../middleware/error.handler');
const { validatePayment, validateAmount } = require('../../services/paypal.service');
const { getEffectiveModulePermissions } = require('../../utils/roleModules');
const { sanitizeBusinessForClient } = require('../../utils/maskedCredentials');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET must be set in production'); })() : 'secret_key_change_me');
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

class AuthService {
  constructor(repo) {
    this.repo = repo;
  }

  async login(email, password, ip, userAgent, sessionController) {
    if (!email || !password) {
      throw new AppError('Email y contraseña son requeridos', 400);
    }

    await this.repo.findUserByEmail(email); // verifica conexión

    const user = await this.repo.findUserByEmail(email);
    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas o usuario inactivo', 401);
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      throw new AppError(`Cuenta bloqueada por exceso de intentos. Intente de nuevo en ${minutesLeft} minuto(s).`, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }
      await this.repo.updateUser(user.id, updateData);
      throw new AppError('Credenciales inválidas', 401);
    }

    await this.repo.updateUser(user.id, { failedLoginAttempts: 0, lockedUntil: null });

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    await this.repo.updateUser(user.id, { refreshToken: refreshTokenValue });

    let session = null;
    try {
      if (sessionController && typeof sessionController.createSession === 'function') {
        session = await sessionController.createSession(user.id, user.businessId, ip, userAgent);
      }
    } catch (e) {
      console.error('Error creando sesión:', e.message);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, businessId: user.businessId, sessionId: session?.id || null },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    const { password: _, ...userWithoutPass } = user;
    const userWithDemoFlag = {
      ...userWithoutPass,
      // El usuario recibe su empresa SIN el certificado ni las credenciales SMTP:
      // antes cualquier empleado (VENDEDOR/CONTADOR) las obtenía al iniciar sesión.
      business: sanitizeBusinessForClient(userWithoutPass.business),
      isDemo: user.business?.isDemo || false,
      businessType: user.business?.businessType || 'GENERAL'
    };

    const now = new Date();
    const isSubscriptionExpired = !user.business?.subscriptionEnd || new Date(user.business.subscriptionEnd) < now;
    const isSubscriptionPending = user.business?.subscriptionStatus === 'PENDING';

    let explicitPermissions = [];
    let hasModuleControl = false;
    if (user.businessId && user.business?.plan) {
      const plan = await this.repo.findSubscriptionPlan(user.business.plan);
      hasModuleControl = plan?.hasModuleControl || false;
      // El ajuste fino por usuario sigue siendo función del plan de pago.
      if (hasModuleControl) {
        const permissions = await this.repo.findUserModulePermissions(user.id);
        explicitPermissions = permissions.map(p => ({ moduleCode: p.module.code, granted: p.granted }));
      }
    }
    // Los defaults por rol (mínimo privilegio) aplican SIEMPRE; los permisos
    // explícitos por usuario se superponen encima.
    const userModulePermissions = getEffectiveModulePermissions(user.role, explicitPermissions);

    return {
      token,
      refreshToken: refreshTokenValue,
      user: userWithDemoFlag,
      sessionId: session?.id || null,
      subscriptionExpired: isSubscriptionExpired,
      businessActive: user.business?.isActive && !isSubscriptionExpired,
      subscriptionPending: isSubscriptionPending,
      hasModuleControl,
      modulePermissions: userModulePermissions
    };
  }

  async verify(userId) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    const { password: _, ...userWithoutPass } = user;
    return {
      ...userWithoutPass,
      business: sanitizeBusinessForClient(userWithoutPass.business),
      isDemo: user.business?.isDemo || false,
      businessType: user.business?.businessType || 'GENERAL'
    };
  }

  async register(data) {
    const { email, password, name, ruc, plan, businessName, phone, address, paymentMethod, paymentId, businessType, referralCode, documents } = data;

    if (ruc && ruc.length !== 13) throw new AppError('El RUC debe tener 13 dígitos', 400);
    if (password && password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);

    const existing = await this.repo.findUserByEmail(email);
    if (existing) throw new AppError('El usuario ya existe', 400);

    if (ruc) {
      const existingBusiness = await this.repo.findBusinessByRuc(ruc);
      if (existingBusiness) throw new AppError('La empresa con este RUC ya está registrada', 400);
    }

    const planCodeToUse = plan || 'FREE';
    const planRecord = await this.repo.findSubscriptionPlan(planCodeToUse);
    if (!planRecord || !planRecord.isActive) throw new AppError('Plan no válido o no disponible', 400);

    const selectedPlan = planRecord.code;
    const isFreePlan = planRecord.price === 0;
    const planPrice = planRecord.priceWithTax || planRecord.price || 0;

    if (!isFreePlan && paymentMethod === 'PAYPAL' && paymentId) {
      const paypalConfigured = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
      if (paypalConfigured) {
        const validation = await validatePayment(paymentId);
        if (!validation.valid) throw new AppError(`Pago de PayPal no válido: ${validation.error}`, 400);
        validateAmount(validation.amount, selectedPlan, { price: planRecord.price, priceWithTax: planRecord.priceWithTax });
      }
    } else if (!isFreePlan && paymentMethod === 'PAYPAL' && !paymentId) {
      throw new AppError('Se requiere ID de pago de PayPal', 400);
    }

    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + (planRecord.durationDays || 30));

    const hashedPassword = await bcrypt.hash(password, 10);
    const isPaymentConfirmed = isFreePlan || paymentMethod === 'PAYPAL' || paymentMethod === 'CARD' || paymentMethod === 'FREE';
    const initialStatus = isPaymentConfirmed ? 'ACTIVE' : 'PENDING';
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const validBusinessTypes = ['GENERAL', 'BAKERY', 'RESTAURANT', 'STORE', 'SERVICE'];
    const selectedBusinessType = businessType && validBusinessTypes.includes(businessType) ? businessType : 'GENERAL';

    const business = await this.repo.createBusiness({
      name: businessName || name || 'Mi Empresa',
      ruc: ruc || '9999999999999',
      email,
      phone: phone || '',
      address: address || '',
      plan: selectedPlan,
      isActive: isPaymentConfirmed,
      subscriptionStart: isPaymentConfirmed ? new Date() : null,
      subscriptionEnd: isPaymentConfirmed ? subscriptionEnd : null,
      subscriptionStatus: initialStatus,
      businessType: selectedBusinessType
    });

    const user = await this.repo.createUser({
      email,
      password: hashedPassword,
      role: 'ADMIN',
      businessId: business.id,
      verificationToken: verifyToken,
      emailVerified: false
    });

    let activationRequestId = null;
    if (!isFreePlan && paymentMethod === 'TRANSFER') {
      const activationReq = await this.repo.createActivationRequest({
        businessId: business.id,
        plan: selectedPlan,
        amount: planPrice,
        paymentMethod: 'TRANSFER',
        status: 'PENDING',
        referenceNumber: null,
        documents: documents || null
      });
      activationRequestId = activationReq.id;
    }

    if (referralCode) {
      try {
        const referrer = await this.repo.findBusinessByReferralCode(referralCode);
        if (referrer && referrer.id !== business.id) {
          const config = await this.repo.findPointsConfig();
          const pointsAward = config?.pointsPerReferral || 50;
          await this.repo.createReferral({
            referrerBusinessId: referrer.id,
            referredName: business.name,
            referredRuc: business.ruc,
            referralCode,
            pointsAwarded: pointsAward,
            status: 'COMPLETED',
            completedAt: new Date()
          });
          await this.repo.updateBusinessPoints(referrer.id, pointsAward);
        }
      } catch (refErr) {
        console.error('[Referral] Error procesando referido:', refErr.message);
      }
    }

    const { password: _, ...userWithoutPass } = user;
    const message = isFreePlan
      ? 'Registro exitoso. Su cuenta gratuita está activa.'
      : paymentMethod === 'TRANSFER'
        ? 'Registro exitoso. Su cuenta está pendiente de aprobación.'
        : 'Registro exitoso';

    return {
      user: { ...userWithoutPass, business },
      message,
      pendingApproval: !isFreePlan && paymentMethod === 'TRANSFER',
      activationRequestId,
      emailVerified: false,
      verifyToken
    };
  }

  async updateProfile(userId, data) {
    return this.repo.updateUser(userId, data);
  }

  async forgotPassword(email) {
    if (!email) throw new AppError('El correo electrónico es requerido', 400);
    const user = await this.repo.findUserByEmail(email);
    if (!user) return null;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.repo.updateUser(user.id, { passwordResetToken: resetToken, passwordResetExpires: resetExpires });
    return { email: user.email, name: user.name, resetToken };
  }

  async resetPassword(token, newPassword) {
    if (!token || !newPassword) throw new AppError('Token y nueva contraseña son requeridos', 400);
    if (newPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumber) throw new AppError('La contraseña debe contener al menos una mayúscula y un número', 400);
    const user = await this.repo.findUserByResetToken(token);
    if (!user) throw new AppError('Token inválido o expirado. Solicite un nuevo enlace.', 400);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      refreshToken: null
    });
  }

  async clientLogin(identification, password) {
    if (!identification || !password) {
      throw new AppError('Identificación y contraseña son requeridos', 400);
    }

    let client = await this.repo.findClientByIdentification(identification);
    let isBusiness = false;
    let business = null;

    if (!client) {
      business = await this.repo.findBusinessByRuc(identification);
      if (business) isBusiness = true;
    }

    if (isBusiness && business) {
      const users = await this.repo.findUsersByBusiness(business.id);
      let validUser = null;
      for (const u of users) {
        if (await bcrypt.compare(password, u.password)) { validUser = u; break; }
      }
      if (!validUser) throw new AppError('Credenciales inválidas', 401);
      const token = jwt.sign(
        { id: business.id, type: 'BUSINESS', ruc: business.ruc, businessId: business.id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      return { success: true, token, user: { id: business.id, name: business.name, identification: business.ruc, type: 'BUSINESS' }, requirePasswordChange: false };
    }

    if (!client) throw new AppError('Credenciales inválidas', 401);

    if (client.lockedUntil && new Date(client.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(client.lockedUntil) - new Date()) / 60000);
      throw new AppError(`Cuenta bloqueada por exceso de intentos. Intente de nuevo en ${minutesLeft} minuto(s).`, 423);
    }

    let isValidPassword = false;
    let isFirstLogin = false;
    if (client.password) {
      isValidPassword = await bcrypt.compare(password, client.password);
    } else if (password === identification) {
      isValidPassword = true;
      isFirstLogin = true;
    } else {
      return { requirePasswordSetup: true };
    }

    if (!isValidPassword) {
      const attempts = (client.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }
      await this.repo.updateClient(client.id, updateData);
      throw new AppError('Credenciales inválidas', 401);
    }

    await this.repo.updateClient(client.id, { failedLoginAttempts: 0, lockedUntil: null });

    const token = jwt.sign(
      { id: client.id, type: 'CLIENT', ruc: client.ruc },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      success: true, token,
      user: { id: client.id, ruc: client.ruc, name: client.name, email: client.email, type: 'CLIENT' },
      requirePasswordChange: isFirstLogin || !client.password,
      message: 'LOGIN_SUCCESS'
    };
  }

  async clientForgotPassword(identification) {
    if (!identification) throw new AppError('El número de cédula/RUC es requerido', 400);
    const client = await this.repo.findClientByIdentification(identification);
    if (!client || !client.email) return null;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.repo.updateClient(client.id, { passwordResetToken: resetToken, passwordResetExpires: resetExpires });
    return { email: client.email, name: client.name, ruc: client.ruc, resetToken };
  }

  async clientResetPassword(token, identification, newPassword) {
    if (!token || !identification || !newPassword) throw new AppError('Token, identificación y nueva contraseña son requeridos', 400);
    if (newPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    const client = await this.repo.findClientByResetToken(token, identification);
    if (!client) throw new AppError('Token inválido o expirado.', 400);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updateClient(client.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null
    });
  }

  async changeClientPassword(clientId, newPassword) {
    if (!clientId) throw new AppError('Autenticación requerida', 401);
    if (!newPassword) throw new AppError('Nueva contraseña requerida', 400);
    if (newPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const client = await this.repo.updateClient(clientId, { password: hashedPassword });
    if (!client) throw new AppError('Cliente no encontrado', 404);
  }

  async changeUserPassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) throw new AppError('Contraseña actual y nueva son requeridas', 400);
    if (newPassword.length < 6) throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumber) throw new AppError('La nueva contraseña debe contener al menos una mayúscula y un número', 400);
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('La contraseña actual es incorrecta', 400);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updateUser(userId, { password: hashedPassword, refreshToken: null });
  }

  async getClientDocuments(user) {
    const { type, ruc } = user;
    if (!ruc) throw new AppError('No se pudo identificar al cliente', 400);

    if (type === 'BUSINESS') {
      const documents = await this.repo.findDocumentsByEntityRuc(ruc, { invoiceType: 'SaaS' });
      return { documents, documentsByBusiness: [] };
    }

    const documents = await this.repo.findDocumentsByEntityRuc(ruc, {
      OR: [{ invoiceType: 'CLIENT' }, { invoiceType: null }]
    });

    const docsByBusinessMap = {};
    documents.forEach(doc => {
      const bid = doc.businessId;
      if (!docsByBusinessMap[bid]) {
        docsByBusinessMap[bid] = { business: doc.business, documents: [] };
      }
      docsByBusinessMap[bid].documents.push(doc);
    });

    return { documents, documentsByBusiness: Object.values(docsByBusinessMap) };
  }

  async refreshToken(tokenValue) {
    if (!tokenValue) throw new AppError('Refresh token requerido', 400);
    const user = await this.repo.findUserByRefreshToken(tokenValue);
    if (!user) throw new AppError('Refresh token inválido o expirado', 401);
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    await this.repo.updateUser(user.id, { refreshToken: newRefreshToken });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, businessId: user.businessId, sessionId: null },
      JWT_SECRET,
      { expiresIn: '4h' }
    );
    return { token, refreshToken: newRefreshToken };
  }

  async verifyEmail(token) {
    if (!token) throw new AppError('Token de verificación requerido', 400);
    const user = await this.repo.findUserByVerificationToken(token);
    if (!user) throw new AppError('Token de verificación inválido o ya utilizado', 400);
    await this.repo.updateUser(user.id, { emailVerified: true, verificationToken: null });
  }

  async resendVerification(userId) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.emailVerified) throw new AppError('El correo ya está verificado', 400);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.repo.updateUser(user.id, { verificationToken: verifyToken });
    return { email: user.email, name: user.name, verifyToken };
  }
}

module.exports = AuthService;
