import { useState, useEffect } from 'react';
import { useAgents } from '../../hooks/useAgents';
import { voicesApi } from '../../services/api';
import type { Agent, ElevenLabsVoice } from '../../types';

export default function AgentCreator() {
  const { agents, loading, createAgent, deleteAgent, uploadAvatar } = useAgents();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    persona: '',
    voiceId: '',
    avatarUrl: '/avatars/default.png',
  });

  useEffect(() => {
    // Fetch voices
    voicesApi.getAll().then((res) => setVoices(res.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAgent(formData);
      setShowForm(false);
      setFormData({
        name: '',
        role: '',
        persona: '',
        voiceId: '',
        avatarUrl: '/avatars/default.png',
      });
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const avatarUrl = await uploadAvatar(file);
      setFormData((prev) => ({ ...prev, avatarUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : '+ Create Agent'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Agent</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Dr. Sarah Chen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Senior Technical Interviewer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <textarea
                required
                rows={4}
                value={formData.persona}
                onChange={(e) => setFormData((prev) => ({ ...prev, persona: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the agent's personality, speaking style, and characteristics..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
              <select
                required
                value={formData.voiceId}
                onChange={(e) => setFormData((prev) => ({ ...prev, voiceId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a voice...</option>
                {voices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Create Agent
            </button>
          </form>
        </div>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-12">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600">No agents yet. Create your first agent to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white p-6 rounded-lg shadow-md">
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/avatars/default.png';
                }}
              />
              <h3 className="text-lg font-semibold text-center mb-1">{agent.name}</h3>
              <p className="text-sm text-gray-600 text-center mb-4">{agent.role}</p>
              <p className="text-sm text-gray-700 mb-4 line-clamp-3">{agent.persona}</p>
              <button
                onClick={() => deleteAgent(agent.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
