import { useState, useEffect, useCallback } from 'react';
import { agentsApi } from '../services/api';
import type { Agent } from '../types';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await agentsApi.getAll();
      setAgents(response.data);
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = useCallback(
    async (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await agentsApi.create(data);
        setAgents((prev) => [response.data, ...prev]);
        return response.data;
      } catch (err: any) {
        console.error('Error creating agent:', err);
        throw err;
      }
    },
    []
  );

  const updateAgent = useCallback(
    async (id: string, data: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>>) => {
      try {
        const response = await agentsApi.update(id, data);
        setAgents((prev) => prev.map((agent) => (agent.id === id ? response.data : agent)));
        return response.data;
      } catch (err: any) {
        console.error('Error updating agent:', err);
        throw err;
      }
    },
    []
  );

  const deleteAgent = useCallback(async (id: string) => {
    try {
      await agentsApi.delete(id);
      setAgents((prev) => prev.filter((agent) => agent.id !== id));
    } catch (err: any) {
      console.error('Error deleting agent:', err);
      throw err;
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    try {
      const response = await agentsApi.uploadAvatar(file);
      return response.data.avatarUrl;
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      throw err;
    }
  }, []);

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    uploadAvatar,
  };
}
