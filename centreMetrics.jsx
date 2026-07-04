// ══════════════════════════════════════════════════════════════
//  Klayo — Centre-metrics selector layer (single source of truth)
//
//  Every centre rollup the admin/owner surface shows is DERIVED here from the
//  seed stores — no screen may hardcode a student / enrolment / seat / at-risk /
//  attendance / capacity / session figure again. This mirrors the discipline the
//  invoice, timesheet and storage ledgers already follow (and references them
//  rather than re-deriving them).
//
//  Frontend-only. Reads the localStorage stores non-reactively on each call:
//  localStorage isn't reactive across hook instances, so reading per-render keeps
//  values fresh on navigation (same pattern as readTermIndicator in index.html).
//
//  ── TENANT BOUNDARY (§9) ──────────────────────────────────────────────────
//  Every CENTRE-scoped selector takes a centreId and returns only that centre's
//  data. The single-tenant admin store (admin_store_v3) holds the primary centre
//  (bm) roster only, so other centres resolve to empty rollups until a real
//  multi-tenant backend exists. When that lands, swap cmReadRoster for a
//  per-centre query — the selector SIGNATURES don't change (that's the point).
//
//  The ACCOUNT-pooled selectors (getSeatUsage / getStoragePool) are the ONLY
//  ones that cross centre boundaries — the privileged account-owner aggregation
//  that maps to an RLS-bypassing service query later. Marked as such below.
//
//  Loads after the mocks + permissions.jsx and before the page modules. Every
//  window.* dependency (getPlan, stgUsageByAccount, invAggregate, …) is read
//  LAZILY at call time, so files that load after this one are still available by
//  the time anything renders.
// ══════════════════════════════════════════════════════════════
(() => {

const CM_PRIMARY_CENTRE = (window.ONB_CENTRE && window.ONB_CENTRE.id) || 'bm';

// ── Active centre (state-only; §4) ──────────────────────────────────────────
// The bottom-left sidebar switcher owns this via window.__setCentre/__getCentre.
// EVERY centre-scoped selector resolves its default centreId through here, so a
// future "encode the active centre in the URL" change is a one-line edit.
const getActiveCentreId = () => {
  try { if (window.__getCentre) return window.__getCentre(); } catch (e) {}
  return CM_PRIMARY_CENTRE;
};

// ── Store reads (non-reactive) ──────────────────────────────────────────────
const cmReadSub = () => {
  try { const raw = localStorage.getItem('tutoros.subscription.v2'); if (raw) return JSON.parse(raw); } catch (e) {}
  return window.ONB_SUBSCRIPTION || { centres: [], planId: 'growth' };
};
const cmReadRoster = () => {
  try {
    const raw = localStorage.getItem('admin_store_v4');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        teachers: p.teachers || window.SEED_TEACHERS || [],
        classes:  p.classes  || window.SEED_CLASSES  || [],
        students: p.students || window.SEED_STUDENTS || [],
      };
    }
  } catch (e) {}
  return { teachers: window.SEED_TEACHERS || [], classes: window.SEED_CLASSES || [], students: window.SEED_STUDENTS || [] };
};
// In this prototype only the primary centre carries a live roster.
const cmHasRoster = (centreId) => centreId === CM_PRIMARY_CENTRE;

// ── Centre profile (name / logo / accent / contact) — one per centre ────────
// The subscription's centre row (live-editable in Settings → Centre profile)
// merged OVER the CENTRE_PROFILES seed (logo + defaults). The ONLY place these
// identity fields are resolved for rendering.
const getCentreProfile = (centreId) => {
  const id = centreId || getActiveCentreId();
  const seed = (window.CENTRE_PROFILES && window.CENTRE_PROFILES[id]) || {};
  const sub = cmReadSub();
  const c = (sub.centres || []).find(x => x.id === id) || null;
  const name = (c && c.name) || seed.name || 'Your centre';
  return {
    id,
    accountId: seed.accountId || sub.accountId || 'acc_brightminds',
    name,
    logo: seed.logo || name.slice(0, 2).toUpperCase(),
    brandAccent: (c && c.accent) || seed.brandAccent || null,
    contactEmail: (c && c.email) || seed.contactEmail || '',
    contactPhone: (c && c.phone) || seed.contactPhone || '',
    address: (c && c.address) || seed.address || '',
    city: (c && c.city) || seed.city || '',
    region: (c && c.region) || seed.region || '',
  };
};
const getActiveCentre = () => getCentreProfile(getActiveCentreId());

// ── Roster selectors (centre-scoped) ────────────────────────────────────────
const getStudentsForCentre = (centreId) => cmHasRoster(centreId || getActiveCentreId()) ? cmReadRoster().students : [];
const getClassesForCentre  = (centreId) => cmHasRoster(centreId || getActiveCentreId()) ? cmReadRoster().classes  : [];
const getTeachersForCentre = (centreId) => cmHasRoster(centreId || getActiveCentreId()) ? cmReadRoster().teachers : [];

// A "pending"/"invited" account has been provisioned but not claimed — it is NOT
// part of the active headcount (excludes the seed's s16 Harry / s17 Lily noise).
const cmPending = (s) => !!(s.account && (s.account.status === 'pending' || s.account.status === 'invited'));

// Canonical "students" number = distinct ACTIVE headcount. Decision (4): headcount,
// NOT enrolment count. This is what the Dashboard and Students page both show.
// A single active-student predicate, exported so screens (Students page) filter
// their live store list by the SAME rule the counts use.
const isActiveStudent = (s) => !cmPending(s) && s.status !== 'inactive';
const getActiveStudents = (centreId) => getStudentsForCentre(centreId).filter(isActiveStudent);
const getActiveStudentCount = (centreId) => getActiveStudents(centreId).length;

// Σ roster sizes across classes — ENROLMENTS (one student in three classes = 3),
// the same figure the capacity bar's numerator uses. MUST be labelled
// "enrolments", never "students" (headcount is getActiveStudentCount).
const getClassEnrolments = (centreId) =>
  getClassesForCentre(centreId).reduce((n, c) => n + (c.students || 0), 0);

// ── ONE at-risk definition (§2 / §6) ────────────────────────────────────────
// A single threshold set, consolidating the three the app used to disagree on
// (Dashboard's 10-name array, Students' status filter, Reports' status filter).
// A student is at risk on a threshold breach OR an explicit staff flag. It is
// ADVISORY and EXPLAINABLE — never auto-actioned. Children's-Code (Part D)
// forbids opaque profiling of a minor, so the reason is always surfaced and a
// human keeps the decision.
const AT_RISK_THRESHOLDS = { attendance: 75, completion: 50, score: 55 };
const cmNum = (v, dflt) => (typeof v === 'number' ? v : dflt);
const atRiskReason = (s) => {
  if (cmNum(s.attendance, 100) < AT_RISK_THRESHOLDS.attendance) return `Attendance ${cmNum(s.attendance, 0)}%`;
  if (cmNum(s.hw, 100)         < AT_RISK_THRESHOLDS.completion) return `Homework ${cmNum(s.hw, 0)}%`;
  if (cmNum(s.score, 100)      < AT_RISK_THRESHOLDS.score)      return `Score ${cmNum(s.score, 0)}%`;
  if (s.status === 'at-risk') return 'Flagged by staff';
  return null;
};
const isAtRisk = (s) => atRiskReason(s) != null;
const getAtRiskStudents = (centreId) => getActiveStudents(centreId).filter(isAtRisk);

// ── Dashboard KPIs (centre-scoped) ──────────────────────────────────────────
const getAttendanceWeek = (centreId) => {
  const a = getActiveStudents(centreId).map(s => s.attendance).filter(n => typeof n === 'number' && n > 0);
  return a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 0;
};
const CM_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const getSessionsWeek = (centreId) => {
  const classes = getClassesForCentre(centreId).filter(c => c.status !== 'archived');
  const today = CM_DOW[new Date().getDay()];
  return { total: classes.length, today: classes.filter(c => c.day === today).length };
};
const getCapacityUsed = (centreId) => {
  const classes = getClassesForCentre(centreId);
  const cap  = classes.reduce((n, c) => n + (c.capacity || 0), 0);
  const used = classes.reduce((n, c) => n + (c.students  || 0), 0);
  return { used, cap, pct: cap ? Math.round((used / cap) * 100) : 0 };
};

// ── Invoice rollup — references the invoice ledger's own aggregator (never
//    forks it). Reads tutoros.invoices.v1; falls back to the seed. ───────────
const cmReadInvoices = () => {
  try {
    const raw = localStorage.getItem('tutoros.invoices.v1');
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; if (p && Array.isArray(p.invoices)) return p.invoices; }
  } catch (e) {}
  return window.SEED_INVOICES || [];
};
const getInvoiceRollup = (centreId) => {
  const invoices = cmReadInvoices();
  if (window.invAggregate) return window.invAggregate(invoices);
  return { billed: 0, collected: 0, outstanding: 0, overdue: 0 };
};

// ── ACCOUNT-pooled entitlements (§5) — the ONLY cross-centre aggregation ─────
// Pooled seats: an account-level entitlement read from PLAN_CATALOG, summed
// across the account's centres (like storage). Privileged owner aggregation.
const cmAccountCentreIds = () => {
  const sub = cmReadSub();
  const ids = (sub.centres || []).filter(c => c.status !== 'archived').map(c => c.id);
  return ids.length ? ids : [CM_PRIMARY_CENTRE];
};
const cmPlanFor = (account) => {
  const sub = cmReadSub();
  const planId = (account && account.planId) || sub.planId || 'growth';
  return (window.getPlan && window.getPlan(planId)) || (window.PLANS && window.PLANS[planId]) || { studentSeats: 0, teacherSeats: 0 };
};
// Pooled seat usage across the account, against the plan's pooled caps.
const getSeatUsage = (account) => {
  const ids = cmAccountCentreIds();
  const plan = cmPlanFor(account);
  let students = 0, teachers = 0;
  ids.forEach(id => { students += getStudentsForCentre(id).length; teachers += getTeachersForCentre(id).length; });
  return {
    students: { used: students, cap: plan.studentSeats || 0 },
    teachers: { used: teachers, cap: plan.teacherSeats || 0 },
  };
};
// Storage pool is ALREADY derived by Storage.jsx — reference it, don't fork.
const getStoragePool = (account) => {
  if (!window.stgUsageByAccount || !window.stgQuotaForAccount) return null;
  const sub = cmReadSub();
  const acctId = (account && account.accountId) || window.STG_SELF_ACCT || 'acc_brightminds';
  const planId = (account && account.planId) || sub.planId || 'growth';
  const GB = window.STORAGE_GB || (1024 * 1024 * 1024);
  return {
    usedGb:  +(window.stgUsageByAccount(acctId) / GB).toFixed(1),
    totalGb: Math.round(window.stgQuotaForAccount({ accountId: acctId, planId }) / GB),
  };
};

// ── Lightweight append-only audit log (§6/§9) ────────────────────────────────
// A single local write-path for security-relevant actions: ownership transfer,
// role change, CSV export (of minors' data), invoice issue/edit, reminder sent,
// timesheet approve/reject, and any view-as. Append-only + capped in localStorage;
// maps to a real audit table with RLS server-side later. Shape (per spec §6):
// { ts, actor, action, target, centreId }.
const AUDIT_KEY = 'tutoros.audit.v1';
const audit = (action, target, extra) => {
  try {
    const entry = {
      ts: new Date().toISOString(),
      actor: (window.ONB_SESSION && window.ONB_SESSION.email) || 'unknown',
      action: action || '', target: target || '',
      centreId: getActiveCentreId(),
      ...(extra || {}),
    };
    const arr = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    arr.push(entry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(arr.slice(-500)));   // capped; real audit is server-side
    return entry;
  } catch (e) { return null; }
};
const readAudit = () => { try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch (e) { return []; } };
// Convenience global so any screen can write one line without importing the module.
window.klayoAudit = audit;

window.centreMetrics = {
  // audit write-path (§6)
  audit, readAudit,
  // active centre + identity
  getActiveCentreId, getActiveCentre, getCentreProfile,
  // roster (centre-scoped)
  getStudentsForCentre, getClassesForCentre, getTeachersForCentre,
  getActiveStudents, getActiveStudentCount, getClassEnrolments,
  // at-risk (one definition)
  AT_RISK_THRESHOLDS, atRiskReason, isAtRisk, getAtRiskStudents, isActiveStudent,
  // KPIs
  getAttendanceWeek, getSessionsWeek, getCapacityUsed, getInvoiceRollup,
  // account-pooled
  getSeatUsage, getStoragePool,
};

})();
