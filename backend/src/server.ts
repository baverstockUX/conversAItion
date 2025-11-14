import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { initializeDatabase } from './db';

// Import routes
import agentsRoutes from './routes/agents.routes';
import conversationsRoutes from './routes/conversations.routes';
import voicesRoutes from './routes/voices.routes';
import scenariosRoutes from './routes/scenarios.routes';

// Import orchestrator
import { orchestrator } from './orchestrator';
import { ConversationModel } from './models/conversation.model';
import { StartupValidationService } from './services/startup-validation.service';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize database
initializeDatabase();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS - allow all localhost ports in development
const corsOptions = NODE_ENV === 'development'
  ? {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow all localhost origins in development
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    }
  : {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
    };

// Configure Socket.io
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 10e6, // 10 MB for audio files
});

// Socket.io authentication middleware
const WS_AUTH_SECRET = process.env.WS_AUTH_SECRET;

if (!WS_AUTH_SECRET) {
  console.error('❌ WS_AUTH_SECRET not set in environment variables');
  process.exit(1);
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.warn(`⚠️  Connection rejected: No auth token provided (${socket.id})`);
    return next(new Error('Authentication required'));
  }

  if (token !== WS_AUTH_SECRET) {
    console.warn(`⚠️  Connection rejected: Invalid auth token (${socket.id})`);
    return next(new Error('Invalid authentication token'));
  }

  // Token is valid, allow connection
  next();
});

console.log('🔒 WebSocket authentication enabled');

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/agents', agentsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/voices', voicesRoutes);
app.use('/api/scenarios', scenariosRoutes);

// Track which socket is in which conversation
const socketConversations = new Map<string, string>(); // socketId -> conversationId

// Socket.io event handlers
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Start conversation
  socket.on('conversation:start', async (data: { agentIds: string[]; topic: string; agentsStartFirst?: boolean; agentOnlyMode?: boolean; userName?: string; userRole?: string; title?: string }) => {
    try {
      const { agentIds, topic, agentsStartFirst = false, agentOnlyMode = false, userName, userRole, title } = data;

      // End any existing conversation for this socket
      const existingConversationId = socketConversations.get(socket.id);
      if (existingConversationId) {
        console.log(`Ending existing conversation ${existingConversationId} for socket ${socket.id}`);
        await orchestrator.endConversation(existingConversationId);
      }

      // Create conversation in database
      const conversation = ConversationModel.create({
        title: title || `Conversation about ${topic}`,
        topic,
        agentIds,
      });

      // Map this socket to this conversation
      socketConversations.set(socket.id, conversation.id);

      // Start orchestrator with user context
      await orchestrator.startConversation(conversation.id, agentIds, topic, agentsStartFirst, agentOnlyMode, userName, userRole);

      // Send success response only to this socket
      socket.emit('conversation:started', {
        conversationId: conversation.id,
        agents: conversation.agentIds,
      });

      console.log(`Conversation started: ${conversation.id} for socket ${socket.id}${agentsStartFirst ? ' (agents will start)' : ''}${userName ? ` with ${userName}${userRole ? ` (${userRole})` : ''}` : ''}`);
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // User speaks (sends audio)
  socket.on('user:speak', async (data: { audio: ArrayBuffer; conversationId: string }) => {
    try {
      const { audio, conversationId } = data;

      // Convert ArrayBuffer to Buffer
      const audioBuffer = Buffer.from(audio);

      // Process audio through orchestrator
      await orchestrator.processUserSpeech(conversationId, audioBuffer);
    } catch (error: any) {
      console.error('Error processing user speech:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // User interrupts
  socket.on('user:interrupt', (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;
      orchestrator.interruptConversation(conversationId);
      socket.emit('conversation:interrupted', { conversationId });
      console.log(`Conversation interrupted: ${conversationId}`);
    } catch (error: any) {
      console.error('Error interrupting conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Audio playback ended
  socket.on('audio:playback:ended', () => {
    console.log('Frontend reported audio playback ended');
    orchestrator.emit('audio:playback:ended', socket.id);
  });

  // End conversation
  socket.on('conversation:end', async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;
      await orchestrator.endConversation(conversationId);
      socketConversations.delete(socket.id);
      socket.emit('conversation:ended', { conversationId });
      console.log(`Conversation ended: ${conversationId}`);
    } catch (error: any) {
      console.error('Error ending conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnect - clean up any active conversations
  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);

    const conversationId = socketConversations.get(socket.id);
    if (conversationId) {
      console.log(`Cleaning up conversation ${conversationId} for disconnected socket ${socket.id}`);
      try {
        await orchestrator.endConversation(conversationId);
      } catch (error) {
        console.error(`Error cleaning up conversation ${conversationId}:`, error);
      }
      socketConversations.delete(socket.id);
    }
  });
});

// Helper function to find socket for a conversation
function getSocketForConversation(conversationId: string): Socket | null {
  for (const [socketId, convId] of socketConversations.entries()) {
    if (convId === conversationId) {
      const socket = io.sockets.sockets.get(socketId);
      return socket || null;
    }
  }
  return null;
}

// Set up orchestrator event forwarding - send only to the socket owning the conversation
orchestrator.on('status:update', (conversationId: string, status: string) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('status:update', { status });
  }
});

orchestrator.on('agent:speaking', (conversationId: string, agentId: string, text: string) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('agent:speaking', { agentId, text });
  }
});

orchestrator.on('agent:audio', (conversationId: string, audio: Buffer) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('agent:audio', { audio: audio.buffer });
  }
});

orchestrator.on('agent:audio:chunk', (conversationId: string, chunk: Buffer, isFirstChunk: boolean) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('agent:audio:chunk', { chunk: chunk.buffer, isFirstChunk });
  }
});

orchestrator.on('agent:audio:end', (conversationId: string) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('agent:audio:end', {});
  }
});

orchestrator.on('transcript:update', (conversationId: string, message: any) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('transcript:update', { message });
  }
});

orchestrator.on('error', (conversationId: string, message: string) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('error', { message });
  }
});

orchestrator.on('conversation:interrupted', (conversationId: string) => {
  const socket = getSocketForConversation(conversationId);
  if (socket) {
    socket.emit('conversation:interrupted', {});
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with API validation
async function startServer() {
  // Validate all API services before starting
  const validationResults = await StartupValidationService.validateAllServices();

  // Check if we should proceed with startup
  const shouldStart = StartupValidationService.shouldAllowStartup(validationResults);

  if (!shouldStart) {
    console.error('❌ Server startup aborted due to critical API errors.');
    console.error('   Please fix the errors above and restart the server.\n');
    process.exit(1);
  }

  // Start listening
  httpServer.listen(PORT, () => {
    console.log(`🎙️  ConversAItion Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}\n`);
  });
}

// Run startup
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
