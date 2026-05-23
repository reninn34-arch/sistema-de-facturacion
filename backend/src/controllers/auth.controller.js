const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { catchAsync, AppError } = require('../middleware/error.handler');
const { validatePayment, validateAmount } = require('../services/paypal.service');
const prisma = require('../../prisma/client');
const sessionController = require('./session.controller');
const emailService = require('../services/email.service');

console.log("? [LOAD] Cargando AuthController..."); // Log para verificar carga

// JWT_SECRET debe estar configurado en variables de entorno
if (!process.env.JWT_SECRET) {
  console.warn('?? JWT_SECRET no est� configurado en .env - usando valor por defecto inseguro');
}
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const authController = {
  // Login de Usuarios (Panel Administrativo)
  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email y contrase�a son requeridos', 400);
    }

    // ?? Log: Verificar conexi�n a la base de datos
    console.log('?? [LOGIN] Iniciando proceso de login para email:', email);
    
    try {
      // Verificar conexi�n a la DB
      await prisma.$connect();
      console.log('? [DB] Conexion a la base de datos exitosa');
    } catch (dbError) {
      console.error('? [DB] Error de conexion a la base de datos:', dbError.message);
      throw new AppError('Error de conexion a la base de datos', 503);
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        include: { business: true }
      });
      console.log('?? [DB] Consulta ejecutada, resultado:', user ? 'Usuario encontrado' : 'Usuario no encontrado');
    } catch (queryError) {
      console.error('? [DB] Error en consulta de usuario:', queryError.message);
      throw new AppError('Error al consultar la base de datos', 500);
    }

    if (!user || !user.isActive) {
      console.log('⚠️ [LOGIN] Usuario no encontrado o inactivo:', email);
      throw new AppError('Credenciales inválidas o usuario inactivo', 401);
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      console.log('🔒 [LOGIN] Cuenta bloqueada:', email, '-', minutesLeft, 'min restantes');
      throw new AppError(`Cuenta bloqueada por exceso de intentos. Intente de nuevo en ${minutesLeft} minuto(s).`, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        console.log('🔒 [LOGIN] Cuenta bloqueada por 15min:', email);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      console.log('❌ [LOGIN] Contraseña incorrecta para:', email, '(intento', attempts, 'de', MAX_LOGIN_ATTEMPTS, ')');
      throw new AppError('Credenciales inválidas', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshTokenValue }
    });

    console.log('✅ [LOGIN] Login exitoso para:', email);

    // Crear registro de sesión (dispositivo, IP, navegador)
    let session;
    try {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      const userAgent = req.get('User-Agent') || null;
      session = await sessionController.createSession(user.id, user.businessId, ip, userAgent);
    } catch (e) {
      console.error('Error creando sesión:', e.message);
    }

    // Generar Token (incluye sessionId para validación en middleware)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        businessId: user.businessId,
        sessionId: session?.id || null
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Ocultar password en respuesta
    const { password: _, ...userWithoutPass } = user;

    // Agregar flag isDemo desde el negocio
    const userWithDemoFlag = {
      ...userWithoutPass,
      isDemo: user.business?.isDemo || false,
      businessType: user.business?.businessType || 'GENERAL'
    };

    // Verificar si la suscripci�n est� vencida o pendiente
    const now = new Date();
    const isSubscriptionExpired = !user.business?.subscriptionEnd || new Date(user.business.subscriptionEnd) < now;
    const isBusinessActive = user.business?.isActive && !isSubscriptionExpired;
    const isSubscriptionPending = user.business?.subscriptionStatus === 'PENDING';

    // Obtener permisos de módulo del usuario y plan hasModuleControl
    let userModulePermissions = [];
    let hasModuleControl = false;
    if (user.businessId && user.business?.plan) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { code: user.business.plan },
        select: { hasModuleControl: true }
      });
      hasModuleControl = plan?.hasModuleControl || false;

      if (hasModuleControl) {
        userModulePermissions = await prisma.userModulePermission.findMany({
          where: { userId: user.id },
          select: { moduleId: true, granted: true, module: { select: { code: true } } }
        });
        // Aplanar para que el frontend reciba { moduleCode, granted }
        userModulePermissions = userModulePermissions.map(p => ({
          moduleCode: p.module.code,
          granted: p.granted
        }));
      }
    }

    res.json({
      success: true,
      token,
      refreshToken: refreshTokenValue,
      user: userWithDemoFlag,
      sessionId: session?.id || null,
      subscriptionExpired: isSubscriptionExpired,
      businessActive: isBusinessActive,
      subscriptionPending: isSubscriptionPending,
      hasModuleControl,
      modulePermissions: userModulePermissions
    });
  }),

  // Verificar Token (Requerido por TC-BB-009)
  verify: catchAsync(async (req, res) => {
    // Se asume que el middleware de autenticaci�n (protect) ya valid� el token y asign� req.user
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true }
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const { password: _, ...userWithoutPass } = user;

    // Agregar flag isDemo desde el negocio
    const userWithDemoFlag = {
      ...userWithoutPass,
      isDemo: user.business?.isDemo || false,
      businessType: user.business?.businessType || 'GENERAL'
    };

    res.json({
      success: true,
      user: userWithDemoFlag
    });
  }),

  // Registro de nuevos usuarios (Suscripci�n P�blica)
  register: catchAsync(async (req, res) => {
    const { email, password, name, ruc, plan, businessName, phone, address, paymentMethod, paymentId, businessType, referralCode, documents } = req.body;

    // Validaci�n de RUC (Requerido por TC-BB-008)
    if (ruc && ruc.length !== 13) {
      throw new AppError('El RUC debe tener 13 d�gitos', 400);
    }

    // Validar contrase�a (m�nimo 6 caracteres)
    if (password && password.length < 6) {
      throw new AppError('La contrase�a debe tener al menos 6 caracteres', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('El usuario ya existe', 400);

    // Validar plan desde la base de datos
    const planRecord = await prisma.subscriptionPlan.findUnique({ where: { code: plan } });
    if (!planRecord || !planRecord.isActive) {
      throw new AppError('Plan no v�lido o no disponible', 400);
    }
    const selectedPlan = planRecord.code;
    const isFreePlan = planRecord.price === 0;
    const planPrice = planRecord.priceWithTax || planRecord.price || 0;

    // Si el m�todo de pago es PayPal, validar el pago (solo para planes de pago)
    if (!isFreePlan && paymentMethod === 'PAYPAL' && paymentId) {
      // Verificar si PayPal est� configurado
      const paypalConfigured = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
      
      if (!paypalConfigured) {
        console.warn('?? PayPal credentials not configured - skipping payment validation');
        // En modo desarrollo sin credenciales, aceptamos el pago
      } else {
        const validation = await validatePayment(paymentId);
        
        if (!validation.valid) {
          throw new AppError(`Pago de PayPal no v�lido: ${validation.error}`, 400);
        }

        // Validar que el monto coincida con el plan
        console.log('[DEBUG register] validateAmount - validation.amount:', validation.amount, 'selectedPlan:', selectedPlan);
        
        const planPrices = { price: planRecord.price, priceWithTax: planRecord.priceWithTax };
        console.log('[DEBUG register] Plan prices from DB:', planPrices);
        
        try {
          validateAmount(validation.amount, selectedPlan, planPrices);
        } catch (amountError) {
          throw new AppError(`Error en el monto del pago: ${amountError.message}`, 400);
        }

        console.log('? Payment validated:', {
          orderId: validation.orderId,
          amount: validation.amount,
          captureId: validation.captureId
        });
      }
    } else if (!isFreePlan && paymentMethod === 'PAYPAL' && !paymentId) {
      // Si es PayPal pero no hay paymentId, es un error
      throw new AppError('Se requiere ID de pago de PayPal', 400);
    }

    // Calcular fecha de vencimiento usando la duraci�n del plan desde la BD
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + (planRecord.durationDays || 30));

    const hashedPassword = await bcrypt.hash(password, 10);

    // Determinar el estado inicial seg�n el m�todo de pago
    // Plan gratuito: activaci�n inmediata
    // PayPal/Tarjeta: activaci�n inmediata
    // Transferencia: pendiente hasta aprobaci�n del superadmin
    const isPaymentConfirmed = isFreePlan || paymentMethod === 'PAYPAL' || paymentMethod === 'CARD' || paymentMethod === 'FREE';
    const initialStatus = isPaymentConfirmed ? 'ACTIVE' : 'PENDING';
    const initialIsActive = isPaymentConfirmed;

    const verifyToken = crypto.randomBytes(32).toString('hex');

    const result = await prisma.$transaction(async (tx) => {
      const validBusinessTypes = ['GENERAL', 'BAKERY', 'RESTAURANT', 'STORE', 'SERVICE'];
      const selectedBusinessType = businessType && validBusinessTypes.includes(businessType) ? businessType : 'GENERAL';

      const business = await tx.business.create({
        data: {
          name: businessName || name || 'Mi Empresa',
          ruc: ruc || '9999999999999',
          email,
          phone: phone || '',
          address: address || '',
          plan: selectedPlan,
          isActive: initialIsActive,
          subscriptionStart: isPaymentConfirmed ? new Date() : null,
          subscriptionEnd: isPaymentConfirmed ? subscriptionEnd : null,
          subscriptionStatus: initialStatus,
          businessType: selectedBusinessType
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          businessId: business.id,
          verificationToken: verifyToken,
          emailVerified: false
        }
      });

      // Si es transferencia, crear autom�ticamente una solicitud de activaci�n
      // para que el superadmin pueda aprobarla despu�s
      let activationRequestId = null;
      if (!isFreePlan && paymentMethod === 'TRANSFER') {
        const activationReq = await tx.activationRequest.create({
          data: {
            businessId: business.id,
            plan: selectedPlan,
            amount: planPrice,
            paymentMethod: 'TRANSFER',
            status: 'PENDING',
            referenceNumber: null,
            documents: documents || null
          }
        });
        activationRequestId = activationReq.id;
      }

      return { business, user, activationRequestId };
    });

    const { password: _, ...userWithoutPass } = result.user;

    if (referralCode) {
      try {
        const referrer = await prisma.business.findUnique({ where: { referralCode } });
        if (referrer && referrer.id !== result.business.id) {
          const config = await prisma.pointsConfig.findUnique({ where: { id: 'global' } });
          const pointsAward = config?.pointsPerReferral || 50;

          await prisma.referral.create({
            data: {
              referrerBusinessId: referrer.id,
              referredName: result.business.name,
              referredRuc: result.business.ruc,
              referralCode,
              pointsAwarded: pointsAward,
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
          await prisma.business.update({
            where: { id: referrer.id },
            data: { points: { increment: pointsAward } }
          });
          console.log(`[Referral] ${result.business.name} fue referido por ${referrer.name} (+${pointsAward} pts)`);
        }
      } catch (refErr) {
        console.error('[Referral] Error procesando referido:', refErr.message);
      }
    }

    // Mensaje diferente segn el mtodo de pago
    const message = isFreePlan
      ? 'Registro exitoso. Su cuenta gratuita est activa.'
      : paymentMethod === 'TRANSFER' 
        ? 'Registro exitoso. Su cuenta est pendiente de aprobacin. Recibir una notificacin cuando el administrador verifique su pago.'
        : 'Registro exitoso';

    res.json({ 
      success: true, 
      user: { ...userWithoutPass, business: result.business },
      message,
      pendingApproval: !isFreePlan && paymentMethod === 'TRANSFER',
      activationRequestId: result.activationRequestId || null,
      emailVerified: false
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    const verifyEmailContent = emailService.buildVerificationEmail(verifyLink, result.user.name || businessName);
    emailService.sendEmail({ to: email, ...verifyEmailContent }).catch(e =>
      console.error('[EMAIL] Error enviando verificación:', e.message)
    );
  }),

  // Actualizar perfil propio
  updateUserProfile: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { name, email } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email }
    });

    res.json({ success: true, user: updatedUser });
  }),

  // Placeholders para evitar errores de "undefined" en las rutas
  forgotPassword: catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError('El correo electrónico es requerido', 400);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const emailContent = emailService.buildPasswordResetEmail(resetLink, user.name);

    await emailService.sendEmail({ to: user.email, ...emailContent });

    res.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  }),

  resetPassword: catchAsync(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw new AppError('Token y nueva contraseña son requeridos', 400);
    if (newPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumber) {
      throw new AppError('La contraseña debe contener al menos una mayúscula y un número', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) throw new AppError('Token inválido o expirado. Solicite un nuevo enlace.', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken: null
      }
    });

    res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya puede iniciar sesión.' });
  }),

  clientLogin: catchAsync(async (req, res) => {
    const { identification, password } = req.body;
    
    if (!identification || !password) {
      return res.status(400).json({ message: 'Identificaci�n y contrase�a son requeridos' });
    }

    // ?? Log: Verificar conexi�n a la base de datos
    console.log('?? [CLIENT_LOGIN] Iniciando proceso de login para identificaci�n:', identification);
    
    try {
      // Verificar conexi�n a la DB
      await prisma.$connect();
      console.log('? [DB] Conexi�n a la base de datos exitosa');
    } catch (dbError) {
      console.error('? [DB] Error de conexi�n a la base de datos:', dbError.message);
      throw new AppError('Error de conexi�n a la base de datos', 503);
    }
    
    // Buscar cliente por RUC (identification)
    let client;
    let isBusiness = false;
    let business = null;
    
    try {
      client = await prisma.client.findFirst({
        where: { ruc: identification }
      });
      
      // Si no encuentra cliente, buscar en negocios (empresas)
      if (!client) {
        business = await prisma.business.findFirst({
          where: { ruc: identification }
        });
        if (business) {
          isBusiness = true;
          console.log('?? [DB] Empresa encontrada por RUC:', business.name);
        }
      }
      
      console.log('?? [DB] Consulta ejecutada, resultado:', client ? 'Cliente encontrado' : (isBusiness ? 'Empresa encontrada' : 'No encontrado'));
    } catch (queryError) {
      console.error('? [DB] Error en consulta:', queryError.message);
      throw new AppError('Error al consultar la base de datos', 500);
    }
    
    // Si es una empresa (business), verificar contrase�a contra usuarios del sistema
    if (isBusiness && business) {
      // Buscar usuarios de la empresa
      const users = await prisma.user.findMany({
        where: { businessId: business.id }
      });
      
      // Verificar la contrase�a contra cualquier usuario de la empresa
      let validUser = null;
      for (const user of users) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          validUser = user;
          break;
        }
      }
      
      if (!validUser) {
        console.log('?? [CLIENT_LOGIN] Contrase�a incorrecta para empresa:', identification);
        return res.status(401).json({ message: 'Credenciales inv�lidas' });
      }
      
      console.log('? [CLIENT_LOGIN] Login exitoso para empresa:', business.name, 'con usuario:', validUser.email);
      
      // Generar token para empresa
      const token = jwt.sign(
        { id: business.id, type: 'BUSINESS', ruc: business.ruc, businessId: business.id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.json({        success: true, token,
        user: {
          id: business.id,
          name: business.name,
          identification: business.ruc,
          type: 'BUSINESS'
        },
        requirePasswordChange: false
      });
      return;
    }
    
    // Continuar con el flujo normal de cliente
    // Normalizar mensaje de error para evitar enumeraci�n de usuarios
    if (!client) {
      console.log('[CLIENT_LOGIN] Cliente no encontrado:', identification);
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    if (client.lockedUntil && new Date(client.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(client.lockedUntil) - new Date()) / 60000);
      return res.status(423).json({ message: `Cuenta bloqueada por exceso de intentos. Intente de nuevo en ${minutesLeft} minuto(s).` });
    }
    
    let isValidPassword = false;
    let isFirstLogin = false;
    if (client.password) {
      isValidPassword = await bcrypt.compare(password, client.password);
    } else {
      if (password === identification) {
        isValidPassword = true;
        isFirstLogin = true;
        console.log('[CLIENT_LOGIN] Primer acceso detectado para:', identification);
      } else {
        console.log('[CLIENT_LOGIN] Primer acceso: contrasena temporal incorrecta para:', identification);
        return res.status(401).json({ 
          message: 'Para su primer acceso, ingrese su numero de Cedula o RUC como contrasena',
          requirePasswordSetup: true 
        });
      }
    }
    
    if (!isValidPassword) {
      const attempts = (client.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }
      await prisma.client.update({ where: { id: client.id }, data: updateData });
      console.log('[CLIENT_LOGIN] Contrasena incorrecta para:', identification, '(intento', attempts, 'de', MAX_LOGIN_ATTEMPTS, ')');
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
    
    console.log('[CLIENT_LOGIN] Login exitoso para:', identification);
    
    // Generar token
    const token = jwt.sign(
      { id: client.id, type: 'CLIENT', ruc: client.ruc },
      JWT_SECRET,
      { expiresIn: '1h' } // Sesi�n de 1 hora para clientes
    );
    
    // Verificar si necesita cambiar contraseña (primer acceso o sin contraseña)
    const requirePasswordChange = isFirstLogin || !client.password;
    
    // Exponer requirePasswordChange para que el frontend muestre la pantalla de cambio de contrase�a
    res.json({
      success: true,
      token,
      user: {
        id: client.id,
        ruc: client.ruc,
        name: client.name,
        email: client.email,
        type: 'CLIENT'
      },
      requirePasswordChange,
      message: 'LOGIN_SUCCESS'
    });
  }),

  clientForgotPassword: catchAsync(async (req, res) => {
    const { identification } = req.body;
    if (!identification) throw new AppError('El número de cédula/RUC es requerido', 400);

    const client = await prisma.client.findFirst({ where: { ruc: identification } });
    if (!client || !client.email) {
      return res.json({ success: true, message: 'Si los datos son correctos, recibirás un enlace en tu correo.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.client.update({
      where: { id: client.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/portal/reset-password?token=${resetToken}&id=${client.ruc}`;
    const emailContent = emailService.buildPasswordResetEmail(resetLink, client.name);

    await emailService.sendEmail({ to: client.email, ...emailContent });

    res.json({ success: true, message: 'Si los datos son correctos, recibirás un enlace en tu correo.' });
  }),

  clientResetPassword: catchAsync(async (req, res) => {
    const { token, identification, newPassword } = req.body;
    if (!token || !identification || !newPassword) {
      throw new AppError('Token, identificación y nueva contraseña son requeridos', 400);
    }
    if (newPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);

    const client = await prisma.client.findFirst({
      where: {
        ruc: identification,
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!client) throw new AppError('Token inválido o expirado.', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.client.update({
      where: { id: client.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya puede iniciar sesión en el portal.' });
  }),

  changeClientPassword: catchAsync(async (req, res) => {
    // Ahora require autenticaci�n via verifyClientToken middleware
    // El clientId viene del token autenticado, no del body
    const clientId = req.user?.id;
    const { newPassword } = req.body;
    
    if (!clientId) {
      return res.status(401).json({ message: 'Autenticaci�n requerida' });
    }
    
    if (!newPassword) {
      return res.status(400).json({ message: 'Nueva contrase�a requerida' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La contrase�a debe tener al menos 6 caracteres' });
    }
    
    // Hash de la nueva contrase�a
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contrase�a usando el ID del token
    const client = await prisma.client.update({
      where: { id: clientId },
      data: { password: hashedPassword }
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    res.json({ message: 'Contrase�a actualizada correctamente' });
  }),

  changeUserPassword: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Contraseña actual y nueva son requeridas', 400);
    }
    if (newPassword.length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumber) {
      throw new AppError('La nueva contraseña debe contener al menos una mayúscula y un número', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('La contraseña actual es incorrecta', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null
      }
    });

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  }),

  // Obtener documentos del cliente (para portal de clientes)
  getClientDocuments: catchAsync(async (req, res) => {
    // El token contiene la información del usuario (type y ruc)
    const { type, ruc } = req.user || {};
    
    if (!ruc) {
      throw new AppError('No se pudo identificar al cliente', 400);
    }

    let documents = [];
    let documentsByBusiness = [];

    if (type === 'BUSINESS') {
      // Si es una empresa, buscar sus facturas SaaS
      documents = await prisma.document.findMany({
        where: {
          entityRuc: ruc,
          invoiceType: 'SaaS'
        },
        include: {
          business: {
            select: { id: true, name: true, ruc: true }
          }
        },
        orderBy: { issueDate: 'desc' }
      });
    } else {
      // Si es un cliente, buscar facturas emitidas a su RUC
      documents = await prisma.document.findMany({
        where: {
          entityRuc: ruc,
          OR: [
            { invoiceType: 'CLIENT' },
            { invoiceType: null }
          ]
        },
        include: {
          business: {
            select: { id: true, name: true, ruc: true }
          }
        },
        orderBy: { issueDate: 'desc' }
      });

      // Tambien agrupar por negocio
      const docsByBusinessMap = {};
      documents.forEach(doc => {
        const businessId = doc.businessId;
        if (!docsByBusinessMap[businessId]) {
          docsByBusinessMap[businessId] = {
            business: doc.business,
            documents: []
          };
        }
        docsByBusinessMap[businessId].documents.push(doc);
      });
      documentsByBusiness = Object.values(docsByBusinessMap);
    }

    res.json({
      documents,
      documentsByBusiness
    });
  }),

  refreshToken: catchAsync(async (req, res) => {
    const { refreshToken: tokenValue } = req.body;
    if (!tokenValue) throw new AppError('Refresh token requerido', 400);

    const user = await prisma.user.findFirst({ where: { refreshToken: tokenValue } });
    if (!user) throw new AppError('Refresh token invalido o expirado', 401);

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken }
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        sessionId: null
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({ success: true, token, refreshToken: newRefreshToken });
  }),

  verifyEmail: catchAsync(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new AppError('Token de verificacion requerido', 400);

    const user = await prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) throw new AppError('Token de verificacion invalido o ya utilizado', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null }
    });

    res.json({ success: true, message: 'Correo verificado correctamente.' });
  }),

  resendVerification: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.emailVerified) throw new AppError('El correo ya esta verificado', 400);

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: userId },
      data: { verificationToken: verifyToken }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    const emailContent = emailService.buildVerificationEmail(verifyLink, user.name);

    await emailService.sendEmail({ to: user.email, ...emailContent });

    res.json({ success: true, message: 'Correo de verificaci\u00f3n reenviado.' });
  }),
};

module.exports = authController;



