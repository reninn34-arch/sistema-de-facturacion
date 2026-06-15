const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt.middleware');
const controller = require('./blog.controller');

router.get('/api/blog/posts', controller.getPublicPosts);
router.get('/api/blog/posts/:slug', controller.getPublicPostBySlug);

router.get('/api/admin/blog', verifyToken, (req, res, next) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  next();
}, controller.getAllPosts);

router.post('/api/admin/blog', verifyToken, (req, res, next) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  next();
}, controller.createPost);

router.put('/api/admin/blog/:id', verifyToken, (req, res, next) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  next();
}, controller.updatePost);

router.delete('/api/admin/blog/:id', verifyToken, (req, res, next) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  next();
}, controller.deletePost);

module.exports = router;
