'use strict';
/*
 * MillTrack — Web-Based Rice Mill Operations and Transaction Tracking System
 * with SMS Notification Upon Milling Completion.
 *
 * 60% BUILD. The whole system is three files: index.html, style.css, script.js.
 * Open index.html in a browser. No installation and no server are needed for this build:
 * records are kept in the browser (see part 2).
 *
 * Contents
 *   1. Helpers            formatting, tables, pop-up forms
 *   2. Local data store   stands in for the server and database
 *   3. Page shell         sidebar, navigation, login forms, progress, screens in development
 *   4. Shared parts       status steps, schedules, payments, queue rows
 *   5. Customer screens   dashboard, my requests, new request, transaction, profile
 *   6. Admin screens      dashboard, queue, transactions, schedules, customers, payments
 *   7. Start
 */

/* =====================================================================================
   1. HELPERS
   Small tools used by every screen.
   ===================================================================================== */

/* ---------- utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdt = (s) => (s ? new Date(s).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const fd = (s) => (s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const localInput = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const todayStr = () => localInput().slice(0, 10);

const S = { user: null, mill: {}, services: [] };
const isAdmin = () => S.user?.role === 'admin';
let actions = {};
let after = null;
let renderToken = 0;
const T = new Map(); // transaction cache for modals
const remember = (rows) => { rows.forEach((t) => T.set(t.id, t)); return rows; };

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), kind === 'err' ? 7000 : 3800);
}
const post = async (path, body, msg) => { await api(path, 'POST', body); if (msg) toast(msg); render(); };

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  queue: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  swap: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8M16 12H8M13 16H8"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  grain: '<path d="M12 3c3.5 3.5 3.5 8.5 0 12-3.5-3.5-3.5-8.5 0-12zM12 21v-9M7 13c0 3 2 5 5 5M17 13c0 3-2 5-5 5"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const logo = () => `<div class="logo"><span class="logo-mark">${ic('grain')}</span>MillTrack</div>`;

const TONE = {
  Pending: 'gold', Waiting: 'blue', 'In Progress': 'green', Completed: 'green', Cancelled: 'red',
  Paid: 'green', Partial: 'gold', Unpaid: 'red', Requested: 'gold', Proposed: 'blue', Confirmed: 'green',
  Sent: 'green', Failed: 'red', Simulated: 'blue', Buy: 'blue', Sell: 'green', 'Low stock': 'red',
};
const badge = (s) => `<span class="badge ${TONE[s] || ''}">${esc(s)}</span>`;
const page = (title, sub, btns, body) => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="btns">${btns || ''}</div></div>${body}`;
const empty = (title, text = '') => `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`;
function table(cols, rows, emptyHtml) {
  if (!rows.length) return emptyHtml || empty('Nothing here yet');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c) => `<th class="${c.r ? 'right' : ''}">${c.h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.r ? 'right num' : ''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- modal forms ---------- */
function field(f) {
  const a = `name="${f.name}" ${f.required ? 'required' : ''} ${f.attrs || ''}`;
  if (f.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
  if (f.type === 'checks') {
    return `<div class="field"><span>${esc(f.label)}</span>${f.options.map(([v, l, on]) =>
      `<label class="check"><input type="checkbox" data-multi="1" name="${f.name}" value="${esc(v)}" ${on ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('') || '<small>None available.</small>'}</div>`;
  }
  let input;
  if (f.type === 'select') {
    input = `<select ${a}>${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(f.value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea ${a} rows="3">${esc(f.value ?? '')}</textarea>`;
  } else {
    input = `<input type="${f.type || 'text'}" ${a} value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}">`;
  }
  return `<label class="field"><span>${esc(f.label)}</span>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}
function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multi) { (o[el.name] ||= []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value;
  }
  return o;
}
const closeModal = () => $('.modal-bg')?.remove();
function formModal({ title, fields = [], note, submitLabel = 'Save', onSubmit }) {
  closeModal();
  const m = document.createElement('div');
  m.className = 'modal-bg';
  m.innerHTML = `<form class="modal"><header><h3>${esc(title)}</h3><button type="button" class="x" data-close aria-label="Close">×</button></header>
    <div class="modal-body">${note ? `<p class="muted">${note}</p>` : ''}${fields.map(field).join('')}<div class="form-err"></div></div>
    <footer><button type="button" class="btn" data-close>${onSubmit ? 'Cancel' : 'Close'}</button>${onSubmit ? `<button class="btn primary">${esc(submitLabel)}</button>` : ''}</footer></form>`;
  document.body.append(m);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  const form = $('form', m);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return closeModal();
    const btn = $('.btn.primary', form);
    btn.disabled = true;
    try {
      const then = await onSubmit(formData(form));
      closeModal();
      await render();
      if (typeof then === 'function') then();
    } catch (err) {
      $('.form-err', form).textContent = err.message;
      btn.disabled = false;
    }
  });
  $('input:not([type=checkbox]), select, textarea', form)?.focus();
}
const infoModal = (title, html) => formModal({ title, note: html });

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act] || globalActions[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  Promise.resolve().then(() => fn(el.dataset, el)).catch((err) => toast(err.message, 'err'));
});
const globalActions = {
  menu: () => $('.shell')?.classList.toggle('open'),
};

/* =====================================================================================
   2. LOCAL DATA STORE
   In this 60% build there is no server yet. This part plays the role of the server and
   database: it keeps all records in the browser (localStorage) and answers the same
   requests the finished system will send to the real server.
   ===================================================================================== */
const DB_KEY = 'milltrack60_db';
const SESSION_KEY = 'milltrack60_user';

const localApi = (() => {
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  const nowS = () => fmtLocal(new Date());
  const round2 = (n) => Math.round(n * 100) / 100;
  const fail = (m) => { throw new Error(m); };
  const text = (v, max = 200) => String(v ?? '').trim().slice(0, max);
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
  const nextId = (d) => ++d.seq;
  const saveDb = (d) => localStorage.setItem(DB_KEY, JSON.stringify(d));
  function loadDb() {
    try { const d = JSON.parse(localStorage.getItem(DB_KEY)); if (d && d.users) return d; } catch { /* start fresh */ }
    const d = seedDb(); saveDb(d); return d;
  }
  // Registration check 1: the number must be a valid PH mobile number.
  function mobileNorm(v) {
    const m = String(v || '').replace(/[\s\-().]/g, '');
    const r = /^(?:\+?63|0)(9\d{9})$/.exec(m);
    if (!r) fail('Enter a valid PH mobile number, e.g. 0917 123 4567.');
    return '0' + r[1];
  }
  function when(v, label) {
    const s = text(v, 30);
    if (!s) fail(`${label} is required.`);
    const dt = new Date(s);
    if (isNaN(dt)) fail(`${label} is not a valid date and time.`);
    return fmtLocal(dt);
  }
  const publicUser = (u) => u && ({ id: u.id, role: u.role, name: u.name, mobile: u.mobile, mobile_confirmed: u.mobile_confirmed, email: u.email, address: u.address, active: u.active, created_at: u.created_at });

  function createUser(d, { name, mobile, password, address, email, role = 'user', confirmed = false }) {
    name = text(name, 80);
    if (name.length < 2) fail('Please enter a full name.');
    const m = mobileNorm(mobile);
    // Registration check 2: no two accounts may share a number.
    if (d.users.some((u) => u.mobile === m)) fail('That mobile number is already registered.');
    if (String(password || '').length < 6) fail('Password must be at least 6 characters.');
    const u = { id: nextId(d), role, name, mobile: m, mobile_confirmed: confirmed ? 1 : 0, email: text(email, 120), address: text(address, 250), password: String(password), active: 1, created_at: nowS() };
    d.users.push(u);
    return u;
  }
  function updateContact(d, u, body) {
    const name = text(body.name ?? u.name, 80);
    if (name.length < 2) fail('Please enter a full name.');
    const m = mobileNorm(body.mobile ?? u.mobile);
    if (d.users.some((x) => x.mobile === m && x.id !== u.id)) fail('That mobile number is already registered.');
    const changed = m !== u.mobile;
    Object.assign(u, { name, mobile: m, email: text(body.email ?? u.email, 120), address: text(body.address ?? u.address, 250) });
    if (changed) u.mobile_confirmed = 0;
    return changed;
  }

  /* ---- transactions, fees, queue ---- */
  function setItems(d, t, serviceIds) {
    t.items = [];
    let total = 0;
    for (const s of d.services.filter((x) => x.active)) {
      const include = s.kind === 'core' || (s.kind === 'optional' && serviceIds.includes(s.id)) ||
        (s.kind === 'pickup' && t.entry_method === 'pickup') || (s.kind === 'delivery' && t.collection_method === 'delivery');
      if (!include) continue;
      const qty = s.unit === 'sack' ? t.sacks : 1;
      const amount = round2(qty * s.rate);
      total += amount;
      t.items.push({ id: nextId(d), service_id: s.id, name: s.name, unit: s.unit, qty, rate: s.rate, amount });
    }
    t.total_fee = round2(total);
  }
  const idList = (v) => (Array.isArray(v) ? v : []).map(Number).filter(Number.isInteger);
  function createTxn(d, customer, body) {
    const sacks = num(body.sacks);
    if (!Number.isInteger(sacks) || sacks < 1 || sacks > 2000) fail('Number of sacks must be a whole number from 1 to 2000.');
    const entry = body.entry_method === 'pickup' ? 'pickup' : 'dropoff';
    const collection = body.collection_method === 'delivery' ? 'delivery' : 'pickup';
    const entryAt = when(body.entry_at, entry === 'pickup' ? 'Preferred pickup time' : 'Preferred drop-off time');
    const deliveryAt = collection === 'delivery' ? when(body.delivery_at, 'Preferred delivery time') : null;
    const address = text(body.address || customer.address, 250);
    if ((entry === 'pickup' || collection === 'delivery') && !address) fail('An address is required for pickup or delivery.');
    if (deliveryAt && deliveryAt < entryAt) fail('Delivery time must be after the palay arrives at the mill.');
    // Unique transaction number: MT-YYYYMMDD-0001
    const ymd = nowS().slice(0, 10).replace(/-/g, '');
    const last = d.txns.filter((x) => x.txn_no.startsWith(`MT-${ymd}-`)).map((x) => parseInt(x.txn_no.slice(-4), 10)).sort((a, b) => b - a)[0] || 0;
    const t = {
      id: nextId(d), txn_no: `MT-${ymd}-${String(last + 1).padStart(4, '0')}`, customer_id: customer.id, sacks, weight_kg: null,
      variety: text(body.variety, 60), entry_method: entry, collection_method: collection, address, notes: text(body.notes, 500),
      payment_method: body.payment_method === 'GCash' ? 'GCash' : 'COD', status: 'Pending', queue_order: null, total_fee: 0,
      created_at: nowS(), received_at: null, started_at: null, completed_at: null, released_at: null, items: [], schedules: [], payments: [],
    };
    setItems(d, t, idList(body.service_ids));
    t.schedules.push({ id: nextId(d), txn_id: t.id, type: entry, preferred_at: entryAt, proposed_at: null, confirmed_at: null, status: 'Requested', note: null });
    if (deliveryAt) t.schedules.push({ id: nextId(d), txn_id: t.id, type: 'delivery', preferred_at: deliveryAt, proposed_at: null, confirmed_at: null, status: 'Requested', note: null });
    d.txns.push(t);
    return t;
  }
  const doneSched = (s) => { s.status = 'Done'; s.confirmed_at = s.confirmed_at || s.proposed_at || s.preferred_at; };
  function toQueue(d, t) {
    if (t.status !== 'Pending') fail('Only pending transactions can be added to the queue.');
    t.status = 'Waiting'; t.received_at = nowS();
    t.queue_order = Math.max(0, ...d.txns.map((x) => x.queue_order || 0)) + 1;
    t.schedules.filter((s) => s.type !== 'delivery').forEach(doneSched);
  }
  function startTxn(t) {
    if (t.status !== 'Waiting') fail('Only waiting transactions can be started.');
    t.status = 'In Progress'; t.started_at = nowS();
  }
  // Number in line and estimated completion time, assuming one milling line.
  function queueInfo(d) {
    const mps = Math.max(1, Number(d.settings.minutes_per_sack) || 12) * 60000;
    const t0 = Date.now(); let cursor = t0; const info = {};
    for (const t of d.txns.filter((x) => x.status === 'In Progress')) {
      const eta = Math.max(t0 + 5 * 60000, new Date(t.started_at).getTime() + t.sacks * mps);
      info[t.id] = { position: 0, ahead: 0, eta: fmtLocal(new Date(eta)) };
      cursor = Math.max(cursor, eta);
    }
    let pos = 0;
    for (const t of d.txns.filter((x) => x.status === 'Waiting').sort((a, b) => a.queue_order - b.queue_order)) {
      cursor += t.sacks * mps; pos += 1;
      info[t.id] = { position: pos, ahead: pos - 1, eta: fmtLocal(new Date(cursor)) };
    }
    for (const k of Object.keys(info)) info[k].total = pos;
    return info;
  }
  // Adds the calculated fields the pages show: customer, paid, balance, payment status, queue.
  function full(d, t, qi = queueInfo(d)) {
    const c = d.users.find((u) => u.id === t.customer_id);
    const sum = (st) => t.payments.filter((p) => p.status === st).reduce((s, p) => s + p.amount, 0);
    const paid = round2(sum('Verified'));
    const balance = Math.max(0, round2(t.total_fee - paid));
    return { ...t, customer_name: c.name, customer_mobile: c.mobile, mobile_confirmed: c.mobile_confirmed, paid, balance,
      payment_status: paid <= 0 ? 'Unpaid' : balance > 0 ? 'Partial' : 'Paid', pending_amount: round2(sum('Pending')), queue: qi[t.id] || null, sms: null };
  }
  function findTxn(d, id, user) {
    const t = d.txns.find((x) => x.id === id);
    if (!t || (user && user.role !== 'admin' && t.customer_id !== user.id)) fail('Transaction not found.');
    return t;
  }
  function findSched(d, id, user) {
    for (const t of d.txns) {
      const s = t.schedules.find((x) => x.id === id);
      if (!s) continue;
      findTxn(d, t.id, user);
      if (s.status === 'Done') fail('This schedule is already done.');
      return s;
    }
    return fail('Schedule not found.');
  }
  const listAll = (d) => { const qi = queueInfo(d); return [...d.txns].sort((a, b) => b.id - a.id).map((t) => full(d, t, qi)); };

  /* ---- demo data shown the first time the system is opened ---- */
  function seedDb() {
    const d = { seq: 0, users: [], services: [], txns: [],
      settings: { mill_name: 'Anilink Rice Mill', mill_address: '', mill_contact: '', gcash_number: '', gcash_name: '', minutes_per_sack: '12' } };
    const admin = createUser(d, { name: 'Mill Administrator', mobile: '09170000001', password: 'admin123', role: 'admin', confirmed: true });
    for (const [name, kind, unit, rate] of [['Rice milling', 'core', 'sack', 130], ['Mechanical drying', 'optional', 'sack', 60], ['Extra polishing', 'optional', 'sack', 20],
      ['Re-sacking and sealing', 'optional', 'sack', 10], ['Palay pickup by mill', 'pickup', 'flat', 150], ['Rice delivery', 'delivery', 'flat', 200]]) {
      d.services.push({ id: nextId(d), name, kind, unit, rate, active: 1 });
    }
    const maria = createUser(d, { name: 'Maria Santos', mobile: '09171234567', password: 'customer123', address: 'Purok 3, Brgy. San Isidro', confirmed: true });
    const jose = createUser(d, { name: 'Jose Dela Cruz', mobile: '09181234567', password: 'customer123', address: 'Sitio Maligaya, Brgy. Poblacion', confirmed: true });
    const ana = createUser(d, { name: 'Ana Reyes', mobile: '09191234567', password: 'customer123', address: 'Brgy. Bagong Silang' });
    const at = (mins) => fmtLocal(new Date(Date.now() + mins * 60000));
    const opt = d.services.filter((s) => s.kind === 'optional').map((s) => s.id);
    const pay = (t, amount, method, mins) => t.payments.push({ id: nextId(d), txn_id: t.id, amount, method, reference: '', status: 'Verified', received_by: admin.id, created_at: at(mins) });

    const t1 = createTxn(d, maria, { sacks: 12, variety: 'RC 222', entry_method: 'dropoff', collection_method: 'pickup', entry_at: at(-120), service_ids: [opt[0]] });
    toQueue(d, t1); startTxn(t1); t1.started_at = at(-40); pay(t1, 1000, 'COD', -110);
    const t2 = createTxn(d, jose, { sacks: 8, variety: 'Dinorado', entry_method: 'pickup', collection_method: 'delivery', entry_at: at(-180), delivery_at: at(60 * 26), payment_method: 'GCash' });
    toQueue(d, t2);
    const t3 = createTxn(d, maria, { sacks: 5, variety: 'RC 160', entry_method: 'dropoff', collection_method: 'pickup', entry_at: at(-60), service_ids: [opt[1]] });
    toQueue(d, t3);
    createTxn(d, ana, { sacks: 10, variety: 'Jasmine', entry_method: 'dropoff', collection_method: 'delivery', entry_at: at(60 * 20), delivery_at: at(60 * 48), notes: 'Please call before delivery.' });
    const t5 = createTxn(d, jose, { sacks: 6, variety: 'RC 222', entry_method: 'dropoff', collection_method: 'pickup', entry_at: at(-60 * 30) });
    toQueue(d, t5);
    Object.assign(t5, { status: 'Released', created_at: at(-60 * 31), received_at: at(-60 * 30), started_at: at(-60 * 29), completed_at: at(-60 * 27), released_at: at(-60 * 25) });
    pay(t5, 780, 'GCash', -60 * 25);
    return d;
  }

  /* ---- the requests the pages can make ---- */
  const routes = [];
  const on = (method, pattern, role, fn) => routes.push({ method, role, fn, re: new RegExp('^' + pattern.replace(/:id/g, '(\\d+)') + '$') });

  on('GET', '/api/bootstrap', null, ({ d, user }) => ({
    user: publicUser(user),
    mill: { name: d.settings.mill_name, address: d.settings.mill_address, contact: d.settings.mill_contact, gcash_number: d.settings.gcash_number, gcash_name: d.settings.gcash_name, gcash_qr: false },
    services: user ? d.services.filter((s) => s.active) : [],
  }));
  on('POST', '/api/register', null, ({ d, body }) => {
    const u = createUser(d, { ...body, role: 'user', confirmed: false });
    sessionStorage.setItem(SESSION_KEY, u.id);
    return { user: publicUser(u) };
  });
  on('POST', '/api/login', null, ({ d, body }) => {
    let m; try { m = mobileNorm(body.mobile); } catch { fail('Incorrect mobile number or password.'); }
    const u = d.users.find((x) => x.mobile === m);
    if (!u || u.password !== String(body.password)) fail('Incorrect mobile number or password.');
    // Separate logins: each login page accepts only its own kind of account.
    const portal = body.portal === 'admin' ? 'admin' : 'user';
    if (u.role !== portal) fail(portal === 'admin' ? 'This is not a staff account. Please use the customer login page.' : 'Staff accounts sign in on the admin login page.');
    if (!u.active) fail('This account has been deactivated. Please contact the rice mill.');
    sessionStorage.setItem(SESSION_KEY, u.id);
    return { user: publicUser(u) };
  });
  on('POST', '/api/logout', null, () => { sessionStorage.removeItem(SESSION_KEY); });
  on('PUT', '/api/me', 'any', ({ d, user, body }) => {
    if (body.new_password) {
      if (user.password !== String(body.current_password)) fail('Your current password is incorrect.');
      if (String(body.new_password).length < 6) fail('New password must be at least 6 characters.');
      user.password = String(body.new_password);
    }
    const changed = updateContact(d, user, body);
    return { user: publicUser(user), mobile_changed: changed };
  });

  on('GET', '/api/transactions', 'any', ({ d, user }) => listAll(d).filter((t) => user.role === 'admin' || t.customer_id === user.id));
  on('POST', '/api/transactions', 'any', ({ d, user, body }) => {
    let customer = user;
    if (user.role === 'admin') customer = d.users.find((u) => u.id === num(body.customer_id) && u.role === 'user') || fail('Choose a customer for this request.');
    const t = createTxn(d, customer, body);
    if (user.role === 'admin' && body.queue_now) toQueue(d, t);
    return full(d, t);
  });
  on('GET', '/api/transactions/:id', 'any', ({ d, user, id }) => full(d, findTxn(d, id, user)));
  on('PUT', '/api/transactions/:id', 'admin', ({ d, id, body }) => {
    const t = findTxn(d, id);
    if (['Released', 'Cancelled'].includes(t.status)) fail('This transaction can no longer be edited.');
    const sacks = num(body.sacks);
    if (!Number.isInteger(sacks) || sacks < 1 || sacks > 2000) fail('Number of sacks must be a whole number from 1 to 2000.');
    const weight = body.weight_kg === '' || body.weight_kg == null ? null : num(body.weight_kg);
    if (weight !== null && !(weight > 0)) fail('Weight must be a positive number.');
    Object.assign(t, { sacks, weight_kg: weight, variety: text(body.variety, 60), notes: text(body.notes, 500) });
    if (['GCash', 'COD'].includes(body.payment_method)) t.payment_method = body.payment_method;
    setItems(d, t, idList(body.service_ids));
    return full(d, t);
  });
  on('POST', '/api/transactions/:id/cancel', 'any', ({ d, user, id }) => {
    const t = findTxn(d, id, user);
    if (!(user.role === 'admin' ? ['Pending', 'Waiting'] : ['Pending']).includes(t.status)) fail('This transaction can no longer be cancelled. Please contact the rice mill.');
    if (t.payments.some((p) => p.status !== 'Rejected')) fail('This transaction already has a payment recorded and cannot be cancelled.');
    t.status = 'Cancelled';
  });
  on('POST', '/api/transactions/:id/queue', 'admin', ({ d, id }) => { toQueue(d, findTxn(d, id)); });
  on('POST', '/api/transactions/:id/start', 'admin', ({ d, id }) => { startTxn(findTxn(d, id)); });
  on('POST', '/api/transactions/:id/complete', 'admin', ({ d, id }) => {
    const t = findTxn(d, id);
    if (t.status !== 'In Progress') fail('Only transactions that are in progress can be completed.');
    t.status = 'Completed'; t.completed_at = nowS();
    // The SMS notification is sent here in the finished system (part of the remaining 40%).
    return { txn: full(d, t), sms: { status: 'Simulated', detail: 'SMS sending is not part of the 60% build.' } };
  });
  on('POST', '/api/transactions/:id/release', 'admin', ({ d, id }) => {
    const t = findTxn(d, id);
    if (t.status !== 'Completed') fail('Only completed transactions can be released.');
    t.status = 'Released'; t.released_at = nowS();
    t.schedules.filter((s) => s.type === 'delivery').forEach(doneSched);
  });
  on('POST', '/api/transactions/:id/move', 'admin', ({ d, id, body }) => {
    const list = d.txns.filter((x) => x.status === 'Waiting').sort((a, b) => a.queue_order - b.queue_order);
    const i = list.findIndex((t) => t.id === id);
    const j = body.dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i].queue_order, list[j].queue_order] = [list[j].queue_order, list[i].queue_order];
  });
  on('GET', '/api/queue-board', 'any', ({ d, user }) => {
    const qi = queueInfo(d);
    return d.txns.filter((t) => qi[t.id]).map((t) => ({ txn_no: t.txn_no, sacks: t.sacks, status: t.status, mine: t.customer_id === user.id, position: qi[t.id].position, eta: qi[t.id].eta }))
      .sort((a, b) => a.position - b.position);
  });

  /* payments: GCash or COD */
  on('POST', '/api/transactions/:id/payments', 'admin', ({ d, user, id, body }) => {
    const t = findTxn(d, id); const v = full(d, t);
    if (t.status === 'Cancelled') fail('Cancelled transactions cannot receive payments.');
    const amount = round2(num(body.amount));
    if (!(amount > 0)) fail('Enter a payment amount greater than zero.');
    if (amount > v.balance + 0.001) fail(`Payment exceeds the remaining balance of PHP ${v.balance.toFixed(2)}.`);
    t.payments.push({ id: nextId(d), txn_id: t.id, amount, method: body.method === 'GCash' ? 'GCash' : 'COD', reference: text(body.reference, 80), status: 'Verified', received_by: user.id, created_at: nowS() });
  });
  on('POST', '/api/transactions/:id/gcash', 'user', ({ d, user, id, body }) => {
    const t = findTxn(d, id, user); const v = full(d, t);
    if (t.status === 'Cancelled') fail('Cancelled transactions cannot receive payments.');
    const amount = round2(num(body.amount));
    if (!(amount > 0)) fail('Enter the amount you sent.');
    const open = round2(v.balance - v.pending_amount);
    if (amount > open + 0.001) fail(`The amount is more than the remaining balance of PHP ${open.toFixed(2)}.`);
    const ref = text(body.reference, 40).replace(/\s/g, '');
    if (!/^[A-Za-z0-9]{6,30}$/.test(ref)) fail('Enter the GCash reference number from your receipt.');
    if (d.txns.some((x) => x.payments.some((p) => p.method === 'GCash' && p.reference === ref && p.status !== 'Rejected'))) fail('That GCash reference number was already submitted.');
    t.payments.push({ id: nextId(d), txn_id: t.id, amount, method: 'GCash', reference: ref, status: 'Pending', received_by: null, created_at: nowS() });
  });
  on('GET', '/api/payments', 'admin', ({ d }) => d.txns.flatMap((t) => t.payments.map((p) => ({ ...p, txn_no: t.txn_no,
    customer_name: d.users.find((u) => u.id === t.customer_id).name, received_by_name: (d.users.find((u) => u.id === p.received_by) || {}).name || null }))).sort((a, b) => b.id - a.id));
  on('POST', '/api/payments/:id/verify', 'admin', ({ d, user, id, body }) => {
    const t = d.txns.find((x) => x.payments.some((p) => p.id === id)) || fail('Payment not found.');
    const p = t.payments.find((x) => x.id === id);
    if (p.status !== 'Pending') fail('This payment was already reviewed.');
    if (body.approve !== false && p.amount > full(d, t).balance + 0.001) fail('This payment is more than the remaining balance.');
    p.status = body.approve === false ? 'Rejected' : 'Verified'; p.received_by = user.id;
  });

  /* schedules: the customer prefers a time, the Admin confirms or proposes another */
  on('GET', '/api/schedules', 'admin', ({ d }) => d.txns.filter((t) => t.status !== 'Cancelled').flatMap((t) => {
    const c = d.users.find((u) => u.id === t.customer_id);
    return t.schedules.map((s) => ({ ...s, txn_no: t.txn_no, txn_status: t.status, address: t.address, sacks: t.sacks, customer_name: c.name, customer_mobile: c.mobile }));
  }).sort((a, b) => (a.confirmed_at || a.proposed_at || a.preferred_at).localeCompare(b.confirmed_at || b.proposed_at || b.preferred_at)));
  on('POST', '/api/schedules/:id/admin', 'admin', ({ d, id, body }) => {
    const s = findSched(d, id);
    if (body.action === 'confirm') Object.assign(s, { status: 'Confirmed', confirmed_at: s.preferred_at, proposed_at: null, note: null });
    else if (body.action === 'propose') Object.assign(s, { status: 'Proposed', proposed_at: when(body.proposed_at, 'Proposed time'), confirmed_at: null, note: text(body.note, 200) });
    else if (body.action === 'done') doneSched(s);
    else fail('Unknown schedule action.');
  });
  on('POST', '/api/schedules/:id/respond', 'user', ({ d, user, id, body }) => {
    const s = findSched(d, id, user);
    if (body.action === 'accept') {
      if (s.status !== 'Proposed') fail('There is no proposed time to accept.');
      Object.assign(s, { status: 'Confirmed', confirmed_at: s.proposed_at });
    } else if (body.action === 'request') Object.assign(s, { status: 'Requested', preferred_at: when(body.preferred_at, 'Preferred time'), proposed_at: null, confirmed_at: null, note: null });
    else fail('Unknown schedule action.');
  });

  /* customer records */
  const tempPassword = () => Math.random().toString(36).slice(2, 10);
  on('GET', '/api/customers', 'admin', ({ d }) => {
    const all = listAll(d);
    return d.users.filter((u) => u.role === 'user').sort((a, b) => a.name.localeCompare(b.name)).map((u) => {
      const mine = all.filter((t) => t.customer_id === u.id);
      return { ...publicUser(u), txn_count: mine.length, balance: round2(mine.filter((t) => t.status !== 'Cancelled').reduce((s, t) => s + t.balance, 0)) };
    });
  });
  on('POST', '/api/customers', 'admin', ({ d, body }) => {
    const password = body.password || tempPassword();
    const u = createUser(d, { ...body, password, role: 'user', confirmed: !!body.confirmed });
    return { id: u.id, temp_password: body.password ? null : password };
  });
  on('PUT', '/api/customers/:id', 'admin', ({ d, id, body }) => {
    const u = d.users.find((x) => x.id === id && x.role === 'user') || fail('Customer not found.');
    updateContact(d, u, body);
    if (body.active !== undefined) u.active = body.active ? 1 : 0;
    let temp = null;
    if (body.reset_password) { temp = tempPassword(); u.password = temp; }
    return { ok: true, temp_password: temp };
  });
  on('POST', '/api/customers/:id/confirm', 'admin', ({ d, id, body }) => {
    const u = d.users.find((x) => x.id === id && x.role === 'user') || fail('Customer not found.');
    u.mobile_confirmed = body.confirmed === false ? 0 : 1; // registration check 3: marked confirmed once checked
  });

  /* admin dashboard numbers and mill profile */
  on('GET', '/api/dashboard', 'admin', ({ d }) => {
    const all = listAll(d); const today = nowS().slice(0, 10); const counts = {};
    for (const t of all) counts[t.status] = (counts[t.status] || 0) + 1;
    const pays = d.txns.flatMap((t) => t.payments);
    return {
      counts,
      today_collections: round2(pays.filter((p) => p.status === 'Verified' && p.created_at.slice(0, 10) === today).reduce((s, p) => s + p.amount, 0)),
      sacks_today: all.filter((t) => (t.completed_at || '').slice(0, 10) === today).reduce((s, t) => s + t.sacks, 0),
      outstanding: round2(all.filter((t) => t.status !== 'Cancelled').reduce((s, t) => s + t.balance, 0)),
      sched_pending: d.txns.filter((t) => t.status !== 'Cancelled').flatMap((t) => t.schedules).filter((s) => s.status === 'Requested').length,
      unconfirmed: d.users.filter((u) => u.role === 'user' && !u.mobile_confirmed && u.active).length,
      gcash_pending: pays.filter((p) => p.status === 'Pending').length,
      low_stock: 0, sms_failed: 0, orders_open: 0,
    };
  });
  on('GET', '/api/settings', 'admin', ({ d }) => ({ settings: d.settings, services: d.services }));
  on('PUT', '/api/settings', 'admin', ({ d, body }) => {
    if (!text(body.mill_name)) fail('Mill name is required.');
    if (!(num(body.minutes_per_sack) >= 1)) fail('Minutes per sack must be at least 1.');
    for (const k of Object.keys(d.settings)) if (body[k] !== undefined) d.settings[k] = text(body[k], 300);
  });

  // Finds the matching request, checks who is signed in, runs it and saves the data.
  return function handle(path, method, body) {
    const d = loadDb();
    const uid = Number(sessionStorage.getItem(SESSION_KEY));
    const user = d.users.find((u) => u.id === uid && u.active) || null;
    const clean = path.split('?')[0];
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(clean);
      if (!m) continue;
      if (r.role && !user) fail('Please sign in to continue.');
      if ((r.role === 'admin' || r.role === 'user') && user.role !== r.role) fail('You do not have access to this.');
      const out = r.fn({ d, user, body: body || {}, id: m[1] ? Number(m[1]) : null });
      saveDb(d);
      return JSON.parse(JSON.stringify(out ?? { ok: true }));
    }
    return fail('This feature is not part of the 60% build yet.');
  };
})();

// SHARED MODE: when the page is opened through the MillTrack server (http://localhost:3000/60/ or the
// online link), every request goes to that server, so customers and the Admin on different devices see
// the same records. When index.html is opened directly as a file, the browser-only store above is used.
let SERVER = null;
async function detectServer() {
  if (SERVER !== null) return SERVER;
  if (!location.protocol.startsWith('http')) return (SERVER = false);
  try {
    const r = await fetch('/api/bootstrap', { credentials: 'same-origin' });
    const j = await r.json();
    SERVER = r.ok && !!j.mill;
  } catch { SERVER = false; }
  return SERVER;
}
// Every screen calls api(...) to read or save records.
async function api(path, method = 'GET', body) {
  if (!(await detectServer())) return localApi(path, method, body);
  const res = await fetch(path, {
    method, credentials: 'same-origin',
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty reply */ }
  if (!res.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}

/* =====================================================================================
   3. PAGE SHELL AND NAVIGATION
   One HTML file holds every screen. The part after # in the address decides which screen
   is shown, for example index.html#login or index.html#queue.
   ===================================================================================== */
Object.assign(TONE, { Verified: 'green', Rejected: 'red', Approved: 'blue' });
const PAYM = { GCash: 'GCash (online payment)', COD: 'COD (cash on pickup or delivery)' };
// [route, label, icon, 1 = still in development]
const ADMIN_NAV = [['admin-dashboard', 'Dashboard', 'grid'], ['queue', 'Queue', 'queue'], ['transactions', 'Transactions', 'file'], ['schedules', 'Schedules', 'cal'],
  ['customers', 'Customers', 'users'], ['payments', 'Fees & Payments', 'card'], ['settings', 'Mill Profile', 'sliders'],
  ['sms', 'SMS Notification', 'msg', 1], ['trade', 'Buy & Sell', 'swap', 1], ['inventory', 'Inventory', 'box', 1], ['expenses', 'Expenses', 'receipt', 1], ['reports', 'Reports', 'chart', 1]];
const USER_NAV = [['dashboard', 'My Dashboard', 'grid'], ['requests', 'My Requests', 'file'], ['new-request', 'New Request', 'plus'], ['profile', 'Profile', 'user'], ['market', 'Buy & Sell', 'swap', 1]];
const AUTH_PAGES = ['login', 'admin-login', 'register'];
const ROUTES = {}; // filled in by each page section below
const homeOf = (u) => (u.role === 'admin' ? '#admin-dashboard' : '#dashboard');
const loginOf = (role) => (role === 'admin' ? '#admin-login' : '#login');
function hashParts() {
  const [name, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return { name, qs };
}
const param = (k) => new URLSearchParams(hashParts().qs).get(k);
let PAGE = null;

globalActions.logout = async () => {
  const role = S.user?.role;
  await api('/api/logout', 'POST');
  location.hash = loginOf(role);
  go();
};
globalActions.copy = async (d) => {
  try { await navigator.clipboard.writeText(d.text); toast('Copied: ' + d.text); } catch { toast('Could not copy. The number is ' + d.text, 'err'); }
};

async function boot() {
  Object.assign(S, await api('/api/bootstrap'));
}
// Fills elements marked data-mill="name|address" on the login and register screens.
function fillMill() {
  document.querySelectorAll('[data-mill]').forEach((el) => { el.textContent = S.mill[el.dataset.mill] || el.dataset.empty || ''; });
}
// Card with the rice mill address and a map.
function locationCard() {
  const a = S.mill.address;
  if (!a) return `<div class="card"><h3>Rice mill location</h3><p class="muted">The location of ${esc(S.mill.name)} has not been set yet.${isAdmin() ? ' Add it in <a href="#settings">Mill Profile</a>.' : ''}</p></div>`;
  const qy = encodeURIComponent(a);
  return `<div class="card loc"><div class="card-head"><h3>Rice mill location</h3><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${qy}">Open in Google Maps</a></div>
    <p><b>${esc(S.mill.name)}</b><br>${esc(a)}${S.mill.contact ? `<br><span class="muted">Contact: ${esc(S.mill.contact)}</span>` : ''}</p>
    <iframe class="map" loading="lazy" title="Map of the rice mill" referrerpolicy="no-referrer" src="https://www.google.com/maps?q=${qy}&output=embed"></iframe></div>`;
}

function ensureShell() {
  const uid = String(S.user.id) + S.user.name + S.mill.name + S.mill.address;
  if (!$('.shell') || $('.shell').dataset.uid !== uid) {
    const nav = isAdmin() ? ADMIN_NAV : USER_NAV;
    app.innerHTML = `<div class="shell" data-uid="${esc(uid)}">
      <aside class="side">${logo()}<div class="mill">${esc(S.mill.name)}${S.mill.address ? `<br>${esc(S.mill.address)}` : ''}</div>
        <nav class="nav">${nav.map(([r, l, i, soon]) => `<a href="#${r}" data-r="${r}">${ic(i)}${l}${soon ? '<span class="soon">Soon</span>' : ''}</a>`).join('')}</nav>
        <div class="mode ${SERVER ? 'shared' : ''}">${SERVER ? '<b>Shared mode</b>Customers and Admin on any device see the same records.' : '<b>This browser only</b>Records are saved in this browser. Open through the MillTrack server to share them between devices.'}</div>
        <div class="side-user"><span class="avatar">${esc(S.user.name[0].toUpperCase())}</span>
          <div><b>${esc(S.user.name)}</b><small>${isAdmin() ? 'Admin' : 'Customer'}</small></div>
          <button data-act="logout" title="Sign out" aria-label="Sign out">${ic('out')}</button></div>
      </aside>
      <main class="main"><button class="btn sm menu-btn" data-act="menu">☰ Menu</button><div id="view"></div></main></div>`;
  }
  const on = typeof PAGE.nav === 'function' ? PAGE.nav() : PAGE.nav;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === on));
  $('.shell').classList.remove('open');
}

// Draws the current screen again (after saving something, or every few seconds on live screens).
async function render(silent) {
  if (!PAGE) return;
  if (!S.user) return go();
  const token = ++renderToken;
  ensureShell();
  const prevActions = actions;
  actions = {};
  after = null;
  try {
    const html = await PAGE.view();
    if (token !== renderToken) return;
    $('#view').innerHTML = html;
    if (after) after();
    if (!silent) window.scrollTo(0, 0);
  } catch (err) {
    if (token !== renderToken) return;
    if (silent) { actions = prevActions; return; }
    $('#view').innerHTML = `<div class="card">${empty('Could not load this page', err.message)}</div>`;
  }
}

// Decides which screen to show, and keeps people out of screens that are not theirs.
async function go() {
  closeModal();
  await boot();
  const asked = hashParts().name;
  let name = asked;
  if (!S.user) {
    if (!AUTH_PAGES.includes(name)) name = ROUTES[name]?.role === 'admin' ? 'admin-login' : 'login';
  } else {
    const r = ROUTES[name];
    if (!r || (r.role !== 'any' && r.role !== S.user.role)) name = homeOf(S.user).slice(1);
  }
  if (name !== asked) history.replaceState(null, '', '#' + name);
  const signedIn = !!S.user;
  for (const p of AUTH_PAGES) $('#page-' + p).hidden = signedIn || p !== name;
  app.hidden = !signedIn;
  document.body.classList.toggle('admin-login', !signedIn && name === 'admin-login');
  if (!signedIn) { PAGE = null; fillMill(); document.querySelectorAll('.form-err').forEach((e) => { e.textContent = ''; }); return; }
  PAGE = ROUTES[name];
  await render();
}

// Login and register forms (the HTML for them is in index.html).
function authForm(formId, path, extra) {
  const form = $(formId);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api(path, 'POST', { ...formData(form), ...extra });
      form.reset();
      location.hash = homeOf(r.user);
    } catch (ex) { $('.form-err', form).textContent = ex.message; }
  });
}

/* ---- Mill Profile (Admin): name, location, GCash number, queue speed ---- */
async function viewSettings() {
  const { settings: s, services } = await api('/api/settings');
  after = () => $('#millForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/api/settings', 'PUT', formData(e.target)); await boot(); toast('Mill profile saved.'); render(); } catch (err) { $('.form-err', e.target).textContent = err.message; }
  });
  actions.resetdemo = () => {
    if (!confirm('Reset everything back to the demo data?\n\nAll records entered in this browser will be erased.')) return;
    localStorage.removeItem(DB_KEY); sessionStorage.removeItem(SESSION_KEY); location.hash = '#admin-login'; location.reload();
  };
  const KIND = { core: 'Always applied', optional: 'Customer option', pickup: 'When mill picks up palay', delivery: 'When rice is delivered' };
  return page('Mill Profile', 'Mill details, location and the GCash account customers pay to.', '', `
    <div class="grid g2">
      <form class="card" id="millForm"><h3>Mill details</h3>
        ${field({ name: 'mill_name', label: 'Rice mill name', value: s.mill_name, required: true })}
        ${field({ name: 'mill_address', label: 'Location of the rice mill', value: s.mill_address, hint: 'Shown to customers with a map. Write the full address: barangay, town, province.' })}
        ${field({ name: 'mill_contact', label: 'Contact number', value: s.mill_contact })}
        <div class="two">${field({ name: 'gcash_number', label: 'GCash number for payments', value: s.gcash_number, placeholder: '09XX XXX XXXX' })}
        ${field({ name: 'gcash_name', label: 'GCash account name', value: s.gcash_name })}</div>
        ${field({ name: 'minutes_per_sack', label: 'Average milling minutes per sack', type: 'number', value: s.minutes_per_sack, attrs: 'min="1" step="1"', hint: 'Used to estimate completion times in the queue.' })}
        <div class="form-err"></div><button class="btn primary">Save</button></form>
      <div class="stack">${locationCard()}
        ${SERVER ? '<div class="card"><h3>Shared mode</h3><p class="muted">Records are kept on the MillTrack server, so every device sees the same data.</p></div>' : `<div class="card"><h3>Demo data</h3><p class="muted">Records are kept in this browser only. Reset to start the presentation with fresh sample data.</p>
          <div class="btns" style="margin-top:12px"><button class="btn danger" data-act="resetdemo">Reset demo data</button></div></div>`}</div>
    </div>
    <div class="card flush"><div class="card-head"><h3>Services and fees</h3><span class="muted">Editing fees is part of the remaining work</span></div>${table([
      { h: 'Service', f: (x) => `<b>${esc(x.name)}</b>` }, { h: 'Applies', f: (x) => KIND[x.kind] }, { h: 'Rate', r: 1, f: (x) => `${peso(x.rate)} ${x.unit === 'sack' ? '/ sack' : 'flat'}` },
    ], services)}</div>`);
}
ROUTES.settings = { role: 'admin', nav: 'settings', view: viewSettings };

/* ---- System progress: 9 of 15 modules = 60% ---- */
const MODULES = [
  ['Accounts with separate customer and admin login', 1], ['Mobile number validation, duplicate check and confirmation', 1], ['Milling request with drop-off, pickup and delivery options', 1],
  ['Scheduling: preferred time, admin confirms or proposes another', 1], ['Transaction records with unique number and fees', 1], ['Queue management: Waiting, In Progress, Completed', 1],
  ['Customer tracking: number in line and estimated completion', 1], ['Payments: GCash or COD with admin verification', 1], ['Mill profile, location map and customer records', 1],
  ['SMS notification upon milling completion', 0], ['Buy and sell of rice between mill and customers', 0], ['Inventory of palay, rice and supplies', 0],
  ['Expense records', 0], ['Reports: income, sales and expenses', 0], ['Online server with central database', 0],
];
function progressCard() {
  const done = MODULES.filter((m) => m[1]).length;
  const pct = Math.round((done / MODULES.length) * 100);
  return `<div class="card progress"><div class="card-head"><h3>System development progress</h3><b class="pct">${pct}%</b></div>
    <div class="pbar"><i style="width:${pct}%"></i></div><p class="muted">${done} of ${MODULES.length} modules are working in this build.</p>
    <ul class="mods">${MODULES.map(([name, ok]) => `<li class="${ok ? 'ok' : ''}"><span>${ok ? '✓' : '…'}</span>${esc(name)}</li>`).join('')}</ul></div>`;
}

/* ---- Screens that are still in development (the remaining 40%) ---- */
const SOON = {
  sms: ['SMS Notification', 'admin', ['Send one text message to the customer when a transaction is marked Completed', 'Use only confirmed mobile numbers', 'Log every attempt and allow a retry when sending fails']],
  trade: ['Buy & Sell', 'admin', ['Record palay bought from farmers', 'Record rice and by-product sales', 'Approve buy and sell orders placed by customers']],
  inventory: ['Inventory', 'admin', ['Stock of palay, rice, by-products and supplies', 'Automatic stock changes from buying and selling', 'Low-stock warnings']],
  expenses: ['Expenses', 'admin', ['Record operating costs such as fuel, wages and maintenance', 'Group expenses by category']],
  reports: ['Reports', 'admin', ['Income from milling fees and sales', 'Purchases and expenses for a date range', 'Printable summary']],
  market: ['Buy & Sell', 'user', ['Buy rice from the mill and pay by GCash or COD', 'Offer to sell your rice or palay to the mill', 'Follow the status of your orders']],
};
for (const [key, [title, role, items]] of Object.entries(SOON)) {
  ROUTES[key] = { role, nav: key, view: () => page(title, 'This module is still being developed.', '', `
    <div class="card soon-card"><span class="badge gold">In development</span><h3>${esc(title)} is part of the remaining 40%</h3>
      <p class="muted">Planned for the next phase:</p><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`) };
}

/* =====================================================================================
   4. SHARED PARTS
   Pieces used by more than one screen.
   ===================================================================================== */

/* shared-transactions.js — transaction pieces used by several pages: status steps, schedules, payments, queue rows. */

/* ---------- shared transaction pieces ---------- */
const STEPS = [['Pending', 'Request received'], ['Waiting', 'In queue'], ['In Progress', 'Milling'], ['Completed', 'Ready'], ['Released', 'Claimed']];
function stepper(status) {
  if (status === 'Cancelled') return `<div class="notice red">This request was cancelled.</div>`;
  const i = STEPS.findIndex((s) => s[0] === status);
  return `<ol class="steps">${STEPS.map(([, label], k) => `<li class="${k < i || i === 4 ? 'done' : k === i ? 'now' : ''}"><span>${k < i || i === 4 ? '✓' : k + 1}</span>${label}</li>`).join('')}</ol>`;
}
const ENTRY = { dropoff: 'Customer drop-off at the mill', pickup: 'Pickup by the mill' };
const COLLECT = { pickup: 'Customer pickup at the mill', delivery: 'Delivery to customer' };
const SCHED = { dropoff: 'Palay drop-off at the mill', pickup: 'Palay pickup by the mill', delivery: 'Rice delivery' };

function queueText(t) {
  if (t.status === 'Pending') return ['Not yet in queue', 'Queued once the palay arrives'];
  if (t.status === 'Waiting') return [`#${t.queue.position} in line`, t.queue.ahead ? `${t.queue.ahead} ahead` : 'Next to be milled'];
  if (t.status === 'In Progress') return ['Now milling', 'Your palay is on the line'];
  if (t.status === 'Completed') return [t.collection_method === 'delivery' ? 'Ready for delivery' : 'Ready for pickup', 'Milling finished'];
  return [t.status, ''];
}
function etaText(t) {
  if (t.queue) return fdt(t.queue.eta);
  if (t.completed_at) return 'Finished ' + fdt(t.completed_at);
  return 'Set once queued';
}
function schedBox(s, admin) {
  let info = ''; let btns = '';
  const b = (act, label, cls = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${s.id}" data-when="${esc(s.confirmed_at || s.proposed_at || s.preferred_at)}">${label}</button>`;
  if (s.status === 'Requested') {
    info = `Preferred: ${fdt(s.preferred_at)}. Waiting for the mill to confirm.`;
    btns = admin ? b('sconfirm', 'Confirm', 'primary') + b('spropose', 'Propose another time') : b('srequest', 'Change time');
  } else if (s.status === 'Proposed') {
    info = `The mill proposed ${fdt(s.proposed_at)} instead of ${fdt(s.preferred_at)}.${s.note ? ' Note: ' + s.note : ''}`;
    btns = admin ? b('spropose', 'Propose again') : b('saccept', 'Accept', 'primary') + b('srequest', 'Suggest another time');
  } else if (s.status === 'Confirmed') {
    info = `Confirmed for ${fdt(s.confirmed_at)}.`;
    btns = admin ? b('sdone', 'Mark done', 'primary') + b('spropose', 'Reschedule') : '';
  } else info = `Done · ${fdt(s.confirmed_at)}`;
  return `<div class="sched"><div><b>${SCHED[s.type]}</b> ${badge(s.status)}<small>${esc(info)}</small></div><div class="btns">${btns}</div></div>`;
}
function schedActions() {
  const whenField = (d, name, label) => ({ name, label, type: 'datetime-local', required: true, value: (d.when || '').slice(0, 16), attrs: `min="${localInput()}"` });
  Object.assign(actions, {
    sconfirm: (d) => post(`/api/schedules/${d.id}/admin`, { action: 'confirm' }, 'Schedule confirmed.'),
    sdone: (d) => post(`/api/schedules/${d.id}/admin`, { action: 'done' }, 'Schedule marked as done.'),
    spropose: (d) => formModal({
      title: 'Propose another time', submitLabel: 'Send proposal',
      note: 'The customer will see this on their dashboard and can accept it there.',
      fields: [whenField(d, 'proposed_at', 'Proposed date and time'), { name: 'note', label: 'Note to customer (optional)' }],
      onSubmit: async (f) => { await api(`/api/schedules/${d.id}/admin`, 'POST', { action: 'propose', ...f }); toast('Proposal sent to the customer dashboard.'); },
    }),
    saccept: (d) => post(`/api/schedules/${d.id}/respond`, { action: 'accept' }, 'Schedule accepted.'),
    srequest: (d) => formModal({
      title: 'Choose another time', submitLabel: 'Send to mill',
      fields: [whenField(d, 'preferred_at', 'Preferred date and time')],
      onSubmit: async (f) => { await api(`/api/schedules/${d.id}/respond`, 'POST', { action: 'request', ...f }); toast('New preferred time sent to the mill.'); },
    }),
  });
}
function payModal(t) {
  formModal({
    title: `Record payment · ${t.txn_no}`, submitLabel: 'Record payment',
    note: `${esc(t.customer_name)} · balance due <b>${peso(t.balance)}</b>`,
    fields: [
      { name: 'amount', label: 'Amount (₱)', type: 'number', value: t.balance, required: true, attrs: `step="0.01" min="0.01" max="${t.balance}"` },
      { name: 'method', label: 'Payment method', type: 'select', value: t.payment_method, options: [['COD', 'COD (cash)'], ['GCash', 'GCash']] },
      { name: 'reference', label: 'Reference no. (optional)' },
    ],
    onSubmit: async (f) => { await api(`/api/transactions/${t.id}/payments`, 'POST', f); toast('Payment recorded.'); },
  });
}
function txnActions() {
  const sid = (d) => Number(d.id);
  Object.assign(actions, {
    tqueue: (d) => post(`/api/transactions/${sid(d)}/queue`, {}, 'Palay received. Added to the queue.'),
    tstart: (d) => post(`/api/transactions/${sid(d)}/start`, {}, 'Milling started.'),
    tcomplete: async (d) => {
      if (!confirm('Mark this transaction as Completed?\n\nThe SMS notification module is still in development.')) return;
      const r = await api(`/api/transactions/${sid(d)}/complete`, 'POST');
      if (r.sms.status === 'Failed') toast('Completed, but the SMS was not sent. ' + r.sms.detail, 'err');
      else toast(r.sms.status === 'Simulated' ? 'Marked as completed. Sending the SMS is part of the remaining 40%.' : 'Completed. SMS sent to the customer.');
      render();
    },
    trelease: (d) => {
      const t = T.get(sid(d));
      if (t && t.balance > 0 && !confirm(`This transaction still has a balance of ${peso(t.balance)}.\n\nRelease the rice anyway?`)) return;
      return post(`/api/transactions/${sid(d)}/release`, {}, 'Rice released to the customer.');
    },
    tcancel: (d) => { if (confirm('Cancel this milling request?')) return post(`/api/transactions/${sid(d)}/cancel`, {}, 'Request cancelled.'); },
    tsms: async (d) => {
      const r = await api(`/api/transactions/${sid(d)}/sms`, 'POST');
      toast(r.status === 'Failed' ? 'SMS not sent. ' + r.detail : r.status === 'Simulated' ? 'SMS logged in simulation mode.' : 'SMS sent.', r.status === 'Failed' ? 'err' : '');
      render();
    },
    tpay: (d) => payModal(T.get(sid(d))),
    tedit: (d) => {
      const t = T.get(sid(d));
      const chosen = new Set(t.items.map((i) => i.service_id));
      formModal({
        title: `Edit ${t.txn_no}`,
        note: 'Update the actual sacks received and services. Fees are recalculated.',
        fields: [
          { name: 'sacks', label: 'Sacks of palay', type: 'number', value: t.sacks, required: true, attrs: 'min="1" step="1"' },
          { name: 'weight_kg', label: 'Actual weight in kg (optional)', type: 'number', value: t.weight_kg ?? '', attrs: 'min="0" step="0.1"' },
          { name: 'variety', label: 'Palay variety', value: t.variety },
          { name: 'service_ids', label: 'Additional services', type: 'checks', options: S.services.filter((s) => s.kind === 'optional').map((s) => [s.id, `${s.name} (${peso(s.rate)}/${s.unit})`, chosen.has(s.id)]) },
          { name: 'payment_method', label: 'Payment method', type: 'select', value: t.payment_method, options: [['COD', PAYM.COD], ['GCash', PAYM.GCash]] },
          { name: 'notes', label: 'Notes', type: 'textarea', value: t.notes },
        ],
        onSubmit: async (f) => { await api(`/api/transactions/${t.id}`, 'PUT', f); toast('Transaction updated.'); },
      });
    },
  });
}
function adminTxnButtons(t, small) {
  const b = (act, label, cls = '') => `<button class="btn ${small ? 'sm' : ''} ${cls}" data-act="${act}" data-id="${t.id}">${label}</button>`;
  let h = '';
  if (t.status === 'Pending') h += b('tqueue', 'Receive palay and queue', 'primary');
  if (t.status === 'Waiting') h += b('tstart', 'Start milling', 'primary');
  if (t.status === 'In Progress') h += b('tcomplete', 'Mark completed', 'primary');
  if (t.status === 'Completed') h += b('trelease', t.collection_method === 'delivery' ? 'Mark delivered' : 'Release to customer', 'primary');
  if (t.balance > 0 && t.status !== 'Cancelled') h += b('tpay', 'Record payment');
  return h;
}
const txnCols = (admin) => [
  { h: 'Transaction', f: (t) => `<a href="#transaction?id=${t.id}">${esc(t.txn_no)}</a><small>${fdt(t.created_at)}</small>` },
  ...(admin ? [{ h: 'Customer', f: (t) => `${esc(t.customer_name)}<small>${esc(t.customer_mobile)}</small>` }] : []),
  { h: 'Sacks', r: 1, f: (t) => t.sacks },
  { h: 'Status', f: (t) => badge(t.status) },
  { h: 'Queue / ETA', f: (t) => (t.queue ? `${t.queue.position ? '#' + t.queue.position : 'Milling'}<small>${fdt(t.queue.eta)}</small>` : '—') },
  { h: 'Fee', r: 1, f: (t) => peso(t.total_fee) },
  { h: 'Payment', f: (t) => badge(t.payment_status) },
];

function queueRow(t) {
  const livePos = t.status === 'In Progress';
  return `<div class="qrow"><span class="qpos ${livePos ? 'live' : ''}">${livePos ? '●' : t.queue ? t.queue.position : '–'}</span>
    <div class="grow"><a href="#transaction?id=${t.id}">${esc(t.txn_no)}</a> · ${esc(t.customer_name)}<small>${t.sacks} sack(s)${t.queue ? ' · est. completion ' + fdt(t.queue.eta) : ''} · ${badge(t.payment_status)}</small></div>
    <div class="btns">${t.status === 'Waiting' ? `<button class="btn sm" data-act="qmove" data-id="${t.id}" data-dir="up" title="Move up">↑</button><button class="btn sm" data-act="qmove" data-id="${t.id}" data-dir="down" title="Move down">↓</button>` : ''}${adminTxnButtons(t, true)}</div></div>`;
}

/* ---------- payments: GCash (online) or COD ---------- */
const gcashReady = () => !!(S.mill.gcash_number || S.mill.gcash_qr);
// Where the customer sends the money: the mill owner's GCash QR code and/or number.
function gcashBox() {
  const m = S.mill;
  return `<div class="gcash-box">${m.gcash_qr ? `<img src="/api/gcash-qr" alt="GCash QR code of ${esc(m.name)}">` : ''}
    <div><small>Send your GCash payment to</small>
      ${m.gcash_number ? `<b class="gnum">${esc(m.gcash_number)}</b>` : ''}${m.gcash_name ? `<span>${esc(m.gcash_name)}</span>` : ''}
      ${m.gcash_number ? `<button type="button" class="btn sm" data-act="copy" data-text="${esc(m.gcash_number)}">Copy number</button>` : ''}
      ${m.gcash_qr ? '<span class="muted">Or scan the QR code with your GCash app.</span>' : ''}</div></div>`;
}
function gcashModal(t) {
  const open = Math.round((t.balance - t.pending_amount) * 100) / 100;
  formModal({
    title: `Pay with GCash · ${t.txn_no}`, submitLabel: 'Submit payment',
    note: `</p>${gcashBox()}<p class="muted">After sending <b>${peso(open)}</b>, type the reference number from your GCash receipt below. The mill checks it before it is counted as paid.`,
    fields: [
      { name: 'amount', label: 'Amount sent (₱)', type: 'number', value: open, required: true, attrs: `step="0.01" min="0.01" max="${open}"` },
      { name: 'reference', label: 'GCash reference number', required: true, placeholder: 'e.g. 1234567890123' },
    ],
    onSubmit: async (f) => { await api(`/api/transactions/${t.id}/gcash`, 'POST', f); toast('GCash payment submitted. Waiting for the mill to verify it.'); },
  });
}
function payActions() {
  Object.assign(actions, {
    pgcash: (d) => gcashModal(T.get(Number(d.id))),
    pverify: (d) => post(`/api/payments/${d.id}/verify`, { approve: true }, 'GCash payment verified.'),
    preject: (d) => { if (confirm('Reject this GCash payment?\n\nIt will not count toward the balance.')) return post(`/api/payments/${d.id}/verify`, { approve: false }, 'Payment rejected.'); },
  });
}
const verifyButtons = (p) => (p.status === 'Pending'
  ? `<div class="btns"><button class="btn sm primary" data-act="pverify" data-id="${p.id}">Verify</button><button class="btn sm danger" data-act="preject" data-id="${p.id}">Reject</button></div>` : '');

/* =====================================================================================
   5. CUSTOMER SCREENS
   What a customer sees after signing in.
   ===================================================================================== */

/* ---- Screen: dashboard ---- */

// Big "your number in line" panel plus the whole line (positions only, no names).
function queueHero(rows, board) {
  const mine = rows.filter((t) => t.queue).sort((a, b) => a.queue.position - b.queue.position)[0];
  const waiting = board.filter((b) => b.status === 'Waiting').length;
  let hero;
  if (!mine) {
    hero = `<div class="qhero idle"><small>Your number in line</small><b>–</b><p>You have nothing in the queue yet. ${waiting ? `${waiting} transaction(s) are waiting right now.` : 'The line is empty right now.'}</p></div>`;
  } else if (mine.status === 'In Progress') {
    hero = `<div class="qhero"><small>Your number in line</small><b>Now</b><p>Your palay is being milled.<br>Estimated completion: <strong>${fdt(mine.queue.eta)}</strong></p><a href="#transaction?id=${mine.id}">${esc(mine.txn_no)}</a></div>`;
  } else {
    const q = mine.queue;
    hero = `<div class="qhero"><small>Your number in line</small><b>#${q.position}</b>
      <p>${q.ahead ? `${q.ahead} ahead of you` : 'You are next'} · ${q.total} waiting in total<br>Estimated completion: <strong>${fdt(q.eta)}</strong></p><a href="#transaction?id=${mine.id}">${esc(mine.txn_no)}</a></div>`;
  }
  const list = board.map((b) => `<div class="qrow ${b.mine ? 'mine' : ''}"><span class="qpos ${b.position ? '' : 'live'}">${b.position || '●'}</span>
    <div class="grow"><b>${b.mine ? 'You' : 'Another customer'}</b> · ${esc(b.txn_no)}<small>${b.sacks} sack(s) · ${b.position ? 'est. completion ' + fdt(b.eta) : 'now milling'}</small></div>
    ${b.mine ? '<span class="badge green">You</span>' : ''}</div>`).join('');
  return `<div class="grid g2 queue-top">${hero}
    <div class="card flush"><div class="card-head"><h3>The line right now</h3><span class="muted">${waiting} waiting</span></div>${list || empty('No one is in line right now')}<div style="height:6px"></div></div></div>`;
}

function trackCard(t) {
  const [qa, qb] = queueText(t);
  const sched = t.schedules.filter((s) => s.status !== 'Done');
  return `<div class="track">
    <div class="track-top"><div><h3>${esc(t.txn_no)} ${badge(t.status)}</h3><span class="muted">${t.sacks} sack(s)${t.variety ? ' · ' + esc(t.variety) : ''} · requested ${fdt(t.created_at)}</span></div>
      <a class="btn sm" href="#transaction?id=${t.id}">View details</a></div>
    ${stepper(t.status)}
    <div class="facts">
      <div class="fact"><small>Queue</small><b>${esc(qa)}</b><div class="muted">${esc(qb)}</div></div>
      <div class="fact"><small>Estimated completion</small><b>${esc(etaText(t))}</b></div>
      <div class="fact"><small>Fees</small><b class="num">${peso(t.total_fee)}</b></div>
      <div class="fact"><small>Payment</small><b>${badge(t.payment_status)}</b><div class="muted">${t.balance > 0 ? peso(t.balance) + ' due' : 'Fully paid'}</div></div>
    </div>
    ${sched.length ? `<div style="margin-top:16px">${sched.map((s) => schedBox(s, false)).join('')}</div>` : ''}</div>`;
}
async function userDash() {
  const [rows, board] = await Promise.all([api('/api/transactions'), api('/api/queue-board')]);
  remember(rows);
  schedActions();
  const active = rows.filter((t) => !['Released', 'Cancelled'].includes(t.status));
  const past = rows.filter((t) => ['Released', 'Cancelled'].includes(t.status)).slice(0, 5);
  const due = rows.filter((t) => t.status !== 'Cancelled').reduce((s, t) => s + t.balance, 0);
  const proposals = active.filter((t) => t.schedules.some((s) => s.status === 'Proposed')).length;
  const ready = active.filter((t) => t.status === 'Completed').length;
  return page(`Hello, ${S.user.name.split(' ')[0]}`, 'Here is where your rice is right now.', `<a class="btn primary" href="#new-request">${ic('plus')}New milling request</a>`, `
    ${S.user.mobile_confirmed ? '' : `<div class="notice gold"><span>Your mobile number <b>${esc(S.user.mobile)}</b> is waiting to be confirmed by the mill. The completion SMS is only sent to confirmed numbers. You can still track everything here.</span></div>`}
    ${ready ? `<div class="notice green"><span><b>${ready} transaction${ready > 1 ? 's are' : ' is'} ready.</b> Milling is completed. You can also sell some of your rice to the mill or buy more.</span><a class="btn sm" href="#market">Buy &amp; Sell</a></div>` : ''}
    ${proposals ? `<div class="notice gold"><span><b>Action needed:</b> the mill proposed a different schedule. Review it below.</span></div>` : ''}
    ${queueHero(rows, board)}
    <div class="tiles">
      <div class="tile accent"><small>Active requests</small><b>${active.length}</b><span>${active.filter((t) => t.status === 'In Progress').length} being milled now</span></div>
      <div class="tile"><small>Balance due</small><b>${peso(due)}</b><span>Across all transactions</span></div>
      <div class="tile"><small>Completed</small><b>${rows.filter((t) => ['Completed', 'Released'].includes(t.status)).length}</b><span>All time</span></div>
    </div>
    <div style="margin-top:18px">${active.map(trackCard).join('') || `<div class="card">${empty('No active milling requests', 'Create a request and follow it here from queue to completion.')}</div>`}</div>
    <div style="margin-top:18px">${locationCard()}</div>
    ${past.length ? `<div class="card flush" style="margin-top:18px"><div class="card-head"><h3>Recent history</h3><a href="#requests">View all</a></div>${table(txnCols(false), past)}</div>` : ''}`);
}

ROUTES['dashboard'] = { role: 'user', nav: 'dashboard', view: userDash, poll: true };

/* ---- Screen: requests ---- */

async function userRequests() {
  const rows = remember(await api('/api/transactions'));
  return page('My requests', 'Every milling transaction on your account.', `<a class="btn primary" href="#new-request">${ic('plus')}New request</a>`,
    `<div class="card flush">${table(txnCols(false), rows, empty('No requests yet', 'Your milling requests will appear here.'))}</div>`);
}

ROUTES['requests'] = { role: 'user', nav: 'requests', view: userRequests, poll: true };

/* ---- Screen: new-request ---- */

async function viewNew() {
  const admin = isAdmin();
  const customers = admin ? (await api('/api/customers')).filter((c) => c.active) : [];
  const opt = S.services.filter((s) => s.kind === 'optional');
  after = () => {
    const f = $('#reqForm');
    const upd = () => {
      const d = formData(f);
      const pickup = d.entry_method === 'pickup'; const delivery = d.collection_method === 'delivery';
      $('#entryLabel').textContent = pickup ? 'Preferred pickup date and time' : 'Preferred drop-off date and time';
      $('#delWrap').hidden = !delivery; f.elements.delivery_at.required = delivery;
      $('#addrWrap').hidden = !(pickup || delivery);
      const sacks = Math.max(0, parseInt(d.sacks, 10) || 0);
      let total = 0;
      const lines = S.services.filter((s) => s.kind === 'core' || (s.kind === 'optional' && (d.service_ids || []).includes(String(s.id))) ||
        (s.kind === 'pickup' && pickup) || (s.kind === 'delivery' && delivery)).map((s) => {
        const amt = (s.unit === 'sack' ? sacks : 1) * s.rate; total += amt;
        return `<dt>${esc(s.name)}<br><small class="muted">${s.unit === 'sack' ? `${sacks} × ${peso(s.rate)}` : 'Flat fee'}</small></dt><dd class="num">${peso(amt)}</dd>`;
      });
      $('#est').innerHTML = `<dl class="kv">${lines.join('')}</dl><div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px"><dl class="kv"><dt><b>Estimated total</b></dt><dd class="num" style="font-size:20px">${peso(total)}</dd></dl></div>`;
    };
    f.addEventListener('input', upd);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('.btn.primary', f);
      btn.disabled = true;
      try {
        const t = await api('/api/transactions', 'POST', formData(f));
        toast(`Request ${t.txn_no} created.`);
        location.hash = '#transaction?id=' + t.id;
      } catch (err) { $('.form-err', f).textContent = err.message; btn.disabled = false; }
    });
    upd();
  };
  const min = admin ? '' : `min="${localInput()}"`;
  return page('New milling request', admin ? 'Create a request for a walk-in or phone-in customer.' : 'Tell the mill what you are bringing and when.', '', `
    <form id="reqForm" class="grid g21">
      <div class="card">
        ${admin ? field({ name: 'customer_id', label: 'Customer', type: 'select', required: true, options: [['', 'Select a customer…'], ...customers.map((c) => [c.id, `${c.name} · ${c.mobile}`])], hint: 'Not listed? Register them first under Customers.' }) : ''}
        <div class="two">
          ${field({ name: 'sacks', label: 'Sacks of palay', type: 'number', value: 10, required: true, attrs: 'min="1" max="2000" step="1"' })}
          ${field({ name: 'variety', label: 'Palay variety (optional)', placeholder: 'e.g. RC 222' })}
        </div>
        ${opt.length ? field({ name: 'service_ids', label: 'Additional services', type: 'checks', options: opt.map((s) => [s.id, `${s.name} · ${peso(s.rate)} per ${s.unit === 'sack' ? 'sack' : 'request'}`]) }) : ''}
        <div class="field"><span>How will the palay get to the mill?</span></div>
        <div class="choice">
          <label><input type="radio" name="entry_method" value="dropoff" checked><b>I will drop it off</b><span>Bring the palay to the mill.</span></label>
          <label><input type="radio" name="entry_method" value="pickup"><b>Mill picks it up</b><span>The mill collects it from the address.</span></label>
        </div>
        <label class="field"><span id="entryLabel">Preferred date and time</span><input type="datetime-local" name="entry_at" required ${min} value="${admin ? localInput() : ''}"><small>The mill confirms this time or proposes another.</small></label>
        ${admin ? field({ name: 'queue_now', type: 'checkbox', label: 'The palay is already at the mill. Add this transaction to the queue now.' }) : ''}
        <div class="field" style="margin-top:14px"><span>How will the finished rice be collected?</span></div>
        <div class="choice">
          <label><input type="radio" name="collection_method" value="pickup" checked><b>Pick up at the mill</b><span>Come after the completion SMS.</span></label>
          <label><input type="radio" name="collection_method" value="delivery"><b>Deliver it</b><span>The mill delivers to the address.</span></label>
        </div>
        <div id="delWrap" hidden>${field({ name: 'delivery_at', label: 'Preferred delivery date and time', type: 'datetime-local', attrs: min })}</div>
        <div id="addrWrap" hidden>${field({ name: 'address', label: 'Pickup / delivery address', value: admin ? '' : S.user.address, hint: admin ? 'Leave blank to use the address on the customer record.' : '' })}</div>
        <div class="field"><span>How will you pay?</span></div>
        <div class="choice">
          <label><input type="radio" name="payment_method" value="COD" checked><b>COD</b><span>Pay cash on pickup or delivery.</span></label>
          <label><input type="radio" name="payment_method" value="GCash"><b>GCash (online)</b><span>Send by GCash, then submit the reference number.</span></label>
        </div>
        ${field({ name: 'notes', label: 'Notes for the mill (optional)', type: 'textarea' })}
        <div class="form-err"></div>
        <button class="btn primary">Submit request</button>
      </div>
      <div class="card"><h3>Fee estimate</h3><div id="est"></div><p class="muted" style="margin-top:14px">Final fees follow the actual number of sacks received at the mill.</p></div>
    </form>`);
}

ROUTES['new-request'] = { role: 'any', nav: 'new-request', view: viewNew };

/* ---- Screen: transaction ---- */

function paymentCard(t, admin) {
  let body = `<p>Method: <b>${PAYM[t.payment_method]}</b></p>`;
  if (t.pending_amount > 0) body += `<div class="notice gold" style="margin:12px 0 0"><span>${peso(t.pending_amount)} sent by GCash is waiting for the mill to verify.</span></div>`;
  const open = t.balance - t.pending_amount;
  if (t.status === 'Cancelled') return `<div class="card"><h3>Payment</h3>${body}</div>`;
  if (open <= 0.001) {
    body += `<p class="muted" style="margin-top:10px">${t.balance > 0 ? 'Nothing more to pay once the GCash payment is verified.' : 'This transaction is fully paid.'}</p>`;
  } else if (admin) {
    body += `<p class="muted" style="margin-top:10px">Balance due: ${peso(t.balance)}. Record COD cash here, or verify a GCash payment the customer submits.</p>`;
  } else {
    body += `<p class="muted" style="margin-top:10px"><b>COD:</b> pay ${peso(open)} in cash when you ${t.collection_method === 'delivery' ? 'receive the delivery' : 'pick up your rice'}.</p>`;
    body += gcashReady()
      ? `<p class="muted" style="margin-top:8px"><b>GCash:</b> pay ${peso(open)} to the mill owner's account below, then submit your reference number.</p>
         ${gcashBox()}
         <div class="btns" style="margin-top:12px"><button class="btn primary" data-act="pgcash" data-id="${t.id}">Pay with GCash</button></div>`
      : `<p class="muted" style="margin-top:8px"><b>GCash:</b> the mill has not posted its GCash number yet. Please pay COD or ask the mill.</p>`;
  }
  return `<div class="card"><h3>Payment</h3>${body}</div>`;
}

async function viewTxn() {
  const t = await api('/api/transactions/' + Number(param('id')));
  remember([t]);
  const admin = isAdmin();
  schedActions(); txnActions(); payActions();
  const [qa, qb] = queueText(t);
  const btns = admin
    ? adminTxnButtons(t) + (['Released', 'Cancelled'].includes(t.status) ? '' : `<button class="btn" data-act="tedit" data-id="${t.id}">Edit</button>`) +
      (['Pending', 'Waiting'].includes(t.status) && !t.paid ? `<button class="btn danger" data-act="tcancel" data-id="${t.id}">Cancel</button>` : '')
    : (t.status === 'Pending' && !t.paid ? `<button class="btn danger" data-act="tcancel" data-id="${t.id}">Cancel request</button>` : '');
  const smsCard = () => {
    if (!['Completed', 'Released'].includes(t.status)) return `<p class="muted">One SMS is sent to ${esc(t.customer_mobile)} when milling is completed.</p>`;
    if (!t.sms) return `<p class="muted">No SMS attempt recorded.</p>${admin ? `<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="tsms" data-id="${t.id}">Send SMS</button></div>` : ''}`;
    return `<p>${badge(t.sms.status)} <span class="muted">${fdt(t.sms.created_at)}</span></p>${admin ? `<p class="muted" style="margin-top:6px">${esc(t.sms.detail)}</p>` : ''}
      ${admin && t.sms.status !== 'Sent' ? `<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="tsms" data-id="${t.id}">Retry SMS</button></div>` : ''}`;
  };
  return page(t.txn_no, admin ? `${t.customer_name} · ${t.customer_mobile}` : 'Milling transaction', btns, `
    ${admin && !t.mobile_confirmed ? `<div class="notice gold"><span>This customer's mobile number is not confirmed yet, so the completion SMS will not be sent.</span><a class="btn sm" href="#customers">Review customers</a></div>` : ''}
    <div class="card">${stepper(t.status)}
      <div class="facts">
        <div class="fact"><small>Queue</small><b>${esc(qa)}</b><div class="muted">${esc(qb)}</div></div>
        <div class="fact"><small>Estimated completion</small><b>${esc(etaText(t))}</b></div>
        <div class="fact"><small>Total fee</small><b>${peso(t.total_fee)}</b></div>
        <div class="fact"><small>Payment</small><b>${badge(t.payment_status)}</b><div class="muted">${t.balance > 0 ? peso(t.balance) + ' due' : 'Fully paid'}</div></div>
      </div></div>
    <div class="grid g21">
      <div class="stack">
        <div class="card flush"><div class="card-head"><h3>Services and fees</h3></div>
          ${table([{ h: 'Service', f: (i) => esc(i.name) }, { h: 'Qty', r: 1, f: (i) => `${i.qty} ${i.unit === 'sack' ? 'sack(s)' : ''}` }, { h: 'Rate', r: 1, f: (i) => peso(i.rate) }, { h: 'Amount', r: 1, f: (i) => peso(i.amount) }], t.items)}
          <div style="padding:14px 20px;border-top:1px solid var(--line)"><dl class="kv">
            <dt>Total</dt><dd class="num">${peso(t.total_fee)}</dd><dt>Paid</dt><dd class="num">${peso(t.paid)}</dd><dt>Balance</dt><dd class="num">${peso(t.balance)}</dd></dl></div></div>
        <div class="card"><h3>Schedules</h3>${t.schedules.map((s) => schedBox(s, admin)).join('') || '<p class="muted">No schedules for this transaction.</p>'}
          ${t.collection_method === 'pickup' ? '<p class="muted" style="margin-top:12px">Finished rice is picked up at the mill any time after the completion SMS.</p>' : ''}</div>
        <div class="card flush"><div class="card-head"><h3>Payments</h3></div>
          ${table([{ h: 'Date', f: (p) => fdt(p.created_at) }, { h: 'Method', f: (p) => esc(p.method) }, { h: 'Reference', f: (p) => esc(p.reference || '—') }, { h: 'Status', f: (p) => badge(p.status) }, { h: 'Amount', r: 1, f: (p) => peso(p.amount) }, ...(admin ? [{ h: '', f: verifyButtons }] : [])], t.payments, empty('No payments recorded yet'))}</div>
      </div>
      <div class="stack">
        <div class="card"><h3>Details</h3><dl class="kv">
          <dt>Sacks / batch</dt><dd>${t.sacks} sack(s)${t.weight_kg ? ` · ${t.weight_kg} kg` : ''}</dd>
          <dt>Variety</dt><dd>${esc(t.variety || '—')}</dd>
          <dt>Palay entry</dt><dd>${ENTRY[t.entry_method]}</dd>
          <dt>Rice collection</dt><dd>${COLLECT[t.collection_method]}</dd>
          <dt>Payment method</dt><dd>${PAYM[t.payment_method]}</dd>
          ${t.address ? `<dt>Address</dt><dd>${esc(t.address)}</dd>` : ''}
          <dt>Requested</dt><dd>${fdt(t.created_at)}</dd>
          ${t.started_at ? `<dt>Milling started</dt><dd>${fdt(t.started_at)}</dd>` : ''}
          ${t.completed_at ? `<dt>Completed</dt><dd>${fdt(t.completed_at)}</dd>` : ''}
          ${t.released_at ? `<dt>Released</dt><dd>${fdt(t.released_at)}</dd>` : ''}
        </dl>${t.notes ? `<p class="muted" style="margin-top:12px">Notes: ${esc(t.notes)}</p>` : ''}</div>
        ${paymentCard(t, admin)}
        <div class="card"><h3>Completion SMS</h3><p><span class="badge gold">In development</span></p><p class="muted" style="margin-top:8px">In the finished system one SMS is sent to ${esc(t.customer_mobile)} when milling is completed.</p></div>
      </div>
    </div>`);
}

ROUTES['transaction'] = { role: 'any', nav: () => (isAdmin() ? 'transactions' : 'requests'), view: viewTxn, poll: true };

/* ---- Screen: profile ---- */

async function viewProfile() {
  const u = S.user;
  after = () => $('#profForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('.form-err', e.target);
    try {
      const r = await api('/api/me', 'PUT', formData(e.target));
      S.user = r.user;
      toast(r.mobile_changed ? 'Profile saved. Your new number needs to be confirmed by the mill.' : 'Profile saved.');
      render();
    } catch (ex) { err.textContent = ex.message; }
  });
  return page('Profile', 'Keep your contact details up to date.', '', `<form id="profForm" class="card" style="max-width:620px">
    <p style="margin-bottom:14px">Mobile number status: ${u.mobile_confirmed ? badge('Confirmed') : '<span class="badge gold">Awaiting confirmation</span>'}</p>
    ${field({ name: 'name', label: 'Full name', value: u.name, required: true })}
    <div class="two">${field({ name: 'mobile', label: 'Mobile number', type: 'tel', value: u.mobile, required: true, hint: 'Changing this resets confirmation.' })}
    ${field({ name: 'email', label: 'Email (optional)', type: 'email', value: u.email })}</div>
    ${field({ name: 'address', label: 'Address', value: u.address })}
    <div class="two">${field({ name: 'current_password', label: 'Current password', type: 'password', attrs: 'autocomplete="current-password"' })}
    ${field({ name: 'new_password', label: 'New password', type: 'password', attrs: 'autocomplete="new-password"', hint: 'Leave blank to keep your password.' })}</div>
    <div class="form-err"></div><button class="btn primary">Save changes</button></form>`);
}

ROUTES['profile'] = { role: 'any', nav: 'profile', view: viewProfile };

/* =====================================================================================
   6. ADMIN SCREENS
   What the mill owner and staff see after signing in.
   ===================================================================================== */

/* ---- Screen: admin-dashboard ---- */

async function adminDash() {
  const [d, rows] = await Promise.all([api('/api/dashboard'), api('/api/transactions')]);
  remember(rows); txnActions();
  const c = d.counts;
  const live = rows.filter((t) => t.status === 'In Progress');
  const waiting = rows.filter((t) => t.status === 'Waiting').sort((a, b) => a.queue.position - b.queue.position);
  const todo = [
    [d.sched_pending, 'schedule request(s) awaiting confirmation', '#schedules'],
    [c.Pending || 0, 'request(s) waiting for palay to arrive', '#queue'],
    [c.Completed || 0, 'completed transaction(s) awaiting release', '#queue'],
    [d.gcash_pending, 'GCash payment(s) to verify', '#payments'],
    [d.orders_open, 'customer buy or sell order(s) to handle', '#trade'],
    [d.unconfirmed, 'customer number(s) to confirm', '#customers'],
    [d.sms_failed, 'failed SMS notification(s)', '#sms'],
    [d.low_stock, 'inventory item(s) at or below reorder level', '#inventory'],
  ].filter((x) => x[0] > 0);
  return page('Dashboard', new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }), `<a class="btn primary" href="#new-request">${ic('plus')}New request</a>`, `
    <div class="tiles">
      <div class="tile accent"><small>In queue</small><b>${(c.Waiting || 0) + (c['In Progress'] || 0)}</b><span>${c['In Progress'] || 0} milling · ${c.Waiting || 0} waiting</span></div>
      <div class="tile"><small>Collected today</small><b>${peso(d.today_collections)}</b><span>Milling fee payments</span></div>
      <div class="tile"><small>Sacks milled today</small><b>${d.sacks_today}</b><span>Completed today</span></div>
      <div class="tile"><small>Unpaid balances</small><b>${peso(d.outstanding)}</b><span>All open transactions</span></div>
    </div>
    <div class="grid g21">
      <div class="card flush"><div class="card-head"><h3>Live queue</h3><a href="#queue">Manage queue</a></div>
        ${[...live, ...waiting].slice(0, 6).map(queueRow).join('') || empty('The queue is empty', 'Received palay shows up here.')}<div style="height:6px"></div></div>
      <div class="card"><h3>Needs attention</h3>${todo.map(([n, l, h]) => `<div class="todo"><span><b>${n}</b> ${l}</span><a href="${h}">Open</a></div>`).join('') || '<p class="muted">All caught up.</p>'}</div>
    </div>
    ${progressCard()}
    <div class="card flush"><div class="card-head"><h3>Recent transactions</h3><a href="#transactions">View all</a></div>${table(txnCols(true), rows.slice(0, 6))}</div>`);
}

ROUTES['admin-dashboard'] = { role: 'admin', nav: 'admin-dashboard', view: adminDash, poll: true };

/* ---- Screen: queue ---- */

async function viewQueue() {
  const rows = remember(await api('/api/transactions'));
  txnActions();
  actions.qmove = (d) => post(`/api/transactions/${d.id}/move`, { dir: d.dir });
  const by = (s) => rows.filter((t) => t.status === s);
  const waiting = by('Waiting').sort((a, b) => a.queue.position - b.queue.position);
  const sec = (title, sub, list, emptyMsg) => `<div class="card flush"><div class="card-head"><h3>${title} <span class="muted">(${list.length})</span></h3><span class="muted">${sub}</span></div>${list.map(queueRow).join('') || empty(emptyMsg)}<div style="height:6px"></div></div>`;
  return page('Queue', 'Move transactions from intake to milling to release.', `<a class="btn primary" href="#new-request">${ic('plus')}New request</a>`,
    sec('Now milling', 'Mark completed when milling is finished', by('In Progress'), 'Nothing is being milled right now') +
    sec('Waiting', 'First in line is milled next', waiting, 'No transactions are waiting') +
    sec('Awaiting palay', 'Requests not yet received at the mill', by('Pending').reverse(), 'No pending requests') +
    sec('Completed, awaiting release', 'Ready for pickup or delivery', by('Completed'), 'Nothing is waiting for release'));
}

ROUTES['queue'] = { role: 'admin', nav: 'queue', view: viewQueue, poll: true };

/* ---- Screen: transactions ---- */

const F = { status: 'All', q: '' };
async function viewTransactions() {
  const rows = remember(await api('/api/transactions'));
  const draw = () => {
    const ql = F.q.toLowerCase();
    const list = rows.filter((t) => (F.status === 'All' || t.status === F.status || (F.status === 'Unpaid' && t.balance > 0 && t.status !== 'Cancelled')) &&
      (!ql || (t.txn_no + ' ' + t.customer_name + ' ' + t.customer_mobile).toLowerCase().includes(ql)));
    $('#txnList').innerHTML = table(txnCols(true), list, empty('No matching transactions'));
    document.querySelectorAll('#txnTabs button').forEach((b) => b.classList.toggle('on', b.dataset.s === F.status));
  };
  after = () => { draw(); $('#txnSearch').addEventListener('input', (e) => { F.q = e.target.value; draw(); }); };
  actions.tab = (d) => { F.status = d.s; draw(); };
  return page('Transactions', 'Every milling transaction and its status.', `<a class="btn primary" href="#new-request">${ic('plus')}New request</a>`, `
    <div class="toolbar"><div class="tabs" id="txnTabs">${['All', 'Pending', 'Waiting', 'In Progress', 'Completed', 'Released', 'Cancelled', 'Unpaid'].map((s) => `<button data-act="tab" data-s="${s}">${s}</button>`).join('')}</div>
      <input type="search" id="txnSearch" placeholder="Search number, name or mobile" value="${esc(F.q)}"></div>
    <div class="card flush" id="txnList"></div>`);
}

ROUTES['transactions'] = { role: 'admin', nav: 'transactions', view: viewTransactions };

/* ---- Screen: schedules ---- */

async function viewSchedules() {
  const rows = await api('/api/schedules');
  schedActions();
  const open = rows.filter((s) => s.status !== 'Done');
  const cols = [
    { h: 'When', f: (s) => `${fdt(s.confirmed_at || s.proposed_at || s.preferred_at)}<small>${s.status === 'Proposed' ? 'Proposed; customer asked ' + fdt(s.preferred_at) : s.status === 'Requested' ? 'Customer preference' : ''}</small>` },
    { h: 'Type', f: (s) => SCHED[s.type] },
    { h: 'Customer', f: (s) => `${esc(s.customer_name)}<small>${esc(s.customer_mobile)}</small>` },
    { h: 'Transaction', f: (s) => `<a href="#transaction?id=${s.txn_id}">${esc(s.txn_no)}</a><small>${s.sacks} sack(s)</small>` },
    { h: 'Address', f: (s) => (s.type === 'dropoff' ? '<span class="muted">At the mill</span>' : esc(s.address || '—')) },
    { h: 'Status', f: (s) => badge(s.status) },
    { h: '', f: (s) => {
      const b = (act, label, cls = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${s.id}" data-when="${esc(s.confirmed_at || s.proposed_at || s.preferred_at)}">${label}</button>`;
      return `<div class="btns">${s.status === 'Requested' ? b('sconfirm', 'Confirm', 'primary') : ''}${s.status === 'Confirmed' ? b('sdone', 'Done', 'primary') : ''}${s.status !== 'Done' ? b('spropose', s.status === 'Confirmed' ? 'Reschedule' : 'Propose time') : ''}</div>`;
    } },
  ];
  return page('Schedules', 'Confirm customer-preferred times or propose another.', '', `
    <div class="card flush"><div class="card-head"><h3>Open schedules</h3></div>${table(cols, open, empty('No open schedules', 'Pickup, drop-off and delivery requests appear here.'))}</div>
    <div class="card flush"><div class="card-head"><h3>Done</h3></div>${table(cols.slice(0, 6), rows.filter((s) => s.status === 'Done').slice(-15).reverse(), empty('No finished schedules yet'))}</div>`);
}

ROUTES['schedules'] = { role: 'admin', nav: 'schedules', view: viewSchedules };

/* ---- Screen: customers ---- */

async function viewCustomers() {
  const rows = await api('/api/customers');
  const byId = new Map(rows.map((c) => [String(c.id), c]));
  const showTemp = (pw, name) => () => infoModal('Temporary password', `Give this to ${esc(name)} so they can sign in and track their transactions. It is shown only once.<br><br><b style="font-size:22px;letter-spacing:.08em;color:var(--ink)">${esc(pw)}</b>`);
  Object.assign(actions, {
    cconfirm: (d) => post(`/api/customers/${d.id}/confirm`, { confirmed: d.on === '1' }, d.on === '1' ? 'Mobile number confirmed.' : 'Confirmation removed.'),
    cadd: () => formModal({
      title: 'Register customer', submitLabel: 'Register',
      note: 'The number is checked for format and duplicates. No verification SMS is sent.',
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'mobile', label: 'Mobile number', type: 'tel', required: true, placeholder: '0917 123 4567' },
        { name: 'address', label: 'Address' },
        { name: 'confirmed', type: 'checkbox', value: true, label: 'I checked this number with the customer. Mark it as confirmed.' },
      ],
      onSubmit: async (f) => { const r = await api('/api/customers', 'POST', f); toast('Customer registered.'); return r.temp_password ? showTemp(r.temp_password, f.name) : null; },
    }),
    cedit: (d) => {
      const c = byId.get(d.id);
      formModal({
        title: 'Edit customer',
        fields: [
          { name: 'name', label: 'Full name', value: c.name, required: true },
          { name: 'mobile', label: 'Mobile number', type: 'tel', value: c.mobile, required: true, hint: 'Changing the number resets its confirmation.' },
          { name: 'email', label: 'Email', type: 'email', value: c.email },
          { name: 'address', label: 'Address', value: c.address },
          { name: 'active', type: 'checkbox', value: c.active, label: 'Account is active (can sign in)' },
          { name: 'reset_password', type: 'checkbox', label: 'Reset password and show a new temporary one' },
        ],
        onSubmit: async (f) => { const r = await api(`/api/customers/${c.id}`, 'PUT', f); toast('Customer updated.'); return r.temp_password ? showTemp(r.temp_password, f.name) : null; },
      });
    },
  });
  return page('Customers', 'Customer records and contact confirmation.', `<button class="btn primary" data-act="cadd">${ic('plus')}Register customer</button>`, `
    <div class="card flush">${table([
      { h: 'Customer', f: (c) => `<b>${esc(c.name)}</b>${c.active ? '' : ' <span class="badge red">Inactive</span>'}<small>Since ${fd(c.created_at)}</small>` },
      { h: 'Mobile', f: (c) => `${esc(c.mobile)}<small>${c.mobile_confirmed ? '<span class="badge green">Confirmed</span>' : '<span class="badge gold">Not confirmed</span>'}</small>` },
      { h: 'Address', f: (c) => esc(c.address || '—') },
      { h: 'Transactions', r: 1, f: (c) => c.txn_count },
      { h: 'Balance', r: 1, f: (c) => peso(c.balance) },
      { h: '', f: (c) => `<div class="btns">${c.mobile_confirmed ? `<button class="btn sm" data-act="cconfirm" data-id="${c.id}" data-on="0">Unconfirm</button>` : `<button class="btn sm primary" data-act="cconfirm" data-id="${c.id}" data-on="1">Confirm number</button>`}<button class="btn sm" data-act="cedit" data-id="${c.id}">Edit</button></div>` },
    ], rows, empty('No customers yet', 'Register a walk-in customer or let customers sign up online.'))}</div>`);
}

ROUTES['customers'] = { role: 'admin', nav: 'customers', view: viewCustomers };

/* ---- Screen: payments ---- */

function pendingCard(pending) {
  if (!pending.length) return '';
  return `<div class="card flush"><div class="card-head"><h3>GCash payments to verify <span class="muted">(${pending.length})</span></h3><span class="muted">Check each reference number in the mill's GCash before verifying.</span></div>${table([
    { h: 'Submitted', f: (p) => fdt(p.created_at) }, { h: 'Transaction', f: (p) => `<a href="#transaction?id=${p.txn_id}">${esc(p.txn_no)}</a>` }, { h: 'Customer', f: (p) => esc(p.customer_name) },
    { h: 'GCash reference', f: (p) => `<b>${esc(p.reference)}</b>` }, { h: 'Amount', r: 1, f: (p) => peso(p.amount) }, { h: '', f: verifyButtons },
  ], pending)}</div>`;
}

async function viewPayments() {
  const [pays, rows] = await Promise.all([api('/api/payments'), api('/api/transactions')]);
  remember(rows);
  const owing = rows.filter((t) => t.balance > 0 && t.status !== 'Cancelled');
  actions.tpay = (d) => payModal(T.get(Number(d.id)));
  payActions();
  const pending = pays.filter((p) => p.status === 'Pending');
  const today = pays.filter((p) => p.status === 'Verified' && p.created_at.slice(0, 10) === todayStr()).reduce((s, p) => s + p.amount, 0);
  return page('Fees & Payments', 'Outstanding balances and payment records.', '', `
    <div class="tiles">
      <div class="tile accent"><small>Collected today</small><b>${peso(today)}</b><span>${fd(todayStr())}</span></div>
      <div class="tile"><small>Outstanding</small><b>${peso(owing.reduce((s, t) => s + t.balance, 0))}</b><span>${owing.length} transaction(s)</span></div>
    </div>
    ${pendingCard(pending)}
    <div class="card flush"><div class="card-head"><h3>Outstanding balances</h3></div>${table([
      { h: 'Transaction', f: (t) => `<a href="#transaction?id=${t.id}">${esc(t.txn_no)}</a>` }, { h: 'Customer', f: (t) => esc(t.customer_name) }, { h: 'Status', f: (t) => badge(t.status) },
      { h: 'Fee', r: 1, f: (t) => peso(t.total_fee) }, { h: 'Paid', r: 1, f: (t) => peso(t.paid) }, { h: 'Balance', r: 1, f: (t) => `<b>${peso(t.balance)}</b>` },
      { h: '', f: (t) => `<button class="btn sm primary" data-act="tpay" data-id="${t.id}">Record payment</button>` },
    ], owing, empty('No outstanding balances'))}</div>
    <div class="card flush"><div class="card-head"><h3>Payment records</h3></div>${table([
      { h: 'Date', f: (p) => fdt(p.created_at) }, { h: 'Transaction', f: (p) => `<a href="#transaction?id=${p.txn_id}">${esc(p.txn_no)}</a>` }, { h: 'Customer', f: (p) => esc(p.customer_name) },
      { h: 'Method', f: (p) => esc(p.method) + (p.reference ? `<small>${esc(p.reference)}</small>` : '') }, { h: 'Received by', f: (p) => esc(p.received_by_name || '—') }, { h: 'Status', f: (p) => badge(p.status) }, { h: 'Amount', r: 1, f: (p) => peso(p.amount) },
    ], pays, empty('No payments recorded yet'))}</div>`);
}

ROUTES['payments'] = { role: 'admin', nav: 'payments', view: viewPayments };

/* =====================================================================================
   7. START
   Connect the login forms, then show the right screen.
   ===================================================================================== */

authForm('#loginForm', '/api/login', { portal: 'user' });
authForm('#adminLoginForm', '/api/login', { portal: 'admin' });
authForm('#registerForm', '/api/register', {});
window.addEventListener('hashchange', go);
// Live screens (dashboard, queue, tracking) refresh themselves every 10 seconds.
setInterval(() => { if (PAGE && PAGE.poll && !$('.modal-bg') && !document.hidden) render(true); }, 10000);
// Another tab changed the data (for example the Admin tab moved the queue): refresh this tab.
window.addEventListener('storage', (e) => { if (e.key === DB_KEY && PAGE && !$('.modal-bg')) render(true); });
go();
