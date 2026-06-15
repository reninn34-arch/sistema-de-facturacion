const router = require('express').Router();
const notificationController = require('./notifications.controller');

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

router.post('/send-email', authenticate, notificationController.sendEmail);

module.exports = router;
