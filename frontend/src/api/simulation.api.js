import api from './axios';

export const simulationApi = {
  getSimulationTime: () => api.get('/simulation/time'),
  setSimulationTime: (timeString) => api.post('/simulation/time', { timeString }),
  resetSimulationTime: () => api.post('/simulation/time/reset'),
};
