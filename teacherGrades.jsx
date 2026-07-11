// ══════════════════════════════════════════════════════════════
//  Klasio — Canonical grade model (single source of truth · F3)
//
//  ONE grade taxonomy for the whole teacher surface. A grade is always resolved
//  from a (subject, level/year) pair against a centre-level scale config — no
//  screen invents its own letters (the old Homework "A–F off %" bucketing, the
//  free-text predicted-grade field, etc. all route through here now).
//
//  Decision D4:
//    • GCSE     → 9–1   (9 highest)
//    • A-Level  → A*–E
//    • KS3      → descriptors (Emerging → Mastered)
//
//  Percentages remain RAW SCORES only — never relabelled as a "grade". Where a
//  distribution needs to bucket raw scores by grade (Homework Analytics, Progress)
//  it uses pctToGrade(), which is explicitly INDICATIVE (documented boundaries),
//  not an official result.
//
//  Frontend-only, config lives in-module (centre-editable later). Loads after the
//  mocks and before the page modules; exposed as window.klasioGrades.
// ══════════════════════════════════════════════════════════════
(() => {

// ── Scale catalogue (centre-level config) ────────────────────────────────────
// `grades` is ordered HIGHEST → LOWEST. `bands` map an indicative raw-score floor
// to each grade for distribution bucketing only.
const GRADE_SCALES = {
  GCSE: {
    id: 'GCSE', label: 'GCSE (9–1)',
    grades: ['9', '8', '7', '6', '5', '4', '3', '2', '1', 'U'],
    bands: [
      ['9', 85], ['8', 78], ['7', 70], ['6', 62], ['5', 54],
      ['4', 46], ['3', 36], ['2', 26], ['1', 16], ['U', 0],
    ],
  },
  'A-Level': {
    id: 'A-Level', label: 'A-Level (A*–E)',
    grades: ['A*', 'A', 'B', 'C', 'D', 'E', 'U'],
    bands: [
      ['A*', 90], ['A', 80], ['B', 70], ['C', 60], ['D', 50], ['E', 40], ['U', 0],
    ],
  },
  KS3: {
    id: 'KS3', label: 'KS3 (descriptors)',
    grades: ['Mastered', 'Secure', 'Developing', 'Emerging', 'Below'],
    bands: [
      ['Mastered', 80], ['Secure', 65], ['Developing', 50], ['Emerging', 35], ['Below', 0],
    ],
  },
};

// A colour tone per band position (top → bottom), reused by chips/pills so a grade
// reads the same everywhere. Kept generic (not raw accent hexes) — success→danger.
const TONE_RAMP = ['#0F9D7F', '#3B9E7E', '#8A9A3B', '#C08A2E', '#C2542E', '#B0342E'];

// ── Level resolution ─────────────────────────────────────────────────────────
// Year → level (KS3 = Yr 7–9, GCSE = Yr 10–11, A-Level = Yr 12–13). Accepts
// "Year 12", "Yr 12", "12", 12.
const yearNum = (year) => {
  if (year == null) return null;
  const m = String(year).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};
const levelForYear = (year) => {
  const n = yearNum(year);
  if (n == null) return 'GCSE';
  if (n >= 12) return 'A-Level';
  if (n >= 10) return 'GCSE';
  return 'KS3';
};

// Normalise loose level strings ("GCSE & A-Level", "KS4", "A Level") to a scale id.
const normaliseLevel = (level, yearHint) => {
  const s = String(level || '').toLowerCase();
  if (s.includes('a-level') || s.includes('a level') || s.includes('alevel')) return 'A-Level';
  if (s.includes('ks3')) return 'KS3';
  if (s.includes('gcse') && !s.includes('a-level')) return 'GCSE';
  // "GCSE & A-Level" and unknowns fall back to the year hint.
  return levelForYear(yearHint);
};

// ── Public resolvers ─────────────────────────────────────────────────────────
const scaleById = (id) => GRADE_SCALES[id] || GRADE_SCALES.GCSE;

// The canonical entry point: resolve a scale from any of level / year / subject.
const scaleFor = ({ level, year, subject } = {}) => {
  if (level) return scaleById(normaliseLevel(level, year));
  if (year != null) return scaleById(levelForYear(year));
  // Subject-only: look up its configured level from SEED_SUBJECTS if present.
  if (subject && window.SEED_SUBJECTS) {
    const s = window.SEED_SUBJECTS.find(x => x.name === subject);
    if (s && s.level) return scaleById(normaliseLevel(s.level, year));
  }
  return GRADE_SCALES.GCSE;
};

const gradesFor = (opts) => scaleFor(opts).grades.slice();

const isValidGrade = (grade, opts) => scaleFor(opts).grades.includes(grade);

// Indicative raw-score → grade band (distributions only; never an official grade).
const pctToGrade = (pct, opts) => {
  if (pct == null || isNaN(pct)) return null;
  const scale = scaleFor(opts);
  for (const [g, floor] of scale.bands) { if (pct >= floor) return g; }
  return scale.grades[scale.grades.length - 1];
};

// Ordered bucket keys for a distribution chart (highest grade first).
const distributionKeys = (opts) => scaleFor(opts).grades.slice();

// Empty {grade: 0} bucket object in scale order — callers ++ into it.
const emptyDistribution = (opts) => {
  const out = {};
  scaleFor(opts).grades.forEach(g => { out[g] = 0; });
  return out;
};

const toneForGrade = (grade, opts) => {
  const scale = scaleFor(opts);
  const i = scale.grades.indexOf(grade);
  if (i < 0) return TONE_RAMP[TONE_RAMP.length - 1];
  // Map grade index across the tone ramp.
  const t = scale.grades.length <= 1 ? 0 : i / (scale.grades.length - 1);
  return TONE_RAMP[Math.min(TONE_RAMP.length - 1, Math.round(t * (TONE_RAMP.length - 1)))];
};

window.klasioGrades = {
  GRADE_SCALES,
  levelForYear, normaliseLevel,
  scaleFor, scaleById, gradesFor, isValidGrade,
  pctToGrade, distributionKeys, emptyDistribution, toneForGrade,
};

})();
