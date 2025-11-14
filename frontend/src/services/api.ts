import axios from 'axios';
import type { Agent, Conversation, ElevenLabsVoice, ConversationAnalysis, ScenarioWithAgents, Scenario } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const agentsApi = {
  getAll: () => api.get<Agent[]>('/api/agents'),
  getById: (id: string) => api.get<Agent>(`/api/agents/${id}`),
  create: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Agent>('/api/agents', data),
  update: (id: string, data: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Agent>(`/api/agents/${id}`, data),
  delete: (id: string) => api.delete(`/api/agents/${id}`),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<{ avatarUrl: string }>('/api/agents/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const conversationsApi = {
  getAll: (limit = 50, offset = 0) =>
    api.get<Conversation[]>('/api/conversations', { params: { limit, offset } }),
  getById: (id: string) => api.get<Conversation>(`/api/conversations/${id}`),
  create: (data: { title: string; topic: string; agentIds: string[] }) =>
    api.post<Conversation>('/api/conversations', data),
  complete: (id: string) => api.post(`/api/conversations/${id}/complete`),
  getAnalysis: (id: string) =>
    api.get<ConversationAnalysis>(`/api/conversations/${id}/analysis`),
  delete: (id: string) => api.delete(`/api/conversations/${id}`),
};

export const voicesApi = {
  getAll: () => api.get<ElevenLabsVoice[]>('/api/voices'),
};

export const scenariosApi = {
  getAll: () => api.get<ScenarioWithAgents[]>('/api/scenarios'),
  getById: (id: string) => api.get<ScenarioWithAgents>(`/api/scenarios/${id}`),
  getByCategory: (category: string) => api.get<ScenarioWithAgents[]>(`/api/scenarios/category/${category}`),
  create: (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<ScenarioWithAgents>('/api/scenarios', data),
  update: (id: string, data: Partial<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<ScenarioWithAgents>(`/api/scenarios/${id}`, data),
  delete: (id: string) => api.delete(`/api/scenarios/${id}`),
};

export default api;
