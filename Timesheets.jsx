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
//  Persisted to localStorage `tutoros.timesheets.v1`, seeded from
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

const TIMESHEET_KEY    = 'tutoros.timesheets.v1';
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
// (AdminTimesheetsPage), read by the teacher page to default its period + show a
// policy banner. Each maps onto a TsPeriodControl mode.
const TS_FREQUENCIES = [
  { id: 'week',      label: 'Weekly',      mode: 'week',      noun: 'week'      },
  { id: 'fortnight', label: 'Fortnightly', mode: 'fortnight', noun: 'fortnight' },
  { id: 'month',     label: 'Monthly',     mode: 'month',     noun: 'month'     },
];
const TS_FREQ = Object.fromEntries(TS_FREQUENCIES.map(f => [f.id, f]));
const TS_DEFAULT_CONFIG = { submissionFrequency: 'week' };

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

const tsDefaultPeriod = () => { const s = tsWeekStart(tsTodayISO()); return { mode: 'week', from: s, to: tsAddDays(s, 6) }; };
const tsRangeOf = (period) => {
  const t = tsTodayISO();
  if (period.mode === 'week')      { const s = tsWeekStart(t); return { from: s, to: tsAddDays(s, 6) }; }
  // Fortnight = last week + this week (14 days ending this Sunday).
  if (period.mode === 'fortnight') { const s = tsAddDays(tsWeekStart(t), -7); return { from: s, to: tsAddDays(s, 13) }; }
  if (period.mode === 'month')     return { from: tsMonthStart(t), to: tsMonthEnd(t) };
  return { from: period.from, to: period.to };
};
const tsInRange = (iso, range) => iso >= range.from && iso <= range.to;
const tsRangeLabel = (range) => `${tsDateShort(range.from)} – ${tsDateShort(range.to)} ${range.to.slice(0, 4)}`;
// Build a period object for a submission-frequency policy (week / fortnight / month).
const tsPeriodForFreq = (freq) => { const mode = (TS_FREQ[freq] || TS_FREQ.week).mode; const r = tsRangeOf({ mode }); return { mode, from: r.from, to: r.to }; };

// The admin's selected period, remembered across the overview ⇄ per-teacher detail
// navigation (each page mounts fresh, so a module variable keeps them in sync).
let TS_ADMIN_PERIOD = null;
const tsAdminPeriod = () => TS_ADMIN_PERIOD || tsDefaultPeriod();
const tsSetAdminPeriod = (p) => { TS_ADMIN_PERIOD = p; };

// ─── Store (localStorage-backed) ─────────────────────────────────────────────
const useTimesheetStore = () => {
  const read = () => {
    try {
      const raw = localStorage.getItem(TIMESHEET_KEY);
      if (raw) { const p = JSON.parse(raw); return { entries: p.entries || SEED_TIME_ENTRIES, config: { ...TS_DEFAULT_CONFIG, ...(p.config || {}) } }; }
    } catch (e) { /* ignore */ }
    return { entries: SEED_TIME_ENTRIES, config: { ...TS_DEFAULT_CONFIG } };
  };
  const [store, setStore] = React.useState(read);
  const persist = (next) => { setStore(next); try { localStorage.setItem(TIMESHEET_KEY, JSON.stringify(next)); } catch (e) {} };

  // Submission policy (e.g. how often teachers submit). Admin-set, centre-wide.
  const setConfig = (patch) => persist({ ...store, config: { ...store.config, ...patch } });

  // Capture from the register — upsert keyed on sessionId so confirming the
  // register a second time updates the existing entry, never duplicates it. We
  // never clobber a non-draft status (e.g. the entry was already submitted).
  const captureTeaching = ({ sessionId, teacherId, centreId, date, durationMinutes, note }) => {
    const existing = store.entries.find(e => e.sessionId === sessionId);
    if (existing) {
      // Update duration/note in place; never touch the status (it may already be submitted).
      persist({ ...store, entries: store.entries.map(e => e.sessionId === sessionId
        ? { ...e, durationMinutes, note: note != null ? note : e.note }
        : e) });
      return existing.id;
    }
    const entry = {
      id: tsUID(), centreId: centreId || TIMESHEET_CENTRE, teacherId, sessionId,
      type: 'teaching', date, durationMinutes, status: 'draft', note: note || '',
      approvedBy: null, approvedAt: null,
    };
    persist({ ...store, entries: [entry, ...store.entries] });
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

  return { entries: store.entries, config: store.config, setConfig, captureTeaching, addManual, updateEntry, removeEntry, submitEntries, approve, approveMany, reject, markExported };
};

// ─── CSV + PDF export (no libraries) ─────────────────────────────────────────
const tsCsvEsc = (s) => { const v = String(s == null ? '' : s); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const tsBuildCSV = (entries) => {
  const head = ['Teacher', 'Date', 'Type', 'Hours', 'Session reference', 'Status', 'Note'];
  const rows = entries.map(e => [
    tsTeacherName(e.teacherId), e.date, (TS_TYPE[e.type] || {}).label || e.type,
    tsHours(e.durationMinutes).toFixed(2), e.sessionId ? tsSessionRef(e.sessionId) : '—',
    (TS_STATUS_META[e.status] || {}).label || e.status, e.note || '',
  ]);
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

// Period control — This week / This month / Custom (with two date inputs).
const TsPeriodControl = ({ period, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
    <Segmented
      value={period.mode}
      onChange={(mode) => onChange({ ...period, mode })}
      options={[{ id: 'week', label: 'Week' }, { id: 'fortnight', label: 'Fortnight' }, { id: 'month', label: 'Month' }, { id: 'custom', label: 'Custom' }]}
    />
    {period.mode === 'custom' && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="date" value={period.from} max={period.to} onChange={e => onChange({ ...period, from: e.target.value })}
          style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <span style={{ color: DS.faint, fontSize: 13 }}>→</span>
        <input type="date" value={period.to} min={period.from} onChange={e => onChange({ ...period, to: e.target.value })}
          style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
      </div>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
//  CAPTURE — inline on the register flow (rendered inside TeacherAttendancePage)
// ════════════════════════════════════════════════════════════════════════════
// Default is the scheduled session time — no typing required for the common
// case. The teacher can nudge the duration (ran over / started late) and add an
// optional note. The draft TimeEntry is upserted on sessionId when the register
// is confirmed (`registered`) and stays in sync with later tweaks.
const TimesheetCapture = ({ session, registered }) => {
  const store = useTimesheetStore();
  const existing = session && session.sessionId ? store.entries.find(e => e.sessionId === session.sessionId) : null;
  const sched = (session && session.scheduledMinutes) || 90;

  const [minutes, setMinutes] = React.useState(existing ? existing.durationMinutes : sched);
  const [note, setNote] = React.useState(existing ? (existing.note || '') : '');

  // Reset when the session (class/date) changes — pull saved values if the entry
  // already exists, otherwise fall back to the scheduled default.
  React.useEffect(() => {
    setMinutes(existing ? existing.durationMinutes : sched);
    setNote(existing ? (existing.note || '') : '');
  }, [session && session.sessionId]); // eslint-disable-line

  // Persist on confirm + keep in sync with later adjustments (idempotent upsert).
  React.useEffect(() => {
    if (!registered || !session || !session.sessionId) return;
    store.captureTeaching({
      sessionId: session.sessionId, teacherId: session.teacherId, centreId: session.centreId,
      date: session.date, durationMinutes: minutes, note,
    });
  }, [registered, minutes, note]); // eslint-disable-line

  if (!session) return null;
  const adjust = (delta) => setMinutes(m => Math.max(15, m + delta));
  const changed = minutes !== sched;

  return (
    <div style={{ padding: '14px 16px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="clock" size={15} color={DS.accent} />
        <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>Working time</span>
        {registered && <TsStatusBadge status={existing ? existing.status : 'draft'} />}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: DS.faint }}>Scheduled {tsFmtDuration(sched)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Duration stepper — defaults to scheduled; ±15 for ran-over / started-late */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => adjust(-15)} title="Started late / shorter" style={tsStepBtn}>−15m</button>
          <div style={{ minWidth: 86, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: DS.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{tsFmtDuration(minutes)}</div>
            <div style={{ fontSize: 10.5, color: changed ? DS.accent : DS.faint, marginTop: 2 }}>{changed ? 'adjusted' : 'as scheduled'}</div>
          </div>
          <button onClick={() => adjust(15)} title="Ran over / longer" style={tsStepBtn}>+15m</button>
          {changed && (
            <button onClick={() => setMinutes(sched)} style={{ ...tsLinkBtn, marginLeft: 2 }}>Reset</button>
          )}
        </div>

        {/* Optional note */}
        <input
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional) — e.g. ran 15 min over"
          style={{
            flex: 1, minWidth: 200, padding: '8px 11px', borderRadius: 7,
            border: `1px solid ${DS.border}`, fontSize: 13, color: DS.text, outline: 'none', background: DS.bg, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginTop: 9, fontSize: 11.5, color: DS.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
        {registered ? (
          <>
            <Icon name="check" size={13} color={DS.success} />
            <span>Saved as a draft on your timesheet — adjust anytime before you submit.</span>
            <button onClick={() => window.__navigate && window.__navigate('teacher', 'timesheet')} style={tsLinkBtn}>View timesheet →</button>
          </>
        ) : (
          <span>Defaults to the scheduled time. Saving the register logs these hours to your timesheet.</span>
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
  // Default the period to the centre's submission policy (weekly / fortnightly / monthly).
  const [period, setPeriod] = React.useState(() => tsPeriodForFreq(store.config.submissionFrequency));
  const [adding, setAdding] = React.useState(false);

  const range = tsRangeOf(period);
  const mine = store.entries.filter(e => me && e.teacherId === me.id);
  const inPeriod = mine.filter(e => tsInRange(e.date, range)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const { total, byType } = tsRollup(inPeriod);
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
        <Btn variant="secondary" small onClick={() => setPeriod(tsPeriodForFreq(freq.id))}>This {freq.noun}</Btn>
      </div>

      {/* Period + summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodControl period={period} onChange={setPeriod} />
        <span style={{ fontSize: 12.5, color: DS.muted }}>{tsRangeLabel(range)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Total hours" value={tsFmtDuration(total)} sub={`${inPeriod.length} entr${inPeriod.length === 1 ? 'y' : 'ies'}`} icon="clock" />
        <KPICard label="Teaching" value={tsFmtDuration(byType.teaching || 0)} sub="from the register" icon="graduation" />
        <KPICard label="Awaiting / to submit" value={submittable.length} sub="draft or sent back" icon="send" />
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
                  <TeacherEntryRow key={e.id} entry={e} store={store} isLast={i === d.entries.length - 1} />
                ))}
              </div>
            );
          }) : (
            <EmptyState icon="clock" title="No hours logged in this period"
              message="Teaching time is captured when you take the register. Use “Add entry” for prep, marking and meetings." />
          )}
        </Card>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

const TeacherEntryRow = ({ entry, store, isLast }) => {
  const editable = TS_TEACHER_EDITABLE.has(entry.status);
  const t = TS_TYPE[entry.type] || TS_TYPE.other;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : `1px solid ${DS.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={t.icon} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>
          {t.label}{entry.sessionId ? <span style={{ color: DS.muted, fontWeight: 500 }}> · {tsSessionRef(entry.sessionId)}</span> : ''}
        </div>
        {entry.note && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{entry.note}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums', width: 64, textAlign: 'right' }}>{tsFmtDuration(entry.durationMinutes)}</span>
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
  const [period, setPeriod] = React.useState(tsAdminPeriod);
  const changePeriod = (p) => { tsSetAdminPeriod(p); setPeriod(p); };

  const range = tsRangeOf(period);
  const inPeriod = store.entries.filter(e => tsInRange(e.date, range));
  const teacherRows = tsTeacherRollup(inPeriod);

  const overall = inPeriod.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const approvedMin = inPeriod.filter(tsIsApprovedLike).reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const submittedIds = inPeriod.filter(e => e.status === 'submitted').map(e => e.id);

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="Staff Timesheets" subtitle="Review and approve your teachers' working hours — open a teacher to see their sessions" />

      {/* Submission policy — admin-set, centre-wide. Teachers' page defaults to this. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="calendar" size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>Submission frequency</div>
          <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>How often teachers are asked to submit their timesheet for approval.</div>
        </div>
        <Select value={store.config.submissionFrequency} onChange={e => store.setConfig({ submissionFrequency: e.target.value })} style={{ width: 170 }}>
          {TS_FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </Select>
      </div>

      {/* Period */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodControl period={period} onChange={changePeriod} />
        <span style={{ fontSize: 12.5, color: DS.muted }}>{tsRangeLabel(range)}</span>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Total hours" value={tsFmtDuration(overall)} sub={tsRangeLabel(range)} icon="clock" />
        <KPICard label="Approved hours" value={tsFmtDuration(approvedMin)} sub="signed off" icon="check" />
        <KPICard label="Awaiting approval" value={submittedIds.length} sub="submitted entries" icon="send" />
        <KPICard label="Teachers" value={teacherRows.length} sub="in this period" icon="users" />
      </div>

      {/* Bulk approve across all teachers */}
      {submittedIds.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Btn variant="primary" icon="check" small onClick={() => store.approveMany(submittedIds)}>Approve all {submittedIds.length} submitted</Btn>
        </div>
      )}

      {/* Per-teacher summary — click a teacher to open their sessions */}
      <Card title="By teacher" subtitle={tsRangeLabel(range)}>
        {teacherRows.length ? teacherRows.map((r, i) => (
          <TeacherSummaryRow key={r.id} row={r} color={(adminStore.teachers.find(t => t.id === r.id) || {}).color}
            isLast={i === teacherRows.length - 1} onOpen={() => adminNav('timesheet_detail', r.id)} />
        )) : (
          <EmptyState icon="clock" title="No hours logged in this period"
            message="Try a different period — teaching time is captured when teachers take the register." />
        )}
      </Card>
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
const AdminTimesheetEntryRow = ({ entry, store, isLast }) => {
  const t = TS_TYPE[entry.type] || TS_TYPE.other;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : `1px solid ${DS.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={t.icon} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>
          {t.label}{entry.sessionId ? <span style={{ color: DS.muted, fontWeight: 500 }}> · {tsSessionRef(entry.sessionId)}</span> : ''}
        </div>
        {entry.note && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{entry.note}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, fontVariantNumeric: 'tabular-nums', width: 64, textAlign: 'right' }}>{tsFmtDuration(entry.durationMinutes)}</span>
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
  const [period, setPeriod] = React.useState(tsAdminPeriod);
  const changePeriod = (p) => { tsSetAdminPeriod(p); setPeriod(p); };
  const [status, setStatus] = React.useState('all');
  const [markExp, setMarkExp] = React.useState(false);
  const [printData, setPrintData] = React.useState(null);

  const range = tsRangeOf(period);
  const teacher = adminStore.teachers.find(t => t.id === teacherId);
  const name = tsTeacherName(teacherId);

  const mine = store.entries.filter(e => e.teacherId === teacherId && tsInRange(e.date, range));
  const filtered = mine.filter(e => status === 'all' || e.status === status)
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const { total, byType } = tsRollup(mine);
  const approvedScope = mine.filter(tsIsApprovedLike);
  const approvedMin = approvedScope.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const submittedIds = mine.filter(e => e.status === 'submitted').map(e => e.id);

  // Group the (status-filtered) entries by day, newest first.
  const byDay = {};
  filtered.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  const days = Object.keys(byDay).sort((a, b) => a < b ? 1 : -1).map(d => ({ date: d, entries: byDay[d] }));

  const exportRows = approvedScope.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const doExportCSV = () => {
    if (!exportRows.length) return;
    tsDownloadCSV(`timesheet-${name.toLowerCase().replace(/\s+/g, '-')}-${range.from}_${range.to}.csv`, tsBuildCSV(exportRows));
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
            <p style={{ fontSize: 14, color: DS.muted, margin: '4px 0 0' }}>Timesheet sessions · {tsRangeLabel(range)}</p>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn variant="secondary" icon="download" small onClick={doExportCSV} style={exportRows.length ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Export CSV</Btn>
          <Btn variant="secondary" icon="print" small onClick={doPrint} style={exportRows.length ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Print / PDF</Btn>
        </div>
      </div>

      {/* Period + status filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <TsPeriodControl period={period} onChange={changePeriod} />
        <Select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="all">All statuses</option>
          {Object.keys(TS_STATUS_META).map(s => <option key={s} value={s}>{TS_STATUS_META[s].label}</option>)}
        </Select>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Total hours" value={tsFmtDuration(total)} sub={`${mine.length} entr${mine.length === 1 ? 'y' : 'ies'}`} icon="clock" />
        <KPICard label="Teaching" value={tsFmtDuration(byType.teaching || 0)} sub="from the register" icon="graduation" />
        <KPICard label="Approved hours" value={tsFmtDuration(approvedMin)} sub="signed off" icon="check" />
        <KPICard label="Awaiting approval" value={submittedIds.length} sub="submitted entries" icon="send" />
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
                  <AdminTimesheetEntryRow key={e.id} entry={e} store={store} isLast={i === d.entries.length - 1} />
                ))}
              </div>
            );
          }) : (
            <EmptyState icon="filter" title="No sessions match this filter"
              message="Try a different period or status." />
          )}
        </Card>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <div style={{ fontWeight: 700, color: '#111' }}>TutorOS · Bright Minds</div>
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
});
