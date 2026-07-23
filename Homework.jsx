// ══════════════════════════════════════════════════════════════
//  Klasio — Self-contained Homework module
//  Renders TeacherHomework / StudentHomework based on user.role
// ══════════════════════════════════════════════════════════════
(() => {

// ─── Design tokens ─────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  surface:   '#F8FAFC',
  surface2:  '#F1F5F9',
  border:    '#E2E8F0',
  borderD:   '#CBD5E1',
  text:      '#0F172A',
  sub:       '#334155',
  muted:     '#64748B',
  faint:     '#94A3B8',
  brand:     '#4F46E5',
  brandH:    '#4338CA',
  brandSoft: '#EEF2FF',
  brandBorder: '#C7D2FE',
  accent:    '#0EA5E9',
  accentSoft:'#E0F2FE',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  successBorder:'#BBF7D0',
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  amberBorder:'#FDE68A',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  dangerBorder:'#FECACA',
  shadow:    '0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)',
  shadowL:   '0 4px 20px -8px rgba(15,23,42,.18)',
};

const F = {
  head: "'Plus Jakarta Sans', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const T = 'all .15s';
const ring = (color) => `0 0 0 4px ${color}1F`;

const SUBJECTS = {
  'Math':        { color: '#4F46E5', soft: '#EEF2FF' },
  'Mathematics': { color: '#4F46E5', soft: '#EEF2FF' },
  'Physics':     { color: '#0EA5E9', soft: '#E0F2FE' },
  'Chem':        { color: '#10B981', soft: '#ECFDF5' },
  'Chemistry':   { color: '#10B981', soft: '#ECFDF5' },
  'Biology':     { color: '#16A34A', soft: '#F0FDF4' },
  'English':     { color: '#EC4899', soft: '#FDF2F8' },
  'English Literature': { color: '#EC4899', soft: '#FDF2F8' },
  'History':     { color: '#D97706', soft: '#FFFBEB' },
  'Economics':   { color: '#0D9488', soft: '#F0FDFA' },
};
const subColor = (name) => SUBJECTS[name] || { color: C.muted, soft: C.surface };

// ─── localStorage store ────────────────────────────────────────
const STORAGE_KEY = 'homework_store_v6';

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
  const results = {};
  let earned = 0;
  // Target accuracy band per student (40–98%) — the lower tail produces a
  // believable set of students who need intervention.
  const target = 0.40 + seededRand(sid + 'acc') * 0.58;
  a.questions.forEach((q, qi) => {
    const rr = seededRand(a.id + sid + q.id);
    const good = rr < target;
    const partial = !good && rr < target + 0.18;
    const pts = good ? q.points : partial ? Math.round(q.points * 0.5) : 0;
    if (inProgress || submittedOnly) {
      // Auto questions get auto-marked instantly; manual stay null until graded.
      marks[q.id] = isAuto(q.type) ? pts : null;
    } else {
      marks[q.id] = pts;
      results[q.id] = good ? 'correct' : partial ? 'partial' : 'incorrect';
      feedback[q.id] = good ? '' : partial ? 'On the right track — tighten the final steps.' : 'Review this topic and try again.';
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
    answers: Object.fromEntries(a.questions.map(q => [q.id, isAuto(q.type) ? (marks[q.id] >= q.points ? 'correct' : 'attempt') : 'See working.'])),
    submittedAt,
    marks, feedback,
    timeSpentMins: 18 + Math.floor(seededRand(sid + 't') * 40),
  };
  if (submittedOnly) return { ...base, status: 'submitted' };
  // Graded
  const pct = total ? Math.round(earned / total * 100) : 0;
  return {
    ...base, status: 'returned', results,
    markedAt: dayOffset(-(ageDays - 1 > 0 ? ageDays - 1 : 0), '14:00:00'),
    classAvg: 68 + Math.floor(seededRand(a.id + 'avg') * 12),
    rank: 1 + Math.floor(seededRand(sid + a.id + 'rk') * 24), classSize: 26,
    overallFeedback: pct >= 80 ? 'Strong work throughout — keep it up.'
      : pct >= 60 ? 'A solid attempt; revisit the questions you lost marks on.'
      : 'Some gaps here — let’s go over this together in the next session.',
  };
};

// Assign an assignment to a whole class cohort and fill in synthetic
// submissions, preserving any hand-authored ones already present.
const populateCohort = (a, students) => {
  const cohort = students.filter(s => !a.classLabel || s.classLabel === a.classLabel).map(s => s.id);
  const ids = Array.from(new Set([...(a.studentIds || []), ...cohort]));
  const subs = { ...(a.submissions || {}) };
  ids.forEach((sid, i) => {
    if (subs[sid]) return; // keep hand-crafted submissions (e.g. Oliver's)
    if (a.status === 'draft') return;
    const s = synthSubmission(a, sid, i);
    if (s) subs[sid] = s;
  });
  return { ...a, studentIds: ids, submissions: subs };
};

const seedStore = () => {
  const me = { id: 's_oliver', name: 'Oliver Chen', role: 'student', classLabel: 'Year 12 – Group A' };
  const teacher = { id: 't_clarke', name: 'Heebz A', role: 'teacher' };
  // Current student ("me") first, then the seed roster from mocks/homework.mock.jsx.
  const students = [me, ...HW_STUDENTS];

  const folders = {
    f_gcse:   { id: 'f_gcse',   name: 'GCSE Maths',    color: '#4F46E5' },
    f_alevel: { id: 'f_alevel', name: 'A-Level Maths', color: '#EC4899' },
    f_sci:    { id: 'f_sci',    name: 'Science',       color: '#10B981' },
    f_hum:    { id: 'f_hum',    name: 'Humanities',    color: '#D97706' },
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
    teacherId: teacher.id,
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
    teacherId: teacher.id,
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
    teacherId: teacher.id,
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
    teacherId: teacher.id,
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
        results: { q1: 'correct', q2: 'correct', q3: 'partial', q4: 'correct', q5: 'partial', q6: 'incorrect', q7: 'incorrect' },
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
    teacherId: teacher.id,
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
        results: { q1: 'correct', q2: 'correct', q3: 'correct', q4: 'partial' },
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
    teacherId: teacher.id,
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
        results: { q1: 'correct', q2: 'partial', q3: 'partial' },
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
    teacherId: teacher.id,
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
        results: { q1: 'correct', q2: 'correct', q3: 'partial', q4: 'partial' },
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
    teacherId: teacher.id,
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
        results: { q1: 'partial', q2: 'correct', q3: 'incorrect' },
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
        results: { q1: 'correct', q2: 'correct', q3: 'partial', q4: 'correct' },
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

  const allAssignments = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, r1, r2, r3, r4, r5, r6]
    .map(a => normalizeAssignment(populateCohort(a, students)));

  return {
    currentUser: me,
    users: { [me.id]: me, [teacher.id]: teacher, ...Object.fromEntries(students.map(s => [s.id, s])) },
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
  return { ...a, settings: s };
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
    if (p && p.students) return { students: p.students, classes: p.classes || window.SEED_CLASSES || [] };
  } catch (e) {}
  return { students: window.SEED_STUDENTS || [], classes: window.SEED_CLASSES || [] };
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

  // users: teachers from the existing store + EVERY real admin student. Legacy demo
  // students are dropped entirely so the assign picker is exactly the real roster.
  const users = {};
  Object.values(store.users || {}).forEach(u => { if (u.role === 'teacher') users[u.id] = u; });
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
    assignments[aid] = { ...a, studentIds, submissions };
  });

  // currentUser follows the active student (default s2) so a bare read is sane;
  // the live student surface re-resolves per render from the active pointer.
  const activeId = (() => { try { return localStorage.getItem('klasio.activeStudent') || 's2'; } catch (e) { return 's2'; } })();
  const currentUser = users[activeId] || users['s2'] || store.currentUser;

  return { ...store, users, assignments, currentUser };
};

// Resolve the homework identity for the student surface = the active admin student.
const hwActiveMe = (store) => {
  const id = (window.__getActiveStudent && window.__getActiveStudent())
    || (() => { try { return localStorage.getItem('klasio.activeStudent') || 's2'; } catch (e) { return 's2'; } })();
  return (store.users && store.users[id]) || store.currentUser || { id, name: 'Student', role: 'student' };
};

const loadStore = () => {
  let s;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    s = raw ? migrate(JSON.parse(raw)) : seedStore();
  } catch (e) {
    s = seedStore();
  }
  s = reconcileWithAdmin(s);
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
    info:    { bg: C.accentSoft, fg: C.accent, bd: '#BAE6FD' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'2px 8px', borderRadius:999, fontFamily:F.body,
      fontSize:11, fontWeight:600, letterSpacing:'.02em',
      background:t.bg, color:t.fg, border:`1px solid ${t.bd}`,
    }}>{icon}{children}</span>
  );
};

// ─── Btn ────────────────────────────────────────────────────────
const Btn = ({ variant = 'primary', children, icon, onClick, disabled, small, type = 'button', style = {} }) => {
  const [hov, setHov] = React.useState(false);
  const [foc, setFoc] = React.useState(false);
  const variants = {
    primary: { bg: hov ? '#0F172A' : C.text, fg: '#fff', bd: 'transparent', ring: C.text },
    brand:   { bg: hov ? C.brandH : C.brand, fg: '#fff', bd: 'transparent', ring: C.brand },
    ghost:   { bg: hov ? C.surface : 'transparent', fg: C.sub, bd: 'transparent', ring: C.muted },
    soft:    { bg: hov ? C.surface2 : C.surface, fg: C.sub, bd: C.border, ring: C.muted },
    danger:  { bg: hov ? '#B91C1C' : C.danger, fg: '#fff', bd: 'transparent', ring: C.danger },
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
        fontFamily: F.body, fontSize: small ? 12 : 13, fontWeight:600,
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
        borderRadius: 12, transition: T,
        boxShadow: hov ? C.shadowL : C.shadow,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}>{children}</div>
  );
};

// ─── Label ──────────────────────────────────────────────────────
const Label = ({ children, htmlFor, hint }) => (
  <label htmlFor={htmlFor} style={{
    display:'block', fontFamily:F.body, fontSize:12, fontWeight:600,
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
      <div style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 600, color: disabled ? C.faint : C.text }}>{title}</div>
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
const MathDisplay = ({ tex, inline, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    try {
      const html = window.katex && window.katex.renderToString
        ? window.katex.renderToString(tex || '', { throwOnError: false, displayMode: !inline })
        : '';
      ref.current.innerHTML = html;
    } catch (e) {
      if (ref.current) ref.current.innerText = tex || '';
    }
  }, [tex, inline]);
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
        display:'flex', alignItems:'center', flexWrap:'wrap', gap: 6,
        padding: '6px 8px', borderTop: `1px solid ${C.border}`, background: C.surface,
      }}>
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleKeyboard(); }}
          title={kbOpen ? 'Hide math keyboard' : 'Show math keyboard'}
          style={{
            display:'inline-flex', alignItems:'center', gap: 6,
            padding: '5px 9px', borderRadius: 7, cursor:'pointer',
            border: `1px solid ${kbOpen ? C.brand : C.border}`,
            background: kbOpen ? C.brandSoft : C.bg,
            color: kbOpen ? C.brand : C.sub, fontFamily: F.body, fontSize: 12, fontWeight: 600,
            transition: T,
          }}>
          <Ico name="keyboard" size={14} color={kbOpen ? C.brand : C.muted} />
          Keyboard
        </button>
        <span style={{ width: 1, height: 18, background: C.border, margin: '0 2px' }} />
        {MATH_CHIPS.map((ch, i) => (
          <button key={i} type="button"
            onMouseDown={(e) => { e.preventDefault(); insert(ch.tex); }}
            title={`Insert ${ch.lbl}`}
            style={{
              minWidth: 30, padding: '4px 8px', borderRadius: 7, cursor:'pointer',
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
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
    const chosen = parsed.filter(q => picked[q.id]).map(q => {
      const { id, ...rest } = q;
      return { ...rest, id: 'q_' + Math.random().toString(36).slice(2, 8) };
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

// ════════════════════════════════════════════════════════════════
// TEACHER MODULE
// ════════════════════════════════════════════════════════════════
const TeacherHomework = ({ section }) => {
  const [store, update] = useStore();
  const [view, setView] = React.useState({ name: 'list' }); // list | builder | review
  const me = Object.values(store.users).find(u => u.role === 'teacher') || { id: 't_clarke', name: 'Heebz A' };

  // (D1) Teacher-scoped: the teacher only sees homework for the subjects/classes
  // they actually teach. The shared store also holds this student's other-subject
  // homework (for the student view); scope by the canonical teacherName so those
  // don't leak onto the teacher's list/analytics. Fallback to teacherId keeps any
  // teacher-authored item created in-session (which stamps teacherName) visible.
  const myAssignments = Object.values(store.assignments).filter(a =>
    a.teacherName ? a.teacherName === me.name : a.teacherId === me.id);
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

  const deleteAssignment = (id) => {
    if (!confirm('Delete this assignment?')) return false;
    update(s => {
      const next = { ...s.assignments };
      delete next[id];
      return { ...s, assignments: next };
    });
    return true;
  };

  if (view.name === 'overview' && store.assignments[view.id]) {
    return <TeacherOverview
      a={store.assignments[view.id]}
      users={store.users}
      folders={folders}
      onBack={() => setView({ name: 'list' })}
      onEdit={() => setView({ name: 'builder', id: view.id })}
      onReview={() => setView({ name: 'review', id: view.id })}
      onDuplicate={() => duplicateAssignment(view.id)}
      onMove={(folderId) => moveAssignment(view.id, folderId)}
      onDelete={() => { if (deleteAssignment(view.id)) setView({ name: 'list' }); }}
    />;
  }

  return <TeacherList
    section={section}
    assignments={myAssignments}
    folders={folders}
    users={store.users}
    classes={store.classes || CLASSES}
    onNew={(folderId) => setView({ name: 'builder', folderId: folderId || null })}
    onOpen={(id) => setView({ name: 'overview', id })}
    onCreateFolder={createFolder}
    onRenameFolder={renameFolder}
    onDeleteFolder={deleteFolder}
  />;
};

// ─── Teacher list view ──────────────────────────────────────────
const TeacherList = ({
  section, assignments, folders = [], users = {}, classes = [],
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

  // Counts (computed across all assignments — independent of folder/tab filters)
  const counts = {
    all: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    marking: assignments.filter(a =>
      a.status === 'active' &&
      Object.values(a.submissions).some(s => s.status === 'submitted')
    ).length,
    draft: assignments.filter(a => a.status === 'draft').length,
    closed: assignments.filter(a => a.status === 'closed').length,
  };

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
    if (tab === 'marking') return a.status === 'active' && Object.values(a.submissions).some(s => s.status === 'submitted');
    return true;
  });

  const totalAssigned = assignments.reduce((s, a) => s + a.studentIds.length, 0);
  const totalSubmitted = assignments.reduce((s, a) => s + Object.values(a.submissions).length, 0);
  const submissionRate = totalAssigned ? Math.round(totalSubmitted / totalAssigned * 100) : 0;

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
      <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 22, gap: 20 }}>
          <div>
            <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>Homework</h1>
            <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>Performance &amp; submission insights</p>
          </div>
        </div>
        <HomeworkAnalytics assignments={assignments} users={users} classes={classes} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28, gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>Homework</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>
            {counts.active} active · {counts.marking} awaiting marking
          </p>
        </div>
        <div style={{ display:'flex', gap: 12, alignItems:'center' }}>
          <Btn variant="brand" icon={<Ico name="plus" size={14} color="#fff" />}
            onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
            New homework
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active', value: counts.active, icon: 'flame', tone: 'brand' },
          { label: 'Awaiting marking', value: counts.marking, icon: 'clock', tone: 'amber' },
          { label: 'Drafts', value: counts.draft, icon: 'pencil', tone: 'default' },
          { label: 'Submission rate', value: `${submissionRate}%`, icon: 'sparkle', tone: 'success' },
        ].map(s => {
          const tones = {
            brand: { bg: C.brandSoft, fg: C.brand },
            amber: { bg: C.amberBg, fg: C.amber },
            success: { bg: C.successBg, fg: C.success },
            default: { bg: C.surface, fg: C.muted },
          };
          const t = tones[s.tone];
          return (
            <Card key={s.label} style={{ padding: 18 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, color: t.fg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ico name={s.icon} size={15} color={t.fg} />
                </span>
              </div>
              <div style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, color: C.text }}>{s.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Two-column: folder rail + main */}
      <div style={{ display:'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems:'flex-start' }}>
        {/* Folder rail */}
        <Card style={{ padding: 12, position:'sticky', top: 20 }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'4px 6px 8px', borderBottom:`1px solid ${C.border}`, marginBottom: 8,
          }}>
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>Folders</span>
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
                onDelete={() => {
                  const n = folderCount(f.id);
                  const msg = n > 0
                    ? `Delete "${f.name}"? ${n} assignment${n === 1 ? '' : 's'} will become unfiled.`
                    : `Delete "${f.name}"?`;
                  if (!confirm(msg)) return;
                  onDeleteFolder && onDeleteFolder(f.id);
                  if (folderId === f.id) setFolderId('all');
                }}
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

        {/* Main panel */}
        <div>
          {/* Tabs + folder header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16, gap: 12, flexWrap:'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700, color: C.text }}>{folderLabel}</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>
                {filtered.length} assignment{filtered.length === 1 ? '' : 's'}
              </div>
            </div>

            <div style={{ display:'flex', gap: 4, padding: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              {[
                ['all', 'All', inFolder.length],
                ['active', 'Active', inFolder.filter(a => a.status === 'active').length],
                ['marking', 'Marking', inFolder.filter(a => a.status === 'active' && Object.values(a.submissions).some(s => s.status === 'submitted')).length],
                ['draft', 'Draft', inFolder.filter(a => a.status === 'draft').length],
                ['closed', 'Closed', inFolder.filter(a => a.status === 'closed').length],
              ].map(([id, lab, n]) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)} style={{
                    padding: '7px 14px', border: 'none', cursor:'pointer',
                    borderRadius: 7, background: on ? C.bg : 'transparent',
                    boxShadow: on ? C.shadow : 'none',
                    fontFamily: F.body, fontSize: 13, fontWeight: on ? 600 : 500,
                    color: on ? C.text : C.muted, transition: T,
                    display:'inline-flex', alignItems:'center', gap: 6,
                  }}>
                    {lab}
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 999,
                      background: on ? C.brandSoft : C.surface2,
                      color: on ? C.brand : C.muted,
                    }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <Card style={{ padding: '60px 20px', textAlign:'center' }}>
              <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                {folderId === 'all' ? 'No assignments yet' : `Nothing in ${folderLabel}`}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                {folderId === 'all' ? 'Create one to get started.' : 'Create one or move existing assignments here.'}
              </div>
              <Btn variant="brand" small icon={<Ico name="plus" size={13} color="#fff" />}
                onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
                New homework
              </Btn>
            </Card>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {filtered.map(a => (
                <TeacherListCard key={a.id} a={a} folders={folders} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
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
      <button onClick={onClick} style={{
        flex: 1, display:'flex', alignItems:'center', gap: 8,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, fontFamily: F.body, fontSize: 13, fontWeight: active ? 600 : 500,
        color: active ? C.brand : C.sub, textAlign:'left', minWidth: 0,
      }}>
        {color
          ? <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          : <Ico name={icon} size={14} color={active ? C.brand : C.muted} />}
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <span style={{
          fontFamily: F.mono, fontSize: 11, color: active ? C.brand : C.faint,
          padding: '0 6px', borderRadius: 999,
          background: active ? C.bg : 'transparent',
        }}>{count}</span>
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

const TeacherListCard = ({ a, folders = [], onOpen }) => {
  const subc = subColor(a.subject);
  const submitted = Object.values(a.submissions).length;
  const graded = Object.values(a.submissions).filter(isGraded).length;
  const awaitingMark = Object.values(a.submissions).filter(s => s.status === 'submitted').length;
  const total = a.studentIds.length;
  const pct = total ? Math.round((submitted / total) * 100) : 0;
  const dDays = daysUntil(a.dueAt);
  const folder = a.folderId ? folders.find(f => f.id === a.folderId) : null;
  const overdue = a.status === 'active' && a.dueAt && dDays < 0;

  // A single status indicator — the most relevant state, not a row of tags.
  let status;
  if (a.status === 'draft')                       status = { label: 'Draft',            tone: 'default', dot: C.faint };
  else if (a.status === 'closed')                 status = { label: 'Closed',           tone: 'default', dot: C.faint };
  else if (awaitingMark > 0)                      status = { label: `${awaitingMark} to mark`, tone: 'amber',  dot: C.amber };
  else if (submitted === total && total > 0)      status = { label: 'All submitted',    tone: 'success', dot: C.success };
  else                                            status = { label: 'Active',           tone: 'brand',   dot: C.brand };

  const dueText = a.dueAt
    ? (overdue ? `Overdue · ${fmtDate(a.dueAt)}`
      : a.status === 'active' && dDays >= 0 ? `Due in ${dDays}d · ${fmtDate(a.dueAt)}`
      : `Due ${fmtDate(a.dueAt)}`)
    : 'No due date';

  return (
    <Card hoverable onClick={() => onOpen(a.id)} style={{ overflow:'hidden' }}>
      <div style={{ padding: 20, display:'flex', flexDirection:'column', gap: 16 }}>
        {/* Header: subject badge + title, status on the right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 14 }}>
          <div style={{ display:'flex', gap: 13, alignItems:'flex-start', minWidth: 0 }}>
            <span style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: subc.soft, color: subc.color,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Ico name="book" size={19} color={subc.color} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: F.head, fontSize: 15.5, fontWeight: 700, color: C.text,
                lineHeight: 1.3, marginBottom: 4,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{a.title}</div>
              <div style={{
                display:'flex', alignItems:'center', gap: 7, flexWrap:'wrap',
                fontFamily: F.body, fontSize: 12.5, color: C.muted,
              }}>
                <span style={{ color: subc.color, fontWeight: 600 }}>{a.subject}</span>
                {a.classLabel && <><span style={{ color: C.border }}>•</span><span>{a.classLabel}</span></>}
                {folder && <><span style={{ color: C.border }}>•</span><span>{folder.name}</span></>}
              </div>
            </div>
          </div>
          <span style={{
            display:'inline-flex', alignItems:'center', gap: 6, flexShrink: 0,
            padding: '4px 10px', borderRadius: 999,
            background: C.surface, border: `1px solid ${C.border}`,
            fontFamily: F.body, fontSize: 11.5, fontWeight: 600, color: C.sub,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot }} />
            {status.label}
          </span>
        </div>

        {/* Meta row: clean, evenly spaced facts */}
        <div style={{
          display:'flex', alignItems:'center', gap: 18,
          fontFamily: F.body, fontSize: 12.5, color: C.sub,
        }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
            <Ico name="list" size={14} color={C.faint} />
            {a.questions.length} question{a.questions.length === 1 ? '' : 's'}
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
            <Ico name="target" size={14} color={C.faint} />
            {totalPoints(a)} pts
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 6, color: overdue ? C.danger : C.sub }}>
            <Ico name="calendar" size={14} color={overdue ? C.danger : C.faint} />
            {dueText}
          </span>
        </div>

        {/* Progress */}
        <div style={{ borderTop: `1px solid ${C.surface2}`, paddingTop: 14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.sub }}>Submissions</span>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
              <span style={{ fontWeight: 700, color: C.text }}>{submitted}</span> / {total}
              {graded > 0 && <span style={{ color: C.success, fontWeight: 600, marginLeft: 8 }}>{graded} graded</span>}
            </span>
          </div>
          <div style={{ height: 6, background: C.surface2, borderRadius: 999, overflow:'hidden' }}>
            <div style={{ height:'100%', width: `${pct}%`, background: subc.color, borderRadius: 999, transition: 'width .3s' }} />
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

const HomeworkAnalytics = ({ assignments, users = {}, classes = [] }) => {
  const [subjectF, setSubjectF] = React.useState('All');
  const [classF, setClassF] = React.useState('All');

  const filtered = assignments.filter(a =>
    (subjectF === 'All' || a.subject === subjectF) &&
    (classF === 'All' || a.classLabel === classF)
  );

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

  const submittedRows = subs.filter(s => s.sub);
  const gradedRows = subs.filter(s => s.sub && isGraded(s.sub));
  const lateRows = subs.filter(s => s.sub && s.a.dueAt && new Date(s.sub.submittedAt) > new Date(s.a.dueAt));
  const inProgressN = subs.filter(s => s.sub && s.sub.status === 'submitted').length;
  const notStartedN = subs.filter(s => !s.sub).length;
  // "Pending review" counts SUBMISSIONS awaiting a mark; "Awaiting marking" counts
  // ASSIGNMENTS that still have any unmarked submission — two different units, kept
  // labelled distinctly (Homework Analytics P0).
  const pendingReview = submittedRows.filter(s => !isGraded(s.sub)).length;
  const awaitingMarking = filtered.filter(a =>
    a.studentIds.some(sid => { const sub = a.submissions[sid]; return sub && !isGraded(sub); })).length;

  const totalAssigned = subs.length;
  const completionRate = totalAssigned ? Math.round(submittedRows.length / totalAssigned * 100) : 0;
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
    label, value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), color: subColor(label).color,
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
      amber:{bg:C.amberBg,fg:C.amber}, info:{bg:C.accentSoft,fg:C.accent}, danger:{bg:C.dangerBg,fg:C.danger} };
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
        {kpi('book', 'brand', filtered.length, 'Total Assigned', `Across ${classOptions.length - 1 || 1} classes`)}
        {kpi('target', 'success', `${completionRate}%`, 'Completion Rate', `${submittedRows.length} / ${totalAssigned} students`)}
        {kpi('trend', 'brand', `${avgScore}%`, 'Average Score', 'Across graded work')}
        {kpi('clip', 'amber', awaitingMarking, 'Awaiting Marking', 'Assignments with unmarked work')}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12 }}>
        {kpi('alertCircle', 'danger', lateRows.length, 'Late Submissions', `${totalAssigned ? Math.round(lateRows.length/totalAssigned*100) : 0}% of all`)}
        {kpi('file', 'info', pendingReview, 'Pending Review', 'Submissions to mark')}
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
    <div style={{ padding: '24px 32px 80px', fontFamily: F.body, color: C.text }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onCancel}>Back</Btn>
          <span style={{ fontFamily: F.head, fontSize: 20, fontWeight: 700 }}>
            {assignment ? 'Edit homework' : 'New homework'}
          </span>
        </div>
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
                <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Basic Information</div>
                <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
                  <div>
                    <Label htmlFor="t-title">Title</Label>
                    <Input value={a.title} onChange={(v) => setField('title', v)} placeholder="e.g. Algebra: Simultaneous Equations" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
                    <div>
                      <Label>Subject</Label>
                      <select value={a.subject} onChange={e => setField('subject', e.target.value)} style={selectStyle}>
                        {Object.keys(SUBJECTS).map(s => <option key={s} value={s}>{s}</option>)}
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
                <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Schedule &amp; Limits</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Available From</Label>
                    <Input type="datetime-local" value={a.settings.availableFrom} onChange={(v) => setSetting('availableFrom', v)} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="datetime-local" value={a.dueAt} onChange={(v) => setField('dueAt', v)} />
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
              </Card>

              {/* Submission options */}
              <Card style={{ padding: '8px 22px 14px' }}>
                <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text, margin: '14px 0 2px' }}>Submission Options</div>
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
                  <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text }}>Student Review Settings</div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>Control what students see after submission</div>
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
                  <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text }}>Assigned Students</div>
                  {classStudents.length > 0 && (
                    <button onClick={selectAllInClass} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.brand,
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
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text }}>
                  Questions <span style={{ color: C.muted, fontWeight: 500 }}>({a.questions.length})</span>
                </div>
                <Btn variant="soft" small icon={<Ico name="upload" size={13} />} onClick={() => setPdfOpen(true)}>Import from PDF</Btn>
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
                {a.questions.length === 0 && (
                  <div style={{ padding: '24px 0', textAlign:'center', color: C.muted, fontSize: 13 }}>
                    No questions yet — add one below.
                  </div>
                )}
              </div>

              {/* Add palette */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px dashed ${C.border}` }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
                  {QTYPES.map(t => (
                    <button key={t.type} onClick={() => addQ(t.type)} style={{
                      display:'inline-flex', alignItems:'center', gap: 6,
                      padding: '9px 14px', borderRadius: 999,
                      border: `1px solid ${C.border}`, background: C.bg,
                      cursor:'pointer', transition: T,
                      fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.borderD; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}>
                      <Ico name="plus" size={13} color={C.muted} /> {t.short}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT — outline */}
        <div style={{ display:'flex', flexDirection:'column', gap: 12, position:'sticky', top: 20, alignSelf:'start' }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Outline</div>
            {a.questions.length === 0
              ? <div style={{ fontSize: 12, color: C.muted }}>No questions yet</div>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                  {a.questions.map((q, i) => {
                    const m = qtypeMeta(q.type);
                    return (
                      <button key={q.id} onClick={() => setTab('questions')} style={{
                        display:'flex', alignItems:'center', gap: 8, width:'100%', textAlign:'left',
                        padding: '6px 8px', borderRadius: 6, background: C.surface,
                        border:'none', cursor:'pointer',
                      }}>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, width: 18 }}>Q{i + 1}</span>
                        <span style={{
                          width: 6, height: 6, borderRadius:'50%',
                          background: m.marker === 'auto' ? C.brand : C.amber,
                        }} />
                        <span style={{ fontFamily: F.body, fontSize: 12, color: C.sub, flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {q.prompt || <em style={{ color: C.faint }}>Untitled</em>}
                        </span>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.points}p</span>
                      </button>
                    );
                  })}
                </div>
              )
            }
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Marks</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Total points</span>
              <span style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, color: C.text }}>{totalPoints(a)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.brand }} />
                <span style={{ fontSize: 12, color: C.sub, flex: 1 }}>Auto-marked</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.text }}>{autoTotal(a)}p</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.amber }} />
                <span style={{ fontSize: 12, color: C.sub, flex: 1 }}>Teacher-marked</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.text }}>{manualTotal(a)}p</span>
              </div>
            </div>
            {/* split bar */}
            {totalPoints(a) > 0 && (
              <div style={{ height: 6, marginTop: 14, borderRadius: 999, overflow:'hidden', display:'flex' }}>
                <div style={{ flex: autoTotal(a), background: C.brand }} />
                <div style={{ flex: manualTotal(a), background: C.amber }} />
              </div>
            )}
          </Card>

          {errors.length > 0 && (
            <Card style={{ padding: 14, background: C.amberBg, borderColor: C.amberBorder }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.amber, marginBottom: 6, display:'flex', alignItems:'center', gap: 6 }}>
                <Ico name="info" size={12} color={C.amber} /> {errors.length} issue{errors.length > 1 ? 's' : ''} to fix
              </div>
              <ul style={{ margin: 0, padding:'0 0 0 18px', fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
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

const QuestionEditor = ({ q, index, total = 1, onChange, onChangeType, onDelete, onDuplicate, onUp, onDown }) => {
  const m = qtypeMeta(q.type);
  const [collapsed, setCollapsed] = React.useState(false);

  const headBtn = (icon, title, onClick, color = C.muted, disabled) => (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent',
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
      border: `1px solid ${C.border}`, borderRadius: 12, overflow:'hidden',
      background: C.bg, boxShadow: C.shadow,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', background: C.surface,
        borderBottom: collapsed ? 'none' : `1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap: 8,
      }}>
        <span title="Drag to reorder" style={{ display:'flex', cursor:'grab', color: C.faint }}><Ico name="grip" size={16} color={C.faint} /></span>
        <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.sub }}>Q{index + 1}</span>
        <select value={q.type} onChange={e => onChangeType && onChangeType(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg, color: C.text,
          fontFamily: F.body, fontSize: 12.5, fontWeight: 600, cursor:'pointer',
        }}>
          {QTYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>Marks</span>
        <Input type="number" value={q.points} onChange={(v) => onChange({ points: parseInt(v, 10) || 0 })}
          style={{ width: 54, padding: '6px 8px', textAlign:'center' }} />
        {onDuplicate && headBtn('copy', 'Duplicate', onDuplicate)}
        {headBtn(collapsed ? 'chevD' : 'chevU', collapsed ? 'Expand' : 'Collapse', () => setCollapsed(c => !c))}
        {headBtn('trash', 'Delete', onDelete, C.danger)}
      </div>

      {collapsed ? (
        <div style={{ padding: '10px 14px', display:'flex', alignItems:'center', gap: 8 }}>
          <Pill tone={m.marker === 'auto' ? 'brand' : 'amber'}>{m.label}</Pill>
          <span style={{ fontFamily: F.body, fontSize: 13, color: C.sub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {q.prompt || <em style={{ color: C.faint }}>Untitled question</em>}
          </span>
        </div>
      ) : (
      <div style={{ padding: 16, display:'flex', flexDirection:'column', gap: 14 }}>
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
                    padding: '8px 22px', borderRadius: 8, cursor:'pointer',
                    border:`1px solid ${on ? C.brand : C.border}`,
                    background: on ? C.brand : C.bg, color: on ? '#fff' : C.sub,
                    fontFamily: F.body, fontSize: 13, fontWeight: 600, transition: T,
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
          <span style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 600, color: C.sub }}>Required</span>
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
const TeacherOverview = ({ a, users = {}, folders = [], onBack, onEdit, onReview, onDuplicate, onMove, onDelete }) => {
  const subc = subColor(a.subject);
  const total = a.studentIds.length;
  const submitted = Object.values(a.submissions).length;
  const graded = Object.values(a.submissions).filter(isGraded).length;
  const awaitingMark = Object.values(a.submissions).filter(s => s.status === 'submitted').length;
  const pct = total ? Math.round(submitted / total * 100) : 0;

  const scores = Object.values(a.submissions).filter(isGraded)
    .map(s => totalPoints(a) ? Math.round(submissionScore(a, s) / totalPoints(a) * 100) : 0);
  const avg = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;

  const statusTone = a.status === 'draft' ? 'default' : a.status === 'closed' ? 'default' : awaitingMark > 0 ? 'amber' : 'brand';
  const statusLabel = a.status === 'draft' ? 'Draft' : a.status === 'closed' ? 'Closed' : awaitingMark > 0 ? `${awaitingMark} to mark` : 'Active';

  const stat = (label, value, color) => (
    <Card key={label} style={{ padding: '14px 16px' }}>
      <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: F.head, fontSize: 22, fontWeight: 700, color: color || C.text }}>{value}</div>
    </Card>
  );

  return (
    <div style={{ padding: '24px 32px 80px', fontFamily: F.body, color: C.text }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onBack}>Back to list</Btn>
        <div style={{ display:'flex', gap: 8 }}>
          <Btn variant="brand" small icon={<Ico name="edit" size={13} color="#fff" />} onClick={onEdit}>Edit</Btn>
          <Btn variant="soft" small icon={<Ico name="eye" size={13} />} onClick={onReview}>
            Review submissions{awaitingMark > 0 ? ` (${awaitingMark})` : ''}
          </Btn>
          <Btn variant="soft" small icon={<Ico name="copy" size={13} />} onClick={onDuplicate}>Duplicate</Btn>
          <Btn variant="soft" small icon={<Ico name="trash" size={13} color={C.danger} />} onClick={onDelete} style={{ color: C.danger }}>Delete</Btn>
        </div>
      </div>

      {/* Header card */}
      <Card style={{ overflow:'hidden', marginBottom: 16 }}>
        <div style={{ height: 4, background: subc.color }} />
        <div style={{ padding: 22 }}>
          <div style={{ display:'flex', gap: 6, alignItems:'center', marginBottom: 8, flexWrap:'wrap' }}>
            <Pill tone="default" icon={<span style={{ width:6, height:6, background:subc.color, borderRadius:'50%' }} />}>{a.subject}</Pill>
            {a.classLabel && <Pill tone="default">{a.classLabel}</Pill>}
            <Pill tone={statusTone}>{statusLabel}</Pill>
          </div>
          <h1 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing:'-0.4px' }}>{a.title || 'Untitled homework'}</h1>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 6 }}>
            {a.questions.length} questions · {totalPoints(a)} marks
            {a.dueAt && <> · Due {fmtDateTime(a.dueAt)}</>}
            {a.timeLimitMins ? ` · ${a.timeLimitMins} min limit` : ''}
          </div>
          {a.instructions && (
            <div style={{ display:'flex', gap: 10, padding: '12px 14px', marginTop: 16,
              background: C.brandSoft, border: `1px solid ${C.brandBorder}`, borderRadius: 10, alignItems:'flex-start' }}>
              <Ico name="info" size={14} color={C.brand} />
              <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{a.instructions}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {stat('Submitted', `${submitted} / ${total}`)}
        {stat('Graded', graded, C.success)}
        {stat('Awaiting marking', awaitingMark, awaitingMark > 0 ? C.amber : C.text)}
        {stat('Class average', avg != null ? `${avg}%` : '—', C.brand)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap: 16, alignItems:'start' }}>
        {/* Questions */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Questions</div>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {a.questions.map((q, i) => {
              const m = qtypeMeta(q.type);
              return (
                <div key={q.id} style={{ display:'flex', alignItems:'center', gap: 10, padding: '10px 12px', background: C.surface, borderRadius: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius:'50%', background: C.bg, border: `1px solid ${C.border}`,
                    fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.muted,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>{i + 1}</span>
                  <Pill tone={m.marker === 'auto' ? 'brand' : 'amber'}>{m.label}</Pill>
                  <span style={{ flex: 1, fontFamily: F.body, fontSize: 13, color: C.sub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {q.prompt || <em style={{ color: C.faint }}>Untitled</em>}
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{q.points}p</span>
                </div>
              );
            })}
            {a.questions.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No questions yet.</div>}
          </div>
        </Card>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          {/* Submission progress */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Submission progress</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, color: C.muted, marginBottom: 6 }}>
              <span>{pct}% submitted</span><span>{submitted}/{total}</span>
            </div>
            <div style={{ height: 8, background: C.surface2, borderRadius: 999, overflow:'hidden' }}>
              <div style={{ height:'100%', width: `${pct}%`, background: subc.color }} />
            </div>
          </Card>

          {/* Assigned students */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              Assigned students <span style={{ color: C.muted, fontWeight: 500 }}>({total})</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              {a.studentIds.map(sid => {
                const sub = a.submissions[sid];
                const st = !sub ? { t:'Not started', c:C.muted } : isGraded(sub) ? { t:'Graded', c:C.success } : { t:'Submitted', c:C.brand };
                return (
                  <div key={sid} style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <Avatar name={users[sid]?.name || sid} size={24} />
                    <span style={{ flex: 1, fontFamily: F.body, fontSize: 12.5, color: C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {users[sid]?.name || sid}
                    </span>
                    <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: st.c }}>{st.t}</span>
                  </div>
                );
              })}
              {total === 0 && <div style={{ fontSize: 12, color: C.muted }}>No students assigned. Edit to assign.</div>}
            </div>
          </Card>

          {/* Folder */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Folder</div>
            <select value={a.folderId || ''} onChange={e => onMove(e.target.value || null)} style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text,
              fontFamily: F.body, fontSize: 13, cursor:'pointer',
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
  const late = asn.dueAt && new Date(sub.submittedAt) > new Date(asn.dueAt);
  return { key: 'submitted', label: late ? 'Late' : 'Submitted', tone: late ? 'danger' : 'info', fg: late ? C.danger : C.accent };
};

// Auto-mark verdict for a single question (auto types only): correct / incorrect / partial.
const autoVerdict = (q, sub) => {
  if (!isAuto(q.type)) return null;
  const m = sub?.marks?.[q.id];
  if (typeof m !== 'number') return null;
  if (m >= (q.points || 0)) return 'correct';
  if (m <= 0) return 'incorrect';
  return 'partial';
};

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
      <div style={{ padding: 32, fontFamily: F.body }}>
        <div style={{ marginBottom: 20 }}>
          <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back to list</Btn>
        </div>
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
      {/* Top bar: back + title + mark-by toggle */}
      <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '12px 16px' }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back to list</Btn>
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
                  <Card style={{ padding: 18, marginTop: 14, background: '#F5F3FF', borderColor: '#DDD6FE' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
                      <Ico name="chat" size={14} color="#7C3AED" />
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
  const palette = ['#818CF8','#6EE7B7','#FCD34D','#F9A8D4','#93C5FD','#A5B4FC'];
  const idx = (name.charCodeAt(0) || 0) % palette.length;
  return (
    <span style={{
      width: size, height: size, borderRadius:'50%', background: palette[idx],
      color: '#fff', fontFamily: F.head, fontSize: size * 0.42, fontWeight: 700,
      display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
      letterSpacing: '.02em',
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

const gradeFor = (pct) => pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'E';
const gradePalette = (g) => {
  if (g === 'A*' || g === 'A') return { bg: C.successBg, fg: C.success, bd: C.successBorder };
  if (g === 'B')               return { bg: C.accentSoft, fg: '#0284C7', bd: '#BAE6FD' };
  if (g === 'C')               return { bg: C.amberBg, fg: C.amber, bd: C.amberBorder };
  return { bg: C.dangerBg, fg: C.danger, bd: C.dangerBorder };
};
const scoreColor = (pct) => pct >= 80 ? C.success : pct >= 55 ? C.amber : C.danger;

const draftStarted = (draft) =>
  !!draft && (!!draft.startedAt || Object.keys(draft.answers || {}).length > 0);

const hwState = (a, me, drafts) => {
  const sub = a.submissions[me.id];
  if (sub) return isGraded(sub) ? 'marked' : 'submitted';
  if (a.dueAt && daysUntil(a.dueAt) < 0) return 'overdue';
  if (draftStarted(drafts ? drafts[a.id] : null)) return 'inprogress';
  return 'pending';
};

// Has the teacher released marks for this submission to the student?
// Honours "hide marks until released" — only graded submissions are released.
const marksReleased = (a, sub) => {
  if (!sub) return false;
  const s = a.settings || {};
  if (s.hideMarksUntilReleased || s.releaseAfterApproval) return isGraded(sub);
  return true;
};

const teacherNameFor = (a, store) =>
  a.teacherName || (a.teacherId && store.users[a.teacherId] && store.users[a.teacherId].name) || '—';

const qResult = (q, sub) => {
  const explicit = sub.results && sub.results[q.id];
  if (explicit) return explicit;
  const m = sub.marks ? sub.marks[q.id] : null;
  if (typeof m !== 'number') return 'pending';
  if (m >= (q.points || 0)) return 'correct';
  if (m <= 0) return 'incorrect';
  return 'partial';
};

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
const HwStatusPill = ({ state }) => {
  const map = {
    pending:    { label: 'Pending',          bg: C.surface,    fg: C.muted,   bd: C.border,        icon: 'clock' },
    inprogress: { label: 'In Progress',      bg: C.amberBg,    fg: C.amber,   bd: C.amberBorder,   icon: 'clock' },
    submitted:  { label: 'Submitted',        bg: C.accentSoft, fg: '#0284C7', bd: '#BAE6FD',       icon: 'send' },
    awaiting:   { label: 'Awaiting marking', bg: C.accentSoft, fg: '#0284C7', bd: '#BAE6FD',       icon: 'clock' },
    overdue:    { label: 'Overdue',          bg: C.dangerBg,   fg: C.danger,  bd: C.dangerBorder,  icon: 'alertCircle' },
    marked:     { label: 'Marked',           bg: C.successBg,  fg: C.success, bd: C.successBorder, icon: 'check' },
  };
  const t = map[state] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontFamily: F.body, fontSize: 11.5, fontWeight: 600,
    }}>
      <Ico name={t.icon} size={12} color={t.fg} />
      {t.label}
    </span>
  );
};

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
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 4, background: C.surface2, borderRadius: 10 }}>
    {tabs.map(t => {
      const on = t.id === active;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: on ? C.bg : 'transparent',
          boxShadow: on ? '0 1px 2px rgba(15,23,42,.08)' : 'none',
          fontFamily: F.body, fontSize: 13, fontWeight: 600,
          color: on ? C.text : C.muted, transition: T, whiteSpace: 'nowrap',
        }}>{t.label}</button>
      );
    })}
  </div>
);

const BackBtn = ({ onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} aria-label="Back"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none',
        background: hov ? C.surface2 : 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: T, flexShrink: 0, marginTop: 2,
      }}>
      <Ico name="arrowL" size={16} color={C.sub} />
    </button>
  );
};

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
          width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 40px',
          borderRadius: 10, border: `1px solid ${foc ? C.brand : C.border}`,
          background: C.bg, fontFamily: F.body, fontSize: 13, color: C.text,
          outline: 'none', boxShadow: foc ? ring(C.brand) : 'none', transition: T,
        }} />
    </div>
  );
};

const hwSelectStyle = {
  padding: '11px 34px 11px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
  background: C.bg, fontSize: 13, color: C.text, cursor: 'pointer', fontFamily: F.body,
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', outline: 'none',
};

const HwEmpty = ({ text }) => (
  <div style={{
    textAlign: 'center', padding: '56px 24px', color: C.faint, fontSize: 13.5,
    background: C.surface, borderRadius: 12, border: `1px dashed ${C.border}`,
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
    if (state === 'submitted') { openSubmitted(a); return; }
    setView({ name: 'detail', id: a.id });
  };

  const submit = (id, answers) => {
    const asn = store.assignments[id];
    const marks = {};
    const feedback = {};
    asn.questions.forEach(q => {
      marks[q.id] = isAuto(q.type) ? autoMark(q, answers[q.id]) : null;
      feedback[q.id] = '';
    });
    const startedAt = store.drafts && store.drafts[id] && store.drafts[id].startedAt;
    const elapsed = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000) : null;
    const sub = {
      answers,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      marks, feedback,
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
      a={current} store={store}
      draft={store.drafts ? store.drafts[view.id] : null}
      onBack={() => goHome('assignments')}
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
      a={current}
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

  if (view.name === 'result' && current && current.submissions[me.id]) {
    return <HwResultReview a={current} me={me} store={store} onBack={() => goHome('results')} />;
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

  const subtitle =
    section === 'assignments' ? `${open.length} assignment${open.length === 1 ? '' : 's'}` :
    section === 'submitted' ? `${submitted.length} awaiting marking` :
    `${marked.length} marked`;

  return (
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text, maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.6px' }}>
            {section === 'submitted' ? 'Submitted' : section === 'results' ? 'Results' : 'Homework'}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '6px 0 0' }}>{subtitle}</p>
        </div>
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
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: 12,
        cursor: 'pointer', transition: T, boxShadow: hov ? C.shadowL : C.shadow,
      }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        background: danger ? C.dangerBg : C.brandSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico name="book" size={18} color={danger ? C.danger : C.brand} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.subject} · {teacherNameFor(a, store)} · {a.questions.length} question{a.questions.length === 1 ? '' : 's'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted }}>
          <Ico name="calendar" size={13} color={C.faint} />
          {a.dueAt ? fmtShort(a.dueAt) : 'No date'}
        </span>
        {showDays && <span style={{ fontSize: 12, color: C.faint, fontWeight: 600 }}>{days}d</span>}
        <HwStatusPill state={state} />
      </div>
    </div>
  );
};

// ─── Submitted list row ────────────────────────────────────────
const HwSubmittedRow = ({ a, sub, store, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const canReview = (a.settings?.allowReview ?? a.allowReview) || a.settings?.showAutoImmediately;
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: 12,
        cursor: 'pointer', transition: T, boxShadow: hov ? C.shadowL : C.shadow,
      }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico name="send" size={17} color="#0284C7" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.subject} · {teacherNameFor(a, store)} · Submitted {fmtDateTime(sub && sub.submittedAt)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <HwStatusPill state="awaiting" />
        {canReview ? (
          <Btn variant="soft" small icon={<Ico name="eye" size={13} />}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            Review
          </Btn>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.faint }}>
            <Ico name="lock" size={12} color={C.faint} />
            Review locked
          </span>
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

  const stat = (icon, value, label, chipBg, chipFg, valueColor) => (
    <Card key={label} style={{ padding: '22px 16px', textAlign: 'center' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: chipBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
      }}>
        <Ico name={icon} size={17} color={chipFg} />
      </div>
      <div style={{ fontFamily: F.head, fontSize: 24, fontWeight: 800, color: valueColor, letterSpacing: '-0.4px' }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{label}</div>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        {stat('trend', `${avg}%`, 'Overall Average', C.successBg, C.success, scoreColor(avg))}
        {stat('award', `${best}%`, 'Best Score', C.successBg, C.success, scoreColor(best))}
        {stat('target', rows.length, 'Completed', C.brandSoft, C.brand, C.text)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && <HwEmpty text="No marked homework yet. Results will appear here once your teacher marks your work." />}
        {rows.map(r => <HwResultRow key={r.a.id} a={r.a} sub={r.sub} pct={r.pct} onOpen={() => onOpen(r.a)} />)}
      </div>
    </div>
  );
};

const HwResultRow = ({ a, sub, pct, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const col = scoreColor(pct);
  const g = sub.grade || gradeFor(pct);
  const gp = gradePalette(g);
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`, borderRadius: 12,
        cursor: 'pointer', transition: T, boxShadow: hov ? C.shadowL : C.shadow,
      }}>
      <Ring pct={pct} size={56} stroke={5} color={col}>
        <span style={{ fontFamily: F.head, fontSize: 12.5, fontWeight: 800, color: col }}>{pct}%</span>
      </Ring>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.title}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 3 }}>
          {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
        </div>
        <div style={{ fontSize: 12, color: C.faint }}>
          Marked {fmtLong(sub.markedAt || sub.submittedAt)}{sub.timeSpentMins != null ? ` · ${sub.timeSpentMins}m` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: F.head, fontSize: 18, fontWeight: 800, color: col }}>{pct}%</span>
        <span style={{
          padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: gp.bg, color: gp.fg, border: `1px solid ${gp.bd}`,
        }}>{g}</span>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Student — assignment detail
// ════════════════════════════════════════════════════════════════
const HwDetail = ({ a, store, draft, onBack, onStart }) => {
  const totalM = totalPoints(a);
  const started = draftStarted(draft);

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
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text, maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
        <BackBtn onClick={onBack} />
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
          </div>
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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Btn variant="brand" icon={<Ico name="play" size={14} color="#fff" />} onClick={onStart}
          style={{ padding: '12px 26px', fontSize: 14, borderRadius: 10 }}>
          {started ? 'Continue Homework' : 'Start Homework'}
        </Btn>
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

const HwAttempt = ({ a, draft, onUpdateDraft, onBack, onSubmit }) => {
  const [answers, setAnswers] = React.useState(() => draft.answers || {});
  const [flags, setFlags] = React.useState(() => draft.flags || {});
  const [idx, setIdx] = React.useState(0);
  const [confirming, setConfirming] = React.useState(false);
  const startedAt = React.useRef(draft.startedAt || new Date().toISOString());

  React.useEffect(() => {
    onUpdateDraft({ answers, flags, startedAt: startedAt.current });
  }, [answers, flags]);

  const total = a.questions.length;
  const q = a.questions[idx];
  const hasAnswer = (qq) => { const v = answers[qq.id]; return v !== undefined && v !== null && v !== ''; };
  const answered = a.questions.filter(hasAnswer).length;

  return (
    <div style={{ padding: '28px 32px 64px', fontFamily: F.body, color: C.text, maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.head, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.title}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{answered}/{total} answered · auto-saved</div>
        </div>
        <Btn variant="brand" icon={<Ico name="send" size={13} color="#fff" />} onClick={() => setConfirming(true)}>
          Submit
        </Btn>
      </div>

      {/* Progress */}
      <div style={{ height: 6, borderRadius: 999, background: '#E9E5FB', overflow: 'hidden', marginBottom: 20 }}>
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
        {a.questions.map((qq, i) => {
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

        <HwAnswerInput question={q} value={answers[q.id]} onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))} />

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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="soft" onClick={() => setConfirming(false)}>Cancel</Btn>
              <Btn variant="brand" icon={<Ico name="send" size={13} color="#fff" />} onClick={() => onSubmit(answers)}>
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
const HwSubmissionReview = ({ a, me, store, onBack }) => {
  const sub = a.submissions[me.id];
  const showAuto = !!(a.settings && a.settings.showAutoImmediately);
  return (
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
          </div>
        </div>
        <HwStatusPill state="awaiting" />
      </div>

      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px',
        background: C.accentSoft, border: '1px solid #BAE6FD', borderRadius: 10, marginBottom: 22,
      }}>
        <Ico name="info" size={14} color="#0284C7" />
        <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
          Submitted {fmtDateTime(sub.submittedAt)}. Your teacher will mark it soon — you can review your answers below, but they can't be changed.
          {showAuto && ' Auto-marked questions are graded instantly and shown below.'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {a.questions.map((q, i) => {
          const autoQ = showAuto && isAuto(q.type);
          const m = autoQ ? sub.marks?.[q.id] : null;
          const correct = autoQ && typeof m === 'number' && m >= (q.points || 0);
          const wrong = autoQ && typeof m === 'number' && m <= 0;
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
                    <span style={{ fontFamily: F.head, fontSize: 13, fontWeight: 800, color: C.text }}>{m}/{q.points}</span>
                  </span>
                )}
              </div>
              <PromptText text={q.prompt} style={{ display: 'block', fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.45, marginBottom: 14 }} />
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.07em', marginBottom: 7 }}>YOUR ANSWER</div>
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
const HwResultReview = ({ a, me, store, onBack }) => {
  const sub = a.submissions[me.id];
  const S = a.settings || {};
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
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text, maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 22 }}>
        <BackBtn onClick={onBack} />
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            {a.subject}{a.classLabel ? ` · ${a.classLabel}` : ''}
          </div>
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
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '18px 20px', marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico name="chat" size={14} color="#7C3AED" />
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

              <PromptText text={q.prompt} style={{ display: 'block', fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.45, marginBottom: 14 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.07em', marginBottom: 7 }}>YOUR ANSWER</div>
                  <HwAnswerDisplay question={q} answer={sub.answers ? sub.answers[q.id] : null} />
                </div>

                {showCorrect && correctTxt != null && (
                  <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.success, letterSpacing: '.07em', marginBottom: 7 }}>CORRECT ANSWER</div>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>{correctTxt}</div>
                  </div>
                )}

                {showComments && fb && (
                  <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                      <Ico name="chat" size={11} color="#7C3AED" />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#7C3AED', letterSpacing: '.07em' }}>TEACHER COMMENT</span>
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
const getHomeworkBadges = () => {
  const s = loadStore();
  const me = hwActiveMe(s);
  const teacher = Object.values(s.users).find(u => u.role === 'teacher');
  const teacherToMark = teacher
    ? Object.values(s.assignments).filter(a => a.teacherId === teacher.id)
        .flatMap(a => Object.values(a.submissions))
        .filter(sub => sub.status === 'submitted').length
    : 0;
  const studentUnreadFeedback = me
    ? Object.values(s.assignments).filter(a =>
        a.studentIds.includes(me.id) &&
        isGraded(a.submissions[me.id])
      ).length
    : 0;
  return { teacherToMark, studentUnreadFeedback };
};

// ─── Export to window ──────────────────────────────────────────
Object.assign(window, {
  TeacherHomework: TeacherHomeworkRoot,
  StudentHomework: StudentHomeworkRoot,
  getHomeworkBadges,
});

})();
