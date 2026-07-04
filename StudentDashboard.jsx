// ══════════════════════════════════════════════════════════════
//  Klayo — Student Dashboard (Overview · Progress · Sessions)
// ══════════════════════════════════════════════════════════════

// Identity, enrolments (subjects/teachers/predicted grades), rollup metrics, the
// grade model and the active term all come from the student SoT
// (studentData.jsx → window.klayoStudent), loaded before this file. Homework lives
// in Homework.jsx (StudentHomework); reports come from the shared reports store
// (Reports.jsx, window.StudentReports). The studentHomework mock still seeds the
// Overview "due soon" list via klayoStudent.metrics.homeworkSummary().

// ─── Overview page ─────────────────────────────────────────────────────────────
// Subject themes — pastel cards with abstract shapes
const subjectThemes = {
  'Mathematics':   { tint:'#FEEEE0', tint2:'#F8C9A4', deep:'#A6531B', text:'#79300E', shape:'#FA9B62', shapeShadow:'#F4B58F', symbol:'square', glyph:'∫' },
  'Further Maths': { tint:'#EFE9FC', tint2:'#C9BAF5', deep:'#6B5BA8', text:'#332083', shape:'#8D75E9', shapeShadow:'#B6A6F5', symbol:'diamond', glyph:'Σ' },
  'Physics':       { tint:'#E7F4FD', tint2:'#B4DBF6', deep:'#4B7EA8', text:'#124979', shape:'#5BA6EA', shapeShadow:'#86BFEC', symbol:'circle', glyph:'⚛' },
  'Chemistry':     { tint:'#FDEFE0', tint2:'#F8CFA2', deep:'#9A5B22', text:'#7A3E12', shape:'#F0A45C', shapeShadow:'#F6C394', symbol:'diamond', glyph:'⚗' },
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
  // §1–§7: identity, subjects, grades, numbers and term all come from the one
  // student SoT — nothing on this screen is re-hardcoded.
  const K  = window.klayoStudent;
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
              You're <strong style={{ color:'#fff' }}>on track</strong> across your {enrolments.length} subjects this term. {pendingHw.length} piece{pendingHw.length === 1 ? '' : 's'} of homework due, {urgentCount} urgent.
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

      {/* My subjects */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:DS.text, margin:'0 0 4px', letterSpacing:'-0.4px' }}>My subjects</h2>
          <div style={{ fontSize:13, color:DS.muted }}>Latest scores and predicted grades</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => scrollSubjects(-1)} aria-label="Previous subjects" style={{
            width:32, height:32, borderRadius:8, border:`1px solid ${DS.cardBorder}`,
            background:DS.bg, color:DS.muted, cursor:'pointer', display:'inline-flex',
            alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1,
          }}>‹</button>
          <button onClick={() => scrollSubjects(1)} aria-label="Next subjects" style={{
            width:32, height:32, borderRadius:8, border:`1px solid ${DS.cardBorder}`,
            background:DS.bg, color:DS.muted, cursor:'pointer', display:'inline-flex',
            alignItems:'center', justifyContent:'center', fontSize:16, lineHeight:1,
          }}>›</button>
          <button onClick={() => onNav('progress')} style={{
            background:'none', border:'none', color:DS.muted, fontSize:13, cursor:'pointer',
          }}>View all →</button>
        </div>
      </div>

      <div ref={subjectsRef} style={{
        display:'flex', gap:16, marginBottom:28, overflowX:'auto', paddingBottom:4,
        scrollSnapType:'x mandatory', scrollbarWidth:'none', msOverflowStyle:'none',
      }}>
        {enrolments.map(s => {
          const theme = subjectThemes[s.subject] || subjectThemes['Mathematics'];
          const latest = s.scores[s.scores.length-1];
          return (
            <div key={s.subject} style={{
              position:'relative', overflow:'hidden', flex:'1 0 280px', scrollSnapAlign:'start',
              background: `linear-gradient(150deg, ${theme.tint} 0%, ${theme.tint2} 100%)`, borderRadius:18,
              padding:'22px 24px 24px', minHeight:220,
              display:'flex', flexDirection:'column', justifyContent:'space-between',
            }}>
              <SubjectShape theme={theme} />
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:theme.deep, letterSpacing:'1px', opacity:0.7 }}>SUBJECT</div>
                <div style={{ fontSize:24, fontWeight:800, color:theme.text, marginTop:4, letterSpacing:'-0.5px' }}>{s.subject}</div>
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
  const K = window.klayoStudent;
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
  const K = window.klayoStudent;
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

  // Build 6×7 grid of day numbers (or null for padding)
  const cells = [];
  for (let i = 0; i < month.firstDow; i++) cells.push(null);
  for (let d = 1; d <= month.days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
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
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Klayo//Student Sessions//EN'];
    upcoming.forEach((s, i) => {
      const [start, end] = s.time.split('–');
      lines.push('BEGIN:VEVENT',
        `UID:klayo-session-${s.day}-${i}@klayo`,
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
    a.href = url; a.download = 'klayo-sessions.ics';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="My Sessions" subtitle="Your upcoming and past tutoring sessions" actions={[
        <Btn key="cal" variant="secondary" icon="download" small onClick={exportICS}>Export to Calendar</Btn>
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
              {K.getEnrolments().map(s => (
                <div key={s.subject} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.subjectColor }} />
                  <span style={{ fontSize:11, color:DS.muted }}>{s.subject}</span>
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
