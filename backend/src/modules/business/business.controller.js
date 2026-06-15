const { catchAsync } = require('../../middleware/error.handler');
const BusinessService = require('./business.service');
const BusinessRepository = require('./business.repository');

const repo = new BusinessRepository();
const service = new BusinessService(repo);

const businessController = {
  getUsers: catchAsync(async (req, res) => {
    const users = await service.getUsers(req.user.businessId);
    res.json(users);
  }),

  createUser: catchAsync(async (req, res) => {
    const user = await service.createUser(req.body, req.user);
    res.json({ success: true, user });
  }),

  deleteUser: catchAsync(async (req, res) => {
    await service.deleteUser(req.params.id, req.params.id, req.user.id, req.user.businessId);
    res.json({ success: true });
  }),

  resetUserPassword: catchAsync(async (req, res) => {
    await service.resetUserPassword(req.params.id, req.body.temporaryPassword, req.user.businessId);
    res.json({ success: true, message: 'Contraseña restablecida. El usuario deberá cambiarla al ingresar.' });
  }),

  toggleUserStatus: catchAsync(async (req, res) => {
    const updatedUser = await service.toggleUserStatus(req.params.id, req.body.isActive, req.user.businessId, req.user.id);
    res.json({ success: true, user: updatedUser });
  }),

  updateUser: catchAsync(async (req, res) => {
    const updatedUser = await service.updateUser(req.params.id, req.body, req.user.businessId);
    res.json({ success: true, user: updatedUser });
  }),

  getBusinessProfile: catchAsync(async (req, res) => {
    const business = await service.getBusinessProfile(req.user);
    res.json(business);
  }),

  updateBusinessProfile: catchAsync(async (req, res) => {
    const result = await service.updateBusinessProfile(req.user.businessId, req.body);
    res.json(result);
  }),

  getClients: catchAsync(async (req, res) => {
    const clients = await service.getClients(req.user.businessId, req.user.role);
    res.json(clients);
  }),

  createClient: catchAsync(async (req, res) => {
    const client = await service.createClient(req.body, req.user.businessId);
    res.status(201).json(client);
  }),

  updateClient: catchAsync(async (req, res) => {
    const client = await service.updateClient(req.params.id, req.body, req.user.businessId);
    res.json(client);
  }),

  deleteClient: catchAsync(async (req, res) => {
    await service.deleteClient(req.params.id, req.user.businessId);
    res.json({ success: true });
  }),

  resetClientPassword: catchAsync(async (req, res) => {
    await service.resetClientPassword(req.params.id, req.body.newPassword, req.user.businessId);
    res.json({ success: true, message: 'Contraseña del cliente restablecida correctamente.' });
  }),

  getProducts: catchAsync(async (req, res) => {
    const products = await service.getProducts(req.user.businessId, req.user.role);
    res.json(products);
  }),

  createProduct: catchAsync(async (req, res) => {
    const product = await service.createProduct(req.body, req.user.businessId);
    res.status(201).json(product);
  }),

  updateProduct: catchAsync(async (req, res) => {
    const product = await service.updateProduct(req.params.id, req.body, req.user.businessId);
    res.json(product);
  }),

  deleteProduct: catchAsync(async (req, res) => {
    await service.deleteProduct(req.params.id, req.user.businessId);
    res.json({ success: true });
  }),

  getDocuments: catchAsync(async (req, res) => {
    let filtro = {};
    const { type } = req.query;
    if (type) filtro.type = type;
    if (req.user.role === 'CLIENT') {
      filtro.businessId = req.user.businessId;
      filtro.entityRuc = req.user.ruc;
    } else if (req.user.role === 'VENDEDOR') {
      filtro.businessId = req.user.businessId;
      filtro.userId = req.user.id;
    } else if (req.user.role !== 'SUPERADMIN') {
      filtro.businessId = req.user.businessId;
    }
    const docs = await service.getDocuments(filtro, null);
    res.json(docs);
  }),

  reserveNextSequence: catchAsync(async (req, res) => {
    const result = await service.reserveNextSequence(
      req.body.type, req.body.establishmentCode, req.body.emissionPointCode, req.user.businessId
    );
    res.json({ success: true, ...result });
  }),

  createDocument: catchAsync(async (req, res) => {
    const { items, id, retentionTaxes, ...docData } = req.body;
    const doc = await service.createDocument(
      docData, items, retentionTaxes, req.user,
      req.user.business?.isProduction || false,
      req.user.business?.isDemo || false
    );
    res.json(doc);
  }),

  toggleDemoMode: catchAsync(async (req, res) => {
    await service.toggleDemoMode(req.user.businessId, req.body.enable, req.user.role);
    const msg = req.body.enable
      ? 'Modo demo activado. Ahora puedes usar el sistema sin conexión al SRI.'
      : 'Modo demo desactivado.';
    res.json({ success: true, message: msg });
  }),

  getDemoStatus: catchAsync(async (req, res) => {
    const result = await service.getDemoStatus(req.user.businessId);
    res.json(result);
  }),

  activateProduction: catchAsync(async (req, res) => {
    await service.activateProduction(req.user.businessId, req.user.role);
    res.json({ success: true, message: 'Ambiente de Producción activado. Documentos de prueba eliminados.' });
  }),

  bulkCreateClients: catchAsync(async (req, res) => {
    const results = await service.bulkCreateClients(req.body.clients, req.user.businessId);
    res.json({ success: true, ...results });
  }),

  bulkCreateProducts: catchAsync(async (req, res) => {
    const results = await service.bulkCreateProducts(req.body.products, req.user.businessId);
    res.json({ success: true, ...results });
  })
};

module.exports = businessController;
