const db = require("../config/db");

const { addWorkingDays } = require("./workingDays");

const { createNotification } = require("./notificationService");

// get a system setting or use its default value
function getSetting(key, fallback) {
  const row = db
    .prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?")
    .get(key);

  return row ? Number(row.setting_value) : fallback;
}

// check whether a reminder has already been sent for a complaint
function hasReminderBeenSent(complaintId, type) {
  const row = db
    .prepare(
      `
      SELECT id
      FROM notifications
      WHERE complaint_id = ?
        AND type = ?
      LIMIT 1
    `,
    )
    .get(complaintId, type);

  return Boolean(row);
}

// check active complaints and send reminders as deadlines approach
function checkDeadlineNotifications() {
  const ackDays = getSetting("acknowledge_days", 2);
  const resolveDays = getSetting("resolve_days", 14);

  const complaints = db
    .prepare(
      `
      SELECT
        id,
        reference,
        submitted_at,
        status,
        assigned_to
      FROM complaints
      WHERE status IN ('Open', 'In Progress')
    `,
    )
    .all();

  const now = new Date();

  complaints.forEach((complaint) => {
    // calculate the acknowledgement and resolution deadlines
    const acknowledgementDeadline = addWorkingDays(
      new Date(complaint.submitted_at),
      ackDays,
    );

    const resolutionDeadline = addWorkingDays(
      new Date(complaint.submitted_at),
      resolveDays,
    );

    // set reminder dates one working day before each deadline
    const acknowledgementReminderDate = addWorkingDays(
      acknowledgementDeadline,
      -1,
    );

    const resolutionReminderDate = addWorkingDays(resolutionDeadline, -1);

    // send an acknowledgement reminder if the complaint is still open
    if (
      complaint.status === "Open" &&
      now >= acknowledgementReminderDate &&
      !hasReminderBeenSent(complaint.id, "acknowledgement_reminder")
    ) {
      sendReminder(
        complaint,
        "acknowledgement_reminder",
        "Acknowledgement deadline approaching",
        `${complaint.reference} is approaching its acknowledgement deadline.`,
      );
    }

    // send a resolution reminder if one has not already been sent
    if (
      now >= resolutionReminderDate &&
      !hasReminderBeenSent(complaint.id, "resolution_reminder")
    ) {
      sendReminder(
        complaint,
        "resolution_reminder",
        "Resolution deadline approaching",
        `${complaint.reference} is approaching its resolution deadline.`,
      );
    }
  });
}

// send a reminder to the assigned staff member or all active staff if unassigned
function sendReminder(complaint, type, title, message) {
  if (complaint.assigned_to) {
    createNotification({
      userId: complaint.assigned_to,
      complaintId: complaint.id,
      type,
      title,
      message,
      settingKey: "deadlineReminders",
    });

    return;
  }

  // notify all active staff when no one is assigned to the complaint
  const activeStaff = db
    .prepare(
      `
      SELECT id
      FROM users
      WHERE role = 'staff'
        AND status = 'active'
    `,
    )
    .all();

  activeStaff.forEach((staff) => {
    createNotification({
      userId: staff.id,
      complaintId: complaint.id,
      type,
      title,
      message,
      settingKey: "deadlineReminders",
    });
  });
}

module.exports = {
  checkDeadlineNotifications,
};