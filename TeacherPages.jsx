// ══════════════════════════════════════════════════════════════
//  TutorOS — Extra Teacher Pages
// ══════════════════════════════════════════════════════════════

const teacherClasses = [
  {
    id: 1, name: 'GCSE Mathematics',  group: 'Year 10 – Group A', day: 'Fri', time: '09:00', room: 'Room 3',
    students: 8, nextSession: 'Fri 25 Apr, 09:00', color: DS.accent,
    hwPending: 2, avgScore: 76, attendance: 94,
    studentList: ['Emma Thompson','Oliver Chen','Sophia Patel','James Wilson','Aiden Foster','Mia Okonkwo','Liam Thornton','Zoe Patterson'],
  },
  {
    id: 2, name: 'GCSE Mathematics',  group: 'Year 11 – Group B', day: 'Fri', time: '10:30', room: 'Room 3',
    students: 7, nextSession: 'Fri 25 Apr, 10:30', color: DS.accent,
    hwPending: 3, avgScore: 71, attendance: 88,
    studentList: ['Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez','James Wilson','Sophia Patel','Emma Thompson'],
  },
  {
    id: 3, name: 'A-Level Mathematics', group: 'Year 12 – Group A', day: 'Fri', time: '13:00', room: 'Room 5',
    students: 5, nextSession: 'Fri 25 Apr, 13:00', color: '#7C3AED',
    hwPending: 4, avgScore: 88, attendance: 97,
    studentList: ['Oliver Chen','Isabella Martinez','Ethan Huang','Mia Okonkwo','Aiden Foster'],
  },
  {
    id: 4, name: 'GCSE Mathematics',  group: 'Year 9 – Group C',  day: 'Fri', time: '15:00', room: 'Room 3',
    students: 9, nextSession: 'Fri 25 Apr, 15:00', color: DS.accent,
    hwPending: 1, avgScore: 79, attendance: 92,
    studentList: ['Mia Okonkwo','Aiden Foster','Emma Thompson','Sophia Patel','James Wilson','Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez'],
  },
];

const homeworkFull = [
  { id:1, title:'Algebra: Simultaneous Equations',   class:'Yr 10 Group A', subject:'GCSE Maths', set:'18 Apr', due:'22 Apr', submitted:8, total:8, marked:5, avgScore:81, status:'marking'  },
  { id:2, title:'Calculus: Differentiation Basics',  class:'Yr 12 Group A', subject:'A-Level',    set:'20 Apr', due:'24 Apr', submitted:4, total:5, marked:0, avgScore:null,status:'marking'  },
  { id:3, title:'Trigonometry: Sine & Cosine Rules', class:'Yr 11 Group B', subject:'GCSE Maths', set:'22 Apr', due:'27 Apr', submitted:2, total:7, marked:0, avgScore:null,status:'open'     },
  { id:4, title:'Statistics: Probability Trees',     class:'Yr 10 Group A', subject:'GCSE Maths', set:'22 Apr', due:'29 Apr', submitted:0, total:8, marked:0, avgScore:null,status:'open'     },
  { id:5, title:'Integration: Reverse Chain Rule',   class:'Yr 12 Group A', subject:'A-Level',    set:'15 Apr', due:'20 Apr', submitted:5, total:5, marked:5, avgScore:84,  status:'complete' },
  { id:6, title:'Quadratics: Completing the Square', class:'Yr 11 Group B', subject:'GCSE Maths', set:'14 Apr', due:'17 Apr', submitted:7, total:7, marked:7, avgScore:73,  status:'complete' },
];

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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
        {teacherClasses.map(cls => {
          const isOpen = expandedClass === cls.id;
          return (
            <div key={cls.id} style={{ background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'20px', borderTop:`3px solid ${cls.color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:DS.text, marginBottom:3 }}>{cls.name}</div>
                    <div style={{ fontSize:13, color:DS.muted }}>{cls.group}</div>
                  </div>
                  {cls.hwPending > 0 && (
                    <Badge variant="warning">{cls.hwPending} to mark</Badge>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                  {[
                    ['Students', cls.students, null],
                    ['Avg Score', cls.avgScore + '%', cls.avgScore > 80 ? DS.success : DS.warning],
                    ['Attendance', cls.attendance + '%', cls.attendance > 90 ? DS.success : DS.warning],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ padding:'10px', background:DS.surface, borderRadius:7, textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:700, color:c || DS.text }}>{v}</div>
                      <div style={{ fontSize:11, color:DS.muted, marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Icon name="clock" size={12} color={DS.faint} />
                  <span style={{ fontSize:12, color:DS.muted }}>Next: {cls.nextSession} · {cls.room}</span>
                  <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                    <Btn variant="secondary" small onClick={() => setExpandedClass(isOpen ? null : cls.id)}>
                      {isOpen ? 'Collapse' : 'Students'}
                    </Btn>
                    <Btn variant="primary" small>Take Attendance</Btn>
                  </div>
                </div>
              </div>

              {/* Student list expand */}
              {isOpen && (
                <div style={{ borderTop:`1px solid ${DS.border}` }}>
                  <div style={{ padding:'12px 16px', background:DS.surface, borderBottom:`1px solid ${DS.border}` }}>
                    <span style={{ fontSize:12, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      Student List
                    </span>
                  </div>
                  {cls.studentList.map((name, i) => (
                    <div key={name} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                      borderBottom: i < cls.studentList.length-1 ? `1px solid ${DS.border}` : 'none',
                    }}>
                      <Avatar name={name} size={28} />
                      <span style={{ flex:1, fontSize:13, color:DS.sub }}>{name}</span>
                      <Sparkline data={[70,72,74,71,76,78,79,80].map(v => v + Math.round(Math.random()*10-5))} color={cls.color} width={60} height={22} />
                      <Btn variant="ghost" icon="eye" small>Profile</Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Full Homework Management ───────────────────────────────────────────────────
const TeacherHomeworkPage = () => {
  const [tab, setTab] = React.useState('marking');
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newHw, setNewHw] = React.useState({ title:'', class:'', due:'', instructions:'' });
  const [saved, setSaved] = React.useState(false);

  const filtered = homeworkFull.filter(h =>
    tab === 'marking'  ? h.status === 'marking' :
    tab === 'open'     ? h.status === 'open' :
    h.status === 'complete'
  );

  const handleSave = () => {
    setSaved(true);
    setShowNewForm(false);
    setNewHw({ title:'', class:'', due:'', instructions:'' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="Homework"
        subtitle="Set, track, and mark all assignments"
        actions={[
          saved && <Badge key="s" variant="success">Assignment set!</Badge>,
          <Btn key="new" variant="primary" icon="plus" small onClick={() => setShowNewForm(!showNewForm)}>
            Set New Homework
          </Btn>,
        ].filter(Boolean)}
      />

      {/* New homework form */}
      {showNewForm && (
        <div style={{
          background:DS.bg, border:`1px solid ${DS.accentBorder}`,
          borderRadius:10, padding:'24px', marginBottom:24,
          background: DS.accentLight,
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
        {[['marking','To Mark',7],['open','Open',2],['complete','Complete',null]].map(([id,label,count]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:14, fontWeight: tab===id ? 600 : 400,
            color: tab===id ? DS.accent : DS.muted,
            borderBottom:`2px solid ${tab===id ? DS.accent : 'transparent'}`,
            marginBottom:-1, display:'flex', alignItems:'center', gap:7,
          }}>
            {label}
            {count && <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:10, background: id==='marking' ? DS.accent : DS.warning, color:'#fff' }}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Assignment cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map(hw => (
          <div key={hw.id} style={{ background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10, padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:4 }}>{hw.title}</div>
                <div style={{ fontSize:13, color:DS.muted }}>{hw.class} · {hw.subject} · Due {hw.due}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {hw.avgScore && <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color:DS.muted }}>Avg score</div>
                  <ScorePill score={hw.avgScore} />
                </div>}
                {hw.status === 'marking' && <Btn variant="primary" small>Mark submissions</Btn>}
                {hw.status === 'complete' && <Badge variant="success">Complete</Badge>}
                {hw.status === 'open' && <Badge variant="default">Awaiting submissions</Badge>}
              </div>
            </div>

            {/* Progress bar + stats */}
            <div style={{ display:'flex', gap:20, alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:DS.muted, marginBottom:5 }}>
                  <span>Submissions</span>
                  <span style={{ fontWeight:600, color:DS.text }}>{hw.submitted}/{hw.total}</span>
                </div>
                <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${(hw.submitted/hw.total)*100}%`, height:'100%', background: hw.submitted===hw.total ? DS.success : DS.accent, borderRadius:3 }} />
                </div>
              </div>
              {hw.status === 'marking' && (
                <div style={{ display:'flex', gap:16, fontSize:12, flexShrink:0 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontWeight:700, color:DS.success, fontSize:15 }}>{hw.marked}</div>
                    <div style={{ color:DS.muted }}>Marked</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontWeight:700, color:DS.warning, fontSize:15 }}>{hw.submitted - hw.marked}</div>
                    <div style={{ color:DS.muted }}>Pending</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontWeight:700, color:DS.faint, fontSize:15 }}>{hw.total - hw.submitted}</div>
                    <div style={{ color:DS.muted }}>Not submitted</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
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

// ─── Router ─────────────────────────────────────────────────────────────────────
const TeacherPages = ({ page }) => {
  if (page === 'classes')  return <TeacherClassesPage />;
  if (page === 'homework') return <TeacherHomeworkPage />;
  if (page === 'progress') return <TeacherProgressPage />;
  return null;
};

Object.assign(window, { TeacherPages });
