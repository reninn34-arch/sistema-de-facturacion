const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwt.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const prisma = require('../../prisma/client');

// Inicializar settings por defecto si no existen
async function ensureSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 'global' } });
  if (!existing) {
    const defaultAccount = {
      id: Math.random().toString(36).substring(7),
      bankName: 'Banco Pichincha',
      bankAccount: '1234567890',
      bankAccountType: 'Cuenta Corriente',
      bankHolderName: 'ECUAFACT S.A.',
      bankHolderRuc: '0953443769'
    };

    await prisma.appSettings.create({
      data: {
        id: 'global',
        bankName: defaultAccount.bankName,
        bankAccount: defaultAccount.bankAccount,
        bankAccountType: defaultAccount.bankAccountType,
        bankHolderName: defaultAccount.bankHolderName,
        bankHolderRuc: defaultAccount.bankHolderRuc,
        bankAccounts: [defaultAccount],
        paypalEnabled: true,
        transferEnabled: true,
        cardEnabled: false
      }
    });
  } else if (!existing.bankAccounts || existing.bankAccounts.length === 0) {
    // Si ya existe pero no tiene bankAccounts, migramos el existente
    if (existing.bankName) {
      const migratedAccount = {
        id: Math.random().toString(36).substring(7),
        bankName: existing.bankName,
        bankAccount: existing.bankAccount,
        bankAccountType: existing.bankAccountType,
        bankHolderName: existing.bankHolderName,
        bankHolderRuc: existing.bankHolderRuc
      };
      await prisma.appSettings.update({
        where: { id: 'global' },
        data: { bankAccounts: [migratedAccount] }
      });
    }
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
    const { bankName, bankAccount, bankAccountType, bankHolderName, bankHolderRuc, bankAccounts, paypalEnabled, transferEnabled, cardEnabled, landingContent } = req.body;

    const settings = await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: {
        ...(bankName !== undefined && { bankName }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(bankAccountType !== undefined && { bankAccountType }),
        ...(bankHolderName !== undefined && { bankHolderName }),
        ...(bankHolderRuc !== undefined && { bankHolderRuc }),
        ...(bankAccounts !== undefined && { bankAccounts }),
        ...(paypalEnabled !== undefined && { paypalEnabled }),
        ...(transferEnabled !== undefined && { transferEnabled }),
        ...(cardEnabled !== undefined && { cardEnabled }),
        ...(landingContent !== undefined && { landingContent })
      },
      create: {
        id: 'global',
        bankName: bankName || '',
        bankAccount: bankAccount || '',
        bankAccountType: bankAccountType || 'Cuenta Corriente',
        bankHolderName: bankHolderName || '',
        bankHolderRuc: bankHolderRuc || '',
        bankAccounts: bankAccounts || [],
        paypalEnabled: paypalEnabled !== false,
        transferEnabled: transferEnabled !== false,
        cardEnabled: cardEnabled || false,
        landingContent: landingContent || {}
      }
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// GET /api/landing-content - Obtener contenido del landing page (público)
router.get('/api/landing-content', async (req, res) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'global' } });
    res.json({ landingContent: settings?.landingContent || {} });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener contenido del landing' });
  }
});

// PUT /api/landing-content - Actualizar contenido del landing page (solo SUPERADMIN)
router.put('/api/landing-content', jwtMiddleware, roleMiddleware(['SUPERADMIN']), async (req, res) => {
  try {
    const { landingContent } = req.body;

    await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: { landingContent },
      create: {
        id: 'global',
        landingContent: landingContent || {}
      }
    });

    res.json({ success: true, landingContent });
  } catch (error) {
    console.error('Error al actualizar landing content:', error);
    res.status(500).json({ error: 'Error al actualizar contenido del landing' });
  }
});

module.exports = router;
