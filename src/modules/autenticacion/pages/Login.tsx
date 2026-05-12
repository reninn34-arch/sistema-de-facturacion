import React, { useState } from 'react';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');

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
                throw new Error('Respuesta del servidor inválida: no se recibió token');
            }

            localStorage.setItem('adminToken', data.token);
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

            onLoginSuccess();

        } catch (err: any) {
            setError('Credenciales incorrectas. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (view === 'forgot') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-700/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob"></div>
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob animation-delay-2000"></div>
                </div>

                <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar Contraseña</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Ingresa tu correo para recibir un enlace de recuperación.
                            </p>
                        </div>

                        {resetMessage && (
                            <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                resetMessage.startsWith('Error') || resetMessage.startsWith('Error')
                                    ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
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
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Correo Electrónico</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <EnvelopeIcon className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition duration-150"
                                        placeholder="usuario@empresa.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-70"
                            >
                                {loading ? 'Enviando...' : 'Enviar Enlace'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button onClick={() => setView('login')} className="inline-flex items-center gap-1.5 text-sm text-indigo-700 hover:text-indigo-700 font-medium">
                                <ArrowLeftIcon className="w-4 h-4" />
                                Volver al Inicio de Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">

            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-700/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">

                    <div className="pt-10 pb-6 px-8 text-center">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="flex items-baseline tracking-tight">
                                <span className="text-3xl font-bold text-indigo-700">ECUAFACT</span>
                                <span className="text-3xl font-extrabold text-slate-900 dark:text-white ml-1">PRO</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400 dark:text-slate-500 mt-1">Enterprise Edition</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenido</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Ingresa tus credenciales para acceder al panel.
                        </p>
                    </div>

                    <div className="px-8 pb-10">
                        <form onSubmit={handleLogin} className="space-y-6">

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
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
                                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition duration-150"
                                        placeholder="usuario@empresa.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                                        Contraseña
                                    </label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-xs font-medium text-indigo-700 hover:text-indigo-700 hover:underline">
                                        ¿Olvidaste tu contraseña?
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
                                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition duration-150"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium">
                                    <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed`}
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
                                    <a href="/portal/login" className="text-sm text-slate-500 hover:text-indigo-700 transition-colors font-medium">
                                        ¿Eres cliente? <span className="underline">Ingresa al Portal aquí</span>
                                    </a>
                                </div>
                            </div>
                        </form>

                        <div className="mt-8 relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium">Acceso Seguro</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center gap-6 text-xs text-slate-400 dark:text-slate-500">
                            <span className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors cursor-pointer">Soporte</span>
                            <span className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors cursor-pointer">Privacidad</span>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-700 to-indigo-400"></div>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-600">
                        &copy; 2024 Corporación EcuaFact. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
