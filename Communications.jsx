// ══════════════════════════════════════════════════════════════
//  TutorOS — Communications module
//
//  Two primitives, one shared module:
//   • Announcements — broadcast feed (one→many), scoped platform/centre/class,
//     targeted by role/class, with read + acknowledge tracking.
//   • Messages — DM + group threads (incl. a seeded centre-wide "Staff Room").
//
//  Everything is MULTI-TENANT: every read for a non-superadmin user is filtered
//  by centreId inside the store helpers (a component can't forget). The
//  permission matrix lives in ONE place: canAnnounce / canMessage / commsRecipients.
//
//  localStorage is not reactive, so comms state is meant to be LIFTED once in
//  App (see index.html) and threaded down — that's what makes the notification
//  bell + sidebar badges update live. useComms() persists on every mutation and
//  bumps a version so all consumers re-render.
//
//  Wrapped in an IIFE (like Settings.jsx / Homework.jsx) so internal component
//  names stay module-local. Exposes on window:
//    useComms, CommunicationsPage, NotificationBell,
//    commsUnreadCount, canAnnounce, canMessage, commsRecipients
//
//  Seeded from mocks/communications.mock.jsx (loaded before this file).
// ══════════════════════════════════════════════════════════════
(() => {

const COMMS_KEY = 'tutoros.comms.v1';
const COMMS_TODAY = '2026-06-18';

// ─── Roster helpers (typeof-guarded so load order can't break it) ──────────────────
const usersArr   = () => (typeof COMMS_USERS !== 'undefined' ? COMMS_USERS : []);
const centresArr = () => (typeof COMMS_CENTRES !== 'undefined' ? COMMS_CENTRES : []);
const selfMap    = () => (typeof COMMS_SELF !== 'undefined' ? COMMS_SELF : {});
const userById   = (id) => usersArr().find(u => u.id === id) || null;
const centreName = (id) => (centresArr().find(c => c.id === id) || {}).name || id || 'Platform';

const ROLE_LABEL = { superadmin: 'Owner', admin: 'Admin', teacher: 'Teacher', student: 'Student', parent: 'Parent' };

// ─── Store (localStorage, seeded from mocks) ───────────────────────────────────────
function cmLoad() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(COMMS_KEY)); } catch (e) { raw = null; }
  const toMap = (arr) => (arr || []).reduce((m, x) => { m[x.id] = x; return m; }, {});
  const seed = {
    announcements: toMap(typeof COMMS_ANNOUNCEMENTS !== 'undefined' ? COMMS_ANNOUNCEMENTS : []),
    threads:       toMap(typeof COMMS_THREADS !== 'undefined' ? COMMS_THREADS : []),
    messages:      toMap(typeof COMMS_MESSAGES !== 'undefined' ? COMMS_MESSAGES : []),
  };
  if (!raw || typeof raw !== 'object') return seed;
  // Backfill missing top-level keys so older blobs still load.
  return {
    announcements: raw.announcements || seed.announcements,
    threads:       raw.threads       || seed.threads,
    messages:      raw.messages      || seed.messages,
  };
}
function cmSave(store) {
  try { localStorage.setItem(COMMS_KEY, JSON.stringify(store)); } catch (e) {}
}
const stamp = () => new Date().toISOString();
const newId = (p) => p + '_' + Date.now() + '_' + Math.floor(Math.random() * 999);

// ─── Context: resolve the demo identity for the active role ────────────────────────
function commsContext(role) {
  const userId = selfMap()[role] || null;
  const user = userById(userId);
  return { role, userId, user, centreId: user ? user.centreId : null };
}

// ══════════════════════════════════════════════════════════════════════════════════
//  PERMISSION & SCOPE MATRIX — single source of truth
// ══════════════════════════════════════════════════════════════════════════════════

// Can `user` post an announcement at this scope?
function canAnnounce(user, scope) {
  if (!user) return false;
  if (user.role === 'superadmin') return scope === 'platform' || scope === 'centre' || scope === 'class';
  if (user.role === 'admin')      return scope === 'centre' || scope === 'class';
  if (user.role === 'teacher')    return scope === 'class';
  return false; // students / parents receive only
}
// Any composer at all for this role?
const canCompose = (user) => !!user && (user.role === 'superadmin' || user.role === 'admin' || user.role === 'teacher');

// The scopes a given user may choose from in the composer.
function allowedScopes(user) {
  if (!user) return [];
  if (user.role === 'superadmin') return ['platform', 'centre', 'class'];
  if (user.role === 'admin')      return ['centre', 'class'];
  if (user.role === 'teacher')    return ['class'];
  return [];
}

// Can `from` DM `to`? Hard rule: never across centreId (except superadmin).
function canMessage(from, to) {
  if (!from || !to || from.id === to.id) return false;
  if (from.role === 'superadmin') return to.role === 'admin' || to.role === 'superadmin';
  if (to.role === 'superadmin')   return from.role === 'admin';
  if (from.centreId !== to.centreId) return false; // tenant boundary
  if (from.role === 'admin')   return true; // anyone in their centre
  if (from.role === 'teacher') {
    if (to.role === 'teacher' || to.role === 'admin') return true;
    if (to.role === 'student') return sharesClass(from, to); // own students only
    return false;
  }
  if (from.role === 'student') return to.role === 'teacher' ? sharesClass(to, from) : to.role === 'admin';
  return false;
}
const sharesClass = (teacher, student) =>
  (teacher.classIds || []).some(c => (student.classIds || []).includes(c));

// People a `user` may start a new DM with (scoped + de-duped).
function commsDmCandidates(user) {
  return usersArr().filter(u => canMessage(user, u));
}

// Resolve an announcement audience to the concrete recipient userIds (for the
// live "reaches N people" count). `scope` + `audience` mirror the stored shape.
function commsRecipients(scope, audience, authorCentreId) {
  const roles = audience.roles;
  const roleOk = (r) => roles === 'all' || (Array.isArray(roles) && roles.includes(r));
  return usersArr().filter(u => {
    if (u.role === 'superadmin') return false; // owners aren't an announcement audience
    if (scope === 'platform') {
      const cOk = audience.centreIds === 'all' || (Array.isArray(audience.centreIds) && audience.centreIds.includes(u.centreId));
      return cOk && roleOk(u.role);
    }
    if (scope === 'centre') return u.centreId === authorCentreId && roleOk(u.role);
    if (scope === 'class') {
      return u.centreId === authorCentreId && (audience.classIds || []).some(c => (u.classIds || []).includes(c)) && roleOk(u.role);
    }
    return false;
  }).map(u => u.id);
}

// Is announcement `a` visible to context `ctx`? (tenant + targeting)
function announcementVisible(a, ctx) {
  if (!ctx.user) return false;
  if (ctx.role === 'superadmin') return true; // platform-scoped view sees all
  if (a.authorId === ctx.userId) return true; // authors always see their own posts
  // Tenant boundary first.
  if (a.scope === 'platform') {
    const cOk = a.audience.centreIds === 'all' || (Array.isArray(a.audience.centreIds) && a.audience.centreIds.includes(ctx.centreId));
    if (!cOk) return false;
  } else if (a.centreId !== ctx.centreId) {
    return false;
  }
  // Role targeting.
  const roles = a.audience.roles;
  const roleOk = roles === 'all' || (Array.isArray(roles) && roles.includes(ctx.role));
  if (!roleOk) return false;
  // Class targeting.
  if (a.scope === 'class') {
    return (a.audience.classIds || []).some(c => (ctx.user.classIds || []).includes(c));
  }
  return true;
}

const threadVisible = (t, ctx) => {
  if (ctx.role === 'superadmin') return true;
  if (t.centreId !== ctx.centreId) return false;
  return (t.participants || []).includes(ctx.userId);
};

// ─── Unread maths ──────────────────────────────────────────────────────────────────
const isExpired = (a) => a.expiresAt && a.expiresAt < COMMS_TODAY;
const annUnread = (a, ctx) => !a.reads[ctx.userId];
const threadUnreadCount = (store, t, ctx) =>
  Object.values(store.messages).filter(m =>
    m.threadId === t.id && m.senderId !== ctx.userId && !(m.readBy || {})[ctx.userId]).length;

function commsUnreadCount(store, ctx) {
  if (!store || !ctx || !ctx.user) return { announcements: 0, messages: 0, total: 0 };
  const ann = Object.values(store.announcements)
    .filter(a => !isExpired(a) && announcementVisible(a, ctx) && a.authorId !== ctx.userId && annUnread(a, ctx)).length;
  const msg = Object.values(store.threads)
    .filter(t => threadVisible(t, ctx))
    .reduce((s, t) => s + threadUnreadCount(store, t, ctx), 0);
  return { announcements: ann, messages: msg, total: ann + msg };
}

// ══════════════════════════════════════════════════════════════════════════════════
//  HOOK — lifted into App, threaded down to page + bell + sidebar
// ══════════════════════════════════════════════════════════════════════════════════
function useComms(ctx) {
  const [store, setStore] = React.useState(cmLoad);
  const persist = React.useCallback((next) => { cmSave(next); setStore(next); }, []);

  const mutate = (key, fn) => persist({ ...store, [key]: fn({ ...store[key] }) });

  // ── Tenant-filtered reads ──
  const announcements = Object.values(store.announcements)
    .filter(a => announcementVisible(a, ctx))
    .sort((x, y) => (y.pinned - x.pinned) || (y.createdAt > x.createdAt ? 1 : -1));
  const threads = Object.values(store.threads)
    .filter(t => threadVisible(t, ctx))
    .sort((x, y) => (y.lastMessageAt > x.lastMessageAt ? 1 : -1));
  const messagesFor = (threadId) => Object.values(store.messages)
    .filter(m => m.threadId === threadId)
    .sort((x, y) => (x.createdAt > y.createdAt ? 1 : -1));

  const api = {
    store, ctx,
    announcements, threads, messagesFor,
    unread: commsUnreadCount(store, ctx),
    threadUnread: (t) => threadUnreadCount(store, t, ctx),

    // ── Announcement mutators ──
    postAnnouncement(draft) {
      const id = newId('an');
      const a = {
        id, scope: draft.scope, centreId: draft.centreId, classId: draft.classId || null,
        authorId: ctx.userId, authorName: (ctx.user || {}).name, authorRole: ctx.role,
        audience: draft.audience, title: draft.title, body: draft.body,
        priority: draft.priority || 'normal', pinned: !!draft.pinned, requiresAck: !!draft.requiresAck,
        createdAt: stamp(), expiresAt: draft.expiresAt || null,
        reads: { [ctx.userId]: stamp() }, acks: {},
      };
      mutate('announcements', m => { m[id] = a; return m; });
      return id;
    },
    markRead(id) {
      mutate('announcements', m => { if (m[id] && !m[id].reads[ctx.userId]) m[id] = { ...m[id], reads: { ...m[id].reads, [ctx.userId]: stamp() } }; return m; });
    },
    acknowledge(id) {
      mutate('announcements', m => {
        if (m[id]) m[id] = { ...m[id],
          reads: { ...m[id].reads, [ctx.userId]: m[id].reads[ctx.userId] || stamp() },
          acks:  { ...m[id].acks,  [ctx.userId]: stamp() } };
        return m;
      });
    },
    togglePin(id) {
      mutate('announcements', m => { if (m[id]) m[id] = { ...m[id], pinned: !m[id].pinned }; return m; });
    },
    deleteAnnouncement(id) {
      mutate('announcements', m => { delete m[id]; return m; });
    },

    // ── Thread / message mutators ──
    markThreadRead(threadId) {
      const ids = Object.values(store.messages).filter(m => m.threadId === threadId && !(m.readBy || {})[ctx.userId]).map(m => m.id);
      if (!ids.length) return;
      mutate('messages', m => { ids.forEach(id => { m[id] = { ...m[id], readBy: { ...(m[id].readBy || {}), [ctx.userId]: stamp() } }; }); return m; });
    },
    sendMessage(threadId, body) {
      const text = (body || '').trim();
      if (!text) return;
      const id = newId('m');
      const msg = { id, threadId, senderId: ctx.userId, senderName: (ctx.user || {}).name, senderRole: ctx.role,
        body: text, attachments: [], createdAt: stamp(), readBy: { [ctx.userId]: stamp() } };
      const next = { ...store,
        messages: { ...store.messages, [id]: msg },
        threads:  { ...store.threads, [threadId]: { ...store.threads[threadId], lastMessageAt: msg.createdAt } } };
      persist(next);
    },
    // Find an existing DM between self + other, or create one. Returns threadId.
    openOrCreateDm(otherId) {
      const existing = Object.values(store.threads).find(t =>
        t.type === 'dm' && t.participants.length === 2 &&
        t.participants.includes(ctx.userId) && t.participants.includes(otherId));
      if (existing) return existing.id;
      const id = newId('th');
      const t = { id, centreId: ctx.centreId, type: 'dm', participants: [ctx.userId, otherId],
        classId: null, subject: null, createdBy: ctx.userId, createdAt: stamp(), lastMessageAt: stamp() };
      mutate('threads', m => { m[id] = t; return m; });
      return id;
    },
  };
  return api;
}

// ══════════════════════════════════════════════════════════════════════════════════
//  PRESENTATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════════
const PRIORITY_META = {
  normal:    { label: 'Normal',    color: () => DS.accent,   bg: () => DS.accentLight },
  important: { label: 'Important', color: () => DS.warning,  bg: () => DS.warningBg },
  urgent:    { label: 'Urgent',    color: () => DS.danger,   bg: () => DS.dangerBg },
};
const SCOPE_META = {
  platform: { label: 'Platform', icon: 'zap' },
  centre:   { label: 'Centre',   icon: 'book' },
  class:    { label: 'Class',    icon: 'users' },
};

// "2h ago" / "3d ago" / date for older.
function relTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = new Date(COMMS_TODAY + 'T09:30:00Z').getTime();
  const diff = Math.max(0, now - then);
  const m = Math.round(diff / 60000), h = Math.round(diff / 3600000), d = Math.round(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  if (d < 7) return d + 'd ago';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
const classLabel = (classId) => {
  if (typeof SEED_CLASSES === 'undefined') return classId;
  const c = SEED_CLASSES.find(x => x.id === classId);
  return c ? `${c.name} · ${c.group}` : classId;
};

const Chip = ({ icon, children, color, bg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    background: bg || DS.surface, color: color || DS.muted, border: `1px solid ${DS.border}`,
  }}>
    {icon && <Icon name={icon} size={11} color={color || DS.muted} />}{children}
  </span>
);

// ══════════════════════════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ══════════════════════════════════════════════════════════════════════════════════
const AnnouncementCard = ({ a, comms }) => {
  const { ctx } = comms;
  const isAuthor = a.authorId === ctx.userId;
  const unread = !isAuthor && !a.reads[ctx.userId];
  const acked = !!a.acks[ctx.userId];
  const p = PRIORITY_META[a.priority] || PRIORITY_META.normal;
  const accent = p.color();
  const expired = isExpired(a);
  const recipientCount = (a.audience ? commsRecipients(a.scope, a.audience, a.centreId) : []).length;
  const ackCount = Object.keys(a.acks || {}).length;

  return (
    <div style={{
      position: 'relative', background: DS.bg, border: `1px solid ${unread ? accent + '55' : DS.border}`,
      borderRadius: 10, overflow: 'hidden', opacity: expired ? 0.6 : 1,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />
      <div style={{ padding: '16px 20px 16px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              {a.pinned && <Icon name="pin" size={13} color={DS.muted} />}
              <span style={{ fontSize: 15, fontWeight: unread ? 700 : 600, color: DS.text }}>{a.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: DS.muted }}>
              <Avatar name={a.authorName || '—'} size={18} />
              <span style={{ fontWeight: 500, color: DS.sub }}>{a.authorName}</span>
              <span>· {ROLE_LABEL[a.authorRole] || a.authorRole}</span>
              <span>· {relTime(a.createdAt)}</span>
              {expired && <Chip color={DS.faint}>Expired</Chip>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip icon={(SCOPE_META[a.scope] || {}).icon}
              color={DS.sub}>{a.scope === 'class' && a.classId ? classLabel(a.classId).split(' · ')[0] : (SCOPE_META[a.scope] || {}).label}</Chip>
            {a.priority !== 'normal' && <Chip color={accent} bg={p.bg()}>{p.label}</Chip>}
          </div>
        </div>

        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.55, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{a.body}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {ctx.role === 'superadmin' && a.scope === 'platform' && (
            <Chip color={DS.muted}>{a.audience.centreIds === 'all' ? 'All centres' : `${(a.audience.centreIds || []).length} centre(s)`}</Chip>
          )}
          {(ctx.role === 'superadmin' || isAuthor) && (
            <Chip icon="users" color={DS.muted}>{recipientCount} recipient{recipientCount === 1 ? '' : 's'}</Chip>
          )}
          {a.requiresAck && (
            <Chip icon="check" color={ackCount ? DS.success : DS.muted}>{ackCount} acknowledged</Chip>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {a.requiresAck && !isAuthor && (
              acked
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: DS.success }}>
                    <Icon name="check" size={14} color={DS.success} /> Acknowledged
                  </span>
                : <Btn small variant="primary" icon="check" onClick={() => comms.acknowledge(a.id)}>Acknowledge</Btn>
            )}
            {!a.requiresAck && !isAuthor && unread && (
              <Btn small variant="secondary" onClick={() => comms.markRead(a.id)}>Mark read</Btn>
            )}
            {(isAuthor || ctx.role === 'superadmin' || ctx.role === 'admin') && (
              <button onClick={() => comms.togglePin(a.id)} title={a.pinned ? 'Unpin' : 'Pin'} style={{
                background: 'none', border: `1px solid ${DS.border}`, borderRadius: 6, padding: '5px 7px',
                cursor: 'pointer', color: a.pinned ? DS.accent : DS.faint, display: 'flex',
              }}><Icon name="pin" size={14} color={a.pinned ? DS.accent : DS.faint} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnnouncementsFeed = ({ comms, onCompose }) => {
  const { ctx } = comms;
  const [scope, setScope] = React.useState('all');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [q, setQ] = React.useState('');

  let list = comms.announcements;
  if (scope !== 'all') list = list.filter(a => a.scope === scope);
  if (roleFilter !== 'all') list = list.filter(a => a.audience.roles === 'all' || (a.audience.roles || []).includes(roleFilter));
  if (unreadOnly) list = list.filter(a => a.authorId !== ctx.userId && !a.reads[ctx.userId]);
  if (q.trim()) {
    const t = q.toLowerCase();
    list = list.filter(a => (a.title + ' ' + a.body + ' ' + (a.authorName || '')).toLowerCase().includes(t));
  }

  const unreadTotal = comms.unread.announcements;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search announcements…" style={{ maxWidth: 300 }} />
        <Select value={scope} onChange={e => setScope(e.target.value)} style={{ width: 150 }}>
          <option value="all">All scopes</option>
          {(ctx.role === 'superadmin' ? ['platform','centre','class'] : ['centre','class']).map(s =>
            <option key={s} value={s}>{(SCOPE_META[s] || {}).label}</option>)}
        </Select>
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 150 }}>
          <option value="all">All audiences</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
        </Select>
        <button onClick={() => setUnreadOnly(v => !v)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${unreadOnly ? DS.accentBorder : DS.border}`, background: unreadOnly ? DS.accentLight : DS.bg,
          color: unreadOnly ? DS.accent : DS.muted, fontSize: 13, fontWeight: 500,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: unreadOnly ? DS.accent : DS.faint }} />
          Unread {unreadTotal > 0 && `(${unreadTotal})`}
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="message" title="No announcements"
          message={q || scope !== 'all' || roleFilter !== 'all' || unreadOnly ? 'No announcements match your filters.' : 'There are no announcements yet.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(a => <AnnouncementCard key={a.id} a={a} comms={comms} />)}
        </div>
      )}
    </div>
  );
};

// ─── Composer (role-aware audience picker) ─────────────────────────────────────────
const TogglePill = ({ active, onClick, children }) => (
  <button onClick={onClick} type="button" style={{
    padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
    border: `1px solid ${active ? DS.accentBorder : DS.border}`,
    background: active ? DS.accentLight : DS.bg, color: active ? DS.accent : DS.muted,
  }}>{children}</button>
);

const AnnouncementComposer = ({ open, onClose, comms }) => {
  const { ctx } = comms;
  const user = ctx.user;
  const scopes = allowedScopes(user);
  const [scope, setScope] = React.useState(scopes[0] || 'centre');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [priority, setPriority] = React.useState('normal');
  const [pinned, setPinned] = React.useState(false);
  const [requiresAck, setRequiresAck] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState('');
  // targeting
  const [roles, setRoles] = React.useState(['teacher', 'student']);
  const [centreIds, setCentreIds] = React.useState('all');
  const [classIds, setClassIds] = React.useState([]);

  React.useEffect(() => { if (open) {
    setScope(scopes[0] || 'centre'); setTitle(''); setBody(''); setPriority('normal');
    setPinned(false); setRequiresAck(false); setExpiresAt('');
    setRoles(['teacher', 'student']); setCentreIds('all'); setClassIds([]);
  } }, [open]);

  // Classes this user may target (teacher → own; admin/superadmin → centre's classes).
  const myClasses = React.useMemo(() => {
    if (typeof SEED_CLASSES === 'undefined') return [];
    if (user.role === 'teacher') return SEED_CLASSES.filter(c => (user.classIds || []).includes(c.id));
    return SEED_CLASSES; // admin/superadmin: the centre's classes (demo: the bm class list)
  }, [user]);

  const audience = scope === 'platform'
    ? { centreIds, roles: roles.length ? roles : 'all', classIds: [] }
    : scope === 'class'
      ? { centreIds: [ctx.centreId], roles: roles.length ? roles : 'all', classIds }
      : { centreIds: [ctx.centreId], roles: roles.length ? roles : 'all', classIds: [] };

  const reach = commsRecipients(scope, audience, ctx.centreId).length;
  const valid = title.trim() && body.trim() && (scope !== 'class' || classIds.length > 0);

  const toggleRole = (r) => setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  const toggleClass = (id) => setClassIds(cs => cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id]);
  const toggleCentre = (id) => setCentreIds(cs => {
    if (cs === 'all') return [id];
    const next = cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id];
    return next.length === centresArr().length ? 'all' : next;
  });

  const submit = () => {
    if (!valid) return;
    comms.postAnnouncement({ scope, centreId: scope === 'platform' ? null : ctx.centreId,
      classId: scope === 'class' ? classIds[0] : null, audience, title, body, priority, pinned, requiresAck,
      expiresAt: expiresAt || null });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New announcement" icon="message" width={600}
      footer={[
        <Btn key="c" variant="secondary" small onClick={onClose}>Cancel</Btn>,
        <Btn key="p" variant="primary" small icon="send" onClick={submit} style={{ opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none' }}>Post announcement</Btn>,
      ]}>

      {scopes.length > 1 && (
        <Field label="Scope">
          <Segmented fullWidth value={scope} onChange={setScope}
            options={scopes.map(s => ({ id: s, label: (SCOPE_META[s] || {}).label }))} />
        </Field>
      )}

      {/* Audience — swaps by role/scope */}
      {scope === 'platform' && (
        <Field label="Centres" hint="Platform-wide announcements reach selected centres.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TogglePill active={centreIds === 'all'} onClick={() => setCentreIds('all')}>All centres</TogglePill>
            {centresArr().map(c => (
              <TogglePill key={c.id} active={centreIds !== 'all' && centreIds.includes(c.id)} onClick={() => toggleCentre(c.id)}>{c.name}</TogglePill>
            ))}
          </div>
        </Field>
      )}

      {scope === 'class' && (
        <Field label={user.role === 'teacher' ? 'Your classes' : 'Classes'} required hint="Only students/parents of the selected classes will receive this.">
          {myClasses.length === 0
            ? <div style={{ fontSize: 13, color: DS.faint }}>No classes available.</div>
            : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 140, overflow: 'auto' }}>
                {myClasses.map(c => (
                  <TogglePill key={c.id} active={classIds.includes(c.id)} onClick={() => toggleClass(c.id)}>{c.name} · {c.group}</TogglePill>
                ))}
              </div>}
        </Field>
      )}

      {scope !== 'class' && (
        <Field label="Audience roles">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['teacher', 'student', 'parent'].map(r => (
              <TogglePill key={r} active={roles.includes(r)} onClick={() => toggleRole(r)}>{ROLE_LABEL[r]}s</TogglePill>
            ))}
          </div>
        </Field>
      )}

      <Field label="Title" required>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. INSET day reminder" />
      </Field>
      <Field label="Message" required>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" style={{ minHeight: 110 }} />
      </Field>

      <Field label="Priority">
        <Segmented fullWidth value={priority} onChange={setPriority}
          options={[{ id: 'normal', label: 'Normal' }, { id: 'important', label: 'Important' }, { id: 'urgent', label: 'Urgent' }]} />
      </Field>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <TogglePill active={pinned} onClick={() => setPinned(v => !v)}>📌 Pin to top</TogglePill>
        <TogglePill active={requiresAck} onClick={() => setRequiresAck(v => !v)}>✓ Require acknowledgement</TogglePill>
      </div>

      <Field label="Expiry (optional)" hint="The announcement is dimmed after this date.">
        <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ maxWidth: 200 }} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 8, background: DS.accentLight, border: `1px solid ${DS.accentBorder}` }}>
        <Icon name="users" size={16} color={DS.accent} />
        <span style={{ fontSize: 13, color: DS.accent, fontWeight: 600 }}>This will reach {reach} {reach === 1 ? 'person' : 'people'}</span>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════════
//  MESSAGES / THREADS — Inbox (two pane)
// ══════════════════════════════════════════════════════════════════════════════════
const threadTitle = (t, ctx) => {
  if (t.subject) return t.subject;
  if (t.type === 'dm') {
    const other = t.participants.find(p => p !== ctx.userId);
    return (userById(other) || {}).name || 'Conversation';
  }
  return 'Group';
};
const threadOther = (t, ctx) => userById(t.participants.find(p => p !== ctx.userId));

const ThreadListItem = ({ t, comms, active, onClick }) => {
  const { ctx } = comms;
  const title = threadTitle(t, ctx);
  const unread = comms.threadUnread(t);
  const msgs = comms.messagesFor(t.id);
  const last = msgs[msgs.length - 1];
  const isGroup = t.type !== 'dm';
  const other = !isGroup ? threadOther(t, ctx) : null;
  return (
    <button onClick={onClick} style={{
      display: 'flex', gap: 11, alignItems: 'center', width: '100%', textAlign: 'left',
      padding: '12px 14px', border: 'none', borderBottom: `1px solid ${DS.border}`,
      background: active ? DS.accentLight : 'transparent', cursor: 'pointer',
    }}>
      {isGroup
        ? <div style={{ width: 38, height: 38, borderRadius: '50%', background: DS.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="users" size={18} color="#fff" /></div>
        : <Avatar name={(other || {}).name || '—'} size={38} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: unread ? 700 : 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{title}</span>
          <span style={{ fontSize: 11, color: DS.faint, flexShrink: 0 }}>{last ? relTime(last.createdAt) : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: unread ? DS.sub : DS.muted, fontWeight: unread ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {last ? (last.senderId === ctx.userId ? 'You: ' : isGroup ? (last.senderName || '').split(' ')[0] + ': ' : '') + last.body : 'No messages yet'}
          </span>
          {unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: DS.accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
        </div>
      </div>
    </button>
  );
};

const Bubble = ({ m, mine, showSender, isGroup, participants, ctx }) => {
  // "Seen" receipt for my own last message: anyone else in the thread has it in readBy.
  const seenByOthers = mine && (participants || []).some(p => p !== ctx.userId && (m.readBy || {})[p]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {showSender && !mine && (
        <div style={{ fontSize: 11, color: DS.muted, fontWeight: 600, margin: '0 0 3px 10px' }}>
          {m.senderName} <span style={{ color: DS.faint, fontWeight: 400 }}>· {ROLE_LABEL[m.senderRole] || m.senderRole}</span>
        </div>
      )}
      <div style={{
        maxWidth: '74%', padding: '9px 13px', borderRadius: 14,
        borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
        background: mine ? DS.accent : DS.surface, color: mine ? '#fff' : DS.text,
        border: mine ? 'none' : `1px solid ${DS.border}`, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
      }}>{m.body}</div>
      <div style={{ fontSize: 10.5, color: DS.faint, margin: '3px 6px 0' }}>
        {relTime(m.createdAt)}{seenByOthers ? ' · Seen' : ''}
      </div>
    </div>
  );
};

const ThreadView = ({ t, comms }) => {
  const { ctx } = comms;
  const msgs = comms.messagesFor(t.id);
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef(null);
  const isGroup = t.type !== 'dm';
  const title = threadTitle(t, ctx);
  const other = !isGroup ? threadOther(t, ctx) : null;

  // Mark read on open / when new messages arrive.
  React.useEffect(() => { comms.markThreadRead(t.id); }, [t.id, msgs.length]);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [t.id, msgs.length]);

  const send = () => { if (draft.trim()) { comms.sendMessage(t.id, draft); setDraft(''); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderBottom: `1px solid ${DS.border}`, flexShrink: 0 }}>
        {isGroup
          ? <div style={{ width: 36, height: 36, borderRadius: '50%', background: DS.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="users" size={17} color="#fff" /></div>
          : <Avatar name={(other || {}).name || '—'} size={36} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: DS.text }}>{title}</div>
          <div style={{ fontSize: 12, color: DS.muted }}>
            {isGroup
              ? t.participants.map(p => (userById(p) || {}).name).filter(Boolean).join(', ')
              : (other ? ROLE_LABEL[other.role] : '')}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '18px 18px 6px', background: DS.bg }}>
        {msgs.length === 0
          ? <EmptyState icon="message" title="No messages yet" message="Say hello to start the conversation." />
          : msgs.map((m, i) => {
              const mine = m.senderId === ctx.userId;
              const prev = msgs[i - 1];
              const showSender = isGroup && (!prev || prev.senderId !== m.senderId);
              return <Bubble key={m.id} m={m} mine={mine} showSender={showSender} isGroup={isGroup} participants={t.participants} ctx={ctx} />;
            })}
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '12px 16px', borderTop: `1px solid ${DS.border}`, flexShrink: 0 }}>
        <Textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ minHeight: 42, maxHeight: 120 }} />
        <Btn variant="primary" icon="send" onClick={send} style={{ opacity: draft.trim() ? 1 : 0.5, pointerEvents: draft.trim() ? 'auto' : 'none' }}>Send</Btn>
      </div>
    </div>
  );
};

const NewMessageModal = ({ open, onClose, comms, onOpenThread }) => {
  const { ctx } = comms;
  const [q, setQ] = React.useState('');
  React.useEffect(() => { if (open) setQ(''); }, [open]);
  const candidates = commsDmCandidates(ctx.user)
    .filter(u => u.name.toLowerCase().includes(q.toLowerCase()));

  const start = (u) => { const id = comms.openOrCreateDm(u.id); onClose(); onOpenThread(id); };

  return (
    <Modal open={open} onClose={onClose} title="New message" subtitle="Start a conversation" icon="mail" width={460}>
      <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" style={{ marginBottom: 14 }} />
      {candidates.length === 0
        ? <EmptyState icon="users" title="No one to message" message="There's no one in your centre you can start a new conversation with." />
        : <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflow: 'auto' }}>
            {candidates.map(u => (
              <button key={u.id} onClick={() => start(u)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px', border: 'none',
                borderBottom: `1px solid ${DS.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left',
              }}>
                <Avatar name={u.name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: DS.muted }}>{ROLE_LABEL[u.role]}{ctx.role === 'superadmin' ? ` · ${centreName(u.centreId)}` : ''}</div>
                </div>
                <Icon name="chevron_r" size={15} color={DS.faint} />
              </button>
            ))}
          </div>}
    </Modal>
  );
};

const Inbox = ({ comms, initialThreadId }) => {
  const threads = comms.threads;
  const [activeId, setActiveId] = React.useState(initialThreadId || (threads[0] && threads[0].id) || null);
  const [newOpen, setNewOpen] = React.useState(false);
  React.useEffect(() => { if (initialThreadId) setActiveId(initialThreadId); }, [initialThreadId]);
  // Keep selection valid as threads change (e.g. a new DM created).
  React.useEffect(() => { if (activeId && !threads.find(t => t.id === activeId)) setActiveId(threads[0] ? threads[0].id : null); }, [threads.length]);

  const active = threads.find(t => t.id === activeId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 220px)', minHeight: 460, border: `1px solid ${DS.cardBorder}`, borderRadius: 10, overflow: 'hidden', background: DS.bg }}>
      {/* Left: thread list */}
      <div style={{ width: 320, borderRight: `1px solid ${DS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${DS.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>Messages</span>
          <Btn small variant="primary" icon="plus" onClick={() => setNewOpen(true)}>New</Btn>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {threads.length === 0
            ? <EmptyState icon="message" title="No conversations" message="Start a new message to begin." />
            : threads.map(t => <ThreadListItem key={t.id} t={t} comms={comms} active={t.id === activeId} onClick={() => setActiveId(t.id)} />)}
        </div>
      </div>
      {/* Right: active thread */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {active
          ? <ThreadView t={active} comms={comms} />
          : <EmptyState icon="message" title="Select a conversation" message="Choose a thread on the left, or start a new message." />}
      </div>
      <NewMessageModal open={newOpen} onClose={() => setNewOpen(false)} comms={comms} onOpenThread={setActiveId} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════════
//  SUPERADMIN SUPPORT (preserves the old SACommsPage content as a 3rd section)
// ══════════════════════════════════════════════════════════════════════════════════
const SupportSection = () => {
  if (typeof window.SACommsPage === 'function') return <window.SACommsPage embedded />;
  return <EmptyState icon="alert" title="Support" message="Support tickets are unavailable." />;
};

// ══════════════════════════════════════════════════════════════════════════════════
//  PAGE
// ══════════════════════════════════════════════════════════════════════════════════
const CommunicationsPage = ({ role, section, comms }) => {
  const ctx = comms.ctx;
  const [composeOpen, setComposeOpen] = React.useState(false);
  const sec = section || 'announcements';
  const isSuper = role === 'superadmin';

  const subtitle = isSuper
    ? 'Platform-wide announcements, conversations and support across all centres'
    : ctx.user ? `${centreName(ctx.centreId)} · signed in as ${ctx.user.name}` : '';

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Communications"
        subtitle={subtitle}
        actions={sec === 'announcements' && canCompose(ctx.user)
          ? [<Btn key="new" variant="primary" icon="plus" small onClick={() => setComposeOpen(true)}>New announcement</Btn>]
          : sec === 'inbox' ? [] : []}
      />

      {sec === 'announcements' && <AnnouncementsFeed comms={comms} onCompose={() => setComposeOpen(true)} />}
      {sec === 'inbox' && <Inbox comms={comms} />}
      {sec === 'support' && isSuper && <SupportSection />}

      {canCompose(ctx.user) && <AnnouncementComposer open={composeOpen} onClose={() => setComposeOpen(false)} comms={comms} />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION BELL (topbar)
// ══════════════════════════════════════════════════════════════════════════════════
const NotificationBell = ({ comms, onNavigate }) => {
  const { ctx } = comms;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const unread = comms.unread;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!ctx.user) return null;

  // Recent items: unread announcements + threads with unread, newest first.
  const recentAnn = comms.announcements
    .filter(a => a.authorId !== ctx.userId && !a.reads[ctx.userId] && !isExpired(a))
    .slice(0, 4)
    .map(a => ({ kind: 'ann', id: a.id, title: a.title, sub: `${a.authorName} · ${relTime(a.createdAt)}`, priority: a.priority }));
  const recentMsg = comms.threads
    .map(t => ({ t, n: comms.threadUnread(t) }))
    .filter(x => x.n > 0)
    .slice(0, 4)
    .map(({ t, n }) => ({ kind: 'msg', id: t.id, title: threadTitle(t, ctx), sub: `${n} new message${n === 1 ? '' : 's'}` }));
  const items = [...recentMsg, ...recentAnn];

  const go = (sec) => { setOpen(false); onNavigate && onNavigate(ctx.role, 'comms:' + sec); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', position: 'relative' }}>
        <Icon name="bell" size={16} />
        {unread.total > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: DS.danger, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
            {unread.total > 9 ? '9+' : unread.total}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 30, right: 0, width: 320, background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, boxShadow: '0 16px 48px rgba(17,24,39,0.18)', zIndex: 1100, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${DS.border}` }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: DS.text }}>Notifications</span>
            {unread.total > 0 && <Badge variant="danger">{unread.total} new</Badge>}
          </div>
          <div style={{ maxHeight: 340, overflow: 'auto' }}>
            {items.length === 0
              ? <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: DS.muted }}>You're all caught up 🎉</div>
              : items.map(it => (
                  <button key={it.kind + it.id} onClick={() => go(it.kind === 'ann' ? 'announcements' : 'inbox')} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', textAlign: 'left',
                    padding: '11px 14px', border: 'none', borderBottom: `1px solid ${DS.border}`, background: 'transparent', cursor: 'pointer',
                  }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: it.kind === 'ann' ? (PRIORITY_META[it.priority] || PRIORITY_META.normal).bg() : DS.accentLight,
                      color: it.kind === 'ann' ? (PRIORITY_META[it.priority] || PRIORITY_META.normal).color() : DS.accent }}>
                      <Icon name={it.kind === 'ann' ? 'message' : 'mail'} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{it.sub}</div>
                    </div>
                  </button>
                ))}
          </div>
          <button onClick={() => go('inbox')} style={{ width: '100%', padding: '11px', border: 'none', borderTop: `1px solid ${DS.border}`, background: DS.surface, color: DS.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            View all
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Exports ────────────────────────────────────────────────────────────────────────
Object.assign(window, {
  useComms, commsContext, CommunicationsPage, NotificationBell,
  commsUnreadCount, canAnnounce, canMessage, commsRecipients,
});

})();
