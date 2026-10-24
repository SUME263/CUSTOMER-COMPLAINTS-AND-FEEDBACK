const express = require("express");
const controller = require("../controllers/notificationsController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// require users to sign in and have an allowed role
router.use(requireAuth, requireRole("staff", "assigner", "admin"));

// get all notifications for the signed in user
router.get("/", controller.list);

// get the number of unread notifications
router.get("/unread-count", controller.unreadCount);

// mark a notification as read
router.patch("/:id/read", controller.markAsRead);

module.exports = router;