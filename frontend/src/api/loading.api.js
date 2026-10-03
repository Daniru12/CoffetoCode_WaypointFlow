import api from './axios';

export const loadingApi = {
  getJobsToday: (params) => api.get('/loading/jobs/today', { params }),
  getJobById: (id) => api.get(`/loading/jobs/${id}`),
  startJob: (id) => api.post(`/loading/jobs/${id}/start`),
  updateItem: (id, itemId, data) => api.patch(`/loading/jobs/${id}/items/${itemId}`, data),
  reportShortfall: (id, formData) =>
    api.post(`/loading/jobs/${id}/shortfall`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  reportDamage: (id, formData) =>
    api.post(`/loading/jobs/${id}/damage`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  completeJob: (id) => api.post(`/loading/jobs/${id}/complete`),
  readyForDeparture: (id) => api.post(`/loading/jobs/${id}/ready-for-departure`)
};
