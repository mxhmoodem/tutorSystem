// ══════════════════════════════════════════════════════════════
//  Klasio — Teacher-metrics selector layer (single source of truth · F2)
//
//  The teacher-tier sibling of centreMetrics.jsx. Every teacher screen reads its
//  counts from here — no screen recomputes its own students/classes/at-risk. The
//  Dashboard "my students", My Classes "students total", My Students "N across M
//  classes" and Analytics "total assigned" all resolve through these selectors so
//  they reconcile (heads vs enrolments vs assignments — right term, same numbers).
//
//  ── TEACHER SCOPE KEY (§ multi-tenant) ────────────────────────────────────────
//  scope = centreId + teacherId + termId. "My students" is the DERIVED INTERSECTION
//  of students in classes where THIS teacher is assigned, this term — built as a
//  JOIN through class-assignment (getMyClasses → classIds → students), NOT a
//  "teacher owns student" field. The future RLS policy is a direct translation of
//  this join. termId is threaded so prior-term data resolves read-only later.
//
//  Frontend-only; reads localStorage non-reactively per call (same discipline as
//  centreMetrics). Reuses centreMetrics' audit write-path (window.klasioAudit) and
//  the canonical grade model (window.klasioGrades). Loads after those + the mocks,
//  before the page modules; exposed as window.teacherMetrics.
// ══════════════════════════════════════════════════════════════
(() => {

const TM_CENTRE = (window.ONB_CENTRE && window.ONB_CENTRE.id) || 'bm';
// The signed-in teacher principal for the demo (F4). One identity that the topbar,
// greeting, deliverer, signature and "teacher = You" all resolve through.
const TM_PRINCIPAL_NAME = 'Heebz A';

// ── Store reads (non-reactive) ──────────────────────────────────────────────
const tmReadRoster = () => {
  try {
    const raw = localStorage.getItem('admin_store_v4');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        teachers: p.teachers || window.SEED_TEACHERS || [],
        classes:  p.classes  || window.SEED_CLASSES  || [],
        students: p.students || window.SEED_STUDENTS  || [],
      };
    }
  } catch (e) {}
  return { teachers: window.SEED_TEACHERS || [], classes: window.SEED_CLASSES || [], students: window.SEED_STUDENTS || [] };
};

// The current term (a real scope dimension, not just a label). Resolved from the
// centre term schedule if present; the id is threaded through selector signatures
// so a future "prior term = read-only" filter is a one-line change.
const getCurrentTerm = () => {
  try { if (window.readTermIndicator) { const t = window.readTermIndicator(); if (t) return t; } } catch (e) {}
  return { id: 'summer-2026', name: 'Summer Term 2026' };
};

// ── Principal (§ identity / F4) ──────────────────────────────────────────────
const getPrincipal = () => {
  const { teachers } = tmReadRoster();
  const t = teachers.find(x => x.name === TM_PRINCIPAL_NAME) || teachers[0] || null;
  return {
    id: (t && t.id) || 't1',
    name: (t && t.name) || TM_PRINCIPAL_NAME,
    email: (t && t.email) || 's.clarke@centre.co.uk',
    color: (t && t.color) || '#4F46E5',
    subject: (t && t.subject) || 'Mathematics',
  };
};

// ── The class-assignment join (the RLS-shaped query) ─────────────────────────
// Classes this teacher is assigned to, this term. `paused`/`archived` excluded.
const getMyClasses = (centreId, teacherId, termId) => {
  const { classes, teachers } = tmReadRoster();
  const name = (() => {
    if (teacherId) { const t = teachers.find(x => x.id === teacherId); if (t) return t.name; }
    return getPrincipal().name;
  })();
  return classes.filter(c => c.teacher === name && c.status !== 'paused' && c.status !== 'archived');
};

// Distinct student HEADS across the teacher's classes — the join, deduped by id.
// (A student in three of the teacher's classes counts ONCE here.)
const getMyStudents = (centreId, teacherId, termId) => {
  const { students } = tmReadRoster();
  const myClassIds = new Set(getMyClasses(centreId, teacherId, termId).map(c => c.id));
  return students.filter(s => Array.isArray(s.classIds) && s.classIds.some(id => myClassIds.has(id)));
};

// Subjects the teacher actually teaches (distinct, from their assigned classes).
const getSubjectsTaught = (centreId, teacherId, termId) => {
  const names = new Set();
  getMyClasses(centreId, teacherId, termId).forEach(c => {
    // Class `name` carries "GCSE Mathematics" etc — strip the level prefix to the subject.
    const subj = String(c.name || '').replace(/^(GCSE|A-Level|KS3|IB|Entry Level)\s+/, '');
    if (subj) names.add(subj);
  });
  return Array.from(names);
};

// ── ONE at-risk rule (D5) ────────────────────────────────────────────────────
// attendance < 85%  OR  hw completion < 60%  OR  a declining score trend  OR an
// explicit staff flag. Advisory + explainable (AADC: a minor is never opaquely
// profiled — the reason is always surfaced and a human keeps the decision).
// NOTE: the ADMIN/centre tier (centreMetrics.jsx) uses its own historical
// thresholds (75/50/55). This is the TEACHER-surface rule per D5; both are single
// definitions within their tier, and Dashboard == My Students because both read
// THIS function.
const AT_RISK = { attendance: 85, completion: 60 };
const num = (v, d) => (typeof v === 'number' ? v : d);

// Best-effort declining-trend signal from the dashboard score series (by name),
// since the roster record itself stores only point-in-time figures.
const isDeclining = (s) => {
  try {
    const series = (window.studentProgress || []).find(p => p.name === `${s.firstName} ${s.lastName}` || p.name === s.name);
    if (series) {
      if (series.trend === 'down') return true;
      if (Array.isArray(series.scores) && series.scores.length >= 2) {
        return series.scores[series.scores.length - 1] < series.scores[0] - 2;
      }
    }
  } catch (e) {}
  return false;
};

const atRiskReason = (s) => {
  if (num(s.attendance, 100) < AT_RISK.attendance) return `Attendance ${num(s.attendance, 0)}%`;
  if (num(s.hw, 100)         < AT_RISK.completion) return `Homework ${num(s.hw, 0)}%`;
  if (isDeclining(s))                              return 'Declining scores';
  if (s.status === 'at-risk')                      return 'Flagged by staff';
  return null;
};
const isAtRisk = (s) => atRiskReason(s) != null;
const getAtRiskStudents = (centreId, teacherId, termId) =>
  getMyStudents(centreId, teacherId, termId).filter(isAtRisk);

// ── Homework "to mark" — derived from the homework module's ground truth ──────
// Σ (submitted − marked) across the teacher's open/marking assignments. Reads the
// teacherPages homeworkFull seed (the teacher's own list); never a stored count.
const getToMark = () => {
  const hw = window.homeworkFull || [];
  return hw.reduce((n, a) => n + Math.max(0, (a.submitted || 0) - (a.marked || 0)), 0);
};

// ── The one metrics bundle every screen reads ────────────────────────────────
const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
const getMetrics = (centreId, teacherId, termId) => {
  const c = centreId || TM_CENTRE;
  const t = teacherId || getPrincipal().id;
  const term = termId || getCurrentTerm().id;
  const classes = getMyClasses(c, t, term);
  const students = getMyStudents(c, t, term);
  const withNum = (key) => students.map(s => s[key]).filter(n => typeof n === 'number' && n > 0);
  return {
    // heads vs enrolments vs assignments — reconciled, labelled distinctly
    activeClasses:    classes.length,
    distinctStudents: students.length,                                   // unique heads
    enrolments:       classes.reduce((n, cl) => n + (cl.students || 0), 0), // Σ class sizes
    // derived rates (never stored)
    hwCompletion:  avg(withNum('hw')),
    avgAttendance: avg(withNum('attendance')),
    avgScore:      avg(withNum('score')),
    atRisk:        students.filter(isAtRisk).length,
    toMark:        getToMark(),
    subjects:      getSubjectsTaught(c, t, term),
    term:          getCurrentTerm(),
  };
};

// ── Pagination / sort / filter contract (§ multi-tenant) ─────────────────────
// The component API already accepts { page, pageSize, sort, filter }; faked
// against localStorage today, a direct translation to a server query later.
// filter: { q, status: 'all'|'active'|'at-risk' }.
const queryStudents = ({ page = 1, pageSize = 25, sort = null, filter = {} } = {}, scope = {}) => {
  let rows = getMyStudents(scope.centreId, scope.teacherId, scope.termId).map(s => ({
    ...s,
    name: s.name || `${s.firstName} ${s.lastName}`,
    atRisk: isAtRisk(s),
    atRiskReason: atRiskReason(s),
  }));
  const f = filter || {};
  if (f.status === 'active')  rows = rows.filter(s => !s.atRisk && s.status !== 'inactive');
  if (f.status === 'at-risk') rows = rows.filter(s => s.atRisk);
  if (f.q) {
    const q = String(f.q).toLowerCase();
    rows = rows.filter(s => s.name.toLowerCase().includes(q));
  }
  if (sort && sort.key) {
    const dir = sort.dir === 'desc' ? -1 : 1;
    rows = rows.slice().sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize, sort, filter: f };
};

window.teacherMetrics = {
  TM_PRINCIPAL_NAME,
  getPrincipal, getCurrentTerm,
  getMyClasses, getMyStudents, getSubjectsTaught,
  AT_RISK, atRiskReason, isAtRisk, getAtRiskStudents,
  getToMark, getMetrics, queryStudents,
};

})();
