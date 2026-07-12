import React, { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  StarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface LoginProps {
    onLoginSuccess: () => void;
}

const BrandPanel = ({ landingLogo }: { landingLogo: string | null | false }) => (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0369A1] via-[#0369A1] to-[#0EA5E9] text-white relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0EA5E9]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#0369A1]/50 rounded-full blur-3xl" />

        <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
                {landingLogo ? (
                  <img src={landingLogo} className="h-14 w-auto max-w-[220px] object-contain brightness-0 invert" alt="Logo" />
                ) : null}
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight mb-4">
                El sistema de facturación<br />líder en Ecuador
            </h2>
            <p className="text-white/70 text-lg font-medium leading-relaxed max-w-md">
                Accede a tu panel de administración para gestionar facturas, inventario, recetas y reportes tributarios.
            </p>
        </div>

        <div className="relative z-10 space-y-8">
            <div className="grid grid-cols-3 gap-6">
                <div>
                    <p className="text-3xl xl:text-4xl font-extrabold">+450</p>
                    <p className="text-xs text-white/60 font-semibold mt-1 uppercase tracking-wider">Negocios</p>
                </div>
                <div>
                    <p className="text-3xl xl:text-4xl font-extrabold">+50K</p>
                    <p className="text-xs text-white/60 font-semibold mt-1 uppercase tracking-wider">Facturas</p>
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <span className="text-3xl xl:text-4xl font-extrabold">4.9</span>
                        <StarIcon className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-xs text-white/60 font-semibold mt-1 uppercase tracking-wider">Rating</p>
                </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-white/50">
                <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-[#10B981]" />
                    <span>Datos Encriptados</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-[#10B981]" />
                    <span>Autorizado SRI</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-[#10B981]" />
                    <span>SSL 256-bit</span>
                </div>
            </div>
        </div>
    </div>
);

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [landingLogo, setLandingLogo] = useState<string | null | false>(null);

    useEffect(() => {
        const img = new Image();
        img.onload = () => setLandingLogo('/api/settings/landing-logo');
        img.onerror = () => setLandingLogo(false);
        img.src = '/api/settings/landing-logo';
    }, []);

    useEffect(() => {
        const tempEmail = sessionStorage.getItem('tempLoginEmail');
        if (tempEmail) {
            setEmail(tempEmail);
            sessionStorage.removeItem('tempLoginEmail');
        }
    }, []);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetMessage('');
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();
            if (data.success) {
                setResetMessage('Enlace enviado. Revise su correo.');
            } else {
                setResetMessage(data.message || 'Error al solicitar recuperación.');
            }
        } catch (err) {
            setResetMessage('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error de autenticación');
            }

            if (!data.token) {
                throw new Error('Respuesta del servidor inválida: no se recibio token');
            }

            localStorage.setItem('adminToken', 'cookie_authenticated');
            if (data.user) {
                localStorage.setItem('adminUser', JSON.stringify(data.user));
            }

            if (data.subscriptionExpired !== undefined) {
                localStorage.setItem('subscriptionExpired', JSON.stringify(data.subscriptionExpired));
            }
            if (data.businessActive !== undefined) {
                localStorage.setItem('businessActive', JSON.stringify(data.businessActive));
            }
            if (data.subscriptionPending !== undefined) {
                localStorage.setItem('subscriptionPending', JSON.stringify(data.subscriptionPending));
            }
            if (data.hasModuleControl !== undefined) {
                localStorage.setItem('hasModuleControl', JSON.stringify(data.hasModuleControl));
            }
            if (data.modulePermissions) {
                localStorage.setItem('modulePermissions', JSON.stringify(data.modulePermissions));
            }
            if (data.sessionId) {
                localStorage.setItem('sessionId', data.sessionId);
            }
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', 'cookie_authenticated');
            }

            onLoginSuccess();

        } catch (err: any) {
            if (err.message && err.message.includes('423')) {
                setError('Cuenta bloqueada por exceso de intentos. Intente de nuevo en 15 minutos.');
            } else {
                setError('Credenciales incorrectas. Intente nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };



    if (view === 'forgot') {
        return (
            <div className="h-screen w-full flex bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <BrandPanel landingLogo={landingLogo} />

                <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                    <div className="w-full max-w-md animate-fade-in">
                        <div className="lg:hidden mb-10 text-center">
                            {landingLogo ? (
                              <img src={landingLogo} className="h-14 w-auto max-w-[220px] object-contain mx-auto mb-4" alt="Logo" />
                            ) : null}
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-sky-100/50 p-8">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-extrabold text-slate-900">Recuperar Contraseña</h2>
                                <p className="text-sm text-slate-500 mt-2 font-medium">
                                    Ingresa tu correo para recibir un enlace de recuperación.
                                </p>
                            </div>

                            {resetMessage && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    resetMessage.startsWith('Error') || resetMessage.startsWith('Error')
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                    {resetMessage.startsWith('Error') ? (
                                        <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    {resetMessage}
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo Electrónico</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <EnvelopeIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] text-sm font-medium transition duration-150"
                                            placeholder="usuario@empresa.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#0EA5E9] hover:bg-[#0369A1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9] transition-all duration-200 disabled:opacity-70 hover:-translate-y-0.5"
                                >
                                    {loading ? 'Enviando...' : 'Enviar Enlace'}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <button type="button" onClick={() => setView('login')} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0EA5E9] hover:text-[#0369A1]">
                                    <ArrowLeftIcon className="w-4 h-4" />
                                    Volver al Inicio de Sesión
                                </button>
                            </div>
                        </div>

                        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                            &copy; {new Date().getFullYear()} Azul. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <BrandPanel landingLogo={landingLogo} />

            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="lg:hidden mb-10 text-center">
                        {landingLogo ? (
                          <img src={landingLogo} className="h-14 w-auto max-w-[220px] object-contain mx-auto mb-3" alt="Logo" />
                        ) : null}
                        <p className="text-sm text-slate-500 font-medium">Sistema de Facturación Electrónica</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-sky-100/50 overflow-hidden">
                        <div className="pt-10 pb-6 px-8 text-center">
                            <h2 className="text-2xl font-extrabold text-slate-900">Iniciar Sesión</h2>
                            <p className="text-sm text-slate-500 mt-2 font-medium">
                                Ingresa a tu panel de administración
                            </p>
                        </div>

                        <div className="px-8 pb-10">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="email">
                                        Correo Electrónico
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <EnvelopeIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] text-sm font-medium transition duration-150"
                                            placeholder="usuario@empresa.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-bold text-slate-700" htmlFor="password">
                                            Contraseña
                                        </label>
                                        <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-[#0EA5E9] hover:text-[#0369A1] hover:underline">
                                            Olvidaste tu contraseña?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <LockClosedIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-[#0EA5E9] text-sm font-medium transition duration-150"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-xs font-semibold">
                                        <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#0EA5E9] hover:bg-[#0369A1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed shadow-[#0EA5E9]/25`}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Ingresando...
                                            </>
                                        ) : (
                                            'Iniciar Sesión'
                                        )}
                                    </button>
                                    <div className="mt-4 text-center">
                                        <a href="/portal/login" className="text-sm text-slate-500 hover:text-[#0EA5E9] transition-colors font-semibold">
                                            Eres cliente? <span className="underline">Ingresa al Portal aquí</span>
                                        </a>
                                    </div>
                                </div>
                            </form>

                            <div className="mt-8 relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-3 bg-white text-slate-400 text-xs font-bold uppercase tracking-widest">Acceso Seguro</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-center gap-6 text-xs text-slate-400">
                                <span className="hover:text-[#0EA5E9] transition-colors cursor-pointer font-semibold">Soporte</span>
                                <span className="hover:text-[#0EA5E9] transition-colors cursor-pointer font-semibold">Privacidad</span>
                                <span className="hover:text-[#0EA5E9] transition-colors cursor-pointer font-semibold">Términos</span>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]"></div>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                        &copy; {new Date().getFullYear()} Azul. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
