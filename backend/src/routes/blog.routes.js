const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const verifyToken = require('../middleware/jwt.middleware');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Rutas publicas
router.get('/api/blog/posts', async (req, res) => {
  try {
    const { category } = req.query;
    const where = { published: true };
    if (category) where.category = category;

    const posts = await prisma.blogPost.findMany({
      where,
      select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, tags: true, videoUrl: true, publishedAt: true, createdAt: true },
      orderBy: { publishedAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar posts' });
  }
});

router.get('/api/blog/posts/:slug', async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
    if (!post || !post.published) return res.status(404).json({ message: 'No encontrado' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar post' });
  }
});

// Rutas admin (CRUD)
router.get('/api/admin/blog', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(posts);
});

router.post('/api/admin/blog', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    const { title, content, excerpt, coverImage, category, tags, videoUrl, published } = req.body;
    let slug = slugify(title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) slug = slug + '-' + Date.now().toString(36);

    const post = await prisma.blogPost.create({
      data: {
        title, content, slug, excerpt, coverImage, category: category || 'tutoriales',
        tags: tags || [], videoUrl, published: published || false,
        publishedAt: published ? new Date() : null
      }
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear post' });
  }
});

router.put('/api/admin/blog/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  try {
    const { title, content, excerpt, coverImage, category, tags, videoUrl, published } = req.body;
    const data = { title, content, excerpt, coverImage, category, tags, videoUrl, published };
    if (published && !data.publishedAt) data.publishedAt = new Date();
    if (!published) data.publishedAt = null;

    const post = await prisma.blogPost.update({ where: { id: req.params.id }, data });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar' });
  }
});

router.delete('/api/admin/blog/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ message: 'Acceso restringido' });
  await prisma.blogPost.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
