// ══════════════════════════════════════════════════════════════
//  Klasio — Plans & override codes (platform-wide)
// ══════════════════════════════════════════════════════════════
//
//  Single source of truth for the subscription PLAN CATALOGUE, the superadmin's
//  price-OVERRIDE CODES and the GLOBAL FREE TRIAL. Consumers:
//    • SuperAdmin → Platform Controls  — edits plans, issues codes, sets the global trial (SAControlsPage)
//    • admin subscription              — resolves the live plan + trial (Centres.jsx useSubscriptionStore)
//    • admin → Settings → Billing      — change plan, redeem a code, save billing (Settings.jsx)
//    • public signup                   — promises the live trial (Auth.jsx)
//
//  Loads after Settings.jsx and BEFORE SuperAdmin.jsx + Centres.jsx (index.html),
//  and after mocks/plans.mock.jsx (PLAN_CATALOG_SEED / PLAN_CODES_SEED / PLAN_TRIAL_SEED).
//
//  Frontend-only. Two localStorage stores, both cross-instance reactive (mirrors
//  the subListeners/writeSub pattern in Centres.jsx) so superadmin edits and admin
//  redemptions propagate to every live hook instance without a manual reload.
//  Non-IIFE global module like Centres.jsx; every top-level id is prefixed
//  Plan / plan / PLAN_ to avoid colliding with other globally-scoped scripts.

// Superadmin plan/code modals tint through the live brand-accent token
// (DS.accent) — no raw accent hex.

// ─── Tiny local helpers (avoid load-order deps on Onboarding.jsx's RAND/onbTodayIso) ──
const planRand = (n = 4, chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789') =>
  Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const planTodayIso = () => new Date().toISOString().slice(0, 10);
const planMoney = n => `£${Number(n || 0).toLocaleString()}`;

// ─── Plan catalogue store (tutoros.plans.v1) ─────────────────────────────────────
const PLAN_STORE_KEY = 'tutoros.plans.v1';
const planListeners = new Set();
const planSeed = () => JSON.parse(JSON.stringify(window.PLAN_CATALOG_SEED || []));
const readPlans = () => {
  try {
    const raw = localStorage.getItem(PLAN_STORE_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
  } catch (e) { /* ignore */ }
  return planSeed();
};
const writePlans = next => {
  try { localStorage.setItem(PLAN_STORE_KEY, JSON.stringify(next)); } catch (e) {}
  planListeners.forEach(fn => fn(next));
};

// Non-hook accessors — read live so the subscription store + sidebar `planUsage`
// pick up superadmin edits (fall back to the back-compat PLANS global).
const getPlans = () => [...readPlans()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const getPlan = id => readPlans().find(p => p.id === id) || (window.PLANS && window.PLANS[id]) || null;

const usePlansStore = () => {
  const [state, setState] = React.useState(readPlans);
  React.useEffect(() => { const fn = n => setState(n); planListeners.add(fn); return () => { planListeners.delete(fn); }; }, []);

  const plans = [...state].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const updatePlan = (id, patch) => writePlans(state.map(p => p.id === id ? { ...p, ...patch } : p));
  const addPlan = (fields = {}) => {
    const id = (fields.id || (fields.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16)) || ('plan' + planRand(3).toLowerCase());
    if (state.some(p => p.id === id)) return null;            // ids are unique
    const plan = {
      id, name: fields.name || 'New plan', price: +fields.price || 0,
      maxCentres: +fields.maxCentres || 1, studentSeats: +fields.studentSeats || 0, teacherSeats: +fields.teacherSeats || 0,
      storageGb: +fields.storageGb || 0,
      features: fields.features || [], order: state.length, archived: false,
    };
    writePlans([...state, plan]);
    return plan;
  };
  const archivePlan = id => writePlans(state.map(p => p.id === id ? { ...p, archived: true } : p));
  const restorePlan = id => writePlans(state.map(p => p.id === id ? { ...p, archived: false } : p));
  const deletePlan = id => writePlans(state.filter(p => p.id !== id));
  const reset = () => writePlans(planSeed());

  return { plans, updatePlan, addPlan, archivePlan, restorePlan, deletePlan, reset };
};

// ─── Override-codes store (tutoros.plancodes.v1) ─────────────────────────────────
const PLAN_CODES_KEY = 'tutoros.plancodes.v1';
const codeListeners = new Set();
const codesSeed = () => JSON.parse(JSON.stringify(window.PLAN_CODES_SEED || []));
const readCodes = () => {
  try { const raw = localStorage.getItem(PLAN_CODES_KEY); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } } catch (e) {}
  return codesSeed();
};
const writeCodes = next => {
  try { localStorage.setItem(PLAN_CODES_KEY, JSON.stringify(next)); } catch (e) {}
  codeListeners.forEach(fn => fn(next));
};

const planFindCode = str => {
  const norm = String(str || '').trim().toLowerCase();
  return readCodes().find(c => c.code.toLowerCase() === norm) || null;
};

// Validate + record a redemption. `planId` (optional) is the redeemer's current
// plan — used to enforce a code's plan restriction. Returns { ok, reason, code }.
const planRedeemCode = (str, account = '', planId = null) => {
  const norm = String(str || '').trim().toLowerCase();
  if (!norm) return { ok: false, reason: 'Enter a code' };
  const codes = readCodes();
  const idx = codes.findIndex(c => c.code.toLowerCase() === norm);
  if (idx < 0) return { ok: false, reason: 'That code isn’t recognised' };
  const code = codes[idx];
  if (code.status !== 'active') return { ok: false, reason: 'This code is no longer active' };
  if (code.planId && planId && code.planId !== planId) {
    const pn = (getPlan(code.planId) || {}).name || code.planId;
    return { ok: false, reason: `This code only applies to the ${pn} plan` };
  }
  const used = (code.redemptions || []).length;
  if (code.maxRedemptions != null && used >= code.maxRedemptions) return { ok: false, reason: 'This code has reached its redemption limit' };
  const next = codes.map((c, i) => i === idx ? { ...c, redemptions: [...(c.redemptions || []), { account: account || 'admin', at: planTodayIso() }] } : c);
  writeCodes(next);
  return { ok: true, code };
};

const usePlanCodesStore = () => {
  const [state, setState] = React.useState(readCodes);
  React.useEffect(() => { const fn = n => setState(n); codeListeners.add(fn); return () => { codeListeners.delete(fn); }; }, []);

  const createCode = (fields = {}) => {
    const code = (fields.code || ('PROMO-' + planRand(4))).toUpperCase().trim();
    if (state.some(c => c.code.toLowerCase() === code.toLowerCase())) return null;   // codes are unique
    const rec = {
      code, kind: fields.kind || 'free_trial', value: +fields.value || 0,
      durationMonths: Math.max(1, +fields.durationMonths || 1),
      planId: fields.planId || null,
      maxRedemptions: (fields.maxRedemptions === '' || fields.maxRedemptions == null) ? null : +fields.maxRedemptions,
      redemptions: [], status: 'active', note: fields.note || '', createdAt: planTodayIso(),
    };
    writeCodes([rec, ...state]);
    return rec;
  };
  const updateCode = (code, patch) => writeCodes(state.map(c => c.code === code ? { ...c, ...patch } : c));
  const setStatus  = (code, status) => updateCode(code, { status });
  const deleteCode = code => writeCodes(state.filter(c => c.code !== code));

  return { codes: state, createCode, updateCode, setStatus, deleteCode };
};

// ─── Derivation helpers (shared by superadmin + admin views) ─────────────────────
const planCodeSummary = code => {
  if (!code) return '';
  const mo = code.durationMonths || 0;
  const moLabel = mo === 1 ? '1 month' : `${mo} months`;
  if (code.kind === 'free_trial')  return `Free for ${moLabel}`;
  if (code.kind === 'percent_off') return `${code.value}% off for ${moLabel}`;
  if (code.kind === 'fixed_price') return `${planMoney(code.value)}/mo for ${moLabel}`;
  return '';
};
const planApplyCode = (basePrice, code) => {
  if (!code) return basePrice;
  if (code.kind === 'free_trial')  return 0;
  if (code.kind === 'percent_off') return Math.max(0, Math.round(basePrice * (1 - (code.value || 0) / 100)));
  if (code.kind === 'fixed_price') return Math.max(0, code.value || 0);
  return basePrice;
};
// Given the redeemed-code record stored on a subscription ({kind,value,durationMonths,appliedAt})
// plus the plan's base price, resolve the current effective price + expiry window.
const planOverrideStatus = (redeemed, basePrice = 0) => {
  if (!redeemed) return { active: false, expired: false, effectivePrice: basePrice, until: null, label: '' };
  const applied = new Date(redeemed.appliedAt || planTodayIso());
  const until = new Date(applied);
  until.setMonth(until.getMonth() + (redeemed.durationMonths || 0));
  const active = new Date() < until;
  return {
    active, expired: !active,
    effectivePrice: active ? planApplyCode(basePrice, redeemed) : basePrice,
    until, label: planCodeSummary(redeemed),
  };
};

const PLAN_CODE_KINDS = [
  { id: 'free_trial',  label: 'Free trial (£0)' },
  { id: 'percent_off', label: 'Percentage off' },
  { id: 'fixed_price', label: 'Fixed price override' },
];

// ─── Global free trial (tutoros.trial.v1) ────────────────────────────────────────
// One platform-wide offer, set by the platform owner in Platform Controls. Unlike an
// override CODE (issued to one centre, redeemed by hand) this applies automatically to
// EVERY new centre, so it's the promise the signup page and marketing site make.
// Same cross-instance-reactive pattern as the two stores above.
const PLAN_TRIAL_KEY = 'tutoros.trial.v1';
const planTrialListeners = new Set();
const PLAN_TRIAL_FALLBACK = { enabled: true, days: 14, planId: null, requireCard: false, onEnd: 'bill', updatedAt: null };
const planTrialSeed = () => JSON.parse(JSON.stringify(window.PLAN_TRIAL_SEED || PLAN_TRIAL_FALLBACK));
const planReadTrial = () => {
  let stored = null;
  try { const raw = localStorage.getItem(PLAN_TRIAL_KEY); if (raw) stored = JSON.parse(raw); } catch (e) { /* ignore */ }
  // Merge over the seed so a stored blob written before a new field existed still resolves.
  return { ...PLAN_TRIAL_FALLBACK, ...planTrialSeed(), ...(stored && typeof stored === 'object' ? stored : {}) };
};
const planWriteTrial = next => {
  try { localStorage.setItem(PLAN_TRIAL_KEY, JSON.stringify(next)); } catch (e) {}
  planTrialListeners.forEach(fn => fn(next));
};

// Non-hook live accessor (signup page, marketing copy, saPlatformDefaults).
const getPlatformTrial = () => planReadTrial();

const usePlatformTrialStore = () => {
  const [state, setState] = React.useState(planReadTrial);
  React.useEffect(() => { const fn = n => setState(n); planTrialListeners.add(fn); return () => { planTrialListeners.delete(fn); }; }, []);

  const updateTrial = patch => {
    const next = { ...state, ...patch, updatedAt: planTodayIso() };
    next.days = Math.max(1, Math.min(365, +next.days || 1));      // guardrail: 1–365 days
    planWriteTrial(next);
    return next;
  };
  const resetTrial = () => planWriteTrial(planTrialSeed());
  return { trial: state, updateTrial, resetTrial };
};

// What happens the day a trial expires. `label`/`desc` address the platform owner
// (Platform Controls); `tenant` is the same outcome told to the centre (Billing tab).
const PLAN_TRIAL_END_ACTIONS = [
  { id: 'bill',      label: 'Start billing the plan',      desc: 'The first invoice is raised automatically.',          tenant: 'your first invoice is raised' },
  { id: 'downgrade', label: 'Move to the cheapest plan',   desc: 'They keep access on the lowest-priced live plan.',    tenant: 'you move to the cheapest plan' },
  { id: 'suspend',   label: 'Pause access until they pay', desc: 'Read-only until a payment method is added.',          tenant: 'access pauses until you add a payment method' },
];
const planTrialEndAction = id => PLAN_TRIAL_END_ACTIONS.find(a => a.id === id) || PLAN_TRIAL_END_ACTIONS[0];

// Marketing / signup copy for the CURRENT global offer. Returns '' when trials are off
// so call sites can fall back to non-trial wording instead of promising one.
const planTrialOffer = (t = getPlatformTrial()) => (t && t.enabled) ? `${t.days}-day free trial` : '';
const planTrialPitch = (t = getPlatformTrial()) => {
  if (!t || !t.enabled) return '';
  return `${planTrialOffer(t)}${t.requireCard ? '' : ' — no card required'}`;
};

// Stamp the live offer onto a brand-new subscription. `fallbackPlanId` is the plan the
// centre picked at signup — used unless the offer is pinned to one plan. Returns null
// when trials are switched off (the caller then simply bills from day one).
const planStartTrial = (fallbackPlanId = null, t = getPlatformTrial()) => {
  if (!t || !t.enabled) return null;
  const started = new Date();
  const ends = new Date(started); ends.setDate(ends.getDate() + (t.days || 0));
  return {
    days: t.days, planId: t.planId || fallbackPlanId || null,
    startedAt: started.toISOString().slice(0, 10), endsAt: ends.toISOString().slice(0, 10),
    requireCard: !!t.requireCard, onEnd: t.onEnd || 'bill',
  };
};

// Resolve a stamped trial ({days,startedAt,endsAt,onEnd}) against today. Counted in
// whole days, not hours: `endsAt` is the FIRST BILLED day (start + days), so a 30-day
// trial started today reads "30 days left" and expires on that date — never 31.
const planDayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const planTrialStatus = stamp => {
  if (!stamp || !stamp.endsAt) return { active: false, expired: false, daysLeft: 0, endsAt: null, label: '', onEnd: 'bill' };
  const ends = planDayStart(stamp.endsAt + 'T00:00:00');
  const daysLeft = Math.max(0, Math.round((ends.getTime() - planDayStart(new Date()).getTime()) / 86400000));
  const active = daysLeft > 0;
  return {
    active, expired: !active, daysLeft, endsAt: ends, onEnd: stamp.onEnd || 'bill',
    label: active
      ? (daysLeft <= 1 ? 'Free trial — last day' : `Free trial — ${daysLeft} days left`)
      : 'Free trial ended',
  };
};

// ─── Global free-trial editor (superadmin → Platform Controls) ───────────────────
const PlanTrialModal = ({ open, trial, plans = [], onClose, onSave }) => {
  const blank = { enabled: true, days: 14, planId: '', requireCard: false, onEnd: 'bill' };
  const [d, setD] = React.useState(blank);
  React.useEffect(() => {
    if (open) setD(trial
      ? { enabled: !!trial.enabled, days: trial.days ?? 14, planId: trial.planId || '', requireCard: !!trial.requireCard, onEnd: trial.onEnd || 'bill' }
      : blank);
  }, [open, trial && trial.updatedAt]);

  const upd = (k, v) => setD(s => ({ ...s, [k]: v }));
  const days = Math.max(1, Math.min(365, +d.days || 1));
  const pinned = d.planId ? (plans.find(p => p.id === d.planId) || null) : null;
  const save = () => {
    onSave({ enabled: !!d.enabled, days, planId: d.planId || null, requireCard: !!d.requireCard, onEnd: d.onEnd });
    onClose && onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="zap" iconColor={DS.accent} width={560}
      title="Global free trial"
      subtitle="Applies automatically to every new centre — no code needed."
      footer={<>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" onClick={save}>Save trial</Btn>
      </>}>
      <Field label="Offer free trials" hint="Off means new centres are billed from day one.">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DS.sub, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!d.enabled} onChange={e => upd('enabled', e.target.checked)} />
          {d.enabled ? 'Every new centre starts on a free trial' : 'No free trial — bill immediately'}
        </label>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Trial length (days)" hint="1–365.">
          <Input type="number" min="1" max="365" value={d.days} onChange={e => upd('days', e.target.value)} disabled={!d.enabled} />
        </Field>
        <Field label="Trial runs on">
          <Select value={d.planId} onChange={e => upd('planId', e.target.value)} disabled={!d.enabled}>
            <option value="">The plan they choose</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="When the trial ends">
        <Select value={d.onEnd} onChange={e => upd('onEnd', e.target.value)} disabled={!d.enabled}>
          {PLAN_TRIAL_END_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>
      </Field>
      <Field label="Card up front" hint="Changes the promise made on the signup page.">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DS.sub, cursor: d.enabled ? 'pointer' : 'default', opacity: d.enabled ? 1 : 0.6 }}>
          <input type="checkbox" checked={!!d.requireCard} onChange={e => upd('requireCard', e.target.checked)} disabled={!d.enabled} />
          Require a payment method to start
          <span style={{ fontSize: 12, color: DS.faint }}>{d.requireCard ? '' : '(currently: no card needed)'}</span>
        </label>
      </Field>
      <div style={{
        marginTop: 4, padding: '10px 14px', borderRadius: 8,
        background: DS.accent + '0F', border: `1px solid ${DS.accent}33`,
        fontSize: 13, color: DS.text, display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <Icon name="zap" size={14} color={DS.accent} />
        <span>{d.enabled
          ? <>New centres get <b>{days} day{days === 1 ? '' : 's'} free</b>{pinned ? <> on <b>{pinned.name}</b></> : ' on the plan they choose'}
            {d.requireCard ? ', card taken up front' : ', no card required'}. Then: {planTrialEndAction(d.onEnd).label.toLowerCase()}.</>
          : <>Free trials are <b>off</b> — new centres are billed from day one.</>}</span>
      </div>
    </Modal>
  );
};

// ─── Plan editor modal (superadmin) ──────────────────────────────────────────────
const PlanEditorModal = ({ open, plan, onClose, onSave }) => {
  const blank = { name: '', price: 0, maxCentres: 1, studentSeats: 0, teacherSeats: 0, storageGb: 0, features: [] };
  const [d, setD] = React.useState(blank);
  React.useEffect(() => {
    if (open) setD(plan ? { ...blank, ...plan, features: [...(plan.features || [])] } : blank);
  }, [open, plan && plan.id]);

  const upd = (k, v) => setD(s => ({ ...s, [k]: v }));
  const setFeat = (i, v) => setD(s => ({ ...s, features: s.features.map((f, idx) => idx === i ? v : f) }));
  const addFeat = () => setD(s => ({ ...s, features: [...s.features, ''] }));
  const rmFeat = i => setD(s => ({ ...s, features: s.features.filter((_, idx) => idx !== i) }));
  const save = () => {
    onSave({
      ...d, price: +d.price || 0, maxCentres: +d.maxCentres || 1,
      studentSeats: +d.studentSeats || 0, teacherSeats: +d.teacherSeats || 0, storageGb: +d.storageGb || 0,
      features: d.features.map(f => f.trim()).filter(Boolean),
    });
    onClose && onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="invoice" iconColor={DS.accent} width={580}
      title={plan ? `Edit ${plan.name} plan` : 'New plan'}
      subtitle="Set the price and what this plan allows. Applies platform-wide."
      footer={<>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" onClick={save}>Save plan</Btn>
      </>}>
      <Field label="Plan name">
        <Input value={d.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Growth" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
        <Field label="Price (£ / month)">
          <Input type="number" min="0" value={d.price} onChange={e => upd('price', e.target.value)} />
        </Field>
        <Field label="Centres included">
          <Input type="number" min="1" value={d.maxCentres} onChange={e => upd('maxCentres', e.target.value)} />
        </Field>
        <Field label="Student seats / centre">
          <Input type="number" min="0" value={d.studentSeats} onChange={e => upd('studentSeats', e.target.value)} />
        </Field>
        <Field label="Teacher seats / centre">
          <Input type="number" min="0" value={d.teacherSeats} onChange={e => upd('teacherSeats', e.target.value)} />
        </Field>
        <Field label="Cloud storage (GB)">
          <Input type="number" min="0" value={d.storageGb} onChange={e => upd('storageGb', e.target.value)} />
        </Field>
      </div>
      <Field label="Features" hint="Shown on the plan card and pricing page.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input value={f} onChange={e => setFeat(i, e.target.value)} placeholder="Feature description" style={{ flex: 1 }} />
              <button onClick={() => rmFeat(i)} title="Remove" style={{
                background: 'none', border: `1px solid ${DS.border}`, borderRadius: 7, cursor: 'pointer',
                color: DS.faint, padding: 8, display: 'flex', flexShrink: 0,
              }}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Btn variant="secondary" small icon="plus" onClick={addFeat} style={{ alignSelf: 'flex-start' }}>Add feature</Btn>
        </div>
      </Field>
    </Modal>
  );
};

// ─── Override-code editor modal (superadmin) ─────────────────────────────────────
const PlanCodeModal = ({ open, code, plans = [], onClose, onSave }) => {
  const blank = { code: '', kind: 'free_trial', value: 0, durationMonths: 2, planId: '', maxRedemptions: '', note: '' };
  const [d, setD] = React.useState(blank);
  React.useEffect(() => {
    if (open) setD(code
      ? { ...blank, ...code, planId: code.planId || '', maxRedemptions: code.maxRedemptions == null ? '' : code.maxRedemptions }
      : blank);
  }, [open, code && code.code]);

  const upd = (k, v) => setD(s => ({ ...s, [k]: v }));
  const editing = !!code;
  const preview = planCodeSummary({ kind: d.kind, value: +d.value || 0, durationMonths: Math.max(1, +d.durationMonths || 1) });
  const save = () => { onSave({ ...d }); onClose && onClose(); };

  return (
    <Modal open={open} onClose={onClose} icon="zap" iconColor={DS.accent} width={560}
      title={editing ? `Edit code ${code.code}` : 'New override code'}
      subtitle="Give a centre a discounted or free price for a fixed window."
      footer={<>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" onClick={save}>{editing ? 'Save code' : 'Create code'}</Btn>
      </>}>
      <Field label="Code" hint={editing ? 'The code itself can’t be changed.' : 'Leave blank to auto-generate.'}>
        <Input value={d.code} onChange={e => upd('code', e.target.value.toUpperCase())} placeholder="e.g. WELCOME2MO" disabled={editing}
          style={editing ? { background: DS.surface, color: DS.muted } : undefined} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: d.kind === 'free_trial' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '0 16px' }}>
        <Field label="Type">
          <Select value={d.kind} onChange={e => upd('kind', e.target.value)}>
            {PLAN_CODE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </Select>
        </Field>
        {d.kind !== 'free_trial' && (
          <Field label={d.kind === 'percent_off' ? 'Percent off (%)' : 'Price (£ / month)'}>
            <Input type="number" min="0" value={d.value} onChange={e => upd('value', e.target.value)} />
          </Field>
        )}
        <Field label="Duration (months)">
          <Input type="number" min="1" value={d.durationMonths} onChange={e => upd('durationMonths', e.target.value)} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Restrict to plan">
          <Select value={d.planId} onChange={e => upd('planId', e.target.value)}>
            <option value="">Any plan</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Max redemptions" hint="Blank = unlimited.">
          <Input type="number" min="1" value={d.maxRedemptions} onChange={e => upd('maxRedemptions', e.target.value)} placeholder="∞" />
        </Field>
      </div>
      <Field label="Internal note" hint="Only visible to platform staff.">
        <Input value={d.note} onChange={e => upd('note', e.target.value)} placeholder="e.g. 2-month free trial for new centres" />
      </Field>
      {preview && (
        <div style={{
          marginTop: 4, padding: '10px 14px', borderRadius: 8,
          background: DS.accent + '0F', border: `1px solid ${DS.accent}33`,
          fontSize: 13, color: DS.text, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="zap" size={14} color={DS.accent} />
          <span>Redeeming this code gives a centre: <b>{preview}</b>.</span>
        </div>
      )}
    </Modal>
  );
};

Object.assign(window, {
  usePlansStore, getPlans, getPlan,
  usePlanCodesStore, planFindCode, planRedeemCode,
  planCodeSummary, planApplyCode, planOverrideStatus, planMoney,
  PLAN_CODE_KINDS, PlanEditorModal, PlanCodeModal,
  usePlatformTrialStore, getPlatformTrial, planStartTrial, planTrialStatus,
  planTrialOffer, planTrialPitch, planTrialEndAction, PLAN_TRIAL_END_ACTIONS, PlanTrialModal,
});
