// ══════════════════════════════════════════════════════════════
//  Mock data — Lesson Planner (lessons + planned deliveries, decision #47)
//  Loaded as a global script before lessons.jsx (see index.html).
//
//  Two things, not one:
//    • a LESSON is reusable teaching content (title, topic, objectives,
//      structure, homework to set) owned by a teacher — no class, no date;
//    • a PLANNED LESSON (delivery) schedules a lesson for one class on one date
//      and carries what is specific to that delivery: notes for this group and
//      the post-lesson reflection.
//  Edit a lesson once and every delivery gets it. Materials attach to the LESSON
//  through resource links (context_type 'lesson'), so reusing a lesson brings
//  its worksheets with it. Deliveries join classes by id, never by group label.
//
//  LESSON_PLAN_SEED below is the authored content: each entry becomes one lesson
//  plus its first delivery; EXTRA_DELIVERIES reuse lessons on other classes/dates.
// ══════════════════════════════════════════════════════════════

const LESSON_PLAN_SEED = [
  {
    lessonId: 'les_simul', classId: 'c1', group: 'Year 10 – Group A', date: '2026-04-24', savedAt: '24 Apr, 17:42',
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
    lessonId: 'les_trig', classId: 'c2', group: 'Year 11 – Group B', date: '2026-04-24', savedAt: '23 Apr, 20:15',
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
    lessonId: 'les_diff', classId: 'c3', group: 'Year 12 – Group A', date: '2026-04-24', savedAt: '22 Apr, 19:03',
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
    lessonId: 'les_surds', classId: 'c4', group: 'Year 9 – Group C', date: '2026-04-24', savedAt: '24 Apr, 08:30',
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
    lessonId: 'les_de', classId: 'c35', group: 'Year 13 – Group A', date: '2026-04-22', savedAt: '23 Apr, 21:48',
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
    lessonId: 'les_prob', classId: 'c1', group: 'Year 10 – Group A', date: '2026-04-17', savedAt: '17 Apr, 18:20',
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
    lessonId: 'les_integ', classId: 'c3', group: 'Year 12 – Group A', date: '2026-04-17', savedAt: '16 Apr, 22:10',
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
  // ── Other teachers' plans (owner set) — every teacher can READ every plan, but
  //    only the owner edits. These surface under "All classes" in the planner,
  //    rendered read-only. Groups sit outside the principal's teacherClasses so
  //    they read clearly as another teacher's lesson.
  {
    lessonId: 'les_forces', classId: 'c20', group: 'Year 12 – Group A', date: '2026-04-21', savedAt: '20 Apr, 09:12', owner: 'David Park', ownerId: 't3',
    plan: {
      title: 'Forces & Motion — Newton\'s Laws',
      topic: 'Physics · Forces',
      duration: '60',
      objectives:
        '• State Newton\'s three laws of motion.\n' +
        '• Distinguish weight from mass.\n' +
        '• Apply F = ma to simple problems.',
      agenda:
        '0–10  Starter: forces around us\n' +
        '10–30 Newton\'s laws with demos\n' +
        '30–50 Practice: F = ma calculations\n' +
        '50–60 Plenary + exit ticket',
      homework: 'Forces worksheet Q1–8. Due 1 May.',
      notes: 'Bring the dynamics trolley for the second law demo.',
      resources: [],
    },
  },
  {
    lessonId: 'les_titr', classId: 'c6', group: 'Year 11 – Group A', date: '2026-04-22', savedAt: '21 Apr, 16:40', owner: 'Priya Nair', ownerId: 't2',
    plan: {
      title: 'Titration Calculations',
      topic: 'Chemistry · Quantitative chemistry',
      duration: '75',
      objectives:
        '• Carry out a titration calculation from a set of results.\n' +
        '• Use concentration = moles ÷ volume confidently.',
      agenda:
        '0–15  Recap moles and concentration\n' +
        '15–45 Worked titration calculations\n' +
        '45–70 Independent practice\n' +
        '70–75 Plenary',
      homework: 'Titration calculation set. Due 30 Apr.',
      notes: 'Watch unit conversions (cm³ → dm³).',
      resources: [],
    },
  },
];



// Reuse — the same lesson delivered to more than one group (the case the old
// deep-copying "Duplicate to another class" handled badly), plus this week's plans
// around the prototype clock (Fri 10 Jul 2026) so the dashboard's live class opens
// a real lesson. Past deliveries carry a reflection.
const EXTRA_DELIVERIES = [
  { lessonId: 'les_simul', classId: 'c34', date: '2026-04-27', notes: 'Group C is a set below A — start from the laminated worked examples.',
    reflection: 'Part 2 (scaling before eliminating) was hard for this group; half needed the worked example twice. Slow that section down next time.' },
  { lessonId: 'les_simul', classId: 'c1',  date: '2026-07-10', notes: 'Recap lesson before the end-of-term paper — quadratic/linear pairs as the stretch.', reflection: '' },
  { lessonId: 'les_trig',  classId: 'c36', date: '2026-04-28', notes: 'Three pupils missed the SOHCAHTOA recap — pair them up.',
    reflection: 'Cosine rule stuck better than last time; the ‘label the triangle first’ routine worked.' },
  { lessonId: 'les_diff',  classId: 'c3',  date: '2026-07-10', notes: 'Revisit first principles before the calculus mock — 20 minutes max.', reflection: '' },
  // shareWithClass (decision #60): this one delivery shows its title, topic and
  // objectives to the class's pupils in their session view. Default is off.
  { lessonId: 'les_diff',  classId: 'c37', date: '2026-07-09', notes: 'Further Maths group — push to the general proof for xⁿ.', reflection: '', shareWithClass: true },
];

const LESSON_SEED = (() => {
  const lessons = {}, deliveries = {};
  LESSON_PLAN_SEED.forEach(e => {
    const p = e.plan || {};
    if (!lessons[e.lessonId]) {
      lessons[e.lessonId] = {
        id: e.lessonId, ownerId: e.ownerId || 't1', owner: e.owner || null,
        title: p.title || '', topic: p.topic || '', duration: p.duration || '60',
        objectives: p.objectives || '', agenda: p.agenda || '', homework: p.homework || '',
        createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-2' + (e.date.slice(-1) || '0') + 'T18:00:00.000Z',
      };
    }
    const id = e.classId + '__' + e.date;
    deliveries[id] = { id, lessonId: e.lessonId, classId: e.classId, date: e.date, notes: p.notes || '', reflection: '', createdBy: e.ownerId || 't1', updatedAt: e.date + 'T18:00:00.000Z' };
  });
  EXTRA_DELIVERIES.forEach(d => {
    const id = d.classId + '__' + d.date;
    const owner = (lessons[d.lessonId] || {}).ownerId || 't1';
    deliveries[id] = { id, lessonId: d.lessonId, classId: d.classId, date: d.date, notes: d.notes || '', reflection: d.reflection || '', shareWithClass: !!d.shareWithClass, createdBy: owner, updatedAt: d.date + 'T18:00:00.000Z' };
  });
  return { lessons, deliveries };
})();

Object.assign(window, { LESSON_SEED });
