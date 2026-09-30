import api from './axios';

export const driverApi = {
  getRoutesToday: () => api.get('/driver/routes/today'),
  getTripById: (tripId) => api.get(`/driver/trips/${tripId}`),
  getTripStops: (tripId) => api.get(`/driver/trips/${tripId}/stops`),
  arriveDelivery: (deliveryId) => api.post(`/deliveries/${deliveryId}/arrive`),
  completeDelivery: (deliveryId, data) => api.post(`/deliveries/${deliveryId}/complete`, data),
  failDelivery: (deliveryId, data) => api.post(`/deliveries/${deliveryId}/fail`, data),
  submitPod: (deliveryId, formData) =>
    api.post(`/deliveries/${deliveryId}/pod`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getDeliveryById: (deliveryId) => api.get(`/deliveries/${deliveryId}`),
  confirmReceipt: (deliveryId, formData) =>
    api.post(`/deliveries/${deliveryId}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  reportDeliveryIssue: (deliveryId, formData) =>
    api.post(`/deliveries/${deliveryId}/issues`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateLocation: (data) => api.post('/driver/location', data),
  reportVehicleIssue: (formData) =>
    api.post('/driver/vehicle-issue', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};
