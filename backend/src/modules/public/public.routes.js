const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const controller = require('./public.controller');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiadas consultas. Intente mas tarde.' }
});

router.get('/api/public/activation-status', publicLimiter, controller.getActivationStatus);

module.exports = router;
