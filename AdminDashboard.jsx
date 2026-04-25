// ══════════════════════════════════════════════════════════════
//  TutorOS — Admin Dashboard
// ══════════════════════════════════════════════════════════════

const atRiskStudents = [
  { name: 'Noah Fitzgerald',   subject: 'Mathematics',        reason: '3 consecutive absences',       lastSeen: '8 Apr',  severity: 'danger'  },
  { name: 'Amelia Roberts',    subject: 'English Literature', reason: 'Homework completion below 35%', lastSeen: '14 Apr', severity: 'danger'  },
  { name: 'Liam Thornton',     subject: 'Science',            reason: 'Test score dropped 22 pts',     lastSeen: '17 Apr', severity: 'warning' },
  { name: 'Zoe Patterson',     subject: 'Chemistry',          reason: 'No submissions in 2 weeks',     lastSeen: '10 Apr', severity: 'warning' },
  { name: 'Isaac Okafor',      subject: 'Mathematics',        reason: 'Engagement score: Low',         lastSeen: '21 Apr', severity: 'warning' },
];

const revenueData = {
  labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  series: [
    { label: 'Revenue (£)', data: [8200, 9400, 8800, 10200, 11500, 12400], color: DS.accent },
    { label: 'Enrolments',  data: [98, 107, 103, 118, 131, 142],            color: '#0891B2' },
  ],
};

const recentActivity = [
  { type: 'enrol',   text: 'Sophia Patel enrolled in GCSE Maths',         time: '2h ago'  },
  { type: 'invoice', text: 'Invoice #INV-0284 sent to Williams family',    time: '4h ago'  },
  { type: 'alert',   text: 'Noah Fitzgerald flagged as at-risk',           time: '6h ago'  },
  { type: 'enrol',   text: 'James Wilson enrolled in A-Level Chemistry',   time: 'Yesterday' },
  { type: 'invoice', text: 'Invoice #INV-0283 paid — £320',                time: 'Yesterday' },
];

const AdminDashboard = () => {
  const [announcementOpen, setAnnouncementOpen] = React.useState(false);
  const [announcementText, setAnnouncementText] = React.useState('');
  const [announcementSent, setAnnouncementSent] = React.useState(false);

  const kpis = [
    { label: 'Total Students',   value: '142',  trend: '+8 this month',    trendDir: 'up',   icon: 'users',   iconBg: DS.accentLight,  accent: DS.accent  },
    { label: 'Attendance Rate',  value: '94.2%', trend: '+1.3% vs last wk', trendDir: 'up',   icon: 'check',   iconBg: '#F0FDF4',        accent: DS.success },
    { label: 'HW Completion',    value: '78%',  trend: '-4% vs last wk',   trendDir: 'down', icon: 'clip',    iconBg: '#FFFBEB',        accent: DS.warning },
    { label: 'Students At-Risk', value: '5',    trend: '2 critical',        trendDir: 'down', icon: 'alert',   iconBg: '#FEF2F2',        accent: DS.danger  },
  ];

  const severityMap = { danger: 'danger', warning: 'warning' };

  const quickActions = [
    { icon: 'plus',    label: 'Add Student',       desc: 'Enrol a new student' },
    { icon: 'bell',    label: 'Send Announcement', desc: 'All parents & teachers', onClick: () => setAnnouncementOpen(true) },
    { icon: 'invoice', label: 'View Invoices',      desc: '4 unpaid this week' },
    { icon: 'download', label: 'Export Report',    desc: 'Monthly progress CSV' },
    { icon: 'user',    label: 'Add Teacher',        desc: 'Invite via email' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: DS.surface }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: '32px 32px 32px', overflow: 'auto', minWidth: 0 }}>
          <PageHeader
            title="Dashboard"
            subtitle={`Friday, 25 April 2026 · Spring Term, Week 8`}
            actions={[
              <Btn key="report" variant="secondary" icon="download" small>Export Report</Btn>,
              <Btn key="add" variant="primary" icon="plus" small>Add Student</Btn>,
            ]}
          />

          {/* KPI Row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {kpis.map(k => <KPICard key={k.label} {...k} />)}
          </div>

          {/* Two-column: chart + quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 20 }}>

            {/* Revenue + Enrolment Chart */}
            <Card title="Revenue & Enrolment Trend" actions={[
              <Badge key="q" variant="accent">Last 6 months</Badge>
            ]}>
              <div style={{ padding: '20px 20px 8px' }}>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  {revenueData.series.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 2, background: s.color, borderRadius: 2 }} />
                      <span style={{ fontSize: 12, color: DS.muted }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <LineChart labels={revenueData.labels} series={revenueData.series} height={200} />
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                borderTop: `1px solid ${DS.border}`, background: DS.surface,
              }}>
                {[['£12,400', 'Revenue this month', DS.accent], ['142', 'Active students', '#0891B2']].map(([v, l, c]) => (
                  <div key={l} style={{ padding: '14px 20px', borderRight: l.includes('month') ? `1px solid ${DS.border}` : 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                    <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card title="Quick Actions">
                <div style={{ padding: '8px 0' }}>
                  {quickActions.map((a, i) => {
                    const [hov, setHov] = React.useState(false);
                    return (
                      <button
                        key={a.label}
                        onClick={a.onClick}
                        onMouseEnter={() => setHov(true)}
                        onMouseLeave={() => setHov(false)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 16px', border: 'none', background: hov ? DS.surface : 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          borderBottom: i < quickActions.length - 1 ? `1px solid ${DS.border}` : 'none',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 7,
                          background: DS.accentLight, color: DS.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon name={a.icon} size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: DS.muted }}>{a.desc}</div>
                        </div>
                        <Icon name="chevron_r" size={14} color={DS.faint} style={{ marginLeft: 'auto' }} />
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Recent activity */}
              <Card title="Recent Activity">
                <div style={{ padding: '8px 0' }}>
                  {recentActivity.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 16px',
                      borderBottom: i < recentActivity.length - 1 ? `1px solid ${DS.border}` : 'none',
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                        background: a.type === 'alert' ? DS.danger : a.type === 'invoice' ? DS.warning : DS.success,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: DS.sub, lineHeight: 1.4 }}>{a.text}</div>
                        <div style={{ fontSize: 11, color: DS.faint, marginTop: 2 }}>{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* At-Risk Table */}
          <Card
            title="At-Risk Students"
            style={{ marginBottom: 20 }}
            actions={[
              <Badge key="count" variant="danger">5 flagged</Badge>,
              <Btn key="view" variant="ghost" icon="eye" small>View all</Btn>,
            ]}
          >
            <Table
              cols={['Student', 'Subject', 'Flag Reason', 'Last Seen', 'Severity', 'Action']}
              rows={atRiskStudents.map(s => [
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={s.name} size={30} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{s.name}</span>
                </div>,
                <span style={{ fontSize: 13, color: DS.muted }}>{s.subject}</span>,
                <span style={{ fontSize: 13, color: DS.sub }}>{s.reason}</span>,
                <span style={{ fontSize: 13, color: DS.muted }}>{s.lastSeen}</span>,
                <Badge variant={severityMap[s.severity]}>{s.severity === 'danger' ? 'Critical' : 'Moderate'}</Badge>,
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" small>View Profile</Btn>
                  <Btn variant="ghost" icon="message" small>Message</Btn>
                </div>,
              ])}
            />
          </Card>

          {/* Enrolment by subject */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Enrolment by Subject" actions={[<Badge key="b" variant="default">This term</Badge>]}>
              <div style={{ padding: '16px 20px' }}>
                {[
                  ['Mathematics',        52, DS.accent],
                  ['English Literature', 38, '#0891B2'],
                  ['Science',            28, '#0D9488'],
                  ['Chemistry',          14, '#7C3AED'],
                  ['History',            10, '#D97706'],
                ].map(([subj, count, color]) => (
                  <div key={subj} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: DS.sub }}>{subj}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: DS.surface, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(count / 52) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Teacher Utilisation" actions={[<Badge key="b" variant="default">This week</Badge>]}>
              <div style={{ padding: '8px 0' }}>
                {[
                  { name: 'Sarah Clarke',  subj: 'Mathematics',  classes: 14, capacity: 16 },
                  { name: 'David Park',    subj: 'Science',       classes: 11, capacity: 14 },
                  { name: 'Priya Nair',    subj: 'English',       classes: 12, capacity: 16 },
                  { name: 'Marcus Webb',   subj: 'Chemistry',     classes: 8,  capacity: 12 },
                  { name: 'Helen Yoo',     subj: 'History',       classes: 6,  capacity: 10 },
                ].map((t, i) => (
                  <div key={t.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: i < 4 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <Avatar name={t.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: DS.muted }}>{t.subj}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{t.classes}/{t.capacity}</div>
                      <div style={{ fontSize: 11, color: DS.muted }}>classes</div>
                    </div>
                    <div style={{ width: 48, height: 6, background: DS.surface, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(t.classes / t.capacity) * 100}%`, height: '100%', background: t.classes / t.capacity > 0.85 ? DS.warning : DS.success, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Announcement Modal ─────────────────────────────────────── */}
      {announcementOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setAnnouncementOpen(false)}>
          <div style={{
            background: DS.bg, borderRadius: 12, padding: '28px',
            width: 480, border: `1px solid ${DS.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Send Announcement</div>
                <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>Sent to all parents and teachers</div>
              </div>
              <button onClick={() => setAnnouncementOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.muted }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            {announcementSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: DS.success }}>
                <Icon name="check" size={32} />
                <div style={{ marginTop: 8, fontWeight: 600 }}>Announcement sent!</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: DS.sub, display: 'block', marginBottom: 6 }}>Subject</label>
                  <input style={{
                    width: '100%', padding: '8px 12px', borderRadius: 7,
                    border: `1px solid ${DS.border}`, fontSize: 14, color: DS.text,
                    outline: 'none', boxSizing: 'border-box',
                  }} placeholder="e.g. Centre closed Monday 28 April" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: DS.sub, display: 'block', marginBottom: 6 }}>Message</label>
                  <textarea
                    rows={4}
                    value={announcementText}
                    onChange={e => setAnnouncementText(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 7,
                      border: `1px solid ${DS.border}`, fontSize: 14, color: DS.text,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                    placeholder="Write your announcement here..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Btn variant="secondary" onClick={() => setAnnouncementOpen(false)}>Cancel</Btn>
                  <Btn variant="primary" icon="bell" onClick={() => { setAnnouncementSent(true); setTimeout(() => { setAnnouncementOpen(false); setAnnouncementSent(false); }, 1500); }}>
                    Send to all
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { AdminDashboard });
