// ══════════════════════════════════════════════════════════════════════════════
//  Centre-wide Admin Attendance  (route: admin/`attendance`)
//  Loaded AFTER TeacherPages.jsx so it can reuse the shared register drawer, session
//  row and unlock chooser (window.AttRegisterDrawer / AttSessionRow / AttUnlockChooser).
//
//  This is the admin's view of EVERY teacher's register across the centre — the
//  oversight surface a missing register (a safeguarding gap) needs. It is a read-view
//  over the same materialised sessions the teacher screen uses (derive-don't-store):
//  it just materialises ALL centre classes, not one teacher's. Admins can grant a
//  time-boxed unlock on a lapsed/locked register (att.grant_unlock) — reopening it for
//  the teacher for a chosen period, after which it auto-re-locks.
// ══════════════════════════════════════════════════════════════════════════════
const AdminAttendancePage = () => {
  const store = window.useAdminStore ? window.useAdminStore() : (typeof useAdminStore === 'function' ? useAdminStore() : null);
  const att = window.useAttendanceStore();
  const ts = window.useTimesheetStore ? window.useTimesheetStore() : null;
  const settings = window.REGISTER_SETTINGS;
  const [, force] = React.useState(0);
  const rerender = () => force(x => x + 1);
  const now = window.getNow();

  const SessionRow = window.AttSessionRow;
  const RegisterDrawer = window.AttRegisterDrawer;
  const DevNudge = window.AttDevNudge;
  const attFmtDay = window.attFmtDay;

  const allClasses = (store.classes || []).filter(c => c.status !== 'paused');
  const teachers = Array.from(new Set(allClasses.map(c => c.teacher))).filter(Boolean).sort();
  const activeTeachers = store.teachers.filter(t => t.status === 'active');

  // Materialise every centre session across a compact window (past 9d → next 2d).
  const sessions = window.materialiseSessions(allClasses, settings, now, att, { backDays: 9, fwdDays: 2 });
  const rosterOf = React.useCallback((s) => window.attRosterFor(s.classId, s.group, store), [store]);

  const todayIso = window.attIso(new Date(now));
  const [selectedDate, setSelectedDate] = React.useState(todayIso);
  const [teacherFilter, setTeacherFilter] = React.useState('all');
  const [panelSession, setPanelSession] = React.useState(null);

  // ── derived rollups (nothing hardcoded) ──
  const todays = sessions.filter(s => s.dateISO === todayIso);
  const todayCountable = todays.filter(s => s.derived.state !== 'cancelled');
  const doneToday = todayCountable.filter(s => s.derived.state === 'recorded').length;
  const needs = sessions.filter(s => s.derived.state === 'awaiting' || s.derived.state === 'lapsed')
    .sort((a, b) => a.starts_at - b.starts_at);
  const lapsedCount = needs.filter(s => s.derived.state === 'lapsed').length;
  const centreRate = window.attendanceRate(sessions, rosterOf, att);

  // ── browse list (teacher × day) ──
  const browse = sessions
    .filter(s => s.dateISO === selectedDate)
    .filter(s => teacherFilter === 'all' || s.teacher === teacherFilter)
    .sort((a, b) => a.starts_at - b.starts_at);

  const openPanel = (s) => setPanelSession(s);
  const grantUnlock = (s, spec) => { att.grant_unlock(s.id, spec, { by: 'admin' }); rerender(); };
  const revokeUnlock = (s) => { att.revoke_unlock(s.id, { by: 'admin' }); rerender(); };
  const reinstate = (s) => { att.setCancelled(s.id, false); rerender(); };
  const shiftDate = (delta) => { const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() + delta); setSelectedDate(window.attIso(d)); };

  // The adult whose timesheet an admin-taken register logs to = the rostered teacher.
  const panelTeacher = panelSession ? (store.teachers.find(t => t.name === panelSession.teacher) || store.teachers[0]) : null;

  const kpi = (label, value, sub, tone) => (
    <div style={{ background:DS.bg, border:`1px solid ${DS.cardBorder}`, borderRadius:12, padding:'16px 18px', boxShadow:DS.cardShadow }}>
      <div style={{ fontSize:11, fontWeight:600, color:DS.faint, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color: tone || DS.text, letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:DS.muted, marginTop:5 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ padding:'32px' }}>
      <PageHeader title="Attendance"
        subtitle="Every register across the centre — spot missing registers and reopen them for your teachers"
        actions={[<Btn key="exp" variant="secondary" icon="download" small>Export</Btn>]} />

      {DevNudge && <DevNudge onChange={rerender} />}

      {/* KPI row — all derived */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:22 }}>
        {kpi('Sessions today', String(todayCountable.length), `${doneToday} register${doneToday === 1 ? '' : 's'} done`, DS.text)}
        {kpi('Registers done', todayCountable.length ? `${Math.round((doneToday / todayCountable.length) * 100)}%` : '—', 'of today’s sessions', DS.success)}
        {kpi('Needs a register', String(needs.length), `${lapsedCount} lapsed · ${needs.length - lapsedCount} late-window`, needs.length ? DS.warning : DS.success)}
        {kpi('Centre attendance', centreRate.pct == null ? '—' : `${centreRate.pct}%`, `${centreRate.deliveredSessions} delivered sessions`, DS.text)}
      </div>

      {/* Needs a register — centre-wide, oldest first, admins can unlock */}
      <div style={{ marginBottom:22, border:`1px solid ${needs.length ? DS.warningBorder : DS.cardBorder}`, borderRadius:12, overflow:'hidden', background:DS.bg, boxShadow:DS.cardShadow }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background: needs.length ? DS.warningBg : DS.surface, borderBottom:`1px solid ${needs.length ? DS.warningBorder : DS.border}` }}>
          <Icon name={needs.length ? 'clock' : 'check'} size={17} color={needs.length ? DS.warning : DS.success} />
          <span style={{ fontSize:14, fontWeight:700, color: needs.length ? DS.warning : DS.success }}>Needs a register</span>
          <span style={{ fontSize:12, color: needs.length ? DS.warning : DS.muted }}>
            {needs.length ? `${needs.length} across the centre — unlock a session to let its teacher take it late.` : 'Nothing outstanding across the centre.'}
          </span>
        </div>
        {needs.length > 0 && (
          <div>
            {needs.map(s => (
              <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={true} showDate
                onOpen={openPanel} onReinstate={reinstate} onGrant={grantUnlock} onRevoke={revokeUnlock} />
            ))}
          </div>
        )}
      </div>

      {/* Browse — all sessions for a chosen teacher + day */}
      <Card title="All sessions"
        actions={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} style={{ width:170, fontSize:12 }}>
              <option value="all">All teachers</option>
              {teachers.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <button onClick={() => shiftDate(-1)} title="Previous day" style={{ display:'inline-flex', padding:6, borderRadius:6, border:`1px solid ${DS.border}`, background:DS.bg, cursor:'pointer' }}><Icon name="chevron_l" size={15} color={DS.muted} /></button>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding:'5px 9px', borderRadius:6, border:`1px solid ${DS.border}`, fontSize:12.5, outline:'none', color:DS.text }} />
            <button onClick={() => shiftDate(1)} title="Next day" style={{ display:'inline-flex', padding:6, borderRadius:6, border:`1px solid ${DS.border}`, background:DS.bg, cursor:'pointer' }}><Icon name="chevron_r" size={15} color={DS.muted} /></button>
            {selectedDate !== todayIso && <button onClick={() => setSelectedDate(todayIso)} style={{ padding:'6px 10px', borderRadius:6, border:`1px solid ${DS.accentBorder}`, background:DS.accentLight, color:DS.accent, fontSize:12, fontWeight:600, cursor:'pointer' }}>Today</button>}
          </div>
        }>
        {browse.length === 0 ? (
          <div style={{ padding:'10px 4px' }}>
            <EmptyState icon="calendar" title="No sessions" message="No sessions match this teacher and day." />
          </div>
        ) : (
          <div>
            {browse.map(s => (
              <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={true} showDate={false}
                onOpen={openPanel} onReinstate={reinstate} onGrant={grantUnlock} onRevoke={revokeUnlock} />
            ))}
          </div>
        )}
      </Card>

      {panelSession && RegisterDrawer && (
        <RegisterDrawer key={panelSession.id} session={panelSession} roster={rosterOf(panelSession)}
          att={att} ts={ts} teachers={activeTeachers} me={panelTeacher} settings={settings} now={now}
          isAdmin={true}
          onClose={() => { setPanelSession(null); rerender(); }}
          onChanged={rerender} />
      )}
    </div>
  );
};

Object.assign(window, { AdminAttendancePage });
