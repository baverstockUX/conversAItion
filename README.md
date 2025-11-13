# ConversAItion 🎙️

A web application for realistic multi-agent conversations powered by AI. Create up to 3 AI agents with distinct personalities and voices, then engage in natural conversations where agents listen to each other and respond dynamically.

## Features

✅ **Multi-Agent Conversations**: Up to 3 AI agents + 1 human user
✅ **Natural Turn-Taking**: Agents compete naturally for speaking turns
✅ **Voice I/O**: Real-time speech-to-text and text-to-speech
✅ **Custom Agents**: Define personalities, roles, voices, and avatars
✅ **Interruptions**: Interrupt at any time for natural conversation flow
✅ **Conversation Analysis**: AI-powered feedback on your performance
✅ **Transcript Saving**: Full conversation history with audio

## Use Cases

- **Interview Preparation**: Practice with AI interviewers
- **D&D Adventures**: Play with AI game masters and NPCs
- **Debate Practice**: Engage multiple AI perspectives
- **Role-Playing**: Develop characters through conversation

## Technology Stack

**Backend:**
- Node.js + Express + TypeScript
- Socket.io (WebSocket real-time communication)
- SQLite (database)
- AWS Bedrock (Claude Sonnet 4.5 & Haiku)
- OpenAI Whisper (speech-to-text)
- ElevenLabs (text-to-speech)

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Socket.io-client
- Web Audio API

## Prerequisites

- Node.js 20+
- npm or yarn
- **AWS Account** with Bedrock access (Claude models)
- **ElevenLabs API Key** (already configured)
- **OpenAI API Key** (for Whisper STT)

## Setup Instructions

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (once created)
cd ../frontend
npm install
```

### 2. Configure Environment Variables

The backend `.env` file is already set up with your ElevenLabs key. You need to add:

```bash
# Edit backend/.env

# Add your OpenAI API key
OPENAI_API_KEY=your_openai_key_here

# AWS keys are already configured
```

### 3. Initialize Database

```bash
cd backend
npm run db:init
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend (once created)
cd frontend
npm run dev
```

### 5. Open Browser

Navigate to `http://localhost:5173`

## Project Structure

```
conversAItion/
├── backend/              # Node.js backend server
│   ├── src/
│   │   ├── server.ts     # Express + Socket.io entry point
│   │   ├── orchestrator.ts # Conversation orchestration
│   │   ├── services/     # AI services (Claude, Whisper, ElevenLabs)
│   │   ├── models/       # Database models
│   │   └── routes/       # REST API routes
│   ├── database/         # SQLite database
│   └── uploads/          # User-uploaded avatars
├── frontend/             # React frontend (to be created)
│   └── src/
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       └── services/     # API client
├── shared/               # Shared TypeScript types
└── project-plan.md       # Detailed implementation plan
```

## API Endpoints

### REST API

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `POST /api/agents/upload-avatar` - Upload avatar image

- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/analysis` - Get AI analysis

- `GET /api/voices` - Get ElevenLabs voices

### WebSocket Events

**Client → Server:**
- `conversation:start` - Start new conversation
- `user:speak` - Send audio
- `user:interrupt` - Interrupt agent
- `conversation:end` - End conversation

**Server → Client:**
- `conversation:started` - Conversation ready
- `status:update` - Status change (listening/thinking/speaking)
- `agent:speaking` - Agent about to speak
- `agent:audio` - Agent audio data
- `transcript:update` - New message
- `error` - Error occurred

## Usage Guide

### 1. Create Agents

1. Navigate to Agent Creator
2. Fill in agent details:
   - **Name**: e.g., "Dr. Sarah Chen"
   - **Role**: e.g., "Senior Technical Interviewer"
   - **Persona**: Detailed personality description
3. Select voice from ElevenLabs library
4. Choose or upload avatar
5. Save agent

### 2. Start Conversation

1. Select 1-3 agents
2. Enter conversation topic
3. Click "Start Conversation"
4. Allow microphone access

### 3. Have Conversation

- **Speak**: Just talk naturally
- **Listen**: Agents will respond in turn
- **Interrupt**: Click interrupt button or press hotkey
- **View Transcript**: See conversation in real-time

### 4. End & Analyze

1. Click "End Conversation"
2. View AI-generated analysis:
   - Conversation summary
   - Your strengths
   - Areas for improvement
   - Key moments
   - Detailed feedback
3. Export transcript if desired

## Cost Estimation

Approximate costs per hour of conversation:

- **Claude API**: ~$13-15 (agent intelligence + scoring)
- **Whisper STT**: ~$0.36 (speech transcription)
- **ElevenLabs TTS**: ~$18 (voice synthesis)

**Total**: ~$30-35/hour

Optimization strategies in project-plan.md can reduce to ~$20-25/hour.

## Development

### Run Tests

```bash
cd backend
npm run type-check
npm run lint
```

### Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

## Troubleshooting

### Backend won't start
- Check that all environment variables are set
- Ensure database is initialized: `npm run db:init`
- Verify Node.js version (20+)

### Voice not working
- Verify ElevenLabs API key is valid
- Check voice IDs are correct
- Ensure agent has valid voiceId

### STT not working
- Add OpenAI API key to `.env`
- Check microphone permissions
- Verify audio format is supported

### High latency
- Check network connection
- Consider using Claude Haiku for some agents
- Optimize prompt lengths
- Enable audio caching

## Architecture

### Conversation Flow

1. **User speaks** → Audio captured
2. **STT** → Whisper transcribes to text
3. **Agent generation** → All agents generate responses (parallel)
4. **Scoring** → Claude scores each response
5. **Winner selection** → Highest scored response chosen
6. **TTS** → ElevenLabs synthesizes audio
7. **Playback** → Audio played to user
8. **Repeat** → Loop continues

### Natural Competition Algorithm

All agents generate responses simultaneously. Each response is scored on:
- **Relevance** (0-4): Advances conversation
- **Consistency** (0-3): Matches persona
- **Engagement** (0-3): Interesting/valuable

Highest scoring agent speaks next.

## Future Enhancements

See `project-plan.md` for complete roadmap, including:
- Voice cloning for custom voices
- Long-term agent memory
- Multi-modal with video avatars
- Mobile applications
- Team workspaces
- API access

## Contributing

This is currently an MVP. Contributions welcome after initial release.

## License

MIT

## Support

- **Documentation**: See `project-plan.md` for detailed technical docs
- **Issues**: GitHub Issues (to be set up)
- **Questions**: Contact project maintainer

---

**Status**: Backend complete ✅ | Frontend in progress 🚧

Built with ❤️ using Claude Sonnet 4.5
