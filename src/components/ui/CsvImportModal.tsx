import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { DocumentArrowUpIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, any>[]) => Promise<void>;
  title: string;
  entityType: 'clientes' | 'productos';
  sampleData: Record<string, string>;
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport, title, entityType, sampleData }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setStep('upload');
    setRows([]);
    setErrors([]);
    setImportResult({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = Papa.parse<Record<string, any>>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });

        if (result.errors.length > 0) {
          setErrors([`Error en línea ${result.errors[0].row}: ${result.errors[0].message}`]);
          return;
        }

        const jsonData = result.data;

        if (jsonData.length === 0) {
          setErrors(['El archivo está vacío o no tiene datos válidos.']);
          return;
        }

        if (jsonData.length > 500) {
          setErrors(['El archivo tiene más de 500 filas. Divida el archivo en lotes más pequeños.']);
          return;
        }

        setRows(jsonData);
        setStep('preview');
      } catch {
        setErrors(['Error al leer el archivo. Verifique que sea un CSV válido.']);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      await onImport(rows);
      setImportResult({ success: rows.length, failed: 0 });
      setStep('done');
    } catch {
      setImportResult({ success: 0, failed: rows.length });
      setErrors(['Error al importar datos. Verifique la conexión e intente de nuevo.']);
      setStep('upload');
    }
  };

  const downloadSample = () => {
    const csv = Papa.unparse([sampleData]);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${entityType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar importador de CSV"
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${dragOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-slate-400'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <DocumentArrowUpIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-700 mb-2">Suelta tu archivo aquí</p>
                <p className="text-sm text-slate-500 mb-4">o haz clic para seleccionar</p>
                <span className="text-xs text-slate-400 bg-slate-100 px-4 py-2 rounded-full font-medium">CSV (.csv)</span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="bg-sky-50 rounded-2xl p-5 flex items-start gap-3">
                <ArrowDownTrayIcon className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-sky-700 mb-1">Descarga la plantilla</p>
                  <p className="text-xs text-sky-600 mb-3">Usa este formato para asegurar que los datos se importen correctamente.</p>
                  <button type="button" onClick={downloadSample} className="text-xs font-bold bg-sky-500 text-white px-4 py-2 rounded-xl hover:bg-sky-600 transition-colors">
                    Descargar Plantilla
                  </button>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-600 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />{e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-700">{rows.length} registros encontrados</p>
                  <p className="text-xs text-slate-400">{headers.length} columnas detectadas</p>
                </div>
                <button type="button" onClick={() => setStep('upload')} className="text-xs font-bold text-slate-500 hover:text-slate-700">
                  Cambiar archivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[400px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-[10px] font-black text-slate-400 uppercase">#</th>
                      {headers.slice(0, 8).map(h => (
                        <th key={h} className="p-3 text-left text-[10px] font-black text-slate-400 uppercase">{h}</th>
                      ))}
                      {headers.length > 8 && <th className="p-3 text-left text-[10px] font-black text-slate-400 uppercase">...</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-400 font-mono">{i + 1}</td>
                        {headers.slice(0, 8).map(h => (
                          <td key={h} className="p-3 text-slate-700 font-medium max-w-[150px] truncate">{String(row[h] ?? '')}</td>
                        ))}
                        {headers.length > 8 && <td className="p-3 text-slate-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50">
                    Mostrando 50 de {rows.length} registros
                  </div>
                )}
              </div>

              <button type="button"
                onClick={handleImport}
                className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-600 transition-all text-sm uppercase tracking-wider"
              >
                Importar {rows.length} {entityType}
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
              <p className="text-lg font-bold text-slate-700">Importando {rows.length} {entityType}...</p>
              <p className="text-sm text-slate-500 mt-2">Esto puede tomar unos segundos</p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-extrabold text-slate-900">Importación Completada</h3>
              <p className="text-slate-500">
                <span className="font-bold text-emerald-600">{importResult.success}</span> {entityType} importados exitosamente
              </p>
              <button type="button"
                onClick={handleClose}
                className="px-8 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
