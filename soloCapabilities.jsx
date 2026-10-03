// ══════════════════════════════════════════════════════════════════════════════
//  Solo tutor demo — capability module (the ONLY file that knows tier ids)
// ──────────────────────────────────────────────────────────────────────────────
//  The solo private-tutor demo account runs on one of the solo plans. Every nav
//  item, page and card in the solo surface asks this module what the active plan
//  can do, through flat boolean / numeric capability keys. Nothing outside this
//  file compares a tier id — a tier comparison anywhere else is a defect.
//
//  Solo plans live in the ONE platform plan catalogue (Plans.jsx, audience
//  'solo'), where the platform owner edits their prices, limits, capabilities and
//  pricing-page bullets on the console's Pricing page. This file:
//    • seeds those catalogue rows (soloPlanSeed) — the defaults below;
//    • reads the live values back (getSoloCapabilities / getSoloTier /
//      listSoloTiers), so an edit on the Pricing page reaches the solo demo;
//    • keeps the demo-only metadata the catalogue has no business holding — how
//      much of the one demo roster is on the books at each plan.
//
//  Tier ids are deliberately distinct from the account id (`solo`) so a grep for
//  a tier value only ever lands in this file.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const MB = 1024 * 1024;
const GB = 1024 * MB;

// ── Seed: what each plan is by default ────────────────────────────────────────
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
// The boolean keys, in catalogue order. The catalogue spells them snake_case
// (`group_lessons`) — the same keys as `plans.capabilities` in the reference.
const CAP_KEYS = ['groupLessons', 'lessonPlanner', 'tracking', 'homework', 'homeworkBank', 'reports',
  'reportRules', 'atRiskFlags', 'paymentReminders', 'vat', 'analyticsExports', 'waitingList'];
const snake = (k) => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());

// Plan metadata, in ascending order. `demoStudents` is how much of the one demo
// roster is on the books at this plan — the same students, growing down the list.
// `demoStorageBytes` is the demo's used storage at that book size. Both are demo
// fixtures, not plan facts, so they stay here rather than in the catalogue.
const TIERS = [
  { id: 'solo_free', label: 'Solo Free', audience: 'Just starting out',          monthly: 0,  yearly: 0,   demoStudents: 3,  demoStorageBytes: 180 * MB },
  { id: 'solo_core', label: 'Solo',      audience: 'Tutoring as your main work', monthly: 11, yearly: 110, demoStudents: 18, demoStorageBytes: 1.5 * GB },
  { id: 'solo_pro',  label: 'Solo Pro',  audience: 'A full book, run tightly',   monthly: 24, yearly: 240, demoStudents: 42, demoStorageBytes: 4.1 * GB },
];

// Pricing-page copy for each plan (display only — it gates nothing).
const BULLETS = {
  solo_free: ['3 students', 'One-to-one lessons', 'Timetable, registers and earnings', '3 invoices a month', '250 MB of files', 'Concern log and guardian records'],
  solo_core: ['25 students', 'Group lessons, charged per head', 'Timetable, registers and earnings', 'Unlimited invoices',
    'Lesson planner and tracking', 'Homework you can set and collect', 'Written reports, emailed as PDF', '2 GB of files', 'Concern log and guardian records'],
  solo_pro: ['60 students', 'Group lessons, charged per head', 'Timetable, registers and earnings', 'Unlimited invoices',
    'Lesson planner and tracking', 'Homework with a question bank and auto-marking', 'Written reports with rules and templates',
    'Flags when attendance or scores slip', 'Automatic payment reminders', 'VAT invoicing and exports', '10 GB of files', 'Concern log and guardian records'],
};

const DEFAULT_TIER = 'solo_core';

// Catalogue rows for the solo plans — Plans.jsx appends these to its seed.
// Paid plans start live in Stripe (monthly + yearly); Solo Free needs no price.
const soloPlanSeed = () => TIERS.map((t, i) => {
  const c = CAPABILITIES[t.id];
  const capabilities = {};
  CAP_KEYS.forEach(k => { capabilities[snake(k)] = !!c[k]; });
  return {
    id: t.id, audience: 'solo', name: t.label, tagline: t.audience,
    price: t.monthly, priceYearly: t.yearly,
    maxCentres: 1, studentSeats: c.maxStudents, teacherSeats: 1,
    storageGb: c.storageBytes / GB,
    maxInvoicesPerMonth: Number.isFinite(c.maxInvoicesPerMonth) ? c.maxInvoicesPerMonth : null,
    capabilities, bullets: BULLETS[t.id].slice(),
    stripePriceId: t.monthly > 0 ? `price_1P${t.id.replace('_', '')}GBPm` : null, stripePrice: t.monthly > 0 ? t.monthly : null,
    stripePriceIdYearly: t.yearly > 0 ? `price_1P${t.id.replace('_', '')}GBPy` : null, stripePriceYearly: t.yearly > 0 ? t.yearly : null,
    order: 10 + i, archived: false,
  };
});

// ── Live values: the catalogue first, the seed as a fallback ─────────────────
const seedTier = (id) => TIERS.find(t => t.id === id) || null;
const livePlan = (id) => {
  const p = window.getPlan ? window.getPlan(id) : null;
  return p && p.audience === 'solo' ? p : null;
};
const rosterSize = () => ((window.SOLO_FIXTURES || {}).SOLO_STUDENTS || []).length || 42;

const capsFromPlan = (p) => {
  const out = {};
  CAP_KEYS.forEach(k => { out[k] = !!(p.capabilities || {})[snake(k)]; });
  // Guard the divisors the solo pages meter against: at least 1 student and 1 MB.
  out.maxStudents = Math.max(1, Math.round(+p.studentSeats || 0));
  out.maxInvoicesPerMonth = (p.maxInvoicesPerMonth == null || p.maxInvoicesPerMonth === '') ? Infinity : Math.max(0, +p.maxInvoicesPerMonth);
  out.storageBytes = Math.max(MB, Math.round((+p.storageGb || 0) * GB));
  return out;
};

const tierFromPlan = (p) => {
  const caps = capsFromPlan(p);
  const s = seedTier(p.id);
  // A plan the owner added has no demo fixture: fill the book up to its cap.
  const demoStudents = Math.min(caps.maxStudents, s ? s.demoStudents : rosterSize(), rosterSize());
  return {
    id: p.id, label: p.name, audience: p.tagline || '',
    monthly: +p.price || 0, yearly: +p.priceYearly || 0,
    demoStudents,
    demoStorageBytes: s ? s.demoStorageBytes : Math.round(caps.storageBytes * 0.4),
    order: p.order ?? 0, archived: !!p.archived,
    onSale: window.planIsSellable ? window.planIsSellable(p) : !p.archived,
    bullets: p.bullets || [], caps,
  };
};
const tierFromSeed = (t) => ({ ...t, order: TIERS.indexOf(t), archived: false, onSale: true, bullets: BULLETS[t.id].slice(), caps: CAPABILITIES[t.id] });

// Every live solo plan, ascending (archived ones left out).
const liveTiers = () => {
  const plans = window.getPlans ? window.getPlans('solo').filter(p => !p.archived) : [];
  return plans.length ? plans.map(tierFromPlan) : TIERS.map(tierFromSeed);
};

// One plan, whatever its state — an archived plan still resolves for the tutor
// who is on it. Unknown ids fall back to the default plan.
const resolveTier = (id) => {
  const p = livePlan(id);
  if (p) return tierFromPlan(p);
  const s = seedTier(id);
  if (s) return tierFromSeed(s);
  const d = livePlan(DEFAULT_TIER);
  return d ? tierFromPlan(d) : tierFromSeed(seedTier(DEFAULT_TIER));
};

// Capabilities for a plan.
const getSoloCapabilities = (id) => resolveTier(id).caps;

// Plan metadata for a plan (without its capabilities).
const getSoloTier = (id) => {
  const t = resolveTier(id);
  return { id: t.id, label: t.label, audience: t.audience, monthly: t.monthly, yearly: t.yearly,
    demoStudents: t.demoStudents, demoStorageBytes: t.demoStorageBytes, bullets: t.bullets, onSale: t.onSale };
};

// Every live plan, ascending, each with its capabilities attached. `onSale` is
// false for a plan the catalogue has but Stripe can't charge yet.
const listSoloTiers = () => liveTiers();

// The next plan up that is on sale (with capabilities), or null at the top.
const soloNextTier = (id) => {
  const here = resolveTier(id).order;
  return liveTiers().find(t => t.order > here && t.onSale) || null;
};

// -1 / 0 / 1 — whether plan `a` sits below, level with, or above plan `b`.
// Used by the plan cards to word "Choose" vs "Move to".
const compareSoloTiers = (a, b) => Math.sign(resolveTier(a).order - resolveTier(b).order);

Object.assign(window, {
  SOLO_DEFAULT_TIER: DEFAULT_TIER,
  soloPlanSeed, getSoloCapabilities, getSoloTier, listSoloTiers, soloNextTier, compareSoloTiers,
});

})();
