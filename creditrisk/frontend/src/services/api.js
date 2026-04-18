import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('creditiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error normaliser
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('creditiq_token');
      localStorage.removeItem('creditiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:   (data) => api.post('/auth/login', data),
  signup:  (data) => api.post('/auth/signup', data),
  me:      ()     => api.get('/auth/me'),
  logout:  ()     => api.post('/auth/logout'),
};

export const predictAPI = {
  predict:   (data)               => api.post('/predict', data),
  history:   (page = 1, perPage = 10, userId = null) =>
    api.get('/history', { params: { page, per_page: perPage, user_id: userId } }),
  stats:     (userId = null)      => api.get('/stats', { params: { user_id: userId } }),
  modelInfo: ()                   => api.get('/model-info'),
  health:    ()                   => api.get('/health'),
};

export default api;
