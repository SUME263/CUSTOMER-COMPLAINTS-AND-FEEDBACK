const bcrypt = require("bcryptjs");
const db = require("../config/db");

// remove password hash before returning user details 
function serializeUser(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

// get all user acocunts by name 
function list(req, res) {
  const rows = db.prepare("SELECT * FROM users ORDER BY name ASC").all();
  res.json({ users: rows.map(serializeUser) });
}

// create a new user account 
function create(req, res) {
  const { name, email, password, role, branch } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Name, email, password and role are required." });
  }

  // only allow supported roles 
  if (!["staff", "admin"].includes(role)) {
    return res.status(400).json({ error: "Role must be staff or admin." });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.toLowerCase());
    
  if (existing)
    return res
      .status(409)
      .json({ error: "An account with that email already exists." });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, branch) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name, email.toLowerCase(), hash, role, branch || null);

  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json({ user: serializeUser(row) });
}

// update a user's account details , role or branch
function update(req, res) {
  const { status, role, branch } = req.body;
  const existing = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.params.id);

  if (!existing) return res.status(404).json({ error: "Account not found." });

  if (status && !["active", "suspended"].includes(status)) {
    return res
      .status(400)
      .json({ error: "Status must be active or suspended." });
  }
  
  if (role && !["staff", "admin"].includes(role)) {
    return res.status(400).json({ error: "Role must be staff or admin." });
  }

  db.prepare(
    "UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role), branch = COALESCE(?, branch) WHERE id = ?",
  ).run(status || null, role || null, branch || null, existing.id);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
  res.json({ user: serializeUser(row) });
}

module.exports = { list, create, update };
