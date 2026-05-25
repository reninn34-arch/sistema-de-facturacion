import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const VerifyEmail: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [landingLogo, setLandingLogo] = useState<string | null | false>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLandingLogo('/api/settings/landing-logo');
    img.onerror = () => setLandingLogo(false);
    img.src = '/api/settings/landing-logo';
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No se encontró el token de verificación.');
      return;
    }

    fetch(`${API_URL}/api/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Correo verificado correctamente.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 4000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Error al verificar el correo.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error de conexión con el servidor.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {landingLogo && (
            <img src={landingLogo} className="h-14 w-auto max-w-[220px] object-contain mx-auto mb-3" alt="Logo" />
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-sky-100/50 p-8 text-center">
          {status === 'loading' && (
            <div className="py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9] mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Verificando tu correo electrónico...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">¡Correo Verificado!</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <p className="text-sm text-slate-400">Serás redirigido al inicio de sesión en unos segundos...</p>
              <div className="mt-6">
                <a href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#0EA5E9] hover:text-[#0369A1]">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Ir al inicio de sesión ahora
                </a>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Error de Verificación</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <div className="space-y-3">
                <a href="/login" className="block w-full py-3 bg-[#0EA5E9] text-white font-bold rounded-xl hover:bg-[#0369A1] transition-colors">
                  Ir al inicio de sesión
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
