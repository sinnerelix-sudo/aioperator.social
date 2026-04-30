import axios from 'axios';

// Strategy:
// - In production deployment (Vercel), VITE_API_URL points to the Render backend.
// - In Emergent preview, VITE_API_URL is empty so requests are relative and
//   the kubernetes ingress routes /api/* to the backend pod automatically.
const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aio_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aio_token');
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (payload) => api.post('/api/auth/register', payload),
  login: (payload) => api.post('/api/auth/login', payload),
  me: () => api.get('/api/auth/me'),
};

export const meApi = {
  updateStore: (payload) => api.put('/api/me/store', payload),
};

export const botsApi = {
  list: () => api.get('/api/bots'),
  create: (payload) => api.post('/api/bots', payload),
  update: (id, payload) => api.put(`/api/bots/${id}`, payload),
  remove: (id) => api.delete(`/api/bots/${id}`),
  connect: (id, channel) => api.post(`/api/bots/${id}/connect/${channel}`),
  testMessage: (id, message, locale) =>
    api.post(`/api/bots/${id}/test-message`, { message, locale }),
};

export const trainingApi = {
  get: (botId) => api.get(`/api/bots/${botId}/training`),
  save: (botId, payload) => api.put(`/api/bots/${botId}/training`, payload),
};

export const productsApi = {
  list: () => api.get('/api/products'),
  create: (payload) => api.post('/api/products', payload),
  update: (id, payload) => api.put(`/api/products/${id}`, payload),
  remove: (id) => api.delete(`/api/products/${id}`),
};

export const activitiesApi = {
  list: (limit = 20) => api.get(`/api/activities?limit=${limit}`),
};

export const subscriptionApi = {
  get: () => api.get('/api/subscription'),
  selectPlan: (plan) => api.post('/api/subscription/select-plan', { plan }),
};

export const publicApi = {
  getStore: (slug) => api.get(`/api/public/store/${encodeURIComponent(slug)}`),
};
