// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — Lessons (reusable content) + planned lessons (deliveries) · #47
//  Exposed as window.klasioLessons + window.useLessons. Loaded after the mocks
//  (mocks/lessonPlanner.mock.jsx → LESSON_SEED) and before TeacherPages.jsx.
//
//  A LESSON is teaching content a teacher owns — title, topic, objectives,
//  structure, homework to set — with no class and no date. A PLANNED LESSON
//  ("delivery") schedules a lesson for ONE class on ONE date and holds only what
//  belongs to that delivery: notes for the group and the post-lesson reflection.
//
//  Edit a lesson once and every delivery gets it; a delivery's notes never
//  collide with another's, and a lesson shows its whole history ("taught 3 times;
//  Group C found part 2 hard"). A delivery that needs to diverge FORKS its lesson
//  into a new one rather than editing the shared copy.
//
//  Keys: deliveries are `${classId}__${date}` — class ID, never the group label, so
//  renaming a class orphans nothing. Materials attach to the LESSON through
//  resource links (context_type 'lesson'), so reusing a lesson brings its files.
//
//  Store: localStorage `klasio.lessons.v1` (production: lessons + lesson_plans).
//  On first load, plans a teacher saved under the old `klasio.lessonPlans.v1`
//  (one content blob per group+date) are migrated: each becomes a lesson plus
//  a delivery on the class that group label resolves to.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const LS_KEY = 'klasio.lessons.v1';
const LEGACY_KEY = 'klasio.lessonPlans.v1';
const LS_EVENT = 'klasio-lessons-changed';

const clone = (o) => JSON.parse(JSON.stringify(o || {}));
const readAdminClasses = () => {
  try { const p = JSON.parse(localStorage.getItem('admin_store_v4') || 'null'); if (p && p.classes) return p.classes; } catch (e) {}
  return window.SEED_CLASSES || [];
};

// Old per-group plans → lessons + deliveries (resolving the label to a class id,
// preferring the plan owner's own class when several share the label).
const migrateLegacy = (base) => {
  let legacy = null;
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch (e) { legacy = null; }
  if (!legacy) return base;
  const classes = readAdminClasses();
  const teachers = window.SEED_TEACHERS || [];
  const out = { lessons: { ...base.lessons }, deliveries: { ...base.deliveries } };
  Object.entries(legacy).forEach(([key, v]) => {
    if (!v || !v.plan) return;
    const group = v.group || String(key).split('__')[0];
    const date = v.date || String(key).split('__')[1];
    const ownerName = v.owner || (teachers.find(t => t.id === 't1') || {}).name;
    const cls = classes.find(c => c.group === group && c.teacher === ownerName) || classes.find(c => c.group === group);
    if (!cls || !date) return;
    const dId = `${cls.id}__${date}`;
    if (out.deliveries[dId]) return;                         // seed already covers it
    const lId = 'les_m_' + Math.abs([...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)).toString(36);
    const p = v.plan;
    out.lessons[lId] = { id: lId, ownerId: v.ownerId && /^t\d+$/.test(v.ownerId) ? v.ownerId : 't1', owner: v.owner || null,
      title: p.title || '', topic: p.topic || '', duration: p.duration || '60', objectives: p.objectives || '',
      agenda: p.agenda || '', homework: p.homework || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    out.deliveries[dId] = { id: dId, lessonId: lId, classId: cls.id, date, notes: p.notes || '', reflection: '', createdBy: out.lessons[lId].ownerId, updatedAt: new Date().toISOString() };
  });
  return out;
};

const read = () => {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const p = JSON.parse(raw); if (p && p.lessons && p.deliveries) return p; } } catch (e) {}
  if (!read._seed) read._seed = migrateLegacy(clone(window.LESSON_SEED || { lessons: {}, deliveries: {} }));
  return read._seed;
};
const write = (next) => {
  read._seed = null;
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent(LS_EVENT)); } catch (e) {}
};
const nowISO = () => new Date().toISOString();
const deliveryKey = (classId, date) => `${classId}__${date}`;

// ── Reads ─────────────────────────────────────────────────────────────────────
const getLesson = (id) => read().lessons[id] || null;
const listLessons = (ownerId) => Object.values(read().lessons)
  .filter(l => !ownerId || l.ownerId === ownerId)
  .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
const deliveryFor = (classId, date) => read().deliveries[deliveryKey(classId, date)] || null;
const deliveriesForClass = (classId) => Object.values(read().deliveries).filter(d => d.classId === classId).sort((a, b) => b.date.localeCompare(a.date));
const deliveriesForLesson = (lessonId) => Object.values(read().deliveries).filter(d => d.lessonId === lessonId).sort((a, b) => b.date.localeCompare(a.date));
const listDeliveries = (classIds) => {
  const set = classIds ? new Set(classIds) : null;
  return Object.values(read().deliveries).filter(d => !set || set.has(d.classId)).sort((a, b) => b.date.localeCompare(a.date));
};
// What a PUPIL may see of a planned lesson (decision #60). Only the lesson's title,
// topic and objectives, and only when the teacher ticked "Share with the class" on
// that delivery — default off. Notes for the group, the structure and the
// reflection are the teacher's working document and are never returned here.
const pupilSummaryFor = (classId, date) => {
  const d = deliveryFor(classId, date);
  if (!d || !d.shareWithClass) return null;
  const l = getLesson(d.lessonId);
  if (!l) return null;
  return { lessonId: l.id, title: l.title || '', topic: l.topic || '', objectives: l.objectives || '' };
};
// "Taught 3 times · last 24 Apr · next 10 Jul" — derived, never stored.
const usageOf = (lessonId, todayISO) => {
  const ds = deliveriesForLesson(lessonId);
  const t = todayISO || new Date().toISOString().slice(0, 10);
  const past = ds.filter(d => d.date <= t), future = ds.filter(d => d.date > t).sort((a, b) => a.date.localeCompare(b.date));
  return { deliveries: ds.length, taught: past.length, last: past[0] ? past[0].date : null, next: future[0] ? future[0].date : null };
};

// ── Writes ────────────────────────────────────────────────────────────────────
const saveLesson = (lesson) => {
  const s = read();
  const id = lesson.id || ('les_' + Date.now().toString(36));
  const prev = s.lessons[id] || { createdAt: nowISO() };
  const row = { ...prev, ...lesson, id, updatedAt: nowISO() };
  write({ ...s, lessons: { ...s.lessons, [id]: row } });
  return row;
};
// A lesson still planned for a class can't be deleted out from under it.
const deleteLesson = (id) => {
  const s = read();
  if (Object.values(s.deliveries).some(d => d.lessonId === id)) return false;
  const lessons = { ...s.lessons }; delete lessons[id];
  write({ ...s, lessons });
  return true;
};
const planDelivery = ({ classId, date, lessonId, notes, createdBy }) => {
  const s = read();
  const id = deliveryKey(classId, date);
  const prev = s.deliveries[id] || {};
  const row = { notes: '', reflection: '', ...prev, id, classId, date, lessonId, createdBy: prev.createdBy || createdBy || 't1', updatedAt: nowISO() };
  if (notes != null) row.notes = notes;
  write({ ...s, deliveries: { ...s.deliveries, [id]: row } });
  return row;
};
const updateDelivery = (id, patch) => {
  const s = read();
  if (!s.deliveries[id]) return null;
  const row = { ...s.deliveries[id], ...patch, updatedAt: nowISO() };
  write({ ...s, deliveries: { ...s.deliveries, [id]: row } });
  return row;
};
// Move a delivery to another class/date (its key changes with it).
const moveDelivery = (id, classId, date) => {
  const s = read();
  const d = s.deliveries[id];
  const nid = deliveryKey(classId, date);
  if (!d || (nid !== id && s.deliveries[nid])) return null;
  const deliveries = { ...s.deliveries }; delete deliveries[id];
  deliveries[nid] = { ...d, id: nid, classId, date, updatedAt: nowISO() };
  write({ ...s, deliveries });
  return deliveries[nid];
};
const deleteDelivery = (id) => {
  const s = read();
  const deliveries = { ...s.deliveries }; delete deliveries[id];
  write({ ...s, deliveries });
};
// This delivery needs its own version: copy the lesson and repoint ONLY this
// delivery at the copy. The other deliveries keep the shared lesson.
const forkLesson = (deliveryId) => {
  const s = read();
  const d = s.deliveries[deliveryId];
  const l = d && s.lessons[d.lessonId];
  if (!l) return null;
  const nid = 'les_' + Date.now().toString(36);
  const copy = { ...clone(l), id: nid, title: `${l.title} (copy)`, forkedFrom: l.id, createdAt: nowISO(), updatedAt: nowISO() };
  write({ ...s, lessons: { ...s.lessons, [nid]: copy }, deliveries: { ...s.deliveries, [deliveryId]: { ...d, lessonId: nid, updatedAt: nowISO() } } });
  return copy;
};

const useLessons = () => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const fn = () => setTick(t => t + 1);
    window.addEventListener(LS_EVENT, fn);
    return () => window.removeEventListener(LS_EVENT, fn);
  }, []);
  return window.klasioLessons;
};

window.klasioLessons = {
  getLesson, listLessons, deliveryFor, deliveriesForClass, deliveriesForLesson, listDeliveries, usageOf, pupilSummaryFor,
  saveLesson, deleteLesson, planDelivery, updateDelivery, moveDelivery, deleteDelivery, forkLesson, deliveryKey,
};
window.useLessons = useLessons;

})();
