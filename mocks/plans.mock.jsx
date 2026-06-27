// ══════════════════════════════════════════════════════════════
//  TutorOS — Plans & override-codes seed data
//  Loaded AFTER mocks/onboarding.mock.jsx (so `PLANS` exists) and
//  consumed by Plans.jsx (the live catalogue + codes stores).
// ══════════════════════════════════════════════════════════════
//
//  PLAN_CATALOG_SEED is the platform plan catalogue the SUPERADMIN edits
//  (price + what each plan allows: centres / student seats / teacher seats /
//  feature list). It seeds the live store `tutoros.plans.v1` (Plans.jsx) and
//  mirrors the numbers in the back-compat `PLANS` global (onboarding.mock).
//
//  PLAN_CODES_SEED is the superadmin's price-override codes — handed to a
//  single centre to zero-out or discount their price for a fixed window
//  (e.g. a 2-month free trial). Seeds `tutoros.plancodes.v1`.

// Each plan: id, name, price (£/mo), maxCentres (subscription cap), per-centre
// studentSeats/teacherSeats, cloud storageGb (account quota — drives the sidebar
// Cloud-storage widget), a marketing feature list, sort order + archived flag.
const PLAN_CATALOG_SEED = [
  { id: 'starter', name: 'Starter', price: 60,  maxCentres: 1,  studentSeats: 100, teacherSeats: 5,  storageGb: 10,  order: 0, archived: false,
    features: ['Basic dashboard', '10GB storage', 'Email support'] },
  { id: 'growth',  name: 'Growth',  price: 160, maxCentres: 5,  studentSeats: 250, teacherSeats: 15, storageGb: 50,  order: 1, archived: false,
    features: ['Lesson Planner', 'AI Feedback', '50GB storage', 'Priority support'] },
  { id: 'scale',   name: 'Scale',   price: 410, maxCentres: 20, studentSeats: 600, teacherSeats: 40, storageGb: 200, order: 2, archived: false,
    features: ['All Growth features', 'Custom branding', '200GB storage', 'Dedicated CSM'] },
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

Object.assign(window, { PLAN_CATALOG_SEED, PLAN_CODES_SEED });
