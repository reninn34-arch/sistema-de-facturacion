import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ClockIcon, TagIcon, VideoCameraIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  category: string;
  tags: string[];
  videoUrl?: string;
  publishedAt: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postContent, setPostContent] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Página pública solo con tema claro: limpiar la clase "dark" residual.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/blog/posts${activeCategory ? `?category=${activeCategory}` : ''}`)
      .then(r => r.json())
      .then(data => { setPosts(Array.isArray(data) ? data : []); })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const loadPost = async (slug: string) => {
    const res = await fetch(`${API_URL}/api/blog/posts/${slug}`);
    const post = await res.json();
    if (post && post.id) {
      setSelectedPost(post);
      setPostContent(post.content);
      window.scrollTo(0, 0);
    }
  };

  const categories = ['', ...new Set(posts.map(p => p.category))];

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <button type="button" onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-sky-500 font-bold text-sm mb-8 hover:underline">
            <ArrowLeftIcon className="w-4 h-4" /> Volver al Blog
          </button>

          {selectedPost.videoUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8 shadow-xl">
              <iframe src={selectedPost.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
            </div>
          )}

          <span className="inline-block bg-sky-100 text-sky-600 px-3 py-1 rounded-full text-xs font-black uppercase mb-4">{selectedPost.category}</span>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{selectedPost.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8">
            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {new Date(selectedPost.publishedAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1"><TagIcon className="w-3 h-3" /> {selectedPost.tags?.join(', ') || 'Sin etiquetas'}</span>
          </div>

          {selectedPost.coverImage && (
            <img src={selectedPost.coverImage} alt={selectedPost.title} className="w-full rounded-2xl mb-8 shadow-lg object-cover max-h-96" />
          )}

          <div className="prose prose-slate max-w-none bg-white rounded-3xl p-10 shadow-sm border border-slate-100" dangerouslySetInnerHTML={{ __html: postContent }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Blog & Capacitaciones</h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Tutoriales, guias y webinars para dominar la facturacion electronica y hacer crecer tu negocio.</p>
        </div>

        <div className="flex gap-2 mb-10 justify-center flex-wrap">
          {categories.map(cat => (
            <button type="button" key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
            >
              {cat || 'Todos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-lg">No hay artículos aún</p>
            <p className="text-sm">Vuelve pronto para ver tutoriales y noticias.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <article key={post.id} onClick={() => loadPost(post.slug)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group">
                <div className="h-40 bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center relative">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <DocumentTextIcon className="w-12 h-12 text-white/60" />
                  )}
                  {post.videoUrl && (
                    <div className="absolute top-3 right-3 bg-white/90 rounded-lg px-2 py-1 text-[10px] font-black text-sky-600 flex items-center gap-1">
                      <VideoCameraIcon className="w-3 h-3" /> VIDEO
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-black text-sky-500 uppercase tracking-wider">{post.category}</span>
                  <h3 className="font-black text-slate-800 mt-1 mb-2 group-hover:text-sky-500 transition-colors">{post.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{post.excerpt || 'Sin descripcion'}</p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400">
                    <ClockIcon className="w-3 h-3" />
                    {new Date(post.publishedAt).toLocaleDateString('es-EC')}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <a href="/" className="text-sky-500 font-bold text-sm hover:underline">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
