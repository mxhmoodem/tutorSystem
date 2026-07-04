// ══════════════════════════════════════════════════════════════
//  Mock data — Student Reports & Feedback system
//  Loaded as a global script before Reports.jsx (see index.html).
//  Seeds the `reports_store_v2` localStorage store consumed by the
//  Teacher, Student and Admin reporting surfaces.
// ══════════════════════════════════════════════════════════════

// ─── Config (admin-controlled) ────────────────────────────────────────────────
// The reporting model has three layers:
//   • Centre-wide settings (branding, permissions, notifications, centre standards)
//   • Per-template settings (sections, rating scale, categories) — owned by the
//     template maker, NOT here.
//   • Scoped reporting rules — whether a report is required, how often and which
//     template applies, resolved by a cascade (student > class > tag > default).
const REPORTS_CONFIG = {
  // Centre default rule — applies to anyone not covered by an override below.
  //   requirement: 'REQUIRED' | 'OPTIONAL' | 'OFF'   (this is CADENCE: must a report be written?)
  //   frequency:   'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'TERMLY'
  defaultRule: { requirement: 'REQUIRED', frequency: 'TERMLY', templateId: 'tpl_term' },

  // Override rules. Each targets ONE of a tag / class / student — never year/subject
  // directly (those are just tag values). Narrowest target wins; same-level ties
  // break on `priority` (higher wins). frequency may be null when requirement='OFF'.
  reportRules: [
    { id: 'rr_alevel', targetType: 'TAG',     tag: 'A-Level',      requirement: 'REQUIRED', frequency: 'TERMLY',      templateId: 'tpl_eoy',   priority: 10 },
    { id: 'rr_int',    targetType: 'TAG',     tag: 'Intervention', requirement: 'REQUIRED', frequency: 'FORTNIGHTLY', templateId: 'tpl_int',   priority: 20 },
    { id: 'rr_c3',     targetType: 'CLASS',   classId: 'c3',       requirement: 'REQUIRED', frequency: 'MONTHLY',     templateId: 'tpl_term',  priority: 0 },
    { id: 'rr_oliver', targetType: 'STUDENT', studentId: 's2',     requirement: 'OPTIONAL', frequency: 'TERMLY',      templateId: 'tpl_quick', priority: 0 },
  ],

  // Centre standards = completion FLOORS only (the "required to complete" concept,
  // distinct from the cadence "required" above). A template may require MORE than
  // the floor, never less. `sectionsRequiredEverywhere` is a guardrail key list the
  // maker reads — NOT a per-section editor (sections live only in the template maker).
  centreStandards: {
    minCommentLength: 120,
    requireSignature: true,
    sectionsRequiredEverywhere: ['comments'],   // section keys from RPT_ALL_SECTIONS
  },
  permissions: {
    editPublished:   false,
    deleteReports:   true,
    archiveReports:  true,
    exportReports:   true,
    shareTemplates:  true,
    viewOthers:      true,
  },
  branding: {
    // Centre IDENTITY (name / logo / brand accent / contact) is NOT stored here —
    // it comes from the single centre-profile record (§1) via
    // reportBrandingResolved() in Reports.jsx. Only the report-SPECIFIC fields
    // below live locally; the identity fields are left blank as a fallback.
    centreName: '',
    logo: '',
    primaryColor: '',           // falls back to the centre's brand accent
    pdfTheme: 'classic',        // classic | modern | minimal
    headerText: 'Termly Progress Report',
    footerText: 'Confidential — issued to the recipient family only.',
    signatureName: 'Dr. Eleanor Whitfield',
    signatureTitle: 'Head of Centre',
    contactEmail: '',           // from Centre profile
    contactPhone: '',           // from Centre profile
    watermark: '',              // optional watermark text
  },
  notifications: {
    dueReminder:        true,
    overdueReminder:    true,
    publishedToStudent: true,
    parentNotification: false,  // future
  },
};

// ─── Financial summary (drives the admin "Financial Overview" report) ───────────
// Mirrors the invoices on AdminInvoicesPage so the financial report stays coherent.
const REPORTS_INVOICES = [
  { student: 'Emma Thompson',    plan: 'GCSE Maths — Weekly',     amount: 220, status: 'paid',     due: '2026-04-01' },
  { student: 'Oliver Chen',      plan: 'A-Level Bundle',          amount: 480, status: 'paid',     due: '2026-04-01' },
  { student: 'Sophia Patel',     plan: 'GCSE Maths — Weekly',     amount: 220, status: 'paid',     due: '2026-04-01' },
  { student: 'James Wilson',     plan: 'GCSE Dual — Weekly',      amount: 360, status: 'outstanding', due: '2026-04-15' },
  { student: 'Amelia Roberts',   plan: 'GCSE English — Weekly',   amount: 180, status: 'overdue',  due: '2026-03-20' },
  { student: 'Noah Fitzgerald',  plan: 'GCSE Dual — Weekly',      amount: 360, status: 'overdue',  due: '2026-03-25' },
  { student: 'Isabella Martinez',plan: 'A-Level Bundle',          amount: 480, status: 'paid',     due: '2026-04-01' },
  { student: 'Ethan Huang',      plan: 'GCSE Dual — Weekly',      amount: 360, status: 'paid',     due: '2026-04-01' },
  { student: 'Mia Okonkwo',      plan: 'GCSE Dual — Weekly',      amount: 360, status: 'outstanding', due: '2026-04-15' },
  { student: 'Liam Thornton',    plan: 'GCSE Science — Weekly',   amount: 240, status: 'paid',     due: '2026-04-01' },
  { student: 'Zoe Patterson',    plan: 'A-Level Chem — Weekly',   amount: 260, status: 'overdue',  due: '2026-03-28' },
  { student: 'Aiden Foster',     plan: 'GCSE Maths — Weekly',     amount: 220, status: 'paid',     due: '2026-04-01' },
  { student: 'Priya Nair',       plan: 'GCSE Dual — Weekly',      amount: 360, status: 'paid',     due: '2026-04-01' },
  { student: 'Thomas Hughes',    plan: 'A-Level Bundle',          amount: 480, status: 'paid',     due: '2026-04-01' },
  { student: 'Aisha Rahman',     plan: 'GCSE Dual — Weekly',      amount: 360, status: 'outstanding', due: '2026-04-15' },
];

// ─── Tags ──────────────────────────────────────────────────────────────────────
const REPORTS_TAGS = [
  { id: 't_pe',    label: "Parents' Evening", color: '#7C3AED' },
  { id: 't_mock',  label: 'Mock Prep',        color: '#0891B2' },
  { id: 't_int',   label: 'Intervention',     color: '#DC2626' },
  { id: 't_top',   label: 'Top Performer',    color: '#16A34A' },
  { id: 't_eoy',   label: 'End of Year',      color: '#D97706' },
  { id: 't_sen',   label: 'SEN Review',       color: '#0284C7' },
];

// ─── Folders (file-management rail) ─────────────────────────────────────────────
const REPORTS_FOLDERS = [
  { id: 'f_y12',  name: 'Year 12',        parentId: null,   color: '#4F46E5' },
  { id: 'f_y13',  name: 'Year 13',        parentId: null,   color: '#7C3AED' },
  { id: 'f_math', name: 'Mathematics',    parentId: 'f_y12', color: '#43b190' },
  { id: 'f_fm',   name: 'Further Maths',  parentId: 'f_y12', color: '#7C3AED' },
  { id: 'f_phys', name: 'Physics',        parentId: 'f_y12', color: '#0891B2' },
  { id: 'f_chem', name: 'Chemistry',      parentId: 'f_y12', color: '#D97706' },
  { id: 'f_pe',   name: "Parents' Evening 2026", parentId: null, color: '#DB2777' },
];

// ─── Templates ──────────────────────────────────────────────────────────────────
const REPORTS_RATING_CATEGORIES = [
  'behaviour', 'effort', 'homework', 'participation', 'confidence', 'communication', 'subjectKnowledge',
];

const REPORTS_TEMPLATES = [
  {
    id: 'tpl_term', name: 'Termly Progress Report', scope: 'centre', locked: false, default: true,
    description: 'Comprehensive end-of-term report covering academic progress, ratings, comments and targets.',
    sections: ['studentInfo', 'academic', 'ratings', 'comments', 'targets', 'attachments'],
    ratingCategories: REPORTS_RATING_CATEGORIES,
    ratingScale: 'fourtier',
    assignedSubjects: [], assignedClasses: [], assignedYears: ['Year 12', 'Year 13'],
  },
  {
    id: 'tpl_quick', name: 'Quick Update', scope: 'centre', locked: false, default: false,
    description: 'Short check-in note for parents — comments and a couple of ratings only.',
    sections: ['studentInfo', 'comments', 'ratings'],
    ratingCategories: ['effort', 'homework', 'participation'],
    ratingScale: 'fourtier',
    assignedSubjects: [], assignedClasses: [], assignedYears: [],
  },
  {
    id: 'tpl_eoy', name: 'End of Year Report', scope: 'centre', locked: true, default: false,
    description: 'Formal year-end report with full ratings, predicted grades and long-term targets. Locked by admin.',
    sections: ['studentInfo', 'academic', 'ratings', 'comments', 'targets', 'attachments'],
    ratingCategories: REPORTS_RATING_CATEGORIES,
    ratingScale: 'stars',
    assignedSubjects: [], assignedClasses: [], assignedYears: ['Year 13'],
  },
  {
    id: 'tpl_int', name: 'Intervention Review', scope: 'personal', locked: false, default: false,
    description: 'Targeted review for students on an intervention plan.',
    sections: ['studentInfo', 'academic', 'comments', 'targets'],
    ratingCategories: ['effort', 'confidence', 'subjectKnowledge'],
    ratingScale: 'percent',
    assignedSubjects: [], assignedClasses: [], assignedYears: [],
  },
];

// ─── Report seed data ───────────────────────────────────────────────────────────
// Rating scale values: fourtier => 'excellent'|'good'|'satisfactory'|'needs_improvement'
//                      stars    => 1..5
//                      percent  => 0..100
const _FOURTIER = ['excellent', 'good', 'satisfactory', 'needs_improvement'];

// Students used across the teacher view (the logged-in student app is Oliver Chen).
const REPORTS_STUDENTS = [
  { id: 's_oliver',  name: 'Oliver Chen',      year: 'Year 12' },
  { id: 's_amelia',  name: 'Amelia Rosewood',  year: 'Year 12' },
  { id: 's_jack',    name: 'Jack Thompson',    year: 'Year 12' },
  { id: 's_priya',   name: 'Priya Sharma',     year: 'Year 13' },
  { id: 's_marcus',  name: 'Marcus Webb',      year: 'Year 13' },
  { id: 's_sofia',   name: 'Sofia Almeida',    year: 'Year 12' },
  { id: 's_henry',   name: 'Henry Bramwell',   year: 'Year 12' },
  { id: 's_isla',    name: 'Isla Donaldson',   year: 'Year 13' },
  { id: 's_noah',    name: 'Noah Fitzgerald',  year: 'Year 12' },
  { id: 's_layla',   name: 'Layla Hussain',    year: 'Year 13' },
  { id: 's_ethan',   name: 'Ethan Whitmore',   year: 'Year 12' },
  { id: 's_grace',   name: 'Grace Okeke',      year: 'Year 13' },
  { id: 's_dylan',   name: 'Dylan Carmichael', year: 'Year 12' },
  { id: 's_freya',   name: 'Freya Lindqvist',  year: 'Year 13' },
];

const _COMMENTS = [
  "<p><strong>A genuinely strong term.</strong> Oliver has shown excellent command of integration techniques and consistently produces well-structured, clearly-reasoned solutions.</p><ul><li>Outstanding contribution to whole-class discussion</li><li>Homework submitted on time and to a high standard</li></ul><p>To push into the very top band, he should now focus on the speed and accuracy of his algebraic manipulation under timed conditions.</p>",
  "<h3>Summary</h3><p>A solid and steady term. Understanding of the core material is secure, and effort in lessons is commendable.</p><p>The main priority going forward is to <strong>review exam technique</strong> — several marks were lost to presentation rather than method. Working through past papers under timed conditions would help considerably.</p>",
  "<p>This has been a term of real progress. Confidence has grown noticeably, and the quality of written explanation has improved.</p><ul><li>Engages well with challenging extension problems</li><li>Responds positively to feedback</li></ul><p>Continued focus on consolidating earlier topics will support strong performance in the upcoming mocks.</p>",
  "<p><strong>An excellent all-round performance.</strong> Consistently one of the most engaged members of the class, with a mature and methodical approach to problem solving.</p><p>I would encourage wider reading around the subject to stretch beyond the specification.</p>",
];

const _STRENGTHS = [
  ['Clear, well-structured working', 'Strong conceptual understanding', 'Excellent class participation'],
  ['Methodical problem-solving approach', 'Reliable homework completion', 'Asks insightful questions'],
  ['Confident with core techniques', 'Neat and accurate presentation', 'Resilient when challenged'],
  ['Strong analytical reasoning', 'Collaborates well in group tasks', 'Independent and self-motivated'],
];

const _IMPROVE = [
  ['Improve speed under timed conditions', 'Review exam command words carefully'],
  ['Show more intermediate steps in working', 'Consolidate earlier topics before mocks'],
  ['Take more care with units and notation', 'Attempt extension questions more often'],
  ['Build confidence presenting solutions aloud', 'Revisit foundational definitions'],
];

const _TARGETS = [
  {
    current:       ['Complete weekly past-paper questions under timed conditions', 'Maintain detailed revision notes for each topic'],
    longTerm:      ['Achieve a secure A grade in summer mock examinations'],
    revision:      ['Chapter 12 — Integration techniques', 'Mixed-topic exam questions (Edexcel 2023–2024)'],
    parentActions: ['Encourage a consistent home study routine', 'Check homework planner weekly'],
    teacherActions:['Provide a curated set of timed practice questions', 'Offer a fortnightly check-in'],
  },
  {
    current:       ['Reduce avoidable errors by checking final answers', 'Attend the Thursday support session'],
    longTerm:      ['Move from a B to an A grade by the summer'],
    revision:      ['Exam technique workshop materials', 'Topic recap quizzes'],
    parentActions: ['Support attendance at after-school sessions'],
    teacherActions:['Share targeted worksheets on identified weak areas'],
  },
];

const _ATTACH = [
  [{ name: 'Mock_Paper_1_Annotated.pdf', type: 'pdf', size: '482 KB' }, { name: 'Topic_Tracker.xlsx', type: 'file', size: '64 KB' }],
  [{ name: 'Worksheet_Integration.pdf', type: 'pdf', size: '210 KB' }],
  [{ name: 'Assessment_March.pdf', type: 'pdf', size: '388 KB' }, { name: 'Revision_Notes_scan.jpg', type: 'image', size: '1.2 MB' }],
  [],
];

const _SUBJECTS = [
  { name: 'Mathematics',   color: '#43b190', teacher: 'Ms. Sarah Clarke', folder: 'f_math', predicted: 'A*' },
  { name: 'Further Maths', color: '#7C3AED', teacher: 'Ms. Sarah Clarke', folder: 'f_fm',   predicted: 'A'  },
  { name: 'Physics',       color: '#0891B2', teacher: 'Mr. David Park',   folder: 'f_phys', predicted: 'A'  },
  { name: 'Chemistry',     color: '#D97706', teacher: 'Mr. David Park',   folder: 'f_chem', predicted: 'A'  },
];

const _PERIODS = ['Autumn Term 2025', 'Spring Term 2026'];

function _mkRatings(scale, i) {
  const out = {};
  REPORTS_RATING_CATEGORIES.forEach((cat, k) => {
    if (scale === 'stars')   out[cat] = 3 + ((i + k) % 3);              // 3..5
    else if (scale === 'percent') out[cat] = 70 + ((i * 7 + k * 5) % 28); // 70..97
    else out[cat] = _FOURTIER[(i + k) % 3];                            // excellent/good/satisfactory
  });
  return out;
}

// Build a deterministic, varied seed set.
const REPORTS_SEED = (() => {
  const reports = {};
  let n = 0;
  const push = (r) => { reports[r.id] = r; };

  // Oliver Chen — full history across all 4 subjects, two periods (some published, one draft).
  _SUBJECTS.forEach((subj, si) => {
    _PERIODS.forEach((period, pi) => {
      const i = si * 2 + pi;
      const isLatest = pi === _PERIODS.length - 1;
      // The most recent Chemistry report is left as a draft to show that flow.
      const status = (isLatest && subj.name === 'Chemistry') ? 'draft'
                   : (isLatest && subj.name === 'Physics') ? 'published'
                   : 'published';
      const acked = !isLatest && (si % 2 === 0);
      const id = `r_oliver_${si}_${pi}`;
      push({
        id,
        title: `${period} — ${subj.name} Progress Report`,
        studentId: 's_oliver', studentName: 'Oliver Chen', year: 'Year 12',
        className: `${subj.name} — Year 12 (Set A)`,
        subject: subj.name, subjectColor: subj.color, teacher: subj.teacher,
        predicted: subj.predicted,
        period, reportType: 'Termly Progress',
        dateCreated:  pi === 0 ? '2025-12-08' : '2026-04-02',
        dateModified: pi === 0 ? '2025-12-10' : (status === 'draft' ? '2026-06-12' : '2026-04-05'),
        datePublished: status === 'published' ? (pi === 0 ? '2025-12-12' : '2026-04-06') : null,
        dateArchived: null,
        status,
        folderId: subj.folder,
        tagIds: [].concat(si === 0 ? ['t_top'] : [], pi === 1 ? ['t_pe'] : [], subj.name === 'Chemistry' ? ['t_mock'] : []),
        pinned: si === 0 && pi === 1,
        lastViewed: isLatest ? '2026-06-10' : null,
        academic: {
          understanding: _FOURTIER[(i) % 3],
          participation: _FOURTIER[(i + 1) % 3],
          homeworkCompletion: `${92 - si * 3 + pi * 2}%`,
          testPerformance: `${82 + si + pi * 4}%`,
          attendance: `${98 - si}%`,
          strengths: _STRENGTHS[i % _STRENGTHS.length],
          improvements: _IMPROVE[i % _IMPROVE.length],
        },
        comments: _COMMENTS[i % _COMMENTS.length],
        ratingScale: 'fourtier',
        ratings: _mkRatings('fourtier', i),
        targets: _TARGETS[i % _TARGETS.length],
        attachments: _ATTACH[i % _ATTACH.length],
        acknowledgement: { ack: acked, at: acked ? '2025-12-15T19:24:00' : null },
        createdBy: subj.teacher,
        history: [
          { action: 'Created',   by: subj.teacher, at: (pi === 0 ? '2025-12-08' : '2026-04-02') + 'T14:10:00' },
          { action: 'Edited',    by: subj.teacher, at: (pi === 0 ? '2025-12-10' : '2026-04-05') + 'T09:32:00' },
        ].concat(status === 'published' ? [{ action: 'Published', by: subj.teacher, at: (pi === 0 ? '2025-12-12' : '2026-04-06') + 'T16:00:00' }] : []),
      });
      n++;
    });
  });

  // Other students — a spread of statuses, subjects, periods, tags for the teacher file view.
  const others = REPORTS_STUDENTS.filter(s => s.id !== 's_oliver');
  let idx = 0;
  others.forEach((stu, ci) => {
    const picks = [_SUBJECTS[ci % 4], _SUBJECTS[(ci + 1) % 4]];
    picks.forEach((subj, pj) => {
      const i = (idx++) + 8;
      const roll = (i + ci) % 5;
      const status = roll === 0 ? 'draft' : roll === 4 ? 'archived' : 'published';
      const period = _PERIODS[(i + pj) % 2];
      const id = `r_${stu.id}_${pj}`;
      push({
        id,
        title: `${period} — ${subj.name} Progress Report`,
        studentId: stu.id, studentName: stu.name, year: stu.year,
        className: `${subj.name} — ${stu.year} (Set ${pj === 0 ? 'A' : 'B'})`,
        subject: subj.name, subjectColor: subj.color, teacher: subj.teacher,
        predicted: subj.predicted,
        period, reportType: roll === 3 ? 'Quick Update' : 'Termly Progress',
        dateCreated:  period.includes('Autumn') ? '2025-12-09' : '2026-04-03',
        dateModified: period.includes('Autumn') ? '2025-12-11' : '2026-04-07',
        datePublished: status === 'published' ? (period.includes('Autumn') ? '2025-12-13' : '2026-04-08') : null,
        dateArchived: status === 'archived' ? '2026-01-20' : null,
        status,
        folderId: stu.year === 'Year 13' ? 'f_y13' : subj.folder,
        tagIds: [].concat(roll === 1 ? ['t_int'] : [], roll === 2 ? ['t_top'] : [], stu.year === 'Year 13' ? ['t_eoy'] : []),
        pinned: false,
        lastViewed: ci === 0 ? '2026-06-09' : null,
        academic: {
          understanding: _FOURTIER[i % 3],
          participation: _FOURTIER[(i + 2) % 4],
          homeworkCompletion: `${80 + (i % 18)}%`,
          testPerformance: `${68 + (i % 28)}%`,
          attendance: `${90 + (i % 9)}%`,
          strengths: _STRENGTHS[i % _STRENGTHS.length],
          improvements: _IMPROVE[i % _IMPROVE.length],
        },
        comments: _COMMENTS[i % _COMMENTS.length],
        ratingScale: pj === 0 ? 'fourtier' : 'stars',
        ratings: _mkRatings(pj === 0 ? 'fourtier' : 'stars', i),
        targets: _TARGETS[i % _TARGETS.length],
        attachments: _ATTACH[i % _ATTACH.length],
        acknowledgement: { ack: roll === 2, at: roll === 2 ? '2026-04-09T18:02:00' : null },
        createdBy: subj.teacher,
        history: [
          { action: 'Created', by: subj.teacher, at: (period.includes('Autumn') ? '2025-12-09' : '2026-04-03') + 'T13:00:00' },
        ].concat(status === 'published' ? [{ action: 'Published', by: subj.teacher, at: (period.includes('Autumn') ? '2025-12-13' : '2026-04-08') + 'T15:30:00' }]
               : status === 'archived' ? [{ action: 'Archived', by: subj.teacher, at: '2026-01-20T11:00:00' }] : []),
      });
    });
  });

  return reports;
})();
