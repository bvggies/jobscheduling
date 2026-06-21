import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'jobscheduler_token';
const USER_KEY = 'jobscheduler_user';

/** Safe string for UI when axios/Vercel returns `error` as an object. */
export function formatApiError(err, fallback = 'Something went wrong.') {
  const d = err?.response?.data;
  if (typeof d?.error === 'string') return d.error;
  if (typeof d?.message === 'string') return d.message;
  if (d?.error && typeof d.error === 'object' && typeof d.error.message === 'string') return d.error.message;
  if (typeof err?.message === 'string' && err.message !== 'Network Error') return err.message;
  return fallback;
}

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
  submitDeposit: (id, deposit_payment) => api.patch(`/jobs/${id}/submit-deposit`, { deposit_payment }),
  verifyDeposit: (id, action) => api.patch(`/jobs/${id}/verify-deposit`, { action }),
  setQuote: (id, data) => api.patch(`/jobs/${id}/quote`, data),
  updatePayment: (id, type, amount, date) =>
    api.patch(`/jobs/${id}/payment`, { type, amount, date }),
};

export const usersAPI = {
  getCustomers: () => api.get('/users/customers'),
  createCustomer: (data) => api.post('/users/customers', data),
  getWorkers: () => api.get('/users/workers'),
  createWorker: (data) => api.post('/users/workers', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
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
  getAvailableSlots: (params = {}) => api.get('/schedule/available-slots', { params }),
  autoSchedule: () => api.post('/schedule/auto-schedule'),
  update: (jobId, data) => api.put(`/schedule/${jobId}`, data),
};

export const servicesAPI = {
  getCatalog: () => api.get('/services/catalog'),
  calculate: (data) => api.post('/services/calculate', data),
  listManage: () => api.get('/services/manage'),
  create: (data) => api.post('/services/manage', data),
  update: (id, data) => api.put(`/services/manage/${id}`, data),
  deactivate: (id) => api.delete(`/services/manage/${id}`),
};

/** Origin for Socket.IO (same host as API, without `/api`). */
export function getChatSocketOrigin() {
  if (process.env.REACT_APP_WS_ORIGIN) return process.env.REACT_APP_WS_ORIGIN.replace(/\/$/, '');
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  return base.replace(/\/api\/?$/, '');
}

/**
 * Whether the SPA should open a Socket.IO connection.
 * Vercel serverless cannot host Socket.IO; set REACT_APP_WS_ORIGIN to a long-lived Node host for live chat.
 */
export function isChatSocketEnabled() {
  if (process.env.REACT_APP_CHAT_SOCKET === '0' || process.env.REACT_APP_CHAT_SOCKET === 'false') {
    return false;
  }
  if (process.env.REACT_APP_CHAT_SOCKET === '1' || process.env.REACT_APP_CHAT_SOCKET === 'true') {
    return true;
  }
  if (process.env.REACT_APP_WS_ORIGIN) return true;
  const api = process.env.REACT_APP_API_URL || '';
  if (/localhost|127\.0\.0\.1/i.test(api)) return true;
  try {
    const host = new URL(api).hostname;
    if (host.endsWith('.vercel.app')) return false;
  } catch {
    /* ignore */
  }
  return true;
}

export const chatAPI = {
  listThreads: () => api.get('/chat/threads'),
  openThread: (peer_user_id) => api.post('/chat/threads', { peer_user_id }),
  openShopThread: () => api.post('/chat/threads/shop', {}),
  getMessages: (threadId, params = {}) => api.get(`/chat/threads/${threadId}/messages`, { params }),
  sendMessage: (threadId, body) => api.post(`/chat/threads/${threadId}/messages`, { body }),
  markRead: (threadId) => api.patch(`/chat/threads/${threadId}/read`),
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
