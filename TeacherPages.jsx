// ══════════════════════════════════════════════════════════════
//  TutorOS — Extra Teacher Pages
// ══════════════════════════════════════════════════════════════

// Mock data (teacherClasses, homeworkFull, teacherAllClasses,
// DEFAULT_TRACKERS) lives in mocks/teacherPages.mock.jsx, loaded before this
// file in index.html. The Reports page is provided by Reports.jsx
// (window.TeacherReports).

// ─── Classes Page ───────────────────────────────────────────────────────────────
// The class list is a launch pad into each class, not a register. A row click opens
// the read-only class detail page (schedule + roster + stats). Attendance is taken
// from the Timetable / Attendance pages, which are driven by the centre timetable
// (see schedule-timetable architecture) — so there's deliberately no "take register"
// action here.
const openTeacherClass = (cls) => {
  window.__adminParam = cls.id;
  if (window.__navigate) window.__navigate('teacher', 'class_detail');
};

const TeacherClassesPage = () => {
  // Derive the class list from the ONE metrics layer (F2) so the count here
  // reconciles with the Dashboard and Analytics (was 5 from the teacherClasses
  // mock vs 4 canonical). Each canonical class is enriched with the mock's
  // display-only fields (score/attendance/hwPending/colour) by matching on group.
  const TM = window.teacherMetrics;
  const metrics = TM ? TM.getMetrics() : null;
  const list = React.useMemo(() => {
    if (!TM) return teacherClasses;
    return TM.getMyClasses().map(c => {
      const e = teacherClasses.find(t => t.group === c.group) || {};
      return {
        id: c.id, name: c.name, group: c.group, room: c.room, students: c.students,
        color: e.color || subjectColor(c.name),
        nextSession: e.nextSession || `${c.day} ${startTimeOf(c.time)}`,
        avgScore: e.avgScore != null ? e.avgScore : 0,
        attendance: e.attendance != null ? e.attendance : 0,
        hwPending: e.hwPending != null ? e.hwPending : 0,
      };
    });
  }, [TM]);
  const totalEnrolments = metrics ? metrics.enrolments : list.reduce((s, c) => s + c.students, 0);

  const [reqMsg, setReqMsg] = React.useState('');
  // (D6) Teachers can't self-schedule — the admin owns the timetable. "Schedule
  // Class" becomes a REQUEST to the admin (recorded to the audit trail).
  const requestClass = () => {
    if (window.klasioAudit) window.klasioAudit('request_class', 'timetable', { by: 'teacher' });
    setReqMsg('Request sent to your centre admin — they own the timetable and will set the day, time and room.');
    setTimeout(() => setReqMsg(''), 6000);
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="My Classes"
        subtitle={`${list.length} active class${list.length===1?'':'es'} · ${totalEnrolments} enrolments`}
        actions={[<Btn key="a" variant="secondary" icon="send" small onClick={requestClass}>Request a class</Btn>]}
      />

      {reqMsg && (
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 16px', marginBottom:16, background:DS.accentLight, border:`1px solid ${DS.cardBorder}`, borderRadius:10, fontSize:13, color:DS.text }}>
          <Icon name="check" size={15} color={DS.accent} /> {reqMsg}
        </div>
      )}

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
              {list.map(cls => {
                const scoreColor = cls.avgScore > 80 ? DS.success : DS.warning;
                const attColor   = cls.attendance > 90 ? DS.success : DS.warning;
                return (
                  <tr
                    key={cls.id}
                    style={{ borderBottom:`1px solid ${DS.border}`, cursor:'pointer' }}
                    onClick={() => openTeacherClass(cls)}
                  >
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:4, alignSelf:'stretch', minHeight:34, borderRadius:2, background:cls.color, flexShrink:0 }} />
                        <Icon name="chevron_r" size={14} color={DS.faint} />
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
                        ? <StatusPill tone="warning">{cls.hwPending} to mark</StatusPill>
                        : <span style={{ fontSize:12, color:DS.faint }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'right', whiteSpace:'nowrap' }} onClick={e => e.stopPropagation()}>
                      <Btn variant="secondary" icon="eye" small onClick={() => openTeacherClass(cls)}>View class</Btn>
                    </td>
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

// ─── Class Detail (teacher) — Google-Classroom-style tabbed workspace ────────────
// Opened from the My Classes list. A single class presented as a full workspace:
// a customisable hero banner, then a tab bar (Stream · Students · Homework · Lesson
// planner · Attendance · Progress · Analytics · Settings). Enrolment and the
// timetable stay owned by the admin (see schedule-timetable architecture) — the
// register is still taken from the Attendance page (via "Take register"), and the
// Settings tab surfaces a "Request a change" to the admin rather than direct edits.
// Announcements + banner theme persist per class in localStorage (frontend-only).

// Deterministic per-student trend so sparklines don't jitter on re-render.
const teacherClassTrend = (name, avg) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fff;
  return Array.from({ length: 8 }, (_, i) => {
    const wobble = ((h >> (i % 11)) % 13) - 6;
    return Math.max(35, Math.min(99, (avg || 70) - 5 + i + wobble));
  });
};

// Banner theme presets for the "Customise" popover. 'default' derives from the
// class's subject colour; the rest are two-stop gradients.
const CLASS_BANNER_THEMES = [
  { id:'default', name:'Subject' },
  { id:'indigo',  name:'Indigo',  from:'#4F46E5', to:'#7C3AED' },
  { id:'teal',    name:'Teal',    from:'#0D9488', to:'#0891B2' },
  { id:'ocean',   name:'Ocean',   from:'#0284C7', to:'#4F46E5' },
  { id:'forest',  name:'Forest',  from:'#15803D', to:'#0D9488' },
  { id:'sunset',  name:'Sunset',  from:'#EA580C', to:'#DB2777' },
  { id:'plum',    name:'Plum',    from:'#7C3AED', to:'#DB2777' },
  { id:'slate',   name:'Slate',   from:'#334155', to:'#475569' },
];

// Per-class localStorage (banner theme + announcement stream). Prototype only.
const classLS = {
  getBanner: (id) => { try { return localStorage.getItem(`klasio.classBanner.${id}`) || 'default'; } catch (e) { return 'default'; } },
  setBanner: (id, v) => { try { localStorage.setItem(`klasio.classBanner.${id}`, v); } catch (e) {} },
  getStream: (id) => { try { return JSON.parse(localStorage.getItem(`klasio.classStream.${id}`) || 'null'); } catch (e) { return null; } },
  setStream: (id, arr) => { try { localStorage.setItem(`klasio.classStream.${id}`, JSON.stringify(arr)); } catch (e) {} },
};

// Resolve a {from,to} gradient for a banner theme id (falls back to class colour).
const classBannerGradient = (themeId, color) => {
  const t = CLASS_BANNER_THEMES.find(x => x.id === themeId);
  if (t && t.from) return { from: t.from, to: t.to };
  return { from: color, to: shadeColor(color, -24) };
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

// Deterministic class-average trend (8 assessments) around the class avg score.
const classTrendSeries = (seed, avg) => {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fff;
  return Array.from({ length: 8 }, (_, i) => {
    const w = ((h >> (i % 11)) % 9) - 4;
    return Math.max(40, Math.min(98, Math.round((avg || 70) - 6 + i * 1.3 + w)));
  });
};

// Grade-band distribution across N students, weighted by the class average.
const classGradeDist = (n, avg, color) => {
  const p = avg >= 85 ? [0.4,0.35,0.2,0.05] : avg >= 75 ? [0.25,0.4,0.25,0.1] : avg >= 65 ? [0.15,0.35,0.35,0.15] : [0.08,0.27,0.4,0.25];
  const raw = p.map(x => Math.round(x * n));
  const sum = raw.reduce((s, v) => s + v, 0);
  raw[1] += (n - sum);
  if (raw[1] < 0) { raw[2] = Math.max(0, raw[2] + raw[1]); raw[1] = 0; }
  return [
    { g:'A* / A', n:Math.max(0, raw[0]), c:DS.success },
    { g:'B',      n:Math.max(0, raw[1]), c:color || DS.accent },
    { g:'C',      n:Math.max(0, raw[2]), c:DS.warning },
    { g:'D / U',  n:Math.max(0, raw[3]), c:DS.danger },
  ];
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
  { id:'progress',   label:'Progress',       icon:'trending_up' },
  { id:'analytics',  label:'Analytics',      icon:'chart' },
  { id:'settings',   label:'Settings',       icon:'settings' },
];

const ClassTabBar = ({ active, onChange, color }) => (
  <div style={{ display:'flex', gap:2, borderBottom:`1px solid ${DS.border}`, overflowX:'auto', marginBottom:24 }}>
    {CLASS_TABS.map(t => {
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

// "Customise" popover in the banner — swatch grid of banner themes.
const ClassBannerCustomiser = ({ value, onChange, color }) => {
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
      <button onClick={() => setOpen(o => !o)} style={{
        display:'inline-flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:8,
        background:'rgba(255,255,255,0.92)', border:'none', cursor:'pointer',
        fontSize:13, fontWeight:600, color:DS.sub, boxShadow:'0 1px 3px rgba(0,0,0,0.18)',
      }}>
        <Icon name="edit" size={14} color={DS.sub} /> Customise
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:40, width:236,
          background:DS.bg, border:`1px solid ${DS.border}`, borderRadius:12, boxShadow:DS.cardShadowHi, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:DS.text, marginBottom:10 }}>Banner theme</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {CLASS_BANNER_THEMES.map(t => {
              const g = classBannerGradient(t.id, color);
              const active = value === t.id;
              return (
                <button key={t.id} title={t.name} onClick={() => onChange(t.id)} style={{
                  height:40, borderRadius:8, cursor:'pointer',
                  background:`linear-gradient(120deg, ${g.from}, ${g.to})`,
                  border: active ? `2px solid ${DS.text}` : '2px solid transparent',
                  boxShadow: active ? '0 0 0 2px #fff inset' : 'none',
                }} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stream tab — announcement feed + class code / upcoming / about rail ──────────
const ClassStreamTab = ({ cls, color, subject, level, stream, onPost, onDelete, classHw, principalName, code }) => {
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
              <span style={{ fontSize:13.5, color:DS.muted }}>Announce something to your class…</span>
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
          <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="megaphone" title="No announcements yet" message="Share your first update with the class." /></div></Card>
        )}
      </div>
    </div>
  );
};

// ── Students tab ────────────────────────────────────────────────────────────────
const ClassStudentsTab = ({ cls, color, goProfile }) => {
  const [q, setQ] = React.useState('');
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
        <Btn variant="secondary" icon="message" small onClick={() => window.__navigate && window.__navigate('teacher', 'comms')}>Message class</Btn>
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
              <Sparkline data={teacherClassTrend(name, cls.avgScore)} color={color} width={72} height={26} />
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
  const active = classHw.filter(h => h.status !== 'complete').length;
  const toMark = classHw.filter(h => h.status === 'marking').length;
  const sub = classHw.reduce((s, h) => s + h.submitted, 0), tot = classHw.reduce((s, h) => s + h.total, 0);
  const rate = tot ? Math.round(sub / tot * 100) : 0;
  const goHw = () => window.__navigate && window.__navigate('teacher', 'homework');
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <Btn variant="primary" icon="plus" small onClick={goHw}>Set homework</Btn>
      </div>
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Assignments" value={classHw.length} icon="clip" /></Card>
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
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="clip" title="No homework set" message="Set the first assignment for this class." action={<Btn variant="primary" icon="plus" onClick={goHw}>Set homework</Btn>} /></div></Card>
      )}
    </div>
  );
};

// ── Lesson planner tab ──────────────────────────────────────────────────────────
const ClassPlannerTab = ({ cls, color }) => {
  const plans = Object.values(window.__lessonPlans || {})
    .filter(p => p.group === cls.group)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const todayISO = new Date().toISOString().slice(0, 10);
  const openPlan = (date, mode) => window.__openLessonPlanner && window.__openLessonPlanner(cls.group, date, mode);
  const fmtDate = (iso) => { const [y, m, d] = (iso || '').split('-').map(Number); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return d ? { day:d, mon:mo[m - 1], year:y } : { day:iso, mon:'', year:'' }; };
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <Btn variant="primary" icon="plus" small onClick={() => openPlan(todayISO, 'edit')}>New lesson plan</Btn>
      </div>
      {plans.length ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {plans.map(p => {
            const dt = fmtDate(p.date);
            return (
              <Card key={p.date}>
                <div style={{ padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ width:52, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:11, color:DS.muted, textTransform:'uppercase', fontWeight:600 }}>{dt.mon}</div>
                    <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{dt.day}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text }}>{p.plan.title}</div>
                    <div style={{ fontSize:12, color:DS.muted, marginTop:2 }}>{p.plan.topic} · {p.plan.duration} min</div>
                    {p.plan.objectives && <div style={{ fontSize:12.5, color:DS.sub, marginTop:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.plan.objectives.replace(/•/g, '').replace(/\n/g, ' ').trim()}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                      {p.plan.resources && p.plan.resources.length > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, color:DS.muted }}><Icon name="file" size={13} color={DS.faint} />{p.plan.resources.length} resource{p.plan.resources.length === 1 ? '' : 's'}</span>}
                      <span style={{ fontSize:11.5, color:DS.faint }}>Saved {p.savedAt}</span>
                    </div>
                  </div>
                  <Btn variant="secondary" icon="eye" small onClick={() => openPlan(p.date, 'view')}>Open</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><div style={{ padding:'40px 20px' }}><EmptyState icon="book" title="No lesson plans yet" message="Plan your first lesson for this class." action={<Btn variant="primary" icon="plus" onClick={() => openPlan(todayISO, 'edit')}>New lesson plan</Btn>} /></div></Card>
      )}
    </div>
  );
};

// ── Attendance tab ──────────────────────────────────────────────────────────────
const ClassAttendanceTab = ({ cls, color }) => {
  const attColor = cls.attendance >= 90 ? DS.success : cls.attendance >= 80 ? DS.warning : DS.danger;
  const sessions = classRecentSessions(cls.id + cls.group, cls.students, cls.attendance);
  const takeRegister = () => { window.__registerGroup = cls.group; window.__navigate && window.__navigate('teacher', 'attendance'); };
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

// ── Progress tab ────────────────────────────────────────────────────────────────
const ClassProgressTab = ({ cls, color }) => {
  const labels = ['4 Mar','11 Mar','18 Mar','25 Mar','1 Apr','8 Apr','15 Apr','22 Apr'];
  const trend = classTrendSeries(cls.id + cls.group, cls.avgScore);
  const dist = classGradeDist(cls.students, cls.avgScore, color);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <Card title="Class score trend" actions={<Badge variant="default">Last 8 assessments</Badge>}>
          <div style={{ padding:'16px 20px 8px' }}>
            <LineChart labels={labels} series={[{ label:'Class avg', data:trend, color }]} height={210} area />
          </div>
        </Card>
        <Card title="Student breakdown">
          <div>
            {cls.studentList.map((name, i) => {
              const base = trend[trend.length - 1];
              const offset = (i % 5) - 2;
              const score = Math.max(42, Math.min(99, Math.round(base + offset * 5)));
              const up = offset >= 0;
              return (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderTop:`1px solid ${DS.border}` }}>
                  <Avatar name={name} size={32} color={color} />
                  <div style={{ flex:1, minWidth:0, fontSize:13, fontWeight:500, color:DS.text }}>{name}</div>
                  <Sparkline data={teacherClassTrend(name, cls.avgScore)} color={up ? DS.success : DS.danger} width={70} height={24} />
                  <ScorePill score={score} />
                  <Icon name={up ? 'trending_up' : 'trending_dn'} size={14} color={up ? DS.success : DS.danger} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Card title="Summary">
          <div style={{ padding:'14px 18px' }}>
            {[
              ['Students', cls.students],
              ['Avg score', cls.avgScore + '%'],
              ['Attendance', cls.attendance + '%'],
              ['Next session', cls.nextSession],
            ].map(([l, v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
                <span style={{ color:DS.muted }}>{l}</span><span style={{ color:DS.text, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Grade distribution">
          <div style={{ padding:'16px 18px' }}>
            {dist.map(d => (
              <div key={d.g} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12.5, color:DS.sub }}>{d.g}</span>
                  <span style={{ fontSize:12.5, fontWeight:600, color:d.c }}>{d.n}</span>
                </div>
                <div style={{ height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${cls.students ? (d.n / cls.students) * 100 : 0}%`, height:'100%', background:d.c, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── Analytics tab ───────────────────────────────────────────────────────────────
const ClassAnalyticsTab = ({ cls, color, classHw }) => {
  const labels = ['4 Mar','11 Mar','18 Mar','25 Mar','1 Apr','8 Apr','15 Apr','22 Apr'];
  const trend = classTrendSeries(cls.id + cls.group, cls.avgScore);
  const dist = classGradeDist(cls.students, cls.avgScore, color);
  const hwLabels = classHw.map(h => h.title.split(':')[0].slice(0, 12));
  const hwRates = classHw.map(h => h.total ? Math.round(h.submitted / h.total * 100) : 0);
  const sub = classHw.reduce((s, h) => s + h.submitted, 0), tot = classHw.reduce((s, h) => s + h.total, 0);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Avg score" value={cls.avgScore + '%'} color={cls.avgScore >= 80 ? DS.success : DS.warning} icon="chart" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Attendance" value={cls.attendance + '%'} color={cls.attendance >= 90 ? DS.success : DS.warning} icon="check" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="HW completion" value={(tot ? Math.round(sub / tot * 100) : 0) + '%'} color={color} icon="clip" /></Card>
        <Card style={{ flex:1, minWidth:150 }}><ClassStat label="Enrolment" value={cls.students} icon="users" /></Card>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card title="Attainment trend">
          <div style={{ padding:'16px 20px 8px' }}>
            <LineChart labels={labels} series={[{ label:'Class avg', data:trend, color }]} height={200} area />
          </div>
        </Card>
        <Card title="Homework submission by task">
          <div style={{ padding:'16px 20px 8px' }}>
            {hwLabels.length ? <BarChart labels={hwLabels} data={hwRates} color={color} height={200} /> : <div style={{ padding:'40px 0', textAlign:'center', fontSize:13, color:DS.muted }}>No homework data yet.</div>}
          </div>
        </Card>
      </div>
      <Card title="Grade distribution">
        <div style={{ padding:'18px 20px', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16 }}>
          {dist.map(d => (
            <div key={d.g} style={{ textAlign:'center', padding:'14px', border:`1px solid ${DS.border}`, borderRadius:10 }}>
              <div style={{ fontSize:28, fontWeight:800, color:d.c, lineHeight:1 }}>{d.n}</div>
              <div style={{ fontSize:12, color:DS.muted, marginTop:6 }}>{d.g}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ── Settings tab ────────────────────────────────────────────────────────────────
const ClassSettingsTab = ({ cls, color, subject, level, bannerTheme, setBannerTheme }) => {
  const [notif, setNotif] = React.useState({ submissions:true, attendance:true, messages:false });
  const [posts, setPosts] = React.useState({ studentsPost:false, studentsComment:true });
  const [reqMsg, setReqMsg] = React.useState('');
  const requestChange = () => {
    if (window.klasioAudit) window.klasioAudit('request_class_change', 'timetable', { by:'teacher', class:cls.group });
    setReqMsg('Request sent to your centre admin — they own class scheduling and enrolment.');
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
      <Card title="Appearance" subtitle="Personalise how this class looks to you">
        <div style={{ padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:DS.sub, marginBottom:10 }}>Banner theme</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {CLASS_BANNER_THEMES.map(t => {
              const g = classBannerGradient(t.id, color);
              const active = bannerTheme === t.id;
              return (
                <button key={t.id} onClick={() => setBannerTheme(t.id)} title={t.name} style={{
                  width:64, height:40, borderRadius:8, cursor:'pointer',
                  background:`linear-gradient(120deg, ${g.from}, ${g.to})`,
                  border: active ? `2px solid ${DS.text}` : '2px solid transparent', boxShadow: active ? '0 0 0 2px #fff inset' : 'none',
                }} />
              );
            })}
          </div>
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
            <Btn variant="secondary" icon="send" small onClick={requestChange}>Request a change</Btn>
          </div>
          {reqMsg && <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, fontSize:12.5, color:DS.success }}><Icon name="check" size={14} color={DS.success} />{reqMsg}</div>}
        </div>
      </Card>

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
  const principalName = window.teacherMetrics ? window.teacherMetrics.getPrincipal().name : 'Sarah Clarke';
  const [activeTab, setActiveTab] = React.useState('stream');
  const [bannerTheme, setBannerThemeState] = React.useState(() => classLS.getBanner(id));
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
    avgScore:   e.avgScore   != null ? e.avgScore   : 0,
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
    setBannerThemeState(classLS.getBanner(id));
    setActiveTab('stream');
  }, [id]);

  if (!cls) return (
    <div style={{ padding:'32px' }}>
      <EmptyState icon="book" title="Class not found"
        message="This class may have been removed or you no longer teach it."
        action={<Btn variant="primary" onClick={backToClasses}>Back to My Classes</Btn>} />
    </div>
  );

  const color   = cls.color || DS.accent;
  const level   = /A-?level/i.test(cls.name) ? 'A-Level' : /GCSE/i.test(cls.name) ? 'GCSE' : null;
  const subject = cls.name.replace(/^(GCSE|A-?Level)\s+/i, '');
  const code    = classJoinCode(cls.id, cls.group);
  const grad    = classBannerGradient(bannerTheme, color);

  // Homework set for this group — match homeworkFull rows by year number + group letter
  // ('Year 10 – Group A' ↔ 'Yr 10 Group A').
  const yr  = (cls.group.match(/\d+/) || [])[0];
  const grp = (cls.group.match(/Group\s+([A-Za-z])/i) || [])[1];
  const classHw = homeworkFull.filter(h => {
    const hy = (h.class.match(/\d+/) || [])[0];
    const hg = (h.class.match(/Group\s+([A-Za-z])/i) || [])[1];
    return hy === yr && grp && hg === grp;
  });

  // Best-effort link to the shared student profile — only if the roster name resolves
  // to a real record in the admin store.
  const goProfile = (name) => {
    const s = store.students.find(st => studentName(st) === name);
    if (s) { window.__adminParam = s.id; window.__navigate && window.__navigate('teacher', 'student_profile'); }
  };

  const setBannerTheme = (v) => { setBannerThemeState(v); classLS.setBanner(id, v); };
  const postAnnouncement = (text) => { const next = [{ id:Date.now(), author:principalName, at:Date.now(), text }, ...stream]; setStream(next); classLS.setStream(id, next); };
  const deleteAnnouncement = (pid) => { const next = stream.filter(p => p.id !== pid); setStream(next); classLS.setStream(id, next); };

  return (
    <div style={{ padding:'26px 32px', maxWidth:1180, margin:'0 auto' }}>
      {/* Back link */}
      <button onClick={backToClasses} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:DS.muted, fontSize:13, fontWeight:500, padding:0, marginBottom:14 }}>
        <Icon name="chevron_l" size={15} color={DS.muted} /> My Classes
      </button>

      {/* Banner — outer wrapper is NOT clipped so the Customise popover can overflow;
          the inner card clips its gradient + decorative rings to the rounded corners. */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden',
          background:`linear-gradient(120deg, ${grad.from}, ${grad.to})`, minHeight:186,
          display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'26px 30px', boxShadow:DS.cardShadow }}>
          {/* Decorative rings */}
          <svg width="320" height="320" viewBox="0 0 320 320" style={{ position:'absolute', top:-40, right:-20, opacity:0.16, pointerEvents:'none' }}>
            <circle cx="220" cy="90" r="120" fill="none" stroke="#fff" strokeWidth="18" />
            <circle cx="270" cy="150" r="70" fill="none" stroke="#fff" strokeWidth="14" />
            <circle cx="150" cy="60" r="10" fill="#fff" />
          </svg>
          {/* Title block */}
          <div style={{ position:'relative', zIndex:2 }}>
            <div style={{ display:'flex', gap:7, marginBottom:10, flexWrap:'wrap' }}>
              {[subject, level, `${cls.students} students`].filter(Boolean).map((t, i) => (
                <span key={i} style={{ fontSize:11.5, fontWeight:600, color:'#fff', background:'rgba(255,255,255,0.22)', padding:'3px 10px', borderRadius:999 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.6px', lineHeight:1.1 }}>{cls.name}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.9)', marginTop:6 }}>{cls.group} · {cls.day} {cls.time} · {cls.room}</div>
          </div>
        </div>
        {/* Customise — in the non-clipped wrapper so its popover isn't cut off */}
        <div style={{ position:'absolute', top:18, right:18, zIndex:5 }}>
          <ClassBannerCustomiser value={bannerTheme} onChange={setBannerTheme} color={color} />
        </div>
      </div>

      {/* Tabs */}
      <ClassTabBar active={activeTab} onChange={setActiveTab} color={color} />

      {/* Tab content */}
      {activeTab === 'stream'     && <ClassStreamTab cls={cls} color={color} subject={subject} level={level} stream={stream} onPost={postAnnouncement} onDelete={deleteAnnouncement} classHw={classHw} principalName={principalName} code={code} />}
      {activeTab === 'students'   && <ClassStudentsTab cls={cls} color={color} goProfile={goProfile} />}
      {activeTab === 'homework'   && <ClassHomeworkTab cls={cls} color={color} classHw={classHw} />}
      {activeTab === 'planner'    && <ClassPlannerTab cls={cls} color={color} />}
      {activeTab === 'attendance' && <ClassAttendanceTab cls={cls} color={color} />}
      {activeTab === 'progress'   && <ClassProgressTab cls={cls} color={color} />}
      {activeTab === 'analytics'  && <ClassAnalyticsTab cls={cls} color={color} classHw={classHw} />}
      {activeTab === 'settings'   && <ClassSettingsTab cls={cls} color={color} subject={subject} level={level} bannerTheme={bannerTheme} setBannerTheme={setBannerTheme} />}
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
  const tsStore = window.useTimesheetStore ? window.useTimesheetStore() : null;
  const me = store.teachers.find(t => t.name === 'Sarah Clarke') || store.teachers[0];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const todayName = new Date().toLocaleDateString('en-GB', { weekday:'long' });
  const todayISO = window.tsTodayISO ? window.tsTodayISO() : new Date().toISOString().slice(0, 10);
  // A class is cancelled in the Today view if its session for today is in the cancelled set.
  const isCancelledToday = (cls) => !!(tsStore && (tsStore.cancelled || []).includes(`${cls.id}|${todayISO}`)) && (todaySessions.length > 0);

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
              const cancelled = isCancelledToday(c);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < focusSessions.length-1 ? `1px solid ${DS.border}` : 'none', opacity: cancelled ? 0.55 : 1 }}>
                  <div style={{ width:60, textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:DS.text, fontVariantNumeric:'tabular-nums', textDecoration: cancelled ? 'line-through' : 'none' }}>{startTimeOf(c.time)}</div>
                    <div style={{ fontSize:11, color:DS.faint }}>{(c.time||'').split(/[–-]/)[1]?.trim()}</div>
                  </div>
                  <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background: cancelled ? DS.border : color }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:DS.text, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ textDecoration: cancelled ? 'line-through' : 'none' }}>{c.name}</span>
                      {cancelled && <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.04em', color:DS.danger, background:DS.dangerBg, padding:'1px 6px', borderRadius:5, textTransform:'uppercase' }}>Cancelled</span>}
                    </div>
                    <div style={{ fontSize:12, color:DS.muted }}>{c.group} · {c.room || 'No room'} · {c.students} students</div>
                  </div>
                  <Btn variant={cancelled ? 'secondary' : 'primary'} icon="check" small onClick={() => takeRegister(c)}>{cancelled ? 'Review' : 'Take register'}</Btn>
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
const AttAdminMissing = ({ sessions, rosterOf, att, now, onOpen, onGrant, onRevoke, onBackToTeacher }) => {
  const missing = sessions
    .filter(s => s.derived.state === 'awaiting' || s.derived.state === 'lapsed')
    .sort((a, b) => a.starts_at - b.starts_at);
  return (
    <Card title="Sessions missing a register" subtitle="Quick oversight of your own cohort. For every teacher across the centre, use the admin Attendance page."
      actions={<Btn variant="secondary" small onClick={onBackToTeacher}>Back to my register</Btn>}>
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
  const me = store.teachers.find(t => t.name === 'Sarah Clarke') || store.teachers[0];
  const activeTeachers = store.teachers.filter(t => t.status === 'active');
  const myClasses = store.classes.filter(c => me && c.teacher === me.name && c.status !== 'paused');

  // Materialise this teacher's dated sessions across the window, overlaying persisted
  // submissions + cancellations. Every derived state comes from here.
  const sessions = window.materialiseSessions(myClasses, settings, now, att);
  const rosterOf = React.useCallback((s) => window.attRosterFor(s.classId, s.group, store), [store]);

  const [selectedDate, setSelectedDate] = React.useState(() => window.attIso(new Date(now)));
  const [viewRole, setViewRole] = React.useState('teacher');   // teacher | admin (D6 stub)
  const [focusClassId, setFocusClassId] = React.useState(() => (myClasses[0] && myClasses[0].id) || null);
  const [panelSession, setPanelSession] = React.useState(null);

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

  return (
    <div style={{ padding:'32px' }}>
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
          onOpen={openPanel} onGrant={grantUnlock} onRevoke={revokeUnlock} onBackToTeacher={() => setViewRole('teacher')} />
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
    // Export of children's data → audit entry (AADC data-minimisation: tracker
    // columns only, no contact/DOB/address).
    if (window.klasioAudit) window.klasioAudit('export_csv', `tracker:${active.name}`, { rows: rows.length, scope: 'teacher' });
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

// ─── Teacher Students Page ──────────────────────────────────────────────────────
// The teacher's own slice of the centre roster: only students enrolled in a class
// this teacher teaches (store.classes.filter(c => c.teacher === me.name) → classIds
// → store.students). Read-only — the admin owns enrolment; the teacher views and
// messages from here. Mirrors AdminStudentsPage's list + detail-drawer pattern but
// scoped to "my" classes, with an extra per-class filter. `me` is resolved the same
// way as TeacherTimetablePage (Sarah Clarke, falling back to the first teacher).
const TeacherStudentsPage = () => {
  const store = useAdminStore();
  const me = store.teachers.find(t => t.name === 'Sarah Clarke') || store.teachers[0];
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
    const cols = ['Name', 'Year', 'Attendance %', 'HW %', 'Avg Score', 'Status'];
    const lines = [cols.join(',')].concat(filtered.map(s => [
      studentName(s), s.year, s.attendance, s.hw, s.score, atRisk(s) ? 'At risk' : 'Active',
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
      <div style={{ padding:'32px' }}>
        <PageHeader title="My Students" subtitle="Students enrolled in your classes" />
        <Card>
          <EmptyState icon="users" title="No students yet"
            message="When your centre admin enrols students into the classes you teach, they'll appear here." />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding:'32px' }}>
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
            cols={['Student','Year','My Classes','Attendance','HW %','Avg Score','Status',{ label:'', align:'right' }]}
            rows={filtered.map(s => [
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span onClick={() => setSelected(sel && sel.id === s.id ? null : s)} style={{ fontSize:13, fontWeight:600, color:DS.text, cursor:'pointer' }}>{studentName(s)}</span>
                <span style={{ fontSize:11.5, color:DS.faint }}>Last seen {s.lastSeen || '—'}</span>
              </div>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{classesOf(s).map(classChip)}</div>,
              <span style={{ fontSize:13, fontWeight:600, color: s.attendance < 80 ? DS.danger : s.attendance < 90 ? DS.warning : DS.success }}>{s.attendance}%</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.hw < 50 ? DS.danger : s.hw < 70 ? DS.warning : DS.success }}>{s.hw}%</span>,
              <ScorePill score={s.score} />,
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
                ['Average score', `${sel.score}%`],
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
                <Btn variant="secondary" icon="message" onClick={() => window.__navigate && window.__navigate('teacher', 'comms')}>Message</Btn>
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
    initialGroup={plannerArgs && plannerArgs.group}
    initialDate={plannerArgs && plannerArgs.date}
    initialMode={plannerArgs && plannerArgs.mode}
  />;
  return null;
};

Object.assign(window, { TeacherPages });
