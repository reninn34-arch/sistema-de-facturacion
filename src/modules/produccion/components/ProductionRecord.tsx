import React, { useState, useEffect } from 'react';
import { ClipboardDocumentCheckIcon, PlayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Recipe, ProductionRecord as ProdRecord, Product, UNITS_OF_MEASURE } from '../../../types/types';
import { client } from '../../../api/client';

interface ProductionRecordProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function ProductionRecord({ products, setProducts, onNotify }: ProductionRecordProps) {
  const [records, setRecords] = useState<ProdRecord[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [productionQty, setProductionQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const fetchData = async () => {
    try {
      const [prodRes, recipeRes] = await Promise.all([
        client.get('/api/production'),
        client.get('/api/recipes'),
      ]);
      setRecords(prodRes.data.records || []);
      setRecipes(recipeRes.data.recipes || []);
    } catch (e) {
      onNotify('Error al cargar datos de producción', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getUnitLabel = (unit: string) => {
    return UNITS_OF_MEASURE.find((u) => u.value === unit)?.label || unit;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeId || productionQty <= 0) {
      onNotify('Selecciona una receta y cantidad válida', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/api/production', {
        recipeId: selectedRecipeId,
        quantity: productionQty,
        notes,
      });

      onNotify(res.data.message || 'Producción registrada correctamente');

      setSelectedRecipeId('');
      setProductionQty(1);
      setNotes('');
      setShowForm(false);
      fetchData();

      try {
        const productsRes = await client.get('/api/products');
        setProducts(productsRes.data || []);
      } catch (e) { /* silent */ }
    } catch (e: any) {
      onNotify(e.response?.data?.message || 'Error al registrar producción', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const totalEstimatedCost = selectedRecipe
    ? selectedRecipe.ingredients.reduce((sum, ing) => sum + (ing.estimatedCost || 0) * productionQty, 0)
    : 0;

  const producedUnits = selectedRecipe ? productionQty * (selectedRecipe.yield || 1) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <ClipboardDocumentCheckIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Producción</h2>
                <p className="text-sm text-slate-500 font-bold">Registra lotes de producción y controla el consumo de insumos</p>
              </div>
            </div>
            <button type="button"
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" /> Registrar Producción
            </button>
          </div>

          {/* PRODUCTION FORM */}
          {showForm && (
            <div className="mb-8 bg-emerald-50/50 rounded-[2rem] p-6 border-2 border-emerald-100">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Receta *</label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => setSelectedRecipeId(e.target.value)}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      required
                    >
                      <option value="">Selecciona una receta</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.product?.description || r.productName || 'Sin producto'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Cantidad de Lotes</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={productionQty}
                      onChange={(e) => setProductionQty(parseFloat(e.target.value) || 1)}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* PREVIEW */}
                {selectedRecipe && (
                  <div className="bg-white rounded-2xl p-5 border border-emerald-100 space-y-4">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Vista Previa de Producción</h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Unidades a producir</p>
                        <p className="text-2xl font-black text-emerald-700">{producedUnits}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Costo estimado total</p>
                        <p className="text-2xl font-black text-amber-700">${totalEstimatedCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-sky-50 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-sky-500 uppercase mb-1">Costo por unidad</p>
                        <p className="text-2xl font-black text-sky-500">
                          ${producedUnits > 0 ? (totalEstimatedCost / producedUnits).toFixed(4) : '0.00'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Ingredientes</p>
                        <p className="text-2xl font-black text-slate-700">{selectedRecipe.ingredients?.length || 0}</p>
                      </div>
                    </div>

                    {selectedRecipe && (() => {
                      const product = (Array.isArray(products) ? products : []).find(p => p.id === selectedRecipe.productId);
                      const currentStock = product?.stock ?? 0;
                      const afterStock = currentStock + producedUnits;
                      return (
                        <div className={`rounded-xl p-4 flex items-center justify-between ${currentStock <= 0 ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-50'}`}>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Stock actual del producto</p>
                            <p className="text-sm font-bold text-slate-700 mt-0.5">
                              {product?.description || selectedRecipe.product?.description || 'Producto terminado'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-black ${currentStock <= 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                              {currentStock}{product?.unitOfMeasure ? ` ${product.unitOfMeasure}` : ''}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                              {currentStock <= 0
                                ? `+${producedUnits} tras producir → ${afterStock}${product?.unitOfMeasure ? ` ${product.unitOfMeasure}` : ''}`
                                : `${currentStock} → ${afterStock} (+${producedUnits})${product?.unitOfMeasure ? ` ${product.unitOfMeasure}` : ''}`}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Insumos a consumir</h5>
                      <div className="space-y-1.5">
                        {selectedRecipe.ingredients?.map((ing, idx) => {
                          const safeProducts = Array.isArray(products) ? products : [];
                          const product = safeProducts.find((p) => p.id === ing.productId);
                          const requiredQty = ing.quantity * productionQty;
                          const hasStock = product && (product.stock || 0) >= requiredQty;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                                hasStock ? 'bg-slate-50' : 'bg-red-50'
                              }`}
                            >
                              <span className="font-bold text-slate-700">
                                {ing.product?.description || product?.description || ing.productCode || 'Insumo'}
                              </span>
                              <span className="text-slate-500 font-semibold">
                                {requiredQty.toFixed(3)} {getUnitLabel(ing.unitOfMeasure)}
                                <span className={`ml-2 inline-flex items-center gap-1 text-[10px] ${hasStock ? 'text-slate-400' : 'text-red-500'}`}>
                                  {!hasStock && <ExclamationTriangleIcon className="w-4 h-4" />}
                                  (disp: {product?.stock || 0}{product?.unitOfMeasure ? ` ${product.unitOfMeasure}` : ''})
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Notas</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones del lote de producción..."
                    className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedRecipeId}
                    className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
                  >
                    {submitting ? 'Registrando...' : 'Registrar Producción'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* HISTORY TABLE */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-bold">Cargando historial...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-slate-200" />
              <p className="text-slate-400 font-bold mt-4">Sin registros de producción</p>
              <p className="text-sm text-slate-300 mt-1">Registra tu primera producción para ver el historial</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase">Fecha</th>
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase">Receta</th>
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase">Producto</th>
                    <th className="text-center p-4 font-black text-slate-600 text-xs uppercase">Lotes</th>
                    <th className="text-center p-4 font-black text-slate-600 text-xs uppercase">Unidades</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase">Costo Total</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase">Costo Unit.</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-600">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{rec.recipe?.name || rec.recipeName || '-'}</td>
                      <td className="p-4 text-slate-600 font-semibold">
                        {rec.recipe?.product?.description || rec.productName || '-'}
                      </td>
                      <td className="p-4 text-center font-black text-slate-700">{rec.quantity}</td>
                      <td className="p-4 text-center font-black text-emerald-600">{rec.producedUnits}</td>
                      <td className="p-4 text-right font-black text-amber-600">${rec.totalCost?.toFixed(2) || '0.00'}</td>
                      <td className="p-4 text-right font-black text-sky-500">${rec.unitCost?.toFixed(4) || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
