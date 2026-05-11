const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { catchAsync, AppError } = require('../middleware/error.handler');

// Usar cliente compartido de Prisma
const prisma = require('../../prisma/client');

const adminController = {
  // 1. Crear Nueva Empresa (Tenant)
  createBusiness: catchAsync(async (req, res) => {
    const { name, ruc, email, address, phone, plan, features, subscriptionEnd, password, businessType } = req.body;

    // Convertir strings vacíos a null para evitar problemas con Prisma
    const addressValue = address === '' ? null : address;
    const phoneValue = phone === '' ? null : phone;

    const existing = await prisma.business.findUnique({ where: { ruc } });
    if (existing) throw new AppError('La empresa ya existe con este RUC', 400);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new AppError('El correo electrónico ya está registrado por un usuario.', 400);

    // Validar plan
    const validPlans = ['FREE', 'BASIC', 'GASTRONOMICO', 'PRO', 'ENTERPRISE', 'MONTHLY', 'SEMIANNUAL', 'YEARLY', 'UNLIMITED', 'PENDING'];
    const selectedPlan = plan && validPlans.includes(plan) ? plan : 'PENDING';

    // Calcular fecha de vencimiento según el plan (solo si no es PENDING)
    let subscriptionEndDate = null;
    let subscriptionStatus = 'PENDING';
    
    if (selectedPlan !== 'PENDING') {
      subscriptionEndDate = subscriptionEnd ? new Date(subscriptionEnd) : new Date();
      subscriptionStatus = 'ACTIVE';
      
      if (selectedPlan === 'MONTHLY') {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      } else if (selectedPlan === 'SEMIANNUAL') {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 6);
      } else if (selectedPlan === 'YEARLY') {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      } else if (selectedPlan === 'UNLIMITED') {
        // Plan indefinido: 100 años
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 100);
      } else if (!subscriptionEnd) {
        // Planes old: 1 mes por defecto
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      }
    }

    // Transacción: Empresa + Secuenciales + Usuario Admin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa
      const newBusiness = await tx.business.create({
        data: {
          name,
          ruc,
          email,
          address: addressValue,
          phone: phoneValue,
          plan: selectedPlan,
          businessType: businessType || 'GENERAL',
          features: features || { inventory: true, accounting: false, billing: true },
          subscriptionStart: selectedPlan !== 'PENDING' ? new Date() : null,
          subscriptionEnd: subscriptionEndDate,
          subscriptionStatus: subscriptionStatus,
          isActive: selectedPlan !== 'PENDING',
          establishmentCode: '001',
          emissionPointCode: '001',
          isAccountingObliged: false
        }
      });

      // 2. Crear Secuenciales
      await tx.sequence.create({
        data: {
          type: '01', // Factura
          establishmentCode: '001',
          emissionPointCode: '001',
          currentValue: 1,
          businessId: newBusiness.id
        }
      });

      // 3. Crear Usuario Admin
      const hashedPassword = await bcrypt.hash(password || ruc, 10);
      await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          businessId: String(newBusiness.id)
        }
      });

      return newBusiness;
    });

    res.json(result);
  }),

  // 2. Obtener empresas con suscripciones por vencer
  getExpiringBusinesses: catchAsync(async (req, res) => {
    const today = new Date();

    // Cargar thresholds dinámicos por plan
    const allPlans = await prisma.subscriptionPlan.findMany({
      select: { code: true, durationDays: true }
    });
    const thresholdMap = {};
    allPlans.forEach(p => {
      const duration = p.durationDays || 30;
      thresholdMap[p.code] = Math.max(Math.ceil(duration * 0.50), 7);
    });

    // Traer empresas activas con suscripción vigente (excluir UNLIMITED)
    const allActiveWithSubscription = await prisma.business.findMany({
      where: {
        subscriptionEnd: { gte: today },
        isActive: true,
        plan: { not: 'UNLIMITED' }
      },
      select: {
        id: true, name: true, ruc: true, email: true, plan: true,
        subscriptionEnd: true, subscriptionStatus: true
      },
      orderBy: { subscriptionEnd: 'asc' }
    });

    // Filtrar solo las que están en zona de riesgo según su plan
    const expiringBusinesses = allActiveWithSubscription.filter(b => {
      const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const threshold = thresholdMap[b.plan] || 15;
      return daysLeft <= threshold;
    });

    res.json(expiringBusinesses);
  }),

  // 3. Listar todas las empresas
  getAllBusinesses: catchAsync(async (req, res) => {
    const businesses = await prisma.business.findMany({
      select: { 
        id: true, 
        name: true, 
        ruc: true, 
        isActive: true, 
        plan: true, 
        subscriptionStatus: true, 
        subscriptionEnd: true,
        sriEnabled: true,
        electronicSignature: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(businesses);
  }),

  // 4. Actualizar Empresa
  updateBusiness: catchAsync(async (req, res) => {
    const { id } = req.params;
    console.log('📝 UPDATE BUSINESS - Request body:', JSON.stringify(req.body));
    const { features, isActive, plan, subscriptionEnd, subscriptionStatus, phone, address, ...data } = req.body;

    // Convertir strings vacíos a null para evitar problemas con Prisma
    const phoneValue = phone === '' ? null : phone;
    const addressValue = address === '' ? null : address;
    console.log('📝 UPDATE BUSINESS - phone:', phone, '->', phoneValue);
    console.log('📝 UPDATE BUSINESS - address:', address, '->', addressValue);

    // Obtener el estado actual de la empresa para comparar
    const currentBusiness = await prisma.business.findUnique({ where: { id } });
    const wasActive = currentBusiness?.isActive;

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        ...data,
        phone: phoneValue,
        address: addressValue,
        features,
        isActive,
        plan,
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : undefined,
        subscriptionStatus
      }
    });
    console.log('📝 UPDATE BUSINESS - Result:', JSON.stringify(updatedBusiness));

    // Si se está desactivando la empresa (isActive cambia a false), desactivamos los usuarios
    let usersUpdated = 0;
    if (isActive === false && wasActive !== false) {
      const usersResult = await prisma.user.updateMany({
        where: {
          businessId: id,
          role: { not: 'CLIENTE' } // Excluir clientes
        },
        data: { isActive: false }
      });
      usersUpdated = usersResult.count;
      console.log(`📝 Desactivados ${usersUpdated} usuarios de la empresa ${currentBusiness?.name}`);
    }

    res.json({ 
      ...updatedBusiness,
      usersDeactivated: usersUpdated
    });
  }),

  // 4.1 Pausar/Activar Empresa
  toggleBusinessStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) throw new AppError('Empresa no encontrada', 404);

    const newStatus = isActive !== undefined ? isActive : !business.isActive;
    
    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: { 
        isActive: newStatus,
        // También actualizamos el subscriptionStatus según corresponda
        subscriptionStatus: newStatus ? 'ACTIVE' : 'SUSPENDED'
      }
    });

    // Si se desactiva la empresa, desactivamos todos los usuarios (ADMIN, CONTADOR, VENDEDOR)
    // Los clientes (CLIENTE) se mantienen activos
    let usersUpdated = 0;
    if (newStatus === false) {
      const usersResult = await prisma.user.updateMany({
        where: {
          businessId: id,
          role: { not: 'CLIENTE' } // Excluir clientes
        },
        data: { isActive: false }
      });
      usersUpdated = usersResult.count;
      console.log(`📝 Desactivados ${usersUpdated} usuarios de la empresa ${business.name}`);
    } else {
      // Si se reactiva la empresa, reactivamos todos los usuarios asociados
      const usersResult = await prisma.user.updateMany({
        where: {
          businessId: id,
          role: { not: 'CLIENTE' } // Excluir clientes
        },
        data: { isActive: true }
      });
      usersUpdated = usersResult.count;
      console.log(`📝 Activados ${usersUpdated} usuarios de la empresa ${business.name}`);
    }

    res.json({ 
      success: true, 
      message: newStatus 
        ? `Empresa activada correctamente. ${usersUpdated} usuarios reactivados.`
        : `Empresa pausada correctamente. ${usersUpdated} usuarios desactivados.`,
      isActive: updatedBusiness.isActive,
      subscriptionStatus: updatedBusiness.subscriptionStatus,
      usersActivated: newStatus ? usersUpdated : 0,
      usersDeactivated: newStatus ? 0 : usersUpdated
    });
  }),

  // 4.1 Modificar tiempo de suscripción (días)
  updateSubscriptionDays: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { days } = req.body;

    if (days === undefined || typeof days !== 'number') {
      throw new AppError('Se requiere el campo "days" como número.', 400);
    }

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) throw new AppError('Empresa no encontrada', 404);

    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : new Date();
    if (days > 0 && currentEnd < new Date()) {
      currentEnd = new Date();
    }

    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        subscriptionEnd: newEnd,
        subscriptionStatus: newEnd > new Date() ? 'ACTIVE' : 'EXPIRED'
      }
    });

    res.json({
      success: true,
      message: `Suscripción actualizada. Nueva fecha: ${newEnd.toLocaleDateString()}`,
      business: updatedBusiness
    });
  }),

  // 5. Eliminar Empresa
  deleteBusiness: catchAsync(async (req, res) => {
    const { id } = req.params;
    const business = await prisma.business.findUnique({ where: { id: String(id) } });

    if (!business) throw new AppError('Empresa no encontrada', 404);
    if (business.ruc === '9999999999999') throw new AppError('No se puede eliminar la Empresa SaaS Global.', 403);

    // Eliminar datos relacionados (Cascade manual si no está en DB)
    await prisma.sequence.deleteMany({ where: { businessId: String(id) } });
    await prisma.client.deleteMany({ where: { businessId: String(id) } });
    await prisma.product.deleteMany({ where: { businessId: String(id) } });
    await prisma.user.deleteMany({ where: { businessId: String(id) } });
    await prisma.business.delete({ where: { id: String(id) } });

    res.json({ success: true, message: 'Empresa y sus datos eliminados correctamente' });
  }),

  // 6. Agregar tiempo a suscripción (meses)
  addSubscriptionTime: catchAsync(async (req, res) => {
    const { businessId, months } = req.body;

    if (!businessId || months === undefined) {
      throw new AppError('Se requiere businessId y months', 400);
    }

    const business = await prisma.business.findUnique({ where: { id: String(businessId) } });
    if (!business) throw new AppError('Empresa no encontrada', 404);

    const now = new Date();
    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : now;
    const monthsInt = parseInt(months);

    // Si ya venció y agregamos tiempo, reiniciamos desde hoy
    if (monthsInt > 0 && currentEnd < now) {
      currentEnd = now;
    }

    const newEndDate = new Date(currentEnd);
    newEndDate.setMonth(newEndDate.getMonth() + monthsInt);

    const updatedBusiness = await prisma.business.update({
      where: { id: String(businessId) },
      data: {
        subscriptionEnd: newEndDate,
        isActive: newEndDate > now
      }
    });

    res.json({
      success: true,
      message: 'Suscripción actualizada',
      subscriptionEnd: updatedBusiness.subscriptionEnd,
      isActive: updatedBusiness.isActive
    });
  }),

  // 7. Listar todos los usuarios (Admin View)
  getAllUsers: catchAsync(async (req, res) => {
    const users = await prisma.user.findMany({
      include: {
        business: {
          select: {
            id: true, name: true, ruc: true, phone: true, address: true,
            subscriptionEnd: true, subscriptionStatus: true, plan: true
          }
        }
      },
      orderBy: { email: 'asc' }
    });

    // Sanitizar passwords
    const safeUsers = users.map(u => {
      const { password, ...userWithoutPass } = u;
      return userWithoutPass;
    });

    res.json(safeUsers);
  }),

  // 8. Crear Usuario Administrador
  createUser: catchAsync(async (req, res) => {
    const { email, password, businessId, role } = req.body;

    if (!email || !password) {
      throw new AppError('El correo y la contraseña son obligatorios.', 400);
    }

    if (password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new AppError('El usuario ya existe con este correo.', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalBusinessId = businessId;
    if (role === 'SUPERADMIN') {
      finalBusinessId = req.user.businessId;
    } else if (!businessId) {
      throw new AppError('Se requiere asignar una empresa para usuarios ADMIN.', 400);
    }

    const businessIdValue = finalBusinessId ? String(finalBusinessId) : null;

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'ADMIN',
        businessId: businessIdValue
      }
    });

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, businessId: newUser.businessId } });
  }),

  // 9. Obtener usuarios de una empresa específica
  getBusinessUsers: catchAsync(async (req, res) => {
    const { businessId } = req.params;

    // Verificar que la empresa existe
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError('Empresa no encontrada', 404);

    const users = await prisma.user.findMany({
      where: { businessId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        businessId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  }),

  // 9. Eliminar Usuario
  deleteUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = String(id);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (user.email === 'superadmin@admin.com') {
      throw new AppError('No se puede eliminar al Superadmin principal.', 403);
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'Usuario eliminada correctamente' });
  }),

  // 9.1 Actualizar Usuario
  updateUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { email, name, role, businessId, isActive } = req.body;
    const userId = String(id);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // No permitir editar al superadmin principal
    if (user.email === 'superadmin@admin.com') {
      throw new AppError('No se puede editar al Superadmin principal.', 403);
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role) updateData.role = role;
    if (businessId !== undefined) updateData.businessId = businessId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
        isActive: true
      }
    });

    res.json({ success: true, message: 'Usuario actualizado correctamente', user: updatedUser });
  }),

  // 10. Reset Password
  resetUserPassword: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    if (!temporaryPassword) throw new AppError('Se requiere una contraseña temporal.', 400);
    if (temporaryPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

    res.json({ success: true, message: 'Contraseña restablecida.' });
  }),

  // 10b. Toggle User Status (Activar/Desactivar usuario)
  toggleUserStatus: catchAsync(async (req, res) => {
    const { id } = req.params;

    // Buscar el usuario
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Invertir el estado
    const newStatus = !user.isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus }
    });

    res.json({ 
      success: true, 
      message: newStatus ? 'Usuario activado' : 'Usuario desactivado',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive
      }
    });
  }),

  // 11. Obtener usuarios con estado de empresa (Global View)
  getUsersWithBusiness: catchAsync(async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        businessId: true,
        business: {
          select: {
            id: true, name: true, ruc: true, email: true, phone: true, address: true,
            plan: true, isActive: true, subscriptionEnd: true
          }
        }
      }
    });
    res.json(users);
  }),

  // 12. Estadísticas de suscripciones para el Dashboard del Superadmin
  getSubscriptionStats: catchAsync(async (req, res) => {
    const now = new Date();

    // Total de empresas
    const totalBusinesses = await prisma.business.count();
    
    // Empresas activas
    const activeBusinesses = await prisma.business.count({
      where: { isActive: true }
    });

    // Empresas con suscripción expirada
    const expiredBusinesses = await prisma.business.count({
      where: {
        subscriptionEnd: { lt: now }
      }
    });

    // Empresas por vencer (cálculo dinámico según plan: ≤50% de durationDays)
    const plansForThreshold = await prisma.subscriptionPlan.findMany({
      select: { code: true, durationDays: true }
    });
    const planThresholdMap = {};
    plansForThreshold.forEach(p => {
      const duration = p.durationDays || 30;
      planThresholdMap[p.code] = Math.max(Math.ceil(duration * 0.50), 7);
    });

    const allActiveWithSubscription = await prisma.business.findMany({
      where: {
        subscriptionEnd: { gte: now },
        isActive: true,
        plan: { not: 'UNLIMITED' }
      },
      select: { plan: true, subscriptionEnd: true }
    });

    const expiringBusinesses = allActiveWithSubscription.filter(b => {
      const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const threshold = planThresholdMap[b.plan] || 15;
      return daysLeft <= threshold;
    }).length;

    // Distribución por plan
    const planDistribution = await prisma.business.groupBy({
      by: ['plan'],
      _count: { id: true }
    });

    // Total de usuarios en el sistema
    const totalUsers = await prisma.user.count();
    
    // Usuarios por rol
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    // Empresas recientes (últimas 5)
    const recentBusinesses = await prisma.business.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, ruc: true, plan: true,
        isActive: true, subscriptionEnd: true, createdAt: true,
        _count: { select: { users: true } }
      }
    });

    // Ingresos estimados por plan (simulado basado en planes)
    const planPrices = { FREE: 0, BASIC: 29.99, GASTRONOMICO: 79.99, PRO: 149.99, ENTERPRISE: 249.99, MONTHLY: 29.99, SEMIANNUAL: 149.99, YEARLY: 249.99, UNLIMITED: 0, PENDING: 0 };
    const monthlyRevenue = planDistribution.reduce((acc, p) => {
      return acc + (planPrices[p.plan] || 0) * Number(p._count.id);
    }, 0);

    res.json({
      totalBusinesses: Number(totalBusinesses),
      activeBusinesses: Number(activeBusinesses),
      expiredBusinesses: Number(expiredBusinesses),
      expiringBusinesses: Number(expiringBusinesses),
      planDistribution: planDistribution.map(p => ({ plan: p.plan, count: Number(p._count.id) })),
      totalUsers: Number(totalUsers),
      usersByRole: usersByRole.map(u => ({ role: u.role, count: Number(u._count.id) })),
      recentBusinesses,
      monthlyRevenue
    });
  }),

  // --- GESTIÓN DE SUSCRIPCIONES ---
  
  // Obtener todas las suscripciones
  getSubscriptions: catchAsync(async (req, res) => {
    const { status, plan, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          business: {
            select: { id: true, name: true, ruc: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.subscription.count({ where })
    ]);
    
    res.json({
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  }),

  // Obtener una suscripción específica
  getSubscription: catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true, ruc: true, email: true, phone: true, plan: true }
        }
      }
    });
    
    if (!subscription) {
      throw new AppError('Suscripción no encontrada', 404);
    }
    
    res.json(subscription);
  }),

  // Crear una nueva suscripción
  createSubscription: catchAsync(async (req, res) => {
    const { businessId, plan, startDate, endDate, paymentMethod, paymentId, amount, currency, notes } = req.body;
    
    // Verificar que la empresa existe
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new AppError('Empresa no encontrada', 404);
    }
    
    const subscription = await prisma.subscription.create({
      data: {
        businessId,
        plan: plan || 'FREE',
        status: 'ACTIVE',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        paymentMethod,
        paymentId,
        amount: amount || 0,
        currency: currency || 'USD',
        notes
      },
      include: {
        business: {
          select: { id: true, name: true, ruc: true, email: true }
        }
      }
    });
    
    // Actualizar el plan de la empresa
    await prisma.business.update({
      where: { id: businessId },
      data: {
        plan,
        subscriptionStatus: 'ACTIVE',
        subscriptionEnd: new Date(endDate)
      }
    });
    
    res.json(subscription);
  }),

  // Actualizar una suscripción
  updateSubscription: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { plan, status, endDate, paymentMethod, paymentId, amount, currency, notes, invoiceNumber } = req.body;
    
    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(plan && { plan }),
        ...(status && { status }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(paymentMethod && { paymentMethod }),
        ...(paymentId && { paymentId }),
        ...(amount !== undefined && { amount }),
        ...(currency && { currency }),
        ...(notes && { notes }),
        ...(invoiceNumber && { invoiceNumber })
      },
      include: {
        business: {
          select: { id: true, name: true, ruc: true, email: true }
        }
      }
    });
    
    // Si se cambió el plan o estado, actualizar la empresa
    if (plan || status) {
      await prisma.business.update({
        where: { id: subscription.businessId },
        data: {
          ...(plan && { plan }),
          subscriptionStatus: status || subscription.status
        }
      });
    }
    
    res.json(subscription);
  }),

  // Eliminar una suscripción (y descontar tiempo de la empresa)
  deleteSubscription: catchAsync(async (req, res) => {
    const { id } = req.params;
    
    // Primero obtener la suscripción para saber qué empresa y qué tiempo descontar
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { business: true }
    });
    
    if (!subscription) {
      throw new AppError('Suscripción no encontrada', 404);
    }
    
    // Calcular los días de la suscripción que se va a eliminar
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    const daysToSubtract = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Obtener la empresa
    const business = await prisma.business.findUnique({
      where: { id: subscription.businessId }
    });
    
    if (business && business.subscriptionEnd) {
      const currentEndDate = new Date(business.subscriptionEnd);
      const newEndDate = new Date(currentEndDate.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      // Determinar el nuevo estado
      const isExpired = newEndDate < now;
      
      // Buscar suscripciones restantes de esta empresa
      const remainingSubscriptions = await prisma.subscription.findMany({
        where: {
          businessId: subscription.businessId,
          id: { not: id }, // Excluir la actual
          status: 'ACTIVE'
        }
      });
      
      // Determinar el plan anterior (si hay otras suscripciones)
      let newPlan = business.plan;
      if (remainingSubscriptions.length > 0) {
        // Usar el plan de la suscripción más reciente
        const latestSubscription = remainingSubscriptions.sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        newPlan = latestSubscription.plan;
      } else {
        // Si no hay más suscripciones, volver a FREE
        newPlan = 'FREE';
      }
      
      // Actualizar la empresa: descontar días y ajustar estado
      await prisma.business.update({
        where: { id: subscription.businessId },
        data: {
          subscriptionEnd: newEndDate,
          isActive: !isExpired && remainingSubscriptions.length > 0,
          subscriptionStatus: !isExpired && remainingSubscriptions.length > 0 ? 'ACTIVE' : 'EXPIRED',
          plan: newPlan
        }
      });
    }
    
    // Eliminar la suscripción
    await prisma.subscription.delete({
      where: { id }
    });
    
    // Buscar y eliminar el documento (factura) asociado a esta suscripción
    // Buscar por businessId, tipo INVOICE, y aproximadamente el mismo monto y fecha
    const subscriptionDate = new Date(subscription.startDate);
    const documentsToDelete = await prisma.document.findMany({
      where: {
        businessId: subscription.businessId,
        type: 'INVOICE',
        invoiceType: 'SaaS',
        total: subscription.amount,
        status: { not: 'CANCELLED' }
      },
      orderBy: { issueDate: 'desc' },
      take: 1
    });
    
    if (documentsToDelete.length > 0) {
      // Verificar que la fecha sea cercana (mismo día)
      const doc = documentsToDelete[0];
      const docDate = new Date(doc.issueDate);
      const daysDiff = Math.abs(docDate.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 1) {
        await prisma.document.delete({
          where: { id: doc.id }
        });
        console.log(`✅ Documento ${doc.id} eliminado junto con la suscripción`);
      }
    }
    
    res.json({ success: true, message: 'Suscripción eliminada y tiempo descontado correctamente' });
  }),

  // Obtener estadísticas de ingresos por suscripciones
  getSubscriptionRevenueStats: catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Ingresos totales
    const totalRevenue = await prisma.subscription.aggregate({
      where: { ...where, amount: { not: null } },
      _sum: { amount: true }
    });
    
    // Ingresos por plan
    const revenueByPlan = await prisma.subscription.groupBy({
      by: ['plan'],
      where,
      _sum: { amount: true },
      _count: { id: true }
    });
    
    // Ingresos por método de pago
    const revenueByPaymentMethod = await prisma.subscription.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amount: true },
      _count: { id: true }
    });
    
    // Suscripciones por estado
    const subscriptionsByStatus = await prisma.subscription.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });
    
    // Suscripciones activas por mes (últimos 12 meses)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const subscriptionsByMonthRaw = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM "Subscription"
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;
    
    // Convertir BigInt a Number
    const subscriptionsByMonth = subscriptionsByMonthRaw.map(s => ({
      month: s.month,
      count: Number(s.count),
      revenue: Number(s.revenue) || 0
    }));
    
    res.json({
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      revenueByPlan: revenueByPlan.map(p => ({ plan: p.plan, revenue: Number(p._sum.amount) || 0, count: Number(p._count.id) })),
      revenueByPaymentMethod: revenueByPaymentMethod.map(p => ({ method: p.paymentMethod, revenue: Number(p._sum.amount) || 0, count: Number(p._count.id) })),
      subscriptionsByStatus: subscriptionsByStatus.map(s => ({ status: s.status, count: Number(s._count.id) })),
      subscriptionsByMonth
    });
  }),

  // 8. Emitir factura SaaS y renovar suscripción
  emitSaaSInvoice: catchAsync(async (req, res) => {
    const { businessId, plan, durationDays, amount, paymentMethod, mode } = req.body;

    if (!businessId || !plan || !durationDays) {
      throw new AppError('Se requiere businessId, plan y durationDays', 400);
    }

    const business = await prisma.business.findUnique({ where: { id: String(businessId) } });
    if (!business) throw new AppError('Empresa no encontrada', 404);

    // Validar modo de emisión
    const emissionMode = mode || 'LOCAL'; // LOCAL o SRI por defecto es LOCAL
    let sriAuthorized = false;
    let sriMessage = '';

    // Si el modo es SRI, validar configuración
    if (emissionMode === 'SRI') {
      if (!business.sriEnabled) {
        throw new AppError('La empresa no tiene habilitado el modo SRI. Por favor configure la firma electrónica en la configuración de la empresa.', 400);
      }
      if (!business.electronicSignature || !business.sriPassword) {
        throw new AppError('La empresa no tiene configurada la firma electrónica o la clave SRI. Por favor configure estos datos en la configuración de la empresa.', 400);
      }
      // Aquí iría la lógica de envío al SRI
      // Por ahora, simulamos que está autorizada
      sriAuthorized = true;
      sriMessage = 'Factura autorizada por el SRI';
    } else {
      sriMessage = 'Factura emitida en modo local (sin SRI)';
    }

    const now = new Date();
    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : now;
    
    // Si la suscripción ya venció, comenzar desde hoy
    if (currentEnd < now) {
      currentEnd = now;
    }

    // Calcular nueva fecha de fin
    const newEndDate = new Date(currentEnd);
    newEndDate.setDate(newEndDate.getDate() + parseInt(durationDays));

    // Generar número de factura secuencial
    const lastSubscription = await prisma.subscription.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const nextNumber = lastSubscription ? parseInt(lastSubscription.invoiceNumber?.split('-')[2] || '0') + 1 : 1;
    const invoiceNumber = `001-001-${String(nextNumber).padStart(7, '0')}`;
    const accessKey = generateDemoAccessKey();

    // Determinar estado según el modo
    const invoiceStatus = sriAuthorized ? 'AUTORIZADA' : (emissionMode === 'LOCAL' ? 'LOCAL' : 'PENDIENTE');

    // Actualizar la empresa con la nueva suscripción
    const updatedBusiness = await prisma.business.update({
      where: { id: String(businessId) },
      data: {
        plan: plan,
        subscriptionStart: now,
        subscriptionEnd: newEndDate,
        subscriptionStatus: 'ACTIVE',
        isActive: true
      }
    });

    // Crear registro de suscripción
    const subscription = await prisma.subscription.create({
      data: {
        businessId: String(businessId),
        plan: plan,
        status: 'ACTIVE',
        startDate: now,
        endDate: newEndDate,
        paymentMethod: paymentMethod || (emissionMode === 'SRI' ? 'SRI' : 'LOCAL'),
        amount: parseFloat(amount) || 0,
        currency: 'USD',
        invoiceNumber: invoiceNumber,
        notes: `Factura emitida - Plan: ${plan}, Duración: ${durationDays} días - Modo: ${emissionMode}`
      }
    });

    // Crear documento para que aparezca en Devoluciones
    const documentStatus = emissionMode === 'SRI' ? 'AUTHORIZED' : 'LOCAL';
    await prisma.document.create({
      data: {
        businessId: String(businessId),
        type: 'INVOICE',
        number: invoiceNumber,
        accessKey: accessKey,
        issueDate: now,
        status: documentStatus,
        total: parseFloat(amount) || 0,
        entityName: business.name,
        entityRuc: business.ruc,
        entityEmail: business.email,
        paymentStatus: 'PAGADO',
        source: 'WEB',
        invoiceType: 'SaaS'  // Indica que es una factura de suscripción SaaS
      }
    });

    res.json({
      success: true,
      message: sriMessage,
      emissionMode: emissionMode,
      invoice: {
        numero: invoiceNumber,
        claveAcceso: accessKey,
        fecha: now.toLocaleDateString('es-EC'),
        total: parseFloat(amount) || 0,
        estado: invoiceStatus
      },
      subscription: {
        id: subscription.id,
        plan: plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status
      },
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        plan: updatedBusiness.plan,
        subscriptionEnd: updatedBusiness.subscriptionEnd,
        subscriptionStatus: updatedBusiness.subscriptionStatus
      }
    });
  })
};

// Función auxiliar para generar clave de acceso demo
function generateDemoAccessKey() {
  const now = new Date();
  const fecha = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 99999999999);
  return `${fecha}01${now.getTime().toString().slice(-11)}${String(random).padStart(13, '0')}1`;
}

// 9. Procesar nota de crédito SaaS
const processSaaSCreditNote = catchAsync(async (req, res) => {
  const { businessId, reason, daysToRefund, customReason, additionalInfo, documentId, invoiceNumber } = req.body;

  if (!businessId || !reason) {
    throw new AppError('Se requiere businessId y reason', 400);
  }

  const business = await prisma.business.findUnique({ where: { id: String(businessId) } });
  if (!business) throw new AppError('Empresa no encontrada', 404);

  const now = new Date();
  let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : now;
  
  // Calcular días restantes
  const daysRemaining = Math.ceil((currentEnd - now) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 0) {
    throw new AppError('La suscripción no tiene tiempo restante para devolver', 400);
  }

  const daysToRefundInt = parseInt(daysToRefund) || daysRemaining;
  const actualDaysToRefund = Math.min(daysToRefundInt, daysRemaining);

  // Calcular monto a reembolsar (prorrateo)
  // Precios con IVA 15%
  const planPrices = { 'FREE': 0, 'BASIC': 34.49, 'GASTRONOMICO': 91.99, 'PRO': 172.49, 'ENTERPRISE': 287.49, 'UNLIMITED': 0 };
  const monthlyPrice = planPrices[business.plan] || 0;
  const dailyRate = monthlyPrice / 30;
  const amountToRefund = dailyRate * actualDaysToRefund;

  // Nueva fecha de suscripción
  const newEndDate = new Date(currentEnd);
  newEndDate.setDate(newEndDate.getDate() - actualDaysToRefund);

  // Actualizar la empresa
  const updatedBusiness = await prisma.business.update({
    where: { id: String(businessId) },
    data: {
      subscriptionEnd: newEndDate,
      subscriptionStatus: newEndDate > now ? 'ACTIVE' : 'EXPIRED',
      isActive: newEndDate > now
    }
  });

  // Generar número de nota de crédito
  const lastSubscription = await prisma.subscription.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  const nextNumber = lastSubscription ? parseInt(lastSubscription.invoiceNumber?.split('-')[2] || '0') + 1 : 1;
  const creditNoteNumber = `001-002-${String(nextNumber).padStart(7, '0')}`;
  const accessKey = generateDemoAccessKey();

  // Crear registro de nota de crédito
  const creditNote = await prisma.subscription.create({
    data: {
      businessId: String(businessId),
      plan: `NC-${business.plan}`,
      status: 'CANCELLED',
      startDate: now,
      endDate: newEndDate,
      paymentMethod: 'REFUND',
      amount: -amountToRefund,
      currency: 'USD',
      invoiceNumber: creditNoteNumber,
      notes: `Nota de crédito: ${reason}. Días devueltos: ${actualDaysToRefund}. ${customReason || additionalInfo || ''}`
    }
  });

  // Actualizar el documento de la factura a cancelado si se proporcionó
  if (documentId) {
    await prisma.document.update({
      where: { id: String(documentId) },
      data: {
        status: 'CANCELLED',
        additionalInfo: `Anulada por nota de crédito ${creditNoteNumber}. Razón: ${reason}`
      }
    });
  }

  // Crear documento de nota de crédito para que aparezca en Devoluciones
  await prisma.document.create({
    data: {
      businessId: String(businessId),
      type: 'CREDIT_NOTE',
      number: creditNoteNumber,
      accessKey: accessKey,
      issueDate: now,
      status: 'AUTHORIZED',
      total: amountToRefund,
      entityName: business.name,
      entityRuc: business.ruc,
      entityEmail: business.email,
      paymentStatus: 'PENDIENTE',
      source: 'WEB',
      creditNoteReason: reason,
      relatedDocumentNumber: invoiceNumber || null,
      relatedDocumentDate: now
    }
  });

  // Desactivar usuarios si la suscripción terminó
  if (newEndDate <= now) {
    await prisma.user.updateMany({
      where: { businessId: String(businessId), role: { not: 'CLIENTE' } },
      data: { isActive: false }
    });
  }

  res.json({
    success: true,
    message: 'Nota de crédito procesada correctamente',
    creditNote: {
      id: creditNote.id,
      numero: creditNoteNumber,
      fecha: now.toLocaleDateString('es-EC'),
      businessName: business.name,
      plan: business.plan,
      reason: reason,
      daysRemaining: daysRemaining,
      daysToRefund: actualDaysToRefund,
      amountRefunded: amountToRefund,
      status: 'AUTORIZADA'
    },
    business: {
      id: updatedBusiness.id,
      name: updatedBusiness.name,
      plan: updatedBusiness.plan,
      subscriptionEnd: updatedBusiness.subscriptionEnd,
      subscriptionStatus: updatedBusiness.subscriptionStatus,
      isActive: updatedBusiness.isActive
    }
  });
});

// 10. Obtener documentos del SaaS (para devoluciones)
const getDocuments = catchAsync(async (req, res) => {
  const { type, status, businessId } = req.query;

  const where = {};
  
  if (type) {
    where.type = type;
  }
  
  if (status) {
    where.status = status;
  }

  // Si es para una empresa específica
  if (businessId) {
    where.businessId = businessId;
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      business: {
        select: {
          id: true,
          name: true,
          ruc: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  res.json({ documents });
});

module.exports = {
  ...adminController,
  processSaaSCreditNote,
  getDocuments
};
