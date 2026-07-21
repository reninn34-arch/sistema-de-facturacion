import React, { useState, useEffect, useId } from 'react';
import { BuildingOfficeIcon, PlusIcon, CheckCircleIcon, XMarkIcon, TagIcon, MapPinIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BusinessInfo } from '../../../types/types';
import { client } from '../../../api/client';

export interface Establishment {
  id: string;
  code: string; // ej. "001", "002"
  name: string;
  address: string;
  isMain: boolean;
  emissionPoints: EmissionPoint[];
}

export interface EmissionPoint {
  id: string;
  code: string; // ej. "001", "002"
  description: string;
  isActive: boolean;
}

interface EstablishmentManagerProps {
  businessInfo: BusinessInfo;
  onNotify: (msg: string, type?: any) => void;
}

export default function EstablishmentManager({ businessInfo, onNotify }: EstablishmentManagerProps) {
  const fieldId = useId();
  const [loading, setLoading] = useState(true);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeEmissionPointCode, setActiveEmissionPointCode] = useState(() => {
    return localStorage.getItem('activeEmissionPoint') || '001-001';
  });
  const [showEstModal, setShowEstModal] = useState(false);
  const [newEst, setNewEst] = useState({ code: '', name: '', address: '' });
  const [editingEst, setEditingEst] = useState<Establishment | null>(null);
  const [showPtsModal, setShowPtsModal] = useState<string | null>(null); // estId / estabCode
  const [newPts, setNewPts] = useState({ code: '', description: '' });

  const fetchEmissionPoints = async () => {
    setLoading(true);
    try {
      const res = await client.get<any[]>('/api/emission-points');
      const rawPoints = Array.isArray(res.data) ? res.data : [];

      // Agrupar por establishmentCode
      const map = new Map<string, Establishment>();

      if (rawPoints.length === 0) {
        // Matriz por defecto si no existen datos
        map.set('001', {
          id: 'est-001',
          code: '001',
          name: businessInfo.name || 'Matriz Principal',
          address: businessInfo.address || 'Quito, Ecuador',
          isMain: true,
          emissionPoints: [{ id: 'pts-001', code: '001', description: 'Caja Principal', isActive: true }]
        });
      } else {
        rawPoints.forEach((pts: any) => {
          const estabCode = pts.establishmentCode || '001';
          if (!map.has(estabCode)) {
            map.set(estabCode, {
              id: `est-${estabCode}`,
              code: estabCode,
              name: estabCode === '001' ? (businessInfo.name || 'Matriz Principal') : `Sucursal ${estabCode}`,
              address: businessInfo.address || 'Ecuador',
              isMain: estabCode === '001',
              emissionPoints: []
            });
          }
          map.get(estabCode)!.emissionPoints.push({
            id: pts.id,
            code: pts.emissionPointCode || '001',
            description: pts.description || `Caja ${pts.emissionPointCode}`,
            isActive: pts.isActive !== false
          });
        });
      }

      setEstablishments(Array.from(map.values()));
    } catch (e: any) {
      console.error('Error cargando sucursales:', e);
      onNotify('No se pudieron cargar las sucursales del servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmissionPoints();
  }, [businessInfo.id]);

  const handleSetPrimaryEmissionPoint = (estabCode: string, ptsCode: string) => {
    const fullCode = `${estabCode}-${ptsCode}`;
    setActiveEmissionPointCode(fullCode);
    localStorage.setItem('activeEmissionPoint', fullCode);
    onNotify(`Punto de emisión activo configurado en ${fullCode}`, 'success');
  };

  const handleCreateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEst.code || !newEst.name) {
      onNotify('Código y Nombre del establecimiento son requeridos', 'error');
      return;
    }

    const formattedCode = newEst.code.padStart(3, '0');

    try {
      // Crear primer punto de emision de la sucursal en DB
      await client.post('/api/emission-points', {
        establishmentCode: formattedCode,
        emissionPointCode: '001',
        description: `Caja Principal (${newEst.name})`
      });

      setShowEstModal(false);
      setNewEst({ code: '', name: '', address: '' });
      onNotify(`Sucursal ${formattedCode} - ${newEst.name} creada correctamente`, 'success');
      fetchEmissionPoints();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error creando sucursal';
      onNotify(msg, 'error');
    }
  };

  const handleUpdateEstablishment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEst) return;
    setEstablishments(establishments.map(est => est.id === editingEst.id ? editingEst : est));
    setEditingEst(null);
    onNotify(`Sucursal ${editingEst.code} actualizada correctamente`, 'success');
  };

  const handleDeleteEstablishment = async (estId: string) => {
    const target = establishments.find(e => e.id === estId);
    if (!target) return;
    if (target.isMain || target.code === '001') {
      onNotify('No se puede eliminar la Matriz Principal (001)', 'warning');
      return;
    }

    try {
      await client.delete(`/api/emission-points/establishment/${target.code}`);
      onNotify(`Sucursal ${target.code} eliminada correctamente`, 'info');
      fetchEmissionPoints();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error eliminando sucursal';
      onNotify(msg, 'error');
    }
  };

  const handleAddEmissionPoint = async (estabCode: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newPts.code || !newPts.description) {
      onNotify('Código y descripción requeridos para la caja', 'error');
      return;
    }

    const formattedCode = newPts.code.padStart(3, '0');

    try {
      await client.post('/api/emission-points', {
        establishmentCode: estabCode,
        emissionPointCode: formattedCode,
        description: newPts.description
      });

      setShowPtsModal(null);
      setNewPts({ code: '', description: '' });
      onNotify(`Caja ${estabCode}-${formattedCode} agregada correctamente`, 'success');
      fetchEmissionPoints();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error agregando caja';
      onNotify(msg, 'error');
    }
  };

  const handleDeleteEmissionPoint = async (estId: string, ptsId: string) => {
    try {
      await client.delete(`/api/emission-points/${ptsId}`);
      onNotify('Caja eliminada correctamente', 'info');
      fetchEmissionPoints();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error eliminando caja';
      onNotify(msg, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Banner de Cabecera */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-500/10 text-sky-500 rounded-3xl">
            <BuildingOfficeIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Sucursales y Puntos de Emisión SRI</h2>
            <p className="text-sm text-slate-400 font-bold">Administra tus establecimientos (001, 002) y cajas autorizadas por el SRI</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEstModal(true)}
          className="px-6 py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" /> Nueva Sucursal / Establecimiento
        </button>
      </div>

      {/* Lista de Establecimientos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {establishments.map(est => (
          <div key={est.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-700 rounded-xl font-mono font-black text-sm">
                  {est.code}
                </span>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-base">{est.name}</h3>
                  <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" /> {est.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {est.isMain ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black uppercase rounded-full">
                    Matriz
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteEstablishment(est.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Eliminar Sucursal"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingEst(est)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  title="Editar Sucursal"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5" /> Puntos de Emisión / Cajas ({est.emissionPoints.length})
                </h4>
                <button
                  type="button"
                  onClick={() => { setShowPtsModal(est.code); setNewPts({ code: `00${est.emissionPoints.length + 1}`, description: '' }); }}
                  className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <PlusIcon className="w-3 h-3" /> Agregar Caja
                </button>
              </div>

              <div className="space-y-2">
                {est.emissionPoints.map(pts => {
                  const fullCode = `${est.code}-${pts.code}`;
                  const isActive = activeEmissionPointCode === fullCode;

                  return (
                    <div key={pts.id} className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isActive ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700'
                    }`}>
                      <div>
                        <span className="font-mono font-black text-xs text-slate-800 dark:text-white mr-2">
                          {fullCode}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                          {pts.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {est.emissionPoints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEmissionPoint(est.id, pts.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Eliminar Caja"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryEmissionPoint(est.code, pts.code)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                            isActive
                              ? 'bg-sky-500 text-white shadow-md'
                              : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          {isActive ? '✓ Seleccionado' : 'Usar en Sesión'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Sucursal */}
      {showEstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Nueva Sucursal / Establecimiento</h3>
              <button type="button" aria-label="Cerrar modal establecimiento" onClick={() => setShowEstModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateEstablishment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-code`} className="text-xs font-bold text-slate-500 uppercase">Código Establecimiento (3 dígitos) *</label>
                <input
                  id={`${fieldId}-code`}
                  type="text"
                  placeholder="Ej. 002"
                  maxLength={3}
                  value={newEst.code}
                  onChange={e => setNewEst({ ...newEst, code: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white font-mono outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-name`} className="text-xs font-bold text-slate-500 uppercase">Nombre de la Sucursal *</label>
                <input
                  id={`${fieldId}-name`}
                  type="text"
                  placeholder="Ej. Sucursal Cumbayá"
                  value={newEst.name}
                  onChange={e => setNewEst({ ...newEst, name: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-address`} className="text-xs font-bold text-slate-500 uppercase">Dirección de la Sucursal</label>
                <input
                  id={`${fieldId}-address`}
                  type="text"
                  placeholder="Ej. Av. Interoceánica km 11"
                  value={newEst.address}
                  onChange={e => setNewEst({ ...newEst, address: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEstModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-xs uppercase transition-colors shadow-lg">
                  Guardar Sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Sucursal */}
      {editingEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Editar Sucursal {editingEst.code}</h3>
              <button type="button" aria-label="Cerrar modal editar sucursal" onClick={() => setEditingEst(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateEstablishment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-edit-name`} className="text-xs font-bold text-slate-500 uppercase">Nombre de la Sucursal *</label>
                <input
                  id={`${fieldId}-edit-name`}
                  type="text"
                  value={editingEst.name}
                  onChange={e => setEditingEst({ ...editingEst, name: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-edit-address`} className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
                <input
                  id={`${fieldId}-edit-address`}
                  type="text"
                  value={editingEst.address}
                  onChange={e => setEditingEst({ ...editingEst, address: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingEst(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-xs uppercase transition-colors shadow-lg">
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Caja / Punto de Emisión */}
      {showPtsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Nueva Caja / Punto de Emisión</h3>
              <button type="button" aria-label="Cerrar modal agregar caja" onClick={() => setShowPtsModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => handleAddEmissionPoint(showPtsModal, e)} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-pts-code`} className="text-xs font-bold text-slate-500 uppercase">Código Caja (3 dígitos) *</label>
                <input
                  id={`${fieldId}-pts-code`}
                  type="text"
                  placeholder="Ej. 002"
                  maxLength={3}
                  value={newPts.code}
                  onChange={e => setNewPts({ ...newPts, code: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white font-mono outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-pts-desc`} className="text-xs font-bold text-slate-500 uppercase">Descripción de la Caja *</label>
                <input
                  id={`${fieldId}-pts-desc`}
                  type="text"
                  placeholder="Ej. Caja POS Rápida / Mostrador"
                  value={newPts.description}
                  onChange={e => setNewPts({ ...newPts, description: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowPtsModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-xs uppercase transition-colors shadow-lg">
                  Agregar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
