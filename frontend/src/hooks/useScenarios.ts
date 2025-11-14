import { useState, useEffect, useCallback } from 'react';
import { scenariosApi } from '../services/api';
import type { ScenarioWithAgents, Scenario } from '../types';

export function useScenarios() {
  const [scenarios, setScenarios] = useState<ScenarioWithAgents[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await scenariosApi.getAll();
      setScenarios(response.data);
    } catch (err: any) {
      console.error('Error fetching scenarios:', err);
      setError(err.message || 'Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const fetchScenariosByCategory = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await scenariosApi.getByCategory(category);
      setScenarios(response.data);
    } catch (err: any) {
      console.error(`Error fetching scenarios for category ${category}:`, err);
      setError(err.message || 'Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  const createScenario = useCallback(
    async (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await scenariosApi.create(data);
        setScenarios((prev) => [response.data, ...prev]);
        return response.data;
      } catch (err: any) {
        console.error('Error creating scenario:', err);
        throw err;
      }
    },
    []
  );

  const updateScenario = useCallback(
    async (id: string, data: Partial<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>) => {
      try {
        const response = await scenariosApi.update(id, data);
        setScenarios((prev) => prev.map((scenario) => (scenario.id === id ? response.data : scenario)));
        return response.data;
      } catch (err: any) {
        console.error('Error updating scenario:', err);
        throw err;
      }
    },
    []
  );

  const deleteScenario = useCallback(async (id: string) => {
    try {
      await scenariosApi.delete(id);
      setScenarios((prev) => prev.filter((scenario) => scenario.id !== id));
    } catch (err: any) {
      console.error('Error deleting scenario:', err);
      throw err;
    }
  }, []);

  return {
    scenarios,
    loading,
    error,
    fetchScenarios,
    fetchScenariosByCategory,
    createScenario,
    updateScenario,
    deleteScenario,
  };
}
