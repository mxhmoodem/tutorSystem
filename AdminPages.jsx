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

// ─── Router ─────────────────────────────────────────────────────────────────────
const AdminPages = ({ page }) => {
  if (page === 'students') return <AdminStudentsPage />;
  if (page === 'reports')  return <AdminReportsPage />;
  return null;
};

Object.assign(window, { AdminPages });
