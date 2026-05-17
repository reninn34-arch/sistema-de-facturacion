import React from 'react';
import { ExclamationTriangleIcon, HandRaisedIcon, ArrowPathRoundedSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const EnvironmentModal: React.FC<EnvironmentModalProps> = ({ isOpen, onClose, onConfirm, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="relative pt-8 pb-4 px-8 text-center flex flex-col items-center justify-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <ExclamationTriangleIcon className="w-16 h-16 text-emerald-500 mb-4" />
          <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-500 mb-2">¡Advertencia!</h2>
          <p className="text-slate-800 dark:text-white font-bold text-lg">
            Vas a cambiar a ambiente de producción. Lee esto con atención.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="flex flex-col items-center text-center p-4 border-r-0 md:border-r border-slate-200 dark:border-slate-700/50">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <HandRaisedIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Solicita primero la autorización del SRI para usar el ambiente de producción.
              </p>
              <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-2 hover:underline">
                Conocer más →
              </a>
            </div>

            <div className="flex flex-col items-center text-center p-4 border-r-0 md:border-r border-slate-200 dark:border-slate-700/50">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <ArrowPathRoundedSquareIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                No podrás volver al ambiente de pruebas.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Se eliminarán los comprobantes generados de prueba, ya que no tienen validez.
              </p>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row gap-4 justify-center items-center">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full md:w-auto px-8 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-full font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Sí, cambiar de ambiente a producción'}
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full md:w-auto px-12 py-4 bg-[#0d4f3b] hover:bg-[#0a3d2e] text-white rounded-full font-bold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentModal;
