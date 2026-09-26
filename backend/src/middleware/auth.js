const jwt = require("jsonwebtoken");

/** Requires a valid JWT. Attaches { id, role, name } to req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Sign in to access this resource." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Your session has expired. Sign in again." });
  }
}

/** Restricts a route to one or more roles. Use after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to do that." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
