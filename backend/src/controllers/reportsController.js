const db = require("../config/db");

const { addWorkingDays } = require("../utils/workingDays");

// generate summary stats for admin dashboard 
function summary(req, res) {
  const total = db.prepare("SELECT COUNT(*) AS n FROM complaints").get().n;

  const open = db
    .prepare("SELECT COUNT(*) AS n FROM complaints WHERE status = 'Open'")
    .get().n;

  const resolvedOrClosed = db
    .prepare(
      "SELECT COUNT(*) AS n FROM complaints WHERE status IN ('Resolved', 'Closed')",
    )
    .get().n;

  const byCategory = db
    .prepare(
      "SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC",
    )
    .all();

  const getSetting = (key, fallback) => {
    const row = db
      .prepare(
        "SELECT setting_value FROM system_settings WHERE setting_key = ?",
      )
      .get(key);

    return row ? Number(row.setting_value) : fallback;
  };

  // load allowed working days for acknowledgement and resolving complaints 
  const ackDays = getSetting("acknowledge_days", 2);
  const resolveDays = getSetting("resolve_days", 14);

  const openComplaints = db
    .prepare(
      `SELECT reference, submitted_at
       FROM complaints
       WHERE status = 'Open'`,
    )
    .all();

  const now = new Date();

  const overdue = openComplaints.filter((complaint) => {
    const deadline = addWorkingDays(new Date(complaint.submitted_at), ackDays);

    return now > deadline;
  });

  const resolutionComplaints = db
    .prepare(
      `SELECT reference, submitted_at, status
     FROM complaints
     WHERE status IN ('Open', 'In Progress')`,
    )
    .all();

  // find overdue complaints 
  const overdueResolution = resolutionComplaints.filter((complaint) => {
    const deadline = addWorkingDays(
      new Date(complaint.submitted_at),
      resolveDays,
    );

    return now > deadline;
  });


  // return summary stats, deadlines and overdue complaints 
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
