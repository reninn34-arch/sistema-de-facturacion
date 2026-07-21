const router = require('express').Router();
const notificationController = require('./notifications.controller');
const verifyToken = require('../../middleware/jwt.middleware');

// Enviar email (RIDE al cliente, prueba de configuración, etc.) lo dispara un
// usuario logueado desde el frontend. Se autentica por la sesión (cookie/JWT),
// no por X-API-Key: antes exigía X-API-Key en producción y el frontend no lo
// enviaba, así que todos los envíos daban 401 en producción.
router.post('/send-email', verifyToken, notificationController.sendEmail);
router.post('/send-sms', verifyToken, notificationController.sendSMS);
router.post('/send-whatsapp', verifyToken, notificationController.sendWhatsApp);

module.exports = router;
