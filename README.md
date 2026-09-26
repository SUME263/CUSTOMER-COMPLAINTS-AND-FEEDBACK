# Customer Complaints and Feedback Handling System

Full-stack prototype for the COMP1682 project: a web-based complaint and
feedback system for a Zambian financial institution serving civil servants
and defence force personnel.

## Structure

```
project/
├── frontend/     Static HTML/CSS/JS — customer, staff and admin UI
└── backend/      Node.js + Express API, SQLite database
```

## Running it

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env
npm run seed      # creates the database + demo accounts
npm start          # http://localhost:4000
```

Demo accounts (created by `npm run seed`):

| Role  | Email             | Password  |
| ----- | ----------------- | --------- |
| Staff | b.tembo@ccf.local | Staff123! |
| Admin | s.mwape@ccf.local | Admin123! |

**2. Frontend**

The frontend is static files — serve them with any static server. Easiest
options:

```bash
cd frontend
npx serve .        # or: python3 -m http.server 5500
```

Then open the printed URL. `frontend/js/api.js` points at
`http://localhost:4000/api` — change `API_BASE` there if the backend runs
somewhere else.

## What's implemented

- **Customer**: raise a complaint (`raise-complaint.html`), track by
  reference number (`track-complaint.html`) — no account needed
- **Staff**: sign in, view/filter the complaint queue, review a complaint,
  update its status with a note (`staff-dashboard.html`)
- **Admin**: sign in, compliance summary (resolution rate, category
  breakdown, overdue-acknowledgement flag), staff account
  activation/suspension (`admin-dashboard.html`)
- **API**: JWT authentication, role-based access control (staff/admin),
  full complaint lifecycle with an audit trail (`complaint_logs` table)

## Maps to the proposal

- Database: `backend/src/config/db.js` — `users`, `complaints`,
  `complaint_logs` tables, matching the ERD entities in the proposal
  (customer profiles, complaint records, staff roles, status tracking,
  audit logs)
- Complaint lifecycle: Open → In Progress → Resolved → Closed, enforced
  by a `CHECK` constraint and shown as the stepper on the tracking page
- Compliance thresholds (`ACKNOWLEDGE_DAYS`, `RESOLVE_DAYS` in `.env`)
  reflect the Bank of Zambia directive referenced in the proposal; the
  admin reports endpoint flags complaints still Open past the
  acknowledgement window

## Not yet built

- Objective 6 testing (unit/integration/UAT test suite)
- Email/SMS notifications on status change
- File attachments for complaints (form field exists, not wired up)
- Deployment configuration (currently local-only, SQLite)
