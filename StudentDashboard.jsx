// ══════════════════════════════════════════════════════════════
//  Klasio — Student Dashboard (Overview · Progress · Sessions)
// ══════════════════════════════════════════════════════════════

// Identity, enrolments (subjects/teachers/predicted grades), rollup metrics, the
// grade model and the active term all come from the student SoT
// (studentData.jsx → window.klasioStudent), loaded before this file. Homework lives
// in Homework.jsx (StudentHomework); reports come from the shared reports store
// (Reports.jsx, window.StudentReports). The Overview's ranked "Up next" pools the
// live homework store, the pupil's real sessions and unread reports (decision #56);
// every session opens the read-only session view (decision #60).

// ─── Overview page ─────────────────────────────────────────────────────────────
// Class cards paint their background with the class's cover (classCovers.jsx),
// resolved once per enrolment by the student data layer (enr.coverArt).

// Reflow helper — the dashboard right rail sits beside the main column, but drops
// below it (same order) under ~1100px (D5). Inline styles can't do a media query, so
// we track the breakpoint from the live viewport width.
const useViewportNarrow = (bp = 1100) => {
  const [narrow, setNarrow] = React.useState(() => (typeof window !== 'undefined' && window.innerWidth < bp));
  React.useEffect(() => {
    const on = () => setNarrow(window.innerWidth < bp);
    on(); window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return narrow;
};

// The month grid (MonthCalendar) lives in shared.jsx — the teacher Timetable uses it too.

// ─── Sessions, as a pupil sees them (decision #60) ─────────────────────────────
// A session's status is the pupil's OWN mark read back from the class register —
// never the class's figures. Upcoming / live / cancelled come from the timetable.
const STU_SESSION_STATUS = {
  upcoming:          { label: 'Upcoming',            tone: 'neutral'  },
  live:              { label: 'Happening now',       tone: 'accent'   },
  present:           { label: 'Present',             tone: 'positive' },
  late:              { label: 'Late',                tone: 'warning'  },
  absent:            { label: 'Absent',              tone: 'negative' },
  excused:           { label: 'Excused',             tone: 'neutral'  },
  cancelled:         { label: 'Cancelled',           tone: 'neutral'  },
  not_marked:        { label: 'Not marked',          tone: 'neutral'  },
  awaiting_register: { label: 'Register not in yet', tone: 'neutral'  },
};
const StuSessionPill = ({ status }) => {
  const m = STU_SESSION_STATUS[status] || STU_SESSION_STATUS.upcoming;
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
};
const STU_ATTENDANCE_LINE = {
  present: 'Your teacher marked you present.',
  late: 'You were marked late.',
  absent: 'You were marked absent. If that’s wrong, speak to your teacher.',
  excused: 'Your absence was excused.',
  not_marked: 'You weren’t marked on this register.',
  awaiting_register: 'Your teacher hasn’t submitted the register for this lesson yet.',
  cancelled: 'This lesson was cancelled.',
};

// "Today" / "Tomorrow" / "In 3 days" / "Yesterday" / "5 days ago" on the register clock.
const stuDayDiff = (ms, nowMs) => {
  const a = new Date(ms); a.setHours(0, 0, 0, 0);
  const b = new Date(nowMs); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
};
const stuRelDay = (ms, nowMs) => {
  const d = stuDayDiff(ms, nowMs);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return d > 0 ? `In ${d} days` : `${-d} days ago`;
};

// A month the pupil can page through, opening on today's month (register clock).
const useStudentMonth = () => {
  const K = window.klasioStudent;
  const cal = K.activeTerm.calendar;
  const [ym, setYm] = React.useState({ y: cal.y, m: cal.m });
  const month = K.monthModel(ym.y, ym.m);
  const step = (n) => setYm(p => { const d = new Date(p.y, p.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const byDay = {};
  K.sessions.all.filter(s => s.monthKey === month.key).forEach(s => { (byDay[s.day] = byDay[s.day] || []).push(s); });
  return {
    month, byDay, today: month.key === cal.key ? cal.today : null,
    prev: () => step(-1), next: () => step(1), toToday: () => setYm({ y: cal.y, m: cal.m }),
  };
};

// ─── The read-only session view (decision #60) ─────────────────────────────────
// When, where and who; the pupil's own attendance; homework set in that lesson;
// files the teacher made visible to pupils; and — only when the teacher ticked
// "Share with the class" on that planned lesson — its title, topic and objectives.
// A plan's notes for the group, its structure and the reflection are the teacher's
// working document and never reach this view.
const StudentSessionDrawer = ({ sessionId, onClose, onNav }) => {
  const K = window.klasioStudent;
  const s = sessionId ? K.sessionById(sessionId) : null;
  if (!s) return null;
  const now = K.now();
  const past = s.ends_at < now;
  const summary = K.lessonSummaryFor(s.id);
  const hw = (past || s.status === 'live') ? K.homeworkForSession(s.id) : [];
  const files = K.filesForSession(s.id);
  const objectives = summary && summary.objectives
    ? summary.objectives.split('\n').map(l => l.replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean) : [];
  const section = (title, children) => (
    <div style={{ padding: '16px 0', borderTop: `1px solid ${DS.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
  const quiet = (t) => <div style={{ fontSize: 13, color: DS.muted, lineHeight: 1.5 }}>{t}</div>;
  const openClass = () => { window.__studentClassId = s.classId; onClose(); onNav && onNav('classes:detail'); };
  const attLine = s.status === 'cancelled'
    ? (past ? STU_ATTENDANCE_LINE.cancelled : 'This lesson has been cancelled.')
    : past ? STU_ATTENDANCE_LINE[s.status] : null;

  return (
    <SlideOver open onClose={onClose} icon="calendar" iconColor={s.color} width={460}
      title={`${s.subject} · ${s.date}`} subtitle={`${s.time} · ${stuRelDay(s.starts_at, now)}`}
      footer={<><Btn variant="secondary" small onClick={onClose}>Close</Btn><Btn variant="primary" small icon="book" onClick={openClass}>Open class</Btn></>}>
      <div style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{s.className} · {s.group}</div>
          <StuSessionPill status={s.status} />
        </div>
        {[['clock', s.time], ['home', s.room], ['user', s.coverFor ? `${s.teacher} (covering for ${s.coverFor})` : s.teacher]].map(([ic, t]) => (
          <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: DS.sub, padding: '3px 0' }}>
            <Icon name={ic} size={14} color={DS.faint} />{t}
          </div>
        ))}
        {attLine && <div style={{ marginTop: 10, fontSize: 12.5, color: DS.muted, lineHeight: 1.5 }}>{attLine}</div>}
      </div>

      {section(past ? 'What we covered' : 'What’s planned', summary ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>{summary.title || 'Untitled lesson'}</div>
          {summary.topic && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{summary.topic}</div>}
          {objectives.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {objectives.map((o, i) => <li key={i} style={{ fontSize: 13, color: DS.sub, lineHeight: 1.45 }}>{o}</li>)}
            </ul>
          )}
        </div>
      ) : quiet(past ? 'Your teacher hasn’t shared a summary of this lesson.' : 'Nothing shared for this lesson yet.'))}

      {(past || s.status === 'live') && section('Homework set in this lesson', hw.length ? hw.map((h, i) => (
        <button key={h.id} onClick={() => { onClose(); onNav && onNav('homework'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 0', border: 'none', borderTop: i ? `1px solid ${DS.border}` : 'none', background: 'none', cursor: 'pointer' }}>
          <Icon name="clip" size={15} color={s.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{h.title}</div>
            <div style={{ fontSize: 12, color: h.overdue && h.state === 'pending' ? DS.danger : DS.muted }}>{h.state === 'marked' ? 'Marked' : h.state === 'submitted' ? 'Handed in' : h.due}</div>
          </div>
          <Icon name="chevron_r" size={14} color={DS.faint} />
        </button>
      )) : quiet('No homework was set in this lesson.'))}

      {section('Files from this lesson', files.length ? files.map((f, i) => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: s.color + '14', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={f.icon} size={14} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
            <div style={{ fontSize: 11.5, color: DS.muted }}>{f.typeLabel}{f.size ? ` · ${fmtBytes(f.size)}` : ''}</div>
          </div>
          {f.url && <Btn variant="ghost" small icon="link" onClick={() => window.open(f.url, '_blank', 'noopener')}>Open</Btn>}
        </div>
      )) : quiet('Your teacher hasn’t shared any files from this lesson.'))}
    </SlideOver>
  );
};

// ─── Up next (decision #56) ─────────────────────────────────────────────────────
// ONE ranked list of what to deal with, in order: overdue work, a lesson happening
// now, work due today, today's lessons, work due tomorrow, tomorrow's lessons,
// later work, the rest of the week's lessons, then a report not yet read. It
// replaced the Due soon / Upcoming sessions cards and the Sessions-a-week tile, so
// each thing appears on the dashboard once.
const stuUpNextItems = (K, pendingHw, latestReports) => {
  const now = K.now();
  const out = [];
  pendingHw.forEach(h => {
    const st = K.dueState(h);
    const enr = K.getEnrolment(h.subject);
    out.push({
      key: 'hw:' + h.id, kind: 'homework', rank: { overdue: 0, 'due-today': 2, 'due-tomorrow': 4, upcoming: 6 }[st], t: h.dueAt || Infinity,
      icon: 'clip', color: enr ? enr.subjectColor : DS.accent, title: h.title, meta: `${h.subject} · Homework`,
      pill: { label: st === 'upcoming' ? h.due : K.dueLabel(h), tone: st === 'overdue' ? 'negative' : st === 'due-today' ? 'warning' : 'neutral' },
    });
  });
  K.sessions.upcoming.filter(s => stuDayDiff(s.starts_at, now) <= 7).forEach(s => {
    const dd = stuDayDiff(s.starts_at, now);
    const cancelled = s.status === 'cancelled';
    out.push({
      key: 's:' + s.id, kind: 'session', sessionId: s.id, rank: s.status === 'live' ? 1 : dd === 0 ? 3 : dd === 1 ? 5 : 7, t: s.starts_at,
      icon: 'calendar', color: cancelled ? DS.faint : s.color, title: s.subject, meta: `${s.date} · ${s.time.split('–')[0]} · ${s.room}`,
      pill: cancelled ? { label: 'Cancelled', tone: 'neutral' }
        : s.status === 'live' ? { label: 'Now', tone: 'accent' }
        : { label: dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : s.date.split(' ')[0], tone: 'neutral' },
    });
  });
  latestReports.filter(r => !(r.acknowledgement && r.acknowledgement.ack)).forEach(r => out.push({
    key: 'r:' + r.id, kind: 'report', rank: 8, t: 0, icon: 'file', color: r.subjectColor || DS.info,
    title: r.title, meta: `${r.subject} · Report from ${r.teacher}`, pill: { label: 'New', tone: 'accent' },
  }));
  return out.sort((a, b) => a.rank - b.rank || a.t - b.t);
};

const StudentUpNext = ({ items, onNav, onOpenSession }) => {
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, 6);
  const go = (it) => it.kind === 'session' ? onOpenSession(it.sessionId) : onNav(it.kind === 'report' ? 'reports' : 'homework');
  return (
    <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, padding: '18px 20px 12px' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: DS.text, margin: '0 0 4px', letterSpacing: '-0.4px' }}>Up next</h2>
          <div style={{ fontSize: 13, color: DS.muted }}>Homework and lessons in one list, most pressing first</div>
        </div>
        {items.length > 6 && (
          <button onClick={() => setAll(v => !v)} style={{ background: 'none', border: 'none', color: DS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            {all ? 'Show less' : `Show all ${items.length}`}
          </button>
        )}
      </div>
      {shown.length ? shown.map(it => (
        <button key={it.key} onClick={() => go(it)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '13px 20px', border: 'none', borderTop: `1px solid ${DS.border}`, background: 'none', cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: it.color + '18', color: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={it.icon} size={17} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
            <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 1 }}>{it.meta}</div>
          </div>
          <StatusPill tone={it.pill.tone}>{it.pill.label}</StatusPill>
          <Icon name="chevron_r" size={15} color={DS.faint} />
        </button>
      )) : (
        <div style={{ padding: '14px 20px 20px', fontSize: 13, color: DS.muted, borderTop: `1px solid ${DS.border}` }}>
          You’re all caught up — no homework to do and no lessons in the next week.
        </div>
      )}
    </div>
  );
};

// ─── Dashboard right rail — identity · calendar · announcements ─────────────────
const StudentOverviewRail = ({ K, cs, enrolments, comms, onNav, onOpenSession }) => {
  const m = useStudentMonth();
  const [selectedDay, setSelectedDay] = React.useState(K.activeTerm.calendar.today);
  const subjColor = (name) => { const e = K.getEnrolment(name); return e ? e.subjectColor : DS.accent; };
  const dayItems = m.byDay[selectedDay] || [];

  // Recent unread announcements — the class they belong to links into class detail.
  const uid = comms && comms.ctx && comms.ctx.userId;
  const unreadAnns = (comms ? comms.announcements : [])
    .filter(a => uid && a.authorId !== uid && !a.reads[uid] && !(a.expiresAt && a.expiresAt < new Date().toISOString().slice(0, 10)))
    .slice(0, 3)
    .map(a => {
      const enr = a.scope === 'class' ? enrolments.find(e => e.classId === a.classId) : null;
      return { ...a, className: enr ? enr.name : (a.scope === 'centre' ? cs.centreName : 'Announcement'), enrClassId: enr ? enr.classId : null };
    });
  const openAnn = (a) => { if (a.enrClassId) { window.__studentClassId = a.enrClassId; onNav('classes:detail'); } else onNav('comms'); };

  const cardWrap = { background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, overflow:'hidden' };
  const cardHead = (title, action) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px 10px' }}>
      <div style={{ fontSize:14, fontWeight:700, color:DS.text }}>{title}</div>
      {action}
    </div>
  );

  return (
    <>
      {/* Identity */}
      <div style={cardWrap}>
        <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:4 }}>
          <Avatar name={cs.fullName} size={56} color={DS.accent} />
          <div style={{ fontSize:16, fontWeight:800, color:DS.text, marginTop:8, letterSpacing:'-0.3px' }}>{cs.fullName}</div>
          <div style={{ fontSize:12, color:DS.muted }}>{cs.yearGroup} · {cs.qualification}</div>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:600, color:DS.sub, background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:7, padding:'3px 10px', marginTop:6, letterSpacing:'0.5px' }}>{cs.code}</div>
          <div style={{ fontSize:11.5, color:DS.faint, marginTop:6 }}>{cs.centreName}</div>
        </div>
      </div>

      {/* Mini calendar — the pupil's real sessions; a day's lessons open the session view */}
      <div style={cardWrap}>
        <div style={{ padding:'14px 16px' }}>
          <MonthCalendar
            month={m.month} today={m.today} sessionsByDay={m.byDay} subjColor={subjColor}
            variant="mini" selectedDay={selectedDay} onSelectDay={setSelectedDay}
            onPrev={m.prev} onNext={m.next} title={m.month.name}
          />
          <div style={{ marginTop:10, borderTop:`1px solid ${DS.border}`, paddingTop:6 }}>
            {dayItems.length ? dayItems.map(s => (
              <button key={s.id} onClick={() => onOpenSession(s.id)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 0', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: s.status === 'absent' ? DS.danger : s.status === 'cancelled' ? DS.faint : s.color, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0, fontSize:12, color:DS.text, textDecoration: s.status === 'cancelled' ? 'line-through' : 'none' }}>{s.subject}</div>
                <div style={{ fontSize:11, color:DS.muted }}>{s.time.split('–')[0]}</div>
                <Icon name="chevron_r" size={12} color={DS.faint} />
              </button>
            )) : <div style={{ fontSize:12, color:DS.faint, padding:'4px 0' }}>No lessons on {m.month.name.split(' ')[0]} {selectedDay}.</div>}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div style={cardWrap}>
        {cardHead('Announcements', <button onClick={() => onNav('comms')} style={{ background:'none', border:'none', color:DS.muted, fontSize:12, cursor:'pointer' }}>See all</button>)}
        {unreadAnns.length ? unreadAnns.map((a, i) => (
          <button key={a.id} onClick={() => openAnn(a)} style={{ display:'block', width:'100%', textAlign:'left', padding:'11px 16px', border:'none', borderTop:`1px solid ${DS.border}`, background:'none', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:DS.accent, flexShrink:0 }} />
              <span style={{ fontSize:11, color:DS.accent, fontWeight:600 }}>{a.className}</span>
            </div>
            <div style={{ fontSize:12.5, fontWeight:600, color:DS.text, lineHeight:1.35 }}>{a.title}</div>
            <div style={{ fontSize:11, color:DS.muted, marginTop:2 }}>{a.authorName} · {fmtAnnDate(a.createdAt)}</div>
          </button>
        )) : <div style={{ padding:'12px 16px 16px', fontSize:12.5, color:DS.faint }}>No new announcements.</div>}
      </div>
    </>
  );
};

const StudentOverview = ({ onNav, comms }) => {
  // §1–§7: identity, subjects, grades, numbers and term all come from the one
  // student SoT — nothing on this screen is re-hardcoded.
  const K  = window.klasioStudent;
  const cs = K.currentStudent;
  const enrolments  = K.getEnrolments();
  const hwSummary   = K.metrics.homeworkSummary();
  const pendingHw   = hwSummary.pending;
  const urgentCount = hwSummary.urgentCount;
  const avgScore    = K.metrics.termAverage();            // latest results, all classes
  const termTrend   = K.metrics.termTrendDelta();          // computed, not decorative
  const attendance  = K.metrics.attendanceOverall();       // from the registers
  const now         = K.now();
  const reportsStore = useReportsStore();
  const latestReports = reportsStore.reportsArr
    .filter(r => r.studentId === cs.id && r.status === 'published')
    .sort((a,b) => (b.datePublished||'').localeCompare(a.datePublished||''))
    .slice(0,3);
  const [openSession, setOpenSession] = React.useState(null);

  const narrow = useViewportNarrow(1100);
  const rail = (
    <StudentOverviewRail K={K} cs={cs} enrolments={enrolments} comms={comms} onNav={onNav} onOpenSession={setOpenSession} />
  );

  // Single-row classes carousel — scroll horizontally when classes overflow
  const subjectsRef = React.useRef(null);
  const scrollSubjects = (dir) => {
    const el = subjectsRef.current;
    if (el) el.scrollBy({ left: dir * 336, behavior: 'smooth' });
  };

  // The hero states facts, never a verdict (decision #56). "On track" is defined
  // against the teacher's target grade (v_student_progress); until that drives a
  // sentence here, the hero says what is due and when the next lesson is.
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const overdueN = pendingHw.filter(h => K.dueState(h) === 'overdue').length;
  const liveLesson = K.sessions.upcoming.find(s => s.status === 'live');
  const nextLesson = K.sessions.upcoming.find(s => s.status === 'upcoming');
  const hwLine = pendingHw.length
    ? `${pendingHw.length} piece${pendingHw.length === 1 ? '' : 's'} of homework to do${overdueN ? `, ${overdueN} overdue` : ''}.`
    : 'No homework to do right now.';
  const lessonLine = liveLesson
    ? ` ${liveLesson.subject} is on now in ${liveLesson.room}.`
    : nextLesson
      ? ` Next lesson: ${nextLesson.subject}, ${stuRelDay(nextLesson.starts_at, now).toLowerCase()} at ${nextLesson.time.split('–')[0]}.`
      : '';

  const heroStat = (label, value, sub) => (
    <div style={{
      background:'rgba(255,255,255,0.13)', border:'1px solid rgba(255,255,255,0.18)',
      borderRadius:12, padding:'14px 16px', minWidth:130,
    }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.78)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.4px', lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,0.78)', marginTop:3 }}>{sub}</div>}
    </div>
  );

  const upNext = stuUpNextItems(K, pendingHw, latestReports);

  return (
    <div style={pageFrame()}>
     <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexDirection: narrow ? 'column' : 'row' }}>
      <div style={{ flex:1, minWidth:0, width: narrow ? '100%' : 'auto' }}>
      {/* Purple gradient hero */}
      <div style={{
        position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #6D5BE3 0%, #7C4DEB 50%, #8B45E6 100%)',
        borderRadius:18, padding:'32px 36px', marginBottom:28,
        color:'#fff', boxShadow:'0 8px 30px -10px rgba(108,71,225,0.4)',
      }}>
        {/* decorative shape */}
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ position:'absolute', top:20, left:'45%', opacity:0.35 }}>
          <rect x="6" y="6" width="22" height="22" rx="4" transform="rotate(20 17 17)" fill="#fff" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ position:'absolute', bottom:30, left:'48%', opacity:0.5 }}>
          <circle cx="7" cy="7" r="4" fill="#fff" />
        </svg>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:32 }}>
          <div style={{ maxWidth:560 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.78)', letterSpacing:'1.5px', marginBottom:14 }}>
              {[cs.yearGroup, K.activeTerm.banner].filter(Boolean).join(' · ').toUpperCase()}
            </div>
            <h1 style={{ fontSize:38, fontWeight:800, color:'#fff', margin:'0 0 10px', letterSpacing:'-1px', lineHeight:1.05 }}>
              {greeting}, {cs.displayName}
            </h1>
            <div style={{ fontSize:15, color:'rgba(255,255,255,0.88)', lineHeight:1.5, marginBottom:22 }}>
              {hwLine}{lessonLine}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {/* §9: targets the most-urgent in-progress assignment (overdue → due
                  today → soonest). The Reports section owns report download. */}
              <button onClick={() => onNav('homework')}
                title={K.getContinueHomework() ? `Continue: ${K.getContinueHomework().title}` : 'Go to homework'}
                style={{
                padding:'10px 18px', borderRadius:10, border:'none',
                background:'#fff', color:'#5B3FD9', fontSize:13, fontWeight:600,
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7,
              }}>
                <Icon name="clip" size={14} color="#5B3FD9" />
                Continue homework
              </button>
            </div>
          </div>

          {/* Stat tiles — the original right-hand 2-column block; three signals, each
              changes with what the pupil does (the third spans the bottom row) */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {heroStat('Average result', avgScore == null ? '—' : K.formatAttainment(avgScore),
              avgScore == null ? 'No results published yet' : termTrend == null ? 'Latest results · all classes' : `${termTrend >= 0 ? '+' : ''}${termTrend}% vs last · all classes`)}
            {heroStat('Attendance', attendance == null ? '—' : `${attendance}%`, attendance == null ? 'No registers yet' : 'Last 6 weeks · all classes')}
            <div style={{ gridColumn:'1 / -1' }}>{heroStat('Homework due', pendingHw.length, overdueN ? `${overdueN} overdue` : urgentCount ? `${urgentCount} due today` : 'None urgent')}</div>
          </div>
        </div>
      </div>

      {/* Up next — promoted out of the rail: the most useful block on the page */}
      <StudentUpNext items={upNext} onNav={onNav} onOpenSession={setOpenSession} />

      {/* My classes — cards keyed by CLASS (a student with two classes in one subject
          sees two cards). Card click opens the class detail. */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:DS.text, margin:'0 0 4px', letterSpacing:'-0.4px' }}>My classes</h2>
          <div style={{ fontSize:13, color:DS.muted }}>Latest results and the grade your teacher predicts</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => scrollSubjects(-1)} aria-label="Previous classes" style={{
            width:32, height:32, borderRadius:8, border:`1px solid ${DS.cardBorder}`,
            background:DS.bg, color:DS.muted, cursor:'pointer', display:'inline-flex',
            alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1,
          }}>‹</button>
          <button onClick={() => scrollSubjects(1)} aria-label="Next classes" style={{
            width:32, height:32, borderRadius:8, border:`1px solid ${DS.cardBorder}`,
            background:DS.bg, color:DS.muted, cursor:'pointer', display:'inline-flex',
            alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1,
          }}>›</button>
        </div>
      </div>

      <div ref={subjectsRef} style={{
        display:'flex', gap:16, marginBottom:28, overflowX:'auto', paddingBottom:4,
        scrollSnapType:'x mandatory', scrollbarWidth:'none', msOverflowStyle:'none',
      }}>
        {enrolments.map(s => {
          const latest = s.scores.length ? s.scores[s.scores.length-1] : null;
          const openClass = () => { window.__studentClassId = s.classId; onNav('classes:detail'); };
          const nextForClass = K.sessions.upcoming.find(x => x.classId === s.classId && x.status !== 'cancelled');
          return (
            <button key={s.classId} onClick={openClass} style={{
              position:'relative', overflow:'hidden', isolation:'isolate', flex:'1 0 280px', scrollSnapAlign:'start', textAlign:'left',
              borderRadius:18, border:'none', cursor:'pointer',
              padding:'22px 24px 24px', minHeight:220,
              display:'flex', flexDirection:'column', justifyContent:'space-between',
              ...coverStyleVars(s.coverArt, 'card'),
            }}>
              <CoverArt cover={s.coverArt} variant="card" />
              {/* The title block stays on the left 56%, clear of the artwork. */}
              <div style={{ position:'relative', zIndex:1, maxWidth:'56%' }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:700, color:'var(--cover-chip-ink)', letterSpacing:'0.5px', background:'var(--cover-chip-bg)', padding:'2px 8px', borderRadius:999 }}>{s.subject}</div>
                <div style={{ fontSize:22, fontWeight:800, color:'var(--cover-ink)', marginTop:8, letterSpacing:'-0.5px' }}>{s.name}</div>
                <div style={{ fontSize:12, color:'var(--cover-ink-muted)', marginTop:4 }}>{s.teacher}{nextForClass ? ` · Next ${nextForClass.date}` : ''}</div>
              </div>
              <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize: K.pupilGradeDisplay() === 'both' ? 32 : 42, fontWeight:800, color:'var(--cover-ink)', letterSpacing:'-1.5px', lineHeight:1 }}>{K.formatAttainment(latest, s.qualification)}</div>
                  <div style={{ fontSize:12, color:'var(--cover-ink-muted)', marginTop:4 }}>{latest == null ? 'No results yet' : `Latest result · ${s.scores.length} assessment${s.scores.length === 1 ? '' : 's'}`}</div>
                </div>
                {/* Predicted grade is the teacher's stored judgement (decision #28),
                    rendered through the canonical grade model — or "Not set yet". */}
                <div title={s.predictedGrade ? 'Predicted grade — set by your teacher' : 'Your teacher hasn’t set a predicted grade yet'} style={{
                  background:'var(--cover-chip-bg)', borderRadius:10,
                  padding:'8px 10px', textAlign:'center', minWidth:54,
                }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--cover-ink)', lineHeight:1 }}>{s.predictedGrade ? <K.GradeChip value={s.predictedGrade} qualification={s.qualification} color="var(--cover-ink)" variant="bare" title="Predicted grade — set by your teacher" /> : '—'}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:'var(--cover-ink-muted)', letterSpacing:'1px', marginTop:3 }}>{s.predictedGrade ? 'PREDICTED' : 'NOT SET YET'}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Latest reports — the one place published reports live on the dashboard */}
      <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', padding:'18px 20px 12px' }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:DS.text, margin:'0 0 4px', letterSpacing:'-0.4px' }}>Latest reports</h2>
            <div style={{ fontSize:13, color:DS.muted }}>Written by your teachers and shared with your family</div>
          </div>
          <button onClick={() => onNav('reports')} style={{ background:'none', border:'none', color:DS.accent, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>See all</button>
        </div>
        {latestReports.length === 0 && (
          <div style={{ padding:'14px 20px 18px', borderTop:`1px solid ${DS.border}`, fontSize:13, color:DS.muted }}>No reports published yet.</div>
        )}
        {latestReports.map(r => {
          const color = r.subjectColor || DS.accent;
          const acked = r.acknowledgement && r.acknowledgement.ack;
          return (
            <button key={r.id} onClick={() => onNav('reports')} style={{
              display:'flex', alignItems:'center', gap:14, width:'100%', textAlign:'left',
              padding:'14px 20px', border:'none', borderTop:`1px solid ${DS.border}`, background:'none', cursor:'pointer',
            }}>
              <div style={{ width:38, height:38, borderRadius:10, background: color + '18', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="file" size={17} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:600, color:DS.text, lineHeight:1.3 }}>{r.title}</div>
                <div style={{ fontSize:12.5, color:DS.muted, marginTop:1 }}>{r.subject} · {r.teacher} · {r.period}</div>
              </div>
              <StatusPill tone={acked ? 'positive' : 'accent'}>{acked ? 'Read' : 'New'}</StatusPill>
              <Icon name="chevron_r" size={15} color={DS.faint} />
            </button>
          );
        })}
      </div>
      </div>{/* /main column */}

      <aside style={{
        width: narrow ? '100%' : 320, flexShrink:0,
        position: narrow ? 'static' : 'sticky', top: 0,
        display:'flex', flexDirection:'column', gap:16,
      }}>
        {rail}
      </aside>
     </div>{/* /flex wrapper */}
     <StudentSessionDrawer sessionId={openSession} onClose={() => setOpenSession(null)} onNav={onNav} />
    </div>
  );
};

// NOTE: the student Homework surface (Assignments · Submitted · Results, the full
// attempt/submission/marking loop) lives in Homework.jsx as `StudentHomework` and
// is what the router renders. The earlier local `StudentHomeworkPage` here was a
// dead, never-routed duplicate (plain textarea submit) and has been removed.

// ─── Progress page ──────────────────────────────────────────────────────────────
// Published results per class, the pupil's own direction of travel, and the
// grades their teacher set (decision #28). Class averages appear only when the
// centre turns them on (decision #59, default off) — otherwise a pupil is compared
// with their own previous result, never with classmates.
const StudentProgressPage = () => {
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const [activeSub, setActiveSub] = React.useState(0);
  if (!enrolments.length) return (
    <div style={pageFrame()}>
      <PageHeader title="My Progress" subtitle="Your published results and predicted grades" />
      <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="chart" title="No classes yet" message="Your results appear here once your centre adds you to a class." /></div></Card>
    </div>
  );
  const sub = enrolments[Math.min(activeSub, enrolments.length - 1)];
  const showAvg = K.showClassAverage();
  const classAvg = sub.classAvg;
  // Each class has its own published assessments on its own dates (decision #50).
  const scoreLabels = sub.scoreLabels || [];
  const fmt = (pct) => K.formatAttainment(pct, sub.qualification);
  const signed = (n) => `${n >= 0 ? '+' : ''}${n}%`;
  const notSet = <span style={{ fontSize:12.5, fontWeight:600, color:DS.faint }}>Not set yet</span>;

  return (
    <div style={pageFrame()}>
      <PageHeader title="My Progress" subtitle="Your published results and the grades your teachers set. Other grades are indicative — worked out from your results, not official." />

      {/* Class tabs */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        {enrolments.map((s, i) => (
          <button key={s.classId} onClick={() => setActiveSub(i)} style={{
            padding:'8px 20px', borderRadius:20, border:`1px solid ${activeSub===i ? s.subjectColor : DS.border}`,
            background: activeSub===i ? s.subjectColor + '18' : DS.bg,
            color: activeSub===i ? s.subjectColor : DS.muted,
            fontSize:14, fontWeight: activeSub===i ? 600 : 400, cursor:'pointer',
          }}>{s.subject}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>
        <div>
          {/* Result trend chart */}
          <Card title={`Results — ${sub.subject}`} style={{ marginBottom:20 }} actions={[
            <div key="leg" style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:16, height:2, background:sub.subjectColor, borderRadius:2 }} />
                <span style={{ fontSize:11, color:DS.muted }}>Your result</span>
              </div>
              {showAvg && (
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:16, height:2, background:DS.border, borderRadius:2 }} />
                <span style={{ fontSize:11, color:DS.muted }}>Class avg</span>
              </div>
              )}
            </div>
          ]}>
            <div style={{ padding:'16px 20px 8px' }}>
              {sub.scores.length >= 2 ? (
                <LineChart
                  labels={scoreLabels}
                  series={[
                    { label:'Your result', data:sub.scores, color:sub.subjectColor },
                    ...(showAvg ? [{ label:'Class avg', data:classAvg, color:DS.borderDark }] : []),
                  ]}
                  height={220}
                />
              ) : (
                <div style={{ padding:'40px 0', textAlign:'center', fontSize:13, color:DS.muted }}>
                  {sub.scores.length ? 'Your first result is in — the trend appears after your next assessment.' : 'No results published for this class yet.'}
                </div>
              )}
            </div>
          </Card>

          {/* Assessment history table */}
          <Card title="Assessment history">
            {scoreLabels.length === 0 ? (
              <div style={{ padding:'18px 20px', fontSize:13, color:DS.muted }}>Your teacher hasn’t published any results for this class yet.</div>
            ) : (
            <Table
              cols={showAvg ? ['Assessment','Date','Your result','Class avg','vs Average'] : ['Assessment','Date','Your result','Since last']}
              rows={scoreLabels.map((date, i) => {
                const mine = sub.scores[i];
                const base = [
                  <span style={{ fontSize:13, color:DS.text }}>{(sub.scoreTitles && sub.scoreTitles[i]) || `Assessment ${i+1}`}</span>,
                  <span style={{ fontSize:13, color:DS.muted }}>{date}</span>,
                  <span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{fmt(mine)}</span>,
                ];
                if (showAvg) {
                  const diff = mine - classAvg[i];
                  return [...base,
                    <span style={{ fontSize:13, color:DS.muted }}>{classAvg[i]}%</span>,
                    <span style={{ fontSize:12, fontWeight:600, color: diff >= 0 ? DS.success : DS.danger }}>{signed(diff)}</span>];
                }
                const delta = i ? mine - sub.scores[i - 1] : null;
                return [...base, delta == null
                  ? <span style={{ fontSize:12, color:DS.faint }}>First result</span>
                  : delta === 0
                    ? <span style={{ fontSize:12, color:DS.muted }}>No change</span>
                    : <span style={{ fontSize:12, fontWeight:600, color: delta > 0 ? DS.success : DS.danger }}>{signed(delta)}</span>];
              })}
            />
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {(() => {
            const attendance = K.metrics.attendanceForClass(sub.classId);
            const vsClass    = K.metrics.subjectVsClass(sub.subject);
            const sinceLast  = K.metrics.subjectSinceLast(sub.subject);
            const subjectAvg = K.metrics.subjectAverage(sub.subject);
            const row = (label, value) => (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
                <span style={{ fontSize:13, color:DS.muted }}>{label}</span>{value}
              </div>
            );
            return (
          <div style={{
            background:DS.bg, border:`1px solid ${DS.border}`,
            borderRadius:10, padding:'24px',
            borderTop:`3px solid ${sub.subjectColor}`,
          }}>
            <div style={{ fontSize:13, color:DS.muted, marginBottom:12 }}>{sub.subject} summary</div>
            <div style={{ fontSize:40, fontWeight:800, color:DS.text, letterSpacing:'-1px', lineHeight:1 }}>
              {fmt(sub.scores.length ? sub.scores[sub.scores.length-1] : null)}
            </div>
            <div style={{ fontSize:12, color:DS.muted, marginTop:4 }}>{subjectAvg == null ? 'No results yet' : `Latest result · ${subjectAvg}% average`}</div>
            <Divider />
            {row('Predicted grade', sub.predictedGrade ? <span style={{ fontSize:16 }}><K.GradeChip value={sub.predictedGrade} qualification={sub.qualification} color={sub.subjectColor} variant="bare" title="Predicted grade — set by your teacher" /></span> : notSet)}
            {row('Target grade', sub.targetGrade ? <span style={{ fontSize:16 }}><K.GradeChip value={sub.targetGrade} qualification={sub.qualification} color={DS.text} variant="bare" title="Target grade — set by your teacher" /></span> : notSet)}
            {row(<span>Indicative <span style={{ color:DS.faint }}>· from results</span></span>, <span style={{ fontSize:13, fontWeight:600, color:DS.sub }}>{sub.indicativeGrade || '—'}</span>)}
            {row(<span>Attendance <span style={{ color:DS.faint }}>· this class</span></span>, <span style={{ fontSize:13, fontWeight:600, color: attendance == null ? DS.faint : attendance >= 95 ? DS.success : DS.warning }}>{attendance == null ? '—' : `${attendance}%`}</span>)}
            {showAvg && vsClass != null
              ? row(`${vsClass >= 0 ? 'Above' : 'Below'} class avg`, <span style={{ fontSize:13, fontWeight:600, color: vsClass >= 0 ? DS.success : DS.danger }}>{signed(vsClass)}</span>)
              : sinceLast != null && row('Since your last result', <span style={{ fontSize:13, fontWeight:600, color: sinceLast > 0 ? DS.success : sinceLast < 0 ? DS.danger : DS.muted }}>{sinceLast === 0 ? 'No change' : signed(sinceLast)}</span>)}
            <div style={{ fontSize:11.5, color:DS.faint, marginTop:6, lineHeight:1.45 }}>Predicted and target grades are set by {sub.teacher}.</div>
          </div>
            );
          })()}

          {/* All classes summary */}
          <Card title="All classes">
            <div style={{ padding:'8px 0' }}>
              {enrolments.map((s, i) => (
                <div key={s.classId} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                  borderBottom: i < enrolments.length-1 ? `1px solid ${DS.border}` : 'none',
                  cursor:'pointer', background: activeSub===i ? s.subjectColor+'0A' : 'transparent',
                }} onClick={() => setActiveSub(i)}>
                  <div style={{ width:3, height:36, borderRadius:2, background:s.subjectColor, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{s.subject}</div>
                    <div style={{ fontSize:11, color:DS.muted }}>Predicted {s.predictedGrade ? <K.GradeChip value={s.predictedGrade} qualification={s.qualification} color={s.subjectColor} variant="bare" /> : <span style={{ color:DS.faint }}>not set yet</span>}</div>
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:600, color:DS.sub, whiteSpace:'nowrap' }}>{K.formatAttainment(s.scores.length ? s.scores[s.scores.length-1] : null, s.qualification)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Sessions page ──────────────────────────────────────────────────────────────
// The pupil's real timetable on the register clock: a calendar they can page
// through, what's coming up, and past lessons with their own attendance. Every
// session opens the read-only session view (decision #60). No self-booking.
const StudentSessionsPage = ({ onNav }) => {
  const K = window.klasioStudent;
  const m = useStudentMonth();
  const [openId, setOpenId] = React.useState(null);
  const now = K.now();
  const upcoming = K.sessions.upcoming.slice(0, 8);
  const history = K.sessions.history;
  const subjColor = (name) => { const enr = K.getEnrolment(name); return enr ? enr.subjectColor : DS.accent; };

  // Export-to-Calendar (ICS) of the upcoming sessions — client-side, no backend.
  // Times are written in UTC so any calendar app places them correctly.
  const exportICS = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const utc = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Klasio//Student Sessions//EN'];
    K.sessions.upcoming.filter(s => s.status !== 'cancelled').forEach(s => {
      lines.push('BEGIN:VEVENT',
        `UID:klasio-${s.id.replace('|', '-')}@klasio`,
        `DTSTART:${utc(s.starts_at)}`,
        `DTEND:${utc(s.ends_at)}`,
        `SUMMARY:${s.subject} — ${s.teacher}`,
        `LOCATION:${s.room || ''}`,
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'klasio-sessions.ics';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={pageFrame()}>
      <PageHeader title="My Sessions" subtitle="Your lessons — open one to see what was covered, your attendance and any homework" actions={[
        <Btn key="cal" variant="secondary" icon="download" small onClick={exportICS}>Export to Calendar</Btn>
      ]} />

      {/* Calendar — shared MonthCalendar (full variant); a lesson chip opens it */}
      <div style={{
        background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12,
        padding:'20px 22px', marginBottom:28,
      }}>
        <MonthCalendar
          month={m.month} today={m.today} sessionsByDay={m.byDay} subjColor={subjColor} variant="full"
          onPrev={m.prev} onToday={m.toToday} onNext={m.next} onOpenSession={setOpenId}
          legend={
            <div style={{ display:'flex', alignItems:'center', gap:14, marginRight:14 }}>
              {K.getEnrolments().map(s => (
                <div key={s.classId} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.subjectColor }} />
                  <span style={{ fontSize:11, color:DS.muted }}>{s.subject}</span>
                </div>
              ))}
            </div>
          }
        />
      </div>

      {/* Upcoming */}
      <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:12 }}>Coming up</div>
      {upcoming.length === 0 ? (
        <Card style={{ marginBottom:32 }}><div style={{ padding:'20px', fontSize:13, color:DS.muted }}>No lessons coming up.</div></Card>
      ) : (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12, marginBottom:32 }}>
        {upcoming.map(s => {
          const cancelled = s.status === 'cancelled';
          return (
            <button key={s.id} onClick={() => setOpenId(s.id)} style={{
              textAlign:'left', cursor:'pointer',
              background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:10,
              padding:'18px', borderTop:`3px solid ${cancelled ? DS.faint : s.color}`, opacity: cancelled ? 0.75 : 1,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{s.subject}</div>
                {(cancelled || s.status === 'live') && <StuSessionPill status={s.status} />}
              </div>
              <div style={{ fontSize:12, color:DS.muted, marginBottom:14 }}>{s.teacher}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[['calendar', `${s.date} · ${stuRelDay(s.starts_at, now)}`], ['clock', s.time], ['home', s.room]].map(([icon, txt]) => (
                  <div key={icon} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:DS.muted }}>
                    <Icon name={icon} size={12} color={DS.faint} />
                    {txt}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* History — the pupil's own mark on each register */}
      <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:12 }}>Past lessons</div>
      <Card>
        {history.length === 0 ? <div style={{ padding:'20px', fontSize:13, color:DS.muted }}>No past lessons yet.</div> : history.map((s, i) => (
          <button key={s.id} onClick={() => setOpenId(s.id)} style={{
            display:'flex', alignItems:'center', gap:14, width:'100%', textAlign:'left', padding:'13px 18px',
            border:'none', borderBottom: i < history.length-1 ? `1px solid ${DS.border}` : 'none', background:'none', cursor:'pointer',
          }}>
            <div style={{ width:3, alignSelf:'stretch', minHeight:30, borderRadius:2, background:s.color, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{s.subject}</div>
              <div style={{ fontSize:12, color:DS.muted }}>{s.teacher} · {s.date} · {s.time}</div>
            </div>
            <StuSessionPill status={s.status} />
            <Icon name="chevron_r" size={14} color={DS.faint} />
          </button>
        ))}
      </Card>
      <StudentSessionDrawer sessionId={openId} onClose={() => setOpenId(null)} onNav={onNav} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  Student — My Classes (list + detail). The one sanctioned pair of new student
//  page ids (classes / classes:detail, D3). Enrolment is staff-only, so there is no
//  join-a-class control anywhere here. All numbers derive from the student SoT
//  (klasioStudent) + the lifted comms store — nothing is stored or hardcoded.
// ══════════════════════════════════════════════════════════════════════════════

// Class-scoped announcements for the acting student, from the lifted comms store
// (already tenant + visibility filtered). Marks each read via comms.markRead when the
// student opens them (D8). Never a new/private channel — read-only here.
const classAnnouncementsForStudent = (comms, classId) => {
  if (!comms) return [];
  const uid = comms.ctx && comms.ctx.userId;
  return comms.announcements
    .filter(a => a.scope === 'class' && (a.classId === classId || ((a.audience && a.audience.classIds) || []).includes(classId)))
    .map(a => ({ ...a, unread: uid ? !a.reads[uid] : false, acked: uid ? !!(a.acks && a.acks[uid]) : false }));
};

// Files shared with a class the student can safely see: centre-visible library
// resources for the class's subject, excluding mark schemes / answer keys (which
// carry student_visible=false by type). Read-only. Reads the resources seed directly.
const classResourcesForStudent = (subject) => {
  const seed = (typeof RES_RESOURCES_SEED !== 'undefined' ? RES_RESOURCES_SEED : []);
  const types = (typeof RES_TYPES !== 'undefined' ? RES_TYPES : []);
  const label = (t) => (types.find(x => x.id === t) || {}).label || 'File';
  const icon = (t) => (types.find(x => x.id === t) || {}).icon || 'file';
  return seed
    .filter(r => r.visibility === 'centre' && r.subject === subject && r.type !== 'mark_scheme')
    .map(r => ({ id: r.id, title: r.title, typeLabel: label(r.type), icon: icon(r.type), size: r.size }));
};

const fmtBytes = (b) => b == null ? '' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const fmtAnnDate = (iso) => { const d = new Date(iso); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${d.getDate()} ${mo[d.getMonth()]}`; };

// ── Class card visual language ────────────────────────────────────────────────
// A course card reads as three bands: the class's cover (identity), a white body
// (what's happening next) and a hairline stat band (how I'm doing). Nothing here
// is decorative-only — every band answers a question the student actually has.

// "Computer Science" → "CS", "Mathematics" → "MA". Two letters, always.
const subjectMonogram = (subject) => {
  const words = String(subject || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return ((words[0][0] || '') + (words[1][0] || '')).toUpperCase();
  return (words[0] || '?').slice(0, 2).toUpperCase();
};

// One micro-stat in the card's footer band.
const ClassStatCell = ({ label, children, first }) => (
  <div style={{
    flex:1, minWidth:0, padding:'11px 4px 12px', textAlign:'center',
    borderLeft: first ? 'none' : `1px solid ${DS.border}`,
  }}>
    <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.3px', lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>{children}</div>
    <div style={{ fontSize:10, fontWeight:600, color:DS.faint, letterSpacing:'0.07em', textTransform:'uppercase', marginTop:5 }}>{label}</div>
  </div>
);

const StudentClassCard = ({ enr, nextSession, unread, hwDue, attendance, onOpen }) => {
  const [hov, setHov] = React.useState(false);
  const K = window.klasioStudent;
  const c = enr.subjectColor;
  const attColor = attendance == null ? DS.faint : attendance >= 90 ? DS.success : attendance >= 80 ? DS.warning : DS.danger;
  const dayNum = nextSession ? (nextSession.date.match(/(\d+)/) || [])[1] : null;
  const monTxt = nextSession ? ((nextSession.date.match(/\d+\s+(\w+)/) || [])[1] || '').toUpperCase() : '';
  const dowTxt = nextSession ? (nextSession.date.split(' ')[0] || '') : '';

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        textAlign:'left', font:'inherit', background:DS.card, borderRadius:16, padding:0,
        border:`1px solid ${hov ? c + '66' : DS.cardBorder}`,
        boxShadow: hov ? `${DS.cardShadowHi}, 0 12px 28px ${c}1F` : DS.cardShadow,
        transform: hov ? 'translateY(-3px)' : 'none',
        transition:'transform .2s cubic-bezier(.2,.7,.3,1), box-shadow .2s ease, border-color .2s ease',
        cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column',
      }}
    >
      {/* ── Cover: the class's background (a banner strip) ───────────────────── */}
      <div style={{
        position:'relative', height:100, overflow:'hidden', isolation:'isolate',
        padding:'13px 15px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10,
        ...coverStyleVars(enr.coverArt, 'banner'),
      }}>
        <CoverArt cover={enr.coverArt} variant="banner" />
        <span style={{
          position:'relative', display:'inline-flex', alignItems:'center', gap:6, maxWidth:'60%',
          padding:'4px 10px', borderRadius:999, background:'var(--cover-chip-bg)',
          border:'1px solid rgba(255,255,255,0.28)', backdropFilter:'blur(6px)',
          color:'var(--cover-chip-ink)', fontSize:10.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{enr.qualification || enr.subject}</span>

        {unread > 0 && (
          <span title={`${unread} unread announcement${unread === 1 ? '' : 's'}`} style={{
            position:'relative', flexShrink:0, display:'inline-flex', alignItems:'center', gap:5,
            padding:'4px 9px 4px 7px', borderRadius:999, background:'#fff', color:shadeColor(c, -32),
            fontSize:10.5, fontWeight:800, letterSpacing:'0.04em', boxShadow:'0 2px 6px rgba(16,24,40,0.18)',
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:DS.danger }} />
            {unread} NEW
          </span>
        )}

        {/* Circular open affordance — fills on hover. */}
        <span style={{
          position:'absolute', right:15, bottom:14, width:34, height:34, borderRadius:'50%',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          background: hov ? '#fff' : 'rgba(255,255,255,0.18)',
          border:`1px solid rgba(255,255,255,${hov ? 0.9 : 0.32})`,
          backdropFilter:'blur(6px)', transition:'background .18s ease, transform .18s ease',
          transform: hov ? 'translateX(2px)' : 'none',
        }}>
          <Icon name="chevron_r" size={15} color={hov ? shadeColor(c, -22) : '#fff'} />
        </span>
      </div>

      {/* Monogram tile straddles the cover / body seam. */}
      <div style={{ position:'relative', height:0 }}>
        <div style={{
          position:'absolute', left:16, top:-26, width:52, height:52, borderRadius:15,
          background:`linear-gradient(150deg, ${shadeColor(c, -12)}, ${shadeColor(c, -34)})`,
          border:'3px solid #fff', boxShadow:'0 4px 12px rgba(16,24,40,0.16)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:16, fontWeight:800, letterSpacing:'0.02em',
        }}>{subjectMonogram(enr.subject)}</div>
      </div>

      {/* ── Body: identity + what happens next ──────────────────────────────── */}
      <div style={{ padding:'34px 16px 14px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:c, letterSpacing:'0.09em', textTransform:'uppercase', marginBottom:4 }}>
            {enr.group || enr.subject}
          </div>
          <div style={{
            fontSize:16.5, fontWeight:700, color:DS.text, letterSpacing:'-0.35px', lineHeight:1.25,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          }}>{enr.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:8 }}>
            <Avatar name={enr.teacher} size={20} />
            <span style={{ fontSize:12, color:DS.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{enr.teacher}</span>
          </div>
        </div>

        <div style={{
          marginTop:'auto', display:'flex', alignItems:'center', gap:11, padding:'9px 11px',
          borderRadius:12, background: nextSession ? c + '0E' : DS.surface,
          border:`1px solid ${nextSession ? c + '26' : DS.border}`,
        }}>
          {nextSession ? (
            <React.Fragment>
              <div style={{
                width:40, flexShrink:0, textAlign:'center', borderRadius:9, padding:'5px 0',
                background:'#fff', border:`1px solid ${c}2E`,
              }}>
                <div style={{ fontSize:15, fontWeight:800, color:c, lineHeight:1 }}>{dayNum}</div>
                <div style={{ fontSize:8.5, fontWeight:700, color:c, letterSpacing:'0.09em', marginTop:2 }}>{monTxt}</div>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:DS.faint, letterSpacing:'0.08em', textTransform:'uppercase' }}>Next session</div>
                <div style={{ fontSize:12.5, fontWeight:600, color:DS.text, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {dowTxt} {nextSession.time}
                </div>
                <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>{enr.room}</div>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Icon name="calendar" size={15} color={DS.faint} />
              <span style={{ fontSize:12.5, color:DS.muted }}>No upcoming session scheduled</span>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* ── Stat band: how I'm doing in this class ──────────────────────────── */}
      <div style={{ display:'flex', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
        <ClassStatCell label="Homework" first>
          <span style={{ color: hwDue > 0 ? DS.warning : DS.text }}>{hwDue}</span>
        </ClassStatCell>
        <ClassStatCell label="Attendance">
          <span style={{ color:attColor }}>{attendance == null ? '—' : `${attendance}%`}</span>
        </ClassStatCell>
        <ClassStatCell label="Predicted">
          {enr.predictedGrade && K && K.GradeChip
            ? <K.GradeChip value={enr.predictedGrade} qualification={enr.qualification} color={c} variant="bare" title="Predicted grade — set by your teacher" />
            : <span title="Your teacher hasn’t set a predicted grade yet" style={{ color:DS.faint }}>—</span>}
        </ClassStatCell>
      </div>
    </button>
  );
};

const StudentClassesList = ({ onNav, comms }) => {
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const nextFor = (classId) => K.sessions.upcoming.find(s => s.classId === classId && s.status !== 'cancelled');
  const sorted = enrolments.slice().sort((a, b) => {
    const da = (nextFor(a.classId) || {}).starts_at || Infinity, db = (nextFor(b.classId) || {}).starts_at || Infinity;
    return da - db;
  });
  const open = (enr) => { window.__studentClassId = enr.classId; onNav('classes:detail'); };

  return (
    <div style={pageFrame()}>
      <PageHeader title="My Classes" subtitle={`You're enrolled in ${enrolments.length} class${enrolments.length === 1 ? '' : 'es'}`} />
      {enrolments.length === 0 ? (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="book" title="No classes yet" message="You haven't been enrolled in any classes. Your centre adds you to classes." /></div></Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(304px, 1fr))', gap:18, alignItems:'stretch' }}>
          {sorted.map(enr => {
            const anns = classAnnouncementsForStudent(comms, enr.classId);
            return (
              <StudentClassCard key={enr.classId} enr={enr} nextSession={nextFor(enr.classId)}
                unread={anns.filter(a => a.unread).length}
                hwDue={K.homeworkForSubject(enr.subject).due.length}
                attendance={K.metrics.attendanceForClass(enr.classId)}
                onOpen={() => open(enr)} />
            );
          })}
        </div>
      )}
    </div>
  );
};

// A row in the class-detail announcements feed.
const ClassAnnRow = ({ a, teacher, onMessage, onAck, first }) => (
  <div style={{ padding:'15px 20px', borderTop: first ? 'none' : `1px solid ${DS.border}`, background: a.unread ? DS.accentLight : 'transparent' }}>
    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
      <Avatar name={a.authorName} size={36} color={DS.accent} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{a.title}</span>
          {a.unread && <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:DS.accent, padding:'1px 7px', borderRadius:999 }}>New</span>}
          {a.priority === 'urgent' && <Badge variant="danger">Urgent</Badge>}
        </div>
        <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>{a.authorName} · {fmtAnnDate(a.createdAt)}</div>
        <div style={{ fontSize:12.5, color:DS.sub, marginTop:8, lineHeight:1.55, whiteSpace:'pre-wrap' }}>{a.body}</div>
        {a.requiresAck && (
          <div style={{ marginTop:10 }}>
            {a.acked
              ? <span style={{ fontSize:12, fontWeight:600, color:DS.success, display:'inline-flex', alignItems:'center', gap:5 }}><Icon name="check" size={13} color={DS.success} /> Acknowledged</span>
              : <Btn variant="secondary" small icon="check" onClick={() => onAck(a.id)}>Acknowledge</Btn>}
          </div>
        )}
      </div>
    </div>
  </div>
);

const StudentClassDetail = ({ enr, onNav, onBack, comms }) => {
  const K = window.klasioStudent;
  const Shell = window.ClassDetailShell;
  const [tab, setTab] = React.useState('overview');
  const [openSession, setOpenSession] = React.useState(null);
  const color = enr.subjectColor;
  const anns = classAnnouncementsForStudent(comms, enr.classId);
  const hw = K.homeworkForSubject(enr.subject);
  const attendance = K.metrics.attendanceForClass(enr.classId);
  const now = K.now();
  const upcoming = K.sessions.upcoming.filter(s => s.classId === enr.classId);
  const history  = K.sessions.history.filter(s => s.classId === enr.classId);
  const nextSession = upcoming.find(s => s.status !== 'cancelled');
  const attColor = attendance == null ? DS.faint : attendance >= 90 ? DS.success : DS.warning;
  const resources = classResourcesForStudent(enr.subject);
  const totalHw = hw.due.length + hw.submitted.length + hw.marked.length;
  const completion = totalHw ? Math.round(((hw.submitted.length + hw.marked.length) / totalHw) * 100) : 0;
  // The student can only reach their teacher through the monitored comms surface
  // (never a private channel). Opening Communications is that institutional record.
  const messageTeacher = () => onNav('comms:messages');

  // Mark this class's unread announcements read on open (D8).
  React.useEffect(() => {
    if (!comms) return;
    classAnnouncementsForStudent(comms, enr.classId).filter(a => a.unread).forEach(a => comms.markRead(a.id));
  }, [enr.classId]);

  const TABS = [
    { id:'overview',      label:'Overview',      icon:'chart' },
    { id:'announcements', label:'Announcements', icon:'megaphone' },
    { id:'homework',      label:'Homework',      icon:'clip' },
    { id:'sessions',      label:'Sessions',      icon:'calendar' },
    { id:'resources',     label:'Resources',     icon:'folder' },
  ];

  const stat = (label, value, sub, vColor) => (
    <div style={{ padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:vColor || DS.text, letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:DS.muted, marginTop:5 }}>{sub}</div>}
    </div>
  );

  const overview = (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Card title="Next session" icon="calendar" accent={color}>
          <div style={{ padding:'16px 20px' }}>
            {nextSession ? (
              <button onClick={() => setOpenSession(nextSession.id)} style={{ display:'flex', alignItems:'center', gap:14, width:'100%', textAlign:'left', border:'none', background:'none', padding:0, cursor:'pointer' }}>
                <div style={{ width:52, textAlign:'center', flexShrink:0, background:color+'14', borderRadius:10, padding:'8px 0' }}>
                  <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{(nextSession.date.match(/(\d+)/) || [])[1]}</div>
                  <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:'1px', marginTop:2 }}>{(nextSession.date.match(/\d+\s+(\w+)/) || [])[1] ? (nextSession.date.match(/\d+\s+(\w+)/)[1]).toUpperCase() : ''}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:DS.text }}>{nextSession.date} · {nextSession.time}</div>
                  <div style={{ fontSize:12.5, color:DS.muted, marginTop:2 }}>{nextSession.room} · {nextSession.teacher} · {stuRelDay(nextSession.starts_at, now)}</div>
                </div>
                <Icon name="chevron_r" size={15} color={DS.faint} />
              </button>
            ) : <div style={{ fontSize:13, color:DS.faint }}>No upcoming sessions.</div>}
          </div>
        </Card>
        <Card title="Latest announcement" icon="megaphone" accent={DS.accent}>
          <div style={{ padding:'16px 20px' }}>
            {anns.length ? (
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{anns[0].title}</div>
                <div style={{ fontSize:11.5, color:DS.muted, marginTop:2 }}>{anns[0].authorName} · {fmtAnnDate(anns[0].createdAt)}</div>
                <div style={{ fontSize:12.5, color:DS.sub, marginTop:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{anns[0].body}</div>
                <button onClick={() => setTab('announcements')} style={{ marginTop:10, background:'none', border:'none', color:DS.accent, fontSize:12.5, fontWeight:600, cursor:'pointer', padding:0 }}>All announcements →</button>
              </div>
            ) : <div style={{ fontSize:13, color:DS.faint }}>No announcements yet.</div>}
          </div>
        </Card>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Card>{stat('My attendance', attendance == null ? '—' : attendance + '%', attendance == null ? 'No registers yet' : 'This class · last 6 weeks', attColor)}</Card>
        <Card>{stat('Homework completion', completion + '%', `${hw.due.length} due now`, hw.due.length ? DS.warning : DS.success)}</Card>
        <Card>
          <div style={{ padding:'16px 18px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Predicted grade</div>
            {enr.predictedGrade
              ? <K.GradeChip value={enr.predictedGrade} qualification={enr.qualification} color={color} title="Predicted grade — set by your teacher" />
              : <span style={{ fontSize:13, fontWeight:600, color:DS.faint }}>Not set yet</span>}
            <div style={{ fontSize:12, color:DS.muted, marginTop:8 }}>
              {enr.predictedGrade ? `Set by ${enr.teacher}` : `${enr.teacher} hasn’t set one yet`}
              {enr.targetGrade ? ` · target ${enr.targetGrade}` : ''}
            </div>
            {enr.indicativeGrade && <div style={{ fontSize:11.5, color:DS.faint, marginTop:4 }}>Indicative from your results: {enr.indicativeGrade}</div>}
          </div>
        </Card>
      </div>
    </div>
  );

  const hwGroup = (label, rows, tone) => rows.length ? (
    <Card title={`${label} · ${rows.length}`} style={{ marginBottom:16 }}>
      <div>
        {rows.map((h, i) => (
          <div key={h.id} onClick={() => onNav('homework')} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderTop: i ? `1px solid ${DS.border}` : 'none', cursor:'pointer' }}>
            <div style={{ width:3, alignSelf:'stretch', minHeight:28, borderRadius:2, background:tone }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{h.title}</div>
              <div style={{ fontSize:11.5, color: h.overdue ? DS.danger : DS.muted }}>{h.due}</div>
            </div>
            {h.score != null && <ScorePill score={h.score} />}
            <Icon name="chevron_r" size={14} color={DS.faint} />
          </div>
        ))}
      </div>
    </Card>
  ) : null;

  const homework = (
    (hw.due.length + hw.submitted.length + hw.marked.length) === 0 ? (
      <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="notebook_pen" title="No homework" message="Nothing set for this class right now." /></div></Card>
    ) : (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
          <Btn variant="secondary" icon="notebook_pen" small onClick={() => onNav('homework')}>Open homework</Btn>
        </div>
        {hwGroup('Due', hw.due, DS.warning)}
        {hwGroup('Submitted', hw.submitted, DS.info)}
        {hwGroup('Marked', hw.marked, DS.success)}
      </div>
    )
  );

  const announcements = (
    <Card title={`Announcements · ${anns.length}`} icon="megaphone" accent={DS.accent} actions={
      <Btn variant="secondary" icon="message" small onClick={messageTeacher}>Message {enr.teacher.split(' ')[0]}</Btn>
    }>
      {anns.length === 0 ? (
        <div style={{ padding:'40px 20px' }}><EmptyState icon="megaphone" title="No announcements" message="Your teacher hasn't posted to this class yet." /></div>
      ) : anns.map((a, i) => (
        <ClassAnnRow key={a.id} a={a} teacher={enr.teacher} onMessage={messageTeacher} onAck={(id) => comms && comms.acknowledge(id)} first={i === 0} />
      ))}
    </Card>
  );

  const sessions = (
    <div>
      <div style={{ display:'flex', gap:14, marginBottom:18, flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:150 }}>{stat('My attendance', attendance == null ? '—' : attendance + '%', null, attColor)}</Card>
        <Card style={{ flex:1, minWidth:150 }}>{stat('Upcoming', upcoming.filter(s => s.status !== 'cancelled').length, 'next 5 weeks')}</Card>
        <Card style={{ flex:1, minWidth:150 }}>{stat('Attended', enr.sessionsAttended, `of ${enr.sessionsTotal} marked`)}</Card>
      </div>
      {upcoming.length > 0 && (
        <Card title="Upcoming" style={{ marginBottom:16 }}>
          <div>
            {upcoming.map((s, i) => (
              <button key={s.id} onClick={() => setOpenSession(s.id)} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', padding:'12px 18px', border:'none', borderTop: i ? `1px solid ${DS.border}` : 'none', background:'none', cursor:'pointer' }}>
                <Icon name="calendar" size={14} color={s.status === 'cancelled' ? DS.faint : color} />
                <div style={{ flex:1, minWidth:0, fontSize:13, color:DS.text, textDecoration: s.status === 'cancelled' ? 'line-through' : 'none' }}>{s.date} · {s.time}</div>
                {s.status === 'cancelled' || s.status === 'live' ? <StuSessionPill status={s.status} /> : <div style={{ fontSize:12, color:DS.muted }}>{s.room}</div>}
                <Icon name="chevron_r" size={14} color={DS.faint} />
              </button>
            ))}
          </div>
        </Card>
      )}
      <Card title="History">
        {history.length === 0 ? <div style={{ padding:'24px', fontSize:13, color:DS.muted, textAlign:'center' }}>No past sessions yet.</div> :
          history.map((s, i) => (
            <button key={s.id} onClick={() => setOpenSession(s.id)} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', padding:'12px 18px', border:'none', borderTop: i ? `1px solid ${DS.border}` : 'none', background:'none', cursor:'pointer' }}>
              <div style={{ flex:1, minWidth:0, fontSize:13, color:DS.text }}>{s.date} · {s.time}</div>
              <StuSessionPill status={s.status} />
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </button>
          ))}
      </Card>
    </div>
  );

  const resourcesTab = (
    <Card title={`Class resources · ${resources.length}`} icon="folder" accent={color}>
      {resources.length === 0 ? (
        <div style={{ padding:'40px 20px' }}><EmptyState icon="folder" title="No resources shared" message="Files your teacher shares with this class will appear here." /></div>
      ) : (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {resources.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', border:`1px solid ${DS.border}`, borderRadius:10 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:color+'14', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={r.icon} size={16} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{r.title}</div>
                <div style={{ fontSize:11.5, color:DS.muted }}>{r.typeLabel} · {fmtBytes(r.size)}</div>
              </div>
              <Btn variant="ghost" icon="eye" small onClick={() => {}}>Open</Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const body = { overview, announcements, homework, sessions, resources: resourcesTab };

  if (!Shell) return <div style={pageFrame()}><EmptyState icon="book" title="Class unavailable" message="Please reload." /></div>;
  return (
    <Shell
      onBack={onBack} backLabel="My Classes"
      color={color} cover={enr.coverArt}
      chips={[enr.subject, enr.qualification, enr.teacher].filter(Boolean)}
      title={enr.name} subtitle={`${enr.group} · ${enr.day} ${enr.time} · ${enr.room}`}
      tabs={TABS} activeTab={tab} onTab={setTab}
    >
      {body[tab]}
      <StudentSessionDrawer sessionId={openSession} onClose={() => setOpenSession(null)} onNav={onNav} />
    </Shell>
  );
};

const StudentClassesPage = ({ section, onNav, comms }) => {
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const enr = section === 'detail' ? enrolments.find(e => e.classId === window.__studentClassId) : null;
  if (section === 'detail') {
    if (!enr) return (
      <div style={pageFrame()}>
        <EmptyState icon="book" title="Class not found" message="This class may have changed." action={<Btn variant="primary" onClick={() => onNav('classes')}>Back to My Classes</Btn>} />
      </div>
    );
    return <StudentClassDetail enr={enr} onNav={onNav} onBack={() => onNav('classes')} comms={comms} />;
  }
  return <StudentClassesList onNav={onNav} comms={comms} />;
};

// ─── Router ────────────────────────────────────────────────────────────────────
const StudentDashboard = ({ page = 'dashboard', section, onNav, comms }) => {
  if (page === 'homework') return <StudentHomework section={section} onNav={onNav} />;
  if (page === 'progress') return <StudentProgressPage />;
  if (page === 'sessions') return <StudentSessionsPage onNav={onNav} />;
  if (page === 'classes')  return <StudentClassesPage section={section} onNav={onNav} comms={comms} />;
  if (page === 'reports') return <StudentReports />;
  return <StudentOverview onNav={onNav} comms={comms} />;
};

Object.assign(window, { StudentDashboard });
