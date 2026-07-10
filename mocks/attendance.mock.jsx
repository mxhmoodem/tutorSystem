// ══════════════════════════════════════════════════════════════════════════════
//  Mock data — Attendance / Register (session-scoped rebuild)
//  Loaded as a global script before attendance.jsx + TeacherPages.jsx (see index.html).
//  Depends on nothing but the browser clock; consumed by attendance.jsx.
//
//  WHY THIS FILE EXISTS
//  A register belongs to a *session* — one concrete dated occurrence of a class on
//  the timetable — not to a class *group*. The repo has no materialised `sessions`,
//  `enrolments` or `attendance_records` layer (see Step 0 inventory), so this file
//  models the shipped data schema faithfully in fixtures. sessions are materialised
//  in attendance.jsx by expanding the teacher's store.classes across a fixed window
//  around a reference "now"; this file supplies:
//    • REGISTER_SETTINGS      — the future centre_register_settings row (window durations)
//    • getNow / now-nudge      — one injectable clock the whole screen reads from
//    • ATT_SEED_DELIVERED      — which past sessions already have a submitted register
//    • ATT_SEED_CANCELLED      — the one cancelled session in the spread
//  Every rollup (rate, counts, recent sessions, delivered hours) is DERIVED from these
//  in attendance.jsx — nothing here is a hardcoded rollup number.
// ══════════════════════════════════════════════════════════════════════════════

const ATT_MIN = 60 * 1000; // one minute in ms

// ── Injectable clock ──────────────────────────────────────────────────────────
// Every lifecycle state derives from this single `now`, defaulting to a fixed
// reference so the demo spread is stable. 2026-07-10 is a FRIDAY — Sarah Clarke's
// heaviest teaching day (4 sessions) — so "today" is rich. A dev-only nudge control
// (attendance.jsx) offsets it so upcoming→live→awaiting→lapsed can be demonstrated
// without waiting for the wall clock. Never shipped to product UI (D7).
const ATT_REFERENCE_NOW = new Date(2026, 6, 10, 13, 15, 0, 0); // Fri 10 Jul 2026, 13:15 local
const ATT_NOW_OFFSET_KEY = 'tutoros.attendance.nowOffset.v1';

const attNowOffset = () => { try { return Number(localStorage.getItem(ATT_NOW_OFFSET_KEY)) || 0; } catch (e) { return 0; } };
const attSetNowOffset = (ms) => { try { localStorage.setItem(ATT_NOW_OFFSET_KEY, String(ms || 0)); } catch (e) {} };
const getNow = () => ATT_REFERENCE_NOW.getTime() + attNowOffset();

// ── Centre register settings (stands in for the future centre-level row) ───────
// Human-facing UI never surfaces these variable names — only labels like
// "Opens 3:00pm" or "Late — reason required" (see attendance.jsx).
const REGISTER_SETTINGS = {
  pre_open_window:  0,            // minutes before start the register opens (D2: 0m)
  grace_window:     'eod',        // 'eod' = open freely until the end of the session's day (D2)
  backfill_window:  48 * 60,      // minutes after a session ends a late register is still allowed (D2: 48h)
  amendment_window: 24 * 60,      // minutes after submission a student mark stays amendable (D2/D4: 24h)
  require_late_reason: true,      // D3 — awaiting/backfill registers require a reason note
};

// ── Seed: which past sessions already carry a submitted register ───────────────
// sessionId = `${classId}|${YYYY-MM-DD}` — the same stable id attendance.jsx
// materialises. Dates are relative to the Friday reference above:
//   today (Fri 10 Jul) · Thu 9 · Wed 8 · Tue 7 · Mon 6 · prev-Fri 3 · etc.
// Everything NOT seeded here and NOT cancelled stays unregistered, so the lifecycle
// states emerge purely from where each session's dates sit relative to `now`.
// `at` is the submission timestamp — it drives the amendment-window lock (D4):
// today's submission is inside the 24h window (amend allowed); older ones are locked.
const ATT_SEED_DELIVERED = [
  // Sarah's classes: c1 Fri 09:00, c2 Fri 10:30, c3 Fri 13:00, c4 Fri 15:00,
  //                  c34 Mon 09:00, c35 Wed 13:00, c36 Tue 11:00, c37 Thu 09:00
  { sessionId: 'c1|2026-07-10',  at: '2026-07-10T10:35:00' }, // today, recorded — amend still OPEN
  { sessionId: 'c35|2026-07-08', at: '2026-07-08T14:35:00' }, // Wed, recorded — amend LOCKED (>24h)
  { sessionId: 'c34|2026-07-06', at: '2026-07-06T10:35:00' }, // Mon, recorded
  { sessionId: 'c1|2026-07-03',  at: '2026-07-03T10:35:00' }, // prev Fri
  { sessionId: 'c2|2026-07-03',  at: '2026-07-03T12:05:00' }, // prev Fri
  { sessionId: 'c3|2026-07-03',  at: '2026-07-03T14:35:00' }, // prev Fri
  { sessionId: 'c35|2026-07-01', at: '2026-07-01T14:35:00' }, // prev Wed
  { sessionId: 'c37|2026-07-02', at: '2026-07-02T10:35:00' }, // prev Thu
  { sessionId: 'c36|2026-06-30', at: '2026-06-30T12:35:00' }, // prev Tue
  { sessionId: 'c34|2026-06-29', at: '2026-06-29T10:35:00' }, // prev Mon
];

// One cancelled session in the spread — excluded from the attendance-rate
// denominator (Part B). Reuses the same stable sessionId scheme.
const ATT_SEED_CANCELLED = ['c4|2026-07-03']; // prev Fri, Year 9 – Group C cancelled

// Sessions deliberately LEFT unregistered so their derived state is visible:
//   • c2|2026-07-10 (ended earlier today)      → open_live (grace = end of day)
//   • c3|2026-07-10 (live now, 13:00–14:30)    → open_live + "live now"
//   • c4|2026-07-10 (15:00 later today)        → upcoming
//   • c37|2026-07-09 (yesterday, unregistered) → awaiting (late — reason required)
//   • c36|2026-07-07 (Tue, days ago)           → lapsed (admin-only)
// (documentation only — no data needed; the dates do the work)

Object.assign(window, {
  ATT_MIN, ATT_REFERENCE_NOW, ATT_NOW_OFFSET_KEY,
  attNowOffset, attSetNowOffset, getNow,
  REGISTER_SETTINGS, ATT_SEED_DELIVERED, ATT_SEED_CANCELLED,
});
