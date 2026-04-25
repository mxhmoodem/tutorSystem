// ══════════════════════════════════════════════════════════════
//  TutorOS — Teacher Dashboard
// ══════════════════════════════════════════════════════════════

const todaySchedule = [
  { time: '09:00', subject: 'GCSE Mathematics', group: 'Year 10 – Group A', room: 'Room 3', students: 8, status: 'completed' },
  { time: '10:30', subject: 'GCSE Mathematics', group: 'Year 11 – Group B', room: 'Room 3', students: 7, status: 'current'   },
  { time: '13:00', subject: 'A-Level Maths',    group: 'Year 12 – Group A', room: 'Room 5', students: 5, status: 'upcoming'  },
  { time: '15:00', subject: 'GCSE Mathematics', group: 'Year 9 – Group C',  room: 'Room 3', students: 9, status: 'upcoming'  },
];

const homeworkItems = [
  { title: 'Algebra: Simultaneous Equations',   class: 'Yr 10 Group A', due: '22 Apr', submitted: 8,  total: 8,  toMark: 3,  status: 'marking'   },
  { title: 'Calculus: Differentiation Basics',  class: 'Yr 12 Group A', due: '24 Apr', submitted: 4,  total: 5,  toMark: 4,  status: 'marking'   },
  { title: 'Trigonometry: Sine & Cosine Rules', class: 'Yr 11 Group B', due: '27 Apr', submitted: 2,  total: 7,  toMark: 0,  status: 'open'      },
  { title: 'Statistics: Probability Trees',     class: 'Yr 10 Group A', due: '29 Apr', submitted: 0,  total: 8,  toMark: 0,  status: 'open'      },
];

const studentProgress = [
  { name: 'Emma Thompson',    scores: [72, 76, 74, 80, 83], predicted: 'B',  trend: 'up'   },
  { name: 'Oliver Chen',      scores: [88, 90, 87, 92, 94], predicted: 'A*', trend: 'up'   },
  { name: 'Sophia Patel',     scores: [65, 63, 68, 66, 70], predicted: 'C',  trend: 'up'   },
  { name: 'James Wilson',     scores: [79, 75, 72, 71, 69], predicted: 'B',  trend: 'down' },
  { name: 'Amelia Roberts',   scores: [55, 50, 48, 52, 49], predicted: 'D',  trend: 'down' },
  { name: 'Noah Fitzgerald',  scores: [70, 68, 60, 55, 52], predicted: 'D',  trend: 'down' },
  { name: 'Isabella Martinez',scores: [82, 85, 88, 90, 91], predicted: 'A',  trend: 'up'   },
  { name: 'Ethan Huang',      scores: [77, 79, 80, 78, 83], predicted: 'B',  trend: 'up'   },
];

const aiQueue = [
  { student: 'Oliver Chen',       hw: 'Calculus: Differentiation Basics', submitted: '2h ago',   confidence: 92, draft: 'Excellent work — your chain rule application is correct. Consider showing intermediate steps for full marks in the exam.' },
  { student: 'Sophia Patel',      hw: 'Calculus: Differentiation Basics', submitted: '3h ago',   confidence: 85, draft: 'Good attempt. You have the right method but made an arithmetic error in step 3 — check your sign when expanding the bracket.' },
  { student: 'Ethan Huang',       hw: 'Calculus: Differentiation Basics', submitted: '5h ago',   confidence: 88, draft: 'Strong understanding of the concept. Your notation could be cleaner — remember to write dy/dx clearly throughout.' },
  { student: 'Isabella Martinez', hw: 'Calculus: Differentiation Basics', submitted: 'Yesterday', confidence: 95, draft: 'Flawless. All six questions correct with clear working shown. Well done.' },
];

const attendanceClass = {
  group: 'Year 11 – Group B',
  subject: 'GCSE Mathematics',
  students: [
    { name: 'Emma Thompson',  status: 'present' },
    { name: 'Oliver Chen',    status: 'present' },
    { name: 'Sophia Patel',   status: null },
    { name: 'James Wilson',   status: null },
    { name: 'Amelia Roberts', status: 'absent' },
    { name: 'Noah Fitzgerald',status: null },
    { name: 'Ethan Huang',    status: null },
  ],
};

const TeacherDashboard = () => {
  const [hwTab, setHwTab] = React.useState('marking');
  const [attendance, setAttendance] = React.useState(
    Object.fromEntries(attendanceClass.students.map(s => [s.name, s.status]))
  );
  const [attendanceSaved, setAttendanceSaved] = React.useState(false);
  const [expandedAI, setExpandedAI] = React.useState(null);
  const [editingFeedback, setEditingFeedback] = React.useState({});
  const [sentFeedback, setSentFeedback] = React.useState({});

  const markAttendance = (name, status) => {
    setAttendance(prev => ({ ...prev, [name]: status }));
    setAttendanceSaved(false);
  };

  const saveAttendance = () => {
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 2000);
  };

  const statusConfig = {
    completed: { label: 'Done',    bg: DS.successBg,  color: DS.success, border: DS.successBorder },
    current:   { label: 'Now',     bg: DS.accentLight, color: DS.accent,  border: DS.accentBorder  },
    upcoming:  { label: 'Upcoming',bg: DS.surface,     color: DS.muted,   border: DS.border        },
  };

  return (
    <div style={{ flex: 1, padding: '32px', overflow: 'auto', minWidth: 0 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Friday, 25 April 2026 · 4 classes today"
        actions={[
          <Btn key="hw" variant="secondary" icon="clip" small>Set Homework</Btn>,
          <Btn key="mark" variant="primary" icon="edit" small>Mark Submissions</Btn>,
        ]}
      />

      {/* ── Today's Schedule ─────────────────────────────────────── */}
      <Card title="Today's Schedule" style={{ marginBottom: 20 }} actions={[
        <Badge key="b" variant="accent">4 classes</Badge>
      ]}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {todaySchedule.map((cls, i) => {
            const sc = statusConfig[cls.status];
            return (
              <div key={i} style={{
                padding: '16px 20px',
                borderRight: i < todaySchedule.length - 1 ? `1px solid ${DS.border}` : 'none',
                borderTop: `2px solid ${cls.status === 'current' ? DS.accent : 'transparent'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{cls.time}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                    background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                  }}>{sc.label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, marginBottom: 3 }}>{cls.subject}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginBottom: 8 }}>{cls.group}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DS.faint }}>
                  <span>{cls.room}</span>
                  <span>{cls.students} students</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Three-column layout ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Attendance Widget */}
        <Card title={`Attendance — ${attendanceClass.group}`} actions={[
          attendanceSaved
            ? <Badge key="saved" variant="success">Saved</Badge>
            : <Btn key="save" variant="primary" small onClick={saveAttendance}>Save</Btn>
        ]}>
          <div style={{ padding: '8px 0' }}>
            {attendanceClass.students.map((s, i) => {
              const status = attendance[s.name];
              return (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                  borderBottom: i < attendanceClass.students.length - 1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <Avatar name={s.name} size={28} />
                  <span style={{ flex: 1, fontSize: 13, color: DS.sub }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['present', 'absent', 'late'].map(st => (
                      <button
                        key={st}
                        onClick={() => markAttendance(s.name, st)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: `1px solid`,
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          transition: 'all 0.1s',
                          borderColor: status === st
                            ? st === 'present' ? DS.successBorder : st === 'absent' ? DS.dangerBorder : DS.warningBorder
                            : DS.border,
                          background: status === st
                            ? st === 'present' ? DS.successBg : st === 'absent' ? DS.dangerBg : DS.warningBg
                            : DS.surface,
                          color: status === st
                            ? st === 'present' ? DS.success : st === 'absent' ? DS.danger : DS.warning
                            : DS.faint,
                        }}
                      >
                        {st === 'present' ? 'P' : st === 'absent' ? 'A' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px 16px', background: DS.surface, borderTop: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              {['present','absent','late'].map(st => {
                const count = Object.values(attendance).filter(v => v === st).length;
                const colors = { present: DS.success, absent: DS.danger, late: DS.warning };
                return (
                  <span key={st} style={{ color: colors[st], fontWeight: 600 }}>
                    {count} {st}
                  </span>
                );
              })}
              <span style={{ color: DS.faint, marginLeft: 'auto' }}>
                {Object.values(attendance).filter(Boolean).length}/{attendanceClass.students.length} marked
              </span>
            </div>
          </div>
        </Card>

        {/* Homework Panel */}
        <Card title="Homework" actions={[
          <Btn key="new" variant="primary" icon="plus" small>Set New</Btn>
        ]}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${DS.border}`, padding: '0 16px' }}>
            {[['marking','To Mark'], ['open', 'Open']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setHwTab(id)}
                style={{
                  padding: '9px 12px', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: hwTab === id ? 600 : 400,
                  color: hwTab === id ? DS.accent : DS.muted,
                  borderBottom: `2px solid ${hwTab === id ? DS.accent : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {label}
                {id === 'marking' && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 10, background: DS.accent, color: '#fff',
                  }}>7</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 0' }}>
            {homeworkItems.filter(h => hwTab === 'marking' ? h.status === 'marking' : h.status === 'open').map((hw, i, arr) => (
              <div key={hw.title} style={{
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : 'none',
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: DS.text, marginBottom: 4 }}>{hw.title}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginBottom: 8 }}>{hw.class} · Due {hw.due}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: DS.surface, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(hw.submitted / hw.total) * 100}%`,
                      height: '100%', background: hw.submitted === hw.total ? DS.success : DS.accent,
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: DS.muted, whiteSpace: 'nowrap' }}>
                    {hw.submitted}/{hw.total} in
                  </span>
                  {hw.toMark > 0 && (
                    <Badge variant="warning">{hw.toMark} to mark</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Student Progress */}
        <Card title="Student Progress" actions={[<Badge key="b" variant="default">Yr 10 Group A</Badge>]}>
          <div style={{ padding: '8px 0' }}>
            {studentProgress.slice(0, 6).map((s, i) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                borderBottom: i < 5 ? `1px solid ${DS.border}` : 'none',
              }}>
                <Avatar name={s.name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: DS.muted }}>Predicted: {s.predicted}</div>
                </div>
                <Sparkline data={s.scores} color={s.trend === 'up' ? DS.success : DS.danger} />
                <ScorePill score={s.scores[s.scores.length - 1]} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── AI Feedback Queue ─────────────────────────────────────── */}
      <Card
        title="AI Feedback Queue"
        actions={[
          <Badge key="b" variant="accent"><Icon name="brain" size={11} /> 4 awaiting review</Badge>,
          <Btn key="v" variant="ghost" icon="eye" small>View all</Btn>,
        ]}
      >
        <div>
          {aiQueue.map((item, i) => {
            const isExpanded = expandedAI === i;
            const hasSent = sentFeedback[i];
            const feedbackText = editingFeedback[i] !== undefined ? editingFeedback[i] : item.draft;

            return (
              <div key={i} style={{ borderBottom: i < aiQueue.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedAI(isExpanded ? null : i)}
                >
                  <Avatar name={item.student} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{item.student}</div>
                    <div style={{ fontSize: 12, color: DS.muted }}>{item.hw}</div>
                  </div>
                  <div style={{ display: 'flex', align: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: DS.faint }}>{item.submitted}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.confidence > 90 ? DS.success : DS.warning }} />
                      <span style={{ fontSize: 11, color: DS.muted }}>{item.confidence}% confidence</span>
                    </div>
                    {hasSent
                      ? <Badge variant="success">Sent</Badge>
                      : <Badge variant="accent">Draft ready</Badge>
                    }
                    <Icon name={isExpanded ? 'chevron_d' : 'chevron_r'} size={14} color={DS.faint} />
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px 60px' }}>
                    <div style={{
                      background: DS.surface, border: `1px solid ${DS.border}`,
                      borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 11, color: DS.accent, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="brain" size={11} /> AI DRAFT
                      </div>
                      <textarea
                        rows={3}
                        value={feedbackText}
                        onChange={e => setEditingFeedback(prev => ({ ...prev, [i]: e.target.value }))}
                        style={{
                          width: '100%', fontSize: 13, color: DS.sub, lineHeight: 1.6,
                          border: 'none', background: 'transparent', resize: 'none',
                          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="primary" icon="check" small onClick={() => {
                        setSentFeedback(prev => ({ ...prev, [i]: true }));
                        setExpandedAI(null);
                      }}>
                        Send to parent
                      </Btn>
                      <Btn variant="secondary" icon="edit" small>Edit</Btn>
                      <Btn variant="ghost" icon="x" small>Reject draft</Btn>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { TeacherDashboard });
