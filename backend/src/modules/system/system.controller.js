const { getBackupInfo } = require('../../../sriHelpers');

const systemController = {
  health: (req, res) => {
    res.json({
      status: 'OK',
      message: 'Proxy SRI funcionando correctamente',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  },

  info: (req, res) => {
    res.json({
      name: 'SRI Proxy Server - Ecuafact Pro',
      version: '2.0.0',
      description: 'Backend proxy para conectar con el SRI de Ecuador',
      features: [
        '✅ Firma digital XAdES-BES completa',
        '✅ Validación de XML antes de firmar',
        '✅ Canonicalización C14N mejorada',
        '✅ Retry logic con backoff exponencial',
        '✅ Sistema de backup de XMLs autorizados',
        '✅ Monitoreo de expiración de certificados',
        '✅ Rate limiting y seguridad'
      ],
      endpoints: {
        signXml: 'POST /api/sri/sign-xml',
        recepcion: 'POST /api/sri/recepcion',
        autorizacion: 'POST /api/sri/autorizacion',
        backupInfo: 'GET /api/backups/info',
        health: 'GET /health',
        info: 'GET /api/info'
      },
      compliance: {
        xadesbes: 'Implementado',
        validation: 'Implementado',
        backup: 'Implementado (7 años)',
        retry: 'Implementado (5 reintentos)',
        monitoring: 'Implementado'
      }
    });
  },

  backupInfo: (req, res) => {
    try {
      const backupInfo = getBackupInfo();
      res.json({
        success: true,
        backups: backupInfo,
        message: `${backupInfo.totalFiles} XMLs guardados (${backupInfo.totalSizeMB} MB)`
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = systemController;
