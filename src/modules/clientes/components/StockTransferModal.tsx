import React, { useState } from 'react';
import { Product } from '../../../types/types';
import { ArrowPathIcon, XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { client } from '../../../api/client';

interface StockTransferModalProps {
  products: Product[];
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
  onNotify: (msg: string, type?: any) => void;
  isDarkMode?: boolean;
}

export default function StockTransferModal({ products, onClose, onSuccess, onNotify, isDarkMode }: StockTransferModalProps) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [fromBranch, setFromBranch] = useState('001');
  const [toBranch, setToBranch] = useState('002');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const branchStockMap = selectedProduct?.branchStock || { '001': selectedProduct?.stock || 0 };
  const availableInFrom = branchStockMap[fromBranch] || (fromBranch === '001' ? selectedProduct?.stock || 0 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      onNotify('Seleccione un producto para el traslado', 'warning');
      return;
    }

    if (fromBranch === toBranch) {
      onNotify('La sucursal de origen y destino no pueden ser la misma', 'error');
      return;
    }

    if (quantity <= 0) {
      onNotify('La cantidad a trasladar debe ser mayor a 0', 'warning');
      return;
    }

    if (quantity > availableInFrom) {
      onNotify(`Stock insuficiente en sucursal ${fromBranch}. Disponible: ${availableInFrom}`, 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await client.post('/api/products/transfer-stock', {
        productId: selectedProductId,
        fromBranch,
        toBranch,
        quantity
      });

      if (res.data && res.data.product) {
        onNotify(`Se trasladaron ${quantity} unidades de sucursal ${fromBranch} a sucursal ${toBranch}`, 'success');
        onSuccess(res.data.product);
        onClose();
      } else {
        onNotify('Error ejecutando la transferencia', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error en la transferencia de stock';
      onNotify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'} w-full max-w-lg rounded-[2.5rem] p-8 border shadow-2xl space-y-6 animate-in zoom-in-95 duration-300`}>
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-2xl">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg">Traslado de Inventario</h3>
              <p className="text-xs text-slate-400 font-bold">Mover stock entre locales o sucursales</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleccionar Producto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto a Trasladar</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.description} (Stock Total: {p.stock})
                </option>
              ))}
            </select>
          </div>

          {/* Origen y Destino */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucursal Origen (Sale)</label>
              <select
                value={fromBranch}
                onChange={e => setFromBranch(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="001">001 - Matriz Principal</option>
                <option value="002">002 - Sucursal Norte</option>
                <option value="003">003 - Sucursal Sur</option>
              </select>
              <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400">
                Disponible: {availableInFrom} unidades
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucursal Destino (Entra)</label>
              <select
                value={toBranch}
                onChange={e => setToBranch(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="001">001 - Matriz Principal</option>
                <option value="002">002 - Sucursal Norte</option>
                <option value="003">003 - Sucursal Sur</option>
              </select>
            </div>
          </div>

          {/* Cantidad a Trasladar */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad a Trasladar</label>
            <input
              type="number"
              min="1"
              max={availableInFrom}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl font-black text-base border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || availableInFrom <= 0}
              className="flex-1 py-3.5 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                'Ejecutar Traslado'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
