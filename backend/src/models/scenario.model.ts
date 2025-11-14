import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Scenario, ScenarioWithAgents, Agent } from '../../../shared/types';
import { AgentModel } from './agent.model';

export interface CreateScenarioData {
  title: string;
  description: string;
  category: string;
  topic: string;
  agentIds: string[];
  agentsStartFirst?: boolean;
  difficultyLevel?: string;
  estimatedDuration?: number;
  recommendedFor?: string;
}

export interface UpdateScenarioData {
  title?: string;
  description?: string;
  category?: string;
  topic?: string;
  agentIds?: string[];
  agentsStartFirst?: boolean;
  difficultyLevel?: string;
  estimatedDuration?: number;
  recommendedFor?: string;
}

export class ScenarioModel {
  /**
   * Create a new scenario with associated agents
   */
  static create(data: CreateScenarioData): Scenario {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scenarios (id, title, description, category, topic, agents_start_first, difficulty_level, estimated_duration, recommended_for, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.title,
      data.description,
      data.category,
      data.topic,
      data.agentsStartFirst ? 1 : 0,
      data.difficultyLevel || null,
      data.estimatedDuration || null,
      data.recommendedFor || null,
      now,
      now
    );

    // Add agent associations
    if (data.agentIds && data.agentIds.length > 0) {
      const agentStmt = db.prepare(`
        INSERT INTO scenario_agents (scenario_id, agent_id, display_order)
        VALUES (?, ?, ?)
      `);

      data.agentIds.forEach((agentId, index) => {
        agentStmt.run(id, agentId, index);
      });
    }

    return this.findById(id)!;
  }

  /**
   * Find scenario by ID (without agents)
   */
  static findById(id: string): Scenario | undefined {
    const stmt = db.prepare(`
      SELECT id, title, description, category, topic,
             agents_start_first as agentsStartFirst,
             difficulty_level as difficultyLevel,
             estimated_duration as estimatedDuration,
             recommended_for as recommendedFor,
             created_at as createdAt, updated_at as updatedAt
      FROM scenarios
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    // Get agent IDs for this scenario
    const agentStmt = db.prepare(`
      SELECT agent_id FROM scenario_agents
      WHERE scenario_id = ?
      ORDER BY display_order
    `);
    const agentRows = agentStmt.all(id) as any[];
    const agentIds = agentRows.map(r => r.agent_id);

    return {
      ...row,
      agentIds,
      agentsStartFirst: Boolean(row.agentsStartFirst),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Find scenario by ID with full agent objects populated
   */
  static findByIdWithAgents(id: string): ScenarioWithAgents | undefined {
    const scenario = this.findById(id);
    if (!scenario) return undefined;

    const agents = AgentModel.findByIds(scenario.agentIds);

    return {
      ...scenario,
      agents,
    };
  }

  /**
   * Find all scenarios (without agents)
   */
  static findAll(): Scenario[] {
    const stmt = db.prepare(`
      SELECT id, title, description, category, topic,
             agents_start_first as agentsStartFirst,
             difficulty_level as difficultyLevel,
             estimated_duration as estimatedDuration,
             recommended_for as recommendedFor,
             created_at as createdAt, updated_at as updatedAt
      FROM scenarios
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => {
      // Get agent IDs for each scenario
      const agentStmt = db.prepare(`
        SELECT agent_id FROM scenario_agents
        WHERE scenario_id = ?
        ORDER BY display_order
      `);
      const agentRows = agentStmt.all(row.id) as any[];
      const agentIds = agentRows.map(r => r.agent_id);

      return {
        ...row,
        agentIds,
        agentsStartFirst: Boolean(row.agentsStartFirst),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    });
  }

  /**
   * Find all scenarios with full agent objects populated
   */
  static findAllWithAgents(): ScenarioWithAgents[] {
    const scenarios = this.findAll();

    return scenarios.map(scenario => {
      const agents = AgentModel.findByIds(scenario.agentIds);
      return {
        ...scenario,
        agents,
      };
    });
  }

  /**
   * Find scenarios by category
   */
  static findByCategory(category: string): Scenario[] {
    const stmt = db.prepare(`
      SELECT id, title, description, category, topic,
             agents_start_first as agentsStartFirst,
             difficulty_level as difficultyLevel,
             estimated_duration as estimatedDuration,
             recommended_for as recommendedFor,
             created_at as createdAt, updated_at as updatedAt
      FROM scenarios
      WHERE category = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(category) as any[];

    return rows.map(row => {
      // Get agent IDs for each scenario
      const agentStmt = db.prepare(`
        SELECT agent_id FROM scenario_agents
        WHERE scenario_id = ?
        ORDER BY display_order
      `);
      const agentRows = agentStmt.all(row.id) as any[];
      const agentIds = agentRows.map(r => r.agent_id);

      return {
        ...row,
        agentIds,
        agentsStartFirst: Boolean(row.agentsStartFirst),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    });
  }

  /**
   * Find scenarios by category with agents
   */
  static findByCategoryWithAgents(category: string): ScenarioWithAgents[] {
    const scenarios = this.findByCategory(category);

    return scenarios.map(scenario => {
      const agents = AgentModel.findByIds(scenario.agentIds);
      return {
        ...scenario,
        agents,
      };
    });
  }

  /**
   * Update a scenario
   */
  static update(id: string, data: UpdateScenarioData): Scenario | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.topic !== undefined) {
      updates.push('topic = ?');
      values.push(data.topic);
    }
    if (data.difficultyLevel !== undefined) {
      updates.push('difficulty_level = ?');
      values.push(data.difficultyLevel);
    }
    if (data.estimatedDuration !== undefined) {
      updates.push('estimated_duration = ?');
      values.push(data.estimatedDuration);
    }
    if (data.recommendedFor !== undefined) {
      updates.push('recommended_for = ?');
      values.push(data.recommendedFor);
    }
    if (data.agentsStartFirst !== undefined) {
      updates.push('agents_start_first = ?');
      values.push(data.agentsStartFirst ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE scenarios
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Update agent associations if provided
    if (data.agentIds !== undefined) {
      // Remove existing associations
      const deleteStmt = db.prepare('DELETE FROM scenario_agents WHERE scenario_id = ?');
      deleteStmt.run(id);

      // Add new associations
      if (data.agentIds.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO scenario_agents (scenario_id, agent_id, display_order)
          VALUES (?, ?, ?)
        `);

        data.agentIds.forEach((agentId, index) => {
          insertStmt.run(id, agentId, index);
        });
      }
    }

    return this.findById(id);
  }

  /**
   * Delete a scenario
   */
  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM scenarios WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Add an agent to a scenario
   */
  static addAgent(scenarioId: string, agentId: string, displayOrder?: number): void {
    // Get current max order
    const maxOrderStmt = db.prepare(`
      SELECT MAX(display_order) as maxOrder FROM scenario_agents WHERE scenario_id = ?
    `);
    const maxOrderRow = maxOrderStmt.get(scenarioId) as any;
    const order = displayOrder !== undefined ? displayOrder : (maxOrderRow?.maxOrder || 0) + 1;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO scenario_agents (scenario_id, agent_id, display_order)
      VALUES (?, ?, ?)
    `);

    stmt.run(scenarioId, agentId, order);
  }

  /**
   * Remove an agent from a scenario
   */
  static removeAgent(scenarioId: string, agentId: string): void {
    const stmt = db.prepare(`
      DELETE FROM scenario_agents
      WHERE scenario_id = ? AND agent_id = ?
    `);

    stmt.run(scenarioId, agentId);
  }
}
