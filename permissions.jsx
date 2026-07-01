// ══════════════════════════════════════════════════════════════
//  TutorOS — Centralised role & permission helpers
//
//  The single place that answers "what roles does this staff identity hold?"
//  and "is this person allowed to do X?". Route ALL role/permission checks
//  through here — no inline `role === 'admin'` comparisons scattered through
//  components (mirrors the comms permission matrix in Communications.jsx, but
//  account/centre-wide).
//
//  Frontend-only, no backend. The role-grant store is ONB_MEMBERSHIPS (flat
//  { email, centreId, role } rows; a person holds >1 role via >1 row). Account
//  ownership lives on the subscription (ONB_SUBSCRIPTION.ownerUserId) and is
//  DERIVED here — there is no isOwner flag on any person.
//
//  Identity key: email. Adults are one global account keyed by email, so a
//  "userId" is just the lower-cased email in this prototype (userIdOf).
//
//  Loaded after the mocks (needs ONB_* globals at call time) and before the
//  page modules that consume it (see index.html).
// ══════════════════════════════════════════════════════════════
(() => {

// Assignable staff roles. student + parent are provisioned identities (claim
// slips / guardian consent) and are deliberately NOT toggleable as staff roles.
const STAFF_ROLES = ['admin', 'teacher'];

// Presentational role metadata — reuses the existing Badge variants + the role
// colours already used across the app (admin = brand accent, teacher = the
// teacher-view cyan from NAV_CONFIG). No new palette.
const ROLE_META = {
  admin:   { label: 'Admin',   variant: 'accent', color: () => DS.accent },
  teacher: { label: 'Teacher', variant: 'info',   color: () => '#0891B2' },
};

// Identity key for a person. Accepts a raw email string or a principal object
// ({ userId } | { email }). Lower-cased so comparisons are case-insensitive.
const userIdOf = (u) => {
  if (!u) return null;
  if (typeof u === 'string') return u.toLowerCase();
  return (u.userId || u.email || '').toLowerCase() || null;
};

// Normalise "roles" input into an array. Accepts an array, a principal object
// ({ roles } | back-compat { role }), or a single role string — so callers can
// pass whatever they hold and existing single-`role` reads keep working.
const asRoles = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === 'string') return [x];
  if (Array.isArray(x.roles)) return x.roles;
  if (x.role) return [x.role];
  return [];
};

// Order roles canonically (admin before teacher) for stable badge display.
const sortRoles = (roles) => [...roles].sort((a, b) => {
  const ia = STAFF_ROLES.indexOf(a), ib = STAFF_ROLES.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

// ─── Roles array (the multi-role accessor) ──────────────────────────────────
// Group the flat membership rows for a centre into ONE record per identity:
//   { userId, email, centreId, roles: [...] }
// `roles` is the array the UI manages; the source rows stay single-role so every
// existing reader of `m.role` keeps working. Pass centreId = null to group across
// all centres.
const membersForCentre = (memberships, centreId) => {
  const byEmail = new Map();
  (memberships || []).forEach(m => {
    if (centreId && m.centreId !== centreId) return;
    const email = (m.email || '').toLowerCase();
    if (!email) return;
    if (!byEmail.has(email)) byEmail.set(email, { userId: email, email, centreId: m.centreId, roles: [] });
    const rec = byEmail.get(email);
    if (m.role && !rec.roles.includes(m.role)) rec.roles.push(m.role);
  });
  const out = [...byEmail.values()];
  out.forEach(r => { r.roles = sortRoles(r.roles); });
  return out;
};

// The roles a given identity holds at a centre, as an array.
const rolesFor = (memberships, email, centreId) => {
  const e = (email || '').toLowerCase();
  const rec = membersForCentre(memberships, centreId).find(m => m.email === e);
  return rec ? rec.roles : [];
};

// ─── Role predicates ────────────────────────────────────────────────────────
const hasRole   = (x, role) => asRoles(x).includes(role);
const isAdmin   = (x) => hasRole(x, 'admin');
const isTeacher = (x) => hasRole(x, 'teacher');

// ─── Account ownership (derived, never stored on a person) ───────────────────
const isAccountOwner = (user, account) => {
  const uid = userIdOf(user);
  const owner = ((account && account.ownerUserId) || '').toLowerCase();
  return !!uid && !!owner && uid === owner;
};

// Owner-only product powers, kept as DISTINCT capability seams (not a bare
// "is owner" check at the call site) so they can be delegated later without a
// refactor. For now both resolve to ownership.
const canManageBilling     = (user, account) => isAccountOwner(user, account);
const canManageCentres     = (user, account) => isAccountOwner(user, account);
const canTransferOwnership = (user, account) => isAccountOwner(user, account);

// Who may grant/revoke Admin + Teacher within a centre. Admins are flat/equal:
// any Admin of the centre may manage roles there.
//
// NOTE: to instead restrict granting the *Admin* role to the account owner only,
// change this to `isAccountOwner(user, account)` (and pass the account through) —
// the Team page already routes every grant/revoke through canManageRoles.
const canManageRoles = (user /*, account */) => isAdmin(user);

// ─── Guardrails (pure predicates → { ok, reason }) ──────────────────────────
// Every mutation the Team page performs is validated here first, so the rules
// live in one place and produce user-facing messages (never silent failures).

// How many admins a centre has (for the "≥1 admin" rule).
const adminCount = (memberships, centreId) =>
  membersForCentre(memberships, centreId).filter(m => m.roles.includes('admin')).length;

// Can `target` (a grouped member record) have `role` revoked at this centre?
const canRevokeRole = ({ memberships, centreId, account, target, role, by }) => {
  const targetIsOwner = isAccountOwner(target, account);
  if (role === 'admin') {
    // The account owner must always remain an Admin — transfer ownership first.
    if (targetIsOwner) return { ok: false, reason: 'The account owner must stay an Admin. Transfer ownership first.' };
    // A centre must always keep at least one Admin.
    if (adminCount(memberships, centreId) <= 1) return { ok: false, reason: 'This is the centre’s only Admin — promote another Admin before removing this one.' };
    // Self-revoke of your own Admin is allowed (with confirmation in the UI) only
    // if you are neither the sole admin nor the owner — both already blocked above.
  }
  if (!asRoles(target).includes(role)) return { ok: false, reason: `${target.email} doesn’t have the ${role} role here.` };
  return { ok: true };
};

const canGrantRole = ({ account, target, role, by }) => {
  if (!STAFF_ROLES.includes(role)) return { ok: false, reason: `“${role}” is not an assignable staff role.` };
  if (asRoles(target).includes(role)) return { ok: false, reason: `${target.email} is already ${role === 'admin' ? 'an Admin' : 'a Teacher'} here.` };
  return { ok: true };
};

// Is revoking `role` from `target` a self-action by `by` that needs confirmation?
const isSelfRevoke = (by, target) => userIdOf(by) && userIdOf(by) === userIdOf(target);

Object.assign(window, {
  STAFF_ROLES, ROLE_META, userIdOf, asRoles, sortRoles,
  membersForCentre, rolesFor,
  hasRole, isAdmin, isTeacher,
  isAccountOwner, canManageBilling, canManageCentres, canTransferOwnership, canManageRoles,
  adminCount, canRevokeRole, canGrantRole, isSelfRevoke,
});

})();
