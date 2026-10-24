const express = require("express");
const { login, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// handle login requests
router.post("/login", login);

// return the signed in user's details
router.get("/me", requireAuth, me);

module.exports = router;
