const db = require('../config/db');

const DEFAULT_SETTINGS = {
  newComplaints: true,
  complaintAssignments: true,
  statusUpdates: true,
  deadlineReminders: true,
};

function getSettings(req, res) {
  const userId = req.user.id;

  const row = db
    .prepare(`
      SELECT
        new_complaints,
        complaint_assignments,
        status_updates,
        deadline_reminders
      FROM notification_settings
      WHERE user_id = ?
    `)
    .get(userId);

  if (!row) {
    return res.json(DEFAULT_SETTINGS);
  }

  res.json({
    newComplaints: Boolean(row.new_complaints),
    complaintAssignments: Boolean(row.complaint_assignments),
    statusUpdates: Boolean(row.status_updates),
    deadlineReminders: Boolean(row.deadline_reminders),
  });
}

function updateSettings(req, res) {
  const userId = req.user.id;

  const {
    newComplaints,
    complaintAssignments,
    statusUpdates,
    deadlineReminders,
  } = req.body;

  const settings = {
    newComplaints,
    complaintAssignments,
    statusUpdates,
    deadlineReminders,
  };

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== 'boolean') {
      return res.status(400).json({
        error: `${key} must be true or false.`,
      });
    }
  }

  db.prepare(`
    INSERT INTO notification_settings (
      user_id,
      new_complaints,
      complaint_assignments,
      status_updates,
      deadline_reminders,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id)
    DO UPDATE SET
      new_complaints = excluded.new_complaints,
      complaint_assignments = excluded.complaint_assignments,
      status_updates = excluded.status_updates,
      deadline_reminders = excluded.deadline_reminders,
      updated_at = datetime('now')
  `).run(
    userId,
    newComplaints ? 1 : 0,
    complaintAssignments ? 1 : 0,
    statusUpdates ? 1 : 0,
    deadlineReminders ? 1 : 0
  );

  res.json({
    message: 'Notification settings saved successfully.',
    newComplaints,
    complaintAssignments,
    statusUpdates,
    deadlineReminders,
  });
}

module.exports = {
  getSettings,
  updateSettings,
};