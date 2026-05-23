const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { catchAsync } = require('../middleware/error.handler');

// Usar cliente compartido de Prisma
const prisma = require('../../prisma/client');

// Helper interno para secuenciales (no se exporta)
async function getNextSequence(tx, type, establishmentCode, emissionPointCode, businessId) {
    const sequence = await tx.sequence.upsert({
        where: {
            type_establishmentCode_emissionPointCode_businessId: {
                type,
                establishmentCode,
                emissionPointCode,
                businessId
            }
        },
        update: { currentValue: { increment: 1 } },
        create: {
            type,
            establishmentCode,
            emissionPointCode,
            businessId,
            currentValue: 1
        }
    });
    return sequence.currentValue;
}

const businessController = {
    // --- USUARIOS DE LA EMPRESA ---
    getUsers: catchAsync(async (req, res) => {
        const users = await prisma.user.findMany({
            where: { businessId: req.user.businessId },
            select: { id: true, email: true, role: true, name: true, isActive: true }
        });
        res.json(users);
    }),

    createUser: catchAsync(async (req, res) => {
        
            const { email, password, role, name } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email y contraseña requeridos' });
            }

            if (password.length < 6) {
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
            }

            if (req.user.role !== 'SUPERADMIN') {
                const business = await prisma.business.findUnique({
                    where: { id: req.user.businessId },
                    select: { plan: true }
                });

                if (business) {
                    const plan = await prisma.subscriptionPlan.findUnique({
                        where: { code: business.plan },
                        select: { maxUsers: true, code: true }
                    });

                    const limit = plan?.maxUsers ?? 1;

                    if (limit >= 0) {
                        const userCount = await prisma.user.count({
                            where: { businessId: req.user.businessId }
                        });

                        if (userCount >= limit) {
                            return res.status(403).json({
                                message: `Has alcanzado el límite de ${limit} usuarios de tu plan ${plan.code}. Actualiza tu plan para crear más usuarios.`
                            });
                        }
                    }
                }
            }

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: role || 'ADMIN',
                    businessId: req.user.businessId,
                    name: name || undefined,
                    isActive: true
                }
            });

            res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, isActive: true } });
    }),

    deleteUser: catchAsync(async (req, res) => {
            const { id } = req.params;
            const userToDelete = await prisma.user.findUnique({ where: { id } });

            if (!userToDelete || userToDelete.businessId !== req.user.businessId) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            if (userToDelete.id === req.user.id) {
                return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
            }

            await prisma.user.delete({ where: { id } });
            res.json({ success: true });
    }),

    resetUserPassword: catchAsync(async (req, res) => {
            const { id } = req.params;
            const { temporaryPassword } = req.body;

            if (!temporaryPassword) return res.status(400).json({ message: 'Se requiere una contraseña temporal.' });

            const userToUpdate = await prisma.user.findUnique({ where: { id } });
            if (!userToUpdate || userToUpdate.businessId !== req.user.businessId) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
            await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

            res.json({ success: true, message: 'Contraseña restablecida. El usuario deberá cambiarla al ingresar.' });
    }),

    toggleUserStatus: catchAsync(async (req, res) => {
            const { id } = req.params;
            const { isActive } = req.body;

            const userToUpdate = await prisma.user.findUnique({ where: { id } });

            if (!userToUpdate || userToUpdate.businessId !== req.user.businessId) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            if (userToUpdate.id === req.user.id) {
                return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: { isActive }
            });

            res.json({ success: true, user: updatedUser });
    }),

    updateUser: catchAsync(async (req, res) => {
            const { id } = req.params;
            const { name, role, password } = req.body;

            const userToUpdate = await prisma.user.findUnique({ where: { id } });

            if (!userToUpdate || userToUpdate.businessId !== req.user.businessId) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (role !== undefined) updateData.role = role;
            if (password !== undefined && password !== '') updateData.password = password;

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    createdAt: true
                }
            });

            res.json({ success: true, user: updatedUser });
    }),

    // --- PERFIL DE EMPRESA ---
    getBusinessProfile: catchAsync(async (req, res) => {
            if (req.user.role === 'SUPERADMIN' && !req.user.businessId) {
                // Si el SUPERADMIN tiene una empresa asignada, la usa; si no, devuelve datos genéricos
                // Para permitir facturación, necesitamos buscar si tiene una empresa configurada
                const superAdminBusiness = await prisma.business.findFirst({
                    where: { ruc: '9999999999999' },
                    include: { users: { where: { role: 'SUPERADMIN' } } }
                });
                
                if (superAdminBusiness) {
                    return res.json(superAdminBusiness);
                }
                
                return res.json({
                    id: 0,
                    name: 'PANEL DE ADMINISTRACIÓN',
                    ruc: '9999999999999',
                    email: req.user.email,
                    address: 'Nube - Servidor Central',
                    phone: '0999999999',
                    isActive: true,
                    isProduction: false,
                    themeColor: '#1e293b'
                });
            }

            if (!req.user.businessId) {
                return res.status(400).json({ message: 'Error crítico: Usuario sin empresa asignada' });
            }

            const business = await prisma.business.findUnique({
                where: { id: String(req.user.businessId) }
            });

            if (!business) {
                return res.status(404).json({ message: 'Empresa no encontrada' });
            }

            res.json(business);
    }),

    updateBusinessProfile: catchAsync(async (req, res) => {
            // Convertir strings vacíos a null para evitar problemas con Prisma
            const updateData = { ...req.body };
            if (updateData.address === '') updateData.address = null;
            if (updateData.phone === '') updateData.phone = null;
            
            const result = await prisma.business.update({
                where: { id: String(req.user.businessId) },
                data: updateData
            });
            res.json(result);
    }),

    // --- CLIENTES ---
    getClients: catchAsync(async (req, res) => {
            let filtro = {};
            if (req.user.role !== 'SUPERADMIN') {
                filtro = { businessId: req.user.businessId };
            }
            const clients = await prisma.client.findMany({ where: filtro });
            res.json(clients);
    }),

    createClient: catchAsync(async (req, res) => {
            // Aceptar tanto 'ruc' como 'identification' para compatibilidad
            const { identification, ruc, ...clientData } = req.body;
            const clientDataWithRuc = { ...clientData, ruc: ruc || identification };
            const businessId = req.user.businessId;
            
            // Validar que no existe cliente con el mismo RUC
            if (clientDataWithRuc.ruc) {
                const existingClient = await prisma.client.findFirst({
                    where: { ruc: clientDataWithRuc.ruc, businessId }
                });
                if (existingClient) {
                    return res.status(400).json({ message: 'Ya existe un cliente con esta identificación' });
                }
            }
            
            const finalClientData = { ...clientDataWithRuc, businessId };
            const client = await prisma.client.create({ data: finalClientData });
            res.status(201).json(client);
    }),

    updateClient: catchAsync(async (req, res) => {
            const { id } = req.params;
            const client = await prisma.client.update({
                where: { id: id, businessId: req.user.businessId },
                data: req.body
            });
            res.json(client);
    }),

    deleteClient: catchAsync(async (req, res) => {
            const { id } = req.params;
            await prisma.client.delete({
                where: { id: id, businessId: req.user.businessId }
            });
            res.json({ success: true });
    }),

    // --- RESET PASSWORD CLIENT ---
    resetClientPassword: catchAsync(async (req, res) => {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) return res.status(400).json({ message: 'Se requiere una nueva contraseña.' });

        const clientToUpdate = await prisma.client.findUnique({ where: { id } });
        if (!clientToUpdate || clientToUpdate.businessId !== req.user.businessId) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.client.update({ where: { id }, data: { password: hashedPassword } });

        res.json({ success: true, message: 'Contraseña del cliente restablecida correctamente.' });
    }),

    // --- PRODUCTOS ---
    getProducts: catchAsync(async (req, res) => {
            let filtro = {};
            if (req.user.role !== 'SUPERADMIN') {
                filtro = { businessId: req.user.businessId };
            }
            const products = await prisma.product.findMany({ where: filtro });
            res.json(products);
    }),

    createProduct: catchAsync(async (req, res) => {
            const productData = { ...req.body, businessId: req.user.businessId };
            
            // Si no se proporciona stock, establecer valor por defecto
            if (productData.stock === undefined || productData.stock === null) {
                productData.stock = 0;
            }
            
            const product = await prisma.product.create({ data: productData });
            res.status(201).json(product);
    }),

    updateProduct: catchAsync(async (req, res) => {
            const { id } = req.params;
            const { id: _, ...data } = req.body;
            const product = await prisma.product.update({
                where: { id: id, businessId: req.user.businessId },
                data: data
            });
            res.json(product);
    }),

    deleteProduct: catchAsync(async (req, res) => {
            const { id } = req.params;
            await prisma.product.delete({
                where: { id: id, businessId: req.user.businessId }
            });
            res.json({ success: true });
    }),

    // --- DOCUMENTOS ---
    getDocuments: catchAsync(async (req, res) => {
            let filtro = {};
            
            // Aplicar filtro por tipo de documento si se especifica
            const { type } = req.query;
            if (type) {
              filtro.type = type;
            }
            
            if (req.user.role === 'CLIENT') {
                filtro.businessId = req.user.businessId;
                filtro.entityRuc = req.user.ruc;
            } else if (req.user.role === 'VENDEDOR') {
                filtro.businessId = req.user.businessId;
                filtro.userId = req.user.id;
            } else if (req.user.role !== 'SUPERADMIN') {
                filtro.businessId = req.user.businessId;
            }
            const docs = await prisma.document.findMany({
                where: filtro,
                include: {
                    items: true,
                    user: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(docs);
    }),

    createDocument: catchAsync(async (req, res) => {
            const { items, id, retentionTaxes, ...docData } = req.body;
            const businessId = req.user.businessId;
            const isReceivedDocument = docData.source === 'RECEIVED';

            // Para documentos recibidos, no requieren items obligatoriamente (pueden ser solo header)
            const requiresItems = ['01', '02'].includes(docData.type) && !isReceivedDocument;
            if (requiresItems && (!items || items.length === 0)) {
                return res.status(400).json({ message: 'El documento debe tener al menos un item' });
            }

            // ENFORCE INVOICE LIMIT: solo para documentos emitidos, no recibidos
            if (docData.type === '01' && req.user.role !== 'SUPERADMIN' && !isReceivedDocument) {
                const business = await prisma.business.findUnique({
                    where: { id: businessId },
                    select: { plan: true }
                });

                if (business) {
                    const plan = await prisma.subscriptionPlan.findUnique({
                        where: { code: business.plan },
                        select: { maxInvoicesPerMonth: true, code: true }
                    });

                    const limit = plan?.maxInvoicesPerMonth ?? 999999;

                    if (limit >= 0) {
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

                        const invoiceCountThisMonth = await prisma.document.count({
                            where: {
                                businessId,
                                type: '01',
                                issueDate: {
                                    gte: startOfMonth,
                                    lte: endOfMonth
                                },
                                status: { not: 'CANCELLED' }
                            }
                        });

                        if (invoiceCountThisMonth >= limit) {
                            return res.status(403).json({
                                message: `Has alcanzado el límite de ${limit} facturas mensuales de tu plan ${plan.code}. Actualiza tu plan para emitir más facturas.`
                            });
                        }
                    }
                }
            }

            // Validar que los productos existan y pertenezcan al negocio
            const requiresProductValidation = ['01', '02', '04'].includes(docData.type) && !isReceivedDocument;
            let productIdToUse = new Map(); // Map para convertir productIds inválidos a null
            
            if (requiresProductValidation && items && items.length > 0) {
                const productIds = items.map(item => item.productId).filter(id => id && !id.startsWith('ITM-') && id !== 'manual');
                if (productIds.length > 0) {
                    const existingProducts = await prisma.product.findMany({
                        where: {
                            id: { in: productIds },
                            businessId: businessId
                        },
                        select: { id: true }
                    });
                    const existingProductIds = new Set(existingProducts.map(p => p.id));
                    const invalidProducts = productIds.filter(pid => !existingProductIds.has(pid));
                    
                    // Marcar los productos inválidos para convertir a null
                    invalidProducts.forEach(pid => productIdToUse.set(pid, null));
                    
                    if (invalidProducts.length > 0 && ['01', '02'].includes(docData.type)) {
                        // Para facturas y notas de venta, reject si hay productos inválidos
                        return res.status(400).json({ 
                            message: `Los siguientes productos no existen o no pertenecen a tu empresa: ${invalidProducts.join(', ')}` 
                        });
                    }
                    // Para notas de crédito, permitimos continuar y convertimos a null
                }
            }

            const result = await prisma.$transaction(async (tx) => {
                let number = docData.number;
                if (!number && ['01', '03', '04', '05', '06', '07'].includes(docData.type)) {
                    number = await getNextSequence(
                        tx,
                        docData.type,
                        docData.establishmentCode || '001',
                        docData.emissionPointCode || '001',
                        businessId
                    );
                    number = number.toString().padStart(9, '0');
                }

                const dataToSave = {
                    ...docData,
                    number,
                    businessId,
                    userId: req.user.id,
                    issueDate: new Date(docData.issueDate),
                    dueDate: docData.dueDate ? new Date(docData.dueDate) : undefined,
                    relatedDocumentDate: docData.relatedDocumentDate ? new Date(docData.relatedDocumentDate) : null,
                    sustainingDocDate: docData.sustainingDocDate ? new Date(docData.sustainingDocDate) : null,
                    retentionTaxes: retentionTaxes ? retentionTaxes : undefined,
                    items: items ? {
                        create: items.map(item => ({
                            productId: (item.productId && item.productId !== 'manual' && !item.productId.startsWith('ITM-')) 
                                ? (productIdToUse.has(item.productId) ? null : item.productId) 
                                : null,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount,
                            taxRate: item.taxRate,
                            total: item.total
                        }))
                    } : undefined
                };

                // Crear documento
                const doc = await tx.document.create({
                    data: dataToSave,
                    include: { items: true }
                });

                // Si es nota de crédito ('04'), actualizar el documento original a CANCELLED
                if (docData.type === '04' && docData.relatedDocumentNumber) {
                    // Buscar el documento original (factura) por número
                    const originalDoc = await tx.document.findFirst({
                        where: {
                            number: docData.relatedDocumentNumber,
                            businessId: businessId,
                            type: { in: ['01', 'INVOICE'] }
                        }
                    });
                    
                    if (originalDoc) {
                        await tx.document.update({
                            where: { id: originalDoc.id },
                            data: {
                                status: 'CANCELLED',
                                additionalInfo: originalDoc?.additionalInfo 
                                    ? `${originalDoc.additionalInfo} | Anulada por NC ${doc.number}`
                                    : `Anulada por nota de crédito ${doc.number}`
                            }
                        });
                    }
                }

                if (items && docData.type === '01') {
                    for (const item of items) {
                        if (item.type === 'FISICO' && item.productId) {
                            const product = await tx.product.findUnique({
                                where: { id: item.productId }
                            });

                            if (product && product.businessId === businessId) {
                                const previousStock = product.stock;
                                const newStock = previousStock - item.quantity;

                                await tx.product.update({
                                    where: { id: item.productId },
                                    data: { stock: newStock }
                                });

                                await tx.inventoryMovement.create({
                                    data: {
                                        productId: item.productId,
                                        documentId: doc.id,
                                        type: 'VENTA',
                                        quantity: -item.quantity,
                                        previousStock,
                                        newStock
                                    }
                                });
                            }
                        }
                    }
                }
                if (items && docData.type === '04') {
                    for (const item of items) {
                        if (item.type === 'FISICO' && item.productId) {
                            const product = await tx.product.findUnique({ where: { id: item.productId } });

                            if (product && product.businessId === businessId) {
                                const previousStock = product.stock;
                                const newStock = previousStock + item.quantity;
                                await tx.product.update({
                                    where: { id: item.productId },
                                    data: { stock: newStock }
                                });
                                await tx.inventoryMovement.create({
                                    data: {
                                        productId: item.productId,
                                        documentId: doc.id,
                                        type: 'DEVOLUCION',
                                        quantity: item.quantity,
                                        previousStock,
                                        newStock
                                    }
                                });
                            }
                        }
                    }
                }

                if (items && docData.type === '03') {
                    for (const item of items) {
                        if (item.type === 'FISICO') {
                            const product = await tx.product.findUnique({ where: { id: item.productId } });

                            if (product && product.businessId === businessId) {
                                const previousStock = product.stock;
                                const newStock = previousStock + item.quantity;
                                await tx.product.update({
                                    where: { id: item.productId },
                                    data: { stock: newStock }
                                });
                                await tx.inventoryMovement.create({
                                    data: {
                                        productId: item.productId,
                                        documentId: doc.id,
                                        type: 'COMPRA',
                                        quantity: item.quantity,
                                        previousStock,
                                        newStock
                                    }
                                });
                            }
                        }
                    }
                }

                return doc;
            });

            res.json(result);
    }),

    // --- MODO DEMO: Activar/Desactivar ---
    toggleDemoMode: catchAsync(async (req, res) => {
        const { enable } = req.body;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'No se encontró la empresa' });
        }

        // Verificar que es admin
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ message: 'Solo administradores pueden activar el modo demo' });
        }

        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        const features = business.features || {};
        
        if (enable) {
            // Activar modo demo - verificar que no tenga firma .p12
            if (features.signatureP12) {
                return res.status(400).json({ 
                    message: 'No puedes activar el modo demo porque ya tienes una firma digital configurada. Primero debes quitar la firma digital.' 
                });
            }

            // Activar modo demo guardando en features
            await prisma.business.update({
                where: { id: businessId },
                data: { features: { ...features, isDemo: true } }
            });

            res.json({ success: true, message: 'Modo demo activado. Ahora puedes usar el sistema sin conexión al SRI.' });
        } else {
            // Desactivar modo demo
            await prisma.business.update({
                where: { id: businessId },
                data: { features: { ...features, isDemo: false } }
            });

            res.json({ success: true, message: 'Modo demo desactivado.' });
        }
    }),

    // --- Verificar estado del modo demo ---
    getDemoStatus: catchAsync(async (req, res) => {
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.json({ isDemo: false });
        }

        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { features: true }
        });

        const features = business?.features || {};
        res.json({ isDemo: features.isDemo || false });
    }),

    // --- Activar Modo Producción ---
    activateProduction: catchAsync(async (req, res) => {
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'No se encontró la empresa' });
        }

        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ message: 'Solo administradores pueden cambiar el ambiente' });
        }

        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        if (business.isProduction) {
            return res.status(400).json({ message: 'La empresa ya está en modo producción' });
        }

        const features = business.features || {};
        if (!features.signatureP12) {
             return res.status(400).json({ message: 'Debes configurar una firma electrónica (.p12) antes de pasar a Producción' });
        }

        // Transacción: eliminar documentos de prueba y activar producción
        await prisma.$transaction(async (tx) => {
            const testDocs = await tx.document.findMany({
                where: { businessId },
                select: { id: true }
            });
            const docIds = testDocs.map(d => d.id);

            if (docIds.length > 0) {
                // Eliminar movimientos de inventario relacionados
                await tx.inventoryMovement.deleteMany({
                    where: { documentId: { in: docIds } }
                });

                // Eliminar ítems de documentos
                await tx.documentItem.deleteMany({
                    where: { documentId: { in: docIds } }
                });

                // Eliminar los documentos
                await tx.document.deleteMany({
                    where: { id: { in: docIds } }
                });
            }

            // Eliminar secuencias para que inicie en 1
            await tx.sequence.deleteMany({
                where: { businessId }
            });

            // Set isProduction to true
            await tx.business.update({
                where: { id: businessId },
                data: { isProduction: true }
            });
        });

        res.json({ success: true, message: 'Ambiente de Producción activado. Documentos de prueba eliminados.' });
    }),

    // BULK IMPORT: Clientes
    bulkCreateClients: catchAsync(async (req, res) => {
        const businessId = req.user.businessId;
        const { clients: clientsData } = req.body;

        if (!Array.isArray(clientsData) || clientsData.length === 0) {
            return res.status(400).json({ message: 'Se requiere un arreglo de clientes' });
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (const c of clientsData) {
            try {
                const ruc = String(c.ruc || c.RUC || c.Identificacion || c.identificacion || '').trim();
                const name = String(c.nombre || c.name || c.Nombre || c['Razon Social'] || c['razon_social'] || '').trim();
                if (!ruc || !name) {
                    results.failed++;
                    results.errors.push(`Fila sin RUC o nombre: ${JSON.stringify(c).substring(0, 80)}`);
                    continue;
                }

                const email = String(c.email || c.Email || c.correo || c.Correo || '').trim() || null;
                const phone = String(c.telefono || c.phone || c.Telefono || c.Phone || '').trim() || null;
                const address = String(c.direccion || c.address || c.Direccion || c.Address || '').trim() || null;
                const typeRaw = String(c.tipo || c.type || c.Tipo || c.Type || 'CLIENTE').trim().toUpperCase();
                const type = ['CLIENTE', 'PROVEEDOR', 'AMBOS'].includes(typeRaw) ? typeRaw : 'CLIENTE';

                await prisma.client.upsert({
                    where: { ruc_businessId: { ruc, businessId } },
                    update: { name, email, phone, address, type },
                    create: { ruc, name, email, phone, address, type, businessId }
                });
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Error: ${err.message}`.substring(0, 200));
            }
        }

        res.json({ success: true, ...results });
    }),

    // BULK IMPORT: Productos
    bulkCreateProducts: catchAsync(async (req, res) => {
        const businessId = req.user.businessId;
        const { products: productsData } = req.body;

        if (!Array.isArray(productsData) || productsData.length === 0) {
            return res.status(400).json({ message: 'Se requiere un arreglo de productos' });
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (const p of productsData) {
            try {
                const code = String(p.codigo || p.code || p.Codigo || p.Code || p['Codigo'] || '').trim();
                const description = String(p.descripcion || p.description || p.Descripcion || p.Description || p['Descripcion'] || '').trim();
                if (!code || !description) {
                    results.failed++;
                    results.errors.push(`Fila sin codigo o descripcion: ${JSON.stringify(p).substring(0, 80)}`);
                    continue;
                }

                const price = parseFloat(p.precio || p.price || p.Precio || p.Price || 0) || 0;
                const wholesalePrice = parseFloat(p.precio_mayorista || p.wholesalePrice || p['Precio Mayorista'] || 0) || 0;
                const distributorPrice = parseFloat(p.precio_distribuidor || p.distributorPrice || p['Precio Distribuidor'] || 0) || 0;
                const stock = parseInt(p.stock || p.Stock || 0) || 0;
                const minStock = parseInt(p.stock_minimo || p.minStock || p['Stock Minimo'] || 0) || 0;
                const taxRate = parseInt(p.iva || p.taxRate || p.Iva || p.TaxRate || 15) || 15;
                const rawType = String(p.tipo || p.type || p.Tipo || p.Type || 'BIEN').trim().toUpperCase();
                const productType = rawType === 'SERVICIO' ? 'SERVICIO' : 'BIEN';
                const category = String(p.categoria || p.category || p.Categoria || 'Otros').trim();
                const unitOfMeasure = String(p.unidad || p.unitOfMeasure || p.Unidad || 'UNIDAD').trim().toUpperCase();
                const isRawMaterial = String(p.materia_prima || p.isRawMaterial || '').toLowerCase() === 'true' || p.isRawMaterial === true;

                await prisma.product.upsert({
                    where: { code_businessId: { code, businessId } },
                    update: { description, price, wholesalePrice, distributorPrice, stock, minStock, taxRate, type: productType, category, unitOfMeasure, isRawMaterial },
                    create: { code, description, price, wholesalePrice, distributorPrice, stock, minStock, taxRate, type: productType, category, unitOfMeasure, isRawMaterial, businessId }
                });
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Error: ${err.message}`.substring(0, 200));
            }
        }

        res.json({ success: true, ...results });
    })
};

module.exports = businessController;
