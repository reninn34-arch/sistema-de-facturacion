import axios from 'axios';

// URL del backend definida en variable de entorno o fallback
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Crear cliente axios con configuración base
export const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
client.interceptors.request.use(
  (config) => {
    // Buscar primero adminToken (usado por Login), luego token
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Prevenir loop infinito: solo redirigir si no estamos ya en login
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname.includes('/login');
    
    if (error.response?.status === 401 && !isLoginPage) {
      // Token expirado o inválido - solo redirigir si hay un token guardado
      const hasToken = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('clientToken');
      if (hasToken) {
        // Limpiar tokens y redirigir
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('clientToken');
        localStorage.removeItem('user');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('clientUser');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

