const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const logger = require('./logger');

let db;

async function init() {
  const filename = process.env.SQLITE_FILE || './helium.db';
  db = await open({ filename, driver: sqlite3.Database });

  // Create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      provider TEXT,
      data TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      started_at INTEGER,
      last_seen INTEGER,
      data TEXT
    );
  `);

  logger.info('Storage initialized', { filename });
}

async function saveOrUpdateUser(user) {
  if (!db) throw new Error('db not initialized');
  const now = Date.now();
  const data = JSON.stringify(user.raw || user);
  await db.run(
    `INSERT INTO users (id, provider, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, data = excluded.data, updated_at = excluded.updated_at;`,
    user.id, user.provider, data, now, now
  );
}

async function getUserById(id) {
  if (!db) throw new Error('db not initialized');
  const row = await db.get('SELECT * FROM users WHERE id = ?', id);
  if (!row) return null;
  return { id: row.id, provider: row.provider, data: JSON.parse(row.data), created_at: row.created_at, updated_at: row.updated_at };
}

async function saveSession(session) {
  if (!db) throw new Error('db not initialized');
  const now = Date.now();
  const data = JSON.stringify(session.data || {});
  await db.run(
    `INSERT INTO sessions (id, user_id, started_at, last_seen, data)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, data = excluded.data;`,
    session.id, session.user_id || null, session.started_at || now, session.last_seen || now, data
  );
}

module.exports = { init, saveOrUpdateUser, getUserById, saveSession };
