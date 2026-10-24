const express = require("express");
const controller = require("../controllers/notificationSettingsController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// require users to sign in and have an allowed role to access these routes
router.use(requireAuth, requireRole("staff", "assigner", "admin"));

// get user's notification settings
router.get("/", controller.getSettings);

// update user's notification settings
router.patch("/", controller.updateSettings);

module.exports = router;
