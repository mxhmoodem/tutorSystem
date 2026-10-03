// ══════════════════════════════════════════════════════════════
//  Mock data — Assessments & results (decision #50)
//  Loaded as a global script before assessments.jsx (see index.html).
//
//  WHY THIS FILE EXISTS
//  Every pupil used to carry a stored `score` on their roster row. Nothing
//  computed it, yet it drove at-risk flags, dashboard KPIs, predicted grades and
//  the student profile. That field is gone. A pupil's attainment is now DERIVED
//  from assessment results — so the seed has to supply results, not a number.
//
//  SEED_ATTAINMENT_BASELINE is where each seed pupil tends to land (the old
//  `score` values). It is used ONLY to generate plausible seeded results below;
//  no screen reads it. A pupil with no baseline (new, or never assessed) simply
//  has no results, and every screen says so honestly instead of inventing one.
// ══════════════════════════════════════════════════════════════

const SEED_ATTAINMENT_BASELINE = {
  s1: 76, s2: 94, s3: 68, s4: 71, s5: 52, s6: 55, s7: 91, s8: 83, s9: 79, s10: 63,
  s11: 61, s12: 81, s13: 75, s14: 88, s15: 82, s18: 86, s19: 70, s20: 64, s21: 74,
  s22: 83, s23: 59, s24: 80, s25: 81, s26: 90, s27: 72, s28: 78, s29: 85,
};

// Four assessments a term per class, by subject family. `max` is the paper's
// total marks — results are stored as marks, and a percentage is derived.
const ASSESSMENT_TEMPLATES = {
  maths:     [{ title: 'Number & algebra check-in', max: 40 }, { title: 'Half-term test', max: 60 }, { title: 'Geometry & measures quiz', max: 30 }, { title: 'End-of-term paper', max: 80 }],
  science:   [{ title: 'Required practicals quiz', max: 30 }, { title: 'Half-term test', max: 60 }, { title: 'Topic test', max: 50 }, { title: 'End-of-term paper', max: 70 }],
  english:   [{ title: 'Close reading task', max: 24 }, { title: 'Half-term essay', max: 40 }, { title: 'Unseen poetry', max: 30 }, { title: 'End-of-term paper', max: 64 }],
  humanities:[{ title: 'Source analysis', max: 20 }, { title: 'Half-term test', max: 50 }, { title: 'Extended writing', max: 32 }, { title: 'End-of-term paper', max: 60 }],
  languages: [{ title: 'Vocabulary test', max: 30 }, { title: 'Listening paper', max: 40 }, { title: 'Speaking assessment', max: 30 }, { title: 'End-of-term paper', max: 60 }],
  default:   [{ title: 'Baseline check', max: 30 }, { title: 'Half-term test', max: 50 }, { title: 'Topic test', max: 40 }, { title: 'End-of-term paper', max: 60 }],
};

// The Monday of each assessment week (summer term 2026); each class sits the
// assessment on its own weekday that week.
const ASSESSMENT_WEEKS = ['2026-04-20', '2026-05-11', '2026-06-01', '2026-06-22'];

Object.assign(window, { SEED_ATTAINMENT_BASELINE, ASSESSMENT_TEMPLATES, ASSESSMENT_WEEKS });
