import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, ConversationAnalysis } from '../../../shared/types';

export interface CreateConversationData {
  title: string;
  topic: string;
  agentIds: string[];
}

export interface CreateMessageData {
  conversationId: string;
  speaker: string;
  text: string;
  audioUrl?: string;
}

export interface CreateAnalysisData {
  conversationId: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  keyMoments: string[];
  feedback: string;
}

export class ConversationModel {
  static create(data: CreateConversationData): Conversation {
    const id = uuidv4();
    const now = new Date().toISOString();

    const insertConv = db.prepare(`
      INSERT INTO conversations (id, title, topic, status, created_at)
      VALUES (?, ?, ?, 'active', ?)
    `);

    insertConv.run(id, data.title, data.topic, now);

    // Add agent associations
    const insertAgent = db.prepare(`
      INSERT INTO conversation_agents (conversation_id, agent_id)
      VALUES (?, ?)
    `);

    for (const agentId of data.agentIds) {
      insertAgent.run(id, agentId);
    }

    return this.findById(id)!;
  }

  static findById(id: string): Conversation | undefined {
    const stmt = db.prepare(`
      SELECT id, title, topic, status,
             created_at as createdAt, completed_at as completedAt
      FROM conversations
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    // Get agent IDs
    const agentStmt = db.prepare(`
      SELECT agent_id as agentId
      FROM conversation_agents
      WHERE conversation_id = ?
    `);
    const agentRows = agentStmt.all(id) as any[];
    const agentIds = agentRows.map(r => r.agentId);

    // Get messages
    const messages = this.getMessages(id);

    // Get analysis if exists
    const analysis = this.getAnalysis(id);

    return {
      ...row,
      agentIds,
      messages,
      analysis,
      createdAt: new Date(row.createdAt),
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    };
  }

  static findAll(limit = 50, offset = 0): Conversation[] {
    const stmt = db.prepare(`
      SELECT id, title, topic, status,
             created_at as createdAt, completed_at as completedAt
      FROM conversations
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];

    return rows.map(row => {
      const agentStmt = db.prepare(`
        SELECT agent_id as agentId
        FROM conversation_agents
        WHERE conversation_id = ?
      `);
      const agentRows = agentStmt.all(row.id) as any[];
      const agentIds = agentRows.map(r => r.agentId);

      const messages = this.getMessages(row.id);
      const analysis = this.getAnalysis(row.id);

      return {
        ...row,
        agentIds,
        messages,
        analysis,
        createdAt: new Date(row.createdAt),
        completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      };
    });
  }

  static getMessages(conversationId: string): Message[] {
    const stmt = db.prepare(`
      SELECT id, conversation_id as conversationId, speaker, text, audio_url as audioUrl, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(conversationId) as any[];
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  static addMessage(data: CreateMessageData): Message {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, speaker, text, audio_url, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.conversationId, data.speaker, data.text, data.audioUrl || null, now);

    return {
      id,
      conversationId: data.conversationId,
      speaker: data.speaker,
      text: data.text,
      audioUrl: data.audioUrl,
      timestamp: new Date(now),
    };
  }

  static getAnalysis(conversationId: string): ConversationAnalysis | undefined {
    const stmt = db.prepare(`
      SELECT summary, strengths, improvements, key_moments as keyMoments, feedback, generated_at as generatedAt
      FROM conversation_analysis
      WHERE conversation_id = ?
    `);

    const row = stmt.get(conversationId) as any;
    if (!row) return undefined;

    return {
      summary: row.summary,
      userPerformance: {
        strengths: JSON.parse(row.strengths),
        improvements: JSON.parse(row.improvements),
        keyMoments: JSON.parse(row.keyMoments),
      },
      feedback: row.feedback,
      generatedAt: new Date(row.generatedAt),
    };
  }

  static saveAnalysis(data: CreateAnalysisData): ConversationAnalysis {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO conversation_analysis (id, conversation_id, summary, strengths, improvements, key_moments, feedback, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.conversationId,
      data.summary,
      JSON.stringify(data.strengths),
      JSON.stringify(data.improvements),
      JSON.stringify(data.keyMoments),
      data.feedback,
      now
    );

    return {
      summary: data.summary,
      userPerformance: {
        strengths: data.strengths,
        improvements: data.improvements,
        keyMoments: data.keyMoments,
      },
      feedback: data.feedback,
      generatedAt: new Date(now),
    };
  }

  static complete(id: string): boolean {
    const stmt = db.prepare(`
      UPDATE conversations
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
