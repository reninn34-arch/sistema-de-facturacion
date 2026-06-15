const prisma = require('../../../prisma/client');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function getPublicPosts(category) {
  const where = { published: true };
  if (category) where.category = category;

  const posts = await prisma.blogPost.findMany({
    where,
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, category: true, tags: true, videoUrl: true, publishedAt: true, createdAt: true },
    orderBy: { publishedAt: 'desc' }
  });
  return posts;
}

async function getPublicPostBySlug(slug) {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  return post;
}

async function getAllPosts() {
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  return posts;
}

async function createPost(data) {
  const { title, content, excerpt, coverImage, category, tags, videoUrl, published } = data;
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
  return post;
}

async function updatePost(id, data) {
  const { title, content, excerpt, coverImage, category, tags, videoUrl, published } = data;
  const updateData = { title, content, excerpt, coverImage, category, tags, videoUrl, published };
  if (published && !updateData.publishedAt) updateData.publishedAt = new Date();
  if (!published) updateData.publishedAt = null;

  const post = await prisma.blogPost.update({ where: { id }, data: updateData });
  return post;
}

async function deletePost(id) {
  await prisma.blogPost.delete({ where: { id } });
  return { success: true };
}

module.exports = { getPublicPosts, getPublicPostBySlug, getAllPosts, createPost, updatePost, deletePost };
