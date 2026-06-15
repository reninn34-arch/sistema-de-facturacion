const ActivationRequestService = require('./activation-requests.service');

const activationRequestsController = {
  async getAll(req, res) {
    try {
      const { status } = req.query;
      const requests = await ActivationRequestService.getAll(status);
      res.json({ requests });
    } catch (error) {
      console.error('Error fetching activation requests:', error);
      res.status(500).json({ error: 'Error al obtener las solicitudes' });
    }
  },

  async getById(req, res) {
    try {
      const request = await ActivationRequestService.getById(req.params.id);
      res.json({ request });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching activation request:', error);
      res.status(500).json({ error: 'Error al obtener la solicitud' });
    }
  },

  async create(req, res) {
    try {
      const activationRequest = await ActivationRequestService.create(req.body);
      res.status(201).json({ request: activationRequest });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error creating activation request:', error);
      res.status(500).json({ error: 'Error al crear la solicitud' });
    }
  },

  async uploadProof(req, res) {
    try {
      const request = await ActivationRequestService.uploadProof(req.params.id, req.body);
      res.json({ request });
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      res.status(500).json({ error: 'Error al subir el comprobante' });
    }
  },

  async approve(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user?.id || 'SYSTEM';

      const result = await ActivationRequestService.approve(id, adminNotes, adminId);
      res.json({
        request: result.request,
        business: result.business,
        message: 'Solicitud aprobada y suscripción activada correctamente'
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error approving activation request:', error);
      res.status(500).json({ error: 'Error al aprobar la solicitud' });
    }
  },

  async reject(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user?.id || 'SYSTEM';

      const activationRequest = await ActivationRequestService.reject(id, adminNotes, adminId);
      res.json({
        request: activationRequest,
        message: 'Solicitud rechazada'
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }
      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Error rejecting activation request:', error);
      res.status(500).json({ error: 'Error al rechazar la solicitud' });
    }
  },

  async getByBusiness(req, res) {
    try {
      const requests = await ActivationRequestService.getByBusiness(req.params.businessId);
      res.json({ requests });
    } catch (error) {
      console.error('Error fetching business activation requests:', error);
      res.status(500).json({ error: 'Error al obtener las solicitudes' });
    }
  }
};

module.exports = activationRequestsController;
