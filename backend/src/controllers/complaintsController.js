const db = require("../config/db");
const { createNotification } = require("../utils/notificationService");
const { generateReference } = require("../utils/reference");

const VALID_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

// Format a complaint from frontend
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

// get history of a complaint including who made each update
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

// create a new complaint submitted through the submission form
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

// nrc number is stored in the nrc number column.
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

  // save complaint and its initial history entry together
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

  // notify all active staff members of the new complaint
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

// find a complaint using its reference number for public tracking
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

// list complaints with optional filters for status, category and assigned staff
function list(req, res) {
  const { status, category, assignedTo } = req.query;
  let sql = `
    SELECT c.*, u.name AS assigned_name
    FROM complaints c
    LEFT JOIN users u ON u.id = c.assigned_to
    WHERE 1 = 1
  `;
  const params = [];

  //add filters only when a specific value has been selected
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

  //show newest complaints first
  sql += " ORDER BY c.submitted_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ complaints: rows.map(serializeComplaint) });
}

// get one complaint with its full history
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

// list active staff accounts
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

// update the status or assignment of a complaint and change its history 
function update(req, res) {
  const { status, note } = req.body;
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

 // save status change and its history entry together
  const run = db.transaction(() => {
    db.prepare(
      `UPDATE complaints
      SET status = ?, updated_at = ?
      WHERE id = ?`,
    ).run(newStatus, now, existing.id);

    let logNote = note.trim();

    // notify assigned staff member when the status changes 
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

    // record update and the user who made it 
    db.prepare(
      `INSERT INTO complaint_logs
      (complaint_id, status, note, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)`,
    ).run(existing.id, newStatus, logNote, req.user.id, now);
  });

  run();

  // return the updated complaint with its full history
  const row = db
    .prepare(
      `SELECT c.*, u.name AS assigned_name FROM complaints c LEFT JOIN users u ON u.id = c.assigned_to WHERE c.id = ?`,
    )
    .get(existing.id);
  const complaint = serializeComplaint(row);
  complaint.log = attachLog(existing.id);
  res.json({ complaint });
}

// assign a complaint to an active staff member records it in the case history, and sends a notification.
function assign(req, res) {
  const { assignedTo } = req.body;

  const existing = db
    .prepare("SELECT * FROM complaints WHERE id = ?")
    .get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  if (!assignedTo) {
    return res
      .status(400)
      .json({ error: "A staff member must be selected." });
  }

  const assignedUser = db
    .prepare(
      "SELECT id, name FROM users WHERE id = ? AND role = 'staff' AND status = 'active'",
    )
    .get(Number(assignedTo));

  if (!assignedUser) {
    return res
      .status(400)
      .json({ error: "Selected staff member was not found." });
  }

  if (Number(assignedTo) === Number(existing.assigned_to)) {
    return res
      .status(400)
      .json({ error: "This complaint is already assigned to that staff member." });
  }

  const now = new Date().toISOString();

  // update the assignment and record it in the complaint history 
  const run = db.transaction(() => {
    db.prepare(
      `
      UPDATE complaints
      SET assigned_to = ?, updated_at = ?
      WHERE id = ?
      `,
    ).run(Number(assignedTo), now, existing.id);

    const logNote = `Assigned to ${assignedUser.name}.`;

    db.prepare(
      `
      INSERT INTO complaint_logs
      (complaint_id, status, note, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
    ).run(
      existing.id,
      existing.status,
      logNote,
      req.user.id,
      now,
    );

    // notify staff member that complaint has been assigned to them
    createNotification({
      userId: Number(assignedTo),
      complaintId: existing.id,
      type: "assignment",
      title: "Complaint assigned to you",
      message: `${existing.reference} has been assigned to you for review.`,
      settingKey: "complaintAssignments",
    });
  });

  run();

  // fetch updated complaint including the assigned staff member's name
  const row = db
    .prepare(
      `
      SELECT c.*, u.name AS assigned_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = ?
      `,
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
  assign,
};
