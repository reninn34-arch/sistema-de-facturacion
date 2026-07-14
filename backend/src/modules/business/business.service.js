const bcrypt = require('bcryptjs');
const { AppError } = require('../../middleware/error.handler');

class BusinessService {
  constructor(repo) {
    this.repo = repo;
  }

  async getUsers(businessId) {
    return this.repo.findUsersByBusiness(businessId);
  }

  async createUser(data, currentUser) {
    const { email, password, role, name } = data;
    if (!email || !password) throw new AppError('Email y contraseña requeridos', 400);
    if (password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);

    const existing = await this.repo.findUserByEmail(email);
    if (existing) throw new AppError('El usuario ya existe', 400);

    if (currentUser.role !== 'SUPERADMIN') {
      const business = await this.repo.findBusinessById(currentUser.businessId);
      if (business) {
        const plan = await this.repo.findSubscriptionPlan(business.plan);
        const limit = plan?.maxUsers ?? 1;
        if (limit >= 0) {
          const userCount = await this.repo.countUsersByBusiness(currentUser.businessId);
          if (userCount >= limit) {
            throw new AppError(`Has alcanzado el límite de ${limit} usuarios de tu plan ${plan.code}. Actualiza tu plan para crear más usuarios.`, 403);
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.repo.createUser({
      email,
      password: hashedPassword,
      role: role || 'ADMIN',
      businessId: currentUser.businessId,
      name: name || undefined,
      isActive: true
    });

    return { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, isActive: true };
  }

  async deleteUser(userId, targetId, currentUserId, businessId) {
    const userToDelete = await this.repo.findUserById(targetId);
    if (!userToDelete || userToDelete.businessId !== businessId) {
      throw new AppError('Usuario no encontrado', 404);
    }
    if (userToDelete.id === currentUserId) {
      throw new AppError('No puedes eliminar tu propia cuenta', 400);
    }
    await this.repo.deleteUser(targetId);
  }

  async resetUserPassword(targetId, temporaryPassword, businessId) {
    if (!temporaryPassword) throw new AppError('Se requiere una contraseña temporal.', 400);
    const userToUpdate = await this.repo.findUserById(targetId);
    if (!userToUpdate || userToUpdate.businessId !== businessId) {
      throw new AppError('Usuario no encontrado', 404);
    }
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    await this.repo.updateUser(targetId, { password: hashedPassword });
  }

  async toggleUserStatus(targetId, isActive, businessId, currentUserId) {
    const userToUpdate = await this.repo.findUserById(targetId);
    if (!userToUpdate || userToUpdate.businessId !== businessId) {
      throw new AppError('Usuario no encontrado', 404);
    }
    if (userToUpdate.id === currentUserId) {
      throw new AppError('No puedes desactivar tu propia cuenta', 400);
    }
    return this.repo.updateUser(targetId, { isActive });
  }

  async updateUser(targetId, data, businessId) {
    const userToUpdate = await this.repo.findUserById(targetId);
    if (!userToUpdate || userToUpdate.businessId !== businessId) {
      throw new AppError('Usuario no encontrado', 404);
    }
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.password !== undefined && data.password !== '') updateData.password = data.password;
    return this.repo.updateUser(targetId, updateData);
  }

  async getBusinessProfile(user) {
    if (user.role === 'SUPERADMIN' && !user.businessId) {
      const superAdminBusiness = await this.repo.findFirstBusinessByRuc('9999999999999');
      if (superAdminBusiness) return superAdminBusiness;
      return {
        id: 0, name: 'PANEL DE ADMINISTRACIÓN', ruc: '9999999999999',
        email: user.email, address: 'Nube - Servidor Central',
        phone: '0999999999', isActive: true, isProduction: false, themeColor: '#1e293b'
      };
    }
    if (!user.businessId) throw new AppError('Error crítico: Usuario sin empresa asignada', 400);
    const business = await this.repo.findBusinessById(user.businessId);
    if (!business) throw new AppError('Empresa no encontrada', 404);
    return business;
  }

  async updateBusinessProfile(businessId, data) {
    const updateData = { ...data };
    if (updateData.address === '') updateData.address = null;
    if (updateData.phone === '') updateData.phone = null;

    // Si se está eliminando la firma digital, revocar automáticamente el modo producción.
    // Sin .p12 no es posible firmar XML → mantener producción activa sería un estado inválido.
    if (
      updateData.features &&
      (updateData.features.signatureP12 === null || updateData.features.signatureP12 === undefined)
    ) {
      const business = await this.repo.findBusinessById(businessId);
      if (business?.isProduction) {
        updateData.isProduction = false;
        if (updateData.features) {
          updateData.features = { ...updateData.features, isDemo: true };
        }
      }
    }

    return this.repo.updateBusiness(businessId, updateData);
  }

  async getClients(businessId, role) {
    const filtro = role !== 'SUPERADMIN' ? { businessId } : {};
    return this.repo.findClients(filtro);
  }

  async createClient(data, businessId) {
    const { identification, ruc, type, ...clientData } = data;
    const clientRuc = ruc || identification;
    const clientType = type || 'CLIENTE';
    if (clientRuc) {
      const existingClient = await this.repo.findClientByRucAndBusiness(clientRuc, businessId);
      if (existingClient) throw new AppError('Ya existe un cliente con esta identificación', 400);
    }
    return this.repo.createClient({ ...clientData, ruc: clientRuc, type: clientType, businessId });
  }

  async updateClient(id, data, businessId) {
    return this.repo.updateClient(id, { ...data, businessId });
  }

  async deleteClient(id, businessId) {
    return this.repo.deleteClient(id, businessId);
  }

  async resetClientPassword(clientId, newPassword, businessId) {
    if (!newPassword) throw new AppError('Se requiere una nueva contraseña.', 400);
    const clientToUpdate = await this.repo.findClientById(clientId);
    if (!clientToUpdate || clientToUpdate.businessId !== businessId) {
      throw new AppError('Cliente no encontrado', 404);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.updateClient(clientId, { password: hashedPassword });
  }

  async getProducts(businessId, role) {
    const filtro = role !== 'SUPERADMIN' ? { businessId } : {};
    return this.repo.findProducts(filtro);
  }

  async createProduct(data, businessId) {
    const productData = { ...data, businessId };
    if (productData.stock === undefined || productData.stock === null) {
      productData.stock = 0;
    }
    // Default required fields
    if (!productData.description) {
      productData.description = productData.name || 'Producto sin descripción';
    }
    if (!productData.type) {
      productData.type = 'BIEN';
    }
    // Clean up temporary/legacy name attribute
    delete productData.name;
    return this.repo.createProduct(productData);
  }

  async updateProduct(id, data, businessId) {
    const { id: _, ...cleanData } = data;
    return this.repo.updateProduct(id, { ...cleanData, businessId });
  }

  async deleteProduct(id, businessId) {
    return this.repo.deleteProduct(id, businessId);
  }

  async getDocuments(filtro, type) {
    const where = { ...filtro };
    if (type) where.type = type;
    return this.repo.findDocuments(where);
  }

  async reserveNextSequence(type, establishmentCode, emissionPointCode, businessId) {
    if (!type) throw new AppError('Tipo de documento requerido (01, 04, etc.)', 400);
    const estab = establishmentCode || '001';
    const ptEmi = emissionPointCode || '001';
    const sequential = await this.repo.$transaction(async (tx) => {
      const seq = await this.repo.upsertSequence(tx, type, estab, ptEmi, businessId);
      return seq.currentValue;
    });
    const paddedNumber = sequential.toString().padStart(9, '0');
    return {
      sequential: paddedNumber,
      number: `${estab}-${ptEmi}-${paddedNumber}`,
      establishmentCode: estab,
      emissionPointCode: ptEmi
    };
  }

  async createDocument(data, items, retentionTaxes, user, isProduction, isDemo) {
    const businessId = user.businessId;
    const isReceivedDocument = data.source === 'RECEIVED';
    
    const docType = data.type || '01';
    const requiresItems = ['01', '02'].includes(docType) && !isReceivedDocument;

    const itemsList = items || [];
    if (requiresItems && itemsList.length === 0) {
      throw new AppError('El documento debe tener al menos un item', 400);
    }

    // Default dates
    const rawIssueDate = data.issueDate || data.emissionDate || new Date();
    const issueDateObj = new Date(rawIssueDate);
    const issueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj;

    // Fetch or placeholder client details
    let clientName = data.entityName;
    let clientRuc = data.entityRuc;
    let clientEmail = data.entityEmail;
    let clientPhone = data.entityPhone;
    let clientAddress = data.entityAddress;

    if (!clientName && data.clientId) {
      const client = await this.repo.findClientById(data.clientId).catch(() => null);
      if (client) {
        clientName = client.name;
        clientRuc = client.ruc;
        clientEmail = client.email;
        clientPhone = client.phone;
        clientAddress = client.address;
      } else {
        clientName = data.clientName || 'Consumidor Final';
        clientRuc = data.clientRuc || '9999999999999';
        clientEmail = data.clientEmail || 'consumidor@final.com';
        clientPhone = data.clientPhone || '';
        clientAddress = data.clientAddress || 'Quito';
      }
    }

    clientName = clientName || 'Consumidor Final';
    clientRuc = clientRuc || '9999999999999';
    const status = data.status || 'BORRADOR';
    const paymentStatus = data.paymentStatus || 'PENDING';

    // Calculate total
    const calculatedTotal = itemsList.reduce((sum, item) => {
      const price = item.unitPrice || item.price || 0;
      const qty = item.quantity || 0;
      const subtotal = price * qty;
      const discount = item.discount || 0;
      const rate = item.taxRate || 0;
      const itemTotal = (subtotal - discount) * (1 + rate / 100);
      return sum + (item.total || itemTotal || 0);
    }, 0);
    const total = data.total !== undefined ? data.total : calculatedTotal;

    // Invoice limit check
    if (docType === '01' && user.role !== 'SUPERADMIN' && !isReceivedDocument && !isDemo) {
      const business = await this.repo.findBusinessById(businessId);
      if (business && business.isProduction) {
        const plan = await this.repo.findSubscriptionPlan(business.plan);
        const limit = plan?.maxInvoicesPerMonth ?? 0;
        const planCode = plan?.code;
        if (planCode === 'PENDING' || limit <= 0) {
          throw new AppError('Su plan no permite emitir facturas. Complete el pago para activar su suscripción.', 403);
        }
        if (planCode !== 'UNLIMITED') {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          const invoiceCountThisMonth = await this.repo.countDocuments({
            businessId, type: '01',
            issueDate: { gte: startOfMonth, lte: endOfMonth },
            status: { not: 'CANCELLED' }
          });
          if (invoiceCountThisMonth >= limit) {
            throw new AppError(`Has alcanzado el límite de ${limit} facturas mensuales de tu plan ${plan.code}. Actualiza tu plan para emitir más facturas.`, 403);
          }
        }
      }
    }

    // Product validation
    const requiresProductValidation = ['01', '02', '04'].includes(docType) && !isReceivedDocument;
    const productIdToUse = new Map();
    if (requiresProductValidation && itemsList.length > 0) {
      const productIds = [];
      for (const item of itemsList) {
        const id = item.productId;
        if (id && !id.startsWith('ITM-') && id !== 'manual') {
          productIds.push(id);
        }
      }
      if (productIds.length > 0) {
        const existingProducts = await this.repo.findProductsByIds(productIds, businessId);
        const existingProductIds = new Set(existingProducts.map(p => p.id));
        const invalidProducts = productIds.filter(pid => !existingProductIds.has(pid));
        invalidProducts.forEach(pid => productIdToUse.set(pid, null));
        if (invalidProducts.length > 0 && ['01', '02'].includes(docType)) {
          throw new AppError(`Los siguientes productos no existen o no pertenecen a tu empresa: ${invalidProducts.join(', ')}`, 400);
        }
      }
    }

    const result = await this.repo.$transaction(async (tx) => {
      let number = data.number;
      if (!number && ['01', '03', '04', '05', '06', '07'].includes(docType)) {
        const seq = await this.repo.upsertSequence(
          tx, docType,
          data.establishmentCode || '001',
          data.emissionPointCode || '001',
          businessId
        );
        number = seq.currentValue.toString().padStart(9, '0');
      }

      const {
        clientId: _clientId,
        emissionDate: _emissionDate,
        ...cleanedData
      } = data;

      const doc = await this.repo.createDocument(tx, {
        ...cleanedData,
        type: docType,
        number,
        businessId,
        userId: user.id,
        issueDate,
        entityName: clientName,
        entityRuc: clientRuc,
        entityEmail: clientEmail,
        entityPhone: clientPhone,
        entityAddress: clientAddress,
        total,
        status,
        paymentStatus,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        relatedDocumentDate: data.relatedDocumentDate ? new Date(data.relatedDocumentDate) : null,
        sustainingDocDate: data.sustainingDocDate ? new Date(data.sustainingDocDate) : null,
        retentionTaxes: retentionTaxes || undefined,
        items: itemsList.length > 0 ? {
          create: itemsList.map(item => {
            const price = item.unitPrice || item.price || 0;
            const qty = item.quantity || 0;
            const subtotal = price * qty;
            const discount = item.discount || 0;
            const rate = item.taxRate || 0;
            const itemTotal = (subtotal - discount) * (1 + rate / 100);

            return {
              productId: (item.productId && item.productId !== 'manual' && !item.productId.startsWith('ITM-'))
                ? (productIdToUse.has(item.productId) ? null : item.productId) : null,
              description: item.description || item.name || 'Item',
              quantity: qty,
              unitPrice: price,
              discount: discount,
              taxRate: rate,
              total: item.total !== undefined ? item.total : itemTotal
            };
          })
        } : undefined
      });

      // Credit note: cancel original document
      if (docType === '04' && data.relatedDocumentNumber) {
        const originalDoc = await this.repo.findDocument(tx, {
          number: data.relatedDocumentNumber, businessId, type: { in: ['01', 'INVOICE'] }
        });
        if (originalDoc) {
          await this.repo.updateDocument(tx, { id: originalDoc.id }, {
            status: 'CANCELLED',
            additionalInfo: originalDoc?.additionalInfo
              ? `${originalDoc.additionalInfo} | Anulada por NC ${doc.number}`
              : `Anulada por nota de crédito ${doc.number}`
          });
        }
      }

      // Inventory: invoice (VENTA)
      if (itemsList.length > 0 && docType === '01') {
        await Promise.all(itemsList.map(async (item) => {
          if (item.type === 'FISICO' && item.productId) {
            const product = await this.repo.findProductById(tx, item.productId);
            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock - item.quantity;
              await this.repo.updateProductStock(tx, item.productId, { stock: newStock });
              await this.repo.createInventoryMovement(tx, {
                productId: item.productId, documentId: doc.id, type: 'VENTA',
                quantity: -item.quantity, previousStock, newStock
              });
            }
          }
        }));
      }

      // Inventory: credit note (DEVOLUCION)
      if (itemsList.length > 0 && docType === '04') {
        await Promise.all(itemsList.map(async (item) => {
          if (item.type === 'FISICO' && item.productId) {
            const product = await this.repo.findProductById(tx, item.productId);
            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock + item.quantity;
              await this.repo.updateProductStock(tx, item.productId, { stock: newStock });
              await this.repo.createInventoryMovement(tx, {
                productId: item.productId, documentId: doc.id, type: 'DEVOLUCION',
                quantity: item.quantity, previousStock, newStock
              });
            }
          }
        }));
      }

      // Inventory: purchase (COMPRA)
      if (itemsList.length > 0 && docType === '03') {
        await Promise.all(itemsList.map(async (item) => {
          if (item.type === 'FISICO') {
            const product = await this.repo.findProductById(tx, item.productId);
            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock + item.quantity;
              await this.repo.updateProductStock(tx, item.productId, { stock: newStock });
              await this.repo.createInventoryMovement(tx, {
                productId: item.productId, documentId: doc.id, type: 'COMPRA',
                quantity: item.quantity, previousStock, newStock
              });
            }
          }
        }));
      }

      return doc;
    });

    return result;
  }

  async toggleDemoMode(businessId, enable, userRole) {
    if (!businessId) throw new AppError('No se encontró la empresa', 400);
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      throw new AppError('Solo administradores pueden activar el modo demo', 403);
    }
    const business = await this.repo.findBusinessById(businessId);
    if (!business) throw new AppError('Empresa no encontrada', 404);
    const features = business.features || {};
    if (enable && features.signatureP12) {
      throw new AppError('No puedes activar el modo demo porque ya tienes una firma digital configurada.', 400);
    }
    await this.repo.updateBusiness(businessId, {
      features: { ...features, isDemo: !!enable }
    });
  }

  async getDemoStatus(businessId) {
    if (!businessId) return { isDemo: false };
    const business = await this.repo.findBusinessById(businessId);
    const features = business?.features || {};
    return { isDemo: features.isDemo || false };
  }

  async activateProduction(businessId, userRole) {
    if (!businessId) throw new AppError('No se encontró la empresa', 400);
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
      throw new AppError('Solo administradores pueden cambiar el ambiente', 403);
    }
    const business = await this.repo.findBusinessById(businessId);
    if (!business) throw new AppError('Empresa no encontrada', 404);
    if (business.isProduction) throw new AppError('La empresa ya está en modo producción', 400);
    const features = business.features || {};
    if (!features.signatureP12) {
      throw new AppError('Debes configurar una firma electrónica (.p12) antes de pasar a Producción', 400);
    }
    await this.repo.updateBusiness(businessId, { isProduction: true });
  }

  async bulkCreateClients(clientsData, businessId) {
    if (!Array.isArray(clientsData) || clientsData.length === 0) {
      throw new AppError('Se requiere un arreglo de clientes', 400);
    }
    const outcomes = await Promise.all(clientsData.map(async (c) => {
      try {
        const ruc = String(c.ruc || c.RUC || c.Identificacion || c.identificacion || '').trim();
        const name = String(c.nombre || c.name || c.Nombre || c['Razon Social'] || c['razon_social'] || '').trim();
        if (!ruc || !name) {
          return { success: false, error: `Fila sin RUC o nombre: ${JSON.stringify(c).substring(0, 80)}` };
        }
        const email = String(c.email || c.Email || c.correo || c.Correo || '').trim() || null;
        const phone = String(c.telefono || c.phone || c.Telefono || c.Phone || '').trim() || null;
        const address = String(c.direccion || c.address || c.Direccion || c.Address || '').trim() || null;
        const typeRaw = String(c.tipo || c.type || c.Tipo || c.Type || 'CLIENTE').trim().toUpperCase();
        const type = ['CLIENTE', 'PROVEEDOR', 'AMBOS'].includes(typeRaw) ? typeRaw : 'CLIENTE';
        await this.repo.bulkUpsertClient({
          where: { ruc_businessId: { ruc, businessId } },
          update: { name, email, phone, address, type },
          create: { ruc, name, email, phone, address, type, businessId }
        });
        return { success: true };
      } catch (err) {
        return { success: false, error: `Error: ${err.message}`.substring(0, 200) };
      }
    }));

    const results = { success: 0, failed: 0, errors: [] };
    for (const outcome of outcomes) {
      if (outcome.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(outcome.error);
      }
    }
    return results;
  }

  async bulkCreateProducts(productsData, businessId) {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      throw new AppError('Se requiere un arreglo de productos', 400);
    }
    const outcomes = await Promise.all(productsData.map(async (p) => {
      try {
        const code = String(p.codigo || p.code || '').trim();
        const description = String(p.descripcion || p.description || '').trim();
        if (!code || !description) {
          return { success: false, error: `Fila sin código o descripción: ${JSON.stringify(p).substring(0, 80)}` };
        }
        const price = parseFloat(p.precio || p.price || 0) || 0;
        const wholesalePrice = parseFloat(p.precio_mayorista || p.wholesalePrice || 0) || 0;
        const distributorPrice = parseFloat(p.precio_distribuidor || p.distributorPrice || 0) || 0;
        const stock = parseInt(p.stock || 0) || 0;
        const minStock = parseInt(p.stock_minimo || p.minStock || 0) || 0;
        const taxRate = parseInt(p.iva || p.taxRate || 15) || 15;
        const rawType = String(p.tipo || p.type || 'BIEN').trim().toUpperCase();
        const productType = rawType === 'SERVICIO' ? 'SERVICIO' : 'BIEN';
        const category = String(p.categoria || p.category || 'Otros').trim();
        const unitOfMeasure = String(p.unidad || p.unitOfMeasure || 'UNIDAD').trim().toUpperCase();
        const isRawMaterial = String(p.materia_prima || p.isRawMaterial || '').toLowerCase() === 'true';
        await this.repo.bulkUpsertProduct({
          where: { code_businessId: { code, businessId } },
          update: { description, price, wholesalePrice, distributorPrice, stock, minStock, taxRate, type: productType, category, unitOfMeasure, isRawMaterial },
          create: { code, description, price, wholesalePrice, distributorPrice, stock, minStock, taxRate, type: productType, category, unitOfMeasure, isRawMaterial, businessId }
        });
        return { success: true };
      } catch (err) {
        return { success: false, error: `Error: ${err.message}`.substring(0, 200) };
      }
    }));

    const results = { success: 0, failed: 0, errors: [] };
    for (const outcome of outcomes) {
      if (outcome.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(outcome.error);
      }
    }
    return results;
  }
}

module.exports = BusinessService;
