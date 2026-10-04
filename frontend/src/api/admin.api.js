import api from './axios';

export const adminApi = {
  // Outlets (general)
  getOutlets: (params) => api.get('/outlets', { params }),
  getOutletById: (id) => api.get(`/outlets/${id}`),
  createOutlet: (data) => api.post('/outlets', data),

  // Store Manager Assignment
  getOutletsWithManagers: (params) => api.get('/outlets', { params }),
  getStoreManagers: () => api.get('/outlets/store-managers'),
  bulkAssignManager: (data) => api.post('/outlets/assign', data),
  unassignManager: (data) => api.post('/outlets/unassign', data),

  // Fleet & Vehicles
  getVehicles: (params) => api.get('/vehicles', { params }),
  getVehicleById: (id) => api.get(`/vehicles/${id}`),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  updateVehicleStatus: (id, data) => api.patch(`/vehicles/${id}/status`, data),
  createVehicle: (data) => api.post('/vehicles', data),

  // Audit Logs
  getAuditLogs: (params) => api.get('/audit', { params }),
};
