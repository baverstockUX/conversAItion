import { Agent, Message, AgentResponse } from '../../shared/types';
import { ClaudeService } from './services/claude.service';
import { LMStudioService } from './services/lmstudio.service';
import { TTSService } from './services/tts.service';
import { STTService } from './services/stt.service';
import { ConversationModel } from './models/conversation.model';
import { AgentModel } from './models/agent.model';
import { EventEmitter } from 'events';

export interface ConversationState {
  id: string;
  agentIds: string[];
  agents: Agent[];
  topic: string;
  messages: Message[];
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  currentSpeaker?: string;
  isInterrupted: boolean;
  audioPlaybackResolver?: () => void;
  agentOnlyMode: boolean;
  preparedFollowUp?: {
    agentId: string;
    agentName: string;
    text: string;
    audioBuffer: Buffer;
    preparationStartTime: number;
  };
}

export class ConversationOrchestrator extends EventEmitter {
  private conversations: Map<string, ConversationState> = new Map();

  constructor() {
    super();

    // Listen for audio playback completion events
    this.on('audio:playback:ended', () => {
      // Find the conversation that's currently speaking and resolve its audio promise
      for (const [conversationId, state] of this.conversations.entries()) {
        if (state.status === 'speaking' && state.audioPlaybackResolver) {
          console.log(`Audio playback ended for conversation ${conversationId}`);
          state.audioPlaybackResolver();
          state.audioPlaybackResolver = undefined;
          break;
        }
      }
    });
  }

  /**
   * Start a new conversation
   */
  async startConversation(conversationId: string, agentIds: string[], topic: string, agentsStartFirst: boolean = false, agentOnlyMode: boolean = false): Promise<void> {
    // Validate agents exist
    const agents = AgentModel.findByIds(agentIds);

    if (agents.length !== agentIds.length) {
      throw new Error('One or more agents not found');
    }

    if (agents.length === 0 || agents.length > 3) {
      throw new Error('Must have 1-3 agents');
    }

    if (agentOnlyMode && agents.length < 2) {
      throw new Error('Agent-only mode requires at least 2 agents');
    }

    // Initialize conversation state
    const state: ConversationState = {
      id: conversationId,
      agentIds,
      agents,
      topic,
      messages: [],
      status: 'idle',
      isInterrupted: false,
      agentOnlyMode,
    };

    this.conversations.set(conversationId, state);

    this.emit('conversation:started', conversationId, agents);

    // If agents should start first (or agent-only mode), inject a system message and trigger agent response
    if (agentsStartFirst || agentOnlyMode) {
      console.log(`Agents starting conversation about: ${topic}${agentOnlyMode ? ' (agent-only mode)' : ''}`);

      // Create a system message to provide context
      const systemMessage = ConversationModel.addMessage({
        conversationId,
        speaker: 'system',
        text: `The conversation topic is: ${topic}`,
      });

      state.messages.push(systemMessage);

      // Trigger initial agent response asynchronously (don't block)
      // This allows the frontend to receive conversation:started immediately
      setImmediate(() => {
        this.generateAgentResponse(conversationId).catch((error) => {
          console.error('Error in agent-first response:', error);
          this.emit('error', conversationId, error.message);
        });
      });
    }
  }

  /**
   * Process user speech input
   */
  async processUserSpeech(conversationId: string, audioBuffer: Buffer): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state) {
      throw new Error('Conversation not found');
    }

    try {
      // Update status to listening
      state.status = 'listening';
      this.emit('status:update', conversationId, 'listening');

      // Transcribe audio
      const text = await STTService.transcribe(audioBuffer);

      if (!text || text.trim().length === 0) {
        this.emit('error', conversationId, 'No speech detected');
        state.status = 'idle';
        return;
      }

      // Add user message to conversation
      const message = ConversationModel.addMessage({
        conversationId,
        speaker: 'user',
        text: text.trim(),
      });

      state.messages.push(message);

      this.emit('transcript:update', conversationId, message);

      // Trigger agent response
      await this.generateAgentResponse(conversationId);
    } catch (error: any) {
      console.error('Error processing user speech:', error);
      this.emit('error', conversationId, error.message);
      state.status = 'idle';
    }
  }

  /**
   * Generate and select best agent response using natural competition
   */
  private async generateAgentResponse(conversationId: string): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state) {
      throw new Error('Conversation not found');
    }

    try {
      // Update status to thinking
      state.status = 'thinking';
      this.emit('status:update', conversationId, 'thinking');

      // Reset interruption flag
      state.isInterrupted = false;

      // Check if user addressed a specific agent by name
      const lastUserMessage = state.messages.slice().reverse().find(m => m.speaker === 'user');
      let addressedAgent: Agent | null = null;

      if (lastUserMessage) {
        const messageText = lastUserMessage.text.toLowerCase().trim();
        console.log(`Checking if user addressed specific agent in: "${lastUserMessage.text}"`);

        // Check if any agent's name is mentioned at the start of the message
        for (const agent of state.agents) {
          // Get first name and full name
          const fullName = agent.name.toLowerCase();
          const firstName = fullName.split(' ')[0];

          // Split message into words for better matching
          const words = messageText.split(/\s+/);
          const firstThreeWords = words.slice(0, 3).join(' ');

          // Check various patterns in the first few words
          const patterns = [
            fullName,                          // "marcus chen"
            firstName,                         // "marcus"
            `hey ${fullName}`,                 // "hey marcus chen"
            `hey ${firstName}`,                // "hey marcus"
            `hi ${fullName}`,                  // "hi marcus chen"
            `hi ${firstName}`,                 // "hi marcus"
            `${fullName},`,                    // "marcus chen,"
            `${firstName},`,                   // "marcus,"
            `${fullName}:`,                    // "marcus chen:"
            `${firstName}:`,                   // "marcus:"
          ];

          // Check if any pattern matches the beginning of the message
          const isAddressed = patterns.some(pattern =>
            firstThreeWords.includes(pattern) ||
            messageText.startsWith(pattern)
          );

          if (isAddressed) {
            addressedAgent = agent;
            console.log(`✓ User addressed ${agent.name} specifically (matched: ${firstName})`);
            break;
          }
        }

        if (!addressedAgent) {
          console.log(`No specific agent addressed, all agents will respond`);
        }
      }

      // If a specific agent was addressed, only that agent should respond
      const agentsToRespond = addressedAgent ? [addressedAgent] : state.agents;

      // Generate responses from agents
      // HYBRID MODE: Use LM Studio (fast, local) for responses, Claude (accurate) for scoring
      // Falls back to Claude-only if LM Studio is unavailable
      const responsePromises = agentsToRespond.map(async (agent) => {
        let text: string;
        let score: number;

        try {
          // Try LM Studio for fast local inference
          text = await LMStudioService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
          // Use Claude for accurate scoring (determines turn-taking)
          score = await ClaudeService.scoreResponse(agent, text, state.messages);
        } catch (error: any) {
          // Fallback to Claude for both response and scoring if LM Studio unavailable
          if (error.message.includes('LM Studio server not running')) {
            console.log(`LM Studio unavailable, falling back to Claude for ${agent.name}`);
            text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
            score = await ClaudeService.scoreResponse(agent, text, state.messages);
          } else {
            throw error;
          }
        }

        return {
          agentId: agent.id,
          text,
          score,
        } as AgentResponse;
      });

      const responses = await Promise.all(responsePromises);

      // Check if interrupted during generation
      if (state.isInterrupted) {
        console.log('Agent response generation interrupted');
        state.isInterrupted = false;
        state.status = 'idle';
        return;
      }

      // Select best response
      const bestResponse = responses.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      const selectedAgent = state.agents.find(a => a.id === bestResponse.agentId)!;

      // Update status to speaking
      state.status = 'speaking';
      state.currentSpeaker = selectedAgent.id;
      this.emit('status:update', conversationId, 'speaking');
      this.emit('agent:speaking', conversationId, selectedAgent.id, bestResponse.text);

      // Add agent message to conversation
      const message = ConversationModel.addMessage({
        conversationId,
        speaker: selectedAgent.id,
        text: bestResponse.text,
      });

      state.messages.push(message);

      this.emit('transcript:update', conversationId, message);

      // Generate audio using streaming TTS (faster than non-streaming)
      console.log('Generating audio with streaming TTS...');
      const audioStream = await TTSService.synthesizeStream(bestResponse.text, selectedAgent.voiceId);

      // Buffer chunks as they arrive from ElevenLabs (fast local operation)
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      console.log(`Audio stream complete, total size: ${audioBuffer.length} bytes`);

      // Check if interrupted during TTS
      if (state.isInterrupted) {
        console.log('TTS interrupted');
        state.isInterrupted = false;
        state.status = 'idle';
        state.currentSpeaker = undefined;
        return;
      }

      // Send complete audio to frontend
      this.emit('agent:audio', conversationId, audioBuffer);

      // Wait for frontend to signal audio playback completion
      console.log('Waiting for frontend audio playback to complete...');

      await new Promise<void>((resolve) => {
        // Store resolver so it can be called when audio ends
        state.audioPlaybackResolver = resolve;

        // Also check for interrupts every 100ms
        const checkInterval = setInterval(() => {
          if (state.isInterrupted) {
            console.log('Audio playback interrupted by user');
            clearInterval(checkInterval);
            state.isInterrupted = false;
            state.status = 'idle';
            state.currentSpeaker = undefined;
            state.audioPlaybackResolver = undefined;
            this.emit('status:update', conversationId, 'idle');
            resolve();
          }
        }, 100);

        // Clean up interval when audio ends naturally
        const originalResolver = state.audioPlaybackResolver;
        state.audioPlaybackResolver = () => {
          clearInterval(checkInterval);
          if (originalResolver) {
            originalResolver();
          }
          resolve();
        };
      });

      // Check if another agent wants to continue the conversation
      if (state.agents.length > 1 && !state.isInterrupted) {
        if (state.agentOnlyMode) {
          // In agent-only mode, always continue with another agent
          await this.continueAgentOnlyConversation(conversationId, selectedAgent.id);
        } else {
          // Regular multi-turn conversation logic
          await this.continueConversation(conversationId, selectedAgent.id);
        }
      } else {
        // Single agent or interrupted - return to idle
        state.status = 'idle';
        state.currentSpeaker = undefined;
        this.emit('status:update', conversationId, 'idle');
      }
    } catch (error: any) {
      console.error('Error generating agent response:', error);
      this.emit('error', conversationId, error.message);
      state.status = 'idle';
      state.currentSpeaker = undefined;
    }
  }

  /**
   * Helper method to continue multi-turn conversation after an agent speaks
   */
  private async continueConversation(conversationId: string, lastSpeakerId: string): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state || state.isInterrupted) {
      return;
    }

    // Check if we've hit the maximum number of agent turns
    const turnsSinceUser = state.messages.slice().reverse().findIndex(m => m.speaker === 'user');
    const MAX_AGENT_TURNS = 3;

    if (turnsSinceUser >= MAX_AGENT_TURNS) {
      // Reached maximum, return to idle
      state.status = 'idle';
      state.currentSpeaker = undefined;
      this.emit('status:update', conversationId, 'idle');
      return;
    }

    // Generate responses from OTHER agents (exclude the one who just spoke)
    const otherAgents = state.agents.filter(a => a.id !== lastSpeakerId);

    if (otherAgents.length === 0) {
      // No other agents, return to idle
      state.status = 'idle';
      state.currentSpeaker = undefined;
      this.emit('status:update', conversationId, 'idle');
      return;
    }

    const followUpPromises = otherAgents.map(async (agent) => {
      // HYBRID MODE: LM Studio for response generation, Claude for scoring
      // Falls back to Claude-only if LM Studio is unavailable
      let text: string;
      let score: number;

      try {
        text = await LMStudioService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
        score = await ClaudeService.scoreResponse(agent, text, state.messages);
      } catch (error: any) {
        // Fallback to Claude for both response and scoring if LM Studio unavailable
        if (error.message.includes('LM Studio server not running')) {
          console.log(`LM Studio unavailable, falling back to Claude for ${agent.name}`);
          text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
          score = await ClaudeService.scoreResponse(agent, text, state.messages);
        } else {
          throw error;
        }
      }

      return { agentId: agent.id, text, score } as AgentResponse;
    });

    const followUpResponses = await Promise.all(followUpPromises);

    // Find the best follow-up response
    const bestFollowUp = followUpResponses.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Only continue if the follow-up score is high enough
    const MIN_SCORE_THRESHOLD = 6;

    if (bestFollowUp.score < MIN_SCORE_THRESHOLD || state.isInterrupted) {
      // No one has anything meaningful to say, return to idle
      state.status = 'idle';
      state.currentSpeaker = undefined;
      this.emit('status:update', conversationId, 'idle');
      return;
    }

    // Have this agent speak
    console.log(`Continuation: Agent responding with score ${bestFollowUp.score}/10`);

    const followUpAgent = state.agents.find(a => a.id === bestFollowUp.agentId)!;

    state.status = 'speaking';
    state.currentSpeaker = followUpAgent.id;
    this.emit('status:update', conversationId, 'speaking');
    this.emit('agent:speaking', conversationId, followUpAgent.id, bestFollowUp.text);

    const followUpMessage = ConversationModel.addMessage({
      conversationId,
      speaker: followUpAgent.id,
      text: bestFollowUp.text,
    });

    state.messages.push(followUpMessage);
    this.emit('transcript:update', conversationId, followUpMessage);

    // Generate audio using streaming for lower latency
    console.log('Streaming follow-up audio with real-time playback...');
    const audioStream = await TTSService.synthesizeStream(bestFollowUp.text, followUpAgent.voiceId);

    // Buffer chunks as they arrive from ElevenLabs (fast local operation)
    const followUpChunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      // Check for interruption during streaming
      if (state.isInterrupted) {
        console.log('Follow-up audio streaming interrupted');
        state.isInterrupted = false;
        state.status = 'idle';
        state.currentSpeaker = undefined;
        return;
      }

      followUpChunks.push(chunk);
    }
    const followUpAudioBuffer = Buffer.concat(followUpChunks);
    console.log(`Follow-up audio stream complete, total size: ${followUpAudioBuffer.length} bytes`);

    // Send complete audio to frontend
    this.emit('agent:audio', conversationId, followUpAudioBuffer);

    // Wait for frontend to signal audio playback completion
    console.log('Waiting for frontend follow-up audio playback to complete...');

    await new Promise<void>((resolve) => {
      // Store resolver so it can be called when audio ends
      state.audioPlaybackResolver = resolve;

      // Also check for interrupts every 100ms
      const checkInterval = setInterval(() => {
        if (state.isInterrupted) {
          console.log('Follow-up audio interrupted by user');
          clearInterval(checkInterval);
          state.isInterrupted = false;
          state.status = 'idle';
          state.currentSpeaker = undefined;
          state.audioPlaybackResolver = undefined;
          this.emit('status:update', conversationId, 'idle');
          resolve();
        }
      }, 100);

      // Clean up interval when audio ends naturally
      const originalResolver = state.audioPlaybackResolver;
      state.audioPlaybackResolver = () => {
        clearInterval(checkInterval);
        if (originalResolver) {
          originalResolver();
        }
        resolve();
      };
    });

    // Recursively check for more follow-ups
    await this.continueConversation(conversationId, followUpAgent.id);
  }

  /**
   * Helper method for agent-only mode - automatically continue conversation between agents
   */
  private async continueAgentOnlyConversation(conversationId: string, lastSpeakerId: string): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state || state.isInterrupted) {
      return;
    }

    // In agent-only mode, always have another agent respond (no turn limit, no score threshold)
    // Generate responses from OTHER agents (exclude the one who just spoke)
    const otherAgents = state.agents.filter(a => a.id !== lastSpeakerId);

    if (otherAgents.length === 0) {
      // Only one agent - can't have a conversation
      state.status = 'idle';
      state.currentSpeaker = undefined;
      this.emit('status:update', conversationId, 'idle');
      return;
    }

    const followUpPromises = otherAgents.map(async (agent) => {
      // HYBRID MODE: LM Studio for response generation, Claude for scoring
      // Falls back to Claude-only if LM Studio is unavailable
      let text: string;
      let score: number;

      try {
        text = await LMStudioService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
        score = await ClaudeService.scoreResponse(agent, text, state.messages);
      } catch (error: any) {
        // Fallback to Claude for both response and scoring if LM Studio unavailable
        if (error.message.includes('LM Studio server not running')) {
          console.log(`LM Studio unavailable, falling back to Claude for ${agent.name}`);
          text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
          score = await ClaudeService.scoreResponse(agent, text, state.messages);
        } else {
          throw error;
        }
      }

      return { agentId: agent.id, text, score } as AgentResponse;
    });

    const followUpResponses = await Promise.all(followUpPromises);

    // Find the best follow-up response
    const bestFollowUp = followUpResponses.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // In agent-only mode, always continue (no score threshold check)
    if (state.isInterrupted) {
      // Only stop if interrupted
      state.status = 'idle';
      state.currentSpeaker = undefined;
      this.emit('status:update', conversationId, 'idle');
      return;
    }

    // Have this agent speak
    console.log(`Agent-only mode: ${bestFollowUp.agentId} responding with score ${bestFollowUp.score}/10`);

    const followUpAgent = state.agents.find(a => a.id === bestFollowUp.agentId)!;

    state.status = 'speaking';
    state.currentSpeaker = followUpAgent.id;
    this.emit('status:update', conversationId, 'speaking');
    this.emit('agent:speaking', conversationId, followUpAgent.id, bestFollowUp.text);

    const followUpMessage = ConversationModel.addMessage({
      conversationId,
      speaker: followUpAgent.id,
      text: bestFollowUp.text,
    });

    state.messages.push(followUpMessage);
    this.emit('transcript:update', conversationId, followUpMessage);

    // Generate audio using streaming for lower latency
    console.log('Streaming agent-only audio with real-time playback...');
    const audioStream = await TTSService.synthesizeStream(bestFollowUp.text, followUpAgent.voiceId);

    // Buffer chunks as they arrive from ElevenLabs (fast local operation)
    const followUpChunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      // Check for interruption during streaming
      if (state.isInterrupted) {
        console.log('Agent-only audio streaming interrupted');
        state.isInterrupted = false;
        state.status = 'idle';
        state.currentSpeaker = undefined;
        return;
      }

      followUpChunks.push(chunk);
    }
    const followUpAudioBuffer = Buffer.concat(followUpChunks);
    console.log(`Agent-only audio stream complete, total size: ${followUpAudioBuffer.length} bytes`);

    // Send complete audio to frontend
    this.emit('agent:audio', conversationId, followUpAudioBuffer);

    // Wait for frontend to signal audio playback completion
    console.log('Waiting for frontend agent-only audio playback to complete...');

    await new Promise<void>((resolve) => {
      // Store resolver so it can be called when audio ends
      state.audioPlaybackResolver = resolve;

      // Also check for interrupts every 100ms
      const checkInterval = setInterval(() => {
        if (state.isInterrupted) {
          console.log('Agent-only audio interrupted by user');
          clearInterval(checkInterval);
          state.isInterrupted = false;
          state.status = 'idle';
          state.currentSpeaker = undefined;
          state.audioPlaybackResolver = undefined;
          this.emit('status:update', conversationId, 'idle');
          resolve();
        }
      }, 100);

      // Clean up interval when audio ends naturally
      const originalResolver = state.audioPlaybackResolver;
      state.audioPlaybackResolver = () => {
        clearInterval(checkInterval);
        if (originalResolver) {
          originalResolver();
        }
        resolve();
      };
    });

    // Recursively continue the agent-only conversation
    await this.continueAgentOnlyConversation(conversationId, followUpAgent.id);
  }

  /**
   * Handle user interruption
   */
  interruptConversation(conversationId: string): void {
    const state = this.conversations.get(conversationId);

    if (!state) {
      throw new Error('Conversation not found');
    }

    // Set interruption flag
    state.isInterrupted = true;
    state.status = 'idle';
    state.currentSpeaker = undefined;

    this.emit('conversation:interrupted', conversationId);
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state) {
      throw new Error('Conversation not found');
    }

    // Mark conversation as completed
    ConversationModel.complete(conversationId);

    // Clean up state
    this.conversations.delete(conversationId);

    this.emit('conversation:ended', conversationId);
  }

  /**
   * Get conversation state
   */
  getConversationState(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): string[] {
    return Array.from(this.conversations.keys());
  }
}

// Singleton instance
export const orchestrator = new ConversationOrchestrator();
