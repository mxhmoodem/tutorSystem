// ══════════════════════════════════════════════════════════════
//  TutorOS — Team (Roles & access)
//
//  Admin surface to view staff and grant/revoke staff roles. Net-new
//  functionality: the Teachers page is a teaching roster (register/attendance)
//  and doesn't model admins, so role management lives in its own Staff sub-page.
//
//  Role model (see permissions.js + onboarding.mock):
//   • Roles are flat { email, centreId, role } membership rows; a person holds
//     >1 role via >1 row. `membersForCentre` groups them into a roles[] array.
//   • Account ownership lives on the subscription (ownerUserId) and is DERIVED —
//     transfer repoints that one field. The owner keeps the distinct billing +
//     centres capabilities (canManageBilling / canManageCentres).
//   • Every role/permission check routes through the permissions helpers — no
//     inline role-string comparisons here.
//
//  Loaded after Onboarding.jsx + Centres.jsx (it consumes their stores) — see
//  index.html. Exposes window.AdminTeamPage for the AdminPages router.
// ══════════════════════════════════════════════════════════════
(() => {

// Permission helpers live on window (permissions.js is an IIFE). The stores +
// design-system primitives are global script-scope consts from earlier files.
const {
  membersForCentre, rolesFor, isAccountOwner, canManageRoles, canManageBilling,
  canManageCentres, canTransferOwnership, canGrantRole, canRevokeRole, isSelfRevoke,
  isAdmin, ROLE_META, STAFF_ROLES, adminCount,
} = window;

// A single role chip — a toggle when the viewer can manage roles, otherwise a
// static badge. Active = the staff member holds the role; locked = present but
// not removable here (e.g. the owner's Admin role).
const RoleChip = ({ role, active, locked, disabled, onClick }) => {
  const meta = ROLE_META[role];
  const color = meta.color();
  if (disabled) {
    // Read-only: only render the roles the person actually holds.
    if (!active) return null;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
        borderRadius: 20, fontSize: 12, fontWeight: 600,
        border: `1px solid ${color}55`, background: color + '18', color,
      }}><Icon name="check" size={12} color={color} />{meta.label}</span>
    );
  }
  return (
    <button onClick={onClick}
      title={locked ? `${meta.label} can’t be removed here` : (active ? `Remove ${meta.label}` : `Grant ${meta.label}`)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
        borderRadius: 20, fontSize: 12, fontWeight: 600,
        cursor: locked ? 'default' : 'pointer',
        border: `1px solid ${active ? color + '55' : DS.border}`,
        background: active ? color + '18' : DS.bg,
        color: active ? color : DS.faint,
      }}>
      <Icon name={active ? (locked ? 'lock' : 'check') : 'plus'} size={12} color={active ? color : DS.faint} />
      {meta.label}
    </button>
  );
};

// One product-power row in the owner-powers card (billing / centres). Demonstrates
// the distinct capability seams: the owner gets a working "Manage" action, a
// non-owner admin sees it locked.
const PowerRow = ({ icon, title, desc, allowed, onManage, last }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${DS.border}` }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: allowed ? DS.accentLight : DS.surface, color: allowed ? DS.accent : DS.faint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{title}</div>
      <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{desc}</div>
    </div>
    {allowed
      ? <Btn variant="secondary" small onClick={onManage}>Manage</Btn>
      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: DS.faint }}><Icon name="lock" size={12} color={DS.faint} />Owner only</span>}
  </div>
);

const fmtWhen = (iso) => {
  try {
    const d = new Date(iso); const now = new Date();
    const mins = Math.round((now - d) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch (e) { return ''; }
};

const AdminTeamPage = () => {
  const onb = useOnboardingStore();          // canonical cross-centre memberships + audit log
  const sub = useSubscriptionStore();        // account: ownerUserId, centres, plan
  const adminStore = useAdminStore();        // teacher roster (contact / avatar) for the home centre
  const account = sub;                       // ownership lives on the subscription/account

  const session = window.ONB_SESSION || { email: '', name: 'You' };
  const [flash, setFlash] = React.useState(null);     // { kind:'ok'|'err', msg }
  const [confirm, setConfirm] = React.useState(null); // self-revoke confirmation
  const [transferOpen, setTransferOpen] = React.useState(false);
  const flashTimer = React.useRef(null);
  const flashMsg = (kind, msg) => { setFlash({ kind, msg }); window.clearTimeout(flashTimer.current); flashTimer.current = window.setTimeout(() => setFlash(null), 3200); };

  // ── Centre scope ──────────────────────────────────────────────────────────
  const activeCentres = (sub.centres || []).filter(c => c.status !== 'archived');
  const homeCentreId = (window.ONB_CENTRE && window.ONB_CENTRE.id) || 'bm';
  const defaultCentreId = window.__getCentre ? window.__getCentre() : homeCentreId;

  // Which centres this viewer may manage: the owner sees all; any other admin
  // sees only centres where they hold Admin.
  const ownerView = isAccountOwner({ email: session.email }, account);
  const manageableCentres = activeCentres.filter(c =>
    ownerView || rolesFor(onb.memberships, session.email, c.id).includes('admin'));
  const fallbackCentre = (manageableCentres.find(c => c.id === defaultCentreId) || manageableCentres[0] || activeCentres[0] || { id: homeCentreId, name: 'Your centre' });
  const [centreId, setCentreId] = React.useState(fallbackCentre.id);
  const centre = activeCentres.find(c => c.id === centreId) || fallbackCentre;
  // Single-centre accounts show NO account-vs-centre chrome (reads as "your centre").
  const multiCentre = activeCentres.length > 1;

  // ── Current principal + capabilities (all via helpers) ───────────────────────
  const me = { userId: session.email, email: session.email, name: session.name, roles: rolesFor(onb.memberships, session.email, centreId) };
  const iAmOwner = isAccountOwner(me, account);
  const iCanManage = canManageRoles(me);   // any Admin of this centre

  // ── Materialise implicit teacher memberships from the roster ────────────────
  // Only the home centre has a teaching roster (the admin store is single-tenant);
  // back-fill a teacher membership for each rostered teacher so roles are purely
  // membership-driven and the Teacher toggle acts on real data. Idempotent.
  const roster = centreId === homeCentreId ? adminStore.teachers : [];
  React.useEffect(() => {
    if (!roster.length) return;
    onb.ensureTeacherMemberships(centreId, roster.map(t => (t.email || '').toLowerCase()).filter(Boolean));
    // eslint-disable-next-line
  }, [centreId, roster.length]);

  const rosterByEmail = React.useMemo(() => {
    const m = {}; roster.forEach(t => { if (t.email) m[t.email.toLowerCase()] = t; }); return m;
  }, [roster]);

  // ── Staff list = grouped membership records, enriched from the roster ────────
  const members = membersForCentre(onb.memberships, centreId).map(mem => {
    const r = rosterByEmail[mem.email];
    const isMe = mem.email === (session.email || '').toLowerCase();
    const name = (r && r.name) || (isMe ? session.name : '') || window.emailToName(mem.email);
    return {
      ...mem, name, isMe,
      color: r ? r.color : null,
      phone: r ? r.phone : '',
      status: r ? r.status : 'active',
      isOwner: isAccountOwner(mem, account),
      onRoster: !!r,
    };
  }).sort((a, b) => (Number(b.isOwner) - Number(a.isOwner)) || a.name.localeCompare(b.name));

  // Account ownership is account-level, not per-centre: name the owner from the
  // account so it reads correctly on EVERY centre — including one the owner doesn't
  // staff (where they wouldn't appear in `members`). Prefer a live name; fall back
  // to the session, then the roster, then the email.
  const ownerEmail = ((account && account.ownerUserId) || '').toLowerCase();
  const ownerName = (members.find(m => m.isOwner) || {}).name
    || (ownerEmail && ownerEmail === (session.email || '').toLowerCase() ? session.name : '')
    || (ownerEmail && rosterByEmail[ownerEmail] && rosterByEmail[ownerEmail].name)
    || (ownerEmail ? window.emailToName(ownerEmail) : '—');

  const admins = members.filter(m => m.roles.includes('admin'));
  const teacherCount = members.filter(m => m.roles.includes('teacher')).length;
  const transferTargets = admins.filter(m => !m.isOwner);

  // ── Mutations (guardrails first, then persist + audit) ──────────────────────
  const doGrant = (target, role) => {
    if (!iCanManage) return flashMsg('err', 'You need Admin at this centre to manage roles.');
    const res = canGrantRole({ account, target, role, by: me });
    if (!res.ok) return flashMsg('err', res.reason);
    onb.grantRole(target.email, centreId, role, me.email);
    window.klasioAudit && window.klasioAudit('role_grant', `${target.email} → ${role}`, { centreId });
    flashMsg('ok', `${target.name} is now ${role === 'admin' ? 'an Admin' : 'a Teacher'} at ${centre.name}.`);
  };
  const reallyRevoke = (target, role) => {
    onb.revokeRole(target.email, centreId, role, me.email);
    window.klasioAudit && window.klasioAudit('role_revoke', `${target.email} ✕ ${role}`, { centreId });
    flashMsg('ok', `Removed ${ROLE_META[role].label} from ${target.name}.`);
  };
  const doRevoke = (target, role) => {
    if (!iCanManage) return flashMsg('err', 'You need Admin at this centre to manage roles.');
    const res = canRevokeRole({ memberships: onb.memberships, centreId, account, target, role, by: me });
    if (!res.ok) return flashMsg('err', res.reason);
    // Self-revoke of your own Admin needs confirmation (lockout safety). It only
    // reaches here when you're neither the sole admin nor the owner.
    if (role === 'admin' && isSelfRevoke(me, target)) return setConfirm({ target, role });
    reallyRevoke(target, role);
  };
  const toggleRole = (target, role) => target.roles.includes(role) ? doRevoke(target, role) : doGrant(target, role);

  const doTransfer = (target) => {
    if (!canTransferOwnership(me, account)) return flashMsg('err', 'Only the account owner can transfer ownership.');
    if (!isAdmin(target)) return flashMsg('err', 'The new owner must be an Admin — grant Admin first.');
    sub.setOwner(target.email);
    onb.logRoleChange({ action: 'transfer', email: target.email, centreId, by: me.email });
    window.klasioAudit && window.klasioAudit('ownership_transfer', target.email, { centreId });
    setTransferOpen(false);
    flashMsg('ok', `${target.name} is now the account owner. You remain an Admin.`);
  };

  // Audit entries relevant to the selected centre, newest first.
  const log = (onb.roleLog || []).filter(e => e.centreId === centreId).slice(0, 8);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Roles & access"
        subtitle={multiCentre ? 'Manage who can do what across your centres.' : 'Manage who can do what at your centre.'}
        actions={[
          <Btn key="inv" variant="secondary" small icon="user" onClick={() => window.__navigate('admin', 'invite_teachers')}>Invite staff</Btn>,
          ...(iAmOwner ? [<Btn key="xfer" variant="secondary" small icon="star" onClick={() => setTransferOpen(true)}>Transfer ownership</Btn>] : []),
        ]}
      />

      {/* Inline result / blocked message — never a silent failure. */}
      {flash && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', marginBottom: 18, borderRadius: 10,
          background: flash.kind === 'ok' ? DS.successBg : DS.dangerBg,
          border: `1px solid ${flash.kind === 'ok' ? DS.successBorder : DS.dangerBorder}`,
          color: flash.kind === 'ok' ? DS.success : DS.danger, fontSize: 13, fontWeight: 600,
        }}>
          <Icon name={flash.kind === 'ok' ? 'check' : 'alert'} size={15} />{flash.msg}
        </div>
      )}

      {/* Multi-centre chrome only — the account layer surfaces purely as centre
          context. Single-centre accounts skip this entirely. */}
      {multiCentre && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {manageableCentres.length > 1 && (
            <Segmented value={centreId} onChange={setCentreId} options={manageableCentres.map(c => ({ id: c.id, label: c.name }))} />
          )}
          <span style={{ fontSize: 12.5, color: DS.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="star" size={13} color={DS.accent} />
            Account owner: <b style={{ color: DS.sub }}>{ownerName}</b>
          </span>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <KPICard label="Staff" value={members.length} sub={`at ${centre.name}`} icon="users" iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="Admins" value={admins.length} sub="full centre access" icon="shield" iconBg={DS.accentLight} accent={DS.accent} />
        <KPICard label="Teachers" value={teacherCount} sub="teaching access" icon="teacher" iconBg={DS.infoBg} accent={DS.info} />
      </div>

      {!iCanManage && (
        <div style={{ padding: '11px 14px', marginBottom: 18, borderRadius: 10, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, color: DS.warning, fontSize: 13 }}>
          You can view staff here, but you need Admin at this centre to change roles.
        </div>
      )}

      {/* Staff & roles */}
      <Card style={{ marginBottom: 22 }}>
        {members.length === 0 ? (
          <EmptyState icon="users" title="No staff yet" message="Invite teachers or admins to populate this centre." action={<Btn variant="primary" icon="user" onClick={() => window.__navigate('admin', 'invite_teachers')}>Invite staff</Btn>} />
        ) : (
          <Table
            cols={['Staff', 'Contact', 'Roles & access']}
            rows={members.map(m => [
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{m.name}</span>
                    {m.isOwner && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: DS.accent, background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 20, padding: '1px 7px' }}><Icon name="star" size={10} color={DS.accent} />Owner</span>}
                    {m.isMe && <span style={{ fontSize: 10.5, fontWeight: 600, color: DS.muted, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: '1px 7px' }}>You</span>}
                  </div>
                  {m.status === 'invited' && <div style={{ fontSize: 11, color: DS.faint, marginTop: 1 }}>Invited · not yet active</div>}
                </div>
              </div>,
              <div style={{ fontSize: 12.5, color: DS.sub }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="mail" size={12} color={DS.faint} />{m.email}</div>
                {m.phone && <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 2 }}>{m.phone}</div>}
              </div>,
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {STAFF_ROLES.map(role => {
                  const active = m.roles.includes(role);
                  // The owner's Admin role can't be revoked here (transfer first).
                  const locked = active && role === 'admin' && m.isOwner;
                  return (
                    <RoleChip key={role} role={role} active={active} locked={locked} disabled={!iCanManage}
                      onClick={() => locked
                        ? flashMsg('err', 'The account owner must stay an Admin. Transfer ownership first.')
                        : toggleRole(m, role)} />
                  );
                })}
              </div>,
            ])}
          />
        )}
      </Card>

      {/* Owner-only product powers — distinct seams (billing / centres). Shown to
          admins so a non-owner admin can see what's reserved to the owner. */}
      {iCanManage && (
        <Card title="Account owner powers" subtitle="Reserved to the account owner — separate from role management." icon="lock" accent={DS.accent} style={{ marginBottom: 22 }}>
          <div style={{ padding: '4px 4px 8px' }}>
            <PowerRow icon="invoice" title="Billing & subscription" desc="Change plan, redeem codes, manage billing details."
              allowed={canManageBilling(me, account)} onManage={() => window.__navigate('admin', 'plans')} />
            <PowerRow icon="grid" title="Centres" desc="Create or close centres on the account." last
              allowed={canManageCentres(me, account)} onManage={() => window.__navigate('admin', 'centres')} />
          </div>
        </Card>
      )}

      {/* Audit log (local) */}
      {log.length > 0 && (
        <Card title="Recent role changes" subtitle="Who changed what, and when." icon="clock" accent={DS.info}>
          <div style={{ padding: '4px 4px' }}>
            {log.map((e, i) => {
              const whoBy = (members.find(m => m.email === e.by) || {}).name || window.emailToName(e.by) || 'Someone';
              const whoFor = (members.find(m => m.email === e.email) || {}).name || window.emailToName(e.email);
              const verb = e.action === 'grant' ? 'granted' : e.action === 'revoke' ? 'removed' : 'transferred ownership to';
              const roleLabel = e.role ? (ROLE_META[e.role] ? ROLE_META[e.role].label : e.role) : '';
              return (
                <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i === log.length - 1 ? 'none' : `1px solid ${DS.border}` }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: DS.surface, color: DS.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={e.action === 'transfer' ? 'star' : e.action === 'grant' ? 'plus' : 'x'} size={13} />
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: DS.sub }}>
                    <b style={{ color: DS.text }}>{whoBy}</b> {verb} {roleLabel && <b style={{ color: DS.text }}>{roleLabel}</b>} {e.action === 'transfer' ? <b style={{ color: DS.text }}>{whoFor}</b> : <>{e.action === 'grant' ? 'to' : 'from'} <b style={{ color: DS.text }}>{whoFor}</b></>}
                  </div>
                  <span style={{ fontSize: 11.5, color: DS.faint, whiteSpace: 'nowrap' }}>{fmtWhen(e.at)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Transfer ownership */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer ownership" icon="star" iconColor={DS.accent}
        subtitle="The owner holds billing + centre management. Hand it to another Admin — you'll stay a regular Admin.">
        {transferTargets.length === 0 ? (
          <EmptyState icon="shield" title="No other Admins" message="Promote another staff member to Admin first, then transfer ownership to them." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transferTargets.map(t => (
              <div key={t.email} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: `1px solid ${DS.border}`, borderRadius: 10 }}>
                <Avatar name={t.name} size={32} color={t.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: DS.faint }}>{t.email}</div>
                </div>
                <Btn variant="primary" small icon="star" onClick={() => doTransfer(t)}>Make owner</Btn>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Self-revoke confirm (lockout safety) */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Remove your own Admin role?" icon="alert" iconColor={DS.danger}
        subtitle="You'll lose access to admin tools at this centre. Another Admin can re-grant it to you."
        footer={<><Btn variant="ghost" small onClick={() => setConfirm(null)}>Cancel</Btn><Btn variant="danger" small onClick={() => { const c = confirm; setConfirm(null); reallyRevoke(c.target, c.role); }}>Remove my Admin</Btn></>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>
          This only changes your access at <b>{centre.name}</b>. Your Teacher role (if any) is unaffected.
        </div>
      </Modal>
    </div>
  );
};

window.AdminTeamPage = AdminTeamPage;

})();
