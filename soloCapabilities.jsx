// ══════════════════════════════════════════════════════════════════════════════
//  Solo tutor demo — capability module (the ONLY file that knows tier ids)
// ──────────────────────────────────────────────────────────────────────────────
//  The solo private-tutor demo account runs on one of three subscription tiers.
//  Every nav item, page and card in the solo surface asks this module what the
//  active tier can do, through flat boolean / numeric capability keys. Nothing
//  outside this file compares a tier id — a tier comparison anywhere else is a
//  defect. Tier metadata (plan name, price, demo book size) lives here too so
//  the plan cards and upgrade copy never hard-code a tier either.
//
//  Tier ids are deliberately distinct from the account id (`solo`) so a grep for
//  a tier value only ever lands in this file.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const MB = 1024 * 1024;
const GB = 1024 * MB;

const CAPABILITIES = {
  solo_free: {
    groupLessons: false, lessonPlanner: false, tracking: false, homework: false, homeworkBank: false,
    reports: false, reportRules: false, atRiskFlags: false, paymentReminders: false, vat: false,
    analyticsExports: false, waitingList: false,
    maxStudents: 3, maxInvoicesPerMonth: 3, storageBytes: 250 * MB,
  },
  solo_core: {
    groupLessons: true, lessonPlanner: true, tracking: true, homework: true, homeworkBank: false,
    reports: true, reportRules: false, atRiskFlags: false, paymentReminders: false, vat: false,
    analyticsExports: false, waitingList: false,
    maxStudents: 25, maxInvoicesPerMonth: Infinity, storageBytes: 2 * GB,
  },
  solo_pro: {
    groupLessons: true, lessonPlanner: true, tracking: true, homework: true, homeworkBank: true,
    reports: true, reportRules: true, atRiskFlags: true, paymentReminders: true, vat: true,
    analyticsExports: true, waitingList: true,
    maxStudents: 60, maxInvoicesPerMonth: Infinity, storageBytes: 10 * GB,
  },
};

// Plan metadata, in ascending order. `demoStudents` is how much of the one demo
// roster is on the books at this tier — the same students, growing down the list.
// `demoStorageBytes` is the demo's used storage at that book size.
const TIERS = [
  { id: 'solo_free', label: 'Solo Free', audience: 'Just starting out',          monthly: 0,  yearly: 0,   demoStudents: 3,  demoStorageBytes: 180 * MB },
  { id: 'solo_core', label: 'Solo',      audience: 'Tutoring as your main work', monthly: 11, yearly: 110, demoStudents: 18, demoStorageBytes: 1.5 * GB },
  { id: 'solo_pro',  label: 'Solo Pro',  audience: 'A full book, run tightly',   monthly: 24, yearly: 240, demoStudents: 42, demoStorageBytes: 4.1 * GB },
];

const DEFAULT_TIER = 'solo_core';

const tierIndex = (id) => {
  const i = TIERS.findIndex(t => t.id === id);
  return i < 0 ? TIERS.findIndex(t => t.id === DEFAULT_TIER) : i;
};

// Capabilities for a tier (unknown ids resolve to the default tier).
const getSoloCapabilities = (id) => CAPABILITIES[TIERS[tierIndex(id)].id];

// Plan metadata for a tier.
const getSoloTier = (id) => TIERS[tierIndex(id)];

// Every tier, ascending, each with its capabilities attached.
const listSoloTiers = () => TIERS.map(t => ({ ...t, caps: CAPABILITIES[t.id] }));

// The next tier up (with capabilities), or null at the top.
const soloNextTier = (id) => {
  const next = TIERS[tierIndex(id) + 1];
  return next ? { ...next, caps: CAPABILITIES[next.id] } : null;
};

// -1 / 0 / 1 — whether tier `a` sits below, level with, or above tier `b`.
// Used by the plan cards to word "Choose" vs "Move to".
const compareSoloTiers = (a, b) => Math.sign(tierIndex(a) - tierIndex(b));

Object.assign(window, {
  SOLO_DEFAULT_TIER: DEFAULT_TIER,
  getSoloCapabilities, getSoloTier, listSoloTiers, soloNextTier, compareSoloTiers,
});

})();
