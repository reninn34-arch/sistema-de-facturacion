import React, { useState, useEffect, useId } from 'react';
import { TrophyIcon, CogIcon, GiftIcon, ArrowPathIcon, ChartBarIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon, PencilIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { client } from '../../../api/client';

interface PointsConfig {
  enabled: boolean;
  pointsPerReferral: number;
  maxRedemptionsPerMonth: number;
}

interface BusinessPoints {
  id: string;
  name: string;
  ruc: string;
  points: number;
  referralCode: string | null;
  plan: string;
}

interface ReferralRecord {
  id: string;
  referrerBusinessId: string;
  referredName: string;
  referralCode: string;
  pointsAwarded: number;
  status: string;
  createdAt: string;
  referrer?: { name: string; ruc: string; points: number };
}

interface Prize {
  id: string;
  name: string;
  description: string | null;
  points: number;
  icon: string;
  isActive: boolean;
  displayOrder: number;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const PointsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'businesses' | 'referrals' | 'prizes'>('config');
  const [config, setConfig] = useState<PointsConfig>({ enabled: true, pointsPerReferral: 50, maxRedemptionsPerMonth: 3 });
  const [businesses, setBusinesses] = useState<BusinessPoints[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [prizeForm, setPrizeForm] = useState({ name: '', description: '', points: 100, icon: '🎁' });
  const [adjustBusiness, setAdjustBusiness] = useState<{ id: string; name: string; amount: number; reason: string } | null>(null);
  const [notify, setNotify] = useState('');
  const fieldId = useId();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, bizRes, refRes, przRes] = await Promise.all([
        client.get('/api/admin/points-config').catch(() => ({ data: null })),
        client.get('/api/admin/points').catch(() => ({ data: [] })),
        client.get('/api/admin/referrals/all').catch(() => ({ data: [] })),
        client.get('/api/admin/prizes').catch(() => ({ data: [] })),
      ]);
      if (cfgRes.data) setConfig(cfgRes.data);
      if (Array.isArray(bizRes.data)) setBusinesses(bizRes.data);
      if (Array.isArray(refRes.data)) setReferrals(refRes.data);
      if (Array.isArray(przRes.data)) setPrizes(przRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await client.put('/api/admin/points-config', config);
      setNotify('Configuracion guardada');
      setTimeout(() => setNotify(''), 3000);
      loadAll();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'No se pudo guardar';
      setNotify('Error: ' + msg);
      setTimeout(() => setNotify(''), 4000);
    }
    finally { setSaving(false); }
  };

  const adjustBusinessPoints = async () => {
    if (!adjustBusiness) return;
    try {
      await client.put(`/api/admin/points/${adjustBusiness.id}`, { amount: adjustBusiness.amount, reason: adjustBusiness.reason });
      setNotify(`Puntos ajustados: ${adjustBusiness.amount > 0 ? '+' : ''}${adjustBusiness.amount}`);
      setTimeout(() => setNotify(''), 3000);
      setAdjustBusiness(null);
      loadAll();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'No se pudo ajustar';
      setNotify('Error: ' + msg);
      setTimeout(() => setNotify(''), 4000);
    }
  };

  const savePrize = async () => {
    try {
      if (editingPrize) {
        await client.put(`/api/admin/prizes/${editingPrize.id}`, prizeForm);
      } else {
        await client.post('/api/admin/prizes', prizeForm);
      }
      setNotify(editingPrize ? 'Premio actualizado' : 'Premio creado');
      setTimeout(() => setNotify(''), 3000);
      setEditingPrize(null);
      setPrizeForm({ name: '', description: '', points: 100, icon: '🎁' });
      loadAll();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'No se pudo guardar premio';
      setNotify('Error: ' + msg);
      setTimeout(() => setNotify(''), 4000);
    }
  };

  const deletePrize = async (id: string) => {
    if (!confirm('Eliminar este premio?')) return;
    try {
      await client.delete(`/api/admin/prizes/${id}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  }

  const totalPoints = businesses.reduce((s, b) => s + (b.points || 0), 0);
  const totalReferrals = referrals.length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Panel de Puntos SaaS</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Control total del programa de fidelidad</p>
        </div>
      </div>

      {notify && (
        <div className={`${notify.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} border rounded-2xl p-4 font-bold text-sm flex items-center gap-2`}>
          {notify.includes('Error') ? <ExclamationTriangleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
          {notify}
        </div>
      )}

      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-fit">
        {[
          { id: 'config', label: 'Configuración', icon: <CogIcon className="w-4 h-4" /> },
          { id: 'businesses', label: 'Empresas', icon: <ChartBarIcon className="w-4 h-4" /> },
          { id: 'referrals', label: 'Referidos', icon: <ArrowPathIcon className="w-4 h-4" /> },
          { id: 'prizes', label: 'Premios', icon: <GiftIcon className="w-4 h-4" /> },
        ].map(tab => (
          <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 rounded-[1.5rem] flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 max-w-2xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-800">Programa de Puntos</h4>
                <p className="text-xs text-slate-400">Activar o desactivar el programa completo</p>
              </div>
              <button type="button" role="switch" aria-checked={config.enabled} aria-label="Activar programa de puntos" onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-14 h-7 rounded-full transition-all relative ${config.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${config.enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${fieldId}-pointsPerReferral`} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos por Referido Exitoso</label>
              <input id={`${fieldId}-pointsPerReferral`} type="number" value={config.pointsPerReferral} onChange={e => setConfig({ ...config, pointsPerReferral: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500" />
            </div>

            <div className="space-y-2">
              <label htmlFor={`${fieldId}-maxRedemptions`} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Máximo de Canjes por Mes (por empresa)</label>
              <input id={`${fieldId}-maxRedemptions`} type="number" value={config.maxRedemptionsPerMonth} onChange={e => setConfig({ ...config, maxRedemptionsPerMonth: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500" />
            </div>

            <button type="submit" onClick={saveConfig} disabled={saving}
              className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-600 transition-all disabled:opacity-50 text-sm uppercase">
              {saving ? 'Guardando...' : 'Guardar Configuracion'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'businesses' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 flex gap-4 border-b border-slate-50">
            <div className="bg-amber-50 px-6 py-3 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase">Puntos Totales</p><p className="text-2xl font-black text-amber-500">{totalPoints}</p></div>
            <div className="bg-sky-50 px-6 py-3 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase">Empresas</p><p className="text-2xl font-black text-sky-500">{businesses.length}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="py-4 px-6 text-left">Empresa</th>
                  <th className="py-4 text-left">RUC</th>
                  <th className="py-4 text-center">Plan</th>
                  <th className="py-4 text-center">Puntos</th>
                  <th className="py-4 text-left">Codigo Referido</th>
                  <th className="py-4 px-6 text-right">Ajustar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {businesses.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-bold text-slate-700">{b.name}</td>
                    <td className="py-3 text-xs text-slate-500 font-mono">{b.ruc}</td>
                    <td className="py-3 text-center"><span className="bg-slate-100 px-2 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase">{b.plan}</span></td>
                    <td className="py-3 text-center font-black text-amber-500">{b.points}</td>
                    <td className="py-3 text-xs font-mono text-slate-400">{b.referralCode || '-'}</td>
                    <td className="py-3 px-6 text-right">
                      <button type="button" onClick={() => setAdjustBusiness({ id: b.id, name: b.name, amount: 0, reason: '' })}
                        className="px-3 py-1.5 bg-sky-50 text-sky-500 rounded-lg text-[9px] font-black uppercase hover:bg-sky-100">+/-</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {adjustBusiness && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-slate-800">Ajustar Puntos: {adjustBusiness.name}</h4>
                  <button type="button" aria-label="Cerrar" onClick={() => setAdjustBusiness(null)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div><label htmlFor={`${fieldId}-adjustAmount`} className="text-[10px] font-black text-slate-400 uppercase">Cantidad (+ suma, - resta)</label>
                    <input id={`${fieldId}-adjustAmount`} type="number" value={adjustBusiness.amount} onChange={e => setAdjustBusiness({ ...adjustBusiness, amount: parseInt(e.target.value) || 0 })} className="w-full p-3 bg-slate-50 rounded-xl font-bold" /></div>
                  <div><label htmlFor={`${fieldId}-adjustReason`} className="text-[10px] font-black text-slate-400 uppercase">Motivo</label>
                    <input id={`${fieldId}-adjustReason`} value={adjustBusiness.reason} onChange={e => setAdjustBusiness({ ...adjustBusiness, reason: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-bold" placeholder="Ej: Ajuste manual, promocion..." /></div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setAdjustBusiness(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-xs uppercase">Cancelar</button>
                    <button type="button" onClick={adjustBusinessPoints} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-xs uppercase">Aplicar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 flex gap-4 border-b border-slate-50">
            <div className="bg-sky-50 px-6 py-3 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase">Total Referidos</p><p className="text-2xl font-black text-sky-500">{totalReferrals}</p></div>
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase">Completados</p><p className="text-2xl font-black text-emerald-500">{referrals.filter(r => r.status === 'COMPLETED').length}</p></div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 sticky top-0">
                <tr>
                  <th className="py-4 px-6 text-left">Referidor</th>
                  <th className="py-4 text-left">Referido</th>
                  <th className="py-4 text-center">Puntos</th>
                  <th className="py-4 text-center">Estado</th>
                  <th className="py-4 px-6 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-sm font-bold text-slate-700">{r.referrer?.name || 'N/A'}</td>
                    <td className="py-3 text-sm text-slate-600">{r.referredName}</td>
                    <td className="py-3 text-center font-black text-amber-500">{r.pointsAwarded > 0 ? `+${r.pointsAwarded}` : r.pointsAwarded}</td>
                    <td className="py-3 text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : r.status === 'REDEEMED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{r.status}</span></td>
                    <td className="py-3 px-6 text-right text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-black text-slate-800">Catálogo de Premios</h4>
            <button type="button" onClick={() => { setEditingPrize(null); setPrizeForm({ name: '', description: '', points: 100, icon: '🎁' }); }}
              className="bg-sky-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-sky-600 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Agregar Premio
            </button>
          </div>

          {editingPrize !== undefined && editingPrize === null && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 max-w-xl">
              <h5 className="font-black text-slate-800 mb-4">{editingPrize ? 'Editar Premio' : 'Nuevo Premio'}</h5>
              <div className="space-y-3">
                <input value={prizeForm.name} onChange={e => setPrizeForm({ ...prizeForm, name: e.target.value })} placeholder="Nombre del premio" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                <input value={prizeForm.description} onChange={e => setPrizeForm({ ...prizeForm, description: e.target.value })} placeholder="Descripcion" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={prizeForm.points} onChange={e => setPrizeForm({ ...prizeForm, points: parseInt(e.target.value) || 0 })} placeholder="Puntos" className="p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                  <input value={prizeForm.icon} onChange={e => setPrizeForm({ ...prizeForm, icon: e.target.value })} placeholder="Icono (emoji)" className="p-3 bg-slate-50 rounded-xl font-bold text-sm" maxLength={2} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingPrize(undefined as any)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-xs uppercase">Cancelar</button>
                  <button type="submit" onClick={savePrize} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-xs uppercase">Guardar</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="py-4 px-6 text-left">Icono</th>
                  <th className="py-4 text-left">Nombre</th>
                  <th className="py-4 text-center">Puntos</th>
                  <th className="py-4 text-center">Activo</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prizes.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-2xl">{p.icon}</td>
                    <td className="py-3"><p className="text-sm font-bold text-slate-700">{p.name}</p><p className="text-xs text-slate-400">{p.description}</p></td>
                    <td className="py-3 text-center font-black text-amber-500">{p.points}</td>
                    <td className="py-3 text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${p.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{p.isActive ? 'Si' : 'No'}</span></td>
                    <td className="py-3 px-6 text-right flex justify-end gap-2">
                      <button type="button" aria-label="Editar premio" onClick={() => { setEditingPrize(p); setPrizeForm({ name: p.name, description: p.description || '', points: p.points, icon: p.icon }); }}
                        className="px-3 py-1.5 bg-sky-50 text-sky-500 rounded-lg text-[9px] font-black uppercase hover:bg-sky-100"><PencilIcon className="w-3 h-3" /></button>
                      <button type="button" aria-label="Eliminar premio" onClick={() => deletePrize(p.id)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-100"><TrashIcon className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsAdmin;
