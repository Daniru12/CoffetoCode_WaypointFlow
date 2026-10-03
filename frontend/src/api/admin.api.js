import api from './axios';

export const adminApi = {
  // Outlets
  getOutlets: (params) => api.get('/outlets', { params }),
  getOutletById: (id) => api.get(`/outlets/${id}`),
  createOutlet: (data) => api.post('/outlets', data),

  // Fleet & Vehicles
  getVehicles: (params) => api.get('/vehicles', { params }),
  getVehicleById: (id) => api.get(`/vehicles/${id}`),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  updateVehicleStatus: (id, data) => api.patch(`/vehicles/${id}/status`, data),
  createVehicle: (data) => api.post('/vehicles', data),

  // Audit Logs
  getAuditLogs: (params) => api.get('/audit', { params }),
};
