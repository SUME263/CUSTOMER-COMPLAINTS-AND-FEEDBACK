const express = require("express");
const controller = require("../controllers/complaintsController");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// allow customers to submit complaints and track them using a reference 
router.post("/", controller.create);
router.get("/track/:reference", controller.trackByReference);

// allow staff to view complaint queue 
router.get(
  "/",
  requireAuth,
  requireRole("staff", "assigner", "admin"),
  controller.list,
);

// allow assigners and admins to view active staff members for delegation
router.get(
  "/assignees",
  requireAuth,
  requireRole("assigner", "admin"),
  controller.listAssignees,
);

// allow staff to view their own complaints and admins to view all complaints
router.get(
  "/:id",
  requireAuth,
  requireRole("staff", "assigner", "admin"),
  controller.getById,
);

// allow assigners and admins to assign complaints to staff members
router.patch(
  "/:id/assignment",
  requireAuth,
  requireRole("assigner", "admin"),
  controller.assign,
);

// allow staff and admins to update complaint status and notes 
router.patch(
  "/:id",
  requireAuth,
  requireRole("staff", "admin"),
  controller.update,
);

module.exports = router;