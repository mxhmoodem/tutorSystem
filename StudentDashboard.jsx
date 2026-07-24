// ══════════════════════════════════════════════════════════════
//  Klasio — Student Dashboard (Overview · Progress · Sessions)
// ══════════════════════════════════════════════════════════════

// Identity, enrolments (subjects/teachers/predicted grades), rollup metrics, the
// grade model and the active term all come from the student SoT
// (studentData.jsx → window.klasioStudent), loaded before this file. Homework lives
// in Homework.jsx (StudentHomework); reports come from the shared reports store
// (Reports.jsx, window.StudentReports). The studentHomework mock still seeds the
// Overview "due soon" list via klasioStudent.metrics.homeworkSummary().

// ─── Overview page ─────────────────────────────────────────────────────────────
// Subject themes — pastel cards with abstract shapes
const subjectThemes = {
  'Mathematics':   { tint:'#FEEEE0', tint2:'#F8C9A4', deep:'#A6531B', text:'#79300E', shape:'#FA9B62', shapeShadow:'#F4B58F', symbol:'square', glyph:'∫' },
  'Further Maths': { tint:'#EFE9FC', tint2:'#C9BAF5', deep:'#6B5BA8', text:'#332083', shape:'#8D75E9', shapeShadow:'#B6A6F5', symbol:'diamond', glyph:'Σ' },
  'Physics':       { tint:'#E7F4FD', tint2:'#B4DBF6', deep:'#4B7EA8', text:'#124979', shape:'#5BA6EA', shapeShadow:'#86BFEC', symbol:'circle', glyph:'⚛' },
  'Chemistry':     { tint:'#FDEFE0', tint2:'#F8CFA2', deep:'#9A5B22', text:'#7A3E12', shape:'#F0A45C', shapeShadow:'#F6C394', symbol:'diamond', glyph:'⚗' },
  'Biology':       { tint:'#E7F6EC', tint2:'#BEE7CC', deep:'#2E7D48', text:'#14532D', shape:'#4FB477', shapeShadow:'#93D3AC', symbol:'circle', glyph:'✿' },
  'English':       { tint:'#FDE9F1', tint2:'#F6C2D8', deep:'#A83B6B', text:'#7A1E45', shape:'#E96FA0', shapeShadow:'#F2A8C6', symbol:'square', glyph:'A' },
  'English Literature': { tint:'#FDE9F1', tint2:'#F6C2D8', deep:'#A83B6B', text:'#7A1E45', shape:'#E96FA0', shapeShadow:'#F2A8C6', symbol:'square', glyph:'A' },
  'English Lit.':  { tint:'#FDE9F1', tint2:'#F6C2D8', deep:'#A83B6B', text:'#7A1E45', shape:'#E96FA0', shapeShadow:'#F2A8C6', symbol:'square', glyph:'A' },
};

// Any subject NOT curated above still gets a clean, subject-coloured card (built
// from the enrolment's subjectColor) with a monogram glyph — so a student's real
// subjects never fall back to the Maths ∫ card.
const hexToTheme = (hex, subject) => {
  const c = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#0F9D7F';
  return {
    tint: c + '14', tint2: c + '30', deep: c, text: c,
    shape: c, shapeShadow: c + '80', symbol: 'circle',
    glyph: (String(subject || '?').trim()[0] || '?').toUpperCase(),
  };
};

const SubjectShape = ({ theme }) => {
  if (theme.symbol === 'square') {
    // Two rounded squares stacked, slight rotation, plus a small white circle
    return (
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ position:'absolute', top:6, right:0 }}>
        {/* shadow square behind */}
        <rect x="48" y="34" width="78" height="78" rx="14" transform="rotate(18 87 73)" fill={theme.shapeShadow} />
        {/* main square */}
        <rect x="42" y="28" width="78" height="78" rx="14" transform="rotate(10 81 67)" fill={theme.shape} />
        {/* glyph inside main square */}
        <text x="81" y="78" textAnchor="middle" fontSize="38" fontWeight="700" fill="#fff" fontFamily="Georgia, serif" transform="rotate(10 81 67)">{theme.glyph}</text>
        {/* small white circle bottom-left */}
        <circle cx="40" cy="112" r="10" fill="#FFFFFF" />
      </svg>
    );
  }
  if (theme.symbol === 'diamond') {
    // Single big rotated rounded square (appears as a diamond)
    return (
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ position:'absolute', top:6, right:0 }}>
        <rect x="48" y="30" width="72" height="72" rx="12" transform="rotate(45 84 66)" fill={theme.shape} />
        <text x="84" y="78" textAnchor="middle" fontSize="36" fontWeight="700" fill="#fff" fontFamily="Georgia, serif">{theme.glyph}</text>
      </svg>
    );
  }
  // circle
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" style={{ position:'absolute', top:6, right:0 }}>
      {/* outer ring */}
      <circle cx="86" cy="66" r="46" fill="none" stroke={theme.shape} strokeWidth="2" opacity="0.45" />
      {/* main circle */}
      <circle cx="86" cy="66" r="38" fill={theme.shape} />
      {/* glyph inside circle */}
      <text x="86" y="79" textAnchor="middle" fontSize="38" fontWeight="700" fill="#fff" fontFamily="'Segoe UI Symbol', 'Apple Color Emoji', system-ui, sans-serif">{theme.glyph}</text>
    </svg>
  );
};

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

// ─── Reusable month calendar ─────────────────────────────────────────────────────
// ONE month-grid implementation, used by both the full Sessions page (variant="full",
// event chips in each cell) and the dashboard right-rail mini calendar
// (variant="mini", dotted session days + day selection). Session dates, today and the
// per-subject colour all come from the caller — the grid never invents a date.
const MonthCalendar = ({
  month, today, sessionsByDay = {}, subjColor = () => DS.accent,
  variant = 'full', selectedDay = null, onSelectDay,
  onPrev, onNext, onToday, legend, title,
}) => {
  const cells = [];
  for (let i = 0; i < month.firstDow; i++) cells.push(null);
  for (let d = 1; d <= month.days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const mini = variant === 'mini';
  const navBtn = (label, onClick, rotate) => (
    <button aria-label={label} onClick={onClick} style={{
      width: mini ? 26 : 30, height: mini ? 26 : 30, borderRadius:7, border:`1px solid ${DS.border}`,
      background:DS.bg, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center',
    }}>
      <span style={{ display:'inline-flex', transform: rotate ? 'rotate(180deg)' : 'none' }}>
        <Icon name="chevron_r" size={13} color={DS.muted} strokeWidth={2} />
      </span>
    </button>
  );
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: mini ? 10 : 16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {!mini && <Icon name="calendar" size={16} color={DS.muted} />}
          <div style={{ fontSize: mini ? 14 : 17, fontWeight:700, color:DS.text, letterSpacing:'-0.3px' }}>{title || month.name}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {legend}
          {onPrev && navBtn('Previous month', onPrev, true)}
          {onToday && <button onClick={onToday} style={{ padding: mini ? '4px 9px' : '6px 12px', borderRadius:7, border:`1px solid ${DS.border}`, background:DS.bg, fontSize:12, fontWeight:500, color:DS.sub, cursor:'pointer' }}>Today</button>}
          {onNext && navBtn('Next month', onNext, false)}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: mini ? 3 : 6, marginBottom: mini ? 3 : 6 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ fontSize: mini ? 9 : 11, fontWeight:700, color:DS.muted, letterSpacing:'1px', textAlign:'center', padding: mini ? '2px 0' : '4px 0' }}>{d.toUpperCase()}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: mini ? 3 : 6 }}>
        {cells.map((d, i) => {
          const isToday = d === today;
          const items = (d && sessionsByDay[d]) || [];
          const selected = d != null && d === selectedDay;
          if (mini) {
            const clickable = d != null;
            return (
              <button key={i} disabled={!clickable} onClick={() => clickable && onSelectDay && onSelectDay(d)} style={{
                aspectRatio:'1 / 1', border: selected ? `1.5px solid ${DS.accent}` : isToday ? `1.5px solid ${DS.accentBorder}` : '1px solid transparent',
                background: d == null ? 'transparent' : selected ? DS.accentLight : 'transparent',
                borderRadius:8, cursor: clickable ? 'pointer' : 'default', padding:0, position:'relative',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                opacity: d == null ? 0 : 1,
              }}>
                <span style={{ fontSize:11.5, fontWeight: isToday || selected ? 700 : 500, color: isToday ? DS.accent : DS.sub, lineHeight:1 }}>{d}</span>
                <span style={{ display:'flex', gap:2, height:4 }}>
                  {items.slice(0, 3).map((s, j) => (
                    <span key={j} style={{ width:4, height:4, borderRadius:'50%', background: s.status === 'missed' ? DS.danger : subjColor(s.subject) }} />
                  ))}
                </span>
              </button>
            );
          }
          return (
            <div key={i} style={{
              minHeight:90, padding:'8px 8px 6px', borderRadius:9,
              background: d == null ? 'transparent' : isToday ? DS.accentLight : DS.surface,
              border: d == null ? 'none' : `1px solid ${isToday ? DS.accentBorder : DS.border}`,
              opacity: d == null ? 0 : 1, display:'flex', flexDirection:'column', gap:4,
            }}>
              {d != null && (<>
                <div style={{ fontSize:12, fontWeight: isToday ? 700 : 600, color: isToday ? DS.accent : DS.sub, marginBottom:2 }}>{d}</div>
                {items.slice(0, 3).map((s, j) => {
                  const color = subjColor(s.subject);
                  const missed = s.status === 'missed';
                  return (
                    <div key={j} title={`${s.subject} · ${s.time}`} style={{
                      fontSize:10.5, fontWeight:600, color: missed ? DS.danger : color,
                      background: missed ? DS.dangerBg : color + '18', borderLeft:`2px solid ${missed ? DS.danger : color}`,
                      padding:'3px 6px', borderRadius:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      textDecoration: missed ? 'line-through' : 'none',
                    }}>{s.time.split('–')[0]} {s.subject.split(' ')[0]}</div>
                  );
                })}
                {items.length > 3 && <div style={{ fontSize:10, color:DS.muted }}>+{items.length - 3} more</div>}
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dashboard right rail (D5/D6) — identity · mini calendar · up next · announce ─
const StudentOverviewRail = ({ K, cs, enrolments, pendingHw, latestReports, comms, onNav }) => {
  const cal = K.activeTerm.calendar;
  const [month] = React.useState({ name: cal.name, firstDow: cal.firstDow, days: cal.days });
  const [selectedDay, setSelectedDay] = React.useState(cal.today);
  const subjColor = (name) => { const e = K.getEnrolment(name); return e ? e.subjectColor : DS.accent; };

  const sessionsByDay = {};
  [...K.sessions.upcoming, ...K.sessions.history].forEach(s => { (sessionsByDay[s.day] = sessionsByDay[s.day] || []).push(s); });
  const dayItems = sessionsByDay[selectedDay] || [];

  // Up next — the next 3 items merged across upcoming sessions, homework due dates and
  // newly published reports, ordered so the most pressing surfaces first.
  const upNext = [];
  K.sessions.upcoming.forEach(s => upNext.push({ type:'session', icon:'calendar', color:subjColor(s.subject), title:s.subject, meta:`${s.date} · ${s.time.split('–')[0]}`, sort: 20 + (s.day || 0), go:() => onNav('sessions') }));
  pendingHw.forEach(h => { const rank = { overdue:0, 'due-today':1, 'due-tomorrow':2, upcoming:3 }[K.dueState(h)]; upNext.push({ type:'homework', icon:'clip', color: rank <= 1 ? DS.danger : DS.warning, title:h.title, meta:`${h.subject} · ${K.dueLabel(h)}`, sort: rank, go:() => onNav('homework') }); });
  latestReports.forEach(r => upNext.push({ type:'report', icon:'file', color:DS.info, title:r.title, meta:`${r.subject} · report`, sort: 50, go:() => onNav('reports') }));
  const upNextTop = upNext.sort((a, b) => a.sort - b.sort).slice(0, 3);

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

      {/* Mini calendar */}
      <div style={cardWrap}>
        <div style={{ padding:'14px 16px' }}>
          <MonthCalendar
            month={month} today={cal.today} sessionsByDay={sessionsByDay} subjColor={subjColor}
            variant="mini" selectedDay={selectedDay} onSelectDay={setSelectedDay}
            onPrev={() => {}} onNext={() => {}} title={month.name}
          />
          <div style={{ marginTop:10, borderTop:`1px solid ${DS.border}`, paddingTop:10 }}>
            {dayItems.length ? dayItems.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: s.status === 'missed' ? DS.danger : subjColor(s.subject), flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0, fontSize:12, color:DS.text }}>{s.subject}</div>
                <div style={{ fontSize:11, color:DS.muted }}>{s.time.split('–')[0]}</div>
              </div>
            )) : <div style={{ fontSize:12, color:DS.faint, padding:'4px 0' }}>Nothing on {cal.name.split(' ')[0]} {selectedDay}.</div>}
          </div>
        </div>
      </div>

      {/* Up next */}
      <div style={cardWrap}>
        {cardHead('Up next')}
        {upNextTop.length ? upNextTop.map((it, i) => (
          <button key={i} onClick={it.go} style={{ display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left', padding:'11px 16px', border:'none', borderTop:`1px solid ${DS.border}`, background:'none', cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:8, background: it.color + '18', color: it.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={it.icon} size={15} /></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:DS.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.title}</div>
              <div style={{ fontSize:11, color:DS.muted }}>{it.meta}</div>
            </div>
            <Icon name="chevron_r" size={14} color={DS.faint} />
          </button>
        )) : <div style={{ padding:'12px 16px 16px', fontSize:12.5, color:DS.faint }}>You're all caught up.</div>}
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
  const avgScore    = K.metrics.termAverage();            // term avg, all subjects
  const termTrend   = K.metrics.termTrendDelta();          // computed, not decorative
  const attendance  = K.metrics.attendanceOverall();       // one figure, all subjects
  const perWeek     = K.metrics.sessionsPerWeek();
  const nextSession = K.sessions.upcoming[0];
  const reportsStore = useReportsStore();
  const latestReports = reportsStore.reportsArr
    .filter(r => r.studentId === cs.id && r.status === 'published')
    .sort((a,b) => (b.datePublished||'').localeCompare(a.datePublished||''))
    .slice(0,3);

  const narrow = useViewportNarrow(1100);
  const rail = (
    <StudentOverviewRail K={K} cs={cs} enrolments={enrolments} pendingHw={pendingHw} latestReports={latestReports} comms={comms} onNav={onNav} />
  );

  // Single-row subjects carousel — scroll horizontally when subjects overflow
  const subjectsRef = React.useRef(null);
  const scrollSubjects = (dir) => {
    const el = subjectsRef.current;
    if (el) el.scrollBy({ left: dir * 336, behavior: 'smooth' });
  };

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

  return (
    <div style={{ padding: '32px' }}>
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
              {cs.yearGroup.toUpperCase()} · {K.activeTerm.banner.toUpperCase()}
            </div>
            <h1 style={{ fontSize:38, fontWeight:800, color:'#fff', margin:'0 0 10px', letterSpacing:'-1px', lineHeight:1.05 }}>
              Good morning, {cs.displayName}
            </h1>
            <div style={{ fontSize:15, color:'rgba(255,255,255,0.88)', lineHeight:1.5, marginBottom:22 }}>
              You're <strong style={{ color:'#fff' }}>on track</strong> across your {enrolments.length} class{enrolments.length === 1 ? '' : 'es'} this term. {pendingHw.length} piece{pendingHw.length === 1 ? '' : 's'} of homework due, {urgentCount} urgent.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {/* §9: targets the most-urgent in-progress assignment (overdue → due
                  today → soonest). Overview no longer owns "Download report" —
                  the Reports section is the single owner of report download. */}
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

          {/* Stat tiles 2x2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {heroStat('Average score', `${avgScore}%`, `${termTrend >= 0 ? '+' : ''}${termTrend}% vs last · all subjects`)}
            {heroStat('Attendance', `${attendance}%`, 'All subjects, this term')}
            {heroStat('Homework due', pendingHw.length, urgentCount ? `${urgentCount} urgent` : 'None urgent')}
            {heroStat('Sessions / wk', perWeek, nextSession ? `Next ${nextSession.date} ${nextSession.time.split('–')[0]}` : '—')}
          </div>
        </div>
      </div>

      {/* My classes — cards keyed by CLASS (a student with two classes in one subject
          sees two cards). Card click opens the class detail. */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:DS.text, margin:'0 0 4px', letterSpacing:'-0.4px' }}>My classes</h2>
          <div style={{ fontSize:13, color:DS.muted }}>Latest scores and predicted grades</div>
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
          const theme = subjectThemes[s.subject] || hexToTheme(s.subjectColor, s.subject);
          const latest = s.scores[s.scores.length-1];
          const openClass = () => { window.__studentClassId = s.classId; onNav('classes:detail'); };
          const nextForClass = K.sessions.upcoming.find(x => x.subject === s.subject);
          return (
            <button key={s.classId} onClick={openClass} style={{
              position:'relative', overflow:'hidden', flex:'1 0 280px', scrollSnapAlign:'start', textAlign:'left',
              background: `linear-gradient(150deg, ${theme.tint} 0%, ${theme.tint2} 100%)`, borderRadius:18, border:'none', cursor:'pointer',
              padding:'22px 24px 24px', minHeight:220,
              display:'flex', flexDirection:'column', justifyContent:'space-between',
            }}>
              <SubjectShape theme={theme} />
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:700, color:theme.deep, letterSpacing:'0.5px', opacity:0.85, background:'rgba(255,255,255,0.45)', padding:'2px 8px', borderRadius:999 }}>{s.subject}</div>
                <div style={{ fontSize:22, fontWeight:800, color:theme.text, marginTop:8, letterSpacing:'-0.5px' }}>{s.name}</div>
                <div style={{ fontSize:12, color:theme.deep, opacity:0.8, marginTop:4 }}>{s.teacher}{nextForClass ? ` · Next ${nextForClass.date}` : ''}</div>
              </div>
              <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:42, fontWeight:800, color:theme.text, letterSpacing:'-1.5px', lineHeight:1 }}>{latest}%</div>
                  <div style={{ fontSize:12, color:theme.deep, marginTop:4, opacity:0.75 }}>Latest score · {s.scores.length} assessments</div>
                </div>
                {/* Predicted grade is teacher-set + read-only, rendered through the
                    canonical grade model (§3) for this enrolment's qualification. */}
                <div title="Predicted grade — set by your teacher" style={{
                  background:'rgba(255,255,255,0.55)', borderRadius:10,
                  padding:'8px 10px', textAlign:'center', minWidth:54,
                }}>
                  <div style={{ fontSize:18, fontWeight:800, color:theme.text, lineHeight:1 }}><K.GradeChip value={s.predictedGrade} qualification={s.qualification} color={theme.text} variant="bare" title="Predicted grade — set by your teacher" /></div>
                  <div style={{ fontSize:9, fontWeight:700, color:theme.deep, letterSpacing:'1px', marginTop:3, opacity:0.8 }}>PREDICTED</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3-column footer: Due soon · Upcoming sessions · Latest feedback */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
        {/* Due soon */}
        <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px 12px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:DS.text }}>Due soon</div>
            <button onClick={() => onNav('homework')} style={{ background:'none', border:'none', color:DS.muted, fontSize:12, cursor:'pointer' }}>See all</button>
          </div>
          {pendingHw.slice(0,3).map((hw, i, arr) => {
            const enr   = K.getEnrolment(hw.subject);
            const color = enr ? enr.subjectColor : DS.accent;
            // §9: ONE correct due-state per item (no more "Today" + "Overdue"
            // together). §6: teacher resolves from the enrolment, not the row.
            const state = K.dueState(hw);
            const badgeVariant = state === 'overdue' ? 'danger' : state === 'due-today' ? 'warning' : 'default';
            const alarm = state === 'overdue' || state === 'due-today';
            return (
              <div key={hw.id} style={{
                padding:'14px 18px',
                borderTop:`1px solid ${DS.border}`,
                borderLeft:`3px solid ${color}`,
                display:'flex', alignItems:'center', gap:10,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{hw.title}</span>
                  </div>
                  <div style={{ fontSize:11, color:DS.muted, marginBottom:4 }}>{hw.subject} · {K.resolveTeacher(hw.subject)}</div>
                  <div style={{ fontSize:11, fontWeight: alarm ? 600 : 400, color: alarm ? DS.danger : DS.muted }}>
                    Due {hw.due.replace(', 11:59 PM','').replace('Today','today').replace(/PM/, 'pm')}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  <Badge variant={badgeVariant}>{K.dueLabel(hw)}</Badge>
                  <Btn variant="primary" small onClick={() => onNav('homework')}>Start</Btn>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming sessions */}
        <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px 12px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:DS.text }}>Upcoming sessions</div>
            <button onClick={() => onNav('sessions')} style={{ background:'none', border:'none', color:DS.muted, fontSize:12, cursor:'pointer' }}>See all</button>
          </div>
          {K.sessions.upcoming.slice(0,3).map((s, i) => {
            const enr = K.getEnrolment(s.subject);
            const color = enr ? enr.subjectColor : DS.accent;
            const m = s.date.match(/(\d+)\s+(\w+)/);
            const day = m ? m[1] : '';
            const mon = m ? m[2].toUpperCase() : '';
            return (
              <div key={i} style={{
                padding:'14px 18px',
                borderTop:`1px solid ${DS.border}`,
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{
                  width:44, flexShrink:0, textAlign:'center',
                  background: color + '14', borderRadius:8, padding:'6px 0',
                }}>
                  <div style={{ fontSize:18, fontWeight:800, color, lineHeight:1 }}>{day}</div>
                  <div style={{ fontSize:9, fontWeight:700, color, letterSpacing:'1px', marginTop:2 }}>{mon}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{s.subject}</div>
                  <div style={{ fontSize:11, color:DS.muted }}>{s.time} · {s.room}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Latest reports */}
        <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px 12px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:DS.text }}>Latest reports</div>
            <button onClick={() => onNav('reports')} style={{ background:'none', border:'none', color:DS.muted, fontSize:12, cursor:'pointer' }}>See all</button>
          </div>
          {latestReports.length === 0 && (
            <div style={{ padding:'14px 18px', borderTop:`1px solid ${DS.border}`, fontSize:12.5, color:DS.faint }}>No reports published yet.</div>
          )}
          {latestReports.map((r, i) => {
            const color = r.subjectColor || DS.accent;
            const acked = r.acknowledgement && r.acknowledgement.ack;
            return (
              <div key={r.id} onClick={() => onNav('reports')} style={{
                padding:'14px 18px', borderTop:`1px solid ${DS.border}`, cursor:'pointer',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text, lineHeight:1.3 }}>{r.title}</div>
                  <span style={{
                    fontSize:10.5, fontWeight:700, whiteSpace:'nowrap',
                    color: acked ? DS.success : DS.accent,
                    background: acked ? DS.successBg : DS.accentLight,
                    border: `1px solid ${acked ? DS.successBorder : DS.accentBorder}`,
                    padding:'2px 8px', borderRadius:999,
                  }}>{acked ? '✓ Read' : 'New'}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:DS.muted }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:color }} />
                  {r.subject} · {r.teacher} · {r.period}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
};

// NOTE: the student Homework surface (Assignments · Submitted · Results, the full
// attempt/submission/marking loop) lives in Homework.jsx as `StudentHomework` and
// is what the router renders. The earlier local `StudentHomeworkPage` here was a
// dead, never-routed duplicate (plain textarea submit) and has been removed.

// ─── Progress page ──────────────────────────────────────────────────────────────
const StudentProgressPage = () => {
  // §2/§4: subjects, scores, per-subject class averages, predicted grades and
  // attendance all come from the enrolment SoT + studentMetrics. Attendance here
  // is the SAME record the Overview all-subjects figure derives from (§4), just
  // scoped to this subject and labelled as such.
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const [activeSub, setActiveSub] = React.useState(0);
  const sub = enrolments[activeSub];
  const classAvg = sub.classAvg;
  const scoreLabels = K.activeTerm.assessmentLabels;

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Progress" subtitle="Track your score trends and predicted grades across subjects" />

      {/* Subject tabs */}
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        {enrolments.map((s, i) => (
          <button key={s.subject} onClick={() => setActiveSub(i)} style={{
            padding:'8px 20px', borderRadius:20, border:`1px solid ${activeSub===i ? s.subjectColor : DS.border}`,
            background: activeSub===i ? s.subjectColor + '18' : DS.bg,
            color: activeSub===i ? s.subjectColor : DS.muted,
            fontSize:14, fontWeight: activeSub===i ? 600 : 400, cursor:'pointer',
          }}>{s.subject}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>
        <div>
          {/* Score trend chart */}
          <Card title={`Score Trend — ${sub.subject}`} style={{ marginBottom:20 }} actions={[
            <div key="leg" style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:16, height:2, background:sub.subjectColor, borderRadius:2 }} />
                <span style={{ fontSize:11, color:DS.muted }}>Your score</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:16, height:2, background:DS.border, borderRadius:2 }} />
                <span style={{ fontSize:11, color:DS.muted }}>Class avg</span>
              </div>
            </div>
          ]}>
            <div style={{ padding:'16px 20px 8px' }}>
              <LineChart
                labels={scoreLabels}
                series={[
                  { label:'Your score', data:sub.scores,  color:sub.subjectColor },
                  { label:'Class avg',  data:classAvg,     color:DS.borderDark },
                ]}
                height={220}
              />
            </div>
          </Card>

          {/* Assessment history table */}
          <Card title="Assessment History">
            <Table
              cols={['Assessment','Date','Your Score','Class Avg','vs Average']}
              rows={scoreLabels.map((date, i) => {
                const mine = sub.scores[i];
                const avg  = classAvg[i];
                const diff = mine - avg;
                return [
                  <span style={{ fontSize:13, color:DS.text }}>Assessment {i+1}</span>,
                  <span style={{ fontSize:13, color:DS.muted }}>{date}</span>,
                  <ScorePill score={mine} />,
                  <span style={{ fontSize:13, color:DS.muted }}>{avg}%</span>,
                  <span style={{ fontSize:12, fontWeight:600, color: diff >= 0 ? DS.success : DS.danger }}>
                    {diff >= 0 ? '+' : ''}{diff}%
                  </span>,
                ];
              })}
            />
          </Card>
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Summary card */}
          {(() => {
            const attendance = K.metrics.attendanceForSubject(sub.subject);
            const vsClass    = K.metrics.subjectVsClass(sub.subject);
            const subjectAvg = K.metrics.subjectAverage(sub.subject);
            return (
          <div style={{
            background:DS.bg, border:`1px solid ${DS.border}`,
            borderRadius:10, padding:'24px',
            borderTop:`3px solid ${sub.subjectColor}`,
          }}>
            <div style={{ fontSize:13, color:DS.muted, marginBottom:12 }}>{sub.subject} summary</div>
            <div style={{ fontSize:40, fontWeight:800, color:DS.text, letterSpacing:'-1px', lineHeight:1 }}>
              {sub.scores[sub.scores.length-1]}%
            </div>
            <div style={{ fontSize:12, color:DS.muted, marginTop:4 }}>Latest score · {subjectAvg}% avg this term</div>
            <Divider />
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:DS.muted }}>Predicted grade</span>
              <span style={{ fontSize:16 }}><K.GradeChip value={sub.predictedGrade} qualification={sub.qualification} color={sub.subjectColor} variant="bare" /></span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:DS.muted }}>Attendance <span style={{ color:DS.faint }}>· this subject</span></span>
              <span style={{ fontSize:13, fontWeight:600, color: attendance > 95 ? DS.success : DS.warning }}>{attendance}%</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:DS.muted }}>{vsClass >= 0 ? 'Above' : 'Below'} class avg</span>
              <span style={{ fontSize:13, fontWeight:600, color: vsClass >= 0 ? DS.success : DS.danger }}>
                {vsClass >= 0 ? '+' : ''}{vsClass}%
              </span>
            </div>
          </div>
            );
          })()}

          {/* All subjects summary */}
          <Card title="All Subjects">
            <div style={{ padding:'8px 0' }}>
              {enrolments.map((s, i) => (
                <div key={s.subject} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                  borderBottom: i < enrolments.length-1 ? `1px solid ${DS.border}` : 'none',
                  cursor:'pointer', background: activeSub===i ? s.subjectColor+'0A' : 'transparent',
                }} onClick={() => setActiveSub(i)}>
                  <div style={{ width:3, height:36, borderRadius:2, background:s.subjectColor, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{s.subject}</div>
                    <div style={{ fontSize:11, color:DS.muted }}>Predicted <K.GradeChip value={s.predictedGrade} qualification={s.qualification} color={s.subjectColor} variant="bare" /></div>
                  </div>
                  <ScorePill score={s.scores[s.scores.length-1]} />
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
const StudentSessionsPage = () => {
  const K = window.klasioStudent;
  // §2/§6: sessions, teachers and rooms all come from the enrolment SoT — no
  // invented "Mr Davies" / "Dr Patel". §7: the calendar month is the single
  // active-term value. Read-only — students can't self-book (correct).
  const { upcoming, history } = K.sessions;
  const cal = K.activeTerm.calendar;
  const [month] = React.useState({ name: cal.name, firstDow: cal.firstDow, days: cal.days });

  const sessionsByDay = {};
  [...upcoming, ...history].forEach(s => {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = [];
    sessionsByDay[s.day].push(s);
  });

  const today = cal.today; // demo "today" (single source: active term)

  const subjColor = (name) => {
    const enr = K.getEnrolment(name);
    return enr ? enr.subjectColor : DS.accent;
  };

  // Export-to-Calendar (ICS): build a minimal VCALENDAR from the upcoming sessions
  // and trigger a client-side download. No backend — an in-memory blob only.
  const exportICS = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const dt = (day, hhmm) => `202604${pad(day)}T${hhmm.replace(':', '')}00`;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Klasio//Student Sessions//EN'];
    upcoming.forEach((s, i) => {
      const [start, end] = s.time.split('–');
      lines.push('BEGIN:VEVENT',
        `UID:klasio-session-${s.day}-${i}@klasio`,
        `DTSTART:${dt(s.day, start)}`,
        `DTEND:${dt(s.day, end)}`,
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
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Sessions" subtitle="Your upcoming and past tutoring sessions" actions={[
        <Btn key="cal" variant="secondary" icon="download" small onClick={exportICS}>Export to Calendar</Btn>
      ]} />

      {/* Calendar — shared MonthCalendar (full variant) */}
      <div style={{
        background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12,
        padding:'20px 22px', marginBottom:28,
      }}>
        <MonthCalendar
          month={month} today={today} sessionsByDay={sessionsByDay} subjColor={subjColor} variant="full"
          onPrev={() => {}} onToday={() => {}} onNext={() => {}}
          legend={
            <div style={{ display:'flex', alignItems:'center', gap:14, marginRight:14 }}>
              {K.getEnrolments().map(s => (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.subjectColor }} />
                  <span style={{ fontSize:11, color:DS.muted }}>{s.subject}</span>
                </div>
              ))}
            </div>
          }
        />
      </div>

      {/* Upcoming row */}
      <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:12 }}>Upcoming</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:32 }}>
        {upcoming.map((s, i) => {
          const color = subjColor(s.subject);
          return (
            <div key={i} style={{
              background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:10,
              padding:'18px', borderTop:`3px solid ${color}`,
            }}>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{s.subject}</div>
              <div style={{ fontSize:12, color:DS.muted, marginBottom:14 }}>{s.teacher}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[['calendar', s.date], ['clock', s.time], ['home', s.room]].map(([icon, txt]) => (
                  <div key={txt} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:DS.muted }}>
                    <Icon name={icon} size={12} color={DS.faint} />
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* History */}
      <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:12 }}>History</div>
      <Card>
        {history.map((s, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
            borderBottom: i < history.length-1 ? `1px solid ${DS.border}` : 'none',
          }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{s.subject}</div>
              <div style={{ fontSize:12, color:DS.muted }}>{s.teacher} · {s.date} · {s.time}</div>
            </div>
            <Badge variant={s.status === 'attended' ? 'success' : 'danger'}>
              {s.status === 'attended' ? 'Attended' : 'Missed'}
            </Badge>
          </div>
        ))}
      </Card>
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

const StudentClassCard = ({ enr, nextSession, unread, hwDue, attendance, onOpen }) => (
  <button onClick={onOpen} style={{
    textAlign:'left', background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:14,
    padding:0, cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column',
  }}>
    <div style={{ height:6, background:enr.subjectColor }} />
    <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:DS.text, letterSpacing:'-0.2px' }}>{enr.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:600, color:enr.subjectColor, background:enr.subjectColor + '18', border:`1px solid ${enr.subjectColor}44`, padding:'2px 8px', borderRadius:999 }}>{enr.subject}</span>
            <span style={{ fontSize:11.5, color:DS.muted }}>{enr.teacher}</span>
          </div>
        </div>
        {unread > 0 && (
          <span title={`${unread} unread announcement${unread === 1 ? '' : 's'}`} style={{ flexShrink:0, minWidth:20, height:20, borderRadius:999, background:DS.accent, color:'#fff', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 6px' }}>{unread}</span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:DS.muted }}>
        <Icon name="calendar" size={13} color={DS.faint} />
        {nextSession ? `${nextSession.date} · ${nextSession.time.split('–')[0]} · ${enr.room}` : 'No upcoming session'}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:'auto', paddingTop:8, borderTop:`1px solid ${DS.border}` }}>
        <div><div style={{ fontSize:15, fontWeight:800, color:DS.text }}>{hwDue}</div><div style={{ fontSize:10.5, color:DS.faint }}>Homework due</div></div>
        <div><div style={{ fontSize:15, fontWeight:800, color: attendance >= 90 ? DS.success : DS.warning }}>{attendance}%</div><div style={{ fontSize:10.5, color:DS.faint }}>Attendance</div></div>
      </div>
    </div>
  </button>
);

const StudentClassesList = ({ onNav, comms }) => {
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const nextFor = (subject) => K.sessions.upcoming.find(s => s.subject === subject);
  const sorted = enrolments.slice().sort((a, b) => {
    const da = (nextFor(a.subject) || {}).day || 99, db = (nextFor(b.subject) || {}).day || 99;
    return da - db;
  });
  const open = (enr) => { window.__studentClassId = enr.classId; onNav('classes:detail'); };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Classes" subtitle={`You're enrolled in ${enrolments.length} class${enrolments.length === 1 ? '' : 'es'}`} />
      {enrolments.length === 0 ? (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="book" title="No classes yet" message="You haven't been enrolled in any classes. Your centre adds you to classes." /></div></Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {sorted.map(enr => {
            const anns = classAnnouncementsForStudent(comms, enr.classId);
            return (
              <StudentClassCard key={enr.classId} enr={enr} nextSession={nextFor(enr.subject)}
                unread={anns.filter(a => a.unread).length}
                hwDue={K.homeworkForSubject(enr.subject).due.length}
                attendance={K.metrics.attendanceForSubject(enr.subject)}
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
  const color = enr.subjectColor;
  const anns = classAnnouncementsForStudent(comms, enr.classId);
  const hw = K.homeworkForSubject(enr.subject);
  const attendance = K.metrics.attendanceForSubject(enr.subject);
  const upcoming = K.sessions.upcoming.filter(s => s.subject === enr.subject);
  const history  = K.sessions.history.filter(s => s.subject === enr.subject);
  const nextSession = upcoming[0];
  const resources = classResourcesForStudent(enr.subject);
  const totalHw = hw.due.length + hw.submitted.length + hw.marked.length;
  const completion = totalHw ? Math.round(((hw.submitted.length + hw.marked.length) / totalHw) * 100) : 0;
  // The student can only reach their teacher through the monitored comms surface
  // (never a private channel). Opening Communications is that institutional record.
  const messageTeacher = () => onNav('comms');

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
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:52, textAlign:'center', flexShrink:0, background:color+'14', borderRadius:10, padding:'8px 0' }}>
                  <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{(nextSession.date.match(/(\d+)/) || [])[1]}</div>
                  <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:'1px', marginTop:2 }}>{(nextSession.date.match(/\d+\s+(\w+)/) || [])[1] ? (nextSession.date.match(/\d+\s+(\w+)/)[1]).toUpperCase() : ''}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:DS.text }}>{nextSession.date} · {nextSession.time}</div>
                  <div style={{ fontSize:12.5, color:DS.muted, marginTop:2 }}>{enr.room} · {enr.teacher}</div>
                </div>
              </div>
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
        <Card>{stat('My attendance', attendance + '%', 'This class, this term', attendance >= 90 ? DS.success : DS.warning)}</Card>
        <Card>{stat('Homework completion', completion + '%', `${hw.due.length} due now`, hw.due.length ? DS.warning : DS.success)}</Card>
        <Card>
          <div style={{ padding:'16px 18px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Predicted grade</div>
            <K.GradeChip value={enr.predictedGrade} qualification={enr.qualification} color={color} />
            <div style={{ fontSize:12, color:DS.muted, marginTop:8 }}>Set by {enr.teacher}</div>
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
      <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="clip" title="No homework" message="Nothing set for this class right now." /></div></Card>
    ) : (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
          <Btn variant="secondary" icon="clip" small onClick={() => onNav('homework')}>Open homework</Btn>
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
        <Card style={{ flex:1, minWidth:150 }}>{stat('My attendance', attendance + '%', null, attendance >= 90 ? DS.success : DS.warning)}</Card>
        <Card style={{ flex:1, minWidth:150 }}>{stat('Upcoming', upcoming.length)}</Card>
        <Card style={{ flex:1, minWidth:150 }}>{stat('Attended', history.filter(s => s.status === 'attended').length, `of ${history.length} recent`)}</Card>
      </div>
      {upcoming.length > 0 && (
        <Card title="Upcoming" style={{ marginBottom:16 }}>
          <div>
            {upcoming.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
                <Icon name="calendar" size={14} color={color} />
                <div style={{ flex:1, minWidth:0, fontSize:13, color:DS.text }}>{s.date} · {s.time}</div>
                <div style={{ fontSize:12, color:DS.muted }}>{s.room}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card title="History">
        {history.length === 0 ? <div style={{ padding:'24px', fontSize:13, color:DS.muted, textAlign:'center' }}>No past sessions yet.</div> :
          history.map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
              <div style={{ flex:1, minWidth:0, fontSize:13, color:DS.text }}>{s.date} · {s.time}</div>
              <Badge variant={s.status === 'attended' ? 'success' : 'danger'}>{s.status === 'attended' ? 'Attended' : 'Missed'}</Badge>
            </div>
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

  if (!Shell) return <div style={{ padding:32 }}><EmptyState icon="book" title="Class unavailable" message="Please reload." /></div>;
  return (
    <Shell
      onBack={onBack} backLabel="My Classes"
      color={color} bannerTheme="default"
      chips={[enr.subject, enr.qualification, enr.teacher].filter(Boolean)}
      title={enr.name} subtitle={`${enr.group} · ${enr.day} ${enr.time} · ${enr.room}`}
      tabs={TABS} activeTab={tab} onTab={setTab}
    >
      {body[tab]}
    </Shell>
  );
};

const StudentClassesPage = ({ section, onNav, comms }) => {
  const K = window.klasioStudent;
  const enrolments = K.getEnrolments();
  const enr = section === 'detail' ? enrolments.find(e => e.classId === window.__studentClassId) : null;
  if (section === 'detail') {
    if (!enr) return (
      <div style={{ padding:'32px' }}>
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
  if (page === 'sessions') return <StudentSessionsPage />;
  if (page === 'classes')  return <StudentClassesPage section={section} onNav={onNav} comms={comms} />;
  if (page === 'reports') return <StudentReports />;
  return <StudentOverview onNav={onNav} comms={comms} />;
};

Object.assign(window, { StudentDashboard });
