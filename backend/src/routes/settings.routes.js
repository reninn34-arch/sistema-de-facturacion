const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwt.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const prisma = require('../../prisma/client');

// Inicializar settings por defecto si no existen
async function ensureSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 'global' } });
  if (!existing) {
    await prisma.appSettings.create({
      data: {
        id: 'global',
        bankName: 'Banco Pichincha',
        bankAccount: '1234567890',
        bankAccountType: 'Cuenta Corriente',
        bankHolderName: 'ECUAFACT S.A.',
        bankHolderRuc: '0953443769',
        paypalEnabled: true,
        transferEnabled: true,
        cardEnabled: false
      }
    });
  }
}
ensureSettings();

// GET /api/admin/settings - Obtener configuración (público para lectura de datos bancarios)
router.get('/api/admin/settings', async (req, res) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'global' } });
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/admin/settings - Actualizar configuración (solo SUPERADMIN)
router.put('/api/admin/settings', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { bankName, bankAccount, bankAccountType, bankHolderName, bankHolderRuc, paypalEnabled, transferEnabled, cardEnabled } = req.body;

    const settings = await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: {
        ...(bankName !== undefined && { bankName }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(bankAccountType !== undefined && { bankAccountType }),
        ...(bankHolderName !== undefined && { bankHolderName }),
        ...(bankHolderRuc !== undefined && { bankHolderRuc }),
        ...(paypalEnabled !== undefined && { paypalEnabled }),
        ...(transferEnabled !== undefined && { transferEnabled }),
        ...(cardEnabled !== undefined && { cardEnabled })
      },
      create: {
        id: 'global',
        bankName: bankName || '',
        bankAccount: bankAccount || '',
        bankAccountType: bankAccountType || 'Cuenta Corriente',
        bankHolderName: bankHolderName || '',
        bankHolderRuc: bankHolderRuc || '',
        paypalEnabled: paypalEnabled !== false,
        transferEnabled: transferEnabled !== false,
        cardEnabled: cardEnabled || false
      }
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

module.exports = router;
