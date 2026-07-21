const bcrypt = require('bcryptjs');
const { AppError } = require('../../middleware/error.handler');

class AdminService {
  constructor(repository) {
    this.repo = repository;
  }

  // ─── Business ─────────────────────────────────────────────────────────────

  async createBusiness(data) {
    const { name, ruc, email, address, phone, plan, features, subscriptionEnd, password, businessType } = data;

    // Convertir strings vacíos a null para evitar problemas con Prisma
    const addressValue = address === '' ? null : address;
    const phoneValue = phone === '' ? null : phone;

    const existing = await this.repo.findBusinessByRuc(ruc);
    if (existing) throw new AppError('La empresa ya existe con este RUC', 400);

    const existingUser = await this.repo.findUserByEmail(email);
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
    const result = await this.repo.executeTransaction(async (tx) => {
      // 1. Crear Empresa
      const newBusiness = await this.repo.createBusiness({
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
      }, tx);

      // 2. Crear Secuenciales
      await this.repo.createSequence({
        type: '01', // Factura
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: newBusiness.id
      }, tx);

      // 3. Crear Usuario Admin
      const hashedPassword = await bcrypt.hash(password || ruc, 10);
      await this.repo.createUser({
        email,
        password: hashedPassword,
        role: 'ADMIN',
        businessId: String(newBusiness.id)
      }, tx);

      return newBusiness;
    });

    return result;
  }

  // 2. Obtener empresas con suscripciones por vencer
  async getExpiringBusinesses() {
    const today = new Date();

    // Cargar thresholds dinámicos por plan
    const allPlans = await this.repo.findAllPlans({ code: true, durationDays: true });
    const thresholdMap = {};
    allPlans.forEach(p => {
      const duration = p.durationDays || 30;
      thresholdMap[p.code] = Math.max(Math.ceil(duration * 0.50), 7);
    });

    // Traer empresas activas con suscripción vigente (excluir UNLIMITED)
    const allActiveWithSubscription = await this.repo.findAllBusinesses({
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

    return expiringBusinesses;
  }

  // 3. Listar todas las empresas
  async getAllBusinesses() {
    const businesses = await this.repo.findAllBusinesses({
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
    return businesses;
  }

  // 4. Actualizar Empresa
  async updateBusiness(id, body) {
    console.log('📝 UPDATE BUSINESS - Request body:', JSON.stringify(body));
    const { features, isActive, plan, subscriptionEnd, subscriptionStatus, phone, address, ...data } = body;

    // Convertir strings vacíos a null para evitar problemas con Prisma
    const phoneValue = phone === '' ? null : phone;
    const addressValue = address === '' ? null : address;
    console.log('📝 UPDATE BUSINESS - phone:', phone, '->', phoneValue);
    console.log('📝 UPDATE BUSINESS - address:', address, '->', addressValue);

    // Obtener el estado actual de la empresa para comparar
    const currentBusiness = await this.repo.findBusinessById(id);
    const wasActive = currentBusiness?.isActive;

    const updatedBusiness = await this.repo.updateBusiness(id, {
      ...data,
      phone: phoneValue,
      address: addressValue,
      features,
      isActive,
      plan,
      subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : undefined,
      subscriptionStatus
    });
    console.log('📝 UPDATE BUSINESS - Result:', JSON.stringify(updatedBusiness));

    // Si se está desactivando la empresa (isActive cambia a false), desactivamos los usuarios
    let usersUpdated = 0;
    if (isActive === false && wasActive !== false) {
      const usersResult = await this.repo.updateUsersByBusiness(id, { isActive: false }, 'CLIENTE');
      usersUpdated = usersResult.count;
      console.log(`📝 Desactivados ${usersUpdated} usuarios de la empresa ${currentBusiness?.name}`);
    }

    return { 
      ...updatedBusiness,
      usersDeactivated: usersUpdated
    };
  }

  // 4.1 Pausar/Activar Empresa
  async toggleBusinessStatus(id, body) {
    const { isActive, reason } = body;

    const business = await this.repo.findBusinessById(id);
    if (!business) throw new AppError('Empresa no encontrada', 404);

    const newStatus = isActive !== undefined ? isActive : !business.isActive;
    
    const updatedBusiness = await this.repo.updateBusiness(id, { 
      isActive: newStatus,
      // También actualizamos el subscriptionStatus según corresponda
      subscriptionStatus: newStatus ? 'ACTIVE' : 'SUSPENDED'
    });

    // Si se desactiva la empresa, desactivamos todos los usuarios (ADMIN, CONTADOR, VENDEDOR)
    // Los clientes (CLIENTE) se mantienen activos
    let usersUpdated = 0;
    if (newStatus === false) {
      const usersResult = await this.repo.updateUsersByBusiness(id, { isActive: false }, 'CLIENTE');
      usersUpdated = usersResult.count;
      console.log(`📝 Desactivados ${usersUpdated} usuarios de la empresa ${business.name}`);
    } else {
      // Si se reactiva la empresa, reactivamos todos los usuarios asociados
      const usersResult = await this.repo.updateUsersByBusiness(id, { isActive: true }, 'CLIENTE');
      usersUpdated = usersResult.count;
      console.log(`📝 Activados ${usersUpdated} usuarios de la empresa ${business.name}`);
    }

    return { 
      success: true, 
      message: newStatus 
        ? `Empresa activada correctamente. ${usersUpdated} usuarios reactivados.`
        : `Empresa pausada correctamente. ${usersUpdated} usuarios desactivados.`,
      isActive: updatedBusiness.isActive,
      subscriptionStatus: updatedBusiness.subscriptionStatus,
      usersActivated: newStatus ? usersUpdated : 0,
      usersDeactivated: newStatus ? 0 : usersUpdated
    };
  }

  // 4.1 Modificar tiempo de suscripción (días)
  async updateSubscriptionDays(id, days) {
    if (days === undefined || typeof days !== 'number') {
      throw new AppError('Se requiere el campo "days" como número.', 400);
    }

    const business = await this.repo.findBusinessById(id);
    if (!business) throw new AppError('Empresa no encontrada', 404);

    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : new Date();
    if (days > 0 && currentEnd < new Date()) {
      currentEnd = new Date();
    }

    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    // Se actualizan los tres campos juntos: el login calcula el acceso con
    // isActive && !vencida, así que extender la suscripción sin tocar isActive
    // dejaba a la empresa sin poder entrar aunque ya tuviera fecha válida.
    const isValid = newEnd > new Date();
    const updatedBusiness = await this.repo.updateBusiness(id, {
      subscriptionEnd: newEnd,
      subscriptionStatus: isValid ? 'ACTIVE' : 'EXPIRED',
      isActive: isValid
    });

    return {
      success: true,
      message: `Suscripción actualizada. Nueva fecha: ${newEnd.toLocaleDateString()}`,
      business: updatedBusiness
    };
  }

  // 5. Eliminar Empresa
  async deleteBusiness(id) {
    const business = await this.repo.findBusinessById(String(id));

    if (!business) throw new AppError('Empresa no encontrada', 404);
    if (business.ruc === '9999999999999') throw new AppError('No se puede eliminar la Empresa SaaS Global.', 403);

    // Los comprobantes electrónicos son registros fiscales con retención legal
    // (7 años en Ecuador) y el borrado es en cascada e irreversible. Si la empresa
    // ya emitió documentos, no se elimina: se debe desactivar (toggleBusinessStatus),
    // que suspende la empresa y sus usuarios sin destruir nada y es reversible.
    const documentCount = await this.repo.countDocumentsByBusiness(String(id));
    if (documentCount > 0) {
      throw new AppError(
        `No se puede eliminar "${business.name}": tiene ${documentCount} documento(s) fiscal(es) que deben conservarse por ley. Desactívala en su lugar (queda sin acceso, pero se preserva el histórico y es reversible).`,
        409
      );
    }

    // Sin documentos emitidos (registro de prueba o abandonado): se puede eliminar.
    // Todas las relaciones a Business tienen onDelete: Cascade en el esquema, así
    // que este único DELETE borra los datos asociados de forma atómica.
    await this.repo.deleteBusiness(String(id));

    return { success: true, message: 'Empresa y sus datos eliminados correctamente' };
  }

  // 6. Agregar tiempo a suscripción (meses)
  async addSubscriptionTime(businessId, months) {
    if (!businessId || months === undefined) {
      throw new AppError('Se requiere businessId y months', 400);
    }

    const business = await this.repo.findBusinessById(String(businessId));
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

    // Mismos campos que updateSubscriptionDays, para que ambas vías dejen a la
    // empresa en un estado coherente (antes esta no tocaba subscriptionStatus).
    const isValid = newEndDate > now;
    const updatedBusiness = await this.repo.updateBusiness(String(businessId), {
      subscriptionEnd: newEndDate,
      subscriptionStatus: isValid ? 'ACTIVE' : 'EXPIRED',
      isActive: isValid
    });

    return {
      success: true,
      message: 'Suscripción actualizada',
      subscriptionEnd: updatedBusiness.subscriptionEnd,
      isActive: updatedBusiness.isActive
    };
  }

  // ─── User ─────────────────────────────────────────────────────────────────

  // 7. Listar todos los usuarios (Admin View)
  async getAllUsers() {
    const users = await this.repo.findAllUsers({
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

    return safeUsers;
  }

  // 8. Crear Usuario Administrador
  async createUser(data, requesterBusinessId) {
    const { email, password, businessId, role } = data;

    if (!email || !password) {
      throw new AppError('El correo y la contraseña son obligatorios.', 400);
    }

    if (password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);
    }

    const existingUser = await this.repo.findUserByEmail(email);
    if (existingUser) throw new AppError('El usuario ya existe con este correo.', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalBusinessId = businessId;
    if (role === 'SUPERADMIN') {
      finalBusinessId = requesterBusinessId;
    } else if (!businessId) {
      throw new AppError('Se requiere asignar una empresa para usuarios ADMIN.', 400);
    }

    const businessIdValue = finalBusinessId ? String(finalBusinessId) : null;

    const newUser = await this.repo.createUser({
      email,
      password: hashedPassword,
      role: role || 'ADMIN',
      businessId: businessIdValue
    });

    return { success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, businessId: newUser.businessId } };
  }

  // 9. Obtener usuarios de una empresa específica
  async getBusinessUsers(businessId) {
    // Verificar que la empresa existe
    const business = await this.repo.findBusinessById(businessId);
    if (!business) throw new AppError('Empresa no encontrada', 404);

    const users = await this.repo.findUsersByBusiness(businessId, {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      businessId: true
    });

    return users;
  }

  // 9. Eliminar Usuario
  async deleteUser(id) {
    const userId = String(id);

    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (user.email === 'superadmin@admin.com') {
      throw new AppError('No se puede eliminar al Superadmin principal.', 403);
    }

    await this.repo.deleteUser(userId);
    return { success: true, message: 'Usuario eliminada correctamente' };
  }

  // 9.1 Actualizar Usuario
  async updateUser(id, body) {
    const { email, name, role, businessId, isActive } = body;
    const userId = String(id);

    const user = await this.repo.findUserById(userId);
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

    const updatedUser = await this.repo.updateUser(userId, updateData, {
      id: true,
      email: true,
      name: true,
      role: true,
      businessId: true,
      isActive: true
    });

    return { success: true, message: 'Usuario actualizado correctamente', user: updatedUser };
  }

  // 10. Reset Password
  async resetUserPassword(id, temporaryPassword) {
    if (!temporaryPassword) throw new AppError('Se requiere una contraseña temporal.', 400);
    if (temporaryPassword.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres.', 400);

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    await this.repo.updateUser(id, { password: hashedPassword });

    return { success: true, message: 'Contraseña restablecida.' };
  }

  // 10b. Toggle User Status (Activar/Desactivar usuario)
  async toggleUserStatus(id) {
    // Buscar el usuario
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Invertir el estado
    const newStatus = !user.isActive;

    const updatedUser = await this.repo.updateUser(id, { isActive: newStatus });

    return { 
      success: true, 
      message: newStatus ? 'Usuario activado' : 'Usuario desactivado',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isActive: updatedUser.isActive
      }
    };
  }

  // 11. Obtener usuarios con estado de empresa (Global View)
  async getUsersWithBusiness() {
    const users = await this.repo.findAllUsers({
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
    return users;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  // 12. Estadísticas de suscripciones para el Dashboard del Superadmin
  async getSubscriptionStats() {
    const now = new Date();

    // Obtener estadísticas de empresas y planes en paralelo
    const [
      totalBusinesses,
      activeBusinesses,
      expiredBusinesses,
      plansForThreshold
    ] = await Promise.all([
      this.repo.countBusinesses(),
      this.repo.countBusinesses({ isActive: true }),
      this.repo.countBusinesses({ subscriptionEnd: { lt: now } }),
      this.repo.findAllPlans({ code: true, durationDays: true })
    ]);

    const planThresholdMap = {};
    plansForThreshold.forEach(p => {
      const duration = p.durationDays || 30;
      planThresholdMap[p.code] = Math.max(Math.ceil(duration * 0.50), 7);
    });

    const allActiveWithSubscription = await this.repo.findAllBusinesses({
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

    // Obtener el resto de estadísticas en paralelo
    const [
      planDistribution,
      totalUsers,
      usersByRole,
      recentBusinesses
    ] = await Promise.all([
      this.repo.groupBusinessesByPlan({
        by: ['plan'],
        _count: { id: true }
      }),
      this.repo.countUsers(),
      this.repo.groupUsersByRole({
        by: ['role'],
        _count: { id: true }
      }),
      this.repo.findRecentBusinesses({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, ruc: true, plan: true,
          isActive: true, subscriptionEnd: true, createdAt: true,
          _count: { select: { users: true } }
        }
      })
    ]);

    // Ingresos estimados por plan (simulado basado en planes)
    const planPrices = { FREE: 0, BASIC: 30.43, GASTRONOMICO: 78.26, PRO: 130.43, ENTERPRISE: 217.39, MONTHLY: 30.43, SEMIANNUAL: 130.43, YEARLY: 217.39, UNLIMITED: 0, PENDING: 0 };
    const monthlyRevenue = planDistribution.reduce((acc, p) => {
      return acc + (planPrices[p.plan] || 0) * Number(p._count.id);
    }, 0);

    return {
      totalBusinesses: Number(totalBusinesses),
      activeBusinesses: Number(activeBusinesses),
      expiredBusinesses: Number(expiredBusinesses),
      expiringBusinesses: Number(expiringBusinesses),
      planDistribution: planDistribution.map(p => ({ plan: p.plan, count: Number(p._count.id) })),
      totalUsers: Number(totalUsers),
      usersByRole: usersByRole.map(u => ({ role: u.role, count: Number(u._count.id) })),
      recentBusinesses,
      monthlyRevenue
    };
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────
  
  // Obtener todas las suscripciones
  async getSubscriptions(query) {
    const { status, plan, page = 1, limit = 20 } = query;
    
    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [subscriptions, total] = await Promise.all([
      this.repo.findSubscriptions(
        where,
        {
          business: {
            select: { id: true, name: true, ruc: true, email: true }
          }
        },
        { createdAt: 'desc' },
        skip,
        parseInt(limit)
      ),
      this.repo.countSubscriptions(where)
    ]);
    
    return {
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  // Obtener una suscripción específica
  async getSubscription(id) {
    const subscription = await this.repo.findSubscriptionById(id, {
      business: {
        select: { id: true, name: true, ruc: true, email: true, phone: true, plan: true }
      }
    });
    
    if (!subscription) {
      throw new AppError('Suscripción no encontrada', 404);
    }
    
    return subscription;
  }

  // Crear una nueva suscripción
  async createSubscription(body) {
    const { businessId, plan, startDate, endDate, paymentMethod, paymentId, amount, currency, notes } = body;
    
    // Verificar que la empresa existe
    const business = await this.repo.findBusinessById(businessId);
    if (!business) {
      throw new AppError('Empresa no encontrada', 404);
    }
    
    const subscription = await this.repo.createSubscription({
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
    }, {
      business: {
        select: { id: true, name: true, ruc: true, email: true }
      }
    });
    
    // Actualizar el plan de la empresa
    await this.repo.updateBusiness(businessId, {
      plan,
      subscriptionStatus: 'ACTIVE',
      subscriptionEnd: new Date(endDate)
    });
    
    return subscription;
  }

  // Actualizar una suscripción
  async updateSubscription(id, body) {
    const { plan, status, endDate, paymentMethod, paymentId, amount, currency, notes, invoiceNumber } = body;
    
    const subscription = await this.repo.updateSubscription(id, {
      ...(plan && { plan }),
      ...(status && { status }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(paymentMethod && { paymentMethod }),
      ...(paymentId && { paymentId }),
      ...(amount !== undefined && { amount }),
      ...(currency && { currency }),
      ...(notes && { notes }),
      ...(invoiceNumber && { invoiceNumber })
    }, {
      business: {
        select: { id: true, name: true, ruc: true, email: true }
      }
    });
    
    // Si se cambió el plan o estado, actualizar la empresa
    if (plan || status) {
      await this.repo.updateBusiness(subscription.businessId, {
        ...(plan && { plan }),
        subscriptionStatus: status || subscription.status
      });
    }
    
    return subscription;
  }

  // Eliminar una suscripción (y descontar tiempo de la empresa)
  async deleteSubscription(id) {
    // Primero obtener la suscripción para saber qué empresa y qué tiempo descontar
    const subscription = await this.repo.findSubscriptionById(id, { business: true });
    
    if (!subscription) {
      throw new AppError('Suscripción no encontrada', 404);
    }
    
    // Calcular los días de la suscripción que se va a eliminar
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    const daysToSubtract = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Obtener la empresa
    const business = await this.repo.findBusinessById(subscription.businessId);
    
    if (business && business.subscriptionEnd) {
      const currentEndDate = new Date(business.subscriptionEnd);
      const newEndDate = new Date(currentEndDate.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      // Determinar el nuevo estado
      const isExpired = newEndDate < now;
      
      // Buscar suscripciones restantes de esta empresa
      const remainingSubscriptions = await this.repo.findSubscriptionsByBusiness(
        subscription.businessId,
        id,
        'ACTIVE'
      );
      
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
      await this.repo.updateBusiness(subscription.businessId, {
        subscriptionEnd: newEndDate,
        isActive: !isExpired && remainingSubscriptions.length > 0,
        subscriptionStatus: !isExpired && remainingSubscriptions.length > 0 ? 'ACTIVE' : 'EXPIRED',
        plan: newPlan
      });
    }
    
    // Eliminar la suscripción
    await this.repo.deleteSubscription(id);
    
    // Buscar y eliminar el documento (factura) asociado a esta suscripción
    // Buscar por businessId, tipo INVOICE, y aproximadamente el mismo monto y fecha
    const subscriptionDate = new Date(subscription.startDate);
    const documentsToDelete = await this.repo.findDocuments(
      {
        businessId: subscription.businessId,
        type: 'INVOICE',
        invoiceType: 'SaaS',
        total: subscription.amount,
        status: { not: 'CANCELLED' }
      },
      undefined,
      { issueDate: 'desc' },
      1
    );
    
    if (documentsToDelete.length > 0) {
      // Verificar que la fecha sea cercana (mismo día)
      const doc = documentsToDelete[0];
      const docDate = new Date(doc.issueDate);
      const daysDiff = Math.abs(docDate.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 1) {
        await this.repo.deleteDocument(doc.id);
        console.log(`✅ Documento ${doc.id} eliminado junto con la suscripción`);
      }
    }
    
    return { success: true, message: 'Suscripción eliminada y tiempo descontado correctamente' };
  }

  // Obtener estadísticas de ingresos por suscripciones
  async getSubscriptionRevenueStats(query) {
    const { startDate, endDate } = query;
    
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // Suscripciones activas por mes (últimos 12 meses)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Obtener estadísticas de ingresos en paralelo
    const [
      totalRevenue,
      revenueByPlan,
      revenueByPaymentMethod,
      subscriptionsByStatus,
      subscriptionsByMonthRaw
    ] = await Promise.all([
      this.repo.aggregateSubscriptionAmount({ ...where, amount: { not: null } }),
      this.repo.groupSubscriptionsBy('plan', where),
      this.repo.groupSubscriptionsBy('paymentMethod', where),
      this.repo.groupSubscriptionsBy('status', where),
      this.repo.rawSubscriptionsByMonth(twelveMonthsAgo)
    ]);
    
    // Convertir BigInt a Number
    const subscriptionsByMonth = subscriptionsByMonthRaw.map(s => ({
      month: s.month,
      count: Number(s.count),
      revenue: Number(s.revenue) || 0
    }));
    
    return {
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      revenueByPlan: revenueByPlan.map(p => ({ plan: p.plan, revenue: Number(p._sum.amount) || 0, count: Number(p._count.id) })),
      revenueByPaymentMethod: revenueByPaymentMethod.map(p => ({ method: p.paymentMethod, revenue: Number(p._sum.amount) || 0, count: Number(p._count.id) })),
      subscriptionsByStatus: subscriptionsByStatus.map(s => ({ status: s.status, count: Number(s._count.id) })),
      subscriptionsByMonth
    };
  }

  // ─── SaaS Invoice ─────────────────────────────────────────────────────────

  // 8. Emitir factura SaaS y renovar suscripción
  async emitSaaSInvoice(body) {
    const { businessId, plan, durationDays, amount, paymentMethod, mode } = body;

    if (!businessId || !plan || !durationDays) {
      throw new AppError('Se requiere businessId, plan y durationDays', 400);
    }

    const business = await this.repo.findBusinessById(String(businessId));
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
    const lastSubscription = await this.repo.findFirstSubscription({ createdAt: 'desc' });
    const nextNumber = lastSubscription ? parseInt(lastSubscription.invoiceNumber?.split('-')[2] || '0') + 1 : 1;
    const invoiceNumber = `001-001-${String(nextNumber).padStart(7, '0')}`;
    const accessKey = this._generateDemoAccessKey();

    // Determinar estado según el modo
    const invoiceStatus = sriAuthorized ? 'AUTORIZADA' : (emissionMode === 'LOCAL' ? 'LOCAL' : 'PENDIENTE');

    // Crear documento para que aparezca en Devoluciones
    const documentStatus = emissionMode === 'SRI' ? 'AUTHORIZED' : 'LOCAL';

    // Ejecutar actualizaciones y creaciones en paralelo
    const [updatedBusiness, subscription] = await Promise.all([
      this.repo.updateBusiness(String(businessId), {
        plan: plan,
        subscriptionStart: now,
        subscriptionEnd: newEndDate,
        subscriptionStatus: 'ACTIVE',
        isActive: true
      }),
      this.repo.createSubscription({
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
      }),
      this.repo.createDocument({
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
        invoiceType: 'SaaS'
      })
    ]);

    return {
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
    };
  }

  // 9. Procesar nota de crédito SaaS
  async processSaaSCreditNote(body) {
    const { businessId, reason, daysToRefund, customReason, additionalInfo, documentId, invoiceNumber } = body;

    if (!businessId || !reason) {
      throw new AppError('Se requiere businessId y reason', 400);
    }

    const business = await this.repo.findBusinessById(String(businessId));
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

    // Actualizar la empresa y buscar última suscripción en paralelo
    const [updatedBusiness, lastSubscription] = await Promise.all([
      this.repo.updateBusiness(String(businessId), {
        subscriptionEnd: newEndDate,
        subscriptionStatus: newEndDate > now ? 'ACTIVE' : 'EXPIRED',
        isActive: newEndDate > now
      }),
      this.repo.findFirstSubscription({ createdAt: 'desc' })
    ]);
    const nextNumber = lastSubscription ? parseInt(lastSubscription.invoiceNumber?.split('-')[2] || '0') + 1 : 1;
    const creditNoteNumber = `001-002-${String(nextNumber).padStart(7, '0')}`;
    const accessKey = this._generateDemoAccessKey();

    // Crear registro de nota de crédito
    const creditNote = await this.repo.createSubscription({
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
    });

    // Actualizar el documento de la factura a cancelado si se proporcionó
    if (documentId) {
      await this.repo.updateDocument(String(documentId), {
        status: 'CANCELLED',
        additionalInfo: `Anulada por nota de crédito ${creditNoteNumber}. Razón: ${reason}`
      });
    }

    // Crear documento de nota de crédito para que aparezca en Devoluciones
    await this.repo.createDocument({
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
    });

    // Desactivar usuarios si la suscripción terminó
    if (newEndDate <= now) {
      await this.repo.updateUsersByBusiness(String(businessId), { isActive: false }, 'CLIENTE');
    }

    return {
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
    };
  }

  // 10. Obtener documentos del SaaS (para devoluciones)
  async getDocuments(query) {
    const { type, status, businessId } = query;

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

    const documents = await this.repo.findDocuments(
      where,
      {
        business: {
          select: {
            id: true,
            name: true,
            ruc: true
          }
        }
      },
      { createdAt: 'desc' },
      100
    );

    return { documents };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Función auxiliar para generar clave de acceso demo
  _generateDemoAccessKey() {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 99999999999);
    return `${fecha}01${now.getTime().toString().slice(-11)}${String(random).padStart(13, '0')}1`;
  }
}

module.exports = AdminService;
