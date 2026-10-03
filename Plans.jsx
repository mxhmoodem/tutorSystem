// ══════════════════════════════════════════════════════════════
//  Klasio — Plans & override codes (platform-wide)
// ══════════════════════════════════════════════════════════════
//
//  Single source of truth for the subscription PLAN CATALOGUE (centre AND solo
//  plans — `audience`), the superadmin's price-OVERRIDE CODES and the FREE TRIAL
//  offered to each audience. Consumers:
//    • SuperAdmin → Pricing            — edits plans, trials and codes (SAPricingPage)
//    • admin subscription              — resolves the live plan + trial (Centres.jsx useSubscriptionStore)
//    • admin → Plans & Billing         — change plan, redeem a code, save billing (Settings.jsx)
//    • public signup                   — lists the sellable centre plans + promises the centre trial (Auth.jsx)
//    • solo demo                       — soloCapabilities.jsx seeds the solo plans and reads them back
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

// ─── Capabilities (decision #25) ─────────────────────────────────────────────────
// The machine-checked keys a plan can unlock — the same list as `plans.capabilities`
// in the data-layer reference. Anything a plan GATES is one of these; pricing-page
// bullets are separate display copy and gate nothing. Safeguarding, guardian and
// health records are never here — they are on every plan.
const PLAN_CAPABILITIES = [
  { key: 'group_lessons',     label: 'Group lessons' },
  { key: 'lesson_planner',    label: 'Lesson planner' },
  { key: 'tracking',          label: 'Tracking' },
  { key: 'homework',          label: 'Homework' },
  { key: 'homework_bank',     label: 'Homework bank' },
  { key: 'reports',           label: 'Student reports' },
  { key: 'report_rules',      label: 'Report rules' },
  { key: 'at_risk_flags',     label: 'At-risk flags' },
  { key: 'payment_reminders', label: 'Payment reminders' },
  { key: 'vat',               label: 'VAT on invoices' },
  { key: 'analytics_exports', label: 'Analytics exports' },
  { key: 'waiting_list',      label: 'Waiting list' },
];

// ─── Audiences ───────────────────────────────────────────────────────────────────
// Every plan is sold to one audience (`plans.audience`): centre accounts, or solo
// tutors. Only plans matching an account's kind are ever offered to it.
const PLAN_AUDIENCES = [
  { id: 'centre', label: 'Centres',     noun: 'centre',      nouns: 'centres' },
  { id: 'solo',   label: 'Solo tutors', noun: 'solo tutor',  nouns: 'solo tutors' },
];
const planAudience = id => PLAN_AUDIENCES.find(a => a.id === id) || PLAN_AUDIENCES[0];

// ─── Plan catalogue store (tutoros.plans.v1) ─────────────────────────────────────
const PLAN_STORE_KEY = 'tutoros.plans.v1';
const planListeners = new Set();
// Centre plans come from mocks/plans.mock.jsx; solo plans from soloCapabilities.jsx,
// the one file that names solo tier ids (it loads later — this runs at read time).
const planSeed = () => JSON.parse(JSON.stringify([
  ...(window.PLAN_CATALOG_SEED || []),
  ...(typeof window.soloPlanSeed === 'function' ? window.soloPlanSeed() : []),
]));
// Bring a stored plan up to the current shape: a blob saved before capabilities /
// bullets / the Stripe link / audiences / yearly prices existed takes them from
// the seed plan of the same id (old free-text `features` become bullets — they
// were display copy all along).
const planNormalize = (p, seeds) => {
  const seed = (seeds || planSeed()).find(s => s.id === p.id) || {};
  const pick = (k, fallback) => (p[k] !== undefined ? p[k] : (seed[k] !== undefined ? seed[k] : fallback));
  const out = {
    ...p,
    audience: p.audience || seed.audience || 'centre',
    tagline: pick('tagline', ''),
    priceYearly: pick('priceYearly', 0),   // a plan made before yearly prices offers none
    maxInvoicesPerMonth: pick('maxInvoicesPerMonth', null),
    capabilities: p.capabilities || seed.capabilities || {},
    bullets: p.bullets || p.features || seed.bullets || [],
    stripePriceId: pick('stripePriceId', null),
    stripePrice: pick('stripePrice', null),
    stripePriceIdYearly: pick('stripePriceIdYearly', null),
    stripePriceYearly: pick('stripePriceYearly', null),
  };
  delete out.features;
  return out;
};
const readPlans = () => {
  try {
    const raw = localStorage.getItem(PLAN_STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const seeds = planSeed();
        const plans = arr.map(p => planNormalize(p, seeds));
        // A catalogue saved before plans had audiences holds centre plans only: add
        // the solo plans. Once any plan is saved with an audience this never runs
        // again, so deleting a solo plan later sticks.
        if (!arr.some(p => p.audience)) seeds.filter(s => s.audience === 'solo' && !plans.some(x => x.id === s.id)).forEach(s => plans.push(s));
        return plans;
      }
    }
  } catch (e) { /* ignore */ }
  return planSeed();
};
const writePlans = next => {
  try { localStorage.setItem(PLAN_STORE_KEY, JSON.stringify(next)); } catch (e) {}
  planListeners.forEach(fn => fn(next));
  // Non-React listeners (the solo demo's model) rebuild from the new catalogue.
  window.dispatchEvent(new Event('klasio-plans-changed'));
};

// Non-hook accessors — read live so the subscription store + sidebar `planUsage`
// pick up superadmin edits (fall back to the back-compat PLANS global). Pass an
// audience to get only that audience's plans.
const getPlans = (audience) => [...readPlans()]
  .filter(p => !audience || p.audience === audience)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const getPlan = id => readPlans().find(p => p.id === id) || (window.PLANS && window.PLANS[id]) || null;

const usePlansStore = () => {
  const [state, setState] = React.useState(readPlans);
  React.useEffect(() => { const fn = n => setState(n); planListeners.add(fn); return () => { planListeners.delete(fn); }; }, []);

  const plans = [...state].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const updatePlan = (id, patch) => writePlans(state.map(p => p.id === id ? { ...p, ...patch } : p));
  const addPlan = (fields = {}) => {
    const id = (fields.id || (fields.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16)) || ('plan' + planRand(3).toLowerCase());
    if (state.some(p => p.id === id)) return null;            // ids are unique
    const audience = fields.audience || 'centre';
    const plan = {
      id, audience, name: fields.name || 'New plan', tagline: fields.tagline || '',
      price: +fields.price || 0, priceYearly: +fields.priceYearly || 0,
      maxCentres: +fields.maxCentres || 1, studentSeats: +fields.studentSeats || 0, teacherSeats: +fields.teacherSeats || 0,
      storageGb: +fields.storageGb || 0, maxInvoicesPerMonth: fields.maxInvoicesPerMonth ?? null,
      capabilities: fields.capabilities || {}, bullets: fields.bullets || [],
      // Not sellable until a Stripe price exists (unless it's free).
      stripePriceId: null, stripePrice: null, stripePriceIdYearly: null, stripePriceYearly: null,
      // New plans go to the end of their own audience's list.
      order: Math.max(audience === 'solo' ? 9 : -1, ...state.filter(p => p.audience === audience).map(p => p.order ?? 0)) + 1,
      archived: false,
    };
    writePlans([...state, plan]);
    return plan;
  };
  const archivePlan = id => writePlans(state.map(p => p.id === id ? { ...p, archived: true } : p));
  const restorePlan = id => writePlans(state.map(p => p.id === id ? { ...p, archived: false } : p));
  const deletePlan = id => writePlans(state.filter(p => p.id !== id));
  const reset = () => writePlans(planSeed());
  // Stripe Prices are immutable: a new catalogue price needs a NEW Stripe price,
  // never an edit. Prototype stand-in for POST /v1/admin/plans/:id/stripe-prices.
  // New customers get it; existing subscribers stay on their old price unless
  // they're given 30 days' notice and moved deliberately.
  const createStripePrice = id => {
    const plan = state.find(p => p.id === id);
    if (!plan) return null;
    const fresh = () => `price_${planRand(14, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
    // One Stripe Price per paid cycle; a cycle that is free (or not offered) has none.
    const patch = {
      stripePriceId: +plan.price > 0 ? fresh() : null, stripePrice: +plan.price > 0 ? +plan.price : null,
      stripePriceIdYearly: +plan.priceYearly > 0 ? fresh() : null, stripePriceYearly: +plan.priceYearly > 0 ? +plan.priceYearly : null,
    };
    writePlans(state.map(p => p.id === id ? { ...p, ...patch } : p));
    return patch;
  };

  return { plans, updatePlan, addPlan, archivePlan, restorePlan, deletePlan, reset, createStripePrice };
};

// Does the catalogue agree with Stripe? Derived, never stored, checked per cycle.
//   free          — nothing to charge, so nothing in Stripe (e.g. Solo Free)
//   not_in_stripe — a paid cycle has no Stripe price yet
//   price_changed — a price moved in the catalogue; Stripe still charges the old one
//   synced        — what the pricing page shows is what Stripe charges
const planStripeState = (plan) => {
  if (!plan) return { id: 'not_in_stripe', label: 'Not in Stripe', tone: 'danger', cycles: [] };
  const cycles = [
    { id: 'monthly', price: +plan.price || 0, priceId: plan.stripePriceId, charged: plan.stripePrice },
    { id: 'yearly', price: +plan.priceYearly || 0, priceId: plan.stripePriceIdYearly, charged: plan.stripePriceYearly },
  ].filter(c => c.price > 0);
  if (!cycles.length) return { id: 'free', label: 'Free — no Stripe price needed', tone: 'default', cycles: [] };
  const missing = cycles.filter(c => !c.priceId);
  if (missing.length) return { id: 'not_in_stripe', label: missing.length === cycles.length ? 'Not in Stripe' : `No ${missing[0].id} Stripe price`, tone: 'danger', cycles: missing };
  const moved = cycles.filter(c => +c.charged !== c.price);
  if (moved.length) return { id: 'price_changed', label: `${moved.length === 2 ? 'Prices' : moved[0].id === 'monthly' ? 'Monthly price' : 'Yearly price'} changed — not live in Stripe`, tone: 'warning', cycles: moved };
  return { id: 'synced', label: 'Live in Stripe', tone: 'success', cycles: [] };
};
// A plan is offered at signup and checkout only while Stripe would charge exactly
// the prices we show (or there is nothing to charge).
const planIsSellable = (plan) => !!plan && !plan.archived && ['synced', 'free'].includes(planStripeState(plan).id);
// The public catalogue for one audience — the prototype twin of GET /v1/plans.
const getPublicPlans = (audience = 'centre') => getPlans(audience).filter(planIsSellable);

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

// ─── Free trials (tutoros.trial.v1) — one offer per audience ─────────────────────
// Set by the platform owner on the Pricing page. Unlike an override CODE (issued to
// one account, redeemed by hand) a trial applies automatically to EVERY new account
// of its audience, so it's the promise the signup page and marketing site make.
// One offer per audience because one offer can't be pinned to a plan both audiences
// can buy. Same cross-instance-reactive pattern as the two stores above.
const PLAN_TRIAL_KEY = 'tutoros.trial.v1';
const planTrialListeners = new Set();
const PLAN_TRIAL_FALLBACK = { enabled: true, days: 14, planId: null, requireCard: false, onEnd: 'bill', updatedAt: null };
const planTrialSeed = () => JSON.parse(JSON.stringify(window.PLAN_TRIAL_SEED || { centre: PLAN_TRIAL_FALLBACK, solo: PLAN_TRIAL_FALLBACK }));
const planReadTrials = () => {
  let stored = null;
  try { const raw = localStorage.getItem(PLAN_TRIAL_KEY); if (raw) stored = JSON.parse(raw); } catch (e) { /* ignore */ }
  const seed = planTrialSeed();
  // A blob saved before trials were per audience is the one centre offer.
  if (stored && typeof stored === 'object' && !stored.centre && !stored.solo) stored = { centre: stored };
  const out = {};
  PLAN_AUDIENCES.forEach(a => {
    // Merge over the seed so a stored offer written before a new field existed still resolves.
    out[a.id] = { ...PLAN_TRIAL_FALLBACK, ...(seed[a.id] || {}), ...((stored && stored[a.id]) || {}) };
  });
  return out;
};
const planWriteTrials = next => {
  try { localStorage.setItem(PLAN_TRIAL_KEY, JSON.stringify(next)); } catch (e) {}
  planTrialListeners.forEach(fn => fn(next));
};

// Non-hook live accessor (signup page, marketing copy, saPlatformDefaults).
const getPlatformTrial = (audience = 'centre') => planReadTrials()[audience] || planReadTrials().centre;

const usePlatformTrialStore = () => {
  const [state, setState] = React.useState(planReadTrials);
  React.useEffect(() => { const fn = n => setState(n); planTrialListeners.add(fn); return () => { planTrialListeners.delete(fn); }; }, []);

  const updateTrial = (audience, patch) => {
    const next = { ...state[audience], ...patch, updatedAt: planTodayIso() };
    next.days = Math.max(1, Math.min(365, +next.days || 1));      // guardrail: 1–365 days
    planWriteTrials({ ...state, [audience]: next });
    return next;
  };
  const resetTrial = () => planWriteTrials(planTrialSeed());
  return { trials: state, trial: state.centre, updateTrial, resetTrial };
};

// What happens the day a trial expires. `label`/`desc` address the platform owner
// (Pricing page); `tenant` is the same outcome told to the account (Billing tab).
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

// ─── Free-trial editor (superadmin → Pricing), one audience at a time ────────────
const PlanTrialModal = ({ open, trial, plans = [], audience = 'centre', onClose, onSave }) => {
  const aud = planAudience(audience);
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
      title={`Free trial for ${aud.nouns}`}
      subtitle={`Applies automatically to every new ${aud.noun} — no code needed.`}
      footer={<>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" onClick={save}>Save trial</Btn>
      </>}>
      <Field label="Offer free trials" hint={`Off means new ${aud.nouns} are billed from day one.`}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: DS.sub, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!d.enabled} onChange={e => upd('enabled', e.target.checked)} />
          {d.enabled ? `Every new ${aud.noun} starts on a free trial` : 'No free trial — bill immediately'}
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
          ? <>New {aud.nouns} get <b>{days} day{days === 1 ? '' : 's'} free</b>{pinned ? <> on <b>{pinned.name}</b></> : ' on the plan they choose'}
            {d.requireCard ? ', card taken up front' : ', no card required'}. Then: {planTrialEndAction(d.onEnd).label.toLowerCase()}.</>
          : <>Free trials are <b>off</b> — new {aud.nouns} are billed from day one.</>}</span>
      </div>
    </Modal>
  );
};

// ─── Plan editor modal (superadmin) ──────────────────────────────────────────────
// Two lists, deliberately separate: CAPABILITIES are what the plan unlocks (checked
// by the app), BULLETS are what the pricing page says (checked by nobody). The
// limits differ by audience: a centre plan counts centres and per-centre seats, a
// solo plan counts students and invoices for its one tutor.
const PlanEditorModal = ({ open, plan, audience: audienceProp = 'centre', onClose, onSave }) => {
  const audience = (plan && plan.audience) || audienceProp;
  const solo = audience === 'solo';
  const blank = { audience, name: '', tagline: '', price: 0, priceYearly: 0, maxCentres: 1, studentSeats: 0, teacherSeats: solo ? 1 : 0, storageGb: 0, maxInvoicesPerMonth: '', capabilities: {}, bullets: [] };
  const [d, setD] = React.useState(blank);
  React.useEffect(() => {
    if (open) setD(plan
      ? { ...blank, ...plan, maxInvoicesPerMonth: plan.maxInvoicesPerMonth == null ? '' : plan.maxInvoicesPerMonth, capabilities: { ...(plan.capabilities || {}) }, bullets: [...(plan.bullets || [])] }
      : blank);
  }, [open, plan && plan.id, audience]);

  const upd = (k, v) => setD(s => ({ ...s, [k]: v }));
  const setCap = (k) => setD(s => ({ ...s, capabilities: { ...s.capabilities, [k]: !s.capabilities[k] } }));
  const setBullet = (i, v) => setD(s => ({ ...s, bullets: s.bullets.map((f, idx) => idx === i ? v : f) }));
  const addBullet = () => setD(s => ({ ...s, bullets: [...s.bullets, ''] }));
  const rmBullet = i => setD(s => ({ ...s, bullets: s.bullets.filter((_, idx) => idx !== i) }));
  const priceMoved = plan && (+d.price !== +plan.price || +d.priceYearly !== +(plan.priceYearly || 0));
  const monthsFree = +d.price > 0 && +d.priceYearly > 0 ? Math.round(12 - (+d.priceYearly) / (+d.price)) : null;
  const save = () => {
    onSave({
      ...d, audience, name: d.name.trim() || 'New plan', tagline: (d.tagline || '').trim(),
      price: +d.price || 0, priceYearly: +d.priceYearly || 0,
      maxCentres: solo ? 1 : (+d.maxCentres || 1),
      studentSeats: +d.studentSeats || 0, teacherSeats: solo ? 1 : (+d.teacherSeats || 0), storageGb: +d.storageGb || 0,
      maxInvoicesPerMonth: d.maxInvoicesPerMonth === '' || d.maxInvoicesPerMonth == null ? null : Math.max(0, +d.maxInvoicesPerMonth),
      capabilities: PLAN_CAPABILITIES.reduce((o, c) => ({ ...o, [c.key]: !!d.capabilities[c.key] }), {}),
      bullets: d.bullets.map(f => f.trim()).filter(Boolean),
    });
    onClose && onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="invoice" iconColor={DS.accent} width={620}
      title={plan ? `Edit ${plan.name} plan` : `New ${solo ? 'solo tutor' : 'centre'} plan`}
      subtitle={`What this ${solo ? 'solo tutor' : 'centre'} plan is: its prices, limits, what it unlocks, and how the pricing page describes it.`}
      footer={<>
        <Btn variant="secondary" small onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" small icon="check" onClick={save}>Save plan</Btn>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '0 18px' }}>
        <Field label="Plan name">
          <Input value={d.name} onChange={e => upd('name', e.target.value)} placeholder={solo ? 'e.g. Solo Pro' : 'e.g. Growth'} />
        </Field>
        <Field label="Who it's for" hint="One line under the plan name on pricing cards.">
          <Input value={d.tagline} onChange={e => upd('tagline', e.target.value)} placeholder={solo ? 'e.g. A full book, run tightly' : 'e.g. Growing groups of centres'} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
        <Field label="Price (£ / month)" hint={priceMoved ? 'Not live until you create new Stripe prices. Existing subscribers keep theirs.' : '0 for a free plan.'}>
          <Input type="number" min="0" value={d.price} onChange={e => upd('price', e.target.value)} />
        </Field>
        <Field label="Price (£ / year)" hint={monthsFree != null ? (monthsFree > 0 ? `${monthsFree} month${monthsFree === 1 ? '' : 's'} free against monthly` : 'No saving against monthly') : '0 if there is no yearly option.'}>
          <Input type="number" min="0" value={d.priceYearly} onChange={e => upd('priceYearly', e.target.value)} />
        </Field>
        {solo ? <>
          <Field label="Students">
            <Input type="number" min="1" value={d.studentSeats} onChange={e => upd('studentSeats', e.target.value)} />
          </Field>
          <Field label="Invoices a month" hint="Blank = unlimited.">
            <Input type="number" min="0" value={d.maxInvoicesPerMonth} onChange={e => upd('maxInvoicesPerMonth', e.target.value)} placeholder="Unlimited" />
          </Field>
        </> : <>
          <Field label="Centres included">
            <Input type="number" min="1" value={d.maxCentres} onChange={e => upd('maxCentres', e.target.value)} />
          </Field>
          <Field label="Student seats / centre">
            <Input type="number" min="0" value={d.studentSeats} onChange={e => upd('studentSeats', e.target.value)} />
          </Field>
          <Field label="Teacher seats / centre">
            <Input type="number" min="0" value={d.teacherSeats} onChange={e => upd('teacherSeats', e.target.value)} />
          </Field>
        </>}
        <Field label="Cloud storage (GB)">
          <Input type="number" min="0" step="0.25" value={d.storageGb} onChange={e => upd('storageGb', e.target.value)} />
        </Field>
      </div>
      <Field label="Capabilities" hint="What this plan unlocks — the app checks these. Safeguarding, guardians and health records are on every plan and are never listed here.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {PLAN_CAPABILITIES.map(c => {
            const on = !!d.capabilities[c.key];
            return (
              <button key={c.key} type="button" onClick={() => setCap(c.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${on ? DS.accentBorder : DS.border}`, background: on ? DS.accentLight : DS.bg, color: on ? DS.text : DS.muted, fontSize: 12,
              }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${on ? DS.accent : DS.borderDark}`, background: on ? DS.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Icon name="check" size={10} color="#fff" />}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Pricing-page bullets" hint="Display copy for the plan cards and the marketing site. Gates nothing — if you change a limit above, update the bullet that states it.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.bullets.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input value={f} onChange={e => setBullet(i, e.target.value)} placeholder="e.g. Lesson planner & student reports" style={{ flex: 1 }} />
              <button onClick={() => rmBullet(i)} title="Remove" style={{
                background: 'none', border: `1px solid ${DS.border}`, borderRadius: 7, cursor: 'pointer',
                color: DS.faint, padding: 8, display: 'flex', flexShrink: 0,
              }}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Btn variant="secondary" small icon="plus" onClick={addBullet} style={{ alignSelf: 'flex-start' }}>Add bullet</Btn>
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
      subtitle="Give an account a discounted or free price for a fixed window."
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
            {PLAN_AUDIENCES.map(a => {
              const group = plans.filter(p => (p.audience || 'centre') === a.id);
              return group.length ? <optgroup key={a.id} label={a.label}>{group.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup> : null;
            })}
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
  usePlansStore, getPlans, getPlan, getPublicPlans,
  PLAN_CAPABILITIES, PLAN_AUDIENCES, planAudience, planStripeState, planIsSellable,
  usePlanCodesStore, planFindCode, planRedeemCode,
  planCodeSummary, planApplyCode, planOverrideStatus, planMoney,
  PLAN_CODE_KINDS, PlanEditorModal, PlanCodeModal,
  usePlatformTrialStore, getPlatformTrial, planStartTrial, planTrialStatus,
  planTrialOffer, planTrialPitch, planTrialEndAction, PLAN_TRIAL_END_ACTIONS, PlanTrialModal,
});
