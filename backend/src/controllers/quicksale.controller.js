const prisma = require('../../prisma/client');
const { catchAsync } = require('../middleware/error.handler');

const quickSaleController = {
    // Listar todas las ventas rápidas de la empresa
    getQuickSales: catchAsync(async (req, res) => {
        const { businessId } = req.user;

        const quickSales = await prisma.quickSale.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' },
        });

        res.json(quickSales);
    }),

    // Crear una venta rápida (ticket)
    createQuickSale: catchAsync(async (req, res) => {
        const { businessId } = req.user;
        const { items, subtotal, iva, total, paymentMethod, notes, number } = req.body;

        // Obtener el siguiente secuencial
        const lastSale = await prisma.quickSale.findFirst({
            where: { businessId },
            orderBy: { sequential: 'desc' },
        });
        const sequential = lastSale ? lastSale.sequential + 1 : 1;

        const quickSale = await prisma.quickSale.create({
            data: {
                sequential,
                items: items || [],
                subtotal: subtotal || 0,
                iva: iva || 0,
                total: total || 0,
                paymentMethod: paymentMethod || 'EFECTIVO',
                status: 'PENDIENTE',
                notes: notes || null,
                businessId,
            },
        });

        // Agregar el número de ticket generado al response
        const response = {
            ...quickSale,
            number: number || `TKT-${String(sequential).padStart(6, '0')}`,
        };

        res.status(201).json(response);
    }),

    // Actualizar una venta rápida
    updateQuickSale: catchAsync(async (req, res) => {
        const { id } = req.params;
        const { businessId } = req.user;
        const { status, batchId, documentId, notes } = req.body;

        const quickSale = await prisma.quickSale.findFirst({
            where: { id, businessId },
        });

        if (!quickSale) {
            return res.status(404).json({ message: 'Ticket no encontrado' });
        }

        const updated = await prisma.quickSale.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(batchId !== undefined && { batchId }),
                ...(documentId !== undefined && { documentId }),
                ...(notes !== undefined && { notes }),
            },
        });

        res.json(updated);
    }),

    // Eliminar una venta rápida
    deleteQuickSale: catchAsync(async (req, res) => {
        const { id } = req.params;
        const { businessId } = req.user;

        const quickSale = await prisma.quickSale.findFirst({
            where: { id, businessId },
        });

        if (!quickSale) {
            return res.status(404).json({ message: 'Ticket no encontrado' });
        }

        await prisma.quickSale.delete({ where: { id } });

        res.json({ message: 'Ticket eliminado correctamente' });
    }),

    // Actualizar estado de múltiples tickets (batch update)
    batchUpdateStatus: catchAsync(async (req, res) => {
        const { businessId } = req.user;
        const { ticketIds, status, batchId, documentId } = req.body;

        if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({ message: 'Se requiere una lista de IDs de tickets' });
        }

        await prisma.quickSale.updateMany({
            where: {
                id: { in: ticketIds },
                businessId,
            },
            data: {
                status: status || 'ENVIADO_SRI',
                ...(batchId && { batchId }),
                ...(documentId && { documentId }),
            },
        });

        res.json({ message: `${ticketIds.length} ticket(s) actualizado(s) a estado ${status || 'ENVIADO_SRI'}` });
    }),
};

module.exports = quickSaleController;
