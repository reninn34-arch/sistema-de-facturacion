const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const controller = require('./emission-points.controller');

router.get('/api/emission-points', verifyToken, controller.list);
router.post('/api/emission-points', verifyToken, controller.create);
router.delete('/api/emission-points/:id', verifyToken, controller.remove);

module.exports = router;
