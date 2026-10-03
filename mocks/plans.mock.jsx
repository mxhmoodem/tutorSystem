// ══════════════════════════════════════════════════════════════
//  Klasio — Plans & override-codes seed data
//  Loaded AFTER mocks/onboarding.mock.jsx (so `PLANS` exists) and
//  consumed by Plans.jsx (the live catalogue + codes stores).
// ══════════════════════════════════════════════════════════════
//
//  PLAN_CATALOG_SEED is the platform plan catalogue the SUPERADMIN edits
//  (price + what each plan allows: centres / student seats / teacher seats /
//  capabilities / pricing-page bullets). It seeds the live store `tutoros.plans.v1`
//  (Plans.jsx) and mirrors the numbers in the back-compat `PLANS` global
//  (onboarding.mock).
//
//  PLAN_CODES_SEED is the superadmin's price-override codes — handed to a
//  single centre to zero-out or discount their price for a fixed window
//  (e.g. a 2-month free trial). Seeds `tutoros.plancodes.v1`.

// Each plan: id, name, price (£/mo), maxCentres (subscription cap), per-centre
// studentSeats/teacherSeats, cloud storageGb (account quota — drives the sidebar
// Cloud-storage widget), sort order + archived flag, and two lists that must
// never be confused:
//   capabilities — the machine-checked keys (decision #25) that decide what the
//                  plan unlocks. What planCapability() reads.
//   bullets      — pricing-page copy. Display only; gates nothing.
// Plus the Stripe link: stripePriceId + stripePrice (what that Stripe Price
// charges). Price ≠ stripePrice means the catalogue changed and Stripe hasn't —
// the plan isn't sold until a new Stripe price is created (Plans.jsx).
const PLAN_CAPS_ALL = ['group_lessons', 'lesson_planner', 'tracking', 'homework', 'homework_bank', 'reports',
  'report_rules', 'at_risk_flags', 'payment_reminders', 'vat', 'analytics_exports', 'waiting_list'];
const planCaps = (keys) => PLAN_CAPS_ALL.reduce((o, k) => ({ ...o, [k]: keys.includes(k) }), {});
// These are the CENTRE plans (`audience: 'centre'`). The solo tutor plans are seeded
// by soloCapabilities.jsx — the one file that names solo tier ids — and Plans.jsx
// merges the two into one catalogue. Yearly prices are ten months' worth (two
// months free), matching the solo plans.
const PLAN_CATALOG_SEED = [
  { id: 'starter', audience: 'centre', name: 'Starter', tagline: 'One centre getting organised', price: 60, priceYearly: 600, maxCentres: 1, studentSeats: 100, teacherSeats: 5, storageGb: 10, order: 0, archived: false,
    capabilities: planCaps(['group_lessons', 'homework', 'tracking']),
    bullets: ['Homework & progress tracking', 'Up to 100 students', '10GB storage', 'Email support'],
    stripePriceId: 'price_1PstarterGBP060', stripePrice: 60, stripePriceIdYearly: 'price_1PstarterGBP600y', stripePriceYearly: 600 },
  { id: 'growth',  audience: 'centre', name: 'Growth', tagline: 'A growing group of centres', price: 160, priceYearly: 1600, maxCentres: 5, studentSeats: 250, teacherSeats: 15, storageGb: 50, order: 1, archived: false,
    capabilities: planCaps(['group_lessons', 'homework', 'tracking', 'lesson_planner', 'reports', 'homework_bank', 'payment_reminders', 'vat', 'waiting_list']),
    bullets: ['Everything in Starter', 'Lesson planner & student reports', 'Up to 5 centres', '50GB storage', 'Priority support'],
    stripePriceId: 'price_1PgrowthGBP160', stripePrice: 160, stripePriceIdYearly: 'price_1PgrowthGBP1600y', stripePriceYearly: 1600 },
  { id: 'scale',   audience: 'centre', name: 'Scale', tagline: 'Multi-site operators', price: 410, priceYearly: 4100, maxCentres: 20, studentSeats: 600, teacherSeats: 40, storageGb: 200, order: 2, archived: false,
    capabilities: planCaps(PLAN_CAPS_ALL),
    bullets: ['Everything in Growth', 'Report rules, at-risk flags & analytics exports', 'Up to 20 centres', '200GB storage', 'Dedicated success manager'],
    stripePriceId: 'price_1PscaleGBP410', stripePrice: 410, stripePriceIdYearly: 'price_1PscaleGBP4100y', stripePriceYearly: 4100 },
  // Retired tier. Archived plans keep their LAST REAL config (price/seats/storage)
  // so the console shows what it actually was, never £0 / 0 students / 0 teachers.
  { id: 'enterprise', audience: 'centre', name: 'Enterprise', tagline: 'Retired', price: 900, priceYearly: 9000, maxCentres: 50, studentSeats: 2000, teacherSeats: 120, storageGb: 500, order: 3, archived: true,
    capabilities: planCaps(PLAN_CAPS_ALL),
    bullets: ['Everything in Scale', 'Custom SLA', 'Dedicated infrastructure'],
    stripePriceId: 'price_1PenterpriseGBP900', stripePrice: 900, stripePriceIdYearly: 'price_1PenterpriseGBP9000y', stripePriceYearly: 9000 },
];

// Override codes. `kind`:
//   free_trial  → price £0 for `durationMonths`
//   percent_off → `value`% off the plan price for `durationMonths`
//   fixed_price → flat £`value`/mo for `durationMonths`
// `planId` (or null) optionally restricts a code to one plan. `maxRedemptions`
// (or null = unlimited) caps how many centres may redeem it; `redemptions`
// records who has. `status` active|disabled gates redemption.
const PLAN_CODES_SEED = [
  { code: 'WELCOME2MO', kind: 'free_trial',  value: 0,  durationMonths: 2, planId: null,    maxRedemptions: null, redemptions: [], status: 'active',   note: '2-month free trial for new centres',   createdAt: '2026-06-01' },
  { code: 'SUMMER50',   kind: 'percent_off', value: 50, durationMonths: 3, planId: null,    maxRedemptions: 50,   redemptions: [{ account: 'apex@demo', at: '2026-06-10' }], status: 'active', note: 'Summer 2026 promotion', createdAt: '2026-05-20' },
  { code: 'SCALE99',    kind: 'fixed_price', value: 99, durationMonths: 6, planId: 'scale', maxRedemptions: 5,    redemptions: [], status: 'disabled', note: 'Negotiated enterprise rate', createdAt: '2026-04-15' },
];

// The FREE TRIALS — one offer per audience that every new account of that audience
// gets automatically (no code needed). The platform owner edits them on the Pricing
// page; they seed `tutoros.trial.v1` (Plans.jsx). The centre offer drives the signup
// page, the marketing site copy, the admin Billing tab and the owner console's
// new-account wizard; the solo offer has no consumer until solo signup exists.
//   enabled     — off means new accounts are billed from day one
//   days        — trial length
//   planId      — pin the trial to one plan, or null = whichever plan they pick
//   requireCard — ask for a card up front (changes the signup promise)
//   onEnd       — bill | downgrade | suspend  (what happens the day it expires)
// Solo drops to the cheapest live solo plan (Solo Free) rather than billing: a tutor
// who didn't choose a paid plan keeps their book on the free one.
const PLAN_TRIAL_SEED = {
  centre: { enabled: true, days: 14, planId: null, requireCard: false, onEnd: 'bill',      updatedAt: '2026-07-01' },
  solo:   { enabled: true, days: 14, planId: null, requireCard: false, onEnd: 'downgrade', updatedAt: '2026-09-25' },
};

Object.assign(window, { PLAN_CATALOG_SEED, PLAN_CODES_SEED, PLAN_TRIAL_SEED });
