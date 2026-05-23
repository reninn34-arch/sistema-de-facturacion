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

// Interceptor para agregar token de autenticación
client.interceptors.request.use(
  (config) => {
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
          const response = await axios.post(`${API_URL}/api/refresh-token`, {
            refreshToken,
          });

          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('adminToken', newToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

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

