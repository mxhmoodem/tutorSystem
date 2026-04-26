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
            background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10,
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
              background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10,
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

// ─── Teacher Attendance Page ────────────────────────────────────────────────────
const teacherAllClasses = [
  { group:'Year 10 – Group A', subject:'GCSE Mathematics', students:['Emma Thompson','Oliver Chen','Sophia Patel','James Wilson','Aiden Foster','Mia Okonkwo','Liam Thornton','Zoe Patterson'] },
  { group:'Year 11 – Group B', subject:'GCSE Mathematics', students:['Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez','James Wilson','Sophia Patel','Emma Thompson'] },
  { group:'Year 12 – Group A', subject:'A-Level Mathematics', students:['Oliver Chen','Isabella Martinez','Ethan Huang','Mia Okonkwo','Aiden Foster'] },
  { group:'Year 9 – Group C',  subject:'GCSE Mathematics', students:['Mia Okonkwo','Aiden Foster','Emma Thompson','Sophia Patel','James Wilson','Amelia Roberts','Noah Fitzgerald','Ethan Huang','Isabella Martinez'] },
];

const TeacherAttendancePage = () => {
  const [selectedClass, setSelectedClass] = React.useState(0);
  const cls = teacherAllClasses[selectedClass];
  const [records, setRecords] = React.useState(() =>
    Object.fromEntries(cls.students.map(n => [n, null]))
  );
  const [saved, setSaved] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState('2026-04-25');

  React.useEffect(() => {
    setRecords(Object.fromEntries(cls.students.map(n => [n, null])));
    setSaved(false);
  }, [selectedClass]);

  const mark = (name, status) => { setRecords(p => ({...p, [name]:status})); setSaved(false); };
  const markAll = (status) => { setRecords(Object.fromEntries(cls.students.map(n => [n, status]))); setSaved(false); };
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

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

// ─── Teacher AI Feedback Page ───────────────────────────────────────────────────
const aiQueueFull = [
  { student:'Oliver Chen',        hw:'Calculus: Differentiation Basics',  subject:'A-Level Maths', submitted:'2h ago',    confidence:92, score:94, draft:'Excellent work — your chain rule application is correct. Consider showing intermediate steps for full marks in the exam.', strengths:['All 6 questions correct','Clear working shown','Good notation throughout'], issues:['Show intermediate steps on Q4 expansion'] },
  { student:'Sophia Patel',       hw:'Calculus: Differentiation Basics',  subject:'A-Level Maths', submitted:'3h ago',    confidence:85, score:74, draft:'Good attempt. You have the right method but made an arithmetic error in step 3 — check your sign when expanding the bracket.', strengths:['Correct method applied','Good attempt at product rule'], issues:['Sign error in bracket expansion on Q3','Notation unclear on Q5'] },
  { student:'Ethan Huang',        hw:'Calculus: Differentiation Basics',  subject:'A-Level Maths', submitted:'5h ago',    confidence:88, score:83, draft:'Strong understanding. Notation could be cleaner — write dy/dx clearly throughout.', strengths:['Strong conceptual understanding','Correct answers on Q1–Q4'], issues:['Cleaner dy/dx notation needed','Q5 missing second derivative step'] },
  { student:'Isabella Martinez',  hw:'Calculus: Differentiation Basics',  subject:'A-Level Maths', submitted:'Yesterday', confidence:95, score:96, draft:'Flawless. All six questions correct with clear working shown. Well done.', strengths:['Perfect score — all 6 correct','Exemplary working shown','Great exam technique'], issues:[] },
  { student:'Emma Thompson',      hw:'Algebra: Simultaneous Equations',   subject:'GCSE Maths',    submitted:'Yesterday', confidence:83, score:78, draft:'Good work overall. The substitution method is well applied. Small arithmetic error on Q3 — double-check before submitting in an exam.', strengths:['Correct method throughout','Good presentation'], issues:['Arithmetic error on Q3','Check signs when substituting negative values'] },
  { student:'Aiden Foster',       hw:'Algebra: Simultaneous Equations',   subject:'GCSE Maths',    submitted:'2 days ago',confidence:79, score:71, draft:'Solid attempt. You understood the elimination method well but struggled with Q4 which had fractional coefficients. Practice these — they appear often in GCSE papers.', strengths:['Elimination method applied correctly','Neat working'], issues:['Fractional coefficients caused errors on Q4 and Q5','Review multiplying equations by fractions'] },
];

const TeacherAIFeedbackPage = () => {
  const [expanded, setExpanded] = React.useState(null);
  const [editMap, setEditMap]   = React.useState({});
  const [sentSet, setSentSet]   = React.useState(new Set());
  const [filter, setFilter]     = React.useState('all');

  const filtered = aiQueueFull.filter(item =>
    filter === 'all'  ? true :
    filter === 'sent' ? sentSet.has(item.student + item.hw) :
    !sentSet.has(item.student + item.hw)
  );

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="AI Feedback Queue" subtitle="Review, edit and send AI-drafted feedback to students" actions={[
        <div key="badge" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:DS.accent, fontWeight:600 }}>
          <Icon name="brain" size={14} />
          {aiQueueFull.length - sentSet.size} awaiting review
        </div>
      ]} />

      {/* How it works */}
      <div style={{ background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, borderRadius:10, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:14 }}>
        <Icon name="brain" size={20} color={DS.accent} />
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:DS.accent, marginBottom:3 }}>How AI Feedback works</div>
          <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6 }}>
            When a student submits homework, TutorOS AI analyses their answers and generates a personalised feedback draft. You review, edit if needed, and send — it typically takes under 30 seconds per student.
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[['all','All'],['pending','Pending'],['sent','Sent']].map(([id,label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding:'7px 14px', borderRadius:7, border:`1px solid ${filter===id ? DS.accentBorder : DS.border}`,
            background: filter===id ? DS.accentLight : DS.bg,
            color: filter===id ? DS.accent : DS.muted,
            fontSize:13, fontWeight: filter===id ? 600 : 400, cursor:'pointer',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map((item, i) => {
          const key = item.student + item.hw;
          const isOpen = expanded === key;
          const isSent = sentSet.has(key);
          const feedbackText = editMap[key] !== undefined ? editMap[key] : item.draft;
          const confColor = item.confidence >= 90 ? DS.success : item.confidence >= 80 ? DS.warning : DS.danger;

          return (
            <div key={key} style={{ background:DS.bg, border:`1px solid ${isSent ? DS.successBorder : DS.border}`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }} onClick={() => setExpanded(isOpen ? null : key)}>
                <Avatar name={item.student} size={36} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{item.student}</div>
                  <div style={{ fontSize:12, color:DS.muted }}>{item.hw} · {item.subject}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <span style={{ fontSize:12, color:DS.faint }}>{item.submitted}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:confColor }} />
                    <span style={{ fontSize:11, color:DS.muted }}>{item.confidence}% confidence</span>
                  </div>
                  <ScorePill score={item.score} />
                  {isSent ? <Badge variant="success">Sent</Badge> : <Badge variant="accent">Draft ready</Badge>}
                  <Icon name={isOpen ? 'chevron_d' : 'chevron_r'} size={14} color={DS.faint} />
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop:`1px solid ${DS.border}`, padding:'20px' }}>
                  {/* Strengths & Issues */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:DS.success, marginBottom:8 }}>✓ STRENGTHS DETECTED</div>
                      {item.strengths.map((s,si) => (
                        <div key={si} style={{ fontSize:12, color:DS.sub, padding:'5px 10px', background:DS.successBg, borderRadius:6, border:`1px solid ${DS.successBorder}`, marginBottom:5 }}>{s}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:DS.warning, marginBottom:8 }}>
                        {item.issues.length > 0 ? '⚠ AREAS TO IMPROVE' : '✓ NO ISSUES FOUND'}
                      </div>
                      {item.issues.length > 0
                        ? item.issues.map((s,si) => (
                          <div key={si} style={{ fontSize:12, color:DS.sub, padding:'5px 10px', background:DS.warningBg, borderRadius:6, border:`1px solid ${DS.warningBorder}`, marginBottom:5 }}>{s}</div>
                        ))
                        : <div style={{ fontSize:12, color:DS.success, fontStyle:'italic' }}>All questions answered correctly.</div>
                      }
                    </div>
                  </div>

                  {/* Draft text */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:DS.accent, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                      <Icon name="brain" size={11} /> AI DRAFT — EDIT BEFORE SENDING
                    </div>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={e => setEditMap(p => ({...p, [key]:e.target.value}))}
                      disabled={isSent}
                      style={{
                        width:'100%', padding:'10px 12px', borderRadius:8,
                        border:`1px solid ${DS.border}`, fontSize:13, color:DS.sub, lineHeight:1.65,
                        background: isSent ? DS.surface : DS.bg,
                        resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
                      }}
                    />
                  </div>
                  {!isSent && (
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn variant="primary" icon="check" onClick={() => { setSentSet(p => new Set([...p, key])); setExpanded(null); }}>
                        Send to student
                      </Btn>
                      <Btn variant="secondary" icon="edit">Edit draft</Btn>
                      <Btn variant="ghost" icon="x">Discard draft</Btn>
                    </div>
                  )}
                  {isSent && <Badge variant="success">Feedback sent to student</Badge>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────────
const TeacherPages = ({ page }) => {
  if (page === 'classes')    return <TeacherClassesPage />;
  if (page === 'homework')   return <TeacherHomeworkPage />;
  if (page === 'progress')   return <TeacherProgressPage />;
  if (page === 'attendance') return <TeacherAttendancePage />;
  if (page === 'ai_queue')   return <TeacherAIFeedbackPage />;
  return null;
};

Object.assign(window, { TeacherPages });
