// ══════════════════════════════════════════════════════════════
//  TutorOS — Onboarding (centre setup · invites · provisioning · claim)
// ══════════════════════════════════════════════════════════════
//
//  Extends the existing admin flows additively. Accounts live in the shared
//  admin store (admin_store_v4, see AdminPages.jsx) as a nested optional
//  `account` object on teacher/student records — never a renamed/removed field.
//  A tiny per-centre onboarding store (tutoros.onboarding.v2::<centreId>) holds
//  the plan/seat caps, the auto-saved CSV import draft, the setup-checklist
//  progress, and the cross-centre membership list.
//
//  Frontend-only. No backend, no auth, no stored passwords — accounts carry only
//  a status + setupMethod (+ consentRecorded for under-13). Multi-tenant: every
//  generated identity is namespaced by the centre slug.

// ─── Per-centre onboarding store ──────────────────────────────────────────────
// v2: re-seeds onboarding (incl. the cross-centre membership list) onto the
// expanded seed — staff across bm + apex + summit. A stored v1 blob predates the
// apex/summit staff and masks them (read() prefers the stored blob over the seed).
const ONB_STORE_KEY = 'tutoros.onboarding.v2';

const useOnboardingStore = (centreId = ONB_CENTRE.id) => {
  const key = `${ONB_STORE_KEY}::${centreId}`;
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw);
        return { ...ONB_INITIAL, ...p, steps: { ...ONB_INITIAL.steps, ...(p.steps || {}) } };
      }
    } catch (e) { /* ignore */ }
    return { ...ONB_INITIAL };
  };
  const [state, setState] = React.useState(read);
  const persist = next => { setState(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) {} };

  const completeStep    = id => persist({ ...state, steps: { ...state.steps, [id]: true } });
  const setImportDraft  = draft => persist({ ...state, importDraft: draft });
  const setLastBatch    = ids => persist({ ...state, lastBatch: ids });
  // Single-persist finishers — avoid one mutator clobbering another's write.
  const finishImport    = ids => persist({ ...state, steps: { ...state.steps, students: true }, lastBatch: ids, importDraft: null });
  const finishProvision = ids => persist({ ...state, steps: { ...state.steps, students: true }, lastBatch: ids });
  const finishInvites   = (newMembers = []) => {
    const seen = new Set(state.memberships.map(m => m.email.toLowerCase() + '|' + m.centreId));
    const add = newMembers
      .filter(m => !seen.has(m.email.toLowerCase() + '|' + centreId))
      .map(m => ({ email: m.email.toLowerCase(), centreId, role: m.role || 'teacher' }));
    persist({ ...state, steps: { ...state.steps, invite: true }, memberships: [...state.memberships, ...add] });
  };
  const identityFor = email => state.memberships.find(m => m.email.toLowerCase() === (email || '').toLowerCase());
  // Public signup (admin-only) records the tenant + first admin and issues the
  // centre code. Kept on the same bm tenant so generated student identities stay
  // consistent (id/slug unchanged) — only the display name + code are adopted, and
  // the owner is registered as an admin membership (never a duplicate account).
  const recordSignup = ({ name, code, plan, adminName, adminEmail } = {}) => {
    const e = (adminEmail || '').toLowerCase();
    const hasMember = state.memberships.some(m => m.email.toLowerCase() === e && m.centreId === centreId);
    persist({
      ...state,
      signedUp: true,
      signupAdmin: { name: adminName || '', email: e },
      centre: { ...state.centre, name: name || state.centre.name, code: code || state.centre.code },
      plan: plan || state.plan,
      memberships: (e && !hasMember) ? [...state.memberships, { email: e, centreId, role: 'admin' }] : state.memberships,
    });
  };

  // ─── Staff role grants (Team page) ───────────────────────────────────────
  // Roles are stored as flat { email, centreId, role } membership rows (a person
  // holds >1 role via >1 row). permissions.js `membersForCentre` groups them into
  // a roles[] array for display. Grant/revoke add/remove a single row, and write
  // an audit entry in the SAME persist so neither clobbers the other (the
  // stale-closure trap the bulk finishers above also avoid).
  const logEntry = (entry) =>
    [{ id: 'rl' + Date.now(), at: new Date().toISOString(), ...entry }, ...(state.roleLog || [])].slice(0, 200);

  const grantRole = (email, cId, role, by) => {
    const e = (email || '').toLowerCase();
    if (!e || !role) return;
    if (state.memberships.some(m => m.email.toLowerCase() === e && m.centreId === cId && m.role === role)) return; // idempotent
    persist({
      ...state,
      memberships: [...state.memberships, { email: e, centreId: cId, role }],
      roleLog: logEntry({ action: 'grant', role, email: e, centreId: cId, by: (by || '').toLowerCase() }),
    });
  };
  const revokeRole = (email, cId, role, by) => {
    const e = (email || '').toLowerCase();
    persist({
      ...state,
      memberships: state.memberships.filter(m => !(m.email.toLowerCase() === e && m.centreId === cId && m.role === role)),
      roleLog: logEntry({ action: 'revoke', role, email: e, centreId: cId, by: (by || '').toLowerCase() }),
    });
  };
  // Ownership transfer is an account-level change (the subscription store owns
  // ownerUserId); we only record the audit entry here.
  const logRoleChange = (entry) => persist({ ...state, roleLog: logEntry(entry) });

  // Materialise implicit teacher memberships: every teacher on the centre's
  // roster (admin store) is a teacher of that centre, but only some have an
  // explicit membership row. Backfill the missing ones so roles are purely
  // membership-driven and the Team toggles act on real data.
  //
  // Runs ONCE per centre (rosterSeeded flag, set in the same persist): re-seeding
  // on every mount would resurrect a teacher an admin has just explicitly revoked.
  // Safe to call on mount — a no-op after the first run.
  const ensureTeacherMemberships = (cId, emails = []) => {
    if ((state.rosterSeeded || {})[cId]) return;
    const have = new Set(state.memberships
      .filter(m => m.centreId === cId && m.role === 'teacher')
      .map(m => m.email.toLowerCase()));
    const add = emails
      .map(e => (e || '').toLowerCase())
      .filter(e => e && !have.has(e))
      .map(email => ({ email, centreId: cId, role: 'teacher' }));
    persist({
      ...state,
      memberships: add.length ? [...state.memberships, ...add] : state.memberships,
      rosterSeeded: { ...(state.rosterSeeded || {}), [cId]: true },
    });
  };

  return { ...state, centreId, completeStep, setImportDraft, setLastBatch, finishImport, finishProvision, finishInvites, identityFor, recordSignup, grantRole, revokeRole, logRoleChange, ensureTeacherMemberships };
};

// ─── Account + identity helpers ───────────────────────────────────────────────
const CLAIM_BASE = 'https://app.tutoros.app/claim/';

const ACCT_META = {
  invited: { label: 'Invited',       variant: 'info',    hint: 'Link sent — not yet completed' },
  pending: { label: 'Pending setup', variant: 'warning', hint: 'Account created — credential not set' },
  active:  { label: 'Active',        variant: 'success', hint: 'Signed in and ready' },
};
const SETUP_LABEL = {
  'self-set': 'Self-set password', password: 'Password', pin: 'PIN',
  qr: 'QR / tap name', 'magic-link': 'Magic link', pending: 'Not set',
};
const acct       = rec => (rec && rec.account) || {};
const acctStatus = rec => acct(rec).status || (rec.status === 'invited' ? 'invited' : rec.status === 'pending' ? 'pending' : 'active');
const claimRef   = rec => acct(rec).inviteToken || acct(rec).claimCode || '';
const claimUrl   = rec => CLAIM_BASE + claimRef(rec);

const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());

// Humanise an email local-part into a display name for un-named invites.
const emailToName = email => {
  const local = (email || '').split('@')[0] || '';
  return local.split(/[._-]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || email;
};

// ─── Username / synthetic-email generation ────────────────────────────────────
const onbAlnum = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const genUsername = (first, last, taken) => {
  const base = (onbAlnum(first).slice(0, 1) + onbAlnum(last)) || 'student';
  let u = base, n = 1;
  while (taken.has(u)) { u = base + (++n); }
  taken.add(u);
  return u;
};
const synthEmail = (username, slug = ONB_CENTRE.slug) => `${username}@${slug}.students.tutoros.app`;

// ─── Age / under-13 (UK DPA 2018 consent) ─────────────────────────────────────
const parseDob = str => {
  if (!str) return null;
  const s = str.trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
};
const dobToIso = str => { const d = parseDob(str); return d ? d.toISOString().slice(0, 10) : ''; };
const ageFrom = (dob, ref = new Date()) => {
  const d = parseDob(dob); if (!d) return null;
  let a = ref.getFullYear() - d.getFullYear();
  const md = ref.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < d.getDate())) a--;
  return a;
};
const yearNum = year => { const m = (year || '').match(/(\d{1,2})/); return m ? +m[1] : null; };
const yearToAge = year => { const n = yearNum(year); return n == null ? null : n + 5; }; // UK: Year N ≈ age N+5
// Flag under-13 from DOB when present, else infer from year group (for consent).
const isUnderThirteen = ({ dob, year }) => {
  const a = ageFrom(dob);
  if (a != null) return a < 13;
  const ya = yearToAge(year);
  return ya != null ? ya < 13 : false;
};

// ─── Codes / tokens (never a credential — just a one-time claim handle) ────────
const RAND = (n, chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789') =>
  Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const genClaimCode = () => 'BM-' + RAND(4);
const genToken = (p = 'tok') => p + '-' + RAND(8).toLowerCase();

const onbTodayIso = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => {
  if (!iso) return '—';
  const d = parseDob(iso); if (!d) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── CSV format (documented in the import UI) ─────────────────────────────────
const CSV_HEADERS = ['first_name', 'last_name', 'year_group', 'date_of_birth', 'parent_name', 'parent_email', 'parent_phone', 'student_email', 'notes'];
const CSV_REQUIRED = { first_name: true, last_name: true, year_group: true };
const CSV_TEMPLATE = CSV_HEADERS.join(',') + '\n';
const CSV_SAMPLE =
  'first_name,last_name,year_group,date_of_birth,parent_name,parent_email,parent_phone,student_email,notes\n' +
  'John,Smith,Year 11,03/09/2009,Sara Smith,sara.smith@example.com,07700 900123,,\n' +
  'Maya,Patel,Year 7,12/04/2013,Nina Patel,nina.patel@example.com,,,New starter';

const parseCsvLine = line => {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
};

// Parse + validate a student CSV into preview rows. De-dupes usernames within the
// file AND against existing students, and flags per-row Ready / Needs attention.
const parseStudentCsv = (text, existingUsernames = []) => {
  const lines = (text || '').split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return { rows: [], headerOk: false, headerError: 'Nothing to import yet — paste rows or upload a CSV.' };
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const idx = {}; CSV_HEADERS.forEach(h => { idx[h] = header.indexOf(h); });
  const headerOk = idx.first_name >= 0 && idx.last_name >= 0 && idx.year_group >= 0;
  if (!headerOk) return { rows: [], headerOk: false, headerError: 'Header row must include first_name, last_name and year_group.' };

  const taken = new Set(existingUsernames.map(u => (u || '').toLowerCase()));
  const seen = new Set();
  const rows = lines.slice(1).map((line, i) => {
    const cells = parseCsvLine(line);
    const get = k => (idx[k] >= 0 ? (cells[idx[k]] || '').trim() : '');
    const data = {};
    CSV_HEADERS.forEach(h => { data[h] = get(h); });

    const issues = [];
    if (!data.first_name) issues.push('First name missing');
    if (!data.last_name) issues.push('Last name missing');
    if (!data.year_group) issues.push('Year group missing');
    if (data.student_email && !isEmail(data.student_email)) issues.push('Invalid student email');
    if (data.parent_email && !isEmail(data.parent_email)) issues.push('Invalid parent email');
    const under13 = isUnderThirteen({ dob: data.date_of_birth, year: data.year_group });
    if (under13 && !data.parent_email) issues.push('Parent email required for under-13 consent');

    const dupKey = onbAlnum(data.first_name) + '|' + onbAlnum(data.last_name) + '|' + onbAlnum(data.year_group);
    if (data.first_name && data.last_name) {
      if (seen.has(dupKey)) issues.push('Duplicate row in file');
      seen.add(dupKey);
    }
    const username = (data.first_name && data.last_name) ? genUsername(data.first_name, data.last_name, taken) : '';
    return {
      n: i + 1, data, username,
      syntheticEmail: username ? synthEmail(username) : '',
      underThirteen: under13,
      issues,
      status: issues.length ? 'attention' : 'ready',
    };
  });
  return { rows, headerOk: true };
};

// Build the account record stored on a provisioned student.
const buildStudentAccount = (row, via) => ({
  status: row.underThirteen ? 'invited' : 'pending', // under-13 → parent link sent; 13+ → awaiting claim
  setupMethod: 'pending',
  username: row.username,
  syntheticEmail: row.syntheticEmail,
  underThirteen: row.underThirteen,
  consentRecorded: false,
  createdVia: via,
  provisionedOn: onbTodayIso(),
  claimCode: genClaimCode(),
});

// ─── Download / print / clipboard ─────────────────────────────────────────────
const downloadText = (filename, text, type = 'text/csv') => {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* ignore */ }
};

const printSlips = (centre, slips) => {
  const w = window.open('', '_blank', 'width=860,height=920');
  if (!w) return;
  const esc = s => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cards = slips.map(s => `
    <div class="slip">
      <div class="head"><span class="logo">T</span><span class="centre">${esc(centre)}</span><span class="tag">Account claim slip</span></div>
      <div class="name">${esc(s.name)}</div>
      <div class="muted">${esc(s.year)}${s.underThirteen ? ' · Parent/guardian completes setup (under 13)' : ''}</div>
      <div class="grid">
        <div><label>Username</label><div class="mono">${esc(s.username)}</div></div>
        <div><label>Sign-in email</label><div class="mono">${esc(s.syntheticEmail)}</div></div>
      </div>
      <div class="claim">
        <div class="qr">QR</div>
        <div><label>One-time claim code</label><div class="code">${esc(s.claimCode)}</div>
        <div class="muted small">${esc(CLAIM_BASE)}${esc(s.claimCode)}</div></div>
      </div>
    </div>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Claim slips — ${esc(centre)}</title>
    <style>
      *{box-sizing:border-box;font-family:'Inter','Segoe UI',sans-serif}
      body{margin:0;padding:24px;background:#fff;color:#111827}
      .slip{border:1.5px dashed #9CA3AF;border-radius:12px;padding:18px 20px;margin:0 0 16px;page-break-inside:avoid}
      .head{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .logo{width:22px;height:22px;border-radius:5px;background:#0F9D7F;color:#fff;font-weight:800;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
      .centre{font-weight:700;font-size:14px}.tag{margin-left:auto;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.05em}
      .name{font-size:20px;font-weight:700}.muted{color:#6B7280;font-size:12px}.small{font-size:11px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
      label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9CA3AF}
      .mono{font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:2px}
      .claim{display:flex;align-items:center;gap:16px;border-top:1px solid #E5E7EB;padding-top:14px}
      .qr{width:74px;height:74px;border-radius:8px;border:2px solid #111827;display:flex;align-items:center;justify-content:center;font-weight:800;letter-spacing:1px;
        background:repeating-linear-gradient(45deg,#111827 0 4px,#fff 4px 8px);color:#fff;text-shadow:0 0 3px #000}
      .code{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;letter-spacing:2px;margin-top:2px}
    </style></head><body>${cards}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 350);
};

// ─── Small shared bits ────────────────────────────────────────────────────────
const onbIconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center' };
const Mono = ({ children, color = DS.sub, size = 12.5 }) => (
  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color }}>{children}</span>
);

const CopyChip = ({ value, title = 'Copy', mono, children, icon = 'copy' }) => {
  const [done, setDone] = React.useState(false);
  const copy = e => {
    e && e.stopPropagation();
    try { navigator.clipboard.writeText(value); } catch (err) {}
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <button onClick={copy} title={title} style={onbIconBtn}>
      <Icon name={done ? 'check' : icon} size={14} color={done ? DS.success : DS.muted} />
      {children}
    </button>
  );
};

const CopyField = ({ label, value, mono }) => {
  const [done, setDone] = React.useState(false);
  const copy = () => { try { navigator.clipboard.writeText(value); } catch (e) {} setDone(true); setTimeout(() => setDone(false), 1400); };
  return (
    <div>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: DS.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 8, padding: '8px 10px' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: DS.sub, fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <button onClick={copy} style={onbIconBtn}><Icon name={done ? 'check' : 'copy'} size={14} color={done ? DS.success : DS.muted} /></button>
      </div>
    </div>
  );
};

const SeatMeter = ({ label, used, total, icon, accent = DS.accent, hint }) => {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = Math.max(0, total - used);
  const near = pct >= 90;
  return (
    <div style={{ flex: 1, minWidth: 0, background: DS.card, border: `1px solid ${DS.cardBorder}`, boxShadow: DS.cardShadow, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: DS.muted, fontWeight: 500 }}>{label}</span>
        {icon && <Icon name={icon} size={15} color={DS.faint} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: DS.text, letterSpacing: '-0.5px' }}>
        {used}<span style={{ fontSize: 15, color: DS.faint, fontWeight: 600 }}> / {total}</span>
      </div>
      <div style={{ height: 6, background: DS.surface, borderRadius: 3, overflow: 'hidden', margin: '10px 0 6px' }}>
        <div style={{ width: pct + '%', height: '100%', background: near ? DS.danger : accent, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11.5, color: near ? DS.danger : DS.muted }}>{remaining} seat{remaining === 1 ? '' : 's'} remaining</div>
      {hint && <div style={{ fontSize: 10.5, color: DS.faint, marginTop: 2 }}>{hint}</div>}
    </div>
  );
};

// Pooled seat entitlement (§5). Seats are an ACCOUNT-level pool (like storage),
// summed across every centre in the account and read from the plan catalogue —
// NOT a per-centre allowance. The single source is centreMetrics.getSeatUsage;
// this wrapper adds a plan-literal fallback for load-order safety. Returns
// { students: { used, cap }, teachers: { used, cap } }.
const pooledSeats = (onb) => {
  const su = window.centreMetrics && window.centreMetrics.getSeatUsage();
  if (su) return su;
  const p = (onb && onb.plan) || {};
  return { students: { used: 0, cap: p.studentSeats || 0 }, teachers: { used: 0, cap: p.teacherSeats || 0 } };
};

const AccountStatusBadge = ({ status }) => {
  const m = ACCT_META[status] || ACCT_META.pending;
  return <StatusPill tone={m.variant}>{m.label}</StatusPill>;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  1 · Centre setup checklist  — DEPRECATED / no longer routed.
//  Superseded by the right-hand setup drawer on the Centres page (Centres.jsx,
//  SetupChecklist). admin/setup navigation is rewritten to that drawer in index.html
//  __navigate. Kept inert for reference; safe to delete.
// ═══════════════════════════════════════════════════════════════════════════════
const CentreSetupPage = () => {
  const store = useAdminStore();
  // Scope the checklist to the active centre so "Set up" from the Centres page targets
  // the switched centre's own onboarding store (default bm when none is selected). The
  // centre's display identity (name/code) comes from the subscription store when it owns
  // that centre, falling back to the onboarding store's seeded centre.
  const activeId = (window.__getCentre && window.__getCentre()) || ONB_CENTRE.id;
  const onb = useOnboardingStore(activeId);
  const sub = window.useSubscriptionStore ? window.useSubscriptionStore() : null;
  const centre = (sub && sub.centres.find(c => c.id === activeId)) || onb.centre;
  const teachers = store.teachers, students = store.students, classes = store.classes;
  const invitedT = teachers.filter(t => acctStatus(t) === 'invited').length;
  const pendingS = students.filter(s => acctStatus(s) !== 'active').length;
  const provisioned = students.filter(s => acct(s).createdVia).length;

  const steps = [
    { id: 'invite', icon: 'user', accent: '#0891B2', title: 'Invite your teachers',
      desc: 'Send invite links so each teacher sets up their own account. Seats come from your plan.',
      meta: `${teachers.length} on the team · ${invitedT} invite${invitedT === 1 ? '' : 's'} pending`,
      cta: 'Invite teachers', go: () => adminNav('invite_teachers'),
      done: onb.steps.invite || invitedT > 0 },
    { id: 'students', icon: 'users', accent: DS.accent, title: 'Add your students',
      desc: 'Bulk-import your class list or add students one at a time. Accounts are created ready to claim.',
      meta: `${students.length} students · ${pendingS} awaiting setup`,
      cta: 'Add students', go: () => adminNav('students_import'),
      done: onb.steps.students || provisioned > 0 },
    { id: 'classes', icon: 'book', accent: '#7C3AED', title: 'Create classes & enrol',
      desc: 'Set up class groups, then enrol your signed-up students from the roster.',
      meta: `${classes.length} classes`,
      cta: 'Create a class', go: () => adminNav('classes_add'),
      done: onb.steps.classes || classes.length > 0 },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div style={{ padding: '32px', maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        title="Set up your centre"
        subtitle={`Welcome to ${centre.name}. Three steps to get up and running on the ${onb.plan.name} plan.`}
        actions={[<Btn key="skip" variant="ghost" small onClick={() => window.__navigate('admin', 'dashboard')}>Skip to dashboard</Btn>]}
      />

      {/* Centre code — issued at signup. Students use it (once) to resolve this
          centre at first login on a shared device; it never creates an account. */}
      {centre.code && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, padding: '16px 20px', background: `linear-gradient(135deg, ${DS.accent}10, transparent)`, border: `1px solid ${DS.accentBorder}`, borderRadius: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: DS.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="tag" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your centre code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: '1px', color: DS.text }}>{centre.code}</span>
              <CopyChip value={centre.code} title="Copy centre code" />
            </div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 4 }}>Share it freely — put it on the whiteboard or a parent letter. Students enter it once on a new device, then their username. It never creates an account.</div>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card style={{ marginBottom: 22 }}>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
            <svg width="54" height="54" viewBox="0 0 54 54">
              <circle cx="27" cy="27" r="23" fill="none" stroke={DS.border} strokeWidth="6" />
              <circle cx="27" cy="27" r="23" fill="none" stroke={DS.accent} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 2 * Math.PI * 23} ${2 * Math.PI * 23}`} transform="rotate(-90 27 27)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: DS.text }}>{pct}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{doneCount} of {steps.length} steps complete</div>
            <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>
              {doneCount === steps.length ? 'Your centre is ready — students can start claiming their accounts.' : 'Finish setup to get everyone onboarded.'}
            </div>
          </div>
          <Btn variant="secondary" icon="users" onClick={() => adminNav('people')}>People &amp; invites</Btn>
        </div>
      </Card>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
            background: DS.card, border: `1px solid ${s.done ? DS.successBorder : DS.cardBorder}`,
            boxShadow: DS.cardShadow, borderRadius: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? DS.successBg : s.accent + '14', color: s.done ? DS.success : s.accent,
              border: `1px solid ${s.done ? DS.successBorder : s.accent + '33'}`,
            }}>
              <Icon name={s.done ? 'check' : s.icon} size={20} strokeWidth={s.done ? 2.5 : 1.6} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: DS.faint }}>STEP {i + 1}</span>
                {s.done && <Badge variant="success">Done</Badge>}
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: DS.text, marginTop: 2 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: DS.muted, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
              <div style={{ fontSize: 12, color: DS.faint, marginTop: 6 }}>{s.meta}</div>
            </div>
            <Btn variant={s.done ? 'secondary' : 'primary'} icon={s.done ? null : 'chevron_r'} onClick={s.go}>
              {s.done ? 'Manage' : s.cta}
            </Btn>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: '14px 18px', background: DS.infoBg, border: `1px solid #BAE6FD`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="alert" size={16} color={DS.info} />
        <span style={{ fontSize: 12.5, color: DS.sub }}>
          Adding a student creates their account but does <b>not</b> place them in a class — you enrol students into classes separately from the class roster.
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  2 · Invite teachers  (route: admin/invite_teachers) — seat-gated
// ═══════════════════════════════════════════════════════════════════════════════
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Hourly', 'Contract'];

const InviteTeachersPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const blank = () => ({ key: 'r' + Math.random().toString(36).slice(2, 8), email: '', subject: '', employmentType: 'Full-time' });
  const [rows, setRows] = React.useState([blank(), blank()]);
  const [touched, setTouched] = React.useState(false);
  const [sent, setSent] = React.useState(null); // [{ name, email, link, token, existing }]

  // Pooled teacher seats — account-level, summed across all centres (§5).
  const seat = pooledSeats(onb).teachers;
  const teacherSeats = seat.cap;
  const used = seat.used;
  const remaining = Math.max(0, teacherSeats - used);

  const existingEmail = email => {
    const e = (email || '').toLowerCase();
    return store.teachers.some(t => (t.email || '').toLowerCase() === e) || !!onb.identityFor(e);
  };
  const set = (key, patch) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  const addRow = () => setRows(rs => [...rs, blank()]);
  const removeRow = key => setRows(rs => rs.length > 1 ? rs.filter(r => r.key !== key) : rs);

  const validRows = rows.filter(r => r.email.trim() && isEmail(r.email));
  const newAccounts = validRows.filter(r => !existingEmail(r.email));
  const overSeats = newAccounts.length > remaining;
  const rowErr = r => !r.email.trim() ? '' : !isEmail(r.email) ? 'Enter a valid email' : '';

  const send = () => {
    setTouched(true);
    if (!validRows.length || overSeats) return;
    const subjects = store.subjects.map(s => s.name);
    const created = [];
    const newRecords = [];
    const members = [];
    validRows.forEach(r => {
      const email = r.email.trim();
      members.push({ email, role: 'teacher' });
      if (existingEmail(email)) {
        created.push({ name: emailToName(email), email, existing: true });
        return;
      }
      const token = genToken('tok');
      newRecords.push({
        name: emailToName(email), email,
        subject: r.subject || '', subjects: r.subject ? [r.subject] : [],
        phone: '', status: 'invited',
        classes: 0, students: 0, hwToMark: 0, attendance: 0, rating: 0,
        joined: 'Invited ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        color: TEACHER_PALETTE[Math.floor(Math.random() * TEACHER_PALETTE.length)],
        centreId: onb.centreId,
        account: { status: 'invited', setupMethod: 'pending', inviteToken: token, invitedOn: onbTodayIso(),
          employmentType: r.employmentType, internalNotes: '' },
      });
      created.push({ name: emailToName(email), email, token, link: CLAIM_BASE + token, existing: false });
    });
    if (newRecords.length) store.addTeachers(newRecords);
    onb.finishInvites(members);
    setSent(created);
  };

  if (sent) {
    return (
      <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
        <FlowHeader title="Invites sent" subtitle={`${sent.length} teacher${sent.length === 1 ? '' : 's'} invited to ${onb.centre.name}`} onBack={() => adminNav('setup')} />
        <Card>
          <div style={{ padding: '12px 0' }}>
            {sent.map((s, i) => (
              <div key={i} style={{ padding: '14px 20px', borderBottom: i < sent.length - 1 ? `1px solid ${DS.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={s.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: DS.muted }}>{s.email}</div>
                </div>
                {s.existing
                  ? <Badge variant="accent">Membership added</Badge>
                  : (<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CopyChip value={s.link} title="Copy invite link" icon="link" />
                      <Btn variant="secondary" small icon="eye" onClick={() => window.__openClaim(s.token)}>Preview</Btn>
                    </div>)}
              </div>
            ))}
          </div>
        </Card>
        <div style={{ marginTop: 12, fontSize: 12.5, color: DS.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="alert" size={14} color={DS.faint} />
          Existing accounts get a new membership for this centre — no duplicate account is created.
        </div>
        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <Btn variant="primary" icon="users" onClick={() => adminNav('people')}>Track invites</Btn>
          <Btn variant="secondary" onClick={() => { setSent(null); setRows([blank(), blank()]); setTouched(false); }}>Invite more</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 820, margin: '0 auto' }}>
      <FlowHeader title="Invite teachers" subtitle="Each teacher gets a link to set up their own account." onBack={() => adminNav('setup')} />

      <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
        <SeatMeter label="Teacher seats" used={used} total={teacherSeats} icon="user" accent="#0891B2" hint="Pooled across all centres" />
        <div style={{ flex: 2, minWidth: 0, background: DS.infoBg, border: '1px solid #BAE6FD', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="alert" size={16} color={DS.info} />
          <div style={{ fontSize: 12.5, color: DS.sub, lineHeight: 1.5 }}>
            You pre-fill admin-side details (subject, employment type). The teacher fills in their own name, password and phone via the link.
            An <b>invite holds a seat</b> until it's completed or revoked.
          </div>
        </div>
      </div>

      <Card title="Teacher invites" subtitle={`${remaining} seat${remaining === 1 ? '' : 's'} remaining`} icon="user" accent="#0891B2">
        <div style={{ padding: '8px 20px 4px' }}>
          {/* column labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 150px 32px', gap: 12, padding: '6px 0', fontSize: 11, fontWeight: 600, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Email address</span><span>Subject (optional)</span><span>Employment</span><span></span>
          </div>
          {rows.map(r => {
            const err = touched && rowErr(r);
            const exists = r.email.trim() && isEmail(r.email) && existingEmail(r.email);
            return (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 200px 150px 32px', gap: 12, alignItems: 'start', padding: '6px 0' }}>
                <div>
                  <Input value={r.email} onChange={e => set(r.key, { email: e.target.value })} invalid={!!err} icon="mail" placeholder="teacher@email.com" />
                  {err ? <div style={{ fontSize: 11, color: DS.danger, marginTop: 4 }}>{err}</div>
                    : exists ? <div style={{ fontSize: 11, color: DS.info, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={11} />Existing account — adds a membership</div> : null}
                </div>
                <Select value={r.subject} onChange={e => set(r.key, { subject: e.target.value })}>
                  <option value="">—</option>
                  {store.subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
                <Select value={r.employmentType} onChange={e => set(r.key, { employmentType: e.target.value })}>
                  {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
                <button onClick={() => removeRow(r.key)} title="Remove" style={{ ...onbIconBtn, height: 38, justifyContent: 'center' }}>
                  <Icon name="x" size={15} color={DS.faint} />
                </button>
              </div>
            );
          })}
          <button onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: DS.accent, fontSize: 13, fontWeight: 600, padding: '10px 0' }}>
            <Icon name="plus" size={14} /> Add another
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
          <div style={{ fontSize: 12.5, color: overSeats ? DS.danger : DS.muted }}>
            {overSeats
              ? `Only ${remaining} seat${remaining === 1 ? '' : 's'} left — remove ${newAccounts.length - remaining} new invite${newAccounts.length - remaining === 1 ? '' : 's'} or upgrade your plan.`
              : `${newAccounts.length} new account${newAccounts.length === 1 ? '' : 's'} · ${validRows.length - newAccounts.length} membership${validRows.length - newAccounts.length === 1 ? '' : 's'}`}
          </div>
          <Btn variant="primary" icon="send" onClick={send} style={validRows.length && !overSeats ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
            Send {validRows.length || ''} invite{validRows.length === 1 ? '' : 's'}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  3 · Bulk CSV import  (route: admin/students_import)
// ═══════════════════════════════════════════════════════════════════════════════
const RowStatusPill = ({ status }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
    padding: '2px 9px', borderRadius: 6,
    background: status === 'ready' ? DS.successBg : DS.warningBg,
    color: status === 'ready' ? DS.success : DS.warning,
  }}>
    <Icon name={status === 'ready' ? 'check' : 'alert'} size={11} />
    {status === 'ready' ? 'Ready' : 'Needs attention'}
  </span>
);

const BulkImportPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const [text, setText] = React.useState(() => (onb.importDraft && onb.importDraft.text) || '');
  const [restored] = React.useState(() => !!(onb.importDraft && onb.importDraft.text));
  const fileRef = React.useRef(null);

  // Auto-save the in-progress import to localStorage (debounced).
  React.useEffect(() => {
    const t = setTimeout(() => onb.setImportDraft(text.trim() ? { text, parsedAt: Date.now() } : null), 400);
    return () => clearTimeout(t);
  }, [text]);

  const existingUsernames = React.useMemo(() => store.students.map(s => acct(s).username).filter(Boolean), [store.students]);
  const parsed = React.useMemo(() => parseStudentCsv(text, existingUsernames), [text, existingUsernames]);
  const rows = parsed.rows;
  const readyRows = rows.filter(r => r.status === 'ready');
  const under13 = rows.filter(r => r.underThirteen).length;

  // Pooled student seats — account-level, summed across all centres (§5).
  const seat = pooledSeats(onb).students;
  const studentSeats = seat.cap;
  const usedSeats = seat.used;
  const remaining = Math.max(0, studentSeats - usedSeats);
  const overSeats = readyRows.length > remaining;

  const loadFile = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(f);
  };

  const confirmImport = () => {
    if (!readyRows.length || overSeats) return;
    const teacherName = '—';
    const records = readyRows.map(r => ({
      firstName: r.data.first_name, lastName: r.data.last_name,
      name: `${r.data.first_name} ${r.data.last_name}`,
      year: r.data.year_group, dob: dobToIso(r.data.date_of_birth),
      email: r.data.student_email || '', phone: '', address: '',
      guardianName: r.data.parent_name || '', guardianRelation: 'Parent',
      guardianEmail: r.data.parent_email || '', guardianPhone: r.data.parent_phone || '',
      subjects: [], classIds: [], notes: r.data.notes || '',
      attendance: 0, hw: 0, score: 0, status: 'active', teacher: teacherName, lastSeen: 'Not yet active',
      centreId: onb.centreId,
      account: buildStudentAccount(r, 'csv'),
    }));
    const ids = store.addStudents(records);
    onb.finishImport(ids);
    adminNav('claim_slips');
  };

  return (
    <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>
      <FlowHeader title="Import students" subtitle="Upload your class list — we generate a username + claim slip for each student." onBack={() => adminNav('setup')} />

      {/* Format help */}
      <Card title="CSV format" subtitle="Comma-separated, UTF-8, with a header row" icon="file" accent={DS.accent}
        actions={[
          <Btn key="tpl" variant="secondary" small icon="download" onClick={() => downloadText('tutoros-students-template.csv', CSV_TEMPLATE)}>Template</Btn>,
          <Btn key="smp" variant="ghost" small icon="clip" onClick={() => setText(CSV_SAMPLE)}>Load sample</Btn>,
        ]}
        style={{ marginBottom: 18 }}>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                {['Column', 'Required', 'Notes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  ['first_name', true, ''],
                  ['last_name', true, 'used with the first initial to generate the username'],
                  ['year_group', true, 'e.g. Year 11 or 11'],
                  ['date_of_birth', false, 'DD/MM/YYYY — flags under-13 for consent; inferred from year group if absent'],
                  ['parent_name', false, ''],
                  ['parent_email', false, 'required for under-13 — used for consent + setup/recovery'],
                  ['parent_phone', false, ''],
                  ['student_email', false, 'only older students who have one'],
                  ['notes', false, ''],
                ].map(([c, req, note]) => (
                  <tr key={c} style={{ borderBottom: `1px solid ${DS.surfaceHover}` }}>
                    <td style={{ padding: '6px 10px' }}><Mono color={DS.text}>{c}</Mono></td>
                    <td style={{ padding: '6px 10px' }}>{req ? <span style={{ color: DS.danger, fontWeight: 600 }}>yes</span> : <span style={{ color: DS.faint }}>no</span>}</td>
                    <td style={{ padding: '6px 10px', color: DS.muted }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: DS.muted }}>
            Username = <Mono>first_initial + last_name</Mono>, lowercased &amp; de-duplicated. Sign-in email = <Mono>username@{onb.centre.slug}.students.tutoros.app</Mono>.
          </div>
        </div>
      </Card>

      {/* Paste / upload */}
      <Card title="Paste or upload" icon="upload" accent="#0891B2" style={{ marginBottom: 18 }}
        actions={[<Btn key="up" variant="secondary" small icon="upload" onClick={() => fileRef.current && fileRef.current.click()}>Upload .csv</Btn>]}>
        <div style={{ padding: '16px 20px' }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={loadFile} style={{ display: 'none' }} />
          {restored && text && <div style={{ fontSize: 12, color: DS.info, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={13} />Draft restored from your last session.</div>}
          <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={CSV_SAMPLE} style={{ minHeight: 130, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }} />
          <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="check" size={12} color={DS.success} /> Auto-saved as you type.
          </div>
        </div>
      </Card>

      {/* Preview */}
      {text.trim() && !parsed.headerOk && (
        <Card style={{ marginBottom: 18 }}><div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, color: DS.warning }}>
          <Icon name="alert" size={16} /><span style={{ fontSize: 13 }}>{parsed.headerError}</span>
        </div></Card>
      )}

      {rows.length > 0 && (
        <Card title={`Validation preview · ${rows.length} row${rows.length === 1 ? '' : 's'}`} icon="check" accent={DS.success}>
          <div style={{ display: 'flex', gap: 18, padding: '14px 20px', borderBottom: `1px solid ${DS.border}`, flexWrap: 'wrap' }}>
            <Stat label="Ready" value={readyRows.length} color={DS.success} />
            <Stat label="Needs attention" value={rows.length - readyRows.length} color={DS.warning} />
            <Stat label="Under-13 (consent)" value={under13} color={DS.info} />
            <Stat label="Seats remaining" value={remaining} color={overSeats ? DS.danger : DS.muted} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                {['#', 'Student', 'Year', 'Username', 'Sign-in email', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em', background: DS.surface }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.n} style={{ borderBottom: `1px solid ${DS.border}` }}>
                    <td style={{ padding: '9px 14px', color: DS.faint }}>{r.n}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: DS.text }}>{(r.data.first_name + ' ' + r.data.last_name).trim() || <span style={{ color: DS.faint }}>—</span>}</span>
                        {r.underThirteen && <Badge variant="info">Under 13</Badge>}
                      </div>
                      {r.issues.length > 0 && <div style={{ fontSize: 11, color: DS.warning, marginTop: 3 }}>{r.issues.join(' · ')}</div>}
                    </td>
                    <td style={{ padding: '9px 14px', color: DS.sub }}>{r.data.year_group || '—'}</td>
                    <td style={{ padding: '9px 14px' }}>{r.username ? <Mono color={DS.text}>{r.username}</Mono> : '—'}</td>
                    <td style={{ padding: '9px 14px' }}>{r.syntheticEmail ? <Mono>{r.syntheticEmail}</Mono> : '—'}</td>
                    <td style={{ padding: '9px 14px' }}><RowStatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
            <div style={{ fontSize: 12.5, color: overSeats ? DS.danger : DS.muted }}>
              {overSeats ? `Import exceeds your ${remaining} remaining seats.` : `${readyRows.length} account${readyRows.length === 1 ? '' : 's'} will be created at “pending”. Rows needing attention are skipped.`}
            </div>
            <Btn variant="primary" icon="check" onClick={confirmImport} style={readyRows.length && !overSeats ? {} : { opacity: 0.5, pointerEvents: 'none' }}>
              Create {readyRows.length} account{readyRows.length === 1 ? '' : 's'}
            </Btn>
          </div>
        </Card>
      )}

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <Btn variant="ghost" icon="user" onClick={() => adminNav('students_provision')}>Or add a single student →</Btn>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: color || DS.text, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 3 }}>{label}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  3b · Add a single student  (route: admin/students_provision) — trickle enrolment
// ═══════════════════════════════════════════════════════════════════════════════
const AddSingleStudentPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const [touched, setTouched] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: '', lastName: '', year: '', dob: '', studentEmail: '',
    guardianName: '', guardianEmail: '', guardianPhone: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const taken = React.useMemo(() => new Set(store.students.map(s => acct(s).username).filter(Boolean)), [store.students]);
  const preview = React.useMemo(() => {
    if (!form.firstName.trim() || !form.lastName.trim()) return null;
    const u = genUsername(form.firstName, form.lastName, new Set(taken));
    return { username: u, email: synthEmail(u), under13: isUnderThirteen({ dob: form.dob, year: form.year }) };
  }, [form.firstName, form.lastName, form.dob, form.year, taken]);

  // Pooled student seats — account-level remaining across all centres (§5).
  const _seat = pooledSeats(onb).students;
  const remaining = Math.max(0, _seat.cap - _seat.used);
  const errs = {
    firstName: !form.firstName.trim() ? 'Required' : '',
    lastName: !form.lastName.trim() ? 'Required' : '',
    year: !form.year ? 'Required' : '',
    studentEmail: form.studentEmail && !isEmail(form.studentEmail) ? 'Invalid email' : '',
    guardianEmail: form.guardianEmail && !isEmail(form.guardianEmail) ? 'Invalid email'
      : (preview && preview.under13 && !form.guardianEmail.trim()) ? 'Parent email required for under-13' : '',
  };
  const valid = !Object.values(errs).some(Boolean) && remaining > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const row = {
      data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), year_group: form.year, date_of_birth: form.dob },
      username: preview.username, syntheticEmail: preview.email, underThirteen: preview.under13,
    };
    const ids = store.addStudents([{
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      year: form.year, dob: dobToIso(form.dob), email: form.studentEmail.trim(), phone: '', address: '',
      guardianName: form.guardianName.trim(), guardianRelation: 'Parent',
      guardianEmail: form.guardianEmail.trim(), guardianPhone: form.guardianPhone.trim(),
      subjects: [], classIds: [], notes: form.notes.trim(),
      attendance: 0, hw: 0, score: 0, status: 'active', teacher: '—', lastSeen: 'Not yet active',
      centreId: onb.centreId,
      account: buildStudentAccount(row, 'single'),
    }]);
    onb.finishProvision(ids);
    adminNav('claim_slips');
  };

  return (
    <div style={{ padding: '32px', maxWidth: 820, margin: '0 auto' }}>
      <FlowHeader title="Add a student" subtitle="Creates one student account, ready to claim. This signs them up at the centre — assign classes separately." onBack={() => adminNav('students_import')} />

      <Card>
        <div style={{ padding: '24px 26px' }}>
          <FlowSection icon="user" title="Student details" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <Field label="First name" required error={touched && errs.firstName}><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} invalid={touched && !!errs.firstName} placeholder="First name" /></Field>
            <Field label="Last name" required error={touched && errs.lastName}><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} invalid={touched && !!errs.lastName} placeholder="Last name" /></Field>
            <Field label="Year group" required error={touched && errs.year}>
              <Select value={form.year} onChange={e => set('year', e.target.value)} invalid={touched && !!errs.year}>
                <option value="">Select year…</option>
                {YEAR_GROUPS.map(y => <option key={y}>{y}</option>)}
              </Select>
            </Field>
            <Field label="Date of birth" hint="Used to flag under-13 for consent"><Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} icon="calendar" /></Field>
            <Field label="Student email" hint="Only if they already have one" error={touched && errs.studentEmail} style={{ gridColumn: '1 / -1' }}>
              <Input type="email" value={form.studentEmail} onChange={e => set('studentEmail', e.target.value)} invalid={touched && !!errs.studentEmail} icon="mail" placeholder="student@email.com" />
            </Field>
          </div>

          <FlowSection icon="users" title="Parent / guardian" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <Field label="Parent name"><Input value={form.guardianName} onChange={e => set('guardianName', e.target.value)} icon="user" placeholder="Parent / guardian" /></Field>
            <Field label="Parent phone"><Input value={form.guardianPhone} onChange={e => set('guardianPhone', e.target.value)} icon="phone" placeholder="+44 7…" /></Field>
            <Field label="Parent email" required={preview && preview.under13} hint="Setup + recovery channel; required under-13" error={touched && errs.guardianEmail} style={{ gridColumn: '1 / -1' }}>
              <Input type="email" value={form.guardianEmail} onChange={e => set('guardianEmail', e.target.value)} invalid={touched && !!errs.guardianEmail} icon="mail" placeholder="parent@email.com" />
            </Field>
          </div>

          {/* Live generated identity preview */}
          {preview && (
            <div style={{ marginTop: 8, padding: '14px 16px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                Generated identity {preview.under13 && <Badge variant="info">Under 13 · parent completes setup</Badge>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div style={{ fontSize: 10.5, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</div><Mono color={DS.text}>{preview.username}</Mono></div>
                <div><div style={{ fontSize: 10.5, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign-in email</div><Mono>{preview.email}</Mono></div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
          <Btn variant="ghost" onClick={() => adminNav('students_import')}>Cancel</Btn>
          <Btn variant="primary" icon="check" onClick={submit} style={valid ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Create account &amp; print slip</Btn>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  4 · Claim slips  (route: admin/claim_slips) — printable, one per student
// ═══════════════════════════════════════════════════════════════════════════════
const QRPlaceholder = ({ size = 64 }) => (
  <div style={{
    width: size, height: size, borderRadius: 8, flexShrink: 0,
    border: `2px solid ${DS.text}`, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, padding: 5, background: '#fff',
  }}>
    {Array.from({ length: 25 }, (_, i) => (
      <div key={i} style={{ background: [0, 1, 2, 4, 5, 6, 8, 10, 12, 13, 16, 18, 20, 22, 24].includes(i) ? DS.text : 'transparent', borderRadius: 1 }} />
    ))}
  </div>
);

const ClaimSlipsPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const batchIds = onb.lastBatch || [];
  const slips = (batchIds.length
    ? batchIds.map(id => store.students.find(s => s.id === id)).filter(Boolean)
    : store.students.filter(s => acctStatus(s) !== 'active' && acct(s).claimCode)
  );

  const slipData = slips.map(s => ({
    id: s.id, name: studentName(s), year: s.year,
    username: acct(s).username, syntheticEmail: acct(s).syntheticEmail,
    claimCode: acct(s).claimCode, underThirteen: acct(s).underThirteen,
  }));

  return (
    <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>
      <FlowHeader title="Claim slips" subtitle="Hand these to students (or parents for under-13s) to set up sign-in." onBack={() => adminNav('people')} />

      {slipData.length === 0 ? (
        <Card><EmptyState icon="print" title="No slips to print" message="Import or add students to generate claim slips." action={<Btn variant="primary" icon="upload" onClick={() => adminNav('students_import')}>Import students</Btn>} /></Card>
      ) : (<>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: DS.muted }}>{slipData.length} slip{slipData.length === 1 ? '' : 's'} · {onb.centre.name}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" icon="users" onClick={() => adminNav('people')}>People &amp; invites</Btn>
            <Btn variant="primary" icon="print" onClick={() => printSlips(onb.centre.name, slipData)}>Print all</Btn>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {slipData.map(s => (
            <div key={s.id} style={{ background: DS.card, border: `1.5px dashed ${DS.borderDark}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: DS.accent, color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: DS.text }}>{onb.centre.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim slip</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: DS.text }}>{s.name}</div>
              <div style={{ fontSize: 12, color: DS.muted, marginBottom: 14 }}>{s.year}{s.underThirteen && ' · Parent/guardian completes setup'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div><div style={{ fontSize: 10, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</div><Mono color={DS.text}>{s.username}</Mono></div>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 10, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign-in email</div><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mono size={11}>{s.syntheticEmail}</Mono></div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${DS.border}`, paddingTop: 14 }}>
                <QRPlaceholder />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>One-time claim code</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: '2px', color: DS.text }}>{s.claimCode}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <Btn variant="ghost" small icon="copy" onClick={() => { try { navigator.clipboard.writeText(s.claimCode); } catch (e) {} }}>Copy</Btn>
                    <Btn variant="ghost" small icon="eye" onClick={() => window.__openClaim(s.claimCode)}>Preview claim</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  5 · Class roster — staff-only enrolment  (route: admin/class_roster)
// ═══════════════════════════════════════════════════════════════════════════════
const ClassRosterPage = () => {
  const store = useAdminStore();
  const [classId, setClassId] = React.useState(() => adminParam() || (store.classes[0] && store.classes[0].id) || '');
  const [search, setSearch] = React.useState('');
  const [picked, setPicked] = React.useState([]);

  const cls = store.classes.find(c => c.id === classId);
  const roster = store.students.filter(s => (s.classIds || []).includes(classId));
  const available = store.students.filter(s => !(s.classIds || []).includes(classId));
  const q = search.toLowerCase();
  const filteredAvail = available.filter(s => studentName(s).toLowerCase().includes(q) || (s.year || '').toLowerCase().includes(q) || (acct(s).username || '').toLowerCase().includes(q));

  const toggle = id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const addToClass = () => { if (picked.length) { store.enrolStudentsInClass(classId, picked); setPicked([]); } };
  const full = cls ? roster.length >= cls.capacity : false;

  return (
    <div style={{ padding: '32px', maxWidth: 980, margin: '0 auto' }}>
      <FlowHeader title="Manage class roster" subtitle="Enrol already signed-up students into a class. Students can't enrol themselves." onBack={() => adminNav('classes')} />

      <Card style={{ marginBottom: 18 }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 280, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: DS.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class</div>
            <Select value={classId} onChange={e => { setClassId(e.target.value); setPicked([]); }}>
              {store.classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.group}</option>)}
            </Select>
          </div>
          {cls && (
            <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
              <div><div style={{ fontSize: 11, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher</div><div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{cls.teacher}</div></div>
              <div><div style={{ fontSize: 11, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</div><div style={{ fontSize: 13.5, fontWeight: 600, color: full ? DS.danger : DS.text }}>{roster.length} / {cls.capacity}</div></div>
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Current roster */}
        <Card title={`Current roster · ${roster.length}`} icon="users" accent={DS.accent}>
          {roster.length === 0
            ? <EmptyState icon="users" title="No students yet" message="Add signed-up students from the picker." />
            : <div style={{ padding: '6px 0' }}>
                {roster.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: i < roster.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                    <Avatar name={studentName(s)} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{studentName(s)}</div>
                      <div style={{ fontSize: 11.5, color: DS.muted }}>{s.year} · <Mono size={11}>{acct(s).username || s.email || '—'}</Mono></div>
                    </div>
                    <button onClick={() => store.removeFromClass(classId, s.id)} title="Remove from class" style={onbIconBtn}><Icon name="x" size={14} color={DS.faint} /></button>
                  </div>
                ))}
              </div>}
        </Card>

        {/* Picker */}
        <Card title="Add students" icon="plus" accent={DS.success}
          actions={picked.length ? [<Btn key="add" variant="primary" small icon="check" onClick={addToClass}>Add {picked.length}</Btn>] : []}>
          <div style={{ padding: '14px 18px 8px' }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search signed-up students…" />
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', padding: '0 18px 12px' }}>
            {filteredAvail.length === 0
              ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: DS.muted }}>No students to add.</div>
              : filteredAvail.map(s => {
                  const on = picked.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggle(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                      padding: '9px 10px', borderRadius: 9, marginTop: 4, cursor: 'pointer',
                      border: `1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg,
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? DS.accent : DS.borderDark}`, background: on ? DS.accent : 'transparent' }}>
                        {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <Avatar name={studentName(s)} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{studentName(s)}</div>
                        <div style={{ fontSize: 11.5, color: DS.muted }}>{s.year} · <AccountStatusBadge status={acctStatus(s)} /></div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  6 · People & invites tracker  (route: admin/people)
// ═══════════════════════════════════════════════════════════════════════════════
const ManagePersonModal = ({ open, onClose, teacher, store, subjects }) => {
  const [emp, setEmp] = React.useState('');
  const [subs, setSubs] = React.useState([]);
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    if (teacher) {
      setEmp(acct(teacher).employmentType || 'Full-time');
      setSubs(Array.isArray(teacher.subjects) ? teacher.subjects : (teacher.subject ? teacher.subject.split('/').map(s => s.trim()).filter(Boolean) : []));
      setNotes(acct(teacher).internalNotes || '');
    }
  }, [teacher]);
  if (!teacher) return null;
  const toggle = name => setSubs(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);
  const save = () => {
    store.updateTeacher(teacher.id, {
      subjects: subs, subject: subs.join(' / '),
      account: { ...acct(teacher), employmentType: emp, internalNotes: notes },
    });
    onClose();
  };
  const Labelled = ({ label, value }) => (
    <div><div style={{ fontSize: 10.5, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div><div style={{ fontSize: 13, color: DS.text, marginTop: 2 }}>{value || '—'}</div></div>
  );
  return (
    <Modal open={open} onClose={onClose} title={`Manage ${teacher.name}`} subtitle="Teacher-provided details are read-only; admin-managed fields are editable." icon="user" width={560}
      footer={<><Btn variant="ghost" small onClick={onClose}>Cancel</Btn><Btn variant="primary" small icon="check" onClick={save}>Save changes</Btn></>}>
      <div style={{ padding: '4px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Teacher-provided</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10, marginBottom: 20 }}>
          <Labelled label="Name" value={teacher.name} />
          <Labelled label="Email (identity)" value={teacher.email} />
          <Labelled label="Phone" value={teacher.phone} />
          <Labelled label="Account status" value={<AccountStatusBadge status={acctStatus(teacher)} />} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Admin-managed</div>
        <Field label="Employment type"><Select value={emp} onChange={e => setEmp(e.target.value)}>{EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Subjects taught">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {subjects.map(name => {
              const on = subs.includes(name);
              return (
                <button key={name} onClick={() => toggle(name)} style={{
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
                  border: `1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.accent : DS.sub,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>{on && <Icon name="check" size={12} color={DS.accent} strokeWidth={2.5} />}{name}</button>
              );
            })}
          </div>
        </Field>
        <Field label="Internal notes" hint="Only visible to admins"><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. covering Year 11 on Fridays…" /></Field>
      </div>
    </Modal>
  );
};

const PeopleInvitesPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const [roleTab, setRoleTab] = React.useState('teachers');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState([]);
  const [manage, setManage] = React.useState(null);
  const [revoke, setRevoke] = React.useState(null);
  const [toast, setToast] = React.useState('');

  const flash = msg => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  // Pooled seats — account-level totals summed across all centres (§5), not the
  // current centre's local usage.
  const seat = pooledSeats(onb);
  const teacherSeats = seat.teachers.cap, studentSeats = seat.students.cap;
  const teachersUsed = seat.teachers.used, studentsUsed = seat.students.used;
  const outstanding = [...store.teachers, ...store.students].filter(p => acctStatus(p) === 'invited').length;
  const notSetUp = [...store.teachers, ...store.students].filter(p => acctStatus(p) !== 'active').length;

  const people = (roleTab === 'teachers' ? store.teachers : store.students).map(p => ({ rec: p, role: roleTab === 'teachers' ? 'teacher' : 'student' }));
  const q = search.toLowerCase();
  const filtered = people.filter(({ rec }) => {
    const st = acctStatus(rec);
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    const idy = roleTab === 'teachers' ? (rec.email || '') : (acct(rec).username || rec.email || '');
    return (studentName(rec) || '').toLowerCase().includes(q) || idy.toLowerCase().includes(q);
  });

  const pendingStudentIds = filtered.filter(({ rec }) => roleTab === 'students' && acctStatus(rec) !== 'active').map(({ rec }) => rec.id);
  const allSelected = pendingStudentIds.length > 0 && pendingStudentIds.every(id => selected.includes(id));
  const toggleSel = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(allSelected ? [] : pendingStudentIds);

  const doResend = rec => { (roleTab === 'teachers' ? store.updateTeacher : store.updateStudent)(rec.id, { account: { ...acct(rec), invitedOn: onbTodayIso() } }); flash('Invite re-sent'); };
  const doCopy = rec => { try { navigator.clipboard.writeText(claimUrl(rec)); } catch (e) {} flash('Invite link copied'); };
  const doRevoke = () => { if (!revoke) return; (revoke.role === 'teacher' ? store.removeTeacher : store.removeStudent)(revoke.rec.id); setSelected(s => s.filter(x => x !== revoke.rec.id)); setRevoke(null); flash('Invite revoked — seat freed'); };
  const reprint = ids => { onb.setLastBatch(ids); adminNav('claim_slips'); };

  const statusOpts = [{ id: 'all', label: 'All' }, { id: 'invited', label: 'Invited' }, { id: 'pending', label: 'Pending' }, { id: 'active', label: 'Active' }];

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader title="People & invites" subtitle="Track and chase the whole onboarding pipeline at a glance."
        actions={[<Btn key="t" variant="secondary" small icon="user" onClick={() => adminNav('invite_teachers')}>Invite teachers</Btn>,
          <Btn key="s" variant="primary" small icon="upload" onClick={() => adminNav('students_import')}>Add students</Btn>]} />

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <SeatMeter label="Teacher seats" used={teachersUsed} total={teacherSeats} icon="user" accent="#0891B2" hint="Pooled across all centres" />
        <SeatMeter label="Student seats" used={studentsUsed} total={studentSeats} icon="users" accent={DS.accent} hint="Pooled across all centres" />
        <KPICard label="Outstanding invites" value={outstanding} sub="link sent, not done" icon="send" iconBg={DS.infoBg} accent={DS.info} />
        <KPICard label="Not yet set up" value={notSetUp} sub="awaiting credential" icon="alert" iconBg={DS.warningBg} accent={DS.warning} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Segmented value={roleTab} onChange={v => { setRoleTab(v); setSelected([]); }} options={[{ id: 'teachers', label: 'Teachers', count: store.teachers.length }, { id: 'students', label: 'Students', count: store.students.length }]} />
        <Segmented value={statusFilter} onChange={setStatusFilter} options={statusOpts} />
        <div style={{ flex: 1, minWidth: 180 }}><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or username…" /></div>
      </div>

      {/* Bulk bar (students) */}
      {roleTab === 'students' && selected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', marginBottom: 14, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: DS.accent }}>{selected.length} selected</span>
          <Btn variant="secondary" small icon="print" onClick={() => reprint(selected)}>Reprint slips</Btn>
          <Btn variant="secondary" small icon="send" onClick={() => { selected.forEach(id => { const r = store.students.find(s => s.id === id); if (r) store.updateStudent(id, { account: { ...acct(r), invitedOn: onbTodayIso() } }); }); flash('Invites re-sent'); }}>Resend</Btn>
          <button onClick={() => setSelected([])} style={{ ...onbIconBtn, marginLeft: 'auto' }}><Icon name="x" size={15} color={DS.muted} /></button>
        </div>
      )}

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="users" title="Nobody here yet" message="Invite teachers or add students to populate the pipeline." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `1px solid ${DS.border}` }}>
              {[
                roleTab === 'students' ? <th key="chk" style={{ width: 40, padding: '10px 0 10px 16px', background: DS.surface }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pendingStudentIds.length === 0} style={{ accentColor: DS.accent, width: 15, height: 15 }} />
                </th> : null,
                ...['Name', 'Identity', 'Status', 'Timeline', 'Setup method', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: DS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: DS.surface }}>{h}</th>
                )),
              ]}
            </tr></thead>
            <tbody>
              {filtered.map(({ rec, role }) => {
                const st = acctStatus(rec);
                const a = acct(rec);
                const isPendingStudent = role === 'student' && st !== 'active';
                const named = (studentName(rec) || '').trim();
                return (
                  <tr key={rec.id} style={{ borderBottom: `1px solid ${DS.border}` }}>
                    {roleTab === 'students' && (
                      <td style={{ padding: '11px 0 11px 16px' }}>
                        <input type="checkbox" checked={selected.includes(rec.id)} onChange={() => toggleSel(rec.id)} disabled={!isPendingStudent} style={{ accentColor: DS.accent, width: 15, height: 15, opacity: isPendingStudent ? 1 : 0.3 }} />
                      </td>
                    )}
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{named || <span style={{ color: DS.faint, fontStyle: 'italic' }}>{rec.email}</span>}</div>
                          <div style={{ fontSize: 11.5, color: DS.faint }}>{role === 'teacher' ? (Array.isArray(rec.subjects) ? rec.subjects.join(', ') : rec.subject) || 'Teacher' : rec.year}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {role === 'teacher'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: DS.sub }}><Icon name="mail" size={12} color={DS.faint} />{rec.email}</span>
                        : <Mono>{a.username || rec.email || '—'}</Mono>}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <AccountStatusBadge status={st} />
                      {role === 'student' && a.underThirteen && <div style={{ marginTop: 4 }}><Badge variant="info">Under 13{a.consentRecorded ? ' · consent ✓' : ''}</Badge></div>}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: DS.muted }}>
                      {a.invitedOn || a.provisionedOn ? <div>{st === 'invited' ? 'Invited' : 'Created'} {fmtDate(a.invitedOn || a.provisionedOn)}</div> : null}
                      {a.activatedOn || a.claimedOn ? <div style={{ color: DS.success }}>Active {fmtDate(a.activatedOn || a.claimedOn)}</div> : (st !== 'active' ? <div style={{ color: DS.faint }}>Not yet active</div> : null)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: DS.sub }}>{SETUP_LABEL[a.setupMethod] || '—'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        {st !== 'active' && <button title="Copy invite link" onClick={() => doCopy(rec)} style={onbIconBtn}><Icon name="link" size={15} color={DS.muted} /></button>}
                        {st !== 'active' && <button title="Resend invite" onClick={() => doResend(rec)} style={onbIconBtn}><Icon name="send" size={15} color={DS.muted} /></button>}
                        {role === 'student' && a.claimCode && <button title="Reprint claim slip" onClick={() => reprint([rec.id])} style={onbIconBtn}><Icon name="print" size={15} color={DS.muted} /></button>}
                        {role === 'teacher' && <button title="Manage" onClick={() => setManage(rec)} style={onbIconBtn}><Icon name="settings" size={15} color={DS.muted} /></button>}
                        {st !== 'active' && <button title="Revoke invite (frees seat)" onClick={() => setRevoke({ rec, role })} style={onbIconBtn}><Icon name="trash" size={15} color={DS.danger} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ManagePersonModal open={!!manage} onClose={() => setManage(null)} teacher={manage} store={store} subjects={store.subjects.map(s => s.name)} />

      <Modal open={!!revoke} onClose={() => setRevoke(null)} title="Revoke invite?" icon="alert" iconColor={DS.danger} width={440}
        footer={<><Btn variant="ghost" small onClick={() => setRevoke(null)}>Cancel</Btn><Btn variant="danger" small icon="trash" onClick={doRevoke}>Revoke</Btn></>}>
        <p style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, margin: 0 }}>
          This cancels {revoke ? <b>{studentName(revoke.rec) || revoke.rec.email}</b> : ''}’s pending invite and frees their seat. The claim link will stop working.
        </p>
      </Modal>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: DS.text, color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: DS.cardShadowHi, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="check" size={15} color="#6EE7B7" />{toast}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  4b · Account setup (claim) — public page reached via an invite/claim link
// ═══════════════════════════════════════════════════════════════════════════════
const SetupShell = ({ icon = 'graduation', accent = DS.accent, title, subtitle, children, footer, badge }) => (
  <div style={{ minHeight: '100vh', background: DS.surface, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '52px 20px' }}>
    <div style={{ width: '100%', maxWidth: 460 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 22 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>K</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>Klayo</span>
      </div>
      <div style={{ background: DS.card, border: `1px solid ${DS.cardBorder}`, boxShadow: DS.cardShadowHi, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '24px 26px 18px', borderBottom: `1px solid ${DS.border}`, background: `linear-gradient(180deg, ${accent}0C, transparent)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={21} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {badge}
              <div style={{ fontSize: 18, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
        </div>
        <div style={{ padding: '22px 26px' }}>{children}</div>
        {footer && <div style={{ padding: '16px 26px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>{footer}</div>}
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: DS.faint }}>Secured by Klayo · UK DPA 2018 compliant</div>
    </div>
  </div>
);

// Sign-in method chooser used by the student claim flows.
const SignInMethodPicker = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {options.map(o => {
      const on = value === o.id;
      return (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
          padding: '13px 14px', borderRadius: 11, width: '100%',
          border: `1.5px solid ${on ? DS.accent : DS.border}`, background: on ? DS.accentLight : DS.bg,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? DS.accent : DS.surface, color: on ? '#fff' : DS.muted }}>
            <Icon name={o.icon} size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{o.label}</div>
            <div style={{ fontSize: 12, color: DS.muted }}>{o.desc}</div>
          </div>
          <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${on ? DS.accent : DS.borderDark}`, background: on ? DS.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {on && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
          </div>
        </button>
      );
    })}
  </div>
);

const ClaimDone = ({ accent, name, method, role, onExit }) => (
  <SetupShell icon="check" accent={DS.success} title="You're all set!" subtitle={`${name} can now sign in.`}
    footer={<Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} icon="chevron_r"
      onClick={() => { if (role === 'teacher') window.__navigate('teacher', 'dashboard'); else if (role === 'student') window.__navigate('student', 'dashboard'); else onExit(); }}>
      {role === 'teacher' ? 'Go to your dashboard' : role === 'student' ? 'Go to the student app' : 'Continue'}
    </Btn>}>
    <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: DS.successBg, border: `1px solid ${DS.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon name="check" size={28} color={DS.success} strokeWidth={2.5} />
      </div>
      <div style={{ fontSize: 14, color: DS.sub, lineHeight: 1.6 }}>
        Sign-in method set to <b>{SETUP_LABEL[method] || method}</b>. {role === 'student' ? 'No email inbox needed for day-to-day sign in.' : 'Your account is active across this centre.'}
      </div>
    </div>
  </SetupShell>
);

// Teacher self-setup (name / password / phone — password never stored).
const TeacherClaim = ({ rec, store, onb, onExit }) => {
  const [name, setName] = React.useState(rec.name && !rec.name.includes('@') ? rec.name : '');
  const [phone, setPhone] = React.useState(rec.phone || '');
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const errs = {
    name: !name.trim() ? 'Enter your full name' : '',
    pw: pw.length < 8 ? 'Use at least 8 characters' : '',
    pw2: pw2 !== pw ? 'Passwords do not match' : '',
  };
  const valid = !Object.values(errs).some(Boolean);
  const finish = () => {
    setTouched(true); if (!valid) return;
    store.updateTeacher(rec.id, {
      name: name.trim(), phone: phone.trim(), status: 'active',
      account: { ...acct(rec), status: 'active', setupMethod: 'self-set', activatedOn: onbTodayIso() },
    });
    onb.finishInvites([{ email: rec.email, role: 'teacher' }]);
    setDone(true);
  };
  if (done) return <ClaimDone name={name.trim()} method="self-set" role="teacher" onExit={onExit} />;

  return (
    <SetupShell icon="user" accent="#0891B2" title="Set up your teacher account"
      subtitle={`You've been invited to ${onb.centre.name}`}
      badge={<div style={{ marginBottom: 4 }}><Badge variant="info">Teacher invite</Badge></div>}
      footer={<Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} icon="check" onClick={finish}>Activate account</Btn>}>
      <div style={{ marginBottom: 16, padding: '10px 12px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9, fontSize: 12.5, color: DS.muted }}>
        Signing in as <b style={{ color: DS.sub }}>{rec.email}</b>
      </div>
      <Field label="Full name" required error={touched && errs.name}><Input value={name} onChange={e => setName(e.target.value)} invalid={touched && !!errs.name} placeholder="e.g. Jordan Avery" /></Field>
      <Field label="Phone" hint="Optional"><Input value={phone} onChange={e => setPhone(e.target.value)} icon="phone" placeholder="+44 7…" /></Field>
      <Field label="Create a password" required error={touched && errs.pw}><Input type="password" value={pw} onChange={e => setPw(e.target.value)} invalid={touched && !!errs.pw} placeholder="At least 8 characters" /></Field>
      <Field label="Confirm password" required error={touched && errs.pw2}><Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} invalid={touched && !!errs.pw2} placeholder="Re-enter password" /></Field>
      <div style={{ fontSize: 11, color: DS.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={12} />This is a prototype — no password is stored, only that you chose self-setup.</div>
    </SetupShell>
  );
};

// Student 13+ self-setup — choose password / PIN / QR.
const StudentClaim = ({ rec, store, onExit }) => {
  const [method, setMethod] = React.useState('pin');
  const [pw, setPw] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const a = acct(rec);

  const err = method === 'password' ? (pw.length < 8 ? 'Use at least 8 characters' : '')
    : method === 'pin' ? (!/^\d{6}$/.test(pin) ? 'Enter a 6-digit PIN' : '') : '';
  const valid = !err;
  const finish = () => {
    setTouched(true); if (!valid) return;
    store.updateStudent(rec.id, { account: { ...a, status: 'active', setupMethod: method, claimedOn: onbTodayIso() } });
    setDone(true);
  };
  if (done) return <ClaimDone name={studentName(rec)} method={method} role="student" onExit={onExit} />;

  return (
    <SetupShell icon="graduation" title={`Hi ${rec.firstName || 'there'} 👋`} subtitle="Choose how you'll sign in each day"
      badge={<div style={{ marginBottom: 4 }}><Badge variant="success">Student setup</Badge></div>}
      footer={<Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} icon="check" onClick={finish}>Finish setup</Btn>}>
      <div style={{ marginBottom: 16, padding: '10px 12px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9, fontSize: 12.5, color: DS.muted }}>
        Username <Mono color={DS.sub}>{a.username}</Mono>
      </div>
      <SignInMethodPicker value={method} onChange={setMethod} options={[
        { id: 'pin', icon: 'pin', label: 'PIN', desc: 'A quick 4-digit code' },
        { id: 'password', icon: 'settings', label: 'Password', desc: 'A password you remember' },
        { id: 'qr', icon: 'grid', label: 'QR / tap your name', desc: 'Scan or tap at the centre' },
      ]} />
      {method === 'password' && <div style={{ marginTop: 14 }}><Field label="Create a password" required error={touched && err}><Input type="password" value={pw} onChange={e => setPw(e.target.value)} invalid={touched && !!err} placeholder="At least 8 characters" /></Field></div>}
      {method === 'pin' && <div style={{ marginTop: 14 }}><Field label="Choose a 6-digit PIN" required error={touched && err}><Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} invalid={touched && !!err} placeholder="••••••" style={{ letterSpacing: '8px', fontFamily: "'JetBrains Mono', monospace" }} /></Field></div>}
      {method === 'qr' && <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10 }}><QRPlaceholder /><div style={{ fontSize: 12.5, color: DS.muted }}>At the centre, scan this code or tap your name to sign in — no password needed.</div></div>}
    </SetupShell>
  );
};

// Under-13 — parent records consent once, then sets the child's daily sign-in.
const ParentClaim = ({ rec, store, onExit }) => {
  const [stage, setStage] = React.useState(0); // 0 consent · 1 method
  const [consent, setConsent] = React.useState(false);
  const [method, setMethod] = React.useState('pin');
  const [pin, setPin] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const a = acct(rec);

  const pinErr = method === 'pin' && !/^\d{6}$/.test(pin) ? 'Enter a 6-digit PIN' : '';
  const finish = () => {
    setTouched(true); if (pinErr) return;
    store.updateStudent(rec.id, { account: { ...a, status: 'active', setupMethod: method, consentRecorded: true, claimedOn: onbTodayIso() } });
    setDone(true);
  };
  if (done) return <ClaimDone name={studentName(rec)} method={method} role="student" onExit={onExit} />;

  return (
    <SetupShell icon="users" accent="#7C3AED" title="Set up your child's account" subtitle={`${studentName(rec)} · ${rec.year} · ${ONB_CENTRE.name}`}
      badge={<div style={{ marginBottom: 4 }}><Badge variant="warning">Parent / guardian · under 13</Badge></div>}
      footer={stage === 0
        ? <Btn variant="primary" style={{ width: '100%', justifyContent: 'center', ...(consent ? {} : { opacity: 0.5, pointerEvents: 'none' }) }} icon="chevron_r" onClick={() => setStage(1)}>Continue</Btn>
        : <Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} icon="check" onClick={finish}>Finish setup</Btn>}>
      {stage === 0 ? (<>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6, marginBottom: 16 }}>
          Because {rec.firstName} is under 13, a parent or guardian completes setup and records consent once (UK DPA 2018). You won't be asked again — this email is only used to set up or recover the account on a new device.
        </div>
        <div style={{ marginBottom: 16, padding: '10px 12px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9, fontSize: 12.5, color: DS.muted }}>
          Setup link sent to <b style={{ color: DS.sub }}>{rec.guardianEmail || 'the parent email on file'}</b>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '13px 14px', background: consent ? DS.accentLight : DS.bg, border: `1.5px solid ${consent ? DS.accentBorder : DS.border}`, borderRadius: 10 }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ accentColor: DS.accent, width: 16, height: 16, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: DS.sub, lineHeight: 1.5 }}>I confirm I'm {rec.firstName}'s parent or guardian and I consent to {ONB_CENTRE.name} creating this account under the UK Data Protection Act 2018.</span>
        </label>
      </>) : (<>
        <div style={{ fontSize: 13, color: DS.muted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={14} color={DS.success} />Consent recorded. Now choose how {rec.firstName} signs in day-to-day.</div>
        <SignInMethodPicker value={method} onChange={setMethod} options={[
          { id: 'pin', icon: 'pin', label: 'PIN on a trusted device', desc: 'A 6-digit code they enter' },
          { id: 'qr', icon: 'grid', label: 'QR / tap their name', desc: 'Tap or scan at the centre' },
        ]} />
        {method === 'pin' && <div style={{ marginTop: 14 }}><Field label="Set a 6-digit PIN" required error={touched && pinErr}><Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} invalid={touched && !!pinErr} placeholder="••••••" style={{ letterSpacing: '8px', fontFamily: "'JetBrains Mono', monospace" }} /></Field></div>}
        {method === 'qr' && <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 10 }}><QRPlaceholder /><div style={{ fontSize: 12.5, color: DS.muted }}>{rec.firstName} taps their name or scans this at the centre — no inbox, no daily password.</div></div>}
      </>)}
    </SetupShell>
  );
};

// Router for the public claim link. `identifier` is the mock token / claim code.
const ClaimPage = ({ identifier, onExit }) => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  const id = (identifier || '').trim();

  const teacher = store.teachers.find(t => acct(t).inviteToken && acct(t).inviteToken === id);
  const student = store.students.find(s => (acct(s).claimCode && acct(s).claimCode === id) || (acct(s).inviteToken && acct(s).inviteToken === id));

  if (!teacher && !student) {
    return (
      <SetupShell icon="alert" accent={DS.danger} title="Link not found" subtitle="This claim link is invalid or has been revoked."
        footer={<Btn variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onExit}>Back to Klayo</Btn>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>Ask your centre admin to resend your invite, or check you opened the most recent link.</div>
      </SetupShell>
    );
  }
  const rec = teacher || student;
  if (acctStatus(rec) === 'active') {
    return (
      <SetupShell icon="check" accent={DS.success} title="Already set up" subtitle={`${studentName(rec)}'s account is active.`}
        footer={<Btn variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onExit}>Continue to sign in</Btn>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>This account has already been claimed. If that wasn't you, contact your centre admin.</div>
      </SetupShell>
    );
  }
  if (teacher) return <TeacherClaim rec={teacher} store={store} onb={onb} onExit={onExit} />;
  if (acct(student).underThirteen) return <ParentClaim rec={student} store={store} onExit={onExit} />;
  return <StudentClaim rec={student} store={store} onExit={onExit} />;
};

// ─── Export ────────────────────────────────────────────────────────────────────
Object.assign(window, {
  useOnboardingStore,
  CentreSetupPage, InviteTeachersPage, BulkImportPage, AddSingleStudentPage,
  ClaimSlipsPage, ClassRosterPage, PeopleInvitesPage, ClaimPage,
  // helpers other modules may want
  acct, acctStatus, genUsername, synthEmail, isUnderThirteen, parseStudentCsv,
  // shared auth chrome reused by the public Login / Signup pages (Auth.jsx)
  SetupShell, SignInMethodPicker, AccountStatusBadge, Mono, CopyField, CopyChip,
  QRPlaceholder, isEmail, emailToName, RAND, genToken, onbTodayIso, SETUP_LABEL,
});
