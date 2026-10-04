import api from './axios';

export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  uploadCsv: (formData) => api.post('/inventory/upload', formData),
  loadGoods: (data) => api.post('/inventory/load', data),
  reportIssue: (data) => api.post('/inventory/issue', data),
  
  // Store Manager Inventory & Requests
  getStoreManagerInventory: (storeManagerId) => api.get('/inventory/store-inventory', { params: { storeManagerId } }),
  requestStock: (data) => api.post('/inventory/stock-request', data),
  getStockRequests: (params) => api.get('/inventory/stock-requests', { params }),
  approveStockRequest: (requestId) => api.put(`/inventory/stock-requests/${requestId}/approve`),
  rejectStockRequest: (requestId) => api.put(`/inventory/stock-requests/${requestId}/reject`),
  markStockRequestSent: (requestId) => api.put(`/inventory/stock-requests/${requestId}/send`),
  confirmStockReceived: (requestId) => api.put(`/inventory/stock-requests/${requestId}/receive`)
};
