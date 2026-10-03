// ══════════════════════════════════════════════════════════════
//  Klasio — Teacher Dashboard  (triage layout: today-first)
// ══════════════════════════════════════════════════════════════

// The hero reads the materialised sessions (attendance.jsx) for the teacher's
// classes on the shared clock, the admin store's leave + cover, the homework
// selector and the lessons store — no schedule mock. `homeworkItems` and
// `studentProgress` (mocks/teacherDashboard.mock.jsx) remain only as the
// fallbacks for when the metrics layer is absent. Report drafts come from the
// shared reports store (window.useReportsStore from Reports.jsx).
//
// Layout order: hero (greeting + a state machine — on leave / live / register
// overdue / up next / done / none — plus later-today, on one dark ink panel) →
// stat deck (action-item band over a KPI stat band, one panel) → two-up preview
// lists → reports due. Blocks with no source yet render an empty/TODO state
// rather than inventing data. Quick actions were removed by request (every
// shortcut had a nav home).
//
// Dark-hero primitives (HERO_TXT, heroSurface, HeroSolidBtn, HeroGhostBtn,
// HoverRow) come from shared.jsx — shared with the admin dashboard.

// "Today" is the one injectable clock (window.getNow, mocks/attendance.mock.jsx)
// that Attendance and the Timetable also read — so the hero can never disagree
// with them about what is on, what is live and which registers are overdue.
const tdNow = () => (window.getNow ? window.getNow() : Date.now());
const tdIso = (ms) => (window.attIso ? window.attIso(new Date(ms)) : new Date(ms).toISOString().slice(0, 10));

// ── Thresholds (brief-defined; reuse if equivalents appear later) ──
const ABSENCE_STREAK  = 3;
const COMPLETION_MIN  = 50;
const SCORE_DROP      = 10;
const UP_NEXT_WINDOW  = 120;   // minutes

// ── The teacher's day — derived from the materialised sessions ─────
// Sessions this teacher is the EFFECTIVE teacher for (own classes minus any a
// colleague is covering, plus classes they cover), over the last week and today.
// Cancelled sessions are kept aside rather than dropped, so the hero can say
// "1 cancelled" instead of silently presenting fewer classes.
const buildTeacherDay = ({ store, att, now, me }) => {
  const todayISO = tdIso(now);
  const eff = (cls, iso) => (typeof effectiveTeacher === 'function' ? effectiveTeacher(cls, iso) : cls.teacher);
  const cov = (cls, iso) => (typeof coverActive === 'function' ? coverActive(cls, iso) : null);
  const leave = ((store.holidays || {})[me.id] || []).find(h => (!h.from || todayISO >= h.from) && (!h.to || todayISO <= h.to)) || null;
  const inLeave = (iso) => ((store.holidays || {})[me.id] || []).some(h => (!h.from || iso >= h.from) && (!h.to || iso <= h.to));

  const candidates = (store.classes || []).filter(c => c.status !== 'paused' && c.status !== 'archived'
    && (c.teacher === me.name || (c.cover && c.cover.teacher === me.name)));
  const all = (window.materialiseSessions && att)
    ? window.materialiseSessions(candidates, window.REGISTER_SETTINGS, now, att, { backDays: 7, fwdDays: 0 })
    : [];
  const mine = all.filter(s => eff(s.cls, s.dateISO) === me.name).map(s => {
    const cv = cov(s.cls, s.dateISO);
    return { ...s, coveringFor: (cv && s.cls.teacher !== me.name) ? s.cls.teacher : null };
  });
  const byStart = (a, b) => a.starts_at - b.starts_at;
  const todayAll = mine.filter(s => s.dateISO === todayISO).sort(byStart);
  const today = todayAll.filter(s => s.status !== 'cancelled');
  const cancelledToday = todayAll.filter(s => s.status === 'cancelled');
  // Overdue = a register still inside its backfill window (takeable, flagged late).
  // Sessions inside booked leave never count as missed. Soonest-to-close first.
  const overdue = mine.filter(s => s.derived.state === 'awaiting' && !inLeave(s.dateISO))
    .sort((a, b) => (a.derived.backfillEnd || 0) - (b.derived.backfillEnd || 0));
  const locked = mine.filter(s => s.derived.state === 'lapsed' && !inLeave(s.dateISO));
  const live = today.find(s => now >= s.starts_at && now <= s.ends_at) || null;
  const next = today.find(s => s.starts_at > now) || null;
  // While on leave, who is taking each of this teacher's own classes that still
  // meet before the leave ends (a one-day absence only concerns that weekday).
  const leaveDays = new Set();
  if (leave) {
    for (let i = 0; i < 7; i++) {
      const iso = tdIso(now + i * 86400000);
      if (leave.to && iso > leave.to) break;
      leaveDays.add(new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' }));
    }
  }
  const coverage = leave ? (store.classes || [])
    .filter(c => c.teacher === me.name && c.status !== 'paused' && c.status !== 'archived' && leaveDays.has(c.day))
    .map(c => ({ cls: c, cover: cov(c, todayISO) || (c.cover && leave.to && c.cover.from <= leave.to && (!c.cover.to || c.cover.to >= todayISO) ? c.cover : null) })) : [];
  return { todayISO, leave, coverage, today, cancelledToday, overdue, locked, live, next };
};

// ── Hero state machine ─────────────────────────────────────────────
// The first state whose test matches wins. The ORDER is the product decision
// (decision #45): a class running right now beats a register that can still be
// backfilled for hours, but an overdue register outranks a class that starts
// later — it is the one thing worth interrupting a teacher about.
const HERO_STATES = [
  { id: 'on_leave', test: d => !!d.leave },
  { id: 'live',     test: d => !!d.live },
  { id: 'overdue',  test: d => d.overdue.length > 0 },
  { id: 'up_next',  test: d => !!d.next },
  { id: 'done',     test: d => d.today.length > 0 },
  { id: 'none',     test: () => true },
];
const resolveHeroState = (day) => HERO_STATES.find(s => s.test(day)).id;

const tdGreeting = (ms) => { const h = new Date(ms).getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const tdClock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const tdDayLabel = (iso, todayISO) => {
  if (iso === todayISO) return 'today';
  const d = new Date(iso + 'T00:00:00');
  const t = new Date(todayISO + 'T00:00:00');
  const diff = Math.round((t - d) / 86400000);
  if (diff === 1) return 'yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};
// "closes in 1 day 4h" / "closes in 3h" — the backfill window ticking down.
const tdClosesIn = (endMs, now) => {
  const mins = Math.max(0, Math.round((endMs - now) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return `${d} day${d === 1 ? '' : 's'}${h ? ` ${h}h` : ''}`;
  if (h > 0) return `${h}h${m ? ` ${m}m` : ''}`;
  return `${m}m`;
};
const tdFmtLong = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

// Open the register for one session (Attendance reads window.__registerSession).
const tdOpenRegister = (session) => {
  if (session) window.__registerSession = session.id;
  if (window.__navigate) window.__navigate('teacher', 'attendance');
};

// A pill in the hero ("LIVE NOW", "UP NEXT", "REGISTER OVERDUE", "ON LEAVE").
const THeroPill = ({ tone = 'neutral', icon, pulse, children }) => {
  const tones = {
    live:    { bg: 'rgba(74,222,128,0.14)', bd: 'rgba(74,222,128,0.30)', fg: '#86EFAC' },
    warn:    { bg: 'rgba(251,191,36,0.14)', bd: 'rgba(251,191,36,0.34)', fg: '#FCD34D' },
    neutral: { bg: 'rgba(255,255,255,0.08)', bd: 'rgba(255,255,255,0.16)', fg: '#fff' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 20,
      background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, letterSpacing: '0.03em',
    }}>
      {pulse && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', animation: 'tosPulseDot 2s infinite' }} />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
};

// The quiet one-column hero rows (on leave / done / none): icon tile + copy + action.
const THeroQuiet = ({ icon, iconColor = '#4ADE80', title, children, action }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor,
    }}>
      <Icon name={icon} size={20} />
    </div>
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: HERO_TXT.faint, marginTop: 2, lineHeight: 1.5 }}>{children}</div>
    </div>
    {action}
  </div>
);

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
      <span style={{ fontSize: 12, fontWeight: 600, color: HERO_TXT.soft, width: 40, flexShrink: 0, fontVariantNumeric: 'tabular-nums', textDecoration: s.cancelled ? 'line-through' : 'none' }}>{s.time}</span>
      <span style={{ width: 3, height: 24, borderRadius: 2, background: s.cancelled ? 'rgba(255,255,255,0.2)' : shadeColor(teacherSubjectColor(s.subject), 30), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, opacity: s.cancelled ? 0.6 : 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.group}</div>
        <div style={{ fontSize: 11, color: HERO_TXT.faint, marginTop: 1 }}>
          {s.cancelled ? 'Cancelled' : `${s.room} · ${s.students} students`}{s.coveringFor ? ` · covering for ${s.coveringFor}` : ''}
        </div>
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
  const now = tdNow();
  const TODAY_ISO = tdIso(now);
  // A delivery (planned lesson) is keyed by class id + date — never the group label.
  const hasPlan = (classId, date = TODAY_ISO) => !!(window.klasioLessons && window.klasioLessons.deliveryFor(classId, date));
  const openPlanner = (classId, date = TODAY_ISO) => {
    if (window.__openLessonPlanner) window.__openLessonPlanner(classId, date, hasPlan(classId, date) ? 'view' : 'edit');
  };
  const go = (pg) => window.__navigate && window.__navigate('teacher', pg);

  const adminStore = useAdminStore();
  const att = window.useAttendanceStore ? window.useAttendanceStore() : null;
  const principal = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : { id: 't1', name: 'Heebz A' };
  const me = (adminStore.teachers || []).find(t => t.id === principal.id) || principal;
  const day = buildTeacherDay({ store: adminStore, att, now, me });
  const heroState = resolveHeroState(day);
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

  // ── Today — the hero session + later-today rail ────────────────────
  // The session the hero is about: the live one, else the overdue register, else
  // the next one. "Later today" = today's sessions still to start after it
  // (cancelled ones listed, struck through, so the count never silently shrinks).
  const classesToday = day.today.length;
  const heroSession = heroState === 'live' ? day.live
    : heroState === 'overdue' ? day.overdue[0]
    : heroState === 'up_next' ? day.next : null;
  const toRow = (s, cancelled) => ({
    id: s.id, classId: s.classId, time: tdClock(s.starts_at), group: s.group, subject: s.name,
    room: s.room, students: s.cls.students, coveringFor: s.coveringFor, cancelled,
  });
  const laterSessions = [
    ...day.today.filter(s => s.starts_at > now && (!heroSession || s.id !== heroSession.id)).map(s => toRow(s, false)),
    ...day.cancelledToday.filter(s => s.starts_at > now).map(s => toRow(s, true)),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Homework due today for the hero class — from the one homework selector.
  const hwForHero = heroSession && heroState !== 'overdue' && window.klasioHomework
    ? window.klasioHomework.listClassHomework(heroSession.group).filter(h => h.dueAt && h.dueAt.slice(0, 10) === TODAY_ISO)
    : [];
  const hwDueToday = hwForHero.reduce((acc, h) => ({ submitted: acc.submitted + h.submitted, total: acc.total + h.total }), { submitted: 0, total: 0 });
  const hwHasDueToday = hwDueToday.total > 0;

  // ── Action items (4 tiles) ─────────────────────────────────────────
  const toMarkCount    = window.teacherMetrics ? window.teacherMetrics.getToMark() : homeworkItems.reduce((n, h) => n + (h.toMark || 0), 0);
  // Same list the Attendance page's "Needs register" shows: backfillable + locked.
  const attendanceToDo = day.overdue.length + day.locked.length;
  const reportsToReview = reportDrafts.length;   // draft reports awaiting review
  const unreadMessages = 0;   // TODO: comms unread isn't passed to this page; wire when available
  const actionItems = [
    { icon: 'edit',    count: toMarkCount,        label: 'to mark',           tone: 'accent',  onClick: () => go('homework') },
    { icon: 'file',    count: reportsToReview,    label: 'feedback to review', tone: 'warning', onClick: () => go('reports') },
    { icon: 'check',   count: attendanceToDo,     label: 'attendance to take', tone: 'info',    onClick: () => go('attendance') },
    { icon: 'message', count: unreadMessages,     label: 'unread messages',    tone: 'danger',  onClick: () => go('comms:messages') },
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
    const attn = window.studentAttainment(s);
    const predicted = (attn != null && window.klasioGrades) ? window.klasioGrades.pctToGrade(attn, { year: s.year }) : '—';
    return {
      name: `${s.firstName} ${s.lastName}`,
      predicted,
      reason: reason.toLowerCase(),
      tone,
      attainment: attn,
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
    <div style={pageFrame()}>
      {/* Pulse for the "Live now" dot in the hero. */}
      <style>{`@keyframes tosPulseDot {
        0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.45); }
        70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
        100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
      }`}</style>

      {/* ── Hero — greeting + the state-machine panel on one ink surface ── */}
      <section style={{ ...heroSurface(), marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: HERO_TXT.faint,
            }}>
              {new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {day.leave ? ' · on leave' : ` · ${classesToday} ${classesToday === 1 ? 'class' : 'classes'} today`}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '8px 0 0', letterSpacing: '-0.5px' }}>
              {tdGreeting(now)}, {String(me.name || TEACHER_NAME).split(' ')[0]}
            </h1>
          </div>
          <HeroGhostBtn icon="settings" onClick={() => setCustomiseOpen(true)}>Customise</HeroGhostBtn>
        </div>

        {show('today') && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 22,
          borderTop: `1px solid ${HERO_TXT.hairline}`, paddingTop: 22,
        }}>
          {heroState === 'on_leave' && (
            <THeroQuiet icon="calendar" iconColor="#FCD34D"
              title={day.leave.to ? `On leave until ${tdFmtLong(day.leave.to)}` : 'On leave'}
              action={<HeroGhostBtn icon="calendar" onClick={() => go('timetable')}>View timetable</HeroGhostBtn>}>
              {(() => {
                if (day.coverage.length === 0) return 'Nothing on your timetable needs cover.';
                const covered = day.coverage.filter(c => c.cover);
                const open = day.coverage.filter(c => !c.cover).map(c => c.cls.group);
                const list = (arr) => arr.length <= 2 ? arr.join(' and ') : `${arr.slice(0, 2).join(', ')} and ${arr.length - 2} more`;
                return (
                  <>
                    {covered.slice(0, 3).map(c => (
                      <span key={c.cls.id} style={{ display: 'block' }}>
                        <strong style={{ color: '#fff', fontWeight: 600 }}>{c.cover.teacher}</strong> is covering {c.cls.group} ({c.cls.name})
                      </span>
                    ))}
                    {covered.length > 3 && <span style={{ display: 'block' }}>+{covered.length - 3} more covered</span>}
                    {open.length > 0 && <span style={{ display: 'block' }}>No cover arranged yet for {list(open)} — your admin assigns cover.</span>}
                  </>
                );
              })()}
            </THeroQuiet>
          )}

          {(heroState === 'done' || heroState === 'none') && (
            <THeroQuiet icon="check"
              title={heroState === 'done' ? 'Done for today' : 'No classes today'}
              action={<HeroGhostBtn icon="calendar" onClick={() => go('timetable')}>View timetable</HeroGhostBtn>}>
              {heroState === 'done'
                ? `All ${classesToday} ${classesToday === 1 ? 'session' : 'sessions'} wrapped up — nothing else scheduled.`
                : 'Your timetable is clear — enjoy the breather.'}
              {day.cancelledToday.length > 0 && ` ${day.cancelledToday.length} cancelled.`}
              {day.locked.length > 0 && ` ${day.locked.length} older register${day.locked.length === 1 ? ' is' : 's are'} locked — ask your admin to reopen.`}
            </THeroQuiet>
          )}

          {heroSession && (
          <>
          <div style={{ flex: '1.7 1 320px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {heroState === 'live' && <THeroPill tone="live" pulse>LIVE NOW</THeroPill>}
              {heroState === 'up_next' && <THeroPill icon="clock">UP NEXT</THeroPill>}
              {heroState === 'overdue' && <THeroPill tone="warn" icon="alert">REGISTER OVERDUE</THeroPill>}
              {heroSession.coveringFor && <THeroPill>Covering for {heroSession.coveringFor}</THeroPill>}
              <span style={{ fontSize: 12.5, color: HERO_TXT.faint, fontVariantNumeric: 'tabular-nums' }}>
                {heroState === 'overdue' ? `${tdDayLabel(heroSession.dateISO, TODAY_ISO)} · ` : ''}{tdClock(heroSession.starts_at)}–{tdClock(heroSession.ends_at)} · {heroSession.room}
              </span>
            </div>

            {heroState === 'overdue' ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginTop: 14 }}>
                  You didn&rsquo;t take the register for {heroSession.group}
                </div>
                <div style={{ fontSize: 13, color: HERO_TXT.soft, marginTop: 4 }}>
                  {heroSession.name} · {tdDayLabel(heroSession.dateISO, TODAY_ISO)} — you can still backfill it for another{' '}
                  <strong style={{ color: '#FCD34D' }}>{tdClosesIn(heroSession.derived.backfillEnd, now)}</strong>, then it locks.
                </div>
                {day.overdue.length > 1 && (
                  <div style={{ fontSize: 12.5, color: HERO_TXT.faint, marginTop: 10 }}>
                    +{day.overdue.length - 1} more register{day.overdue.length - 1 === 1 ? '' : 's'} still to take.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <HeroSolidBtn icon="check" onClick={() => tdOpenRegister(heroSession)}>Take register now</HeroSolidBtn>
                  <HeroGhostBtn icon="list" onClick={() => go('attendance')}>All registers</HeroGhostBtn>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginTop: 14 }}>
                  {heroSession.name}
                </div>
                <div style={{ fontSize: 13, color: HERO_TXT.soft, marginTop: 4 }}>
                  {heroSession.group} · {heroSession.cls.students} students
                  {heroSession.derived.state === 'recorded' && ' · register taken'}
                </div>

                {/* Homework due today for this class */}
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
                  <HeroSolidBtn icon="check" onClick={() => tdOpenRegister(heroSession)}>
                    {heroSession.derived.state === 'recorded' ? 'View register' : 'Take attendance'}
                  </HeroSolidBtn>
                  <HeroGhostBtn icon={hasPlan(heroSession.classId) ? 'eye' : 'edit'} onClick={() => openPlanner(heroSession.classId)}>
                    {hasPlan(heroSession.classId) ? 'Open lesson' : 'Plan lesson'}
                  </HeroGhostBtn>
                </div>

                {/* An overdue register never hides behind a live or upcoming class. */}
                {day.overdue.length > 0 && (
                  <button onClick={() => tdOpenRegister(day.overdue[0])} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: 0,
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, color: '#FCD34D', textAlign: 'left',
                  }}>
                    <Icon name="alert" size={13} />
                    {day.overdue.length === 1
                      ? `Register for ${day.overdue[0].group} (${tdDayLabel(day.overdue[0].dateISO, TODAY_ISO)}) still to take — closes in ${tdClosesIn(day.overdue[0].derived.backfillEnd, now)}`
                      : `${day.overdue.length} registers still to take — the first closes in ${tdClosesIn(day.overdue[0].derived.backfillEnd, now)}`}
                    <Icon name="chevron_r" size={12} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Later today */}
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: HERO_TXT.faint, marginBottom: 10,
            }}>{heroState === 'overdue' ? 'Today' : 'Later today'}</div>
            {laterSessions.length === 0 ? (
              <div style={{ fontSize: 12.5, color: HERO_TXT.faint, padding: '6px 0' }}>
                Nothing else scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {laterSessions.slice(0, 3).map((s) => (
                  <TLaterRow key={s.id} s={s} onClick={() => openPlanner(s.classId)} />
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
                    <ScorePill score={s.attainment} />
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
                icon="notebook_pen"
                title="No recent submissions to show"
                message="The latest homework submissions will appear here once the homework store is connected."
                action={<Btn variant="secondary" icon="notebook_pen" small onClick={() => go('homework')}>Open homework</Btn>}
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
