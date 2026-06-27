// ══════════════════════════════════════════════════════════════
//  Mock data — Timesheets / Teacher working hours
//  Loaded as a global script before Timesheets.jsx (see index.html).
//
//  SEED_TIME_ENTRIES seeds the localStorage store `tutoros.timesheets.v1`.
//  One TimeEntry per row:
//    { id, centreId, teacherId, sessionId, type, date, durationMinutes,
//      status, note, approvedBy, approvedAt }
//
//  sessionId  — `${classId}|${YYYY-MM-DD}` for a teaching entry captured off
//               the register; null for a manually-added non-teaching entry.
//  teacherId  — matches SEED_TEACHERS ids (t1 = Sarah Clarke, t3 = David Park).
//  classId    — matches SEED_CLASSES ids (c1–c4 are Sarah's, c7/c13/c20 David's).
//  status     — draft | submitted | approved | rejected | exported.
//
//  Spread: two teachers across the current week (Mon 22 – Fri 26 Jun 2026) and
//  the previous week (Mon 15 – Fri 19 Jun 2026), in mixed statuses, so both the
//  teacher timesheet and the admin review surface demo with real content. The
//  current date in this prototype is Fri 2026-06-26.
// ══════════════════════════════════════════════════════════════

const TS_SEED_CENTRE = 'centre-001';   // single demo centre (matches the Invoices tenant)

const SEED_TIME_ENTRIES = [
  // ─────────────────────────────────────────────────────────────
  //  THIS WEEK — Sarah Clarke (t1)
  // ─────────────────────────────────────────────────────────────
  // Today's register captures — left as drafts, ready to submit.
  { id:'te_s01', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c1|2026-06-26', type:'teaching', date:'2026-06-26', durationMinutes:90,  status:'draft',     note:'',                                                  approvedBy:null, approvedAt:null },
  { id:'te_s02', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c2|2026-06-26', type:'teaching', date:'2026-06-26', durationMinutes:105, status:'draft',     note:'Ran 15 min over — finished the past-paper walkthrough', approvedBy:null, approvedAt:null },
  { id:'te_s03', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c3|2026-06-26', type:'teaching', date:'2026-06-26', durationMinutes:90,  status:'submitted', note:'',                                                  approvedBy:null, approvedAt:null },
  // Non-teaching time entered manually this week.
  { id:'te_s04', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:null,            type:'prep',     date:'2026-06-22', durationMinutes:60,  status:'submitted', note:'Planned the Year 11 mock revision sequence',        approvedBy:null, approvedAt:null },
  { id:'te_s05', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:null,            type:'marking',  date:'2026-06-24', durationMinutes:75,  status:'draft',     note:'Marked Year 10 algebra assessment',                 approvedBy:null, approvedAt:null },
  { id:'te_s06', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:null,            type:'meeting',  date:'2026-06-25', durationMinutes:45,  status:'submitted', note:'Maths department catch-up',                         approvedBy:null, approvedAt:null },

  // ─────────────────────────────────────────────────────────────
  //  THIS WEEK — David Park (t3) — submitted, awaiting admin review
  // ─────────────────────────────────────────────────────────────
  { id:'te_d01', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c20|2026-06-23', type:'teaching', date:'2026-06-23', durationMinutes:90,  status:'submitted', note:'',                              approvedBy:null, approvedAt:null },
  { id:'te_d02', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c7|2026-06-25',  type:'teaching', date:'2026-06-25', durationMinutes:90,  status:'submitted', note:'',                              approvedBy:null, approvedAt:null },
  { id:'te_d03', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c13|2026-06-25', type:'teaching', date:'2026-06-25', durationMinutes:100, status:'submitted', note:'Ran 10 min over',               approvedBy:null, approvedAt:null },
  { id:'te_d04', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:null,             type:'training', date:'2026-06-22', durationMinutes:120, status:'submitted', note:'Safeguarding annual refresher', approvedBy:null, approvedAt:null },

  // ─────────────────────────────────────────────────────────────
  //  PREVIOUS WEEK — Sarah Clarke (t1) — closed out (approved / exported / one sent back)
  // ─────────────────────────────────────────────────────────────
  { id:'te_s07', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c1|2026-06-19', type:'teaching', date:'2026-06-19', durationMinutes:90, status:'approved', note:'',                                       approvedBy:'a1', approvedAt:'2026-06-22T09:14:00' },
  { id:'te_s08', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c2|2026-06-19', type:'teaching', date:'2026-06-19', durationMinutes:90, status:'approved', note:'',                                       approvedBy:'a1', approvedAt:'2026-06-22T09:14:00' },
  { id:'te_s09', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c3|2026-06-19', type:'teaching', date:'2026-06-19', durationMinutes:90, status:'exported', note:'',                                       approvedBy:'a1', approvedAt:'2026-06-22T09:14:00' },
  { id:'te_s10', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:'c4|2026-06-19', type:'teaching', date:'2026-06-19', durationMinutes:90, status:'exported', note:'',                                       approvedBy:'a1', approvedAt:'2026-06-22T09:14:00' },
  { id:'te_s11', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:null,            type:'marking',  date:'2026-06-17', durationMinutes:60, status:'approved', note:'Marked Year 9 surds homework',           approvedBy:'a1', approvedAt:'2026-06-22T09:14:00' },
  { id:'te_s12', centreId:TS_SEED_CENTRE, teacherId:'t1', sessionId:null,            type:'meeting',  date:'2026-06-16', durationMinutes:45, status:'rejected', note:'Duplicate — already logged this catch-up', approvedBy:null,  approvedAt:null },

  // ─────────────────────────────────────────────────────────────
  //  PREVIOUS WEEK — David Park (t3) — approved, incl. a cover session
  // ─────────────────────────────────────────────────────────────
  { id:'te_d05', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c7|2026-06-18',  type:'teaching', date:'2026-06-18', durationMinutes:90, status:'approved', note:'',                                    approvedBy:'a1', approvedAt:'2026-06-22T09:20:00' },
  { id:'te_d06', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c13|2026-06-18', type:'teaching', date:'2026-06-18', durationMinutes:90, status:'approved', note:'',                                    approvedBy:'a1', approvedAt:'2026-06-22T09:20:00' },
  { id:'te_d07', centreId:TS_SEED_CENTRE, teacherId:'t3', sessionId:'c14|2026-06-15', type:'cover',    date:'2026-06-15', durationMinutes:90, status:'approved', note:'Covered for Tom Rivera (Year 10 Maths)', approvedBy:'a1', approvedAt:'2026-06-22T09:20:00' },
];
