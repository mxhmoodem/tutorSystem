// ══════════════════════════════════════════════════════════════
//  TutorOS — Extra Admin Pages
// ══════════════════════════════════════════════════════════════

// ─── Shared admin store (localStorage-backed) ───────────────────────────────────
// Teachers, classes and students live here so that add / invite / create flows
// actually persist and reflect across the admin pages.
const ADMIN_STORE_KEY = 'admin_store_v4';

// Seed data (SEED_TEACHERS, SEED_CLASSES, SEED_STUDENTS, SEED_SUBJECTS) and the
// read-only roster (allStudents) live in mocks/adminPages.mock.jsx, loaded
// before this file in index.html.

// Normalise a class/teacher/student subject label down to a base subject name so
// it can be matched against the subjects list (e.g. "GCSE English Lit." → "English").
const normSubject = s => (s || '')
  .replace(/^(GCSE|A-?Level|AS-?Level|KS\d|IB)\s+/i, '')
  .replace(/\bLit\.?\b/i, 'Literature')
  .replace(/\bMaths\b/i, 'Mathematics')
  .trim()
  .toLowerCase();

// Does an entity (by one or more subject labels) belong to subject `sub`?
// A label may be compound ("Mathematics / Further Maths", "Science / Biology"),
// so we split it into individual subjects and match each exactly against the base
// — this keeps e.g. "Science" from swallowing "Computer Science".
const matchesSubject = (sub, labels) => {
  const base = normSubject(sub.name);
  if (!base) return false;
  return (labels || []).some(l =>
    (l || '').split(/[/,]/).some(part => normSubject(part) === base));
};

const useAdminStore = () => {
  const read = () => {
    try {
      const raw = localStorage.getItem(ADMIN_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Backfill keys added after the first version of the store shipped.
        return {
          teachers: parsed.teachers || SEED_TEACHERS,
          classes:  parsed.classes  || SEED_CLASSES,
          students: parsed.students || SEED_STUDENTS,
          subjects: parsed.subjects || SEED_SUBJECTS,
          // Configurable dimensions — admin-extensible { id, name } lists. Backfilled
          // so stored blobs from before these shipped still load with the seed values.
          yearGroups: parsed.yearGroups || SEED_YEAR_GROUPS,
          levels:     parsed.levels     || SEED_LEVELS,
          examBoards: parsed.examBoards || SEED_EXAM_BOARDS,
          attendance: parsed.attendance || {},   // { 'teacherId|YYYY-MM-DD': 'present'|'absent'|'late' }
          holidays:   parsed.holidays   || {},   // { teacherId: [{ id, from, to, reason }] }
        };
      }
    } catch (e) { /* ignore */ }
    return { teachers: SEED_TEACHERS, classes: SEED_CLASSES, students: SEED_STUDENTS, subjects: SEED_SUBJECTS, yearGroups: SEED_YEAR_GROUPS, levels: SEED_LEVELS, examBoards: SEED_EXAM_BOARDS, attendance: {}, holidays: {} };
  };
  const [store, setStore] = React.useState(read);

  const persist = next => {
    setStore(next);
    try { localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const addTeacher    = t => persist({ ...store, teachers: [{ ...t, id: 't' + Date.now() }, ...store.teachers] });
  const updateTeacher = (id, patch) => persist({ ...store, teachers: store.teachers.map(t => t.id === id ? { ...t, ...patch } : t) });
  const addClass      = c => persist({ ...store, classes:  [{ ...c, id: c.id || 'c' + Date.now() }, ...store.classes] });
  const updateClass   = (id, patch) => persist({ ...store, classes: store.classes.map(c => c.id === id ? { ...c, ...patch } : c) });
  // Cover / substitute teacher while a class's regular teacher is away. The class
  // keeps its `teacher`; `cls.cover = { teacherId, teacher, from, to, reason }` (or
  // null) records the stand-in for a date window. coverActive()/effectiveTeacher()
  // (below) resolve which one applies on a given date, so cover reverts on its own.
  const setCover   = (classId, cover) => persist({ ...store, classes: store.classes.map(c => c.id === classId ? { ...c, cover } : c) });
  const clearCover = classId => persist({ ...store, classes: store.classes.map(c => c.id === classId ? { ...c, cover: null } : c) });
  // Apply a per-class { [classId]: coverObj|null } map in ONE persist. Lets the
  // teacher-profile "arrange cover" flow give each of an away teacher's classes its
  // own stand-in (or none) over the same away window — N separate setCover calls off
  // one pre-render snapshot would clobber each other (stale closure).
  const setCoversForClasses  = map => persist({ ...store, classes: store.classes.map(c => (c.id in map) ? { ...c, cover: map[c.id] } : c) });
  // Lift cover off every class an away teacher takes (the "remove all cover" button).
  const clearCoverForTeacher = awayName => persist({ ...store, classes: store.classes.map(c => c.teacher === awayName ? { ...c, cover: null } : c) });
  // Create a class AND link its roster in one persist — avoids the stale-closure
  // problem of calling addClass then updateStudent N times (each off the same
  // pre-render snapshot would clobber the previous write).
  const createClassWithRoster = (cls, studentIds = []) => {
    const id = cls.id || 'c' + Date.now();
    const ids = new Set(studentIds);
    persist({
      ...store,
      classes: [{ ...cls, id }, ...store.classes],
      students: store.students.map(s => ids.has(s.id)
        ? { ...s, classIds: [...new Set([...(s.classIds || []), id])] }
        : s),
    });
    return id;
  };
  const addStudent    = s => persist({ ...store, students: [{ ...s, id: 's' + Date.now() }, ...store.students] });
  const updateStudent = (id, patch) => persist({ ...store, students: store.students.map(s => s.id === id ? { ...s, ...patch } : s) });
  const removeStudent = id => persist({ ...store, students: store.students.filter(s => s.id !== id) });
  const removeTeacher = id => persist({ ...store, teachers: store.teachers.filter(t => t.id !== id) });

  // Bulk inserts in a single persist — adding N records one-by-one off the same
  // pre-render snapshot would clobber each previous write (stale-closure), so the
  // CSV import + multi-teacher invite flows stamp every record then persist once.
  const addStudents = (list = []) => {
    const stamped = list.map((s, i) => ({ ...s, id: s.id || ('s' + (Date.now() + i)) }));
    persist({ ...store, students: [...stamped, ...store.students] });
    return stamped.map(s => s.id);
  };
  const addTeachers = (list = []) => {
    const stamped = list.map((t, i) => ({ ...t, id: t.id || ('t' + (Date.now() + i)) }));
    persist({ ...store, teachers: [...stamped, ...store.teachers] });
    return stamped.map(t => t.id);
  };

  // Class-level enrolment (§5 — staff only). Adds classId to each student's
  // classIds and recomputes the class's headcount from actual memberships, in one
  // persist. Distinct from account provisioning: a student must already exist.
  const enrolStudentsInClass = (classId, studentIds = []) => {
    const ids = new Set(studentIds);
    const nextStudents = store.students.map(s => ids.has(s.id)
      ? { ...s, classIds: [...new Set([...(s.classIds || []), classId])] }
      : s);
    const count = nextStudents.filter(s => (s.classIds || []).includes(classId)).length;
    persist({ ...store, students: nextStudents, classes: store.classes.map(c => c.id === classId ? { ...c, students: count } : c) });
  };
  const removeFromClass = (classId, studentId) => {
    const nextStudents = store.students.map(s => s.id === studentId
      ? { ...s, classIds: (s.classIds || []).filter(id => id !== classId) }
      : s);
    const count = nextStudents.filter(s => (s.classIds || []).includes(classId)).length;
    persist({ ...store, students: nextStudents, classes: store.classes.map(c => c.id === classId ? { ...c, students: count } : c) });
  };
  const addSubject    = s => persist({ ...store, subjects: [{ ...s, id: 'sub' + Date.now() }, ...store.subjects] });
  const updateSubject = (id, patch) => persist({ ...store, subjects: store.subjects.map(s => s.id === id ? { ...s, ...patch } : s) });
  const removeSubject = id => persist({ ...store, subjects: store.subjects.filter(s => s.id !== id) });

  // Append a value to a configurable dimension list ({ id, name }) and return the
  // new id, so a form can add-then-select a brand-new value inline. Re-uses an
  // existing entry (case-insensitively) instead of creating a duplicate.
  const addDimension = (key, prefix) => name => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = (store[key] || []).find(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = prefix + Date.now();
    persist({ ...store, [key]: [...(store[key] || []), { id, name: trimmed }] });
    return id;
  };
  const addYearGroup = addDimension('yearGroups', 'yg');
  const addLevel     = addDimension('levels', 'lvl');
  const addExamBoard = addDimension('examBoards', 'eb');
  // Subjects carry extra fields (level/colour/description); the inline "add new"
  // path only needs a name, so wrap addSubject and return the created id.
  const addSubjectInline = name => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = store.subjects.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = 'sub' + Date.now();
    persist({ ...store, subjects: [{ id, name: trimmed, level:'', color: subjectColor(trimmed), description:'' }, ...store.subjects] });
    return id;
  };

  const setAttendance = (teacherId, date, value) =>
    persist({ ...store, attendance: { ...store.attendance, [`${teacherId}|${date}`]: value } });
  const addHoliday = (teacherId, holiday) =>
    persist({ ...store, holidays: { ...store.holidays, [teacherId]: [{ ...holiday, id: 'h' + Date.now() }, ...(store.holidays[teacherId] || [])] } });
  const removeHoliday = (teacherId, holidayId) =>
    persist({ ...store, holidays: { ...store.holidays, [teacherId]: (store.holidays[teacherId] || []).filter(h => h.id !== holidayId) } });

  return { ...store, addTeacher, addTeachers, updateTeacher, removeTeacher, addClass, updateClass, setCover, clearCover, setCoversForClasses, clearCoverForTeacher, createClassWithRoster, enrolStudentsInClass, removeFromClass, addStudent, addStudents, updateStudent, removeStudent, addSubject, updateSubject, removeSubject, addSubjectInline, addYearGroup, addLevel, addExamBoard, setAttendance, addHoliday, removeHoliday };
};

// ─── Admin sub-navigation ───────────────────────────────────────────────────────
// Full-page flows (enrol student, add teacher, profiles, …) are real routes wired
// into the App router in index.html. We navigate via window.__navigate and stash the
// target entity id on window.__adminParam so the destination page can pick it up.
const adminNav = (page, param = null) => {
  window.__adminParam = param;
  if (window.__navigate) window.__navigate('admin', page);
};
const adminParam = () => window.__adminParam || null;

const YEAR_GROUPS = ['Yr 7','Yr 8','Yr 9','Yr 10','Yr 11','Yr 12','Yr 13'];
const studentName = s => s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim();

// ─── Multi-step flow chrome (shared by enrol-student / add-teacher / add-class) ──
const FlowHeader = ({ title, subtitle, onBack }) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:24 }}>
    <button onClick={onBack} title="Back" style={{
      background:'none', border:`1px solid ${DS.border}`, borderRadius:8, cursor:'pointer',
      color:DS.muted, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>
      <Icon name="chevron_r" size={16} color={DS.muted} strokeWidth={2} />
    </button>
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, color:DS.text, margin:0, letterSpacing:'-0.4px' }}>{title}</h1>
      <p style={{ fontSize:14, color:DS.muted, margin:'4px 0 0' }}>{subtitle}</p>
    </div>
  </div>
);

const StepTabs = ({ steps, current, onJump }) => (
  <div style={{ display:'grid', gridTemplateColumns:`repeat(${steps.length}, 1fr)`, gap:12, marginBottom:24 }}>
    {steps.map((label, i) => {
      const done = i < current, active = i === current;
      return (
        <button key={label} onClick={() => i <= current && onJump(i)} style={{
          display:'flex', alignItems:'center', gap:12, textAlign:'left', cursor: i <= current ? 'pointer' : 'default',
          padding:'14px 16px', borderRadius:12,
          border:`1px solid ${active ? 'transparent' : DS.border}`,
          background: active ? DS.accent : DS.surface,
        }}>
          <div style={{
            width:28, height:28, borderRadius:'50%', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700,
            background: active ? '#ffffff33' : done ? DS.accent : DS.border,
            color: active ? '#fff' : done ? '#fff' : DS.muted,
          }}>{done ? <Icon name="check" size={14} color="#fff" strokeWidth={2.5} /> : i + 1}</div>
          <span style={{ fontSize:13, fontWeight:600, color: active ? '#fff' : DS.sub }}>{label}</span>
        </button>
      );
    })}
  </div>
);

// Section header inside a flow card.
const FlowSection = ({ icon, title, children }) => (
  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:18 }}>
    {icon && <Icon name={icon} size={18} color={DS.accent} />}
    <span style={{ fontSize:16, fontWeight:700, color:DS.text }}>{title}</span>
    {children}
  </div>
);

// Subject → accent colour, shared by classes grid + new-class preview.
const SUBJECT_COLORS = {
  'GCSE Mathematics': DS.accent, 'A-Level Mathematics': '#7C3AED',
  'GCSE Science': '#0891B2', 'A-Level Chemistry': '#0D9488', 'A-Level Physics':'#0D9488',
  'GCSE English Lit.': '#D97706', 'GCSE English Literature':'#D97706', 'GCSE History': '#DC2626',
};
const subjectColor = name => {
  if (SUBJECT_COLORS[name]) return SUBJECT_COLORS[name];
  const pool = ['#4F46E5','#0891B2','#0D9488','#D97706','#DC2626','#7C3AED'];
  const key = (name || '').toLowerCase();
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
};

const TEACHER_PALETTE = ['#4F46E5','#0891B2','#0D9488','#D97706','#DC2626','#7C3AED','#DB2777'];

// `allStudents` mock data moved to mocks/adminPages.mock.jsx.

// ─── Students List ─────────────────────────────────────────────────────────────
const AdminStudentsPage = () => {
  const store = useAdminStore();
  const cm = window.centreMetrics;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);

  // The Students page is the ACTIVE academic roster — provisioned-but-unclaimed
  // (pending/invited) accounts live on People & invites, not here (§Students:
  // purge the "not yet active" noise). Filtering the live store by the SAME
  // predicate the selector counts use keeps this list == the Dashboard headcount.
  const students = store.students.filter(cm.isActiveStudent);
  // ONE at-risk definition (§2/§6) — threshold breach OR staff flag, explainable.
  const atRiskCount = students.filter(cm.isAtRisk).length;

  const filtered = students.filter(s => {
    const name = studentName(s).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) ||
      (s.subjects || []).some(sub => sub.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || (filter === 'at-risk' ? cm.isAtRisk(s) : !cm.isAtRisk(s));
    return matchSearch && matchFilter;
  });

  // Export writes an audit entry (§6) and is DATA-MINIMISED (§9): it emits only
  // the fields already shown on this screen — no extra PII is pulled in for the
  // export. This surfaces minors' data, so AADC / Children's-Code minimisation
  // applies; a real backend would also gate this behind a permission + rate limit.
  const exportCsv = () => {
    const header = ['name', 'year', 'attendance', 'hw', 'score', 'status'];
    const rows = filtered.map(s => [studentName(s), s.year, s.attendance, s.hw, s.score, cm.isAtRisk(s) ? 'at-risk' : 'on-track']);
    (window.klayoAudit || (() => {}))('export_csv', `students (${rows.length} records)`);
    try {
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { /* ignore in prototype */ }
  };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students · ${atRiskCount} at risk`}
        actions={[
          <Btn key="export" variant="secondary" icon="download" small onClick={exportCsv}>Export CSV</Btn>,
          <Btn key="add"    variant="primary"   icon="plus"     small onClick={() => adminNav('students_add')}>Add Student</Btn>,
        ]}
      />

      {/* Filters + search */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or subject…" />
        <Segmented
          value={filter} onChange={setFilter}
          options={[
            { id:'all', label:'All', count:students.length },
            { id:'active', label:'On track', count:students.length - atRiskCount },
            { id:'at-risk', label:'At risk', count:atRiskCount },
          ]}
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20 }}>
        <Card>
          <Table
            cols={['Student','Year','Subjects','Attendance','HW %','Avg Score','Status',{ label:'Actions', align:'right' }]}
            rows={filtered.map(s => [
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span onClick={() => setSelected(s.id === (selected && selected.id) ? null : s)} style={{ fontSize:13, fontWeight:600, color:DS.text, cursor:'pointer' }}>{studentName(s)}</span>
                <span style={{ fontSize:11.5, color:DS.faint }}>Last seen {s.lastSeen}</span>
              </div>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {(s.subjects || []).slice(0,2).map(sub => (
                  <span key={sub} style={{ fontSize:11, padding:'2px 6px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:4, color:DS.sub }}>{sub}</span>
                ))}
                {(s.subjects || []).length > 2 && <span style={{ fontSize:11, color:DS.faint }}>+{s.subjects.length-2}</span>}
              </div>,
              // Colour + an icon cue for the danger tier, so "below threshold" doesn't
              // rely on colour alone (§8 accessibility). Numbers are the text backup.
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'flex-end', gap:3, fontSize:13, fontWeight:600, color: s.attendance < 80 ? DS.danger : s.attendance < 90 ? DS.warning : DS.success }}>
                {s.attendance < 80 && <Icon name="alert" size={11} />}{s.attendance}%
              </span>,
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'flex-end', gap:3, fontSize:13, fontWeight:600, color: s.hw < 50 ? DS.danger : s.hw < 70 ? DS.warning : DS.success }}>
                {s.hw < 50 && <Icon name="alert" size={11} />}{s.hw}%
              </span>,
              <ScorePill score={s.score} />,
              // At-risk is explainable on hover (the reason travels with the pill) —
              // advisory, never opaque (Children's-Code Part D).
              <span title={cm.isAtRisk(s) ? cm.atRiskReason(s) : 'On track'}>
                <StatusPill status={cm.isAtRisk(s) ? 'At risk' : 'On track'} />
              </span>,
              <RowActionsMenu items={[
                { label:'View profile', icon:'user', onClick:() => setSelected(s.id === (selected && selected.id) ? null : s) },
                { label:'Message', icon:'message', onClick:() => {} },
                { label:'Resend invite', icon:'send', onClick:() => {} },
              ]} />,
            ])}
          />
        </Card>

        {selected && (
          <Card title={studentName(selected)} actions={[
            <button key="x" onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:DS.muted }}>
              <Icon name="x" size={16} />
            </button>
          ]}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <Avatar name={studentName(selected)} size={44} />
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{studentName(selected)}</div>
                  <div style={{ fontSize:13, color:DS.muted }}>{selected.year} · {cm.isAtRisk(selected) ? `⚠ At risk — ${cm.atRiskReason(selected)}` : 'On track'}</div>
                </div>
              </div>
              {[
                ['Subjects', (selected.subjects || []).join(', ') || '—'],
                ['Classes', String((selected.classIds || []).length)],
                ['Teacher(s)', selected.teacher || '—'],
                ['Guardian', selected.guardianName || '—'],
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
                <Btn variant="primary" icon="user" onClick={() => adminNav('student_profile', selected.id)}>View Full Profile</Btn>
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

// ─── Enrol Student — full-page multi-step flow ───────────────────────────────────
const STUDENT_STEPS = ['Personal Details', 'Guardian Info', 'Academic', 'Additional'];

const EnrolStudentPage = () => {
  const store = useAdminStore();
  const [step, setStep] = React.useState(0);
  const [touched, setTouched] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName:'', lastName:'', dob:'', year:'', email:'', phone:'', address:'',
    guardianName:'', guardianRelation:'Mother', guardianEmail:'', guardianPhone:'',
    subjects:[], classIds:[], notes:'', notify:true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const stepErrs = [
    { firstName: !form.firstName.trim() ? 'First name is required' : '', lastName: !form.lastName.trim() ? 'Last name is required' : '', year: !form.year ? 'Select a year group' : '' },
    {},
    { subjects: form.subjects.length === 0 ? 'Select at least one subject' : '' },
    {},
  ];
  const stepValid = i => !Object.values(stepErrs[i]).some(Boolean);

  const next = () => { setTouched(true); if (!stepValid(step)) return; setTouched(false); setStep(s => Math.min(s + 1, STUDENT_STEPS.length - 1)); };
  const back = () => step === 0 ? adminNav('students') : setStep(s => s - 1);

  const submit = () => {
    setTouched(true);
    if (!stepValid(2)) { setStep(2); return; }
    const teacherNames = [...new Set(form.classIds.map(id => store.classes.find(c => c.id === id)?.teacher).filter(Boolean))];
    store.addStudent({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      dob: form.dob, year: form.year, email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
      guardianName: form.guardianName.trim(), guardianRelation: form.guardianRelation, guardianEmail: form.guardianEmail.trim(), guardianPhone: form.guardianPhone.trim(),
      subjects: form.subjects, classIds: form.classIds, notes: form.notes.trim(),
      attendance:100, hw:0, score:0, status:'active',
      teacher: teacherNames.join(' / ') || '—', lastSeen:'Just enrolled',
    });
    adminNav('students');
  };

  return (
    <div style={{ padding:'32px', maxWidth:920, margin:'0 auto' }}>
      <FlowHeader title="Enrol New Student" subtitle="Complete all sections to register a new student" onBack={back} />
      <StepTabs steps={STUDENT_STEPS} current={step} onJump={setStep} />

      <Card>
        <div style={{ padding:'24px 26px' }}>
          {step === 0 && (<>
            <FlowSection icon="user" title="Personal Details" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="First Name" required error={touched && stepErrs[0].firstName}>
                <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} invalid={touched && !!stepErrs[0].firstName} placeholder="First name" />
              </Field>
              <Field label="Last Name" required error={touched && stepErrs[0].lastName}>
                <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} invalid={touched && !!stepErrs[0].lastName} placeholder="Last name" />
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} icon="calendar" />
              </Field>
              <Field label="Year Group" required error={touched && stepErrs[0].year}>
                <Select value={form.year} onChange={e => set('year', e.target.value)} invalid={touched && !!stepErrs[0].year}>
                  <option value="">Select year…</option>
                  {YEAR_GROUPS.map(y => <option key={y}>{y}</option>)}
                </Select>
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} icon="mail" placeholder="student@email.com" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} icon="phone" placeholder="+44 7…" />
              </Field>
              <Field label="Home Address" style={{ gridColumn:'1 / -1' }}>
                <Input value={form.address} onChange={e => set('address', e.target.value)} icon="pin" placeholder="Full address" />
              </Field>
            </div>
          </>)}

          {step === 1 && (<>
            <FlowSection icon="users" title="Guardian Information" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="Guardian Name">
                <Input value={form.guardianName} onChange={e => set('guardianName', e.target.value)} icon="user" placeholder="Parent / guardian name" />
              </Field>
              <Field label="Relationship">
                <Select value={form.guardianRelation} onChange={e => set('guardianRelation', e.target.value)}>
                  {['Mother','Father','Guardian','Grandparent','Other'].map(r => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Guardian Email">
                <Input type="email" value={form.guardianEmail} onChange={e => set('guardianEmail', e.target.value)} icon="mail" placeholder="parent@email.com" />
              </Field>
              <Field label="Guardian Phone">
                <Input value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} icon="phone" placeholder="+44 7…" />
              </Field>
            </div>
          </>)}

          {step === 2 && (
            <AcademicStep form={form} touched={touched} err={stepErrs[2]} classes={store.classes} onToggleSubject={s => toggle('subjects', s)} onToggleClass={c => toggle('classIds', c)} />
          )}

          {step === 3 && (<>
            <FlowSection icon="clip" title="Additional Information" />
            <Field label="Notes" hint="Any context — learning needs, scheduling notes, etc.">
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes about this student…" />
            </Field>
            <label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', padding:'10px 12px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:9 }}>
              <input type="checkbox" checked={form.notify} onChange={e => set('notify', e.target.checked)} style={{ accentColor:DS.accent, width:15, height:15 }} />
              <span style={{ fontSize:13, color:DS.sub }}>Email the guardian a welcome message and portal login</span>
            </label>
          </>)}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 26px', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
          <Btn variant="ghost" onClick={back}>{step === 0 ? 'Cancel' : 'Back'}</Btn>
          {step < STUDENT_STEPS.length - 1
            ? <Btn variant="primary" icon="chevron_r" onClick={next}>Continue</Btn>
            : <Btn variant="primary" icon="check" onClick={submit}>Enrol Student</Btn>}
        </div>
      </Card>
    </div>
  );
};

// Academic step — subject enrolment + class picker, shared by enrol + profile edit.
const SUBJECT_LIST = ['Mathematics','Further Maths','Physics','Chemistry','Biology','Science','English','English Literature','History','Geography','Computer Science'];

const AcademicStep = ({ form, touched, err, classes, onToggleSubject, onToggleClass }) => (
  <>
    <FlowSection icon="book" title="Subject Enrolment" />
    {touched && err && err.subjects && <div style={{ fontSize:11.5, color:DS.danger, marginBottom:10 }}>{err.subjects}</div>}
    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
      {SUBJECT_LIST.map(sub => {
        const on = form.subjects.includes(sub);
        return (
          <button key={sub} onClick={() => onToggleSubject(sub)} style={{
            padding:'7px 13px', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:500,
            border:`1px solid ${on ? DS.accentBorder : DS.border}`,
            background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.sub,
            display:'inline-flex', alignItems:'center', gap:6,
          }}>
            {on && <Icon name="check" size={13} color={DS.accent} strokeWidth={2.5} />}{sub}
          </button>
        );
      })}
    </div>

    <FlowSection icon="users" title="Class Enrolment" />
    <div style={{ fontSize:12.5, color:DS.muted, marginBottom:12 }}>Choose which classes to enrol this student in.</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
      {classes.map(c => {
        const on = form.classIds.includes(c.id);
        const color = subjectColor(c.name);
        const full = c.students >= c.capacity && !on;
        return (
          <button key={c.id} onClick={() => !full && onToggleClass(c.id)} disabled={full} style={{
            display:'flex', alignItems:'center', gap:11, textAlign:'left', cursor: full ? 'not-allowed' : 'pointer',
            padding:'12px 14px', borderRadius:10, opacity: full ? 0.5 : 1,
            border:`1px solid ${on ? color : DS.border}`, background: on ? color + '0F' : DS.bg,
          }}>
            <div style={{
              width:20, height:20, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
              border:`1.5px solid ${on ? color : DS.borderDark}`, background: on ? color : 'transparent',
            }}>{on && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{c.name}</div>
              <div style={{ fontSize:11.5, color:DS.muted }}>{c.group} · {c.day} {c.time}</div>
            </div>
            <span style={{ fontSize:11, color: full ? DS.danger : DS.faint, fontWeight:500 }}>{c.students}/{c.capacity}</span>
          </button>
        );
      })}
    </div>
  </>
);

// ─── Student full profile — viewable + editable ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
//  Student profile — full analytics dashboard
//  The reports / tracking / homework stores key students by their own ids, so
//  rather than fragile cross-store joins the rich profile analytics are DERIVED
//  from the student id with the same deterministic seededRand() used for class
//  figures (stable across renders). Real store data — classes, subjects, guardian,
//  account, attendance/hw/score and name-matched invoices — is used wherever it
//  links cleanly; the trends, submissions, reports, lessons, meetings, reviews and
//  timeline below are synthesised but internally consistent with those figures.
// ═══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_MONTHS = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];

// score → GCSE number grade (9–1), or A-Level letter (A*–E) for Year 12/13.
const scoreToGrade = (score, alevel) => {
  if (alevel) return score>=90?'A*':score>=80?'A':score>=70?'B':score>=60?'C':score>=50?'D':'E';
  return score>=90?'9':score>=80?'8':score>=72?'7':score>=64?'6':score>=56?'5':score>=48?'4':score>=40?'3':'2';
};
const gradeColour = score => score>=75?DS.success:score>=55?DS.warning:DS.danger;
const hwBadge = s => s==='Marked'?'success':s==='Late'?'warning':s==='Missing'?'danger':'info';
const capWord = s => s ? String(s).charAt(0).toUpperCase()+String(s).slice(1).replace(/[-_]/g,' ') : s;
const studentAge = dob => { const d=new Date(dob); if(isNaN(d))return ''; const t=new Date('2026-06-27'); let a=t.getFullYear()-d.getFullYear(); if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))a--; return a; };
const fmtBirthday = dob => { const d=new Date(dob); return isNaN(d)?(dob||'—'):d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); };

const HW_TITLE_BANK = ['Practice Paper','Topic Quiz','Consolidation Set','Past-Paper Questions','Revision Worksheet','End-of-Unit Test','Mixed Problems','Extended Writing Task'];
const LESSON_TOPIC_BANK = {
  Mathematics:['Quadratic equations','Simultaneous equations','Trigonometry','Differentiation','Vectors','Probability'],
  'Further Maths':['Complex numbers','Matrices','Polar coordinates','Hyperbolic functions','Proof by induction'],
  Physics:['Kinematics','Electric fields','Waves & optics','Nuclear decay','Circular motion'],
  Chemistry:['Bonding & structure','Rates of reaction','Organic mechanisms','Electrolysis','Equilibria'],
  Biology:['Cell structure','Genetics','Homeostasis','Ecosystems','Enzyme kinetics'],
  Science:['Forces & motion','Chemical reactions','Cells & organisms','Energy transfer','The periodic table'],
  English:['Macbeth — Act 1','Unseen poetry','Persuasive writing','An Inspector Calls','Language analysis'],
  'English Literature':['Macbeth — themes','Power & conflict poetry','A Christmas Carol','Unseen prose'],
  'Computer Science':['Algorithms','Data representation','Boolean logic','Networks','Iteration in Python'],
  Geography:['Coastal landscapes','Urbanisation','Tectonic hazards','River processes','Ecosystems'],
  History:['Weimar Germany','The Cold War','Medicine through time','Elizabethan England'],
  French:['Le passé composé','La famille','Les vacances','Speaking practice'],
  Spanish:['El pretérito','Mi rutina','El medio ambiente','Speaking practice'],
  Economics:['Price elasticity','Market failure','Fiscal policy','Supply & demand'],
  Business:['Cash-flow forecasts','The marketing mix','Stakeholders','Break-even analysis'],
};
const topicsFor = subj => LESSON_TOPIC_BANK[subj] || LESSON_TOPIC_BANK[(subj||'').replace(/^(GCSE|A-Level)\s+/,'')] || ['Topic review','Exam technique','Consolidation','Assessment feedback','New unit'];
const REVIEW_BANK = [
  'Consistently well-prepared and fully engaged in lessons — a pleasure to teach.',
  'Has a secure grasp of the fundamentals and is now building real exam confidence.',
  'Effort has improved noticeably this term; the upward trend is encouraging.',
  'Capable of excellent work but needs to be more consistent with homework deadlines.',
  'An excellent contributor to class discussion who works well in group tasks.',
  'Making steady progress; would benefit from a little more independent revision.',
  'A thoughtful, methodical worker who responds positively to feedback.',
];
const TARGET_BANK = [
  'Complete weekly past-paper questions under timed conditions.',
  'Review exam command words carefully before each assessment.',
  'Show full working so no method marks are dropped.',
  'Attend the fortnightly support session to consolidate weaker topics.',
  'Keep a topic-by-topic revision tracker and review it weekly.',
  'Read around the subject beyond the specification to stretch further.',
];

// Build a stable, comprehensive analytics picture for one student.
const studentAnalytics = (student, enrolledClasses) => {
  const rnd = seededRand((student.id || student.name || 'x') + 'profile');
  const pick = arr => arr[Math.floor(rnd()*arr.length)] || arr[0];
  const base = student.score || 70, hwBase = student.hw || 75, attBase = student.attendance || 92;
  const alevel = /1[23]/.test(student.year || '');
  const subjects = (student.subjects && student.subjects.length) ? student.subjects : ['General Studies'];
  const teacherFor = subj => {
    const key = (subj||'').toLowerCase().split(' ')[0];
    const cls = enrolledClasses.find(c => (c.name||'').toLowerCase().includes(key));
    return (cls && cls.teacher) || (enrolledClasses[0] && enrolledClasses[0].teacher) || 'Centre staff';
  };

  const trend = ANALYTICS_MONTHS.map((m,i) => {
    const t = i/(ANALYTICS_MONTHS.length-1);
    return Math.max(35, Math.min(99, Math.round(base-12 + t*12 + (rnd()-0.5)*7)));
  });
  trend[trend.length-1] = base;
  const cohort = ANALYTICS_MONTHS.map((_,i) => Math.max(45, Math.min(92, Math.round(68 + Math.sin(i/1.5)*3 + (rnd()-0.5)*4))));
  const attendanceByMonth = ANALYTICS_MONTHS.map(() => Math.max(60, Math.min(100, Math.round(attBase + (rnd()-0.5)*14))));

  const subjectRows = subjects.map(s => {
    const score = Math.max(35, Math.min(99, Math.round(base + (rnd()-0.45)*22)));
    const targetScore = Math.min(99, score + Math.round(rnd()*10));
    const spark = Array.from({length:6},(_,k)=>Math.max(35,Math.min(99,Math.round(score-8 + k*2 + (rnd()-0.5)*6))));
    return { name:s, teacher:teacherFor(s), score, predicted:scoreToGrade(score,alevel), target:scoreToGrade(targetScore,alevel), effort:60+Math.round(rnd()*38), spark, onTrack: score>=targetScore-4 };
  });

  const hwPool = hwBase>=85?['Marked','Marked','Marked','Marked','Late']:hwBase>=60?['Marked','Marked','Late','Marked','Missing']:['Marked','Late','Missing','Missing','Late'];
  const homework = Array.from({length:7},(_,i)=>{
    const subj = pick(subjects);
    const status = i===0?'Pending':pick(hwPool);
    const score = (status==='Missing'||status==='Pending')?null:Math.max(30,Math.min(100,Math.round(base+(rnd()-0.4)*26)));
    return { id:i, title:`${pick(HW_TITLE_BANK)} — ${pick(topicsFor(subj))}`, subject:subj, set:(i+1)*4+Math.floor(rnd()*4), status, score };
  });

  const periods = ['Autumn Term 2025','Spring Term 2026','Summer Term 2026'];
  const dates = ['12 Dec 2025','6 Apr 2026','24 Jun 2026'];
  const reports = subjects.slice(0,3).map((s,i)=>({
    id:i, subject:s, teacher:teacherFor(s), period:periods[i%3], type:i===0?'Termly Progress':'Quick Update',
    date:dates[i%3], predicted:scoreToGrade((subjectRows[i]&&subjectRows[i].score)||base,alevel),
    status:(i===2&&rnd()>0.6)?'Draft':'Published', summary:pick(REVIEW_BANK),
  }));

  const days = ['Mon','Tue','Wed','Thu','Fri'];
  const lessons = Array.from({length:6},(_,i)=>{
    const subj = pick(subjects);
    return { id:i, date:`${24-i*3} ${i<2?'Jun':'May'}`, day:pick(days), subject:subj, topic:pick(topicsFor(subj)),
      attendance: i===0?'Present':(attBase>=90?pick(['Present','Present','Present','Late']):pick(['Present','Present','Late','Absent'])),
      participation: pick(['High','High','Good','Good','Fair']) };
  });

  const meetings = [
    { id:0, type:"Parents' Evening", date:'18 Mar 2026', status:'Completed', who:`${student.guardianName||'Guardian'} · ${teacherFor(subjects[0])}`, note:'Reviewed progress and agreed a revision plan ahead of the mock exams.' },
    { id:1, type:'Progress Review', date:'2 May 2026', status:'Completed', who:teacherFor(subjects[0]), note:pick(REVIEW_BANK) },
    { id:2, type:"Parents' Evening", date:'9 Jul 2026', status:'Scheduled', who:`${student.guardianName||'Guardian'} · Form tutor`, note:'End-of-year review and discussion of next-year options.' },
  ];

  const reviews = subjectRows.slice(0,3).map((s,i)=>({ id:i, teacher:s.teacher, subject:s.name, date:['Jun 2026','May 2026','Apr 2026'][i%3], rating:Math.max(3,Math.min(5,Math.round(s.effort/20))), comment:pick(REVIEW_BANK) }));

  const targets = (()=>{ const pool=[...TARGET_BANK], out=[]; while(out.length<3&&pool.length) out.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]); return out; })();

  const ratings = {
    Behaviour: Math.max(50,Math.min(99,70+Math.round(rnd()*28))),
    Effort: Math.max(40,Math.min(99,hwBase+Math.round((rnd()-0.3)*16))),
    Participation: Math.max(45,Math.min(99,60+Math.round(rnd()*38))),
    Homework: Math.max(20,Math.min(100,hwBase)),
    Confidence: Math.max(40,Math.min(98,base+Math.round((rnd()-0.4)*20))),
  };

  const predictedGrade = scoreToGrade(base, alevel);
  const targetGrade = scoreToGrade(Math.min(99, base+6), alevel);
  const engagement = Math.round((attBase + hwBase + ratings.Participation)/3);

  const timeline = [
    { icon:'clip', color:DS.accent, text:`Submitted “${homework[1].title}”`, when:'2 days ago' },
    { icon:'graduation', color:DS.success, text:`Attended ${lessons[0].subject} — ${lessons[0].topic}`, when:'3 days ago' },
    { icon:'file', color:DS.warning, text:`${reports[0].subject} progress report published`, when:'1 week ago' },
    { icon:'chart', color:DS.info, text:`Scored ${subjectRows[0].score}% in ${subjectRows[0].name} assessment`, when:'1 week ago' },
    { icon:'message', color:DS.accent, text:`Message sent to ${student.guardianName||'guardian'}`, when:'2 weeks ago' },
  ];

  return { trend, cohort, attendanceByMonth, subjectRows, homework, reports, lessons, meetings, reviews, ratings, targets, predictedGrade, targetGrade, engagement, timeline, alevel };
};

// Circular progress gauge — the headline attainment/grade dial.
const GaugeRing = ({ value, label, sub, color = DS.accent, size = 108, stroke = 10 }) => {
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  const off = c*(1 - Math.max(0,Math.min(100,value))/100);
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={DS.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:26, fontWeight:700, color:DS.text, lineHeight:1 }}>{label}</span>
        {sub && <span style={{ fontSize:11, color:DS.muted, marginTop:3 }}>{sub}</span>}
      </div>
    </div>
  );
};

const RatingBar = ({ label, value }) => {
  const c = value>=75?DS.success:value>=55?DS.warning:DS.danger;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12.5, color:DS.sub }}>{label}</span>
        <span style={{ fontSize:12.5, fontWeight:600, color:DS.text }}>{value}%</span>
      </div>
      <div style={{ height:7, background:DS.surface, borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', background:c, borderRadius:4 }} />
      </div>
    </div>
  );
};

const StarRow = ({ n }) => (
  <span style={{ display:'inline-flex', gap:2 }}>
    {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={13} color={i<=n?DS.warning:DS.borderDark} />)}
  </span>
);

const ChartLegend = ({ items }) => (
  <div style={{ display:'flex', gap:16, marginTop:10, justifyContent:'center' }}>
    {items.map(([label,color]) => (
      <span key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:DS.muted }}>
        <span style={{ width:10, height:10, borderRadius:3, background:color }} />{label}
      </span>
    ))}
  </div>
);

// The full read-only analytics dashboard (shown when the profile is not being edited).
const StudentAnalyticsView = ({ student, enrolledClasses, role = 'admin' }) => {
  const store = useAdminStore();
  const isTeacher = role === 'teacher';   // teachers see the profile read-only, minus Fees + Account
  const A = React.useMemo(() => studentAnalytics(student, enrolledClasses), [student.id, enrolledClasses.length]);
  const subjects = student.subjects || [];
  const teachers = [...new Set(enrolledClasses.map(c => c.teacher).filter(Boolean))];
  // Read the account off THIS component's live store copy (it owns the reset / temp-PIN
  // / revoke mutations). useAdminStore is per-component state with no cross-notify, so
  // the parent's `student` prop wouldn't reflect those writes until a remount.
  const account = (store.students.find(s => s.id === student.id) || student).account || {};
  const invoices = (typeof REPORTS_INVOICES !== 'undefined' ? REPORTS_INVOICES : []).filter(i => i.student === studentName(student));
  const notStarted = !enrolledClasses.length && !(student.score || student.attendance || student.hw);
  const span2 = { gridColumn:'1 / -1' };

  const [tab, setTab] = React.useState('attainment');
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetInfo, setResetInfo] = React.useState(null);   // { code, url } of the freshly issued link
  const [pinOpen, setPinOpen] = React.useState(false);
  const [pin, setPin] = React.useState('');
  const [pinTouched, setPinTouched] = React.useState(false);
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  // ── Account / sign-in facts, derived from the claim model ──
  const under13     = !!account.underThirteen;
  const setupLbl    = (window.SETUP_LABEL && window.SETUP_LABEL[account.setupMethod]) || capWord(account.setupMethod || account.dailyMethod || '—');
  const centreCode  = (typeof ONB_CENTRE !== 'undefined' && ONB_CENTRE.code) || '—';
  const resetTarget = under13 ? (student.guardianEmail || 'the guardian email on file') : (account.syntheticEmail || student.email || 'the student email on file');
  const copy = txt => { try { navigator.clipboard.writeText(String(txt)); } catch (e) {} };

  // Students pick their own PIN/password/QR when they CLAIM their account, and the
  // secret is never stored — so an admin "reset" can't reveal or set it. Instead it
  // re-issues a fresh one-time claim link (under-13 → guardian) so they choose a new
  // one, exactly mirroring first sign-up. A temporary PIN is the in-person fallback.
  const issueReset = () => {
    const code  = 'BM-' + (window.RAND ? window.RAND(4) : Math.random().toString(36).slice(2,6).toUpperCase());
    const token = window.genToken ? window.genToken('tok') : ('tok-' + Math.random().toString(36).slice(2,10));
    store.updateStudent(student.id, { account: { ...account, status:'pending', setupMethod:'pending', tempCredential:false, claimCode:code, inviteToken:token, resetOn:(new Date()).toISOString().slice(0,10) } });
    setResetInfo({ code, url:'https://app.tutoros.app/claim/' + code });
    setResetOpen(true);
  };
  const saveTempPin = () => {
    setPinTouched(true);
    if (!/^\d{6}$/.test(pin)) return;
    store.updateStudent(student.id, { account: { ...account, status:'active', setupMethod:'pin', tempCredential:true } });
    setPinOpen(false); setPin(''); setPinTouched(false);
  };
  const revoke = () => { store.updateStudent(student.id, { account: { ...account, status:'invited' } }); setRevokeOpen(false); };

  // Compact label/value rows for the left cards.
  const facts = list => list.filter(Boolean).map(([l,v]) => (
    <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13, gap:12 }}>
      <span style={{ color:DS.muted, flexShrink:0 }}>{l}</span>
      <span style={{ color:DS.text, fontWeight:500, textAlign:'right', minWidth:0, wordBreak:'break-word' }}>{v}</span>
    </div>
  ));
  // Account rows with an optional copy button.
  const acctRow = (label, value, copyVal) => (
    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'9px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13 }}>
      <span style={{ color:DS.muted, flexShrink:0 }}>{label}</span>
      <span style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <span style={{ color:DS.text, fontWeight:500, textAlign:'right', wordBreak:'break-word' }}>{value}</span>
        {copyVal ? <button onClick={() => copy(copyVal)} title="Copy" style={{ background:'none', border:'none', cursor:'pointer', color:DS.faint, padding:2, display:'flex', flexShrink:0 }}><Icon name="copy" size={14} /></button> : null}
      </span>
    </div>
  );
  const kpiTile = (label, value, color) => (
    <div key={label} style={{ padding:'12px 14px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
      <div style={{ fontSize:21, fontWeight:700, color:color||DS.text, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:11.5, color:DS.muted, marginTop:3 }}>{label}</div>
    </div>
  );

  const TABS = [
    { id:'attainment', label:'Attainment',         icon:'chart' },
    { id:'attendance', label:'Attendance',         icon:'calendar' },
    { id:'homework',   label:'Homework',           icon:'clip' },
    { id:'reports',    label:'Reports',            icon:'file' },
    { id:'classes',    label:'Classes',            icon:'book' },
    { id:'fees',       label:'Fees',               icon:'invoice' },
    { id:'account',    label:'Account',            icon:'lock' },
  ];
  const gridCols = { display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:18, alignItems:'start' };

  // ── LEFT (fixed): the most-referenced identity info, kept to hand while the
  //    right-hand tabs scroll independently. ──
  const aside = (
    <aside style={{ width:336, flexShrink:0, overflow:'auto', display:'flex', flexDirection:'column', gap:16, paddingTop:2, paddingRight:2, paddingBottom:24 }}>
      <Card title="Contact Details" icon="user" accent={DS.info}>
        <div style={{ padding:'4px 20px 12px' }}>
          {facts([
            ['Year', student.year],
            ['Date of birth', fmtBirthday(student.dob)],
            student.dob && ['Age', studentAge(student.dob)+' years'],
            ['Email', student.email || '—'],
            ['Phone', student.phone || '—'],
            ['Address', student.address || '—'],
            ['Last seen', student.lastSeen || '—'],
          ])}
        </div>
      </Card>

      <Card title="Guardian" icon="users" accent="#DB2777">
        <div style={{ padding:'4px 20px 14px' }}>
          {facts([
            ['Name', student.guardianName || '—'],
            ['Relationship', student.guardianRelation || '—'],
            ['Email', student.guardianEmail || '—'],
            ['Phone', student.guardianPhone || '—'],
            student.notes && ['Notes', student.notes],
          ])}
          {(student.guardianEmail || student.guardianPhone) && (
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <Btn variant="secondary" small icon="mail" style={{ flex:1, justifyContent:'center' }}>Email</Btn>
              <Btn variant="secondary" small icon="phone" style={{ flex:1, justifyContent:'center' }}>Call</Btn>
            </div>
          )}
        </div>
      </Card>
    </aside>
  );

  // Data tabs are empty for a provisioned-but-not-enrolled student; Account & Access
  // (and Fees) stay live — that's exactly where you'd (re)send their claim link.
  const notStartedEmpty = (
    <Card>
      <EmptyState icon="clock" title="This student hasn't started yet"
        message={`${student.firstName || studentName(student) || 'This student'} has an account but isn't enrolled in any classes yet, so there's no activity to analyse. Use the Account & Access tab to (re)send their claim link.`} />
    </Card>
  );

  // ── Tab 1 · Attainment ──
  const tabAttainment = (
    <div style={gridCols}>
      <Card title="Attainment overview" icon="chart" accent={DS.accent} style={span2}>
        <div style={{ padding:'20px 24px', display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <GaugeRing value={student.score||0} label={A.predictedGrade} sub="Predicted" color={gradeColour(student.score||0)} />
            <Badge variant={student.status==='at-risk'?'danger':'success'}>{student.status==='at-risk'?'Needs support':'On track'}</Badge>
          </div>
          <div style={{ flex:1, minWidth:260, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(118px,1fr))', gap:12 }}>
            {kpiTile('Attendance', (student.attendance||0)+'%', (student.attendance||0)<80?DS.danger:DS.success)}
            {kpiTile('Homework', (student.hw||0)+'%', (student.hw||0)<50?DS.danger:DS.success)}
            {kpiTile('Avg score', (student.score||0)+'%', (student.score||0)<60?DS.danger:DS.success)}
            {kpiTile('Engagement', A.engagement+'%', DS.info)}
            {kpiTile('Target grade', A.targetGrade, DS.success)}
          </div>
        </div>
      </Card>

      <Card title="Subject Performance" icon="book" accent="#7C3AED" style={span2} subtitle={`Predicted grades and recent trend across ${A.subjectRows.length} subject${A.subjectRows.length===1?'':'s'}`}>
        <Table cols={['Subject','Teacher','Latest','Predicted','Target','Trend','Status']}
          rows={A.subjectRows.map(s => [
            <span style={{ display:'flex', alignItems:'center', gap:9 }}><span style={{ width:9, height:9, borderRadius:3, background:subjectColor(s.name), flexShrink:0 }} /><span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{s.name}</span></span>,
            <span style={{ fontSize:13, color:DS.muted }}>{s.teacher}</span>,
            <ScorePill score={s.score} />,
            <span style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{s.predicted}</span>,
            <span style={{ fontSize:13, color:DS.muted }}>{s.target}</span>,
            <Sparkline data={s.spark} color={subjectColor(s.name)} width={84} height={26} />,
            <StatusPill status={s.onTrack?'On track':'Below target'} tone={s.onTrack?'positive':'warning'} />,
          ])} />
      </Card>

      <Card title="Attainment Trend" icon="trending_up" accent={DS.info} subtitle="Score vs cohort">
        <div style={{ padding:'16px 18px' }}>
          <LineChart labels={ANALYTICS_MONTHS} height={196} series={[{ label:'Student %', data:A.trend, color:DS.accent }, { label:'Cohort %', data:A.cohort, color:DS.faint }]} />
          <ChartLegend items={[['Student',DS.accent],['Cohort',DS.faint]]} />
        </div>
      </Card>
      <Card title="Performance & Effort" icon="star" accent={DS.accent}>
        <div style={{ padding:'18px 22px' }}>
          {Object.entries(A.ratings).map(([k,v]) => <RatingBar key={k} label={k} value={v} />)}
        </div>
      </Card>

      <Card title="Targets & Next Steps" icon="flag" accent={DS.success} style={span2}>
        <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:12 }}>
          {A.targets.map((t,i) => (
            <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:DS.successBg, color:DS.success, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}><Icon name="check" size={13} /></div>
              <span style={{ fontSize:13, color:DS.sub, lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Activity" icon="clock" accent={DS.accent} style={span2}>
        <div style={{ padding:'18px 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 28px' }}>
          {A.timeline.map((e,i) => (
            <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:e.color+'18', color:e.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={e.icon} size={15} /></div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, color:DS.sub, lineHeight:1.4 }}>{e.text}</div>
                <div style={{ fontSize:11.5, color:DS.faint, marginTop:2 }}>{e.when}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── Tab 2 · Attendance ──
  const tabAttendance = (
    <div style={gridCols}>
      <Card title="Attendance by Month" icon="calendar" accent={DS.success} style={span2} actions={<span style={{ fontSize:12, color:DS.muted }}>{student.attendance}% avg</span>}>
        <div style={{ padding:'16px 18px' }}>
          <BarChart labels={ANALYTICS_MONTHS} data={A.attendanceByMonth} color={DS.success} height={220} />
        </div>
      </Card>
      <Card title="Recent Lessons" icon="calendar" accent="#0D9488" style={span2}>
        <Table cols={['Date','Subject','Topic','Attendance','Participation']}
          rows={A.lessons.map(l => [
            <span style={{ fontSize:13, color:DS.sub }}>{l.day} {l.date}</span>,
            <span style={{ fontSize:13, fontWeight:500, color:DS.text }}>{l.subject}</span>,
            <span style={{ fontSize:13, color:DS.muted }}>{l.topic}</span>,
            <StatusPill status={l.attendance} />,
            <span style={{ fontSize:13, color:DS.muted }}>{l.participation}</span>,
          ])} />
      </Card>
    </div>
  );

  // ── Tab 3 · Homework ──
  const tabHomework = (
    <div style={gridCols}>
      <Card title="Homework Submissions" icon="clip" accent="#0891B2" style={span2} actions={<span style={{ fontSize:12, color:DS.muted }}>{student.hw}% completion</span>}>
        <Table cols={['Assignment','Subject','Set','Status','Score']}
          rows={A.homework.map(h => [
            <span style={{ fontSize:13, fontWeight:500, color:DS.text }}>{h.title}</span>,
            <span style={{ fontSize:13, color:DS.muted }}>{h.subject}</span>,
            <span style={{ fontSize:12.5, color:DS.muted }}>{h.set}d ago</span>,
            <StatusPill status={h.status} tone={hwBadge(h.status)} />,
            h.score==null ? <span style={{ fontSize:13, color:DS.faint }}>—</span> : <ScorePill score={h.score} />,
          ])} />
      </Card>
    </div>
  );

  // ── Tab 4 · Reports & Feedback ──
  const tabReports = (
    <div style={gridCols}>
      <Card title="Reports & Feedback" icon="file" accent="#D97706" style={span2} actions={<Btn variant="secondary" small icon="plus" onClick={() => window.__navigate && window.__navigate(role, 'reports')}>New</Btn>}>
        <div>
          {A.reports.map((r,i) => (
            <div key={r.id} style={{ display:'flex', gap:12, padding:'13px 18px', borderBottom:i<A.reports.length-1?`1px solid ${DS.border}`:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:subjectColor(r.subject)+'18', color:subjectColor(r.subject), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="file" size={16} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}><span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{r.subject}</span><Badge variant={r.status==='Published'?'success':'default'}>{r.status}</Badge></div>
                <div style={{ fontSize:11.5, color:DS.muted, margin:'2px 0 5px' }}>{r.period} · {r.teacher} · Predicted {r.predicted}</div>
                <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.45 }}>{r.summary}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Teacher Reviews" icon="star" accent="#DC2626">
        <div>
          {A.reviews.map((r,i) => (
            <div key={r.id} style={{ display:'flex', gap:12, padding:'13px 18px', borderBottom:i<A.reviews.length-1?`1px solid ${DS.border}`:'none' }}>
              <Avatar name={r.teacher} size={34} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}><span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{r.teacher}</span><StarRow n={r.rating} /></div>
                <div style={{ fontSize:11.5, color:DS.muted, margin:'2px 0 5px' }}>{r.subject} · {r.date}</div>
                <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.45 }}>{r.comment}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Parents' Evenings & Meetings" icon="message" accent="#DB2777">
        <div>
          {A.meetings.map((m,i) => (
            <div key={m.id} style={{ display:'flex', gap:12, padding:'13px 18px', borderBottom:i<A.meetings.length-1?`1px solid ${DS.border}`:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:DS.accentLight, color:DS.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="calendar" size={16} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{m.type}</span><Badge variant={m.status==='Completed'?'success':'info'}>{m.status}</Badge></div>
                <div style={{ fontSize:11.5, color:DS.muted, margin:'2px 0 5px' }}>{m.date} · {m.who}</div>
                <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.45 }}>{m.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── Tab 5 · Classes ──
  const tabClasses = (
    <div style={gridCols}>
      <Card title={`Enrolled Classes · ${enrolledClasses.length}`} icon="users" accent={DS.accent} style={span2} subtitle={teachers.length?teachers.join(', '):undefined}>
        <div style={{ padding:'16px 18px' }}>
          {enrolledClasses.length ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:10 }}>
              {enrolledClasses.map(c => (
                <button key={c.id} onClick={() => isTeacher ? (window.__navigate && window.__navigate('teacher','classes')) : adminNav('class_detail', c.id)} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', border:`1px solid ${DS.cardBorder}`, borderRadius:10, background:DS.bg, cursor:'pointer', textAlign:'left', width:'100%' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:subjectColor(c.name)+'18', color:subjectColor(c.name), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={16} /></div>
                  <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:DS.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div><div style={{ fontSize:11.5, color:DS.muted }}>{c.group} · {c.teacher}</div></div>
                  <span style={{ fontSize:11.5, color:DS.muted, whiteSpace:'nowrap' }}>{c.day} {c.time}</span>
                </button>
              ))}
            </div>
          ) : <span style={{ fontSize:13, color:DS.faint }}>Not enrolled in any classes.</span>}
        </div>
      </Card>
    </div>
  );

  // ── Tab 6 · Fees & Invoices ──
  const tabFees = (
    <div style={gridCols}>
      <Card title="Fees & Invoices" icon="invoice" accent="#16A34A" style={span2} actions={<Btn variant="secondary" small icon="invoice" onClick={() => adminNav('invoices')}>Open billing</Btn>}>
        <div>
          {invoices.length ? invoices.map((inv,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 20px', borderBottom:i<invoices.length-1?`1px solid ${DS.border}`:'none' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'#16A34A18', color:'#16A34A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="invoice" size={16} /></div>
              <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{inv.plan}</div><div style={{ fontSize:11.5, color:DS.muted }}>Due {inv.due}</div></div>
              <span style={{ fontSize:14, fontWeight:700, color:DS.text }}>£{inv.amount}</span>
              <Badge variant={inv.status==='paid'?'success':inv.status==='overdue'?'danger':'warning'}>{capWord(inv.status)}</Badge>
            </div>
          )) : <EmptyState icon="invoice" title="No invoices on record" message="When this student is added to a billing plan their invoices will appear here." />}
        </div>
      </Card>
    </div>
  );

  // ── Tab 7 · Account & Access ──
  const tabAccount = (
    <div style={gridCols}>
      <Card style={span2}>
        <div style={{ padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ width:30, height:30, borderRadius:8, background:DS.accentLight, color:DS.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="shield" size={16} /></div>
          <div style={{ fontSize:12.5, color:DS.sub, lineHeight:1.55 }}>
            Students set their own PIN, password or QR sign-in when they claim their account, so the secret can't be viewed or typed here. Resetting re-issues their one-time claim link{under13?' (sent to the guardian for under-13s)':''}, or you can set a temporary PIN for an in-person reset.
          </div>
        </div>
      </Card>

      <Card title="Account" icon="user" accent={DS.muted}>
        <div style={{ padding:'4px 20px 14px' }}>
          {acctRow('Status', <Badge variant={account.status==='active'?'success':account.status==='pending'?'warning':account.status==='invited'?'info':'default'}>{capWord(account.status||'Unknown')}</Badge>)}
          {account.tempCredential ? acctRow('Sign-in', <Badge variant="warning">Temporary PIN — must change</Badge>) : acctRow('Sign-in method', setupLbl)}
          {acctRow('Username', account.username || '—', account.username)}
          {acctRow('Login', account.syntheticEmail || student.email || '—', account.syntheticEmail || student.email)}
          {acctRow('Centre code', centreCode, centreCode!=='—'?centreCode:null)}
          {under13 ? acctRow('Under 13', 'Yes — guardian-managed') : null}
          {account.consentRecorded!=null ? acctRow('Consent', account.consentRecorded?'Recorded':'Pending') : null}
          {account.claimCode ? acctRow('Claim code', account.claimCode, account.claimCode) : null}
          {account.activatedOn ? acctRow('Activated', account.activatedOn) : (account.provisionedOn ? acctRow('Provisioned', account.provisionedOn) : null)}
        </div>
      </Card>

      <Card title="Sign-in & recovery" icon="lock" accent={DS.accent}>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <Btn variant="primary" icon="send" onClick={issueReset} style={{ width:'100%', justifyContent:'center' }}>Send / print reset link</Btn>
            <div style={{ fontSize:12, color:DS.muted, marginTop:6, lineHeight:1.5 }}>Re-issue a one-time claim link{under13?' to the guardian':''} so they pick a new PIN, password or QR.</div>
          </div>
          <div>
            <Btn variant="secondary" icon="pin" onClick={() => { setPin(''); setPinTouched(false); setPinOpen(true); }} style={{ width:'100%', justifyContent:'center' }}>Set a temporary PIN</Btn>
            <div style={{ fontSize:12, color:DS.muted, marginTop:6, lineHeight:1.5 }}>For in-person resets — they change it on next sign-in.</div>
          </div>
          <div style={{ borderTop:`1px solid ${DS.border}`, paddingTop:14 }}>
            <Btn variant="secondary" icon="lock" onClick={() => setRevokeOpen(true)} style={{ width:'100%', justifyContent:'center', color:DS.danger, borderColor:DS.dangerBorder }}>Revoke access</Btn>
            <div style={{ fontSize:12, color:DS.muted, marginTop:6, lineHeight:1.5 }}>Disables sign-in; restore any time with a new link.</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const tabBody = { attainment:tabAttainment, attendance:tabAttendance, homework:tabHomework, reports:tabReports, classes:tabClasses };
  const panel = tab==='account' ? tabAccount
    : tab==='fees' ? tabFees
    : (notStarted ? notStartedEmpty : tabBody[tab]);

  // ── RIGHT: tab strip + the active tab, scrolling on its own ──
  const main = (
    <main style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ flexShrink:0, display:'flex', gap:2, borderBottom:`1px solid ${DS.border}`, overflowX:'auto' }}>
        {TABS.filter(t => !(isTeacher && (t.id === 'fees' || t.id === 'account'))).map(t => {
          const active = tab===t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'inline-flex', alignItems:'center', gap:7, padding:'11px 14px',
              border:'none', background:'none', cursor:'pointer', whiteSpace:'nowrap',
              fontSize:13, fontWeight:active?600:500, color:active?DS.accent:DS.muted,
              borderBottom:`2px solid ${active?DS.accent:'transparent'}`, marginBottom:-1,
            }}>
              <Icon name={t.icon} size={15} color={active?DS.accent:DS.faint} />{t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex:1, overflow:'auto', paddingTop:16, paddingRight:2, paddingBottom:24 }}>
        {panel}
      </div>
    </main>
  );

  // ── Reset / temp-PIN / revoke modals ──
  const modals = (
    <>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} icon="send" iconColor={DS.accent}
        title="Sign-in reset issued"
        subtitle={under13 ? `${student.firstName || studentName(student)}'s parent/guardian completes the reset` : `${studentName(student)} chooses a new way to sign in`}
        footer={<Btn variant="primary" onClick={() => setResetOpen(false)}>Done</Btn>}>
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6, marginBottom:16 }}>
          A fresh one-time claim link has been generated and the account set back to <b>Pending setup</b>, so the old credential no longer works. {under13 ? 'Send the link to the guardian — consent stays recorded; they just set a new PIN.' : 'When opened, the student re-picks a PIN, password or QR sign-in.'}
        </div>
        {resetInfo && (<>
          <div style={{ display:'grid', gap:10 }}>
            <div style={{ padding:'12px 14px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
              <div style={{ fontSize:11, color:DS.faint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>One-time claim code</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:18, fontWeight:700, letterSpacing:'1px', color:DS.text }}>{resetInfo.code}</span>
                <Btn variant="ghost" small icon="copy" onClick={() => copy(resetInfo.code)}>Copy</Btn>
              </div>
            </div>
            <div style={{ padding:'12px 14px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
              <div style={{ fontSize:11, color:DS.faint, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Claim link</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <span style={{ fontSize:12.5, color:DS.sub, wordBreak:'break-all' }}>{resetInfo.url}</span>
                <Btn variant="ghost" small icon="copy" onClick={() => copy(resetInfo.url)}>Copy</Btn>
              </div>
            </div>
            <div style={{ fontSize:12.5, color:DS.muted, display:'flex', alignItems:'center', gap:6 }}><Icon name="mail" size={14} color={DS.faint} />Will be sent to {resetTarget}</div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
            <Btn variant="primary" icon="send" onClick={() => copy(resetInfo.url)}>Email link</Btn>
            <Btn variant="secondary" icon="print" onClick={() => window.print()}>Print slip</Btn>
            <Btn variant="secondary" icon="eye" onClick={() => window.__openClaim && window.__openClaim(resetInfo.code)}>Preview claim page</Btn>
          </div>
        </>)}
      </Modal>

      <Modal open={pinOpen} onClose={() => { setPinOpen(false); setPin(''); setPinTouched(false); }} icon="pin" iconColor={DS.warning}
        title="Set a temporary PIN"
        subtitle="For in-person resets — the student changes it on next sign-in"
        footer={<><Btn variant="ghost" onClick={() => { setPinOpen(false); setPin(''); setPinTouched(false); }}>Cancel</Btn><Btn variant="primary" icon="check" onClick={saveTempPin}>Set temporary PIN</Btn></>}>
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6, marginBottom:14 }}>
          Read this 6-digit PIN to {studentName(student)}. They sign in with centre code <b>{centreCode}</b>, username <b>{account.username || '—'}</b> and this PIN, then set their own credential.
        </div>
        <Field label="Temporary 6-digit PIN" required error={pinTouched && !/^\d{6}$/.test(pin) ? 'Enter a 6-digit PIN' : ''}>
          <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,6))} invalid={(pinTouched && !/^\d{6}$/.test(pin)) || undefined} placeholder="••••••" style={{ letterSpacing:'8px', fontFamily:"'JetBrains Mono', monospace" }} />
        </Field>
      </Modal>

      <Modal open={revokeOpen} onClose={() => setRevokeOpen(false)} icon="lock" iconColor={DS.danger}
        title="Revoke access?"
        subtitle={`${studentName(student)} will no longer be able to sign in`}
        footer={<><Btn variant="ghost" onClick={() => setRevokeOpen(false)}>Cancel</Btn><Btn variant="danger" icon="lock" onClick={revoke}>Revoke access</Btn></>}>
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.6 }}>
          This disables the account and sets it back to <b>Invited</b>. Their data is kept — issue a new reset link any time to restore access.
        </div>
      </Modal>
    </>
  );

  return (
    <>
      <div style={{ flex:1, display:'flex', gap:18, overflow:'hidden', minHeight:0, padding:'0 28px' }}>
        {aside}
        {main}
      </div>
      {modals}
    </>
  );
};

const StudentProfilePage = ({ role = 'admin' } = {}) => {
  const store = useAdminStore();
  const isTeacher = role === 'teacher';   // teacher = read-only, no Fees/Account, no Edit
  const id = adminParam();
  const student = store.students.find(s => s.id === id);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState(null);

  React.useEffect(() => { if (student && !form) setForm({ ...student, subjects: student.subjects || [], classIds: student.classIds || [] }); }, [student]);

  if (!student) return (
    <div style={{ padding:'32px' }}>
      <EmptyState icon="user" title="Student not found" message="This student may have been removed." action={<Btn variant="primary" onClick={() => adminNav('students')}>Back to Students</Btn>} />
    </div>
  );
  if (!form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const save = () => {
    const teacherNames = [...new Set(form.classIds.map(cid => store.classes.find(c => c.id === cid)?.teacher).filter(Boolean))];
    store.updateStudent(student.id, {
      ...form, name: `${form.firstName} ${form.lastName}`.trim(),
      teacher: teacherNames.join(' / ') || form.teacher || '—',
    });
    setEditing(false);
  };
  const cancel = () => { setForm({ ...student, subjects: student.subjects || [], classIds: student.classIds || [] }); setEditing(false); };

  const enrolledClasses = (form.classIds || []).map(cid => store.classes.find(c => c.id === cid)).filter(Boolean);

  const header = (
    <>
      <FlowHeader title={studentName(student)} subtitle={`${student.year} · ${(student.subjects||[]).join(', ') || 'No subjects'}`} onBack={() => isTeacher ? (window.__navigate && window.__navigate('teacher','students')) : adminNav('students')} />
      <Card style={{ marginBottom: editing ? 20 : 16 }}>
        <div style={{ padding:'22px 24px', display:'flex', alignItems:'center', gap:18 }}>
          <Avatar name={studentName(student)} size={64} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:20, fontWeight:700, color:DS.text }}>{studentName(student)}</div>
            <div style={{ fontSize:13, color:DS.muted, marginTop:2 }}>{student.year} · {student.email || 'No email'}</div>
            <div style={{ marginTop:8 }}><Badge variant={student.status === 'at-risk' ? 'danger' : 'success'}>{student.status === 'at-risk' ? 'At risk' : 'Active'}</Badge></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {editing
              ? <><Btn variant="ghost" onClick={cancel}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save}>Save Changes</Btn></>
              : <><Btn variant="secondary" icon="print" onClick={() => window.print()}>Print</Btn><Btn variant="secondary" icon="message" onClick={() => window.__navigate && window.__navigate(role, 'comms')}>Message</Btn>{!isTeacher && <Btn variant="primary" icon="edit" onClick={() => setEditing(true)}>Edit Profile</Btn>}</>}
          </div>
        </div>
      </Card>
    </>
  );

  // View mode = fixed full-height shell: the banner and left aside stay put while
  // the right-hand tabs scroll on their own. Edit mode keeps the narrow form below.
  if (!editing) {
    return (
      <div style={{ height:'calc(100vh - 52px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flexShrink:0, padding:'24px 28px 0' }}>{header}</div>
        <StudentAnalyticsView key={student.id} student={student} enrolledClasses={enrolledClasses} role={role} />
      </div>
    );
  }

  return (
    <div style={{ padding:'32px', maxWidth:1040, margin:'0 auto' }}>
      {header}
      {(<>
      <Card title="Personal Details" style={{ marginBottom:20 }}>
        <div style={{ padding:'20px 24px' }}>
          {editing ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="First Name"><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} /></Field>
              <Field label="Last Name"><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.dob || ''} onChange={e => set('dob', e.target.value)} icon="calendar" /></Field>
              <Field label="Year Group"><Select value={form.year} onChange={e => set('year', e.target.value)}>{YEAR_GROUPS.map(y => <option key={y}>{y}</option>)}</Select></Field>
              <Field label="Email"><Input value={form.email || ''} onChange={e => set('email', e.target.value)} icon="mail" /></Field>
              <Field label="Phone"><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} icon="phone" /></Field>
              <Field label="Home Address" style={{ gridColumn:'1 / -1' }}><Input value={form.address || ''} onChange={e => set('address', e.target.value)} icon="pin" /></Field>
              <Field label="Status"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="at-risk">At risk</option></Select></Field>
            </div>
          ) : (
            [['Date of Birth', student.dob || '—'], ['Year Group', student.year], ['Email', student.email || '—'], ['Phone', student.phone || '—'], ['Home Address', student.address || '—'], ['Last Seen', student.lastSeen]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13.5 }}>
                <span style={{ color:DS.muted }}>{l}</span><span style={{ color:DS.text, fontWeight:500 }}>{v}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Subjects & Classes" style={{ marginBottom:20 }}>
        <div style={{ padding:'20px 24px' }}>
            {editing ? (
              <AcademicStep form={form} touched={false} err={{}} classes={store.classes} onToggleSubject={s => toggle('subjects', s)} onToggleClass={c => toggle('classIds', c)} />
            ) : (<>
              <div style={{ fontSize:12, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Subjects</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:24 }}>
                {(student.subjects || []).length ? student.subjects.map(s => <span key={s} style={{ fontSize:12.5, padding:'5px 11px', background:DS.accentLight, color:DS.accent, borderRadius:16, fontWeight:500 }}>{s}</span>) : <span style={{ fontSize:13, color:DS.faint }}>No subjects enrolled</span>}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:DS.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Enrolled Classes</div>
              {enrolledClasses.length ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {enrolledClasses.map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1px solid ${DS.cardBorder}`, borderRadius:10 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:subjectColor(c.name)+'18', color:subjectColor(c.name), display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="book" size={17} /></div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{c.name}</div><div style={{ fontSize:12, color:DS.muted }}>{c.group} · {c.teacher}</div></div>
                      <span style={{ fontSize:12, color:DS.muted }}>{c.day} {c.time}</span>
                    </div>
                  ))}
                </div>
              ) : <span style={{ fontSize:13, color:DS.faint }}>Not enrolled in any classes</span>}
            </>)}
        </div>
      </Card>

      <Card title="Guardian & Notes" style={{ marginBottom:20 }}>
        <div style={{ padding:'20px 24px' }}>
            {editing ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
                <Field label="Guardian Name"><Input value={form.guardianName || ''} onChange={e => set('guardianName', e.target.value)} icon="user" /></Field>
                <Field label="Relationship"><Select value={form.guardianRelation || 'Mother'} onChange={e => set('guardianRelation', e.target.value)}>{['Mother','Father','Guardian','Grandparent','Other'].map(r => <option key={r}>{r}</option>)}</Select></Field>
                <Field label="Guardian Email"><Input value={form.guardianEmail || ''} onChange={e => set('guardianEmail', e.target.value)} icon="mail" /></Field>
                <Field label="Guardian Phone"><Input value={form.guardianPhone || ''} onChange={e => set('guardianPhone', e.target.value)} icon="phone" /></Field>
                <Field label="Notes" style={{ gridColumn:'1 / -1' }}><Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
              </div>
            ) : (
              [['Guardian', student.guardianName || '—'], ['Relationship', student.guardianRelation || '—'], ['Guardian Email', student.guardianEmail || '—'], ['Guardian Phone', student.guardianPhone || '—'], ['Notes', student.notes || '—']].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13.5, gap:16 }}>
                  <span style={{ color:DS.muted, flexShrink:0 }}>{l}</span><span style={{ color:DS.text, fontWeight:500, textAlign:'right' }}>{v}</span>
                </div>
              ))
            )}
        </div>
      </Card>
      </>)}
    </div>
  );
};

// ─── Reports Page ───────────────────────────────────────────────────────────────
// Admin reports configuration lives in Reports.jsx (window.AdminReportsConfig),
// routed directly from index.html. Delegate here too as a safety net.
const AdminReportsPage = () => <AdminReportsConfig />;

// ─── Configurable-dimension combobox ────────────────────────────────────────────
// A <Select> of existing dimension values ({ id, name }) PLUS an inline "Add new…"
// option. Picking it swaps the select for a text input; on confirm we call onCreate
// (which persists the value to the store and returns its new id) then select it. So
// the admin can pick an existing value OR type a brand-new one that's saved and
// reusable for every future class.
const DimensionSelect = ({ options, value, onChange, onCreate, placeholder = 'Select…', invalid }) => {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const startAdd  = () => { setDraft(''); setAdding(true); };
  const cancelAdd = () => { setAdding(false); setDraft(''); };
  const confirm = () => {
    const name = draft.trim();
    if (!name) { cancelAdd(); return; }
    const id = onCreate(name);          // persists + returns id (existing or new)
    if (id) onChange(id);
    setAdding(false); setDraft('');
  };

  if (adding) {
    return (
      <div style={{ display:'flex', gap:8 }}>
        <Input
          autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Type a new value…" style={{ flex:1 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') cancelAdd(); }}
        />
        <Btn variant="primary" icon="check" small onClick={confirm}>Add</Btn>
        <Btn variant="ghost" small onClick={cancelAdd}>Cancel</Btn>
      </div>
    );
  }

  return (
    <Select
      value={value}
      invalid={invalid}
      onChange={e => { if (e.target.value === '__add__') startAdd(); else onChange(e.target.value); }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      <option value="__add__">＋ Add new…</option>
    </Select>
  );
};

// ─── New / Edit Class modal ─────────────────────────────────────────────────────
const ClassFormModal = ({ open, onClose, onSave, store, teachers, editing }) => {
  const blank = { name:'', description:'', group:'', room:'', capacity:'10', day:'Monday', time:'', teacher: teachers[0]?.name || '', status:'active', levelId:'', examBoardId:'' };
  const [form, setForm] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) { setForm(editing ? { ...editing, capacity: String(editing.capacity) } : blank); setTouched(false); }
  }, [open, editing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const errs = {
    name:    !form.name.trim() ? 'Subject is required' : '',
    group:   !form.group.trim() ? 'Group is required' : '',
    time:    !form.time.trim() ? 'Time is required' : '',
  };
  const valid = !errs.name && !errs.group && !errs.time;
  const color = subjectColor(form.name || 'GCSE Mathematics');

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSave({
      ...form,
      capacity: parseInt(form.capacity, 10) || 10,
      students: editing ? editing.students : 0,
    });
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose}
      icon="book" iconColor={color}
      title={editing ? 'Edit Class' : 'Create New Class'}
      subtitle={editing ? 'Update the details for this class.' : 'Set up a new class and assign a teacher.'}
      width={560}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={submit}>{editing ? 'Save Changes' : 'Create Class'}</Btn>
      </>}
    >
      {/* Live preview chip */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 14px', marginBottom:18,
        background: color + '12', border:`1px solid ${color}33`, borderRadius:10,
      }}>
        <div style={{ width:38, height:38, borderRadius:9, background:color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="book" size={18} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{form.name || 'New class'}</div>
          <div style={{ fontSize:12, color:DS.muted }}>{[form.group, form.day && form.time ? `${form.day} · ${form.time}` : null].filter(Boolean).join('  ·  ') || 'Year group · schedule'}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <Field label="Subject / Name" required error={touched && errs.name} style={{ gridColumn:'1 / -1' }}>
          <Input value={form.name} onChange={e => set('name', e.target.value)} invalid={touched && !!errs.name} placeholder="e.g. GCSE Mathematics" />
        </Field>
        <Field label="Short Description" style={{ gridColumn:'1 / -1' }}>
          <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Optional — a brief description of this class…" />
        </Field>
        <Field label="Year group" required error={touched && errs.group}>
          <Input value={form.group} onChange={e => set('group', e.target.value)} invalid={touched && !!errs.group} placeholder="e.g. Year 10 – Group A" />
        </Field>
        <Field label="Room">
          <Input value={form.room} onChange={e => set('room', e.target.value)} icon="pin" placeholder="e.g. Room 3" />
        </Field>
        {store && <Field label="Level">
          <DimensionSelect options={store.levels} value={form.levelId || ''} onChange={v => set('levelId', v)} onCreate={store.addLevel} placeholder="Select level…" />
        </Field>}
        {store && <Field label="Exam board">
          <DimensionSelect options={store.examBoards} value={form.examBoardId || ''} onChange={v => set('examBoardId', v)} onCreate={store.addExamBoard} placeholder="Select exam board…" />
        </Field>}
        <Field label="Day">
          <Select value={form.day} onChange={e => set('day', e.target.value)}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Time" required error={touched && errs.time}>
          <Input value={form.time} onChange={e => set('time', e.target.value)} invalid={touched && !!errs.time} icon="clock" placeholder="e.g. 09:00–10:30" />
        </Field>
        <Field label="Teacher">
          <Select value={form.teacher} onChange={e => set('teacher', e.target.value)}>
            {teachers.map(t => <option key={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Capacity">
          <Input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} icon="users" placeholder="10" />
        </Field>
      </div>
    </Modal>
  );
};

// ─── Subject form modal (create / edit) ─────────────────────────────────────────
const SUBJECT_PALETTE = ['#4F46E5','#0891B2','#0D9488','#D97706','#DC2626','#7C3AED','#DB2777','#2563EB'];
const SUBJECT_LEVELS = ['GCSE','A-Level','GCSE & A-Level','KS3','Entry Level','IB'];

const SubjectFormModal = ({ open, onClose, onSave, editing }) => {
  const blank = { name:'', level:'GCSE', color:SUBJECT_PALETTE[0], description:'' };
  const [form, setForm] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => { if (open) { setForm(editing ? { ...editing } : blank); setTouched(false); } }, [open, editing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = !form.name.trim() ? 'Subject name is required' : '';

  const submit = () => {
    setTouched(true);
    if (err) return;
    onSave({ ...form, name: form.name.trim(), description: form.description.trim() });
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose}
      icon="book" iconColor={form.color}
      title={editing ? 'Edit Subject' : 'Add Subject'}
      subtitle={editing ? 'Update this subject offering.' : 'Create a new subject for classes, teachers and students to sit under.'}
      width={520}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={submit}>{editing ? 'Save Changes' : 'Add Subject'}</Btn>
      </>}
    >
      {/* Live preview chip */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', marginBottom:18, background:form.color+'12', border:`1px solid ${form.color}33`, borderRadius:10 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:form.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="book" size={18} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{form.name || 'New subject'}</div>
          <div style={{ fontSize:12, color:DS.muted }}>{form.level}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <Field label="Subject name" required error={touched && err} style={{ gridColumn:'1 / -1' }}>
          <Input value={form.name} onChange={e => set('name', e.target.value)} invalid={touched && !!err} placeholder="e.g. Mathematics" />
        </Field>
        <Field label="Level" style={{ gridColumn:'1 / -1' }}>
          <Select value={form.level} onChange={e => set('level', e.target.value)}>
            {SUBJECT_LEVELS.map(l => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Colour" style={{ gridColumn:'1 / -1' }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {SUBJECT_PALETTE.map(c => (
              <button key={c} onClick={() => set('color', c)} title={c} style={{
                width:28, height:28, borderRadius:8, cursor:'pointer', background:c, padding:0,
                border:`2px solid ${form.color === c ? DS.text : 'transparent'}`,
                outline: form.color === c ? `2px solid ${c}55` : 'none', outlineOffset:1,
              }} />
            ))}
          </div>
        </Field>
        <Field label="Description" style={{ gridColumn:'1 / -1' }}>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional — what this subject covers…" />
        </Field>
      </div>
    </Modal>
  );
};

// Roll up classes / teachers / students that sit under a subject (by name match).
const subjectRollup = (store, sub) => ({
  classes:  store.classes.filter(c => matchesSubject(sub, [c.name])),
  teachers: store.teachers.filter(t => matchesSubject(sub, t.subjects || [t.subject])),
  students: store.students.filter(s => matchesSubject(sub, s.subjects || [])),
});

// ─── Subjects view (table — rolls up classes / teachers / students per subject) ──
const SubjectsView = ({ store, search }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const q = search.trim().toLowerCase();
  const subjects = store.subjects.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.level || '').toLowerCase().includes(q));

  const handleSave = data => { editing ? store.updateSubject(editing.id, data) : store.addSubject(data); };
  const openAdd  = () => { setEditing(null); setModalOpen(true); };
  const openEdit = s => { setEditing(s); setModalOpen(true); };
  const remove   = s => { if (window.confirm(`Remove “${s.name}”? Classes and students keep their data — only the subject entry is deleted.`)) store.removeSubject(s.id); };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <Btn variant="primary" icon="plus" small onClick={openAdd}>Add Subject</Btn>
      </div>

      <Card>
        {subjects.length === 0 ? (
          <EmptyState icon="book" title="No subjects found" message={q ? `No subjects match “${search}”.` : 'Add your first subject to group classes and students.'} action={!q && <Btn variant="primary" icon="plus" onClick={openAdd}>Add Subject</Btn>} />
        ) : (
          <Table
            cols={['Subject','Level','Classes','Teachers','Students',{ label:'', align:'right' }]}
            rows={subjects.map(sub => {
              const { classes, teachers, students } = subjectRollup(store, sub);
              const color = sub.color || subjectColor(sub.name);
              return [
                <button onClick={() => adminNav('subject_detail', sub.id)} style={{ display:'flex', alignItems:'center', gap:11, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:color+'18', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={16} /></div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:DS.accent }}>{sub.name}</div>
                    {sub.description && <div style={{ fontSize:11.5, color:DS.faint, maxWidth:340, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub.description}</div>}
                  </div>
                </button>,
                <Badge variant="default">{sub.level}</Badge>,
                <span style={{ fontSize:13, color:DS.sub, display:'inline-flex', alignItems:'center', gap:6 }}><Icon name="book" size={13} color={DS.faint} />{classes.length}</span>,
                <span style={{ fontSize:13, color:DS.sub, display:'inline-flex', alignItems:'center', gap:6 }}><Icon name="users" size={13} color={DS.faint} />{teachers.length}</span>,
                <span style={{ fontSize:13, color:DS.sub, display:'inline-flex', alignItems:'center', gap:6 }}><Icon name="graduation" size={13} color={DS.faint} />{students.length}</span>,
                <RowActionsMenu items={[
                  { label:'View subject', icon:'eye', onClick:() => adminNav('subject_detail', sub.id) },
                  { label:'Edit', icon:'edit', onClick:() => openEdit(sub) },
                  { label:'Remove', icon:'trash', danger:true, onClick:() => remove(sub) },
                ]} />,
              ];
            })}
          />
        )}
      </Card>

      <SubjectFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editing={editing} />
    </div>
  );
};

// ─── Subject detail page (all classes / teachers / students under a subject) ─────
const SubjectDetailPage = () => {
  const store = useAdminStore();
  const id = adminParam();
  const sub = store.subjects.find(s => s.id === id);
  const [modalOpen, setModalOpen] = React.useState(false);

  if (!sub) return (
    <div style={{ padding:'32px' }}>
      <EmptyState icon="book" title="Subject not found" message="This subject may have been removed." action={<Btn variant="primary" onClick={() => adminNav('classes')}>Back to Classes</Btn>} />
    </div>
  );

  const color = sub.color || subjectColor(sub.name);
  const { classes, teachers, students } = subjectRollup(store, sub);
  const totalSeats = classes.reduce((a, c) => a + c.capacity, 0);
  const filledSeats = classes.reduce((a, c) => a + c.students, 0);

  const stat = (label, value, first) => (
    <div style={{ padding:'16px 24px', borderLeft: first ? 'none' : `1px solid ${DS.border}` }}>
      <div style={{ fontSize:12, color:DS.muted }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:DS.text, marginTop:2 }}>{value}</div>
    </div>
  );

  const handleSave = data => store.updateSubject(sub.id, data);

  return (
    <div style={{ padding:'32px', maxWidth:1040, margin:'0 auto' }}>
      <FlowHeader title={sub.name} subtitle={sub.level} onBack={() => adminNav('classes')} />

      {/* Hero */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ padding:'22px 24px', display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:64, height:64, borderRadius:14, background:color+'18', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={28} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:20, fontWeight:700, color:DS.text }}>{sub.name}</div>
            <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}><Badge variant="accent">{sub.level}</Badge></div>
            {sub.description && <p style={{ fontSize:13, color:DS.muted, lineHeight:1.6, margin:'10px 0 0', maxWidth:560 }}>{sub.description}</p>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="primary" icon="edit" onClick={() => setModalOpen(true)}>Edit Subject</Btn>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:`1px solid ${DS.border}` }}>
          {stat('Classes', classes.length, true)}
          {stat('Teachers', teachers.length)}
          {stat('Students', students.length)}
          {stat('Seats Filled', totalSeats ? `${filledSeats}/${totalSeats}` : '—')}
        </div>
      </Card>

      {/* Classes */}
      <Card title={`Classes · ${classes.length}`} style={{ marginBottom:20 }} actions={<Btn variant="secondary" icon="plus" small onClick={() => adminNav('classes_add')}>Add Class</Btn>}>
        {classes.length === 0 ? (
          <EmptyState icon="book" title="No classes" message={`No classes are running under ${sub.name} yet.`} />
        ) : (
          <Table
            cols={['Class','Teacher','Students','Schedule','Room','']}
            rows={classes.map(c => {
              const cc = subjectColor(c.name);
              const teacher = store.teachers.find(t => t.name === c.teacher);
              return [
                <button onClick={() => adminNav('class_detail', c.id)} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:cc, flexShrink:0 }} />
                  <div><div style={{ fontSize:13.5, fontWeight:600, color:DS.accent }}>{c.name}</div><div style={{ fontSize:11.5, color:DS.faint }}>{c.group}</div></div>
                </button>,
                <span style={{ fontSize:13, color:DS.sub }}>{c.teacher}</span>,
                <span style={{ fontSize:12.5, color:DS.sub }}>{c.students}/{c.capacity}</span>,
                <span style={{ fontSize:12.5, color:DS.muted, display:'inline-flex', alignItems:'center', gap:5 }}><Icon name="clock" size={13} color={DS.faint} />{c.day} {c.time}</span>,
                <span style={{ fontSize:12.5, color:DS.muted, display:'inline-flex', alignItems:'center', gap:5 }}><Icon name="pin" size={13} color={DS.faint} />{c.room || '—'}</span>,
                <Btn variant="ghost" icon="eye" small onClick={() => adminNav('class_detail', c.id)}>View</Btn>,
              ];
            })}
          />
        )}
      </Card>

      {/* Teachers */}
      <Card title={`Teachers · ${teachers.length}`} style={{ marginBottom:20 }}>
        {teachers.length === 0 ? (
          <EmptyState icon="users" title="No teachers" message={`No teachers are assigned to ${sub.name}.`} />
        ) : (
          <Table
            cols={['Teacher','Subjects','Classes','Email','']}
            rows={teachers.map(t => [
              <button onClick={() => adminNav('teacher_profile', t.id)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                <span style={{ fontSize:13, fontWeight:600, color:DS.accent }}>{t.name}</span>
              </button>,
              <span style={{ fontSize:12.5, color:DS.muted }}>{t.subject || (t.subjects || []).join(' / ') || '—'}</span>,
              <span style={{ fontSize:13, color:DS.sub }}>{store.classes.filter(c => c.teacher === t.name).length}</span>,
              <span style={{ fontSize:12.5, color:DS.muted }}>{t.email || '—'}</span>,
              <Btn variant="ghost" icon="eye" small onClick={() => adminNav('teacher_profile', t.id)}>Profile</Btn>,
            ])}
          />
        )}
      </Card>

      {/* Students */}
      <Card title={`Students · ${students.length}`} style={{ marginBottom:20 }}>
        {students.length === 0 ? (
          <EmptyState icon="graduation" title="No students" message={`No students are enrolled in ${sub.name}.`} />
        ) : (
          <Table
            cols={['Student','Year','Attendance','HW %','Avg Score','']}
            rows={students.map(s => [
              <button onClick={() => adminNav('student_profile', s.id)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                <span style={{ fontSize:13, fontWeight:600, color:DS.accent }}>{studentName(s)}</span>
              </button>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.attendance < 80 ? DS.danger : DS.success }}>{s.attendance}%</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.hw < 50 ? DS.danger : DS.success }}>{s.hw}%</span>,
              <ScorePill score={s.score} />,
              <Btn variant="ghost" icon="eye" small onClick={() => adminNav('student_profile', s.id)}>Profile</Btn>,
            ])}
          />
        )}
      </Card>

      <SubjectFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editing={sub} />
    </div>
  );
};

// ─── Admin Classes Page ─────────────────────────────────────────────────────────
const AdminClassesPage = ({ section }) => {
  const store = useAdminStore();
  // The Classes/Subjects split is driven by the sidebar dropdown (`classes:<section>`),
  // not an in-page toggle. Default to Classes when no section is supplied.
  const view = section === 'subjects' ? 'subjects' : 'classes';
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const classes = store.classes;
  const totalSeats = classes.reduce((s, c) => s + c.capacity, 0);
  const filledSeats = classes.reduce((s, c) => s + c.students, 0);
  const avgFill = totalSeats ? Math.round((filledSeats / totalSeats) * 100) : 0;

  const filtered = classes.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.teacher.toLowerCase().includes(q) || c.group.toLowerCase().includes(q);
  });

  const handleSave = data => { if (editing) store.updateClass(editing.id, data); };

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title={view === 'subjects' ? 'Subjects' : 'Classes'}
        subtitle={`${classes.length} classes · ${store.subjects.length} subjects · ${filledSeats} enrolments · ${avgFill}% avg capacity`}
        actions={[view === 'classes'
          ? <Btn key="new" variant="primary" icon="plus" small onClick={() => adminNav('classes_add')}>Add Class</Btn>
          : null]}
      />

      {/* Summary KPIs */}
      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        <KPICard label="Total Classes" value={classes.length} sub="scheduled" icon="book" iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="Subjects"      value={store.subjects.length} sub="offered" icon="clip" iconBg={DS.accentLight} accent="#7C3AED" />
        <KPICard label="Students"      value={filledSeats}    sub="enrolled"  icon="graduation" iconBg={DS.infoBg} accent={DS.info} />
        <KPICard label="Avg Fill"      value={avgFill + '%'}  sub={`${filledSeats}/${totalSeats} seats`} icon="chart" iconBg={DS.warningBg} accent={DS.warning} />
      </div>

      {/* Toolbar — search (Classes/Subjects split lives in the sidebar nav) */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder={view === 'classes' ? 'Search classes, subjects or teachers…' : 'Search subjects…'} />
      </div>

      {view === 'subjects' ? (
        <SubjectsView store={store} search={search} />
      ) : (
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="book" title="No classes found" message={search ? `No classes match “${search}”.` : 'Create your first class to start scheduling sessions.'} action={!search && <Btn variant="primary" icon="plus" onClick={() => adminNav('classes_add')}>Add Class</Btn>} />
        ) : (
          <Table
            cols={['Class','Subject','Teacher','Students','Schedule','Room',{ label:'', align:'right' }]}
            rows={filtered.map(cls => {
              const color = subjectColor(cls.name);
              const fill = cls.capacity ? Math.min(100, Math.round((cls.students / cls.capacity) * 100)) : 0;
              const fillColor = fill >= 100 ? DS.danger : fill >= 85 ? DS.warning : DS.success;
              const teacher = store.teachers.find(t => t.name === cls.teacher);
              return [
                <button onClick={() => adminNav('class_detail', cls.id)} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:color, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:DS.accent }}>{cls.name}</div>
                    <div style={{ fontSize:11.5, color:DS.faint }}>{cls.group}</div>
                  </div>
                </button>,
                <span style={{ fontSize:11.5, padding:'3px 9px', background:color+'14', color, borderRadius:14, fontWeight:500 }}>{cls.name.replace(/^(GCSE|A-Level)\s/, '')}</span>,
                <span style={{ fontSize:13, color:DS.sub }}>{cls.teacher}</span>,
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:54, height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${fill}%`, height:'100%', background:fillColor }} />
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:600, color:DS.sub, fontVariantNumeric:'tabular-nums' }}>{cls.students}/{cls.capacity}</span>
                </div>,
                <span style={{ fontSize:12.5, color:DS.muted, display:'inline-flex', alignItems:'center', gap:5 }}><Icon name="clock" size={13} color={DS.faint} />{cls.day} {cls.time}</span>,
                <span style={{ fontSize:12.5, color:DS.muted, display:'inline-flex', alignItems:'center', gap:5 }}><Icon name="pin" size={13} color={DS.faint} />{cls.room || '—'}</span>,
                <RowActionsMenu items={[
                  { label:'View class', icon:'eye', onClick:() => adminNav('class_detail', cls.id) },
                  { label:'Edit', icon:'edit', onClick:() => { setEditing(cls); setModalOpen(true); } },
                ]} />,
              ];
            })}
          />
        )}
      </Card>
      )}

      <ClassFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} store={store} teachers={store.teachers} editing={editing} />
    </div>
  );
};

// ─── Add Class — full-page flow ──────────────────────────────────────────────────
// Three steps: Details (name/description + the four configurable dimensions),
// Schedule (timetable slot + room/capacity), and Students (assign teacher + roster).
// The four dimensions (subject / year group / level / exam board) are NOT fixed
// dropdowns — each uses <DimensionSelect>, so the admin can pick an existing value
// or type a brand-new one that's persisted to the store and reusable next time.
const CLASS_STEPS = ['Details', 'Schedule', 'Students'];

const AddClassPage = () => {
  const store = useAdminStore();
  const [step, setStep] = React.useState(0);
  const [touched, setTouched] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({
    name:'', description:'',
    subjectId:'', yearGroupId:'', levelId:'', examBoardId:'',
    groupLabel:'',
    teacher:'', room:'', day:'Monday', startTime:'09:00', endTime:'10:30',
    capacity:'10', status:'active', studentIds:[],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleStudent = id => setForm(f => ({ ...f, studentIds: f.studentIds.includes(id) ? f.studentIds.filter(x => x !== id) : [...f.studentIds, id] }));

  const subjectName = store.subjects.find(s => s.id === form.subjectId)?.name || '';
  const yearName    = store.yearGroups.find(y => y.id === form.yearGroupId)?.name || '';
  const levelName   = store.levels.find(l => l.id === form.levelId)?.name || '';
  const color = subjectColor(subjectName || form.name || 'GCSE Mathematics');
  // Composite display values used on save: keep the existing flat shape that the
  // list, detail page and timetable all read (name / group / time) so nothing breaks.
  const displayName = [levelName, subjectName].filter(Boolean).join(' ') || form.name.trim();
  const groupValue  = [yearName, form.groupLabel.trim()].filter(Boolean).join(' – ');
  const timeValue   = form.startTime && form.endTime ? `${form.startTime}–${form.endTime}` : (form.startTime || '');

  const stepErrs = [
    { name: !form.name.trim() ? 'Class name is required' : '', subject: !form.subjectId ? 'Select or add a subject' : '', year: !form.yearGroupId ? 'Select or add a year group' : '' },
    { time: !form.startTime || !form.endTime ? 'Start and end time are required' : '' },
    {},
  ];
  const stepValid = i => !Object.values(stepErrs[i]).some(Boolean);
  const next = () => { setTouched(true); if (!stepValid(step)) return; setTouched(false); setStep(s => Math.min(s + 1, CLASS_STEPS.length - 1)); };
  const back = () => step === 0 ? adminNav('classes') : setStep(s => s - 1);

  const submit = () => {
    setTouched(true);
    if (!stepValid(0)) { setStep(0); return; }
    if (!stepValid(1)) { setStep(1); return; }
    const teacher = form.teacher || store.teachers[0]?.name || '—';
    // Persist the rich record: the four dimension ids + the flat fields the rest of
    // the app already reads (name/group/teacher/day/time/room), plus the roster.
    // createClassWithRoster also writes each student's classIds in the same persist.
    store.createClassWithRoster({
      name: form.name.trim(),
      description: form.description.trim(),
      subjectId: form.subjectId, yearGroupId: form.yearGroupId, levelId: form.levelId, examBoardId: form.examBoardId,
      group: groupValue || yearName,
      teacherId: store.teachers.find(t => t.name === teacher)?.id || '',
      teacher,
      room: form.room.trim(), day: form.day, time: timeValue,
      schedule: { day: form.day, startTime: form.startTime, endTime: form.endTime },
      capacity: parseInt(form.capacity, 10) || 10,
      studentIds: form.studentIds, students: form.studentIds.length,
      status: form.status, tags: levelName ? [levelName] : [],
    }, form.studentIds);
    adminNav('classes');
  };

  const q = search.trim().toLowerCase();
  const studentMatches = store.students.filter(s => !q || studentName(s).toLowerCase().includes(q) || (s.year || '').toLowerCase().includes(q));

  return (
    <div style={{ padding:'32px', maxWidth:820, margin:'0 auto' }}>
      <FlowHeader title="Create New Class" subtitle="Set up a new class group" onBack={back} />
      <StepTabs steps={CLASS_STEPS} current={step} onJump={setStep} />

      {/* Live preview chip */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', marginBottom:18, background: color + '12', border:`1px solid ${color}33`, borderRadius:10 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={18} /></div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{form.name.trim() || displayName || 'New class'}</div>
          <div style={{ fontSize:12, color:DS.muted }}>{[groupValue || yearName, timeValue ? `${form.day} · ${timeValue}` : null].filter(Boolean).join('  ·  ') || 'Year group · schedule'}</div>
        </div>
      </div>

      <Card>
        <div style={{ padding:'24px 26px' }}>
          {step === 0 && (<>
            <FlowSection icon="book" title="Class Details" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="Class Name" required error={touched && stepErrs[0].name} style={{ gridColumn:'1 / -1' }} hint="Name it however you like — e.g. “Class 21J” or “Year 11 Maths”.">
                <Input value={form.name} onChange={e => set('name', e.target.value)} invalid={touched && !!stepErrs[0].name} placeholder="e.g. Class 21J" />
              </Field>
              <Field label="Short Description" style={{ gridColumn:'1 / -1' }}>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional — a brief description of this class…" />
              </Field>
              <Field label="Subject" required error={touched && stepErrs[0].subject}>
                <DimensionSelect options={store.subjects} value={form.subjectId} onChange={v => set('subjectId', v)} onCreate={store.addSubjectInline} placeholder="Select subject…" invalid={touched && !!stepErrs[0].subject} />
              </Field>
              <Field label="Year Group" required error={touched && stepErrs[0].year}>
                <DimensionSelect options={store.yearGroups} value={form.yearGroupId} onChange={v => set('yearGroupId', v)} onCreate={store.addYearGroup} placeholder="Select year…" invalid={touched && !!stepErrs[0].year} />
              </Field>
              <Field label="Level">
                <DimensionSelect options={store.levels} value={form.levelId} onChange={v => set('levelId', v)} onCreate={store.addLevel} placeholder="Select level…" />
              </Field>
              <Field label="Exam Board">
                <DimensionSelect options={store.examBoards} value={form.examBoardId} onChange={v => set('examBoardId', v)} onCreate={store.addExamBoard} placeholder="Select exam board…" />
              </Field>
              <Field label="Group Label" hint="Optional — e.g. “Group A” to split a year into sets." style={{ gridColumn:'1 / -1' }}>
                <Input value={form.groupLabel} onChange={e => set('groupLabel', e.target.value)} placeholder="e.g. Group A" />
              </Field>
            </div>
          </>)}

          {step === 1 && (<>
            <FlowSection icon="calendar" title="Timetable Slot" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 18px' }}>
              <Field label="Day"><Select value={form.day} onChange={e => set('day', e.target.value)}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}</Select></Field>
              <Field label="Start Time" required error={touched && stepErrs[1].time}><Input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} invalid={touched && !!stepErrs[1].time} icon="clock" /></Field>
              <Field label="End Time" required error={touched && stepErrs[1].time}><Input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} invalid={touched && !!stepErrs[1].time} icon="clock" /></Field>
            </div>
            <FlowSection icon="pin" title="Room & Capacity" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 18px' }}>
              <Field label="Room"><Input value={form.room} onChange={e => set('room', e.target.value)} icon="pin" placeholder="e.g. Room 3" /></Field>
              <Field label="Capacity"><Input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} icon="users" placeholder="10" /></Field>
              <Field label="Status"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="paused">Paused</option></Select></Field>
            </div>
          </>)}

          {step === 2 && (<>
            <FlowSection icon="user" title="Assign Teacher" />
            <Field label="Teacher">
              <Select value={form.teacher} onChange={e => set('teacher', e.target.value)}>
                <option value="">Assign teacher…</option>
                {store.teachers.map(t => <option key={t.id}>{t.name}</option>)}
              </Select>
            </Field>

            <FlowSection icon="users" title={`Enrol Students · ${form.studentIds.length} selected`} />
            <div style={{ marginBottom:12 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search students by name or year…" />
            </div>
            {studentMatches.length === 0 ? (
              <EmptyState icon="graduation" title="No students found" message={search ? `No students match “${search}”.` : 'No students in the system yet.'} />
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10, maxHeight:340, overflowY:'auto' }}>
                {studentMatches.map(s => {
                  const on = form.studentIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleStudent(s.id)} style={{
                      display:'flex', alignItems:'center', gap:11, textAlign:'left', cursor:'pointer',
                      padding:'10px 12px', borderRadius:10,
                      border:`1px solid ${on ? color : DS.border}`, background: on ? color + '0F' : DS.bg,
                    }}>
                      <div style={{
                        width:20, height:20, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                        border:`1.5px solid ${on ? color : DS.borderDark}`, background: on ? color : 'transparent',
                      }}>{on && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</div>
                      <Avatar name={studentName(s)} size={28} />
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:DS.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{studentName(s)}</div>
                        <div style={{ fontSize:11.5, color:DS.muted }}>{s.year}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>)}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 26px', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
          <Btn variant="ghost" onClick={back}>{step === 0 ? 'Cancel' : 'Back'}</Btn>
          {step < CLASS_STEPS.length - 1
            ? <Btn variant="primary" icon="chevron_r" onClick={next}>Continue</Btn>
            : <Btn variant="primary" icon="check" onClick={submit}>Create Class</Btn>}
        </div>
      </Card>
    </div>
  );
};

// ─── Class detail page ───────────────────────────────────────────────────────────
// Deterministic pseudo-random in [0,1) from a string seed — keeps demo figures
// (homework scores, weekly attendance, etc.) stable across re-renders for a class.
const seededRand = seed => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

// Synthesise a few homework assignments for a class (no real homework store link).
const classHomework = cls => {
  const rnd = seededRand(cls.id + 'hw');
  const titles = ['Algebra — Quadratics', 'Practice Paper 2', 'Topic Review Quiz', 'Past Paper Qs', 'Consolidation Set'];
  const n = 3 + Math.floor(rnd() * 3);
  return Array.from({ length: n }, (_, i) => {
    const submitted = Math.round((0.6 + rnd() * 0.4) * cls.students);
    const avg = 52 + Math.floor(rnd() * 44);
    const daysAgo = (i + 1) * (2 + Math.floor(rnd() * 4));
    return { id: `${cls.id}-hw${i}`, title: titles[i % titles.length], submitted, total: cls.students, avg, status: i === 0 ? 'open' : 'marked', daysAgo };
  });
};

// Assign / edit the cover teacher for a SINGLE class (the Class-detail entry point);
// onApply wires to store.setCover. The multi-class, per-class flow that lets each of
// an away teacher's classes get a different stand-in is TeacherCoverModal, below.
// `editing` = a cover already exists (controls title + the Remove button); `prefill`
// only seeds the form — it may come from an existing cover OR the away teacher's
// booked holiday, so it is kept distinct from whether we're editing.
const CoverModal = ({ open, onClose, store, awayName, classes = [], prefill, editing, onApply, onClear }) => {
  const candidates = store.teachers.filter(t => t.name !== awayName && t.status !== 'invited');
  const blank = { teacherId:'', from:'', to:'', reason:'' };
  const [form, setForm] = React.useState(blank);
  React.useEffect(() => {
    if (open) setForm(prefill
      ? { teacherId: prefill.teacherId || '', from: prefill.from || '', to: prefill.to || '', reason: prefill.reason || '' }
      : blank);
  }, [open, prefill]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const picked = store.teachers.find(t => t.id === form.teacherId);
  const badRange = form.from && form.to && form.from > form.to;
  const valid = picked && form.from && form.to && !badRange;

  const apply = () => {
    if (!valid) return;
    onApply({ teacherId: picked.id, teacher: picked.name, from: form.from, to: form.to, reason: form.reason.trim() });
    onClose();
  };
  const remove = () => { onClear && onClear(); onClose(); };

  return (
    <Modal
      open={open} onClose={onClose}
      icon="teacher" iconColor={DS.warning}
      title={editing ? 'Edit cover' : 'Arrange cover'}
      subtitle={`Assign a stand-in to take ${classes.length === 1 ? 'this class' : `all of ${awayName}'s classes`} while ${awayName || 'the teacher'} is away.`}
      width={520}
      footer={<>
        {editing && onClear && <Btn variant="ghost" icon="x" onClick={remove} style={{ marginRight:'auto' }}>Remove cover</Btn>}
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={apply} style={valid ? {} : { opacity:0.5, cursor:'not-allowed' }}>{editing ? 'Update cover' : 'Confirm cover'}</Btn>
      </>}
    >
      {/* Affected classes */}
      <div style={{ padding:'12px 14px', marginBottom:18, background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
        <div style={{ fontSize:11.5, color:DS.muted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>
          {classes.length} class{classes.length === 1 ? '' : 'es'} to cover
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {classes.map(c => (
            <span key={c.id} style={{ fontSize:12, padding:'3px 9px', background:subjectColor(c.name)+'14', color:subjectColor(c.name), border:`1px solid ${subjectColor(c.name)}33`, borderRadius:14 }}>
              {c.name} · {c.day}
            </span>
          ))}
        </div>
      </div>

      <Field label="Cover teacher" required>
        <Select value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
          <option value="">Select a teacher…</option>
          {candidates.map(t => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>)}
        </Select>
      </Field>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <Field label="From" required><Input type="date" value={form.from} onChange={e => set('from', e.target.value)} icon="calendar" invalid={badRange} /></Field>
        <Field label="To" required error={badRange ? 'End is before start' : ''}><Input type="date" value={form.to} onChange={e => set('to', e.target.value)} icon="calendar" invalid={badRange} /></Field>
      </div>
      <Field label="Reason" hint="Optional — shows on the class and timetable.">
        <Input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Annual leave / Sick" />
      </Field>
    </Modal>
  );
};

// Arrange cover across an away teacher's classes: ONE shared away window, but each
// class gets its own stand-in (or none) — so a multi-day absence can be split across
// several teachers. Builds a { [classId]: cover|null } map for store.setCoversForClasses.
const TeacherCoverModal = ({ open, onClose, store, teacher, classes = [], prefillWindow, prefillAssign, editing, onApply, onClear }) => {
  const awayName = teacher && teacher.name;
  const candidates = store.teachers.filter(t => t.name !== awayName && t.status !== 'invited');
  const [win, setWin] = React.useState({ from:'', to:'', reason:'' });
  const [assign, setAssign] = React.useState({}); // classId -> teacherId ('' = no cover)
  // Seed once per open. Deps are intentionally just [open] so an incidental parent
  // re-render (e.g. store refresh) can't wipe a half-finished assignment mid-edit.
  React.useEffect(() => {
    if (!open) return;
    setWin(prefillWindow ? { from: prefillWindow.from || '', to: prefillWindow.to || '', reason: prefillWindow.reason || '' } : { from:'', to:'', reason:'' });
    setAssign(prefillAssign ? { ...prefillAssign } : {});
  }, [open]);

  const setW   = (k, v) => setWin(w => ({ ...w, [k]: v }));
  const setOne = (cid, tid) => setAssign(a => ({ ...a, [cid]: tid }));
  const setAll = tid => setAssign(Object.fromEntries(classes.map(c => [c.id, tid])));
  const badRange = win.from && win.to && win.from > win.to;
  const assignedCount = classes.filter(c => assign[c.id]).length;
  const valid = win.from && win.to && !badRange && assignedCount > 0;

  const apply = () => {
    if (!valid) return;
    const map = {};
    classes.forEach(c => {
      const t = assign[c.id] && store.teachers.find(x => x.id === assign[c.id]);
      map[c.id] = t ? { teacherId: t.id, teacher: t.name, from: win.from, to: win.to, reason: win.reason.trim() } : null;
    });
    onApply(map);
    onClose();
  };
  const remove = () => { onClear && onClear(); onClose(); };

  return (
    <Modal
      open={open} onClose={onClose}
      icon="teacher" iconColor={DS.warning}
      title={editing ? 'Edit cover' : 'Arrange cover'}
      subtitle={`Set the away dates once, then choose a stand-in per class — each class can have a different cover while ${awayName || 'the teacher'} is away.`}
      width={600}
      footer={<>
        {editing && onClear && <Btn variant="ghost" icon="x" onClick={remove} style={{ marginRight:'auto' }}>Remove all cover</Btn>}
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="check" onClick={apply} style={valid ? {} : { opacity:0.5, cursor:'not-allowed' }}>{editing ? 'Update cover' : `Confirm cover · ${assignedCount}/${classes.length}`}</Btn>
      </>}
    >
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <Field label="Away from" required><Input type="date" value={win.from} onChange={e => setW('from', e.target.value)} icon="calendar" invalid={badRange} /></Field>
        <Field label="Away until" required error={badRange ? 'End is before start' : ''}><Input type="date" value={win.to} onChange={e => setW('to', e.target.value)} icon="calendar" invalid={badRange} /></Field>
      </div>
      <Field label="Reason" hint="Optional — applies to every covered class.">
        <Input value={win.reason} onChange={e => setW('reason', e.target.value)} placeholder="e.g. Annual leave / Sick" />
      </Field>

      {/* Quick-fill, then tweak per class */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', margin:'2px 0 16px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:10 }}>
        <span style={{ fontSize:12.5, color:DS.muted, whiteSpace:'nowrap' }}>Set all to</span>
        <Select value="" onChange={e => { if (e.target.value) setAll(e.target.value === '__none__' ? '' : e.target.value); }} style={{ flex:1 }}>
          <option value="">Choose a teacher…</option>
          <option value="__none__">— No cover —</option>
          {candidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>

      <FlowSection icon="users" title={`Cover by class · ${assignedCount}/${classes.length} assigned`} />
      {classes.length === 0 ? (
        <EmptyState icon="calendar" title="No classes to cover" message="This teacher isn't assigned to any classes yet." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
          {classes.map(c => {
            const color = subjectColor(c.name);
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', border:`1px solid ${DS.border}`, borderLeft:`3px solid ${color}`, borderRadius:10 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:DS.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize:11.5, color:DS.muted }}>{c.group} · {c.day} {c.time}</div>
                </div>
                <Select value={assign[c.id] || ''} onChange={e => setOne(c.id, e.target.value)} style={{ width:190, flexShrink:0 }}>
                  <option value="">— No cover —</option>
                  {candidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

const ClassDetailPage = () => {
  const store = useAdminStore();
  const id = adminParam();
  const cls = store.classes.find(c => c.id === id);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [coverOpen, setCoverOpen] = React.useState(false);

  if (!cls) return (
    <div style={{ padding:'32px' }}>
      <EmptyState icon="book" title="Class not found" message="This class may have been removed." action={<Btn variant="primary" onClick={() => adminNav('classes')}>Back to Classes</Btn>} />
    </div>
  );

  const color = subjectColor(cls.name);
  const teacher = store.teachers.find(t => t.name === cls.teacher);
  // Prefer the linked dimension ids (set by the create flow); fall back to the
  // legacy name-match so classes seeded before dimensions still resolve a subject.
  const subject   = store.subjects.find(s => s.id === cls.subjectId) || store.subjects.find(s => matchesSubject(s, [cls.name]));
  const yearGroup = store.yearGroups.find(y => y.id === cls.yearGroupId);
  const level     = store.levels.find(l => l.id === cls.levelId);
  const examBoard = store.examBoards.find(b => b.id === cls.examBoardId);
  const roster = store.students.filter(s => (s.classIds || []).includes(cls.id));
  const fill = cls.capacity ? Math.min(100, Math.round((cls.students / cls.capacity) * 100)) : 0;

  // Cover (substitute) state for this class.
  const cover = cls.cover;
  const onCover = coverActive(cls);
  const coverTeacher = cover && store.teachers.find(t => t.id === cover.teacherId);
  // Prefill the cover modal from an existing cover, else the regular teacher's next
  // booked holiday window — so "assign cover" lines up with when they're actually away.
  const teacherHoliday = teacher && (store.holidays[teacher.id] || []).find(h => !h.to || h.to >= todayISO());
  const coverPrefill = cover || (teacherHoliday ? { from: teacherHoliday.from, to: teacherHoliday.to, reason: teacherHoliday.reason } : null);

  // Derived analytics (stable per class). Prefer real roster figures when present.
  const rnd = seededRand(cls.id);
  const avgScore   = roster.length ? Math.round(roster.reduce((a, s) => a + (s.score || 0), 0) / roster.length) : 55 + Math.floor(rnd() * 35);
  const avgHw      = roster.length ? Math.round(roster.reduce((a, s) => a + (s.hw || 0), 0) / roster.length)    : 60 + Math.floor(rnd() * 35);
  const attendance = roster.length ? Math.round(roster.reduce((a, s) => a + (s.attendance || 0), 0) / roster.length) : 85 + Math.floor(rnd() * 13);
  const homework = classHomework(cls);
  const weeks = ['W1','W2','W3','W4','W5','W6','W7','W8'];
  const attTrend   = weeks.map(() => 78 + Math.round(rnd() * 20));
  const scoreTrend = weeks.map((_, i) => Math.max(40, Math.min(98, avgScore - 10 + i * 2 + Math.round((rnd() - 0.5) * 8))));

  const stat = (label, value, c) => (
    <div style={{ padding:'16px 24px', borderLeft:`1px solid ${DS.border}` }}>
      <div style={{ fontSize:12, color:DS.muted }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:c || DS.text, marginTop:2 }}>{value}</div>
    </div>
  );

  const handleSave = data => store.updateClass(cls.id, data);

  return (
    <div style={{ padding:'32px', maxWidth:1040, margin:'0 auto' }}>
      <FlowHeader title={cls.name} subtitle={`${cls.group} · ${cls.teacher}`} onBack={() => adminNav('classes')} />

      {/* Cover banner — only while the substitute window is live */}
      {onCover && (
        <div style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 16px', marginBottom:20, background:DS.warningBg, border:`1px solid ${DS.warningBorder}`, borderRadius:10 }}>
          <Icon name="teacher" size={18} color={DS.warning} />
          <div style={{ fontSize:13, color:DS.sub, lineHeight:1.5, flex:1 }}>
            <strong style={{ color:DS.text }}>{cls.teacher} is away</strong> — <strong style={{ color:DS.text }}>{onCover.teacher}</strong> is covering this class until {fmtDay(onCover.to)}{onCover.reason ? ` (${onCover.reason})` : ''}.
          </div>
          <Btn variant="secondary" small icon="edit" onClick={() => setCoverOpen(true)}>Manage</Btn>
        </div>
      )}

      {/* Hero */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ padding:'22px 24px', display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ width:64, height:64, borderRadius:14, background:color+'18', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={28} /></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:20, fontWeight:700, color:DS.text }}>{cls.name}</div>
            <div style={{ fontSize:13, color:DS.muted, marginTop:2 }}>{cls.group} · {cls.day} {cls.time} · {cls.room || 'No room'}</div>
            <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
              <Badge variant={cls.status === 'paused' ? 'default' : 'success'}>{cls.status === 'paused' ? 'Paused' : 'Active'}</Badge>
              {subject && <Badge variant="accent">{subject.name}</Badge>}
              {level && <Badge variant="default">{level.name}</Badge>}
              {examBoard && <Badge variant="default">{examBoard.name}</Badge>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" icon="message">Message Class</Btn>
            <Btn variant="primary" icon="edit" onClick={() => setModalOpen(true)}>Edit Class</Btn>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:`1px solid ${DS.border}` }}>
          <div style={{ padding:'16px 24px' }}>
            <div style={{ fontSize:12, color:DS.muted }}>Enrolment</div>
            <div style={{ fontSize:22, fontWeight:700, color:DS.text, marginTop:2 }}>{cls.students}/{cls.capacity}</div>
          </div>
          {stat('Avg Score', avgScore + '%', avgScore < 60 ? DS.danger : DS.success)}
          {stat('HW Completion', avgHw + '%', avgHw < 50 ? DS.danger : DS.success)}
          {stat('Attendance', attendance + '%', attendance < 80 ? DS.danger : DS.success)}
        </div>
      </Card>

      {/* Details + teacher */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start', marginBottom:20 }}>
        <Card title="Class Details">
          <div style={{ padding:'20px 24px' }}>
            {[
              ['Subject', subject ? subject.name : cls.name.replace(/^(GCSE|A-Level)\s/, '')],
              ['Year group', yearGroup ? yearGroup.name : cls.group],
              level && ['Level', level.name],
              examBoard && ['Exam board', examBoard.name],
              ['Teacher', cls.teacher],
              cover && ['Cover', `${cover.teacher} · ${fmtRange(cover.from, cover.to)}${onCover ? ' (active)' : ' (scheduled)'}`],
              ['Schedule', `${cls.day} · ${cls.time}`],
              ['Room', cls.room || '—'],
              ['Capacity', `${cls.students} / ${cls.capacity} (${fill}% full)`],
              cls.description && ['Description', cls.description],
              ['Status', cls.status === 'paused' ? 'Paused' : 'Active'],
            ].filter(Boolean).map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13.5, gap:16 }}>
                <span style={{ color:DS.muted, flexShrink:0 }}>{l}</span><span style={{ color:DS.text, fontWeight:500, textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Teacher">
          <div style={{ padding:'18px 20px' }}>
            {teacher ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Avatar name={teacher.name} size={44} color={teacher.color} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:DS.text }}>{teacher.name}</div>
                    <div style={{ fontSize:12, color:DS.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{teacher.email || '—'}</div>
                  </div>
                </div>
                <Btn variant="secondary" icon="user" onClick={() => adminNav('teacher_profile', teacher.id)}>View Teacher</Btn>
              </div>
            ) : <div style={{ fontSize:13, color:DS.faint }}>No teacher assigned.</div>}

            {/* Cover / substitute teacher */}
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${DS.border}` }}>
              {cover ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                    <Avatar name={cover.teacher} size={38} color={coverTeacher && coverTeacher.color} />
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:10.5, color:DS.muted, textTransform:'uppercase', letterSpacing:0.5, fontWeight:600 }}>Cover teacher</div>
                      <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>{cover.teacher}</div>
                      <div style={{ fontSize:12, color:DS.muted }}>{fmtRange(cover.from, cover.to)}</div>
                    </div>
                    <Badge variant={onCover ? 'warning' : 'default'}>{onCover ? 'Active' : 'Scheduled'}</Badge>
                  </div>
                  {cover.reason && <div style={{ fontSize:12, color:DS.muted }}>{cover.reason}</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn variant="secondary" icon="edit" small onClick={() => setCoverOpen(true)} style={{ flex:1 }}>Edit cover</Btn>
                    <Btn variant="ghost" icon="x" small onClick={() => store.clearCover(cls.id)}>Remove</Btn>
                  </div>
                </div>
              ) : teacher ? (
                <Btn variant="secondary" icon="teacher" onClick={() => setCoverOpen(true)} style={{ width:'100%' }}>Assign cover teacher</Btn>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* Enrolled students */}
      <Card title={`Enrolled Students · ${roster.length}`} style={{ marginBottom:20 }} actions={
        <Btn variant="secondary" icon="users" small onClick={() => adminNav('class_roster', cls.id)}>Manage roster</Btn>
      }>
        {roster.length === 0 ? (
          <EmptyState icon="graduation" title="No students enrolled" message="Add already signed-up students from the class roster." action={<Btn variant="primary" icon="users" small onClick={() => adminNav('class_roster', cls.id)}>Manage roster</Btn>} />
        ) : (
          <Table
            cols={['Student','Year','Attendance','HW %','Avg Score','']}
            rows={roster.map(s => [
              <button onClick={() => adminNav('student_profile', s.id)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
                <span style={{ fontSize:13, fontWeight:600, color:DS.accent }}>{studentName(s)}</span>
              </button>,
              <span style={{ fontSize:13, color:DS.muted }}>{s.year}</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.attendance < 80 ? DS.danger : DS.success }}>{s.attendance}%</span>,
              <span style={{ fontSize:13, fontWeight:600, color: s.hw < 50 ? DS.danger : DS.success }}>{s.hw}%</span>,
              <ScorePill score={s.score} />,
              <Btn variant="ghost" icon="eye" small onClick={() => adminNav('student_profile', s.id)}>Profile</Btn>,
            ])}
          />
        )}
      </Card>

      {/* Homework */}
      <Card title="Homework" style={{ marginBottom:20 }} actions={<Btn variant="secondary" icon="plus" small onClick={() => window.__navigate && window.__navigate('admin', 'classes')}>Assign</Btn>}>
        <Table
          cols={['Assignment','Submitted','Avg Score','Set','Status']}
          rows={homework.map(h => [
            <span style={{ fontSize:13, fontWeight:600, color:DS.text }}>{h.title}</span>,
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:54, height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${h.total ? Math.round((h.submitted/h.total)*100) : 0}%`, height:'100%', background:DS.accent }} />
              </div>
              <span style={{ fontSize:12.5, color:DS.sub, fontVariantNumeric:'tabular-nums' }}>{h.submitted}/{h.total}</span>
            </div>,
            <ScorePill score={h.avg} />,
            <span style={{ fontSize:12.5, color:DS.muted }}>{h.daysAgo}d ago</span>,
            <StatusPill status={h.status === 'open' ? 'Open' : 'Marked'} tone={h.status === 'open' ? 'warning' : 'positive'} />,
          ])}
        />
      </Card>

      {/* Progress & analytics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
        <KPICard label="Avg Score"     value={avgScore + '%'}   sub="this term" icon="chart"      iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="HW Completion" value={avgHw + '%'}      sub="submitted" icon="clip"       iconBg={DS.infoBg}      accent={DS.info} />
        <KPICard label="Attendance"    value={attendance + '%'} sub="average"   icon="graduation" iconBg={DS.successBg}   accent={DS.success} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card title="Average Score Trend">
          <div style={{ padding:'20px 24px' }}>
            <LineChart labels={weeks} series={[{ label:'Avg score %', data:scoreTrend, color:DS.accent }]} height={220} />
          </div>
        </Card>
        <Card title="Attendance by Week" actions={<span style={{ fontSize:12, color:DS.muted }}>{attendance}% average</span>}>
          <div style={{ padding:'20px 24px' }}>
            <BarChart labels={weeks} data={attTrend} color={DS.success} height={220} />
          </div>
        </Card>
      </div>

      <Card title="Score Distribution" style={{ marginBottom:20 }}>
        <div style={{ padding:'20px 24px' }}>
          <BarChart
            labels={['0–40','40–60','60–80','80–100']}
            data={[
              roster.filter(s => s.score < 40).length || (avgScore < 55 ? 2 : 1),
              roster.filter(s => s.score >= 40 && s.score < 60).length || 2,
              roster.filter(s => s.score >= 60 && s.score < 80).length || 3,
              roster.filter(s => s.score >= 80).length || (avgScore > 75 ? 4 : 2),
            ]}
            color={color} height={180}
          />
        </div>
      </Card>

      <ClassFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} store={store} teachers={store.teachers} editing={cls} />
      <CoverModal open={coverOpen} onClose={() => setCoverOpen(false)} store={store} awayName={cls.teacher} classes={[cls]}
        prefill={coverPrefill} editing={!!cover} onApply={cv => store.setCover(cls.id, cv)} onClear={() => store.clearCover(cls.id)} />
    </div>
  );
};

// ─── Teacher helpers ─────────────────────────────────────────────────────────────
const SUBJECT_OPTIONS = ['Mathematics','Further Maths','English Literature','Science / Biology','Chemistry / Physics','History / RS','Computer Science','Geography','Languages','Physics','Chemistry','Biology'];
const TEACHER_TITLES = ['Mr','Mrs','Ms','Dr','Miss'];

// Normalise a teacher's subjects to an array (older records carry a single string).
const teacherSubjects = t => Array.isArray(t.subjects) ? t.subjects : (t.subject ? t.subject.split('/').map(s => s.trim()) : []);

// ─── Add Teacher — full-page 3-step flow ─────────────────────────────────────────
const TEACHER_STEPS = ['Personal', 'Subjects', 'Contract'];

const AddTeacherPage = () => {
  const store = useAdminStore();
  const [step, setStep] = React.useState(0);
  const [touched, setTouched] = React.useState(false);
  const [form, setForm] = React.useState({
    title:'Mr', firstName:'', lastName:'', email:'', phone:'', address:'', qualifications:'',
    subjects:[], role:'teacher', contract:'Full-time', startDate:'', salary:'',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const stepErrs = [
    { firstName: !form.firstName.trim() ? 'First name is required' : '', lastName: !form.lastName.trim() ? 'Last name is required' : '', email: !form.email.trim() ? 'Email is required' : !emailValid ? 'Enter a valid email' : '' },
    { subjects: form.subjects.length === 0 ? 'Select at least one subject' : '' },
    {},
  ];
  const stepValid = i => !Object.values(stepErrs[i]).some(Boolean);
  const next = () => { setTouched(true); if (!stepValid(step)) return; setTouched(false); setStep(s => Math.min(s + 1, TEACHER_STEPS.length - 1)); };
  const back = () => step === 0 ? adminNav('teachers') : setStep(s => s - 1);

  const submit = () => {
    setTouched(true);
    if (!stepValid(0)) { setStep(0); return; }
    if (!stepValid(1)) { setStep(1); return; }
    const name = `${form.title} ${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    store.addTeacher({
      title: form.title, firstName: form.firstName.trim(), lastName: form.lastName.trim(), name,
      subject: form.subjects.join(' / '), subjects: form.subjects,
      email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
      qualifications: form.qualifications.trim(), role: form.role, contract: form.contract,
      startDate: form.startDate, salary: form.salary,
      status:'active', classes:0, students:0, hwToMark:0, attendance:100, rating:0,
      joined: 'Joined ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),
      color: TEACHER_PALETTE[Math.floor(Math.random() * TEACHER_PALETTE.length)],
    });
    adminNav('teachers');
  };

  return (
    <div style={{ padding:'32px', maxWidth:860, margin:'0 auto' }}>
      <FlowHeader title="Register New Teacher" subtitle="Complete all sections to onboard a new teacher" onBack={back} />
      <StepTabs steps={TEACHER_STEPS} current={step} onJump={setStep} />

      <Card>
        <div style={{ padding:'24px 26px' }}>
          {step === 0 && (<>
            <FlowSection icon="user" title="Personal" />
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr', gap:'0 18px' }}>
              <Field label="Title"><Select value={form.title} onChange={e => set('title', e.target.value)}>{TEACHER_TITLES.map(t => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="First Name" required error={touched && stepErrs[0].firstName}><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} invalid={touched && !!stepErrs[0].firstName} placeholder="First name" /></Field>
              <Field label="Last Name" required error={touched && stepErrs[0].lastName}><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} invalid={touched && !!stepErrs[0].lastName} placeholder="Last name" /></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="Email" required error={touched && stepErrs[0].email}><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} invalid={touched && !!stepErrs[0].email} icon="mail" placeholder="teacher@school.ac.uk" /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={e => set('phone', e.target.value)} icon="phone" placeholder="+44 7…" /></Field>
              <Field label="Address" style={{ gridColumn:'1 / -1' }}><Input value={form.address} onChange={e => set('address', e.target.value)} icon="pin" placeholder="Full address" /></Field>
              <Field label="Qualifications" style={{ gridColumn:'1 / -1' }}><Input value={form.qualifications} onChange={e => set('qualifications', e.target.value)} icon="graduation" placeholder="e.g. PGCE, BSc Mathematics" /></Field>
            </div>
          </>)}

          {step === 1 && (<>
            <FlowSection icon="book" title="Subjects Taught" />
            {touched && stepErrs[1].subjects && <div style={{ fontSize:11.5, color:DS.danger, marginBottom:10 }}>{stepErrs[1].subjects}</div>}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {SUBJECT_OPTIONS.map(sub => {
                const on = form.subjects.includes(sub);
                return (
                  <button key={sub} onClick={() => toggle('subjects', sub)} style={{
                    padding:'8px 14px', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:500,
                    border:`1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.sub,
                    display:'inline-flex', alignItems:'center', gap:6,
                  }}>{on && <Icon name="check" size={13} color={DS.accent} strokeWidth={2.5} />}{sub}</button>
                );
              })}
            </div>
          </>)}

          {step === 2 && (<>
            <FlowSection icon="invoice" title="Contract" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 18px' }}>
              <Field label="Role"><Select value={form.role} onChange={e => set('role', e.target.value)}><option value="teacher">Teacher</option><option value="lead">Lead Teacher</option><option value="admin">Teacher + Admin</option></Select></Field>
              <Field label="Contract Type"><Select value={form.contract} onChange={e => set('contract', e.target.value)}>{['Full-time','Part-time','Hourly','Contract'].map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Start Date"><Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} icon="calendar" /></Field>
              <Field label="Annual Salary / Rate"><Input value={form.salary} onChange={e => set('salary', e.target.value)} icon="invoice" placeholder="e.g. £42,000 or £35/hr" /></Field>
            </div>
          </>)}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 26px', borderTop:`1px solid ${DS.border}`, background:DS.surface }}>
          <Btn variant="ghost" onClick={back}>{step === 0 ? 'Cancel' : 'Back'}</Btn>
          {step < TEACHER_STEPS.length - 1
            ? <Btn variant="primary" icon="chevron_r" onClick={next}>Continue</Btn>
            : <Btn variant="primary" icon="check" onClick={submit}>Register Teacher</Btn>}
        </div>
      </Card>
    </div>
  );
};

// ─── Teacher attendance helpers ──────────────────────────────────────────────────
const ATT_META = {
  present: { label:'Present', color:DS.success, bg:DS.successBg, border:DS.successBorder },
  late:    { label:'Late',    color:DS.warning, bg:DS.warningBg, border:DS.warningBorder },
  absent:  { label:'Absent',  color:DS.danger,  bg:DS.dangerBg,  border:DS.dangerBorder },
};
const isoDate = d => d.toISOString().slice(0, 10);
const todayISO = () => isoDate(new Date());
// Last N weekdays (most recent first), for the attendance register.
const recentWeekdays = (n = 10) => {
  const out = []; const d = new Date();
  while (out.length < n) { if (d.getDay() !== 0 && d.getDay() !== 6) out.push(isoDate(d)); d.setDate(d.getDate() - 1); }
  return out;
};
const fmtDay = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
const fmtRange = (from, to) => from && to ? `${fmtDay(from)} → ${fmtDay(to)}` : (from ? `from ${fmtDay(from)}` : to ? `until ${fmtDay(to)}` : 'no dates set');

// ── Cover (substitute teacher) resolution ────────────────────────────────────
// A class always keeps its regular `teacher`; `cls.cover` (set by admin) names a
// stand-in for a [from,to] window. Cover is "active" only within that window on
// the given date — so it kicks in automatically while the teacher is away and
// lifts itself once the window passes, with no manual revert.
const coverActive = (cls, dateISO = todayISO()) => {
  const cv = cls && cls.cover;
  if (!cv || !cv.teacher) return null;
  if (cv.from && dateISO < cv.from) return null;
  if (cv.to && dateISO > cv.to) return null;
  return cv;
};
// Who actually teaches this class on `dateISO` — the cover if active, else regular.
// The canonical resolver any view can use to ask "who's taking this session now".
const effectiveTeacher = (cls, dateISO = todayISO()) => {
  const cv = coverActive(cls, dateISO);
  return cv ? cv.teacher : cls.teacher;
};

// Small present/late/absent toggle used by both admin and teacher self-service.
const AttendanceToggle = ({ value, onSet }) => (
  <div style={{ display:'inline-flex', gap:6 }}>
    {['present','late','absent'].map(k => {
      const m = ATT_META[k]; const on = value === k;
      return (
        <button key={k} onClick={() => onSet(on ? null : k)} style={{
          padding:'5px 11px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600,
          border:`1px solid ${on ? m.border : DS.border}`, background: on ? m.bg : DS.bg, color: on ? m.color : DS.muted,
        }}>{m.label}</button>
      );
    })}
  </div>
);

// ─── Teacher profile / details — schedule, attendance, holidays, edit ────────────
const TeacherProfilePage = () => {
  const store = useAdminStore();
  const id = adminParam();
  const teacher = store.teachers.find(t => t.id === id);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState(null);
  const [holiday, setHoliday] = React.useState({ from:'', to:'', reason:'' });
  const [coverOpen, setCoverOpen] = React.useState(false);

  React.useEffect(() => { if (teacher && !form) setForm({ ...teacher, subjects: teacherSubjects(teacher) }); }, [teacher]);

  if (!teacher) return (
    <div style={{ padding:'32px' }}>
      <EmptyState icon="user" title="Teacher not found" action={<Btn variant="primary" onClick={() => adminNav('teachers')}>Back to Teachers</Btn>} />
    </div>
  );
  if (!form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));
  const save = () => { store.updateTeacher(teacher.id, { ...form, subject: form.subjects.join(' / ') }); setEditing(false); };
  const cancel = () => { setForm({ ...teacher, subjects: teacherSubjects(teacher) }); setEditing(false); };

  const teacherClasses = store.classes.filter(c => c.teacher === teacher.name);
  const holidays = store.holidays[teacher.id] || [];
  const days = recentWeekdays(10);
  const present = days.filter(d => (store.attendance[`${teacher.id}|${d}`] || 'present') === 'present').length;

  // Cover across this teacher's classes — each class can have its OWN stand-in, so
  // we summarise the set rather than assume one cover teacher.
  const coveredClasses = teacherClasses.filter(c => c.cover);
  const coverNames = [...new Set(coveredClasses.map(c => c.cover.teacher))];
  const liveCover  = teacherClasses.some(c => coverActive(c));
  // Distinct away windows in play (the flow shares one, but be robust to mixed).
  const coverRanges = [...new Set(coveredClasses.map(c => `${c.cover.from}|${c.cover.to}`))];
  const coverReasons = [...new Set(coveredClasses.map(c => c.cover.reason).filter(Boolean))];
  const windowLabel = coverRanges.length === 1 && coveredClasses.length
    ? fmtRange(coveredClasses[0].cover.from, coveredClasses[0].cover.to)
    : 'various dates';
  // Modal seed: shared away window (existing cover → next booked holiday) + the
  // per-class teacher already assigned to each covered class.
  const nextHoliday = holidays.find(h => !h.to || h.to >= todayISO());
  const seedCover = coveredClasses[0] && coveredClasses[0].cover;
  const coverWindow = seedCover
    ? { from: seedCover.from, to: seedCover.to, reason: seedCover.reason }
    : (nextHoliday ? { from: nextHoliday.from, to: nextHoliday.to, reason: nextHoliday.reason } : null);
  const seedAssign = {};
  coveredClasses.forEach(c => { seedAssign[c.id] = c.cover.teacherId; });

  return (
    <div style={{ padding:'32px', maxWidth:1040, margin:'0 auto' }}>
      <FlowHeader title={teacher.name} subtitle={teacherSubjects(teacher).join(' · ') || 'No subjects'} onBack={() => adminNav('teachers')} />

      <Card style={{ marginBottom:20 }}>
        <div style={{ padding:'22px 24px', display:'flex', alignItems:'center', gap:18 }}>
          <Avatar name={teacher.name} size={64} color={teacher.color} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:20, fontWeight:700, color:DS.text }}>{teacher.name}</div>
            <div style={{ fontSize:13, color:DS.muted, marginTop:2 }}>{teacher.email} {teacher.phone ? `· ${teacher.phone}` : ''}</div>
            <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
              {teacherSubjects(teacher).map(s => <span key={s} style={{ fontSize:11.5, padding:'3px 9px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:14, color:DS.sub }}>{s}</span>)}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {editing
              ? <><Btn variant="ghost" onClick={cancel}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save}>Save Changes</Btn></>
              : <><Btn variant="secondary" icon="message">Message</Btn><Btn variant="primary" icon="edit" onClick={() => setEditing(true)}>Edit Details</Btn></>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:`1px solid ${DS.border}` }}>
          {[['Classes', teacherClasses.length], ['Students', teacher.students || 0], ['Attendance', teacher.attendance + '%'], ['Holidays booked', holidays.length]].map(([l,v], i) => (
            <div key={l} style={{ padding:'16px 24px', borderLeft: i ? `1px solid ${DS.border}` : 'none' }}>
              <div style={{ fontSize:12, color:DS.muted }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:700, color:DS.text, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Details" style={{ marginBottom:20 }}>
        <div style={{ padding:'20px 24px' }}>
            {editing ? (
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr', gap:'0 18px' }}>
                <Field label="Title"><Select value={form.title || 'Mr'} onChange={e => set('title', e.target.value)}>{TEACHER_TITLES.map(t => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="First Name"><Input value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} /></Field>
                <Field label="Last Name"><Input value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} /></Field>
                <Field label="Email" style={{ gridColumn:'1 / 3' }}><Input value={form.email || ''} onChange={e => set('email', e.target.value)} icon="mail" /></Field>
                <Field label="Phone"><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} icon="phone" /></Field>
                <Field label="Qualifications" style={{ gridColumn:'1 / -1' }}><Input value={form.qualifications || ''} onChange={e => set('qualifications', e.target.value)} icon="graduation" /></Field>
                <div style={{ gridColumn:'1 / -1' }}>
                  <Field label="Subjects">
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {SUBJECT_OPTIONS.map(sub => { const on = form.subjects.includes(sub); return (
                        <button key={sub} onClick={() => toggle('subjects', sub)} style={{ padding:'6px 12px', borderRadius:18, cursor:'pointer', fontSize:12.5, border:`1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.sub }}>{sub}</button>
                      ); })}
                    </div>
                  </Field>
                </div>
              </div>
            ) : (
              [['Name', teacher.name], ['Email', teacher.email], ['Phone', teacher.phone || '—'], ['Address', teacher.address || '—'], ['Qualifications', teacher.qualifications || '—'], ['Role', teacher.role || 'Teacher'], ['Contract', teacher.contract || '—'], ['Joined', teacher.joined]].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${DS.border}`, fontSize:13.5, gap:16 }}>
                  <span style={{ color:DS.muted }}>{l}</span><span style={{ color:DS.text, fontWeight:500, textAlign:'right' }}>{v}</span>
                </div>
              ))
            )}
        </div>
      </Card>

      <Card title="Weekly Schedule" style={{ marginBottom:20 }}>
        <div style={{ padding:'8px 0' }}>
            {teacherClasses.length ? teacherClasses.map((c, i) => (
              <button key={c.id} onClick={() => adminNav('class_detail', c.id)} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:14, padding:'14px 24px', borderBottom: i < teacherClasses.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:subjectColor(c.name)+'18', color:subjectColor(c.name), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="book" size={18} /></div>
                <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:600, color:DS.accent }}>{c.name}</div><div style={{ fontSize:12, color:DS.muted }}>{c.group} · {c.room || 'No room'}</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:13, fontWeight:600, color:DS.text }}>{c.day}</div><div style={{ fontSize:12, color:DS.muted }}>{c.time}</div></div>
              </button>
            )) : <EmptyState icon="calendar" title="No classes scheduled" message="Assign this teacher to a class to populate their schedule." />}
        </div>
      </Card>

      <Card title="Attendance Register" style={{ marginBottom:20 }} actions={<span style={{ fontSize:12, color:DS.muted }}>{present}/{days.length} present (last {days.length} days)</span>}>
        <div style={{ padding:'8px 0' }}>
            {days.map((d, i) => {
              const v = store.attendance[`${teacher.id}|${d}`] || (d === todayISO() ? null : 'present');
              return (
                <div key={d} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', borderBottom: i < days.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                  <div style={{ fontSize:13.5, color:DS.text, fontWeight: d === todayISO() ? 700 : 500 }}>{fmtDay(d)}{d === todayISO() && <span style={{ fontSize:11, color:DS.accent, marginLeft:8 }}>Today</span>}</div>
                  <AttendanceToggle value={v} onSet={val => store.setAttendance(teacher.id, d, val)} />
                </div>
              );
            })}
        </div>
      </Card>

      <Card title="Cover while away" style={{ marginBottom:20 }} actions={
        teacherClasses.length
          ? <Btn variant={coveredClasses.length ? 'secondary' : 'primary'} small icon="teacher" onClick={() => setCoverOpen(true)}>{coveredClasses.length ? 'Edit cover' : 'Arrange cover'}</Btn>
          : null
      }>
        {teacherClasses.length === 0 ? (
          <EmptyState icon="calendar" title="No classes to cover" message="This teacher isn't assigned to any classes yet." />
        ) : coveredClasses.length ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:11, padding:'16px 24px' }}>
              <div style={{ width:38, height:38, borderRadius:9, background:DS.warningBg, color:DS.warning, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="teacher" size={18} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:DS.text }}>
                  {coverNames.length === 1
                    ? `${coverNames[0]} is covering ${teacher.name}`
                    : `${coverNames.length} teachers covering ${coveredClasses.length} of ${teacherClasses.length} classes`}
                </div>
                <div style={{ fontSize:12, color:DS.muted }}>{windowLabel}{coverReasons.length === 1 ? ` · ${coverReasons[0]}` : ''}</div>
              </div>
              <Badge variant={liveCover ? 'warning' : 'default'}>{liveCover ? 'Active now' : 'Scheduled'}</Badge>
            </div>
            {teacherClasses.map(c => {
              const ct = c.cover && store.teachers.find(t => t.id === c.cover.teacherId);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'11px 24px', borderTop:`1px solid ${DS.border}` }}>
                  <div style={{ fontSize:13, color:DS.text, minWidth:0 }}>{c.name} <span style={{ color:DS.muted }}>· {c.day} {c.time}</span></div>
                  {c.cover ? (
                    <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
                      <Avatar name={c.cover.teacher} size={20} color={ct && ct.color} />
                      <span style={{ fontSize:12.5, color:DS.sub }}>{c.cover.teacher}</span>
                      {coverActive(c) && <span style={{ fontSize:9, fontWeight:700, color:DS.warning, background:DS.warningBg, border:`1px solid ${DS.warningBorder}`, borderRadius:4, padding:'1px 4px', letterSpacing:0.3 }}>NOW</span>}
                    </div>
                  ) : <span style={{ fontSize:12, color:DS.faint, flexShrink:0 }}>No cover</span>}
                </div>
              );
            })}
            <div style={{ padding:'14px 24px', borderTop:`1px solid ${DS.border}` }}>
              <Btn variant="ghost" small icon="x" onClick={() => store.clearCoverForTeacher(teacher.name)}>Remove cover from all classes</Btn>
            </div>
          </div>
        ) : (
          <EmptyState icon="teacher" title="No cover arranged"
            message={`When ${teacher.name} is away, assign a stand-in per class — each of their ${teacherClasses.length} class${teacherClasses.length === 1 ? '' : 'es'} can have a different cover.`}
            action={<Btn variant="primary" small icon="teacher" onClick={() => setCoverOpen(true)}>Arrange cover</Btn>} />
        )}
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
          <Card title="Booked Holidays">
            <div style={{ padding:'8px 0' }}>
              {holidays.length ? holidays.map((h, i) => (
                <div key={h.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 24px', borderBottom: i < holidays.length-1 ? `1px solid ${DS.border}` : 'none' }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:DS.infoBg, color:DS.info, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="calendar" size={17} /></div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{h.reason || 'Holiday'}</div><div style={{ fontSize:12, color:DS.muted }}>{fmtDay(h.from)} → {fmtDay(h.to)}</div></div>
                  <button onClick={() => store.removeHoliday(teacher.id, h.id)} style={{ background:'none', border:'none', cursor:'pointer', color:DS.faint, padding:4 }}><Icon name="x" size={16} /></button>
                </div>
              )) : <EmptyState icon="calendar" title="No holidays booked" message="Add a holiday to record time off." />}
            </div>
          </Card>
          <Card title="Book Holiday">
            <div style={{ padding:'18px 20px' }}>
              <Field label="From"><Input type="date" value={holiday.from} onChange={e => setHoliday(h => ({ ...h, from: e.target.value }))} icon="calendar" /></Field>
              <Field label="To"><Input type="date" value={holiday.to} onChange={e => setHoliday(h => ({ ...h, to: e.target.value }))} icon="calendar" /></Field>
              <Field label="Reason"><Input value={holiday.reason} onChange={e => setHoliday(h => ({ ...h, reason: e.target.value }))} placeholder="e.g. Annual leave" /></Field>
              <Btn variant="primary" icon="plus" onClick={() => { if (holiday.from && holiday.to) { store.addHoliday(teacher.id, holiday); setHoliday({ from:'', to:'', reason:'' }); } }}>Add Holiday</Btn>
            </div>
          </Card>
        </div>

      <TeacherCoverModal open={coverOpen} onClose={() => setCoverOpen(false)} store={store} teacher={teacher} classes={teacherClasses}
        prefillWindow={coverWindow} prefillAssign={seedAssign} editing={coveredClasses.length > 0}
        onApply={map => store.setCoversForClasses(map)} onClear={() => store.clearCoverForTeacher(teacher.name)} />
    </div>
  );
};

// ─── Admin Teachers Page ────────────────────────────────────────────────────────
const STATUS_META = {
  active:  { label:'Active',  variant:'success' },
  invited: { label:'Invited', variant:'warning' },
  paused:  { label:'Paused',  variant:'default' },
};

const AdminTeachersPage = () => {
  const store = useAdminStore();
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('name');

  const teachers = store.teachers;
  // Σ of each teacher's roster sizes = ENROLMENTS, not distinct students (a student
  // taught by 3 teachers counts 3×). Labelled "enrolments" (§2) — the distinct
  // headcount lives on the Students page (centreMetrics.getActiveStudentCount).
  const totalEnrolments = teachers.reduce((s, t) => s + (t.students || 0), 0);
  const totalClasses  = teachers.reduce((s, t) => s + (t.classes || 0), 0);
  const activeT = teachers.filter(t => t.status === 'active');
  const avgAttendance = activeT.length ? Math.round(activeT.reduce((s, t) => s + (t.attendance || 0), 0) / activeT.length) : 0;
  // Sick days = absences recorded across all teachers this term.
  const sickDays = Object.values(store.attendance).filter(v => v === 'absent').length;

  const filtered = teachers
    .filter(t => {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || teacherSubjects(t).join(' ').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q);
    })
    .sort((a, b) => sort === 'attendance' ? (b.attendance || 0) - (a.attendance || 0) : a.name.localeCompare(b.name));

  // Today's attendance for the inline register column.
  const today = todayISO();
  const setToday = (id, val) => store.setAttendance(id, today, val);

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader
        title="Teachers"
        subtitle={`${activeT.length} active teachers · ${totalEnrolments} enrolments across ${totalClasses} classes`}
        actions={[<Btn key="add" variant="primary" icon="plus" small onClick={() => adminNav('teachers_add')}>Add Teacher</Btn>]}
      />

      {/* Summary KPIs */}
      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        <KPICard label="Teachers"       value={activeT.length}      sub="active staff" icon="users" iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="Avg Attendance" value={avgAttendance + '%'} sub="this term"    icon="check" iconBg={DS.successBg} accent={DS.success} />
        <KPICard label="Sick Days (term)" value={sickDays}          sub="recorded absences" icon="alert" iconBg={DS.dangerBg} accent={DS.danger} />
        <KPICard label="Enrolments"     value={totalEnrolments}      sub="across all classes" icon="graduation" iconBg={DS.infoBg} accent={DS.info} />
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teachers or subjects…" />
        <Segmented value={sort} onChange={setSort} options={[{ id:'name', label:'Name' }, { id:'attendance', label:'Attendance' }]} />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="users" title="No teachers found" message={search ? `No teachers match “${search}”.` : 'Add your first teacher to get started.'} action={!search && <Btn variant="primary" icon="plus" onClick={() => adminNav('teachers_add')}>Add Teacher</Btn>} />
        ) : (
          <Table
            cols={['Teacher','Subjects','Students','Classes',{ label:'Attendance', align:'left' },"Today's register",{ label:'', align:'right' }]}
            rows={filtered.map(t => {
              const subs = teacherSubjects(t);
              const todayVal = store.attendance[`${t.id}|${today}`] || null;
              return [
                <div style={{ cursor:'pointer' }} onClick={() => adminNav('teacher_profile', t.id)}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:DS.text }}>{t.name}</div>
                  <div style={{ fontSize:11.5, color:DS.faint, display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Icon name="mail" size={11} />{t.email}</div>
                </div>,
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {subs.slice(0,2).map(s => <span key={s} style={{ fontSize:11, padding:'2px 8px', background:DS.surface, border:`1px solid ${DS.border}`, borderRadius:14, color:DS.sub }}>{s}</span>)}
                  {subs.length > 2 && <span style={{ fontSize:11, color:DS.faint }}>+{subs.length-2}</span>}
                </div>,
                <span style={{ fontSize:14, fontWeight:700, color:DS.text }}>{t.students || 0}</span>,
                <span style={{ fontSize:14, fontWeight:700, color:DS.text }}>{t.classes || 0}</span>,
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:60, height:6, background:DS.surface, borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${t.attendance || 0}%`, height:'100%', background: (t.attendance||0) >= 95 ? DS.success : DS.warning }} />
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:600, color:DS.sub }}>{t.attendance || 0}%</span>
                </div>,
                <AttendanceToggle value={todayVal} onSet={val => setToday(t.id, val)} />,
                <Btn variant="ghost" small onClick={() => adminNav('teacher_profile', t.id)}>View →</Btn>,
              ];
            })}
          />
        )}
      </Card>
    </div>
  );
};

// ─── Admin Invoices Page ────────────────────────────────────────────────────────
// The full Invoices module (ledger + workflow: derived status, payment schedules,
// detail drawer, reminders, CSV reconciliation, analytics) lives in its own file,
// Invoices.jsx, which defines `AdminInvoicesPage` and is loaded after this file in
// index.html. The router below renders it for the `invoices` route.

// ─── Admin Schedule Page ────────────────────────────────────────────────────────
// Parse the start time out of a class's `time` field ("09:00–10:30" → "09:00").
const startTimeOf = time => (time || '').split(/[–-]/)[0].trim();
const timeMins = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };

// Centre-wide weekly timetable, derived entirely from the classes the admin has
// created and assigned a teacher to (store.classes is the single source of truth).
// Same data the teacher sees on their Timetable page — this is the whole-centre view.
const AdminSchedulePage = () => {
  const store = useAdminStore();
  const [teacherFilter, setTeacherFilter] = React.useState('all');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const classes = store.classes.filter(c =>
    c.status !== 'paused' && (teacherFilter === 'all' || c.teacher === teacherFilter));

  // Rows = the actual distinct start times in use, so every class lands in an exact
  // cell (no snapping). Derived from the visible classes and sorted chronologically.
  const slots = [...new Set(classes.map(c => startTimeOf(c.time)).filter(Boolean))]
    .sort((a, b) => timeMins(a) - timeMins(b));

  // grid cells keyed `${day}|${start}` → array of classes (a slot can hold more than one)
  const grid = {};
  classes.forEach(c => {
    const start = startTimeOf(c.time);
    if (!start || !days.includes(c.day)) return;
    (grid[`${c.day}|${start}`] = grid[`${c.day}|${start}`] || []).push(c);
  });

  // distinct teachers who actually have classes, for the filter
  const teachers = [...new Set(store.classes.map(c => c.teacher).filter(Boolean))].sort();

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Schedule" subtitle="Centre-wide weekly timetable — built from your classes" actions={[
        <Btn key="exp" variant="secondary" icon="download" small>Export</Btn>,
        <Btn key="new" variant="primary"   icon="plus"     small onClick={() => adminNav('classes_add')}>Add Session</Btn>,
      ]} />

      {/* How the schedule is built */}
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'14px 16px', marginBottom:20, background:DS.accentLight, border:`1px solid ${DS.accentBorder}`, borderRadius:10 }}>
        <Icon name="calendar" size={18} color={DS.accent} />
        <div style={{ fontSize:13, color:DS.sub, lineHeight:1.5 }}>
          <strong style={{ color:DS.text }}>Admin creates each class and assigns a teacher, day, time and room.</strong> Those assigned
          classes <em>are</em> this timetable — there's nothing to schedule separately. Each teacher sees their own slice on their
          Timetable page and takes the register for every session here. Add or change a session by creating / editing the class.
        </div>
      </div>

      {/* Teacher filter */}
      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:DS.muted, marginRight:2 }}>Teacher:</span>
        {['all', ...teachers].map(t => (
          <button key={t} onClick={() => setTeacherFilter(t)} style={{
            padding:'6px 13px', borderRadius:18, cursor:'pointer', fontSize:12.5,
            border:`1px solid ${teacherFilter===t ? DS.accentBorder : DS.border}`,
            background: teacherFilter===t ? DS.accentLight : DS.bg,
            color: teacherFilter===t ? DS.accent : DS.muted,
            fontWeight: teacherFilter===t ? 600 : 400,
          }}>{t === 'all' ? 'All teachers' : t}</button>
        ))}
      </div>

      <Card>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'80px repeat(5,1fr)', borderBottom:`1px solid ${DS.border}`, background:DS.surface }}>
          <div style={{ padding:'12px 14px', fontSize:12, fontWeight:600, color:DS.muted }}>Time</div>
          {days.map(d => (
            <div key={d} style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:DS.text, borderLeft:`1px solid ${DS.border}` }}>{d}</div>
          ))}
        </div>

        {/* Time-slot rows */}
        {slots.length === 0 && (
          <div style={{ padding:'40px 0' }}>
            <EmptyState icon="calendar" title="No sessions to show" message={teacherFilter==='all' ? 'Create a class to start building the timetable.' : `${teacherFilter} has no active classes.`} />
          </div>
        )}
        {slots.map((time, ri) => (
          <div key={time} style={{
            display:'grid', gridTemplateColumns:'80px repeat(5,1fr)',
            borderBottom: ri < slots.length-1 ? `1px solid ${DS.border}` : 'none',
          }}>
            <div style={{ padding:'10px 14px', fontSize:12, color:DS.muted, fontVariantNumeric:'tabular-nums' }}>{time}</div>
            {days.map(day => {
              const cells = grid[`${day}|${time}`] || [];
              return (
                <div key={day} style={{ padding:6, borderLeft:`1px solid ${DS.border}`, display:'flex', flexDirection:'column', gap:4 }}>
                  {/* Compact cards: a coloured left bar + name on top, teacher / room / group on one
                      meta line. Kept thin on purpose so many concurrent classes can stack in one slot. */}
                  {cells.map(c => {
                    const color = subjectColor(c.name);
                    // Show whoever actually teaches today — the cover if its window is live.
                    const cv = coverActive(c);
                    const shownTeacher = cv ? cv.teacher : c.teacher;
                    const teacher = store.teachers.find(t => t.name === shownTeacher);
                    return (
                      <button key={c.id} onClick={() => adminNav('class_detail', c.id)} title={`${c.name} · ${c.group} · ${shownTeacher}${cv ? ` (covering ${c.teacher})` : ''} · ${c.room || 'No room'}`} style={{
                        textAlign:'left', background:color+'12', border:`1px solid ${color}44`,
                        borderLeft:`3px solid ${color}`, borderRadius:6,
                        padding:'5px 8px', cursor:'pointer', width:'100%',
                        display:'flex', flexDirection:'column', gap:2, minWidth:0,
                      }}>
                        <div style={{ fontSize:11.5, fontWeight:600, color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {c.name.replace(/^(GCSE|A-Level)\s/, '')}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5, color:DS.muted, whiteSpace:'nowrap', overflow:'hidden' }}>
                          <Avatar name={shownTeacher} size={13} color={teacher && teacher.color} />
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{shownTeacher}</span>
                          {cv && <span style={{ flexShrink:0, fontSize:9, fontWeight:700, color:DS.warning, background:DS.warningBg, border:`1px solid ${DS.warningBorder}`, borderRadius:4, padding:'0 4px', letterSpacing:0.3 }}>COVER</span>}
                          <span style={{ color:DS.faint }}>·</span>
                          <span style={{ color:DS.faint, flexShrink:0 }}>{c.group.replace(/\s*–.*$/, '')}</span>
                          {c.room && <><span style={{ color:DS.faint }}>·</span><span style={{ color:DS.faint, flexShrink:0 }}>{c.room}</span></>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      <div style={{ fontSize:12, color:DS.faint, marginTop:12 }}>
        Showing {classes.length} session{classes.length===1?'':'s'}{teacherFilter!=='all' ? ` for ${teacherFilter}` : ' across all teachers'} · paused classes hidden.
      </div>
    </div>
  );
};

// ─── Router ─────────────────────────────────────────────────────────────────────
const AdminPages = ({ page, section }) => {
  if (page === 'students')        return <AdminStudentsPage />;
  if (page === 'students_add')    return <EnrolStudentPage />;
  if (page === 'student_profile') return <StudentProfilePage />;
  if (page === 'reports')         return <AdminReportsPage />;
  if (page === 'classes')         return <AdminClassesPage section={section} />;
  if (page === 'classes_add')     return <AddClassPage />;
  if (page === 'class_detail')    return <ClassDetailPage />;
  if (page === 'subject_detail')  return <SubjectDetailPage />;
  if (page === 'teachers')        return <AdminTeachersPage />;
  // Staff › Roles & access (Team.jsx, loaded after this file; exposes AdminTeamPage on window).
  if (page === 'team')            return window.AdminTeamPage ? <window.AdminTeamPage /> : null;
  if (page === 'teachers_add')    return <AddTeacherPage />;
  if (page === 'teacher_profile') return <TeacherProfilePage />;
  if (page === 'invoices')        return <AdminInvoicesPage />;
  if (page === 'schedule')        return <AdminSchedulePage />;
  // Staff › Timesheets (Timesheets.jsx, loaded after this file; exposes AdminTimesheetsPage on window).
  if (page === 'timesheets')      return window.AdminTimesheetsPage ? <window.AdminTimesheetsPage section={section} /> : null;
  // Per-teacher drill-in from the timesheets overview (teacher id stashed on adminParam).
  if (page === 'timesheet_detail') return window.AdminTimesheetDetailPage ? <window.AdminTimesheetDetailPage /> : null;
  return null;
};

Object.assign(window, { AdminPages });
