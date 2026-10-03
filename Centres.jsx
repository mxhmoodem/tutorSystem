// ══════════════════════════════════════════════════════════════
//  Klasio — Centres (plan-aware multi-centre management)
// ══════════════════════════════════════════════════════════════
//
//  The admin manages the centres included in their SUBSCRIPTION here. A plan caps
//  how many centres a subscription may run (`plan.maxCentres`). This page is the
//  single source of truth for the account's owned centres and also drives the
//  sidebar centre switcher (see index.html `centreNav`).
//
//  Centres render as a professional LIST. Clicking a centre opens a right-hand
//  DRAWER — the same drawer that handles "Add a centre" (full setup, like signup)
//  and continuing a not-yet-finished centre's setup checklist. There is no separate
//  "Set up centre" page anymore: navigating to admin/setup is rewritten to open this
//  page's setup drawer (index.html __navigate).
//
//  Frontend-only. Account-scoped localStorage store (tutoros.subscription.v2) seeded
//  from ONB_SUBSCRIPTION (mocks/onboarding.mock.jsx). Reuses genCentreCode (Auth.jsx),
//  RAND/onbTodayIso/CopyChip/Mono (Onboarding.jsx) + shared primitives (shared.jsx).

// One-time slide-in keyframe for the right-hand drawer (library only has a centred Modal).
(function () {
  if (typeof document === 'undefined' || document.getElementById('cen-kf')) return;
  const s = document.createElement('style'); s.id = 'cen-kf';
  s.textContent = '@keyframes cen-slide{from{transform:translateX(34px);opacity:0}to{transform:none;opacity:1}}';
  document.head.appendChild(s);
})();

// ─── Subscription store (account-scoped, cross-instance reactive) ────────────────
// localStorage isn't reactive across hook instances, so writes notify every live
// useSubscriptionStore() (App's instance for the switcher + this page's instance)
// — mirrors why Communications state was lifted into App. Without this, adding a
// centre here wouldn't show up in the sidebar switcher until an unrelated re-render.
// v2: re-seeds the account onto the 3-centre seed (bm + apex + summit) — the
// stored v1 blob predates Summit and masks new seed centres (readSub prefers it).
const SUB_STORE_KEY = 'tutoros.subscription.v2';
const subListeners = new Set();
const readSub = () => {
  try {
    const raw = localStorage.getItem(SUB_STORE_KEY);
    if (raw) { const p = JSON.parse(raw); return { ...ONB_SUBSCRIPTION, ...p, centres: p.centres || ONB_SUBSCRIPTION.centres }; }
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(ONB_SUBSCRIPTION));
};
const writeSub = next => {
  try { localStorage.setItem(SUB_STORE_KEY, JSON.stringify(next)); } catch (e) {}
  subListeners.forEach(fn => fn(next));
};

const useSubscriptionStore = () => {
  const [state, setState] = React.useState(readSub);
  React.useEffect(() => {
    const fn = next => setState(next);
    subListeners.add(fn);
    return () => { subListeners.delete(fn); };
  }, []);

  // Resolve the plan from the LIVE catalogue (Plans.jsx, superadmin-editable) so
  // price/seat edits show here; fall back to the static PLANS global if unavailable.
  const plan = (window.getPlan && window.getPlan(state.planId)) || PLANS[state.planId] || PLANS.growth;
  const setPlan = id => writeSub({ ...state, planId: id });

  // Billing details + an applied price-override code (issued by the superadmin).
  const setBilling = patch => writeSub({ ...state, billing: { ...(state.billing || {}), ...patch } });
  const applyCode = str => {
    if (!window.planRedeemCode) return { ok: false, reason: 'Codes unavailable' };
    const account = (window.ONB_SESSION && window.ONB_SESSION.email) || 'admin';
    const res = window.planRedeemCode(str, account, state.planId);
    if (!res.ok) return res;
    const c = res.code;
    writeSub({ ...state, redeemedCode: { code: c.code, kind: c.kind, value: c.value, durationMonths: c.durationMonths, planId: c.planId || null, appliedAt: new Date().toISOString().slice(0, 10) } });
    return res;
  };
  const removeCode = () => writeSub({ ...state, redeemedCode: null });
  // Derived effective price (base price modified by an active override code).
  const override = window.planOverrideStatus ? window.planOverrideStatus(state.redeemedCode, plan.price) : { active: false, effectivePrice: plan.price, until: null, label: '' };

  // Centre free trial (owner console → Pricing, Plans.jsx). `state.trial` is the stamp
  // taken at signup — the offer as it stood THEN, so later platform edits never move
  // a live centre's end date. A running trial is £0, ahead of any override code.
  const trialStatus = window.planTrialStatus ? window.planTrialStatus(state.trial) : { active: false, expired: false, daysLeft: 0, endsAt: null, label: '' };
  const startTrial = (pickedPlanId = state.planId) => {
    if (!window.planStartTrial) return null;
    const stamp = window.planStartTrial(pickedPlanId);        // null when trials are off
    if (!stamp) return null;
    writeSub({ ...state, trial: stamp });
    return stamp;
  };
  // Convert to a paying subscription early ("start paying now" / trial dismissed).
  const endTrial = () => writeSub({ ...state, trial: null });
  const effectivePrice = trialStatus.active ? 0 : override.effectivePrice;
  const addCentre = (fields = {}) => {
    if (state.centres.length >= plan.maxCentres) return null;   // plan cap
    const nm = (fields.name || '').trim();
    const code = window.genCentreCode ? window.genCentreCode(nm) : ('CEN-' + RAND(3));   // unique across every known code
    const slug = (nm.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16)) || ('c' + RAND(4).toLowerCase());
    const id = slug + '-' + RAND(3).toLowerCase();
    const centre = {
      id, name: nm, slug, code,
      city: (fields.city || '').trim(), region: (fields.region || '').trim(), address: (fields.address || '').trim(),
      email: (fields.email || '').trim(), phone: (fields.phone || '').trim(),
      accent: null, status: 'active', isPrimary: false, createdOn: onbTodayIso(),
      setup: { invite: false, students: false, classes: false, dismissed: false },
    };
    writeSub({ ...state, centres: [...state.centres, centre] });
    return centre;
  };
  const updateCentre = (id, patch) => writeSub({ ...state, centres: state.centres.map(c => c.id === id ? { ...c, ...patch } : c) });
  const setPrimary   = id => writeSub({ ...state, centres: state.centres.map(c => ({ ...c, isPrimary: c.id === id })) });
  // Transfer account ownership by repointing ownerUserId (email = identity key).
  // Ownership lives here on the account, never as a flag on a person — see
  // permissions.js isAccountOwner. The Team page guards that the new owner is an
  // Admin (and that only the current owner can call this) before invoking it.
  const setOwner = userId => writeSub({ ...state, ownerUserId: (userId || '').toLowerCase() });
  // Primary centre can't be removed — guard at UI level too.
  const removeCentre = id => writeSub({ ...state, centres: state.centres.filter(c => !(c.id === id && !c.isPrimary)) });

  // `trial` (spread from state) is the raw stamp; `trialStatus` is it resolved against today.
  return { ...state, plan, setPlan, addCentre, updateCentre, setPrimary, removeCentre, setOwner,
    setBilling, applyCode, removeCode, override, effectivePrice, trialStatus, startTrial, endTrial,
    regenerateCode: regenerateCentreCode, setSetupDismissed };
};

// ─── Module-level writers ──────────────────────────────────────────────────────
// Read-modify-write against the STORED blob rather than a hook's captured state,
// so callers outside this page (onboarding flows, the dashboard banner, Settings)
// can't clobber a newer write with a stale closure.
const patchCentre = (id, fn) => {
  const s = readSub();
  if (!(s.centres || []).some(c => c.id === id)) return false;
  writeSub({ ...s, centres: s.centres.map(c => c.id === id ? fn(c) : c) });
  return true;
};
const cenActiveId = () => (window.__getCentre && window.__getCentre()) || (ONB_CENTRE && ONB_CENTRE.id) || 'bm';

// ─── Setup model + helpers ───────────────────────────────────────────────────────
const SETUP_STEPS = [
  { id: 'invite',   icon: 'user',  accent: '#0891B2', title: 'Invite your teachers',  desc: 'Send invite links so each teacher sets up their own account.', cta: 'Invite teachers', route: 'invite_teachers' },
  { id: 'students', icon: 'users', accent: DS.accent, title: 'Add your students',      desc: 'Bulk-import your class list or add students one at a time.',   cta: 'Add students',    route: 'students_import' },
  { id: 'classes',  icon: 'book',  accent: '#7C3AED', title: 'Create classes & enrol', desc: 'Set up class groups, then enrol your signed-up students.',     cta: 'Create a class',  route: 'classes_add' },
];
// Completion is DERIVED from the centre's own data wherever a roster exists
// (reference: `centre_settings.setup` — "completion is derived where possible,
// this stores dismissals"). Clicking a step's button never marks it done; only
// the data does. In this prototype only the primary centre carries a live
// roster, so other centres fall back to the flags a flow records when it
// actually FINISHES there (markCentreSetup) — the stand-in for a real query.
const setupStepDone = (c, stepId) => {
  const cm = window.centreMetrics;
  if (c && cm && cm.hasRoster && cm.hasRoster(c.id)) {
    if (stepId === 'invite')   return cm.getTeachersForCentre(c.id).length > 0;
    if (stepId === 'students') return cm.getStudentsForCentre(c.id).length > 0;
    if (stepId === 'classes')  return cm.getClassesForCentre(c.id).some(x => x.status !== 'archived');
  }
  return !!((c && c.setup) || {})[stepId];
};
const setupDone     = c => SETUP_STEPS.filter(s => setupStepDone(c, s.id)).length;
const isCentreSetUp = c => setupDone(c) === SETUP_STEPS.length;
const setupDismissed = c => !!((c && c.setup) || {}).dismissed;

// Recorded by a flow when it finishes at the active centre (import done, invites
// sent, class created) — never by the checklist's own buttons.
const markCentreSetup = (stepId, centreId) =>
  patchCentre(centreId || cenActiveId(), c => ({ ...c, setup: { ...(c.setup || {}), [stepId]: true } }));
// A per-centre dismissal of the dashboard banner. Any centre admin can undo it
// from Settings → Centre, so dismissing never strands a non-owner admin (who
// can't open the account-tier Centres page) without a route back to setup.
const setSetupDismissed = (id, dismissed) =>
  patchCentre(id || cenActiveId(), c => ({ ...c, setup: { ...(c.setup || {}), dismissed: !!dismissed } }));

// One status object for every surface that shows setup (dashboard banner,
// Centres drawer, Settings → Centre), so they cannot disagree.
const centreSetupStatus = (centreId) => {
  const id = centreId || cenActiveId();
  const c = (readSub().centres || []).find(x => x.id === id) || null;
  const steps = SETUP_STEPS.map(s => ({ ...s, done: setupStepDone(c, s.id) }));
  const done = steps.filter(s => s.done).length;
  return { centre: c, steps, done, total: steps.length, complete: done === steps.length, dismissed: setupDismissed(c) };
};

// ─── Centre code — a routing key, not a credential ─────────────────────────────
// The code only SELECTS a centre at student login; username + PIN/password
// authenticate. So an old code can keep resolving for a grace period after a
// change at no security cost — and every slip already printed keeps working.
const CODE_GRACE_DAYS = 30;
const isoPlusDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// Every code anyone might type — current codes, codes still in their grace
// window, and other accounts' centres. Generation must avoid all of them: the
// resolver returns the first match, so a collision would route a pupil into
// the wrong tenant. (Production: `centres.code UNIQUE` + retry on violation.)
const allCentreCodes = () => {
  const codes = new Set();
  (readSub().centres || []).forEach(c => {
    if (c.code) codes.add(c.code.toUpperCase());
    if (c.previousCode) codes.add(c.previousCode.toUpperCase());
  });
  Object.values(window.ONB_CENTRE_DIRECTORY || {}).forEach(d => { if (d.code) codes.add(d.code.toUpperCase()); });
  return codes;
};

// The live code for a centre — what claim slips and the setup screens print.
const centreCodeFor = (centreId) => {
  const id = centreId || cenActiveId();
  const c = (readSub().centres || []).find(x => x.id === id);
  if (c && c.code) return c.code;
  const d = (window.ONB_CENTRE_DIRECTORY || {})[id];
  return (d && d.code) || '';
};

// The ONE resolver for a typed centre code (student login):
//   current → the centre            grace → the centre, plus the new code to learn
//   retired → no centre, but say the code CHANGED (not "check your slip" — the
//             slip is exactly what is now out of date)          null → unknown
const resolveCentreCode = (raw) => {
  const v = (raw || '').trim().toUpperCase();
  if (!v) return null;
  const today = onbTodayIso();
  const centres = (readSub().centres || []).filter(c => c.status !== 'archived');
  const cur = centres.find(c => (c.code || '').toUpperCase() === v);
  if (cur) return { state: 'current', centreId: cur.id, name: cur.name };
  const prev = centres.find(c => (c.previousCode || '').toUpperCase() === v);
  if (prev) {
    return prev.previousCodeUntil && prev.previousCodeUntil >= today
      ? { state: 'grace', centreId: prev.id, name: prev.name, newCode: prev.code, until: prev.previousCodeUntil }
      : { state: 'retired', centreId: null, name: prev.name, changedOn: prev.codeChangedOn || null };
  }
  // Centres on OTHER accounts (the directory). Skip ids this account owns — their
  // live code is above, and a stale directory copy must not resurrect an old one.
  const own = new Set((readSub().centres || []).map(c => c.id));
  const hit = Object.values(window.ONB_CENTRE_DIRECTORY || {}).find(d => !own.has(d.id) && (d.code || '').toUpperCase() === v);
  return hit ? { state: 'current', centreId: hit.id, name: hit.name } : null;
};

// Students provisioned at a centre who haven't claimed yet — each is holding a
// printed slip that carries the centre code.
const unclaimedSlipCount = (centreId) => {
  const cm = window.centreMetrics;
  if (!cm) return 0;
  return cm.getStudentsForCentre(centreId).filter(s => s.account && (s.account.status === 'pending' || s.account.status === 'invited')).length;
};

// Regenerate = apply now (a destructive change never waits in a draft behind
// "Save"), keep the old code resolving for CODE_GRACE_DAYS. A code already in
// its grace window is dropped immediately — only one previous code is honoured.
const regenerateCentreCode = (id) => {
  const today = onbTodayIso();
  let out = null;
  patchCentre(id, c => {
    const code = window.genCentreCode ? window.genCentreCode(c.name || 'Centre') : ('CEN-' + RAND(3, '0123456789'));
    out = { code, previousCode: c.code, until: isoPlusDays(today, CODE_GRACE_DAYS), droppedCode: c.previousCode || null };
    return { ...c, code, previousCode: c.code, previousCodeUntil: out.until, codeChangedOn: today };
  });
  if (out && window.klasioAudit) window.klasioAudit('centre_code_regenerated', id, { from: out.previousCode, to: out.code });
  return out;
};

const CENTRE_ACCENTS = ['#4F46E5', '#0891B2', '#43b190', '#7C3AED', '#DB2777', '#EA580C', '#0EA5E9', '#16A34A'];

const CentreTile = ({ name, size = 38, color, active }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
    background: color || (active ? DS.accent : DS.muted),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ color: '#fff', fontSize: size * 0.42, fontWeight: 800, letterSpacing: '-0.5px' }}>{(name || 'C').slice(0, 1).toUpperCase()}</span>
  </div>
);

// ─── Right-hand drawer shell ───────────────────────────────────────────────────────
const CentreDrawerShell = ({ open, onClose, width = 580, title, subtitle, icon, accent, footer, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const ac = accent || DS.accent;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end', animation: 'tos-fade 0.12s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width, maxWidth: '100%', height: '100%', background: DS.bg, boxShadow: '-12px 0 44px rgba(17,24,39,0.18)', display: 'flex', flexDirection: 'column', animation: 'cen-slide 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '18px 20px', borderBottom: `1px solid ${DS.border}` }}>
          {icon && <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: ac + '18', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DS.text, letterSpacing: '-0.2px' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>{footer}</div>}
      </div>
    </div>
  );
};

// ─── Drawer section header ─────────────────────────────────────────────────────────
const DrawerSection = ({ label, children, style }) => (
  <div style={{ marginBottom: 20, ...style }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{label}</div>
    {children}
  </div>
);

// ─── Setup checklist (lives inside the drawer) ─────────────────────────────────────
const SetupChecklist = ({ centre, disabled, onStep }) => {
  const done = setupDone(centre);
  const pct = Math.round((done / SETUP_STEPS.length) * 100);
  const hidden = done < SETUP_STEPS.length && setupDismissed(centre);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            <circle cx="23" cy="23" r="19" fill="none" stroke={DS.border} strokeWidth="5" />
            <circle cx="23" cy="23" r="19" fill="none" stroke={DS.accent} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 19} ${2 * Math.PI * 19}`} transform="rotate(-90 23 23)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: DS.text }}>{pct}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>{done} of {SETUP_STEPS.length} steps complete</div>
          <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 1 }}>{done === SETUP_STEPS.length ? 'This centre is ready — students can claim their accounts.' : 'Finish setup to onboard everyone.'}</div>
        </div>
        {hidden && <Btn small variant="ghost" icon="eye" onClick={() => setSetupDismissed(centre.id, false)}>Show on dashboard</Btn>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        {SETUP_STEPS.map((s, i) => {
          const isDone = setupStepDone(centre, s.id);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${isDone ? DS.successBorder : DS.border}`, borderRadius: 10, background: isDone ? DS.successBg : DS.bg }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? DS.success + '1A' : s.accent + '14', color: isDone ? DS.success : s.accent, border: `1px solid ${isDone ? DS.successBorder : s.accent + '33'}` }}>
                <Icon name={isDone ? 'check' : s.icon} size={16} strokeWidth={isDone ? 2.5 : 1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{s.title}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 1, lineHeight: 1.45 }}>{s.desc}</div>
              </div>
              <Btn small variant={isDone ? 'secondary' : 'primary'} onClick={() => onStep(s)}>{isDone ? 'Manage' : s.cta}</Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Change centre code (confirm → done) ───────────────────────────────────────────
// Changing the code is a destructive action for everyone holding it on paper, so
// it says exactly what breaks — with the real unclaimed-slip count — before it
// happens, and the old code keeps resolving for CODE_GRACE_DAYS afterwards.
const CentreCodeDialog = ({ open, centre, onClose }) => {
  const [result, setResult] = React.useState(null);
  React.useEffect(() => { if (open) setResult(null); }, [open]);
  if (!open || !centre) return null;
  const unclaimed = unclaimedSlipCount(centre.id);
  const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const graceEnds = fmt(isoPlusDays(onbTodayIso(), CODE_GRACE_DAYS));
  const pendingOld = centre.previousCode && centre.previousCodeUntil && centre.previousCodeUntil >= onbTodayIso() ? centre.previousCode : null;
  const confirm = () => setResult(regenerateCentreCode(centre.id));
  const reprint = () => { onClose(); if (window.__setCentre) window.__setCentre(centre.id); window.__adminParam = 'unclaimed'; window.__navigate && window.__navigate('admin', 'claim_slips'); };
  const Line = ({ icon, tone, children }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: DS.sub, lineHeight: 1.5 }}>
      <span style={{ display: 'flex', marginTop: 2, color: tone || DS.muted }}><Icon name={icon} size={15} /></span>
      <span>{children}</span>
    </div>
  );
  if (result) {
    return (
      <Modal open onClose={onClose} title="Centre code changed" icon="check" iconColor={DS.success}
        footer={<React.Fragment>
          {unclaimed > 0 && <Btn variant="secondary" icon="print" onClick={reprint}>Reprint {unclaimed} slip{unclaimed === 1 ? '' : 's'}</Btn>}
          <Btn variant="primary" onClick={onClose}>Done</Btn>
        </React.Fragment>}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Mono size={15}>{result.previousCode}</Mono>
          <Icon name="chevron_r" size={16} color={DS.faint} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, letterSpacing: '1px', color: DS.text }}>{result.code}</span>
          <CopyChip value={result.code} title="Copy new code" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Line icon="clock">The old code keeps working until <b>{fmt(result.until)}</b>. Students who use it are shown the new one.</Line>
          {result.droppedCode && <Line icon="alert" tone={DS.warning}>The code you replaced before, <Mono size={12}>{result.droppedCode}</Mono>, has stopped working.</Line>}
        </div>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title="Change the centre code?" subtitle={`${centre.name} · currently ${centre.code}`} icon="tag" iconColor={DS.warning} width={540}
      footer={<React.Fragment>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="tag" onClick={confirm}>Change code</Btn>
      </React.Fragment>}>
      <div style={{ fontSize: 13, color: DS.sub, lineHeight: 1.55, marginBottom: 14 }}>
        Only do this if the code has ended up somewhere it shouldn't, or the centre has been renamed. Anyone holding the old code will need the new one:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <Line icon="users" tone={unclaimed ? DS.warning : DS.muted}>
          {unclaimed
            ? <><b>{unclaimed} student{unclaimed === 1 ? ' hasn’t' : 's haven’t'} claimed their account yet.</b> Their printed slips show the old code.</>
            : <>No students are waiting to claim an account, so no outstanding slips are affected.</>}
        </Line>
        <Line icon="file">Parent letters, the whiteboard and anything else that prints the code.</Line>
        <Line icon="lock">Students on a device that has signed in before aren’t affected — it remembers the centre.</Line>
        {pendingOld && <Line icon="alert" tone={DS.warning}>The code you changed last time, <Mono size={12}>{pendingOld}</Mono>, stops working immediately.</Line>}
      </div>
      <div style={{ padding: '11px 14px', borderRadius: 9, background: DS.surface, border: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.sub, display: 'flex', gap: 9, alignItems: 'center' }}>
        <Icon name="clock" size={15} color={DS.accent} />
        <span><b>{centre.code}</b> keeps working for {CODE_GRACE_DAYS} days, until {graceEnds}, so nobody is locked out while you reprint.</span>
      </div>
    </Modal>
  );
};

// ─── Centre drawer (add · setup · configure, all in one) ───────────────────────────
const CentreDrawer = ({ open, mode, centre, store, activeId, onClose, onStep, onCreated, onSwitch }) => {
  const isNew = mode === 'new';
  const blank = { name: '', city: '', region: '', address: '', email: '', phone: '', accent: null, status: 'active' };
  const [draft, setDraft] = React.useState(blank);
  const [codeDialog, setCodeDialog] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setDraft(isNew ? { ...blank } : { ...centre });
    setCodeDialog(false);
  }, [open, isNew, centre && centre.id]);
  if (!open) return null;

  const isActive = !isNew && centre && centre.id === activeId;
  const accent = isNew ? DS.accent : (centre.accent || DS.accent);
  const validName = (draft.name || '').trim().length > 1;
  // The code is read LIVE off the centre, never from the draft: regenerating is
  // applied on confirm (see CentreCodeDialog), and Save must not write it back.
  const inGrace = !isNew && centre.previousCode && centre.previousCodeUntil && centre.previousCodeUntil >= onbTodayIso();

  const create = () => {
    if (!validName) return;
    const c = store.addCentre(draft);
    if (c) onCreated(c);
  };
  const save = () => {
    store.updateCentre(centre.id, {
      name: (draft.name || '').trim() || centre.name, city: (draft.city || '').trim(), region: (draft.region || '').trim(),
      address: (draft.address || '').trim(), email: (draft.email || '').trim(), phone: (draft.phone || '').trim(),
      accent: draft.accent, status: draft.status,
    });
    if (isActive && window.__setAccent) window.__setAccent(draft.accent || null);
    onClose();
  };
  const remove = () => {
    if (centre.isPrimary) return;
    if (isActive) {
      const primary = store.centres.find(c => c.isPrimary) || store.centres.find(c => c.id !== centre.id);
      if (primary && window.__setCentre) { window.__setCentre(primary.id); if (window.__setAccent) window.__setAccent(primary.accent || null); }
    }
    store.removeCentre(centre.id);
    onClose();
  };

  const setF = k => e => setDraft(d => ({ ...d, [k]: e.target.value }));

  return (
    <CentreDrawerShell
      open={open} onClose={onClose} accent={accent}
      icon={isNew ? 'plus' : 'book'}
      title={isNew ? 'Add a centre' : centre.name}
      subtitle={isNew ? `Included in your ${store.plan.name} plan — no new subscription needed` : (centre.isPrimary ? 'Primary centre · in your subscription' : 'Centre in your subscription')}
      footer={<React.Fragment>
        <Btn variant="ghost" onClick={onClose}>{isNew ? 'Cancel' : 'Close'}</Btn>
        {isNew
          ? <Btn variant="primary" icon="check" onClick={create} style={validName ? {} : { opacity: 0.5, pointerEvents: 'none' }}>Create centre</Btn>
          : <Btn variant="primary" icon="check" onClick={save}>Save changes</Btn>}
      </React.Fragment>}>

      {/* Quick actions (existing centre) */}
      {!isNew && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {isActive
            ? <Badge variant="success">Active now</Badge>
            : <Btn small variant="secondary" icon="chevron_r" onClick={() => onSwitch(centre.id)}>Switch to this centre</Btn>}
          {!centre.isPrimary && <Btn small variant="secondary" icon="star" onClick={() => store.setPrimary(centre.id)}>Set as default</Btn>}
        </div>
      )}

      {/* Setup checklist */}
      <DrawerSection label={isNew || !isCentreSetUp(centre) ? 'Set up this centre' : 'Setup'}>
        {isNew
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1px dashed ${DS.borderDark}`, borderRadius: 10, color: DS.muted, fontSize: 12.5 }}>
              <Icon name="alert" size={15} />Enter the centre details below and create it — then invite teachers, add students and create classes.
            </div>
          : <SetupChecklist centre={centre} onStep={s => onStep(centre, s)} />}
      </DrawerSection>

      {/* Centre details */}
      <DrawerSection label="Centre details">
        <Field label="Centre name *" style={{ marginBottom: 12 }}>
          <Input value={draft.name || ''} onChange={setF('name')} placeholder="e.g. Riverside Tuition" icon="book" autoFocus={isNew} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="City" style={{ marginBottom: 12 }}><Input value={draft.city || ''} onChange={setF('city')} placeholder="e.g. Leeds" /></Field>
          <Field label="Region / county" style={{ marginBottom: 12 }}><Input value={draft.region || ''} onChange={setF('region')} placeholder="e.g. West Yorkshire" /></Field>
        </div>
        <Field label="Address" style={{ marginBottom: 12 }}><Input value={draft.address || ''} onChange={setF('address')} placeholder="Street address (optional)" icon="pin" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact email" style={{ marginBottom: 12 }}><Input type="email" value={draft.email || ''} onChange={setF('email')} placeholder="office@centre.co.uk" icon="mail" /></Field>
          <Field label="Contact phone" style={{ marginBottom: 12 }}><Input value={draft.phone || ''} onChange={setF('phone')} placeholder="Phone" icon="phone" /></Field>
        </div>
        {!isNew && (
          <Field label="Centre code" hint="Students enter this once on a new device to find your centre — it's printed on every claim slip. Safe to share: it picks the centre, it doesn't sign anyone in." style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 700, letterSpacing: '1px', color: DS.text }}>{centre.code}</span>
              <CopyChip value={centre.code} title="Copy centre code" />
              <Btn small variant="secondary" icon="tag" onClick={() => setCodeDialog(true)}>Change code…</Btn>
            </div>
            {inGrace && (
              <div style={{ marginTop: 8, fontSize: 12, color: DS.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" size={13} />
                Old code <Mono size={12}>{centre.previousCode}</Mono> still works until {new Date(centre.previousCodeUntil + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
              </div>
            )}
          </Field>
        )}
        {!isNew && <CentreCodeDialog open={codeDialog} centre={centre} onClose={() => setCodeDialog(false)} />}
      </DrawerSection>

      {/* Branding */}
      <DrawerSection label="Branding">
        <Field label="Centre accent" hint={isActive ? 'Applied live across the app for this centre.' : 'Applied whenever this centre is the active one.'} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CENTRE_ACCENTS.map(hex => {
              const on = (draft.accent || '').toLowerCase() === hex.toLowerCase();
              return <button key={hex} title={hex} onClick={() => setDraft(d => ({ ...d, accent: hex }))} style={{
                width: 28, height: 28, borderRadius: 8, cursor: 'pointer', background: hex,
                border: on ? `2px solid ${DS.text}` : '2px solid transparent', boxShadow: on ? '0 0 0 2px #fff inset' : 'none',
              }} />;
            })}
            <button title="No custom colour — use the platform default" onClick={() => setDraft(d => ({ ...d, accent: null }))} style={{
              width: 28, height: 28, borderRadius: 8, cursor: 'pointer', background: DS.surface,
              border: !draft.accent ? `2px solid ${DS.text}` : `2px dashed ${DS.borderDark}`, color: DS.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name="x" size={13} /></button>
          </div>
        </Field>
      </DrawerSection>

      {/* Danger zone (existing centre) */}
      {!isNew && (
        <DrawerSection label="Status" style={{ marginBottom: 4 }}>
          <Field label="Visibility" hint="Archived centres are hidden from the switcher but keep their data." style={{ marginBottom: 12 }}>
            <Segmented value={draft.status || 'active'} onChange={v => setDraft(d => ({ ...d, status: v }))} options={[{ id: 'active', label: 'Active' }, { id: 'archived', label: 'Archived' }]} />
          </Field>
          <div style={{ padding: '12px 14px', border: `1px solid ${DS.dangerBorder}`, background: DS.dangerBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.danger }}>Remove centre</div>
              <div style={{ fontSize: 11.5, color: DS.sub, marginTop: 1 }}>{centre.isPrimary ? 'The primary centre can’t be removed — set another as default first.' : 'Frees a centre slot against your plan. Can’t be undone.'}</div>
            </div>
            <Btn small variant="danger" icon="trash" onClick={remove} style={centre.isPrimary ? { opacity: 0.5, pointerEvents: 'none' } : {}}>Remove</Btn>
          </div>
        </DrawerSection>
      )}
    </CentreDrawerShell>
  );
};

// ─── Centre list row ───────────────────────────────────────────────────────────────
const CentreRow = ({ centre, isActive, isLast, onOpen, onSwitch }) => {
  const [hov, setHov] = React.useState(false);
  const archived = centre.status === 'archived';
  const done = setupDone(centre);
  const ready = done === SETUP_STEPS.length;
  // Per-centre split of the pooled seats (§5) — this centre's own usage.
  const cm = window.centreMetrics;
  const seatStudents = cm ? cm.getStudentsForCentre(centre.id).length : 0;
  const seatTeachers = cm ? cm.getTeachersForCentre(centre.id).length : 0;
  return (
    <div
      onClick={() => onOpen(centre.id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer',
        borderBottom: isLast ? 'none' : `1px solid ${DS.border}`,
        background: hov ? DS.surfaceHover : 'transparent', transition: 'background 0.12s', opacity: archived ? 0.6 : 1,
      }}>
      <CentreTile name={centre.name} color={centre.accent || (isActive ? DS.accent : DS.muted)} active={isActive} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: DS.text, letterSpacing: '-0.2px' }}>{centre.name}</span>
          {centre.isPrimary && <Badge variant="accent">Primary</Badge>}
          {isActive && <Badge variant="success">Active now</Badge>}
          {archived && <Badge variant="default">Archived</Badge>}
        </div>
        <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{centre.city || 'No city set'}</span>
          <span style={{ color: DS.faint }}>·</span>
          <Mono size={12}>{centre.code}</Mono>
          <span style={{ color: DS.faint }}>·</span>
          <span>{seatStudents} student{seatStudents === 1 ? '' : 's'} · {seatTeachers} staff</span>
        </div>
      </div>
      {/* Setup status */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {ready
          ? <Badge variant="success">Set up</Badge>
          : <Btn small variant="primary" icon="zap" onClick={() => onOpen(centre.id)}>Set up · {done}/{SETUP_STEPS.length}</Btn>}
        {!isActive && !archived && <Btn small variant="ghost" onClick={() => onSwitch(centre.id)}>Switch</Btn>}
        <Icon name="chevron_r" size={16} color={DS.faint} />
      </div>
    </div>
  );
};

// ─── Plan analytics stat ───────────────────────────────────────────────────────────
const PlanStat = ({ label, value, sub }) => (
  <div style={{ minWidth: 120 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 19, fontWeight: 700, color: DS.text, marginTop: 3, letterSpacing: '-0.3px' }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{sub}</div>}
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────────
const CentresPage = () => {
  const store = useSubscriptionStore();
  const plan = store.plan;
  const centres = store.centres;
  const used = centres.length;
  const atCap = used >= plan.maxCentres;
  const overCap = used > plan.maxCentres;
  const singleCentre = plan.maxCentres === 1;
  const activeId = (window.__getCentre && window.__getCentre()) || (centres.find(c => c.isPrimary) || centres[0] || {}).id;

  // drawer: null | { mode:'new' } | { mode:'edit', id }
  const [drawer, setDrawer] = React.useState(null);

  const switchTo = (id) => {
    const c = centres.find(x => x.id === id);
    if (window.__setCentre) window.__setCentre(id);
    if (window.__setAccent) window.__setAccent((c && c.accent) || null);
  };

  // Entry intents from elsewhere (sidebar "+ Add a centre", admin/setup redirect, dashboard banner).
  React.useEffect(() => {
    const intent = window.__centresIntent;
    if (!intent) return;
    window.__centresIntent = null;
    if (intent.add && !atCap) setDrawer({ mode: 'new' });
    else if (intent.setup) {
      const c = centres.find(x => x.id === intent.setup) || centres.find(x => x.isPrimary) || centres[0];
      if (c) setDrawer({ mode: 'edit', id: c.id });
    }
  }, []);   // eslint-disable-line

  // A setup step: switch to that centre and open the flow. Opening a flow does NOT
  // mark the step done — the step completes when the data exists (setupStepDone).
  const onStep = (centre, step) => {
    switchTo(centre.id);
    if (window.__navigate) window.__navigate('admin', step.route);
  };
  // Newly created centre → switch to it and continue in setup mode.
  const onCreated = (c) => { switchTo(c.id); setDrawer({ mode: 'edit', id: c.id }); };

  const drawerCentre = drawer && drawer.mode === 'edit' ? centres.find(c => c.id === drawer.id) : null;
  // Seats + storage are ACCOUNT-level pools (§5) — summed across every centre and
  // read from the plan catalogue, NOT a per-centre allowance. Mirrors the Storage
  // "pooled overview + per-centre split" model.
  const seat = window.centreMetrics ? window.centreMetrics.getSeatUsage() : null;
  const storagePool = window.centreMetrics ? window.centreMetrics.getStoragePool() : null;

  return (
    <div style={pageFrame()}>
      <PageHeader
        title="Centres"
        subtitle="Manage the centres included in your subscription — switch between them, configure each, or add a new one."
        actions={!singleCentre ? [
          <Btn key="add" variant="primary" icon="plus" onClick={() => setDrawer({ mode: 'new' })} style={atCap ? { opacity: 0.5, pointerEvents: 'none' } : {}}>Add a centre</Btn>,
        ] : null}
      />

      {/* Plan analytics (no plan switching — allowance/seats only) */}
      <Card style={{ marginBottom: 22 }}>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentHover})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${DS.accent}3A` }}>
              <Icon name="zap" size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: DS.text }}>{plan.name} plan</span>
                <Badge variant="accent">£{plan.price}/mo</Badge>
                {store.trialStatus.active && <Badge variant="success">{store.trialStatus.daysLeft}d trial left</Badge>}
              </div>
              <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>
                {store.trialStatus.active ? 'Free trial — full allowance, billed when it ends' : 'Your current subscription allowance'}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: DS.muted, marginBottom: 5 }}>
              <span>Centres used</span><span style={{ fontWeight: 600, color: overCap ? DS.danger : DS.text }}>{used} of {plan.maxCentres}</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: DS.surface, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.round((used / plan.maxCentres) * 100))}%`, height: '100%', borderRadius: 99, background: overCap ? DS.danger : DS.accent, transition: 'width 0.2s' }} />
            </div>
          </div>
          <PlanStat label="Student seats" value={seat ? `${seat.students.used} / ${seat.students.cap.toLocaleString()}` : plan.studentSeats.toLocaleString()} sub="pooled across centres" />
          <PlanStat label="Teacher seats" value={seat ? `${seat.teachers.used} / ${seat.teachers.cap}` : plan.teacherSeats} sub="pooled across centres" />
          <PlanStat label="Cloud storage" value={storagePool ? `${storagePool.usedGb} / ${storagePool.totalGb} GB` : `${plan.storageGb} GB`} sub="pooled across centres" />
        </div>
      </Card>

      {/* Over-limit notice (e.g. after a downgrade below the number of owned centres) */}
      {overCap && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', marginBottom: 18, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, borderRadius: 10 }}>
          <Icon name="alert" size={16} color={DS.warning} />
          <span style={{ fontSize: 12.5, color: DS.sub }}>
            You have <b>{used}</b> centres but the <b>{plan.name}</b> plan includes <b>{plan.maxCentres}</b>. Archive or remove a centre, or upgrade to keep them all.
          </span>
        </div>
      )}

      {/* Centre list */}
      <Card style={{ marginBottom: 0 }}>
        {centres.map((c, i) => (
          <CentreRow key={c.id} centre={c} isActive={c.id === activeId} isLast={i === centres.length - 1 && singleCentre}
            onOpen={(id) => setDrawer({ mode: 'edit', id })} onSwitch={switchTo} />
        ))}
        {/* Add row — multi-centre plans only */}
        {!singleCentre && (
          <button onClick={() => !atCap && setDrawer({ mode: 'new' })} disabled={atCap} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 18px', textAlign: 'left',
            border: 'none', borderTop: `1px solid ${DS.border}`, background: 'transparent', cursor: atCap ? 'not-allowed' : 'pointer', color: DS.muted, opacity: atCap ? 0.7 : 1,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, border: `1px dashed ${DS.borderDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={atCap ? 'lock' : 'plus'} size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: atCap ? DS.muted : DS.text }}>{atCap ? 'Plan limit reached' : 'Add a centre'}</div>
              <div style={{ fontSize: 12, color: DS.faint }}>{atCap ? 'Upgrade to add more centres' : 'Full setup — included in your plan, no new subscription'}</div>
            </div>
          </button>
        )}
      </Card>

      {/* Single-centre plan disclaimer */}
      {singleCentre && (
        <div style={{ marginTop: 18, padding: '18px 20px', background: `linear-gradient(135deg, ${DS.accent}0E, transparent)`, border: `1px solid ${DS.accentBorder}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>Your {plan.name} plan includes a single centre</div>
            <div style={{ fontSize: 13, color: DS.muted, marginTop: 2, lineHeight: 1.5 }}>Upgrade to Growth to run up to {PLANS.growth.maxCentres} centres under one subscription — add and configure each from this page, no extra sign-up.</div>
          </div>
        </div>
      )}

      <CentreDrawer
        open={!!drawer} mode={drawer ? drawer.mode : 'edit'} centre={drawerCentre} store={store} activeId={activeId}
        onClose={() => setDrawer(null)} onStep={onStep} onCreated={onCreated} onSwitch={switchTo} />
    </div>
  );
};

// ─── Export ────────────────────────────────────────────────────────────────────────
Object.assign(window, {
  useSubscriptionStore, CentresPage,
  readSubscription: readSub,   // non-hook read (e.g. account-owner checks in Communications)
  // setup checklist (one status object for banner / drawer / Settings)
  SETUP_STEPS, centreSetupStatus, markCentreSetup, setSetupDismissed,
  // centre code (one resolver, unique generation, live lookup)
  allCentreCodes, centreCodeFor, resolveCentreCode, CODE_GRACE_DAYS,
});
