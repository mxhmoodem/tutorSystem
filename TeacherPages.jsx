// ══════════════════════════════════════════════════════════════
//  TutorOS — Extra Teacher Pages
// ══════════════════════════════════════════════════════════════

// Mock data (teacherClasses, homeworkFull, teacherAllClasses,
// DEFAULT_TRACKERS) lives in mocks/teacherPages.mock.jsx, loaded before this
// file in index.html. The Reports page is provided by Reports.jsx
// (window.TeacherReports).

// ─── Classes Page ───────────────────────────────────────────────────────────────
const TeacherClassesPage = () => {
  const [expandedClass, setExpandedClass] = React.useState(null);

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="My Classes"
        subtitle={`${teacherClasses.length} active classes · ${teacherClasses.reduce((s,c)=>s+c.students,0)} students total`}
        actions={[<Btn key="a" variant="primary" icon="plus" small>Schedule Class</Btn>]}
      />

      <Card>
        <div style={{ overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${DS.border}`, background:DS.surface }}>
                {['Class','Next Session','Students','Avg Score','Attendance','Homework',''].map((h, i) => (
                  <th key={i} style={{
                    padding:'10px 16px', textAlign: i >= 2 && i <= 5 ? 'center' : 'left',
                    fontSize:11, fontWeight:600, color:DS.muted,
                    textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teacherClasses.map(cls => {
                const isOpen = expandedClass === cls.id;
                const scoreColor = cls.avgScore > 80 ? DS.success : DS.warning;
                const attColor   = cls.attendance > 90 ? DS.success : DS.warning;
                return (
                  <React.Fragment key={cls.id}>
                    <tr
                      style={{ borderBottom: isOpen ? 'none' : `1px solid ${DS.border}`, cursor:'pointer', background: isOpen ? DS.surface : 'transparent' }}
                      onClick={() => setExpandedClass(isOpen ? null : cls.id)}
                    >
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:4, alignSelf:'stretch', minHeight:34, borderRadius:2, background:cls.color, flexShrink:0 }} />
                          <Icon name={isOpen ? 'chevron_d' : 'chevron_r'} size={14} color={DS.faint} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{cls.name}</div>
                            <div style={{ fontSize:12, color:DS.muted, marginTop:1 }}>{cls.group}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <Icon name="clock" size={12} color={DS.faint} />
                          <span style={{ fontSize:13, color:DS.sub }}>{cls.nextSession}</span>
                        </div>
                        <div style={{ fontSize:12, color:DS.muted, marginTop:2, marginLeft:18 }}>{cls.room}</div>
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'center', fontSize:13, fontWeight:600, color:DS.text }}>{cls.students}</td>
                      <td style={{ padding:'12px 16px', textAlign:'center', fontSize:13, fontWeight:600, color:scoreColor }}>{cls.avgScore}%</td>
                      <td style={{ padding:'12px 16px', textAlign:'center', fontSize:13, fontWeight:600, color:attColor }}>{cls.attendance}%</td>
                      <td style={{ padding:'12px 16px', textAlign:'center' }}>
                        {cls.hwPending > 0
                          ? <Badge variant="warning">{cls.hwPending} to mark</Badge>
                          : <span style={{ fontSize:12, color:DS.faint }}>—</span>}
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'right', whiteSpace:'nowrap' }} onClick={e => e.stopPropagation()}>
                        <Btn variant="primary" small>Take Attendance</Btn>
                      </td>
                    </tr>

                    {/* Student list expand */}
                    {isOpen && (
                      <tr style={{ borderBottom:`1px solid ${DS.border}` }}>
                        <td colSpan={7} style={{ padding:0, background:DS.surface }}>
                          <div style={{ padding:'10px 16px 10px 36px' }}>
                            <span style={{ fontSize:11, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                              Student List · {cls.studentList.length}
                            </span>
                          </div>
                          {cls.studentList.map((name, i) => (
                            <div key={name} style={{
                              display:'flex', alignItems:'center', gap:12, padding:'8px 16px 8px 36px',
                              borderTop:`1px solid ${DS.border}`, background:DS.bg,
                            }}>
                              <Avatar name={name} size={28} />
                              <span style={{ flex:1, fontSize:13, color:DS.sub }}>{name}</span>
                              <Sparkline data={[70,72,74,71,76,78,79,80].map(v => v + Math.round(Math.random()*10-5))} color={cls.color} width={60} height={22} />
                              <Btn variant="ghost" icon="eye" small>Profile</Btn>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Full Homework Management ───────────────────────────────────────────────────
const TeacherHomeworkPage = () => {
  const [tab, setTab] = React.useState('all');
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newHw, setNewHw] = React.useState({ title:'', class:'', due:'', instructions:'' });
  const [saved, setSaved] = React.useState(false);

  // Map data to "active / marking / closed" tabs visible in card grid
  const filtered = homeworkFull.filter(h =>
    tab === 'all'      ? true :
    tab === 'marking'  ? h.status === 'marking' :
    tab === 'open'     ? h.status === 'open' :
    h.status === 'complete'
  );

  const stats = {
    active:    homeworkFull.filter(h => h.status !== 'complete').length,
    marking:   homeworkFull.filter(h => h.status === 'marking').length,
    drafts:    0,
    rate:      Math.round(homeworkFull.reduce((s,h) => s + h.submitted, 0) / homeworkFull.reduce((s,h) => s + h.total, 0) * 100),
  };

  const handleSave = () => {
    setSaved(true);
    setShowNewForm(false);
    setNewHw({ title:'', class:'', due:'', instructions:'' });
    setTimeout(() => setSaved(false), 3000);
  };

  // Subject colour for the card's left stripe
  const subjectColor = (subj) =>
    subj.includes('A-Level') ? '#7C3AED' :
    subj.includes('Physics') ? '#0891B2' :
    DS.accent;

  return (
    <div style={{ padding:'32px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:DS.muted, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>
        Spring Term · Week 8
      </div>
      <PageHeader
        title="Homework"
        subtitle={`${homeworkFull.length} assignments · ${stats.marking} awaiting your review`}
        actions={[
          saved && <Badge key="s" variant="success">Assignment set!</Badge>,
          <Btn key="new" variant="primary" icon="plus" small onClick={() => setShowNewForm(!showNewForm)}>
            Set Homework
          </Btn>,
        ].filter(Boolean)}
      />

      {/* KPI stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24 }}>
        {[
          ['Active',          stats.active,  DS.success],
          ['Awaiting Marking',stats.marking, DS.warning],
          ['Drafts',          stats.drafts,  DS.muted   ],
          ['Submission Rate', stats.rate+'%',DS.accent  ],
        ].map(([l,v,c]) => (
          <div key={l} style={{
            background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:10,
            padding:'16px 20px',
          }}>
            <div style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:28, fontWeight:800, color:c, letterSpacing:'-0.5px', lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* New homework form */}
      {showNewForm && (
        <div style={{
          background:DS.accentLight, border:`1px solid ${DS.accentBorder}`,
          borderRadius:10, padding:'24px', marginBottom:24,
        }}>
          <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:16 }}>New Assignment</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Title</label>
              <input
                value={newHw.title}
                onChange={e => setNewHw(p => ({ ...p, title:e.target.value }))}
                placeholder="e.g. Algebra: Completing the Square"
                style={{ width:'100%', padding:'8px 12px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Class</label>
              <select
                value={newHw.class}
                onChange={e => setNewHw(p => ({ ...p, class:e.target.value }))}
                style={{ width:'100%', padding:'8px 12px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', background:DS.bg, boxSizing:'border-box' }}
              >
                <option value="">Select class…</option>
                {teacherClasses.map(c => <option key={c.id} value={c.group}>{c.group}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Due date</label>
              <input
                type="date"
                value={newHw.due}
                onChange={e => setNewHw(p => ({ ...p, due:e.target.value }))}
                style={{ width:'100%', padding:'8px 12px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Instructions for students</label>
            <textarea
              rows={3}
              value={newHw.instructions}
              onChange={e => setNewHw(p => ({ ...p, instructions:e.target.value }))}
              placeholder="Describe the task, which questions to complete, any resources to use…"
              style={{ width:'100%', padding:'8px 12px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
            />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" icon="check" onClick={handleSave}>Set Assignment</Btn>
            <Btn variant="secondary" onClick={() => setShowNewForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${DS.border}`, marginBottom:20 }}>
        {[
          ['all',     'All',       homeworkFull.length],
          ['marking', 'To Mark',   stats.marking],
          ['open',    'Open',      homeworkFull.filter(h=>h.status==='open').length],
          ['complete','Closed',    homeworkFull.filter(h=>h.status==='complete').length],
        ].map(([id,label,count]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:14, fontWeight: tab===id ? 600 : 400,
            color: tab===id ? DS.accent : DS.muted,
            borderBottom:`2px solid ${tab===id ? DS.accent : 'transparent'}`,
            marginBottom:-1, display:'flex', alignItems:'center', gap:7,
          }}>
            {label}
            <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:10, background:DS.surface, color:DS.muted }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Assignment card grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
        {filtered.map(hw => {
          const color = subjectColor(hw.subject);
          const pct = (hw.submitted / hw.total) * 100;
          const toMark = hw.submitted - hw.marked;
          return (
            <div key={hw.id} style={{
              background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:10,
              padding:'18px 20px', borderTop:`3px solid ${color}`,
              display:'flex', flexDirection:'column', gap:14,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:3, lineHeight:1.3 }}>{hw.title}</div>
                  <div style={{ fontSize:12, color:DS.muted }}>{hw.subject} · {hw.class}</div>
                </div>
                {toMark > 0 && hw.status === 'marking' && (
                  <Badge variant="warning">{toMark} to mark</Badge>
                )}
                {hw.status === 'complete' && <Badge variant="success">Closed</Badge>}
              </div>

              <div style={{ fontSize:12, color:DS.muted }}>Due {hw.due}</div>

              {/* Progress */}
              <div>
                <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ width:`${pct}%`, height:'100%', background: pct===100 ? DS.success : color, borderRadius:3 }} />
                </div>
                <div style={{ fontSize:11, color:DS.muted, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                  {hw.submitted}/{hw.total} submitted
                </div>
              </div>

              {/* Action */}
              {hw.status === 'marking' && (
                <Btn variant="primary" small>Mark Submissions</Btn>
              )}
              {hw.status === 'open' && (
                <Btn variant="secondary" small>View Submissions</Btn>
              )}
              {hw.status === 'complete' && hw.avgScore && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:DS.muted }}>Class avg</span>
                  <ScorePill score={hw.avgScore} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Progress Overview ───────────────────────────────────────────────────────
const TeacherProgressPage = () => {
  const [activeClass, setActiveClass] = React.useState(teacherClasses[0]);

  const mockScores = {
    1: [76,79,74,81,83,80,82,84],
    2: [69,71,68,72,73,70,74,76],
    3: [85,87,88,90,91,88,92,94],
    4: [75,77,76,79,80,78,81,83],
  };

  const labels = ['4 Mar','11 Mar','18 Mar','25 Mar','1 Apr','8 Apr','15 Apr','22 Apr'];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Student Progress" subtitle="Track score trends and identify students who need support" actions={[
        <Btn key="r" variant="secondary" icon="download" small>Export Report</Btn>
      ]} />

      {/* Class tabs */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
        {teacherClasses.map(cls => (
          <button key={cls.id} onClick={() => setActiveClass(cls)} style={{
            padding:'8px 16px', borderRadius:20, border:`1px solid ${activeClass.id===cls.id ? cls.color : DS.border}`,
            background: activeClass.id===cls.id ? cls.color+'18' : DS.bg,
            color: activeClass.id===cls.id ? cls.color : DS.muted,
            fontSize:13, fontWeight: activeClass.id===cls.id ? 600 : 400, cursor:'pointer',
          }}>{cls.group}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        <div>
          <Card title={`Class Trend — ${activeClass.group}`} style={{ marginBottom:20 }} actions={[
            <Badge key="b" variant="default">Last 8 assessments</Badge>
          ]}>
            <div style={{ padding:'16px 20px 8px' }}>
              <LineChart
                labels={labels}
                series={[{ label:'Class avg', data:mockScores[activeClass.id] || mockScores[1], color:activeClass.color }]}
                height={200}
              />
            </div>
          </Card>

          <Card title="Student Breakdown">
            <div>
              {activeClass.studentList.map((name, i) => {
                const base = mockScores[activeClass.id][mockScores[activeClass.id].length-1];
                const offset = (i % 5) - 2;
                const score = Math.max(45, Math.min(99, base + offset * 5));
                const trend = offset >= 0 ? 'up' : 'down';
                return (
                  <div key={name} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                    borderBottom: i < activeClass.studentList.length-1 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <Avatar name={name} size={30} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{name}</div>
                    </div>
                    <Sparkline
                      data={mockScores[activeClass.id].map((v,j) => Math.max(45, v + (j % 3 - 1) * 3 + offset * 2))}
                      color={trend==='up' ? DS.success : DS.danger}
                      width={70} height={24}
                    />
                    <ScorePill score={score} />
                    <Icon name={trend==='up' ? 'trending_up' : 'trending_dn'} size={14} color={trend==='up' ? DS.success : DS.danger} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card title="Class Summary">
            <div style={{ padding:'16px' }}>
              {[
                ['Students',    activeClass.students],
                ['Avg Score',   activeClass.avgScore + '%'],
                ['Attendance',  activeClass.attendance + '%'],
                ['HW to mark',  activeClass.hwPending],
                ['Next session',activeClass.nextSession],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
                  <span style={{ color:DS.muted }}>{l}</span>
                  <span style={{ color:DS.text, fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Grade Distribution">
            <div style={{ padding:'16px' }}>
              {[['A* / A', 2, DS.success],['B', 3, DS.accent],['C', 2, DS.warning],['D / U', 1, DS.danger]].map(([g,n,c]) => (
                <div key={g} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, color:DS.sub }}>{g}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:c }}>{n} students</span>
                  </div>
                  <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${(n/activeClass.students)*100}%`, height:'100%', background:c, borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Teacher Timetable Page ─────────────────────────────────────────────────────

// The teacher's own slice of the centre timetable. It is NOT editable here — the
// admin owns class creation and assignment (store.classes). This page just reads
// store.classes.filter(c => c.teacher === me) and presents today's sessions plus
// the weekly grid, with a "Take register" jump into the attendance page per session.
// Shares the date/time/colour helpers + useAdminStore defined in AdminPages.jsx.
const TeacherTimetablePage = () => {
  const store = useAdminStore();
  const me = store.teachers.find(t => t.name === 'Sarah Clarke') || store.teachers[0];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const todayName = new Date().toLocaleDateString('en-GB', { weekday:'long' });

  const myClasses = store.classes.filter(c => me && c.teacher === me.name && c.status !== 'paused');
  const byTime = arr => [...arr].sort((a, b) => startTimeOf(a.time).localeCompare(startTimeOf(b.time)));
  const todaySessions = byTime(myClasses.filter(c => c.day === todayName));

  // If nothing on today, surface the teacher's next teaching day instead so the
  // register flow is still reachable from the top of the page.
  const fromToday = days.slice(days.indexOf(todayName) >= 0 ? days.indexOf(todayName) : 0).concat(days);
  const nextDay = todaySessions.length ? todayName : fromToday.find(d => myClasses.some(c => c.day === d)) || null;
  const focusDay = todaySessions.length ? todayName : nextDay;
  const focusSessions = byTime(myClasses.filter(c => c.day === focusDay));

  // Jump to the attendance page with this session's group pre-selected.
  const takeRegister = (cls) => {
    window.__registerGroup = cls.group;
    if (window.__navigate) window.__navigate('teacher', 'attendance');
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Timetable" subtitle={`${myClasses.length} weekly sessions · assigned by your centre admin`} actions={[
        <Btn key="att" variant="secondary" icon="check" small onClick={() => window.__navigate && window.__navigate('teacher', 'attendance')}>Attendance</Btn>,
      ]} />

      {/* How this works */}
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'14px 16px', marginBottom:24, background:DS.surface, border:`1px solid ${DS.cardBorder}`, borderRadius:10 }}>
        <Icon name="clock" size={18} color={DS.muted} />
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.5 }}>
          Your centre admin creates each class and assigns you to it, which sets the day, time and room you see below — so this
          timetable is <strong style={{ color:DS.text }}>read-only</strong>. What you do here is <strong style={{ color:DS.text }}>take the register</strong> for
          each session and <strong style={{ color:DS.text }}>log your own attendance or absence</strong>. Need a change? Ask your admin to edit the class.
        </div>
      </div>

      {/* Today (or next teaching day) */}
      <Card
        title={todaySessions.length ? `Today — ${todayName}` : focusDay ? `Next teaching day — ${focusDay}` : `Today — ${todayName}`}
        style={{ marginBottom:24 }}
        actions={<span style={{ fontSize:12, color:DS.muted }}>{focusSessions.length} session{focusSessions.length===1?'':'s'}</span>}
      >
        {focusSessions.length ? (
          <div style={{ padding:'8px 0' }}>
            {focusSessions.map((c, i) => {
              const color = subjectColor(c.name);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < focusSessions.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                  <div style={{ width:60, textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{startTimeOf(c.time)}</div>
                    <div style={{ fontSize:11, color:DS.faint }}>{(c.time||'').split(/[–-]/)[1]?.trim()}</div>
                  </div>
                  <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background:color }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{c.name}</div>
                    <div style={{ fontSize:12, color:DS.muted }}>{c.group} · {c.room || 'No room'} · {c.students} students</div>
                  </div>
                  <Btn variant="primary" icon="check" small onClick={() => takeRegister(c)}>Take register</Btn>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon="calendar" title="No classes assigned yet" message="Once your centre admin assigns you to a class, your sessions will appear here." />}
      </Card>

      {/* Weekly grid */}
      <Card title="This Week">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)' }}>
          {days.map((day, di) => {
            const sessions = byTime(myClasses.filter(c => c.day === day));
            const isToday = day === todayName;
            return (
              <div key={day} style={{ borderLeft: di ? `1px solid ${DS.border}` : 'none', minHeight:200 }}>
                <div style={{ padding:'12px 14px', borderBottom:`1px solid ${DS.border}`, background: isToday ? DS.accentLight : DS.surface }}>
                  <div style={{ fontSize:13, fontWeight:600, color: isToday ? DS.accent : DS.text }}>{day}</div>
                  <div style={{ fontSize:11, color: isToday ? DS.accent : DS.faint }}>{sessions.length} session{sessions.length===1?'':'s'}</div>
                </div>
                <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8 }}>
                  {sessions.map(c => {
                    const color = subjectColor(c.name);
                    return (
                      <button key={c.id} onClick={() => takeRegister(c)} title="Take register" style={{
                        textAlign:'left', background:color+'12', border:`1px solid ${color}44`, borderRadius:8,
                        padding:'9px 10px', cursor:'pointer',
                      }}>
                        <div style={{ fontSize:11.5, fontWeight:700, color, fontVariantNumeric:'tabular-nums', marginBottom:3 }}>{startTimeOf(c.time)}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:DS.text, lineHeight:1.3 }}>{c.name.replace(/^(GCSE|A-Level)\s/, '')}</div>
                        <div style={{ fontSize:10.5, color:DS.muted, marginTop:2 }}>{c.group.replace(/\s*–.*$/, '')} · {c.room || '—'}</div>
                      </button>
                    );
                  })}
                  {!sessions.length && <div style={{ fontSize:11, color:DS.faint, textAlign:'center', padding:'12px 0' }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ─── Teacher Attendance Page ────────────────────────────────────────────────────

// Teacher self check-in. Writes to the shared admin store so the centre admin
// sees the same attendance record on the Teachers page. Demo teacher = Sarah Clarke.
const MyAttendanceCard = () => {
  const store = useAdminStore();
  const me = store.teachers.find(t => t.name === 'Sarah Clarke') || store.teachers[0];
  if (!me) return null;
  const days = recentWeekdays(5);
  const today = todayISO();
  const todayVal = store.attendance[`${me.id}|${today}`] || null;

  return (
    <Card title="My Attendance" actions={<span style={{ fontSize:12, color:DS.muted }}>Check yourself in for today</span>} style={{ marginBottom:24 }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16, borderBottom:`1px solid ${DS.border}` }}>
        <Avatar name={me.name} size={40} color={me.color} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{me.name}</div>
          <div style={{ fontSize:12, color:DS.muted }}>{fmtDay(today)}</div>
        </div>
        <AttendanceToggle value={todayVal} onSet={val => store.setAttendance(me.id, today, val)} />
      </div>
      <div style={{ display:'flex', gap:8, padding:'12px 20px', flexWrap:'wrap' }}>
        {days.slice(1).map(d => {
          const v = store.attendance[`${me.id}|${d}`] || 'present';
          const m = ({ present:DS.success, late:DS.warning, absent:DS.danger })[v];
          return (
            <div key={d} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:DS.muted }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:m }} />{fmtDay(d)}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const TeacherAttendancePage = () => {
  // If we arrived via "Take register" on the timetable, open that class.
  const [selectedClass, setSelectedClass] = React.useState(() => {
    const g = window.__registerGroup;
    const i = g ? teacherAllClasses.findIndex(c => c.group === g) : -1;
    return i >= 0 ? i : 0;
  });
  React.useEffect(() => { window.__registerGroup = null; }, []);
  const cls = teacherAllClasses[selectedClass];
  const [records, setRecords] = React.useState(() =>
    Object.fromEntries(cls.students.map(n => [n, null]))
  );
  const [saved, setSaved] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(() => window.tsTodayISO ? window.tsTodayISO() : new Date().toISOString().slice(0, 10));

  // Resolve the scheduled session behind this register so working-time capture can
  // pre-fill its duration from the centre timetable (store.classes is the source of
  // truth — see schedule-timetable architecture). teacherAllClasses groups match
  // Sarah's store classes c1–c4; a no-match (e.g. Yr13) falls back to 90 min.
  const adminStore = useAdminStore();
  const me = adminStore.teachers.find(t => t.name === 'Sarah Clarke') || adminStore.teachers[0];
  const matchedClass = adminStore.classes.find(c => me && c.teacher === me.name && c.group === cls.group);
  const scheduledMinutes = window.tsSessionMinutes ? window.tsSessionMinutes(matchedClass && matchedClass.time) : 90;
  const classId = matchedClass ? matchedClass.id : `tc${selectedClass}`;
  const session = {
    sessionId: `${classId}|${selectedDate}`, classId, teacherId: me && me.id,
    centreId: window.TIMESHEET_CENTRE || 'centre-001', date: selectedDate,
    scheduledMinutes, label: `${cls.group} · ${cls.subject}`,
  };
  // Which session's register has been confirmed (drives working-time capture).
  const [registeredSession, setRegisteredSession] = React.useState(null);
  const registered = registeredSession === session.sessionId;
  const Capture = window.TimesheetCapture;

  React.useEffect(() => {
    setRecords(Object.fromEntries(cls.students.map(n => [n, null])));
    setSaved(false);
    setRegisteredSession(null);
  }, [selectedClass]);

  const mark = (name, status) => { setRecords(p => ({...p, [name]:status})); setSaved(false); };
  const markAll = (status) => { setRecords(Object.fromEntries(cls.students.map(n => [n, status]))); setSaved(false); };
  // Confirming the register also captures a draft "teaching" TimeEntry (upsert on
  // sessionId, so a second save never duplicates) — see Timesheets.jsx.
  const handleSave = () => { setSaved(true); setRegisteredSession(session.sessionId); setTimeout(() => setSaved(false), 2500); };

  const counts = { present:0, absent:0, late:0, unmarked:0 };
  Object.values(records).forEach(v => { if (v) counts[v]++; else counts.unmarked++; });

  // Past attendance log (mock)
  const pastLog = [
    { date:'22 Apr', present:7, absent:1, late:0 },
    { date:'18 Apr', present:8, absent:0, late:0 },
    { date:'15 Apr', present:6, absent:1, late:1 },
    { date:'11 Apr', present:7, absent:1, late:0 },
    { date:'8 Apr',  present:5, absent:2, late:1 },
  ];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Attendance" subtitle="Mark and review attendance for your classes" actions={[
        <Btn key="exp" variant="secondary" icon="download" small>Export Register</Btn>
      ]} />

      {/* Teacher's own attendance — self check-in, shared with admin */}
      <MyAttendanceCard />

      {/* Class selector */}
      <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
        {teacherAllClasses.map((c,i) => (
          <button key={i} onClick={() => setSelectedClass(i)} style={{
            padding:'8px 16px', borderRadius:20, border:`1px solid ${selectedClass===i ? DS.accentBorder : DS.border}`,
            background: selectedClass===i ? DS.accentLight : DS.bg,
            color: selectedClass===i ? DS.accent : DS.muted,
            fontSize:13, fontWeight: selectedClass===i ? 600 : 400, cursor:'pointer',
          }}>{c.group}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>
        {/* Mark attendance */}
        <Card title={`${cls.group} — ${cls.subject}`} actions={[
          <div key="date" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${DS.border}`, fontSize:13, outline:'none' }} />
          </div>
        ]}>
          {/* Bulk actions */}
          <div style={{ display:'flex', gap:8, padding:'12px 16px', borderBottom:`1px solid ${DS.border}`, background:DS.surface }}>
            <span style={{ fontSize:12, color:DS.muted, alignSelf:'center', marginRight:4 }}>Mark all:</span>
            {['present','absent','late'].map(st => (
              <button key={st} onClick={() => markAll(st)} style={{
                padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                border:`1px solid ${st==='present' ? DS.successBorder : st==='absent' ? DS.dangerBorder : DS.warningBorder}`,
                background: st==='present' ? DS.successBg : st==='absent' ? DS.dangerBg : DS.warningBg,
                color: st==='present' ? DS.success : st==='absent' ? DS.danger : DS.warning,
              }}>{st.charAt(0).toUpperCase() + st.slice(1)}</button>
            ))}
          </div>

          <div>
            {cls.students.map((name, i) => {
              const status = records[name];
              return (
                <div key={name} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'11px 16px',
                  borderBottom: i < cls.students.length-1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <Avatar name={name} size={30} />
                  <span style={{ flex:1, fontSize:13, fontWeight:500, color:DS.text }}>{name}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {['present','absent','late'].map(st => {
                      const active = status === st;
                      const colors = { present:[DS.success, DS.successBg, DS.successBorder], absent:[DS.danger, DS.dangerBg, DS.dangerBorder], late:[DS.warning, DS.warningBg, DS.warningBorder] };
                      const [c, bg, border] = colors[st];
                      return (
                        <button key={st} onClick={() => mark(name, st)} style={{
                          padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                          border:`1px solid ${active ? border : DS.border}`,
                          background: active ? bg : DS.surface,
                          color: active ? c : DS.faint,
                          transition:'all 0.1s',
                        }}>
                          {st === 'present' ? 'Present' : st === 'absent' ? 'Absent' : 'Late'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Working-time capture — rides this register flow (no separate clock-in) */}
          {Capture && <Capture session={session} registered={registered} />}

          <div style={{ padding:'14px 16px', borderTop:`1px solid ${DS.border}`, background:DS.surface, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ display:'flex', gap:14, flex:1 }}>
              {[['present',DS.success],['absent',DS.danger],['late',DS.warning],['unmarked',DS.faint]].map(([k,c])=>(
                <span key={k} style={{ fontSize:12, color:c, fontWeight:600 }}>{counts[k]} {k}</span>
              ))}
            </div>
            <Btn variant={saved ? 'secondary' : 'primary'} icon={saved ? 'check' : 'clip'} onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Register'}
            </Btn>
          </div>
        </Card>

        {/* Past log + stats */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card title="Attendance Rate">
            <div style={{ padding:'20px' }}>
              <div style={{ fontSize:40, fontWeight:800, color:DS.success, letterSpacing:'-1px', lineHeight:1 }}>94%</div>
              <div style={{ fontSize:12, color:DS.muted, marginTop:4, marginBottom:16 }}>This term · {cls.group}</div>
              <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:'94%', height:'100%', background:DS.success, borderRadius:3 }} />
              </div>
              {[['Target', '95%'],['Class avg','91%'],['Centre avg','93%']].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:`1px solid ${DS.border}` }}>
                  <span style={{ color:DS.muted }}>{l}</span>
                  <span style={{ fontWeight:500, color:DS.text }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Sessions">
            <div style={{ padding:'8px 0' }}>
              {pastLog.map((row,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderBottom: i<pastLog.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                  <span style={{ fontSize:12, color:DS.muted, width:44, flexShrink:0 }}>{row.date}</span>
                  <div style={{ flex:1, display:'flex', gap:6 }}>
                    <span style={{ fontSize:12, color:DS.success, fontWeight:600 }}>{row.present}P</span>
                    {row.absent > 0 && <span style={{ fontSize:12, color:DS.danger, fontWeight:600 }}>{row.absent}A</span>}
                    {row.late > 0 && <span style={{ fontSize:12, color:DS.warning, fontWeight:600 }}>{row.late}L</span>}
                  </div>
                  <span style={{ fontSize:11, color:DS.faint }}>{Math.round((row.present/(row.present+row.absent+row.late))*100)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Lesson Planner ─────────────────────────────────────────────────────────────
// Global store so plans persist across page navigation and are readable from the dashboard.
window.__lessonPlans = window.__lessonPlans || {};
const planKey = (group, date) => `${group}__${date}`;

const blankPlan = () => ({
  title: '',
  topic: '',
  duration: '60',
  objectives: '',
  agenda: '',
  homework: '',
  notes: '',
  resources: [],   // [{ id, name, size, type, dataUrl }]
});

const formatBytes = (b) => {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
};

const fileIconFor = (type, name) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('image/'))                 return { icon:'eye',    color:'#7C3AED' };
  if (ext === 'pdf')                             return { icon:'clip',   color:'#DC2626' };
  if (['doc','docx'].includes(ext))              return { icon:'edit',   color:'#2563EB' };
  if (['xls','xlsx','csv'].includes(ext))        return { icon:'chart',  color:'#16A34A' };
  if (['ppt','pptx','key'].includes(ext))        return { icon:'book',   color:'#D97706' };
  return { icon:'clip', color:DS.muted };
};

const formatDateLong = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  } catch (e) { return iso; }
};

const formatDateShort = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  } catch (e) { return iso; }
};

// ─── Saved Plans Browser ──────────────────────────────────────────────────────
const SavedPlansBrowser = ({ onOpen, onNew, currentKey }) => {
  const [query, setQuery] = React.useState('');
  const [classFilter, setClassFilter] = React.useState('all');
  const [, force] = React.useState(0);

  const allPlans = React.useMemo(() => {
    const store = window.__lessonPlans || {};
    return Object.entries(store).map(([k, v]) => ({ key:k, ...v }));
  }, [currentKey]);

  const filtered = allPlans.filter(p => {
    if (classFilter !== 'all' && p.group !== classFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const haystack = [
      p.group, p.date, p.savedAt,
      p.plan?.title, p.plan?.topic, p.plan?.objectives,
      p.plan?.agenda, p.plan?.homework, p.plan?.notes,
      ...(p.plan?.resources || []).map(r => r.name),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const uniqueGroups = Array.from(new Set(allPlans.map(p => p.group))).filter(Boolean);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Search + filter */}
      <div style={{
        background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12,
        padding:'18px 20px',
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex' }}>
              <Icon name="search" size={15} color={DS.faint} />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title, topic, class, content, resource name…"
              style={{
                width:'100%', padding:'10px 12px 10px 36px', borderRadius:8,
                border:`1px solid ${DS.border}`, fontSize:13, outline:'none',
                boxSizing:'border-box', background:DS.surface,
              }}
            />
          </div>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            style={{ padding:'10px 12px', borderRadius:8, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', background:DS.bg }}
          >
            <option value="all">All classes</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <Btn variant="primary" icon="plus" small onClick={onNew}>New Lesson</Btn>
        </div>

        <div style={{ display:'flex', gap:14, marginTop:12, fontSize:12, color:DS.muted }}>
          <span>{allPlans.length} plan{allPlans.length === 1 ? '' : 's'} saved</span>
          {query && <span>· {filtered.length} match{filtered.length === 1 ? '' : 'es'}</span>}
        </div>
      </div>

      {/* Plan grid */}
      {filtered.length === 0 ? (
        <div style={{
          background:DS.bg, border:`1px dashed ${DS.borderDark}`, borderRadius:12,
          padding:'48px 20px', textAlign:'center',
        }}>
          <div style={{
            width:48, height:48, borderRadius:12, background:DS.accentLight,
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            marginBottom:14, color:DS.accent,
          }}>
            <Icon name="book" size={22} />
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:DS.text, marginBottom:4 }}>
            {allPlans.length === 0 ? 'No lesson plans yet' : 'No matches'}
          </div>
          <div style={{ fontSize:13, color:DS.muted, marginBottom:18 }}>
            {allPlans.length === 0
              ? 'Create your first lesson plan to start building your library.'
              : 'Try a different search term or class filter.'}
          </div>
          <Btn variant="primary" icon="plus" onClick={onNew}>Plan a New Lesson</Btn>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
          {filtered.map(p => {
            const cls = teacherClasses.find(c => c.group === p.group);
            const color = cls?.color || DS.accent;
            const resCount = p.plan?.resources?.length || 0;
            const title = p.plan?.title || p.plan?.topic || `Lesson — ${formatDateShort(p.date)}`;
            const isCurrent = p.key === currentKey;
            return (
              <button
                key={p.key}
                onClick={() => onOpen(p.group, p.date)}
                style={{
                  textAlign:'left', cursor:'pointer',
                  background:DS.bg,
                  border:`1px solid ${isCurrent ? DS.accentBorder : DS.border}`,
                  borderTop:`3px solid ${color}`,
                  borderRadius:10, padding:'16px 18px',
                  display:'flex', flexDirection:'column', gap:10,
                  transition:'box-shadow 0.15s, transform 0.1s',
                  boxShadow: isCurrent ? '0 0 0 3px ' + DS.accentLight : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = isCurrent ? '0 0 0 3px ' + DS.accentLight : 'none'}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:600, color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                      {formatDateShort(p.date)}
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text, lineHeight:1.35, marginBottom:3 }}>{title}</div>
                    <div style={{ fontSize:12, color:DS.muted }}>{p.group}</div>
                  </div>
                  {isCurrent && <Badge variant="accent">Open</Badge>}
                </div>

                {p.plan?.objectives && (
                  <div style={{
                    fontSize:12, color:DS.sub, lineHeight:1.5,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                    overflow:'hidden',
                  }}>
                    {p.plan.objectives}
                  </div>
                )}

                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:'auto', fontSize:11, color:DS.faint }}>
                  {resCount > 0 && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Icon name="clip" size={11} /> {resCount} file{resCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {p.plan?.duration && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Icon name="clock" size={11} /> {p.plan.duration} min
                    </span>
                  )}
                  {p.savedAt && (
                    <span style={{ marginLeft:'auto' }}>Saved {p.savedAt}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── File Upload Drop Zone ────────────────────────────────────────────────────
const FileDropZone = ({ files, onAdd, onRemove, disabled }) => {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    const reads = arr.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name: file.name,
        size: file.size,
        type: file.type || '',
        dataUrl: reader.result,
      });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }));
    Promise.all(reads).then(results => onAdd(results.filter(Boolean)));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      {!disabled && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border:`2px dashed ${dragOver ? DS.accent : DS.borderDark}`,
            background: dragOver ? DS.accentLight : DS.surface,
            borderRadius:10, padding:'20px', textAlign:'center', cursor:'pointer',
            transition:'all 0.15s', marginBottom: files.length > 0 ? 12 : 0,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            style={{ display:'none' }}
          />
          <div style={{
            width:40, height:40, borderRadius:10,
            background:dragOver ? DS.bg : DS.accentLight,
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            marginBottom:10, color:DS.accent,
          }}>
            <Icon name="upload" size={18} />
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:DS.text, marginBottom:3 }}>
            {dragOver ? 'Drop files to upload' : 'Drag & drop or click to upload'}
          </div>
          <div style={{ fontSize:12, color:DS.muted }}>
            Worksheets, slides, PDFs, images — anything your students need
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {files.map(f => {
            const fi = fileIconFor(f.type, f.name);
            return (
              <div key={f.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', background:DS.bg,
                border:`1px solid ${DS.border}`, borderRadius:8,
              }}>
                <div style={{
                  width:32, height:32, borderRadius:7,
                  background:fi.color + '18', color:fi.color,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                  <Icon name={fi.icon} size={15} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:13, fontWeight:500, color:DS.text,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>{f.name}</div>
                  <div style={{ fontSize:11, color:DS.faint }}>{formatBytes(f.size)}</div>
                </div>
                <a
                  href={f.dataUrl}
                  download={f.name}
                  onClick={e => e.stopPropagation()}
                  title="Download"
                  style={{
                    width:30, height:30, borderRadius:6, display:'flex',
                    alignItems:'center', justifyContent:'center',
                    color:DS.muted, textDecoration:'none',
                    border:`1px solid ${DS.border}`, background:DS.surface,
                  }}
                >
                  <Icon name="download" size={13} />
                </a>
                {!disabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                    title="Remove"
                    style={{
                      width:30, height:30, borderRadius:6,
                      border:`1px solid ${DS.border}`, background:DS.surface,
                      color:DS.muted, cursor:'pointer', display:'flex',
                      alignItems:'center', justifyContent:'center',
                    }}
                  >
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Lesson Plan Editor ───────────────────────────────────────────────────────
const LessonPlanEditor = ({
  selectedGroup, setSelectedGroup,
  selectedDate, setSelectedDate,
  plan, setPlan,
  mode, setMode,
  exists, savedAt, saved,
  onSave, onDelete, onBack,
}) => {
  const cls = teacherClasses.find(c => c.group === selectedGroup) || teacherClasses[0];
  const isEdit = mode === 'edit';

  const update = (field, value) => setPlan(p => ({ ...p, [field]: value }));
  const addFiles = (files) => setPlan(p => ({ ...p, resources: [...(p.resources || []), ...files] }));
  const removeFile = (id) => setPlan(p => ({ ...p, resources: (p.resources || []).filter(r => r.id !== id) }));

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:7,
    border:`1px solid ${DS.border}`, fontSize:13, outline:'none',
    boxSizing:'border-box', background:DS.bg, fontFamily:'inherit',
  };
  const labelStyle = { fontSize:11, fontWeight:600, color:DS.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };

  const renderFieldValue = (val, placeholder) => (
    <div style={{
      fontSize:13.5, color: val ? DS.sub : DS.faint,
      lineHeight:1.7, whiteSpace:'pre-wrap', minHeight:24,
      fontStyle: val ? 'normal' : 'italic',
    }}>
      {val || placeholder}
    </div>
  );

  return (
    <>
      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${cls.color}12 0%, ${DS.accentLight} 100%)`,
        border:`1px solid ${cls.color}33`,
        borderRadius:14, padding:'24px 28px', marginBottom:20,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:cls.color }} />
        <div style={{ display:'flex', alignItems:'flex-start', gap:20 }}>
          <div style={{
            width:56, height:56, borderRadius:12,
            background:cls.color, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, boxShadow:`0 4px 12px ${cls.color}55`,
          }}>
            <Icon name="book" size={26} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:cls.color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>
              {formatDateLong(selectedDate)}
            </div>
            {isEdit ? (
              <input
                value={plan.title}
                onChange={e => update('title', e.target.value)}
                placeholder="Lesson title (e.g. Introduction to Quadratics)"
                style={{
                  width:'100%', padding:'4px 0', fontSize:24, fontWeight:700,
                  color:DS.text, border:'none', outline:'none', background:'transparent',
                  letterSpacing:'-0.5px', fontFamily:'inherit', marginBottom:6,
                }}
              />
            ) : (
              <div style={{ fontSize:24, fontWeight:700, color:DS.text, letterSpacing:'-0.5px', marginBottom:6, lineHeight:1.2 }}>
                {plan.title || 'Untitled Lesson'}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:13, color:DS.muted, flexWrap:'wrap' }}>
              <span style={{ fontWeight:600, color:DS.text }}>{cls.name}</span>
              <span>·</span>
              <span>{cls.group}</span>
              <span>·</span>
              <span>{cls.students} students</span>
              <span>·</span>
              <span>{cls.room}</span>
              {plan.duration && (<><span>·</span><span>{plan.duration} min</span></>)}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end', flexShrink:0 }}>
            {saved && <Badge variant="success">✓ Plan saved</Badge>}
            {exists && !saved && <Badge variant="success">Saved {savedAt}</Badge>}
            {!exists && <Badge variant="default">Draft — not saved</Badge>}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        {/* Left: main plan content */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Objectives card */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:DS.accentLight, color:DS.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="star" size={15} />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>Learning Objectives</div>
            </div>
            {isEdit ? (
              <textarea
                rows={3}
                value={plan.objectives}
                onChange={e => update('objectives', e.target.value)}
                placeholder="What should students know or be able to do by the end of the lesson?"
                style={{ ...inputStyle, lineHeight:1.6, color:DS.sub, resize:'vertical' }}
              />
            ) : renderFieldValue(plan.objectives, 'No objectives recorded.')}
          </div>

          {/* Agenda card */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'#7C3AED18', color:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="clock" size={15} />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text, flex:1 }}>Lesson Agenda</div>
              {isEdit && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11, color:DS.muted }}>Duration</span>
                  <input
                    type="number"
                    value={plan.duration}
                    onChange={e => update('duration', e.target.value)}
                    style={{ width:60, padding:'4px 8px', borderRadius:6, border:`1px solid ${DS.border}`, fontSize:12, outline:'none', textAlign:'center' }}
                  />
                  <span style={{ fontSize:11, color:DS.muted }}>min</span>
                </div>
              )}
            </div>
            {isEdit ? (
              <textarea
                rows={8}
                value={plan.agenda}
                onChange={e => update('agenda', e.target.value)}
                placeholder={`Outline the lesson structure with timings, e.g.:\n0–10 min  Starter: recap last lesson\n10–35 min Main activity: ...\n35–55 min Practice: ...\n55–60 min Plenary: ...`}
                style={{ ...inputStyle, lineHeight:1.6, color:DS.sub, resize:'vertical', fontFamily:'inherit' }}
              />
            ) : renderFieldValue(plan.agenda, 'No agenda recorded.')}
          </div>

          {/* Homework card */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:DS.warningBg, color:DS.warning, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="clip" size={15} />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>Homework to Set</div>
            </div>
            {isEdit ? (
              <textarea
                rows={3}
                value={plan.homework}
                onChange={e => update('homework', e.target.value)}
                placeholder="What homework will be assigned at the end of this lesson?"
                style={{ ...inputStyle, lineHeight:1.6, color:DS.sub, resize:'vertical' }}
              />
            ) : renderFieldValue(plan.homework, 'No homework set.')}
          </div>

          {/* Notes card */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:DS.surface, color:DS.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="edit" size={15} />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>Personal Notes</div>
            </div>
            {isEdit ? (
              <textarea
                rows={3}
                value={plan.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Differentiation, students to watch, things to remember…"
                style={{ ...inputStyle, lineHeight:1.6, color:DS.sub, resize:'vertical' }}
              />
            ) : renderFieldValue(plan.notes, 'No notes recorded.')}
          </div>
        </div>

        {/* Right: sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Class & date selector */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'18px 20px' }}>
            <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:14 }}>Lesson Details</div>
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Topic / Unit</label>
              {isEdit ? (
                <input
                  value={plan.topic}
                  onChange={e => update('topic', e.target.value)}
                  placeholder="e.g. Algebra · Quadratics"
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize:13, color: plan.topic ? DS.text : DS.faint, fontStyle: plan.topic ? 'normal' : 'italic' }}>
                  {plan.topic || 'Not set'}
                </div>
              )}
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Class</label>
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                style={inputStyle}
              >
                {teacherClasses.map(c => <option key={c.id} value={c.group}>{c.group}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Resources / file uploads */}
          <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>Resources</div>
              <Badge variant="default">{plan.resources?.length || 0}</Badge>
            </div>
            <FileDropZone
              files={plan.resources || []}
              onAdd={addFiles}
              onRemove={removeFile}
              disabled={!isEdit}
            />
            {!isEdit && (!plan.resources || plan.resources.length === 0) && (
              <div style={{ fontSize:12, color:DS.faint, fontStyle:'italic', textAlign:'center', padding:'12px 0' }}>
                No resources uploaded.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12,
            padding:'14px 16px', display:'flex', flexDirection:'column', gap:8,
            position:'sticky', top:16,
          }}>
            {isEdit ? (
              <>
                <Btn variant="primary" icon="check" onClick={onSave}>
                  {exists ? 'Update Plan' : 'Save Plan'}
                </Btn>
                {exists && <Btn variant="secondary" onClick={() => setMode('view')}>Cancel Edits</Btn>}
              </>
            ) : (
              <Btn variant="primary" icon="edit" onClick={() => setMode('edit')}>Edit Plan</Btn>
            )}
            <Btn variant="ghost" icon="chevron_d" onClick={onBack}>Back to All Plans</Btn>
            {exists && <Btn variant="ghost" icon="x" onClick={onDelete}>Delete Plan</Btn>}
          </div>
        </div>
      </div>
    </>
  );
};

const LessonPlannerPage = ({ initialGroup, initialDate, initialMode }) => {
  // 'browse' shows the saved-plans list; 'editor' shows the plan editor/viewer.
  const [screen, setScreen] = React.useState(initialGroup ? 'editor' : 'browse');
  const [selectedGroup, setSelectedGroup] = React.useState(initialGroup || teacherClasses[0].group);
  const [selectedDate, setSelectedDate] = React.useState(initialDate || '2026-04-25');
  const [mode, setMode] = React.useState(initialMode || 'edit');
  const [plan, setPlan] = React.useState(blankPlan());
  const [saved, setSaved] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);

  const key = planKey(selectedGroup, selectedDate);
  const exists = !!window.__lessonPlans[key];

  React.useEffect(() => {
    const stored = window.__lessonPlans[key];
    if (stored) {
      setPlan({ ...blankPlan(), ...stored.plan });
      setSavedAt(stored.savedAt);
      setMode('view');
    } else {
      setPlan(blankPlan());
      setSavedAt(null);
      setMode('edit');
    }
    setSaved(false);
  }, [key]);

  const handleSave = () => {
    const now = new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    window.__lessonPlans[key] = { plan, savedAt: now, group: selectedGroup, date: selectedDate };
    setSavedAt(now);
    setSaved(true);
    setMode('view');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = () => {
    delete window.__lessonPlans[key];
    setPlan(blankPlan());
    setSavedAt(null);
    setMode('edit');
    setScreen('browse');
  };

  const openExisting = (group, date) => {
    setSelectedGroup(group);
    setSelectedDate(date);
    setScreen('editor');
  };

  const startNew = () => {
    setSelectedGroup(teacherClasses[0].group);
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setPlan(blankPlan());
    setMode('edit');
    setScreen('editor');
  };

  return (
    <div style={{ padding:'32px', maxWidth:1280, margin:'0 auto' }}>
      <PageHeader
        title="Lesson Planner"
        subtitle={screen === 'browse'
          ? 'Search saved lessons or plan a new one'
          : 'Plan, save and review lessons for any class on any date'}
        actions={[
          screen === 'editor' && (
            <Btn key="back" variant="secondary" icon="chevron_d" small onClick={() => setScreen('browse')}>
              All Plans
            </Btn>
          ),
          screen === 'browse' && (
            <Btn key="new" variant="primary" icon="plus" small onClick={startNew}>
              Plan a New Lesson
            </Btn>
          ),
        ].filter(Boolean)}
      />

      {screen === 'browse' ? (
        <SavedPlansBrowser
          onOpen={openExisting}
          onNew={startNew}
          currentKey={null}
        />
      ) : (
        <LessonPlanEditor
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          plan={plan}
          setPlan={setPlan}
          mode={mode}
          setMode={setMode}
          exists={exists}
          savedAt={savedAt}
          saved={saved}
          onSave={handleSave}
          onDelete={handleDelete}
          onBack={() => setScreen('browse')}
        />
      )}
    </div>
  );
};

// ─── Teacher Reports Page ───────────────────────────────────────────────────────
// The full reports surface lives in Reports.jsx (window.TeacherReports), loaded
// before this file. Routed below via the `reports` page id.

// ─── Tracking Page ──────────────────────────────────────────────────────────────
const TRACKING_STORAGE_KEY = 'tutoros.tracking.v1';

const COLUMN_TYPES = [
  { id: 'score',   label: 'Score / %',   icon: 'chart' },
  { id: 'number',  label: 'Number',      icon: 'chart' },
  { id: 'grade',   label: 'Grade',       icon: 'star' },
  { id: 'text',    label: 'Text / Note', icon: 'edit' },
  { id: 'check',   label: 'Yes / No',    icon: 'check' },
  { id: 'select',  label: 'Choice',      icon: 'clip' },
  { id: 'date',    label: 'Date',        icon: 'calendar' },
];

const GRADE_OPTIONS = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];


const loadTrackers = () => {
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_TRACKERS;
};

const saveTrackers = (trackers) => {
  try { localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(trackers)); } catch (e) {}
};

const newId = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 8);

// Read class roster from teacherClasses; fall back to sane default
const getRosterForGroup = (group) => {
  const cls = teacherClasses.find(c => c.group === group);
  return cls ? cls.studentList : [];
};

// ─── Tracker grouping (for the switcher) ──────────────────────────────────────
// Teachers can accumulate dozens of trackers, so the switcher lets them group by
// one of these dimensions. Subject / year group are derived from the tracker's
// class via teacherClasses, with graceful fallbacks for custom class groups.
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
  const q = query.trim().toLowerCase();
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

// ─── Tracker Switcher ─────────────────────────────────────────────────────────
// Replaces the flat row of tracker pills. Designed to stay usable with dozens of
// trackers: a compact active-tracker bar that expands into a searchable, grouped
// picker (group by class / subject / year group). Collapses back on selection.
const TrackerSwitcher = ({ trackers, active, onSelect, onNew }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [groupBy, setGroupBy] = React.useState('class');
  const [collapsedKeys, setCollapsedKeys] = React.useState({});
  const searchRef = React.useRef(null);

  React.useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const sections = React.useMemo(
    () => groupTrackers(trackers, groupBy, query),
    [trackers, groupBy, query]
  );
  const totalMatches = sections.reduce((n, s) => n + s.items.length, 0);

  const pick = (id) => { onSelect(id); setOpen(false); setQuery(''); };
  const toggleSection = (key) =>
    setCollapsedKeys(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Active-tracker bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10,
        border: `1px solid ${DS.border}`, background: DS.bg,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: DS.accentLight, color: DS.accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="star" size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: DS.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tracker
          </div>
          {active ? (
            <div style={{ fontSize: 14, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {active.name}
              <span style={{ fontSize: 12, fontWeight: 500, color: DS.muted }}> · {active.classGroup}</span>
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 600, color: DS.muted }}>No tracker selected</div>
          )}
        </div>
        <span style={{ fontSize: 12, color: DS.faint, whiteSpace: 'nowrap' }}>
          {trackers.length} tracker{trackers.length === 1 ? '' : 's'}
        </span>
        <Btn variant="secondary" icon={open ? 'chevron_d' : 'chevron_r'} small onClick={() => setOpen(o => !o)}>
          {open ? 'Close' : 'Switch tracker'}
        </Btn>
      </div>

      {/* Expandable picker */}
      {open && (
        <div style={{
          marginTop: 8, borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${DS.border}`, background: DS.bg,
        }}>
          {/* Search + group-by controls */}
          <div style={{
            padding: '12px 14px', borderBottom: `1px solid ${DS.border}`, background: DS.surface,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                <Icon name="search" size={15} color={DS.faint} />
              </div>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search trackers by name, class or description…"
                style={{
                  width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8,
                  border: `1px solid ${DS.border}`, fontSize: 13, outline: 'none',
                  boxSizing: 'border-box', background: DS.bg, color: DS.text, fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: DS.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="filter" size={13} color={DS.faint} /> Group by
              </span>
              <div style={{ display: 'inline-flex', border: `1px solid ${DS.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {TRACKER_GROUP_BY.map((g, i) => {
                  const isOn = groupBy === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGroupBy(g.id)}
                      style={{
                        padding: '6px 12px', cursor: 'pointer', fontSize: 12.5,
                        fontWeight: isOn ? 600 : 500,
                        border: 'none', borderLeft: i ? `1px solid ${DS.border}` : 'none',
                        background: isOn ? DS.accentLight : DS.bg,
                        color: isOn ? DS.accent : DS.sub,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Icon name={g.icon} size={12} color={isOn ? DS.accent : DS.muted} />
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grouped list */}
          <div style={{ maxHeight: 380, overflow: 'auto' }}>
            {totalMatches === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: DS.muted, fontSize: 13 }}>
                {trackers.length === 0
                  ? 'No trackers yet — create one to get started.'
                  : `No trackers match “${query}”.`}
              </div>
            ) : sections.map(section => {
              const isCollapsed = !!collapsedKeys[section.key];
              return (
                <div key={section.key}>
                  <button
                    onClick={() => toggleSection(section.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', cursor: 'pointer', textAlign: 'left',
                      border: 'none', borderBottom: `1px solid ${DS.border}`,
                      background: DS.surface, color: DS.muted,
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    <Icon name={isCollapsed ? 'chevron_r' : 'chevron_d'} size={12} color={DS.faint} />
                    <span style={{ flex: 1 }}>{section.key}</span>
                    <span style={{ fontWeight: 600, color: DS.faint }}>{section.items.length}</span>
                  </button>
                  {!isCollapsed && section.items.map(t => {
                    const isActive = active && t.id === active.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => pick(t.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px 10px 30px', cursor: 'pointer', textAlign: 'left',
                          border: 'none', borderBottom: `1px solid ${DS.border}`,
                          background: isActive ? DS.accentLight : DS.bg,
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = DS.surface; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = DS.bg; }}
                      >
                        <Icon name="star" size={13} color={isActive ? DS.accent : DS.faint} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, color: isActive ? DS.accent : DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.classGroup}{t.description ? ` · ${t.description}` : ''}
                          </div>
                        </div>
                        {isActive && <Badge variant="accent">Open</Badge>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${DS.border}`, background: DS.surface,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 12, color: DS.faint }}>
              {totalMatches} of {trackers.length} shown
            </span>
            <Btn variant="primary" icon="plus" small style={{ marginLeft: 'auto' }} onClick={() => { setOpen(false); onNew(); }}>
              New tracker
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

const TrackingCell = ({ col, value, onChange }) => {
  const baseInputStyle = {
    width: '100%', padding: '6px 8px', fontSize: 13,
    border: `1px solid ${DS.border}`, borderRadius: 6,
    background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none',
  };

  if (col.type === 'check') {
    const v = !!value;
    return (
      <button
        onClick={() => onChange(!v)}
        style={{
          width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${v ? DS.successBorder : DS.border}`,
          background: v ? DS.successBg : DS.surface,
          color: v ? DS.success : DS.faint,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {v ? <Icon name="check" size={14} /> : <Icon name="x" size={12} />}
      </button>
    );
  }
  if (col.type === 'grade') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={baseInputStyle}>
        <option value="">—</option>
        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    );
  }
  if (col.type === 'select') {
    const opts = col.options || [];
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={baseInputStyle}>
        <option value="">—</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === 'date') {
    return (
      <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={baseInputStyle} />
    );
  }
  if (col.type === 'score' || col.type === 'number') {
    const max = col.type === 'score' ? (col.max || 100) : null;
    const num = value === '' || value === null || value === undefined ? '' : value;
    const pct = (col.type === 'score' && typeof value === 'number' && max) ? (value / max) * 100 : null;
    const colour = pct === null ? DS.text : pct >= 70 ? DS.success : pct >= 50 ? DS.warning : DS.danger;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          value={num}
          onChange={e => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
          style={{ ...baseInputStyle, color: colour, fontWeight: 600 }}
        />
        {max != null && <span style={{ fontSize: 11, color: DS.faint, whiteSpace: 'nowrap' }}>/ {max}</span>}
      </div>
    );
  }
  // text
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      style={baseInputStyle}
    />
  );
};

const ColumnSummary = ({ col, entries, students }) => {
  const values = students.map(s => entries[s] && entries[s][col.id]).filter(v => v !== undefined && v !== null && v !== '');
  if (values.length === 0) return <span style={{ fontSize: 11, color: DS.faint }}>—</span>;

  if (col.type === 'score' || col.type === 'number') {
    const nums = values.filter(v => typeof v === 'number');
    if (!nums.length) return <span style={{ fontSize: 11, color: DS.faint }}>—</span>;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    if (col.type === 'score' && col.max) {
      const pct = (avg / col.max) * 100;
      return <span style={{ fontSize: 11, color: DS.muted }}>avg <b style={{ color: pct >= 70 ? DS.success : pct >= 50 ? DS.warning : DS.danger }}>{avg.toFixed(1)} / {col.max}</b> ({pct.toFixed(0)}%)</span>;
    }
    return <span style={{ fontSize: 11, color: DS.muted }}>avg <b style={{ color: DS.text }}>{avg.toFixed(1)}</b></span>;
  }
  if (col.type === 'check') {
    const yes = values.filter(v => v === true).length;
    return <span style={{ fontSize: 11, color: DS.muted }}>{yes}/{values.length} yes</span>;
  }
  if (col.type === 'grade' || col.type === 'select') {
    const counts = {};
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return <span style={{ fontSize: 11, color: DS.muted }}>{top.map(([k, n]) => `${k}×${n}`).join(' · ')}</span>;
  }
  return <span style={{ fontSize: 11, color: DS.faint }}>{values.length} filled</span>;
};

const ColumnEditor = ({ col, onSave, onCancel, onDelete }) => {
  const [draft, setDraft] = React.useState(() => ({
    name: col.name || '',
    type: col.type || 'score',
    max: col.max || 100,
    options: (col.options || []).join(', '),
  }));
  const inputStyle = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: `1px solid ${DS.border}`, borderRadius: 6,
    background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none',
  };
  const submit = () => {
    if (!draft.name.trim()) return;
    const next = { ...col, name: draft.name.trim(), type: draft.type };
    if (draft.type === 'score') next.max = Number(draft.max) || 100;
    else delete next.max;
    if (draft.type === 'select') {
      next.options = draft.options.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      delete next.options;
    }
    onSave(next);
  };
  return (
    <div style={{
      background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10, width: 320,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>
        {onDelete ? 'Edit column' : 'New column'}
      </div>
      <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
        Column name
        <input
          autoFocus
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Mock Paper 1"
          style={{ ...inputStyle, marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
        Type
        <select
          value={draft.type}
          onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
          style={{ ...inputStyle, marginTop: 4 }}
        >
          {COLUMN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      {draft.type === 'score' && (
        <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
          Out of (max)
          <input
            type="number"
            value={draft.max}
            onChange={e => setDraft(d => ({ ...d, max: e.target.value }))}
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
      )}
      {draft.type === 'select' && (
        <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
          Options (comma separated)
          <input
            value={draft.options}
            onChange={e => setDraft(d => ({ ...d, options: e.target.value }))}
            placeholder="e.g. Excellent, Good, Needs work"
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Btn variant="primary" small onClick={submit}>Save</Btn>
        <Btn variant="secondary" small onClick={onCancel}>Cancel</Btn>
        {onDelete && (
          <button onClick={onDelete} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: DS.danger, fontSize: 12, fontWeight: 500, padding: '6px 8px',
          }}>Delete column</button>
        )}
      </div>
    </div>
  );
};

const TrackerEditor = ({ tracker, onSave, onCancel }) => {
  const [draft, setDraft] = React.useState(() => ({
    name: tracker.name || '',
    description: tracker.description || '',
    classGroup: tracker.classGroup || (teacherClasses[0] && teacherClasses[0].group) || '',
  }));
  const inputStyle = {
    width: '100%', padding: '8px 10px', fontSize: 13,
    border: `1px solid ${DS.border}`, borderRadius: 6,
    background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none',
  };
  return (
    <div style={{
      background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 10,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10, width: 360,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>
        {tracker.id ? 'Edit tracker' : 'New tracker'}
      </div>
      <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
        Name
        <input
          autoFocus
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Behaviour log"
          style={{ ...inputStyle, marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
        Description
        <input
          value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          placeholder="What is this tracker for?"
          style={{ ...inputStyle, marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 11, color: DS.muted, fontWeight: 500 }}>
        Class / group
        <select
          value={draft.classGroup}
          onChange={e => setDraft(d => ({ ...d, classGroup: e.target.value }))}
          style={{ ...inputStyle, marginTop: 4 }}
        >
          {teacherClasses.map(c => <option key={c.id} value={c.group}>{c.group}</option>)}
        </select>
      </label>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Btn variant="primary" small onClick={() => {
          if (!draft.name.trim()) return;
          onSave({ ...draft, name: draft.name.trim() });
        }}>Save</Btn>
        <Btn variant="secondary" small onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
};

const TeacherTrackingPage = () => {
  const [trackers, setTrackers] = React.useState(loadTrackers);
  const [activeId, setActiveId] = React.useState(() => {
    const t = loadTrackers();
    return t[0] ? t[0].id : null;
  });
  const [editingTracker, setEditingTracker] = React.useState(null); // {id?} | null
  const [editingColumn, setEditingColumn] = React.useState(null);   // {trackerId, col} | null
  const [extraStudent, setExtraStudent] = React.useState('');

  React.useEffect(() => { saveTrackers(trackers); }, [trackers]);

  const active = trackers.find(t => t.id === activeId) || trackers[0];

  const updateTracker = (id, mut) => {
    setTrackers(prev => prev.map(t => t.id === id ? mut(t) : t));
  };

  const addTracker = (data) => {
    const t = {
      id: newId('t'),
      name: data.name,
      description: data.description,
      classGroup: data.classGroup,
      columns: [],
      entries: {},
    };
    setTrackers(prev => [...prev, t]);
    setActiveId(t.id);
    setEditingTracker(null);
  };

  const saveTrackerEdit = (id, data) => {
    updateTracker(id, t => ({ ...t, ...data }));
    setEditingTracker(null);
  };

  const deleteTracker = (id) => {
    if (!window.confirm('Delete this tracker and all its data?')) return;
    setTrackers(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeId === id) setActiveId(next[0] ? next[0].id : null);
      return next;
    });
  };

  const addColumn = (col) => {
    if (!active) return;
    const withId = { ...col, id: newId('c') };
    updateTracker(active.id, t => ({ ...t, columns: [...t.columns, withId] }));
    setEditingColumn(null);
  };

  const updateColumn = (colId, col) => {
    updateTracker(active.id, t => ({
      ...t,
      columns: t.columns.map(c => c.id === colId ? { ...col, id: colId } : c),
    }));
    setEditingColumn(null);
  };

  const deleteColumn = (colId) => {
    if (!window.confirm('Delete this column and all its values?')) return;
    updateTracker(active.id, t => {
      const newEntries = {};
      Object.keys(t.entries || {}).forEach(s => {
        const row = { ...t.entries[s] };
        delete row[colId];
        newEntries[s] = row;
      });
      return { ...t, columns: t.columns.filter(c => c.id !== colId), entries: newEntries };
    });
    setEditingColumn(null);
  };

  const setCell = (student, colId, value) => {
    updateTracker(active.id, t => ({
      ...t,
      entries: {
        ...t.entries,
        [student]: { ...(t.entries[student] || {}), [colId]: value },
      },
    }));
  };

  const removeStudent = (student) => {
    updateTracker(active.id, t => {
      const e = { ...t.entries };
      delete e[student];
      return { ...t, entries: e, extraStudents: (t.extraStudents || []).filter(s => s !== student) };
    });
  };

  const addStudent = () => {
    const name = extraStudent.trim();
    if (!name) return;
    updateTracker(active.id, t => {
      const list = t.extraStudents || [];
      if (list.includes(name) || getRosterForGroup(t.classGroup).includes(name)) return t;
      return { ...t, extraStudents: [...list, name], entries: { ...t.entries, [name]: t.entries[name] || {} } };
    });
    setExtraStudent('');
  };

  const exportCSV = () => {
    if (!active) return;
    const students = [...getRosterForGroup(active.classGroup), ...(active.extraStudents || [])];
    const escape = (s) => {
      const v = s == null ? '' : String(s);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    };
    const header = ['Student', ...active.columns.map(c => c.name)];
    const rows = students.map(s => [s, ...active.columns.map(c => {
      const v = active.entries[s] && active.entries[s][c.id];
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      return v == null ? '' : v;
    })]);
    const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.name.replace(/[^a-z0-9]+/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const students = active
    ? [...getRosterForGroup(active.classGroup), ...(active.extraStudents || [])]
    : [];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Tracking"
        subtitle="Custom trackers for homework, tests, behaviour — anything you want to log per student"
        actions={[
          <Btn key="new" variant="primary" icon="plus" small onClick={() => setEditingTracker({})}>
            New tracker
          </Btn>,
        ]}
      />

      {/* Tracker switcher — searchable + grouped (scales to dozens of trackers) */}
      <TrackerSwitcher
        trackers={trackers}
        active={active}
        onSelect={setActiveId}
        onNew={() => setEditingTracker({})}
      />

      {/* Inline new-tracker editor */}
      {editingTracker && !editingTracker.id && (
        <div style={{ marginBottom: 20 }}>
          <TrackerEditor
            tracker={{}}
            onSave={addTracker}
            onCancel={() => setEditingTracker(null)}
          />
        </div>
      )}

      {!active && !editingTracker && (
        <Card>
          <div style={{ padding: 32, textAlign: 'center', color: DS.muted, fontSize: 14 }}>
            Click <b>New tracker</b> above to start tracking anything you like.
          </div>
        </Card>
      )}

      {active && (
        <Card>
          {/* Tracker header */}
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${DS.border}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{active.name}</div>
              {active.description && (
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{active.description}</div>
              )}
            </div>
            <Badge variant="default">{active.classGroup}</Badge>
            <Badge variant="accent">{students.length} students</Badge>
            <Btn variant="ghost" icon="edit" small onClick={() => setEditingTracker({ id: active.id })}>
              Settings
            </Btn>
            <Btn variant="ghost" icon="download" small onClick={exportCSV}>Export CSV</Btn>
            <button
              onClick={() => deleteTracker(active.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: DS.danger, fontSize: 12, fontWeight: 500, padding: '6px 8px',
              }}
            >Delete</button>
          </div>

          {/* Inline tracker-edit form */}
          {editingTracker && editingTracker.id === active.id && (
            <div style={{ padding: 16, borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
              <TrackerEditor
                tracker={active}
                onSave={(data) => saveTrackerEdit(active.id, data)}
                onCancel={() => setEditingTracker(null)}
              />
            </div>
          )}

          {/* Column editor */}
          {editingColumn && editingColumn.trackerId === active.id && (
            <div style={{ padding: 16, borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
              <ColumnEditor
                col={editingColumn.col || { name: '', type: 'score', max: 100 }}
                onSave={(c) => editingColumn.col && editingColumn.col.id
                  ? updateColumn(editingColumn.col.id, c)
                  : addColumn(c)}
                onCancel={() => setEditingColumn(null)}
                onDelete={editingColumn.col && editingColumn.col.id
                  ? () => deleteColumn(editingColumn.col.id)
                  : null}
              />
            </div>
          )}

          {/* Table */}
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
                  <th style={{
                    position: 'sticky', left: 0, background: DS.surface, zIndex: 1,
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: DS.muted,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    minWidth: 200, borderRight: `1px solid ${DS.border}`,
                  }}>Student</th>
                  {active.columns.map(col => (
                    <th key={col.id} style={{
                      padding: '10px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: DS.muted,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      minWidth: 140,
                    }}>
                      <button
                        onClick={() => setEditingColumn({ trackerId: active.id, col })}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 0, color: DS.muted, fontWeight: 600, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                        title="Edit column"
                      >
                        {col.name}
                        {col.type === 'score' && col.max && (
                          <span style={{ color: DS.faint, fontWeight: 400 }}>/{col.max}</span>
                        )}
                        <Icon name="edit" size={10} color={DS.faint} />
                      </button>
                    </th>
                  ))}
                  <th style={{ padding: '10px 12px', minWidth: 120 }}>
                    <Btn variant="ghost" icon="plus" small onClick={() => setEditingColumn({ trackerId: active.id, col: null })}>
                      Add column
                    </Btn>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s} style={{ borderBottom: `1px solid ${DS.border}` }}>
                    <td style={{
                      position: 'sticky', left: 0, background: DS.bg, zIndex: 1,
                      padding: '8px 16px', borderRight: `1px solid ${DS.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={s} size={26} />
                        <span style={{ fontSize: 13, color: DS.text, fontWeight: 500, flex: 1 }}>{s}</span>
                        {(active.extraStudents || []).includes(s) && (
                          <button
                            onClick={() => removeStudent(s)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 2 }}
                            title="Remove from tracker"
                          >
                            <Icon name="x" size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    {active.columns.map(col => (
                      <td key={col.id} style={{ padding: '6px 12px' }}>
                        <TrackingCell
                          col={col}
                          value={active.entries[s] && active.entries[s][col.id]}
                          onChange={(v) => setCell(s, col.id, v)}
                        />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                {/* Summary row */}
                {students.length > 0 && active.columns.length > 0 && (
                  <tr style={{ background: DS.surface }}>
                    <td style={{
                      position: 'sticky', left: 0, background: DS.surface, zIndex: 1,
                      padding: '10px 16px', borderRight: `1px solid ${DS.border}`,
                      fontSize: 11, fontWeight: 600, color: DS.muted,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>Summary</td>
                    {active.columns.map(col => (
                      <td key={col.id} style={{ padding: '10px 12px' }}>
                        <ColumnSummary col={col} entries={active.entries} students={students} />
                      </td>
                    ))}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add-student row */}
          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${DS.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input
              value={extraStudent}
              onChange={e => setExtraStudent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addStudent(); }}
              placeholder="Add another student to this tracker…"
              style={{
                flex: 1, maxWidth: 320,
                padding: '7px 10px', fontSize: 13,
                border: `1px solid ${DS.border}`, borderRadius: 6,
                background: DS.bg, color: DS.text, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <Btn variant="secondary" icon="plus" small onClick={addStudent}>Add student</Btn>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: DS.faint }}>
              Tip: click any column header to edit or delete it. All data is saved locally.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────────
const TeacherPages = ({ page, plannerArgs, section }) => {
  if (page === 'classes')        return <TeacherClassesPage />;
  if (page === 'timetable')      return <TeacherTimetablePage />;
  if (page === 'homework')       return <TeacherHomework section={section} />;
  if (page === 'progress')       return <TeacherProgressPage />;
  if (page === 'attendance')     return <TeacherAttendancePage />;
  if (page === 'timesheet')      return window.TeacherTimesheetPage ? <window.TeacherTimesheetPage /> : null;
  if (page === 'tracking')       return <TeacherTrackingPage />;
  if (page === 'reports')        return <TeacherReports />;
  if (page === 'lesson_planner') return <LessonPlannerPage
    initialGroup={plannerArgs && plannerArgs.group}
    initialDate={plannerArgs && plannerArgs.date}
    initialMode={plannerArgs && plannerArgs.mode}
  />;
  return null;
};

Object.assign(window, { TeacherPages });
