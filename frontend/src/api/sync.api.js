import api from './axios';

export const syncApi = {
  bootstrapOfflineData: () => api.get('/sync/bootstrap'),
  syncEvents: (data) => api.post('/sync/events', data),
  getSyncStatus: () => api.get('/sync/status'),
  retrySync: (data) => api.post('/sync/retry', data),
  getConflicts: () => api.get('/sync/conflicts'),
  resolveConflict: (id, data) => api.post(`/sync/conflicts/${id}/resolve`, data)
};
