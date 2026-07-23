// ══════════════════════════════════════════════════════════════════════════════
//  Attendance / Register — logic layer (session-scoped)
//  Loaded after the mocks + shared.jsx and before TeacherPages.jsx (see index.html).
//
//  This is the "derive, don't store" core for the rebuilt Attendance screen. A
//  register belongs to a SESSION (one dated occurrence of a class), not a class
//  group. The repo ships no materialised sessions/enrolments/attendance tables, so:
//    • materialiseSessions()  expands the teacher's store.classes into dated sessions
//      over a ~2-week window around an injectable `now` (mocks/attendance.mock.jsx).
//    • deriveSessionState()   is a PURE function returning the transient UI state
//      (upcoming/open_live/awaiting/recorded/lapsed/cancelled). These are DERIVED,
//      never stored — sessions.status stays scheduled|delivered|cancelled.
//    • useAttendanceStore()   persists only the source-of-truth writes (submitted
//      registers + amendments) to `tutoros.attendance.v1`, seeded from the mock.
//    • submit_register / amend_attendance are mocked with the same signatures as the
//      real backend functions, so wiring to Supabase later is a drop-in.
//  Cancellation is single-sourced through the existing timesheet store (setCancelled)
//  so hours + the admin Schedule stay consistent. Delivered HOURS are captured by the
//  existing TimesheetCapture on confirm — a separate path from marks (D4).
// ══════════════════════════════════════════════════════════════════════════════

const ATT_STORE_KEY = 'tutoros.attendance.v1';
const ATT_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── small date helpers (local-time, matching the rest of the app) ──────────────
const attIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const attEndOfDay = (ms) => { const d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); };
const attStartOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const attAtTime = (dayDate, hhmm) => {
  const [h, m] = String(hhmm || '00:00').trim().split(':').map(Number);
  const d = new Date(dayDate); d.setHours(h || 0, m || 0, 0, 0); return d.getTime();
};
// "09:00–10:30" (en-dash / em-dash / hyphen) → { start:'09:00', end:'10:30' }
const attSplitTime = (time) => {
  const parts = String(time || '').split(/[–—-]/).map(s => s.trim());
  return { start: parts[0] || '09:00', end: parts[1] || parts[0] || '10:00' };
};
const attFmtClock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '').toLowerCase();

// ── deterministic synthetic marks for SEEDED historical sessions ───────────────
// Seeded delivered sessions store only submittedAt/By (lean). Their per-student
// marks are synthesised deterministically from the roster so the rate + recent-
// sessions figures are stable and reproducible — never hardcoded, never random.
const attHash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const attSynthStatus = (sessionId, name) => { const r = attHash(sessionId + '::' + name) % 100; if (r < 8) return 'absent'; if (r < 16) return 'late'; return 'present'; };

// ══════════════════════════════════════════════════════════════════════════════
//  deriveSessionState — the pure core (Part B)
//  Returns the transient UI state from starts_at / ends_at / register_submitted_at /
//  the window settings / now. NOTHING here is persisted.
// ══════════════════════════════════════════════════════════════════════════════
function deriveSessionState(session, settings, now) {
  const S = settings || {};
  const MIN = 60 * 1000;
  const start = session.starts_at;
  const end = session.ends_at;
  const preOpen = start - (S.pre_open_window || 0) * MIN;
  const graceEnd = S.grace_window === 'eod' ? attEndOfDay(end) : end + (S.grace_window || 0) * MIN;
  const backfillEnd = end + (S.backfill_window || 0) * MIN;

  // An admin can grant a time-boxed unlock on a lapsed or locked session — a
  // temporary window in which the teacher may take (or re-take) the register. It
  // is derived, never a stored state: the grant carries only grantedAt/expiresAt.
  const unlock = session.unlock;
  const unlocked = !!(unlock && now >= unlock.grantedAt && now <= unlock.expiresAt);

  // cancelled — terminal, excluded from the rate denominator
  if (session.status === 'cancelled') {
    return { state: 'cancelled', liveNow: false, actionable: false, excluded: true };
  }
  // recorded — a register was submitted (status = delivered). Read-only; marks stay
  // amendable only inside amendment_window, then locked (D4). An active admin unlock
  // re-opens it for correction / re-take until the grant expires (reopened).
  if (session.register_submitted_at) {
    const amendLockAt = session.register_submitted_at + (S.amendment_window || 0) * MIN;
    return {
      state: 'recorded', liveNow: false, actionable: false,
      amendable: (now <= amendLockAt) || unlocked, amendLockAt,
      reopened: unlocked, unlockExpiresAt: unlocked ? unlock.expiresAt : null,
    };
  }
  // upcoming — register not open yet
  if (now < preOpen) {
    return { state: 'upcoming', liveNow: false, actionable: false, opensAt: preOpen };
  }
  // open_live — take the register freely. "live now" = within the actual start–end.
  if (now <= graceEnd) {
    return { state: 'open_live', liveNow: now >= start && now <= end, actionable: true, graceEdge: !(now >= start && now <= end) };
  }
  // awaiting — past grace but inside the backfill window: still takeable, flagged late,
  // reason required (D3)
  if (now <= backfillEnd) {
    return { state: 'awaiting', liveNow: false, actionable: true, late: true, backfillEnd };
  }
  // lapsed — past the backfill window. Locked for the teacher and admin-only + audited
  // (D5) — UNLESS an admin has granted a temporary unlock, which reopens it (as a late
  // register, reason required) for the teacher until the grant expires, then re-locks.
  if (unlocked) {
    return { state: 'awaiting', liveNow: false, actionable: true, late: true, unlocked: true, unlockExpiresAt: unlock.expiresAt, backfillEnd: unlock.expiresAt };
  }
  return { state: 'lapsed', liveNow: false, actionable: false, adminOnly: true };
}

// Human labels + tones (NO internal terms surfaced to product UI). The UI composes
// dynamic bits (e.g. "Opens 3pm") from the derived timestamps above.
const SESSION_STATE_META = {
  open_live: { label: 'Open',        tone: 'accent',  order: 2 },
  upcoming:  { label: 'Upcoming',    tone: 'muted',   order: 3 },
  awaiting:  { label: 'Needs register', tone: 'warning', order: 0 },
  recorded:  { label: 'Recorded',    tone: 'success', order: 4 },
  lapsed:    { label: 'Missed',      tone: 'danger',  order: 1 },
  cancelled: { label: 'Cancelled',   tone: 'muted',   order: 5 },
};

// ══════════════════════════════════════════════════════════════════════════════
//  Roster (enrolments) — reuse the same resolution the class-detail page uses:
//  real store enrolment (students whose classIds include this class) with the
//  teacherAllClasses group list as the fallback for seed-only groups.
// ══════════════════════════════════════════════════════════════════════════════
function attRosterFor(classId, group, adminStore) {
  const nameOf = window.studentName || ((s) => `${s.firstName || ''} ${s.lastName || ''}`.trim());
  const fromStore = (adminStore && adminStore.students || [])
    .filter(s => Array.isArray(s.classIds) && s.classIds.includes(classId))
    .map(nameOf);
  if (fromStore.length) return fromStore;
  const tac = window.teacherAllClasses || [];
  const g = tac.find(t => t.group === group);
  return g ? g.students.slice() : [];
}

// ══════════════════════════════════════════════════════════════════════════════
//  Session materialiser — expand classes into dated occurrences over a window
//  around `now`, overlaying persisted submissions + cancellations. Faithful to the
//  shipped model: sessions are materialised, not RRULE-expanded on read.
// ══════════════════════════════════════════════════════════════════════════════
function materialiseSessions(classes, settings, now, store, opts) {
  const o = opts || {};
  const backDays = o.backDays != null ? o.backDays : 12;
  const fwdDays = o.fwdDays != null ? o.fwdDays : 6;
  const from = attStartOfDay(now - backDays * 86400000);
  const to = attEndOfDay(now + fwdDays * 86400000);
  const out = [];

  for (let t = from; t <= to; t += 86400000) {
    const day = new Date(t);
    const dayName = ATT_DAYS[day.getDay()];
    const iso = attIso(day);
    classes.forEach(cls => {
      if (cls.day !== dayName) return;
      const { start, end } = attSplitTime(cls.time);
      const starts_at = attAtTime(day, start);
      const ends_at = attAtTime(day, end);
      const id = `${cls.id}|${iso}`;
      const sub = store.submissions[id];
      const cancelled = store.isCancelled(id);
      const status = cancelled ? 'cancelled' : (sub ? 'delivered' : 'scheduled');
      const scheduledMinutes = window.tsSessionMinutes ? window.tsSessionMinutes(cls.time) : Math.max(15, Math.round((ends_at - starts_at) / 60000));
      const session = {
        id, dateISO: iso, classId: cls.id, cls,
        group: cls.group, name: cls.name, room: cls.room, teacher: cls.teacher,
        starts_at, ends_at, scheduledMinutes,
        status,
        register_submitted_at: sub ? sub.submittedAt : null,
        register_submitted_by: sub ? sub.submittedBy : null,
        submission: sub || null,
        unlock: (store.unlocks && store.unlocks[id]) || null,   // admin time-boxed grant
      };
      session.derived = deriveSessionState(session, settings, now);
      out.push(session);
    });
  }
  return out;
}

// Records (attendance_records) for a delivered session — stored marks if the teacher
// submitted them, else deterministically synthesised for seeded historicals.
function attRecordsFor(session, roster, store) {
  const sub = store.submissions[session.id];
  if (!sub) return null;
  if (sub.records) return sub.records;
  const out = {};
  (roster || []).forEach(n => { out[n] = attSynthStatus(session.id, n); });
  return out;
}

// ── Derived rollups (Part C side panels) — cancelled excluded from denominators ──
// Attendance rate over a set of sessions: attended (present+late) / marked
// (present+absent+late). 'excused' is not counted against the rate.
function attendanceRate(sessions, rosterOf, store) {
  let present = 0, absent = 0, late = 0, excused = 0, delivered = 0;
  sessions.forEach(s => {
    if (s.derived.state !== 'recorded') return;
    delivered++;
    const recs = attRecordsFor(s, rosterOf(s), store);
    Object.values(recs || {}).forEach(v => {
      if (v === 'present') present++; else if (v === 'absent') absent++;
      else if (v === 'late') late++; else if (v === 'excused') excused++;
    });
  });
  const marked = present + absent + late;
  return {
    pct: marked ? Math.round(((present + late) / marked) * 100) : null,
    present, absent, late, excused, marked, deliveredSessions: delivered,
  };
}

// Recent delivered sessions, newest first — P/A/L counts + % per session.
function recentSessions(sessions, rosterOf, store, limit) {
  return sessions
    .filter(s => s.derived.state === 'recorded')
    .sort((a, b) => b.starts_at - a.starts_at)
    .slice(0, limit || 6)
    .map(s => {
      const recs = attRecordsFor(s, rosterOf(s), store) || {};
      let present = 0, absent = 0, late = 0;
      Object.values(recs).forEach(v => { if (v === 'present') present++; else if (v === 'absent') absent++; else if (v === 'late') late++; });
      const total = present + absent + late;
      return { session: s, date: s.starts_at, present, absent, late, pct: total ? Math.round(((present + late) / total) * 100) : null };
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  Store — source-of-truth writes only. Everything else is derived above.
// ══════════════════════════════════════════════════════════════════════════════
const attSeedStore = () => {
  const submissions = {};
  (window.ATT_SEED_DELIVERED || []).forEach(row => {
    submissions[row.sessionId] = {
      submittedAt: new Date(row.at).getTime(),
      submittedBy: 't1',            // Heebz A (rostered) — resolved to real id below at read time
      synth: true,                  // marks synthesised deterministically from the roster
      note: '', late: false, byAdmin: false,
    };
  });
  return { submissions, amendments: [], seedCancelled: (window.ATT_SEED_CANCELLED || []).slice(), unlocks: {}, unlockLog: [] };
};

const useAttendanceStore = () => {
  // Cancellation is single-sourced through the timesheet store so hours + the admin
  // Schedule stay consistent (reuse, not fork).
  const ts = window.useTimesheetStore ? window.useTimesheetStore() : null;

  const [store, setStore] = React.useState(() => {
    try {
      const raw = localStorage.getItem(ATT_STORE_KEY);
      if (raw) { const p = JSON.parse(raw); return { submissions: p.submissions || {}, amendments: p.amendments || [], seedCancelled: p.seedCancelled || (window.ATT_SEED_CANCELLED || []).slice(), unlocks: p.unlocks || {}, unlockLog: p.unlockLog || [] }; }
    } catch (e) {}
    return attSeedStore();
  });

  const persist = (next) => { setStore(next); try { localStorage.setItem(ATT_STORE_KEY, JSON.stringify(next)); } catch (e) {} };

  // A session is cancelled if the timesheet store says so OR it is in our demo seed.
  const isCancelled = (sessionId) => {
    const seeded = (store.seedCancelled || []).includes(sessionId);
    const live = ts ? (ts.cancelled || []).includes(sessionId) : false;
    return seeded || live;
  };
  const setCancelled = (sessionId, flag) => {
    if (ts) ts.setCancelled(sessionId, flag);                // reuse — drives hours + admin schedule
    const seed = new Set(store.seedCancelled || []);
    if (flag) seed.add(sessionId); else seed.delete(sessionId);
    // cancelling clears any (unlikely) submission on that session
    const submissions = { ...store.submissions };
    if (flag) delete submissions[sessionId];
    persist({ ...store, seedCancelled: [...seed], submissions });
  };

  // ── mocked keystone: submit_register(session, entries) ──────────────────────
  // Signature kept identical to the backend function for a drop-in later. `entries`
  // is a { studentName: 'present'|'absent'|'late'|'excused' } map. opts carries the
  // late reason note, the delivering adult, and (for admin backfill) byAdmin. Sets
  // register_submitted_at, flips status→delivered, writes attendance_records. Delivered
  // HOURS are captured separately by TimesheetCapture on confirm (D4).
  const submit_register = (session, entries, opts) => {
    const o = opts || {};
    const now = o.now != null ? o.now : window.getNow();
    const d = deriveSessionState({ ...session, register_submitted_at: null }, window.REGISTER_SETTINGS, now);
    const late = !!(d.late || (o.byAdmin && d.state === 'lapsed'));
    const record = {
      submittedAt: now,
      submittedBy: o.deliveredBy || session.register_submitted_by || 't1',
      records: { ...entries },
      note: o.note || '',
      late, byAdmin: !!o.byAdmin,
    };
    // Submitting consumes any active unlock grant (one-shot) so the record re-locks.
    const unlocks = { ...store.unlocks }; delete unlocks[session.id];
    persist({ ...store, submissions: { ...store.submissions, [session.id]: record }, unlocks });
    return record;
  };

  // ── admin action: grant a time-boxed unlock on a lapsed or locked session ────
  // Reopens the register for the teacher (take / re-take / amend) until it expires,
  // then it re-locks automatically (derived — see deriveSessionState). Audited.
  // spec: { hours } | { untilEod:true } | { expiresAt } — defaults to 4h.
  const grant_unlock = (sessionId, spec, opts) => {
    const o = opts || {}, sp = spec || {};
    const now = o.now != null ? o.now : window.getNow();
    const expiresAt = sp.expiresAt != null ? sp.expiresAt
      : sp.untilEod ? attEndOfDay(now)
      : now + (sp.hours || 4) * 3600000;
    const grant = { sessionId, grantedBy: o.by || 'admin', grantedAt: now, expiresAt, note: o.note || '' };
    const entry = { sessionId, grantedBy: grant.grantedBy, grantedAt: now, expiresAt, at: now, action: 'grant' };
    persist({ ...store, unlocks: { ...store.unlocks, [sessionId]: grant }, unlockLog: [entry, ...store.unlockLog] });
    return grant;
  };
  const revoke_unlock = (sessionId, opts) => {
    const o = opts || {};
    const unlocks = { ...store.unlocks }; delete unlocks[sessionId];
    const entry = { sessionId, grantedBy: o.by || 'admin', at: (o.now != null ? o.now : window.getNow()), action: 'revoke' };
    persist({ ...store, unlocks, unlockLog: [entry, ...store.unlockLog] });
  };

  // ── mocked keystone: amend_attendance(record, status) ───────────────────────
  // Corrects a single student MARK inside the amendment window. A different path
  // from delivered-hours (D4). Always audited (append-only amendments log).
  const amend_attendance = (ref, status, opts) => {
    const o = opts || {};
    const sub = store.submissions[ref.sessionId];
    if (!sub) return null;
    const existing = sub.records ? { ...sub.records } : {};
    const from = existing[ref.student] != null ? existing[ref.student] : null;
    existing[ref.student] = status;
    const amendment = { sessionId: ref.sessionId, student: ref.student, from, to: status, at: (o.now != null ? o.now : window.getNow()), by: o.by || 't1' };
    persist({
      ...store,
      submissions: { ...store.submissions, [ref.sessionId]: { ...sub, records: existing } },
      amendments: [amendment, ...store.amendments],
    });
    return amendment;
  };

  return {
    submissions: store.submissions, amendments: store.amendments,
    unlocks: store.unlocks, unlockLog: store.unlockLog,
    isCancelled, setCancelled, submit_register, amend_attendance,
    grant_unlock, revoke_unlock,
  };
};

// "until 6pm" / "for 4h" style label for an unlock expiry
const attFmtUntil = (expiresAt) => `until ${attFmtClock(expiresAt)}`;

Object.assign(window, {
  deriveSessionState, SESSION_STATE_META, materialiseSessions,
  attRosterFor, attRecordsFor, attendanceRate, recentSessions,
  useAttendanceStore, attFmtClock, attIso, attFmtUntil, attEndOfDay,
});
