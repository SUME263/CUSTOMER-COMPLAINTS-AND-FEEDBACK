const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

//Check the login details and create a token if they are correct
function login(req, res) {
  const { email, password } = req.body;

  //check the email and password are provided
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase());

  //check password and make sure account exists
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  //check if the account is suspended
  if (user.status === "suspended") {
    return res
      .status(403)
      .json({
        error: "This account has been suspended. Contact an administrator.",
      });
  }

  //create a token with the user's details for authentication
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, branch: user.branch },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );

  //return the token and user details to frontend
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

//return the signed in user's details 
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
