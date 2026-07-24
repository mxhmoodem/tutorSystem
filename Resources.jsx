// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — Resources (Materials library) + attachment mechanism
//
//  ONE library. The teacher page and the admin lens are the SAME component
//  (ResourcesPage) behind one page id (`resources`). Segments (All / Mine / Shared
//  with me / Requests) are filters over one list, never separate stores.
//
//  The governing distinction, enforced here:
//    • Materials (this module) are files — the only thing with a visibility setting,
//      a share button or a request affordance.
//    • Teaching + student records carry NONE of those. This module never renders a
//      share / visibility / request control on Progress, Tracking, Reports or
//      Attendance, and student submissions are never routed through here.
//
//  Attaching creates a POINTER (a resource_link). Nothing here duplicates a file.
//  "Used in N places" is COUNTED from resource_links at render — never stored.
//
//  Loaded after the data layers (see index.html). Everything cross-file is read
//  through window at render time, so load order vs the page modules isn't
//  load-bearing.
// ══════════════════════════════════════════════════════════════════════════════

const RES_STORE_KEY = 'klasio.resources.v1';

// ── Tone + type/visibility resolution (DS tokens only — no raw hex) ──────────────
const resToneColor = (name) => ({
  accent: DS.accent, success: DS.success, info: DS.info, warning: DS.warning,
  danger: DS.danger, muted: DS.muted, violet: shadeColor(DS.accent, -32),
}[name] || DS.muted);
const resType = (id) => (window.RES_TYPES || []).find(t => t.id === id) || { id, label: id, icon: 'file', tone: 'muted', studentDefault: true };
const resVis  = (id) => (window.RES_VISIBILITY || []).find(v => v.id === id) || { id, label: id, icon: 'file', desc: '' };

// Human date — '18 Apr 2026' from an ISO yyyy-mm-dd.
const resFmtDate = (iso) => {
  if (!iso) return '';
  const p = String(iso).split('-').map(Number);
  if (p.length < 3) return iso;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${p[2]} ${M[p[1] - 1]} ${p[0]}`;
};
const resFmtBytes = (n) => {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
const resTodayISO = () => new Date().toISOString().slice(0, 10);
const resNewId = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

// ── Store (localStorage, cross-instance reactive) ────────────────────────────────
const resListeners = new Set();
const resSeed = () => ({
  resources: JSON.parse(JSON.stringify(window.RES_RESOURCES_SEED || [])),
  shares:    JSON.parse(JSON.stringify(window.RES_SHARES_SEED || [])),
  requests:  JSON.parse(JSON.stringify(window.RES_REQUESTS_SEED || [])),
  links:     JSON.parse(JSON.stringify(window.RES_LINKS_SEED || [])),
  staff:     JSON.parse(JSON.stringify(window.RES_STAFF || [])),
  accessLog: [],            // D4 — admin opens of a private file
  actingTeacherId: 't1',    // demo: which teacher the teacher-lens is acting as
});
const resRead = () => {
  const seed = resSeed();
  try {
    const raw = localStorage.getItem(RES_STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        resources: p.resources || seed.resources,
        shares:    p.shares    || seed.shares,
        requests:  p.requests  || seed.requests,
        links:     p.links     || seed.links,
        staff:     p.staff     || seed.staff,
        accessLog: p.accessLog || [],
        actingTeacherId: p.actingTeacherId || 't1',
      };
    }
  } catch (e) { /* ignore malformed store */ }
  return seed;
};
const resWrite = (next) => {
  try { localStorage.setItem(RES_STORE_KEY, JSON.stringify(next)); } catch (e) {}
  resListeners.forEach(fn => fn(next));
  try { window.dispatchEvent(new CustomEvent('klasio-resources-changed')); } catch (e) {}
};

// ── Pure derivations over a snapshot ─────────────────────────────────────────────
const resStaffById = (st, id) => (st.staff || []).find(s => s.id === id) || null;
const resStaffName = (st, id) => { const s = resStaffById(st, id); return s ? s.name : 'Unknown'; };
const resIsActive  = (st, id) => { const s = resStaffById(st, id); return !!(s && s.active); };
const resById      = (st, id) => (st.resources || []).find(r => r.id === id) || null;

// Request routing (D5 / §5.4) — derived, never stored: the creator approves while
// active, otherwise it falls to the admin.
const resApproverFor = (st, res) => (res && resIsActive(st, res.created_by)) ? res.created_by : 'admin';

const resSharedTo = (st, resourceId, viewerId) =>
  (st.shares || []).some(s => s.resource_id === resourceId && s.staff_id === viewerId);

// Can the viewer OPEN the contents (not just see the row exists)?
const resCanOpen = (st, res, viewerId, isAdmin) => {
  if (!res) return false;
  if (res.created_by === viewerId) return true;
  if (res.visibility === 'centre') return true;
  if (resSharedTo(st, res.id, viewerId)) return true;
  if (isAdmin) {
    // Admin content access is deliberately gated (D4/D5): centre is open; on_request
    // opens via Override only once a request exists; private opens via a logged action.
    if (res.visibility === 'centre') return true;
    return false;
  }
  return false;
};

// Does the viewer's own pending request sit on this resource?
const resPendingBy = (st, resourceId, viewerId) =>
  (st.requests || []).some(r => r.resource_id === resourceId && r.requested_by === viewerId && r.status === 'pending');
const resHasPending = (st, resourceId) =>
  (st.requests || []).some(r => r.resource_id === resourceId && r.status === 'pending');

const resUsedCount = (st, resourceId) => (st.links || []).filter(l => l.resource_id === resourceId).length;
const resLinksForResource = (st, resourceId) => (st.links || []).filter(l => l.resource_id === resourceId);
const resLinksForContext = (st, type, id) => (st.links || []).filter(l => l.context_type === type && l.context_id === id);

// Rows the viewer may browse.
//   • admin  → every resource (private ones listed as metadata, D4)
//   • teacher→ own + centre + shared-to-me + others' on_request (locked). Others'
//     private never appears.
const resBrowseVisible = (st, viewerId, isAdmin) => (st.resources || []).filter(res => {
  if (isAdmin) return true;
  if (res.created_by === viewerId) return true;
  if (res.visibility === 'centre') return true;
  if (resSharedTo(st, res.id, viewerId)) return true;
  if (res.visibility === 'on_request') return true; // locked row
  return false; // others' private
});

// Pending requests this approver is responsible for.
const resPendingForApprover = (st, approverId) => (st.requests || []).filter(r =>
  r.status === 'pending' && resApproverFor(st, resById(st, r.resource_id)) === approverId);

// Count for the nav badge / topbar. role = 'teacher' | 'admin'.
window.resourceRequestCount = (role) => {
  try {
    const st = resRead();
    const who = role === 'admin' ? 'admin' : st.actingTeacherId;
    return resPendingForApprover(st, who).length;
  } catch (e) { return 0; }
};

const useResourcesStore = () => {
  const [state, setState] = React.useState(resRead);
  React.useEffect(() => {
    const fn = (next) => setState(next);
    resListeners.add(fn);
    return () => { resListeners.delete(fn); };
  }, []);

  // Every mutator reads the freshest snapshot from storage, so rapid sequential
  // writes never clobber each other on a stale closure.
  const mutate = (fn) => { const cur = resRead(); const next = fn(cur); resWrite(next); return next; };

  const setActing = (id) => mutate(s => ({ ...s, actingTeacherId: id }));

  const addResource = (fields) => {
    const id = resNewId('r');
    const res = {
      id,
      title: (fields.title || '').trim() || 'Untitled',
      description: fields.description || '',
      type: fields.type || 'other',
      subject: fields.subject || '',
      year_group: fields.year_group || '',
      exam_board: fields.exam_board || 'None',
      created_by: fields.created_by,
      visibility: fields.visibility || 'centre',
      size: fields.size || 0,
      created_at: resTodayISO(), updated_at: resTodayISO(),
    };
    mutate(s => ({ ...s, resources: [res, ...s.resources] }));
    return res;
  };
  const updateResource = (id, patch) => mutate(s => ({
    ...s, resources: s.resources.map(r => r.id === id ? { ...r, ...patch, updated_at: resTodayISO() } : r),
  }));
  const deleteResource = (id) => mutate(s => ({
    ...s,
    resources: s.resources.filter(r => r.id !== id),
    links: s.links.filter(l => l.resource_id !== id),
    shares: s.shares.filter(sh => sh.resource_id !== id),
    requests: s.requests.filter(rq => rq.resource_id !== id),
  }));

  const shareWith = (resourceId, staffIds, grantedBy) => mutate(s => {
    const at = resTodayISO();
    const existing = new Set(s.shares.filter(x => x.resource_id === resourceId).map(x => x.staff_id));
    const add = (staffIds || []).filter(id => !existing.has(id))
      .map(id => ({ resource_id: resourceId, staff_id: id, granted_by: grantedBy, granted_at: at }));
    return { ...s, shares: [...s.shares, ...add] };
  });
  const unshare = (resourceId, staffId) => mutate(s => ({
    ...s, shares: s.shares.filter(x => !(x.resource_id === resourceId && x.staff_id === staffId)),
  }));

  const requestAccess = (resourceId, requestedBy, note) => mutate(s => {
    if (s.requests.some(r => r.resource_id === resourceId && r.requested_by === requestedBy && r.status === 'pending')) return s;
    return { ...s, requests: [...s.requests, { id: resNewId('req'), resource_id: resourceId, requested_by: requestedBy, note: note || '', status: 'pending', decided_by: null, decided_at: null }] };
  });
  // Approve: grant the requester read access (a share) and close the request.
  const decideRequest = (requestId, decision, decidedBy) => mutate(s => {
    const req = s.requests.find(r => r.id === requestId);
    if (!req) return s;
    const requests = s.requests.map(r => r.id === requestId ? { ...r, status: decision, decided_by: decidedBy, decided_at: resTodayISO() } : r);
    let shares = s.shares;
    if (decision === 'approved' && !s.shares.some(x => x.resource_id === req.resource_id && x.staff_id === req.requested_by)) {
      shares = [...s.shares, { resource_id: req.resource_id, staff_id: req.requested_by, granted_by: decidedBy, granted_at: resTodayISO() }];
    }
    return { ...s, requests, shares };
  });

  // Attach = create a pointer. `student_visible` / `visible_from` live on the row (D9).
  const attach = (resourceId, contextType, contextId, opts, attachedBy) => mutate(s => {
    if (s.links.some(l => l.resource_id === resourceId && l.context_type === contextType && l.context_id === contextId)) return s;
    const o = opts || {};
    return { ...s, links: [...s.links, {
      id: resNewId('lnk'), resource_id: resourceId, context_type: contextType, context_id: contextId,
      student_visible: !!o.student_visible, visible_from: o.visible_from || null,
      attached_by: attachedBy, attached_at: resTodayISO(),
    }] };
  });
  const detach = (linkId) => mutate(s => ({ ...s, links: s.links.filter(l => l.id !== linkId) }));
  const updateLink = (linkId, patch) => mutate(s => ({ ...s, links: s.links.map(l => l.id === linkId ? { ...l, ...patch } : l) }));

  const logAccess = (resourceId, by) => mutate(s => ({
    ...s, accessLog: [{ id: resNewId('log'), resource_id: resourceId, by, at: new Date().toISOString() }, ...(s.accessLog || [])].slice(0, 200),
  }));

  // Offboarding (§5.4): deactivate a teacher, then optionally release their
  // restricted (on_request) files to the centre. Ownership never transfers —
  // created_by persists; routing falls to admin because the creator is now inactive.
  const deactivateStaff = (staffId) => mutate(s => ({ ...s, staff: s.staff.map(x => x.id === staffId ? { ...x, active: false } : x) }));
  const reactivateStaff = (staffId) => mutate(s => ({ ...s, staff: s.staff.map(x => x.id === staffId ? { ...x, active: true } : x) }));
  const releaseRestrictedToCentre = (staffId) => mutate(s => ({
    ...s, resources: s.resources.map(r => (r.created_by === staffId && r.visibility === 'on_request') ? { ...r, visibility: 'centre', updated_at: resTodayISO() } : r),
  }));

  return {
    ...state,
    setActing, addResource, updateResource, deleteResource,
    shareWith, unshare, requestAccess, decideRequest,
    attach, detach, updateLink, logAccess,
    deactivateStaff, reactivateStaff, releaseRestrictedToCentre,
  };
};

// ── Small presentational atoms ───────────────────────────────────────────────────
const ResTypeGlyph = ({ type, locked, size = 34 }) => {
  const t = resType(type);
  const col = locked ? DS.muted : resToneColor(t.tone);
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      background: locked ? DS.surface : col + '18', color: col,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: locked ? `1px solid ${DS.border}` : 'none',
    }}>
      <Icon name={locked ? 'lock' : t.icon} size={Math.round(size * 0.46)} />
    </div>
  );
};

// A quiet pill for type / year / board metadata.
const ResMetaPill = ({ children }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6,
    background: DS.surface, color: DS.muted, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
  }}>{children}</span>
);

// The visibility tag (own rows + admin lens).
const ResVisTag = ({ visibility }) => {
  const v = resVis(visibility);
  const tone = visibility === 'centre' ? 'neutral' : visibility === 'on_request' ? 'warning' : 'accent';
  return <StatusPill status={v.label} tone={tone} />;
};

// ── Visibility picker (all three values with their plain-English descriptions) ────
const ResVisibilityPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {(window.RES_VISIBILITY || []).map(v => {
      const on = value === v.id;
      return (
        <button key={v.id} type="button" onClick={() => onChange(v.id)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', width: '100%',
            padding: '11px 13px', borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${on ? DS.accent : DS.border}`,
            background: on ? DS.accentLight : DS.bg,
            boxShadow: on ? `0 0 0 3px ${DS.accentLight}` : 'none',
          }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: on ? DS.bg : DS.surface, color: on ? DS.accent : DS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={v.icon} size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? DS.accent : DS.text }}>{v.label}</div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 2, lineHeight: 1.45 }}>{v.desc}</div>
          </div>
          {on && <Icon name="check" size={16} color={DS.accent} />}
        </button>
      );
    })}
  </div>
);

// ── Add resource modal ───────────────────────────────────────────────────────────
const ResAddModal = ({ open, onClose, store, createdBy, prefill, onCreated }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState('worksheet');
  const [subject, setSubject] = React.useState('');
  const [year, setYear] = React.useState('');
  const [board, setBoard] = React.useState('None');
  const [visibility, setVisibility] = React.useState('centre'); // D2 default
  const [size, setSize] = React.useState(0);
  React.useEffect(() => {
    if (!open) return;
    setTitle((prefill && prefill.title) || '');
    setDescription(''); setType((prefill && prefill.type) || 'worksheet');
    setSubject((prefill && prefill.subject) || ''); setYear((prefill && prefill.year_group) || '');
    setBoard('None'); setVisibility('centre'); setSize((prefill && prefill.size) || 0);
  }, [open]);
  const subjects = (window.RES_TYPES ? Array.from(new Set(((window.RES_RESOURCES_SEED) || []).map(r => r.subject))) : []);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // D10 — a required title is prefilled from the filename; only lightweight
    // metadata is kept (never the bytes) so we never blow the localStorage quota.
    if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, ''));
    setSize(f.size || 0);
    e.target.value = '';
  };
  const save = () => {
    if (!title.trim()) return;
    const res = store.addResource({ title, description, type, subject, year_group: year, exam_board: board, visibility, size, created_by: createdBy });
    onCreated && onCreated(res);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a resource" icon="upload" width={560}
      subtitle="Files added here become part of your library, ready to reuse and attach anywhere."
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={!title.trim()}>Add resource</Btn></>}>
      <Field label="File">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px dashed ${DS.borderDark}`, borderRadius: 10, cursor: 'pointer', background: DS.surface }}>
          <Icon name="upload" size={16} color={DS.accent} />
          <span style={{ fontSize: 13, color: DS.sub }}>{size ? `Selected — ${resFmtBytes(size)}` : 'Choose a file (worksheet, slides, PDF, image…)'}</span>
          <input type="file" onChange={onFile} style={{ display: 'none' }} />
        </label>
      </Field>
      <Field label="Title" required><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quadratic Equations — Worksheet" /></Field>
      <Field label="Description"><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A line to help colleagues know what this is." style={{ minHeight: 60 }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Type"><Select value={type} onChange={e => setType(e.target.value)}>{(window.RES_TYPES || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></Field>
        <Field label="Subject"><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" list="res-subjects" />
          <datalist id="res-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist></Field>
        <Field label="Year group"><Select value={year} onChange={e => setYear(e.target.value)}><option value="">—</option>{(window.RES_YEAR_GROUPS || []).map(y => <option key={y} value={y}>{y}</option>)}</Select></Field>
        <Field label="Exam board"><Select value={board} onChange={e => setBoard(e.target.value)}>{(window.RES_EXAM_BOARDS || []).map(b => <option key={b} value={b}>{b}</option>)}</Select></Field>
      </div>
      <Field label="Who can see this"><ResVisibilityPicker value={visibility} onChange={setVisibility} /></Field>
    </Modal>
  );
};

// ── Share modal (multi-select of active teaching staff) ──────────────────────────
const ResShareModal = ({ open, onClose, store, resource, actingId }) => {
  const [picked, setPicked] = React.useState([]);
  React.useEffect(() => { if (open) setPicked([]); }, [open]);
  if (!resource) return null;
  const already = new Set((store.shares || []).filter(s => s.resource_id === resource.id).map(s => s.staff_id));
  const targets = (store.staff || []).filter(s => s.role === 'teacher' && s.active && s.id !== resource.created_by);
  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const save = () => { store.shareWith(resource.id, picked, actingId); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Share" icon="users" width={460}
      subtitle="Give named colleagues read access. Nothing is copied or moved — they simply get to open this file."
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="check" onClick={save} disabled={!picked.length}>Share with {picked.length || 'no one'}</Btn></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {targets.map(s => {
          const on = picked.includes(s.id);
          const has = already.has(s.id);
          return (
            <button key={s.id} type="button" disabled={has} onClick={() => toggle(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 9, border: 'none', textAlign: 'left', cursor: has ? 'default' : 'pointer', background: on ? DS.accentLight : 'transparent', opacity: has ? 0.6 : 1 }}>
              <Avatar name={s.name} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? DS.accent : DS.text }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: DS.muted }}>{s.subject || 'Staff'}</div>
              </div>
              {has ? <span style={{ fontSize: 11.5, color: DS.faint }}>Already shared</span> : on ? <Icon name="check" size={16} color={DS.accent} /> : null}
            </button>
          );
        })}
        {targets.length === 0 && <div style={{ fontSize: 13, color: DS.muted, padding: '8px 4px' }}>No other teaching staff to share with.</div>}
      </div>
    </Modal>
  );
};

// ── Request access modal ─────────────────────────────────────────────────────────
const ResRequestModal = ({ open, onClose, store, resource, actingId }) => {
  const [note, setNote] = React.useState('');
  React.useEffect(() => { if (open) setNote(''); }, [open]);
  if (!resource) return null;
  const approver = resApproverFor(store, resource);
  const routesTo = approver === 'admin' ? 'a centre admin' : resStaffName(store, approver);
  const send = () => { store.requestAccess(resource.id, actingId, note); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Request access" icon="lock" width={460}
      subtitle={`This request goes to ${routesTo}. They can approve it and you'll get read access.`}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="send" onClick={send}>Send request</Btn></>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 10, background: DS.surface, border: `1px solid ${DS.border}`, marginBottom: 14 }}>
        <ResTypeGlyph type={resource.type} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{resource.title}</div>
          <div style={{ fontSize: 12, color: DS.muted }}>{resource.subject} · {resStaffName(store, resource.created_by)}</div>
        </div>
      </div>
      <Field label="Add a note (optional)"><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Why you need it — e.g. covering a colleague's class next week." /></Field>
    </Modal>
  );
};

// ── Where-this-is-used drawer ────────────────────────────────────────────────────
const ResWhereUsedDrawer = ({ open, onClose, store, resource }) => {
  if (!resource) return null;
  const links = resLinksForResource(store, resource.id);
  const label = (l) => {
    if (l.context_type === 'lesson_plan') {
      const parts = String(l.context_id).split('__');
      return { kind: 'Lesson plan', icon: 'edit', primary: parts[0] || l.context_id, secondary: parts[1] ? resFmtDate(parts[1]) : '' };
    }
    if (l.context_type === 'homework') {
      const a = window.klasioResources && window.klasioResources.homeworkTitle ? window.klasioResources.homeworkTitle(l.context_id) : null;
      return { kind: 'Homework', icon: 'clip', primary: a || 'Homework assignment', secondary: '' };
    }
    return { kind: l.context_type, icon: 'file', primary: l.context_id, secondary: '' };
  };
  return (
    <SlideOver open={open} onClose={onClose} title="Where this is used" icon="link" width={440}
      subtitle={`${resource.title} — attached in ${links.length} place${links.length === 1 ? '' : 's'}.`}>
      {links.length === 0 ? (
        <EmptyState icon="link" title="Not attached anywhere yet" message="When this file is attached to a lesson plan or a homework assignment, those show up here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(l => {
            const m = label(l);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 10, border: `1px solid ${DS.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{m.primary}</div>
                  <div style={{ fontSize: 12, color: DS.muted }}>{m.kind}{m.secondary ? ` · ${m.secondary}` : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SlideOver>
  );
};

// ── Attach picker (searches the same library; upload path per D10) ───────────────
const ResAttachModal = ({ open, onClose, store, contextType, contextId, actingId, defaultStudentVisible }) => {
  const [q, setQ] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  React.useEffect(() => { if (open) setQ(''); }, [open]);
  const alreadyLinked = new Set(resLinksForContext(store, contextType, contextId).map(l => l.resource_id));
  // The library the acting teacher can attach = anything they can open.
  const openable = (store.resources || []).filter(r => resCanOpen(store, r, actingId, false));
  const ql = q.trim().toLowerCase();
  const matches = openable.filter(r => !ql || [r.title, r.description, r.subject, resType(r.type).label].filter(Boolean).join(' ').toLowerCase().includes(ql));
  const doAttach = (r) => {
    const t = resType(r.type);
    // Homework attachments carry the student-visibility default (D9); lesson-plan
    // attachments are staff-only unless the teacher turns them on.
    const student_visible = contextType === 'homework' ? (defaultStudentVisible != null ? defaultStudentVisible : t.studentDefault) : false;
    const visible_from = (contextType === 'homework' && student_visible) ? resTodayISO() : null;
    store.attach(r.id, contextType, contextId, { student_visible, visible_from }, actingId);
  };
  return (
    <>
      <Modal open={open && !showAdd} onClose={onClose} title="Attach a resource" icon="link" width={560}
        subtitle="Point to a file already in your library — nothing is copied. Or upload a new one, which lands in the library too."
        footer={<><Btn variant="secondary" icon="upload" onClick={() => setShowAdd(true)}>Upload new</Btn><Btn variant="primary" onClick={onClose}>Done</Btn></>}>
        <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search the library by title, subject, type…" style={{ marginBottom: 12 }} />
        <div style={{ maxHeight: 340, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matches.length === 0 && <div style={{ fontSize: 13, color: DS.muted, padding: '18px 4px', textAlign: 'center' }}>No resources match. Try Upload new.</div>}
          {matches.map(r => {
            const linked = alreadyLinked.has(r.id);
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, border: `1px solid ${DS.border}` }}>
                <ResTypeGlyph type={r.type} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: DS.muted }}>{resType(r.type).label} · {r.subject}{r.year_group ? ` · ${r.year_group}` : ''}</div>
                </div>
                {linked
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: DS.success }}><Icon name="check" size={14} color={DS.success} /> Attached</span>
                  : <Btn variant="secondary" small icon="link" onClick={() => doAttach(r)}>Attach</Btn>}
              </div>
            );
          })}
        </div>
      </Modal>
      <ResAddModal open={open && showAdd} onClose={() => setShowAdd(false)} store={store} createdBy={actingId}
        onCreated={(r) => { doAttach(r); setShowAdd(false); }} />
    </>
  );
};

// ── Reusable "Attached resources" panel (lesson plan + homework) ──────────────────
// ONE component both surfaces render — no duplication. `contextType` is
// 'lesson_plan' or 'homework'; `canEdit` gates the attach/remove/visibility
// controls (owners only). Homework rows expose the per-attachment student-visibility
// control (D9); lesson-plan rows don't (staff-only by default).
const AttachResourcesPanel = ({ contextType, contextId, canEdit, actingId, compact }) => {
  const store = useResourcesStore();
  const [attachOpen, setAttachOpen] = React.useState(false);
  const links = resLinksForContext(store, contextType, contextId);
  const who = actingId || store.actingTeacherId;
  const isHw = contextType === 'homework';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: links.length ? 12 : 0, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>Attached resources</span>
          <span style={{ fontSize: 12, color: DS.faint }}>{links.length}</span>
        </div>
        {canEdit && <Btn variant="secondary" small icon="link" onClick={() => setAttachOpen(true)}>Attach a resource</Btn>}
      </div>
      {links.length === 0 ? (
        <div style={{ fontSize: 12.5, color: DS.faint, padding: compact ? '4px 0' : '10px 0' }}>
          {canEdit ? 'No files attached yet. Attach from your library — nothing gets copied.' : 'No files attached.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(l => {
            const r = resById(store, l.resource_id);
            if (!r) return null;
            const t = resType(r.type);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 12px', border: `1px solid ${DS.border}`, borderRadius: 10 }}>
                <ResTypeGlyph type={r.type} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: DS.muted }}>{t.label} · {resFmtBytes(r.size)}</div>
                  {isHw && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" disabled={!canEdit}
                        onClick={() => store.updateLink(l.id, { student_visible: !l.student_visible, visible_from: !l.student_visible ? (l.visible_from || resTodayISO()) : l.visible_from })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', padding: 0, cursor: canEdit ? 'pointer' : 'default' }}>
                        <Toggle on={l.student_visible} />
                        <span style={{ fontSize: 12, color: DS.sub }}>{l.student_visible ? 'Visible to students' : 'Staff only'}</span>
                      </button>
                      {l.student_visible && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: DS.muted }}>
                          from
                          {canEdit ? (
                            <input type="date" value={l.visible_from || resTodayISO()} onChange={e => store.updateLink(l.id, { visible_from: e.target.value })}
                              style={{ border: `1px solid ${DS.border}`, borderRadius: 6, padding: '2px 6px', fontSize: 12, fontFamily: 'inherit', color: DS.text }} />
                          ) : <b style={{ color: DS.sub }}>{resFmtDate(l.visible_from)}</b>}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button type="button" title="Remove attachment" onClick={() => store.detach(l.id)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${DS.border}`, background: DS.surface, color: DS.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ResAttachModal open={attachOpen} onClose={() => setAttachOpen(false)} store={store}
        contextType={contextType} contextId={contextId} actingId={who} />
    </div>
  );
};

// ── One resource row ─────────────────────────────────────────────────────────────
const ResourceRow = ({ store, res, viewerId, isAdmin, onWhereUsed, onShare, onRequest, onOverride, onOpenPrivate, last }) => {
  const t = resType(res.type);
  const owner = resStaffName(store, res.created_by);
  const isOwner = res.created_by === viewerId;
  const canOpen = resCanOpen(store, res, viewerId, isAdmin);
  const locked = !isAdmin && !canOpen;             // teacher, others' on_request
  const sharedToMe = !isOwner && resSharedTo(store, res.id, viewerId);
  const used = resUsedCount(store, res.id);
  const requested = resPendingBy(store, res.id, viewerId);
  const hasPending = resHasPending(store, res.id);
  const showVisTag = isOwner || isAdmin;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
      borderBottom: last ? 'none' : `1px solid ${DS.border}`, opacity: locked ? 0.72 : 1,
    }}>
      <ResTypeGlyph type={res.type} locked={locked} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{res.title}</span>
          {showVisTag && <ResVisTag visibility={res.visibility} />}
          {sharedToMe && <StatusPill status="Shared with you" tone="accent" />}
        </div>
        {res.description && (
          <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 560 }}>{res.description}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12, color: DS.faint, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Avatar name={owner} size={16} /> {owner}</span>
          <span>{resFmtBytes(res.size)}</span>
          <span>Updated {resFmtDate(res.updated_at)}</span>
          {used > 0 && (
            <button type="button" onClick={() => onWhereUsed(res)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DS.accent, fontWeight: 600, fontSize: 12 }}>
              Used in {used} place{used === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      {/* Right-aligned metadata pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <ResMetaPill>{t.label}</ResMetaPill>
        {res.year_group && <ResMetaPill>{res.year_group}</ResMetaPill>}
        {res.exam_board && res.exam_board !== 'None' && <ResMetaPill>{res.exam_board}</ResMetaPill>}
      </div>

      {/* Trailing action */}
      <div style={{ flexShrink: 0, minWidth: 118, display: 'flex', justifyContent: 'flex-end' }}>
        {locked ? (
          requested
            ? <Btn variant="secondary" small disabled>Requested</Btn>
            : <Btn variant="secondary" small icon="lock" onClick={() => onRequest(res)}>Request access</Btn>
        ) : isAdmin ? (
          // Admin lens: Override only when a request is pending (D5); a logged Open
          // for private files (D4); otherwise a quiet kebab.
          hasPending
            ? <Btn variant="primary" small icon="shield" onClick={() => onOverride(res)}>Override</Btn>
            : res.visibility === 'private'
              ? <Btn variant="secondary" small icon="eye" onClick={() => onOpenPrivate(res)}>Open</Btn>
              : <RowActionsMenu items={[{ label: 'Where this is used', icon: 'link', onClick: () => onWhereUsed(res), disabled: used === 0 }]} />
        ) : (
          <RowActionsMenu items={[
            { label: 'Where this is used', icon: 'link', onClick: () => onWhereUsed(res), disabled: used === 0 },
            isOwner && { label: 'Share', icon: 'users', onClick: () => onShare(res) },
          ].filter(Boolean)} />
        )}
      </div>
    </div>
  );
};

// ── Requests panel (the Requests segment) ────────────────────────────────────────
const ResRequestsPanel = ({ store, viewerId, isAdmin }) => {
  const incoming = (store.requests || []).filter(r => r.status === 'pending' && resApproverFor(store, resById(store, r.resource_id)) === viewerId);
  const outgoing = isAdmin ? [] : (store.requests || []).filter(r => r.requested_by === viewerId);
  const Row = ({ r, incoming }) => {
    const res = resById(store, r.resource_id);
    if (!res) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', borderBottom: `1px solid ${DS.border}` }}>
        <ResTypeGlyph type={res.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{res.title}</div>
          <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>
            {incoming ? <>From <b style={{ color: DS.sub }}>{resStaffName(store, r.requested_by)}</b></> : <>To <b style={{ color: DS.sub }}>{resApproverFor(store, res) === 'admin' ? 'a centre admin' : resStaffName(store, res.created_by)}</b></>}
            {r.note ? ` · “${r.note}”` : ''}
          </div>
        </div>
        {r.status === 'pending' ? (
          incoming ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" small onClick={() => store.decideRequest(r.id, 'declined', viewerId)}>Decline</Btn>
              <Btn variant="primary" small icon="check" onClick={() => store.decideRequest(r.id, 'approved', viewerId)}>Approve</Btn>
            </div>
          ) : <StatusPill status="Pending" tone="warning" />
        ) : <StatusPill status={r.status === 'approved' ? 'Approved' : 'Declined'} tone={r.status === 'approved' ? 'positive' : 'neutral'} />}
      </div>
    );
  };
  const empty = !incoming.length && !outgoing.length;
  return (
    <Card>
      {empty ? (
        <EmptyState icon="lock" title="No requests" message="Requests to open a colleague's on-request file show up here, ready to approve." />
      ) : (
        <div>
          {incoming.length > 0 && <div style={{ padding: '10px 18px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Needs your decision</div>}
          {incoming.map(r => <Row key={r.id} r={r} incoming />)}
          {outgoing.length > 0 && <div style={{ padding: '14px 18px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Your requests</div>}
          {outgoing.map(r => <Row key={r.id} r={r} incoming={false} />)}
        </div>
      )}
    </Card>
  );
};

// ── The Resources page (teacher lens + admin lens) ───────────────────────────────
const FILTER_ALL = '__all__';
const ResourcesPage = ({ role }) => {
  const store = useResourcesStore();
  const isAdmin = role === 'admin';
  const viewerId = isAdmin ? 'admin' : store.actingTeacherId;

  const [seg, setSeg] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [fSubject, setFSubject] = React.useState(FILTER_ALL);
  const [fYear, setFYear] = React.useState(FILTER_ALL);
  const [fType, setFType] = React.useState(FILTER_ALL);
  const [fBoard, setFBoard] = React.useState(FILTER_ALL);
  const [addOpen, setAddOpen] = React.useState(false);
  const [whereRes, setWhereRes] = React.useState(null);
  const [shareRes, setShareRes] = React.useState(null);
  const [reqRes, setReqRes] = React.useState(null);
  const [privateNote, setPrivateNote] = React.useState(null);

  React.useEffect(() => { if (isAdmin && (seg === 'mine' || seg === 'shared' || seg === 'requests')) setSeg('all'); }, [isAdmin]);

  const base = resBrowseVisible(store, viewerId, isAdmin);
  const pendingCount = resPendingForApprover(store, viewerId).length;

  // Segment filter
  const segFiltered = base.filter(r => {
    if (isAdmin) return true;
    if (seg === 'mine') return r.created_by === viewerId;
    if (seg === 'shared') return r.created_by !== viewerId && resSharedTo(store, r.id, viewerId);
    return true; // 'all'
  });

  // Search + dropdown filters
  const ql = q.trim().toLowerCase();
  const filtered = segFiltered.filter(r => {
    if (fSubject !== FILTER_ALL && r.subject !== fSubject) return false;
    if (fYear !== FILTER_ALL && r.year_group !== fYear) return false;
    if (fType !== FILTER_ALL && r.type !== fType) return false;
    if (fBoard !== FILTER_ALL && r.exam_board !== fBoard) return false;
    if (!ql) return true;
    const hay = [r.title, r.description, r.subject, resType(r.type).label, resStaffName(store, r.created_by)].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(ql);
  });

  // Group by subject
  const groups = {};
  filtered.forEach(r => { (groups[r.subject || 'Other'] = groups[r.subject || 'Other'] || []).push(r); });
  const groupKeys = Object.keys(groups).sort();

  const subjects = Array.from(new Set(base.map(r => r.subject).filter(Boolean))).sort();

  const Dropdown = ({ value, onChange, allLabel, options }) => (
    <Select value={value} onChange={e => onChange(e.target.value)} style={{ minWidth: 130 }}>
      <option value={FILTER_ALL}>{allLabel}</option>
      {options.map(o => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
    </Select>
  );

  const segments = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'Mine' },
    { id: 'shared', label: 'Shared with me' },
    { id: 'requests', label: 'Requests', count: pendingCount || undefined },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <PageHeader
          title="Resources"
          subtitle={isAdmin ? 'Every file in the centre’s library — with owner, size and visibility.' : 'The centre’s shared library of teaching materials.'}
          actions={<Btn variant="primary" icon="upload" onClick={() => setAddOpen(true)}>Add resource</Btn>}
        />

        {/* Acting-teacher switcher (teacher lens only) — this prototype has one
            teacher persona; the picker lets you act as any teacher so shares and
            requests can be demonstrated end to end. */}
        {!isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: DS.muted }}>Viewing as</span>
            <Select value={store.actingTeacherId} onChange={e => store.setActing(e.target.value)} style={{ width: 200 }}>
              {(store.staff || []).filter(s => s.role === 'teacher').map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (deactivated)'}</option>)}
            </Select>
          </div>
        )}

        {/* Standing note */}
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 15px', marginBottom: 18, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10 }}>
          <Icon name={isAdmin ? 'shield' : 'folder'} size={17} color={DS.accent} />
          <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.5 }}>
            {isAdmin
              ? <><strong style={{ color: DS.text }}>Private files are listed here for storage and offboarding.</strong> Only their owner can read the contents — opening one is recorded in the access log. Override appears on a file only while someone is waiting on a request for it.</>
              : <><strong style={{ color: DS.text }}>Files land here automatically when you attach them to a lesson or homework.</strong> New files are centre-wide by default, so colleagues can reuse them. Lock a file to <em>On request</em> or <em>Private</em> when it shouldn’t be open to everyone.</>}
          </div>
        </div>

        {/* Segments — teacher lens only */}
        {!isAdmin && <div style={{ marginBottom: 16 }}><Segmented options={segments} value={seg} onChange={setSeg} /></div>}

        {seg === 'requests' && !isAdmin ? (
          <ResRequestsPanel store={store} viewerId={viewerId} isAdmin={isAdmin} />
        ) : (
          <>
            {/* Search + filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, description, subject, type or owner…" style={{ minWidth: 260, flex: 1 }} />
              <Dropdown value={fSubject} onChange={setFSubject} allLabel="All subjects" options={subjects} />
              <Dropdown value={fYear} onChange={setFYear} allLabel="All years" options={window.RES_YEAR_GROUPS || []} />
              <Dropdown value={fType} onChange={setFType} allLabel="All types" options={window.RES_TYPES || []} />
              <Dropdown value={fBoard} onChange={setFBoard} allLabel="All boards" options={(window.RES_EXAM_BOARDS || []).filter(b => b !== 'None')} />
            </div>

            {groupKeys.length === 0 ? (
              <Card><EmptyState icon="search" title="No resources found" message="Try a different search or clear the filters." /></Card>
            ) : groupKeys.map(subj => (
              <div key={subj} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 8px' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DS.muted }}>{subj}</span>
                  <span style={{ fontSize: 11, color: DS.faint }}>{groups[subj].length}</span>
                </div>
                <Card>
                  {groups[subj].map((r, i) => (
                    <ResourceRow key={r.id} store={store} res={r} viewerId={viewerId} isAdmin={isAdmin}
                      last={i === groups[subj].length - 1}
                      onWhereUsed={setWhereRes} onShare={setShareRes} onRequest={setReqRes}
                      onOverride={(res) => {
                        const req = (store.requests || []).find(x => x.resource_id === res.id && x.status === 'pending');
                        if (req) { store.decideRequest(req.id, 'approved', 'admin'); store.logAccess(res.id, 'admin'); }
                      }}
                      onOpenPrivate={(res) => { store.logAccess(res.id, 'admin'); setPrivateNote(res); }} />
                  ))}
                </Card>
              </div>
            ))}
          </>
        )}
      </div>

      <ResAddModal open={addOpen} onClose={() => setAddOpen(false)} store={store} createdBy={viewerId} />
      <ResWhereUsedDrawer open={!!whereRes} onClose={() => setWhereRes(null)} store={store} resource={whereRes} />
      <ResShareModal open={!!shareRes} onClose={() => setShareRes(null)} store={store} resource={shareRes} actingId={viewerId} />
      <ResRequestModal open={!!reqRes} onClose={() => setReqRes(null)} store={store} resource={reqRes} actingId={viewerId} />
      <Modal open={!!privateNote} onClose={() => setPrivateNote(null)} title="Access recorded" icon="eye" width={420}
        footer={<Btn variant="primary" onClick={() => setPrivateNote(null)}>Close</Btn>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>
          Opening <b style={{ color: DS.text }}>{privateNote && privateNote.title}</b> has been written to the access log, attributed to you. The owner keeps ownership — this is for storage and offboarding oversight, not routine review.
        </div>
      </Modal>
    </div>
  );
};

// ── Admin session detail (a read-only view within Schedule, §4.4) ────────────────
// Answers "what happened in Y10 Maths on <date>": who taught it, attendance, the
// lesson plan, homework set, and the resources used. No share affordance anywhere.
const ResourceSessionDetail = ({ classId, date, onBack }) => {
  const store = useResourcesStore();
  const admin = window.useAdminStore ? window.useAdminStore() : null;
  const cls = admin ? (admin.classes || []).find(c => c.id === classId) : null;
  if (!cls) return (
    <div style={{ padding: 32 }}>
      <Btn variant="secondary" icon="chevron_l" small onClick={onBack}>Back to schedule</Btn>
      <div style={{ marginTop: 20 }}><EmptyState icon="calendar" title="Session not found" /></div>
    </div>
  );

  const planKey = `${cls.group}__${date}`;
  const plan = (window.__lessonPlans || {})[planKey];
  const planLinks = resLinksForContext(store, 'lesson_plan', planKey);

  // Homework whose class matches, set around this date (best-effort, read-only).
  const hwStore = window.klasioResources && window.klasioResources.homeworkForClass ? window.klasioResources.homeworkForClass(cls.group) : [];
  const hwLinks = [];
  hwStore.forEach(h => resLinksForContext(store, 'homework', h.id).forEach(l => hwLinks.push({ link: l, hw: h })));

  const allResIds = new Set([...planLinks.map(l => l.resource_id), ...hwLinks.map(x => x.link.resource_id)]);
  const usedResources = Array.from(allResIds).map(id => resById(store, id)).filter(Boolean);

  const Section = ({ icon, title, children }) => (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${DS.border}` }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={15} /></div>
        <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{title}</span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </Card>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Btn variant="secondary" icon="chevron_l" small onClick={onBack}>Back to schedule</Btn>
          <Btn variant="secondary" icon="book" small onClick={() => { window.__adminParam = classId; window.__navigate && window.__navigate('admin', 'class_detail'); }}>View class record</Btn>
        </div>
        <div style={{ margin: '16px 0 6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: DS.surface, color: DS.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <Icon name="calendar" size={12} /> Session · read-only
          </div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.text, margin: '4px 0 2px', letterSpacing: '-0.4px' }}>{cls.name} — {resFmtDate(date)}</h1>
        <p style={{ fontSize: 14, color: DS.muted, margin: '0 0 22px' }}>{cls.group} · {cls.room || 'No room'} · Taught by {cls.teacher}</p>

        <Section icon="check" title="Attendance">
          {(() => {
            const sid = `${classId}|${date}`;
            let att = window.klasioResources && window.klasioResources.attendanceForSession ? window.klasioResources.attendanceForSession(classId, date) : null;
            // Fall back to the seeded delivered-register list so a seeded occurrence
            // still shows who was present without re-running the register flow.
            if (!att && (window.ATT_SEED_DELIVERED || []).some(x => x.sessionId === sid)) {
              att = { by: cls.teacher, present: cls.students || 0, absent: 0, late: 0 };
            }
            if (!att) return <div style={{ fontSize: 13, color: DS.muted }}>No register recorded for this occurrence.</div>;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: DS.sub }}>Taken by <b>{att.by || cls.teacher}</b></span>
                <span style={{ fontSize: 13, color: DS.success, fontWeight: 600 }}>{att.present} present</span>
                {att.absent ? <span style={{ fontSize: 13, color: DS.danger, fontWeight: 600 }}>{att.absent} absent</span> : null}
                {att.late ? <span style={{ fontSize: 13, color: DS.warning, fontWeight: 600 }}>{att.late} late</span> : null}
              </div>
            );
          })()}
        </Section>

        <Section icon="edit" title="Lesson plan">
          {plan ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: DS.text }}>{plan.plan.title || 'Untitled lesson'}</div>
              {plan.plan.topic && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{plan.plan.topic}</div>}
              {plan.plan.objectives && <div style={{ fontSize: 13, color: DS.sub, marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{plan.plan.objectives}</div>}
            </div>
          ) : <div style={{ fontSize: 13, color: DS.muted }}>No lesson plan recorded for this occurrence.</div>}
        </Section>

        <Section icon="clip" title="Homework set">
          {hwStore.length === 0 ? <div style={{ fontSize: 13, color: DS.muted }}>No homework linked to this class.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hwStore.slice(0, 6).map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: DS.warningBg, color: DS.warning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="clip" size={13} /></div>
                  <span style={{ fontSize: 13, color: DS.sub, flex: 1 }}>{h.title}</span>
                  {h.due && <span style={{ fontSize: 12, color: DS.faint }}>Due {h.due}</span>}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon="folder" title="Resources used">
          {usedResources.length === 0 ? <div style={{ fontSize: 13, color: DS.muted }}>No resources attached to this session’s plan or homework.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {usedResources.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <ResTypeGlyph type={r.type} size={28} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: DS.muted }}>{resType(r.type).label} · {resStaffName(store, r.created_by)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

// ── Offboarding step (Staff → Deactivate, §5.4) ──────────────────────────────────
// Shows the leaver's resource counts split by visibility and offers a single
// "Release restricted to the centre" action (on_request → centre). Ownership never
// transfers.
const OffboardResourcesStep = ({ staffId, staffName, onDone }) => {
  const store = useResourcesStore();
  const mine = (store.resources || []).filter(r => r.created_by === staffId);
  const byVis = { centre: 0, on_request: 0, private: 0 };
  mine.forEach(r => { byVis[r.visibility] = (byVis[r.visibility] || 0) + 1; });
  const isActive = resIsActive(store, staffId);
  const Stat = ({ label, n, tone }) => (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 10, border: `1px solid ${DS.border}`, background: DS.bg }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: tone || DS.text }}>{n}</div>
      <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, marginBottom: 16 }}>
        <b style={{ color: DS.text }}>{staffName}</b> {isActive ? 'is still active.' : 'has been deactivated.'} Their files stay attributed to them — ownership never transfers. Releasing restricted files opens their <em>On request</em> files to the centre so classes keep running; private files stay private and remain reachable by an admin for individual review. Any request on one of their files now routes to an admin.
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Stat label="Centre-wide" n={byVis.centre} />
        <Stat label="On request" n={byVis.on_request} tone={byVis.on_request ? DS.warning : DS.text} />
        <Stat label="Private" n={byVis.private} tone={byVis.private ? DS.muted : DS.text} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onDone}>Close</Btn>
        <Btn variant="primary" icon="users" disabled={!byVis.on_request}
          onClick={() => { store.releaseRestrictedToCentre(staffId); }}>
          Release restricted to the centre{byVis.on_request ? ` (${byVis.on_request})` : ''}
        </Btn>
      </div>
    </div>
  );
};

// ── Per-teacher storage breakdown (admin Storage page, §4.5) ─────────────────────
// Totals + a per-teacher split with restricted-file counts, derived live from the
// resources store. Restricted = on_request + private (the files that don't fall to
// the centre automatically). The offboarding action lives on the Staff page (§5.4).
const ResStorageBreakdown = () => {
  const store = useResourcesStore();
  const byOwner = {};
  (store.resources || []).forEach(r => {
    const o = byOwner[r.created_by] || (byOwner[r.created_by] = { files: 0, size: 0, restricted: 0 });
    o.files++; o.size += r.size || 0;
    if (r.visibility !== 'centre') o.restricted++;
  });
  const rows = Object.keys(byOwner)
    .map(id => ({ id, name: resStaffName(store, id), active: resIsActive(store, id), ...byOwner[id] }))
    .sort((a, b) => b.size - a.size);
  const totalFiles = rows.reduce((n, r) => n + r.files, 0);
  const totalSize = rows.reduce((n, r) => n + r.size, 0);
  const totalRestricted = rows.reduce((n, r) => n + r.restricted, 0);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: DS.text, marginBottom: 4 }}>Resources by teacher</div>
      <div style={{ fontSize: 13, color: DS.muted, marginBottom: 14 }}>{totalFiles} files · {resFmtBytes(totalSize)} · {totalRestricted} restricted (on-request or private)</div>
      <Card>
        <Table
          cols={['Teacher', { label: 'Files', align: 'right' }, { label: 'Size', align: 'right' }, { label: 'Restricted', align: 'right' }, 'Status']}
          rows={rows.map(r => [
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Avatar name={r.name} size={26} /> {r.name}</span>,
            r.files, resFmtBytes(r.size), r.restricted,
            <StatusPill status={r.active ? 'Active' : 'Inactive'} tone={r.active ? 'positive' : 'neutral'} />,
          ])}
        />
      </Card>
    </div>
  );
};

// ── Cross-file API (read helpers other modules render against) ───────────────────
window.klasioResources = {
  // Staff offboarding bridge (§5.4) — imperative helpers so the admin Staff page
  // can deactivate/reactivate and release restricted files without the store hook.
  // Ownership never transfers; deactivating only flips the active flag, which makes
  // request routing fall to admin (derived, resApproverFor).
  staffIdByName: (name) => { const s = resRead(); const m = (s.staff || []).find(x => x.name === name); return m ? m.id : null; },
  isStaffActive: (staffId) => { const s = resRead(); const m = (s.staff || []).find(x => x.id === staffId); return !!(m && m.active); },
  countsByOwner: (staffId) => {
    const s = resRead(); const out = { centre: 0, on_request: 0, private: 0, total: 0 };
    (s.resources || []).forEach(r => { if (r.created_by === staffId) { out[r.visibility] = (out[r.visibility] || 0) + 1; out.total++; } });
    return out;
  },
  deactivate: (staffId) => { const s = resRead(); resWrite({ ...s, staff: (s.staff || []).map(x => x.id === staffId ? { ...x, active: false } : x) }); },
  reactivate: (staffId) => { const s = resRead(); resWrite({ ...s, staff: (s.staff || []).map(x => x.id === staffId ? { ...x, active: true } : x) }); },
  // Derived "used in N places" for a resource, and the attachment count on a
  // context — read from the live store (seed-or-stored), never a persisted rollup.
  usedCount: (resourceId) => resUsedCount(resRead(), resourceId),
  contextLinkCount: (type, id) => resLinksForContext(resRead(), type, id).length,
  // Homework helpers — bridge into the Homework store (homework_store_v6) so the
  // where-used drawer + session detail can label homework contexts. Kept defensive.
  homeworkTitle: (assignmentId) => {
    try {
      const raw = localStorage.getItem('homework_store_v6');
      if (!raw) return null;
      const s = JSON.parse(raw);
      const a = s.assignments && s.assignments[assignmentId];
      return a ? (a.title || 'Untitled homework') : null;
    } catch (e) { return null; }
  },
  homeworkForClass: (classLabel) => {
    try {
      const raw = localStorage.getItem('homework_store_v6');
      if (!raw) return [];
      const s = JSON.parse(raw);
      return Object.values(s.assignments || {})
        .filter(a => a.classLabel === classLabel && a.status !== 'draft')
        .map(a => ({ id: a.id, title: a.title || 'Untitled homework', due: a.dueAt ? String(a.dueAt).slice(0, 10) : '' }));
    } catch (e) { return []; }
  },
  // Attendance for a materialised session (classId|date). Reads the attendance
  // store defensively; returns null when no register exists.
  attendanceForSession: (classId, date) => {
    try {
      const raw = localStorage.getItem('tutoros.attendance.v1');
      if (!raw) return null;
      const s = JSON.parse(raw);
      const rec = (s.registers || s.sessions || {})[`${classId}|${date}`];
      if (!rec || !rec.marks) return null;
      const vals = Object.values(rec.marks);
      const count = (k) => vals.filter(v => v === k).length;
      return { by: rec.by || rec.submittedBy || null, present: count('present'), absent: count('absent'), late: count('late') };
    } catch (e) { return null; }
  },
};

Object.assign(window, {
  useResourcesStore, ResourcesPage, AttachResourcesPanel, ResourceSessionDetail, OffboardResourcesStep,
  ResStorageBreakdown, resFmtBytes, resType, resVis,
});
