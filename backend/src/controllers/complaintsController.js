const db = require("../config/db");
const { createNotification } = require("../utils/notificationService");
const { generateReference } = require("../utils/reference");

const VALID_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

function serializeComplaint(row) {
  return {
    id: row.id,
    ref: row.reference,
    name: row.customer_name,
    nrc: row.nrc_number,
    phone: row.phone,
    email: row.email,
    category: row.category,
    description: row.description,
    status: row.status,
    assigned: row.assigned_name || "Unassigned",
    assignedId: row.assigned_to,
    submitted: row.submitted_at,
    updated: row.updated_at,
  };
}

function attachLog(complaintId) {
  return db
    .prepare(
      `SELECT l.status, l.note, l.created_at AS date, u.name AS by
       FROM complaint_logs l
       LEFT JOIN users u ON u.id = l.created_by
       WHERE l.complaint_id = ?
       ORDER BY l.created_at ASC, l.id ASC`,
    )
    .all(complaintId);
}

/** POST /api/complaints — public. Raise a new complaint. */
function create(req, res) {
  const { name, nrc, phone, email, category, description } = req.body;

  if (!name || !nrc || !category || !description) {
    return res
      .status(400)
      .json({
        error: "Name, NRC number, category and description are required.",
      });
  }

  const reference = generateReference();
  const now = new Date().toISOString();

// NRC number is stored in the nrc_number column.
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      reference,
      customer_name,
      nrc_number,
      phone,
      email,
      category,
      description,
      status,
      submitted_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT INTO complaint_logs (complaint_id, status, note, created_at)
    VALUES (?, 'Open', 'Complaint received via web portal.', ?)
  `);

  const run = db.transaction(() => {
    const info = insertComplaint.run(
      reference,
      name,
      nrc,
      phone || null,
      email || null,
      category,
      description,
      now,
      now,
    );

    insertLog.run(info.lastInsertRowid, now);

    return info.lastInsertRowid;
  });

  const id = run();

  const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);

  const activeStaff = db
    .prepare(
      `
      SELECT id
      FROM users
      WHERE role = 'staff'
        AND status = 'active'
    `,
    )
    .all();

  activeStaff.forEach((staff) => {
    createNotification({
      userId: staff.id,
      complaintId: id,
      type: "new_complaint",
      title: "New complaint received",
      message: `${reference} has been submitted and is awaiting review.`,
      settingKey: "newComplaints",
    });
  });

  res.status(201).json({
    complaint: serializeComplaint(row),
  });
}
/** GET /api/complaints/track/:reference — public. Track by reference number. */
function trackByReference(req, res) {
  const row = db
    .prepare("SELECT * FROM complaints WHERE reference = ?")
    .get(req.params.reference.trim());
  if (!row)
    return res
      .status(404)
      .json({ error: "No complaint found with that reference number." });

  const complaint = serializeComplaint(row);
  complaint.log = attachLog(row.id);
  res.json({ complaint });
}

/** GET /api/complaints — staff/admin. List with optional filters. */
function list(req, res) {
  const { status, category, assignedTo } = req.query;
  let sql = `
    SELECT c.*, u.name AS assigned_name
    FROM complaints c
    LEFT JOIN users u ON u.id = c.assigned_to
    WHERE 1 = 1
  `;
  const params = [];

  if (status && status !== "all") {
    sql += " AND c.status = ?";
    params.push(status);
  }

  if (category && category !== "all") {
    sql += " AND c.category = ?";
    params.push(category);
  }

  if (assignedTo && assignedTo !== "all") {
    sql += " AND c.assigned_to = ?";
    params.push(Number(assignedTo));
  }

  sql += " ORDER BY c.submitted_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ complaints: rows.map(serializeComplaint) });
}

/** GET /api/complaints/:id — staff/admin. Full detail including log. */
function getById(req, res) {
  const row = db
    .prepare(
      `SELECT c.*, u.name AS assigned_name
       FROM complaints c LEFT JOIN users u ON u.id = c.assigned_to
       WHERE c.id = ?`,
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Complaint not found." });

  const complaint = serializeComplaint(row);
  complaint.log = attachLog(row.id);
  res.json({ complaint });
}

/** GET /api/complaints/assignees — staff/admin. List active staff accounts. */
function listAssignees(req, res) {
  const rows = db
    .prepare(
      `
      SELECT id, name, email, branch
      FROM users
      WHERE role = 'staff'
        AND status = 'active'
      ORDER BY name ASC
    `,
    )
    .all();

  res.json({ users: rows });
}

/** PATCH /api/complaints/:id — staff/admin. Update status/assignment, append a log entry. */
function update(req, res) {
  const { status, note, assignedTo } = req.body;
  const existing = db
    .prepare("SELECT * FROM complaints WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Complaint not found." });

  if (!note || !note.trim()) {
    return res
      .status(400)
      .json({ error: "A note is required for every status update." });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const newStatus = status || existing.status;
  const now = new Date().toISOString();

  // to know who was assigned a complaint
  let assignmentName = null;

  if (assignedTo) {
    const assignedUser = db
      .prepare("SELECT name FROM users WHERE id = ? AND role = ?")
      .get(assignedTo, "staff");

    if (!assignedUser) {
      return res
        .status(400)
        .json({ error: "Selected staff member was not found." });
    }

    assignmentName = assignedUser.name;
  }

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE complaints
      SET status = ?, assigned_to = COALESCE(?, assigned_to), updated_at = ?
      WHERE id = ?`,
    ).run(newStatus, assignedTo || null, now, existing.id);

    let logNote = note.trim();

    if (assignedTo && Number(assignedTo) !== Number(existing.assigned_to)) {
      logNote = `Assigned to ${assignmentName}. ${logNote}`;
    }

    if (newStatus && newStatus !== existing.status && existing.assigned_to) {
      createNotification({
        userId: Number(existing.assigned_to),
        complaintId: existing.id,
        type: "status_update",
        title: "Complaint status updated",
        message: `${existing.reference} has been moved to ${newStatus}.`,
        settingKey: "statusUpdates",
      });
    }

    if (assignedTo && Number(assignedTo) !== Number(existing.assigned_to)) {
      createNotification({
        userId: Number(assignedTo),
        complaintId: existing.id,
        type: "assignment",
        title: "Complaint assigned to you",
        message: `${existing.reference} has been assigned to you for review.`,
        settingKey: "complaintAssignments",
      });
    }

    db.prepare(
      `INSERT INTO complaint_logs
      (complaint_id, status, note, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)`,
    ).run(existing.id, newStatus, logNote, req.user.id, now);
  });

  run();

  const row = db
    .prepare(
      `SELECT c.*, u.name AS assigned_name FROM complaints c LEFT JOIN users u ON u.id = c.assigned_to WHERE c.id = ?`,
    )
    .get(existing.id);
  const complaint = serializeComplaint(row);
  complaint.log = attachLog(existing.id);
  res.json({ complaint });
}

module.exports = {
  create,
  trackByReference,
  list,
  getById,
  update,
  listAssignees,
};
