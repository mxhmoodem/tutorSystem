// ══════════════════════════════════════════════════════════════
//  Mock data — Timesheets / Teacher working hours
//  Loaded as a global script before Timesheets.jsx (see index.html).
//
//  SEED_TIME_ENTRIES seeds the localStorage store `tutoros.timesheets.v2`.
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

  // ─────────────────────────────────────────────────────────────
  //  THIS WEEK — wider staff (Mon 22 – Fri 26 Jun 2026), mixed
  //  statuses/types so the admin overview lists every teacher with
  //  pending/approved totals and the derived pay shows variety
  //  (salaried → no pay, hourly → paid, cover → paid extra).
  // ─────────────────────────────────────────────────────────────
  //  Priya Nair (t2) — salaried: hours recorded, never pay-eligible
  { id:'te_p01', centreId:TS_SEED_CENTRE, teacherId:'t2', sessionId:'c5|2026-06-24',  type:'teaching', date:'2026-06-24', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_p02', centreId:TS_SEED_CENTRE, teacherId:'t2', sessionId:'c6|2026-06-24',  type:'teaching', date:'2026-06-24', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_p03', centreId:TS_SEED_CENTRE, teacherId:'t2', sessionId:null,             type:'prep',     date:'2026-06-22', durationMinutes:45,  status:'submitted', note:'Set up Year 10 cells practical',     approvedBy:null, approvedAt:null },

  //  Marcus Webb (t4)
  { id:'te_m01', centreId:TS_SEED_CENTRE, teacherId:'t4', sessionId:'c8|2026-06-23',  type:'teaching', date:'2026-06-23', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_m02', centreId:TS_SEED_CENTRE, teacherId:'t4', sessionId:'c23|2026-06-24', type:'teaching', date:'2026-06-24', durationMinutes:105, status:'submitted', note:'Ran 15 min over — essay feedback',   approvedBy:null, approvedAt:null },
  { id:'te_m03', centreId:TS_SEED_CENTRE, teacherId:'t4', sessionId:null,             type:'marking',  date:'2026-06-25', durationMinutes:90,  status:'draft',     note:'Year 11 mock essays',               approvedBy:null, approvedAt:null },

  //  Helen Yoo (t5) — closed out this week
  { id:'te_h01', centreId:TS_SEED_CENTRE, teacherId:'t5', sessionId:'c9|2026-06-22',  type:'teaching', date:'2026-06-22', durationMinutes:90,  status:'approved',  note:'',                                  approvedBy:'a1', approvedAt:'2026-06-26T08:30:00' },
  { id:'te_h02', centreId:TS_SEED_CENTRE, teacherId:'t5', sessionId:'c24|2026-06-24', type:'teaching', date:'2026-06-24', durationMinutes:90,  status:'approved',  note:'',                                  approvedBy:'a1', approvedAt:'2026-06-26T08:30:00' },
  { id:'te_h03', centreId:TS_SEED_CENTRE, teacherId:'t5', sessionId:null,             type:'meeting',  date:'2026-06-23', durationMinutes:30,  status:'approved',  note:'Humanities planning',               approvedBy:'a1', approvedAt:'2026-06-26T08:30:00' },

  //  Daniel Mehta (t6)
  { id:'te_n01', centreId:TS_SEED_CENTRE, teacherId:'t6', sessionId:'c10|2026-06-23', type:'teaching', date:'2026-06-23', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_n02', centreId:TS_SEED_CENTRE, teacherId:'t6', sessionId:'c11|2026-06-25', type:'teaching', date:'2026-06-25', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_n03', centreId:TS_SEED_CENTRE, teacherId:'t6', sessionId:'c29|2026-06-26', type:'teaching', date:'2026-06-26', durationMinutes:90,  status:'draft',     note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_n04', centreId:TS_SEED_CENTRE, teacherId:'t6', sessionId:null,             type:'training', date:'2026-06-22', durationMinutes:90,  status:'submitted', note:'New exam-board spec briefing',       approvedBy:null, approvedAt:null },

  //  Aisha Begum (t7)
  { id:'te_a01', centreId:TS_SEED_CENTRE, teacherId:'t7', sessionId:'c12|2026-06-22', type:'teaching', date:'2026-06-22', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_a02', centreId:TS_SEED_CENTRE, teacherId:'t7', sessionId:'c18|2026-06-23', type:'teaching', date:'2026-06-23', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_a03', centreId:TS_SEED_CENTRE, teacherId:'t7', sessionId:null,             type:'prep',     date:'2026-06-24', durationMinutes:60,  status:'draft',     note:'Fieldwork data pack',               approvedBy:null, approvedAt:null },

  //  Tom Rivera (t8) — hourly: teaching + a covered session both pay-eligible
  { id:'te_t01', centreId:TS_SEED_CENTRE, teacherId:'t8', sessionId:'c14|2026-06-22', type:'teaching', date:'2026-06-22', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_t02', centreId:TS_SEED_CENTRE, teacherId:'t8', sessionId:'c25|2026-06-25', type:'teaching', date:'2026-06-25', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_t03', centreId:TS_SEED_CENTRE, teacherId:'t8', sessionId:'c9|2026-06-15',  type:'cover',    date:'2026-06-15', durationMinutes:90,  status:'approved',  note:'Covered for Helen Yoo (Year 11 History)', approvedBy:'a1', approvedAt:'2026-06-22T10:05:00' },
  { id:'te_t04', centreId:TS_SEED_CENTRE, teacherId:'t8', sessionId:null,             type:'marking',  date:'2026-06-26', durationMinutes:45,  status:'submitted', note:'Year 10 algebra retakes',           approvedBy:null, approvedAt:null },

  //  Claire Dubois (t9)
  { id:'te_c01', centreId:TS_SEED_CENTRE, teacherId:'t9', sessionId:'c15|2026-06-22', type:'teaching', date:'2026-06-22', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_c02', centreId:TS_SEED_CENTRE, teacherId:'t9', sessionId:'c19|2026-06-23', type:'teaching', date:'2026-06-23', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_c03', centreId:TS_SEED_CENTRE, teacherId:'t9', sessionId:'c26|2026-06-25', type:'teaching', date:'2026-06-25', durationMinutes:90,  status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },

  //  James Okafor (t10) — last week closed (approved + exported), one new submission
  { id:'te_j01', centreId:TS_SEED_CENTRE, teacherId:'t10', sessionId:'c16|2026-06-22', type:'teaching', date:'2026-06-22', durationMinutes:90, status:'approved',  note:'',                                  approvedBy:'a1', approvedAt:'2026-06-26T08:40:00' },
  { id:'te_j02', centreId:TS_SEED_CENTRE, teacherId:'t10', sessionId:'c21|2026-06-24', type:'teaching', date:'2026-06-24', durationMinutes:90, status:'exported',  note:'',                                  approvedBy:'a1', approvedAt:'2026-06-26T08:40:00' },
  { id:'te_j03', centreId:TS_SEED_CENTRE, teacherId:'t10', sessionId:'c28|2026-06-26', type:'teaching', date:'2026-06-26', durationMinutes:90, status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },

  //  Rebecca Stone (t11)
  { id:'te_r01', centreId:TS_SEED_CENTRE, teacherId:'t11', sessionId:'c17|2026-06-23', type:'teaching', date:'2026-06-23', durationMinutes:90, status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_r02', centreId:TS_SEED_CENTRE, teacherId:'t11', sessionId:'c22|2026-06-24', type:'teaching', date:'2026-06-24', durationMinutes:90, status:'submitted', note:'',                                  approvedBy:null, approvedAt:null },
  { id:'te_r03', centreId:TS_SEED_CENTRE, teacherId:'t11', sessionId:null,             type:'meeting',  date:'2026-06-25', durationMinutes:45, status:'submitted', note:'Sixth-form options evening prep',    approvedBy:null, approvedAt:null },
];
