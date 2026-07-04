// ══════════════════════════════════════════════════════════════
//  TutorOS — Invoices module (admin)
//
//  A LEDGER + workflow layer over payments that happen elsewhere (bank
//  transfer, card machine, cash). No money flows through the system.
//
//  Data model (see mocks/invoices.mock.jsx):
//    Invoice { id, number, familyId, studentIds[], classes[], issuedDate,
//              payments[] }  — total + status are DERIVED, never stored.
//    ScheduledPayment { id, dueDate, amount, paidAt|null, paidBy|null, method|null }
//    ReminderLog { id, invoiceId, sentAt, toEmail }            (append-only)
//    AuditEvent  { id, invoiceId, paymentId, action, actor, at, meta }  (append-only)
//
//  Status is computed every render from the schedule:
//    paid       — every payment has paidAt
//    overdue    — any unpaid payment's dueDate < today
//    partial    — some (not all) payments paid, none overdue
//    scheduled  — nothing paid yet, nothing overdue
//
//  Reuses the shared design system (DS, Card, KPICard, Btn, Modal, Badge…)
//  and keeps the purple/light look. Exposes AdminInvoicesPage on window;
//  AdminPages.jsx's router renders it for the `invoices` route.
// ══════════════════════════════════════════════════════════════

const INVOICES_KEY = 'tutoros.invoices.v1';
const INV_ACTOR = 'Lisa Chen';           // current admin (matches sidebar identity)
const INV_TENANT = 'centre-001';         // current centre. Numbers are allocated + matched per tenant;
                                         // two centres may share INV-0284 — all matching is tenant-scoped.
const INV_METHODS = ['cash', 'card', 'bank', 'cheque'];
const INV_METHOD_LABEL = { cash:'Cash', card:'Card machine', bank:'Bank transfer', cheque:'Cheque' };

// One-time slide-in keyframe for the detail drawer.
if (typeof document !== 'undefined' && !document.getElementById('inv-styles')) {
  const s = document.createElement('style');
  s.id = 'inv-styles';
  s.textContent = '@keyframes inv-slide{from{transform:translateX(28px);opacity:0}to{transform:none;opacity:1}}';
  document.head.appendChild(s);
}

// ─── Pure helpers ────────────────────────────────────────────────────────────
const invTodayISO = () => { const d = new Date(); d.setHours(12,0,0,0); return d.toISOString().slice(0,10); };
const invUID = (p='id') => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

const invMoney = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('en-GB', { style:'currency', currency:'GBP', minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
};
const invDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
const invDateShort = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—';
const invStampFull = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const invDaysBetween = (aISO, bISO) => Math.round((new Date(bISO + (bISO.length === 10 ? 'T00:00:00' : '')) - new Date(aISO + (aISO.length === 10 ? 'T00:00:00' : ''))) / 86400000);
const invHoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000;
const invAgo = (iso) => {
  const h = invHoursSince(iso);
  if (h < 1) return 'just now';
  if (h < 24) return Math.round(h) + 'h ago';
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : d + ' days ago';
};
const invAddMonths = (iso, m) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
const invStudentName = (id) => {
  const s = (window.SEED_STUDENTS || []).find(x => x.id === id);
  return s ? `${s.firstName} ${s.lastName}` : id;
};

// Invoice numbering. A number is `INV-####` derived from a per-tenant sequence
// counter. The counter only ever advances (atomic on issue) so numbers are
// sequential, immutable once issued and gap-free — a voided invoice keeps its
// number as a cancelled record and is never reused or renumbered.
const invFmtNumber = (seq) => 'INV-' + String(seq).padStart(4, '0');
const invSeqOf = (number) => parseInt((String(number).match(/(\d+)/) || [])[1] || '0', 10);

// Derived status — never stored.
const invComputeStatus = (inv, today = invTodayISO()) => {
  if (inv.voided) return 'void';
  const ps = inv.payments || [];
  if (ps.length && ps.every(p => p.paidAt)) return 'paid';
  if (ps.some(p => !p.paidAt && p.dueDate < today)) return 'overdue';
  if (ps.some(p => p.paidAt)) return 'partial';
  return 'scheduled';
};

const invTotals = (inv, today = invTodayISO()) => {
  const ps = inv.payments || [];
  const total = ps.reduce((s, p) => s + p.amount, 0);
  const paid = ps.filter(p => p.paidAt).reduce((s, p) => s + p.amount, 0);
  const overdue = ps.filter(p => !p.paidAt && p.dueDate < today);
  const nextDue = ps.filter(p => !p.paidAt).sort((a, b) => a.dueDate < b.dueDate ? -1 : 1)[0] || null;
  return {
    total, paid, outstanding: total - paid,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, p) => s + p.amount, 0),
    nextDue, pct: total ? Math.round((paid / total) * 100) : 0,
  };
};

const INV_STATUS_META = {
  scheduled: { label:'Scheduled', variant:'accent',  color:DS.accent  },
  partial:   { label:'Partial',   variant:'warning', color:DS.warning },
  overdue:   { label:'Overdue',   variant:'danger',  color:DS.danger  },
  paid:      { label:'Paid',      variant:'success', color:DS.success },
  void:      { label:'Void',      variant:'default', color:DS.muted   },
};

// Centre-wide rollups (cards + analytics) — all live off the schedule.
// Voided invoices are cancelled records: they keep their number but carry no money.
const invAggregate = (invoices, today = invTodayISO()) => {
  let billed = 0, collected = 0, outstanding = 0, overdue = 0, paidThisMonth = 0, daySum = 0, dayCount = 0;
  const ym = today.slice(0, 7);
  invoices.forEach(inv => !inv.voided && (inv.payments || []).forEach(p => {
    billed += p.amount;
    if (p.paidAt) {
      collected += p.amount;
      if (p.paidAt.slice(0, 7) === ym) paidThisMonth += p.amount;
      const dtp = invDaysBetween(inv.issuedDate, p.paidAt);
      if (dtp >= 0) { daySum += dtp; dayCount++; }
    } else {
      outstanding += p.amount;
      if (p.dueDate < today) overdue += p.amount;
    }
  }));
  return {
    billed, collected, outstanding, overdue, paidThisMonth,
    collectionRate: billed ? collected / billed : 0,
    avgDaysToPay: dayCount ? Math.round(daySum / dayCount) : 0,
  };
};

// Aging of every unpaid instalment, bucketed by how overdue it is.
const invAging = (invoices, today = invTodayISO()) => {
  const b = { current:0, d30:0, d60:0, d90:0 };
  invoices.forEach(inv => !inv.voided && (inv.payments || []).forEach(p => {
    if (p.paidAt) return;
    if (p.dueDate >= today) { b.current += p.amount; return; }
    const days = invDaysBetween(p.dueDate, today);
    if (days <= 30) b.d30 += p.amount;
    else if (days <= 60) b.d60 += p.amount;
    else b.d90 += p.amount;
  }));
  return b;
};

// VAT/tax treatment — configurable, never hardcoded. Returns a descriptor for the
// detail drawer. The schedule total is always what's actually collected; tax is
// presented per the configured mode (none / inclusive / exclusive).
const invTaxLine = (inv, config) => {
  const mode = inv.taxMode || config.taxMode || 'none';
  const rate = inv.taxRate != null ? inv.taxRate : config.taxRate;
  const label = config.taxLabel || 'VAT';
  const total = invTotals(inv).total;
  if (mode === 'none') return { mode, label, applied:false, text:`${label} not applied (exempt) — configurable`, net:total, tax:0, gross:total };
  if (mode === 'inclusive') {
    const net = total / (1 + rate);
    const tax = total - net;
    return { mode, label, applied:true, net, tax, gross:total, text:`Includes ${label} @ ${Math.round(rate*100)}%` };
  }
  // exclusive — tax shown on top (informational; schedule stays the collected figure)
  const tax = total * rate;
  return { mode, label, applied:true, net:total, tax, gross:total + tax, text:`+ ${label} @ ${Math.round(rate*100)}% on top` };
};

// ─── CSV reconciliation — export + header-aware import ───────────────────────
// The round trip: Export produces one row per OUTSTANDING scheduled payment with
// the invoice_number pre-filled (the admin never types it); they fill in
// amount_received against their bank/card statement and re-import. Import matches
// each row back to its instalment on invoice_number + due_date + amount and only
// applies on explicit confirm. Nothing here generates or mutates a number.

const invCsvEsc = (s) => { const v = String(s == null ? '' : s); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

// Reconciliation sheet: every unpaid instalment across non-void invoices.
const INV_EXPORT_HEADER = ['invoice_number', 'student', 'family', 'due_date', 'amount_due', 'amount_received', 'reference'];
const invBuildReconCSV = (invoices, familyOf) => {
  const lines = [INV_EXPORT_HEADER.join(',')];
  invoices.forEach(inv => {
    if (inv.voided) return;
    const fam = familyOf(inv.familyId);
    const students = (inv.studentIds || []).map(invStudentName).join('; ');
    (inv.payments || []).forEach(p => {
      if (p.paidAt) return;                                    // only outstanding instalments need reconciling
      lines.push([inv.number, students, fam ? fam.name : '', p.dueDate, p.amount, '', ''].map(invCsvEsc).join(','));
    });
  });
  return lines.join('\r\n');
};
const invCountOutstandingRows = (invoices) =>
  invoices.reduce((n, inv) => inv.voided ? n : n + (inv.payments || []).filter(p => !p.paidAt).length, 0);

// Trigger a client-side download (no server round trip in this mock).
const invDownloadCSV = (filename, text) => {
  const blob = new Blob([text], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

// Quote-aware CSV → array-of-arrays (export quotes names that contain commas).
const invSplitCSV = (text) => {
  const out = [];
  (text || '').split(/\r?\n/).forEach(line => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    if (cells.length === 1 && cells[0].trim() === '') return;  // drop blank lines
    out.push(cells.map(c => c.trim()));
  });
  return out;
};

const invNormalizeDate = (s) => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);    // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s;
};

// Map column aliases → canonical fields. Accepts the export header
// (amount_received) and the legacy header (amount_paid); falls back to fixed
// positions when there is no recognisable header at all.
const INV_COL_ALIASES = {
  invoice_number: ['invoice_number', 'invoice', 'invoice no', 'invoice_no', 'number'],
  due_date:       ['due_date', 'payment_date', 'date', 'due'],
  amount_due:     ['amount_due', 'due_amount', 'expected', 'amount_expected'],
  amount_received:['amount_received', 'amount_paid', 'received', 'paid', 'amount'],
  reference:      ['reference', 'ref', 'memo'],
  student:        ['student', 'students', 'pupil'],
  family:         ['family', 'account', 'payer'],
};
const invParseCSV = (text) => {
  const grid = invSplitCSV(text);
  if (!grid.length) return [];
  const head = grid[0].map(h => h.toLowerCase());
  const idx = {};
  Object.keys(INV_COL_ALIASES).forEach(canon => { idx[canon] = head.findIndex(h => INV_COL_ALIASES[canon].includes(h)); });
  const hasHeader = idx.invoice_number !== -1 || /invoice/i.test(grid[0][0] || '');
  const body = hasHeader ? grid.slice(1) : grid;
  const get = (cells, canon, pos) => {
    const i = idx[canon];
    if (i !== -1 && i != null) return cells[i] || '';
    return hasHeader ? '' : (cells[pos] || '');       // legacy positional: number,date,amount,reference
  };
  return body.map(cells => ({
    invoice_number: get(cells, 'invoice_number', 0),
    due_date:       get(cells, 'due_date', 1),
    amount_due:     get(cells, 'amount_due', -1),
    amount_received:get(cells, 'amount_received', 2),
    reference:      get(cells, 'reference', 3),
    student:        get(cells, 'student', -1),
    family:         get(cells, 'family', -1),
    raw: cells.join(','),
  }));
};

// Classify every row WITHOUT writing anything. Matching is scoped to the current
// tenant's invoices and keyed on invoice_number + due_date + amount. Each row →
//   match    — an unpaid instalment matches and amount_received agrees
//   review   — amount mismatch, already paid, or no unpaid instalment on that date
//   skip     — no amount_received entered (export row left blank)
//   unknown  — no invoice with that number in this centre
// A `claimed` set stops two rows in one file applying to the same instalment.
const invValidateImport = (rows, invoices, today = invTodayISO()) => {
  const claimed = new Set();
  return rows.map(r => {
    const number  = (r.invoice_number || '').trim();
    const dateISO = invNormalizeDate(r.due_date);
    const amtRecv = parseFloat(r.amount_received);
    const amtDue  = (r.amount_due !== '' && r.amount_due != null) ? parseFloat(r.amount_due) : NaN;
    const matchAmt = !Number.isNaN(amtDue) ? amtDue : amtRecv;   // identify the instalment by its scheduled amount
    const inv = invoices.find(i => !i.voided && i.number.toLowerCase() === number.toLowerCase());
    const base = { ...r, number, dateISO, amount: amtRecv };
    if (!number || !inv) return { ...base, category:'unknown', note:'No invoice with this number in this centre' };

    // Locate the target instalment: due_date + amount, then due_date alone, then amount alone.
    const onDate = dateISO ? inv.payments.filter(p => p.dueDate === dateISO) : [];
    const target =
      onDate.find(p => !Number.isNaN(matchAmt) && Math.abs(p.amount - matchAmt) < 0.005) ||
      onDate[0] ||
      inv.payments.find(p => !p.paidAt && !claimed.has(p.id) && !Number.isNaN(matchAmt) && Math.abs(p.amount - matchAmt) < 0.005) ||
      null;

    if (Number.isNaN(amtRecv))
      return { ...base, category:'skip', invoiceId:inv.id, note:'No amount received entered — skipped' };
    if (!target)
      return { ...base, category:'review', invoiceId:inv.id, note: dateISO ? `No instalment due ${invDateShort(dateISO)} on this invoice` : 'No matching instalment on this invoice' };
    if (target.paidAt)
      return { ...base, category:'review', invoiceId:inv.id, paymentId:target.id, note:'Already paid — re-import is a no-op' };
    if (claimed.has(target.id))
      return { ...base, category:'review', invoiceId:inv.id, note:'Another row in this file already matched this instalment' };
    if (Math.abs(target.amount - amtRecv) >= 0.005)
      return { ...base, category:'review', invoiceId:inv.id, paymentId:target.id, note:`Amount mismatch — expected ${invMoney(target.amount)}, received ${invMoney(amtRecv)}` };
    claimed.add(target.id);
    return { ...base, category:'match', invoiceId:inv.id, paymentId:target.id, note:`Matches ${invMoney(target.amount)} due ${invDateShort(target.dueDate)}` };
  });
};

// Reconciliation report — portal "paid" totals (what the ledger says was
// collected) so they can be checked against the centre's actual bank balance.
// Any stray mark shows up as a variance the admin can drill into via the audit list.
const invReconReport = (invoices) => {
  const byMethod = { cash:0, card:0, bank:0, cheque:0 };
  let collected = 0, count = 0;
  invoices.forEach(inv => !inv.voided && (inv.payments || []).forEach(p => {
    if (!p.paidAt) return;
    collected += p.amount; count++;
    byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
  }));
  return { collected, count, byMethod };
};

// ─── Store (localStorage-backed, append-only logs) ───────────────────────────
// `seq` is the per-tenant number sequence counter — the highest number ever
// allocated. It only advances, so issuing is gap-free and a void never frees a
// number for reuse.
const INV_SEED_MAX_SEQ = SEED_INVOICES.reduce((m, i) => Math.max(m, invSeqOf(i.number)), 0);
const useInvoiceStore = () => {
  const read = () => {
    try {
      const raw = localStorage.getItem(INVOICES_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          invoices:    p.invoices    || SEED_INVOICES,
          families:    p.families    || SEED_FAMILIES,
          reminders:   p.reminders   || SEED_INVOICE_REMINDERS,
          audit:       p.audit       || SEED_INVOICE_AUDIT,
          importedRefs:p.importedRefs|| [],
          tenantId:    p.tenantId     || INV_TENANT,
          seq:         p.seq != null ? p.seq : INV_SEED_MAX_SEQ,
          config:      { ...INVOICE_DEFAULT_CONFIG, ...(p.config || {}) },
        };
      }
    } catch (e) { /* ignore */ }
    return { invoices:SEED_INVOICES, families:SEED_FAMILIES, reminders:SEED_INVOICE_REMINDERS, audit:SEED_INVOICE_AUDIT, importedRefs:[], tenantId:INV_TENANT, seq:INV_SEED_MAX_SEQ, config:{ ...INVOICE_DEFAULT_CONFIG } };
  };
  const [store, setStore] = React.useState(read);
  const persist = (next) => { setStore(next); try { localStorage.setItem(INVOICES_KEY, JSON.stringify(next)); } catch (e) {} };

  const logAudit = (events) => [...events, ...store.audit];

  const markPaid = (invoiceId, paymentId, { method, at } = {}) => {
    const when = at || invTodayISO();
    const inv = store.invoices.find(i => i.id === invoiceId);
    const pay = inv && inv.payments.find(p => p.id === paymentId);
    const invoices = store.invoices.map(i => i.id !== invoiceId ? i : {
      ...i, payments: i.payments.map(p => p.id !== paymentId ? p : { ...p, paidAt:when, paidBy:INV_ACTOR, method: method || 'cash' }),
    });
    persist({ ...store, invoices, audit: logAudit([{ id:invUID('a'), invoiceId, paymentId, action:'marked_paid', actor:INV_ACTOR, at:new Date().toISOString(), meta:{ method:method || 'cash', amount: pay ? pay.amount : null } }]) });
  };

  const unmarkPaid = (invoiceId, paymentId, { reason } = {}) => {
    const inv = store.invoices.find(i => i.id === invoiceId);
    const pay = inv && inv.payments.find(p => p.id === paymentId);
    const invoices = store.invoices.map(i => i.id !== invoiceId ? i : {
      ...i, payments: i.payments.map(p => p.id !== paymentId ? p : { ...p, paidAt:null, paidBy:null, method:null }),
    });
    persist({ ...store, invoices, audit: logAudit([{ id:invUID('a'), invoiceId, paymentId, action:'unmarked_paid', actor:INV_ACTOR, at:new Date().toISOString(), meta:{ reason: reason || '', amount: pay ? pay.amount : null } }]) });
  };

  const sendReminder = (invoiceId, toEmail) => {
    const sentAt = new Date().toISOString();
    persist({
      ...store,
      reminders: [{ id:invUID('rem'), invoiceId, sentAt, toEmail }, ...store.reminders],
      audit: logAudit([{ id:invUID('a'), invoiceId, paymentId:null, action:'reminder_sent', actor:INV_ACTOR, at:sentAt, meta:{ toEmail } }]),
    });
    // Also mirror money/comms actions into the unified account audit (§6). The
    // ledger keeps its own rich audit; this is the cross-module security trail.
    window.klayoAudit && window.klayoAudit('invoice_reminder_sent', invoiceId);
  };

  // Apply reconciliation — only ever called from the import preview's Confirm.
  const applyImport = (matched) => {
    const refs = new Set(store.importedRefs);
    const auditAdds = [];
    const invoices = store.invoices.map(inv => {
      const rowsFor = matched.filter(m => m.invoiceId === inv.id);
      if (!rowsFor.length) return inv;
      const payments = inv.payments.map(p => {
        const row = rowsFor.find(m => m.paymentId === p.id);
        if (!row || p.paidAt) return p;
        if (row.reference) refs.add((row.reference || '').toLowerCase());
        auditAdds.push({ id:invUID('a'), invoiceId:inv.id, paymentId:p.id, action:'import_reconciled', actor:INV_ACTOR, at:new Date().toISOString(), meta:{ amount:row.amount, reference:row.reference, method:'bank' } });
        return { ...p, paidAt: row.dateISO || invTodayISO(), paidBy: `${INV_ACTOR} · CSV import`, method:'bank' };
      });
      return { ...inv, payments };
    });
    persist({ ...store, invoices, importedRefs:[...refs], audit: logAudit(auditAdds) });
  };

  // Atomic per-tenant allocation: the number is the counter + 1 and the counter
  // advances in the SAME write, so two invoices can never collide on a number and
  // the sequence stays gap-free. Returns the assigned number.
  const issueInvoice = (draft) => {
    const seq = store.seq + 1;
    const number = invFmtNumber(seq);
    const inv = { ...draft, id:number, number, voided:false };
    persist({ ...store, seq, invoices: [inv, ...store.invoices], audit: logAudit([{ id:invUID('a'), invoiceId:number, paymentId:null, action:'issued', actor:INV_ACTOR, at:new Date().toISOString(), meta:{} }]) });
    return number;
  };

  // Void keeps the record (and its number) as a cancelled entry — never deleted,
  // renumbered or reused. The counter is untouched.
  const voidInvoice = (invoiceId, reason) => {
    const invoices = store.invoices.map(i => i.id !== invoiceId ? i : { ...i, voided:true, voidReason: reason || '', voidedAt: new Date().toISOString() });
    persist({ ...store, invoices, audit: logAudit([{ id:invUID('a'), invoiceId, paymentId:null, action:'voided', actor:INV_ACTOR, at:new Date().toISOString(), meta:{ reason: reason || '' } }]) });
  };

  const setConfig = (patch) => persist({ ...store, config: { ...store.config, ...patch } });

  // Helpers (read-only)
  const familyOf = (id) => store.families.find(f => f.id === id) || null;
  const lastReminder = (invoiceId) => store.reminders.filter(r => r.invoiceId === invoiceId).sort((a, b) => a.sentAt < b.sentAt ? 1 : -1)[0] || null;
  const auditFor = (invoiceId) => store.audit.filter(a => a.invoiceId === invoiceId).sort((a, b) => a.at < b.at ? 1 : -1);
  // Preview only — the real allocation happens atomically inside issueInvoice.
  const nextNumber = () => invFmtNumber(store.seq + 1);

  return { ...store, markPaid, unmarkPaid, sendReminder, applyImport, issueInvoice, voidInvoice, setConfig, familyOf, lastReminder, auditFor, nextNumber };
};

// Reminder eligibility (email present + not rate-limited).
const invReminderState = (store, inv, family) => {
  const hasEmail = !!(family && family.email);
  const last = store.lastReminder(inv.id);
  const cooldown = store.config.reminderCooldownHours || 24;
  const cooled = !last || invHoursSince(last.sentAt) >= cooldown;
  return { hasEmail, last, canSend: hasEmail && cooled, cooledDown: cooled, cooldown };
};

// ─── Small UI atoms ──────────────────────────────────────────────────────────
const InvStatusBadge = ({ status }) => {
  const m = INV_STATUS_META[status] || INV_STATUS_META.scheduled;
  return <StatusPill tone={m.variant}>{m.label}</StatusPill>;
};

// "£160 of £360" rollup + thin progress bar.
const InvProgress = ({ totals, width = 150 }) => (
  <div style={{ minWidth: width }}>
    <div style={{ display:'flex', alignItems:'baseline', gap:6, fontSize:13 }}>
      <span style={{ fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{invMoney(totals.paid)}</span>
      <span style={{ color:DS.faint }}>of {invMoney(totals.total)}</span>
    </div>
    <div style={{ marginTop:5, height:5, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
      <div style={{ width:`${totals.pct}%`, height:'100%', background: totals.overdueCount ? DS.danger : totals.pct === 100 ? DS.success : DS.accent, transition:'width 0.2s' }} />
    </div>
    {totals.overdueCount > 0 && (
      <div style={{ marginTop:4, fontSize:11, color:DS.danger, fontWeight:600 }}>{totals.overdueCount} overdue · {invMoney(totals.overdueAmount)}</div>
    )}
  </div>
);

// Right-anchored slide-in drawer (the library only has a centred Modal).
const InvDrawer = ({ open, onClose, width = 580, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(17,24,39,0.45)', backdropFilter:'blur(2px)', display:'flex', justifyContent:'flex-end', animation:'tos-fade 0.12s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth:'100%', height:'100%', background:DS.bg,
        borderLeft:`1px solid ${DS.border}`, boxShadow:'-12px 0 40px rgba(17,24,39,0.18)',
        display:'flex', flexDirection:'column', animation:'inv-slide 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}>{children}</div>
    </div>
  );
};

// ─── Invoice detail drawer ───────────────────────────────────────────────────
const InvoiceDetailDrawer = ({ entry, store, onClose, onToast }) => {
  const open = !!entry;
  const inv = entry && entry.inv;
  const family = entry && entry.family;
  const [marking, setMarking] = React.useState(null);     // paymentId getting a method picked
  const [confirmUndo, setConfirmUndo] = React.useState(null);
  const [confirmVoid, setConfirmVoid] = React.useState(false);
  const [reminderJustSent, setReminderJustSent] = React.useState(false);

  React.useEffect(() => { setMarking(null); setConfirmUndo(null); setConfirmVoid(false); setReminderJustSent(false); }, [inv && inv.id]);
  if (!open) return null;

  const today = invTodayISO();
  const status = invComputeStatus(inv, today);
  const totals = invTotals(inv, today);
  const tax = invTaxLine(inv, store.config);
  const rem = invReminderState(store, inv, family);
  const audit = store.auditFor(inv.id);
  const meta = INV_STATUS_META[status];

  const doSendReminder = () => {
    if (!rem.canSend) return;
    store.sendReminder(inv.id, family.email);
    setReminderJustSent(true);
    onToast && onToast(`Reminder emailed to ${family.email} via Workspace Gmail`, 'ok');
  };

  const ACTION_LABEL = {
    issued:'Invoice issued', marked_paid:'Payment marked paid', unmarked_paid:'Payment un-marked',
    reminder_sent:'Reminder sent', import_reconciled:'Reconciled from CSV import', voided:'Invoice voided',
  };
  const ACTION_ICON = { issued:'file', marked_paid:'check', unmarked_paid:'x', reminder_sent:'mail', import_reconciled:'upload', voided:'archive' };

  return (
    <InvDrawer open={open} onClose={onClose}>
      {/* Header */}
      <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${DS.border}`, background:`linear-gradient(180deg, ${meta.color}0C, transparent)` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18, fontWeight:700, color:DS.text, letterSpacing:'-0.3px', fontVariantNumeric:'tabular-nums' }}>{inv.number}</span>
              <InvStatusBadge status={status} />
            </div>
            <div style={{ fontSize:13, color:DS.muted, marginTop:3 }}>{family ? family.name : 'Unknown family'} · Issued {invDate(inv.issuedDate)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:DS.faint, padding:4, display:'flex' }}><Icon name="x" size={18} /></button>
        </div>
        {/* Headline rollup */}
        <div style={{ marginTop:14, display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:26, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{invMoney(totals.paid)}</span>
          <span style={{ fontSize:15, color:DS.muted }}>of {invMoney(totals.total)} collected</span>
          {totals.overdueCount > 0 && <span style={{ marginLeft:'auto', fontSize:12.5, fontWeight:600, color:DS.danger }}>{totals.overdueCount} overdue · {invMoney(totals.overdueAmount)}</span>}
        </div>
        <div style={{ marginTop:8, height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
          <div style={{ width:`${totals.pct}%`, height:'100%', background: totals.overdueCount ? DS.danger : totals.pct === 100 ? DS.success : DS.accent }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflow:'auto', padding:'18px 24px 28px' }}>
        {/* Bill-to + meta */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
          <InvMetaBox label="Billed to" value={family ? family.parent : '—'} sub={family ? family.name : ''} icon="user" />
          <InvMetaBox label="Contact" value={family && family.email ? family.email : 'No email on file'} sub={family ? family.phone : ''} icon="mail" tone={family && family.email ? 'default' : 'warn'} />
          <InvMetaBox label="Students" value={(inv.studentIds || []).map(invStudentName).join(', ') || '—'} icon="graduation" />
          <InvMetaBox label="Classes" value={(inv.classes || []).join(', ') || '—'} icon="book" />
        </div>

        {/* VAT / tax — configurable treatment */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:20, background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:9 }}>
          <Icon name="tag" size={15} color={DS.muted} />
          <div style={{ fontSize:12.5, color:DS.sub, flex:1 }}>
            <strong style={{ color:DS.text }}>{tax.label}:</strong> {tax.text}
            {tax.applied && <span style={{ color:DS.muted }}> · net {invMoney(tax.net)} · {tax.label} {invMoney(tax.tax)} · gross {invMoney(tax.gross)}</span>}
          </div>
        </div>

        {/* Payment schedule */}
        <SectionLabel>Payment schedule</SectionLabel>
        <div style={{ border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden', marginBottom:22 }}>
          {inv.payments.map((p, i) => {
            const paid = !!p.paidAt;
            const overdue = !paid && p.dueDate < today;
            const isMarking = marking === p.id;
            return (
              <div key={p.id} style={{ borderTop: i ? `1px solid ${DS.border}` : 'none', background: paid ? DS.successBg + '66' : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px' }}>
                  {/* Toggle */}
                  <button
                    onClick={() => paid ? setConfirmUndo(p) : setMarking(isMarking ? null : p.id)}
                    title={paid ? 'Un-mark this payment' : 'Mark this payment paid'}
                    style={{
                      width:24, height:24, borderRadius:6, flexShrink:0, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      border:`1.5px solid ${paid ? DS.success : overdue ? DS.dangerBorder : DS.borderDark}`,
                      background: paid ? DS.success : DS.bg, color:'#fff',
                    }}>
                    {paid && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
                  </button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{invMoney(p.amount)}</span>
                      {paid
                        ? <Badge variant="success" size="sm">Paid</Badge>
                        : overdue ? <Badge variant="danger" size="sm">Overdue</Badge> : <Badge variant="default" size="sm">Due</Badge>}
                    </div>
                    <div style={{ fontSize:11.5, color: overdue ? DS.danger : DS.muted, marginTop:2 }}>
                      {paid
                        ? <>Paid {invDate(p.paidAt)} · {INV_METHOD_LABEL[p.method] || p.method} · by {p.paidBy}</>
                        : <>Due {invDate(p.dueDate)}{overdue ? ` · ${invDaysBetween(p.dueDate, today)} days overdue` : ''}</>}
                    </div>
                  </div>
                </div>
                {/* Inline method picker when marking paid */}
                {isMarking && (
                  <div style={{ padding:'0 14px 14px 50px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:DS.muted }}>Recorded via:</span>
                    {INV_METHODS.map(mth => (
                      <button key={mth} onClick={() => { store.markPaid(inv.id, p.id, { method:mth }); setMarking(null); onToast && onToast(`${invMoney(p.amount)} marked paid (${INV_METHOD_LABEL[mth]})`, 'ok'); }}
                        style={{ padding:'5px 11px', borderRadius:7, border:`1px solid ${DS.border}`, background:DS.bg, color:DS.sub, fontSize:12.5, fontWeight:500, cursor:'pointer' }}>
                        {INV_METHOD_LABEL[mth]}
                      </button>
                    ))}
                    <button onClick={() => setMarking(null)} style={{ padding:'5px 9px', border:'none', background:'none', color:DS.faint, fontSize:12, cursor:'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Send reminder */}
        <SectionLabel>Reminders</SectionLabel>
        <div style={{ border:`1px solid ${DS.border}`, borderRadius:10, padding:'14px 16px', marginBottom:22 }}>
          {!rem.hasEmail ? (
            <div style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
              <Icon name="alert" size={17} color={DS.warning} />
              <div style={{ fontSize:13, color:DS.sub, lineHeight:1.5 }}>
                <strong style={{ color:DS.text }}>No email on file</strong> for {family ? family.name : 'this family'}. Add a parent email on the student record to send reminders.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:13, color:DS.sub }}>Emails <strong style={{ color:DS.text }}>{family.email}</strong> via Workspace Gmail.</div>
                <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>
                  {rem.last ? `Last reminded ${invAgo(rem.last.sentAt)}` : 'Never reminded'}
                  {!rem.cooledDown && ` · rate-limited (${store.config.reminderCooldownHours}h cooldown)`}
                </div>
              </div>
              <Btn variant={status === 'paid' ? 'secondary' : 'primary'} small icon="mail"
                onClick={doSendReminder}
                style={!rem.canSend ? { opacity:0.5, pointerEvents:'none' } : undefined}>
                {reminderJustSent ? 'Sent ✓' : status === 'paid' ? 'Send receipt' : 'Send reminder'}
              </Btn>
            </div>
          )}
        </div>

        {/* Audit trail */}
        <SectionLabel>Audit trail <span style={{ fontWeight:400, color:DS.faint }}>· {audit.length} events</span></SectionLabel>
        <div style={{ position:'relative', paddingLeft:8 }}>
          {audit.map((a, i) => (
            <div key={a.id} style={{ display:'flex', gap:12, paddingBottom: i < audit.length - 1 ? 14 : 0 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, background:DS.surface, border:`1px solid ${DS.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:DS.muted }}>
                  <Icon name={ACTION_ICON[a.action] || 'clock'} size={13} />
                </div>
                {i < audit.length - 1 && <div style={{ width:1, flex:1, background:DS.border, marginTop:2 }} />}
              </div>
              <div style={{ paddingBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{ACTION_LABEL[a.action] || a.action}</div>
                <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>
                  {a.actor} · {invStampFull(a.at)}
                  {a.meta && a.meta.method ? ` · ${INV_METHOD_LABEL[a.meta.method] || a.meta.method}` : ''}
                  {a.meta && a.meta.amount != null ? ` · ${invMoney(a.meta.amount)}` : ''}
                  {a.meta && a.meta.toEmail ? ` · ${a.meta.toEmail}` : ''}
                  {a.meta && a.meta.reference ? ` · ref ${a.meta.reference}` : ''}
                  {a.meta && a.meta.reason ? ` · “${a.meta.reason}”` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Void — keeps the number as a cancelled record */}
        <div style={{ marginTop:24, paddingTop:18, borderTop:`1px dashed ${DS.border}` }}>
          {inv.voided ? (
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'11px 14px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:9 }}>
              <Icon name="archive" size={16} color={DS.muted} />
              <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.5 }}>
                <strong style={{ color:DS.text }}>Voided</strong> {inv.voidedAt ? invAgo(inv.voidedAt) : ''}{inv.voidReason ? ` · ${inv.voidReason}` : ''}. {inv.number} is kept as a cancelled record — its number is never reused.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ fontSize:12, color:DS.muted, lineHeight:1.5 }}>Cancel this invoice. The number stays reserved and is never reissued.</div>
              <Btn variant="ghost" small icon="archive" onClick={() => setConfirmVoid(true)}>Void invoice</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Un-mark confirmation */}
      <Modal
        open={!!confirmUndo}
        onClose={() => setConfirmUndo(null)}
        title="Un-mark this payment?"
        subtitle={confirmUndo ? `${invMoney(confirmUndo.amount)} will return to unpaid. This is recorded in the audit trail.` : ''}
        icon="alert" iconColor={DS.warning} width={440}
        footer={<>
          <Btn variant="ghost" small onClick={() => setConfirmUndo(null)}>Cancel</Btn>
          <Btn variant="danger" small onClick={() => { store.unmarkPaid(inv.id, confirmUndo.id, { reason:'Correction' }); onToast && onToast('Payment returned to unpaid', 'warn'); setConfirmUndo(null); }}>Un-mark payment</Btn>
        </>}
      >
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.55 }}>
          Only do this if the payment was recorded in error. The change is logged against your name ({INV_ACTOR}) with a timestamp.
        </div>
      </Modal>

      {/* Void confirmation */}
      <Modal
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        title="Void this invoice?"
        subtitle={`${inv.number} becomes a cancelled record. Its number is kept and never reused or renumbered.`}
        icon="archive" iconColor={DS.warning} width={440}
        footer={<>
          <Btn variant="ghost" small onClick={() => setConfirmVoid(false)}>Cancel</Btn>
          <Btn variant="danger" small icon="archive" onClick={() => { store.voidInvoice(inv.id, 'Voided in error'); onToast && onToast(`${inv.number} voided`, 'warn'); setConfirmVoid(false); onClose && onClose(); }}>Void invoice</Btn>
        </>}
      >
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.55 }}>
          The invoice is excluded from outstanding and overdue totals but stays visible for the audit trail. This is logged against your name ({INV_ACTOR}) with a timestamp.
        </div>
      </Modal>
    </InvDrawer>
  );
};

const InvMetaBox = ({ label, value, sub, icon, tone }) => (
  <div style={{ border:`1px solid ${tone === 'warn' ? DS.warningBorder : DS.border}`, background: tone === 'warn' ? DS.warningBg : DS.bg, borderRadius:9, padding:'10px 12px' }}>
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:DS.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
      <Icon name={icon} size={12} color={tone === 'warn' ? DS.warning : DS.faint} />{label}
    </div>
    <div style={{ fontSize:13.5, fontWeight:600, color: tone === 'warn' ? DS.warning : DS.text, marginTop:4, wordBreak:'break-word' }}>{value}</div>
    {sub && <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>{sub}</div>}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize:12, fontWeight:700, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{children}</div>
);

// ─── Analytics strip ─────────────────────────────────────────────────────────
const InvAnalyticsStrip = ({ agg, aging }) => {
  const maxBucket = Math.max(aging.current, aging.d30, aging.d60, aging.d90, 1);
  const buckets = [
    { label:'Not yet due', amt:aging.current, color:DS.accent  },
    { label:'1–30 days',   amt:aging.d30,     color:DS.warning },
    { label:'31–60 days',  amt:aging.d60,     color:'#EA580C'  },
    { label:'60+ days',    amt:aging.d90,     color:DS.danger  },
  ];
  return (
    <Card title="Analytics" subtitle="Collection performance across all invoices" icon="chart" style={{ marginBottom:24 }}>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(150px,0.5fr) minmax(150px,0.5fr) 1.4fr', gap:0 }}>
        {/* Collection rate */}
        <div style={{ padding:'18px 22px', borderRight:`1px solid ${DS.border}` }}>
          <div style={{ fontSize:12.5, color:DS.muted, fontWeight:500 }}>Collection rate</div>
          <div style={{ fontSize:30, fontWeight:700, color:DS.text, lineHeight:1.1, marginTop:8, letterSpacing:'-0.5px' }}>{Math.round(agg.collectionRate * 100)}%</div>
          <div style={{ marginTop:10, height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:`${Math.round(agg.collectionRate * 100)}%`, height:'100%', background:DS.success }} />
          </div>
          <div style={{ fontSize:11.5, color:DS.muted, marginTop:7 }}>{invMoney(agg.collected)} of {invMoney(agg.billed)} billed</div>
        </div>
        {/* Avg days to pay */}
        <div style={{ padding:'18px 22px', borderRight:`1px solid ${DS.border}` }}>
          <div style={{ fontSize:12.5, color:DS.muted, fontWeight:500 }}>Avg days to pay</div>
          <div style={{ fontSize:30, fontWeight:700, color:DS.text, lineHeight:1.1, marginTop:8, letterSpacing:'-0.5px' }}>{agg.avgDaysToPay}<span style={{ fontSize:15, fontWeight:600, color:DS.muted, marginLeft:4 }}>days</span></div>
          <div style={{ fontSize:11.5, color:DS.muted, marginTop:10, lineHeight:1.5 }}>Average time from invoice issued to payment received.</div>
        </div>
        {/* Aging buckets */}
        <div style={{ padding:'18px 22px' }}>
          <div style={{ fontSize:12.5, color:DS.muted, fontWeight:500, marginBottom:12 }}>Outstanding by age</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {buckets.map(b => (
              <div key={b.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:11.5, color:DS.muted, width:84, flexShrink:0 }}>{b.label}</span>
                <div style={{ flex:1, height:8, background:DS.surface, borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${(b.amt / maxBucket) * 100}%`, height:'100%', background:b.color, borderRadius:4, minWidth: b.amt ? 3 : 0 }} />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color: b.amt ? DS.text : DS.faint, width:64, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{invMoney(b.amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Reconciliation modal (report → export → import round trip) ──────────────
const INV_CAT_META = {
  match:   { label:'Match',           variant:'success', icon:'check' },
  review:  { label:'Needs review',    variant:'warning', icon:'alert' },
  skip:    { label:'Skipped',         variant:'default', icon:'archive' },
  unknown: { label:'Unknown invoice', variant:'default', icon:'x' },
};

const InvReconModal = ({ open, onClose, store, onToast }) => {
  const [stage, setStage] = React.useState('home');  // home | input | preview
  const [text, setText] = React.useState('');
  const [rows, setRows] = React.useState(null);
  const [expected, setExpected] = React.useState('');
  const fileRef = React.useRef(null);

  React.useEffect(() => { if (open) { setStage('home'); setText(''); setRows(null); setExpected(''); } }, [open]);

  const report = invReconReport(store.invoices);
  const outstandingRows = invCountOutstandingRows(store.invoices);
  const recentMarks = [...store.audit]
    .filter(a => a.action === 'marked_paid' || a.action === 'import_reconciled')
    .sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 6);

  const expectedNum = expected === '' ? null : parseFloat(expected);
  const variance = expectedNum == null || Number.isNaN(expectedNum) ? null : Math.round((report.collected - expectedNum) * 100) / 100;

  const doExport = () => {
    if (!outstandingRows) { onToast && onToast('Nothing outstanding to reconcile', 'warn'); return; }
    invDownloadCSV(`reconciliation-${invTodayISO()}.csv`, invBuildReconCSV(store.invoices, store.familyOf));
    onToast && onToast(`Exported ${outstandingRows} outstanding payment${outstandingRows === 1 ? '' : 's'} to CSV`, 'ok');
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result || ''));
    r.readAsText(f);
  };

  // Demo sheet built from real outstanding rows so matches actually land.
  const buildSample = () => {
    const grid = invSplitCSV(invBuildReconCSV(store.invoices, store.familyOf));
    if (grid.length < 2) return INV_EXPORT_HEADER.join(',') + '\nINV-9999,Sample Pupil,Sample family,2026-06-20,200,200,BACS-9999';
    const out = [grid[0]];
    grid.slice(1).forEach((cells, i) => {
      const c = cells.slice();
      if (i === 1) { c[5] = String((parseFloat(c[4]) || 0) + 20); c[6] = 'BACS-1002'; }  // amount mismatch → review
      else if (i === 2) { c[5] = ''; }                                                     // blank → skip
      else { c[5] = c[4]; c[6] = 'BACS-10' + String(i).padStart(2, '0'); }                // exact match
      out.push(c);
    });
    out.push(['INV-9999', 'Unknown Pupil', 'Unknown family', '2026-06-20', '200', '200', 'BACS-9999']);  // unknown invoice
    return out.map(r => r.map(invCsvEsc).join(',')).join('\n');
  };

  const runValidate = () => {
    const parsed = invParseCSV(text);
    if (!parsed.length) { onToast && onToast('No rows found in the CSV', 'warn'); return; }
    setRows(invValidateImport(parsed, store.invoices));
    setStage('preview');
  };

  const counts = rows ? rows.reduce((a, r) => { a[r.category] = (a[r.category] || 0) + 1; return a; }, {}) : {};
  const matched = rows ? rows.filter(r => r.category === 'match') : [];

  const apply = () => {
    if (!matched.length) return;
    store.applyImport(matched);
    onToast && onToast(`${matched.length} payment${matched.length === 1 ? '' : 's'} reconciled from CSV`, 'ok');
    onClose();
  };

  // Resolve the PORTAL family + student for a row (the number does the matching;
  // the name is the human eyeball check). Falls back to the CSV text if unknown.
  const whoFor = (r) => {
    const inv = r.invoiceId ? store.invoices.find(i => i.id === r.invoiceId) : null;
    if (!inv) return { family: r.family || '—', student: r.student || '' };
    const fam = store.familyOf(inv.familyId);
    return { family: fam ? fam.name : '—', student: (inv.studentIds || []).map(invStudentName).join(', ') };
  };

  const PREVIEW_COLS = '0.85fr 1.5fr 0.8fr 0.85fr 0.95fr 1.5fr';

  const footer = stage === 'preview' ? <>
    <Btn variant="ghost" small onClick={() => setStage('input')}>← Back</Btn>
    <Btn variant="primary" small icon="check" onClick={apply} style={!matched.length ? { opacity:0.5, pointerEvents:'none' } : undefined}>
      Apply {matched.length} match{matched.length === 1 ? '' : 'es'}
    </Btn>
  </> : stage === 'input' ? <>
    <Btn variant="ghost" small onClick={() => setStage('home')}>← Back</Btn>
    <Btn variant="primary" small icon="filter" onClick={runValidate}>Validate &amp; preview</Btn>
  </> : <Btn variant="ghost" small onClick={onClose}>Close</Btn>;

  return (
    <Modal
      open={open} onClose={onClose}
      title="Reconcile payments" icon="upload" width={760}
      subtitle="Export outstanding payments, fill in what arrived, re-import. Nothing is written until you confirm."
      footer={footer}
    >
      {stage === 'home' && (
        <div>
          {/* Reconciliation report — portal paid vs the centre's actual bank total */}
          <SectionLabel>Reconciliation report</SectionLabel>
          <div style={{ border:`1px solid ${DS.border}`, borderRadius:10, padding:'16px 18px', marginBottom:18 }}>
            <div style={{ display:'flex', gap:18, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:11.5, color:DS.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Recorded as paid</div>
                <div style={{ fontSize:26, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums', marginTop:4 }}>{invMoney(report.collected)}</div>
                <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>{report.count} payment{report.count === 1 ? '' : 's'} across the ledger</div>
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <Field label="Bank statement total (expected)" hint="Enter your actual balance received to check for stray marks.">
                  <Input type="number" value={expected} onChange={e => setExpected(e.target.value)} placeholder="e.g. 1840" style={{ maxWidth:200 }} />
                </Field>
              </div>
            </div>
            {variance != null && (
              <div style={{ marginTop:12, padding:'9px 13px', borderRadius:8, fontSize:12.5, fontWeight:600,
                background: variance === 0 ? DS.successBg : DS.warningBg,
                color: variance === 0 ? DS.success : DS.warning,
                border:`1px solid ${variance === 0 ? DS.successBorder : DS.warningBorder}` }}>
                {variance === 0
                  ? '✓ Reconciled — portal matches the bank statement exactly.'
                  : `Variance of ${invMoney(Math.abs(variance))} — portal is ${variance > 0 ? 'ahead of' : 'behind'} the bank. Investigate the recent marks below.`}
              </div>
            )}
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:14 }}>
              {INV_METHODS.map(m => (
                <div key={m} style={{ fontSize:12, color:DS.muted }}>
                  <span style={{ color:DS.sub, fontWeight:600 }}>{INV_METHOD_LABEL[m]}:</span> <span style={{ fontVariantNumeric:'tabular-nums' }}>{invMoney(report.byMethod[m] || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export — the primary reconciliation path */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', marginBottom:14, background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, borderRadius:10 }}>
            <Icon name="download" size={20} color={DS.accent} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>Export outstanding payments</div>
              <div style={{ fontSize:12, color:DS.muted, marginTop:1 }}>{outstandingRows} unpaid instalment{outstandingRows === 1 ? '' : 's'} · invoice number pre-filled, you fill <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>amount_received</code>.</div>
            </div>
            <Btn variant="primary" small icon="download" onClick={doExport}>Export CSV</Btn>
          </div>

          {/* Import the completed sheet */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', marginBottom:18, background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
            <Icon name="upload" size={20} color={DS.muted} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>Import the completed sheet</div>
              <div style={{ fontSize:12, color:DS.muted, marginTop:1 }}>Matched on invoice number + due date + amount, scoped to this centre. Preview before anything is applied.</div>
            </div>
            <Btn variant="secondary" small icon="upload" onClick={() => setStage('input')}>Import CSV</Btn>
          </div>

          {/* Recent marks — where a stray "paid" would show up */}
          {recentMarks.length > 0 && (
            <>
              <SectionLabel>Recently recorded payments</SectionLabel>
              <div style={{ border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden' }}>
                {recentMarks.map((a, i) => {
                  const inv = store.invoices.find(x => x.id === a.invoiceId);
                  const fam = inv && store.familyOf(inv.familyId);
                  return (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderTop: i ? `1px solid ${DS.border}` : 'none', fontSize:12.5 }}>
                      <Icon name={a.action === 'import_reconciled' ? 'upload' : 'check'} size={14} color={DS.success} />
                      <span style={{ fontWeight:600, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{a.invoiceId}</span>
                      <span style={{ color:DS.muted, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fam ? fam.name : ''}</span>
                      {a.meta && a.meta.amount != null && <span style={{ fontWeight:600, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{invMoney(a.meta.amount)}</span>}
                      {a.meta && a.meta.method && <span style={{ color:DS.muted }}>{INV_METHOD_LABEL[a.meta.method] || a.meta.method}</span>}
                      <span style={{ color:DS.faint, width:78, textAlign:'right' }}>{invAgo(a.at)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'input' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:14, background:DS.infoBg, border:'1px solid #BAE6FD', borderRadius:9 }}>
            <Icon name="alert" size={16} color={DS.info} />
            <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.5 }}>
              Re-import the exported sheet with <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11.5, color:DS.text }}>amount_received</code> filled in (legacy <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11.5, color:DS.text }}>amount_paid</code> also accepted). Columns are read by header. This only marks scheduled payments as paid — it never creates or alters invoices or their numbers.
            </div>
          </div>
          <Field label="Paste CSV" hint="Parsed by header. Dates as YYYY-MM-DD or DD/MM/YYYY.">
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={INV_EXPORT_HEADER.join(',')} style={{ minHeight:150, fontFamily:'JetBrains Mono, monospace', fontSize:12 }} />
          </Field>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn variant="secondary" small icon="file" onClick={() => fileRef.current && fileRef.current.click()}>Upload .csv</Btn>
            <Btn variant="ghost" small onClick={() => setText(buildSample())}>Use sample data</Btn>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display:'none' }} />
          </div>
        </div>
      )}

      {stage === 'preview' && rows && (
        <div>
          {/* Summary chips */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {Object.keys(INV_CAT_META).map(c => (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:8, border:`1px solid ${DS.border}`, background:DS.surface }}>
                <Badge variant={INV_CAT_META[c].variant} size="sm">{counts[c] || 0}</Badge>
                <span style={{ fontSize:12.5, color:DS.sub }}>{INV_CAT_META[c].label}</span>
              </div>
            ))}
          </div>
          {/* Preview table — family + student rendered on every row for verification */}
          <div style={{ border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:PREVIEW_COLS, background:DS.surface, borderBottom:`1px solid ${DS.border}`, fontSize:11, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {['Invoice','Family / student','Due','Received','Result','Detail'].map(h => <div key={h} style={{ padding:'9px 12px' }}>{h}</div>)}
            </div>
            <div style={{ maxHeight:300, overflow:'auto' }}>
              {rows.map((r, i) => {
                const cm = INV_CAT_META[r.category];
                const who = whoFor(r);
                return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:PREVIEW_COLS, borderTop: i ? `1px solid ${DS.border}` : 'none', fontSize:12.5, color:DS.sub, alignItems:'center' }}>
                    <div style={{ padding:'9px 12px', fontWeight:600, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{r.number || '—'}</div>
                    <div style={{ padding:'9px 12px', minWidth:0 }}>
                      <div style={{ fontWeight:600, color:DS.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{who.family}</div>
                      {who.student && <div style={{ fontSize:11, color:DS.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{who.student}</div>}
                    </div>
                    <div style={{ padding:'9px 12px' }}>{r.dateISO ? invDateShort(r.dateISO) : '—'}</div>
                    <div style={{ padding:'9px 12px', fontVariantNumeric:'tabular-nums' }}>{Number.isNaN(r.amount) ? '—' : invMoney(r.amount)}</div>
                    <div style={{ padding:'9px 12px' }}><Badge variant={cm.variant} size="sm">{cm.label}</Badge></div>
                    <div style={{ padding:'9px 12px', fontSize:11.5, color:DS.muted }}>{r.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ fontSize:12, color:DS.muted, marginTop:12 }}>
            Only the <strong style={{ color:DS.success }}>{matched.length} match{matched.length === 1 ? '' : 'es'}</strong> will be applied. Needs-review, skipped and unknown rows are left untouched. Already-paid rows are a no-op — re-importing never double-applies.
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Tax / billing settings modal ────────────────────────────────────────────
const InvTaxModal = ({ open, onClose, store, onToast }) => {
  const [cfg, setCfg] = React.useState(store.config);
  React.useEffect(() => { if (open) setCfg(store.config); }, [open]);
  const save = () => { store.setConfig(cfg); onToast && onToast('Billing settings saved', 'ok'); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Billing settings" icon="settings" width={460}
      subtitle="VAT/tax treatment is configurable — not hardcoded."
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn variant="primary" small onClick={save}>Save settings</Btn></>}>
      <Field label="Tax label">
        <Input value={cfg.taxLabel} onChange={e => setCfg({ ...cfg, taxLabel:e.target.value })} placeholder="VAT" />
      </Field>
      <Field label="Treatment" hint="How tax is applied to the schedule total on each invoice.">
        <Segmented fullWidth value={cfg.taxMode} onChange={v => setCfg({ ...cfg, taxMode:v })}
          options={[{ id:'none', label:'None / exempt' }, { id:'exclusive', label:'Added on top' }, { id:'inclusive', label:'Included' }]} />
      </Field>
      <Field label="Rate (%)" hint="Used when treatment is not “None”.">
        <Input type="number" value={Math.round((cfg.taxRate || 0) * 100)} onChange={e => setCfg({ ...cfg, taxRate: (parseFloat(e.target.value) || 0) / 100 })} style={{ maxWidth:140 }} />
      </Field>
      <Divider />
      <Field label="Reminder cooldown (hours)" hint="A family can't be re-reminded within this window.">
        <Input type="number" value={cfg.reminderCooldownHours} onChange={e => setCfg({ ...cfg, reminderCooldownHours: parseInt(e.target.value, 10) || 0 })} style={{ maxWidth:140 }} />
      </Field>
    </Modal>
  );
};

// ─── New invoice modal ───────────────────────────────────────────────────────
const InvCreateModal = ({ open, onClose, store, onToast }) => {
  const blank = { familyId:'', total:'', instalments:'1', firstDue: invAddMonths(invTodayISO(), 0), classes:'' };
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => { if (open) setForm(blank); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const family = store.families.find(f => f.id === form.familyId);
  const totalNum = parseFloat(form.total) || 0;
  const n = Math.max(1, Math.min(6, parseInt(form.instalments, 10) || 1));
  const valid = form.familyId && totalNum > 0 && form.firstDue;

  const create = () => {
    if (!valid) return;
    const base = Math.floor((totalNum / n) * 100) / 100;
    const payments = Array.from({ length:n }, (_, i) => {
      const amount = i === n - 1 ? Math.round((totalNum - base * (n - 1)) * 100) / 100 : base;
      return { id:invUID('p'), dueDate: invAddMonths(form.firstDue, i), amount, paidAt:null, paidBy:null, method:null };
    });
    // Number is allocated atomically server-side — we don't pass one in.
    const number = store.issueInvoice({
      familyId: form.familyId, studentIds: family ? family.studentIds : [],
      classes: form.classes ? form.classes.split(',').map(s => s.trim()).filter(Boolean) : [],
      issuedDate: invTodayISO(), payments,
    });
    onToast && onToast(`${number} issued to ${family ? family.name : 'family'}`, 'ok');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New invoice" icon="invoice" width={500}
      subtitle="Create an invoice and its payment schedule. Record payments later as they arrive."
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="plus" onClick={create} style={!valid ? { opacity:0.5, pointerEvents:'none' } : undefined}>Issue invoice</Btn></>}>
      <Field label="Family" required>
        <Select value={form.familyId} onChange={e => set('familyId', e.target.value)}>
          <option value="">Select a family…</option>
          {store.families.map(f => <option key={f.id} value={f.id}>{f.name} — {(f.studentIds || []).map(invStudentName).join(', ')}</option>)}
        </Select>
      </Field>
      {family && !family.email && (
        <div style={{ display:'flex', gap:8, alignItems:'center', margin:'-6px 0 14px', fontSize:12, color:DS.warning }}>
          <Icon name="alert" size={13} color={DS.warning} /> No email on file — reminders won't be available for this family.
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Field label="Total amount (£)" required><Input type="number" value={form.total} onChange={e => set('total', e.target.value)} placeholder="360" /></Field>
        <Field label="Instalments"><Select value={form.instalments} onChange={e => set('instalments', e.target.value)}>{[1,2,3,4,6].map(i => <option key={i} value={i}>{i} payment{i === 1 ? '' : 's'}</option>)}</Select></Field>
      </div>
      <Field label="First payment due" required><Input type="date" value={form.firstDue} onChange={e => set('firstDue', e.target.value)} /></Field>
      <Field label="Classes / items" hint="Comma-separated. Shown on the invoice."><Input value={form.classes} onChange={e => set('classes', e.target.value)} placeholder="GCSE Mathematics, GCSE Science" /></Field>
      {valid && (
        <div style={{ padding:'10px 14px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:9, fontSize:12.5, color:DS.sub }}>
          <div style={{ marginBottom:4 }}>Will be issued as <strong style={{ color:DS.text, fontVariantNumeric:'tabular-nums' }}>{store.nextNumber()}</strong> <span style={{ color:DS.faint }}>· number assigned on issue, never reused</span></div>
          {n === 1 ? <>One payment of <strong style={{ color:DS.text }}>{invMoney(totalNum)}</strong> due {invDateShort(form.firstDue)}.</>
            : <>{n} monthly payments (~<strong style={{ color:DS.text }}>{invMoney(Math.floor((totalNum / n) * 100) / 100)}</strong> each) from {invDateShort(form.firstDue)}.</>}
        </div>
      )}
    </Modal>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────
const InvToast = ({ toast }) => {
  if (!toast) return null;
  const tone = toast.tone === 'warn' ? { bg:DS.warningBg, border:DS.warningBorder, color:DS.warning, icon:'alert' }
    : { bg:'#fff', border:DS.successBorder, color:DS.success, icon:'check' };
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:1200, animation:'tos-pop 0.16s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', background:tone.bg, border:`1px solid ${tone.border}`, borderRadius:10, boxShadow:DS.cardShadowHi, fontSize:13.5, fontWeight:500, color:DS.text }}>
        <Icon name={tone.icon} size={16} color={tone.color} />{toast.msg}
      </div>
    </div>
  );
};

// ─── Invoice list row ────────────────────────────────────────────────────────
// Real <table> auto-layout (like the rest of the app) so columns size to their
// content — fixed-width columns hug (width:1%) and the single text column
// (family / students) absorbs the slack, so there are no large empty gaps on
// wide screens. Classes shows just a count chip (the full list can be long), with
// the names on hover, so the column stays narrow and aligned.
const InvoiceRow = ({ entry, isLast, onOpen, onRemind }) => {
  const [hov, setHov] = React.useState(false);
  const e = entry;
  const voided = e.status === 'void';
  const classes = e.inv.classes || [];
  const td = { padding:'12px 16px', borderBottom: isLast ? 'none' : `1px solid ${DS.border}`, verticalAlign:'middle' };
  return (
    <tr onClick={() => onOpen(e.inv.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ cursor:'pointer', background: hov ? DS.surface : DS.bg, transition:'background 0.1s', opacity: voided ? 0.55 : 1 }}>
      <td style={{ ...td, width:'1%', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{e.inv.number}</td>
      <td style={td}>
        <div style={{ fontSize:13, fontWeight:600, color:DS.text, whiteSpace:'nowrap' }}>{e.family ? e.family.name : 'Unknown family'}</div>
        <div style={{ fontSize:11.5, color:DS.muted }}>{(e.inv.studentIds || []).map(invStudentName).join(', ')}</div>
      </td>
      <td style={{ ...td, width:'1%', whiteSpace:'nowrap' }}>
        <span title={classes.join(', ')} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, background:DS.surface, border:`1px solid ${DS.border}`, fontSize:12, fontWeight:600, color:DS.sub }}>
          <Icon name="book" size={12} color={DS.faint} />
          {classes.length} {classes.length === 1 ? 'class' : 'classes'}
        </span>
      </td>
      <td style={{ ...td, width:184 }}><InvProgress totals={e.totals} width={150} /></td>
      <td style={{ ...td, width:'1%', whiteSpace:'nowrap', fontSize:12.5, color:DS.muted }}>{invDateShort(e.inv.issuedDate)}</td>
      <td style={{ ...td, width:'1%', whiteSpace:'nowrap' }}><InvStatusBadge status={e.status} /></td>
      <td style={{ ...td, width:'1%', whiteSpace:'nowrap' }} onClick={ev => ev.stopPropagation()}>
        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          {e.status !== 'paid' && !voided && <Btn variant="secondary" small icon="mail" onClick={() => onRemind(e)}>Remind</Btn>}
          <Btn variant="ghost" small onClick={() => onOpen(e.inv.id)}>View →</Btn>
        </div>
      </td>
    </tr>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
const AdminInvoicesPage = () => {
  const store = useInvoiceStore();
  const today = invTodayISO();
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [openId, setOpenId] = React.useState(null);
  const [showImport, setShowImport] = React.useState(false);
  const [showTax, setShowTax] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);
  const fireToast = (msg, tone = 'ok') => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  React.useEffect(() => () => clearTimeout(toastTimer.current), []);

  const [invPage, setInvPage] = React.useState(0);

  // Derive everything from the schedule, every render.
  const entries = store.invoices.map(inv => ({ inv, status: invComputeStatus(inv, today), totals: invTotals(inv, today), family: store.familyOf(inv.familyId) }));
  const agg = invAggregate(store.invoices, today);
  const aging = invAging(store.invoices, today);
  const counts = entries.reduce((a, e) => { a.all++; a[e.status]++; return a; }, { all:0, scheduled:0, partial:0, overdue:0, paid:0, void:0 });
  const nonPaidCount = counts.scheduled + counts.partial + counts.overdue;

  const q = search.trim().toLowerCase();
  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (!q) return true;
    const hay = [e.inv.number, e.family ? e.family.name : '', e.family ? e.family.parent : '', (e.inv.studentIds || []).map(invStudentName).join(' '), (e.inv.classes || []).join(' ')].join(' ').toLowerCase();
    return hay.includes(q);
  }).sort((a, b) => a.inv.number < b.inv.number ? 1 : -1);

  // Pagination (§8) — a consistent 10 rows/page so the ledger never becomes a
  // scroll-wall. Page is clamped (not reset) so it survives a re-derive; filter/
  // search changing naturally shrinks the range and the clamp keeps it valid.
  const INV_PER_PAGE = 10;
  const invPageCount = Math.max(1, Math.ceil(filtered.length / INV_PER_PAGE));
  const curInvPage = Math.min(invPage, invPageCount - 1);
  const pageRows = filtered.slice(curInvPage * INV_PER_PAGE, (curInvPage + 1) * INV_PER_PAGE);

  const openEntry = openId ? entries.find(e => e.inv.id === openId) : null;

  // Quick reminder from a table row (respects email + rate-limit).
  const quickRemind = (e) => {
    const rem = invReminderState(store, e.inv, e.family);
    if (!rem.hasEmail) { fireToast(`No email on file for ${e.family ? e.family.name : 'this family'}`, 'warn'); return; }
    if (!rem.canSend) { fireToast(`Already reminded ${invAgo(rem.last.sentAt)} — rate-limited (${store.config.reminderCooldownHours}h)`, 'warn'); return; }
    store.sendReminder(e.inv.id, e.family.email);
    fireToast(`Reminder emailed to ${e.family.email} via Workspace Gmail`, 'ok');
  };

  // Quick export of the reconciliation sheet (also available inside the Reconcile modal).
  const exportCSV = () => {
    const n = invCountOutstandingRows(store.invoices);
    if (!n) { fireToast('Nothing outstanding to reconcile', 'warn'); return; }
    invDownloadCSV(`reconciliation-${today}.csv`, invBuildReconCSV(store.invoices, store.familyOf));
    fireToast(`Exported ${n} outstanding payment${n === 1 ? '' : 's'} to CSV`, 'ok');
  };

  const FILTERS = [['all','All'],['scheduled','Scheduled'],['partial','Partial'],['overdue','Overdue'],['paid','Paid'],
    ...(counts.void ? [['void','Void']] : [])];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Invoices" subtitle="A ledger over payments made elsewhere — bank transfer, card machine or cash" actions={[
        <Btn key="exp" variant="secondary" icon="download" small onClick={exportCSV}>Export CSV</Btn>,
        <Btn key="rec" variant="secondary" icon="upload" small onClick={() => setShowImport(true)}>Reconcile</Btn>,
        <Btn key="tax" variant="secondary" icon="settings" small onClick={() => setShowTax(true)}>Settings</Btn>,
        <Btn key="new" variant="primary" icon="plus" small onClick={() => setShowNew(true)}>New invoice</Btn>,
      ]} />

      {/* Dashboard cards — all live off the schedule, never stored flags */}
      <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <KPICard label="Outstanding"     value={invMoney(agg.outstanding)}   sub={`${nonPaidCount} open invoice${nonPaidCount === 1 ? '' : 's'}`} icon="invoice" iconBg={DS.warningBg} accent={DS.warning} />
        <KPICard label="Overdue"         value={invMoney(agg.overdue)}       sub={`${counts.overdue} invoice${counts.overdue === 1 ? '' : 's'}`} icon="alert" iconBg={DS.dangerBg} accent={DS.danger} trendDir={agg.overdue ? 'down' : undefined} trend={agg.overdue ? 'Action needed' : undefined} />
        <KPICard label="Paid this month" value={invMoney(agg.paidThisMonth)}  sub={`${counts.paid} fully paid`} icon="check" iconBg={DS.successBg} accent={DS.success} trendDir="up" trend="Collected" />
        <KPICard label="Total billed"    value={invMoney(agg.billed)}         sub="This cycle" icon="chart" iconBg={DS.accentLight} accent={DS.accent} />
      </div>

      <InvAnalyticsStrip agg={agg} aging={aging} />

      {/* Toolbar — filters + search */}
      <div style={{ display:'flex', gap:12, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:8, cursor:'pointer',
              border:`1px solid ${filter === id ? DS.accentBorder : DS.border}`,
              background: filter === id ? DS.accentLight : DS.bg,
              color: filter === id ? DS.accent : DS.muted,
              fontSize:13, fontWeight: filter === id ? 600 : 500,
            }}>
              {label}
              <span style={{ fontSize:11, fontWeight:700, padding:'0 6px', borderRadius:10, minWidth:18, textAlign:'center', background: filter === id ? DS.accent : DS.surface, color: filter === id ? '#fff' : DS.muted }}>{counts[id]}</span>
            </button>
          ))}
        </div>
        <div style={{ flex:1, minWidth:200, display:'flex' }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, family or student…" />
        </div>
      </div>

      {/* Invoice list */}
      <Card style={{ overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="invoice" title="No invoices" message={q || filter !== 'all' ? 'No invoices match the current filter or search.' : 'Create your first invoice to get started.'} action={!q && filter === 'all' && <Btn variant="primary" icon="plus" onClick={() => setShowNew(true)}>New invoice</Btn>} />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                  {['Invoice','Family / students','Classes','Schedule','Issued','Status','Actions'].map((h, i) => (
                    <th key={h} style={{
                      padding:'10px 16px', textAlign: i === 6 ? 'right' : 'left', whiteSpace:'nowrap',
                      fontSize:11, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', background:DS.surface,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e, i) => (
                  <InvoiceRow key={e.inv.id} entry={e} isLast={i === pageRows.length - 1} onOpen={setOpenId} onRemind={quickRemind} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:12, flexWrap:'wrap' }}>
        <div style={{ fontSize:12, color:DS.faint }}>
          Showing {filtered.length === 0 ? 0 : curInvPage * INV_PER_PAGE + 1}–{Math.min((curInvPage + 1) * INV_PER_PAGE, filtered.length)} of {filtered.length} invoices · status is derived live from each payment schedule.
        </div>
        {invPageCount > 1 && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Btn small variant="secondary" icon="chevron_l" onClick={() => setInvPage(p => Math.max(0, p - 1))} style={curInvPage === 0 ? { opacity:0.5, pointerEvents:'none' } : {}}>Prev</Btn>
            <span style={{ fontSize:12, color:DS.muted, whiteSpace:'nowrap' }}>Page {curInvPage + 1} of {invPageCount}</span>
            <Btn small variant="secondary" icon="chevron_r" onClick={() => setInvPage(p => Math.min(invPageCount - 1, p + 1))} style={curInvPage >= invPageCount - 1 ? { opacity:0.5, pointerEvents:'none' } : {}}>Next</Btn>
          </div>
        )}
      </div>

      {/* Detail drawer + modals + toast */}
      <InvoiceDetailDrawer entry={openEntry} store={store} onClose={() => setOpenId(null)} onToast={fireToast} />
      <InvReconModal open={showImport} onClose={() => setShowImport(false)} store={store} onToast={fireToast} />
      <InvTaxModal open={showTax} onClose={() => setShowTax(false)} store={store} onToast={fireToast} />
      <InvCreateModal open={showNew} onClose={() => setShowNew(false)} store={store} onToast={fireToast} />
      <InvToast toast={toast} />
    </div>
  );
};

// Export the ledger's own rollup + money formatter so the centre-metrics layer
// (centreMetrics.getInvoiceRollup) and the Dashboard can REFERENCE the derived
// outstanding/overdue figures instead of re-deriving (forking) invoice maths.
Object.assign(window, { AdminInvoicesPage, invAggregate, invMoney });
