// ══════════════════════════════════════════════════════════════
//  Mock data — Onboarding (centre setup · invites · provisioning)
//  Loaded as a global script before Onboarding.jsx (see index.html).
//
//  Frontend-only: no backend, no auth, no stored passwords. Accounts
//  carry only a status + setupMethod (+ consentRecorded for under-13).
//  Everything is multi-tenant — the active centre is `bm` (Bright Minds
//  Tuition), matching the comms tenant model + SEED_TEACHERS/STUDENTS.
// ══════════════════════════════════════════════════════════════

// The active centre. `slug` namespaces generated student usernames so they
// stay unique across centres: username@<slug>.students.tutoros.app
//
// `code` is the short, per-centre code issued at signup. It only ever *resolves
// which centre* at student login (it disambiguates a username on a fresh/shared
// device) — it never creates an account and is safe to share freely. Optional +
// additive: existing code paths that read ONB_CENTRE ignore it.
const ONB_CENTRE = { id: 'bm', name: 'Bright Minds Tuition', slug: 'brightminds', code: 'BMT-204' };

// Lightweight directory of other centres, so the staff login's "pick a centre"
// switcher can show real names for cross-centre memberships (see ONB_MEMBERSHIPS).
// Demo-only — the live tenant data still lives in the admin store.
const ONB_CENTRE_DIRECTORY = {
  bm:     { id: 'bm',     name: 'Bright Minds Tuition', code: 'BMT-204', city: 'London' },
  apex:   { id: 'apex',   name: 'Apex Learning Centre', code: 'APX-118', city: 'Manchester' },
  summit: { id: 'summit', name: 'Summit Academy',       code: 'SMT-377', city: 'Birmingham' },
};

// Subscription plan catalogue. Each tier caps how many CENTRES a subscription can
// run (`maxCentres`, enforced by the Centres page) alongside the existing PER-CENTRE
// seat caps (`studentSeats`/`teacherSeats`, which gate onboarding invites/imports —
// revoking frees a seat). Numbers stay finite so every cap is demonstrable, and the
// Starter/Growth/Scale vocabulary mirrors the signup flow (Auth.jsx) + SuperAdmin
// pricing view. `studentSeats` is intentionally kept modest (per centre) so the
// onboarding seat-gating demo still triggers.
const PLANS = {
  starter: { id: 'starter', name: 'Starter', price: 60,  maxCentres: 1,  studentSeats: 100, teacherSeats: 5,  storageGb: 10  },
  growth:  { id: 'growth',  name: 'Growth',  price: 160, maxCentres: 5,  studentSeats: 250, teacherSeats: 15, storageGb: 50  },
  scale:   { id: 'scale',   name: 'Scale',   price: 410, maxCentres: 20, studentSeats: 600, teacherSeats: 40, storageGb: 200 },
};

// The per-centre plan used by the onboarding store (seat caps). Points at the
// default tier so existing readers of ONB_PLAN keep working, now also carrying
// `maxCentres` for code that wants the subscription-level cap.
const ONB_PLAN = { ...PLANS.growth };

// The account's subscription: one plan + the centres it owns. Account-scoped (NOT
// per-centre) and persisted to localStorage `tutoros.subscription.v2` by
// useSubscriptionStore (Centres.jsx). Seeded with the three centres the demo identity
// sees in the sidebar switcher — bm (primary, London) + apex (Manchester) + summit
// (Birmingham) — all OWNED under one Growth subscription (maxCentres 5), so adding a
// centre stays inside the plan instead of starting a new sign-up. Ownership is
// account-wide: the owner below is the owner of ALL three centres, not just bm.
// `setup` tracks the per-centre onboarding checklist (invite teachers / add students /
// create classes) independently of the single-tenant admin roster, so a freshly-added
// centre reads as "needs setup" (→ opens the right-hand setup drawer) while the seeded
// centres are already established.
const ONB_SUBSCRIPTION = {
  planId: 'growth',
  // Account owner — ownership lives on the ACCOUNT (this subscription), never as an
  // `isOwner` flag on a person, so it can be transferred by repointing one field.
  // Points at one admin by their identity key (email = the identity key in this
  // prototype — adults are one global account keyed by email; see ONB_SESSION).
  // The owner is granted the delegatable billing + centres capabilities (see
  // permissions.jsx canManageBilling / canManageCentres). Backfilled onto older
  // stored blobs by readSub's `{ ...ONB_SUBSCRIPTION, ...p }` spread (Centres.jsx).
  ownerUserId: 'lisa.chen@brightminds.co.uk',
  // Billing details + an applied price-override code (issued by the superadmin and
  // redeemed in the admin's Billing settings). Defaults backfill onto older stored
  // blobs via readSub's spread (Centres.jsx).
  billing: { company: 'Bright Minds Tuition Ltd', email: 'accounts@brightminds.co.uk', vat: 'GB 432 1098 76', address: '14 Kingsway, London WC2B 6LH', cardName: 'L. Chen', cardBrand: 'Visa', cardLast4: '4242', cardExpiry: '08/27' },
  redeemedCode: null,
  // NB: storage usage is NOT stored here — it is derived live from file records
  // (mocks/storage.mock.jsx + Storage.jsx) so a running total can never drift.
  centres: [
    { id: 'bm',   name: 'Bright Minds Tuition', slug: 'brightminds', code: 'BMT-204', city: 'London',     region: 'Greater London',     email: 'office@brightminds.co.uk', phone: '020 7946 0102', accent: null, status: 'active', isPrimary: true,  createdOn: '2025-09-01', setup: { invite: true, students: true, classes: true } },
    { id: 'apex', name: 'Apex Learning Centre',  slug: 'apex',        code: 'APX-118', city: 'Manchester', region: 'Greater Manchester', email: 'hello@apexlearning.co.uk',  phone: '0161 496 0118', accent: null, status: 'active', isPrimary: false, createdOn: '2026-02-14', setup: { invite: true, students: true, classes: true } },
    { id: 'summit', name: 'Summit Academy',      slug: 'summit',      code: 'SMT-377', city: 'Birmingham', region: 'West Midlands',       email: 'office@summitacademy.co.uk', phone: '0121 496 0377', accent: null, status: 'active', isPrimary: false, createdOn: '2026-05-06', setup: { invite: true, students: true, classes: true } },
  ],
};

// Cross-centre identity demo: adults are one global account (email = identity)
// with a membership per centre. Seeded so "invite an email that already exists"
// can add a membership instead of creating a duplicate (see addMembership).
//
// This is ALSO the staff role-grant store: a person can hold more than one role at
// a centre, expressed as multiple rows (Lisa = admin + teacher at bm, below). The
// Team page groups these rows into a per-identity `roles: []` array via
// permissions.js `membersForCentre`, and grant/revoke add/remove a single row
// (useOnboardingStore.grantRole / revokeRole). Assignable staff roles are admin +
// teacher only; student/parent are provisioned identities, not toggled here.
const ONB_MEMBERSHIPS = [
  // ── Bright Minds Tuition (bm · London) — the home centre, the only one with a
  //    live teaching roster (the single-tenant admin store). The rest of that
  //    roster is materialised into teacher memberships on the first Team visit
  //    (ensureTeacherMemberships), so only the non-roster grants are listed here.
  { email: 'lisa.chen@brightminds.co.uk', centreId: 'bm',     role: 'admin'   },
  // Same human, also granted teacher at bm — a centre can give one person both
  // roles, so she gets the in-app "View as Admin / Teacher" switch (Settings).
  { email: 'lisa.chen@brightminds.co.uk', centreId: 'bm',     role: 'teacher' },
  { email: 's.clarke@centre.co.uk',       centreId: 'bm',     role: 'teacher' },
  // A rostered teacher (Marcus Webb) also made an Admin → bm's 2nd admin, so it
  // has a transfer-ownership target and shows a non-owner admin who also teaches.
  { email: 'm.webb@centre.co.uk',         centreId: 'bm',     role: 'admin'   },

  // ── Apex Learning Centre (apex · Manchester). Lisa is the ACCOUNT owner here
  //    too (ownership is account-wide, not per-centre) and runs it as an Admin,
  //    alongside a local centre admin + teachers who only belong to Apex.
  { email: 'lisa.chen@brightminds.co.uk',       centreId: 'apex',   role: 'admin'   },
  { email: 'oliver.bennett@apexlearning.co.uk', centreId: 'apex',   role: 'admin'   },
  // Existing cross-centre identity — already teaching at Apex, so inviting her to
  // bm adds a membership rather than creating a duplicate (see addMembership).
  { email: 'h.bell@apex.co.uk',                 centreId: 'apex',   role: 'teacher' },
  { email: 'daniel.foster@apexlearning.co.uk',  centreId: 'apex',   role: 'teacher' },
  { email: 'sofia.russo@apexlearning.co.uk',    centreId: 'apex',   role: 'teacher' },
  { email: 'marcus.reid@apexlearning.co.uk',    centreId: 'apex',   role: 'teacher' },

  // ── Summit Academy (summit · Birmingham) — newly added to the Growth plan.
  //    Same shape: Lisa as account owner + Admin, a local Summit admin, teachers.
  { email: 'lisa.chen@brightminds.co.uk',       centreId: 'summit', role: 'admin'   },
  { email: 'grace.adeyemi@summitacademy.co.uk', centreId: 'summit', role: 'admin'   },
  { email: 'leo.whitfield@summitacademy.co.uk', centreId: 'summit', role: 'teacher' },
  { email: 'ava.sinclair@summitacademy.co.uk',  centreId: 'summit', role: 'teacher' },
  { email: 'ben.lawson@summitacademy.co.uk',    centreId: 'summit', role: 'teacher' },
  { email: 'maya.iqbal@summitacademy.co.uk',    centreId: 'summit', role: 'teacher' },
];

// The signed-in staff identity for the prototype. One global account (email =
// identity) whose memberships above resolve to multiple centres + roles, driving
// the in-app centre switcher (sidebar) and the Admin/Teacher view switch
// (Settings). Adults are one account; students/superadmin keep their own personas.
const ONB_SESSION = { email: 'lisa.chen@brightminds.co.uk', name: 'Lisa Chen' };

// Initial per-centre onboarding state. `steps` drives the setup checklist;
// `importDraft` auto-saves the in-progress CSV import. Persisted to localStorage
// under `tutoros.onboarding.v2::<centreId>` by useOnboardingStore.
const ONB_INITIAL = {
  plan: ONB_PLAN,
  centre: ONB_CENTRE,
  steps: { invite: false, students: false, classes: false },
  memberships: ONB_MEMBERSHIPS,
  importDraft: null,   // { text, parsedAt } — last in-progress bulk import
  lastBatch: [],       // ids of the most recently provisioned students (for claim slips)
  // Minimal local audit log for staff role grants/revokes + ownership transfers
  // (no backend audit mechanism exists). Each entry:
  // { id, at, action:'grant'|'revoke'|'transfer', role?, email, centreId, by }.
  // Surfaced read-only on the Team page; capped to the most recent entries.
  roleLog: [],
  // Per-centre flag: have we back-filled teacher memberships from the roster yet?
  // Done ONCE per centre so an admin's explicit revoke isn't re-materialised on the
  // next visit (see useOnboardingStore.ensureTeacherMemberships).  { [centreId]: true }
  rosterSeeded: {},
};

Object.assign(window, { ONB_CENTRE, ONB_CENTRE_DIRECTORY, PLANS, ONB_PLAN, ONB_SUBSCRIPTION, ONB_MEMBERSHIPS, ONB_SESSION, ONB_INITIAL });
