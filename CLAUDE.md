# ConversAItion - Multi-Agent Voice Conversation Platform

A real-time voice conversation platform where up to 3 AI agents can engage in natural, dynamic conversations with a human user. Built for interview preparation, D&D adventures, and other interactive scenarios.

## Architecture Overview

### Tech Stack
- **Backend**: Node.js + Express + Socket.io + SQLite
- **Frontend**: React + Vite + Tailwind CSS + TypeScript
- **AI Services**:
  - **Hybrid Mode** (default): LM Studio (local) for response generation + Claude Bedrock for scoring
  - Fallback: Claude Bedrock only (when LM Studio unavailable)
  - ElevenLabs (`eleven_turbo_v2_5`) for text-to-speech
  - OpenAI Whisper for speech-to-text

### Project Structure
```
conversAItion/
├── backend/          # Node.js server with WebSocket support
├── frontend/         # React SPA
└── shared/          # Shared TypeScript types
```

## Common Commands

### Backend
```bash
cd backend
npm install
npm run dev          # Development server with hot reload (port 3001)
npm run build        # TypeScript compilation
npm start           # Production server
npm run seed:agents  # Seed database with 20 default agents
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Development server with Vite (port 5173/5175)
npm run build        # Production build
npm run preview      # Preview production build
```

## Configuration

### Environment Variables (.env in backend/)

**LM Studio** (Local Inference):
```
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model
```
- Used for fast local response generation
- OpenAI-compatible API
- Falls back to Claude if unavailable

**AWS Bedrock** (uses AWS SSO profile):
```
AWS_REGION=eu-west-1
AWS_PROFILE=advanced-bedrock
CLAUDE_MODEL_SONNET=arn:aws:bedrock:eu-west-1:311141564024:inference-profile/eu.anthropic.claude-sonnet-4-5-20250929-v1:0
CLAUDE_MODEL_HAIKU=arn:aws:bedrock:eu-west-1:311141564024:inference-profile/eu.anthropic.claude-sonnet-4-5-20250929-v1:0
```

**Important**: This project uses AWS SSO authentication via the `advanced-bedrock` profile. The user has an `aclaude` script in their .zshrc that configures this. Do NOT use AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN as temporary credentials expire.

**Bedrock Model Configuration**: Must use inference profile ARNs (not direct model IDs like `anthropic.claude-3-5-sonnet-20241022-v2:0`) to avoid "on-demand throughput isn't supported" errors.

**ElevenLabs**:
```
ELEVENLABS_API_KEY=sk_f3b0e48e51016c08059dca9aefc9ba099831cf1a4847c45f
```
- Model: `eleven_turbo_v2_5` (works with Creator subscription)
- Do NOT use `eleven_multilingual_v2` or `eleven_monolingual_v1` (deprecated for free tier and have issues even with paid)
- Streaming TTS enabled for ~30-40% faster audio generation

**OpenAI Whisper**:
```
OPENAI_API_KEY=sk-proj-[key]
```
- Requires paid account with credits for STT

## Key Architecture Patterns

### 1. Hybrid AI Architecture (LM Studio + Claude)
**Location**: `backend/src/orchestrator.ts`, `backend/src/services/lmstudio.service.ts`

The system uses a hybrid approach for optimal performance:

- **LM Studio** (local): Generates agent responses (fast, private, no cost)
- **Claude Bedrock** (cloud): Scores responses for turn-taking (accurate, determines who speaks)

```typescript
// Hybrid mode with automatic fallback
try {
  // Try LM Studio for fast local inference
  text = await LMStudioService.generateAgentResponse(agent, state.messages);
  // Use Claude for accurate scoring (determines turn-taking)
  score = await ClaudeService.scoreResponse(agent, text, state.messages);
} catch (error: any) {
  // Fallback to Claude for both response and scoring if LM Studio unavailable
  if (error.message.includes('LM Studio server not running')) {
    console.log(`LM Studio unavailable, falling back to Claude for ${agent.name}`);
    const response = await ClaudeService.generateAgentResponse(agent, state.messages);
    text = response.text;
    score = response.score;
  } else {
    throw error;
  }
}
```

**Why Hybrid?**
- LM Studio: Fast response generation, runs locally, no API costs, complete privacy
- Claude: Accurate scoring ensures the right agent speaks at the right time
- Graceful degradation: Falls back to Claude-only if LM Studio unavailable

### 2. Natural Competition Turn-Taking
**Location**: `backend/src/orchestrator.ts`

All agents generate responses simultaneously when the user speaks. Each response is scored by Claude (1-10), and the highest scoring agent speaks. This creates natural, contextually-appropriate turn-taking.

```typescript
const responsePromises = agentsToRespond.map(async (agent) => {
  let text: string;
  let score: number;

  try {
    text = await LMStudioService.generateAgentResponse(agent, state.messages);
    score = await ClaudeService.scoreResponse(agent, text, state.messages);
  } catch (error: any) {
    // Fallback logic...
  }

  return { agentId: agent.id, text, score } as AgentResponse;
});

const responses = await Promise.all(responsePromises);
const bestResponse = responses.reduce((best, current) =>
  current.score > best.score ? current : best
);
```

### 3. Multi-Turn Conversations
**Location**: `backend/src/orchestrator.ts` - `continueConversation()` method

After an agent speaks, OTHER agents can respond if they have meaningful contributions (score ≥ 6/10), up to 3 agent exchanges before returning control to the user.

**Critical Detail**: The follow-up agent speaks immediately without regenerating all agent responses. This prevents both agents responding to the user's question separately.

### 4. Audio Playback Completion Events
**Location**: `backend/src/orchestrator.ts`, `frontend/src/hooks/useAudioPlayer.ts`

To prevent agents talking over each other, the backend waits for the frontend to signal audio playback completion:

```typescript
// Backend waits for playback completion
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
```

Frontend signals completion:
```typescript
// In useAudioPlayer.ts
source.onended = () => {
  console.log('Audio playback ended');
  setIsPlaying(false);
  currentSourceRef.current = null;

  // Notify backend that audio has finished playing
  if (socketRef.current) {
    console.log('Emitting audio:playback:ended to backend');
    socketRef.current.emit('audio:playback:ended');
  }
};
```

### 5. Enhanced Agent Addressing
**Location**: `backend/src/orchestrator.ts` - lines 158-206

When a user addresses a specific agent by name, only that agent generates and provides a response. Supports first names, full names, and multiple patterns:

```typescript
// Check if user addressed a specific agent by name
const lastUserMessage = state.messages.slice().reverse().find(m => m.speaker === 'user');
let addressedAgent: Agent | null = null;

if (lastUserMessage) {
  const messageText = lastUserMessage.text.toLowerCase().trim();
  console.log(`Checking if user addressed specific agent in: "${lastUserMessage.text}"`);

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

const agentsToRespond = addressedAgent ? [addressedAgent] : state.agents;
```

### 6. Agent Name Prefix Stripping
**Location**: `backend/src/services/lmstudio.service.ts` - lines 43-48

LM Studio models sometimes include the agent's name in responses. Post-processing strips these prefixes:

```typescript
// Strip any name prefix if the model accidentally included it
// Pattern: "Name: text" or "Name - text"
const namePrefix = new RegExp(`^${agent.name}\\s*[:-]\\s*`, 'i');
content = content.replace(namePrefix, '');
```

The system prompt also explicitly instructs:
```typescript
- IMPORTANT: Do NOT include your name in your responses - just speak directly
```

### 7. Action Text Stripping
**Location**: `backend/src/services/tts.service.ts` - lines 19-24

Physical descriptions between asterisks (e.g., `*nods*`, `*smiles*`) are stripped before TTS to prevent them being read aloud:

```typescript
const cleanedText = text.replace(/\*[^*]+\*/g, '').trim();

if (!cleanedText) {
  throw new Error('No text to synthesize after removing actions');
}
```

### 8. Spacebar Hold-to-Talk
**Location**: `frontend/src/components/Conversation/ConversationView.tsx` - lines 31-68

Keyboard shortcut for faster interaction:

```typescript
useEffect(() => {
  if (!hasStarted || status.conversationStatus === 'speaking') return;

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
}, [hasStarted, status.conversationStatus, isRecording, isSpacePressed, startRecording, stopRecording, sendAudio]);
```

### 9. Improved Interrupt Handling
**Location**: `frontend/src/components/Conversation/ConversationView.tsx` - lines 100-113

Interrupt now stops audio immediately and auto-starts recording:

```typescript
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
```

### 10. Agent-First Conversations
**Location**: `backend/src/orchestrator.ts` - lines 72-93, `frontend/src/components/Conversation/ConversationView.tsx` - lines 194-205

Optional feature allowing agents to start the conversation based on the topic:

**Frontend Checkbox**:
```typescript
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
```

**Backend Async Trigger**:
```typescript
// If agents should start first, inject a system message and trigger agent response
if (agentsStartFirst) {
  console.log(`Agents starting conversation about: ${topic}`);

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
```

**Critical**: Uses `setImmediate()` to avoid blocking, ensuring frontend receives `conversation:started` event immediately and has the conversation ID for recording.

### 11. Audio Player Lifecycle
**Location**: `frontend/src/hooks/useAudioPlayer.ts`

The audio player MUST be initialized in ConversationView.tsx for audio to work:

```typescript
const { isPlaying, stop: stopAudio } = useAudioPlayer();
```

This hook listens for custom 'agent:audio' events dispatched by useWebSocket and plays audio using the Web Audio API.

### 12. WebSocket Event Flow
**Location**: `backend/src/server.ts` and `frontend/src/hooks/useWebSocket.ts`

Real-time communication pattern:
1. Frontend emits: `conversation:start`, `user:speak`, `user:interrupt`, `conversation:end`, `audio:playback:ended`
2. Backend emits: `conversation:started`, `status:update`, `agent:speaking`, `agent:audio`, `transcript:update`, `error`, `conversation:ended`, `conversation:interrupted`

### 13. Startup Validation (Non-Blocking)
**Location**: `backend/src/services/startup-validation.service.ts`

All API services are validated on startup, but errors don't block server start:

```typescript
static shouldAllowStartup(results: ValidationResult[]): boolean {
  // Always allow startup - services will gracefully fallback if needed
  // Log warnings but don't block server startup
  return true;
}
```

Validated services:
- LM Studio (Local Inference) - checks connection and loaded model
- AWS Bedrock (Claude) - used for scoring
- ElevenLabs (TTS) - checks API key and voices
- OpenAI Whisper (STT) - checks API key validity

### 14. CORS Configuration
**Location**: `backend/src/server.ts`

In development, accepts all localhost ports (not just 5173) because Vite may use different ports:

```typescript
const corsOptions = NODE_ENV === 'development'
  ? {
      origin: (origin: string | undefined, callback) => {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    }
  : { origin: FRONTEND_URL, methods: ['GET', 'POST'] };
```

## Important Implementation Notes

1. **AWS Authentication**: Always use AWS_PROFILE, never temporary credentials (they expire)
2. **Bedrock Model IDs**: Must use inference profile ARNs, not direct model IDs
3. **ElevenLabs Model**: Use `eleven_turbo_v2_5` only (other models have compatibility issues)
4. **LM Studio Setup**: Start server with OpenAI-compatible API endpoint, load a model
5. **Audio Player Initialization**: Must call `useAudioPlayer()` in ConversationView.tsx for audio playback to work
6. **Multi-Turn Conversations**: Follow-up agents speak immediately without regenerating all responses
7. **Interrupt Handling**: Stops audio immediately and auto-starts recording after 300ms
8. **Name Detection**: Checks first 3 words of message for agent names (first name or full name)
9. **Action Text**: Strip text between asterisks before TTS to prevent reading physical descriptions
10. **Agent-First Mode**: Uses `setImmediate()` to avoid blocking conversation:started event
11. **Spacebar Shortcut**: Hold SPACE to record, release to send (doesn't work in input fields or during agent speech)
12. **Startup Validation**: Non-blocking - server starts even if some API services fail

## Database Schema

**SQLite database**: `backend/database.sqlite`

Tables:
- `agents`: Agent profiles with name, role, personality, voice ID, avatar URL
- `conversations`: Conversation sessions with topic, title, timestamps
- `messages`: All conversation messages with speaker, text, timestamp
- `analyses`: Post-conversation AI assessments of user performance

## Common Issues and Solutions

### "Security token invalid" errors
- **Cause**: Using temporary AWS credentials that expired
- **Solution**: Ensure AWS_PROFILE=advanced-bedrock is set, remove AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN

### "On-demand throughput isn't supported"
- **Cause**: Using direct Bedrock model IDs instead of inference profile ARNs
- **Solution**: Use inference profile ARN format in .env

### No audio playback despite text responses
- **Cause**: useAudioPlayer hook not initialized in ConversationView
- **Solution**: Add `const { isPlaying, stop: stopAudio } = useAudioPlayer();` to component

### Agents talking over each other
- **Cause**: Frontend not signaling audio playback completion
- **Solution**: Audio playback completion events are implemented - check `audio:playback:ended` emission

### Wrong agent responding when addressed by name
- **Cause**: Name detection not matching the pattern
- **Solution**: Check backend logs for "Checking if user addressed specific agent" and "✓ User addressed" messages. Supports first names and full names.

### Interrupt button not working
- **Cause**: Audio not being stopped or recording not auto-starting
- **Solution**: Interrupt now calls `stopAudio()`, sends interrupt event, and auto-starts recording after 300ms

### "No active conversation" error when recording
- **Cause**: Agent-first mode was blocking conversation:started event
- **Solution**: Fixed with `setImmediate()` - frontend receives conversation ID immediately

### Agent names appearing in responses
- **Cause**: LM Studio models sometimes prefix responses with agent name
- **Solution**: Post-processing regex strips "Name:" or "Name -" prefixes automatically

### LM Studio connection errors
- **Cause**: LM Studio not running or no model loaded
- **Solution**: System automatically falls back to Claude-only mode. Start LM Studio and load a model for hybrid mode.

## Development Workflow

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. (Optional) Start LM Studio with OpenAI-compatible server and load a model
4. Access UI at `http://localhost:5173` (or whichever port Vite assigns)
5. (Optional) Seed default agents: `npm run seed:agents` in backend directory
6. Create agents with names, roles, personalities, and ElevenLabs voice IDs (or use defaults)
7. Start conversation by selecting 1-3 agents and entering a topic
8. (Optional) Check "Let agents start the conversation" for agent-first mode
9. **Hold SPACE to record audio** (or use "Start Speaking" button), release to send
10. Press "Interrupt" to stop agent mid-speech and auto-start recording
11. Press "End Conversation" to finish and view analysis

## Default Agents (20 Available)

Run `npm run seed:agents` in the backend directory to create these pre-configured agents:

### Interview Preparation
- **Marcus Chen** - Technical Interviewer (senior engineer, analytical, tests deep understanding)
- **Jennifer Martinez** - HR Director (warm, behavioral questions, culture fit focus)
- **David Thompson** - Friendly Recruiter (encouraging, helpful, gives tips)

### D&D / Role-Playing
- **Dungeon Master Aldric** - D&D Game Master (immersive storytelling, adapts to player choices)
- **Thora Ironheart** - Dwarf Fighter Companion (battle-hardened, loyal, straightforward)
- **Lyra Moonshadow** - Elf Wizard Companion (clever, strategic, loves ancient lore)

### Education / Tutoring
- **Professor Elena Vasquez** - University Professor (passionate educator, uses analogies)
- **Alex Kumar** - Study Buddy (peer learning, breaks things down step-by-step)

### Business / Professional
- **Victoria Sterling** - Venture Capitalist (sharp, skeptical, asks tough questions)
- **Robert Chen** - Management Consultant (analytical, framework-driven, strategic)

### Creative / Writing
- **Maya Patel** - Writing Editor (constructive feedback, celebrates writer's voice)
- **Sebastian Cruz** - Creative Brainstorming Partner (enthusiastic, "yes and" thinking)

### Debate / Discussion
- **Dr. James Morrison** - Devil's Advocate (challenges assumptions, tests arguments)
- **Sophia Okafor** - Moderator & Facilitator (keeps discussions productive, synthesizes viewpoints)

### Wellness / Coaching
- **Dr. Patricia Williams** - Life Coach (empathetic, asks powerful questions, holds accountability)

### Customer Service / Sales
- **Tyler Anderson** - Customer Success Manager (patient, solution-oriented, owns problems)
- **Rachel Kim** - Sales Professional (consultative, focuses on needs, builds relationships)

### Technical / Specialized
- **Dr. Alan Brooks** - Research Scientist (evidence-based, scientifically rigorous, explains clearly)
- **Nina Rodriguez** - UX Designer (user-focused, design thinking, balances constraints)

### Language / Cultural
- **Pierre Dubois** - Language Tutor (French) (encouraging, mixes languages, shares cultural context)

## Performance Optimizations

1. **Streaming TTS**: ~30-40% faster audio generation by buffering streams on backend
2. **Hybrid AI Mode**: 50-70% faster response generation using local LM Studio
3. **Parallel Agent Responses**: All agents generate responses simultaneously
4. **Event-Based Audio Sync**: No artificial delays, waits for actual playback completion
5. **Non-Blocking Startup**: Server starts immediately, validates APIs in background

## Future Enhancements (Not Yet Implemented)

- Post-conversation AI analysis of user performance (infrastructure exists, needs UI)
- Agent avatar upload functionality (currently uses stock avatars)
- Conversation history and replay
- Voice activity detection for automatic hands-free turn-taking
- Local-only mode option (remove Claude dependency completely)

## Code Review & Production Readiness

**Date:** 2025-11-14
**Status:** NOT PRODUCTION READY (See `critical-fixes.md`)

A comprehensive architectural code review was conducted with the following findings:

### Overall Assessment
- **Grade:** B- (70/100)
- **Issues Found:** 68 total (9 Critical, 22 High, 26 Medium, 11 Low)
- **Test Coverage:** 0% (CRITICAL - no tests exist)

### Critical Issues Requiring Immediate Attention

1. **Zero test coverage** - No automated tests
2. **Hard-coded API keys exposed** - .env files tracked in git
3. **Weak WebSocket authentication** - Shared secret token only
4. **No database backups** - Risk of data loss
5. **No production logging** - Only console.log statements
6. **Single-server architecture** - Cannot scale horizontally
7. **No CI/CD pipeline** - Manual deployments only
8. **Memory leak in conversation state** - Unbounded growth
9. **No error monitoring** - Production errors invisible

### Top Strengths Identified

1. **Innovative Hybrid AI Architecture** - LM Studio + Claude scoring
2. **Pipeline Optimization** - 30-40% latency reduction
3. **Natural Turn-Taking** - Competitive response scoring
4. **Clean Service Layer** - Good separation of concerns
5. **Excellent WebSocket Management** - Proper event handling

### Production Readiness Checklist

**DO NOT DEPLOY TO PRODUCTION UNTIL:**
- [ ] Critical security issues resolved (JWT auth, input validation, rate limiting)
- [ ] Test coverage >70%
- [ ] Logging and monitoring implemented (Winston, Sentry)
- [ ] Database backups enabled
- [ ] API retry logic added
- [ ] Memory leaks fixed
- [ ] CI/CD pipeline operational

### Estimated Timeline to Production Ready
- **Minimum viable fixes:** 4-5 weeks
- **Full production ready:** 8-10 weeks
- **Enterprise grade:** 12-14 weeks

For detailed breakdown of all issues and action plan, see **`critical-fixes.md`**.
