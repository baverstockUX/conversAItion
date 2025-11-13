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
  const { agents, loading, createAgent, updateAgent, deleteAgent, uploadAvatar } = useAgents();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    persona: '',
    voiceId: '',
    avatarUrl: generateAvatarUrl(''),
    usesExpletives: false,
  });

  useEffect(() => {
    // Fetch voices
    voicesApi.getAll().then((res) => setVoices(res.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, formData);
        setEditingAgent(null);
      } else {
        await createAgent(formData);
      }
      setShowForm(false);
      setFormData({
        name: '',
        role: '',
        persona: '',
        voiceId: '',
        avatarUrl: generateAvatarUrl(''),
        usesExpletives: false,
      });
    } catch (error) {
      console.error('Error saving agent:', error);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      role: agent.role,
      persona: agent.persona,
      voiceId: agent.voiceId,
      avatarUrl: agent.avatarUrl,
      usesExpletives: agent.usesExpletives,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      role: '',
      persona: '',
      voiceId: '',
      avatarUrl: generateAvatarUrl(''),
      usesExpletives: false,
    });
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
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Agents</h1>
            <p className="text-gray-400">Design agents with custom personalities and voices</p>
          </div>
          <button
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
            className="group px-6 py-3 gradient-primary rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 glow-primary flex items-center gap-2"
          >
            {showForm ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Agent</span>
              </>
            )}
          </button>
        </div>

      {showForm && (
        <div className="glass rounded-2xl p-8 mb-12 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingAgent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Dr. Sarah Chen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Senior Technical Interviewer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Persona</label>
              <textarea
                required
                rows={4}
                value={formData.persona}
                onChange={(e) => setFormData((prev) => ({ ...prev, persona: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe the agent's personality, speaking style, and characteristics..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
              <select
                required
                value={formData.voiceId}
                onChange={(e) => setFormData((prev) => ({ ...prev, voiceId: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="" className="bg-gray-900">Select a voice...</option>
                {voices.map((voice) => {
                  // Build voice description from labels
                  const labels = voice.labels || {};
                  const accent = labels.accent;
                  const gender = labels.gender;
                  const age = labels.age;

                  // Create a descriptive label
                  const parts = [voice.name];
                  if (accent) parts.push(`${accent}`);
                  if (gender) parts.push(`${gender}`);
                  if (age) parts.push(`${age}`);

                  const displayName = parts.join(' • ');

                  return (
                    <option key={voice.voice_id} value={voice.voice_id} className="bg-gray-900">
                      {displayName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <input
                type="checkbox"
                id="usesExpletives"
                checked={formData.usesExpletives}
                onChange={(e) => setFormData((prev) => ({ ...prev, usesExpletives: e.target.checked }))}
                className="w-5 h-5 text-indigo-500 bg-white/10 border-white/20 rounded focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <label htmlFor="usesExpletives" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-gray-300 mb-1">Use Expletives</div>
                <div className="text-xs text-gray-400">
                  Agent will use strong language and swearing when it fits their personality
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Avatar Preview
              </label>
              <div className="flex items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/10">
                <img
                  src={formData.avatarUrl}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500/30 shadow-xl"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                    {formData.avatarUrl.startsWith('https://api.dicebear.com') ? (
                      <>
                        <span className="text-lg">✨</span>
                        <span>Auto-generated avatar based on name</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">📤</span>
                        <span>Custom uploaded avatar</span>
                      </>
                    )}
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
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
              className="w-full px-6 py-4 gradient-primary rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 glow-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {editingAgent ? 'Update Agent' : 'Create Agent'}
            </button>
          </form>
        </div>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-gray-400 mt-4">Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl border border-white/10">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-gray-400 text-lg">No agents yet. Create your first agent to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="glass glass-hover rounded-2xl p-6 group border border-white/10">
              <div className="relative mb-4">
                <img
                  src={getAvatarUrl(agent.avatarUrl)}
                  alt={agent.name}
                  className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-indigo-500/30 group-hover:border-indigo-500/50 transition-all shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/default.png';
                  }}
                />
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded-full border border-indigo-500/30">
                    Active
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2 text-white">{agent.name}</h3>
              <p className="text-sm text-indigo-300 text-center mb-4 font-medium">{agent.role}</p>
              <p className="text-sm text-gray-400 mb-4 line-clamp-3 leading-relaxed">{agent.persona}</p>

              {agent.usesExpletives && (
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-medium rounded-full border border-orange-500/30">
                    🔥 Uses Expletives
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(agent)}
                  className="flex-1 px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-xl font-medium transition-all border border-indigo-500/30 hover:border-indigo-500/50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => deleteAgent(agent.id)}
                  className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl font-medium transition-all border border-red-500/30 hover:border-red-500/50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
