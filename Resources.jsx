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
const resType = (id) => (window.RES_TYPES || []).find(t => t.id === id) || { id, label: id, icon: 'file', tone: 'muted', studentDefault: true };
const resVis  = (id) => (window.RES_VISIBILITY || []).find(v => v.id === id) || { id, label: id, icon: 'file', desc: '' };

// Level (key-stage band) is derived from the year group unless a resource carries
// an explicit `level`. One resolver so the facet filter, the row meta and the add
// form always agree. Seeds predate the field, so they resolve via the year group.
const RES_LEVELS = ['GCSE', 'A-Level'];
const resDeriveLevel = (year) => (year === 'Year 12' || year === 'Year 13') ? 'A-Level' : 'GCSE';
const resLevel = (res) => (res && res.level) ? res.level : resDeriveLevel(res && res.year_group);

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
  usage_events: [],         // Stage 5 — append-only attach history (survives detach)
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
        usage_events: p.usage_events || [],
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

// Active centre (multi-tenant stamp for usage events — the store itself is still
// single-tenant, so this is captured for later, defensively). Returns null if unset.
const resActiveCentre = () => { try { return localStorage.getItem('tutoros.activeCentre') || null; } catch (e) { return null; } };

// Topic at attach time (Stage 5) — read from wherever the context already knows
// what it's about. Lesson plans carry an explicit `topic`; homework may too. This
// is where the lesson knows its subject, so retrofitting is avoided. Best-effort.
const resTopicForContext = (contextType, contextId) => {
  try {
    if (contextType === 'lesson_plan') {
      const p = (window.__lessonPlans || {})[contextId];
      return (p && p.plan && p.plan.topic) ? p.plan.topic : '';
    }
    if (contextType === 'homework') {
      const raw = localStorage.getItem('homework_store_v6');
      if (!raw) return '';
      const s = JSON.parse(raw);
      const a = s.assignments && s.assignments[contextId];
      return a ? (a.topic || '') : '';
    }
  } catch (e) {}
  return '';
};

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
      level: fields.level || resDeriveLevel(fields.year_group),
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
  // Stage 5: every attach also writes an append-only usage_event. The link is the
  // live pointer (removed on detach); the event is history (never removed), so the
  // day relevance ranking is wanted it has a real signal to rank on. Topic + centre
  // are captured here, where the context already knows them.
  const attach = (resourceId, contextType, contextId, opts, attachedBy) => mutate(s => {
    if (s.links.some(l => l.resource_id === resourceId && l.context_type === contextType && l.context_id === contextId)) return s;
    const o = opts || {};
    const at = new Date().toISOString();
    const event = {
      id: resNewId('use'), resource_id: resourceId, user: attachedBy, centre: resActiveCentre(),
      context_type: contextType, context_id: contextId, topic: resTopicForContext(contextType, contextId), at,
    };
    return { ...s,
      links: [...s.links, {
        id: resNewId('lnk'), resource_id: resourceId, context_type: contextType, context_id: contextId,
        student_visible: !!o.student_visible, visible_from: o.visible_from || null,
        attached_by: attachedBy, attached_at: resTodayISO(),
      }],
      usage_events: [event, ...(s.usage_events || [])].slice(0, 500),
    };
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
// Greyscale tile (Stage 2): the glyph SHAPE carries the type; the background no
// longer re-encodes it in colour. One accent is reserved for interaction only.
const ResTypeGlyph = ({ type, locked, size = 34 }) => {
  const t = resType(type);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: DS.surface, color: locked ? DS.faint : DS.sub,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${DS.border}`,
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

// The access chip. Colour discipline (Stage 2): centre-wide is the norm and gets
// NO badge — colour is reserved for exceptions. On request = warning (amber),
// Private = neutral grey. If nothing is coloured, the file is normal.
const ResVisTag = ({ visibility }) => {
  if (visibility === 'centre') return null;
  const tone = visibility === 'on_request' ? 'warning' : 'neutral';
  return <StatusPill status={resVis(visibility).label} tone={tone} />;
};

// ── Add resource modal ───────────────────────────────────────────────────────────
// One file in, lots of things able to point at it. The visibility Select carries a
// plain-English line under the footer; Level is captured explicitly (and defaults
// off the chosen Year). The attach toggle is a signpost — attaching itself always
// happens from a lesson or homework via AttachResourcesPanel (nothing is copied).
const ResAddModal = ({ open, onClose, store, createdBy, prefill, onCreated }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState('worksheet');
  const [subject, setSubject] = React.useState('');
  const [year, setYear] = React.useState('');
  const [level, setLevel] = React.useState('GCSE');
  const [board, setBoard] = React.useState('None');
  const [visibility, setVisibility] = React.useState('centre'); // D2 default
  const [size, setSize] = React.useState(0);
  const [fileName, setFileName] = React.useState('');
  const [alsoAttach, setAlsoAttach] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setTitle((prefill && prefill.title) || '');
    setDescription(''); setType((prefill && prefill.type) || 'worksheet');
    setSubject((prefill && prefill.subject) || ''); setYear((prefill && prefill.year_group) || '');
    setLevel(resDeriveLevel((prefill && prefill.year_group) || ''));
    setBoard('None'); setVisibility('centre'); setSize((prefill && prefill.size) || 0);
    setFileName(''); setAlsoAttach(false);
  }, [open]);
  const subjects = Array.from(new Set(((window.RES_RESOURCES_SEED) || []).map(r => r.subject))).filter(Boolean);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // D10 — a required title is prefilled from the filename; only lightweight
    // metadata is kept (never the bytes) so we never blow the localStorage quota.
    if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, ''));
    setSize(f.size || 0); setFileName(f.name);
    e.target.value = '';
  };
  const save = () => {
    if (!title.trim()) return;
    const res = store.addResource({ title, description, type, subject, year_group: year, level, exam_board: board, visibility, size, created_by: createdBy });
    onCreated && onCreated(res);
    onClose();
  };
  const ownerName = resStaffName(store, createdBy);
  const twoCol = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
  return (
    <Modal open={open} onClose={onClose} title="Add to Resources" icon="cloud" width={560}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
          <span style={{ fontSize: 12, color: DS.muted }}>{resVis(visibility).desc}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="cloud" onClick={save} disabled={!title.trim()}>Add to library</Btn>
          </div>
        </div>
      }>
      {/* Drop zone (simulated — only lightweight metadata is kept) */}
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 7, textAlign: 'center', padding: '26px 20px', marginBottom: 16, cursor: 'pointer',
        border: `1.5px dashed ${size ? DS.accentBorder : DS.borderDark}`, borderRadius: 12,
        background: size ? DS.accentLight : DS.surface,
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: DS.bg, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${DS.accentBorder}` }}>
          <Icon name={size ? 'check' : 'cloud'} size={21} color={DS.accent} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{size ? (fileName || 'File selected') : 'Choose a file to add'}</div>
        <div style={{ fontSize: 12, color: DS.muted }}>{size ? `Simulated upload — ${resFmtBytes(size)}` : 'Simulated upload — nothing leaves your browser'}</div>
        <input type="file" onChange={onFile} style={{ display: 'none' }} />
      </label>

      <Field label="Title" required><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Quadratics — Mixed Practice" /></Field>
      <Field label="Note"><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's in it, how you use it" /></Field>

      <div style={twoCol}>
        <Field label="Type"><Select value={type} onChange={e => setType(e.target.value)}>{(window.RES_TYPES || []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></Field>
        <Field label="Visibility"><Select value={visibility} onChange={e => setVisibility(e.target.value)}>{(window.RES_VISIBILITY || []).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</Select></Field>
      </div>
      <div style={twoCol}>
        <Field label="Subject">
          <Select value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">—</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Board"><Select value={board} onChange={e => setBoard(e.target.value)}>{(window.RES_EXAM_BOARDS || []).map(b => <option key={b} value={b}>{b}</option>)}</Select></Field>
      </div>
      <div style={twoCol}>
        <Field label="Level"><Select value={level} onChange={e => setLevel(e.target.value)}>{RES_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</Select></Field>
        <Field label="Year"><Select value={year} onChange={e => setYear(e.target.value)}><option value="">—</option>{(window.RES_YEAR_GROUPS || []).map(y => <option key={y} value={y}>{y}</option>)}</Select></Field>
      </div>

      {/* Attach signpost — the actual pointer is created from a lesson/homework */}
      <button type="button" onClick={() => setAlsoAttach(a => !a)}
        style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '11px 13px', borderRadius: 10, border: `1px solid ${DS.border}`, background: DS.surface, cursor: 'pointer', marginBottom: alsoAttach ? 10 : 14 }}>
        <Icon name="link" size={16} color={DS.accent} />
        <span style={{ flex: 1, fontSize: 13, color: DS.sub, fontWeight: 500 }}>Also attach to a lesson or homework</span>
        <Toggle on={alsoAttach} />
      </button>
      {alsoAttach && (
        <div style={{ fontSize: 12, color: DS.muted, lineHeight: 1.5, padding: '0 2px', marginBottom: 14 }}>
          It lands in your library now. Open a lesson plan or a homework and use <b style={{ color: DS.sub }}>Attach a resource</b> to point to it — nothing gets copied.
        </div>
      )}

      {/* Added-by chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 10, background: DS.accentLight }}>
        <Avatar name={ownerName} size={26} />
        <span style={{ fontSize: 12.5, color: DS.sub }}>Added by <b style={{ color: DS.text }}>{ownerName}</b> on {resTodayISO()}</span>
      </div>
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

// ── Resource detail panel ────────────────────────────────────────────────────────
// The full record for one file with role/visibility-aware actions: open or download
// (admins get a logged open on restricted files), request access inline, the owner's
// visibility editor + who-can-open, shared-with/grant, pending access requests, and
// the used-in pointers. Opening a row opens this.
const ResDetailRow = ({ label, value }) => value == null || value === '' ? null : (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${DS.border}` }}>
    <span style={{ fontSize: 12.5, color: DS.muted }}>{label}</span>
    <span style={{ fontSize: 13, color: DS.text, fontWeight: 500, textAlign: 'right' }}>{value}</span>
  </div>
);
const ResSectionLabel = ({ children, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 9px' }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>{children}</span>
    {action}
  </div>
);
// One visibility option (radio card). Editable only for the owner.
const ResVisOption = ({ label, desc, selected, disabled, onSelect }) => (
  <button type="button" disabled={disabled} onClick={onSelect}
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px',
      borderRadius: 10, cursor: disabled ? 'default' : 'pointer', marginBottom: 6,
      border: `1px solid ${selected ? DS.accent : DS.border}`, background: selected ? DS.accentLight : DS.bg,
    }}>
    <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, marginTop: 1, border: `2px solid ${selected ? DS.accent : DS.borderDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {selected && <span style={{ width: 8, height: 8, borderRadius: 999, background: DS.accent }} />}
    </span>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: selected ? DS.accent : DS.text }}>{label}</span>
      <span style={{ display: 'block', fontSize: 12, color: DS.muted, marginTop: 1, lineHeight: 1.45 }}>{desc}</span>
    </span>
  </button>
);
const ResWhoRow = ({ name, sub, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
    {icon
      ? <div style={{ width: 30, height: 30, borderRadius: 999, background: DS.surface, border: `1px solid ${DS.border}`, color: DS.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={14} /></div>
      : <Avatar name={name} size={30} />}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{name}</div>
      {sub && <div style={{ fontSize: 11.5, color: DS.muted }}>{sub}</div>}
    </div>
  </div>
);

const ResourceDetail = ({ open, onClose, store, resource, viewerId, isAdmin, onShare, onDelete }) => {
  const [opened, setOpened] = React.useState(false);   // simulated / logged open confirmation
  const [note, setNote] = React.useState('');
  React.useEffect(() => { setOpened(false); setNote(''); }, [resource && resource.id]);
  if (!open || !resource) return null;
  const res = resById(store, resource.id) || resource;
  const t = resType(res.type);
  const owner = resStaffName(store, res.created_by);
  const ownerSubject = (resStaffById(store, res.created_by) || {}).subject || 'Staff';
  const isOwner = res.created_by === viewerId;
  const sharedToMe = !isOwner && resSharedTo(store, res.id, viewerId);
  const openableFreely = isOwner || res.visibility === 'centre' || sharedToMe;
  const adminLogged = !openableFreely && isAdmin;             // admin logged-open on restricted
  const requestable = !openableFreely && !isAdmin && res.visibility === 'on_request'; // teacher, on-request
  const requested = resPendingBy(store, res.id, viewerId);
  const links = resLinksForResource(store, res.id);
  const board = res.exam_board && res.exam_board !== 'None' ? res.exam_board : null;
  const shares = (store.shares || []).filter(s => s.resource_id === res.id);
  const pendingReqs = (store.requests || []).filter(r => r.resource_id === res.id && r.status === 'pending');
  const activeTeachers = (store.staff || []).filter(s => s.role === 'teacher' && s.active).length;

  const usedLabel = (l) => {
    if (l.context_type === 'lesson_plan') { const p = String(l.context_id).split('__'); return { kind: 'Lesson', primary: p[0] || l.context_id, secondary: p[1] ? resFmtDate(p[1]) : '' }; }
    if (l.context_type === 'homework') { const a = window.klasioResources && window.klasioResources.homeworkTitle ? window.klasioResources.homeworkTitle(l.context_id) : null; return { kind: 'Homework', primary: a || 'Homework assignment', secondary: '' }; }
    return { kind: l.context_type, primary: l.context_id, secondary: '' };
  };
  const openFile = () => { if (adminLogged) store.logAccess(res.id, viewerId); setOpened(true); };
  const sendRequest = () => { store.requestAccess(res.id, viewerId, note); setNote(''); };

  // Who can open this file, derived from visibility.
  const whoRows = res.visibility === 'centre'
    ? [{ name: 'Everyone at the centre', sub: `${activeTeachers} teacher${activeTeachers === 1 ? '' : 's'}`, icon: 'users' }, { name: owner, sub: `Owner · ${ownerSubject}` }, { name: 'Centre admins', sub: 'Always, like everyone else', icon: 'shield' }]
    : res.visibility === 'on_request'
      ? [{ name: owner, sub: `Owner · ${ownerSubject}` }, { name: 'Centre admins', sub: 'Always — opening this is recorded', icon: 'shield' }, ...shares.map(s => ({ name: resStaffName(store, s.staff_id), sub: 'Granted access' })), { name: 'Anyone else, if the owner agrees', sub: 'They ask, the owner decides', icon: 'lock' }]
      : [{ name: owner, sub: `Owner · ${ownerSubject}` }, { name: 'Centre admins', sub: 'Can see it exists — opening is recorded', icon: 'shield' }];

  return (
    <SlideOver open={open} onClose={onClose} title={res.title} icon={openableFreely ? t.icon : 'lock'} width={500}
      subtitle={res.description || `${t.label}${res.subject ? ` · ${res.subject}` : ''}`}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          {isOwner && (
            <button type="button" onClick={() => { onClose(); onDelete && onDelete(res); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: DS.danger, fontSize: 13, fontWeight: 600 }}>
              <Icon name="trash" size={14} color={DS.danger} /> Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      }>
      {/* Type + visibility badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: DS.accent }}>{t.label}</span>
        {res.visibility === 'centre'
          ? <StatusPill status="Centre" tone="positive" dot />
          : <ResVisTag visibility={res.visibility} />}
        {sharedToMe && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: DS.muted }}><Icon name="check" size={12} color={DS.muted} /> Granted to you</span>}
      </div>

      {/* Owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 12, border: `1px solid ${DS.border}`, background: DS.surface, marginBottom: 16 }}>
        <Avatar name={owner} size={34} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{owner}</div>
          <div style={{ fontSize: 11.5, color: DS.muted }}>{ownerSubject} · owner</div>
        </div>
      </div>

      {/* Primary action — open / logged open / request */}
      <div style={{ marginBottom: 4 }}>
        {(openableFreely || adminLogged) ? (
          opened ? (
            <div style={{ padding: '11px 13px', borderRadius: 10, border: `1px solid ${adminLogged ? DS.successBorder : DS.border}`, background: adminLogged ? DS.successBg : DS.surface, fontSize: 12.5, color: adminLogged ? DS.success : DS.sub, lineHeight: 1.5 }}>
              {adminLogged
                ? <><b>Access recorded for this session.</b> The owner has been notified that an admin viewed this file.</>
                : <>Opening <b style={{ color: DS.text }}>{res.title}</b> — preview is simulated in this prototype (files are referenced, not stored).</>}
            </div>
          ) : (
            <>
              <button type="button" onClick={openFile}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#fff', background: adminLogged ? DS.text : DS.accent }}>
                <Icon name={adminLogged ? 'eye' : 'download'} size={15} color="#fff" />
                {adminLogged ? 'Open — this is recorded' : 'Open file'}
              </button>
              {adminLogged && <div style={{ fontSize: 12, color: DS.muted, marginTop: 8, lineHeight: 1.5 }}>You are seeing this as a centre admin. {owner} will see that you opened it, and when.</div>}
            </>
          )
        ) : requestable ? (
          requested ? (
            <div style={{ padding: '11px 13px', borderRadius: 10, border: `1px solid ${DS.warningBorder}`, background: DS.warningBg, fontSize: 12.5, color: DS.warning }}><b>Request sent.</b> {owner} will decide and you'll get read access if approved.</div>
          ) : (
            <div style={{ padding: '12px 13px', borderRadius: 10, border: `1px solid ${DS.warningBorder}`, background: DS.warningBg }}>
              <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.5, marginBottom: 9 }}>You can see this exists and who owns it. Ask <b style={{ color: DS.text }}>{owner}</b> to open it — add a note so they know why.</div>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Covering your Year 10 tomorrow — would help to have this." rows={2} style={{ marginBottom: 9 }} />
              <Btn variant="primary" icon="send" onClick={sendRequest}>Send request</Btn>
            </div>
          )
        ) : (
          <div style={{ padding: '11px 13px', borderRadius: 10, border: `1px solid ${DS.border}`, background: DS.surface, fontSize: 12.5, color: DS.muted }}>Only the owner can open this file.</div>
        )}
      </div>

      {/* Details */}
      <ResSectionLabel>Details</ResSectionLabel>
      <div>
        <ResDetailRow label="Subject" value={board ? `${res.subject} · ${board}` : res.subject} />
        <ResDetailRow label="Level" value={res.year_group ? `${resLevel(res)} · ${res.year_group}` : resLevel(res)} />
        <ResDetailRow label="Type" value={t.label} />
        <ResDetailRow label="Size" value={resFmtBytes(res.size)} />
        <ResDetailRow label="Added" value={resFmtDate(res.created_at)} />
      </div>

      {/* Visibility — editable for the owner, read-only otherwise */}
      <ResSectionLabel>Visibility</ResSectionLabel>
      {(window.RES_VISIBILITY || []).map(v => (
        <ResVisOption key={v.id}
          label={v.id === 'centre' ? 'Anyone at the centre' : v.label}
          desc={v.id === 'centre' ? 'Every teacher can find and open it.' : v.id === 'on_request' ? 'Colleagues see it exists and who owns it. They must ask the owner before they can open it.' : 'Nobody else sees it. Admins can see it exists — opening it is recorded.'}
          selected={res.visibility === v.id}
          disabled={!isOwner}
          onSelect={() => isOwner && store.updateResource(res.id, { visibility: v.id })} />
      ))}
      {!isOwner && <div style={{ fontSize: 12, color: DS.faint }}>Only {owner} can change this.</div>}

      {/* Who can open this */}
      <ResSectionLabel>Who can open this</ResSectionLabel>
      <div>{whoRows.map((w, i) => <ResWhoRow key={i} name={w.name} sub={w.sub} icon={w.icon} />)}</div>

      {/* Shared with — grant for the owner */}
      {(isOwner || shares.length > 0) && (
        <>
          <ResSectionLabel action={isOwner ? <button type="button" onClick={() => onShare(res)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DS.accent, fontSize: 12, fontWeight: 600 }}>+ Grant</button> : null}>Shared with</ResSectionLabel>
          {shares.length === 0
            ? <div style={{ fontSize: 12.5, color: DS.faint }}>Not shared with anyone directly. On-request access creates a share when the owner approves it.</div>
            : <div>{shares.map(s => <ResWhoRow key={s.staff_id} name={resStaffName(store, s.staff_id)} sub="Granted access" />)}</div>}
        </>
      )}

      {/* Access requests — the owner acts on pending requests here */}
      {isOwner && (
        <>
          <ResSectionLabel>Access requests</ResSectionLabel>
          {pendingReqs.length === 0
            ? <div style={{ fontSize: 12.5, color: DS.faint }}>No pending requests for this file.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingReqs.map(r => (
                  <div key={r.id} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${DS.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{resStaffName(store, r.requested_by)}</div>
                    {r.note && <div style={{ fontSize: 12, color: DS.muted, margin: '2px 0 8px', lineHeight: 1.45 }}>“{r.note}”</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="secondary" small onClick={() => store.decideRequest(r.id, 'declined', viewerId)}>Decline</Btn>
                      <Btn variant="primary" small icon="check" onClick={() => store.decideRequest(r.id, 'approved', viewerId)}>Approve</Btn>
                    </div>
                  </div>
                ))}
              </div>}
        </>
      )}

      {/* Used in — pointers */}
      <ResSectionLabel>Used in <span style={{ color: DS.muted }}>({links.length})</span></ResSectionLabel>
      {links.length === 0 ? (
        <div style={{ fontSize: 12.5, color: DS.faint }}>Not attached to any lesson or homework yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(l => { const m = usedLabel(l); return (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9, border: `1px solid ${DS.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: DS.surface, color: DS.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={l.context_type === 'homework' ? 'clip' : 'edit'} size={14} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{m.primary}</div>
                <div style={{ fontSize: 11.5, color: DS.muted }}>{m.kind}{m.secondary ? ` · ${m.secondary}` : ''}</div>
              </div>
            </div>
          ); })}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 10, lineHeight: 1.5 }}>One file, many pointers — attaching never copies it.</div>
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
// Two-line ellipsis clamp for card titles / descriptions.
const RES_CLAMP2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

// The trailing action for a resource. No kebab — per-file actions (Where used /
// Share / Delete) live in the detail panel now. Only two live buttons remain:
//   • teacher, another's ON-REQUEST file → Request access (Private is never
//     requestable and never appears to non-owners, so it has no button).
//   • admin, a file with a pending request → Override.
// Private is never openable by anyone but its owner — there is no Open affordance.
const ResourceActions = ({ store, res, viewerId, isAdmin, onRequest, onOverride }) => {
  const canOpen = resCanOpen(store, res, viewerId, isAdmin);
  const locked = !isAdmin && !canOpen;
  const requested = resPendingBy(store, res.id, viewerId);
  const hasPending = resHasPending(store, res.id);

  if (locked) {
    if (res.visibility !== 'on_request') return null; // private is not requestable
    return requested
      ? <Btn variant="secondary" small disabled>Requested</Btn>
      : <Btn variant="secondary" small icon="lock" onClick={() => onRequest(res)}>Request access</Btn>;
  }
  if (isAdmin && hasPending) return <Btn variant="primary" small icon="shield" onClick={() => onOverride(res)}>Override</Btn>;
  return null;
};

// List / cards switch — a small segmented pill of two icon buttons.
const ResViewToggle = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 2, padding: 3, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9 }}>
    {[{ id: 'grid', icon: 'grid', title: 'Card view' }, { id: 'list', icon: 'list', title: 'List view' }].map(o => {
      const on = value === o.id;
      return (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} title={o.title} aria-label={o.title} aria-pressed={on}
          style={{
            width: 30, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: on ? DS.bg : 'transparent', boxShadow: on ? DS.cardShadow : 'none',
            color: on ? DS.accent : DS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon name={o.icon} size={15} />
        </button>
      );
    })}
  </div>
);

// Card presentation of a resource (the grid / "cards" view — see the view toggle).
const ResourceCard = ({ store, res, viewerId, isAdmin, onOpenDetail, onWhereUsed, onShare, onRequest, onOverride, onOpenPrivate }) => {
  const t = resType(res.type);
  const owner = resStaffName(store, res.created_by);
  const isOwner = res.created_by === viewerId;
  const canOpen = resCanOpen(store, res, viewerId, isAdmin);
  const locked = !isAdmin && !canOpen;
  const sharedToMe = !isOwner && resSharedTo(store, res.id, viewerId);
  const used = resUsedCount(store, res.id);
  const showAccessRow = res.visibility !== 'centre' || sharedToMe;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 11, padding: 16, height: '100%',
      border: `1px solid ${DS.border}`, borderRadius: 12, background: DS.bg, opacity: locked ? 0.72 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <ResTypeGlyph type={res.type} locked={locked} size={40} />
        <ResourceActions store={store} res={res} viewerId={viewerId} isAdmin={isAdmin}
          onRequest={onRequest} onOverride={onOverride} />
      </div>

      <div>
        <button type="button" onClick={() => onOpenDetail && onOpenDetail(res)}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: DS.text, lineHeight: 1.35, ...RES_CLAMP2 }}>{res.title}</button>
        {/* One access vocabulary (Stage 1): a single scope chip. "Granted" is a
            derived unlocked fact (marked quietly), not a second state. */}
        {showAccessRow && (
        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <ResVisTag visibility={res.visibility} />
          {sharedToMe && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: DS.muted }}>
              <Icon name="check" size={11} color={DS.muted} /> Granted to you
            </span>
          )}
        </div>
        )}
        {res.description && (
          <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 7, lineHeight: 1.5, ...RES_CLAMP2 }}>{res.description}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
        <ResMetaPill>{t.label}</ResMetaPill>
        {res.year_group && <ResMetaPill>{res.year_group}</ResMetaPill>}
        {res.exam_board && res.exam_board !== 'None' && <ResMetaPill>{res.exam_board}</ResMetaPill>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 11, borderTop: `1px solid ${DS.border}`, fontSize: 12, color: DS.faint, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Avatar name={owner} size={16} /> {owner}</span>
        <span>{resFmtBytes(res.size)}</span>
        <span>{resFmtDate(res.updated_at)}</span>
        {used > 0 && (
          <button type="button" onClick={() => onWhereUsed(res)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DS.accent, fontWeight: 600, fontSize: 12 }}>
            Used in {used} place{used === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
};

// Fixed column widths so owner / usage / access / action line up down the list
// (Stage 2 alignment). One grid, shared by the header strip and every row.
const RES_COL = { select: 34, usage: 62, owner: 168, access: 116, action: 122 };

// Dense ~40px single-line row (Stage 2 default). Left→right: select · type glyph ·
// title · usage · owner · access exception · action. Description, subject, board,
// level and year live in the detail panel — the row is a lookup line, not a card.
const ResourceRow = ({ store, res, viewerId, isAdmin, selected, onToggleSelect, onOpenDetail, onWhereUsed, onShare, onRequest, onOverride, onOpenPrivate, last }) => {
  const owner = resStaffName(store, res.created_by);
  const canOpen = resCanOpen(store, res, viewerId, isAdmin);
  const locked = !isAdmin && !canOpen;             // teacher, others' on_request
  const used = resUsedCount(store, res.id);
  const sharedToMe = res.created_by !== viewerId && resSharedTo(store, res.id, viewerId);
  const [hov, setHov] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 44,
        borderBottom: last ? 'none' : `1px solid ${DS.border}`, opacity: locked ? 0.72 : 1,
        background: selected ? DS.accentLight : hov ? DS.surface : 'transparent',
      }}>
      {/* Select */}
      <div style={{ width: RES_COL.select, flexShrink: 0, display: 'flex', alignItems: 'center' }}
        onClick={e => e.stopPropagation()}>
        <Checkbox checked={!!selected} onChange={() => onToggleSelect(res.id)} />
      </div>

      <ResTypeGlyph type={res.type} locked={locked} size={26} />

      {/* Title — the click target for the detail panel */}
      <button type="button" onClick={() => onOpenDetail(res)}
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</span>
        {sharedToMe && <Icon name="check" size={12} color={DS.faint} title="Granted to you" />}
      </button>

      {/* Usage — greyscale, tabular; the key liveness signal, not a coloured link */}
      <div style={{ width: RES_COL.usage, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: 12.5, color: used ? DS.sub : DS.faint, fontVariantNumeric: 'tabular-nums' }}>
        <Icon name="link" size={12} color={used ? DS.muted : DS.faint} />
        {used}
      </div>

      {/* Owner */}
      <div style={{ width: RES_COL.owner, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Avatar name={owner} size={24} />
        <span style={{ fontSize: 12.5, color: DS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{owner}</span>
      </div>

      {/* Access — exception only (centre renders nothing) */}
      <div style={{ width: RES_COL.access, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <ResVisTag visibility={res.visibility} />
      </div>

      {/* Trailing action */}
      <div style={{ width: RES_COL.action, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}>
        <ResourceActions store={store} res={res} viewerId={viewerId} isAdmin={isAdmin}
          onRequest={onRequest} onOverride={onOverride} />
      </div>
    </div>
  );
};

// Header strip above the dense list — column labels + select-all, on the same grid.
const ResListHeader = ({ allSelected, someSelected, onToggleAll }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 38, borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
    <div style={{ width: RES_COL.select, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleAll} />
    </div>
    <div style={{ width: 26, flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Name</div>
    <div style={{ width: RES_COL.usage, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Uses</div>
    <div style={{ width: RES_COL.owner, flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Owner</div>
    <div style={{ width: RES_COL.access, flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.faint }}>Access</div>
    <div style={{ width: RES_COL.action, flexShrink: 0 }} />
  </div>
);

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

// ── Left filter rail (facets + MY VIEW) ──────────────────────────────────────────
// A quiet uppercase section label used by both the MY VIEW group and every facet.
const ResRailLabel = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: DS.faint, margin: '0 0 8px' }}>{children}</div>
);

// One MY VIEW row (single-select: All resources / My uploads / Shared with me /
// Requests). The active row lifts into the accent wash.
const ResRailViewItem = ({ item, active, onClick }) => (
  <button type="button" onClick={onClick}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = SIDE_HOVER; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px',
      borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
      background: active ? DS.accentLight : 'transparent', color: active ? DS.accent : DS.sub,
    }}>
    <Icon name={item.icon} size={15} color={active ? DS.accent : DS.muted} />
    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
    {item.count > 0 && (
      <span style={{
        fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center', padding: '0 5px', borderRadius: 9,
        background: item.badge ? DS.danger : (active ? DS.bg : DS.border),
        color: item.badge ? '#fff' : (active ? DS.accent : DS.muted),
      }}>{item.count}</span>
    )}
  </button>
);

// One multi-select facet group (checkbox rows with per-option counts).
const ResFacetGroup = ({ title, options, selected, onToggle }) => {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <ResRailLabel>{title}</ResRailLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {options.map(o => {
          const on = selected.includes(o.value);
          return (
            <label key={o.value}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background = SIDE_HOVER; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 7px', borderRadius: 7, cursor: 'pointer', background: on ? DS.accentLight : 'transparent' }}>
              <Checkbox checked={on} onChange={() => onToggle(o.value)} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? DS.accent : DS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
              <span style={{ fontSize: 11.5, color: on ? DS.accent : DS.faint, fontVariantNumeric: 'tabular-nums' }}>{o.count}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const ResFilterRail = ({ isAdmin, viewItems, seg, onSeg, facetGroups, sel, onToggle, showFacets, activeFilterCount, onClear }) => (
  <div style={{
    position: 'sticky', top: 24, alignSelf: 'start',
    maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: 4,
  }}>
    <div style={{ marginBottom: 18 }}>
      <ResRailLabel>My view</ResRailLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {viewItems.map(it => <ResRailViewItem key={it.id} item={it} active={seg === it.id} onClick={() => onSeg(it.id)} />)}
      </div>
    </div>
    {showFacets && facetGroups.map(g => (
      <ResFacetGroup key={g.key} title={g.title} options={g.options} selected={sel[g.key]} onToggle={(v) => onToggle(g.key, v)} />
    ))}
    {showFacets && activeFilterCount > 0 && (
      <button type="button" onClick={onClear}
        style={{ background: 'none', border: 'none', padding: '2px 7px', cursor: 'pointer', color: DS.accent, fontSize: 12.5, fontWeight: 600, textDecoration: 'underline' }}>
        Clear all filters
      </button>
    )}
  </div>
);

// ── Search: fuzzy matching + synonyms (Stage 3) ──────────────────────────────────
// At 300 files a near-miss ("quadratics" vs "Quadratic Equations") reads as absent
// and someone re-uploads a duplicate. So: expand the query through a light synonym
// map, and let each term match by substring OR small edit distance (typo tolerance).
const RES_SYNONYMS = {
  quadratics: ['quadratic'], quadratic: ['quadratics'],
  simultaneous: ['simultaneous equations'], trig: ['trigonometry', 'sine', 'cosine'],
  trigonometry: ['trig', 'sine', 'cosine'], calculus: ['differentiation', 'derivative', 'integration'],
  differentiation: ['calculus', 'derivative'], surds: ['indices', 'roots'], indices: ['surds', 'powers'],
  probability: ['chance', 'trees'], forces: ['motion', 'newton', 'dynamics'], motion: ['forces'],
  waves: ['wave', 'oscillation'], rates: ['rate', 'kinetics', 'reaction'], titration: ['acid', 'base', 'neutralisation'],
  organic: ['carbon', 'hydrocarbons'], macbeth: ['shakespeare', 'tragedy'], poetry: ['poem', 'poems', 'anthology', 'verse'],
  ms: ['mark scheme', 'answers', 'solutions'], markscheme: ['mark scheme'], ws: ['worksheet'], revision: ['revise', 'recap'],
};
const resNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
// Bounded Levenshtein — returns true if edit distance(a,b) ≤ max.
const resWithinEdits = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return false;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]; dp[0] = j; let best = dp[0];
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp; best = Math.min(best, dp[i]);
    }
    if (best > max) return false; // whole row already over budget
  }
  return dp[a.length] <= max;
};
// Does one query term match a haystack (string + its word list)?
const resTermMatches = (term, hay, words) => {
  const cands = [term, ...(RES_SYNONYMS[term] || [])];
  const tol = (t) => t.length <= 3 ? 0 : t.length <= 6 ? 1 : 2;
  return cands.some(c => {
    if (hay.includes(c)) return true;
    if (c.includes(' ')) return false; // phrase synonyms: substring only
    return words.some(w => resWithinEdits(w, c, tol(c)));
  });
};
const resSearchMatch = (query, res, ownerName) => {
  const terms = resNorm(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const hay = resNorm([res.title, res.description, res.subject, resType(res.type).label, ownerName].filter(Boolean).join(' '));
  const words = hay.split(' ').filter(Boolean);
  return terms.every(t => resTermMatches(t, hay, words)); // AND across terms
};

// ── The Resources page (teacher lens + admin lens) ───────────────────────────────
const RES_EMPTY_SEL = { subject: [], type: [], year: [], level: [], board: [], vis: [], owner: [] };
const ResourcesPage = ({ role }) => {
  const store = useResourcesStore();
  const isAdmin = role === 'admin';
  const viewerId = isAdmin ? 'admin' : store.actingTeacherId;

  const [seg, setSeg] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(RES_EMPTY_SEL);        // multi-select facets → arrays
  // Sort — persisted per user. Default 'used' (most-used, falling back to recently
  // added where usage is zero — see the comparator).
  const [sortMode, setSortMode] = React.useState(() => {
    try { return localStorage.getItem('klasio.resources.sort') || 'used'; } catch (e) { return 'used'; }
  });
  const setSort = (v) => { setSortMode(v); try { localStorage.setItem('klasio.resources.sort', v); } catch (e) {} };
  const [page, setPage] = React.useState(0);                  // pagination
  const [addOpen, setAddOpen] = React.useState(false);
  const [whereRes, setWhereRes] = React.useState(null);
  const [shareRes, setShareRes] = React.useState(null);
  const [reqRes, setReqRes] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null); // author delete confirm
  const [detailRes, setDetailRes] = React.useState(null);   // Stage 2 — row → detail panel
  const [selectedIds, setSelectedIds] = React.useState([]); // Stage 2 — bulk selection
  // List vs cards — remembered across visits.
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem('klasio.resources.view') === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; }
  });
  const setView = (v) => { setViewMode(v); try { localStorage.setItem('klasio.resources.view', v); } catch (e) {} };
  // Onboarding banner — dismissible, remembered per user (Stage 4).
  const [bannerOpen, setBannerOpen] = React.useState(() => { try { return localStorage.getItem('klasio.resources.bannerDismissed') !== '1'; } catch (e) { return true; } });
  const dismissBanner = () => { setBannerOpen(false); try { localStorage.setItem('klasio.resources.bannerDismissed', '1'); } catch (e) {} };

  // Default the teacher's own subject as a pre-applied, visible, clearable subject
  // facet (Stage 4) — a WHERE clause against data we already have, not a ranking.
  // Re-applies when the acting teacher changes; a manual clear sticks until then.
  const autoSubjectRef = React.useRef(null);
  React.useEffect(() => {
    if (isAdmin) { autoSubjectRef.current = null; return; }
    if (autoSubjectRef.current === viewerId) return;
    autoSubjectRef.current = viewerId;
    const me = resStaffById(store, viewerId);
    if (me && me.subject) setSel(prev => ({ ...prev, subject: [me.subject] }));
  }, [viewerId, isAdmin]);

  const base = resBrowseVisible(store, viewerId, isAdmin);
  const pendingCount = resPendingForApprover(store, viewerId).length;

  // MY VIEW (segment) filter — the pool the facets, counts and results run over.
  // Runs for both lenses now (admin gets the same All / My uploads / Shared with me /
  // Requests views; for admin these key off the admin identity).
  const segFiltered = base.filter(r => {
    if (seg === 'mine') return r.created_by === viewerId;
    if (seg === 'shared') return r.created_by !== viewerId && resSharedTo(store, r.id, viewerId);
    return true; // 'all' / 'requests' (requests swaps the whole panel)
  });

  // Facet toggles — empty array on a facet means "no constraint".
  const toggleFacet = (key, val) => setSel(prev => {
    const cur = prev[key] || [];
    return { ...prev, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
  });
  const activeFilterCount = Object.keys(sel).reduce((n, k) => n + sel[k].length, 0);
  const clearFilters = () => setSel(RES_EMPTY_SEL);
  const passFacet = (arr, val) => arr.length === 0 || arr.includes(val);
  // Active-filter chips (Stage 4) — visible + individually removable in the main
  // area, so what's applied is never hidden behind a scrolled sidebar.
  const facetChipLabel = (key, val) => key === 'type' ? resType(val).label
    : key === 'vis' ? (val === 'centre' ? 'Centre' : resVis(val).label)
    : key === 'owner' ? resStaffName(store, val) : val;
  const activeChips = [];
  Object.keys(sel).forEach(k => (sel[k] || []).forEach(v => activeChips.push({ key: k, value: v, label: facetChipLabel(k, v) })));

  const filtered = segFiltered.filter(r => {
    if (!passFacet(sel.subject, r.subject)) return false;
    if (!passFacet(sel.type, r.type)) return false;
    if (!passFacet(sel.year, r.year_group)) return false;
    if (!passFacet(sel.level, resLevel(r))) return false;
    if (!passFacet(sel.board, r.exam_board)) return false;
    if (!passFacet(sel.vis, r.visibility)) return false;
    if (!passFacet(sel.owner, r.created_by)) return false;
    return resSearchMatch(q, r, resStaffName(store, r.created_by)); // fuzzy + synonyms
  });

  // Sort (Stage 3). `last_used_at` and `created_at` are different signals — used is
  // the better liveness indicator, added just means someone dropped a file in. The
  // default is most-used, falling back to recently-added where usage ties (incl. 0).
  const usedCountOf = (r) => resUsedCount(store, r.id);
  const lastUsedOf = (r) => { const es = (store.usage_events || []).filter(e => e.resource_id === r.id); return es.length ? es.map(e => e.at).sort().slice(-1)[0] : ''; };
  const addedKey = (r) => String(r.created_at || r.updated_at || '');
  const cmp = (a, b) => {
    if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sortMode === 'added') return addedKey(b).localeCompare(addedKey(a));
    if (sortMode === 'recent_used') { const la = lastUsedOf(a), lb = lastUsedOf(b); if (la !== lb) return lb.localeCompare(la); return addedKey(b).localeCompare(addedKey(a)); }
    const ua = usedCountOf(a), ub = usedCountOf(b);       // 'used' (default)
    if (ub !== ua) return ub - ua;
    return addedKey(b).localeCompare(addedKey(a));
  };
  const sorted = filtered.slice().sort(cmp);

  // Flat list — all files in one list (per request), paginated. Pages, not infinite
  // scroll, so links and returns work.
  const RES_PAGE_SIZE = 50;
  const pageCount = Math.max(1, Math.ceil(sorted.length / RES_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * RES_PAGE_SIZE, safePage * RES_PAGE_SIZE + RES_PAGE_SIZE);
  const pageRowIds = pageRows.map(r => r.id);
  const pageRowSet = new Set(pageRowIds);
  React.useEffect(() => { setPage(0); }, [seg, q, sortMode, JSON.stringify(sel)]);

  // Selection (Stage 2). Clears when the result set changes; select-all targets the
  // rows visible on the current page.
  React.useEffect(() => { setSelectedIds([]); }, [seg, q, sortMode, safePage, JSON.stringify(sel)]);
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectedVisible = selectedIds.filter(id => pageRowSet.has(id));
  const allSelected = pageRowIds.length > 0 && selectedVisible.length === pageRowIds.length;
  const someSelected = selectedVisible.length > 0;
  const toggleAll = () => setSelectedIds(allSelected ? [] : pageRowIds);
  // Bulk visibility change applies only to files the viewer owns (ownership is the
  // model's authority on who can set access); non-owned selections are skipped.
  const ownedSelected = selectedIds.filter(id => { const r = resById(store, id); return r && r.created_by === viewerId; });
  const bulkSetVisibility = (v) => { ownedSelected.forEach(id => store.updateResource(id, { visibility: v })); setSelectedIds([]); };

  // Facet counts reflect the CURRENT filter intersection (Stage 4). For facet K we
  // count over items that pass every OTHER facet + the search — so selecting
  // Mathematics really does drop "A-Level 3" to "A-Level 2". Static counts mislead.
  const passAllExcept = (r, exceptKey) => {
    if (exceptKey !== 'subject' && !passFacet(sel.subject, r.subject)) return false;
    if (exceptKey !== 'type' && !passFacet(sel.type, r.type)) return false;
    if (exceptKey !== 'year' && !passFacet(sel.year, r.year_group)) return false;
    if (exceptKey !== 'level' && !passFacet(sel.level, resLevel(r))) return false;
    if (exceptKey !== 'board' && !passFacet(sel.board, r.exam_board)) return false;
    if (exceptKey !== 'vis' && !passFacet(sel.vis, r.visibility)) return false;
    if (exceptKey !== 'owner' && !passFacet(sel.owner, r.created_by)) return false;
    return resSearchMatch(q, r, resStaffName(store, r.created_by));
  };
  const countBy = (exceptKey, keyFn) => { const m = {}; segFiltered.forEach(r => { if (!passAllExcept(r, exceptKey)) return; const k = keyFn(r); if (k == null || k === '') return; m[k] = (m[k] || 0) + 1; }); return m; };
  const cSubject = countBy('subject', r => r.subject), cType = countBy('type', r => r.type), cYear = countBy('year', r => r.year_group);
  const cLevel = countBy('level', r => resLevel(r)), cBoard = countBy('board', r => r.exam_board), cVis = countBy('vis', r => r.visibility), cOwner = countBy('owner', r => r.created_by);
  const opt = (value, label, count) => ({ value, label, count });
  // Options include any value with a live count OR one that's currently selected
  // (so a selection that intersects to zero is still visible to deselect).
  const keep = (val, counts, key) => counts[val] || sel[key].includes(val);
  const facetGroups = [
    { key: 'subject', title: 'Subject',    options: Array.from(new Set([...Object.keys(cSubject), ...sel.subject])).sort().map(s => opt(s, s, cSubject[s] || 0)) },
    { key: 'type',    title: 'Type',       options: (window.RES_TYPES || []).filter(t => keep(t.id, cType, 'type')).map(t => opt(t.id, t.label, cType[t.id] || 0)) },
    { key: 'level',   title: 'Level',      options: RES_LEVELS.filter(l => keep(l, cLevel, 'level')).map(l => opt(l, l, cLevel[l] || 0)) },
    { key: 'year',    title: 'Year',       options: (window.RES_YEAR_GROUPS || []).filter(y => keep(y, cYear, 'year')).map(y => opt(y, y, cYear[y] || 0)) },
    { key: 'board',   title: 'Exam board', options: (window.RES_EXAM_BOARDS || []).filter(b => b !== 'None' && keep(b, cBoard, 'board')).map(b => opt(b, b, cBoard[b] || 0)) },
    { key: 'vis',     title: 'Visibility', options: (window.RES_VISIBILITY || []).filter(v => keep(v.id, cVis, 'vis')).map(v => opt(v.id, v.id === 'centre' ? 'Centre' : v.label, cVis[v.id] || 0)) },
    { key: 'owner',   title: 'Owner',      options: Array.from(new Set([...Object.keys(cOwner), ...sel.owner])).map(id => opt(id, resStaffName(store, id), cOwner[id] || 0)).sort((a, b) => b.count - a.count) },
  ];

  // MY VIEW rail items (teacher lens only). Requests carries the red pending badge.
  const viewItems = [
    { id: 'all',      label: 'All resources',  icon: 'folder', count: base.length },
    { id: 'mine',     label: 'My uploads',     icon: 'upload', count: base.filter(r => r.created_by === viewerId).length },
    { id: 'shared',   label: 'Shared with me', icon: 'users',  count: base.filter(r => r.created_by !== viewerId && resSharedTo(store, r.id, viewerId)).length },
    { id: 'requests', label: 'Requests',       icon: 'lock',   count: pendingCount, badge: true },
  ];

  // Admin Override — approve a pending request on a file. (Private files are never
  // openable by anyone but the owner, so there is no admin "open private" path.)
  const onOverride = (res) => {
    const req = (store.requests || []).find(x => x.resource_id === res.id && x.status === 'pending');
    if (req) { store.decideRequest(req.id, 'approved', 'admin'); store.logAccess(res.id, 'admin'); }
  };

  const showRequests = seg === 'requests';
  const sortOptions = [
    { id: 'used', label: 'Most used' },
    { id: 'recent_used', label: 'Recently used' },
    { id: 'added', label: 'Recently added' },
    { id: 'title', label: 'Title A–Z' },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <PageHeader
          title="Resources"
          subtitle={isAdmin ? 'Every file in the centre’s library — with owner, size and visibility.' : 'The centre’s shared library of teaching materials.'}
          actions={<Btn variant="primary" icon="cloud" onClick={() => setAddOpen(true)}>Add resource</Btn>}
        />

        {/* Impersonation bar (teacher lens only) — this is role impersonation, NOT a
            filter, so it gets a distinct thin bordered bar rather than a form
            control. The prototype has one teacher persona; acting as any teacher
            lets shares and requests be demonstrated end to end. */}
        {!isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 12px', border: `1px solid ${DS.borderDark}`, borderLeft: `3px solid ${DS.warning}`, borderRadius: 8, background: DS.surface }}>
            <Icon name="eye" size={15} color={DS.warning} />
            <span style={{ fontSize: 12.5, color: DS.sub }}>Viewing the library as</span>
            <Select value={store.actingTeacherId} onChange={e => store.setActing(e.target.value)} style={{ width: 190 }}>
              {(store.staff || []).filter(s => s.role === 'teacher').map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (deactivated)'}</option>)}
            </Select>
            <span style={{ fontSize: 11.5, color: DS.faint }}>impersonation — for demo</span>
          </div>
        )}

        {/* Onboarding note — dismissible, remembered per user */}
        {bannerOpen && (
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 15px', marginBottom: 18, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10 }}>
            <Icon name={isAdmin ? 'shield' : 'folder'} size={17} color={DS.accent} />
            <div style={{ flex: 1, fontSize: 12.5, color: DS.sub, lineHeight: 1.5 }}>
              {isAdmin
                ? <><strong style={{ color: DS.text }}>Private files are listed here for storage and offboarding.</strong> Only their owner can read the contents — opening one is recorded in the access log. Override appears on a file only while someone is waiting on a request for it.</>
                : <><strong style={{ color: DS.text }}>Files land here automatically when you attach them to a lesson or homework.</strong> New files are centre-wide by default, so colleagues can reuse them. Lock a file to <em>On request</em> or <em>Private</em> when it shouldn’t be open to everyone.</>}
            </div>
            <button type="button" onClick={dismissBanner} title="Dismiss"
              style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: DS.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {/* Two-column workspace: left filter rail + main results. */}
        <div style={{ display: 'grid', gridTemplateColumns: '236px 1fr', gap: 24, alignItems: 'start' }}>
          <ResFilterRail
            isAdmin={isAdmin}
            viewItems={viewItems} seg={seg} onSeg={setSeg}
            facetGroups={facetGroups} sel={sel} onToggle={toggleFacet}
            showFacets={!showRequests}
            activeFilterCount={activeFilterCount} onClear={clearFilters}
          />

          <div style={{ minWidth: 0 }}>
            {showRequests ? (
              <ResRequestsPanel store={store} viewerId={viewerId} isAdmin={isAdmin} />
            ) : (
              <>
                {/* Search + view toggle */}
                <div style={{ display: 'flex', gap: 10, marginBottom: activeChips.length ? 10 : 14, alignItems: 'center' }}>
                  <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title, note, subject, owner…" style={{ flex: 1 }} />
                  <ResViewToggle value={viewMode} onChange={setView} />
                </div>

                {/* Active-filter chips — individually + all removable */}
                {activeChips.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                    {activeChips.map(c => (
                      <span key={`${c.key}:${c.value}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 6px 3px 10px', borderRadius: 999, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, fontSize: 12, fontWeight: 500, color: DS.accent }}>
                        {c.label}
                        <button type="button" onClick={() => toggleFacet(c.key, c.value)} title="Remove"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, border: 'none', background: 'transparent', color: DS.accent, cursor: 'pointer', padding: 0 }}>
                          <Icon name="x" size={11} />
                        </button>
                      </span>
                    ))}
                    <button type="button" onClick={clearFilters}
                      style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', color: DS.muted, fontSize: 12, fontWeight: 600 }}>Clear all</button>
                  </div>
                )}

                {/* Results toolbar — bulk actions when selecting, else a count only
                    when it diverges from the pool (Showing 14 of 14 is noise). */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, minHeight: 30, flexWrap: 'wrap' }}>
                  {someSelected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{selectedVisible.length} selected</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 12.5, color: DS.muted }}>Set access</span>
                        <Select value="" onChange={e => e.target.value && bulkSetVisibility(e.target.value)} disabled={ownedSelected.length === 0} style={{ width: 150 }}>
                          <option value="">{ownedSelected.length ? 'Choose…' : 'None you own'}</option>
                          {(window.RES_VISIBILITY || []).map(v => <option key={v.id} value={v.id}>{v.id === 'centre' ? 'Centre-wide' : v.label}</option>)}
                        </Select>
                      </div>
                      {ownedSelected.length !== selectedVisible.length && (
                        <span style={{ fontSize: 11.5, color: DS.faint }}>{selectedVisible.length - ownedSelected.length} not yours — will be skipped</span>
                      )}
                      <button type="button" onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DS.accent, fontSize: 12.5, fontWeight: 600 }}>Clear</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: DS.muted }}>
                      {sorted.length !== segFiltered.length
                        ? <><b style={{ color: DS.text }}>{sorted.length}</b> of {segFiltered.length}</>
                        : <>{segFiltered.length} file{segFiltered.length === 1 ? '' : 's'}</>}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: DS.faint }}>Sort</span>
                    <Select value={sortMode} onChange={e => setSort(e.target.value)} style={{ width: 170 }}>
                      {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </Select>
                  </div>
                </div>

                {sorted.length === 0 ? (
                  <Card><EmptyState icon="search" title="No resources found" message="Try a different search or clear the filters." /></Card>
                ) : viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 14 }}>
                    {pageRows.map(r => (
                      <ResourceCard key={r.id} store={store} res={r} viewerId={viewerId} isAdmin={isAdmin}
                        onOpenDetail={setDetailRes}
                        onWhereUsed={setWhereRes} onShare={setShareRes} onRequest={setReqRes} onOverride={onOverride} />
                    ))}
                  </div>
                ) : (
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <ResListHeader allSelected={allSelected} someSelected={someSelected} onToggleAll={toggleAll} />
                    {pageRows.map((r, i) => (
                      <ResourceRow key={r.id} store={store} res={r} viewerId={viewerId} isAdmin={isAdmin}
                        last={i === pageRows.length - 1}
                        selected={selectedIds.includes(r.id)} onToggleSelect={toggleSelect} onOpenDetail={setDetailRes}
                        onWhereUsed={setWhereRes} onShare={setShareRes} onRequest={setReqRes} onOverride={onOverride} />
                    ))}
                    {pageCount > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '11px 16px', borderTop: `1px solid ${DS.border}` }}>
                        <span style={{ fontSize: 12.5, color: DS.muted, fontVariantNumeric: 'tabular-nums' }}>
                          {safePage * RES_PAGE_SIZE + 1}–{Math.min((safePage + 1) * RES_PAGE_SIZE, sorted.length)} of {sorted.length}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <PagerBtn icon="chevron_l" title="Previous page" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)} />
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', fontSize: 12.5, color: DS.sub }}>Page {safePage + 1} of {pageCount}</span>
                          <PagerBtn icon="chevron_r" title="Next page" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} />
                        </div>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ResAddModal open={addOpen} onClose={() => setAddOpen(false)} store={store} createdBy={viewerId} />
      <ResourceDetail open={!!detailRes} onClose={() => setDetailRes(null)} store={store} resource={detailRes}
        viewerId={viewerId} isAdmin={isAdmin} onShare={setShareRes} onRequest={setReqRes} onDelete={setConfirmDelete} />
      <ResWhereUsedDrawer open={!!whereRes} onClose={() => setWhereRes(null)} store={store} resource={whereRes} />
      <ResShareModal open={!!shareRes} onClose={() => setShareRes(null)} store={store} resource={shareRes} actingId={viewerId} />
      <ResRequestModal open={!!reqRes} onClose={() => setReqRes(null)} store={store} resource={reqRes} actingId={viewerId} />
      {/* Author delete — only the owner reaches this (button lives in the detail
          panel). Removes the file and every pointer/share/request to it. */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete file" icon="trash" width={440}
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" icon="trash" onClick={() => { if (confirmDelete) { store.deleteResource(confirmDelete.id); setSelectedIds([]); } setConfirmDelete(null); }}>Delete file</Btn>
        </>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>
          Delete <b style={{ color: DS.text }}>{confirmDelete && confirmDelete.title}</b>? This removes it from the library and detaches it from any lesson or homework it was attached to{confirmDelete && resUsedCount(store, confirmDelete.id) > 0 ? ` (${resUsedCount(store, confirmDelete.id)} place${resUsedCount(store, confirmDelete.id) === 1 ? '' : 's'})` : ''}. This can't be undone.
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
  // Stage 5 — append-only usage history (attach events). Kept for a future
  // relevance ranker / activity views; nothing consumes it yet by design.
  usageEvents: (resourceId) => { const s = resRead(); return (s.usage_events || []).filter(e => !resourceId || e.resource_id === resourceId); },
  lastUsedAt: (resourceId) => { const s = resRead(); const es = (s.usage_events || []).filter(e => e.resource_id === resourceId); return es.length ? es.map(e => e.at).sort().slice(-1)[0] : null; },
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
