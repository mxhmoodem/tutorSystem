// ══════════════════════════════════════════════════════════════
//  Mock data — Lesson Planner
//  Seeds window.__lessonPlans so the planner's saved-plans browser,
//  class detail panels and the teacher dashboard have data on first load.
//  Loaded as a global script before TeacherPages.jsx (see index.html).
//
//  Store shape (keyed `${group}__${date}`):
//    { plan: {title,topic,duration,objectives,agenda,homework,notes,resources}, savedAt, group, date }
//  Groups match teacherClasses[].group in teacherPages.mock.jsx.
// ══════════════════════════════════════════════════════════════

window.__lessonPlans = window.__lessonPlans || {};

const LESSON_PLAN_SEED = [
  {
    group: 'Year 10 – Group A', date: '2026-04-25', savedAt: '24 Apr, 17:42',
    plan: {
      title: 'Simultaneous Equations — Elimination',
      topic: 'Algebra · Simultaneous equations',
      duration: '90',
      objectives:
        '• Solve two linear simultaneous equations using the elimination method.\n' +
        '• Recognise when to add or subtract equations to remove a variable.\n' +
        '• Check solutions by substituting back into the original equations.',
      agenda:
        '0–10  Starter: solve 3 single-variable equations on the board (recap)\n' +
        '10–25 Worked example: x + y = 10, x − y = 4 (subtract to eliminate y)\n' +
        '25–45 Guided practice in pairs — Exercise 7B Q1–6\n' +
        '45–60 Mini-whiteboard check: scaling before elimination (2x + 3y = …)\n' +
        '60–80 Independent practice — Exercise 7C, extension for early finishers\n' +
        '80–90 Plenary: exit ticket + set homework',
      homework:
        'Textbook Exercise 7C Q7–12. Due Friday 1 May. Set on the Homework page as "Algebra: Simultaneous Equations".',
      notes:
        'Sophia and James struggled with negative coefficients last week — pair them with stronger partners. Have the laminated worked-example cards ready for the scaling step.',
      resources: [
        { id: 'r1', name: 'Simultaneous-Equations-Starter.pdf', size: 184320, type: 'application/pdf' },
        { id: 'r2', name: 'Elimination-Worked-Examples.pptx', size: 1048576, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { id: 'r3', name: 'Exercise-7C-answers.docx', size: 51200, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      ],
    },
  },
  {
    group: 'Year 11 – Group B', date: '2026-04-25', savedAt: '23 Apr, 20:15',
    plan: {
      title: 'Sine & Cosine Rules',
      topic: 'Trigonometry · Non-right-angled triangles',
      duration: '90',
      objectives:
        '• Use the sine rule to find missing sides and angles.\n' +
        '• Use the cosine rule when two sides and the included angle are known.\n' +
        '• Decide which rule applies from the information given.',
      agenda:
        '0–10  Recap SOHCAHTOA with a quick diagnostic\n' +
        '10–30 Derive & apply the sine rule (worked examples)\n' +
        '30–50 Cosine rule — when the sine rule won\'t work\n' +
        '50–75 Mixed problem set — students choose the rule\n' +
        '75–90 GCSE exam question + plenary',
      homework:
        'Exam-style worksheet: 6 mixed trig questions. Due 1 May.',
      notes:
        'This is a common 5-mark exam topic. Emphasise labelling the triangle before choosing a rule. Bring extra calculators — three students forgot theirs last week.',
      resources: [
        { id: 'r1', name: 'Sine-Cosine-Rule-Notes.pdf', size: 256000, type: 'application/pdf' },
        { id: 'r2', name: 'Mixed-Trig-Worksheet.pdf', size: 198000, type: 'application/pdf' },
      ],
    },
  },
  {
    group: 'Year 12 – Group A', date: '2026-04-25', savedAt: '22 Apr, 19:03',
    plan: {
      title: 'Differentiation from First Principles',
      topic: 'Calculus · Differentiation',
      duration: '120',
      objectives:
        '• Understand the gradient of a curve as a limit.\n' +
        '• Differentiate x^n from first principles.\n' +
        '• Apply the result to find gradients at specific points.',
      agenda:
        '0–15   Gradient of a chord → tangent (Desmos demo)\n' +
        '15–45  First-principles definition and the limit notation\n' +
        '45–75  Worked derivations: x², x³, then generalise\n' +
        '75–105 Practice: find f\'(x) and evaluate at given points\n' +
        '105–120 A-Level past-paper question + plenary',
      homework:
        'Past-paper questions on differentiation (Q1–4). Due 30 Apr. Linked to the open homework "Calculus: Differentiation Basics".',
      notes:
        'Strong group — Oliver and Ethan can attempt the proof extension. Use the Desmos tangent-slider to motivate the limit. Watch the limit notation, it trips students up.',
      resources: [
        { id: 'r1', name: 'First-Principles-Handout.pdf', size: 312000, type: 'application/pdf' },
        { id: 'r2', name: 'Desmos-Tangent-Demo-link.txt', size: 1024, type: 'text/plain' },
      ],
    },
  },
  {
    group: 'Year 9 – Group C', date: '2026-04-25', savedAt: '24 Apr, 08:30',
    plan: {
      title: 'Surds & Indices',
      topic: 'Number · Surds and indices',
      duration: '75',
      objectives:
        '• Simplify surds (e.g. √50 = 5√2).\n' +
        '• Apply the laws of indices to numeric and algebraic expressions.\n' +
        '• Rationalise simple denominators.',
      agenda:
        '0–10  Starter: square numbers & roots recall\n' +
        '10–30 Laws of indices — multiply, divide, power of a power\n' +
        '30–50 Simplifying surds with worked examples\n' +
        '50–70 Practice carousel (3 stations)\n' +
        '70–75 Plenary quiz',
      homework:
        'Surds & Indices worksheet Q1–10. Due 2 May.',
      notes:
        'Largest group (9). Keep the carousel pacey. Liam needs the scaffolded version of the worksheet.',
      resources: [
        { id: 'r1', name: 'Surds-Carousel-Stations.pdf', size: 220000, type: 'application/pdf' },
      ],
    },
  },
  {
    group: 'Year 13 – Group A', date: '2026-04-24', savedAt: '23 Apr, 21:48',
    plan: {
      title: 'Differential Equations — Modelling',
      topic: 'Calculus · First-order differential equations',
      duration: '120',
      objectives:
        '• Form a differential equation from a worded modelling context.\n' +
        '• Solve by separating variables.\n' +
        '• Interpret the solution and find particular solutions from boundary conditions.',
      agenda:
        '0–20   Recap separation of variables\n' +
        '20–50  Modelling example: Newton\'s law of cooling\n' +
        '50–85  Population growth / decay problems\n' +
        '85–110 Exam questions under timed conditions\n' +
        '110–120 Mark scheme walkthrough + plenary',
      homework:
        'Two full modelling questions. Due 1 May. Linked to "Differential Equations: Modelling".',
      notes:
        'Exam class — push for full method marks and units in the final answer. Freya was absent last session; share the cooling-law notes.',
      resources: [
        { id: 'r1', name: 'Modelling-with-DEs.pdf', size: 280000, type: 'application/pdf' },
        { id: 'r2', name: 'Timed-Exam-Questions.pdf', size: 165000, type: 'application/pdf' },
      ],
    },
  },
  // Earlier in the week — gives the browser more than one date per term
  {
    group: 'Year 10 – Group A', date: '2026-04-18', savedAt: '17 Apr, 18:20',
    plan: {
      title: 'Probability Trees',
      topic: 'Statistics · Probability',
      duration: '90',
      objectives:
        '• Construct probability tree diagrams for two events.\n' +
        '• Calculate combined probabilities along branches.\n' +
        '• Distinguish independent from conditional events.',
      agenda:
        '0–10  Starter: single-event probability recall\n' +
        '10–35 Build a two-event tree together (with/without replacement)\n' +
        '35–60 Guided practice\n' +
        '60–80 Independent exam questions\n' +
        '80–90 Plenary',
      homework:
        'Probability trees worksheet. Due 24 Apr.',
      notes: 'Use the coloured-counter bag for the without-replacement demo.',
      resources: [
        { id: 'r1', name: 'Probability-Trees-Worksheet.pdf', size: 174000, type: 'application/pdf' },
      ],
    },
  },
  {
    group: 'Year 12 – Group A', date: '2026-04-18', savedAt: '16 Apr, 22:10',
    plan: {
      title: 'Integration as Reverse Differentiation',
      topic: 'Calculus · Integration',
      duration: '120',
      objectives:
        '• Integrate polynomials by reversing the power rule.\n' +
        '• Include the constant of integration.\n' +
        '• Evaluate definite integrals.',
      agenda:
        '0–20   Reverse the power rule — pattern spotting\n' +
        '20–50  Indefinite integrals + constant of integration\n' +
        '50–85  Definite integrals & area under a curve\n' +
        '85–115 Practice set\n' +
        '115–120 Plenary',
      homework: 'Integration practice Q1–8. Due 24 Apr.',
      notes: 'Common slip: forgetting +c. Make it a running joke so it sticks.',
      resources: [],
    },
  },
];

LESSON_PLAN_SEED.forEach(({ group, date, savedAt, plan }) => {
  const key = `${group}__${date}`;
  if (!window.__lessonPlans[key]) {
    window.__lessonPlans[key] = { plan, savedAt, group, date };
  }
});

// ─── Persistence ────────────────────────────────────────────────────────────
// Lesson plans previously lived only in the in-memory `window.__lessonPlans`
// global and were lost on reload. They now persist to localStorage so a teacher's
// saved plans survive a refresh (matching every other store in the app).
//
// Uploaded resources carry a base64 `dataUrl` that can be megabytes each — writing
// those into the ~5MB localStorage quota would throw and wipe out ALL persistence.
// We strip `dataUrl` on write (keeping name/size/type so the attachment chip still
// renders) so the text of the plan is never lost to a quota error.
const LESSON_PLANS_KEY = 'klasio.lessonPlans.v1';

const stripHeavy = (store) => {
  const out = {};
  for (const k of Object.keys(store || {})) {
    const v = store[k] || {};
    // Copy only the lightweight metadata — explicitly, NOT via `{ dataUrl, ...rest }`
    // rest-destructuring (Babel-standalone mis-compiles object rest patterns here).
    const resources = ((v.plan && v.plan.resources) || []).map(r => ({
      id: r.id, name: r.name, size: r.size, type: r.type,
    }));
    out[k] = { ...v, plan: { ...(v.plan || {}), resources } };
  }
  return out;
};

window.__saveLessonPlans = () => {
  try { localStorage.setItem(LESSON_PLANS_KEY, JSON.stringify(stripHeavy(window.__lessonPlans))); }
  catch (e) { /* quota or serialisation issue — keep the in-memory copy for the session */ }
};

// Hydrate persisted plans over the seed. Stored plans win (a teacher may have
// overwritten a seeded plan), but seeded-only keys remain so the demo always has
// content on a fresh browser.
(() => {
  try {
    const raw = localStorage.getItem(LESSON_PLANS_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      Object.keys(stored || {}).forEach(k => { window.__lessonPlans[k] = stored[k]; });
    }
  } catch (e) { /* ignore malformed store */ }
})();
