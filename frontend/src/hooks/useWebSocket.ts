import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, Agent } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface WebSocketStatus {
  connected: boolean;
  conversationStatus: 'idle' | 'listening' | 'thinking' | 'speaking';
  currentSpeaker?: string;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    conversationStatus: 'idle',
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setStatus((prev) => ({ ...prev, connected: true }));
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setStatus((prev) => ({ ...prev, connected: false }));
    });

    socket.on('conversation:started', (data: { conversationId: string; agents: Agent[] }) => {
      console.log('Conversation started:', data.conversationId);
      setCurrentConversationId(data.conversationId);
      setMessages([]);
      setError(null);
    });

    socket.on('status:update', (data: { status: 'idle' | 'listening' | 'thinking' | 'speaking' }) => {
      setStatus((prev) => ({ ...prev, conversationStatus: data.status }));
    });

    socket.on('agent:speaking', (data: { agentId: string; text: string }) => {
      console.log('Agent speaking:', data.agentId, data.text);
      setStatus((prev) => ({ ...prev, currentSpeaker: data.agentId }));
    });

    socket.on('agent:audio', (data: { audio: ArrayBuffer }) => {
      console.log('Received agent audio, size:', data.audio?.byteLength || 0);
      // Audio will be handled by playback hook
      const event = new CustomEvent('agent:audio', {
        detail: { audio: data.audio, socket }
      });
      window.dispatchEvent(event);
    });

    socket.on('agent:audio:chunk', (data: { chunk: ArrayBuffer; isFirstChunk: boolean }) => {
      console.log('Received audio chunk, size:', data.chunk?.byteLength || 0, 'first:', data.isFirstChunk);
      // Dispatch as custom event for audio player
      const event = new CustomEvent('agent:audio:chunk', {
        detail: { chunk: data.chunk, socket, isFirstChunk: data.isFirstChunk }
      });
      window.dispatchEvent(event);
    });

    socket.on('agent:audio:end', () => {
      console.log('Audio streaming complete');
      // Dispatch as custom event for audio player
      const event = new CustomEvent('agent:audio:end', {
        detail: { socket }
      });
      window.dispatchEvent(event);
    });

    socket.on('transcript:update', (data: { message: Message }) => {
      console.log('Transcript update:', data.message);
      setMessages((prev) => [...prev, data.message]);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data.message);
      setError(data.message);
    });

    socket.on('conversation:ended', () => {
      console.log('Conversation ended');
      setStatus((prev) => ({ ...prev, conversationStatus: 'idle', currentSpeaker: undefined }));
    });

    socket.on('conversation:interrupted', () => {
      console.log('Conversation interrupted');
      setStatus((prev) => ({ ...prev, conversationStatus: 'idle', currentSpeaker: undefined }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startConversation = useCallback(
    (agentIds: string[], topic: string, agentsStartFirst: boolean = false, agentOnlyMode: boolean = false, userName?: string, userRole?: string, title?: string) => {
      if (!socketRef.current) {
        setError('WebSocket not connected');
        return;
      }

      socketRef.current.emit('conversation:start', { agentIds, topic, agentsStartFirst, agentOnlyMode, userName, userRole, title });
    },
    []
  );

  const sendAudio = useCallback(
    (audio: ArrayBuffer) => {
      if (!socketRef.current || !currentConversationId) {
        setError('No active conversation');
        return;
      }

      socketRef.current.emit('user:speak', {
        audio,
        conversationId: currentConversationId,
      });
    },
    [currentConversationId]
  );

  const interrupt = useCallback(() => {
    if (!socketRef.current || !currentConversationId) {
      return;
    }

    socketRef.current.emit('user:interrupt', {
      conversationId: currentConversationId,
    });
  }, [currentConversationId]);

  const endConversation = useCallback(() => {
    if (!socketRef.current || !currentConversationId) {
      return;
    }

    socketRef.current.emit('conversation:end', {
      conversationId: currentConversationId,
    });

    setCurrentConversationId(null);
  }, [currentConversationId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    currentConversationId,
    messages,
    error,
    startConversation,
    sendAudio,
    interrupt,
    endConversation,
    clearError,
  };
}
