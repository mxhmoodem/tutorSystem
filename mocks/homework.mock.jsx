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
