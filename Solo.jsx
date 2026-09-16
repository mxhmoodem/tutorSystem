// ══════════════════════════════════════════════════════════════════════════════
//  Solo tutor demo — shell, nav registration and pages
// ──────────────────────────────────────────────────────────────────────────────
//  A second demo ACCOUNT (not a role): Sarah Whitfield, a private tutor on one of
//  three solo plans. index.html swaps this shell in when the account switcher
//  picks her; the centre demo underneath is left exactly as it was.
//
//  Composes the existing primitives only (Sidebar, Card, StatBand, HoverRow,
//  StatusPill, Table, SlideOver, Modal, Segmented, TabNav, EmptyState, BarChart,
//  heroSurface) with DS tokens. Every feature decision reads a capability key from
//  soloCapabilities.jsx; every number comes from soloModel() (soloData.jsx).
//
//  Messaging, announcements, staff, invitations, roles, rooms and centre
//  switching do not exist here — there are no routes, nav items or cards for them.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const fmt = window.soloFmt;
const money = fmt.money;
const MB = 1024 * 1024, GB = 1024 * MB;

const SOLO_ACCOUNT = { id: 'solo', name: 'Sarah Whitfield', label: 'Private tutor' };

// ── Nav (registered into the shared NAV_CONFIG; items follow capabilities) ────
const soloNavItems = (caps) => [
  { id: 'dashboard',      icon: 'dashboard',    label: 'Dashboard' },
  { id: 'students',       icon: 'graduation',   label: 'Students',       section: 'People' },
  { id: 'safeguarding',   icon: 'shield',       label: 'Safeguarding',   section: 'People' },
  { id: 'timetable',      icon: 'calendar',     label: 'Timetable',      section: 'Teaching' },
  { id: 'lessons',        icon: 'presentation', label: 'Lessons',        section: 'Teaching' },
  { id: 'attendance',     icon: 'check',        label: 'Attendance',     section: 'Teaching' },
  caps.lessonPlanner    && { id: 'lesson_planner', icon: 'edit',     label: 'Lesson planner', section: 'Teaching' },
  caps.tracking         && { id: 'tracking',   icon: 'star',         label: 'Tracking',       section: 'Teaching' },
  caps.homework         && { id: 'homework',   icon: 'notebook_pen', label: 'Homework',       section: 'Teaching' },
  caps.reports          && { id: 'reports',    icon: 'file',         label: 'Reports',        section: 'Teaching' },
  caps.analyticsExports && { id: 'progress',   icon: 'chart',        label: 'Progress',       section: 'Teaching' },
  { id: 'invoices',       icon: 'invoice',      label: 'Invoices',       section: 'Money' },
  { id: 'earnings',       icon: 'trending_up',  label: 'Earnings',       section: 'Money' },
  caps.analyticsExports && { id: 'exports',    icon: 'download',     label: 'Exports',        section: 'Money' },
  { id: 'resources',      icon: 'folder',       label: 'Resources',      section: 'Account' },
  { id: 'billing',        icon: 'grid',         label: 'Plan & billing', section: 'Account' },
].filter(Boolean);

window.NAV_CONFIG.solo = {
  label: SOLO_ACCOUNT.label,
  get color() { return DS.accent; },
  get items() { return soloNavItems(window.soloModel().caps); },
  bottom: [],
};

// Page ids the shared Sidebar may send that live elsewhere here.
const SOLO_PAGE_ALIASES = { storage: 'billing' };

// ── Small compositions over the shared primitives ────────────────────────────
const toneOf = (lesson) => (lesson.kind === 'group' ? DS.info : DS.accent);
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
const fmtBytes = (b) => (b >= GB ? `${+(b / GB).toFixed(1)} GB` : `${Math.round(b / MB)} MB`);

const Stack = ({ gap = 18, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0, ...style }}>{children}</div>
);
// Two columns that stack on a narrow screen. `weights` = [main, side].
const Cols = ({ weights = [1.5, 1], children, style }) => {
  const kids = React.Children.toArray(children);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start', ...style }}>
      {kids.map((k, i) => (
        <div key={i} style={{ flex: `${weights[i] || 1} 1 ${i === 0 ? 420 : 300}px`, minWidth: 0 }}>{k}</div>
      ))}
    </div>
  );
};

const Banner = ({ tone, children, action, onAction, style }) => {
  const calm = tone === 'calm';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 10,
      background: calm ? DS.accentLight : DS.warningBg, border: `1px solid ${calm ? DS.accentBorder : DS.warningBorder}`,
      fontSize: 13.5, color: DS.sub, ...style,
    }}>
      <Icon name={calm ? 'check' : 'alert'} size={16} color={calm ? DS.accent : DS.warning} />
      <span style={{ flex: '1 1 240px', minWidth: 0 }}>{children}</span>
      {action && <Btn small variant="secondary" onClick={onAction}>{action}</Btn>}
    </div>
  );
};

const Meter = ({ pct, tone }) => (
  <div style={{ height: 6, borderRadius: 3, background: DS.surfaceHover, overflow: 'hidden', marginTop: 8 }}>
    <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 3, background: tone || DS.accent }} />
  </div>
);

const KV = ({ k, children, last }) => (
  <div style={{ display: 'flex', gap: 14, padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${DS.border}`, fontSize: 13.5 }}>
    <span style={{ width: 128, flexShrink: 0, color: DS.muted }}>{k}</span>
    <span style={{ color: DS.text, minWidth: 0 }}>{children}</span>
  </div>
);

const Muted = ({ children, style }) => <div style={{ fontSize: 13, color: DS.muted, lineHeight: 1.55, ...style }}>{children}</div>;
const Pad = ({ children, style }) => <div style={{ padding: '16px 20px', ...style }}>{children}</div>;
const LinkBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: DS.accent, fontSize: 13, fontWeight: 500 }}>{children}</button>
);
const Note = ({ title, children }) => (
  <div style={{ marginTop: 22, padding: '14px 18px', border: `1px dashed ${DS.borderDark}`, borderRadius: 10, fontSize: 13, color: DS.sub, background: DS.surface, lineHeight: 1.55 }}>
    <b style={{ color: DS.text, fontWeight: 600 }}>{title}</b> {children}
  </div>
);
const NameCell = ({ name, sub }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontWeight: 600, color: DS.text }}>{name}</div>
    {sub && <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{sub}</div>}
  </div>
);

// One lesson / register line: time column, tone bar, title + sub, trailing slot.
const SessionLine = ({ top, bottom, tone, title, sub, end, onClick, last }) => (
  <HoverRow onClick={onClick} last={last}>
    <div style={{ width: 54, flexShrink: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, fontVariantNumeric: 'tabular-nums' }}>{top}</div>
      <div style={{ fontSize: 11.5, color: DS.faint }}>{bottom}</div>
    </div>
    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: tone, flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 1 }}>{sub}</div>}
    </div>
    {end && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{end}</div>}
  </HoverRow>
);

const DAYS_PLURAL = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
const lessonWhen = (lesson) => {
  const days = lesson.slots.map(s => fmt.DAYS[s.day - 1]);
  const s0 = lesson.slots[0];
  const same = lesson.slots.every(s => s.start === s0.start);
  const dayText = days.length === 1 ? DAYS_PLURAL[s0.day - 1] : days.join(' & ');
  return same ? `${dayText} ${s0.start} · ${fmt.fmtMins(s0.mins)}` : lesson.slots.map(s => `${fmt.DAYS[s.day - 1]} ${s.start}`).join(', ');
};
const kindText = (lesson) => (lesson.kind === 'group' ? `Group of ${lesson.students.length}` : 'One-to-one');

// ── Flows (register · reopen · concern · payment) ────────────────────────────
const FlowCtx = React.createContext(null);
const useFlows = () => React.useContext(FlowCtx);

const MARK_OPTIONS = [{ id: 'present', label: 'Present' }, { id: 'late', label: 'Late' }, { id: 'absent', label: 'Absent' }];

const RegisterDrawer = ({ session, onClose }) => {
  const m = window.soloModel();
  const lesson = session.lesson;
  const existing = session.register;
  const [marks, setMarks] = React.useState(() => {
    const out = {};
    lesson.students.forEach(id => { out[id] = (existing && existing.marks[id]) || 'present'; });
    return out;
  });
  const [mins, setMins] = React.useState(existing ? existing.mins : session.mins);
  const anyone = Object.values(marks).some(v => v !== 'absent');
  const save = () => { window.soloActions.takeRegister(session.id, marks, anyone ? mins : 0); onClose(); };
  const one = lesson.kind === 'one';
  const minOptions = Array.from(new Set([30, 45, 60, 75, 90, 120, session.mins])).sort((a, b) => a - b);
  return (
    <SlideOver open onClose={onClose} icon="check"
      title={existing ? 'Amend register' : 'Take register'}
      subtitle={`${lesson.title} · ${fmt.fmtDay(session.iso)} ${fmt.fmtShort(session.iso)}, ${fmt.clock(session.start)} – ${fmt.clock(session.end)}`}
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn small onClick={save}>Save register</Btn></>}>
      {session.reopened && (
        <Banner tone="calm" style={{ marginBottom: 16 }}>Reopened — “{session.reopened.reason}”</Banner>
      )}
      {!one && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: DS.muted }}>{plural(lesson.students.length, 'student')} on this lesson</span>
          <Btn small variant="secondary" icon="check" onClick={() => {
            const all = {}; lesson.students.forEach(id => { all[id] = 'present'; }); setMarks(all);
          }}>Mark all present</Btn>
        </div>
      )}
      <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
        {lesson.students.map((id, i) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i === lesson.students.length - 1 ? 'none' : `1px solid ${DS.border}`, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{m.studentById[id].name}</div>
              <div style={{ fontSize: 12, color: DS.muted }}>{m.studentById[id].year}</div>
            </div>
            <Segmented options={MARK_OPTIONS} value={marks[id]} onChange={(v) => setMarks({ ...marks, [id]: v })} />
          </div>
        ))}
      </div>
      <Field label="Time delivered" hint={anyone ? 'Counts towards your hours and earnings.' : 'Nobody attended, so no time is counted.'}>
        <Select value={anyone ? mins : 0} disabled={!anyone} onChange={(e) => setMins(Number(e.target.value))}>
          {!anyone && <option value={0}>None</option>}
          {minOptions.map(v => <option key={v} value={v}>{fmt.fmtMins(v)}</option>)}
        </Select>
      </Field>
    </SlideOver>
  );
};

const ReopenModal = ({ session, onClose, onReopened }) => {
  const [reason, setReason] = React.useState('');
  const ok = reason.trim().length >= 5;
  const go = () => { if (!ok) return; window.soloActions.reopen(session.id, reason.trim()); onReopened(); };
  return (
    <Modal open onClose={onClose} icon="lock" iconColor={DS.warning} title="Reopen this register"
      subtitle={`${session.lesson.title} · ${fmt.fmtDay(session.iso)} ${fmt.fmtShort(session.iso)}. It locked ${plural(session.daysAgo, 'day')} after the lesson.`}
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn small onClick={go} disabled={!ok}>Reopen and take register</Btn></>}>
      <Field label="Why are you reopening it?" required hint="Kept with the register, so the record shows why it was taken late.">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lesson happened — I was ill and didn't log it" />
      </Field>
    </Modal>
  );
};

const ConcernModal = ({ studentId, onClose }) => {
  const m = window.soloModel();
  const [sid, setSid] = React.useState(studentId || '');
  const [what, setWhat] = React.useState('');
  const [action, setAction] = React.useState('');
  const ok = what.trim().length > 0;
  const save = () => { if (!ok) return; window.soloActions.logConcern({ studentId: sid || null, what: what.trim(), action: action.trim() }); onClose(); };
  return (
    <Modal open onClose={onClose} icon="shield" title="Log a concern"
      subtitle={`Dated ${fmt.fmtLong(m.today)}, ${fmt.clock(m.now)}. Only you can see it.`}
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn small onClick={save} disabled={!ok}>Save to the log</Btn></>}>
      <Field label="Student">
        <Select value={sid} onChange={(e) => setSid(e.target.value)}>
          <option value="">Not about one student</option>
          {m.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="What you saw or heard" required hint="Their words where you can, and what you noticed.">
        <Textarea value={what} onChange={(e) => setWhat(e.target.value)} />
      </Field>
      <Field label="What you did next">
        <Textarea value={action} onChange={(e) => setAction(e.target.value)} style={{ minHeight: 60 }} />
      </Field>
    </Modal>
  );
};

const PaymentModal = ({ invoiceId, onClose }) => {
  const m = window.soloModel();
  const [id, setId] = React.useState(invoiceId || (m.unpaid[0] && m.unpaid[0].id) || '');
  const [method, setMethod] = React.useState('Bank transfer');
  const inv = m.invoices.find(i => i.id === id);
  const save = () => { if (!inv) return; window.soloActions.recordPayment(inv.id, method); onClose(); };
  return (
    <Modal open onClose={onClose} icon="invoice" title="Record a payment"
      subtitle="Mark an invoice paid when the money lands."
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn small onClick={save} disabled={!inv}>Record payment</Btn></>}>
      {m.unpaid.length === 0 ? (
        <Muted>Every invoice you've sent is paid.</Muted>
      ) : (
        <>
          <Field label="Invoice">
            <Select value={id} onChange={(e) => setId(e.target.value)}>
              {m.unpaid.map(i => <option key={i.id} value={i.id}>{i.id} · {i.familyName} · {money(i.amount)}</option>)}
            </Select>
          </Field>
          <Field label="Paid by">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {['Bank transfer', 'Card', 'Cash'].map(x => <option key={x}>{x}</option>)}
            </Select>
          </Field>
        </>
      )}
    </Modal>
  );
};

// Trailing slot for a session line: pill + the action that fits its state.
const SessionEnd = ({ s, compact }) => {
  const flows = useFlows();
  const out = [];
  if (s.lesson.kind === 'group' && !compact) out.push(<StatusPill key="g" tone="info">Group</StatusPill>);
  if (s.status === 'taken') {
    out.push(<StatusPill key="t" tone="neutral">Register taken</StatusPill>);
  } else if (s.status === 'live') {
    out.push(<StatusPill key="l" tone="positive" dot>Now</StatusPill>);
    out.push(<Btn key="b" small onClick={() => flows.register(s)}>Take register</Btn>);
  } else if (s.status === 'upcoming') {
    out.push(<span key="u" style={{ fontSize: 12.5, color: DS.muted }}>Opens {s.opensAt}</span>);
  } else if (s.status === 'open') {
    out.push(s.reopened
      ? <StatusPill key="r" tone="accent">Reopened</StatusPill>
      : <StatusPill key="o" tone="warning">Late — {s.hoursLeft}h left</StatusPill>);
    out.push(<Btn key="b" small variant={compact ? 'secondary' : 'primary'} onClick={() => flows.register(s)}>{compact ? 'Take' : 'Take register'}</Btn>);
  } else {
    out.push(<StatusPill key="k" tone="negative">Locked — {plural(s.daysAgo, 'day')}</StatusPill>);
    out.push(<Btn key="b" small variant="secondary" onClick={() => flows.reopen(s)}>{compact ? 'Reopen' : 'Reopen with a reason'}</Btn>);
  }
  return <>{out}</>;
};

const registerSummary = (s) => {
  const vals = Object.values(s.register.marks);
  const present = vals.filter(v => v !== 'absent').length;
  if (s.lesson.kind === 'one') return vals[0] === 'absent' ? 'Absent' : `${vals[0] === 'late' ? 'Late' : 'Present'} · ${fmt.fmtMins(s.register.mins)} delivered`;
  return `${present} of ${vals.length} present · ${fmt.fmtMins(s.register.mins)} delivered`;
};

// ══════════════════════════════════════════════════════════════════════════════
//  Pages
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Dashboard ─────────────────────────────────────────────────────────────
const SoloDashboard = () => {
  const m = window.soloModel();
  const flows = useFlows();
  const go = window.soloActions.nav;
  const caps = m.caps;
  const live = m.todaySessions.find(s => s.status === 'live');
  const hero = live || m.todaySessions.find(s => s.status === 'upcoming');
  const later = m.todaySessions.filter(s => s !== hero && s.start > m.now);
  const openOnes = m.needsRegister.filter(s => s.status === 'open');
  const unpaidTotal = m.unpaid.reduce((t, i) => t + i.amount, 0);
  const overdueTotal = m.overdue.reduce((t, i) => t + i.amount, 0);
  const atCap = m.students.length >= caps.maxStudents;
  const hour = m.now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const recentMarks = m.students
    .map(s => ({ s, mark: (m.tracking[s.id] || []).slice(-1)[0] }))
    .filter(x => x.mark).sort((a, b) => b.mark.date.localeCompare(a.mark.date)).slice(0, 3);
  const owed = m.unpaid.slice().sort((a, b) => b.daysLate - a.daysLate || a.due.localeCompare(b.due)).slice(0, 4);

  return (
    <div style={pageFrame()}>
      <section style={{ ...heroSurface(), marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: HERO_TXT.faint }}>
          {m.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: DS.bg, margin: '8px 0 0', letterSpacing: '-0.5px' }}>{greeting}, {m.tutor.first}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 22, borderTop: `1px solid ${HERO_TXT.hairline}`, paddingTop: 22 }}>
          <div style={{ flex: '1.6 1 320px', minWidth: 0 }}>
            {hero ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 20, background: HERO_TXT.hairline, color: DS.bg, letterSpacing: '0.03em' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? DS.success : HERO_TXT.soft }} />
                    {live ? 'LESSON NOW' : 'UP NEXT'}
                  </span>
                  <span style={{ fontSize: 12.5, color: HERO_TXT.faint, fontVariantNumeric: 'tabular-nums' }}>{fmt.clock(hero.start)} – {fmt.clock(hero.end)}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: DS.bg, letterSpacing: '-0.4px', marginTop: 14 }}>{hero.lesson.title} · {hero.lesson.subject}</div>
                <div style={{ fontSize: 13, color: HERO_TXT.soft, marginTop: 4 }}>
                  {kindText(hero.lesson)} · {caps.lessonPlanner && hero.lesson.topic ? hero.lesson.topic : hero.lesson.place}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  {live && <HeroSolidBtn icon="check" onClick={() => flows.register(live)}>Take register</HeroSolidBtn>}
                  {caps.lessonPlanner
                    ? <HeroGhostBtn icon="edit" onClick={() => go('lesson_planner')}>Open lesson plan</HeroGhostBtn>
                    : hero.lesson.kind === 'one' && <HeroGhostBtn icon="user" onClick={() => go('student_detail', hero.lesson.students[0])}>View student</HeroGhostBtn>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 600, color: DS.bg }}>No more lessons today</div>
            )}
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: HERO_TXT.faint, marginBottom: 10 }}>Later today</div>
            {later.length === 0 ? (
              <div style={{ fontSize: 12.5, color: HERO_TXT.faint }}>That's your day once this one's done.</div>
            ) : later.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8, borderRadius: 10, background: HERO_TXT.hairline }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: HERO_TXT.soft, width: 40, fontVariantNumeric: 'tabular-nums' }}>{fmt.clock(s.start)}</span>
                <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: toneOf(s.lesson) }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.bg }}>{s.lesson.title}</div>
                  <div style={{ fontSize: 11.5, color: HERO_TXT.faint }}>{s.lesson.subject} · {s.lesson.place.toLowerCase()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StatBand stats={[
        { label: 'Registers to take', value: m.registersToTake, onClick: () => go('attendance'),
          tone: openOnes.length ? DS.warning : undefined,
          sub: openOnes.length ? `${plural(openOnes.length, 'late one')} · ${openOnes[openOnes.length - 1].hoursLeft}h left` : 'All caught up' },
        { label: 'Unpaid', value: money(unpaidTotal), onClick: () => go('invoices'),
          sub: m.overdue.length ? `${money(overdueTotal)} overdue${caps.paymentReminders ? ' · reminders on' : ''}` : plural(m.unpaid.length, 'invoice') + ' out' },
        { label: `Earned in ${m.monthLabel}`, value: money(m.earnings.earned), onClick: () => go('earnings'),
          sub: `${+(m.earnings.minsTaught / 60).toFixed(1)} hours taught` },
        { label: 'Students', onClick: () => go('students'),
          value: <span>{m.students.length}<span style={{ fontSize: '0.55em', color: DS.faint, fontWeight: 600 }}> / {caps.maxStudents}</span></span>,
          tone: atCap ? DS.warning : undefined,
          sub: atCap ? "You're at your limit" : caps.waitingList ? `${m.waitingList.length} on the waiting list` : `${caps.maxStudents - m.students.length} places left` },
      ]} />

      {caps.paymentReminders && m.overdue.length > 0 && (
        <Banner style={{ marginTop: 18 }} action="Review before sending" onAction={() => go('invoices')}>
          {plural(m.overdue.length, 'payment reminder')} go out tonight for invoices past their due date.
        </Banner>
      )}

      <Cols style={{ marginTop: 18 }}>
        <Stack>
          <Card title="Today" actions={<LinkBtn onClick={() => go('timetable')}>Full timetable</LinkBtn>}>
            {m.todaySessions.length === 0
              ? <Pad><Muted>Nothing booked today — a good day to plan ahead.</Muted></Pad>
              : m.todaySessions.map((s, i) => (
                <SessionLine key={s.id} last={i === m.todaySessions.length - 1} top={fmt.clock(s.start)} bottom={fmt.clock(s.end)} tone={toneOf(s.lesson)}
                  title={s.lesson.title} sub={`${s.lesson.subject} · ${s.lesson.kind === 'group' ? plural(s.lesson.students.length, 'student') : s.lesson.place.toLowerCase()}`}
                  end={<SessionEnd s={s} />} />
              ))}
          </Card>

          <Card title="Needs a register" actions={m.needsRegister.length ? <StatusPill tone="warning">{m.needsRegister.length} to take</StatusPill> : null}>
            {m.needsRegister.length === 0
              ? <Pad><Muted>Every register is in. Your hours and earnings are complete.</Muted></Pad>
              : m.needsRegister.map((s, i) => (
                <SessionLine key={s.id} last={i === m.needsRegister.length - 1} top={fmt.fmtDay(s.iso)} bottom={fmt.fmtShort(s.iso)}
                  tone={s.status === 'locked' ? DS.borderDark : DS.warning}
                  title={s.lesson.title} sub={`${fmt.clock(s.start)} · ${s.lesson.subject}`} end={<SessionEnd s={s} compact />} />
              ))}
          </Card>

          {caps.atRiskFlags && (
            <Card title="Worth a look" actions={<LinkBtn onClick={() => go('progress')}>See all {m.watch.length}</LinkBtn>}>
              {m.watch.length === 0
                ? <Pad><Muted>Nobody's attendance, marks or homework is slipping.</Muted></Pad>
                : m.watch.slice(0, 3).map((w, i) => (
                  <HoverRow key={w.student.id + w.kind} last={i === Math.min(3, m.watch.length) - 1} onClick={() => go('student_detail', w.student.id)}>
                    <NameCell name={w.student.name} sub={w.sub} />
                    <div style={{ marginLeft: 'auto' }}><StatusPill tone={w.kind === 'attendance' ? 'negative' : 'warning'}>{w.label}</StatusPill></div>
                  </HoverRow>
                ))}
            </Card>
          )}
        </Stack>

        <Stack>
          <Card title="Money owed" actions={<LinkBtn onClick={() => go('invoices')}>Invoices</LinkBtn>}>
            {owed.length === 0
              ? <Pad><Muted>Nothing owed right now.</Muted></Pad>
              : owed.map((inv, i) => (
                <HoverRow key={inv.id} last={i === owed.length - 1} onClick={() => go('invoices')}>
                  <NameCell name={inv.familyName} sub={inv.status === 'overdue' ? `Due ${fmt.fmtShort(inv.due)} · ${plural(inv.daysLate, 'day')} late` : `Due ${fmt.fmtShort(inv.due)}`} />
                  <span style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: inv.status === 'overdue' ? DS.danger : DS.text }}>{money(inv.amount)}</span>
                </HoverRow>
              ))}
            <Pad style={{ borderTop: `1px solid ${DS.border}`, paddingTop: 12, paddingBottom: 14 }}>
              <Btn small variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => flows.payment()}>Record a payment</Btn>
            </Pad>
          </Card>

          {caps.tracking && (
            <Card title="Tracking" actions={<LinkBtn onClick={() => go('tracking')}>Open grid</LinkBtn>}>
              {recentMarks.map((x, i) => (
                <HoverRow key={x.s.id} last={i === recentMarks.length - 1} onClick={() => go('student_detail', x.s.id)}>
                  <NameCell name={x.s.name} sub={x.mark.title} />
                  <div style={{ marginLeft: 'auto' }}><StatusPill tone={x.mark.score / x.mark.out >= 0.7 ? 'positive' : 'warning'}>{x.mark.score}/{x.mark.out}</StatusPill></div>
                </HoverRow>
              ))}
            </Card>
          )}

          {caps.reportRules && (
            <Card title="Reports due" actions={m.reportsDue.length ? <StatusPill tone="warning">{m.reportsDue.length} this week</StatusPill> : null}>
              {m.reportsDue.length === 0
                ? <Pad><Muted>No reports due this week.</Muted></Pad>
                : m.reportsDue.map((r, i) => (
                  <HoverRow key={r.student} last={i === m.reportsDue.length - 1}>
                    <NameCell name={r.s.name} sub={`${r.rule} · ${r.draft ? 'draft saved' : `due ${fmt.fmtDay(r.due)}`}`} />
                    <div style={{ marginLeft: 'auto' }}><Btn small variant="secondary" onClick={() => go('reports')}>{r.draft ? 'Finish' : 'Write'}</Btn></div>
                  </HoverRow>
                ))}
            </Card>
          )}

          <Card title="Concern log" actions={<StatusPill tone="neutral">Private</StatusPill>}>
            <Pad>
              {m.concerns.length === 0
                ? <Muted style={{ marginBottom: 14 }}>If something worries you about a student, write it down here — dated, kept, and only visible to you.</Muted>
                : <Muted style={{ marginBottom: 14 }}>{plural(m.concerns.length, 'entry', 'entries')} logged. Latest {new Date(m.concerns[0].at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.</Muted>}
              <Btn small variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => flows.concern()}>Log a concern</Btn>
            </Pad>
          </Card>
        </Stack>
      </Cols>
    </div>
  );
};

// ── 2. Students ──────────────────────────────────────────────────────────────
const SoloStudents = () => {
  const m = window.soloModel();
  const caps = m.caps;
  const go = window.soloActions.nav;
  const [waiting, setWaiting] = React.useState(false);
  const closeWaiting = React.useCallback(() => setWaiting(false), []);
  const atCap = m.students.length >= caps.maxStudents;
  const next = window.soloNextTier(m.tier.id);
  const inGroups = m.students.filter(s => m.lessonsFor(s.id).some(l => l.kind === 'group')).length;
  const sub = [`${m.students.length} of ${caps.maxStudents} places used`];
  if (caps.groupLessons) sub.push(`${inGroups} in group lessons`);
  if (caps.waitingList) sub.push(`${m.waitingList.length} on the waiting list`);

  const rows = m.students.map(s => {
    const a = m.attendance[s.id];
    const flag = caps.atRiskFlags && a.rate != null && a.rate < 75;
    return {
      onClick: () => go('student_detail', s.id),
      cells: [
        <NameCell name={s.name} sub={`Guardian: ${s.guardian}`} />,
        s.year, s.subject,
        m.lessonsFor(s.id).map(l => l.slots.map(sl => `${fmt.DAYS[sl.day - 1]} ${sl.start}`).join(' & ') + (l.kind === 'group' ? ` · ${l.name}` : ` · ${l.place === 'Online' ? 'online' : 'one-to-one'}`)).join(', '),
        <span style={{ color: flag ? DS.danger : DS.text }}>{a.rate == null ? '—' : `${a.rate}%`}</span>,
        money(m.balances[s.id]),
        <Btn small variant="secondary" onClick={(e) => { e && e.stopPropagation && e.stopPropagation(); go('student_detail', s.id); }}>Open</Btn>,
      ],
    };
  });

  return (
    <div style={pageFrame()}>
      <PageHeader title="Students" subtitle={sub.join(' · ')} actions={<>
        {caps.waitingList && <Btn small variant="secondary" icon="clock" onClick={() => setWaiting(true)}>Waiting list</Btn>}
        {!atCap && <Btn small icon="plus">Add student</Btn>}
      </>} />

      {atCap && next && (
        <Banner style={{ marginBottom: 18 }} action="See plans" onAction={() => go('billing')}>
          You're using {caps.maxStudents} of {caps.maxStudents} places. {next.label} lifts this to {next.caps.maxStudents}{next.caps.groupLessons && !caps.groupLessons ? ' and adds group lessons' : ''}. Archiving a student also frees a place.
        </Banner>
      )}

      <Card>
        <Table cols={['Student', 'Year', 'Subject', 'Lessons', { label: 'Attendance', align: 'right' }, { label: 'Balance', align: 'right' }, '']} rows={rows} />
      </Card>

      {waiting && (
        <Modal open onClose={closeWaiting} icon="clock" title="Waiting list" subtitle="People who asked for a place, oldest first.">
          {m.waitingList.map((w, i) => (
            <KV key={w.name} k={fmt.fmtShort(w.added)} last={i === m.waitingList.length - 1}>
              <b style={{ fontWeight: 600 }}>{w.name}</b> · {w.year} {w.subject}<div style={{ fontSize: 12, color: DS.muted }}>{w.note}</div>
            </KV>
          ))}
        </Modal>
      )}
    </div>
  );
};

// ── 3. Student detail ────────────────────────────────────────────────────────
const phoneFor = (name) => { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) % 1000; return `07700 900${String(h).padStart(3, '0')}`; };
const emailFor = (name) => `${name.split(' ')[0].toLowerCase()}@example.com`;

const StudentInvoicesCard = ({ m, s, all }) => {
  const list = m.invoices.filter(i => i.students.includes(s.id));
  const shown = all ? list : list.slice(0, 3);
  return (
    <Card title="Invoices" actions={!all ? <LinkBtn onClick={() => window.soloActions.nav('invoices')}>All</LinkBtn> : null}>
      {shown.length === 0 ? <Pad><Muted>No invoices yet. {s.billing === 'termly' ? 'Billed by the term.' : ''}</Muted></Pad> : shown.map((inv, i) => (
        <HoverRow key={inv.id} last={i === shown.length - 1}>
          <NameCell name={`${inv.id} · ${inv.covers}`} sub={inv.status === 'paid' ? `Paid ${fmt.fmtShort(inv.paidOn)} · ${inv.method.toLowerCase()}` : `Issued ${fmt.fmtShort(inv.issued)} · due ${fmt.fmtShort(inv.due)}`} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {inv.status === 'paid' ? <StatusPill tone="neutral">Paid</StatusPill>
              : inv.status === 'overdue' ? <StatusPill tone="negative">{plural(inv.daysLate, 'day')} late</StatusPill>
              : inv.status === 'draft' ? <StatusPill tone="neutral">Draft</StatusPill> : null}
            <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(inv.amount)}</span>
          </div>
        </HoverRow>
      ))}
    </Card>
  );
};

const StudentTrackingCard = ({ m, s }) => {
  const marks = (m.tracking[s.id] || []).slice().reverse();
  return (
    <Card title="Tracking" actions={<LinkBtn onClick={() => window.soloActions.nav('tracking')}>Open grid</LinkBtn>}>
      {marks.map((x, i) => (
        <HoverRow key={x.title + x.date} last={i === marks.length - 1}>
          <NameCell name={x.title} sub={`Marked ${fmt.fmtShort(x.date)}`} />
          <div style={{ marginLeft: 'auto' }}><StatusPill tone={x.score / x.out >= 0.7 ? 'positive' : 'warning'}>{x.score}/{x.out}</StatusPill></div>
        </HoverRow>
      ))}
    </Card>
  );
};

const StudentReportsCard = ({ m, s }) => {
  const published = s.since <= m.reportsPublished.joinedBy;
  const due = m.reportsDue.filter(r => r.student === s.id);
  return (
    <Card title="Reports" actions={m.caps.reportRules ? <span style={{ fontSize: 12.5, color: DS.muted }}>Rule: {due[0] ? due[0].rule.toLowerCase() : 'half-termly'}</span> : null}>
      {!published && due.length === 0 && (
        <Pad><Muted>Write {s.first}'s first report whenever you're ready — it goes to {s.guardian.split(' ')[0]} as a PDF.</Muted></Pad>
      )}
      {published && (
        <HoverRow last={due.length === 0}>
          <NameCell name={m.reportsPublished.title} sub={`Published ${fmt.fmtShort(m.reportsPublished.date)} · emailed to ${s.guardian.split(' ')[0]}`} />
          <div style={{ marginLeft: 'auto' }}><Btn small variant="secondary">View</Btn></div>
        </HoverRow>
      )}
      {m.caps.reportRules && due.map((r, i) => (
        <HoverRow key={r.title} last={i === due.length - 1}>
          <NameCell name={r.title} sub={r.draft ? 'Draft saved' : `Due ${fmt.fmtDay(r.due)}`} />
          <div style={{ marginLeft: 'auto' }}><Btn small variant="secondary" onClick={() => window.soloActions.nav('reports')}>{r.draft ? 'Finish' : 'Write'}</Btn></div>
        </HoverRow>
      ))}
    </Card>
  );
};

const StudentAttendanceCard = ({ m, s, all }) => {
  const a = m.attendance[s.id];
  const list = all ? a.recent : a.recent.slice(0, 3);
  return (
    <Card title={all ? 'Attendance · last 8 weeks' : 'Recent attendance'} actions={a.rate != null ? <StatusPill tone={a.rate >= 75 || !m.caps.atRiskFlags ? 'positive' : 'negative'}>{a.rate}%</StatusPill> : null}>
      {list.length === 0 ? <Pad><Muted>Attendance shows here once the first register is taken.</Muted></Pad> : list.map((x, i) => (
        <SessionLine key={x.session.id} last={i === list.length - 1} top={fmt.fmtDay(x.session.iso)} bottom={fmt.fmtShort(x.session.iso)}
          tone={x.mark === 'present' ? DS.accent : x.mark === 'late' ? DS.warning : DS.danger}
          title={x.session.lesson.kind === 'group' ? x.session.lesson.name : x.session.lesson.subject}
          sub={x.note ? `${fmt.clock(x.session.start)} · ${x.note.toLowerCase()}` : `${fmt.clock(x.session.start)} · ${fmt.fmtMins(x.session.register.mins)} delivered`}
          end={<StatusPill tone={x.mark === 'present' ? 'positive' : x.mark === 'late' ? 'warning' : 'negative'}>{x.mark === 'present' ? 'Present' : x.mark === 'late' ? 'Late' : 'Absent'}</StatusPill>} />
      ))}
    </Card>
  );
};

const StudentLessonsCard = ({ m, s }) => (
  <Card title="Lessons">
    {m.lessonsFor(s.id).map((l, i, arr) => (
      <SessionLine key={l.id} last={i === arr.length - 1} top={fmt.DAYS[l.slots[0].day - 1]} bottom={l.slots[0].start} tone={toneOf(l)}
        title={l.kind === 'group' ? l.name : l.subject} sub={`${lessonWhen(l)} · ${l.place} · ${money(l.rate)} an hour${l.kind === 'group' ? ' a head' : ''}`}
        end={l.kind === 'group' ? <StatusPill tone="info">Group</StatusPill> : null} />
    ))}
  </Card>
);

const SoloStudentDetail = () => {
  const m = window.soloModel();
  const st = window.useSoloDemo();
  const flows = useFlows();
  const go = window.soloActions.nav;
  const s = m.studentById[st.studentId] || m.students[0];
  const [tabPick, setTab] = React.useState('overview');
  const next = m.nextLessonFor(s.id);
  const tabs = [
    { id: 'overview', label: 'Overview' }, { id: 'lessons', label: 'Lessons' }, { id: 'attendance', label: 'Attendance' },
    m.caps.tracking && { id: 'tracking', label: 'Tracking' }, m.caps.reports && { id: 'reports', label: 'Reports' },
    { id: 'invoices', label: 'Invoices' }, { id: 'notes', label: 'Notes' },
  ].filter(Boolean);
  // A tab the current plan doesn't have falls back to the overview.
  const tab = tabs.some(t => t.id === tabPick) ? tabPick : 'overview';
  const notes = m.concerns.filter(c => c.studentId === s.id);

  const guardians = (
    <Card title="Guardians">
      <Pad style={{ paddingTop: 6, paddingBottom: 6 }}>
        <KV k={s.guardian}>{s.relation} · bills to {s.relation === 'Mother' ? 'her' : 'him'} · <a href={`mailto:${emailFor(s.guardian)}`} style={{ color: DS.accent, textDecoration: 'none' }}>{emailFor(s.guardian)}</a></KV>
        {s.g2 && <KV k={s.g2[0]}>{s.g2[1]} · {phoneFor(s.g2[0])}</KV>}
        <KV k="Emergency" last>{s.guardian} · {phoneFor(s.guardian)}</KV>
      </Pad>
    </Card>
  );
  const care = (
    <Card title="Care and consent">
      <Pad style={{ paddingTop: 6, paddingBottom: 6 }}>
        <KV k="Allergies">{s.allergies || 'None recorded'}</KV>
        <KV k="SEN">{s.sen || 'None recorded'}</KV>
        <KV k="Photo consent">Granted {fmt.fmtLong(s.photoConsent || `${s.since}-01`)} by {s.guardian}</KV>
        <KV k="Data processing" last>Granted {fmt.fmtLong(s.dataConsent || `${s.since}-01`)}</KV>
      </Pad>
    </Card>
  );
  const nextCard = (
    <Card title="Next lesson">
      <Pad>
        {next ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>
              {next.iso === m.today ? 'Today' : `${fmt.fmtDay(next.iso)} ${fmt.fmtShort(next.iso)}`}, {fmt.clock(next.start)} – {fmt.clock(next.end)}
            </div>
            <Muted style={{ margin: '4px 0 14px' }}>{kindText(next.lesson)} · {next.lesson.place.toLowerCase()} · {money(next.lesson.rate)} an hour{next.lesson.kind === 'group' ? ' a head' : ''}</Muted>
            {next.status === 'live'
              ? <Btn small style={{ width: '100%', justifyContent: 'center' }} onClick={() => flows.register(next)}>Take register</Btn>
              : <Muted>Register opens at {next.opensAt}.</Muted>}
          </>
        ) : <Muted>Nothing booked in the next week.</Muted>}
      </Pad>
    </Card>
  );

  return (
    <div style={pageFrame()}>
      <BackLink label="Students" onClick={() => go('students')} />
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px', flexWrap: 'wrap' }}>
          <Avatar name={s.name} size={52} />
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: DS.text, margin: 0, letterSpacing: '-0.3px' }}>{s.name}</h1>
            <div style={{ fontSize: 13, color: DS.muted, marginTop: 3 }}>{s.year} · {s.subject} · with you since {fmt.fmtMonthYear(s.since)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn small variant="secondary" icon="mail">Email {s.guardian.split(' ')[0]}</Btn>
            <Btn small variant="secondary" icon="shield" onClick={() => flows.concern(s.id)}>Log a concern</Btn>
            <Btn small icon="invoice">Raise invoice</Btn>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 18 }}><TabNav tabs={tabs} value={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <Cols weights={[1, 1]}>
          <Stack>{guardians}{care}<StudentAttendanceCard m={m} s={s} /></Stack>
          <Stack>
            {nextCard}
            {m.caps.tracking && <StudentTrackingCard m={m} s={s} />}
            {m.caps.reports && <StudentReportsCard m={m} s={s} />}
            <StudentInvoicesCard m={m} s={s} />
          </Stack>
        </Cols>
      )}
      {tab === 'lessons' && <Cols weights={[1.5, 1]}><StudentLessonsCard m={m} s={s} />{nextCard}</Cols>}
      {tab === 'attendance' && <StudentAttendanceCard m={m} s={s} all />}
      {tab === 'tracking' && <StudentTrackingCard m={m} s={s} />}
      {tab === 'reports' && <StudentReportsCard m={m} s={s} />}
      {tab === 'invoices' && <StudentInvoicesCard m={m} s={s} all />}
      {tab === 'notes' && (
        <Cols weights={[1.5, 1]}>
          <Card title="Notes and concerns" actions={<StatusPill tone="neutral">Private</StatusPill>}>
            {notes.length === 0 ? (
              <EmptyState icon="shield" title={`Nothing written about ${s.first}`}
                message="Anything that worries you goes here, dated at the moment you write it."
                action={<Btn small onClick={() => flows.concern(s.id)}>Log a concern</Btn>} />
            ) : notes.map((c, i) => (
              <HoverRow key={c.id} last={i === notes.length - 1}>
                <NameCell name={new Date(c.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} sub={c.what + (c.action ? ` — ${c.action}` : '')} />
              </HoverRow>
            ))}
          </Card>
          <Stack>{guardians}{care}</Stack>
        </Cols>
      )}
    </div>
  );
};

// ── 4. Timetable ─────────────────────────────────────────────────────────────
const SoloTimetable = () => {
  const m = window.soloModel();
  const go = window.soloActions.nav;
  const [offset, setOffset] = React.useState(0);
  const todayD = fmt.dateOf(m.today);
  const monday = fmt.addDays(todayD, -(fmt.dayNum(todayD) - 1) + offset * 7);
  const sunday = fmt.addDays(monday, 6);
  const sessions = m.sessionsBetween(fmt.isoOf(monday), fmt.isoOf(sunday));
  const title = offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week' : `Week of ${fmt.fmtShort(fmt.isoOf(monday))}`;
  const range = `${monday.getDate()}${monday.getMonth() !== sunday.getMonth() ? ' ' + fmt.MONTHS[monday.getMonth()] : ''} – ${fmt.fmtLong(fmt.isoOf(sunday))}`;
  const hasGroups = m.lessons.some(l => l.kind === 'group');

  return (
    <div style={pageFrame()}>
      <PageHeader title={title} subtitle={range} actions={<>
        <Btn small variant="secondary" icon="chevron_l" onClick={() => setOffset(offset - 1)}>Previous</Btn>
        <Btn small variant="secondary" onClick={() => setOffset(offset + 1)}>Next</Btn>
        <Btn small icon="plus">Add lesson</Btn>
      </>} />
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(128px, 1fr))', gap: 10, minWidth: 7 * 138 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = fmt.addDays(monday, i), iso = fmt.isoOf(d);
            const list = sessions.filter(s => s.iso === iso);
            const isToday = iso === m.today;
            return (
              <div key={iso} style={{ background: DS.card, border: `1px solid ${isToday ? DS.accentBorder : DS.cardBorder}`, boxShadow: DS.cardShadow, borderRadius: 10, padding: '12px 10px', minHeight: 240 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? DS.accent : DS.text }}>{fmt.DAYS[i]}</div>
                <div style={{ fontSize: 11.5, color: DS.faint, marginBottom: 10 }}>{fmt.fmtShort(iso)}{isToday ? ' · today' : ''}</div>
                {list.length === 0 && <div style={{ fontSize: 12, color: DS.faint, padding: '4px 2px' }}>Free — nothing booked</div>}
                {list.map(s => {
                  const grp = s.lesson.kind === 'group';
                  return (
                    <button key={s.id} onClick={() => (grp ? go('lessons') : go('student_detail', s.lesson.students[0]))}
                      style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderLeft: `3px solid ${toneOf(s.lesson)}`, background: grp ? DS.infoBg : DS.accentLight, borderRadius: 8, padding: '7px 9px', marginBottom: 7 }}>
                      <div style={{ fontSize: 11.5, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt.clock(s.start)}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, lineHeight: 1.3, marginTop: 1 }}>{s.lesson.title}{grp ? ` · ${s.lesson.students.length}` : ''}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {hasGroups && (
        <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 12.5, color: DS.muted, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 18, height: 14, boxSizing: 'border-box', borderRadius: 3, background: DS.accentLight, borderLeft: `3px solid ${DS.accent}` }} />One-to-one</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 18, height: 14, boxSizing: 'border-box', borderRadius: 3, background: DS.infoBg, borderLeft: `3px solid ${DS.info}` }} />Group</span>
        </div>
      )}
    </div>
  );
};

// ── 5. Lessons ───────────────────────────────────────────────────────────────
const SoloLessons = () => {
  const m = window.soloModel();
  const caps = m.caps;
  const go = window.soloActions.nav;
  const next = window.soloNextTier(m.tier.id);
  const ones = m.lessons.filter(l => l.kind === 'one');
  const groups = m.lessons.filter(l => l.kind === 'group');
  const week = m.sessionsBetween(m.today, fmt.isoOf(fmt.addDays(fmt.dateOf(m.today), 7)));
  const nextText = (l) => {
    const s = week.find(x => x.lesson.id === l.id && x.end > m.now);
    if (!s) return '—';
    return s.iso === m.today ? 'Today' : fmt.fmtDay(s.iso);
  };
  const sub = [plural(ones.length, 'one-to-one lesson')];
  if (caps.groupLessons) sub.push(plural(groups.length, 'group'));

  return (
    <div style={pageFrame()}>
      <PageHeader title="Lessons" subtitle={`${sub.join(' · ')} running`} actions={<Btn small icon="plus">New lesson</Btn>} />
      <Card title="One-to-one">
        <Table cols={['Student', 'Subject', 'When', 'Where', { label: 'Rate', align: 'right' }, { label: 'Next', align: 'right' }, '']}
          rows={ones.map(l => {
            const s = m.studentById[l.students[0]];
            return {
              onClick: () => go('student_detail', s.id),
              cells: [<NameCell name={s.name} sub={s.year} />, l.subject, lessonWhen(l), l.place, `${money(l.rate)}/hr`, nextText(l),
                <Btn small variant="secondary" onClick={(e) => { e && e.stopPropagation && e.stopPropagation(); go('student_detail', s.id); }}>Open</Btn>],
            };
          })} />
      </Card>

      {caps.groupLessons ? (
        <>
          <Card title="Groups" style={{ marginTop: 18 }} actions={<LinkBtn>New group</LinkBtn>}>
            <Table cols={['Group', 'Subject', 'When', 'Where', { label: 'Rate', align: 'right' }, { label: 'Students', align: 'right' }, { label: 'Next', align: 'right' }]}
              rows={groups.map(l => [
                <NameCell name={l.name} sub={l.students.map(id => m.studentById[id].first).join(' · ')} />,
                l.subject, lessonWhen(l), l.place, `${money(l.rate)}/head`, `${l.students.length} of ${l.capacity}`, nextText(l),
              ])} />
          </Card>
          <Note title="Groups work like one-to-one lessons.">A group is a lesson with more students on the register — the same register, the same earnings, and each family still gets their own invoice. Only the rate is per head.</Note>
        </>
      ) : next && (
        <Card style={{ marginTop: 18 }}>
          <Pad style={{ padding: '22px 22px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>Teaching more than one at a time?</div>
            <Muted style={{ margin: '6px 0 16px', maxWidth: 620 }}>
              Siblings together, or a Saturday revision group of five. {next.label} lets you run group lessons, charge per head, and bill each family separately from the same lesson — and takes you to {next.caps.maxStudents} students.
            </Muted>
            <Btn onClick={() => go('billing')}>See {next.label}</Btn>
          </Pad>
        </Card>
      )}
    </div>
  );
};

// ── 6. Attendance ────────────────────────────────────────────────────────────
const SoloAttendance = () => {
  const m = window.soloModel();
  const flows = useFlows();
  const earlier = m.past.filter(s => s.register && s.iso !== m.today && s.daysAgo <= 7).sort((a, b) => b.start - a.start).slice(0, 10);
  const line = (s, i, arr, dated) => (
    <SessionLine key={s.id} last={i === arr.length - 1}
      top={dated ? fmt.fmtDay(s.iso) : fmt.clock(s.start)} bottom={dated ? fmt.fmtShort(s.iso) : fmt.clock(s.end)}
      tone={s.status === 'locked' ? DS.borderDark : s.status === 'open' ? DS.warning : toneOf(s.lesson)}
      title={s.lesson.title}
      sub={s.register ? `${dated ? fmt.clock(s.start) + ' · ' : ''}${registerSummary(s)}` : `${dated ? fmt.clock(s.start) + ' · ' : ''}${s.lesson.subject}${s.lesson.kind === 'group' ? ` · ${plural(s.lesson.students.length, 'student')}` : ''}`}
      end={s.status === 'taken'
        ? <>{s.lesson.kind === 'group' && <StatusPill tone="info">Group</StatusPill>}<Btn small variant="secondary" onClick={() => flows.register(s)}>Amend</Btn></>
        : <SessionEnd s={s} />} />
  );
  return (
    <div style={pageFrame()}>
      <PageHeader title="Attendance" subtitle="Take and review the register for each lesson"
        actions={m.caps.analyticsExports ? <Btn small variant="secondary" icon="download">Export</Btn> : null} />
      {m.needsRegister.length > 0 && (
        <Banner style={{ marginBottom: 18 }}>
          <b style={{ fontWeight: 600, color: DS.text }}>{plural(m.needsRegister.length, 'lesson needs', 'lessons need')} a register.</b> A missing register also means missing hours on your earnings.
        </Banner>
      )}
      <Stack>
        <Card title="Needs a register">
          {m.needsRegister.length === 0
            ? <Pad><Muted>Every register is in.</Muted></Pad>
            : m.needsRegister.map((s, i, arr) => line(s, i, arr, true))}
        </Card>
        <Card title="Today" actions={<span style={{ fontSize: 12.5, color: DS.muted }}>{m.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}>
          {m.todaySessions.length === 0 ? <Pad><Muted>No lessons today.</Muted></Pad> : m.todaySessions.map((s, i, arr) => line(s, i, arr, false))}
        </Card>
        <Card title="Earlier this week">
          {earlier.length === 0 ? <Pad><Muted>Registers from the last seven days show here.</Muted></Pad> : earlier.map((s, i, arr) => line(s, i, arr, true))}
        </Card>
      </Stack>
      <Note title="One-to-one registers skip the bulk controls.">With one student there's nothing to mark all of — it's three buttons and the time delivered. Group registers keep “Mark all present”.</Note>
    </div>
  );
};

// ── 7. Invoices ──────────────────────────────────────────────────────────────
const SoloInvoices = () => {
  const m = window.soloModel();
  const caps = m.caps;
  const flows = useFlows();
  const go = window.soloActions.nav;
  const capped = Number.isFinite(caps.maxInvoicesPerMonth);
  const unpaidTotal = m.unpaid.reduce((t, i) => t + i.amount, 0);
  const overdueTotal = m.overdue.reduce((t, i) => t + i.amount, 0);
  const subtitle = capped
    ? `${m.raisedThisMonth} of ${caps.maxInvoicesPerMonth} raised this month · ${money(unpaidTotal)} outstanding`
    : `${money(unpaidTotal)} outstanding · ${money(overdueTotal)} overdue${caps.paymentReminders ? ' · reminders send automatically' : ''}`;
  const group = m.lessons.filter(l => l.kind === 'group').sort((a, b) => b.students.length - a.students.length)[0];
  const groupFamilies = group ? new Set(group.students.map(id => m.studentById[id].family)).size : 0;
  const late = m.overdue[0];
  const statusPill = (inv) => inv.status === 'paid' ? <StatusPill tone="neutral">Paid {fmt.fmtShort(inv.paidOn)}</StatusPill>
    : inv.status === 'draft' ? <StatusPill tone="neutral">Draft</StatusPill>
    : inv.status === 'overdue' ? (caps.paymentReminders ? <StatusPill tone="warning">Reminder queued</StatusPill> : <StatusPill tone="negative">{plural(inv.daysLate, 'day')} late</StatusPill>)
    : <StatusPill tone="positive">Sent</StatusPill>;

  return (
    <div style={pageFrame()}>
      <PageHeader title="Invoices" subtitle={subtitle} actions={<>
        {caps.paymentReminders && <Btn small variant="secondary" icon="send">Chase overdue</Btn>}
        <Btn small variant="secondary" onClick={() => flows.payment()}>Record a payment</Btn>
        {(!capped || m.raisedThisMonth < caps.maxInvoicesPerMonth) && <Btn small icon="plus">New invoice</Btn>}
      </>} />

      {capped && (
        <Banner style={{ marginBottom: 18 }} action="See plans" onAction={() => go('billing')}>
          Your plan covers {caps.maxInvoicesPerMonth} invoices a month. You've raised {m.raisedThisMonth} in {m.monthLabel}.
        </Banner>
      )}

      <Card>
        <Table cols={['Invoice', 'Billed to', 'Covers', 'Due', { label: 'Amount', align: 'right' }, { label: 'Status', align: 'right' }, '']}
          rows={m.invoices.map(inv => [
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inv.id}</span>,
            <NameCell name={inv.familyName} sub={inv.billTo} />,
            inv.covers, fmt.fmtShort(inv.due), money(inv.amount),
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              {statusPill(inv)}
              {inv.status === 'overdue' && caps.paymentReminders && <span style={{ fontSize: 11.5, color: DS.danger }}>{plural(inv.daysLate, 'day')} late</span>}
            </span>,
            (inv.status === 'sent' || inv.status === 'overdue')
              ? <RowActionsMenu items={[{ label: 'Record payment', icon: 'check', onClick: () => flows.payment(inv.id) }, { label: `Email ${inv.billTo.split(' ')[0]}`, icon: 'mail' }]} />
              : null,
          ])} />
      </Card>

      <Cols weights={[1, 1]} style={{ marginTop: 18 }}>
        {caps.groupLessons && group ? (
          <Card title={`One lesson, ${plural(groupFamilies, 'invoice')}`}>
            <Pad>
              <Muted style={{ marginBottom: 10 }}>{group.name} has {plural(group.students.length, 'student')} from {plural(groupFamilies, 'family', 'families')}. Each family gets their own invoice for their child's place — taught together, billed apart.</Muted>
              <KV k="Lesson">{DAYS_PLURAL[group.slots[0].day - 1]} ·{group.slots[0].start} for {fmt.fmtMins(group.slots[0].mins)}</KV>
              <KV k="Rate">{money(group.rate)} a head an hour · {money(group.rate * group.slots[0].mins / 60)} a lesson</KV>
              <KV k="Generates" last>{plural(group.students.length, 'invoice line')} across {plural(groupFamilies, 'family', 'families')}</KV>
            </Pad>
          </Card>
        ) : null}
        {caps.paymentReminders ? (
          <Card title="Reminders" actions={<StatusPill tone="positive">On</StatusPill>}>
            <Pad style={{ paddingTop: 6, paddingBottom: 6 }}>
              <KV k="Before due">3 days before</KV>
              <KV k="After due">Day 1, day 7, day 14</KV>
              <KV k="Sends to">Billing guardian only</KV>
              <KV k="VAT" last>{caps.vat ? 'Not registered · add a VAT number to show it on invoices' : 'Not registered'}</KV>
            </Pad>
          </Card>
        ) : (
          <Card title="Chasing payment">
            <Pad>
              {late ? (
                <>
                  <Muted style={{ marginBottom: 14 }}>The {late.familyName}'s invoice is {plural(late.daysLate, 'day')} late. A short, friendly note to {late.billTo.split(' ')[0]} usually does it.</Muted>
                  <Btn small variant="secondary" icon="mail" style={{ width: '100%', justifyContent: 'center' }}>Email {late.billTo}</Btn>
                </>
              ) : <Muted>Nobody is late paying. If someone is, you can nudge them from here.</Muted>}
            </Pad>
          </Card>
        )}
      </Cols>
    </div>
  );
};

// ── 8. Earnings ──────────────────────────────────────────────────────────────
const SoloEarnings = () => {
  const m = window.soloModel();
  const e = m.earnings;
  const [all, setAll] = React.useState(false);
  const rows = e.monthSessions.slice().sort((a, b) => b.start - a.start);
  const shown = all ? rows : rows.slice(0, 12);
  const hours = +(e.minsTaught / 60).toFixed(1);
  const hasGroupEarnings = m.caps.groupLessons && e.perHourGroup > 0;

  return (
    <div style={pageFrame()}>
      <PageHeader title="Earnings" subtitle="Worked out from the registers you take — nothing to fill in"
        actions={m.caps.analyticsExports ? <Btn small variant="secondary" icon="download">Export for my accountant</Btn> : null} />
      <StatBand stats={[
        { label: `Billed in ${m.monthLabel}`, value: money(e.billedThisMonth), sub: 'Invoiced, not yet all received' },
        { label: 'Received', value: money(e.receivedThisMonth), sub: 'Recorded payments' },
        { label: 'Hours taught', value: hours, sub: `So far in ${m.monthLabel}` },
        { label: 'Average an hour', value: money(Math.round(e.perHourAll)),
          sub: hasGroupEarnings ? `${money(Math.round(e.perHourGroup))} in groups · ${money(Math.round(e.perHourOne))} one-to-one` : 'One-to-one lessons' },
      ]} />
      <Cols style={{ marginTop: 18 }}>
        <Card title={`${m.monthLabel}, lesson by lesson`} subtitle={`${money(e.earned)} from ${plural(rows.filter(r => r.register).length, 'register')}`}>
          {shown.map((s, i) => (
            <SessionLine key={s.id} last={i === shown.length - 1 && rows.length <= 12} top={fmt.fmtDay(s.iso)} bottom={fmt.fmtShort(s.iso)}
              tone={s.register ? toneOf(s.lesson) : DS.borderDark} title={s.lesson.title}
              sub={s.register
                ? (s.lesson.kind === 'group' ? `${fmt.fmtMins(s.mins)} · ${plural(s.lesson.students.length, 'student')} at ${money(s.lesson.rate * s.mins / 60)}` : `${fmt.fmtMins(s.register.mins)} · ${money(s.lesson.rate)}/hr`)
                : 'No register taken'}
              end={s.register
                ? <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(s.amount)}</span>
                : <span style={{ fontSize: 12.5, color: DS.muted }}>Not counted</span>} />
          ))}
          {rows.length > 12 && (
            <Pad style={{ borderTop: `1px solid ${DS.border}`, paddingTop: 10, paddingBottom: 12, textAlign: 'center' }}>
              <LinkBtn onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${rows.length}`}</LinkBtn>
            </Pad>
          )}
        </Card>
        <Card title="By month">
          <Pad>
            <BarChart labels={e.trend.map(t => t.month)} data={e.trend.map(t => t.value)} height={180} />
            <Muted style={{ marginTop: 10 }}>
              {m.monthLabel} shows your full booked month. July and August are quiet for most tutors{m.tier.monthly > 0 ? ' — you can pause your plan over the summer rather than cancel.' : '.'}
            </Muted>
          </Pad>
        </Card>
      </Cols>
    </div>
  );
};

// ── 9. Safeguarding ──────────────────────────────────────────────────────────
const SoloSafeguarding = () => {
  const m = window.soloModel();
  const flows = useFlows();
  return (
    <div style={pageFrame()}>
      <PageHeader title="Concern log" subtitle="Your private, dated record. Nobody else can see it."
        actions={<Btn small icon="plus" onClick={() => flows.concern()}>Log a concern</Btn>} />
      <Cols>
        <Card title="Logged concerns">
          {m.concerns.length === 0 ? (
            <EmptyState icon="shield" title="Nothing logged"
              message="If something a student says or does worries you, write it down the same day: what you saw, what was said, what you did next. A dated note made at the time counts for far more than one written from memory."
              action={<Btn small onClick={() => flows.concern()}>Log a concern</Btn>} />
          ) : m.concerns.map((c, i) => (
            <HoverRow key={c.id} last={i === m.concerns.length - 1}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: DS.muted }}>
                  {new Date(c.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {c.studentId && m.studentById[c.studentId] ? ` · ${m.studentById[c.studentId].name}` : ''}
                </div>
                <div style={{ fontSize: 13.5, color: DS.text, marginTop: 3 }}>{c.what}</div>
                {c.action && <div style={{ fontSize: 12.5, color: DS.sub, marginTop: 3 }}>Next: {c.action}</div>}
              </div>
            </HoverRow>
          ))}
        </Card>
        <Card title="Where to escalate" actions={<LinkBtn>Edit</LinkBtn>}>
          <Pad style={{ paddingTop: 6 }}>
            {m.escalation.map((x, i) => (
              <KV key={x.label} k={x.label} last={i === m.escalation.length - 1}>{x.value}<div><a href={`tel:${x.phone.replace(/\s/g, '')}`} style={{ color: DS.accent, textDecoration: 'none' }}>{x.phone}</a></div></KV>
            ))}
            <Muted style={{ marginTop: 12 }}>Klasio keeps your record. It doesn't review it and it can't escalate for you — that decision and that call are yours.</Muted>
          </Pad>
        </Card>
      </Cols>
      <Note title="On every plan.">The concern log, guardian and emergency contacts, consent records and health or SEN notes are part of every plan, including Free.</Note>
    </div>
  );
};

// ── 10. Plan & billing ───────────────────────────────────────────────────────
const planFeatures = (caps) => [
  `${caps.maxStudents} students`,
  caps.groupLessons ? 'Group lessons, charged per head' : 'One-to-one lessons',
  'Timetable, registers and earnings',
  Number.isFinite(caps.maxInvoicesPerMonth) ? `${caps.maxInvoicesPerMonth} invoices a month` : 'Unlimited invoices',
  caps.lessonPlanner && caps.tracking && 'Lesson planner and tracking',
  caps.homework && (caps.homeworkBank ? 'Homework with a question bank and auto-marking' : 'Homework you can set and collect'),
  caps.reports && (caps.reportRules ? 'Written reports with rules and templates' : 'Written reports, emailed as PDF'),
  caps.atRiskFlags && 'Flags when attendance or scores slip',
  caps.paymentReminders && 'Automatic payment reminders',
  caps.vat && 'VAT invoicing and exports',
  `${fmtBytes(caps.storageBytes)} of files`,
  'Concern log and guardian records',
].filter(Boolean);

const SoloBilling = () => {
  const m = window.soloModel();
  const caps = m.caps;
  const [cycle, setCycle] = React.useState('monthly');
  const paid = m.tier.monthly > 0;
  const studentPct = 100 * m.students.length / caps.maxStudents;
  const storagePct = 100 * m.storageUsed / caps.storageBytes;
  const capped = Number.isFinite(caps.maxInvoicesPerMonth);
  return (
    <div style={pageFrame()}>
      <PageHeader title="Plan & billing" subtitle={`You're on ${m.tier.label}${paid ? `, billed ${cycle}` : ''}`}
        actions={<Segmented value={cycle} onChange={setCycle} options={[{ id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly · 2 months free' }]} />} />

      <Card title="What you're using">
        <Pad>
          <Cols weights={[1, 1]} style={{ gap: 28 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>Students</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.students.length} of {caps.maxStudents}</span></div>
              <Meter pct={studentPct} tone={studentPct >= 100 ? DS.warning : DS.accent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginTop: 16 }}><span>Storage</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBytes(m.storageUsed)} of {fmtBytes(caps.storageBytes)}</span></div>
              <Meter pct={storagePct} tone={storagePct >= 90 ? DS.warning : DS.accent} />
              {capped && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginTop: 16 }}><span>Invoices this month</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.raisedThisMonth} of {caps.maxInvoicesPerMonth}</span></div>
                <Meter pct={100 * m.raisedThisMonth / caps.maxInvoicesPerMonth} />
              </>}
            </div>
            <div>
              <KV k="Renews">{paid ? fmt.fmtLong(m.tutor.renews) : 'Free — nothing to renew'}</KV>
              {paid && <KV k="Card">{m.tutor.card}</KV>}
              <KV k="Receipts" last={!paid}>{m.tutor.email}</KV>
              {paid && <KV k="Summer" last>Pause billing for July and August · <LinkBtn>Set up</LinkBtn></KV>}
            </div>
          </Cols>
        </Pad>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18 }}>
        {window.listSoloTiers().map(t => {
          const rel = window.compareSoloTiers(t.id, m.tier.id);
          const price = cycle === 'monthly' ? t.monthly : t.yearly;
          return (
            <div key={t.id} style={{
              background: DS.card, borderRadius: 12, padding: '22px 20px', display: 'flex', flexDirection: 'column',
              border: `1px solid ${rel === 0 ? DS.accent : DS.cardBorder}`, boxShadow: rel === 0 ? `0 0 0 1px ${DS.accent}` : DS.cardShadow,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: DS.text }}>{t.label}</span>
                {rel === 0 && <StatusPill tone="accent">Your plan</StatusPill>}
              </div>
              <div style={{ fontSize: 12.5, color: DS.muted, margin: '3px 0 14px' }}>{t.audience}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: DS.text, letterSpacing: '-0.6px' }}>
                £{price}{t.monthly > 0 && <span style={{ fontSize: 14, fontWeight: 500, color: DS.muted }}> {cycle === 'monthly' ? '/mo' : '/yr'}</span>}
              </div>
              <div style={{ fontSize: 12, color: DS.muted, marginTop: 3 }}>{t.monthly === 0 ? 'Free for as long as you like' : cycle === 'monthly' ? `£${t.yearly} a year` : `£${t.monthly} a month`}</div>
              <ul style={{ listStyle: 'none', margin: '16px 0 18px', padding: 0, fontSize: 13.5, color: DS.sub }}>
                {planFeatures(t.caps).map(f => (
                  <li key={f} style={{ display: 'flex', gap: 8, padding: '4px 0' }}><Icon name="check" size={15} color={DS.accent} />{f}</li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto' }}>
                {rel === 0
                  ? <Btn small variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>Current plan</Btn>
                  : <Btn small variant={rel > 0 ? 'primary' : 'secondary'} style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.soloActions.setTier(t.id)}>{rel > 0 ? `Choose ${t.label}` : `Move to ${t.label}`}</Btn>}
              </div>
            </div>
          );
        })}
      </div>

      <Note title="Taking on another tutor?">Every solo plan has one seat. When a second tutor joins, you move to a team plan — same account, same students, same history.</Note>
    </div>
  );
};

// ── Solo+ feature pages ──────────────────────────────────────────────────────
const SoloTracking = () => {
  const m = window.soloModel();
  const go = window.soloActions.nav;
  return (
    <div style={pageFrame()}>
      <PageHeader title="Tracking" subtitle="Every mark you've recorded, one row a student" actions={<Btn small icon="plus">Add a mark</Btn>} />
      <Card>
        <Table cols={['Student', 'Latest', 'Marked', { label: 'Score', align: 'right' }, { label: 'First this term', align: 'right' }]}
          rows={m.students.map(s => {
            const list = m.tracking[s.id] || [];
            const last = list[list.length - 1], first = list[0];
            return {
              onClick: () => go('student_detail', s.id),
              cells: [<NameCell name={s.name} sub={s.subject} />, last.title, fmt.fmtShort(last.date),
                <StatusPill tone={last.score / last.out >= 0.7 ? 'positive' : 'warning'}>{last.score}/{last.out}</StatusPill>,
                `${first.score}/${first.out}`],
            };
          })} />
      </Card>
    </div>
  );
};

const SoloReports = () => {
  const m = window.soloModel();
  const published = m.students.filter(s => s.since <= m.reportsPublished.joinedBy);
  return (
    <div style={pageFrame()}>
      <PageHeader title="Reports" subtitle="Written reports for families, sent as a PDF" actions={<Btn small icon="plus">Write a report</Btn>} />
      <Stack>
        {m.caps.reportRules && (
          <Card title="Due this week" subtitle="From your report rules">
            {m.reportsDue.map((r, i) => (
              <HoverRow key={r.student} last={i === m.reportsDue.length - 1}>
                <NameCell name={`${r.s.name} · ${r.title}`} sub={`${r.rule} · ${r.draft ? 'draft saved' : `due ${fmt.fmtDay(r.due)} ${fmt.fmtShort(r.due)}`}`} />
                <div style={{ marginLeft: 'auto' }}><Btn small variant="secondary">{r.draft ? 'Finish' : 'Write'}</Btn></div>
              </HoverRow>
            ))}
          </Card>
        )}
        <Card title="Published">
          <Table cols={['Student', 'Report', 'Published', 'Sent to']}
            rows={published.map(s => [<NameCell name={s.name} sub={s.subject} />, m.reportsPublished.title, fmt.fmtShort(m.reportsPublished.date), s.guardian])}
            empty="Reports you publish show here." />
        </Card>
      </Stack>
    </div>
  );
};

const SoloProgress = () => {
  const m = window.soloModel();
  const go = window.soloActions.nav;
  return (
    <div style={pageFrame()}>
      <PageHeader title="Progress" subtitle="Attendance, marks and homework together, flagged when something slips" />
      <Card title="Worth a look">
        {m.watch.length === 0 ? <Pad><Muted>Nobody's slipping right now.</Muted></Pad> : m.watch.map((w, i) => (
          <HoverRow key={w.student.id + w.kind} last={i === m.watch.length - 1} onClick={() => go('student_detail', w.student.id)}>
            <NameCell name={w.student.name} sub={w.sub} />
            <div style={{ marginLeft: 'auto' }}><StatusPill tone={w.kind === 'attendance' ? 'negative' : 'warning'}>{w.label}</StatusPill></div>
          </HoverRow>
        ))}
      </Card>
    </div>
  );
};

// Pages that open onto a first step rather than a dataset in this demo.
const INVITES = {
  lesson_planner: { title: 'Lesson planner', icon: 'edit', head: 'Plan the next few weeks', body: "Sketch each student's topics week by week. The plan shows on your dashboard beside the lesson it belongs to.", cta: 'Start a plan' },
  homework:       { title: 'Homework', icon: 'notebook_pen', head: 'Set the first piece of homework', body: 'Attach a worksheet or write the questions, pick a due date, and collect it back here.', cta: 'Set homework' },
  exports:        { title: 'Exports', icon: 'download', head: 'Everything your accountant asks for', body: 'Earnings, invoices and hours as a spreadsheet, a tax year at a time.', cta: 'Export this tax year' },
  resources:      { title: 'Resources', icon: 'folder', head: 'Keep your worksheets in one place', body: 'Upload papers, mark schemes and notes, then attach them to a lesson.', cta: 'Upload a file' },
};
const SoloInvite = ({ id }) => {
  const m = window.soloModel();
  const x = INVITES[id];
  const body = id === 'homework' && m.caps.homeworkBank ? `${x.body} Pull questions from the question bank and let the marking happen for you.` : x.body;
  return (
    <div style={pageFrame()}>
      <PageHeader title={x.title} subtitle={id === 'resources' ? `${fmtBytes(m.storageUsed)} of ${fmtBytes(m.caps.storageBytes)} used` : null} />
      <Card><EmptyState icon={x.icon} title={x.head} message={body} action={<Btn small icon="plus">{x.cta}</Btn>} /></Card>
    </div>
  );
};

// ── Router ───────────────────────────────────────────────────────────────────
const SoloPages = ({ page }) => {
  const m = window.soloModel();
  const c = m.caps;
  const id = page.split(':')[0];
  if (id === 'students') return <SoloStudents />;
  if (id === 'student_detail') return <SoloStudentDetail />;
  if (id === 'safeguarding') return <SoloSafeguarding />;
  if (id === 'timetable') return <SoloTimetable />;
  if (id === 'lessons') return <SoloLessons />;
  if (id === 'attendance') return <SoloAttendance />;
  if (id === 'invoices') return <SoloInvoices />;
  if (id === 'earnings') return <SoloEarnings />;
  if (id === 'billing') return <SoloBilling />;
  if (id === 'resources') return <SoloInvite id="resources" />;
  if (id === 'lesson_planner' && c.lessonPlanner) return <SoloInvite id="lesson_planner" />;
  if (id === 'homework' && c.homework) return <SoloInvite id="homework" />;
  if (id === 'tracking' && c.tracking) return <SoloTracking />;
  if (id === 'reports' && c.reports) return <SoloReports />;
  if (id === 'progress' && c.analyticsExports) return <SoloProgress />;
  if (id === 'exports' && c.analyticsExports) return <SoloInvite id="exports" />;
  return <SoloDashboard />;
};

// ── Header (breadcrumb · demo plan control · who) ────────────────────────────
const SoloTopBar = ({ page, onToggleSidebar, collapsed }) => {
  const m = window.soloModel();
  const st = window.useSoloDemo();
  const items = window.NAV_CONFIG.solo.items;
  const parent = navParentId(page);
  const item = items.find(i => i.id === parent || i.id === parent + 's') || items[0];
  const crumbs = [];
  if (item.section) crumbs.push({ label: item.section });
  crumbs.push({ label: item.label, page: item.id });
  if (page === 'student_detail' && m.studentById[st.studentId]) crumbs.push({ label: m.studentById[st.studentId].name });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', height: 52, borderBottom: `1px solid ${DS.border}`, boxShadow: DS.cardShadow, position: 'sticky', top: 0, background: DS.bg, flexShrink: 0, zIndex: 30 }}>
      <button onClick={onToggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, padding: 7, borderRadius: 7, marginLeft: -4 }}>
        <Icon name="sidebar" size={17} />
      </button>
      <div style={{ width: 1, height: 18, background: DS.border, margin: '0 6px 0 2px' }} />
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
        {crumbs.map((c, i) => {
          const current = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${i}-${c.label}`}>
              {i > 0 && <Icon name="chevron_r" size={13} color={DS.faint} />}
              {c.page && !current
                ? <button onClick={() => window.soloActions.nav(c.page)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: DS.muted, whiteSpace: 'nowrap' }}>{c.label}</button>
                : <span style={{ fontSize: 13.5, fontWeight: current ? 600 : 500, color: current ? DS.text : DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Demo-only plan control — the solo account's equivalent of the demo clock. */}
      <div title="Demo control — switch the plan this account is on" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px 3px 10px', border: `1px dashed ${DS.warningBorder}`, borderRadius: 11, background: DS.warningBg }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.warning }}>Demo plan</span>
        <Segmented value={m.tier.id} onChange={(id) => window.soloActions.setTier(id)} options={window.listSoloTiers().map(t => ({ id: t.id, label: t.label }))} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }} title={`${m.tier.label}${m.tier.monthly ? ` · £${m.tier.monthly} a month` : ''}`}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: DS.success }} />
        <span style={{ fontSize: 12, color: DS.muted, whiteSpace: 'nowrap' }}>{m.tutor.term}</span>
      </div>
      <div style={{ width: 1, height: 22, background: DS.border, margin: '0 6px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={m.tutor.name} size={28} color={DS.accent} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap' }}>{m.tutor.name}</div>
          <div style={{ fontSize: 10.5, color: DS.faint, whiteSpace: 'nowrap' }}>{SOLO_ACCOUNT.label} · {m.tier.label}</div>
        </div>
      </div>
    </div>
  );
};

// ── Shell ────────────────────────────────────────────────────────────────────
// Rendered by index.html in place of the centre shell while the solo account is
// active. `accounts` is the account switcher list (solo + the centre demo's
// centres); `onSwitchAccount` hands a picked centre back to index.html.
const SoloShell = ({ accounts, onSwitchAccount, collapsed, onToggleSidebar }) => {
  const st = window.useSoloDemo();
  const m = window.soloModel();
  const [flow, setFlow] = React.useState(null);
  const close = React.useCallback(() => setFlow(null), []);
  const flows = React.useMemo(() => ({
    register: (session) => setFlow({ kind: 'register', session }),
    reopen: (session) => setFlow({ kind: 'reopen', session }),
    concern: (studentId) => setFlow({ kind: 'concern', studentId }),
    payment: (invoiceId) => setFlow({ kind: 'payment', invoiceId }),
  }), []);
  // Leaving a tier can strand the page on a feature the new plan doesn't have.
  const pageAllowed = window.NAV_CONFIG.solo.items.some(i => i.id === navParentId(st.page) || i.id === navParentId(st.page) + 's');
  React.useEffect(() => { if (!pageAllowed) window.soloActions.nav('dashboard'); }, [pageAllowed]);
  const gbOf = (b) => (b >= GB ? +(b / GB).toFixed(1) : Math.round(b / MB) / 1000);
  // Re-find a session by id so a drawer opened before a change sees fresh state.
  const liveSession = flow && flow.session ? (m.history.find(s => s.id === flow.session.id) || flow.session) : null;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Sidebar
        role="solo"
        active={st.page}
        onNav={(p) => window.soloActions.nav(SOLO_PAGE_ALIASES[p] || p)}
        badges={{ students: m.students.length }}
        collapsed={collapsed}
        centre={{ id: SOLO_ACCOUNT.id, name: SOLO_ACCOUNT.name }}
        centres={accounts}
        onSwitchCentre={onSwitchAccount}
        cloudStorage={{ usedGb: gbOf(m.storageUsed), totalGb: gbOf(m.caps.storageBytes) }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: DS.canvas }}>
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <SoloTopBar page={st.page} collapsed={collapsed} onToggleSidebar={onToggleSidebar} />
          <FlowCtx.Provider value={flows}>
            <SoloPages key={`${st.page}:${st.studentId}`} page={pageAllowed ? st.page : 'dashboard'} />
            {flow && flow.kind === 'register' && <RegisterDrawer session={liveSession} onClose={close} />}
            {flow && flow.kind === 'reopen' && <ReopenModal session={liveSession} onClose={close}
              onReopened={() => setFlow({ kind: 'register', session: flow.session })} />}
            {flow && flow.kind === 'concern' && <ConcernModal studentId={flow.studentId} onClose={close} />}
            {flow && flow.kind === 'payment' && <PaymentModal invoiceId={flow.invoiceId} onClose={close} />}
          </FlowCtx.Provider>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SOLO_ACCOUNT, SoloShell, SoloPages, SoloTopBar });

})();
