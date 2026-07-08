// ══════════════════════════════════════════════════════════════
//  TutorOS — Timesheets module (teacher working hours)
//
//  Working hours split across two surfaces by their natural lifecycle:
//    • Capture rides the existing register flow (TimesheetCapture, rendered
//      inline inside TeacherAttendancePage). No separate clock-in.
//    • Review & export gets dedicated pages:
//        TeacherTimesheetPage  (route teacher/`timesheet`  — "My timesheet")
//        AdminTimesheetsPage   (route admin/`timesheets`   — Staff › Timesheets)
//
//  One entity — TimeEntry (see mocks/timesheets.mock.jsx):
//    { id, centreId, teacherId, sessionId, type, date, durationMinutes,
//      status, note, approvedBy, approvedAt }
//
//  Persisted to localStorage `tutoros.timesheets.v3`, seeded from
//  SEED_TIME_ENTRIES. Like the admin store, each page/component calls
//  useTimesheetStore() independently — state syncs through localStorage, so a
//  change on one surface reflects on another after remount (fine for the demo;
//  within one page approve/reject/submit update live).
//
//  Reuses the shared design system (DS, Card, KPICard, Btn, Badge, Table,
//  Modal, Field…) and the white-content / accent look. Lifecycle status reads
//  at a glance via Badge variants. The print/PDF view is the one place we drop
//  into a plain document layout.
// ══════════════════════════════════════════════════════════════

const TIMESHEET_KEY    = 'tutoros.timesheets.v3';   // v3: reseed relative-to-today so the current period always has data
const TIMESHEET_CENTRE = 'centre-001';                  // single demo centre
const TIMESHEET_ADMIN  = { id: 'a1', name: 'Lisa Chen' }; // current admin (matches sidebar identity)

// Entry types — app config (labels + colour), not dummy data.
const TS_TYPES = [
  { id: 'teaching', label: 'Teaching', icon: 'graduation', color: '#4F46E5' },
  { id: 'prep',     label: 'Prep',     icon: 'edit',       color: '#0891B2' },
  { id: 'marking',  label: 'Marking',  icon: 'clip',       color: '#7C3AED' },
  { id: 'meeting',  label: 'Meeting',  icon: 'users',      color: '#D97706' },
  { id: 'cover',    label: 'Cover',    icon: 'send',       color: '#DB2777' },
  { id: 'training', label: 'Training', icon: 'star',       color: '#0D9488' },
  { id: 'other',    label: 'Other',    icon: 'dots',       color: '#6B7280' },
];
const TS_TYPE = Object.fromEntries(TS_TYPES.map(t => [t.id, t]));

// Lifecycle status — drives the at-a-glance Badge.
const TS_STATUS_META = {
  draft:     { label: 'Draft',     variant: 'default', color: DS.muted   },
  submitted: { label: 'Submitted', variant: 'info',    color: DS.info    },
  approved:  { label: 'Approved',  variant: 'success', color: DS.success },
  rejected:  { label: 'Rejected',  variant: 'danger',  color: DS.danger  },
  exported:  { label: 'Exported',  variant: 'accent',  color: DS.accent  },
};
// Teacher can still edit these (draft = not yet sent; rejected = sent back to fix).
const TS_TEACHER_EDITABLE = new Set(['draft', 'rejected']);
// Counts toward a payroll export once an admin has signed it off.
const tsIsApprovedLike = (e) => e.status === 'approved' || e.status === 'exported';

// Submission policy — how often the centre asks teachers to submit. Admin-set
// (AdminTimesheetsPage policy strip), read by the teacher page + both admin surfaces.
// `mode` is the cadence UNIT the period navigator (TsPeriodNav) steps through; `noun`
// labels it ("This week / Last fortnight / …"). This is the ONLY period control — there
// is no per-user week/fortnight/month filter.
const TS_FREQUENCIES = [
  { id: 'week',      label: 'Weekly',      mode: 'week',      noun: 'week'      },
  { id: 'fortnight', label: 'Fortnightly', mode: 'fortnight', noun: 'fortnight' },
  { id: 'month',     label: 'Monthly',     mode: 'month',     noun: 'month'     },
];
const TS_FREQ = Object.fromEntries(TS_FREQUENCIES.map(f => [f.id, f]));

// Centre pay policy lives in the timesheet store config (NOT the settings store) so
// the derived timesheet recomputes the moment an admin flips a toggle. `payNonSession`
// is the master switch; `paidCategories` then gates each non-session category. 'other'
// is intentionally never listed here → it is recorded but never pay-eligible.
const TS_PAID_CATEGORIES = [
  { id: 'prep',     label: 'Prep'     },
  { id: 'marking',  label: 'Marking'  },
  { id: 'meeting',  label: 'Meetings' },
  { id: 'training', label: 'Training' },
];
const TS_DEFAULT_CONFIG = {
  submissionFrequency: 'week',
  payNonSession: true,
  paidCategories: { prep: true, marking: true, meeting: true, training: true },
};

// ─── Employment + pay-eligibility (derivation only — never stored on the line) ───
// Each teacher carries an employment type + hourly rate on the admin store record
// (payType / hourlyRate, edited inline in Settings → Centre). These seed defaults give
// the demo a realistic spread (Sarah = mixed, David/Tom = hourly) before any edit; a
// stored value on the teacher always wins.
const TS_EMPLOYMENT_TYPES = [
  { id: 'salaried', label: 'Salaried' },
  { id: 'hourly',   label: 'Hourly'   },
  { id: 'mixed',    label: 'Mixed'    },
];
const TS_EMP_LABEL = Object.fromEntries(TS_EMPLOYMENT_TYPES.map(e => [e.id, e.label]));
const TS_EMP_DEFAULTS = {
  t1: { payType: 'mixed',  hourlyRate: 35 },  // Sarah Clarke — salary + paid cover/extras
  t3: { payType: 'hourly', hourlyRate: 32 },  // David Park
  t8: { payType: 'hourly', hourlyRate: 28 },  // Tom Rivera
};
const tsEmployment = (teacher) => {
  if (!teacher) return { payType: 'salaried', hourlyRate: 0 };
  const d = TS_EMP_DEFAULTS[teacher.id] || { payType: 'salaried', hourlyRate: 0 };
  return {
    payType: teacher.payType || d.payType,
    hourlyRate: (teacher.hourlyRate != null ? teacher.hourlyRate : d.hourlyRate) || 0,
  };
};

const tsIsTeachingType = (type) => type === 'teaching' || type === 'cover';

// Who the class is rostered to (sessionId = `${classId}|date`) — used to tell a
// teacher's own session apart from cover/extra delivery.
const tsRosteredTeacherId = (sessionId, teachers, classes) => {
  if (!sessionId) return null;
  const classId = String(sessionId).split('|')[0];
  const cls = (classes || window.SEED_CLASSES || []).find(c => c.id === classId);
  if (!cls) return null;
  const t = (teachers || window.SEED_TEACHERS || []).find(x => x.name === cls.teacher);
  return t ? t.id : null;
};

// The pay rules, in one place. ctx = { teacher, rosteredTeacherId, config }.
//   Teaching/cover : hourly → paid · salaried → never · mixed → only cover/extra
//   Non-session    : paid only if centre pays non-session AND the category is paid
//                    AND the teacher is hourly or mixed
// Salaried lines always report hours but no pay (kept for the audit trail).
const tsPayFor = (entry, ctx) => {
  const { payType, hourlyRate } = tsEmployment(ctx.teacher);
  const hours = tsHours(entry.durationMinutes);
  const isTeaching = tsIsTeachingType(entry.type);
  const isCoverExtra = entry.type === 'cover'
    || (!!entry.sessionId && !!ctx.rosteredTeacherId && entry.teacherId !== ctx.rosteredTeacherId);
  let eligible = false;
  if (isTeaching) {
    if (payType === 'hourly') eligible = true;
    else if (payType === 'mixed') eligible = isCoverExtra;
    else eligible = false;                                   // salaried
  } else {
    const cfg = ctx.config || {};
    const catPaid = cfg.payNonSession && (cfg.paidCategories || {})[entry.type];
    eligible = !!catPaid && (payType === 'hourly' || payType === 'mixed');
  }
  return {
    payType, rate: hourlyRate, hours, eligible, isCoverExtra,
    estPay: eligible ? Math.round(hours * hourlyRate * 100) / 100 : 0,
  };
};
const tsMoney = (n) => '£' + (Math.round((n || 0) * 100) / 100).toFixed(2);

// Build a pay-context resolver for a set of entries from the admin store (teachers +
// classes) and the centre pay config. One place wires the derivation inputs together.
const tsMakeResolve = (adminStore, config) => (entry) => {
  const teacher = adminStore.teachers.find(t => t.id === entry.teacherId);
  const rosteredTeacherId = tsRosteredTeacherId(entry.sessionId, adminStore.teachers, adminStore.classes);
  let scheduledMinutes = entry.durationMinutes;
  if (entry.sessionId) {
    const cls = adminStore.classes.find(c => c.id === String(entry.sessionId).split('|')[0]);
    if (cls) scheduledMinutes = tsSessionMinutes(cls.time);
  }
  return { teacher, rosteredTeacherId, config, scheduledMinutes };
};

// ─── Pure helpers ────────────────────────────────────────────────────────────
const tsUID = (p = 'te') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Today's *local* calendar date (no UTC conversion, so no off-by-one in +UTC zones).
const tsTodayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// Date arithmetic stays entirely in UTC so an ISO date round-trips exactly (parse →
// math → format) — mixing local parse with toISOString() drifts a day in +UTC zones.
const tsParseUTC = (iso) => new Date(iso + 'T00:00:00Z');
const tsAddDays = (iso, n) => { const d = tsParseUTC(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const tsWeekStart = (iso) => { const d = tsParseUTC(iso); const off = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - off); return d.toISOString().slice(0, 10); }; // Monday
const tsMonthStart = (iso) => iso.slice(0, 8) + '01';
const tsMonthEnd = (iso) => { const d = tsParseUTC(iso); d.setUTCMonth(d.getUTCMonth() + 1, 0); return d.toISOString().slice(0, 10); };
const tsAddMonths = (iso, n) => { const d = tsParseUTC(iso); d.setUTCMonth(d.getUTCMonth() + n, 1); return d.toISOString().slice(0, 10); };

const tsFmtDuration = (min) => {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
};
const tsHours = (min) => Math.round(((min || 0) / 60) * 100) / 100;   // decimal hours for CSV / totals
const tsDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
const tsDateShort = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const tsDateLong = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const tsStamp = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// Derive scheduled minutes from a class time string like "09:00–10:30".
const tsSessionMinutes = (time) => {
  if (!time) return 90;
  const parts = String(time).split(/[–-]/).map(s => s.trim());
  if (parts.length < 2) return 90;
  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const a = toMin(parts[0]), b = toMin(parts[1]);
  return (a != null && b != null && b > a) ? b - a : 90;
};

const tsTeacherName = (id) => {
  const t = (window.SEED_TEACHERS || []).find(x => x.id === id);
  return t ? t.name : id;
};
// Human reference for a captured teaching session ("c1|2026-06-26").
const tsSessionRef = (sessionId) => {
  if (!sessionId) return '';
  const [classId, date] = String(sessionId).split('|');
  const cls = (window.SEED_CLASSES || []).find(c => c.id === classId);
  if (cls) return `${cls.name} · ${cls.group}`;
  return classId || sessionId;
};

// A period is EITHER a cadence-relative window (integer offset from the current
// period — 0 = current, -1 = previous…) OR a custom date range. The cadence UNIT
// is the centre's submission frequency — staff move through periods of that unit,
// they never pick week/fortnight/month themselves (that is the admin's policy).
const tsDefaultPeriod = () => ({ custom: false, offset: 0 });

// Window for a cadence unit (week / fortnight / month) at an offset from now.
const tsUnitRange = (unit, offset = 0) => {
  const t = tsTodayISO();
  // Fortnight = a rolling 14-day window aligned to weeks (last week + this week at offset 0).
  if (unit === 'fortnight') { const s = tsAddDays(tsAddDays(tsWeekStart(t), -7), offset * 14); return { from: s, to: tsAddDays(s, 13) }; }
  if (unit === 'month')     { const m = tsAddMonths(tsMonthStart(t), offset); return { from: m, to: tsMonthEnd(m) }; }
  const s = tsAddDays(tsWeekStart(t), offset * 7); return { from: s, to: tsAddDays(s, 6) };   // week (Monday-based)
};
// Resolve a period against the centre's submission frequency → { from, to }.
const tsRangeFor = (freq, period) => period.custom
  ? { from: period.from, to: period.to }
  : tsUnitRange((freq || TS_FREQ.week).mode, period.offset || 0);

const tsInRange = (iso, range) => iso >= range.from && iso <= range.to;
const tsRangeLabel = (range) => `${tsDateShort(range.from)} – ${tsDateShort(range.to)} ${range.to.slice(0, 4)}`;
// Relative label for a cadence offset ("This week", "Last fortnight", "3 months ago").
const tsRelLabel = (freq, offset) => {
  const noun = (freq || TS_FREQ.week).noun;
  if (offset === 0) return `This ${noun}`;
  if (offset === -1) return `Last ${noun}`;
  return `${-offset} ${noun}s ago`;
};

// The admin's selected period, remembered across the overview ⇄ per-teacher detail
// navigation (each page mounts fresh, so a module variable keeps them in sync).
let TS_ADMIN_PERIOD = null;
const tsAdminPeriod = () => TS_ADMIN_PERIOD || tsDefaultPeriod();
const tsSetAdminPeriod = (p) => { TS_ADMIN_PERIOD = p; };

// ─── Store (localStorage-backed) ─────────────────────────────────────────────
const useTimesheetStore = () => {
  const mergeConfig = (c) => ({
    ...TS_DEFAULT_CONFIG, ...(c || {}),
    paidCategories: { ...TS_DEFAULT_CONFIG.paidCategories, ...((c || {}).paidCategories || {}) },
  });
  const read = () => {
    try {
      const raw = localStorage.getItem(TIMESHEET_KEY);
      if (raw) { const p = JSON.parse(raw); return { entries: p.entries || SEED_TIME_ENTRIES, config: mergeConfig(p.config), cancelled: p.cancelled || [] }; }
    } catch (e) { /* ignore */ }
    return { entries: SEED_TIME_ENTRIES, config: mergeConfig(), cancelled: [] };
  };
  const [store, setStore] = React.useState(read);
  const persist = (next) => { setStore(next); try { localStorage.setItem(TIMESHEET_KEY, JSON.stringify(next)); } catch (e) {} };

  // Submission policy + pay policy. Admin-set, centre-wide. Patching paidCategories
  // merges (so toggling one category doesn't drop the others).
  const setConfig = (patch) => persist({
    ...store,
    config: { ...store.config, ...patch, paidCategories: { ...store.config.paidCategories, ...(patch.paidCategories || {}) } },
  });

  // A cancelled session produces no timesheet line. We remember its sessionId so the
  // day view can grey it; cancelling also removes any teaching line already captured.
  const setCancelled = (sessionId, flag) => {
    const set = new Set(store.cancelled || []);
    if (flag) set.add(sessionId); else set.delete(sessionId);
    persist({ ...store, cancelled: [...set], entries: flag ? store.entries.filter(e => e.sessionId !== sessionId) : store.entries });
  };

  // Capture from the register — upsert keyed on sessionId so confirming the
  // register a second time updates the existing entry, never duplicates it. We
  // never clobber a non-draft status (e.g. the entry was already submitted).
  // `type` is 'teaching' for the rostered teacher, 'cover' when delivered by someone
  // else. Confirming a register also lifts any prior cancellation on that session.
  const captureTeaching = ({ sessionId, teacherId, centreId, date, durationMinutes, note, type }) => {
    const kind = type || 'teaching';
    const existing = store.entries.find(e => e.sessionId === sessionId);
    const cancelled = (store.cancelled || []).filter(id => id !== sessionId);
    if (existing) {
      // Keep duration/note/deliverer in sync while still teacher-editable; never touch
      // a submitted/approved line (status nor deliverer).
      const live = TS_TEACHER_EDITABLE.has(existing.status);
      persist({ ...store, cancelled, entries: store.entries.map(e => e.sessionId === sessionId
        ? { ...e, durationMinutes, note: note != null ? note : e.note, ...(live ? { teacherId, type: kind } : {}) }
        : e) });
      return existing.id;
    }
    const entry = {
      id: tsUID(), centreId: centreId || TIMESHEET_CENTRE, teacherId, sessionId,
      type: kind, date, durationMinutes, status: 'draft', note: note || '',
      approvedBy: null, approvedAt: null,
    };
    persist({ ...store, cancelled, entries: [entry, ...store.entries] });
    return entry.id;
  };

  // Manual non-teaching entry (the only manual-entry path) — always sessionId:null.
  const addManual = ({ teacherId, centreId, type, date, durationMinutes, note }) => {
    const entry = {
      id: tsUID(), centreId: centreId || TIMESHEET_CENTRE, teacherId, sessionId: null,
      type: type || 'other', date, durationMinutes, status: 'draft', note: note || '',
      approvedBy: null, approvedAt: null,
    };
    persist({ ...store, entries: [entry, ...store.entries] });
    return entry.id;
  };

  const updateEntry = (id, patch) => persist({ ...store, entries: store.entries.map(e => e.id === id ? { ...e, ...patch } : e) });
  const removeEntry = (id) => persist({ ...store, entries: store.entries.filter(e => e.id !== id) });

  // Teacher submits a period: draft + rejected (sent back) entries → submitted.
  const submitEntries = (ids) => {
    const set = new Set(ids);
    persist({ ...store, entries: store.entries.map(e =>
      set.has(e.id) && TS_TEACHER_EDITABLE.has(e.status) ? { ...e, status: 'submitted' } : e) });
  };

  const approve = (id, adminId = TIMESHEET_ADMIN.id) => persist({ ...store, entries: store.entries.map(e =>
    e.id === id ? { ...e, status: 'approved', approvedBy: adminId, approvedAt: new Date().toISOString() } : e) });
  const approveMany = (ids, adminId = TIMESHEET_ADMIN.id) => {
    const set = new Set(ids); const at = new Date().toISOString();
    persist({ ...store, entries: store.entries.map(e =>
      set.has(e.id) && e.status === 'submitted' ? { ...e, status: 'approved', approvedBy: adminId, approvedAt: at } : e) });
  };
  // Reject sends it back — clears the approval stamp, keeps the note for context.
  const reject = (id, note) => persist({ ...store, entries: store.entries.map(e =>
    e.id === id ? { ...e, status: 'rejected', approvedBy: null, approvedAt: null, note: note != null ? note : e.note } : e) });
  // Flip approved → exported (kept behind the export action; never auto-flipped).
  const markExported = (ids) => {
    const set = new Set(ids);
    persist({ ...store, entries: store.entries.map(e => set.has(e.id) && e.status === 'approved' ? { ...e, status: 'exported' } : e) });
  };

  return { entries: store.entries, config: store.config, cancelled: store.cancelled || [], setConfig, setCancelled, captureTeaching, addManual, updateEntry, removeEntry, submitEntries, approve, approveMany, reject, markExported };
};

// ─── CSV + PDF export (no libraries) ─────────────────────────────────────────
const tsCsvEsc = (s) => { const v = String(s == null ? '' : s); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
// `resolve(entry)` returns { teacher, rosteredTeacherId, config, scheduledMinutes }
// so the export reports derived scheduled hours, pay-eligibility, rate and est. pay.
const tsBuildCSV = (entries, resolve) => {
  const head = ['Date', 'Teacher', 'Employment', 'Type', 'Detail', 'Scheduled hrs', 'Delivered hrs', 'Pay-eligible', 'Rate', 'Est. pay', 'Status'];
  const rows = entries.map(e => {
    const ctx = (resolve && resolve(e)) || {};
    const pay = tsPayFor(e, ctx);
    const sched = ctx.scheduledMinutes != null ? ctx.scheduledMinutes : e.durationMinutes;
    return [
      e.date, tsTeacherName(e.teacherId), TS_EMP_LABEL[pay.payType] || pay.payType,
      (TS_TYPE[e.type] || {}).label || e.type, e.sessionId ? tsSessionRef(e.sessionId) : (e.note || '—'),
      tsHours(sched).toFixed(2), tsHours(e.durationMinutes).toFixed(2),
      pay.eligible ? 'Yes' : 'No', pay.rate ? pay.rate.toFixed(2) : '—',
      pay.eligible ? pay.estPay.toFixed(2) : '—', (TS_STATUS_META[e.status] || {}).label || e.status,
    ];
  });
  return [head, ...rows].map(r => r.map(tsCsvEsc).join(',')).join('\r\n');
};
const tsDownloadCSV = (filename, text) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

// Print stylesheet — hides the app and shows only the .ts-print-root document so
// the browser's "Save as PDF" produces a clean per-teacher timesheet.
if (typeof document !== 'undefined' && !document.getElementById('ts-print-styles')) {
  const s = document.createElement('style');
  s.id = 'ts-print-styles';
  s.textContent = [
    '@media screen { .ts-print-root { display:none !important; } }',
    '@media print {',
    '  body * { visibility:hidden !important; }',
    '  .ts-print-root, .ts-print-root * { visibility:visible !important; }',
    '  .ts-print-root { display:block !important; position:absolute; left:0; top:0; width:100%; background:#fff; color:#111; }',
    '  .ts-print-page { page-break-after:always; }',
    '  .ts-print-page:last-child { page-break-after:auto; }',
    '  @page { margin:18mm; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}

// ─── Shared bits ─────────────────────────────────────────────────────────────
const TsTypePill = ({ type }) => {
  const t = TS_TYPE[type] || TS_TYPE.other;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DS.sub, fontWeight: 500 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: t.color, flexShrink: 0 }} />
      {t.label}
    </span>
  );
};
const TsStatusBadge = ({ status }) => {
  const m = TS_STATUS_META[status] || TS_STATUS_META.draft;
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

// Total + per-type breakdown for a set of entries.
const tsRollup = (entries) => {
  const total = entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const byType = {};
  entries.forEach(e => { byType[e.type] = (byType[e.type] || 0) + (e.durationMinutes || 0); });
  return { total, byType };
};

// Derived pay summary for a set of entries. `resolve(entry)` → pay ctx (teacher etc.).
// Returns total minutes, estimated eligible pay, and the count awaiting approval.
const tsPaySummary = (entries, resolve) => {
  let total = 0, eligiblePay = 0, awaiting = 0;
  entries.forEach(e => {
    total += e.durationMinutes || 0;
    if (e.status === 'submitted') awaiting += 1;
    eligiblePay += tsPayFor(e, (resolve && resolve(e)) || {}).estPay;
  });
  return { total, eligiblePay: Math.round(eligiblePay * 100) / 100, awaiting };
};

// A small "cover / extra" tag for lines paid as extra delivery.
const TsCoverTag = () => (
  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: TS_TYPE.cover.color, background: TS_TYPE.cover.color + '18', padding: '1px 6px', borderRadius: 5, textTransform: 'uppercase' }}>Cover</span>
);

// A stacked stat list — the single summary card on the timesheet pages.
const TsSummaryRows = ({ rows }) => (
  <div>
    {rows.map((r, i) => (
      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: r.accent ? DS.accentLight : DS.surface, color: r.accent ? DS.accent : DS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={r.icon} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: DS.muted }}>{r.label}</div>
          {r.sub && <div style={{ fontSize: 11, color: DS.faint, marginTop: 1 }}>{r.sub}</div>}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: r.accent ? DS.accent : DS.text, fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
      </div>
    ))}
  </div>
);

// Compact est-pay / eligibility chip used on review rows.
const TsPayChip = ({ pay }) => {
  if (pay.eligible) return <span style={{ fontSize: 12.5, fontWeight: 700, color: DS.success, fontVariantNumeric: 'tabular-nums' }}>{tsMoney(pay.estPay)}</span>;
  return <span style={{ fontSize: 11.5, color: DS.faint }} title={pay.payType === 'salaried' ? 'Salaried — recorded, not pay-eligible' : 'Not pay-eligible'}>{pay.payType === 'salaried' ? 'Salaried' : 'No pay'}</span>;
};

const TsTypeBreakdown = ({ entries }) => {
  const { total, byType } = tsRollup(entries);
  const rows = TS_TYPES.filter(t => byType[t.id]).map(t => ({ ...t, min: byType[t.id] }));
  if (!rows.length) return <div style={{ padding: '18px 20px', fontSize: 13, color: DS.faint }}>No hours in this period yet.</div>;
  return (
    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rows.map(t => {
        const pct = total ? Math.round((t.min / total) * 100) : 0;
        return (
          <div key={t.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <TsTypePill type={t.id} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(t.min)}</span>
            </div>
            <div style={{ height: 6, background: DS.surface, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Period navigator — locked to the centre's submission cadence. Staff step between
// consecutive periods of that unit (‹ prev / next ›, never into the future) or switch
// to a custom date range. There is deliberately NO week/fortnight/month choice here:
// the cadence is the admin's policy, not a per-user filter.
const TsPeriodNav = ({ freq, period, onChange }) => {
  const f = freq || TS_FREQ.week;
  const range = tsRangeFor(f, period);
  const offset = period.offset || 0;
  const custom = !!period.custom;
  const go = (d) => onChange({ custom: false, offset: Math.min(0, offset + d) });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {!custom ? (
        <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${DS.border}`, borderRadius: 9, background: DS.bg, overflow: 'hidden' }}>
          <button onClick={() => go(-1)} title={`Previous ${f.noun}`} style={tsNavArrow}>
            <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Icon name="chevron_r" size={15} color={DS.muted} /></span>
          </button>
          <div style={{ minWidth: 160, textAlign: 'center', padding: '5px 12px', borderLeft: `1px solid ${DS.border}`, borderRight: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, lineHeight: 1.25 }}>{tsRelLabel(f, offset)}</div>
            <div style={{ fontSize: 11, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{tsRangeLabel(range)}</div>
          </div>
          <button onClick={() => go(1)} disabled={offset >= 0} title={`Next ${f.noun}`}
            style={{ ...tsNavArrow, opacity: offset >= 0 ? 0.3 : 1, cursor: offset >= 0 ? 'default' : 'pointer' }}>
            <Icon name="chevron_r" size={15} color={DS.muted} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" value={period.from} max={period.to} onChange={e => onChange({ ...period, from: e.target.value })} style={tsDateInput} />
          <span style={{ color: DS.faint, fontSize: 13 }}>→</span>
          <input type="date" value={period.to} min={period.from} onChange={e => onChange({ ...period, to: e.target.value })} style={tsDateInput} />
        </div>
      )}
      {custom
        ? <Btn variant="secondary" small icon="calendar" onClick={() => onChange({ custom: false, offset: 0 })}>This {f.noun}</Btn>
        : <button onClick={() => onChange({ custom: true, from: range.from, to: range.to })} style={tsCustomLink}>Custom range</button>}
    </div>
  );
};
const tsNavArrow = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, background: 'none', border: 'none', cursor: 'pointer', padding: 0 };
const tsDateInput = { padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const tsCustomLink = { background: 'none', border: 'none', padding: '6px 4px', color: DS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };

// ════════════════════════════════════════════════════════════════════════════
//  CAPTURE — inline on the register flow (rendered inside TeacherAttendancePage)
// ════════════════════════════════════════════════════════════════════════════
// Default is the scheduled session time — no typing required for the common
// case. The teacher can nudge the duration (ran over / started late) and add an
// optional note. The draft TimeEntry is upserted on sessionId when the register
// is confirmed (`registered`) and stays in sync with later tweaks.
const TimesheetCapture = ({ session, registered, store: propStore, teachers, deliveredBy, onDeliveredBy, rosteredTeacherId, cancelled }) => {
  const ownStore = useTimesheetStore();
  const store = propStore || ownStore;
  const existing = session && session.sessionId ? store.entries.find(e => e.sessionId === session.sessionId) : null;
  const sched = (session && session.scheduledMinutes) || 90;
  const rostered = rosteredTeacherId || (session && session.teacherId);
  const isCover = !!deliveredBy && !!rostered && deliveredBy !== rostered;
  const locked = registered && existing && !TS_TEACHER_EDITABLE.has(existing.status);

  const [minutes, setMinutes] = React.useState(existing ? existing.durationMinutes : sched);
  const [note, setNote] = React.useState(existing ? (existing.note || '') : '');

  // Reset when the session (class/date) changes — pull saved values if the entry
  // already exists, otherwise fall back to the scheduled default.
  React.useEffect(() => {
    setMinutes(existing ? existing.durationMinutes : sched);
    setNote(existing ? (existing.note || '') : '');
  }, [session && session.sessionId]); // eslint-disable-line

  // Persist on confirm + keep in sync with later adjustments (idempotent upsert).
  // A cancelled session never produces a line.
  React.useEffect(() => {
    if (!registered || cancelled || !session || !session.sessionId) return;
    store.captureTeaching({
      sessionId: session.sessionId, teacherId: deliveredBy || session.teacherId, centreId: session.centreId,
      date: session.date, durationMinutes: minutes, note, type: isCover ? 'cover' : 'teaching',
    });
  }, [registered, minutes, note, deliveredBy, cancelled]); // eslint-disable-line

  if (!session) return null;
  const adjust = (delta) => !locked && setMinutes(m => Math.max(15, m + delta));
  const changed = minutes !== sched;
  const teacherList = teachers || [];

  return (
    <div style={{ padding: '14px 16px', borderTop: `1px solid ${DS.border}`, background: DS.surface, opacity: cancelled ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="clock" size={15} color={DS.accent} />
        <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>Confirm delivery</span>
        {isCover && <TsCoverTag />}
        {registered && !cancelled && <TsStatusBadge status={existing ? existing.status : 'draft'} />}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: DS.faint }}>Scheduled {tsFmtDuration(sched)}</span>
      </div>

      {/* Delivered by — defaults to the rostered teacher; a different adult = cover */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: DS.sub, fontWeight: 500, minWidth: 80 }}>Delivered by</span>
        <Select value={deliveredBy || ''} onChange={e => onDeliveredBy && onDeliveredBy(e.target.value)}
          style={{ width: 220, opacity: locked ? 0.6 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
          {teacherList.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.id === rostered ? ' (rostered)' : ''}</option>
          ))}
        </Select>
        {isCover && <span style={{ fontSize: 11.5, color: TS_TYPE.cover.color }}>Logged as cover on their timesheet</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: DS.sub, fontWeight: 500, minWidth: 80 }}>Delivered</span>
        {/* Duration stepper — defaults to scheduled; ±15 for ran-over / started-late */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => adjust(-15)} title="Started late / shorter" style={{ ...tsStepBtn, opacity: locked ? 0.5 : 1 }}>−15m</button>
          <div style={{ minWidth: 86, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: DS.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(minutes)}</div>
            <div style={{ fontSize: 10.5, color: changed ? DS.accent : DS.faint, marginTop: 2 }}>{changed ? 'adjusted' : 'as scheduled'}</div>
          </div>
          <button onClick={() => adjust(15)} title="Ran over / longer" style={{ ...tsStepBtn, opacity: locked ? 0.5 : 1 }}>+15m</button>
          {changed && !locked && (
            <button onClick={() => setMinutes(sched)} style={{ ...tsLinkBtn, marginLeft: 2 }}>Reset</button>
          )}
        </div>

        {/* Optional note */}
        <input
          value={note} onChange={e => !locked && setNote(e.target.value)} disabled={locked}
          placeholder="Add a note (optional) — e.g. ran 15 min over"
          style={{
            flex: 1, minWidth: 200, padding: '8px 11px', borderRadius: 7,
            border: `1px solid ${DS.border}`, fontSize: 13, color: DS.text, outline: 'none', background: DS.bg, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginTop: 9, fontSize: 11.5, color: DS.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
        {cancelled ? (
          <span>Session cancelled — no working time is logged.</span>
        ) : registered ? (
          <>
            <Icon name="check" size={13} color={DS.success} />
            <span>{locked ? 'Confirmed delivery — this record is now locked.' : 'Saved as a draft on your timesheet — adjust anytime before you submit.'}</span>
            <button onClick={() => window.__navigate && window.__navigate('teacher', 'timesheet')} style={tsLinkBtn}>View timesheet →</button>
          </>
        ) : (
          <span>Defaults to the scheduled time. Saving the register logs these hours to {isCover ? 'the cover teacher’s' : 'your'} timesheet.</span>
        )}
      </div>
    </div>
  );
};
const tsStepBtn = {
  padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, background: DS.bg,
  color: DS.sub, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};
const tsLinkBtn = {
  background: 'none', border: 'none', padding: 0, color: DS.accent, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
};

// ════════════════════════════════════════════════════════════════════════════
//  TEACHER — My timesheet (route teacher/`timesheet`)
// ════════════════════════════════════════════════════════════════════════════
const TS_DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const AddEntryModal = ({ open, onClose, onAdd }) => {
  const [type, setType] = React.useState('prep');
  const [date, setDate] = React.useState(tsTodayISO());
  const [minutes, setMinutes] = React.useState(60);
  const [note, setNote] = React.useState('');
  React.useEffect(() => { if (open) { setType('prep'); setDate(tsTodayISO()); setMinutes(60); setNote(''); } }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add non-teaching time" subtitle="Prep, marking, meetings and other hours away from the register" icon="clock" width={500}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="plus" onClick={() => { onAdd({ type, date, durationMinutes: minutes, note }); onClose(); }}>Add entry</Btn>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Type" style={{ marginBottom: 0 }}>
          <Select value={type} onChange={e => setType(e.target.value)}>
            {TS_TYPES.filter(t => t.id !== 'teaching').map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Date" style={{ marginBottom: 0 }}>
          <Input type="date" value={date} max={tsTodayISO()} onChange={e => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Duration" hint="Pick a preset or fine-tune below" style={{ marginTop: 14, marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {TS_DURATION_PRESETS.map(p => (
            <button key={p} onClick={() => setMinutes(p)} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${minutes === p ? DS.accentBorder : DS.border}`,
              background: minutes === p ? DS.accentLight : DS.bg, color: minutes === p ? DS.accent : DS.muted,
            }}>{tsFmtDuration(p)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMinutes(m => Math.max(15, m - 15))} style={tsStepBtn}>−15m</button>
          <span style={{ minWidth: 72, textAlign: 'center', fontSize: 16, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(minutes)}</span>
          <button onClick={() => setMinutes(m => m + 15)} style={tsStepBtn}>+15m</button>
        </div>
      </Field>
      <Field label="Note" style={{ marginTop: 14, marginBottom: 0 }}>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What was this time for?" style={{ minHeight: 60 }} />
      </Field>
    </Modal>
  );
};

const TeacherTimesheetPage = () => {
  const adminStore = useAdminStore();
  const me = adminStore.teachers.find(t => t.name === 'Sarah Clarke') || adminStore.teachers[0];
  const store = useTimesheetStore();
  const freq = TS_FREQ[store.config.submissionFrequency] || TS_FREQ.week;
  // Period always tracks the centre's submission cadence — current period by default.
  const [period, setPeriod] = React.useState(tsDefaultPeriod);
  const [adding, setAdding] = React.useState(false);

  const resolve = tsMakeResolve(adminStore, store.config);
  const range = tsRangeFor(freq, period);
  const mine = store.entries.filter(e => me && e.teacherId === me.id);
  const inPeriod = mine.filter(e => tsInRange(e.date, range)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const { total, byType } = tsRollup(inPeriod);
  const pay = tsPaySummary(inPeriod, resolve);
  const submittable = inPeriod.filter(e => TS_TEACHER_EDITABLE.has(e.status));

  // Group by day (newest first), each with a subtotal.
  const days = [];
  const byDay = {};
  inPeriod.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  Object.keys(byDay).sort((a, b) => a < b ? 1 : -1).forEach(d => days.push({ date: d, entries: byDay[d] }));

  const submitAll = () => { if (submittable.length) store.submitEntries(submittable.map(e => e.id)); };

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="My Timesheet" subtitle="Your teaching and non-teaching hours — captured from the register, submitted for approval"
        actions={[
          <Btn key="add" variant="secondary" icon="plus" small onClick={() => setAdding(true)}>Add entry</Btn>,
          <Btn key="sub" variant="primary" icon="check" small onClick={submitAll} style={submittable.length ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
            Submit {submittable.length || ''} for approval
          </Btn>,
        ]} />

      {/* Submission policy banner — set by the centre admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10, marginBottom: 16 }}>
        <Icon name="calendar" size={17} color={DS.accent} />
        <div style={{ flex: 1, fontSize: 13, color: DS.sub, lineHeight: 1.5 }}>
          Your centre asks teachers to submit their timesheet <strong style={{ color: DS.text }}>{freq.label.toLowerCase()}</strong>. Submitting sends every draft entry in the selected period for approval.
        </div>
        <Btn variant="secondary" small onClick={() => setPeriod(tsDefaultPeriod())}>This {freq.noun}</Btn>
      </div>

      {/* Period navigator — one submission period at a time, or a custom range */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodNav freq={freq} period={period} onChange={setPeriod} />
        <span style={{ fontSize: 12.5, color: DS.muted }}>{tsRangeLabel(range)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Entries grouped by day */}
        <Card title="Entries" subtitle={tsRangeLabel(range)}>
          {days.length ? days.map((d, di) => {
            const dTotal = d.entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
            return (
              <div key={d.date}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: DS.surface, borderBottom: `1px solid ${DS.border}`, borderTop: di ? `1px solid ${DS.border}` : 'none' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.sub }}>{tsDate(d.date)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(dTotal)}</span>
                </div>
                {d.entries.map((e, i) => (
                  <TeacherEntryRow key={e.id} entry={e} store={store} resolve={resolve} isLast={i === d.entries.length - 1} />
                ))}
              </div>
            );
          }) : (
            <EmptyState icon="clock" title="No hours logged in this period"
              message="Teaching time is captured when you take the register. Use “Add entry” for prep, marking and meetings." />
          )}
        </Card>

        {/* Summary + breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Single summary card — hours, teaching, awaiting + estimated eligible pay */}
          <Card title="This period" subtitle={tsRangeLabel(range)}>
            <TsSummaryRows rows={[
              { label: 'Total hours',      value: tsFmtDuration(total),               sub: `${inPeriod.length} entr${inPeriod.length === 1 ? 'y' : 'ies'}`, icon: 'clock' },
              { label: 'Teaching',         value: tsFmtDuration(byType.teaching || 0), sub: 'from the register',  icon: 'graduation' },
              { label: 'Awaiting / to submit', value: submittable.length,             sub: 'draft or sent back', icon: 'send' },
              { label: 'Est. eligible pay', value: tsMoney(pay.eligiblePay),           sub: 'before approval',    icon: 'invoice', accent: true },
            ]} />
          </Card>
          <Card title="Breakdown by type" icon="chart" accent={DS.accent}>
            <TsTypeBreakdown entries={inPeriod} />
          </Card>
          <div style={{ padding: '14px 16px', background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, display: 'flex', gap: 11 }}>
            <Icon name="alert" size={17} color={DS.muted} />
            <div style={{ fontSize: 12, color: DS.sub, lineHeight: 1.5 }}>
              Submitted and approved entries are <strong style={{ color: DS.text }}>read-only</strong>. If something needs fixing after approval, ask your admin to send it back.
            </div>
          </div>
        </div>
      </div>

      <AddEntryModal open={adding} onClose={() => setAdding(false)}
        onAdd={(e) => store.addManual({ ...e, teacherId: me && me.id, centreId: TIMESHEET_CENTRE })} />
    </div>
  );
};

const TeacherEntryRow = ({ entry, store, resolve, isLast }) => {
  const editable = TS_TEACHER_EDITABLE.has(entry.status);
  const t = TS_TYPE[entry.type] || TS_TYPE.other;
  const pay = tsPayFor(entry, (resolve && resolve(entry)) || {});
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : `1px solid ${DS.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={t.icon} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span>{t.label}{entry.sessionId ? <span style={{ color: DS.muted, fontWeight: 500 }}> · {tsSessionRef(entry.sessionId)}</span> : ''}</span>
          {pay.isCoverExtra && <TsCoverTag />}
        </div>
        {entry.note && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{entry.note}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums', width: 64, textAlign: 'right' }}>{tsFmtDuration(entry.durationMinutes)}</span>
      <div style={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}><TsPayChip pay={pay} /></div>
      <div style={{ width: 92, display: 'flex', justifyContent: 'flex-end' }}><TsStatusBadge status={entry.status} /></div>
      <div style={{ width: 28, display: 'flex', justifyContent: 'flex-end' }}>
        {editable && entry.sessionId == null && (
          <button onClick={() => store.removeEntry(entry.id)} title="Delete entry" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 4, display: 'flex' }}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN — Staff › Timesheets (route admin/`timesheets`)
//
//  Two surfaces, period remembered across both via TS_ADMIN_PERIOD:
//    • AdminTimesheetsPage      — submission policy + per-teacher summary list
//    • AdminTimesheetDetailPage — one teacher's sessions in the period (drill-in,
//                                 route admin/`timesheet_detail`, teacher id via
//                                 adminParam) where approve/reject/export live.
// ════════════════════════════════════════════════════════════════════════════

// Roll a set of entries up per teacher (count + total / approved / submitted mins).
const tsTeacherRollup = (entries) => {
  const by = {};
  entries.forEach(e => {
    const r = by[e.teacherId] = by[e.teacherId] || { id: e.teacherId, count: 0, total: 0, approved: 0, submitted: 0 };
    r.count += 1; r.total += e.durationMinutes || 0;
    if (tsIsApprovedLike(e)) r.approved += e.durationMinutes || 0;
    if (e.status === 'submitted') r.submitted += e.durationMinutes || 0;
  });
  return Object.values(by).sort((a, b) => tsTeacherName(a.id).localeCompare(tsTeacherName(b.id)));
};

const AdminTimesheetsPage = () => {
  const adminStore = useAdminStore();
  const store = useTimesheetStore();
  const freq = TS_FREQ[store.config.submissionFrequency] || TS_FREQ.week;
  const [period, setPeriod] = React.useState(tsAdminPeriod);
  const changePeriod = (p) => { tsSetAdminPeriod(p); setPeriod(p); };
  // Changing the cadence resets the view to the current period of the new unit.
  const setFrequency = (id) => { store.setConfig({ submissionFrequency: id }); changePeriod(tsDefaultPeriod()); };

  const resolve = tsMakeResolve(adminStore, store.config);
  const range = tsRangeFor(freq, period);
  const inPeriod = store.entries.filter(e => tsInRange(e.date, range));
  const teacherRows = tsTeacherRollup(inPeriod);

  const overall = inPeriod.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const approvedMin = inPeriod.filter(tsIsApprovedLike).reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const submittedIds = inPeriod.filter(e => e.status === 'submitted').map(e => e.id);
  const eligiblePay = tsPaySummary(inPeriod, resolve).eligiblePay;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="Staff Timesheets" subtitle="Review and approve your teachers' working hours — open a teacher to see their sessions" />

      {/* Submission policy — admin-set, centre-wide. Sets the cadence teachers submit
          on and the unit everyone reviews by (their page tracks the same setting). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Icon name="calendar" size={18} color={DS.accent} />
        <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: DS.sub, lineHeight: 1.5 }}>
          Staff submit their timesheets <strong style={{ color: DS.text }}>{freq.label.toLowerCase()}</strong>. This sets the period teachers see and submit — and the unit you review by below.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: DS.muted, fontWeight: 500 }}>Submission frequency</span>
          <Select value={store.config.submissionFrequency} onChange={e => setFrequency(e.target.value)} style={{ width: 150 }}>
            {TS_FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Period navigator — review one submission period at a time (or a custom range) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodNav freq={freq} period={period} onChange={changePeriod} />
        {submittedIds.length > 0 && (
          <Btn variant="primary" icon="check" small onClick={() => store.approveMany(submittedIds)}>Approve all {submittedIds.length} submitted</Btn>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Main table — per-teacher summary; click a teacher to open their sessions. */}
        <Card title="By teacher" subtitle={tsRangeLabel(range)}>
          {teacherRows.length ? teacherRows.map((r, i) => (
            <TeacherSummaryRow key={r.id} row={r} color={(adminStore.teachers.find(t => t.id === r.id) || {}).color}
              isLast={i === teacherRows.length - 1} onOpen={() => adminNav('timesheet_detail', r.id)} />
          )) : (
            <EmptyState icon="clock" title="No hours logged in this period"
              message="Try a different period — teaching time is captured when teachers take the register." />
          )}
        </Card>

        {/* Right rail — this-period stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* This period — hours, approvals, est. pay, awaiting, teacher count */}
          <Card title="This period" subtitle={tsRangeLabel(range)}>
            <TsSummaryRows rows={[
              { label: 'Total hours',       value: tsFmtDuration(overall),     sub: tsRangeLabel(range),   icon: 'clock' },
              { label: 'Approved hours',    value: tsFmtDuration(approvedMin), sub: 'signed off',          icon: 'check' },
              { label: 'Est. eligible pay', value: tsMoney(eligiblePay),       sub: 'derived from rates',  icon: 'invoice', accent: true },
              { label: 'Awaiting approval', value: submittedIds.length,        sub: 'submitted entries',   icon: 'send' },
              { label: 'Teachers',          value: teacherRows.length,         sub: 'in this period',      icon: 'users' },
            ]} />
          </Card>
        </div>
      </div>
    </div>
  );
};

// One clickable teacher row on the overview → opens the per-teacher detail page.
const TeacherSummaryRow = ({ row, color, isLast, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onOpen} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: hov ? DS.surface : 'transparent', border: 'none', borderBottom: isLast ? 'none' : `1px solid ${DS.border}`, cursor: 'pointer', textAlign: 'left' }}>
      <Avatar name={tsTeacherName(row.id)} size={36} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{tsTeacherName(row.id)}</div>
        <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{row.count} entr{row.count === 1 ? 'y' : 'ies'} this period</div>
      </div>
      {row.submitted > 0 && <Badge variant="info">{tsFmtDuration(row.submitted)} pending</Badge>}
      {row.approved > 0 && <span style={{ fontSize: 12, color: DS.success, fontWeight: 600 }}>{tsFmtDuration(row.approved)} approved</span>}
      <span style={{ fontSize: 14.5, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums', width: 72, textAlign: 'right' }}>{tsFmtDuration(row.total)}</span>
      <Icon name="chevron_r" size={16} color={hov ? DS.accent : DS.faint} />
    </button>
  );
};

// One reviewable entry on the detail page — approve / reject when submitted.
const AdminTimesheetEntryRow = ({ entry, store, resolve, isLast }) => {
  const t = TS_TYPE[entry.type] || TS_TYPE.other;
  const pay = tsPayFor(entry, (resolve && resolve(entry)) || {});
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : `1px solid ${DS.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={t.icon} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span>{t.label}{entry.sessionId ? <span style={{ color: DS.muted, fontWeight: 500 }}> · {tsSessionRef(entry.sessionId)}</span> : ''}</span>
          {pay.isCoverExtra && <TsCoverTag />}
        </div>
        {entry.note && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{entry.note}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums', width: 64, textAlign: 'right' }}>{tsFmtDuration(entry.durationMinutes)}</span>
      <div style={{ width: 78, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <TsPayChip pay={pay} />
        {pay.eligible && <span style={{ fontSize: 10, color: DS.faint, marginTop: 1 }}>@ {tsMoney(pay.rate)}/h</span>}
      </div>
      <div style={{ width: 92, display: 'flex', justifyContent: 'flex-end' }}><TsStatusBadge status={entry.status} /></div>
      <div style={{ width: 150, display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
        {entry.status === 'submitted' ? (
          <>
            <button onClick={() => store.approve(entry.id)} style={tsApproveBtn}>Approve</button>
            <button onClick={() => store.reject(entry.id)} style={tsRejectBtn}>Reject</button>
          </>
        ) : entry.approvedAt ? (
          <span style={{ fontSize: 11, color: DS.faint, textAlign: 'right' }}>{(tsTeacherName(entry.approvedBy) === entry.approvedBy ? TIMESHEET_ADMIN.name : tsTeacherName(entry.approvedBy))} · {tsStamp(entry.approvedAt)}</span>
        ) : <span style={{ fontSize: 11, color: DS.faint }}>—</span>}
      </div>
    </div>
  );
};

// ─── Per-teacher detail (route admin/`timesheet_detail`) ─────────────────────
// Opened from the overview; teacher id arrives on adminParam, period via the
// shared TS_ADMIN_PERIOD. Shows every session in the period grouped by day, with
// approve/reject + this-teacher CSV / print export.
const AdminTimesheetDetailPage = () => {
  const adminStore = useAdminStore();
  const store = useTimesheetStore();
  const teacherId = adminParam();
  const freq = TS_FREQ[store.config.submissionFrequency] || TS_FREQ.week;
  const [period, setPeriod] = React.useState(tsAdminPeriod);
  const changePeriod = (p) => { tsSetAdminPeriod(p); setPeriod(p); };
  const [status, setStatus] = React.useState('all');
  const [markExp, setMarkExp] = React.useState(false);
  const [printData, setPrintData] = React.useState(null);

  const range = tsRangeFor(freq, period);
  const teacher = adminStore.teachers.find(t => t.id === teacherId);
  const name = tsTeacherName(teacherId);

  const resolve = tsMakeResolve(adminStore, store.config);
  const emp = tsEmployment(teacher);
  const mine = store.entries.filter(e => e.teacherId === teacherId && tsInRange(e.date, range));
  const filtered = mine.filter(e => status === 'all' || e.status === status)
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const { total, byType } = tsRollup(mine);
  const approvedScope = mine.filter(tsIsApprovedLike);
  const approvedMin = approvedScope.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const submittedIds = mine.filter(e => e.status === 'submitted').map(e => e.id);
  const eligiblePay = tsPaySummary(mine, resolve).eligiblePay;

  // Group the (status-filtered) entries by day, newest first.
  const byDay = {};
  filtered.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  const days = Object.keys(byDay).sort((a, b) => a < b ? 1 : -1).map(d => ({ date: d, entries: byDay[d] }));

  const exportRows = approvedScope.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const doExportCSV = () => {
    if (!exportRows.length) return;
    tsDownloadCSV(`timesheet-${name.toLowerCase().replace(/\s+/g, '-')}-${range.from}_${range.to}.csv`, tsBuildCSV(exportRows, resolve));
    if (markExp) store.markExported(exportRows.filter(e => e.status === 'approved').map(e => e.id));
  };
  const doPrint = () => {
    if (!exportRows.length) return;
    setPrintData({ groups: [{ id: teacherId, name, entries: exportRows }], range, periodLabel: tsRangeLabel(range) });
    if (markExp) store.markExported(exportRows.filter(e => e.status === 'approved').map(e => e.id));
  };
  React.useEffect(() => {
    if (!printData) return;
    const id = setTimeout(() => window.print(), 80);
    const after = () => setPrintData(null);
    window.addEventListener('afterprint', after);
    return () => { clearTimeout(id); window.removeEventListener('afterprint', after); };
  }, [printData]);

  if (!teacherId || !teacher) {
    return (
      <div style={{ padding: '32px' }}>
        <EmptyState icon="user" title="Teacher not found" message="Pick a teacher from the timesheets overview."
          action={<Btn variant="primary" onClick={() => adminNav('timesheets:review')}>Back to Timesheets</Btn>} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Back + title + export actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
        <button onClick={() => adminNav('timesheets:review')} title="Back to timesheets" style={{
          background: 'none', border: `1px solid ${DS.border}`, borderRadius: 8, cursor: 'pointer',
          color: DS.muted, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Icon name="chevron_r" size={16} color={DS.muted} strokeWidth={2} /></span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} size={40} color={teacher.color} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.text, margin: 0, letterSpacing: '-0.4px' }}>{name}</h1>
            <p style={{ fontSize: 14, color: DS.muted, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{TS_EMP_LABEL[emp.payType]}{emp.payType !== 'salaried' && emp.hourlyRate ? ` · ${tsMoney(emp.hourlyRate)}/h` : ''}</span>
              <span style={{ color: DS.faint }}>·</span>
              <span>{tsRangeLabel(range)}</span>
            </p>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn variant="secondary" icon="download" small onClick={doExportCSV} style={exportRows.length ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Export CSV</Btn>
          <Btn variant="secondary" icon="print" small onClick={doPrint} style={exportRows.length ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Print / PDF</Btn>
        </div>
      </div>

      {/* Period navigator + status filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodNav freq={freq} period={period} onChange={changePeriod} />
        <Select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="all">All statuses</option>
          {Object.keys(TS_STATUS_META).map(s => <option key={s} value={s}>{TS_STATUS_META[s].label}</option>)}
        </Select>
      </div>

      {/* Bulk approve + export options */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {submittedIds.length > 0 && (
          <Btn variant="primary" icon="check" small onClick={() => store.approveMany(submittedIds)}>Approve all {submittedIds.length} submitted</Btn>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: DS.sub, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={markExp} onChange={e => setMarkExp(e.target.checked)} style={{ accentColor: DS.accent, width: 15, height: 15 }} />
          Mark approved as exported after download
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Sessions grouped by day */}
        <Card title="Sessions" subtitle={tsRangeLabel(range)}>
          {days.length ? days.map((d, di) => {
            const dTotal = d.entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
            return (
              <div key={d.date}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: DS.surface, borderBottom: `1px solid ${DS.border}`, borderTop: di ? `1px solid ${DS.border}` : 'none' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.sub }}>{tsDate(d.date)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(dTotal)}</span>
                </div>
                {d.entries.map((e, i) => (
                  <AdminTimesheetEntryRow key={e.id} entry={e} store={store} resolve={resolve} isLast={i === d.entries.length - 1} />
                ))}
              </div>
            );
          }) : (
            <EmptyState icon="filter" title="No sessions match this filter"
              message="Try a different period or status." />
          )}
        </Card>

        {/* Summary + breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Single summary card — hours, teaching, pay, approved + awaiting */}
          <Card title="This period" subtitle={tsRangeLabel(range)}>
            <TsSummaryRows rows={[
              { label: 'Total hours',       value: tsFmtDuration(total),                sub: `${mine.length} entr${mine.length === 1 ? 'y' : 'ies'}`, icon: 'clock' },
              { label: 'Teaching',          value: tsFmtDuration(byType.teaching || 0),  sub: 'from the register', icon: 'graduation' },
              { label: 'Est. eligible pay', value: tsMoney(eligiblePay),                 sub: emp.payType === 'salaried' ? 'salaried' : `@ ${tsMoney(emp.hourlyRate)}/h`, icon: 'invoice', accent: true },
              { label: 'Approved hours',    value: tsFmtDuration(approvedMin),            sub: 'signed off', icon: 'check' },
              { label: 'Awaiting approval', value: submittedIds.length,                  sub: 'submitted entries', icon: 'send' },
            ]} />
          </Card>
          <Card title="Breakdown by type" icon="chart" accent={DS.accent}>
            <TsTypeBreakdown entries={mine} />
          </Card>
          <div style={{ padding: '14px 16px', background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, display: 'flex', gap: 11 }}>
            <Icon name="alert" size={17} color={DS.muted} />
            <div style={{ fontSize: 12, color: DS.sub, lineHeight: 1.5 }}>
              Export and print act on <strong style={{ color: DS.text }}>approved</strong> hours only. Approve submitted sessions above to include them.
            </div>
          </div>
        </div>
      </div>

      {/* Print document (hidden on screen) */}
      {printData && <TimesheetPrintDoc data={printData} />}
    </div>
  );
};
const tsApproveBtn = { padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${DS.successBorder}`, background: DS.successBg, color: DS.success };
const tsRejectBtn  = { padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${DS.dangerBorder}`,  background: DS.dangerBg,  color: DS.danger  };

// ─── Print-styled per-teacher timesheet (plain document layout) ──────────────
const TimesheetPrintDoc = ({ data }) => (
  <div className="ts-print-root" style={{ fontFamily: 'Inter, sans-serif', color: '#111' }}>
    {data.groups.map(g => {
      const totalMin = g.entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
      return (
        <div key={g.id} className="ts-print-page" style={{ padding: '0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #111', paddingBottom: 10, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Timesheet</div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{g.name}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#444' }}>
              <div style={{ fontWeight: 700, color: '#111' }}>Klayo · {(window.centreMetrics && window.centreMetrics.getActiveCentre().name) || 'Bright Minds'}</div>
              <div>{data.periodLabel}</div>
              <div>Generated {tsDateLong(tsTodayISO())}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #999', textAlign: 'left' }}>
                {['Date', 'Type', 'Session', 'Note', 'Hours'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', textAlign: h === 'Hours' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.entries.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                  <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{tsDate(e.date)}</td>
                  <td style={{ padding: '7px 8px' }}>{(TS_TYPE[e.type] || {}).label || e.type}</td>
                  <td style={{ padding: '7px 8px' }}>{e.sessionId ? tsSessionRef(e.sessionId) : '—'}</td>
                  <td style={{ padding: '7px 8px', color: '#555' }}>{e.note || ''}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tsHours(e.durationMinutes).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #111' }}>
                <td colSpan={4} style={{ padding: '9px 8px', fontWeight: 700 }}>Total — {g.entries.length} entr{g.entries.length === 1 ? 'y' : 'ies'}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{tsHours(totalMin).toFixed(2)} h</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444' }}>
            <div>Approved by: ____________________</div>
            <div>Signature: ____________________</div>
            <div>Date: ____________</div>
          </div>
        </div>
      );
    })}
  </div>
);

Object.assign(window, {
  useTimesheetStore, TimesheetCapture, TeacherTimesheetPage, AdminTimesheetsPage, AdminTimesheetDetailPage,
  tsSessionMinutes, tsTodayISO, TIMESHEET_CENTRE,
  // Shared with Settings (centre pay config + per-teacher employment) and the register.
  TS_PAID_CATEGORIES, TS_EMPLOYMENT_TYPES, TS_EMP_LABEL, tsEmployment, tsMoney, tsRosteredTeacherId,
});
