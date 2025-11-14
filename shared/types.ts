// Shared types between frontend and backend

export interface Agent {
  id: string;
  name: string;
  role: string;
  persona: string;
  voiceId: string;
  avatarUrl: string;
  usesExpletives: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  speaker: 'user' | string; // 'user' or agent ID
  text: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface ConversationAnalysis {
  summary: string;
  userPerformance: {
    strengths: string[];
    improvements: string[];
    keyMoments: string[];
  };
  feedback: string;
  generatedAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  topic: string;
  agentIds: string[];
  messages: Message[];
  status: 'active' | 'completed';
  analysis?: ConversationAnalysis;
  createdAt: Date;
  completedAt?: Date;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

export interface ConversationStartRequest {
  agentIds: string[];
  topic: string;
  title?: string;
  agentsStartFirst?: boolean;
  agentOnlyMode?: boolean;
}

export interface WebSocketEvents {
  // Client -> Server
  'conversation:start': ConversationStartRequest;
  'conversation:end': { conversationId: string };
  'user:speak': { audio: ArrayBuffer; conversationId: string };
  'user:interrupt': { conversationId: string };

  // Server -> Client
  'conversation:started': { conversationId: string; agents: Agent[] };
  'conversation:ended': { conversationId: string };
  'agent:speaking': { agentId: string; text: string };
  'agent:audio': { audio: ArrayBuffer };
  'transcript:update': { message: Message };
  'error': { message: string; code?: string };
  'status:update': { status: 'listening' | 'thinking' | 'speaking' | 'idle' };
}

export interface AgentResponse {
  agentId: string;
  text: string;
  score: number;
}

export interface ScoringCriteria {
  relevance: number; // 0-4
  consistency: number; // 0-3
  engagement: number; // 0-3
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: 'interview' | 'sales' | 'medical' | 'executive' | 'education' | 'other';
  topic: string;
  agentIds: string[];
  agentsStartFirst?: boolean; // If true, agents kick off the conversation
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration?: number; // in minutes
  recommendedFor?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioWithAgents extends Scenario {
  agents: Agent[];
}
