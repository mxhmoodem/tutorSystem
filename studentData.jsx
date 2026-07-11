// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — Student single sources of truth (Sections 1–7)
//  Exposed as window.klasioStudent. Loaded after the mocks + teacherGrades.jsx
//  (needs window.klasioGrades) and BEFORE StudentDashboard.jsx / Reports.jsx /
//  Settings.jsx read it. Every student screen reads identity, enrolments, grades,
//  rollup metrics, the resolved teacher for a subject, and the active term FROM
//  HERE — no screen re-hardcodes a name, a subject, a teacher or a number.
//
//  ── Multi-tenant scalability contract (backend phase — do NOT implement here) ──
//  currentStudent belongs to exactly ONE centreId; the student surface never
//  renders an account-tier concept. Intended RLS read-set for this principal:
//    • own profile (currentStudent)
//    • own enrolments (getEnrolments)
//    • own homework / submissions / results, own reports, sessions for their
//      enrolled classes, and announcements targeted at platform / their centre /
//      their class.
//  NEVER: another student's marks, another class's roster, anything account-scoped.
//  Messages: group membership is tenant-scoped — a student can never be added to a
//  group outside their centre, and never to a student-only / DM thread.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

// ─── §1 Canonical principal ─────────────────────────────────────────────────
// One record. Header, greeting, Account settings, Homework, Reports and Comms
// all resolve the logged-in student to this. The divergent "Aisha Khan" persona
// is deleted from settings.mock; the standalone "Oliver Chen" strings elsewhere
// resolve here.
const currentStudent = {
  id: 's_oliver',            // homework / reports principal id
  commsId: 'u_oliver',       // messaging principal id (COMMS_SELF.student)
  fullName: 'Oliver Chen',
  displayName: 'Oliver',
  email: 'oliver.chen@student.brightpath.edu',
  avatarInitials: 'OC',
  centreId: 'bm',
  yearGroup: 'Year 12',
  qualification: 'A-Level',  // drives the grade scheme for every enrolment below
};

// ─── §7 Active term — one value drives the Overview banner, the Sessions default
//     month, and the Progress assessment cadence. Kills the Spring/Summer/April
//     three-way contradiction. ("today" is the demo clock the Sessions grid pins.)
const activeTerm = {
  name: 'Summer Term',
  week: 2,
  get banner() { return `${this.name} · Week ${this.week}`; },
  // The Sessions calendar reads this single month descriptor (April 2026: 1 Apr =
  // Wednesday → firstDow 2; 30 days; demo "today" = 23 Apr).
  calendar: { name: 'April 2026', firstDow: 2, days: 30, today: 23 },
  // Shared assessment cadence for the Progress trend/table (8 most recent).
  assessmentLabels: ['4 Mar', '11 Mar', '18 Mar', '25 Mar', '1 Apr', '8 Apr', '15 Apr', '22 Apr'],
};

// ─── §2 Enrolment — single source of truth ──────────────────────────────────
// Rows keyed to currentStudent. Overview subject cards, Progress tabs, Sessions
// subjects, Assignments/Results/Reports subject filters ALL derive from these.
// Teacher names reconcile with reports.mock (the authoritative teacher SoT):
// Maths & Further Maths → Ms. Sarah Clarke; Physics & Chemistry → Mr. David Park.
// predictedGrade is teacher-set and read-only to the student (single-sourced).
// `scores` are the ground-truth per-assessment marks; `sessionsAttended/Total`
// are the ground-truth attendance rows the attendance metric derives from.
const enrolments = [
  { classId: 'c_alevel_math', subject: 'Mathematics',   subjectColor: '#43b190',
    teacherId: 't_clarke', teacher: 'Ms. Sarah Clarke', room: 'Room 3',
    yearGroup: 'Year 12', qualification: 'A-Level', predictedGrade: 'A*',
    scores: [82, 85, 84, 88, 90, 89, 92, 94], classAvg: [70, 71, 72, 74, 75, 76, 77, 78],
    sessionsAttended: 49, sessionsTotal: 50, sessionsPerWeek: 2 },
  { classId: 'c_alevel_fm', subject: 'Further Maths', subjectColor: '#7C3AED',
    teacherId: 't_clarke', teacher: 'Ms. Sarah Clarke', room: 'Room 5',
    yearGroup: 'Year 12', qualification: 'A-Level', predictedGrade: 'A',
    scores: [78, 80, 82, 83, 85, 86, 87, 88], classAvg: [68, 69, 70, 71, 72, 73, 74, 75],
    sessionsAttended: 48, sessionsTotal: 50, sessionsPerWeek: 1 },
  { classId: 'c_alevel_phys', subject: 'Physics', subjectColor: '#0891B2',
    teacherId: 't_park', teacher: 'Mr. David Park', room: 'Room 7',
    yearGroup: 'Year 12', qualification: 'A-Level', predictedGrade: 'A',
    scores: [72, 74, 77, 79, 78, 80, 81, 81], classAvg: [66, 67, 68, 69, 70, 71, 72, 73],
    sessionsAttended: 47, sessionsTotal: 50, sessionsPerWeek: 1 },
  { classId: 'c_alevel_chem', subject: 'Chemistry', subjectColor: '#D97706',
    teacherId: 't_park', teacher: 'Mr. David Park', room: 'Room 8',
    yearGroup: 'Year 12', qualification: 'A-Level', predictedGrade: 'A',
    scores: [68, 70, 73, 72, 75, 77, 78, 80], classAvg: [64, 65, 66, 67, 68, 69, 70, 71],
    sessionsAttended: 46, sessionsTotal: 50, sessionsPerWeek: 1 },
];

const getEnrolments = () => enrolments;
const getSubjects   = () => enrolments.map(e => e.subject);
const getEnrolment  = (subject) => enrolments.find(e => e.subject === subject) || null;

// ─── §6 Teacher identity resolution — one place. Sessions, Assignments, Reports,
//     Overview all show the SAME resolved name for a subject.
const resolveTeacher = (subject) => {
  const e = getEnrolment(subject);
  return e ? e.teacher : '—';
};

// ─── §3 Canonical grade model — every grade chip renders through this. The scheme
//     is a property of the qualification on the enrolment (A-Level → A*–E,
//     GCSE → 9–1), backed by window.klasioGrades.GRADE_SCALES (per-centre override
//     later). Predicted grades are already teacher-set letters, so a string passes
//     through; a numeric score is banded via klasioGrades.pctToGrade.
const formatGrade = (value, qualification) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value == null || value === '' || isNaN(Number(value))) return '—';
  const level = qualification || currentStudent.qualification;
  if (window.klasioGrades && window.klasioGrades.pctToGrade) {
    return window.klasioGrades.pctToGrade(Number(value), { level });
  }
  return String(value);
};

// ─── §4 Single metrics layer ────────────────────────────────────────────────
// Everything a rollup screen shows derives from the ground-truth records above,
// each figure labelled by population + window at the call site. Conflicts the
// spec names are reconciled here: Overview "term average, all subjects" vs
// Progress "<subject>, this term"; ONE attendance figure both screens read.
const latest = (arr) => (arr && arr.length ? arr[arr.length - 1] : 0);
const mean   = (arr) => (arr && arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0);

const metrics = {
  // Term average across ALL subjects = mean of each subject's latest assessment.
  termAverage() { return Math.round(enrolments.reduce((s, e) => s + latest(e.scores), 0) / enrolments.length); },
  // Per-subject average across this term's assessments (label: "<subject>, this term").
  subjectAverage(subject) { const e = getEnrolment(subject); return e ? mean(e.scores) : 0; },
  subjectLatest(subject)  { const e = getEnrolment(subject); return e ? latest(e.scores) : 0; },
  // ONE attendance % — sum of attended over total across enrolments. Overview
  // shows this (all subjects); Progress shows the per-subject figure below; both
  // derive from the same sessionsAttended/Total rows.
  attendanceOverall() {
    const a = enrolments.reduce((s, e) => s + e.sessionsAttended, 0);
    const t = enrolments.reduce((s, e) => s + e.sessionsTotal, 0);
    return t ? +( (a / t) * 100 ).toFixed(1) : 0;
  },
  attendanceForSubject(subject) {
    const e = getEnrolment(subject);
    return e && e.sessionsTotal ? Math.round((e.sessionsAttended / e.sessionsTotal) * 100) : 0;
  },
  sessionsPerWeek() { return enrolments.reduce((s, e) => s + e.sessionsPerWeek, 0); },
  // Trend delta: change from the previous assessment to the latest (COMPUTED, not
  // decorative). Returns a signed integer (percentage points).
  termTrendDelta() {
    const prev = Math.round(enrolments.reduce((s, e) => s + (e.scores[e.scores.length - 2] ?? latest(e.scores)), 0) / enrolments.length);
    return this.termAverage() - prev;
  },
  subjectVsClass(subject) {
    const e = getEnrolment(subject);
    return e ? latest(e.scores) - latest(e.classAvg) : 0;
  },
  // Homework rollup for the Overview tiles + "Continue homework" target. Reads the
  // studentHomework mock (the same list the Overview already renders) so the count
  // is internally sourced and labelled. TODO(backend): unify with the Homework
  // store so Overview and the Homework page share one submission record set.
  homeworkSummary() {
    const hw = (typeof studentHomework !== 'undefined' ? studentHomework : []);
    const pending = hw.filter(h => h.status === 'pending');
    return {
      pending,
      pendingCount: pending.length,
      urgentCount: pending.filter(h => dueState(h) === 'due-today' || dueState(h) === 'overdue').length,
    };
  },
  // Results rollup (marked homework population) — labelled distinctly from the
  // assessment average above.
  resultsSummary() {
    const hw = (typeof studentHomework !== 'undefined' ? studentHomework : []);
    const marked = hw.filter(h => h.status === 'marked' && typeof h.score === 'number');
    if (!marked.length) return { average: 0, best: 0, completed: 0 };
    return {
      average: Math.round(marked.reduce((s, h) => s + h.score, 0) / marked.length),
      best: Math.max(...marked.map(h => h.score)),
      completed: marked.length,
    };
  },
};

// ─── Due-state — a SINGLE correct state per homework item (fixes the Overview
//     "Overdue" + "Due Tomorrow" simultaneous contradiction, §9). Derived from
//     the mock's `due` string + `urgent` flag.
const dueState = (hw) => {
  const d = String(hw && hw.due || '');
  if (hw && hw.overdue) return 'overdue';
  if (/today/i.test(d)) return 'due-today';
  if (/tomorrow/i.test(d)) return 'due-tomorrow';
  return 'upcoming';
};
const dueLabel = (hw) => ({ overdue: 'Overdue', 'due-today': 'Due today', 'due-tomorrow': 'Due tomorrow', upcoming: 'Upcoming' }[dueState(hw)]);

// The Overview "Continue homework" CTA targets the most-urgent in-progress item:
// overdue first, then due-today, then earliest upcoming.
const getContinueHomework = () => {
  const { pending } = metrics.homeworkSummary();
  const rank = { overdue: 0, 'due-today': 1, 'due-tomorrow': 2, upcoming: 3 };
  return pending.slice().sort((a, b) => rank[dueState(a)] - rank[dueState(b)])[0] || null;
};

// ─── Sessions — derived rows. Teacher + room come from the enrolment (§6), so no
//     screen invents "Mr Davies" / "Dr Patel". Attended/Missed status is the same
//     record family that feeds the attendance metric. Read-only (no self-booking).
const sessions = {
  upcoming: [
    { subject: 'Mathematics',   date: 'Mon 21 Apr', time: '09:00–10:00', day: 21 },
    { subject: 'Further Maths', date: 'Tue 22 Apr', time: '10:15–11:15', day: 22 },
    { subject: 'Physics',       date: 'Wed 23 Apr', time: '13:00–14:00', day: 23 },
    { subject: 'Mathematics',   date: 'Thu 24 Apr', time: '09:00–10:00', day: 24 },
    { subject: 'Chemistry',     date: 'Fri 25 Apr', time: '15:00–16:00', day: 25 },
  ].map(s => ({ ...s, teacher: resolveTeacher(s.subject), room: (getEnrolment(s.subject) || {}).room })),
  history: [
    { subject: 'Further Maths', date: 'Mon 14 Apr', time: '10:15–11:15', status: 'attended', day: 14 },
    { subject: 'Physics',       date: 'Wed 16 Apr', time: '13:00–14:00', status: 'attended', day: 16 },
    { subject: 'Mathematics',   date: 'Thu 17 Apr', time: '09:00–10:00', status: 'attended', day: 17 },
    { subject: 'Further Maths', date: 'Tue 8 Apr',  time: '10:15–11:15', status: 'missed',   day: 8 },
  ].map(s => ({ ...s, teacher: resolveTeacher(s.subject), room: (getEnrolment(s.subject) || {}).room })),
};

// ─── §10 Shared grade chip ──────────────────────────────────────────────────
// ONE component every student screen renders a grade through (Overview cards,
// Progress summary + rail, and any future grade surface). It always routes the
// value through formatGrade (§3) so the scheme is never re-derived at a call site.
//   variant="pill" → soft-filled pill (default)   variant="bare" → coloured letter
const GradeChip = ({ value, qualification, color, variant = 'pill', title = 'Predicted grade' }) => {
  const g = formatGrade(value, qualification);
  const c = color || (window.DS && window.DS.accent) || '#0F9D7F';
  if (variant === 'bare') {
    return <span title={title} style={{ fontWeight: 800, color: c }}>{g}</span>;
  }
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: c, background: c + '18',
      border: `1px solid ${c}44`, borderRadius: 8, padding: '2px 9px', minWidth: 26,
    }}>{g}</span>
  );
};

window.klasioStudent = {
  currentStudent, activeTerm,
  enrolments, getEnrolments, getSubjects, getEnrolment,
  resolveTeacher, formatGrade, metrics,
  dueState, dueLabel, getContinueHomework, sessions,
  GradeChip,
};

})();
