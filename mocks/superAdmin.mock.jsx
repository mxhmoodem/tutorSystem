// ══════════════════════════════════════════════════════════════
//  Mock data — Klasio Platform Owner (Superadmin) console
//  Loaded as a global script before SuperAdmin.jsx (see index.html).
// ══════════════════════════════════════════════════════════════
//
//  ENTITY MODEL (single source of truth for the console):
//     Account (billing tenant / owner)  →  Centres  →  Users
//
//  MRR / billing attaches to the ACCOUNT, never to a centre. An account holds
//  ONE plan (planId → resolved against the canonical PLAN_CATALOG in Plans.jsx),
//  ONE status, and one-or-more physical centres. Per-centre figures are
//  operational only (students / teachers / usage) — they never carry money.
//
//  Every metric the console shows is DERIVED from this seed by the SAMetrics
//  selector layer at the top of SuperAdmin.jsx — no screen hardcodes a number.

// ─── BRAND (routes every product string so it can't drift) ───────────────────
const BRAND = {
  name:         'Klasio',
  statusDomain: 'status.klasio.io',
  billingEmail: 'billing@klasio.io',
  supportEmail: 'support@klasio.io',
  opsEmail:     'ops@klasio.io',
};
// The console's "now" — the Overview date and the status page's "today" both read it.
const SA_NOW = '2026-07-02T09:30:00';

// The support inbox is the support@ Google Group, delivered to the ops@ mailbox
// (runbook A2). "Support inbox" opens Gmail as ops@, filtered to that address.
BRAND.supportInboxUrl = `https://mail.google.com/mail/?authuser=${encodeURIComponent(BRAND.opsEmail)}#search/${encodeURIComponent('to:' + BRAND.supportEmail)}`;

// ─── Tokenised categorical palette (charts / donuts / bars) ──────────────────
// Defined ONCE so no screen invents ad-hoc chart hexes. `accent()` reads the
// live brand-accent token (DS.accent) at call time so it follows the tenant/
// platform accent instead of a frozen purple. Index 0 is always the brand.
const SA_CHART_PALETTE = ['#0891B2', '#16A34A', '#D97706', '#DB2777', '#0D9488', '#2563EB', '#9CA3AF'];
const saPalette = () => [DS.accent, ...SA_CHART_PALETTE];

// ══════════════════════════════════════════════════════════════
//  ACCOUNTS (the 16 tenants) — each owns one-or-more centres.
//  No `mrr` is stored: account MRR is derived from planId via the catalog
//  (SAMetrics.accountMRR), optionally reduced by a redeemed promo code.
// ══════════════════════════════════════════════════════════════
const SA_ACCOUNTS = [
  { id: 'acc_brightminds', name: 'Bright Minds',       owner: 'Taqqy',            ownerEmail: 'lisa@brightminds.co.uk', planId: 'scale',   status: 'active',    country: 'UK', createdAt: 'Aug 2024', churnRisk: 'low',  trialEndsAt: null,
    centres: [
      { id: 'ctr_bm_london', name: 'Bright Minds Tuition', city: 'London', country: 'UK', students: 142, teachers: 8, usage: 94 },
      { id: 'ctr_bm_leeds',  name: 'Bright Minds North',   city: 'Leeds',  country: 'UK', students: 58,  teachers: 4, usage: 79 },
    ] },
  { id: 'acc_apex', name: 'Apex Learning',   owner: 'Daniel Mehta',   ownerEmail: 'd.mehta@apex.uk', planId: 'scale', status: 'active', country: 'UK', createdAt: 'Jun 2024', churnRisk: 'low', trialEndsAt: null, promoCode: 'SUMMER50',
    centres: [ { id: 'ctr_apex', name: 'Apex Learning Centre', city: 'Manchester', country: 'UK', students: 198, teachers: 11, usage: 88 } ] },
  { id: 'acc_summit', name: 'Summit Academy', owner: 'Helen Yoo', ownerEmail: 'helen@summit.ac.uk', planId: 'growth', status: 'active', country: 'UK', createdAt: 'Nov 2024', churnRisk: 'med', trialEndsAt: null,
    centres: [ { id: 'ctr_summit', name: 'Summit Academy', city: 'Birmingham', country: 'UK', students: 76, teachers: 5, usage: 71 } ] },
  { id: 'acc_kingsway', name: 'Kingsway Tutors', owner: 'Marcus Webb', ownerEmail: 'marcus@kingsway.uk', planId: 'growth', status: 'active', country: 'UK', createdAt: 'Jan 2025', churnRisk: 'low', trialEndsAt: null,
    centres: [ { id: 'ctr_kingsway', name: 'Kingsway Tutors', city: 'Leeds', country: 'UK', students: 68, teachers: 4, usage: 82 } ] },
  { id: 'acc_edufirst', name: 'EduFirst', owner: 'Priya Nair', ownerEmail: 'priya@edufirst.uk', planId: 'starter', status: 'active', country: 'UK', createdAt: 'Feb 2025', churnRisk: 'med', trialEndsAt: null,
    centres: [ { id: 'ctr_edufirst', name: 'EduFirst', city: 'Bristol', country: 'UK', students: 32, teachers: 2, usage: 64 } ] },
  { id: 'acc_acorn', name: 'Acorn Study Centre', owner: 'David Park', ownerEmail: 'd.park@acorn.uk', planId: 'starter', status: 'active', country: 'UK', createdAt: 'Mar 2025', churnRisk: 'high', trialEndsAt: null,
    centres: [ { id: 'ctr_acorn', name: 'Acorn Study Centre', city: 'Cardiff', country: 'UK', students: 24, teachers: 2, usage: 41 } ] },
  { id: 'acc_pinnacle', name: 'Pinnacle Prep', owner: 'Jonathan Reeves', ownerEmail: 'jon@pinnacle.ie', planId: 'scale', status: 'active', country: 'IE', createdAt: 'May 2024', churnRisk: 'low', trialEndsAt: null,
    centres: [ { id: 'ctr_pinnacle', name: 'Pinnacle Prep', city: 'Dublin', country: 'IE', students: 167, teachers: 9, usage: 92 } ] },
  { id: 'acc_northstar', name: 'NorthStar Tuition', owner: 'Aisha Begum', ownerEmail: 'aisha@northstar.uk', planId: 'growth', status: 'active', country: 'UK', createdAt: 'Sep 2024', churnRisk: 'low', trialEndsAt: null,
    centres: [ { id: 'ctr_northstar', name: 'NorthStar Tuition', city: 'Edinburgh', country: 'UK', students: 89, teachers: 6, usage: 79 } ] },
  { id: 'acc_brightpath', name: 'BrightPath Learning', owner: 'Carlos Rivera', ownerEmail: 'carlos@brightpath.es', planId: 'growth', status: 'trial', country: 'ES', createdAt: 'Apr 2026', churnRisk: 'med', trialEndsAt: '12 Jul 2026',
    centres: [ { id: 'ctr_brightpath', name: 'BrightPath Learning', city: 'Madrid', country: 'ES', students: 54, teachers: 4, usage: 22 } ] },
  { id: 'acc_mindmethod', name: 'Mind & Method', owner: 'Sofia Andersson', ownerEmail: 'sofia@mindmethod.se', planId: 'scale', status: 'active', country: 'SE', createdAt: 'Jul 2024', churnRisk: 'low', trialEndsAt: null,
    centres: [ { id: 'ctr_mindmethod', name: 'Mind & Method', city: 'Stockholm', country: 'SE', students: 134, teachers: 7, usage: 86 } ] },
  { id: 'acc_elite', name: 'Elite Academy', owner: 'Faisal Ahmed', ownerEmail: 'faisal@elite.ae', planId: 'growth', status: 'past_due', country: 'AE', createdAt: 'Dec 2024', churnRisk: 'high', trialEndsAt: null,
    centres: [ { id: 'ctr_elite', name: 'Elite Academy', city: 'Dubai', country: 'AE', students: 47, teachers: 3, usage: 18 } ] },
  { id: 'acc_lumen', name: 'Lumen Tutors', owner: 'Beatrice Schmidt', ownerEmail: 'b@lumen.de', planId: 'starter', status: 'suspended', country: 'DE', createdAt: 'Oct 2024', churnRisk: 'high', trialEndsAt: null,
    centres: [ { id: 'ctr_lumen', name: 'Lumen Tutors', city: 'Berlin', country: 'DE', students: 19, teachers: 1, usage: 0 } ] },
  { id: 'acc_scholarhub', name: 'Scholar Hub', owner: 'Grace Okonkwo', ownerEmail: 'grace@scholarhub.uk', planId: 'scale', status: 'active', country: 'UK', createdAt: 'Mar 2024', churnRisk: 'low', trialEndsAt: null,
    centres: [
      { id: 'ctr_scholar_glasgow', name: 'Scholar Hub',        city: 'Glasgow',   country: 'UK', students: 120, teachers: 7, usage: 90 },
      { id: 'ctr_scholar_newcastle', name: 'Scholar Hub East', city: 'Newcastle', country: 'UK', students: 56,  teachers: 3, usage: 85 },
    ] },
  { id: 'acc_athena', name: 'Athena Learning', owner: 'Nikos Pappas', ownerEmail: 'nikos@athena.gr', planId: 'growth', status: 'active', country: 'GR', createdAt: 'Feb 2025', churnRisk: 'med', trialEndsAt: null,
    centres: [ { id: 'ctr_athena', name: 'Athena Learning', city: 'Athens', country: 'GR', students: 61, teachers: 4, usage: 68 } ] },
  { id: 'acc_nextstep', name: 'NextStep Academy', owner: 'Ravi Sharma', ownerEmail: 'ravi@nextstep.uk', planId: 'starter', status: 'trial', country: 'UK', createdAt: 'May 2026', churnRisk: 'med', trialEndsAt: '20 Jul 2026',
    centres: [ { id: 'ctr_nextstep', name: 'NextStep Academy', city: 'Sheffield', country: 'UK', students: 28, teachers: 2, usage: 35 } ] },
  { id: 'acc_aurora', name: 'Aurora Tuition', owner: 'Emilie Laurent', ownerEmail: 'emilie@aurora.fr', planId: 'growth', status: 'active', country: 'FR', createdAt: 'Oct 2024', churnRisk: 'low', trialEndsAt: null,
    centres: [ { id: 'ctr_aurora', name: 'Aurora Tuition', city: 'Paris', country: 'FR', students: 73, teachers: 5, usage: 77 } ] },
];

const SA_COUNTRY_FLAG = { UK: '🇬🇧', IE: '🇮🇪', SE: '🇸🇪', FR: '🇫🇷', GR: '🇬🇷', ES: '🇪🇸', DE: '🇩🇪', AE: '🇦🇪' };

// ══════════════════════════════════════════════════════════════
//  TRUSTED role counts — the single source for the Users donut, Users bars,
//  the Users directory (SAMetrics.directory materialises EXACTLY this many
//  rows per role), seat usage, and Platform Controls → Roles.
//
//  These are DERIVED from the centre rosters above rather than typed, because
//  the same head counts also drive per-centre cards and seat usage: a typed
//  tally drifts from them the moment a centre changes. Admin is one owner per
//  account; parents are the only free parameter (the roster carries no parent
//  head count). Currently: SuperAdmin 1 / Admin 16 / Teacher 87 / Student
//  1,446 / Parent 70 = 1,620.
// ══════════════════════════════════════════════════════════════
const SA_CENTRE_ROSTER = SA_ACCOUNTS.reduce((out, a) => out.concat(a.centres), []);
const SA_ROLE_COUNTS = {
  superadmin: 1,
  admin:      SA_ACCOUNTS.length,
  teacher:    SA_CENTRE_ROSTER.reduce((s, c) => s + c.teachers, 0),
  student:    SA_CENTRE_ROSTER.reduce((s, c) => s + c.students, 0),
  parent:     70,
};
const SA_TOTAL_USERS = Object.values(SA_ROLE_COUNTS).reduce((a, b) => a + b, 0);

// ─── User growth trend (last 8 months). The final point IS the derived total,
//     so the chart can never end somewhere the KPI doesn't. ─────────────────
const SA_USER_GROWTH = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'Total users', data: [712, 778, 842, 968, 1124, 1287, 1456, SA_TOTAL_USERS], color: SA_CHART_PALETTE[0] },
    { label: 'DAU',         data: [268, 291, 312, 358, 421, 487, 542, 612],               color: SA_CHART_PALETTE[1] },
  ],
};

// ─── Monthly new/churned MRR movement. Latest values feed getNewMRR /
//     getChurnedMRR; the MRR trend line is rebuilt in SAMetrics to END at the
//     derived platform MRR so the chart can never disagree with the KPI. ─────
const SA_MRR_MOVEMENT = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  newMRR:     [210, 160, 205, 330, 220, 300, 260, 330],
  churnedMRR: [60,  0,   60,  0,   60,  0,   60,  60],
  upgrades: 3, downgrades: 1,
};

// ─── Real-time activity feed. Each row carries an `href` (page id + optional
//     entity) so the Overview can deep-link it to its object. ────────────────
const SA_ACTIVITY = [
  { type: 'signup',   text: 'New account "BrightPath Learning" started a Growth trial',        time: '14m ago',    severity: 'info',    href: { page: 'centres', accountId: 'acc_brightpath' } },
  { type: 'upgrade',  text: 'Apex Learning upgraded from Growth → Scale',                       time: '2h ago',     severity: 'success', href: { page: 'centres', accountId: 'acc_apex' } },
  { type: 'payment',  text: 'Payment failed: Elite Academy (£160, retrying)',                   time: '4h ago',     severity: 'warning', href: { page: 'revenue' } },
  { type: 'signup',   text: 'New admin user registered at Pinnacle Prep',                       time: '6h ago',     severity: 'info',    href: { page: 'users' } },
  { type: 'flag',     text: 'Suspicious login blocked for faisal@elite.ae (12 attempts)',       time: '8h ago',     severity: 'danger',  href: { page: 'security' } },
  { type: 'cancel',   text: 'Lumen Tutors suspended (non-payment, 23 days overdue)',            time: 'Yesterday',  severity: 'danger',  href: { page: 'centres', accountId: 'acc_lumen' } },
  { type: 'support',  text: 'Support session opened on Apex Learning (ref SUP-2291, CSV import)', time: 'Yesterday',  severity: 'info',    href: { page: 'support' } },
  { type: 'upgrade',  text: 'Bright Minds added 14 new student seats',                          time: '2 days ago', severity: 'success', href: { page: 'centres', accountId: 'acc_brightminds' } },
  { type: 'signup',   text: 'New account "NextStep Academy" started a Starter trial',           time: '2 days ago', severity: 'info',    href: { page: 'centres', accountId: 'acc_nextstep' } },
  { type: 'upgrade',  text: 'Scholar Hub renewed its annual Scale contract',                    time: '3 days ago', severity: 'success', href: { page: 'centres', accountId: 'acc_scholarhub' } },
];

// ─── Feature adoption (% of active centres). Sample data — real values need
//     analytics events (phase 2). Colours pull from the tokenised palette. ───
const SA_FEATURE_USAGE = [
  { feature: 'Lesson Planner',   pct: 87, trend: '+4%'  },
  { feature: 'Reports',          pct: 73, trend: '+12%' },
  { feature: 'Homework System',  pct: 91, trend: '+1%'  },
  { feature: 'Progress Reports', pct: 64, trend: '+8%'  },
  { feature: 'Parent Portal',    pct: 52, trend: '-3%'  },
  { feature: 'Tracking',         pct: 41, trend: '+6%'  },
  { feature: 'Attendance',       pct: 96, trend: '+2%'  },
  { feature: 'Invoicing',        pct: 69, trend: '+5%'  },
];

// Device split — illustrative; palette-driven.
const SA_DEVICE = [
  { device: 'Desktop', pct: 58 },
  { device: 'Mobile',  pct: 31 },
  { device: 'Tablet',  pct: 11 },
];

// ─── Support sessions (decision #30). Support itself happens by EMAIL — there is
//     no ticket queue. What the console records is each time the owner opened a
//     time-boxed session on a tenant: the support-email reference the tenant can
//     recognise, a stated reason, and when it started and ended (max 60 min). The
//     live session (if any) sits in tutoros.impersonation.v1; finished ones are
//     appended to tutoros.supportsessions.v1 on top of this seed. ────────────────
const SA_SUPPORT_SESSIONS = [
  { id: 'ss_seed_1', accountId: 'acc_apex',       accountName: 'Apex Learning',  supportRef: 'SUP-2291', reason: 'Student CSV import rejected every row — reproduce the column mapping',  startedAt: '2026-07-01T10:12:00Z', expiresAt: '2026-07-01T10:42:00Z', endedAt: '2026-07-01T10:31:00Z', by: 'Marcus Hale' },
  { id: 'ss_seed_2', accountId: 'acc_aurora',     accountName: 'Aurora Tuition', supportRef: 'SUP-2284', reason: 'Invoices issued in GBP instead of EUR — check the centre invoice settings', startedAt: '2026-06-28T14:05:00Z', expiresAt: '2026-06-28T15:05:00Z', endedAt: '2026-06-28T14:22:00Z', by: 'Marcus Hale' },
  { id: 'ss_seed_3', accountId: 'acc_brightminds', accountName: 'Bright Minds', supportRef: 'SUP-2270', reason: 'Owner asked for a walkthrough of report templates',                     startedAt: '2026-06-24T09:00:00Z', expiresAt: '2026-06-24T09:30:00Z', endedAt: '2026-06-24T09:30:00Z', by: 'Marcus Hale' },
];

// ─── System health. Every figure here is a MOCK, and each carries the place the
//     real number comes from, so the console never implies it measures something
//     it doesn't. Services + uptime: an external monitor hitting /v1/health (a
//     monitor inside the thing it watches reports "fine" while the box is on
//     fire). Latency + errors: Sentry. Queues: our own tables, read through
//     GET /v1/admin/system-health (email_outbox is service-role only). ──────────
// `component` is the customer-facing component each service rolls up into on the
// public status page (SA_PUBLIC_COMPONENTS) — the public never sees infra names.
const SA_SERVICES = [
  { name: 'API (Railway)',              component: 'app',     status: 'operational', uptime: '99.99%', latency: '142ms' },
  { name: 'Auth (Supabase)',            component: 'signin',  status: 'operational', uptime: '99.98%', latency: '88ms'  },
  { name: 'Database (Supabase Postgres)', component: 'app',   status: 'operational', uptime: '99.99%', latency: '12ms' },
  { name: 'Outbox worker (API)',        component: 'email',   status: 'degraded',    uptime: '98.42%', latency: '4.2s'  },
  { name: 'Email (Resend)',             component: 'email',   status: 'operational', uptime: '99.94%', latency: '210ms' },
  { name: 'File storage (R2)',          component: 'files',   status: 'operational', uptime: '99.99%', latency: '180ms' },
  { name: 'Payments (Stripe webhooks)', component: 'billing', status: 'operational', uptime: '99.97%', latency: '320ms' },
];
// What the public status page lists — named for what centres USE, not what we run.
// Each component's status is the worst of the services that roll up into it.
const SA_PUBLIC_COMPONENTS = [
  { id: 'app',     name: 'Klasio app',               desc: 'Dashboards, registers, homework, reports and messages' },
  { id: 'signin',  name: 'Sign-in',                  desc: 'Staff and student sign-in' },
  { id: 'email',   name: 'Email notifications',      desc: 'Invitations, reminders, invoices and reports sent by email' },
  { id: 'files',   name: 'File uploads & downloads', desc: 'Homework submissions, resources and attachments' },
  { id: 'billing', name: 'Billing & payments',       desc: 'Klasio subscriptions and card payments' },
];
// Queues the owner can actually act on — the tables Postgres owns (decision #14).
const SA_QUEUES = [
  { id: 'outbox',   queue: 'Email outbox',           source: 'email_outbox',                 pending: 3, failed: 1 },
  { id: 'imports',  queue: 'Import jobs',            source: 'jobs · student/invoice import', pending: 2, failed: 0 },
  { id: 'privacy',  queue: 'Privacy jobs (SAR / erasure)', source: 'jobs · sar_export/erasure', pending: 1, failed: 0 },
  { id: 'webhooks', queue: 'Stripe webhooks',        source: 'processed_events',             pending: 0, failed: 0 },
];
// Last run of each scheduled job (pg_cron / the API scheduler).
const SA_CRON = [
  { job: 'Storage rollups',          lastRun: '02:00 today', ok: true },
  { job: 'Storage reconciliation (R2)', lastRun: '03:00 today', ok: true },
  { job: 'Quota warnings (80% / 100%)', lastRun: '06:00 today', ok: true },
  { job: 'Retention sweep',          lastRun: '04:00 today', ok: true },
];
// `title` is the internal name; `public` is what the status page says — written
// for a centre admin, never naming infrastructure. `minutes` is the duration.
const SA_INCIDENTS = [
  { date: '2026-06-26', title: 'Outbox worker latency spike',        duration: '34m',   minutes: 34, severity: 'minor', status: 'resolved', component: 'email',
    public: { title: 'Delayed email notifications', body: 'Some emails — homework reminders, invoices and reports — arrived up to 30 minutes late. Every queued email was delivered; nothing needs resending.' } },
  { date: '2026-06-18', title: 'Slow database queries (eu-west-2)',  duration: '12m',   minutes: 12, severity: 'minor', status: 'resolved', component: 'app',
    public: { title: 'Pages loading slowly', body: 'Dashboards and registers took longer than usual to load for about 12 minutes. No data was affected.' } },
  { date: '2026-06-02', title: 'Payment webhook delivery delays',    duration: '1h 8m', minutes: 68, severity: 'major', status: 'resolved', component: 'billing',
    public: { title: 'Plan changes and payments delayed', body: 'Card payments and plan changes were confirmed late for just over an hour. No payment was taken twice, and every account was up to date once it was fixed.' } },
];
// Resend delivery events (webhook → email_outbox status), by template.
const SA_EMAIL_DELIVERY = [
  ['Staff invitation',      '142',   '99.3%', '0.7%'],
  ['Homework reminder',     '4,210', '99.2%', '0.8%'],
  ['Invoice',               '892',   '99.8%', '0.2%'],
  ['Report sent to guardian', '1,340', '99.6%', '0.4%'],
  ['Password reset',        '128',   '99.6%', '0.4%'],
  ['Trial ending',          '12',    '100%',  '0%'],
];

// ─── Failed-payment queue (dunning). Tied to REAL accounts so the KPI count
//     always equals the list length. Amount = account's plan price. ──────────
const SA_FAILED_PAYMENTS = [
  { accountId: 'acc_elite', date: '28 Jun', attempts: 2, state: 'retrying' },
  { accountId: 'acc_acorn', date: '27 Jun', attempts: 3, state: 'card_expired' },
  { accountId: 'acc_lumen', date: '25 Jun', attempts: 3, state: 'failed' },
];

// ─── Recent transactions. `accountId` links each to its account. ─────────────
const SA_TXNS = [
  { accountId: 'acc_apex',        type: 'upgrade', amount: 250,   date: 'Today',      desc: 'Growth → Scale' },
  { accountId: 'acc_brightpath',  type: 'new',     amount: 0,     date: 'Today',      desc: 'New trial — Growth' },
  { accountId: 'acc_brightminds', type: 'addon',   amount: 40,    date: 'Yesterday',  desc: '14 student seats' },
  { accountId: 'acc_northstar',   type: 'renewal', amount: 160,   date: 'Yesterday',  desc: 'Monthly renewal' },
  { accountId: 'acc_edufirst',    type: 'refund',  amount: -30,   date: '2 days ago', desc: 'Pro-rata refund' },
  { accountId: 'acc_pinnacle',    type: 'renewal', amount: 410,   date: '2 days ago', desc: 'Monthly renewal' },
];

// ══════════════════════════════════════════════════════════════
//  AUDIT LOG — append-only safeguarding artifact (see SAAudit store in
//  SuperAdmin.jsx). This is the SEED; runtime entries (impersonation, exports)
//  are prepended in localStorage. `ts` is an ISO stamp for search/sort.
// ══════════════════════════════════════════════════════════════
const SA_AUDIT = [
  { id: 'aud_1', actor: 'Marcus Hale',   actorRole: 'superadmin', action: 'Suspended account "Lumen Tutors"',       type: 'account',  target: 'Lumen Tutors',        ts: '2026-07-02T07:10:00Z', ip: '82.14.21.5'  },
  { id: 'aud_2', actor: 'Marcus Hale',   actorRole: 'superadmin', action: 'Toggled feature flag "reports_v2"',      type: 'flag',     target: 'Global',              ts: '2026-07-02T04:20:00Z', ip: '82.14.21.5'  },
  { id: 'aud_3', actor: 'System',        actorRole: 'system',     action: 'Auto-locked account after 12 failures',  type: 'security', target: 'faisal@elite.ae',     ts: '2026-07-02T01:05:00Z', ip: 'auto'        },
  { id: 'aud_4', actor: 'Marcus Hale',   actorRole: 'superadmin', action: 'Granted trial extension',                type: 'account',  target: 'BrightPath Learning', ts: '2026-07-01T15:40:00Z', ip: '82.14.21.5'  },
  { id: 'aud_5', actor: 'Taqqy',         actorRole: 'admin',      action: 'Bulk-exported 142 student records',      type: 'export',   target: 'Bright Minds',        ts: '2026-07-01T11:12:00Z', ip: '92.40.118.3' },
  { id: 'aud_6', actor: 'Marcus Hale',   actorRole: 'superadmin', action: 'Edited pricing plan "Growth"',           type: 'plan',     target: 'Plans',               ts: '2026-06-30T09:30:00Z', ip: '82.14.21.5'  },
  { id: 'aud_7', actor: 'Daniel Mehta',  actorRole: 'admin',      action: 'Invited 3 new teachers',                 type: 'user',     target: 'Apex Learning',       ts: '2026-06-30T08:00:00Z', ip: '203.0.45.9'  },
  { id: 'aud_8', actor: 'Grace Okonkwo', actorRole: 'admin',      action: 'Switched comms safety preset to Standard', type: 'security', target: 'Scholar Hub',         ts: '2026-06-29T14:22:00Z', ip: '88.97.12.40' },
  { id: 'aud_9', actor: 'System',        actorRole: 'system',     action: 'Nightly backup completed (all tenants)', type: 'system',   target: 'Global',              ts: '2026-06-29T02:00:00Z', ip: 'auto'        },
];

// ─── DSAR queue (UK-GDPR/AADC). Real workflow rows, not bare counts. ─────────
const SA_DSAR = [
  { id: 'dsar_1', kind: 'export', requester: 'parent · EduFirst',      accountId: 'acc_edufirst',   subject: '1 student (minor)', received: '30 Jun', deadline: '30 Jul', status: 'in_progress' },
  { id: 'dsar_2', kind: 'delete', requester: 'admin · Lumen Tutors',   accountId: 'acc_lumen',      subject: 'Full account',      received: '28 Jun', deadline: '28 Jul', status: 'awaiting' },
  { id: 'dsar_3', kind: 'export', requester: 'admin · Apex Learning',  accountId: 'acc_apex',       subject: '198 students',      received: '24 Jun', deadline: '24 Jul', status: 'fulfilled' },
];

// ─── Suspicious login activity (Security). Actionable rows. ──────────────────
const SA_SUSPICIOUS = [
  { id: 'sus_1', email: 'faisal@elite.ae',       attempts: 12, ip: '203.0.45.9',   country: '🇦🇪 UAE', time: '8h ago',    status: 'locked'  },
  { id: 'sus_2', email: 'unknown@test.com',      attempts: 6,  ip: '185.220.10.4', country: '🇷🇺 RU',  time: '14h ago',   status: 'blocked' },
  { id: 'sus_3', email: 'lisa@brightminds.co.uk', attempts: 3, ip: '92.40.118.3',  country: '🇬🇧 UK',  time: 'Yesterday', status: 'cleared' },
];

// ─── Feature flags — product ROLLOUT only (decision #32). One master switch plus
//     an optional account allowlist: `accountIds: null` = every account, an array
//     = only those. No percentages, cohorts or plan gates — plans gate surfaces
//     through capabilities (#25), never through a flag. Seeds tutoros.flags.v1. ─
const SA_FLAGS = [
  { id: 'reports_v2',          desc: 'New student report builder (v2)',                         on: true,  accountIds: null },
  { id: 'lesson_planner_beta', desc: 'Drag-and-drop lesson planner v2',                         on: true,  accountIds: ['acc_brightminds', 'acc_apex', 'acc_scholarhub'] },
  { id: 'multi_currency',      desc: 'Currency support beyond GBP',                             on: true,  accountIds: null },
  { id: 'gradebook_export',    desc: 'Excel gradebook export',                                  on: true,  accountIds: null },
  { id: 'hw_auto_marking',     desc: 'Auto-mark homework against teacher answers',              on: true,  accountIds: ['acc_brightminds'] },
  { id: 'monitored_messaging', desc: 'Monitored student→staff messaging (safeguarding-routed)', on: false, accountIds: ['acc_pinnacle', 'acc_mindmethod'] },
  { id: 'mobile_offline',      desc: 'Offline homework on mobile app',                          on: true,  accountIds: ['acc_northstar', 'acc_summit'] },
];

Object.assign(window, {
  BRAND, SA_CHART_PALETTE, saPalette,
  SA_ACCOUNTS, SA_COUNTRY_FLAG, SA_ROLE_COUNTS,
  SA_USER_GROWTH, SA_MRR_MOVEMENT, SA_ACTIVITY, SA_FEATURE_USAGE, SA_DEVICE,
  SA_NOW, SA_SUPPORT_SESSIONS, SA_SERVICES, SA_PUBLIC_COMPONENTS, SA_QUEUES, SA_CRON, SA_INCIDENTS, SA_EMAIL_DELIVERY,
  SA_FAILED_PAYMENTS, SA_TXNS, SA_AUDIT, SA_DSAR, SA_SUSPICIOUS, SA_FLAGS,
});
