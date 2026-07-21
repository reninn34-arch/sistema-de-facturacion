import React, { useState, useId } from 'react';
import { XMarkIcon, BanknotesIcon, CreditCardIcon, ArrowPathIcon, CheckCircleIcon, PrinterIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { BusinessInfo } from '../../../types/types';

interface CashClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo: BusinessInfo;
  tickets: any[];
  onNotify: (msg: string, type?: any) => void;
}

export default function CashClosingModal({ isOpen, onClose, businessInfo, tickets = [], onNotify }: CashClosingModalProps) {
  const fieldId = useId();
  const [initialCash, setInitialCash] = useState<number | ''>(50);
  const [countedCash, setCountedCash] = useState<number | ''>('');
  const [countedCard, setCountedCard] = useState<number | ''>('');
  const [countedTransfer, setCountedTransfer] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  if (!isOpen) return null;

  // Calcular ventas registradas en el turno por método de pago
  const validTickets = tickets.filter(t => t.status !== 'ANULADA');
  const systemCashSales = validTickets
    .filter(t => t.paymentMethod === 'EFECTIVO' || !t.paymentMethod)
    .reduce((acc, t) => acc + (t.total || 0), 0);

  const systemCardSales = validTickets
    .filter(t => t.paymentMethod === 'TARJETA')
    .reduce((acc, t) => acc + (t.total || 0), 0);

  const systemTransferSales = validTickets
    .filter(t => t.paymentMethod === 'TRANSFERENCIA')
    .reduce((acc, t) => acc + (t.total || 0), 0);

  const totalSystemSales = systemCashSales + systemCardSales + systemTransferSales;
  const expectedCashInBox = (Number(initialCash) || 0) + systemCashSales;

  const actualCash = Number(countedCash) || 0;
  const actualCard = Number(countedCard) || 0;
  const actualTransfer = Number(countedTransfer) || 0;

  const cashDiff = actualCash - expectedCashInBox;
  const cardDiff = actualCard - systemCardSales;
  const transferDiff = actualTransfer - systemTransferSales;

  const totalDiff = cashDiff + cardDiff + transferDiff;

  const handleProcessClosing = (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosed(true);
    onNotify('Arqueo y cierre de caja procesado exitosamente', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700 overflow-hidden my-8">
        
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <BanknotesIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Arqueo y Cierre de Caja</h3>
              <p className="text-xs text-slate-400 font-bold">Cuadre diario de ventas y conteo de efectivo</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar modal arqueo" onClick={onClose} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {!isClosed ? (
          <form onSubmit={handleProcessClosing} className="p-6 space-y-6">
            
            {/* Resumen del sistema */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Efectivo Sistema</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">${systemCashSales.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">+ Base $${Number(initialCash || 0).toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tarjetas Sistema</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">${systemCardSales.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Transf. Sistema</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">${systemTransferSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Ingrese conteo físico */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Conteo Físico Real en Caja</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Fondo Inicial */}
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-initialCash`} className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Fondo Inicial ($)</label>
                  <input
                    id={`${fieldId}-initialCash`}
                    type="number"
                    step="0.01"
                    value={initialCash}
                    onChange={e => setInitialCash(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
                  />
                </div>

                {/* Efectivo Contado */}
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-countedCash`} className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Efectivo Físico ($)</label>
                  <input
                    id={`${fieldId}-countedCash`}
                    type="number"
                    step="0.01"
                    placeholder={`Esperado: $${expectedCashInBox.toFixed(2)}`}
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
                    required
                  />
                </div>

                {/* Tarjetas / Bauches */}
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-countedCard`} className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Bauches Tarjetas ($)</label>
                  <input
                    id={`${fieldId}-countedCard`}
                    type="number"
                    step="0.01"
                    placeholder={`Esperado: $${systemCardSales.toFixed(2)}`}
                    value={countedCard}
                    onChange={e => setCountedCard(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
                  />
                </div>

              </div>
            </div>

            {/* Cálculo de diferencias */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-500 uppercase block">Resultado del Arqueo</span>
                <span className="text-xs text-slate-400 font-bold">Ventas Totales: ${totalSystemSales.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${totalDiff === 0 ? 'text-emerald-500' : totalDiff > 0 ? 'text-sky-500' : 'text-rose-500'}`}>
                  {totalDiff === 0 ? '✓ Cuadre Exacto' : totalDiff > 0 ? `+ $${totalDiff.toFixed(2)} Sobrante` : `- $${Math.abs(totalDiff).toFixed(2)} Faltante`}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-1">
              <label htmlFor={`${fieldId}-notes`} className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Observaciones del Cierre</label>
              <textarea
                id={`${fieldId}-notes`}
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Novedades del turno o justificación de diferencias..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-bold outline-none focus:border-sky-500"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                <CheckCircleIcon className="w-5 h-5" /> Finalizar y Cerrar Caja
              </button>
            </div>

          </form>
        ) : (
          /* Reporte del Cierre listo para imprimir */
          <div className="p-8 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
                <h4 className="font-black text-lg text-slate-800 dark:text-white uppercase">{businessInfo.name}</h4>
                <p className="text-xs text-slate-400 font-bold">COMPROBANTE DE ARQUEO Y CIERRE DE CAJA</p>
                <p className="text-[10px] text-slate-400">{new Date().toLocaleString('es-EC')}</p>
              </div>

              <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between"><span>Base Inicial Caja:</span><span>${Number(initialCash || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Efectivo:</span><span>${systemCashSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Tarjeta:</span><span>${systemCardSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Transferencia:</span><span>${systemTransferSales.toFixed(2)}</span></div>
                <div className="flex justify-between font-black text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>TOTAL INGRESOS TURNO:</span><span>${totalSystemSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400 pt-1">
                  <span>EFECTIVO REAL EN CAJA:</span><span>${actualCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1">
                  <span>DIFERENCIA TOTAL:</span>
                  <span className={totalDiff === 0 ? 'text-emerald-500' : totalDiff > 0 ? 'text-sky-500' : 'text-rose-500'}>
                    {totalDiff === 0 ? '$0.00 (Cuadrado)' : totalDiff > 0 ? `+$${totalDiff.toFixed(2)}` : `-$${Math.abs(totalDiff).toFixed(2)}`}
                  </span>
                </div>
                {notes && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px] italic text-slate-500">
                    Notas: {notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => window.print()} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-2xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                <PrinterIcon className="w-4 h-4" /> Imprimir Comprobante
              </button>
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-xs uppercase transition-colors shadow-lg">
                Aceptar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
