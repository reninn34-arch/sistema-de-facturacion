// src/api/client.ts
import toast from 'react-hot-toast'; // Asegúrate de instalar: npm install react-hot-toast

// Usar ruta relativa para que el proxy de Vite funcione en desarrollo
// Si VITE_BACKEND_URL está configurado, usar esa URL directamente (producción)
const useProxy = !import.meta.env.VITE_BACKEND_URL;
const BASE_URL = useProxy ? '' : import.meta.env.VITE_BACKEND_URL;
const FALLBACK_BACKEND_URL = 'http://localhost:3001';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('adminToken');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // Inyecta token si existe
      ...options.headers,
    },
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Determinar si es un caso de "sin token" o "token inválido/expirado"
      // Si no hay token en localStorage, no hacemos redirect (el usuario será manejado por el flujo normal de autenticación)
      // Solo hacemos redirect si HAY un token pero es inválido o expirado
      if (token) {
        // Hay token pero falló - probablemente expirado o inválido
        toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.replace('/'); // Solo redirigir si había un token
      } else {
        // No hay token - no redirigir, solo mostrar el error
        // Esto evita el loop infinito cuando el usuario no está autenticado
        const errorText = 'Acceso denegado. Por favor inicia sesión.';
        toast.error(errorText);
      }
    }
    const error = await response.json().catch(() => ({}));

    const errorMessage = error.message || 'Error del servidor';
    // Notificación visual del error (ej: "Usuario no encontrado")
    if (response.status !== 401 && response.status !== 403) {
      toast.error(errorMessage);
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// Exportamos un objeto simple con los 4 métodos universales
export const client = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body: any) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};