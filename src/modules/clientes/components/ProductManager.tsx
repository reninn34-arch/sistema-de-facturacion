
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../../types/types';
import { TAX_RATES, PRODUCT_CATEGORIES } from '../../../constants';
import { CameraIcon } from '@heroicons/react/24/outline';

interface ProductManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onNotify: (msg: string, type?: any) => void;
  isDemoMode: boolean;
}

// URL del backend
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const ProductManager: React.FC<ProductManagerProps> = ({ products, setProducts, onNotify, isDemoMode }) => {
  // Detectar modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Escuchar cambios en la clase 'dark' del documento
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    
    // Estado inicial
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    return () => observer.disconnect();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({ taxRate: 15, type: 'FISICO', category: 'Otros' });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProd(product);
      setFormData(product);
    } else {
      setEditingProd(null);
      setFormData({ 
        taxRate: 15, 
        type: 'FISICO', 
        category: 'Otros', 
        imageUrl: '', 
        price: 0, 
        wholesalePrice: 0, 
        distributorPrice: 0,
        stock: 0,
        minStock: 0,
        code: ''
      });
    }
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.description || !formData.code) {
      onNotify("Descripción y Código son obligatorios", "error");
      return;
    }
    
    // MODO DEMO: Guardado local
    if (isDemoMode) {
      if (editingProd) {
        const updatedProd = { ...editingProd, ...formData } as Product;
        setProducts(products.map(p => p.id === editingProd.id ? updatedProd : p));
        onNotify("Producto actualizado (Modo Demo)");
      } else {
        const newProd = { 
          ...formData, 
          id: Math.random().toString(),
          price: Number(formData.price) || 0,
          wholesalePrice: Number(formData.wholesalePrice) || 0,
          distributorPrice: Number(formData.distributorPrice) || 0,
          taxRate: Number(formData.taxRate) || 15,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 0,
          imageUrl: formData.imageUrl || '',
          category: formData.category || 'Otros'
        } as Product;
        setProducts([newProd, ...products]);
        onNotify("Producto creado (Modo Demo)");
      }
      setShowModal(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      if (editingProd) {
        // UPDATE
        const response = await fetch(`${API_URL}/api/products/${editingProd.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error actualizando producto');
        const updatedProd = await response.json();

        setProducts(products.map(p => p.id === editingProd.id ? updatedProd : p));
        onNotify("Producto actualizado en base de datos");
      } else {
        // CREATE
        const response = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price) || 0,
            wholesalePrice: Number(formData.wholesalePrice) || 0,
            distributorPrice: Number(formData.distributorPrice) || 0,
            taxRate: Number(formData.taxRate) || 15,
            stock: Number(formData.stock) || 0,
            minStock: Number(formData.minStock) || 0,
            imageUrl: formData.imageUrl || '',
            category: formData.category || 'Otros'
          })
        });

        if (!response.ok) throw new Error('Error creando producto');
        const newProd = await response.json();

        setProducts([newProd, ...products]);
        onNotify("Producto registrado en base de datos");
      }
      setShowModal(false);
    } catch (error) {
      console.error(error);
      onNotify("Error conectando con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este producto del inventario?")) {
      if (isDemoMode) {
        setProducts(products.filter(p => p.id !== id));
        onNotify("Producto eliminado (Modo Demo)");
        return;
      }

      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Error eliminando');
        
        setProducts(products.filter(p => p.id !== id));
        onNotify("Producto eliminado");
      } catch (error) {
        onNotify("Error al eliminar del servidor", "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'} tracking-tight`}>Catálogo de Suministros</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase tracking-widest mt-1`}>Gestión de stock y tarifas multitarifa</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
          + Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {(Array.isArray(products) ? products : []).map(p => (
          <div key={p.id} className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-2xl transition-all group relative`}>
            {p.isSynced && (
              <div className="absolute top-4 right-4 z-10" title={`Sincronizado: ${p.lastSync}`}>
                <span className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg shadow-emerald-200 animate-pulse">☁️</span>
              </div>
            )}
            <div className="h-48 relative bg-slate-50 border-b border-slate-50">
              <img src={p.imageUrl || 'https://placehold.co/400x300?text=Producto'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4">
                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.type === 'FISICO' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                   {p.type}
                 </span>
              </div>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <p className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>{p.category}</p>
                <h4 className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-800'} text-lg leading-tight mt-1`}>{p.description}</h4>
                <p className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mt-1`}>SKU: {p.code}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50">
                <div className="text-center">
                  <p className={`text-[8px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1`}>Público</p>
                  <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${p.price.toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-slate-50">
                  <p className="text-[8px] font-black text-indigo-500 uppercase mb-1">Mayorista</p>
                  <p className="text-xs font-black text-indigo-700">${p.wholesalePrice?.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-indigo-500 uppercase mb-1">Distrib.</p>
                  <p className="text-xs font-black text-indigo-700">${p.distributorPrice?.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                    Stock: {p.stock}
                  </span>
                  {p.isSynced && <span className={`text-[8px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase mt-1`}>Web Linked</span>}
                </div>
                <button onClick={() => handleOpenModal(p)} className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'} p-3 rounded-xl text-[10px] font-black uppercase transition-all`}>
                  Editar Ficha
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[110] p-4 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-[3.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col md:flex-row max-h-[90vh]`}>
            
            <div className={`w-full md:w-80 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'} p-10 flex flex-col items-center justify-center border-r`}>
              <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-6 text-center`}>Imagen del Producto</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden group relative hover:border-indigo-400 transition-all shadow-inner"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                ) : (
                  <div className="text-center p-4">
                    <CameraIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Subir Foto</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              
              {formData.isSynced && (
                <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl w-full text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sincronizado con Tienda</p>
                  <p className="text-[8px] text-emerald-400 mt-1">{formData.lastSync}</p>
                </div>
              )}
            </div>

            <div className="flex-1 p-12 overflow-y-auto">
              <div className="flex justify-between items-start mb-10">
                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>Ficha Técnica</h4>
                <div className="flex gap-2">
                   <button onClick={() => setFormData({...formData, type: 'FISICO'})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'FISICO' ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-400')}`}>Físico</button>
                   <button onClick={() => setFormData({...formData, type: 'SERVICIO'})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SERVICIO' ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-400')}`}>Servicio</button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Nombre / Descripción</label>
                    <input value={formData.description} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all`} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ej: Laptop Dell Inspiron..." />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Código SKU / Barra</label>
                    <input value={formData.code} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all`} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ej: LP-001" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Categoría</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Impuesto IVA</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all appearance-none" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}>
                      {TAX_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Stock Actual</label>
                    <input type="number" value={formData.stock} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all`} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-6">Configuración Multitarifa ($)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-400'} uppercase ml-1`}>PVP Público</label>
                      <input type="number" step="0.01" value={formData.price} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} uppercase ml-1`}>Precio Mayorista</label>
                      <input type="number" step="0.01" value={formData.wholesalePrice} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, wholesalePrice: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} uppercase ml-1`}>Distribuidor</label>
                      <input type="number" step="0.01" value={formData.distributorPrice} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, distributorPrice: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowModal(false)} className={`flex-1 py-5 font-black ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} uppercase text-[10px] tracking-widest transition-colors`}>Descartar</button>
                  <button onClick={handleSave} disabled={loading} className={`flex-[2] py-5 font-black bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? 'Guardando...' : (editingProd ? 'Actualizar Ficha' : 'Registrar Producto')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
