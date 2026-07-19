import axios from 'axios';

// En desarrollo, baseURL queda vacío para que las peticiones vayan
// a través del proxy de Vite (/api → localhost:3001) y las cookies
// HttpOnly funcionen en same-origin. En producción se usa la URL real.
const API_URL = import.meta.env.VITE_BACKEND_URL || '';
const BASE_URL = import.meta.env.DEV ? '' : API_URL;

// Crear cliente axios con configuración base
export const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variable para evitar múltiples refresh simultáneos
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Interceptor para agregar token de autenticación y normalizar URLs
client.interceptors.request.use(
  (config) => {
    // Si baseURL está configurado y la URL inicia con '/', removemos la barra inicial
    // para que Axios la concatene en vez de ignorar el baseURL y apuntar a la raíz del dominio.
    if (config.baseURL && config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }

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

// Interceptor para manejar errores de respuesta + refresh token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname.includes('/login');

    if (error.response?.status === 401 && !isLoginPage && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          }).catch((err) => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Usamos el mismo cliente para que pase por el proxy y las cookies funcionen
          const response = await client.post('/api/refresh-token', {
            refreshToken,
          });

          const { token: newToken } = response.data;
          localStorage.setItem('adminToken', 'cookie_authenticated');
          localStorage.setItem('refreshToken', 'cookie_authenticated');
          originalRequest.headers.Authorization = `Bearer cookie_authenticated`;

          processQueue(null, newToken);
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('sessionId');
          if (!isLoginPage) window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      const hasToken = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('clientToken');
      if (hasToken && !isLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('clientToken');
        localStorage.removeItem('refreshToken');
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

