// ══════════════════════════════════════════════════════════════
//  TutorOS — Admin Dashboard  (Centre overview · triage layout)
// ══════════════════════════════════════════════════════════════

// Mock data (atRiskStudents, revenueData, recentActivity) lives in
// mocks/adminDashboard.mock.jsx, loaded before this file in index.html.
//
// Layout follows the dashboard triage order: hero (title + alerts + KPI
// band) → setup prompt → today → trends → preview lists. Presentation
// only — every value keeps the source it already had; blocks with no
// source yet render an empty/TODO state rather than inventing data.
// Quick actions were removed by request; "Send announcement" (the one
// action with no page of its own) lives in the hero instead.
//
// The hero is a dark "ink" panel with a soft glow in the live accent
// (DS.accent is admin-themeable, so the glow re-themes with the centre
// brand). KPIs render inside it as a hairline-divided stat band instead
// of a row of boxed cards.

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

// Dark-hero primitives (HERO_TXT, heroSurface, HeroGhostBtn, HoverRow) come
// from shared.jsx — shared with the teacher dashboard.

// One alert chip in the hero footer — translucent pill, tone shows only on
// the icon so the strip stays calm. Only rendered when its count > 0.
const HeroAlertChip = ({ tone, icon, text, cta, onClick }) => {
  const iconColor = tone === 'danger' ? '#FCA5A5' : '#FCD34D';
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9,
        padding: '8px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
        background: hov ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.13)',
        transition: 'background 0.12s', maxWidth: '100%',
      }}
    >
      <span style={{ display: 'flex', color: iconColor, flexShrink: 0 }}><Icon name={icon} size={14} /></span>
      <span style={{ fontSize: 12.5, color: HERO_TXT.soft, minWidth: 0 }}>{text}</span>
      <span style={{
        fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
      }}>
        {cta} <Icon name="chevron_r" size={12} />
      </span>
    </button>
  );
};

// KPI stat band inside the hero: hairline-divided columns, caps overline
// labels, tabular figures. The -1px margin inside an overflow-hidden wrapper
// hides the first column's divider on every wrapped row.
const HeroStatBand = ({ stats }) => (
  <div style={{ overflow: 'hidden', borderTop: `1px solid ${HERO_TXT.hairline}`, marginTop: 22, paddingTop: 20 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', rowGap: 18, marginLeft: -1 }}>
      {stats.map(k => (
        <div key={k.label} style={{ borderLeft: `1px solid ${HERO_TXT.hairline}`, padding: '2px 18px', minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: HERO_TXT.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{k.label}</div>
          <div style={{
            fontSize: 27, fontWeight: 700, color: '#fff', letterSpacing: '-0.6px',
            lineHeight: 1.15, marginTop: 7, fontVariantNumeric: 'tabular-nums',
          }}>{k.value}</div>
          <div style={{
            fontSize: 12, color: HERO_TXT.faint, marginTop: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{k.sub}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── Small presentational subcomponents (light surfaces) ─────────

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

// Compact session row for "Today's schedule" — time in tabular figures, a
// slim subject bar instead of a dot, status as a soft StatusPill.
const AdminSessionRow = ({ s, last, onClick }) => {
  const status = s.status === 'no_teacher'
    ? <StatusPill tone="warning">No teacher</StatusPill>
    : s.status === 'done'
      ? <StatusPill tone="positive">Attendance taken</StatusPill>
      : <StatusPill tone="neutral">Upcoming</StatusPill>;
  return (
    <HoverRow onClick={onClick} last={last}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.muted, width: 44, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{s.time}</span>
      <span style={{ width: 3, height: 26, borderRadius: 2, background: adminSubjectColor(s.subject), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.subject}</div>
        <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{s.teacher} · {s.room}</div>
      </div>
      {status}
    </HoverRow>
  );
};

// Month-over-month % change from a series (last vs previous point) — used
// for the headline delta on the trend cards. Derived, never invented.
const trendDelta = (arr = []) => {
  if (arr.length < 2 || !arr[arr.length - 2]) return null;
  const prev = arr[arr.length - 2], cur = arr[arr.length - 1];
  return Math.round(((cur - prev) / prev) * 1000) / 10;
};

// Trend card: quiet label → headline number → delta chip → soft area chart.
const TrendCard = ({ label, headline, delta, series, labels, color, onOpen }) => (
  <Card>
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: DS.muted }}>{label}</div>
          <div style={{
            fontSize: 26, fontWeight: 700, color: DS.text, letterSpacing: '-0.6px',
            marginTop: 6, fontVariantNumeric: 'tabular-nums',
          }}>{headline}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 }}>
            {delta != null && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: delta >= 0 ? DS.successBg : DS.dangerBg,
                color: delta >= 0 ? DS.success : DS.danger,
              }}>
                <Icon name={delta >= 0 ? 'trending_up' : 'trending_dn'} size={12} />
                {Math.abs(delta)}%
              </span>
            )}
            <span style={{ fontSize: 12, color: DS.muted }}>vs last month</span>
          </div>
        </div>
        <Btn variant="ghost" icon="chevron_r" small onClick={onOpen}>Reports</Btn>
      </div>
    </div>
    <div style={{ padding: '10px 12px 10px 4px', height: 150 }}>
      <LineChart labels={labels} series={[{ ...series, color }]} height="auto" area />
    </div>
  </Card>
);

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
  const setupDone = 3 - setupRemaining;

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

  // ── Alerts (render a chip only when its count > 0) — all derived ──
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
    { label: 'Active students',   value: String(cm.getActiveStudentCount()), sub: `${cm.getClassEnrolments()} enrolments` },
    { label: 'Attendance (week)', value: `${cm.getAttendanceWeek()}%`,        sub: 'across active students' },
    { label: 'Outstanding',       value: money(invRollup.outstanding),        sub: invRollup.overdue > 0 ? `${money(invRollup.overdue)} overdue` : 'all current' },
    { label: 'Sessions (week)',   value: String(sessions.total),              sub: `${sessions.today} today` },
    { label: 'Capacity used',     value: `${capacity.pct}%`,                  sub: `${capacity.used}/${capacity.cap} seats` },
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
    { id: 'trends',    label: 'Trends',                  hint: 'Enrolment & revenue charts' },
    { id: 'flagged',   label: 'Students needing attention' },
    { id: 'invoices',  label: 'Outstanding invoices' },
    { id: 'activity',  label: 'Recent activity' },
  ];
  const prefs = useDashboardPrefs('tutoros.dash.admin.v1', SECTIONS);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const show = prefs.isOn;

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '32px' }}>
      {/* ── Hero — title, alert chips, KPI stat band on one ink panel ── */}
      <section style={{ ...heroSurface(), marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: HERO_TXT.faint,
            }}>{cm.getActiveCentre().name} · {dateStr}</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '8px 0 0', letterSpacing: '-0.5px' }}>
              Centre overview
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <HeroGhostBtn icon="megaphone" onClick={() => setAnnouncementOpen(true)}>Send announcement</HeroGhostBtn>
            <HeroGhostBtn icon="settings" onClick={() => setCustomiseOpen(true)}>Customise</HeroGhostBtn>
          </div>
        </div>

        {/* Alert chips (hidden entirely if nothing is flagged) */}
        {show('alerts') && alerts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {alerts.map(a => <HeroAlertChip key={a.key} {...a} />)}
          </div>
        )}

        {/* KPI stat band */}
        {show('kpis') && <HeroStatBand stats={kpis} />}
      </section>

      {/* ── Set up your centre (post-signup checklist prompt) ─────── */}
      {setupRemaining > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24,
          padding: '16px 20px', borderRadius: 12,
          background: DS.card, border: `1px solid ${DS.cardBorder}`, boxShadow: DS.cardShadow,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg, ${DS.accent}, ${shadeColor(DS.accent, -18)})`,
            color: '#fff', boxShadow: `0 3px 10px ${DS.accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="zap" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>Finish setting up your centre</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 30, height: 5, borderRadius: 3,
                    background: i < setupDone ? DS.accent : DS.border,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: DS.muted }}>
                {setupRemaining} of 3 steps to go — invite teachers, add students and create classes.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="secondary" icon="send" onClick={() => go('people')}>People &amp; invites</Btn>
            <Btn variant="primary" icon="chevron_r" onClick={() => go('setup')}>Continue setup</Btn>
          </div>
        </div>
      )}

      {/* ── Today's schedule ───────────────────────────────────────── */}
      {show('today') && (
      <Card title="Today's schedule" style={{ marginBottom: 24 }} actions={[
        <StatusPill key="b" tone={todaySessions.length > 0 ? 'accent' : 'neutral'}>{todaySessions.length} sessions</StatusPill>,
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
              <AdminSessionRow key={i} s={s} last={i === Math.min(arr.length, 6) - 1} onClick={() => go('schedule')} />
            ))}
            <SeeAll onClick={() => go('schedule')} />
          </>
        )}
      </Card>
      )}

      {/* ── Trends (two-up: headline number + delta + soft area) ──── */}
      {show('trends') && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {enrolSeries && (
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <TrendCard
              label="Enrolment"
              headline={String(enrolSeries.data[enrolSeries.data.length - 1])}
              delta={trendDelta(enrolSeries.data)}
              series={{ ...enrolSeries, data: last6(enrolSeries.data) }}
              labels={trendLabels}
              color="#0891B2"
              onOpen={() => go('reports')}
            />
          </div>
        )}
        {revSeries && (
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <TrendCard
              label="Revenue billed"
              headline={money(revSeries.data[revSeries.data.length - 1])}
              delta={trendDelta(revSeries.data)}
              series={{ ...revSeries, data: last6(revSeries.data) }}
              labels={trendLabels}
              color={DS.accent}
              onOpen={() => go('reports')}
            />
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
          <StatusPill key="c" tone="warning">{flaggedCount} flagged</StatusPill>,
          <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('students')}>See all</Btn>,
        ]}
      >
        {flaggedRows.slice(0, 6).map((s, i, arr) => {
          const last = i === Math.min(arr.length, 6) - 1;
          return (
            <HoverRow key={s.name} onClick={() => go('students')} last={last}>
              <Avatar name={s.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{s.subject} · {s.reason}</div>
              </div>
              <StatusPill tone={s.severity === 'danger' ? 'negative' : 'warning'} dot>
                {s.severity === 'danger' ? 'Critical' : 'Moderate'}
              </StatusPill>
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </HoverRow>
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
          <Card title="Outstanding invoices" style={{ height: '100%' }} actions={[
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
                  <HoverRow key={i} last={i === Math.min(arr.length, 5) - 1}>
                    <Avatar name={inv.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{inv.name}</div>
                      <div style={{ fontSize: 12, color: DS.muted }}>{inv.class}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, fontVariantNumeric: 'tabular-nums' }}>{inv.amount}</div>
                      <div style={{ fontSize: 11, color: DS.danger }}>{inv.daysOverdue}d overdue</div>
                    </div>
                  </HoverRow>
                ))}
                <SeeAll onClick={() => go('invoices')} />
              </>
            )}
          </Card>
        </div>
        )}

        {/* Recent activity (real — recentActivity mock) as a timeline */}
        {show('activity') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card title="Recent activity" style={{ height: '100%' }}>
            <div style={{ padding: '14px 20px 10px' }}>
              {recentActivity.slice(0, 5).map((a, i, arr) => {
                const tone = a.type === 'alert'
                  ? { dot: DS.danger, ring: DS.dangerBg }
                  : a.type === 'invoice'
                    ? { dot: DS.warning, ring: DS.warningBg }
                    : { dot: DS.success, ring: DS.successBg };
                const isLast = i === arr.length - 1;
                return (
                  <div key={i} style={{ display: 'flex', gap: 13 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10, flexShrink: 0 }}>
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                        background: tone.dot, boxShadow: `0 0 0 3px ${tone.ring}`,
                      }} />
                      {!isLast && <div style={{ width: 2, flex: 1, background: DS.border, margin: '7px 0 3px' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 6 : 18 }}>
                      <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.45 }}>{a.text}</div>
                      <div style={{ fontSize: 11, color: DS.faint, marginTop: 3 }}>{a.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        )}
      </div>
      )}

      {/* ── Customise dashboard modal ─────────────────────────────── */}
      <CustomiseModal open={customiseOpen} onClose={() => setCustomiseOpen(false)} prefs={prefs} />

      {/* ── Announcement modal (shared Modal chrome; behaviour unchanged) ── */}
      <Modal
        open={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
        title="Send announcement"
        subtitle="Sent to all parents and teachers"
        icon="megaphone"
        width={500}
        footer={!announcementSent && (
          <>
            <Btn variant="secondary" onClick={() => setAnnouncementOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon="send" onClick={() => { setAnnouncementSent(true); setTimeout(() => { setAnnouncementOpen(false); setAnnouncementSent(false); }, 1500); }}>
              Send to all
            </Btn>
          </>
        )}
      >
        {announcementSent ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: DS.success }}>
            <Icon name="check" size={32} />
            <div style={{ marginTop: 8, fontWeight: 600 }}>Announcement sent!</div>
          </div>
        ) : (
          <>
            <Field label="Subject">
              <Input placeholder="e.g. Centre closed Monday 28 April" />
            </Field>
            <Field label="Message" style={{ marginBottom: 0 }}>
              <Textarea
                rows={4}
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Write your announcement here..."
              />
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
};

Object.assign(window, { AdminDashboard });
