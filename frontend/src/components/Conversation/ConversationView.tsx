import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useAgents } from '../../hooks/useAgents';

export default function ConversationView() {
  const navigate = useNavigate();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Conversation</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
          {error}
          <button onClick={clearError} className="ml-4 text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      {!hasStarted ? (
        /* Setup Phase */
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Agents (1-3)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.length === 0 ? (
                <p className="text-gray-600 col-span-3">
                  No agents available. Please create agents first.
                </p>
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedAgentIds.includes(agent.id)
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/default.png';
                      }}
                    />
                    <h3 className="text-sm font-semibold text-center">{agent.name}</h3>
                    <p className="text-xs text-gray-600 text-center">{agent.role}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conversation Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Technical interview for a senior developer position"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Christian"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Role <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Software Engineer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="agentsStartFirst"
                checked={agentsStartFirst}
                onChange={(e) => setAgentsStartFirst(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agentsStartFirst" className="ml-2 block text-sm text-gray-700">
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
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="agentOnlyMode" className="ml-2 block text-sm text-gray-700">
                Agent-only conversation (agents talk amongst themselves, requires 2+ agents)
              </label>
            </div>
          </div>

          <button
            onClick={handleStartConversation}
            disabled={selectedAgentIds.length === 0 || !topic || (agentOnlyMode && selectedAgentIds.length < 2)}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Start Conversation
          </button>
        </div>
      ) : (
        /* Active Conversation */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents Panel */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Active Agents</h2>
            <div className="space-y-4">
              {selectedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-3 rounded-lg ${
                    status.currentSpeaker === agent.id ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full mr-3 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/default.png';
                      }}
                    />
                    <div>
                      <h3 className="font-semibold text-sm">{agent.name}</h3>
                      <p className="text-xs text-gray-600">{agent.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600 mb-2">
                Status: <span className="font-semibold">{status.conversationStatus}</span>
              </div>
              <div className="space-y-2">
                {!agentOnlyMode && (
                  <>
                    {/* Audio Level Visualization */}
                    {isRecording && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 text-center">Audio Level</div>
                        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-75 ${
                              audioLevel > 80
                                ? 'bg-red-500'
                                : audioLevel > 30
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${audioLevel}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleToggleRecording}
                      disabled={status.conversationStatus === 'speaking'}
                      className={`w-full px-4 py-2 rounded-md ${
                        isRecording
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                    >
                      {isRecording ? '🔴 Stop Recording' : '🎤 Start Speaking'}
                    </button>

                    {/* Keyboard shortcut hint */}
                    {!isRecording && status.conversationStatus !== 'speaking' && (
                      <div className="text-xs text-gray-500 text-center">
                        💡 Tip: Hold <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">SPACE</kbd> to speak
                      </div>
                    )}

                    <button
                      onClick={handleInterrupt}
                      disabled={status.conversationStatus !== 'speaking'}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      ⚠️ Interrupt
                    </button>
                  </>
                )}

                {agentOnlyMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                    <p className="text-sm text-blue-800 text-center">
                      🤖 Agent-Only Mode Active
                    </p>
                    <p className="text-xs text-blue-600 text-center mt-1">
                      Agents are conversing autonomously
                    </p>
                  </div>
                )}

                <button
                  onClick={handleEndConversation}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {agentOnlyMode ? 'Stop Conversation' : 'End Conversation'}
                </button>
              </div>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Transcript</h2>
            <div className="h-96 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-12">
                  No messages yet. Start speaking to begin the conversation!
                </p>
              ) : (
                messages.map((message) => {
                  const speaker =
                    message.speaker === 'user'
                      ? 'You'
                      : selectedAgents.find((a) => a.id === message.speaker)?.name || 'Agent';

                  const isUser = message.speaker === 'user';

                  return (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        isUser ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-sm mr-2">{speaker}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{message.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
