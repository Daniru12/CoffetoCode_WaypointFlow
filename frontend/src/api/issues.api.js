import api from './axios';

export const issuesApi = {
  getIssues: (params) => api.get('/issues', { params }),
  getIssueById: (id) => api.get(`/issues/${id}`),
  updateIssueStatus: (id, data) => api.patch(`/issues/${id}/status`, data)
};
