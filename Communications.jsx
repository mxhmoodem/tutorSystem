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

// v2: store gained `config` (per-centre safety posture), `flags` (flag resolutions)
// and `concerns` (DSL log), plus new seed threads/channels. Bumped so existing v1
// blobs re-seed cleanly rather than losing the new content to backfill.
// v3: expanded announcement seed set (notice-board inbox). Bumped for the same reason.
const COMMS_KEY = 'tutoros.comms.v3';
const COMMS_TODAY = '2026-06-18';
// The demo "now" — used for relative times, scheduling and quiet-hours maths so the
// prototype reads consistently regardless of the wall clock.
const cmNow = () => new Date(COMMS_TODAY + 'T09:30:00Z');

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
    config:        (typeof COMMS_CONFIG !== 'undefined' ? JSON.parse(JSON.stringify(COMMS_CONFIG)) : {}),
    flags:         (typeof COMMS_FLAGS !== 'undefined' ? JSON.parse(JSON.stringify(COMMS_FLAGS)) : {}),
    concerns:      (typeof COMMS_CONCERNS !== 'undefined' ? COMMS_CONCERNS.slice() : []),
  };
  if (!raw || typeof raw !== 'object') return seed;
  // Backfill missing top-level keys so older blobs still load.
  return {
    announcements: raw.announcements || seed.announcements,
    threads:       raw.threads       || seed.threads,
    messages:      raw.messages      || seed.messages,
    config:        raw.config        || seed.config,
    flags:         raw.flags         || seed.flags,
    concerns:      raw.concerns      || seed.concerns,
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
//  SAFETY POSTURE — presets + per-centre config
// ══════════════════════════════════════════════════════════════════════════════════
// The three presets only set the four "posture" toggles; everything else (DSL leads,
// wordlist, retention, authoring policy) is preserved when a preset is applied.
const COMMS_PRESETS = {
  locked: {
    label: 'Locked-down', icon: 'lock',
    blurb: 'The safest default. Students talk to staff only in class channels — no private DMs. Strictest hours and no images.',
    values: { dmEnabled: false, quietFrom: '19:00', quietTo: '07:00', images: false, dslObserver: true },
    lines: ['1:1 student↔staff messaging off', 'Quiet hours 7pm – 7am', 'Image sharing off', 'DSL observer on every thread'],
  },
  standard: {
    label: 'Standard', icon: 'shield',
    blurb: 'A balanced setup for most centres. 1:1 messaging is on but fully monitored, with sensible quiet hours.',
    values: { dmEnabled: true, quietFrom: '21:00', quietTo: '07:00', images: true, dslObserver: true },
    lines: ['1:1 messaging on (monitored)', 'Quiet hours 9pm – 7am', 'Image sharing on', 'DSL observer on every thread'],
  },
  open: {
    label: 'Open', icon: 'users',
    blurb: 'Maximum flexibility for older cohorts. Fewer restrictions — still logged and visible to your DSL.',
    values: { dmEnabled: true, quietFrom: '23:00', quietTo: '06:00', images: true, dslObserver: false },
    lines: ['1:1 messaging on (monitored)', 'Quiet hours 11pm – 6am', 'Image sharing on', 'DSL observer optional'],
  },
};
const DEFAULT_CONFIG = () => ({
  preset: 'standard', ...COMMS_PRESETS.standard.values,
  dslLeadId: null, dslDeputyId: null, retention: '3y',
  wordlist: ['address', 'meet up', 'whatsapp', 'snapchat', 'instagram', 'phone number', 'kik', 'secret'],
  announceAuthors: 'admins', approvalWorkflow: false,
});
// Resolve the active centre's config (falls back to Standard defaults).
function commsConfig(store, centreId) {
  const c = (store && store.config && store.config[centreId]) || null;
  return c ? { ...DEFAULT_CONFIG(), ...c } : DEFAULT_CONFIG();
}

// ─── Quiet hours (HH:MM window, handles overnight wrap; uses UTC for determinism) ──
const hmToMin = (hm) => { const [h, m] = (hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
function quietHoursActive(config, date) {
  if (!config) return false;
  const from = hmToMin(config.quietFrom), to = hmToMin(config.quietTo);
  if (from === to) return false;
  const t = date.getUTCHours() * 60 + date.getUTCMinutes();
  return from < to ? (t >= from && t < to) : (t >= from || t < to);
}

// ─── Class-derived dimensions (year group / subject) from SEED_CLASSES ─────────────
const seedClasses = () => (typeof SEED_CLASSES !== 'undefined' ? SEED_CLASSES : []);
const classById   = (id) => seedClasses().find(c => c.id === id) || null;
const classYear   = (cls) => { const m = (cls && cls.group || '').match(/Year\s*\d+/i); return m ? m[0].replace(/\s+/, ' ') : null; };
const classSubject= (cls) => (cls && cls.name || '').replace(/^(GCSE|A-?Level|AS-?Level|KS\d|BTEC)\s+/i, '').replace(/\.$/, '').trim();
const userYears   = (user) => [...new Set((user.classIds || []).map(id => classYear(classById(id))).filter(Boolean))];
const userSubjects= (user) => [...new Set((user.classIds || []).map(id => classSubject(classById(id))).filter(Boolean))];
const allYears    = () => [...new Set(seedClasses().map(c => classYear(c)).filter(Boolean))].sort();
const allSubjects = () => [...new Set(seedClasses().map(c => classSubject(c)).filter(Boolean))].sort();

// ─── Threads: which are "monitored" (staff↔student) ────────────────────────────────
const STAFF_ROLES = ['admin', 'teacher', 'superadmin'];
const isStaff = (u) => !!u && STAFF_ROLES.includes(u.role);
function threadParties(t) {
  const us = (t.participants || []).map(userById).filter(Boolean);
  return { staff: us.filter(isStaff), students: us.filter(u => u.role === 'student') };
}
// A thread is safeguarding-monitored when it puts a student (a minor) in contact
// with staff. `monitored`/`channelType:'monitored'` is the explicit channel-type
// flag stamped at creation (immutable, DSL-readable, attachment-restricted) — the
// server-enforced invariant, honoured here first so it can't be dropped.
function isMonitoredThread(t) {
  if (!t) return false;
  if (t.monitored || t.channelType === 'monitored') return true;
  if (t.type === 'channel') return true;
  const { staff, students } = threadParties(t);
  return staff.length > 0 && students.length > 0;
}
// True when a thread contains a minor → attachments are restricted to text (D10).
function threadHasMinor(t) { return !!t && threadParties(t).students.length > 0; }

// ─── Client-side flagging ──────────────────────────────────────────────────────────
const PHONE_RE  = /(?:\+?\d[\d\s().-]{8,}\d)/;
const SOCIAL_RE = /\b(whats[\s-]?app|snap(?:chat)?|insta(?:gram)?|telegram|tiktok|kik|discord)\b|@[\w.]{3,}/i;
const MEETUP_RE = /\b(add me on|dm me|text me|my (?:number|mobile|cell) is|meet up|come over|my snap)\b/i;
const FLAG_REASONS = {
  external:     { id: 'external',     label: 'external contact', sev: 'high' },
  keyword:      { id: 'keyword',      label: 'keyword',          sev: 'high' },
  image:        { id: 'image',        label: 'image shared',     sev: 'high' },
  out_of_hours: { id: 'out_of_hours', label: 'out of hours',     sev: 'low'  },
};
const REASON_ORDER = ['external', 'keyword', 'image', 'out_of_hours'];
function messageReasons(m, config) {
  const reasons = [];
  const text = m.body || '';
  if (PHONE_RE.test(text) || SOCIAL_RE.test(text) || MEETUP_RE.test(text)) reasons.push('external');
  const wl = (config.wordlist || []).map(w => w.toLowerCase());
  if (wl.some(w => text.toLowerCase().includes(w))) reasons.push('keyword');
  if ((m.attachments || []).some(a => (a.type || '') === 'image')) reasons.push('image');
  if (m.senderRole === 'student' && quietHoursActive(config, new Date(m.createdAt))) reasons.push('out_of_hours');
  return reasons;
}
// One flag per flagged message, merged with its stored resolution.
function computeFlags(store, ctx) {
  const config = commsConfig(store, ctx.centreId);
  const monitored = Object.values(store.threads).filter(t =>
    (ctx.role === 'superadmin' || t.centreId === ctx.centreId) && isMonitoredThread(t));
  const monIds = new Set(monitored.map(t => t.id));
  const out = [];
  Object.values(store.messages).forEach(m => {
    if (!monIds.has(m.threadId)) return;
    const reasons = messageReasons(m, config);
    if (!reasons.length) return;
    const primary = REASON_ORDER.find(r => reasons.includes(r));
    out.push({
      id: m.id, messageId: m.id, threadId: m.threadId, msg: m,
      reasons, primary, sev: FLAG_REASONS[primary].sev,
      resolution: (store.flags || {})[m.id] || { status: 'open' },
    });
  });
  return out.sort((a, b) => (a.msg.createdAt > b.msg.createdAt ? -1 : 1));
}

// ══════════════════════════════════════════════════════════════════════════════════
//  PERMISSION & SCOPE MATRIX — single source of truth
// ══════════════════════════════════════════════════════════════════════════════════

// Can `user` post an announcement at this scope?
function canAnnounce(user, scope) {
  if (!user) return false;
  if (user.role === 'superadmin') return ['platform', 'centre', 'class', 'year', 'subject'].includes(scope);
  if (user.role === 'admin')      return ['centre', 'class', 'year', 'subject'].includes(scope);
  if (user.role === 'teacher')    return scope === 'class';
  return false; // students / parents receive only
}
// Any composer at all for this role?
const canCompose = (user) => !!user && (user.role === 'superadmin' || user.role === 'admin' || user.role === 'teacher');

// The scopes a given user may choose from in the composer.
function allowedScopes(user) {
  if (!user) return [];
  if (user.role === 'superadmin') return ['platform', 'centre', 'class', 'year', 'subject'];
  if (user.role === 'admin')      return ['centre', 'class', 'year', 'subject'];
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
    if (scope === 'year') {
      return u.centreId === authorCentreId && roleOk(u.role) && userYears(u).some(y => (audience.years || []).includes(y));
    }
    if (scope === 'subject') {
      return u.centreId === authorCentreId && roleOk(u.role) && userSubjects(u).some(s => (audience.subjects || []).includes(s));
    }
    return false;
  }).map(u => u.id);
}

// Has a scheduled announcement gone live yet (relative to the demo "now")?
const isScheduled = (a) => !!a.publishAt && new Date(a.publishAt) > cmNow();

// Is announcement `a` visible to context `ctx`? (tenant + targeting)
function announcementVisible(a, ctx) {
  if (!ctx.user) return false;
  if (ctx.role === 'superadmin') return true; // platform-scoped view sees all
  if (a.authorId === ctx.userId) return true; // authors always see their own posts
  if (isScheduled(a)) return false;            // recipients don't see future posts
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
  // Dimensional targeting.
  if (a.scope === 'class')   return (a.audience.classIds || []).some(c => (ctx.user.classIds || []).includes(c));
  if (a.scope === 'year')    return userYears(ctx.user).some(y => (a.audience.years || []).includes(y));
  if (a.scope === 'subject') return userSubjects(ctx.user).some(s => (a.audience.subjects || []).includes(s));
  return true;
}

const threadVisible = (t, ctx) => {
  if (ctx.role === 'superadmin') return true;
  if (t.centreId !== ctx.centreId) return false;
  return (t.participants || []).includes(ctx.userId);
};

// A 1:1 student↔staff DM is DATA the active safety preset governs (§6): when 1:1
// student↔staff messaging is off (Locked-down preset → dmEnabled=false), those
// threads must not appear at all — the preset gates the DATA, not merely the
// composer. Gating this dynamically also "repairs" the seed (the Sarah↔Oliver
// 1:1) without deleting it: the thread simply reappears if the preset re-allows.
const dmIsStudentStaff = (t) => {
  if (!t || t.type !== 'dm' || (t.participants || []).length !== 2) return false;
  const us = usersArr();
  const roles = t.participants.map(pid => { const u = us.find(x => x.id === pid); return u ? u.role : null; });
  return roles.includes('student') && roles.some(r => r === 'teacher' || r === 'admin');
};
const threadAllowedByPreset = (t, config) =>
  !(!(config && config.dmEnabled) && dmIsStudentStaff(t));

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
  const cfg = commsConfig(store, ctx.centreId);
  const msg = Object.values(store.threads)
    .filter(t => threadVisible(t, ctx) && threadAllowedByPreset(t, cfg))
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
  const cfg = commsConfig(store, ctx.centreId);
  const threads = Object.values(store.threads)
    // Preset gates the data (§6): student↔staff 1:1 DMs vanish when 1:1 is off.
    .filter(t => threadVisible(t, ctx) && threadAllowedByPreset(t, cfg))
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
        createdAt: stamp(), publishAt: draft.publishAt || null, expiresAt: draft.expiresAt || null,
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
    // Mark EVERY unread announcement + message the user can see as read, in a
    // single persist. Looping the per-item mutators would clobber each other
    // (they all close over the same `store` snapshot), so this batches them.
    markAllRead() {
      const now = stamp();
      const nextAnn = { ...store.announcements };
      let touched = false;
      announcements.forEach(a => {
        if (a.authorId !== ctx.userId && !a.reads[ctx.userId] && !isExpired(a)) {
          nextAnn[a.id] = { ...a, reads: { ...a.reads, [ctx.userId]: now } };
          touched = true;
        }
      });
      const nextMsg = { ...store.messages };
      Object.values(store.messages).forEach(m => {
        const t = store.threads[m.threadId];
        if (t && threadVisible(t, ctx) && m.senderId !== ctx.userId && !(m.readBy || {})[ctx.userId]) {
          nextMsg[m.id] = { ...m, readBy: { ...(m.readBy || {}), [ctx.userId]: now } };
          touched = true;
        }
      });
      if (touched) persist({ ...store, announcements: nextAnn, messages: nextMsg });
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
    // Find an existing DM between self + other, or create one. Returns threadId
    // (or null when the safety preset forbids it).
    openOrCreateDm(otherId) {
      // Preset gates creation too (§6): no new 1:1 student↔staff DM when 1:1
      // student↔staff messaging is off.
      const other = usersArr().find(u => u.id === otherId);
      const crossesStudentStaff = other && (
        (other.role === 'student' && (ctx.role === 'teacher' || ctx.role === 'admin')) ||
        ((other.role === 'teacher' || other.role === 'admin') && ctx.role === 'student'));
      if (crossesStudentStaff && !cfg.dmEnabled) return null;
      const existing = Object.values(store.threads).find(t =>
        t.type === 'dm' && t.participants.length === 2 &&
        t.participants.includes(ctx.userId) && t.participants.includes(otherId));
      if (existing) return existing.id;
      const id = newId('th');
      // SAFEGUARDING INVARIANT (server-enforced later): a thread with a minor can
      // never be a PRIVATE 1:1. Any new student↔staff thread is stamped as a
      // monitored channel-type (monitored + DSL-readable + attachment-restricted +
      // immutable), so the composer cannot produce an unmonitored teacher↔student DM.
      const t = { id, centreId: ctx.centreId, type: 'dm', participants: [ctx.userId, otherId],
        classId: null, subject: null, createdBy: ctx.userId, createdAt: stamp(), lastMessageAt: stamp(),
        monitored: crossesStudentStaff || undefined, channelType: crossesStudentStaff ? 'monitored' : undefined };
      mutate('threads', m => { m[id] = t; return m; });
      return id;
    },
    // Create a group thread from a set of member ids (self is always included).
    // `classId` is recorded when the group was seeded from a class. Returns threadId.
    createGroup(memberIds, subject, classId) {
      const parts = [...new Set([ctx.userId, ...(memberIds || [])])];
      if (parts.length < 2) return null;
      const id = newId('th');
      const t = { id, centreId: ctx.centreId, type: 'group', participants: parts,
        classId: classId || null, subject: (subject || '').trim() || 'New group',
        createdBy: ctx.userId, createdAt: stamp(), lastMessageAt: stamp() };
      mutate('threads', m => { m[id] = t; return m; });
      return id;
    },

    // ── Safety posture (config) ──
    config: commsConfig(store, ctx.centreId),
    applyPreset(presetId) {
      const cur = commsConfig(store, ctx.centreId);
      const vals = (COMMS_PRESETS[presetId] || {}).values || {};
      persist({ ...store, config: { ...store.config, [ctx.centreId]: { ...cur, preset: presetId, ...vals } } });
    },
    setConfig(patch) {
      const cur = commsConfig(store, ctx.centreId);
      persist({ ...store, config: { ...store.config, [ctx.centreId]: { ...cur, ...patch } } });
    },

    // ── Safeguarding (DSL) ──
    flags: computeFlags(store, ctx),
    concerns: (store.concerns || [])
      .filter(c => ctx.role === 'superadmin' || c.centreId === ctx.centreId)
      .sort((x, y) => (x.at > y.at ? -1 : 1)),
    resolveFlag(messageId, status, note) {
      persist({ ...store, flags: { ...store.flags, [messageId]: { status, note: note || '', by: ctx.userId, at: stamp() } } });
    },
    // Optionally acknowledges the originating flag in the SAME persist — calling two
    // mutators in a row would each spread a stale `store` and clobber each other.
    recordConcern(entry, acknowledgeMessageId) {
      const c = { id: newId('cn'), centreId: ctx.centreId, by: ctx.userId, at: stamp(), ...entry };
      const next = { ...store, concerns: [c, ...(store.concerns || [])] };
      if (acknowledgeMessageId) {
        next.flags = { ...store.flags, [acknowledgeMessageId]: { status: 'acknowledged', note: 'Concern recorded', by: ctx.userId, at: stamp() } };
      }
      persist(next);
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
  year:     { label: 'Year',     icon: 'chart' },
  subject:  { label: 'Subject',  icon: 'zap' },
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
// Scope chip text: class → class name, year/subject → the targeted values.
function scopeChipLabel(a) {
  if (a.scope === 'class' && a.classId) return classLabel(a.classId).split(' · ')[0];
  if (a.scope === 'year')    return (a.audience.years || []).join(' · ') || 'Year';
  if (a.scope === 'subject') return (a.audience.subjects || []).join(' · ') || 'Subject';
  return (SCOPE_META[a.scope] || {}).label;
}

// Full date, e.g. "1 Jul 2026" — used on list cards and in the reading rail.
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// Reading rail (right pane) — the selected notice opened in full: hero banner,
// title, author, date, body, descriptive tags, then stacked actions. Mirrors the
// notice-board "detail" card; marking-read happens on open, so there's no read btn.
const AnnouncementReader = ({ a, comms, onNavigate }) => {
  const { ctx } = comms;
  const isAuthor = a.authorId === ctx.userId;
  const acked = !!a.acks[ctx.userId];
  const p = PRIORITY_META[a.priority] || PRIORITY_META.normal;
  const accent = p.color();
  const expired = isExpired(a);
  const scheduled = isAuthor && isScheduled(a);
  const recipientCount = (a.audience ? commsRecipients(a.scope, a.audience, a.centreId) : []).length;
  const ackCount = Object.keys(a.acks || {}).length;
  const scopeIcon = (SCOPE_META[a.scope] || {}).icon;

  // Descriptive "tags" — scope, priority, and each targeted audience role.
  const tags = [{ label: scopeChipLabel(a), color: DS.accent, bg: DS.accentLight }];
  if (a.priority !== 'normal') tags.push({ label: p.label, color: accent, bg: p.bg() });
  const roles = a.audience && a.audience.roles;
  if (Array.isArray(roles)) roles.forEach(r => tags.push({ label: (ROLE_LABEL[r] || r) + 's', color: DS.sub, bg: DS.surface }));

  return (
    <div style={{ background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 14, overflow: 'hidden', boxShadow: DS.cardShadow }}>
      {/* Hero banner — scope-tinted, stands in for the notice's photo */}
      <div style={{
        height: 118, background: `linear-gradient(135deg, ${accent}26, ${accent}0A)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${DS.border}`,
      }}>
        <div style={{ width: 54, height: 54, borderRadius: 13, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: DS.cardShadow }}>
          <Icon name={scopeIcon || 'megaphone'} size={24} color={accent} />
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {(a.pinned || scheduled || expired) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 11 }}>
            {a.pinned && <Chip icon="pin" color={DS.warning} bg={DS.warningBg}>Pinned</Chip>}
            {scheduled && <Chip icon="clock" color={DS.muted}>Scheduled · {relTime(a.publishAt)}</Chip>}
            {expired && <Chip color={DS.faint}>Expired</Chip>}
          </div>
        )}
        <h2 style={{ fontSize: 19, fontWeight: 700, color: DS.text, margin: '0 0 12px', lineHeight: 1.3 }}>{a.title}</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={a.authorName || '—'} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{a.authorName}</div>
            <div style={{ fontSize: 11.5, color: DS.muted }}>{ROLE_LABEL[a.authorRole] || a.authorRole}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: DS.muted, margin: '12px 0 0' }}>
          <span style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: '3px 10px' }}>{fmtDate(a.createdAt)}</span>
          {(ctx.role === 'superadmin' || isAuthor) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="users" size={12} color={DS.muted} />{recipientCount} recipient{recipientCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div style={{ height: 1, background: DS.border, margin: '16px 0' }} />

        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{a.body}</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Tags</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: a.requiresAck || !isAuthor ? 18 : 4 }}>
          {tags.map((t, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: t.color, background: t.bg, border: `1px solid ${DS.border}`, borderRadius: 20, padding: '4px 11px' }}>{t.label}</span>
          ))}
        </div>

        {a.requiresAck && (
          <div style={{ fontSize: 12.5, color: ackCount ? DS.success : DS.muted, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Icon name="check" size={14} color={ackCount ? DS.success : DS.muted} /> {ackCount} acknowledged
          </div>
        )}

        {/* Actions — stacked, full width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {a.requiresAck && !isAuthor && (
            acked
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: DS.success, padding: '9px', borderRadius: 8, background: DS.successBg }}>
                  <Icon name="check" size={15} color={DS.success} /> Acknowledged
                </div>
              : <Btn variant="primary" icon="check" onClick={() => comms.acknowledge(a.id)} style={{ width: '100%', justifyContent: 'center' }}>Acknowledge</Btn>
          )}
          {/* §8: only offer "Message <sender>" when the student is actually permitted
              to contact that sender (canMessage) — never open an unmonitored channel. */}
          {!isAuthor && a.authorId && ctx.role !== 'superadmin'
            && (ctx.role !== 'student' || canMessage(ctx.user, userById(a.authorId))) && (
            <Btn variant="secondary" icon="mail" onClick={() => onNavigate && onNavigate(ctx.role, 'comms:messages')} style={{ width: '100%', justifyContent: 'center' }}>
              Message {(a.authorName || '').split(' ')[0]}
            </Btn>
          )}
          {(isAuthor || ctx.role === 'superadmin' || ctx.role === 'admin') && (
            <Btn variant="ghost" icon="pin" onClick={() => comms.togglePin(a.id)}
              style={{ width: '100%', justifyContent: 'center', color: a.pinned ? DS.accent : DS.muted }}>
              {a.pinned ? 'Unpin' : 'Pin to top'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
};

// Rich list card (left pane) — thumbnail tile, title + date, author line, a
// two-line body preview, and status badges. The selected card is highlighted.
const AnnouncementRow = ({ a, comms, active, onClick }) => {
  const { ctx } = comms;
  const isAuthor = a.authorId === ctx.userId;
  const unread = !isAuthor && !a.reads[ctx.userId];
  const acked = !!a.acks[ctx.userId];
  const p = PRIORITY_META[a.priority] || PRIORITY_META.normal;
  const accent = p.color();
  const expired = isExpired(a);
  const scheduled = isAuthor && isScheduled(a);
  const actionNeeded = a.requiresAck && !isAuthor && !acked && !expired;
  const scopeIcon = (SCOPE_META[a.scope] || {}).icon;

  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', gap: 14, textAlign: 'left', width: '100%',
      background: active ? DS.accentLight : DS.bg,
      border: `1px solid ${active ? DS.accentBorder : DS.border}`,
      borderRadius: 12, padding: '15px 17px', cursor: 'pointer', opacity: expired ? 0.6 : 1,
      transition: 'background 0.12s, border-color 0.12s',
    }}>
      {/* Thumbnail tile — scope-tinted icon standing in for the notice image */}
      <div style={{
        width: 54, height: 54, borderRadius: 11, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.bg(),
      }}>
        <Icon name={scopeIcon || 'megaphone'} size={22} color={accent} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 3 }}>
          {unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: unread ? 700 : 600, color: DS.text, lineHeight: 1.3 }}>{a.title}</span>
          <span style={{
            flexShrink: 0, fontSize: 11, fontWeight: 500, color: DS.muted, background: DS.surface,
            border: `1px solid ${DS.border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
          }}>{fmtDate(a.createdAt)}</span>
        </div>
        <div style={{ fontSize: 12.5, color: DS.muted, marginBottom: 7 }}>
          By {a.authorName} · {ROLE_LABEL[a.authorRole] || a.authorRole}
        </div>
        <div style={{
          fontSize: 13, color: DS.sub, lineHeight: 1.5, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{a.body}</div>
        {(a.pinned || actionNeeded || scheduled || (a.priority !== 'normal' && !expired) || expired) && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            {a.pinned && <Chip icon="pin" color={DS.warning} bg={DS.warningBg}>Pinned</Chip>}
            {actionNeeded && <Chip icon="alert" color={DS.accent} bg={DS.accentLight}>Action needed</Chip>}
            {scheduled && <Chip icon="clock" color={DS.muted}>Scheduled</Chip>}
            {a.priority !== 'normal' && !expired && <Chip color={accent} bg={p.bg()}>{p.label}</Chip>}
            {expired && <Chip color={DS.faint}>Expired</Chip>}
          </div>
        )}
      </div>
    </button>
  );
};

// Two-pane inbox — a scrollable list of notices on the left, the selected notice
// open in a reading pane on the right (mail-client layout). This is the default
// Announcements view for every role; authors get a "Compose" button in the toolbar.
const AnnouncementsInbox = ({ comms, onNavigate, author, onCompose }) => {
  const { ctx } = comms;
  const [scope, setScope] = React.useState('all');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);

  let list = comms.announcements;
  if (scope !== 'all') list = list.filter(a => a.scope === scope);
  if (roleFilter !== 'all') list = list.filter(a => a.audience.roles === 'all' || (a.audience.roles || []).includes(roleFilter));
  if (unreadOnly) list = list.filter(a => a.authorId !== ctx.userId && !a.reads[ctx.userId]);
  if (q.trim()) {
    const t = q.toLowerCase();
    list = list.filter(a => (a.title + ' ' + a.body + ' ' + (a.authorName || '')).toLowerCase().includes(t));
  }

  // Keep a valid selection: fall back to the first item whenever the current one
  // drops out of the filtered list (or nothing is selected yet).
  const selected = list.find(a => a.id === selectedId) || list[0] || null;

  const open = (a) => {
    setSelectedId(a.id);
    if (a.authorId !== ctx.userId && !a.reads[ctx.userId]) comms.markRead(a.id);
  };

  const unreadTotal = comms.unread.announcements;
  const filtered = q || scope !== 'all' || roleFilter !== 'all' || unreadOnly;

  return (
    <div>
      {/* Toolbar — search, filters, and the Compose entry point */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search notices…" style={{ maxWidth: 280 }} />
        <Select value={scope} onChange={e => setScope(e.target.value)} style={{ width: 150 }}>
          <option value="all">All scopes</option>
          {(ctx.role === 'superadmin' ? ['platform','centre','class','year','subject'] : ['centre','class','year','subject']).map(s =>
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
        {author && (
          <Btn variant="primary" icon="plus" onClick={onCompose} style={{ marginLeft: 'auto' }}>Compose</Btn>
        )}
      </div>

      {/* List (left, main) grows with the page; reading rail (right) stays sticky */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          {list.length === 0 ? (
            <EmptyState icon="message" title="No notices"
              message={filtered ? 'No notices match your filters.' : 'There are no announcements yet.'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {list.map(a => (
                <AnnouncementRow key={a.id} a={a} comms={comms} active={selected && selected.id === a.id} onClick={() => open(a)} />
              ))}
            </div>
          )}
        </div>

        <div style={{
          flex: '0 0 400px', minWidth: 340, position: 'sticky', top: 12,
          maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', paddingRight: 4,
        }}>
          {selected
            ? <AnnouncementReader a={selected} comms={comms} onNavigate={onNavigate} />
            : (
              <div style={{
                minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px dashed ${DS.border}`, borderRadius: 12, color: DS.faint,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Icon name="mail" size={28} color={DS.faint} />
                  <div style={{ fontSize: 13.5, marginTop: 8 }}>Select a notice to read it</div>
                </div>
              </div>
            )}
        </div>
      </div>
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

// "Who receives this" cards → each maps to a stored announcement scope. "By role"
// and "Whole centre" both store scope 'centre'; the difference is the roles facet.
const AUDIENCE_CARDS = [
  { mode: 'platform', scope: 'platform', icon: 'zap',   title: 'All centres',      desc: 'A platform-wide notice' },
  { mode: 'centre',   scope: 'centre',   icon: 'users', title: 'Whole centre',     desc: 'Everyone — students, teachers & admins' },
  { mode: 'role',     scope: 'centre',   icon: 'user',  title: 'By role',          desc: 'Students · Teachers · Admins' },
  { mode: 'class',    scope: 'class',    icon: 'book',  title: 'By class / group', desc: 'A specific teaching group' },
  { mode: 'year',     scope: 'year',     icon: 'chart', title: 'By year group',    desc: 'Year 9 – Year 13' },
  { mode: 'subject',  scope: 'subject',  icon: 'zap',   title: 'By subject',       desc: 'Mathematics · Physics · Chemistry…' },
];
const EXPIRY_OPTS = [['never', "Don't expire"], ['3d', '3 days'], ['1w', '1 week'], ['2w', '2 weeks'], ['1m', '1 month']];
const EXPIRY_DAYS = { '3d': 3, '1w': 7, '2w': 14, '1m': 30 };

const AudienceCard = ({ card, active, onClick }) => (
  <button type="button" onClick={onClick} style={{
    display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', width: '100%',
    padding: '13px 15px', borderRadius: 10, cursor: 'pointer',
    border: `1.5px solid ${active ? DS.accent : DS.border}`, background: active ? DS.accentLight : DS.bg,
  }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? DS.accent : DS.surface, color: active ? '#fff' : DS.muted }}>
      <Icon name={card.icon} size={15} color={active ? '#fff' : DS.muted} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? DS.accent : DS.text }}>{card.title}</div>
      <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 2, lineHeight: 1.35 }}>{card.desc}</div>
    </div>
  </button>
);

const RailCard = ({ children, accent }) => (
  <div style={{
    padding: '16px 18px', borderRadius: 12, marginBottom: 14,
    border: `1px solid ${accent ? DS.accentBorder : DS.cardBorder}`, background: accent ? DS.accentLight : DS.bg,
  }}>{children}</div>
);

const AnnouncementCompose = ({ comms, onPublished }) => {
  const { ctx } = comms;
  const user = ctx.user;
  // Owner console targets at the PLATFORM level only — All centres / specific
  // centres / by role across the platform. By class / year group / subject are
  // centre-admin concerns and must never leak into the owner's audience picker.
  const cards = user.role === 'superadmin'
    ? AUDIENCE_CARDS.filter(c => c.mode === 'platform' || c.mode === 'role')
    : AUDIENCE_CARDS.filter(c => c.mode === 'platform' ? false : canAnnounce(user, c.scope));

  const [mode, setMode] = React.useState((cards[0] || {}).mode || 'centre');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [roles, setRoles] = React.useState(['student', 'teacher', 'admin']);
  const [classIds, setClassIds] = React.useState([]);
  const [years, setYears] = React.useState([]);
  const [subjects, setSubjects] = React.useState([]);
  const [centreIds, setCentreIds] = React.useState('all');
  const [when, setWhen] = React.useState('now');
  const [publishAt, setPublishAt] = React.useState('');
  const [expiresAfter, setExpiresAfter] = React.useState('2w');
  const [priority, setPriority] = React.useState('normal');
  const [requiresAck, setRequiresAck] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);

  const card = cards.find(c => c.mode === mode) || cards[0];
  // For the owner, "By role" is platform-wide (there's no owning centre), so a
  // centre-scoped card resolves to a platform scope across all centres.
  const scope = (user.role === 'superadmin' && card.scope === 'centre') ? 'platform' : card.scope;

  const myClasses = React.useMemo(() => {
    const all = seedClasses();
    return user.role === 'teacher' ? all.filter(c => (user.classIds || []).includes(c.id)) : all;
  }, [user]);
  const yearOpts = React.useMemo(() => allYears(), []);
  const subjectOpts = React.useMemo(() => allSubjects(), []);

  const toggle = (setter) => (v) => setter(xs => xs.includes(v) ? xs.filter(x => x !== v) : [...xs, v]);
  const toggleCentre = (id) => setCentreIds(cs => {
    if (cs === 'all') return [id];
    const next = cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id];
    return next.length === centresArr().length ? 'all' : next;
  });

  const audience = (() => {
    const r = mode === 'role' ? (roles.length ? roles : 'all') : 'all';
    if (scope === 'platform') return { centreIds, roles: r, classIds: [] };
    if (scope === 'class')    return { centreIds: [ctx.centreId], roles: 'all', classIds };
    if (scope === 'year')     return { centreIds: [ctx.centreId], roles: r, years };
    if (scope === 'subject')  return { centreIds: [ctx.centreId], roles: r, subjects };
    return { centreIds: [ctx.centreId], roles: r, classIds: [] };
  })();
  const reach = commsRecipients(scope, audience, ctx.centreId).length;

  const selectionOk = mode === 'class' ? classIds.length : mode === 'year' ? years.length
    : mode === 'subject' ? subjects.length : mode === 'role' ? roles.length
    : mode === 'platform' ? (centreIds === 'all' || centreIds.length) : true;
  const scheduleOk = when === 'now' || (when === 'schedule' && publishAt);
  const valid = title.trim() && body.trim() && selectionOk && scheduleOk;

  const computeExpiry = () => {
    if (expiresAfter === 'never') return null;
    return new Date(cmNow().getTime() + EXPIRY_DAYS[expiresAfter] * 86400000).toISOString().slice(0, 10);
  };

  const publish = () => {
    if (!valid) return;
    comms.postAnnouncement({
      scope, centreId: scope === 'platform' ? null : ctx.centreId,
      classId: scope === 'class' ? classIds[0] : null, audience, title: title.trim(), body: body.trim(),
      priority, pinned, requiresAck,
      publishAt: when === 'schedule' && publishAt ? new Date(publishAt).toISOString() : null,
      expiresAt: computeExpiry(),
    });
    onPublished && onPublished();
  };

  const Section = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: DS.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* Left — content + audience */}
      <div style={{ flex: '1 1 520px', minWidth: 300, background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, padding: '22px 24px' }}>
        <Field label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Spring mock exams — timetable now live" />
        </Field>
        <Field label="Message" required>
          <Textarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 130 }}
            placeholder="Write your announcement. This is one-way — recipients can't reply in-thread, but they can raise a monitored request through their centre if they need to respond." />
        </Field>

        <Section label="Who receives this">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {cards.map(c => <AudienceCard key={c.mode} card={c} active={mode === c.mode} onClick={() => setMode(c.mode)} />)}
          </div>

          {/* Mode-specific pickers */}
          {mode === 'role' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {['student', 'teacher', 'admin'].map(r => (
                <TogglePill key={r} active={roles.includes(r)} onClick={() => toggle(setRoles)(r)}>{ROLE_LABEL[r]}s</TogglePill>
              ))}
            </div>
          )}
          {mode === 'platform' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <TogglePill active={centreIds === 'all'} onClick={() => setCentreIds('all')}>All centres</TogglePill>
              {centresArr().map(c => (
                <TogglePill key={c.id} active={centreIds !== 'all' && centreIds.includes(c.id)} onClick={() => toggleCentre(c.id)}>{c.name}</TogglePill>
              ))}
            </div>
          )}
          {mode === 'class' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, maxHeight: 150, overflow: 'auto' }}>
              {myClasses.length === 0 ? <div style={{ fontSize: 13, color: DS.faint }}>No classes available.</div>
                : myClasses.map(c => (
                  <TogglePill key={c.id} active={classIds.includes(c.id)} onClick={() => toggle(setClassIds)(c.id)}>{c.name} · {c.group}</TogglePill>
                ))}
            </div>
          )}
          {mode === 'year' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {yearOpts.map(y => <TogglePill key={y} active={years.includes(y)} onClick={() => toggle(setYears)(y)}>{y}</TogglePill>)}
            </div>
          )}
          {mode === 'subject' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {subjectOpts.map(s => <TogglePill key={s} active={subjects.includes(s)} onClick={() => toggle(setSubjects)(s)}>{s}</TogglePill>)}
            </div>
          )}
        </Section>
      </div>

      {/* Right rail — preview + delivery */}
      <div style={{ width: 290, flexShrink: 0 }}>
        <RailCard accent>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: DS.accent, textTransform: 'uppercase', letterSpacing: 0.4 }}>Audience preview</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: DS.accent, lineHeight: 1 }}>{reach}</span>
            <span style={{ fontSize: 13, color: DS.accent }}>{reach === 1 ? 'person will' : 'people will'} receive this</span>
          </div>
        </RailCard>

        <RailCard>
          <Section label="When to send">
            <Segmented fullWidth value={when} onChange={setWhen}
              options={[{ id: 'now', label: 'Publish now' }, { id: 'schedule', label: 'Schedule' }]} />
            {when === 'schedule' && (
              <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} style={{ marginTop: 10 }} />
            )}
          </Section>
          <Field label="Expires after">
            <Select value={expiresAfter} onChange={e => setExpiresAfter(e.target.value)}>
              {EXPIRY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: DS.text, fontWeight: 500 }}>Acknowledgement required</span>
              <TogglePill active={requiresAck} onClick={() => setRequiresAck(v => !v)}>{requiresAck ? 'On' : 'Off'}</TogglePill>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: DS.text, fontWeight: 500 }}>Pin to top / priority</span>
              <TogglePill active={pinned} onClick={() => setPinned(v => !v)}>{pinned ? 'On' : 'Off'}</TogglePill>
            </label>
          </div>
        </RailCard>

        <Btn variant="primary" icon="megaphone" onClick={publish}
          style={{ width: '100%', justifyContent: 'center', opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none' }}>
          {when === 'schedule' ? `Schedule for ${reach}` : `Publish to ${reach} ${reach === 1 ? 'person' : 'people'}`}
        </Btn>
      </div>
    </div>
  );
};

// The Announcements page body — a two-pane inbox by default, with Compose opening
// as a separate full-width view (entered from the toolbar button, dismissed with
// a Back link). Non-authors only ever see the inbox.
const AnnouncementsSection = ({ comms, onNavigate }) => {
  const author = canCompose(comms.ctx.user);
  const [composing, setComposing] = React.useState(false);

  if (author && composing) {
    return (
      <div>
        <button type="button" onClick={() => setComposing(false)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '6px 10px',
          borderRadius: 8, border: `1px solid ${DS.border}`, background: DS.bg, color: DS.sub,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <Icon name="chevron_l" size={14} color={DS.muted} /> Back to inbox
        </button>
        <AnnouncementCompose comms={comms} onPublished={() => setComposing(false)} />
      </div>
    );
  }

  return (
    <AnnouncementsInbox comms={comms} onNavigate={onNavigate} author={author} onCompose={() => setComposing(true)} />
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

// Stable mock presence so the layout can show green "online" dots like a real chat app.
const isOnline = (id) => {
  if (!id) return false;
  let s = 0; for (let i = 0; i < id.length; i++) s += id.charCodeAt(i);
  return s % 3 !== 0;
};
const msgTime  = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const dayKey   = (iso) => new Date(iso).toISOString().slice(0, 10);
const dayDivider = (iso) => {
  const d = new Date(iso);
  const long = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return dayKey(iso) === COMMS_TODAY ? 'Today, ' + long : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Round avatar with an optional presence dot / group glyph (list + chat header).
const ChatAvatar = ({ name, size = 42, online, group }) => (
  <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
    {group
      ? <div style={{ width: size, height: size, borderRadius: '50%', background: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="users" size={Math.round(size * 0.46)} color="#fff" /></div>
      : <Avatar name={name} size={size} />}
    {online && <span style={{ position: 'absolute', right: 0, bottom: 1, width: Math.round(size * 0.26), height: Math.round(size * 0.26), borderRadius: '50%', background: DS.success, border: '2px solid #fff' }} />}
  </div>
);

// Small circular icon button for the chat header actions (video / call / more).
const RoundIconBtn = ({ icon, title, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${DS.border}`, background: hov ? DS.surface : DS.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={icon} size={17} color={DS.muted} />
    </button>
  );
};

// Overlapping participant avatars + remaining count, shown for group/channel threads.
const AvatarStack = ({ participants, ctx, max = 3 }) => {
  const others = participants.filter(p => p !== ctx.userId).map(p => userById(p)).filter(Boolean);
  const shown = others.slice(0, max);
  const extra = others.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
      {shown.map((u, i) => (
        <div key={u.id} style={{ marginLeft: i ? -10 : 0, borderRadius: '50%', border: '2px solid #fff' }}><Avatar name={u.name} size={28} /></div>
      ))}
      {extra > 0 && (
        <div style={{ marginLeft: -10, width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: DS.text, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{extra}</div>
      )}
    </div>
  );
};

// Section label in the thread list ("Pinned Message", "All Message").
const ThreadSection = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px 6px' }}>
    <Icon name={icon} size={12} color={DS.faint} />
    <span style={{ fontSize: 11.5, fontWeight: 600, color: DS.faint }}>{children}</span>
  </div>
);

// Per-user pinned-thread set, persisted locally (layout only — no tenant data change).
const PIN_KEY = 'tutoros.comms.pins.v1';
const loadPins = (userId) => { try { return (JSON.parse(localStorage.getItem(PIN_KEY)) || {})[userId] || []; } catch (e) { return []; } };
const savePins = (userId, ids) => {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PIN_KEY)) || {}; } catch (e) { all = {}; }
  all[userId] = ids; localStorage.setItem(PIN_KEY, JSON.stringify(all));
};

const ThreadListItem = ({ t, comms, active, onClick, pinned, onTogglePin }) => {
  const { ctx } = comms;
  const [hov, setHov] = React.useState(false);
  const title = threadTitle(t, ctx);
  const unread = comms.threadUnread(t);
  const msgs = comms.messagesFor(t.id);
  const last = msgs[msgs.length - 1];
  const isGroup = t.type !== 'dm';
  const other = !isGroup ? threadOther(t, ctx) : null;
  const monitored = isMonitoredThread(t);
  const online = !isGroup && !!other && isOnline(other.id);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'flex', gap: 12, alignItems: 'center', width: 'calc(100% - 16px)', textAlign: 'left',
      padding: '11px 12px', margin: '2px 8px', borderRadius: 12, cursor: 'pointer',
      background: active ? DS.accentLight : hov ? DS.surface : 'transparent',
    }}>
      <ChatAvatar name={(other || {}).name || title} size={42} group={isGroup} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{title}</span>
          <span style={{ fontSize: 11, color: DS.faint, flexShrink: 0 }}>{last ? relTime(last.createdAt) : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {monitored && <Icon name="eye" size={11} color={DS.faint} />}
          <span style={{ fontSize: 12.5, color: unread ? DS.sub : DS.muted, fontWeight: unread ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {last ? (last.senderId === ctx.userId ? 'You: ' : isGroup ? (last.senderName || '').split(' ')[0] + ': ' : '') + last.body : 'No messages yet'}
          </span>
          {unread > 0
            ? <span style={{ flexShrink: 0, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: DS.danger, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
            : (hov || pinned) && (
                <button onClick={e => { e.stopPropagation(); onTogglePin(t.id); }} title={pinned ? 'Unpin' : 'Pin'}
                  style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  <Icon name="pin" size={14} color={pinned ? DS.accent : DS.faint} />
                </button>
              )}
        </div>
      </div>
    </div>
  );
};

// `first` = first message of a sender's run (show avatar + name/time header);
// `last`  = last of the run (adds spacing + "Seen" receipt).
const Bubble = ({ m, mine, first, last, participants, ctx }) => {
  const seenByOthers = mine && (participants || []).some(p => p !== ctx.userId && (m.readBy || {})[p]);
  if (mine) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: last ? 14 : 4 }}>
        <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {first && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: DS.faint }}>{msgTime(m.createdAt)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>You</span>
            </div>
          )}
          <div style={{ padding: '10px 14px', borderRadius: 14, borderTopRightRadius: first ? 4 : 14, background: DS.accent, color: '#fff', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
          {last && seenByOthers && <div style={{ fontSize: 10.5, color: DS.faint, marginTop: 4 }}>Seen</div>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: last ? 14 : 4 }}>
      <div style={{ width: 36, flexShrink: 0 }}>{first && <Avatar name={m.senderName} size={36} />}</div>
      <div style={{ maxWidth: '72%' }}>
        {first && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{m.senderName}</span>
            <span style={{ fontSize: 11, color: DS.faint }}>{msgTime(m.createdAt)}</span>
          </div>
        )}
        <div style={{ display: 'inline-block', padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: first ? 4 : 14, background: DS.surface, color: DS.text, border: `1px solid ${DS.border}`, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
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

  const config = comms.config;
  const monitored = isMonitoredThread(t);
  const isStudent = ctx.role === 'student';
  // Quiet hours + 1:1-off only constrain a STUDENT in a monitored conversation.
  const dmBlocked = monitored && isStudent && t.type === 'dm' && !config.dmEnabled;
  const quiet = monitored && isStudent && quietHoursActive(config, new Date());
  const lockReason = dmBlocked
    ? '1:1 messaging with staff is turned off at your centre — please use your class channel.'
    : quiet ? `Quiet hours — messaging is paused until ${config.quietTo}.` : null;

  // Mark read on open / when new messages arrive.
  React.useEffect(() => { comms.markThreadRead(t.id); }, [t.id, msgs.length]);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [t.id, msgs.length]);

  const send = () => { if (draft.trim()) { comms.sendMessage(t.id, draft); setDraft(''); } };
  const subtitle = t.type === 'channel'
    ? `${t.participants.length} members`
    : isGroup
      ? t.participants.map(p => (userById(p) || {}).name).filter(Boolean).join(', ')
      : (other ? ROLE_LABEL[other.role] : '');
  const iconBtn = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 5, display: 'flex', borderRadius: 8 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: `1px solid ${DS.border}`, flexShrink: 0 }}>
        <ChatAvatar name={(other || {}).name || title} size={44} group={isGroup} online={!isGroup && !!other && isOnline(other.id)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: DS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        </div>
        {isGroup && <AvatarStack participants={t.participants} ctx={ctx} />}
        {/* §8: no video/voice call affordances — calls are ephemeral and
            unrecordable, which breaks the immutable-record safeguarding invariant
            for any thread that can include a minor. */}
        <RoundIconBtn icon="dots" title="More" />
      </div>

      {/* Monitored banner */}
      {monitored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 20px', background: DS.surface, borderBottom: `1px solid ${DS.border}`, fontSize: 11.5, color: DS.muted, flexShrink: 0 }}>
          <Icon name="eye" size={13} color={DS.muted} />
          Monitored conversation{config.dslObserver ? ' · visible to your Designated Safeguarding Lead' : ''}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '18px 22px 8px', background: DS.bg }}>
        {msgs.length === 0
          ? <EmptyState icon="message" title="No messages yet" message="Say hello to start the conversation." />
          : msgs.map((m, i) => {
              const mine = m.senderId === ctx.userId;
              const prev = msgs[i - 1];
              const next = msgs[i + 1];
              const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
              const first = newDay || prev.senderId !== m.senderId;
              const last = !next || next.senderId !== m.senderId || dayKey(next.createdAt) !== dayKey(m.createdAt);
              return (
                <React.Fragment key={m.id}>
                  {newDay && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: i ? '12px 0 16px' : '0 0 16px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: DS.muted, background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 20, padding: '5px 14px', boxShadow: DS.cardShadow }}>{dayDivider(m.createdAt)}</span>
                    </div>
                  )}
                  <Bubble m={m} mine={mine} first={first} last={last} participants={t.participants} ctx={ctx} />
                </React.Fragment>
              );
            })}
      </div>

      {/* Composer (locked for students during quiet hours / when 1:1 is off) */}
      {lockReason ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', borderTop: `1px solid ${DS.border}`, background: DS.surface, flexShrink: 0 }}>
          <Icon name={dmBlocked ? 'lock' : 'clock'} size={15} color={DS.muted} />
          <span style={{ fontSize: 12.5, color: DS.muted }}>{lockReason}</span>
        </div>
      ) : (
        <div style={{ padding: '12px 18px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: '6px 8px 6px 16px' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a message"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: DS.text }} />
            {/* SAFEGUARDING (D10): threads with a minor are text-only — location
                sharing and voice notes are removed and image attach is disabled. */}
            {threadHasMinor(t) ? (
              <span title="Text only — attachments are restricted in safeguarding-monitored conversations."
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', fontSize: 11, color: DS.faint, whiteSpace: 'nowrap' }}>
                <Icon name="lock" size={13} color={DS.faint} /> Text only
              </span>
            ) : (
              <>
                <button style={iconBtn} title="Attach image"><Icon name="image" size={18} color={DS.faint} /></button>
                <button style={iconBtn} title="Share location"><Icon name="pin" size={18} color={DS.faint} /></button>
                <button style={iconBtn} title="Voice note"><Icon name="mic" size={18} color={DS.faint} /></button>
              </>
            )}
            <button onClick={send} title="Send" style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: DS.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: draft.trim() ? 1 : 0.55 }}>
              <Icon name="send" size={18} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Shared row style for the picker lists in the new-conversation modal.
const PICK_ROW = { display: 'flex', alignItems: 'center', gap: 11, padding: '9px 8px', border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' };

// Round check indicator for multi-select rows.
const CheckDot = ({ on }) => (
  <span style={{
    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
    border: `1.5px solid ${on ? DS.accent : DS.borderDark}`, background: on ? DS.accent : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>{on && <Icon name="check" size={12} color="#fff" />}</span>
);

const PersonRow = ({ u, ctx, trailing, onClick }) => (
  <button type="button" onClick={onClick} style={PICK_ROW}>
    <Avatar name={u.name} size={34} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
      <div style={{ fontSize: 12, color: DS.muted }}>{ROLE_LABEL[u.role]}{ctx.role === 'superadmin' ? ` · ${centreName(u.centreId)}` : ''}</div>
    </div>
    {trailing}
  </button>
);

// Bulk row for adding everyone in a class / subject at once.
const BulkRow = ({ icon, title, count, on, onClick }) => (
  <button type="button" onClick={onClick} style={PICK_ROW}>
    <div style={{ width: 34, height: 34, borderRadius: 9, background: DS.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={icon} size={17} color={DS.accent} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <div style={{ fontSize: 12, color: DS.muted }}>{count} member{count === 1 ? '' : 's'}</div>
    </div>
    <CheckDot on={on} />
  </button>
);

const NewMessageModal = ({ open, onClose, comms, onOpenThread }) => {
  const { ctx } = comms;
  const [mode, setMode]   = React.useState('direct');   // direct | group
  const [source, setSource] = React.useState('people'); // class | subject | people
  const [q, setQ]         = React.useState('');
  const [members, setMembers] = React.useState([]);     // selected user ids (group)
  const [name, setName]   = React.useState('');
  const [touchedName, setTouchedName] = React.useState(false);
  React.useEffect(() => {
    if (open) { setMode('direct'); setSource('people'); setQ(''); setMembers([]); setName(''); setTouchedName(false); }
  }, [open]);

  // When 1:1 is off, a student can't open private staff DMs — class channels only.
  const dmOff = ctx.role === 'student' && !comms.config.dmEnabled;
  let candidates = commsDmCandidates(ctx.user);
  if (dmOff) candidates = candidates.filter(u => !isStaff(u));
  const matches = (u) => u.name.toLowerCase().includes(q.toLowerCase());
  const visiblePeople = candidates.filter(matches);

  // Classes / subjects, scoped to people the current user may actually message.
  const groupClasses  = seedClasses().filter(c => candidates.some(u => (u.classIds || []).includes(c.id)));
  const groupSubjects = [...new Set(candidates.flatMap(userSubjects))].sort();
  const classMemberIds   = (cid) => candidates.filter(u => (u.classIds || []).includes(cid)).map(u => u.id);
  const subjectMemberIds = (s)   => candidates.filter(u => userSubjects(u).includes(s)).map(u => u.id);

  const startDm = (u) => { const id = comms.openOrCreateDm(u.id); onClose(); onOpenThread(id); };
  const toggleMember = (id) => setMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  // Add/remove a whole class/subject; auto-suggest the group name from its label.
  const toggleBulk = (ids, label) => {
    const allIn = ids.length > 0 && ids.every(id => members.includes(id));
    setMembers(prev => allIn ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
    if (!allIn && !touchedName && label) setName(label);
  };
  const canCreate = members.length >= 2 && !!name.trim();
  const create = () => {
    if (!canCreate) return;
    const cid = source === 'class'
      ? (groupClasses.find(c => { const ids = classMemberIds(c.id); return ids.length && ids.every(id => members.includes(id)); }) || {}).id
      : null;
    const id = comms.createGroup(members, name, cid);
    if (id) { onClose(); onOpenThread(id); }
  };

  // §8: a student can only start a monitored 1:1 with staff (canMessage already
  // forbids student↔student). Group chats are teacher/admin-created only, so the
  // Group tab is hidden for students — they can never author a group.
  const modeTabs = ctx.role === 'student'
    ? [{ id: 'direct', label: 'Direct' }]
    : [{ id: 'direct', label: 'Direct' }, { id: 'group', label: 'Group' }];
  const srcTabs  = [{ id: 'class', label: 'Class' }, { id: 'subject', label: 'Subject' }, { id: 'people', label: 'People' }];

  return (
    <Modal open={open} onClose={onClose}
      title={mode === 'group' ? 'New group chat' : 'New message'}
      subtitle={mode === 'group' ? 'Add a class, a subject, or pick people' : 'Start a conversation'}
      icon={mode === 'group' ? 'users' : 'mail'} width={500}
      footer={mode === 'group' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
          <span style={{ fontSize: 12.5, color: DS.muted }}>{members.length} member{members.length === 1 ? '' : 's'} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="check" onClick={create}
              style={{ opacity: canCreate ? 1 : 0.5, pointerEvents: canCreate ? 'auto' : 'none' }}>Create group</Btn>
          </div>
        </div>
      ) : null}>

      <div style={{ marginBottom: 14 }}>
        <Segmented options={modeTabs} value={mode} onChange={setMode} fullWidth />
      </div>

      {mode === 'direct' ? (
        <>
          <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" style={{ marginBottom: 12 }} />
          {visiblePeople.length === 0
            ? <EmptyState icon={dmOff ? 'lock' : 'users'} title={dmOff ? 'Private messaging is off' : 'No one to message'}
                message={dmOff ? 'Your centre has 1:1 staff messaging turned off. Use your class channels to reach your teachers.' : "There's no one in your centre you can start a new conversation with."} />
            : <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360, overflow: 'auto' }}>
                {visiblePeople.map(u => (
                  <PersonRow key={u.id} u={u} ctx={ctx} onClick={() => startDm(u)} trailing={<Icon name="chevron_r" size={15} color={DS.faint} />} />
                ))}
              </div>}
        </>
      ) : (
        <>
          <Input value={name} onChange={e => { setName(e.target.value); setTouchedName(true); }} placeholder="Group name" />
          <div style={{ margin: '12px 0' }}>
            <Segmented options={srcTabs} value={source} onChange={setSource} fullWidth />
          </div>
          {source === 'people' && <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" style={{ marginBottom: 10 }} />}

          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflow: 'auto' }}>
            {source === 'class' && (groupClasses.length === 0
              ? <EmptyState icon="book" title="No classes" message="No class with people you can message." />
              : groupClasses.map(c => {
                  const ids = classMemberIds(c.id);
                  return <BulkRow key={c.id} icon="book" title={`${c.name} · ${c.group}`} count={ids.length}
                    on={ids.length > 0 && ids.every(id => members.includes(id))}
                    onClick={() => toggleBulk(ids, `${classSubject(c)} · ${c.group}`)} />;
                }))}

            {source === 'subject' && (groupSubjects.length === 0
              ? <EmptyState icon="zap" title="No subjects" message="No subject with people you can message." />
              : groupSubjects.map(s => {
                  const ids = subjectMemberIds(s);
                  return <BulkRow key={s} icon="zap" title={s} count={ids.length}
                    on={ids.length > 0 && ids.every(id => members.includes(id))}
                    onClick={() => toggleBulk(ids, s)} />;
                }))}

            {source === 'people' && (visiblePeople.length === 0
              ? <EmptyState icon="users" title="No people" message="No one to add." />
              : visiblePeople.map(u => (
                  <PersonRow key={u.id} u={u} ctx={ctx} onClick={() => toggleMember(u.id)} trailing={<CheckDot on={members.includes(u.id)} />} />
                )))}
          </div>
        </>
      )}
    </Modal>
  );
};

const Inbox = ({ comms, initialThreadId }) => {
  const threads = comms.threads;
  const [activeId, setActiveId] = React.useState(initialThreadId || (threads[0] && threads[0].id) || null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [pins, setPins] = React.useState(() => loadPins(comms.ctx.userId));
  React.useEffect(() => { if (initialThreadId) setActiveId(initialThreadId); }, [initialThreadId]);
  // Keep selection valid as threads change (e.g. a new DM created).
  React.useEffect(() => { if (activeId && !threads.find(t => t.id === activeId)) setActiveId(threads[0] ? threads[0].id : null); }, [threads.length]);

  const togglePin = (id) => setPins(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    savePins(comms.ctx.userId, next);
    return next;
  });

  const active = threads.find(t => t.id === activeId);
  const ql = q.trim().toLowerCase();
  const filtered = ql ? threads.filter(t => threadTitle(t, comms.ctx).toLowerCase().includes(ql)) : threads;
  const pinnedThreads = filtered.filter(t => pins.includes(t.id));
  const otherThreads = filtered.filter(t => !pins.includes(t.id));
  const item = (t) => <ThreadListItem key={t.id} t={t} comms={comms} active={t.id === activeId} onClick={() => setActiveId(t.id)} pinned={pins.includes(t.id)} onTogglePin={togglePin} />;

  return (
    <div style={{ display: 'flex', gap: 10, height: '100%', minHeight: 0 }}>
      {/* Left: thread list (its own card) */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', flexShrink: 0, border: `1px solid ${DS.cardBorder}`, borderRadius: 14, overflow: 'hidden', background: DS.bg, boxShadow: DS.cardShadow }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px' }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: DS.accent }}>Messages</span>
          <button onClick={() => setNewOpen(true)} title="New message"
            style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${DS.border}`, background: DS.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="edit" size={16} color={DS.muted} />
          </button>
        </div>
        <div style={{ padding: '0 14px 6px' }}>
          <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" />
        </div>
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
          {filtered.length === 0
            ? <EmptyState icon="message" title={ql ? 'No matches' : 'No conversations'} message={ql ? 'No conversations match your search.' : 'Start a new message to begin.'} />
            : <React.Fragment>
                {pinnedThreads.length > 0 && <React.Fragment><ThreadSection icon="pin">Pinned Message</ThreadSection>{pinnedThreads.map(item)}</React.Fragment>}
                {otherThreads.length > 0 && <React.Fragment><ThreadSection icon="message">All Message</ThreadSection>{otherThreads.map(item)}</React.Fragment>}
              </React.Fragment>}
        </div>
      </div>
      {/* Right: active thread (its own card) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: `1px solid ${DS.cardBorder}`, borderRadius: 14, overflow: 'hidden', background: DS.bg, boxShadow: DS.cardShadow }}>
        {active
          ? <ThreadView t={active} comms={comms} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EmptyState icon="message" title="Select a conversation" message="Choose a thread on the left, or start a new message." /></div>}
      </div>
      <NewMessageModal open={newOpen} onClose={() => setNewOpen(false)} comms={comms} onOpenThread={setActiveId} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════════
//  SAFEGUARDING / DSL OVERSIGHT (admin only)
// ══════════════════════════════════════════════════════════════════════════════════
const REASON_CHIP = {
  external:     { color: () => DS.warning, bg: () => DS.warningBg, icon: 'send' },
  keyword:      { color: () => DS.warning, bg: () => DS.warningBg, icon: 'filter' },
  image:        { color: () => DS.warning, bg: () => DS.warningBg, icon: 'eye' },
  out_of_hours: { color: () => DS.muted,   bg: () => DS.surface,   icon: 'clock' },
};
function flagStatusLabel(f) {
  const s = f.resolution.status;
  if (s === 'resolved')     return { label: 'Resolved',     color: DS.success, bg: DS.successBg || DS.accentLight };
  if (s === 'acknowledged') return { label: 'Acknowledged', color: DS.success, bg: DS.accentLight };
  if (s === 'escalated')    return { label: 'Escalated',    color: DS.danger,  bg: DS.dangerBg };
  return f.sev === 'high'
    ? { label: 'Needs review', color: DS.warning, bg: DS.warningBg }
    : { label: 'Low concern',  color: DS.muted,   bg: DS.surface };
}
// Recipient/other side of a flagged message (for the "A → B" summary).
function flagCounterparty(thread, msg) {
  if (!thread) return '';
  if (thread.type === 'channel') return thread.subject || 'Class channel';
  const other = (thread.participants || []).find(p => p !== msg.senderId);
  return (userById(other) || {}).name || '';
}

// Read-only thread renderer for the DSL — staff right, student left, flagged msg ringed.
const DslBubble = ({ m, highlight, reason }) => {
  const staff = isStaff(userById(m.senderId));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: staff ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: DS.muted, fontWeight: 600, margin: '0 6px 3px' }}>
        {m.senderName} <span style={{ color: DS.faint, fontWeight: 400 }}>· {ROLE_LABEL[m.senderRole] || m.senderRole}</span>
      </div>
      <div style={{
        maxWidth: '80%', padding: '9px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
        background: staff ? DS.accentLight : DS.surface, color: DS.text,
        border: `1px solid ${highlight ? DS.warning : staff ? DS.accentBorder : DS.border}`,
        boxShadow: highlight ? `0 0 0 3px ${DS.warningBg}` : 'none',
      }}>
        {m.body}
        {(m.attachments || []).map((a, i) => (
          <div key={i} style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: DS.muted, padding: '4px 9px', border: `1px dashed ${DS.border}`, borderRadius: 6 }}>
            <Icon name="eye" size={12} color={DS.muted} />{a.name}
          </div>
        ))}
      </div>
      {highlight && reason && <div style={{ marginTop: 5 }}><Chip icon="flag" color={DS.warning} bg={DS.warningBg}>Trigger: {FLAG_REASONS[reason].label}</Chip></div>}
      <div style={{ fontSize: 10.5, color: DS.faint, margin: '3px 6px 0' }}>{relTime(m.createdAt)}</div>
    </div>
  );
};

const DslThread = ({ thread, comms, highlightId, highlightReason }) => {
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const hl = scrollRef.current.querySelector('[data-hl="1"]');
    if (hl) hl.scrollIntoView({ block: 'center' }); else scrollRef.current.scrollTop = 0;
  }, [thread && thread.id, highlightId]);
  if (!thread) return <EmptyState icon="eye" title="Select a thread" message="Choose a flagged message or a channel to view it in full context." />;
  const msgs = comms.messagesFor(thread.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${DS.border}`, flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>{threadTitle(thread, comms.ctx)}</div>
          <div style={{ fontSize: 11.5, color: DS.muted }}>
            {thread.type === 'channel' ? `${thread.participants.length} members · full thread in context`
              : `${thread.participants.map(p => (userById(p) || {}).name).filter(Boolean).join(' ↔ ')} · full thread in context`}
          </div>
        </div>
        <Chip icon="eye" color={DS.accent} bg={DS.accentLight}>DSL view</Chip>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '16px 18px', background: DS.bg }}>
        {msgs.map(m => (
          <div key={m.id} data-hl={m.id === highlightId ? '1' : '0'}>
            <DslBubble m={m} highlight={m.id === highlightId} reason={m.id === highlightId ? highlightReason : null} />
          </div>
        ))}
      </div>
    </div>
  );
};

const SafeStat = ({ icon, value, label, tone }) => (
  <div style={{ flex: '1 1 180px', background: DS.bg, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (tone && tone.bg) || DS.accentLight, color: (tone && tone.color) || DS.accent }}>
      <Icon name={icon} size={18} color={(tone && tone.color) || DS.accent} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: DS.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 3 }}>{label}</div>
    </div>
  </div>
);

const RecordConcernModal = ({ open, onClose, comms, flag }) => {
  const thread = flag ? comms.store.threads[flag.threadId] : null;
  const about = flag ? userById(flag.msg.senderId) : null;
  const [reason, setReason] = React.useState('');
  const [level, setLevel] = React.useState('low');
  const [note, setNote] = React.useState('');
  React.useEffect(() => { if (open) { setReason(flag ? FLAG_REASONS[flag.primary].label : ''); setLevel('low'); setNote(''); } }, [open, flag]);
  const save = () => {
    comms.recordConcern(
      { aboutUserId: about ? about.id : null, threadId: thread ? thread.id : null, reason: reason.trim() || 'Concern', level, note: note.trim() },
      flag ? flag.messageId : null,
    );
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Record a concern" subtitle={about ? `About ${about.name}` : ''} icon="flag" width={480}
      footer={[
        <Btn key="c" variant="secondary" small onClick={onClose}>Cancel</Btn>,
        <Btn key="s" variant="primary" small icon="check" onClick={save} style={{ opacity: note.trim() ? 1 : 0.5, pointerEvents: note.trim() ? 'auto' : 'none' }}>Log concern</Btn>,
      ]}>
      <Field label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Wellbeing — exam stress" /></Field>
      <Field label="Level">
        <Segmented fullWidth value={level} onChange={setLevel}
          options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} />
      </Field>
      <Field label="Notes" required>
        <Textarea value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 90 }} placeholder="What happened and what action was taken…" />
      </Field>
    </Modal>
  );
};

function exportThread(thread, comms) {
  if (!thread) return;
  const lines = [
    `Thread: ${threadTitle(thread, comms.ctx)}`,
    `Centre: ${centreName(thread.centreId)}`,
    `Exported: ${new Date().toISOString()}`, '',
  ];
  comms.messagesFor(thread.id).forEach(m => {
    lines.push(`[${m.createdAt}] ${m.senderName} (${ROLE_LABEL[m.senderRole] || m.senderRole}): ${m.body}${(m.attachments || []).length ? ' [attachment]' : ''}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `thread-${thread.id}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const FlagListItem = ({ f, comms, active, onClick }) => {
  const thread = comms.store.threads[f.threadId];
  const st = flagStatusLabel(f);
  const rc = REASON_CHIP[f.primary] || REASON_CHIP.keyword;
  const subjMeta = thread && thread.classId ? classSubject(classById(thread.classId)) : null;
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '13px 15px', cursor: 'pointer',
      borderStyle: 'solid', borderWidth: 0, borderBottomWidth: 1, borderBottomColor: DS.border,
      borderLeftWidth: 3, borderLeftColor: active ? rc.color() : 'transparent',
      background: active ? DS.accentLight : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <Chip icon={rc.icon} color={rc.color()} bg={rc.bg()}>{FLAG_REASONS[f.primary].label}</Chip>
        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: DS.faint }}>{relTime(f.msg.createdAt)}</span>
      </div>
      <div style={{ fontSize: 12.5, color: DS.text, fontWeight: 600 }}>
        {f.msg.senderName} <span style={{ color: DS.faint }}>→</span> {flagCounterparty(thread, f.msg)}
        {subjMeta && <span style={{ fontSize: 11, fontWeight: 500, color: DS.accent, background: DS.accentLight, padding: '1px 6px', borderRadius: 5, marginLeft: 6 }}>{subjMeta}</span>}
      </div>
      <div style={{ fontSize: 12, color: DS.muted, marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{f.msg.body}”</div>
    </button>
  );
};

const SafeguardingPage = ({ comms }) => {
  const { ctx } = comms;
  const config = comms.config;
  const flags = comms.flags;
  const monitored = comms.threads.filter(isMonitoredThread);
  const openFlags = flags.filter(f => f.resolution.status === 'open');
  const resolvedCount = flags.filter(f => f.resolution.status !== 'open').length;

  const [tab, setTab] = React.useState('queue');
  const [selFlagId, setSelFlagId] = React.useState(openFlags[0] ? openFlags[0].id : (flags[0] ? flags[0].id : null));
  const [selChanId, setSelChanId] = React.useState(monitored[0] ? monitored[0].id : null);
  const [concernOpen, setConcernOpen] = React.useState(false);

  const selFlag = flags.find(f => f.id === selFlagId) || null;
  const flagThread = selFlag ? comms.store.threads[selFlag.threadId] : null;
  const chanThread = comms.store.threads[selChanId] || null;

  const PANE_H = 'calc(100vh - 360px)';

  const dslLead = userById(config.dslLeadId);
  const dslDeputy = userById(config.dslDeputyId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Chip icon="shield" color={DS.accent} bg={DS.accentLight}>DSL oversight</Chip>
        {dslLead && <span style={{ fontSize: 12.5, color: DS.muted }}>Lead: <b style={{ color: DS.sub }}>{dslLead.name}</b>{dslDeputy ? ` · Deputy: ${dslDeputy.name}` : ''}</span>}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <SafeStat icon="flag"   value={openFlags.length} label="Open flags · awaiting review" tone={{ bg: DS.warningBg, color: DS.warning }} />
        <SafeStat icon="check"  value={resolvedCount}    label="Resolved · acknowledged" tone={{ bg: DS.accentLight, color: DS.success }} />
        <SafeStat icon="eye"    value={monitored.length} label="Monitored threads · staff↔student" />
        <SafeStat icon="book"   value={comms.concerns.length} label="Concerns logged · this term" tone={{ bg: DS.surface, color: DS.muted }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented value={tab} onChange={setTab} options={[
          { id: 'queue',    label: 'Flag queue', count: openFlags.length || undefined },
          { id: 'channels', label: 'Channel browser' },
          { id: 'concerns', label: 'Concerns log' },
        ]} />
      </div>

      {/* Flag queue */}
      {tab === 'queue' && (
        flags.length === 0
          ? <EmptyState icon="check" title="Nothing flagged" message="No messages have triggered a safeguarding flag. You're all clear." />
          : <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: 420, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 340px', minWidth: 300, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden', background: DS.bg, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '11px 15px', borderBottom: `1px solid ${DS.border}`, fontSize: 13, fontWeight: 700, color: DS.text }}>Surfaced messages</div>
                <div style={{ overflow: 'auto', maxHeight: PANE_H }}>
                  {flags.map(f => <FlagListItem key={f.id} f={f} comms={comms} active={f.id === selFlagId} onClick={() => setSelFlagId(f.id)} />)}
                </div>
              </div>
              <div style={{ flex: '1.4 1 420px', minWidth: 320, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden', background: DS.bg, display: 'flex', flexDirection: 'column', maxHeight: PANE_H }}>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <DslThread thread={flagThread} comms={comms} highlightId={selFlag && selFlag.messageId} highlightReason={selFlag && selFlag.primary} />
                </div>
                {selFlag && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 14px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
                    <Btn small variant="secondary" icon="check" onClick={() => comms.resolveFlag(selFlag.messageId, 'acknowledged')}>Acknowledge</Btn>
                    <Btn small variant="secondary" icon="alert" onClick={() => comms.resolveFlag(selFlag.messageId, 'escalated')}>Escalate</Btn>
                    <Btn small variant="secondary" icon="flag" onClick={() => setConcernOpen(true)}>Record concern</Btn>
                    <Btn small variant="ghost" icon="download" onClick={() => exportThread(flagThread, comms)}>Export thread</Btn>
                  </div>
                )}
              </div>
            </div>
      )}

      {/* Channel browser */}
      {tab === 'channels' && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: 420, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden', background: DS.bg }}>
            <div style={{ padding: '11px 15px', borderBottom: `1px solid ${DS.border}`, fontSize: 13, fontWeight: 700, color: DS.text }}>Monitored conversations</div>
            <div style={{ overflow: 'auto', maxHeight: PANE_H }}>
              {monitored.map(t => <ThreadListItem key={t.id} t={t} comms={comms} active={t.id === selChanId} onClick={() => setSelChanId(t.id)} />)}
            </div>
          </div>
          <div style={{ flex: '1.4 1 420px', minWidth: 320, border: `1px solid ${DS.cardBorder}`, borderRadius: 12, overflow: 'hidden', background: DS.bg, maxHeight: PANE_H }}>
            <DslThread thread={chanThread} comms={comms} />
          </div>
        </div>
      )}

      {/* Concerns log */}
      {tab === 'concerns' && (
        comms.concerns.length === 0
          ? <EmptyState icon="book" title="No concerns logged" message="Recorded concerns will appear here for your safeguarding record." />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comms.concerns.map(c => {
                const about = userById(c.aboutUserId);
                const by = userById(c.by);
                return (
                  <div key={c.id} style={{ border: `1px solid ${DS.border}`, borderRadius: 10, padding: '14px 18px', background: DS.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <Chip icon="flag" color={DS.warning} bg={DS.warningBg}>{c.reason}</Chip>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.level === 'high' ? DS.danger : c.level === 'medium' ? DS.warning : DS.muted, textTransform: 'capitalize' }}>{c.level} concern</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: DS.faint }}>{relTime(c.at)}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: DS.text, fontWeight: 600 }}>{about ? about.name : 'Student'}</div>
                    <div style={{ fontSize: 13, color: DS.sub, lineHeight: 1.5, marginTop: 4 }}>{c.note}</div>
                    <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 8 }}>Logged by {by ? by.name : '—'}</div>
                  </div>
                );
              })}
            </div>
      )}

      <RecordConcernModal open={concernOpen} onClose={() => setConcernOpen(false)} comms={comms} flag={selFlag} />
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
const SECTION_META = {
  announcements: { title: 'Announcements', sub: 'Broadcast one-way notices — with optional read & acknowledgement tracking.' },
  messages:      { title: 'Messages',      sub: 'Direct messages and class channels. Staff↔student chats are always monitored.' },
  safeguarding:  { title: 'Safeguarding',  sub: 'Surfaced messages, full thread visibility, and a record of low-level concerns.' },
  support:       { title: 'Support',       sub: 'Support tickets and email activity across all centres.' },
  settings:      { title: 'Comms settings', sub: 'Choose a safety preset, then fine-tune. These apply to every conversation in your centre.' },
};

const CommunicationsPage = ({ role, section, comms }) => {
  const ctx = comms.ctx;
  // `inbox` kept as an alias for older links → Messages.
  let sec = section || 'announcements';
  if (sec === 'inbox') sec = 'messages';
  // Owner console has no Messages surface — fold any stale link back to Announcements.
  if (sec === 'messages' && role === 'superadmin') sec = 'announcements';
  if (sec === 'safeguarding' && role !== 'admin') sec = 'announcements';
  if (sec === 'settings' && role !== 'admin') sec = 'announcements';
  const isSuper = role === 'superadmin';
  const meta = SECTION_META[sec] || SECTION_META.announcements;
  const onNavigate = (r, p) => window.__navigate && window.__navigate(r, p);

  const subtitle = sec === 'announcements' && isSuper
    ? 'Platform-wide notices across all centres'
    : meta.sub;

  // Messages is a full-height chat workspace: no page header, just a small gap
  // around the contacts + conversation cards so they nearly fill the content area.
  if (sec === 'messages') {
    return (
      <div style={{ height: 'calc(100vh - 52px)', padding: 10, boxSizing: 'border-box' }}>
        <Inbox comms={comms} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title={meta.title} subtitle={subtitle} />

      {sec === 'announcements' && <AnnouncementsSection comms={comms} onNavigate={onNavigate} />}
      {sec === 'safeguarding' && <SafeguardingPage comms={comms} />}
      {sec === 'support' && isSuper && <SupportSection />}
      {sec === 'settings' && window.CommsTab && <window.CommsTab comms={comms} />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION BELL (topbar)
// ══════════════════════════════════════════════════════════════════════════════════
// Activity notifications live outside comms (e.g. homework submissions to mark),
// which have no read model of their own. We track "cleared" ones in localStorage,
// keyed by user + a signature that embeds the current count — so when the count
// changes (new submissions land) the notification naturally re-appears.
const NOTIF_DISMISS_KEY = 'tutoros.notifs.dismissed.v1';
const loadDismissed = (userId) => {
  try { return (JSON.parse(localStorage.getItem(NOTIF_DISMISS_KEY)) || {})[userId] || {}; }
  catch (e) { return {}; }
};
const saveDismissed = (userId, map) => {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(NOTIF_DISMISS_KEY)) || {}; } catch (e) { all = {}; }
  all[userId] = map;
  try { localStorage.setItem(NOTIF_DISMISS_KEY, JSON.stringify(all)); } catch (e) {}
};

const activityMatchesCtx = (it, ctx) => {
  if (!it || !ctx || !ctx.user) return false;
  if (it.userIds && !it.userIds.includes(ctx.userId)) return false;
  if (it.roles && !it.roles.includes(ctx.role)) return false;
  if (it.centreIds && !it.centreIds.includes(ctx.user.centreId)) return false;
  return true;
};

const activityToneMeta = (tone) => ({
  success: { bg: DS.successBg, color: DS.success },
  warning: { bg: DS.warningBg, color: DS.warning },
  danger:  { bg: DS.dangerBg,  color: DS.danger },
  info:    { bg: DS.accentLight, color: DS.accent },
}[tone] || { bg: DS.surface, color: DS.muted });

// Cross-module activity feed (homework submissions / marked feedback). Guarded so
// load order can never break the bell. Each item carries a stable `sig` used for
// dismissal, and its own `go` target.
function activityItems(ctx) {
  const out = [];
  const seeded = (typeof COMMS_ACTIVITY_NOTIFICATIONS !== 'undefined' ? COMMS_ACTIVITY_NOTIFICATIONS : [])
    .filter(it => activityMatchesCtx(it, ctx));

  seeded.forEach(it => out.push({
    kind: it.kind || 'activity',
    id: it.id,
    sig: it.sig || `${ctx.userId}:${it.id}`,
    icon: it.icon || 'bell',
    page: it.page || 'dashboard',
    title: it.title,
    sub: it.sub,
    time: it.time || null,
    tone: it.tone || 'info',
  }));

  const badges = (typeof window !== 'undefined' && window.getHomeworkBadges) ? window.getHomeworkBadges() : null;
  if (badges && ctx.role === 'teacher' && badges.teacherToMark > 0) {
    const n = badges.teacherToMark;
    out.push({ kind: 'hw', id: 'hw-mark', sig: 'hw-mark:' + n, icon: 'clip', page: 'homework', tone: 'success',
      title: `${n} submission${n === 1 ? '' : 's'} awaiting marking`, sub: 'Homework · needs your review' });
  }
  if (badges && ctx.role === 'student' && badges.studentUnreadFeedback > 0) {
    const n = badges.studentUnreadFeedback;
    out.push({ kind: 'hw', id: 'hw-feedback', sig: 'hw-feedback:' + n, icon: 'star', page: 'homework', tone: 'success',
      title: `${n} assignment${n === 1 ? '' : 's'} marked`, sub: 'Homework · feedback ready' });
  }
  return out.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

// Small circular icon chip used per notification row.
const NotifChip = ({ icon, bg, color }) => (
  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }}>
    <Icon name={icon} size={16} />
  </div>
);

const NotificationBell = ({ comms, onNavigate }) => {
  const { ctx } = comms;
  const [open, setOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(() => (ctx.user ? loadDismissed(ctx.userId) : {}));
  const unread = comms.unread;

  React.useEffect(() => {
    if (ctx.user) setDismissed(loadDismissed(ctx.userId));
  }, [ctx.userId]);

  // Close on Escape while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!ctx.user) return null;

  // ── Build the feed ────────────────────────────────────────────────────────
  const msgItems = comms.threads
    .map(t => ({ t, n: comms.threadUnread(t) }))
    .filter(x => x.n > 0)
    .map(({ t, n }) => ({
      kind: 'msg', id: t.id, icon: 'mail', page: 'comms:messages',
      title: threadTitle(t, ctx), sub: `${n} new message${n === 1 ? '' : 's'}`, time: t.lastMessageAt,
      chipBg: DS.accentLight, chipColor: DS.accent,
      clear: () => comms.markThreadRead(t.id),
    }));

  const annItems = comms.announcements
    .filter(a => a.authorId !== ctx.userId && !a.reads[ctx.userId] && !isExpired(a))
    .map(a => {
      const pm = PRIORITY_META[a.priority] || PRIORITY_META.normal;
      return {
        kind: 'ann', id: a.id, icon: 'megaphone', page: 'comms:announcements',
        title: a.title, sub: `${a.authorName} · ${relTime(a.createdAt)}`, time: a.createdAt,
        chipBg: pm.bg(), chipColor: pm.color(),
        clear: () => comms.markRead(a.id),
      };
    });

  const actItems = activityItems(ctx)
    .filter(it => !dismissed[it.sig])
    .map(it => {
      const tm = activityToneMeta(it.tone);
      return {
        kind: it.kind || 'activity', id: it.id, icon: it.icon, page: it.page,
        title: it.title, sub: it.sub, time: it.time || null,
        chipBg: tm.bg, chipColor: tm.color,
        clear: () => {
          const next = { ...dismissed, [it.sig]: true };
          setDismissed(next); saveDismissed(ctx.userId, next);
        },
      };
    });

  const total = unread.total + actItems.length;

  const go = (page) => { setOpen(false); onNavigate && onNavigate(ctx.role, page); };
  const clearAll = () => {
    comms.markAllRead();
    const next = { ...dismissed };
    activityItems(ctx).forEach(it => { next[it.sig] = true; });
    setDismissed(next); saveDismissed(ctx.userId, next);
  };

  // Grouped sections, in priority order. Only non-empty groups render.
  const sections = [
    { key: 'msg', label: 'Messages', items: msgItems },
    { key: 'ann', label: 'Announcements', items: annItems },
    { key: 'hw', label: 'Activity', items: actItems },
  ].filter(s => s.items.length > 0);

  const Row = ({ it }) => (
    <div
      onClick={() => go(it.page)}
      style={{
        display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 8px 11px 14px',
        cursor: 'pointer', borderRadius: 10, position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = DS.surface; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <NotifChip icon={it.icon} bg={it.chipBg} color={it.chipColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
        <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 2 }}>{it.sub}</div>
      </div>
      <button
        title="Clear"
        onClick={(e) => { e.stopPropagation(); it.clear(); }}
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 4, borderRadius: 6, display: 'flex', lineHeight: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = DS.text; e.currentTarget.style.background = DS.border; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = DS.faint; e.currentTarget.style.background = 'none'; }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );

  return (
    <React.Fragment>
      {/* Bell trigger (stays in the top bar) */}
      <button onClick={() => setOpen(o => !o)} title="Notifications" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', position: 'relative' }}>
        <Icon name="bell" size={16} />
        {total > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: DS.danger, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {/* Backdrop + drawer are portalled to <body>: the top bar sets a
          backdrop-filter, which would otherwise make these fixed elements
          resolve against the 52px header instead of the viewport. */}
      {ReactDOM.createPortal(
        <React.Fragment>
      {/* Dimmed backdrop — click to dismiss. Always mounted so the drawer can
          transition both in and out; pointer events are gated on `open`. */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(17,24,39,0.28)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease', backdropFilter: 'blur(1px)',
        }}
      />

      {/* Slide-out drawer, anchored to the right edge, full viewport height. */}
      <div
        role="dialog"
        aria-label="Notifications"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '90vw', zIndex: 1201,
          background: DS.bg, borderLeft: `1px solid ${DS.cardBorder}`, boxShadow: '-12px 0 40px rgba(17,24,39,0.18)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 14px', borderBottom: `1px solid ${DS.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>Notifications</span>
          {total > 0 && <Badge variant="danger">{total} new</Badge>}
          <div style={{ flex: 1 }} />
          {total > 0 && (
            <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.accent, fontSize: 12.5, fontWeight: 600, padding: '4px 6px', borderRadius: 6 }}>
              Clear all
            </button>
          )}
          <button onClick={() => setOpen(false)} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.muted, padding: 5, borderRadius: 7, display: 'flex', lineHeight: 0 }}>
            <Icon name="x" size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px 16px' }}>
          {sections.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: DS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.faint }}>
                <Icon name="check" size={24} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>You're all caught up</div>
              <div style={{ fontSize: 12.5, color: DS.muted, maxWidth: 240 }}>New messages, announcements and activity will show up here.</div>
            </div>
          ) : (
            sections.map(sec => (
              <div key={sec.key} style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px 6px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: DS.muted }}>{sec.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: DS.faint }}>{sec.items.length}</span>
                </div>
                {sec.items.map(it => <Row key={it.kind + it.id} it={it} />)}
              </div>
            ))
          )}
        </div>
      </div>
        </React.Fragment>,
        document.body
      )}
    </React.Fragment>
  );
};

// ─── Exports ────────────────────────────────────────────────────────────────────────
Object.assign(window, {
  useComms, commsContext, CommunicationsPage, NotificationBell,
  commsUnreadCount, canAnnounce, canMessage, commsRecipients,
  // Used by the Settings → Comms tab (Settings.jsx) to render the preset cards.
  COMMS_PRESETS, commsUserById: userById,
});

})();
