import api from './axios';

export const planningApi = {
  // Plans
  createPlan: (data) => api.post('/plans', data),
  getPlans: (params) => api.get('/plans', { params }),
  getPlanById: (id) => api.get(`/plans/${id}`),
  validatePlan: (id) => api.post(`/plans/${id}/validate`),
  publishPlan: (id) => api.post(`/plans/${id}/publish`),
  getUnallocatedOrders: (id) => api.get(`/plans/${id}/unallocated-orders`),

  // Allocations & Constraints
  getCompatibleVehicles: (orderId, tripId) =>
    api.get(`/allocation/orders/${orderId}/compatible-vehicles`, { params: { tripId } }),
  validateAllocation: (data) => api.post('/allocation/validate', data),
  assignOrder: (data) => api.post('/allocation/assign', data),
  updateAssignment: (id, data) => api.patch(`/allocation/${id}`, data),
  removeAssignment: (id, orderId) => api.delete(`/allocation/${id}`, { params: { orderId } }),

  // Deferrals
  getDeferrals: (params) => api.get('/deferrals', { params }),
  getDeferralById: (id) => api.get(`/deferrals/${id}`),
  deferOrder: (orderId, data) => api.post(`/deferrals/orders/${orderId}/defer`, data),
  reconsiderDeferral: (id) => api.post(`/deferrals/${id}/reconsider`),
  resolveDeferral: (id) => api.post(`/deferrals/${id}/resolve`),

  // Dispatcher Dashboard & Alerts
  getDispatcherDashboard: (params) => api.get('/dispatcher/dashboard', { params }),
  getDispatcherAlerts: () => api.get('/dispatcher/alerts'),
  getCriticalIncidents: () => api.get('/dispatcher/critical-incidents')
};
