import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from '../../../shared/types';

export interface CreateAgentData {
  name: string;
  role: string;
  persona: string;
  voiceId: string;
  avatarUrl: string;
}

export interface UpdateAgentData {
  name?: string;
  role?: string;
  persona?: string;
  voiceId?: string;
  avatarUrl?: string;
}

export class AgentModel {
  static create(data: CreateAgentData): Agent {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO agents (id, name, role, persona, voice_id, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.role, data.persona, data.voiceId, data.avatarUrl, now, now);

    return this.findById(id)!;
  }

  static findById(id: string): Agent | undefined {
    const stmt = db.prepare(`
      SELECT id, name, role, persona, voice_id as voiceId, avatar_url as avatarUrl,
             created_at as createdAt, updated_at as updatedAt
      FROM agents
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  static findAll(): Agent[] {
    const stmt = db.prepare(`
      SELECT id, name, role, persona, voice_id as voiceId, avatar_url as avatarUrl,
             created_at as createdAt, updated_at as updatedAt
      FROM agents
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  static findByIds(ids: string[]): Agent[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT id, name, role, persona, voice_id as voiceId, avatar_url as avatarUrl,
             created_at as createdAt, updated_at as updatedAt
      FROM agents
      WHERE id IN (${placeholders})
    `);

    const rows = stmt.all(...ids) as any[];
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  static update(id: string, data: UpdateAgentData): Agent | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.persona !== undefined) {
      updates.push('persona = ?');
      values.push(data.persona);
    }
    if (data.voiceId !== undefined) {
      updates.push('voice_id = ?');
      values.push(data.voiceId);
    }
    if (data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(data.avatarUrl);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE agents
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static count(): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM agents');
    const result = stmt.get() as { count: number };
    return result.count;
  }
}
