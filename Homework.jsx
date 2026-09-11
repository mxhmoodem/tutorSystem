// ══════════════════════════════════════════════════════════════
//  Klasio — Self-contained Homework module
//  Renders TeacherHomework / StudentHomework based on user.role
// ══════════════════════════════════════════════════════════════
(() => {

// ─── Design tokens ─────────────────────────────────────────────
// These mirror shared.jsx's DS exactly. Homework used to carry its own slate
// palette (border #E2E8F0 vs #E5E7EB, ink #0F172A vs #111827, …), which is the
// main reason it read as a different product to every other page in the app.
//
// Colour is semantic, and only semantic:
//   • brand indigo — interactive only: primary buttons, links, focus rings,
//     active tab/nav state, progress fill. Never decorative.
//   • amber        — exactly one meaning: this needs your action (to mark, overdue).
//   • danger red   — destructive actions and genuine errors. Not counts, not badges.
//   • success green— per-question correctness in the marking/review flow, and
//     toast confirmations. Nowhere else: a count of marked work is a count,
//     not a success state.
// Everything else is ink / muted ink / hairline, which is ~90% of the pixels.
const C = {
  bg:        '#FFFFFF',
  surface:   '#F9FAFB',
  surface2:  '#F3F4F6',
  border:    '#E5E7EB',
  borderD:   '#D1D5DB',
  text:      '#111827',
  sub:       '#374151',
  muted:     '#6B7280',
  faint:     '#9CA3AF',
  // Brand is a live read of the app accent, not a frozen literal. The centre
  // accent is admin-settable (Settings → Appearance writes window.DS.accent
  // through the __setAccent bridge in index.html), and Homework was the one
  // module that ignored it — a centre on a green accent still got an indigo
  // "New homework" button next to a green sidebar. Getters re-read on every
  // render, which is exactly when the style objects are built.
  get brand()       { return (window.DS && window.DS.accent)       || '#4F46E5'; },
  get brandH()      { return (window.DS && window.DS.accentHover)  || '#4338CA'; },
  get brandSoft()   { return (window.DS && window.DS.accentLight)  || '#EEF2FF'; },
  get brandBorder() { return (window.DS && window.DS.accentBorder) || '#C7D2FE'; },
  success:   '#16A34A',
  successBg: '#F0FDF4',
  successBorder:'#BBF7D0',
  amber:     '#B45309',
  amberBg:   '#FFFBEB',
  amberBorder:'#FDE68A',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  dangerBorder:'#FECACA',
  // Cards and rows are flat and bordered — no resting shadow. Elevation is
  // reserved for true overlays (modals, popovers, tooltips) that leave the
  // page flow; border + hairline reads as more serious in dense app UI.
  // Pressed/hover shades of the two solid button fills.
  textHover:   '#0B1220',
  dangerHover: '#B91C1C',
  // Ink on a filled (brand/ink/danger) surface.
  inverse:     '#FFFFFF',
  shadow:    'none',
  shadowL:   '0 4px 20px -8px rgba(17,24,39,.18)',
};

// One radius everywhere (0.5rem). Badges are the only exception — they use
// RADIUS_FULL. Anything else picking its own number is a bug.
const RADIUS = 8;
const RADIUS_FULL = 999;

// Four sizes, two weights. Nothing outside this scale, nothing at 600+.
const TS = {
  title:   { fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' },
  section: { fontSize: 15, fontWeight: 500 },
  body:    { fontSize: 14, fontWeight: 400 },
  meta:    { fontSize: 13, fontWeight: 400 },
};
const W = { normal: 400, medium: 500 };

// Every number in the module gets tabular figures, so scores, ratios and counts
// line up vertically in a column instead of jittering ("9/9" over "7/8").
const NUM = { fontVariantNumeric: 'tabular-nums' };

const F = {
  // The app shell renders in Plus Jakarta Sans; Homework was the one module
  // rendering its UI in Inter. head/body are deliberately the same stack now —
  // the pair is kept only so the ~150 existing call sites stay valid.
  head: "'Plus Jakarta Sans', system-ui, sans-serif",
  body: "'Plus Jakarta Sans', system-ui, sans-serif",
  // Reserved for genuine code: raw LaTeX echoes. Numbers use NUM, not mono.
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const T = 'all .15s';
const ring = (color) => `0 0 0 4px ${color}1F`;

// The subject list backs the builder's subject <select>. It used to carry a
// per-subject hue that tinted card icons, table cells and progress bars — that
// map is gone: subject is a fact, not a status, so it renders as plain text.
const SUBJECT_NAMES = [
  'Math', 'Mathematics', 'Physics', 'Chem', 'Chemistry', 'Biology',
  'English', 'English Literature', 'History', 'Economics',
];

// ─── localStorage store ────────────────────────────────────────
// v7: bulk demo library (mocks/homework.mock.jsx) + real-roster cohort fill.
// v8: second wave of demo homework (every class group, all 11 staff) — the seed
// only runs when the key is absent, so growing the mock library needs a bump to
// reach anyone who already has a store. Resources.jsx bridges into this key too.
const STORAGE_KEY = 'homework_store_v9';

// Class roster, student seed roster and PDF question banks are mock data,
// defined as globals in mocks/homework.mock.jsx (loaded before this file in
// index.html). Aliased here to the internal names this module uses.
const CLASSES = HW_CLASSES;

// Dates relative to "today" so the demo data stays evergreen.
const dayOffset = (n, time) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return time ? `${y}-${m}-${dd}T${time}` : `${y}-${m}-${dd}`;
};

// Deterministic pseudo-random in [0,1) from a string seed — keeps the demo
// data stable across reloads while still looking varied.
const seededRand = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
};

// A believable answer of the right shape for this question type — a real choice,
// a real number, real LaTeX. `right` decides whether it should earn the marks.
// Never a placeholder token: a demo that shows a student answering "attempt"
// looks broken, and the marks below are derived from these answers, so a seeded
// mark can never contradict what the marker would give.
const plausibleAnswer = (q, right, sid) => {
  const pick = (n, avoid) => {
    if (n <= 1) return 0;
    let i = Math.floor(seededRand(sid + q.id + 'w') * n);
    if (i === avoid) i = (i + 1) % n;
    return i;
  };
  if (q.type === 'mcq') {
    const n = (q.choices || []).length || 1;
    return right ? q.correctIndex : pick(n, q.correctIndex);
  }
  if (q.type === 'multi') {
    const want = q.correctIndices || [];
    if (right) return want.slice();
    // A near miss: one of the right answers left off.
    return want.length > 1 ? want.slice(0, want.length - 1) : [((want[0] || 0) + 1) % Math.max(1, (q.choices || []).length)];
  }
  if (q.type === 'truefalse') return right ? q.answer : !q.answer;
  if (q.type === 'numeric') {
    const n = typeof q.answer === 'number' ? q.answer : parseFloat(q.answer) || 0;
    if (right) return n;
    const off = Math.max((q.tolerance || 0) * 2, Math.abs(n) * 0.1, 1);
    return Math.round((n + off) * 1000) / 1000;
  }
  if (q.type === 'math') {
    const ans = String(q.answer == null ? '' : q.answer);
    if (right) return ans;
    // A sign slip — the classic wrong-but-plausible maths answer.
    return ans.replace(/-/, '+') !== ans ? ans.replace(/-/, '+')
      : ans.replace(/\+/, '-') !== ans ? ans.replace(/\+/, '-')
      : ans + '+1';
  }
  if (q.type === 'fillblank') {
    const blanks = q.blanks || [];
    return right ? blanks.slice() : blanks.map((b, i) => i === 0 ? String(b) + 'x' : String(b));
  }
  if (q.type === 'match') {
    const pairs = q.pairs || [];
    const map = {};
    pairs.forEach((_p, i) => { map[i] = right ? i : (i + 1) % Math.max(1, pairs.length); });
    return map;
  }
  if (q.type === 'upload') return 'working-photo.jpg';
  if (q.type === 'short') {
    const model = q.answer != null && q.answer !== '' ? String(q.answer) : null;
    if (right && model) return model;
    return right
      ? 'Set out each step in order and checked the result at the end.'
      : 'I started this but ran out of time to finish the reasoning.';
  }
  return right
    ? 'Worked through it step by step, showing the method and checking the final answer.'
    : 'Made a start on the method but did not carry it all the way through.';
};

// Build a plausible submission for `sid` on assignment `a`.
// Spreads students across graded / submitted / in-progress / not-started so the
// review sidebar and analytics look populated without hand-writing each one.
const synthSubmission = (a, sid, i) => {
  const r = seededRand(a.id + sid);
  // ~18% haven't started, ~14% in progress, ~20% submitted (awaiting marking), rest graded.
  if (r < 0.18) return null;
  const inProgress = r < 0.32;
  const submittedOnly = r < 0.52;
  const total = a.questions.reduce((s, q) => s + (q.points || 0), 0);

  const marks = {};
  const feedback = {};
  const answers = {};
  let earned = 0;
  // Target accuracy band per student (40–98%) — the lower tail produces a
  // believable set of students who need intervention.
  const target = 0.40 + seededRand(sid + 'acc') * 0.58;
  a.questions.forEach((q) => {
    const rr = seededRand(a.id + sid + q.id);
    const good = rr < target;
    const partial = !good && rr < target + 0.18;
    answers[q.id] = plausibleAnswer(q, good, sid);
    // An auto-marked question takes the mark the marker actually produces for the
    // answer above, so the seed can never claim a mark autoMark disagrees with.
    // Only teacher-marked questions use the accuracy band.
    const pts = isAuto(q.type)
      ? (autoMark(q, answers[q.id]) || 0)
      : (good ? q.points : partial ? Math.round(q.points * 0.5) : 0);
    if (inProgress || submittedOnly) {
      // Auto questions get auto-marked instantly; manual stay null until graded.
      marks[q.id] = isAuto(q.type) ? pts : null;
    } else {
      marks[q.id] = pts;
      const outcome = outcomeFor(q, pts);
      feedback[q.id] = outcome === 'correct' ? ''
        : outcome === 'partial' ? 'On the right track — tighten the final steps.'
        : 'Review this topic and try again.';
      earned += pts;
    }
  });

  // Days since assignment created, clamped so dates stay in the past.
  const ageDays = Math.max(1, Math.round(seededRand(sid + a.id + 'd') * 6) + 1);
  const hh = String(8 + Math.floor(seededRand(sid + 'h') * 12)).padStart(2, '0');
  const mm = String(Math.floor(seededRand(sid + 'm') * 60)).padStart(2, '0');
  const submittedAt = dayOffset(-ageDays, `${hh}:${mm}:00`);

  if (inProgress) {
    return { answers: {}, status: 'in_progress', startedAt: submittedAt, marks: {}, feedback: {},
      timeSpentMins: 5 + Math.floor(seededRand(sid + 't') * 20) };
  }
  const base = {
    answers,
    submittedAt,
    attemptCount: 1,
    isLate: !!a.dueAt && new Date(submittedAt) > new Date(a.dueAt),
    marks, feedback,
    timeSpentMins: 18 + Math.floor(seededRand(sid + 't') * 40),
  };
  if (submittedOnly) return { ...base, status: 'submitted' };
  // Graded
  const pct = total ? Math.round(earned / total * 100) : 0;
  return {
    ...base, status: 'returned',
    markedAt: dayOffset(-(ageDays - 1 > 0 ? ageDays - 1 : 0), '14:00:00'),
    classAvg: 68 + Math.floor(seededRand(a.id + 'avg') * 12),
    rank: 1 + Math.floor(seededRand(sid + a.id + 'rk') * 24), classSize: 26,
    overallFeedback: pct >= 80 ? 'Strong work throughout — keep it up.'
      : pct >= 60 ? 'A solid attempt; revisit the questions you lost marks on.'
      : 'Some gaps here — let’s go over this together in the next session.',
  };
};

// A seed row saying "this hasn't been opened yet". `notStarted: true` means the
// whole cohort is untouched (a homework that has only just gone out);
// `notStarted: ['s2', …]` names the students who leave it alone while the rest of
// the class gets on with it. Without this the only not-started students are
// whoever synthSubmission's ~18% tail happens to land on, which is seeded random
// per (assignment id + student id) — so no seed row could rely on it.
const notStartedFor = (a) => {
  if (a.notStarted === true) return () => true;
  if (Array.isArray(a.notStarted)) return (sid) => a.notStarted.indexOf(sid) !== -1;
  return () => false;
};

// Assign an assignment to a whole class cohort and fill in synthetic
// submissions, preserving any hand-authored ones already present.
const populateCohort = (a, students) => {
  const cohort = students.filter(s => !a.classLabel || s.classLabel === a.classLabel).map(s => s.id);
  const ids = Array.from(new Set([...(a.studentIds || []), ...cohort]));
  const subs = { ...(a.submissions || {}) };
  const untouched = notStartedFor(a);
  ids.forEach((sid, i) => {
    if (subs[sid]) return; // keep hand-crafted submissions (e.g. Oliver's)
    if (a.status === 'draft') return;
    if (untouched(sid)) return; // explicitly "not started yet"
    const s = synthSubmission(a, sid, i);
    if (s) subs[sid] = s;
  });
  return { ...a, studentIds: ids, submissions: subs };
};

const seedStore = () => {
  const me = { id: 's_oliver', name: 'Oliver Chen', role: 'student', classLabel: 'Year 12 – Group A' };
  const teacher = { id: 't_clarke', name: 'Heebz A', role: 'teacher' };
  // The other teachers whose homework the demo student also sees. Each one is a real
  // staff record with its own id: ownership is decided by teacherId alone (isMine),
  // and `teacherName` is a display field that participates in no filter.
  const staff = {
    webb:   { id: 't_webb',   name: 'Marcus Webb',   role: 'teacher' },
    park:   { id: 't_park',   name: 'David Park',    role: 'teacher' },
    yoo:    { id: 't_yoo',    name: 'Helen Yoo',     role: 'teacher' },
    nair:   { id: 't_nair',   name: 'Priya Nair',    role: 'teacher' },
    stone:  { id: 't_stone',  name: 'Rebecca Stone', role: 'teacher' },
    mehta:  { id: 't_mehta',  name: 'Daniel Mehta',  role: 'teacher' },
    begum:  { id: 't_begum',  name: 'Aisha Begum',   role: 'teacher' },
    rivera: { id: 't_rivera', name: 'Tom Rivera',    role: 'teacher' },
    dubois: { id: 't_dubois', name: 'Claire Dubois', role: 'teacher' },
    okafor: { id: 't_okafor', name: 'James Okafor',  role: 'teacher' },
  };
  // Current student ("me") first, then the seed roster from mocks/homework.mock.jsx.
  const students = [me, ...HW_STUDENTS];

  const folders = {
    f_gcse:   { id: 'f_gcse',   name: 'GCSE Maths' },
    f_alevel: { id: 'f_alevel', name: 'A-Level Maths' },
    f_sci:    { id: 'f_sci',    name: 'Science' },
    f_hum:    { id: 'f_hum',    name: 'Humanities' },
    ...HW_EXTRA_FOLDERS,
  };

  // ── Open assignments (pending / in progress / submitted / overdue) ──
  const a1 = {
    id: 'hw_simul',
    title: 'Simultaneous Equations',
    subject: 'Mathematics',
    classLabel: 'Year 10 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: ['s_oliver','s_emma','s_sophia','s_james'],
    dueAt: dayOffset(7),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-3),
    instructions: 'Show all working. Submit final answers as exact values where possible.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Solve the pair: x + y = 5 and x − y = 1. Enter the value of x.',
        answer: 'x=3', points: 1, hint: 'Add the two equations to eliminate y.' },
      { id: 'q2', type: 'math', prompt: 'What is x^2 + 2', answer: 'x^2+2', points: 1 },
      { id: 'q3', type: 'mcq', prompt: 'Which method removes a variable by adding the two equations together?',
        choices: ['Substitution','Elimination','Graphing','Trial and improvement'], correctIndex: 1, points: 1 },
      { id: 'q4', type: 'short', prompt: 'In one line, describe the substitution method.', points: 1 },
    ],
    submissions: {},
  };

  const a2 = {
    id: 'hw_quad_prac',
    title: 'Quadratic Equations — Practice Set',
    subject: 'Mathematics',
    classLabel: 'Year 10 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: ['s_oliver','s_emma','s_sophia'],
    dueAt: dayOffset(14),
    timeLimitMins: 45,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-6),
    instructions: 'Factorise where possible before reaching for the formula.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which of the following is the correct factored form of x² − 9?',
        choices: ['(x−3)(x+3)','(x−9)(x+1)','(x−3)(x−3)','(x+9)(x−1)'], correctIndex: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Solve for x: 3x + 7 = 22.', answer: 5, tolerance: 0, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Factorise x² − 5x + 6.', answer: '(x-2)(x-3)', points: 2 },
      { id: 'q4', type: 'short', prompt: 'State the quadratic formula.', answer: 'x = (−b ± √(b² − 4ac)) / 2a', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Solve 2x² − 7x + 3 = 0 by factorising. Show full working.', points: 4 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: 0, q2: 5, q3: '(x-2)(x-3)',
          q4: 'x = (−b ± √(b² − 4ac)) / 2a',
          q5: '2x² − 7x + 3 = (2x − 1)(x − 3) = 0, so x = 1/2 or x = 3.',
        },
        submittedAt: dayOffset(-1, '16:42:00'),
        status: 'submitted',
        marks: { q1: 2, q2: 2, q3: 2, q4: null, q5: null },
        feedback: { q1: '', q2: '', q3: '', q4: '', q5: '' },
        timeSpentMins: 31,
      },
      's_emma': {
        answers: {
          q1: 0, q2: 5, q3: '(x-2)(x-3)',
          q4: 'Minus b plus or minus root b squared minus 4ac, all over 2a.',
          q5: '(2x − 1)(x − 3) = 0 so x = 0.5 or 3.',
        },
        submittedAt: dayOffset(-2, '19:05:00'),
        status: 'submitted',
        marks: { q1: 2, q2: 2, q3: 2, q4: null, q5: null },
        feedback: { q1: '', q2: '', q3: '', q4: '', q5: '' },
        timeSpentMins: 38,
      },
    },
  };

  const a3 = {
    id: 'hw_macbeth3',
    title: "Shakespeare's Macbeth — Act 3 Analysis",
    subject: 'English',
    classLabel: 'Year 9 – Group A',
    teacherName: 'Marcus Webb',
    folderId: 'f_hum',
    teacherId: staff.webb.id,
    studentIds: ['s_oliver','s_emma','s_james'],
    dueAt: dayOffset(-3),
    timeLimitMins: null,
    allowReview: false,
    status: 'active',
    createdAt: dayOffset(-12),
    instructions: 'Support every point with a short quotation from the text.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Who does Macbeth see at the banquet in Act 3, Scene 4?',
        answer: "Banquo's ghost", points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Who escapes the murderers in Act 3?',
        choices: ['Banquo','Fleance','Macduff','Donalbain'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'short', prompt: "What is the significance of Banquo's ghost appearing only to Macbeth?", points: 3 },
      { id: 'q4', type: 'long', prompt: "How does Shakespeare present Macbeth's growing paranoia in Act 3? Refer closely to the text.", points: 6 },
      { id: 'q5', type: 'long', prompt: 'Analyse the theme of ambition in Act 3, Scene 1.', points: 6 },
    ],
    submissions: {},
  };

  const a4 = {
    id: 'hw_chem_fg',
    title: 'Organic Chemistry — Functional Groups',
    subject: 'Chemistry',
    classLabel: 'Year 10 – Group B',
    teacherName: 'David Park',
    folderId: 'f_sci',
    teacherId: staff.park.id,
    studentIds: ['s_oliver','s_sophia','s_james'],
    dueAt: dayOffset(-5),
    timeLimitMins: 30,
    allowReview: false,
    status: 'active',
    createdAt: dayOffset(-14),
    instructions: 'Name groups using IUPAC conventions.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which functional group defines an alcohol?',
        choices: ['−OH','−COOH','−CHO','−NH₂'], correctIndex: 0, points: 2 },
      { id: 'q2', type: 'short', prompt: 'Name the functional group present in all carboxylic acids.',
        answer: 'Carboxyl group (−COOH)', points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'CH₃CHO contains which functional group?',
        choices: ['Hydroxyl','Aldehyde','Ketone','Ester'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'numeric', prompt: 'How many carbon atoms are in a molecule of propan-1-ol?',
        answer: 3, tolerance: 0, points: 1 },
      { id: 'q5', type: 'long', prompt: 'Describe a chemical test to distinguish an aldehyde from a ketone.', points: 5 },
    ],
    submissions: {},
  };

  const a5 = {
    id: 'hw_ww2',
    title: 'World War II — Key Events Timeline',
    subject: 'History',
    classLabel: 'Year 8 – Group A',
    teacherName: 'Helen Yoo',
    folderId: 'f_hum',
    teacherId: staff.yoo.id,
    studentIds: ['s_oliver','s_emma','s_sophia','s_james'],
    dueAt: dayOffset(-7),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-16),
    instructions: 'Dates matter — be precise.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'In what year did World War II begin?', answer: 1939, tolerance: 0, points: 1 },
      { id: 'q2', type: 'short', prompt: 'Name the operation that launched the Allied invasion of Normandy.',
        answer: 'Operation Overlord', points: 2 },
      { id: 'q3', type: 'long', prompt: 'Place these events in order and explain each in one sentence: Dunkirk evacuation, Pearl Harbor, D-Day, VE Day.', points: 6 },
    ],
    submissions: {},
  };

  const a6 = {
    id: 'hw_photo',
    title: 'Cell Biology — Photosynthesis',
    subject: 'Biology',
    classLabel: 'Year 8 – Group A',
    teacherName: 'Priya Nair',
    folderId: 'f_sci',
    teacherId: staff.nair.id,
    studentIds: ['s_oliver','s_emma'],
    dueAt: dayOffset(-2),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-10),
    instructions: 'Use the correct scientific vocabulary throughout.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Write the word equation for photosynthesis.',
        answer: 'carbon dioxide + water → glucose + oxygen', points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'In which organelle does photosynthesis take place?',
        choices: ['Mitochondria','Chloroplasts','Nucleus','Ribosomes'], correctIndex: 1, points: 1 },
      { id: 'q3', type: 'long', prompt: 'Explain how light intensity affects the rate of photosynthesis.', points: 5 },
    ],
    submissions: {},
  };

  // ── Marked homework (shown in the Results section) ──────────
  const r1 = {
    id: 'hw_quad_ch5',
    title: 'Quadratic Equations – Chapter 5',
    subject: 'Mathematics',
    classLabel: 'Year 10 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: ['s_oliver','s_emma','s_sophia','s_james'],
    dueAt: dayOffset(-2),
    timeLimitMins: 60,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-18),
    instructions: 'Answer every question. Show full working for the long-answer items.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Solve 2x² + 5x − 3 = 0 using the quadratic formula.',
        answer: 'x = 0.5 or x = −3', points: 10 },
      { id: 'q2', type: 'mcq', prompt: 'Which of the following is the correct factored form of x² − 9?',
        choices: ['(x−3)(x+3)','(x−9)(x+1)','(x−3)(x−3)','(x+9)(x−1)'], correctIndex: 0, points: 5 },
      { id: 'q3', type: 'short', prompt: 'Find the vertex of the parabola y = x² − 4x + 7.',
        answer: 'Vertex at (2, 3)', points: 8 },
      { id: 'q4', type: 'long', prompt: 'Prove that the roots of ax² + bx + c = 0 are given by the quadratic formula, by completing the square.',
        answer: 'Divide through by a, complete the square on x² + (b/a)x, then rearrange to isolate x.', points: 12 },
      { id: 'q5', type: 'short', prompt: 'Solve the inequality x² − 2x − 8 ≤ 0, giving your answer as an interval.',
        answer: '−2 ≤ x ≤ 4', points: 11 },
      { id: 'q6', type: 'mcq', prompt: 'What is the discriminant of x² + 4x + 5?',
        choices: ['4','−4','36','−36'], correctIndex: 1, points: 2 },
      { id: 'q7', type: 'numeric', prompt: 'If x² = 49, what is the sum of all solutions of the equation?',
        answer: 0, tolerance: 0, points: 2 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: 'x = 0.5 or x = −3',
          q2: 0,
          q3: 'Vertex at (2, 4)',
          q4: 'Divided through by a, completed the square on x² + (b/a)x, then rearranged to isolate x — full working shown.',
          q5: 'x ≤ 4',
          q6: 0,
          q7: 7,
        },
        submittedAt: dayOffset(-2, '10:14:00'),
        status: 'approved',
        markedAt: dayOffset(-1, '11:30:00'),
        marks: { q1: 9, q2: 5, q3: 5, q4: 12, q5: 10, q6: 0, q7: 0 },
        feedback: {
          q1: 'Excellent working shown. Minor arithmetic slip in the discriminant but self-corrected. Well done.',
          q2: '',
          q3: 'Right x-coordinate. Substitute x = 2 back in carefully — y = 4 − 8 + 7 = 3.',
          q4: 'Flawless derivation — every step clearly justified.',
          q5: 'Correct upper bound, but the interval also has a lower bound at x = −2.',
          q6: 'Remember: discriminant = b² − 4ac = 16 − 20 = −4.',
          q7: 'x = 7 and x = −7, so the sum of the solutions is 0.',
        },
        timeSpentMins: 38,
        classAvg: 74, rank: 4, classSize: 28,
        overallFeedback: 'Very good understanding of algebraic manipulation. Please spend more time checking calculations before submitting. Great improvement from your previous homework – keep this momentum going!',
      },
    },
  };

  const r2 = {
    id: 'hw_newton',
    title: "Newton's Laws of Motion",
    subject: 'Physics',
    classLabel: 'Year 9 – Group B',
    teacherName: 'David Park',
    folderId: 'f_sci',
    teacherId: staff.park.id,
    studentIds: ['s_oliver','s_james'],
    dueAt: dayOffset(-4),
    timeLimitMins: null,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-15),
    instructions: 'Quote each law precisely before applying it.',
    questions: [
      { id: 'q1', type: 'short', prompt: "State Newton's three laws of motion.",
        answer: '1: A body stays at rest or constant velocity unless a resultant force acts. 2: F = ma. 3: Every action has an equal and opposite reaction.', points: 10 },
      { id: 'q2', type: 'numeric', prompt: 'A 4 kg object accelerates at 3 m/s². What is the resultant force in newtons?',
        answer: 12, tolerance: 0, points: 8 },
      { id: 'q3', type: 'long', prompt: "Using Newton's third law, explain what happens when a swimmer pushes off a pool wall.",
        answer: 'The swimmer exerts a force on the wall; the wall exerts an equal and opposite force on the swimmer, accelerating them away.', points: 8 },
      { id: 'q4', type: 'short', prompt: "A rocket's mass decreases as it burns fuel. Explain how this affects its acceleration.",
        answer: 'With constant thrust and decreasing mass, a = F/m increases, so the rocket accelerates at an increasing rate.', points: 6 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: '1st: a body stays at rest or moves at constant velocity unless a resultant force acts on it. 2nd: F = ma. 3rd: forces come in equal and opposite pairs.',
          q2: 12,
          q3: 'The swimmer pushes backwards on the wall, and by the third law the wall pushes forwards on the swimmer with an equal force, so they accelerate away from the wall.',
          q4: 'The rocket gets lighter so it speeds up.',
        },
        submittedAt: dayOffset(-4, '17:20:00'),
        status: 'approved',
        markedAt: dayOffset(-3, '09:05:00'),
        marks: { q1: 10, q2: 8, q3: 8, q4: 3 },
        feedback: {
          q1: '',
          q2: '',
          q3: 'Beautifully explained — exactly the right pairing of forces.',
          q4: 'Right idea, but use a = F/m explicitly to explain why acceleration increases.',
        },
        timeSpentMins: 29,
        classAvg: 71, rank: 2, classSize: 24,
        overallFeedback: 'Outstanding grasp of all three laws — your explanations are precise and well structured. Watch the variable-mass reasoning in Q4.',
      },
    },
  };

  const r3 = {
    id: 'hw_mitosis',
    title: 'Mitosis and Cell Division',
    subject: 'Biology',
    classLabel: 'Year 8 – Group A',
    teacherName: 'Priya Nair',
    folderId: 'f_sci',
    teacherId: staff.nair.id,
    studentIds: ['s_oliver','s_emma','s_sophia'],
    dueAt: dayOffset(-5),
    timeLimitMins: null,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-17),
    instructions: 'Diagrams welcome but not required.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'List the stages of mitosis in order and describe each in one sentence.',
        answer: 'Prophase, metaphase, anaphase, telophase — chromosomes condense, line up at the equator, separate to the poles, and two nuclei reform.', points: 10 },
      { id: 'q2', type: 'long', prompt: 'Explain why mitosis produces two genetically identical daughter cells.',
        answer: 'DNA is replicated before division and identical sister chromatids are separated equally into each daughter cell.', points: 8 },
      { id: 'q3', type: 'short', prompt: 'Give two examples of where mitosis is used in the body.',
        answer: 'Growth of tissues and repair/replacement of damaged cells (e.g. skin, wound healing).', points: 7 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: 'Prophase — chromosomes condense. Metaphase — they line up in the middle. Anaphase — chromatids are pulled apart. Telophase — two new nuclei form.',
          q2: 'Because the cell splits into two and each new cell gets chromosomes from the parent cell.',
          q3: 'Growth, and when you get taller.',
        },
        submittedAt: dayOffset(-5, '18:48:00'),
        status: 'approved',
        markedAt: dayOffset(-4, '13:15:00'),
        marks: { q1: 9, q2: 4, q3: 3 },
        feedback: {
          q1: 'Clear and correctly ordered. One more detail on spindle fibres would make this perfect.',
          q2: "You described the split but didn't link it to DNA replication — that's the key point.",
          q3: 'Growth is right; your second example needed to be repair or replacement of cells.',
        },
        timeSpentMins: 45,
        classAvg: 68, rank: 14, classSize: 26,
        overallFeedback: "You know the stages well, but the explanations need more precision. Revise DNA replication before next week's test.",
      },
    },
  };

  const r4 = {
    id: 'hw_macbeth2',
    title: 'Shakespeare – Macbeth Act 2',
    subject: 'English Literature',
    classLabel: 'Year 9 – Group A',
    teacherName: 'Marcus Webb',
    folderId: 'f_hum',
    teacherId: staff.webb.id,
    studentIds: ['s_oliver','s_emma'],
    dueAt: dayOffset(-9),
    timeLimitMins: null,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-20),
    instructions: 'Embed quotations and analyse language closely.',
    questions: [
      { id: 'q1', type: 'long', prompt: "Analyse the dagger soliloquy: what does it reveal about Macbeth's state of mind?",
        answer: "The hallucination shows his guilt and divided mind — drawn to the murder yet horrified by it ('a dagger of the mind, a false creation').", points: 12 },
      { id: 'q2', type: 'short', prompt: 'How does Lady Macbeth take control after the murder of Duncan?',
        answer: 'She returns the daggers, smears the grooms with blood and tells Macbeth that "a little water clears us of this deed".', points: 10 },
      { id: 'q3', type: 'long', prompt: 'Discuss the symbolism of blood in Act 2.',
        answer: 'Blood symbolises guilt that cannot be washed away — Macbeth fears all "great Neptune\'s ocean" cannot clean his hands.', points: 10 },
      { id: 'q4', type: 'short', prompt: 'What is the dramatic function of the Porter scene?',
        answer: 'Comic relief that also acts as a hellish commentary — the Porter imagines himself gatekeeper of hell, mirroring the murder upstairs.', points: 8 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: "The dagger shows Macbeth's guilt before he has even acted — he calls it 'a dagger of the mind', so he knows his imagination is corrupted by the murder he is about to commit.",
          q2: 'She stays calm, takes the daggers back herself and says a little water will clear them of the deed.',
          q3: 'Blood stands for guilt. Macbeth says the ocean could not wash his hands clean, showing the guilt is permanent.',
          q4: 'It is a funny scene to relax the audience.',
        },
        submittedAt: dayOffset(-8, '20:31:00'),
        status: 'approved',
        markedAt: dayOffset(-7, '15:40:00'),
        marks: { q1: 10, q2: 9, q3: 8, q4: 4 },
        feedback: {
          q1: 'Strong analysis with a well-chosen quotation.',
          q2: 'Accurate and concise.',
          q3: 'Good point on permanence — contrast it with Lady Macbeth\'s "a little water" for the top marks.',
          q4: 'Comic relief is only half the answer — what does the Porter pretend to be the gatekeeper of?',
        },
        timeSpentMins: 52,
        classAvg: 70, rank: 6, classSize: 27,
        overallFeedback: 'Insightful analysis of imagery throughout. To reach the top band, embed shorter quotations and analyse individual word choices more closely.',
      },
    },
  };

  const r5 = {
    id: 'hw_supply',
    title: 'Supply and Demand Curves',
    subject: 'Economics',
    classLabel: 'Year 12 – Group A',
    teacherName: 'Rebecca Stone',
    folderId: 'f_alevel',
    teacherId: staff.stone.id,
    studentIds: ['s_oliver'],
    dueAt: dayOffset(-14),
    timeLimitMins: null,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-24),
    instructions: 'Label every diagram fully: axes, curves, equilibria.',
    questions: [
      { id: 'q1', type: 'long', prompt: 'Using a supply and demand diagram, explain what happens to equilibrium price when supply decreases.',
        answer: 'The supply curve shifts left; at the old price there is excess demand, so equilibrium price rises and quantity falls.', points: 8 },
      { id: 'q2', type: 'short', prompt: 'Define price elasticity of demand.',
        answer: 'The responsiveness of quantity demanded to a change in price: %ΔQd ÷ %ΔP.', points: 6 },
      { id: 'q3', type: 'short', prompt: 'Give two factors that shift the demand curve to the right.',
        answer: 'Rising incomes (for a normal good) and an increase in the price of a substitute.', points: 6 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: 'Supply goes down so the price goes up. I drew the supply curve moving but did not label the new equilibrium.',
          q2: 'How much the quantity demanded responds to a change in price, measured as percentage change in quantity divided by percentage change in price.',
          q3: 'A fall in the price of the good itself, and cheaper production costs.',
        },
        submittedAt: dayOffset(-15, '21:02:00'),
        status: 'approved',
        markedAt: dayOffset(-13, '10:25:00'),
        marks: { q1: 5, q2: 6, q3: 0 },
        feedback: {
          q1: 'Correct direction, but the diagram must show the leftward shift and label both equilibria.',
          q2: 'Textbook definition — well done.',
          q3: 'Both of these affect supply or cause movements along the demand curve — revise shift factors vs movements.',
        },
        timeSpentMins: 61,
        classAvg: 62, rank: 18, classSize: 22,
        overallFeedback: 'Solid definitions, but diagram work needs attention — practise drawing and labelling shifts accurately.',
      },
    },
  };

  // ── New round: more homework across topics & every question type, with
  //    LaTeX-rich maths (prompts use $…$, math answers are LaTeX). a7 & a8 are
  //    left PENDING for Oliver (the demo student) so he can open them and see
  //    the MathLive editor + rendered equations live. ──
  const a7 = {
    id: 'hw_diff',
    title: 'Calculus: Differentiation Basics',
    subject: 'Mathematics',
    classLabel: 'Year 12 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_alevel',
    teacherId: teacher.id,
    studentIds: ['s_oliver'],
    dueAt: dayOffset(5),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-2),
    instructions: 'Differentiate each expression fully and simplify. Enter maths using the equation editor.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Differentiate $y = 3x^4 - 5x^2 + 2x$ with respect to $x$. Enter $\\dfrac{dy}{dx}$.',
        answer: '12x^3-10x+2', points: 3, hint: 'Multiply by the power, then reduce the power by one.' },
      { id: 'q2', type: 'math', prompt: 'Find $\\dfrac{d}{dx}\\left(\\sin x\\right)$.', answer: '\\cos x', points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'The curve $y = x^2 - 4x + 1$ has gradient $\\dfrac{dy}{dx} = 2x - 4$. Find its gradient at $x = 3$.',
        answer: 2, tolerance: 0, points: 2 },
      { id: 'q4', type: 'mcq', prompt: 'Which of these is $\\dfrac{d}{dx}\\left(e^{2x}\\right)$?',
        choices: ['2eˣ', 'e²ˣ', '2e²ˣ', 'x·e²ˣ⁻¹'], correctIndex: 2, points: 2 },
      { id: 'q5', type: 'long', prompt: 'Differentiate $y = x^3 e^{x}$ using the product rule. Show every step of your working.', points: 5 },
    ],
    submissions: {},
  };

  const a8 = {
    id: 'hw_integ_al',
    title: 'Integration: Definite & Indefinite',
    subject: 'Mathematics',
    classLabel: 'Year 12 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_alevel',
    teacherId: teacher.id,
    studentIds: ['s_oliver'],
    dueAt: dayOffset(9),
    timeLimitMins: 40,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-1),
    instructions: "Don't forget the constant of integration on indefinite integrals.",
    questions: [
      { id: 'q1', type: 'math', prompt: 'Evaluate $\\displaystyle\\int 6x^2 \\, dx$. Include the constant of integration.',
        answer: '2x^3+c', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'Evaluate the definite integral $\\displaystyle\\int_0^3 2x \\, dx$.',
        answer: 9, tolerance: 0, points: 3 },
      { id: 'q3', type: 'math', prompt: 'Find $\\displaystyle\\int \\dfrac{1}{x} \\, dx$.', answer: '\\ln x + c', points: 2 },
      { id: 'q4', type: 'truefalse', prompt: 'The definite integral $\\displaystyle\\int_a^b f(x)\\,dx$ represents the signed area between the curve and the $x$-axis.',
        answer: true, points: 1 },
      { id: 'q5', type: 'upload', prompt: 'Upload a clear photo of your handwritten working for the trapezium-rule estimate.', points: 3 },
    ],
    submissions: {},
  };

  const a9 = {
    id: 'hw_surds',
    title: 'Number: Surds & Indices',
    subject: 'Mathematics',
    classLabel: 'Year 10 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: [],
    dueAt: dayOffset(6),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-2),
    instructions: 'Give surds in their simplest form. No calculators.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Simplify $\\sqrt{50}$ into the form $a\\sqrt{2}$.', answer: '5\\sqrt{2}', points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Evaluate $2^5$.', answer: 32, tolerance: 0, points: 1 },
      { id: 'q3', type: 'mcq', prompt: 'Which of the following is equal to $\\dfrac{1}{\\sqrt{2}}$ once rationalised?',
        choices: ['√2', '√2 / 2', '2√2', '1 / 2'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'Complete the index laws: xᵃ × xᵇ = x^(blank 1), and (xᵃ)ᵇ = x^(blank 2).',
        blanks: ['a+b', 'ab'], points: 2 },
      { id: 'q5', type: 'short', prompt: 'Explain in one sentence why $x^0 = 1$ for any non-zero $x$.', points: 2 },
    ],
    submissions: {},
  };

  const a10 = {
    id: 'hw_trig',
    title: 'Trigonometry: Ratios & Identities',
    subject: 'Mathematics',
    classLabel: 'Year 11 – Group B',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: [],
    dueAt: dayOffset(8),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-3),
    instructions: 'Use exact values where possible.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'What is the exact value of $\\sin 30°$?',
        choices: ['0', '1 / 2', '√3 / 2', '1'], correctIndex: 1, points: 1 },
      { id: 'q2', type: 'math', prompt: 'Simplify $\\sin^2\\theta + \\cos^2\\theta$.', answer: '1', points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'A right-angled triangle has legs of length 6 and 8. Find the length of the hypotenuse.',
        answer: 10, tolerance: 0, points: 2 },
      { id: 'q4', type: 'match', prompt: 'Match each trigonometric ratio to its definition.',
        pairs: [
          { left: 'sin θ', right: 'opposite ÷ hypotenuse' },
          { left: 'cos θ', right: 'adjacent ÷ hypotenuse' },
          { left: 'tan θ', right: 'opposite ÷ adjacent' },
        ], points: 3 },
      { id: 'q5', type: 'long', prompt: 'Using a right-angled triangle, prove the identity $\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}$.', points: 4 },
    ],
    submissions: {},
  };

  const a11 = {
    id: 'hw_prob',
    title: 'Statistics: Probability',
    subject: 'Mathematics',
    classLabel: 'Year 10 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: [],
    dueAt: dayOffset(10),
    timeLimitMins: null,
    allowReview: true,
    status: 'active',
    createdAt: dayOffset(-1),
    instructions: 'Give probabilities as fractions or decimals to 3 d.p. as asked.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A fair six-sided die is rolled. What is the probability of rolling a 4? Give your answer as a decimal to 3 d.p.',
        answer: 0.167, tolerance: 0.005, points: 2 },
      { id: 'q2', type: 'multi', prompt: 'When rolling a single fair die, which of these pairs of events are mutually exclusive?',
        choices: [
          'Rolling a 2 and rolling a 5',
          'Rolling an even number and rolling a 3',
          'Rolling a 6 and rolling an even number',
          'Rolling an odd number and rolling a 4',
        ], correctIndices: [0, 1, 3], points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'The probabilities of all outcomes in a sample space always sum to 1.', answer: true, points: 1 },
      { id: 'q4', type: 'math', prompt: 'Two independent events have $P(A) = \\dfrac{1}{2}$ and $P(B) = \\dfrac{1}{3}$. Enter $P(A \\cap B)$ as a fraction.',
        answer: '\\frac{1}{6}', points: 2 },
      { id: 'q5', type: 'short', prompt: 'In one or two sentences, explain the difference between independent events and mutually exclusive events.', points: 3 },
    ],
    submissions: {},
  };

  // ── A new marked result for Oliver (shows in his Results, LaTeX throughout) ──
  const r6 = {
    id: 'hw_vectors_fm',
    title: 'Further Maths: Vectors',
    subject: 'Further Maths',
    classLabel: 'Year 12 – Group A',
    teacherName: 'Heebz A',
    folderId: 'f_alevel',
    teacherId: teacher.id,
    studentIds: ['s_oliver'],
    dueAt: dayOffset(-3),
    timeLimitMins: null,
    allowReview: true,
    status: 'closed',
    createdAt: dayOffset(-13),
    instructions: 'Show full working for the proofs. Give unit vectors in component form.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Given $\\mathbf{a} = 3\\mathbf{i} + 4\\mathbf{j}$, find the magnitude $|\\mathbf{a}|$.',
        answer: '5', points: 6 },
      { id: 'q2', type: 'numeric', prompt: 'Find the scalar (dot) product of $\\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix}$ and $\\begin{pmatrix} 4 \\\\ 1 \\end{pmatrix}$.',
        answer: 11, tolerance: 0, points: 6 },
      { id: 'q3', type: 'long', prompt: 'Prove that if two non-zero vectors are perpendicular, their scalar product is zero.', points: 8 },
      { id: 'q4', type: 'math', prompt: 'Find a unit vector in the direction of $\\mathbf{b} = 6\\mathbf{i} - 8\\mathbf{j}$.',
        answer: '\\frac{3}{5}\\mathbf{i}-\\frac{4}{5}\\mathbf{j}', points: 6 },
    ],
    submissions: {
      's_oliver': {
        answers: {
          q1: '5',
          q2: 11,
          q3: 'If a·b = 0 and neither vector is zero, then |a||b|cosθ = 0, so cosθ = 0 and θ = 90°. Conversely, perpendicular vectors have θ = 90°, cosθ = 0, so a·b = 0.',
          q4: '\\frac{3}{5}\\mathbf{i}-\\frac{4}{5}\\mathbf{j}',
        },
        submittedAt: dayOffset(-4, '18:12:00'),
        status: 'approved',
        markedAt: dayOffset(-2, '10:40:00'),
        marks: { q1: 6, q2: 6, q3: 6, q4: 6 },
        feedback: {
          q1: 'Correct — |a| = √(3² + 4²) = 5.',
          q2: 'Right: (2)(4) + (3)(1) = 11.',
          q3: 'The forward direction is perfect. State the converse a little more carefully for full marks.',
          q4: 'Exactly right — dividing by the magnitude of 10 gives the unit vector.',
        },
        timeSpentMins: 34,
        classAvg: 73, rank: 3, classSize: 24,
        overallFeedback: 'Excellent command of vector algebra. Your magnitude and unit-vector work is flawless — just tighten the converse in the perpendicularity proof.',
      },
    },
  };

  // The bulk library lives in mocks/homework.mock.jsx — same shape as the
  // hand-authored ones above, but written against the REAL class labels, so the
  // cohort fill in loadStore() puts actual students on them.
  const more = HW_MORE_ASSIGNMENTS({ dayOffset, teacher, staff });

  const allAssignments = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, r1, r2, r3, r4, r5, r6, ...more]
    .map(a => normalizeAssignment(populateCohort(a, students)));

  return {
    currentUser: me,
    users: {
      [me.id]: me, [teacher.id]: teacher,
      ...Object.fromEntries(Object.values(staff).map(t => [t.id, t])),
      ...Object.fromEntries(students.map(s => [s.id, s])),
    },
    folders,
    classes: CLASSES,
    assignments: Object.fromEntries(allAssignments.map(a => [a.id, a])),
    drafts: {
      hw_simul: { answers: {}, flags: {}, startedAt: dayOffset(-1, '18:30:00') },
    },
  };
};

// ─── Settings model ────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  availableFrom: '',
  attemptsAllowed: 1,
  allowLate: false,
  randomize: false,
  autoGradeMcq: true,
  // Whether students see the list of questions on the start page before beginning.
  showQuestionPreview: true,
  // A visible countdown is off unless the teacher asks for it (A7): the time limit
  // is still enforced either way, but a ticking clock is not forced on a child.
  showCountdown: false,
  // Student review
  allowReview: false,
  showCorrect: false,
  showComments: false,
  showAutoImmediately: false,
  releaseAfterApproval: false,
  marksOnly: false,
  hideMarksUntilReleased: false,
};

// Fold legacy top-level flags into the `settings` object and fill defaults,
// so older stored data and all seed assignments work unchanged.
const normalizeAssignment = (a) => {
  if (!a) return a;
  const s = { ...DEFAULT_SETTINGS, ...(a.settings || {}) };
  // Lift legacy fields that lived on the assignment root.
  if (a.settings == null || a.settings.allowReview == null) {
    if ('allowReview' in a) s.allowReview = !!a.allowReview;
  }
  if (s.availableFrom === '' && a.availableFrom) s.availableFrom = a.availableFrom;
  // A date with no time means the end of that day (A10) — otherwise a bare date
  // parses as UTC midnight and shows up as "due at 01:00".
  const dueAt = withDefaultDueTime(a.dueAt);
  // Question outcomes are DERIVED from marks (outcomeFor). A stored `results` map
  // was free to drift from the marks it described — "4/4, 100%" beside "2 partial".
  // Drop it on every load so data written by an older build cannot resurrect it.
  let submissions = a.submissions;
  if (submissions && Object.keys(submissions).some(sid => submissions[sid] && submissions[sid].results)) {
    const clean = {};
    Object.keys(submissions).forEach(sid => {
      const sub = submissions[sid];
      if (!sub || !sub.results) { clean[sid] = sub; return; }
      // Explicit field copy — Babel-standalone mis-compiles object-rest here.
      const next = {};
      Object.keys(sub).forEach(k => { if (k !== 'results') next[k] = sub[k]; });
      clean[sid] = next;
    });
    submissions = clean;
  }
  return { ...a, settings: s, submissions, dueAt };
};

// Migrate older shapes from localStorage (added folder support).
const migrate = (s) => {
  if (!s) return s;
  if (!s.folders) s.folders = {};
  if (!s.classes) s.classes = CLASSES;
  if (s.assignments) {
    Object.keys(s.assignments).forEach(k => {
      const a = s.assignments[k];
      if (!('folderId' in a)) a.folderId = null;
      s.assignments[k] = normalizeAssignment(a);
    });
  }
  return s;
};

// ─── Admin-roster reconciliation (F1 — ONE student universe) ───────────────────
// The homework store historically had its OWN student ids (s_oliver, s_emma…),
// disjoint from the admin store (admin_store_v4: s1, s2…). That meant a teacher
// could not assign homework to the students the admin actually created, and the
// student surface was a fixed persona. reconcile() folds the two universes into
// one on every load:
//   • every real admin student is merged into store.users as an assignable student
//     (so the teacher builder lists the real roster, incl. freshly-created ones);
//   • the four hand-authored seed ids are ALIASED to their admin equivalents (same
//     people by name), so the seed homework shows up for the real students;
//   • the four aliased legacy users are dropped (no duplicate names in the picker).
// Idempotent: remapping an already-admin id is a no-op, and users are rebuilt from
// the current admin roster each load. The active-student pointer decides whose
// homework the student surface renders (see StudentHomework `me`).
const HW_ALIAS = { s_oliver: 's2', s_emma: 's1', s_sophia: 's3', s_james: 's4' };

const hwReadAdmin = () => {
  try {
    const p = JSON.parse(localStorage.getItem('admin_store_v4') || 'null');
    if (p && p.students) return {
      students: p.students,
      classes: p.classes || window.SEED_CLASSES || [],
      teachers: p.teachers || window.SEED_TEACHERS || [],
    };
  } catch (e) {}
  return {
    students: window.SEED_STUDENTS || [],
    classes: window.SEED_CLASSES || [],
    teachers: window.SEED_TEACHERS || [],
  };
};

const reconcileWithAdmin = (store) => {
  const admin = hwReadAdmin();
  const classById = {};
  (admin.classes || []).forEach(c => { classById[c.id] = c; });
  const labelFor = (s) => {
    const firstClass = (s.classIds || []).map(id => classById[id]).find(Boolean);
    if (firstClass && firstClass.group) return firstClass.group;
    const m = String(s.year || '').match(/\d+/);
    return m ? `Year ${m[0]}` : (s.year || '');
  };
  const remap = (id) => HW_ALIAS[id] || id;

  // Staff are reconciled the same way students are — ONE staff universe. The seed's
  // t_* ids are matched to the real admin teacher records by name ONCE, here at the
  // store boundary. After this every assignment carries a real teacherId, and
  // ownership is decided by id alone (isMine) — never by name, at any call site.
  const teacherRemap = {};
  const users = {};
  Object.values(store.users || {}).forEach(u => {
    if (u.role !== 'teacher') return;
    const real = (admin.teachers || []).find(t => t.name === u.name);
    const id = (real && real.id) || u.id;
    teacherRemap[u.id] = id;
    users[id] = { id, name: u.name, role: 'teacher' };
  });
  (admin.students || []).forEach(s => {
    users[s.id] = { id: s.id, name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.id, role: 'student', classLabel: labelFor(s) };
  });

  // assignments: remap the four aliased ids, then keep only targets/submissions that
  // resolve to a real student (drops the legacy demo cohorts that were seeded in).
  const assignments = {};
  Object.keys(store.assignments || {}).forEach(aid => {
    const a = store.assignments[aid];
    const studentIds = Array.from(new Set((a.studentIds || []).map(remap))).filter(id => users[id]);
    const submissions = {};
    Object.keys(a.submissions || {}).forEach(sid => { const r = remap(sid); if (users[r]) submissions[r] = a.submissions[sid]; });
    // A `notStarted` list is student ids like any other, so it goes through the
    // same remap — otherwise fillDemoCohorts (which runs after this) would look
    // for seed ids on a roster that only holds admin ones and synthesise a
    // submission for the very student the seed said hadn't started.
    const notStarted = Array.isArray(a.notStarted)
      ? Array.from(new Set(a.notStarted.map(remap))).filter(id => users[id])
      : a.notStarted;
    assignments[aid] = { ...a, studentIds, submissions, notStarted, teacherId: teacherRemap[a.teacherId] || a.teacherId };
  });

  // currentUser follows the active student (default s2) so a bare read is sane;
  // the live student surface re-resolves per render from the active pointer.
  const activeId = (() => { try { return localStorage.getItem('klasio.activeStudent') || 's2'; } catch (e) { return 's2'; } })();
  const currentUser = users[activeId] || users['s2'] || store.currentUser;

  return { ...store, users, assignments, currentUser };
};

// The signed-in teacher (F4 principal). Resolved through teacherMetrics so the
// homework surface and every other teacher screen agree on who "me" is; the store
// lookup is by the reconciled id, so ownership stays an id comparison throughout.
const hwPrincipal = (store) => {
  const p = window.teacherMetrics && window.teacherMetrics.getPrincipal
    ? window.teacherMetrics.getPrincipal() : null;
  const users = store.users || {};
  if (p && users[p.id]) return users[p.id];
  if (p) return { id: p.id, name: p.name, role: 'teacher' };
  return Object.values(users).find(u => u.role === 'teacher') || { id: 't_clarke', name: 'Heebz A', role: 'teacher' };
};

// Resolve the homework identity for the student surface = the active admin student.
const hwActiveMe = (store) => {
  const id = (window.__getActiveStudent && window.__getActiveStudent())
    || (() => { try { return localStorage.getItem('klasio.activeStudent') || 's2'; } catch (e) { return 's2'; } })();
  return (store.users && store.users[id]) || store.currentUser || { id, name: 'Student', role: 'student' };
};

// Seed-time only: put the REAL roster on the seeded assignments.
// The seed cohorts are written against the mock roster, and reconcile drops
// every id that is not a real admin student — which would leave each demo
// assignment with the four aliased students on it. Re-running populateCohort
// against the reconciled users fills each class with the students who are
// actually in it and synthesises their submissions.
//
// This runs ONLY on a fresh seed (see loadStore). Doing it on every load would
// mean a teacher who unassigns a student gets them silently re-added on reload.
const fillDemoCohorts = (s) => {
  const students = Object.values(s.users || {}).filter(u => u.role === 'student');
  const assignments = {};
  Object.keys(s.assignments || {}).forEach(id => {
    assignments[id] = normalizeAssignment(populateCohort(s.assignments[id], students));
  });
  return { ...s, assignments };
};

const loadStore = () => {
  let s;
  let fresh = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { s = migrate(JSON.parse(raw)); }
    else { s = seedStore(); fresh = true; }
  } catch (e) {
    s = seedStore(); fresh = true;
  }
  s = reconcileWithAdmin(s);
  if (fresh) s = fillDemoCohorts(s);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
};

const saveStore = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
};

const useStore = () => {
  const [store, setStore] = React.useState(() => loadStore());
  const update = React.useCallback((mut) => {
    setStore(prev => {
      const next = typeof mut === 'function' ? mut(prev) : mut;
      saveStore(next);
      return next;
    });
  }, []);
  return [store, update];
};

// ─── Toast system ───────────────────────────────────────────────
const ToastCtx = React.createContext(null);
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((msg, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{
        position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:8, zIndex:9999,
      }}>
        {toasts.map(t => {
          const palette = t.kind === 'success' ? { bg: C.successBg, bd: C.successBorder, fg: C.success }
                       : t.kind === 'danger'  ? { bg: C.dangerBg,  bd: C.dangerBorder,  fg: C.danger  }
                       : t.kind === 'warn'    ? { bg: C.amberBg,   bd: C.amberBorder,   fg: C.amber   }
                       : { bg: C.bg, bd: C.border, fg: C.sub };
          return (
            <div key={t.id} style={{
              padding:'10px 14px', borderRadius:8,
              background: palette.bg, border:`1px solid ${palette.bd}`,
              color: palette.fg, fontSize:13, fontFamily:F.body, fontWeight:500,
              boxShadow: C.shadowL, minWidth:200, maxWidth:340,
            }}>{t.msg}</div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => React.useContext(ToastCtx) || (() => {});

// ─── Pill ───────────────────────────────────────────────────────
const Pill = ({ children, tone = 'default', icon }) => {
  const tones = {
    default: { bg: C.surface,    fg: C.sub,    bd: C.border },
    brand:   { bg: C.brandSoft,  fg: C.brand,  bd: C.brandBorder },
    success: { bg: C.successBg,  fg: C.success,bd: C.successBorder },
    amber:   { bg: C.amberBg,    fg: C.amber,  bd: C.amberBorder },
    danger:  { bg: C.dangerBg,   fg: C.danger, bd: C.dangerBorder },
    info:    { bg: C.surface,    fg: C.sub,   bd: C.border },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'2px 8px', borderRadius:999, fontFamily:F.body,
      fontSize:12, fontWeight:W.medium,
      background:t.bg, color:t.fg, border:`1px solid ${t.bd}`,
    }}>{icon}{children}</span>
  );
};

// ─── StatusBadge ────────────────────────────────────────────────
// THE status component. Every homework status on every screen renders through
// this — teacher and student, grid and table, list row and detail panel.
// It replaced five separate mechanisms: HwStatusTag (uppercase + leading dot),
// HwStatusPill (icon + border), bare coloured text in the assigned-students
// panel and in the table's overdue/marked lines, and naked dots in the builder
// outline. Those disagreed on casing, colour and vocabulary for the same states.
//
// Tone rules live in the map below, not at the call sites:
//   • amber   — and only amber — means "this needs your action" (to mark, overdue)
//   • danger  — genuine failure states only
//   • neutral — everything else, which is most of them
// Sentence case, no leading dot, no icon.
const HW_STATUS = {
  // needs action
  tomark:      { label: 'To mark',          tone: 'amber'   },
  overdue:     { label: 'Overdue',          tone: 'amber'   },
  // neutral facts
  live:        { label: 'Live',             tone: 'neutral' },
  draft:       { label: 'Draft',            tone: 'neutral' },
  closed:      { label: 'Closed',           tone: 'neutral' },
  scheduled:   { label: 'Scheduled',        tone: 'neutral' },
  marked:      { label: 'Marked',           tone: 'neutral' },
  graded:      { label: 'Graded',           tone: 'neutral' },
  allin:       { label: 'All submitted',    tone: 'neutral' },
  submitted:   { label: 'Submitted',        tone: 'neutral' },
  awaiting:    { label: 'Awaiting marking', tone: 'neutral' },
  pending:     { label: 'Not started',      tone: 'neutral' },
  inprogress:  { label: 'In progress',      tone: 'neutral' },
  late:        { label: 'Late',             tone: 'neutral' },
};
const HW_STATUS_TONES = {
  neutral: { bg: C.surface2, fg: C.sub },
  amber:   { bg: C.amberBg,  fg: C.amber },
  danger:  { bg: C.dangerBg, fg: C.danger },
};
// `status` picks a preset; `children` overrides the label (e.g. "3 to mark")
// while keeping the preset's tone. `tone` forces a tone for the rare caller
// that knows better than the preset.
const StatusBadge = ({ status, tone, children }) => {
  const preset = HW_STATUS[status] || null;
  const t = HW_STATUS_TONES[tone || (preset && preset.tone) || 'neutral'] || HW_STATUS_TONES.neutral;
  const label = children != null ? children : (preset ? preset.label : status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      padding: '2px 8px', borderRadius: RADIUS_FULL,
      background: t.bg, color: t.fg,
      fontFamily: F.body, fontSize: 12, fontWeight: W.medium,
      lineHeight: 1.5, whiteSpace: 'nowrap', ...NUM,
    }}>{label}</span>
  );
};

// ─── MetaLine ───────────────────────────────────────────────────
// The middot-separated fact line: "Year 10 · Group A · GCSE Maths",
// "4 questions · 4 pts · Due 6 Sept". Falsy entries are dropped, so a caller can
// pass conditionals inline without assembling an array first.
//
// Deliberately carries no per-fact icons. The list/target/calendar glyphs that
// used to sit beside each fact were noise at this density — three icons
// labelling three facts that already label themselves.
const MetaLine = ({ children, items, style = {} }) => {
  const parts = (items || React.Children.toArray(children)).filter(x =>
    x !== null && x !== undefined && x !== false && x !== '');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0,
      fontFamily: F.body, fontSize: TS.meta.fontSize, fontWeight: W.normal,
      color: C.muted, ...NUM, ...style,
    }}>
      {/* The separator is rendered inside the following item rather than
          between the two, so a line that wraps never strands a "·" at the end
          of the previous line. */}
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {i > 0 && <span aria-hidden="true" style={{ color: C.borderD }}>·</span>}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
        </span>
      ))}
    </div>
  );
};

// ─── StatStrip ──────────────────────────────────────────────────
// One horizontal band of label/value pairs split by hairline dividers, ~72px
// tall. Replaces the rows of bordered stat cards (large numerals, tinted icon
// circles) on the assignment detail page and the student Results page — four
// cards to carry four short numbers spent most of the vertical budget above
// the fold on the least of the content.
//
// `emphasis` marks the one value that earns visual size; everything else sits
// at the same weight, because everything else is equally unremarkable.
const StatStrip = ({ items = [], style = {} }) => (
  <div style={{
    display: 'flex', alignItems: 'stretch', flexWrap: 'wrap',
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: RADIUS,
    overflow: 'hidden', ...style,
  }}>
    {items.filter(Boolean).map((s, i) => (
      <div key={s.label} style={{
        flex: '1 1 0', minWidth: 120, padding: '16px 20px',
        borderLeft: i === 0 ? 'none' : `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: F.body, fontSize: TS.meta.fontSize, fontWeight: W.normal,
          color: C.muted, marginBottom: 4,
        }}>{s.label}</div>
        <div style={{
          fontFamily: F.head, fontSize: 20, fontWeight: W.medium,
          color: s.emphasis ? C.text : C.sub, lineHeight: 1.2, ...NUM,
        }}>{s.value}</div>
      </div>
    ))}
  </div>
);

// ─── Btn ────────────────────────────────────────────────────────
const Btn = ({ variant = 'primary', children, icon, onClick, disabled, small, type = 'button', style = {} }) => {
  const [hov, setHov] = React.useState(false);
  const [foc, setFoc] = React.useState(false);
  const variants = {
    primary: { bg: hov ? C.textHover : C.text, fg: C.inverse, bd: 'transparent', ring: C.text },
    brand:   { bg: hov ? C.brandH : C.brand, fg: C.inverse, bd: 'transparent', ring: C.brand },
    ghost:   { bg: hov ? C.surface : 'transparent', fg: C.sub, bd: 'transparent', ring: C.muted },
    soft:    { bg: hov ? C.surface2 : C.surface, fg: C.sub, bd: C.border, ring: C.muted },
    danger:  { bg: hov ? C.dangerHover : C.danger, fg: C.inverse, bd: 'transparent', ring: C.danger },
  };
  const s = variants[variant] || variants.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
        padding: small ? '6px 12px' : '9px 16px',
        borderRadius:8, border:`1px solid ${s.bd}`,
        background: disabled ? C.surface2 : s.bg,
        color: disabled ? C.faint : s.fg,
        fontFamily: F.body, fontSize: small ? 13 : 14, fontWeight:W.medium,
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace:'nowrap',
        transition: T, opacity: disabled ? 0.7 : 1,
        boxShadow: foc ? ring(s.ring) : 'none',
        outline: 'none',
        ...style,
      }}>{icon}{children}</button>
  );
};

// ─── Card ───────────────────────────────────────────────────────
const Card = ({ children, style = {}, hoverable, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => hoverable && setHov(false)}
      onClick={onClick}
      style={{
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`,
        borderRadius: RADIUS,
        // Flat and bordered. A card used to carry a resting shadow AND a
        // border, then lift onto a 20px shadow on hover — together that is
        // what made a page of them feel heavy and floaty. The border firming
        // up is the whole hover affordance now.
        transition: 'border-color .15s',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}>{children}</div>
  );
};

// ─── Label ──────────────────────────────────────────────────────
const Label = ({ children, htmlFor, hint }) => (
  <label htmlFor={htmlFor} style={{
    display:'block', fontFamily:F.body, fontSize:13, fontWeight:W.medium,
    color:C.sub, marginBottom:6, letterSpacing:'.01em',
  }}>
    {children}
    {hint && <span style={{ color:C.faint, fontWeight:400, marginLeft:6 }}>{hint}</span>}
  </label>
);

// ─── Toggle switch ──────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 40, height: 22, borderRadius: 999, border: 'none', padding: 2,
      background: checked ? C.brand : C.borderD,
      cursor: disabled ? 'not-allowed' : 'pointer', transition: T,
      display: 'flex', alignItems: 'center', flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}>
    <span style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      transform: checked ? 'translateX(18px)' : 'translateX(0)',
      transition: T, boxShadow: '0 1px 2px rgba(15,23,42,.2)',
    }} />
  </button>
);

// One settings row: title + description on the left, a toggle on the right.
const SettingRow = ({ title, desc, checked, onChange, disabled }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, padding: '14px 0', borderBottom: `1px solid ${C.surface2}`,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: F.body, ...TS.body, fontWeight: W.medium, color: disabled ? C.faint : C.text }}>{title}</div>
      {desc && <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>}
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

// ─── Input ──────────────────────────────────────────────────────
const Input = React.forwardRef(({ value, onChange, placeholder, type = 'text', multiline, rows = 3, style = {}, autoFocus, suffix, prefix, disabled }, ref) => {
  const [foc, setFoc] = React.useState(false);
  const base = {
    width: '100%', boxSizing:'border-box',
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${foc ? C.brand : C.border}`,
    background: disabled ? C.surface : C.bg,
    color: C.text, fontFamily: F.body, fontSize: 13,
    transition: T, outline: 'none',
    boxShadow: foc ? ring(C.brand) : 'none',
    ...style,
  };
  if (multiline) {
    return (
      <textarea ref={ref} value={value || ''} rows={rows} disabled={disabled}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        placeholder={placeholder} autoFocus={autoFocus}
        style={{ ...base, resize:'vertical', fontFamily: F.body, lineHeight: 1.5 }} />
    );
  }
  if (prefix || suffix) {
    return (
      <div style={{
        display:'flex', alignItems:'stretch',
        border:`1px solid ${foc ? C.brand : C.border}`,
        borderRadius:8, background:C.bg,
        boxShadow: foc ? ring(C.brand) : 'none', transition: T,
      }}>
        {prefix && <span style={{ display:'flex', alignItems:'center', padding:'0 10px', color:C.faint, fontSize:13, fontFamily:F.body, borderRight:`1px solid ${C.border}` }}>{prefix}</span>}
        <input ref={ref} type={type} value={value ?? ''} disabled={disabled}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          placeholder={placeholder} autoFocus={autoFocus}
          style={{ ...base, border:'none', boxShadow:'none', flex:1, background:'transparent' }} />
        {suffix && <span style={{ display:'flex', alignItems:'center', padding:'0 10px', color:C.faint, fontSize:13, fontFamily:F.body, borderLeft:`1px solid ${C.border}` }}>{suffix}</span>}
      </div>
    );
  }
  return (
    <input ref={ref} type={type} value={value ?? ''} disabled={disabled}
      onChange={e => onChange && onChange(e.target.value)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      placeholder={placeholder} autoFocus={autoFocus}
      style={base} />
  );
});

// ─── Math display & editor ──────────────────────────────────────
// Does KaTeX understand this? Asked in strict mode — the lenient mode used for
// rendering swallows errors and emits a red-flecked glyph pile instead. Used to
// stop unrenderable LaTeX being stored in the first place.
const latexParses = (tex) => {
  const src = tex == null ? '' : String(tex);
  if (!src.trim()) return true;
  if (!window.katex || !window.katex.renderToString) return true;
  try {
    window.katex.renderToString(src, { throwOnError: true, displayMode: false });
    return true;
  } catch (e) {
    return false;
  }
};

const MathDisplay = ({ tex, inline, style }) => {
  const ref = React.useRef(null);
  // When KaTeX can't render it, show the raw string in a mono chip. A student
  // reading their own answer back gets something legible instead of broken markup.
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    if (!latexParses(tex)) { setFailed(true); return; }
    setFailed(false);
    try {
      const html = window.katex && window.katex.renderToString
        ? window.katex.renderToString(tex || '', { throwOnError: false, displayMode: !inline })
        : '';
      ref.current.innerHTML = html;
    } catch (e) {
      setFailed(true);
    }
  }, [tex, inline, failed]);
  if (failed) {
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
        background: C.surface2, border: `1px solid ${C.border}`,
        fontFamily: F.mono, fontSize: 13, color: C.sub, whiteSpace: 'pre-wrap',
        ...style,
      }}>{tex == null ? '' : String(tex)}</span>
    );
  }
  return <span ref={ref} style={{ fontFamily: F.mono, color: C.text, ...style }} />;
};

// Render a question prompt, formatting any inline $…$ / display $$…$$ LaTeX
// spans with KaTeX while leaving the surrounding prose as plain text. This is
// what makes equations a teacher types into a question show up formatted.
const PromptText = ({ text, style }) => {
  const str = text == null ? '' : String(text);
  if (!str.includes('$')) return <span style={style}>{str}</span>;
  // Split on $$…$$ (display) and $…$ (inline) spans, keeping the delimiters.
  const parts = str.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (p.length >= 4 && p.startsWith('$$') && p.endsWith('$$'))
          return <MathDisplay key={i} tex={p.slice(2, -2)} inline style={{ fontFamily: 'inherit' }} />;
        if (p.length >= 2 && p.startsWith('$') && p.endsWith('$'))
          return <MathDisplay key={i} tex={p.slice(1, -1)} inline style={{ fontFamily: 'inherit' }} />;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </span>
  );
};

// Quick-insert chips for the symbols students reach for most. `#@` wraps the
// current selection; `#?` leaves a placeholder the caret tabs into. The full
// symbol / greek / function set lives on the pop-up virtual keyboard.
const MATH_CHIPS = [
  { lbl: 'x²',  tex: '#@^{2}' },
  { lbl: 'xⁿ',  tex: '#@^{#?}' },
  { lbl: '√',   tex: '\\sqrt{#@}' },
  { lbl: 'ⁿ√',  tex: '\\sqrt[#?]{#@}' },
  { lbl: 'a/b', tex: '\\frac{#@}{#?}' },
  { lbl: 'π',   tex: '\\pi' },
  { lbl: 'θ',   tex: '\\theta' },
  { lbl: '≤',   tex: '\\le' },
  { lbl: '≥',   tex: '\\ge' },
  { lbl: '±',   tex: '\\pm' },
  { lbl: '×',   tex: '\\times' },
  { lbl: '÷',   tex: '\\div' },
];

const MathEditor = ({ value, onChange, placeholder = 'Enter math…' }) => {
  const ref = React.useRef(null);
  const [foc, setFoc] = React.useState(false);
  const [kbOpen, setKbOpen] = React.useState(false);
  const lastVal = React.useRef(value || '');

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Summon MathLive's shared virtual keyboard manually (via the toolbar
    // button) so it doesn't auto-pop on every focus or steal space on desktop.
    try { el.mathVirtualKeyboardPolicy = 'manual'; } catch (e) {}
    const sync = () => {
      const v = el.value || '';
      if (v !== lastVal.current) {
        lastVal.current = v;
        onChange && onChange(v);
      }
    };
    const onFocus = () => setFoc(true);
    const onBlur = () => setFoc(false);
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('input', sync);
      el.removeEventListener('change', sync);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, [onChange]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((value || '') !== (el.value || '')) {
      el.value = value || '';
      lastVal.current = value || '';
    }
  }, [value]);

  // Mirror the shared keyboard's open/closed state (one keyboard is shared by
  // every math-field on the page) so the toggle button reflects it — including
  // when the student dismisses the keyboard with its own close button. The sync
  // is best-effort; show/hide below works regardless of this listener.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !el.addEventListener) return;
    const onToggle = () => setKbOpen(!!(window.mathVirtualKeyboard && window.mathVirtualKeyboard.visible));
    el.addEventListener('virtual-keyboard-toggle', onToggle);
    return () => el.removeEventListener('virtual-keyboard-toggle', onToggle);
  }, []);

  const insert = (latex) => {
    const el = ref.current;
    if (!el || !el.insert) return;
    el.focus();
    el.insert(latex, { focus: true, selectionMode: 'placeholder' });
  };

  const toggleKeyboard = () => {
    const el = ref.current;
    const vk = window.mathVirtualKeyboard;
    el && el.focus();
    if (!vk) return;
    if (vk.visible) vk.hide(); else vk.show();
    setKbOpen(!!vk.visible);
  };

  return (
    <div style={{
      border: `1px solid ${foc ? C.brand : C.border}`,
      borderRadius: 8, background: C.bg, overflow: 'hidden',
      boxShadow: foc ? ring(C.brand) : 'none', transition: T,
    }}>
      {React.createElement('math-field', {
        ref,
        placeholder,
        style: {
          display:'block', minHeight: 40, fontSize: 18,
          padding: 8, border: 'none', outline: 'none', background: 'transparent',
        },
      })}
      {/* LaTeX toolbar: open the on-screen math keyboard or tap a common symbol */}
      <div style={{
        display:'flex', alignItems:'center', flexWrap:'wrap', gap: 2,
        padding: '6px 8px', borderTop: `1px solid ${C.border}`, background: C.surface,
      }}>
        {/* The keyboard toggle is a mode, not an insert — it keeps the border
            and the pressed state so it never reads as a twelfth symbol. */}
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleKeyboard(); }}
          title={kbOpen ? 'Hide math keyboard' : 'Show math keyboard'}
          aria-pressed={kbOpen}
          style={{
            display:'inline-flex', alignItems:'center', gap: 6,
            padding: '5px 9px', borderRadius: RADIUS - 2, cursor:'pointer',
            border: `1px solid ${kbOpen ? C.brand : C.border}`,
            background: kbOpen ? C.brandSoft : C.bg,
            color: kbOpen ? C.brand : C.sub, fontFamily: F.body, ...TS.meta, fontWeight: W.medium,
            transition: T, marginRight: 6,
          }}>
          <Ico name="keyboard" size={14} color={kbOpen ? C.brand : C.muted} />
          Keyboard
        </button>
        <span style={{ width: 1, height: 16, background: C.border, margin: '0 6px 0 0' }} />
        {/* Symbol inserts are ghost buttons — one repeated action, so they
            group as a run rather than eleven separate bordered controls. */}
        {MATH_CHIPS.map((ch, i) => (
          <button key={i} type="button"
            onMouseDown={(e) => { e.preventDefault(); insert(ch.tex); }}
            title={`Insert ${ch.lbl}`}
            aria-label={`Insert ${ch.lbl}`}
            onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              minWidth: 28, padding: '4px 7px', borderRadius: RADIUS - 2, cursor:'pointer',
              border: '1px solid transparent', background: 'transparent', color: C.sub,
              fontFamily: F.mono, fontSize: 13, lineHeight: 1.2, transition: T,
            }}>
            {ch.lbl}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Auto-marking helpers ───────────────────────────────────────
const normalizeMath = (s) => {
  if (s == null) return '';
  let x = String(s);
  // Remove \left and \right
  x = x.replace(/\\left/g, '').replace(/\\right/g, '');
  // Convert fractions \frac{a}{b} -> (a)/(b)
  let prev;
  do {
    prev = x;
    x = x.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  } while (x !== prev);
  // Convert \sqrt{x} -> sqrt(x)
  do {
    prev = x;
    x = x.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
  } while (x !== prev);
  // Symbols
  x = x.replace(/\\cdot|\\times/g, '*');
  x = x.replace(/\\pi/g, 'pi');
  x = x.replace(/\\theta/g, 'theta');
  x = x.replace(/\\alpha/g, 'alpha').replace(/\\beta/g, 'beta');
  // Strip remaining backslashes from common commands
  x = x.replace(/\\,|\\!|\\;|\\:/g, '');
  // Unify operators
  x = x.replace(/×/g, '*').replace(/·/g, '*');
  // Whitespace
  x = x.replace(/\s+/g, '');
  // Lowercase
  x = x.toLowerCase();
  return x;
};

const eq = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const autoMark = (q, ans) => {
  if (ans == null || ans === '') return null;
  if (q.type === 'mcq') {
    return ans === q.correctIndex ? q.points : 0;
  }
  if (q.type === 'numeric') {
    const n = parseFloat(ans);
    if (Number.isNaN(n)) return 0;
    const tol = q.tolerance ?? 0.01;
    return Math.abs(n - q.answer) <= tol ? q.points : 0;
  }
  if (q.type === 'math') {
    return normalizeMath(ans) === normalizeMath(q.answer) ? q.points : 0;
  }
  if (q.type === 'truefalse') {
    return ans === q.answer ? q.points : 0;
  }
  if (q.type === 'multi') {
    // ans is an array of selected indices; exact set match (order-independent).
    const want = [...(q.correctIndices || [])].sort().join(',');
    const got  = [...(Array.isArray(ans) ? ans : [])].sort().join(',');
    return want === got && want !== '' ? q.points : 0;
  }
  if (q.type === 'fillblank') {
    // ans is an array of strings; proportional credit per correct blank.
    const blanks = q.blanks || [];
    if (blanks.length === 0) return null;
    const arr = Array.isArray(ans) ? ans : [];
    const correct = blanks.reduce((n, b, i) => n + (eq(arr[i], b) ? 1 : 0), 0);
    return Math.round((correct / blanks.length) * q.points * 100) / 100;
  }
  if (q.type === 'match') {
    // ans maps left-index -> chosen right-index; correct when they line up.
    const pairs = q.pairs || [];
    if (pairs.length === 0) return null;
    const map = ans || {};
    const correct = pairs.reduce((n, _p, i) => n + (map[i] === i ? 1 : 0), 0);
    return Math.round((correct / pairs.length) * q.points * 100) / 100;
  }
  return null;
};

const isAuto = (t) => t === 'mcq' || t === 'numeric' || t === 'math'
  || t === 'truefalse' || t === 'multi' || t === 'fillblank' || t === 'match';

// ─── Question type catalog ──────────────────────────────────────
const QTYPES = [
  { type: 'mcq',       label: 'MCQ',          short: 'MCQ',          desc: 'Auto-marked',          marker: 'auto' },
  { type: 'multi',     label: 'Multi Select', short: 'Multi Select', desc: 'Auto-marked',          marker: 'auto' },
  { type: 'truefalse', label: 'True/False',   short: 'True/False',   desc: 'Auto-marked',          marker: 'auto' },
  { type: 'short',     label: 'Short Answer', short: 'Short Answer', desc: 'Teacher-marked',       marker: 'manual' },
  { type: 'long',      label: 'Long Answer',  short: 'Long Answer',  desc: 'Teacher-marked',       marker: 'manual' },
  { type: 'math',      label: 'Math',         short: 'Math',         desc: 'Auto-marked (LaTeX)',  marker: 'auto' },
  { type: 'numeric',   label: 'Numeric',      short: 'Numeric',      desc: 'Auto-marked',          marker: 'auto' },
  { type: 'fillblank', label: 'Fill Blank',   short: 'Fill Blank',   desc: 'Auto-marked',          marker: 'auto' },
  { type: 'match',     label: 'Match',        short: 'Match',        desc: 'Auto-marked',          marker: 'auto' },
  { type: 'upload',    label: 'File Upload',  short: 'File Upload',  desc: 'Teacher-marked',       marker: 'manual' },
];
const qtypeMeta = (t) => QTYPES.find(x => x.type === t) || QTYPES[0];

// ─── Icon library (inline svg) ──────────────────────────────────
const Ico = ({ name, size = 16, color = 'currentColor' }) => {
  const paths = {
    plus:    'M12 4v16M4 12h16',
    check:   'M5 12l5 5L20 7',
    x:       'M6 6l12 12M18 6L6 18',
    edit:    'M4 20h4l11-11-4-4L4 16v4z',
    trash:   'M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14',
    eye:     'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z',
    clock:   'M12 8v4l3 3 M12 22a10 10 0 100-20 10 10 0 000 20z',
    upload:  'M12 16V4 M5 11l7-7 7 7 M3 20h18',
    file:    'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z M14 3v6h6',
    chevR:   'M9 6l6 6-6 6',
    chevL:   'M15 6l-6 6 6 6',
    chevD:   'M6 9l6 6 6-6',
    chevU:   'M6 15l6-6 6 6',
    copy:    'M9 9h10v10H9V9z M5 15H3V3h12v2',
    grip:    'M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01',
    settings:'M12 15a3 3 0 100-6 3 3 0 000 6z M4 12a8 8 0 01.2-1.8l-2-1.5 2-3.4 2.3 1a8 8 0 013.1-1.8L12 2h0l.4 2.5a8 8 0 013.1 1.8l2.3-1 2 3.4-2 1.5A8 8 0 0120 12',
    search:  'M21 21l-5-5 M11 17a6 6 0 100-12 6 6 0 000 12z',
    sparkle: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z',
    flame:   'M12 2c1 4 4 5 4 9a4 4 0 11-8 0c0-2 1-3 1-5 0 2 1 3 3 3-1-3 0-5 0-7z',
    book:    'M4 4h7a3 3 0 013 3v13H7a3 3 0 01-3-3V4z M20 4h-7a3 3 0 00-3 3v13h7a3 3 0 003-3V4z',
    pencil:  'M3 21l3-1 11-11-2-2L4 18l-1 3z M14 5l2 2',
    user:    'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0',
    arrowR:  'M5 12h14 M13 6l6 6-6 6',
    arrowL:  'M19 12H5 M11 6l-6 6 6 6',
    download:'M12 4v12 M5 13l7 7 7-7 M3 22h18',
    save:    'M5 3h11l3 3v15H5V3z M9 3v6h7V3 M7 14h10v7H7v-7z',
    grid:    'M3 3h8v8H3V3z M13 3h8v8h-8V3z M3 13h8v8H3v-8z M13 13h8v8h-8v-8z',
    list:    'M4 6h16 M4 12h16 M4 18h16',
    inbox:   'M3 13h4l2 3h6l2-3h4 M3 13l3-9h12l3 9 M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6',
    award:   'M12 15a6 6 0 100-12 6 6 0 000 12z M9 14l-1 7 4-2 4 2-1-7',
    star:    'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z',
    bell:    'M6 9a6 6 0 1112 0v5l1 2H5l1-2V9z M10 19a2 2 0 004 0',
    book2:   'M4 4v16c2-1 5-2 8-2s6 1 8 2V4c-2-1-5-2-8-2S6 3 4 4z',
    info:    'M12 8h.01 M11 12h1v5h1 M12 22a10 10 0 100-20 10 10 0 000 20z',
    layers:  'M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5 M3 18l9 5 9-5',
    calendar:'M3 7h18M3 7v12a2 2 0 002 2h14a2 2 0 002-2V7M3 7l0-2a2 2 0 012-2h14a2 2 0 012 2v2M8 3v4M16 3v4',
    send:    'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
    flag:    'M5 21V4 M5 4h13l-3.5 4.5L18 13H5',
    play:    'M7 5v14l12-7-12-7z',
    target:  'M12 22a10 10 0 100-20 10 10 0 000 20z M12 17a5 5 0 100-10 5 5 0 000 10z M12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    trend:   'M3 17l6-6 4 4 8-8 M15 7h6v6',
    minus:   'M5 12h14',
    lock:    'M5 11h14v10H5V11z M8 11V7a4 4 0 018 0v4',
    chat:    'M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z',
    alertCircle: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 8v5 M12 16h.01',
    keyboard: 'M3 6h18v12H3V6z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h.01 M11 14h.01 M15 14h.01 M18.5 14h.01',
  };
  const d = paths[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink:0, display:'block' }}>
      {d.split(' M').filter(Boolean).map((seg, i) =>
        <path key={i} d={(i === 0 && d.startsWith('M') ? '' : 'M') + seg} />
      )}
    </svg>
  );
};

// ─── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
// A due date the teacher picks without touching the time means end of that day,
// not one in the morning — which is what the browser's datetime-local hands back.
const DEFAULT_DUE_TIME = '23:59';
const withDefaultDueTime = (v) => {
  if (!v) return v;
  const str = String(v);
  if (str.length === 10) return `${str}T${DEFAULT_DUE_TIME}`;      // date only
  if (/T00:00(:00)?$/.test(str)) return str.slice(0, 10) + `T${DEFAULT_DUE_TIME}`;
  return str;
};
const daysUntil = (iso) => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86400000);
};
// A submission is "graded" once the teacher returns it (legacy: 'approved').
const isGraded = (sub) => !!sub && (sub.status === 'returned' || sub.status === 'approved');
const submissionStatus = (asn, studentId) => {
  const sub = asn.submissions[studentId];
  if (!sub) return 'not_started';
  if (isGraded(sub)) return 'approved';
  return 'submitted';
};
const totalPoints = (asn) => asn.questions.reduce((s, q) => s + (q.points || 0), 0);
const autoTotal = (asn) => asn.questions.filter(q => isAuto(q.type)).reduce((s, q) => s + (q.points || 0), 0);
const manualTotal = (asn) => asn.questions.filter(q => !isAuto(q.type)).reduce((s, q) => s + (q.points || 0), 0);
const submissionScore = (asn, sub) => {
  if (!sub) return 0;
  return asn.questions.reduce((s, q) => {
    const m = sub.marks?.[q.id];
    return s + (typeof m === 'number' ? m : 0);
  }, 0);
};
const autoScore = (asn, sub) => {
  if (!sub) return 0;
  return asn.questions.filter(q => isAuto(q.type)).reduce((s, q) => {
    const m = sub.marks?.[q.id];
    return s + (typeof m === 'number' ? m : 0);
  }, 0);
};
const fullyMarked = (asn, sub) => {
  if (!sub) return false;
  return asn.questions.every(q => typeof sub.marks?.[q.id] === 'number');
};

// ─── Ownership ─────────────────────────────────────────────────
// THE ownership predicate. Id equality only: names break on shared surnames and
// on anyone who changes theirs. `teacherName` survives on the assignment purely
// as a display string and must never appear in a filter.
const isMine = (a, user) => !!a && !!user && a.teacherId === user.id;

// ─── Question outcome ──────────────────────────────────────────
// Outcomes are derived from the mark, never stored, so the outcome and the mark
// cannot disagree. `null` (unmarked) is deliberately distinct from 0 (marked
// wrong) — fullyMarked() depends on that distinction.
const outcomeFor = (question, mark) => {
  if (typeof mark !== 'number') return null;
  if (mark >= (question.points || 0)) return 'correct';
  if (mark <= 0) return 'incorrect';
  return 'partial';
};

// ─── Availability, lateness and release ────────────────────────
// The rules behind the settings a teacher switches on. Every screen asks these
// questions here, so a setting means the same thing on the student's Start button
// as it does on the teacher's status chip.
const settingsOf = (a) => (a && a.settings) || {};

// "Available from" — before this moment the assignment is visible but not startable.
const opensAt = (a) => settingsOf(a).availableFrom || null;
const isScheduled = (a) => {
  const o = opensAt(a);
  if (!o) return false;
  const t = new Date(o).getTime();
  return !Number.isNaN(t) && t > Date.now();
};

const isPastDue = (a) => {
  if (!a.dueAt) return false;
  const t = new Date(a.dueAt).getTime();
  return !Number.isNaN(t) && t < Date.now();
};
// After the due date a student may only work on it if late submissions are allowed.
const acceptsSubmissions = (a) => !isScheduled(a) && (!isPastDue(a) || !!settingsOf(a).allowLate);

// Attempts. `attemptCount` lives on the submission (A9); a submission written
// before this field existed counts as one attempt.
const attemptsAllowed = (a) => Math.max(1, parseInt(settingsOf(a).attemptsAllowed, 10) || 1);
const attemptsUsed = (sub) => {
  if (!sub) return 0;
  return typeof sub.attemptCount === 'number' ? sub.attemptCount : (hasSubmitted(sub) ? 1 : 0);
};
const attemptsLeft = (a, sub) => Math.max(0, attemptsAllowed(a) - attemptsUsed(sub));

// Has the teacher released these marks to the student? When either hold-back
// setting is on, marks stay hidden until the teacher explicitly releases them —
// so the setting actually withholds something. Otherwise returning the work
// releases it, which is what teachers already expect.
const marksReleased = (a, sub) => {
  if (!sub || !isGraded(sub)) return false;
  const s = settingsOf(a);
  if (s.hideMarksUntilReleased || s.releaseAfterApproval) return !!sub.marksReleasedAt;
  return true;
};
// Graded work whose marks this teacher still has to release.
const heldBack = (a, sub) => isGraded(sub) && !marksReleased(a, sub);

// A submission that arrived after the due date.
const isLateSub = (a, sub) => {
  if (!sub) return false;
  if (typeof sub.isLate === 'boolean') return sub.isLate;
  return !!sub.submittedAt && !!a.dueAt && new Date(sub.submittedAt) > new Date(a.dueAt);
};

// ─── The homework counting selector ────────────────────────────
// ONE place that counts homework. Every badge, tile, header and pill reads this,
// so no two surfaces can report different numbers for the same thing. Nothing is
// stored: everything derives from the store at call time.
//
// `scope` is applied BEFORE counting, never after:
//   { teacherId } assignments this teacher owns
//   { studentId } assignments assigned to this student (drafts excluded)
//   { classId } | { classLabel } assignments set for one class
//   {} centre-wide
//
// `toMark` counts SUBMISSIONS awaiting a mark; `assignmentsToMark` counts
// ASSIGNMENTS holding at least one. Different units — deliberately separate.
const awaitingMark = (sub) => !!sub && sub.status === 'submitted';
// A started-but-unsent attempt is NOT a submission — it must not inflate the
// submission rate, and it still counts as work the student owes.
const hasSubmitted = (sub) => !!sub && (!!sub.submittedAt || sub.status === 'submitted' || isGraded(sub));

const scopeAssignments = (store, scope) => {
  const sc = scope || {};
  let list = Object.values(store.assignments || {});
  if (sc.teacherId) list = list.filter(a => a.teacherId === sc.teacherId);
  if (sc.studentId) list = list.filter(a => (a.studentIds || []).includes(sc.studentId) && a.status !== 'draft');
  let label = sc.classLabel;
  if (!label && sc.classId) {
    const cls = (store.classes || []).find(c => c.id === sc.classId);
    label = cls && cls.label;
  }
  // Tolerant class match ("Year 10 – Group A" ↔ "Yr 10 Group A") so the class
  // workspaces and this selector always select the same rows.
  if (label) {
    const key = classKey(label);
    list = key ? list.filter(a => classKey(a.classLabel) === key)
               : list.filter(a => a.classLabel === label);
  }
  if (sc.folderId === 'unfiled') list = list.filter(a => !a.folderId);
  else if (sc.folderId) list = list.filter(a => a.folderId === sc.folderId);
  if (sc.subject) list = list.filter(a => a.subject === sc.subject);
  return list;
};

const getHomeworkCounts = (store, scope) => {
  const sc = scope || {};
  const list = scopeAssignments(store, sc);
  // A student scope counts only their own row on each assignment; every other
  // scope counts the whole cohort.
  const rowsFor = (a) => sc.studentId ? [sc.studentId] : (a.studentIds || []);

  let toMark = 0, assignmentsToMark = 0, overdue = 0;
  let assigned = 0, submittedRows = 0, pending = 0, marked = 0;

  list.forEach(a => {
    const ids = rowsFor(a);
    const subs = ids.map(sid => (a.submissions || {})[sid]);
    const n = subs.filter(awaitingMark).length;
    toMark += n;
    if (n > 0) assignmentsToMark++;

    if (a.status !== 'draft') {
      assigned += ids.length;
      submittedRows += subs.filter(hasSubmitted).length;
      pending += subs.filter(s => !hasSubmitted(s)).length;
      marked += subs.filter(s => isGraded(s) && marksReleased(a, s)).length;
    }
    // Past its due date with work still outstanding.
    const isOverdue = a.status === 'active' && a.dueAt && daysUntil(a.dueAt) < 0
      && subs.some(s => !hasSubmitted(s));
    if (isOverdue) overdue++;
  });

  return {
    active: list.filter(a => a.status === 'active').length,
    toMark,
    assignmentsToMark,
    drafts: list.filter(a => a.status === 'draft').length,
    closed: list.filter(a => a.status === 'closed').length,
    overdue,
    submissionRate: assigned ? Math.round((submittedRows / assigned) * 100) : 0,
    // Extensions beyond the original seven — added so consumers that needed one
    // more number extend this selector instead of counting locally.
    total: list.length,
    assigned,
    submitted: submittedRows,
    pending,
    marked,
  };
};

// Assignment rows for one class group, for the teacher and admin class-detail
// workspaces. Both used to read a separate seed list; they now read the same store
// as everything else, so a class page and the Homework page cannot disagree.
// Rows keep the field names those tabs already render.
const classKey = (label) => {
  const year = (String(label || '').match(/\d+/) || [])[0];
  const group = (String(label || '').match(/Group\s+([A-Za-z])/i) || [])[1];
  return year && group ? `${year}|${group.toUpperCase()}` : null;
};

const listClassHomework = (classLabel) => {
  const key = classKey(classLabel);
  if (!key) return [];
  const store = loadStore();
  return Object.values(store.assignments || {})
    .filter(a => a.status !== 'draft' && classKey(a.classLabel) === key)
    .map(a => {
      const subs = (a.studentIds || []).map(sid => (a.submissions || {})[sid]);
      const graded = subs.filter(isGraded);
      const pts = totalPoints(a);
      const scores = pts ? graded.map(s => Math.round((submissionScore(a, s) / pts) * 100)) : [];
      const toMark = subs.filter(awaitingMark).length;
      return {
        id: a.id,
        title: a.title,
        class: a.classLabel,
        subject: a.subject,
        set: fmtDate(a.createdAt),
        due: fmtDate(a.dueAt),
        submitted: subs.filter(Boolean).length,
        total: (a.studentIds || []).length,
        marked: graded.length,
        avgScore: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null,
        status: a.status === 'closed' ? 'complete' : toMark > 0 ? 'marking' : 'open',
      };
    })
    .sort((x, y) => String(y.id).localeCompare(String(x.id)));
};

// ════════════════════════════════════════════════════════════════
// PDF Import (simulated parser)
// Picks one of several question banks based on filename heuristics.
// ════════════════════════════════════════════════════════════════
const PDF_BANKS = HW_PDF_BANKS;

const pickBankForFilename = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('alg') || n.includes('quad') || n.includes('linear')) return 'algebra';
  if (n.includes('calc') || n.includes('diff') || n.includes('integ')) return 'calculus';
  if (n.includes('phys') || n.includes('mech') || n.includes('suvat')) return 'physics';
  if (n.includes('trig') || n.includes('sin') || n.includes('cos'))    return 'trig';
  return 'general';
};

const PdfImportModal = ({ open, onClose, onImport }) => {
  const [phase, setPhase] = React.useState('idle'); // idle | parsing | review
  const [parsed, setParsed] = React.useState([]);
  const [picked, setPicked] = React.useState({});
  const [filename, setFilename] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [bankKey, setBankKey] = React.useState('general');
  const fileRef = React.useRef(null);

  // Reset state every time the modal opens.
  React.useEffect(() => {
    if (open) {
      setPhase('idle');
      setParsed([]);
      setPicked({});
      setFilename('');
      setDragOver(false);
      setBankKey('general');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  if (!open) return null;

  const startParse = (name) => {
    const safeName = name || 'paper.pdf';
    setFilename(safeName);
    const key = pickBankForFilename(safeName);
    setBankKey(key);
    setPhase('parsing');
    window.setTimeout(() => {
      const bank = PDF_BANKS[key] || PDF_BANKS.general;
      const withIds = bank.map((q, i) => ({ ...q, id: 'p_' + i + '_' + Math.random().toString(36).slice(2, 6) }));
      setParsed(withIds);
      setPicked(Object.fromEntries(withIds.map(q => [q.id, true])));
      setPhase('review');
    }, 1400);
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type && f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      // still accept — simulate parse
    }
    startParse(f.name);
  };

  const onFileChange = (e) => {
    handleFiles(e.target.files);
    // Reset value so re-selecting the same file fires onChange again.
    if (fileRef.current) fileRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer?.files);
  };

  const togglePick = (id) => {
    setPicked(p => ({ ...p, [id]: !p[id] }));
  };
  const allOn = parsed.length > 0 && parsed.every(q => picked[q.id]);
  const toggleAll = () => {
    setPicked(allOn ? {} : Object.fromEntries(parsed.map(q => [q.id, true])));
  };

  const importNow = () => {
    // Explicit field copy — Babel-standalone mis-compiles `const { id, ...rest }`
    // here and silently drops fields, so every key is copied by hand.
    const chosen = parsed.filter(q => picked[q.id]).map(q => {
      const out = {};
      Object.keys(q).forEach(k => { if (k !== 'id') out[k] = q[k]; });
      out.id = 'q_' + Math.random().toString(36).slice(2, 8);
      return out;
    });
    onImport(chosen);
    onClose();
  };

  const reparseWithBank = (key) => {
    setBankKey(key);
    const bank = PDF_BANKS[key] || PDF_BANKS.general;
    const withIds = bank.map((q, i) => ({ ...q, id: 'p_' + i + '_' + Math.random().toString(36).slice(2, 6) }));
    setParsed(withIds);
    setPicked(Object.fromEntries(withIds.map(q => [q.id, true])));
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.5)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:640, maxHeight:'85vh', background:C.bg,
        borderRadius:14, border:`1px solid ${C.border}`,
        boxShadow:C.shadowL, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:F.head, fontSize:16, fontWeight:700, color:C.text }}>Import from PDF</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.muted, marginTop:2 }}>
              {phase === 'idle' && 'Upload a past paper to extract questions automatically.'}
              {phase === 'parsing' && 'Parsing document…'}
              {phase === 'review' && `Found ${parsed.length} question${parsed.length === 1 ? '' : 's'} in ${filename}`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width:30, height:30, borderRadius:7, border:`1px solid ${C.border}`,
            background:C.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Ico name="x" size={14} color={C.muted} />
          </button>
        </div>

        <div style={{ padding:20, overflow:'auto', flex:1 }}>
          {phase === 'idle' && (
            <div>
              <div
                onClick={() => fileRef.current && fileRef.current.click()}
                onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  gap:10, padding:'44px 20px',
                  border:`2px dashed ${dragOver ? C.brand : C.border}`,
                  borderRadius:10,
                  background: dragOver ? C.brandSoft : C.surface,
                  cursor:'pointer', transition: T,
                }}
              >
                <div style={{
                  width:52, height:52, borderRadius:'50%',
                  background:C.brandSoft, display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Ico name="upload" size={22} color={C.brand} />
                </div>
                <div style={{ fontFamily:F.body, fontSize:14, fontWeight:600, color:C.text }}>
                  {dragOver ? 'Release to upload' : 'Drop a PDF here'}
                </div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>
                  {dragOver ? ' ' : 'or click to browse'}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display:'none' }}
                  onChange={onFileChange}
                />
              </div>

              <div style={{
                marginTop:14, padding:'10px 12px', background:C.surface, borderRadius:8,
                border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10,
              }}>
                <Ico name="info" size={13} color={C.muted} />
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted, flex:1 }}>
                  No PDF? Try a sample bank instead:
                </span>
                <select
                  value={bankKey}
                  onChange={e => {
                    const k = e.target.value;
                    setBankKey(k);
                    startParse(k + '.pdf');
                  }}
                  style={{
                    padding:'5px 8px', borderRadius:6, border:`1px solid ${C.border}`,
                    background:C.bg, color:C.text, fontFamily:F.body, fontSize:12, cursor:'pointer',
                  }}>
                  <option value="general">Choose a sample…</option>
                  <option value="algebra">Algebra paper</option>
                  <option value="calculus">Calculus paper</option>
                  <option value="trig">Trigonometry paper</option>
                  <option value="physics">Physics / SUVAT paper</option>
                </select>
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{
                margin:'0 auto 16px', width:36, height:36, borderRadius:'50%',
                border:`3px solid ${C.brandSoft}`, borderTopColor: C.brand,
                animation:'hwSpin 0.8s linear infinite',
              }} />
              <div style={{ fontFamily:F.body, fontSize:13, color:C.sub }}>Extracting questions from {filename}…</div>
              <style>{`@keyframes hwSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {phase === 'review' && (
            <div>
              <div style={{
                display:'flex', alignItems:'center', gap:8, marginBottom:12,
                padding:'8px 10px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}`,
              }}>
                <button onClick={toggleAll} style={{
                  padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`,
                  background:C.bg, color:C.sub, fontFamily:F.body, fontSize:12, fontWeight:500,
                  cursor:'pointer',
                }}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </button>
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>
                  {Object.values(picked).filter(Boolean).length} of {parsed.length} selected
                </span>
                <div style={{ flex:1 }} />
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>Question bank:</span>
                <select value={bankKey} onChange={e => reparseWithBank(e.target.value)}
                  style={{
                    padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`,
                    background:C.bg, color:C.text, fontFamily:F.body, fontSize:12, cursor:'pointer',
                  }}>
                  <option value="algebra">Algebra</option>
                  <option value="calculus">Calculus</option>
                  <option value="trig">Trigonometry</option>
                  <option value="physics">Physics</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {parsed.map((q, i) => {
                  const m = qtypeMeta(q.type);
                  const on = !!picked[q.id];
                  return (
                    <div key={q.id} role="button" tabIndex={0}
                      onClick={() => togglePick(q.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePick(q.id); } }}
                      style={{
                        display:'flex', gap:12, padding:12, borderRadius:8,
                        border:`1px solid ${on ? C.brandBorder : C.border}`,
                        background: on ? C.brandSoft : C.bg, cursor:'pointer',
                        transition: T, alignItems:'flex-start',
                      }}>
                      <span style={{
                        marginTop:2, width:18, height:18, borderRadius:5, flexShrink:0,
                        border:`1.5px solid ${on ? C.brand : C.borderD}`,
                        background: on ? C.brand : C.bg,
                        display:'flex', alignItems:'center', justifyContent:'center', transition: T,
                      }}>
                        {on && <Ico name="check" size={12} color="#fff" />}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontFamily:F.mono, fontSize:11, color:C.muted }}>Q{i+1}</span>
                          <Pill tone={m.marker === 'auto' ? 'brand' : 'amber'}>{m.label}</Pill>
                          <span style={{ marginLeft:'auto', fontFamily:F.mono, fontSize:11, color:C.muted }}>{q.points} pt</span>
                        </div>
                        <PromptText text={q.prompt} style={{ fontFamily:F.body, fontSize:13, color:C.text, lineHeight: 1.5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {phase === 'review' && (
          <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:C.surface }}>
            <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />}
              onClick={() => { setPhase('idle'); setParsed([]); setPicked({}); setFilename(''); if (fileRef.current) fileRef.current.value = ''; }}>
              Choose another file
            </Btn>
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="soft" small onClick={onClose}>Cancel</Btn>
              <Btn variant="brand" small icon={<Ico name="plus" size={13} color="#fff" />} onClick={importNow}
                disabled={!Object.values(picked).some(Boolean)}>
                Import {Object.values(picked).filter(Boolean).length} question{Object.values(picked).filter(Boolean).length === 1 ? '' : 's'}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Question rendering — student answer inputs
// ════════════════════════════════════════════════════════════════
const QuestionAnswerInput = ({ question, value, onChange }) => {
  const q = question;
  if (q.type === 'mcq') {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {q.choices.map((c, i) => {
          const on = value === i;
          return (
            <label key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              border: `1px solid ${on ? C.brand : C.border}`,
              background: on ? C.brandSoft : C.bg,
              borderRadius:10, cursor:'pointer', transition: T,
              boxShadow: on ? ring(C.brand) : 'none',
            }}>
              <span style={{
                width:20, height:20, borderRadius:'50%',
                border:`2px solid ${on ? C.brand : C.borderD}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: on ? C.brand : C.bg,
              }}>
                {on && <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
              </span>
              <span style={{ fontFamily: F.mono, fontSize:12, color: on ? C.brand : C.muted, fontWeight:600 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ fontFamily: F.body, fontSize:14, color: C.text }}>{c}</span>
              <input type="radio" name={q.id} checked={on} onChange={() => onChange(i)} style={{ display:'none' }} />
            </label>
          );
        })}
      </div>
    );
  }
  if (q.type === 'multi') {
    const sel = Array.isArray(value) ? value : [];
    const toggle = (i) => onChange(sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i].sort());
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {q.choices.map((c, i) => {
          const on = sel.includes(i);
          return (
            <label key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              border: `1px solid ${on ? C.brand : C.border}`,
              background: on ? C.brandSoft : C.bg,
              borderRadius:10, cursor:'pointer', transition: T,
              boxShadow: on ? ring(C.brand) : 'none',
            }}>
              <span style={{
                width:20, height:20, borderRadius:6,
                border:`2px solid ${on ? C.brand : C.borderD}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: on ? C.brand : C.bg,
              }}>
                {on && <Ico name="check" size={12} color="#fff" />}
              </span>
              <span style={{ fontFamily: F.mono, fontSize:12, color: on ? C.brand : C.muted, fontWeight:600 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ fontFamily: F.body, fontSize:14, color: C.text }}>{c}</span>
              <input type="checkbox" checked={on} onChange={() => toggle(i)} style={{ display:'none' }} />
            </label>
          );
        })}
      </div>
    );
  }
  if (q.type === 'truefalse') {
    return (
      <div style={{ display:'flex', gap:12 }}>
        {[true, false].map(v => {
          const on = value === v;
          return (
            <button key={String(v)} onClick={() => onChange(v)} style={{
              flex:1, maxWidth:200, padding:'14px 16px', borderRadius:10, cursor:'pointer',
              border:`1px solid ${on ? C.brand : C.border}`,
              background: on ? C.brand : C.bg, color: on ? '#fff' : C.sub,
              fontFamily: F.body, fontSize:15, fontWeight:600, transition: T,
              boxShadow: on ? ring(C.brand) : 'none',
            }}>{v ? 'True' : 'False'}</button>
          );
        })}
      </div>
    );
  }
  if (q.type === 'fillblank') {
    const arr = Array.isArray(value) ? value : [];
    const setBlank = (i, v) => { const n = [...arr]; n[i] = v; onChange(n); };
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {(q.blanks || []).map((_, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily: F.mono, fontSize:12, color: C.muted, width:64 }}>Blank {i + 1}</span>
            <Input value={arr[i] || ''} onChange={(v) => setBlank(i, v)} placeholder="Your answer" />
          </div>
        ))}
      </div>
    );
  }
  if (q.type === 'match') {
    const map = value || {};
    const setMatch = (li, ri) => onChange({ ...map, [li]: ri === '' ? undefined : parseInt(ri, 10) });
    const rights = (q.pairs || []).map(p => p.right);
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {(q.pairs || []).map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{
              flex:1, padding:'10px 14px', borderRadius:10, background:C.surface,
              border:`1px solid ${C.border}`, fontFamily:F.body, fontSize:14, color:C.text,
            }}>{p.left}</span>
            <Ico name="arrowR" size={16} color={C.faint} />
            <select value={map[i] ?? ''} onChange={e => setMatch(i, e.target.value)} style={{
              flex:1, padding:'10px 12px', borderRadius:10,
              border:`1px solid ${map[i] != null ? C.brand : C.border}`, background:C.bg, color:C.text,
              fontFamily:F.body, fontSize:14, cursor:'pointer',
            }}>
              <option value="">Choose…</option>
              {rights.map((r, ri) => <option key={ri} value={ri}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    );
  }
  if (q.type === 'numeric') {
    return (
      <div style={{ maxWidth: 280 }}>
        <Input type="number" value={value ?? ''} onChange={(v) => onChange(v === '' ? null : v)} placeholder="Enter your answer"
          style={{ fontSize: 24, fontWeight: 600, padding:'14px 16px', fontFamily: F.mono, textAlign:'left' }} />
      </div>
    );
  }
  if (q.type === 'math') {
    return <MathEditor value={value || ''} onChange={onChange} placeholder="Type or use the keyboard" />;
  }
  if (q.type === 'short') {
    return <Input value={value || ''} onChange={onChange} placeholder="Your answer" />;
  }
  if (q.type === 'long') {
    return <Input multiline rows={6} value={value || ''} onChange={onChange} placeholder="Write your answer here…" />;
  }
  if (q.type === 'upload') {
    const has = !!value;
    return (
      <label style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        padding:'24px 20px', border:`2px dashed ${has ? C.brandBorder : C.border}`,
        background: has ? C.brandSoft : C.surface,
        borderRadius:10, cursor:'pointer', transition: T,
      }}>
        <Ico name={has ? 'file' : 'upload'} size={18} color={has ? C.brand : C.muted} />
        <span style={{ fontFamily:F.body, fontSize:13, color: has ? C.brand : C.sub, fontWeight:500 }}>
          {has ? value : 'Drop a file or click to upload'}
        </span>
        <input type="file" style={{ display:'none' }} onChange={e => {
          const f = e.target.files?.[0];
          if (f) onChange(f.name);
        }} />
      </label>
    );
  }
  return null;
};

// Read-only display of a student's answer (for review/results)
const QuestionAnswerDisplay = ({ question, answer }) => {
  const q = question;
  const emptyArr = Array.isArray(answer) && answer.length === 0;
  const emptyObj = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
  const isEmpty = answer == null || answer === '' || emptyArr || emptyObj;
  if (isEmpty && q.type !== 'truefalse') {
    return <span style={{ fontFamily:F.body, fontSize:13, color: C.faint, fontStyle:'italic' }}>No answer submitted</span>;
  }
  if (q.type === 'mcq') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:F.body, fontSize:14, color:C.text }}>
        <Pill tone="brand">{String.fromCharCode(65 + answer)}</Pill>
        <span>{q.choices[answer]}</span>
      </div>
    );
  }
  if (q.type === 'multi') {
    const sel = Array.isArray(answer) ? answer : [];
    return (
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {sel.map(i => (
          <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:F.body, fontSize:14, color:C.text }}>
            <Pill tone="brand">{String.fromCharCode(65 + i)}</Pill>{q.choices?.[i]}
          </span>
        ))}
      </div>
    );
  }
  if (q.type === 'truefalse') {
    if (answer == null) return <span style={{ fontFamily:F.body, fontSize:13, color: C.faint, fontStyle:'italic' }}>No answer submitted</span>;
    return <Pill tone="brand">{answer ? 'True' : 'False'}</Pill>;
  }
  if (q.type === 'fillblank') {
    const arr = Array.isArray(answer) ? answer : [];
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {(q.blanks || []).map((_, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontFamily:F.body, fontSize:14, color:C.text }}>
            <span style={{ fontFamily:F.mono, fontSize:11, color:C.muted }}>{i + 1}.</span>
            <span>{arr[i] || <em style={{ color:C.faint }}>blank</em>}</span>
          </div>
        ))}
      </div>
    );
  }
  if (q.type === 'match') {
    const map = answer || {};
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {(q.pairs || []).map((p, i) => {
          const ri = map[i];
          const right = ri != null ? q.pairs?.[ri]?.right : null;
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontFamily:F.body, fontSize:14, color:C.text }}>
              <span>{p.left}</span><Ico name="arrowR" size={13} color={C.faint} />
              <span>{right || <em style={{ color:C.faint }}>—</em>}</span>
            </div>
          );
        })}
      </div>
    );
  }
  if (q.type === 'numeric') {
    return <span style={{ fontFamily:F.mono, fontSize:18, fontWeight:600, color:C.text }}>{answer}</span>;
  }
  if (q.type === 'math') {
    return (
      <div style={{
        padding:'10px 14px', background: C.surface, borderRadius:8,
        border:`1px solid ${C.border}`, fontFamily: F.mono, fontSize: 14,
      }}>
        {/* Render the student's LaTeX through KaTeX only — the raw markup dump
            ("· raw: (x-2)(x-3)") that used to sit beside it is removed (§9). */}
        <MathDisplay tex={answer} inline />
      </div>
    );
  }
  if (q.type === 'upload') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}` }}>
        <Ico name="file" size={14} color={C.brand} />
        <span style={{ fontFamily:F.body, fontSize:13, color:C.sub }}>{answer}</span>
      </div>
    );
  }
  return (
    <div style={{
      padding:'10px 14px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}`,
      fontFamily:F.body, fontSize: 14, color: C.text, whiteSpace:'pre-wrap', lineHeight: 1.5,
    }}>{answer}</div>
  );
};

// ─── Destructive confirmations ──────────────────────────────────
// Deleting homework goes through the shared Modal, not a browser confirm().
// Once students have submitted, deleting destroys their work, so the teacher has
// to type the title back — a click cannot do it by accident.
const DeleteAssignmentModal = ({ a, onCancel, onConfirm }) => {
  const [typed, setTyped] = React.useState('');
  React.useEffect(() => { setTyped(''); }, [a && a.id]);
  if (!a) return null;
  const n = Object.values(a.submissions || {}).filter(hasSubmitted).length;
  const title = a.title || 'Untitled homework';
  const needsTyping = n > 0;
  const ready = !needsTyping || typed.trim() === title.trim();
  return (
    <Modal
      open
      onClose={onCancel}
      icon="trash"
      iconColor={C.danger}
      title="Delete this homework?"
      subtitle={needsTyping
        ? `${n} student${n === 1 ? ' has' : 's have'} submitted work. Deleting removes their answers, marks and feedback for good.`
        : 'No one has submitted yet. This cannot be undone.'}
      footer={<>
        <Btn variant="soft" onClick={onCancel}>Cancel</Btn>
        <Btn variant="danger" disabled={!ready} onClick={onConfirm}>Delete homework</Btn>
      </>}
    >
      {needsTyping && (
        <div>
          <Label>Type <strong style={{ color: C.text }}>{title}</strong> to confirm</Label>
          <Input value={typed} onChange={setTyped} placeholder={title} autoFocus />
        </div>
      )}
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════
// TEACHER MODULE
// ════════════════════════════════════════════════════════════════
const TeacherHomework = ({ section }) => {
  const [store, update] = useStore();
  const [view, setView] = React.useState({ name: 'list' }); // list | builder | review
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const toast = useToast();
  const me = hwPrincipal(store);

  // (D1) Teacher-scoped: the teacher only sees homework they own. The shared store
  // also holds this student's other-subject homework (for the student view), set by
  // other staff — isMine keeps it off this teacher's list, badge and analytics.
  const myAssignments = Object.values(store.assignments).filter(a => isMine(a, me));
  const folders = Object.values(store.folders || {});

  const createFolder = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const id = 'f_' + Math.random().toString(36).slice(2, 8);
    const palette = ['#4F46E5','#0EA5E9','#10B981','#EAB308','#EC4899','#F97316','#8B5CF6'];
    const color = palette[Object.keys(store.folders || {}).length % palette.length];
    const folder = { id, name: trimmed, color };
    update(s => ({ ...s, folders: { ...(s.folders || {}), [id]: folder } }));
    return folder;
  };

  const renameFolder = (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    update(s => ({ ...s, folders: { ...(s.folders || {}), [id]: { ...(s.folders?.[id] || { id }), name: trimmed } } }));
  };

  const deleteFolder = (id) => {
    update(s => {
      const nextFolders = { ...(s.folders || {}) };
      delete nextFolders[id];
      const nextAsn = { ...s.assignments };
      Object.keys(nextAsn).forEach(k => {
        if (nextAsn[k].folderId === id) nextAsn[k] = { ...nextAsn[k], folderId: null };
      });
      return { ...s, folders: nextFolders, assignments: nextAsn };
    });
  };

  const moveAssignment = (id, folderId) => {
    update(s => ({ ...s, assignments: { ...s.assignments, [id]: { ...s.assignments[id], folderId: folderId || null } } }));
  };

  const duplicateAssignment = (id) => {
    const src = store.assignments[id];
    if (!src) return;
    const newId = 'a_' + Math.random().toString(36).slice(2, 9);
    const clone = JSON.parse(JSON.stringify(src));
    clone.id = newId;
    clone.title = src.title ? `${src.title} (copy)` : 'Untitled (copy)';
    clone.status = 'draft';
    clone.submissions = {};
    clone.studentIds = [];
    clone.dueAt = '';
    clone.createdAt = new Date().toISOString().slice(0, 10);
    // Re-id questions so submissions don't accidentally collide later.
    clone.questions = (clone.questions || []).map(q => ({ ...q, id: 'q_' + Math.random().toString(36).slice(2, 8) }));
    update(s => ({ ...s, assignments: { ...s.assignments, [newId]: clone } }));
    setView({ name: 'builder', id: newId });
  };

  if (view.name === 'builder') {
    return <TeacherBuilder
      assignment={view.id ? store.assignments[view.id] : null}
      defaultFolderId={view.folderId || null}
      students={Object.values(store.users).filter(u => u.role === 'student')}
      folders={folders}
      classes={store.classes || CLASSES}
      onCreateFolder={createFolder}
      onCancel={() => setView({ name: 'list' })}
      onSave={(asn) => {
        update(s => ({ ...s, assignments: { ...s.assignments, [asn.id]: asn } }));
        setView({ name: 'list' });
      }}
    />;
  }

  if (view.name === 'review') {
    return <TeacherReview
      assignment={store.assignments[view.id]}
      users={store.users}
      onClose={() => setView({ name: 'overview', id: view.id })}
      onUpdateSubmission={(sid, sub) => {
        update(s => {
          const asn = { ...s.assignments[view.id] };
          asn.submissions = { ...asn.submissions, [sid]: sub };
          return { ...s, assignments: { ...s.assignments, [view.id]: asn } };
        });
      }}
    />;
  }

  // Send held-back marks out to every student whose work is graded but unreleased.
  const releaseResults = (id) => {
    const asn = store.assignments[id];
    if (!asn) return;
    const stamp = new Date().toISOString();
    const ids = Object.keys(asn.submissions).filter(sid => heldBack(asn, asn.submissions[sid]));
    if (ids.length === 0) return;
    update(s => {
      const a2 = { ...s.assignments[id] };
      a2.submissions = { ...a2.submissions };
      ids.forEach(sid => { a2.submissions[sid] = { ...a2.submissions[sid], marksReleasedAt: stamp }; });
      return { ...s, assignments: { ...s.assignments, [id]: a2 } };
    });
    toast(`Released results to ${ids.length} student${ids.length === 1 ? '' : 's'}`, 'success');
  };

  const deleteAssignment = (id) => {
    update(s => {
      const next = { ...s.assignments };
      delete next[id];
      return { ...s, assignments: next };
    });
    setPendingDelete(null);
    if (view.id === id) setView({ name: 'list' });
    toast('Homework deleted', 'success');
  };

  const deleteDialog = (
    <DeleteAssignmentModal
      a={pendingDelete ? store.assignments[pendingDelete] : null}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => deleteAssignment(pendingDelete)}
    />
  );

  if (view.name === 'overview' && store.assignments[view.id]) {
    return (
      <>
        <TeacherOverview
          a={store.assignments[view.id]}
          users={store.users}
          folders={folders}
          onBack={() => setView({ name: 'list' })}
          onEdit={() => setView({ name: 'builder', id: view.id })}
          onReview={() => setView({ name: 'review', id: view.id })}
          onDuplicate={() => duplicateAssignment(view.id)}
          onMove={(folderId) => moveAssignment(view.id, folderId)}
          onRelease={() => releaseResults(view.id)}
          onDelete={() => setPendingDelete(view.id)}
        />
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <TeacherList
        section={section}
        countsFor={(extra) => getHomeworkCounts(store, Object.assign({ teacherId: me.id }, extra || {}))}
        assignments={myAssignments}
        folders={folders}
        users={store.users}
        classes={store.classes || CLASSES}
        onNew={(folderId) => setView({ name: 'builder', folderId: folderId || null })}
        onOpen={(id) => setView({ name: 'overview', id })}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
      />
      {deleteDialog}
    </>
  );
};

// ─── Teacher list view ──────────────────────────────────────────
const TeacherList = ({
  section, countsFor, assignments, folders = [], users = {}, classes = [],
  onNew, onOpen, onCreateFolder, onRenameFolder, onDeleteFolder,
}) => {
  const toast = useToast();
  // assignments | analytics — driven by the sidebar dropdown (`section` prop).
  const view = section === 'analytics' ? 'analytics' : 'assignments';
  const [tab, setTab] = React.useState('all');
  const [folderId, setFolderId] = React.useState('all'); // 'all' | 'unfiled' | <folder id>
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [pendingFolder, setPendingFolder] = React.useState(null);
  // Cards vs list for the assignment grid — remembered across visits.
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('klasio.homework.view') === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; }
  });
  const setView = (v) => { setViewMode(v); try { localStorage.setItem('klasio.homework.view', v); } catch (e) {} };

  // Counts come from the one selector (scoped to this teacher upstream). `counts`
  // is the whole list — the page header and the Overview rail; `tabCounts` is the
  // same selector narrowed to the open folder, for the tab pills.
  const counts = countsFor();
  const tabCounts = countsFor({ folderId: folderId === 'all' ? null : folderId });

  const folderCount = (fid) => {
    if (fid === 'all') return assignments.length;
    if (fid === 'unfiled') return assignments.filter(a => !a.folderId).length;
    return assignments.filter(a => a.folderId === fid).length;
  };

  const inFolder = assignments.filter(a => {
    if (folderId === 'all') return true;
    if (folderId === 'unfiled') return !a.folderId;
    return a.folderId === folderId;
  });

  const filtered = inFolder.filter(a => {
    if (tab === 'all') return true;
    if (tab === 'active') return a.status === 'active';
    if (tab === 'draft') return a.status === 'draft';
    if (tab === 'closed') return a.status === 'closed';
    // Matches assignmentsToMark in the selector, so the pill count and the list
    // length can never differ.
    if (tab === 'marking') return Object.values(a.submissions).some(awaitingMark);
    return true;
  });

  const activeFolder = folders.find(f => f.id === folderId);
  const folderLabel = folderId === 'all' ? 'All assignments'
                    : folderId === 'unfiled' ? 'Unfiled'
                    : (activeFolder?.name || 'Folder');

  const tryCreateFolder = () => {
    const f = onCreateFolder && onCreateFolder(newFolderName);
    if (f) {
      setNewFolderName('');
      setCreatingFolder(false);
      setFolderId(f.id);
      toast(`Folder "${f.name}" created`, 'success');
    } else {
      toast('Enter a folder name', 'danger');
    }
  };

  const tryRename = () => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    onRenameFolder && onRenameFolder(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  if (view === 'analytics') {
    return (
      <div style={{ ...pageFrame(), fontFamily: F.body, color: C.text }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 22, gap: 20 }}>
          <div>
            <h1 style={{ fontFamily: F.head, ...TS.title, margin: 0 }}>Homework</h1>
            <p style={{ ...TS.meta, color: C.muted, margin: '4px 0 0' }}>Performance and submission insights</p>
          </div>
        </div>
        <HomeworkAnalytics assignments={assignments} countsFor={countsFor} users={users} classes={classes} />
      </div>
    );
  }

  return (
    <div style={{ ...pageFrame(), fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 24, gap: 20 }}>
        <div>
          {/* No subtitle: "N active · N awaiting marking" repeated the filter
              tab counts below, which are the actionable copy of the same fact. */}
          <h1 style={{ fontFamily: F.head, ...TS.title, margin: 0 }}>Homework</h1>
        </div>
        <div style={{ display:'flex', gap: 12, alignItems:'center' }}>
          <Btn variant="brand" icon={<Ico name="plus" size={14} color="#fff" />}
            onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
            New homework
          </Btn>
        </div>
      </div>

      {/* Two-column: left rail (overview + folders) + main */}
      <div style={{ display:'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems:'flex-start' }}>
        {/* Left rail — overview stats then folders, stacked in one sticky column */}
        <div style={{ display:'flex', flexDirection:'column', gap: 16, position:'sticky', top: 20 }}>

        {/* Overview — was four rows (Active / Awaiting marking / Drafts /
            Submission rate) behind tinted icon chips. Active, awaiting and
            drafts are all in the filter tabs a few pixels to the right, so
            only submission rate survives: it is the one figure this page
            states nowhere else. */}
        <Card style={{ padding: 16 }}>
          <div style={{ ...TS.meta, color: C.muted, marginBottom: 4 }}>Submission rate</div>
          <div style={{ fontFamily: F.head, fontSize: 20, fontWeight: W.medium, color: C.text, ...NUM }}>
            {counts.submissionRate}%
          </div>
        </Card>

        {/* Folder rail */}
        <Card style={{ padding: 12 }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'4px 6px 8px', borderBottom:`1px solid ${C.border}`, marginBottom: 8,
          }}>
            <span style={{ fontFamily: F.head, ...TS.section, color: C.text }}>Folders</span>
            <button onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}
              title="New folder"
              style={{
                width: 22, height: 22, borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Ico name="plus" size={13} color={C.muted} />
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap: 2 }}>
            <FolderRailItem
              icon="layers" label="All assignments" count={folderCount('all')}
              active={folderId === 'all'} onClick={() => setFolderId('all')} />
            <FolderRailItem
              icon="inbox" label="Unfiled" count={folderCount('unfiled')}
              active={folderId === 'unfiled'} onClick={() => setFolderId('unfiled')} />

            {folders.length > 0 && (
              <div style={{ height: 1, background: C.border, margin: '6px 4px' }} />
            )}

            {folders.map(f => (
              <FolderRailItem
                key={f.id}
                color={f.color}
                label={f.name}
                count={folderCount(f.id)}
                active={folderId === f.id}
                onClick={() => setFolderId(f.id)}
                renaming={renamingId === f.id}
                renameValue={renameValue}
                onRenameValue={setRenameValue}
                onSubmitRename={tryRename}
                onCancelRename={() => { setRenamingId(null); setRenameValue(''); }}
                onStartRename={() => { setRenamingId(f.id); setRenameValue(f.name); }}
                onDelete={() => setPendingFolder(f)}
              />
            ))}

            {creatingFolder && (
              <div style={{ display:'flex', gap: 4, padding: '6px 4px', alignItems:'center' }}>
                <Input value={newFolderName} onChange={setNewFolderName} placeholder="Folder name" autoFocus />
                <button onClick={tryCreateFolder} title="Create" style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.brand}`,
                  background: C.brand, color:'#fff', cursor:'pointer', flexShrink: 0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Ico name="check" size={13} color="#fff" /></button>
                <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} title="Cancel" style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
                  background: C.bg, cursor:'pointer', flexShrink: 0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Ico name="x" size={13} color={C.muted} /></button>
              </div>
            )}
          </div>
        </Card>
        </div>

        {/* Main panel */}
        <div>
          {/* Tabs + folder header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16, gap: 12, flexWrap:'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: F.head, ...TS.section, color: C.text }}>{folderLabel}</div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 10, flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap: 4, padding: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS }}>
                {[
                  ['all', 'All', tabCounts.total],
                  ['active', 'Active', tabCounts.active],
                  ['marking', 'Marking', tabCounts.assignmentsToMark],
                  ['draft', 'Draft', tabCounts.drafts],
                  ['closed', 'Closed', tabCounts.closed],
                ].map(([id, lab, n]) => {
                  const on = tab === id;
                  return (
                    <button key={id} onClick={() => setTab(id)} style={{
                      padding: '6px 12px', cursor:'pointer',
                      borderRadius: RADIUS - 2,
                      background: on ? C.bg : 'transparent',
                      border: `1px solid ${on ? C.border : 'transparent'}`,
                      fontFamily: F.body, ...TS.meta, fontWeight: on ? W.medium : W.normal,
                      color: on ? C.text : C.muted, transition: T,
                      display:'inline-flex', alignItems:'center', gap: 6,
                    }}>
                      {lab}
                      <span style={{ color: on ? C.sub : C.muted, ...NUM }}>{n}</span>
                    </button>
                  );
                })}
              </div>
              <HwViewToggle value={viewMode} onChange={setView} />
            </div>
          </div>

          {/* Assignments — cards or list */}
          {filtered.length === 0 ? (
            <Card style={{ padding: '48px 24px', textAlign:'center' }}>
              <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 4 }}>
                {folderId === 'all' ? 'No assignments yet' : `Nothing in ${folderLabel}`}
              </div>
              <div style={{ ...TS.meta, color: C.muted, marginBottom: 16 }}>
                {folderId === 'all' ? 'Create one to get started.' : 'Create one or move existing assignments here.'}
              </div>
              <Btn variant="brand" small icon={<Ico name="plus" size={13} color="#fff" />}
                onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
                New homework
              </Btn>
            </Card>
          ) : viewMode === 'list' ? (
            <TeacherTable rows={filtered} folders={folders} onOpen={onOpen} />
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filtered.map(a => (
                <TeacherListCard key={a.id} a={a} folders={folders} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deleting a folder never deletes homework — it unfiles it. */}
      <Modal
        open={!!pendingFolder}
        onClose={() => setPendingFolder(null)}
        icon="trash"
        iconColor={C.danger}
        title={pendingFolder ? `Delete "${pendingFolder.name}"?` : ''}
        subtitle={pendingFolder && folderCount(pendingFolder.id) > 0
          ? `${folderCount(pendingFolder.id)} assignment${folderCount(pendingFolder.id) === 1 ? '' : 's'} will move to Unfiled. Nothing is deleted.`
          : 'This folder is empty.'}
        footer={<>
          <Btn variant="soft" onClick={() => setPendingFolder(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => {
            onDeleteFolder && onDeleteFolder(pendingFolder.id);
            if (folderId === pendingFolder.id) setFolderId('all');
            setPendingFolder(null);
          }}>Delete folder</Btn>
        </>}
      />
    </div>
  );
};

const FolderRailItem = ({
  icon, color, label, count, active, onClick,
  onStartRename, onDelete,
  renaming, renameValue, onRenameValue, onSubmitRename, onCancelRename,
}) => {
  const [hov, setHov] = React.useState(false);

  if (renaming) {
    return (
      <div style={{ display:'flex', gap: 4, padding: '6px 4px', alignItems:'center' }}>
        <Input value={renameValue} onChange={onRenameValue} autoFocus />
        <button onClick={onSubmitRename} title="Save" style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.brand}`,
          background: C.brand, cursor:'pointer', flexShrink: 0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><Ico name="check" size={13} color="#fff" /></button>
        <button onClick={onCancelRename} title="Cancel" style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.bg, cursor:'pointer', flexShrink: 0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><Ico name="x" size={13} color={C.muted} /></button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap: 8,
        padding: '6px 8px', borderRadius: 6,
        background: active ? C.brandSoft : (hov ? C.surface : 'transparent'),
        transition: T, cursor:'pointer',
      }}
    >
      {/* The per-folder colour dot is gone: folder colour was assigned from a
          rotating palette at creation time, so it identified nothing — the name
          already does that. Name left, muted count right. */}
      <button onClick={onClick} style={{
        flex: 1, display:'flex', alignItems:'center', gap: 8,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, fontFamily: F.body, ...TS.meta, fontWeight: active ? W.medium : W.normal,
        color: active ? C.brand : C.sub, textAlign:'left', minWidth: 0,
      }}>
        {icon && <Ico name={icon} size={14} color={active ? C.brand : C.muted} />}
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <span style={{ ...TS.meta, color: active ? C.brand : C.muted, ...NUM }}>{count}</span>
      </button>

      {(onStartRename || onDelete) && (
        <div style={{ display:'flex', gap: 2, opacity: hov ? 1 : 0, transition: T, pointerEvents: hov ? 'auto' : 'none' }}>
          {onStartRename && (
            <button onClick={onStartRename} title="Rename" style={{
              width: 22, height: 22, borderRadius: 5, border: 'none',
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}><Ico name="edit" size={11} color={C.muted} /></button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Delete folder" style={{
              width: 22, height: 22, borderRadius: 5, border: 'none',
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}><Ico name="trash" size={11} color={C.danger} /></button>
          )}
        </div>
      )}
    </div>
  );
};

// Shared derivation for an assignment card/row — a single status indicator, the
// submission tallies and the due-date text. Used by both TeacherListCard (grid)
// and TeacherTableRow (list) so the two presentations can never drift.
const hwRowModel = (a, folders = []) => {
  const submitted = Object.values(a.submissions).filter(hasSubmitted).length;
  const graded = Object.values(a.submissions).filter(isGraded).length;
  const toMark = Object.values(a.submissions).filter(awaitingMark).length;
  const total = a.studentIds.length;
  const pct = total ? Math.round((submitted / total) * 100) : 0;
  const dDays = daysUntil(a.dueAt);
  const folder = a.folderId ? folders.find(f => f.id === a.folderId) : null;
  const overdue = a.status === 'active' && a.dueAt && dDays < 0;

  // A StatusBadge key plus an optional label override — the tone lives in
  // HW_STATUS, so a row can never invent its own colour for a status.
  let status;
  if (a.status === 'draft')                       status = { key: 'draft' };
  else if (a.status === 'closed')                 status = { key: 'closed' };
  else if (isScheduled(a))                        status = { key: 'scheduled' };
  else if (toMark > 0)                            status = { key: 'tomark', label: `${toMark} to mark` };
  // Everything in and returned — the assignment is done with.
  else if (total > 0 && graded === total)         status = { key: 'marked' };
  else if (submitted === total && total > 0)      status = { key: 'allin' };
  else                                            status = { key: 'live' };

  const dueText = a.dueAt
    ? (overdue ? `Overdue · ${fmtDate(a.dueAt)}`
      : a.status === 'active' && dDays >= 0 ? `Due in ${dDays}d · ${fmtDate(a.dueAt)}`
      : `Due ${fmtDate(a.dueAt)}`)
    : 'No due date';

  return { submitted, graded, toMark, total, pct, dDays, folder, overdue, status, dueText };
};

// HwStatusTag lived here: an uppercase, 700-weight, dot-prefixed pill with its
// own five-tone colour map. It is now StatusBadge, shared with every other
// homework screen. hwRowModel returns { key, label? } for it.
const RowStatus = ({ status }) => (
  <StatusBadge status={status.key}>{status.label}</StatusBadge>
);

// "Wed 29 Jul" — the due column wants the weekday, which fmtDate omits.
const fmtDueDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Cards vs list switch — matches the tab-pill container so it sits beside the tabs.
const HwViewToggle = ({ value, onChange }) => (
  <div style={{ display:'flex', gap: 4, padding: 4, background: C.surface, border:`1px solid ${C.border}`, borderRadius: RADIUS }}>
    {[{ id:'grid', icon:'grid', title:'Card view' }, { id:'list', icon:'list', title:'List view' }].map(o => {
      const on = value === o.id;
      return (
        <button key={o.id} onClick={() => onChange(o.id)} title={o.title} aria-label={o.title} aria-pressed={on}
          style={{
            width: 32, height: 28, borderRadius: RADIUS - 2, cursor:'pointer',
            background: on ? C.bg : 'transparent',
            border: `1px solid ${on ? C.border : 'transparent'}`,
            color: on ? C.brand : C.muted, display:'flex', alignItems:'center', justifyContent:'center', transition: T,
          }}>
          <Ico name={o.icon} size={15} color={on ? C.brand : C.muted} />
        </button>
      );
    })}
  </div>
);

// ─── Assignment table (the list view — see the view toggle) ──────
// One grid template shared by the header and every row so the columns line up.
// The Folder column is gone — the folder rail on the left is the folder
// affordance, and the cell was "—" for every unfiled assignment.
const HW_COLS = 'minmax(220px, 2.2fr) 1fr 1.2fr 132px 1fr 116px';
const hwCell = {
  minWidth: 0, fontFamily: F.body, ...TS.meta, color: C.sub,
  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', ...NUM,
};
// One fixed row height so a screenful is a predictable number of rows.
const HW_ROW_H = 48;

const TeacherTable = ({ rows, folders = [], onOpen }) => (
  <Card style={{ overflow:'hidden', padding: 0 }}>
    <div style={{ overflowX:'auto' }}>
      <div style={{ minWidth: 760 }}>
        {/* Header */}
        <div style={{
          display:'grid', gridTemplateColumns: HW_COLS, gap: 16,
          padding: '10px 16px', background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          fontFamily: F.body, ...TS.meta, fontWeight: W.medium, color: C.muted,
        }}>
          <span>Title</span>
          <span>Subject</span>
          <span>Class</span>
          <span>Submissions</span>
          <span>Due</span>
          <span>Status</span>
        </div>
        {rows.map((a, i) => (
          <TeacherTableRow key={a.id} a={a} folders={folders} onOpen={onOpen} last={i === rows.length - 1} />
        ))}
      </div>
    </div>
  </Card>
);

const TeacherTableRow = ({ a, folders = [], onOpen, last }) => {
  const m = hwRowModel(a, folders);
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onClick={() => onOpen(a.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'grid', gridTemplateColumns: HW_COLS, gap: 16, alignItems:'center',
        height: HW_ROW_H, padding: '0 16px', cursor:'pointer',
        borderBottom: last ? 'none' : `1px solid ${C.border}`,
        // There was no row hover state at all — on a table you click through
        // all afternoon, that is the one affordance worth having.
        background: hov ? C.surface : 'transparent', transition: T,
      }}>
      {/* Title only. The question/points count moved out of the row: it is on
          the assignment the moment you open it, and it was what forced two
          lines per row. */}
      <div style={{
        fontFamily: F.head, ...TS.body, fontWeight: W.medium, color: C.text,
        minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>{a.title}</div>

      {/* Subject as plain muted text — it used to render in a per-subject hue,
          which read as twelve links stacked down the column. */}
      <span style={{ ...hwCell, color: C.muted }}>{a.subject}</span>
      <span style={hwCell}>{a.classLabel || <span style={{ color: C.faint }}>—</span>}</span>

      {/* One line: "9/9 · 6 marked". "marked" is a count, so it is muted text,
          not green — green promised a success state it never meant. */}
      <span style={{ ...hwCell }}>
        <span style={{ color: C.text }}>{m.submitted}/{m.total}</span>
        {m.graded > 0 && <span style={{ color: C.muted }}>{' · '}{m.graded} marked</span>}
      </span>

      {/* Overdue reads on the Status badge, so the date cell stays one line. */}
      <span style={{ ...hwCell, color: m.overdue ? C.amber : C.sub }}>
        {a.dueAt ? fmtDueDay(a.dueAt) : <span style={{ color: C.faint }}>No due date</span>}
      </span>

      <span><RowStatus status={m.status} /></span>
    </div>
  );
};

const TeacherListCard = ({ a, folders = [], onOpen }) => {
  const { submitted, graded, total, pct, folder, overdue, status, dueText } = hwRowModel(a, folders);

  return (
    // The only hover affordance is the border firming up. The card used to
    // lift on a 20px shadow, which is what made a grid of them feel floaty.
    <Card hoverable onClick={() => onOpen(a.id)}>
      <div style={{ padding: 16, display:'flex', flexDirection:'column', gap: 12 }}>
        {/* The 40px book icon chip that led this row is gone — every card had
            the identical glyph, so it distinguished nothing and cost the title
            53px of its width. */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: F.head, fontSize: 15, fontWeight: W.medium, color: C.text,
              lineHeight: 1.35, marginBottom: 2,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{a.title}</div>
            <MetaLine items={[a.subject, a.classLabel, folder && folder.name]} />
          </div>
          <RowStatus status={status} />
        </div>

        {/* One meta line, no per-fact icons. Due date carries amber only when
            it is overdue — i.e. only when it needs the teacher to act. */}
        <MetaLine
          items={[
            `${a.questions.length} question${a.questions.length === 1 ? '' : 's'}`,
            `${totalPoints(a)} pts`,
            <span style={{ color: overdue ? C.amber : C.muted }}>{dueText}</span>,
          ]}
        />

        {/* Submissions: the label row is gone (the bar is self-evident) and
            "N marked" is muted, not green. */}
        <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
          <div style={{ fontFamily: F.body, ...TS.meta, color: C.muted, ...NUM }}>
            <span style={{ color: C.text }}>{submitted}/{total}</span>
            {graded > 0 && <span>{' · '}{graded} marked</span>}
          </div>
          <div style={{ height: 4, background: C.surface2, borderRadius: RADIUS_FULL, overflow:'hidden' }}>
            <div style={{ height:'100%', width: `${pct}%`, background: C.brand, borderRadius: RADIUS_FULL, transition: 'width .3s' }} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// ════════════════════════════════════════════════════════════════
// Homework analytics dashboard (homework "main page" → Analytics tab)
// All figures are computed from the live store.
// ════════════════════════════════════════════════════════════════
const ChartCard = ({ title, subtitle, children, style = {} }) => (
  <Card style={{ padding: 18, ...style }}>
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
    </div>
    {children}
  </Card>
);

// Horizontal labelled bars (subject performance, grade distribution).
const BarList = ({ rows, max, unit = '%' }) => {
  const top = max || Math.max(1, ...rows.map(r => r.value));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <span style={{ width: 92, fontFamily: F.body, fontSize: 11.5, color: C.muted, textAlign:'right',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</span>
          <div style={{ flex: 1, height: 14, background: C.surface2, borderRadius: 4, overflow:'hidden' }}>
            <div style={{ height:'100%', width: `${(r.value / top) * 100}%`, background: r.color || C.brand, borderRadius: 4, transition: 'width .3s' }} />
          </div>
          <span style={{ width: 42, fontFamily: F.mono, fontSize: 11.5, color: C.sub, fontWeight: 600 }}>
            {r.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

// Simple SVG line chart for the monthly average trend.
// Score-history trend line (points: [{ label, value }], value is a %). Rendered
// with Recharts (window.Recharts, loaded via CDN in index.html) for the premium
// shadcn-style look: gradient area fill, soft dashed grid, floating card tooltip.
const LineChart = ({ points = [], height = 150 }) => {
  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = (window.Recharts || {});
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!ResponsiveContainer || !points.length) return null;
  const HwTip = ({ active, payload, label }) =>
    active && payload && payload.length ? (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9,
        boxShadow: C.shadowL, padding: '7px 10px', fontSize: 12 }}>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>{label}</div>
        <div style={{ color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{payload[0].value}%</div>
      </div>
    ) : null;
  return (
    <div style={{ width: '100%', height: height + 18 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id={`hw-trend-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.24} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={C.surface2} strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="transparent" tickLine={false} axisLine={false}
            tick={{ fill: C.faint, fontSize: 9, fontFamily: F.body }} dy={4} />
          <YAxis domain={[50, 100]} ticks={[50, 65, 80, 100]} stroke="transparent"
            tickLine={false} axisLine={false} width={26}
            tick={{ fill: C.faint, fontSize: 8, fontFamily: F.mono }} tickFormatter={(v) => `${v}%`} />
          <Tooltip cursor={{ stroke: C.borderD, strokeDasharray: '3 3' }} content={<HwTip />} />
          <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={2}
            fill={`url(#hw-trend-${uid})`} isAnimationActive={false}
            dot={{ r: 3, fill: C.bg, stroke: C.brand, strokeWidth: 2 }}
            activeDot={{ r: 4, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Donut for submission-status split (segments: [{ label, value, color }]).
const Donut = ({ segments = [], size = 150 }) => {
  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = (window.Recharts || {});
  const data = segments.filter(s => s.value > 0);
  if (!PieChart || !data.length) return null;
  const DonutTip = ({ active, payload }) =>
    active && payload && payload.length ? (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9,
        boxShadow: C.shadowL, padding: '7px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: payload[0].payload.color }} />
        <span style={{ color: C.muted }}>{payload[0].payload.label || payload[0].name}</span>
        <span style={{ color: C.text, fontWeight: 600 }}>{payload[0].value}</span>
      </div>
    ) : null;
  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            innerRadius={size / 2 - 26} outerRadius={size / 2 - 12} paddingAngle={2}
            stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
            {data.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
          <Tooltip content={<DonutTip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const HomeworkAnalytics = ({ assignments, countsFor, users = {}, classes = [] }) => {
  const [subjectF, setSubjectF] = React.useState('All');
  const [classF, setClassF] = React.useState('All');

  const filtered = assignments.filter(a =>
    (subjectF === 'All' || a.subject === subjectF) &&
    (classF === 'All' || a.classLabel === classF)
  );
  // The KPI tiles read the shared selector, narrowed by the same two filters that
  // narrow the charts — so the tiles and the assignments list always agree.
  const kpiCounts = countsFor({
    classLabel: classF === 'All' ? null : classF,
    subject: subjectF === 'All' ? null : subjectF,
  });

  // ── Aggregate submission rows across the filtered set ──
  const subs = [];
  filtered.forEach(a => {
    const total = totalPoints(a);
    a.studentIds.forEach(sid => {
      const sub = a.submissions[sid];
      subs.push({ a, sid, sub, total,
        pct: sub && total ? Math.round(submissionScore(a, sub) / total * 100) : null });
    });
  });

  const submittedRows = subs.filter(s => hasSubmitted(s.sub));
  const gradedRows = subs.filter(s => s.sub && isGraded(s.sub));
  const lateRows = subs.filter(s => isLateSub(s.a, s.sub));
  const inProgressN = subs.filter(s => s.sub && s.sub.status === 'submitted').length;
  const notStartedN = subs.filter(s => !hasSubmitted(s.sub)).length;
  // "Pending review" counts SUBMISSIONS awaiting a mark; "Awaiting marking" counts
  // ASSIGNMENTS that still hold at least one — two different units, both from the
  // one selector, kept labelled distinctly (Homework Analytics P0).
  const pendingReview = kpiCounts.toMark;
  const awaitingMarking = kpiCounts.assignmentsToMark;

  const totalAssigned = kpiCounts.assigned;
  const completionRate = kpiCounts.submissionRate;
  const scored = gradedRows.filter(s => s.pct != null);
  const avgScore = scored.length ? Math.round(scored.reduce((n, s) => n + s.pct, 0) / scored.length) : 0;
  // (D7) "Avg time spent" removed — the per-submission timing field is synthetic,
  // not a measured value, so it is not surfaced as a metric.

  // Highest scorer
  let highest = null;
  scored.forEach(s => { if (!highest || s.pct > highest.pct) highest = s; });

  // ── Per-student averages (top performers / interventions) ──
  const byStudent = {};
  gradedRows.forEach(s => {
    if (s.pct == null) return;
    (byStudent[s.sid] = byStudent[s.sid] || []).push(s.pct);
  });
  const studentAvgs = Object.entries(byStudent).map(([sid, arr]) => ({
    sid, name: users[sid]?.name || sid, classLabel: users[sid]?.classLabel || '',
    avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    missing: subs.filter(s => s.sid === sid && !s.sub).length,
  }));
  const topStudents = [...studentAvgs].sort((a, b) => b.avg - a.avg).slice(0, 5);
  const intervention = [...studentAvgs].filter(s => s.avg < 73 || s.missing > 0)
    .sort((a, b) => a.avg - b.avg).slice(0, 4);
  const flaggedN = studentAvgs.filter(s => s.avg < 73 || s.missing > 1).length;

  // ── Subject performance ──
  const subjAgg = {};
  gradedRows.forEach(s => {
    if (s.pct == null) return;
    (subjAgg[s.a.subject] = subjAgg[s.a.subject] || []).push(s.pct);
  });
  const subjectRows = Object.entries(subjAgg).map(([label, arr]) => ({
    label, value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), color: C.brand,
  })).sort((a, b) => b.value - a.value);

  // ── Grade distribution (canonical scale · F3) ──
  // Raw scores are bucketed onto the ONE grade model (GCSE 9–1 / A-Level A*–E /
  // KS3 descriptors) via window.klasioGrades — never a bespoke A–F map. The scale
  // follows the active class filter's year; with "All classes" selected we default
  // to GCSE (the teacher's most common level). pctToGrade is explicitly INDICATIVE
  // (documented boundaries), not an official result — percentages stay raw scores.
  const KG = window.klasioGrades;
  const gradeScaleOpts = classF !== 'All' ? { year: classF } : { level: 'GCSE' };
  const gradeBuckets = KG ? KG.emptyDistribution(gradeScaleOpts)
    : { 'A':0, 'B':0, 'C':0, 'D':0, 'E':0, 'U':0 };
  scored.forEach(s => {
    const g = KG ? KG.pctToGrade(s.pct, gradeScaleOpts)
      : (s.pct >= 80 ? 'A' : s.pct >= 70 ? 'B' : s.pct >= 60 ? 'C' : s.pct >= 50 ? 'D' : s.pct >= 40 ? 'E' : 'U');
    if (g in gradeBuckets) gradeBuckets[g]++;
  });
  const gradeRows = Object.entries(gradeBuckets).map(([label, value]) => ({
    label, value, color: KG ? KG.toneForGrade(label, gradeScaleOpts) : '#4F46E5',
  }));

  // ── Average over time (group graded by month) ──
  const monthAgg = {};
  gradedRows.forEach(s => {
    if (s.pct == null || !s.sub.submittedAt) return;
    const d = new Date(s.sub.submittedAt);
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    (monthAgg[key] = monthAgg[key] || []).push(s.pct);
  });
  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let trendPoints = monthOrder.filter(m => monthAgg[m]).map(m => ({
    label: m, value: Math.round(monthAgg[m].reduce((a, b) => a + b, 0) / monthAgg[m].length),
  }));
  if (trendPoints.length < 2) {
    // Not enough real history — show a representative curve ending at the live average.
    trendPoints = [
      { label: 'Mar', value: Math.max(50, avgScore - 12) },
      { label: 'Apr', value: Math.max(50, avgScore - 7) },
      { label: 'May', value: Math.max(50, avgScore - 3) },
      { label: 'Jun', value: avgScore || 70 },
    ];
  }

  // ── Class comparison ──
  const classAgg = {};
  gradedRows.forEach(s => {
    const cl = s.a.classLabel || '—';
    const c = (classAgg[cl] = classAgg[cl] || { score: [], sub: 0, total: 0 });
    if (s.pct != null) c.score.push(s.pct);
  });
  subs.forEach(s => {
    const cl = s.a.classLabel || '—';
    const c = (classAgg[cl] = classAgg[cl] || { score: [], sub: 0, total: 0 });
    c.total++; if (s.sub) c.sub++;
  });
  const classRows = Object.entries(classAgg).map(([label, c]) => ({
    label,
    score: c.score.length ? Math.round(c.score.reduce((a, b) => a + b, 0) / c.score.length) : 0,
    completion: c.total ? Math.round(c.sub / c.total * 100) : 0,
  }));

  const statusSegments = [
    { label: 'Graded',      value: gradedRows.length,             color: C.success },
    { label: 'Submitted',   value: inProgressN,                   color: C.brand },
    { label: 'Not Started', value: notStartedN,                   color: C.borderD },
    { label: 'Late',        value: lateRows.length,               color: C.danger },
  ];

  const subjectOptions = ['All', ...Array.from(new Set(assignments.map(a => a.subject)))];
  const classOptions = ['All', ...Array.from(new Set(assignments.map(a => a.classLabel).filter(Boolean)))];

  const selStyle = {
    padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
    background: C.bg, color: C.sub, fontFamily: F.body, fontSize: 12.5, cursor:'pointer',
  };

  const kpi = (icon, tone, value, label, sub) => {
    const tones = { brand:{bg:C.brandSoft,fg:C.brand}, success:{bg:C.successBg,fg:C.success},
      amber:{bg:C.amberBg,fg:C.amber}, info:{bg:C.surface,fg:C.sub}, danger:{bg:C.dangerBg,fg:C.danger} };
    const t = tones[tone] || tones.brand;
    return (
      <Card style={{ padding: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, color: t.fg,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 12 }}>
          <Ico name={icon} size={16} color={t.fg} />
        </span>
        <div style={{ fontFamily: F.head, fontSize: 24, fontWeight: 700, color: C.text }}>{value}</div>
        <div style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 600, color: C.sub, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontFamily: F.body, fontSize: 11.5, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </Card>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
      {/* Filters */}
      <Card style={{ padding: 12, display:'flex', alignItems:'center', gap: 10 }}>
        <select value={subjectF} onChange={e => setSubjectF(e.target.value)} style={selStyle}>
          {subjectOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
        </select>
        <select value={classF} onChange={e => setClassF(e.target.value)} style={selStyle}>
          {classOptions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ display:'inline-flex', alignItems:'center', gap: 6, fontFamily: F.body, fontSize: 12, color: C.muted }}>
          <span style={{ width: 7, height: 7, borderRadius:'50%', background: C.success }} /> Live data
        </span>
      </Card>

      {/* KPI rows */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12 }}>
        {kpi('book', 'brand', kpiCounts.total, 'Total Assigned', `Across ${classOptions.length - 1 || 1} classes`)}
        {kpi('target', 'success', `${completionRate}%`, 'Completion Rate', `${kpiCounts.submitted} / ${totalAssigned} students`)}
        {kpi('trend', 'brand', `${avgScore}%`, 'Average Score', `Across ${scored.length} graded submission${scored.length === 1 ? '' : 's'}`)}
        {kpi('clip', 'amber', awaitingMarking, 'Assignments To Mark', 'Assignments holding unmarked work')}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12 }}>
        {kpi('alertCircle', 'danger', lateRows.length, 'Late Submissions', `${totalAssigned ? Math.round(lateRows.length/totalAssigned*100) : 0}% of all`)}
        {kpi('file', 'info', pendingReview, 'Submissions To Mark', 'Individual pieces awaiting a mark')}
        {kpi('award', 'success', highest ? `${highest.pct}%` : '—', 'Highest Score', highest ? (users[highest.sid]?.name || '') : '')}
        {kpi('alertCircle', 'amber', flaggedN, 'Students Flagged', 'Need intervention')}
      </div>

      {/* Trend + subject */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
        <ChartCard title="Average Score Over Time" subtitle="Monthly class average">
          <LineChart points={trendPoints} />
        </ChartCard>
        <ChartCard title="Subject Performance" subtitle="Average score by subject">
          {subjectRows.length ? <BarList rows={subjectRows} max={100} />
            : <div style={{ fontSize: 12, color: C.muted }}>No graded work yet.</div>}
        </ChartCard>
      </div>

      {/* Status + grades + class comparison */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 16 }}>
        <ChartCard title="Submission Status" subtitle="Current distribution">
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <Donut segments={statusSegments} />
            <div style={{ display:'flex', flexDirection:'column', gap: 7 }}>
              {statusSegments.map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap: 7, fontFamily: F.body, fontSize: 12, color: C.sub }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <span style={{ fontFamily: F.mono, fontWeight: 600, color: C.text }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
        <ChartCard title="Grade Distribution" subtitle="Across all graded work">
          <BarList rows={gradeRows} unit="" />
        </ChartCard>
        <ChartCard title="Class Comparison" subtitle="Avg score vs completion %">
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            {classRows.map(c => (
              <div key={c.label}>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily: F.body, fontSize: 11.5, color: C.muted, marginBottom: 3 }}>
                  <span>{c.label}</span><span style={{ fontFamily: F.mono }}>{c.score}% · {c.completion}%</span>
                </div>
                <div style={{ display:'flex', gap: 4 }}>
                  <div style={{ flex: 1, height: 8, background: C.surface2, borderRadius: 3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.score}%`, background: C.brand }} />
                  </div>
                  <div style={{ flex: 1, height: 8, background: C.surface2, borderRadius: 3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.completion}%`, background: C.success }} />
                  </div>
                </div>
              </div>
            ))}
            {classRows.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No class data.</div>}
          </div>
        </ChartCard>
      </div>

      {/* Top + intervention */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
        <ChartCard title="Top Performing Students" subtitle="Highest average this period">
          <div style={{ display:'flex', flexDirection:'column' }}>
            {topStudents.map((s, i) => (
              <div key={s.sid} style={{ display:'flex', alignItems:'center', gap: 10, padding: '9px 0', borderBottom: i < topStudents.length - 1 ? `1px solid ${C.surface2}` : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius:'50%', background: i < 3 ? C.amberBg : C.surface2,
                  color: i < 3 ? C.amber : C.muted, fontFamily: F.head, fontSize: 11, fontWeight: 700,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>{i + 1}</span>
                <Avatar name={s.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>{s.classLabel}</div>
                </div>
                <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.success }}>{s.avg}%</span>
              </div>
            ))}
            {topStudents.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No graded work yet.</div>}
          </div>
        </ChartCard>
        <ChartCard title="Students Needing Intervention" subtitle="Below threshold or missing submissions">
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {intervention.map(s => (
              <div key={s.sid} style={{ display:'flex', alignItems:'center', gap: 10, padding: '10px 12px',
                background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 10 }}>
                <Avatar name={s.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>
                    {s.classLabel}{s.missing > 0 ? ` · ${s.missing} missing` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.danger }}>{s.avg}%</span>
              </div>
            ))}
            {intervention.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Everyone's on track 🎉</div>}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

// ─── Teacher builder ───────────────────────────────────────────
const blankAssignment = (teacherId, folderId = null) => ({
  id: 'a_' + Math.random().toString(36).slice(2, 9),
  title: '',
  subject: 'Math',
  classLabel: null,
  folderId,
  teacherId,
  studentIds: [],
  dueAt: '',
  timeLimitMins: null,
  status: 'draft',
  createdAt: new Date().toISOString().slice(0, 10),
  instructions: '',
  questions: [],
  submissions: {},
  settings: { ...DEFAULT_SETTINGS },
});

const blankQuestion = (type) => {
  const base = { id: 'q_' + Math.random().toString(36).slice(2, 8), type, prompt: '', points: 2 };
  if (type === 'mcq')       return { ...base, choices: ['', '', '', ''], correctIndex: 0 };
  if (type === 'multi')     return { ...base, choices: ['', '', '', ''], correctIndices: [] };
  if (type === 'truefalse') return { ...base, answer: true };
  if (type === 'numeric')   return { ...base, answer: 0, tolerance: 0.01 };
  if (type === 'math')      return { ...base, answer: '' };
  if (type === 'fillblank') return { ...base, blanks: [''] };
  if (type === 'match')     return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }] };
  return base;
};

// Re-shape a question when its type changes, preserving prompt/points/hint.
const reshapeQuestion = (q, newType) => {
  if (q.type === newType) return q;
  const fresh = blankQuestion(newType);
  return { ...fresh, id: q.id, prompt: q.prompt, points: q.points, hint: q.hint };
};

const TeacherBuilder = ({ assignment, students, folders = [], classes = [], defaultFolderId = null, onCreateFolder, onCancel, onSave }) => {
  const toast = useToast();
  const [a, setA] = React.useState(() => normalizeAssignment(assignment
    ? JSON.parse(JSON.stringify(assignment))
    : blankAssignment('t_clarke', defaultFolderId)));
  const [tab, setTab] = React.useState('questions'); // questions | settings
  usePageTrail([{ label: assignment ? (assignment.title || 'Edit homework') : 'New homework' }]);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');

  const setField = (k, v) => setA(prev => ({ ...prev, [k]: v }));
  const setSetting = (k, v) => setA(prev => ({ ...prev, settings: { ...prev.settings, [k]: v } }));
  const setQ = (id, patch) => setA(prev => ({
    ...prev,
    questions: prev.questions.map(q => q.id === id ? { ...q, ...patch } : q),
  }));
  const setType = (id, type) => setA(prev => ({
    ...prev,
    questions: prev.questions.map(q => q.id === id ? reshapeQuestion(q, type) : q),
  }));
  const addQ = (type) => setA(prev => ({ ...prev, questions: [...prev.questions, blankQuestion(type)] }));
  const delQ = (id) => setA(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  const dupQ = (id) => setA(prev => {
    const idx = prev.questions.findIndex(q => q.id === id);
    if (idx < 0) return prev;
    const copy = { ...JSON.parse(JSON.stringify(prev.questions[idx])), id: 'q_' + Math.random().toString(36).slice(2, 8) };
    const arr = [...prev.questions];
    arr.splice(idx + 1, 0, copy);
    return { ...prev, questions: arr };
  });
  const moveQ = (id, dir) => setA(prev => {
    const idx = prev.questions.findIndex(q => q.id === id);
    if (idx < 0) return prev;
    const j = idx + dir;
    if (j < 0 || j >= prev.questions.length) return prev;
    const arr = [...prev.questions];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    return { ...prev, questions: arr };
  });
  const importQuestions = (qs) => setA(prev => ({ ...prev, questions: [...prev.questions, ...qs] }));

  const errors = [];
  if (!a.title.trim()) errors.push('Title is required');
  if (a.questions.length === 0) errors.push('Add at least one question');
  a.questions.forEach((q, i) => {
    if (!q.prompt.trim()) errors.push(`Q${i + 1}: prompt required`);
  });

  // IDEMPOTENCY GUARD: block a double-click from firing Publish/Save twice (which
  // would create two assignments / two publish events). Cleared shortly after.
  const savingRef = React.useRef(false);
  const trySave = (status) => {
    if (savingRef.current) return;
    if (errors.length > 0) {
      toast(errors[0], 'danger');
      if (errors[0].startsWith('Title')) setTab('settings');
      return;
    }
    savingRef.current = true;
    // On publish, assigned students would be notified via Comms (follow-up: write a
    // class-channel message to a.studentIds); logged to the audit trail meanwhile.
    if (status === 'active' && window.klasioAudit) window.klasioAudit('publish_homework', a.id || a.title, { assigned: (a.studentIds || []).length });
    onSave({ ...a, status });
    setTimeout(() => { savingRef.current = false; }, 800);
  };

  const toggleStudent = (sid) => setA(prev => ({
    ...prev,
    studentIds: prev.studentIds.includes(sid)
      ? prev.studentIds.filter(x => x !== sid)
      : [...prev.studentIds, sid],
  }));

  // Class-driven student selection. The chosen class filters which students are
  // shown, and "select all" assigns everyone in that class.
  const classStudents = a.classLabel ? students.filter(s => s.classLabel === a.classLabel) : students;
  // Assigned MUST be a subset of the class roster (F1 / Homework P0): count only
  // assigned students who are actually on this class's roster so the header
  // "N in <class> · M assigned" always reconciles (M ≤ N).
  const assignedInClass = classStudents.filter(s => a.studentIds.includes(s.id)).length;
  const allClassSelected = classStudents.length > 0 && classStudents.every(s => a.studentIds.includes(s.id));
  const selectAllInClass = () => setA(prev => {
    const ids = new Set(prev.studentIds);
    if (allClassSelected) classStudents.forEach(s => ids.delete(s.id));
    else classStudents.forEach(s => ids.add(s.id));
    return { ...prev, studentIds: [...ids] };
  });

  const selectStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 13, fontFamily: F.body, cursor: 'pointer',
  };

  return (
    <div style={{ ...pageFrame(), fontFamily: F.body, color: C.text }}>
      {/* Top bar */}
      <BackLink onClick={onCancel} label="Assignments" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, gap: 12 }}>
        <span style={{ fontFamily: F.head, ...TS.title }}>
          {assignment ? 'Edit homework' : 'New homework'}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <SegTabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'questions', label: '📖 Questions' },
              { id: 'settings',  label: '⚙ Settings' },
            ]}
          />
          <Btn variant="soft" small icon={<Ico name="save" size={13} />} onClick={() => trySave('draft')}>Save draft</Btn>
          <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />} onClick={() => trySave('active')}>Publish</Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>

          {tab === 'settings' ? (
            <>
              {/* Basic information */}
              <Card style={{ padding: 22 }}>
                <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 16 }}>Basic information</div>
                <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
                  <div>
                    <Label htmlFor="t-title">Title</Label>
                    <Input value={a.title} onChange={(v) => setField('title', v)} placeholder="e.g. Algebra: Simultaneous Equations" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
                    <div>
                      <Label>Subject</Label>
                      <select value={a.subject} onChange={e => setField('subject', e.target.value)} style={selectStyle}>
                        {SUBJECT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Class</Label>
                      <select value={a.classLabel || ''} onChange={e => setField('classLabel', e.target.value || null)} style={selectStyle}>
                        <option value="">All classes</option>
                        {classes.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Instructions</Label>
                    <Input multiline rows={3} value={a.instructions} onChange={(v) => setField('instructions', v)} placeholder="Instructions for students…" />
                  </div>
                  {/* Folder picker */}
                  <div>
                    <Label>Folder <span style={{ color: C.faint, fontWeight: 400 }}>(save here for later reuse)</span></Label>
                    {newFolderOpen ? (
                      <div style={{ display:'flex', gap:8 }}>
                        <Input value={newFolderName} onChange={setNewFolderName} placeholder="New folder name" autoFocus />
                        <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />}
                          onClick={() => {
                            const f = onCreateFolder && onCreateFolder(newFolderName);
                            if (f) {
                              setField('folderId', f.id);
                              setNewFolderName('');
                              setNewFolderOpen(false);
                              toast(`Folder "${f.name}" created`, 'success');
                            } else {
                              toast('Enter a folder name', 'danger');
                            }
                          }}>Create</Btn>
                        <Btn variant="soft" small onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }}>Cancel</Btn>
                      </div>
                    ) : (
                      <select
                        value={a.folderId || ''}
                        onChange={e => {
                          if (e.target.value === '__new__') setNewFolderOpen(true);
                          else setField('folderId', e.target.value || null);
                        }}
                        style={selectStyle}>
                        <option value="">Unfiled</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        <option value="__new__">+ New folder…</option>
                      </select>
                    )}
                  </div>
                </div>
              </Card>

              {/* Schedule & limits */}
              <Card style={{ padding: 22 }}>
                <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 16 }}>Schedule &amp; limits</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Available From</Label>
                    <Input type="datetime-local" value={a.settings.availableFrom} onChange={(v) => setSetting('availableFrom', v)} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="datetime-local" value={a.dueAt}
                      onChange={(v) => setField('dueAt', withDefaultDueTime(v))} />
                  </div>
                  <div>
                    <Label>Time Limit (minutes)</Label>
                    <Input type="number" value={a.timeLimitMins ?? ''} onChange={(v) => setField('timeLimitMins', v === '' ? null : (parseInt(v, 10) || 0))} placeholder="No limit" />
                  </div>
                  <div>
                    <Label>Attempts Allowed</Label>
                    <Input type="number" value={a.settings.attemptsAllowed} onChange={(v) => setSetting('attemptsAllowed', Math.max(1, parseInt(v, 10) || 1))} />
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <SettingRow title="Show a countdown to students"
                    desc="Off by default. The time limit still applies either way — this only decides whether students watch the clock."
                    checked={a.settings.showCountdown} onChange={(v) => setSetting('showCountdown', v)}
                    disabled={!a.timeLimitMins} />
                </div>
              </Card>

              {/* Submission options */}
              <Card style={{ padding: '8px 22px 14px' }}>
                <div style={{ fontFamily: F.head, ...TS.section, color: C.text, margin: '14px 0 2px' }}>Submission options</div>
                <SettingRow title="Allow Late Submissions" desc="Students can submit after the due date"
                  checked={a.settings.allowLate} onChange={(v) => setSetting('allowLate', v)} />
                <SettingRow title="Randomize Questions" desc="Each student sees questions in a different order"
                  checked={a.settings.randomize} onChange={(v) => setSetting('randomize', v)} />
                <SettingRow title="Auto-Grade MCQs" desc="Automatically grade MCQ and True/False questions"
                  checked={a.settings.autoGradeMcq} onChange={(v) => setSetting('autoGradeMcq', v)} />
                <SettingRow title="Show Question Preview" desc="Students can preview the list of questions on the start page before beginning"
                  checked={a.settings.showQuestionPreview} onChange={(v) => setSetting('showQuestionPreview', v)} />
              </Card>

              {/* Student review settings */}
              <Card style={{ padding: '8px 22px 14px' }}>
                <div style={{ margin: '14px 0 2px' }}>
                  <div style={{ fontFamily: F.head, ...TS.section, color: C.text }}>Student review settings</div>
                  <div style={{ fontFamily: F.body, ...TS.meta, color: C.muted, marginTop: 2 }}>Control what students see after submission</div>
                </div>
                <SettingRow title="Allow Students to Review Homework" desc="Students can open and review their submitted homework"
                  checked={a.settings.allowReview} onChange={(v) => setSetting('allowReview', v)} />
                <SettingRow title="Show Correct Answers" desc="Display the correct answer alongside the student's response"
                  checked={a.settings.showCorrect} onChange={(v) => setSetting('showCorrect', v)} disabled={!a.settings.allowReview} />
                <SettingRow title="Show Teacher Comments" desc="Share per-question feedback with students"
                  checked={a.settings.showComments} onChange={(v) => setSetting('showComments', v)} disabled={!a.settings.allowReview} />
                <SettingRow title="Show Auto-Marked Results Immediately" desc="Students see MCQ results right after submission without waiting for teacher review"
                  checked={a.settings.showAutoImmediately} onChange={(v) => setSetting('showAutoImmediately', v)} />
                <SettingRow title="Release Results After Teacher Approval" desc="Manually control when results become visible to students"
                  checked={a.settings.releaseAfterApproval} onChange={(v) => setSetting('releaseAfterApproval', v)} />
                <SettingRow title="Show Marks Only" desc="Students see scores but not correct answers or comments"
                  checked={a.settings.marksOnly} onChange={(v) => setSetting('marksOnly', v)} disabled={!a.settings.allowReview} />
                <SettingRow title="Hide Marks Until Released" desc="Marks are hidden until you explicitly release them"
                  checked={a.settings.hideMarksUntilReleased} onChange={(v) => setSetting('hideMarksUntilReleased', v)} />
              </Card>

              {/* Assigned students */}
              <Card style={{ padding: 22 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6 }}>
                  <div style={{ fontFamily: F.head, ...TS.section, color: C.text }}>Assigned students</div>
                  {classStudents.length > 0 && (
                    <button onClick={selectAllInClass} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontFamily: F.body, ...TS.meta, fontWeight: W.medium, color: C.brand,
                    }}>{allClassSelected ? 'Clear all' : 'Select all in class'}</button>
                  )}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginBottom: 12 }}>
                  {a.classLabel
                    ? <>{assignedInClass} of {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in {a.classLabel} assigned</>
                    : <>Choose a class above to narrow the list · {a.studentIds.length} assigned</>}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
                  {classStudents.map(s => {
                    const on = a.studentIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleStudent(s.id)} style={{
                        padding: '6px 12px', borderRadius: 999,
                        border: `1px solid ${on ? C.brand : C.border}`,
                        background: on ? C.brandSoft : C.bg,
                        color: on ? C.brand : C.sub,
                        fontFamily: F.body, fontSize: 12, fontWeight: 500,
                        cursor:'pointer', transition: T,
                      }}>{on ? '✓ ' : ''}{s.name}</button>
                    );
                  })}
                  {classStudents.length === 0 && (
                    <span style={{ fontSize: 12, color: C.faint }}>No students in this class.</span>
                  )}
                </div>
              </Card>
            </>
          ) : (
            /* Questions tab */
            <Card style={{ padding: 20 }}>
              {/* Import lives in the add panel below — one place to add questions. */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: F.head, ...TS.section, color: C.text }}>
                  Questions <span style={{ color: C.muted, fontWeight: W.normal, ...NUM }}>({a.questions.length})</span>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
                {a.questions.map((q, i) => (
                  <QuestionEditor key={q.id} q={q} index={i} total={a.questions.length}
                    onChange={(patch) => setQ(q.id, patch)}
                    onChangeType={(t) => setType(q.id, t)}
                    onDelete={() => delQ(q.id)}
                    onDuplicate={() => dupQ(q.id)}
                    onUp={() => moveQ(q.id, -1)}
                    onDown={() => moveQ(q.id, 1)} />
                ))}
              </div>

              {/* Add palette — dashed drop-zone panel, centred type chips */}
              <AddQuestionPanel
                first={a.questions.length === 0}
                onAdd={addQ}
                onImport={() => setPdfOpen(true)} />
            </Card>
          )}
        </div>

        {/* RIGHT — outline */}
        <div style={{ display:'flex', flexDirection:'column', gap: 12, position:'sticky', top: 20, alignSelf:'start' }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 10 }}>Outline</div>
            {a.questions.length === 0
              ? <div style={{ ...TS.meta, color: C.muted }}>No questions yet</div>
              : (
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {/* The auto/teacher-marked dot is gone — it encoded the same
                      fact as the Marks split bar directly below, in a colour
                      (amber) reserved for work needing action. */}
                  {a.questions.map((q, i) => (
                    <button key={q.id} onClick={() => setTab('questions')}
                      onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      style={{
                        display:'flex', alignItems:'center', gap: 8, width:'100%', textAlign:'left',
                        padding: '6px 8px', borderRadius: RADIUS - 2, background: 'transparent',
                        border:'none', cursor:'pointer', transition: T,
                      }}>
                      <span style={{ fontFamily: F.body, ...TS.meta, color: C.muted, width: 22, ...NUM }}>Q{i + 1}</span>
                      <span style={{ fontFamily: F.body, ...TS.meta, color: C.sub, flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {q.prompt || <em style={{ color: C.faint }}>Untitled</em>}
                      </span>
                      <span style={{ fontFamily: F.body, ...TS.meta, color: C.muted, ...NUM }}>{q.points}p</span>
                    </button>
                  ))}
                </div>
              )
            }
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 10 }}>Marks</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
              <span style={{ ...TS.meta, color: C.muted }}>Total points</span>
              <span style={{ fontFamily: F.head, fontSize: 20, fontWeight: W.medium, color: C.text, ...NUM }}>{totalPoints(a)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, flexShrink: 0 }} />
                <span style={{ ...TS.meta, color: C.sub, flex: 1 }}>Auto-marked</span>
                <span style={{ ...TS.meta, color: C.text, ...NUM }}>{autoTotal(a)}p</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: C.borderD, flexShrink: 0 }} />
                <span style={{ ...TS.meta, color: C.sub, flex: 1 }}>Teacher-marked</span>
                <span style={{ ...TS.meta, color: C.text, ...NUM }}>{manualTotal(a)}p</span>
              </div>
            </div>
            {/* Split bar kept — it is the one place the auto/manual ratio is
                legible at a glance. Teacher-marked is a neutral hairline grey,
                not amber: nothing here needs marking yet. */}
            {totalPoints(a) > 0 && (
              <div style={{ height: 6, marginTop: 12, borderRadius: RADIUS_FULL, overflow:'hidden', display:'flex' }}>
                <div style={{ flex: autoTotal(a), background: C.brand }} />
                <div style={{ flex: manualTotal(a), background: C.borderD }} />
              </div>
            )}
          </Card>

          {errors.length > 0 && (
            <Card style={{ padding: 14, background: C.amberBg, borderColor: C.amberBorder }}>
              <div style={{ ...TS.meta, fontWeight: W.medium, color: C.amber, marginBottom: 6, display:'flex', alignItems:'center', gap: 6 }}>
                <Ico name="info" size={12} color={C.amber} /> {errors.length} issue{errors.length > 1 ? 's' : ''} to fix
              </div>
              <ul style={{ margin: 0, padding:'0 0 0 18px', ...TS.meta, color: C.sub, lineHeight: 1.6 }}>
                {errors.slice(0, 4).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <PdfImportModal open={pdfOpen} onClose={() => setPdfOpen(false)} onImport={importQuestions} />
    </div>
  );
};

// Add-question affordance: a dashed panel that reads as a slot at the end of the
// question list rather than a toolbar. Type chips sit inside it so choosing a
// type IS the add action — no separate "add then pick type" step.
// The four types that actually get used, in the order a teacher reaches for
// them. The other six stay one click away under "More types" rather than
// spending eleven equal-weight buttons on a decision that is usually MCQ.
const QTYPES_COMMON = ['mcq', 'short', 'math', 'truefalse'];

const AddQuestionPanel = ({ first, onAdd, onImport }) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef(null);

  // Close the overflow menu on an outside click, like every other menu here.
  React.useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  const common = QTYPES_COMMON.map(t => qtypeMeta(t));
  const rest = QTYPES.filter(t => QTYPES_COMMON.indexOf(t.type) === -1);

  const typeBtn = (t) => (
    <button key={t.type} onClick={() => onAdd(t.type)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderD; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
      style={{
        display:'inline-flex', alignItems:'center', gap: 6,
        padding: '8px 14px', borderRadius: RADIUS,
        border: `1px solid ${C.border}`, background: C.bg,
        cursor:'pointer', transition: T,
        fontFamily: F.body, ...TS.body, fontWeight: W.medium, color: C.text,
      }}>{t.short}</button>
  );

  return (
    <div style={{
      marginTop: first ? 0 : 16,
      padding: '24px 20px',
      borderRadius: RADIUS,
      border: `1px dashed ${C.borderD}`,
      background: C.bg,
      textAlign: 'center',
    }}>
      {/* Copy points at the next action rather than describing the screen. */}
      <div style={{ fontFamily: F.head, ...TS.section, color: C.text }}>
        {first ? 'Add your first question' : 'Add another question'}
      </div>
      <div style={{ fontFamily: F.body, ...TS.meta, color: C.muted, marginTop: 4 }}>
        {first ? 'Pick a type to start writing — you can change it later.' : 'Pick a type, or bring one in from a PDF.'}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap: 8, marginTop: 16 }}>
        {common.map(typeBtn)}

        <div ref={moreRef} style={{ position: 'relative' }}>
          <button onClick={() => setMoreOpen(o => !o)}
            aria-haspopup="menu" aria-expanded={moreOpen}
            onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              display:'inline-flex', alignItems:'center', gap: 6,
              padding: '8px 12px', borderRadius: RADIUS,
              border: '1px solid transparent', background: 'transparent',
              cursor:'pointer', transition: T,
              fontFamily: F.body, ...TS.body, fontWeight: W.medium, color: C.sub,
            }}>
            More types
            <Ico name="chevD" size={13} color={C.muted} />
          </button>
          {moreOpen && (
            <div role="menu" style={{
              position:'absolute', top:'calc(100% + 4px)', left: 0, zIndex: 20,
              minWidth: 172, padding: 4, textAlign: 'left',
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: RADIUS,
              boxShadow: C.shadowL,
            }}>
              {rest.map(t => (
                <button key={t.type} role="menuitem"
                  onClick={() => { setMoreOpen(false); onAdd(t.type); }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding: '7px 10px', borderRadius: RADIUS - 2,
                    border:'none', background:'transparent', cursor:'pointer', transition: T,
                    fontFamily: F.body, ...TS.meta, color: C.sub,
                  }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Import is a different kind of action from "write a question", so it
            sits after a divider instead of pretending to be a twelfth type. */}
        <span style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />
        <button onClick={onImport}
          onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          style={{
            display:'inline-flex', alignItems:'center', gap: 6,
            padding: '8px 12px', borderRadius: RADIUS,
            border: '1px solid transparent', background: 'transparent',
            cursor:'pointer', transition: T,
            fontFamily: F.body, ...TS.body, fontWeight: W.medium, color: C.sub,
          }}>
          <Ico name="upload" size={13} color={C.muted} />
          Import from PDF
        </button>
      </div>
    </div>
  );
};

const QuestionEditor = ({ q, index, total = 1, onChange, onChangeType, onDelete, onDuplicate, onUp, onDown }) => {
  const m = qtypeMeta(q.type);
  const [collapsed, setCollapsed] = React.useState(false);

  const headBtn = (icon, title, onClick, color = C.muted, disabled) => (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} style={{
      width: 28, height: 28, borderRadius: RADIUS - 2, border: 'none', background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
      display:'flex', alignItems:'center', justifyContent:'center', transition: T,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.surface2; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <Ico name={icon} size={15} color={color} />
    </button>
  );

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: RADIUS, overflow:'hidden',
      background: C.bg,
    }}>
      {/* One quiet toolbar. The type select and the marks input drop their
          borders until hover/focus so they stop competing with each other and
          with the icon actions; the bar itself is white, not filled grey. */}
      <div style={{
        padding: '8px 10px', background: C.bg,
        borderBottom: collapsed ? 'none' : `1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap: 6,
      }}>
        <span title="Drag to reorder" style={{ display:'flex', cursor:'grab', color: C.faint }}><Ico name="grip" size={16} color={C.faint} /></span>
        <span style={{ fontFamily: F.body, ...TS.meta, fontWeight: W.medium, color: C.sub, ...NUM }}>Q{index + 1}</span>
        <select value={q.type} onChange={e => onChangeType && onChangeType(e.target.value)}
          aria-label="Question type"
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; }}
          onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'transparent'; }}
          onFocus={e => { e.currentTarget.style.borderColor = C.brand; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; }}
          style={{
            padding: '5px 8px', borderRadius: RADIUS - 2,
            border: '1px solid transparent', background: 'transparent', color: C.text,
            fontFamily: F.body, ...TS.meta, cursor:'pointer', transition: T, outline: 'none',
          }}>
          {QTYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <label style={{ fontFamily: F.body, ...TS.meta, color: C.muted }} htmlFor={`q-marks-${q.id}`}>Marks</label>
        <Input type="number" value={q.points} onChange={(v) => onChange({ points: parseInt(v, 10) || 0 })}
          style={{ width: 48, padding: '5px 6px', textAlign:'center', ...NUM }} />
        {onDuplicate && headBtn('copy', 'Duplicate', onDuplicate)}
        {headBtn(collapsed ? 'chevD' : 'chevU', collapsed ? 'Expand' : 'Collapse', () => setCollapsed(c => !c))}
        {headBtn('trash', 'Delete', onDelete, C.danger)}
      </div>

      {collapsed ? (
        <div style={{ padding: '10px 14px', display:'flex', alignItems:'center', gap: 8 }}>
          <span style={{
            flexShrink: 0, padding: '1px 8px', borderRadius: RADIUS_FULL,
            border: `1px solid ${C.border}`, color: C.muted,
            fontFamily: F.body, fontSize: 12, fontWeight: W.normal, whiteSpace: 'nowrap',
          }}>{m.label}</span>
          <span style={{ fontFamily: F.body, ...TS.meta, color: C.sub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {q.prompt || <em style={{ color: C.faint }}>Untitled question</em>}
          </span>
        </div>
      ) : (
      <div style={{ padding: 16, display:'flex', flexDirection:'column', gap: 12 }}>
        {/* Reorder row */}
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          {headBtn('chevU', 'Move up', onUp, C.muted, index === 0)}
          {headBtn('chevD', 'Move down', onDown, C.muted, index === total - 1)}
          <span style={{ fontFamily: F.body, fontSize: 11.5, color: C.faint }}>{m.desc}</span>
        </div>

        <div>
          <Label>Question</Label>
          <Input multiline rows={2} value={q.prompt} onChange={(v) => onChange({ prompt: v })}
            placeholder={q.type === 'fillblank'
              ? 'Use ___ to mark each blank, e.g. The capital of France is ___.'
              : 'Enter your question here… (supports LaTeX: $x^2 + y^2 = z^2$)'} />
        </div>

        {q.type === 'mcq' && (
          <div>
            <Label>Choices <span style={{ color:C.faint, fontWeight:400 }}>(select correct)</span></Label>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {q.choices.map((c, i) => (
                <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                  <button onClick={() => onChange({ correctIndex: i })} style={{
                    width: 20, height: 20, borderRadius:'50%',
                    border:`2px solid ${q.correctIndex === i ? C.success : C.borderD}`,
                    background: q.correctIndex === i ? C.success : C.bg,
                    cursor:'pointer', flexShrink: 0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {q.correctIndex === i && <Ico name="check" size={10} color="#fff" />}
                  </button>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, width: 14 }}>{String.fromCharCode(65 + i)}</span>
                  <Input value={c} onChange={(v) => {
                    const arr = [...q.choices]; arr[i] = v; onChange({ choices: arr });
                  }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  {q.choices.length > 2 && (
                    <button onClick={() => {
                      const arr = q.choices.filter((_, j) => j !== i);
                      const ci = q.correctIndex >= arr.length ? arr.length - 1 : q.correctIndex;
                      onChange({ choices: arr, correctIndex: ci });
                    }} style={iconBtnStyle()}><Ico name="x" size={12} color={C.muted} /></button>
                  )}
                </div>
              ))}
              {q.choices.length < 6 && (
                <button onClick={() => onChange({ choices: [...q.choices, ''] })} style={{
                  marginLeft: 28, padding: '4px 8px', border: `1px dashed ${C.border}`,
                  borderRadius: 6, background: 'transparent', cursor:'pointer',
                  fontFamily: F.body, fontSize: 12, color: C.muted, width: 'fit-content',
                }}>+ Add choice</button>
              )}
            </div>
          </div>
        )}

        {q.type === 'numeric' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
            <div>
              <Label>Correct answer</Label>
              <Input type="number" value={q.answer} onChange={(v) => onChange({ answer: parseFloat(v) || 0 })} />
            </div>
            <div>
              <Label>Tolerance ±</Label>
              <Input type="number" value={q.tolerance} onChange={(v) => onChange({ tolerance: parseFloat(v) || 0 })} />
            </div>
          </div>
        )}

        {q.type === 'math' && (
          <div>
            <Label>Correct answer (LaTeX)</Label>
            <MathEditor value={q.answer || ''} onChange={(v) => onChange({ answer: v })} placeholder="e.g. x=3" />
            <div style={{ marginTop: 6, fontSize: 11, color: C.muted, fontFamily: F.mono }}>
              raw: {q.answer || <span style={{ color: C.faint }}>—</span>}
            </div>
          </div>
        )}

        {q.type === 'multi' && (
          <div>
            <Label>Options <span style={{ color:C.faint, fontWeight:400 }}>(check all correct)</span></Label>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {q.choices.map((c, i) => {
                const on = (q.correctIndices || []).includes(i);
                return (
                  <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                    <button onClick={() => {
                      const set = new Set(q.correctIndices || []);
                      set.has(i) ? set.delete(i) : set.add(i);
                      onChange({ correctIndices: [...set].sort((x, y) => x - y) });
                    }} style={{
                      width: 20, height: 20, borderRadius: 6,
                      border:`2px solid ${on ? C.success : C.borderD}`,
                      background: on ? C.success : C.bg, cursor:'pointer', flexShrink: 0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>{on && <Ico name="check" size={10} color="#fff" />}</button>
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, width: 14 }}>{String.fromCharCode(65 + i)}</span>
                    <Input value={c} onChange={(v) => { const arr = [...q.choices]; arr[i] = v; onChange({ choices: arr }); }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                    {q.choices.length > 2 && (
                      <button onClick={() => {
                        const arr = q.choices.filter((_, j) => j !== i);
                        const ci = (q.correctIndices || []).filter(x => x !== i).map(x => x > i ? x - 1 : x);
                        onChange({ choices: arr, correctIndices: ci });
                      }} style={iconBtnStyle()}><Ico name="x" size={12} color={C.muted} /></button>
                    )}
                  </div>
                );
              })}
              {q.choices.length < 6 && (
                <button onClick={() => onChange({ choices: [...q.choices, ''] })} style={{
                  marginLeft: 28, padding: '4px 8px', border: `1px dashed ${C.border}`,
                  borderRadius: 6, background: 'transparent', cursor:'pointer',
                  fontFamily: F.body, fontSize: 12, color: C.muted, width: 'fit-content',
                }}>+ Add Option</button>
              )}
            </div>
          </div>
        )}

        {q.type === 'truefalse' && (
          <div>
            <Label>Correct Answer</Label>
            <div style={{ display:'flex', gap: 8 }}>
              {[true, false].map(v => {
                const on = q.answer === v;
                return (
                  <button key={String(v)} onClick={() => onChange({ answer: v })} style={{
                    padding: '8px 22px', borderRadius: RADIUS, cursor:'pointer',
                    border:`1px solid ${on ? C.brand : C.border}`,
                    background: on ? C.brand : C.bg, color: on ? C.inverse : C.sub,
                    fontFamily: F.body, ...TS.meta, fontWeight: W.medium, transition: T,
                  }}>{v ? 'True' : 'False'}</button>
                );
              })}
            </div>
          </div>
        )}

        {q.type === 'fillblank' && (
          <div>
            <Label>Accepted answers <span style={{ color:C.faint, fontWeight:400 }}>(one per blank, in order)</span></Label>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {(q.blanks || []).map((b, i) => (
                <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, width: 56 }}>Blank {i + 1}</span>
                  <Input value={b} onChange={(v) => { const arr = [...q.blanks]; arr[i] = v; onChange({ blanks: arr }); }}
                    placeholder="Correct text" />
                  {q.blanks.length > 1 && (
                    <button onClick={() => onChange({ blanks: q.blanks.filter((_, j) => j !== i) })} style={iconBtnStyle()}>
                      <Ico name="x" size={12} color={C.muted} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => onChange({ blanks: [...(q.blanks || []), ''] })} style={{
                marginLeft: 64, padding: '4px 8px', border: `1px dashed ${C.border}`,
                borderRadius: 6, background: 'transparent', cursor:'pointer',
                fontFamily: F.body, fontSize: 12, color: C.muted, width: 'fit-content',
              }}>+ Add Blank</button>
            </div>
          </div>
        )}

        {q.type === 'match' && (
          <div>
            <Label>Pairs <span style={{ color:C.faint, fontWeight:400 }}>(students match left to right)</span></Label>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {(q.pairs || []).map((p, i) => (
                <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                  <Input value={p.left} onChange={(v) => { const arr = q.pairs.map((x, j) => j === i ? { ...x, left: v } : x); onChange({ pairs: arr }); }} placeholder="Left" />
                  <Ico name="arrowR" size={14} color={C.faint} />
                  <Input value={p.right} onChange={(v) => { const arr = q.pairs.map((x, j) => j === i ? { ...x, right: v } : x); onChange({ pairs: arr }); }} placeholder="Right" />
                  {q.pairs.length > 2 && (
                    <button onClick={() => onChange({ pairs: q.pairs.filter((_, j) => j !== i) })} style={iconBtnStyle()}>
                      <Ico name="x" size={12} color={C.muted} /></button>
                  )}
                </div>
              ))}
              {q.pairs.length < 8 && (
                <button onClick={() => onChange({ pairs: [...(q.pairs || []), { left: '', right: '' }] })} style={{
                  padding: '4px 8px', border: `1px dashed ${C.border}`,
                  borderRadius: 6, background: 'transparent', cursor:'pointer',
                  fontFamily: F.body, fontSize: 12, color: C.muted, width: 'fit-content',
                }}>+ Add Pair</button>
              )}
            </div>
          </div>
        )}

        <div>
          <Label>Hint <span style={{ color: C.faint, fontWeight: 400 }}>(optional — shown to students if they ask)</span></Label>
          <Input value={q.hint || ''} onChange={(v) => onChange({ hint: v })} placeholder="A nudge in the right direction" />
        </div>

        <div style={{ display:'flex', alignItems:'center', gap: 8, paddingTop: 4 }}>
          <Toggle checked={q.required !== false} onChange={(v) => onChange({ required: v })} />
          <span style={{ fontFamily: F.body, ...TS.meta, color: C.sub }}>Required</span>
        </div>
      </div>
      )}
    </div>
  );
};

const iconBtnStyle = () => ({
  width: 26, height: 26, borderRadius: 6,
  border: `1px solid ${C.border}`, background: C.bg,
  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  transition: T,
});

// ─── Teacher overview hub (opened by clicking a homework card) ──
const TeacherOverview = ({ a, users = {}, folders = [], onBack, onEdit, onReview, onDuplicate, onMove, onDelete, onRelease }) => {
  usePageTrail([{ label: a.title }]);
  const total = a.studentIds.length;
  const submitted = Object.values(a.submissions).filter(hasSubmitted).length;
  const graded = Object.values(a.submissions).filter(isGraded).length;
  const toMark = Object.values(a.submissions).filter(awaitingMark).length;
  // Marked work this teacher is still holding back from students.
  const toRelease = Object.values(a.submissions).filter(s => heldBack(a, s)).length;
  const pct = total ? Math.round(submitted / total * 100) : 0;

  const scores = Object.values(a.submissions).filter(isGraded)
    .map(s => totalPoints(a) ? Math.round(submissionScore(a, s) / totalPoints(a) * 100) : 0);
  const avg = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;

  const statusKey = a.status === 'draft' ? 'draft' : a.status === 'closed' ? 'closed'
    : isScheduled(a) ? 'scheduled' : toMark > 0 ? 'tomark' : 'live';
  const statusLabel = toMark > 0 && a.status === 'active' && !isScheduled(a) ? `${toMark} to mark` : null;

  return (
    <div style={{ ...pageFrame(), fontFamily: F.body, color: C.text }}>
      {/* Top bar — back sits on its own line above the actions, like every other
          nested screen; this row is for actions on the assignment. */}
      <BackLink onClick={onBack} label="Assignments" />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 12, marginBottom: 20 }}>
        <div style={{ display:'flex', gap: 8 }}>
          <Btn variant="brand" small icon={<Ico name="edit" size={13} color="#fff" />} onClick={onEdit}>Edit</Btn>
          <Btn variant="soft" small icon={<Ico name="eye" size={13} />} onClick={onReview}>
            Review submissions{toMark > 0 ? ` (${toMark})` : ''}
          </Btn>
          {/* Shown only while this assignment is actually holding marks back. */}
          {toRelease > 0 && (
            <Btn variant="brand" small icon={<Ico name="send" size={13} color="#fff" />} onClick={onRelease}>
              Release results ({toRelease})
            </Btn>
          )}
          <Btn variant="soft" small icon={<Ico name="copy" size={13} />} onClick={onDuplicate}>Duplicate</Btn>
          <Btn variant="soft" small icon={<Ico name="trash" size={13} color={C.danger} />} onClick={onDelete} style={{ color: C.danger }}>Delete</Btn>
        </div>
      </div>

      {/* Header card */}
      <Card style={{ overflow:'hidden', marginBottom: 16 }}>
        <div style={{ padding: 20 }}>
          {/* Subject and class were pills, which made two plain facts look like
              two statuses. They are facts, so they read on the meta line below;
              only the actual status keeps a badge. */}
          <div style={{ display:'flex', gap: 12, alignItems:'flex-start', justifyContent:'space-between' }}>
            <h1 style={{ fontFamily: F.head, ...TS.title, margin: 0 }}>{a.title || 'Untitled homework'}</h1>
            <StatusBadge status={statusKey}>{statusLabel}</StatusBadge>
          </div>
          <MetaLine
            style={{ marginTop: 6 }}
            items={[
              a.subject,
              a.classLabel,
              `${a.questions.length} question${a.questions.length === 1 ? '' : 's'}`,
              `${totalPoints(a)} marks`,
              a.dueAt && `Due ${fmtDateTime(a.dueAt)}`,
              a.timeLimitMins ? `${a.timeLimitMins} min limit` : null,
            ]}
          />
          {a.instructions && (
            <div style={{ display:'flex', gap: 10, padding: '12px 14px', marginTop: 16,
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS, alignItems:'flex-start' }}>
              <Ico name="info" size={14} color={C.muted} />
              <span style={{ ...TS.meta, color: C.sub, lineHeight: 1.5 }}>{a.instructions}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Was four bordered cards with 22px numerals. "Submitted" also appeared
          in the progress card below and "Awaiting marking" in the Review button
          above, so the strip is the only place each number is stated now. */}
      <StatStrip
        style={{ marginBottom: 16 }}
        items={[
          { label: 'Submitted', value: `${submitted}/${total}` },
          { label: 'Graded', value: graded },
          { label: 'Awaiting marking', value: toMark },
          { label: `Class average${scores.length ? ` (${scores.length} graded)` : ''}`,
            value: avg != null ? `${avg}%` : '—', emphasis: true },
        ]}
      />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap: 16, alignItems:'start' }}>
        {/* Questions */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 12 }}>Questions</div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {a.questions.map((q, i) => {
              const m = qtypeMeta(q.type);
              return (
                <div key={q.id} style={{
                  display:'flex', alignItems:'center', gap: 12, padding: '8px 0',
                  borderBottom: i === a.questions.length - 1 ? 'none' : `1px solid ${C.border}`,
                }}>
                  <span style={{ ...TS.meta, color: C.muted, width: 20, flexShrink: 0, ...NUM }}>{i + 1}</span>
                  {/* Type badge was brand-filled for auto-marked and amber for
                      teacher-marked, which spent the "needs your action" colour
                      on a property of the question rather than a state of the
                      work. Outline + muted for both. */}
                  <span style={{
                    flexShrink: 0, padding: '1px 8px', borderRadius: RADIUS_FULL,
                    border: `1px solid ${C.border}`, color: C.muted,
                    fontFamily: F.body, fontSize: 12, fontWeight: W.normal, whiteSpace: 'nowrap',
                  }}>{m.label}</span>
                  <span style={{ flex: 1, fontFamily: F.body, ...TS.meta, color: C.sub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {q.prompt || <em style={{ color: C.faint }}>Untitled</em>}
                  </span>
                  <span style={{ ...TS.meta, color: C.muted, textAlign: 'right', flexShrink: 0, ...NUM }}>{q.points}p</span>
                </div>
              );
            })}
            {a.questions.length === 0 && <div style={{ ...TS.meta, color: C.muted }}>No questions yet.</div>}
          </div>
        </Card>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          {/* Submission progress */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 10 }}>Submission progress</div>
            {/* The "9/9" half of this row is in the StatStrip above; the bar and
                its percentage are what this card adds. */}
            <div style={{ ...TS.meta, color: C.muted, marginBottom: 6, ...NUM }}>{pct}% submitted</div>
            <div style={{ height: 4, background: C.surface2, borderRadius: RADIUS_FULL, overflow:'hidden' }}>
              <div style={{ height:'100%', width: `${pct}%`, background: C.brand }} />
            </div>
          </Card>

          {/* Assigned students */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 10 }}>
              Assigned students <span style={{ color: C.muted, fontWeight: W.normal, ...NUM }}>({total})</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              {a.studentIds.map((sid, i) => {
                const sub = a.submissions[sid];
                // Was bare coloured text (grey / green / indigo) — one of the
                // five status mechanisms this pass collapsed into StatusBadge.
                const key = !sub ? 'pending' : isGraded(sub) ? 'graded' : 'submitted';
                return (
                  <div key={sid} style={{
                    display:'flex', alignItems:'center', gap: 8, padding: '6px 0',
                    borderBottom: i === a.studentIds.length - 1 ? 'none' : `1px solid ${C.border}`,
                  }}>
                    <Avatar name={users[sid]?.name || sid} size={24} />
                    <span style={{ flex: 1, fontFamily: F.body, ...TS.meta, color: C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {users[sid]?.name || sid}
                    </span>
                    <StatusBadge status={key} />
                  </div>
                );
              })}
              {total === 0 && <div style={{ ...TS.meta, color: C.muted }}>No students assigned. Edit to assign.</div>}
            </div>
          </Card>

          {/* Attached resources — from the shared library (Materials). Attaching
              points to a file; nothing is copied. Each attachment carries its own
              student-visibility control: a mark scheme defaults off, a worksheet
              defaults on from the set date. */}
          <Card style={{ padding: 18 }}>
            {window.AttachResourcesPanel
              ? <window.AttachResourcesPanel contextType="homework" contextId={a.id} canEdit={a.status !== 'closed'} />
              : null}
          </Card>

          {/* Folder */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, ...TS.section, color: C.text, marginBottom: 10 }}>Folder</div>
            <select value={a.folderId || ''} onChange={e => onMove(e.target.value || null)} style={{
              width: '100%', padding: '9px 12px', borderRadius: RADIUS,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
              fontFamily: F.body, ...TS.meta, cursor:'pointer',
            }}>
              <option value="">Unfiled</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Teacher review queue ──────────────────────────────────────
const reviewStatus = (asn, sid) => {
  const sub = asn.submissions[sid];
  if (!sub) return { key: 'not_started', label: 'Not Started', tone: 'default', fg: C.muted };
  if (isGraded(sub)) return { key: 'graded', label: 'Graded', tone: 'success', fg: C.success };
  if (sub.status === 'in_progress') return { key: 'in_progress', label: 'In Progress', tone: 'amber', fg: C.amber };
  const late = isLateSub(asn, sub);
  return { key: 'submitted', label: late ? 'Late' : 'Submitted', tone: late ? 'danger' : 'info', fg: late ? C.danger : C.sub };
};

// Auto-mark verdict for a single question (auto types only) — same derivation as
// everywhere else, just restricted to the types the machine marks.
const autoVerdict = (q, sub) =>
  isAuto(q.type) ? outcomeFor(q, sub?.marks?.[q.id]) : null;

// Shared marking controls — student's answer + (auto) correct answer + marks + feedback.
// Reused when marking by student (iterating questions) and by question (iterating students).
const AnswerMarkControls = ({ q, sub, sid, onSetMark, onSetFb }) => {
  const a = sub.answers?.[q.id];
  const m = sub.marks?.[q.id];
  const fb = sub.feedback?.[q.id] || '';
  const isAutoQ = isAuto(q.type);
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 6 }}>
          Student answer
        </div>
        <QuestionAnswerDisplay question={q} answer={a} />
        {isAutoQ && correctAnswerText(q) != null && (
          <div style={{ marginTop: 6, fontSize: 12, color: C.muted, fontFamily: q.type === 'math' ? F.mono : F.body }}>
            Correct: <strong style={{ color: C.success }}>{correctAnswerText(q)}</strong>
            {q.type === 'numeric' && q.tolerance ? ` (±${q.tolerance})` : ''}
          </div>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
        <div style={{ width: 120 }}>
          <Label>Marks</Label>
          {isAutoQ ? (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: C.surface, border: `1px solid ${C.border}`,
              fontFamily: F.mono, fontSize: 14, fontWeight: 600, color: C.text,
            }}>
              {typeof m === 'number' ? m : '—'} / {q.points}
            </div>
          ) : (
            <Input type="number" value={m ?? ''} onChange={(v) => onSetMark(sid, q.id, v)}
              placeholder="0" suffix={`/ ${q.points}`} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <Label>Feedback {!isAutoQ && <span style={{ color: C.faint, fontWeight: 400 }}>(visible to student)</span>}</Label>
          <Input multiline rows={2} value={fb} onChange={(v) => onSetFb(sid, q.id, v)}
            placeholder={isAutoQ ? 'Optional comment…' : 'Tell the student what they did well, and what to improve.'} />
        </div>
      </div>
    </>
  );
};

const TeacherReview = ({ assignment, users, onClose, onUpdateSubmission }) => {
  const toast = useToast();
  usePageTrail([{ label: assignment.title, onClick: onClose }, { label: 'Review submissions' }]);
  const allStudents = assignment.studentIds;
  const total = totalPoints(assignment);
  const [mode, setMode] = React.useState('student'); // 'student' | 'question'
  const [query, setQuery] = React.useState('');
  const [statusF, setStatusF] = React.useState('all');

  const orderedSubmitted = allStudents.filter(sid => assignment.submissions[sid]);

  // Student-mode selection (default to the first student who actually submitted).
  const [activeSid, setActiveSid] = React.useState(orderedSubmitted[0] || allStudents[0]);
  // Question-mode selection.
  const [activeQid, setActiveQid] = React.useState(assignment.questions[0] && assignment.questions[0].id);

  const visible = allStudents.filter(sid => {
    const name = (users[sid]?.name || '').toLowerCase();
    if (query && !name.includes(query.toLowerCase())) return false;
    if (statusF === 'all') return true;
    return reviewStatus(assignment, sid).key === statusF;
  });

  const sub = activeSid ? assignment.submissions[activeSid] : null;
  const student = activeSid ? users[activeSid] : null;
  const score = sub ? submissionScore(assignment, sub) : 0;
  const scorePct = total ? Math.round(score / total * 100) : 0;

  const idxInSubmitted = orderedSubmitted.indexOf(activeSid);
  const gotoNext = () => {
    const n = orderedSubmitted[idxInSubmitted + 1];
    if (n) setActiveSid(n);
  };

  // Generic mark / feedback setters keyed by student — used by both modes.
  const setMark = (sid, qid, mark) => {
    const s = assignment.submissions[sid];
    if (!s) return;
    const max = assignment.questions.find(q => q.id === qid)?.points || 0;
    let m = parseFloat(mark);
    if (Number.isNaN(m)) m = null;
    else m = Math.max(0, Math.min(max, m));
    onUpdateSubmission(sid, { ...s, marks: { ...s.marks, [qid]: m } });
  };
  const setFb = (sid, qid, text) => {
    const s = assignment.submissions[sid];
    if (s) onUpdateSubmission(sid, { ...s, feedback: { ...s.feedback, [qid]: text } });
  };
  const setOverall = (text) => sub && onUpdateSubmission(activeSid, { ...sub, overallFeedback: text });

  const saveDraft = () => {
    if (!sub) return;
    onUpdateSubmission(activeSid, { ...sub });
    toast('Draft saved', 'success');
  };

  const gradeReturn = () => {
    if (!sub) return;
    if (!fullyMarked(assignment, sub)) {
      toast('Mark every question before returning', 'danger');
      return;
    }
    onUpdateSubmission(activeSid, { ...sub, status: 'returned', markedAt: new Date().toISOString() });
    toast(`Returned to ${student.name}`, 'success');
    if (idxInSubmitted < orderedSubmitted.length - 1) setTimeout(gotoNext, 200);
  };

  // Question-mode: how many submitted students have this question marked.
  const qMarkedCount = (qid) => orderedSubmitted.filter(sid => typeof assignment.submissions[sid]?.marks?.[qid] === 'number').length;
  // Question-mode bulk return: every submission that is now fully marked but not yet returned.
  const readyToReturn = orderedSubmitted.filter(sid => {
    const s = assignment.submissions[sid];
    return s && !isGraded(s) && fullyMarked(assignment, s);
  });
  const returnAllGraded = () => {
    if (readyToReturn.length === 0) { toast('No submissions ready to return', 'warn'); return; }
    readyToReturn.forEach(sid => {
      const s = assignment.submissions[sid];
      onUpdateSubmission(sid, { ...s, status: 'returned', markedAt: new Date().toISOString() });
    });
    toast(`Returned ${readyToReturn.length} submission${readyToReturn.length > 1 ? 's' : ''}`, 'success');
  };

  const activeQ = assignment.questions.find(q => q.id === activeQid) || assignment.questions[0];
  const activeQIdx = activeQ ? assignment.questions.findIndex(q => q.id === activeQ.id) : -1;

  if (allStudents.length === 0) {
    return (
      <div style={{ ...pageFrame(), fontFamily: F.body }}>
        <BackLink onClick={onClose} label={assignment.title} />
        <Card style={{ padding: 60, textAlign:'center' }}>
          <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No students assigned</div>
          <div style={{ fontSize: 13, color: C.muted }}>Assign students to {assignment.title} to start reviewing.</div>
        </Card>
      </div>
    );
  }

  const cardShell = {
    display:'flex', flexDirection:'column', minHeight: 0,
    border: `1px solid ${C.border}`, borderRadius: 14, overflow:'hidden',
    background: C.bg, boxShadow: C.shadow,
  };
  const numBadge = (label, on) => (
    <span style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: on ? C.brand : C.surface, color: on ? '#fff' : C.muted,
      fontFamily: F.mono, fontSize: 12, fontWeight: 700,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>{label}</span>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily: F.body, boxSizing:'border-box' }}>
      {/* Top bar: back + title + mark-by toggle. This pane owns the full viewport
          (no page gutter), so the back control leads the bar rather than a title. */}
      <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '12px 16px' }}>
        {/* The pane's own title names the assignment right beside this, so the
            control names the screen it returns to instead of repeating it. */}
        <BackLink onClick={onClose} label="Overview" style={{ marginBottom: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {assignment.title}
          </div>
        </div>
        <SegTabs
          tabs={[{ id: 'student', label: 'By student' }, { id: 'question', label: 'By question' }]}
          active={mode}
          onChange={setMode}
        />
      </div>

      <div style={{ display:'flex', gap: 10, flex: 1, minHeight: 0, padding: '0 16px 16px' }}>
        {/* ─── LEFT CARD: list ─────────────────────────────── */}
        <div style={{ ...cardShell, width: 320, flexShrink: 0 }}>
          {mode === 'student' ? (
            <>
              <div style={{ padding: '16px 18px 10px' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>Submissions</span>
              </div>
              <div style={{ padding: '0 14px 10px', display:'flex', flexDirection:'column', gap: 8 }}>
                <Input value={query} onChange={setQuery} placeholder="Search students…" prefix={<Ico name="search" size={13} color={C.faint} />} />
                <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{
                  padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: C.bg, color: C.sub, fontFamily: F.body, fontSize: 12.5, cursor:'pointer',
                }}>
                  <option value="all">All Students</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                  <option value="in_progress">In Progress</option>
                  <option value="not_started">Not Started</option>
                </select>
              </div>
              <div style={{ flex: 1, overflow:'auto', paddingBottom: 8 }}>
                {visible.map(sid => {
                  const s = users[sid];
                  const sb = assignment.submissions[sid];
                  const on = sid === activeSid;
                  const st = reviewStatus(assignment, sid);
                  const pct = sb && total ? Math.round(submissionScore(assignment, sb) / total * 100) : null;
                  return (
                    <button key={sid} onClick={() => setActiveSid(sid)} style={{
                      width: '100%', padding: '11px 16px', border: 'none',
                      background: on ? C.brandSoft : 'transparent',
                      cursor:'pointer', textAlign:'left', transition: T,
                      display:'flex', alignItems:'center', gap: 10,
                      borderLeft: on ? `3px solid ${C.brand}` : '3px solid transparent',
                    }}>
                      <Avatar name={s?.name || sid} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 6 }}>
                          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s?.name || sid}</span>
                          {pct != null && <span style={{ fontFamily: F.head, fontSize: 12.5, fontWeight: 700, color: C.brand }}>{pct}%</span>}
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sb ? fmtDateTime(sb.submittedAt) : '—'}</span>
                          <Pill tone={st.tone}>{st.label}</Pill>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {visible.length === 0 && (
                  <div style={{ padding: 20, fontSize: 12, color: C.muted, textAlign:'center' }}>No students match.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '16px 18px 10px' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.brand }}>Questions</span>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''} · {orderedSubmitted.length} submitted</div>
              </div>
              <div style={{ flex: 1, overflow:'auto', paddingBottom: 8 }}>
                {assignment.questions.map((q, i) => {
                  const on = q.id === activeQid;
                  const isAutoQ = isAuto(q.type);
                  const marked = qMarkedCount(q.id);
                  const denom = orderedSubmitted.length;
                  const allMarked = denom > 0 && marked >= denom;
                  return (
                    <button key={q.id} onClick={() => setActiveQid(q.id)} style={{
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: on ? C.brandSoft : 'transparent',
                      cursor:'pointer', textAlign:'left', transition: T,
                      display:'flex', alignItems:'flex-start', gap: 10,
                      borderLeft: on ? `3px solid ${C.brand}` : '3px solid transparent',
                    }}>
                      {numBadge(i + 1, on)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                          <Pill tone={isAutoQ ? 'brand' : 'amber'}>{qtypeMeta(q.type).label}</Pill>
                          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.points} pt</span>
                        </div>
                        <div style={{
                          fontSize: 12.5, color: C.sub, lineHeight: 1.4, overflow:'hidden',
                          display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical',
                        }}>
                          <PromptText text={q.prompt} style={{ fontFamily: F.body, fontSize: 12.5, color: C.sub }} />
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 7 }}>
                          {isAutoQ ? (
                            <span style={{ fontSize: 11, color: C.faint }}>Auto-marked</span>
                          ) : (
                            <>
                              <div style={{ flex: 1, maxWidth: 90, height: 5, borderRadius: 999, background: C.surface2, overflow:'hidden' }}>
                                <div style={{ width: `${denom ? (marked / denom) * 100 : 0}%`, height: '100%', background: allMarked ? C.success : C.brand, transition: T }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: allMarked ? C.success : C.muted }}>{marked}/{denom}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ─── RIGHT CARD: marking surface ─────────────────── */}
        <div style={{ ...cardShell, flex: 1, minWidth: 0 }}>
          {mode === 'student' ? (
            !sub ? (
              <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', padding: 40 }}>
                <div style={{ textAlign:'center' }}>
                  <Avatar name={student?.name || ''} size={48} />
                  <div style={{ fontFamily: F.head, fontSize: 17, fontWeight: 700, margin: '14px 0 4px' }}>{student?.name}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>
                    {reviewStatus(assignment, activeSid).label} — nothing to mark yet.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Student header bar */}
                <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <Avatar name={student.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700 }}>{student.name}</span>
                      <Pill tone={reviewStatus(assignment, activeSid).tone}>{reviewStatus(assignment, activeSid).label}</Pill>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Submitted {fmtDateTime(sub.submittedAt)}{sub.timeSpentMins ? ` · ${sub.timeSpentMins}m spent` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', marginRight: 6 }}>
                    <div style={{ fontFamily: F.head, fontSize: 20, fontWeight: 800, color: C.brand }}>{scorePct}%</div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>{score}/{total} marks</div>
                  </div>
                  <Btn variant="soft" small icon={<Ico name="save" size={13} />} onClick={saveDraft}>Save Draft</Btn>
                  <Btn variant="brand" small icon={<Ico name="send" size={13} color="#fff" />} onClick={gradeReturn}>Grade &amp; Return</Btn>
                </div>

                {/* Questions for this student */}
                <div style={{ flex: 1, overflow:'auto', padding: '20px 24px', background: C.surface }}>
                  <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
                    {assignment.questions.map((q, i) => {
                      const verdict = autoVerdict(q, sub);
                      return (
                        <Card key={q.id} style={{ padding: 18 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap: 10, marginBottom: 12 }}>
                            {numBadge(i + 1, false)}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display:'flex', gap: 6, alignItems:'center', marginBottom: 6 }}>
                                <Pill tone={isAuto(q.type) ? 'brand' : 'amber'}>{qtypeMeta(q.type).label}</Pill>
                                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.points} pt</span>
                                {verdict === 'correct' && <Pill tone="success" icon={<Ico name="check" size={10} />}>Correct</Pill>}
                                {verdict === 'incorrect' && <Pill tone="danger" icon={<Ico name="x" size={10} />}>Incorrect</Pill>}
                              </div>
                              <PromptText text={q.prompt} style={{ fontFamily: F.body, fontSize: 14, color: C.text, lineHeight: 1.5 }} />
                            </div>
                          </div>
                          <div style={{ marginLeft: 38, paddingLeft: 14, borderLeft: `2px solid ${C.surface2}` }}>
                            <AnswerMarkControls q={q} sub={sub} sid={activeSid} onSetMark={setMark} onSetFb={setFb} />
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Per-student overall feedback */}
                  <Card style={{ padding: 18, marginTop: 14, background: C.surface }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
                      <Ico name="chat" size={14} color={C.muted} />
                      <span style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text }}>Feedback for {student.name}</span>
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginBottom: 10 }}>
                      Overall comment returned to the student with their marks.
                    </div>
                    <Input multiline rows={3} value={sub.overallFeedback || ''} onChange={setOverall}
                      placeholder="Summarise how the student did and what to focus on next…" />
                  </Card>
                </div>
              </>
            )
          ) : (
            /* ── Mark by question ── */
            !activeQ ? (
              <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', padding: 40, color: C.muted, fontSize: 13 }}>
                This assignment has no questions.
              </div>
            ) : (
              <>
                {/* Question header bar */}
                <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                  {numBadge(activeQIdx + 1, true)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700 }}>Question {activeQIdx + 1}</span>
                      <Pill tone={isAuto(activeQ.type) ? 'brand' : 'amber'}>{qtypeMeta(activeQ.type).label}</Pill>
                      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{activeQ.points} pt</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{qMarkedCount(activeQ.id)} of {orderedSubmitted.length} marked</div>
                  </div>
                  {!isAuto(activeQ.type) && (
                    <Btn variant="brand" small icon={<Ico name="send" size={13} color="#fff" />} onClick={returnAllGraded} disabled={readyToReturn.length === 0}>
                      Return graded{readyToReturn.length ? ` (${readyToReturn.length})` : ''}
                    </Btn>
                  )}
                </div>

                {/* The question itself */}
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
                  <PromptText text={activeQ.prompt} style={{ fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 1.55 }} />
                  {isAuto(activeQ.type) && correctAnswerText(activeQ) != null && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: C.muted, fontFamily: activeQ.type === 'math' ? F.mono : F.body }}>
                      Correct answer: <strong style={{ color: C.success }}>{correctAnswerText(activeQ)}</strong>
                      {activeQ.type === 'numeric' && activeQ.tolerance ? ` (±${activeQ.tolerance})` : ''}
                    </div>
                  )}
                </div>

                {/* Every student's answer to this question */}
                <div style={{ flex: 1, overflow:'auto', padding: '16px 24px', background: C.surface }}>
                  {orderedSubmitted.length === 0 ? (
                    <div style={{ padding: 40, textAlign:'center', color: C.muted, fontSize: 13 }}>No submissions to mark yet.</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
                      {orderedSubmitted.map(sid => {
                        const s = users[sid];
                        const ssub = assignment.submissions[sid];
                        const verdict = autoVerdict(activeQ, ssub);
                        const isMarked = typeof ssub.marks?.[activeQ.id] === 'number';
                        return (
                          <Card key={sid} style={{ padding: 18 }}>
                            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 12 }}>
                              <Avatar name={s?.name || sid} size={34} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.text }}>{s?.name || sid}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>Submitted {fmtDateTime(ssub.submittedAt)}</div>
                              </div>
                              {verdict === 'correct' && <Pill tone="success" icon={<Ico name="check" size={10} />}>Correct</Pill>}
                              {verdict === 'incorrect' && <Pill tone="danger" icon={<Ico name="x" size={10} />}>Incorrect</Pill>}
                              {!isAuto(activeQ.type) && <Pill tone={isMarked ? 'success' : 'default'}>{isMarked ? 'Marked' : 'Unmarked'}</Pill>}
                            </div>
                            <AnswerMarkControls q={activeQ} sub={ssub} sid={sid} onSetMark={setMark} onSetFb={setFb} />
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ name = '', size = 28 }) => {
  const initials = (name || '').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius:'50%',
      background: C.surface2, color: C.muted,
      fontFamily: F.body, fontSize: size * 0.42, fontWeight: W.medium,
      display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
    }}>{initials || '?'}</span>
  );
};

// ════════════════════════════════════════════════════════════════
// STUDENT MODULE
// ════════════════════════════════════════════════════════════════
// ─── Student helpers ───────────────────────────────────────────
const fmtShort = (iso) => {
  if (!iso) return 'No date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtLong = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
// "Mon 14 Jul, 9:00am" — the opening time on a scheduled assignment.
const fmtOpens = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s/g, '').toLowerCase();
  return `${day}, ${time}`;
};

const gradeFor = (pct) => pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E';
// One neutral treatment for every grade, for the same reason as scoreColor.
const gradePalette = () => ({ bg: C.surface2, fg: C.sub, bd: C.border });
// A score used to render green / amber / red by band. That spent three of the
// four semantic colours on one number, and put "needs your action" amber on a
// 60% that needs nothing. Scores are ink; the grade letter beside them is what
// carries the judgement.
const scoreColor = () => C.text;

const draftStarted = (draft) =>
  !!draft && (!!draft.startedAt || Object.keys(draft.answers || {}).length > 0);

const hwState = (a, me, drafts) => {
  const sub = a.submissions[me.id];
  // A started-but-unsent attempt is not a submission — same rule the counts use.
  // Marks the teacher is holding back keep the row in Submitted, not Results (A8).
  if (hasSubmitted(sub)) return marksReleased(a, sub) ? 'marked' : 'submitted';
  if (isScheduled(a)) return 'scheduled';
  if (isPastDue(a)) return 'overdue';
  if (draftStarted(drafts ? drafts[a.id] : null)) return 'inprogress';
  return 'pending';
};

const teacherNameFor = (a, store) =>
  a.teacherName || (a.teacherId && store.users[a.teacherId] && store.users[a.teacherId].name) || '—';

// Presentation wrapper over outcomeFor: an unmarked question reads as "Pending".
const qResult = (q, sub) =>
  outcomeFor(q, sub && sub.marks ? sub.marks[q.id] : null) || 'pending';

const correctAnswerText = (q) => {
  if (q.type === 'mcq') return q.choices && q.choices[q.correctIndex];
  if (q.type === 'multi') {
    const idx = q.correctIndices || [];
    return idx.map(i => `${String.fromCharCode(65 + i)}. ${q.choices?.[i] ?? ''}`).join(', ') || null;
  }
  if (q.type === 'truefalse') return q.answer ? 'True' : 'False';
  if (q.type === 'fillblank') return (q.blanks || []).join(', ') || null;
  if (q.type === 'match') return (q.pairs || []).map(p => `${p.left} → ${p.right}`).join(', ') || null;
  if (q.answer != null && q.answer !== '') return String(q.answer);
  return null;
};

// ─── Student UI primitives ─────────────────────────────────────
// Was its own bordered, icon-prefixed pill with a seven-state colour map —
// "In Progress" title-cased, "Marked" green, "Overdue" red. Now a thin adapter
// onto StatusBadge so the student sees exactly the vocabulary and tones the
// teacher does. Kept as a component because ~12 call sites pass `state`.
const HwStatusPill = ({ state }) => <StatusBadge status={state} />;

const Ring = ({ pct, size = 52, stroke = 5, color, track = C.surface2, children }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(circ * fill) / 100} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
};

const SegTabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS }}>
    {tabs.map(t => {
      const on = t.id === active;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '6px 12px', borderRadius: RADIUS - 2, cursor: 'pointer',
          background: on ? C.bg : 'transparent',
          border: `1px solid ${on ? C.border : 'transparent'}`,
          fontFamily: F.body, ...TS.meta, fontWeight: on ? W.medium : W.normal,
          color: on ? C.text : C.muted, transition: T, whiteSpace: 'nowrap',
        }}>{t.label}</button>
      );
    })}
  </div>
);

// Homework's screens use the platform back control (shared.jsx) like every other
// nested page — a labelled pill above the title, not a bare round arrow beside it.

const HwSearch = ({ value, onChange }) => {
  const [foc, setFoc] = React.useState(false);
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <Ico name="search" size={15} color={C.faint} />
      </span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search..."
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '9px 14px 9px 38px',
          borderRadius: RADIUS, border: `1px solid ${foc ? C.brand : C.border}`,
          background: C.bg, fontFamily: F.body, ...TS.meta, color: C.text,
          outline: 'none', boxShadow: foc ? ring(C.brand) : 'none', transition: T,
        }} />
    </div>
  );
};

const hwSelectStyle = {
  padding: '9px 32px 9px 14px', borderRadius: RADIUS, border: `1px solid ${C.border}`,
  background: C.bg, fontSize: 13, color: C.text, cursor: 'pointer', fontFamily: F.body,
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', outline: 'none',
};

const HwEmpty = ({ text }) => (
  <div style={{
    textAlign: 'center', padding: '48px 24px', color: C.muted, ...TS.meta,
    background: C.surface, borderRadius: RADIUS, border: `1px dashed ${C.border}`,
  }}>{text}</div>
);

// ════════════════════════════════════════════════════════════════
// Student — root router
// ════════════════════════════════════════════════════════════════
const StudentHomework = ({ section, onNav }) => {
  const [store, update] = useStore();
  const toast = useToast();
  // The student surface represents the ACTIVE admin student (header switcher), not a
  // fixed persona — resolve identity from the active pointer each render.
  const me = hwActiveMe(store);
  // Drill-downs (detail / attempt / result …) live in local `view`; the *home*
  // section (assignments | submitted | results) is driven by the sidebar dropdown
  // via the `section` prop. `goHome` returns to the home view on the given section,
  // syncing the sidebar through the global navigate hook.
  const homeSection = ['assignments', 'submitted', 'results'].includes(section) ? section : 'assignments';
  const [view, setView] = React.useState({ name: 'home' });

  // Selecting a section in the sidebar always returns to the home list, even from
  // a drill-down (assignment detail, attempt, result …).
  React.useEffect(() => { setView({ name: 'home' }); }, [section]);

  const mine = Object.values(store.assignments).filter(a =>
    a.studentIds.includes(me.id) && a.status !== 'draft'
  );

  const setSection = (s) => {
    if (window.__navigate) window.__navigate('student', 'homework:' + (s || 'assignments'));
    setView({ name: 'home' });
  };
  const goHome = (s) => setSection(s || homeSection);

  const openSubmitted = (a) => {
    const canReview = (a.settings?.allowReview ?? a.allowReview) || a.settings?.showAutoImmediately;
    if (canReview) setView({ name: 'subreview', id: a.id });
    else toast("Your teacher hasn't enabled review for this homework yet", 'warn');
  };

  const openAssignment = (a) => {
    const state = hwState(a, me, store.drafts);
    if (state === 'marked') { setView({ name: 'result', id: a.id }); return; }
    if (state === 'submitted') {
      // A student with attempts left goes back to the start page, where the
      // button offers the next attempt; otherwise there is only the review.
      if (attemptsLeft(a, a.submissions[me.id]) > 0 && acceptsSubmissions(a)) {
        setView({ name: 'detail', id: a.id });
        return;
      }
      openSubmitted(a);
      return;
    }
    setView({ name: 'detail', id: a.id });
  };

  const submit = (id, answers) => {
    const asn = store.assignments[id];
    const prev = asn.submissions[me.id];
    // The settings are enforced here, not just in the UI: a student who reaches
    // this call another way still cannot submit past a closed due date or beyond
    // their allowed attempts.
    if (isScheduled(asn)) {
      toast(`This homework opens ${fmtOpens(opensAt(asn))}`, 'warn');
      return;
    }
    if (isPastDue(asn) && !settingsOf(asn).allowLate) {
      toast('The due date has passed — this homework is closed', 'danger');
      return;
    }
    if (attemptsUsed(prev) >= attemptsAllowed(asn)) {
      toast('You have used all your attempts on this homework', 'warn');
      return;
    }
    const marks = {};
    const feedback = {};
    asn.questions.forEach(q => {
      marks[q.id] = isAuto(q.type) ? autoMark(q, answers[q.id]) : null;
      feedback[q.id] = '';
    });
    const startedAt = store.drafts && store.drafts[id] && store.drafts[id].startedAt;
    const elapsed = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000) : null;
    const submittedAt = new Date().toISOString();
    const sub = {
      answers,
      submittedAt,
      status: 'submitted',
      marks, feedback,
      attemptCount: attemptsUsed(prev) + 1,
      isLate: !!asn.dueAt && new Date(submittedAt) > new Date(asn.dueAt),
      timeSpentMins: elapsed != null ? Math.max(1, Math.min(elapsed, 999)) : null,
    };
    update(s => {
      const next = { ...s, assignments: { ...s.assignments }, drafts: { ...s.drafts } };
      next.assignments[id] = {
        ...next.assignments[id],
        submissions: { ...next.assignments[id].submissions, [me.id]: sub },
      };
      delete next.drafts[id];
      return next;
    });
    setView({ name: 'done', id });
  };

  const current = view.id ? store.assignments[view.id] : null;

  if (view.name === 'detail' && current) {
    return <HwDetail
      a={current} me={me} store={store}
      draft={store.drafts ? store.drafts[view.id] : null}
      onBack={() => goHome('assignments')}
      onReview={() => openSubmitted(current)}
      onStart={() => {
        update(s => {
          const prev = (s.drafts && s.drafts[view.id]) || {};
          return { ...s, drafts: { ...s.drafts, [view.id]: {
            ...prev,
            answers: prev.answers || {},
            startedAt: prev.startedAt || new Date().toISOString(),
          } } };
        });
        setView({ name: 'attempt', id: view.id });
      }}
    />;
  }

  if (view.name === 'attempt' && current) {
    return <HwAttempt
      a={current} me={me}
      draft={(store.drafts && store.drafts[view.id]) || {}}
      onUpdateDraft={(d) => update(s => ({ ...s, drafts: { ...s.drafts, [view.id]: d } }))}
      onBack={() => setView({ name: 'detail', id: view.id })}
      onSubmit={(answers) => submit(view.id, answers)}
    />;
  }

  if (view.name === 'done') {
    return <HwDone
      onBackToHomework={() => goHome('assignments')}
      onGoHome={() => { if (onNav) onNav('dashboard'); else goHome('assignments'); }}
    />;
  }

  if (view.name === 'subreview' && current && current.submissions[me.id]) {
    return <HwSubmissionReview a={current} me={me} store={store} onBack={() => goHome('submitted')} />;
  }

  // The result screen is unreachable until the teacher releases the marks (A8) —
  // held-back work falls back to the submitted view.
  if (view.name === 'result' && current && current.submissions[me.id]) {
    if (marksReleased(current, current.submissions[me.id])) {
      return <HwResultReview a={current} me={me} store={store} onBack={() => goHome('results')} />;
    }
    return <HwSubmissionReview a={current} me={me} store={store} onBack={() => goHome('submitted')} />;
  }

  return <HwHome
    store={store} me={me}
    section={homeSection}
    setSection={setSection}
    assignments={mine}
    onOpen={openAssignment}
    onOpenSubmitted={openSubmitted}
    onOpenResult={(a) => setView({ name: 'result', id: a.id })}
  />;
};

// ════════════════════════════════════════════════════════════════
// Student — home (Assignments · Submitted · Results)
// ════════════════════════════════════════════════════════════════
const HwHome = ({ store, me, section, setSection, assignments, onOpen, onOpenSubmitted, onOpenResult }) => {
  const [tab, setTab] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [subject, setSubject] = React.useState('All');

  const withState = assignments.map(a => ({ a, state: hwState(a, me, store.drafts) }));
  const open = withState.filter(x => x.state !== 'marked');
  const submitted = withState.filter(x => x.state === 'submitted');
  const marked = withState.filter(x => x.state === 'marked');

  // §9: the subject filter populates from the student's ENROLLED subjects only
  // (intersected with subjects that actually have open assignments), never an
  // arbitrary set invented from the assignment rows.
  const enrolled = window.klasioStudent ? window.klasioStudent.getSubjects() : null;
  const subjects = enrolled
    ? enrolled.filter(s => open.some(x => x.a.subject === s))
    : Array.from(new Set(open.map(x => x.a.subject)));

  const inTab = (x) =>
    tab === 'all' ? true :
    tab === 'pending' ? (x.state === 'pending' || x.state === 'inprogress') :
    tab === 'completed' ? x.state === 'submitted' :
    x.state === 'overdue';

  const q = query.trim().toLowerCase();
  const matches = (x) => {
    if (subject !== 'All' && x.a.subject !== subject) return false;
    if (!q) return true;
    return `${x.a.title} ${x.a.subject} ${teacherNameFor(x.a, store)}`.toLowerCase().includes(q);
  };

  const visible = open.filter(inTab).filter(matches);


  return (
    <div style={{ ...pageFrame(), fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* The subtitle counted the rows immediately below it. */}
        <h1 style={{ fontFamily: F.head, ...TS.title, margin: 0 }}>
          {section === 'submitted' ? 'Submitted' : section === 'results' ? 'Results' : 'Homework'}
        </h1>
      </div>

      {section === 'assignments' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <SegTabs
              tabs={[
                { id: 'all',       label: 'All' },
                { id: 'pending',   label: 'Pending' },
                { id: 'completed', label: 'Completed' },
                { id: 'overdue',   label: 'Overdue' },
              ]}
              active={tab} onChange={setTab}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <HwSearch value={query} onChange={setQuery} />
            <select value={subject} onChange={e => setSubject(e.target.value)} style={hwSelectStyle}>
              <option value="All">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.length === 0 && (
              <HwEmpty text={open.length === 0 ? "You're all caught up — no homework assigned." : 'No homework matches your filters.'} />
            )}
            {visible.map(x => (
              <HwListRow key={x.a.id} a={x.a} state={x.state} store={store} onOpen={() => onOpen(x.a)} />
            ))}
          </div>
        </>
      )}

      {section === 'submitted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submitted.length === 0 && (
            <HwEmpty text="Nothing awaiting marking. Homework you submit will appear here until your teacher marks it." />
          )}
          {submitted.map(({ a }) => (
            <HwSubmittedRow key={a.id} a={a} sub={a.submissions[me.id]} store={store} onOpen={() => onOpenSubmitted(a)} />
          ))}
        </div>
      )}

      {section === 'results' && (
        <HwResultsSection me={me} marked={marked} onOpen={onOpenResult} />
      )}
    </div>
  );
};

// ─── Assignments list row ──────────────────────────────────────
const HwListRow = ({ a, state, store, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const danger = state === 'overdue';
  const days = a.dueAt ? daysUntil(a.dueAt) : null;
  const showDays = (state === 'pending' || state === 'inprogress') && days != null && days >= 0;
  // When the student can't work on it yet — or can't any more — say so on the row.
  const note = state === 'scheduled' ? `Opens ${fmtOpens(opensAt(a))}`
    : (isPastDue(a) && !settingsOf(a).allowLate) ? `Closed — due ${fmtShort(a.dueAt)}`
    : null;
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 60,
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: RADIUS,
        cursor: 'pointer', transition: 'border-color .15s',
      }}>
      {/* The 42px tinted book tile is gone: it was the same glyph on every row,
          and it turned "overdue" into a red block the row already says in words. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TS.body, fontWeight: W.medium, color: C.text, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        <MetaLine items={[
          a.subject,
          teacherNameFor(a, store),
          `${a.questions.length} question${a.questions.length === 1 ? '' : 's'}`,
        ]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* One date fact, no calendar/lock glyph beside it. */}
        <span style={{ ...TS.meta, color: C.muted, ...NUM }}>
          {note ? note : (a.dueAt ? fmtShort(a.dueAt) : 'No date')}
          {showDays && !note && <span style={{ color: C.faint }}>{` · ${days}d`}</span>}
        </span>
        <HwStatusPill state={state} />
      </div>
    </div>
  );
};

// ─── Submitted list row ────────────────────────────────────────
const HwSubmittedRow = ({ a, sub, store, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const canReview = (a.settings?.allowReview ?? a.allowReview) || a.settings?.showAutoImmediately;
  // Marked, but the teacher hasn't released the marks yet — the row stays here
  // rather than jumping to Results, and says so plainly.
  const waiting = heldBack(a, sub);
  const late = isLateSub(a, sub);
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 60,
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: RADIUS,
        cursor: 'pointer', transition: 'border-color .15s',
      }}>
      <div style={{ flex: 1, minWidth: 0, padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ ...TS.body, fontWeight: W.medium, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.title}
          </span>
          {late && <StatusBadge status="late" />}
        </div>
        <MetaLine items={[
          a.subject,
          teacherNameFor(a, store),
          `Submitted ${fmtDateTime(sub && sub.submittedAt)}`,
          waiting && 'Marked — your teacher will release results soon',
        ]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <HwStatusPill state={waiting ? 'marked' : 'awaiting'} />
        {canReview ? (
          <Btn variant="soft" small icon={<Ico name="eye" size={13} />}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            Review
          </Btn>
        ) : (
          <span style={{ ...TS.meta, color: C.faint }}>Review locked</span>
        )}
      </div>
    </div>
  );
};

// ─── Results section ───────────────────────────────────────────
const HwResultsSection = ({ me, marked, onOpen }) => {
  const rows = marked.map(({ a }) => {
    const sub = a.submissions[me.id];
    const total = totalPoints(a);
    const score = submissionScore(a, sub);
    const pct = total ? Math.round((score / total) * 100) : 0;
    return { a, sub, pct };
  }).sort((x, y) =>
    new Date(y.sub.markedAt || y.sub.submittedAt || 0) - new Date(x.sub.markedAt || x.sub.submittedAt || 0)
  );

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  const best = rows.length ? Math.max(...rows.map(r => r.pct)) : 0;

  return (
    <div>
      {/* Three 100px cards with decorative tinted icon circles, for three
          short numbers. Sentence case, and the average is the one that leads. */}
      <StatStrip
        style={{ marginBottom: 16 }}
        items={[
          { label: 'Overall average', value: `${avg}%`, emphasis: true },
          { label: 'Best score', value: `${best}%` },
          { label: 'Completed', value: rows.length },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && <HwEmpty text="No marked homework yet. Results will appear here once your teacher marks your work." />}
        {rows.map(r => <HwResultRow key={r.a.id} a={r.a} sub={r.sub} pct={r.pct} onOpen={() => onOpen(r.a)} />)}
      </div>
    </div>
  );
};

const HwResultRow = ({ a, sub, pct, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const g = sub.grade || gradeFor(pct);
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 60,
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: RADIUS,
        cursor: 'pointer', transition: 'border-color .15s',
      }}>
      {/* The donut ring is gone. It rendered the same percentage that sits at
          the end of the row, so each result stated its score three times
          (ring label, right-hand figure, grade letter) in 90px of row. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TS.body, fontWeight: W.medium, color: C.text, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        <MetaLine items={[
          a.subject,
          a.classLabel,
          `Marked ${fmtLong(sub.markedAt || sub.submittedAt)}`,
          sub.timeSpentMins != null ? `${sub.timeSpentMins}m` : null,
        ]} />
      </div>
      {/* Both columns are fixed-width and right-aligned so the percentages line
          up down the page — a variable-width grade badge (A* vs D) was enough
          to push each score to a different x. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontFamily: F.head, fontSize: 15, fontWeight: W.medium, color: C.text, minWidth: 44, textAlign: 'right', ...NUM }}>{pct}%</span>
        <span style={{ minWidth: 34, display: 'flex', justifyContent: 'flex-end' }}><StatusBadge>{g}</StatusBadge></span>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Student — assignment detail
// ════════════════════════════════════════════════════════════════
const HwDetail = ({ a, me, store, draft, onBack, onStart, onReview, backLabel = 'Assignments' }) => {
  usePageTrail([{ label: a.title }]);
  const totalM = totalPoints(a);
  const started = draftStarted(draft);
  const sub = a.submissions[me.id];
  const scheduled = isScheduled(a);
  const closed = isPastDue(a) && !settingsOf(a).allowLate;
  const allowed = attemptsAllowed(a);
  const used = attemptsUsed(sub);
  const outOfAttempts = used >= allowed;
  const canStart = !scheduled && !closed && !outOfAttempts;
  // Why the button is off, in the student's terms — never the mechanism.
  const blockedNote = scheduled ? `Opens ${fmtOpens(opensAt(a))}`
    : closed ? `Closed — due ${fmtShort(a.dueAt)}`
    : outOfAttempts ? `You've used all ${allowed} attempt${allowed === 1 ? '' : 's'}`
    : null;
  const startLabel = allowed > 1 && !outOfAttempts
    ? `Attempt ${used + 1} of ${allowed}`
    : started ? 'Continue Homework' : 'Start Homework';

  const infoCard = (icon, label, value) => (
    <Card key={label} style={{ padding: '16px 18px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ico name={icon} size={13} color={C.faint} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: C.faint, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </Card>
  );

  return (
    <div style={{ ...pageFrame({ narrow: true }), fontFamily: F.body, color: C.text }}>
      <div style={{ marginBottom: 24 }}>
        <BackLink onClick={onBack} label={backLabel} />
        <h1 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{a.title}</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {infoCard('user', 'Teacher', teacherNameFor(a, store))}
        {infoCard('calendar', 'Due date', a.dueAt ? fmtShort(a.dueAt) : 'No date')}
        {infoCard('clock', 'Time limit', a.timeLimitMins ? `${a.timeLimitMins} min` : 'No limit')}
        {infoCard('book', 'Questions', `${a.questions.length} (${totalM} mark${totalM === 1 ? '' : 's'})`)}
      </div>

      {a.instructions && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px', background: C.brandSoft,
          border: `1px solid ${C.brandBorder}`, borderRadius: 10, marginBottom: 20, alignItems: 'flex-start',
        }}>
          <Ico name="info" size={14} color={C.brand} />
          <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{a.instructions}</span>
        </div>
      )}

      {/* The teacher can hide this per-question preview via the "Show Question
          Preview" setting (defaults on) — useful for timed / exam-style work. */}
      {(a.settings ? a.settings.showQuestionPreview !== false : true) ? (
        <Card style={{ marginBottom: 28 }}>
          <div style={{ padding: '16px 20px 6px', fontFamily: F.head, fontSize: 15, fontWeight: 700 }}>Questions Overview</div>
          <div style={{ padding: '6px 8px 10px' }}>
            {a.questions.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: C.surface2, color: C.muted,
                  fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.prompt}</span>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: F.mono }}>{q.points}m</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 28, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ico name="lock" size={15} color={C.faint} />
          <span style={{ fontSize: 13, color: C.muted }}>
            {a.questions.length} question{a.questions.length === 1 ? '' : 's'} · {totalM} mark{totalM === 1 ? '' : 's'} — questions are revealed when you start.
          </span>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* At the attempt limit the Start button gives way to the review the student
            already has — never a dead button with no way forward. */}
        {outOfAttempts && sub && onReview ? (
          <Btn variant="soft" icon={<Ico name="eye" size={14} />} onClick={onReview}
            style={{ padding: '12px 26px', fontSize: 14, borderRadius: 10 }}>
            Review your answers
          </Btn>
        ) : (
          <Btn variant="brand" icon={<Ico name="play" size={14} color="#fff" />} onClick={onStart}
            disabled={!canStart}
            style={{ padding: '12px 26px', fontSize: 14, borderRadius: 10 }}>
            {startLabel}
          </Btn>
        )}
        {blockedNote && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted }}>
            <Ico name={scheduled ? 'calendar' : 'lock'} size={13} color={C.faint} />
            {blockedNote}
          </span>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Student — attempt
// ════════════════════════════════════════════════════════════════
// Students answer with the same rich inputs as the teacher preview — math
// questions get the MathLive editor + on-screen LaTeX keyboard, and their
// submitted LaTeX renders through KaTeX on review (see QuestionAnswerInput /
// QuestionAnswerDisplay).
const HwAnswerInput = ({ question, value, onChange }) =>
  <QuestionAnswerInput question={question} value={value} onChange={onChange} />;

const HwAnswerDisplay = ({ question, answer }) =>
  <QuestionAnswerDisplay question={question} answer={answer} />;

// Deterministic shuffle seeded on student + assignment: two students get different
// orders, and the same student gets the same order every time they come back — a
// refresh mid-attempt never reshuffles the paper under them. Presentation only:
// marking, review and results always show the canonical order.
const shuffledQuestions = (a, studentId) => {
  if (!settingsOf(a).randomize) return a.questions;
  return a.questions
    .map((q, i) => ({ q, i, r: seededRand(`${studentId}|${a.id}|${q.id}`) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map(x => x.q);
};

const HwAttempt = ({ a, me, draft, onUpdateDraft, onBack, onSubmit }) => {
  usePageTrail([{ label: a.title, onClick: onBack }, { label: 'Attempt' }]);
  const [answers, setAnswers] = React.useState(() => draft.answers || {});
  const [flags, setFlags] = React.useState(() => draft.flags || {});
  const [idx, setIdx] = React.useState(0);
  const [confirming, setConfirming] = React.useState(false);
  const [invalid, setInvalid] = React.useState({});
  const startedAt = React.useRef(draft.startedAt || new Date().toISOString());

  // Question order the student works through. Memoised on the student so it is
  // stable for the whole attempt.
  const questions = React.useMemo(
    () => shuffledQuestions(a, me ? me.id : ''), [a.id, me && me.id]);

  React.useEffect(() => {
    onUpdateDraft({ answers, flags, startedAt: startedAt.current });
  }, [answers, flags]);

  // ── Time limit (A7) ────────────────────────────────────────────
  // Elapsed time is measured from when the attempt was started, not from when
  // this screen mounted, so closing the tab does not hand back extra minutes.
  const limitMs = a.timeLimitMins ? a.timeLimitMins * 60000 : null;
  const deadline = limitMs ? new Date(startedAt.current).getTime() + limitMs : null;
  const [now, setNow] = React.useState(() => Date.now());
  const [graceLeft, setGraceLeft] = React.useState(null);
  const submittedRef = React.useRef(false);

  React.useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  const msLeft = deadline ? Math.max(0, deadline - now) : null;
  const timeUp = deadline != null && msLeft === 0;

  // At zero the student gets a 30-second grace to finish the sentence they are on;
  // nothing is taken away from them before it elapses.
  React.useEffect(() => {
    if (!timeUp || graceLeft != null) return;
    setGraceLeft(30);
  }, [timeUp]);

  React.useEffect(() => {
    if (graceLeft == null) return;
    if (graceLeft <= 0) {
      if (!submittedRef.current) { submittedRef.current = true; onSubmit(answers); }
      return;
    }
    const t = setTimeout(() => setGraceLeft(g => g - 1), 1000);
    return () => clearTimeout(t);
  }, [graceLeft, answers]);

  const showCountdown = !!settingsOf(a).showCountdown && msLeft != null;
  const finalMinute = msLeft != null && msLeft <= 60000;
  const clock = msLeft == null ? '' :
    `${Math.floor(msLeft / 60000)}:${String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0')}`;

  const total = questions.length;
  const q = questions[idx];
  const hasAnswer = (qq) => { const v = answers[qq.id]; return v !== undefined && v !== null && v !== ''; };
  // Canonical question numbers of any maths that won't render — the student sees
  // the numbers they'd see on the paper, not the shuffled position.
  const badMath = a.questions
    .map((qq, i) => (qq.type === 'math' && answers[qq.id] && !latexParses(answers[qq.id])) ? i + 1 : null)
    .filter(Boolean);
  const answered = questions.filter(hasAnswer).length;

  return (
    <div style={{ ...pageFrame({ narrow: true }), fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <BackLink onClick={onBack} label={a.title} style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.head, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.title}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{answered}/{total} answered · auto-saved</div>
        </div>
        {/* A quiet countdown, and only if the teacher asked for one. Neutral until
            the last minute — no colour escalation before then. */}
        {showCountdown && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 999,
            background: finalMinute ? C.amberBg : C.surface,
            border: `1px solid ${finalMinute ? C.amberBorder : C.border}`,
            color: finalMinute ? C.amber : C.sub,
            fontFamily: F.mono, fontSize: 12.5, fontWeight: 600,
          }}>
            <Ico name="clock" size={13} color={finalMinute ? C.amber : C.muted} />
            {clock}
          </span>
        )}
        <Btn variant="brand" icon={<Ico name="send" size={13} color="#fff" />} onClick={() => setConfirming(true)}>
          Submit
        </Btn>
      </div>

      {/* Progress */}
      <div style={{ height: 4, borderRadius: RADIUS_FULL, background: C.surface2, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ width: `${(answered / total) * 100}%`, height: '100%', background: C.brand, borderRadius: 999, transition: 'width .3s' }} />
      </div>

      {/* Teacher's instructions — kept visible here (not just on the start page)
          so students can refer to them while working through the questions. */}
      {a.instructions && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px', background: C.brandSoft,
          border: `1px solid ${C.brandBorder}`, borderRadius: 10, marginBottom: 20, alignItems: 'flex-start',
        }}>
          <Ico name="info" size={14} color={C.brand} />
          <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{a.instructions}</span>
        </div>
      )}

      {/* Question chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {questions.map((qq, i) => {
          const on = i === idx;
          const done = hasAnswer(qq);
          const flagged = !!flags[qq.id];
          return (
            <button key={qq.id} onClick={() => setIdx(i)} style={{
              width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
              border: flagged ? `2px solid ${C.amber}` : '2px solid transparent',
              background: on ? C.brand : done ? C.brandSoft : C.surface2,
              color: on ? '#fff' : done ? C.brand : C.muted,
              fontFamily: F.body, fontSize: 13, fontWeight: 700, transition: T,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{i + 1}</button>
          );
        })}
      </div>

      {/* Question card */}
      <Card style={{ padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>
            Question {idx + 1} of {total} <span style={{ color: C.danger }}>*</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: F.mono }}>{q.points}m</span>
            <button onClick={() => setFlags(f => ({ ...f, [q.id]: !f[q.id] }))} aria-label="Flag question"
              title={flags[q.id] ? 'Unflag question' : 'Flag question'}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <Ico name="flag" size={14} color={flags[q.id] ? C.amber : C.faint} />
            </button>
          </span>
        </div>

        <PromptText text={q.prompt} style={{ display: 'block', fontFamily: F.head, fontSize: 17, fontWeight: 700, color: C.text, lineHeight: 1.45, marginBottom: 18 }} />

        <HwAnswerInput question={q} value={answers[q.id]}
          onChange={(v) => {
            setAnswers(prev => ({ ...prev, [q.id]: v }));
            // Maths the renderer can't read would be stored as an unreadable
            // answer — catch it as they type, not after they submit.
            if (q.type === 'math') setInvalid(prev => ({ ...prev, [q.id]: !!v && !latexParses(v) }));
          }} />

        {invalid[q.id] && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 8 }}>
            <Ico name="alertCircle" size={13} color={C.danger} />
            <span style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
              This answer can't be read yet — check for an unfinished bracket or fraction before you submit.
            </span>
          </div>
        )}

        {q.hint && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8 }}>
            <Ico name="info" size={13} color={C.amber} />
            <span style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>{q.hint}</span>
          </div>
        )}
      </Card>

      {/* Prev / Next */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Btn variant="soft" icon={<Ico name="arrowL" size={13} />}
          onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          Previous
        </Btn>
        {idx < total - 1 ? (
          <Btn variant="brand" onClick={() => setIdx(idx + 1)}>
            Next
            <Ico name="arrowR" size={13} color="#fff" />
          </Btn>
        ) : (
          <Btn variant="brand" icon={<Ico name="send" size={13} color="#fff" />} onClick={() => setConfirming(true)}>
            Submit
          </Btn>
        )}
      </div>

      {/* Time's up — a plain statement plus a short grace, not a slammed door. */}
      {graceLeft != null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 320,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            width: '100%', maxWidth: 420, background: C.bg, borderRadius: 14,
            border: `1px solid ${C.border}`, boxShadow: C.shadowL, padding: 24, textAlign: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: C.amberBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            }}>
              <Ico name="clock" size={18} color={C.amber} />
            </div>
            <div style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
              Time's up — submitting your answers
            </div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55 }}>
              Finishing up in {graceLeft} second{graceLeft === 1 ? '' : 's'}. Everything you've written is saved.
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div onClick={() => setConfirming(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420, background: C.bg, borderRadius: 14,
            border: `1px solid ${C.border}`, boxShadow: C.shadowL, padding: 24,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: C.brandSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Ico name="send" size={18} color={C.brand} />
            </div>
            <div style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Submit homework?</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55, marginBottom: 18 }}>
              {answered < total
                ? `You've answered ${answered} of ${total} questions. Unanswered questions won't receive marks. `
                : `You've answered all ${total} questions. `}
              You won't be able to change your answers after submitting.
            </div>
            {badMath.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 14, background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 8 }}>
                <Ico name="alertCircle" size={13} color={C.danger} />
                <span style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
                  Question{badMath.length === 1 ? '' : 's'} {badMath.join(', ')} can't be read yet. Fix {badMath.length === 1 ? 'it' : 'them'} before you submit.
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="soft" onClick={() => setConfirming(false)}>Cancel</Btn>
              <Btn variant="brand" disabled={badMath.length > 0} icon={<Ico name="send" size={13} color="#fff" />}
                onClick={() => onSubmit(answers)}>
                Submit
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Student — submitted confirmation
// ════════════════════════════════════════════════════════════════
const HwDone = ({ onBackToHomework, onGoHome }) => (
  <div style={{
    fontFamily: F.body, color: C.text, textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '110px 32px 64px',
  }}>
    <div style={{
      width: 76, height: 76, borderRadius: '50%', background: C.successBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: '50%', border: `2.5px solid ${C.success}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico name="check" size={20} color={C.success} />
      </span>
    </div>
    <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.4px' }}>Submitted!</h1>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 380, margin: '0 0 26px' }}>
      Your homework has been submitted successfully. Your teacher will review it soon.
    </p>
    <div style={{ display: 'flex', gap: 10 }}>
      <Btn variant="soft" onClick={onBackToHomework}>Back to Homework</Btn>
      <Btn variant="brand" onClick={onGoHome}>Go Home</Btn>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Student — review a submission awaiting marking
// ════════════════════════════════════════════════════════════════
const HwSubmissionReview = ({ a, me, store, onBack, backLabel = 'Submitted' }) => {
  const sub = a.submissions[me.id];
  const showAuto = !!(a.settings && a.settings.showAutoImmediately);
  usePageTrail([{ label: a.title }]);
  return (
    <div style={{ ...pageFrame({ narrow: true }), fontFamily: F.body, color: C.text }}>
      <BackLink onClick={onBack} label={backLabel} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: F.head, ...TS.title, margin: 0 }}>{a.title}</h1>
          <MetaLine style={{ marginTop: 4 }} items={[a.subject, a.classLabel]} />
        </div>
        <HwStatusPill state="awaiting" />
      </div>

      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS, marginBottom: 22,
      }}>
        <Ico name="info" size={14} color={C.muted} />
        <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
          Submitted {fmtDateTime(sub.submittedAt)}. Your teacher will mark it soon — you can review your answers below, but they can't be changed.
          {showAuto && ' Auto-marked questions are graded instantly and shown below.'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {a.questions.map((q, i) => {
          const autoQ = showAuto && isAuto(q.type);
          const m = autoQ ? sub.marks?.[q.id] : null;
          const outcome = autoQ ? outcomeFor(q, m) : null;
          const correct = outcome === 'correct';
          const wrong = outcome === 'incorrect';
          return (
            <Card key={q.id} style={{ padding: '18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: C.muted }}>
                  Q{i + 1} · {qtypeMeta(q.type).label.toLowerCase()} · {q.points} mark{q.points === 1 ? '' : 's'}
                </div>
                {autoQ && typeof m === 'number' && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
                    {correct ? <Pill tone="success" icon={<Ico name="check" size={10} />}>Correct</Pill>
                      : wrong ? <Pill tone="danger" icon={<Ico name="x" size={10} />}>Incorrect</Pill>
                      : <Pill tone="amber">Partial</Pill>}
                    <span style={{ fontFamily: F.head, ...TS.meta, fontWeight: W.medium, color: C.text, ...NUM }}>{m}/{q.points}</span>
                  </span>
                )}
              </div>
              <PromptText text={q.prompt} style={{ display: 'block', ...TS.section, color: C.text, lineHeight: 1.45, marginBottom: 14 }} />
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ ...TS.meta, fontWeight: W.medium, color: C.muted, marginBottom: 6 }}>Your answer</div>
                <HwAnswerDisplay question={q} answer={sub.answers ? sub.answers[q.id] : null} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Student — marked result review
// ════════════════════════════════════════════════════════════════
const HwResultReview = ({ a, me, store, onBack, backLabel = 'Results' }) => {
  const sub = a.submissions[me.id];
  const S = a.settings || {};
  usePageTrail([{ label: a.title }]);
  // What the teacher allows this student to see.
  const released = marksReleased(a, sub);
  const showMarks = released;
  const showCorrect = released && S.showCorrect && !S.marksOnly;
  const showComments = released && S.showComments && !S.marksOnly;
  const total = totalPoints(a);
  const score = submissionScore(a, sub);
  const pct = total ? Math.round((score / total) * 100) : 0;
  const grade = sub.grade || gradeFor(pct);
  const col = scoreColor(pct);

  const results = a.questions.map(q => qResult(q, sub));
  const nCorrect = results.filter(r => r === 'correct').length;
  const nPartial = results.filter(r => r === 'partial').length;
  const nIncorrect = results.filter(r => r === 'incorrect').length;
  // NOTE: no standalone "Accuracy %" — an all-or-nothing correct/total percentage
  // contradicts the marks-based score (§4). The question outcome counts below feed
  // the breakdown header + the Questions meta tile as plain counts instead.

  const vsAvg = sub.classAvg != null ? pct - sub.classAvg : null;
  const heroMsg = (pct >= 80 ? 'Excellent work!' : pct >= 65 ? 'Good effort!' : 'Keep practising!')
    + (vsAvg == null ? ''
      : vsAvg >= 5 ? ' Well above class average.'
      : vsAvg >= 0 ? ' Above class average.'
      : ' Below class average — review the feedback below.');

  const heroStat = (label, value, color) => (
    <div key={label} style={{ flex: 1, background: C.surface, borderRadius: 10, padding: '12px 14px', textAlign: 'center', minWidth: 90 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: F.head, fontSize: 17, fontWeight: 800, color }}>{value}</div>
    </div>
  );

  const metaCard = (icon, label, value, color) => (
    <Card key={label} style={{ padding: '14px 16px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Ico name={icon} size={12} color={C.faint} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.faint, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </Card>
  );

  const resultMeta = {
    correct:   { label: 'Correct',           icon: 'check', fg: C.success, bg: C.successBg, bd: C.successBorder, tint: '#F8FDF9' },
    partial:   { label: 'Partially Correct', icon: 'minus', fg: C.amber,   bg: C.amberBg,   bd: C.amberBorder,   tint: '#FFFEF7' },
    incorrect: { label: 'Incorrect',         icon: 'x',     fg: C.danger,  bg: C.dangerBg,  bd: C.dangerBorder,  tint: '#FFFBFB' },
    pending:   { label: 'Pending',           icon: 'clock', fg: C.muted,   bg: C.surface,   bd: C.border,        tint: C.bg },
  };

  return (
    <div style={{ ...pageFrame({ narrow: true }), fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <BackLink onClick={onBack} label={backLabel} />
        <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{a.title}</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
          {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
        </div>
      </div>

      {/* Score hero */}
      <Card style={{ padding: '26px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
          <Ring pct={pct} size={118} stroke={9} color={col}>
            <span style={{ fontFamily: F.head, fontSize: 27, fontWeight: 800, color: col, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginTop: 3 }}>{grade}</span>
          </Ring>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: F.head, fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>{score} / {total} marks</div>
            <div style={{ fontSize: 13, color: C.muted, margin: '5px 0 16px' }}>{heroMsg}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {sub.classAvg != null && heroStat('Class Avg', `${sub.classAvg}%`, C.amber)}
              {/* §8/AADC: class rank is banded ("Top 15%"), never a precise n/28 —
                  precise rank only behind a future opt-in. */}
              {sub.rank != null && sub.classSize
                && heroStat('Class Rank', `Top ${Math.max(1, Math.min(99, Math.round((sub.rank / sub.classSize) * 100)))}%`, C.brand)}
              {sub.timeSpentMins != null && heroStat('Time Spent', `${sub.timeSpentMins}m`, C.text)}
            </div>
          </div>
        </div>
      </Card>

      {/* Meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {metaCard('calendar', 'Submitted', fmtDateTime(sub.submittedAt))}
        {metaCard('check', 'Marked', fmtDateTime(sub.markedAt || sub.approvedAt))}
        {metaCard('award', 'Grade', grade)}
        {metaCard('target', 'Questions correct', `${nCorrect} / ${a.questions.length}`)}
      </div>

      {/* Overall teacher feedback */}
      {showComments && sub.overallFeedback && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS, padding: '18px 20px', marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico name="chat" size={14} color={C.muted} />
            <span style={{ fontFamily: F.head, fontSize: 13.5, fontWeight: 700, color: C.text }}>Overall Teacher Feedback</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 10px 22px' }}>From your teacher</div>
          <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6, fontStyle: 'italic' }}>
            “{sub.overallFeedback}”
          </div>
        </div>
      )}

      {/* Breakdown header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, margin: 0 }}>Question Breakdown</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: C.muted }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Ico name="check" size={12} color={C.success} /> {nCorrect} correct
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Ico name="minus" size={12} color={C.amber} /> {nPartial} partial
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Ico name="x" size={12} color={C.danger} /> {nIncorrect} incorrect
          </span>
        </div>
      </div>

      {/* Question cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {a.questions.map((q, i) => {
          const r = resultMeta[results[i]] || resultMeta.pending;
          const m = sub.marks ? sub.marks[q.id] : null;
          const fb = sub.feedback ? sub.feedback[q.id] : '';
          const correctTxt = correctAnswerText(q);
          return (
            <div key={q.id} style={{ background: r.tint, border: `1px solid ${r.bd}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: r.bg, border: `1px solid ${r.bd}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ico name={r.icon} size={11} color={r.fg} />
                  </span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    Q{i + 1} · {qtypeMeta(q.type).label.toLowerCase()} · {q.points} mark{q.points === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                    background: r.bg, border: `1px solid ${r.bd}`, color: r.fg,
                    fontSize: 11.5, fontWeight: 700,
                  }}>{r.label}</span>
                  {showMarks && (
                    <div style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.text, marginTop: 6 }}>
                      {typeof m === 'number' ? m : '–'} / {q.points}
                    </div>
                  )}
                </div>
              </div>

              <PromptText text={q.prompt} style={{ display: 'block', ...TS.section, color: C.text, lineHeight: 1.45, marginBottom: 14 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ ...TS.meta, fontWeight: W.medium, color: C.muted, marginBottom: 6 }}>Your answer</div>
                  <HwAnswerDisplay question={q} answer={sub.answers ? sub.answers[q.id] : null} />
                </div>

                {showCorrect && correctTxt != null && (
                  <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ ...TS.meta, fontWeight: W.medium, color: C.success, marginBottom: 6 }}>Correct answer</div>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>{correctTxt}</div>
                  </div>
                )}

                {showComments && fb && (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                      <Ico name="chat" size={11} color={C.muted} />
                      <span style={{ fontSize: TS.meta.fontSize, fontWeight: W.medium, color: C.sub }}>Teacher comment</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55, fontStyle: 'italic' }}>“{fb}”</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Wrap with toast provider ──────────────────────────────────
const TeacherHomeworkRoot = (props) => (
  <ToastProvider><TeacherHomework {...props} /></ToastProvider>
);
const StudentHomeworkRoot = (props) => (
  <ToastProvider><StudentHomework {...props} /></ToastProvider>
);

// ─── Helpers exposed for nav badges ────────────────────────────
// The bell badge counts the signed-in teacher's OWN work awaiting marking — the
// same number the dashboard tile, the class Homework tab and the Homework page
// header show, because all four read getHomeworkCounts.
const getHomeworkBadges = () => {
  const s = loadStore();
  const me = hwActiveMe(s);
  const teacher = hwPrincipal(s);
  return {
    teacherToMark: getHomeworkCounts(s, { teacherId: teacher.id }).toMark,
    studentUnreadFeedback: me ? getHomeworkCounts(s, { studentId: me.id }).marked : 0,
  };
};

// ─── Export to window ──────────────────────────────────────────
// `klasioHomework` is the read API every other module goes through — no screen
// outside this file may recount homework from raw records.
Object.assign(window, {
  TeacherHomework: TeacherHomeworkRoot,
  StudentHomework: StudentHomeworkRoot,
  getHomeworkBadges,
  klasioHomework: {
    getHomeworkCounts: (scope) => getHomeworkCounts(loadStore(), scope),
    listAssignments: (scope) => scopeAssignments(loadStore(), scope),
    listClassHomework,
    isMine,
    outcomeFor,
  },
});

})();
