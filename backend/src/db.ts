import Database from 'better-sqlite3';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../database/conversaition.db');

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  console.log('Initializing database...');

  // Agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      persona TEXT NOT NULL,
      voice_id TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      uses_expletives INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add uses_expletives column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(agents)").all() as any[];
    const hasExpletivesColumn = columns.some((col: any) => col.name === 'uses_expletives');
    if (!hasExpletivesColumn) {
      db.exec(`ALTER TABLE agents ADD COLUMN uses_expletives INTEGER DEFAULT 0`);
      console.log('Added uses_expletives column to agents table');
    }
  } catch (error) {
    console.error('Error checking/adding uses_expletives column:', error);
  }

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'completed')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  // Conversation agents (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_agents (
      conversation_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      PRIMARY KEY (conversation_id, agent_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      audio_url TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Conversation analysis table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_analysis (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      strengths TEXT NOT NULL,
      improvements TEXT NOT NULL,
      key_moments TEXT NOT NULL,
      feedback TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Scenarios table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      topic TEXT NOT NULL,
      agents_start_first INTEGER DEFAULT 0,
      difficulty_level TEXT,
      estimated_duration INTEGER,
      recommended_for TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add agents_start_first column if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(scenarios)").all() as any[];
    const hasAgentsStartFirstColumn = columns.some((col: any) => col.name === 'agents_start_first');
    if (!hasAgentsStartFirstColumn) {
      db.exec(`ALTER TABLE scenarios ADD COLUMN agents_start_first INTEGER DEFAULT 0`);
      console.log('Added agents_start_first column to scenarios table');
    }
  } catch (error) {
    console.error('Error checking/adding agents_start_first column:', error);
  }

  // Scenario agents (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenario_agents (
      scenario_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      PRIMARY KEY (scenario_id, agent_id),
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent ON conversation_agents(agent_id);
    CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(category);
    CREATE INDEX IF NOT EXISTS idx_scenario_agents_agent ON scenario_agents(agent_id);
  `);

  console.log('Database initialized successfully');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase();
  db.close();
}

export default db;
