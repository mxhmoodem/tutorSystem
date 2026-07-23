// ══════════════════════════════════════════════════════════════
//  Mock data — Timesheets / Teacher working hours
//  Loaded as a global script before Timesheets.jsx (see index.html),
//  and AFTER adminPages.mock.jsx — so SEED_CLASSES / SEED_TEACHERS are
//  already defined and we can generate against the real roster.
//
//  SEED_TIME_ENTRIES seeds the localStorage store `tutoros.timesheets.v3`.
//  One TimeEntry per row:
//    { id, centreId, teacherId, sessionId, type, date, durationMinutes,
//      status, note, approvedBy, approvedAt }
//
//  sessionId  — `${classId}|${YYYY-MM-DD}` for a teaching entry captured off
//               the register; null for a manually-added non-teaching entry.
//  teacherId  — matches SEED_TEACHERS ids (t1 = Heebz A, t3 = David Park).
//  classId    — matches SEED_CLASSES ids.
//  status     — draft | submitted | approved | rejected | exported.
//
//  ── Generated RELATIVE TO TODAY ──────────────────────────────────────────────
//  The whole set is built from `new Date()` every load, so the demo ALWAYS has
//  live hours in the current period (this week / fortnight / month), whenever it
//  is opened — rather than drifting out of range as the fixed prototype date
//  moves on. Four weeks are produced (this week + the three before it):
//    • this week      — drafts (ready to submit) + a few already submitted
//    • last week      — mostly approved, a few still awaiting, one sent back
//    • older weeks    — closed out (approved / exported)
//  Teaching lines come off each active class on its scheduled weekday; only
//  sessions on or before today are logged. Non-teaching time (prep / marking /
//  meetings / training) and a handful of cover sessions round it out so the pay
//  derivation shows variety (salaried → no pay, hourly → paid, cover → paid).
// ══════════════════════════════════════════════════════════════

const TS_SEED_CENTRE = 'centre-001';   // single demo centre (matches the Invoices tenant)

// ─── Self-contained local-date helpers (ts* helpers in Timesheets.jsx aren't
//     loaded yet). Local calendar parts only — no UTC round-trip, so no off-by-one.
const _tsToday   = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
const _tsISO     = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const _tsAddDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const _tsMonday  = (d) => { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); return x; }; // Monday of d's week
const _TS_TODAY_ISO = _tsISO(_tsToday);
const _TS_DAY_OFFSET = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

// Minutes from a class time string like "09:00–10:30" (falls back to 90).
const _tsMins = (time) => {
  if (!time) return 90;
  const p = String(time).split(/[–-]/).map(s => s.trim());
  const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const a = toMin(p[0]), b = toMin(p[1]);
  return (a != null && b != null && b > a) ? b - a : 90;
};
const _tsClasses  = (typeof SEED_CLASSES  !== 'undefined' ? SEED_CLASSES  : (window.SEED_CLASSES  || []));
const _tsTeachers = (typeof SEED_TEACHERS !== 'undefined' ? SEED_TEACHERS : (window.SEED_TEACHERS || []));
const _tsTeacherId = (name) => { const t = _tsTeachers.find(x => x.name === name); return t ? t.id : null; };

// Non-session time pools — rotated per teacher/week so notes read naturally.
const _TS_NONSESSION = {
  prep:     ['Lesson planning & resources', 'Prepared past-paper walkthrough', 'Set up practical / worksheets', 'Built revision sequence'],
  marking:  ['Marked class assessment', 'Marked mock essays', 'Marked homework batch', 'Feedback on retakes'],
  meeting:  ['Department catch-up', 'Parents’ evening prep', 'Safeguarding briefing', 'Curriculum planning'],
  training: ['Safeguarding annual refresher', 'New exam-board spec briefing', 'CPD — assessment for learning', 'First-aid refresher'],
};

// Cover sessions (delivered by someone other than the rostered teacher) — keyed
// `${classId}|${weeksAgo}`; the teaching loop emits these INSTEAD of the rostered
// line so a session is never double-counted. Cover teachers are hourly for pay variety.
const _TS_COVER = {
  'c9|1':  { by: 't8', note: 'Covered for Helen Yoo (Year 11 History)' },   // Tom Rivera (hourly)
  'c14|1': { by: 't3', note: 'Covered for Tom Rivera (Year 10 Maths)' },    // David Park (hourly)
  'c5|2':  { by: 't8', note: 'Covered for Priya Nair (Year 10 Science)' },  // Tom Rivera (hourly)
};

const _tsBuildSeed = () => {
  const entries = [];
  const thisMon = _tsMonday(_tsToday);
  const WEEKS = 4;                       // this week + three before it
  let seq = 0;
  const uid = () => `te_${String(++seq).padStart(3, '0')}`;
  // Approval stamp: the Monday after the session's week, ~09:15.
  const approvedStamp = (weekMon) => `${_tsISO(_tsAddDays(weekMon, 7))}T09:15:00`;

  for (let w = 0; w < WEEKS; w++) {
    const weekMon = _tsAddDays(thisMon, -7 * w);
    const stamp = approvedStamp(weekMon);

    // ── Teaching (from the register) — one line per active class on its day ──
    let ti = 0;
    _tsClasses.forEach(cls => {
      if (cls.status && cls.status !== 'active') return;
      const off = _TS_DAY_OFFSET[cls.day];
      if (off == null) return;
      const iso = _tsISO(_tsAddDays(weekMon, off));
      if (iso > _TS_TODAY_ISO) return;            // session hasn't happened yet
      const cover = _TS_COVER[`${cls.id}|${w}`];
      const teacherId = cover ? cover.by : _tsTeacherId(cls.teacher);
      if (!teacherId) return;
      const i = ti++;

      // Status by recency. Cover lines are always past → approved.
      let status;
      if (cover) status = 'approved';
      else if (w === 0) status = (iso === _TS_TODAY_ISO) ? 'draft' : (i % 3 === 0 ? 'draft' : 'submitted');
      else if (w === 1) status = (i % 5 === 0) ? 'submitted' : 'approved';
      else status = (i % 2 === 0) ? 'exported' : 'approved';

      const approved = status === 'approved' || status === 'exported';
      // A touch of "ran over" variety on a few lines.
      const mins = _tsMins(cls.time) + (i % 7 === 3 ? 15 : 0);
      entries.push({
        id: uid(), centreId: TS_SEED_CENTRE, teacherId,
        sessionId: `${cls.id}|${iso}`, type: cover ? 'cover' : 'teaching', date: iso,
        durationMinutes: mins, status, note: cover ? cover.note : (mins > _tsMins(cls.time) ? 'Ran 15 min over' : ''),
        approvedBy: approved ? 'a1' : null, approvedAt: approved ? stamp : null,
      });
    });

    // ── Non-teaching time — 1–2 entries per active teacher per week ──
    _tsTeachers.filter(t => t.status === 'active').forEach((t, idx) => {
      const kinds = (idx % 2 === 0) ? ['prep', 'marking'] : ['meeting', (w % 2 === 0 ? 'training' : 'prep')];
      kinds.forEach((type, k) => {
        const dayOff = (idx + k * 2) % 5;                 // spread Mon–Fri
        const iso = _tsISO(_tsAddDays(weekMon, dayOff));
        if (iso > _TS_TODAY_ISO) return;
        const notes = _TS_NONSESSION[type];
        const note = notes[(idx + w) % notes.length];
        const mins = type === 'training' ? 90 : type === 'marking' ? 75 : type === 'meeting' ? 45 : 60;

        // One deliberate "sent back" example last week; otherwise mirror teaching cadence.
        let status;
        if (w === 1 && idx === 3 && k === 0) status = 'rejected';
        else if (w === 0) status = (idx % 2 === 0 && k === 0) ? 'draft' : 'submitted';
        else if (w === 1) status = (idx % 4 === 0) ? 'submitted' : 'approved';
        else status = 'approved';

        const approved = status === 'approved' || status === 'exported';
        entries.push({
          id: uid(), centreId: TS_SEED_CENTRE, teacherId: t.id, sessionId: null,
          type, date: iso, durationMinutes: mins,
          status, note: status === 'rejected' ? note + ' — duplicate, please remove' : note,
          approvedBy: approved ? 'a1' : null, approvedAt: approved ? stamp : null,
        });
      });
    });
  }

  // Newest first, matching the old fixed seed's ordering.
  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
};

const SEED_TIME_ENTRIES = _tsBuildSeed();
