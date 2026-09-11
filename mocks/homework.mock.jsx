// ══════════════════════════════════════════════════════════════
//  Mock data — Homework module
//  Loaded as a global script before Homework.jsx (see index.html).
//
//  Homework.jsx runs inside an IIFE; it aliases these globals to its
//  internal names (CLASSES, PDF_BANKS, the seed roster). Names are
//  HW_-prefixed to keep the global namespace clean.
//
//  ── SINGLE TEACHER COHORT (F1) ────────────────────────────────
//  These classes, students and subjects are the SAME canonical cohort every
//  other teacher screen reads (the admin store / teacherPages.mock). Class
//  labels are the canonical "Year N – Group X" form with an optional short
//  `code` (10A) as a SECONDARY field only — never a primary label. Student
//  names are the canonical roster; there is no second "Class 10A / Noah
//  Bennett" universe any more. The logged-in student view (Oliver Chen) still
//  sees homework across all his subjects, but every name/label here reconciles
//  with the rest of the app.
// ══════════════════════════════════════════════════════════════

// Class roster used by the teacher builder (assign-by-class) and analytics.
// `label` is the canonical primary label; `code` is the secondary short form.
const HW_CLASSES = [
  { id: 'c_8a',     label: 'Year 8 – Group A',   code: '8A',  subjects: ['History','Biology','English'] },
  { id: 'c_8b',     label: 'Year 8 – Group B',   code: '8B',  subjects: ['History','Biology','English'] },
  { id: 'c_9a',     label: 'Year 9 – Group A',   code: '9A',  subjects: ['English','English Literature'] },
  { id: 'c_9b',     label: 'Year 9 – Group B',   code: '9B',  subjects: ['Physics','Mathematics'] },
  { id: 'c_10a',    label: 'Year 10 – Group A',  code: '10A', subjects: ['Mathematics','Physics'] },
  { id: 'c_10b',    label: 'Year 10 – Group B',  code: '10B', subjects: ['Chemistry','Biology'] },
  { id: 'c_11a',    label: 'Year 11 – Group B',  code: '11B', subjects: ['Mathematics','Chemistry'] },
  { id: 'c_alevel', label: 'Year 12 – Group A',  code: '12A', subjects: ['Mathematics','Economics'] },
];

// Seed student roster. Each entry: { id, name, role, classLabel }.
// Consumed by seedStore() in Homework.jsx (plus a hardcoded "me" / teacher).
// Every name is drawn from the canonical roster — the four ids referenced by
// hand-authored submissions (s_oliver, s_emma, s_sophia, s_james) are kept.
const HW_STUDENTS = [
  // ── Year 9 – Group A ──
  { id: 's_emma',   name: 'Emma Thompson',    role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_sophie', name: 'Sophie Chen',      role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_ethan',  name: 'Ethan Huang',      role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_layla',  name: 'Layla Ahmed',      role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_ben',    name: 'Ben Carter',       role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_maria',  name: 'Maria Santos',     role: 'student', classLabel: 'Year 9 – Group A' },
  { id: 's_grace2', name: 'Grace Mitchell',   role: 'student', classLabel: 'Year 9 – Group A' },

  // ── Year 9 – Group B ──
  { id: 's_james',  name: 'James Wilson',     role: 'student', classLabel: 'Year 9 – Group B' },
  { id: 's_priya',  name: 'Priya Sharma',     role: 'student', classLabel: 'Year 9 – Group B' },
  { id: 's_kofi',   name: 'Kofi Mensah',      role: 'student', classLabel: 'Year 9 – Group B' },
  { id: 's_ella',   name: 'Ella Robinson',    role: 'student', classLabel: 'Year 9 – Group B' },
  { id: 's_sam',    name: 'Sam Lewis',        role: 'student', classLabel: 'Year 9 – Group B' },
  { id: 's_aria',   name: 'Aria Petrova',     role: 'student', classLabel: 'Year 9 – Group B' },

  // ── Year 10 – Group A ──
  { id: 's_aisha',    name: 'Aisha Rahman',     role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_liam',     name: 'Liam Thornton',    role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_mia',      name: 'Mia Okonkwo',      role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_aiden',    name: 'Aiden Foster',     role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_fatima',   name: 'Fatima Al-Hassan', role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_zoe',      name: 'Zoe Patterson',    role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_dylan',    name: 'Dylan Foster',     role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_chloe',    name: 'Chloe Bennett',    role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_omar',     name: 'Omar Haddad',      role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_grace',    name: 'Grace Okafor',     role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_ryanm',    name: 'Ryan Mitchell',    role: 'student', classLabel: 'Year 10 – Group A' },
  { id: 's_gracea',   name: 'Grace Adeyemi',    role: 'student', classLabel: 'Year 10 – Group A' },

  // ── Year 10 – Group B ──
  { id: 's_sophia', name: 'Sophia Patel',   role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_arjun',  name: 'Arjun Nair',     role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_zoe2',   name: 'Zoe Ellison',    role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_hannah', name: 'Hannah Cole',    role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_leo',    name: 'Leo Vasquez',    role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_nina',   name: 'Nina Kapoor',    role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_amelia', name: 'Amelia Roberts', role: 'student', classLabel: 'Year 10 – Group B' },
  { id: 's_yuki',   name: 'Yuki Tanaka',    role: 'student', classLabel: 'Year 10 – Group B' },

  // ── Year 11 – Group B ──
  { id: 's_aaron',  name: 'Aaron Blake',    role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_mei2',   name: 'Mei Sato',       role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_kira',   name: 'Kira Novak',     role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_paolo',  name: 'Paolo Bianchi',  role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_hana',   name: 'Hana Yilmaz',    role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_maya',   name: 'Maya Choudhury', role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_oscar',  name: 'Oscar Whitfield',role: 'student', classLabel: 'Year 11 – Group B' },
  { id: 's_yasmin', name: 'Yasmin Karimi',  role: 'student', classLabel: 'Year 11 – Group B' },

  // ── Year 8 – Group A ──
  { id: 's_noah',  name: 'Noah Fitzgerald', role: 'student', classLabel: 'Year 8 – Group A' },
  { id: 's_ava',   name: 'Ava Sinclair',    role: 'student', classLabel: 'Year 8 – Group A' },
  { id: 's_jad',   name: 'Jad Nasser',      role: 'student', classLabel: 'Year 8 – Group A' },
  { id: 's_ruby',  name: 'Ruby Patterson',  role: 'student', classLabel: 'Year 8 – Group A' },
  { id: 's_ivan',  name: 'Ivan Kowalski',   role: 'student', classLabel: 'Year 8 – Group A' },

  // ── Year 8 – Group B ──
  { id: 's_ryan',  name: 'Ryan Okafor',    role: 'student', classLabel: 'Year 8 – Group B' },
  { id: 's_lily',  name: 'Lily Andersson', role: 'student', classLabel: 'Year 8 – Group B' },
  { id: 's_max',   name: 'Max Schneider',  role: 'student', classLabel: 'Year 8 – Group B' },
  { id: 's_tara',  name: 'Tara Singh',     role: 'student', classLabel: 'Year 8 – Group B' },

  // ── Year 12 – Group A (A-Level) ──
  { id: 's_mei',    name: 'Isabella Martinez', role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_daniel', name: 'Daniel Owusu',      role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_freya',  name: 'Freya Lindqvist',   role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_raj',    name: 'Raj Malhotra',      role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_nadia',  name: 'Thomas Hughes',     role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_ananya', name: 'Ananya Iyer',       role: 'student', classLabel: 'Year 12 – Group A' },
  { id: 's_toby',   name: 'Toby Grant',        role: 'student', classLabel: 'Year 12 – Group A' },
];

// Question banks the PDF-import flow draws from, keyed by detected topic.
const HW_PDF_BANKS = {
  algebra: [
    { type:'mcq',     prompt:'Which is a solution to x² − 5x + 6 = 0?',
      choices:['x = 1','x = 2','x = 4','x = 5'], correctIndex:1, points:2 },
    { type:'numeric', prompt:'Solve for x: 3x + 7 = 22.', answer:5, tolerance:0, points:2 },
    { type:'math',    prompt:'Factorise x² − 9. Enter your factorisation.',
      answer:'(x-3)(x+3)', points:3 },
    { type:'short',   prompt:'In one line, state the quadratic formula.', points:2 },
    { type:'long',    prompt:'Solve 2x² − 7x + 3 = 0 by factorising. Show full working.', points:5 },
  ],
  calculus: [
    { type:'mcq',     prompt:'What is d/dx (x³)?',
      choices:['x²','3x²','3x','x³/3'], correctIndex:1, points:2 },
    { type:'math',    prompt:'Differentiate 4x² + 3x − 7. Enter f\'(x) = …',
      answer:"f'(x)=8x+3", points:3 },
    { type:'numeric', prompt:'Evaluate the gradient of y = x² at x = 5.',
      answer:10, tolerance:0, points:2 },
    { type:'long',    prompt:'Differentiate cos(x) from first principles.', points:6 },
    { type:'upload',  prompt:'Upload your photographed working for question 4.', points:3 },
  ],
  physics: [
    { type:'numeric', prompt:'A car accelerates from rest at 3 m/s² for 4s. Final velocity (m/s)?',
      answer:12, tolerance:0.1, points:2 },
    { type:'numeric', prompt:'A 2 kg mass on Earth has weight (N)? Use g = 9.81.',
      answer:19.62, tolerance:0.1, points:2 },
    { type:'mcq',     prompt:'SI unit of force?',
      choices:['joule','watt','newton','pascal'], correctIndex:2, points:1 },
    { type:'short',   prompt:'State Newton\'s second law in one sentence.', points:2 },
    { type:'long',    prompt:'Explain why a falling object reaches terminal velocity.', points:5 },
  ],
  trig: [
    { type:'mcq',     prompt:'Value of sin(30°)?',
      choices:['0','1/2','√3/2','1'], correctIndex:1, points:1 },
    { type:'mcq',     prompt:'Value of cos(60°)?',
      choices:['0','1/2','√3/2','1'], correctIndex:1, points:1 },
    { type:'math',    prompt:'Simplify: sin²(θ) + cos²(θ).',
      answer:'1', points:2 },
    { type:'numeric', prompt:'Hypotenuse of a right triangle with legs 3 and 4.',
      answer:5, tolerance:0, points:2 },
    { type:'long',    prompt:'Prove the sine rule for a triangle ABC.', points:5 },
  ],
  chemistry: [
    { type:'mcq',     prompt:'Which is a noble gas?',
      choices:['oxygen','argon','chlorine','sodium'], correctIndex:1, points:1 },
    { type:'numeric', prompt:'How many moles in 36 g of water (Mr = 18)?',
      answer:2, tolerance:0, points:2 },
    { type:'short',   prompt:'Define an exothermic reaction in one sentence.', points:2 },
    { type:'math',    prompt:'Balance: H₂ + O₂ → H₂O. Enter the coefficient of H₂O.',
      answer:'2', points:2 },
    { type:'long',    prompt:'Explain the trend in reactivity down Group 1.', points:5 },
  ],
  general: [
    { type:'mcq',     prompt:'Pick the prime number.',
      choices:['9','15','17','21'], correctIndex:2, points:1 },
    { type:'numeric', prompt:'Compute 12 × 7.', answer:84, tolerance:0, points:1 },
    { type:'math',    prompt:'Solve: 2x − 5 = 11. Enter x=…',
      answer:'x=8', points:2 },
    { type:'short',   prompt:'Define "function" in your own words.', points:2 },
    { type:'long',    prompt:'Describe one real-world application of statistics.', points:4 },
  ],
};

// ══════════════════════════════════════════════════════════════
//  Extra folders + the bulk homework library
//
//  `HW_MORE_ASSIGNMENTS` is a FACTORY, not a literal, because the assignment
//  shape needs two things that only Homework.jsx owns: `dayOffset` (dates are
//  relative to today so the demo never goes stale) and the staff records whose
//  ids decide ownership (`isMine`). seedStore() calls it with those and folds
//  the result in beside the hand-authored a1…a11 / r1…r6.
//
//  Class labels are REAL: every `classLabel` below matches a group that exists
//  in the admin store (mocks/adminPages.mock.jsx SEED_CLASSES), so the cohort
//  fill at load time finds actual students to assign and synthesise
//  submissions for. A label with no matching class would silently produce an
//  assignment with nobody on it.
//
//  Statuses are mixed on purpose — active (due soon), active (overdue), draft
//  and closed — so every tab of the teacher list and every section of the
//  student view has something in it. Question types cover the full QTYPES
//  catalogue (mcq, multi, truefalse, numeric, math, fillblank, match, short,
//  long, upload).
// ══════════════════════════════════════════════════════════════

const HW_EXTRA_FOLDERS = {
  f_exam:  { id: 'f_exam',  name: 'Exam Prep',     color: '#F97316' },
  f_stats: { id: 'f_stats', name: 'Stats & Data',  color: '#8B5CF6' },
  f_ks3:   { id: 'f_ks3',   name: 'Lower School',  color: '#0EA5E9' },
  f_lang:  { id: 'f_lang',  name: 'Languages',     color: '#059669' },
  f_comp:  { id: 'f_comp',  name: 'Computing',     color: '#7C3AED' },
};

const HW_MORE_ASSIGNMENTS = ({ dayOffset, teacher, staff }) => {
  // Shorthand: every assignment this teacher sets shares the same owner fields.
  const mine = { teacherId: teacher.id, teacherName: teacher.name };
  const by = (t) => ({ teacherId: t.id, teacherName: t.name });

  return [
  // ─────────────────────────────────────────────────────────────
  //  Year 10 – Group A · GCSE Mathematics (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_fractions', title: 'Fractions, Decimals & Percentages', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-9), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-20),
    instructions: 'No calculators. Give fractions in their simplest form.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Write $0.375$ as a fraction in its simplest form.', answer: '\\frac{3}{8}', points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Increase 240 by 15%.', answer: 276, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'Which of these is the largest?',
        choices: ['0.7', '5/8', '68%', '2/3'], correctIndex: 0, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'To convert a decimal to a percentage you multiply by (blank 1); to convert a percentage to a decimal you divide by (blank 2).',
        blanks: ['100', '100'], points: 2 },
      { id: 'q5', type: 'long', prompt: 'A jacket costs £80. It is reduced by 20% in a sale, then a further 10% off the sale price at the till. Explain, with working, why the total reduction is not 30%.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_linear_graphs', title: 'Straight-Line Graphs', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(3), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Sketch each graph in your book, then enter the answers here.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'A line has gradient $4$ and passes through $(0, -3)$. Write its equation in the form $y = mx + c$.', answer: 'y=4x-3', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'Find the gradient of the line joining $(1, 2)$ and $(5, 14)$.', answer: 3, tolerance: 0, points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'Two lines are parallel if and only if they have the same gradient.', answer: true, points: 1 },
      { id: 'q4', type: 'mcq', prompt: 'Which line is perpendicular to $y = 2x + 1$?',
        choices: ['y = 2x − 1', 'y = −2x + 1', 'y = ½x + 3', 'y = −½x + 3'], correctIndex: 3, points: 2 },
      { id: 'q5', type: 'short', prompt: 'Explain how you can tell from its equation where a straight line crosses the y-axis.', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_percentages', title: 'Compound Interest & Growth', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-1), timeLimitMins: 30, allowReview: true,
    status: 'active', createdAt: dayOffset(-8),
    instructions: 'Round money answers to the nearest penny.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: '£2,000 is invested at 3% compound interest per year. What is it worth after 2 years?', answer: 2121.8, tolerance: 0.5, points: 3 },
      { id: 'q2', type: 'math', prompt: 'Write the multiplier for a 12% decrease.', answer: '0.88', points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'A population falls by 5% each year. This is an example of…',
        choices: ['linear decay', 'exponential decay', 'quadratic growth', 'inverse proportion'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'long', prompt: 'A car depreciates by 18% in its first year and 12% in each year after. Show that it loses more than half its value in five years.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_ratio', title: 'Ratio & Proportion', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(12), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — needs the recipe question adding before it goes out.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Share £450 in the ratio 4 : 5. How much is the larger share?', answer: 250, tolerance: 0, points: 2 },
      { id: 'q2', type: 'math', prompt: 'Simplify the ratio $18 : 24$ to its simplest form (use a colon).', answer: '3:4', points: 2 },
      { id: 'q3', type: 'short', prompt: 'Explain the difference between direct and inverse proportion.', points: 3 },
    ],
    submissions: {},
  },
  {
    id: 'hw_pythagoras', title: 'Pythagoras & Basic Trigonometry', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(11), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1),
    instructions: 'Give lengths to 1 d.p. and angles to the nearest degree.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A right-angled triangle has legs 5 cm and 12 cm. Find the hypotenuse in cm.', answer: 13, tolerance: 0, points: 2 },
      { id: 'q2', type: 'math', prompt: 'State Pythagoras’ theorem for a triangle with hypotenuse $c$.', answer: 'a^2+b^2=c^2', points: 2 },
      { id: 'q3', type: 'match', prompt: 'Match each ratio to the sides it uses.',
        pairs: [
          { left: 'sin θ', right: 'opposite / hypotenuse' },
          { left: 'cos θ', right: 'adjacent / hypotenuse' },
          { left: 'tan θ', right: 'opposite / adjacent' },
        ], points: 3 },
      { id: 'q4', type: 'upload', prompt: 'Upload a photo of your labelled diagram for question 5 of the worksheet.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'A ladder 4 m long leans against a wall with its foot 1.5 m from the base. Find how far up the wall it reaches and the angle it makes with the ground. Show all working.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_sequences', title: 'Sequences & the nth Term', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-13), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-24),
    instructions: 'Show the differences you used to find each rule.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Find the nth term of the sequence $5, 8, 11, 14, \\dots$', answer: '3n+2', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'For the sequence with nth term $4n - 1$, what is the 20th term?', answer: 79, tolerance: 0, points: 2 },
      { id: 'q3', type: 'multi', prompt: 'Which of these sequences are arithmetic?',
        choices: ['2, 4, 6, 8', '1, 2, 4, 8', '10, 7, 4, 1', '1, 4, 9, 16'], correctIndices: [0, 2], points: 3 },
      { id: 'q4', type: 'short', prompt: 'How can you tell from the first differences that a sequence is quadratic?', points: 2 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 11 – Group B · GCSE Mathematics (Heebz A) — exam year
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_simeq_11', title: 'Simultaneous Equations — Revision', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...mine,
    studentIds: [], dueAt: dayOffset(4), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'One linear pair, one linear-and-quadratic pair. Show your elimination clearly.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Solve $3x + 2y = 16$ and $x - 2y = 0$. Enter the value of $x$.', answer: 'x=4', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'For that same pair, what is the value of $y$?', answer: 2, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'A linear and a quadratic equation are solved simultaneously. How many solutions are possible?',
        choices: ['Exactly one', 'Zero, one or two', 'Always two', 'Infinitely many'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Solve $y = x^2 - 3$ and $y = 2x$ simultaneously, and explain what your answers mean graphically.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_circle_theorems', title: 'Circle Theorems', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...mine,
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: 45, allowReview: true,
    status: 'active', createdAt: dayOffset(-10),
    instructions: 'Name the theorem you use in every reason — "angles in a circle" earns nothing.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'An angle at the centre is 130°. What is the angle at the circumference on the same arc?', answer: 65, tolerance: 0, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'Opposite angles in a cyclic quadrilateral sum to 180°.', answer: true, points: 1 },
      { id: 'q3', type: 'mcq', prompt: 'The angle between a tangent and a radius at the point of contact is…',
        choices: ['45°', '60°', '90°', 'equal to the angle in the alternate segment'], correctIndex: 2, points: 2 },
      { id: 'q4', type: 'match', prompt: 'Match each theorem to its conclusion.',
        pairs: [
          { left: 'Angle in a semicircle', right: 'is 90°' },
          { left: 'Angles in the same segment', right: 'are equal' },
          { left: 'Alternate segment theorem', right: 'tangent–chord angle = angle in alternate segment' },
        ], points: 3 },
      { id: 'q5', type: 'upload', prompt: 'Upload your annotated diagrams for questions 6–8 of the past paper.', points: 4 },
    ],
    submissions: {},
  },
  {
    id: 'hw_algebra_proof', title: 'Algebraic Proof', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...mine,
    studentIds: [], dueAt: dayOffset(15), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-2),
    instructions: 'Draft — hold until after the mock.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Write an expression for a general even number and a general odd number, using $n$.', points: 2 },
      { id: 'q2', type: 'long', prompt: 'Prove that the sum of any three consecutive integers is always a multiple of 3.', points: 5 },
      { id: 'q3', type: 'long', prompt: 'Prove that the difference between the squares of any two consecutive integers is always odd.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_transform', title: 'Transformations of Graphs', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-16), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-27),
    instructions: 'Describe every transformation fully: type, direction and amount.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'The graph of $y = f(x) + 3$ is the graph of $y = f(x)$ translated…',
        choices: ['3 right', '3 left', '3 up', '3 down'], correctIndex: 2, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'The graph of $y = f(x - 2)$ is the graph of $y = f(x)$ translated…',
        choices: ['2 right', '2 left', '2 up', '2 down'], correctIndex: 0, points: 2 },
      { id: 'q3', type: 'fillblank', prompt: 'y = −f(x) is a reflection in the (blank 1)-axis; y = f(−x) is a reflection in the (blank 2)-axis.',
        blanks: ['x', 'y'], points: 2 },
      { id: 'q4', type: 'long', prompt: 'Sketch $y = (x - 1)^2 + 4$ from the graph of $y = x^2$, describing each step of the transformation.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_mock_p1', title: 'Mock Paper 1 — Non-Calculator', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...mine,
    studentIds: [], dueAt: dayOffset(9), timeLimitMins: 90, allowReview: false,
    status: 'active', createdAt: dayOffset(-1),
    instructions: 'Timed: 90 minutes, no calculator. Once you start, finish in one sitting.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Work out $\\dfrac{2}{3} + \\dfrac{1}{4}$ and give your answer as a decimal to 3 d.p.', answer: 0.917, tolerance: 0.002, points: 3 },
      { id: 'q2', type: 'math', prompt: 'Expand and simplify $(x + 3)(x - 5)$.', answer: 'x^2-2x-15', points: 3 },
      { id: 'q3', type: 'numeric', prompt: 'A bag has 5 red and 7 blue counters. One is taken at random. What is P(red)? Give your answer to 3 d.p.', answer: 0.417, tolerance: 0.005, points: 2 },
      { id: 'q4', type: 'multi', prompt: 'Which of these are irrational numbers?',
        choices: ['√2', '22/7', 'π', '0.75'], correctIndices: [0, 2], points: 3 },
      { id: 'q5', type: 'long', prompt: 'A cylinder has radius 5 cm and height 12 cm. Find its volume in terms of π and explain each step.', points: 5 },
      { id: 'q6', type: 'upload', prompt: 'Upload a photo of every page of your working.', points: 4 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 11 – Group C · GCSE Mathematics (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_indices_11c', title: 'Indices & Standard Form', subject: 'Mathematics',
    classLabel: 'Year 11 – Group C', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(2), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-4),
    instructions: 'Standard form answers must be in the form $a \\times 10^n$ with $1 \\le a < 10$.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Evaluate $3^4$.', answer: 81, tolerance: 0, points: 1 },
      { id: 'q2', type: 'math', prompt: 'Write $0.00042$ in standard form.', answer: '4.2\\times10^{-4}', points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'What is $2^{-3}$?',
        choices: ['−8', '−6', '1/8', '1/6'], correctIndex: 2, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'Index laws: xᵃ ÷ xᵇ = x^(blank 1) and x^(1/2) = the (blank 2) of x.',
        blanks: ['a-b', 'square root'], points: 2 },
      { id: 'q5', type: 'short', prompt: 'Why is standard form useful in science? Give one example.', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_vectors_gcse', title: 'Vectors (GCSE)', subject: 'Mathematics',
    classLabel: 'Year 11 – Group C', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-11), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-21),
    instructions: 'Use column vector notation throughout.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A vector has components 6 and 8. Find its magnitude.', answer: 10, tolerance: 0, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'Vectors that are multiples of each other are parallel.', answer: true, points: 1 },
      { id: 'q3', type: 'math', prompt: 'If $\\mathbf{a} = 2\\mathbf{i} + \\mathbf{j}$ and $\\mathbf{b} = \\mathbf{i} - 3\\mathbf{j}$, find $\\mathbf{a} + \\mathbf{b}$.', answer: '3\\mathbf{i}-2\\mathbf{j}', points: 3 },
      { id: 'q4', type: 'long', prompt: 'OABC is a parallelogram with OA = a and OC = c. Prove that the diagonals bisect each other.', points: 6 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 10 – Group C · GCSE Mathematics (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_area_volume', title: 'Area, Surface Area & Volume', subject: 'Mathematics',
    classLabel: 'Year 10 – Group C', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Include units in your written answers; the boxes below take numbers only.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the area of a triangle with base 14 cm and perpendicular height 9 cm, in cm².', answer: 63, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'A cuboid measures 3 cm × 4 cm × 10 cm. Find its volume in cm³.', answer: 120, tolerance: 0, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Write the formula for the volume of a cylinder of radius $r$ and height $h$.', answer: 'V=\\pi r^2h', points: 2 },
      { id: 'q4', type: 'mcq', prompt: 'Which units are correct for surface area?',
        choices: ['cm', 'cm²', 'cm³', 'cm⁴'], correctIndex: 1, points: 1 },
      { id: 'q5', type: 'long', prompt: 'A cone and a cylinder have the same radius and height. Explain, using the formulae, why the cone has one third of the volume.', points: 4 },
    ],
    submissions: {},
  },
  {
    id: 'hw_stats_avg', title: 'Averages, Spread & Frequency Tables', subject: 'Mathematics',
    classLabel: 'Year 10 – Group C', folderId: 'f_stats', ...mine,
    studentIds: [], dueAt: dayOffset(-4), timeLimitMins: 40, allowReview: true,
    status: 'active', createdAt: dayOffset(-12),
    instructions: 'For grouped data, use the midpoints — state clearly that your mean is an estimate.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the mean of 4, 7, 7, 10, 12.', answer: 8, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Find the range of 3, 15, 8, 21, 6.', answer: 18, tolerance: 0, points: 1 },
      { id: 'q3', type: 'mcq', prompt: 'Which average is least affected by an extreme outlier?',
        choices: ['Mean', 'Median', 'Range', 'Mode'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'multi', prompt: 'Which of these are measures of spread?',
        choices: ['Range', 'Median', 'Interquartile range', 'Mode'], correctIndices: [0, 2], points: 3 },
      { id: 'q5', type: 'short', prompt: 'Why is a mean calculated from a grouped frequency table only an estimate?', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_prob_tree', title: 'Probability Trees', subject: 'Mathematics',
    classLabel: 'Year 10 – Group C', folderId: 'f_stats', ...mine,
    studentIds: [], dueAt: dayOffset(16), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — add the without-replacement question before publishing.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A fair coin is flipped twice. What is the probability of two heads? Give a decimal.', answer: 0.25, tolerance: 0, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'On a tree diagram, the probabilities on each set of branches must add to 1.', answer: true, points: 1 },
      { id: 'q3', type: 'long', prompt: 'A bag has 4 red and 6 blue counters. Two are taken without replacement. Draw the tree and find P(one of each colour).', points: 5 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 9 – Group C · GCSE Mathematics (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_neg_bidmas', title: 'Negative Numbers & BIDMAS', subject: 'Mathematics',
    classLabel: 'Year 9 – Group C', folderId: 'f_ks3', ...mine,
    studentIds: [], dueAt: dayOffset(-8), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-19),
    instructions: 'Write out each step — do not do it all in your head.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Work out $-7 + 12$.', answer: 5, tolerance: 0, points: 1 },
      { id: 'q2', type: 'numeric', prompt: 'Work out $3 + 4 \\times 2^2$.', answer: 19, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'What is $-6 \\times -4$?',
        choices: ['−24', '−10', '10', '24'], correctIndex: 3, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'BIDMAS stands for Brackets, (blank 1), Division, Multiplication, Addition, Subtraction.',
        blanks: ['Indices'], points: 1 },
      { id: 'q5', type: 'short', prompt: 'Explain why $-3^2$ and $(-3)^2$ give different answers.', points: 3 },
    ],
    submissions: {},
  },
  {
    id: 'hw_expand_factor', title: 'Expanding & Factorising', subject: 'Mathematics',
    classLabel: 'Year 9 – Group C', folderId: 'f_ks3', ...mine,
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Always check by expanding your factorised answer back out.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Expand $3(2x - 5)$.', answer: '6x-15', points: 2 },
      { id: 'q2', type: 'math', prompt: 'Factorise $12x + 18$ fully.', answer: '6(2x+3)', points: 2 },
      { id: 'q3', type: 'math', prompt: 'Expand and simplify $(x + 4)(x + 2)$.', answer: 'x^2+6x+8', points: 3 },
      { id: 'q4', type: 'mcq', prompt: 'Which is the fully factorised form of $x^2 - 16$?',
        choices: ['(x − 4)(x − 4)', '(x − 4)(x + 4)', '(x − 8)(x + 2)', 'x(x − 16)'], correctIndex: 1, points: 2 },
      { id: 'q5', type: 'short', prompt: 'What does "factorise fully" mean? Give an example of a partly factorised answer.', points: 2 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 12 – Group A · A-Level Maths / Further Maths (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_binomial', title: 'Binomial Expansion', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(4), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Use the equation editor for algebraic answers. State any validity conditions.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Expand $(1 + x)^4$ in ascending powers of $x$.', answer: '1+4x+6x^2+4x^3+x^4', points: 4 },
      { id: 'q2', type: 'numeric', prompt: 'Find the coefficient of $x^2$ in the expansion of $(1 + 3x)^5$.', answer: 90, tolerance: 0, points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'The expansion of $(1 + x)^{-1}$ is valid for…',
        choices: ['all x', '|x| < 1', 'x > 0', 'x ≥ 1'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Use the binomial expansion to find an approximation for $\\sqrt{1.02}$ to 5 decimal places, and comment on the accuracy.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_logs', title: 'Logarithms & Exponentials', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(-1), timeLimitMins: 50, allowReview: true,
    status: 'active', createdAt: dayOffset(-9),
    instructions: 'Leave exact answers in terms of $\\ln$ or $e$ unless a decimal is asked for.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Evaluate $\\log_2 32$.', answer: 5, tolerance: 0, points: 2 },
      { id: 'q2', type: 'math', prompt: 'Write $\\log a + \\log b - \\log c$ as a single logarithm.', answer: '\\log\\frac{ab}{c}', points: 3 },
      { id: 'q3', type: 'truefalse', prompt: '$\\ln(x + y) = \\ln x + \\ln y$ for all positive $x$ and $y$.', answer: false, points: 2 },
      { id: 'q4', type: 'math', prompt: 'Solve $e^{2x} = 7$, giving $x$ in exact form.', answer: 'x=\\frac{1}{2}\\ln7', points: 3 },
      { id: 'q5', type: 'long', prompt: 'A culture of bacteria grows according to $N = 500e^{0.4t}$, where $t$ is in hours. Find the doubling time and explain your method.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_trig_id_al', title: 'Trigonometric Identities & Equations', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(-6), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-17),
    instructions: 'Give all solutions in the interval $0 \\le \\theta < 360°$.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Simplify $\\dfrac{\\sin\\theta}{\\cos\\theta}$.', answer: '\\tan\\theta', points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'How many solutions does $\\sin\\theta = 0.5$ have for $0 \\le \\theta < 360°$?', answer: 2, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'Which identity follows from $\\sin^2\\theta + \\cos^2\\theta = 1$ after dividing by $\\cos^2\\theta$?',
        choices: ['1 + cot²θ = cosec²θ', 'tan²θ + 1 = sec²θ', 'sec²θ − 1 = cosec²θ', 'sin2θ = 2sinθcosθ'], correctIndex: 1, points: 3 },
      { id: 'q4', type: 'long', prompt: 'Solve $2\\sin^2\\theta - \\sin\\theta - 1 = 0$ for $0 \\le \\theta < 360°$, showing full working.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_series_al', title: 'Sequences & Series', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(18), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — pairs with the recurrence-relation lesson in two weeks.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the sum of the first 20 terms of the arithmetic series with first term 3 and common difference 4.', answer: 820, tolerance: 0, points: 3 },
      { id: 'q2', type: 'math', prompt: 'Write the formula for the sum to infinity of a geometric series with $|r| < 1$.', answer: 'S=\\frac{a}{1-r}', points: 2 },
      { id: 'q3', type: 'long', prompt: 'Prove the formula for the sum of the first $n$ terms of an arithmetic series.', points: 6 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Year 13 – Group A · A-Level Maths (Heebz A)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_int_parts', title: 'Integration by Parts & Substitution', subject: 'Mathematics',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(7), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'State your choice of $u$ and $\\dfrac{dv}{dx}$ before you start each one.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Find $\\displaystyle\\int x e^{x} \\, dx$. Include the constant of integration.', answer: 'xe^x-e^x+c', points: 4 },
      { id: 'q2', type: 'numeric', prompt: 'Evaluate $\\displaystyle\\int_1^2 \\dfrac{1}{x} \\, dx$ to 3 decimal places.', answer: 0.693, tolerance: 0.002, points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'Which substitution is most useful for $\\displaystyle\\int 2x\\sqrt{x^2 + 1}\\,dx$?',
        choices: ['u = x', 'u = x² + 1', 'u = √x', 'u = 2x'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Find $\\displaystyle\\int x^2 \\ln x \\, dx$, showing every application of integration by parts.', points: 6 },
      { id: 'q5', type: 'upload', prompt: 'Upload your handwritten solutions to the exam-style questions on the back page.', points: 4 },
    ],
    submissions: {},
  },
  {
    id: 'hw_diff_eq', title: 'Differential Equations', subject: 'Mathematics',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(-5), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-16),
    instructions: 'Separate the variables first, then apply the boundary condition.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Solve $\\dfrac{dy}{dx} = ky$. Give the general solution.', answer: 'y=Ae^{kx}', points: 4 },
      { id: 'q2', type: 'truefalse', prompt: 'A differential equation with a boundary condition has a unique particular solution.', answer: true, points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'For $\\dfrac{dy}{dx} = 3y$ with $y = 2$ when $x = 0$, find $y$ when $x = 0$ (check your constant).', answer: 2, tolerance: 0, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Newton’s law of cooling gives $\\dfrac{d\\theta}{dt} = -k(\\theta - \\theta_0)$. Solve it and describe the shape of the graph.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_induction', title: 'Proof by Induction', subject: 'Further Maths',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(11), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1),
    instructions: 'Every proof needs all four steps: base case, assumption, inductive step, conclusion.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which step is being carried out when you write "assume true for n = k"?',
        choices: ['Base case', 'Inductive hypothesis', 'Inductive step', 'Conclusion'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'math', prompt: 'State the closed form for $\\displaystyle\\sum_{r=1}^{n} r$.', answer: '\\frac{n(n+1)}{2}', points: 3 },
      { id: 'q3', type: 'long', prompt: 'Prove by induction that $\\displaystyle\\sum_{r=1}^{n} r^2 = \\dfrac{n(n+1)(2n+1)}{6}$.', points: 8 },
      { id: 'q4', type: 'long', prompt: 'Prove by induction that $3^{2n} - 1$ is divisible by 8 for all positive integers $n$.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Other staff — these never appear on Heebz A's list (isMine), but
  //  they fill out the STUDENT view with homework across subjects.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_inspector', title: "'An Inspector Calls' — Responsibility", subject: 'English Literature',
    classLabel: 'Year 10 – Group A', folderId: 'f_hum', ...by(staff.webb),
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-4),
    instructions: 'Embed short quotations inside your sentences rather than quoting whole lines.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Who is the first character the Inspector questions?', answer: 'Mr Birling', points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'What name does Eva Smith use later in the play?',
        choices: ['Sheila Birling', 'Daisy Renton', 'Edna', 'Sybil'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'short', prompt: 'In one sentence, what does Priestley suggest through the Inspector’s final speech?', points: 3 },
      { id: 'q4', type: 'long', prompt: 'How does Priestley present the theme of responsibility in the play? Refer to at least two characters.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_industrial', title: 'The Industrial Revolution', subject: 'History',
    classLabel: 'Year 10 – Group A', folderId: 'f_hum', ...by(staff.yoo),
    studentIds: [], dueAt: dayOffset(-10), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-22),
    instructions: 'Use specific dates and named examples — general statements score little.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'In which year did the Great Exhibition take place in London?', answer: 1851, tolerance: 0, points: 2 },
      { id: 'q2', type: 'multi', prompt: 'Which of these were consequences of industrialisation in Britain?',
        choices: ['Rapid urban growth', 'A fall in coal demand', 'Poor sanitation in cities', 'The Factory Acts'], correctIndices: [0, 2, 3], points: 3 },
      { id: 'q3', type: 'short', prompt: 'Name one invention that transformed the textile industry and say what it did.', points: 3 },
      { id: 'q4', type: 'long', prompt: 'To what extent did the Industrial Revolution improve the lives of ordinary working people? Argue both sides.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_forces', title: 'Forces & Motion', subject: 'Physics',
    classLabel: 'Year 10 – Group A', folderId: 'f_sci', ...by(staff.nair),
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: 35, allowReview: true,
    status: 'active', createdAt: dayOffset(-11),
    instructions: 'Take g = 9.81 N/kg. Always give units in your written answers.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A 6 kg object accelerates at 2.5 m/s². What resultant force acts on it, in newtons?', answer: 15, tolerance: 0.1, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Which quantity is a vector?',
        choices: ['Speed', 'Distance', 'Velocity', 'Mass'], correctIndex: 2, points: 2 },
      { id: 'q3', type: 'fillblank', prompt: 'Newton’s second law: force = (blank 1) × (blank 2).',
        blanks: ['mass', 'acceleration'], points: 2 },
      { id: 'q4', type: 'match', prompt: 'Match each quantity to its SI unit.',
        pairs: [
          { left: 'Force', right: 'newton' },
          { left: 'Energy', right: 'joule' },
          { left: 'Power', right: 'watt' },
        ], points: 3 },
      { id: 'q5', type: 'long', prompt: 'Describe an experiment to investigate how the acceleration of a trolley depends on the force applied. Include your control variables.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_rates', title: 'Rates of Reaction', subject: 'Chemistry',
    classLabel: 'Year 12 – Group A', folderId: 'f_sci', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Refer to collision theory in every explanation.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Increasing the temperature increases the rate of reaction mainly because…',
        choices: ['particles are larger', 'more particles exceed the activation energy', 'the activation energy falls', 'pressure rises'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'A catalyst is used up during the reaction it catalyses.', answer: false, points: 1 },
      { id: 'q3', type: 'numeric', prompt: '48 cm³ of gas is produced in 30 s. What is the mean rate of reaction in cm³/s?', answer: 1.6, tolerance: 0.05, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Define activation energy in one sentence.', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Explain, using collision theory, why increasing the surface area of a solid reactant increases the rate of reaction.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_supply_demand', title: 'Supply, Demand & Elasticity', subject: 'Economics',
    classLabel: 'Year 12 – Group A', folderId: 'f_hum', ...by(staff.stone),
    studentIds: [], dueAt: dayOffset(-7), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-18),
    instructions: 'Every answer that mentions a shift should say which curve moves and in which direction.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'A rise in the price of a substitute good will…',
        choices: ['shift demand for this good left', 'shift demand for this good right', 'shift supply left', 'have no effect'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Price rises 10% and quantity demanded falls 25%. What is the price elasticity of demand? Give a negative number to 1 d.p.', answer: -2.5, tolerance: 0.05, points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'Demand is described as inelastic when the absolute value of PED is less than 1.', answer: true, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Give one reason a good might have highly inelastic demand.', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Using a diagram, explain the effect of a per-unit tax on the equilibrium price and quantity of a good with inelastic demand.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Heebz A — second wave across every class they teach. These are the
  //  ones that show on the signed-in teacher's OWN list (isMine); the
  //  other-staff blocks below only reach the student and admin surfaces.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_angles_polygons', title: 'Angles & Polygons', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(8), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Give a reason for every angle you find — "angles add to 180°" is not enough on its own.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the size of one interior angle of a regular hexagon, in degrees.', answer: 120, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'The exterior angles of any polygon sum to how many degrees?', answer: 360, tolerance: 0, points: 1 },
      { id: 'q3', type: 'mcq', prompt: 'Two angles on a straight line that are not equal are called…',
        choices: ['vertically opposite', 'supplementary', 'complementary', 'alternate'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'Angles on parallel lines: (blank 1) angles form an F-shape and are equal; (blank 2) angles form a Z-shape and are equal.',
        blanks: ['corresponding', 'alternate'], points: 2 },
      { id: 'q5', type: 'long', prompt: 'A regular polygon has an interior angle of 156°. Find how many sides it has, showing your reasoning in full.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_rounding_est', title: 'Rounding & Estimation', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(-15), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-26),
    instructions: 'Estimates are done by rounding to 1 significant figure first — show that step.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Round 4,738 to 2 significant figures.', answer: 4700, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Estimate $\\dfrac{19.6 \\times 4.1}{0.51}$ by rounding each number to 1 s.f.', answer: 160, tolerance: 0, points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'Which of these is 0.004096 written to 2 significant figures?',
        choices: ['0.0040', '0.0041', '0.004', '0.00410'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Why is estimating useful even when you have a calculator?', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_quad_graphs', title: 'Quadratic Graphs & Turning Points', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...mine,
    studentIds: [], dueAt: dayOffset(-4), timeLimitMins: 45, allowReview: true,
    status: 'active', createdAt: dayOffset(-13),
    instructions: 'Sketches need the roots, the y-intercept and the turning point labelled.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Write $x^2 - 6x + 11$ in completed-square form.', answer: '(x-3)^2+2', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'For $y = x^2 - 6x + 11$, what is the x-coordinate of the turning point?', answer: 3, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'A quadratic with a negative coefficient of $x^2$ has a turning point that is a…',
        choices: ['minimum', 'maximum', 'point of inflection', 'root'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'multi', prompt: 'Which of these tell you where a quadratic graph crosses the x-axis?',
        choices: ['Factorising', 'The quadratic formula', 'The y-intercept', 'Completing the square'], correctIndices: [0, 1, 3], points: 3 },
      { id: 'q5', type: 'upload', prompt: 'Upload your sketches for questions 4 and 5 with all key points labelled.', points: 4 },
    ],
    submissions: {},
  },
  {
    id: 'hw_histograms', title: 'Histograms & Cumulative Frequency', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_stats', ...mine,
    studentIds: [], dueAt: dayOffset(-11), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-22),
    instructions: 'On a histogram the y-axis is frequency density, never frequency.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Write the formula for frequency density.', answer: 'frequency \\div class width', points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'A class of width 5 contains 30 items. What is its frequency density?', answer: 6, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'On a cumulative frequency graph, the median is read off at what fraction of the total?',
        choices: ['One quarter', 'One half', 'Three quarters', 'The whole total'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'numeric', prompt: 'The lower quartile is 24 and the upper quartile is 41. Find the interquartile range.', answer: 17, tolerance: 0, points: 2 },
      { id: 'q5', type: 'long', prompt: 'Explain why a histogram with unequal class widths would be misleading if frequency were plotted instead of frequency density.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_similar_shapes', title: 'Similar Shapes & Scale Factors', subject: 'Mathematics',
    classLabel: 'Year 11 – Group C', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Remember: areas scale by k², volumes by k³.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Two similar triangles have a length scale factor of 3. By what factor is the area larger?', answer: 9, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Two similar solids have a length scale factor of 2. The smaller has volume 15 cm³. Find the volume of the larger, in cm³.', answer: 120, tolerance: 0, points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'Similar shapes have equal corresponding angles.', answer: true, points: 1 },
      { id: 'q4', type: 'match', prompt: 'Match each scale factor to what it multiplies.',
        pairs: [
          { left: 'k', right: 'lengths' },
          { left: 'k²', right: 'areas' },
          { left: 'k³', right: 'volumes' },
        ], points: 3 },
      { id: 'q5', type: 'long', prompt: 'Prove that two triangles are similar if two pairs of their angles are equal, and explain why the third pair must then match.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_inequalities', title: 'Inequalities & Number Lines', subject: 'Mathematics',
    classLabel: 'Year 10 – Group C', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(2), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-4),
    instructions: 'Use an open circle for < and >, a filled circle for ≤ and ≥.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Solve $3x + 4 < 19$. What is the largest integer value of $x$?', answer: 4, tolerance: 0, points: 2 },
      { id: 'q2', type: 'math', prompt: 'Solve the inequality $2x - 7 \\ge 5$. Give your answer in the form x≥…', answer: 'x\\ge6', points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'What happens to an inequality sign when you multiply both sides by a negative number?',
        choices: ['Nothing', 'It reverses', 'It becomes an equals sign', 'It becomes ≤'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'multi', prompt: 'Which integers satisfy $-2 < x \\le 2$?',
        choices: ['−2', '−1', '0', '2'], correctIndices: [1, 2, 3], points: 3 },
      { id: 'q5', type: 'short', prompt: 'Explain the difference between what x < 5 and x ≤ 5 mean on a number line.', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_coords_9c', title: 'Coordinates & Straight Lines', subject: 'Mathematics',
    classLabel: 'Year 9 – Group C', folderId: 'f_ks3', ...mine,
    studentIds: [], dueAt: dayOffset(10), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — pairs with next week’s plotting lesson.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'What is the x-coordinate of the point (7, −3)?', answer: 7, tolerance: 0, points: 1 },
      { id: 'q2', type: 'numeric', prompt: 'Find the midpoint of (2, 4) and (8, 10). Give the x-coordinate of the midpoint.', answer: 5, tolerance: 0, points: 2 },
      { id: 'q3', type: 'mcq', prompt: 'Which line is horizontal?',
        choices: ['x = 3', 'y = 3', 'y = x', 'y = 3x'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Describe in one sentence how you would plot the line y = x + 2.', points: 3 },
    ],
    submissions: {},
  },
  {
    id: 'hw_stationary_pts', title: 'Differentiation — Stationary Points', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(3), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Always justify the nature of a stationary point with the second derivative.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Differentiate $y = x^3 - 6x^2 + 9x$.', answer: '3x^2-12x+9', points: 3 },
      { id: 'q2', type: 'multi', prompt: 'For that curve, at which x-values are the stationary points?',
        choices: ['x = 0', 'x = 1', 'x = 3', 'x = 6'], correctIndices: [1, 2], points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'If $\\dfrac{d^2y}{dx^2} < 0$ at a stationary point, the point is a…',
        choices: ['minimum', 'maximum', 'point of inflection', 'root'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'long', prompt: 'A closed cylinder has a fixed volume of 500 cm³. Use differentiation to find the radius that minimises its surface area.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_complex_numbers', title: 'Complex Numbers', subject: 'Further Maths',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(9), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1),
    instructions: 'Give arguments in radians in the interval $-\\pi < \\theta \\le \\pi$.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Simplify $(3 + 2i)(1 - i)$.', answer: '5-i', points: 3 },
      { id: 'q2', type: 'numeric', prompt: 'Find the modulus of $3 + 4i$.', answer: 5, tolerance: 0, points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'The complex roots of a real polynomial always occur in conjugate pairs.', answer: true, points: 2 },
      { id: 'q4', type: 'math', prompt: 'Write $\\dfrac{1}{i}$ in the form $a + bi$.', answer: '-i', points: 3 },
      { id: 'q5', type: 'long', prompt: 'Solve $z^2 - 4z + 13 = 0$ and plot both roots on an Argand diagram, describing their relationship.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_numerical_methods', title: 'Numerical Methods', subject: 'Mathematics',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(-8), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-19),
    instructions: 'State the interval you use for every change-of-sign argument.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'A change of sign for $f(x)$ between $x = 1$ and $x = 2$ shows that…',
        choices: ['f has a maximum there', 'a root lies in that interval', 'f is increasing', 'f is discontinuous'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Use the trapezium rule with 2 strips to estimate $\\displaystyle\\int_0^2 x^2\\,dx$.', answer: 3, tolerance: 0.05, points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'The trapezium rule underestimates the integral of a convex (curving upwards) function.', answer: false, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Explain the Newton–Raphson method, state one situation in which it fails, and illustrate that failure with a sketch.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Priya Nair · GCSE Science
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_cells_micro', title: 'Cells & Microscopy', subject: 'Science',
    classLabel: 'Year 10 – Group A', folderId: 'f_sci', ...by(staff.nair),
    studentIds: [], dueAt: dayOffset(3), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-4),
    instructions: 'Give magnifications as a whole number with a × in front in your written work.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'An image is 50 mm across and the real object is 0.5 mm across. What is the magnification?', answer: 100, tolerance: 0, points: 3 },
      { id: 'q2', type: 'multi', prompt: 'Which of these are found in a plant cell but NOT an animal cell?',
        choices: ['Cell wall', 'Ribosomes', 'Chloroplasts', 'Permanent vacuole'], correctIndices: [0, 2, 3], points: 3 },
      { id: 'q3', type: 'fillblank', prompt: 'A light microscope has lower (blank 1) than an electron microscope, so it cannot show small (blank 2) such as ribosomes.',
        blanks: ['resolution', 'organelles'], points: 2 },
      { id: 'q4', type: 'short', prompt: 'Why are cells stained before being viewed under a light microscope?', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Describe how you would prepare a slide of onion epidermis cells, and explain why each step matters.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_energy_transfers', title: 'Energy Transfers — Revision', subject: 'Science',
    classLabel: 'Year 11 – Group A', folderId: 'f_exam', ...by(staff.nair),
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: 40, allowReview: true,
    status: 'active', createdAt: dayOffset(-11),
    instructions: 'Name the energy stores and the pathway between them in every answer.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A 2 kg mass is lifted 3 m. Calculate the gain in gravitational potential energy in joules. Use g = 9.8 N/kg.', answer: 58.8, tolerance: 0.2, points: 3 },
      { id: 'q2', type: 'mcq', prompt: 'A device transfers 200 J of energy usefully out of 500 J supplied. Its efficiency is…',
        choices: ['20%', '40%', '60%', '250%'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'Energy can be created in a closed system as long as it is later dissipated.', answer: false, points: 1 },
      { id: 'q4', type: 'match', prompt: 'Match each device to its main useful energy transfer.',
        pairs: [
          { left: 'Electric kettle', right: 'electrical → thermal' },
          { left: 'Loudspeaker', right: 'electrical → sound' },
          { left: 'Falling ball', right: 'gravitational → kinetic' },
        ], points: 3 },
      { id: 'q5', type: 'long', prompt: 'Explain how loft insulation reduces the rate of energy transfer out of a house. Refer to conduction and convection.', points: 6 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  James Okafor · Biology / Science
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_enzymes', title: 'Enzymes & Digestion', subject: 'Biology',
    classLabel: 'Year 11 – Group A', folderId: 'f_sci', ...by(staff.okafor),
    studentIds: [], dueAt: dayOffset(-12), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-23),
    instructions: 'Use the lock-and-key model language: substrate, active site, denatured.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which enzyme breaks down starch?',
        choices: ['Protease', 'Lipase', 'Amylase', 'Catalase'], correctIndex: 2, points: 2 },
      { id: 'q2', type: 'fillblank', prompt: 'At high temperatures the (blank 1) site changes shape, so the enzyme is (blank 2) and can no longer bind its substrate.',
        blanks: ['active', 'denatured'], points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'A reaction produces 24 cm³ of product in 4 minutes. Give the mean rate in cm³ per minute.', answer: 6, tolerance: 0, points: 2 },
      { id: 'q4', type: 'truefalse', prompt: 'Enzymes are used up in the reactions they catalyse.', answer: false, points: 1 },
      { id: 'q5', type: 'long', prompt: 'Describe an experiment to investigate the effect of pH on the rate of an amylase-catalysed reaction. Include your control variables.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_particles', title: 'Particles & States of Matter', subject: 'Science',
    classLabel: 'Year 9 – Group A', folderId: 'f_ks3', ...by(staff.okafor),
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Draw the particle diagrams in your book before answering.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'In which state are particles closely packed but able to slide past one another?',
        choices: ['Solid', 'Liquid', 'Gas', 'Plasma'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'match', prompt: 'Match each change of state to its name.',
        pairs: [
          { left: 'Liquid → gas', right: 'evaporation' },
          { left: 'Gas → liquid', right: 'condensation' },
          { left: 'Solid → liquid', right: 'melting' },
        ], points: 3 },
      { id: 'q3', type: 'numeric', prompt: 'At what temperature, in °C, does pure water boil at normal atmospheric pressure?', answer: 100, tolerance: 0, points: 1 },
      { id: 'q4', type: 'short', prompt: 'Why does a gas fill any container it is put into?', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Explain, in terms of particles and energy, what happens to ice as it is heated from −10 °C to 110 °C.', points: 5 },
    ],
    submissions: {},
  },
  {
    id: 'hw_membranes', title: 'Cell Membranes & Transport', subject: 'Biology',
    classLabel: 'Year 12 – Group B', folderId: 'f_sci', ...by(staff.okafor),
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Refer to the fluid mosaic model throughout. Define every term you use.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which process moves substances against a concentration gradient using ATP?',
        choices: ['Diffusion', 'Osmosis', 'Active transport', 'Facilitated diffusion'], correctIndex: 2, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'Osmosis is the movement of water from a less negative to a more negative water potential.', answer: true, points: 2 },
      { id: 'q3', type: 'fillblank', prompt: 'The membrane is described as a (blank 1) mosaic because the (blank 2) bilayer allows lateral movement.',
        blanks: ['fluid', 'phospholipid'], points: 2 },
      { id: 'q4', type: 'numeric', prompt: 'A cell has a water potential of −450 kPa and sits in a solution of −300 kPa. Give the water potential gradient in kPa (solution minus cell).', answer: 150, tolerance: 0, points: 2 },
      { id: 'q5', type: 'long', prompt: 'Explain how the structure of the cell-surface membrane relates to its function in controlling what enters and leaves the cell.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_resp_photo', title: 'Respiration & Photosynthesis', subject: 'Biology',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...by(staff.okafor),
    studentIds: [], dueAt: dayOffset(14), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — release after the chemiosmosis lesson.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'How many molecules of ATP are produced (net) per glucose molecule in glycolysis?', answer: 2, tolerance: 0, points: 2 },
      { id: 'q2', type: 'multi', prompt: 'Which of these occur in the mitochondrial matrix?',
        choices: ['Link reaction', 'Glycolysis', 'Krebs cycle', 'Oxidative phosphorylation'], correctIndices: [0, 2], points: 3 },
      { id: 'q3', type: 'short', prompt: 'State the role of NADP in the light-dependent stage of photosynthesis.', points: 3 },
      { id: 'q4', type: 'long', prompt: 'Compare the chemiosmotic production of ATP in chloroplasts and mitochondria, noting two similarities and two differences.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  David Park · Chemistry & Physics
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_atomic_structure', title: 'Atomic Structure & the Periodic Table', subject: 'Chemistry',
    classLabel: 'Year 10 – Group C', folderId: 'f_sci', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(4), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'A copy of the periodic table is allowed for every question.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'How many neutrons are in an atom of ³⁵Cl (atomic number 17)?', answer: 18, tolerance: 0, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Elements in the same group of the periodic table have the same…',
        choices: ['number of shells', 'number of outer electrons', 'mass number', 'number of neutrons'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'fillblank', prompt: 'Isotopes of an element have the same number of (blank 1) but a different number of (blank 2).',
        blanks: ['protons', 'neutrons'], points: 2 },
      { id: 'q4', type: 'math', prompt: 'Write the electronic configuration of a calcium atom using the 2,8,8,… notation (commas, no spaces).', answer: '2,8,8,2', points: 2 },
      { id: 'q5', type: 'long', prompt: 'Describe how the model of the atom changed from the plum pudding model to the nuclear model, and what evidence caused the change.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_equilibria', title: 'Equilibria & Le Chatelier', subject: 'Chemistry',
    classLabel: 'Year 13 – Group A', folderId: 'f_alevel', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(-6), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-17),
    instructions: 'For every prediction, name the change and the direction the position of equilibrium shifts.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'For N₂ + 3H₂ ⇌ 2NH₃ (exothermic), increasing the pressure shifts the equilibrium…',
        choices: ['left', 'right', 'nowhere', 'left then right'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'truefalse', prompt: 'A catalyst increases the yield at equilibrium.', answer: false, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Write the expression for $K_c$ for the reaction $\\mathrm{H_2 + I_2 \\rightleftharpoons 2HI}$.', answer: 'K_c=\\frac{[HI]^2}{[H_2][I_2]}', points: 3 },
      { id: 'q4', type: 'numeric', prompt: 'At equilibrium [HI] = 0.6, [H₂] = 0.2 and [I₂] = 0.3 mol dm⁻³. Calculate Kc to 1 d.p.', answer: 6, tolerance: 0.1, points: 3 },
      { id: 'q5', type: 'long', prompt: 'Explain why the Haber process is run at a compromise temperature of around 450 °C rather than at a low temperature.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_waves_refraction', title: 'Waves & Refraction', subject: 'Physics',
    classLabel: 'Year 12 – Group A', folderId: 'f_sci', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(-1), timeLimitMins: 45, allowReview: true,
    status: 'active', createdAt: dayOffset(-10),
    instructions: 'Angles are measured from the normal, not the surface. Give answers to 3 s.f.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A wave has frequency 250 Hz and wavelength 1.4 m. Calculate its speed in m/s.', answer: 350, tolerance: 0.5, points: 2 },
      { id: 'q2', type: 'math', prompt: 'State Snell’s law relating refractive indices and angles at a boundary.', answer: 'n_1\\sin\\theta_1=n_2\\sin\\theta_2', points: 3 },
      { id: 'q3', type: 'numeric', prompt: 'Light travels from a medium of refractive index 1.5 into air. Calculate the critical angle in degrees to 1 d.p.', answer: 41.8, tolerance: 0.3, points: 3 },
      { id: 'q4', type: 'mcq', prompt: 'When a wave refracts into a slower medium, which quantity is unchanged?',
        choices: ['Speed', 'Wavelength', 'Frequency', 'Direction'], correctIndex: 2, points: 2 },
      { id: 'q5', type: 'upload', prompt: 'Upload your ray diagram for the total internal reflection question on the worksheet.', points: 4 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Marcus Webb · English Literature
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_power_conflict', title: 'Power & Conflict Poetry — Comparison', subject: 'English Literature',
    classLabel: 'Year 11 – Group A', folderId: 'f_exam', ...by(staff.webb),
    studentIds: [], dueAt: dayOffset(2), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-5),
    instructions: 'Compare throughout — a paragraph on one poem then a paragraph on the other is not a comparison.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Who wrote "Ozymandias"?', answer: 'Percy Bysshe Shelley', points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Which form is "Ozymandias" written in?',
        choices: ['Ballad', 'Sonnet', 'Villanelle', 'Free verse'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'short', prompt: 'Give one example of how Owen presents the reality of war in "Exposure", with a short quotation.', points: 3 },
      { id: 'q4', type: 'long', prompt: 'Compare how poets present the effects of power in "Ozymandias" and one other poem from the cluster.', points: 12 },
    ],
    submissions: {},
  },
  {
    id: 'hw_omam_ch1', title: "'Of Mice and Men' — Chapter 1", subject: 'English Literature',
    classLabel: 'Year 9 – Group A', folderId: 'f_ks3', ...by(staff.webb),
    studentIds: [], dueAt: dayOffset(-9), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-20),
    instructions: 'Answer in full sentences and use a quotation in every answer.',
    questions: [
      { id: 'q1', type: 'short', prompt: 'Where are George and Lennie travelling to at the start of the novel?', answer: 'a ranch near Soledad', points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'What does Lennie keep in his pocket in Chapter 1?',
        choices: ['A knife', 'A dead mouse', 'A photograph', 'A work card'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'George describes their dream of owning a small farm in Chapter 1.', answer: true, points: 1 },
      { id: 'q4', type: 'long', prompt: 'How does Steinbeck present the relationship between George and Lennie in Chapter 1? Use two quotations.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Helen Yoo · History
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_weimar', title: 'Weimar Germany 1918–29', subject: 'History',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...by(staff.yoo),
    studentIds: [], dueAt: dayOffset(-3), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-12),
    instructions: 'Dates and named individuals earn marks; "later on" and "some people" do not.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'In which year did the hyperinflation crisis reach its peak in Germany?', answer: 1923, tolerance: 0, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Which treaty imposed reparations on Germany after the First World War?',
        choices: ['Treaty of Rapallo', 'Treaty of Versailles', 'Locarno Pact', 'Kellogg–Briand Pact'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'multi', prompt: 'Which of these were problems facing the Weimar Republic before 1924?',
        choices: ['The Kapp Putsch', 'The Munich Putsch', 'The Dawes Plan', 'French occupation of the Ruhr'], correctIndices: [0, 1, 3], points: 3 },
      { id: 'q4', type: 'short', prompt: 'Name one way Stresemann helped Germany recover after 1923.', points: 3 },
      { id: 'q5', type: 'long', prompt: '"The Weimar Republic was doomed from the start." How far do you agree? Explain your answer with evidence from 1919–29.', points: 12 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Aisha Begum · Geography
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_coasts', title: 'Coastal Landscapes', subject: 'Geography',
    classLabel: 'Year 11 – Group A', folderId: 'f_hum', ...by(staff.begum),
    studentIds: [], dueAt: dayOffset(7), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Use a named UK example in every extended answer.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which process describes waves wearing away a cliff by throwing pebbles at it?',
        choices: ['Attrition', 'Abrasion', 'Solution', 'Hydraulic action'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'match', prompt: 'Match each landform to how it forms.',
        pairs: [
          { left: 'Spit', right: 'deposition where the coastline changes direction' },
          { left: 'Stack', right: 'collapse of an arch roof' },
          { left: 'Wave-cut platform', right: 'retreat of a cliff by undercutting' },
        ], points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'Longshore drift moves sediment along the coast in the direction of the prevailing wind.', answer: true, points: 1 },
      { id: 'q4', type: 'short', prompt: 'Give one advantage and one disadvantage of using rock armour as coastal defence.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'Assess the effectiveness of a coastal management scheme you have studied, considering cost, protection and impact on the environment.', points: 9 },
    ],
    submissions: {},
  },
  {
    id: 'hw_urbanisation', title: 'Urbanisation & Megacities', subject: 'Geography',
    classLabel: 'Year 10 – Group A', folderId: 'f_hum', ...by(staff.begum),
    studentIds: [], dueAt: dayOffset(-14), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-25),
    instructions: 'Where a question asks for a case study, name the city.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A city is classed as a megacity once its population passes how many million?', answer: 10, tolerance: 0, points: 2 },
      { id: 'q2', type: 'multi', prompt: 'Which of these are push factors for rural–urban migration?',
        choices: ['Drought and crop failure', 'Better hospitals in the city', 'Lack of rural jobs', 'Mechanisation of farming'], correctIndices: [0, 2, 3], points: 3 },
      { id: 'q3', type: 'fillblank', prompt: 'The growth of a city outwards into the surrounding countryside is called urban (blank 1), while people moving out of the city is called (blank 2)-urbanisation.',
        blanks: ['sprawl', 'counter'], points: 2 },
      { id: 'q4', type: 'long', prompt: 'For a named city in a lower-income country, explain the challenges created by rapid urban growth and one strategy used to manage them.', points: 9 },
    ],
    submissions: {},
  },
  {
    id: 'hw_rivers', title: 'Rivers & the Water Cycle', subject: 'Geography',
    classLabel: 'Year 9 – Group B', folderId: 'f_ks3', ...by(staff.begum),
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Label every diagram you draw in your book.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'What is the name for the point where a river begins?',
        choices: ['Mouth', 'Source', 'Confluence', 'Meander'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'match', prompt: 'Match each term in the water cycle to its meaning.',
        pairs: [
          { left: 'Evaporation', right: 'liquid water turning to vapour' },
          { left: 'Condensation', right: 'vapour cooling into droplets' },
          { left: 'Infiltration', right: 'water soaking into the soil' },
        ], points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'A waterfall usually forms where a band of hard rock lies over softer rock.', answer: true, points: 1 },
      { id: 'q4', type: 'short', prompt: 'Explain in one or two sentences why the lower course of a river is wider than the upper course.', points: 3 },
      { id: 'q5', type: 'upload', prompt: 'Upload a photo of your labelled river long-profile diagram.', points: 3 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Daniel Mehta · Computer Science
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_binary_hex', title: 'Binary, Hex & Data Representation', subject: 'Computer Science',
    classLabel: 'Year 10 – Group B', folderId: 'f_comp', ...by(staff.mehta),
    studentIds: [], dueAt: dayOffset(3), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-4),
    instructions: 'Show your conversion working — a bare answer earns only the final mark.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Convert the binary number 10110 to denary.', answer: 22, tolerance: 0, points: 2 },
      { id: 'q2', type: 'math', prompt: 'Convert the denary number 202 to hexadecimal (two characters, uppercase).', answer: 'CA', points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'How many bits are in one byte?',
        choices: ['4', '8', '16', '32'], correctIndex: 1, points: 1 },
      { id: 'q4', type: 'fillblank', prompt: 'Shifting a binary number one place to the left (blank 1) its value; one place to the right (blank 2) it.',
        blanks: ['doubles', 'halves'], points: 2 },
      { id: 'q5', type: 'long', prompt: 'Explain why hexadecimal is often used by programmers instead of long binary strings. Give an example.', points: 4 },
    ],
    submissions: {},
  },
  {
    id: 'hw_algorithms', title: 'Algorithms & Searching', subject: 'Computer Science',
    classLabel: 'Year 11 – Group A', folderId: 'f_comp', ...by(staff.mehta),
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: 50, allowReview: true,
    status: 'active', createdAt: dayOffset(-10),
    instructions: 'Pseudocode is fine — but it must be consistent and readable.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which search requires the data to be sorted first?',
        choices: ['Linear search', 'Binary search', 'Both', 'Neither'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'What is the maximum number of comparisons a binary search needs on a sorted list of 16 items?', answer: 4, tolerance: 0, points: 3 },
      { id: 'q3', type: 'multi', prompt: 'Which of these are valid sorting algorithms?',
        choices: ['Bubble sort', 'Merge sort', 'Bucket search', 'Insertion sort'], correctIndices: [0, 1, 3], points: 3 },
      { id: 'q4', type: 'truefalse', prompt: 'An algorithm must always terminate to be considered correct.', answer: true, points: 1 },
      { id: 'q5', type: 'long', prompt: 'Write pseudocode for a linear search over an array, and explain its worst-case performance.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_oop', title: 'Object-Oriented Programming', subject: 'Computer Science',
    classLabel: 'Year 12 – Group A', folderId: 'f_comp', ...by(staff.mehta),
    studentIds: [], dueAt: dayOffset(12), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — needs the inheritance diagram adding before it goes out.',
    questions: [
      { id: 'q1', type: 'match', prompt: 'Match each OOP principle to its description.',
        pairs: [
          { left: 'Encapsulation', right: 'hiding internal state behind methods' },
          { left: 'Inheritance', right: 'a subclass reusing a superclass' },
          { left: 'Polymorphism', right: 'one interface, many implementations' },
        ], points: 3 },
      { id: 'q2', type: 'mcq', prompt: 'A blueprint from which objects are created is called a…',
        choices: ['method', 'class', 'variable', 'constructor'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'short', prompt: 'Why are attributes usually declared private rather than public?', points: 3 },
      { id: 'q4', type: 'long', prompt: 'Design a class hierarchy for a library system with Book, Member and Loan. Describe the attributes, methods and relationships.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Tom Rivera · Mathematics
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_linear_eq_10b', title: 'Solving Linear Equations', subject: 'Mathematics',
    classLabel: 'Year 10 – Group B', folderId: 'f_gcse', ...by(staff.rivera),
    studentIds: [], dueAt: dayOffset(4), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Do the same thing to both sides and write out every line.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Solve $5x - 8 = 27$.', answer: 7, tolerance: 0, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Solve $4(x + 3) = 32$.', answer: 5, tolerance: 0, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Rearrange $y = 3x + 1$ to make $x$ the subject. Enter it in the form x=…', answer: 'x=\\frac{y-1}{3}', points: 3 },
      { id: 'q4', type: 'mcq', prompt: 'Which is the first step in solving $\\dfrac{x}{4} + 2 = 9$?',
        choices: ['Multiply both sides by 4', 'Subtract 2 from both sides', 'Divide both sides by 4', 'Add 9 to both sides'], correctIndex: 1, points: 2 },
      { id: 'q5', type: 'short', prompt: 'How can you check that your solution to an equation is correct?', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_surds_bounds', title: 'Surds & Bounds — Revision', subject: 'Mathematics',
    classLabel: 'Year 11 – Group A', folderId: 'f_exam', ...by(staff.rivera),
    studentIds: [], dueAt: dayOffset(-7), timeLimitMins: 40, allowReview: true,
    status: 'closed', createdAt: dayOffset(-18),
    instructions: 'Leave surd answers in exact form. Bounds must be written as inequalities in your book.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Simplify $\\sqrt{50}$ fully.', answer: '5\\sqrt{2}', points: 2 },
      { id: 'q2', type: 'math', prompt: 'Rationalise the denominator of $\\dfrac{6}{\\sqrt{3}}$.', answer: '2\\sqrt{3}', points: 3 },
      { id: 'q3', type: 'numeric', prompt: 'A length is 8.4 cm to 1 d.p. Give the upper bound in cm.', answer: 8.45, tolerance: 0, points: 2 },
      { id: 'q4', type: 'truefalse', prompt: '$\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}$ for all non-negative $a$ and $b$.', answer: true, points: 1 },
      { id: 'q5', type: 'long', prompt: 'A rectangle measures 12 cm by 7 cm, each to the nearest cm. Find the upper and lower bounds of its area and explain your method.', points: 5 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Claire Dubois · French & Spanish
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_fr_famille', title: 'Ma famille — vocabulaire', subject: 'French',
    classLabel: 'Year 9 – Group A', folderId: 'f_lang', ...by(staff.dubois),
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-2),
    instructions: 'Accents count. Learn the vocabulary list before you start.',
    questions: [
      { id: 'q1', type: 'match', prompt: 'Match each French word to its English meaning.',
        pairs: [
          { left: 'le frère', right: 'brother' },
          { left: 'la sœur', right: 'sister' },
          { left: 'les grands-parents', right: 'grandparents' },
        ], points: 3 },
      { id: 'q2', type: 'mcq', prompt: 'Which sentence means "I have two brothers"?',
        choices: ['J’ai deux sœurs.', 'J’ai deux frères.', 'Je suis deux frères.', 'Il a deux frères.'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'fillblank', prompt: 'Complete: Ma mère (blank 1) grande et mon père (blank 2) petit.',
        blanks: ['est', 'est'], points: 2 },
      { id: 'q4', type: 'short', prompt: 'Write one sentence in French describing a member of your family.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'Write a short paragraph (60–80 words) in French about your family, including ages and one opinion.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_fr_passe', title: 'Le passé composé', subject: 'French',
    classLabel: 'Year 11 – Group A', folderId: 'f_lang', ...by(staff.dubois),
    studentIds: [], dueAt: dayOffset(-1), timeLimitMins: 35, allowReview: true,
    status: 'active', createdAt: dayOffset(-9),
    instructions: 'Watch out for the verbs that take être — and make the agreement.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which auxiliary verb does "aller" take in the passé composé?',
        choices: ['avoir', 'être', 'faire', 'both'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'fillblank', prompt: 'Complete: Elle (blank 1) allée au cinéma et nous (blank 2) mangé une pizza.',
        blanks: ['est', 'avons'], points: 2 },
      { id: 'q3', type: 'short', prompt: 'Translate into French: "I watched television yesterday."', answer: 'J’ai regardé la télévision hier.', points: 3 },
      { id: 'q4', type: 'truefalse', prompt: 'With être verbs, the past participle agrees with the subject.', answer: true, points: 1 },
      { id: 'q5', type: 'long', prompt: 'Écrivez un paragraphe (80–100 mots) au passé composé sur ce que vous avez fait le week-end dernier.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_es_rutina', title: 'Mi rutina diaria', subject: 'Spanish',
    classLabel: 'Year 10 – Group A', folderId: 'f_lang', ...by(staff.dubois),
    studentIds: [], dueAt: dayOffset(-10), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-21),
    instructions: 'Reflexive verbs need their pronoun — me, te, se…',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which is the correct form of "I get up"?',
        choices: ['me levanto', 'se levanta', 'nos levantamos', 'te levantas'], correctIndex: 0, points: 2 },
      { id: 'q2', type: 'match', prompt: 'Match each Spanish phrase to its English meaning.',
        pairs: [
          { left: 'desayuno', right: 'I have breakfast' },
          { left: 'me ducho', right: 'I have a shower' },
          { left: 'me acuesto', right: 'I go to bed' },
        ], points: 3 },
      { id: 'q3', type: 'fillblank', prompt: 'Complete: (blank 1) las siete de la mañana me levanto y (blank 2) al colegio.',
        blanks: ['A', 'voy'], points: 2 },
      { id: 'q4', type: 'long', prompt: 'Escribe un párrafo (70–90 palabras) sobre tu rutina diaria, usando al menos cuatro verbos reflexivos.', points: 8 },
    ],
    submissions: {},
  },
  {
    id: 'hw_es_futuro', title: 'El futuro y el condicional', subject: 'Spanish',
    classLabel: 'Year 11 – Group B', folderId: 'f_lang', ...by(staff.dubois),
    studentIds: [], dueAt: dayOffset(13), timeLimitMins: null, allowReview: true,
    status: 'draft', createdAt: dayOffset(-1),
    instructions: 'Draft — release with the irregular-stem handout.',
    questions: [
      { id: 'q1', type: 'fillblank', prompt: 'Complete: Mañana yo (blank 1) al parque y mi hermana (blank 2) sus deberes. (ir / hacer, futuro)',
        blanks: ['iré', 'hará'], points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'Which verb has the irregular future stem "tendr-"?',
        choices: ['tener', 'tomar', 'terminar', 'trabajar'], correctIndex: 0, points: 2 },
      { id: 'q3', type: 'short', prompt: 'Translate into Spanish: "I would like to travel to Mexico."', answer: 'Me gustaría viajar a México.', points: 3 },
      { id: 'q4', type: 'long', prompt: 'Escribe sobre tus planes para el futuro (90–110 palabras), usando el futuro y el condicional.', points: 8 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  Rebecca Stone · Business & Economics
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hw_marketing_mix', title: 'Marketing Mix — the 4 Ps', subject: 'Business',
    classLabel: 'Year 10 – Group A', folderId: 'f_hum', ...by(staff.stone),
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3),
    instructions: 'Apply every point to a real business — generic definitions score half marks.',
    questions: [
      { id: 'q1', type: 'multi', prompt: 'Which of these are part of the marketing mix?',
        choices: ['Product', 'Profit', 'Place', 'Promotion'], correctIndices: [0, 2, 3], points: 3 },
      { id: 'q2', type: 'mcq', prompt: 'Setting a low launch price to win market share is called…',
        choices: ['price skimming', 'penetration pricing', 'cost-plus pricing', 'premium pricing'], correctIndex: 1, points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'A product costs £12 to make and is sold at £20. What is the percentage mark-up?', answer: 66.7, tolerance: 0.5, points: 3 },
      { id: 'q4', type: 'short', prompt: 'Give one reason a business might change its "place" strategy to selling online.', points: 2 },
      { id: 'q5', type: 'long', prompt: 'For a business you have studied, analyse how two elements of the marketing mix work together to attract its target market.', points: 9 },
    ],
    submissions: {},
  },
  {
    id: 'hw_cashflow', title: 'Cash Flow & Break-even', subject: 'Business',
    classLabel: 'Year 11 – Group B', folderId: 'f_exam', ...by(staff.stone),
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: 45, allowReview: true,
    status: 'active', createdAt: dayOffset(-11),
    instructions: 'Show the formula, then the substitution, then the answer with units.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Fixed costs are £8,000, selling price £20 and variable cost £12 per unit. Find the break-even output in units.', answer: 1000, tolerance: 0, points: 3 },
      { id: 'q2', type: 'math', prompt: 'Write the formula for net cash flow.', answer: 'cash inflows - cash outflows', points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'A business making a profit can still run out of cash.', answer: true, points: 2 },
      { id: 'q4', type: 'mcq', prompt: 'Which of these would improve a business’s cash flow position fastest?',
        choices: ['Buying new machinery', 'Offering longer credit to customers', 'Negotiating longer credit from suppliers', 'Increasing stock levels'], correctIndex: 2, points: 2 },
      { id: 'q5', type: 'long', prompt: 'A shop has a cash-flow problem in its first winter. Recommend two actions it could take and justify which you would do first.', points: 9 },
    ],
    submissions: {},
  },
  {
    id: 'hw_market_failure', title: 'Market Failure & Externalities', subject: 'Economics',
    classLabel: 'Year 13 – Group A', folderId: 'f_hum', ...by(staff.stone),
    studentIds: [], dueAt: dayOffset(-5), timeLimitMins: null, allowReview: true,
    status: 'closed', createdAt: dayOffset(-16),
    instructions: 'Every diagram needs axes labelled, curves labelled and the welfare loss shaded.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Pollution from a factory is an example of a…',
        choices: ['positive production externality', 'negative production externality', 'positive consumption externality', 'public good'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'multi', prompt: 'Which of these are characteristics of a pure public good?',
        choices: ['Non-rival', 'Excludable', 'Non-excludable', 'Rival'], correctIndices: [0, 2], points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'With a negative externality, the social cost exceeds the private cost.', answer: true, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Define "information failure" and give one example.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'Evaluate the use of indirect taxation to correct the market failure caused by a demerit good. Use a diagram in your answer.', points: 12 },
    ],
    submissions: {},
  },

  // ─────────────────────────────────────────────────────────────
  //  NOT STARTED — homework nobody (or not the demo student) has opened
  //
  //  Everything above leaves its cohort to `synthSubmission`, which only
  //  produces a not-started student on its ~18% seeded-random tail. That is
  //  fine for background noise but means the student's Pending/Overdue tabs
  //  and the teacher's "Not Started" tally are whatever the hash happened to
  //  give. These rows say it outright with `notStarted`:
  //
  //    notStarted: true          — the whole class is untouched (just set)
  //    notStarted: ['s_oliver']  — named students leave it while the rest work
  //
  //  populateCohort honours the flag instead of synthesising (Homework.jsx);
  //  the id list goes through the same alias remap as studentIds, so
  //  's_oliver' still means Oliver Chen after the admin reconcile.
  //
  //  Most of these sit on Year 12 – Group A because that is the signed-in
  //  demo student's class; the last two give the teacher list the same state
  //  in a GCSE group.
  // ─────────────────────────────────────────────────────────────

  // ── Just set: due soon, nobody has opened it yet ──
  {
    id: 'hw_vectors_3d', title: 'Vectors in Three Dimensions', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'Use column vectors throughout. Leave magnitudes in surd form unless asked for a decimal.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the magnitude of $\\mathbf{a} = 2\\mathbf{i} - 3\\mathbf{j} + 6\\mathbf{k}$.', answer: 7, tolerance: 0, points: 3 },
      { id: 'q2', type: 'math', prompt: 'Given $\\mathbf{a} = 4\\mathbf{i} + \\mathbf{j}$ and $\\mathbf{b} = \\mathbf{i} - 2\\mathbf{j}$, find $2\\mathbf{a} - \\mathbf{b}$.', answer: '7\\mathbf{i}+4\\mathbf{j}', points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'Two non-zero vectors are perpendicular when their scalar product is…',
        choices: ['1', '0', 'equal to the product of their magnitudes', 'negative'], correctIndex: 1, points: 2 },
      { id: 'q4', type: 'numeric', prompt: 'Calculate $(3\\mathbf{i} + \\mathbf{j} - 2\\mathbf{k}) \\cdot (\\mathbf{i} - 4\\mathbf{j} + \\mathbf{k})$.', answer: -3, tolerance: 0, points: 3 },
      { id: 'q5', type: 'long', prompt: 'The points A(1, 0, 2), B(3, 2, 2) and C(2, −1, 5) are the vertices of a triangle. Find the angle at A, showing every step of your method.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_matrices_fm', title: 'Matrices & Linear Transformations', subject: 'Further Maths',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(8), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'Describe every transformation fully — type, centre or line, and angle or scale factor.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'Find the determinant of $\\begin{pmatrix} 5 & 2 \\\\ 3 & 4 \\end{pmatrix}$.', answer: 14, tolerance: 0, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'A 2×2 matrix has determinant 0. This means the transformation…',
        choices: ['is a rotation', 'preserves area', 'has no inverse', 'is the identity'], correctIndex: 2, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Write the matrix for a rotation of 90° anticlockwise about the origin, entering it as a semicolon-separated list of rows (e.g. a,b;c,d).', answer: '0,-1;1,0', points: 3 },
      { id: 'q4', type: 'truefalse', prompt: 'Matrix multiplication is commutative: $AB = BA$ for all square matrices A and B.', answer: false, points: 2 },
      { id: 'q5', type: 'long', prompt: 'The matrix $M = \\begin{pmatrix} 3 & 0 \\\\ 0 & 2 \\end{pmatrix}$ is applied to the unit square. Describe the transformation, find the area of the image, and explain the link to $\\det M$.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_projectiles', title: 'Projectile Motion', subject: 'Physics',
    classLabel: 'Year 12 – Group A', folderId: 'f_sci', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(6), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'Resolve into horizontal and vertical components first. Take g = 9.81 m/s² and ignore air resistance.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A ball is thrown horizontally at 12 m/s from a cliff and lands after 3.0 s. How far from the base of the cliff does it land, in metres?', answer: 36, tolerance: 0.5, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'For that same ball, how high was the cliff, in metres? Give your answer to 1 d.p.', answer: 44.1, tolerance: 0.5, points: 3 },
      { id: 'q3', type: 'mcq', prompt: 'Ignoring air resistance, the horizontal component of a projectile’s velocity…',
        choices: ['increases steadily', 'decreases steadily', 'stays constant', 'is zero at the highest point'], correctIndex: 2, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'At the highest point of its flight the (blank 1) component of velocity is zero, while the (blank 2) component is unchanged.',
        blanks: ['vertical', 'horizontal'], points: 2 },
      { id: 'q5', type: 'long', prompt: 'A stone is launched at 20 m/s at 35° above the horizontal from ground level. Find its range and time of flight, and explain why the maximum range occurs at 45°.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_hypothesis_test', title: 'Hypothesis Testing & the Binomial Model', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_stats', ...mine,
    studentIds: [], dueAt: dayOffset(2), timeLimitMins: 60, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'State both hypotheses in terms of p, give the p-value, then write a conclusion in the context of the question.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'In a hypothesis test, the null hypothesis is rejected when…',
        choices: ['the p-value exceeds the significance level', 'the p-value is less than the significance level', 'the sample is large', 'the test is two-tailed'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'For $X \\sim B(20, 0.3)$, find $\\mathrm{E}(X)$.', answer: 6, tolerance: 0, points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'At the 5% level, a two-tailed test puts 2.5% in each tail.', answer: true, points: 2 },
      { id: 'q4', type: 'short', prompt: 'Explain in one sentence what a 5% significance level actually means.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'A coin is flipped 30 times and lands heads 21 times. Test at the 5% level whether the coin is biased towards heads, stating your hypotheses, p-value and conclusion in context.', points: 8 },
    ],
    submissions: {},
  },

  // ── The class has started; the demo student hasn't ──
  {
    id: 'hw_moments_equilibrium', title: 'Moments & Equilibrium', subject: 'Physics',
    classLabel: 'Year 12 – Group A', folderId: 'f_sci', ...by(staff.park),
    studentIds: [], dueAt: dayOffset(4), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-6), notStarted: ['s_oliver'],
    instructions: 'Take moments about a sensible point and say which point you chose.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A force of 25 N acts at a perpendicular distance of 0.4 m from a pivot. Find the moment in N m.', answer: 10, tolerance: 0, points: 2 },
      { id: 'q2', type: 'mcq', prompt: 'A body is in equilibrium when…',
        choices: ['the resultant force is zero only', 'the resultant moment is zero only', 'both the resultant force and the resultant moment are zero', 'it is stationary'], correctIndex: 2, points: 2 },
      { id: 'q3', type: 'numeric', prompt: 'A uniform 2.0 m plank of weight 60 N rests on supports at each end. Find the reaction at one support, in newtons.', answer: 30, tolerance: 0, points: 2 },
      { id: 'q4', type: 'truefalse', prompt: 'The weight of a uniform beam can be taken to act at its midpoint.', answer: true, points: 1 },
      { id: 'q5', type: 'long', prompt: 'A 4.0 m uniform beam of mass 30 kg rests on supports 0.5 m from each end. A 20 kg mass sits 1.0 m from the left support. Find both reaction forces, showing your moment equations.', points: 7 },
    ],
    submissions: {},
  },
  {
    id: 'hw_proof_methods', title: 'Methods of Proof', subject: 'Mathematics',
    classLabel: 'Year 12 – Group A', folderId: 'f_alevel', ...mine,
    studentIds: [], dueAt: dayOffset(11), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-3), notStarted: ['s_oliver'],
    instructions: 'Name the method you are using at the start of each proof, and finish with a clear concluding statement.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Which method proves a statement false by producing a single case where it fails?',
        choices: ['Proof by exhaustion', 'Disproof by counter-example', 'Proof by contradiction', 'Direct proof'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'short', prompt: 'Give a counter-example to: "if $n$ is prime then $n$ is odd".', answer: 'n = 2', points: 2 },
      { id: 'q3', type: 'truefalse', prompt: 'A proof by contradiction begins by assuming the statement you want to prove is false.', answer: true, points: 2 },
      { id: 'q4', type: 'long', prompt: 'Prove by contradiction that $\\sqrt{2}$ is irrational.', points: 7 },
      { id: 'q5', type: 'long', prompt: 'Prove that the product of any two consecutive even integers is divisible by 8.', points: 6 },
    ],
    submissions: {},
  },
  {
    id: 'hw_gdp_growth', title: 'Measuring Economic Growth', subject: 'Economics',
    classLabel: 'Year 12 – Group A', folderId: 'f_hum', ...by(staff.stone),
    studentIds: [], dueAt: dayOffset(-2), timeLimitMins: null, allowReview: true,
    // Late hand-in is still open, so this reads as overdue-and-workable rather
    // than closed — the one row that fills the student's Overdue tab.
    settings: { allowLate: true },
    status: 'active', createdAt: dayOffset(-12), notStarted: ['s_oliver'],
    instructions: 'Quote real figures where you can, and always say whether a measure is nominal or real.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Real GDP differs from nominal GDP because it is adjusted for…',
        choices: ['population', 'inflation', 'unemployment', 'exchange rates'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Nominal GDP grows 6% while inflation is 2%. Give the approximate real growth rate as a percentage.', answer: 4, tolerance: 0.1, points: 2 },
      { id: 'q3', type: 'multi', prompt: 'Which of these are limitations of GDP per capita as a measure of living standards?',
        choices: ['It ignores income distribution', 'It excludes the informal economy', 'It is published quarterly', 'It says nothing about environmental cost'], correctIndices: [0, 1, 3], points: 3 },
      { id: 'q4', type: 'short', prompt: 'Distinguish between actual and potential economic growth in one or two sentences.', points: 3 },
      { id: 'q5', type: 'long', prompt: 'Evaluate the view that rising GDP per capita is the best single indicator of improving living standards in a developing economy.', points: 12 },
    ],
    submissions: {},
  },

  // ── Same state further down the school, for the teacher's list ──
  {
    id: 'hw_surds_10a', title: 'Surds & Exact Values', subject: 'Mathematics',
    classLabel: 'Year 10 – Group A', folderId: 'f_gcse', ...mine,
    studentIds: [], dueAt: dayOffset(7), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'Leave every answer in exact surd form — no decimals, no calculator.',
    questions: [
      { id: 'q1', type: 'math', prompt: 'Simplify $\\sqrt{72}$ fully.', answer: '6\\sqrt{2}', points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'Work out $\\sqrt{5} \\times \\sqrt{20}$.', answer: 10, tolerance: 0, points: 2 },
      { id: 'q3', type: 'math', prompt: 'Rationalise the denominator of $\\dfrac{6}{\\sqrt{3}}$.', answer: '2\\sqrt{3}', points: 3 },
      { id: 'q4', type: 'mcq', prompt: 'Which of these is NOT a surd?',
        choices: ['√2', '√8', '√16', '√20'], correctIndex: 2, points: 2 },
      { id: 'q5', type: 'short', prompt: 'Why do we leave answers in surd form instead of rounding them?', points: 2 },
    ],
    submissions: {},
  },
  {
    id: 'hw_venn_sets_11b', title: 'Venn Diagrams & Set Notation', subject: 'Mathematics',
    classLabel: 'Year 11 – Group B', folderId: 'f_stats', ...mine,
    studentIds: [], dueAt: dayOffset(5), timeLimitMins: null, allowReview: true,
    status: 'active', createdAt: dayOffset(-1), notStarted: true,
    instructions: 'Fill the intersection first, then work outwards. Probabilities as fractions in their simplest form.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'What does $A \\cap B$ mean?',
        choices: ['A or B', 'A and B', 'not A', 'A but not B'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'numeric', prompt: 'In a class of 30, 18 study French, 14 study German and 7 study both. How many study neither?', answer: 5, tolerance: 0, points: 3 },
      { id: 'q3', type: 'truefalse', prompt: 'For mutually exclusive events, $P(A \\cap B) = 0$.', answer: true, points: 2 },
      { id: 'q4', type: 'fillblank', prompt: 'The symbol (blank 1) means union and the symbol (blank 2) means the complement of a set.',
        blanks: ['∪', "'"], points: 2 },
      { id: 'q5', type: 'long', prompt: 'Of 40 students, 22 play football, 17 play cricket and 9 play both. Draw the Venn diagram and find the probability that a student chosen at random plays exactly one of the two sports.', points: 5 },
    ],
    submissions: {},
  },
  ];
};
