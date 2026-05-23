
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../../types/types';
import { TAX_RATES, PRODUCT_CATEGORIES } from '../../../constants';
import { CameraIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import CsvImportModal from '../../../components/ui/CsvImportModal';

type InventoryTab = 'all' | 'raw' | 'finished' | 'service';

interface ProductManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onNotify: (msg: string, type?: any) => void;
  isDemoMode: boolean;
  businessType?: string;
  isProduction?: boolean;
}

// URL del backend
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ProductManager: React.FC<ProductManagerProps> = ({ products, setProducts, onNotify, isDemoMode, businessType, isProduction }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');

  const showProductionTabs = isProduction || businessType === 'BAKERY' || businessType === 'RESTAURANT';

  const filteredProducts = showProductionTabs
    ? (Array.isArray(products) ? products : []).filter(p => {
        if (activeTab === 'all') return true;
        if (activeTab === 'raw') return p.isRawMaterial === true && p.type === 'FISICO';
        if (activeTab === 'finished') return p.type === 'FISICO' && !p.isRawMaterial;
        if (activeTab === 'service') return p.type === 'SERVICIO';
        return true;
      })
    : (Array.isArray(products) ? products : []);

  const tabCounts = {
    all: (Array.isArray(products) ? products : []).length,
    raw: (Array.isArray(products) ? products : []).filter(p => p.isRawMaterial === true && p.type === 'FISICO').length,
    finished: (Array.isArray(products) ? products : []).filter(p => p.type === 'FISICO' && !p.isRawMaterial).length,
    service: (Array.isArray(products) ? products : []).filter(p => p.type === 'SERVICIO').length,
  };

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
  const [formData, setFormData] = useState<Partial<Product>>({ taxRate: 15, type: 'FISICO', category: 'Otros', unitOfMeasure: 'UNIDAD', isRawMaterial: false });
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
        unitOfMeasure: 'UNIDAD',
        isRawMaterial: false,
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

  const handleBulkImportProducts = async (rows: Record<string, any>[]) => {
    if (isDemoMode) {
      const newProducts = rows.map((r, i) => ({
        id: `imp-${Date.now()}-${i}`,
        code: String(r.codigo || r.code || r.Codigo || `P${i + 1}`).trim(),
        description: String(r.descripcion || r.description || r.Descripcion || `Producto ${i + 1}`).trim(),
        price: parseFloat(r.precio || r.price || r.Precio || 0) || 0,
        wholesalePrice: parseFloat(r.precio_mayorista || r.wholesalePrice || 0) || 0,
        distributorPrice: parseFloat(r.precio_distribuidor || r.distributorPrice || 0) || 0,
        stock: parseInt(r.stock || r.Stock || 0) || 0,
        minStock: parseInt(r.stock_minimo || r.minStock || 0) || 0,
        taxRate: parseInt(r.iva || r.taxRate || 15) || 15,
        type: 'BIEN',
        category: 'Otros',
        isRawMaterial: false,
        unitOfMeasure: 'UNIDAD'
      } as Product));
      setProducts([...newProducts, ...products]);
      onNotify(`${newProducts.length} productos importados (Modo Demo)`);
      return;
    }

    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/api/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ products: rows })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error al importar');

    const prodResponse = await fetch(`${API_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (prodResponse.ok) {
      const refreshed = await prodResponse.json();
      setProducts(refreshed);
    }

    onNotify(`${data.success} productos importados exitosamente${data.failed > 0 ? `, ${data.failed} errores` : ''}`);
  };

  const productSampleData = {
    codigo: 'PROD-001',
    descripcion: 'Producto Ejemplo',
    precio: 10.50,
    precio_mayorista: 8.00,
    precio_distribuidor: 6.50,
    stock: 100,
    stock_minimo: 10,
    iva: 15,
    tipo: 'BIEN',
    categoria: 'Otros',
    unidad: 'UNIDAD'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'} tracking-tight`}>Catálogo de Suministros</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase tracking-widest mt-1`}>Gestión de stock y tarifas multitarifa</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImportModal(true)} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Importar
          </button>
          <button onClick={() => handleOpenModal()} className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
            + Nuevo Producto
          </button>
        </div>
      </div>

      {showProductionTabs && (
        <div className={`flex flex-wrap gap-2 p-1.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl`}>
          {([
            { key: 'all' as InventoryTab, label: 'Todos', emoji: '📋' },
            { key: 'raw' as InventoryTab, label: 'Materia Prima', emoji: '🌾' },
            { key: 'finished' as InventoryTab, label: 'Productos', emoji: '📦' },
            { key: 'service' as InventoryTab, label: 'Servicios', emoji: '⚡' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-lg shadow-sky-100/50'
                  : `${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key
                  ? 'bg-slate-100 text-slate-600'
                  : `${isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map(p => (
          <div key={p.id} className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-2xl transition-all group relative`}>
            {p.isSynced && (
              <div className="absolute top-4 right-4 z-10" title={`Sincronizado: ${p.lastSync}`}>
                <span className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg shadow-emerald-200 animate-pulse">☁️</span>
              </div>
            )}
            <div className="h-48 relative bg-slate-50 border-b border-slate-50">
              <img src={p.imageUrl || 'https://placehold.co/400x300?text=Producto'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4 flex gap-1.5">
                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.type === 'FISICO' ? 'bg-sky-500 text-white' : 'bg-amber-500 text-white'}`}>
                   {p.type}
                 </span>
                 {p.isRawMaterial && (
                   <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-300">
                     Insumo
                   </span>
                 )}
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
                  <p className="text-[8px] font-black text-sky-500 uppercase mb-1">Mayorista</p>
                  <p className="text-xs font-black text-sky-500">${p.wholesalePrice?.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-sky-500 uppercase mb-1">Distrib.</p>
                  <p className="text-xs font-black text-sky-500">${p.distributorPrice?.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                    Stock: {p.stock}{p.unitOfMeasure ? ` ${p.unitOfMeasure}` : ''}
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
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className={`text-5xl mb-4 ${isDarkMode ? 'opacity-30' : 'opacity-20'}`}>
              {activeTab === 'raw' ? '🌾' : activeTab === 'finished' ? '📦' : activeTab === 'service' ? '⚡' : '📋'}
            </p>
            <p className={`text-lg font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              {activeTab === 'raw' ? 'Sin materia prima' : activeTab === 'finished' ? 'Sin productos terminados' : activeTab === 'service' ? 'Sin servicios' : 'Sin productos'}
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} mt-1`}>
              {activeTab === 'all' ? 'Crea tu primer producto con el botón "Nuevo Producto"' : 'Cambia de pestaña o crea uno nuevo'}
            </p>
          </div>
        )}
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
                   <button onClick={() => setFormData({...formData, type: 'FISICO'})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'FISICO' ? 'bg-sky-500 text-white' : (isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-400')}`}>Físico</button>
                   <button onClick={() => setFormData({...formData, type: 'SERVICIO'})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SERVICIO' ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-400')}`}>Servicio</button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Nombre / Descripción</label>
                    <input value={formData.description} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all`} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ej: Laptop Dell Inspiron..." />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Código SKU / Barra</label>
                    <input value={formData.code} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all`} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ej: LP-001" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Categoría</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Impuesto IVA</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all appearance-none" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}>
                      {TAX_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Stock Actual{formData.unitOfMeasure ? ` (${formData.unitOfMeasure})` : ''}</label>
                    <input type="number" value={formData.stock} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all`} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                  </div>
                </div>

                {showProductionTabs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest ml-1`}>Unidad de Medida</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all appearance-none" value={formData.unitOfMeasure || 'UNIDAD'} onChange={e => setFormData({...formData, unitOfMeasure: e.target.value})}>
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="g">Gramo (g)</option>
                      <option value="lb">Libra (lb)</option>
                      <option value="oz">Onza (oz)</option>
                      <option value="t">Tonelada (t)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="L">Litro (L)</option>
                      <option value="UNIDAD">Unidad</option>
                    </select>
                  </div>
                  {showProductionTabs && (
                  <div className="space-y-2 flex items-end">
                    <label className={`flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-amber-50 transition-all w-full ${formData.isRawMaterial ? 'border-2 border-amber-500' : 'border-2 border-transparent'}`}>
                      <input type="checkbox" checked={formData.isRawMaterial || false} onChange={e => setFormData({...formData, isRawMaterial: e.target.checked})} className="w-5 h-5 rounded accent-amber-600" />
                      <div>
                        <span className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Es Materia Prima / Insumo</span>
                        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>Se usará como ingrediente en recetas</p>
                      </div>
                    </label>
                  </div>
                  )}
                </div>
                )}

                <div className="p-8 bg-sky-50/50 rounded-[2.5rem] border border-sky-100">
                  <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-6">Configuración Multitarifa ($)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-400'} uppercase ml-1`}>PVP Público</label>
                      <input type="number" step="0.01" value={formData.price} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-sky-400' : 'text-sky-500'} uppercase ml-1`}>Precio Mayorista</label>
                      <input type="number" step="0.01" value={formData.wholesalePrice} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, wholesalePrice: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[9px] font-black ${isDarkMode ? 'text-sky-400' : 'text-sky-500'} uppercase ml-1`}>Distribuidor</label>
                      <input type="number" step="0.01" value={formData.distributorPrice} className={`w-full p-4 ${isDarkMode ? 'bg-slate-700 text-white border-slate-500' : 'bg-white'} rounded-2xl font-black outline-none border focus:ring-2 focus:ring-blue-500 transition-all`} onChange={e => setFormData({...formData, distributorPrice: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowModal(false)} className={`flex-1 py-5 font-black ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} uppercase text-[10px] tracking-widest transition-colors`}>Descartar</button>
                  <button onClick={handleSave} disabled={loading} className={`flex-[2] py-5 font-black bg-sky-500 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? 'Guardando...' : (editingProd ? 'Actualizar Ficha' : 'Registrar Producto')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImportProducts}
        title="Importar Productos"
        entityType="productos"
        sampleData={productSampleData}
      />
    </div>
  );
};

export default ProductManager;
