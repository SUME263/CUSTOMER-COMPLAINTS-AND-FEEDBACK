const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

/** POST /api/auth/login — staff and admin only; customers don't have accounts. */
function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.status === "suspended") {
    return res
      .status(403)
      .json({
        error: "This account has been suspended. Contact an administrator.",
      });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, branch: user.branch },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
    },
  });
}

/** GET /api/auth/me — returns the signed-in user from the token. */
function me(req, res) {
  const user = db
    .prepare(
      "SELECT id, name, email, role, branch, status FROM users WHERE id = ?",
    )
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user });
}

module.exports = { login, me };
