// ══════════════════════════════════════════════════════════════
//  TutorOS — Teacher Dashboard
// ══════════════════════════════════════════════════════════════

// Mock data (todaySchedule, homeworkItems, studentProgress,
// attendanceClass) lives in mocks/teacherDashboard.mock.jsx, loaded
// before this file in index.html. Report drafts come from the shared
// reports store (window.useReportsStore from Reports.jsx).

const TODAY_ISO = '2026-04-25';

const TeacherDashboard = () => {
  const [hwTab, setHwTab] = React.useState('marking');
  // Tick when a plan is created/edited elsewhere so badges update on return.
  const [, setPlanTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setPlanTick(t => t + 1);
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);
  const hasPlan = (group) => {
    const store = window.__lessonPlans || {};
    return !!store[`${group}__${TODAY_ISO}`];
  };
  const openPlanner = (group) => {
    if (window.__openLessonPlanner) {
      window.__openLessonPlanner(group, TODAY_ISO, hasPlan(group) ? 'view' : 'edit');
    }
  };
  const [attendance, setAttendance] = React.useState(
    Object.fromEntries(attendanceClass.students.map(s => [s.name, s.status]))
  );
  const [attendanceSaved, setAttendanceSaved] = React.useState(false);
  const reportsStore = useReportsStore();
  const reportConfig = reportsStore.store.config;
  const reportDrafts = reportsStore.reportsArr.filter(r => r.status === 'draft');

  // ── "Reports due" — derived live from the resolved reporting rules ──
  // For each of this teacher's students, resolve the effective policy; skip OFF;
  // compute a due date from the cadence + the last published report; flag overdue.
  const TEACHER_NAME = 'Sarah Clarke';   // logged-in teacher in the demo
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmtDue = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const reportsDue = (() => {
    if (typeof resolveForStudent !== 'function' || typeof reportStudents !== 'function') return [];
    const myClassIds = (typeof reportClasses === 'function' ? reportClasses() : [])
      .filter(c => c.teacher === TEACHER_NAME).map(c => c.id);
    const mine = reportStudents().filter(s => (s.classIds || []).some(id => myClassIds.includes(id)));
    return mine.map(s => {
      const pol = resolveForStudent(s, reportConfig);
      if (pol.requirement === 'OFF') return null;
      const name = `${s.firstName} ${s.lastName}`;
      const last = reportsStore.reportsArr
        .filter(r => r.studentName === name && r.status === 'published' && r.datePublished)
        .sort((a, b) => b.datePublished.localeCompare(a.datePublished))[0];
      const base = last ? last.datePublished : '2026-03-15';   // notional last cycle
      const due = addDays(base, rptFreqDays(pol.frequency));
      const tpl = reportsStore.store.templates.find(t => t.id === pol.templateId);
      return { id: s.id, name, requirement: pol.requirement, frequency: pol.frequency,
        templateName: tpl ? tpl.name : 'report', due, overdue: due < TODAY_ISO, source: pol.source };
    }).filter(Boolean).sort((a, b) => (a.overdue === b.overdue ? a.due.localeCompare(b.due) : a.overdue ? -1 : 1));
  })();
  const dueOverdue = reportsDue.filter(d => d.overdue).length;

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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DS.faint, marginBottom: 10 }}>
                  <span>{cls.room}</span>
                  <span>{cls.students} students</span>
                </div>
                {(() => {
                  const planned = hasPlan(cls.group);
                  return (
                    <button
                      onClick={() => openPlanner(cls.group)}
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: 6,
                        border: `1px solid ${planned ? DS.accentBorder : DS.border}`,
                        background: planned ? DS.accentLight : DS.surface,
                        color: planned ? DS.accent : DS.sub,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Icon name={planned ? 'eye' : 'edit'} size={12} />
                      {planned ? 'View Plan' : 'Make Plan'}
                    </button>
                  );
                })()}
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

      {/* ── Reports due (driven by the centre's resolved reporting rules) ── */}
      <Card
        title="Reports due"
        actions={[
          dueOverdue > 0
            ? <Badge key="o" variant="danger"><Icon name="flag" size={11} /> {dueOverdue} overdue</Badge>
            : reportsDue.length > 0
              ? <Badge key="b" variant="accent"><Icon name="clock" size={11} /> {reportsDue.length} upcoming</Badge>
              : <Badge key="b" variant="success"><Icon name="check" size={11} /> Nothing due</Badge>,
          reportDrafts.length > 0 && <Badge key="d" variant="warning"><Icon name="edit" size={11} /> {reportDrafts.length} draft{reportDrafts.length !== 1 ? 's' : ''}</Badge>,
          <Btn key="v" variant="ghost" icon="eye" small onClick={() => window.__navigate && window.__navigate('teacher', 'reports')}>View all</Btn>,
        ]}
      >
        <div>
          {reportsDue.length === 0 && (
            <div style={{ padding: '18px 16px', fontSize: 13, color: DS.muted }}>No reports due — every student you teach resolves to optional or off, or is already up to date.</div>
          )}
          {reportsDue.slice(0, 6).map((d, i, arr) => (
            <div key={d.id} onClick={() => window.__navigate && window.__navigate('teacher', 'reports')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer',
                borderBottom: i < Math.min(arr.length, 6) - 1 ? `1px solid ${DS.border}` : 'none' }}>
              <Avatar name={d.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{rptFreqLabel(d.frequency)} report — {d.name}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{d.templateName} · {d.source}{d.requirement === 'OPTIONAL' ? ' · optional' : ''}</div>
              </div>
              {d.overdue
                ? <Badge variant="danger">Overdue · was {fmtDue(d.due)}</Badge>
                : <Badge variant="default">Due {fmtDue(d.due)}</Badge>}
              <Icon name="chevron_r" size={14} color={DS.faint} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { TeacherDashboard });
