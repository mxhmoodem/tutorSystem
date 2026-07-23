// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — Student single sources of truth (Sections 1–7)
//  Exposed as window.klasioStudent. Loaded after the mocks + teacherGrades.jsx
//  (needs window.klasioGrades) and BEFORE StudentDashboard.jsx / Reports.jsx /
//  Settings.jsx read it. Every student screen reads identity, enrolments, grades,
//  rollup metrics, the resolved teacher for a subject, and the active term FROM
//  HERE — no screen re-hardcodes a name, a subject, a teacher or a number.
//
//  ── DERIVED, NOT HARDCODED (prototype "log in as a real student") ──────────────
//  The student surface represents ONE real admin-store student at a time — the
//  "active student" (localStorage `klasio.activeStudent`, default `s2` = Oliver
//  Chen, who is already the demo persona everywhere). Identity, enrolments (from
//  the student's real classIds → real classes → real subjects/teachers/rooms),
//  grades and homework all derive from `admin_store_v4` + `homework_store_v6` for
//  that student. Switching the active student (window.__setActiveStudent) re-points
//  the whole surface. Per-assessment scores / class averages / attendance rows are
//  synthesised DETERMINISTICALLY from the student's stored score/hw/attendance
//  (stable per student, never random) so the analytics screens still have a full
//  picture even though the prototype stores only point-in-time figures.
//
//  ── Multi-tenant scalability contract (backend phase — do NOT implement here) ──
//  currentStudent belongs to exactly ONE centreId; the student surface never
//  renders an account-tier concept. Intended RLS read-set for this principal:
//    • own profile (currentStudent) • own enrolments (getEnrolments)
//    • own homework / submissions / results, own reports, sessions for their
//      enrolled classes, and announcements targeted at platform / their centre /
//      their class.
//  NEVER: another student's marks, another class's roster, anything account-scoped.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const ADMIN_KEY = 'admin_store_v4';
const HW_KEY    = 'homework_store_v6';
const DEFAULT_ID = 's2';   // Oliver Chen — the persona the seed data is built around

// ── Store reads (non-reactive, per call — same discipline as the metrics layers) ─
const readAdmin = () => {
  try {
    const p = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
    if (p) return {
      students: p.students || window.SEED_STUDENTS || [],
      classes:  p.classes  || window.SEED_CLASSES  || [],
      teachers: p.teachers || window.SEED_TEACHERS || [],
    };
  } catch (e) {}
  return { students: window.SEED_STUDENTS || [], classes: window.SEED_CLASSES || [], teachers: window.SEED_TEACHERS || [] };
};
const readHw = () => { try { return JSON.parse(localStorage.getItem(HW_KEY) || 'null'); } catch (e) { return null; } };

// The active student id (which real student the student surface is "logged in" as).
const getActiveId = () => { try { return localStorage.getItem('klasio.activeStudent') || DEFAULT_ID; } catch (e) { return DEFAULT_ID; } };

// ── small helpers ─────────────────────────────────────────────────────────────
const clamp = (v) => Math.max(30, Math.min(99, Math.round(v)));
const yearNum = (y) => { const m = String(y == null ? '' : y).match(/\d+/); return m ? parseInt(m[0], 10) : null; };
const hashStr = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
// Deterministic PRNG seeded off the student id, so each student's synthetic series
// is stable across reloads (never Math.random).
const seeded = (str) => { let a = hashStr(str) || 1; return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const SUBJECT_COLORS = {
  'Mathematics':'#43b190', 'Further Maths':'#7C3AED', 'Physics':'#0891B2', 'Chemistry':'#D97706',
  'Biology':'#16A34A', 'English':'#DB2777', 'English Literature':'#DB2777', 'English Lit.':'#DB2777',
  'Computer Science':'#2563EB', 'Comp Sci':'#2563EB', 'Geography':'#0D9488', 'History':'#DC2626',
  'Economics':'#EA580C', 'Business':'#CA8A04', 'French':'#7C3AED', 'Spanish':'#DC2626', 'Science':'#0891B2',
};
const PALETTE = ['#43b190','#7C3AED','#0891B2','#D97706','#16A34A','#DB2777','#2563EB','#DC2626'];
const colorFor = (subj) => SUBJECT_COLORS[subj] || PALETTE[hashStr(subj || 'x') % PALETTE.length];

// "GCSE Mathematics" / "A-Level Further Maths" → the base subject.
const subjectOfClass = (name) => String(name || '').replace(/^(GCSE|A-?Level|AS-?Level|KS\d|IB|Entry Level)\s+/i, '').trim() || 'General';
const levelForYear = (y) => (window.klasioGrades ? window.klasioGrades.levelForYear(y) : (/1[23]/.test(String(y)) ? 'A-Level' : 'GCSE'));
const gradeFor = (pct, level) => (window.klasioGrades ? window.klasioGrades.pctToGrade(pct, { level }) : String(pct));

// A stable per-student score series that trends UP to the student's current score.
const makeSeries = (base, rnd, n) => {
  const out = [];
  for (let i = 0; i < n; i++) { const t = n <= 1 ? 1 : i / (n - 1); out.push(clamp(base - 10 + t * 10 + (rnd() - 0.5) * 6)); }
  out[n - 1] = clamp(base);
  return out;
};

// ─── §7 Active term — one value drives the Overview banner, the Sessions default
//     month, and the Progress assessment cadence. Centre-level (not per-student).
const activeTerm = {
  name: 'Summer Term',
  week: 2,
  get banner() { return `${this.name} · Week ${this.week}`; },
  calendar: { name: 'April 2026', firstDow: 2, days: 30, today: 23 },
  assessmentLabels: ['4 Mar', '11 Mar', '18 Mar', '25 Mar', '1 Apr', '8 Apr', '15 Apr', '22 Apr'],
};
const N_ASSESS = activeTerm.assessmentLabels.length;

// Fallback identity if the admin store somehow has no students (keeps screens safe).
const FALLBACK_STUDENT = { id: DEFAULT_ID, firstName: 'Oliver', lastName: 'Chen', year: 'Yr 12', email: '', subjects: ['Mathematics'], classIds: [], score: 90, hw: 96, attendance: 98 };

// ── The per-student model — built once per (active student + roster signature) ──
let _cache = null, _cacheKey = '';
const build = () => {
  const store = readAdmin();
  const id = getActiveId();
  const student = store.students.find(s => s.id === id)
    || store.students.find(s => s.id === DEFAULT_ID)
    || store.students[0] || FALLBACK_STUDENT;

  const sig = `${student.id}|${(student.classIds || []).join(',')}|${store.classes.length}`;
  if (_cache && _cacheKey === sig) return _cache;

  const level = levelForYear(student.year);
  const yr = yearNum(student.year);
  const yearGroup = yr ? `Year ${yr}` : (student.year || '');

  // Enrolments = the student's real class memberships (classIds → classes).
  const enrolClasses = (student.classIds || [])
    .map(cid => store.classes.find(c => c.id === cid))
    .filter(Boolean);

  const base = clamp(student.score || 70);
  const enrolments = enrolClasses.map((c) => {
    const subject = subjectOfClass(c.name);
    const r = seeded(student.id + '::' + c.id);
    const scores = makeSeries(base, r, N_ASSESS);
    const classAvg = makeSeries(Math.max(45, base - 9), r, N_ASSESS);
    const predictedPct = Math.min(99, base + 4);
    const att = Math.max(50, Math.min(100, Math.round(student.attendance != null ? student.attendance : 92)));
    const sessionsTotal = 50;
    return {
      classId: c.id, subject, subjectColor: colorFor(subject),
      teacherId: null, teacher: c.teacher || 'Centre staff', room: c.room || '—',
      yearGroup, qualification: level,
      predictedGrade: gradeFor(predictedPct, level),
      scores, classAvg,
      sessionsAttended: Math.round((att / 100) * sessionsTotal),
      sessionsTotal, sessionsPerWeek: 1,
    };
  });

  const initials = ((student.firstName || '?')[0] || '?') + ((student.lastName || '')[0] || '');
  const currentStudent = {
    id: student.id,
    commsId: student.id === 's2' ? 'u_oliver' : 'u_' + student.id,
    fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
    displayName: student.firstName || 'Student',
    email: student.email || (student.account && student.account.syntheticEmail) || '',
    avatarInitials: initials.toUpperCase(),
    centreId: student.centreId || 'bm',
    yearGroup, qualification: level,
  };

  // Sessions — dated occurrences derived from the real enrolments. Teacher + room
  // come from the enrolment (§6); pinned into the demo term month (April 2026) so
  // the Sessions calendar stays coherent. Read-only (no self-booking).
  const UP_DAYS = [21, 22, 23, 24, 25], HIST = [17, 16, 14, 8];
  const timeFor = (i) => ['09:00–10:00', '10:15–11:15', '13:00–14:00', '11:00–12:00', '15:00–16:00'][i % 5];
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateLabel = (d) => `${dow[new Date(2026, 3, d).getDay()]} ${d} Apr`;
  const src = enrolments.length ? enrolments : [];
  const sessions = {
    upcoming: src.slice(0, 5).map((e, i) => ({ subject: e.subject, date: dateLabel(UP_DAYS[i]), time: timeFor(i), day: UP_DAYS[i], teacher: e.teacher, room: e.room })),
    history: src.slice(0, 4).map((e, i) => ({ subject: e.subject, date: dateLabel(HIST[i]), time: timeFor(i), day: HIST[i], teacher: e.teacher, room: e.room, status: i === 3 ? 'missed' : 'attended' })),
  };

  _cache = { student, currentStudent, enrolments, sessions };
  _cacheKey = sig;
  return _cache;
};

// ── Public identity / enrolment resolvers (read the CURRENT active student) ─────
const getCurrentStudent = () => build().currentStudent;
const getEnrolments = () => build().enrolments;
const getSubjects   = () => build().enrolments.map(e => e.subject);
const getEnrolment  = (subject) => build().enrolments.find(e => e.subject === subject) || null;
const resolveTeacher = (subject) => { const e = getEnrolment(subject); return e ? e.teacher : '—'; };

// ─── §3 Canonical grade model — every grade chip renders through this. ──────────
const formatGrade = (value, qualification) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value == null || value === '' || isNaN(Number(value))) return '—';
  const level = qualification || getCurrentStudent().qualification;
  if (window.klasioGrades && window.klasioGrades.pctToGrade) return window.klasioGrades.pctToGrade(Number(value), { level });
  return String(value);
};

// ─── Homework — read the REAL homework store for the active student, so what the
//     teacher assigns is exactly what the student sees. Falls back to empty.
const hwStateFor = (a, id) => {
  const sub = (a.submissions || {})[id];
  if (sub && (sub.status === 'marked' || sub.markedAt)) return 'marked';
  if (sub && (sub.status === 'submitted' || sub.submittedAt)) return 'submitted';
  return 'pending';
};
const dueInfo = (a) => {
  const now = Date.now();
  const due = a.dueAt ? new Date(a.dueAt).getTime() : null;
  if (due == null) return { due: 'No due date', overdue: false };
  const days = Math.ceil((due - now) / 86400000);
  if (days < 0) return { due: 'Overdue', overdue: true };
  if (days === 0) return { due: 'Due today', overdue: false };
  if (days === 1) return { due: 'Due tomorrow', overdue: false };
  return { due: `Due in ${days} days`, overdue: false };
};
const myAssignments = () => {
  const s = readHw(); const id = getActiveId();
  if (!s || !s.assignments) return [];
  return Object.values(s.assignments).filter(a => (a.studentIds || []).includes(id) && a.status !== 'draft');
};
const scoreOf = (a, id) => {
  const sub = (a.submissions || {})[id];
  if (!sub || !sub.marks) return null;
  const pts = (a.questions || []).reduce((n, q) => n + (q.points || 1), 0);
  const got = Object.values(sub.marks).reduce((n, m) => n + (typeof m === 'number' ? m : 0), 0);
  return pts ? Math.round((got / pts) * 100) : null;
};

const metrics = {
  termAverage() { const e = getEnrolments(); return e.length ? Math.round(e.reduce((s, x) => s + (x.scores[x.scores.length - 1] || 0), 0) / e.length) : 0; },
  subjectAverage(subject) { const e = getEnrolment(subject); return e ? Math.round(e.scores.reduce((s, n) => s + n, 0) / e.scores.length) : 0; },
  subjectLatest(subject)  { const e = getEnrolment(subject); return e ? (e.scores[e.scores.length - 1] || 0) : 0; },
  attendanceOverall() {
    const e = getEnrolments();
    const a = e.reduce((s, x) => s + x.sessionsAttended, 0);
    const t = e.reduce((s, x) => s + x.sessionsTotal, 0);
    return t ? +((a / t) * 100).toFixed(1) : 0;
  },
  attendanceForSubject(subject) { const e = getEnrolment(subject); return e && e.sessionsTotal ? Math.round((e.sessionsAttended / e.sessionsTotal) * 100) : 0; },
  sessionsPerWeek() { return getEnrolments().reduce((s, e) => s + e.sessionsPerWeek, 0); },
  termTrendDelta() {
    const e = getEnrolments();
    if (!e.length) return 0;
    const prev = Math.round(e.reduce((s, x) => s + (x.scores[x.scores.length - 2] != null ? x.scores[x.scores.length - 2] : x.scores[x.scores.length - 1]), 0) / e.length);
    return this.termAverage() - prev;
  },
  subjectVsClass(subject) { const e = getEnrolment(subject); return e ? (e.scores[e.scores.length - 1] - e.classAvg[e.classAvg.length - 1]) : 0; },
  // Homework rollup for the Overview tiles + "Continue homework" target — from the
  // real homework store, so it matches the Homework page exactly.
  homeworkSummary() {
    const id = getActiveId();
    const pending = myAssignments()
      .filter(a => hwStateFor(a, id) === 'pending')
      .map(a => { const d = dueInfo(a); return { id: a.id, title: a.title, subject: a.subject, due: d.due, overdue: d.overdue, status: 'pending' }; });
    return {
      pending,
      pendingCount: pending.length,
      urgentCount: pending.filter(h => dueState(h) === 'due-today' || dueState(h) === 'overdue').length,
    };
  },
  resultsSummary() {
    const id = getActiveId();
    const scored = myAssignments().filter(a => hwStateFor(a, id) === 'marked').map(a => scoreOf(a, id)).filter(n => typeof n === 'number');
    if (!scored.length) return { average: 0, best: 0, completed: 0 };
    return { average: Math.round(scored.reduce((s, n) => s + n, 0) / scored.length), best: Math.max(...scored), completed: scored.length };
  },
};

// ─── Due-state — a SINGLE correct state per homework item. ──────────────────────
const dueState = (hw) => {
  const d = String((hw && hw.due) || '');
  if (hw && hw.overdue) return 'overdue';
  if (/today/i.test(d)) return 'due-today';
  if (/tomorrow/i.test(d)) return 'due-tomorrow';
  return 'upcoming';
};
const dueLabel = (hw) => ({ overdue: 'Overdue', 'due-today': 'Due today', 'due-tomorrow': 'Due tomorrow', upcoming: 'Upcoming' }[dueState(hw)]);

const getContinueHomework = () => {
  const pending = metrics.homeworkSummary().pending;
  const rank = { overdue: 0, 'due-today': 1, 'due-tomorrow': 2, upcoming: 3 };
  return pending.slice().sort((a, b) => rank[dueState(a)] - rank[dueState(b)])[0] || null;
};

// The active-student roster for the "View as student" switcher — every real
// student in the admin store, most-enrolled first (so the switcher opens on
// students that actually have classes).
const listStudents = () => {
  const store = readAdmin();
  return store.students
    .map(s => ({ id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), year: s.year || '', classes: (s.classIds || []).length }))
    .sort((a, b) => b.classes - a.classes || a.name.localeCompare(b.name));
};

// ─── §10 Shared grade chip — ONE component every student screen renders through. ─
const GradeChip = ({ value, qualification, color, variant = 'pill', title = 'Predicted grade' }) => {
  const g = formatGrade(value, qualification);
  const c = color || (window.DS && window.DS.accent) || '#0F9D7F';
  if (variant === 'bare') return <span title={title} style={{ fontWeight: 800, color: c }}>{g}</span>;
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: c, background: c + '18',
      border: `1px solid ${c}44`, borderRadius: 8, padding: '2px 9px', minWidth: 26,
    }}>{g}</span>
  );
};

window.klasioStudent = {
  activeTerm,
  // identity + enrolments now derive from the active admin student
  get currentStudent() { return getCurrentStudent(); },
  get enrolments() { return getEnrolments(); },
  get sessions() { return build().sessions; },
  getEnrolments, getSubjects, getEnrolment,
  resolveTeacher, formatGrade, metrics,
  dueState, dueLabel, getContinueHomework,
  GradeChip,
  listStudents, getActiveId,
};

})();
