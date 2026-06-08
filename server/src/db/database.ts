import Database from 'better-sqlite3';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

const dataDir = resolve(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = resolve(dataDir, 'calendar.db');
const _db = new Database(dbPath);
export const db = _db;

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      creator TEXT NOT NULL CHECK (creator IN ('victor', 'sandra')),
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      gmail_message_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_start_end ON events(start, end);
    CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator);

    CREATE TABLE IF NOT EXISTS gmail_suggestions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      from_email TEXT NOT NULL,
      received_at TEXT NOT NULL,
      suggested_event TEXT NOT NULL,
      confidence REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gmail_suggestions_status ON gmail_suggestions(status);

    CREATE TABLE IF NOT EXISTS gmail_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT,
      refresh_token TEXT,
      expiry_date INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_ids TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
  `);
}

export function closeDatabase() {
  db.close();
}