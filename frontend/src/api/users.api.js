import api from './axios';

export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getDrivers: (params) => api.get('/users/drivers', { params }),
  getLoaders: (params) => api.get('/users/loaders', { params }),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
};
