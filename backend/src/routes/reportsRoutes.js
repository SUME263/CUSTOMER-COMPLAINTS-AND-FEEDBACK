const express = require("express");
const { summary } = require("../controllers/reportsController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole("staff", "assigner", "admin"),
  summary,
);

module.exports = router;
