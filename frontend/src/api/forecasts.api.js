import api from './axios';

export const forecastsApi = {
  getCapacityForecasts: (params) => api.get('/forecasts/capacity', { params }),
  getCapacityByWeek: (week, params) => api.get(`/forecasts/capacity/${week}`, { params }),
  getDemandForecast: () => api.get('/forecasts/demand'),
  importForecasts: (data) => api.post('/forecasts/import', data)
};
