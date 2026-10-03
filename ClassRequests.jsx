// ══════════════════════════════════════════════════════════════
//  Klasio — Class change requests (teacher → admin)   · decision #46
//
//  The admin owns the timetable and enrolment (D6), so a teacher never edits a
//  class. This is how they ASK: a request lands in an admin queue on the Classes
//  page (badged on the Classes nav item) and the teacher sees its status and the
//  admin's decision note on My Classes. Before this module the buttons wrote one
//  audit line and said "sent" — nothing ever reached an admin.
//
//  Store: localStorage `klasio.classRequests.v1` (production: class_change_requests).
//  Cross-instance reactive — every write dispatches `klasio-classrequests-changed`
//  so the sidebar badge, the admin queue and the teacher's list move together.
//
//  Row: { id, centreId, classId|null, kind, body, details{}, requestedBy,
//         requestedByName, createdAt, status: open|actioned|declined,
//         decidedBy, decidedAt, decisionNote, resultClassId }
//  classId is null only for a `new_class` request (or an unscoped `other`).
//  Approving a new class is a PREFILL, never a creation: it opens the 3-step
//  Create-a-class flow with subject / year / teacher / preferred slot filled in,
//  so the admin still decides the day, time and room.
// ══════════════════════════════════════════════════════════════

const CR_STORE_KEY = 'klasio.classRequests.v1';
const CR_EVENT = 'klasio-classrequests-changed';

const CR_KINDS = [
  { id: 'new_class', label: 'A new class',             icon: 'plus',   needsClass: false, hint: 'Ask for a class that does not exist yet.' },
  { id: 'schedule',  label: 'Change the day or time',  icon: 'clock',  needsClass: true,  hint: 'Move an existing class to another slot.' },
  { id: 'room',      label: 'Change the room',         icon: 'pin',    needsClass: true,  hint: 'The room is too small, noisy or unsuitable.' },
  { id: 'enrolment', label: 'Change who is enrolled',  icon: 'users',  needsClass: true,  hint: 'Add, remove or move a pupil.' },
  { id: 'cancel',    label: 'Stop running a class',    icon: 'x',      needsClass: true,  hint: 'The class should end or pause.' },
  { id: 'other',     label: 'Something else',          icon: 'edit',   needsClass: false, hint: 'Anything else about a class.' },
];
const crKind = (id) => CR_KINDS.find(k => k.id === id) || CR_KINDS[CR_KINDS.length - 1];
const CR_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const crActiveCentre = () => { try { return localStorage.getItem('tutoros.activeCentre') || 'bm'; } catch (e) { return 'bm'; } };
const crNowISO = () => new Date(window.getNow ? window.getNow() : Date.now()).toISOString();
const crFmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };

const crRead = () => {
  try {
    const raw = localStorage.getItem(CR_STORE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.requests)) return p; }
  } catch (e) {}
  return { requests: (window.CLASS_REQUEST_SEED || []).map(r => ({ ...r })) };
};
const crWrite = (next) => {
  try { localStorage.setItem(CR_STORE_KEY, JSON.stringify(next)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent(CR_EVENT)); } catch (e) {}
};

// Requests at the active centre, newest first — open ones lead.
const crList = (filter) => {
  const f = filter || {};
  const centre = crActiveCentre();
  return crRead().requests
    .filter(r => (r.centreId || 'bm') === centre)
    .filter(r => !f.teacherId || r.requestedBy === f.teacherId)
    .filter(r => !f.classId || r.classId === f.classId)
    .sort((a, b) => (a.status === 'open') !== (b.status === 'open')
      ? (a.status === 'open' ? -1 : 1)
      : String(b.createdAt).localeCompare(String(a.createdAt)));
};

const crCreate = (req) => {
  const s = crRead();
  const row = {
    id: 'cr' + Date.now(), centreId: crActiveCentre(),
    classId: req.classId || null, kind: req.kind, body: (req.body || '').trim(),
    details: req.details || {},
    requestedBy: req.requestedBy, requestedByName: req.requestedByName,
    createdAt: crNowISO(), status: 'open',
    decidedBy: null, decidedAt: null, decisionNote: null, resultClassId: null,
  };
  crWrite({ ...s, requests: [row, ...s.requests] });
  // The audit line is the RECORD, not the delivery mechanism.
  if (window.klasioAudit) window.klasioAudit('request_class_change', 'class_change_requests', { id: row.id, kind: row.kind, classId: row.classId, by: row.requestedBy });
  return row;
};

// status: 'actioned' | 'declined'. A decline must carry a reason — a teacher told
// only "declined" cannot do anything with it.
const crDecide = (id, status, note, opts) => {
  const o = opts || {};
  if (status === 'declined' && !String(note || '').trim()) return false;
  const s = crRead();
  crWrite({
    ...s,
    requests: s.requests.map(r => r.id !== id ? r : {
      ...r, status, decisionNote: String(note || '').trim() || null,
      decidedBy: o.by || 'admin', decidedAt: crNowISO(),
      resultClassId: o.resultClassId || r.resultClassId || null,
    }),
  });
  if (window.klasioAudit) window.klasioAudit('decide_class_change_request', 'class_change_requests', { id, status });
  return true;
};

const crOpenCount = () => { try { return crList().filter(r => r.status === 'open').length; } catch (e) { return 0; } };

const useClassRequests = (filter) => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const fn = () => setTick(t => t + 1);
    window.addEventListener(CR_EVENT, fn);
    return () => window.removeEventListener(CR_EVENT, fn);
  }, []);
  return crList(filter);
};

// One-line summary of what was asked for ("New class · GCSE Physics · Year 10").
const crTitle = (r, classes) => {
  const cls = r.classId && (classes || []).find(c => c.id === r.classId);
  const d = r.details || {};
  if (r.kind === 'new_class') return ['New class', [d.level, d.subject].filter(Boolean).join(' '), d.yearGroup].filter(Boolean).join(' · ');
  const what = { schedule: 'Change day/time', room: 'Change room', enrolment: 'Change enrolment', cancel: 'Stop class', other: 'Request' }[r.kind] || 'Request';
  return cls ? `${what} · ${cls.name} (${cls.group})` : what;
};
const crDetailChips = (r) => {
  const d = r.details || {};
  const out = [];
  if (d.preferredDay) out.push(d.preferredDay === 'any' ? 'Any day' : d.preferredDay);
  if (d.preferredTime) out.push(`from ${d.preferredTime}`);
  if (d.expectedStudents) out.push(`~${d.expectedStudents} pupils`);
  if (d.preferredRoom) out.push(`Room: ${d.preferredRoom}`);
  return out;
};
const CR_STATUS = { open: { label: 'Waiting for admin', tone: 'warning' }, actioned: { label: 'Done', tone: 'positive' }, declined: { label: 'Declined', tone: 'negative' } };

// ══════════════════════════════════════════════════════════════
//  Teacher — the request form (one modal, kind-driven fields)
// ══════════════════════════════════════════════════════════════
const RequestClassModal = ({ open, onClose, cls, defaultKind, onSent }) => {
  const store = useAdminStore();
  const me = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : { id: 't1', name: 'Heebz A' };
  const myClasses = window.teacherMetrics ? window.teacherMetrics.getMyClasses() : store.classes.filter(c => c.teacher === me.name);
  const blank = () => ({
    kind: defaultKind || (cls ? 'schedule' : 'new_class'), classId: cls ? cls.id : '',
    subject: '', yearGroup: '', level: '', preferredDay: 'any', preferredTime: '', expectedStudents: '',
    preferredRoom: '', body: '',
  });
  const [form, setForm] = React.useState(blank);
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (open) { setForm(blank()); setTouched(false); } }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const kind = crKind(form.kind);

  const errs = {
    classId: kind.needsClass && !form.classId ? 'Choose the class' : '',
    subject: form.kind === 'new_class' && !form.subject.trim() ? 'Which subject?' : '',
    yearGroup: form.kind === 'new_class' && !form.yearGroup ? 'Which year group?' : '',
    body: !form.body.trim() ? (form.kind === 'enrolment' ? 'Say who should be added, removed or moved' : 'Give your admin a reason') : '',
  };
  const valid = !Object.values(errs).some(Boolean);

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const details = {};
    if (form.kind === 'new_class') Object.assign(details, { subject: form.subject.trim(), yearGroup: form.yearGroup, level: form.level, expectedStudents: form.expectedStudents ? Number(form.expectedStudents) : null });
    if (form.kind === 'new_class' || form.kind === 'schedule') Object.assign(details, { preferredDay: form.preferredDay, preferredTime: form.preferredTime });
    if (form.kind === 'room') details.preferredRoom = form.preferredRoom.trim();
    const row = crCreate({ kind: form.kind, classId: form.classId || null, body: form.body, details, requestedBy: me.id, requestedByName: me.name });
    onSent && onSent(row);
    onClose();
  };

  const err = (k) => touched && errs[k];
  const showSlot = form.kind === 'new_class' || form.kind === 'schedule';

  return (
    <Modal open={open} onClose={onClose} icon="send" width={600}
      title={cls ? `Request a change · ${cls.group}` : 'Request a class or change'}
      subtitle="Your centre admin owns the timetable and enrolment. They'll see this in their Classes queue and reply here."
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="send" onClick={submit}>Send request</Btn></>}>
      <Field label="What do you need?">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {CR_KINDS.filter(k => !cls || k.id !== 'new_class').map(k => {
            const on = form.kind === k.id;
            return (
              <button key={k.id} type="button" onClick={() => set('kind', k.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 600 : 500,
                border: `1px solid ${on ? DS.accent : DS.border}`, background: on ? DS.accentLight : DS.bg,
                color: on ? DS.text : DS.sub,
              }}>
                <Icon name={k.icon} size={14} color={on ? DS.accent : DS.faint} />{k.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: DS.muted, marginTop: 6 }}>{kind.hint}</div>
      </Field>

      {form.kind !== 'new_class' && !cls && (
        <Field label={kind.needsClass ? 'Class' : 'Class (optional)'} required={kind.needsClass} error={err('classId')}>
          <Select value={form.classId} onChange={e => set('classId', e.target.value)} invalid={!!err('classId')}>
            <option value="">{kind.needsClass ? 'Choose a class…' : 'Not about one class'}</option>
            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name} · {c.group} · {c.day} {c.time}</option>)}
          </Select>
        </Field>
      )}

      {form.kind === 'new_class' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
          <Field label="Subject" required error={err('subject')}>
            <Input list="cr-subjects" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Physics" invalid={!!err('subject')} />
            <datalist id="cr-subjects">{(store.subjects || []).map(s => <option key={s.id} value={s.name} />)}</datalist>
          </Field>
          <Field label="Year group" required error={err('yearGroup')}>
            <Select value={form.yearGroup} onChange={e => set('yearGroup', e.target.value)} invalid={!!err('yearGroup')}>
              <option value="">Choose…</option>
              {(store.yearGroups || []).map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </Select>
          </Field>
          <Field label="Level">
            <Select value={form.level} onChange={e => set('level', e.target.value)}>
              <option value="">—</option>
              {(store.levels || []).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          </Field>
        </div>
      )}

      {showSlot && (
        <div style={{ display: 'grid', gridTemplateColumns: form.kind === 'new_class' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0 14px' }}>
          <Field label="Preferred day" hint="Your admin makes the final call.">
            <Select value={form.preferredDay} onChange={e => set('preferredDay', e.target.value)}>
              <option value="any">Any day</option>
              {CR_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Preferred start">
            <Input type="time" value={form.preferredTime} onChange={e => set('preferredTime', e.target.value)} icon="clock" />
          </Field>
          {form.kind === 'new_class' && (
            <Field label="Expected pupils">
              <Input type="number" min="1" value={form.expectedStudents} onChange={e => set('expectedStudents', e.target.value)} icon="users" placeholder="e.g. 8" />
            </Field>
          )}
        </div>
      )}

      {form.kind === 'room' && (
        <Field label="Room you'd prefer" hint="Optional — or describe what you need below.">
          <Input value={form.preferredRoom} onChange={e => set('preferredRoom', e.target.value)} icon="pin" placeholder="e.g. Room 5 (has a projector)" />
        </Field>
      )}

      <Field label={form.kind === 'enrolment' ? 'Who, and what change?' : 'Why?'} required error={err('body')}>
        <Textarea value={form.body} onChange={e => set('body', e.target.value)} invalid={!!err('body')}
          placeholder={form.kind === 'new_class' ? 'e.g. Six Year 10s are on the waiting list for Physics and two parents have asked.'
            : form.kind === 'enrolment' ? 'e.g. Move Aiden Foster from Group A to Group C — he needs the foundation pace.'
            : 'e.g. Three pupils now have a clash with their Saturday club.'} />
      </Field>
    </Modal>
  );
};

// The teacher's own requests, with status and the admin's reply. Shown on My
// Classes (all of them) and on a class's Settings tab (that class only).
const MyClassRequests = ({ classId, limit = 4, title = 'Your requests' }) => {
  const store = useAdminStore();
  const me = window.teacherMetrics ? window.teacherMetrics.getPrincipal() : { id: 't1' };
  const rows = useClassRequests({ teacherId: me.id, classId });
  const [all, setAll] = React.useState(false);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <Card title={title} actions={rows.length > limit ? [<Btn key="a" variant="ghost" small onClick={() => setAll(v => !v)}>{all ? 'Show fewer' : `Show all ${rows.length}`}</Btn>] : null}>
      <div>
        {shown.map((r, i) => {
          const st = CR_STATUS[r.status] || CR_STATUS.open;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: DS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={crKind(r.kind).icon} size={14} color={DS.muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{crTitle(r, store.classes)}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>Sent {crFmtDate(r.createdAt)}{r.decidedAt ? ` · answered ${crFmtDate(r.decidedAt)}` : ''}</div>
                {r.decisionNote && (
                  <div style={{ fontSize: 12.5, color: DS.sub, marginTop: 6, padding: '7px 10px', background: DS.surface, borderRadius: 7, borderLeft: `3px solid ${r.status === 'declined' ? DS.danger : DS.success}` }}>
                    {r.decisionNote}
                  </div>
                )}
              </div>
              <StatusPill tone={st.tone}>{st.label}</StatusPill>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ══════════════════════════════════════════════════════════════
//  Admin — the queue (a view of the Classes page)
// ══════════════════════════════════════════════════════════════
const ClassRequestsQueue = () => {
  const store = useAdminStore();
  const rows = useClassRequests();
  const [filter, setFilter] = React.useState('open');
  const [declining, setDeclining] = React.useState(null);   // request
  const [doneFor, setDoneFor] = React.useState(null);       // request
  const [note, setNote] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const shown = rows.filter(r => filter === 'all' || (filter === 'open' ? r.status === 'open' : r.status !== 'open'));
  const counts = { open: rows.filter(r => r.status === 'open').length, decided: rows.filter(r => r.status !== 'open').length };

  // Approving a new class = open Create-a-class prefilled (the admin still owns the
  // slot). AddClassPage marks the request actioned when the class is created.
  const createFrom = (r) => {
    const d = r.details || {};
    window.__classPrefill = {
      requestId: r.id, subject: d.subject, yearGroup: d.yearGroup, level: d.level,
      teacher: r.requestedByName, day: d.preferredDay && d.preferredDay !== 'any' ? d.preferredDay : null,
      startTime: d.preferredTime || null, capacity: d.expectedStudents || null, note: r.body,
    };
    adminNav('classes_add');
  };
  const openDecline = (r) => { setDeclining(r); setNote(''); setTouched(false); };
  const openDone = (r) => { setDoneFor(r); setNote(''); setTouched(false); };
  const confirmDecline = () => { setTouched(true); if (!note.trim()) return; crDecide(declining.id, 'declined', note); setDeclining(null); };
  const confirmDone = () => { crDecide(doneFor.id, 'actioned', note); setDoneFor(null); };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: DS.muted, maxWidth: 640 }}>
          Teachers can't change the timetable or enrolment themselves, so they ask here. A new-class request opens Create-a-class prefilled — you still choose the day, time and room.
        </div>
        <Segmented value={filter} onChange={setFilter} options={[
          { id: 'open', label: 'Waiting', count: counts.open },
          { id: 'decided', label: 'Answered', count: counts.decided },
          { id: 'all', label: 'All' },
        ]} />
      </div>
      <Card>
        {shown.length === 0 ? (
          <EmptyState icon="send" title={filter === 'open' ? 'No requests waiting' : 'Nothing here yet'}
            message={filter === 'open' ? 'When a teacher asks for a class or a change, it lands here.' : 'Answered requests appear here with your reply.'} />
        ) : shown.map((r, i) => {
          const cls = r.classId && store.classes.find(c => c.id === r.classId);
          const st = CR_STATUS[r.status] || CR_STATUS.open;
          const chips = crDetailChips(r);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderTop: i ? `1px solid ${DS.border}` : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: r.status === 'open' ? DS.warningBg : DS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={crKind(r.kind).icon} size={16} color={r.status === 'open' ? DS.warning : DS.muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{crTitle(r, store.classes)}</span>
                  <StatusPill tone={st.tone}>{r.status === 'open' ? 'Waiting' : st.label}</StatusPill>
                </div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 3 }}>From {r.requestedByName} · {crFmtDate(r.createdAt)}</div>
                <div style={{ fontSize: 13, color: DS.sub, marginTop: 8, lineHeight: 1.5 }}>{r.body}</div>
                {chips.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {chips.map(c => <span key={c} style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 6, background: DS.surface, border: `1px solid ${DS.border}`, color: DS.sub }}>{c}</span>)}
                  </div>
                )}
                {r.decisionNote && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 8 }}>Your reply: “{r.decisionNote}”</div>}
                {r.resultClassId && <div style={{ fontSize: 12.5, marginTop: 6 }}><a href="#" onClick={e => { e.preventDefault(); adminNav('class_detail', r.resultClassId); }} style={{ color: DS.accent }}>Open the class created from this request →</a></div>}
              </div>
              {r.status === 'open' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {r.kind === 'new_class'
                    ? <Btn variant="primary" icon="plus" small onClick={() => createFrom(r)}>Create class</Btn>
                    : <>
                        {cls && <Btn variant="secondary" icon="eye" small onClick={() => adminNav('class_detail', cls.id)}>Open class</Btn>}
                        <Btn variant="primary" icon="check" small onClick={() => openDone(r)}>Mark done</Btn>
                      </>}
                  <Btn variant="ghost" icon="x" small onClick={() => openDecline(r)}>Decline</Btn>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Modal open={!!declining} onClose={() => setDeclining(null)} icon="x" iconColor={DS.danger}
        title="Decline this request" subtitle="Your reason goes back to the teacher — they can't act on a bare “no”."
        footer={<><Btn variant="secondary" onClick={() => setDeclining(null)}>Cancel</Btn><Btn variant="primary" onClick={confirmDecline}>Decline request</Btn></>}>
        <Field label="Reason" required error={touched && !note.trim() ? 'A reason is required' : ''}>
          <Textarea value={note} onChange={e => setNote(e.target.value)} invalid={touched && !note.trim()} placeholder="e.g. Room 5 is booked on Thursdays until half-term — let's revisit in November." />
        </Field>
      </Modal>
      <Modal open={!!doneFor} onClose={() => setDoneFor(null)} icon="check" iconColor={DS.success}
        title="Mark as done" subtitle="Make the change on the class first, then close the request. A note is optional."
        footer={<><Btn variant="secondary" onClick={() => setDoneFor(null)}>Cancel</Btn><Btn variant="primary" icon="check" onClick={confirmDone}>Mark done</Btn></>}>
        <Field label="Note to the teacher" hint="Optional">
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Moved to Room 5 from next Thursday." />
        </Field>
      </Modal>
    </>
  );
};

Object.assign(window, {
  klasioClassRequests: { list: crList, create: crCreate, decide: crDecide, openCount: crOpenCount, KINDS: CR_KINDS },
  useClassRequests, RequestClassModal, MyClassRequests, ClassRequestsQueue,
});
