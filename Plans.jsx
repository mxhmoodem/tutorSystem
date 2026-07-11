// ══════════════════════════════════════════════════════════════
//  Klasio — Plans & override codes (platform-wide)
// ══════════════════════════════════════════════════════════════
//
//  Single source of truth for the subscription PLAN CATALOGUE and the
//  superadmin's price-OVERRIDE CODES. Three consumers:
//    • SuperAdmin → Platform Controls  — edits plans + issues codes (SAControlsPage)
//    • admin subscription              — resolves the live plan (Centres.jsx useSubscriptionStore)
//    • admin → Settings → Billing      — change plan, redeem a code, save billing (Settings.jsx)
//
//  Loads after Settings.jsx and BEFORE SuperAdmin.jsx + Centres.jsx (index.html),
//  and after mocks/plans.mock.jsx (PLAN_CATALOG_SEED / PLAN_CODES_SEED).
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
});
