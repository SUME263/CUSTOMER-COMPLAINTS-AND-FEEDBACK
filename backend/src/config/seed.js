/**
 * Seeds demo accounts and sample complaints so the frontend has
 * something to show immediately after `npm run seed`.
 * Safe to re-run: skips anything that already exists.
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

function upsertUser({ name, email, password, role, branch }) {
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, branch) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name, email, hash, role, branch);
  return info.lastInsertRowid;
}

const tembo = upsertUser({
  name: "B. Tembo",
  email: "b.tembo@ccf.local",
  password: "Staff123!",
  role: "staff",
  branch: "Lusaka HQ",
});
const zulu = upsertUser({
  name: "C. Zulu",
  email: "c.zulu@ccf.local",
  password: "Staff123!",
  role: "staff",
  branch: "Ndola",
});
upsertUser({
  name: "S. Mwape",
  email: "s.mwape@ccf.local",
  password: "Admin123!",
  role: "admin",
  branch: "Lusaka HQ",
});

const complaintCount = db
  .prepare("SELECT COUNT(*) AS n FROM complaints")
  .get().n;

if (complaintCount === 0) {
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
      assigned_to,
      submitted_at,
      updated_at
    )
    VALUES (
      @reference,
      @customer_name,
      @nrc_number,
      @phone,
      @email,
      @category,
      @description,
      @status,
      @assigned_to,
      @submitted_at,
      @updated_at
    )
  `);
  const insertLog = db.prepare(`
    INSERT INTO complaint_logs (complaint_id, status, note, created_by, created_at)
    VALUES (@complaint_id, @status, @note, @created_by, @created_at)
  `);

  const seedRows = [
    {
      reference: "CCF-2026-1042",
      customer_name: "M. Chanda",
      nrc_number: "123456/78/1",
      phone: "0971234567",
      email: null,
      category: "Loan disbursement delay",
      description:
        "Loan approved three weeks ago but funds have not reflected in my account.",
      status: "Open",
      assigned_to: null,
      submitted_at: "2026-09-02 09:12:00",
      updated_at: "2026-09-02 09:12:00",
      log: [
        {
          status: "Open",
          note: "Complaint received via web portal.",
          by: null,
          at: "2026-09-02 09:12:00",
        },
      ],
    },
    {
      reference: "CCF-2026-1041",
      customer_name: "P. Mwansa",
      nrc_number: "234567/89/1",
      phone: "0966112233",
      email: "p.mwansa@example.com",
      category: "Incorrect deduction / repayment",
      description:
        "My September payslip shows a loan deduction of ZMW 1,850 but my agreed instalment is ZMW 1,200.",
      status: "In Progress",
      assigned_to: tembo,
      submitted_at: "2026-09-01 08:40:00",
      updated_at: "2026-09-02 10:00:00",
      log: [
        {
          status: "Open",
          note: "Complaint received via web portal.",
          by: null,
          at: "2026-09-01 08:40:00",
        },
        {
          status: "In Progress",
          note: "Assigned to Operations for payroll deduction review.",
          by: tembo,
          at: "2026-09-02 10:00:00",
        },
      ],
    },
    {
      reference: "CCF-2026-1039",
      customer_name: "R. Banda",
      nrc_number: "345678/90/1",
      phone: "0977889900",
      email: null,
      category: "Poor staff conduct",
      description:
        "Was spoken to rudely by a teller at the Ndola branch when asking about my loan balance.",
      status: "In Progress",
      assigned_to: zulu,
      submitted_at: "2026-08-30 14:05:00",
      updated_at: "2026-08-31 09:00:00",
      log: [
        {
          status: "Open",
          note: "Complaint received via web portal.",
          by: null,
          at: "2026-08-30 14:05:00",
        },
        {
          status: "In Progress",
          note: "Escalated to Branch Manager for review.",
          by: zulu,
          at: "2026-08-31 09:00:00",
        },
      ],
    },
    {
      reference: "CCF-2026-1035",
      customer_name: "A. Phiri",
      nrc_number: "456789/01/1",
      phone: null,
      email: "a.phiri@example.com",
      category: "Account / statement error",
      description: "My August statement shows a payment I never made.",
      status: "Resolved",
      assigned_to: tembo,
      submitted_at: "2026-08-26 11:20:00",
      updated_at: "2026-08-29 16:00:00",
      log: [
        {
          status: "Open",
          note: "Complaint received via web portal.",
          by: null,
          at: "2026-08-26 11:20:00",
        },
        {
          status: "In Progress",
          note: "Statement discrepancy under investigation.",
          by: tembo,
          at: "2026-08-27 09:30:00",
        },
        {
          status: "Resolved",
          note: "Correction applied; customer notified by SMS and email.",
          by: tembo,
          at: "2026-08-29 16:00:00",
        },
      ],
    },
    {
      reference: "CCF-2026-1028",
      customer_name: "J. Musonda",
      nrc_number: "567890/12/1",
      phone: "0955443322",
      email: null,
      category: "Digital channel (app/USSD) issue",
      description:
        "USSD menu times out every time I try to check my loan balance.",
      status: "Closed",
      assigned_to: zulu,
      submitted_at: "2026-08-19 10:00:00",
      updated_at: "2026-08-23 12:00:00",
      log: [
        {
          status: "Open",
          note: "Complaint received via web portal.",
          by: null,
          at: "2026-08-19 10:00:00",
        },
        {
          status: "In Progress",
          note: "Referred to IT for USSD session fault.",
          by: zulu,
          at: "2026-08-20 09:00:00",
        },
        {
          status: "Resolved",
          note: "Fault fixed; confirmed working by customer.",
          by: zulu,
          at: "2026-08-22 15:00:00",
        },
        {
          status: "Closed",
          note: "Case closed after 7-day no-recurrence check.",
          by: zulu,
          at: "2026-08-23 12:00:00",
        },
      ],
    },
  ];

  const insertAll = db.transaction((rows) => {
    for (const row of rows) {
      const info = insertComplaint.run(row);
      const complaintId = info.lastInsertRowid;
      for (const entry of row.log) {
        insertLog.run({
          complaint_id: complaintId,
          status: entry.status,
          note: entry.note,
          created_by: entry.by,
          created_at: entry.at,
        });
      }
    }
  });
  insertAll(seedRows);
}

console.log("Seed complete.");
console.log("Staff login:  b.tembo@ccf.local / Staff123!");
console.log("Admin login:  s.mwape@ccf.local / Admin123!");
