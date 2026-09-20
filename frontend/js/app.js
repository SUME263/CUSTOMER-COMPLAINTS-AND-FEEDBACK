/* ===========================================================
   Page logic. Talks to the Express API via api.js (js/api.js
   must be loaded first on any page that uses this file).
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

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showFormError(container, message) {
  let el = container.querySelector('.form-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    el.style.cssText = 'background:#FBEDE0;border:1px solid #B4702F;color:#8F5A24;padding:12px 14px;border-radius:3px;font-size:0.86rem;margin-bottom:20px;';
    container.prepend(el);
  }
  el.textContent = message;
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

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = {
      name: document.getElementById('full-name').value.trim(),
      service: document.getElementById('service-number').value.trim(),
      phone: document.getElementById('phone').value.trim() || null,
      email: document.getElementById('email').value.trim() || null,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim(),
    };
    if (!payload.name || !payload.service || !payload.category || !payload.description) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      const { complaint } = await api.raiseComplaint(payload);
      form.classList.add('hidden');
      confirmPanel.classList.remove('hidden');
      document.getElementById('confirm-ref').textContent = complaint.ref;
      const link = document.getElementById('confirm-track-link');
      if (link) link.href = 'track-complaint.html?ref=' + encodeURIComponent(complaint.ref);
    } catch (err) {
      showFormError(form, err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit complaint';
    }
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
    renderTrackResult(document.getElementById('ref-input').value);
  });
}

async function renderTrackResult(ref) {
  const result = document.getElementById('track-result');
  const notFound = document.getElementById('track-not-found');
  if (!ref || !ref.trim()) return;

  let complaint;
  try {
    ({ complaint } = await api.trackComplaint(ref));
  } catch (err) {
    result.classList.add('hidden');
    notFound.classList.remove('hidden');
    return;
  }

  notFound.classList.add('hidden');
  result.classList.remove('hidden');

  document.getElementById('res-ref').textContent = complaint.ref;
  document.getElementById('res-category').textContent = complaint.category;
  document.getElementById('res-submitted').textContent = formatDate(complaint.submitted);
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
    div.innerHTML = `<div class="flex-between"><strong style="font-size:0.88rem">${entry.status}</strong><span style="font-size:0.78rem;color:var(--ink-soft)">${formatDate(entry.date)}</span></div><p style="margin:6px 0 0;font-size:0.86rem">${entry.note}</p>`;
    timeline.appendChild(div);
  });
}

/* -------- Login page -------- */
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      const { token, user } = await api.login(email, password);
      setSession(token, user);
      window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'staff-dashboard.html';
    } catch (err) {
      showFormError(form, err.message);
    }
  });
}

/* -------- Staff dashboard -------- */
function initStaffDashboard() {
  const tbody = document.getElementById('complaints-tbody');
  if (!tbody) return;

  const user = requireSession('staff');
  if (!user) return;
  document.querySelectorAll('.current-user-name').forEach(el => { el.textContent = `${user.name} — ${user.branch || 'Staff'}`; });

  const catFilter = document.getElementById('filter-category');
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catFilter.appendChild(opt);
  });

  async function render() {
    const status = document.getElementById('filter-status').value;
    const category = document.getElementById('filter-category').value;
    const { complaints } = await api.listComplaints({ status, category });

    tbody.innerHTML = '';
    document.getElementById('result-count').textContent = `${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`;

    complaints.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="cell-ref">${c.ref}</td>
        <td>${c.name}</td>
        <td>${c.category}</td>
        <td>${formatDate(c.submitted)}</td>
        <td>${c.assigned}</td>
        <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>`;
      tr.addEventListener('click', () => openDetail(c.id));
      tbody.appendChild(tr);
    });

    document.getElementById('stat-open').textContent = complaints.filter(c => c.status === 'Open').length;
    document.getElementById('stat-progress').textContent = complaints.filter(c => c.status === 'In Progress').length;
    document.getElementById('stat-resolved').textContent = complaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('stat-total').textContent = complaints.length;
  }

  document.getElementById('filter-status').addEventListener('change', render);
  document.getElementById('filter-category').addEventListener('change', render);

  render();
  window.__renderStaffTable = render;

  const signOut = document.getElementById('sign-out');
  if (signOut) signOut.addEventListener('click', (e) => { e.preventDefault(); clearSession(); window.location.href = 'index.html'; });
}

async function openDetail(id) {
  const { complaint: c } = await api.getComplaint(id);

  document.getElementById('detail-empty').classList.add('hidden');
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('hidden');

  document.getElementById('d-ref').textContent = c.ref;
  document.getElementById('d-name').textContent = c.name;
  document.getElementById('d-service').textContent = c.service;
  document.getElementById('d-category').textContent = c.category;
  document.getElementById('d-submitted').textContent = formatDate(c.submitted);
  document.getElementById('d-badge').textContent = c.status;
  document.getElementById('d-badge').className = 'badge ' + statusBadgeClass(c.status);
  document.getElementById('d-assigned').value = c.assigned === 'Unassigned' ? '' : c.assigned;

  document.getElementById('d-status-select').value = c.status;

  const log = document.getElementById('d-log');
  log.innerHTML = '';
  c.log.slice().reverse().forEach(entry => {
    const div = document.createElement('div');
    div.className = 'note-box';
    div.style.marginBottom = '10px';
    div.innerHTML = `<div class="flex-between"><strong style="font-size:0.82rem">${entry.status}</strong><span style="font-size:0.76rem;color:var(--ink-soft)">${formatDate(entry.date)}</span></div><p style="margin:6px 0 0;font-size:0.84rem">${entry.note}</p>`;
    log.appendChild(div);
  });

  const form = document.getElementById('detail-form');
  form.onsubmit = async function (e) {
    e.preventDefault();
    const note = document.getElementById('d-note').value.trim();
    if (!note) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await api.updateComplaint(id, {
        status: document.getElementById('d-status-select').value,
        note,
      });
      document.getElementById('d-note').value = '';
      await openDetail(id);
      if (window.__renderStaffTable) window.__renderStaffTable();
    } catch (err) {
      showFormError(form, err.message);
    } finally {
      submitBtn.disabled = false;
    }
  };
}

/* -------- Admin dashboard -------- */
function initAdminDashboard() {
  const el = document.getElementById('compliance-summary');
  if (!el) return;

  const user = requireSession('admin');
  if (!user) return;
  document.querySelectorAll('.current-user-name').forEach(node => { node.textContent = `${user.name} — Administrator`; });

  const signOut = document.getElementById('sign-out');
  if (signOut) signOut.addEventListener('click', (e) => { e.preventDefault(); clearSession(); window.location.href = 'index.html'; });

  loadComplianceSummary();
  loadStaffTable();
}

async function loadComplianceSummary() {
  const data = await api.reportSummary();
  document.getElementById('admin-total').textContent = data.total;
  document.getElementById('admin-open').textContent = data.open;
  document.getElementById('admin-resolved').textContent = data.resolvedOrClosed;
  document.getElementById('admin-rate').textContent = data.resolutionRate + '%';

  const maxCount = Math.max(...data.byCategory.map(c => c.count), 1);
  const barsEl = document.getElementById('category-bars');
  barsEl.innerHTML = '';
  data.byCategory.forEach(({ category, count }) => {
    const row = document.createElement('div');
    row.style.marginBottom = '14px';
    row.innerHTML = `
      <div class="flex-between" style="margin-bottom:4px">
        <span style="font-size:0.85rem">${category}</span>
        <span style="font-size:0.8rem;color:var(--ink-soft)">${count}</span>
      </div>
      <div style="background:var(--line-soft);height:8px;border-radius:2px;">
        <div style="background:var(--copper);height:8px;border-radius:2px;width:${(count / maxCount) * 100}%"></div>
      </div>`;
    barsEl.appendChild(row);
  });

  document.getElementById('acknowledge-threshold').textContent = data.thresholds.acknowledgeDays;
  document.getElementById('resolve-threshold').textContent = data.thresholds.resolveDays;
}

async function loadStaffTable() {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;
  const { users } = await api.listUsers();
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name}</td>
      <td style="text-transform:capitalize">${u.role}</td>
      <td>${u.branch || '—'}</td>
      <td><span class="badge ${u.status === 'active' ? 'badge-resolved' : 'badge-closed'}">${u.status === 'active' ? 'Active' : 'Suspended'}</span></td>
      <td><a href="#" data-id="${u.id}" data-status="${u.status}" class="toggle-status" style="font-size:0.82rem;">${u.status === 'active' ? 'Suspend' : 'Reactivate'}</a></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.toggle-status').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = e.target.dataset.id;
      const newStatus = e.target.dataset.status === 'active' ? 'suspended' : 'active';
      await api.updateUser(id, { status: newStatus });
      loadStaffTable();
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initRaiseComplaintForm();
  initTrackComplaint();
  initLoginPage();
  initStaffDashboard();
  initAdminDashboard();
});
