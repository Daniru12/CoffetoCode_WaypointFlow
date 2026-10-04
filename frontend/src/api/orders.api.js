import api from './axios';

export const ordersApi = {
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getMyOrders: () => api.get('/orders/my'),
  getOrderQueue: (params) => api.get('/orders/queue', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  updateOrder: (id, data) => api.patch(`/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  getOrderTracking: (id) => api.get(`/orders/${id}/tracking`),
  getStoreDashboard: (outletId) => api.get('/store/dashboard', { params: outletId ? { outletId } : {} }),
  getMyOutlets: () => api.get('/store/my-outlets'),
  getReplenishmentPlans: () => api.get('/store/replenishment-plans'),
  createReplenishmentPlan: (data) => api.post('/store/replenishment-plans', data),
  updateReplenishmentPlan: (id, data) => api.put(`/store/replenishment-plans/${id}`, data),
  deleteReplenishmentPlan: (id) => api.delete(`/store/replenishment-plans/${id}`),
  generateOrdersFromPlan: (planId, data) => api.post(`/store/replenishment-plans/${planId}/generate-orders`, data),
};

