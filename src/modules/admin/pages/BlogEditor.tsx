import React, { useState, useEffect, useId } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category: string;
  tags: string[];
  videoUrl?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const BlogEditor: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', coverImage: '', category: 'tutoriales', tags: '', videoUrl: '', published: false });
  const [notify, setNotify] = useState('');
  const [saving, setSaving] = useState(false);
  const fieldId = useId();

  const token = localStorage.getItem('adminToken');

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/blog`, { headers: { 'Authorization': `Bearer ${token}` } });
      setPosts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!form.title || !form.content) { setNotify('Titulo y contenido requeridos'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_URL}/api/admin/blog/${editing.id}` : `${API_URL}/api/admin/blog`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
      });
      if (res.ok) {
        setNotify(editing ? 'Post actualizado' : 'Post creado');
        setEditing(null);
        resetForm();
        loadPosts();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); setTimeout(() => setNotify(''), 3000); }
  };

  const edit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title, content: post.content, excerpt: post.excerpt || '',
      coverImage: post.coverImage || '', category: post.category,
      tags: (post.tags || []).join(', '), videoUrl: post.videoUrl || '',
      published: post.published
    });
    window.scrollTo(0, 0);
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar este post?')) return;
    await fetch(`${API_URL}/api/admin/blog/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    loadPosts();
  };

  const resetForm = () => setForm({ title: '', content: '', excerpt: '', coverImage: '', category: 'tutoriales', tags: '', videoUrl: '', published: false });

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Blog & Capacitaciones</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestiona articulos, tutoriales y webinars</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); resetForm(); }}
          className="bg-sky-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-sky-600 flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Nuevo Post
        </button>
      </div>

      {notify && (
        <div className={`${notify.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border rounded-2xl p-4 font-bold text-sm flex items-center gap-2`}>
          {notify.includes('Error') ? <ExclamationTriangleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
          {notify}
        </div>
      )}

      {(editing !== undefined && editing === null) || editing ? (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-4">
          <h4 className="text-lg font-black text-slate-800">{editing ? 'Editar Post' : 'Nuevo Post'}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-title`} className="text-[10px] font-black text-slate-400 uppercase">Titulo</label>
              <input id={`${fieldId}-title`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-category`} className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
              <select id={`${fieldId}-category`} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm">
                <option value="tutoriales">Tutoriales</option>
                <option value="capacitaciones">Capacitaciones</option>
                <option value="noticias">Noticias</option>
                <option value="guias">Guias</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-cover`} className="text-[10px] font-black text-slate-400 uppercase">Imagen Portada (URL)</label>
              <input id={`${fieldId}-cover`} value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-video`} className="text-[10px] font-black text-slate-400 uppercase">Video URL (YouTube)</label>
              <input id={`${fieldId}-video`} value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-tags`} className="text-[10px] font-black text-slate-400 uppercase">Etiquetas (coma separado)</label>
              <input id={`${fieldId}-tags`} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="facturacion, sri, tutorial" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${fieldId}-excerpt`} className="text-[10px] font-black text-slate-400 uppercase">Resumen (excerpt)</label>
            <textarea id={`${fieldId}-excerpt`} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" rows={2} />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${fieldId}-content`} className="text-[10px] font-black text-slate-400 uppercase">Contenido (HTML)</label>
            <textarea id={`${fieldId}-content`} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-mono text-sm" rows={8} placeholder="<h2>Titulo</h2><p>Contenido del articulo...</p>" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
              <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="rounded" />
              Publicado (visible en el blog)
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setEditing(undefined as any); resetForm(); }} className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-xs uppercase">Cancelar</button>
              <button type="submit" onClick={save} disabled={saving}
                className="px-8 py-3 bg-sky-500 text-white rounded-xl font-bold text-xs uppercase hover:bg-sky-600 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Post'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="py-4 px-6 text-left">Titulo</th>
              <th className="py-4 text-left">Categoria</th>
              <th className="py-4 text-center">Publicado</th>
              <th className="py-4 text-center">Video</th>
              <th className="py-4 text-right text-slate-400">Fecha</th>
              <th className="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-6 text-sm font-bold text-slate-700">{post.title}</td>
                <td className="py-3"><span className="bg-slate-100 px-2 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{post.category}</span></td>
                <td className="py-3 text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${post.published ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{post.published ? 'Si' : 'No'}</span></td>
                <td className="py-3 text-center">{post.videoUrl ? '🎥' : '-'}</td>
                <td className="py-3 text-right text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-6 text-right flex justify-end gap-2">
                  <button type="button" aria-label="Editar post" onClick={() => edit(post)} className="px-3 py-1.5 bg-sky-50 text-sky-500 rounded-lg text-[9px] font-black uppercase"><PencilIcon className="w-3 h-3" /></button>
                  <button type="button" aria-label="Eliminar post" onClick={() => remove(post.id)} className="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase"><TrashIcon className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlogEditor;
