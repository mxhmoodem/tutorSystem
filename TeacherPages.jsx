// ══════════════════════════════════════════════════════════════
//  Klasio — Extra Teacher Pages
// ══════════════════════════════════════════════════════════════

// Mock data (teacherClasses, teacherAllClasses, DEFAULT_TRACKERS) lives in
// mocks/teacherPages.mock.jsx, loaded before this file in index.html. Homework
// figures come from the homework store via window.klasioHomework — never a seed
// list. The Reports page is provided by Reports.jsx (window.TeacherReports).

// ─── Classes Page ───────────────────────────────────────────────────────────────
// The class list is a launch pad into each class, not a register. A row click opens
// the class workspace. Decision #57: the shared Table is the default (a teacher can
// have 6–20+ classes); a remembered grid/list toggle switches to cards that answer
// "what do I owe this class" — work to mark, a register still due, the next
// session — not a pupil's score. Every figure is derived: to-mark from the homework
// selector, register-due from the register lifecycle (deriveSessionState),
// attendance from submitted registers, attainment from results (decision #50).
const openTeacherClass = (cls) => {
  window.__adminParam = cls.id;
  if (window.__navigate) window.__navigate('teacher', 'class_detail');
};

const TC_VIEW_KEY = 'klasio.teacherClasses.view';
const tcReadView = () => { try { return localStorage.getItem(TC_VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; } };

const TcViewToggle = ({ value, onChange }) => (
  <div style={{ display:'flex', gap:4, padding:4, background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:8 }}>
    {[{ id:'list', icon:'list', title:'List view' }, { id:'grid', icon:'grid', title:'Card view' }].map(o => {
      const on = value === o.id;
      return (
        <button key={o.id} onClick={() => onChange(o.id)} title={o.title} aria-label={o.title} aria-pressed={on} style={{
          width:32, height:28, borderRadius:6, cursor:'pointer', background: on ? DS.bg : 'transparent',
          border:`1px solid ${on ? DS.border : 'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center',
        }}><Icon name={o.icon} size={15} color={on ? DS.accent : DS.muted} /></button>
      );
    })}
  </div>
);

// Next-session label on the register clock: "Today 13:00" / "Tomorrow 09:00" / "Thu 16 Jul 09:00".
const tcNextLabel = (s, now) => {
  if (!s) return '—';
  const a = new Date(s.starts_at); const b = new Date(now);
  const day = new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const hhmm = startTimeOf(s.cls.time);
  if (day === 0) return `Today ${hhmm}`;
  if (day === 86400000) return `Tomorrow ${hhmm}`;
  return `${a.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${hhmm}`;
};

// "What you owe" card (grid view).
const TeacherClassCard = ({ c }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={() => openTeacherClass(c)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      textAlign:'left', cursor:'pointer', background:DS.bg, borderRadius:14, padding:0, overflow:'hidden',
      border:`1px solid ${hov ? DS.borderDark : DS.cardBorder}`, boxShadow: hov ? '0 6px 20px -12px rgba(17,24,39,0.25)' : 'none',
      transition:'border-color .15s, box-shadow .15s', display:'flex', flexDirection:'column',
    }}>
      <div style={{ height:4, background:c.color }} />
      <div style={{ padding:'16px 18px 14px', flex:1 }}>
        <div style={{ display:'inline-flex', fontSize:10.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:c.color, background:c.color + '14', padding:'3px 8px', borderRadius:999 }}>{c.name}</div>
        <div style={{ fontSize:17, fontWeight:700, color:DS.text, marginTop:10, letterSpacing:'-0.2px' }}>{c.group}</div>
        <div style={{ fontSize:12.5, color:DS.muted, marginTop:3 }}>{c.nextLabel} · {c.room || 'No room'}</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
        <div style={{ padding:'12px 18px', borderRight:`1px solid ${DS.border}` }}>
          <div style={{ fontSize:24, fontWeight:800, color: c.toMark ? DS.warning : DS.text, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{c.toMark}</div>
          <div style={{ fontSize:11.5, color:DS.muted, marginTop:4 }}>to mark</div>
        </div>
        <div style={{ padding:'12px 18px' }}>
          <div style={{ fontSize:24, fontWeight:800, color:DS.text, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{c.students}</div>
          <div style={{ fontSize:11.5, color: c.registerDue ? DS.warning : DS.muted, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
            students{c.registerDue ? <> · register due <span style={{ width:6, height:6, borderRadius:'50%', background:DS.warning }} /></> : null}
          </div>
        </div>
      </div>
    </button>
  );
};

const TeacherClassesPage = () => {
  // The class list comes from the ONE metrics layer (F2) so the count reconciles
  // with the Dashboard and Analytics.
  const TM = window.teacherMetrics;
  const metrics = TM ? TM.getMetrics() : null;
  const admin = useAdminStore();
  const me = TM ? TM.getPrincipal() : { id: 't1' };
  const [view, setViewState] = React.useState(tcReadView);
  const setView = (v) => { setViewState(v); try { localStorage.setItem(TC_VIEW_KEY, v); } catch (e) {} };

  const list = React.useMemo(() => {
    if (!TM) return [];
    const classes = TM.getMyClasses();
    const now = window.getNow ? window.getNow() : Date.now();
    const reg = window.attReadStore ? window.attReadStore() : null;
    const sessions = reg && window.materialiseSessions ? window.materialiseSessions(classes, window.REGISTER_SETTINGS, now, reg, { backDays: 35, fwdDays: 14 }) : [];
    const rosterOf = (s) => window.attRosterFor ? window.attRosterFor(s.classId, s.group, admin) : [];
    return classes.map(c => {
      const mine = sessions.filter(s => s.classId === c.id);
      const next = mine.filter(s => s.starts_at > now && s.derived.state !== 'cancelled').sort((a, b) => a.starts_at - b.starts_at)[0] || null;
      // A register is "due" once the session has started and nobody has submitted it
      // while it can still be taken (open or in the late backfill window).
      const registerDue = mine.filter(s => (s.derived.state === 'open_live' && now >= s.starts_at) || s.derived.state === 'awaiting').length;
      const rate = window.attendanceRate && reg ? window.attendanceRate(mine, rosterOf, reg) : { pct: null };
      const toMark = window.klasioHomework ? window.klasioHomework.getHomeworkCounts({ teacherId: me.id, classLabel: c.group }).toMark : 0;
      return {
        id: c.id, name: c.name, group: c.group, room: c.room, students: c.students || 0,
        color: subjectColor(c.name), nextLabel: tcNextLabel(next, now), nextAt: next ? next.starts_at : Infinity,
        avgScore: window.klasioScores ? window.klasioScores.classAttainment(c.id).avg : null,
        attendance: rate.pct, toMark, registerDue,
      };
    }).sort((a, b) => a.nextAt - b.nextAt);
  }, [TM, admin.students]);
  const totalEnrolments = metrics ? metrics.enrolments : list.reduce((s, c) => s + c.students, 0);

  const [reqMsg, setReqMsg] = React.useState('');
  const [reqOpen, setReqOpen] = React.useState(false);
  // (D6) Teachers can't self-schedule — the admin owns the timetable. "Request a
  // class" opens a real request (ClassRequests.jsx) that lands in the admin's
  // Classes queue; the teacher follows it in "Your requests" below the list.
  const onSent = () => {
    setReqMsg('Sent to your centre admin — it’s in their Classes queue. Their reply will show under “Your requests”.');
    setTimeout(() => setReqMsg(''), 7000);
  };

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="My Classes"
        subtitle={`${list.length} active class${list.length===1?'':'es'} · ${totalEnrolments} enrolments`}
        actions={[
          <TcViewToggle key="v" value={view} onChange={setView} />,
          <Btn key="a" variant="secondary" icon="send" small onClick={() => setReqOpen(true)}>Request a class</Btn>,
        ]}
      />
      <RequestClassModal open={reqOpen} onClose={() => setReqOpen(false)} onSent={onSent} />

      {reqMsg && (
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 16px', marginBottom:16, background:DS.accentLight, border:`1px solid ${DS.cardBorder}`, borderRadius:10, fontSize:13, color:DS.text }}>
          <Icon name="check" size={15} color={DS.accent} /> {reqMsg}
        </div>
      )}

      {list.length === 0 ? (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="book" title="No classes yet" message="Your centre admin assigns classes. Use “Request a class” to ask for one." /></div></Card>
      ) : view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {list.map(c => <TeacherClassCard key={c.id} c={c} />)}
        </div>
      ) : (
        <Card>
          <Table
            cols={['Class', 'Next session', { label:'Students', align:'right' }, { label:'Attainment', align:'right' }, { label:'Attendance', align:'right' }, 'To mark', 'Register', { label:'', action:true }]}
            rows={list.map(cls => ({
              onClick: () => openTeacherClass(cls),
              cells: [
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:4, alignSelf:'stretch', minHeight:34, borderRadius:2, background:cls.color, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{cls.name}</div>
                    <div style={{ fontSize:12, color:DS.muted, marginTop:1 }}>{cls.group}</div>
                  </div>
                </div>,
                <div>
                  <div style={{ fontSize:13, color:DS.sub, whiteSpace:'nowrap' }}>{cls.nextLabel}</div>
                  <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>{cls.room || 'No room'}</div>
                </div>,
                <span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{cls.students}</span>,
                <ScorePill score={cls.avgScore} />,
                <span style={{ fontSize:13, fontWeight:600, color: cls.attendance == null ? DS.faint : cls.attendance >= 90 ? DS.success : DS.warning }}>{cls.attendance == null ? '—' : `${cls.attendance}%`}</span>,
                cls.toMark > 0 ? <StatusPill tone="warning">{cls.toMark} to mark</StatusPill> : <span style={{ fontSize:12, color:DS.faint }}>—</span>,
                cls.registerDue > 0 ? <StatusPill tone="warning">{cls.registerDue} due</StatusPill> : <span style={{ fontSize:12, color:DS.faint }}>Up to date</span>,
                <Btn variant="secondary" icon="eye" small onClick={(e) => { if (e && e.stopPropagation) e.stopPropagation(); openTeacherClass(cls); }}>View class</Btn>,
              ],
            }))}
          />
        </Card>
      )}

      <div style={{ marginTop: 20 }}><MyClassRequests /></div>
    </div>
  );
};

// ─── Class Detail (teacher) — Google-Classroom-style tabbed workspace ────────────
// Opened from the My Classes list. A single class presented as a full workspace:
// a customisable hero banner, then a tab bar (Stream · Students · Homework · Lesson
// planner · Attendance · Progress · Analytics · Settings). Enrolment and the
// timetable stay owned by the admin (see schedule-timetable architecture) — the
// register is still taken from the Attendance page (via "Take register"), and the
// Settings tab surfaces a "Request a change" to the admin rather than direct edits.
// The banner's background is the class's cover (classCovers.jsx) — one class-wide
// choice on the class record that the class teacher or an admin sets. The stream
// persists per class in localStorage (frontend-only).

// Per-class localStorage (announcement stream). Prototype only.
const classLS = {
  getStream: (id) => { try { return JSON.parse(localStorage.getItem(`klasio.classStream.${id}`) || 'null'); } catch (e) { return null; } },
  setStream: (id, arr) => { try { localStorage.setItem(`klasio.classStream.${id}`, JSON.stringify(arr)); } catch (e) {} },
};

// Deterministic, Google-Classroom-style short join code for a class.
const classJoinCode = (id, group) => {
  const s = `${id}|${group}`;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).replace(/[^a-z0-9]/g, '').padEnd(7, '0').slice(0, 7);
};

// Compact "9 Jul, 21:16" timestamp for stream posts (accepts a ms epoch).
const fmtStreamTime = (ts) => {
  const d = new Date(ts);
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${mo[d.getMonth()]}, ${hh}:${mm}`;
};

// Deterministic recent-attendance log scaled by the class attendance rate.
const classRecentSessions = (seed, n, attPct) => {
  const dates = ['22 Apr','18 Apr','15 Apr','11 Apr','8 Apr','4 Apr'];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const missRate = Math.max(0, (100 - (attPct || 90)) / 100);
  return dates.map((d, i) => {
    const absent = Math.round(((h >> (i * 3)) % 3) * missRate * 1.4);
    const late = ((h >> (i * 3 + 2)) % 2);
    const present = Math.max(0, n - absent - late);
    return { date:d, present, absent, late };
  });
};

const CLASS_TABS = [
  { id:'stream',     label:'Stream',         icon:'megaphone' },
  { id:'students',   label:'Students',       icon:'users' },
  { id:'homework',   label:'Homework',       icon:'clip' },
  { id:'planner',    label:'Lesson planner', icon:'book' },
  { id:'attendance', label:'Attendance',     icon:'check' },
  // One Progress tab — analytics is a lens on the class, not a second tab that
  // answers the same "how is this group doing" question (decision #49).
  { id:'progress',   label:'Progress',       icon:'trending_up' },
  { id:'settings',   label:'Settings',       icon:'settings' },
];

const ClassTabBar = ({ active, onChange, color, tabs = CLASS_TABS }) => (
  <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${DS.border}`, overflowX:'auto', marginBottom:24 }}>
    {tabs.map(t => {
      const on = active === t.id;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display:'inline-flex', alignItems:'center', gap:7, padding:'11px 14px',
          border:'none', background:'transparent', cursor:'pointer', whiteSpace:'nowrap',
          borderBottom:`2px solid ${on ? color : 'transparent'}`, marginBottom:-1,
          color: on ? DS.text : DS.muted, fontSize:13.5, fontWeight: on ? 600 : 500,
          transition:'color 0.12s',
        }}>
          <Icon name={t.icon} size={15} color={on ? color : DS.faint} />
          {t.label}
        </button>
      );
    })}
  </div>
);

// Small KPI tile used across the Homework / Attendance / Analytics tabs.
const ClassStat = ({ label, value, sub, color, icon }) => (
  <div style={{ flex:1, minWidth:0, padding:'16px 18px' }}>
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
      {icon && <Icon name={icon} size={13} color={DS.faint} />}
      <span style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize:24, fontWeight:800, color:color || DS.text, letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color:DS.muted, marginTop:5 }}>{sub}</div>}
  </div>
);

const ClassToggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} style={{
    width:38, height:22, borderRadius:11, border:'none', cursor:'pointer', padding:0, flexShrink:0,
    background: on ? DS.accent : DS.borderDark, position:'relative', transition:'background 0.15s',
  }}>
    <span style={{ position:'absolute', top:2, left: on ? 18 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.15s', boxShadow:'0 1px 2px rgba(0,0,0,0.2)' }} />
  </button>
);

// ── Shared class-detail shell (D1) ───────────────────────────────────────────────
// The ONE presentational chrome for a class workspace: back link, cover banner
// (dimension chips · name · meta line), an optional top-right slot and an optional
// cover/notice strip, then the underline tab bar. Teacher and admin class pages both
// render through this — they differ only in the tab SET, the banner slot and the tab
// CONTENT they pass as children, never in layout or styling. Reused by AdminPages.jsx
// (loaded before this file, resolves it via window at render time) and StudentDashboard.
const ClassDetailShell = ({
  onBack, backLabel = 'Back', color = DS.accent, cover = null,
  chips = [], title, subtitle, bannerRight = null, preBanner = null,
  tabs, activeTab, onTab, children,
}) => {
  // `cover` is the class's resolved background (klasioCovers.classCover — callers
  // resolve it from the class record; this shell never reads stored fields).
  const bg = cover || window.klasioCovers.resolveCover(null, { subjectName: title || '', seed: title || '' });
  // Every class workspace (teacher, admin, student) renders through this shell, so
  // it's also the one place that declares the class → tab nesting to the header
  // breadcrumb: "… › My Classes › Year 10 Maths › Roster".
  const activeLabel = ((tabs || []).find(t => t.id === activeTab) || {}).label;
  // The class crumb returns to the workspace's own landing tab (the list above it
  // is already covered by the nav crumb, e.g. "My Classes").
  const first = (tabs || [])[0];
  usePageTrail([
    { label: title, onClick: first ? () => onTab && onTab(first.id) : null },
    { label: activeLabel },
  ]);
  return (
    <div style={pageFrame()}>
      {onBack && <BackLink onClick={onBack} label={backLabel} />}

      {preBanner}

      {/* Banner — outer wrapper is NOT clipped so a top-right popover can overflow;
          the inner card clips the cover art to the rounded corners. */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden', isolation:'isolate', minHeight:186,
          display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'26px 30px', boxShadow:DS.cardShadow,
          ...coverStyleVars(bg, 'banner') }}>
          <CoverArt cover={bg} variant="banner" />
          {/* Text stays on the left 60%; the artwork is pinned to the right edge. */}
          <div style={{ position:'relative', zIndex:2, maxWidth:'60%' }}>
            <div style={{ display:'flex', gap:7, marginBottom:10, flexWrap:'wrap' }}>
              {chips.filter(Boolean).map((t, i) => (
                <span key={i} style={{ fontSize:11.5, fontWeight:600, color:'var(--cover-chip-ink)', background:'var(--cover-chip-bg)', padding:'3px 10px', borderRadius:999 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize:30, fontWeight:800, color:'var(--cover-ink)', letterSpacing:'-0.6px', lineHeight:1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize:14, color:'var(--cover-ink-muted)', marginTop:6 }}>{subtitle}</div>}
          </div>
        </div>
        {bannerRight && (
          <div style={{ position:'absolute', top:18, right:18, zIndex:5 }}>{bannerRight}</div>
        )}
      </div>

      <ClassTabBar active={activeTab} onChange={onTab} color={color} tabs={tabs} />
      {children}
    </div>
  );
};

// Share the class banner + tab chrome with the admin class detail (AdminPages.jsx,
// loaded before this file — it resolves these via window at render time, same as
// the AdminAttendancePage pattern).
Object.assign(window, { ClassTabBar, classLS, ClassDetailShell, classJoinCode });

// ── Stream tab — announcement feed + class code / upcoming / about rail ──────────
// The Stream is the class's conversational feed (class_posts: posts + comments).
// Announcements are a different thing — a formal broadcast with read/ack tracking
// from the one Communications composer — but a class-scoped announcement belongs
// in the class's feed too, so it renders here as its own card type. Two stores,
// one rendering; the admin's class page shows the same merged feed.
const ClassStreamTab = ({ cls, color, subject, level, stream, announcements = [], onPost, onDelete, classHw, principalName, code }) => {
  const [copied, setCopied] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const copyCode = () => { try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  const post = () => { const t = draft.trim(); if (!t) return; onPost(t); setDraft(''); setComposing(false); };
  const openHw = classHw.filter(h => h.status !== 'complete');

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
      {/* Left rail */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Card>
          <div style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:DS.text }}>Class code</span>
              <button onClick={copyCode} title="Copy code" style={{ background:'none', border:'none', cursor:'pointer', color:copied ? DS.success : DS.faint, display:'flex' }}>
                <Icon name={copied ? 'check' : 'copy'} size={15} />
              </button>
            </div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:22, fontWeight:600, color, letterSpacing:'1px' }}>{code}</div>
            <div style={{ fontSize:11.5, color:DS.muted, marginTop:8, lineHeight:1.45 }}>Students join with this code from their dashboard.</div>
          </div>
        </Card>

        <Card title="Upcoming">
          <div style={{ padding:'4px 18px 14px' }}>
            {openHw.length ? openHw.slice(0, 3).map(h => (
              <div key={h.id} style={{ padding:'9px 0', borderBottom:`1px solid ${DS.border}` }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:DS.text }}>{h.title}</div>
                <div style={{ fontSize:11.5, color:DS.muted, marginTop:1 }}>Due {h.due}</div>
              </div>
            )) : (
              <div style={{ fontSize:12.5, color:DS.muted, padding:'8px 0' }}>No work due in soon 🎉</div>
            )}
          </div>
        </Card>

        <Card title="About">
          <div style={{ padding:'10px 18px 14px' }}>
            {[
              ['Subject', subject],
              level && ['Level', level],
              ['Room', cls.room],
              ['Schedule', `${cls.day} · ${cls.time}`],
              ['Teacher', 'You'],
            ].filter(Boolean).map(([l, v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'7px 0', fontSize:12.5 }}>
                <span style={{ color:DS.muted }}>{l}</span>
                <span style={{ color:DS.text, fontWeight:500, textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Feed */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card>
          {!composing ? (
            <button onClick={() => setComposing(true)} style={{
              display:'flex', alignItems:'center', gap:12, width:'100%', padding:'16px 18px',
              background:'none', border:'none', cursor:'pointer', textAlign:'left',
            }}>
              <Avatar name={principalName} size={36} color={color} />
              <span style={{ fontSize:13.5, color:DS.muted }}>Share something with your class…</span>
            </button>
          ) : (
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', gap:12 }}>
                <Avatar name={principalName} size={36} color={color} />
                <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="Share an update, reminder or resource…"
                  style={{ flex:1, minHeight:88, resize:'vertical', padding:'10px 12px', borderRadius:8, border:`1px solid ${DS.border}`, fontSize:13.5, outline:'none', lineHeight:1.5, boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
                <Btn variant="ghost" small onClick={() => { setComposing(false); setDraft(''); }}>Cancel</Btn>
                <Btn variant="primary" small icon="send" onClick={post} disabled={!draft.trim()}>Post</Btn>
              </div>
            </div>
          )}
        </Card>

        {announcements.map(a => (
          <Card key={'ann-' + a.id}>
            <div style={{ padding:'16px 18px', borderLeft:`3px solid ${DS.accent}`, borderRadius:'inherit' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, background:DS.accentLight, color:DS.accent, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="megaphone" size={17} /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{a.title}</span>
                    <Badge variant="accent">Announcement</Badge>
                    {a.pinned && <Badge variant="default">Pinned</Badge>}
                    {a.requiresAck && <Badge variant="warning">Ack required</Badge>}
                  </div>
                  <div style={{ fontSize:11.5, color:DS.faint }}>{a.authorName} · {fmtStreamTime(new Date(a.createdAt).getTime())}</div>
                </div>
              </div>
              <div style={{ fontSize:13.5, color:DS.sub, marginTop:12, lineHeight:1.55, whiteSpace:'pre-wrap' }}>{a.body}</div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:14, paddingTop:12, borderTop:`1px solid ${DS.border}`, fontSize:12, color:DS.muted }}>
                <Icon name="eye" size={13} />Read by {a.readCount} of {a.recipientCount}
              </div>
            </div>
          </Card>
        ))}
        {stream.length ? stream.map(p => (
          <Card key={p.id}>
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <Avatar name={p.author} size={38} color={color} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{p.author}</div>
                  <div style={{ fontSize:11.5, color:DS.faint }}>{fmtStreamTime(p.at)}</div>
                </div>
                {p.id !== 'seed' && (
                  <button onClick={() => onDelete(p.id)} title="Delete" style={{ background:'none', border:'none', cursor:'pointer', color:DS.faint, display:'flex' }}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize:13.5, color:DS.sub, marginTop:12, lineHeight:1.55, whiteSpace:'pre-wrap' }}>{p.text}</div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:14, paddingTop:12, borderTop:`1px solid ${DS.border}`, color:DS.faint }}>
                <Icon name="message" size={14} /><span style={{ fontSize:12.5 }}>Add class comment</span>
              </div>
            </div>
          </Card>
        )) : (
          !announcements.length && <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="megaphone" title="Nothing posted yet" message="Share your first update with the class." /></div></Card>
        )}
      </div>
    </div>
  );
};

// ── Students tab ────────────────────────────────────────────────────────────────
const ClassStudentsTab = ({ cls, color, goProfile, students = [] }) => {
  const [q, setQ] = React.useState('');
  // The sparkline is the pupil's real results in this class (decision #50).
  const sparkFor = (name) => {
    const s = students.find(st => studentName(st) === name);
    return s && window.klasioScores ? window.klasioScores.attainmentSeries(s.id, { classId: cls.id }).map(e => e.pct) : [];
  };
  const list = cls.studentList.filter(n => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:320 }}>
          <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', display:'flex' }}><Icon name="search" size={15} color={DS.faint} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students…"
            style={{ width:'100%', padding:'8px 12px 8px 34px', borderRadius:8, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ flex:1 }} />
        <Btn variant="secondary" icon="message" small onClick={() => window.__navigate && window.__navigate('teacher', 'comms:messages')}>Message class</Btn>
        <Btn variant="secondary" icon="users" small onClick={() => window.__navigate && window.__navigate('teacher', 'students')}>All students</Btn>
      </div>
      <Card title={`${cls.studentList.length} student${cls.studentList.length === 1 ? '' : 's'}`}>
        <div>
          {list.map((name) => (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderTop:`1px solid ${DS.border}` }}>
              <Avatar name={name} size={34} color={color} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{name}</div>
                <div style={{ fontSize:11.5, color:DS.faint }}>{cls.group}</div>
              </div>
              {sparkFor(name).length >= 2
                ? <Sparkline data={sparkFor(name)} color={color} width={72} height={26} />
                : <span style={{ fontSize:11.5, color:DS.faint, width:72, textAlign:'center' }}>no results</span>}
              <Btn variant="ghost" icon="eye" small onClick={() => goProfile(name)}>Profile</Btn>
            </div>
          ))}
          {!list.length && <div style={{ padding:'28px', textAlign:'center', fontSize:13, color:DS.muted }}>No students match “{q}”.</div>}
        </div>
      </Card>
    </div>
  );
};

// ── Homework tab ────────────────────────────────────────────────────────────────
const ClassHomeworkTab = ({ cls, color, classHw }) => {
  const hwStatusVariant = { open:'default', marking:'warning', complete:'success' };
  // Every figure here comes from the one homework selector.
  const counts = window.klasioHomework
    ? window.klasioHomework.getHomeworkCounts({ classLabel: cls.group })
    : { active:0, toMark:0, submissionRate:0, total:0 };
  const active = counts.active;
  const toMark = counts.toMark;
  const rate = counts.submissionRate;
  const goHw = () => window.__navigate && window.__navigate('teacher', 'homework');
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <Btn variant="primary" icon="plus" small onClick={goHw}>Set homework</Btn>
      </div>
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Assignments" value={classHw.length} icon="notebook_pen" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Active" value={active} color={active ? DS.success : DS.text} icon="folder_open" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="To mark" value={toMark} color={toMark ? DS.warning : DS.text} icon="edit" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Submission rate" value={rate + '%'} color={color} icon="check" /></Card>
      </div>
      {classHw.length ? (
        <Card title="Assignments">
          <div>
            {classHw.map(h => (
              <div key={h.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px', borderTop:`1px solid ${DS.border}` }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{h.title}</div>
                  <div style={{ fontSize:11.5, color:DS.muted, marginTop:2 }}>Set {h.set} · Due {h.due} · {h.submitted}/{h.total} submitted</div>
                </div>
                {h.avgScore != null && <ScorePill score={h.avgScore} />}
                <Badge variant={hwStatusVariant[h.status] || 'default'}>{h.status === 'marking' ? 'To mark' : h.status === 'complete' ? 'Complete' : 'Open'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="notebook_pen" title="No homework set" message="Set the first assignment for this class." action={<Btn variant="primary" icon="plus" onClick={goHw}>Set homework</Btn>} /></div></Card>
      )}
    </div>
  );
};

// ── Lesson planner tab ──────────────────────────────────────────────────────────
// This class's planned lessons (deliveries keyed by class id — decision #47). The
// lesson content is shared; notes and reflections are this class's own.
const ClassPlannerTab = ({ cls, color }) => {
  const L = window.useLessons ? window.useLessons() : window.klasioLessons;
  const plans = L ? L.deliveriesForClass(cls.id) : [];
  const todayISO = window.attIso && window.getNow ? window.attIso(new Date(window.getNow())) : new Date().toISOString().slice(0, 10);
  const openPlan = (date, mode) => window.__openLessonPlanner && window.__openLessonPlanner(cls.id, date, mode);
  const fmtDate = (iso) => { const [y, m, d] = (iso || '').split('-').map(Number); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return d ? { day:d, mon:mo[m - 1], year:y } : { day:iso, mon:'', year:'' }; };
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <Btn variant="primary" icon="plus" small onClick={() => openPlan(todayISO, 'edit')}>Plan a lesson</Btn>
      </div>
      {plans.length ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {plans.map(p => {
            const dt = fmtDate(p.date);
            const l = L.getLesson(p.lessonId) || {};
            const u = L.usageOf(p.lessonId, todayISO);
            return (
              <Card key={p.id}>
                <div style={{ padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ width:52, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:11, color:DS.muted, textTransform:'uppercase', fontWeight:600 }}>{dt.mon}</div>
                    <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{dt.day}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{l.title || 'Untitled lesson'}</div>
                    <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>{[l.topic, l.duration ? `${l.duration} min` : null, u.deliveries > 1 ? `also used with ${u.deliveries - 1} other deliver${u.deliveries - 1 === 1 ? 'y' : 'ies'}` : null].filter(Boolean).join(' · ')}</div>
                    {p.notes && <div style={{ fontSize:12.5, color:DS.sub, marginTop:8, lineHeight:1.5 }}><strong style={{ fontWeight:600 }}>Notes:</strong> {p.notes}</div>}
                    {p.reflection && <div style={{ fontSize:12.5, color:DS.sub, marginTop:6, lineHeight:1.5, fontStyle:'italic' }}>“{p.reflection}”</div>}
                  </div>
                  <Btn variant="secondary" icon="eye" small onClick={() => openPlan(p.date, 'view')}>Open</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="book" title="No lessons planned yet" message="Plan a lesson for this class — write a new one or reuse one from your library." action={<Btn variant="primary" icon="plus" onClick={() => openPlan(todayISO, 'edit')}>Plan a lesson</Btn>} /></div></Card>
      )}
    </div>
  );
};

// ── Attendance tab ──────────────────────────────────────────────────────────────
const ClassAttendanceTab = ({ cls, color }) => {
  const attColor = cls.attendance >= 90 ? DS.success : cls.attendance >= 80 ? DS.warning : DS.danger;
  const sessions = classRecentSessions(cls.id + cls.group, cls.students, cls.attendance);
  const takeRegister = () => { window.__navigate && window.__navigate('teacher', 'attendance'); };
  return (
    <div>
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Attendance rate" value={cls.attendance + '%'} color={attColor} icon="check" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Enrolled" value={cls.students} icon="users" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Sessions logged" value={sessions.length} icon="calendar" /></Card>
        <Card style={{ flex:1, minWidth:150, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <Btn variant="primary" icon="check" onClick={takeRegister}>Take register</Btn>
        </Card>
      </div>
      <Card title="Recent sessions">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.surface }}>
                {['Date','Present','Late','Absent','Rate'].map((h, i) => (
                  <th key={i} style={{ padding:'9px 18px', textAlign:i === 0 ? 'left' : 'center', fontSize:11, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const rate = Math.round(s.present / (s.present + s.late + s.absent || 1) * 100);
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${DS.border}` }}>
                    <td style={{ padding:'11px 18px', color:DS.text, fontWeight:500, whiteSpace:'nowrap' }}>{s.date}</td>
                    <td style={{ padding:'11px 18px', textAlign:'center', color:DS.success, fontWeight:600 }}>{s.present}</td>
                    <td style={{ padding:'11px 18px', textAlign:'center', color:s.late ? DS.warning : DS.faint, fontWeight:600 }}>{s.late}</td>
                    <td style={{ padding:'11px 18px', textAlign:'center', color:s.absent ? DS.danger : DS.faint, fontWeight:600 }}>{s.absent}</td>
                    <td style={{ padding:'11px 18px', textAlign:'center' }}><span style={{ fontWeight:600, color: rate >= 90 ? DS.success : rate >= 80 ? DS.warning : DS.danger }}>{rate}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Progress (class tab + teacher page) ─────────────────────────────────────────
// Decision #50. Two series, never blended: ATTAINMENT = assessment results (what the
// centre is judged on) and HOMEWORK = the average of marked homework (effort and
// consistency). Everything reads window.klasioScores — there is no stored score, and
// no position-in-list arithmetic. A grade is only an INDICATIVE bucket from
// klasioGrades on the class's own scale. Analytics is not a separate tab: it is this
// lens on the class (decision #49).
const PG_FMT_DATE = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
const pgMean = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
const pgLevelFor = (className, year) => /A-?level/i.test(className || '') ? 'A-Level' : /KS3/i.test(className || '') ? 'KS3' : (window.klasioGrades ? window.klasioGrades.levelForYear(year) : 'GCSE');

// One row per pupil: attainment avg / latest / trend, homework avg, indicative grade.
// Scoped to one class (classId) or to a set of classes (classIds — "all my classes"),
// so a teacher never sees a pupil's results from subjects they don't teach.
const pgRowsFor = (students, classId, level, classIds) => students.map(s => {
  const scope = classId ? { classId } : classIds ? { classIds } : {};
  const S = window.klasioScores ? window.klasioScores.getStudentScoreSeries(s.id, scope) : { attainment: [], homework: [], attainmentAvg: null, homeworkAvg: null, latest: null, trend: null };
  const lvl = level || pgLevelFor('', s.year);
  return {
    id: s.id, name: studentName(s), year: s.year, student: s,
    attainment: S.attainmentAvg, latest: S.latest, trend: S.trend, spark: S.attainment.map(e => e.pct),
    homework: S.homeworkAvg, results: S.attainment.length,
    grade: S.attainmentAvg != null && window.klasioGrades ? window.klasioGrades.pctToGrade(S.attainmentAvg, { level: lvl }) : null,
  };
});

const PgTrendIcon = ({ trend }) => trend == null
  ? <span style={{ fontSize: 12, color: DS.faint }}>—</span>
  : <Icon name={trend === 'down' ? 'trending_dn' : 'trending_up'} size={15} color={trend === 'up' ? DS.success : trend === 'down' ? DS.danger : DS.faint} />;

// Pupil table shared by the class tab and the Progress page.
const ProgressStudentTable = ({ rows, color, onOpen, title = 'Students' }) => {
  const [sort, setSort] = React.useState('attainment');
  const sorted = rows.slice().sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    const av = a[sort], bv = b[sort];
    if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
    return av - bv;   // lowest first — the pupils who need a look lead
  });
  return (
    <Card title={title} actions={[
      <Segmented key="s" value={sort} onChange={setSort} options={[{ id: 'attainment', label: 'Attainment' }, { id: 'homework', label: 'Homework' }, { id: 'name', label: 'Name' }]} />,
    ]}>
      {rows.length === 0 ? (
        <div style={{ padding: '24px 20px', fontSize: 13, color: DS.muted }}>No pupils enrolled.</div>
      ) : (
        <Table
          cols={['Pupil', { label: 'Attainment', align: 'right' }, { label: 'Latest', align: 'right' }, 'Trend', { label: 'Homework', align: 'right' }, { label: 'Indicative', align: 'right' }]}
          rows={sorted.map(r => ({
            onClick: onOpen ? () => onOpen(r) : undefined,
            cells: [
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: DS.faint }}>{r.results ? `${r.results} result${r.results === 1 ? '' : 's'}` : 'No results yet'}</div>
                </div>
              </div>,
              <ScorePill score={r.attainment} />,
              <span style={{ fontSize: 12.5, color: DS.sub, fontVariantNumeric: 'tabular-nums' }}>{r.latest == null ? '—' : `${r.latest}%`}</span>,
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {r.spark.length >= 2 ? <Sparkline data={r.spark} color={r.trend === 'down' ? DS.danger : color || DS.accent} width={64} height={22} /> : null}
                <PgTrendIcon trend={r.trend} />
              </span>,
              <span style={{ fontSize: 12.5, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{r.homework == null ? '—' : `${r.homework}%`}</span>,
              <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{r.grade || '—'}</span>,
            ],
          }))}
        />
      )}
    </Card>
  );
};

// Distribution of pupils' attainment across the class's own grade scale.
const ProgressGradeDistribution = ({ rows, level }) => {
  const G = window.klasioGrades;
  if (!G) return null;
  const dist = G.emptyDistribution({ level });
  const graded = rows.filter(r => r.attainment != null);
  graded.forEach(r => { const g = G.pctToGrade(r.attainment, { level }); if (g in dist) dist[g] += 1; });
  const keys = Object.keys(dist);
  const max = Math.max(1, ...keys.map(k => dist[k]));
  return (
    <Card title="Indicative grade spread" subtitle={`${level} scale · from attainment averages — not official grades`}>
      <div style={{ padding: '14px 18px' }}>
        {graded.length === 0 ? (
          <div style={{ fontSize: 13, color: DS.muted, padding: '8px 0' }}>No results yet.</div>
        ) : keys.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <span style={{ width: 70, fontSize: 12, color: DS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span>
            <div style={{ flex: 1, height: 7, background: DS.surface, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(dist[k] / max) * 100}%`, height: '100%', background: G.toneForGrade ? G.toneForGrade(k, { level }) : DS.accent, borderRadius: 4 }} />
            </div>
            <span style={{ width: 18, textAlign: 'right', fontSize: 12, fontWeight: 600, color: DS.text }}>{dist[k]}</span>
          </div>
        ))}
        {graded.length > 0 && graded.length < rows.length && (
          <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 6 }}>{rows.length - graded.length} pupil{rows.length - graded.length === 1 ? '' : 's'} with no results yet.</div>
        )}
      </div>
    </Card>
  );
};

// ── Assessments for one class — create, enter marks, publish ───────────────────
const ClassAssessmentsPanel = ({ cls, students, color }) => {
  const KS = window.useAssessments ? window.useAssessments() : window.klasioScores;
  const me = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : { id: 't1' };
  const list = KS ? KS.classAssessments(cls.id).slice().reverse() : [];
  const today = window.attIso && window.getNow ? window.attIso(new Date(window.getNow())) : new Date().toISOString().slice(0, 10);
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', assessedOn: today, maxMarks: '50' });
  const [marking, setMarking] = React.useState(null);   // assessment
  const [marks, setMarks] = React.useState({});

  const openCreate = () => { setDraft({ title: '', assessedOn: today, maxMarks: '50' }); setCreating(true); };
  const create = () => {
    if (!draft.title.trim() || !draft.assessedOn || !(Number(draft.maxMarks) > 0)) return;
    const row = KS.createAssessment({ classId: cls.id, subject: cls.name.replace(/^(GCSE|A-?Level)\s+/i, ''), title: draft.title, assessedOn: draft.assessedOn, maxMarks: draft.maxMarks, createdBy: me.id });
    setCreating(false);
    openMarks({ ...row, results: {} });
  };
  const openMarks = (a) => {
    const m = {}; students.forEach(s => { const r = (a.results || {})[s.id]; m[s.id] = r && typeof r.marks === 'number' ? String(r.marks) : ''; });
    setMarks(m); setMarking(a);
  };
  const saveMarks = () => {
    const clean = {};
    Object.entries(marks).forEach(([sid, v]) => { clean[sid] = v === '' ? '' : Math.max(0, Math.min(marking.maxMarks, Number(v))); });
    KS.recordResults(marking.id, clean);
    setMarking(null);
  };

  return (
    <Card title="Assessments" subtitle="Tests and papers with a mark out of a maximum. Pupils see a result only once it’s published."
      actions={[<Btn key="n" variant="primary" icon="plus" small onClick={openCreate}>New assessment</Btn>]}>
      {list.length === 0 ? (
        <div style={{ padding: '28px 20px' }}>
          <EmptyState icon="chart" title="No assessments yet" message="Add a test or paper to record marks — or flag a tracker score column as “counts as an assessment”." />
        </div>
      ) : list.map((a, i) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
          <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, color: DS.muted, textTransform: 'uppercase', fontWeight: 600 }}>{PG_FMT_DATE(a.assessedOn).split(' ')[1]}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: color || DS.accent, lineHeight: 1.1 }}>{PG_FMT_DATE(a.assessedOn).split(' ')[0]}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{a.title}</span>
              {a.source === 'tracker' && <StatusPill tone="info">From tracker</StatusPill>}
              {a.published ? <StatusPill tone="positive">Published</StatusPill> : <StatusPill tone="neutral">Not published</StatusPill>}
            </div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>
              Out of {a.maxMarks} · {a.resultCount}/{students.length} marked{a.classAvgPct != null ? ` · class average ${a.classAvgPct}%` : ''}
              {a.source === 'tracker' && ` · ${a.trackerName}`}
            </div>
          </div>
          {a.source === 'tracker'
            ? <Btn variant="ghost" icon="edit" small onClick={() => window.__navigate && window.__navigate('teacher', 'tracking')}>Edit in tracker</Btn>
            : <Btn variant="secondary" icon="edit" small onClick={() => openMarks(a)}>Enter marks</Btn>}
          <Btn variant={a.published ? 'ghost' : 'primary'} small onClick={() => KS.setPublished(a.id, !a.published)}>{a.published ? 'Unpublish' : 'Publish'}</Btn>
        </div>
      ))}

      <Modal open={creating} onClose={() => setCreating(false)} icon="chart" title="New assessment" subtitle={`${cls.name} · ${cls.group}`}
        footer={<><Btn variant="secondary" onClick={() => setCreating(false)}>Cancel</Btn><Btn variant="primary" icon="check" onClick={create}>Create &amp; enter marks</Btn></>}>
        <Field label="Title" required><Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Mock paper 2 (calculator)" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Field label="Date sat" required><Input type="date" value={draft.assessedOn} onChange={e => setDraft(d => ({ ...d, assessedOn: e.target.value }))} icon="calendar" /></Field>
          <Field label="Out of (marks)" required><Input type="number" min="1" value={draft.maxMarks} onChange={e => setDraft(d => ({ ...d, maxMarks: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={!!marking} onClose={() => setMarking(null)} icon="edit" width={520}
        title={marking ? `Marks · ${marking.title}` : ''} subtitle={marking ? `Out of ${marking.maxMarks}. Leave blank for a pupil who didn’t sit it — a blank is not a zero.` : ''}
        footer={<><Btn variant="secondary" onClick={() => setMarking(null)}>Cancel</Btn><Btn variant="primary" icon="check" onClick={saveMarks}>Save marks</Btn></>}>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {students.map((s, i) => {
            const v = marks[s.id] ?? '';
            const pct = v === '' || !marking ? null : Math.round((Number(v) / marking.maxMarks) * 100);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 2px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
                <span style={{ flex: 1, fontSize: 13, color: DS.text }}>{studentName(s)}</span>
                <Input type="number" min="0" max={marking ? marking.maxMarks : undefined} value={v}
                  onChange={e => setMarks(m => ({ ...m, [s.id]: e.target.value }))} style={{ width: 90 }} />
                <span style={{ width: 44, textAlign: 'right', fontSize: 12, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{pct == null ? '' : `${pct}%`}</span>
              </div>
            );
          })}
          {!students.length && <div style={{ fontSize: 13, color: DS.muted }}>No pupils enrolled in this class.</div>}
        </div>
      </Modal>
    </Card>
  );
};

// ── Predicted & target grades (decision #28) ────────────────────────────────────
// A teacher's professional judgement, stored per pupil per class — never
// "attainment + 4". Pupils, the admin profile and new reports read exactly what is
// set here; a pupil with nothing set sees "Not set yet". The indicative grade (from
// results) is shown beside it only as a guide. "On track" is derived: the latest
// result's indicative grade is at or above the target.
const ClassTargetsPanel = ({ cls, students, rows, level }) => {
  if (window.useAssessments) window.useAssessments();   // re-render on target writes
  const T = window.klasioTargets;
  const G = window.klasioGrades;
  const me = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : { id: 't1' };
  const map = T ? T.forClass(cls.id) : {};
  const grades = G ? G.gradesFor({ level }) : [];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({});
  if (!T) return null;
  const rowOf = (id) => rows.find(r => r.id === id) || {};
  const latestGrade = (id) => { const r = rowOf(id); return r.latest != null && G ? G.pctToGrade(r.latest, { level }) : null; };
  const onTrack = (id) => {
    const t = map[id] && map[id].target, g = latestGrade(id);
    return t && g && grades.includes(t) ? grades.indexOf(g) <= grades.indexOf(t) : null;
  };
  const openEdit = () => {
    const d = {};
    students.forEach(s => { const r = map[s.id] || {}; d[s.id] = { predicted: r.predicted || '', target: r.target || '' }; });
    setDraft(d); setEditing(true);
  };
  const save = () => {
    Object.entries(draft).forEach(([sid, v]) => {
      const r = map[sid] || {};
      if ((r.predicted || '') !== v.predicted || (r.target || '') !== v.target) T.set(sid, cls.id, v, me.id);
    });
    setEditing(false);
  };
  const setCount = students.filter(s => map[s.id] && map[s.id].predicted).length;
  const notSet = <span style={{ fontSize: 12, color: DS.faint }}>Not set</span>;
  const gradeSelect = (sid, field) => (
    <Select value={(draft[sid] || {})[field] || ''} onChange={e => setDraft(d => ({ ...d, [sid]: { ...(d[sid] || {}), [field]: e.target.value } }))} style={{ width: 96 }}>
      <option value="">—</option>
      {grades.map(g => <option key={g} value={g}>{g}</option>)}
    </Select>
  );
  return (
    <Card title="Predicted & target grades"
      subtitle={`Your judgement on the ${level} scale — one per pupil for this subject; pupils and reports see what you set. ${setCount}/${students.length} predicted.`}
      actions={[<Btn key="e" variant="secondary" icon="edit" small onClick={openEdit} disabled={!students.length}>Edit grades</Btn>]}>
      {students.length === 0 ? (
        <div style={{ padding: '24px 20px', fontSize: 13, color: DS.muted }}>No pupils enrolled.</div>
      ) : (
        <Table pagination={students.length > 10}
          cols={['Pupil', { label: 'Indicative', align: 'right' }, { label: 'Predicted', align: 'right' }, { label: 'Target', align: 'right' }, 'Status']}
          rows={students.map(s => {
            const r = map[s.id] || {};
            const ot = onTrack(s.id);
            return [
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{studentName(s)}</span>,
              <span style={{ fontSize: 12.5, color: DS.muted }}>{(rowOf(s.id).grade) || '—'}</span>,
              r.predicted ? <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text }}>{r.predicted}</span> : notSet,
              r.target ? <span style={{ fontSize: 13, color: DS.sub }}>{r.target}</span> : notSet,
              ot == null
                ? <StatusPill tone="neutral">{!r.target ? 'No target' : 'No results'}</StatusPill>
                : <StatusPill tone={ot ? 'positive' : 'warning'}>{ot ? 'On track' : 'Below target'}</StatusPill>,
            ];
          })}
        />
      )}
      <Modal open={editing} onClose={() => setEditing(false)} icon="edit" width={600}
        title="Predicted & target grades" subtitle={`${cls.name} · ${cls.group}. Blank means not set. The indicative grade is from results and is only a guide.`}
        footer={<><Btn variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save}>Save grades</Btn></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 96px 96px', gap: '0 12px', alignItems: 'center', fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 2px 8px' }}>
          <span>Pupil</span><span style={{ textAlign: 'right' }}>Indicative</span><span>Predicted</span><span>Target</span>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {students.map((s, i) => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 96px 96px', gap: '0 12px', alignItems: 'center', padding: '7px 2px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
              <span style={{ fontSize: 13, color: DS.text }}>{studentName(s)}</span>
              <span style={{ fontSize: 12.5, color: DS.muted, textAlign: 'right' }}>{rowOf(s.id).grade || '—'}</span>
              {gradeSelect(s.id, 'predicted')}
              {gradeSelect(s.id, 'target')}
            </div>
          ))}
        </div>
      </Modal>
    </Card>
  );
};

// ── Class Progress tab (was two tabs: Progress + Analytics) ─────────────────────
const ClassProgressTab = ({ cls, color, classHw, students, goProfile }) => {
  if (window.useAssessments) window.useAssessments();   // re-render on marks / publish
  const level = pgLevelFor(cls.name, (students[0] || {}).year);
  const rows = pgRowsFor(students, cls.id, level);
  const att = window.klasioScores ? window.klasioScores.classAttainment(cls.id) : { series: [], avg: null };
  const hwAvg = pgMean(rows.map(r => r.homework).filter(n => n != null));
  const hwLabels = classHw.map(h => h.title.split(':')[0].slice(0, 12));
  const hwRates = classHw.map(h => h.total ? Math.round(h.submitted / h.total * 100) : 0);
  const flagged = rows.filter(r => r.trend === 'down').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <StatBand stats={[
        { label: 'Attainment', value: att.avg == null ? '—' : `${att.avg}%`, sub: `class average · ${att.series.length} assessment${att.series.length === 1 ? '' : 's'}` },
        { label: 'Homework', value: hwAvg == null ? '—' : `${hwAvg}%`, sub: 'average of marked work — effort, kept separate' },
        { label: 'Slipping', value: flagged, sub: flagged ? 'attainment trending down' : 'no downward trends', tone: flagged ? DS.warning : undefined },
        { label: 'Pupils', value: students.length, sub: `${rows.filter(r => r.attainment != null).length} with results` },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <Card title="Attainment trend" subtitle="Class average on each assessment">
          <div style={{ padding: '16px 20px 8px' }}>
            {att.series.length >= 2
              ? <LineChart labels={att.series.map(p => PG_FMT_DATE(p.date))} series={[{ label: 'Class avg', data: att.series.map(p => p.pct), color }]} height={200} area />
              : <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: DS.muted }}>{att.series.length ? 'One assessment so far — a trend needs two.' : 'No results yet. Add an assessment below.'}</div>}
          </div>
        </Card>
        <Card title="Homework submission by task" subtitle="Share of the class that handed each one in">
          <div style={{ padding: '16px 20px 8px' }}>
            {hwLabels.length ? <BarChart labels={hwLabels} data={hwRates} color={color} height={200} /> : <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: DS.muted }}>No homework set yet.</div>}
          </div>
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
        <ProgressStudentTable rows={rows} color={color} onOpen={goProfile ? (r) => goProfile(r.name) : null} />
        <ProgressGradeDistribution rows={rows} level={level} />
      </div>
      <ClassTargetsPanel cls={cls} students={students} rows={rows} level={level} />
      <ClassAssessmentsPanel cls={cls} students={students} color={color} />
    </div>
  );
};

// ─── Progress (top-level teacher destination) ─────────────────────────────────
// "How are my pupils doing across everything I teach" — the question a teacher
// arrives with. Scoped to the teacher's own classes; per-class analysis (and
// assessment management) lives on each class's Progress tab.
const TeacherProgressPage = () => {
  if (window.useAssessments) window.useAssessments();
  const store = useAdminStore();
  const TM = window.teacherMetrics;
  const classes = TM ? TM.getMyClasses() : [];
  const [classId, setClassId] = React.useState('all');
  const cls = classes.find(c => c.id === classId) || null;
  const myIds = classes.map(c => c.id);
  const students = cls
    ? store.students.filter(s => (s.classIds || []).includes(cls.id))
    : store.students.filter(s => (s.classIds || []).some(id => myIds.includes(id)));
  const level = cls ? pgLevelFor(cls.name, (students[0] || {}).year) : null;
  const rows = pgRowsFor(students, cls ? cls.id : null, level, cls ? null : myIds);
  const att = cls && window.klasioScores ? window.klasioScores.classAttainment(cls.id) : null;
  const attAvg = pgMean(rows.map(r => r.attainment).filter(n => n != null));
  const hwAvg = pgMean(rows.map(r => r.homework).filter(n => n != null));
  const slipping = rows.filter(r => r.trend === 'down');
  const low = rows.filter(r => r.attainment != null && r.attainment < 55 && r.trend !== 'down');
  const noResults = rows.filter(r => r.attainment == null).length;
  const openStudent = (r) => { window.__adminParam = r.id; window.__navigate && window.__navigate('teacher', 'student_profile'); };
  const openClassTab = (c) => { window.__classTab = 'progress'; openTeacherClass(c); };
  const color = cls ? subjectColor(cls.name) : DS.accent;

  return (
    <div style={pageFrame()}>
      <PageHeader title="Progress"
        subtitle="Assessment results (attainment) and marked homework (effort), kept as separate measures. Grades shown are indicative, not official."
        actions={cls ? [<Btn key="m" variant="secondary" icon="chart" small onClick={() => openClassTab(cls)}>Manage assessments</Btn>] : []} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'all', group: 'All my classes' }, ...classes].map(c => {
          const on = classId === c.id;
          const col = c.id === 'all' ? DS.accent : subjectColor(c.name);
          return (
            <button key={c.id} onClick={() => setClassId(c.id)} style={{
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12.5, fontWeight: on ? 600 : 500,
              border: `1px solid ${on ? col : DS.border}`, background: on ? col + '18' : DS.bg, color: on ? col : DS.muted,
            }}>{c.group}{c.name ? <span style={{ opacity: 0.7 }}> · {c.name.replace(/^(GCSE|A-?Level)\s+/i, '')}</span> : null}</button>
          );
        })}
      </div>

      <StatBand style={{ marginBottom: 20 }} stats={[
        { label: 'Attainment', value: attAvg == null ? '—' : `${attAvg}%`, sub: cls ? 'this class · assessment results' : 'across your classes · assessment results' },
        { label: 'Homework', value: hwAvg == null ? '—' : `${hwAvg}%`, sub: 'marked work — effort, kept separate' },
        { label: 'Slipping', value: slipping.length, sub: slipping.length ? 'attainment trending down' : 'no downward trends', tone: slipping.length ? DS.warning : undefined },
        { label: 'No results yet', value: noResults, sub: `of ${rows.length} pupil${rows.length === 1 ? '' : 's'}`, tone: noResults ? DS.muted : undefined },
      ]} />

      {cls && att && (
        <Card title={`Attainment trend — ${cls.group}`} subtitle="Class average on each assessment" style={{ marginBottom: 20 }}>
          <div style={{ padding: '16px 20px 8px' }}>
            {att.series.length >= 2
              ? <LineChart labels={att.series.map(p => PG_FMT_DATE(p.date))} series={[{ label: 'Class avg', data: att.series.map(p => p.pct), color }]} height={200} area />
              : <EmptyState icon="chart" title={att.series.length ? 'One assessment so far' : 'No assessment results yet'}
                  message="Add an assessment on the class’s Progress tab, or flag a tracker score column as “counts as an assessment”."
                  action={<Btn variant="primary" icon="plus" small onClick={() => openClassTab(cls)}>Add an assessment</Btn>} />}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
        <ProgressStudentTable rows={rows} color={color} onOpen={openStudent} title={cls ? `Pupils · ${cls.group}` : `Your pupils · ${rows.length}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cls ? <ProgressGradeDistribution rows={rows} level={level} /> : null}
          <Card title="Worth a look" subtitle="Slipping, or averaging under 55%">
            <div>
              {[...slipping, ...low].slice(0, 8).map((r, i) => (
                <HoverRow key={r.id} onClick={() => openStudent(r)} last={i === Math.min(slipping.length + low.length, 8) - 1}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: DS.muted }}>{r.trend === 'down' ? 'Attainment trending down' : 'Low attainment'}{r.homework != null ? ` · homework ${r.homework}%` : ''}</div>
                  </div>
                  <ScorePill score={r.attainment} />
                </HoverRow>
              ))}
              {slipping.length + low.length === 0 && <div style={{ padding: '16px 18px', fontSize: 13, color: DS.muted }}>Nobody is slipping on the results so far.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── Settings tab ────────────────────────────────────────────────────────────────
const ClassSettingsTab = ({ cls, color, subject, level, background, canChangeBackground, onChangeBackground }) => {
  const [notif, setNotif] = React.useState({ submissions:true, attendance:true, messages:false });
  const [posts, setPosts] = React.useState({ studentsPost:false, studentsComment:true });
  const [reqMsg, setReqMsg] = React.useState('');
  const [reqOpen, setReqOpen] = React.useState(false);
  // A real request into the admin's Classes queue (ClassRequests.jsx), scoped to
  // this class; its status and the admin's reply show in the card below.
  const onSent = () => {
    setReqMsg('Sent to your centre admin — their reply will appear below.');
    setTimeout(() => setReqMsg(''), 6000);
  };
  const row = (label, hint, node) => (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 0', borderBottom:`1px solid ${DS.border}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{label}</div>
        {hint && <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>{hint}</div>}
      </div>
      {node}
    </div>
  );
  return (
    <div style={{ maxWidth:720, display:'flex', flexDirection:'column', gap:20 }}>
      {/* One class-wide background: everyone in the class sees the same banner and
          class cards, so it works as a wayfinding cue. */}
      <Card title="Appearance" subtitle="How this class looks to everyone in it">
        <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ position:'relative', width:160, height:64, borderRadius:10, overflow:'hidden', flexShrink:0, boxShadow:DS.cardShadow }}>
            <CoverArt cover={background} variant="banner" />
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>Background</div>
            <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>
              {background.isDerived ? 'Using the subject default.' : 'Chosen for this class.'} Shown on the class banner and on pupils’ class cards.
            </div>
          </div>
          {canChangeBackground
            ? <Btn variant="secondary" icon="image" small onClick={onChangeBackground}>Change background</Btn>
            : <span style={{ fontSize:12.5, color:DS.muted }}>Only the class teacher or a centre admin can change this.</span>}
        </div>
      </Card>

      <Card title="Class information">
        <div style={{ padding:'6px 18px 16px' }}>
          {[
            ['Class name', cls.name],
            ['Subject', subject],
            level && ['Level', level],
            ['Year group', cls.group],
            ['Room', cls.room],
            ['Schedule', `${cls.day} · ${cls.time}`],
            ['Enrolment', `${cls.students} student${cls.students === 1 ? '' : 's'}`],
          ].filter(Boolean).map(([l, v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', gap:16, padding:'10px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
              <span style={{ color:DS.muted }}>{l}</span><span style={{ color:DS.text, fontWeight:500, textAlign:'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14, padding:'11px 14px', background:DS.surface, borderRadius:9 }}>
            <Icon name="lock" size={15} color={DS.muted} />
            <span style={{ flex:1, fontSize:12.5, color:DS.muted }}>Class scheduling and enrolment are managed by your centre admin.</span>
            <Btn variant="secondary" icon="send" small onClick={() => setReqOpen(true)}>Request a change</Btn>
          </div>
          {reqMsg && <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, fontSize:12.5, color:DS.success }}><Icon name="check" size={14} color={DS.success} />{reqMsg}</div>}
        </div>
      </Card>
      <RequestClassModal open={reqOpen} onClose={() => setReqOpen(false)} cls={cls} onSent={onSent} />
      <MyClassRequests classId={cls.id} title="Requests about this class" />

      <Card title="Notifications">
        <div style={{ padding:'2px 18px 8px' }}>
          {row('New homework submissions', 'Notify me when a student submits work', <ClassToggle on={notif.submissions} onChange={v => setNotif(p => ({ ...p, submissions:v }))} />)}
          {row('Low attendance alerts', 'Flag when a student drops below 85%', <ClassToggle on={notif.attendance} onChange={v => setNotif(p => ({ ...p, attendance:v }))} />)}
          {row('Class messages', 'Notify me about new messages in this class', <ClassToggle on={notif.messages} onChange={v => setNotif(p => ({ ...p, messages:v }))} />)}
        </div>
      </Card>

      <Card title="Stream">
        <div style={{ padding:'2px 18px 8px' }}>
          {row('Students can post', 'Allow students to create posts in the stream', <ClassToggle on={posts.studentsPost} onChange={v => setPosts(p => ({ ...p, studentsPost:v }))} />)}
          {row('Students can comment', 'Allow students to comment on announcements', <ClassToggle on={posts.studentsComment} onChange={v => setPosts(p => ({ ...p, studentsComment:v }))} />)}
        </div>
      </Card>
    </div>
  );
};

const TeacherClassDetailPage = () => {
  const store = useAdminStore();
  const id  = window.__adminParam;
  const principalName = window.teacherMetrics ? window.teacherMetrics.getPrincipal().name : 'Heebz A';
  const [activeTab, setActiveTab] = React.useState('stream');
  const [backgroundOpen, setBackgroundOpen] = React.useState(false);
  const [stream, setStream] = React.useState(() => classLS.getStream(id) || []);
  const backToClasses = () => window.__navigate && window.__navigate('teacher', 'classes');

  // Resolve the class from the canonical store — the My Classes list opens this page
  // with a store id ('c1'…'c37', from TM.getMyClasses()), NOT the teacherClasses mock's
  // numeric id. Enrich the display-only fields (colour/score/attendance/hwPending/
  // nextSession) from the mock by matching on group, exactly as the list does (F2), and
  // derive the roster from real store enrolment (students whose classIds include this
  // class), falling back to the mock's display list for groups not in the seed roster.
  const sc = store.classes.find(c => c.id === id);
  const e  = sc ? (teacherClasses.find(t => t.group === sc.group) || {}) : {};
  const cls = sc ? {
    id: sc.id, name: sc.name, group: sc.group, day: sc.day, time: sc.time, room: sc.room,
    students: sc.students,
    color: e.color || subjectColor(sc.name),
    nextSession: e.nextSession || `${sc.day} ${startTimeOf(sc.time)}`,
    // Attainment is this class's assessment results (decision #50), never a mock figure.
    avgScore:   (window.klasioScores && window.klasioScores.classAttainment(sc.id).avg),
    attendance: e.attendance != null ? e.attendance : 0,
    hwPending:  e.hwPending  != null ? e.hwPending  : 0,
    studentList: (() => {
      const fromStore = store.students
        .filter(s => Array.isArray(s.classIds) && s.classIds.includes(sc.id))
        .map(studentName);
      return fromStore.length ? fromStore : (e.studentList || []);
    })(),
  } : null;

  // Re-sync per-class state when the opened class changes (the page stays mounted on
  // class→class navigation, so useState initialisers alone wouldn't refresh). Seeds a
  // welcome announcement the first time a class is opened.
  React.useEffect(() => {
    const existing = classLS.getStream(id);
    if (cls && existing == null) {
      const seed = [{ id:'seed', author:principalName, at:Date.now() - 3600000,
        text:`Welcome to ${cls.name} 👋\nUse the stream to share updates, reminders and resources with the class.` }];
      classLS.setStream(id, seed); setStream(seed);
    } else {
      setStream(existing || []);
    }
    setBackgroundOpen(false);
    // A deep link (e.g. Progress → "Manage assessments") may name the tab to open.
    const tab = window.__classTab; window.__classTab = null;
    setActiveTab(tab && CLASS_TABS.some(t => t.id === tab) ? tab : 'stream');
  }, [id]);

  if (!cls) return (
    <div style={pageFrame()}>
      <EmptyState icon="book" title="Class not found"
        message="This class may have been removed or you no longer teach it."
        action={<Btn variant="primary" onClick={backToClasses}>Back to My Classes</Btn>} />
    </div>
  );

  const color   = cls.color || DS.accent;
  const level   = /A-?level/i.test(cls.name) ? 'A-Level' : /GCSE/i.test(cls.name) ? 'GCSE' : null;
  const subject = cls.name.replace(/^(GCSE|A-?Level)\s+/i, '');
  const code    = classJoinCode(cls.id, cls.group);

  // Homework set for this group — read from the homework store through the shared
  // selector, so this tab, the Homework page and the bell badge cannot disagree.
  const classHw = window.klasioHomework ? window.klasioHomework.listClassHomework(cls.group) : [];
  // Enrolled pupils as records (ids), for anything keyed by student — results, profile.
  const rosterStudents = store.students.filter(s => Array.isArray(s.classIds) && s.classIds.includes(cls.id));

  // Best-effort link to the shared student profile — only if the roster name resolves
  // to a real record in the admin store.
  const goProfile = (name) => {
    const s = store.students.find(st => studentName(st) === name);
    if (s) { window.__adminParam = s.id; window.__navigate && window.__navigate('teacher', 'student_profile'); }
  };

  // The class's background through the one read path (classCovers.jsx). Only the
  // class's own teacher may change it here (an admin can, from the admin class page).
  const background = window.klasioCovers.classCover(sc, store.subjects);
  const canChangeBackground = window.klasioCovers.canChangeBackground({ role: 'teacher', name: principalName }, sc);
  const bannerSubtitle = `${cls.group} · ${cls.day} ${cls.time} · ${cls.room}`;
  const postAnnouncement = (text) => { const next = [{ id:Date.now(), author:principalName, at:Date.now(), text }, ...stream]; setStream(next); classLS.setStream(id, next); };
  const deleteAnnouncement = (pid) => { const next = stream.filter(p => p.id !== pid); setStream(next); classLS.setStream(id, next); };

  return (
    <ClassDetailShell
      onBack={backToClasses} backLabel="My Classes"
      color={color} cover={background}
      chips={[subject, level, `${cls.students} students`]}
      title={cls.name} subtitle={bannerSubtitle}
      bannerRight={canChangeBackground ? <Btn variant="secondary" icon="image" small onClick={() => setBackgroundOpen(true)}>Change background</Btn> : null}
      tabs={CLASS_TABS} activeTab={activeTab} onTab={setActiveTab}
    >
      {activeTab === 'stream'     && <ClassStreamTab cls={cls} color={color} subject={subject} level={level} stream={stream} announcements={window.classAnnouncementsFor ? window.classAnnouncementsFor(window.__getCentre ? window.__getCentre() : 'bm', cls.id) : []} onPost={postAnnouncement} onDelete={deleteAnnouncement} classHw={classHw} principalName={principalName} code={code} />}
      {activeTab === 'students'   && <ClassStudentsTab cls={cls} color={color} goProfile={goProfile} students={rosterStudents} />}
      {activeTab === 'homework'   && <ClassHomeworkTab cls={cls} color={color} classHw={classHw} />}
      {activeTab === 'planner'    && <ClassPlannerTab cls={cls} color={color} />}
      {activeTab === 'attendance' && <ClassAttendanceTab cls={cls} color={color} />}
      {activeTab === 'progress'   && <ClassProgressTab cls={cls} color={color} classHw={classHw} students={rosterStudents} goProfile={goProfile} />}
      {activeTab === 'settings'   && <ClassSettingsTab cls={cls} color={color} subject={subject} level={level} background={background} canChangeBackground={canChangeBackground} onChangeBackground={() => setBackgroundOpen(true)} />}
      {canChangeBackground && (
        <ClassBackgroundDialog open={backgroundOpen} onClose={() => setBackgroundOpen(false)}
          cover={background} classId={sc.id} subjectName={window.klasioCovers.coverSubjectName(sc, store.subjects)}
          title={cls.name} subtitle={bannerSubtitle}
          onSave={sel => store.setClassBackground(sc.id, sel, { role: 'teacher', name: principalName })} />
      )}
    </ClassDetailShell>
  );
};

// ─── Teacher Timetable Page ─────────────────────────────────────────────────────

// The teacher's sessions on a month calendar — the same grid the pupil's Sessions
// page uses — and nothing else. Read-only: the admin owns class creation and
// assignment (store.classes). A session opens the session drawer (when and where,
// the register, the planned lesson, homework, files), which links to the register.
// Sessions are the teacher's own classes plus any they're covering, each kept only
// on the dates they're its effective teacher — the rule Attendance and the dashboard
// hero read — on the shared clock (window.getNow), so the three always agree.
const ttGroupShort = (group) => String(group || '').replace(/^Year\s*/i, 'Y').replace(/\s*[–-]\s*Group\s*/i, ' ');

const TeacherTimetablePage = () => {
  const store = useAdminStore();
  const me = store.teachers.find(t => t.name === 'Heebz A') || store.teachers[0];
  const now = window.getNow ? window.getNow() : Date.now();
  const today = new Date(now);
  const [ym, setYm] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [open, setOpen] = React.useState(null);   // { classId, date } in the session drawer
  const month = monthGridModel(ym.y, ym.m);
  const step = (n) => setYm(p => { const d = new Date(p.y, p.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const myClasses = store.classes.filter(c => me && (c.teacher === me.name || (c.cover && c.cover.teacher === me.name)) && c.status !== 'paused');
  const reg = window.attReadStore ? window.attReadStore() : null;
  const sessions = reg && window.materialiseRange
    ? window.materialiseRange(myClasses, window.REGISTER_SETTINGS, now, reg, `${month.key}-01`, `${month.key}-${String(month.days).padStart(2, '0')}`)
        .filter(s => (typeof effectiveTeacher === 'function' ? effectiveTeacher(s.cls, s.dateISO) : s.cls.teacher) === me.name)
        .sort((a, b) => a.starts_at - b.starts_at)
    : [];

  const byDay = {};
  sessions.forEach(s => {
    const cancelled = s.derived.state === 'cancelled';
    (byDay[Number(s.dateISO.slice(8))] = byDay[Number(s.dateISO.slice(8))] || []).push({
      id: s.id, subject: s.name, time: s.cls.time, status: cancelled ? 'cancelled' : null,
      label: `${startTimeOf(s.cls.time)} ${ttGroupShort(s.group)}`,
      tooltip: `${s.name} · ${s.group} · ${s.cls.time} · ${s.room || 'No room'}${cancelled ? ' · cancelled' : ''}`,
    });
  });
  const subjects = [...new Set(myClasses.map(c => c.name))].sort();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div style={pageFrame()}>
      <PageHeader title="My Timetable" subtitle={`${myClasses.length} weekly session${myClasses.length === 1 ? '' : 's'} · set by your centre admin`} />
      {myClasses.length === 0 ? (
        <Card><EmptyState icon="calendar" title="No classes assigned yet" message="Once your centre admin assigns you to a class, your sessions will appear here." /></Card>
      ) : (
        <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'20px 22px' }}>
          <MonthCalendar
            month={month} today={month.key === todayKey ? today.getDate() : null} sessionsByDay={byDay}
            subjColor={subjectColor} variant="full"
            onPrev={() => step(-1)} onNext={() => step(1)} onToday={() => setYm({ y: today.getFullYear(), m: today.getMonth() })}
            onOpenSession={(id) => { const [classId, date] = id.split('|'); setOpen({ classId, date }); }}
            legend={
              <div style={{ display:'flex', alignItems:'center', gap:14, marginRight:14, flexWrap:'wrap' }}>
                {subjects.map(name => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:subjectColor(name) }} />
                    <span style={{ fontSize:11, color:DS.muted }}>{name}</span>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      )}
      {open && window.SessionDrawer && (
        <window.SessionDrawer classId={open.classId} date={open.date} role="teacher" onClose={() => setOpen(null)} />
      )}
    </div>
  );
};

// ─── Teacher Attendance Page ────────────────────────────────────────────────────

// Teacher presence is no longer self-reported here. A teacher's "present" state is
// inferred from confirming a register (delivery capture below), which removes the
// contradiction of a teacher marking themselves absent while confirming a register.
// The admin Teachers page still keeps its own presence toggles + sick-day tracking.
// tone → [fg, bg, border] from the design tokens (never raw accent hex)
const attTone = (tone) => ({
  accent:  [DS.accent,  DS.accentLight,  DS.accentBorder],
  success: [DS.success, DS.successBg,    DS.successBorder],
  warning: [DS.warning, DS.warningBg,    DS.warningBorder],
  danger:  [DS.danger,  DS.dangerBg,     DS.dangerBorder],
  muted:   [DS.muted,   DS.surface,      DS.border],
}[tone] || [DS.muted, DS.surface, DS.border]);

const attFmtRange = (s) => `${window.attFmtClock(s.starts_at)}–${window.attFmtClock(s.ends_at)}`;
const attFmtDay   = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }); };
const attShiftIso = (iso, delta) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + delta); return window.attIso(d); };

// P/A/L tally for a delivered session (derived — never stored as a rollup)
const attSummary = (session, roster, att) => {
  const recs = window.attRecordsFor(session, roster, att) || {};
  let p = 0, a = 0, l = 0;
  Object.values(recs).forEach(v => { if (v === 'present') p++; else if (v === 'absent') a++; else if (v === 'late') l++; });
  return { p, a, l };
};

// ─── Per-student Present / Absent / Late control (reused in the register panel) ──
const AttMarkButtons = ({ current, disabled, onPick }) => (
  <div style={{ display:'flex', gap:6 }}>
    {['present','absent','late'].map(st => {
      const active = current === st;
      const [c, bg, border] = attTone(st === 'present' ? 'success' : st === 'absent' ? 'danger' : 'warning');
      return (
        <button key={st} onClick={() => !disabled && onPick(st)} disabled={disabled} style={{
          padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600,
          cursor: disabled ? 'default' : 'pointer',
          border:`1px solid ${active ? border : DS.border}`,
          background: active ? bg : DS.surface,
          color: active ? c : DS.faint,
          opacity: disabled && !active ? 0.5 : 1, transition:'all 0.1s',
        }}>{st.charAt(0).toUpperCase() + st.slice(1)}</button>
      );
    })}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
//  Register panel — opened from an actionable (or recorded) session. Reuses the
//  existing marking UI + TimesheetCapture; does not rebuild them.
// ════════════════════════════════════════════════════════════════════════════
const RegisterPanel = ({ session, roster, att, ts, teachers, me, settings, now, isAdmin, onClose, onChanged }) => {
  const d = session.derived;
  const recorded  = d.state === 'recorded';
  const reopened  = recorded && d.reopened;                     // admin unlock re-opened a locked/recorded register
  const adminLapsed = isAdmin && d.state === 'lapsed';          // still-locked lapsed, admin acting directly
  const editable  = reopened || (!recorded && (d.actionable || adminLapsed));
  const amendable = recorded && d.amendable && !reopened;       // reopened uses the full re-take path instead
  const unlocked  = !!d.unlocked || !!reopened;                 // an admin grant is currently active
  const lateFlow  = d.state === 'awaiting' || adminLapsed || reopened; // D3/D5 — reason required
  const reasonNeeded = lateFlow && settings.require_late_reason;

  const existingRecs = recorded ? window.attRecordsFor(session, roster, att) : null;
  const [records, setRecords] = React.useState(() =>
    Object.fromEntries(roster.map(n => [n, existingRecs ? (existingRecs[n] || null) : null])));
  const [noStudents, setNoStudents] = React.useState(false);
  const [reason, setReason]   = React.useState(session.submission ? (session.submission.note || '') : '');
  const [deliveredBy, setDeliveredBy] = React.useState(session.register_submitted_by || (me && me.id));
  const [confirmed, setConfirmed] = React.useState(false);
  // slide-in transition for the side drawer
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  React.useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  // timesheet-shaped session so the existing capture pre-fills scheduled hours (D4 —
  // hours are a separate path from marks; this is the only place hours are written).
  const tsSession = {
    sessionId: session.id, classId: session.classId, teacherId: me && me.id,
    centreId: window.TIMESHEET_CENTRE || 'centre-001', date: session.dateISO,
    scheduledMinutes: session.scheduledMinutes, label: `${session.group} · ${session.name}`,
  };

  const setMark = (name, st) => {
    if (amendable) { att.amend_attendance({ sessionId: session.id, student: name }, st, { by: me && me.id }); setRecords(p => ({ ...p, [name]: st })); onChanged && onChanged(); return; }
    if (!editable || noStudents) return;
    setRecords(p => ({ ...p, [name]: st }));
  };
  const markAll = (st) => { if (!editable) return; setNoStudents(false); setRecords(Object.fromEntries(roster.map(n => [n, st]))); };

  const allMarked = noStudents || roster.every(n => records[n]);
  const canConfirm = editable && !confirmed && allMarked && (!reasonNeeded || reason.trim().length > 0);

  const doConfirm = () => {
    if (!canConfirm) return;
    const entries = noStudents ? Object.fromEntries(roster.map(n => [n, 'absent'])) : { ...records };
    att.submit_register(session, entries, { note: reason, deliveredBy, byAdmin: adminLapsed || (reopened && isAdmin), now });
    setConfirmed(true);                 // flips TimesheetCapture → registered, which logs the hours
    onChanged && onChanged();
  };
  const cancelSession = () => { att.setCancelled(session.id, true); onChanged && onChanged(); onClose(); };

  const counts = { present:0, absent:0, late:0, unmarked:0 };
  if (noStudents) { /* nobody present */ }
  else roster.forEach(n => { const v = records[n]; if (v) counts[v]++; else counts.unmarked++; });

  const meta = window.SESSION_STATE_META[d.state] || {};
  const [toneC, toneBg] = attTone(meta.tone);
  const Capture = window.TimesheetCapture;

  const footer = confirmed || (recorded && !editable) ? (
    <Btn variant="secondary" onClick={onClose}>{amendable ? 'Done' : 'Close'}</Btn>
  ) : (
    <>
      {editable && !reopened && <Btn variant="secondary" icon="x" onClick={cancelSession}>Cancel session</Btn>}
      <Btn variant="primary" icon="check" onClick={doConfirm}
        style={!canConfirm ? { opacity:0.5, pointerEvents:'none' } : {}}>
        {reopened ? 'Re-submit register' : lateFlow ? (adminLapsed ? 'Submit (admin)' : 'Submit late register') : 'Confirm register'}
      </Btn>
    </>
  );

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:`rgba(16,24,40,${shown ? 0.45 : 0})`, transition:'background 0.22s ease', display:'flex', justifyContent:'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'min(560px, 100%)', height:'100%', background:DS.bg, boxShadow:'-8px 0 30px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', transform: shown ? 'translateX(0)' : 'translateX(100%)', transition:'transform 0.22s ease' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'18px 22px', borderBottom:`1px solid ${DS.border}` }}>
          <div style={{ width:34, height:34, borderRadius:8, background:DS.accentLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="check" size={18} color={DS.accent} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:DS.text, lineHeight:1.3 }}>{session.group} · {session.name}</div>
            <div style={{ fontSize:12.5, color:DS.muted, marginTop:2 }}>{attFmtDay(session.dateISO)} · {attFmtRange(session)} · {session.room || 'No room'}</div>
          </div>
          <button onClick={onClose} title="Close" style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:DS.muted, flexShrink:0 }}><Icon name="x" size={18} color={DS.muted} /></button>
        </div>
        {/* Body (scrolls) */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 22px' }}>

      {/* Confirmation / context banner */}
      {confirmed ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.successBg, border:`1px solid ${DS.successBorder}`, marginBottom:14 }}>
          <Icon name="check" size={16} color={DS.success} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.success }}>Register confirmed — hours logged to the timesheet. This record is now locked.</span>
        </div>
      ) : unlocked ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, marginBottom:14 }}>
          <Icon name="lock" size={15} color={DS.accent} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.accent }}>An admin reopened this register {d.unlockExpiresAt ? `until ${window.attFmtClock(d.unlockExpiresAt)}` : ''} — take or correct it before it re-locks.</span>
        </div>
      ) : adminLapsed ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.dangerBg, border:`1px solid ${DS.dangerBorder}`, marginBottom:14 }}>
          <Icon name="shield" size={16} color={DS.danger} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.danger }}>Admin override — this session lapsed. Submitting is recorded and audited.</span>
        </div>
      ) : lateFlow ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.warningBg, border:`1px solid ${DS.warningBorder}`, marginBottom:14 }}>
          <Icon name="clock" size={16} color={DS.warning} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.warning }}>This register is late — add a brief reason below before you submit.</span>
        </div>
      ) : recorded && !amendable ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.surface, border:`1px solid ${DS.border}`, marginBottom:14 }}>
          <Icon name="lock" size={15} color={DS.muted} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.muted }}>The window to amend marks has closed. Contact an admin to correct this register.</span>
        </div>
      ) : recorded && amendable ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:8, background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, marginBottom:14 }}>
          <Icon name="edit" size={15} color={DS.accent} />
          <span style={{ fontSize:12.5, fontWeight:600, color:DS.accent }}>Recorded — you can still amend individual marks for a short window. Changes are logged.</span>
        </div>
      ) : null}

      {/* Late reason (D3) */}
      {reasonNeeded && !confirmed && (
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:DS.sub, marginBottom:6 }}>Reason for the late register <span style={{ color:DS.danger }}>*</span></label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="e.g. Cover teacher forgot to submit; taken retrospectively from the paper register." />
        </div>
      )}

      {/* Mark-all + no-show (editable only) */}
      {editable && !confirmed && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderBottom:`1px solid ${DS.border}`, marginBottom:6 }}>
          <span style={{ fontSize:12, color:DS.muted, marginRight:4 }}>Mark all:</span>
          {['present','absent','late'].map(st => {
            const [c, bg, border] = attTone(st === 'present' ? 'success' : st === 'absent' ? 'danger' : 'warning');
            return <button key={st} onClick={() => markAll(st)} style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${border}`, background:bg, color:c }}>{st.charAt(0).toUpperCase()+st.slice(1)}</button>;
          })}
          <button onClick={() => setNoStudents(v => !v)} title="Confirm the session ran with nobody present" style={{
            marginLeft:'auto', padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
            border:`1px solid ${noStudents ? DS.accentBorder : DS.border}`, background: noStudents ? DS.accentLight : DS.bg, color: noStudents ? DS.accent : DS.muted,
          }}>{noStudents ? '✓ ' : ''}No students attended</button>
        </div>
      )}

      {/* Student list */}
      <div style={{ maxHeight:280, overflowY:'auto', opacity: noStudents ? 0.4 : 1, pointerEvents: noStudents ? 'none' : 'auto' }}>
        {roster.length === 0 && (
          <div style={{ padding:'18px 0', fontSize:13, color:DS.muted }}>No students are enrolled in this class yet.</div>
        )}
        {roster.map((name, i) => {
          const status = records[name];
          const disabled = !editable && !amendable;
          return (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < roster.length-1 ? `1px solid ${DS.border}` : 'none' }}>
              <Avatar name={name} size={28} />
              <span style={{ flex:1, fontSize:13, fontWeight:500, color:DS.text }}>{name}</span>
              <AttMarkButtons current={status} disabled={disabled} onPick={(st) => setMark(name, st)} />
            </div>
          );
        })}
      </div>

      {/* Delivery confirmation — delivered-by + working time ride this register flow (D4) */}
      {Capture && editable && (
        <div style={{ marginTop:8, border:`1px solid ${DS.border}`, borderRadius:8, overflow:'hidden' }}>
          <Capture session={tsSession} registered={confirmed} store={ts}
            teachers={teachers} deliveredBy={deliveredBy} onDeliveredBy={setDeliveredBy}
            rosteredTeacherId={me && me.id} cancelled={false} />
        </div>
      )}

      {/* Running tally */}
      <div style={{ display:'flex', gap:14, padding:'12px 0 2px' }}>
        {noStudents ? (
          <span style={{ fontSize:12, color:DS.muted, fontWeight:600 }}>No students attended — session still confirmed</span>
        ) : [['present',DS.success],['absent',DS.danger],['late',DS.warning],['unmarked',DS.faint]].map(([k,c]) => (
          <span key={k} style={{ fontSize:12, color:c, fontWeight:600 }}>{counts[k]} {k}</span>
        ))}
      </div>
        </div>{/* /body */}
        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
          {footer}
        </div>
      </div>{/* /panel */}
    </div>
  );
};

// ─── Admin unlock chooser — grant a time-boxed reopen on a lapsed/locked register ─
const ATT_UNLOCK_PRESETS = [
  { label: '2 hours',       spec: { hours: 2 } },
  { label: '4 hours',       spec: { hours: 4 } },
  { label: 'Rest of today', spec: { untilEod: true } },
  { label: '24 hours',      spec: { hours: 24 } },
  { label: '48 hours',      spec: { hours: 48 } },
];
const AttUnlockChooser = ({ onGrant, label }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <Btn variant="secondary" icon="lock" small onClick={() => setOpen(o => !o)}>{label || 'Unlock'}</Btn>
      {open && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:60, background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:10, boxShadow:DS.cardShadowHi, padding:8, width:186 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:DS.faint, padding:'4px 8px 6px' }}>Reopen register for</div>
          {ATT_UNLOCK_PRESETS.map(p => (
            <button key={p.label} onClick={() => { onGrant(p.spec); setOpen(false); }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 8px', borderRadius:6, border:'none', background:'none', color:DS.text, fontSize:12.5, fontWeight:500, cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = DS.surface} onMouseLeave={e => e.currentTarget.style.background = 'none'}>{p.label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── One session row (state renders distinctly) ─────────────────────────────────
const SessionRow = ({ session, roster, att, isAdmin, onOpen, onReinstate, onGrant, onRevoke, showDate }) => {
  const d = session.derived;
  const meta = window.SESSION_STATE_META[d.state] || {};
  const [toneC, toneBg, toneBorder] = attTone(meta.tone);
  const color = (typeof subjectColor === 'function' ? subjectColor(session.name) : DS.accent);
  const cancelled = d.state === 'cancelled';
  const dim = d.state === 'upcoming' || cancelled;

  // Right-hand action / status by state
  const right = (() => {
    switch (d.state) {
      case 'open_live':
        return <Btn variant="primary" icon="check" small onClick={() => onOpen(session)}>Take register</Btn>;
      case 'awaiting':
        // includes an admin-unlocked lapsed session (derived to 'awaiting'); admin can re-lock early
        return (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isAdmin && d.unlocked && onRevoke && <button onClick={() => onRevoke(session)} title="Re-lock now" style={{ background:'none', border:'none', color:DS.muted, fontSize:11.5, fontWeight:600, cursor:'pointer', textDecoration:'underline' }}>Re-lock</button>}
            <Btn variant="primary" icon="clock" small onClick={() => onOpen(session)}>Take register</Btn>
          </div>
        );
      case 'upcoming':
        return <span style={{ fontSize:12, color:DS.muted, fontWeight:600 }}>Opens {window.attFmtClock(d.opensAt)}</span>;
      case 'recorded': {
        const { p, a, l } = attSummary(session, roster, att);
        return (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:DS.muted, fontVariantNumeric:'tabular-nums' }}>
              {p}P{a ? ` · ${a}A` : ''}{l ? ` · ${l}L` : ''}
            </span>
            {d.amendable
              ? <Btn variant="secondary" icon="edit" small onClick={() => onOpen(session)}>{d.reopened ? 'Re-take' : 'Amend'}</Btn>
              : isAdmin
                ? <AttUnlockChooser label="Unlock" onGrant={(spec) => onGrant && onGrant(session, spec)} />
                : <span title="Amendment window closed" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:DS.faint }}><Icon name="lock" size={12} color={DS.faint} /> Locked</span>}
          </div>
        );
      }
      case 'lapsed':
        return isAdmin
          ? <AttUnlockChooser label="Unlock register" onGrant={(spec) => onGrant && onGrant(session, spec)} />
          : <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:DS.danger, fontWeight:600 }}><Icon name="lock" size={13} color={DS.danger} /> Contact admin</span>;
      case 'cancelled':
        return <button onClick={() => onReinstate(session)} style={{ background:'none', border:'none', color:DS.accent, fontSize:12, fontWeight:600, cursor:'pointer' }}>Reinstate</button>;
      default: return null;
    }
  })();

  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px', borderBottom:`1px solid ${DS.border}`, opacity: dim ? 0.62 : 1 }}>
      <div style={{ width:64, textAlign:'center' }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums', textDecoration: cancelled ? 'line-through' : 'none' }}>{window.attFmtClock(session.starts_at)}</div>
        <div style={{ fontSize:11, color:DS.faint }}>{window.attFmtClock(session.ends_at)}</div>
      </div>
      <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background: cancelled ? DS.border : color }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:13.5, fontWeight:600, color:DS.text, textDecoration: cancelled ? 'line-through' : 'none' }}>{session.name.replace(/^(GCSE|A-?Level(?:\s+Further)?)\s+/i, '')}</span>
          {/* live-now marker only within the real start–end */}
          {d.liveNow && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:700, letterSpacing:'0.03em', color:DS.accent, background:DS.accentLight, padding:'2px 8px', borderRadius:999, textTransform:'uppercase' }}>
              <span style={{ width:6, height:6, borderRadius:999, background:DS.accent, display:'inline-block' }} /> Live now
            </span>
          )}
          {/* state chip (human label — no internal terms) */}
          {(d.unlocked || d.reopened) ? (
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.03em', color:DS.accent, background:DS.accentLight, padding:'2px 8px', borderRadius:999, textTransform:'uppercase' }}>
              Reopened{d.unlockExpiresAt ? ` · until ${window.attFmtClock(d.unlockExpiresAt)}` : ''}
            </span>
          ) : (d.state === 'awaiting' || d.state === 'lapsed' || (d.state === 'open_live' && d.graceEdge)) ? (
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.03em', color:toneC, background:toneBg, padding:'2px 8px', borderRadius:999, textTransform:'uppercase' }}>
              {d.state === 'awaiting' ? 'Late — reason required' : d.state === 'lapsed' ? 'Missed' : 'Open'}
            </span>
          ) : null}
          {cancelled && <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.03em', color:DS.muted, background:DS.surface, padding:'2px 8px', borderRadius:999, textTransform:'uppercase' }}>Cancelled</span>}
        </div>
        <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>
          {showDate ? `${attFmtDay(session.dateISO)} · ` : ''}{session.group} · {session.room || 'No room'} · {roster.length} student{roster.length === 1 ? '' : 's'}
        </div>
      </div>
      {right}
    </div>
  );
};

// ─── Dev-only clock nudge (D7) — never shipped to product UI ─────────────────────
const AttDevNudge = ({ onChange }) => {
  const H = 3600000, DAY = 86400000;
  const now = window.getNow();
  const offset = window.attNowOffset();
  const set = (delta) => { window.attSetNowOffset(offset + delta); onChange(); };
  const reset = () => { window.attSetNowOffset(0); onChange(); };
  const btn = { padding:'4px 9px', borderRadius:6, border:`1px dashed ${DS.borderDark}`, background:DS.bg, color:DS.sub, fontSize:11.5, fontWeight:600, cursor:'pointer' };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', marginBottom:16, borderRadius:8, background:'#FFFDF5', border:`1px dashed ${DS.warningBorder}`, flexWrap:'wrap' }}>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:DS.warning }}>Demo clock</span>
      <span style={{ fontSize:12, color:DS.sub }}>Now: <strong style={{ color:DS.text }}>{new Date(now).toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</strong></span>
      <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
        <button style={btn} onClick={() => set(-DAY)}>−1 day</button>
        <button style={btn} onClick={() => set(-H)}>−1 hr</button>
        <button style={{ ...btn, borderStyle:'solid', color:DS.accent, borderColor:DS.accentBorder }} onClick={reset}>Reset</button>
        <button style={btn} onClick={() => set(H)}>+1 hr</button>
        <button style={btn} onClick={() => set(DAY)}>+1 day</button>
      </div>
    </div>
  );
};

// ─── Admin stub: centre-wide "sessions missing a register" (D6) ──────────────────
const AttAdminMissing = ({ sessions, rosterOf, att, now, onOpen, onGrant, onRevoke }) => {
  const missing = sessions
    .filter(s => s.derived.state === 'awaiting' || s.derived.state === 'lapsed')
    .sort((a, b) => a.starts_at - b.starts_at);
  // This is a lens on the same page, not a page inside it, so the way out is the
  // "Teacher view" toggle in the page header — no second back affordance here.
  return (
    <Card title="Sessions missing a register" subtitle="Quick oversight of your own cohort. For every teacher across the centre, use the admin Attendance page.">
      {missing.length === 0 ? (
        <div style={{ padding:'8px 4px' }}>
          <EmptyState icon="check" title="Nothing outstanding" message="Every session in range has a register or is within its window." />
        </div>
      ) : (
        <div>
          {missing.map(s => (
            <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={true} showDate
              onOpen={onOpen} onReinstate={() => {}} onGrant={onGrant} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </Card>
  );
};

// Share the register drawer + session row + unlock chooser with the centre-wide
// admin Attendance page (AttendanceAdmin.jsx, loaded after this file).
Object.assign(window, {
  AttRegisterDrawer: RegisterPanel, AttSessionRow: SessionRow, AttUnlockChooser, AttDevNudge,
  attTone, attFmtDay, attFmtRange, attSummary,
});

// ════════════════════════════════════════════════════════════════════════════
//  Teacher Attendance — a time-scoped view over SESSIONS (not class groups).
//  Teacher presence is inferred from confirming a register (delivery capture),
//  not self-reported. See attendance.jsx for the derive-don't-store core.
// ════════════════════════════════════════════════════════════════════════════
const TeacherAttendancePage = () => {
  const store = useAdminStore();
  const att   = window.useAttendanceStore();
  const ts    = window.useTimesheetStore ? window.useTimesheetStore() : null;
  const settings = window.REGISTER_SETTINGS;
  const [, force] = React.useState(0);
  const rerender = () => force(x => x + 1);

  const now = window.getNow();
  const me = store.teachers.find(t => t.name === 'Heebz A') || store.teachers[0];
  const activeTeachers = store.teachers.filter(t => t.status === 'active');
  // Own classes plus any this teacher is covering; each session is then kept only
  // if they are its EFFECTIVE teacher on that date (a colleague covering one of
  // theirs takes that register) — the same rule the dashboard hero reads.
  const myClasses = store.classes.filter(c => me && (c.teacher === me.name || (c.cover && c.cover.teacher === me.name)) && c.status !== 'paused');

  // Materialise this teacher's dated sessions across the window, overlaying persisted
  // submissions + cancellations. Every derived state comes from here.
  const sessions = window.materialiseSessions(myClasses, settings, now, att)
    .filter(s => (typeof effectiveTeacher === 'function' ? effectiveTeacher(s.cls, s.dateISO) : s.cls.teacher) === me.name);
  const rosterOf = React.useCallback((s) => window.attRosterFor(s.classId, s.group, store), [store]);

  const [selectedDate, setSelectedDate] = React.useState(() => window.attIso(new Date(now)));
  const [viewRole, setViewRole] = React.useState('teacher');   // teacher | admin (D6 stub)
  const [focusClassId, setFocusClassId] = React.useState(() => (myClasses[0] && myClasses[0].id) || null);
  const [panelSession, setPanelSession] = React.useState(null);

  // Deep link (dashboard hero "Take register now", the timetable's session drawer):
  // open that one session's register instead of landing on the generic day. A
  // session older than this page's window is materialised on its own.
  React.useEffect(() => {
    const target = window.__registerSession;
    if (!target) return;
    window.__registerSession = null;
    const [classId, dateISO] = target.split('|');
    const cls = myClasses.find(c => c.id === classId);
    const s = sessions.find(x => x.id === target)
      || (cls && dateISO ? window.materialiseRange([cls], settings, now, att, dateISO, dateISO)[0] : null);
    if (s) { setSelectedDate(s.dateISO); setPanelSession(s); }
  }, []);

  const todayIso = window.attIso(new Date(now));
  const daySessions = sessions.filter(s => s.dateISO === selectedDate).sort((a, b) => a.starts_at - b.starts_at);

  // "Needs register" — awaiting (backfillable) + lapsed (locked), oldest first. The
  // teacher-forgot / safeguarding surface. Independent of the selected day.
  const needs = sessions.filter(s => s.derived.state === 'awaiting' || s.derived.state === 'lapsed')
    .sort((a, b) => a.starts_at - b.starts_at);

  // Side panels — derived for the focused class (cancelled excluded from denominators).
  const focusSessions = sessions.filter(s => s.classId === focusClassId);
  const focusRate = window.attendanceRate(focusSessions, rosterOf, att);
  const overallRate = window.attendanceRate(sessions, rosterOf, att);
  const recent = window.recentSessions(focusSessions, rosterOf, att, 6);
  const focusClass = myClasses.find(c => c.id === focusClassId);

  const openPanel = (s) => setPanelSession(s);
  const reinstate = (s) => { att.setCancelled(s.id, false); rerender(); };
  const grantUnlock = (s, spec) => { att.grant_unlock(s.id, spec, { by: me && me.id }); rerender(); };
  const revokeUnlock = (s) => { att.revoke_unlock(s.id, { by: me && me.id }); rerender(); };

  const allRecordedToday = daySessions.length > 0 && daySessions.every(s => s.derived.state === 'recorded' || s.derived.state === 'cancelled');
  usePageTrail(viewRole === 'admin' ? [{ label: 'Admin oversight' }] : []);

  return (
    <div style={pageFrame()}>
      <PageHeader title="Attendance"
        subtitle="Take and review the register for each of your sessions"
        actions={[
          <Btn key="role" variant="secondary" small icon={viewRole === 'admin' ? 'teacher' : 'shield'}
            onClick={() => setViewRole(v => v === 'admin' ? 'teacher' : 'admin')}>
            {viewRole === 'admin' ? 'Teacher view' : 'Admin oversight'}
          </Btn>,
          <Btn key="exp" variant="secondary" icon="download" small>Export Register</Btn>,
        ]} />

      {/* Dev-only clock nudge so lifecycle states are demonstrable (D7) */}
      <AttDevNudge onChange={rerender} />

      {viewRole === 'admin' ? (
        <AttAdminMissing sessions={sessions} rosterOf={rosterOf} att={att} now={now}
          onOpen={openPanel} onGrant={grantUnlock} onRevoke={revokeUnlock} />
      ) : (
        <>
          {/* Needs register (pinned, only when non-empty) */}
          {needs.length > 0 && (
            <div style={{ marginBottom:22, border:`1px solid ${DS.warningBorder}`, borderRadius:12, overflow:'hidden', background:DS.bg, boxShadow:DS.cardShadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background:DS.warningBg, borderBottom:`1px solid ${DS.warningBorder}` }}>
                <Icon name="clock" size={17} color={DS.warning} />
                <span style={{ fontSize:14, fontWeight:700, color:DS.warning }}>Needs register</span>
                <span style={{ fontSize:12, color:DS.warning }}>{needs.length} session{needs.length === 1 ? '' : 's'} — a missing register is a safeguarding gap, not a formality.</span>
              </div>
              <div>
                {needs.map(s => (
                  <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={false} showDate
                    onOpen={openPanel} onReinstate={reinstate} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start' }}>
            {/* Today (or selected day) */}
            <Card
              title={selectedDate === todayIso ? 'Today' : attFmtDay(selectedDate)}
              subtitle={new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
              actions={
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <button onClick={() => setSelectedDate(d => attShiftIso(d, -1))} title="Previous day" style={{ display:'inline-flex', padding:6, borderRadius:6, border:`1px solid ${DS.border}`, background:DS.bg, cursor:'pointer' }}><Icon name="chevron_l" size={15} color={DS.muted} /></button>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    style={{ padding:'5px 9px', borderRadius:6, border:`1px solid ${DS.border}`, fontSize:12.5, outline:'none', color:DS.text }} />
                  <button onClick={() => setSelectedDate(d => attShiftIso(d, 1))} title="Next day" style={{ display:'inline-flex', padding:6, borderRadius:6, border:`1px solid ${DS.border}`, background:DS.bg, cursor:'pointer' }}><Icon name="chevron_r" size={15} color={DS.muted} /></button>
                  {selectedDate !== todayIso && <button onClick={() => setSelectedDate(todayIso)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${DS.accentBorder}`, background:DS.accentLight, color:DS.accent, fontSize:12, fontWeight:600, cursor:'pointer' }}>Today</button>}
                </div>
              }>
              {daySessions.length === 0 ? (
                <div style={{ padding:'10px 4px' }}>
                  <EmptyState icon="calendar" title="No sessions scheduled" message={selectedDate === todayIso ? 'You have no classes today. Use the date arrows to review another day.' : 'No classes on this day.'} />
                </div>
              ) : allRecordedToday ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background:DS.successBg, borderBottom:`1px solid ${DS.successBorder}` }}>
                    <Icon name="check" size={16} color={DS.success} />
                    <span style={{ fontSize:12.5, fontWeight:600, color:DS.success }}>All registers done for this day.</span>
                  </div>
                  {daySessions.map(s => <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={false} onOpen={openPanel} onReinstate={reinstate} />)}
                </>
              ) : (
                daySessions.map(s => <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={false} onOpen={openPanel} onReinstate={reinstate} />)
              )}
            </Card>

            {/* Side panels — all derived */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Card title="Attendance rate" actions={
                <Select value={focusClassId || ''} onChange={e => setFocusClassId(e.target.value)} style={{ width:150, fontSize:12 }}>
                  {myClasses.map(c => <option key={c.id} value={c.id}>{c.group.replace(/\s*–\s*/, ' ')}</option>)}
                </Select>
              }>
                <div style={{ padding:'18px 20px' }}>
                  <div style={{ fontSize:40, fontWeight:800, color: focusRate.pct == null ? DS.faint : DS.success, letterSpacing:'-1px', lineHeight:1 }}>
                    {focusRate.pct == null ? '—' : `${focusRate.pct}%`}
                  </div>
                  <div style={{ fontSize:12, color:DS.muted, marginTop:4, marginBottom:16 }}>
                    This term · {focusClass ? focusClass.group : ''}
                  </div>
                  <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden', marginBottom:12 }}>
                    <div style={{ width:`${focusRate.pct || 0}%`, height:'100%', background:DS.success, borderRadius:3 }} />
                  </div>
                  {[
                    ['Target', '95%'],
                    ['Across your classes', overallRate.pct == null ? '—' : `${overallRate.pct}%`],
                    ['Delivered', `${focusRate.deliveredSessions} session${focusRate.deliveredSessions === 1 ? '' : 's'}`],
                  ].map(([l,v]) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid ${DS.border}` }}>
                      <span style={{ color:DS.muted }}>{l}</span>
                      <span style={{ fontWeight:500, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Recent sessions">
                {recent.length === 0 ? (
                  <div style={{ padding:'8px 4px' }}><EmptyState icon="calendar" title="No delivered sessions yet" message="Confirmed registers will appear here." /></div>
                ) : (
                  <div style={{ padding:'8px 0' }}>
                    {recent.map((row, i) => (
                      <div key={row.session.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 18px', borderBottom: i < recent.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                        <span style={{ fontSize:12, color:DS.muted, width:52, flexShrink:0 }}>{attFmtDay(row.session.dateISO).replace(/^\w+ /, '')}</span>
                        <div style={{ flex:1, display:'flex', gap:6 }}>
                          <span style={{ fontSize:12, color:DS.success, fontWeight:600 }}>{row.present}P</span>
                          {row.absent > 0 && <span style={{ fontSize:12, color:DS.danger, fontWeight:600 }}>{row.absent}A</span>}
                          {row.late > 0 && <span style={{ fontSize:12, color:DS.warning, fontWeight:600 }}>{row.late}L</span>}
                        </div>
                        <span style={{ fontSize:11, color:DS.faint, fontVariantNumeric:'tabular-nums' }}>{row.pct == null ? '—' : `${row.pct}%`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {panelSession && (
        <RegisterPanel key={panelSession.id} session={panelSession} roster={rosterOf(panelSession)}
          att={att} ts={ts} teachers={activeTeachers} me={me} settings={settings} now={now}
          isAdmin={viewRole === 'admin'}
          onClose={() => { setPanelSession(null); rerender(); }}
          onChanged={rerender} />
      )}
    </div>
  );
};

// ─── Lesson Planner (decision #47) ──────────────────────────────────────────────
// Two things, one screen family:
//   • LESSON — reusable content in the teacher's library (no class, no date);
//   • PLANNED LESSON — that lesson scheduled for one class on one date, carrying
//     only what is specific to that delivery (notes for the group, reflection).
// Teachers still start from "what am I teaching Tuesday" (class + date), then
// either start a lesson from scratch or reuse one from their library. Edit the
// lesson once and every delivery gets it; a delivery that must diverge forks its
// own copy. Store + rules: lessons.jsx (window.klasioLessons).
const lpToday = () => (window.attIso && window.getNow ? window.attIso(new Date(window.getNow())) : new Date().toISOString().slice(0, 10));
const lpFmtLong = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
const lpFmtShort = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
const LP_BLANK = { title: '', topic: '', duration: '60', objectives: '', agenda: '', homework: '' };
const lpInput = { width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${DS.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: DS.bg, fontFamily: 'inherit', color: DS.text };
const lpLabel = { fontSize: 11, fontWeight: 600, color: DS.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const lpClassColor = (cls) => (cls ? subjectColor(cls.name) : DS.accent);

// The lesson's content — read view with an Edit toggle; edits save to the ONE
// lesson every delivery points at.
const LessonContentForm = ({ lesson, canEdit, startEditing, sharedCount = 0, onFork }) => {
  const L = window.klasioLessons;
  const [editing, setEditing] = React.useState(!!startEditing);
  const [draft, setDraft] = React.useState(() => ({ ...LP_BLANK, ...lesson }));
  const [savedFlash, setSavedFlash] = React.useState(false);
  React.useEffect(() => { setDraft({ ...LP_BLANK, ...lesson }); }, [lesson.id, lesson.updatedAt]);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const save = () => {
    L.saveLesson({ id: lesson.id, title: draft.title.trim(), topic: draft.topic.trim(), duration: draft.duration, objectives: draft.objectives, agenda: draft.agenda, homework: draft.homework });
    setEditing(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000);
  };
  const field = (key, label, rows, placeholder) => (
    <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: DS.text, marginBottom: 10 }}>{label}</div>
      {editing
        ? <textarea rows={rows} value={draft[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={{ ...lpInput, lineHeight: 1.6, resize: 'vertical' }} />
        : <div style={{ fontSize: 13.5, color: draft[key] ? DS.sub : DS.faint, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontStyle: draft[key] ? 'normal' : 'italic' }}>{draft[key] || 'Nothing recorded.'}</div>}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sharedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: DS.infoBg, borderRadius: 10, fontSize: 12.5, color: DS.sub }}>
          <Icon name="copy" size={15} color={DS.info} />
          <span style={{ flex: 1 }}>This lesson is also planned for <strong style={{ color: DS.text }}>{sharedCount} other deliver{sharedCount === 1 ? 'y' : 'ies'}</strong> — changes here apply to all of them.</span>
          {canEdit && onFork && <Btn variant="ghost" small onClick={onFork}>Make a separate copy for this class</Btn>}
        </div>
      )}
      <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
        {editing ? (
          <>
            <input value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Lesson title (e.g. Quadratic simultaneous equations)"
              style={{ ...lpInput, fontSize: 20, fontWeight: 700, border: 'none', padding: '2px 0', marginBottom: 10 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
              <div><label style={lpLabel}>Topic / unit</label><input value={draft.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Algebra · Simultaneous equations" style={lpInput} /></div>
              <div><label style={lpLabel}>Minutes</label><input type="number" value={draft.duration} onChange={e => set('duration', e.target.value)} style={lpInput} /></div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>{draft.title || 'Untitled lesson'}</div>
              <div style={{ fontSize: 13, color: DS.muted, marginTop: 3 }}>{[draft.topic, draft.duration ? `${draft.duration} min` : null].filter(Boolean).join(' · ') || 'No topic yet'}</div>
            </div>
            {savedFlash && <StatusPill tone="positive">Saved</StatusPill>}
            {canEdit && <Btn variant="secondary" icon="edit" small onClick={() => setEditing(true)}>Edit lesson</Btn>}
          </div>
        )}
      </div>
      {field('objectives', 'Learning objectives', 3, 'What should pupils know or be able to do by the end?')}
      {field('agenda', 'Lesson structure', 7, 'Timings, e.g.\n0–10  Starter\n10–35 Main activity\n35–55 Practice\n55–60 Plenary')}
      {field('homework', 'Homework to set', 2, 'What will be set at the end of the lesson?')}
      {editing && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="primary" icon="check" onClick={save}>Save lesson</Btn>
          <Btn variant="secondary" onClick={() => { setDraft({ ...LP_BLANK, ...lesson }); setEditing(false); }}>Cancel</Btn>
        </div>
      )}
    </div>
  );
};

// Pick a lesson from the teacher's library (search by title / topic).
const LessonLibraryPicker = ({ lessons, onPick, today }) => {
  const [q, setQ] = React.useState('');
  const L = window.klasioLessons;
  const shown = lessons.filter(l => !q.trim() || `${l.title} ${l.topic}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search your lessons by title or topic…" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>
        {shown.map(l => {
          const u = L.usageOf(l.id, today);
          return (
            <button key={l.id} onClick={() => onPick(l)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, border: `1px solid ${DS.border}`, background: DS.bg, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <Icon name="book" size={16} color={DS.accent} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{l.title || 'Untitled lesson'}</div>
                <div style={{ fontSize: 11.5, color: DS.muted }}>{l.topic || 'No topic'}{u.taught ? ` · taught ${u.taught} time${u.taught === 1 ? '' : 's'}` : ' · not taught yet'}</div>
              </div>
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </button>
          );
        })}
        {!shown.length && <div style={{ fontSize: 13, color: DS.muted, padding: '10px 2px' }}>{lessons.length ? 'No lessons match.' : 'Your library is empty — start from scratch and the lesson will be saved to it.'}</div>}
      </div>
    </div>
  );
};

// Other deliveries of a lesson — its history across groups, reflections included.
const LessonDeliveriesList = ({ lessonId, exceptId, classes, onOpen, today }) => {
  const L = window.klasioLessons;
  const ds = L.deliveriesForLesson(lessonId).filter(d => d.id !== exceptId);
  if (!ds.length) return <div style={{ fontSize: 12.5, color: DS.faint }}>Not planned for any other class yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ds.map(d => {
        const cls = classes.find(c => c.id === d.classId);
        return (
          <button key={d.id} onClick={() => onOpen(d)} style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 8, border: `1px solid ${DS.border}`, background: DS.bg, cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 3, height: 26, borderRadius: 2, background: lpClassColor(cls) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.text }}>{cls ? cls.group : d.classId}</div>
                <div style={{ fontSize: 11.5, color: DS.muted }}>{lpFmtShort(d.date)}{d.date > today ? ' · upcoming' : ''}</div>
              </div>
            </div>
            {d.reflection && <div style={{ fontSize: 12, color: DS.sub, marginTop: 6, lineHeight: 1.45, fontStyle: 'italic' }}>“{d.reflection}”</div>}
          </button>
        );
      })}
    </div>
  );
};

// One class's lesson on one date — plan it, or open what's planned.
const DeliveryScreen = ({ classId, date, classes, me, onChange, onOpenLesson, onBack }) => {
  const L = window.useLessons ? window.useLessons() : window.klasioLessons;
  const today = lpToday();
  const cls = classes.find(c => c.id === classId) || null;
  const delivery = cls ? L.deliveryFor(cls.id, date) : null;
  const lesson = delivery ? L.getLesson(delivery.lessonId) : null;
  const [notes, setNotes] = React.useState(delivery ? delivery.notes || '' : '');
  const [reflection, setReflection] = React.useState(delivery ? delivery.reflection || '' : '');
  const [justCreated, setJustCreated] = React.useState(false);
  React.useEffect(() => { setNotes(delivery ? delivery.notes || '' : ''); setReflection(delivery ? delivery.reflection || '' : ''); }, [delivery && delivery.id]);
  usePageTrail([{ label: lesson ? (lesson.title || 'Untitled lesson') : 'Plan a lesson' }]);

  const startScratch = () => {
    const l = L.saveLesson({ ...LP_BLANK, ownerId: me.id, owner: me.name });
    L.planDelivery({ classId: cls.id, date, lessonId: l.id, createdBy: me.id });
    setJustCreated(true);
  };
  const reuse = (l) => { L.planDelivery({ classId: cls.id, date, lessonId: l.id, createdBy: me.id }); setJustCreated(false); };
  const usage = lesson ? L.usageOf(lesson.id, today) : null;
  const canEdit = !!(lesson && lesson.ownerId === me.id);
  const isPast = date <= today;
  const dirtyNotes = delivery && notes !== (delivery.notes || '');
  const dirtyRefl = delivery && reflection !== (delivery.reflection || '');

  return (
    <div>
      <BackLink onClick={onBack} label="Lesson planner" />
      {/* Class + date header — changing either looks at a different delivery */}
      <div style={{ background: `linear-gradient(135deg, ${lpClassColor(cls)}12 0%, ${DS.accentLight} 100%)`, border: `1px solid ${lpClassColor(cls)}33`, borderRadius: 14, padding: '18px 22px', marginBottom: 18, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: lpClassColor(cls), letterSpacing: '0.08em', textTransform: 'uppercase' }}>{lpFmtLong(date)}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: DS.text, marginTop: 4 }}>{cls ? `${cls.name} · ${cls.group}` : 'Choose a class'}</div>
          {cls && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{cls.day} {cls.time} · {cls.room || 'No room'}{cls.day && new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' }) !== cls.day ? ` · this class doesn’t usually meet on a ${new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })}` : ''}</div>}
        </div>
        <div style={{ width: 220 }}><label style={lpLabel}>Class</label>
          <select value={classId || ''} onChange={e => onChange(e.target.value, date)} style={lpInput}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.group} · {c.name.replace(/^(GCSE|A-?Level)\s+/i, '')}</option>)}
          </select>
        </div>
        <div style={{ width: 170 }}><label style={lpLabel}>Date</label>
          <input type="date" value={date} onChange={e => e.target.value && onChange(classId, e.target.value)} style={lpInput} />
        </div>
      </div>

      {!cls ? <EmptyState icon="book" title="Choose a class" message="Pick one of your classes above." /> : !delivery ? (
        // Nothing planned yet — start from scratch or reuse from the library.
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <Card title="Start from scratch" subtitle="A new lesson — it’s saved to your library so you can reuse it with other groups.">
            <div style={{ padding: '16px 18px' }}>
              <Btn variant="primary" icon="plus" onClick={startScratch}>Write a new lesson</Btn>
            </div>
          </Card>
          <Card title="Reuse from my library" subtitle="Plan a lesson you’ve already written. Its materials come with it; notes stay with each class.">
            <div style={{ padding: '14px 18px' }}>
              <LessonLibraryPicker lessons={L.listLessons(me.id)} onPick={reuse} today={today} />
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 20, alignItems: 'start' }}>
          <LessonContentForm lesson={lesson || { id: delivery.lessonId, ...LP_BLANK }} canEdit={canEdit} startEditing={justCreated}
            sharedCount={usage ? Math.max(0, usage.deliveries - 1) : 0}
            onFork={() => { L.forkLesson(delivery.id); setJustCreated(true); }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title={`Notes for ${cls.group}`} subtitle="Only this delivery — differentiation, pupils to watch, what to bring">
              <div style={{ padding: '12px 16px' }}>
                <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Pair Sophia with a stronger partner for the scaling step." style={{ ...lpInput, resize: 'vertical', lineHeight: 1.55 }} />
                {dirtyNotes && <div style={{ marginTop: 8 }}><Btn variant="primary" small icon="check" onClick={() => L.updateDelivery(delivery.id, { notes })}>Save notes</Btn></div>}
              </div>
            </Card>
            <Card title="Share with the class" subtitle="Pupils see this in the lesson when they open it from their sessions">
              <div style={{ padding: '12px 16px' }}>
                <button type="button" onClick={() => L.updateDelivery(delivery.id, { shareWithClass: !delivery.shareWithClass })}
                  aria-pressed={!!delivery.shareWithClass}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', background: delivery.shareWithClass ? DS.accent : DS.borderDark, transition: 'background .14s' }}>
                    <span style={{ position: 'absolute', top: 2, left: delivery.shareWithClass ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .14s' }} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{delivery.shareWithClass ? 'Title, topic and objectives shared' : 'Not shared with pupils'}</span>
                </button>
                <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 8, lineHeight: 1.5 }}>Only the title, topic and objectives. Your notes, the lesson structure and your reflection are never shown to pupils. Files reach pupils only when you mark them visible below.</div>
              </div>
            </Card>
            <Card title="After the lesson" subtitle="How it went — this builds the lesson’s history across groups">
              <div style={{ padding: '12px 16px' }}>
                {isPast ? (
                  <>
                    <textarea rows={3} value={reflection} onChange={e => setReflection(e.target.value)} placeholder="e.g. Part 2 was hard for this group — slow down next time." style={{ ...lpInput, resize: 'vertical', lineHeight: 1.55 }} />
                    {dirtyRefl && <div style={{ marginTop: 8 }}><Btn variant="primary" small icon="check" onClick={() => L.updateDelivery(delivery.id, { reflection })}>Save reflection</Btn></div>}
                  </>
                ) : <div style={{ fontSize: 12.5, color: DS.faint }}>Available once the lesson has been taught.</div>}
              </div>
            </Card>
            <Card>
              <div style={{ padding: '14px 16px' }}>
                {window.AttachResourcesPanel
                  ? <window.AttachResourcesPanel contextType="lesson" contextId={delivery.lessonId} canEdit={canEdit} />
                  : null}
                <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 8 }}>Materials belong to the lesson, so every class it’s planned for gets them.</div>
              </div>
            </Card>
            <Card title="Also planned for" subtitle={usage ? `Taught ${usage.taught} time${usage.taught === 1 ? '' : 's'}${usage.next ? ` · next ${lpFmtShort(usage.next)}` : ''}` : ''}>
              <div style={{ padding: '12px 16px' }}>
                <LessonDeliveriesList lessonId={delivery.lessonId} exceptId={delivery.id} classes={classes} today={today} onOpen={(d) => onChange(d.classId, d.date)} />
              </div>
            </Card>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {lesson && <Btn variant="secondary" icon="book" small onClick={() => onOpenLesson(lesson.id)}>Open in library</Btn>}
              <Btn variant="ghost" icon="x" small onClick={() => L.deleteDelivery(delivery.id)}>Unplan from this date</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// A library lesson: its content, where it's been / will be taught, plan it again.
const LessonScreen = ({ lessonId, classes, me, onOpenDelivery, onBack }) => {
  const L = window.useLessons ? window.useLessons() : window.klasioLessons;
  const lesson = L.getLesson(lessonId);
  const today = lpToday();
  const [planCls, setPlanCls] = React.useState((classes[0] || {}).id || '');
  const [planDate, setPlanDate] = React.useState(today);
  const [msg, setMsg] = React.useState('');
  usePageTrail([{ label: lesson ? (lesson.title || 'Untitled lesson') : 'Lesson' }]);
  if (!lesson) return <div><BackLink onClick={onBack} label="Lesson planner" /><EmptyState icon="book" title="Lesson not found" /></div>;
  const usage = L.usageOf(lesson.id, today);
  const planIt = () => {
    if (!planCls || !planDate) return;
    const existing = L.deliveryFor(planCls, planDate);
    if (existing && existing.lessonId !== lesson.id) { setMsg('That class already has a lesson planned on that date — open it to change it.'); return; }
    L.planDelivery({ classId: planCls, date: planDate, lessonId: lesson.id, createdBy: me.id });
    onOpenDelivery(planCls, planDate);
  };
  return (
    <div>
      <BackLink onClick={onBack} label="Lesson planner" />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 20, alignItems: 'start' }}>
        <LessonContentForm lesson={lesson} canEdit={lesson.ownerId === me.id} startEditing={!lesson.title} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Plan for a class">
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={planCls} onChange={e => setPlanCls(e.target.value)} style={lpInput}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.group} · {c.name.replace(/^(GCSE|A-?Level)\s+/i, '')}</option>)}
              </select>
              <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} style={lpInput} />
              <Btn variant="primary" icon="calendar" small onClick={planIt}>Plan it</Btn>
              {msg && <div style={{ fontSize: 12, color: DS.warning }}>{msg}</div>}
            </div>
          </Card>
          <Card title="Taught to" subtitle={`${usage.taught} time${usage.taught === 1 ? '' : 's'}${usage.next ? ` · next ${lpFmtShort(usage.next)}` : ''}`}>
            <div style={{ padding: '12px 16px' }}>
              <LessonDeliveriesList lessonId={lesson.id} classes={classes} today={today} onOpen={(d) => onOpenDelivery(d.classId, d.date)} />
            </div>
          </Card>
          <Card>
            <div style={{ padding: '14px 16px' }}>
              {window.AttachResourcesPanel ? <window.AttachResourcesPanel contextType="lesson" contextId={lesson.id} canEdit={lesson.ownerId === me.id} /> : null}
            </div>
          </Card>
          {usage.deliveries === 0 && lesson.ownerId === me.id && (
            <Btn variant="ghost" icon="x" small onClick={() => { L.deleteLesson(lesson.id); onBack(); }}>Delete lesson</Btn>
          )}
        </div>
      </div>
    </div>
  );
};

const LessonPlannerPage = ({ initialClassId, initialDate, initialMode }) => {
  const L = window.useLessons ? window.useLessons() : window.klasioLessons;
  const store = useAdminStore();
  const TM = window.teacherMetrics;
  const me = TM ? TM.getPrincipal() : { id: 't1', name: 'Heebz A' };
  const classes = TM ? TM.getMyClasses() : store.classes.filter(c => c.teacher === me.name);
  const today = lpToday();
  const [screen, setScreen] = React.useState(() => initialClassId
    ? { name: 'delivery', classId: initialClassId, date: initialDate || today }
    : { name: 'browse' });
  const [tab, setTab] = React.useState('planned');
  const [q, setQ] = React.useState('');
  const [classF, setClassF] = React.useState('all');

  const openDelivery = (classId, date) => setScreen({ name: 'delivery', classId, date });
  const openLesson = (id) => setScreen({ name: 'lesson', id });
  const back = () => setScreen({ name: 'browse' });
  const newLesson = () => { const l = L.saveLesson({ ...LP_BLANK, ownerId: me.id, owner: me.name }); openLesson(l.id); };

  if (screen.name === 'delivery') {
    return <div style={pageFrame()}><DeliveryScreen classId={screen.classId} date={screen.date} classes={classes} me={me}
      onChange={openDelivery} onOpenLesson={openLesson} onBack={back} /></div>;
  }
  if (screen.name === 'lesson') {
    return <div style={pageFrame()}><LessonScreen lessonId={screen.id} classes={classes} me={me} onOpenDelivery={openDelivery} onBack={back} /></div>;
  }

  const ql = q.trim().toLowerCase();
  const deliveries = L.listDeliveries(classes.map(c => c.id))
    .filter(d => classF === 'all' || d.classId === classF)
    .filter(d => { if (!ql) return true; const l = L.getLesson(d.lessonId) || {}; const c = classes.find(x => x.id === d.classId) || {}; return `${l.title} ${l.topic} ${c.group} ${d.notes}`.toLowerCase().includes(ql); });
  const upcoming = deliveries.filter(d => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = deliveries.filter(d => d.date < today);
  const library = L.listLessons(me.id).filter(l => !ql || `${l.title} ${l.topic}`.toLowerCase().includes(ql));

  const DeliveryRow = ({ d }) => {
    const l = L.getLesson(d.lessonId) || {};
    const c = classes.find(x => x.id === d.classId);
    return (
      <HoverRow onClick={() => openDelivery(d.classId, d.date)}>
        <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10.5, color: DS.muted, textTransform: 'uppercase', fontWeight: 600 }}>{lpFmtShort(d.date).split(' ')[1]}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: lpClassColor(c), lineHeight: 1.1 }}>{lpFmtShort(d.date).split(' ')[0]}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{l.title || 'Untitled lesson'}</div>
          <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{c ? `${c.group} · ${c.name}` : d.classId}{l.topic ? ` · ${l.topic}` : ''}</div>
        </div>
        {d.reflection && <StatusPill tone="positive">Reflected</StatusPill>}
        {L.usageOf(d.lessonId, today).deliveries > 1 && <StatusPill tone="info">Reused</StatusPill>}
      </HoverRow>
    );
  };

  return (
    <div style={pageFrame()}>
      <PageHeader title="Lesson Planner" subtitle="Plan what you’re teaching each class — write a lesson once and reuse it with any group"
        actions={[
          <Btn key="n" variant="secondary" icon="book" small onClick={newLesson}>New lesson</Btn>,
          <Btn key="p" variant="primary" icon="plus" small onClick={() => openDelivery((classes[0] || {}).id, today)}>Plan a lesson</Btn>,
        ]} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <Segmented value={tab} onChange={setTab} options={[{ id: 'planned', label: 'Planned', count: upcoming.length + past.length }, { id: 'library', label: 'My library', count: L.listLessons(me.id).length }]} />
        <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'planned' ? 'Search planned lessons, classes, notes…' : 'Search your lessons…'} style={{ maxWidth: 360 }} />
        {tab === 'planned' && (
          <Select value={classF} onChange={e => setClassF(e.target.value)} style={{ width: 220 }}>
            <option value="all">All my classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.group} · {c.name.replace(/^(GCSE|A-?Level)\s+/i, '')}</option>)}
          </Select>
        )}
      </div>

      {tab === 'planned' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Coming up" subtitle={`${upcoming.length} planned`}>
            {upcoming.length ? upcoming.map(d => <DeliveryRow key={d.id} d={d} />)
              : <div style={{ padding: '18px 20px', fontSize: 13, color: DS.muted }}>Nothing planned ahead — use “Plan a lesson”, or open a session from your timetable.</div>}
          </Card>
          <Card title="Taught" subtitle={`${past.length} delivered`}>
            {past.length ? past.slice(0, 30).map(d => <DeliveryRow key={d.id} d={d} />)
              : <div style={{ padding: '18px 20px', fontSize: 13, color: DS.muted }}>No past lessons yet.</div>}
          </Card>
        </div>
      ) : (
        <Card title="My library" subtitle="Reusable lessons — no class, no date. Plan one for any group.">
          {library.length ? library.map(l => {
            const u = L.usageOf(l.id, today);
            return (
              <HoverRow key={l.id} onClick={() => openLesson(l.id)}>
                <Icon name="book" size={17} color={DS.accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{l.title || 'Untitled lesson'}</div>
                  <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{l.topic || 'No topic'}</div>
                </div>
                <span style={{ fontSize: 12, color: DS.muted, whiteSpace: 'nowrap' }}>
                  {u.taught ? `Taught ${u.taught}×` : 'Not taught yet'}{u.last ? ` · last ${lpFmtShort(u.last)}` : ''}{u.next ? ` · next ${lpFmtShort(u.next)}` : ''}
                </span>
              </HoverRow>
            );
          }) : <EmptyState icon="book" title={ql ? 'No lessons match' : 'Your library is empty'} message="Write a lesson once and plan it for any of your groups." action={<Btn variant="primary" icon="plus" small onClick={newLesson}>New lesson</Btn>} />}
        </Card>
      )}
    </div>
  );
};

// ─── Teacher Reports Page ───────────────────────────────────────────────────────
// The full reports surface lives in Reports.jsx (window.TeacherReports), loaded
// before this file. Routed below via the `reports` page id.

// ─── Tracking Page ──────────────────────────────────────────────────────────────
const TRACKING_STORAGE_KEY = 'tutoros.tracking.v1';
const TRACKING_RECENTS_KEY = 'tutoros.tracking.recents.v1';

// Column types. `score` = a number out of a max; `checkbox` = yes/no; `select` =
// custom options (rendered with colour dots); `rating` = 1–5 stars; `text` = a
// note. `grade` (A*–U) and `date` are kept for backward compatibility with older
// trackers. The list below is what the column editor offers.
const COLUMN_TYPES = [
  { id: 'score',    label: 'Score',    icon: 'chart',      hint: 'A number out of a maximum' },
  { id: 'checkbox', label: 'Checkbox', icon: 'check',      hint: 'Yes / no' },
  { id: 'select',   label: 'Choice',   icon: 'clip',       hint: 'Pick from custom options' },
  { id: 'rating',   label: 'Rating',   icon: 'star',       hint: '1–5 stars' },
  { id: 'text',     label: 'Text',     icon: 'edit',       hint: 'A short note' },
  { id: 'grade',    label: 'Grade',    icon: 'graduation', hint: 'A*–U' },
  { id: 'date',     label: 'Date',     icon: 'calendar',   hint: 'A calendar date' },
];
const COLUMN_TYPE_LABEL = COLUMN_TYPES.reduce((m, t) => { m[t.id] = t.label; return m; }, {});

const GRADE_OPTIONS = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];

// Stable palette for select-option colour dots. The dot colour is derived from the
// option's position at render time — it is never stored on the column.
const OPTION_DOT_COLORS = ['#4F46E5', '#0891B2', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0284C7'];
const optionDot = (i) => OPTION_DOT_COLORS[i % OPTION_DOT_COLORS.length];

// Fixed score thresholds (D4): <50% of max = danger, 50–74% = warning, ≥75% =
// default text colour. Derived at render time — never persisted.
const scoreTone = (value, max) => {
  if (typeof value !== 'number' || !max) return DS.text;
  const pct = (value / max) * 100;
  if (pct < 50) return DS.danger;
  if (pct < 75) return DS.warning;
  return DS.text;
};

// A light, derived descriptor of what a tracker mostly measures — shown as the
// "type" badge on the hub. Computed from the columns, never stored.
const KIND_LABEL = { score: 'Scores', checkbox: 'Checklist', select: 'Log', rating: 'Ratings', text: 'Notes', grade: 'Grades', date: 'Dates' };
const trackerKind = (t) => {
  const cols = t.columns || [];
  if (!cols.length) return 'Empty';
  const counts = {};
  cols.forEach(c => {
    const k = c.type === 'number' ? 'score' : c.type === 'check' ? 'checkbox' : c.type;
    counts[k] = (counts[k] || 0) + 1;
  });
  const kinds = Object.keys(counts);
  return kinds.length === 1 ? (KIND_LABEL[kinds[0]] || 'Tracker') : 'Mixed';
};

// Relative "edited N ago" label (namespaced — Communications.jsx owns a global
// relTime for ISO strings; this one takes an epoch-ms timestamp).
const trkRelTime = (ts) => {
  if (!ts) return null;
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

// ── Column-type migration (idempotent, in-place, runs on load) ──────────────────
// D7: legacy `check` columns become `checkbox`; numeric `number` columns that
// carry a max fold into `score` (so the denominator shows in the header and the
// threshold colouring applies). Everything else is left untouched, and running it
// again is a no-op. Cell values are never altered.
const migrateTracker = (t) => {
  const columns = (t.columns || []).map(c => {
    if (c.type === 'check') return { ...c, type: 'checkbox' };
    if (c.type === 'number' && c.max) return { ...c, type: 'score' };
    return c;
  });
  return { ...t, columns, pinned: !!t.pinned };
};

const loadTrackers = () => {
  let raw = null;
  try { raw = localStorage.getItem(TRACKING_STORAGE_KEY); } catch (e) {}
  let list = null;
  if (raw) { try { list = JSON.parse(raw); } catch (e) { list = null; } }
  if (!Array.isArray(list)) list = DEFAULT_TRACKERS;
  return list.map(migrateTracker);
};

const saveTrackers = (trackers) => {
  try { localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(trackers)); } catch (e) {}
};

// Recently-opened tracker ids (most-recent first). UI state, kept out of the
// tracker records themselves.
const loadRecents = () => {
  try { const v = JSON.parse(localStorage.getItem(TRACKING_RECENTS_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
};
const pushRecent = (id) => {
  const next = [id, ...loadRecents().filter(x => x !== id)].slice(0, 8);
  try { localStorage.setItem(TRACKING_RECENTS_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
};

const newId = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 8);

// Read class roster from teacherClasses; fall back to sane default
const getRosterForGroup = (group) => {
  const cls = teacherClasses.find(c => c.group === group);
  return cls ? cls.studentList : [];
};
const studentsOf = (t) => t ? [...getRosterForGroup(t.classGroup), ...(t.extraStudents || [])] : [];
const studentCountOf = (t) => getRosterForGroup(t.classGroup).length + (t.extraStudents || []).length;

// ─── Tracker grouping ─────────────────────────────────────────────────────────
// Teachers accumulate dozens of trackers, so both the hub and the detail switcher
// group them by one of these dimensions. Subject / year group are derived from the
// tracker's class via teacherClasses, with graceful fallbacks for custom groups.
const TRACKER_GROUP_BY = [
  { id: 'class',   label: 'Class',      icon: 'users' },
  { id: 'subject', label: 'Subject',    icon: 'book' },
  { id: 'year',    label: 'Year group', icon: 'folder' },
];

const subjectOfGroup = (group) => {
  const cls = teacherClasses.find(c => c.group === group);
  if (cls && cls.name) {
    // "GCSE Mathematics" / "A-Level Mathematics" → "Mathematics"
    return cls.name.replace(/^(GCSE|A-Level|IGCSE|BTEC|KS\d)\s+/i, '').trim() || cls.name;
  }
  return 'Other';
};

const yearOfGroup = (group) => {
  const m = (group || '').match(/year\s*\d+/i);
  if (m) return m[0].replace(/\s+/, ' ').replace(/year/i, 'Year');
  return 'Other';
};

const trackerGroupKey = (tracker, groupBy) =>
  groupBy === 'subject' ? subjectOfGroup(tracker.classGroup)
  : groupBy === 'year'  ? yearOfGroup(tracker.classGroup)
  : (tracker.classGroup || 'Unassigned');

// Group + filter trackers into [{ key, items }] sections, sorted by key.
const groupTrackers = (trackers, groupBy, query) => {
  const q = (query || '').trim().toLowerCase();
  const match = (t) => !q || [t.name, t.description, t.classGroup]
    .filter(Boolean).join(' ').toLowerCase().includes(q);
  const buckets = new Map();
  trackers.filter(match).forEach(t => {
    const key = trackerGroupKey(t, groupBy);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(t);
  });
  return Array.from(buckets.entries())
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => {
      // Push "Other"/"Unassigned" buckets to the end, otherwise alphabetical.
      const aOther = /^(other|unassigned)$/i.test(a.key);
      const bOther = /^(other|unassigned)$/i.test(b.key);
      if (aOther !== bOther) return aOther ? 1 : -1;
      return a.key.localeCompare(b.key, undefined, { numeric: true });
    });
};

// Starter templates offered on the empty hub and in the New-tracker dialog.
const STARTER_TEMPLATES = [
  {
    id: 'homework', name: 'Homework scores', icon: 'chart',
    description: 'Weekly homework marks per student',
    columns: [
      { name: 'HW1', type: 'score', max: 20 },
      { name: 'HW2', type: 'score', max: 20 },
      { name: 'On time?', type: 'checkbox' },
      { name: 'Notes', type: 'text' },
    ],
  },
  {
    id: 'test', name: 'Test scores', icon: 'graduation',
    description: 'Assessment results and predicted grades',
    columns: [
      { name: 'Paper 1', type: 'score', max: 100 },
      { name: 'Paper 2', type: 'score', max: 100 },
      { name: 'Predicted', type: 'grade' },
    ],
  },
  {
    id: 'behaviour', name: 'Behaviour log', icon: 'flag',
    description: 'Conduct and effort each lesson',
    columns: [
      { name: 'Conduct', type: 'select', options: ['Excellent', 'Good', 'Concern'] },
      { name: 'Effort', type: 'rating' },
      { name: 'Note', type: 'text' },
    ],
  },
];

// ─── Data grid cell ─────────────────────────────────────────────────────────────
// One cell of the tracker grid. Renders a compact display value and, for editable
// types, an inline editor when this cell is being edited. Score/checkbox/rating are
// styled per the spec (right-aligned mono figures with threshold colours, a toggle,
// stars). Keyboard navigation and edit lifecycle are driven by the parent via `g`.
const GridCell = ({ col, value, r, c, focused, editing, seed, g }) => {
  const type = col.type;
  const filled = value !== undefined && value !== null && value !== '';

  const wrapKeydown = (e) => g.onCellKeyDown(e, r, c);
  const setRef = (node) => { g.cellRefs.current[r + ':' + c] = node; };
  // Roving tabindex: the focused cell is tabbable; before any cell is focused the
  // top-left cell is the tab target so keyboard users can enter the grid.
  const tabIndex = focused ? 0 : (!g.hasFocus && r === 0 && c === 0 ? 0 : -1);

  // Checkbox and rating are directly interactive — no separate edit mode.
  if (type === 'checkbox') {
    const on = value === true;
    return (
      <div ref={setRef} tabIndex={tabIndex} role="gridcell" aria-label={col.name}
        onFocus={() => g.focusCell(r, c)} onKeyDown={wrapKeydown}
        style={cellShell(focused, 'center')}>
        <button type="button" aria-pressed={on} title={col.name}
          onClick={() => { g.focusCell(r, c); g.setValue(r, c, !on); }}
          style={{
            width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${on ? DS.successBorder : DS.border}`,
            background: on ? DS.successBg : DS.bg, color: on ? DS.success : DS.faint,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {on && <Icon name="check" size={15} />}
        </button>
      </div>
    );
  }

  if (type === 'rating') {
    const v = typeof value === 'number' ? value : 0;
    return (
      <div ref={setRef} tabIndex={tabIndex} role="gridcell" aria-label={`${col.name}: ${v || 'unrated'}`}
        onFocus={() => g.focusCell(r, c)} onKeyDown={wrapKeydown}
        style={cellShell(focused, 'left')}>
        <div style={{ display: 'inline-flex', gap: 1 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" title={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => { g.focusCell(r, c); g.setValue(r, c, v === n ? null : n); }}
              style={{ background: 'none', border: 'none', padding: '0 1px', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: n <= v ? '#F59E0B' : DS.border }}>
              {n <= v ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Editable types (score / text / grade / select / date) — display + inline editor.
  if (editing) {
    return (
      <div ref={setRef} tabIndex={-1} role="gridcell" style={cellShell(true, 'left', true)}>
        <CellEditor col={col} value={value} seed={seed} r={r} c={c} g={g} />
      </div>
    );
  }

  let display;
  if (type === 'score') {
    display = filled
      ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13, color: scoreTone(value, col.max) }}>{value}</span>
      : <span style={{ color: DS.faint }}>·</span>;
    return editableCell(display, 'right');
  }
  if (type === 'select') {
    const opts = col.options || [];
    const idx = opts.indexOf(value);
    display = filled
      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DS.text }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: optionDot(idx < 0 ? 0 : idx), flexShrink: 0 }} />{value}
        </span>
      : <span style={{ color: DS.faint }}>·</span>;
    return editableCell(display, 'left');
  }
  if (type === 'grade') {
    display = filled
      ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: DS.text }}>{value}</span>
      : <span style={{ color: DS.faint }}>·</span>;
    return editableCell(display, 'left');
  }
  if (type === 'date') {
    display = filled ? <span style={{ fontSize: 12.5, color: DS.text }}>{value}</span> : <span style={{ color: DS.faint }}>·</span>;
    return editableCell(display, 'left');
  }
  // text (and any legacy 'number' without max)
  display = filled
    ? <span style={{ fontSize: 12.5, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 220 }}>{value}</span>
    : <span style={{ color: DS.faint }}>·</span>;
  return editableCell(display, type === 'number' ? 'right' : 'left');

  function editableCell(node, align) {
    return (
      <div ref={setRef} tabIndex={tabIndex} role="gridcell" aria-label={col.name}
        onFocus={() => g.focusCell(r, c)} onKeyDown={wrapKeydown}
        onClick={() => g.startEdit(r, c)}
        style={{ ...cellShell(focused, align), cursor: 'text' }}>
        {node}
      </div>
    );
  }
};

// Shared cell shell — the focus ring and alignment live here so every cell type
// looks consistent.
const cellShell = (focused, align, editing) => ({
  minHeight: 34, display: 'flex', alignItems: 'center',
  justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
  padding: editing ? 2 : '4px 6px', borderRadius: 7, outline: 'none',
  boxShadow: focused ? `0 0 0 2px ${DS.accent}` : 'none',
  background: focused && !editing ? DS.accentLight : 'transparent',
  transition: 'box-shadow 0.1s',
});

// Inline editor rendered inside a focused, editing cell. Commits on Enter (moves
// down), Tab (moves right / Shift+Tab left), select/date change or blur; cancels on
// Escape.
const CellEditor = ({ col, value, seed, r, c, g }) => {
  const type = col.type;
  const initial = seed != null ? seed : (value == null ? '' : value);
  const [draft, setDraft] = React.useState(initial);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (el.select && (type === 'score' || type === 'text')) { try { el.select(); } catch (e) {} }
  }, []);

  const coerce = (raw) => {
    if (type === 'score' || type === 'number') {
      if (raw === '' || raw === null) return null;
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    return raw;
  };
  const commit = (dir) => g.commit(r, c, coerce(draft), dir);
  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit('down'); }
    else if (e.key === 'Tab') { e.preventDefault(); commit(e.shiftKey ? 'left' : 'right'); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); g.cancelEdit(); }
    else { e.stopPropagation(); }
  };
  const base = {
    width: '100%', boxSizing: 'border-box', padding: '5px 7px', fontSize: 13,
    border: `1px solid ${DS.accent}`, borderRadius: 6, outline: 'none',
    background: DS.bg, color: DS.text, fontFamily: 'inherit',
  };

  if (type === 'score' || type === 'number') {
    return <input ref={ref} type="number" value={draft} onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown} onBlur={() => commit(null)}
      style={{ ...base, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums', fontWeight: 600 }} />;
  }
  if (type === 'grade' || type === 'select') {
    const opts = type === 'grade' ? GRADE_OPTIONS : (col.options || []);
    return <select ref={ref} value={draft} onChange={e => { setDraft(e.target.value); g.commit(r, c, e.target.value, null); }}
      onKeyDown={onKeyDown} onBlur={() => commit(null)} style={base}>
      <option value="">—</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>;
  }
  if (type === 'date') {
    return <input ref={ref} type="date" value={draft} onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown} onBlur={() => commit(null)} style={base} />;
  }
  return <input ref={ref} type="text" value={draft} onChange={e => setDraft(e.target.value)}
    onKeyDown={onKeyDown} onBlur={() => commit(null)} placeholder="—" style={base} />;
};

// Bottom summary cell — all figures derived from cell values at render time.
const ColumnSummaryCell = ({ col, entries, students }) => {
  const values = students.map(s => entries[s] && entries[s][col.id]).filter(v => v !== undefined && v !== null && v !== '');
  if (!values.length) return <span style={{ fontSize: 11, color: DS.faint }}>—</span>;
  const muted = { fontSize: 11, color: DS.muted };

  if (col.type === 'score' || col.type === 'number') {
    const nums = values.filter(v => typeof v === 'number');
    if (!nums.length) return <span style={{ fontSize: 11, color: DS.faint }}>—</span>;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    if (col.max) {
      const pct = (avg / col.max) * 100;
      return <span style={muted}>avg <b style={{ fontFamily: "'JetBrains Mono', monospace", color: scoreTone(avg, col.max) }}>{avg.toFixed(1)}</b> · {pct.toFixed(0)}%</span>;
    }
    return <span style={muted}>avg <b style={{ fontFamily: "'JetBrains Mono', monospace", color: DS.text }}>{avg.toFixed(1)}</b></span>;
  }
  if (col.type === 'checkbox') {
    const yes = values.filter(v => v === true).length;
    return <span style={muted}><b style={{ color: DS.text }}>{yes}</b>/{values.length} yes</span>;
  }
  if (col.type === 'rating') {
    const nums = values.filter(v => typeof v === 'number');
    if (!nums.length) return <span style={{ fontSize: 11, color: DS.faint }}>—</span>;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return <span style={muted}><span style={{ color: '#F59E0B' }}>★</span> <b style={{ color: DS.text }}>{avg.toFixed(1)}</b></span>;
  }
  if (col.type === 'grade' || col.type === 'select') {
    const counts = {};
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return <span style={muted}>{top.map(([k, n]) => `${k}×${n}`).join(' · ')}</span>;
  }
  return <span style={{ fontSize: 11, color: DS.faint }}>{values.length} filled</span>;
};

// ─── Column editor popover ──────────────────────────────────────────────────────
// Opened from a column header (or the Add-column button). Rename, change type, set
// the max / options, or delete the column (two-step confirm). Replaces the old
// inline pencil form.
const ColumnForm = ({ col, onSave, onDelete, onClose }) => {
  const isNew = !col;
  const [draft, setDraft] = React.useState(() => ({
    name: (col && col.name) || '',
    type: (col && (col.type === 'check' ? 'checkbox' : col.type === 'number' ? 'score' : col.type)) || 'score',
    max: (col && col.max) || 100,
    options: ((col && col.options) || []).join('\n'),
    // A score column can COUNT AS AN ASSESSMENT (decision #50): its marks then feed
    // the student's attainment series (Progress, profile, at-risk, reports) without
    // being typed twice. It needs a date so it sits in the series in order.
    countsAsAssessment: !!(col && col.countsAsAssessment),
    assessedOn: (col && col.assessedOn) || (window.attIso && window.getNow ? window.attIso(new Date(window.getNow())) : ''),
  }));
  const [confirm, setConfirm] = React.useState(false);
  const nameRef = React.useRef(null);
  React.useEffect(() => { if (nameRef.current) nameRef.current.focus(); }, []);

  const submit = () => {
    if (!draft.name.trim()) return;
    const next = { name: draft.name.trim(), type: draft.type };
    if (draft.type === 'score') {
      next.max = Number(draft.max) || 100;
      next.countsAsAssessment = !!draft.countsAsAssessment;
      next.assessedOn = draft.countsAsAssessment ? (draft.assessedOn || null) : null;
    }
    if (draft.type === 'select') next.options = draft.options.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    onSave(next);
  };

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{isNew ? 'New column' : 'Edit column'}</div>
      <Field label="Name" style={{ margin: 0 }}>
        <input ref={nameRef} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="e.g. Mock Paper 1"
          style={fieldInput} />
      </Field>
      <Field label="Type" style={{ margin: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {COLUMN_TYPES.filter(t => t.id !== 'date' || draft.type === 'date').slice(0, 6).map(t => {
            const on = draft.type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setDraft(d => ({ ...d, type: t.id }))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${on ? DS.accent : DS.border}`, background: on ? DS.accentLight : DS.bg,
                  color: on ? DS.accent : DS.sub, fontSize: 12.5, fontWeight: on ? 600 : 500, textAlign: 'left',
                }}>
                <Icon name={t.icon} size={13} color={on ? DS.accent : DS.faint} />{t.label}
              </button>
            );
          })}
        </div>
      </Field>
      {draft.type === 'score' && (
        <Field label="Out of (max)" style={{ margin: 0 }}>
          <input type="number" value={draft.max} onChange={e => setDraft(d => ({ ...d, max: e.target.value }))} style={fieldInput} />
        </Field>
      )}
      {draft.type === 'score' && (
        <div style={{ padding: '10px 11px', borderRadius: 8, background: draft.countsAsAssessment ? DS.accentLight : DS.surface, border: `1px solid ${draft.countsAsAssessment ? DS.accentBorder : DS.border}` }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12.5, color: DS.text }}>
            <input type="checkbox" checked={draft.countsAsAssessment} onChange={e => setDraft(d => ({ ...d, countsAsAssessment: e.target.checked }))} style={{ marginTop: 2 }} />
            <span><strong>Counts as an assessment</strong><br /><span style={{ color: DS.muted, fontSize: 11.5 }}>These marks feed each pupil’s attainment on Progress, their profile and reports — no need to type them twice.</span></span>
          </label>
          {draft.countsAsAssessment && (
            <input type="date" value={draft.assessedOn} onChange={e => setDraft(d => ({ ...d, assessedOn: e.target.value }))} style={{ ...fieldInput, marginTop: 8 }} />
          )}
        </div>
      )}
      {draft.type === 'select' && (
        <Field label="Options" hint="One per line" style={{ margin: 0 }}>
          <textarea value={draft.options} onChange={e => setDraft(d => ({ ...d, options: e.target.value }))}
            placeholder={'Excellent\nGood\nConcern'} rows={4} style={{ ...fieldInput, resize: 'vertical', minHeight: 72 }} />
        </Field>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
        <Btn variant="primary" small onClick={submit}>{isNew ? 'Add column' : 'Save'}</Btn>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        {!isNew && onDelete && (
          confirm ? (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: DS.danger }}>Delete?</span>
              <button onClick={onDelete} style={dangerLink}>Yes, delete</button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} style={{ ...dangerLink, marginLeft: 'auto' }}>Delete column</button>
          )
        )}
      </div>
    </div>
  );
};
const ColumnPopover = ({ open, anchorRef, col, onSave, onDelete, onClose }) => (
  <Popover open={open} onClose={onClose} anchorRef={anchorRef} width={300} ariaLabel="Column settings">
    {open && <ColumnForm col={col} onSave={onSave} onDelete={onDelete} onClose={onClose} />}
  </Popover>
);

const fieldInput = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13,
  border: `1px solid ${DS.border}`, borderRadius: 7, background: DS.bg, color: DS.text,
  fontFamily: 'inherit', outline: 'none',
};
const dangerLink = { background: 'none', border: 'none', cursor: 'pointer', color: DS.danger, fontSize: 12, fontWeight: 600, padding: '6px 4px' };

// ─── Hub: filter chip ───────────────────────────────────────────────────────────
const HubFilterChip = ({ label, value, options, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const active = value != null;
  return (
    <React.Fragment>
      <button ref={ref} type="button" onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8,
          border: `1px solid ${active ? DS.accentBorder : DS.border}`, background: active ? DS.accentLight : DS.bg,
          color: active ? DS.accent : DS.sub, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
        <Icon name="filter" size={12} color={active ? DS.accent : DS.faint} />
        {active ? `${label}: ${value}` : label}
        <Icon name="chevron_d" size={13} color={active ? DS.accent : DS.faint} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} width={220} maxHeight={300}>
        <div style={{ padding: 4 }}>
          <button type="button" onClick={() => { onChange(null); setOpen(false); }} style={filterOption(!active)}>
            All {label.toLowerCase()}
          </button>
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} style={filterOption(o === value)}>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o}</span>
              {o === value && <Icon name="check" size={14} color={DS.accent} />}
            </button>
          ))}
        </div>
      </Popover>
    </React.Fragment>
  );
};
const filterOption = (on) => ({
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
  padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
  background: on ? DS.accentLight : 'transparent', color: on ? DS.accent : DS.sub,
  fontSize: 13, fontWeight: on ? 600 : 500,
});

// ─── Hub: a single tracker row ──────────────────────────────────────────────────
const TrackerRow = ({ tracker, onOpen, onTogglePin }) => {
  const [hover, setHover] = React.useState(false);
  const edited = trkRelTime(tracker.updatedAt);
  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', cursor: 'pointer',
        borderBottom: `1px solid ${DS.border}`, background: hover ? DS.surface : 'transparent', outline: 'none',
      }}>
      <button type="button" title={tracker.pinned ? 'Unpin' : 'Pin to top'} aria-pressed={!!tracker.pinned}
        onClick={e => { e.stopPropagation(); onTogglePin(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1, fontSize: 16, color: tracker.pinned ? '#F59E0B' : DS.border, flexShrink: 0 }}>
        {tracker.pinned ? '★' : '☆'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tracker.name}</div>
        {tracker.description && <div style={{ fontSize: 12, color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tracker.description}</div>}
      </div>
      <span style={{ flexShrink: 0 }}><Badge variant="default">{tracker.classGroup}</Badge></span>
      <span style={{ flexShrink: 0, fontSize: 11.5, color: DS.muted, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>{trackerKind(tracker)}</span>
      <span style={{ flexShrink: 0, width: 78, textAlign: 'right', fontSize: 12, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{studentCountOf(tracker)} students</span>
      <span style={{ flexShrink: 0, width: 84, textAlign: 'right', fontSize: 11.5, color: DS.faint }}>{edited ? `Edited ${edited}` : 'No edits yet'}</span>
      <Icon name="chevron_r" size={15} color={DS.faint} />
    </div>
  );
};

// ─── Hub: grouped section ───────────────────────────────────────────────────────
const HubSection = ({ label, count, collapsed, onToggle, children, icon }) => (
  <div style={{ marginBottom: 10 }}>
    <button type="button" onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', cursor: onToggle ? 'pointer' : 'default',
        border: 'none', background: 'transparent', textAlign: 'left',
      }}>
      {onToggle && <Icon name={collapsed ? 'chevron_r' : 'chevron_d'} size={13} color={DS.faint} />}
      {icon && <Icon name={icon} size={13} color={DS.muted} />}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: DS.faint }}>{count}</span>
    </button>
    {!collapsed && (
      <div style={{ border: `1px solid ${DS.cardBorder}`, borderRadius: 10, overflow: 'hidden', background: DS.card, boxShadow: DS.cardShadow }}>
        {children}
      </div>
    )}
  </div>
);

// ─── Tracker Hub (index state) ──────────────────────────────────────────────────
const TrackerHub = ({ trackers, recents, onOpen, onTogglePin, onNew, onNewFromTemplate }) => {
  const [query, setQuery] = React.useState('');
  const [fClass, setFClass] = React.useState(null);
  const [fSubject, setFSubject] = React.useState(null);
  const [fYear, setFYear] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState({});

  const classes = React.useMemo(() => Array.from(new Set(trackers.map(t => t.classGroup).filter(Boolean))).sort(), [trackers]);
  const subjects = React.useMemo(() => Array.from(new Set(trackers.map(t => subjectOfGroup(t.classGroup)))).sort(), [trackers]);
  const years = React.useMemo(() => Array.from(new Set(trackers.map(t => yearOfGroup(t.classGroup)))).sort(), [trackers]);

  const q = query.trim().toLowerCase();
  const facet = (t) =>
    (!fClass || t.classGroup === fClass) &&
    (!fSubject || subjectOfGroup(t.classGroup) === fSubject) &&
    (!fYear || yearOfGroup(t.classGroup) === fYear);
  const matches = (t) => (!q || [t.name, t.description, t.classGroup].filter(Boolean).join(' ').toLowerCase().includes(q)) && facet(t);
  const filtered = trackers.filter(matches);
  const isFiltering = !!(q || fClass || fSubject || fYear);

  const toggle = (k) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  if (trackers.length === 0) {
    return (
      <div>
        <div style={{ border: `1px solid ${DS.cardBorder}`, borderRadius: 12, background: DS.card, boxShadow: DS.cardShadow, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px', background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chart" size={24} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: DS.text }}>Start tracking anything</div>
          <div style={{ fontSize: 13.5, color: DS.muted, marginTop: 5, maxWidth: 420, margin: '5px auto 0', lineHeight: 1.5 }}>
            Build a custom grid for homework marks, test scores, behaviour — whatever you want to log per student. Pick a template to get going or start from blank.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 24, textAlign: 'left', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
            {STARTER_TEMPLATES.map(tpl => (
              <button key={tpl.id} type="button" onClick={() => onNewFromTemplate(tpl)} style={templateCard}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon name={tpl.icon} size={16} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{tpl.name}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 3, lineHeight: 1.45 }}>{tpl.description}</div>
              </button>
            ))}
            <button type="button" onClick={() => onNew()} style={{ ...templateCard, borderStyle: 'dashed' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: DS.surface, color: DS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon name="plus" size={16} /></div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>Blank tracker</div>
              <div style={{ fontSize: 12, color: DS.muted, marginTop: 3, lineHeight: 1.45 }}>Start with no columns and build your own.</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pinned = filtered.filter(t => t.pinned);
  const recentList = recents.map(id => filtered.find(t => t.id === id)).filter(Boolean).filter(t => !t.pinned).slice(0, 4);
  const grouped = groupTrackers(filtered, 'class', '');

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search trackers by name, class or description…" style={{ minWidth: 260 }} />
        <HubFilterChip label="Class" value={fClass} options={classes} onChange={setFClass} />
        <HubFilterChip label="Subject" value={fSubject} options={subjects} onChange={setFSubject} />
        <HubFilterChip label="Year group" value={fYear} options={years} onChange={setFYear} />
        <Btn variant="primary" icon="plus" small style={{ marginLeft: 'auto' }} onClick={() => onNew()}>New tracker</Btn>
      </div>

      {filtered.length === 0 ? (
        <div style={{ border: `1px solid ${DS.cardBorder}`, borderRadius: 10, background: DS.card, boxShadow: DS.cardShadow }}>
          <EmptyState icon="search" title="No trackers match" message="Try a different search or clear the filters." />
        </div>
      ) : isFiltering ? (
        <HubSection label="Results" count={filtered.length} icon="list">
          {filtered.map(t => <TrackerRow key={t.id} tracker={t} onOpen={() => onOpen(t.id)} onTogglePin={() => onTogglePin(t.id)} />)}
        </HubSection>
      ) : (
        <React.Fragment>
          {pinned.length > 0 && (
            <HubSection label="Pinned" count={pinned.length} icon="pin">
              {pinned.map(t => <TrackerRow key={t.id} tracker={t} onOpen={() => onOpen(t.id)} onTogglePin={() => onTogglePin(t.id)} />)}
            </HubSection>
          )}
          {recentList.length > 0 && (
            <HubSection label="Recently opened" count={recentList.length} icon="clock">
              {recentList.map(t => <TrackerRow key={t.id} tracker={t} onOpen={() => onOpen(t.id)} onTogglePin={() => onTogglePin(t.id)} />)}
            </HubSection>
          )}
          <div style={{ fontSize: 11.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '18px 4px 8px' }}>All trackers</div>
          {grouped.map(sec => (
            <HubSection key={sec.key} label={sec.key} count={sec.items.length} collapsed={!!collapsed[sec.key]} onToggle={() => toggle(sec.key)} icon="users">
              {sec.items.map(t => <TrackerRow key={t.id} tracker={t} onOpen={() => onOpen(t.id)} onTogglePin={() => onTogglePin(t.id)} />)}
            </HubSection>
          ))}
        </React.Fragment>
      )}
    </div>
  );
};
const templateCard = {
  display: 'block', textAlign: 'left', padding: 14, borderRadius: 10, cursor: 'pointer',
  border: `1px solid ${DS.border}`, background: DS.bg,
};

// ─── Detail: settings slide-over ────────────────────────────────────────────────
const TrackerSettingsPanel = ({ tracker, api, onClose }) => {
  const [name, setName] = React.useState(tracker.name);
  const [description, setDescription] = React.useState(tracker.description || '');
  const [classGroup, setClassGroup] = React.useState(tracker.classGroup);
  const [confirmCol, setConfirmCol] = React.useState(null);

  const save = () => {
    api.saveSettings(tracker.id, { name: name.trim() || tracker.name, description: description.trim(), classGroup });
    onClose();
  };

  return (
    <SlideOver open onClose={onClose} title="Tracker settings" subtitle="Rename, re-home and manage columns" icon="settings"
      footer={<><Btn variant="secondary" small onClick={onClose}>Cancel</Btn><Btn variant="primary" small onClick={save}>Save changes</Btn></>}>
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Tracker name" /></Field>
      <Field label="Description" hint="What is this tracker for?"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></Field>
      <Field label="Class / group">
        <Select value={classGroup} onChange={e => setClassGroup(e.target.value)}>
          {teacherClasses.map(c => <option key={c.id} value={c.group}>{c.group}</option>)}
        </Select>
      </Field>

      <div style={{ marginTop: 8, marginBottom: 8, fontSize: 12.5, fontWeight: 700, color: DS.sub }}>Columns</div>
      <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {(tracker.columns || []).length === 0 && (
          <div style={{ padding: '14px 12px', fontSize: 12.5, color: DS.muted, textAlign: 'center' }}>No columns yet.</div>
        )}
        {(tracker.columns || []).map((col, i) => (
          <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderBottom: i < tracker.columns.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button type="button" title="Move up" disabled={i === 0} onClick={() => api.moveColumn(tracker.id, col.id, -1)} style={reorderBtn(i === 0)}><Icon name="chevron_d" size={11} color={DS.muted} style={{ transform: 'rotate(180deg)' }} /></button>
              <button type="button" title="Move down" disabled={i === tracker.columns.length - 1} onClick={() => api.moveColumn(tracker.id, col.id, 1)} style={reorderBtn(i === tracker.columns.length - 1)}><Icon name="chevron_d" size={11} color={DS.muted} /></button>
            </div>
            <input value={col.name} onChange={e => api.updateColumn(tracker.id, col.id, { ...col, name: e.target.value })}
              style={{ flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 13, border: `1px solid ${DS.border}`, borderRadius: 6, background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none' }} />
            <span style={{ flexShrink: 0, fontSize: 11, color: DS.muted, background: DS.surface, borderRadius: 5, padding: '2px 7px' }}>
              {COLUMN_TYPE_LABEL[col.type] || col.type}{col.type === 'score' && col.max ? ` /${col.max}` : ''}
            </span>
            {confirmCol === col.id ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <button onClick={() => { api.deleteColumn(tracker.id, col.id); setConfirmCol(null); }} style={dangerLink}>Delete</button>
                <button onClick={() => setConfirmCol(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, fontSize: 12 }}>Cancel</button>
              </span>
            ) : (
              <button type="button" title="Delete column" onClick={() => setConfirmCol(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 4, flexShrink: 0, display: 'flex' }}><Icon name="trash" size={14} /></button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Btn variant="secondary" icon="plus" small onClick={() => api.addColumn(tracker.id, { name: 'New column', type: 'score', max: 100 })}>Add column</Btn>
      </div>
      <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 8 }}>Tip: change a column's type, max or options from its header in the grid.</div>
    </SlideOver>
  );
};
const reorderBtn = (disabled) => ({ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: 0, lineHeight: 0, opacity: disabled ? 0.3 : 1, display: 'flex' });

// ─── Tracker Detail ─────────────────────────────────────────────────────────────
const TrackerDetail = ({ tracker, trackers, api, onBack, onSwitch, onNew }) => {
  const columns = tracker.columns || [];
  const students = studentsOf(tracker);
  usePageTrail([{ label: tracker.name }]);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [colMenu, setColMenu] = React.useState(null);          // colId | '__new' | null
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [extra, setExtra] = React.useState('');

  // Grid focus / edit state.
  const [focus, setFocus] = React.useState(null);              // { r, c } | null
  const [edit, setEdit] = React.useState(null);                // { r, c, seed } | null
  const cellRefs = React.useRef({});
  const thRefs = React.useRef({});

  // Move focus onto the active cell when navigating (but not while an editor is up).
  React.useEffect(() => {
    if (focus && !edit) {
      const node = cellRefs.current[focus.r + ':' + focus.c];
      if (node && node.focus) node.focus();
    }
  }, [focus, edit]);

  const clampFocus = (r, c) => ({ r: Math.min(Math.max(0, r), students.length - 1), c: Math.min(Math.max(0, c), columns.length - 1) });

  const g = {
    cellRefs,
    hasFocus: !!focus,
    focusCell: (r, c) => { setEdit(null); setFocus({ r, c }); },
    startEdit: (r, c, seed) => { const col = columns[c]; if (!col || col.type === 'checkbox' || col.type === 'rating') return; setFocus({ r, c }); setEdit({ r, c, seed }); },
    cancelEdit: () => { setEdit(null); setFocus(f => f); },
    setValue: (r, c, v) => api.setCell(tracker.id, students[r], columns[c].id, v),
    commit: (r, c, v, dir) => {
      api.setCell(tracker.id, students[r], columns[c].id, v);
      setEdit(null);
      if (dir === 'down') setFocus(clampFocus(r + 1, c));
      else if (dir === 'right') setFocus(clampFocus(r, c + 1));
      else if (dir === 'left') setFocus(clampFocus(r, c - 1));
      else setFocus({ r, c });
    },
    onCellKeyDown: (e, r, c) => {
      if (edit) return;
      const col = columns[c];
      const key = e.key;
      if (key === 'ArrowUp') { e.preventDefault(); setFocus(clampFocus(r - 1, c)); }
      else if (key === 'ArrowDown') { e.preventDefault(); setFocus(clampFocus(r + 1, c)); }
      else if (key === 'ArrowLeft') { e.preventDefault(); setFocus(clampFocus(r, c - 1)); }
      else if (key === 'ArrowRight') { e.preventDefault(); setFocus(clampFocus(r, c + 1)); }
      else if (key === 'Home') { e.preventDefault(); setFocus(clampFocus(r, 0)); }
      else if (key === 'End') { e.preventDefault(); setFocus(clampFocus(r, columns.length - 1)); }
      else if (col && col.type === 'checkbox' && (key === 'Enter' || key === ' ')) { e.preventDefault(); g.setValue(r, c, !(tracker.entries[students[r]] && tracker.entries[students[r]][col.id] === true)); }
      else if (col && col.type === 'rating' && /^[0-5]$/.test(key)) { e.preventDefault(); g.setValue(r, c, key === '0' ? null : Number(key)); }
      else if (key === 'Enter' || key === 'F2') { e.preventDefault(); g.startEdit(r, c); }
      else if ((key === 'Backspace' || key === 'Delete') && col && col.type !== 'checkbox' && col.type !== 'rating') { e.preventDefault(); g.setValue(r, c, col.type === 'text' ? '' : null); }
      else if (col && (col.type === 'score' || col.type === 'text') && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); g.startEdit(r, c, key); }
    },
  };

  const addStudent = () => { const name = extra.trim(); if (!name) return; api.addStudent(tracker.id, name); setExtra(''); };

  const switcherGroups = React.useMemo(() =>
    groupTrackers(trackers, 'class', '').map(sec => ({
      key: sec.key, label: sec.key,
      items: sec.items.map(t => ({ id: t.id, label: t.name, sublabel: trackerKind(t), icon: 'chart' })),
    })), [trackers]);

  const activeCol = colMenu && colMenu !== '__new' ? columns.find(c => c.id === colMenu) : null;
  const colAnchorRef = { current: colMenu ? thRefs.current[colMenu] : null };

  return (
    <div>
      <BackLink onClick={onBack} label="All trackers" />
      {/* Detail header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Combobox value={tracker.id} groups={switcherGroups} onSelect={onSwitch} width={320} icon="chart" ariaLabel="Switch tracker"
          triggerStyle={{ maxWidth: 320 }}
          footer={<Btn variant="primary" icon="plus" small style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNew()}>New tracker</Btn>} />
        <div style={{ flex: 1 }} />
        <span style={{ flexShrink: 0 }}><Badge variant="default">{tracker.classGroup}</Badge></span>
        <span style={{ flexShrink: 0 }}><Badge variant="accent">{students.length} students</Badge></span>
        <Btn variant="secondary" icon="settings" small onClick={() => setSettingsOpen(true)}>Settings</Btn>
        <Btn variant="secondary" icon="download" small onClick={() => api.exportCSV(tracker)}>Export CSV</Btn>
        <RowActionsMenu items={[
          { label: 'Duplicate tracker', icon: 'copy', onClick: () => api.duplicate(tracker.id) },
          { label: 'Delete tracker', icon: 'trash', danger: true, onClick: () => setConfirmDelete(true) },
        ]} />
      </div>

      {tracker.description && <div style={{ fontSize: 13, color: DS.muted, margin: '-6px 4px 14px' }}>{tracker.description}</div>}

      {/* Grid */}
      <div style={{ border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden', background: DS.card, boxShadow: DS.cardShadow }}>
        <div style={{ overflow: 'auto', maxHeight: '62vh' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, position: 'sticky', left: 0, top: 0, zIndex: 3, minWidth: 200, borderRight: `1px solid ${DS.border}` }}>Student</th>
                {columns.map(col => (
                  <th key={col.id} ref={node => { thRefs.current[col.id] = node; }} style={{ ...thBase, position: 'sticky', top: 0, zIndex: 2, minWidth: 132, textAlign: col.type === 'score' ? 'right' : 'left' }}>
                    <button type="button" onClick={() => setColMenu(m => m === col.id ? null : col.id)} title="Edit column"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: DS.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.name}</span>
                      {col.type === 'score' && col.max && !new RegExp('/\\s*' + col.max + '\\s*$').test(col.name) ? <span style={{ color: DS.faint, fontWeight: 500 }}>· /{col.max}</span> : null}
                      {col.countsAsAssessment ? <span title="Counts as an assessment — these marks feed pupils' attainment" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: DS.accent, background: DS.accentLight, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>ASSESSED</span> : null}
                      <Icon name="chevron_d" size={11} color={DS.faint} />
                    </button>
                  </th>
                ))}
                <th style={{ ...thBase, position: 'sticky', top: 0, zIndex: 2, minWidth: 120 }}>
                  <button type="button" ref={node => { thRefs.current['__new'] = node; }} onClick={() => setColMenu('__new')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: DS.accent, fontSize: 12, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                    <Icon name="plus" size={13} color={DS.accent} /> Add column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={columns.length + 2} style={{ padding: '28px 16px', textAlign: 'center', color: DS.muted, fontSize: 13 }}>No students yet — add one below.</td></tr>
              ) : students.map((s, ri) => (
                <tr key={s} style={{ background: DS.bg }}
                  onMouseEnter={e => { e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = td.dataset.sticky ? DS.surfaceHover : DS.surface); }}
                  onMouseLeave={e => { e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = td.dataset.sticky ? DS.bg : 'transparent'); }}>
                  <td data-sticky="1" style={{ position: 'sticky', left: 0, zIndex: 1, background: DS.bg, padding: '6px 14px', borderRight: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s} size={26} />
                      <span style={{ fontSize: 13, color: DS.text, fontWeight: 500, flex: 1, whiteSpace: 'nowrap' }}>{s}</span>
                      {(tracker.extraStudents || []).includes(s) && (
                        <button type="button" onClick={() => api.removeStudent(tracker.id, s)} title="Remove from tracker"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 2, display: 'flex' }}><Icon name="x" size={12} /></button>
                      )}
                    </div>
                  </td>
                  {columns.map((col, ci) => {
                    const f = focus && focus.r === ri && focus.c === ci;
                    return (
                      <td key={col.id} style={{ padding: '3px 8px', borderBottom: `1px solid ${DS.border}` }}>
                        <GridCell col={col} value={tracker.entries[s] && tracker.entries[s][col.id]} r={ri} c={ci}
                          focused={f} editing={!!(edit && edit.r === ri && edit.c === ci)} seed={edit && edit.r === ri && edit.c === ci ? edit.seed : undefined} g={g} />
                      </td>
                    );
                  })}
                  <td style={{ borderBottom: `1px solid ${DS.border}` }} />
                </tr>
              ))}
            </tbody>
            {students.length > 0 && columns.length > 0 && (
              <tfoot>
                <tr>
                  <td data-sticky="1" style={{ position: 'sticky', left: 0, bottom: 0, zIndex: 3, background: DS.surface, padding: '10px 14px', borderRight: `1px solid ${DS.border}`, borderTop: `1px solid ${DS.borderDark}`, fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Summary</td>
                  {columns.map(col => (
                    <td key={col.id} style={{ position: 'sticky', bottom: 0, zIndex: 2, background: DS.surface, padding: '10px 8px', borderTop: `1px solid ${DS.borderDark}`, textAlign: col.type === 'score' ? 'right' : 'left' }}>
                      <ColumnSummaryCell col={col} entries={tracker.entries} students={students} />
                    </td>
                  ))}
                  <td style={{ position: 'sticky', bottom: 0, zIndex: 2, background: DS.surface, borderTop: `1px solid ${DS.borderDark}` }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Add-student row */}
        <div style={{ padding: '11px 14px', borderTop: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', gap: 8, background: DS.bg }}>
          <input value={extra} onChange={e => setExtra(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addStudent(); }}
            placeholder="Add another student to this tracker…"
            style={{ flex: 1, maxWidth: 320, padding: '7px 10px', fontSize: 13, border: `1px solid ${DS.border}`, borderRadius: 7, background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none' }} />
          <Btn variant="secondary" icon="plus" small onClick={addStudent}>Add student</Btn>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: DS.faint }}>Arrow keys to move · Enter to edit · saved locally</span>
        </div>
      </div>

      {/* Column editor popover (shared, anchored to the clicked header) */}
      <ColumnPopover
        open={!!colMenu} anchorRef={colMenu === '__new' ? { current: thRefs.current['__new'] } : colAnchorRef}
        col={activeCol}
        onSave={(data) => { if (colMenu === '__new') api.addColumn(tracker.id, data); else api.updateColumn(tracker.id, colMenu, { ...activeCol, ...data }); setColMenu(null); }}
        onDelete={activeCol ? () => { api.deleteColumn(tracker.id, colMenu); setColMenu(null); } : null}
        onClose={() => setColMenu(null)} />

      {/* Settings slide-over */}
      {settingsOpen && <TrackerSettingsPanel tracker={tracker} api={api} onClose={() => setSettingsOpen(false)} />}

      {/* Delete confirm (second step) */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete tracker?" icon="trash" iconColor={DS.danger} width={440}
        footer={<><Btn variant="secondary" small onClick={() => setConfirmDelete(false)}>Cancel</Btn><Btn variant="danger" small onClick={() => { setConfirmDelete(false); api.remove(tracker.id); }}>Delete tracker</Btn></>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.55 }}>
          Deleting <b style={{ color: DS.text }}>{tracker.name}</b> removes it and all its logged data for {students.length} student{students.length === 1 ? '' : 's'}. This can't be undone.
        </div>
      </Modal>
    </div>
  );
};
const thBase = {
  background: DS.surface, padding: '10px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: `1px solid ${DS.border}`, whiteSpace: 'nowrap',
};

// ─── New-tracker dialog ─────────────────────────────────────────────────────────
const NewTrackerModal = ({ open, template, onClose, onCreate }) => {
  const [name, setName] = React.useState('');
  const [classGroup, setClassGroup] = React.useState((teacherClasses[0] && teacherClasses[0].group) || '');
  const [start, setStart] = React.useState('blank');
  React.useEffect(() => {
    if (open) {
      setName(template ? template.name : '');
      setStart(template ? template.id : 'blank');
      setClassGroup((teacherClasses[0] && teacherClasses[0].group) || '');
    }
  }, [open, template]);

  const startOptions = [{ id: 'blank', label: 'Blank' }, ...STARTER_TEMPLATES.map(t => ({ id: t.id, label: t.name }))];
  const create = () => {
    const tpl = STARTER_TEMPLATES.find(t => t.id === start);
    onCreate({
      name: name.trim() || (tpl ? tpl.name : 'Untitled tracker'),
      description: tpl ? tpl.description : '',
      classGroup,
      columns: tpl ? tpl.columns : [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New tracker" subtitle="Create a custom grid for this class" icon="chart" width={480}
      footer={<><Btn variant="secondary" small onClick={onClose}>Cancel</Btn><Btn variant="primary" small onClick={create}>Create tracker</Btn></>}>
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Homework scores" autoFocus /></Field>
      <Field label="Class / group">
        <Select value={classGroup} onChange={e => setClassGroup(e.target.value)}>
          {teacherClasses.map(c => <option key={c.id} value={c.group}>{c.group}</option>)}
        </Select>
      </Field>
      <Field label="Start from" hint="Templates add a few starter columns you can change later." style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {startOptions.map(o => {
            const on = start === o.id;
            return (
              <button key={o.id} type="button" onClick={() => setStart(o.id)}
                style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: on ? 600 : 500, border: `1px solid ${on ? DS.accent : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.sub }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>
    </Modal>
  );
};

// ─── Tracking Page (owns state; hosts Hub ⇄ Detail) ─────────────────────────────
// D1: opening Tracking always lands on the Hub. The Hub/Detail split is internal
// state on this one page — no new page id is introduced.
const TeacherTrackingPage = () => {
  const [trackers, setTrackers] = React.useState(loadTrackers);
  const [recents, setRecents] = React.useState(loadRecents);
  const [view, setView] = React.useState('hub');              // 'hub' | 'detail'
  const [activeId, setActiveId] = React.useState(null);
  const [newModal, setNewModal] = React.useState(null);       // { template } | null

  React.useEffect(() => { saveTrackers(trackers); }, [trackers]);

  const active = trackers.find(t => t.id === activeId);

  // Every content mutation stamps updatedAt; pinning deliberately does not.
  const touch = (id, mut) => setTrackers(prev => prev.map(t => t.id === id ? { ...mut(t), updatedAt: Date.now() } : t));

  const openTracker = (id) => { setActiveId(id); setView('detail'); setRecents(pushRecent(id)); };
  const backToHub = () => setView('hub');

  const createTracker = ({ name, description, classGroup, columns }) => {
    const t = {
      id: newId('t'), name, description: description || '',
      classGroup: classGroup || (teacherClasses[0] && teacherClasses[0].group) || '',
      columns: (columns || []).map(c => ({ ...c, id: newId('c') })),
      entries: {}, extraStudents: [], pinned: false, updatedAt: Date.now(),
    };
    setTrackers(prev => [...prev, t]);
    setNewModal(null);
    openTracker(t.id);
  };

  const api = {
    saveSettings: (id, data) => touch(id, t => ({ ...t, ...data })),
    togglePin: (id) => setTrackers(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t)),
    duplicate: (id) => {
      const src = trackers.find(t => t.id === id); if (!src) return;
      const copy = { ...src, id: newId('t'), name: `${src.name} (copy)`, pinned: false, updatedAt: Date.now(), entries: JSON.parse(JSON.stringify(src.entries || {})), extraStudents: [...(src.extraStudents || [])] };
      setTrackers(prev => [...prev, copy]);
      openTracker(copy.id);
    },
    remove: (id) => setTrackers(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeId === id) { setActiveId(null); setView('hub'); }
      return next;
    }),
    addColumn: (id, col) => touch(id, t => ({ ...t, columns: [...t.columns, { ...col, id: newId('c') }] })),
    updateColumn: (id, colId, col) => touch(id, t => ({ ...t, columns: t.columns.map(c => c.id === colId ? { ...col, id: colId } : c) })),
    deleteColumn: (id, colId) => touch(id, t => {
      const entries = {};
      Object.keys(t.entries || {}).forEach(s => { const row = { ...t.entries[s] }; delete row[colId]; entries[s] = row; });
      return { ...t, columns: t.columns.filter(c => c.id !== colId), entries };
    }),
    moveColumn: (id, colId, dir) => touch(id, t => {
      const cols = [...t.columns]; const i = cols.findIndex(c => c.id === colId); const j = i + dir;
      if (i < 0 || j < 0 || j >= cols.length) return t;
      [cols[i], cols[j]] = [cols[j], cols[i]];
      return { ...t, columns: cols };
    }),
    setCell: (id, student, colId, value) => touch(id, t => ({ ...t, entries: { ...t.entries, [student]: { ...(t.entries[student] || {}), [colId]: value } } })),
    addStudent: (id, name) => touch(id, t => {
      const list = t.extraStudents || [];
      if (list.includes(name) || getRosterForGroup(t.classGroup).includes(name)) return t;
      return { ...t, extraStudents: [...list, name], entries: { ...t.entries, [name]: t.entries[name] || {} } };
    }),
    removeStudent: (id, student) => touch(id, t => {
      const e = { ...t.entries }; delete e[student];
      return { ...t, entries: e, extraStudents: (t.extraStudents || []).filter(s => s !== student) };
    }),
    exportCSV: (t) => {
      const students = studentsOf(t);
      const esc = (s) => { const v = s == null ? '' : String(s); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
      const header = ['Student', ...t.columns.map(c => c.name)];
      const rows = students.map(s => [s, ...t.columns.map(c => {
        const v = t.entries[s] && t.entries[s][c.id];
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return v == null ? '' : v;
      })]);
      const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
      // Export of children's data → audit entry (AADC data-minimisation: tracker
      // columns only, no contact/DOB/address).
      if (window.klasioAudit) window.klasioAudit('export_csv', `tracker:${t.name}`, { rows: rows.length, scope: 'teacher' });
      try {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${t.name.replace(/[^a-z0-9]+/gi, '_')}.csv`; a.click();
        URL.revokeObjectURL(url);
      } catch (e) {}
    },
  };

  const showDetail = view === 'detail' && active;

  return (
    <div style={pageFrame()}>
      {!showDetail && (
        <PageHeader title="Tracking" subtitle="Custom trackers for homework, tests, behaviour — anything you log per student" />
      )}

      {showDetail ? (
        <TrackerDetail
          tracker={active} trackers={trackers} api={api}
          onBack={backToHub} onSwitch={openTracker} onNew={() => setNewModal({})} />
      ) : (
        <TrackerHub
          trackers={trackers} recents={recents}
          onOpen={openTracker} onTogglePin={api.togglePin}
          onNew={() => setNewModal({})} onNewFromTemplate={(tpl) => setNewModal({ template: tpl })} />
      )}

      <NewTrackerModal open={!!newModal} template={newModal && newModal.template} onClose={() => setNewModal(null)} onCreate={createTracker} />
    </div>
  );
};

// ─── Teacher Students Page ──────────────────────────────────────────────────────
// The teacher's own slice of the centre roster: only students enrolled in a class
// this teacher teaches (store.classes.filter(c => c.teacher === me.name) → classIds
// → store.students). Read-only — the admin owns enrolment; the teacher views and
// messages from here. Mirrors AdminStudentsPage's list + detail-drawer pattern but
// scoped to "my" classes, with an extra per-class filter. `me` is resolved the same
// way as TeacherTimetablePage (Heebz A, falling back to the first teacher).
const TeacherStudentsPage = () => {
  const store = useAdminStore();
  const me = store.teachers.find(t => t.name === 'Heebz A') || store.teachers[0];
  // ONE at-risk rule (F2/D5): the same shared selector the Dashboard's "needing
  // attention" uses, so the counts match exactly. Falls back to the stored flag
  // only if the metrics layer hasn't loaded.
  const TM = window.teacherMetrics;
  const atRisk = s => TM ? TM.isAtRisk(s) : s.status === 'at-risk';
  const atRiskReason = s => TM ? TM.atRiskReason(s) : (s.status === 'at-risk' ? 'Flagged by staff' : null);

  const [search, setSearch]     = React.useState('');
  const [status, setStatus]     = React.useState('all');
  const [classId, setClassId]   = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  // My classes (read-only, assigned by the admin) and their ids used to scope students.
  const myClasses = React.useMemo(
    () => store.classes.filter(c => me && c.teacher === me.name),
    [store.classes, me && me.name]
  );
  const myClassIds = React.useMemo(() => new Set(myClasses.map(c => c.id)), [myClasses]);
  const classesOf = s => myClasses.filter(c => (s.classIds || []).includes(c.id));

  // Only students in at least one of my classes.
  const myStudents = React.useMemo(
    () => store.students.filter(s => (s.classIds || []).some(id => myClassIds.has(id))),
    [store.students, myClassIds]
  );

  const filtered = myStudents.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = studentName(s).toLowerCase().includes(q) ||
      (s.subjects || []).some(sub => sub.toLowerCase().includes(q));
    const risk = atRisk(s);
    const matchStatus = status === 'all' ? true
      : status === 'at-risk' ? risk
      : status === 'active'  ? !risk
      : status === s.status;
    const matchClass  = classId === 'all' || (s.classIds || []).includes(classId);
    return matchSearch && matchStatus && matchClass;
  });

  // Keep the open drawer pointed at the live record (it may update underneath).
  const sel = selected && myStudents.find(s => s.id === selected.id);

  // Export of children's data → write an audit entry (server-enforced audit table
  // later). AADC data-minimisation: default columns are the non-sensitive academic
  // fields only — no guardian contact, DOB or address in the default export.
  const exportCsv = () => {
    const cols = ['Name', 'Year', 'Attendance %', 'HW %', 'Attainment %', 'Status'];
    const lines = [cols.join(',')].concat(filtered.map(s => [
      studentName(s), s.year, s.attendance, s.hw, window.studentAttainment(s) ?? '', atRisk(s) ? 'At risk' : 'Active',
    ].join(',')));
    if (window.klasioAudit) window.klasioAudit('export_csv', 'my-students', { count: filtered.length, scope: 'teacher' });
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'my-students.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {}
  };

  const classChip = c => (
    <span key={c.id} title={`${c.group} · ${c.day} ${c.time}`} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'2px 7px', background:subjectColor(c.name)+'14', color:subjectColor(c.name), borderRadius:5, fontWeight:600 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:subjectColor(c.name) }} />{c.name}
    </span>
  );

  if (!myStudents.length) {
    return (
      <div style={pageFrame()}>
        <PageHeader title="My Students" subtitle="Students enrolled in your classes" />
        <Card>
          <EmptyState icon="users" title="No students yet"
            message="When your centre admin enrols students into the classes you teach, they'll appear here." />
        </Card>
      </div>
    );
  }

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="My Students"
        subtitle={`${myStudents.length} across your ${myClasses.length} class${myClasses.length===1?'':'es'} · ${myStudents.filter(atRisk).length} at risk`}
        actions={[<Btn key="export" variant="secondary" icon="download" small onClick={exportCsv}>Export CSV</Btn>]}
      />

      {/* Filters — search · status · which of my classes */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or subject…" />
        <Segmented value={status} onChange={setStatus} options={[
          { id:'all', label:'All', count:myStudents.length },
          { id:'active', label:'Active', count:myStudents.filter(s=>!atRisk(s)).length },
          { id:'at-risk', label:'At risk', count:myStudents.filter(atRisk).length },
        ]} />
        <Select value={classId} onChange={e => setClassId(e.target.value)} style={{ maxWidth:220 }}>
          <option value="all">All my classes</option>
          {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: sel ? '1fr 360px' : '1fr', gap:20 }}>
        <Card>
          <Table
            cols={['Student','Year','My Classes','Attendance','HW %','Attainment','Status',{ label:'', align:'right' }]}
            rows={filtered.map(s => [
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span onClick={() => setSelected(sel && sel.id === s.id ? null : s)} style={{ fontSize:13, fontWeight:600, color:DS.text, cursor:'pointer' }}>{studentName(s)}</span>
                <span style={{ fontSize:11.5, color:DS.faint }}>Last seen {s.lastSeen || '—'}</span>
              </div>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{classesOf(s).map(classChip)}</div>,
              <span style={{ fontSize:13, fontWeight:600, color: s.attendance < 80 ? DS.danger : s.attendance < 90 ? DS.warning : DS.success }}>{s.attendance}%</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.hw < 50 ? DS.danger : s.hw < 70 ? DS.warning : DS.success }}>{s.hw}%</span>,
              <ScorePill score={window.studentAttainment(s)} />,
              <StatusPill status={atRisk(s) ? 'At risk' : 'Active'} />,
              <Btn variant="secondary" small onClick={() => setSelected(sel && sel.id === s.id ? null : s)}>View</Btn>,
            ])}
          />
        </Card>

        {sel && (
          <Card title={studentName(sel)} actions={[
            <button key="x" onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:DS.muted }}><Icon name="x" size={16} /></button>
          ]}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                <Avatar name={studentName(sel)} size={44} />
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:DS.text }}>{studentName(sel)}</div>
                  <div style={{ fontSize:13, color:DS.muted }}>{sel.year} · {atRisk(sel) ? `⚠ At risk — ${atRiskReason(sel)}` : 'Active'}</div>
                </div>
              </div>

              <div style={{ fontSize:11, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>In your classes</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>{classesOf(sel).map(classChip)}</div>

              {[
                ['Subjects', (sel.subjects || []).join(', ') || '—'],
                ['Attendance', `${sel.attendance}%`],
                ['HW completion', `${sel.hw}%`],
                ['Attainment', window.studentAttainment(sel) == null ? 'No results yet' : `${window.studentAttainment(sel)}%`],
                ['Guardian', sel.guardianName || '—'],
                ['Last seen', sel.lastSeen || '—'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
                  <span style={{ color:DS.muted }}>{l}</span>
                  <span style={{ color:DS.text, fontWeight:500, textAlign:'right', maxWidth:180 }}>{v}</span>
                </div>
              ))}

              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
                <Btn variant="primary" icon="user" onClick={() => { window.__adminParam = sel.id; window.__navigate && window.__navigate('teacher', 'student_profile'); }}>View full profile</Btn>
                <Btn variant="secondary" icon="message" onClick={() => window.__navigate && window.__navigate('teacher', 'comms:messages')}>Message</Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────────
const TeacherPages = ({ page, plannerArgs, section }) => {
  if (page === 'classes')        return <TeacherClassesPage />;
  if (page === 'class_detail')   return <TeacherClassDetailPage />;
  if (page === 'students')       return <TeacherStudentsPage />;
  if (page === 'timetable')      return <TeacherTimetablePage />;
  if (page === 'homework')       return <TeacherHomework section={section} />;
  if (page === 'progress')       return <TeacherProgressPage />;
  if (page === 'attendance')     return <TeacherAttendancePage />;
  if (page === 'timesheet')      return window.TeacherTimesheetPage ? <window.TeacherTimesheetPage /> : null;
  if (page === 'tracking')       return <TeacherTrackingPage />;
  if (page === 'reports')        return <TeacherReports />;
  if (page === 'lesson_planner') return <LessonPlannerPage
    key={plannerArgs ? plannerArgs.at : 'browse'}
    initialClassId={plannerArgs && plannerArgs.classId}
    initialDate={plannerArgs && plannerArgs.date}
    initialMode={plannerArgs && plannerArgs.mode}
  />;
  return null;
};

Object.assign(window, { TeacherPages });
