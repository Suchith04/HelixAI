import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data),
};

export const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
  getMetrics: (days = 7) => api.get(`/dashboard/metrics?days=${days}`),
  getAgentPerformance: () => api.get('/dashboard/agent-performance'),
  getCostOverview: () => api.get('/dashboard/cost'),
};

export const agentService = {
  getAgents: () => api.get('/agents'),
  getAgent: (id) => api.get(`/agents/${id}`),
  triggerAgent: (data) => api.post('/agents/trigger', data),
  initializeAgents: () => api.post('/agents/initialize'),
};

export const incidentService = {
  getIncidents: (params) => api.get('/incidents', { params }),
  getIncident: (id) => api.get(`/incidents/${id}`),
  getIncidentDetails: (id) => api.get(`/incidents/${id}/details`),
  updateIncident: (id, data) => api.put(`/incidents/${id}`, data),
  getStats: () => api.get('/incidents/stats'),
};

export const workflowService = {
  getWorkflows: () => api.get('/workflows'),
  getWorkflow: (id) => api.get(`/workflows/${id}`),
  createWorkflow: (data) => api.post('/workflows', data),
  createGraphWorkflow: (data) => api.post('/workflows/graph', data),
  updateWorkflow: (id, data) => api.put(`/workflows/${id}`, data),
  deleteWorkflow: (id) => api.delete(`/workflows/${id}`),
  executeWorkflow: (id, data) => api.post(`/workflows/${id}/execute`, data),
  getExecutions: () => api.get('/workflows/executions'),
};


export const companyService = {
  getCompany: () => api.get('/company'),
  updateCompany: (data) => api.put('/company', data),
  setAwsCredentials: (data) => api.post('/company/aws-credentials', data),
  getAwsCredentials: () => api.get('/company/aws-credentials'),
  decryptAwsCredentials: () => api.post('/company/aws-credentials/decrypt'),
  setLlmKey: (data) => api.post('/company/llm-key', data),
  getLlmConfigs: () => api.get('/company/llm-configs'),
  saveLlmConfig: (data) => api.post('/company/llm-configs', data),
  setActiveLlmConfig: (data) => api.put('/company/llm-configs/active', data),
  deleteLlmConfig: (index) => api.delete(`/company/llm-configs/${index}`),
};

export default api;
