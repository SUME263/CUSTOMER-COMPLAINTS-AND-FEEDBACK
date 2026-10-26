// database connection and schema 
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "ccf.db");

// create the folder for the database if it does not already exist
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
    nrc_number TEXT NOT NULL,
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

// might not need these two when creating a new file
// migrate existing databases from service number to nrc number.
const complaintColumns = db
  .prepare("PRAGMA table_info(complaints)")
  .all();

const hasServiceNumber = complaintColumns.some(
  (column) => column.name === "service_number",
);

const hasNrcNumber = complaintColumns.some(
  (column) => column.name === "nrc_number",
);

if (hasServiceNumber && !hasNrcNumber) {
  db.exec(`
    ALTER TABLE complaints
    RENAME COLUMN service_number TO nrc_number
  `);
}

// migrate existing databases to support the assigner role and repair foreign-key references created during the users migration.
const userTableSql = db
  .prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'",
  )
  .get();

if (
  userTableSql &&
  userTableSql.sql &&
  userTableSql.sql.includes("role IN ('staff', 'admin')")
) {
  db.pragma("foreign_keys = OFF");

  const migrateUsers = db.transaction(() => {
    // preserve existing data by temporarily renaming all tables
    // that contain foreign keys to users.
    db.exec(`
      ALTER TABLE notification_settings RENAME TO notification_settings_old;
      ALTER TABLE notifications RENAME TO notifications_old;
      ALTER TABLE complaint_logs RENAME TO complaint_logs_old;
      ALTER TABLE complaints RENAME TO complaints_old;
      ALTER TABLE users RENAME TO users_old;
    `);

    // recreate users with the assigner role.
    db.exec(`
      CREATE TABLE users (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        email          TEXT NOT NULL UNIQUE,
        password_hash  TEXT NOT NULL,
        role           TEXT NOT NULL
                       CHECK (role IN ('staff', 'assigner', 'admin')),
        branch         TEXT,
        status         TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'suspended')),
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        branch,
        status,
        created_at
      )
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        branch,
        status,
        created_at
      FROM users_old;
    `);

    // recreate complaints with the correct users foreign key.
    db.exec(`
      CREATE TABLE complaints (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        reference      TEXT NOT NULL UNIQUE,
        customer_name  TEXT NOT NULL,
        nrc_number     TEXT NOT NULL,
        phone          TEXT,
        email          TEXT,
        category       TEXT NOT NULL,
        description    TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'Open'
                       CHECK (
                         status IN (
                           'Open',
                           'In Progress',
                           'Resolved',
                           'Closed'
                         )
                       ),
        assigned_to    INTEGER REFERENCES users(id),
        submitted_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO complaints (
        id,
        reference,
        customer_name,
        nrc_number,
        phone,
        email,
        category,
        description,
        status,
        assigned_to,
        submitted_at,
        updated_at
      )
      SELECT
        id,
        reference,
        customer_name,
        nrc_number,
        phone,
        email,
        category,
        description,
        status,
        assigned_to,
        submitted_at,
        updated_at
      FROM complaints_old;
    `);

    // recreate complaint logs.
    db.exec(`
      CREATE TABLE complaint_logs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL
                     REFERENCES complaints(id) ON DELETE CASCADE,
        status       TEXT NOT NULL,
        note         TEXT NOT NULL,
        created_by   INTEGER REFERENCES users(id),
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO complaint_logs (
        id,
        complaint_id,
        status,
        note,
        created_by,
        created_at
      )
      SELECT
        id,
        complaint_id,
        status,
        note,
        created_by,
        created_at
      FROM complaint_logs_old;
    `);

    // recreate notifications.
    db.exec(`
      CREATE TABLE notifications (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL
                      REFERENCES users(id) ON DELETE CASCADE,
        complaint_id  INTEGER
                      REFERENCES complaints(id) ON DELETE CASCADE,
        type          TEXT NOT NULL,
        title         TEXT NOT NULL,
        message       TEXT NOT NULL,
        is_read       INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO notifications (
        id,
        user_id,
        complaint_id,
        type,
        title,
        message,
        is_read,
        created_at
      )
      SELECT
        id,
        user_id,
        complaint_id,
        type,
        title,
        message,
        is_read,
        created_at
      FROM notifications_old;
    `);

    // recreate notification settings.
    db.exec(`
      CREATE TABLE notification_settings (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id               INTEGER NOT NULL UNIQUE
                              REFERENCES users(id) ON DELETE CASCADE,
        new_complaints        INTEGER NOT NULL DEFAULT 1,
        complaint_assignments INTEGER NOT NULL DEFAULT 1,
        status_updates        INTEGER NOT NULL DEFAULT 1,
        deadline_reminders    INTEGER NOT NULL DEFAULT 1,
        updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO notification_settings (
        id,
        user_id,
        new_complaints,
        complaint_assignments,
        status_updates,
        deadline_reminders,
        updated_at
      )
      SELECT
        id,
        user_id,
        new_complaints,
        complaint_assignments,
        status_updates,
        deadline_reminders,
        updated_at
      FROM notification_settings_old;
    `);

    // remove the temporary tables.
    db.exec(`
      DROP TABLE notification_settings_old;
      DROP TABLE notifications_old;
      DROP TABLE complaint_logs_old;
      DROP TABLE complaints_old;
      DROP TABLE users_old;
    `);
  });

  migrateUsers();

  db.pragma("foreign_keys = ON");
}

module.exports = db;
