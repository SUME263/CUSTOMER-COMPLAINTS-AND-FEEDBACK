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

  const ackDays = Number(process.env.ACKNOWLEDGE_DAYS || 2);
  const resolveDays = Number(process.env.RESOLVE_DAYS || 14);

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
