import { useState, useEffect } from 'react';
import { useAgents } from '../../hooks/useAgents';
import { voicesApi } from '../../services/api';
import type { Agent, ElevenLabsVoice } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to get full avatar URL
const getAvatarUrl = (avatarUrl: string): string => {
  // If it starts with /uploads, prepend the API base URL
  if (avatarUrl.startsWith('/uploads')) {
    return `${API_BASE_URL}${avatarUrl}`;
  }
  // Otherwise return as-is (for default avatars or external URLs)
  return avatarUrl;
};

// Helper function to generate avatar URL using DiceBear API
const generateAvatarUrl = (name: string): string => {
  // Use DiceBear's avataaars style with the agent's name as seed
  // This ensures consistent avatars for the same name
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

export default function AgentCreator() {
  const { agents, loading, createAgent, deleteAgent, uploadAvatar } = useAgents();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    persona: '',
    voiceId: '',
    avatarUrl: generateAvatarUrl(''),
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
        avatarUrl: generateAvatarUrl(''),
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
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: newName,
                    // Auto-generate avatar URL based on name (if no custom avatar uploaded)
                    avatarUrl: prev.avatarUrl.startsWith('/uploads') ? prev.avatarUrl : generateAvatarUrl(newName)
                  }));
                }}
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
                {voices.map((voice) => {
                  // Build voice description from labels
                  const labels = voice.labels || {};
                  const accent = labels.accent;
                  const gender = labels.gender;
                  const age = labels.age;
                  const useCase = labels['use case'];

                  // Create a descriptive label
                  const parts = [voice.name];
                  if (accent) parts.push(`${accent}`);
                  if (gender) parts.push(`${gender}`);
                  if (age) parts.push(`${age}`);

                  const displayName = parts.join(' • ');

                  return (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avatar Preview
              </label>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={formData.avatarUrl}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    {formData.avatarUrl.startsWith('https://api.dicebear.com')
                      ? '✨ Auto-generated avatar based on name'
                      : '📤 Custom uploaded avatar'}
                  </p>
                  <label className="cursor-pointer inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">
                    Upload Custom Avatar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
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
                src={getAvatarUrl(agent.avatarUrl)}
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
