/* ===========================================================
   Shared mock data + helpers for the frontend prototype.
   In the real build this layer is replaced by calls to the
   Express/Node API (see /api/complaints etc.) — every function
   here is written so the fetch() swap is a like-for-like change.
   =========================================================== */

const CATEGORIES = [
  'Loan disbursement delay',
  'Incorrect deduction / repayment',
  'Poor staff conduct',
  'Account / statement error',
  'Digital channel (app/USSD) issue',
  'Other',
];

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const SEED_COMPLAINTS = [
  { ref: 'CCF-2026-1042', name: 'M. Chanda', service: 'MOD-88213', category: 'Loan disbursement delay', status: 'Open', submitted: '2026-09-02', assigned: 'Unassigned',
    log: [{ status: 'Open', date: '2026-09-02', note: 'Complaint received via web portal.' }] },
  { ref: 'CCF-2026-1041', name: 'P. Mwansa', service: 'CS-44210', category: 'Incorrect deduction / repayment', status: 'In Progress', submitted: '2026-09-01', assigned: 'B. Tembo',
    log: [
      { status: 'Open', date: '2026-09-01', note: 'Complaint received via web portal.' },
      { status: 'In Progress', date: '2026-09-02', note: 'Assigned to Operations for payroll deduction review.' },
    ] },
  { ref: 'CCF-2026-1039', name: 'R. Banda', service: 'MOD-71029', category: 'Poor staff conduct', status: 'In Progress', submitted: '2026-08-30', assigned: 'C. Zulu',
    log: [
      { status: 'Open', date: '2026-08-30', note: 'Complaint received via web portal.' },
      { status: 'In Progress', date: '2026-08-31', note: 'Escalated to Branch Manager for review.' },
    ] },
  { ref: 'CCF-2026-1035', name: 'A. Phiri', service: 'CS-30982', category: 'Account / statement error', status: 'Resolved', submitted: '2026-08-26', assigned: 'B. Tembo',
    log: [
      { status: 'Open', date: '2026-08-26', note: 'Complaint received via web portal.' },
      { status: 'In Progress', date: '2026-08-27', note: 'Statement discrepancy under investigation.' },
      { status: 'Resolved', date: '2026-08-29', note: 'Correction applied; customer notified by SMS and email.' },
    ] },
  { ref: 'CCF-2026-1028', name: 'J. Musonda', service: 'MOD-55671', category: 'Digital channel (app/USSD) issue', status: 'Closed', submitted: '2026-08-19', assigned: 'C. Zulu',
    log: [
      { status: 'Open', date: '2026-08-19', note: 'Complaint received via web portal.' },
      { status: 'In Progress', date: '2026-08-20', note: 'Referred to IT for USSD session fault.' },
      { status: 'Resolved', date: '2026-08-22', note: 'Fault fixed; confirmed working by customer.' },
      { status: 'Closed', date: '2026-08-23', note: 'Case closed after 7-day no-recurrence check.' },
    ] },
];

function seedData() {
  if (!localStorage.getItem('ccf_complaints')) {
    localStorage.setItem('ccf_complaints', JSON.stringify(SEED_COMPLAINTS));
  }
}

function getComplaints() {
  seedData();
  return JSON.parse(localStorage.getItem('ccf_complaints'));
}

function saveComplaints(list) {
  localStorage.setItem('ccf_complaints', JSON.stringify(list));
}

function findComplaint(ref) {
  return getComplaints().find(c => c.ref.toLowerCase() === String(ref).trim().toLowerCase());
}

function nextReference() {
  const list = getComplaints();
  const nums = list.map(c => parseInt(c.ref.split('-')[2], 10)).filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `CCF-2026-${next}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function statusBadgeClass(status) {
  return {
    'Open': 'badge-open',
    'In Progress': 'badge-progress',
    'Resolved': 'badge-resolved',
    'Closed': 'badge-closed',
  }[status] || 'badge-open';
}

function stepIndex(status) {
  return STATUSES.indexOf(status);
}

/* -------- Raise complaint form -------- */
function initRaiseComplaintForm() {
  const form = document.getElementById('complaint-form');
  const confirmPanel = document.getElementById('confirmation-panel');
  if (!form) return;

  const catSelect = document.getElementById('category');
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSelect.appendChild(opt);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('full-name').value.trim();
    const service = document.getElementById('service-number').value.trim();
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();

    if (!name || !service || !category || !description) return;

    const ref = nextReference();
    const list = getComplaints();
    list.unshift({
      ref, name, service, category, status: 'Open', submitted: todayISO(), assigned: 'Unassigned',
      log: [{ status: 'Open', date: todayISO(), note: 'Complaint received via web portal.' }],
    });
    saveComplaints(list);

    form.classList.add('hidden');
    confirmPanel.classList.remove('hidden');
    document.getElementById('confirm-ref').textContent = ref;
    document.getElementById('confirm-ref-track').textContent = ref;
  });
}

/* -------- Track complaint page -------- */
function initTrackComplaint() {
  const form = document.getElementById('track-form');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const preset = params.get('ref');
  if (preset) {
    document.getElementById('ref-input').value = preset;
    renderTrackResult(preset);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const ref = document.getElementById('ref-input').value;
    renderTrackResult(ref);
  });
}

function renderTrackResult(ref) {
  const result = document.getElementById('track-result');
  const notFound = document.getElementById('track-not-found');
  const complaint = findComplaint(ref);

  if (!complaint) {
    result.classList.add('hidden');
    notFound.classList.remove('hidden');
    return;
  }
  notFound.classList.add('hidden');
  result.classList.remove('hidden');

  document.getElementById('res-ref').textContent = complaint.ref;
  document.getElementById('res-category').textContent = complaint.category;
  document.getElementById('res-submitted').textContent = complaint.submitted;
  document.getElementById('res-badge').textContent = complaint.status;
  document.getElementById('res-badge').className = 'badge ' + statusBadgeClass(complaint.status);

  const curr = stepIndex(complaint.status);
  document.querySelectorAll('#stepper .step').forEach((el, i) => {
    el.classList.remove('done', 'current');
    if (i < curr) el.classList.add('done');
    if (i === curr) el.classList.add('current');
  });

  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  complaint.log.slice().reverse().forEach(entry => {
    const div = document.createElement('div');
    div.style.padding = '14px 0';
    div.style.borderBottom = '1px solid var(--line-soft)';
    div.innerHTML = `<div class="flex-between"><strong style="font-size:0.88rem">${entry.status}</strong><span style="font-size:0.78rem;color:var(--ink-soft)">${entry.date}</span></div><p style="margin:6px 0 0;font-size:0.86rem">${entry.note}</p>`;
    timeline.appendChild(div);
  });
}

/* -------- Staff dashboard -------- */
function initStaffDashboard() {
  const tbody = document.getElementById('complaints-tbody');
  if (!tbody) return;

  function render() {
    const statusFilter = document.getElementById('filter-status').value;
    const catFilter = document.getElementById('filter-category').value;
    let list = getComplaints();
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(c => c.category === catFilter);

    tbody.innerHTML = '';
    document.getElementById('result-count').textContent = `${list.length} complaint${list.length === 1 ? '' : 's'}`;

    list.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="cell-ref">${c.ref}</td>
        <td>${c.name}</td>
        <td>${c.category}</td>
        <td>${c.submitted}</td>
        <td>${c.assigned}</td>
        <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>`;
      tr.addEventListener('click', () => openDetail(c.ref));
      tbody.appendChild(tr);
    });
  }

  document.getElementById('filter-status').addEventListener('change', render);
  document.getElementById('filter-category').addEventListener('change', render);

  const catFilter = document.getElementById('filter-category');
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catFilter.appendChild(opt);
  });

  // stat tiles
  const all = getComplaints();
  document.getElementById('stat-open').textContent = all.filter(c => c.status === 'Open').length;
  document.getElementById('stat-progress').textContent = all.filter(c => c.status === 'In Progress').length;
  document.getElementById('stat-resolved').textContent = all.filter(c => c.status === 'Resolved').length;
  document.getElementById('stat-total').textContent = all.length;

  render();
  window.__renderStaffTable = render;
}

function openDetail(ref) {
  const c = findComplaint(ref);
  if (!c) return;
  document.getElementById('detail-empty').classList.add('hidden');
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('hidden');

  document.getElementById('d-ref').textContent = c.ref;
  document.getElementById('d-name').textContent = c.name;
  document.getElementById('d-service').textContent = c.service;
  document.getElementById('d-category').textContent = c.category;
  document.getElementById('d-submitted').textContent = c.submitted;
  document.getElementById('d-badge').textContent = c.status;
  document.getElementById('d-badge').className = 'badge ' + statusBadgeClass(c.status);
  document.getElementById('d-assigned').value = c.assigned;

  const statusSelect = document.getElementById('d-status-select');
  statusSelect.value = c.status;

  const log = document.getElementById('d-log');
  log.innerHTML = '';
  c.log.slice().reverse().forEach(entry => {
    const div = document.createElement('div');
    div.className = 'note-box';
    div.style.marginBottom = '10px';
    div.innerHTML = `<div class="flex-between"><strong style="font-size:0.82rem">${entry.status}</strong><span style="font-size:0.76rem;color:var(--ink-soft)">${entry.date}</span></div><p style="margin:6px 0 0;font-size:0.84rem">${entry.note}</p>`;
    log.appendChild(div);
  });

  document.getElementById('detail-form').onsubmit = function (e) {
    e.preventDefault();
    const newStatus = statusSelect.value;
    const note = document.getElementById('d-note').value.trim();
    const assigned = document.getElementById('d-assigned').value.trim();
    if (!note) return;

    const list = getComplaints();
    const target = list.find(x => x.ref === ref);
    target.status = newStatus;
    target.assigned = assigned || target.assigned;
    target.log.push({ status: newStatus, date: todayISO(), note });
    saveComplaints(list);

    document.getElementById('d-note').value = '';
    openDetail(ref);
    if (window.__renderStaffTable) window.__renderStaffTable();
  };
}

/* -------- Admin dashboard -------- */
function initAdminDashboard() {
  const el = document.getElementById('compliance-summary');
  if (!el) return;
  const all = getComplaints();
  const withinTarget = all.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
  document.getElementById('admin-total').textContent = all.length;
  document.getElementById('admin-resolved').textContent = withinTarget;
  document.getElementById('admin-open').textContent = all.filter(c => c.status === 'Open').length;
  document.getElementById('admin-rate').textContent =
    all.length ? Math.round((withinTarget / all.length) * 100) + '%' : '—';

  const catCounts = {};
  all.forEach(c => { catCounts[c.category] = (catCounts[c.category] || 0) + 1; });
  const maxCount = Math.max(...Object.values(catCounts), 1);
  const barsEl = document.getElementById('category-bars');
  barsEl.innerHTML = '';
  Object.entries(catCounts).forEach(([cat, count]) => {
    const row = document.createElement('div');
    row.style.marginBottom = '14px';
    row.innerHTML = `
      <div class="flex-between" style="margin-bottom:4px">
        <span style="font-size:0.85rem">${cat}</span>
        <span style="font-size:0.8rem;color:var(--ink-soft)">${count}</span>
      </div>
      <div style="background:var(--line-soft);height:8px;border-radius:2px;">
        <div style="background:var(--copper);height:8px;border-radius:2px;width:${(count / maxCount) * 100}%"></div>
      </div>`;
    barsEl.appendChild(row);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initRaiseComplaintForm();
  initTrackComplaint();
  initStaffDashboard();
  initAdminDashboard();
});
