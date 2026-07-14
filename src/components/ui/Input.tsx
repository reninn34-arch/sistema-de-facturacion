import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    // Genera un id estable para asociar el label con el input. Si el llamador
    // pasa su propio id, se respeta; si no, useId da uno único por instancia.
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              w-full rounded-lg border bg-white px-3 py-2.5
              text-sm text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              dark:bg-slate-800
              transition duration-150
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-300 dark:border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
