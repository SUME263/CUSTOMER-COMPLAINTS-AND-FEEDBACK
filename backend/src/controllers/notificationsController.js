const db = require('../config/db');

function list(req, res) {
  const notifications = db
    .prepare(`
      SELECT
        n.id,
        n.complaint_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        c.reference
      FROM notifications n
      LEFT JOIN complaints c
        ON c.id = n.complaint_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
    `)
    .all(req.user.id);

  res.json(
    notifications.map(notification => ({
      id: notification.id,
      complaintId: notification.complaint_id,
      reference: notification.reference,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: Boolean(notification.is_read),
      createdAt: notification.created_at,
    }))
  );
}

function unreadCount(req, res) {
  const result = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ?
        AND is_read = 0
    `)
    .get(req.user.id);

  res.json({
    count: result.count,
  });
}

function markAsRead(req, res) {
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId)) {
    return res.status(400).json({
      error: 'Invalid notification ID.',
    });
  }

  const result = db
    .prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ?
        AND user_id = ?
    `)
    .run(notificationId, req.user.id);

  if (!result.changes) {
    return res.status(404).json({
      error: 'Notification not found.',
    });
  }

  res.json({
    message: 'Notification marked as read.',
  });
}

module.exports = {
  list,
  unreadCount,
  markAsRead,
};