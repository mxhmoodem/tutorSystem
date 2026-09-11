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

  return (
    <div style={pageFrame()}>
      <PageHeader title="Attendance"
        subtitle="Every register across the centre — spot missing registers and reopen them for your teachers"
        actions={[<Btn key="exp" variant="secondary" icon="download" small>Export</Btn>]} />

      {DevNudge && <DevNudge onChange={rerender} />}

      {/* The two columns below already carry the counts (a day's sessions on the left,
          the outstanding queue on the right), so this strip is deliberately short:
          only the two figures neither column states — how much of today is done, and
          what the centre's actual attendance rate is. */}
      <StatBand variant="plain" stats={[
        { label: 'Registers done today', value: todayCountable.length ? `${doneToday}/${todayCountable.length}` : '—',
          sub: todayCountable.length ? `${Math.round((doneToday / todayCountable.length) * 100)}% of today’s sessions` : 'no sessions today',
          tone: todayCountable.length && doneToday < todayCountable.length ? DS.warning : DS.success },
        { label: 'Centre attendance', value: centreRate.pct == null ? '—' : `${centreRate.pct}%`,
          sub: `${centreRate.deliveredSessions} delivered sessions`,
          hint: 'Present + late as a share of all marks on delivered sessions' },
      ]} />

      {/* Two columns: what is happening (left) and what is outstanding (right). The
          left column is the browsable day view — the normal, calm state of the page.
          The right is the work queue, and it is the one that goes quiet when there's
          nothing to do. Splitting them stops a long backlog pushing the day view off
          the screen, which is what happened when they were stacked. */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap:20, alignItems:'start' }}>

        <Card title={selectedDate === todayIso ? 'Today' : attFmtDay ? attFmtDay(selectedDate) : selectedDate}
          actions={
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} style={{ width:150, fontSize:12 }}>
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

        <div style={{ border:`1px solid ${needs.length ? DS.warningBorder : DS.cardBorder}`, borderRadius:12, overflow:'hidden', background:DS.bg, boxShadow:DS.cardShadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 18px', background: needs.length ? DS.warningBg : DS.surface, borderBottom:`1px solid ${needs.length ? DS.warningBorder : DS.border}` }}>
            <Icon name={needs.length ? 'clock' : 'check'} size={17} color={needs.length ? DS.warning : DS.success} />
            <span style={{ fontSize:14, fontWeight:700, color: needs.length ? DS.warning : DS.success, flex:1 }}>Needs a register</span>
            {needs.length > 0 && (
              <span style={{ fontSize:12, fontWeight:700, color:DS.warning, background:DS.bg, border:`1px solid ${DS.warningBorder}`, borderRadius:20, padding:'2px 9px' }}>{needs.length}</span>
            )}
          </div>
          <div style={{ padding:'9px 18px 0', fontSize:12, color: needs.length ? DS.warning : DS.muted, lineHeight:1.5 }}>
            {needs.length
              ? `${lapsedCount} past the late window · ${needs.length - lapsedCount} still takeable. Unlock a session to let its teacher take it late.`
              : 'Nothing outstanding across the centre.'}
          </div>
          {needs.length > 0 && (
            <div style={{ marginTop:9, maxHeight:640, overflowY:'auto' }}>
              {needs.map(s => (
                <SessionRow key={s.id} session={s} roster={rosterOf(s)} att={att} isAdmin={true} showDate
                  onOpen={openPanel} onReinstate={reinstate} onGrant={grantUnlock} onRevoke={revokeUnlock} />
              ))}
            </div>
          )}
          {needs.length === 0 && <div style={{ padding:'18px' }} />}
        </div>
      </div>

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
