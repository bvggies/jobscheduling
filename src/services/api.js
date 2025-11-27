import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Jobs API
export const jobsAPI = {
  getAll: (filters = {}) => api.get('/jobs', { params: filters }),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  updateStatus: (id, status) => api.patch(`/jobs/${id}/status`, { status }),
  updatePayment: (id, type, amount, date) =>
    api.patch(`/jobs/${id}/payment`, { type, amount, date }),
};

// Machines API
export const machinesAPI = {
  getAll: () => api.get('/machines'),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
};

// Schedule API
export const scheduleAPI = {
  getAll: (filters = {}) => api.get('/schedule', { params: filters }),
  autoSchedule: () => api.post('/schedule/auto-schedule'),
  update: (jobId, data) => api.put(`/schedule/${jobId}`, data),
};

// Analytics API
export const analyticsAPI = {
  get: (filters = {}) => api.get('/analytics', { params: filters }),
};

// Alerts API
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

