import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useAgents } from '../../hooks/useAgents';

export default function ConversationView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agents } = useAgents();
  const {
    status,
    currentConversationId,
    messages,
    error,
    startConversation,
    sendAudio,
    interrupt,
    endConversation,
    clearError,
  } = useWebSocket();
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();
  const { isPlaying, stop: stopAudio } = useAudioPlayer(); // Initialize audio player

  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [agentsStartFirst, setAgentsStartFirst] = useState(false);
  const [agentOnlyMode, setAgentOnlyMode] = useState(false);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);

  // Auto-detect if conversation was started externally (e.g., from a scenario)
  useEffect(() => {
    const state = location.state as { fromScenario?: boolean; scenarioTitle?: string; agentIds?: string[]; topic?: string; agentsStartFirst?: boolean } | null;

    if (state?.fromScenario && state.agentIds && state.topic) {
      console.log('Conversation started from scenario, auto-populating agents and topic');
      console.log('Scenario agentsStartFirst:', state.agentsStartFirst);

      // Set UI state
      setSelectedAgentIds(state.agentIds);
      setTopic(state.topic);
      setScenarioTitle(state.scenarioTitle || null);
      setAgentsStartFirst(state.agentsStartFirst || false);
      setHasStarted(true);
      setIsLoadingScenario(true); // Show loading until conversation starts

      // Actually start the conversation via WebSocket
      startConversation(
        state.agentIds,
        state.topic,
        state.agentsStartFirst || false,
        false, // agentOnlyMode
        undefined, // userName
        undefined, // userRole
        state.scenarioTitle // title
      );

      // Clear the navigation state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: null });
    } else if (currentConversationId && !hasStarted) {
      console.log('Conversation already started externally, skipping setup');
      setHasStarted(true);
    }
  }, [currentConversationId, hasStarted, location, navigate, startConversation]);

  // Clear loading state when conversation is confirmed started, agents speak, or messages appear
  useEffect(() => {
    if (isLoadingScenario) {
      // Hide loading if conversation started, agents are speaking, or any non-system messages exist
      const hasNonSystemMessages = messages.some(m => m.speaker !== 'system');
      if (currentConversationId || status.conversationStatus === 'speaking' || hasNonSystemMessages) {
        setIsLoadingScenario(false);
      }
    }
  }, [currentConversationId, status.conversationStatus, messages, isLoadingScenario]);

  // Keyboard shortcut: Hold SPACE to record (disabled in agent-only mode)
  useEffect(() => {
    if (!hasStarted || status.conversationStatus === 'speaking' || agentOnlyMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isRecording && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        startRecording();
      }
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording && isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(false);
        try {
          const audioBuffer = await stopRecording();
          sendAudio(audioBuffer);
        } catch (error) {
          console.error('Error stopping recording:', error);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasStarted, status.conversationStatus, isRecording, isSpacePressed, agentOnlyMode, startRecording, stopRecording, sendAudio]);

  const handleStartConversation = () => {
    if (selectedAgentIds.length === 0 || !topic) {
      alert('Please select at least one agent and enter a topic');
      return;
    }

    if (agentOnlyMode && selectedAgentIds.length < 2) {
      alert('Agent-only mode requires at least 2 agents');
      return;
    }

    startConversation(selectedAgentIds, topic, agentsStartFirst, agentOnlyMode, userName, userRole);
    setHasStarted(true);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        const audioBuffer = await stopRecording();
        sendAudio(audioBuffer);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      startRecording();
    }
  };

  const handleEndConversation = async () => {
    endConversation();
    if (currentConversationId) {
      navigate(`/analysis/${currentConversationId}`);
    }
  };

  const handleInterrupt = async () => {
    // Stop any playing audio immediately
    stopAudio();

    // Tell backend to interrupt conversation
    interrupt();

    // Auto-start recording after a brief delay
    setTimeout(() => {
      if (!isRecording && status.conversationStatus === 'idle') {
        startRecording();
      }
    }, 300);
  };

  const toggleAgent = (agentId: string) => {
    if (hasStarted) return;

    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : prev.length < 3
        ? [...prev, agentId]
        : prev
    );
  };

  const selectedAgents = agents.filter((a) => selectedAgentIds.includes(a.id));

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Conversation</h1>
          <p className="text-gray-400">Start a multi-agent voice conversation</p>
        </div>

        {error && (
          <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="text-sm underline hover:no-underline">
              Dismiss
            </button>
          </div>
        )}

        {isLoadingScenario && (
          <div className="glass rounded-2xl p-12 border border-indigo-500/30 mb-6">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                {scenarioTitle && (
                  <h2 className="text-2xl font-bold text-white mb-2">{scenarioTitle}</h2>
                )}
                <p className="text-lg text-indigo-300 font-medium mb-2">Preparing your conversation...</p>
                <p className="text-sm text-gray-400">The agents are getting ready to speak with you</p>
              </div>
            </div>
          </div>
        )}

        {!hasStarted ? (
          /* Setup Phase */
          <div className="glass rounded-2xl p-8 border border-white/10 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Agents (1-3)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.length === 0 ? (
                <p className="text-gray-400 col-span-3 text-center py-8">
                  No agents available. Please create agents first.
                </p>
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all group ${
                      selectedAgentIds.includes(agent.id)
                        ? 'border-indigo-500 bg-indigo-500/10 glow-primary'
                        : 'border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-white/10'
                    }`}
                  >
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-indigo-500/30 group-hover:border-indigo-500/50 transition-all"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/default.png';
                      }}
                    />
                    <h3 className="text-sm font-semibold text-center text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-400 text-center mt-1">{agent.role}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conversation Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="e.g., Technical interview for a senior developer position"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Christian"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Role <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Software Engineer"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="agentsStartFirst"
                checked={agentsStartFirst}
                onChange={(e) => setAgentsStartFirst(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-white/10"
              />
              <label htmlFor="agentsStartFirst" className="ml-3 block text-sm text-gray-300">
                Let agents start the conversation based on the topic
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="agentOnlyMode"
                checked={agentOnlyMode}
                onChange={(e) => {
                  setAgentOnlyMode(e.target.checked);
                  // Auto-enable agents start first if enabling agent-only mode
                  if (e.target.checked) {
                    setAgentsStartFirst(true);
                  }
                }}
                disabled={selectedAgentIds.length < 2}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-white/10 disabled:opacity-50"
              />
              <label htmlFor="agentOnlyMode" className="ml-3 block text-sm text-gray-300">
                Agent-only conversation (agents talk amongst themselves, requires 2+ agents)
              </label>
            </div>
          </div>

          <button
            onClick={handleStartConversation}
            disabled={selectedAgentIds.length === 0 || !topic || (agentOnlyMode && selectedAgentIds.length < 2)}
            className="w-full px-6 py-4 gradient-primary rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 glow-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Conversation
          </button>
        </div>
      ) : (
        /* Active Conversation */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents Panel */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            {scenarioTitle && (
              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-sm font-medium">Scenario</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{scenarioTitle}</h3>
                {topic && (
                  <p className="text-sm text-gray-400 line-clamp-3">{topic}</p>
                )}
              </div>
            )}
            <h2 className="text-xl font-bold text-white mb-6">Active Agents</h2>
            <div className="space-y-3">
              {selectedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-xl transition-all ${
                    status.currentSpeaker === agent.id
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 glow-accent'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/30"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/avatars/default.png';
                        }}
                      />
                      {status.currentSpeaker === agent.id && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-950 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-white">{agent.name}</h3>
                      <p className="text-xs text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span>Status:</span>
                <span className="font-semibold text-white">{status.conversationStatus}</span>
              </div>
              <div className="space-y-3">
                {!agentOnlyMode && (
                  <>
                    {/* Audio Level Visualization */}
                    {isRecording && (
                      <div className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-xs text-gray-400 text-center font-medium">Audio Level</div>
                        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                          <div
                            className={`h-full transition-all duration-75 ${
                              audioLevel > 80
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : audioLevel > 30
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-gray-600'
                            }`}
                            style={{ width: `${audioLevel}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleToggleRecording}
                      disabled={status.conversationStatus === 'speaking'}
                      className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                        isRecording
                          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 glow-secondary'
                          : 'gradient-accent text-white hover:scale-105 glow-accent'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                    >
                      {isRecording ? (
                        <>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span>Stop Recording</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <span>Start Speaking</span>
                        </>
                      )}
                    </button>

                    {/* Keyboard shortcut hint */}
                    {!isRecording && status.conversationStatus !== 'speaking' && (
                      <div className="text-xs text-gray-400 text-center p-2 bg-white/5 rounded-lg border border-white/10">
                        💡 Tip: Hold <kbd className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-300 font-mono">SPACE</kbd> to speak
                      </div>
                    )}

                    <button
                      onClick={handleInterrupt}
                      disabled={status.conversationStatus !== 'speaking'}
                      className="w-full px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl font-medium transition-all border border-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Interrupt
                    </button>
                  </>
                )}

                {agentOnlyMode && (
                  <div className="bg-indigo-500/20 border border-indigo-500/50 rounded-xl p-4">
                    <p className="text-sm text-indigo-300 text-center font-medium flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Agent-Only Mode Active
                    </p>
                    <p className="text-xs text-indigo-400 text-center mt-2">
                      Agents are conversing autonomously
                    </p>
                  </div>
                )}

                <button
                  onClick={handleEndConversation}
                  className="w-full px-4 py-3 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-xl font-medium transition-all border border-gray-600/50 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  {agentOnlyMode ? 'Stop Conversation' : 'End Conversation'}
                </button>
              </div>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Transcript
            </h2>
            <div className="h-96 overflow-y-auto space-y-3 pr-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No messages yet.</p>
                  <p className="text-gray-500 text-sm mt-1">Start speaking to begin the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const speaker =
                    message.speaker === 'user'
                      ? 'You'
                      : selectedAgents.find((a) => a.id === message.speaker)?.name || 'Agent';

                  const isUser = message.speaker === 'user';
                  const agentData = selectedAgents.find((a) => a.id === message.speaker);

                  return (
                    <div
                      key={message.id}
                      className={`group ${
                        isUser ? 'ml-8' : 'mr-8'
                      }`}
                    >
                      <div className={`p-4 rounded-xl backdrop-blur-sm transition-all ${
                        isUser
                          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30'
                          : 'bg-white/5 border border-white/10 group-hover:bg-white/10'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {!isUser && agentData && (
                            <img
                              src={agentData.avatarUrl}
                              alt={agentData.name}
                              className="w-6 h-6 rounded-full border border-indigo-500/30"
                            />
                          )}
                          <span className="font-semibold text-sm text-white">{speaker}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{message.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
