import api from './axios';

export const trackingApi = {
  getLiveTracking: () => api.get('/tracking/live'),
  getTripTracking: (tripId) => api.get(`/tracking/trips/${tripId}`),
  recordLocation: (data) => api.post('/tracking/location', data)
};
