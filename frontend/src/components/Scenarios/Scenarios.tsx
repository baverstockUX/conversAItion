import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenarios } from '../../hooks/useScenarios';
import { useWebSocket } from '../../hooks/useWebSocket';
import ScenarioCreator from './ScenarioCreator';
import type { ScenarioWithAgents } from '../../types';

export default function Scenarios() {
  const navigate = useNavigate();
  const { scenarios, loading, deleteScenario } = useScenarios();
  const { startConversation } = useWebSocket();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreator, setShowCreator] = useState(false);
  const [editingScenario, setEditingScenario] = useState<ScenarioWithAgents | null>(null);

  // Filter scenarios by category
  const filteredScenarios = useMemo(() => {
    if (selectedCategory === 'all') return scenarios;
    return scenarios.filter(s => s.category === selectedCategory);
  }, [scenarios, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(scenarios.map(s => s.category));
    return ['all', ...Array.from(cats)];
  }, [scenarios]);

  const handleStartScenario = (scenario: ScenarioWithAgents) => {
    // Start conversation directly with scenario's agents and topic
    startConversation(
      scenario.agentIds,
      scenario.topic,
      scenario.agentsStartFirst || false,
      false, // agentOnlyMode
      undefined, // userName
      undefined, // userRole
      scenario.title // Use scenario title as conversation title
    );

    // Navigate to conversation page with scenario state
    navigate('/conversation', {
      state: {
        fromScenario: true,
        scenarioTitle: scenario.title,
        agentIds: scenario.agentIds,
        topic: scenario.topic,
      }
    });
  };

  const handleEdit = (scenario: ScenarioWithAgents) => {
    setEditingScenario(scenario);
    setShowCreator(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      try {
        await deleteScenario(id);
      } catch (error) {
        console.error('Failed to delete scenario:', error);
      }
    }
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
    setEditingScenario(null);
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'interview':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'sales':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'medical':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'executive':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'education':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (loading && scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-400">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">
                Practice Scenarios
              </h1>
              <p className="text-gray-400">
                Choose a pre-made scenario to practice real-world situations with AI agents
              </p>
            </div>
            <button
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Scenario
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-indigo-500/20 text-indigo-300 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                    : 'glass text-gray-400 hover:text-gray-300 border border-white/10 hover:border-white/20'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scenarios Grid */}
        {filteredScenarios.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-2">No scenarios found</h3>
            <p className="text-gray-400 mb-6">
              {selectedCategory === 'all'
                ? 'Create your first scenario to get started'
                : `No scenarios in the ${selectedCategory} category yet`}
            </p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300"
            >
              Create Scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col"
              >
                {/* Category and Difficulty Badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(scenario.category)}`}>
                    {scenario.category.charAt(0).toUpperCase() + scenario.category.slice(1)}
                  </span>
                  {scenario.difficultyLevel && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(scenario.difficultyLevel)}`}>
                      {scenario.difficultyLevel.charAt(0).toUpperCase() + scenario.difficultyLevel.slice(1)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-100 mb-3">
                  {scenario.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-4 flex-grow line-clamp-3">
                  {scenario.description}
                </p>

                {/* Agent Avatars */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {scenario.agents.slice(0, 3).map((agent, idx) => (
                      <img
                        key={agent.id}
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-8 h-8 rounded-full border-2 border-gray-900 hover:z-10 hover:scale-110 transition-transform"
                        title={agent.name}
                        style={{ zIndex: 3 - idx }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {scenario.agents.length} agent{scenario.agents.length !== 1 ? 's' : ''}
                  </span>
                  {scenario.estimatedDuration && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs text-gray-500">
                        ~{scenario.estimatedDuration} min
                      </span>
                    </>
                  )}
                </div>

                {/* Recommended For */}
                {scenario.recommendedFor && (
                  <p className="text-xs text-gray-500 mb-4 italic">
                    For: {scenario.recommendedFor}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleStartScenario(scenario)}
                    className="flex-1 px-4 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start
                  </button>
                  <button
                    onClick={() => handleEdit(scenario)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-gray-200 rounded-xl transition-all border border-white/10 hover:border-white/20"
                    title="Edit scenario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(scenario.id)}
                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40"
                    title="Delete scenario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scenario Creator Modal */}
      {showCreator && (
        <ScenarioCreator
          editingScenario={editingScenario}
          onClose={handleCloseCreator}
        />
      )}
    </div>
  );
}
