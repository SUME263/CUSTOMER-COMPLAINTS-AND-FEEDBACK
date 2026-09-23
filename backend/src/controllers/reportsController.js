const db = require('../config/db');

/** GET /api/reports/summary — staff/admin. Feeds the admin compliance dashboard. */
function summary(req, res) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM complaints').get().n;
  const open = db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE status = 'Open'").get().n;
  const resolvedOrClosed = db
    .prepare("SELECT COUNT(*) AS n FROM complaints WHERE status IN ('Resolved', 'Closed')")
    .get().n;

  const byCategory = db
    .prepare('SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC')
    .all();

const getSetting = (key, fallback) => {
  const row = db
    .prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?')
    .get(key);

  return row ? Number(row.setting_value) : fallback;
};

const ackDays = getSetting('acknowledge_days', 2);
const resolveDays = getSetting('resolve_days', 14);

  // Complaints still Open past the acknowledgement window — a simple
  // regulatory-risk flag for the BoZ directive referenced in the proposal.
  const overdue = db
    .prepare(
      `SELECT reference, submitted_at FROM complaints
       WHERE status = 'Open'
       AND julianday('now') - julianday(submitted_at) > ?`
    )
    .all(ackDays);

  res.json({
    total,
    open,
    resolvedOrClosed,
    resolutionRate: total ? Math.round((resolvedOrClosed / total) * 100) : 0,
    byCategory,
    thresholds: { acknowledgeDays: ackDays, resolveDays },
    overdueAcknowledgement: overdue,
  });
}

module.exports = { summary };
