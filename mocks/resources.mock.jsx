// ══════════════════════════════════════════════════════════════════════════════
//  Mock data — Resources library (Materials)
//  Loaded as a global script before Resources.jsx (see index.html), after every
//  other mock so it can reference the canonical roster if it needs to.
//
//  GOVERNING DISTINCTION (see the phase brief):
//    • Materials  = files. Reusable, authored, the ONLY thing with a visibility
//      setting or a share button. That is what this file seeds.
//    • Teaching records (sessions, lesson plans, homework) and Student records
//      (progress, tracking, attendance, reports) are centre-owned and NEVER seed
//      a share/visibility/request here.
//
//  Everything a screen shows about a resource — "Used in N places", who can open
//  it, the pending-request count on the bell — is DERIVED from these lists at
//  render time. None of it is a stored rollup.
//
//  Store shape (localStorage `klasio.resources.v2`, see Resources.jsx):
//    resources[]        { id, title, description, type, subject, year_group,
//                         exam_board, created_by, visibility, size, url?,
//                         created_at, updated_at }
//    resource_shares[]  { resource_id, staff_id, granted_by, granted_at }
//    resource_access_requests[] { id, resource_id, requested_by, note, status,
//                         decided_by, decided_at }
//    resource_links[]   { id, resource_id, context_type('lesson_plan'|'homework'),
//                         context_id, student_visible, visible_from, attached_by, attached_at }
//    usage_events[]     { id, resource_id, user, centre, context_type, context_id,
//                         topic, at }   ← append-only attach history (survives detach)
//
//  SCALE: this seeds a ~120-file library across every subject the centre teaches,
//  so pagination (50/page), the facet counts, the fuzzy search and the "most used"
//  sort all run against something that behaves like a real department share drive
//  rather than a demo of a dozen rows.
// ══════════════════════════════════════════════════════════════════════════════

// ── Teaching staff (share targets + request routing) ────────────────────────────
// A small, self-contained staff model for the Materials feature — mirrors how
// Communications owns its own COMMS_USERS. `t1` is the principal and the default
// acting teacher, matching teacherMetrics.getPrincipal(); the name is read off the
// canonical admin roster (SEED_TEACHERS, loaded earlier) so renaming the principal
// there doesn't leave a second name owning half the library here.
//
// Request routing is derived from this list: an active creator approves their own
// file's requests; if they are deactivated it falls to the admin (never a stored
// owner). `t_omar` is seeded INACTIVE — a teacher who has left — so the
// fall-to-admin path has real data behind it on first load.
const resAdminName = (id, fallback) => {
  const t = (window.SEED_TEACHERS || []).find(x => x.id === id);
  return (t && t.name) ? t.name : fallback;
};

const RES_STAFF = [
  { id: 't1',        name: resAdminName('t1',  'Heebz A'),       subject: 'Mathematics',      role: 'teacher', principal: true, active: true },
  { id: 't_david',   name: resAdminName('t3',  'David Park'),    subject: 'Physics',          role: 'teacher', active: true },
  { id: 't_priya',   name: resAdminName('t2',  'Priya Nair'),    subject: 'Chemistry',        role: 'teacher', active: true },
  { id: 't_grace',   name: 'Grace Okonkwo',                      subject: 'English',          role: 'teacher', active: true },
  { id: 't_marcus',  name: resAdminName('t4',  'Marcus Webb'),   subject: 'English Literature', role: 'teacher', active: true },
  { id: 't_helen',   name: resAdminName('t5',  'Helen Yoo'),     subject: 'History',          role: 'teacher', active: true },
  { id: 't_daniel',  name: resAdminName('t6',  'Daniel Mehta'),  subject: 'Computer Science', role: 'teacher', active: true },
  { id: 't_aisha',   name: resAdminName('t7',  'Aisha Begum'),   subject: 'Geography',        role: 'teacher', active: true },
  { id: 't_tom',     name: resAdminName('t8',  'Tom Rivera'),    subject: 'Mathematics',      role: 'teacher', active: true },
  { id: 't_claire',  name: resAdminName('t9',  'Claire Dubois'), subject: 'French',           role: 'teacher', active: true },
  { id: 't_james',   name: resAdminName('t10', 'James Okafor'),  subject: 'Biology',          role: 'teacher', active: true },
  { id: 't_rebecca', name: resAdminName('t11', 'Rebecca Stone'), subject: 'Economics',        role: 'teacher', active: true },
  { id: 't_omar',    name: 'Omar Reyes',                         subject: 'Psychology',       role: 'teacher', active: false },
  { id: 'admin',     name: 'Lisa Chen',                          subject: null,               role: 'admin',   active: true },
];

// ── Visibility values (D1) ──────────────────────────────────────────────────────
// Three values, each with the plain-English description shown in the picker. UI
// copy never surfaces these enum ids.
const RES_VISIBILITY = [
  { id: 'centre',     label: 'Centre-wide', icon: 'users', desc: 'Anyone at the centre can open it.' },
  { id: 'on_request', label: 'On request',  icon: 'lock',  desc: 'Others see it exists and must ask before they can open it.' },
  { id: 'private',    label: 'Private',      icon: 'eye',   desc: 'Only you can see it. It never appears in anyone else’s library.' },
];

// ── Resource types ──────────────────────────────────────────────────────────────
// `tone` names a DS token (resolved in Resources.jsx) so no raw hex lives here.
// `studentDefault` seeds the per-attachment student-visibility default when a type
// is attached to homework (D9): a mark scheme defaults OFF, everything else ON.
const RES_TYPES = [
  { id: 'worksheet',   label: 'Worksheet',    icon: 'clip',  tone: 'accent',  studentDefault: true  },
  { id: 'mark_scheme', label: 'Mark scheme',  icon: 'check',  tone: 'success', studentDefault: false },
  { id: 'slides',      label: 'Slides',        icon: 'image',  tone: 'info',    studentDefault: true  },
  { id: 'notes',       label: 'Notes',         icon: 'edit',   tone: 'warning', studentDefault: true  },
  { id: 'past_paper',  label: 'Past paper',    icon: 'file',   tone: 'violet',  studentDefault: false },
  { id: 'revision',    label: 'Revision pack', icon: 'book',   tone: 'accent',  studentDefault: true  },
  { id: 'video',       label: 'Video',         icon: 'video',  tone: 'danger',  studentDefault: true  },
  { id: 'link',        label: 'Link',          icon: 'link',   tone: 'muted',   studentDefault: true  },
  { id: 'other',       label: 'Other',         icon: 'file',   tone: 'muted',   studentDefault: true  },
];

const RES_EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'Cambridge', 'None'];
const RES_YEAR_GROUPS  = ['Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

const KB = 1024, MB = 1024 * 1024;

// ── Resources ───────────────────────────────────────────────────────────────────
// Grouped by owner so the shape of each teacher's shelf is legible: a maths lead
// with a deep, mostly centre-wide library; specialists with a working set each;
// a handful of restricted files (mocks, mark schemes, an unfinished draft) that
// give the request/share flows something real to act on.
//
// `url` is only set on `link` files — the one type whose contents ARE a URL. Every
// other row is a reference to a file the prototype never stores bytes for.
const RES_RESOURCES_SEED = [
  // ══ Heebz A (t1 / principal) — Mathematics ═════════════════════════════════
  { id: 'r_quad_ws',      title: 'Quadratic Equations — Worksheet',            description: 'Factorising, the quadratic formula and completing the square, with an extension set.',        type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 184 * KB, created_at: '2026-03-02', updated_at: '2026-04-18' },
  { id: 'r_quad_ms',      title: 'Quadratic Equations — Mark Scheme',          description: 'Full worked solutions and mark allocation for the quadratics worksheet.',                     type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 96 * KB,  created_at: '2026-03-02', updated_at: '2026-03-02' },
  { id: 'r_simul_slides', title: 'Simultaneous Equations — Slides',            description: 'Elimination and substitution methods, built for a 90-minute lesson.',                          type: 'slides',      subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 2 * MB,   created_at: '2026-04-10', updated_at: '2026-04-22' },
  { id: 'r_simul_ws',     title: 'Simultaneous Equations — Practice Set',      description: 'Exercise 7B and 7C reworked as a single sheet: elimination first, then scaling, then worded problems.', type: 'worksheet', subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA', created_by: 't1', visibility: 'centre', size: 172 * KB, created_at: '2026-04-10', updated_at: '2026-04-24' },
  { id: 'r_simul_ms',     title: 'Simultaneous Equations — Mark Scheme',       description: 'Worked answers with the method marks split out, so a cover teacher can mark it cold.',          type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 88 * KB,  created_at: '2026-04-10', updated_at: '2026-04-10' },
  { id: 'r_trig_ws',      title: 'Sine & Cosine Rules — Worksheet',            description: 'Mixed problems where students choose the rule; exam-style questions at the end.',                type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 198 * KB, created_at: '2026-04-05', updated_at: '2026-04-20' },
  { id: 'r_trig_ms',      title: 'Sine & Cosine Rules — Mark Scheme',          description: 'Answers plus the two most common labelling errors, flagged where they cost marks.',              type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 104 * KB, created_at: '2026-04-05', updated_at: '2026-04-05' },
  { id: 'r_trig_slides',  title: 'Non-right-angled Triangles — Slides',        description: 'Derivation of both rules with animated triangle labelling, then five worked examples.',          type: 'slides',      subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 3.1 * MB, created_at: '2026-03-28', updated_at: '2026-04-21' },
  { id: 'r_surds_ws',     title: 'Surds & Indices — Carousel Stations',        description: 'Three-station practice carousel with a scaffolded version for support.',                        type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 220 * KB, created_at: '2026-04-12', updated_at: '2026-04-12' },
  { id: 'r_surds_ms',     title: 'Surds & Indices — Answers',                  description: 'Station-by-station answers, printable as one page for the wall.',                               type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 62 * KB,  created_at: '2026-04-12', updated_at: '2026-04-12' },
  { id: 'r_surds_scaf',   title: 'Surds & Indices — Scaffolded Version',       description: 'Same content, worked first example on each station and a smaller number range.',                type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 214 * KB, created_at: '2026-04-13', updated_at: '2026-04-13' },
  { id: 'r_prob_trees',   title: 'Probability Trees — Worksheet',              description: 'Two-event trees with and without replacement, building to conditional probability.',            type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 174 * KB, created_at: '2026-04-14', updated_at: '2026-04-17' },
  { id: 'r_prob_slides',  title: 'Probability Trees — Slides',                 description: 'Builds one tree branch-by-branch, with the coloured-counter demo built in.',                     type: 'slides',      subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 1.8 * MB, created_at: '2026-04-14', updated_at: '2026-04-16' },
  { id: 'r_prob_draft',   title: 'Probability Trees — Draft',                  description: 'Half-finished worksheet — not ready to share yet.',                                             type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'private',    size: 74 * KB,  created_at: '2026-04-16', updated_at: '2026-04-16' },
  { id: 'r_calc_notes',   title: 'Differentiation from First Principles — Notes', description: 'Derivation notes with the limit definition; still being polished for a mixed group.',        type: 'notes',       subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'on_request', size: 312 * KB, created_at: '2026-04-15', updated_at: '2026-04-21' },
  { id: 'r_calc_slides',  title: 'Differentiation — Gradient of a Chord Slides', description: 'Chord-to-tangent build-up that motivates the limit, paired with the Desmos demo.',            type: 'slides',      subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'centre',     size: 2.6 * MB, created_at: '2026-04-15', updated_at: '2026-04-23' },
  { id: 'r_calc_ws',      title: 'Differentiation — Practice Questions',       description: 'Power rule drilled first, then product and chain rule, then two exam questions.',               type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'centre',     size: 206 * KB, created_at: '2026-04-16', updated_at: '2026-04-16' },
  { id: 'r_integ_notes',  title: 'Integration as Reverse Differentiation — Notes', description: 'Pattern-spotting approach to the reverse power rule, with the +c warning made loud.',      type: 'notes',       subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'centre',     size: 268 * KB, created_at: '2026-04-08', updated_at: '2026-04-18' },
  { id: 'r_integ_ws',     title: 'Integration — Practice Set',                 description: 'Indefinite then definite integrals, finishing with area under a curve.',                        type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'centre',     size: 188 * KB, created_at: '2026-04-08', updated_at: '2026-04-08' },
  { id: 'r_de_notes',     title: 'Differential Equations — Modelling Notes',   description: 'Forming a DE from a worded context, separating variables, and interpreting the constant.',      type: 'notes',       subject: 'Mathematics', year_group: 'Year 13', exam_board: 'OCR',     created_by: 't1', visibility: 'centre',     size: 280 * KB, created_at: '2026-04-02', updated_at: '2026-04-23' },
  { id: 'r_de_pp',        title: 'Differential Equations — Timed Exam Questions', description: 'Six past-paper modelling questions with timings. Held back so the Year 13 mock stays clean.', type: 'past_paper',  subject: 'Mathematics', year_group: 'Year 13', exam_board: 'OCR',     created_by: 't1', visibility: 'on_request', size: 165 * KB, created_at: '2026-04-02', updated_at: '2026-04-02' },
  { id: 'r_vectors_notes', title: 'Vectors — Notes & Worked Proofs',           description: 'Component form, magnitude, unit vectors and the standard collinearity proofs.',                  type: 'notes',       subject: 'Further Maths', year_group: 'Year 12', exam_board: 'OCR',   created_by: 't1', visibility: 'centre',     size: 244 * KB, created_at: '2026-03-16', updated_at: '2026-04-11' },
  { id: 'r_vectors_ws',   title: 'Vectors — Problem Set',                      description: 'Graduated problems ending with two full proof questions.',                                      type: 'worksheet',   subject: 'Further Maths', year_group: 'Year 12', exam_board: 'OCR',   created_by: 't1', visibility: 'centre',     size: 176 * KB, created_at: '2026-03-16', updated_at: '2026-03-16' },
  { id: 'r_gcse_higher_rev', title: 'GCSE Maths Higher — Revision Pack',       description: 'Twelve topic sheets with answers, ordered by how often they appear on paper 1.',                type: 'revision',    subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 4.2 * MB, created_at: '2026-01-12', updated_at: '2026-04-19' },
  { id: 'r_gcse_found_rev', title: 'GCSE Maths Foundation — Revision Pack',    description: 'Foundation-tier equivalent: number and ratio weighted heavily, worked examples throughout.',    type: 'revision',    subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 3.7 * MB, created_at: '2026-01-12', updated_at: '2026-03-08' },
  { id: 'r_nov_paper1',   title: 'November 2025 Paper 1 — Higher',             description: 'Full non-calculator paper, used as the January mock. Safe to reuse for practice now.',          type: 'past_paper',  subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 1.1 * MB, created_at: '2025-12-04', updated_at: '2026-02-02' },
  { id: 'r_nov_paper1_ms', title: 'November 2025 Paper 1 — Mark Scheme',       description: 'Official mark scheme. On request so it isn’t attached to a live assessment by accident.',        type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'on_request', size: 620 * KB, created_at: '2025-12-04', updated_at: '2025-12-04' },
  { id: 'r_formula_sheet', title: 'GCSE Formula Sheet — Annotated',            description: 'The exam formula sheet with notes on which topics each formula actually turns up in.',           type: 'notes',       subject: 'Mathematics', year_group: 'Year 11', exam_board: 'None',    created_by: 't1', visibility: 'centre',     size: 88 * KB,  created_at: '2025-10-07', updated_at: '2026-02-14' },
  { id: 'r_desmos_link',  title: 'Desmos — Tangent & Gradient Demo',           description: 'Live graph with a draggable tangent slider. Open it on the board during first principles.',      type: 'link',        subject: 'Mathematics', year_group: 'Year 12', exam_board: 'None',    created_by: 't1', visibility: 'centre',     size: 0,        created_at: '2026-04-15', updated_at: '2026-04-15', url: 'https://www.desmos.com/calculator' },
  { id: 'r_maths_starters', title: '50 Starter Questions — Mixed Topics',      description: 'One page, fifty five-minute starters. Sorted by topic so you can pick to match the lesson.',     type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'None',    created_by: 't1', visibility: 'centre',     size: 132 * KB, created_at: '2025-09-18', updated_at: '2026-03-04' },
  { id: 'r_ratio_ws',     title: 'Ratio & Proportion — Worksheet',             description: 'Sharing in a ratio, best-buy problems and direct proportion, with a recipe-scaling task.',       type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 156 * KB, created_at: '2025-11-11', updated_at: '2026-01-22' },
  { id: 'r_ratio_video',  title: 'Ratio — Five-Minute Explainer',              description: 'Short screencast for students who missed the lesson or want it again before homework.',           type: 'video',       subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'None',    created_by: 't1', visibility: 'centre',     size: 42 * MB,  created_at: '2025-11-12', updated_at: '2025-11-12' },
  { id: 'r_bearings_ws',  title: 'Bearings — Worksheet',                       description: 'Three-figure bearings, back bearings and a scale-drawing task on squared paper.',                type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 164 * KB, created_at: '2026-02-03', updated_at: '2026-02-03' },
  { id: 'r_indices_quiz', title: 'Laws of Indices — Quick Quiz',               description: 'Ten questions, five minutes, self-marking grid at the bottom.',                                 type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 74 * KB,  created_at: '2026-02-24', updated_at: '2026-02-24' },
  { id: 'r_target_grades', title: 'Year 11 Target Grade Tracker',              description: 'My own working spreadsheet of predicted vs target grades. Not for sharing — it has my notes on individual students.', type: 'other', subject: 'Mathematics', year_group: 'Year 11', exam_board: 'None', created_by: 't1', visibility: 'private', size: 96 * KB, created_at: '2025-10-02', updated_at: '2026-04-22' },

  // ══ Tom Rivera (t_tom) — Mathematics (second maths teacher) ════════════════
  { id: 'r_algebra_bsg',  title: 'Algebra Basics — Bronze / Silver / Gold',    description: 'Same skill at three levels of challenge on one sheet; students pick their entry point.',          type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 8',  exam_board: 'None',    created_by: 't_tom', visibility: 'centre',    size: 148 * KB, created_at: '2025-09-30', updated_at: '2026-01-15' },
  { id: 'r_fractions_ws', title: 'Fractions, Decimals & Percentages — Worksheet', description: 'Conversion triangle practice then applied percentage-change questions.',                      type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 8',  exam_board: 'None',    created_by: 't_tom', visibility: 'centre',    size: 138 * KB, created_at: '2025-10-14', updated_at: '2025-10-14' },
  { id: 'r_negnum_slides', title: 'Negative Numbers — Slides',                 description: 'Number-line first, rules second. Includes the temperature and bank-balance contexts.',            type: 'slides',      subject: 'Mathematics', year_group: 'Year 8',  exam_board: 'None',    created_by: 't_tom', visibility: 'centre',    size: 1.4 * MB, created_at: '2025-09-23', updated_at: '2025-09-23' },
  { id: 'r_times_grid',   title: 'Times Tables Fluency Grid',                  description: 'Printable weekly fluency grid with a progress tracker down the side.',                            type: 'other',       subject: 'Mathematics', year_group: 'Year 8',  exam_board: 'None',    created_by: 't_tom', visibility: 'centre',    size: 54 * KB,  created_at: '2025-09-09', updated_at: '2025-09-09' },
  { id: 'r_pythag_ws',    title: 'Pythagoras — Worksheet',                     description: 'Finding the hypotenuse, then a shorter side, then two-step problems in context.',                 type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_tom', visibility: 'centre',    size: 158 * KB, created_at: '2026-01-19', updated_at: '2026-03-02' },
  { id: 'r_percent_rev',  title: 'Percentages — Revision Pack',                description: 'Reverse percentages and compound interest, the two that cost the most marks.',                    type: 'revision',    subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_tom', visibility: 'centre',    size: 980 * KB, created_at: '2026-02-11', updated_at: '2026-04-09' },
  { id: 'r_mock_y10',     title: 'Year 10 Mock Paper — Summer 2026',           description: 'Internal mock, written for this cohort. Restricted until the whole year group has sat it.',       type: 'past_paper',  subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_tom', visibility: 'on_request', size: 1.3 * MB, created_at: '2026-04-06', updated_at: '2026-04-20' },
  { id: 'r_mock_y10_ms',  title: 'Year 10 Mock Paper — Mark Scheme',           description: 'Mark scheme and grade boundaries for the summer internal mock.',                                  type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_tom', visibility: 'on_request', size: 410 * KB, created_at: '2026-04-06', updated_at: '2026-04-06' },
  { id: 'r_tom_interv',   title: 'Intervention Plan — Year 10 Catch-up',       description: 'Working notes on who needs what before the summer. Individual students named.',                   type: 'other',       subject: 'Mathematics', year_group: 'Year 10', exam_board: 'None',    created_by: 't_tom', visibility: 'private',   size: 68 * KB,  created_at: '2026-03-17', updated_at: '2026-04-21' },

  // ══ David Park (t_david) — Physics ═════════════════════════════════════════
  { id: 'r_forces_ws',    title: 'Forces & Motion — Worksheet',                description: 'Newton’s laws, weight vs mass, and terminal velocity questions.',                                type: 'worksheet',   subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 176 * KB, created_at: '2026-03-08', updated_at: '2026-03-19' },
  { id: 'r_forces_ms',    title: 'Forces & Motion — Mark Scheme',              description: 'Answers with unit marks called out separately — that’s where this class loses marks.',            type: 'mark_scheme', subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 92 * KB,  created_at: '2026-03-08', updated_at: '2026-03-08' },
  { id: 'r_forces_slides', title: 'Newton’s Laws — Slides',                    description: 'One slide per law with the trolley demo photographed step by step.',                              type: 'slides',      subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 2.4 * MB, created_at: '2026-03-06', updated_at: '2026-04-24' },
  { id: 'r_energy_ws',    title: 'Energy Stores & Transfers — Worksheet',      description: 'Sankey diagrams, efficiency calculations and the eight energy stores.',                           type: 'worksheet',   subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 168 * KB, created_at: '2025-11-05', updated_at: '2026-02-18' },
  { id: 'r_circuits_ws',  title: 'Circuits & Ohm’s Law — Worksheet',           description: 'Series and parallel calculations, then interpreting an I–V characteristic.',                      type: 'worksheet',   subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 182 * KB, created_at: '2026-01-27', updated_at: '2026-01-27' },
  { id: 'r_resist_prac',  title: 'Required Practical: Resistance — Method',    description: 'Full method, risk assessment and results table, ready to print for the lab.',                      type: 'notes',       subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 124 * KB, created_at: '2026-01-27', updated_at: '2026-03-11' },
  { id: 'r_waves_pp',     title: 'Waves — Past Paper Pack',                    description: 'Five past-paper questions on waves with a marking grid.',                                        type: 'past_paper',  subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'on_request', size: 1.4 * MB, created_at: '2026-02-28', updated_at: '2026-04-02' },
  { id: 'r_waves_slides', title: 'Waves — Slides',                             description: 'Transverse vs longitudinal, the wave equation, and the ripple-tank clips embedded.',              type: 'slides',      subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 5.8 * MB, created_at: '2026-02-24', updated_at: '2026-03-30' },
  { id: 'r_radio_rev',    title: 'Radioactivity — Revision Pack',              description: 'Decay equations, half-life graphs and the contamination-vs-irradiation distinction.',              type: 'revision',    subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 1.2 * MB, created_at: '2026-03-14', updated_at: '2026-04-15' },
  { id: 'r_phys_eq',      title: 'Physics Equation Sheet — Annotated',         description: 'Every equation grouped by paper, with the ones that must be memorised highlighted.',               type: 'notes',       subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 110 * KB, created_at: '2025-10-21', updated_at: '2026-03-03' },
  { id: 'r_prac_video',   title: 'Required Practicals — Demo Video',           description: 'All six GCSE practicals demonstrated, chaptered so you can jump to one.',                          type: 'video',       subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 128 * MB, created_at: '2026-01-08', updated_at: '2026-01-08' },
  { id: 'r_suvat_notes',  title: 'A-Level Mechanics — SUVAT Notes',            description: 'The five equations derived, then a decision tree for choosing which one to use.',                  type: 'notes',       subject: 'Physics',     year_group: 'Year 12', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 236 * KB, created_at: '2025-10-01', updated_at: '2026-02-09' },
  { id: 'r_suvat_ws',     title: 'SUVAT — Problem Set',                        description: 'Projectiles included. Question 9 onward is A* territory.',                                        type: 'worksheet',   subject: 'Physics',     year_group: 'Year 12', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 192 * KB, created_at: '2025-10-01', updated_at: '2025-10-01' },
  { id: 'r_fields_pp',    title: 'Fields & Their Consequences — Past Paper Pack', description: 'A-Level paper 2 questions on gravitational, electric and magnetic fields.',                    type: 'past_paper',  subject: 'Physics',     year_group: 'Year 13', exam_board: 'AQA',     created_by: 't_david', visibility: 'on_request', size: 1.6 * MB, created_at: '2026-02-16', updated_at: '2026-02-16' },
  { id: 'r_space_slides', title: 'Space Physics — Slides',                     description: 'Life cycle of a star, red shift and the evidence for the Big Bang.',                              type: 'slides',      subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',    size: 4.4 * MB, created_at: '2026-03-31', updated_at: '2026-03-31' },
  { id: 'r_phys_mock',    title: 'Year 13 Mock — Answers',                     description: 'Answer booklet for the internal Year 13 physics mock.',                                          type: 'mark_scheme', subject: 'Physics',     year_group: 'Year 13', exam_board: 'AQA',     created_by: 't_david', visibility: 'private',   size: 520 * KB, created_at: '2026-04-01', updated_at: '2026-04-01' },

  // ══ Priya Nair (t_priya) — Chemistry ═══════════════════════════════════════
  { id: 'r_rates_ws',     title: 'Rates of Reaction — Worksheet',              description: 'Collision theory, catalysts and the effect of concentration.',                                   type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 168 * KB, created_at: '2026-03-11', updated_at: '2026-03-25' },
  { id: 'r_rates_ms',     title: 'Rates of Reaction — Mark Scheme',            description: 'Answers including the tangent-to-a-curve method for rate at a given time.',                       type: 'mark_scheme', subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 84 * KB,  created_at: '2026-03-11', updated_at: '2026-03-11' },
  { id: 'r_moles_ws',     title: 'Moles & Concentration — Worksheet',          description: 'Mr, moles from mass, then concentration in both mol/dm³ and g/dm³.',                             type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 174 * KB, created_at: '2025-11-18', updated_at: '2026-02-25' },
  { id: 'r_moles_slides', title: 'Moles — Slides',                             description: 'The mole triangle, then why it works. Worked examples on every third slide.',                     type: 'slides',      subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 2.2 * MB, created_at: '2025-11-18', updated_at: '2025-11-18' },
  { id: 'r_bonding_ws',   title: 'Ionic & Covalent Bonding — Worksheet',       description: 'Dot-and-cross practice, then explaining properties from structure.',                              type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 186 * KB, created_at: '2025-10-09', updated_at: '2026-01-30' },
  { id: 'r_periodic_rev', title: 'Periodic Table & Trends — Revision Pack',    description: 'Group 1, 7 and 0 trends with the reactivity explanations examiners want to see.',                  type: 'revision',    subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 1.1 * MB, created_at: '2026-01-13', updated_at: '2026-04-07' },
  { id: 'r_titration_ws', title: 'Titration Calculations — Worksheet',         description: 'Concordant results, average titre, then the full calculation chain to concentration.',            type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 158 * KB, created_at: '2026-03-20', updated_at: '2026-04-08' },
  { id: 'r_titration_ms', title: 'Titration Calculations — Mark Scheme',       description: 'Step-by-step mark scheme for the titration calculation set.',                                     type: 'mark_scheme', subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_priya', visibility: 'on_request', size: 128 * KB, created_at: '2026-03-20', updated_at: '2026-04-08' },
  { id: 'r_electrolysis', title: 'Electrolysis Required Practical — Method',   description: 'Method, safety notes and the results table for the copper sulfate electrolysis.',                  type: 'notes',       subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 132 * KB, created_at: '2026-02-05', updated_at: '2026-02-05' },
  { id: 'r_organic_rev',  title: 'Organic Chemistry — Revision Pack',          description: 'Condensed revision pack for the organic module, exam-ready.',                                     type: 'revision',    subject: 'Chemistry',   year_group: 'Year 12', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 890 * KB, created_at: '2026-04-03', updated_at: '2026-04-19' },
  { id: 'r_organic_ws',   title: 'Functional Groups — Worksheet',              description: 'Naming and recognising the eight groups, then the aldehyde/ketone tests.',                        type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 12', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',    size: 164 * KB, created_at: '2026-04-03', updated_at: '2026-04-03' },
  { id: 'r_organic_ms',   title: 'Functional Groups — Mark Scheme',            description: 'Answers with the test-and-observation wording students are expected to use.',                     type: 'mark_scheme', subject: 'Chemistry',   year_group: 'Year 12', exam_board: 'OCR',     created_by: 't_priya', visibility: 'on_request', size: 96 * KB,  created_at: '2026-04-03', updated_at: '2026-04-03' },
  { id: 'r_chem_mock',    title: 'Year 11 Chemistry Mock — Paper 1',           description: 'Internal mock paper. Restricted until every Year 11 group has sat it.',                            type: 'past_paper',  subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_priya', visibility: 'on_request', size: 1.2 * MB, created_at: '2026-03-02', updated_at: '2026-03-02' },
  { id: 'r_chem_data',    title: 'Chemistry Data Sheet',                       description: 'Periodic table, Mr values and the ion charges sheet allowed in the exam.',                        type: 'notes',       subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'None',    created_by: 't_priya', visibility: 'centre',    size: 78 * KB,  created_at: '2025-09-16', updated_at: '2025-09-16' },
  { id: 'r_titr_video',   title: 'Titration Technique — Video',                description: 'Two-minute clip of the technique done properly, including reading the meniscus.',                 type: 'video',       subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'None',    created_by: 't_priya', visibility: 'centre',    size: 64 * MB,  created_at: '2026-03-21', updated_at: '2026-03-21' },

  // ══ James Okafor (t_james) — Biology ═══════════════════════════════════════
  { id: 'r_cells_ws',     title: 'Cell Structure — Worksheet',                 description: 'Animal, plant and bacterial cells; labelling then comparing function to structure.',              type: 'worksheet',   subject: 'Biology',     year_group: 'Year 8',  exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 152 * KB, created_at: '2025-09-25', updated_at: '2026-01-09' },
  { id: 'r_photo_ws',     title: 'Photosynthesis — Worksheet',                 description: 'Word and symbol equations, limiting factors, and reading a rate graph.',                          type: 'worksheet',   subject: 'Biology',     year_group: 'Year 8',  exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 148 * KB, created_at: '2026-02-10', updated_at: '2026-04-02' },
  { id: 'r_photo_slides', title: 'Photosynthesis — Slides',                    description: 'Leaf structure through to the limiting-factor graphs, with the pondweed demo photos.',            type: 'slides',      subject: 'Biology',     year_group: 'Year 8',  exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 3.3 * MB, created_at: '2026-02-10', updated_at: '2026-02-10' },
  { id: 'r_micro_video',  title: 'Using a Microscope — Video',                 description: 'Setting up, focusing and calculating magnification. Shot in our own lab.',                        type: 'video',       subject: 'Biology',     year_group: 'Year 8',  exam_board: 'None',    created_by: 't_james', visibility: 'centre',    size: 88 * MB,  created_at: '2025-09-25', updated_at: '2025-09-25' },
  { id: 'r_mitosis_ws',   title: 'Mitosis & the Cell Cycle — Worksheet',       description: 'Stage sequencing, then the difference between mitosis and meiosis in a table.',                   type: 'worksheet',   subject: 'Biology',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 166 * KB, created_at: '2026-01-21', updated_at: '2026-03-17' },
  { id: 'r_mitosis_ms',   title: 'Mitosis & the Cell Cycle — Mark Scheme',     description: 'Answers plus the two stage-order mistakes that come up every year.',                              type: 'mark_scheme', subject: 'Biology',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 82 * KB,  created_at: '2026-01-21', updated_at: '2026-01-21' },
  { id: 'r_enzymes_prac', title: 'Enzymes Required Practical — Method',        description: 'Amylase and starch, with the iodine test timings and a results grid.',                            type: 'notes',       subject: 'Biology',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 128 * KB, created_at: '2025-12-02', updated_at: '2026-02-27' },
  { id: 'r_genetics_rev', title: 'Genetics & Inheritance — Revision Pack',     description: 'Punnett squares, family trees and the genetic-terms glossary students keep confusing.',            type: 'revision',    subject: 'Biology',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 1.4 * MB, created_at: '2026-02-19', updated_at: '2026-04-13' },
  { id: 'r_ecology_ws',   title: 'Ecology & Sampling — Worksheet',             description: 'Quadrats, transects and the maths of estimating a population.',                                   type: 'worksheet',   subject: 'Biology',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_james', visibility: 'centre',    size: 172 * KB, created_at: '2026-03-24', updated_at: '2026-03-24' },
  { id: 'r_bio_pp',       title: 'Biology Paper 1 — Past Paper Pack',          description: 'Three full papers grouped by topic. Restricted so it isn’t set as homework by accident.',         type: 'past_paper',  subject: 'Biology',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_james', visibility: 'on_request', size: 2.8 * MB, created_at: '2026-01-29', updated_at: '2026-01-29' },
  { id: 'r_bio_sow',      title: 'Biology Scheme of Work — 2026/27 Draft',     description: 'Next year’s sequencing, still moving. Not ready for the department yet.',                          type: 'other',       subject: 'Biology',     year_group: 'Year 10', exam_board: 'None',    created_by: 't_james', visibility: 'private',   size: 118 * KB, created_at: '2026-04-14', updated_at: '2026-04-23' },

  // ══ Grace Okonkwo (t_grace) — English ══════════════════════════════════════
  { id: 'r_macbeth',      title: 'Macbeth — Essay Planning',                   description: 'Essay-planning grid with model paragraphs for the ambition theme.',                              type: 'notes',       subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 142 * KB, created_at: '2026-03-30', updated_at: '2026-04-14' },
  { id: 'r_macbeth_slides', title: 'Macbeth — Act 3 Slides',                   description: 'Banquo’s murder and the banquet scene, with the key quotations pulled out on each slide.',       type: 'slides',      subject: 'English',     year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 2.9 * MB, created_at: '2026-03-18', updated_at: '2026-04-16' },
  { id: 'r_macbeth_quotes', title: 'Macbeth — Key Quotation Bank',             description: 'Forty quotations sorted by theme and character, each with an analysis prompt.',                   type: 'notes',       subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 96 * KB,  created_at: '2026-03-18', updated_at: '2026-03-18' },
  { id: 'r_poetry_ms',    title: 'Poetry Anthology — Mark Scheme',             description: 'Marking guidance for the Power & Conflict comparison question.',                                  type: 'mark_scheme', subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'on_request', size: 156 * KB, created_at: '2026-03-30', updated_at: '2026-03-30' },
  { id: 'r_poetry_ws',    title: 'Power & Conflict — Comparison Worksheet',    description: 'Paired poems with a comparison grid and sentence stems for the second half.',                     type: 'worksheet',   subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 164 * KB, created_at: '2026-03-30', updated_at: '2026-04-10' },
  { id: 'r_inspector',    title: 'An Inspector Calls — Character Notes',       description: 'One page per character: arc, three quotations, and the social point Priestley is making.',        type: 'notes',       subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 188 * KB, created_at: '2025-11-25', updated_at: '2026-02-12' },
  { id: 'r_creative_ws',  title: 'Creative Writing — Model Answers',           description: 'Three graded responses to the same prompt, annotated with why each sits where it does.',          type: 'notes',       subject: 'English',     year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 134 * KB, created_at: '2025-10-16', updated_at: '2026-01-26' },
  { id: 'r_reading_ws',   title: 'Unseen Prose — Reading Skills Worksheet',    description: 'Language-analysis practice on an unseen extract, scaffolded down to word level.',                  type: 'worksheet',   subject: 'English',     year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',    size: 146 * KB, created_at: '2026-02-04', updated_at: '2026-02-04' },
  { id: 'r_lang_p1_pp',   title: 'English Language Paper 1 — Past Paper',      description: 'Full paper with the insert. Held back for the walking-talking mock.',                              type: 'past_paper',  subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'on_request', size: 1.1 * MB, created_at: '2026-02-20', updated_at: '2026-02-20' },

  // ══ Marcus Webb (t_marcus) — English Literature ════════════════════════════
  { id: 'r_carol_notes',  title: 'A Christmas Carol — Chapter Notes',          description: 'Stave-by-stave summary, context links and the exam-relevant quotations.',                        type: 'notes',       subject: 'English Literature', year_group: 'Year 10', exam_board: 'AQA', created_by: 't_marcus', visibility: 'centre',    size: 212 * KB, created_at: '2025-10-28', updated_at: '2026-03-05' },
  { id: 'r_carol_ws',     title: 'A Christmas Carol — Essay Questions',        description: 'Twelve past questions with a planning grid for each. Good for timed practice.',                   type: 'worksheet',   subject: 'English Literature', year_group: 'Year 10', exam_board: 'AQA', created_by: 't_marcus', visibility: 'centre',    size: 128 * KB, created_at: '2025-10-28', updated_at: '2025-10-28' },
  { id: 'r_romeo_slides', title: 'Romeo & Juliet — Act 1 Slides',              description: 'The prologue, the brawl and the party scene, with modern-translation panels.',                   type: 'slides',      subject: 'English Literature', year_group: 'Year 9',  exam_board: 'AQA', created_by: 't_marcus', visibility: 'centre',    size: 3.6 * MB, created_at: '2026-01-14', updated_at: '2026-03-12' },
  { id: 'r_lit_frame',    title: 'Literature Essay Framework',                 description: 'The what/how/why paragraph structure with two worked examples. Whole-department version.',        type: 'notes',       subject: 'English Literature', year_group: 'Year 11', exam_board: 'None', created_by: 't_marcus', visibility: 'centre',   size: 74 * KB,  created_at: '2025-09-11', updated_at: '2026-02-06' },
  { id: 'r_lit_mock_ms',  title: 'Year 11 Literature Mock — Mark Scheme',      description: 'Levelled mark scheme with exemplar responses from this cohort’s mock.',                           type: 'mark_scheme', subject: 'English Literature', year_group: 'Year 11', exam_board: 'AQA', created_by: 't_marcus', visibility: 'on_request', size: 246 * KB, created_at: '2026-02-26', updated_at: '2026-02-26' },
  { id: 'r_alevel_lit',   title: 'A-Level Literature — Critical Theory Pack',  description: 'Feminist, Marxist and post-colonial readings applied to the set texts.',                          type: 'revision',    subject: 'English Literature', year_group: 'Year 12', exam_board: 'AQA', created_by: 't_marcus', visibility: 'on_request', size: 1.9 * MB, created_at: '2026-01-07', updated_at: '2026-04-04' },
  { id: 'r_webb_marking', title: 'Marking Notes — Year 11 Cohort',             description: 'My running notes on individual students’ essay weaknesses. Personal working file.',               type: 'other',       subject: 'English Literature', year_group: 'Year 11', exam_board: 'None', created_by: 't_marcus', visibility: 'private',  size: 62 * KB,  created_at: '2026-03-09', updated_at: '2026-04-20' },

  // ══ Helen Yoo (t_helen) — History ══════════════════════════════════════════
  { id: 'r_ww2_timeline', title: 'World War II — Timeline Activity',           description: 'Cut-and-order timeline cards from 1939 to VE Day, with a written follow-up.',                     type: 'worksheet',   subject: 'History',     year_group: 'Year 8',  exam_board: 'None',    created_by: 't_helen', visibility: 'centre',    size: 158 * KB, created_at: '2026-02-17', updated_at: '2026-04-06' },
  { id: 'r_ww2_sources',  title: 'WWII Source Analysis Pack',                  description: 'Six contemporary sources with provenance boxes and utility questions.',                          type: 'notes',       subject: 'History',     year_group: 'Year 8',  exam_board: 'None',    created_by: 't_helen', visibility: 'centre',    size: 2.1 * MB, created_at: '2026-02-17', updated_at: '2026-02-17' },
  { id: 'r_ww1_slides',   title: 'Causes of WWI — Slides',                     description: 'MAIN causes with the alliance map animated, ending on a card-sort task.',                        type: 'slides',      subject: 'History',     year_group: 'Year 9',  exam_board: 'None',    created_by: 't_helen', visibility: 'centre',    size: 3.9 * MB, created_at: '2025-10-03', updated_at: '2026-01-16' },
  { id: 'r_medicine_ws',  title: 'Medicine Through Time — Worksheet',          description: 'Change and continuity across four periods, structured for the 16-mark question.',                 type: 'worksheet',   subject: 'History',     year_group: 'Year 10', exam_board: 'Edexcel', created_by: 't_helen', visibility: 'centre',    size: 176 * KB, created_at: '2025-11-20', updated_at: '2026-03-10' },
  { id: 'r_coldwar_rev',  title: 'The Cold War — Revision Pack',               description: 'Berlin, Cuba and Czechoslovakia as three crisis case studies, plus a chronology.',               type: 'revision',    subject: 'History',     year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't_helen', visibility: 'centre',    size: 1.7 * MB, created_at: '2026-01-23', updated_at: '2026-04-11' },
  { id: 'r_source_video', title: 'Source Skills — Video Walkthrough',          description: 'How to answer the utility question, worked live on a past source.',                              type: 'video',       subject: 'History',     year_group: 'Year 9',  exam_board: 'None',    created_by: 't_helen', visibility: 'centre',    size: 54 * MB,  created_at: '2026-01-16', updated_at: '2026-01-16' },
  { id: 'r_hist_mock_pp', title: 'History Mock — Paper 2',                     description: 'Internal mock paper for the Year 11 cohort, unused questions only.',                             type: 'past_paper',  subject: 'History',     year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't_helen', visibility: 'on_request', size: 940 * KB, created_at: '2026-03-05', updated_at: '2026-03-05' },

  // ══ Aisha Begum (t_aisha) — Geography ══════════════════════════════════════
  { id: 'r_map_skills',   title: 'OS Map Skills — Worksheet',                  description: 'Four- and six-figure grid references, scale, and reading relief from contours.',                 type: 'worksheet',   subject: 'Geography',   year_group: 'Year 8',  exam_board: 'None',    created_by: 't_aisha', visibility: 'centre',    size: 1.3 * MB, created_at: '2025-09-19', updated_at: '2026-01-08' },
  { id: 'r_rivers_ws',    title: 'Rivers & Flooding — Worksheet',              description: 'Long profile, erosion processes and a hydrograph-interpretation section.',                       type: 'worksheet',   subject: 'Geography',   year_group: 'Year 9',  exam_board: 'OCR',     created_by: 't_aisha', visibility: 'centre',    size: 182 * KB, created_at: '2025-11-06', updated_at: '2026-02-20' },
  { id: 'r_tectonics',    title: 'Plate Tectonics — Slides',                   description: 'Plate margins with the Nepal and Iceland case studies built in.',                                type: 'slides',      subject: 'Geography',   year_group: 'Year 9',  exam_board: 'OCR',     created_by: 't_aisha', visibility: 'centre',    size: 4.8 * MB, created_at: '2026-01-15', updated_at: '2026-03-19' },
  { id: 'r_fieldwork',    title: 'River Fieldwork — Data Collection Sheet',    description: 'Printable recording sheet for the Wharfe trip: velocity, width, depth and bedload.',               type: 'other',       subject: 'Geography',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_aisha', visibility: 'centre',    size: 92 * KB,  created_at: '2026-03-23', updated_at: '2026-03-23' },
  { id: 'r_urban_cases',  title: 'Urban Case Studies — Notes',                 description: 'Rio and Bristol side by side, with the facts that actually earn marks highlighted.',              type: 'notes',       subject: 'Geography',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_aisha', visibility: 'centre',    size: 246 * KB, created_at: '2025-12-09', updated_at: '2026-03-27' },
  { id: 'r_climate_rev',  title: 'Climate Change — Revision Pack',             description: 'Causes, evidence, and the mitigation-vs-adaptation distinction with examples.',                  type: 'revision',    subject: 'Geography',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_aisha', visibility: 'centre',    size: 1.5 * MB, created_at: '2026-02-13', updated_at: '2026-04-17' },
  { id: 'r_geog_pp',      title: 'Geography Paper 1 — Past Paper',             description: 'Full paper kept back for the pre-exam walking-talking mock.',                                    type: 'past_paper',  subject: 'Geography',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_aisha', visibility: 'on_request', size: 1.4 * MB, created_at: '2026-03-26', updated_at: '2026-03-26' },

  // ══ Daniel Mehta (t_daniel) — Computer Science ═════════════════════════════
  { id: 'r_python_ws',    title: 'Python Basics — Worksheet',                  description: 'Variables, input/output and casting, with a debugging section at the end.',                      type: 'worksheet',   subject: 'Computer Science', year_group: 'Year 9', exam_board: 'OCR',  created_by: 't_daniel', visibility: 'centre',   size: 142 * KB, created_at: '2025-09-24', updated_at: '2026-01-20' },
  { id: 'r_python_slides', title: 'Python — Loops & Conditionals Slides',      description: 'Live-coded examples with the output shown alongside, plus three parsons problems.',               type: 'slides',      subject: 'Computer Science', year_group: 'Year 9', exam_board: 'OCR',  created_by: 't_daniel', visibility: 'centre',   size: 2.7 * MB, created_at: '2025-10-08', updated_at: '2026-02-26' },
  { id: 'r_binary_ws',    title: 'Binary & Hexadecimal — Worksheet',           description: 'Conversion practice both ways, binary addition, and overflow.',                                  type: 'worksheet',   subject: 'Computer Science', year_group: 'Year 9', exam_board: 'OCR',  created_by: 't_daniel', visibility: 'centre',   size: 118 * KB, created_at: '2025-11-13', updated_at: '2025-11-13' },
  { id: 'r_algorithms',   title: 'Searching & Sorting Algorithms — Notes',     description: 'Linear/binary search and bubble/merge/insertion sort, each traced step by step.',                 type: 'notes',       subject: 'Computer Science', year_group: 'Year 10', exam_board: 'OCR', created_by: 't_daniel', visibility: 'centre',   size: 264 * KB, created_at: '2026-01-06', updated_at: '2026-03-23' },
  { id: 'r_networks_rev', title: 'Networks & Protocols — Revision Pack',       description: 'Topologies, the TCP/IP stack and the protocols table students must know cold.',                  type: 'revision',    subject: 'Computer Science', year_group: 'Year 11', exam_board: 'OCR', created_by: 't_daniel', visibility: 'centre',   size: 1.2 * MB, created_at: '2026-02-09', updated_at: '2026-04-12' },
  { id: 'r_nea_guide',    title: 'NEA Programming Project — Guidance',         description: 'Marking criteria decoded, with an exemplar write-up. Restricted while the NEA is live.',          type: 'notes',       subject: 'Computer Science', year_group: 'Year 11', exam_board: 'OCR', created_by: 't_daniel', visibility: 'on_request', size: 480 * KB, created_at: '2026-03-02', updated_at: '2026-04-18' },
  { id: 'r_cs_mock_ms',   title: 'Computer Science Mock — Mark Scheme',        description: 'Mark scheme for the February paper, with common wrong answers annotated.',                        type: 'mark_scheme', subject: 'Computer Science', year_group: 'Year 11', exam_board: 'OCR', created_by: 't_daniel', visibility: 'on_request', size: 208 * KB, created_at: '2026-02-27', updated_at: '2026-02-27' },
  { id: 'r_replit_link',  title: 'Replit — Class Coding Workspace',            description: 'Shared workspace where students write and run Python in the browser. No install needed.',        type: 'link',        subject: 'Computer Science', year_group: 'Year 9',  exam_board: 'None', created_by: 't_daniel', visibility: 'centre',  size: 0,        created_at: '2025-09-24', updated_at: '2026-01-05', url: 'https://replit.com/~' },

  // ══ Rebecca Stone (t_rebecca) — Economics ══════════════════════════════════
  { id: 'r_supply_ws',    title: 'Supply & Demand — Worksheet',                description: 'Shifts vs movements along the curve, then the four determinants of each.',                       type: 'worksheet',   subject: 'Economics',   year_group: 'Year 12', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'centre',  size: 168 * KB, created_at: '2025-10-15', updated_at: '2026-02-23' },
  { id: 'r_supply_slides', title: 'Supply & Demand — Slides',                  description: 'Every diagram built one line at a time, with the labelling conventions enforced.',               type: 'slides',      subject: 'Economics',   year_group: 'Year 12', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'centre',  size: 2.3 * MB, created_at: '2025-10-15', updated_at: '2025-10-15' },
  { id: 'r_market_fail',  title: 'Market Failure — Notes',                     description: 'Externalities, public goods and information gaps, each with a UK example.',                      type: 'notes',       subject: 'Economics',   year_group: 'Year 12', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'centre',  size: 228 * KB, created_at: '2026-01-12', updated_at: '2026-03-31' },
  { id: 'r_macro_rev',    title: 'Macroeconomic Objectives — Revision Pack',   description: 'The four objectives, the conflicts between them, and the policy toolkit.',                        type: 'revision',    subject: 'Economics',   year_group: 'Year 13', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'centre',  size: 1.6 * MB, created_at: '2026-02-02', updated_at: '2026-04-08' },
  { id: 'r_econ_essay_ms', title: '25-Mark Essay — Mark Scheme & Exemplars',   description: 'Levelled mark scheme with two A-grade and one C-grade exemplar, annotated.',                      type: 'mark_scheme', subject: 'Economics',   year_group: 'Year 13', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'on_request', size: 320 * KB, created_at: '2026-02-02', updated_at: '2026-02-02' },
  { id: 'r_business_case', title: 'Business Case Study Pack',                  description: 'Six real company case studies with data. Licensed copy — ask before reusing.',                   type: 'other',       subject: 'Economics',   year_group: 'Year 12', exam_board: 'Edexcel', created_by: 't_rebecca', visibility: 'on_request', size: 2.4 * MB, created_at: '2025-11-27', updated_at: '2025-11-27' },

  // ══ Claire Dubois (t_claire) — French / Spanish ════════════════════════════
  { id: 'r_fr_vocab',     title: 'French Core Vocabulary — Booklet',           description: 'The 500 highest-frequency words by theme, with a self-test column.',                             type: 'revision',    subject: 'French',      year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_claire', visibility: 'centre',   size: 860 * KB, created_at: '2025-09-12', updated_at: '2026-02-05' },
  { id: 'r_fr_grammar',   title: 'Perfect Tense — Grammar Worksheet',          description: 'Avoir and être verbs, agreement rules, then a translation section.',                             type: 'worksheet',   subject: 'French',      year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_claire', visibility: 'centre',   size: 136 * KB, created_at: '2025-11-04', updated_at: '2026-01-28' },
  { id: 'r_fr_listening', title: 'Listening Practice — Audio Pack',            description: 'Twelve graded clips with transcripts, from foundation to higher.',                               type: 'video',       subject: 'French',      year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_claire', visibility: 'centre',   size: 96 * MB,  created_at: '2026-01-28', updated_at: '2026-01-28' },
  { id: 'r_fr_speaking',  title: 'Speaking Exam — Role Play Cards',            description: 'Printable role-play and photo-card sets matching the exam format.',                              type: 'other',       subject: 'French',      year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_claire', visibility: 'centre',   size: 420 * KB, created_at: '2026-02-18', updated_at: '2026-04-01' },
  { id: 'r_fr_mock_ms',   title: 'French Mock — Mark Scheme',                  description: 'Writing and speaking mark schemes with the band descriptors in plain English.',                  type: 'mark_scheme', subject: 'French',      year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_claire', visibility: 'on_request', size: 184 * KB, created_at: '2026-03-13', updated_at: '2026-03-13' },
  { id: 'r_sp_vocab',     title: 'Spanish Core Vocabulary — Booklet',          description: 'Same structure as the French booklet, rebuilt for the Spanish specification.',                   type: 'revision',    subject: 'Spanish',     year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't_claire', visibility: 'centre',   size: 840 * KB, created_at: '2025-09-12', updated_at: '2026-02-05' },

  // ══ Omar Reyes (t_omar) — Psychology · LEFT THE CENTRE ═════════════════════
  // Owner is inactive, so requests on these route to the admin (derived, §5.4).
  // Ownership never transfers — created_by still says Omar.
  { id: 'r_psych_memory', title: 'Memory Models — Notes',                      description: 'Multi-store and working-memory models compared, with the supporting studies.',                   type: 'notes',       subject: 'Psychology',  year_group: 'Year 12', exam_board: 'AQA',     created_by: 't_omar', visibility: 'centre',    size: 254 * KB, created_at: '2025-10-06', updated_at: '2025-12-11' },
  { id: 'r_psych_methods', title: 'Research Methods — Workbook',               description: 'Experimental design, sampling and the stats tests, with practice questions.',                    type: 'worksheet',   subject: 'Psychology',  year_group: 'Year 12', exam_board: 'AQA',     created_by: 't_omar', visibility: 'on_request', size: 1.1 * MB, created_at: '2025-10-06', updated_at: '2026-01-31' },
  { id: 'r_psych_social', title: 'Social Influence — Revision Pack',           description: 'Conformity, obedience and minority influence, each with evaluation points.',                    type: 'revision',    subject: 'Psychology',  year_group: 'Year 12', exam_board: 'AQA',     created_by: 't_omar', visibility: 'on_request', size: 1.3 * MB, created_at: '2025-11-19', updated_at: '2026-01-31' },
];

// ── Shares (a direct grant of read access) ──────────────────────────────────────
// Shares only ever matter on restricted files — a centre-wide file needs no grant.
// Approving a request creates one of these at runtime; the rows below are the
// grants that already existed when the demo starts, including two made by the
// admin on behalf of a teacher who has left.
const RES_SHARES_SEED = [
  { resource_id: 'r_poetry_ms',    staff_id: 't1',       granted_by: 't_grace',  granted_at: '2026-04-15' },
  { resource_id: 'r_waves_pp',     staff_id: 't1',       granted_by: 't_david',  granted_at: '2026-03-04' },
  { resource_id: 'r_chem_mock',    staff_id: 't1',       granted_by: 't_priya',  granted_at: '2026-03-06' },
  { resource_id: 'r_bio_pp',       staff_id: 't1',       granted_by: 't_james',  granted_at: '2026-02-02' },
  { resource_id: 'r_mock_y10',     staff_id: 't1',       granted_by: 't_tom',    granted_at: '2026-04-21' },
  { resource_id: 'r_mock_y10_ms',  staff_id: 't1',       granted_by: 't_tom',    granted_at: '2026-04-21' },
  { resource_id: 'r_psych_methods', staff_id: 't1',      granted_by: 'admin',    granted_at: '2026-04-09' },
  { resource_id: 'r_titration_ms', staff_id: 't_david',  granted_by: 't_priya',  granted_at: '2026-04-02' },
  { resource_id: 'r_de_pp',        staff_id: 't_tom',    granted_by: 't1',       granted_at: '2026-04-13' },
  { resource_id: 'r_nov_paper1_ms', staff_id: 't_tom',   granted_by: 't1',       granted_at: '2026-01-09' },
  { resource_id: 'r_lit_mock_ms',  staff_id: 't_grace',  granted_by: 't_marcus', granted_at: '2026-03-01' },
  { resource_id: 'r_lang_p1_pp',   staff_id: 't_marcus', granted_by: 't_grace',  granted_at: '2026-02-23' },
  { resource_id: 'r_econ_essay_ms', staff_id: 't_marcus', granted_by: 't_rebecca', granted_at: '2026-02-10' },
  { resource_id: 'r_fields_pp',    staff_id: 't1',       granted_by: 't_david',  granted_at: '2026-02-19' },
  { resource_id: 'r_nea_guide',    staff_id: 't_aisha',  granted_by: 't_daniel', granted_at: '2026-03-20' },
  { resource_id: 'r_psych_social', staff_id: 't_marcus', granted_by: 'admin',    granted_at: '2026-02-14' },
];

// ── Access requests ─────────────────────────────────────────────────────────────
// Pending ones drive the bell, the Requests view and the admin Override. Decided
// ones are history: they show under "Your requests" for whoever asked, and each
// approved one has a matching share above (that is what approval does).
//
//  req_calc  — David asks to open the principal's on-request calculus notes. Routes
//              to her (active creator), so it lands in her Requests view.
//  req_titr  — Grace asks Priya for the titration mark scheme.
//  req_psych — Marcus asks for a file owned by Omar, who has LEFT. Routing falls to
//              the admin, so this one appears in the admin's Requests view.
const RES_REQUESTS_SEED = [
  // Pending — routed to the file's active owner
  { id: 'req_calc',   resource_id: 'r_calc_notes',    requested_by: 't_david',   note: 'Covering your Year 12 group on Friday — could I use these for the lesson?', status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_titr',   resource_id: 'r_titration_ms',  requested_by: 't_grace',   note: 'Marking a shared Year 11 set this week.',                                  status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_denov',  resource_id: 'r_nov_paper1_ms', requested_by: 't_marcus',  note: 'Running the maths clinic on Thursday — need the answers to check work.',   status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_depp',   resource_id: 'r_de_pp',         requested_by: 't_david',   note: 'Would like these for the Year 13 physics/maths overlap session.',           status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_lit',    resource_id: 'r_alevel_lit',    requested_by: 't_grace',   note: 'Starting the A-Level group in September — can I read ahead?',               status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_geog',   resource_id: 'r_geog_pp',       requested_by: 't_helen',   note: 'Invigilating the mock; want to see the paper beforehand.',                  status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_csms',   resource_id: 'r_cs_mock_ms',    requested_by: 't_tom',     note: 'Marking the CS mock with Daniel this week.',                                status: 'pending', decided_by: null, decided_at: null },
  // Pending — owner has left, so this one routes to the admin
  { id: 'req_psych',  resource_id: 'r_psych_social',  requested_by: 't_daniel',  note: 'Picking up the psychology group next term.',                                status: 'pending', decided_by: null, decided_at: null },
  // Decided — history behind the shares above
  { id: 'req_waves',  resource_id: 'r_waves_pp',      requested_by: 't1',        note: 'Using these for the joint revision session.',                               status: 'approved', decided_by: 't_david',  decided_at: '2026-03-04' },
  { id: 'req_chem',   resource_id: 'r_chem_mock',     requested_by: 't1',        note: 'Need to see the maths content in the chemistry mock.',                      status: 'approved', decided_by: 't_priya',  decided_at: '2026-03-06' },
  { id: 'req_mock10', resource_id: 'r_mock_y10',      requested_by: 't1',        note: 'Moderating the Year 10 mock with you.',                                     status: 'approved', decided_by: 't_tom',    decided_at: '2026-04-21' },
  { id: 'req_meth',   resource_id: 'r_psych_methods', requested_by: 't1',        note: 'Stats section overlaps with GCSE maths — worth borrowing.',                  status: 'approved', decided_by: 'admin',    decided_at: '2026-04-09' },
  { id: 'req_bus',    resource_id: 'r_business_case', requested_by: 't1',        note: 'Wondered if the data sets would work for GCSE statistics.',                  status: 'declined', decided_by: 't_rebecca', decided_at: '2026-01-15' },
  { id: 'req_lit_ms', resource_id: 'r_lit_mock_ms',   requested_by: 't_grace',   note: 'Second-marking the mock.',                                                  status: 'approved', decided_by: 't_marcus', decided_at: '2026-03-01' },
];

// ── Attachment rows (pointers — never copies) ───────────────────────────────────
// Two context types, both pointing at things that already exist elsewhere in the
// app, so "Used in N places" and the where-used drawer resolve to real names:
//   • lesson_plan — the planner's `${group}__${date}` keys (mocks/lessonPlanner.mock)
//   • homework    — assignment ids from the homework store (Homework.jsx seeds)
//
// Per-attachment student visibility (D9) lives on the LINK, not the file:
//   • lesson-plan attachments are staff-only, always (student_visible: false)
//   • homework worksheets/notes/slides go out with the assignment
//   • homework mark schemes and past papers stay OFF, or are timed to release
//     after the due date via `visible_from`
//
// Files attached in several places (r_quad_ws, r_simul_slides, r_forces_ws…) are
// what makes the default "most used" sort meaningful; plenty of files are attached
// nowhere at all, which is also true of a real library.
const RES_LINKS_SEED = [
  // ── Lesson plan: Year 10 – Group A, 25 Apr — Simultaneous Equations ──
  { id: 'lnk1',  resource_id: 'r_quad_ws',       context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk2',  resource_id: 'r_quad_ms',       context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk3',  resource_id: 'r_simul_slides',  context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk4',  resource_id: 'r_simul_ws',      context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk5',  resource_id: 'r_simul_ms',      context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk6',  resource_id: 'r_maths_starters', context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },

  // ── Lesson plan: Year 10 – Group A, 18 Apr — Probability Trees ──
  { id: 'lnk7',  resource_id: 'r_prob_trees',    context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-17' },
  { id: 'lnk8',  resource_id: 'r_prob_slides',   context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-17' },
  { id: 'lnk9',  resource_id: 'r_quad_ws',       context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-17' },

  // ── Lesson plan: Year 11 – Group B, 25 Apr — Sine & Cosine Rules ──
  { id: 'lnk10', resource_id: 'r_trig_ws',       context_type: 'lesson_plan', context_id: 'Year 11 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk11', resource_id: 'r_trig_ms',       context_type: 'lesson_plan', context_id: 'Year 11 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk12', resource_id: 'r_trig_slides',   context_type: 'lesson_plan', context_id: 'Year 11 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk13', resource_id: 'r_formula_sheet', context_type: 'lesson_plan', context_id: 'Year 11 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },

  // ── Lesson plan: Year 12 – Group A, 25 Apr — Differentiation from First Principles ──
  { id: 'lnk14', resource_id: 'r_calc_notes',    context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-22' },
  { id: 'lnk15', resource_id: 'r_calc_slides',   context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-22' },
  { id: 'lnk16', resource_id: 'r_calc_ws',       context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-22' },
  { id: 'lnk17', resource_id: 'r_desmos_link',   context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-22' },

  // ── Lesson plan: Year 12 – Group A, 18 Apr — Integration ──
  { id: 'lnk18', resource_id: 'r_integ_notes',   context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-16' },
  { id: 'lnk19', resource_id: 'r_integ_ws',      context_type: 'lesson_plan', context_id: 'Year 12 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-16' },

  // ── Lesson plan: Year 9 – Group C, 25 Apr — Surds & Indices ──
  { id: 'lnk20', resource_id: 'r_surds_ws',      context_type: 'lesson_plan', context_id: 'Year 9 – Group C__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk21', resource_id: 'r_surds_scaf',    context_type: 'lesson_plan', context_id: 'Year 9 – Group C__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk22', resource_id: 'r_surds_ms',      context_type: 'lesson_plan', context_id: 'Year 9 – Group C__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk23', resource_id: 'r_indices_quiz',  context_type: 'lesson_plan', context_id: 'Year 9 – Group C__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },

  // ── Lesson plan: Year 13 – Group A, 24 Apr — Differential Equations ──
  { id: 'lnk24', resource_id: 'r_de_notes',      context_type: 'lesson_plan', context_id: 'Year 13 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk25', resource_id: 'r_de_pp',         context_type: 'lesson_plan', context_id: 'Year 13 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },

  // ── Lesson plan: Year 10 – Group B, 25 Apr — Forces (David Park) ──
  { id: 'lnk26', resource_id: 'r_forces_ws',     context_type: 'lesson_plan', context_id: 'Year 10 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't_david', attached_at: '2026-04-24' },
  { id: 'lnk27', resource_id: 'r_forces_slides', context_type: 'lesson_plan', context_id: 'Year 10 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't_david', attached_at: '2026-04-24' },
  { id: 'lnk28', resource_id: 'r_forces_ms',     context_type: 'lesson_plan', context_id: 'Year 10 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't_david', attached_at: '2026-04-24' },

  // ── Lesson plan: Year 11 – Group A, 24 Apr — Titration (Priya Nair) ──
  { id: 'lnk29', resource_id: 'r_titration_ws',  context_type: 'lesson_plan', context_id: 'Year 11 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't_priya', attached_at: '2026-04-23' },
  { id: 'lnk30', resource_id: 'r_titration_ms',  context_type: 'lesson_plan', context_id: 'Year 11 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't_priya', attached_at: '2026-04-23' },
  { id: 'lnk31', resource_id: 'r_titr_video',    context_type: 'lesson_plan', context_id: 'Year 11 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't_priya', attached_at: '2026-04-23' },
  { id: 'lnk32', resource_id: 'r_chem_data',     context_type: 'lesson_plan', context_id: 'Year 11 – Group A__2026-04-24', student_visible: false, visible_from: null, attached_by: 't_priya', attached_at: '2026-04-23' },

  // ── Homework: Simultaneous Equations (Year 10 – Group A) ──
  { id: 'lnk33', resource_id: 'r_simul_ws',      context_type: 'homework', context_id: 'hw_simul',     student_visible: true,  visible_from: '2026-04-25', attached_by: 't1', attached_at: '2026-04-25' },
  { id: 'lnk34', resource_id: 'r_simul_slides',  context_type: 'homework', context_id: 'hw_simul',     student_visible: true,  visible_from: '2026-04-25', attached_by: 't1', attached_at: '2026-04-25' },
  { id: 'lnk35', resource_id: 'r_simul_ms',      context_type: 'homework', context_id: 'hw_simul',     student_visible: false, visible_from: null,         attached_by: 't1', attached_at: '2026-04-25' },

  // ── Homework: Quadratics (practice + chapter 5) ──
  { id: 'lnk36', resource_id: 'r_quad_ws',       context_type: 'homework', context_id: 'hw_quad_prac', student_visible: true,  visible_from: '2026-04-20', attached_by: 't1', attached_at: '2026-04-20' },
  { id: 'lnk37', resource_id: 'r_quad_ms',       context_type: 'homework', context_id: 'hw_quad_prac', student_visible: true,  visible_from: '2026-05-04', attached_by: 't1', attached_at: '2026-04-20' },
  { id: 'lnk38', resource_id: 'r_quad_ws',       context_type: 'homework', context_id: 'hw_quad_ch5',  student_visible: true,  visible_from: '2026-04-12', attached_by: 't1', attached_at: '2026-04-12' },
  { id: 'lnk39', resource_id: 'r_formula_sheet', context_type: 'homework', context_id: 'hw_quad_ch5',  student_visible: true,  visible_from: '2026-04-12', attached_by: 't1', attached_at: '2026-04-12' },

  // ── Homework: Surds, Trig, Probability (GCSE maths) ──
  { id: 'lnk40', resource_id: 'r_surds_ws',      context_type: 'homework', context_id: 'hw_surds',     student_visible: true,  visible_from: '2026-04-26', attached_by: 't1', attached_at: '2026-04-26' },
  { id: 'lnk41', resource_id: 'r_surds_scaf',    context_type: 'homework', context_id: 'hw_surds',     student_visible: true,  visible_from: '2026-04-26', attached_by: 't1', attached_at: '2026-04-26' },
  { id: 'lnk42', resource_id: 'r_surds_ms',      context_type: 'homework', context_id: 'hw_surds',     student_visible: false, visible_from: null,         attached_by: 't1', attached_at: '2026-04-26' },
  { id: 'lnk43', resource_id: 'r_trig_ws',       context_type: 'homework', context_id: 'hw_trig',      student_visible: true,  visible_from: '2026-04-25', attached_by: 't1', attached_at: '2026-04-25' },
  { id: 'lnk44', resource_id: 'r_trig_slides',   context_type: 'homework', context_id: 'hw_trig',      student_visible: true,  visible_from: '2026-04-25', attached_by: 't1', attached_at: '2026-04-25' },
  { id: 'lnk45', resource_id: 'r_trig_ms',       context_type: 'homework', context_id: 'hw_trig',      student_visible: false, visible_from: null,         attached_by: 't1', attached_at: '2026-04-25' },
  { id: 'lnk46', resource_id: 'r_prob_trees',    context_type: 'homework', context_id: 'hw_prob',      student_visible: true,  visible_from: '2026-04-18', attached_by: 't1', attached_at: '2026-04-18' },
  { id: 'lnk47', resource_id: 'r_prob_slides',   context_type: 'homework', context_id: 'hw_prob',      student_visible: true,  visible_from: '2026-04-18', attached_by: 't1', attached_at: '2026-04-18' },

  // ── Homework: A-Level maths ──
  { id: 'lnk48', resource_id: 'r_calc_ws',       context_type: 'homework', context_id: 'hw_diff',      student_visible: true,  visible_from: '2026-04-23', attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk49', resource_id: 'r_calc_slides',   context_type: 'homework', context_id: 'hw_diff',      student_visible: true,  visible_from: '2026-04-23', attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk50', resource_id: 'r_desmos_link',   context_type: 'homework', context_id: 'hw_diff',      student_visible: true,  visible_from: '2026-04-23', attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk51', resource_id: 'r_integ_ws',      context_type: 'homework', context_id: 'hw_integ_al',  student_visible: true,  visible_from: '2026-04-24', attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk52', resource_id: 'r_integ_notes',   context_type: 'homework', context_id: 'hw_integ_al',  student_visible: true,  visible_from: '2026-04-24', attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk53', resource_id: 'r_vectors_ws',    context_type: 'homework', context_id: 'hw_vectors_fm', student_visible: true, visible_from: '2026-04-12', attached_by: 't1', attached_at: '2026-04-12' },
  { id: 'lnk54', resource_id: 'r_vectors_notes', context_type: 'homework', context_id: 'hw_vectors_fm', student_visible: true, visible_from: '2026-04-12', attached_by: 't1', attached_at: '2026-04-12' },

  // ── Homework: Physics ──
  { id: 'lnk55', resource_id: 'r_forces_ws',     context_type: 'homework', context_id: 'hw_newton',    student_visible: true,  visible_from: '2026-04-21', attached_by: 't_david', attached_at: '2026-04-21' },
  { id: 'lnk56', resource_id: 'r_forces_slides', context_type: 'homework', context_id: 'hw_newton',    student_visible: true,  visible_from: '2026-04-21', attached_by: 't_david', attached_at: '2026-04-21' },
  { id: 'lnk57', resource_id: 'r_phys_eq',       context_type: 'homework', context_id: 'hw_newton',    student_visible: true,  visible_from: '2026-04-21', attached_by: 't_david', attached_at: '2026-04-21' },
  { id: 'lnk58', resource_id: 'r_forces_ms',     context_type: 'homework', context_id: 'hw_newton',    student_visible: true,  visible_from: '2026-05-02', attached_by: 't_david', attached_at: '2026-04-21' },

  // ── Homework: Chemistry ──
  { id: 'lnk59', resource_id: 'r_organic_ws',    context_type: 'homework', context_id: 'hw_chem_fg',   student_visible: true,  visible_from: '2026-04-14', attached_by: 't_priya', attached_at: '2026-04-14' },
  { id: 'lnk60', resource_id: 'r_organic_rev',   context_type: 'homework', context_id: 'hw_chem_fg',   student_visible: true,  visible_from: '2026-04-14', attached_by: 't_priya', attached_at: '2026-04-14' },
  { id: 'lnk61', resource_id: 'r_chem_data',     context_type: 'homework', context_id: 'hw_chem_fg',   student_visible: true,  visible_from: '2026-04-14', attached_by: 't_priya', attached_at: '2026-04-14' },
  { id: 'lnk62', resource_id: 'r_organic_ms',    context_type: 'homework', context_id: 'hw_chem_fg',   student_visible: false, visible_from: null,         attached_by: 't_priya', attached_at: '2026-04-14' },

  // ── Homework: Biology ──
  { id: 'lnk63', resource_id: 'r_mitosis_ws',    context_type: 'homework', context_id: 'hw_mitosis',   student_visible: true,  visible_from: '2026-04-13', attached_by: 't_james', attached_at: '2026-04-13' },
  { id: 'lnk64', resource_id: 'r_mitosis_ms',    context_type: 'homework', context_id: 'hw_mitosis',   student_visible: true,  visible_from: '2026-04-27', attached_by: 't_james', attached_at: '2026-04-13' },
  { id: 'lnk65', resource_id: 'r_photo_ws',      context_type: 'homework', context_id: 'hw_photo',     student_visible: true,  visible_from: '2026-04-09', attached_by: 't_james', attached_at: '2026-04-09' },
  { id: 'lnk66', resource_id: 'r_photo_slides',  context_type: 'homework', context_id: 'hw_photo',     student_visible: true,  visible_from: '2026-04-09', attached_by: 't_james', attached_at: '2026-04-09' },
  { id: 'lnk67', resource_id: 'r_micro_video',   context_type: 'homework', context_id: 'hw_photo',     student_visible: true,  visible_from: '2026-04-09', attached_by: 't_james', attached_at: '2026-04-09' },

  // ── Homework: English ──
  { id: 'lnk68', resource_id: 'r_macbeth_slides', context_type: 'homework', context_id: 'hw_macbeth3', student_visible: true,  visible_from: '2026-04-11', attached_by: 't_grace', attached_at: '2026-04-11' },
  { id: 'lnk69', resource_id: 'r_macbeth_quotes', context_type: 'homework', context_id: 'hw_macbeth3', student_visible: true,  visible_from: '2026-04-11', attached_by: 't_grace', attached_at: '2026-04-11' },
  { id: 'lnk70', resource_id: 'r_lit_frame',     context_type: 'homework', context_id: 'hw_macbeth3',  student_visible: true,  visible_from: '2026-04-11', attached_by: 't_grace', attached_at: '2026-04-11' },
  { id: 'lnk71', resource_id: 'r_macbeth',       context_type: 'homework', context_id: 'hw_macbeth2',  student_visible: true,  visible_from: '2026-04-03', attached_by: 't_grace', attached_at: '2026-04-03' },
  { id: 'lnk72', resource_id: 'r_macbeth_quotes', context_type: 'homework', context_id: 'hw_macbeth2', student_visible: true,  visible_from: '2026-04-03', attached_by: 't_grace', attached_at: '2026-04-03' },

  // ── Homework: History & Economics ──
  { id: 'lnk73', resource_id: 'r_ww2_timeline',  context_type: 'homework', context_id: 'hw_ww2',       student_visible: true,  visible_from: '2026-04-06', attached_by: 't_helen', attached_at: '2026-04-06' },
  { id: 'lnk74', resource_id: 'r_ww2_sources',   context_type: 'homework', context_id: 'hw_ww2',       student_visible: true,  visible_from: '2026-04-06', attached_by: 't_helen', attached_at: '2026-04-06' },
  { id: 'lnk75', resource_id: 'r_supply_ws',     context_type: 'homework', context_id: 'hw_supply',    student_visible: true,  visible_from: '2026-04-15', attached_by: 't_rebecca', attached_at: '2026-04-15' },
  { id: 'lnk76', resource_id: 'r_supply_slides', context_type: 'homework', context_id: 'hw_supply',    student_visible: true,  visible_from: '2026-04-15', attached_by: 't_rebecca', attached_at: '2026-04-15' },
  { id: 'lnk77', resource_id: 'r_market_fail',   context_type: 'homework', context_id: 'hw_supply',    student_visible: true,  visible_from: '2026-04-15', attached_by: 't_rebecca', attached_at: '2026-04-15' },
];

// ── Usage events (append-only attach history) ───────────────────────────────────
// Every attach writes one of these at runtime. Seeding them gives the "Recently
// used" sort real signal on first load — including for files that were attached to
// something and later detached, which is the whole point of keeping this separate
// from `links` (a link dies on detach; the event doesn't).
const resUse = (n, resource_id, user, context_type, context_id, topic, at) =>
  ({ id: `use_seed_${n}`, resource_id, user, centre: 'bm', context_type, context_id, topic, at });

const RES_USAGE_SEED = [
  // Mirrors of the live links above — the attaches that produced them
  resUse(1,  'r_simul_ws',      't1',       'lesson_plan', 'Year 10 – Group A__2026-04-25', 'Algebra · Simultaneous equations',        '2026-04-24T17:42:00.000Z'),
  resUse(2,  'r_simul_slides',  't1',       'lesson_plan', 'Year 10 – Group A__2026-04-25', 'Algebra · Simultaneous equations',        '2026-04-24T17:41:00.000Z'),
  resUse(3,  'r_quad_ws',       't1',       'lesson_plan', 'Year 10 – Group A__2026-04-25', 'Algebra · Simultaneous equations',        '2026-04-24T17:40:00.000Z'),
  resUse(4,  'r_surds_ws',      't1',       'lesson_plan', 'Year 9 – Group C__2026-04-25',  'Number · Surds and indices',              '2026-04-24T08:30:00.000Z'),
  resUse(5,  'r_surds_scaf',    't1',       'lesson_plan', 'Year 9 – Group C__2026-04-25',  'Number · Surds and indices',              '2026-04-24T08:29:00.000Z'),
  resUse(6,  'r_forces_ws',     't_david',  'lesson_plan', 'Year 10 – Group B__2026-04-25', 'Physics · Forces',                        '2026-04-24T09:12:00.000Z'),
  resUse(7,  'r_forces_slides', 't_david',  'lesson_plan', 'Year 10 – Group B__2026-04-25', 'Physics · Forces',                        '2026-04-24T09:11:00.000Z'),
  resUse(8,  'r_trig_ws',       't1',       'lesson_plan', 'Year 11 – Group B__2026-04-25', 'Trigonometry · Non-right-angled triangles', '2026-04-23T20:15:00.000Z'),
  resUse(9,  'r_trig_slides',   't1',       'lesson_plan', 'Year 11 – Group B__2026-04-25', 'Trigonometry · Non-right-angled triangles', '2026-04-23T20:14:00.000Z'),
  resUse(10, 'r_de_notes',      't1',       'lesson_plan', 'Year 13 – Group A__2026-04-24', 'Calculus · First-order differential equations', '2026-04-23T21:48:00.000Z'),
  resUse(11, 'r_titration_ws',  't_priya',  'lesson_plan', 'Year 11 – Group A__2026-04-24', 'Chemistry · Quantitative chemistry',      '2026-04-23T16:40:00.000Z'),
  resUse(12, 'r_titr_video',    't_priya',  'lesson_plan', 'Year 11 – Group A__2026-04-24', 'Chemistry · Quantitative chemistry',      '2026-04-23T16:39:00.000Z'),
  resUse(13, 'r_calc_notes',    't1',       'lesson_plan', 'Year 12 – Group A__2026-04-25', 'Calculus · Differentiation',              '2026-04-22T19:03:00.000Z'),
  resUse(14, 'r_calc_slides',   't1',       'lesson_plan', 'Year 12 – Group A__2026-04-25', 'Calculus · Differentiation',              '2026-04-22T19:02:00.000Z'),
  resUse(15, 'r_desmos_link',   't1',       'lesson_plan', 'Year 12 – Group A__2026-04-25', 'Calculus · Differentiation',              '2026-04-22T19:01:00.000Z'),
  resUse(16, 'r_prob_trees',    't1',       'lesson_plan', 'Year 10 – Group A__2026-04-18', 'Statistics · Probability',                '2026-04-17T18:20:00.000Z'),
  resUse(17, 'r_integ_ws',      't1',       'lesson_plan', 'Year 12 – Group A__2026-04-18', 'Calculus · Integration',                  '2026-04-16T22:10:00.000Z'),
  resUse(18, 'r_organic_ws',    't_priya',  'homework',    'hw_chem_fg',                    'Organic chemistry · Functional groups',   '2026-04-14T11:05:00.000Z'),
  resUse(19, 'r_mitosis_ws',    't_james',  'homework',    'hw_mitosis',                    'Cells · Mitosis',                         '2026-04-13T15:22:00.000Z'),
  resUse(20, 'r_macbeth_slides', 't_grace', 'homework',    'hw_macbeth3',                   'Macbeth · Act 3',                         '2026-04-11T09:48:00.000Z'),
  resUse(21, 'r_supply_ws',     't_rebecca', 'homework',   'hw_supply',                     'Microeconomics · Supply and demand',      '2026-04-15T14:02:00.000Z'),
  resUse(22, 'r_ww2_timeline',  't_helen',  'homework',    'hw_ww2',                        'WWII · Key events',                       '2026-04-06T13:30:00.000Z'),
  resUse(23, 'r_photo_ws',      't_james',  'homework',    'hw_photo',                      'Plants · Photosynthesis',                 '2026-04-09T16:14:00.000Z'),

  // Earlier in the year — attached then detached. No link row survives, so these
  // only show up in usage history / the "recently used" ordering.
  resUse(24, 'r_gcse_higher_rev', 't1',     'lesson_plan', 'Year 11 – Group B__2026-03-14', 'Revision · Mixed topics',                 '2026-03-13T19:20:00.000Z'),
  resUse(25, 'r_nov_paper1',    't1',       'lesson_plan', 'Year 11 – Group B__2026-02-07', 'Mock preparation',                        '2026-02-06T20:05:00.000Z'),
  resUse(26, 'r_percent_rev',   't_tom',    'lesson_plan', 'Year 10 – Group C__2026-03-21', 'Number · Percentages',                    '2026-03-20T18:44:00.000Z'),
  resUse(27, 'r_waves_slides',  't_david',  'lesson_plan', 'Year 11 – Group B__2026-03-28', 'Waves',                                   '2026-03-27T17:10:00.000Z'),
  resUse(28, 'r_radio_rev',     't_david',  'lesson_plan', 'Year 11 – Group B__2026-04-11', 'Radioactivity',                           '2026-04-10T17:55:00.000Z'),
  resUse(29, 'r_periodic_rev',  't_priya',  'lesson_plan', 'Year 10 – Group B__2026-04-04', 'Periodic table · Trends',                 '2026-04-03T18:02:00.000Z'),
  resUse(30, 'r_genetics_rev',  't_james',  'lesson_plan', 'Year 11 – Group A__2026-04-11', 'Genetics · Inheritance',                  '2026-04-10T16:36:00.000Z'),
  resUse(31, 'r_coldwar_rev',   't_helen',  'lesson_plan', 'Year 11 – Group C__2026-04-18', 'Cold War · Crises',                       '2026-04-17T15:12:00.000Z'),
  resUse(32, 'r_climate_rev',   't_aisha',  'lesson_plan', 'Year 11 – Group C__2026-04-17', 'Climate change',                          '2026-04-16T19:28:00.000Z'),
  resUse(33, 'r_urban_cases',   't_aisha',  'lesson_plan', 'Year 11 – Group C__2026-03-27', 'Urban issues · Case studies',             '2026-03-26T18:50:00.000Z'),
  resUse(34, 'r_algorithms',    't_daniel', 'lesson_plan', 'Year 10 – Group D__2026-03-23', 'Algorithms · Search and sort',            '2026-03-22T20:31:00.000Z'),
  resUse(35, 'r_networks_rev',  't_daniel', 'lesson_plan', 'Year 11 – Group D__2026-04-12', 'Networks · Protocols',                    '2026-04-11T21:07:00.000Z'),
  resUse(36, 'r_fr_vocab',      't_claire', 'lesson_plan', 'Year 9 – Group B__2026-04-14',  'Vocabulary · Core list',                  '2026-04-13T17:45:00.000Z'),
  resUse(37, 'r_fr_grammar',    't_claire', 'homework',    'hw_fr_perfect',                 'Grammar · Perfect tense',                 '2026-03-31T12:18:00.000Z'),
  resUse(38, 'r_carol_notes',   't_marcus', 'lesson_plan', 'Year 10 – Group E__2026-03-05', 'A Christmas Carol · Staves 1–3',          '2026-03-04T19:33:00.000Z'),
  resUse(39, 'r_lit_frame',     't_marcus', 'lesson_plan', 'Year 11 – Group E__2026-02-06', 'Essay technique',                         '2026-02-05T18:12:00.000Z'),
  resUse(40, 'r_psych_memory',  't_omar',   'lesson_plan', 'Year 12 – Group P__2025-12-11', 'Memory · Models',                         '2025-12-10T17:04:00.000Z'),
];

Object.assign(window, {
  RES_STAFF, RES_VISIBILITY, RES_TYPES, RES_EXAM_BOARDS, RES_YEAR_GROUPS,
  RES_RESOURCES_SEED, RES_SHARES_SEED, RES_REQUESTS_SEED, RES_LINKS_SEED, RES_USAGE_SEED,
});
