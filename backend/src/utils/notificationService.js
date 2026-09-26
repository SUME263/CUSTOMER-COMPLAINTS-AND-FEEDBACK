const db = require("../config/db");

// The service checks the user's saved preferences before creating a notification.
function getUserNotificationSettings(userId) {
  const row = db
    .prepare(
      `
      SELECT
        new_complaints,
        complaint_assignments,
        status_updates,
        deadline_reminders
      FROM notification_settings
      WHERE user_id = ?
    `,
    )
    .get(userId);

  if (!row) {
    return {
      newComplaints: true,
      complaintAssignments: true,
      statusUpdates: true,
      deadlineReminders: true,
    };
  }

  return {
    newComplaints: Boolean(row.new_complaints),
    complaintAssignments: Boolean(row.complaint_assignments),
    statusUpdates: Boolean(row.status_updates),
    deadlineReminders: Boolean(row.deadline_reminders),
  };
}

function createNotification({
  userId,
  complaintId = null,
  type,
  title,
  message,
  settingKey,
}) {
  const settings = getUserNotificationSettings(userId);

  if (settingKey && !settings[settingKey]) {
    return false;
  }

  db.prepare(
    `
    INSERT INTO notifications (
      user_id,
      complaint_id,
      type,
      title,
      message
    )
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(userId, complaintId, type, title, message);

  return true;
}

module.exports = {
  getUserNotificationSettings,
  createNotification,
};
