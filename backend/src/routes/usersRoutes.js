const express = require("express");
const controller = require("../controllers/usersController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update);

module.exports = router;
