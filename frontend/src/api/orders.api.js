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
  getStoreDashboard: () => api.get('/store/dashboard')
};
