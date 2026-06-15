class QuickSaleService {
  constructor(repository) {
    this.repo = repository;
  }

  async getQuickSales(businessId) {
    return this.repo.findByBusiness(businessId);
  }

  async createQuickSale(businessId, data) {
    const lastSale = await this.repo.findLastByBusiness(businessId);
    const sequential = lastSale ? lastSale.sequential + 1 : 1;

    const quickSale = await this.repo.create({
      sequential,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      iva: data.iva || 0,
      total: data.total || 0,
      paymentMethod: data.paymentMethod || 'EFECTIVO',
      status: 'PENDIENTE',
      notes: data.notes || null,
      clientId: data.clientId || null,
      clientName: data.clientName || null,
      clientIdentification: data.clientIdentification || null,
      businessId,
    });

    return {
      ...quickSale,
      number: data.number || `TKT-${String(sequential).padStart(6, '0')}`,
    };
  }

  async updateQuickSale(id, businessId, data) {
    const quickSale = await this.repo.findByIdAndBusiness(id, businessId);
    if (!quickSale) {
      const error = new Error('Ticket no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.batchId !== undefined) updateData.batchId = data.batchId;
    if (data.documentId !== undefined) updateData.documentId = data.documentId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.repo.update(id, updateData);
  }

  async deleteQuickSale(id, businessId) {
    const quickSale = await this.repo.findByIdAndBusiness(id, businessId);
    if (!quickSale) {
      const error = new Error('Ticket no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await this.repo.delete(id);
    return { message: 'Ticket eliminado correctamente' };
  }

  async batchUpdateStatus(businessId, ticketIds, status, batchId, documentId) {
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      const error = new Error('Se requiere una lista de IDs de tickets');
      error.statusCode = 400;
      throw error;
    }

    const updateData = {
      status: status || 'ENVIADO_SRI',
    };
    if (batchId) updateData.batchId = batchId;
    if (documentId) updateData.documentId = documentId;

    await this.repo.updateManyByBusiness(ticketIds, businessId, updateData);

    return { message: `${ticketIds.length} ticket(s) actualizado(s) a estado ${status || 'ENVIADO_SRI'}` };
  }
}

module.exports = QuickSaleService;
