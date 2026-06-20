// ══════════════════════════════════════════════════════════════
//  TutorOS — Student Dashboard (5 pages)
// ══════════════════════════════════════════════════════════════

// Mock data (studentSelf, studentHomework, studentSessions)
// lives in mocks/studentDashboard.mock.jsx, loaded before this file in index.html.
// Reports come from the shared reports store (Reports.jsx, window.StudentReports).

// ─── Overview page ─────────────────────────────────────────────────────────────
// Subject themes — pastel cards with abstract shapes
const subjectThemes = {
  'Mathematics':   { tint:'#FDE6D3', deep:'#A6531B', text:'#79300E', shape:'#FA9B62', shapeShadow:'#F4B58F', symbol:'square', glyph:'∫' },
  'Further Maths': { tint:'#E5DDFA', deep:'#6B5BA8', text:'#332083', shape:'#8D75E9', shapeShadow:'#B6A6F5', symbol:'diamond', glyph:'Σ' },
  'Physics':       { tint:'#DCEFFC', deep:'#4B7EA8', text:'#124979', shape:'#5BA6EA', shapeShadow:'#86BFEC', symbol:'circle', glyph:'⚛' },
  'Chemistry':     { tint:'#FCE7D6', deep:'#9A5B22', text:'#7A3E12', shape:'#F0A45C', shapeShadow:'#F6C394', symbol:'diamond', glyph:'⚗' },
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

const StudentOverview = ({ onNav }) => {
  const pendingHw   = studentHomework.filter(h => h.status === 'pending');
  const urgentCount = pendingHw.filter(h => h.urgent).length;
  const avgScore    = Math.round(studentSelf.subjects.reduce((s,sub) => s + sub.scores[sub.scores.length-1], 0) / studentSelf.subjects.length);
  const reportsStore = useReportsStore();
  const latestReports = reportsStore.reportsArr
    .filter(r => r.studentId === 's_oliver' && r.status === 'published')
    .sort((a,b) => (b.datePublished||'').localeCompare(a.datePublished||''))
    .slice(0,3);

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
              YEAR 12 · SPRING TERM · WEEK 8
            </div>
            <h1 style={{ fontSize:38, fontWeight:800, color:'#fff', margin:'0 0 10px', letterSpacing:'-1px', lineHeight:1.05 }}>
              Good morning, Oliver
            </h1>
            <div style={{ fontSize:15, color:'rgba(255,255,255,0.88)', lineHeight:1.5, marginBottom:22 }}>
              You're <strong style={{ color:'#fff' }}>on track</strong> across all three subjects this term. {pendingHw.length} pieces of homework due, {urgentCount} urgent.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => onNav('homework')} style={{
                padding:'10px 18px', borderRadius:10, border:'none',
                background:'#fff', color:'#5B3FD9', fontSize:13, fontWeight:600,
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7,
              }}>
                <Icon name="clip" size={14} color="#5B3FD9" />
                Continue homework
              </button>
              <button style={{
                padding:'10px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.35)',
                background:'transparent', color:'#fff', fontSize:13, fontWeight:500,
                cursor:'pointer',
              }}>
                Download report
              </button>
            </div>
          </div>

          {/* Stat tiles 2x2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {heroStat('Average score', `${avgScore}%`, '+3% this term')}
            {heroStat('Attendance', '96.3%', '+0.8% vs last')}
            {heroStat('Homework due', pendingHw.length, urgentCount ? `${urgentCount} urgent` : 'None urgent')}
            {heroStat('Sessions / wk', '4', 'Next Mon 09:00')}
          </div>
        </div>
      </div>

      {/* My subjects */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:DS.text, margin:'0 0 4px', letterSpacing:'-0.4px' }}>My subjects</h2>
          <div style={{ fontSize:13, color:DS.muted }}>Latest scores and predicted grades</div>
        </div>
        <button onClick={() => onNav('progress')} style={{
          background:'none', border:'none', color:DS.muted, fontSize:13, cursor:'pointer',
        }}>View all progress →</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {studentSelf.subjects.map(s => {
          const theme = subjectThemes[s.name] || subjectThemes['Mathematics'];
          const latest = s.scores[s.scores.length-1];
          return (
            <div key={s.name} style={{
              position:'relative', overflow:'hidden',
              background: theme.tint, borderRadius:18,
              padding:'22px 24px 24px', minHeight:220,
              display:'flex', flexDirection:'column', justifyContent:'space-between',
            }}>
              <SubjectShape theme={theme} />
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:theme.deep, letterSpacing:'1px', opacity:0.7 }}>SUBJECT</div>
                <div style={{ fontSize:24, fontWeight:800, color:theme.text, marginTop:4, letterSpacing:'-0.5px' }}>{s.name}</div>
              </div>
              <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:42, fontWeight:800, color:theme.text, letterSpacing:'-1.5px', lineHeight:1 }}>{latest}%</div>
                  <div style={{ fontSize:12, color:theme.deep, marginTop:4, opacity:0.75 }}>Latest score · {s.scores.length} assessments</div>
                </div>
                <div style={{
                  background:'rgba(255,255,255,0.55)', borderRadius:10,
                  padding:'8px 10px', textAlign:'center', minWidth:54,
                }}>
                  <div style={{ fontSize:18, fontWeight:800, color:theme.text, lineHeight:1 }}>{s.predicted}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:theme.deep, letterSpacing:'1px', marginTop:3, opacity:0.8 }}>PREDICTED</div>
                </div>
              </div>
            </div>
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
            const subj = studentSelf.subjects.find(x => x.name === hw.subject);
            const color = subj ? subj.color : DS.accent;
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
                  <div style={{ fontSize:11, color:DS.muted, marginBottom:4 }}>{hw.subject} · {hw.teacher}</div>
                  <div style={{ fontSize:11, fontWeight: hw.urgent ? 600 : 400, color: hw.urgent ? DS.danger : DS.muted }}>
                    Due {hw.due.replace(', 11:59 PM','').replace('Today','today').replace(/PM/, 'pm')}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                  {hw.urgent ? <Badge variant="warning">Today</Badge> : <Badge variant="default">Overdue</Badge>}
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
          {studentSessions.slice(0,3).map((s, i) => {
            const subj = studentSelf.subjects.find(x => x.name === s.subject);
            const color = subj ? subj.color : DS.accent;
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
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Mon 21 Apr', time:'09:00–10:00', room:'Room 3A', day:21 },
    { subject:'Further Maths', teacher:'Mr Davies', date:'Tue 22 Apr', time:'10:15–11:15', room:'Room 3A', day:22 },
    { subject:'Physics',       teacher:'Dr Patel',  date:'Wed 23 Apr', time:'13:00–14:00', room:'Lab 2',   day:23 },
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Thu 24 Apr', time:'09:00–10:00', room:'Room 3A', day:24 },
  ];

  const history = [
    { subject:'Further Maths', teacher:'Mr Davies', date:'Mon 14 Apr', time:'10:15–11:15', status:'attended', day:14 },
    { subject:'Physics',       teacher:'Dr Patel',  date:'Wed 16 Apr', time:'13:00–14:00', status:'attended', day:16 },
    { subject:'Mathematics',   teacher:'Mr Davies', date:'Thu 17 Apr', time:'09:00–10:00', status:'attended', day:17 },
    { subject:'Further Maths', teacher:'Mr Davies', date:'Tue 8 Apr',  time:'10:15–11:15', status:'missed',   day:8 },
  ];

  // Calendar: April 2026 (1 Apr 2026 = Wednesday, so col 2; 30 days)
  const [month, setMonth] = React.useState({ name:'April 2026', firstDow:2, days:30 });

  const sessionsByDay = {};
  [...upcoming, ...history].forEach(s => {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = [];
    sessionsByDay[s.day].push(s);
  });

  // Build 6×7 grid of day numbers (or null for padding)
  const cells = [];
  for (let i = 0; i < month.firstDow; i++) cells.push(null);
  for (let d = 1; d <= month.days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const today = 23; // demo "today"

  const subjColor = (name) => {
    const subj = studentSelf.subjects.find(x => x.name === name);
    return subj ? subj.color : DS.accent;
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Sessions" subtitle="Your upcoming and past tutoring sessions" actions={[
        <Btn key="cal" variant="secondary" icon="download" small>Export to Calendar</Btn>
      ]} />

      {/* Calendar */}
      <div style={{
        background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12,
        padding:'20px 22px', marginBottom:28,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Icon name="calendar" size={16} color={DS.muted} />
            <div style={{ fontSize:17, fontWeight:700, color:DS.text, letterSpacing:'-0.3px' }}>{month.name}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {/* Legend */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginRight:14 }}>
              {studentSelf.subjects.map(s => (
                <div key={s.name} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.color }} />
                  <span style={{ fontSize:11, color:DS.muted }}>{s.name}</span>
                </div>
              ))}
            </div>
            <button aria-label="Previous month" style={{
              width:30, height:30, borderRadius:7, border:`1px solid ${DS.border}`,
              background:DS.bg, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ display:'inline-flex', transform:'rotate(180deg)' }}>
                <Icon name="chevron_r" size={14} color={DS.muted} strokeWidth={2} />
              </span>
            </button>
            <button style={{
              padding:'6px 12px', borderRadius:7, border:`1px solid ${DS.border}`,
              background:DS.bg, fontSize:12, fontWeight:500, color:DS.sub, cursor:'pointer',
            }}>Today</button>
            <button aria-label="Next month" style={{
              width:30, height:30, borderRadius:7, border:`1px solid ${DS.border}`,
              background:DS.bg, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>
              <Icon name="chevron_r" size={14} color={DS.muted} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, marginBottom:6 }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{
              fontSize:11, fontWeight:700, color:DS.muted, letterSpacing:'1px',
              textAlign:'center', padding:'4px 0',
            }}>{d.toUpperCase()}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
          {cells.map((d, i) => {
            const isToday = d === today;
            const items = (d && sessionsByDay[d]) || [];
            return (
              <div key={i} style={{
                minHeight:90, padding:'8px 8px 6px',
                borderRadius:9,
                background: d == null ? 'transparent' : isToday ? DS.accentLight : DS.surface,
                border: d == null ? 'none' : `1px solid ${isToday ? DS.accentBorder : DS.border}`,
                opacity: d == null ? 0 : 1,
                display:'flex', flexDirection:'column', gap:4,
              }}>
                {d != null && (
                  <>
                    <div style={{
                      fontSize:12, fontWeight: isToday ? 700 : 600,
                      color: isToday ? DS.accent : DS.sub, marginBottom:2,
                    }}>{d}</div>
                    {items.slice(0, 3).map((s, j) => {
                      const color = subjColor(s.subject);
                      const missed = s.status === 'missed';
                      return (
                        <div key={j} title={`${s.subject} · ${s.time}`} style={{
                          fontSize:10.5, fontWeight:600, color: missed ? DS.danger : color,
                          background: missed ? DS.dangerBg : color + '18',
                          borderLeft:`2px solid ${missed ? DS.danger : color}`,
                          padding:'3px 6px', borderRadius:4,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                          textDecoration: missed ? 'line-through' : 'none',
                        }}>
                          {s.time.split('–')[0]} {s.subject.split(' ')[0]}
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div style={{ fontSize:10, color:DS.muted }}>+{items.length - 3} more</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
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

// ─── Router ────────────────────────────────────────────────────────────────────
const StudentDashboard = ({ page = 'dashboard', section, onNav }) => {
  if (page === 'homework') return <StudentHomework section={section} onNav={onNav} />;
  if (page === 'progress') return <StudentProgressPage />;
  if (page === 'sessions') return <StudentSessionsPage />;
  if (page === 'reports') return <StudentReports />;
  return <StudentOverview onNav={onNav} />;
};

Object.assign(window, { StudentDashboard });
