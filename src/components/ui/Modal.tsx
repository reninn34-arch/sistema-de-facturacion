import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer, size = 'md' }) => {
  // Guardamos onClose en un ref para que el listener de teclado siempre
  // llame a la versión más reciente de la prop sin necesitar re-suscribirse.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Ventana modal'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in"
    >
      {/* Fondo clicable: botón nativo (semántica, foco y teclado incluidos) */}
      <button
        type="button"
        aria-label="Cerrar modal"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm cursor-default"
      />
      <div className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-black/40 max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
