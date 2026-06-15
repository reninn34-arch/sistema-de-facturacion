const prisma = require('../../../prisma/client');

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

const SettingsService = {
  async getSettings() {
    return prisma.appSettings.findUnique({ where: { id: 'global' } });
  },

  async updateSettings(data) {
    const { bankName, bankAccount, bankAccountType, bankHolderName, bankHolderRuc, bankAccounts, paypalEnabled, transferEnabled, cardEnabled, landingContent } = data;

    return prisma.appSettings.upsert({
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
  },

  async getLandingLogo() {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'global' } });
    return settings?.landingLogo || null;
  },

  async saveLandingLogo(logo) {
    await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: { landingLogo: logo || null },
      create: { id: 'global', landingLogo: logo || null }
    });
  },

  async getLandingContent() {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'global' } });
    return settings?.landingContent || {};
  },

  async updateLandingContent(landingContent) {
    await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: { landingContent },
      create: {
        id: 'global',
        landingContent: landingContent || {}
      }
    });

    return landingContent;
  }
};

module.exports = { SettingsService, ensureSettings };
