// ══════════════════════════════════════════════════════════════
//  Klayo — Platform Owner (Superadmin) console
//  Entity model:  Account (billing tenant) → Centres → Users
// ══════════════════════════════════════════════════════════════
//
//  Data (SA_ACCOUNTS, SA_ROLE_COUNTS, SA_USER_GROWTH, SA_MRR_MOVEMENT,
//  SA_ACTIVITY, SA_FEATURE_USAGE, SA_DEVICE, SA_TICKETS, SA_FAILED_PAYMENTS,
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
  planDistribution: () => getPlans().filter(p => !p.archived).map(p => {
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
//  IMPERSONATION ("Switch View")  —  prototype preview, hardened
// ═══════════════════════════════════════════════════════════════════════════
//  PRODUCTION: impersonation must be time-boxed (auto-expire), scoped to a
//  support ticket, and VISIBLE to the tenant (their own banner + an audit row
//  they can read). This prototype previews the view, shows a persistent owner
//  banner, and records the owner-side audit on enter AND exit.
const SA_IMP_KEY = 'tutoros.impersonation.v1';
const readImpersonation = () => { try { return JSON.parse(localStorage.getItem(SA_IMP_KEY)) || null; } catch (e) { return null; } };
const saImpersonateEnter = (account, asRole = 'Admin') => {
  saAudit({ action: `Entered ${asRole} view of ${account.name}`, type: 'impersonation', target: account.name });
  try { localStorage.setItem(SA_IMP_KEY, JSON.stringify({ accountId: account.id, accountName: account.name, role: asRole, at: Date.now() })); } catch (e) {}
  window.dispatchEvent(new Event('sa-impersonation'));
  if (window.__navigate) window.__navigate('admin', 'dashboard');
};
const saImpersonateExit = () => {
  const imp = readImpersonation();
  if (imp) saAudit({ action: `Exited ${imp.role} view of ${imp.accountName}`, type: 'impersonation', target: imp.accountName });
  try { localStorage.removeItem(SA_IMP_KEY); } catch (e) {}
  window.dispatchEvent(new Event('sa-impersonation'));
  if (window.__navigate) window.__navigate('superadmin', 'centres');
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

const SuperAdminDashboard = () => {
  // Maintenance mode is ONE flag (Platform Controls owns it). This button is a
  // shortcut that mutates the same localStorage flag the toggle reads.
  const [maint, setMaint] = React.useState(() => { try { return localStorage.getItem('tutoros.maintenance') === '1'; } catch (e) { return false; } });
  const setMaintenance = (v) => { try { v ? localStorage.setItem('tutoros.maintenance', '1') : localStorage.removeItem('tutoros.maintenance'); } catch (e) {} setMaint(v); window.dispatchEvent(new Event('sa-maintenance')); };
  const [range, setRange] = React.useState('30d');
  const [flash, setFlash] = React.useState('');

  const mrr = SAMetrics.platformMRR();
  const trend = SAMetrics.mrrTrend();
  const dist = SAMetrics.planDistribution();
  const distTotal = dist.reduce((s, d) => s + d.accounts, 0) || 1;
  const topAccounts = SAMetrics.accountsByMRR().slice(0, 6);

  const kpis = [
    { label: 'Monthly Recurring Revenue', value: `£${mrr.toLocaleString()}`, trend: '+7.3% vs last month', trendDir: 'up', icon: 'invoice', iconBg: DS.accentLight, accent: DS.accent  },
    { label: 'Active Centres',            value: SAMetrics.activeCentres().toString(), trend: '+2 this month', trendDir: 'up', icon: 'book',  iconBg: '#F0F9FF', accent: DS.info },
    { label: 'Total Users',               value: SAMetrics.totalUsers().toLocaleString(), trend: '+167 this month', trendDir: 'up', icon: 'users', iconBg: '#F0FDF4', accent: DS.success },
    { label: 'Churn Rate',                value: `${SAMetrics.churnRate()}%`, trend: '-0.4% vs last month', trendDir: 'up', icon: 'trending_dn', iconBg: '#FFFBEB', accent: DS.warning },
  ];

  // Board pack (period-scoped) → CSV download, audited.
  const exportBoardPack = () => {
    const rows = [
      ['Metric', 'Value', 'Period'],
      ['MRR', `£${mrr}`, range],
      ['ARR', `£${SAMetrics.arr()}`, range],
      ['Active centres', SAMetrics.activeCentres(), range],
      ['Total users', SAMetrics.totalUsers(), range],
      ['Churn rate', `${SAMetrics.churnRate()}%`, range],
      ['New MRR', `£${SAMetrics.newMRR()}`, range],
      ['Churned MRR', `£${SAMetrics.churnedMRR()}`, range],
      ['Open incidents', 0, range],
    ];
    saDownloadCSV('klayo-board-pack.csv', rows);
    saAudit({ action: `Exported board pack (${range})`, type: 'export', target: 'Platform overview' });
    setFlash('Board pack exported (CSV)');
  };

  return (
    <div style={{ padding: '32px', overflow: 'auto' }}>
      <PageHeader
        title="Platform Overview"
        subtitle={`Thursday, 2 July 2026 · ${BRAND.name} Platform`}
        actions={[
          <select key="range" value={range} onChange={e => setRange(e.target.value)} style={{
            padding: '7px 10px', borderRadius: 7, border: `1px solid ${DS.border}`, background: DS.bg,
            color: DS.sub, fontSize: 13, cursor: 'pointer',
          }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="qtd">Quarter to date</option>
          </select>,
          <Btn key="exp" variant="secondary" icon="download" small onClick={exportBoardPack}>Export Report</Btn>,
          <Btn key="alert" variant={maint ? 'danger' : 'secondary'} icon="zap" small onClick={() => setMaintenance(!maint)}>
            {maint ? 'Exit Maintenance' : 'Maintenance Mode'}
          </Btn>,
        ]}
      />

      {maint && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: DS.warningBg, border: `1px solid ${DS.warningBorder}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="alert" size={16} color={DS.warning} />
          <div style={{ flex: 1, fontSize: 13, color: DS.warning, fontWeight: 600 }}>
            Maintenance mode is active — all centre admin dashboards show a banner. Managed in Platform Controls.
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Charts row — trend + KPI both driven by getPlatformMRR() */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Revenue & Growth Trend" actions={[<Badge key="b" variant="accent">Last 8 months</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 2, background: DS.accent, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: DS.muted }}>Platform MRR (£)</span>
              </div>
            </div>
            <LineChart labels={trend.labels} series={[{ label: 'MRR (£)', data: trend.mrr, color: DS.accent }]} height={200} />
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

      {/* Health row (links into System Health) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'API Response', value: '142ms', sub: 'p95 last 1h', dot: DS.success },
          { label: 'Uptime',       value: '99.98%', sub: '30-day rolling', dot: DS.success },
          { label: 'Error Rate',   value: `${SA_SYS.errorRate}%`, sub: '5xx responses', dot: DS.success },
          { label: 'Job Queue',    value: SA_SYS.jobsPending.toString(), sub: 'pending tasks', dot: DS.warning },
        ].map(s => (
          <div key={s.label} onClick={() => window.__navigate && window.__navigate('superadmin', 'system')} style={{
            background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DS.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: DS.faint }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// Shared System-Health constants so Overview + System page read ONE value each.
const SA_SYS = { errorRate: 0.04, jobsPending: 14, uptime30: '99.97%' };

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

  const stats = [
    { label: 'Accounts', value: accounts.length.toString(), sub: `${totalCentres} centres`, color: DS.accent },
    { label: 'Active',   value: activeCount.toString(),      sub: 'billing',                 color: DS.success },
    { label: 'On Trial', value: trialCount.toString(),       sub: 'in evaluation',           color: DS.info },
    { label: 'Past Due / Suspended', value: suspendedCount.toString(), sub: 'billing issues', color: DS.danger },
    { label: 'At Risk',  value: atRiskCount.toString(),      sub: 'see rule',                color: DS.warning, tip: AT_RISK_RULE },
  ];

  const rowMenu = (a) => {
    const items = [
      { label: 'View account', icon: 'eye', onClick: () => setSelected(a) },
      { label: 'Impersonate admin', icon: 'user', onClick: () => saImpersonateEnter(a, 'Admin') },
      { label: 'Change plan', icon: 'invoice', onClick: () => setPlanEdit(a) },
    ];
    if (a.status === 'trial') items.push({ label: 'Extend trial', icon: 'calendar', onClick: () => patch(a.id, { trialEndsAt: '31 Aug 2026' }, { action: `Extended trial for ${a.name}`, type: 'account', target: a.name }) });
    if (a.status === 'suspended') items.push({ label: 'Reactivate', icon: 'check', onClick: () => patch(a.id, { status: 'active' }, { action: `Reactivated ${a.name}`, type: 'account', target: a.name }) });
    else items.push({ label: 'Suspend', icon: 'alert', danger: true, onClick: () => setConfirm({ title: `Suspend ${a.name}?`, body: 'All centre dashboards for this account go read-only until reactivated.', danger: true, ok: 'Suspend', onOk: () => patch(a.id, { status: 'suspended' }, { action: `Suspended ${a.name}`, type: 'account', target: a.name }) }) });
    items.push({ label: 'View invoices', icon: 'invoice', onClick: () => { setFlash('Opening invoices…'); saAudit({ action: `Viewed invoices for ${a.name}`, type: 'account', target: a.name }); } });
    items.push({ label: 'Delete account', icon: 'trash', danger: true, onClick: () => setConfirm({ title: `Delete ${a.name}?`, body: 'Enters a 30-day retention countdown before permanent erasure (GDPR). Recoverable until then.', danger: true, ok: 'Delete', onOk: () => { setAccounts(list => list.filter(x => x.id !== a.id)); setSelected(null); saAudit({ action: `Scheduled deletion of ${a.name} (30-day retention)`, type: 'account', target: a.name }); setFlash('Account scheduled for deletion'); } }) });
    return items;
  };

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Centres"
        subtitle={`${accounts.length} accounts · ${totalCentres} centres · ${atRiskCount} at risk`}
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => {
            // Tenant-scoped, PII-aware export (no student names — counts only).
            const rows = [['Account', 'Owner', 'Plan', 'Centres', 'MRR', 'Status', 'Country']];
            accounts.forEach(a => rows.push([a.name, a.owner, SAMetrics.planName(a.planId), a.centres.length, mrrOf(a), a.status, a.country]));
            saDownloadCSV('klayo-accounts.csv', rows);
            saAudit({ action: `Exported accounts CSV (${accounts.length} accounts)`, type: 'export', target: 'Accounts' });
            setFlash('Accounts exported (CSV)');
          }}>Export CSV</Btn>,
          <Btn key="add" variant="primary" icon="plus" small onClick={() => setWizard(true)}>Onboard Centre</Btn>,
        ]}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} title={s.tip || ''} style={{
            background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '14px 16px',
            cursor: s.tip ? 'help' : 'default',
          }}>
            <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        <Card>
          <Table
            cols={['Account', 'Owner', 'Plan', 'Centres', 'MRR', 'Status', 'Joined', { label: 'Actions', align: 'right' }]}
            rows={filtered.map(a => [
              <div onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.accent }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{a.centres.map(c => c.city).join(', ')}</div>
              </div>,
              <span style={{ fontSize: 13, color: DS.muted }}>{a.owner}</span>,
              <SAPlanPill planId={a.planId} />,
              <span style={{ fontSize: 13, color: DS.sub }}>{a.centres.length}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>£{mrrOf(a).toLocaleString()}</span>,
              <SAStatusPill status={a.status} />,
              <span style={{ fontSize: 12, color: DS.muted }}>{a.createdAt}</span>,
              <RowActionsMenu items={rowMenu(a)} />,
            ])}
          />
        </Card>

        {selected && (
          <Card title={selected.name} actions={[
            <button key="x" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, padding: 0, display: 'flex' }}>
              <Icon name="x" size={16} />
            </button>,
          ]}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Avatar name={selected.name} size={48} color={DS.accent} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: DS.text }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: DS.muted }}>{selected.owner} · {selected.country}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['MRR', `£${mrrOf(selected).toLocaleString()}`],
                  ['Centres', selected.centres.length],
                  ['Students', selected.centres.reduce((s, c) => s + c.students, 0)],
                  ['Teachers', selected.centres.reduce((s, c) => s + c.teachers, 0)],
                ].map(([l, v]) => (
                  <div key={l} style={{ padding: '10px 12px', background: DS.surface, borderRadius: 7, border: `1px solid ${DS.border}` }}>
                    <div style={{ fontSize: 11, color: DS.muted }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 8 }}>Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <SAStatusPill status={selected.status} />
                  <SAPlanPill planId={selected.planId} />
                  <Badge variant={selected.churnRisk === 'low' ? 'success' : selected.churnRisk === 'med' ? 'warning' : 'danger'}>{selected.churnRisk} churn risk</Badge>
                </div>
                {selected.trialEndsAt && <div style={{ fontSize: 11, color: DS.muted, marginTop: 8 }}>Trial ends {selected.trialEndsAt}</div>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 8 }}>Member centres</div>
                {selected.centres.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${DS.border}` }}>
                    <Icon name="book" size={13} color={DS.faint} />
                    <span style={{ flex: 1, fontSize: 12.5, color: DS.sub }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: DS.muted }}>{c.city} · {c.students} students</span>
                  </div>
                ))}
              </div>

              <Divider />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Btn variant="primary" icon="user" onClick={() => saImpersonateEnter(selected, 'Admin')}>Impersonate Admin</Btn>
                <Btn variant="secondary" icon="invoice" onClick={() => setPlanEdit(selected)}>Change Plan</Btn>
                <Btn variant="secondary" icon="invoice" onClick={() => { setFlash('Opening invoices…'); saAudit({ action: `Viewed invoices for ${selected.name}`, type: 'account', target: selected.name }); }}>View Invoices</Btn>
                {selected.status === 'suspended'
                  ? <Btn variant="secondary" icon="check" onClick={() => patch(selected.id, { status: 'active' }, { action: `Reactivated ${selected.name}`, type: 'account', target: selected.name })}>Reactivate</Btn>
                  : <Btn variant="danger" icon="alert" onClick={() => setConfirm({ title: `Suspend ${selected.name}?`, body: 'All centre dashboards go read-only until reactivated.', danger: true, ok: 'Suspend', onOk: () => patch(selected.id, { status: 'suspended' }, { action: `Suspended ${selected.name}`, type: 'account', target: selected.name }) })}>Suspend Account</Btn>}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Onboard-centre wizard — defaults from Settings → Platform Defaults */}
      <OnboardAccountWizard open={wizard} plans={plansStore.plans.filter(p => !p.archived)} onClose={() => setWizard(false)}
        onCreate={(acc) => { setAccounts(list => [acc, ...list]); saAudit({ action: `Onboarded account ${acc.name} (${SAMetrics.planName(acc.planId)})`, type: 'account', target: acc.name }); setFlash(`${acc.name} onboarded`); }} />

      {/* Change-plan modal */}
      <Modal open={!!planEdit} onClose={() => setPlanEdit(null)} title={planEdit ? `Change plan — ${planEdit.name}` : ''} icon="invoice" iconColor={DS.accent} width={440}
        footer={<><Btn variant="ghost" small onClick={() => setPlanEdit(null)}>Cancel</Btn></>}>
        {planEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: DS.muted, marginBottom: 4 }}>Idempotency: a change-plan is keyed by account + target plan so a retried click can't double-charge (production billing provider).</div>
            {plansStore.plans.filter(p => !p.archived).map(p => (
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

// Onboard-account wizard (plan · trial · seats · currency), defaults from
// Settings → Platform Defaults (SETTINGS_STORE) so it matches the tenant path.
const OnboardAccountWizard = ({ open, plans, onClose, onCreate }) => {
  const defaults = (typeof window.saPlatformDefaults === 'function') ? window.saPlatformDefaults() : { planId: 'starter', trialDays: 14, currency: 'GBP' };
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState({ name: '', owner: '', ownerEmail: '', country: 'UK', planId: defaults.planId, trial: true, trialDays: defaults.trialDays, currency: defaults.currency });
  React.useEffect(() => { if (open) { setStep(0); setD({ name: '', owner: '', ownerEmail: '', country: 'UK', planId: defaults.planId, trial: true, trialDays: defaults.trialDays, currency: defaults.currency }); } }, [open]);
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
    <Modal open={open} onClose={onClose} title="Onboard a new account" subtitle="Creates a billing tenant with its first centre." icon="plus" iconColor={DS.accent} width={560}
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
          <Field label="Start as trial">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => upd('trial', !d.trial)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: d.trial ? DS.accent : DS.borderDark, position: 'relative', cursor: 'pointer' }}>
                <span style={{ position: 'absolute', top: 2, left: d.trial ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </button>
              <span style={{ fontSize: 13, color: DS.sub }}>{d.trial ? `${d.trialDays}-day trial, then billed` : 'Bill immediately'}</span>
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

const SAUsersPage = () => {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [bulk, setBulk] = React.useState(false);
  const [flash, setFlash] = React.useState('');

  const counts = SAMetrics.userCounts();       // trusted single source
  const total = SAMetrics.totalUsers();
  const roleColors = { superadmin: DS.accent, admin: SA_CHART_PALETTE[5], teacher: SA_CHART_PALETTE[0], student: SA_CHART_PALETTE[1], parent: SA_CHART_PALETTE[2] };

  // Directory rows derived from accounts (owners as admin users) + a couple of
  // seeded non-admins. Every count above is the trusted tally, not this list.
  const directory = [
    { name: 'Marcus Hale', email: `marcus@${'klayo.io'}`, role: 'superadmin', account: '—', status: 'active', lastSeen: 'Now', joined: 'May 2024', mfa: true },
    ...SA_ACCOUNTS.map(a => ({ name: a.owner, email: a.ownerEmail, role: 'admin', account: a.name, status: a.status === 'suspended' ? 'suspended' : a.status === 'past_due' ? 'locked' : 'active', lastSeen: '—', joined: a.createdAt, mfa: a.churnRisk !== 'high' })),
  ];
  const filtered = directory.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Donut AND bars both read `counts` → they can never disagree.
  const roleRows = [
    { key: 'student', role: 'Students', count: counts.student, color: roleColors.student },
    { key: 'teacher', role: 'Teachers', count: counts.teacher, color: roleColors.teacher },
    { key: 'admin', role: 'Centre Admins', count: counts.admin, color: roleColors.admin },
    { key: 'parent', role: 'Parents', count: counts.parent, color: roleColors.parent },
    { key: 'superadmin', role: 'Superadmins', count: counts.superadmin, color: roleColors.superadmin },
  ];
  const maxRole = Math.max(...roleRows.map(r => r.count));

  const stats = [
    { label: 'Total Users', value: total.toLocaleString(), sub: '+124 this month', color: DS.accent, icon: 'users' },
    { label: 'New Signups (Jun)', value: '124', sub: '+18% vs May', color: DS.success, icon: 'plus' },
    { label: 'Active (30d)', value: Math.round(total * 0.699).toLocaleString(), sub: '69.9% of total', color: DS.info, icon: 'eye' },
    { label: 'Retention (M1)', value: '85.4%', sub: '+2.1% vs cohort', color: SA_CHART_PALETTE[1], icon: 'trending_up' },
    { label: 'MFA Adoption', value: '68.4%', sub: '+4.2% MoM', color: DS.warning, icon: 'shield' },
  ];

  const userMenu = (u) => [
    { label: 'Reset password', icon: 'mail', onClick: () => { saAudit({ action: `Sent password reset to ${u.email}`, type: 'security', target: u.email }); setFlash('Password reset sent'); } },
    { label: 'Revoke sessions', icon: 'x', onClick: () => { saAudit({ action: `Revoked sessions (force logout) for ${u.email}`, type: 'security', target: u.email }); setFlash('Sessions revoked'); } },
    { label: u.mfa ? 'MFA required (on)' : 'Require MFA', icon: 'shield', onClick: () => { saAudit({ action: `Set MFA required for ${u.email}`, type: 'security', target: u.email }); setFlash('MFA requirement updated'); } },
    { label: 'Change role', icon: 'user', onClick: () => setFlash('Role picker (prototype)') },
    { label: 'Suspend user', icon: 'alert', danger: true, onClick: () => { saAudit({ action: `Suspended user ${u.email}`, type: 'security', target: u.email }); setFlash('User suspended'); } },
    { label: 'View audit trail', icon: 'list', onClick: () => window.__navigate && window.__navigate('superadmin', 'security') },
    // AADC: minor-data actions on a user are audited; the drill-down prefers
    // counts over identities where the owner doesn't need the identity.
    { label: 'GDPR export / delete', icon: 'download', onClick: () => { saAudit({ action: `Raised DSAR for ${u.email}`, type: 'export', target: u.email }); window.__navigate && window.__navigate('superadmin', 'security'); } },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Users & Accounts"
        subtitle="Across all accounts on the platform"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => { const rows = [['Name', 'Role', 'Account', 'Status', 'Joined']]; filtered.forEach(u => rows.push([u.name, u.role, u.account, u.status, u.joined])); saDownloadCSV('klayo-users.csv', rows); saAudit({ action: `Exported users CSV (${filtered.length} rows)`, type: 'export', target: 'Users' }); setFlash('Users exported'); }}>Export</Btn>,
          <Btn key="msg" variant="primary" icon="bell" small onClick={() => setBulk(true)}>Bulk Message</Btn>,
        ]}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: s.color + '15', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={s.icon} size={14} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="User Growth & Activity" actions={[<Badge key="b" variant="accent">Last 8 months</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {SA_USER_GROWTH.series.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 2, background: s.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: DS.muted }}>{s.label}</span>
                </div>
              ))}
            </div>
            <LineChart labels={SA_USER_GROWTH.labels} series={SA_USER_GROWTH.series} height={200} />
          </div>
        </Card>

        <Card title="Users by Role">
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <SADonut data={roleRows.map(r => ({ pct: Math.round((r.count / total) * 100), color: r.color }))} size={140} />
            <div style={{ width: '100%' }}>
              {roleRows.map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                  <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{r.role}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Role Breakdown" actions={[<Badge key="b" variant="default">All accounts</Badge>]}>
          <div style={{ padding: '20px' }}>
            {roleRows.map(r => (
              <div key={r.key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: DS.sub }}>{r.role}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.count.toLocaleString()}</span>
                </div>
                <SAHBar pct={(r.count / maxRole) * 100} color={r.color} height={8} />
              </div>
            ))}
          </div>
        </Card>

        {/* Seats used vs licensed — expansion-revenue + enforcement signal */}
        <Card title="Seat Usage by Account" actions={[<Badge key="b" variant="default">Top by fill</Badge>]}>
          <div style={{ padding: '16px 20px' }}>
            {SAMetrics.payingAccounts().map(a => {
              const s = SAMetrics.seatUsage(a).students;
              const pct = s.licensed ? Math.round((s.used / s.licensed) * 100) : 0;
              return { a, s, pct };
            }).sort((x, y) => y.pct - x.pct).slice(0, 6).map(({ a, s, pct }) => (
              <div key={a.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: DS.sub }}>{a.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 90 ? DS.danger : DS.text }}>{s.used}/{s.licensed}</span>
                </div>
                <SAHBar pct={pct} color={pct >= 90 ? DS.danger : pct >= 70 ? DS.warning : DS.success} height={7} />
              </div>
            ))}
            <div style={{ fontSize: 11, color: DS.muted, marginTop: 4 }}>Student seats used vs licensed (plan seats × centres). ≥90% flags an upsell.</div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 12px' }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{ border: 'none', outline: 'none', fontSize: 14, color: DS.text, flex: 1, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['superadmin', 'Owner'], ['admin', 'Admin'], ['teacher', 'Teacher'], ['student', 'Student']].map(([id, label]) => (
            <button key={id} onClick={() => setRoleFilter(id)} style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${roleFilter === id ? DS.accentBorder : DS.border}`,
              background: roleFilter === id ? DS.accentLight : DS.bg, color: roleFilter === id ? DS.accent : DS.muted,
              fontSize: 13, fontWeight: roleFilter === id ? 600 : 400, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <Card>
        <Table
          cols={['User', 'Role', 'Account', 'Status', 'MFA', 'Joined', { label: 'Actions', align: 'right' }]}
          rows={filtered.map(u => [
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{u.name}</div>
              <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{u.email}</div>
            </div>,
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: (roleColors[u.role] || DS.muted) + '20', color: roleColors[u.role] || DS.muted, textTransform: 'capitalize' }}>{u.role}</span>,
            <span style={{ fontSize: 13, color: DS.muted }}>{u.account}</span>,
            <SAStatusPill status={u.status} />,
            u.mfa ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: DS.success }}><Icon name="check" size={12} />On</span> : <span style={{ fontSize: 12, color: DS.faint }}>Off</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{u.joined}</span>,
            <RowActionsMenu items={userMenu(u)} />,
          ])}
        />
      </Card>

      <BulkMessageModal open={bulk} onClose={() => setBulk(false)} onSend={(n) => { saAudit({ action: `Sent bulk message to ${n} recipients (safeguarding-routed)`, type: 'comms', target: 'Users' }); setFlash(`Bulk message queued to ${n} recipients`); }} />
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// Bulk message — audience preview + confirm + rate-limit note + audit; routes
// through the safeguarding-aware comms path (never a raw send).
const BulkMessageModal = ({ open, onClose, onSend }) => {
  const [audience, setAudience] = React.useState('all_admins');
  const [body, setBody] = React.useState('');
  const AUD = {
    all_admins: { label: 'All account admins', count: SA_ACCOUNTS.length },
    active_admins: { label: 'Admins of active accounts', count: SA_ACCOUNTS.filter(a => a.status === 'active').length },
    trial_admins: { label: 'Admins of trial accounts', count: SA_ACCOUNTS.filter(a => a.status === 'trial').length },
    all_teachers: { label: 'All teachers (platform-wide)', count: SA_ROLE_COUNTS.teacher },
  };
  const recip = AUD[audience].count;
  React.useEffect(() => { if (open) { setAudience('all_admins'); setBody(''); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Bulk message" subtitle="One-way, safeguarding-routed. Recipients can raise a monitored request back through their centre." icon="bell" iconColor={DS.accent} width={560}
      footer={<>
        <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="bell" disabled={!body.trim()} onClick={() => { onSend(recip); onClose(); }}>Send to {recip}</Btn>
      </>}>
      <Field label="Audience">
        <Select value={audience} onChange={e => setAudience(e.target.value)}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
      </Field>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, fontSize: 13, color: DS.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="users" size={14} color={DS.accent} /> Audience preview: <b>{recip.toLocaleString()}</b> recipients.
      </div>
      <Field label="Message"><textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Keep it clear and centre-appropriate…" style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1px solid ${DS.border}`, fontSize: 14, color: DS.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} /></Field>
      <div style={{ fontSize: 11, color: DS.muted }}>Rate-limited to 1 platform broadcast / 10 min. Every send is audited.</div>
    </Modal>
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

  const stats = [
    { label: 'MRR', value: `£${mrr.toLocaleString()}`, sub: `+£${SAMetrics.newMRR()} MoM`, color: DS.accent, icon: 'invoice' },
    { label: 'ARR', value: `£${SAMetrics.arr().toLocaleString()}`, sub: '+15.2% YoY', color: SA_CHART_PALETTE[0], icon: 'trending_up' },
    { label: 'New MRR', value: `£${SAMetrics.newMRR().toLocaleString()}`, sub: 'this month', color: DS.success, icon: 'plus' },
    { label: 'Churned MRR', value: `£${SAMetrics.churnedMRR().toLocaleString()}`, sub: 'this month', color: DS.danger, icon: 'trending_dn' },
    { label: 'ARPU', value: `£${SAMetrics.arpu().toLocaleString()}`, sub: 'per account', color: DS.info, icon: 'users' },
    { label: 'NRR', value: `${SAMetrics.nrr()}%`, sub: 'net revenue retention', color: SA_CHART_PALETTE[4], icon: 'zap' },
    { label: 'Failed Payments', value: failed.length.toString(), sub: `£${SAMetrics.failedAtRisk().toLocaleString()} at risk`, color: DS.warning, icon: 'alert' },
  ];

  const txns = SA_TXNS.map(t => ({ ...t, acc: SAMetrics.account(t.accountId) }));

  const mov = SA_MRR_MOVEMENT;
  const maxRev = Math.max(...mov.newMRR, ...mov.churnedMRR) * 1.15;

  const dun = (row, action, note) => { setFailed(list => list.map(f => f.accountId === row.accountId ? { ...f, state: action } : f).filter(f => action !== 'resolved' || f.accountId !== row.accountId)); saAudit(note); setFlash(note.action); };

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Revenue & Subscriptions"
        subtitle="Monetisation across all accounts"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small onClick={() => { const rows = [['Plan', 'Accounts', 'MRR']]; dist.forEach(d => rows.push([d.name, d.accounts, d.mrr])); saDownloadCSV('klayo-revenue.csv', rows); setFlash('Revenue exported'); }}>Export</Btn>,
          <Btn key="plan" variant="primary" icon="invoice" small onClick={() => window.__navigate && window.__navigate('superadmin', 'controls')}>Manage Plans</Btn>,
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '14px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{s.sub}</div>
            </div>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: s.color + '15', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={s.icon} size={12} />
            </div>
          </div>
        ))}
      </div>

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
  const stats = [
    { label: 'DAU', value: '634', sub: '+24 vs yesterday', color: DS.accent, icon: 'users' },
    { label: 'WAU', value: '1,089', sub: '67.1% of MAU', color: SA_CHART_PALETTE[0], icon: 'users' },
    { label: 'MAU', value: '1,620', sub: '+110 this month', color: DS.info, icon: 'trending_up' },
    { label: 'DAU/MAU Ratio', value: '39.1%', sub: 'Good engagement', color: DS.success, icon: 'zap' },
    { label: 'Avg Session', value: '18m 42s', sub: '+1m 12s vs last wk', color: SA_CHART_PALETTE[4], icon: 'eye' },
    { label: 'Sessions / Day', value: '2,841', sub: 'across all centres', color: DS.warning, icon: 'book' },
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

  const SAMPLE = <Badge variant="warning">Sample data — needs analytics events (phase 2)</Badge>;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Platform Engagement"
        subtitle={`How people actually use ${BRAND.name}`}
        actions={[<Btn key="exp" variant="secondary" icon="download" small onClick={() => setFlash('Engagement export (prototype)')}>Export</Btn>]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: s.color + '15', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={s.icon} size={12} /></div>
          </div>
        ))}
      </div>

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
  const [jobs, setJobs] = React.useState([
    { queue: 'Reports', pending: 14, failed: 0, color: DS.warning },
    { queue: 'Email delivery', pending: 3, failed: 1, color: DS.success },
    { queue: 'PDF generation', pending: 0, failed: 0, color: DS.success },
    { queue: 'CSV imports', pending: 2, failed: 0, color: DS.success },
    { queue: 'Webhooks', pending: 1, failed: 0, color: DS.success },
  ]);
  const [statusPageOn, setStatusPageOn] = React.useState(true);

  // Rename to match reality: Settings configures Cloudflare R2, so the health
  // check is "File Storage (R2)", not S3.
  const services = [
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', latency: '142ms' },
    { name: 'Auth Service', status: 'operational', uptime: '99.98%', latency: '88ms' },
    { name: 'Database (primary)', status: 'operational', uptime: '99.99%', latency: '12ms' },
    { name: 'Database (replica)', status: 'operational', uptime: '99.97%', latency: '14ms' },
    { name: 'Redis Cache', status: 'operational', uptime: '99.99%', latency: '2ms' },
    { name: 'Reports Worker', status: 'degraded', uptime: '98.42%', latency: '4.2s' },
    { name: 'Email Service', status: 'operational', uptime: '99.94%', latency: '210ms' },
    { name: 'File Storage (R2)', status: 'operational', uptime: '99.99%', latency: '180ms' },
  ];

  const incidents = [
    { date: '2026-06-26', title: 'Reports Worker latency spike', duration: '34m', severity: 'minor', status: 'resolved' },
    { date: '2026-06-18', title: 'EU region — slow database replicas', duration: '12m', severity: 'minor', status: 'resolved' },
    { date: '2026-06-02', title: 'Payment webhook delivery delays', duration: '1h 8m', severity: 'major', status: 'resolved' },
  ];

  const retryJob = (q) => { setJobs(list => list.map(j => j.queue === q ? { ...j, failed: 0, pending: j.pending + 0 } : j)); saAudit({ action: `Retried failed jobs in "${q}" queue`, type: 'system', target: q }); setFlash(`${q} — failed jobs retried`); };

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="System Health"
        subtitle="Real-time platform status"
        actions={[<Btn key="status" variant="secondary" icon="zap" small onClick={() => { setStatusPageOn(v => !v); setFlash(`Public status page ${statusPageOn ? 'hidden' : 'published'} · ${BRAND.statusDomain}`); }}>{statusPageOn ? 'Status Page: On' : 'Status Page: Off'}</Btn>]}
      />

      <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 10, background: DS.successBg, border: `1px solid ${DS.successBorder}`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: DS.success, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} color="#fff" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.success }}>All Systems Operational</div>
          <div style={{ fontSize: 12, color: DS.success }}>1 service degraded · No active incidents · {BRAND.statusDomain}</div>
        </div>
        <Badge variant="success">{SA_SYS.uptime30} 30-day uptime</Badge>
      </div>

      {/* Single derived error rate (was 0.4% KPI vs 0.04% p-tile) → one value. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Uptime (30d)', value: SA_SYS.uptime30, sub: '9m downtime', color: DS.success, icon: 'zap' },
          { label: 'API Response', value: '124ms', sub: '−3ms vs avg', color: DS.success, icon: 'trending_up' },
          { label: 'Error Rate', value: `${SA_SYS.errorRate}%`, sub: '5xx responses', color: DS.success, icon: 'alert' },
          { label: 'Jobs in Queue', value: jobs.reduce((s, j) => s + j.pending, 0).toString(), sub: '3 pending email', color: DS.info, icon: 'book' },
          { label: 'Storage Used', value: '64%', sub: '2.4 TB / 3.8 TB', color: SA_CHART_PALETTE[4], icon: 'download' },
        ].map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: s.color + '15', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={s.icon} size={12} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'API p50', value: '42ms', color: DS.success, bar: 28 },
          { label: 'API p95', value: '142ms', color: DS.success, bar: 42 },
          { label: 'API p99', value: '480ms', color: DS.warning, bar: 68 },
          { label: 'Error Rate', value: `${SA_SYS.errorRate}%`, color: DS.success, bar: 8 },
        ].map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: DS.muted, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginBottom: 8 }}>{s.value}</div>
            <SAHBar pct={s.bar} color={s.color} height={5} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Service Status">
          <Table pagination={false} cols={['Service', 'Status', 'Uptime', 'Latency']} rows={services.map(s => [
            <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{s.name}</span>,
            <StatusPill status={s.status} dot />,
            <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.uptime}</span>,
            <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.latency}</span>,
          ])} />
        </Card>

        <Card title="Background Jobs">
          <div style={{ padding: '20px' }}>
            {jobs.map((q, i) => (
              <div key={q.queue} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < jobs.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.color }} />
                <div style={{ flex: 1, fontSize: 13, color: DS.text, fontWeight: 500 }}>{q.queue}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{q.pending} pending</div>
                {q.failed > 0 && <button onClick={() => retryJob(q.queue)} style={{ border: 'none', background: DS.dangerBg, color: DS.danger, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="zap" size={11} />{q.failed} failed · retry</button>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Recent Incidents">
        <Table pagination={false} cols={['Date', 'Incident', 'Severity', 'Duration', 'Status']} rows={incidents.map(inc => [
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
//  COMMUNICATIONS → SUPPORT  (embedded as the "Support" section)
// ═══════════════════════════════════════════════════════════════════════════
//  Email deliverability lives here for now (relabelled). FUTURE: this belongs
//  under System Health / Ops — deferred this pass to minimise churn.
const SACommsPage = ({ embedded }) => {
  const [tickets, setTickets] = React.useState(SA_TICKETS);
  const [flash, setFlash] = React.useState('');
  const openCount = tickets.filter(t => t.status === 'open').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  const setStatus = (id, status, verb) => { setTickets(list => list.map(t => t.id === id ? { ...t, status } : t)); saAudit({ action: `${verb} support ticket ${id}`, type: 'support', target: id }); setFlash(`${id} ${verb.toLowerCase()}`); };

  return (
    <div style={{ padding: embedded ? 0 : '32px' }}>
      {!embedded && (
        <PageHeader title="Support" subtitle="Support tickets and email activity across all accounts" />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open Tickets', value: openCount.toString(), sub: `${pendingCount} pending` },
          { label: 'Emails Sent (7d)', value: '14,820', sub: 'delivery 99.4%' },
          { label: 'Avg Resolution', value: '3h 42m', sub: '−18m vs prior' },
          { label: 'Bounce Rate', value: '0.8%', sub: 'within target' },
        ].map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: DS.success, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Support Tickets" actions={[<Badge key="o" variant="warning">{openCount} open</Badge>, <Badge key="p" variant="default">{pendingCount} pending</Badge>]}>
          <Table
            cols={['ID', 'Subject', 'Account', 'Priority', 'Status', 'Assignee', { label: 'Actions', align: 'right' }]}
            rows={tickets.map(t => [
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{t.id}</span>,
              <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{t.subject}</span>,
              <span style={{ fontSize: 12, color: DS.muted }}>{t.centre}</span>,
              <StatusPill tone={t.priority === 'urgent' ? 'negative' : t.priority === 'high' ? 'warning' : 'neutral'}>{t.priority}</StatusPill>,
              <SAStatusPill status={t.status} />,
              <span style={{ fontSize: 12, color: DS.sub }}>{t.assignee}</span>,
              <RowActionsMenu items={[
                { label: 'Reply', icon: 'mail', onClick: () => setStatus(t.id, 'open', 'Replied to') },
                { label: 'Assign to me', icon: 'user', onClick: () => { setTickets(list => list.map(x => x.id === t.id ? { ...x, assignee: 'Marcus H.' } : x)); setFlash(`${t.id} assigned`); } },
                { label: 'Mark resolved', icon: 'check', onClick: () => setStatus(t.id, 'resolved', 'Resolved') },
                { label: 'Escalate', icon: 'alert', danger: true, onClick: () => setStatus(t.id, 'open', 'Escalated') },
              ]} />,
            ])}
          />
        </Card>

        <Card title="Avg Resolution Time">
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: DS.accent }}>3h 42m</div>
              <div style={{ fontSize: 12, color: DS.muted }}>last 30 days · −18m vs prior</div>
            </div>
            <Divider />
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 10 }}>By priority</div>
            {[['Urgent', '38m', 100, DS.danger], ['High', '2h 4m', 76, DS.warning], ['Medium', '6h 12m', 54, DS.info], ['Low', '1d 2h', 28, DS.muted]].map(([p, t, pct, c]) => (
              <div key={p} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: DS.sub }}>{p}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>{t}</span>
                </div>
                <SAHBar pct={pct} color={c} height={5} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Email Deliverability" subtitle="Owner/ops view — belongs under System Health long-term">
        <Table pagination={false} cols={['Email Type', 'Sent (7d)', 'Delivered', 'Opens', 'Clicks', 'Bounces']} rows={[
          ['Welcome', '142', '99.3%', '78.2%', '54.1%', '0.7%'],
          ['Weekly Digest', '8,420', '99.5%', '38.4%', '12.8%', '0.5%'],
          ['Homework Reminder', '4,210', '99.2%', '52.1%', '24.6%', '0.8%'],
          ['Invoice', '892', '99.8%', '88.4%', '62.4%', '0.2%'],
          ['Password Reset', '128', '99.6%', '94.1%', '88.2%', '0.4%'],
          ['Marketing', '1,028', '98.9%', '24.6%', '6.2%', '1.1%'],
        ].map(row => row.map((cell, i) => <span style={{ fontSize: 13, color: i === 0 ? DS.text : DS.sub, fontWeight: i === 0 ? 500 : 400 }}>{cell}</span>))} />
      </Card>
      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SECURITY & AUDIT
// ═══════════════════════════════════════════════════════════════════════════

const SASecurityPage = () => {
  const auditAll = useSAAudit();
  const [suspicious, setSuspicious] = React.useState(SA_SUSPICIOUS);
  const [dsar, setDsar] = React.useState(SA_DSAR);
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
  const fulfilDsar = (id) => { setDsar(list => list.map(d => d.id === id ? { ...d, status: 'fulfilled' } : d)); const rec = dsar.find(d => d.id === id); saAudit({ action: `Fulfilled DSAR (${rec ? rec.kind : ''}) ${id}`, type: 'export', target: rec ? rec.requester : id }); setFlash(`${id} fulfilled`); };

  const openDeadlines = dsar.filter(d => d.status !== 'fulfilled').length;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Security & Audit"
        subtitle="Compliance, access controls, and the audit trail"
        actions={[<Btn key="exp" variant="secondary" icon="download" small onClick={() => {
          const rows = [['Time', 'Actor', 'Action', 'Type', 'Target', 'IP']];
          audit.forEach(a => rows.push([a.ts, a.actor, a.action, a.type, a.target, a.ip]));
          saDownloadCSV('klayo-audit-log.csv', rows);
          saAudit({ action: `Exported audit log (${audit.length} rows)`, type: 'export', target: 'Audit log' });   // exporting is itself audited
          setFlash('Audit log exported');
        }}>Export Audit Log</Btn>]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Failed Logins (24h)', value: '21', color: DS.warning, sub: '3 from new IPs' },
          { label: 'Locked Accounts', value: '2', color: DS.danger, sub: '1 auto-locked' },
          { label: 'Active Sessions', value: '342', color: DS.success, sub: 'across 1,089 users' },
          { label: 'Open DSARs', value: openDeadlines.toString(), color: DS.accent, sub: 'with legal SLA' },
        ].map(s => (
          <div key={s.label} style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: DS.muted, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

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
              { label: 'MFA Adoption', value: '68.4%', icon: 'shield', color: DS.accent },
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
//  PLATFORM CONTROLS
// ═══════════════════════════════════════════════════════════════════════════

const SAControlsPage = () => {
  const [flags, setFlags] = React.useState(SA_FLAGS);
  const [maintenance, setMaintenance] = React.useState(() => { try { return localStorage.getItem('tutoros.maintenance') === '1'; } catch (e) { return false; } });
  const [readOnly, setReadOnly] = React.useState(false);
  const [flagTarget, setFlagTarget] = React.useState(null);   // flag whose targeting is open
  const [flash, setFlash] = React.useState('');

  React.useEffect(() => {
    const sync = () => { try { setMaintenance(localStorage.getItem('tutoros.maintenance') === '1'); } catch (e) {} };
    window.addEventListener('sa-maintenance', sync);
    return () => window.removeEventListener('sa-maintenance', sync);
  }, []);
  const setMaint = (v) => { try { v ? localStorage.setItem('tutoros.maintenance', '1') : localStorage.removeItem('tutoros.maintenance'); } catch (e) {} setMaintenance(v); window.dispatchEvent(new Event('sa-maintenance')); };

  const plansStore = usePlansStore();
  const codesStore = usePlanCodesStore();
  const [planModal, setPlanModal] = React.useState({ open: false, plan: null });
  const [deletePlanTarget, setDeletePlanTarget] = React.useState(null);
  const [codeModal, setCodeModal] = React.useState({ open: false, code: null });
  const [copied, setCopied] = React.useState('');
  const copyCode = c => { try { navigator.clipboard.writeText(c); } catch (e) {} setCopied(c); setTimeout(() => setCopied(''), 1400); };

  const toggleFlag = (id) => setFlags(flags.map(f => f.id === id ? { ...f, on: !f.on } : f));

  const Switch = ({ on, onChange }) => (
    <button onClick={onChange} style={{ width: 36, height: 20, borderRadius: 10, background: on ? DS.accent : DS.borderDark, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </button>
  );

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="Platform Controls" subtitle="Feature flags, plans, roles, and global settings"
        actions={[<Btn key="save" variant="primary" icon="check" small onClick={() => { saAudit({ action: 'Saved platform control changes', type: 'system', target: 'Platform Controls' }); setFlash('Changes saved'); }}>Save Changes</Btn>]} />

      {/* Global toggles — Maintenance is the ONE shared flag (Overview shortcut writes it too). */}
      <Card title="Global Toggles" style={{ marginBottom: 20 }}>
        <div style={{ padding: '8px 0' }}>
          {[
            { label: 'Maintenance Mode', desc: 'Show maintenance banner; block writes', on: maintenance, set: setMaint, danger: true },
            { label: 'Read-only Mode', desc: 'All centres see read-only state', on: readOnly, set: setReadOnly, danger: true },
            { label: 'New Signups', desc: 'Allow new accounts to register', on: true, set: () => {}, danger: false },
            { label: 'Public Status Page', desc: `Status page visible at ${BRAND.statusDomain}`, on: true, set: () => {}, danger: false },
          ].map((t, i, arr) => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none', background: t.on && t.danger ? DS.warningBg : 'transparent' }}>
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

      {/* Feature flags — with per-cohort/per-tenant targeting */}
      <Card title="Feature Flags" actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setFlash('New flag editor (prototype)')}>New Flag</Btn>]} style={{ marginBottom: 20 }}>
        <Table pagination={false} cols={['Flag', 'Description', 'Scope', 'Coverage', 'Targeting', 'Status']} rows={flags.map(f => [
          <code style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', background: DS.surface, padding: '2px 6px', borderRadius: 4, color: DS.accent }}>{f.id}</code>,
          <span style={{ fontSize: 13, color: DS.sub }}>
            {f.desc}
            {f.id === 'monitored_messaging' && <span style={{ display: 'block', fontSize: 11, color: DS.muted, marginTop: 2 }}>Routes through the safeguarding layer — never an unmonitored staff↔student channel.</span>}
          </span>,
          <span style={{ fontSize: 12, color: DS.muted }}>{f.scope}</span>,
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
            <SAHBar pct={parseInt(f.coverage)} color={DS.accent} />
            <span style={{ fontSize: 11, color: DS.muted, minWidth: 36 }}>{f.coverage}</span>
          </div>,
          f.scope === 'global'
            ? <span style={{ fontSize: 12, color: DS.faint }}>All accounts</span>
            : <button onClick={() => setFlagTarget(f)} style={{ fontSize: 12, color: DS.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Manage…</button>,
          <Switch on={f.on} onChange={() => toggleFlag(f.id)} />,
        ])} />
      </Card>

      {/* Plans — canonical catalogue (Section 1). Archived plans keep last config. */}
      <Card title="Plans & Pricing" subtitle="The single source of truth — every screen reads plan name & price from here" actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setPlanModal({ open: true, plan: null })}>New Plan</Btn>]} style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '20px' }}>
          {plansStore.plans.map(plan => {
            const color = saPlanColor(plan.id);
            return (
              <div key={plan.id} style={{ border: `2px solid ${color}33`, borderRadius: 10, padding: 18, background: color + '08', opacity: plan.archived ? 0.62 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{plan.name}</span>
                  {plan.archived ? <Badge variant="default">Archived</Badge> : <Badge variant="default">{plan.maxCentres} centre{plan.maxCentres !== 1 ? 's' : ''}</Badge>}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: DS.text }}>£{plan.price}</span>
                  <span style={{ fontSize: 13, color: DS.muted }}> /mo</span>
                  {plan.archived && <span style={{ fontSize: 11, color: DS.muted, marginLeft: 8 }}>last config</span>}
                </div>
                <div style={{ fontSize: 11, color: DS.muted, marginBottom: 10 }}>Up to {plan.studentSeats} students · {plan.teacherSeats} teachers per centre · {plan.storageGb || 0}GB storage</div>
                <Divider margin="10px 0" />
                {(plan.features || []).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: DS.sub, padding: '3px 0' }}><Icon name="check" size={12} color={color} />{f}</div>
                ))}
                <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" small onClick={() => setPlanModal({ open: true, plan })}>Edit</Btn>
                  {plan.archived
                    ? <Btn variant="ghost" small onClick={() => plansStore.restorePlan(plan.id)}>Restore</Btn>
                    : <Btn variant="ghost" small onClick={() => plansStore.archivePlan(plan.id)}>Archive</Btn>}
                  <Btn variant="ghost" icon="trash" small onClick={() => setDeletePlanTarget(plan)} style={{ marginLeft: 'auto' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Promo & override codes — with guardrails */}
      <Card title="Promo & override codes" subtitle="Give a centre a free trial or discounted price. Every redemption is audited."
        actions={[<Btn key="add" variant="ghost" icon="plus" small onClick={() => setCodeModal({ open: true, code: null })}>New code</Btn>]} style={{ marginBottom: 20 }}>
        <Table pagination={false} cols={['Code', 'Offer', 'Restrict to', 'Redemptions', 'Status', { label: 'Actions', align: 'right' }]} rows={codesStore.codes.map(c => {
          const used = (c.redemptions || []).length;
          const plan = c.planId ? getPlan(c.planId) : null;
          return [
            <button onClick={() => copyCode(c.code)} title="Copy code" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.accent, fontWeight: 600 }}>
              {c.code}<Icon name={copied === c.code ? 'check' : 'copy'} size={12} color={copied === c.code ? DS.success : DS.faint} />
            </button>,
            <div><div style={{ fontSize: 13, color: DS.text }}>{planCodeSummary(c)}</div>{c.note && <div style={{ fontSize: 11, color: DS.muted }}>{c.note}</div>}</div>,
            <span style={{ fontSize: 12, color: DS.muted }}>{plan ? plan.name : 'Any plan'}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>{used}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}</span>,
            <StatusPill status={c.status === 'active' ? 'Active' : 'Disabled'} />,
            <RowActionsMenu items={[
              { label: 'Edit code', icon: 'edit', onClick: () => setCodeModal({ open: true, code: c }) },
              { label: c.status === 'active' ? 'Disable' : 'Enable', icon: c.status === 'active' ? 'x' : 'check', onClick: () => codesStore.setStatus(c.code, c.status === 'active' ? 'disabled' : 'active') },
              { label: 'Delete code', icon: 'trash', danger: true, onClick: () => codesStore.deleteCode(c.code) },
            ]} />,
          ];
        })} />
        {codesStore.codes.length === 0 && <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: DS.muted }}>No override codes yet. Create one to give a centre a free trial or discount.</div>}
        <div style={{ padding: '10px 20px 16px', fontSize: 11, color: DS.muted, borderTop: `1px solid ${DS.border}` }}>Guardrails: every code needs an expiry and a max redemption cap; discounts are bounded; each redemption writes an audit entry.</div>
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

      <PlanEditorModal open={planModal.open} plan={planModal.plan} onClose={() => setPlanModal({ open: false, plan: null })}
        onSave={draft => { if (planModal.plan) plansStore.updatePlan(planModal.plan.id, draft); else plansStore.addPlan(draft); saAudit({ action: `${planModal.plan ? 'Edited' : 'Created'} plan "${draft.name}"`, type: 'plan', target: 'Plans' }); }} />
      <Modal open={!!deletePlanTarget} onClose={() => setDeletePlanTarget(null)} title="Delete plan?" icon="trash" iconColor={DS.danger} width={440}
        footer={<><Btn variant="ghost" small onClick={() => setDeletePlanTarget(null)}>Cancel</Btn>
          <Btn variant="danger" small icon="trash" onClick={() => { plansStore.deletePlan(deletePlanTarget.id); setDeletePlanTarget(null); }}>Delete plan</Btn></>}>
        <p style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, margin: 0 }}>
          This permanently removes the <b>{deletePlanTarget ? deletePlanTarget.name : ''}</b> plan from the catalogue platform-wide. Accounts already on this plan keep their current price, but it can no longer be selected. This can’t be undone — to hide it instead, use <b>Archive</b>.
        </p>
      </Modal>

      <PlanCodeModal open={codeModal.open} code={codeModal.code} plans={plansStore.plans} onClose={() => setCodeModal({ open: false, code: null })}
        onSave={draft => {
          if (codeModal.code) codesStore.updateCode(codeModal.code.code, { kind: draft.kind, value: +draft.value || 0, durationMonths: Math.max(1, +draft.durationMonths || 1), planId: draft.planId || null, maxRedemptions: (draft.maxRedemptions === '' || draft.maxRedemptions == null) ? null : +draft.maxRedemptions, note: draft.note || '' });
          else codesStore.createCode(draft);
          saAudit({ action: `${codeModal.code ? 'Edited' : 'Created'} override code`, type: 'billing', target: 'Promo codes' });
        }} />

      {/* Per-cohort / per-tenant targeting (an "opt-in 34%" flag now shows WHO). */}
      <Modal open={!!flagTarget} onClose={() => setFlagTarget(null)} title={flagTarget ? `Targeting — ${flagTarget.id}` : ''} icon="settings" iconColor={DS.accent} width={520}
        footer={<Btn variant="ghost" small onClick={() => setFlagTarget(null)}>Close</Btn>}>
        {flagTarget && (
          <div>
            <div style={{ fontSize: 13, color: DS.muted, marginBottom: 12 }}>Scope: <b>{flagTarget.scope}</b> · coverage {flagTarget.coverage}. Choose which accounts see this flag.</div>
            {SA_ACCOUNTS.slice(0, 8).map((a, i) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${DS.border}`, fontSize: 13, color: DS.sub, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked={i % 3 === 0} /> {a.name}
                <SAPlanPill planId={a.planId} />
              </label>
            ))}
          </div>
        )}
      </Modal>

      <SAFlash msg={flash} onDone={() => setFlash('')} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  IMPERSONATION BANNER (persistent while previewing a tenant view)
// ═══════════════════════════════════════════════════════════════════════════
const SAImpersonationBanner = () => {
  const [imp, setImp] = React.useState(readImpersonation);
  React.useEffect(() => {
    const sync = () => setImp(readImpersonation());
    window.addEventListener('sa-impersonation', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('sa-impersonation', sync); window.removeEventListener('storage', sync); };
  }, []);
  if (!imp) return null;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1500, background: DS.warning, color: '#fff',
      padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600,
    }}>
      <Icon name="eye" size={15} color="#fff" />
      <span style={{ flex: 1 }}>Viewing as {imp.role} — {imp.accountName}. Actions are audited on the account.</span>
      <button onClick={saImpersonateExit} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Exit</button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════════════════

const SuperAdminPages = ({ page }) => {
  switch (page) {
    case 'centres':    return <SACentresPage />;
    case 'users':      return <SAUsersPage />;
    case 'revenue':    return <SARevenuePage />;
    case 'engagement': return <SAEngagementPage />;
    case 'system':     return <SASystemPage />;
    // Communications is normally intercepted in index.html and routed to the
    // shared CommunicationsPage (platform-scoped), which embeds SACommsPage as
    // its "Support" section. This case is a safety net.
    case 'comms':      return <SACommsPage />;
    case 'security':   return <SASecurityPage />;
    case 'controls':   return <SAControlsPage />;
    default:           return <SuperAdminDashboard />;
  }
};

Object.assign(window, {
  SuperAdminDashboard, SuperAdminPages, SACommsPage, SAImpersonationBanner,
  saAudit, useSAAudit, saImpersonateEnter, saImpersonateExit, readImpersonation, SAMetrics,
});
