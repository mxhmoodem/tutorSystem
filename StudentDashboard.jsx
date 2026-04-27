// ══════════════════════════════════════════════════════════════
//  TutorOS — Student Dashboard (5 pages)
// ══════════════════════════════════════════════════════════════

const studentSelf = {
  name: 'Oliver Chen',
  year: 'Year 12',
  subjects: [
    { name: 'Mathematics',   color: '#43b190', scores: [82,85,84,88,90,89,92,94], predicted: 'A*', attendance: 98 },
    { name: 'Further Maths', color: '#7C3AED', scores: [78,80,82,83,85,86,87,88], predicted: 'A',  attendance: 96 },
    { name: 'Physics',       color: '#0891B2', scores: [72,74,77,79,78,80,81,81], predicted: 'A',  attendance: 94 },
  ],
};

const studentHomework = [
  { id:1, title: 'Calculus: Integration by Parts',    subject:'Mathematics',   teacher:'Ms. Clarke', due:'Today, 11:59 PM',  status:'pending',   urgent:true,  desc:'Complete questions 1–8 from Chapter 12. Show all working.' },
  { id:2, title: 'Optics: Refraction & Snell\'s Law', subject:'Physics',       teacher:'Mr. Park',   due:'Tomorrow, 11:59 PM',status:'pending',   urgent:false, desc:'Answer the 5 questions on the worksheet. Include ray diagrams where applicable.' },
  { id:3, title: 'Vectors: Cross Products',           subject:'Further Maths', teacher:'Ms. Clarke', due:'Wed 30 Apr',        status:'pending',   urgent:false, desc:'Worksheet Section B, Q1–6.' },
  { id:4, title: 'Algebra: Simultaneous Equations',   subject:'Mathematics',   teacher:'Ms. Clarke', due:'22 Apr',            status:'submitted', urgent:false, score:92, feedback:'Excellent work — all methods correct. Minor notation issue on Q4.' },
  { id:5, title: 'Mechanics: Moments & Torque',       subject:'Physics',       teacher:'Mr. Park',   due:'20 Apr',            status:'marked',    urgent:false, score:78, feedback:'Good attempt. Q3 had the wrong sign convention — review lever arm direction.' },
  { id:6, title: 'Sequences: nth Term Proofs',        subject:'Further Maths', teacher:'Ms. Clarke', due:'16 Apr',            status:'marked',    urgent:false, score:87, feedback:'Strong algebraic proof on Q4. Q2 coefficient was slightly off — see annotation.' },
];

const studentSessions = [
  { subject:'Mathematics',   date:'Mon 28 Apr', time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Further Maths', date:'Wed 30 Apr', time:'10:30–12:00', room:'Room 5',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Physics',       date:'Thu 1 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Regular' },
  { subject:'Mathematics',   date:'Fri 2 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Regular' },
  { subject:'Physics',       date:'Mon 5 May',  time:'14:00–15:30', room:'Room 7',  teacher:'Mr. David Park',   type:'Mock prep' },
  { subject:'Mathematics',   date:'Wed 7 May',  time:'09:00–10:30', room:'Room 3',  teacher:'Ms. Sarah Clarke', type:'Mock prep' },
];

const aiFeedbackLog = [
  { hw:'Algebra: Simultaneous Equations', subject:'Mathematics', date:'22 Apr', score:92, strengths:['Correct method applied throughout','Clear step-by-step working','Good use of substitution'], improve:['Write dy/dx notation more carefully on Q4','Check bracket expansion signs'] },
  { hw:'Mechanics: Moments & Torque',     subject:'Physics',     date:'20 Apr', score:78, strengths:['Good understanding of pivot concepts','Correct unit usage'], improve:['Review sign convention for anticlockwise moments','Re-read Q3 carefully — lever arm was perpendicular to force, not along it'] },
  { hw:'Sequences: nth Term Proofs',      subject:'Further Maths',date:'16 Apr',score:87, strengths:['Excellent algebraic proof structure on Q4','Correct base cases shown'], improve:['Q2: coefficient of n² term was 1.5 not 1 — recheck second differences','Always verify your formula with n=3 or n=4'] },
];

// ─── Overview page ─────────────────────────────────────────────────────────────
const StudentOverview = ({ onNav }) => {
  const pendingHw   = studentHomework.filter(h => h.status === 'pending');
  const urgentCount = pendingHw.filter(h => h.urgent).length;
  const avgScore    = Math.round(studentSelf.subjects.reduce((s,sub) => s + sub.scores[sub.scores.length-1], 0) / studentSelf.subjects.length);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Avatar name={studentSelf.name} size={48} color="#43b190" />
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:DS.text, margin:'0 0 2px', letterSpacing:'-0.4px' }}>
              Good morning, Oliver
            </h1>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:13, color:DS.muted }}>{studentSelf.year} · Spring Term, Week 8</span>
              <Badge variant="success">On track</Badge>
            </div>
          </div>
        </div>
        <Btn variant="secondary" icon="download" small>Download Report</Btn>
      </div>

      {/* KPI row */}
      <div style={{ display:'flex', gap:16, marginBottom:28 }}>
        <KPICard label="Average Score"    value={`${avgScore}%`}          trend="+3% this term"  trendDir="up"   icon="star"     iconBg="#F0FDF4"   accent="#16A34A" />
        <KPICard label="Homework Due"     value={pendingHw.length}         trend={urgentCount ? `${urgentCount} urgent` : 'None urgent'} trendDir={urgentCount ? 'down' : 'up'} icon="clip"    iconBg="#FFFBEB"   accent="#D97706" />
        <KPICard label="Sessions This Wk" value="4"                        trend="Next: Mon 09:00" trendDir="up"  icon="calendar" iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="Overall Attendance" value="96.3%"                  trend="+0.8% vs last term" trendDir="up" icon="check" iconBg="#F0FDF4" accent="#16A34A" />
      </div>

      {/* Subjects + upcoming hw */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
        <div>
          {/* Subject cards */}
          <Card title="My Subjects" style={{ marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
              {studentSelf.subjects.map((s, i) => (
                <div key={s.name} style={{
                  padding:'20px', borderRight: i < 2 ? `1px solid ${DS.border}` : 'none',
                  borderTop:`3px solid ${s.color}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:500, color:DS.muted, marginBottom:12 }}>{s.name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:32, fontWeight:800, color:DS.text, lineHeight:1, letterSpacing:'-0.8px' }}>
                        {s.scores[s.scores.length-1]}%
                      </div>
                      <div style={{ fontSize:11, color:DS.muted, marginTop:3 }}>Latest score</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.predicted}</div>
                      <div style={{ fontSize:11, color:DS.muted }}>Predicted</div>
                    </div>
                  </div>
                  <Sparkline data={s.scores} color={s.color} width={100} height={32} />
                  <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:DS.muted }}>Attendance</span>
                    <span style={{ fontWeight:600, color:s.attendance > 95 ? DS.success : DS.warning }}>{s.attendance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Score trends chart */}
          <Card title="Score Trends" actions={[<Badge key="b" variant="default">Last 8 assessments</Badge>]}>
            <div style={{ padding:'16px 20px 8px' }}>
              <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                {studentSelf.subjects.map(s => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:20, height:2, background:s.color, borderRadius:2 }} />
                    <span style={{ fontSize:12, color:DS.muted }}>{s.name}</span>
                  </div>
                ))}
              </div>
              <LineChart
                labels={['4 Mar','11 Mar','18 Mar','25 Mar','1 Apr','8 Apr','15 Apr','22 Apr']}
                series={studentSelf.subjects.map(s => ({ label:s.name, data:s.scores, color:s.color }))}
                height={180}
              />
            </div>
          </Card>
        </div>

        {/* Right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Urgent homework */}
          <Card title="Due Soon" actions={[
            <Btn key="all" variant="ghost" small onClick={() => onNav('homework')}>View all</Btn>
          ]}>
            <div style={{ padding:'8px 0' }}>
              {pendingHw.slice(0,3).map((hw, i) => (
                <div key={hw.id} style={{
                  padding:'12px 16px',
                  borderBottom: i < Math.min(pendingHw.length,3)-1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:DS.text }}>{hw.title}</span>
                    {hw.urgent && <Badge variant="danger">Today</Badge>}
                  </div>
                  <div style={{ fontSize:12, color:DS.muted, marginBottom:8 }}>{hw.subject} · {hw.teacher}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:hw.urgent ? DS.danger : DS.muted }}>
                      Due {hw.due}
                    </span>
                    <Btn variant="primary" small>Start</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Next sessions */}
          <Card title="Upcoming Sessions" actions={[
            <Btn key="all" variant="ghost" small onClick={() => onNav('sessions')}>View all</Btn>
          ]}>
            <div style={{ padding:'8px 0' }}>
              {studentSessions.slice(0,4).map((s, i) => {
                const subj = studentSelf.subjects.find(x => x.name === s.subject);
                const color = subj ? subj.color : DS.accent;
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                    borderBottom: i < 3 ? `1px solid ${DS.border}` : 'none',
                  }}>
                    <div style={{
                      width:32, height:32, borderRadius:7, flexShrink:0,
                      background: color + '18', color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon name="book" size={14} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{s.subject}</div>
                      <div style={{ fontSize:11, color:DS.muted }}>{s.date} · {s.time}</div>
                    </div>
                    {s.type === 'Mock prep' && <Badge variant="warning">Mock prep</Badge>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent feedback */}
          <Card title="Latest Feedback" actions={[
            <Btn key="all" variant="ghost" small onClick={() => onNav('feedback')}>View all</Btn>
          ]}>
            <div style={{ padding:'8px 0' }}>
              {aiFeedbackLog.slice(0,2).map((f, i) => (
                <div key={i} style={{ padding:'12px 16px', borderBottom: i < 1 ? `1px solid ${DS.border}` : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:DS.text }}>{f.hw}</span>
                    <ScorePill score={f.score} />
                  </div>
                  <div style={{ fontSize:12, color:DS.muted }}>{f.subject} · {f.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Homework page ──────────────────────────────────────────────────────────────
const StudentHomeworkPage = () => {
  const [tab, setTab] = React.useState('pending');
  const [submitting, setSubmitting] = React.useState(null);
  const [submitText, setSubmitText] = React.useState('');
  const [submitted, setSubmitted] = React.useState([]);

  const filtered = studentHomework.filter(hw =>
    tab === 'pending'   ? hw.status === 'pending' && !submitted.includes(hw.id) :
    tab === 'submitted' ? hw.status === 'submitted' || submitted.includes(hw.id) :
    hw.status === 'marked'
  );

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Homework" subtitle="Track, submit, and review your assignments" actions={[
        <Badge key="p" variant="warning">{studentHomework.filter(h=>h.status==='pending' && !submitted.includes(h.id)).length} pending</Badge>
      ]} />

      <div style={{ display:'flex', borderBottom:`1px solid ${DS.border}`, marginBottom:20 }}>
        {[['pending','Pending'],['submitted','Submitted'],['marked','Marked']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:14, fontWeight: tab===id ? 600 : 400,
            color: tab===id ? DS.accent : DS.muted,
            borderBottom:`2px solid ${tab===id ? DS.accent : 'transparent'}`,
            marginBottom:-1,
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px', color:DS.faint, fontSize:14 }}>
            Nothing here yet.
          </div>
        )}
        {filtered.map(hw => (
          <div key={hw.id} style={{
            background:DS.bg, border:`1px solid ${hw.urgent ? DS.dangerBorder : DS.border}`,
            borderRadius:10, overflow:'hidden',
          }}>
            <div style={{ padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:600, color:DS.text }}>{hw.title}</span>
                    {hw.urgent && <Badge variant="danger">Due today</Badge>}
                    {hw.status === 'marked' && <ScorePill score={hw.score} />}
                  </div>
                  <div style={{ fontSize:13, color:DS.muted }}>{hw.subject} · {hw.teacher} · Due {hw.due}</div>
                </div>
                <div>
                  {(hw.status === 'pending' && !submitted.includes(hw.id)) && (
                    <Btn variant="primary" onClick={() => setSubmitting(hw.id)}>Submit Work</Btn>
                  )}
                  {(hw.status === 'submitted' || submitted.includes(hw.id)) && (
                    <Badge variant="info">Submitted</Badge>
                  )}
                </div>
              </div>

              {hw.desc && (
                <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6, padding:'10px 14px', background:DS.surface, borderRadius:7, marginTop:8 }}>
                  {hw.desc}
                </div>
              )}

              {(hw.status === 'marked' || hw.feedback) && hw.feedback && (
                <div style={{ marginTop:12, padding:'10px 14px', background:DS.accentLight, borderRadius:7, border:`1px solid ${DS.accentBorder}` }}>
                  <div style={{ fontSize:11, fontWeight:600, color:DS.accent, marginBottom:4 }}>TEACHER FEEDBACK</div>
                  <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6 }}>{hw.feedback}</div>
                </div>
              )}
            </div>

            {submitting === hw.id && (
              <div style={{ padding:'0 20px 20px' }}>
                <Divider margin="0 0 16px" />
                <div style={{ fontSize:13, fontWeight:600, color:DS.sub, marginBottom:8 }}>Your answer</div>
                <textarea
                  rows={4}
                  value={submitText}
                  onChange={e => setSubmitText(e.target.value)}
                  placeholder="Type your answer or paste your working here…"
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:7,
                    border:`1px solid ${DS.border}`, fontSize:13, color:DS.text,
                    outline:'none', resize:'vertical', boxSizing:'border-box',
                    fontFamily:'inherit',
                  }}
                />
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <Btn variant="primary" icon="upload" onClick={() => {
                    setSubmitted(p => [...p, hw.id]);
                    setSubmitting(null);
                    setSubmitText('');
                  }}>Submit</Btn>
                  <Btn variant="secondary" onClick={() => setSubmitting(null)}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Progress page ──────────────────────────────────────────────────────────────
const StudentProgressPage = () => {
  const [activeSub, setActiveSub] = React.useState(0);
  const sub = studentSelf.subjects[activeSub];
  const classAvg = [65,66,67,68,69,70,71,72];
  const scoreLabels = ['4 Mar','11 Mar','18 Mar','25 Mar','1 Apr','8 Apr','15 Apr','22 Apr'];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Progress" subtitle="Track your score trends and predicted grades across subjects" />

      {/* Subject tabs */}
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        {studentSelf.subjects.map((s, i) => (
          <button key={s.name} onClick={() => setActiveSub(i)} style={{
            padding:'8px 20px', borderRadius:20, border:`1px solid ${activeSub===i ? s.color : DS.border}`,
            background: activeSub===i ? s.color + '18' : DS.bg,
            color: activeSub===i ? s.color : DS.muted,
            fontSize:14, fontWeight: activeSub===i ? 600 : 400, cursor:'pointer',
          }}>{s.name}</button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>
        <div>
          {/* Score trend chart */}
          <Card title={`Score Trend — ${sub.name}`} style={{ marginBottom:20 }} actions={[
            <div key="leg" style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:16, height:2, background:sub.color, borderRadius:2 }} />
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
                  { label:'Your score', data:sub.scores, color:sub.color },
                  { label:'Class avg',  data:classAvg,    color:DS.borderDark },
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
          <div style={{
            background:DS.bg, border:`1px solid ${DS.border}`,
            borderRadius:10, padding:'24px',
            borderTop:`3px solid ${sub.color}`,
          }}>
            <div style={{ fontSize:13, color:DS.muted, marginBottom:12 }}>{sub.name} summary</div>
            <div style={{ fontSize:40, fontWeight:800, color:DS.text, letterSpacing:'-1px', lineHeight:1 }}>
              {sub.scores[sub.scores.length-1]}%
            </div>
            <div style={{ fontSize:12, color:DS.muted, marginTop:4 }}>Latest score</div>
            <Divider />
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:DS.muted }}>Predicted grade</span>
              <span style={{ fontSize:16, fontWeight:700, color:sub.color }}>{sub.predicted}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:DS.muted }}>Attendance</span>
              <span style={{ fontSize:13, fontWeight:600, color: sub.attendance > 95 ? DS.success : DS.warning }}>{sub.attendance}%</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:DS.muted }}>Above class avg</span>
              <span style={{ fontSize:13, fontWeight:600, color:DS.success }}>
                +{sub.scores[sub.scores.length-1] - classAvg[classAvg.length-1]}%
              </span>
            </div>
          </div>

          {/* All subjects summary */}
          <Card title="All Subjects">
            <div style={{ padding:'8px 0' }}>
              {studentSelf.subjects.map((s, i) => (
                <div key={s.name} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                  borderBottom: i < studentSelf.subjects.length-1 ? `1px solid ${DS.border}` : 'none',
                  cursor:'pointer', background: activeSub===i ? s.color+'0A' : 'transparent',
                }} onClick={() => setActiveSub(i)}>
                  <div style={{ width:3, height:36, borderRadius:2, background:s.color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:DS.text }}>{s.name}</div>
                    <div style={{ fontSize:11, color:DS.muted }}>Predicted {s.predicted}</div>
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
  const upcoming = [
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Mon 21 Apr', time:'09:00–10:00', room:'Room 3A' },
    { subject:'Further Maths', teacher:'Mr Davies', date:'Tue 22 Apr', time:'10:15–11:15', room:'Room 3A' },
    { subject:'Physics',       teacher:'Dr Patel',  date:'Wed 23 Apr', time:'13:00–14:00', room:'Lab 2'   },
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Thu 24 Apr', time:'09:00–10:00', room:'Room 3A' },
  ];

  const history = [
    { subject:'Further Maths', teacher:'Mr Davies', date:'Mon 14 Apr', time:'10:15–11:15', status:'attended' },
    { subject:'Physics',       teacher:'Dr Patel',  date:'Wed 16 Apr', time:'13:00–14:00', status:'attended' },
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Thu 17 Apr', time:'09:00–10:00', status:'attended' },
    { subject:'Further Maths', teacher:'Mr Davies', date:'Tue 8 Apr',  time:'10:15–11:15', status:'missed'   },
  ];

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Sessions" subtitle="Your upcoming and past tutoring sessions" actions={[
        <Btn key="cal" variant="secondary" icon="download" small>Export to Calendar</Btn>
      ]} />

      {/* Upcoming row */}
      <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:12 }}>Upcoming</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:32 }}>
        {upcoming.map((s, i) => {
          const subj = studentSelf.subjects.find(x => x.name === s.subject);
          const color = subj ? subj.color : DS.accent;
          return (
            <div key={i} style={{
              background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10,
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

// ─── AI Feedback page ───────────────────────────────────────────────────────────
const StudentFeedbackPage = () => {
  const [expanded, setExpanded] = React.useState(0);

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="AI Feedback" subtitle="Detailed per-assignment feedback to help you improve" actions={[
        <div key="badge" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:DS.accent }}>
          <Icon name="brain" size={14} />
          Powered by TutorOS AI
        </div>
      ]} />

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {aiFeedbackLog.map((f, i) => {
          const isOpen = expanded === i;
          const subj = studentSelf.subjects.find(s => s.name === f.subject);
          const color = subj ? subj.color : DS.accent;
          return (
            <div key={i} style={{
              background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:10, overflow:'hidden',
            }}>
              <div
                style={{ padding:'20px', cursor:'pointer', display:'flex', alignItems:'center', gap:16 }}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div style={{ width:44, height:44, borderRadius:10, background: color+'18', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="brain" size={20} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:DS.text, marginBottom:3 }}>{f.hw}</div>
                  <div style={{ fontSize:12, color:DS.muted }}>{f.subject} · Submitted {f.date}</div>
                </div>
                <ScorePill score={f.score} />
                <Icon name={isOpen ? 'chevron_d' : 'chevron_r'} size={14} color={DS.faint} />
              </div>

              {isOpen && (
                <div style={{ borderTop:`1px solid ${DS.border}`, padding:'20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:DS.success, marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
                        <Icon name="check" size={12} /> WHAT YOU DID WELL
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {f.strengths.map((s, si) => (
                          <div key={si} style={{
                            display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:DS.sub,
                            padding:'8px 10px', background:DS.successBg, borderRadius:7,
                            border:`1px solid ${DS.successBorder}`,
                          }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', background:DS.success, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                              <Icon name="check" size={9} color="#fff" />
                            </div>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:DS.warning, marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
                        <Icon name="alert" size={12} /> AREAS TO IMPROVE
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {f.improve.map((s, si) => (
                          <div key={si} style={{
                            display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:DS.sub,
                            padding:'8px 10px', background:DS.warningBg, borderRadius:7,
                            border:`1px solid ${DS.warningBorder}`,
                          }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', background:DS.warning, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                              <Icon name="alert" size={9} color="#fff" />
                            </div>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Router ────────────────────────────────────────────────────────────────────
const StudentDashboard = ({ page = 'dashboard', onNav }) => {
  if (page === 'homework') return <StudentHomework />;
  if (page === 'progress') return <StudentProgressPage />;
  if (page === 'sessions') return <StudentSessionsPage />;
  if (page === 'feedback') return <StudentFeedbackPage />;
  return <StudentOverview onNav={onNav} />;
};

Object.assign(window, { StudentDashboard });
