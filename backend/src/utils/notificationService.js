const db = require("../config/db");

// get the user's saved notification preferences before creating a notification
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

  // enable all notification types by default if no settings are saved
  if (!row) {
    return {
      newComplaints: true,
      complaintAssignments: true,
      statusUpdates: true,
      deadlineReminders: true,
    };
  }

  // convert the database values into boolean values for use in the application
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
  // check the user's notification preferences before saving the notification
  const settings = getUserNotificationSettings(userId);

  // skip the notification if the related setting is disabled
  if (settingKey && !settings[settingKey]) {
    return false;
  }

  // save the notification details in the database
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