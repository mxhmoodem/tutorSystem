// ══════════════════════════════════════════════════════════════
//  TutorOS — SuperAdmin (Platform Owner) Dashboard
//  Multi-tenant view: each tuition centre is a tenant
// ══════════════════════════════════════════════════════════════

// ─── Mock Data ───────────────────────────────────────────────────────────────

const SA_CENTRES = [
  { name: 'Bright Minds Tuition',   owner: 'Lisa Chen',          plan: 'Scale',      mrr: 1240, students: 142, teachers: 8,  status: 'active',    joined: 'Aug 2024', country: 'UK', city: 'London',     usage: 94, churnRisk: 'low'    },
  { name: 'Apex Learning Centre',   owner: 'Daniel Mehta',       plan: 'Scale',      mrr: 1240, students: 198, teachers: 11, status: 'active',    joined: 'Jun 2024', country: 'UK', city: 'Manchester', usage: 88, churnRisk: 'low'    },
  { name: 'Summit Academy',        owner: 'Helen Yoo',          plan: 'Growth',     mrr: 480,  students: 76,  teachers: 5,  status: 'active',    joined: 'Nov 2024', country: 'UK', city: 'Birmingham', usage: 71, churnRisk: 'med'    },
  { name: 'Kingsway Tutors',       owner: 'Marcus Webb',        plan: 'Growth',     mrr: 480,  students: 68,  teachers: 4,  status: 'active',    joined: 'Jan 2025', country: 'UK', city: 'Leeds',      usage: 82, churnRisk: 'low'    },
  { name: 'EduFirst',              owner: 'Priya Nair',         plan: 'Starter',    mrr: 180,  students: 32,  teachers: 2,  status: 'active',    joined: 'Feb 2025', country: 'UK', city: 'Bristol',    usage: 64, churnRisk: 'med'    },
  { name: 'Acorn Study Centre',    owner: 'David Park',         plan: 'Starter',    mrr: 180,  students: 24,  teachers: 2,  status: 'active',    joined: 'Mar 2025', country: 'UK', city: 'Cardiff',    usage: 41, churnRisk: 'high'   },
  { name: 'Pinnacle Prep',         owner: 'Jonathan Reeves',    plan: 'Scale',      mrr: 1240, students: 167, teachers: 9,  status: 'active',    joined: 'May 2024', country: 'IE', city: 'Dublin',     usage: 92, churnRisk: 'low'    },
  { name: 'NorthStar Tuition',     owner: 'Aisha Begum',        plan: 'Growth',     mrr: 480,  students: 89,  teachers: 6,  status: 'active',    joined: 'Sep 2024', country: 'UK', city: 'Edinburgh',  usage: 79, churnRisk: 'low'    },
  { name: 'BrightPath Learning',   owner: 'Carlos Rivera',      plan: 'Growth',     mrr: 480,  students: 54,  teachers: 4,  status: 'trial',     joined: 'Apr 2026', country: 'ES', city: 'Madrid',     usage: 22, churnRisk: 'med'    },
  { name: 'Mind & Method',         owner: 'Sofia Andersson',    plan: 'Scale',      mrr: 1240, students: 134, teachers: 7,  status: 'active',    joined: 'Jul 2024', country: 'SE', city: 'Stockholm',  usage: 86, churnRisk: 'low'    },
  { name: 'Elite Academy',         owner: 'Faisal Ahmed',       plan: 'Growth',     mrr: 480,  students: 47,  teachers: 3,  status: 'past_due',  joined: 'Dec 2024', country: 'AE', city: 'Dubai',      usage: 18, churnRisk: 'high'   },
  { name: 'Lumen Tutors',          owner: 'Beatrice Schmidt',   plan: 'Starter',    mrr: 180,  students: 19,  teachers: 1,  status: 'suspended', joined: 'Oct 2024', country: 'DE', city: 'Berlin',     usage: 0,  churnRisk: 'high'   },
];

const SA_USERS = [
  { name: 'Marcus Hale',      email: 'marcus@tutoros.io',          role: 'superadmin', centre: '—',                       status: 'active',    lastSeen: 'Now',         joined: 'May 2024', mfa: true  },
  { name: 'Lisa Chen',        email: 'lisa@brightminds.co.uk',     role: 'admin',      centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '2m ago',      joined: 'Aug 2024', mfa: true  },
  { name: 'Sarah Clarke',     email: 'sarah.c@brightminds.co.uk',  role: 'teacher',    centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '12m ago',     joined: 'Sep 2024', mfa: true  },
  { name: 'Daniel Mehta',     email: 'd.mehta@apex.uk',            role: 'admin',      centre: 'Apex Learning Centre',    status: 'active',    lastSeen: '1h ago',      joined: 'Jun 2024', mfa: false },
  { name: 'Oliver Chen',      email: 'oliver.c@brightminds.co.uk', role: 'student',    centre: 'Bright Minds Tuition',    status: 'active',    lastSeen: '3h ago',      joined: 'Sep 2024', mfa: false },
  { name: 'Helen Yoo',        email: 'helen@summit.ac.uk',         role: 'admin',      centre: 'Summit Academy',          status: 'active',    lastSeen: 'Yesterday',   joined: 'Nov 2024', mfa: true  },
  { name: 'Beatrice Schmidt', email: 'b@lumen.de',                 role: 'admin',      centre: 'Lumen Tutors',            status: 'suspended', lastSeen: '23 days ago', joined: 'Oct 2024', mfa: false },
  { name: 'Priya Nair',       email: 'priya@edufirst.uk',          role: 'admin',      centre: 'EduFirst',                status: 'active',    lastSeen: '4h ago',      joined: 'Feb 2025', mfa: true  },
  { name: 'Faisal Ahmed',     email: 'faisal@elite.ae',            role: 'admin',      centre: 'Elite Academy',           status: 'locked',    lastSeen: '2 days ago',  joined: 'Dec 2024', mfa: false },
];

const SA_REVENUE_TREND = {
  labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'MRR (£)',     data: [4820, 5240, 5680, 6120, 6450, 6920], color: '#7C3AED' },
    { label: 'New centres', data: [2, 3, 2, 4, 3, 5],                    color: '#0891B2' },
  ],
};

const SA_USER_GROWTH = {
  labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  series: [
    { label: 'Total users', data: [842, 968, 1124, 1287, 1456, 1623], color: '#0891B2' },
    { label: 'DAU',         data: [312, 358, 421, 487, 542, 612],     color: '#16A34A' },
  ],
};

const SA_ACTIVITY = [
  { type: 'signup',   text: 'New centre "BrightPath Learning" started Growth trial',                 time: '14m ago',  severity: 'info'    },
  { type: 'upgrade',  text: 'Apex Learning Centre upgraded from Growth → Scale',                     time: '2h ago',   severity: 'success' },
  { type: 'payment',  text: 'Payment failed: Elite Academy (£480, retry in 3 days)',                 time: '4h ago',   severity: 'warning' },
  { type: 'signup',   text: 'New admin user registered at Pinnacle Prep',                            time: '6h ago',   severity: 'info'    },
  { type: 'flag',     text: 'Suspicious login attempt blocked for faisal@elite.ae (12 attempts)',    time: '8h ago',   severity: 'danger'  },
  { type: 'cancel',   text: 'Lumen Tutors suspended (non-payment, 23 days overdue)',                 time: 'Yesterday', severity: 'danger' },
  { type: 'support',  text: 'New support ticket #4821 — "Cannot import student CSV"',                time: 'Yesterday', severity: 'info'   },
  { type: 'upgrade',  text: 'Bright Minds Tuition added 14 new student seats',                       time: '2 days ago', severity: 'success'},
];

const SA_FEATURE_USAGE = [
  { feature: 'Lesson Planner',  pct: 87, trend: '+4%',  color: '#7C3AED' },
  { feature: 'AI Feedback',     pct: 73, trend: '+12%', color: '#0891B2' },
  { feature: 'Homework System', pct: 91, trend: '+1%',  color: '#16A34A' },
  { feature: 'Progress Reports',pct: 64, trend: '+8%',  color: '#D97706' },
  { feature: 'Parent Portal',   pct: 52, trend: '-3%',  color: '#DB2777' },
  { feature: 'Tracking',        pct: 41, trend: '+6%',  color: '#0D9488' },
];

const SA_GEOGRAPHIC = [
  { country: 'United Kingdom', flag: '🇬🇧', centres: 8, users: 1124, revenue: 5400 },
  { country: 'Ireland',        flag: '🇮🇪', centres: 1, users: 167,  revenue: 1240 },
  { country: 'Sweden',         flag: '🇸🇪', centres: 1, users: 134,  revenue: 1240 },
  { country: 'Spain',          flag: '🇪🇸', centres: 1, users: 54,   revenue: 480  },
  { country: 'Germany',        flag: '🇩🇪', centres: 1, users: 19,   revenue: 0    },
  { country: 'UAE',            flag: '🇦🇪', centres: 1, users: 47,   revenue: 0    },
];

const SA_DEVICE = [
  { device: 'Desktop', pct: 58, color: '#7C3AED' },
  { device: 'Mobile',  pct: 31, color: '#0891B2' },
  { device: 'Tablet',  pct: 11, color: '#0D9488' },
];

const SA_TICKETS = [
  { id: '#4821', subject: 'Cannot import student CSV', centre: 'Apex Learning Centre',  priority: 'high',   status: 'open',     opened: '4h ago',  assignee: 'Marcus H.' },
  { id: '#4820', subject: 'Stripe webhook timing out', centre: 'Bright Minds Tuition',  priority: 'urgent', status: 'open',     opened: '8h ago',  assignee: 'Marcus H.' },
  { id: '#4819', subject: 'Question about Scale plan', centre: 'Summit Academy',        priority: 'low',    status: 'pending',  opened: '1d ago',  assignee: 'Support'   },
  { id: '#4818', subject: 'Bulk export request',       centre: 'Pinnacle Prep',         priority: 'med',    status: 'open',     opened: '1d ago',  assignee: 'Marcus H.' },
  { id: '#4817', subject: 'AI feedback rate limit',    centre: 'Mind & Method',         priority: 'med',    status: 'resolved', opened: '2d ago',  assignee: 'Support'   },
  { id: '#4816', subject: 'GDPR export request',       centre: 'EduFirst',              priority: 'high',   status: 'pending',  opened: '3d ago',  assignee: 'Compliance'},
];

const SA_AUDIT = [
  { actor: 'Marcus Hale',   action: 'Suspended centre "Lumen Tutors"',         target: 'Lumen Tutors',         time: '2h ago',   ip: '82.14.21.5'  },
  { actor: 'Marcus Hale',   action: 'Toggled feature flag "ai_feedback_v2"',   target: 'Global',               time: '5h ago',   ip: '82.14.21.5'  },
  { actor: 'System',        action: 'Auto-locked account after 12 failures',   target: 'faisal@elite.ae',      time: '8h ago',   ip: 'auto'        },
  { actor: 'Marcus Hale',   action: 'Granted Scale plan trial extension',     target: 'BrightPath Learning',   time: 'Yesterday', ip: '82.14.21.5' },
  { actor: 'Lisa Chen',     action: 'Bulk-exported 142 student records',       target: 'Bright Minds Tuition', time: 'Yesterday', ip: '92.40.118.3'},
  { actor: 'Marcus Hale',   action: 'Edited pricing plan "Growth"',            target: 'Plans',                time: '2 days ago', ip: '82.14.21.5'},
  { actor: 'Daniel Mehta',  action: 'Invited 3 new teachers',                  target: 'Apex Learning Centre', time: '2 days ago', ip: '203.0.45.9'},
];

const SA_FLAGS = [
  { id: 'ai_feedback_v2',     desc: 'New AI feedback model (Claude 4.7)',   on: true,  scope: 'global',         coverage: '100%' },
  { id: 'lesson_planner_beta',desc: 'Drag-and-drop lesson planner v2',       on: true,  scope: 'opt-in',         coverage: '34%'  },
  { id: 'parent_payments',    desc: 'Parents pay invoices in-app',           on: false, scope: 'Scale only',     coverage: '0%'   },
  { id: 'multi_currency',     desc: 'Currency support beyond GBP',           on: true,  scope: 'global',         coverage: '100%' },
  { id: 'gradebook_export',   desc: 'Excel gradebook export',                on: true,  scope: 'global',         coverage: '100%' },
  { id: 'hw_ai_grading',      desc: 'Auto-grade homework with AI',           on: false, scope: 'beta cohort',    coverage: '8%'   },
];

// ─── Shared SuperAdmin Components ────────────────────────────────────────────

const SA_ACCENT = '#7C3AED';
const SA_ACCENT_LIGHT = '#F5F3FF';
const SA_ACCENT_BORDER = '#DDD6FE';

const SAStatusPill = ({ status }) => {
  const map = {
    active:    { bg: DS.successBg, color: DS.success, label: 'Active' },
    trial:     { bg: DS.infoBg,    color: DS.info,    label: 'Trial' },
    past_due:  { bg: DS.warningBg, color: DS.warning, label: 'Past Due' },
    suspended: { bg: DS.dangerBg,  color: DS.danger,  label: 'Suspended' },
    locked:    { bg: DS.dangerBg,  color: DS.danger,  label: 'Locked' },
    pending:   { bg: DS.warningBg, color: DS.warning, label: 'Pending' },
    open:      { bg: DS.infoBg,    color: DS.info,    label: 'Open' },
    resolved:  { bg: DS.successBg, color: DS.success, label: 'Resolved' },
  };
  const v = map[status] || map.active;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      background: v.bg, color: v.color, fontSize: 11, fontWeight: 600,
    }}>{v.label}</span>
  );
};

const SAPlanPill = ({ plan }) => {
  const map = {
    Starter: { bg: '#F3F4F6', color: DS.muted },
    Growth:  { bg: '#DBEAFE', color: '#1E40AF' },
    Scale:   { bg: '#F5F3FF', color: SA_ACCENT },
  };
  const v = map[plan] || map.Starter;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      background: v.bg, color: v.color, fontSize: 11, fontWeight: 600,
    }}>{plan}</span>
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
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill={DS.text}>{total}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill={DS.muted}>total</text>
    </svg>
  );
};

// Simple horizontal bar
const SAHBar = ({ pct, color, height = 6 }) => (
  <div style={{ height, background: DS.surface, borderRadius: height / 2, overflow: 'hidden', flex: 1 }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.3s' }} />
  </div>
);

// World-map-ish region grid (SVG simplified)
const SARegionMap = ({ regions }) => {
  const max = Math.max(...regions.map(r => r.users));
  return (
    <div style={{ padding: '4px 0' }}>
      {regions.map((r, i) => (
        <div key={r.country} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          borderBottom: i < regions.length - 1 ? `1px solid ${DS.border}` : 'none',
        }}>
          <span style={{ fontSize: 20 }}>{r.flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{r.country}</div>
            <div style={{ fontSize: 11, color: DS.muted }}>{r.centres} centre{r.centres !== 1 ? 's' : ''} · £{r.revenue}/mo</div>
          </div>
          <div style={{ minWidth: 50, textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.users}</div>
            <div style={{ fontSize: 10, color: DS.muted }}>users</div>
          </div>
          <div style={{ width: 80 }}>
            <SAHBar pct={(r.users / max) * 100} color={SA_ACCENT} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

const SuperAdminDashboard = () => {
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const totalMRR = SA_CENTRES.filter(c => c.status === 'active' || c.status === 'past_due').reduce((a, c) => a + c.mrr, 0);
  const activeCentres = SA_CENTRES.filter(c => c.status === 'active').length;
  const totalUsers = SA_USERS.length + 1610;
  const churnRate = 2.4;

  const kpis = [
    { label: 'Monthly Recurring Revenue', value: `£${totalMRR.toLocaleString()}`, trend: '+7.3% vs last month', trendDir: 'up',   icon: 'invoice', iconBg: SA_ACCENT_LIGHT, accent: SA_ACCENT  },
    { label: 'Active Centres',            value: activeCentres.toString(),         trend: '+2 this month',       trendDir: 'up',   icon: 'book',    iconBg: '#F0F9FF',        accent: DS.info    },
    { label: 'Total Users',               value: totalUsers.toLocaleString(),      trend: '+167 this week',      trendDir: 'up',   icon: 'users',   iconBg: '#F0FDF4',        accent: DS.success },
    { label: 'Churn Rate',                value: `${churnRate}%`,                  trend: '-0.4% vs last month', trendDir: 'up',   icon: 'trending_dn', iconBg: '#FFFBEB',    accent: DS.warning },
  ];

  return (
    <div style={{ padding: '32px', overflow: 'auto' }}>
      <PageHeader
        title="Platform Overview"
        subtitle="Wednesday, 29 April 2026 · TutorOS Platform"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export Report</Btn>,
          <Btn key="alert" variant={maintenanceMode ? 'danger' : 'secondary'} icon="zap" small onClick={() => setMaintenanceMode(!maintenanceMode)}>
            {maintenanceMode ? 'Exit Maintenance' : 'Maintenance Mode'}
          </Btn>,
        ]}
      />

      {maintenanceMode && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: DS.warningBg, border: `1px solid ${DS.warningBorder}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="alert" size={16} color={DS.warning} />
          <div style={{ flex: 1, fontSize: 13, color: DS.warning, fontWeight: 600 }}>
            Maintenance mode is active — all centre admin dashboards will display a banner.
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Revenue & Growth Trend" actions={[<Badge key="b" variant="accent">Last 6 months</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {SA_REVENUE_TREND.series.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 2, background: s.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: DS.muted }}>{s.label}</span>
                </div>
              ))}
            </div>
            <LineChart labels={SA_REVENUE_TREND.labels} series={SA_REVENUE_TREND.series} height={200} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
            {[
              ['£82,400', 'ARR', SA_ACCENT],
              ['£612', 'Avg ARPU', '#0891B2'],
              ['£4,820', 'LTV (24mo)', '#16A34A'],
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
            <SADonut data={[
              { pct: 33, color: SA_ACCENT },
              { pct: 42, color: '#0891B2' },
              { pct: 25, color: '#9CA3AF' },
            ]} size={140} />
            <div style={{ width: '100%' }}>
              {[
                ['Scale',   33, '4 centres', SA_ACCENT],
                ['Growth',  42, '5 centres', '#0891B2'],
                ['Starter', 25, '3 centres', '#9CA3AF'],
              ].map(([p, pct, n, c]) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                  <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{p}</span>
                  <span style={{ fontSize: 12, color: DS.muted }}>{n}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: DS.text, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top centres + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Top Centres by Revenue" actions={[<Btn key="v" variant="ghost" icon="eye" small>View all</Btn>]}>
          <Table
            cols={['Centre', 'Plan', 'Students', 'MRR', 'Usage', 'Risk']}
            rows={[...SA_CENTRES].sort((a, b) => b.mrr - a.mrr).slice(0, 6).map(c => [
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={c.name} size={28} color={SA_ACCENT} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: DS.muted }}>{c.city}, {c.country}</div>
                </div>
              </div>,
              <SAPlanPill plan={c.plan} />,
              <span style={{ fontSize: 13, color: DS.sub }}>{c.students}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>£{c.mrr}</span>,
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SAHBar pct={c.usage} color={c.usage >= 70 ? DS.success : c.usage >= 40 ? DS.warning : DS.danger} />
                <span style={{ fontSize: 11, color: DS.muted, minWidth: 28 }}>{c.usage}%</span>
              </div>,
              <SAChurnDot risk={c.churnRisk} />,
            ])}
          />
        </Card>

        <Card title="Real-time Activity" actions={[<Badge key="b" variant="success">Live</Badge>]}>
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {SA_ACTIVITY.map((a, i) => {
              const colorMap = { info: DS.info, success: DS.success, warning: DS.warning, danger: DS.danger };
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                  borderBottom: i < SA_ACTIVITY.length - 1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, background: colorMap[a.severity], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: DS.sub, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Health row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'API Response', value: '142ms', sub: 'p95 last 1h', dot: DS.success },
          { label: 'Uptime',       value: '99.98%', sub: '30-day rolling', dot: DS.success },
          { label: 'Error Rate',   value: '0.04%', sub: '5xx responses',   dot: DS.success },
          { label: 'Job Queue',    value: '14',     sub: 'pending tasks',   dot: DS.warning },
        ].map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
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
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  CENTRES PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SACentresPage = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  const filtered = SA_CENTRES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.owner.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter || (filter === 'risk' && c.churnRisk === 'high');
    return matchSearch && matchFilter;
  });

  const totalCentres = SA_CENTRES.length;
  const activeCentres = SA_CENTRES.filter(c => c.status === 'active').length;
  const trialCentres = SA_CENTRES.filter(c => c.status === 'trial').length;
  const newSignups = SA_CENTRES.filter(c => /Apr|Mar/.test(c.joined)).length;
  const suspendedCount = SA_CENTRES.filter(c => c.status === 'suspended' || c.status === 'past_due').length;
  const atRiskCount = SA_CENTRES.filter(c => c.churnRisk === 'high').length;

  const centreStats = [
    { label: 'Total Centres', value: totalCentres.toString(),    sub: `${activeCentres} active`,      color: SA_ACCENT  },
    { label: 'New Signups',   value: newSignups.toString(),       sub: 'last 60 days',                 color: DS.success },
    { label: 'On Trial',      value: trialCentres.toString(),     sub: 'in evaluation',                color: DS.info    },
    { label: 'Suspended',     value: suspendedCount.toString(),   sub: 'payment / ToS issues',         color: DS.danger  },
    { label: 'At Risk',       value: atRiskCount.toString(),      sub: 'high churn risk',              color: DS.warning },
  ];

  const atRiskList = [
    { name: 'Elite Academy',     reason: 'Payment failed 3× · 26 Apr',           tag: 'Suspended',    variant: 'danger'  },
    { name: 'Lumen Tutors',      reason: 'TOS violation reported · 24 Apr',     tag: 'Under review', variant: 'warning' },
    { name: 'Smart Tutors Ltd',  reason: 'Card expired · 27 Apr',                tag: 'Suspended',    variant: 'danger'  },
    { name: 'The Study Nook',    reason: 'Inactive 60+ days · 15 Apr',           tag: 'At-risk',      variant: 'warning' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Centres"
        subtitle={`${SA_CENTRES.length} tenants · ${activeCentres} active · ${atRiskCount} churn risk`}
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export CSV</Btn>,
          <Btn key="add" variant="primary" icon="plus" small>Onboard Centre</Btn>,
        ]}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {centreStats.map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Suspended / At-risk strip */}
      <Card title="Suspended / At-Risk Accounts" actions={[<Badge key="b" variant="warning">{atRiskList.filter(a => a.variant === 'danger').length} suspended</Badge>]} style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {atRiskList.map((a, i) => (
            <div key={a.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              borderRight: i < atRiskList.length - 1 ? `1px solid ${DS.border}` : 'none',
            }}>
              <Avatar name={a.name} size={32} color={a.variant === 'danger' ? DS.danger : DS.warning} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.reason}</div>
              </div>
              <Badge variant={a.variant}>{a.tag}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 12px',
        }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search centres, owners or cities…"
            style={{ border: 'none', outline: 'none', fontSize: 14, color: DS.text, flex: 1, background: 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['active', 'Active'], ['trial', 'Trial'], ['past_due', 'Past Due'], ['suspended', 'Suspended'], ['risk', 'At Risk']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${filter === id ? SA_ACCENT_BORDER : DS.border}`,
              background: filter === id ? SA_ACCENT_LIGHT : DS.bg,
              color: filter === id ? SA_ACCENT : DS.muted,
              fontSize: 13, fontWeight: filter === id ? 600 : 400, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        <Card>
          <Table
            cols={['Centre', 'Owner', 'Plan', 'Students', 'Teachers', 'MRR', 'Status', 'Joined', 'Actions']}
            rows={filtered.map(c => [
              <div onClick={() => setSelected(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Avatar name={c.name} size={30} color={SA_ACCENT} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: DS.muted }}>{c.city}, {c.country}</div>
                </div>
              </div>,
              <span style={{ fontSize: 13, color: DS.muted }}>{c.owner}</span>,
              <SAPlanPill plan={c.plan} />,
              <span style={{ fontSize: 13, color: DS.sub }}>{c.students}</span>,
              <span style={{ fontSize: 13, color: DS.sub }}>{c.teachers}</span>,
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>£{c.mrr}</span>,
              <SAStatusPill status={c.status} />,
              <span style={{ fontSize: 12, color: DS.muted }}>{c.joined}</span>,
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="secondary" small onClick={() => setSelected(c)}>View</Btn>
                <Btn variant="ghost" icon="message" small>Message</Btn>
              </div>,
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
                <Avatar name={selected.name} size={48} color={SA_ACCENT} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: DS.text }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: DS.muted }}>{selected.owner} · {selected.city}, {selected.country}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['MRR',       `£${selected.mrr}`],
                  ['Students',  selected.students],
                  ['Teachers',  selected.teachers],
                  ['Usage',     `${selected.usage}%`],
                ].map(([l, v]) => (
                  <div key={l} style={{
                    padding: '10px 12px', background: DS.surface, borderRadius: 7,
                    border: `1px solid ${DS.border}`,
                  }}>
                    <div style={{ fontSize: 11, color: DS.muted }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 8 }}>Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <SAStatusPill status={selected.status} />
                  <SAPlanPill plan={selected.plan} />
                  <Badge variant={selected.churnRisk === 'low' ? 'success' : selected.churnRisk === 'med' ? 'warning' : 'danger'}>
                    {selected.churnRisk} churn risk
                  </Badge>
                </div>
              </div>

              <Divider />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Btn variant="primary" icon="eye">Impersonate Admin</Btn>
                <Btn variant="secondary" icon="message">Send Message</Btn>
                <Btn variant="secondary" icon="invoice">View Invoices</Btn>
                <Btn variant="danger" icon="alert">Suspend Centre</Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  USERS PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SAUsersPage = () => {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const filtered = SA_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleColors = {
    superadmin: SA_ACCENT,
    admin:      DS.accent,
    teacher:    '#0891B2',
    student:    '#16A34A',
  };

  const stats = [
    { label: 'Total Users',     value: '1,847',  sub: '+124 this month',  color: SA_ACCENT,  icon: 'users' },
    { label: 'New Signups (Apr)', value: '124',  sub: '+18% vs Mar',      color: DS.success, icon: 'plus'  },
    { label: 'Active (30d)',    value: '1,291',  sub: '69.9% of total',   color: DS.info,    icon: 'eye'   },
    { label: 'Retention (M1)',  value: '85.4%',  sub: '+2.1% vs cohort',  color: '#16A34A',  icon: 'trending_up' },
    { label: 'Churn Rate',      value: '3.2%',   sub: '−0.4% vs last mo', color: DS.warning, icon: 'trending_dn' },
  ];

  const roleData = [
    { role: 'Students',     count: 1124, color: '#16A34A' },
    { role: 'Teachers',     count: 487,  color: '#0891B2' },
    { role: 'Admins',       count: 214,  color: SA_ACCENT },
    { role: 'Super',        count: 22,   color: '#D97706' },
  ];
  const roleTotal = roleData.reduce((a, b) => a + b.count, 0);

  const atRiskUsers = [
    { name: 'PeakPerf Tutors',   reason: 'Payment failed 3× · 26 Apr',         tag: 'Suspended',    variant: 'danger'  },
    { name: 'Learning Tree',     reason: 'TOS violation reported · 24 Apr',    tag: 'Under review', variant: 'warning' },
    { name: 'Smart Tutors Ltd',  reason: 'Card expired · 27 Apr',              tag: 'Suspended',    variant: 'danger'  },
    { name: 'The Study Nook',    reason: 'Inactive 60+ days · 15 Apr',         tag: 'At-risk',      variant: 'warning' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Users & Accounts"
        subtitle={`Across all centres on the platform`}
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export</Btn>,
          <Btn key="msg" variant="primary" icon="bell" small>Bulk Message</Btn>,
        ]}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: s.color + '15', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={s.icon} size={14} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="User Growth & Activity" actions={[<Badge key="b" variant="accent">Last 6 months</Badge>]}>
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
            <SADonut data={roleData.map(r => ({ pct: Math.round((r.count / roleTotal) * 100), color: r.color }))} size={140} />
            <div style={{ width: '100%' }}>
              {roleData.map(r => (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
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
        <Card title="Role Breakdown" actions={[<Badge key="b" variant="default">All centres</Badge>]}>
          <div style={{ padding: '20px' }}>
            {[
              ['Students',     1342, '#16A34A'],
              ['Teachers',      198, '#0891B2'],
              ['Centre Admins',  82, DS.accent],
              ['SuperAdmins',     1, SA_ACCENT],
            ].map(([role, count, color]) => (
              <div key={role} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: DS.sub }}>{role}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{count.toLocaleString()}</span>
                </div>
                <SAHBar pct={(count / 1342) * 100} color={color} height={8} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Suspended / At-Risk Accounts" actions={[<Badge key="b" variant="warning">3 suspended</Badge>]}>
          <div>
            {atRiskUsers.map((a, i) => (
              <div key={a.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                borderBottom: i < atRiskUsers.length - 1 ? `1px solid ${DS.border}` : 'none',
              }}>
                <Avatar name={a.name} size={28} color={a.variant === 'danger' ? DS.danger : DS.warning} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.reason}</div>
                </div>
                <Badge variant={a.variant}>{a.tag}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 12px',
        }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            style={{ border: 'none', outline: 'none', fontSize: 14, color: DS.text, flex: 1, background: 'transparent' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All'], ['superadmin', 'Owner'], ['admin', 'Admin'], ['teacher', 'Teacher'], ['student', 'Student']].map(([id, label]) => (
            <button key={id} onClick={() => setRoleFilter(id)} style={{
              padding: '7px 14px', borderRadius: 7, border: `1px solid ${roleFilter === id ? SA_ACCENT_BORDER : DS.border}`,
              background: roleFilter === id ? SA_ACCENT_LIGHT : DS.bg,
              color: roleFilter === id ? SA_ACCENT : DS.muted,
              fontSize: 13, fontWeight: roleFilter === id ? 600 : 400, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <Card>
        <Table
          cols={['User', 'Role', 'Centre', 'Status', 'MFA', 'Last Seen', 'Joined', 'Actions']}
          rows={filtered.map(u => [
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={u.name} size={30} color={roleColors[u.role]} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{u.name}</div>
                <div style={{ fontSize: 11, color: DS.muted }}>{u.email}</div>
              </div>
            </div>,
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
              background: roleColors[u.role] + '20', color: roleColors[u.role], textTransform: 'capitalize',
            }}>{u.role}</span>,
            <span style={{ fontSize: 13, color: DS.muted }}>{u.centre}</span>,
            <SAStatusPill status={u.status} />,
            u.mfa
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: DS.success }}><Icon name="check" size={12} />On</span>
              : <span style={{ fontSize: 12, color: DS.faint }}>Off</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{u.lastSeen}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{u.joined}</span>,
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" small>View</Btn>
              <Btn variant="ghost" icon="message" small>Message</Btn>
            </div>,
          ])}
        />
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  REVENUE PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SARevenuePage = () => {
  const totalMRR = 48200;
  const stats = [
    { label: 'MRR',             value: `£${totalMRR.toLocaleString()}`, sub: '+£3,300 MoM',     color: SA_ACCENT,  icon: 'invoice' },
    { label: 'ARR',             value: '£578,400',                       sub: '+15.2% YoY',      color: '#0891B2',  icon: 'trending_up' },
    { label: 'New MRR',         value: '£7,400',                         sub: '+£1,600 vs last', color: DS.success, icon: 'plus' },
    { label: 'Churned MRR',     value: '£1,100',                         sub: '−£180 vs last',   color: DS.danger,  icon: 'trending_dn' },
    { label: 'ARPU',            value: '£612',                           sub: 'per centre',      color: DS.info,    icon: 'users' },
    { label: 'Avg LTV',         value: '£4,820',                         sub: '24mo avg',        color: '#0D9488',  icon: 'zap' },
    { label: 'Failed Payments', value: '8',                              sub: '£1,527 at risk',  color: DS.warning, icon: 'alert' },
  ];

  const failedPayments = [
    { business: 'Oxford Prep Academy',  amount: 149, date: '28 Apr', attempts: 2, status: 'Retrying',     statusVariant: 'info'    },
    { business: 'Smart Tutors Ltd',     amount: 79,  date: '27 Apr', attempts: 3, status: 'Card Expired', statusVariant: 'warning' },
    { business: 'Peak Performance Tutors', amount: 299, date: '26 Apr', attempts: 1, status: 'Retrying',  statusVariant: 'info'    },
    { business: 'Learning Tree Centre', amount: 29,  date: '25 Apr', attempts: 3, status: 'Failed',       statusVariant: 'danger'  },
  ];

  const recentTxns = [
    { centre: 'Apex Learning Centre',  type: 'upgrade',  amount: '+£760',  date: 'Today',      desc: 'Growth → Scale'  },
    { centre: 'BrightPath Learning',   type: 'new',      amount: '+£480',  date: 'Today',      desc: 'New trial — Growth' },
    { centre: 'Bright Minds Tuition',  type: 'addon',    amount: '+£140',  date: 'Yesterday',  desc: '14 student seats' },
    { centre: 'NorthStar Tuition',     type: 'renewal',  amount: '+£480',  date: 'Yesterday',  desc: 'Monthly renewal' },
    { centre: 'EduFirst',              type: 'refund',   amount: '-£90',   date: '2 days ago', desc: 'Pro-rata refund' },
    { centre: 'Pinnacle Prep',         type: 'renewal',  amount: '+£1,240',date: '2 days ago', desc: 'Monthly renewal' },
  ];

  // New vs Churned revenue chart data (monthly)
  const revenueMonths = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const newRevenue = [8200, 9300, 11200, 12800, 15600, 18400];
  const churnedRevenue = [1000, 1200, 1700, 1300, 1700, 1900];
  const maxRev = Math.max(...newRevenue, ...churnedRevenue) * 1.15;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Revenue & Subscriptions"
        subtitle="Monetisation across all centres"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export</Btn>,
          <Btn key="plan" variant="primary" icon="invoice" small>Manage Plans</Btn>,
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: DS.faint, marginTop: 2 }}>{s.sub}</div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: s.color + '15', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={s.icon} size={12} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="New vs Churned Revenue (Monthly)" actions={[<Badge key="b" variant="accent">Last 6 months</Badge>]}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 220, padding: '0 10px' }}>
              {revenueMonths.map((m, i) => (
                <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
                    <div title={`New £${newRevenue[i].toLocaleString()}`} style={{
                      width: 22, height: `${(newRevenue[i] / maxRev) * 100}%`,
                      background: DS.success, borderRadius: '4px 4px 0 0',
                    }} />
                    <div title={`Churned £${churnedRevenue[i].toLocaleString()}`} style={{
                      width: 22, height: `${(churnedRevenue[i] / maxRev) * 100}%`,
                      background: DS.danger, borderRadius: '4px 4px 0 0',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: DS.muted, marginTop: 8 }}>{m}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, background: DS.success, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: DS.muted }}>New Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, background: DS.danger, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: DS.muted }}>Churned</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Revenue by Plan">
          <div style={{ padding: '20px' }}>
            {[
              { plan: 'Enterprise', price: 299, clients: 12, mrr: 3588, churn: '0%',   color: SA_ACCENT },
              { plan: 'Pro',        price: 149, clients: 41, mrr: 6109, churn: '1.8%', color: '#0891B2' },
              { plan: 'Growth',     price: 79,  clients: 48, mrr: 3792, churn: '3.4%', color: '#16A34A' },
              { plan: 'Starter',    price: 29,  clients: 23, mrr: 667,  churn: '8.2%', color: '#9CA3AF' },
            ].map(p => (
              <div key={p.plan} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{p.plan}</span>
                    <span style={{ fontSize: 11, color: DS.muted, marginLeft: 8 }}>£{p.price}/mo · {p.clients} clients</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>£{p.mrr.toLocaleString()}</span>
                </div>
                <SAHBar pct={(p.mrr / 6109) * 100} color={p.color} height={6} />
                <div style={{ fontSize: 10, color: DS.muted, marginTop: 3 }}>Churn: {p.churn}</div>
              </div>
            ))}
            <Divider />
            <div style={{ fontSize: 12, color: DS.muted, marginBottom: 6 }}>Movement this month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: DS.successBg, borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: DS.success, fontWeight: 600 }}>UPGRADES</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DS.success }}>3</div>
              </div>
              <div style={{ padding: '10px 12px', background: DS.dangerBg, borderRadius: 7 }}>
                <div style={{ fontSize: 10, color: DS.danger, fontWeight: 600 }}>DOWNGRADES</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DS.danger }}>1</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Failed Payments" actions={[<Badge key="b" variant="danger">{failedPayments.length} require attention</Badge>]} style={{ marginBottom: 20 }}>
        <Table
          cols={['Business', 'Amount', 'Date', 'Attempts', 'Status', 'Action']}
          rows={failedPayments.map(p => [
            <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{p.business}</span>,
            <span style={{ fontSize: 13, fontWeight: 700, color: DS.danger }}>£{p.amount}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{p.date}</span>,
            <span style={{ fontSize: 12, color: DS.warning, fontWeight: 600 }}>{p.attempts}×</span>,
            <Badge variant={p.statusVariant}>{p.status}</Badge>,
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" small>Retry</Btn>
              <Btn variant="ghost" icon="message" small>Contact</Btn>
            </div>,
          ])}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }}>

        <Card title="Recent Transactions" actions={[<Btn key="v" variant="ghost" icon="eye" small>View all</Btn>]}>
          <div>
            {recentTxns.map((t, i) => {
              const typeMap = {
                new:     { icon: 'plus',    color: DS.success },
                upgrade: { icon: 'trending_up', color: DS.success },
                renewal: { icon: 'check',   color: DS.info },
                addon:   { icon: 'plus',    color: DS.accent },
                refund:  { icon: 'trending_dn', color: DS.danger },
              };
              const ty = typeMap[t.type] || typeMap.renewal;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < recentTxns.length - 1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7,
                    background: ty.color + '15', color: ty.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={ty.icon} size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{t.centre}</div>
                    <div style={{ fontSize: 11, color: DS.muted }}>{t.desc} · {t.date}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.amount.startsWith('-') ? DS.danger : DS.success }}>{t.amount}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  ENGAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SAEngagementPage = () => {
  const stats = [
    { label: 'DAU',                 value: '634',     sub: '+24 vs yesterday',    color: SA_ACCENT,  icon: 'users' },
    { label: 'WAU',                 value: '1,089',   sub: '67.1% of MAU',        color: '#0891B2',  icon: 'users' },
    { label: 'MAU',                 value: '1,620',   sub: '+110 this month',     color: DS.info,    icon: 'trending_up' },
    { label: 'DAU/MAU Ratio',       value: '39.1%',   sub: 'Good engagement',     color: DS.success, icon: 'zap' },
    { label: 'Avg Session',         value: '18m 42s', sub: '+1m 12s vs last wk',  color: '#0D9488',  icon: 'eye' },
    { label: 'Sessions / Day',      value: '2,841',   sub: 'across all centres',  color: DS.warning, icon: 'book' },
  ];

  const sessionsByRole = [
    { role: 'Students',     count: 4.2, color: '#16A34A' },
    { role: 'Teachers',     count: 6.8, color: '#0891B2' },
    { role: 'Centre Admin', count: 8.4, color: SA_ACCENT },
    { role: 'Parents',      count: 1.6, color: '#D97706' },
  ];

  const featureSessions = [
    { feature: 'Lesson Planner',   sessions: 4210, color: '#16A34A' },
    { feature: 'Attendance',       sessions: 3420, color: '#16A34A' },
    { feature: 'Homework',         sessions: 3180, color: '#16A34A' },
    { feature: 'AI Feedback',      sessions: 2480, color: '#16A34A' },
    { feature: 'Tracker',          sessions: 1740, color: '#16A34A' },
    { feature: 'Reports',          sessions: 1120, color: '#16A34A' },
    { feature: 'Schedule',         sessions: 920,  color: '#16A34A' },
  ];
  const maxFeature = Math.max(...featureSessions.map(f => f.sessions));

  // Daily Active Users (this week)
  const dauWeek = [
    { day: 'Mon', value: 198 }, { day: 'Tue', value: 218 }, { day: 'Wed', value: 212 },
    { day: 'Thu', value: 235 }, { day: 'Fri', value: 205 }, { day: 'Sat', value: 78 }, { day: 'Sun', value: 64 },
  ];
  const maxDau = Math.max(...dauWeek.map(d => d.value)) * 1.15;

  const funnel = [
    { stage: 'Visited landing page', count: 14820, pct: 100 },
    { stage: 'Started signup',       count: 1840,  pct: 12.4 },
    { stage: 'Completed signup',     count: 1420,  pct: 9.6 },
    { stage: 'First centre setup',   count: 980,   pct: 6.6 },
    { stage: 'Invited first user',   count: 720,   pct: 4.9 },
    { stage: 'Activated (paid)',     count: 142,   pct: 0.96 },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Platform Engagement"
        subtitle="How people actually use TutorOS"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export</Btn>,
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: s.color + '15', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={s.icon} size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* DAU chart + Sessions/User by role */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Daily Active Users (This Week)">
          <div style={{ padding: '20px' }}>
            <svg width="100%" height="200" viewBox="0 0 700 200" preserveAspectRatio="none">
              {/* gridlines */}
              {[0, 50, 100, 150].map(y => (
                <line key={y} x1="40" x2="690" y1={20 + y} y2={20 + y} stroke={DS.border} strokeDasharray="3 4" />
              ))}
              {[260, 195, 130, 65, 0].map((v, i) => (
                <text key={v} x="32" y={25 + i * 40} fontSize="10" fill={DS.muted} textAnchor="end">{v}</text>
              ))}
              {/* line */}
              <polyline
                points={dauWeek.map((d, i) => {
                  const x = 50 + (i * 640) / (dauWeek.length - 1);
                  const y = 170 - (d.value / maxDau) * 150;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none" stroke={DS.success} strokeWidth="2.5"
              />
              {dauWeek.map((d, i) => {
                const x = 50 + (i * 640) / (dauWeek.length - 1);
                const y = 170 - (d.value / maxDau) * 150;
                return (
                  <g key={d.day}>
                    <circle cx={x} cy={y} r="4" fill="#fff" stroke={DS.success} strokeWidth="2" />
                    <text x={x} y="190" fontSize="11" fill={DS.muted} textAnchor="middle">{d.day}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        <Card title="Sessions / User by Role">
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
            <div style={{ fontSize: 11, color: DS.muted, textAlign: 'center' }}>
              Avg sessions per active user (last 7 days)
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Usage (Sessions) */}
      <Card title="Feature Usage (Sessions)" style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px' }}>
          {featureSessions.map(f => (
            <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
              <div style={{ width: 110, fontSize: 12, color: DS.sub }}>{f.feature}</div>
              <div style={{ flex: 1, height: 16, background: DS.surface, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(f.sessions / maxFeature) * 100}%`, height: '100%', background: f.color, borderRadius: 3 }} />
              </div>
              <div style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 600, color: DS.text }}>{f.sessions.toLocaleString()}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${DS.border}`, paddingLeft: 122 }}>
            {[0, 900, 1800, 2700, 3600].map(t => (
              <span key={t} style={{ fontSize: 10, color: DS.faint }}>{t}</span>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Feature Adoption" actions={[<Badge key="b" variant="accent">% of active centres</Badge>]}>
          <div style={{ padding: '20px' }}>
            {SA_FEATURE_USAGE.map(f => (
              <div key={f.feature} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: DS.sub }}>{f.feature}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: f.trend.startsWith('+') ? DS.success : DS.danger }}>{f.trend}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DS.text, minWidth: 36, textAlign: 'right' }}>{f.pct}%</span>
                  </div>
                </div>
                <SAHBar pct={f.pct} color={f.color} height={8} />
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>
                      {f.count.toLocaleString()} <span style={{ fontSize: 11, color: DS.muted, fontWeight: 400 }}>({f.pct}%)</span>
                    </div>
                  </div>
                  <div style={{
                    height: 28, background: DS.surface, borderRadius: 5, overflow: 'hidden', position: 'relative',
                  }}>
                    <div style={{
                      width: `${f.pct}%`, height: '100%',
                      background: `linear-gradient(90deg, ${SA_ACCENT}, ${SA_ACCENT}88)`,
                      borderRadius: 5,
                    }} />
                  </div>
                  {drop && (
                    <div style={{ fontSize: 10, color: DS.danger, marginTop: 2, textAlign: 'right' }}>
                      −{drop}% drop-off
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Geographic Distribution" actions={[<Badge key="b" variant="default">By users</Badge>]}>
          <SARegionMap regions={SA_GEOGRAPHIC} />
        </Card>

        <Card title="Device & Browser">
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <SADonut data={SA_DEVICE} size={140} />
              <div style={{ flex: 1 }}>
                {SA_DEVICE.map(d => (
                  <div key={d.device} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{d.device}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: DS.text }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Divider margin="0 0 16px" />
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 10 }}>Top browsers</div>
            {[
              ['Chrome',   62],
              ['Safari',   24],
              ['Edge',      8],
              ['Firefox',   4],
              ['Other',     2],
            ].map(([b, pct]) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ flex: 1, fontSize: 12, color: DS.sub }}>{b}</span>
                <div style={{ width: 100 }}><SAHBar pct={pct} color={SA_ACCENT} height={5} /></div>
                <span style={{ fontSize: 11, color: DS.muted, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Top Pages by Traffic">
        <Table
          cols={['Page', 'Views (7d)', 'Avg Time', 'Bounce', 'Trend']}
          rows={[
            ['/admin/dashboard',         '12,840', '2m 14s', '8.2%',  '+12%'],
            ['/teacher/lesson_planner',  '9,720',  '8m 42s', '4.1%',  '+24%'],
            ['/student/homework',        '8,450',  '6m 18s', '12.4%', '+6%'],
            ['/admin/students',          '6,210',  '3m 02s', '14.8%', '+3%'],
            ['/teacher/ai_queue',        '5,890',  '4m 48s', '7.6%',  '+38%'],
            ['/student/progress',        '4,720',  '2m 56s', '11.2%', '+8%'],
          ].map(([page, views, time, bounce, trend]) => [
            <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: DS.text }}>{page}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{views}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>{time}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>{bounce}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: trend.startsWith('+') ? DS.success : DS.danger }}>{trend}</span>,
          ])}
        />
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SYSTEM HEALTH PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SASystemPage = () => {
  const services = [
    { name: 'API Gateway',       status: 'operational', uptime: '99.99%', latency: '142ms' },
    { name: 'Auth Service',      status: 'operational', uptime: '99.98%', latency: '88ms'  },
    { name: 'Database (primary)',status: 'operational', uptime: '99.99%', latency: '12ms'  },
    { name: 'Database (replica)',status: 'operational', uptime: '99.97%', latency: '14ms'  },
    { name: 'Redis Cache',       status: 'operational', uptime: '99.99%', latency: '2ms'   },
    { name: 'AI Feedback Worker',status: 'degraded',    uptime: '98.42%', latency: '4.2s'  },
    { name: 'Email Service',     status: 'operational', uptime: '99.94%', latency: '210ms' },
    { name: 'File Storage (S3)', status: 'operational', uptime: '99.99%', latency: '180ms' },
  ];

  const incidents = [
    { date: '2026-04-26', title: 'AI Feedback Worker latency spike',     duration: '34m',   severity: 'minor',   status: 'resolved' },
    { date: '2026-04-18', title: 'EU region — slow database replicas',    duration: '12m',   severity: 'minor',   status: 'resolved' },
    { date: '2026-04-02', title: 'Stripe webhook delivery delays',         duration: '1h 8m', severity: 'major',   status: 'resolved' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="System Health"
        subtitle="Real-time platform status"
        actions={[
          <Btn key="status" variant="secondary" icon="zap" small>Status Page</Btn>,
        ]}
      />

      {/* Overall status banner */}
      <div style={{
        marginBottom: 24, padding: '16px 20px', borderRadius: 10,
        background: DS.successBg, border: `1px solid ${DS.successBorder}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: DS.success,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.success }}>All Systems Operational</div>
          <div style={{ fontSize: 12, color: DS.success }}>1 service degraded · No active incidents</div>
        </div>
        <Badge variant="success">99.97% 30-day uptime</Badge>
      </div>

      {/* Top stats row — Uptime/API Response/Error Rate/Jobs in Queue/Storage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Uptime (30d)',  value: '99.97%', sub: '9m downtime',     color: DS.success, icon: 'zap' },
          { label: 'API Response',  value: '124ms',  sub: '−3ms vs avg',     color: DS.success, icon: 'trending_up' },
          { label: 'Error Rate',    value: '0.4%',   sub: 'Acceptable',      color: DS.warning, icon: 'alert' },
          { label: 'Jobs in Queue', value: '15',     sub: '3 pending email', color: DS.info,    icon: 'book' },
          { label: 'Storage Used',  value: '64%',    sub: '2.4 TB / 3.8 TB', color: '#0D9488',  icon: 'download' },
        ].map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: DS.muted }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 500 }}>{s.sub}</div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: s.color + '15', color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={s.icon} size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* API latency percentiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'API p50',     value: '42ms',  color: DS.success, bar: 28 },
          { label: 'API p95',     value: '142ms', color: DS.success, bar: 42 },
          { label: 'API p99',     value: '480ms', color: DS.warning, bar: 68 },
          { label: 'Error Rate',  value: '0.04%', color: DS.success, bar: 8  },
        ].map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: DS.muted, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginBottom: 8 }}>{s.value}</div>
            <SAHBar pct={s.bar} color={s.color} height={5} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Service Status">
          <Table
            cols={['Service', 'Status', 'Uptime', 'Latency']}
            rows={services.map(s => [
              <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{s.name}</span>,
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '2px 8px', borderRadius: 5,
                background: s.status === 'operational' ? DS.successBg : DS.warningBg,
                color: s.status === 'operational' ? DS.success : DS.warning,
                fontSize: 11, fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {s.status}
              </span>,
              <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.uptime}</span>,
              <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{s.latency}</span>,
            ])}
          />
        </Card>

        <Card title="Background Jobs">
          <div style={{ padding: '20px' }}>
            {[
              { queue: 'AI Feedback',    pending: 14,  failed: 0, color: DS.warning },
              { queue: 'Email delivery', pending: 3,   failed: 1, color: DS.success },
              { queue: 'PDF generation', pending: 0,   failed: 0, color: DS.success },
              { queue: 'CSV imports',    pending: 2,   failed: 0, color: DS.success },
              { queue: 'Webhooks',       pending: 1,   failed: 0, color: DS.success },
            ].map((q, i, arr) => (
              <div key={q.queue} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.color }} />
                <div style={{ flex: 1, fontSize: 13, color: DS.text, fontWeight: 500 }}>{q.queue}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{q.pending} pending</div>
                {q.failed > 0 && <Badge variant="danger">{q.failed} failed</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* API Response Time + Uptime graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="API Response Time (Today)">
          <div style={{ padding: '20px' }}>
            <svg width="100%" height="180" viewBox="0 0 600 180" preserveAspectRatio="none">
              {[0, 30, 60, 90, 120].map((y, i) => (
                <line key={i} x1="50" x2="590" y1={20 + y} y2={20 + y} stroke={DS.border} strokeDasharray="3 4" />
              ))}
              {['10ms', '8ms', '6ms', '4ms', '2ms', '0ms'].map((v, i) => (
                <text key={v} x="42" y={25 + i * 30} fontSize="10" fill={DS.muted} textAnchor="end">{v}</text>
              ))}
              {(() => {
                const pts = [80, 65, 55, 42, 30, 38, 50, 60];
                const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
                const path = pts.map((v, i) => {
                  const x = 60 + (i * 520) / (pts.length - 1);
                  const y = 30 + v;
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ');
                return (
                  <>
                    <path d={path} fill="none" stroke={DS.success} strokeWidth="2.5" />
                    {labels.map((l, i) => (
                      <text key={l} x={60 + (i * 520) / (labels.length - 1)} y="170" fontSize="10" fill={DS.muted} textAnchor="middle">{l}</text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </Card>

        <Card title="Uptime % (This Week)">
          <div style={{ padding: '20px' }}>
            <svg width="100%" height="180" viewBox="0 0 600 180" preserveAspectRatio="none">
              {[0, 30, 60, 90, 120].map((y, i) => (
                <line key={i} x1="50" x2="590" y1={20 + y} y2={20 + y} stroke={DS.border} strokeDasharray="3 4" />
              ))}
              {['100%', '99.95%', '99.9%', '99.85%', '99.8%'].map((v, i) => (
                <text key={v} x="42" y={25 + i * 30} fontSize="9" fill={DS.muted} textAnchor="end">{v}</text>
              ))}
              {(() => {
                const pts = [40, 60, 25, 100, 30, 35, 30];
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const path = pts.map((v, i) => {
                  const x = 60 + (i * 520) / (pts.length - 1);
                  const y = 30 + v;
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ');
                return (
                  <>
                    <path d={path} fill="none" stroke={DS.success} strokeWidth="2.5" />
                    {pts.map((v, i) => (
                      <circle key={i} cx={60 + (i * 520) / (pts.length - 1)} cy={30 + v} r="3" fill="#fff" stroke={DS.success} strokeWidth="2" />
                    ))}
                    {days.map((d, i) => (
                      <text key={d} x={60 + (i * 520) / (days.length - 1)} y="170" fontSize="10" fill={DS.muted} textAnchor="middle">{d}</text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </Card>
      </div>

      <Card title="Recent Incidents">
        <Table
          cols={['Date', 'Incident', 'Severity', 'Duration', 'Status']}
          rows={incidents.map(inc => [
            <span style={{ fontSize: 13, color: DS.sub, fontFamily: 'JetBrains Mono, monospace' }}>{inc.date}</span>,
            <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{inc.title}</span>,
            <Badge variant={inc.severity === 'major' ? 'danger' : 'warning'}>{inc.severity}</Badge>,
            <span style={{ fontSize: 13, color: DS.sub }}>{inc.duration}</span>,
            <SAStatusPill status={inc.status} />,
          ])}
        />
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  COMMUNICATIONS PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SACommsPage = () => {
  const [bannerOpen, setBannerOpen] = React.useState(false);

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Communications & Support"
        subtitle="Email, notifications, and support tickets across the platform"
        actions={[
          <Btn key="banner" variant="secondary" icon="bell" small onClick={() => setBannerOpen(true)}>Global Banner</Btn>,
          <Btn key="msg" variant="primary" icon="bell" small>Broadcast</Btn>,
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Emails Sent (7d)', value: '14,820', sub: 'delivery 99.4%' },
          { label: 'Open Rate',         value: '42.1%',  sub: '+3.2 vs avg' },
          { label: 'Bounce Rate',       value: '0.8%',   sub: 'within target' },
          { label: 'Push Notifications',value: '8,490',  sub: 'opt-in 71%' },
        ].map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 12, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DS.text, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: DS.success, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Support Tickets" actions={[
          <Badge key="o" variant="warning">{SA_TICKETS.filter(t => t.status === 'open').length} open</Badge>,
          <Badge key="p" variant="default">{SA_TICKETS.filter(t => t.status === 'pending').length} pending</Badge>,
        ]}>
          <Table
            cols={['ID', 'Subject', 'Centre', 'Priority', 'Status', 'Opened', 'Assignee']}
            rows={SA_TICKETS.map(t => [
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{t.id}</span>,
              <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{t.subject}</span>,
              <span style={{ fontSize: 12, color: DS.muted }}>{t.centre}</span>,
              <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>{t.priority}</Badge>,
              <SAStatusPill status={t.status} />,
              <span style={{ fontSize: 12, color: DS.muted }}>{t.opened}</span>,
              <span style={{ fontSize: 12, color: DS.sub }}>{t.assignee}</span>,
            ])}
          />
        </Card>

        <Card title="Avg Resolution Time">
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: SA_ACCENT }}>3h 42m</div>
              <div style={{ fontSize: 12, color: DS.muted }}>last 30 days · −18m vs prior</div>
            </div>
            <Divider />
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.sub, marginBottom: 10 }}>By priority</div>
            {[
              ['Urgent', '38m',   100, DS.danger],
              ['High',   '2h 4m', 76,  DS.warning],
              ['Medium', '6h 12m',54,  DS.info],
              ['Low',    '1d 2h', 28,  DS.muted],
            ].map(([p, t, pct, c]) => (
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

      <Card title="Email Performance by Type">
        <Table
          cols={['Email Type', 'Sent (7d)', 'Delivered', 'Opens', 'Clicks', 'Bounces']}
          rows={[
            ['Welcome',           '142',    '99.3%', '78.2%', '54.1%', '0.7%'],
            ['Weekly Digest',     '8,420',  '99.5%', '38.4%', '12.8%', '0.5%'],
            ['Homework Reminder', '4,210',  '99.2%', '52.1%', '24.6%', '0.8%'],
            ['Invoice',           '892',    '99.8%', '88.4%', '62.4%', '0.2%'],
            ['Password Reset',    '128',    '99.6%', '94.1%', '88.2%', '0.4%'],
            ['Marketing',         '1,028',  '98.9%', '24.6%', '6.2%',  '1.1%'],
          ].map(row => row.map((cell, i) => (
            <span style={{ fontSize: 13, color: i === 0 ? DS.text : DS.sub, fontWeight: i === 0 ? 500 : 400 }}>{cell}</span>
          )))}
        />
      </Card>

      {bannerOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setBannerOpen(false)}>
          <div style={{
            background: DS.bg, borderRadius: 12, padding: 28, width: 520,
            border: `1px solid ${DS.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Global Announcement Banner</div>
                <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>Shown to every user across all centres</div>
              </div>
              <button onClick={() => setBannerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.muted }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: DS.sub, display: 'block', marginBottom: 6 }}>Banner Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Info', 'Warning', 'Success'].map(t => (
                  <button key={t} style={{
                    flex: 1, padding: '8px 12px', borderRadius: 7,
                    border: `1px solid ${t === 'Info' ? SA_ACCENT_BORDER : DS.border}`,
                    background: t === 'Info' ? SA_ACCENT_LIGHT : DS.bg,
                    color: t === 'Info' ? SA_ACCENT : DS.muted,
                    fontSize: 13, fontWeight: t === 'Info' ? 600 : 400, cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: DS.sub, display: 'block', marginBottom: 6 }}>Message</label>
              <textarea rows={3}
                placeholder="e.g. Scheduled maintenance Sunday 02:00 UTC"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 7,
                  border: `1px solid ${DS.border}`, fontSize: 14, color: DS.text,
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setBannerOpen(false)}>Cancel</Btn>
              <Btn variant="primary" icon="bell" onClick={() => setBannerOpen(false)}>Publish Banner</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  SECURITY & AUDIT PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SASecurityPage = () => {
  const failedLogins = [
    { email: 'faisal@elite.ae',     attempts: 12, ip: '203.0.45.9',  country: '🇦🇪 UAE',     time: '8h ago',  status: 'locked' },
    { email: 'unknown@test.com',    attempts: 6,  ip: '185.220.10.4',country: '🇷🇺 RU',      time: '14h ago', status: 'blocked' },
    { email: 'lisa@brightminds...',  attempts: 3,  ip: '92.40.118.3', country: '🇬🇧 UK',      time: 'Yesterday', status: 'cleared' },
  ];

  const sensitiveActions = SA_AUDIT.filter((_, i) => i < 5);

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Security & Audit"
        subtitle="Compliance, access controls, and audit trail"
        actions={[
          <Btn key="exp" variant="secondary" icon="download" small>Export Audit Log</Btn>,
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Failed Logins (24h)', value: '21',    color: DS.warning, sub: '3 from new IPs' },
          { label: 'Locked Accounts',     value: '2',     color: DS.danger,  sub: '1 auto-locked'  },
          { label: 'Active Sessions',     value: '342',   color: DS.success, sub: 'across 1,089 users' },
          { label: 'MFA Adoption',        value: '68.4%', color: SA_ACCENT,  sub: '+4.2% MoM'      },
        ].map(s => (
          <div key={s.label} style={{
            background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 12, color: DS.muted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: DS.muted, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Suspicious Activity" actions={[<Badge key="b" variant="danger">3 alerts</Badge>]}>
          <Table
            cols={['Email', 'Attempts', 'IP', 'Origin', 'Time', 'Status']}
            rows={failedLogins.map(f => [
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.text }}>{f.email}</span>,
              <Badge variant={f.attempts > 5 ? 'danger' : 'warning'}>{f.attempts}</Badge>,
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{f.ip}</span>,
              <span style={{ fontSize: 12, color: DS.sub }}>{f.country}</span>,
              <span style={{ fontSize: 12, color: DS.muted }}>{f.time}</span>,
              <Badge variant={f.status === 'cleared' ? 'success' : 'danger'}>{f.status}</Badge>,
            ])}
          />
        </Card>

        <Card title="Compliance & Privacy">
          <div style={{ padding: '20px' }}>
            {[
              { label: 'GDPR Data Exports (30d)',  value: '8',     icon: 'download', color: DS.info    },
              { label: 'Data Deletion Requests',    value: '2',     icon: 'x',        color: DS.warning },
              { label: 'Privacy Policy Acceptance', value: '99.8%', icon: 'check',    color: DS.success },
              { label: 'Cookie Consent Coverage',   value: '100%',  icon: 'check',    color: DS.success },
              { label: 'Encryption (in transit)',   value: 'TLS 1.3',icon: 'zap',     color: DS.success },
              { label: 'Encryption (at rest)',      value: 'AES-256',icon: 'zap',     color: DS.success },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: item.color + '15', color: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={item.icon} size={14} />
                </div>
                <div style={{ flex: 1, fontSize: 13, color: DS.sub }}>{item.label}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Audit Log — Sensitive Actions" actions={[
        <Btn key="all" variant="ghost" icon="eye" small>Full log</Btn>,
      ]}>
        <Table
          cols={['Actor', 'Action', 'Target', 'IP Address', 'Time']}
          rows={SA_AUDIT.map(a => [
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={a.actor} size={24} color={a.actor === 'System' ? DS.muted : SA_ACCENT} />
              <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{a.actor}</span>
            </div>,
            <span style={{ fontSize: 13, color: DS.sub }}>{a.action}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{a.target}</span>,
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: DS.muted }}>{a.ip}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{a.time}</span>,
          ])}
        />
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLATFORM CONTROLS PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SAControlsPage = () => {
  const [flags, setFlags] = React.useState(SA_FLAGS);
  const [maintenance, setMaintenance] = React.useState(false);
  const [readOnly, setReadOnly] = React.useState(false);

  const toggleFlag = (id) => setFlags(flags.map(f => f.id === id ? { ...f, on: !f.on } : f));

  const Switch = ({ on, onChange }) => (
    <button onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? SA_ACCENT : DS.borderDark,
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.15s', padding: 0, flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }} />
    </button>
  );

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Platform Controls"
        subtitle="Feature flags, plans, roles, and global settings"
        actions={[
          <Btn key="save" variant="primary" icon="check" small>Save Changes</Btn>,
        ]}
      />

      {/* Global toggles */}
      <Card title="Global Toggles" style={{ marginBottom: 20 }}>
        <div style={{ padding: '8px 0' }}>
          {[
            { label: 'Maintenance Mode', desc: 'Show maintenance banner; block writes', on: maintenance, set: setMaintenance, danger: true },
            { label: 'Read-only Mode',   desc: 'All centres see read-only state',        on: readOnly,   set: setReadOnly,    danger: true },
            { label: 'New Signups',       desc: 'Allow new tuition centres to register', on: true,        set: () => {},        danger: false },
            { label: 'Public Status Page',desc: 'Status page visible at status.tutoros.io', on: true,     set: () => {},        danger: false },
          ].map((t, i, arr) => (
            <div key={t.label} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none',
              background: t.on && t.danger ? DS.warningBg : 'transparent',
            }}>
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

      {/* Feature flags */}
      <Card title="Feature Flags" actions={[<Btn key="add" variant="ghost" icon="plus" small>New Flag</Btn>]} style={{ marginBottom: 20 }}>
        <Table
          cols={['Flag', 'Description', 'Scope', 'Coverage', 'Status']}
          rows={flags.map(f => [
            <code style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', background: DS.surface, padding: '2px 6px', borderRadius: 4, color: SA_ACCENT }}>{f.id}</code>,
            <span style={{ fontSize: 13, color: DS.sub }}>{f.desc}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{f.scope}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
              <SAHBar pct={parseInt(f.coverage)} color={SA_ACCENT} />
              <span style={{ fontSize: 11, color: DS.muted, minWidth: 36 }}>{f.coverage}</span>
            </div>,
            <Switch on={f.on} onChange={() => toggleFlag(f.id)} />,
          ])}
        />
      </Card>

      {/* Plans */}
      <Card title="Plans & Pricing" actions={[<Btn key="add" variant="ghost" icon="plus" small>New Plan</Btn>]} style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '20px' }}>
          {[
            { name: 'Starter', price: 60,  students: 30, teachers: 2,  centres: 3, color: '#9CA3AF', features: ['Basic dashboard', '1GB storage', 'Email support'] },
            { name: 'Growth',  price: 160, students: 100, teachers: 6, centres: 5, color: '#0891B2', features: ['Lesson Planner', 'AI Feedback', '10GB storage', 'Priority support'] },
            { name: 'Scale',   price: 410, students: 500, teachers: 25, centres: 4, color: SA_ACCENT, features: ['All Growth features', 'Custom branding', 'Unlimited storage', 'Dedicated CSM'] },
          ].map(plan => (
            <div key={plan.name} style={{
              border: `2px solid ${plan.color}33`, borderRadius: 10, padding: 18,
              background: plan.color + '08',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: plan.color }}>{plan.name}</span>
                <Badge variant="default">{plan.centres} centres</Badge>
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: DS.text }}>£{plan.price}</span>
                <span style={{ fontSize: 13, color: DS.muted }}> /mo</span>
              </div>
              <div style={{ fontSize: 11, color: DS.muted, marginBottom: 10 }}>
                Up to {plan.students} students · {plan.teachers} teachers
              </div>
              <Divider margin="10px 0" />
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: DS.sub, padding: '3px 0' }}>
                  <Icon name="check" size={12} color={plan.color} />
                  {f}
                </div>
              ))}
              <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                <Btn variant="secondary" small>Edit</Btn>
                <Btn variant="ghost" small>Archive</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Roles */}
      <Card title="Roles & Permissions" actions={[<Btn key="add" variant="ghost" icon="plus" small>New Role</Btn>]}>
        <Table
          cols={['Role', 'Users', 'Permissions', 'Scope']}
          rows={[
            { role: 'SuperAdmin', users: 1,    perms: ['Full platform access', 'Billing', 'Audit log'],          scope: 'Platform-wide', color: SA_ACCENT },
            { role: 'Admin',      users: 12,   perms: ['Manage centre', 'Invite teachers', 'View invoices'],     scope: 'Per centre',    color: DS.accent },
            { role: 'Teacher',    users: 198,  perms: ['Manage classes', 'Grade homework', 'View assigned'],     scope: 'Per centre',    color: '#0891B2' },
            { role: 'Student',    users: 1342, perms: ['Submit homework', 'View own progress'],                  scope: 'Self',          color: '#16A34A' },
            { role: 'Parent',     users: 70,   perms: ['View child progress', 'Pay invoices'],                   scope: 'Linked students', color: '#D97706' },
          ].map(r => [
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
              background: r.color + '20', color: r.color,
            }}>{r.role}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.users.toLocaleString()}</span>,
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {r.perms.map(p => (
                <span key={p} style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                  background: DS.surface, color: DS.muted, border: `1px solid ${DS.border}`,
                }}>{p}</span>
              ))}
            </div>,
            <span style={{ fontSize: 12, color: DS.muted }}>{r.scope}</span>,
          ])}
        />
      </Card>
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
    case 'comms':      return <SACommsPage />;
    case 'security':   return <SASecurityPage />;
    case 'controls':   return <SAControlsPage />;
    default:           return <SuperAdminDashboard />;
  }
};

Object.assign(window, { SuperAdminDashboard, SuperAdminPages });
