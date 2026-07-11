import React, { useState, useEffect } from 'react';
import { TrophyIcon, LinkIcon, GiftIcon, ArrowPathIcon, ClipboardDocumentIcon, CheckCircleIcon, ClockIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Referral {
  id: string;
  referredName: string;
  referralCode: string;
  pointsAwarded: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface Prize {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
}

interface SecurityPointsProps {
  businessInfo: any;
  isDemoMode: boolean;
  onNotify: (msg: string, type?: any) => void;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const SecurityPoints: React.FC<SecurityPointsProps> = ({ businessInfo, isDemoMode, onNotify }) => {
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [points, setPoints] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [pointsPerReferral, setPointsPerReferral] = useState(50);

  useEffect(() => {
    if (isDemoMode) {
      setReferralCode('AZUL-DEMO123');
      setReferralLink(`${window.location.origin}/suscripcion?ref=AZUL-DEMO123`);
      setPoints(75);
      setProgramEnabled(true);
      setPointsPerReferral(50);
      setPrizes([
        { id: 'premio_1', name: '1 Mes Adicional Gratis', description: 'Extiende tu suscripcion 30 dias', points: 100, icon: '🎁' },
        { id: 'premio_2', name: 'Facturas Ilimitadas x 1 Mes', description: 'Sin limite de facturas por 30 dias', points: 200, icon: '📄' },
        { id: 'premio_3', name: 'Descuento 25% en Renovacion', description: '25% de descuento en tu proxima renovacion', points: 150, icon: '💰' },
        { id: 'premio_4', name: 'Asistente IA Premium x 3 Meses', description: 'Gemini AI sin restricciones por 3 meses', points: 250, icon: '🤖' },
        { id: 'premio_5', name: 'Logo Personalizado en PDF', description: 'Diseno de logo para tus facturas', points: 300, icon: '🎨' },
      ]);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [codeRes, refsRes, prizesRes] = await Promise.all([
          fetch(`${API_URL}/api/referrals/code`, { headers }),
          fetch(`${API_URL}/api/referrals`, { headers }),
          fetch(`${API_URL}/api/referrals/prizes`, { headers }),
        ]);

        if (codeRes.ok) {
          const cd = await codeRes.json();
          setReferralCode(cd.referralCode);
          setReferralLink(cd.referralLink);
          setPoints(cd.points || 0);
          setProgramEnabled(cd.programEnabled !== false);
          setPointsPerReferral(cd.pointsPerReferral || 50);
        }
        if (refsRes.ok) setReferrals(await refsRes.json());
        if (prizesRes.ok) {
          const pz = await prizesRes.json();
          setPrizes(pz.prizes || []);
        }
      } catch (e) {
        console.error('Error loading points:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isDemoMode]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      onNotify('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const redeemPrize = async (prize: Prize) => {
    if (points < prize.points) {
      onNotify(`Necesitas ${prize.points} puntos. Tienes ${points}.`, 'error');
      return;
    }
    if (!confirm(`Canjear "${prize.name}" por ${prize.points} puntos?`)) return;

    setRedeeming(prize.id);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/referrals/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prizeId: prize.id })
      });
      const data = await res.json();
      if (data.success) {
        setPoints(data.remainingPoints);
        onNotify(data.message);
      } else {
        onNotify(data.message || 'Error al canjear', 'error');
      }
    } catch {
      onNotify('Error de conexion', 'error');
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {!programEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h4 className="text-xl font-black text-amber-700 mb-2">Programa Desactivado</h4>
          <p className="text-sm text-amber-600">El programa de puntos esta temporalmente desactivado por el administrador. Vuelve pronto.</p>
        </div>
      )}
      <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Security Points</h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Programa de fidelidad - Invita y gana puntos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-200">
          <TrophyIcon className="w-10 h-10 mb-4 opacity-80" />
          <p className="text-4xl font-black tracking-tighter">{points}</p>
          <p className="text-sm font-bold text-amber-100 mt-1">Puntos Acumulados</p>
        </div>
        <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tu enlace de referido</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-slate-50 p-4 rounded-2xl text-sm font-mono text-slate-600 border border-slate-200 select-all">{referralLink}</code>
            <button type="button"
              onClick={copyLink}
              className={`p-4 rounded-2xl font-black text-xs uppercase transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
            >
              {copied ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3 text-amber-500" />
            Ganas <strong className="text-amber-600">{pointsPerReferral} puntos</strong> por cada empresa que se registre con tu enlace
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
          <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-sky-500" />
            Historial de Referidos
          </h4>
          {referrals.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ClockIcon className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="font-bold">Sin referidos aun</p>
              <p className="text-sm">Comparte tu enlace para ganar puntos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-500' : 'bg-amber-100 text-amber-500'}`}>
                    {r.status === 'COMPLETED' ? <CheckCircleIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-700">{r.referredName}</p>
                    <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-amber-500">+{r.pointsAwarded} pts</p>
                    <span className={`text-[9px] font-black uppercase ${r.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {r.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
          <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-rose-500" />
            Canjear Premios
          </h4>
          <div className="space-y-3">
            {prizes.map(prize => (
              <div key={prize.id} className={`p-4 rounded-2xl border transition-all ${points >= prize.points ? 'border-slate-200 hover:border-sky-300 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{prize.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-700">{prize.name}</p>
                    <p className="text-xs text-slate-400">{prize.description}</p>
                  </div>
                  <button type="button"
                    onClick={() => redeemPrize(prize)}
                    disabled={points < prize.points || redeeming === prize.id}
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all ${
                      points >= prize.points
                        ? 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {redeeming === prize.id ? (
                      <svg className="animate-spin w-4 h-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <div className="flex items-center gap-1">
                        <TrophyIcon className="w-3 h-3" />
                        {prize.points} pts
                      </div>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
          Como funciona
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center font-black text-sm flex-shrink-0">1</div>
            <div>
              <p className="font-bold text-sm">Comparte tu enlace</p>
              <p className="text-xs text-slate-400 mt-1">Copia y comparte tu enlace unico de referido con otras empresas.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center font-black text-sm flex-shrink-0">2</div>
            <div>
              <p className="font-bold text-sm">Ellos se registran</p>
              <p className="text-xs text-slate-400 mt-1">Cuando una empresa se registra usando tu enlace, ganas 50 puntos.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center font-black text-sm flex-shrink-0">3</div>
            <div>
              <p className="font-bold text-sm">Canjea tus premios</p>
              <p className="text-xs text-slate-400 mt-1">Acumula puntos y canjealos por meses gratis, descuentos y mas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPoints;
