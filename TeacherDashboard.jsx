// ══════════════════════════════════════════════════════════════
//  Klasio — Teacher Dashboard  (triage layout: today-first)
// ══════════════════════════════════════════════════════════════

// Mock data (todaySchedule, homeworkItems, studentProgress,
// attendanceClass) lives in mocks/teacherDashboard.mock.jsx, loaded
// before this file in index.html. Report drafts come from the shared
// reports store (window.useReportsStore from Reports.jsx).
//
// Presentation refactor only — all data sources, the live "Reports due"
// derivation, attendance state and the lesson-planner globals are kept
// as they were. Layout order: hero (greeting + now/next session +
// later-today, on one dark ink panel) → stat deck (action-item band over
// a KPI stat band, one panel) → two-up preview lists → reports due. Blocks
// with no source
// yet render an empty/TODO state rather than inventing data. Quick
// actions were removed by request (every shortcut had a nav home).
//
// Dark-hero primitives (HERO_TXT, heroSurface, HeroSolidBtn, HeroGhostBtn,
// HoverRow) come from shared.jsx — shared with the admin dashboard.

const TODAY_ISO = '2026-04-25';

// ── Thresholds (brief-defined; reuse if equivalents appear later) ──
const ABSENCE_STREAK  = 3;
const COMPLETION_MIN  = 50;
const SCORE_DROP      = 10;
const UP_NEXT_WINDOW  = 120;   // minutes

// Subject → colour for session / class items. Local helper following
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

// A "Later today" session row inside the dark hero — translucent surface,
// slim subject bar (brightened so it reads on ink), tabular time.
const TLaterRow = ({ s, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: hov ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)', transition: 'background 0.12s',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: HERO_TXT.soft, width: 40, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{s.time}</span>
      <span style={{ width: 3, height: 24, borderRadius: 2, background: shadeColor(teacherSubjectColor(s.subject), 30), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.group}</div>
        <div style={{ fontSize: 11, color: HERO_TXT.faint, marginTop: 1 }}>{s.room} · {s.students} students</div>
      </div>
    </button>
  );
};

// One segment of the action-item band (to mark / feedback / attendance /
// messages). Quiet by default — the icon chip takes its tone colour only when
// there's something to act on, so a zero reads as "done" rather than an alert.
// Its own component so the hover hook is stable regardless of whether the
// parent section is toggled on/off (avoids a Rules-of-Hooks violation).
const TActionCell = ({ icon, count, label, tone = 'accent', onClick }) => {
  const tones = {
    accent:  { bg: DS.accentLight, color: DS.accent },
    warning: { bg: DS.warningBg,   color: DS.warning },
    danger:  { bg: DS.dangerBg,    color: DS.danger },
    info:    { bg: DS.infoBg,      color: DS.info },
  };
  const t = tones[tone] || tones.accent;
  const active = count > 0;
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, minWidth: 0,
        padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
        background: hov ? DS.surface : 'transparent',
        border: 'none', borderLeft: `1px solid ${DS.border}`,
        transition: 'background 0.1s', fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: active ? t.bg : DS.surface,
        color: active ? t.color : DS.faint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
      }}>
        <Icon name={icon} size={17} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.4px',
          color: active ? DS.text : DS.faint, fontVariantNumeric: 'tabular-nums',
        }}>{count}</div>
        <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      </div>
      <span style={{
        display: 'flex', color: DS.faint, flexShrink: 0,
        opacity: hov ? 1 : 0, transform: hov ? 'none' : 'translateX(-3px)',
        transition: 'opacity 0.12s, transform 0.12s',
      }}><Icon name="chevron_r" size={14} /></span>
    </button>
  );
};

// One segment of the KPI stat band — the light-surface sibling of the admin
// hero's HeroStatBand: caps overline, big tabular value with the unit
// de-emphasised, sub-line, and for percentage stats a slim meter in place of
// the old donut ring. Meter tone follows the ScorePill thresholds used
// elsewhere (≥80 healthy, ≥60 watch, else concern) so colour carries meaning
// and appears nowhere else in the band. Each cell deep-links to its screen.
const TKpiCell = ({ k, onClick }) => {
  const [hov, setHov] = React.useState(false);
  const unit = /^(\d+(?:\.\d+)?)%$/.exec(k.value || '');
  const meterCol = k.pct == null ? null : k.pct >= 80 ? DS.success : k.pct >= 60 ? DS.warning : DS.danger;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        textAlign: 'left', minWidth: 0, padding: '18px 20px', cursor: 'pointer',
        background: hov ? DS.surface : 'transparent',
        border: 'none', borderLeft: `1px solid ${DS.border}`,
        transition: 'background 0.1s', fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{k.label}</span>
        <span style={{
          display: 'flex', color: DS.faint, flexShrink: 0,
          opacity: hov ? 1 : 0, transform: hov ? 'none' : 'translateX(-3px)',
          transition: 'opacity 0.12s, transform 0.12s',
        }}><Icon name="chevron_r" size={13} /></span>
      </div>
      <div style={{
        fontSize: 27, fontWeight: 700, color: DS.text, letterSpacing: '-0.6px',
        lineHeight: 1.15, marginTop: 8, fontVariantNumeric: 'tabular-nums',
      }}>
        {unit
          ? <>{unit[1]}<span style={{ fontSize: 15, fontWeight: 600, color: DS.muted, marginLeft: 1 }}>%</span></>
          : k.value}
      </div>
      <div style={{
        fontSize: 12, color: DS.muted, marginTop: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{k.sub}</div>
      {k.pct != null && (
        <div style={{ height: 3, borderRadius: 2, background: DS.border, marginTop: 12, maxWidth: 160, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, k.pct))}%`, height: '100%', borderRadius: 2, background: meterCol }} />
        </div>
      )}
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

  // ── "Reports due" — the ONE due engine (computeUpcomingReports, Reports.jsx),
  // shared with the teacher Reports page + admin overview so no surface can
  // disagree about who is due when. Only students whose policy resolves to
  // Expected get due dates; id-first matching survives display-name typos.
  const TEACHER_NAME = 'Heebz A';   // logged-in teacher in the demo
  const fmtDue = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const reportsDue = (typeof computeUpcomingReports === 'function')
    ? computeUpcomingReports(reportConfig, reportsStore, { teacherName: TEACHER_NAME, today: TODAY_ISO })
    : [];
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
  const toMarkCount    = window.teacherMetrics ? window.teacherMetrics.getToMark() : homeworkItems.reduce((n, h) => n + (h.toMark || 0), 0);
  const attendanceToDo = Object.values(attendance).filter(v => !v).length;
  const reportsToReview = reportDrafts.length;   // draft reports awaiting review
  const unreadMessages = 0;   // TODO: comms unread isn't passed to this page; wire when available
  const actionItems = [
    { icon: 'edit',    count: toMarkCount,        label: 'to mark',           tone: 'accent',  onClick: () => go('homework') },
    { icon: 'file',    count: reportsToReview,    label: 'feedback to review', tone: 'warning', onClick: () => go('reports') },
    { icon: 'check',   count: attendanceToDo,     label: 'attendance to take', tone: 'info',    onClick: () => go('attendance') },
    { icon: 'message', count: unreadMessages,     label: 'unread messages',    tone: 'danger',  onClick: () => go('comms') },
  ];

  // ── KPIs (4) — read from the ONE teacher metrics layer (F2) ────────
  // Every count (students, HW completion, avg attendance, to-mark) comes from
  // window.teacherMetrics so the Dashboard reconciles with My Classes, My
  // Students and Analytics — no screen recomputes its own headcount. Terms:
  // "My students" = distinct HEADS (a student in 3 classes counts once).
  const TM = window.teacherMetrics;
  const tmMetrics = TM ? TM.getMetrics() : null;
  const myStudents = tmMetrics ? tmMetrics.distinctStudents : studentProgress.length;
  const hwCompletion = tmMetrics ? tmMetrics.hwCompletion : (() => {
    const t = homeworkItems.reduce((a, h) => ({ s: a.s + h.submitted, t: a.t + h.total }), { s: 0, t: 0 });
    return t.t ? Math.round(t.s / t.t * 100) : 0;
  })();
  const activeAssignments = tmMetrics ? tmMetrics.activeClasses : homeworkItems.filter(h => h.status === 'open' || h.toMark > 0).length;
  // `pct` re-encodes the same value as a slim meter; `page` is where the cell
  // deep-links. No new data — presentation hints only.
  const kpis = [
    { label: 'My students',    value: String(myStudents), sub: `across ${tmMetrics ? tmMetrics.activeClasses : ''} classes`.trim(), page: 'students' },
    { label: 'HW completion',  value: `${hwCompletion}%`,  sub: 'this term', pct: hwCompletion, page: 'homework' },
    { label: 'Avg attendance', value: tmMetrics ? `${tmMetrics.avgAttendance}%` : '—', sub: tmMetrics ? 'across your students' : 'awaiting register', pct: tmMetrics ? tmMetrics.avgAttendance : null, page: 'attendance' },
    { label: 'Active classes', value: String(tmMetrics ? tmMetrics.activeClasses : activeAssignments), sub: `${tmMetrics ? tmMetrics.enrolments : ''} enrolments`.trim(), page: 'classes' },
  ];

  // ── Students needing attention — reason chip via thresholds ────────
  // Score drop is computable from the score series. Completion/absence
  // per-student data isn't in studentProgress, so we only flag what we can
  // honestly derive (a real score drop ≥ SCORE_DROP) without inventing data.
  // Same rule, same count as My Students (F2/D5): sourced from the shared at-risk
  // selector, so "needing attention" here == "at risk" there. Predicted grade
  // renders on the canonical scale (F3) from the student's raw score + year.
  const needsAttention = (TM ? TM.getAtRiskStudents() : []).map(s => {
    const reason = TM.atRiskReason(s) || 'at risk';
    const tone = /Attendance|Homework/.test(reason) ? 'danger' : 'warning';
    const predicted = window.klasioGrades ? window.klasioGrades.pctToGrade(s.score, { year: s.year }) : '—';
    return {
      name: `${s.firstName} ${s.lastName}`,
      predicted,
      reason: reason.toLowerCase(),
      tone,
      scores: [typeof s.score === 'number' ? s.score : 0],
    };
  });

  // ── Recent submissions — no per-submission source yet ──────────────
  const recentSubmissions = [];   // TODO: wire recent homework submissions

  // ── Per-user customisation — toggle which sections appear ───────
  const SECTIONS = [
    { id: 'today',    label: 'Today',                     hint: 'Current session & later-today' },
    { id: 'actions',  label: 'Action items',              hint: 'To mark, attendance, messages…' },
    { id: 'kpis',     label: 'Key metrics',               hint: 'Students, completion, attendance…' },
    { id: 'attention',label: 'Students needing attention' },
    { id: 'submissions', label: 'Recent submissions' },
    { id: 'reports',  label: 'Reports due' },
  ];
  const prefs = useDashboardPrefs('tutoros.dash.teacher.v1', SECTIONS);
  const [customiseOpen, setCustomiseOpen] = React.useState(false);
  const show = prefs.isOn;

  const hwPct = hwHasDueToday ? Math.round((hwDueToday.submitted / hwDueToday.total) * 100) : 0;

  return (
    <div style={{ padding: '32px' }}>
      {/* Pulse for the "Live now" dot in the hero. */}
      <style>{`@keyframes tosPulseDot {
        0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.45); }
        70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
        100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
      }`}</style>

      {/* ── Hero — greeting + now/next session + later-today on one ink panel ── */}
      <section style={{ ...heroSurface(), marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: HERO_TXT.faint,
            }}>Friday, 25 April 2026 · {classesToday} {classesToday === 1 ? 'class' : 'classes'} today</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '8px 0 0', letterSpacing: '-0.5px' }}>
              Good morning, {TEACHER_NAME.split(' ')[0]}
            </h1>
          </div>
          <HeroGhostBtn icon="settings" onClick={() => setCustomiseOpen(true)}>Customise</HeroGhostBtn>
        </div>

        {/* Now / up next + later today. With no session left (and none later),
            the two columns collapse into one quiet all-clear row. */}
        {show('today') && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 22,
          borderTop: `1px solid ${HERO_TXT.hairline}`, paddingTop: 22,
        }}>
          {!hero ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ADE80',
              }}>
                <Icon name="check" size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {classesToday > 0 ? 'Done for today' : 'No classes today'}
                </div>
                <div style={{ fontSize: 12.5, color: HERO_TXT.faint, marginTop: 2 }}>
                  {classesToday > 0
                    ? `All ${classesToday} ${classesToday === 1 ? 'session' : 'sessions'} wrapped up — nothing else scheduled.`
                    : 'Your timetable is clear — enjoy the breather.'}
                </div>
              </div>
              <HeroGhostBtn icon="calendar" onClick={() => go('timetable')}>View timetable</HeroGhostBtn>
            </div>
          ) : (
          <>
          {/* Current / next session */}
          <div style={{ flex: '1.7 1 320px', minWidth: 0 }}>
            <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {heroIsNow ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 20,
                      background: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.30)',
                      color: '#86EFAC', letterSpacing: '0.03em',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', animation: 'tosPulseDot 2s infinite' }} />
                      LIVE NOW
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
                      color: '#fff', letterSpacing: '0.03em',
                    }}>
                      <Icon name="clock" size={12} />
                      UP NEXT
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, color: HERO_TXT.faint, fontVariantNumeric: 'tabular-nums' }}>{hero.time} · {hero.room}</span>
                </div>

                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginTop: 14 }}>
                  {hero.subject}
                </div>
                <div style={{ fontSize: 13, color: HERO_TXT.soft, marginTop: 4 }}>
                  {hero.group} · {hero.students} students
                </div>

                {/* Homework due today progress strip */}
                {hwHasDueToday ? (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10, margin: '16px 0 18px', maxWidth: 460,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: HERO_TXT.soft }}>Homework due today</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {hwDueToday.submitted}/{hwDueToday.total} submitted
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.14)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${hwPct}%`, height: '100%', background: '#fff', borderRadius: 3 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '11px 14px', borderRadius: 10, margin: '16px 0 18px', maxWidth: 460,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                    fontSize: 12.5, color: HERO_TXT.faint,
                  }}>No homework due today for this class.</div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <HeroSolidBtn icon="check" onClick={() => go('attendance')}>Take attendance</HeroSolidBtn>
                  <HeroGhostBtn icon={hasPlan(hero.group) ? 'eye' : 'edit'} onClick={() => openPlanner(hero.group)}>
                    Open lesson
                  </HeroGhostBtn>
                </div>
            </>
          </div>

          {/* Later today */}
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: HERO_TXT.faint, marginBottom: 10,
            }}>Later today</div>
            {laterSessions.length === 0 ? (
              <div style={{ fontSize: 12.5, color: HERO_TXT.faint, padding: '6px 0' }}>
                Nothing else scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {laterSessions.slice(0, 3).map((s, i) => (
                  <TLaterRow key={i} s={s} onClick={() => openPlanner(s.group)} />
                ))}
                {laterSessions.length > 3 && (
                  <button onClick={() => go('timetable')} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 500, color: HERO_TXT.soft, padding: '4px 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    +{laterSessions.length - 3} more <Icon name="chevron_r" size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>
        )}
      </section>

      {/* ── Stat deck — action items over a KPI band, one panel ─────────
          Both halves share the same column grid so the vertical hairlines
          align; the Card's overflow:hidden clips the -1px divider trick. */}
      {(show('actions') || show('kpis')) && (
      <Card style={{ marginBottom: 24 }}>
        {show('actions') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginLeft: -1 }}>
            {actionItems.map((a, i) => <TActionCell key={i} {...a} />)}
          </div>
        )}
        {show('kpis') && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginLeft: -1,
            borderTop: show('actions') ? `1px solid ${DS.border}` : 'none',
          }}>
            {kpis.map(k => <TKpiCell key={k.label} k={k} onClick={() => go(k.page)} />)}
          </div>
        )}
      </Card>
      )}

      {/* ── Two-up: needs attention · recent submissions ───────────── */}
      {(show('attention') || show('submissions')) && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        {/* Students needing attention */}
        {show('attention') && (
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <Card style={{ height: '100%' }} title="Students needing attention" actions={[
            needsAttention.length > 0 && <StatusPill key="c" tone="warning">{needsAttention.length}</StatusPill>,
            <Btn key="v" variant="ghost" icon="chevron_r" small onClick={() => go('progress')}>See all</Btn>,
          ].filter(Boolean)}>
            {needsAttention.length === 0 ? (
              <div style={{ padding: '18px 20px', fontSize: 13, color: DS.muted }}>
                No students currently flagged — scores are holding steady.
              </div>
            ) : (
              <>
                {needsAttention.slice(0, 6).map((s, i, arr) => (
                  <HoverRow key={s.name} onClick={() => go('progress')} last={i === Math.min(arr.length, 6) - 1}>
                    <Avatar name={s.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>Predicted {s.predicted}</div>
                    </div>
                    <StatusPill tone={s.tone === 'danger' ? 'negative' : 'warning'}>{s.reason}</StatusPill>
                    <ScorePill score={s.scores[s.scores.length - 1]} />
                  </HoverRow>
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
          <Card style={{ height: '100%' }} title="Recent submissions" actions={[
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
                  <HoverRow key={i} last={i === Math.min(arr.length, 5) - 1}>
                    <Avatar name={r.student} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.student}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted }}>{r.assignment}</div>
                    </div>
                    <span style={{ fontSize: 11.5, color: DS.faint }}>{r.time}</span>
                  </HoverRow>
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
            ? <StatusPill key="o" tone="negative" dot>{dueOverdue} overdue</StatusPill>
            : reportsDue.length > 0
              ? <StatusPill key="b" tone="accent">{reportsDue.length} upcoming</StatusPill>
              : <StatusPill key="b" tone="positive">Nothing due</StatusPill>,
          reportDrafts.length > 0 && <StatusPill key="d" tone="warning">{reportDrafts.length} draft{reportDrafts.length !== 1 ? 's' : ''}</StatusPill>,
          <Btn key="v" variant="ghost" icon="eye" small onClick={() => go('reports')}>View all</Btn>,
        ].filter(Boolean)}
      >
        <div>
          {reportsDue.length === 0 && (
            <div style={{ padding: '18px 20px', fontSize: 13, color: DS.muted }}>No reports due — no student you teach is expected a report right now, or everyone is up to date.</div>
          )}
          {reportsDue.slice(0, 6).map((d, i, arr) => (
            <HoverRow key={d.id} onClick={() => go('reports')} last={i === Math.min(arr.length, 6) - 1} pad="13px 20px">
              <Avatar name={d.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rptFreqLabel(d.frequency)} report — {d.name}
                </div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{d.templateName} · {d.source}</div>
              </div>
              {d.overdue
                ? <StatusPill tone="negative" dot>Overdue · was {fmtDue(d.due)}</StatusPill>
                : <StatusPill tone="neutral">Due {fmtDue(d.due)}</StatusPill>}
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </HoverRow>
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
