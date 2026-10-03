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
//  grades and homework all derive from `admin_store_v4` + `homework_store_v9` for
//  that student. Switching the active student (window.__setActiveStudent) re-points
//  the whole surface. Per-assessment scores and class averages are the pupil's
//  PUBLISHED assessment results (window.klasioScores, decision #50) — never a
//  synthesised series; a class with no published results shows an empty state.
//  Sessions are the pupil's classes materialised on the register's own clock
//  (window.getNow + materialiseSessions), and attendance is read back from the
//  registers teachers submitted (decision #60) — never a stored roster figure.
//  Predicted/target grades are the teacher's stored judgement (klasioTargets, #28).
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
const HW_KEY    = 'homework_store_v9';
const DEFAULT_ID = 's2';   // Oliver Chen — the persona the seed data is built around

// ── Store reads (non-reactive, per call — same discipline as the metrics layers) ─
const readAdmin = () => {
  try {
    const p = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
    if (p) return {
      students: p.students || window.SEED_STUDENTS || [],
      classes:  p.classes  || window.SEED_CLASSES  || [],
      teachers: p.teachers || window.SEED_TEACHERS || [],
      subjects: p.subjects || window.SEED_SUBJECTS || [],
    };
  } catch (e) {}
  return { students: window.SEED_STUDENTS || [], classes: window.SEED_CLASSES || [], teachers: window.SEED_TEACHERS || [], subjects: window.SEED_SUBJECTS || [] };
};
const readHw = () => { try { return JSON.parse(localStorage.getItem(HW_KEY) || 'null'); } catch (e) { return null; } };

// The active student id (which real student the student surface is "logged in" as).
const getActiveId = () => { try { return localStorage.getItem('klasio.activeStudent') || DEFAULT_ID; } catch (e) { return DEFAULT_ID; } };

// ── small helpers ─────────────────────────────────────────────────────────────
const yearNum = (y) => { const m = String(y == null ? '' : y).match(/\d+/); return m ? parseInt(m[0], 10) : null; };
const hashStr = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };

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

// ─── §7 Active term + clock — the student surface reads the SAME clock the
//     register uses (window.getNow, mocks/attendance.mock.jsx), so "next lesson",
//     today on the calendar and a session's attendance agree with what the teacher
//     sees. The term is whichever of the centre's terms covers that day.
const nowMs = () => (window.getNow ? window.getNow() : Date.now());
const isoOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// The month grid model for the shared MonthCalendar (both live in shared.jsx).
const monthModel = monthGridModel;
const termNow = () => {
  const iso = isoOf(nowMs());
  let terms = [];
  try { terms = window.getCentreTerms ? window.getCentreTerms(window.klasioCentreSettings ? window.klasioCentreSettings() : {}) : []; } catch (e) { terms = []; }
  const r = window.resolveActiveTerm ? window.resolveActiveTerm(terms, iso) : { term: null, status: 'none' };
  const t = r.term;
  const week = t && r.status === 'active' && t.start
    ? Math.floor((new Date(iso + 'T12:00:00') - new Date(t.start + 'T12:00:00')) / (7 * 86400000)) + 1 : null;
  return { name: (t && t.name) || '', status: r.status, week };
};
const activeTerm = {
  get name() { return termNow().name; },
  get week() { return termNow().week; },
  get banner() {
    const t = termNow();
    if (!t.name) return '';
    return t.status === 'active' && t.week ? `${t.name} · Week ${t.week}` : t.name;
  },
  // Today's month on the register clock, plus today's date within it.
  get calendar() { const d = new Date(nowMs()); return { ...monthModel(d.getFullYear(), d.getMonth()), today: d.getDate(), todayISO: isoOf(d.getTime()) }; },
};

// Fallback identity if the admin store somehow has no students (keeps screens safe).
const FALLBACK_STUDENT = { id: DEFAULT_ID, firstName: 'Oliver', lastName: 'Chen', year: 'Yr 12', email: '', subjects: ['Mathematics'], classIds: [] };

// ── The per-student model — built once per (active student + roster signature) ──
let _cache = null, _cacheKey = '';
const build = () => {
  const store = readAdmin();
  const id = getActiveId();
  const student = store.students.find(s => s.id === id)
    || store.students.find(s => s.id === DEFAULT_ID)
    || store.students[0] || FALLBACK_STUDENT;

  // Results, targets, registers and lesson shares live in their own stores, so a
  // write to any of them must bust this cache too — as must the register clock.
  let asSig = '';
  try { asSig = ['klasio.assessments.v1', 'tutoros.tracking.v1', 'klasio.targets.v1', 'tutoros.attendance.v2', 'klasio.lessons.v1'].map(k => String((localStorage.getItem(k) || '').length)).join(':'); } catch (e) {}
  // Other modules read this model while scripts are still loading (Reports.jsx at
  // parse time), before attendance/lessons/targets exist — so which of them are
  // loaded is part of the key, or an empty early build would stick.
  const deps = [window.attReadStore, window.materialiseSessions, window.klasioTargets, window.klasioLessons, window.getNow].map(x => (x ? 1 : 0)).join('');
  // A class's background is set by its teacher or an admin, so it's part of the key too.
  const coverSig = store.classes.filter(c => (student.classIds || []).includes(c.id)).map(c => `${c.coverPresetId || ''}/${c.coverIconId || ''}`).join(',');
  const sig = `${student.id}|${(student.classIds || []).join(',')}|${store.classes.length}|${coverSig}|${asSig}|${deps}|${Math.floor(nowMs() / 60000)}`;
  if (_cache && _cacheKey === sig) return _cache;

  const level = levelForYear(student.year);
  const yr = yearNum(student.year);
  const yearGroup = yr ? `Year ${yr}` : (student.year || '');

  // Enrolments = the student's real class memberships (classIds → classes).
  const enrolClasses = (student.classIds || [])
    .map(cid => store.classes.find(c => c.id === cid))
    .filter(Boolean);

  // Scores are this pupil's PUBLISHED assessment results for each class, in date
  // order (window.klasioScores, decision #50) — never synthesised. A class with no
  // published results has an empty series, and every screen says so.
  const KS = window.klasioScores;
  const fmtShort = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
  const enrolments = enrolClasses.map((c) => {
    const subject = subjectOfClass(c.name);
    const results = KS ? KS.attainmentSeries(student.id, { classId: c.id, publishedOnly: true }) : [];
    const classRows = KS ? KS.classAssessments(c.id) : [];
    const scores = results.map(e => e.pct);
    const classAvg = results.map(e => { const a = classRows.find(x => x.id === e.assessmentId); return a && a.classAvgPct != null ? a.classAvgPct : e.pct; });
    const avgPct = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;
    // Predicted + target are the teacher's stored judgement (decision #28); a class
    // with no row says "Not set yet". The indicative grade is derived from the
    // results and is only ever shown labelled as indicative.
    const tgt = window.klasioTargets ? window.klasioTargets.get(student.id, c.id) : null;
    const clsLevel = window.klasioTargets ? window.klasioTargets.levelForClass(c, student) : level;
    return {
      classId: c.id, name: c.name || subject, group: c.group || '', day: c.day || '', time: c.time || '',
      subject, subjectColor: colorFor(subject),
      // The class's background, through the one read path (classCovers.jsx).
      coverArt: window.klasioCovers.classCover(c, store.subjects),
      teacherId: null, teacher: c.teacher || 'Centre staff', room: c.room || '—',
      yearGroup, qualification: clsLevel,
      predictedGrade: (tgt && tgt.predicted) || null,
      targetGrade: (tgt && tgt.target) || null,
      indicativeGrade: avgPct != null ? gradeFor(avgPct, clsLevel) : null,
      scores, classAvg,
      scoreLabels: results.map(e => fmtShort(e.date)),
      scoreTitles: results.map(e => e.title),
      // Filled from the registers below.
      sessionsAttended: 0, sessionsTotal: 0,
    };
  });

  const initials = ((student.firstName || '?')[0] || '?') + ((student.lastName || '')[0] || '');
  const centreId = student.centreId || 'bm';
  let centreName = 'Your centre';
  try { const p = window.getCentreProfile && window.getCentreProfile(centreId); if (p && p.name) centreName = p.name; else if (centreId === 'bm') centreName = 'Bright Minds Tuition'; } catch (e) { if (centreId === 'bm') centreName = 'Bright Minds Tuition'; }
  const currentStudent = {
    id: student.id,
    commsId: student.id === 's2' ? 'u_oliver' : 'u_' + student.id,
    fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
    displayName: student.firstName || 'Student',
    email: student.email || (student.account && student.account.syntheticEmail) || '',
    avatarInitials: initials.toUpperCase(),
    // A stable, human-readable student code for the identity card (JetBrains Mono).
    code: (student.account && student.account.username ? student.account.username : student.id).toUpperCase(),
    centreId, centreName,
    yearGroup, qualification: level,
  };

  // Sessions — the pupil's classes materialised on the register clock (the same
  // function the teacher's Attendance and dashboard use), with each past session's
  // attendance read back from the submitted register. Read-only: no self-booking.
  const now = nowMs();
  const reg = window.attReadStore ? window.attReadStore() : null;
  const myName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  let mat = [];
  if (reg && window.materialiseSessions && enrolClasses.length) {
    try { mat = window.materialiseSessions(enrolClasses, window.REGISTER_SETTINGS, now, reg, { backDays: 42, fwdDays: 35 }); } catch (e) { mat = []; }
  }
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const all = mat.map(s => {
    const enr = enrolments.find(e => e.classId === s.classId);
    const d = new Date(s.starts_at);
    const st = s.derived.state;
    let status;
    if (st === 'cancelled') status = 'cancelled';
    else if (st === 'recorded') {
      const roster = window.attRosterFor ? window.attRosterFor(s.classId, s.group, { students: store.students }) : [myName];
      const recs = (window.attRecordsFor && window.attRecordsFor(s, roster, reg)) || {};
      status = recs[myName] || 'not_marked';
    }
    else if (now < s.starts_at) status = 'upcoming';
    else if (now <= s.ends_at) status = 'live';
    else status = 'awaiting_register';   // it happened; the register isn't in yet
    const parts = String(s.cls.time || '').split(/[–—-]/).map(x => x.trim());
    const teacher = (typeof effectiveTeacher === 'function') ? effectiveTeacher(s.cls, s.dateISO) : s.teacher;
    return {
      id: s.id, classId: s.classId, subject: enr ? enr.subject : subjectOfClass(s.name), className: s.name, group: s.group,
      color: enr ? enr.subjectColor : colorFor(subjectOfClass(s.name)),
      dateISO: s.dateISO, monthKey: s.dateISO.slice(0, 7), day: d.getDate(),
      starts_at: s.starts_at, ends_at: s.ends_at,
      date: `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`,
      time: parts[1] ? `${parts[0]}–${parts[1]}` : (parts[0] || ''),
      teacher: teacher || 'Centre staff', coverFor: teacher && teacher !== s.teacher ? s.teacher : null,
      room: s.room || '—', status,
    };
  });
  const sessions = {
    all: all.slice().sort((a, b) => a.starts_at - b.starts_at),
    upcoming: all.filter(x => x.ends_at >= now).sort((a, b) => a.starts_at - b.starts_at),
    history: all.filter(x => x.ends_at < now).sort((a, b) => b.starts_at - a.starts_at),
  };
  // Attendance per class, from the registers: attended = present + late over every
  // marked session (excused is not counted against the pupil).
  enrolments.forEach(e => {
    const marked = sessions.history.filter(x => x.classId === e.classId && (x.status === 'present' || x.status === 'late' || x.status === 'absent'));
    e.sessionsTotal = marked.length;
    e.sessionsAttended = marked.filter(x => x.status !== 'absent').length;
  });

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

// ─── What pupils see (decision #54) ─────────────────────────────────────────────
// Centre policy, set in admin Settings → Centre: 'percentage' | 'grade' | 'both'.
// A grade here is always the INDICATIVE bucket from klasioGrades.pctToGrade on the
// pupil's own scale — never presented as an official result.
const pupilGradeDisplay = () => {
  try { const c = window.klasioCentreSettings && window.klasioCentreSettings(); return (c && c.pupilGradeDisplay) || 'both'; } catch (e) { return 'both'; }
};
const formatAttainment = (pct, qualification) => {
  if (pct == null || isNaN(Number(pct))) return '—';
  const mode = pupilGradeDisplay();
  const level = qualification || getCurrentStudent().qualification;
  const g = window.klasioGrades ? window.klasioGrades.pctToGrade(Number(pct), { level }) : null;
  if (mode === 'grade' && g) return g;
  if (mode === 'both' && g) return `${pct}% · ${g}`;
  return `${pct}%`;
};

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
// Marks a teacher has held back are NOT the student's to see: a returned paper only
// counts as 'marked' here once the marks are released. Delegates to the homework
// module's own predicate so there is one definition of "released".
const hwReleased = (a, sub) => {
  if (!sub) return false;
  if (window.klasioHomework && window.klasioHomework.marksReleased) {
    return window.klasioHomework.marksReleased(a, sub);
  }
  const s = (a && a.settings) || {};
  const graded = sub.status === 'returned' || sub.status === 'approved';
  if (!graded) return false;
  return (s.hideMarksUntilReleased || s.releaseAfterApproval) ? !!sub.marksReleasedAt : true;
};
const hwStateFor = (a, id) => {
  const sub = (a.submissions || {})[id];
  if (sub && hwReleased(a, sub)) return 'marked';
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
// Assignment rows for the active student. Selection goes through the one homework
// selector so this list and every homework count describe the same set.
const myAssignments = () => {
  const id = getActiveId();
  if (window.klasioHomework) return window.klasioHomework.listAssignments({ studentId: id });
  const s = readHw();
  if (!s || !s.assignments) return [];
  return Object.values(s.assignments).filter(a => (a.studentIds || []).includes(id) && a.status !== 'draft');
};
const hwCounts = () => window.klasioHomework
  ? window.klasioHomework.getHomeworkCounts({ studentId: getActiveId() })
  : null;
const scoreOf = (a, id) => {
  const sub = (a.submissions || {})[id];
  if (!sub || !sub.marks) return null;
  const pts = (a.questions || []).reduce((n, q) => n + (q.points || 1), 0);
  const got = Object.values(sub.marks).reduce((n, m) => n + (typeof m === 'number' ? m : 0), 0);
  return pts ? Math.round((got / pts) * 100) : null;
};

// Each metric returns null when there is nothing to measure yet (no published
// results) — a pupil is never shown 0% for work that hasn't been assessed.
const lastOf = (arr) => arr.length ? arr[arr.length - 1] : null;
const metrics = {
  termAverage() {
    const latest = getEnrolments().map(x => lastOf(x.scores)).filter(n => n != null);
    return latest.length ? Math.round(latest.reduce((s, n) => s + n, 0) / latest.length) : null;
  },
  subjectAverage(subject) { const e = getEnrolment(subject); return e && e.scores.length ? Math.round(e.scores.reduce((s, n) => s + n, 0) / e.scores.length) : null; },
  subjectLatest(subject)  { const e = getEnrolment(subject); return e ? lastOf(e.scores) : null; },
  // Attendance is read back from the registers (null = nothing marked yet).
  attendanceOverall() {
    const e = getEnrolments();
    const a = e.reduce((s, x) => s + x.sessionsAttended, 0);
    const t = e.reduce((s, x) => s + x.sessionsTotal, 0);
    return t ? Math.round((a / t) * 100) : null;
  },
  attendanceForClass(classId) { const e = getEnrolments().find(x => x.classId === classId); return e && e.sessionsTotal ? Math.round((e.sessionsAttended / e.sessionsTotal) * 100) : null; },
  attendanceForSubject(subject) { const e = getEnrolment(subject); return e && e.sessionsTotal ? Math.round((e.sessionsAttended / e.sessionsTotal) * 100) : null; },
  termTrendDelta() {
    const e = getEnrolments().filter(x => x.scores.length >= 2);
    if (!e.length) return null;
    const now = Math.round(e.reduce((s, x) => s + x.scores[x.scores.length - 1], 0) / e.length);
    const prev = Math.round(e.reduce((s, x) => s + x.scores[x.scores.length - 2], 0) / e.length);
    return now - prev;
  },
  // Class comparison only when the centre shows class averages to pupils (#59).
  subjectVsClass(subject) { const e = getEnrolment(subject); return showClassAverage() && e && e.scores.length ? (lastOf(e.scores) - lastOf(e.classAvg)) : null; },
  // A pupil's own direction of travel: latest result against the one before.
  subjectSinceLast(subject) { const e = getEnrolment(subject); return e && e.scores.length >= 2 ? e.scores[e.scores.length - 1] - e.scores[e.scores.length - 2] : null; },
  // Homework rollup for the Overview tiles + "Continue homework" target — from the
  // real homework store, so it matches the Homework page exactly.
  homeworkSummary() {
    const id = getActiveId();
    const pending = myAssignments()
      .filter(a => hwStateFor(a, id) === 'pending')
      .map(a => { const d = dueInfo(a); return { id: a.id, title: a.title, subject: a.subject, due: d.due, overdue: d.overdue, dueAt: a.dueAt ? new Date(a.dueAt).getTime() : null, status: 'pending' }; });
    const counts = hwCounts();
    return {
      pending,
      pendingCount: counts ? counts.pending : pending.length,
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

// Per-class (subject-scoped) homework, grouped by state — for the student class
// detail Homework tab. Reads the SAME real homework store as the Homework page, so
// the two never disagree. Returns { due, submitted, marked } arrays.
const homeworkForSubject = (subject) => {
  const id = getActiveId();
  const mine = myAssignments().filter(a => a.subject === subject);
  const out = { due: [], submitted: [], marked: [] };
  mine.forEach(a => {
    const state = hwStateFor(a, id);
    const d = dueInfo(a);
    const row = { id: a.id, title: a.title, subject: a.subject, due: d.due, overdue: d.overdue };
    if (state === 'marked') out.marked.push({ ...row, score: scoreOf(a, id) });
    else if (state === 'submitted') out.submitted.push(row);
    else out.due.push(row);
  });
  return out;
};

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

// ─── Pupil privacy (decisions #29 / #59) — centre policy, read at call time. ────
// Class average is off by default: a pupil sees their own trend, not where they sit
// against peers. Rank also needs the pupil to be at least rankMinAge.
const privacy = () => (window.klasioPrivacy ? window.klasioPrivacy() : { showRankToStudents: false, rankMinAge: 13, showClassAverageToStudents: false });
const showClassAverage = () => !!privacy().showClassAverageToStudents;
const ageOf = (dob, atMs) => {
  if (!dob) return null;
  const b = new Date(dob + 'T12:00:00'), n = new Date(atMs);
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
const showRank = () => {
  const p = privacy();
  if (!p.showRankToStudents) return false;
  const age = ageOf(build().student.dob, nowMs());
  return age != null && age >= (p.rankMinAge || 13);
};

// ─── One session, as the pupil sees it (the session drawer, decision #60) ────────
const sessionById = (id) => build().sessions.all.find(s => s.id === id) || null;
// Homework set IN this lesson: assignments for this class that became available
// between this session starting and the class's next session. Derived — an
// assignment carries no session link.
const homeworkForSession = (id) => {
  const b = build();
  const s = b.sessions.all.find(x => x.id === id);
  if (!s || !window.klasioHomework) return [];
  const next = b.sessions.all.filter(x => x.classId === s.classId && x.starts_at > s.starts_at && x.status !== 'cancelled')[0];
  const until = next ? next.starts_at : s.starts_at + 7 * 86400000;
  const me = b.student.id;
  return window.klasioHomework.listAssignments({ studentId: me, classLabel: s.group })
    .filter(a => { const t = new Date((a.settings && a.settings.availableFrom) || a.createdAt || 0).getTime(); return t >= s.starts_at && t < until; })
    .map(a => ({ id: a.id, title: a.title, due: dueInfo(a).due, overdue: dueInfo(a).overdue, state: hwStateFor(a, me) }));
};
// The lesson's title/topic/objectives — only when the teacher shared that delivery.
const lessonSummaryFor = (id) => {
  const s = sessionById(id);
  return s && window.klasioLessons ? window.klasioLessons.pupilSummaryFor(s.classId, s.dateISO) : null;
};
// Files the teacher made visible to pupils on that lesson (never mark schemes).
const filesForSession = (id) => {
  const s = sessionById(id);
  if (!s || !window.klasioLessons || !window.klasioResources || !window.klasioResources.studentFilesForLesson) return [];
  const d = window.klasioLessons.deliveryFor(s.classId, s.dateISO);
  return d ? window.klasioResources.studentFilesForLesson(d.lessonId) : [];
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
  resolveTeacher, formatGrade, formatAttainment, pupilGradeDisplay, metrics, homeworkForSubject,
  dueState, dueLabel, getContinueHomework,
  GradeChip,
  listStudents, getActiveId,
  // clock, calendar, privacy and the session drawer
  now: nowMs, monthModel, showClassAverage, showRank,
  sessionById, homeworkForSession, lessonSummaryFor, filesForSession,
  get student() { return build().student; },
};

})();
