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
  const dialogRef = useRef<HTMLDialogElement>(null);

  // El componente solo está montado cuando open=true; al montar abrimos el
  // <dialog> nativo en modo modal, que trae gratis el atrapado de foco,
  // el cierre con Escape y el ::backdrop.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title || 'Ventana modal'}
      // Escape dispara "cancel": lo interceptamos para que el estado de React
      // (prop `open`) siga siendo la única fuente de verdad.
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // Los clics sobre el ::backdrop llegan con target = el propio <dialog>;
      // los clics dentro del contenido llegan con target = el hijo.
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className={`w-full ${sizeClasses[size]} m-auto p-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-black/40 max-h-[90vh] open:flex flex-col animate-scale-in backdrop:bg-black/50 backdrop:backdrop-blur-sm`}
    >
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
    </dialog>
  );
};

export default Modal;
