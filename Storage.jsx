// ══════════════════════════════════════════════════════════════
//  Klasio — Storage usage & quota (derive-don't-store)
// ══════════════════════════════════════════════════════════════
//
//  Adds an ACCOUNT layer above the centre (one paying account owns 1–20
//  centres; subscription/plan/quota attach to the account) and a storage
//  usage + quota system for two audiences, surfaced as new tabs inside the
//  EXISTING Settings page (no new page id):
//    • Owner (superadmin) → Storage  — R2 config (prototype), platform totals,
//      illustrative costs, all-centre usage table, pooled-vs-split control.
//    • Account Owner / Admin → Storage — account total, per-centre split,
//      per-category split, OneDrive-style upgrade path, suggest-first + guarded
//      delete with retention locks.
//
//  Frontend-only. There is NO real R2, no SDK, no network. The R2 panel persists
//  strings to localStorage and is labelled "Not connected (prototype)". EVERY
//  usage figure and cost is DERIVED live from file records on each render — no
//  running total is ever persisted (it would drift).
//
//  Loads AFTER Plans.jsx (getPlan) + Centres.jsx (useSubscriptionStore) and after
//  mocks/storage.mock.jsx. Non-IIFE global module (like Centres/Plans); every
//  top-level id is prefixed Stg / stg / STG to avoid colliding with other
//  globally-scoped text/babel scripts. Store is cross-instance reactive (mirrors
//  subListeners in Centres.jsx) so the Settings panel + sidebar meter agree.

// ─── Constants (adjust the labelled defaults from mocks/storage.mock.jsx) ────────
const STG_GB          = window.STORAGE_GB || (1024 * 1024 * 1024);
const STG_BLOCK_GB    = window.STORAGE_ADDON_BLOCK_GB || 100;
const STG_BLOCK_PRICE = window.STORAGE_ADDON_BLOCK_PRICE || 5;
// Product currency is £. R2's list rate is quoted in USD (~$0.015/GB); we show
// an illustrative GBP-equivalent so cost display matches the rest of the product.
const STG_UNIT_COST   = window.STORAGE_UNIT_COST_GBP_GB || 0.012;
const STG_SELF_ACCT   = window.STORAGE_SELF_ACCOUNT_ID || 'acc_brightminds';

// Category model. lock: true = retention-locked (never deletable here);
// false = eligible for guarded delete; 'archive' = regenerable (invoices —
// excluded from the delete UI, archive-not-delete).
const STG_CATEGORIES = [
  { id: 'submissions',          label: 'Student submissions',  lock: true,      color: () => DS.info,   icon: 'clip',
    note: 'Retained for assessment & audit — cannot be deleted here.' },
  { id: 'resources',            label: 'Teaching resources',   lock: false,     color: () => DS.accent, icon: 'folder',
    note: 'Worksheets, packs and videos you uploaded.' },
  { id: 'question_attachments', label: 'Question attachments', lock: false,     color: () => '#7C3AED', icon: 'image',
    note: 'Images and diagrams attached to questions.' },
  { id: 'invoices',             label: 'Generated invoices',   lock: 'archive', color: () => DS.muted,  icon: 'invoice',
    note: 'Regenerable records — archived, not deleted.' },
  { id: 'avatars',              label: 'Profile photos',       lock: false,     color: () => '#0891B2', icon: 'user',
    note: 'Staff and student profile pictures.' },
  { id: 'comms_attachments',    label: 'Message attachments',  lock: true,      color: () => '#DB2777', icon: 'message',
    note: 'Retained for safeguarding & audit — cannot be deleted here.' },
  { id: 'safeguarding',         label: 'Safeguarding records', lock: true,      color: () => DS.danger, icon: 'shield',
    note: 'Retained for safeguarding — cannot be deleted here.' },
];
const stgCat = id => STG_CATEGORIES.find(c => c.id === id) || { id, label: id, lock: false, color: () => DS.muted, icon: 'file' };
const stgIsDeletable = id => stgCat(id).lock === false;
const stgIsLocked    = id => stgCat(id).lock === true;

// ─── Store (tutoros.storage.v1, cross-instance reactive) ─────────────────────────
const STG_KEY = 'tutoros.storage.v1';
const stgListeners = new Set();

// Guarded, idempotent read+seed: file records are seeded ONCE. Once a blob is
// stored (incl. after an edit/delete) we keep it verbatim — the seed never
// overwrites real data. Defaults backfill onto older blobs via the spread.
const stgRead = () => {
  const base = {
    files: window.STORAGE_FILES_SEED || [],
    r2: { ...(window.STORAGE_R2_SEED || {}) },
    planModeDefaults: { starter: 'pooled', growth: 'pooled', scale: 'pooled' },
    accountOverrides: {},   // { [accountId]: { storageMode, addonBlocks } }
  };
  try {
    const raw = localStorage.getItem(STG_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        ...base, ...p,
        r2: { ...base.r2, ...(p.r2 || {}) },
        planModeDefaults: { ...base.planModeDefaults, ...(p.planModeDefaults || {}) },
        accountOverrides: { ...(p.accountOverrides || {}) },
        files: Array.isArray(p.files) ? p.files : base.files,
      };
    }
  } catch (e) { /* ignore */ }
  return base;
};
const stgWrite = next => {
  try { localStorage.setItem(STG_KEY, JSON.stringify(next)); } catch (e) {}
  stgListeners.forEach(fn => fn(next));
};

// ─── Pure derivation (NO stored totals — recompute on every render) ──────────────
const stgFiles = files => (Array.isArray(files) ? files : stgRead().files);
const stgSum = list => list.reduce((n, f) => n + (f.sizeBytes || 0), 0);

const stgUsageByCentre  = (centreId, files) => stgSum(stgFiles(files).filter(f => f.centreId === centreId));
const stgUsageByAccount = (accountId, files) => stgSum(stgFiles(files).filter(f => f.accountId === accountId));
const stgPlatformTotal  = (files) => stgSum(stgFiles(files));

// scope = { accountId } | { centreId } | array of files. Returns [{category,bytes}]
// for every category (0-filled), ordered like STG_CATEGORIES.
const stgUsageByCategory = (scope, files) => {
  let list = stgFiles(files);
  if (Array.isArray(scope)) list = scope;
  else if (scope && scope.centreId) list = list.filter(f => f.centreId === scope.centreId);
  else if (scope && scope.accountId) list = list.filter(f => f.accountId === scope.accountId);
  return STG_CATEGORIES.map(c => ({ category: c.id, bytes: stgSum(list.filter(f => f.category === c.id)) }));
};

// ─── Account resolution ──────────────────────────────────────────────────────────
const stgAccounts       = () => window.STORAGE_ACCOUNTS_SEED || [];
const stgAccountById    = id => stgAccounts().find(a => a.accountId === id) || null;
const stgAccountForCentre = centreId => stgAccounts().find(a => (a.centres || []).some(c => c.id === centreId)) || null;

// Resolved storage mode for an account: explicit override → the plan's default →
// pooled. planId lets the admin's LIVE plan (which may differ from the registry)
// drive the plan default.
const stgAccountMode = (accountId, planId) => {
  const st = stgRead();
  const ov = (st.accountOverrides[accountId] || {}).storageMode;
  if (ov === 'pooled' || ov === 'per_centre') return ov;
  const acc = stgAccountById(accountId);
  const pid = planId || (acc && acc.planId) || 'growth';
  return st.planModeDefaults[pid] || 'pooled';
};
const stgAddonBlocks = accountId => Math.max(0, (stgRead().accountOverrides[accountId] || {}).addonBlocks || 0);

// quotaForAccount = tierBase(plan) + addonBlocks × blockSize. Reads the LIVE plan
// catalogue so a superadmin storageGb edit re-derives the quota.
const stgQuotaForAccount = account => {
  if (!account) return 0;
  const plan = (window.getPlan && window.getPlan(account.planId)) || (window.PLANS && window.PLANS[account.planId]) || {};
  const baseGb = plan.storageGb || 0;
  const addon = (account.addonBlocks != null ? account.addonBlocks : stgAddonBlocks(account.accountId)) * STG_BLOCK_GB;
  return (baseGb + addon) * STG_GB;
};

// effectiveQuotaForCentre: pooled → the shared account pool; per-centre → the even
// split (accountQuota ÷ centreCount).
const stgEffectiveQuotaForCentre = (centreId, account) => {
  const acc = account || stgAccountForCentre(centreId);
  if (!acc) return 0;
  const pool = stgQuotaForAccount(acc);
  const mode = stgAccountMode(acc.accountId, acc.planId);
  if (mode === 'per_centre') {
    const n = (acc.centres || []).length || 1;
    return pool / n;
  }
  return pool;
};

const stgCostEstimate = bytes => (Math.max(0, bytes || 0) / STG_GB) * STG_UNIT_COST;   // £ / month (illustrative)

// Central upload guard. Respects storage mode: pooled enforces at the account
// pool, per-centre at the centre's split cap. Returns a rich result the UI can act
// on (block + prompt upgrade / add-on / free space).
const stgCanUpload = (centreId, sizeBytes, account) => {
  const acc = account || stgAccountForCentre(centreId);
  if (!acc) return { ok: true, reason: '', mode: 'pooled', used: 0, quota: 0, after: 0 };
  const mode = stgAccountMode(acc.accountId, acc.planId);
  const size = Math.max(0, sizeBytes || 0);
  if (mode === 'per_centre') {
    const used = stgUsageByCentre(centreId);
    const quota = stgEffectiveQuotaForCentre(centreId, acc);
    const after = used + size;
    return { ok: after <= quota, mode, used, quota, after,
      reason: after <= quota ? '' : `This centre’s ${stgFmtBytes(quota)} cap would be exceeded.` };
  }
  const used = stgUsageByAccount(acc.accountId);
  const quota = stgQuotaForAccount(acc);
  const after = used + size;
  return { ok: after <= quota, mode, used, quota, after,
    reason: after <= quota ? '' : `Your account’s ${stgFmtBytes(quota)} quota would be exceeded.` };
};

// ─── Formatting ──────────────────────────────────────────────────────────────────
function stgFmtBytes(b) {
  b = Math.max(0, b || 0);
  const MB = 1024 * 1024, KB = 1024;
  if (b >= STG_GB) return (b / STG_GB).toFixed(b >= 10 * STG_GB ? 1 : 2).replace(/\.?0+$/, '') + ' GB';
  if (b >= MB) return (b / MB).toFixed(b >= 10 * MB ? 0 : 1) + ' MB';
  if (b >= KB) return Math.round(b / KB) + ' KB';
  return Math.round(b) + ' B';
}
const stgFmtGb  = b => (Math.max(0, b || 0) / STG_GB);
const stgFmtGbp = n => '£' + (n || 0).toFixed(2);
const stgPct    = (used, total) => (total > 0 ? Math.min(100, (used / total) * 100) : 0);

// ─── Store hook ────────────────────────────────────────────────────────────────────
const useStorageStore = () => {
  const [state, setState] = React.useState(stgRead);
  React.useEffect(() => { const fn = n => setState(n); stgListeners.add(fn); return () => { stgListeners.delete(fn); }; }, []);

  const setR2         = patch => stgWrite({ ...state, r2: { ...state.r2, ...patch } });
  const setPlanMode   = (planId, mode) => stgWrite({ ...state, planModeDefaults: { ...state.planModeDefaults, [planId]: mode } });
  const setAccountMode = (accountId, mode) => stgWrite({
    ...state,
    accountOverrides: { ...state.accountOverrides, [accountId]: { ...(state.accountOverrides[accountId] || {}), storageMode: mode } },
  });
  const setAddonBlocks = (accountId, blocks) => stgWrite({
    ...state,
    accountOverrides: { ...state.accountOverrides, [accountId]: { ...(state.accountOverrides[accountId] || {}), addonBlocks: Math.max(0, blocks | 0) } },
  });
  const deleteFiles = ids => {
    const set = new Set(ids);
    // Guardrail: never delete retention-locked or archive (invoice) categories,
    // even if a caller passes their ids.
    stgWrite({ ...state, files: state.files.filter(f => !(set.has(f.fileId) && stgIsDeletable(f.category))) });
  };
  const addFile = rec => stgWrite({ ...state, files: [...state.files, { fileId: 'f_' + Date.now().toString(36), createdAt: new Date().toISOString().slice(0, 10), ...rec }] });

  return {
    ...state,
    accountMode: (id, planId) => {
      const ov = (state.accountOverrides[id] || {}).storageMode;
      if (ov === 'pooled' || ov === 'per_centre') return ov;
      const acc = stgAccountById(id); const pid = planId || (acc && acc.planId) || 'growth';
      return state.planModeDefaults[pid] || 'pooled';
    },
    addonBlocks: id => Math.max(0, (state.accountOverrides[id] || {}).addonBlocks || 0),
    setR2, setPlanMode, setAccountMode, setAddonBlocks, deleteFiles, addFile,
  };
};

// ─── Shared UI atoms (thin wrappers over the design system) ──────────────────────
const STG_PALETTE = ['#4F46E5', '#0891B2', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0EA5E9'];

// Titled section card matching Settings' SettingsSection look (which isn't exported).
const StgSection = ({ title, subtitle, icon, right, children, tone }) => (
  <Card style={{ marginBottom: 20 }}>
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && (
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: (tone || DS.accent) + '18', color: tone || DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </Card>
);

// Usage/progress bar with an optional over-quota (danger) state.
const StgBar = ({ used, total, height = 9, over }) => {
  const pct = stgPct(used, total);
  const danger = over || used > total;
  const near = !danger && pct >= 85;
  const color = danger ? DS.danger : near ? DS.warning : DS.accent;
  return (
    <div style={{ height, borderRadius: 99, background: DS.surface, overflow: 'hidden', border: `1px solid ${DS.border}` }}>
      <div style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.3s' }} />
    </div>
  );
};

// Stacked contribution bar (segments per centre/category) + used for pooled view.
const StgStackBar = ({ segments, total, height = 12 }) => (
  <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', background: DS.surface, border: `1px solid ${DS.border}` }}>
    {segments.filter(s => s.bytes > 0).map((s, i) => (
      <div key={s.key || i} title={`${s.label} · ${stgFmtBytes(s.bytes)}`}
        style={{ width: `${total > 0 ? (s.bytes / total) * 100 : 0}%`, background: s.color, transition: 'width 0.3s' }} />
    ))}
  </div>
);

const StgStat = ({ label, value, sub, tone }) => (
  <div style={{ minWidth: 120 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: tone || DS.text, marginTop: 3, letterSpacing: '-0.3px' }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: DS.muted, marginTop: 1 }}>{sub}</div>}
  </div>
);

// Category badge — deletable / retention-locked / archive, with a tooltip.
const StgCatBadge = ({ category }) => {
  const c = stgCat(category);
  if (c.lock === true) return <span title={c.note} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Badge variant="default"><Icon name="lock" size={11} /> Retention-locked</Badge></span>;
  if (c.lock === 'archive') return <span title={c.note}><Badge variant="info">Archive only</Badge></span>;
  return <span title={c.note}><Badge variant="success">Deletable</Badge></span>;
};

// ─── Category split list (shared by admin + owner) ───────────────────────────────
const StgCategorySplit = ({ rows, total, showBadge = true, onDelete }) => (
  <div>
    {rows.map((r, i) => {
      const c = stgCat(r.category);
      const pct = total > 0 ? (r.bytes / total) * 100 : 0;
      return (
        <div key={r.category} style={{ padding: '12px 0', borderBottom: i < rows.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: c.color() + '18', color: c.color(), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{c.label}</div>
            </div>
            {showBadge && <StgCatBadge category={r.category} />}
            <div style={{ width: 84, textAlign: 'right', fontSize: 13, fontWeight: 600, color: DS.sub }}>{stgFmtBytes(r.bytes)}</div>
            {onDelete && stgIsDeletable(r.category) && r.bytes > 0 && (
              <Btn small variant="ghost" icon="trash" onClick={() => onDelete(r.category)}>Review</Btn>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 99, background: DS.surface, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: c.color(), borderRadius: 99 }} />
          </div>
        </div>
      );
    })}
  </div>
);

// ══════════════════════════════════════════════════════════════
//  ADMIN / ACCOUNT-OWNER panel
// ══════════════════════════════════════════════════════════════
const StorageAdminPanel = () => {
  const sub = window.useSubscriptionStore ? window.useSubscriptionStore() : null;
  const store = useStorageStore();
  const [confirm, setConfirm] = React.useState(null);   // { category, ids, bytes }
  const [simSize, setSimSize] = React.useState(500);     // MB, for the upload guard demo

  if (!sub) return <div style={{ padding: 20, fontSize: 13, color: DS.muted }}>Storage isn’t available in this view.</div>;

  const accountId = STG_SELF_ACCT;
  const centres = (sub.centres || []).filter(c => c.status !== 'archived');
  // `centres` must be on the account object so per-centre mode splits the pool by
  // the right count (stgEffectiveQuotaForCentre reads account.centres.length).
  const account = { accountId, planId: sub.planId, addonBlocks: store.addonBlocks(accountId), centres: centres.map(c => ({ id: c.id, name: c.name })) };
  const mode = store.accountMode(accountId, sub.planId);
  const files = store.files.filter(f => f.accountId === accountId);
  const used = stgSum(files);
  const quota = stgQuotaForAccount(account);
  const pct = stgPct(used, quota);
  const over = used > quota;
  const near = !over && pct >= 85;
  const centreSegs = centres.map((c, i) => ({ key: c.id, label: c.name, bytes: stgUsageByCentre(c.id, files), color: STG_PALETTE[i % STG_PALETTE.length] }));
  const catRows = stgUsageByCategory({ accountId }, files);

  // Guarded-delete candidates: deletable-category files only, largest first.
  const deletable = files.filter(f => stgIsDeletable(f.category));
  const reclaimable = stgSum(deletable);
  const insights = React.useMemo(() => {
    const largest = [...deletable].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 5);
    const oldest = [...deletable].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).slice(0, 5);
    return { largest, oldest };
  }, [store.files]);

  const askDeleteCategory = (category) => {
    const ids = files.filter(f => f.category === category && stgIsDeletable(f.category)).map(f => f.fileId);
    const bytes = stgSum(files.filter(f => ids.includes(f.fileId)));
    setConfirm({ scope: 'category', category, ids, bytes });
  };
  const askDeleteItem = (f) => setConfirm({ scope: 'item', category: f.category, ids: [f.fileId], bytes: f.sizeBytes, name: f.name });
  const doDelete = () => { if (confirm) store.deleteFiles(confirm.ids); setConfirm(null); };

  const sim = stgCanUpload(centres[0] ? centres[0].id : 'bm', simSize * 1024 * 1024, account);

  return (
    <div>
      {/* Over-quota banner (uploads blocked) */}
      {over && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', marginBottom: 18, background: DS.dangerBg, border: `1px solid ${DS.dangerBorder}`, borderRadius: 10 }}>
          <Icon name="alert" size={18} color={DS.danger} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.danger }}>You’re over your storage quota — new uploads are blocked</div>
            <div style={{ fontSize: 12.5, color: DS.sub, marginTop: 2 }}>Using <b>{stgFmtBytes(used)}</b> of {stgFmtBytes(quota)}. Existing files stay readable. Upgrade your plan, buy an add-on block, or free up space below.</div>
          </div>
        </div>
      )}

      {/* Overview */}
      <StgSection
        title="Storage overview"
        subtitle={mode === 'pooled' ? 'Pooled across your centres — one shared account quota' : 'Split per centre — each centre has its own cap'}
        icon="cloud"
        right={<Badge variant={mode === 'pooled' ? 'accent' : 'info'}>{mode === 'pooled' ? 'Pooled' : 'Per-centre'}</Badge>}
      >
        {mode === 'pooled' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 26, fontWeight: 800, color: over ? DS.danger : DS.text, letterSpacing: '-0.5px' }}>{stgFmtBytes(used)}</span>
                <span style={{ fontSize: 14, color: DS.muted }}> of {stgFmtBytes(quota)} used</span>
              </div>
              <span style={{ fontSize: 12.5, color: DS.muted }}>Illustrative cost ≈ {stgFmtGbp(stgCostEstimate(used))}/mo</span>
            </div>
            <StgStackBar segments={centreSegs} total={quota} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12 }}>
              {centreSegs.map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: DS.sub }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                  {s.label}<span style={{ color: DS.muted }}>· {stgFmtBytes(s.bytes)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: DS.faint }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: DS.surface, border: `1px solid ${DS.border}` }} />
                Free · {stgFmtBytes(Math.max(0, quota - used))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {centres.map(c => {
              const u = stgUsageByCentre(c.id, files);
              const cap = stgEffectiveQuotaForCentre(c.id, account);
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: DS.text }}>{c.name}</span>
                    <span style={{ color: u > cap ? DS.danger : DS.muted }}>{stgFmtBytes(u)} / {stgFmtBytes(cap)}</span>
                  </div>
                  <StgBar used={u} total={cap} />
                </div>
              );
            })}
          </div>
        )}
      </StgSection>

      {/* Per-centre split */}
      <StgSection title="Per-centre split" subtitle="Each centre’s usage and share of your account pool" icon="grid">
        <Table
          cols={['Centre', 'Used', mode === 'pooled' ? '% of pool' : '% of cap', 'Illustrative cost']}
          rows={centres.map(c => {
            const u = stgUsageByCentre(c.id, files);
            const denom = mode === 'pooled' ? quota : stgEffectiveQuotaForCentre(c.id, account);
            return [
              <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{c.name}</span>,
              <span style={{ fontSize: 13, color: DS.sub }}>{stgFmtBytes(u)}</span>,
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: DS.surface, overflow: 'hidden' }}>
                  <div style={{ width: `${stgPct(u, denom)}%`, height: '100%', background: DS.accent, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: DS.muted, width: 38, textAlign: 'right' }}>{Math.round(stgPct(u, denom))}%</span>
              </div>,
              <span style={{ fontSize: 12.5, color: DS.muted }}>{stgFmtGbp(stgCostEstimate(u))}/mo</span>,
            ];
          })}
        />
      </StgSection>

      {/* Category split */}
      <StgSection title="What’s using your storage" subtitle="Breakdown by category — locked categories are retained for safeguarding & audit" icon="filter">
        <StgCategorySplit rows={catRows} total={used} onDelete={askDeleteCategory} />
      </StgSection>

      {/* Upgrade path (OneDrive-style) */}
      {(near || over) && (
        <StgSection title={over ? 'You’re out of space' : 'Running low on space'} subtitle="Get more room — takes effect immediately (prototype)" icon="zap" tone={over ? DS.danger : DS.warning}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, marginBottom: 4 }}>Upgrade your plan</div>
              <div style={{ fontSize: 12.5, color: DS.muted, marginBottom: 12 }}>A bigger plan raises your whole account quota. Manage in Plans & Billing.</div>
              <Btn small variant="primary" icon="chevron_r" onClick={() => window.__navigate && window.__navigate('admin', 'plans')}>Change plan</Btn>
            </div>
            <div style={{ border: `1px solid ${DS.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DS.text, marginBottom: 4 }}>Add a storage block</div>
              <div style={{ fontSize: 12.5, color: DS.muted, marginBottom: 12 }}>+{STG_BLOCK_GB} GB for £{STG_BLOCK_PRICE}/mo each. You have {store.addonBlocks(accountId)} block(s).</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small variant="primary" icon="plus" onClick={() => store.setAddonBlocks(accountId, store.addonBlocks(accountId) + 1)}>Buy +{STG_BLOCK_GB} GB</Btn>
                {store.addonBlocks(accountId) > 0 && <Btn small variant="secondary" onClick={() => store.setAddonBlocks(accountId, store.addonBlocks(accountId) - 1)}>Remove one</Btn>}
              </div>
            </div>
          </div>
        </StgSection>
      )}

      {/* Suggest-first + guarded delete */}
      <StgSection title="Free up space" subtitle="Suggestions first — only resources, question attachments and avatars can be deleted here" icon="trash">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14, borderRadius: 10, background: DS.accentLight, border: `1px solid ${DS.accentBorder}` }}>
          <Icon name="zap" size={16} color={DS.accent} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: DS.sub }}>
            You could reclaim up to <b>{stgFmtBytes(reclaimable)}</b> from deletable categories. Locked categories (submissions, message & safeguarding records) are retained and can’t be removed here.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Largest deletable items</div>
            {insights.largest.length === 0 && <div style={{ fontSize: 12.5, color: DS.muted }}>Nothing to reclaim.</div>}
            {insights.largest.map(f => <StgInsightRow key={f.fileId} f={f} onDelete={() => askDeleteItem(f)} />)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Oldest deletable items</div>
            {insights.oldest.length === 0 && <div style={{ fontSize: 12.5, color: DS.muted }}>Nothing to reclaim.</div>}
            {insights.oldest.map(f => <StgInsightRow key={f.fileId} f={f} onDelete={() => askDeleteItem(f)} showDate />)}
          </div>
        </div>
      </StgSection>

      {/* Upload guard demo (Part E — no real upload entry point uses this store yet) */}
      <StgSection title="Upload check" subtitle="How the quota guard responds before an upload is accepted" icon="upload">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: DS.sub }}>Simulate uploading a</span>
          <Input type="number" min="1" value={simSize} onChange={e => setSimSize(Math.max(1, +e.target.value || 1))} style={{ width: 90 }} />
          <span style={{ fontSize: 13, color: DS.sub }}>MB file to {centres[0] ? centres[0].name : 'this centre'}</span>
          <Badge variant={sim.ok ? 'success' : 'danger'}>{sim.ok ? 'Allowed' : 'Blocked'}</Badge>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: sim.ok ? DS.muted : DS.danger }}>
          {sim.ok
            ? `Would use ${stgFmtBytes(sim.after)} of ${stgFmtBytes(sim.quota)} (${mode === 'pooled' ? 'account pool' : 'centre cap'}).`
            : sim.reason + ' Upgrade, add a block, or free up space.'}
        </div>
      </StgSection>

      {/* Confirm delete modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} icon="trash" iconColor={DS.danger} width={480}
        title="Delete files?"
        subtitle={confirm ? (confirm.scope === 'item' ? confirm.name : `All ${stgCat(confirm.category).label.toLowerCase()}`) : ''}
        footer={<>
          <Btn variant="secondary" small onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="danger" small icon="trash" onClick={doDelete}>Delete & reclaim {confirm ? stgFmtBytes(confirm.bytes) : ''}</Btn>
        </>}>
        {confirm && (
          <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.55 }}>
            This permanently removes <b>{confirm.ids.length}</b> file{confirm.ids.length === 1 ? '' : 's'} and frees <b>{stgFmtBytes(confirm.bytes)}</b>. This can’t be undone.
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: DS.surface, border: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.muted }}>
              Only {stgCat(confirm.category).label.toLowerCase()} are affected — retention-locked categories are never touched.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// A single reclaim-candidate row.
const StgInsightRow = ({ f, onDelete, showDate }) => {
  const c = stgCat(f.category);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${DS.border}` }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: c.color() + '18', color: c.color(), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={c.icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name || c.label}</div>
        <div style={{ fontSize: 11, color: DS.muted }}>{showDate ? f.createdAt : c.label} · {f.uploadedBy}</div>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.sub, flexShrink: 0 }}>{stgFmtBytes(f.sizeBytes)}</span>
      <Btn small variant="ghost" icon="trash" onClick={onDelete} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  OWNER (Superadmin) panel
// ══════════════════════════════════════════════════════════════
const StorageOwnerPanel = () => {
  const store = useStorageStore();
  const accounts = stgAccounts();
  const [acctFilter, setAcctFilter] = React.useState('all');
  const [sortDesc, setSortDesc] = React.useState(true);
  const r2 = store.r2 || {};

  const total = stgSum(store.files);
  const centreCount = accounts.reduce((n, a) => n + (a.centres || []).length, 0);

  // Flatten to per-centre rows (with the account context) for the all-centre table.
  const rows = [];
  accounts.forEach(a => {
    const quota = stgQuotaForAccount({ accountId: a.accountId, planId: a.planId, addonBlocks: store.addonBlocks(a.accountId) });
    (a.centres || []).forEach(c => {
      const u = stgUsageByCentre(c.id, store.files);
      const topCat = stgUsageByCategory({ centreId: c.id }, store.files).filter(x => x.bytes > 0).sort((x, y) => y.bytes - x.bytes)[0];
      rows.push({ account: a, centre: c, used: u, pctOfPool: stgPct(u, quota), topCat });
    });
  });
  let tableRows = rows.filter(r => acctFilter === 'all' || r.account.accountId === acctFilter);
  tableRows = tableRows.sort((a, b) => sortDesc ? b.used - a.used : a.used - b.used);

  const plans = (window.getPlans && window.getPlans()) || [];

  return (
    <div>
      {/* Platform totals */}
      <StgSection title="Platform storage" subtitle="Derived live from all stored file records — no running total is kept" icon="chart">
        <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
          <StgStat label="Total stored" value={stgFmtBytes(total)} sub="across all accounts" />
          <StgStat label="Illustrative cost" value={stgFmtGbp(stgCostEstimate(total)) + '/mo'} sub={`@ £${STG_UNIT_COST}/GB · illustrative`} />
          <StgStat label="Accounts" value={accounts.length} sub="paying accounts" />
          <StgStat label="Centres" value={centreCount} sub="across all accounts" />
        </div>
      </StgSection>

      {/* Cloudflare R2 configuration (PROTOTYPE) */}
      <StgSection title="Cloudflare R2 configuration" icon="cloud"
        subtitle="Prototype config — stores values locally only. This is not a live connection."
        right={<Badge variant="warning"><Icon name="alert" size={11} /> Not connected (prototype)</Badge>}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16, borderRadius: 10, background: DS.warningBg, border: `1px solid ${DS.warningBorder}` }}>
          <Icon name="alert" size={15} color={DS.warning} />
          <span style={{ fontSize: 12.5, color: DS.sub }}>These fields are saved to local storage for the prototype only — no bucket is contacted and no credentials leave the browser.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
          <Field label="Bucket name"><Input value={r2.bucketName || ''} onChange={e => store.setR2({ bucketName: e.target.value })} placeholder="klasio-prod-eu" /></Field>
          <Field label="Region"><Input value={r2.region || ''} onChange={e => store.setR2({ region: e.target.value })} placeholder="auto" /></Field>
          <Field label="Jurisdiction">
            <Select value={r2.jurisdiction || 'EU'} onChange={e => store.setR2({ jurisdiction: e.target.value })}>
              <option value="EU">EU</option>
              <option value="FedRAMP">FedRAMP</option>
              <option value="default">Default</option>
            </Select>
          </Field>
          <Field label="Access key ID"><Input value={r2.accessKeyId || ''} onChange={e => store.setR2({ accessKeyId: e.target.value })} placeholder="prototype only" /></Field>
          <Field label="Secret access key" hint="Stored masked — prototype only.">
            <Input type="password" value={r2.secretMasked || ''} onChange={e => store.setR2({ secretMasked: e.target.value })} placeholder="••••••••" />
          </Field>
        </div>
      </StgSection>

      {/* Pooled-vs-split control */}
      <StgSection title="Pooled vs per-centre" icon="grid"
        subtitle="Set the default storage mode per plan, and override it per account. Changing an account re-derives what its admins see.">
        <div style={{ fontSize: 12, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Default per plan</div>
        {plans.filter(p => !p.archived).map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: `1px solid ${DS.border}` }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{p.name}</div>
              <div style={{ fontSize: 12, color: DS.muted }}>{p.storageGb || 0} GB base · {p.maxCentres} centre{p.maxCentres === 1 ? '' : 's'}</div>
            </div>
            <Segmented value={store.planModeDefaults[p.id] || 'pooled'} onChange={v => store.setPlanMode(p.id, v)}
              options={[{ id: 'pooled', label: 'Pooled' }, { id: 'per_centre', label: 'Per-centre' }]} />
          </div>
        ))}

        <div style={{ fontSize: 12, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '18px 0 10px' }}>Per-account override</div>
        {accounts.map(a => {
          const ov = (store.accountOverrides[a.accountId] || {}).storageMode || 'default';
          return (
            <div key={a.accountId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: `1px solid ${DS.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>{a.name}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>{(window.getPlan && (window.getPlan(a.planId) || {}).name) || a.planId} · effective: <b>{stgAccountMode(a.accountId, a.planId) === 'pooled' ? 'Pooled' : 'Per-centre'}</b></div>
              </div>
              <Segmented value={ov} onChange={v => store.setAccountMode(a.accountId, v)}
                options={[{ id: 'default', label: 'Use plan default' }, { id: 'pooled', label: 'Pooled' }, { id: 'per_centre', label: 'Per-centre' }]} />
            </div>
          );
        })}
      </StgSection>

      {/* All-centre usage table */}
      <StgSection title="All-centre usage" icon="list"
        subtitle="Per account → per centre: size, share of the account pool, top category and illustrative cost."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={acctFilter} onChange={e => setAcctFilter(e.target.value)} style={{ width: 180 }}>
              <option value="all">All accounts</option>
              {accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
            </Select>
            <Btn small variant="secondary" icon={sortDesc ? 'trending_dn' : 'trending_up'} onClick={() => setSortDesc(s => !s)}>Size</Btn>
          </div>
        }>
        <Table
          cols={['Account', 'Centre', 'Size', '% of pool', 'Top category', 'Cost / mo']}
          rows={tableRows.map(r => [
            <span style={{ fontSize: 12.5, color: DS.muted }}>{r.account.name}</span>,
            <span style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{r.centre.name}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>{stgFmtBytes(r.used)}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: DS.surface, overflow: 'hidden' }}>
                <div style={{ width: `${r.pctOfPool}%`, height: '100%', background: DS.accent, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 12, color: DS.muted, width: 34, textAlign: 'right' }}>{Math.round(r.pctOfPool)}%</span>
            </div>,
            r.topCat ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DS.sub }}><Icon name={stgCat(r.topCat.category).icon} size={13} color={stgCat(r.topCat.category).color()} />{stgCat(r.topCat.category).label}</span> : <span style={{ color: DS.faint }}>—</span>,
            <span style={{ fontSize: 12.5, color: DS.muted }}>{stgFmtGbp(stgCostEstimate(r.used))}</span>,
          ])}
        />
      </StgSection>
    </div>
  );
};

// ─── Exports ───────────────────────────────────────────────────────────────────────
Object.assign(window, {
  // stores + derivation
  useStorageStore,
  stgUsageByCentre, stgUsageByAccount, stgUsageByCategory, stgPlatformTotal,
  stgQuotaForAccount, stgEffectiveQuotaForCentre, stgCostEstimate, stgCanUpload,
  stgAccounts, stgAccountById, stgAccountForCentre, stgAccountMode, stgAddonBlocks,
  stgFmtBytes, stgFmtGb, stgFmtGbp,
  STG_CATEGORIES, STG_SELF_ACCT, STG_BLOCK_GB,
  // panels (consumed by Settings.jsx tab registry)
  StorageOwnerPanel, StorageAdminPanel,
});
