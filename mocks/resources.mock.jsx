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
//  it, the pending-request count on the bell — is DERIVED from these four lists at
//  render time. None of it is a stored rollup.
//
//  Store shape (localStorage `klasio.resources.v1`, see Resources.jsx):
//    resources[]        { id, title, description, type, subject, year_group,
//                         exam_board, created_by, visibility, size, created_at, updated_at }
//    resource_shares[]  { resource_id, staff_id, granted_by, granted_at }
//    resource_access_requests[] { id, resource_id, requested_by, note, status,
//                         decided_by, decided_at }
//    resource_links[]   { id, resource_id, context_type('lesson_plan'|'homework'),
//                         context_id, student_visible, visible_from, attached_by, attached_at }
// ══════════════════════════════════════════════════════════════════════════════

// ── Teaching staff (share targets + request routing) ────────────────────────────
// A small, self-contained staff model for the Materials feature — mirrors how
// Communications owns its own COMMS_USERS. `t1` (Sarah Clarke) is the principal and
// the default acting teacher, matching teacherMetrics.getPrincipal(). Request
// routing is derived from these: an active creator approves their own file's
// requests; if they are deactivated it falls to the admin (never a stored owner).
const RES_STAFF = [
  { id: 't1',      name: 'Sarah Clarke',  subject: 'Mathematics', role: 'teacher', principal: true, active: true },
  { id: 't_david', name: 'David Park',    subject: 'Physics',     role: 'teacher', active: true },
  { id: 't_priya', name: 'Priya Nair',    subject: 'Chemistry',   role: 'teacher', active: true },
  { id: 't_grace', name: 'Grace Okonkwo', subject: 'English',     role: 'teacher', active: true },
  { id: 'admin',   name: 'Lisa Chen',     subject: null,          role: 'admin',   active: true },
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
  { id: 'revision',    label: 'Revision pack', icon: 'star',   tone: 'accent',  studentDefault: true  },
  { id: 'video',       label: 'Video',         icon: 'video',  tone: 'danger',  studentDefault: true  },
  { id: 'link',        label: 'Link',          icon: 'link',   tone: 'muted',   studentDefault: true  },
  { id: 'other',       label: 'Other',         icon: 'file',   tone: 'muted',   studentDefault: true  },
];

const RES_EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'Cambridge', 'None'];
const RES_YEAR_GROUPS  = ['Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

const KB = 1024, MB = 1024 * 1024;

// ── Resources (>12, spanning all three visibility values) ───────────────────────
const RES_RESOURCES_SEED = [
  // ── Sarah Clarke (t1 / principal) — Mathematics ──
  { id: 'r_quad_ws',    title: 'Quadratic Equations — Worksheet',        description: 'Factorising, the quadratic formula and completing the square, with an extension set.', type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 184 * KB, created_at: '2026-03-02', updated_at: '2026-04-18' },
  { id: 'r_quad_ms',    title: 'Quadratic Equations — Mark Scheme',      description: 'Full worked solutions and mark allocation for the quadratics worksheet.',            type: 'mark_scheme', subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 96 * KB,  created_at: '2026-03-02', updated_at: '2026-03-02' },
  { id: 'r_simul_slides', title: 'Simultaneous Equations — Slides',      description: 'Elimination and substitution methods, built for a 90-minute lesson.',                  type: 'slides',      subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 2 * MB,   created_at: '2026-04-10', updated_at: '2026-04-22' },
  { id: 'r_trig_ws',    title: 'Sine & Cosine Rules — Worksheet',        description: 'Mixed problems where students choose the rule; exam-style questions at the end.',       type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 11', exam_board: 'Edexcel', created_by: 't1', visibility: 'centre',     size: 198 * KB, created_at: '2026-04-05', updated_at: '2026-04-20' },
  { id: 'r_surds_ws',   title: 'Surds & Indices — Carousel Stations',    description: 'Three-station practice carousel with a scaffolded version for support.',                type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 9',  exam_board: 'AQA',     created_by: 't1', visibility: 'centre',     size: 220 * KB, created_at: '2026-04-12', updated_at: '2026-04-12' },
  { id: 'r_calc_notes', title: 'Differentiation from First Principles — Notes', description: 'Derivation notes with the limit definition; still being polished for a mixed group.', type: 'notes',   subject: 'Mathematics', year_group: 'Year 12', exam_board: 'OCR',     created_by: 't1', visibility: 'on_request', size: 312 * KB, created_at: '2026-04-15', updated_at: '2026-04-21' },
  { id: 'r_prob_draft', title: 'Probability Trees — Draft',              description: 'Half-finished worksheet — not ready to share yet.',                                type: 'worksheet',   subject: 'Mathematics', year_group: 'Year 10', exam_board: 'AQA',     created_by: 't1', visibility: 'private',    size: 74 * KB,  created_at: '2026-04-16', updated_at: '2026-04-16' },

  // ── David Park (t_david) — Physics ──
  { id: 'r_forces_ws',  title: 'Forces & Motion — Worksheet',            description: 'Newton’s laws, weight vs mass, and terminal velocity questions.',                 type: 'worksheet',   subject: 'Physics',     year_group: 'Year 10', exam_board: 'AQA',     created_by: 't_david', visibility: 'centre',     size: 176 * KB, created_at: '2026-03-08', updated_at: '2026-03-19' },
  { id: 'r_waves_pp',   title: 'Waves — Past Paper Pack',                description: 'Five past-paper questions on waves with a marking grid.',                              type: 'past_paper',  subject: 'Physics',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_david', visibility: 'on_request', size: 1.4 * MB, created_at: '2026-02-28', updated_at: '2026-04-02' },
  { id: 'r_phys_mock',  title: 'Year 13 Mock — Answers',                 description: 'Answer booklet for the internal Year 13 physics mock.',                                type: 'mark_scheme', subject: 'Physics',     year_group: 'Year 13', exam_board: 'AQA',     created_by: 't_david', visibility: 'private',    size: 520 * KB, created_at: '2026-04-01', updated_at: '2026-04-01' },

  // ── Priya Nair (t_priya) — Chemistry ──
  { id: 'r_rates_ws',   title: 'Rates of Reaction — Worksheet',          description: 'Collision theory, catalysts and the effect of concentration.',                         type: 'worksheet',   subject: 'Chemistry',   year_group: 'Year 10', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',     size: 168 * KB, created_at: '2026-03-11', updated_at: '2026-03-25' },
  { id: 'r_titration_ms', title: 'Titration Calculations — Mark Scheme', description: 'Step-by-step mark scheme for the titration calculation set.',                          type: 'mark_scheme', subject: 'Chemistry',   year_group: 'Year 11', exam_board: 'OCR',     created_by: 't_priya', visibility: 'on_request', size: 128 * KB, created_at: '2026-03-20', updated_at: '2026-04-08' },
  { id: 'r_organic_rev', title: 'Organic Chemistry — Revision Pack',     description: 'Condensed revision pack for the organic module, exam-ready.',                          type: 'revision',    subject: 'Chemistry',   year_group: 'Year 12', exam_board: 'OCR',     created_by: 't_priya', visibility: 'centre',     size: 890 * KB, created_at: '2026-04-03', updated_at: '2026-04-19' },

  // ── Grace Okonkwo (t_grace) — English ──
  { id: 'r_macbeth',    title: 'Macbeth — Essay Planning',               description: 'Essay-planning grid with model paragraphs for the ambition theme.',                    type: 'notes',       subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'centre',     size: 142 * KB, created_at: '2026-03-30', updated_at: '2026-04-14' },
  { id: 'r_poetry_ms',  title: 'Poetry Anthology — Mark Scheme',         description: 'Marking guidance for the Power & Conflict comparison question.',                       type: 'mark_scheme', subject: 'English',     year_group: 'Year 11', exam_board: 'AQA',     created_by: 't_grace', visibility: 'on_request', size: 156 * KB, created_at: '2026-03-30', updated_at: '2026-03-30' },
];

// ── Pre-existing share (D asks for one) ─────────────────────────────────────────
// Grace shares her on-request Poetry mark scheme with Sarah, so it shows for Sarah
// as "Shared with you" (unlocked) and under her "Shared with me" filter.
const RES_SHARES_SEED = [
  { resource_id: 'r_poetry_ms', staff_id: 't1', granted_by: 't_grace', granted_at: '2026-04-15' },
];

// ── Pending requests ────────────────────────────────────────────────────────────
//  req1 — David asks to open Sarah's on-request calculus notes. Routes to Sarah
//         (active creator), so it lands in her Requests tab + drives her bell, and
//         admin sees an Override on that resource.
//  req2 — Grace asks to open Priya's on-request titration mark scheme. Routes to
//         Priya while she is active; if Priya is deactivated it falls to admin
//         (derived routing — never a stored owner).
const RES_REQUESTS_SEED = [
  { id: 'req_calc', resource_id: 'r_calc_notes',   requested_by: 't_david', note: 'Covering your Year 12 group on Friday — could I use these for the lesson?', status: 'pending', decided_by: null, decided_at: null },
  { id: 'req_titr', resource_id: 'r_titration_ms', requested_by: 't_grace', note: 'Marking a shared Year 11 set this week.', status: 'pending', decided_by: null, decided_at: null },
];

// ── Attachment rows (pointers — never copies) ───────────────────────────────────
// Lesson-plan context ids are the planner's `${group}__${date}` keys (stable seeds
// in lessonPlanner.mock). Student visibility on a lesson-plan attachment defaults
// OFF (staff-only). Homework attachments are created at runtime (D10), so none seed
// here. `r_quad_ws` is attached to two plans so its "Used in 2 places" is real.
const RES_LINKS_SEED = [
  { id: 'lnk1', resource_id: 'r_quad_ws',     context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk2', resource_id: 'r_quad_ms',     context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk3', resource_id: 'r_simul_slides', context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-24' },
  { id: 'lnk4', resource_id: 'r_trig_ws',     context_type: 'lesson_plan', context_id: 'Year 11 – Group B__2026-04-25', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-23' },
  { id: 'lnk5', resource_id: 'r_quad_ws',     context_type: 'lesson_plan', context_id: 'Year 10 – Group A__2026-04-18', student_visible: false, visible_from: null, attached_by: 't1', attached_at: '2026-04-17' },
];

Object.assign(window, {
  RES_STAFF, RES_VISIBILITY, RES_TYPES, RES_EXAM_BOARDS, RES_YEAR_GROUPS,
  RES_RESOURCES_SEED, RES_SHARES_SEED, RES_REQUESTS_SEED, RES_LINKS_SEED,
});
