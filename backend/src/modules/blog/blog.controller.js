const service = require('./blog.service');

async function getPublicPosts(req, res) {
  try {
    const { category } = req.query;
    const posts = await service.getPublicPosts(category);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar posts' });
  }
}

async function getPublicPostBySlug(req, res) {
  try {
    const post = await service.getPublicPostBySlug(req.params.slug);
    if (!post || !post.published) return res.status(404).json({ message: 'No encontrado' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar post' });
  }
}

async function getAllPosts(req, res) {
  try {
    const posts = await service.getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar posts' });
  }
}

async function createPost(req, res) {
  try {
    const post = await service.createPost(req.body);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear post' });
  }
}

async function updatePost(req, res) {
  try {
    const post = await service.updatePost(req.params.id, req.body);
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar' });
  }
}

async function deletePost(req, res) {
  try {
    const result = await service.deletePost(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar' });
  }
}

module.exports = { getPublicPosts, getPublicPostBySlug, getAllPosts, createPost, updatePost, deletePost };
