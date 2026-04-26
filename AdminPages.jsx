// ══════════════════════════════════════════════════════════════
//  TutorOS — Extra Admin Pages
// ══════════════════════════════════════════════════════════════

const allStudents = [
  { name:'Emma Thompson',    year:'Yr 10', subjects:['Mathematics','English'],     attendance:91, hw:82, score:76, status:'active',   teacher:'Ms. Clarke / Mr. Webb',  lastSeen:'Today'     },
  { name:'Oliver Chen',      year:'Yr 12', subjects:['Mathematics','Further Maths','Physics'], attendance:98, hw:96, score:94, status:'active', teacher:'Ms. Clarke / Mr. Park', lastSeen:'Today' },
  { name:'Sophia Patel',     year:'Yr 10', subjects:['Mathematics'],              attendance:88, hw:74, score:68, status:'active',   teacher:'Ms. Clarke',             lastSeen:'Yesterday' },
  { name:'James Wilson',     year:'Yr 11', subjects:['Mathematics','Science'],    attendance:85, hw:71, score:71, status:'active',   teacher:'Ms. Clarke / Ms. Nair',  lastSeen:'Yesterday' },
  { name:'Amelia Roberts',   year:'Yr 11', subjects:['English Literature'],       attendance:76, hw:35, score:52, status:'at-risk',  teacher:'Mr. Webb',               lastSeen:'14 Apr'    },
  { name:'Noah Fitzgerald',  year:'Yr 10', subjects:['Mathematics','Science'],    attendance:68, hw:48, score:55, status:'at-risk',  teacher:'Ms. Clarke / Ms. Nair',  lastSeen:'8 Apr'     },
  { name:'Isabella Martinez',year:'Yr 12', subjects:['Mathematics','Further Maths'], attendance:97, hw:95, score:91, status:'active', teacher:'Ms. Clarke',            lastSeen:'Today'     },
  { name:'Ethan Huang',      year:'Yr 11', subjects:['Mathematics','Physics'],   attendance:93, hw:88, score:83, status:'active',   teacher:'Ms. Clarke / Mr. Park',  lastSeen:'Today'     },
  { name:'Mia Okonkwo',      year:'Yr 9',  subjects:['Science','English'],        attendance:95, hw:90, score:79, status:'active',   teacher:'Ms. Nair / Mr. Webb',    lastSeen:'Yesterday' },
  { name:'Liam Thornton',    year:'Yr 10', subjects:['Science','Chemistry'],      attendance:82, hw:62, score:63, status:'at-risk',  teacher:'Ms. Nair',               lastSeen:'17 Apr'    },
  { name:'Zoe Patterson',    year:'Yr 11', subjects:['Chemistry','Biology'],      attendance:79, hw:44, score:61, status:'at-risk',  teacher:'Mr. Park',               lastSeen:'10 Apr'    },
  { name:'Aiden Foster',     year:'Yr 9',  subjects:['Mathematics'],              attendance:94, hw:85, score:81, status:'active',   teacher:'Ms. Clarke',             lastSeen:'Today'     },
];

// ─── Students List ─────────────────────────────────────────────────────────────
const AdminStudentsPage = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  const filtered = allStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.subjects.some(sub => sub.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || filter === s.status ||
      (filter === 'active' && s.status === 'active');
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="Students"
        subtitle={`${allStudents.length} enrolled · ${allStudents.filter(s=>s.status==='at-risk').length} at risk`}
        actions={[
          <Btn key="export" variant="secondary" icon="download" small>Export CSV</Btn>,
          <Btn key="add"    variant="primary"   icon="plus"     small>Add Student</Btn>,
        ]}
      />

      {/* Filters + search */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <div style={{
          flex:1, display:'flex', alignItems:'center', gap:8,
          background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:8, padding:'8px 12px',
        }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or subject…"
            style={{ border:'none', outline:'none', fontSize:14, color:DS.text, flex:1, background:'transparent' }}
          />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['active','Active'],['at-risk','At risk']].map(([id,label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding:'7px 14px', borderRadius:7, border:`1px solid ${filter===id ? DS.accentBorder : DS.border}`,
              background: filter===id ? DS.accentLight : DS.bg,
              color: filter===id ? DS.accent : DS.muted,
              fontSize:13, fontWeight: filter===id ? 600 : 400, cursor:'pointer',
            }}>{label}
            {id !== 'all' && <span style={{ marginLeft:5, fontSize:11, opacity:0.7 }}>
              {id === 'active' ? allStudents.filter(s=>s.status==='active').length : allStudents.filter(s=>s.status==='at-risk').length}
            </span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20 }}>
        <Card>
          <Table
            cols={['Student','Year','Subjects','Attendance','HW %','Avg Score','Status','Actions']}
            rows={filtered.map(s => [
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={s.name} size={30} />
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{s.name}</div>
                  <div style={{ fontSize:11, color:DS.faint }}>Last seen {s.lastSeen}</div>
                </div>
              </div>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {s.subjects.slice(0,2).map(sub => (
                  <span key={sub} style={{ fontSize:11, padding:'2px 6px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:4, color:DS.sub }}>{sub}</span>
                ))}
                {s.subjects.length > 2 && <span style={{ fontSize:11, color:DS.faint }}>+{s.subjects.length-2}</span>}
              </div>,
              <span style={{ fontSize:13, color: s.attendance < 80 ? DS.danger : s.attendance < 90 ? DS.warning : DS.success, fontWeight:600 }}>{s.attendance}%</span>,
              <span style={{ fontSize:13, color: s.hw < 50 ? DS.danger : s.hw < 70 ? DS.warning : DS.success, fontWeight:600 }}>{s.hw}%</span>,
              <ScorePill score={s.score} />,
              <Badge variant={s.status === 'at-risk' ? 'danger' : 'success'}>
                {s.status === 'at-risk' ? 'At risk' : 'Active'}
              </Badge>,
              <div style={{ display:'flex', gap:6 }}>
                <Btn variant="secondary" small onClick={() => setSelected(s === selected ? null : s)}>Profile</Btn>
                <Btn variant="ghost" icon="message" small>Message</Btn>
              </div>,
            ])}
          />
        </Card>

        {selected && (
          <Card title={selected.name} actions={[
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:DS.muted }}>
              <Icon name="x" size={16} />
            </button>
          ]}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <Avatar name={selected.name} size={44} />
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{selected.name}</div>
                  <div style={{ fontSize:13, color:DS.muted }}>{selected.year} · {selected.status === 'at-risk' ? '⚠ At risk' : 'Active'}</div>
                </div>
              </div>
              {[
                ['Subjects', selected.subjects.join(', ')],
                ['Teacher(s)', selected.teacher],
                ['Attendance', `${selected.attendance}%`],
                ['HW Completion', `${selected.hw}%`],
                ['Average Score', `${selected.score}%`],
                ['Last Seen', selected.lastSeen],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
                  <span style={{ color:DS.muted }}>{l}</span>
                  <span style={{ color:DS.text, fontWeight:500, textAlign:'right', maxWidth:180 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
                <Btn variant="primary" icon="chart">View Full Profile</Btn>
                <Btn variant="secondary" icon="message">Message Teacher</Btn>
                <Btn variant="secondary" icon="download">Export Report</Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Reports Page ───────────────────────────────────────────────────────────────
const AdminReportsPage = () => {
  const [reportType, setReportType] = React.useState('progress');
  const [selectedClass, setSelectedClass] = React.useState('all');
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);
  const [previewStudent, setPreviewStudent] = React.useState(allStudents[1]);

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800);
  };

  const reportTypes = [
    { id:'progress',   label:'Student Progress Report', desc:'Per-student scores, attendance, predicted grades — suitable for sharing with parents' },
    { id:'attendance', label:'Attendance Summary',       desc:'Weekly/term attendance breakdown by class and teacher' },
    { id:'homework',   label:'Homework Completion',      desc:'Submission rates and score averages per assignment' },
    { id:'financial',  label:'Financial Overview',       desc:'Revenue, outstanding invoices, enrolment numbers' },
  ];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Reports" subtitle="Generate and export progress reports for students, parents, and stakeholders" />

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:24 }}>
        {/* Config panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card title="Report Type">
            <div style={{ padding:'8px 0' }}>
              {reportTypes.map((rt, i) => (
                <div
                  key={rt.id}
                  onClick={() => setReportType(rt.id)}
                  style={{
                    padding:'12px 16px', cursor:'pointer',
                    borderBottom: i < reportTypes.length-1 ? `1px solid ${DS.border}` : 'none',
                    background: reportType === rt.id ? DS.accentLight : 'transparent',
                    borderLeft: `3px solid ${reportType === rt.id ? DS.accent : 'transparent'}`,
                  }}
                >
                  <div style={{ fontSize:13, fontWeight: reportType===rt.id ? 600 : 500, color: reportType===rt.id ? DS.accent : DS.text }}>{rt.label}</div>
                  <div style={{ fontSize:12, color:DS.muted, marginTop:2, lineHeight:1.5 }}>{rt.desc}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Filters">
            <div style={{ padding:'16px' }}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Class / Group</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, color:DS.text, background:DS.bg, outline:'none' }}
                >
                  <option value="all">All students</option>
                  <option value="yr10">Year 10</option>
                  <option value="yr11">Year 11</option>
                  <option value="yr12">Year 12</option>
                  <option value="maths">GCSE Mathematics</option>
                  <option value="alevelmaths">A-Level Maths</option>
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Period</label>
                <select style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, color:DS.text, background:DS.bg, outline:'none' }}>
                  <option>Spring Term 2026</option>
                  <option>Autumn Term 2025</option>
                  <option>Summer Term 2025</option>
                </select>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:6 }}>Include</label>
                {['Scores & grades','Attendance data','Teacher comments','AI feedback summary','Predicted grade'].map(opt => (
                  <label key={opt} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, cursor:'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: DS.accent }} />
                    <span style={{ fontSize:13, color:DS.sub }}>{opt}</span>
                  </label>
                ))}
              </div>
              <Btn variant="primary" icon={generating ? 'clock' : 'download'} onClick={handleGenerate}>
                {generating ? 'Generating…' : 'Generate Report'}
              </Btn>
              {generated && (
                <div style={{ marginTop:10 }}>
                  <Badge variant="success">Report ready — 12 students</Badge>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card title="Preview — Student Progress Report" actions={[
            <div key="sel" style={{ display:'flex', gap:6 }}>
              {allStudents.slice(0,4).map(s => (
                <button key={s.name} onClick={() => setPreviewStudent(s)} style={{
                  width:28, height:28, borderRadius:'50%', border:`2px solid ${previewStudent===s ? DS.accent : 'transparent'}`,
                  cursor:'pointer', background:'none', padding:0,
                }}>
                  <Avatar name={s.name} size={24} />
                </button>
              ))}
            </div>
          ]}>
            {/* Simulated report document */}
            <div style={{ padding:'28px 32px', background:'#FAFAFA', minHeight:480 }}>
              {/* Report header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, paddingBottom:16, borderBottom:`2px solid ${DS.border}` }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:22, height:22, background:DS.accent, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ color:'#fff', fontWeight:800, fontSize:11 }}>T</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:DS.text }}>TutorOS</span>
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:DS.text, letterSpacing:'-0.3px' }}>Student Progress Report</div>
                  <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>Spring Term 2026 · Generated 25 April 2026</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>Confidential</div>
                  <div style={{ fontSize:12, color:DS.muted }}>For parent / guardian use</div>
                </div>
              </div>

              {/* Student info */}
              <div style={{ display:'flex', gap:20, marginBottom:24 }}>
                <Avatar name={previewStudent.name} size={52} />
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:DS.text }}>{previewStudent.name}</div>
                  <div style={{ fontSize:13, color:DS.muted }}>{previewStudent.year} · {previewStudent.subjects.join(', ')}</div>
                  <div style={{ fontSize:12, color:DS.faint, marginTop:2 }}>Teacher: {previewStudent.teacher}</div>
                </div>
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ fontSize:28, fontWeight:800, color: previewStudent.status==='at-risk' ? DS.danger : DS.success }}>{previewStudent.score}%</div>
                  <div style={{ fontSize:11, color:DS.muted }}>Average score</div>
                </div>
              </div>

              {/* Summary stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
                {[
                  ['Attendance',     previewStudent.attendance + '%', previewStudent.attendance > 90 ? DS.success : DS.warning],
                  ['HW Completion',  previewStudent.hw + '%',         previewStudent.hw > 75 ? DS.success : DS.warning],
                  ['Overall Status', previewStudent.status === 'at-risk' ? 'Needs Support' : 'On Track', previewStudent.status==='at-risk' ? DS.danger : DS.success],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ padding:'12px 14px', background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:8 }}>
                    <div style={{ fontSize:11, color:DS.muted, marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Teacher comment */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:DS.muted, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Teacher Comment</div>
                <div style={{ fontSize:13, color:DS.sub, lineHeight:1.7, padding:'12px 14px', background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:8, fontStyle:'italic' }}>
                  "{previewStudent.status === 'at-risk'
                    ? `${previewStudent.name.split(' ')[0]} has shown effort this term but attendance has impacted progress. We recommend reviewing missed sessions and establishing a regular revision schedule at home.`
                    : `${previewStudent.name.split(' ')[0]} has made excellent progress this term. Their engagement in class is strong, and recent scores reflect solid preparation. Keep up the great work going into the mock exams.`}"
                </div>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="primary" icon="download" small>Download PDF</Btn>
                <Btn variant="secondary" icon="message" small>Email to Parent</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Admin Classes Page ─────────────────────────────────────────────────────────
const AdminClassesPage = () => {
  const classes = [
    { name:'GCSE Mathematics',    group:'Year 10 – Group A', teacher:'Ms. Sarah Clarke',  day:'Friday',    time:'09:00–10:30', room:'Room 3', students:8,  status:'active' },
    { name:'GCSE Mathematics',    group:'Year 11 – Group B', teacher:'Ms. Sarah Clarke',  day:'Friday',    time:'10:30–12:00', room:'Room 3', students:7,  status:'active' },
    { name:'A-Level Mathematics', group:'Year 12 – Group A', teacher:'Ms. Sarah Clarke',  day:'Friday',    time:'13:00–14:30', room:'Room 5', students:5,  status:'active' },
    { name:'GCSE Mathematics',    group:'Year 9 – Group C',  teacher:'Ms. Sarah Clarke',  day:'Friday',    time:'15:00–16:30', room:'Room 3', students:9,  status:'active' },
    { name:'GCSE Science',        group:'Year 10 – Group A', teacher:'Ms. Priya Nair',    day:'Wednesday', time:'09:00–10:30', room:'Room 6', students:11, status:'active' },
    { name:'GCSE Science',        group:'Year 11 – Group A', teacher:'Ms. Priya Nair',    day:'Wednesday', time:'11:00–12:30', room:'Room 6', students:8,  status:'active' },
    { name:'A-Level Chemistry',   group:'Year 12 – Group A', teacher:'Mr. David Park',    day:'Thursday',  time:'10:00–11:30', room:'Room 7', students:6,  status:'active' },
    { name:'GCSE English Lit.',   group:'Year 10 – Group A', teacher:'Mr. Marcus Webb',   day:'Tuesday',   time:'14:00–15:30', room:'Room 2', students:10, status:'active' },
    { name:'GCSE History',        group:'Year 11 – Group B', teacher:'Ms. Helen Yoo',     day:'Monday',    time:'09:00–10:30', room:'Room 4', students:7,  status:'paused' },
  ];

  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase()) ||
    c.group.toLowerCase().includes(search.toLowerCase())
  );

  const subjectColors = {
    'GCSE Mathematics': DS.accent, 'A-Level Mathematics': '#7C3AED',
    'GCSE Science': '#0891B2', 'A-Level Chemistry': '#0D9488',
    'GCSE English Lit.': '#D97706', 'GCSE History': '#DC2626',
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Classes" subtitle={`${classes.length} classes across ${[...new Set(classes.map(c=>c.teacher))].length} teachers`} actions={[
        <Btn key="new" variant="primary" icon="plus" small onClick={() => setShowNew(!showNew)}>New Class</Btn>
      ]} />

      {showNew && (
        <div style={{ background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, borderRadius:10, padding:'24px', marginBottom:24 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Create New Class</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:14 }}>
            {[['Subject / Name','e.g. GCSE Mathematics'],['Group','e.g. Year 10 – Group A'],['Room','e.g. Room 3'],['Max students','e.g. 10']].map(([l,p]) => (
              <div key={l}>
                <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:5 }}>{l}</label>
                <input placeholder={p} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
            {[['Day','select'],['Time','e.g. 09:00–10:30'],['Teacher','select']].map(([l,t]) => (
              <div key={l}>
                <label style={{ fontSize:12, fontWeight:600, color:DS.sub, display:'block', marginBottom:5 }}>{l}</label>
                <input placeholder={t} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:`1px solid ${DS.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" icon="check" onClick={() => setShowNew(false)}>Create Class</Btn>
            <Btn variant="secondary" onClick={() => setShowNew(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:8, padding:'8px 12px' }}>
          <Icon name="search" size={14} color={DS.faint} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classes, teachers, groups…"
            style={{ border:'none', outline:'none', fontSize:14, color:DS.text, flex:1, background:'transparent' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {filtered.map((cls, i) => {
          const color = subjectColors[cls.name] || DS.accent;
          return (
            <div key={i} style={{ background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden', borderTop:`3px solid ${color}` }}>
              <div style={{ padding:'18px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:2 }}>{cls.name}</div>
                    <div style={{ fontSize:12, color:DS.muted }}>{cls.group}</div>
                  </div>
                  <Badge variant={cls.status === 'paused' ? 'warning' : 'success'}>{cls.status}</Badge>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                  {[[  'user', cls.teacher],[  'calendar', `${cls.day} · ${cls.time}`],[  'home', `${cls.room} · ${cls.students} students`]].map(([icon, text]) => (
                    <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:DS.muted }}>
                      <Icon name={icon} size={13} color={DS.faint} />
                      {text}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="secondary" small>View Students</Btn>
                  <Btn variant="ghost" icon="edit" small>Edit</Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Admin Teachers Page ────────────────────────────────────────────────────────
const AdminTeachersPage = () => {
  const teachers = [
    { name:'Sarah Clarke',  subject:'Mathematics',        classes:4, students:29, hwToMark:7, attendance:96, rating:4.9, joined:'Sep 2023', email:'s.clarke@centre.co.uk',  color:'#4F46E5' },
    { name:'Priya Nair',    subject:'Science / Biology',  classes:2, students:19, hwToMark:3, attendance:98, rating:4.8, joined:'Jan 2024', email:'p.nair@centre.co.uk',    color:'#0891B2' },
    { name:'David Park',    subject:'Chemistry / Physics',classes:2, students:14, hwToMark:2, attendance:95, rating:4.7, joined:'Sep 2022', email:'d.park@centre.co.uk',    color:'#0D9488' },
    { name:'Marcus Webb',   subject:'English Literature', classes:1, students:10, hwToMark:4, attendance:92, rating:4.6, joined:'Sep 2023', email:'m.webb@centre.co.uk',    color:'#D97706' },
    { name:'Helen Yoo',     subject:'History / RS',       classes:1, students:7,  hwToMark:0, attendance:97, rating:4.8, joined:'Feb 2024', email:'h.yoo@centre.co.uk',     color:'#DC2626' },
  ];
  const [selected, setSelected] = React.useState(null);

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Teachers" subtitle={`${teachers.length} active teachers`} actions={[
        <Btn key="inv" variant="primary" icon="plus" small>Invite Teacher</Btn>
      ]} />

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, alignContent:'start' }}>
          {teachers.map((t,i) => (
            <div key={i} onClick={() => setSelected(t === selected ? null : t)} style={{
              background:DS.bg, border:`1px solid ${t === selected ? DS.accentBorder : DS.border}`,
              borderRadius:10, padding:'20px', cursor:'pointer',
              boxShadow: t === selected ? `0 0 0 2px ${DS.accentLight}` : 'none',
              transition:'all 0.12s',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                <Avatar name={t.name} size={44} color={t.color} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:DS.text }}>{t.name}</div>
                  <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>{t.subject}</div>
                  <div style={{ fontSize:11, color:DS.faint, marginTop:1 }}>Since {t.joined}</div>
                </div>
                {t.hwToMark > 0 && <Badge variant="warning">{t.hwToMark} to mark</Badge>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['Classes',t.classes,null],['Students',t.students,null],['Attendance',t.attendance+'%', t.attendance>95?DS.success:DS.warning]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:'center', padding:'8px', background:DS.surface, borderRadius:7 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:c||DS.text }}>{v}</div>
                    <div style={{ fontSize:11, color:DS.muted }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <Card title={selected.name} actions={[
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:DS.muted }}>
              <Icon name="x" size={16} />
            </button>
          ]}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <Avatar name={selected.name} size={52} color={selected.color} />
                <div>
                  <div style={{ fontSize:16, fontWeight:700 }}>{selected.name}</div>
                  <div style={{ fontSize:13, color:DS.muted }}>{selected.subject}</div>
                  <div style={{ fontSize:12, color:DS.faint }}>{selected.email}</div>
                </div>
              </div>
              {[['Classes', selected.classes],['Students', selected.students],['HW to mark', selected.hwToMark],['Attendance rate', selected.attendance+'%'],['Rating', `${selected.rating} / 5`],['Joined', selected.joined]].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
                  <span style={{ color:DS.muted }}>{l}</span>
                  <span style={{ fontWeight:500, color:DS.text }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
                <Btn variant="primary" icon="message">Send Message</Btn>
                <Btn variant="secondary" icon="book">View Classes</Btn>
                <Btn variant="secondary" icon="chart">Performance Report</Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Admin Invoices Page ────────────────────────────────────────────────────────
const AdminInvoicesPage = () => {
  const invoices = [
    { id:'INV-0284', student:'Oliver Chen',      family:'Chen family',      amount:320, status:'sent',    due:'30 Apr', issued:'15 Apr', classes:['A-Level Maths','Further Maths'] },
    { id:'INV-0283', student:'Emma Thompson',     family:'Thompson family',  amount:180, status:'paid',    due:'30 Apr', issued:'15 Apr', classes:['GCSE Mathematics'] },
    { id:'INV-0282', student:'Sophia Patel',      family:'Patel family',     amount:180, status:'paid',    due:'30 Apr', issued:'15 Apr', classes:['GCSE Mathematics'] },
    { id:'INV-0281', student:'Amelia Roberts',    family:'Roberts family',   amount:180, status:'overdue', due:'15 Apr', issued:'1 Apr',  classes:['GCSE English Lit.'] },
    { id:'INV-0280', student:'Noah Fitzgerald',   family:'Fitzgerald family',amount:360, status:'overdue', due:'15 Apr', issued:'1 Apr',  classes:['GCSE Mathematics','GCSE Science'] },
    { id:'INV-0279', student:'Isabella Martinez', family:'Martinez family',  amount:320, status:'paid',    due:'15 Apr', issued:'1 Apr',  classes:['A-Level Maths','Further Maths'] },
    { id:'INV-0278', student:'Ethan Huang',       family:'Huang family',     amount:360, status:'paid',    due:'15 Apr', issued:'1 Apr',  classes:['GCSE Mathematics','Physics'] },
    { id:'INV-0277', student:'James Wilson',      family:'Wilson family',    amount:360, status:'sent',    due:'30 Apr', issued:'15 Apr', classes:['GCSE Mathematics','GCSE Science'] },
  ];

  const [filter, setFilter] = React.useState('all');
  const [showNew, setShowNew] = React.useState(false);

  const filtered = invoices.filter(inv => filter === 'all' || inv.status === filter);
  const totalOutstanding = invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+i.amount,0);
  const totalOverdue     = invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.amount,0);
  const totalPaid        = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0);

  const statusVariant = { paid:'success', sent:'accent', overdue:'danger' };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Invoices" subtitle="Track payments, send reminders, and manage billing" actions={[
        <Btn key="exp" variant="secondary" icon="download" small>Export CSV</Btn>,
        <Btn key="new" variant="primary" icon="plus" small onClick={() => setShowNew(!showNew)}>New Invoice</Btn>,
      ]} />

      {/* Summary KPIs */}
      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        <KPICard label="Outstanding" value={`£${totalOutstanding}`} sub={`${invoices.filter(i=>i.status!=='paid').length} invoices`} icon="invoice" iconBg={DS.warningBg} accent={DS.warning} />
        <KPICard label="Overdue"     value={`£${totalOverdue}`}    sub={`${invoices.filter(i=>i.status==='overdue').length} invoices`} icon="alert"   iconBg={DS.dangerBg}  accent={DS.danger}  trendDir="down" trend="Action needed" />
        <KPICard label="Paid this month" value={`£${totalPaid}`}   sub={`${invoices.filter(i=>i.status==='paid').length} invoices`}   icon="check"   iconBg={DS.successBg} accent={DS.success} trendDir="up"   trend="On track" />
        <KPICard label="Total billed" value={`£${invoices.reduce((s,i)=>s+i.amount,0)}`} sub="This cycle" icon="chart" iconBg={DS.accentLight} accent={DS.accent} />
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[['all','All'],['sent','Sent'],['overdue','Overdue'],['paid','Paid']].map(([id,label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding:'7px 14px', borderRadius:7, border:`1px solid ${filter===id ? DS.accentBorder : DS.border}`,
            background: filter===id ? DS.accentLight : DS.bg,
            color: filter===id ? DS.accent : DS.muted,
            fontSize:13, fontWeight: filter===id ? 600 : 400, cursor:'pointer',
          }}>{label}</button>
        ))}
      </div>

      <Card>
        <Table
          cols={['Invoice','Student / Family','Classes','Amount','Issued','Due','Status','Actions']}
          rows={filtered.map(inv => [
            <span style={{ fontSize:13, fontWeight:600, color:DS.text, fontVariantNumeric:'tabular-nums' }}>{inv.id}</span>,
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{inv.student}</div>
              <div style={{ fontSize:11, color:DS.muted }}>{inv.family}</div>
            </div>,
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {inv.classes.map(c => <span key={c} style={{ fontSize:11, color:DS.muted }}>{c}</span>)}
            </div>,
            <span style={{ fontSize:14, fontWeight:700, color:DS.text }}>£{inv.amount}</span>,
            <span style={{ fontSize:13, color:DS.muted }}>{inv.issued}</span>,
            <span style={{ fontSize:13, color:inv.status==='overdue' ? DS.danger : DS.muted, fontWeight: inv.status==='overdue' ? 600 : 400 }}>{inv.due}</span>,
            <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>,
            <div style={{ display:'flex', gap:6 }}>
              {inv.status !== 'paid' && <Btn variant="primary" small>Send Reminder</Btn>}
              <Btn variant="ghost" icon="eye" small>View</Btn>
            </div>,
          ])}
        />
      </Card>
    </div>
  );
};

// ─── Admin Schedule Page ────────────────────────────────────────────────────────
const AdminSchedulePage = () => {
  const slots = ['09:00', '10:15', '11:30', '13:00', '14:15', '15:30'];
  const days  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // colour palette by subject
  const palette = {
    'Mathematics':   { c:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
    'Further Maths': { c:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
    'Maths':         { c:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
    'Chemistry':     { c:'#4F46E5', bg:'#EEF2FF', border:'#C7D2FE' },
    'Physics':       { c:'#4F46E5', bg:'#EEF2FF', border:'#C7D2FE' },
    'Biology':       { c:'#9333EA', bg:'#FAF5FF', border:'#E9D5FF' },
    'English':       { c:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
    'History':       { c:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
    'CS':            { c:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  };

  // grid cells keyed as `${day}|${time}`
  const sessions = {
    'Monday|09:00':    { subject:'Mathematics',   teacher:'Mr Davies',  room:'3A',     year:'Yr 11' },
    'Monday|10:15':    { subject:'Further Maths', teacher:'Mr Davies',  room:'3A',     year:'Yr 12' },
    'Tuesday|09:00':   { subject:'Chemistry',     teacher:'Dr Patel',   room:'Lab 1',  year:'Yr 12' },
    'Tuesday|11:30':   { subject:'Biology',       teacher:'Ms Chen',    room:'Lab 3',  year:'Yr 10' },
    'Tuesday|14:15':   { subject:'Mathematics',   teacher:'Mr Davies',  room:'3A',     year:'Yr 10' },
    'Wednesday|09:00': { subject:'English',       teacher:'Mr Harrison',room:'2B',     year:'Yr 11' },
    'Wednesday|10:15': { subject:'Physics',       teacher:'Dr Patel',   room:'Lab 2',  year:'Yr 12' },
    'Wednesday|13:00': { subject:'Further Maths', teacher:'Mr Davies',  room:'3A',     year:'Yr 13' },
    'Thursday|09:00':  { subject:'Biology',       teacher:'Ms Chen',    room:'Lab 3',  year:'Yr 13' },
    'Thursday|11:30':  { subject:'Mathematics',   teacher:'Mr Davies',  room:'3A',     year:'Yr 12' },
    'Thursday|15:30':  { subject:'CS',            teacher:'Ms O’Brien', room:'IT Suite', year:'Yr 11' },
    'Friday|10:15':    { subject:'Chemistry',     teacher:'Dr Patel',   room:'Lab 1',  year:'Yr 11' },
    'Friday|13:00':    { subject:'English',       teacher:'Mr Harrison',room:'2B',     year:'Yr 12' },
    'Friday|14:15':    { subject:'Maths',         teacher:'Mr Davies',  room:'3A',     year:'Yr 13' },
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Schedule" subtitle="Weekly timetable — Spring Term 2026" actions={[
        <Btn key="exp" variant="secondary" icon="download" small>Export</Btn>,
        <Btn key="new" variant="primary"   icon="plus"     small>Add Session</Btn>,
      ]} />

      <Card>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'80px repeat(5,1fr)', borderBottom:`1px solid ${DS.border}`, background:DS.surface }}>
          <div style={{ padding:'12px 14px', fontSize:12, fontWeight:600, color:DS.muted }}>Time</div>
          {days.map(d => (
            <div key={d} style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:DS.text, borderLeft:`1px solid ${DS.border}` }}>{d}</div>
          ))}
        </div>

        {/* Time-slot rows */}
        {slots.map((time, ri) => (
          <div key={time} style={{
            display:'grid', gridTemplateColumns:'80px repeat(5,1fr)',
            borderBottom: ri < slots.length-1 ? `1px solid ${DS.border}` : 'none',
            minHeight:84,
          }}>
            <div style={{ padding:'14px', fontSize:12, color:DS.muted, fontVariantNumeric:'tabular-nums' }}>{time}</div>
            {days.map(day => {
              const s = sessions[`${day}|${time}`];
              return (
                <div key={day} style={{ padding:8, borderLeft:`1px solid ${DS.border}` }}>
                  {s && (() => {
                    const p = palette[s.subject] || { c:DS.accent, bg:DS.accentLight, border:DS.accentBorder };
                    return (
                      <div style={{
                        background:p.bg, border:`1px solid ${p.border}`, borderRadius:8,
                        padding:'8px 10px', height:'100%', cursor:'pointer',
                      }}>
                        <div style={{ fontSize:13, fontWeight:600, color:p.c, marginBottom:2 }}>{s.subject}</div>
                        <div style={{ fontSize:11, color:DS.muted, marginBottom:6 }}>{s.teacher}</div>
                        <div style={{ display:'flex', gap:5 }}>
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#FFFFFF80', color:DS.sub, fontWeight:500 }}>{s.room}</span>
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:'#FFFFFF80', color:p.c, fontWeight:500 }}>{s.year}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginTop:16, flexWrap:'wrap' }}>
        {[['Mathematics',palette['Mathematics']],['Sciences',palette['Chemistry']],['Biology',palette['Biology']],['English',palette['English']],['History / CS',palette['History']]].map(([l,p]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:DS.muted }}>
            <div style={{ width:12, height:12, borderRadius:3, background:p.bg, border:`1px solid ${p.border}` }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────────
const AdminPages = ({ page }) => {
  if (page === 'students') return <AdminStudentsPage />;
  if (page === 'reports')  return <AdminReportsPage />;
  if (page === 'classes')  return <AdminClassesPage />;
  if (page === 'teachers') return <AdminTeachersPage />;
  if (page === 'invoices') return <AdminInvoicesPage />;
  if (page === 'schedule') return <AdminSchedulePage />;
  return null;
};

Object.assign(window, { AdminPages });
