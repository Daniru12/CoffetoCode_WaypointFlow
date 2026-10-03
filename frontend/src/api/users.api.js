import api from './axios';

export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getDrivers: (params) => api.get('/users/drivers', { params }),
  getLoaders: (params) => api.get('/users/loaders', { params }),
};
