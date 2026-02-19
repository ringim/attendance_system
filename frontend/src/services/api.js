import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Request interceptor - Add auth token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - Handle errors
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

/**
 * Auth API
 */
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  verifyToken: () => apiClient.get('/auth/verify'),
};

/**
 * Employee API
 */
export const employeeAPI = {
  getAll: (params) => apiClient.get('/employees', { params }),
  getById: (id) => apiClient.get(`/employees/${id}`),
  create: (data) => apiClient.post('/employees', data),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employees/${id}`),
  getDepartments: () => apiClient.get('/employees/departments'),
  bulkImport: (employees) => apiClient.post('/employees/bulk-import', { employees }),
};

/**
 * Device API
 */
export const deviceAPI = {
  getAll: (params) => apiClient.get('/devices', { params }),
  getById: (id) => apiClient.get(`/devices/${id}`),
  register: (data) => apiClient.post('/devices', data),
  update: (id, data) => apiClient.put(`/devices/${id}`, data),
  delete: (id) => apiClient.delete(`/devices/${id}`),
  testConnection: (id) => apiClient.post(`/devices/${id}/test`),
  getInfo: (id) => apiClient.get(`/devices/${id}/info`),
  getUsers: (id) => apiClient.get(`/devices/${id}/users`),
  getStats: () => apiClient.get('/devices/stats'),
};

/**
 * Attendance API
 */
export const attendanceAPI = {
  getLogs: (params) => apiClient.get('/attendance/logs', { params }),
  getLogById: (id) => apiClient.get(`/attendance/logs/${id}`),
  getEmployeeSummary: (employeeId, params) => 
    apiClient.get(`/attendance/employee/${employeeId}/summary`, { params }),
  triggerSync: (deviceId) => apiClient.post('/attendance/sync', { deviceId }),
  getSyncStatus: () => apiClient.get('/attendance/sync/status'),
  getSyncStatistics: (days) => apiClient.get('/attendance/sync/statistics', { params: { days } }),
  getDashboardStats: () => apiClient.get('/attendance/dashboard'),
};

export default apiClient;
