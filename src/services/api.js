import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'jobscheduler_token';
const USER_KEY = 'jobscheduler_user';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const feedbackAPI = {
  getAll: () => api.get('/feedback'),
  create: (data) => api.post('/feedback', data),
  reply: (id, admin_reply) => api.patch(`/feedback/${id}/reply`, { admin_reply }),
  setStatus: (id, status) => api.patch(`/feedback/${id}/status`, { status }),
};

export const jobsAPI = {
  getAll: (filters = {}) => api.get('/jobs', { params: filters }),
  getById: (id) => api.get(`/jobs/${id}`),
  getUpdates: (id) => api.get(`/jobs/${id}/updates`),
  addComment: (id, message) => api.post(`/jobs/${id}/comments`, { message }),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  duplicate: (id) => api.post(`/jobs/${id}/duplicate`),
  updateStatus: (id, status) => api.patch(`/jobs/${id}/status`, { status }),
  updatePayment: (id, type, amount, date) =>
    api.patch(`/jobs/${id}/payment`, { type, amount, date }),
};

export const usersAPI = {
  getCustomers: () => api.get('/users/customers'),
  createCustomer: (data) => api.post('/users/customers', data),
};

export const activityAPI = {
  getMine: (params = {}) => api.get('/activity/mine', { params }),
  getRecent: (params = {}) => api.get('/activity/recent', { params }),
};

export const machinesAPI = {
  getAll: () => api.get('/machines'),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
};

export const scheduleAPI = {
  getAll: (filters = {}) => api.get('/schedule', { params: filters }),
  autoSchedule: () => api.post('/schedule/auto-schedule'),
  update: (jobId, data) => api.put(`/schedule/${jobId}`, data),
};

export const analyticsAPI = {
  get: (filters = {}) => api.get('/analytics', { params: filters }),
};

export const alertsAPI = {
  getAll: (read = null) => {
    const params = read !== null ? { read } : {};
    return api.get('/alerts', { params });
  },
  markAsRead: (id) => api.patch(`/alerts/${id}/read`),
  markAllAsRead: () => api.patch('/alerts/read-all'),
  check: () => api.post('/alerts/check'),
};

export default api;
