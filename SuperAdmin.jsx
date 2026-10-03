// ══════════════════════════════════════════════════════════════
//  Klasio — Platform Owner (Superadmin) console
//  Entity model:  Account (billing tenant) → Centres → Users
// ══════════════════════════════════════════════════════════════
//
//  Data (SA_ACCOUNTS, SA_ROLE_COUNTS, SA_USER_GROWTH, SA_MRR_MOVEMENT,
//  SA_ACTIVITY, SA_FEATURE_USAGE, SA_DEVICE, SA_SUPPORT_SESSIONS, SA_SERVICES,
//  SA_QUEUES, SA_CRON, SA_INCIDENTS, SA_EMAIL_DELIVERY, SA_FAILED_PAYMENTS,
//  SA_TXNS, SA_AUDIT, SA_DSAR, SA_SUSPICIOUS, SA_FLAGS, BRAND, saPalette) lives
//  in mocks/superAdmin.mock.jsx, loaded before this file. The canonical PLAN
//  CATALOG + getPlan/planApplyCode/planFindCode come from Plans.jsx.
//
//  Accent: every accent reads the live brand-accent token DS.accent at RENDER
//  time (mutated to the emerald brand colour in index.html) — never a frozen
//  purple. Chart colours come from the tokenised saPalette(). No raw accent hex.

// ═══════════════════════════════════════════════════════════════════════════
//  METRICS LAYER  —  the single source for every number the console shows.
// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGED cross-tenant aggregation. The owner console intentionally reads
//  across ALL accounts — in production this is a Superadmin-only path (maps to
//  RLS with an explicit privileged escape hatch), and these aggregates become
//  pre-computed rollups / materialized views, NOT per-request scans over every
//  tenant. The prototype recomputes live over the localStorage seed; the
//  backend MUST NOT. No screen may hardcode a metric — derive it here.
const SAMetrics = {
  accounts:    () => SA_ACCOUNTS,
  account:     (id) => SA_ACCOUNTS.find(a => a.id === id) || null,
  centresFor:  (id) => { const a = SAMetrics.account(id); return a ? a.centres : []; },
  // Flat centre list, each carrying its parent account's id/name/plan/status.
  allCentres:  () => SA_ACCOUNTS.reduce((out, a) =>
    out.concat(a.centres.map(c => ({ ...c, accountId: a.id, accountName: a.name, planId: a.planId, status: a.status }))), []),

  planPrice:   (planId) => { const p = getPlan(planId); return p ? p.price : 0; },
  planName:    (planId) => { const p = getPlan(planId); return p ? p.name : planId; },
  // Trial + suspended accounts contribute £0; active + past_due are billed.
  isBilling:   (a) => a.status === 'active' || a.status === 'past_due',
  accountMRR:  (a) => {
    if (!SAMetrics.isBilling(a)) return 0;
    let price = SAMetrics.planPrice(a.planId);
    if (a.promoCode && typeof planFindCode === 'function' && typeof planApplyCode === 'function') {
      const code = planFindCode(a.promoCode);
      if (code) price = planApplyCode(price, code);
    }
    return price;
  },
  // THE one MRR number. Every MRR view derives from this.
  platformMRR: () => SA_ACCOUNTS.reduce((s, a) => s + SAMetrics.accountMRR(a), 0),
  arr:         () => SAMetrics.platformMRR() * 12,
  payingAccounts: () => SA_ACCOUNTS.filter(SAMetrics.isBilling),
  arpu:        () => { const p = SAMetrics.payingAccounts(); return p.length ? Math.round(SAMetrics.platformMRR() / p.length) : 0; },
  ltv:         () => SAMetrics.arpu() * 24,  // 24-month illustrative LTV
  newMRR:      () => SA_MRR_MOVEMENT.newMRR[SA_MRR_MOVEMENT.newMRR.length - 1],
  churnedMRR:  () => SA_MRR_MOVEMENT.churnedMRR[SA_MRR_MOVEMENT.churnedMRR.length - 1],
  churnRate:   () => { const m = SAMetrics.platformMRR(); return m ? +((SAMetrics.churnedMRR() / m) * 100).toFixed(1) : 0; },
  // Net Revenue Retention = (MRR − churned + expansion) / MRR (start-of-period).
  nrr:         () => {
    const mov = SA_MRR_MOVEMENT;
    const start = SAMetrics.platformMRR() - (mov.newMRR.at(-1) - mov.churnedMRR.at(-1));
    if (!start) return 100;
    const expansion = mov.upgrades * 90;  // illustrative avg upgrade uplift
    return Math.round(((start - mov.churnedMRR.at(-1) + expansion) / start) * 100);
  },
  // MRR trend rebuilt to END at platformMRR() so the chart can never disagree
  // with the KPI. Each prior month = next month − that month's net movement.
  mrrTrend:    () => {
    const mov = SA_MRR_MOVEMENT;
    const net = mov.newMRR.map((n, i) => n - mov.churnedMRR[i]);
    const out = new Array(net.length);
    out[net.length - 1] = SAMetrics.platformMRR();
    for (let i = net.length - 2; i >= 0; i--) out[i] = out[i + 1] - net[i + 1];
    return { labels: mov.labels, mrr: out };
  },
  // The last `months` of that movement — what the Overview range selector and the
  // board pack read. MRR at the start of the window is MRR now minus the window's
  // net movement, so start + movement = end exactly. The chart keeps one point
  // before the window (when there is one) so a single month still draws a line.
  period:      (months) => {
    const mov = SA_MRR_MOVEMENT;
    const { labels, mrr } = SAMetrics.mrrTrend();
    const n = Math.max(1, Math.min(months, labels.length));
    const from = labels.length - n;
    const sum = (arr) => arr.slice(from).reduce((a, b) => a + b, 0);
    const newMRR = sum(mov.newMRR);
    const churnedMRR = sum(mov.churnedMRR);
    const endMRR = mrr[mrr.length - 1];
    const startMRR = endMRR - (newMRR - churnedMRR);
    return {
      months: n, labels: labels.slice(Math.max(0, from - 1)), mrr: mrr.slice(Math.max(0, from - 1)),
      startMRR, endMRR, newMRR, churnedMRR, net: newMRR - churnedMRR,
      growthPct: startMRR ? +(((endMRR - startMRR) / startMRR) * 100).toFixed(1) : 0,
      churnRate: startMRR ? +((churnedMRR / startMRR) * 100).toFixed(1) : 0,
    };
  },

  userCounts:  () => SA_ROLE_COUNTS,
  totalUsers:  () => Object.values(SA_ROLE_COUNTS).reduce((a, b) => a + b, 0),
  activeCentres: () => SAMetrics.allCentres().filter(c => c.status === 'active').length,
  totalCentres:  () => SAMetrics.allCentres().length,

  // Rank accounts by MRR (desc). Optionally only those with a member centre.
  accountsByMRR: () => [...SA_ACCOUNTS].sort((a, b) => SAMetrics.accountMRR(b) - SAMetrics.accountMRR(a)),
  atRiskAccounts: () => SA_ACCOUNTS.filter(a => a.churnRisk === 'high' || a.status === 'past_due' || a.status === 'suspended'),

  // Failed payments enriched from real accounts — amount = the account's price.
  failedPayments: () => SA_FAILED_PAYMENTS.map(f => {
    const a = SAMetrics.account(f.accountId) || {};
    return { ...f, account: a, name: a.name, amount: SAMetrics.planPrice(a.planId), planName: SAMetrics.planName(a.planId) };
  }),
  failedAtRisk: () => SAMetrics.failedPayments().reduce((s, f) => s + f.amount, 0),

  // Seats used vs licensed for one account (per-centre plan limits × #centres).
  seatUsage: (a) => {
    const plan = getPlan(a.planId) || { studentSeats: 0, teacherSeats: 0 };
    const n = a.centres.length;
    const usedStudents = a.centres.reduce((s, c) => s + c.students, 0);
    const usedTeachers = a.centres.reduce((s, c) => s + c.teachers, 0);
    return {
      students: { used: usedStudents, licensed: plan.studentSeats * n },
      teachers: { used: usedTeachers, licensed: plan.teacherSeats * n },
    };
  },

  // Plan distribution over non-archived plans that have ≥1 account.
  // The seeded accounts are all centre accounts, so a solo plan only appears
  // once an account is actually on it.
  planDistribution: () => getPlans().filter(p => !p.archived && (p.audience === 'centre' || SA_ACCOUNTS.some(a => a.planId === p.id))).map(p => {
    const accts = SA_ACCOUNTS.filter(a => a.planId === p.id);
    const paying = accts.filter(SAMetrics.isBilling);
    return { id: p.id, name: p.name, price: p.price, accounts: accts.length,
      mrr: paying.reduce((s, a) => s + SAMetrics.accountMRR(a), 0) };
  }),

  geographic: () => {
    const byCountry = {};
    SA_ACCOUNTS.forEach(a => {
      a.centres.forEach(c => {
        const g = byCountry[c.country] || (byCountry[c.country] = { country: c.country, flag: SA_COUNTRY_FLAG[c.country] || '🏳️', centres: 0, users: 0, revenue: 0 });
        g.centres += 1;
        g.users += c.students + c.teachers;
      });
      const gg = byCountry[a.country] || (byCountry[a.country] = { country: a.country, flag: SA_COUNTRY_FLAG[a.country] || '🏳️', centres: 0, users: 0, revenue: 0 });
      gg.revenue += SAMetrics.accountMRR(a);
    });
    return Object.values(byCountry).sort((x, y) => y.users - x.users);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  USER DIRECTORY  —  every user on the platform, materialised from the seed
// ═══════════════════════════════════════════════════════════════════════════
//  The Users screen is a directory of EVERY user, but the seed only carries
//  per-centre head counts. Individual rows are materialised here from a seeded
//  PRNG (identical every reload — no persistence, no Math.random) and allocated
//  across centres by largest remainder so each role's row count lands EXACTLY
//  on the trusted SA_ROLE_COUNTS tally. Nothing on the Users page hardcodes a
//  number: MFA adoption, 30-day actives and role splits are all counted off
//  these rows, so the stat card and the table can never disagree.
//  PRODUCTION: this is a paged, server-side directory query — never a client
//  materialisation of every tenant's users.
const saRng = (seed) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const SA_FIRST = ['Amara', 'Oliver', 'Priya', 'Noah', 'Zainab', 'Ethan', 'Mei', 'Liam', 'Sofia', 'Kai',
  'Isla', 'Marcus', 'Nadia', 'Theo', 'Elena', 'Idris', 'Freya', 'Omar', 'Chloe', 'Jonas',
  'Yara', 'Felix', 'Anika', 'Rohan', 'Maja', 'Callum', 'Leila', 'Dmitri', 'Sana', 'Hugo',
  'Tara', 'Emeka', 'Lucia', 'Arjun', 'Nora', 'Sven', 'Aisha', 'Mateo', 'Ines', 'Bilal',
  'Greta', 'Rafael', 'Hana', 'Declan', 'Alba', 'Tobias', 'Simone', 'Kofi', 'Ravi', 'Elsa',
  'Jamal', 'Beatrix', 'Nikolai', 'Amelie', 'Sian', 'Otto', 'Rania', 'Casper', 'Lena', 'Tomas'];
const SA_LAST = ['Bennett', 'Okafor', 'Nair', 'Lindqvist', 'Haddad', 'Whitfield', 'Moreau', 'Kaur', 'Vasquez', 'Novak',
  'Fitzgerald', 'Adeyemi', 'Sorensen', 'Rahman', 'Delgado', 'Kowalski', 'Mbeki', 'Ferreira', 'Halvorsen', 'Chatterjee',
  'Marchetti', 'Osei', 'Lindgren', 'Sadiq', 'Petrov', 'Ellery', 'Nakamura', 'Bergstrom', 'Iqbal', 'Duarte',
  'Sandoval', 'Fontaine', 'Achebe', 'Weiss', 'Kristensen', 'Baptiste', 'Sultana', 'Ramirez', 'Lindholm', 'Okonjo',
  'Sinclair', 'Batista', 'Farrow', 'Nguyen', 'Almeida', 'Reinhardt', 'Ashworth', 'Zielinski'];
const SA_PARENT_DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'icloud.com', 'yahoo.co.uk'];

// Largest-remainder allocation of `total` over integer weights — keeps the sum
// EXACT (a plain proportional round would drift off the trusted tally).
const saAllocate = (weights, total) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const raw = weights.map(w => (w / sum) * total);
  const base = raw.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) base[order[k].i] += 1;
  return base;
};

// Recency ladder — how recently a user was seen. `days` drives the 30-day
// active tally, so "Active (30d)" / "Seen today" are counts, not guesses. The
// weights are set so the platform-wide day-0 share lands on the DAU figure the
// Engagement screen reports (~39%), and are then skewed per centre by its usage
// score: a busy centre's users sit higher up the ladder, a dormant one's lower.
const SA_SEEN = [
  { label: 'Now',       days: 0,    w: 0.09 },
  { label: '40m ago',   days: 0,    w: 0.10 },
  { label: '3h ago',    days: 0,    w: 0.08 },
  { label: '7h ago',    days: 0,    w: 0.06 },
  { label: 'Yesterday', days: 1,    w: 0.14 },
  { label: '3d ago',    days: 3,    w: 0.14 },
  { label: '6d ago',    days: 6,    w: 0.09 },
  { label: '12d ago',   days: 12,   w: 0.08 },
  { label: '21d ago',   days: 21,   w: 0.05 },
  { label: '38d ago',   days: 38,   w: 0.06 },
  { label: '2mo ago',   days: 62,   w: 0.05 },
  { label: '5mo ago',   days: 150,  w: 0.04 },
  { label: 'Never',     days: 9999, w: 0.02 },
];
const SA_SEEN_NEVER = SA_SEEN[SA_SEEN.length - 1];
const saPickSeen = (r, usage) => {
  // usage 100 → exponent 1.44 (skew recent); usage 0 → 0.33 (skew stale).
  const skewed = Math.pow(r, Math.max(0.3, 1 + (usage - 60) / 90));
  let acc = 0;
  for (let i = 0; i < SA_SEEN.length; i++) { acc += SA_SEEN[i].w; if (skewed < acc) return SA_SEEN[i]; }
  return SA_SEEN_NEVER;
};

const saDomainOf = (a) => (a.ownerEmail || '').split('@')[1] || 'klasio.io';
const saSlug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');

let _saDirectory = null;
const saBuildDirectory = () => {
  const centres = SAMetrics.allCentres();
  const byAccount = {};
  SA_ACCOUNTS.forEach(a => { byAccount[a.id] = a; });

  // Teachers and students come STRAIGHT off each centre's roster, so a centre's
  // rows here always equal the head count its card shows. Only parents (which
  // the roster doesn't carry) are apportioned, by student weight.
  const teacherQuota = centres.map(c => c.teachers);
  const studentQuota = centres.map(c => c.students);
  const parentQuota  = saAllocate(centres.map(c => c.students), SA_ROLE_COUNTS.parent);

  const out = [];
  let n = 0;
  const push = (u) => { out.push({ ...u, id: 'usr_' + (n++).toString(36).padStart(4, '0') }); };
  // Emails are unique platform-wide; only a genuine clash gets a numeric suffix.
  const takenEmail = {};
  const mkEmail = (local, host) => {
    let e = local + '@' + host;
    for (let k = 2; takenEmail[e]; k++) e = local + k + '@' + host;
    takenEmail[e] = true;
    return e;
  };
  SA_ACCOUNTS.forEach(a => { takenEmail[a.ownerEmail] = true; });

  // 1 — the platform owner.
  push({
    name: 'Marcus Hale', email: `marcus@${'klasio.io'}`, role: 'superadmin',
    accountId: null, account: `${BRAND.name} (platform)`, centre: '—', country: 'UK',
    status: 'active', lastSeen: 'Now', seenDays: 0, joined: 'May 2024', mfa: true, meta: 'Platform owner',
  });

  // 2 — one centre admin per account (the account owner).
  SA_ACCOUNTS.forEach(a => push({
    name: a.owner, email: a.ownerEmail, role: 'admin',
    accountId: a.id, account: a.name, centre: a.centres[0].name, country: a.country,
    status: a.status === 'suspended' ? 'suspended' : a.status === 'past_due' ? 'locked' : 'active',
    lastSeen: a.status === 'suspended' ? '2mo ago' : a.centres[0].usage > 60 ? 'Today' : '6d ago',
    seenDays: a.status === 'suspended' ? 62 : a.centres[0].usage > 60 ? 0 : 6,
    joined: a.createdAt, mfa: a.churnRisk !== 'high', meta: 'Account owner',
  }));

  // 3 — teachers, students and parents, spread over the real centre roster.
  centres.forEach((c, ci) => {
    const acc = byAccount[c.accountId];
    const rnd = saRng(c.id);
    const domain = saDomainOf(acc);
    const used = {};
    const person = () => {
      let f, l, key, guard = 0;
      do {
        f = SA_FIRST[Math.floor(rnd() * SA_FIRST.length)];
        l = SA_LAST[Math.floor(rnd() * SA_LAST.length)];
        key = f + l;
      } while (used[key] && ++guard < 8);
      used[key] = true;
      return { first: f, last: l, name: `${f} ${l}` };
    };
    // Higher-usage centres have more recently-seen users; a suspended account
    // has nobody signing in at all.
    const seen = () => (acc.status === 'suspended' ? SA_SEEN_NEVER : saPickSeen(rnd(), c.usage));
    const statusFor = (mfaAllowed) => {
      if (acc.status === 'suspended') return 'suspended';
      const r = rnd();
      if (r < 0.025) return 'pending';
      if (mfaAllowed && r < 0.04) return 'locked';
      return 'active';
    };

    for (let i = 0; i < teacherQuota[ci]; i++) {
      const p = person(); const s = seen();
      push({
        name: p.name, email: mkEmail(`${p.first[0].toLowerCase()}.${saSlug(p.last)}`, domain), role: 'teacher',
        accountId: c.accountId, account: c.accountName, centre: c.name, country: c.country,
        status: statusFor(true), lastSeen: s.label, seenDays: s.days,
        joined: acc.createdAt, mfa: rnd() < 0.78, meta: `${1 + Math.floor(rnd() * 6)} classes`,
      });
    }
    for (let i = 0; i < studentQuota[ci]; i++) {
      const p = person(); const s = seen();
      push({
        name: p.name, email: mkEmail(`${saSlug(p.first)}.${saSlug(p.last)}`, 'students.' + domain), role: 'student',
        accountId: c.accountId, account: c.accountName, centre: c.name, country: c.country,
        status: statusFor(false), lastSeen: s.label, seenDays: s.days,
        joined: acc.createdAt, mfa: false, meta: `Year ${7 + Math.floor(rnd() * 7)}`,
      });
    }
    for (let i = 0; i < parentQuota[ci]; i++) {
      const p = person(); const s = seen();
      push({
        name: p.name, email: mkEmail(`${saSlug(p.first)}.${saSlug(p.last)}`, SA_PARENT_DOMAINS[Math.floor(rnd() * SA_PARENT_DOMAINS.length)]), role: 'parent',
        accountId: c.accountId, account: c.accountName, centre: c.name, country: c.country,
        status: statusFor(false), lastSeen: s.label, seenDays: s.days,
        joined: acc.createdAt, mfa: rnd() < 0.31, meta: `${1 + Math.floor(rnd() * 2)} linked learner(s)`,
      });
    }
  });

  return out;
};

// Directory selectors hang off the same metrics layer as everything else.
SAMetrics.directory = () => (_saDirectory || (_saDirectory = saBuildDirectory()));
SAMetrics.directoryStats = () => {
  const d = SAMetrics.directory();
  const mfaEligible = d.filter(u => u.role !== 'student');
  const tally = (fn) => d.reduce((n, u) => n + (fn(u) ? 1 : 0), 0);
  return {
    total: d.length,
    active30: tally(u => u.seenDays <= 30),
    today: tally(u => u.seenDays === 0),
    mfaOn: mfaEligible.filter(u => u.mfa).length,
    mfaEligible: mfaEligible.length,
    suspended: tally(u => u.status === 'suspended'),
    locked: tally(u => u.status === 'locked'),
    pending: tally(u => u.status === 'pending'),
    dormant: tally(u => u.seenDays > 90),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG STORE  —  append-only safeguarding artifact
// ═══════════════════════════════════════════════════════════════════════════
//  No code path edits or deletes an entry. Runtime entries (impersonation,
//  exports, DSAR fulfilment) are PREPENDED to a localStorage overlay; the
//  immutable seed (SA_AUDIT) is always shown beneath. Exporting the log is
//  itself audited. PII/AADC: entries prefer counts + targets over identities.
const SA_AUDIT_KEY = 'tutoros.saudit.v1';
const saAuditListeners = new Set();
const readSAAudit = () => { try { const raw = localStorage.getItem(SA_AUDIT_KEY); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } } catch (e) {} return []; };
const saAudit = (entry) => {
  const rec = { id: 'aud_rt_' + Date.now(), actor: 'Marcus Hale', actorRole: 'superadmin', ip: '82.14.21.5', ts: new Date().toISOString(), type: 'system', target: '—', ...entry };
  const next = [rec, ...readSAAudit()];
  try { localStorage.setItem(SA_AUDIT_KEY, JSON.stringify(next)); } catch (e) {}
  saAuditListeners.forEach(fn => fn(next));
  return rec;
};
const useSAAudit = () => {
  const [rt, setRt] = React.useState(readSAAudit);
  React.useEffect(() => { const fn = n => setRt(n); saAuditListeners.add(fn); return () => saAuditListeners.delete(fn); }, []);
  return [...rt, ...SA_AUDIT];   // runtime overlay first, immutable seed beneath
};

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORT SESSIONS  —  the only way the owner sees inside a tenant
// ═══════════════════════════════════════════════════════════════════════════
//  Support happens by EMAIL (decision #30); there is no ticket queue. When the
//  owner needs to look inside an account they open a SUPPORT SESSION: it must
//  name the support-email reference the tenant will recognise and a reason, it
//  expires on its own (≤ 60 min), and the tenant's admins see it (banner + a row
//  in their own audit log). Mirrors `support_sessions` / start_support_session.
//  The live session sits in tutoros.impersonation.v1 (the banner + auto-expiry
//  read it); every finished session is appended to tutoros.supportsessions.v1.
const SA_IMP_KEY = 'tutoros.impersonation.v1';
const SA_SESSIONS_KEY = 'tutoros.supportsessions.v1';
const SA_SESSION_MAX_MIN = 60;
const saSessionListeners = new Set();
const readSessionLog = () => { try { const a = JSON.parse(localStorage.getItem(SA_SESSIONS_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saNotifySessions = () => { window.dispatchEvent(new Event('sa-impersonation')); saSessionListeners.forEach(fn => fn()); };
// Close the live session (manual exit or expiry): stamp endedAt, move it to the log.
// `onlyId` guards the deferred expiry close: it must never end a newer session
// that was opened in the meantime.
const saCloseSession = (why, onlyId) => {
  let imp = null;
  try { imp = JSON.parse(localStorage.getItem(SA_IMP_KEY)); } catch (e) {}
  if (!imp || (onlyId && imp.id !== onlyId)) return null;
  const endedAt = why === 'expired' ? imp.expiresAt : new Date().toISOString();
  const rec = { ...imp, endedAt };
  try {
    localStorage.setItem(SA_SESSIONS_KEY, JSON.stringify([rec, ...readSessionLog()]));
    localStorage.removeItem(SA_IMP_KEY);
  } catch (e) {}
  saAudit({ action: `${why === 'expired' ? 'Support session expired' : 'Ended support session'} on ${imp.accountName} (${imp.supportRef})`, type: 'impersonation', target: imp.accountName });
  saNotifySessions();
  return rec;
};
// The live session, or null. An expired session reads as null at once, so
// nothing downstream can keep acting inside a tenant past its time box; closing
// it (log + audit + events) is deferred because this runs during render.
const readImpersonation = () => {
  let imp = null;
  try { imp = JSON.parse(localStorage.getItem(SA_IMP_KEY)); } catch (e) { return null; }
  if (!imp) return null;
  if (!imp.expiresAt || new Date(imp.expiresAt) <= new Date()) { setTimeout(() => saCloseSession('expired', imp.id), 0); return null; }
  return imp;
};
// Open a session. Refuses without a support reference and a reason — the tenant
// has to be able to match the session to an email thread they started.
const saStartSupportSession = ({ account, supportRef, reason, minutes }) => {
  const ref = String(supportRef || '').trim();
  const why = String(reason || '').trim();
  if (!account || !ref || !why) return { ok: false, reason: 'A support reference and a reason are required.' };
  if (readImpersonation()) saCloseSession('replaced');
  const mins = Math.max(5, Math.min(SA_SESSION_MAX_MIN, +minutes || 30));
  const start = new Date();
  const rec = {
    id: 'ss_' + start.getTime(), accountId: account.id, accountName: account.name,
    supportRef: ref, reason: why, role: 'Admin', by: 'Marcus Hale',
    startedAt: start.toISOString(), expiresAt: new Date(start.getTime() + mins * 60000).toISOString(), endedAt: null,
  };
  try { localStorage.setItem(SA_IMP_KEY, JSON.stringify(rec)); } catch (e) {}
  saAudit({ action: `Opened a ${mins}-min support session on ${account.name} (${ref}): ${why}`, type: 'impersonation', target: account.name });
  saNotifySessions();
  if (window.__navigate) window.__navigate('admin', 'dashboard');
  return { ok: true, session: rec };
};
const saImpersonateExit = () => {
  saCloseSession('ended');
  if (window.__navigate) window.__navigate('superadmin', 'support');
};
// Live + finished sessions, newest first (runtime log over the immutable seed).
const useSupportSessions = () => {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const fn = () => bump(n => n + 1);
    saSessionListeners.add(fn);
    window.addEventListener('sa-impersonation', fn);
    const t = setInterval(fn, 15000);   // re-derive "time left" and catch expiry
    return () => { saSessionListeners.delete(fn); window.removeEventListener('sa-impersonation', fn); clearInterval(t); };
  }, []);
  const live = readImpersonation();
  return { live, history: [...readSessionLog(), ...(window.SA_SUPPORT_SESSIONS || [])] };
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLATFORM SWITCHES  —  one row, like `platform_settings` (decision #32)
// ═══════════════════════════════════════════════════════════════════════════
//  Maintenance and read-only are DIFFERENT things:
//   • maintenance — the app is unavailable. Every tenant session gets the
//     maintenance screen instead of the app (the owner is exempt). Minutes,
//     for work that can't run online.
//   • read-only   — the app works but is frozen: everyone can read, every change
//     is refused behind a banner. Hours — an incident, a risky deploy. Scoped
//     platform-wide (readOnlyAccountIds: null) or to listed accounts; a
//     suspended account is read-only by definition.
//  The status page stays PRIVATE until an SLA or a customer's procurement asks
//  for it — incidents reach affected admins as a platform announcement instead.
const SA_PLATFORM_KEY = 'tutoros.platform.v1';
const SA_PLATFORM_DEFAULTS = {
  maintenanceMode: false, maintenanceNotice: '',
  maintenanceUntil: null,   // expected end, shown on the maintenance screen — a promise, not a timer
  readOnlyMode: false, readOnlyNotice: '', readOnlyAccountIds: null,
  signupsEnabled: true, statusPagePublic: false, updatedAt: null,
};
const saPlatformListeners = new Set();
const readPlatformSettings = () => {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SA_PLATFORM_KEY)) || {}; } catch (e) {}
  // One-time fold of the old stand-alone maintenance key into the single row.
  try {
    if (localStorage.getItem('tutoros.maintenance') === '1') {
      stored = { ...stored, maintenanceMode: true };
      localStorage.setItem(SA_PLATFORM_KEY, JSON.stringify({ ...SA_PLATFORM_DEFAULTS, ...stored }));
    }
    localStorage.removeItem('tutoros.maintenance');
  } catch (e) {}
  return { ...SA_PLATFORM_DEFAULTS, ...stored };
};
const updatePlatformSettings = (patch) => {
  const next = { ...readPlatformSettings(), ...patch, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(SA_PLATFORM_KEY, JSON.stringify(next)); } catch (e) {}
  saPlatformListeners.forEach(fn => fn(next));
  window.dispatchEvent(new Event('sa-platform'));
  return next;
};
// Re-read the row and tell every subscriber — what the maintenance screen's
// "Check now" and 30-second poll call (the production twin reads v_platform_status).
const refreshPlatformSettings = () => {
  const next = readPlatformSettings();
  saPlatformListeners.forEach(fn => fn(next));
  return next;
};
const usePlatformSettings = () => {
  const [s, setS] = React.useState(readPlatformSettings);
  React.useEffect(() => {
    const fn = n => setS(n);
    // Another tab (e.g. the owner console) changed a switch.
    const onStorage = (e) => { if (e.key === SA_PLATFORM_KEY) setS(readPlatformSettings()); };
    saPlatformListeners.add(fn);
    window.addEventListener('storage', onStorage);
    return () => { saPlatformListeners.delete(fn); window.removeEventListener('storage', onStorage); };
  }, []);
  return [s, updatePlatformSettings];
};
// Can this account write right now? The prototype twin of `writes_allowed()`.
const saWritesAllowed = (accountId, s = readPlatformSettings()) => {
  if (s.maintenanceMode) return false;
  if (s.readOnlyMode && (s.readOnlyAccountIds == null || s.readOnlyAccountIds.includes(accountId))) return false;
  const a = SA_ACCOUNTS.find(x => x.id === accountId);
  return !(a && a.status === 'suspended');
};

// ═══════════════════════════════════════════════════════════════════════════
//  FEATURE FLAGS  —  rollout only: a master switch + an optional allowlist
// ═══════════════════════════════════════════════════════════════════════════
//  `accountIds: null` = every account; an array = only those. The prototype
//  twin of `feature_flags` + flag_enabled(): no percentages, no cohorts, no plan
//  gate (plans gate surfaces through capabilities, decision #25).
const SA_FLAGS_KEY = 'tutoros.flags.v1';
const saFlagListeners = new Set();
const readFlags = () => { try { const a = JSON.parse(localStorage.getItem(SA_FLAGS_KEY)); if (Array.isArray(a)) return a; } catch (e) {} return JSON.parse(JSON.stringify(SA_FLAGS)); };
const writeFlags = (next) => { try { localStorage.setItem(SA_FLAGS_KEY, JSON.stringify(next)); } catch (e) {} saFlagListeners.forEach(fn => fn(next)); };
const useFeatureFlags = () => {
  const [flags, setFlags] = React.useState(readFlags);
  React.useEffect(() => { const fn = n => setFlags(n); saFlagListeners.add(fn); return () => { saFlagListeners.delete(fn); }; }, []);
  const patch = (id, p) => writeFlags(readFlags().map(f => f.id === id ? { ...f, ...p } : f));
  const add = (id, desc) => {
    const key = String(id || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key || readFlags().some(f => f.id === key)) return null;
    const rec = { id: key, desc: String(desc || '').trim(), on: false, accountIds: null };
    writeFlags([...readFlags(), rec]);
    return rec;
  };
  return { flags, patch, add };
};
const saFlagEnabled = (flagId, accountId) => {
  const f = readFlags().find(x => x.id === flagId);
  return !!f && f.on && (f.accountIds == null || f.accountIds.includes(accountId));
};

// ═══════════════════════════════════════════════════════════════════════════
//  OWNER ALERTS  —  what reaches the platform owner's bell
// ═══════════════════════════════════════════════════════════════════════════
//  Not a notification system of its own: each alert is DERIVED from rows that
//  already exist (failed payments, data requests, trials, seat + storage fill),
//  so the bell, the email and the page it links to read one source. Anything a
//  centre admin should handle never lands here. "Wake me up" alerts (service
//  down, error spike) come from the external monitor and Sentry, not this bell.
// Pupil-filed subject access requests (decision #62, window.klasioDataRequests)
// join the static DSAR mock so the statutory clock shows on the owner console.
const saLiveDsar = () => {
  const D = window.klasioDataRequests;
  if (!D) return [];
  const fmt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return D.list().map(r => ({
    id: r.id, live: true, kind: 'export', requester: `pupil · ${r.centreName || 'Bright Minds'}`, accountId: 'acc_brightminds',
    subject: `1 student (self) · ${r.subjectName}`, received: fmt(r.receivedAt), deadline: fmt(r.dueAt),
    status: r.status === 'completed' ? 'fulfilled' : r.status === 'open' ? 'awaiting' : 'in_progress',
  }));
};
const saDsarRows = () => [...saLiveDsar(), ...SA_DSAR];

const saOwnerAlerts = () => {
  const out = [];
  SAMetrics.failedPayments().forEach(f => out.push({
    id: 'pay_' + f.accountId, sig: `pay:${f.accountId}:${f.attempts}:${f.state}`, icon: 'invoice', tone: 'danger', page: 'revenue',
    title: `Payment failed — ${f.name}`, sub: `£${f.amount} · attempt ${f.attempts} · ${f.state.replace('_', ' ')}`,
  }));
  saDsarRows().filter(d => d.status !== 'fulfilled').forEach(d => out.push({
    id: 'dsar_' + d.id, sig: `dsar:${d.id}`, icon: 'shield', tone: 'warning', page: 'security',
    title: `${d.kind === 'delete' ? 'Erasure' : 'Access'} request — ${d.requester}`, sub: `Statutory deadline ${d.deadline} · ${d.subject}`,
  }));
  SA_ACCOUNTS.filter(a => a.status === 'suspended').forEach(a => out.push({
    id: 'susp_' + a.id, sig: `susp:${a.id}`, icon: 'alert', tone: 'danger', page: 'centres',
    title: `${a.name} is suspended`, sub: 'Read-only until reactivated · review or schedule deletion',
  }));
  // Trials with real usage are the best sales signal on the platform.
  SA_ACCOUNTS.filter(a => a.status === 'trial').forEach(a => {
    const usage = Math.max(...a.centres.map(c => c.usage));
    if (usage >= 30) out.push({
      id: 'trial_' + a.id, sig: `trial:${a.id}:${a.trialEndsAt}`, icon: 'calendar', tone: 'info', page: 'centres',
      title: `Trial ending — ${a.name}`, sub: `Ends ${a.trialEndsAt} · ${usage}% active usage — worth a call`,
    });
  });
  // Upsell triggers (weekly digest tier): accounts at ≥ 90% of seats or storage.
  SA_ACCOUNTS.forEach(a => {
    const s = SAMetrics.seatUsage(a).students;
    const pct = s.licensed ? Math.round((s.used / s.licensed) * 100) : 0;
    if (pct >= 90) out.push({
      id: 'seats_' + a.id, sig: `seats:${a.id}:${pct}`, icon: 'users', tone: 'success', page: 'centres',
      title: `${a.name} is at ${pct}% of student seats`, sub: `${s.used} of ${s.licensed} · upgrade candidate`,
    });
  });
  if (typeof window.stgAccounts === 'function') {
    window.stgAccounts().forEach(a => {
      const used = window.stgUsageByAccount(a.accountId);
      const quota = window.stgQuotaForAccount({ accountId: a.accountId, planId: a.planId });
      const pct = quota ? Math.round((used / quota) * 100) : 0;
      if (pct >= 90) out.push({
        id: 'stg_' + a.accountId, sig: `stg:${a.accountId}:${pct}`, icon: 'cloud', tone: 'warning', page: 'storage',
        title: `${a.name} is at ${pct}% of storage`, sub: `${window.stgFmtBytes(used)} of ${window.stgFmtBytes(quota)} · add-on or upgrade`,
      });
    });
  }
  return out;
};

// ─── Shared SuperAdmin Components ────────────────────────────────────────────

// Delegates to the shared soft-filled StatusPill so superadmin statuses match
// the rest of the app; keeps SA-specific labels (Past Due, Locked…). ONE status
// per entity — Elite Academy resolves to "Past Due" everywhere it appears.
const SAStatusPill = ({ status }) => {
  const map = {
    active:    { tone: 'positive', label: 'Active' },
    trial:     { tone: 'info',     label: 'Trial' },
    past_due:  { tone: 'warning',  label: 'Past Due' },
    suspended: { tone: 'negative', label: 'Suspended' },
    locked:    { tone: 'negative', label: 'Locked' },
    pending:   { tone: 'warning',  label: 'Pending' },
    open:      { tone: 'info',     label: 'Open' },
    resolved:  { tone: 'positive', label: 'Resolved' },
    fulfilled: { tone: 'positive', label: 'Fulfilled' },
    in_progress:{ tone: 'info',    label: 'In progress' },
    awaiting:  { tone: 'warning',  label: 'Awaiting' },
  };
  const v = map[status] || map.active;
  return <StatusPill tone={v.tone}>{v.label}</StatusPill>;
};

// Colour a plan by id — brand accent for the top tier, neutral for entry.
const saPlanColor = (planId) => ({ starter: '#9CA3AF', growth: SA_CHART_PALETTE[0], scale: DS.accent, enterprise: DS.warning }[planId] || DS.accent);

// Plan tier chip — reads the plan NAME from the catalog (never a local literal).
const SAPlanPill = ({ planId }) => {
  const name = SAMetrics.planName(planId);
  const c = saPlanColor(planId);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6,
      background: c + '1A', color: c, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{name}</span>
  );
};

const SAChurnDot = ({ risk }) => {
  const map = { low: DS.success, med: DS.warning, high: DS.danger };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: DS.muted }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: map[risk] || DS.muted }} />
      {risk}
    </span>
  );
};

// Donut chart for breakdowns
const SADonut = ({ data, size = 140 }) => {
  const total = data.reduce((a, b) => a + b.pct, 0) || 1;
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={DS.border} strokeWidth="14" />
      {data.map((d, i) => {
        const len = (d.pct / total) * circ;
        const dasharray = `${len} ${circ - len}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth="14"
            strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`} />
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill={DS.text}>{Math.round(total)}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill={DS.muted}>total</text>
    </svg>
  );
};

// Simple horizontal bar
const SAHBar = ({ pct, color, height = 6 }) => (
  <div style={{ height, background: DS.surface, borderRadius: height / 2, overflow: 'hidden', flex: 1 }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color || DS.accent, borderRadius: height / 2, transition: 'width 0.3s' }} />
  </div>
);

// Region list, derived from centres/accounts (SAMetrics.geographic).
const SARegionMap = ({ regions }) => {
  const max = Math.max(...regions.map(r => r.users), 1);
  const NAMES = { UK: 'United Kingdom', IE: 'Ireland', SE: 'Sweden', FR: 'France', GR: 'Greece', ES: 'Spain', DE: 'Germany', AE: 'UAE' };
  return (
    <div style={{ padding: '4px 0' }}>
      {regions.map((r, i) => (
        <div key={r.country} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderBottom: i < regions.length - 1 ? `1px solid ${DS.border}` : 'none',
        }}>
          <span style={{ fontSize: 20 }}>{r.flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{NAMES[r.country] || r.country}</div>
            <div style={{ fontSize: 11, color: DS.muted }}>{r.centres} centre{r.centres !== 1 ? 's' : ''} · £{r.revenue.toLocaleString()}/mo</div>
          </div>
          <div style={{ minWidth: 50, textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.users}</div>
            <div style={{ fontSize: 10, color: DS.muted }}>users</div>
          </div>
          <div style={{ width: 80 }}><SAHBar pct={(r.users / max) * 100} color={DS.accent} /></div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  STAT SURFACES  —  ONE card per stat row (not a row of boxes)
// ═══════════════════════════════════════════════════════════════════════════
//  Every owner-console screen used to open with 4–7 separate bordered tiles,
//  which reads as clutter at 7-across and forces the numbers small. The console
//  now has ONE stat surface language instead:
//
//    <SAStatBand/>   a single card split by hairlines — the default row
//    <SALeadStat/>   one hero number + a grid of supporting stats (money pages)
//    <SAStatTabs/>   one card, switchable views (pages with several stat families)
//
//  Shared typography: big tabular number, small quiet uppercase label, one line
//  of context underneath. Colour is carried by the context line / bar, never by
//  the number, so a row of nine reads calm.
const SA_TONE = { pos: DS.success, neg: DS.danger, warn: DS.warning, info: DS.info, muted: DS.muted, accent: DS.accent };
const saTone = (t) => (t ? (SA_TONE[t] || t) : null);

const SAStatCell = ({ s, valueSize = 28, divider, rowDivider, pad = '16px 20px 17px' }) => {
  const [hov, setHov] = React.useState(false);
  const tone = saTone(s.tone);
  const clickable = !!s.onClick;
  return (
    <div
      title={s.tip || ''}
      onClick={s.onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: pad, minWidth: 0,
        borderLeft: divider ? `1px solid ${DS.border}` : 'none',
        borderTop: rowDivider ? `1px solid ${DS.border}` : 'none',
        background: clickable && hov ? DS.surface : 'transparent',
        cursor: clickable ? 'pointer' : s.tip ? 'help' : 'default',
        transition: 'background 0.12s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {s.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />}
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: DS.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{s.label}</span>
        {clickable && hov && <Icon name="chevron_r" size={11} color={DS.faint} />}
      </div>
      <div style={{
        fontSize: valueSize, fontWeight: 700, letterSpacing: '-0.9px', lineHeight: 1.05, marginTop: 9,
        color: s.valueColor || DS.text, fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{s.value}</div>
      {s.bar != null && <div style={{ marginTop: 10, display: 'flex' }}><SAHBar pct={s.bar} color={s.barColor || DS.accent} height={4} /></div>}
      {(s.sub || s.trend) && (
        <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {s.trend && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, flexShrink: 0,
              color: s.trendDir === 'up' ? DS.success : s.trendDir === 'down' ? DS.danger : DS.muted,
            }}>
              <Icon name={s.trendDir === 'up' ? 'trending_up' : s.trendDir === 'down' ? 'trending_dn' : 'clock'} size={12} />
              {s.trend}
            </span>
          )}
          {s.sub && <span style={{ fontSize: 11.5, color: tone || DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</span>}
        </div>
      )}
    </div>
  );
};

// The workhorse: N stats on ONE card. `size` scales the number only.
const SAStatBand = ({ items = [], size = 'md', columns, style }) => {
  const cols = columns || items.length || 1;
  const valueSize = { lg: 34, md: 28, sm: 24 }[size] || 28;
  return (
    <div style={{
      background: DS.card, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, boxShadow: DS.cardShadow,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, overflow: 'hidden', ...style,
    }}>
      {items.map((s, i) => (
        <SAStatCell key={s.label} s={s} valueSize={valueSize} divider={i % cols !== 0} rowDivider={i >= cols} />
      ))}
    </div>
  );
};

// Hero + supporting grid — for pages with one headline number (money, health).
const SALeadStat = ({ lead, items = [], columns = 3, style }) => {
  const cols = columns;
  return (
    <div style={{
      background: DS.card, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, boxShadow: DS.cardShadow,
      display: 'grid', gridTemplateColumns: 'minmax(230px, 0.95fr) 2.6fr', overflow: 'hidden', ...style,
    }}>
      <div style={{
        padding: '24px 26px', background: DS.surface, borderRight: `1px solid ${DS.border}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0,
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: DS.muted }}>{lead.label}</div>
        <div style={{
          fontSize: 46, fontWeight: 700, letterSpacing: '-1.8px', color: DS.text, lineHeight: 1,
          marginTop: 12, fontVariantNumeric: 'tabular-nums',
        }}>{lead.value}</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {lead.trend && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600,
              padding: '2px 8px', borderRadius: 20,
              background: lead.trendDir === 'down' ? DS.dangerBg : DS.successBg,
              color: lead.trendDir === 'down' ? DS.danger : DS.success,
            }}>
              <Icon name={lead.trendDir === 'down' ? 'trending_dn' : 'trending_up'} size={12} />{lead.trend}
            </span>
          )}
          {lead.sub && <span style={{ fontSize: 12, color: DS.muted }}>{lead.sub}</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((s, i) => (
          <SAStatCell key={s.label} s={s} valueSize={24} divider={i % cols !== 0} rowDivider={i >= cols} pad="15px 18px 16px" />
        ))}
      </div>
    </div>
  );
};

// One card, several stat views. `tabs` = [{ id, label, items, columns, size, render }].
const SAStatTabs = ({ tabs = [], right, defaultTab }) => {
  const [tab, setTab] = React.useState(defaultTab || (tabs[0] && tabs[0].id));
  const cur = tabs.find(t => t.id === tab) || tabs[0];
  if (!cur) return null;
  const cols = cur.columns || (cur.items || []).length || 1;
  const valueSize = { lg: 34, md: 28, sm: 24 }[cur.size || 'md'] || 28;
  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, boxShadow: DS.cardShadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, padding: '0 10px', borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
        {tabs.map(t => {
          const on = t.id === cur.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              appearance: 'none', background: 'none', border: 'none', cursor: 'pointer',
              padding: '11px 12px 10px', fontSize: 12.5, fontWeight: on ? 700 : 500,
              color: on ? DS.text : DS.muted, borderBottom: `2px solid ${on ? DS.accent : 'transparent'}`,
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              {t.icon && <Icon name={t.icon} size={13} color={on ? DS.accent : DS.faint} />}
              {t.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {right && <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10 }}>{right}</div>}
      </div>
      {(cur.items || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {cur.items.map((s, i) => (
            <SAStatCell key={s.label} s={s} valueSize={valueSize} divider={i % cols !== 0} rowDivider={i >= cols} />
          ))}
        </div>
      )}
      {cur.render && (
        <div style={{ borderTop: (cur.items || []).length ? `1px solid ${DS.border}` : 'none', padding: '18px 20px' }}>{cur.render}</div>
      )}
    </div>
  );
};

// Quiet section heading inside a detail popover.
const SASectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
    color: DS.faint, marginBottom: 9,
  }}>{children}</div>
);

// Compact label/value pair used inside detail popovers (Centres / Users).
const SADetailRow = ({ label, children, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
    borderBottom: last ? 'none' : `1px solid ${DS.border}`,
  }}>
    <span style={{ fontSize: 12, color: DS.muted, minWidth: 96, flexShrink: 0 }}>{label}</span>
    <div style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12.5, color: DS.text, fontWeight: 500 }}>{children}</div>
  </div>
);

// Grouped action list inside a detail popover: a full-width row per action so
// every account/user action lives in ONE predictable place (no row kebabs).
const SAActionList = ({ items = [] }) => (
  <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, overflow: 'hidden' }}>
    {items.map((a, i) => <SAActionRow key={a.label} a={a} last={i === items.length - 1} />)}
  </div>
);

const SAActionRow = ({ a, last }) => {
  const [hov, setHov] = React.useState(false);
  const col = a.danger ? DS.danger : DS.text;
  return (
    <button onClick={a.onClick} disabled={a.disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', appearance: 'none', textAlign: 'left', cursor: a.disabled ? 'not-allowed' : 'pointer',
        border: 'none', borderBottom: last ? 'none' : `1px solid ${DS.border}`,
        background: hov && !a.disabled ? (a.danger ? DS.dangerBg : DS.surface) : DS.bg,
        padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
        opacity: a.disabled ? 0.5 : 1, transition: 'background 0.12s ease',
      }}>
      <Icon name={a.icon || 'chevron_r'} size={15} color={a.danger ? DS.danger : DS.muted} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: col }}>{a.label}</span>
      {a.hint && <span style={{ fontSize: 11.5, color: DS.faint }}>{a.hint}</span>}
      <Icon name="chevron_r" size={13} color={DS.faint} />
    </button>
  );
};

// Lightweight transient success banner (prototype feedback for wired actions).
const SAFlash = ({ msg, onDone }) => {
  React.useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000,
      background: DS.text, color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    }}>
      <Icon name="check" size={14} color={DS.success} /> {msg}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW DASHBOARD  —  triage surface (KPI quad stays as-is)
// ═══════════════════════════════════════════════════════════════════════════

// Overview range → how many months of the monthly MRR movement it covers.
const SA_RANGES = [
  { id: '1m',  label: 'This month',     months: 1 },
  { id: '3m',  label: 'Last 3 months',  months: 3 },
  { id: '6m',  label: 'Last 6 months',  months: 6 },
  { id: 'all', label: 'All (8 months)', months: 8 },
];

const SuperAdminDashboard = () => {
  // Maintenance is switched ON only in Platform Controls, behind a confirm. The
  // Overview only ever offers the way OUT — the fastest possible off-switch.
  const [platform, setPlatform] = usePlatformSettings();
  const [range, setRange] = React.useState('1m');
  const [flash, setFlash] = React.useState('');

  const rangeMeta = SA_RANGES.find(r => r.id === range) || SA_RANGES[0];
  const p = SAMetrics.period(rangeMeta.months);
  const mrr = SAMetrics.platformMRR();
  const dist = SAMetrics.planDistribution();
  const distTotal = dist.reduce((s, d) => s + d.accounts, 0) || 1;
  const topAccounts = SAMetrics.accountsByMRR().slice(0, 6);
  const periodPhrase = rangeMeta.months === 1 ? 'this month' : rangeMeta.id === 'all' ? 'over all 8 months' : `over the ${rangeMeta.label.toLowerCase()}`;
  const signed = (n, unit = '') => `${n >= 0 ? '+' : '−'}${unit}${Math.abs(n).toLocaleString()}`;

  const exitMaintenance = () => {
    setPlatform({ maintenanceMode: false, maintenanceUntil: null });
    saAudit({ action: 'Turned maintenance mode off (from Overview)', type: 'system', target: 'Platform' });
    setFlash('Maintenance mode off — centres are back');
  };

  // ONE stat surface: MRR is the headline of this console, the rest support it.
  // The range drives the trend, movement and churn figures; point-in-time counts
  // (accounts, users) say "today" so nothing all-time poses as the period.
  const goto = (page) => () => window.__navigate && window.__navigate('superadmin', page);
  const leadStat = {
    label: 'Monthly Recurring Revenue',
    value: `£${mrr.toLocaleString()}`,
    trend: `${p.growthPct >= 0 ? '+' : '−'}${Math.abs(p.growthPct)}%`, trendDir: p.growthPct >= 0 ? 'up' : 'down', sub: periodPhrase,
  };
  const supportStats = [
    { label: 'ARR',           value: `£${SAMetrics.arr().toLocaleString()}`, sub: 'annualised run rate', onClick: goto('revenue') },
    { label: 'Accounts',      value: SAMetrics.accounts().length.toString(),  sub: `${SAMetrics.payingAccounts().length} billing · today`, onClick: goto('centres') },
    { label: 'Net new MRR',   value: signed(p.net, '£'),                      sub: `£${p.newMRR.toLocaleString()} new · £${p.churnedMRR.toLocaleString()} churned`, onClick: goto('revenue') },
    { label: 'Total Users',   value: SAMetrics.totalUsers().toLocaleString(), sub: 'today', onClick: goto('users') },
    { label: 'ARPU',          value: `£${SAMetrics.arpu().toLocaleString()}`, sub: 'per paying account', onClick: goto('revenue') },
    { label: 'Revenue churn', value: `${p.churnRate}%`,                       sub: `of MRR ${periodPhrase}`, onClick: goto('revenue') },
  ];

  // Board pack → CSV, audited. Every row is either scoped to the selected
  // period or labelled "as at export".
  const exportBoardPack = () => {
    const openIncidents = SA_INCIDENTS.filter(i => i.status !== 'resolved').length;
    const rows = [
      ['Metric', 'Value', 'Basis'],
      ['Period', `${rangeMeta.label} (${p.labels[1] || p.labels[0]} – ${p.labels[p.labels.length - 1]})`, 'period'],
      ['MRR at start of period', `£${p.startMRR}`, 'period'],
      ['MRR at end of period', `£${p.endMRR}`, 'period'],
      ['MRR growth', `${p.growthPct}%`, 'period'],
      ['New MRR', `£${p.newMRR}`, 'period'],
      ['Churned MRR', `£${p.churnedMRR}`, 'period'],
      ['Net new MRR', `£${p.net}`, 'period'],
      ['Revenue churn', `${p.churnRate}%`, 'period'],
      ['ARR (run rate)', `£${SAMetrics.arr()}`, 'as at export'],
      ['Billing accounts', SAMetrics.payingAccounts().length, 'as at export'],
      ['Active centres', SAMetrics.activeCentres(), 'as at export'],
      ['Total users', SAMetrics.totalUsers(), 'as at export'],
      ['Open incidents', openIncidents, 'as at export'],
    ];
    saDownloadCSV(`klasio-board-pack-${range}.csv`, rows);
    saAudit({ action: `Exported board pack (${rangeMeta.label})`, type: 'export', target: 'Platform overview' });
    setFlash('Board pack exported (CSV)');
  };

  const roIds = platform.readOnlyAccountIds;
  const roScope = roIds == null ? 'every account' : `${roIds.length} account${roIds.length === 1 ? '' : 's'}`;

  return (
    <div style={{ ...pageFrame(), overflow: 'auto' }}>
      <PageHeader
        title="Platform Overview"
        subtitle={`${new Date(SA_NOW).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${BRAND.name} Platform`}
        actions={[
          <select key="range" value={range} onChange={e => setRange(e.target.value)} title="Scopes the trend, movement and churn figures and the board pack" style={{
            padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, background: DS.bg,
            color: DS.sub, fontSize: 13, cursor: 'pointer',
          }}>
            {SA_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>,
          <Btn key="exp" variant="secondary" icon="download" small onClick={exportBoardPack}>Export board pack</Btn>,
          ...(platform.maintenanceMode
            ? [<Btn key="maint" variant="danger" icon="zap" small onClick={exitMaintenance}>Exit maintenance</Btn>]
            : []),
        ]}
      />

      {platform.maintenanceMode && (
        <div style={{
          marginBottom: 12, padding: '12px 16px', borderRadius: 8,
          background: DS.dangerBg, border: `1px solid ${DS.danger}33`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="alert" size={16} color={DS.danger} />
          <div style={{ flex: 1, fontSize: 13, color: DS.danger, fontWeight: 600 }}>
            Maintenance mode is on — every centre sees the maintenance screen instead of the app.
          </div>
        </div>
      )}
      {platform.readOnlyMode && (
        <div style={{
          marginBottom: 12, padding: '12px 16px', borderRadius: 8,
          background: DS.warningBg, border: `1px solid ${DS.warningBorder}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="lock" size={16} color={DS.warning} />
          <div style={{ flex: 1, fontSize: 13, color: DS.warning, fontWeight: 600 }}>
            Read-only mode is on for {roScope} — users can read everything, but changes are refused.
          </div>
          <Btn variant="ghost" small onClick={goto('controls')}>Platform Controls</Btn>
        </div>
      )}
      {(platform.maintenanceMode || platform.readOnlyMode) && <div style={{ height: 8 }} />}

      {/* Headline stat surface — hero MRR + supporting grid, one card */}
      <SALeadStat lead={leadStat} items={supportStats} columns={3} style={{ marginBottom: 20 }} />

      {/* Charts row — trend + KPI both driven by getPlatformMRR() */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Revenue & Growth Trend" actions={[<Badge key="b" variant="accent">{rangeMeta.label}</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 2, background: DS.accent, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: DS.muted }}>Platform MRR (£)</span>
              </div>
            </div>
            <LineChart labels={p.labels} series={[{ label: 'MRR (£)', data: p.mrr, color: DS.accent }]} height={200} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
            {[
              [`£${SAMetrics.arr().toLocaleString()}`, 'ARR', DS.accent],
              [`£${SAMetrics.arpu().toLocaleString()}`, 'Avg ARPU', SA_CHART_PALETTE[0]],
              [`£${SAMetrics.ltv().toLocaleString()}`, 'LTV (24mo)', SA_CHART_PALETTE[1]],
            ].map(([v, l, c], i) => (
              <div key={l} style={{ padding: '14px 20px', borderRight: i < 2 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: DS.muted, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Plan Distribution">
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <SADonut data={dist.map(d => ({ pct: Math.round((d.accounts / distTotal) * 100), color: saPlanColor(d.id) }))} size={140} />
            <div style={{ width: '100%' }}>
              {dist.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: saPlanColor(d.id) }} />
                  <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: DS.muted }}>{d.accounts} account{d.accounts !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.text, minWidth: 30, textAlign: 'right' }}>{Math.round((d.accounts / distTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top accounts + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Top Accounts by Revenue" actions={[<Btn key="v" variant="ghost" icon="eye" small onClick={() => { window.__saCentresSort = 'mrr'; window.__navigate && window.__navigate('superadmin', 'centres'); }}>View all</Btn>]}>
          <Table
            pagination={false}
            cols={['Account', 'Plan', 'Centres', 'MRR', 'Status', 'Risk']}
            rows={topAccounts.map(a => [
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{a.owner} · {a.centres.length} centre{a.centres.length !== 1 ? 's' : ''}</div>
              </div>,
              <SAPlanPill planId={a.planId} />,
              <span style={{ fontSize: 13, color: DS.sub }}>{a.centres.length}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>£{SAMetrics.accountMRR(a).toLocaleString()}</span>,
              <SAStatusPill status={a.status} />,
              <SAChurnDot risk={a.churnRisk} />,
            ])}
          />
        </Card>

        <Card title="Real-time Activity" actions={[<Badge key="b" variant="default">Recent</Badge>]}>
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {SA_ACTIVITY.map((a, i) => {
              const colorMap = { info: DS.info, success: DS.success, warning: DS.warning, danger: DS.danger };
              const go = () => { if (!a.href) return; if (a.href.accountId) window.__saCentresFocus = a.href.accountId; window.__navigate && window.__navigate('superadmin', a.href.page); };
              return (
                <div key={i} onClick={go} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                  borderBottom: i < SA_ACTIVITY.length - 1 ? `1px solid ${DS.border}` : 'none',
                  cursor: a.href ? 'pointer' : 'default',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, background: colorMap[a.severity], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: DS.sub, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{a.time}</div>
                  </div>
                  {a.href && <Icon name="chevron_r" size={13} color={DS.faint} />}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Health band (one card, links into System Health) */}
      <SAStatBand
        size="sm"
        style={{ marginBottom: 20 }}
        items={[
          { label: 'API p95',    value: SA_SYS.p95, sub: 'last hour',      dot: DS.success, tip: SA_SYS_SOURCE.sentry,  onClick: goto('system') },
          { label: 'Uptime',     value: SA_SYS.uptime30, sub: '30-day rolling', dot: DS.success, tip: SA_SYS_SOURCE.monitor, onClick: goto('system') },
          { label: 'Error Rate', value: `${SA_SYS.errorRate}%`, sub: '5xx responses', dot: DS.success, tip: SA_SYS_SOURCE.sentry, onClick: goto('system') },
          (() => { const q = saQueueTotals(); return { label: 'Queues', value: q.pending.toString(), sub: q.failed ? `${q.failed} failed` : 'pending, none failed', dot: q.failed ? DS.warning : DS.success, tone: q.failed ? 'warn' : undefined, tip: SA_SYS_SOURCE.queues, onClick: goto('system') }; })(),
        ]}
      />
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// Shared System-Health values so Overview + System page read ONE value each.
// All mock. SA_SYS_SOURCE names where each would really come from.
const SA_SYS = { errorRate: 0.04, uptime30: '99.97%', p50: '42ms', p95: '142ms', p99: '480ms' };
const SA_SYS_SOURCE = {
  monitor: 'Production: an external uptime monitor polling GET /v1/health — never a check that runs inside the thing it watches.',
  sentry:  'Production: Sentry performance data for the Fastify API.',
  queues:  'Production: counts from jobs, email_outbox and processed_events via GET /v1/admin/system-health.',
};
const saQueueTotals = () => (SA_QUEUES || []).reduce((t, q) => ({ pending: t.pending + q.pending, failed: t.failed + q.failed }), { pending: 0, failed: 0 });

// Service status, worst first wins. One roll-up feeds System Health (internal
// services) and the public status page (customer-facing components), so the two
// can never tell different stories.
const SA_STATUS_ORDER = ['operational', 'degraded', 'partial_outage', 'major_outage'];
const SA_STATUS_META = {
  operational:    { label: 'Operational',          headline: 'All systems operational',             tone: 'success' },
  degraded:       { label: 'Degraded performance', headline: 'Some systems are running slowly',     tone: 'warning' },
  partial_outage: { label: 'Partial outage',       headline: 'Some systems are partly unavailable', tone: 'warning' },
  major_outage:   { label: 'Major outage',         headline: 'Klasio is having a major outage',     tone: 'danger' },
};
const saWorstStatus = (list) => list.reduce((w, st) => (SA_STATUS_ORDER.indexOf(st) > SA_STATUS_ORDER.indexOf(w) ? st : w), 'operational');
const SAHealth = {
  overall: () => saWorstStatus(SA_SERVICES.map(x => x.status)),
  components: () => SA_PUBLIC_COMPONENTS.map(c => {
    const services = SA_SERVICES.filter(x => x.component === c.id);
    return { ...c, services, status: saWorstStatus(services.map(x => x.status)) };
  }),
  meta: (status) => SA_STATUS_META[status] || SA_STATUS_META.operational,
};

// CSV helper (client-side blob download; no network).
const saCsvCell = (v) => {
  const s = String(v == null ? '' : v);
  const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n');
  return needsQuote ? '"' + s.split('"').join('""') + '"' : s;
};
const saDownloadCSV = (filename, rows) => {
  const csv = rows.map(r => r.map(saCsvCell).join(',')).join('\n');
  try {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {}
};

// ═══════════════════════════════════════════════════════════════════════════
//  CENTRES (Accounts)  —  each row is an ACCOUNT (tenant); centres drill down.
// ═══════════════════════════════════════════════════════════════════════════

const SACentresPage = () => {
  // Local accounts state seeded from the metrics source. Row actions mutate it
  // so Suspend / Reactivate / Change plan / Extend trial / Delete are real
  // within the session. PRODUCTION: a persisted, cross-instance accounts store
  // (same pattern as usePlansStore) so mutations propagate platform-wide.
  const [accounts, setAccounts] = React.useState(() => JSON.parse(JSON.stringify(SA_ACCOUNTS)));
  const plansStore = usePlansStore();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const [sort, setSort] = React.useState(window.__saCentresSort || 'mrr');
  const [wizard, setWizard] = React.useState(false);
  const [planEdit, setPlanEdit] = React.useState(null);   // account being re-planned
  const [confirm, setConfirm] = React.useState(null);     // { title, body, danger, onOk }
  const [sessionFor, setSessionFor] = React.useState(null); // account a support session is being opened on
  const [flash, setFlash] = React.useState('');

  React.useEffect(() => {
    if (window.__saCentresFocus) {
      const a = accounts.find(x => x.id === window.__saCentresFocus);
      if (a) setSelected(a);
      window.__saCentresFocus = null;
    }
    if (window.__saCentresSort) { setSort(window.__saCentresSort); window.__saCentresSort = null; }
  }, []);

  const mrrOf = (a) => SAMetrics.isBilling(a) ? (function () { let p = SAMetrics.planPrice(a.planId); if (a.promoCode && typeof planFindCode === 'function') { const c = planFindCode(a.promoCode); if (c) p = planApplyCode(p, c); } return p; })() : 0;

  const patch = (id, next, note) => {
    setAccounts(list => list.map(a => a.id === id ? { ...a, ...next } : a));
    setSelected(s => (s && s.id === id ? { ...s, ...next } : s));
    if (note) { saAudit(note); setFlash(note.action); }
  };

  // At-risk rule (surfaced as a tooltip): high churn risk OR past_due/suspended.
  const AT_RISK_RULE = 'At risk = repeated payment failure, prolonged inactivity, or a usage drop below 40%.';
  const isAtRisk = (a) => a.churnRisk === 'high' || a.status === 'past_due' || a.status === 'suspended';

  let filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q) ||
      a.centres.some(c => c.city.toLowerCase().includes(q));
    const matchFilter = filter === 'all' || a.status === filter || (filter === 'risk' && isAtRisk(a));
    return matchSearch && matchFilter;
  });
  filtered = [...filtered].sort((a, b) => sort === 'mrr' ? mrrOf(b) - mrrOf(a) : a.name.localeCompare(b.name));

  const totalCentres = accounts.reduce((s, a) => s + a.centres.length, 0);
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const trialCount = accounts.filter(a => a.status === 'trial').length;
  const suspendedCount = accounts.filter(a => a.status === 'suspended' || a.status === 'past_due').length;
  const atRiskCount = accounts.filter(isAtRisk).length;

  const mrrTotal = accounts.reduce((s, a) => s + mrrOf(a), 0);
  const stats = [
    { label: 'Accounts',  value: accounts.length.toString(), sub: `${totalCentres} centres`, onClick: () => setFilter('all') },
    { label: 'Active',    value: activeCount.toString(),     sub: 'billing normally', tone: 'pos', dot: DS.success, onClick: () => setFilter('active') },
    { label: 'On Trial',  value: trialCount.toString(),      sub: 'in evaluation',    tone: 'info', dot: DS.info,   onClick: () => setFilter('trial') },
    { label: 'Past Due',  value: suspendedCount.toString(),  sub: 'billing issues',   tone: 'neg',  dot: DS.danger, onClick: () => setFilter('past_due') },
    { label: 'At Risk',   value: atRiskCount.toString(),     sub: 'see rule',         tone: 'warn', dot: DS.warning, tip: AT_RISK_RULE, onClick: () => setFilter('risk') },
    { label: 'Total MRR', value: `£${mrrTotal.toLocaleString()}`, sub: 'across accounts' },
  ];

  // Every account action lives here and is rendered ONLY inside the detail
  // popover — the table has no per-row kebab, the whole row opens the popover.
  const accountActions = (a) => {
    const items = [
      { label: 'Open support session', icon: 'eye', primary: true, hint: 'ref + reason · ≤ 60 min', onClick: () => setSessionFor(a) },
      { label: 'Change plan', icon: 'invoice', hint: SAMetrics.planName(a.planId), onClick: () => setPlanEdit(a) },
      { label: 'View invoices', icon: 'invoice', onClick: () => { setFlash('Opening invoices…'); saAudit({ action: `Viewed invoices for ${a.name}`, type: 'account', target: a.name }); } },
    ];
    if (a.status === 'trial') items.push({ label: 'Extend trial', icon: 'calendar', hint: a.trialEndsAt || '', onClick: () => patch(a.id, { trialEndsAt: '31 Aug 2026' }, { action: `Extended trial for ${a.name}`, type: 'account', target: a.name }) });
    items.push({ label: 'View audit trail', icon: 'list', onClick: () => window.__navigate && window.__navigate('superadmin', 'security') });
    if (a.status === 'suspended') items.push({ label: 'Reactivate account', icon: 'check', onClick: () => patch(a.id, { status: 'active' }, { action: `Reactivated ${a.name}`, type: 'account', target: a.name }) });
    else items.push({ label: 'Suspend account', icon: 'alert', danger: true, onClick: () => setConfirm({ title: `Suspend ${a.name}?`, body: 'The account goes read-only: its users can still sign in and see everything, but every change is refused until you reactivate it. Nothing is deleted.', danger: true, ok: 'Suspend', onOk: () => patch(a.id, { status: 'suspended' }, { action: `Suspended ${a.name}`, type: 'account', target: a.name }) }) });
    items.push({ label: 'Delete account', icon: 'trash', danger: true, onClick: () => setConfirm({ title: `Delete ${a.name}?`, body: 'Enters a 30-day retention countdown before permanent erasure (GDPR). Recoverable until then.', danger: true, ok: 'Delete', onOk: () => { setAccounts(list => list.filter(x => x.id !== a.id)); setSelected(null); saAudit({ action: `Scheduled deletion of ${a.name} (30-day retention)`, type: 'account', target: a.name }); setFlash('Account scheduled for deletion'); } }) });
    return items;
  };


  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Centres"
        subtitle={`${accounts.length} accounts · ${totalCentres} centres · ${atRiskCount} at risk`}
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => {
            // Tenant-scoped, PII-aware export (no student names — counts only).
            const rows = [['Account', 'Owner', 'Plan', 'Centres', 'MRR', 'Status', 'Country']];
            accounts.forEach(a => rows.push([a.name, a.owner, SAMetrics.planName(a.planId), a.centres.length, mrrOf(a), a.status, a.country]));
            saDownloadCSV('klasio-accounts.csv', rows);
            saAudit({ action: `Exported accounts CSV (${accounts.length} accounts)`, type: 'export', target: 'Accounts' });
            setFlash('Accounts exported (CSV)');
          }}>Export CSV</Btn>,
          // Secondary on purpose: self-serve signup is how accounts normally arrive.
          // This is the by-hand path — an enterprise deal, a migration, a pilot.
          <Btn key="add" variant="secondary" icon="plus" small onClick={() => setWizard(true)}>New account</Btn>,
        ]}
      />

      {/* Stat band — one card; each segment is also a filter shortcut */}
      <SAStatBand items={stats} size="sm" style={{ marginBottom: 20 }} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 12px',
        }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts, owners or cities…"
            style={{ border: 'none', outline: 'none', fontSize: 14, color: DS.text, flex: 1, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['active', 'Active'], ['trial', 'Trial'], ['past_due', 'Past Due'], ['suspended', 'Suspended'], ['risk', 'At Risk']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${filter === id ? DS.accentBorder : DS.border}`,
              background: filter === id ? DS.accentLight : DS.bg, color: filter === id ? DS.accent : DS.muted,
              fontSize: 13, fontWeight: filter === id ? 600 : 400, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Directory — no action column: the whole row opens the detail popover */}
      <Card title="Accounts" subtitle="Select a row to open its details and actions"
        actions={[<Badge key="n" variant="default">{filtered.length} of {accounts.length}</Badge>]}>
        <Table
          cols={['Account', 'Owner', 'Plan', 'Centres', 'MRR', 'Status', 'Risk', 'Joined']}
          rowKey={(r, i) => (filtered[i] ? filtered[i].id : i)}
          rows={filtered.map(a => ({
            onClick: () => setSelected(a),
            cells: [
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{a.centres.map(c => c.city).join(', ')}</div>
              </div>,
              <span style={{ fontSize: 13, color: DS.muted }}>{a.owner}</span>,
              <SAPlanPill planId={a.planId} />,
              <span style={{ fontSize: 13, color: DS.sub }}>{a.centres.length}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>£{mrrOf(a).toLocaleString()}</span>,
              <SAStatusPill status={a.status} />,
              <SAChurnDot risk={a.churnRisk} />,
              <span style={{ fontSize: 12, color: DS.muted }}>{a.createdAt}</span>,
            ],
          }))}
          empty="No accounts match this filter"
        />
      </Card>

      {/* Account detail popover — the ONE place every account action lives */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        width={470}
        icon="book"
        iconColor={selected ? saPlanColor(selected.planId) : DS.accent}
        title={selected ? selected.name : ''}
        subtitle={selected ? `${SA_COUNTRY_FLAG[selected.country] || ''} ${selected.country} · joined ${selected.createdAt}` : ''}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Owner + state */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <Avatar name={selected.owner} size={38} color={DS.accent} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{selected.owner}</div>
                  <div style={{ fontSize: 12, color: DS.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.ownerEmail}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <SAStatusPill status={selected.status} />
                <SAPlanPill planId={selected.planId} />
                <Badge variant={selected.churnRisk === 'low' ? 'success' : selected.churnRisk === 'med' ? 'warning' : 'danger'}>{selected.churnRisk} churn risk</Badge>
                {selected.promoCode && <Badge variant="default">code {selected.promoCode}</Badge>}
              </div>
              {selected.trialEndsAt && (
                <div style={{ marginTop: 10, padding: '8px 11px', borderRadius: 8, background: DS.infoBg, border: `1px solid ${DS.accentBorder}`, fontSize: 12, color: DS.info, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="calendar" size={13} color={DS.info} /> Trial ends {selected.trialEndsAt}
                </div>
              )}
            </div>

            {/* Numbers — same stat language as the page band */}
            <SAStatBand
              size="sm"
              columns={2}
              items={[
                { label: 'MRR', value: `£${mrrOf(selected).toLocaleString()}`, sub: SAMetrics.isBilling(selected) ? 'billing' : 'not billing' },
                { label: 'Centres', value: selected.centres.length.toString(), sub: selected.centres.map(c => c.city).join(', ') },
                { label: 'Students', value: selected.centres.reduce((s, c) => s + c.students, 0).toLocaleString(), sub: `${SAMetrics.seatUsage(selected).students.licensed} licensed` },
                { label: 'Teachers', value: selected.centres.reduce((s, c) => s + c.teachers, 0).toString(), sub: `${SAMetrics.seatUsage(selected).teachers.licensed} licensed` },
              ]}
            />

            {/* Seat fill */}
            {(() => {
              const su = SAMetrics.seatUsage(selected).students;
              const pct = su.licensed ? Math.round((su.used / su.licensed) * 100) : 0;
              return (
                <div>
                  <SASectionLabel>Student seat fill</SASectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SAHBar pct={pct} color={pct >= 90 ? DS.danger : pct >= 70 ? DS.warning : DS.success} height={7} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, minWidth: 78, textAlign: 'right' }}>{su.used}/{su.licensed} · {pct}%</span>
                  </div>
                  {pct >= 90 && <div style={{ fontSize: 11.5, color: DS.warning, marginTop: 6 }}>At capacity — upsell candidate.</div>}
                </div>
              );
            })()}

            {/* Member centres */}
            <div>
              <SASectionLabel>Member centres · {selected.centres.length}</SASectionLabel>
              <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {selected.centres.map((c, i) => (
                  <div key={c.id} style={{ padding: '10px 13px', borderBottom: i < selected.centres.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="book" size={13} color={DS.faint} />
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: DS.text }}>{c.name}</span>
                      <span style={{ fontSize: 11.5, color: DS.muted }}>{c.city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7 }}>
                      <span style={{ fontSize: 11.5, color: DS.muted, minWidth: 112 }}>{c.students} students · {c.teachers} staff</span>
                      <SAHBar pct={c.usage} color={c.usage >= 70 ? DS.success : c.usage >= 40 ? DS.warning : DS.danger} height={5} />
                      <span style={{ fontSize: 11, color: DS.faint, minWidth: 34, textAlign: 'right' }}>{c.usage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account facts */}
            <div>
              <SASectionLabel>Account</SASectionLabel>
              <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, padding: '2px 13px' }}>
                <SADetailRow label="Plan">{SAMetrics.planName(selected.planId)} · £{SAMetrics.planPrice(selected.planId)}/mo</SADetailRow>
                <SADetailRow label="Country">{SA_COUNTRY_FLAG[selected.country] || ''} {selected.country}</SADetailRow>
                <SADetailRow label="Joined">{selected.createdAt}</SADetailRow>
                <SADetailRow label="Account ID" last>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: DS.muted }}>{selected.id}</span>
                </SADetailRow>
              </div>
            </div>

            {/* Every action for this account */}
            <div>
              <SASectionLabel>Actions</SASectionLabel>
              <SAActionList items={accountActions(selected)} />
            </div>
          </div>
        )}
      </SlideOver>

      {/* New-account wizard — defaults from Settings → Platform Defaults */}
      <OnboardAccountWizard open={wizard} plans={plansStore.plans.filter(p => !p.archived && p.audience === 'centre')} onClose={() => setWizard(false)}
        onCreate={(acc) => { setAccounts(list => [acc, ...list]); saAudit({ action: `Created account ${acc.name} by hand (${SAMetrics.planName(acc.planId)})`, type: 'account', target: acc.name }); setFlash(`${acc.name} created`); }} />

      <SASupportSessionModal open={!!sessionFor} account={sessionFor} accounts={accounts} onClose={() => setSessionFor(null)} />

      {/* Change-plan modal */}
      <Modal open={!!planEdit} onClose={() => setPlanEdit(null)} title={planEdit ? `Change plan — ${planEdit.name}` : ''} icon="invoice" iconColor={DS.accent} width={440}
        footer={<><Btn variant="ghost" small onClick={() => setPlanEdit(null)}>Cancel</Btn></>}>
        {planEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: DS.muted, marginBottom: 4 }}>Idempotency: a change-plan is keyed by account + target plan so a retried click can't double-charge (production billing provider).</div>
            {plansStore.plans.filter(p => !p.archived && p.audience === 'centre').map(p => (
              <button key={p.id} onClick={() => { patch(planEdit.id, { planId: p.id }, { action: `Changed ${planEdit.name} to ${p.name} plan`, type: 'account', target: planEdit.name }); setPlanEdit(null); }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8,
                border: `1px solid ${planEdit.planId === p.id ? DS.accentBorder : DS.border}`, background: planEdit.planId === p.id ? DS.accentLight : DS.bg, cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{p.name}</span>
                <span style={{ fontSize: 13, color: DS.muted }}>£{p.price}/mo · {p.maxCentres} centre{p.maxCentres !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      <SAConfirm confirm={confirm} onClose={() => setConfirm(null)} />
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// Shared confirm dialog for destructive/account actions.
const SAConfirm = ({ confirm, onClose }) => (
  <Modal open={!!confirm} onClose={onClose} title={confirm ? confirm.title : ''} icon={confirm && confirm.danger ? 'alert' : 'check'} iconColor={confirm && confirm.danger ? DS.danger : DS.accent} width={440}
    footer={<>
      <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
      <Btn variant={confirm && confirm.danger ? 'danger' : 'primary'} small onClick={() => { confirm && confirm.onOk && confirm.onOk(); onClose(); }}>{(confirm && confirm.ok) || 'Confirm'}</Btn>
    </>}>
    <p style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, margin: 0 }}>{confirm ? confirm.body : ''}</p>
  </Modal>
);

// New-account wizard (plan · trial · seats · currency), defaults from
// Settings → Platform Defaults (SETTINGS_STORE) so it matches the tenant path.
// Trial length/on-off default to the CENTRE free trial (Pricing page) — hand-
// onboarded accounts get the same offer as a self-serve signup unless overridden here.
const OnboardAccountWizard = ({ open, plans, onClose, onCreate }) => {
  const defaults = (typeof window.saPlatformDefaults === 'function') ? window.saPlatformDefaults() : { planId: 'starter', trialDays: 14, trialEnabled: true, currency: 'GBP' };
  const blankAcc = () => ({ name: '', owner: '', ownerEmail: '', country: 'UK', planId: defaults.planId, trial: defaults.trialEnabled !== false, trialDays: defaults.trialDays, currency: defaults.currency });
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState(blankAcc);
  React.useEffect(() => { if (open) { setStep(0); setD(blankAcc()); } }, [open]);
  const upd = (k, v) => setD(s => ({ ...s, [k]: v }));
  const canNext = step === 0 ? (d.name.trim() && d.owner.trim()) : true;

  const create = () => {
    const id = 'acc_' + (d.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || Math.random().toString(36).slice(2, 8));
    onCreate({
      id, name: d.name.trim(), owner: d.owner.trim(), ownerEmail: d.ownerEmail.trim(), planId: d.planId,
      status: d.trial ? 'trial' : 'active', country: d.country, createdAt: 'Jul 2026', churnRisk: 'low',
      trialEndsAt: d.trial ? `+${d.trialDays} days` : null,
      centres: [{ id: 'ctr_' + id, name: d.name.trim(), city: '—', country: d.country, students: 0, teachers: 0, usage: 0 }],
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New account" subtitle="Creates a billing account and its first centre by hand — for deals closed off-platform, migrations and pilots. Self-serve signup is the normal path." icon="plus" iconColor={DS.accent} width={560}
      footer={<>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        {step > 0 && <Btn variant="secondary" small onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < 1 ? <Btn variant="primary" small disabled={!canNext} onClick={() => canNext && setStep(1)}>Next</Btn>
          : <Btn variant="primary" small icon="check" onClick={create}>Create account</Btn>}
      </>}>
      {step === 0 && (
        <div>
          <Field label="Account (organisation) name"><Input value={d.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Riverside Tuition" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Owner name"><Input value={d.owner} onChange={e => upd('owner', e.target.value)} placeholder="Full name" /></Field>
            <Field label="Owner email"><Input value={d.ownerEmail} onChange={e => upd('ownerEmail', e.target.value)} placeholder="owner@centre.com" /></Field>
            <Field label="Country"><Select value={d.country} onChange={e => upd('country', e.target.value)}>{Object.keys(SA_COUNTRY_FLAG).map(k => <option key={k} value={k}>{k}</option>)}</Select></Field>
            <Field label="Currency"><Select value={d.currency} onChange={e => upd('currency', e.target.value)}><option>GBP</option><option>EUR</option><option>USD</option></Select></Field>
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <Field label="Plan" hint="Seats & centre limit come from the plan catalog.">
            <Select value={d.planId} onChange={e => upd('planId', e.target.value)}>{plans.map(p => <option key={p.id} value={p.id}>{p.name} — £{p.price}/mo · {p.studentSeats} students · {p.maxCentres} centre{p.maxCentres !== 1 ? 's' : ''}</option>)}</Select>
          </Field>
          <Field label="Start as trial" hint={defaults.trialEnabled === false
            ? 'The centre free trial is off — this account would be billed immediately.'
            : `Defaults to the ${defaults.trialDays}-day centre free trial (Pricing page).`}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => upd('trial', !d.trial)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: d.trial ? DS.accent : DS.borderDark, position: 'relative', cursor: 'pointer' }}>
                <span style={{ position: 'absolute', top: 2, left: d.trial ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </button>
              <Input type="number" min="1" max="365" value={d.trialDays} onChange={e => upd('trialDays', Math.max(1, Math.min(365, +e.target.value || 1)))} disabled={!d.trial} style={{ width: 74 }} />
              <span style={{ fontSize: 13, color: DS.sub }}>{d.trial ? `days free, then billed` : 'Bill immediately'}</span>
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  USERS & ACCOUNTS  —  role counts from ONE source (getUserCounts)
// ═══════════════════════════════════════════════════════════════════════════

// The Users screen is, first and foremost, a DIRECTORY: one table of every
// user on the platform. Everything that used to sit above it as four separate
// chart cards and a five-tile stat row now lives in ONE switchable stat card,
// so the table starts near the top of the page. Every figure in that card is
// tallied off the directory rows (SAMetrics.directoryStats) — the summary and
// the table are the same data, so they cannot disagree.
const SA_ROLE_ORDER = ['student', 'teacher', 'admin', 'parent', 'superadmin'];
const SA_ROLE_LABEL = { superadmin: 'Owner', admin: 'Centre Admin', teacher: 'Teacher', student: 'Student', parent: 'Parent' };

const SARolePill = ({ role, colors }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 600,
    padding: '2px 9px', borderRadius: 6, whiteSpace: 'nowrap',
    background: (colors[role] || DS.muted) + '1A', color: colors[role] || DS.muted,
  }}>{SA_ROLE_LABEL[role] || role}</span>
);

const SAUsersPage = () => {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [accountFilter, setAccountFilter] = React.useState('all');
  const [activity, setActivity] = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const [flash, setFlash] = React.useState('');

  const directory = SAMetrics.directory();
  const ds = SAMetrics.directoryStats();
  const counts = SAMetrics.userCounts();
  const total = SAMetrics.totalUsers();
  const roleColors = { superadmin: DS.accent, admin: SA_CHART_PALETTE[5], teacher: SA_CHART_PALETTE[0], student: SA_CHART_PALETTE[1], parent: SA_CHART_PALETTE[2] };

  const growth = SA_USER_GROWTH.series[0].data;
  const newThisMonth = growth[growth.length - 1] - growth[growth.length - 2];
  const pct = (n) => (total ? +((n / total) * 100).toFixed(1) : 0);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return directory.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (accountFilter !== 'all' && u.accountId !== accountFilter) return false;
      if (activity === 'active' && u.seenDays > 30) return false;
      if (activity === 'dormant' && u.seenDays <= 90) return false;
      if (activity === 'mfa_off' && (u.mfa || u.role === 'student')) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
        u.account.toLowerCase().includes(q) || u.centre.toLowerCase().includes(q);
    });
  }, [directory, search, roleFilter, statusFilter, accountFilter, activity]);

  const filtersOn = roleFilter !== 'all' || statusFilter !== 'all' || accountFilter !== 'all' || activity !== 'all' || !!search;
  const clearFilters = () => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setAccountFilter('all'); setActivity('all'); };

  // Donut AND bars both read `counts` → they can never disagree.
  const roleRows = SA_ROLE_ORDER.map(k => ({
    key: k, role: SA_ROLE_LABEL[k] + (k === 'superadmin' ? 's' : 's'), count: counts[k] || 0, color: roleColors[k],
  }));
  const maxRole = Math.max(...roleRows.map(r => r.count), 1);

  const mfaPct = ds.mfaEligible ? +((ds.mfaOn / ds.mfaEligible) * 100).toFixed(1) : 0;

  const statTabs = [
    {
      id: 'overview', label: 'Overview', icon: 'chart', size: 'md', columns: 5,
      items: [
        { label: 'Total Users',  value: total.toLocaleString(),        trend: `+${newThisMonth}`, trendDir: 'up', sub: 'this month' },
        { label: 'Active (30d)', value: ds.active30.toLocaleString(),  sub: `${pct(ds.active30)}% of total`, tone: 'pos' },
        { label: 'Seen Today',   value: ds.today.toLocaleString(),     sub: `${pct(ds.today)}% of total` },
        { label: 'Dormant (90d+)', value: ds.dormant.toLocaleString(), sub: 'no sign-in', tone: ds.dormant ? 'warn' : 'muted' },
        { label: 'Accounts',     value: SAMetrics.accounts().length.toString(), sub: `${SAMetrics.totalCentres()} centres` },
      ],
      render: (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {SA_USER_GROWTH.series.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 22, height: 2, background: s.color, borderRadius: 2 }} />
                <span style={{ fontSize: 11.5, color: DS.muted }}>{s.label}</span>
              </div>
            ))}
          </div>
          <LineChart labels={SA_USER_GROWTH.labels} series={SA_USER_GROWTH.series} height={170} />
        </div>
      ),
    },
    {
      id: 'roles', label: 'Roles', icon: 'users', size: 'sm', columns: 5,
      items: roleRows.map(r => ({
        label: r.role, value: r.count.toLocaleString(), sub: `${pct(r.count)}% of users`,
        bar: (r.count / maxRole) * 100, barColor: r.color, dot: r.color,
        onClick: () => setRoleFilter(r.key),
      })),
      render: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          {/* Largest-remainder so the slice labels actually sum to 100%. */}
          <SADonut data={saAllocate(roleRows.map(r => r.count), 100).map((p, i) => ({ pct: p, color: roleRows[i].color }))} size={130} />
          <div style={{ flex: 1, minWidth: 240 }}>
            {roleRows.map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                <span style={{ flex: 1, fontSize: 12.5, color: DS.sub }}>{r.role}</span>
                <div style={{ width: 140 }}><SAHBar pct={(r.count / maxRole) * 100} color={r.color} height={6} /></div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, minWidth: 46, textAlign: 'right' }}>{r.count.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 8 }}>Select a segment above to filter the directory by that role.</div>
          </div>
        </div>
      ),
    },
    {
      id: 'security', label: 'Security', icon: 'shield', size: 'sm', columns: 5,
      items: [
        { label: 'MFA Adoption', value: `${mfaPct}%`, sub: `${ds.mfaOn.toLocaleString()} of ${ds.mfaEligible.toLocaleString()} eligible`, bar: mfaPct, barColor: mfaPct >= 80 ? DS.success : DS.warning },
        { label: 'MFA Off',   value: (ds.mfaEligible - ds.mfaOn).toLocaleString(), sub: 'staff & parents', tone: 'warn', onClick: () => setActivity('mfa_off') },
        { label: 'Locked',    value: ds.locked.toLocaleString(),    sub: 'sign-in blocked', tone: 'neg', onClick: () => setStatusFilter('locked') },
        { label: 'Suspended', value: ds.suspended.toLocaleString(), sub: 'account-level', tone: 'neg', onClick: () => setStatusFilter('suspended') },
        { label: 'Pending Invites', value: ds.pending.toLocaleString(), sub: 'never activated', tone: 'warn', onClick: () => setStatusFilter('pending') },
      ],
      render: (
        <div style={{ fontSize: 12, color: DS.muted, lineHeight: 1.6 }}>
          Students are excluded from the MFA denominator (AADC — minors are not asked for a second factor).
          Locked accounts are auto-locked after repeated failed sign-ins; suspended users belong to a suspended account.
        </div>
      ),
    },
    {
      id: 'seats', label: 'Seat usage', icon: 'grid', size: 'sm', columns: 4,
      items: (() => {
        const paying = SAMetrics.payingAccounts();
        const used = paying.reduce((s, a) => s + SAMetrics.seatUsage(a).students.used, 0);
        const lic = paying.reduce((s, a) => s + SAMetrics.seatUsage(a).students.licensed, 0);
        const fill = lic ? Math.round((used / lic) * 100) : 0;
        const near = paying.filter(a => { const s = SAMetrics.seatUsage(a).students; return s.licensed && s.used / s.licensed >= 0.9; }).length;
        return [
          { label: 'Student Seats Used', value: used.toLocaleString(), sub: `of ${lic.toLocaleString()} licensed`, bar: fill, barColor: fill >= 90 ? DS.danger : fill >= 70 ? DS.warning : DS.success },
          { label: 'Overall Fill', value: `${fill}%`, sub: 'paying accounts only' },
          { label: 'At Capacity', value: near.toString(), sub: '≥90% filled — upsell', tone: near ? 'warn' : 'muted' },
          { label: 'Headroom', value: Math.max(0, lic - used).toLocaleString(), sub: 'seats available' },
        ];
      })(),
      render: (
        <div>
          {SAMetrics.payingAccounts().map(a => {
            const s = SAMetrics.seatUsage(a).students;
            const p = s.licensed ? Math.round((s.used / s.licensed) * 100) : 0;
            return { a, s, pct: p };
          }).sort((x, y) => y.pct - x.pct).slice(0, 8).map(({ a, s, pct: p }) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ flex: 1, fontSize: 12.5, color: DS.sub, minWidth: 0 }}>{a.name}</span>
              <div style={{ width: 160 }}><SAHBar pct={p} color={p >= 90 ? DS.danger : p >= 70 ? DS.warning : DS.success} height={6} /></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: p >= 90 ? DS.danger : DS.text, minWidth: 70, textAlign: 'right' }}>{s.used}/{s.licensed}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 8 }}>Student seats used vs licensed (plan seats × centres). ≥90% flags an upsell.</div>
        </div>
      ),
    },
  ];

  const userActions = (u) => {
    const items = [
      { label: 'Reset password', icon: 'mail', onClick: () => { saAudit({ action: `Sent password reset to ${u.email}`, type: 'security', target: u.email }); setFlash('Password reset sent'); } },
      { label: 'Revoke sessions', icon: 'x', hint: 'force logout', onClick: () => { saAudit({ action: `Revoked sessions (force logout) for ${u.email}`, type: 'security', target: u.email }); setFlash('Sessions revoked'); } },
      { label: u.mfa ? 'MFA required (on)' : 'Require MFA', icon: 'shield', disabled: u.role === 'student', hint: u.role === 'student' ? 'not for minors' : '', onClick: () => { saAudit({ action: `Set MFA required for ${u.email}`, type: 'security', target: u.email }); setFlash('MFA requirement updated'); } },
      { label: 'Change role', icon: 'user', hint: SA_ROLE_LABEL[u.role] || u.role, onClick: () => setFlash('Role picker (prototype)') },
    ];
    if (u.accountId) items.push({ label: 'Open account', icon: 'book', hint: u.account, onClick: () => { window.__saCentresFocus = u.accountId; window.__navigate && window.__navigate('superadmin', 'centres'); } });
    items.push({ label: 'View audit trail', icon: 'list', onClick: () => window.__navigate && window.__navigate('superadmin', 'security') });
    // AADC: minor-data actions on a user are audited; the drill-down prefers
    // counts over identities where the owner doesn't need the identity.
    items.push({ label: 'GDPR export / delete', icon: 'download', onClick: () => { saAudit({ action: `Raised DSAR for ${u.email}`, type: 'export', target: u.email }); window.__navigate && window.__navigate('superadmin', 'security'); } });
    items.push({ label: 'Suspend user', icon: 'alert', danger: true, onClick: () => { saAudit({ action: `Suspended user ${u.email}`, type: 'security', target: u.email }); setFlash('User suspended'); setSelected(null); } });
    return items;
  };

  const selectStyle = {
    padding: '8px 10px', borderRadius: 8, border: `1px solid ${DS.border}`, background: DS.bg,
    color: DS.sub, fontSize: 13, cursor: 'pointer', maxWidth: 190,
  };

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Users & Accounts"
        subtitle={`${total.toLocaleString()} users across ${SAMetrics.accounts().length} accounts and ${SAMetrics.totalCentres()} centres`}
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => {
            const rows = [['Name', 'Email', 'Role', 'Account', 'Centre', 'Status', 'MFA', 'Last seen', 'Joined']];
            filtered.forEach(u => rows.push([u.name, u.email, u.role, u.account, u.centre, u.status, u.mfa ? 'on' : 'off', u.lastSeen, u.joined]));
            saDownloadCSV('klasio-users.csv', rows);
            saAudit({ action: `Exported users CSV (${filtered.length} rows)`, type: 'export', target: 'Users' });
            setFlash('Users exported');
          }}>Export</Btn>,
        ]}
      />

      {/* ONE stat card, switchable views — replaces the old tile row + 4 charts */}
      <SAStatTabs
        tabs={statTabs}
        right={filtersOn
          ? <Btn variant="ghost" small icon="x" onClick={clearFilters}>Clear filters</Btn>
          : <span style={{ fontSize: 11.5, color: DS.faint, paddingRight: 4 }}>Platform-wide</span>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, margin: '20px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 12px' }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, account or centre…"
            style={{ border: 'none', outline: 'none', fontSize: 14, color: DS.text, flex: 1, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ...SA_ROLE_ORDER.map(r => [r, SA_ROLE_LABEL[r]])].map(([id, label]) => (
            <button key={id} onClick={() => setRoleFilter(id)} style={{
              padding: '7px 13px', borderRadius: 7, border: `1px solid ${roleFilter === id ? DS.accentBorder : DS.border}`,
              background: roleFilter === id ? DS.accentLight : DS.bg, color: roleFilter === id ? DS.accent : DS.muted,
              fontSize: 13, fontWeight: roleFilter === id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={selectStyle}>
          <option value="all">All accounts</option>
          {SAMetrics.accounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="pending">Pending invite</option>
          <option value="locked">Locked</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={activity} onChange={e => setActivity(e.target.value)} style={selectStyle}>
          <option value="all">Any activity</option>
          <option value="active">Active in 30 days</option>
          <option value="dormant">Dormant 90 days+</option>
          <option value="mfa_off">MFA off (staff)</option>
        </select>
      </div>

      {/* The directory — every user, one row each; the row opens the detail */}
      <Card title="User directory" subtitle="Select a row to open the user and its actions"
        actions={[<Badge key="n" variant="default">{filtered.length.toLocaleString()} of {total.toLocaleString()}</Badge>]}>
        <Table
          defaultPageSize={25}
          pageSizeOptions={[25, 50, 100, 250]}
          cols={['User', 'Role', 'Account', 'Centre', 'Status', 'MFA', 'Last seen']}
          rowKey={(r, i) => (filtered[i] ? filtered[i].id : i)}
          rows={filtered.map(u => ({
            onClick: () => setSelected(u),
            cells: [
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={u.name} size={30} color={roleColors[u.role]} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                </div>
              </div>,
              <SARolePill role={u.role} colors={roleColors} />,
              <span style={{ fontSize: 12.5, color: DS.sub }}>{u.account}</span>,
              <span style={{ fontSize: 12, color: DS.muted }}>{u.centre}</span>,
              <SAStatusPill status={u.status} />,
              u.role === 'student'
                ? <span style={{ fontSize: 12, color: DS.faint }}>n/a</span>
                : u.mfa
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: DS.success }}><Icon name="check" size={12} />On</span>
                  : <span style={{ fontSize: 12, color: DS.faint }}>Off</span>,
              <span style={{ fontSize: 12, color: u.seenDays > 90 ? DS.faint : DS.muted }}>{u.lastSeen}</span>,
            ],
          }))}
          empty="No users match these filters"
        />
      </Card>

      {/* User detail popover — identity, context and every action in one place */}
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        width={450}
        icon="user"
        iconColor={selected ? roleColors[selected.role] : DS.accent}
        title={selected ? selected.name : ''}
        subtitle={selected ? selected.email : ''}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <SARolePill role={selected.role} colors={roleColors} />
              <SAStatusPill status={selected.status} />
              {selected.role !== 'student' && (
                <Badge variant={selected.mfa ? 'success' : 'warning'}>{selected.mfa ? 'MFA on' : 'MFA off'}</Badge>
              )}
              {selected.seenDays > 90 && <Badge variant="default">Dormant</Badge>}
            </div>

            <SAStatBand
              size="sm"
              columns={2}
              items={[
                { label: 'Last seen', value: selected.lastSeen, sub: selected.seenDays <= 30 ? 'active this month' : 'outside 30 days', tone: selected.seenDays <= 30 ? 'pos' : 'warn' },
                { label: 'Joined', value: selected.joined, sub: 'account start' },
              ]}
            />

            <div>
              <SASectionLabel>Placement</SASectionLabel>
              <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, padding: '2px 13px' }}>
                <SADetailRow label="Account">{selected.account}</SADetailRow>
                <SADetailRow label="Centre">{selected.centre}</SADetailRow>
                <SADetailRow label="Country">{SA_COUNTRY_FLAG[selected.country] || ''} {selected.country}</SADetailRow>
                <SADetailRow label="Detail">{selected.meta}</SADetailRow>
                <SADetailRow label="User ID" last>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: DS.muted }}>{selected.id}</span>
                </SADetailRow>
              </div>
            </div>

            {selected.role === 'student' && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, fontSize: 12, color: DS.warning, display: 'flex', gap: 8 }}>
                <Icon name="shield" size={14} color={DS.warning} />
                <span>Minor's record (AADC). Prefer centre-level action; every access here is audited.</span>
              </div>
            )}

            <div>
              <SASectionLabel>Actions</SASectionLabel>
              <SAActionList items={userActions(selected)} />
            </div>
          </div>
        )}
      </SlideOver>

      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  REVENUE & SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════

const SARevenuePage = () => {
  const [failed, setFailed] = React.useState(() => SAMetrics.failedPayments());
  const [flash, setFlash] = React.useState('');
  const mrr = SAMetrics.platformMRR();
  const dist = SAMetrics.planDistribution();
  const maxPlanMRR = Math.max(...dist.map(d => d.mrr), 1);

  // Money page → hero + supporting grid. MRR is the number this page is about;
  // the other six qualify it, so they sit smaller on the SAME card.
  const leadStat = { label: 'Monthly Recurring Revenue', value: `£${mrr.toLocaleString()}`, trend: `+£${SAMetrics.newMRR().toLocaleString()}`, trendDir: 'up', sub: 'net new this month' };
  const stats = [
    { label: 'ARR',             value: `£${SAMetrics.arr().toLocaleString()}`,        trend: '+15.2%', trendDir: 'up', sub: 'YoY' },
    { label: 'New MRR',         value: `£${SAMetrics.newMRR().toLocaleString()}`,     sub: 'this month', tone: 'pos' },
    { label: 'Churned MRR',     value: `£${SAMetrics.churnedMRR().toLocaleString()}`, sub: 'this month', tone: 'neg' },
    { label: 'ARPU',            value: `£${SAMetrics.arpu().toLocaleString()}`,       sub: 'per paying account' },
    { label: 'NRR',             value: `${SAMetrics.nrr()}%`,                         sub: 'net revenue retention', tone: SAMetrics.nrr() >= 100 ? 'pos' : 'warn' },
    { label: 'Failed Payments', value: failed.length.toString(),                      sub: `£${SAMetrics.failedAtRisk().toLocaleString()} at risk`, tone: failed.length ? 'warn' : 'muted', dot: failed.length ? DS.warning : DS.success },
  ];

  const txns = SA_TXNS.map(t => ({ ...t, acc: SAMetrics.account(t.accountId) }));

  const mov = SA_MRR_MOVEMENT;
  const maxRev = Math.max(...mov.newMRR, ...mov.churnedMRR) * 1.15;

  const dun = (row, action, note) => { setFailed(list => list.map(f => f.accountId === row.accountId ? { ...f, state: action } : f).filter(f => action !== 'resolved' || f.accountId !== row.accountId)); saAudit(note); setFlash(note.action); };

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Revenue & Subscriptions"
        subtitle="Monetisation across all accounts"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => { const rows = [['Plan', 'Accounts', 'MRR']]; dist.forEach(d => rows.push([d.name, d.accounts, d.mrr])); saDownloadCSV('klasio-revenue.csv', rows); setFlash('Revenue exported'); }}>Export</Btn>,
          <Btn key="plan" variant="primary" icon="invoice" small onClick={() => window.__navigate && window.__navigate('superadmin', 'controls')}>Manage Plans</Btn>,
        ]}
      />

      <SALeadStat lead={leadStat} items={stats} columns={3} style={{ marginBottom: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="New vs Churned Revenue (Monthly)" actions={[<Badge key="b" variant="accent">Last 8 months</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 220, padding: '0 10px' }}>
              {mov.labels.map((m, i) => (
                <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
                    <div title={`New £${mov.newMRR[i]}`} style={{ width: 16, height: `${(mov.newMRR[i] / maxRev) * 100}%`, background: DS.success, borderRadius: '4px 4px 0 0' }} />
                    <div title={`Churned £${mov.churnedMRR[i]}`} style={{ width: 16, height: `${(mov.churnedMRR[i] / maxRev) * 100}%`, background: DS.danger, borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: DS.muted, marginTop: 8 }}>{m}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: DS.success, borderRadius: 2 }} /><span style={{ fontSize: 12, color: DS.muted }}>New</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: DS.danger, borderRadius: 2 }} /><span style={{ fontSize: 12, color: DS.muted }}>Churned</span></div>
            </div>
          </div>
        </Card>

        <Card title="Revenue by Plan" subtitle="Prices & names from the plan catalog">
          <div style={{ padding: '20px' }}>
            {dist.map(p => (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: DS.muted, marginLeft: 8 }}>£{p.price}/mo · {p.accounts} account{p.accounts !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>£{p.mrr.toLocaleString()}</span>
                </div>
                <SAHBar pct={(p.mrr / maxPlanMRR) * 100} color={saPlanColor(p.id)} height={6} />
              </div>
            ))}
            <Divider />
            <div style={{ fontSize: 12, color: DS.muted, marginBottom: 6 }}>Movement this month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: DS.successBg, borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: DS.success, fontWeight: 600 }}>UPGRADES</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DS.success }}>{mov.upgrades}</div>
              </div>
              <div style={{ padding: '10px 12px', background: DS.dangerBg, borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: DS.danger, fontWeight: 600 }}>DOWNGRADES</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DS.danger }}>{mov.downgrades}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Failed payments → dunning workflow. KPI == this list length. */}
      <Card title="Failed Payments" subtitle="Dunning — ties to Settings' auto-suspend + grace period" actions={[<Badge key="b" variant="danger">{failed.length} require attention</Badge>]} style={{ marginBottom: 20 }}>
        <Table
          pagination={false}
          cols={['Account', 'Plan', 'Amount', 'Date', 'Attempts', 'State', { label: 'Action', align: 'right' }]}
          rows={failed.map(p => [
            <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{p.name}</span>,
            <SAPlanPill planId={p.account.planId} />,
            <span style={{ fontSize: 13, fontWeight: 700, color: DS.danger }}>£{p.amount}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{p.date}</span>,
            <span style={{ fontSize: 12, color: DS.warning, fontWeight: 600 }}>{p.attempts}×</span>,
            <StatusPill tone={p.state === 'failed' ? 'negative' : p.state === 'card_expired' ? 'warning' : 'info'}>{p.state === 'card_expired' ? 'Card expired' : p.state === 'retrying' ? 'Retrying' : 'Failed'}</StatusPill>,
            <RowActionsMenu items={[
              // Idempotency: retry-payment is keyed by (account, invoice) so a
              // double-click can't double-charge (future billing provider).
              { label: 'Retry now', icon: 'zap', onClick: () => dun(p, 'retrying', { action: `Retried payment for ${p.name}`, type: 'billing', target: p.name }) },
              { label: 'Email customer', icon: 'mail', onClick: () => dun(p, p.state, { action: `Emailed dunning notice to ${p.name}`, type: 'billing', target: p.name }) },
              { label: 'Mark resolved', icon: 'check', onClick: () => dun(p, 'resolved', { action: `Marked payment resolved for ${p.name}`, type: 'billing', target: p.name }) },
              { label: 'Suspend account', icon: 'alert', danger: true, onClick: () => dun(p, p.state, { action: `Suspended ${p.name} (non-payment)`, type: 'account', target: p.name }) },
            ]} />,
          ])}
        />
      </Card>

      <Card title="Recent Transactions" actions={[<Btn key="v" variant="ghost" icon="eye" small onClick={() => window.__navigate && window.__navigate('superadmin', 'centres')}>View all</Btn>]}>
        <div>
          {txns.map((t, i) => {
            const typeMap = { new: { icon: 'plus', color: DS.success }, upgrade: { icon: 'trending_up', color: DS.success }, renewal: { icon: 'check', color: DS.info }, addon: { icon: 'plus', color: DS.accent }, refund: { icon: 'trending_dn', color: DS.danger } };
            const ty = typeMap[t.type] || typeMap.renewal;
            const amt = (t.amount < 0 ? '-£' : '+£') + Math.abs(t.amount).toLocaleString();
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < txns.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: ty.color + '15', color: ty.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ty.icon} size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{t.acc ? t.acc.name : t.accountId}</div>
                  <div style={{ fontSize: 11, color: DS.muted }}>{t.desc} · {t.date}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.amount < 0 ? DS.danger : DS.success }}>{amt}</span>
              </div>
            );
          })}
        </div>
      </Card>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLATFORM ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const SAEngagementPage = () => {
  const [flash, setFlash] = React.useState('');
  // Engagement has no single headline — six peers on one band, DAU/MAU carrying
  // a fill bar because it's the only ratio in the row.
  const stats = [
    { label: 'DAU',            value: '634',      trend: '+24', trendDir: 'up', sub: 'vs yesterday' },
    { label: 'WAU',            value: '1,089',    sub: '67.1% of MAU' },
    { label: 'MAU',            value: '1,620',    trend: '+110', trendDir: 'up', sub: 'this month' },
    { label: 'DAU/MAU',        value: '39.1%',    sub: 'sticky usage', tone: 'pos', bar: 39.1, barColor: DS.success },
    { label: 'Avg Session',    value: '18m 42s',  trend: '+1m 12s', trendDir: 'up', sub: 'vs last wk' },
    { label: 'Sessions / Day', value: '2,841',    sub: 'across all centres' },
  ];

  const sessionsByRole = [
    { role: 'Students', count: 4.2, color: SA_CHART_PALETTE[1] },
    { role: 'Teachers', count: 6.8, color: SA_CHART_PALETTE[0] },
    { role: 'Centre Admin', count: 8.4, color: DS.accent },
    { role: 'Parents', count: 1.6, color: SA_CHART_PALETTE[2] },
  ];

  const dauWeek = [
    { day: 'Mon', value: 198 }, { day: 'Tue', value: 218 }, { day: 'Wed', value: 212 },
    { day: 'Thu', value: 235 }, { day: 'Fri', value: 205 }, { day: 'Sat', value: 78 }, { day: 'Sun', value: 64 },
  ];
  const maxDau = Math.max(...dauWeek.map(d => d.value)) * 1.15;

  // Activation funnel — marketing owns top-of-funnel, so the console's funnel
  // STARTS at "Started signup" (landing-page visits are dropped). Drop-offs
  // recompute from this first step (100%).
  const funnelRaw = [
    { stage: 'Started signup', count: 1840 },
    { stage: 'Completed signup', count: 1420 },
    { stage: 'First centre setup', count: 980 },
    { stage: 'Invited first user', count: 720 },
    { stage: 'Activated (paid)', count: 142 },
  ];
  const funnelTop = funnelRaw[0].count;
  const funnel = funnelRaw.map(f => ({ ...f, pct: +((f.count / funnelTop) * 100).toFixed(1) }));

  const SAMPLE = <Badge key="sample" variant="warning">Sample data — needs analytics events (phase 2)</Badge>;

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Platform Engagement"
        subtitle={`How people actually use ${BRAND.name}`}
        actions={[<Btn key="exp" variant="secondary" icon="download" small onClick={() => setFlash('Engagement export (prototype)')}>Export</Btn>]}
      />

      <SAStatBand items={stats} size="sm" style={{ marginBottom: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Daily Active Users (This Week)" actions={[SAMPLE]}>
          <div style={{ padding: '20px' }}>
            <svg width="100%" height="200" viewBox="0 0 700 200" preserveAspectRatio="none">
              {[0, 50, 100, 150].map(y => <line key={y} x1="40" x2="690" y1={20 + y} y2={20 + y} stroke={DS.border} strokeDasharray="3 4" />)}
              <polyline points={dauWeek.map((d, i) => { const x = 50 + (i * 640) / (dauWeek.length - 1); const y = 170 - (d.value / maxDau) * 150; return `${x},${y}`; }).join(' ')} fill="none" stroke={DS.success} strokeWidth="2.5" />
              {dauWeek.map((d, i) => { const x = 50 + (i * 640) / (dauWeek.length - 1); const y = 170 - (d.value / maxDau) * 150; return (<g key={d.day}><circle cx={x} cy={y} r="4" fill="#fff" stroke={DS.success} strokeWidth="2" /><text x={x} y="190" fontSize="11" fill={DS.muted} textAnchor="middle">{d.day}</text></g>); })}
            </svg>
          </div>
        </Card>

        <Card title="Sessions / User by Role" actions={[SAMPLE]}>
          <div style={{ padding: '20px' }}>
            {sessionsByRole.map(r => (
              <div key={r.role} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: DS.sub }}>{r.role}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{r.count}</span>
                </div>
                <SAHBar pct={(r.count / 8.4) * 100} color={r.color} height={8} />
              </div>
            ))}
            <Divider />
            <div style={{ fontSize: 11, color: DS.muted, textAlign: 'center' }}>Avg sessions per active user (last 7 days)</div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Feature Adoption" actions={[<Badge key="b" variant="accent">% of active centres</Badge>]}>
          <div style={{ padding: '20px' }}>
            {SA_FEATURE_USAGE.map((f, i) => (
              <div key={f.feature} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: DS.sub }}>{f.feature}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: f.trend.startsWith('+') ? DS.success : DS.danger }}>{f.trend}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DS.text, minWidth: 36, textAlign: 'right' }}>{f.pct}%</span>
                  </div>
                </div>
                <SAHBar pct={f.pct} color={saPalette()[i % saPalette().length]} height={8} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Activation Funnel" actions={[<Badge key="b" variant="default">Last 30 days</Badge>]}>
          <div style={{ padding: '20px' }}>
            {funnel.map((f, i) => {
              const drop = i > 0 ? ((funnel[i - 1].count - f.count) / funnel[i - 1].count * 100).toFixed(1) : null;
              return (
                <div key={f.stage} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: DS.sub }}>{f.stage}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{f.count.toLocaleString()} <span style={{ fontSize: 11, color: DS.muted, fontWeight: 400 }}>({f.pct}%)</span></div>
                  </div>
                  <div style={{ height: 28, background: DS.surface, borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${f.pct}%`, height: '100%', background: `linear-gradient(90deg, ${DS.accent}, ${DS.accent}88)`, borderRadius: 5 }} />
                  </div>
                  {drop && <div style={{ fontSize: 10, color: DS.danger, marginTop: 2, textAlign: 'right' }}>−{drop}% drop-off</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Geographic Distribution" actions={[<Badge key="b" variant="default">By users</Badge>]}>
          <SARegionMap regions={SAMetrics.geographic()} />
        </Card>

        <Card title="Device & Browser" actions={[SAMPLE]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <SADonut data={SA_DEVICE.map((d, i) => ({ pct: d.pct, color: saPalette()[i % saPalette().length] }))} size={140} />
              <div style={{ flex: 1 }}>
                {SA_DEVICE.map((d, i) => (
                  <div key={d.device} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: saPalette()[i % saPalette().length] }} />
                    <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{d.device}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Divider margin="0 0 16px" />
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 10 }}>Top browsers</div>
            {[['Chrome', 62], ['Safari', 24], ['Edge', 8], ['Firefox', 4], ['Other', 2]].map(([b, pct]) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{b}</span>
                <div style={{ width: 100 }}><SAHBar pct={pct} color={DS.accent} height={5} /></div>
                <span style={{ fontSize: 11, color: DS.muted, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════════

const SASystemPage = () => {
  const [flash, setFlash] = React.useState('');
  // Mock values; each card names where the real figure comes from (SA_SYS_SOURCE).
  // No storage figure here on purpose — Storage derives the one platform total
  // from file records, and a second number for the same fact would drift.
  const [queues, setQueues] = React.useState(() => SA_QUEUES.map(q => ({ ...q })));
  const degraded = SA_SERVICES.filter(s => s.status !== 'operational').length;
  const openIncidents = SA_INCIDENTS.filter(i => i.status !== 'resolved').length;
  const totals = queues.reduce((t, q) => ({ pending: t.pending + q.pending, failed: t.failed + q.failed }), { pending: 0, failed: 0 });

  const retry = (q) => {
    setQueues(list => list.map(j => j.id === q.id ? { ...j, failed: 0, pending: j.pending + j.failed } : j));
    saAudit({ action: `Re-queued ${q.failed} failed item${q.failed === 1 ? '' : 's'} in "${q.queue}"`, type: 'system', target: q.queue });
    setFlash(`${q.queue} — failed items re-queued`);
  };
  const SourceNote = ({ children }) => (
    <div style={{ padding: '10px 20px', fontSize: 11.5, color: DS.muted, borderTop: `1px solid ${DS.border}`, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <Icon name="alert" size={12} color={DS.faint} /><span>{children}</span>
    </div>
  );

  return (
    <div style={pageFrame()}>
      <PageHeader title="System Health" subtitle="Service status, queues and scheduled jobs — internal only (the public status page stays off until an SLA needs it)"
        actions={[<Btn key="status" variant="secondary" icon="eye" small onClick={() => window.open(new URL('?view=status', window.location.href).href, '_blank', 'noopener')}>Preview status page</Btn>]} />

      {(() => {
        const overall = SAHealth.overall();
        const meta = SAHealth.meta(overall);
        const c = { success: [DS.success, DS.successBg, DS.successBorder, 'check'], warning: [DS.warning, DS.warningBg, DS.warningBorder, 'alert'], danger: [DS.danger, DS.dangerBg, DS.dangerBorder, 'alert'] }[meta.tone];
        return (
          <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 10, background: c[1], border: `1px solid ${c[2]}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: c[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c[3]} size={18} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: c[0] }}>{meta.headline}</div>
              <div style={{ fontSize: 12, color: c[0] }}>{degraded ? `${degraded} service${degraded === 1 ? '' : 's'} not fully operational` : 'Every service operational'} · {openIncidents ? `${openIncidents} open incident${openIncidents === 1 ? '' : 's'}` : 'No active incidents'} · tell affected admins with a platform announcement</div>
            </div>
            <Badge variant={meta.tone}>{SA_SYS.uptime30} 30-day uptime</Badge>
          </div>
        );
      })()}

      <div style={{ marginBottom: 24 }}>
        <SAStatTabs
          tabs={[
            {
              id: 'health', label: 'Capacity', icon: 'zap', size: 'sm', columns: 4,
              items: [
                { label: 'Uptime (30d)', value: SA_SYS.uptime30, sub: '9m downtime', tone: 'pos', dot: DS.success, tip: SA_SYS_SOURCE.monitor },
                { label: 'API p95',      value: SA_SYS.p95, sub: 'last hour', tip: SA_SYS_SOURCE.sentry },
                { label: 'Error Rate',   value: `${SA_SYS.errorRate}%`, sub: '5xx responses', tone: 'pos', dot: DS.success, tip: SA_SYS_SOURCE.sentry },
                { label: 'Queued',       value: totals.pending.toString(), sub: totals.failed ? `${totals.failed} failed` : 'none failed', tone: totals.failed ? 'warn' : 'info', tip: SA_SYS_SOURCE.queues },
              ],
            },
            {
              id: 'latency', label: 'Latency', icon: 'trending_up', size: 'sm', columns: 4,
              items: [
                { label: 'API p50',    value: SA_SYS.p50, sub: 'median request', bar: 28, barColor: DS.success, tip: SA_SYS_SOURCE.sentry },
                { label: 'API p95',    value: SA_SYS.p95, sub: 'slow tail',      bar: 42, barColor: DS.success, tip: SA_SYS_SOURCE.sentry },
                { label: 'API p99',    value: SA_SYS.p99, sub: 'worst 1%',       bar: 68, barColor: DS.warning, tone: 'warn', tip: SA_SYS_SOURCE.sentry },
                { label: 'Error Rate', value: `${SA_SYS.errorRate}%`, sub: '5xx responses', bar: 8, barColor: DS.success, tip: SA_SYS_SOURCE.sentry },
              ],
            },
          ]}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Service Status">
          <Table pagination={false} cols={['Service', 'Status', 'Uptime', 'Latency']} rows={SA_SERVICES.map(s => [
            <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{s.name}</span>,
            <StatusPill status={s.status} dot />,
            <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.uptime}</span>,
            <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.latency}</span>,
          ])} />
          <SourceNote>Production: an external uptime monitor (free tier at launch) polls each service's health endpoint and alerts by phone. Service down pages you; it never waits for this screen.</SourceNote>
        </Card>

        <Card title="Queues">
          <div style={{ padding: '8px 20px' }}>
            {queues.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < queues.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.failed ? DS.warning : DS.success }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: DS.text, fontWeight: 500 }}>{q.queue}</div>
                  <div style={{ fontSize: 11, color: DS.faint, fontFamily: 'JetBrains Mono, monospace' }}>{q.source}</div>
                </div>
                <div style={{ fontSize: 12, color: DS.muted }}>{q.pending} pending</div>
                {q.failed > 0 && <button onClick={() => retry(q)} style={{ border: 'none', background: DS.dangerBg, color: DS.danger, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="zap" size={11} />{q.failed} failed · retry</button>}
              </div>
            ))}
          </div>
          <SourceNote>Production: counted from our own tables — jobs, email_outbox, processed_events — through GET /v1/admin/system-health. Postgres owns queuing (decision #14).</SourceNote>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Email Deliverability" subtitle="Last 7 days, by template">
          <Table pagination={false} cols={['Template', 'Sent', 'Delivered', 'Bounced']} rows={SA_EMAIL_DELIVERY.map(row => row.map((cell, i) => (
            <span style={{ fontSize: 13, color: i === 0 ? DS.text : DS.sub, fontWeight: i === 0 ? 500 : 400 }}>{cell}</span>
          )))} />
          <SourceNote>Production: Resend delivery and bounce webhooks update email_outbox; bounces feed email_suppressions. Transactional mail only — no opens or clicks are tracked.</SourceNote>
        </Card>

        <Card title="Scheduled jobs" subtitle="Last run of each job">
          <div style={{ padding: '8px 20px' }}>
            {SA_CRON.map((c, i) => (
              <div key={c.job} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < SA_CRON.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <Icon name={c.ok ? 'check' : 'alert'} size={14} color={c.ok ? DS.success : DS.danger} />
                <div style={{ flex: 1, fontSize: 13, color: DS.text }}>{c.job}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{c.lastRun}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent Incidents">
        <Table pagination={false} cols={['Date', 'Incident', 'Severity', 'Duration', 'Status']} rows={SA_INCIDENTS.map(inc => [
          <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{inc.date}</span>,
          <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{inc.title}</span>,
          <StatusPill tone={inc.severity === 'major' ? 'negative' : 'warning'}>{inc.severity}</StatusPill>,
          <span style={{ fontSize: 13, color: DS.sub }}>{inc.duration}</span>,
          <SAStatusPill status={inc.status} />,
        ])} />
      </Card>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORT SESSIONS  —  support is by email; this is the record of every time
//  the owner looked inside a tenant (decision #30)
// ═══════════════════════════════════════════════════════════════════════════
const saClock = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const saMinsBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));

// Open-a-session form. Used from the Support page and from an account's detail
// popover on Centres (prefilled). Refuses without a reference and a reason.
const SASupportSessionModal = ({ open, account, accounts, onClose }) => {
  const list = accounts || SA_ACCOUNTS;
  const [accId, setAccId] = React.useState('');
  const [ref, setRef] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [mins, setMins] = React.useState(30);
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => {
    if (open) { setAccId(account ? account.id : (list[0] || {}).id || ''); setRef(''); setReason(''); setMins(30); setTouched(false); }
  }, [open, account && account.id]);
  const acc = list.find(a => a.id === accId) || null;
  const ok = !!acc && ref.trim() && reason.trim();
  const start = () => {
    setTouched(true);
    if (!ok) return;
    const res = saStartSupportSession({ account: acc, supportRef: ref, reason, minutes: mins });
    if (res.ok) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Open a support session" icon="eye" iconColor={DS.accent} width={540}
      subtitle="Look inside one account, time-boxed. Its admins see a banner for the whole session and a row in their own audit log."
      footer={<>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="eye" onClick={start}>Open session</Btn>
      </>}>
      <Field label="Account">
        <Select value={accId} onChange={e => setAccId(e.target.value)} disabled={!!account}>
          {list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '0 14px' }}>
        <Field label="Support email reference" required error={touched && !ref.trim() ? 'Quote the email thread the tenant started' : ''}
          hint="The subject or ticket ref from the support inbox — something the tenant will recognise.">
          <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. SUP-2291" />
        </Field>
        <Field label="Time box">
          <Select value={mins} onChange={e => setMins(+e.target.value)}>
            {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Reason" required error={touched && !reason.trim() ? 'Say what you need to look at' : ''}>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} style={{ minHeight: 70 }}
          placeholder="What you need to see, and why — this is shown to the account's admins." />
      </Field>
      <div style={{ fontSize: 11.5, color: DS.muted, lineHeight: 1.5 }}>
        Safeguarding records, health records, messages and consents stay closed inside a session. The session ends itself after {mins} minutes.
      </div>
    </Modal>
  );
};

const SASupportPage = () => {
  const { live, history } = useSupportSessions();
  const [open, setOpen] = React.useState(false);
  const avg = history.length ? Math.round(history.reduce((n, h) => n + saMinsBetween(h.startedAt, h.endedAt || h.expiresAt), 0) / history.length) : 0;
  const minsLeft = live ? saMinsBetween(new Date().toISOString(), live.expiresAt) : 0;

  return (
    <div style={pageFrame()}>
      <PageHeader title="Support sessions" subtitle={`Support happens by email at ${BRAND.supportEmail} — this is the record of every time you looked inside an account.`}
        actions={[
          <Btn key="mail" variant="secondary" icon="mail" small onClick={() => window.open(BRAND.supportInboxUrl, '_blank', 'noopener')}>Support inbox</Btn>,
          <Btn key="new" variant="primary" icon="eye" small onClick={() => setOpen(true)}>Open session</Btn>,
        ]} />

      <SAStatBand style={{ marginBottom: 20 }} items={[
        { label: 'Live session', value: live ? '1' : '0', sub: live ? `${live.accountName} · ${minsLeft} min left` : 'none open', tone: live ? 'warn' : 'pos', dot: live ? DS.warning : DS.success },
        { label: 'Sessions', value: history.length.toString(), sub: 'on record' },
        { label: 'Average length', value: `${avg} min`, sub: `capped at ${SA_SESSION_MAX_MIN} min` },
        { label: 'Accounts', value: new Set(history.map(h => h.accountId)).size.toString(), sub: 'looked into' },
      ]} />

      {live && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 10, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="eye" size={18} color={DS.warning} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.text }}>Live: {live.accountName} · {live.supportRef}</div>
            <div style={{ fontSize: 12.5, color: DS.sub, marginTop: 2 }}>{live.reason} — ends at {new Date(live.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ({minsLeft} min left)</div>
          </div>
          <Btn variant="secondary" small onClick={() => window.__navigate && window.__navigate('admin', 'dashboard')}>Return to it</Btn>
          <Btn variant="danger" small onClick={() => saCloseSession('ended')}>End now</Btn>
        </div>
      )}

      <Card title="Session log" subtitle="Append-only. Each row is also in the tenant's own audit log.">
        <Table
          cols={['Account', 'Reference', 'Reason', 'Started', 'Length', 'By']}
          rows={[...(live ? [live] : []), ...history].map(h => [
            <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{h.accountName}</span>,
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{h.supportRef}</span>,
            <span style={{ fontSize: 12.5, color: DS.sub }}>{h.reason}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{saClock(h.startedAt)}</span>,
            h.endedAt
              ? <span style={{ fontSize: 12.5, color: DS.sub }}>{saMinsBetween(h.startedAt, h.endedAt)} min</span>
              : <StatusPill tone="warning">live</StatusPill>,
            <span style={{ fontSize: 12, color: DS.muted }}>{h.by}</span>,
          ])}
          empty="No support sessions yet"
        />
      </Card>

      <SASupportSessionModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SECURITY & AUDIT
// ═══════════════════════════════════════════════════════════════════════════

const SASecurityPage = () => {
  const auditAll = useSAAudit();
  const [suspicious, setSuspicious] = React.useState(SA_SUSPICIOUS);
  const [dsar, setDsar] = React.useState(saDsarRows);
  const [flash, setFlash] = React.useState('');
  // Audit search/filter — a flat recent list won't scale (Section 4.5 / 7).
  const [q, setQ] = React.useState('');
  const [typeF, setTypeF] = React.useState('all');

  const types = ['all', ...Array.from(new Set(auditAll.map(a => a.type)))];
  const audit = auditAll.filter(a => {
    const matchQ = !q || a.actor.toLowerCase().includes(q.toLowerCase()) || a.action.toLowerCase().includes(q.toLowerCase()) || (a.target || '').toLowerCase().includes(q.toLowerCase());
    return matchQ && (typeF === 'all' || a.type === typeF);
  });

  const susAction = (id, status, verb) => { setSuspicious(list => list.map(s => s.id === id ? { ...s, status } : s)); saAudit({ action: `${verb}`, type: 'security', target: id }); setFlash(verb); };
  const fulfilDsar = (id) => { setDsar(list => list.map(d => d.id === id ? { ...d, status: 'fulfilled' } : d)); const rec = dsar.find(d => d.id === id); if (rec && rec.live && window.klasioDataRequests) window.klasioDataRequests.setStatus(id, 'completed'); saAudit({ action: `Fulfilled DSAR (${rec ? rec.kind : ''}) ${id}`, type: 'export', target: rec ? rec.requester : id }); setFlash(`${id} fulfilled`); };

  const openDeadlines = dsar.filter(d => d.status !== 'fulfilled').length;

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Security & Audit"
        subtitle="Compliance, access controls, and the audit trail"
        actions={[<Btn key="exp" variant="secondary" icon="download" small onClick={() => {
          const rows = [['Time', 'Actor', 'Action', 'Type', 'Target', 'IP']];
          audit.forEach(a => rows.push([a.ts, a.actor, a.action, a.type, a.target, a.ip]));
          saDownloadCSV('klasio-audit-log.csv', rows);
          saAudit({ action: `Exported audit log (${audit.length} rows)`, type: 'export', target: 'Audit log' });   // exporting is itself audited
          setFlash('Audit log exported');
        }}>Export Audit Log</Btn>]}
      />

      {/* Locked accounts is a tally off the user directory, not a literal. */}
      <SAStatBand
        style={{ marginBottom: 24 }}
        items={[
          { label: 'Failed Logins (24h)', value: '21', sub: '3 from new IPs', tone: 'warn', dot: DS.warning },
          { label: 'Locked Accounts', value: SAMetrics.directoryStats().locked.toString(), sub: 'auto-locked on failures', tone: 'neg', dot: DS.danger },
          { label: 'Active Sessions', value: '342', sub: `across ${SAMetrics.directoryStats().active30.toLocaleString()} active users`, tone: 'pos', dot: DS.success },
          { label: 'Open DSARs', value: openDeadlines.toString(), sub: 'with legal SLA', tone: openDeadlines ? 'warn' : 'pos', dot: openDeadlines ? DS.warning : DS.success },
        ]}
      />

      {/* DSAR queue — real workflow with requester/target/deadline/status/fulfil */}
      <Card title="Data Subject Requests (DSAR)" subtitle="UK-GDPR / AADC — legal SLA deadlines" actions={[<Badge key="b" variant={openDeadlines ? 'warning' : 'success'}>{openDeadlines} open</Badge>]} style={{ marginBottom: 20 }}>
        <Table pagination={false} cols={['Type', 'Requester', 'Subject data', 'Received', 'Deadline', 'Status', { label: 'Action', align: 'right' }]} rows={dsar.map(d => [
          <StatusPill tone={d.kind === 'delete' ? 'negative' : 'info'}>{d.kind === 'delete' ? 'Erasure' : 'Export'}</StatusPill>,
          <span style={{ fontSize: 13, color: DS.text }}>{d.requester}</span>,
          <span style={{ fontSize: 12, color: DS.muted }}>{d.subject}</span>,
          <span style={{ fontSize: 12, color: DS.muted }}>{d.received}</span>,
          <span style={{ fontSize: 12, fontWeight: 600, color: d.status !== 'fulfilled' ? DS.warning : DS.muted }}>{d.deadline}</span>,
          <SAStatusPill status={d.status} />,
          d.status !== 'fulfilled'
            ? <Btn small variant="secondary" icon="check" onClick={() => fulfilDsar(d.id)}>Fulfil</Btn>
            : <span style={{ fontSize: 12, color: DS.success }}>Done</span>,
        ])} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Suspicious Activity" actions={[<Badge key="b" variant="danger">{suspicious.filter(s => s.status !== 'cleared').length} active</Badge>]}>
          <Table pagination={false} cols={['Email', 'Attempts', 'IP', 'Origin', 'Status', { label: 'Action', align: 'right' }]} rows={suspicious.map(f => [
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.text }}>{f.email}</span>,
            <StatusPill tone={f.attempts > 5 ? 'negative' : 'warning'}>{f.attempts}</StatusPill>,
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{f.ip}</span>,
            <span style={{ fontSize: 12, color: DS.sub }}>{f.country}</span>,
            <StatusPill tone={f.status === 'cleared' ? 'positive' : 'negative'}>{f.status}</StatusPill>,
            <RowActionsMenu items={[
              { label: 'Block IP', icon: 'alert', danger: true, onClick: () => susAction(f.id, 'blocked', `Blocked IP ${f.ip}`) },
              { label: 'Force reset', icon: 'mail', onClick: () => susAction(f.id, f.status, `Forced password reset for ${f.email}`) },
              { label: 'Clear', icon: 'check', onClick: () => susAction(f.id, 'cleared', `Cleared alert for ${f.email}`) },
            ]} />,
          ])} />
        </Card>

        <Card title="Compliance & Privacy">
          <div style={{ padding: '20px' }}>
            {[
              { label: 'Privacy Policy Acceptance', value: '99.8%', icon: 'check', color: DS.success },
              { label: 'Cookie Consent Coverage', value: '100%', icon: 'check', color: DS.success },
              { label: 'AADC (child data) posture', value: 'Enforced', icon: 'shield', color: DS.success },
              { label: 'Encryption (in transit)', value: 'TLS 1.3', icon: 'zap', color: DS.success },
              { label: 'Encryption (at rest)', value: 'AES-256', icon: 'zap', color: DS.success },
              // Same tally the Users → Security tab shows (students excluded).
              { label: 'MFA Adoption', value: (() => { const d = SAMetrics.directoryStats(); return d.mfaEligible ? `${((d.mfaOn / d.mfaEligible) * 100).toFixed(1)}%` : '—'; })(), icon: 'shield', color: DS.accent },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: item.color + '15', color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} size={14} /></div>
                <div style={{ flex: 1, fontSize: 13, color: DS.sub }}>{item.label}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Append-only audit log with search + filter by actor/target/type. */}
      <Card title="Audit Log" subtitle="Append-only — no entry can be edited or deleted. Exports are audited.">
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px 4px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '7px 10px' }}>
            <Icon name="search" size={13} color={DS.faint} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search actor, account, or action…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: DS.text, flex: 1 }} />
          </div>
          <select value={typeF} onChange={e => setTypeF(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${DS.border}`, background: DS.bg, color: DS.sub, fontSize: 13, cursor: 'pointer' }}>
            {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
          </select>
        </div>
        <Table cols={['Actor', 'Action', 'Type', 'Target', 'IP Address', 'Time']} rows={audit.map(a => [
          <span style={{ fontSize: 13, fontWeight: 600, color: a.actor === 'System' ? DS.muted : DS.text }}>{a.actor}</span>,
          <span style={{ fontSize: 13, color: DS.sub }}>{a.action}</span>,
          <span style={{ fontSize: 11, color: DS.muted, textTransform: 'capitalize' }}>{a.type}</span>,
          <span style={{ fontSize: 12, color: DS.muted }}>{a.target}</span>,
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{a.ip}</span>,
          <span style={{ fontSize: 12, color: DS.muted }}>{saTimeAgo(a.ts)}</span>,
        ])} />
      </Card>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// Compact relative-time for audit timestamps.
const saTimeAgo = (ts) => {
  const d = new Date(ts); if (isNaN(d)) return ts;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60); if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24); return `${days}d ago`;
};

// ═══════════════════════════════════════════════════════════════════════════
//  PRICING  —  what each plan is, what it costs, and the offers on top of it
// ═══════════════════════════════════════════════════════════════════════════
//  One catalogue (Plans.jsx), two audiences: centre accounts and solo tutors.
//  Plans, the free trial for each audience and the override codes live here; the
//  operational switches stay in Platform Controls. Stripe charges — a plan is only
//  sold while its Stripe prices match the catalogue (decision #37).
const saFmtGb = (gb) => (+gb < 1 ? `${Math.round(+gb * 1024)} MB` : `${+(+gb).toFixed(1)} GB`);
const saSoloTints = () => ['#9CA3AF', SA_CHART_PALETTE[4], SA_CHART_PALETTE[5], SA_CHART_PALETTE[3], SA_CHART_PALETTE[2]];
const saPlanTint = (plan, i) => (plan.audience === 'solo' ? saSoloTints()[i % saSoloTints().length] : saPlanColor(plan.id));

const SAPricingPage = () => {
  const plansStore = usePlansStore();
  const codesStore = usePlanCodesStore();
  const trialStore = usePlatformTrialStore();
  const [audience, setAudience] = React.useState('centre');
  const [planModal, setPlanModal] = React.useState({ open: false, plan: null });
  const [deletePlanTarget, setDeletePlanTarget] = React.useState(null);
  const [codeModal, setCodeModal] = React.useState({ open: false, code: null });
  const [trialModal, setTrialModal] = React.useState(false);
  const [copied, setCopied] = React.useState('');
  const [flash, setFlash] = React.useState('');
  const copyCode = c => { try { navigator.clipboard.writeText(c); } catch (e) {} setCopied(c); setTimeout(() => setCopied(''), 1400); };

  const aud = planAudience(audience);
  const isSolo = audience === 'solo';
  const plansFor = (a) => plansStore.plans.filter(p => p.audience === a);
  const onSaleFor = (a) => plansFor(a).filter(planIsSellable);
  const plans = plansFor(audience);
  const drift = plansStore.plans.filter(p => !p.archived && ['not_in_stripe', 'price_changed'].includes(planStripeState(p).id));
  const trials = trialStore.trials;
  const trial = trials[audience];
  const activeCodes = codesStore.codes.filter(c => c.status === 'active');
  const accountsOn = (id) => SA_ACCOUNTS.filter(a => a.planId === id).length;
  const fromPrice = (a) => { const ps = onSaleFor(a).map(p => +p.price || 0); return ps.length ? `from £${Math.min(...ps)}/mo` : 'none on sale'; };
  const trialShort = (t) => (t.enabled ? `${t.days}d` : 'off');

  const Switch = ({ on, onChange }) => (
    <button onClick={onChange} style={{ width: 36, height: 20, borderRadius: 10, background: on ? DS.accent : DS.borderDark, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </button>
  );
  const Eyebrow = ({ children, style }) => (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', ...style }}>{children}</div>
  );

  const createPrices = (plan) => {
    const res = plansStore.createStripePrice(plan.id) || {};
    const parts = [res.stripePrice ? `£${res.stripePrice}/mo` : null, res.stripePriceYearly ? `£${res.stripePriceYearly}/yr` : null].filter(Boolean).join(' and ');
    saAudit({ action: `Created Stripe price${res.stripePrice && res.stripePriceYearly ? 's' : ''} for ${plan.name} (${parts}) — new customers only`, type: 'plan', target: 'Pricing' });
    setFlash(`${plan.name} is live in Stripe at ${parts} — existing subscribers keep their price`);
  };
  const driftNote = (plan, st) => {
    if (st.id === 'not_in_stripe') return 'Not offered at signup or checkout until every paid cycle has a Stripe price.';
    const was = st.cycles.map(c => `£${c.charged} ${c.id === 'monthly' ? 'a month' : 'a year'}`).join(' and ');
    return `Stripe still charges ${was}. Not offered until you create the new price. Existing subscribers keep theirs unless given 30 days’ notice.`;
  };
  const limitsLine = (plan) => (plan.audience === 'solo'
    ? `${plan.studentSeats} students · ${plan.maxInvoicesPerMonth == null ? 'unlimited invoices' : `${plan.maxInvoicesPerMonth} invoices a month`} · ${saFmtGb(plan.storageGb || 0)} storage · 1 tutor`
    : `Up to ${plan.studentSeats} students · ${plan.teacherSeats} teachers per centre · ${saFmtGb(plan.storageGb || 0)} storage`);

  return (
    <div style={pageFrame()}>
      <PageHeader title="Pricing" subtitle="Plans, free trials and codes for centres and solo tutors. What a plan is lives here; Stripe charges it." />

      {/* One stat card: what's on sale, what's out of step with Stripe, the offers. */}
      <SAStatBand style={{ marginBottom: 20 }} items={[
        { label: 'Centre plans', value: `${onSaleFor('centre').length} on sale`, sub: fromPrice('centre'), onClick: () => setAudience('centre') },
        { label: 'Solo tutor plans', value: `${onSaleFor('solo').length} on sale`, sub: fromPrice('solo'), onClick: () => setAudience('solo') },
        { label: 'Out of step with Stripe', value: drift.length.toString(), sub: drift.length ? drift.map(p => p.name).join(', ') + ' — not being sold' : 'every live plan is sellable', tone: drift.length ? 'warn' : 'pos', dot: drift.length ? DS.warning : DS.success },
        { label: 'Free trials', value: `${trialShort(trials.centre)} · ${trialShort(trials.solo)}`, sub: 'centres · solo tutors' },
        { label: 'Active codes', value: activeCodes.length.toString(), sub: (() => { const n = codesStore.codes.reduce((k, c) => k + (c.redemptions || []).length, 0); return `${n} redemption${n === 1 ? '' : 's'} so far`; })() },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <Segmented value={audience} onChange={setAudience} options={PLAN_AUDIENCES.map(a => ({ id: a.id, label: a.label }))} />
        <span style={{ fontSize: 12.5, color: DS.muted }}>
          {isSolo
            ? 'Sold to private tutors — the solo Plan & billing page shows these plans on sale.'
            : 'Sold to centre accounts — signup, the admin Plans & Billing page and the marketing site show these plans on sale.'}
        </span>
      </div>

      {/* Plans — the catalogue says what a plan IS (prices, limits, capabilities,
          bullets); Stripe says what a customer PAYS. The badge shows whether the
          two agree — a plan is only sold while they do. */}
      <Card title={isSolo ? 'Solo tutor plans' : 'Centre plans'}
        subtitle={isSolo ? 'One tutor, one implicit centre. Limits count students, invoices and storage.' : 'Limits count centres, per-centre seats and pooled storage.'}
        actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setPlanModal({ open: true, plan: null })}>New plan</Btn>]} style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16, padding: '20px' }}>
          {plans.map((plan, i) => {
            const color = saPlanTint(plan, i);
            const st = planStripeState(plan);
            const caps = PLAN_CAPABILITIES.filter(c => (plan.capabilities || {})[c.key]);
            const n = accountsOn(plan.id);
            return (
              <div key={plan.id} style={{ border: `2px solid ${color}33`, borderRadius: 10, padding: 18, background: color + '08', opacity: plan.archived ? 0.62 : 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{plan.name}</span>
                  {plan.archived ? <Badge variant="default">Archived</Badge>
                    : <Badge variant="default">{isSolo ? '1 tutor' : `${plan.maxCentres} centre${plan.maxCentres !== 1 ? 's' : ''}`}</Badge>}
                </div>
                {plan.tagline && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{plan.tagline}</div>}
                <div style={{ margin: '10px 0 2px' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: DS.text }}>£{plan.price}</span>
                  <span style={{ fontSize: 13, color: DS.muted }}> /mo</span>
                  {plan.archived && <span style={{ fontSize: 11, color: DS.muted, marginLeft: 8 }}>last config</span>}
                </div>
                <div style={{ fontSize: 12, color: DS.muted, marginBottom: 10 }}>
                  {+plan.price === 0 && !+plan.priceYearly ? 'Free for as long as they like' : +plan.priceYearly > 0 ? `£${(+plan.priceYearly).toLocaleString()} a year` : 'No yearly option'}
                </div>
                {!plan.archived && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <Badge variant={st.tone}>{st.label}</Badge>
                    {(st.id === 'not_in_stripe' || st.id === 'price_changed') && (
                      <Btn variant="secondary" small onClick={() => createPrices(plan)}>{(+plan.price > 0 && +plan.priceYearly > 0) ? 'Create Stripe prices' : 'Create Stripe price'}</Btn>
                    )}
                  </div>
                )}
                {!plan.archived && (st.id === 'not_in_stripe' || st.id === 'price_changed') && (
                  <div style={{ fontSize: 11, color: DS.warning, marginBottom: 10, lineHeight: 1.45 }}>{driftNote(plan, st)}</div>
                )}
                <div style={{ fontSize: 11, color: DS.muted, marginBottom: isSolo ? 10 : 4 }}>{limitsLine(plan)}</div>
                {!isSolo && <div style={{ fontSize: 11, color: DS.muted, marginBottom: 10 }}>{n} account{n === 1 ? '' : 's'} on this plan</div>}
                <Eyebrow style={{ marginBottom: 6 }}>Unlocks · {caps.length} of {PLAN_CAPABILITIES.length}</Eyebrow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {caps.length ? caps.map(c => <span key={c.key} style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 4, background: DS.bg, color: DS.sub, border: `1px solid ${DS.border}` }}>{c.label}</span>)
                    : <span style={{ fontSize: 11.5, color: DS.faint }}>Core only</span>}
                </div>
                <Divider margin="10px 0" />
                <Eyebrow style={{ marginBottom: 4 }}>Pricing page</Eyebrow>
                {(plan.bullets || []).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: DS.sub, padding: '3px 0' }}><Icon name="check" size={12} color={color} />{f}</div>
                ))}
                <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" small onClick={() => setPlanModal({ open: true, plan })}>Edit</Btn>
                  {plan.archived
                    ? <Btn variant="ghost" small onClick={() => { plansStore.restorePlan(plan.id); saAudit({ action: `Restored plan "${plan.name}"`, type: 'plan', target: 'Pricing' }); }}>Restore</Btn>
                    : <Btn variant="ghost" small onClick={() => { plansStore.archivePlan(plan.id); saAudit({ action: `Archived plan "${plan.name}"`, type: 'plan', target: 'Pricing' }); }}>Archive</Btn>}
                  <Btn variant="ghost" icon="trash" small onClick={() => setDeletePlanTarget(plan)} style={{ marginLeft: 'auto' }} />
                </div>
              </div>
            );
          })}
        </div>
        {plans.length === 0 && <div style={{ padding: '0 20px 24px', fontSize: 13, color: DS.muted }}>No {aud.noun} plans yet.</div>}
      </Card>

      {/* The free trial for this audience. Distinct from the override codes below
          (those are handed to ONE account by hand). */}
      {(() => {
        const t = trial;
        const pinned = t.planId ? getPlan(t.planId) : null;
        const endAction = planTrialEndAction(t.onEnd);
        const facts = [
          { label: 'Trial length', value: t.enabled ? `${t.days} day${t.days === 1 ? '' : 's'}` : '—' },
          { label: 'Runs on', value: pinned ? pinned.name : 'Plan they choose' },
          { label: 'Card up front', value: t.requireCard ? 'Required' : 'Not required' },
          { label: 'When it ends', value: endAction.label },
        ];
        return (
          <Card title={`Free trial for ${aud.nouns}`} subtitle={`Applied automatically to every new ${aud.noun} at signup — no code needed`}
            actions={[<Btn key="edit" variant="ghost" icon="edit" small onClick={() => setTrialModal(true)}>Edit trial</Btn>]}
            style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 20px', background: t.enabled ? DS.accent + '08' : 'transparent', borderBottom: `1px solid ${DS.border}` }}>
              <div style={{ minWidth: 132 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: t.enabled ? DS.text : DS.faint, letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                  {t.enabled ? t.days : 'Off'}
                  {t.enabled && <span style={{ fontSize: 14, fontWeight: 600, color: DS.muted }}> day{t.days === 1 ? '' : 's'}</span>}
                </div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 3 }}>{t.enabled ? 'free, then the end rule' : 'billed from day one'}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: DS.sub, lineHeight: 1.6 }}>
                {t.enabled
                  ? <>New {aud.nouns} see “<b>{planTrialPitch(t)}</b>” at signup
                    {pinned ? <>, trialling the <b>{pinned.name}</b> plan</> : <>, on whichever plan they pick{isSolo ? ' (Solo Free needs no trial)' : ''}</>}.
                    Day {t.days + 1}: {endAction.desc}</>
                  : <>No trial is offered. Signup asks for payment straight away — issue an override code below to give one account free time.</>}
                {isSolo && <div style={{ fontSize: 11, color: DS.faint, marginTop: 4 }}>Prototype: there is no solo signup yet, so nothing shows this offer until there is.</div>}
                {t.updatedAt && <div style={{ fontSize: 11, color: DS.faint, marginTop: 4 }}>Last changed {new Date(t.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Badge variant={t.enabled ? 'success' : 'default'}>{t.enabled ? 'Live' : 'Disabled'}</Badge>
                <Switch on={!!t.enabled} onChange={() => {
                  const next = trialStore.updateTrial(audience, { enabled: !t.enabled });
                  saAudit({ action: next.enabled ? `Enabled the ${next.days}-day free trial for ${aud.nouns}` : `Disabled the free trial for ${aud.nouns}`, type: 'billing', target: 'Pricing' });
                  setFlash(next.enabled ? `Free trial for ${aud.nouns} on — ${next.days} days` : `Free trial for ${aud.nouns} off`);
                }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
              {facts.map((f, i) => (
                <div key={f.label} style={{ padding: '14px 20px', borderLeft: i ? `1px solid ${DS.border}` : 'none', opacity: t.enabled ? 1 : 0.6 }}>
                  <Eyebrow>{f.label}</Eyebrow>
                  <div style={{ fontSize: 13, color: DS.text, marginTop: 4 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Override codes — shared by both audiences; restrict one to a plan to keep it there. */}
      <Card title="Promo & override codes" subtitle="Give one account a free trial or a discounted price for a fixed window. Works for either audience; every redemption is audited."
        actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setCodeModal({ open: true, code: null })}>New code</Btn>]}>
        <Table pagination={false} cols={['Code', 'Offer', 'Restrict to', 'Redemptions', 'Status', { label: 'Actions', align: 'right' }]} rows={codesStore.codes.map(c => {
          const used = (c.redemptions || []).length;
          const plan = c.planId ? getPlan(c.planId) : null;
          return [
            <button onClick={() => copyCode(c.code)} title="Copy code" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.accent, fontWeight: 600 }}>
              {c.code}<Icon name={copied === c.code ? 'check' : 'copy'} size={12} color={copied === c.code ? DS.success : DS.faint} />
            </button>,
            <div><div style={{ fontSize: 13, color: DS.text }}>{planCodeSummary(c)}</div>{c.note && <div style={{ fontSize: 11, color: DS.muted }}>{c.note}</div>}</div>,
            <span style={{ fontSize: 12, color: DS.muted }}>{plan ? `${plan.name} · ${planAudience(plan.audience).label}` : 'Any plan'}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>{used}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}</span>,
            <StatusPill status={c.status === 'active' ? 'Active' : 'Disabled'} />,
            <RowActionsMenu items={[
              { label: 'Edit code', icon: 'edit', onClick: () => setCodeModal({ open: true, code: c }) },
              { label: c.status === 'active' ? 'Disable' : 'Enable', icon: c.status === 'active' ? 'x' : 'check', onClick: () => { codesStore.setStatus(c.code, c.status === 'active' ? 'disabled' : 'active'); saAudit({ action: `${c.status === 'active' ? 'Disabled' : 'Enabled'} code ${c.code}`, type: 'billing', target: 'Pricing' }); } },
              { label: 'Delete code', icon: 'trash', danger: true, onClick: () => { codesStore.deleteCode(c.code); saAudit({ action: `Deleted code ${c.code}`, type: 'billing', target: 'Pricing' }); } },
            ]} />,
          ];
        })} />
        {codesStore.codes.length === 0 && <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: DS.muted }}>No override codes yet. Create one to give an account a free trial or discount.</div>}
        <div style={{ padding: '10px 20px 16px', fontSize: 11, color: DS.muted, borderTop: `1px solid ${DS.border}` }}>Guardrails: every code needs an expiry and a max redemption cap; discounts are bounded; each redemption writes an audit entry.</div>
      </Card>

      <PlanEditorModal open={planModal.open} plan={planModal.plan} audience={audience} onClose={() => setPlanModal({ open: false, plan: null })}
        onSave={draft => {
          const before = planModal.plan;
          if (before) plansStore.updatePlan(before.id, draft); else plansStore.addPlan({ ...draft, audience });
          saAudit({ action: `${before ? 'Edited' : 'Created'} ${planAudience(draft.audience || audience).noun} plan "${draft.name}"`, type: 'plan', target: 'Pricing' });
          const after = before ? { ...before, ...draft } : { ...draft, stripePriceId: null, stripePriceIdYearly: null };
          if (['not_in_stripe', 'price_changed'].includes(planStripeState(after).id)) setFlash(`${draft.name}: the new prices aren’t live in Stripe yet — create them to sell the plan`);
        }} />
      <Modal open={!!deletePlanTarget} onClose={() => setDeletePlanTarget(null)} title="Delete plan?" icon="trash" iconColor={DS.danger} width={440}
        footer={<><Btn variant="ghost" small onClick={() => setDeletePlanTarget(null)}>Cancel</Btn>
          <Btn variant="danger" small icon="trash" onClick={() => { plansStore.deletePlan(deletePlanTarget.id); saAudit({ action: `Deleted plan "${deletePlanTarget.name}"`, type: 'plan', target: 'Pricing' }); setDeletePlanTarget(null); }}>Delete plan</Btn></>}>
        <p style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, margin: 0 }}>
          This permanently removes the <b>{deletePlanTarget ? deletePlanTarget.name : ''}</b> plan from the catalogue. Accounts already on it keep their current price, but nobody can choose it again. This can’t be undone — to hide it instead, use <b>Archive</b>.
        </p>
      </Modal>

      <PlanTrialModal open={trialModal} trial={trial} audience={audience} plans={plans.filter(p => !p.archived)}
        onClose={() => setTrialModal(false)}
        onSave={draft => {
          const next = trialStore.updateTrial(audience, draft);
          saAudit({ action: next.enabled ? `Set the free trial for ${aud.nouns} to ${next.days} days` : `Disabled the free trial for ${aud.nouns}`, type: 'billing', target: 'Pricing' });
          setFlash(next.enabled ? `Free trial for ${aud.nouns} saved — ${next.days} days` : `Free trial for ${aud.nouns} off`);
        }} />

      <PlanCodeModal open={codeModal.open} code={codeModal.code} plans={plansStore.plans} onClose={() => setCodeModal({ open: false, code: null })}
        onSave={draft => {
          if (codeModal.code) codesStore.updateCode(codeModal.code.code, { kind: draft.kind, value: +draft.value || 0, durationMonths: Math.max(1, +draft.durationMonths || 1), planId: draft.planId || null, maxRedemptions: (draft.maxRedemptions === '' || draft.maxRedemptions == null) ? null : +draft.maxRedemptions, note: draft.note || '' });
          else codesStore.createCode(draft);
          saAudit({ action: `${codeModal.code ? 'Edited' : 'Created'} override code`, type: 'billing', target: 'Pricing' });
        }} />

      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLATFORM CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

// Turning maintenance or read-only ON — the notice users will see, and (for
// read-only) whether it covers every account or a list. Turning either OFF never
// comes through here: the way out is always one click.
const SA_MODE_COPY = {
  maintenance: {
    title: 'Turn on maintenance mode?', ok: 'Turn on maintenance', icon: 'zap',
    body: 'Every centre loses the app: admins, teachers and students get the maintenance screen until you turn it off. You keep full access. Use it for minutes, for work that cannot run online.',
    notice: 'Klasio is down for planned maintenance and will be back shortly.',
  },
  readonly: {
    title: 'Turn on read-only mode?', ok: 'Turn on read-only', icon: 'lock',
    body: 'The app keeps working, but frozen: people can open and read everything and every change is refused behind a banner. Raising a safeguarding concern is never blocked.',
    notice: 'Klasio is read-only while we look into an issue. You can see everything; saving changes will be back soon.',
  },
};
const SAModeModal = ({ mode, onClose, onConfirm }) => {
  const copy = SA_MODE_COPY[mode] || SA_MODE_COPY.maintenance;
  const [notice, setNotice] = React.useState('');
  const [scope, setScope] = React.useState('all');
  const [ids, setIds] = React.useState([]);
  const [until, setUntil] = React.useState('');   // datetime-local, maintenance only
  React.useEffect(() => { if (mode) { setNotice(copy.notice); setScope('all'); setIds([]); setUntil(''); } }, [mode]);
  const untilIso = until ? new Date(until).toISOString() : null;
  const untilPast = untilIso && new Date(untilIso) <= new Date();
  const toggle = (id) => setIds(xs => xs.includes(id) ? xs.filter(x => x !== id) : [...xs, id]);
  const valid = notice.trim() && (mode !== 'readonly' || scope === 'all' || ids.length) && !untilPast;
  return (
    <Modal open={!!mode} onClose={onClose} title={copy.title} icon={copy.icon} iconColor={DS.danger} width={540}
      footer={<>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" small disabled={!valid} onClick={() => valid && onConfirm({ notice: notice.trim(), accountIds: mode === 'readonly' && scope === 'some' ? ids : null, until: mode === 'maintenance' ? untilIso : null })}>{copy.ok}</Btn>
      </>}>
      <p style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, margin: '0 0 14px' }}>{copy.body}</p>
      {mode === 'readonly' && (
        <Field label="Applies to">
          <Segmented value={scope} onChange={setScope} options={[{ id: 'all', label: 'Every account' }, { id: 'some', label: 'Chosen accounts' }]} />
          {scope === 'some' && (
            <div style={{ marginTop: 10, maxHeight: 180, overflow: 'auto', border: `1px solid ${DS.border}`, borderRadius: 8, padding: '4px 12px' }}>
              {SA_ACCOUNTS.map(a => (
                <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 13, color: DS.sub, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ids.includes(a.id)} onChange={() => toggle(a.id)} /> {a.name}
                </label>
              ))}
            </div>
          )}
        </Field>
      )}
      <Field label="Notice shown to users" required>
        <Textarea value={notice} onChange={e => setNotice(e.target.value)} style={{ minHeight: 64 }} />
      </Field>
      {mode === 'maintenance' && (
        <Field label="Expected back by" hint={untilPast ? 'That time has already passed.' : 'Optional. Shown on the maintenance screen — it never ends maintenance by itself.'} error={untilPast ? 'Pick a time in the future' : ''}>
          <Input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} />
        </Field>
      )}
      {mode === 'maintenance' && (
        <div style={{ fontSize: 12, color: DS.muted }}>
          <button onClick={() => window.open(new URL('?view=maintenance', window.location.href).href, '_blank', 'noopener')} style={{ background: 'none', border: 'none', padding: 0, color: DS.accent, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Preview the maintenance screen</button> before you turn it on.
        </div>
      )}
    </Modal>
  );
};

// Choose which accounts a flag is on for: everyone, or an explicit list.
const SAFlagAccountsModal = ({ flag, onClose, onSave }) => {
  const [mode, setMode] = React.useState('all');
  const [ids, setIds] = React.useState([]);
  React.useEffect(() => { if (flag) { setMode(flag.accountIds == null ? 'all' : 'some'); setIds(flag.accountIds || []); } }, [flag && flag.id]);
  const toggle = (id) => setIds(xs => xs.includes(id) ? xs.filter(x => x !== id) : [...xs, id]);
  return (
    <Modal open={!!flag} onClose={onClose} title={flag ? `Accounts — ${flag.id}` : ''} icon="settings" iconColor={DS.accent} width={520}
      footer={<>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" disabled={mode === 'some' && !ids.length} onClick={() => onSave(mode === 'all' ? null : ids)}>Save</Btn>
      </>}>
      <div style={{ fontSize: 13, color: DS.muted, marginBottom: 12 }}>When the flag is on, who gets it.</div>
      <Segmented value={mode} onChange={setMode} options={[{ id: 'all', label: 'Every account' }, { id: 'some', label: 'Only these accounts' }]} />
      {mode === 'some' && (
        <div style={{ marginTop: 12, maxHeight: 280, overflow: 'auto' }}>
          {SA_ACCOUNTS.map(a => (
            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${DS.border}`, fontSize: 13, color: DS.sub, cursor: 'pointer' }}>
              <input type="checkbox" checked={ids.includes(a.id)} onChange={() => toggle(a.id)} /> <span style={{ flex: 1 }}>{a.name}</span>
              <SAPlanPill planId={a.planId} />
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
};

const SAControlsPage = () => {
  const [platform, setPlatform] = usePlatformSettings();
  const flagsStore = useFeatureFlags();
  const [modeModal, setModeModal] = React.useState(null);     // 'maintenance' | 'readonly'
  const [flagTarget, setFlagTarget] = React.useState(null);   // flag whose account list is open
  const [newFlag, setNewFlag] = React.useState(null);         // { key, desc } while creating
  const [flash, setFlash] = React.useState('');

  const Switch = ({ on, onChange }) => (
    <button onClick={onChange} style={{ width: 36, height: 20, borderRadius: 10, background: on ? DS.accent : DS.borderDark, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </button>
  );

  const note = (action, msg) => { saAudit({ action, type: 'system', target: 'Platform' }); setFlash(msg || action); };
  const roIds = platform.readOnlyAccountIds;
  const toggles = [
    { id: 'maintenance', label: 'Maintenance mode', danger: true, on: platform.maintenanceMode,
      desc: 'App unavailable — every centre gets the maintenance screen instead of the app; you stay in. Minutes, for work that can’t run online.',
      set: (v) => v ? setModeModal('maintenance') : (setPlatform({ maintenanceMode: false, maintenanceUntil: null }), note('Turned maintenance mode off')) },
    { id: 'readonly', label: 'Read-only mode', danger: true, on: platform.readOnlyMode,
      desc: platform.readOnlyMode
        ? `Frozen for ${roIds == null ? 'every account' : roIds.map(id => (SAMetrics.account(id) || { name: id }).name).join(', ')} — reads work, changes are refused. Suspended accounts are always read-only.`
        : 'App works but frozen — everyone can read, every change is refused behind a banner. Hours: an incident or a risky deploy. Platform-wide or chosen accounts.',
      set: (v) => v ? setModeModal('readonly') : (setPlatform({ readOnlyMode: false, readOnlyAccountIds: null }), note('Turned read-only mode off')) },
    { id: 'signups', label: 'New signups', on: platform.signupsEnabled,
      desc: 'Allow new accounts to register through self-serve signup. Off shows “signups are paused” instead of the form.',
      set: (v) => { setPlatform({ signupsEnabled: v }); note(v ? 'Opened self-serve signups' : 'Paused self-serve signups'); } },
    { id: 'status', label: 'Public status page', on: platform.statusPagePublic,
      desc: `Off until an SLA or a customer’s procurement asks for one — then it publishes at ${BRAND.statusDomain}. Until then, tell affected admins with a platform announcement.`,
      set: (v) => { setPlatform({ statusPagePublic: v }); note(v ? `Published the status page (${BRAND.statusDomain})` : 'Took the status page private'); } },
  ];

  const confirmMode = ({ notice, accountIds, until }) => {
    if (modeModal === 'maintenance') {
      setPlatform({ maintenanceMode: true, maintenanceNotice: notice, maintenanceUntil: until || null });
      note('Turned maintenance mode on', 'Maintenance mode on — centres see the maintenance screen');
    } else {
      setPlatform({ readOnlyMode: true, readOnlyNotice: notice, readOnlyAccountIds: accountIds });
      note(`Turned read-only mode on (${accountIds ? accountIds.length + ' account' + (accountIds.length === 1 ? '' : 's') : 'every account'})`, 'Read-only mode on');
    }
    setModeModal(null);
  };

  return (
    <div style={pageFrame()}>
      <PageHeader title="Platform Controls" subtitle="Platform switches, feature flags and roles. Every change saves at once and is audited. Plans, free trials and codes are on the Pricing page."
        actions={[<Btn key="pricing" variant="secondary" icon="tag" small onClick={() => window.__navigate && window.__navigate('superadmin', 'pricing')}>Pricing</Btn>]} />

      {/* Platform switches — the one `platform_settings` row. */}
      <Card title="Platform switches" subtitle="Turning maintenance or read-only on asks for confirmation; turning either off is one click." style={{ marginBottom: 20 }}>
        <div style={{ padding: '8px 0' }}>
          {toggles.map((t, i, arr) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none', background: t.on && t.danger ? DS.warningBg : 'transparent' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: DS.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.label}
                  {t.on && t.danger && <Badge variant="warning">Active</Badge>}
                </div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{t.desc}</div>
              </div>
              <Switch on={t.on} onChange={() => t.set(!t.on)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Every page people see outside the app (or instead of it), in one list. */}
      {window.PublicPagesCard && <window.PublicPagesCard style={{ marginBottom: 20 }} />}

      {/* Feature flags — rollout only: a master switch + an optional account list. */}
      <Card title="Feature flags" subtitle="Product rollout only — on or off, for every account or a chosen few. Plans gate features through capabilities, never flags."
        actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setNewFlag({ key: '', desc: '' })}>New flag</Btn>]} style={{ marginBottom: 20 }}>
        <Table pagination={false} cols={['Flag', 'Description', 'Accounts', 'On']} rows={flagsStore.flags.map(f => [
          <code style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', background: DS.surface, padding: '2px 6px', borderRadius: 4, color: DS.accent }}>{f.id}</code>,
          <span style={{ fontSize: 13, color: DS.sub }}>
            {f.desc}
            {f.id === 'monitored_messaging' && <span style={{ display: 'block', fontSize: 11, color: DS.muted, marginTop: 2 }}>Routes through the safeguarding layer — never an unmonitored staff↔student channel.</span>}
          </span>,
          <button onClick={() => setFlagTarget(f)} style={{ fontSize: 12, color: DS.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            {f.accountIds == null ? 'Every account' : `${f.accountIds.length} account${f.accountIds.length === 1 ? '' : 's'}`}
          </button>,
          <Switch on={f.on} onChange={() => { flagsStore.patch(f.id, { on: !f.on }); saAudit({ action: `${f.on ? 'Turned off' : 'Turned on'} feature flag "${f.id}"`, type: 'flag', target: f.accountIds == null ? 'Every account' : `${f.accountIds.length} accounts` }); }} />,
        ])} />
      </Card>

      {/* Roles — counts are the trusted getUserCounts() source */}
      <Card title="Roles & Permissions" actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setFlash('New role editor (prototype)')}>New Role</Btn>]}>
        <Table pagination={false} cols={['Role', 'Users', 'Permissions', 'Scope']} rows={[
          { role: 'Superadmin', users: SA_ROLE_COUNTS.superadmin, perms: ['Full platform access', 'Billing', 'Audit log'], scope: 'Platform-wide', color: DS.accent },
          { role: 'Admin', users: SA_ROLE_COUNTS.admin, perms: ['Manage centre', 'Invite teachers', 'View invoices'], scope: 'Per account', color: SA_CHART_PALETTE[5] },
          { role: 'Teacher', users: SA_ROLE_COUNTS.teacher, perms: ['Manage classes', 'Grade homework', 'View assigned'], scope: 'Per centre', color: SA_CHART_PALETTE[0] },
          { role: 'Student', users: SA_ROLE_COUNTS.student, perms: ['Submit homework', 'View own progress'], scope: 'Self', color: SA_CHART_PALETTE[1] },
          { role: 'Parent', users: SA_ROLE_COUNTS.parent, perms: ['View child progress', 'Pay invoices'], scope: 'Linked students', color: SA_CHART_PALETTE[2] },
        ].map(r => [
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5, background: r.color + '20', color: r.color }}>{r.role}</span>,
          <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.users.toLocaleString()}</span>,
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{r.perms.map(p => <span key={p} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: DS.surface, color: DS.muted, border: `1px solid ${DS.border}` }}>{p}</span>)}</div>,
          <span style={{ fontSize: 12, color: DS.muted }}>{r.scope}</span>,
        ])} />
      </Card>

      <SAModeModal mode={modeModal} onClose={() => setModeModal(null)} onConfirm={confirmMode} />

      <SAFlagAccountsModal flag={flagTarget} onClose={() => setFlagTarget(null)}
        onSave={(ids) => {
          flagsStore.patch(flagTarget.id, { accountIds: ids });
          saAudit({ action: `Set feature flag "${flagTarget.id}" to ${ids == null ? 'every account' : ids.length + ' account' + (ids.length === 1 ? '' : 's')}`, type: 'flag', target: flagTarget.id });
          setFlagTarget(null);
        }} />

      <Modal open={!!newFlag} onClose={() => setNewFlag(null)} title="New feature flag" icon="settings" iconColor={DS.accent} width={480}
        footer={<>
          <Btn variant="ghost" small onClick={() => setNewFlag(null)}>Cancel</Btn>
          <Btn variant="primary" small icon="check" disabled={!newFlag || !newFlag.key.trim()} onClick={() => {
            const rec = flagsStore.add(newFlag.key, newFlag.desc);
            if (!rec) { setFlash('That flag key is empty or already exists'); return; }
            saAudit({ action: `Created feature flag "${rec.id}" (off)`, type: 'flag', target: rec.id });
            setNewFlag(null); setFlash(`Flag ${rec.id} created — off until you turn it on`);
          }}>Create flag</Btn>
        </>}>
        {newFlag && <>
          <Field label="Key" hint="snake_case — what the code checks, e.g. reports_v2."><Input value={newFlag.key} onChange={e => setNewFlag(f => ({ ...f, key: e.target.value }))} placeholder="e.g. tracking_v2" /></Field>
          <Field label="Description"><Input value={newFlag.desc} onChange={e => setNewFlag(f => ({ ...f, desc: e.target.value }))} placeholder="What turning it on changes" /></Field>
        </>}
      </Modal>

      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORT-SESSION BANNER (persistent while the owner is inside a tenant)
// ═══════════════════════════════════════════════════════════════════════════
const SAImpersonationBanner = () => {
  const [imp, setImp] = React.useState(readImpersonation);
  React.useEffect(() => {
    const sync = () => setImp(readImpersonation());
    window.addEventListener('sa-impersonation', sync);
    window.addEventListener('storage', sync);
    const t = setInterval(sync, 15000);   // count down + end the session at its time box
    return () => { window.removeEventListener('sa-impersonation', sync); window.removeEventListener('storage', sync); clearInterval(t); };
  }, []);
  if (!imp) return null;
  const left = saMinsBetween(new Date().toISOString(), imp.expiresAt);
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1500, background: DS.warning, color: '#fff',
      padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600,
    }}>
      <Icon name="eye" size={15} color="#fff" />
      <span style={{ flex: 1 }}>
        Support session on {imp.accountName} · {imp.supportRef} · {left} min left. This account's admins can see this session and everything done in it.
      </span>
      <button onClick={saImpersonateExit} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>End session</button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  TENANT-SIDE PLATFORM STATE  —  what a centre sees when a switch is on
// ═══════════════════════════════════════════════════════════════════════════
// Maintenance: the app is replaced by MaintenanceScreen (PublicPages.jsx) for
// every tenant session.

// Read-only: the app works, frozen, behind this banner — platform-wide, for a
// listed account, or because the account is suspended.
const SAReadOnlyBanner = ({ accountId }) => {
  const [s] = usePlatformSettings();
  if (s.maintenanceMode || saWritesAllowed(accountId, s)) return null;
  const acct = SA_ACCOUNTS.find(a => a.id === accountId);
  const suspended = acct && acct.status === 'suspended';
  const msg = suspended
    ? `This account is suspended — you can see everything, but changes are turned off. Contact ${BRAND.billingEmail}.`
    : (s.readOnlyNotice || `${BRAND.name} is read-only for now — you can see everything, but changes can’t be saved.`);
  return (
    <div style={{ background: DS.warningBg, borderBottom: `1px solid ${DS.warningBorder}`, color: DS.warning, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
      <Icon name="lock" size={14} color={DS.warning} />
      <span style={{ flex: 1 }}>{msg} Raising a safeguarding concern still works.</span>
      <span style={{ fontSize: 11, fontWeight: 400, color: DS.muted }} title="In production the database refuses the write; the prototype only shows the state.">prototype: saves aren’t blocked here</span>
    </div>
  );
};

// Platform storage as its own owner page (it was a Settings tab): storage is a
// direct cost line and the main abuse vector, so it sits beside System Health.
const SAStoragePage = () => (
  <div style={pageFrame()}>
    <PageHeader title="Storage" subtitle="Platform-wide usage, storage cost against each account’s revenue, and the nightly check against the R2 bucket" />
    {window.StorageOwnerPanel ? <window.StorageOwnerPanel /> : <div style={{ padding: 20, fontSize: 13, color: DS.muted }}>Storage is still loading…</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════════════════

const SuperAdminPages = ({ page }) => {
  switch (page) {
    case 'centres':    return <SACentresPage />;
    case 'users':      return <SAUsersPage />;
    case 'revenue':    return <SARevenuePage />;
    case 'pricing':    return <SAPricingPage />;
    case 'engagement': return <SAEngagementPage />;
    case 'system':     return <SASystemPage />;
    case 'storage':    return <SAStoragePage />;
    case 'support':    return <SASupportPage />;
    case 'security':   return <SASecurityPage />;
    case 'controls':   return <SAControlsPage />;
    default:           return <SuperAdminDashboard />;
  }
};

Object.assign(window, {
  SuperAdminDashboard, SuperAdminPages, SAImpersonationBanner, SAReadOnlyBanner,
  saAudit, useSAAudit, saStartSupportSession, saImpersonateExit, readImpersonation, SAMetrics,
  usePlatformSettings, readPlatformSettings, refreshPlatformSettings, saWritesAllowed, useFeatureFlags, saFlagEnabled, saOwnerAlerts,
  SAHealth, SA_STATUS_ORDER,
});
