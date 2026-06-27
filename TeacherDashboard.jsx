// ══════════════════════════════════════════════════════════════
//  TutorOS — Teacher Dashboard  (triage layout: today-first)
// ══════════════════════════════════════════════════════════════

// Mock data (todaySchedule, homeworkItems, studentProgress,
// attendanceClass) lives in mocks/teacherDashboard.mock.jsx, loaded
// before this file in index.html. Report drafts come from the shared
// reports store (window.useReportsStore from Reports.jsx).
//
// Presentation refactor only — all data sources, the live "Reports due"
// derivation, attendance state and the lesson-planner globals are kept
// as they were. New layout order: today (hero + later) → action items →
// quick actions → KPIs → two-up preview lists. Blocks with no source yet
// render an empty/TODO state rather than inventing data.

const TODAY_ISO = '2026-04-25';

// ── Thresholds (brief-defined; reuse if equivalents appear later) ──
const ABSENCE_STREAK  = 3;
const COMPLETION_MIN  = 50;
const SCORE_DROP      = 10;
const UP_NEXT_WINDOW  = 120;   // minutes

// Subject → dot colour for session / class items. Local helper following
// the existing per-file convention (no shared exported subjectColor).
const teacherSubjectColor = (subj = '') =>
  subj.includes('A-Level') ? '#7C3AED' :
  subj.includes('Physics') ? '#0891B2' :
  subj.includes('Science') ? '#0891B2' :
  subj.includes('English') ? '#D97706' :
  DS.accent;

// ── Small presentational subcomponents ─────────────────────────────

// "See all →" footer link, used at the foot of preview lists.
const TSeeAll = ({ label = 'See all', onClick }) => {
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

// A small "Later today" session card (right column of the hero block).
const SessionCard = ({ s, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: '11px 12px', borderRadius: 9, cursor: 'pointer',
    background: DS.bg, border: `1px solid ${DS.border}`,
  }}>
    <span style={{ fontSize: 12.5, fontWeight: 500, color: DS.text, width: 42, flexShrink: 0 }}>{s.time}</span>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: teacherSubjectColor(s.subject), flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.group}</div>
      <div style={{ fontSize: 11, color: DS.muted }}>{s.room} · {s.students} students</div>
    </div>
  </button>
);

// One action-item tile (to mark / AI feedback / attendance / messages).
// Quiet by default — colour shows only when there's something to act on, so a
// zero reads as "done" rather than an alert.
const ActionTile = ({ icon, count, label, tone = 'accent', onClick }) => {
  const tones = { accent: DS.accent, warning: DS.warning, danger: DS.danger, info: DS.info };
  const active = count > 0;
  const toneColor = tones[tone] || DS.accent;
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 160px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 18px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
        background: DS.card, border: `1px solid ${hov ? DS.borderDark : DS.cardBorder}`,
        boxShadow: DS.cardShadow, transition: 'border-color 0.14s ease',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: DS.surface, color: active ? toneColor : DS.faint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: active ? DS.text : DS.faint, lineHeight: 1, letterSpacing: '-0.4px' }}>{count}</div>
        <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 4 }}>{label}</div>
      </div>
    </button>
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
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 160px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', border: 'none', background: hov ? DS.surface : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        borderRight: divider ? `1px solid ${DS.border}` : 'none',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        background: DS.accentLight, color: DS.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={action.icon} size={14} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{action.label}</span>
    </button>
  );
};

const TeacherDashboard = () => {
  // Tick when a plan is created/edited elsewhere so badges update on return.
  const [, setPlanTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setPlanTick(t => t + 1);
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);
  const hasPlan = (group) => {
    const store = window.__lessonPlans || {};
    return !!store[`${group}__${TODAY_ISO}`];
  };
  const openPlanner = (group) => {
    if (window.__openLessonPlanner) {
      window.__openLessonPlanner(group, TODAY_ISO, hasPlan(group) ? 'view' : 'edit');
    }
  };
  const go = (pg) => window.__navigate && window.__navigate('teacher', pg);

  const [attendance, setAttendance] = React.useState(
    Object.fromEntries(attendanceClass.students.map(s => [s.name, s.status]))
  );
  const reportsStore = useReportsStore();
  const reportConfig = reportsStore.store.config;
  const reportDrafts = reportsStore.reportsArr.filter(r => r.status === 'draft');

  // ── "Reports due" — derived live from the resolved reporting rules ──
  // For each of this teacher's students, resolve the effective policy; skip OFF;
  // compute a due date from the cadence + the last published report; flag overdue.
  const TEACHER_NAME = 'Sarah Clarke';   // logged-in teacher in the demo
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmtDue = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const reportsDue = (() => {
    if (typeof resolveForStudent !== 'function' || typeof reportStudents !== 'function') return [];
    const myClassIds = (typeof reportClasses === 'function' ? reportClasses() : [])
      .filter(c => c.teacher === TEACHER_NAME).map(c => c.id);
    const mine = reportStudents().filter(s => (s.classIds || []).some(id => myClassIds.includes(id)));
    return mine.map(s => {
      const pol = resolveForStudent(s, reportConfig);
      if (pol.requirement === 'OFF') return null;
      const name = `${s.firstName} ${s.lastName}`;
      const last = reportsStore.reportsArr
        .filter(r => r.studentName === name && r.status === 'published' && r.datePublished)
        .sort((a, b) => b.datePublished.localeCompare(a.datePublished))[0];
      const base = last ? last.datePublished : '2026-03-15';   // notional last cycle
      const due = addDays(base, rptFreqDays(pol.frequency));
      const tpl = reportsStore.store.templates.find(t => t.id === pol.templateId);
      return { id: s.id, name, requirement: pol.requirement, frequency: pol.frequency,
        templateName: tpl ? tpl.name : 'report', due, overdue: due < TODAY_ISO, source: pol.source };
    }).filter(Boolean).sort((a, b) => (a.overdue === b.overdue ? a.due.localeCompare(b.due) : a.overdue ? -1 : 1));
  })();
  const dueOverdue = reportsDue.filter(d => d.overdue).length;

  // ── Today — hero (current/next) + later-today ──────────────────────
  // todaySchedule carries status completed/current/upcoming. The hero shows
  // the current session, else the next upcoming one. "Later" = the rest.
  const classesToday = todaySchedule.length;
  const currentIdx = todaySchedule.findIndex(c => c.status === 'current');
  const heroIdx = currentIdx !== -1 ? currentIdx : todaySchedule.findIndex(c => c.status === 'upcoming');
  const hero = heroIdx !== -1 ? todaySchedule[heroIdx] : null;
  const laterSessions = hero
    ? todaySchedule.filter((c, i) => i > heroIdx && c.status !== 'completed')
    : [];
  const heroIsNow = hero && hero.status === 'current';

  // Homework due today — aggregate from homeworkItems whose due date is today.
  const fmtToday = new Date(TODAY_ISO + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const dueTodayHw = homeworkItems.filter(h => h.due === fmtToday);
  const hwDueToday = dueTodayHw.reduce(
    (acc, h) => ({ submitted: acc.submitted + h.submitted, total: acc.total + h.total }),
    { submitted: 0, total: 0 }
  );
  const hwHasDueToday = hwDueToday.total > 0;

  // ── Action items (4 tiles) ─────────────────────────────────────────
  const toMarkCount    = homeworkItems.reduce((n, h) => n + (h.toMark || 0), 0);
  const attendanceToDo = Object.values(attendance).filter(v => !v).length;
  const aiFeedbackToReview = reportDrafts.length;   // closest wired proxy: draft reports awaiting review
  const unreadMessages = 0;   // TODO: comms unread isn't passed to this page; wire when available
  const actionItems = [
    { icon: 'edit',    count: toMarkCount,        label: 'to mark',           tone: 'accent',  onClick: () => go('homework') },
    { icon: 'file',    count: aiFeedbackToReview, label: 'feedback to review', tone: 'warning', onClick: () => go('reports') },
    { icon: 'check',   count: attendanceToDo,     label: 'attendance to take', tone: 'info',    onClick: () => go('attendance') },
    { icon: 'message', count: unreadMessages,     label: 'unread messages',    tone: 'danger',  onClick: () => go('comms') },
  ];

  const quickActions = [
    { icon: 'plus',    label: 'New homework',     onClick: () => go('homework') },
    { icon: 'message', label: 'Message class',    onClick: () => go('comms') },
    { icon: 'check',   label: 'Mark register',     onClick: () => go('attendance') },
    { icon: 'bell',    label: 'Send announcement', onClick: () => go('comms') },
  ];

  // ── KPIs (4) ───────────────────────────────────────────────────────
  const myStudents = studentProgress.length;
  const hwTotals = homeworkItems.reduce(
    (acc, h) => ({ submitted: acc.submitted + h.submitted, total: acc.total + h.total }),
    { submitted: 0, total: 0 }
  );
  const hwCompletion = hwTotals.total ? Math.round((hwTotals.submitted / hwTotals.total) * 100) : 0;
  const activeAssignments = homeworkItems.filter(h => h.status === 'open' || h.toMark > 0).length;
  const dueThisWeek = homeworkItems.length;   // every listed assignment is in the current window
  const kpis = [
    { label: 'My students',        value: String(myStudents), sub: 'across my classes', icon: 'users', iconBg: DS.accentLight, accent: DS.accent },
    { label: 'HW completion',      value: `${hwCompletion}%`,  trend: '-4% vs last wk',  trendDir: 'down', icon: 'clip', iconBg: DS.warningBg, accent: DS.warning },
    { label: 'Avg attendance',     value: '—',                 sub: 'awaiting register',  icon: 'check', iconBg: DS.successBg, accent: DS.success }, // TODO: wire avg attendance
    { label: 'Active assignments', value: String(activeAssignments), sub: `${dueThisWeek} due this week`, icon: 'calendar', iconBg: DS.infoBg, accent: DS.info },
  ];

  // ── Students needing attention — reason chip via thresholds ────────
  // Score drop is computable from the score series. Completion/absence
  // per-student data isn't in studentProgress, so we only flag what we can
  // honestly derive (a real score drop ≥ SCORE_DROP) without inventing data.
  const needsAttention = studentProgress.map(s => {
    const n = s.scores.length;
    const drop = n >= 2 ? s.scores[n - 2] - s.scores[n - 1] : 0;
    if (s.trend === 'down' && drop >= SCORE_DROP) return { ...s, reason: 'score drop', tone: 'danger' };
    if (s.trend === 'down') return { ...s, reason: 'declining', tone: 'warning' };
    return null;
  }).filter(Boolean);

  // ── Recent submissions — no per-submission source yet ──────────────
  const recentSubmissions = [];   // TODO: wire recent homework submissions

  // ── Per-user customisation — toggle which sections appear ───────
  const SECTIONS = [
    { id: 'today',    label: 'Today',                     hint: 'Current session & later-today' },
    { id: 'actions',  label: 'Action items',              hint: 'To mark, attendance, messages…' },
    { id: 'quick',    label: 'Quick actions',             hint: 'Common shortcuts' },
    { id: 'kpis',     label: 'Key metrics',               hint: 'Students, completion, attendance…' },
    { id: 'attention',label: 'Students needing attention' },
    { id: 'submissions', label: 'Recent submissions' },
    { id: 'reports',  label: 'Reports due' },
  ];
  const prefs = useDashboardPrefs('tutoros.dash.teacher.v1', SECTIONS);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const show = prefs.isOn;

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title={`Good morning, ${TEACHER_NAME.split(' ')[0]}`}
        subtitle={`Friday, 25 April 2026 · ${classesToday} ${classesToday === 1 ? 'class' : 'classes'} today`}
        actions={[
          <Btn key="cust" variant="secondary" icon="settings" small onClick={() => setCustomiseOpen(true)}>Customise</Btn>,
        ]}
      />

      {/* ── Today — hero + later-today ─────────────────────────────── */}
      {show('today') && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {/* Hero — current / next session. Stands out via elevation + type, not colour. */}
        <div style={{ flex: '2 1 300px', minWidth: 0 }}>
          <Card style={{ height: '100%', boxShadow: hero ? DS.cardShadowHi : DS.cardShadow }}>
            {hero ? (
              <div style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: DS.accentLight, color: DS.accent, border: `1px solid ${DS.accentBorder}`,
                  }}>
                    <Icon name="clock" size={12} />
                    {heroIsNow ? 'Now' : 'Up next'}
                  </span>
                  <span style={{ fontSize: 12.5, color: DS.muted }}>{hero.time} · {hero.room}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: teacherSubjectColor(hero.subject), flexShrink: 0 }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: DS.text, letterSpacing: '-0.4px' }}>{hero.subject}</span>
                </div>
                <div style={{ fontSize: 13.5, color: DS.muted, marginBottom: 18 }}>
                  {hero.group} · {hero.students} students
                </div>

                {/* Homework due today progress strip */}
                {hwHasDueToday ? (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                    background: DS.surface, border: `1px solid ${DS.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: DS.sub }}>Homework due today</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.text }}>{hwDueToday.submitted}/{hwDueToday.total} submitted</span>
                    </div>
                    <div style={{ height: 6, background: DS.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round((hwDueToday.submitted / hwDueToday.total) * 100)}%`,
                        height: '100%', background: DS.accent, borderRadius: 3,
                      }} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '11px 14px', borderRadius: 10, marginBottom: 18,
                    background: DS.surface, border: `1px solid ${DS.border}`,
                    fontSize: 12.5, color: DS.muted,
                  }}>No homework due today for this class.</div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn variant="primary" icon="check" onClick={() => go('attendance')}>Take attendance</Btn>
                  <Btn variant="secondary" icon={hasPlan(hero.group) ? 'eye' : 'edit'} onClick={() => openPlanner(hero.group)}>
                    Open lesson
                  </Btn>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title="Done for today"
                message="You have no more sessions scheduled today."
              />
            )}
          </Card>
        </div>

        {/* Later today */}
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <Card title="Later today" style={{ height: '100%' }}>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {laterSessions.length === 0 ? (
                <div style={{ padding: '20px 6px', textAlign: 'center', fontSize: 12.5, color: DS.muted }}>
                  Done for today
                </div>
              ) : (
                <>
                  {laterSessions.slice(0, 3).map((s, i) => (
                    <SessionCard key={i} s={s} onClick={() => openPlanner(s.group)} />
                  ))}
                  {laterSessions.length > 3 && (
                    <button onClick={() => go('timetable')} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 500, color: DS.accent, padding: '6px 4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      +{laterSessions.length - 3} more <Icon name="chevron_r" size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* ── Action items (4 tiles) ─────────────────────────────────── */}
      {show('actions') && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {actionItems.map((a, i) => <ActionTile key={i} {...a} />)}
      </div>
      )}

      {/* ── Quick actions row ──────────────────────────────────────── */}
      {show('quick') && (
      <Card title="Quick actions" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {quickActions.map((a, i) => (
            <QuickActionRow key={a.label} action={a} divider={i < quickActions.length - 1} />
          ))}
        </div>
      </Card>
      )}

      {/* ── KPI cards (4) ──────────────────────────────────────────── */}
      {show('kpis') && (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>
      )}

      {/* ── Two-up: needs attention · recent submissions ───────────── */}
      {(show('attention') || show('submissions')) && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {/* Students needing attention */}
        {show('attention') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card title="Students needing attention" actions={[
            needsAttention.length > 0 && <Badge key="c" variant="warning">{needsAttention.length}</Badge>,
            <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('progress')}>See all</Btn>,
          ].filter(Boolean)}>
            {needsAttention.length === 0 ? (
              <div style={{ padding: '18px 16px', fontSize: 13, color: DS.muted }}>
                No students currently flagged — scores are holding steady.
              </div>
            ) : (
              <>
                {needsAttention.slice(0, 6).map((s, i, arr) => (
                  <div key={s.name} onClick={() => go('progress')} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', cursor: 'pointer',
                    borderBottom: i < Math.min(arr.length, 6) - 1 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <Avatar name={s.name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted }}>Predicted {s.predicted}</div>
                    </div>
                    <Badge variant={s.tone === 'danger' ? 'danger' : 'warning'}>{s.reason}</Badge>
                    <ScorePill score={s.scores[s.scores.length - 1]} />
                  </div>
                ))}
                {needsAttention.length > 6 && <TSeeAll onClick={() => go('progress')} />}
              </>
            )}
          </Card>
        </div>
        )}

        {/* Recent submissions */}
        {show('submissions') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card title="Recent submissions" actions={[
            <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('homework')}>See all</Btn>,
          ]}>
            {recentSubmissions.length === 0 ? (
              <EmptyState
                icon="clip"
                title="No recent submissions to show"
                message="The latest homework submissions will appear here once the homework store is connected."
                action={<Btn variant="secondary" icon="clip" small onClick={() => go('homework')}>Open homework</Btn>}
              />
            ) : (
              <>
                {recentSubmissions.slice(0, 5).map((r, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
                    borderBottom: i < Math.min(arr.length, 5) - 1 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <Avatar name={r.student} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{r.student}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted }}>{r.assignment}</div>
                    </div>
                    <span style={{ fontSize: 11.5, color: DS.faint }}>{r.time}</span>
                  </div>
                ))}
                <TSeeAll onClick={() => go('homework')} />
              </>
            )}
          </Card>
        </div>
        )}
      </div>
      )}

      {/* ── Reports due (driven by the centre's resolved reporting rules) ── */}
      {show('reports') && (
      <Card
        title="Reports due"
        actions={[
          dueOverdue > 0
            ? <Badge key="o" variant="danger"><Icon name="flag" size={11} /> {dueOverdue} overdue</Badge>
            : reportsDue.length > 0
              ? <Badge key="b" variant="accent"><Icon name="clock" size={11} /> {reportsDue.length} upcoming</Badge>
              : <Badge key="b" variant="success"><Icon name="check" size={11} /> Nothing due</Badge>,
          reportDrafts.length > 0 && <Badge key="d" variant="warning"><Icon name="edit" size={11} /> {reportDrafts.length} draft{reportDrafts.length !== 1 ? 's' : ''}</Badge>,
          <Btn key="v" variant="ghost" icon="eye" small onClick={() => go('reports')}>View all</Btn>,
        ].filter(Boolean)}
      >
        <div>
          {reportsDue.length === 0 && (
            <div style={{ padding: '18px 16px', fontSize: 13, color: DS.muted }}>No reports due — every student you teach resolves to optional or off, or is already up to date.</div>
          )}
          {reportsDue.slice(0, 6).map((d, i, arr) => (
            <div key={d.id} onClick={() => go('reports')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer',
                borderBottom: i < Math.min(arr.length, 6) - 1 ? `1px solid ${DS.border}` : 'none' }}>
              <Avatar name={d.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{rptFreqLabel(d.frequency)} report — {d.name}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{d.templateName} · {d.source}{d.requirement === 'OPTIONAL' ? ' · optional' : ''}</div>
              </div>
              {d.overdue
                ? <Badge variant="danger">Overdue · was {fmtDue(d.due)}</Badge>
                : <Badge variant="default">Due {fmtDue(d.due)}</Badge>}
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </div>
          ))}
        </div>
      </Card>
      )}

      {/* ── Customise dashboard modal ─────────────────────────────── */}
      <CustomiseModal open={customiseOpen} onClose={() => setCustomiseOpen(false)} prefs={prefs} />
    </div>
  );
};

Object.assign(window, { TeacherDashboard });
