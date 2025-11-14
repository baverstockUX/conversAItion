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
  userName?: string;
  userRole?: string;
  preparedFollowUp?: {
    agentId: string;
    agentName: string;
    text: string;
    audioBuffer: Buffer;
    preparationStartTime: number;
  };
  lastAudioEmitTime?: number;
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
  async startConversation(conversationId: string, agentIds: string[], topic: string, agentsStartFirst: boolean = false, agentOnlyMode: boolean = false, userName?: string, userRole?: string): Promise<void> {
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
      userName,
      userRole,
    };

    console.log(`🆕 NEW CONVERSATION - ID: ${conversationId}, Initial message count: ${state.messages.length}`);

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

      console.log(`🧠 GENERATING RESPONSES - Conversation: ${conversationId}, Message count in state: ${state.messages.length}`);

      // Helper: Validate text output quality
      const isValidOutput = (text: string): boolean => {
        // Check for excessive question marks or special characters (signs of corrupted output)
        const questionMarkRatio = (text.match(/\?/g) || []).length / text.length;
        const specialCharRatio = (text.match(/[^\w\s.,!?'-]/g) || []).length / text.length;

        // If >15% question marks or >20% special chars, it's probably corrupted
        if (questionMarkRatio > 0.15 || specialCharRatio > 0.20) {
          return false;
        }

        // Check for gibberish patterns (lots of dots, repeated characters)
        if (text.match(/\.{3,}/g) || text.match(/…{2,}/g) || text.match(/\*{3,}/g)) {
          return false;
        }

        return true;
      };

      // Generate responses from agents
      // HYBRID MODE: Use LM Studio (fast, local) for responses, Claude (accurate) for scoring
      // Falls back to Claude-only if LM Studio is unavailable or produces garbage
      const responsePromises = agentsToRespond.map(async (agent) => {
        let text: string;
        let score: number;

        try {
          // Try LM Studio for fast local inference
          text = await LMStudioService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode, state.userName, state.userRole);

          // Validate output quality - fall back to Claude if corrupted
          if (!isValidOutput(text)) {
            console.log(`⚠️  LM Studio generated corrupted output for ${agent.name}, falling back to Claude`);
            console.log(`Corrupted text preview: ${text.substring(0, 100)}...`);
            text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode, state.userName, state.userRole);
          }

          // Use Claude for accurate scoring (determines turn-taking)
          try {
            score = await ClaudeService.scoreResponse(agent, text, state.messages);
          } catch (scoreError: any) {
            // Handle AWS rate limiting gracefully
            if (scoreError.name === 'ThrottlingException' || scoreError.$metadata?.httpStatusCode === 429) {
              console.log(`⚠️  AWS rate limit hit for ${agent.name}, using random score (6-8)`);
              score = 6 + Math.random() * 2; // Random score 6-8 to allow conversation to continue
              this.emit('error', conversationId, 'AWS rate limit reached - using random scoring temporarily');
            } else {
              throw scoreError;
            }
          }
        } catch (error: any) {
          // Fallback to Claude for both response and scoring if LM Studio unavailable
          if (error.message.includes('LM Studio server not running') || error.message.includes('LM Studio inference failed')) {
            console.log(`LM Studio unavailable, falling back to Claude for ${agent.name}`);
            try {
              text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode, state.userName, state.userRole);
              score = await ClaudeService.scoreResponse(agent, text, state.messages);
            } catch (claudeError: any) {
              // Handle rate limit even in fallback
              if (claudeError.name === 'ThrottlingException' || claudeError.$metadata?.httpStatusCode === 429) {
                console.log(`⚠️  AWS rate limit hit in fallback for ${agent.name}, conversation may be degraded`);
                this.emit('error', conversationId, 'AWS rate limit reached - please wait 1-2 minutes');
                throw new Error('AWS rate limit exceeded - please wait before continuing');
              }
              throw claudeError;
            }
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

      // 🚀 PIPELINE OPTIMIZATION: Start preparing follow-up RIGHT NOW (before TTS)
      // Text response is ready, so next agent can start generating while we do TTS
      let followUpPreparationPromise: Promise<void> | null = null;

      if (state.agents.length > 1 && !state.isInterrupted) {
        console.log('🚀 Pipeline: Starting follow-up preparation BEFORE TTS (parallel with audio generation)...');
        // Clear any previous prepared follow-up
        state.preparedFollowUp = undefined;

        // Start preparing next agent response in parallel (don't await)
        followUpPreparationPromise = this.prepareFollowUp(conversationId, selectedAgent.id);
      }

      // Generate audio using streaming TTS (faster than non-streaming)
      console.log('Generating audio with streaming TTS...');
      const audioStream = await TTSService.synthesizeStream(bestResponse.text, selectedAgent.voiceId);

      // Buffer chunks as they arrive from ElevenLabs (fast local operation)
      const chunks: Buffer[] = [];
      let chunkCount = 0;
      for await (const chunk of audioStream) {
        chunkCount++;
        console.log(`[AUDIO CHUNK ${chunkCount}] Received ${chunk.length} bytes`);
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      console.log(`Audio stream complete, ${chunkCount} chunks, total size: ${audioBuffer.length} bytes`);

      // Check if interrupted during TTS
      if (state.isInterrupted) {
        console.log('TTS interrupted');
        state.isInterrupted = false;
        state.status = 'idle';
        state.currentSpeaker = undefined;
        return;
      }

      // Send complete audio to frontend
      const audioEmitTime = Date.now();
      state.lastAudioEmitTime = audioEmitTime;
      this.emit('agent:audio', conversationId, audioBuffer);
      console.log(`📤 Audio emitted for ${selectedAgent.name} at T=${audioEmitTime}`);

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
          const audioEndTime = Date.now();
          const playbackDuration = state.lastAudioEmitTime ? audioEndTime - state.lastAudioEmitTime : 0;
          console.log(`🎵 Audio playback ended at T=${audioEndTime}, duration: ${playbackDuration}ms`);
          if (originalResolver) {
            originalResolver();
          }
          resolve();
        };
      });

      // Check if another agent wants to continue the conversation
      if (state.agents.length > 1 && !state.isInterrupted) {
        // Wait for pipeline preparation to complete (if it started and isn't done yet)
        if (followUpPreparationPromise && !state.preparedFollowUp) {
          console.log('⏳ Preparation still running, waiting for completion...');
          const waitStart = Date.now();
          await followUpPreparationPromise;
          const waitTime = Date.now() - waitStart;
          console.log(`✅ Preparation completed after ${waitTime}ms wait`);
        } else if (state.preparedFollowUp) {
          console.log('✅ Preparation already complete, no wait needed! Proceeding immediately...');
        }

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
   * Prepare follow-up response in parallel while audio is playing
   * This reduces latency by pipelining generation and TTS
   */
  private async prepareFollowUp(conversationId: string, lastSpeakerId: string): Promise<void> {
    const state = this.conversations.get(conversationId);

    if (!state || state.isInterrupted) {
      return;
    }

    const prepStart = Date.now();
    console.log('🚀 Pipeline: Starting follow-up preparation in parallel with audio playback...');

    try {
      // Check if we've hit the maximum number of agent turns
      const turnsSinceUser = state.messages.slice().reverse().findIndex(m => m.speaker === 'user');
      const MAX_AGENT_TURNS = 3;

      if (turnsSinceUser >= MAX_AGENT_TURNS) {
        console.log('Pipeline: Max turns reached, skipping preparation');
        return;
      }

      // Generate responses from OTHER agents (exclude the one who just spoke)
      const otherAgents = state.agents.filter(a => a.id !== lastSpeakerId);

      if (otherAgents.length === 0) {
        console.log('Pipeline: No other agents, skipping preparation');
        return;
      }

      // Check for interruption before expensive operations
      if (state.isInterrupted) {
        console.log('Pipeline: Interrupted during setup, aborting');
        return;
      }

      // Generate follow-up responses in parallel
      const followUpPromises = otherAgents.map(async (agent) => {
        let text: string;
        let score: number;

        try {
          text = await LMStudioService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
          try {
            score = await ClaudeService.scoreResponse(agent, text, state.messages);
          } catch (scoreError: any) {
            // Handle AWS rate limiting in pipeline
            if (scoreError.name === 'ThrottlingException' || scoreError.$metadata?.httpStatusCode === 429) {
              console.log(`⚠️  Pipeline: AWS rate limit hit for ${agent.name}, using random score`);
              score = 6 + Math.random() * 2; // Random score 6-8
            } else {
              throw scoreError;
            }
          }
        } catch (error: any) {
          if (error.message.includes('LM Studio server not running')) {
            console.log(`Pipeline: LM Studio unavailable, falling back to Claude for ${agent.name}`);
            text = await ClaudeService.generateAgentResponse(agent, state.agents, state.messages, state.agentOnlyMode);
            score = await ClaudeService.scoreResponse(agent, text, state.messages);
          } else {
            throw error;
          }
        }

        return { agentId: agent.id, text, score } as AgentResponse;
      });

      const followUpResponses = await Promise.all(followUpPromises);

      // Check for interruption after generation
      if (state.isInterrupted) {
        console.log('Pipeline: Interrupted after response generation, aborting');
        return;
      }

      // Find the best follow-up response
      const bestFollowUp = followUpResponses.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Only prepare if the follow-up score is high enough
      const MIN_SCORE_THRESHOLD = 6;

      if (bestFollowUp.score < MIN_SCORE_THRESHOLD) {
        console.log(`Pipeline: Best score ${bestFollowUp.score}/10 below threshold, skipping preparation`);
        return;
      }

      const followUpAgent = state.agents.find(a => a.id === bestFollowUp.agentId)!;
      console.log(`Pipeline: Best follow-up from ${followUpAgent.name} (score ${bestFollowUp.score}/10), generating TTS...`);

      // Generate TTS for the best follow-up
      const audioStream = await TTSService.synthesizeStream(bestFollowUp.text, followUpAgent.voiceId);

      const audioChunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        // Check for interruption during streaming
        if (state.isInterrupted) {
          console.log('Pipeline: Interrupted during TTS streaming, aborting');
          return;
        }
        audioChunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(audioChunks);

      // Final interruption check before storing
      if (state.isInterrupted) {
        console.log('Pipeline: Interrupted after TTS generation, aborting');
        return;
      }

      // Store prepared follow-up for immediate use
      state.preparedFollowUp = {
        agentId: followUpAgent.id,
        agentName: followUpAgent.name,
        text: bestFollowUp.text,
        audioBuffer,
        preparationStartTime: prepStart,
      };

      const prepTime = Date.now() - prepStart;
      console.log(`✅ Pipeline: Follow-up prepared in ${prepTime}ms (ready for immediate playback)`);

      // Check if audio is still playing (preparation finished before audio ended - SUCCESS!)
      if (state.audioPlaybackResolver) {
        console.log('⏰ Preparation finished BEFORE audio ended - pipelining successful! 🎯');
      } else {
        console.log('⏰ Preparation finished AFTER audio ended - audio was shorter than prep time');
      }
    } catch (error: any) {
      console.error('Pipeline: Error preparing follow-up:', error.message);
      // Don't throw - just log and let fallback handle it
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

    // 🚀 PIPELINE HIT: Check if we already have a prepared follow-up ready
    if (state.preparedFollowUp) {
      const prepared = state.preparedFollowUp;
      const latencySaved = Date.now() - prepared.preparationStartTime;
      console.log(`⚡ Pipeline HIT! Using pre-generated response from ${prepared.agentName} (saved ${latencySaved}ms of latency)`);

      // Find the agent
      const followUpAgent = state.agents.find(a => a.id === prepared.agentId)!;

      // Set speaking status
      state.status = 'speaking';
      state.currentSpeaker = followUpAgent.id;
      this.emit('status:update', conversationId, 'speaking');
      this.emit('agent:speaking', conversationId, followUpAgent.id, prepared.text);

      // Add message to history
      const followUpMessage = ConversationModel.addMessage({
        conversationId,
        speaker: followUpAgent.id,
        text: prepared.text,
      });

      state.messages.push(followUpMessage);
      this.emit('transcript:update', conversationId, followUpMessage);

      // Send pre-generated audio immediately
      const followUpEmitTime = Date.now();
      const gapFromPreviousAudio = state.lastAudioEmitTime ? followUpEmitTime - state.lastAudioEmitTime : 0;
      state.lastAudioEmitTime = followUpEmitTime;
      this.emit('agent:audio', conversationId, prepared.audioBuffer);
      console.log(`📤 Follow-up audio emitted for ${prepared.agentName} at T=${followUpEmitTime}`);
      console.log(`⚡ Gap from previous audio: ${gapFromPreviousAudio}ms (target: <100ms)`);

      // Clear the prepared follow-up
      state.preparedFollowUp = undefined;

      // Start preparing NEXT follow-up while this audio plays
      const nextPreparationPromise = this.prepareFollowUp(conversationId, followUpAgent.id);

      // Wait for audio playback
      console.log('Waiting for pipelined audio playback to complete...');
      await new Promise<void>((resolve) => {
        state.audioPlaybackResolver = resolve;

        const checkInterval = setInterval(() => {
          if (state.isInterrupted) {
            console.log('Pipelined audio interrupted by user');
            clearInterval(checkInterval);
            state.isInterrupted = false;
            state.status = 'idle';
            state.currentSpeaker = undefined;
            state.audioPlaybackResolver = undefined;
            this.emit('status:update', conversationId, 'idle');
            resolve();
          }
        }, 100);

        const originalResolver = state.audioPlaybackResolver;
        state.audioPlaybackResolver = () => {
          clearInterval(checkInterval);
          if (originalResolver) {
            originalResolver();
          }
          resolve();
        };
      });

      // Wait for next preparation to complete
      await nextPreparationPromise;

      // Recursively check for more follow-ups
      await this.continueConversation(conversationId, followUpAgent.id);
      return;
    }

    // PIPELINE MISS: No prepared follow-up, use traditional generation
    console.log('Pipeline MISS: Generating follow-up the traditional way');

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

    // Start preparing NEXT follow-up while this audio plays (pipeline for subsequent turns)
    const nextFollowUpPreparation = this.prepareFollowUp(conversationId, followUpAgent.id);

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

    // Wait for next preparation to complete
    await nextFollowUpPreparation;

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

    // 🚀 PIPELINE HIT CHECK: Use prepared response if available
    if (state.preparedFollowUp) {
      const prepared = state.preparedFollowUp;
      const latencySaved = Date.now() - prepared.preparationStartTime;
      console.log(`⚡ Agent-only Pipeline HIT! Using pre-generated response from ${prepared.agentName} (saved ${latencySaved}ms)`);

      const followUpAgent = state.agents.find(a => a.id === prepared.agentId)!;

      // Set speaking status
      state.status = 'speaking';
      state.currentSpeaker = followUpAgent.id;
      this.emit('status:update', conversationId, 'speaking');
      this.emit('agent:speaking', conversationId, followUpAgent.id, prepared.text);

      // Add message to history
      const followUpMessage = ConversationModel.addMessage({
        conversationId,
        speaker: followUpAgent.id,
        text: prepared.text,
      });

      state.messages.push(followUpMessage);
      this.emit('transcript:update', conversationId, followUpMessage);

      // Send pre-generated audio immediately
      const audioEmitTime = Date.now();
      const gapFromPreviousAudio = state.lastAudioEmitTime ? audioEmitTime - state.lastAudioEmitTime : 0;
      state.lastAudioEmitTime = audioEmitTime;
      this.emit('agent:audio', conversationId, prepared.audioBuffer);
      console.log(`📤 Agent-only pipelined audio emitted at T=${audioEmitTime}, gap: ${gapFromPreviousAudio}ms (target: <100ms)`);

      // Clear the prepared follow-up
      state.preparedFollowUp = undefined;

      // Start preparing NEXT follow-up while this audio plays
      console.log('🚀 Agent-only Pipeline: Starting NEXT preparation BEFORE TTS...');
      const nextPreparationPromise = this.prepareFollowUp(conversationId, followUpAgent.id);

      // Wait for audio playback
      console.log('Waiting for pipelined agent-only audio playback to complete...');
      await new Promise<void>((resolve) => {
        state.audioPlaybackResolver = resolve;

        const checkInterval = setInterval(() => {
          if (state.isInterrupted) {
            console.log('Pipelined agent-only audio interrupted by user');
            clearInterval(checkInterval);
            state.isInterrupted = false;
            state.status = 'idle';
            state.currentSpeaker = undefined;
            state.audioPlaybackResolver = undefined;
            this.emit('status:update', conversationId, 'idle');
            resolve();
          }
        }, 100);

        const originalResolver = state.audioPlaybackResolver;
        state.audioPlaybackResolver = () => {
          clearInterval(checkInterval);
          if (originalResolver) {
            originalResolver();
          }
          resolve();
        };
      });

      // Wait for next preparation to complete
      if (nextPreparationPromise && !state.preparedFollowUp) {
        console.log('⏳ Agent-only: Waiting for next preparation to complete...');
        await nextPreparationPromise;
      }

      // Recursively check for more follow-ups
      await this.continueAgentOnlyConversation(conversationId, followUpAgent.id);
      return;
    }

    // PIPELINE MISS: No prepared follow-up, generate the traditional way
    console.log('Agent-only Pipeline MISS: Generating follow-up traditionally');

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

    // 🚀 PIPELINE OPTIMIZATION: Start preparing NEXT agent's response before TTS
    console.log('🚀 Agent-only Pipeline: Starting next preparation BEFORE TTS...');
    state.preparedFollowUp = undefined;
    const nextPreparationPromise = this.prepareFollowUp(conversationId, followUpAgent.id);

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
    const audioEmitTime = Date.now();
    const gapFromPreviousAudio = state.lastAudioEmitTime ? audioEmitTime - state.lastAudioEmitTime : 0;
    state.lastAudioEmitTime = audioEmitTime;
    this.emit('agent:audio', conversationId, followUpAudioBuffer);
    console.log(`📤 Agent-only audio emitted at T=${audioEmitTime}, gap: ${gapFromPreviousAudio}ms`);

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

    // Wait for preparation to complete if needed
    if (nextPreparationPromise && !state.preparedFollowUp) {
      console.log('⏳ Agent-only: Waiting for preparation to complete...');
      const waitStart = Date.now();
      await nextPreparationPromise;
      const waitTime = Date.now() - waitStart;
      console.log(`✅ Agent-only: Preparation completed after ${waitTime}ms wait`);
    } else if (state.preparedFollowUp) {
      console.log('✅ Agent-only: Preparation already complete, proceeding immediately!');
    }

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
