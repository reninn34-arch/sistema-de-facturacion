const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { catchAsync, AppError } = require('../middleware/error.handler');
const { validatePayment, validateAmount } = require('../services/paypal.service');
const prisma = require('../../prisma/client');

console.log("? [LOAD] Cargando AuthController..."); // Log para verificar carga

// JWT_SECRET debe estar configurado en variables de entorno
if (!process.env.JWT_SECRET) {
  console.warn('?? JWT_SECRET no est� configurado en .env - usando valor por defecto inseguro');
}
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

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
      console.log('?? [LOGIN] Usuario no encontrado o inactivo:', email);
      throw new AppError('Credenciales inv�lidas o usuario inactivo', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('?? [LOGIN] Contrase�a incorrecta para:', email);
      throw new AppError('Credenciales inv�lidas', 401);
    }

    console.log('? [LOGIN] Login exitoso para:', email);

    // Generar Token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        businessId: user.businessId 
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

    res.json({
      success: true,
      token,
      user: userWithDemoFlag,
      subscriptionExpired: isSubscriptionExpired,
      businessActive: isBusinessActive,
      subscriptionPending: isSubscriptionPending
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
    const { email, password, name, ruc, plan, businessName, phone, address, paymentMethod, paymentId, businessType } = req.body;

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
          businessId: business.id
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
            referenceNumber: null
          }
        });
        activationRequestId = activationReq.id;
      }

      return { business, user, activationRequestId };
    });

    // Generar token autom�ticamente
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email, 
        role: result.user.role,
        businessId: result.business.id 
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    const { password: _, ...userWithoutPass } = result.user;

    // Mensaje diferente seg�n el m�todo de pago
    const message = isFreePlan
      ? 'Registro exitoso. Su cuenta gratuita est� activa.'
      : paymentMethod === 'TRANSFER' 
        ? 'Registro exitoso. Su cuenta est� pendiente de aprobaci�n. Recibir� una notificaci�n cuando el administrador verifique su pago.'
        : 'Registro exitoso';

    res.json({ 
      success: true, 
      token,
      user: { ...userWithoutPass, business: result.business },
      message,
      pendingApproval: !isFreePlan && paymentMethod === 'TRANSFER',
      activationRequestId: result.activationRequestId || null
    });
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
    res.json({ message: "Funcionalidad pendiente: forgotPassword" });
  }),

  resetPassword: catchAsync(async (req, res) => {
    res.json({ message: "Funcionalidad pendiente: resetPassword" });
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
      console.log('?? [CLIENT_LOGIN] Cliente no encontrado:', identification);
      return res.status(401).json({ message: 'Credenciales inv�lidas' });
    }
    
    // Verificar contrase�a
    let isValidPassword = false;
    if (client.password) {
      // Si tiene contrase�a, verificarla normalmente
      isValidPassword = await bcrypt.compare(password, client.password);
    } else {
      // Si NO tiene contrase�a, el cliente debe establecer una contrase�a
      // Se rechaza el login hasta que establezca su contrase�a
      console.log('?? [CLIENT_LOGIN] Cliente sin contrase�a establecida:', identification);
      return res.status(401).json({ 
        message: 'Debe establecer su contrase�a para acceder al portal',
        requirePasswordSetup: true 
      });
    }
    
    if (!isValidPassword) {
      console.log('?? [CLIENT_LOGIN] Contrase�a incorrecta para:', identification);
      return res.status(401).json({ message: 'Credenciales inv�lidas' });
    }
    
    console.log('? [CLIENT_LOGIN] Login exitoso para:', identification);
    
    // Generar token
    const token = jwt.sign(
      { id: client.id, type: 'CLIENT', ruc: client.ruc },
      JWT_SECRET,
      { expiresIn: '1h' } // Sesi�n de 1 hora para clientes
    );
    
    // Verificar si necesita cambiar contrase�a
    const requirePasswordChange = !client.password;
    
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
    res.json({ message: "Funcionalidad pendiente: clientForgotPassword" });
  }),

  changeClientPassword: catchAsync(async (req, res) => {
    // Ahora require autenticaci�n via verifyClientToken middleware
    // El clientId viene del token autenticado, no del body
    const clientId = req.client?.id;
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
    res.json({ message: "Funcionalidad pendiente: changeUserPassword" });
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

      // También agrupar por negocio
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
};

module.exports = authController;



