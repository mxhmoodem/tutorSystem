// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — Assessments, results and the ONE score selector   · decision #50
//  Exposed as window.klasioScores. Loaded after the mocks (assessments.mock.jsx)
//  and teacherGrades.jsx; read by teacherMetrics, centreMetrics, studentData, the
//  teacher Progress page, the class Progress tab, the admin student profile,
//  My Students and the analytics exports.
//
//  WHAT A "SCORE" IS
//  There are two series, clearly labelled and NEVER blended into one number:
//    • attainment — assessment RESULTS (a dated paper with a mark out of max).
//      This is what the centre is judged on, so it drives Progress, the profile,
//      at-risk and predicted grades.
//    • homework — the average of MARKED homework (effort / consistency). It sits
//      beside attainment; a diligent pupil who tests badly and a coasting pupil
//      who tests well must never look identical.
//  A pupil with no results has NO attainment (null) — every screen says so rather
//  than showing an invented number. There is no stored `score` on the roster.
//
//  WHERE RESULTS COME FROM
//    • assessments created on a class (Progress tab → New assessment), marks
//      entered per pupil — store `klasio.assessments.v1` (production: assessments
//      + results);
//    • tracker score columns flagged "counts as an assessment" — read LIVE from
//      the tracker store, so a teacher who lives in their tracker never types a
//      mark twice (production: the flag links the column to an assessments row
//      and cell writes upsert its results).
//  Pupils see a result only once it is PUBLISHED. A grade is only ever an
//  indicative bucket from klasioGrades.pctToGrade — never an official result.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const AS_KEY = 'klasio.assessments.v1';
const AS_EVENT = 'klasio-assessments-changed';
const TRACK_KEY = 'tutoros.tracking.v1';
const ADMIN_KEY = 'admin_store_v4';
const DAY_OFFSET = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nameOf = (s) => (s && (s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim())) || '';
const subjectOf = (className) => String(className || '').replace(/^(GCSE|A-?Level|AS-?Level|KS\d|IB|Entry Level)\s+/i, '').trim();
const family = (className) => {
  const n = String(className || '').toLowerCase();
  if (/math/.test(n)) return 'maths';
  if (/science|physics|chemistry|biology/.test(n)) return 'science';
  if (/english/.test(n)) return 'english';
  if (/history|geography|economics|business|rs\b/.test(n)) return 'humanities';
  if (/french|spanish|german/.test(n)) return 'languages';
  return 'default';
};

const readAdmin = () => {
  try { const p = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); if (p) return { classes: p.classes || window.SEED_CLASSES || [], students: p.students || window.SEED_STUDENTS || [], teachers: p.teachers || window.SEED_TEACHERS || [] }; } catch (e) {}
  return { classes: window.SEED_CLASSES || [], students: window.SEED_STUDENTS || [], teachers: window.SEED_TEACHERS || [] };
};

// ── Seed: four results-bearing assessments a class, from each pupil's baseline ──
// Deterministic (hash-seeded, never random) so figures are stable across reloads.
// The last assessment on Year 10 Group A (c1) is left UNPUBLISHED so the publish
// step is demonstrable.
const buildSeed = () => {
  const base = window.SEED_ATTAINMENT_BASELINE || {};
  const tpls = window.ASSESSMENT_TEMPLATES || {};
  const weeks = window.ASSESSMENT_WEEKS || [];
  const classes = (window.SEED_CLASSES || []).filter(c => c.status === 'active');
  const students = window.SEED_STUDENTS || [];
  const teachers = window.SEED_TEACHERS || [];
  const assessments = [];
  const results = {};
  classes.forEach(cls => {
    const list = tpls[family(cls.name)] || tpls.default || [];
    const roster = students.filter(s => (s.classIds || []).includes(cls.id) && base[s.id]);
    const teacher = teachers.find(t => t.name === cls.teacher);
    list.forEach((t, i) => {
      if (!weeks[i]) return;
      const id = `as_${cls.id}_${i + 1}`;
      assessments.push({
        id, centreId: 'bm', classId: cls.id, subject: subjectOf(cls.name), title: t.title,
        assessedOn: addDays(weeks[i], DAY_OFFSET[cls.day] || 0), maxMarks: t.max,
        createdBy: teacher ? teacher.id : null, published: !(cls.id === 'c1' && i === list.length - 1),
        source: 'manual',
      });
      results[id] = {};
      roster.forEach(s => {
        const drift = ((hash(s.id + 'drift') % 7) - 2) * 0.8;        // per-pupil direction of travel (most improve)
        const noise = (hash(s.id + id) % 11) - 5;
        const pct = clamp(base[s.id] + drift * (i - 1.5) + noise, 12, 100);
        results[id][s.id] = { marks: Math.round((pct / 100) * t.max), comment: '' };
      });
    });
  });
  return { assessments, results, trackerPublished: {} };
};

const readStore = () => {
  try { const raw = localStorage.getItem(AS_KEY); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.assessments)) return { assessments: p.assessments, results: p.results || {}, trackerPublished: p.trackerPublished || {} }; } } catch (e) {}
  if (!readStore._seed) readStore._seed = buildSeed();
  return readStore._seed;
};
const writeStore = (next) => {
  try { localStorage.setItem(AS_KEY, JSON.stringify(next)); } catch (e) {}
  index._key = null;
  try { window.dispatchEvent(new CustomEvent(AS_EVENT)); } catch (e) {}
};

// ── Tracker score columns flagged "counts as an assessment", read live ─────────
const trackerAssessments = (admin, store) => {
  let trackers = null;
  try { trackers = JSON.parse(localStorage.getItem(TRACK_KEY) || 'null'); } catch (e) { trackers = null; }
  if (!Array.isArray(trackers)) trackers = window.DEFAULT_TRACKERS || [];
  const principal = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : null;
  const byName = {};
  (admin.students || []).forEach(s => { byName[nameOf(s).toLowerCase()] = s.id; });
  const out = [];
  const results = {};
  trackers.forEach(t => {
    const cls = (admin.classes || []).find(c => c.group === t.classGroup && principal && c.teacher === principal.name)
      || (admin.classes || []).find(c => c.group === t.classGroup);
    if (!cls) return;
    (t.columns || []).forEach(col => {
      if (!col.countsAsAssessment || !(col.type === 'score' || col.type === 'number') || !col.max) return;
      const id = `trk:${t.id}:${col.id}`;
      out.push({
        id, centreId: 'bm', classId: cls.id, subject: subjectOf(cls.name), title: col.name,
        assessedOn: col.assessedOn || (t.updatedAt ? String(t.updatedAt).slice(0, 10) : ''),
        maxMarks: Number(col.max), createdBy: principal ? principal.id : null,
        published: !!(store.trackerPublished || {})[id], source: 'tracker', trackerId: t.id, trackerName: t.name,
      });
      results[id] = {};
      Object.entries(t.entries || {}).forEach(([name, row]) => {
        const sid = byName[String(name).toLowerCase()];
        const v = row ? row[col.id] : null;
        if (sid && typeof v === 'number') results[id][sid] = { marks: v, comment: '' };
      });
    });
  });
  return { assessments: out, results };
};

// ── The index — rebuilt only when a source store changes ───────────────────────
const index = () => {
  let rawA = '', rawT = '', rawM = '';
  try { rawA = localStorage.getItem(AS_KEY) || ''; rawT = localStorage.getItem(TRACK_KEY) || ''; rawM = localStorage.getItem(ADMIN_KEY) || ''; } catch (e) {}
  const key = hash(rawA) + '|' + hash(rawT) + '|' + hash(rawM);
  if (index._key === key && index._val) return index._val;
  const admin = readAdmin();
  const store = readStore();
  const trk = trackerAssessments(admin, store);
  const all = [...store.assessments, ...trk.assessments].sort((a, b) => String(a.assessedOn).localeCompare(String(b.assessedOn)));
  const results = { ...store.results, ...trk.results };
  const byClass = {};
  const byStudent = {};
  all.forEach(a => {
    const res = results[a.id] || {};
    const pcts = [];
    Object.entries(res).forEach(([sid, r]) => {
      if (r == null || typeof r.marks !== 'number' || !a.maxMarks) return;
      const pct = Math.round((r.marks / a.maxMarks) * 100);
      pcts.push(pct);
      (byStudent[sid] = byStudent[sid] || []).push({
        assessmentId: a.id, title: a.title, date: a.assessedOn, classId: a.classId, subject: a.subject,
        marks: r.marks, max: a.maxMarks, pct, published: a.published, source: a.source,
      });
    });
    const row = { ...a, results: res, resultCount: pcts.length, classAvgPct: pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null };
    (byClass[a.classId] = byClass[a.classId] || []).push(row);
  });
  index._val = { all, byClass, byStudent };
  index._key = key;
  return index._val;
};

const mean = (arr) => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : null;
// Direction of travel: mean of the last two vs the first two points (≥3 points).
const trendOf = (pcts) => {
  if (pcts.length < 3) return null;
  const head = mean(pcts.slice(0, 2)), tail = mean(pcts.slice(-2));
  return tail - head >= 4 ? 'up' : head - tail >= 4 ? 'down' : 'flat';
};

// ── Selectors ─────────────────────────────────────────────────────────────────
// opts: { classId, classIds, subject, publishedOnly }
const attainmentSeries = (studentId, opts) => {
  const o = opts || {};
  const inSet = o.classIds ? new Set(o.classIds) : null;
  return (index().byStudent[studentId] || [])
    .filter(e => !o.classId || e.classId === o.classId)
    .filter(e => !inSet || inSet.has(e.classId))
    .filter(e => !o.subject || String(e.subject).toLowerCase() === String(o.subject).toLowerCase())
    .filter(e => !o.publishedOnly || e.published);
};
const homeworkSeries = (studentId, opts) => {
  const o = opts || {};
  if (!window.klasioHomework || !window.klasioHomework.studentHomeworkSeries) return [];
  const classes = readAdmin().classes;
  const ids = o.classId ? [o.classId] : o.classIds || null;
  if (!ids) return window.klasioHomework.studentHomeworkSeries(studentId, {});
  // Homework joins classes by label in the prototype (a known divergence), so a
  // class scope becomes the set of its group labels.
  const labels = Array.from(new Set(ids.map(id => (classes.find(c => c.id === id) || {}).group).filter(Boolean)));
  const seen = new Set();
  return labels.flatMap(classLabel => window.klasioHomework.studentHomeworkSeries(studentId, { classLabel }))
    .filter(e => !seen.has(e.id) && seen.add(e.id))
    .sort((x, y) => x.date.localeCompare(y.date));
};

// THE selector (decision #50). Every screen reads a pupil's scores through here.
const getStudentScoreSeries = (studentId, opts) => {
  const attainment = attainmentSeries(studentId, opts);
  const homework = homeworkSeries(studentId, opts);
  const ap = attainment.map(e => e.pct);
  return {
    attainment, homework,
    attainmentAvg: mean(ap),
    homeworkAvg: mean(homework.map(e => e.pct)),
    latest: ap.length ? ap[ap.length - 1] : null,
    trend: trendOf(ap),
  };
};
const attainmentAvg = (studentId, opts) => mean(attainmentSeries(studentId, opts).map(e => e.pct));
const isDeclining = (studentId) => trendOf(attainmentSeries(studentId).map(e => e.pct)) === 'down';

// Class view: its assessments (oldest first) with results and the class average.
const classAssessments = (classId) => (index().byClass[classId] || []).slice();
const classAttainment = (classId) => {
  const rows = classAssessments(classId).filter(a => a.classAvgPct != null);
  return { series: rows.map(a => ({ id: a.id, label: a.title, date: a.assessedOn, pct: a.classAvgPct })), avg: mean(rows.map(a => a.classAvgPct)) };
};

// ── Writes (teacher, own classes) ─────────────────────────────────────────────
const createAssessment = (a) => {
  const s = readStore();
  const id = 'as_' + Date.now();
  const row = { id, centreId: 'bm', classId: a.classId, subject: a.subject || '', title: String(a.title || '').trim() || 'Assessment', assessedOn: a.assessedOn, maxMarks: Number(a.maxMarks) || 100, createdBy: a.createdBy || null, published: false, source: 'manual' };
  writeStore({ ...s, assessments: [...s.assessments, row], results: { ...s.results, [id]: {} } });
  if (window.klasioAudit) window.klasioAudit('create_assessment', 'assessments', { id, classId: a.classId });
  return row;
};
const recordResults = (assessmentId, marksByStudent) => {
  const s = readStore();
  const cur = { ...(s.results[assessmentId] || {}) };
  Object.entries(marksByStudent || {}).forEach(([sid, m]) => {
    if (m === '' || m == null || isNaN(Number(m))) delete cur[sid];
    else cur[sid] = { marks: Number(m), comment: (cur[sid] && cur[sid].comment) || '' };
  });
  writeStore({ ...s, results: { ...s.results, [assessmentId]: cur } });
};
const setPublished = (assessmentId, on) => {
  const s = readStore();
  if (String(assessmentId).startsWith('trk:')) {
    writeStore({ ...s, trackerPublished: { ...(s.trackerPublished || {}), [assessmentId]: !!on } });
  } else {
    writeStore({ ...s, assessments: s.assessments.map(a => a.id === assessmentId ? { ...a, published: !!on } : a) });
  }
  if (window.klasioAudit) window.klasioAudit(on ? 'publish_results' : 'unpublish_results', 'assessments', { id: assessmentId });
};
const deleteAssessment = (assessmentId) => {
  const s = readStore();
  const results = { ...s.results }; delete results[assessmentId];
  writeStore({ ...s, assessments: s.assessments.filter(a => a.id !== assessmentId), results });
};

// ── Predicted & target grades — teacher judgement, STORED (decision #28) ───────
// A predicted grade is a professional call a teacher makes and owns, not
// "attainment + 4". One row per pupil per SUBJECT (production: student_targets,
// UNIQUE (student_id, subject_id)) — a qualification has one prediction, so two
// classes in the same subject share it. Set on the class Progress tab; callers pass
// a class id and it resolves to that class's subject. A pupil with no row has no
// prediction — every surface says "Not set yet" and may show the indicative grade
// beside it, labelled.
// Seeded deterministically from each pupil's baseline, with about one pupil in six
// left unset so the empty state is visible in the demo.
const TG_KEY = 'klasio.targets.v1';
const TG_EVENT = 'klasio-targets-changed';
const tgKey = (studentId, subject) => `${studentId}__${String(subject || '').toLowerCase()}`;
const subjectForClass = (classId) => { const c = (readAdmin().classes || []).find(x => x.id === classId); return c ? subjectOf(c.name) : null; };
const levelForClass = (cls, student) => {
  const n = String((cls && cls.name) || '');
  if (/A-?Level|AS-?Level/i.test(n)) return 'A-Level';
  if (/GCSE/i.test(n)) return 'GCSE';
  if (/KS3/i.test(n)) return 'KS3';
  return window.klasioGrades ? window.klasioGrades.levelForYear(student && student.year) : 'GCSE';
};
const buildTargetSeed = () => {
  const G = window.klasioGrades;
  const base = window.SEED_ATTAINMENT_BASELINE || {};
  const rows = {};
  if (!G) return { rows };
  const teachers = window.SEED_TEACHERS || [];
  (window.SEED_CLASSES || []).filter(c => c.status === 'active').forEach(cls => {
    const t = teachers.find(x => x.name === cls.teacher);
    (window.SEED_STUDENTS || []).filter(s => (s.classIds || []).includes(cls.id) && base[s.id] != null).forEach(s => {
      const subject = subjectOf(cls.name);
      const k = tgKey(s.id, subject);
      const h = hash(s.id + cls.id + 'target');
      if (rows[k] || h % 6 === 0) return;
      const level = levelForClass(cls, s);
      rows[k] = {
        studentId: s.id, subject,
        predicted: G.pctToGrade(clamp(base[s.id] + (h % 5) - 1, 0, 100), { level }),
        target: G.pctToGrade(clamp(base[s.id] + 6 + (h % 4), 0, 100), { level }),
        setBy: t ? t.id : null, setAt: '2026-06-15',
      };
    });
  });
  return { rows };
};
const readTargets = () => {
  try { const raw = localStorage.getItem(TG_KEY); if (raw) { const p = JSON.parse(raw); if (p && p.rows) return p; } } catch (e) {}
  if (!readTargets._seed) readTargets._seed = buildTargetSeed();
  return readTargets._seed;
};
const getTarget = (studentId, classId) => readTargets().rows[tgKey(studentId, subjectForClass(classId))] || null;
// The class's pupils' rows, for its subject.
const targetsForClass = (classId) => {
  const subj = String(subjectForClass(classId) || '').toLowerCase();
  const out = {};
  Object.values(readTargets().rows).forEach(r => { if (String(r.subject || '').toLowerCase() === subj) out[r.studentId] = r; });
  return out;
};
// patch: { predicted?, target? } — '' or null clears that grade; a row with neither is removed.
const setTarget = (studentId, classId, patch, by) => {
  const s = readTargets();
  const subject = subjectForClass(classId);
  const k = tgKey(studentId, subject);
  const prev = s.rows[k] || { studentId, subject, predicted: null, target: null };
  const next = { ...prev };
  ['predicted', 'target'].forEach(f => { if (patch && f in patch) next[f] = patch[f] || null; });
  next.setBy = by || prev.setBy || null;
  next.setAt = (window.attIso && window.getNow) ? window.attIso(new Date(window.getNow())) : new Date().toISOString().slice(0, 10);
  const rows = { ...s.rows };
  if (!next.predicted && !next.target) delete rows[k]; else rows[k] = next;
  try { localStorage.setItem(TG_KEY, JSON.stringify({ rows })); } catch (e) {}
  readTargets._seed = null;
  if (window.klasioAudit) window.klasioAudit('set_student_target', 'student_targets', { studentId, subject, predicted: next.predicted, target: next.target });
  try { window.dispatchEvent(new CustomEvent(TG_EVENT)); } catch (e) {}
  return rows[k] || null;
};

// Re-render on any assessment or target write (and on focus, which covers tracker edits).
const useAssessments = () => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const fn = () => setTick(t => t + 1);
    window.addEventListener(AS_EVENT, fn);
    window.addEventListener(TG_EVENT, fn);
    window.addEventListener('focus', fn);
    return () => { window.removeEventListener(AS_EVENT, fn); window.removeEventListener(TG_EVENT, fn); window.removeEventListener('focus', fn); };
  }, []);
  return window.klasioScores;
};

// ── Display ───────────────────────────────────────────────────────────────────
// The indicative grade for a percentage on the pupil's own scale (GCSE 9–1 /
// A-Level A*–E / KS3 descriptors) — labelled indicative wherever it is shown.
const indicativeGrade = (pct, ctx) => (pct == null || !window.klasioGrades) ? null : window.klasioGrades.pctToGrade(pct, ctx || {});

Object.assign(window, {
  klasioScores: {
    getStudentScoreSeries, attainmentSeries, homeworkSeries, attainmentAvg, isDeclining, trendOf,
    classAssessments, classAttainment, indicativeGrade,
    createAssessment, recordResults, setPublished, deleteAssessment,
  },
  klasioTargets: { get: getTarget, forClass: targetsForClass, set: setTarget, levelForClass, KEY: TG_KEY },
  useAssessments,
  // Convenience for roster tables: a pupil's attainment average, or null.
  studentAttainment: (s) => (s && s.id ? attainmentAvg(s.id) : null),
});

})();
