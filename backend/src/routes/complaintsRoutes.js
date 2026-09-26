const express = require("express");
const controller = require("../controllers/complaintsController");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// Public — customer-facing
router.post("/", controller.create);
router.get("/track/:reference", controller.trackByReference);

// Internal complaint queue — staff, assigner and admin
router.get(
  "/",
  requireAuth,
  requireRole("staff", "assigner", "admin"),
  controller.list,
);

// Staff list is only needed by the assigner/admin for delegation
router.get(
  "/assignees",
  requireAuth,
  requireRole("assigner", "admin"),
  controller.listAssignees,
);

// Complaint details — staff, assigner and admin
router.get(
  "/:id",
  requireAuth,
  requireRole("staff", "assigner", "admin"),
  controller.getById,
);

// Assignment/delegation — assigner and admin only
router.patch(
  "/:id/assignment",
  requireAuth,
  requireRole("assigner", "admin"),
  controller.assign,
);

// Complaint handling — staff and admin
router.patch(
  "/:id",
  requireAuth,
  requireRole("staff", "admin"),
  controller.update,
);

module.exports = router;