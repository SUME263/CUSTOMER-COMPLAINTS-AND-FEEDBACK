const db = require('../config/db');

/** GET /api/reports/summary — staff/admin. Feeds the admin compliance dashboard. */
function summary(req, res) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM complaints').get().n;

  const open = db
    .prepare("SELECT COUNT(*) AS n FROM complaints WHERE status = 'Open'")
    .get().n;

  const resolvedOrClosed = db
    .prepare("SELECT COUNT(*) AS n FROM complaints WHERE status IN ('Resolved', 'Closed')")
    .get().n;

  const byCategory = db
    .prepare(
      'SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC'
    )
    .all();

  const getSetting = (key, fallback) => {
    const row = db
      .prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?')
      .get(key);

    return row ? Number(row.setting_value) : fallback;
  };

  const ackDays = getSetting('acknowledge_days', 2);
  const resolveDays = getSetting('resolve_days', 14);

  // Complaints still open past the acknowledgement window.
  function addWorkingDays(date, workingDays) {
    const result = new Date(date);
    let daysAdded = 0;

    while (daysAdded < workingDays) {
      result.setDate(result.getDate() + 1);

      const day = result.getDay();

      // Monday = 1, Friday = 5
      if (day !== 0 && day !== 6) {
        daysAdded++;
      }
    }

    return result;
  }

  const openComplaints = db
    .prepare(
      `SELECT reference, submitted_at
       FROM complaints
       WHERE status = 'Open'`
    )
    .all();

  const now = new Date();

  const overdue = openComplaints.filter(complaint => {
    const deadline = addWorkingDays(
      new Date(complaint.submitted_at),
      ackDays
    );

    return now > deadline;
  });

  const resolutionComplaints = db
  .prepare(
    `SELECT reference, submitted_at, status
     FROM complaints
     WHERE status IN ('Open', 'In Progress')`
  )
  .all();

  const overdueResolution = resolutionComplaints.filter(complaint => {
    const deadline = addWorkingDays(
      new Date(complaint.submitted_at),
      resolveDays
    );

    return now > deadline;
  });

  res.json({
    total,
    open,
    resolvedOrClosed,
    resolutionRate: total ? Math.round((resolvedOrClosed / total) * 100) : 0,
    byCategory,
    thresholds: {
      acknowledgeDays: ackDays,
      resolveDays,
    },
    overdueAcknowledgement: overdue,
    overdueResolution,
  });
}

module.exports = { summary };