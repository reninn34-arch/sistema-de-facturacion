const router = require('express').Router();
const systemController = require('./system.controller');

const authenticate = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY || process.env.VITE_API_KEY;
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return res.status(401).json({ success: false, error: 'No autorizado - API Key inválida' });
    }
  }
  next();
};

router.get('/health', systemController.health);
router.get('/api/info', systemController.info);
router.get('/api/backups/info', authenticate, systemController.backupInfo);

module.exports = router;
