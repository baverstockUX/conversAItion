import { useState, useEffect } from 'react';
import { useAgents } from '../../hooks/useAgents';
import { useScenarios } from '../../hooks/useScenarios';
import type { ScenarioWithAgents, Agent } from '../../types';

interface Props {
  editingScenario: ScenarioWithAgents | null;
  onClose: () => void;
}

export default function ScenarioCreator({ editingScenario, onClose }: Props) {
  const { agents } = useAgents();
  const { createScenario, updateScenario } = useScenarios();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'interview' as 'interview' | 'sales' | 'medical' | 'executive' | 'education' | 'other',
    topic: '',
    agentIds: [] as string[],
    difficultyLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | undefined,
    estimatedDuration: 30,
    recommendedFor: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingScenario) {
      setFormData({
        title: editingScenario.title,
        description: editingScenario.description,
        category: editingScenario.category as any,
        topic: editingScenario.topic,
        agentIds: editingScenario.agentIds,
        difficultyLevel: editingScenario.difficultyLevel as any,
        estimatedDuration: editingScenario.estimatedDuration || 30,
        recommendedFor: editingScenario.recommendedFor || '',
      });
    }
  }, [editingScenario]);

  const handleAgentToggle = (agentId: string) => {
    setFormData((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter((id) => id !== agentId)
        : prev.agentIds.length < 3
        ? [...prev.agentIds, agentId]
        : prev.agentIds,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!formData.topic.trim()) {
      setError('Topic/Prompt is required');
      return;
    }
    if (formData.agentIds.length === 0) {
      setError('Please select at least one agent');
      return;
    }
    if (formData.agentIds.length > 3) {
      setError('Maximum 3 agents allowed');
      return;
    }

    setSaving(true);

    try {
      if (editingScenario) {
        await updateScenario(editingScenario.id, formData);
      } else {
        await createScenario(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const selectedAgents = agents.filter((a) => formData.agentIds.includes(a.id));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass rounded-2xl p-8 max-w-4xl w-full my-8 border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gradient">
            {editingScenario ? 'Edit Scenario' : 'Create New Scenario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scenario Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="e.g., Technical Interview Panel"
            />
          </div>

          {/* Category and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="interview">Interview</option>
                <option value="sales">Sales</option>
                <option value="medical">Medical</option>
                <option value="executive">Executive</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.difficultyLevel || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, difficultyLevel: e.target.value as any || undefined }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">Not specified</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="Brief description of what this scenario involves..."
            />
          </div>

          {/* Topic/Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conversation Topic/Prompt *
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none font-mono text-sm"
              placeholder="The actual conversation starter that will be given to the AI agents. Be specific about the scenario, context, and what the user should expect..."
            />
          </div>

          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Agents (1-3) *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 bg-white/5 rounded-xl border border-white/10">
              {agents.map((agent) => {
                const isSelected = formData.agentIds.includes(agent.id);
                const isDisabled = !isSelected && formData.agentIds.length >= 3;

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => !isDisabled && handleAgentToggle(agent.id)}
                    disabled={isDisabled}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                        : isDisabled
                        ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-200 truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {agent.role}
                        </div>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedAgents.length > 0 && (
              <div className="mt-2 text-sm text-gray-400">
                Selected: {selectedAgents.map((a) => a.name).join(', ')}
              </div>
            )}
          </div>

          {/* Duration and Recommended For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 30 }))}
                min="5"
                max="120"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recommended For
              </label>
              <input
                type="text"
                value={formData.recommendedFor}
                onChange={(e) => setFormData((prev) => ({ ...prev, recommendedFor: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Software engineers with 3-8 years experience"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-gray-200 font-semibold rounded-xl transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingScenario ? 'Update Scenario' : 'Create Scenario'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
