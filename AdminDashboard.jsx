// ══════════════════════════════════════════════════════════════
//  TutorOS — Admin Dashboard  (Centre overview · triage layout)
// ══════════════════════════════════════════════════════════════

// Mock data (atRiskStudents, revenueData, recentActivity) lives in
// mocks/adminDashboard.mock.jsx, loaded before this file in index.html.
//
// Layout follows the dashboard triage order: alerts → KPIs → quick
// actions → today → light trends → preview lists. Presentation only —
// every value keeps the source it already had; blocks with no source
// yet render an empty/TODO state rather than inventing data.

// ── Centre-wide flag thresholds (shared with the at-risk logic) ──
// Reuse these if equivalent constants appear elsewhere later.
const ADMIN_ABSENCE_STREAK = 3;
const ADMIN_COMPLETION_MIN = 50;
const ADMIN_SCORE_DROP     = 10;

// Subject → dot colour for session / class items. Local helper following
// the existing per-file convention (AdminPages.jsx / TeacherPages.jsx) —
// there is no shared exported subjectColor.
const adminSubjectColor = (name = '') => {
  const map = {
    'Mathematics': DS.accent, 'GCSE Mathematics': DS.accent, 'A-Level Maths': '#7C3AED',
    'English Literature': '#D97706', 'English': '#D97706',
    'Science': '#0891B2', 'Chemistry': '#0D9488', 'Physics': '#0D9488',
    'History': '#DC2626', 'Biology': '#16A34A',
  };
  if (map[name]) return map[name];
  const pool = ['#4F46E5', '#0891B2', '#0D9488', '#D97706', '#DC2626', '#7C3AED'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
};

// The centre name/identity now comes from centreMetrics.getActiveCentre()
// (single source of truth) — no per-screen "demo centre" literal.

// ── Small presentational subcomponents ──────────────────────────

// One row in the alert strip — only rendered by the caller when count > 0.
const AlertRow = ({ tone, icon, text, cta, onClick }) => {
  const c = tone === 'danger'
    ? { bg: DS.dangerBg, border: DS.dangerBorder, color: DS.danger }
    : { bg: DS.warningBg, border: DS.warningBorder, color: DS.warning };
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '11px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
        background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.color}`,
        boxShadow: hov ? DS.cardShadow : 'none', transition: 'box-shadow 0.12s',
      }}
    >
      <span style={{ display: 'flex', color: c.color, flexShrink: 0 }}><Icon name={icon} size={16} /></span>
      <span style={{ fontSize: 13, color: DS.sub, flex: 1, minWidth: 0 }}>{text}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: c.color, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
        {cta} <Icon name="chevron_r" size={13} />
      </span>
    </button>
  );
};

// "See all →" footer link used at the foot of every preview list.
const SeeAll = ({ label = 'See all', onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%',
        padding: '10px 16px', border: 'none', borderTop: `1px solid ${DS.border}`,
        background: hov ? DS.surface : 'transparent', cursor: 'pointer',
        fontSize: 12.5, fontWeight: 500, color: DS.accent, transition: 'background 0.12s',
      }}
    >
      {label} <Icon name="chevron_r" size={13} />
    </button>
  );
};

// Compact session row for "Today's schedule".
const SessionRow = ({ s, last, onClick }) => {
  const statusBadge = s.status === 'no_teacher'
    ? <Badge variant="warning">No teacher</Badge>
    : s.status === 'done'
      ? <Badge variant="success">Attendance taken</Badge>
      : <Badge variant="default">Upcoming</Badge>;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer',
      borderBottom: last ? 'none' : `1px solid ${DS.border}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: DS.text, width: 46, flexShrink: 0 }}>{s.time}</span>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: adminSubjectColor(s.subject), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.subject}</div>
        <div style={{ fontSize: 12, color: DS.muted }}>{s.teacher} · {s.room}</div>
      </div>
      {statusBadge}
    </div>
  );
};

// One row in the quick-actions list. Its own component so the hover hook is
// stable regardless of whether the parent section is toggled on/off (avoids a
// Rules-of-Hooks violation that would otherwise crash when toggling the section).
const QuickActionRow = ({ action, divider }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={action.onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 16px', border: 'none', background: hov ? DS.surface : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        borderBottom: divider ? `1px solid ${DS.border}` : 'none',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 7,
        background: DS.accentLight, color: DS.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={action.icon} size={14} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{action.label}</div>
        <div style={{ fontSize: 11, color: DS.muted }}>{action.desc}</div>
      </div>
      <Icon name="chevron_r" size={14} color={DS.faint} style={{ marginLeft: 'auto' }} />
    </button>
  );
};

const AdminDashboard = () => {
  const [announcementOpen, setAnnouncementOpen] = React.useState(false);
  const [announcementText, setAnnouncementText] = React.useState('');
  const [announcementSent, setAnnouncementSent] = React.useState(false);

  const go = (pg) => window.__navigate && window.__navigate('admin', pg);

  // Post-signup "Set up your centre" prompt. Reads the onboarding checklist state
  // (set by the Onboarding module) without a hook so the dashboard stays decoupled;
  // hidden once all three setup steps are done.
  const setupState = (() => {
    try { return JSON.parse(localStorage.getItem('tutoros.onboarding.v2::bm') || 'null'); }
    catch (e) { return null; }
  })();
  const setupSteps = (setupState && setupState.steps) || {};
  const setupRemaining = ['invite', 'students', 'classes'].filter(k => !setupSteps[k]).length;

  // ── Everything below derives from the centre-metrics selector layer
  //    (single source of truth). No hardcoded student / at-risk / session /
  //    capacity / outstanding figures — one number per concept, centre-scoped.
  const cm = window.centreMetrics;
  const money = window.invMoney || (n => `£${Math.round(n || 0).toLocaleString()}`);
  const invRollup = cm.getInvoiceRollup();
  const sessions  = cm.getSessionsWeek();
  const capacity  = cm.getCapacityUsed();

  // ONE at-risk definition (§2/§6): threshold breach OR staff flag, kept
  // advisory + explainable (the reason travels with each row — Children's-Code
  // Part D forbids opaque profiling of a minor).
  const flaggedRows = cm.getAtRiskStudents().map(s => ({
    name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Student',
    subject: (s.subjects || [])[0] || '—',
    reason: cm.atRiskReason(s),
    severity: ((typeof s.attendance === 'number' && s.attendance < 70) ||
               (typeof s.score === 'number' && s.score < 55)) ? 'danger' : 'warning',
  }));
  const flaggedCount = flaggedRows.length;

  // ── Alerts (render a row only when its count > 0) — all derived ──
  const classesToday   = cm.getClassesForCentre().filter(c => c.day ===
    ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()] && c.status !== 'archived');
  const unstaffedToday = classesToday.filter(c => !c.teacher).length;
  const alerts = [
    invRollup.overdue > 0 && { key: 'inv', tone: 'danger', icon: 'invoice',
      text: `${money(invRollup.overdue)} in overdue invoices to chase`, cta: 'View invoices', onClick: () => go('invoices') },
    unstaffedToday > 0 && { key: 'staff', tone: 'warning', icon: 'calendar',
      text: `${unstaffedToday} session${unstaffedToday !== 1 ? 's' : ''} today without a teacher`, cta: 'Open schedule', onClick: () => go('schedule') },
    flaggedCount > 0 && { key: 'flag', tone: 'warning', icon: 'alert',
      text: `${flaggedCount} student${flaggedCount !== 1 ? 's' : ''} flagged on attendance or progress`, cta: 'Review students', onClick: () => go('students') },
  ].filter(Boolean);

  // ── KPIs — every hero value is wired (no dashes, §8). ──
  const kpis = [
    { label: 'Active students',   value: String(cm.getActiveStudentCount()), sub: `${cm.getClassEnrolments()} enrolments`,        icon: 'users',    iconBg: DS.accentLight, accent: DS.accent  },
    { label: 'Attendance (week)', value: `${cm.getAttendanceWeek()}%`,        sub: 'across active students',                       icon: 'check',    iconBg: DS.successBg,   accent: DS.success },
    { label: 'Outstanding',       value: money(invRollup.outstanding),        sub: invRollup.overdue > 0 ? `${money(invRollup.overdue)} overdue` : 'all current', icon: 'invoice', iconBg: DS.warningBg, accent: DS.warning },
    { label: 'Sessions (week)',   value: String(sessions.total),              sub: `${sessions.today} today`,                      icon: 'calendar', iconBg: DS.infoBg,      accent: DS.info    },
    { label: 'Capacity used',     value: `${capacity.pct}%`,                  sub: `${capacity.used}/${capacity.cap} seats`,       icon: 'chart',    iconBg: DS.accentLight, accent: DS.accent  },
  ];

  const quickActions = [
    { icon: 'plus',     label: 'Add student',       desc: 'Enrol a new student', onClick: () => go('students') },
    { icon: 'invoice',  label: 'Create invoice',     desc: 'Bill a family',       onClick: () => go('invoices') },
    { icon: 'calendar', label: 'New session',        desc: 'Schedule a class',    onClick: () => go('schedule') },
    { icon: 'bell',     label: 'Send announcement',  desc: 'All parents & teachers', onClick: () => setAnnouncementOpen(true) },
  ];

  // ── Today's schedule — no admin schedule source yet ─────────────
  // Render an empty preview rather than inventing sessions.
  const todaySessions = [];   // TODO: wire centre-wide sessions for today

  // ── Trends — split the existing 6-month series into two panels ──
  const enrolSeries = revenueData.series.find(s => /enrol/i.test(s.label));
  const revSeries   = revenueData.series.find(s => /£|revenue/i.test(s.label));
  const last6 = (arr) => arr.slice(-6);
  const trendLabels = last6(revenueData.labels);

  // ── Outstanding invoices preview — no source yet ────────────────
  const outstandingInvoices = [];   // TODO: wire top overdue invoices

  // ── Per-user customisation — toggle which sections appear ───────
  const SECTIONS = [
    { id: 'alerts',    label: 'Alerts',                  hint: 'Things that need attention now' },
    { id: 'kpis',      label: 'Key metrics',             hint: 'Students, attendance, sessions…' },
    { id: 'today',     label: "Today's schedule",        hint: 'Sessions running today' },
    { id: 'actions',   label: 'Quick actions',           hint: 'Common shortcuts' },
    { id: 'trends',    label: 'Trends',                  hint: 'Enrolment & revenue charts' },
    { id: 'flagged',   label: 'Students needing attention' },
    { id: 'invoices',  label: 'Outstanding invoices' },
    { id: 'activity',  label: 'Recent activity' },
  ];
  const prefs = useDashboardPrefs('tutoros.dash.admin.v1', SECTIONS);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const show = prefs.isOn;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Centre overview"
        subtitle={`${cm.getActiveCentre().name} · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={[
          <Btn key="cust" variant="secondary" icon="settings" small onClick={() => setCustomiseOpen(true)}>Customise</Btn>,
        ]}
      />

      {/* ── Set up your centre (post-signup checklist prompt) ─────── */}
      {setupRemaining > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          padding: '16px 20px', borderRadius: 12,
          background: `linear-gradient(135deg, ${DS.accentLight}, ${DS.bg})`,
          border: `1px solid ${DS.accentBorder}`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: DS.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="zap" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>Finish setting up your centre</div>
            <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>
              {setupRemaining} of 3 steps to go — invite teachers, add students and create classes.
            </div>
          </div>
          <Btn variant="secondary" icon="send" onClick={() => go('people')}>People &amp; invites</Btn>
          <Btn variant="primary" icon="chevron_r" onClick={() => go('setup')}>Continue setup</Btn>
        </div>
      )}

      {/* ── Alert strip (hidden entirely if nothing is flagged) ──── */}
      {show('alerts') && alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {alerts.map(a => <AlertRow key={a.key} {...a} />)}
        </div>
      )}

      {/* ── KPI row (responsive auto-fit grid) ─────────────────────── */}
      {show('kpis') && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          {kpis.map(k => <StatCard key={k.label} {...k} />)}
        </div>
      )}

      {/* ── Today + quick actions (two-up) ─────────────────────────── */}
      {(show('today') || show('actions')) && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {/* Today's schedule */}
        {show('today') && (
        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
          <Card title="Today's schedule" actions={[
            <Badge key="b" variant="accent">{todaySessions.length} sessions</Badge>,
          ]}>
            {todaySessions.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No sessions to show yet"
                message="Today's centre-wide timetable will appear here once the schedule is connected."
                action={<Btn variant="secondary" icon="calendar" small onClick={() => go('schedule')}>Open schedule</Btn>}
              />
            ) : (
              <>
                {todaySessions.slice(0, 6).map((s, i, arr) => (
                  <SessionRow key={i} s={s} last={i === Math.min(arr.length, 6) - 1} onClick={() => go('schedule')} />
                ))}
                <SeeAll onClick={() => go('schedule')} />
              </>
            )}
          </Card>
        </div>
        )}

        {/* Quick actions (kept from the original page) */}
        {show('actions') && (
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <Card title="Quick actions">
            <div style={{ padding: '6px 0' }}>
              {quickActions.map((a, i) => (
                <QuickActionRow key={a.label} action={a} divider={i < quickActions.length - 1} />
              ))}
            </div>
          </Card>
        </div>
        )}
      </div>
      )}

      {/* ── Trends (two-up, compact) ──────────────────────────────── */}
      {show('trends') && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {enrolSeries && (
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <Card
              title="Enrolment"
              subtitle="Last 6 months"
              actions={[<Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('reports')}>Reports</Btn>]}
            >
              <div style={{ padding: '14px 16px 8px', height: 150 }}>
                <LineChart labels={trendLabels} series={[{ ...enrolSeries, data: last6(enrolSeries.data), color: '#0891B2' }]} height="auto" />
              </div>
            </Card>
          </div>
        )}
        {revSeries && (
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <Card
              title="Revenue billed"
              subtitle="Last 6 months"
              actions={[<Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('reports')}>Reports</Btn>]}
            >
              <div style={{ padding: '14px 16px 8px', height: 150 }}>
                <LineChart labels={trendLabels} series={[{ ...revSeries, data: last6(revSeries.data), color: DS.accent }]} height="auto" />
              </div>
            </Card>
          </div>
        )}
      </div>
      )}

      {/* ── Flagged students preview (derived — centreMetrics.getAtRiskStudents) ── */}
      {show('flagged') && (
      <Card
        title="Students needing attention"
        style={{ marginBottom: 24 }}
        actions={[
          <Badge key="c" variant="warning">{flaggedCount} flagged</Badge>,
          <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('students')}>See all</Btn>,
        ]}
      >
        {flaggedRows.slice(0, 6).map((s, i, arr) => {
          const last = i === Math.min(arr.length, 6) - 1;
          return (
            <div key={s.name} onClick={() => go('students')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer',
              borderBottom: last ? 'none' : `1px solid ${DS.border}`,
            }}>
              <Avatar name={s.name} size={30} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: adminSubjectColor(s.subject), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{s.subject} · {s.reason}</div>
              </div>
              <Badge variant={s.severity === 'danger' ? 'danger' : 'warning'}>{s.severity === 'danger' ? 'Critical' : 'Moderate'}</Badge>
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </div>
          );
        })}
      </Card>
      )}

      {/* ── Bottom two-up: outstanding invoices · recent activity ─── */}
      {(show('invoices') || show('activity')) && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {/* Outstanding invoices */}
        {show('invoices') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card title="Outstanding invoices" actions={[
            <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('invoices')}>See all</Btn>,
          ]}>
            {outstandingInvoices.length === 0 ? (
              <EmptyState
                icon="invoice"
                title="Nothing outstanding to show"
                message="Top overdue invoices will appear here once the invoices store is connected."
                action={<Btn variant="secondary" icon="invoice" small onClick={() => go('invoices')}>Open invoices</Btn>}
              />
            ) : (
              <>
                {outstandingInvoices.slice(0, 5).map((inv, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                    borderBottom: i < Math.min(arr.length, 5) - 1 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <Avatar name={inv.name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{inv.name}</div>
                      <div style={{ fontSize: 12, color: DS.muted }}>{inv.class}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{inv.amount}</div>
                      <div style={{ fontSize: 11, color: DS.danger }}>{inv.daysOverdue}d overdue</div>
                    </div>
                  </div>
                ))}
                <SeeAll onClick={() => go('invoices')} />
              </>
            )}
          </Card>
        </div>
        )}

        {/* Recent activity (real — recentActivity mock) */}
        {show('activity') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card title="Recent activity">
            <div style={{ padding: '6px 0' }}>
              {recentActivity.slice(0, 5).map((a, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: a.type === 'alert' ? DS.danger : a.type === 'invoice' ? DS.warning : DS.success,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 11, color: DS.faint, marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        )}
      </div>
      )}

      {/* ── Customise dashboard modal ─────────────────────────────── */}
      <CustomiseModal open={customiseOpen} onClose={() => setCustomiseOpen(false)} prefs={prefs} />

      {/* ── Announcement Modal (unchanged behaviour) ──────────────── */}
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
                <div style={{ fontSize: 16, fontWeight: 700 }}>Send announcement</div>
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
