# Multi-Agent Conversation Application - MVP Implementation Plan

## Overview
A web application that enables realistic multi-agent conversations where up to 3 AI agents and 1 human user can interact naturally using voice. Agents hear each other and respond dynamically with distinct personalities and voices.

## Use Cases
- **Interview Preparation**: Simulate job interviews with AI interviewers
- **D&D/Role-Playing**: Create immersive adventures with AI game masters and NPCs
- **Debate Practice**: Engage with multiple AI perspectives on a topic
- **Creative Writing**: Develop characters through conversation

## Architecture Decision

### Hybrid Approach (Optimal for Multi-Agent)
- **Agent Intelligence**: Anthropic Claude Sonnet 4.5 (via AWS Bedrock)
- **Text-to-Speech**: ElevenLabs API (high-quality, customizable voices)
- **Speech-to-Text**: OpenAI Whisper API (accurate, cost-effective)
- **Orchestration**: Custom Node.js backend with natural competition turn-taking

### Why Not ElevenLabs Agents SDK?
- Not designed for multi-agent conversations (1-on-1 only)
- Agents cannot "hear" each other
- Limited customization and control
- Higher cost at scale for multiple concurrent agents

### Why This Approach?
- ✅ Full control over multi-agent dynamics
- ✅ Best-in-class AI intelligence (Claude) + voice quality (ElevenLabs)
- ✅ Cost-effective (~$20-35 per hour of conversation)
- ✅ Supports all required features (persistence, avatars, transcripts, analysis)
- ✅ Flexible and scalable architecture

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Real-time Communication**: Socket.io (WebSocket)
- **Language**: TypeScript
- **Database**: SQLite (easy MVP, PostgreSQL migration path)
- **Storage**: Local filesystem (avatars, audio cache)

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **WebSocket Client**: Socket.io-client
- **Audio**: Web Audio API + MediaRecorder
- **Build Tool**: Vite

### AI/ML Services
- **LLM**: AWS Bedrock (Claude Sonnet 4.5 for agents, Haiku for scoring)
- **STT**: OpenAI Whisper API
- **TTS**: ElevenLabs API

### DevOps
- **Package Manager**: npm
- **Environment Variables**: dotenv
- **Version Control**: Git

## Project Structure

```
conversAItion/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Express + Socket.io entry point
│   │   ├── orchestrator.ts              # Core conversation orchestration engine
│   │   ├── services/
│   │   │   ├── claude.service.ts        # AWS Bedrock Claude integration
│   │   │   ├── tts.service.ts           # ElevenLabs text-to-speech
│   │   │   ├── stt.service.ts           # OpenAI Whisper speech-to-text
│   │   │   └── analysis.service.ts      # Post-conversation AI analysis
│   │   ├── models/
│   │   │   ├── agent.model.ts           # Agent data schema and operations
│   │   │   ├── conversation.model.ts    # Conversation schema and operations
│   │   │   └── message.model.ts         # Message schema
│   │   ├── routes/
│   │   │   ├── agents.routes.ts         # Agent CRUD endpoints
│   │   │   ├── conversations.routes.ts  # Conversation management
│   │   │   └── voices.routes.ts         # ElevenLabs voice library
│   │   ├── db.ts                        # SQLite database setup
│   │   └── types.ts                     # Backend type definitions
│   ├── database/
│   │   └── conversaition.db             # SQLite database file
│   ├── uploads/
│   │   ├── avatars/                     # User-uploaded avatars
│   │   └── audio/                       # Cached audio files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentCreator/
│   │   │   │   ├── AgentCreator.tsx     # Main agent setup component
│   │   │   │   ├── AgentForm.tsx        # Form for agent details
│   │   │   │   ├── VoiceSelector.tsx    # ElevenLabs voice picker
│   │   │   │   └── AvatarPicker.tsx     # Avatar gallery + uploader
│   │   │   ├── Conversation/
│   │   │   │   ├── ConversationView.tsx # Main conversation interface
│   │   │   │   ├── AgentAvatar.tsx      # Display agent with speaking indicator
│   │   │   │   ├── TranscriptPane.tsx   # Real-time transcript display
│   │   │   │   └── Controls.tsx         # Start, interrupt, end controls
│   │   │   ├── Analysis/
│   │   │   │   ├── AnalysisView.tsx     # Post-conversation results
│   │   │   │   ├── TranscriptView.tsx   # Full conversation history
│   │   │   │   └── FeedbackCard.tsx     # AI-generated feedback display
│   │   │   └── common/
│   │   │       ├── Button.tsx           # Reusable button component
│   │   │       └── LoadingSpinner.tsx   # Loading states
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts      # Microphone recording hook
│   │   │   ├── useAudioPlayer.ts        # Audio playback hook
│   │   │   ├── useWebSocket.ts          # Socket.io client hook
│   │   │   └── useAgents.ts             # Agent management hook
│   │   ├── services/
│   │   │   └── api.ts                   # HTTP client for REST endpoints
│   │   ├── types/
│   │   │   └── index.ts                 # Frontend type definitions
│   │   ├── App.tsx                      # Root component with routing
│   │   ├── main.tsx                     # React entry point
│   │   └── index.css                    # Tailwind imports
│   ├── public/
│   │   └── avatars/                     # Stock avatar gallery
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
├── shared/
│   └── types.ts                         # Shared types between frontend/backend
├── .env                                 # Environment variables (API keys)
├── .gitignore
├── README.md
└── project-plan.md                      # This file
```

## Data Models

### Agent
```typescript
interface Agent {
  id: string;                    // UUID
  name: string;                  // Display name (e.g., "Dr. Sarah Chen")
  role: string;                  // Role description (e.g., "Senior Interviewer")
  persona: string;               // Full system prompt defining personality
  voiceId: string;               // ElevenLabs voice ID
  avatarUrl: string;             // Path to avatar image
  createdAt: Date;
  updatedAt: Date;
}
```

### Conversation
```typescript
interface Conversation {
  id: string;                    // UUID
  title: string;                 // User-defined or auto-generated
  topic: string;                 // Conversation subject
  agentIds: string[];            // Array of agent IDs (1-3)
  messages: Message[];           // Conversation history
  status: 'active' | 'completed';
  analysis?: ConversationAnalysis; // AI-generated feedback
  createdAt: Date;
  completedAt?: Date;
}
```

### Message
```typescript
interface Message {
  id: string;                    // UUID
  conversationId: string;
  speaker: 'user' | string;      // 'user' or agent ID
  text: string;                  // Transcribed/generated text
  audioUrl?: string;             // Path to audio file
  timestamp: Date;
}
```

### ConversationAnalysis
```typescript
interface ConversationAnalysis {
  summary: string;               // Overall conversation summary
  userPerformance: {
    strengths: string[];         // What user did well
    improvements: string[];      // Areas for improvement
    keyMoments: string[];        // Notable exchanges
  };
  feedback: string;              // Detailed AI feedback
  generatedAt: Date;
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1) - Core Infrastructure

#### Backend Tasks
1. **Initialize Backend Project**
   - Create `backend/` directory with TypeScript + Express
   - Configure `tsconfig.json` for Node.js
   - Set up `package.json` with dependencies
   - Create `.env` file structure

2. **Set Up Express + Socket.io Server**
   - Create `server.ts` with Express app
   - Configure Socket.io for WebSocket connections
   - Add CORS middleware
   - Set up error handling middleware
   - Implement connection/disconnection events

3. **Configure SQLite Database**
   - Create `db.ts` with database connection
   - Define schemas for agents, conversations, messages
   - Implement database initialization
   - Create migration utilities

4. **Implement Claude Service**
   - Create `claude.service.ts`
   - Configure AWS Bedrock client
   - Implement agent response generation
   - Add response scoring function (using Haiku)
   - Handle streaming and error cases

5. **Create Basic Orchestrator**
   - Implement conversation state management
   - Build turn-taking logic (natural competition algorithm)
   - Add context window management
   - Handle message history

6. **Integrate Whisper STT**
   - Create `stt.service.ts`
   - Implement audio upload handling
   - Add Whisper API integration
   - Handle transcription errors

7. **Integrate ElevenLabs TTS**
   - Create `tts.service.ts`
   - Configure ElevenLabs API client
   - Implement text-to-speech conversion
   - Add voice caching mechanism
   - Handle streaming audio responses

#### Frontend Tasks
8. **Initialize Frontend Project**
   - Create React + TypeScript project with Vite
   - Configure Tailwind CSS
   - Set up project structure

9. **Create Basic Layout & Routing**
   - Set up React Router
   - Create pages: Home, AgentSetup, Conversation, Analysis
   - Implement navigation

10. **Implement WebSocket Connection**
    - Create `useWebSocket.ts` hook
    - Handle connection lifecycle
    - Implement event listeners
    - Add reconnection logic

11. **Build Audio Recording Component**
    - Create `useAudioRecorder.ts` hook
    - Implement MediaRecorder API
    - Add recording controls (start, stop)
    - Handle audio data upload

12. **Build Audio Playback Component**
    - Create `useAudioPlayer.ts` hook
    - Implement Web Audio API
    - Add playback queue
    - Handle interruptions

**Deliverable**: Basic conversation infrastructure with voice I/O working between one agent and user

---

### Phase 2: Agent Management (Week 2) - Create & Configure Agents

#### Backend Tasks
13. **Implement Agent CRUD Operations**
    - Create `agent.model.ts` with database operations
    - Build REST endpoints in `agents.routes.ts`
    - Add validation for agent data
    - Implement agent retrieval by ID

14. **Add Avatar Upload Endpoint**
    - Create file upload middleware (multer)
    - Implement avatar storage
    - Add image validation
    - Return public avatar URLs

15. **Integrate ElevenLabs Voice Library**
    - Create `voices.routes.ts`
    - Fetch available voices from ElevenLabs API
    - Cache voice list
    - Return voice metadata

#### Frontend Tasks
16. **Build Agent Creator UI**
    - Create `AgentCreator.tsx` main component
    - Build `AgentForm.tsx` with fields:
      - Name (text input)
      - Role (text input)
      - Persona (textarea for system prompt)
    - Add form validation
    - Implement agent saving

17. **Build Voice Selector**
    - Create `VoiceSelector.tsx`
    - Fetch voices from backend
    - Display voice list with preview
    - Allow voice selection per agent

18. **Build Avatar Picker**
    - Create `AvatarPicker.tsx`
    - Display stock avatar gallery (grid view)
    - Implement custom avatar upload
    - Show avatar preview

19. **Create Agent Preview Component**
    - Display configured agents as cards
    - Show name, role, avatar, voice
    - Add edit/delete actions
    - Support selecting 1-3 agents for conversation

20. **Add Agent Persistence**
    - Implement `useAgents.ts` hook
    - Handle agent creation API calls
    - Manage agent state (context/reducer)
    - Add local storage caching

**Deliverable**: Complete agent creation workflow with voice and avatar customization

---

### Phase 3: Conversation Engine (Week 3) - Multi-Agent Orchestration

#### Backend Tasks
21. **Implement Natural Competition Turn-Taking**
    - Build parallel agent response generation
    - Implement response scoring algorithm:
      - Relevance to conversation (0-4 points)
      - Character consistency (0-3 points)
      - Engagement value (0-3 points)
    - Select best response
    - Add timeout handling

22. **Add Interruption Handling**
    - Detect user interruption signal
    - Cancel in-progress TTS generation
    - Clear playback queue
    - Reset turn counter

23. **Implement Conversation State Management**
    - Create conversation session tracking
    - Manage active speakers
    - Handle conversation start/pause/end
    - Persist conversation state to database

24. **Add Conversation History Trimming**
    - Implement sliding window algorithm
    - Keep last N messages + summary
    - Compress old messages
    - Maintain context relevance

#### Frontend Tasks
25. **Build Main Conversation View**
    - Create `ConversationView.tsx` layout
    - Implement conversation setup modal
    - Add topic input field

26. **Display Active Agent Avatars**
    - Show all agents in conversation
    - Highlight active speaker
    - Add speaking animation
    - Display agent names

27. **Implement Real-Time Transcript Display**
    - Create `TranscriptPane.tsx`
    - Stream messages as they arrive
    - Auto-scroll to latest message
    - Color-code by speaker

28. **Add Conversation Controls**
    - Implement start button (with agent selection)
    - Add interrupt button (visible when agent speaking)
    - Build end conversation button
    - Show loading states

29. **Implement Audio Pipeline**
    - Connect recording to WebSocket
    - Handle incoming audio from agents
    - Implement sequential playback
    - Add playback queue with interrupt logic

30. **Add Visual Feedback**
    - Show "listening" indicator when user speaks
    - Display "thinking" state while agents generate responses
    - Add "speaking" indicator with audio waveform
    - Show connection status

**Deliverable**: Fully functional multi-agent conversation with interruptions and real-time transcript

---

### Phase 4: Persistence & Analysis (Week 4) - Save & Analyze Conversations

#### Backend Tasks
31. **Implement Conversation Saving**
    - Save full conversation on end
    - Store all messages with timestamps
    - Save audio files to disk
    - Generate unique conversation ID

32. **Build AI Analysis Service**
    - Create `analysis.service.ts`
    - Implement conversation summarization
    - Build user performance analysis:
      - Extract key moments
      - Identify strengths
      - Suggest improvements
    - Generate contextual feedback based on topic

33. **Add Conversation Retrieval Endpoints**
    - List all conversations (with pagination)
    - Get conversation by ID
    - Retrieve conversation analysis
    - Add filtering (by date, topic, agents)

#### Frontend Tasks
34. **Build Transcript View**
    - Create `TranscriptView.tsx`
    - Display full conversation history
    - Format messages with:
      - Speaker avatars
      - Timestamps
      - Message text
    - Add playback for individual messages

35. **Build Analysis View**
    - Create `AnalysisView.tsx` page
    - Display conversation summary
    - Show user performance feedback:
      - Strengths (green cards)
      - Improvements (yellow cards)
      - Key moments (highlights)
    - Add detailed feedback section

36. **Add Export Functionality**
    - Implement transcript export as:
      - Plain text (.txt)
      - JSON (.json)
      - Markdown (.md)
    - Add download button
    - Include metadata (date, agents, topic)

37. **Build Conversation History Browser**
    - Create list view of past conversations
    - Show conversation cards with:
      - Title/topic
      - Date
      - Participants (agent avatars)
      - Duration
    - Implement search/filter
    - Add click-to-view functionality

**Deliverable**: Complete conversation persistence with AI-powered analysis and feedback

---

### Phase 5: Polish & Optimization (Week 5) - Production-Ready MVP

38. **Add Error Handling & User Feedback**
    - Implement global error boundary
    - Add toast notifications for errors
    - Show loading spinners
    - Display connection errors
    - Handle API failures gracefully

39. **Implement Cost Tracking**
    - Track Claude API token usage
    - Monitor TTS character counts
    - Log STT minutes
    - Display cost estimates in UI
    - Add usage analytics

40. **Optimize Latency**
    - Implement prompt caching for system prompts
    - Add response streaming
    - Optimize audio buffer sizes
    - Tune max_tokens per response
    - Consider using Haiku for certain agents

41. **Add Stock Avatar Gallery**
    - Source/create 20+ avatar images
    - Organize by categories (professional, fantasy, casual)
    - Optimize image sizes
    - Add to `public/avatars/`

42. **Write Documentation**
    - Create comprehensive README.md
    - Add setup instructions
    - Document environment variables
    - Include usage examples
    - Add troubleshooting section

43. **End-to-End Testing**
    - Test interview prep scenario
    - Test D&D adventure scenario
    - Verify interruptions work smoothly
    - Check transcript accuracy
    - Validate analysis quality

44. **Performance Optimization**
    - Add database indexes
    - Implement caching strategies
    - Optimize bundle size
    - Lazy load components
    - Compress audio files

**Deliverable**: Production-ready MVP with polished UX and documentation

---

## Conversation Flow Architecture

### Step-by-Step Conversation Turn

1. **User Speaks**
   - Frontend captures audio via MediaRecorder
   - Audio sent to backend via WebSocket
   - Backend sends to Whisper API (STT)
   - Transcribed text added to conversation history

2. **Agent Response Generation** (Parallel)
   - Backend triggers all agents simultaneously
   - Each agent receives:
     - Their system prompt (persona)
     - Full conversation history
   - Claude generates response for each agent
   - Responses returned to orchestrator

3. **Response Scoring** (Sequential)
   - Orchestrator scores each response using Claude Haiku
   - Scoring criteria:
     - Relevance (0-4): How well does it advance the conversation?
     - Consistency (0-3): Does it match agent's persona?
     - Engagement (0-3): Is it interesting/valuable?
   - Total score: 0-10 per response

4. **Winner Selection**
   - Agent with highest score is selected
   - Tied scores: Random selection
   - Selected response added to conversation history

5. **Voice Synthesis**
   - Selected agent's text sent to ElevenLabs TTS
   - Uses agent's configured voice_id
   - Audio stream generated

6. **Playback**
   - Audio sent to frontend via WebSocket
   - Frontend plays audio through speakers
   - Transcript updated with agent's message
   - Visual indicator shows active speaker

7. **Interruption Handling** (If User Interrupts)
   - Frontend sends interrupt signal
   - Backend cancels current TTS generation
   - Playback queue cleared
   - Flow returns to Step 1 (user speaks)

8. **Loop**
   - Return to Step 1
   - Continue until user ends conversation

### Turn-Taking Algorithm (Natural Competition)

```typescript
async function getNextSpeaker(
  conversationHistory: Message[],
  agents: Agent[]
): Promise<{ agent: Agent; response: string }> {
  // 1. Generate responses from all agents in parallel
  const responses = await Promise.all(
    agents.map(agent =>
      generateAgentResponse(agent, conversationHistory)
    )
  );

  // 2. Score each response
  const scoredResponses = await Promise.all(
    responses.map(async (response, index) => {
      const score = await scoreResponse(
        agents[index],
        response,
        conversationHistory
      );
      return { agent: agents[index], response, score };
    })
  );

  // 3. Select highest scoring response
  const winner = scoredResponses.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return { agent: winner.agent, response: winner.response };
}

async function scoreResponse(
  agent: Agent,
  response: string,
  history: Message[]
): Promise<number> {
  const prompt = `
Score this agent response from 0-10:

Conversation context (last 3 messages):
${history.slice(-3).map(m => `${m.speaker}: ${m.text}`).join('\n')}

Agent: ${agent.name} (${agent.role})
Response: ${response}

Scoring criteria:
- Relevance to conversation (0-4 points)
- Character consistency for ${agent.name} (0-3 points)
- Engagement/entertainment value (0-3 points)

Return ONLY a number 0-10.
  `;

  const result = await callClaude(prompt, 'haiku'); // Use cheap model
  return parseFloat(result);
}
```

## Cost Estimation

### Per 1-Hour Conversation
- **Assumptions**:
  - 10 turns per minute = 600 turns/hour
  - 3 agents competing per turn
  - Average response: 100 tokens output, 2000 tokens input
  - Average TTS: 100 characters per response

#### Breakdown
1. **Speech-to-Text (Whisper)**
   - 60 minutes × $0.006/minute = **$0.36**

2. **Claude API**
   - Agent response generation:
     - 600 turns × 3 agents × 2000 input tokens = 3.6M input tokens
     - 600 turns × 3 agents × 100 output tokens = 180K output tokens
   - Response scoring:
     - 600 turns × 3 agents × 500 input tokens = 900K input tokens
     - 600 turns × 3 agents × 5 output tokens = 9K output tokens

   **Sonnet 4.5 (agents)**:
   - Input: 3.6M × $3/M = $10.80
   - Output: 180K × $15/M = $2.70

   **Haiku (scoring)**:
   - Input: 900K × $0.25/M = $0.23
   - Output: 9K × $1.25/M = $0.01

   **Total Claude**: $10.80 + $2.70 + $0.23 + $0.01 = **$13.74**

3. **Text-to-Speech (ElevenLabs)**
   - 600 responses × 100 characters = 60K characters
   - 60K × $0.30/1K = **$18.00**

#### Total Cost Per Hour
**$0.36 + $13.74 + $18.00 = $32.10**

### Optimization Strategies
- **Use Haiku for simpler agents**: Save 50% on agent generation
- **Implement prompt caching**: Save 20-30% on input tokens
- **Shorter max_tokens**: Limit responses to 50-75 tokens
- **Reduce scoring frequency**: Score every other turn
- **Optimized cost**: **$18-22/hour**

## Environment Variables

```bash
# .env file structure

# AWS Bedrock (Claude)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# OpenAI (Whisper)
OPENAI_API_KEY=your_openai_key

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_PATH=./database/conversaition.db

# File Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB

# Feature Flags
ENABLE_COST_TRACKING=true
ENABLE_AUDIO_CACHING=true
```

## Success Criteria

### Performance Metrics
- ✅ **Latency**: <3 seconds per turn (user speaks → agent responds)
- ✅ **Voice Quality**: Clear audio, no artifacts, natural prosody
- ✅ **Response Quality**: Agents stay in character, relevant to context
- ✅ **Reliability**: <1% error rate, graceful degradation

### User Experience
- ✅ **Intuitive UI**: Users can create agents without documentation
- ✅ **Clear Feedback**: Always know what's happening (listening, thinking, speaking)
- ✅ **Smooth Interruptions**: Can interrupt at any time without lag
- ✅ **Valuable Analysis**: AI feedback is specific and actionable

### Technical
- ✅ **Code Quality**: TypeScript strict mode, no linter errors
- ✅ **Error Handling**: All edge cases covered, user-friendly messages
- ✅ **Documentation**: README covers setup and usage
- ✅ **Maintainability**: Clear structure, commented code, modular design

## Future Enhancements (Post-MVP)

### Phase 6: Advanced Features
- **Voice Cloning**: Custom voices from user samples
- **Agent Memory**: Long-term memory across conversations
- **Multi-Modal**: Video avatars with lip sync
- **Live Collaboration**: Multiple human users in same conversation
- **Agent Marketplace**: Share/download community agents
- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: Sentiment analysis, topic modeling
- **Custom LLMs**: Support for other models (GPT-4, Llama)

### Phase 7: Enterprise Features
- **Team Workspaces**: Shared agents and conversations
- **Role-Based Access**: Permissions and user management
- **API Access**: RESTful API for integrations
- **Webhooks**: Event notifications
- **SSO Integration**: SAML, OAuth
- **Audit Logs**: Compliance and tracking
- **White-Label**: Custom branding

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | High | Implement queue system, retry logic, fallback models |
| High latency | Medium | Use streaming, optimize prompts, consider edge deployment |
| Cost overruns | Medium | Add usage tracking, implement cost alerts, optimize models |
| Audio quality issues | High | Test multiple formats, implement quality checks, fallback to text |
| Database scaling | Low | Start with SQLite, migration plan to PostgreSQL ready |

### User Experience Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusing UI | High | User testing, clear labeling, onboarding flow |
| Poor agent quality | High | Provide prompt templates, examples, best practices |
| Interruption lag | Medium | Optimize cancellation logic, buffer management |
| Unclear turn-taking | Medium | Strong visual indicators, explicit speaking cues |

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| Phase 1: Foundation | Week 1 | Voice I/O working with 1 agent |
| Phase 2: Agent Management | Week 2 | Complete agent creation UI |
| Phase 3: Conversation Engine | Week 3 | Multi-agent conversation functional |
| Phase 4: Persistence & Analysis | Week 4 | Save conversations + AI feedback |
| Phase 5: Polish & Optimization | Week 5 | Production-ready MVP |

**Total: 5 weeks to production-ready MVP**

## Getting Started (After Implementation)

### Prerequisites
- Node.js 20+
- npm or yarn
- AWS account with Bedrock access
- ElevenLabs API key
- OpenAI API key

### Setup Steps
1. Clone repository
2. Copy `.env.example` to `.env` and fill in API keys
3. Install dependencies: `npm install` (in both backend/ and frontend/)
4. Initialize database: `npm run db:init` (in backend/)
5. Start backend: `npm run dev` (in backend/)
6. Start frontend: `npm run dev` (in frontend/)
7. Open browser to `http://localhost:5173`

### First Use
1. Create 2-3 agents (e.g., "Interviewer", "Candidate Observer")
2. Set agent personas, select voices, choose avatars
3. Start a conversation on a specific topic
4. Speak naturally and let agents respond
5. End conversation and view AI analysis

## Support & Resources

- **ElevenLabs Docs**: https://elevenlabs.io/docs/overview
- **Anthropic Claude Docs**: https://docs.anthropic.com/
- **AWS Bedrock Docs**: https://docs.aws.amazon.com/bedrock/
- **OpenAI Whisper API**: https://platform.openai.com/docs/guides/speech-to-text

---

**Ready to build!** This plan provides a comprehensive roadmap from zero to production-ready MVP in 5 weeks.
