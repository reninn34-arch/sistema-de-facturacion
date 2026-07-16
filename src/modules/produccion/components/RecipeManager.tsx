import React, { useState, useEffect, useId } from 'react';
import { BeakerIcon, PlusIcon, TrashIcon, PencilIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Recipe, RecipeIngredient, Product, UNITS_OF_MEASURE } from '../../../types/types';
import { client } from '../../../api/client';

interface RecipeManagerProps {
  products: Product[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function RecipeManager({ products, onNotify }: RecipeManagerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const fieldId = useId();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formYield, setFormYield] = useState(1);
  // _key: id estable por fila para las keys de React (se añaden/eliminan filas)
  const [formIngredients, setFormIngredients] = useState<(RecipeIngredient & { _key?: string })[]>([
    { _key: crypto.randomUUID(), productId: '', quantity: 0, unitOfMeasure: 'kg', estimatedCost: 0 }
  ]);

  const fetchRecipes = async () => {
    try {
      const res = await client.get('/api/recipes');
      setRecipes(res.data.recipes || []);
    } catch (e) {
      onNotify('Error al cargar recetas', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecipes(); }, []);

  const openNewForm = () => {
    setEditingRecipe(null);
    setFormName('');
    setFormDescription('');
    setFormInstructions('');
    setFormProductId('');
    setFormYield(1);
    setFormIngredients([{ _key: crypto.randomUUID(), productId: '', quantity: 0, unitOfMeasure: 'kg', estimatedCost: 0 }]);
    setShowForm(true);
  };

  const openEditForm = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormDescription(recipe.description || '');
    setFormInstructions(recipe.instructions || '');
    setFormProductId(recipe.productId);
    setFormYield(recipe.yield);
    setFormIngredients(
      recipe.ingredients.map((ing) => ({
        _key: crypto.randomUUID(),
        productId: ing.productId,
        quantity: ing.quantity,
        unitOfMeasure: ing.unitOfMeasure || 'kg',
        estimatedCost: ing.estimatedCost || 0,
      }))
    );
    setShowForm(true);
  };

  const addIngredient = () => {
    setFormIngredients([...formIngredients, { _key: crypto.randomUUID(), productId: '', quantity: 0, unitOfMeasure: 'kg', estimatedCost: 0 }]);
  };

  const removeIngredient = (idx: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...formIngredients];
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      updated[idx] = { 
        ...updated[idx], 
        productId: value,
        unitOfMeasure: product?.unitOfMeasure || updated[idx].unitOfMeasure,
        estimatedCost: product ? (product.price || 0) : updated[idx].estimatedCost
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setFormIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formProductId || formIngredients.length === 0) {
      onNotify('Completa todos los campos requeridos', 'warning');
      return;
    }

    const payload = {
      name: formName,
      description: formDescription,
      instructions: formInstructions,
      productId: formProductId,
      yield: formYield,
      ingredients: formIngredients.filter((ing) => ing.productId && ing.quantity > 0),
    };

    try {
      if (editingRecipe) {
        await client.put(`/api/recipes/${editingRecipe.id}`, payload);
        onNotify('Receta actualizada correctamente');
      } else {
        await client.post('/api/recipes', payload);
        onNotify('Receta creada correctamente');
      }
      setShowForm(false);
      fetchRecipes();
    } catch (e: any) {
      onNotify(e.response?.data?.message || 'Error al guardar receta', 'warning');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta receta?')) return;
    try {
      await client.delete(`/api/recipes/${id}`);
      onNotify('Receta eliminada');
      fetchRecipes();
    } catch (e: any) {
      onNotify(e.response?.data?.message || 'Error al eliminar', 'warning');
    }
  };

  const getUnitLabel = (unit: string) => {
    return UNITS_OF_MEASURE.find((u) => u.value === unit)?.label || unit;
  };

  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <BeakerIcon className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recetas</h2>
                <p className="text-sm text-slate-500 font-bold">Gestiona las recetas y fórmulas de producción</p>
              </div>
            </div>
            <button type="button"
              onClick={openNewForm}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 inline-flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Nueva Receta
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-bold">Cargando recetas...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-16">
              <BeakerIcon className="w-16 h-16 mx-auto text-slate-200" />
              <p className="text-slate-400 font-bold mt-4">No hay recetas aún</p>
              <p className="text-sm text-slate-300 mt-1">Crea tu primera receta para empezar a controlar la producción</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase">Nombre</th>
                    <th className="text-left p-4 font-black text-slate-600 text-xs uppercase">Producto</th>
                    <th className="text-center p-4 font-black text-slate-600 text-xs uppercase">Rinde</th>
                    <th className="text-center p-4 font-black text-slate-600 text-xs uppercase">Ingredientes</th>
                    <th className="text-right p-4 font-black text-slate-600 text-xs uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => (
                    <tr key={recipe.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{recipe.name}</td>
                      <td className="p-4 text-slate-600 font-semibold">{recipe.product?.description || recipe.productName || '-'}</td>
                      <td className="p-4 text-center font-black text-amber-600">{recipe.yield} unid.</td>
                      <td className="p-4 text-center text-slate-500 font-semibold">{recipe.ingredients?.length || 0}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button type="button" aria-label="Editar receta" onClick={() => openEditForm(recipe)} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button type="button" aria-label="Eliminar receta" onClick={() => handleDelete(recipe.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RECIPE FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">
                    {editingRecipe ? 'Editar Receta' : 'Nueva Receta'}
                  </h3>
                  <button type="button" aria-label="Cerrar" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Nombre */}
                  <div>
                    <label htmlFor={`${fieldId}-name`} className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Nombre de la Receta *</label>
                    <input
                      id={`${fieldId}-name`}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ej: Pan de Chocolate"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-description`} className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Descripción</label>
                    <textarea
                      id={`${fieldId}-description`}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe brevemente la receta..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      rows={2}
                    />
                  </div>

                  {/* Producto y Rendimiento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`${fieldId}-product`} className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Producto Terminado *</label>
                      <select
                        id={`${fieldId}-product`}
                        value={formProductId}
                        onChange={(e) => setFormProductId(e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                        required
                      >
                        <option value="">Selecciona producto</option>
                        {(() => {
                          const list = [];
                          for (const p of safeProducts) {
                            if (p.type === 'FISICO' && !(p as any).isRawMaterial) {
                              list.push(p);
                            }
                          }
                          return list.map((p) => (
                            <option key={p.id} value={p.id}>{p.code} - {p.description} ({p.unitOfMeasure || 'u'})</option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${fieldId}-yield`} className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Rendimiento (unidades)</label>
                      <input
                        id={`${fieldId}-yield`}
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formYield}
                        onChange={(e) => setFormYield(parseFloat(e.target.value) || 1)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-instructions`} className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Instrucciones</label>
                    <textarea
                      id={`${fieldId}-instructions`}
                      value={formInstructions}
                      onChange={(e) => setFormInstructions(e.target.value)}
                      placeholder="Paso a paso de la preparación..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      rows={3}
                    />
                  </div>

                  {/* INGREDIENTES */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600 uppercase">Ingredientes</span>
                      <button
                        type="button"
                        onClick={addIngredient}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2 py-1"
                      >
                        + Agregar ingrediente
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formIngredients.map((ing, idx) => (
                        <div key={ing._key} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black text-slate-500 uppercase">Ingrediente #{idx + 1}</span>
                            {formIngredients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeIngredient(idx)}
                                className="text-xs text-red-400 hover:text-red-600 font-bold"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <select
                                aria-label="Ingrediente"
                                value={ing.productId}
                                onChange={(e) => updateIngredient(idx, 'productId', e.target.value)}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                required
                              >
                                <option value="">Selecciona insumo</option>
                                 {(() => {
                                   const list = [];
                                   for (const p of safeProducts) {
                                     if (p.type === 'FISICO') {
                                       list.push(p);
                                     }
                                   }
                                   return list.map((p) => (
                                     <option key={p.id} value={p.id}>
                                       {p.code} - {p.description} ({p.unitOfMeasure || 'N/D'}) - ${(p.price || 0).toFixed(2)}
                                     </option>
                                   ));
                                 })()}
                              </select>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={ing.quantity}
                                onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="Cantidad"
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                required
                              />
                            </div>
                            <div>
                              <select
                                aria-label="Unidad de medida"
                                value={ing.unitOfMeasure}
                                onChange={(e) => updateIngredient(idx, 'unitOfMeasure', e.target.value)}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              >
                                {UNITS_OF_MEASURE.map((u) => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                              {(() => {
                                const selectedProduct = safeProducts.find((p) => p.id === ing.productId);
                                if (selectedProduct && ing.unitOfMeasure && selectedProduct.unitOfMeasure && ing.unitOfMeasure !== selectedProduct.unitOfMeasure) {
                                  return (
                                    <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                                      <ExclamationTriangleIcon className="w-3 h-3" />
                                      Unidad del producto: {selectedProduct.unitOfMeasure}
                                    </p>
                                  );
                                }
                                if (selectedProduct && selectedProduct.unitOfMeasure) {
                                  return (
                                    <p className="text-[10px] font-bold text-emerald-500 mt-1">
                                      Unidad del producto: {selectedProduct.unitOfMeasure}
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                  >
                    {editingRecipe ? 'Actualizar Receta' : 'Crear Receta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
