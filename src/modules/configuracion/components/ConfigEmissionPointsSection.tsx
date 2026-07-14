import React from 'react';
import { EmissionPoint } from '../../../types/types';

interface ConfigEmissionPointsSectionProps {
  emissionPoints: EmissionPoint[];
  selectedEmissionPoint: EmissionPoint | null;
  currentPlanMaxEmissionPoints: number;
  setEmissionPoints: React.Dispatch<React.SetStateAction<EmissionPoint[]>>;
  setSelectedEmissionPoint: React.Dispatch<React.SetStateAction<EmissionPoint | null>>;
  showNotify: (msg: string, type?: any) => void;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ConfigEmissionPointsSection: React.FC<ConfigEmissionPointsSectionProps> = ({
  emissionPoints, selectedEmissionPoint, currentPlanMaxEmissionPoints,
  setEmissionPoints, setSelectedEmissionPoint, showNotify
}) => {
  const handleAddEmissionPoint = async () => {
    const code = prompt('Código del establecimiento (ej: 001):', '001');
    if (!code) return;
    const ptCode = prompt('Código del punto de emisión (ej: 002):', String(emissionPoints.length + 1).padStart(3, '0'));
    if (!ptCode) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/emission-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ establishmentCode: code, emissionPointCode: ptCode, description: `Punto ${ptCode}` })
      });
      const data = await res.json();
      if (res.ok) {
        setEmissionPoints(prev => [...prev, data]);
        showNotify('Punto de emisión agregado');
      } else {
        showNotify(data.message || 'Error', 'error');
      }
    } catch { showNotify('Error de conexión', 'error'); }
  };

  const handleDeleteEmissionPoint = async (ep: EmissionPoint) => {
    if (!confirm('Eliminar este punto de emisión?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/emission-points/${ep.id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEmissionPoints(prev => prev.filter(p => p.id !== ep.id));
        if (selectedEmissionPoint?.id === ep.id) setSelectedEmissionPoint(null);
        showNotify('Punto de emisión eliminado');
      } else {
        const d = await res.json();
        showNotify(d.message || 'Error', 'error');
      }
    } catch { showNotify('Error de conexión', 'error'); }
  };

  return (
    <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
      <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
        📍 Puntos de Emisión
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Puntos configurados para tu plan</p>
          <button type="button" onClick={handleAddEmissionPoint}
            disabled={emissionPoints.length >= (currentPlanMaxEmissionPoints || 3)}
            className="bg-sky-500 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase disabled:opacity-40 hover:bg-sky-600 transition-all">
            + Agregar ({emissionPoints.length}/{currentPlanMaxEmissionPoints || 3})
          </button>
        </div>
        {emissionPoints.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">No hay puntos de emisión configurados</p>
        ) : (
          <div className="space-y-2">
            {emissionPoints.map((ep, i) => (
              <div key={ep.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Estab: {ep.establishmentCode} | Pto: {ep.emissionPointCode}</p>
                  <p className="text-[10px] text-slate-400">{ep.description || 'Sin descripción'}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => { setSelectedEmissionPoint(ep); showNotify(`Punto ${ep.establishmentCode}-${ep.emissionPointCode} seleccionado`); }}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedEmissionPoint?.id === ep.id ? 'bg-sky-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 hover:bg-sky-100'}`}>
                    {selectedEmissionPoint?.id === ep.id ? '✓ Activo' : 'Usar'}
                  </button>
                  {emissionPoints.length > 1 && (
                    <button type="button" onClick={() => handleDeleteEmissionPoint(ep)}
                      className="px-2 py-1 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-100">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ConfigEmissionPointsSection;
