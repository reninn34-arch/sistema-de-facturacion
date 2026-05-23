import React, { useState, useEffect } from 'react';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ResetPassword: React.FC<{ type?: 'admin' | 'client' }> = ({ type = 'admin' }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token') || '';
  const identification = searchParams.get('id') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [landingLogo, setLandingLogo] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLandingLogo('/api/settings/landing-logo');
    img.onerror = () => {};
    img.src = '/api/settings/landing-logo';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasNumber) {
      setError('La contraseña debe contener al menos una mayúscula y un número.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = type === 'client'
        ? `${API_URL}/api/auth/client/reset-password`
        : `${API_URL}/api/reset-password`;

      const body: any = { token, newPassword };
      if (type === 'client') body.identification = identification;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Contraseña restablecida correctamente.');
        setTimeout(() => {
          window.location.href = type === 'client' ? '/portal/login' : '/login';
        }, 3000);
      } else {
        setError(data.message || 'Error al restablecer la contraseña.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const loginUrl = type === 'client' ? '/portal/login' : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {landingLogo ? (
            <img src={landingLogo} className="h-14 w-auto max-w-[220px] object-contain mx-auto mb-3" alt="Azul PRO" />
          ) : (
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 bg-[#0EA5E9] rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Azul <span className="text-[#0EA5E9]">PRO</span>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-sky-100/50 p-8">
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
            Restablecer Contraseña
          </h2>
          <p className="text-sm text-slate-500 text-center mb-6 font-medium">
            {type === 'client' ? 'Crea una nueva contraseña para el portal de clientes.' : 'Crea una nueva contraseña para tu cuenta.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {token ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nueva Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] text-sm font-medium transition duration-150"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirmar Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] text-sm font-medium transition duration-150"
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#10B981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10B981] transition-all duration-200 disabled:opacity-70"
              >
                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold mb-2">Enlace no válido</p>
              <p className="text-sm text-slate-500 mb-6">El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.</p>
              <a href={loginUrl} className="text-[#0EA5E9] font-bold hover:underline text-sm">
                Volver al inicio de sesión
              </a>
            </div>
          )}

          <div className="mt-6 text-center">
            <a href={loginUrl} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#0EA5E9]">
              <ArrowLeftIcon className="w-4 h-4" />
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
