/**
 * Database connection + schema.
 *
 * Uses SQLite (better-sqlite3) so the project runs with zero external
 * services during development and marking. The schema below is plain
 * SQL and maps directly onto the ERD in the project proposal — swapping
 * to MySQL/PostgreSQL later means changing this file only (and the
 * AUTOINCREMENT / PRAGMA lines), not the routes or controllers.
 */

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "ccf.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('staff', 'admin')),
    branch        TEXT,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

    CREATE TABLE IF NOT EXISTS notification_settings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    new_complaints      INTEGER NOT NULL DEFAULT 1,
    complaint_assignments INTEGER NOT NULL DEFAULT 1,
    status_updates      INTEGER NOT NULL DEFAULT 1,
    deadline_reminders  INTEGER NOT NULL DEFAULT 1,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

    CREATE TABLE IF NOT EXISTS notifications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    complaint_id  INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    is_read       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    reference      TEXT NOT NULL UNIQUE,
    customer_name  TEXT NOT NULL,
    service_number TEXT NOT NULL,
    phone          TEXT,
    email          TEXT,
    category       TEXT NOT NULL,
    description    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Open'
                     CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    assigned_to    INTEGER REFERENCES users(id),
    submitted_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS complaint_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    status       TEXT NOT NULL,
    note         TEXT NOT NULL,
    created_by   INTEGER REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

    CREATE TABLE IF NOT EXISTS system_settings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
  CREATE INDEX IF NOT EXISTS idx_logs_complaint ON complaint_logs(complaint_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
`);

module.exports = db;
