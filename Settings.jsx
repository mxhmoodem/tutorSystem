// ══════════════════════════════════════════════════════════════
//  TutorOS — Settings
//  One tabbed Settings page per role. The first few tabs ("Account",
//  "Notifications", "Appearance") are common to *every* role; the final
//  tab is role-specific:
//    superadmin → Platform Defaults   (new-centre defaults, billing, retention)
//    admin      → Centre              (centre profile, branding, term, invoicing)
//    teacher    → Teaching            (homework/grading defaults, availability)
//    student    → Learning            (guardian, accessibility, reminders)
//
//  Backed by a shared localStorage store (settings_store_v1) seeded from
//  mocks/settings.mock.jsx, keyed by role so switching roles in the demo
//  keeps each role's settings independent.
//
//  Wrapped in an IIFE so generic component names (Toggle, SettingRow…)
//  stay module-local and never collide with other globally-scoped
//  text/babel scripts. Only window.SettingsPage / useSettingsStore and
//  the tab components are exported at the end.
// ══════════════════════════════════════════════════════════════
(() => {

const SETTINGS_KEY = 'settings_store_v1';

// ─── Store (localStorage, seeded from mocks, per-role) ───────────────────────────
function setLoad() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY)); } catch (e) { raw = null; }
  const seed = SETTINGS_SEED;
  if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(seed));
  // Deep-ish backfill: ensure every role + section from the seed exists, so
  // older saved blobs gain any newly-added settings keys with their defaults.
  const out = {};
  Object.keys(seed).forEach(role => {
    out[role] = {};
    Object.keys(seed[role]).forEach(section => {
      out[role][section] = { ...seed[role][section], ...((raw[role] || {})[section] || {}) };
    });
  });
  return out;
}
function setSave(store) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(store)); } catch (e) {}
}

function useSettingsStore(role) {
  const [store, setStore] = React.useState(setLoad);
  const persist = React.useCallback((next) => { setSave(next); setStore(next); }, []);

  const roleData = store[role] || {};

  // Update a single key within a section for the active role.
  const set = (section, key, value) => {
    persist({
      ...store,
      [role]: {
        ...store[role],
        [section]: { ...(store[role] || {})[section], [key]: value },
      },
    });
  };
  const reset = () => {
    const next = { ...store, [role]: JSON.parse(JSON.stringify(SETTINGS_SEED[role])) };
    persist(next);
  };

  return { data: roleData, set, reset };
}

// ─── Local primitives ────────────────────────────────────────────────────────────
const SET_T = 'all 0.14s ease';

// Pill toggle (the design system doesn't export one).
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    aria-pressed={!!checked}
    style={{
      width: 38, height: 22, flexShrink: 0, borderRadius: 11, border: 'none',
      background: disabled ? DS.border : checked ? DS.accent : DS.borderDark,
      cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
      transition: SET_T, padding: 0, opacity: disabled ? 0.6 : 1,
    }}
  >
    <span style={{
      position: 'absolute', top: 2, left: checked ? 18 : 2,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      transition: SET_T, boxShadow: '0 1px 2px rgba(15,23,42,0.25)',
    }} />
  </button>
);

// One row: label + description on the left, a control on the right.
// Pass either `checked`/`onToggle` for a switch, or `control` for arbitrary input.
const SettingRow = ({ title, desc, checked, onToggle, control, disabled, last }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 20, padding: '14px 0',
    borderBottom: last ? 'none' : `1px solid ${DS.border}`,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: disabled ? DS.faint : DS.text }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: DS.muted, marginTop: 3, lineHeight: 1.45 }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      {control != null ? control : <Toggle checked={checked} onChange={onToggle} disabled={disabled} />}
    </div>
  </div>
);

// A titled section card used throughout Settings.
const SettingsSection = ({ title, subtitle, icon, children, footer }) => (
  <Card style={{ marginBottom: 20 }}>
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${DS.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: DS.accentLight, color: DS.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={16} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
    <div style={{ padding: '6px 22px 12px' }}>{children}</div>
    {footer && <div style={{ padding: '12px 22px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>{footer}</div>}
  </Card>
);

// Compact two-column grid for form fields.
const SetGrid = ({ children, cols = 2 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0 20px', padding: '10px 0' }}>
    {children}
  </div>
);

// ─── Shared tabs (every role) ────────────────────────────────────────────────────

const AccountTab = ({ data, set, roleLabel, viewRoles = [], currentRole, onSwitchView }) => {
  const a = data.account || {};
  // A staff identity granted more than one role at this centre (e.g. admin AND
  // teacher) gets a view switch — the two are different apps. Membership-driven,
  // so it only shows for genuinely dual-role users.
  const dualRole = viewRoles.length > 1;
  return (
    <div>
      {dualRole && (
        <SettingsSection title="View" subtitle="You hold more than one role at this centre" icon="users">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 0 4px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: DS.sub, lineHeight: 1.5, maxWidth: 440 }}>
              You're an <b>admin</b> and a <b>teacher</b> here — they're two different views. Choose which one to use; you can switch back anytime.
            </div>
            <Segmented
              value={currentRole}
              onChange={r => r !== currentRole && onSwitchView && onSwitchView(r)}
              options={viewRoles.map(r => ({ id: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            />
          </div>
        </SettingsSection>
      )}
      <SettingsSection title="Profile" subtitle={`Your ${roleLabel} account details`} icon="user">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: `1px solid ${DS.border}` }}>
          <Avatar name={a.name} size={56} />
          <div>
            <Btn variant="secondary" small icon="user">Change photo</Btn>
            <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 6 }}>JPG or PNG, up to 2 MB.</div>
          </div>
        </div>
        <SetGrid>
          <Field label="Full name">
            <Input value={a.name || ''} onChange={e => set('account', 'name', e.target.value)} />
          </Field>
          <Field label="Display name" hint="Shown to others in the app">
            <Input value={a.displayName || ''} onChange={e => set('account', 'displayName', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={a.email || ''} onChange={e => set('account', 'email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={a.phone || ''} onChange={e => set('account', 'phone', e.target.value)} />
          </Field>
        </SetGrid>
      </SettingsSection>

      <SettingsSection title="Password & Security" subtitle="Keep your account secure" icon="alert">
        <SetGrid>
          <Field label="Current password">
            <Input type="password" placeholder="••••••••" />
          </Field>
          <div />
          <Field label="New password">
            <Input type="password" placeholder="••••••••" />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" placeholder="••••••••" />
          </Field>
        </SetGrid>
        <SettingRow
          title="Two-factor authentication"
          desc="Require a verification code from your phone when signing in."
          checked={!!a.twoFactor} onToggle={v => set('account', 'twoFactor', v)}
          last
        />
      </SettingsSection>
    </div>
  );
};

const NotificationsTab = ({ data, set }) => {
  const n = data.notifications || {};
  const ch = (
    <Select value={n.channel || 'email'} onChange={e => set('notifications', 'channel', e.target.value)} style={{ width: 150 }}>
      <option value="email">Email</option>
      <option value="push">Push</option>
      <option value="both">Email + Push</option>
      <option value="none">None</option>
    </Select>
  );
  return (
    <div>
      <SettingsSection title="Delivery" subtitle="How you receive notifications" icon="bell">
        <SettingRow title="Preferred channel" desc="Default delivery method for new alerts." control={ch} />
        <SettingRow
          title="Daily digest"
          desc="Bundle non-urgent notifications into one summary each morning."
          checked={!!n.digest} onToggle={v => set('notifications', 'digest', v)}
        />
        <SettingRow
          title="Quiet hours"
          desc="Pause push notifications between 9pm and 7am."
          checked={!!n.quietHours} onToggle={v => set('notifications', 'quietHours', v)}
          last
        />
      </SettingsSection>

      <SettingsSection title="What to notify me about" icon="message">
        <SettingRow title="Announcements" desc="Platform and centre-wide announcements."
          checked={!!n.announcements} onToggle={v => set('notifications', 'announcements', v)} />
        <SettingRow title="Messages" desc="Direct messages and replies."
          checked={!!n.messages} onToggle={v => set('notifications', 'messages', v)} />
        <SettingRow title="Reminders" desc="Upcoming sessions, deadlines and due dates."
          checked={!!n.reminders} onToggle={v => set('notifications', 'reminders', v)} last />
      </SettingsSection>
    </div>
  );
};

// Admin/superadmin can set the platform-wide primary accent. It drives DS.accent
// live through the window.__setAccent bridge defined in index.html's App.
const AccentControl = () => {
  const PRESETS = ['#4F46E5', '#0891B2', '#43b190', '#7C3AED', '#DB2777', '#EA580C', '#0EA5E9', '#16A34A'];
  const [accent, setAccentState] = React.useState(() =>
    (window.__getAccent && window.__getAccent()) || DS.accent);
  const apply = (hex) => {
    setAccentState(hex);
    if (window.__setAccent) window.__setAccent(hex);
  };
  return (
    <div style={{ padding: '12px 0 4px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {PRESETS.map(hex => {
          const active = accent.toLowerCase() === hex.toLowerCase();
          return (
            <button key={hex} onClick={() => apply(hex)} title={hex} style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              background: hex, transition: SET_T,
              border: active ? `2px solid ${DS.text}` : `2px solid transparent`,
              boxShadow: active ? `0 0 0 2px #fff inset` : 'none',
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          padding: '7px 11px', borderRadius: 8, border: `1px solid ${DS.border}`, background: DS.bg,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6, background: accent,
            border: `1px solid ${DS.border}`, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: DS.sub, fontWeight: 500 }}>Custom…</span>
          <input type="color" value={accent} onChange={e => apply(e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }} />
        </label>
        <span style={{ fontSize: 12.5, color: DS.muted, fontFamily: 'monospace' }}>{accent.toUpperCase()}</span>
      </div>
    </div>
  );
};

const AppearanceTab = ({ data, set, role }) => {
  const ap = data.appearance || {};
  const canBrand = role === 'admin' || role === 'superadmin';
  const ThemeOpt = ({ id, label }) => {
    const active = (ap.theme || 'light') === id;
    return (
      <button onClick={() => set('appearance', 'theme', id)} style={{
        flex: 1, padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
        border: `1.5px solid ${active ? DS.accent : DS.border}`,
        background: active ? DS.accentLight : DS.bg,
        color: active ? DS.accent : DS.sub, fontSize: 13, fontWeight: 600,
        transition: SET_T,
      }}>{label}</button>
    );
  };
  return (
    <div>
      {canBrand && (
        <SettingsSection
          title="Primary accent"
          subtitle="Sets the brand colour used across buttons, links, highlights and active states for everyone in your centre."
          icon="star"
        >
          <AccentControl />
        </SettingsSection>
      )}
      <SettingsSection title="Theme" subtitle="Personalise how TutorOS looks for you" icon="star">
        <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: `1px solid ${DS.border}` }}>
          <ThemeOpt id="light" label="☀ Light" />
          <ThemeOpt id="dark" label="🌙 Dark" />
          <ThemeOpt id="system" label="🖥 System" />
        </div>
        <SettingRow
          title="Compact density"
          desc="Tighten spacing to fit more on screen."
          checked={!!ap.compact} onToggle={v => set('appearance', 'compact', v)}
        />
        <SettingRow
          title="Reduce motion"
          desc="Minimise animations and transitions."
          checked={!!ap.reduceMotion} onToggle={v => set('appearance', 'reduceMotion', v)}
          last
        />
      </SettingsSection>

      <SettingsSection title="Language & Region" icon="book">
        <SetGrid>
          <Field label="Language">
            <Select value={ap.language || 'en-GB'} onChange={e => set('appearance', 'language', e.target.value)}>
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
            </Select>
          </Field>
          <Field label="Time zone">
            <Select value={ap.timezone || 'Europe/London'} onChange={e => set('appearance', 'timezone', e.target.value)}>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Paris">Central European</option>
              <option value="Asia/Dubai">Gulf (GST)</option>
              <option value="America/New_York">US Eastern</option>
            </Select>
          </Field>
          <Field label="Date format">
            <Select value={ap.dateFormat || 'dd/mm/yyyy'} onChange={e => set('appearance', 'dateFormat', e.target.value)}>
              <option value="dd/mm/yyyy">DD/MM/YYYY</option>
              <option value="mm/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
            </Select>
          </Field>
          <Field label="Start of week">
            <Select value={ap.weekStart || 'monday'} onChange={e => set('appearance', 'weekStart', e.target.value)}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
          </Field>
        </SetGrid>
      </SettingsSection>
    </div>
  );
};

// ─── Role-specific tabs ────────────────────────────────────────────────────────────

// SuperAdmin → Platform Defaults (distinct from live "Platform Controls" page,
// which handles feature flags / plans / roles). This is org-level configuration.
const PlatformTab = ({ data, set }) => {
  const p = data.platform || {};
  return (
    <div>
      <SettingsSection title="New-centre defaults" subtitle="Applied automatically when a centre is created" icon="book">
        <SetGrid>
          <Field label="Default plan">
            <Select value={p.defaultPlan || 'growth'} onChange={e => set('platform', 'defaultPlan', e.target.value)}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </Select>
          </Field>
          <Field label="Trial length (days)">
            <Input type="number" value={p.trialDays ?? 14} onChange={e => set('platform', 'trialDays', +e.target.value)} />
          </Field>
          <Field label="Seats included">
            <Input type="number" value={p.defaultSeats ?? 10} onChange={e => set('platform', 'defaultSeats', +e.target.value)} />
          </Field>
          <Field label="Default currency">
            <Select value={p.currency || 'GBP'} onChange={e => set('platform', 'currency', e.target.value)}>
              <option value="GBP">£ GBP</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="AED">د.إ AED</option>
            </Select>
          </Field>
        </SetGrid>
      </SettingsSection>

      <SettingsSection title="Billing & data" subtitle="Platform-wide policies" icon="invoice">
        <Field label="Billing contact email" style={{ padding: '10px 0 0' }}>
          <Input type="email" value={p.billingEmail || ''} onChange={e => set('platform', 'billingEmail', e.target.value)} />
        </Field>
        <SettingRow
          title="Auto-suspend on failed payment"
          desc="Suspend a centre's access if an invoice is unpaid after the grace period."
          checked={!!p.autoSuspend} onToggle={v => set('platform', 'autoSuspend', v)}
        />
        <SettingRow
          title="Data retention"
          desc="How long to keep records after a centre is deleted."
          control={
            <Select value={p.retention || '90d'} onChange={e => set('platform', 'retention', e.target.value)} style={{ width: 150 }}>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="forever">Keep forever</option>
            </Select>
          }
          last
        />
      </SettingsSection>

      <SettingsSection title="Support & maintenance" icon="zap">
        <SettingRow title="Support access" desc="Allow support staff to access centre accounts for troubleshooting."
          checked={!!p.supportAccess} onToggle={v => set('platform', 'supportAccess', v)} />
        <SettingRow title="Send maintenance notices" desc="Email admins before scheduled maintenance windows."
          checked={!!p.maintenanceNotices} onToggle={v => set('platform', 'maintenanceNotices', v)} last />
      </SettingsSection>
    </div>
  );
};

// Admin → Centre (centre profile, branding, term, invoicing defaults)
const CentreTab = ({ data, set }) => {
  const c = data.centre || {};
  return (
    <div>
      <SettingsSection title="Centre profile" subtitle="Details shown on reports, invoices and the portal" icon="book">
        <SetGrid>
          <Field label="Centre name">
            <Input value={c.name || ''} onChange={e => set('centre', 'name', e.target.value)} />
          </Field>
          <Field label="Contact email">
            <Input type="email" value={c.email || ''} onChange={e => set('centre', 'email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={c.phone || ''} onChange={e => set('centre', 'phone', e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={c.website || ''} onChange={e => set('centre', 'website', e.target.value)} />
          </Field>
        </SetGrid>
        <Field label="Address" style={{ padding: '0 0 10px' }}>
          <Textarea value={c.address || ''} onChange={e => set('centre', 'address', e.target.value)} style={{ minHeight: 60 }} />
        </Field>
      </SettingsSection>

      <SettingsSection title="Branding" subtitle="Personalise reports and the parent portal" icon="star">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, background: DS.surface,
            border: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: DS.faint,
          }}><Icon name="book" size={20} /></div>
          <Btn variant="secondary" small>Upload logo</Btn>
        </div>
        <SettingRow
          title="Brand colour"
          desc="Used for headers on generated reports."
          control={
            <input type="color" value={c.brandColor || '#43b190'}
              onChange={e => set('centre', 'brandColor', e.target.value)}
              style={{ width: 40, height: 28, border: `1px solid ${DS.border}`, borderRadius: 6, padding: 0, cursor: 'pointer', background: DS.bg }} />
          }
          last
        />
      </SettingsSection>

      <SettingsSection title="Term & invoicing" icon="invoice">
        <SetGrid>
          <Field label="Current term">
            <Input value={c.term || ''} onChange={e => set('centre', 'term', e.target.value)} />
          </Field>
          <Field label="Currency">
            <Select value={c.currency || 'GBP'} onChange={e => set('centre', 'currency', e.target.value)}>
              <option value="GBP">£ GBP</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="AED">د.إ AED</option>
            </Select>
          </Field>
          <Field label="Invoice due (days)">
            <Input type="number" value={c.invoiceDueDays ?? 14} onChange={e => set('centre', 'invoiceDueDays', +e.target.value)} />
          </Field>
          <Field label="Tax rate (%)">
            <Input type="number" value={c.taxRate ?? 0} onChange={e => set('centre', 'taxRate', +e.target.value)} />
          </Field>
        </SetGrid>
        <SettingRow title="Auto-send invoices" desc="Email invoices to guardians automatically when generated."
          checked={!!c.autoSendInvoices} onToggle={v => set('centre', 'autoSendInvoices', v)} />
        <SettingRow title="Late payment reminders" desc="Automatically remind guardians of overdue invoices."
          checked={!!c.lateReminders} onToggle={v => set('centre', 'lateReminders', v)} last />
      </SettingsSection>
    </div>
  );
};

// Teacher → Teaching (homework / grading defaults, availability)
const TeachingTab = ({ data, set }) => {
  const t = data.teaching || {};
  return (
    <div>
      <SettingsSection title="Homework defaults" subtitle="Pre-filled when you create a new assignment" icon="clip">
        <SetGrid>
          <Field label="Default attempts allowed">
            <Input type="number" value={t.attempts ?? 1} onChange={e => set('teaching', 'attempts', Math.max(1, +e.target.value || 1))} />
          </Field>
          <Field label="Default due window (days)">
            <Input type="number" value={t.dueDays ?? 7} onChange={e => set('teaching', 'dueDays', +e.target.value)} />
          </Field>
        </SetGrid>
        <SettingRow title="Allow late submissions" desc="By default, accept work submitted after the due date."
          checked={!!t.allowLate} onToggle={v => set('teaching', 'allowLate', v)} />
        <SettingRow title="Auto-grade multiple choice" desc="Mark MCQ questions automatically on submission."
          checked={!!t.autoGradeMcq} onToggle={v => set('teaching', 'autoGradeMcq', v)} />
        <SettingRow title="Let students review answers" desc="Allow review of marked work by default."
          checked={!!t.allowReview} onToggle={v => set('teaching', 'allowReview', v)} last />
      </SettingsSection>

      <SettingsSection title="Grading" icon="check">
        <SettingRow
          title="Default grading scale"
          control={
            <Select value={t.gradingScale || 'percent'} onChange={e => set('teaching', 'gradingScale', e.target.value)} style={{ width: 170 }}>
              <option value="percent">Percentage</option>
              <option value="letter">Letter (A–F)</option>
              <option value="points">Points</option>
            </Select>
          }
        />
        <SettingRow title="Release marks after approval" desc="Hold marks until you've reviewed and approved them."
          checked={!!t.releaseAfterApproval} onToggle={v => set('teaching', 'releaseAfterApproval', v)} last />
      </SettingsSection>

      <SettingsSection title="Availability & alerts" icon="calendar">
        <SetGrid>
          <Field label="Working hours from">
            <Input type="time" value={t.hoursFrom || '09:00'} onChange={e => set('teaching', 'hoursFrom', e.target.value)} />
          </Field>
          <Field label="Working hours to">
            <Input type="time" value={t.hoursTo || '17:00'} onChange={e => set('teaching', 'hoursTo', e.target.value)} />
          </Field>
        </SetGrid>
        <SettingRow title="Notify on each submission" desc="Get an alert the moment a student submits homework."
          checked={!!t.notifyOnSubmission} onToggle={v => set('teaching', 'notifyOnSubmission', v)} last />
      </SettingsSection>
    </div>
  );
};

// Student → Learning (guardian, accessibility, reminders) — lighter weight
const LearningTab = ({ data, set }) => {
  const l = data.learning || {};
  return (
    <div>
      <SettingsSection title="Guardian & contact" subtitle="Who we keep in the loop about your progress" icon="users">
        <SetGrid>
          <Field label="Guardian name">
            <Input value={l.guardianName || ''} onChange={e => set('learning', 'guardianName', e.target.value)} />
          </Field>
          <Field label="Guardian email">
            <Input type="email" value={l.guardianEmail || ''} onChange={e => set('learning', 'guardianEmail', e.target.value)} />
          </Field>
        </SetGrid>
        <SettingRow title="Share reports with guardian" desc="Email new reports and feedback to your guardian."
          checked={!!l.shareWithGuardian} onToggle={v => set('learning', 'shareWithGuardian', v)} last />
      </SettingsSection>

      <SettingsSection title="Homework reminders" icon="clip">
        <SettingRow
          title="Remind me before a deadline"
          control={
            <Select value={l.reminderLead || '1d'} onChange={e => set('learning', 'reminderLead', e.target.value)} style={{ width: 160 }}>
              <option value="none">Don't remind</option>
              <option value="1h">1 hour before</option>
              <option value="1d">1 day before</option>
              <option value="2d">2 days before</option>
            </Select>
          }
        />
        <SettingRow title="Streak nudges" desc="Encourage me to keep my study streak going."
          checked={!!l.streakNudges} onToggle={v => set('learning', 'streakNudges', v)} last />
      </SettingsSection>

      <SettingsSection title="Accessibility" subtitle="Make TutorOS easier to use" icon="star">
        <SetGrid>
          <Field label="Text size">
            <Select value={l.textSize || 'normal'} onChange={e => set('learning', 'textSize', e.target.value)}>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra large</option>
            </Select>
          </Field>
          <Field label="">
            <div style={{ height: 1 }} />
          </Field>
        </SetGrid>
        <SettingRow title="High contrast" desc="Increase colour contrast for readability."
          checked={!!l.highContrast} onToggle={v => set('learning', 'highContrast', v)} />
        <SettingRow title="Dyslexia-friendly font" desc="Use a typeface designed for easier reading."
          checked={!!l.dyslexiaFont} onToggle={v => set('learning', 'dyslexiaFont', v)} last />
      </SettingsSection>
    </div>
  );
};

// Admin → Comms (safety posture). Reads/writes the lifted comms config via the
// `comms` object threaded down from App (the same one that backs Announcements /
// Messages / the bell), so changing a preset here updates messaging behaviour live.
// Preset data comes from window.COMMS_PRESETS (Communications.jsx, loaded after us).
const CommsTab = ({ comms }) => {
  if (!comms) return <SettingsSection title="Communications" icon="message"><div style={{ padding: '14px 0', fontSize: 13, color: DS.muted }}>Communications module is still loading…</div></SettingsSection>;
  const PRESETS = window.COMMS_PRESETS || {};
  const cfg = comms.config || {};
  const centreId = comms.ctx.centreId;
  const users = (typeof COMMS_USERS !== 'undefined' ? COMMS_USERS : []);
  const staff = users.filter(u => u.centreId === centreId && (u.role === 'admin' || u.role === 'teacher'));

  const [wordInput, setWordInput] = React.useState('');
  const addWord = () => {
    const w = wordInput.trim().toLowerCase();
    if (!w || (cfg.wordlist || []).includes(w)) { setWordInput(''); return; }
    comms.setConfig({ wordlist: [...(cfg.wordlist || []), w] });
    setWordInput('');
  };
  const removeWord = (w) => comms.setConfig({ wordlist: (cfg.wordlist || []).filter(x => x !== w) });

  return (
    <div>
      {/* Safety preset */}
      <SettingsSection title="Safety preset" subtitle="Choose a preset, then fine-tune. These apply to every conversation in your centre." icon="alert">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: '12px 0' }}>
          {['locked', 'standard', 'open'].map(pid => {
            const p = PRESETS[pid]; if (!p) return null;
            const active = cfg.preset === pid;
            const accent = pid === 'locked' ? DS.success : pid === 'standard' ? DS.accent : DS.warning;
            return (
              <button key={pid} onClick={() => comms.applyPreset(pid)} style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '16px 16px 14px',
                borderStyle: 'solid', borderWidth: '1.5px', borderColor: active ? accent : DS.border,
                borderTopWidth: '3px', borderTopColor: accent, background: active ? `${accent}0F` : DS.bg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon name={p.icon} size={16} color={accent} />
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: DS.text }}>{p.label}</span>
                  {pid === 'locked' && <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: '#fff', background: DS.success, padding: '2px 7px', borderRadius: 6 }}>Recommended</span>}
                </div>
                <div style={{ fontSize: 12, color: DS.muted, lineHeight: 1.45, marginBottom: 10 }}>{p.blurb}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {p.lines.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: DS.sub }}>
                      <Icon name="check" size={12} color={active ? accent : DS.faint} />{l}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* Advanced overrides */}
      <SettingsSection title="Messaging" subtitle="Fine-tune the posture set by your preset" icon="message">
        <SettingRow title="1:1 student ↔ staff messaging" desc="When off, students use class channels only — no private DMs."
          checked={!!cfg.dmEnabled} onToggle={v => comms.setConfig({ dmEnabled: v })} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, padding: '14px 0', borderBottom: `1px solid ${DS.border}` }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.text }}>Quiet hours</div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 3 }}>Messaging students is paused during this window.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Input type="time" value={cfg.quietFrom || '21:00'} onChange={e => comms.setConfig({ quietFrom: e.target.value })} style={{ width: 120 }} />
            <span style={{ fontSize: 13, color: DS.muted }}>to</span>
            <Input type="time" value={cfg.quietTo || '07:00'} onChange={e => comms.setConfig({ quietTo: e.target.value })} style={{ width: 120 }} />
          </div>
        </div>
        <SettingRow title="Allow image attachments" desc="Photos of handwritten working, etc."
          checked={!!cfg.images} onToggle={v => comms.setConfig({ images: v })} last />
      </SettingsSection>

      {/* Safeguarding leads */}
      <SettingsSection title="Safeguarding oversight" subtitle="Who can see staff↔student conversations, and for how long they're kept" icon="shield">
        <SetGrid>
          <Field label="Designated Safeguarding Lead">
            <Select value={cfg.dslLeadId || ''} onChange={e => comms.setConfig({ dslLeadId: e.target.value || null })}>
              <option value="">— Select —</option>
              {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Deputy DSL">
            <Select value={cfg.dslDeputyId || ''} onChange={e => comms.setConfig({ dslDeputyId: e.target.value || null })}>
              <option value="">— None —</option>
              {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </SetGrid>
        <SettingRow title="DSL observer on every thread" desc="Your DSL can read all staff↔student conversations."
          checked={!!cfg.dslObserver} onToggle={v => comms.setConfig({ dslObserver: v })} />
        <SettingRow title="Message retention"
          desc="Retained securely for safeguarding and audit. Aligns with Keeping Children Safe in Education guidance."
          control={
            <Select value={cfg.retention || '3y'} onChange={e => comms.setConfig({ retention: e.target.value })} style={{ width: 200 }}>
              <option value="1y">Keep for 1 year</option>
              <option value="3y">Keep for 3 years (recommended)</option>
              <option value="7y">Keep for 7 years</option>
              <option value="forever">Keep indefinitely</option>
            </Select>
          } last />
      </SettingsSection>

      {/* Safeguarding wordlist */}
      <SettingsSection title="Safeguarding wordlist" subtitle="Messages containing these are quietly surfaced to your DSL — senders aren't blocked or shamed." icon="filter">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 0' }}>
          {(cfg.wordlist || []).map(w => (
            <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DS.warning, background: DS.warningBg, border: `1px solid ${DS.warning}33`, borderRadius: 7, padding: '4px 8px', fontFamily: 'monospace' }}>
              {w}
              <button onClick={() => removeWord(w)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: DS.warning, display: 'flex', padding: 0 }}><Icon name="x" size={12} color={DS.warning} /></button>
            </span>
          ))}
          {(cfg.wordlist || []).length === 0 && <span style={{ fontSize: 12.5, color: DS.faint }}>No words yet.</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '4px 0 10px' }}>
          <Input value={wordInput} onChange={e => setWordInput(e.target.value)} placeholder="Add a word or phrase…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }} style={{ maxWidth: 280 }} />
          <Btn variant="secondary" small onClick={addWord}>Add</Btn>
        </div>
      </SettingsSection>

      {/* Announcements policy */}
      <SettingsSection title="Announcements" subtitle="Who can broadcast to your centre" icon="megaphone">
        <SettingRow title="Who can author centre-wide announcements"
          control={
            <Segmented value={cfg.announceAuthors || 'admins'} onChange={v => comms.setConfig({ announceAuthors: v })}
              options={[{ id: 'admins', label: 'Admins only' }, { id: 'senior', label: 'Admins & senior staff' }, { id: 'all', label: 'All staff' }]} />
          } />
        <SettingRow title="Approval workflow for centre-wide notices" desc="An admin must approve before a staff announcement goes out."
          checked={!!cfg.approvalWorkflow} onToggle={v => comms.setConfig({ approvalWorkflow: v })} last />
      </SettingsSection>
    </div>
  );
};

// Admin → Billing (subscription plan · override code · billing details).
// Reads the account-scoped subscription store (Centres.jsx) + live plan catalogue
// (Plans.jsx) via window — both load AFTER Settings.jsx, so resolve at render time.
const BillingTab = () => {
  const sub = window.useSubscriptionStore ? window.useSubscriptionStore() : null;
  const plansStore = window.usePlansStore ? window.usePlansStore() : null;
  const [codeInput, setCodeInput] = React.useState('');
  const [codeMsg, setCodeMsg] = React.useState(null);   // { ok, text }
  const [histSearch, setHistSearch] = React.useState('');

  if (!sub || !plansStore) {
    return <div style={{ padding: 20, fontSize: 13, color: DS.muted }}>Billing isn’t available in this view.</div>;
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const plans = plansStore.plans.filter(p => !p.archived);
  const plan = sub.plan;
  const ov = sub.override || {};
  const ownedCentres = (sub.centres || []).length;
  const overCap = plan.maxCentres < ownedCentres;
  const b = sub.billing || {};
  const setB = (k, v) => sub.setBilling({ [k]: v });
  // Per-plan glyph + colour (mirrors SuperAdmin's plan cards).
  const planVis = id => ({ starter: { color: '#9CA3AF', icon: 'book' }, growth: { color: DS.accent, icon: 'chart' }, scale: { color: '#7C3AED', icon: 'zap' } }[id] || { color: DS.accent, icon: 'invoice' });

  const onApply = () => {
    const res = sub.applyCode(codeInput.trim());
    if (res.ok) { setCodeMsg({ ok: true, text: `Applied — ${window.planCodeSummary(res.code)}` }); setCodeInput(''); }
    else setCodeMsg({ ok: false, text: res.reason });
  };

  // Synthesised billing history — the last 9 monthly invoices for the current plan.
  // The current month reflects any active override (free trial → £0).
  const history = React.useMemo(() => {
    const rows = []; const now = new Date();
    for (let i = 0; i < 9; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      rows.push({
        id: i,
        label: `${plan.name} Plan — ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
        amount: (i === 0 && ov.active) ? sub.effectivePrice : plan.price,
        date: d,
        status: (i === 2 || i === 6) ? 'declined' : 'paid',
      });
    }
    return rows;
  }, [plan.name, plan.price, sub.effectivePrice, ov.active]);
  const filteredHist = history.filter(h => h.label.toLowerCase().includes(histSearch.toLowerCase()));

  const downloadText = (filename, text, type = 'text/plain') => {
    try {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {}
  };
  const downloadInvoice = h => downloadText(h.label.replace(/[^\w]+/g, '_') + '.txt',
    `TutorOS subscription invoice\n${h.label}\nAmount: £${h.amount}\nDate: ${fmtDate(h.date)}\nStatus: ${h.status === 'paid' ? 'Paid' : 'Declined'}\n`);
  const downloadAll = () => downloadText('tutoros-billing-history.csv',
    'Invoice,Amount,Date,Status\n' + history.map(h => `"${h.label}",£${h.amount},${fmtDate(h.date)},${h.status === 'paid' ? 'Paid' : 'Declined'}`).join('\n'), 'text/csv');

  return (
    <div>
      {/* Plan picker — selectable cards (current plan is checked) */}
      <SettingsSection title="Your plan" subtitle="Pick the plan for your centre group — switches immediately" icon="invoice">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '10px 0 4px' }}>
          {plans.map(p => {
            const sel = p.id === sub.planId; const vis = planVis(p.id);
            return (
              <div key={p.id} onClick={() => sub.setPlan(p.id)} role="button" style={{
                border: `2px solid ${sel ? vis.color : DS.border}`, background: sel ? vis.color + '0D' : DS.bg,
                borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color .12s, background .12s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: vis.color + '1A', color: vis.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={vis.icon} size={15} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: DS.text }}>{p.name}</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${sel ? vis.color : DS.borderDark}`, background: sel ? vis.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sel && <Icon name="check" size={12} color="#fff" />}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: DS.text, letterSpacing: '-0.5px' }}>£{p.price}</span>
                  <span style={{ fontSize: 12, color: DS.muted }}> /mo</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(p.features || []).slice(0, 3).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: DS.sub }}>
                      <Icon name="check" size={12} color={vis.color} />{f}
                    </div>
                  ))}
                </div>
                {sel && (
                  <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                    <Badge variant={ov.active ? 'warning' : 'accent'}>{ov.active ? 'Limited time price' : 'Current plan'}</Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {ov.active && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: DS.successBg, border: `1px solid ${DS.successBorder}`, fontSize: 12.5, color: DS.success, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="zap" size={14} color={DS.success} />
            <span>{ov.label} — you’re paying <b>£{sub.effectivePrice}/mo</b> instead of £{plan.price}/mo until {fmtDate(ov.until)}.</span>
          </div>
        )}
        {overCap && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, fontSize: 12.5, color: DS.warning }}>
            You currently run {ownedCentres} centres, but {plan.name} allows {plan.maxCentres}. Choose a larger plan or archive a centre.
          </div>
        )}
      </SettingsSection>

      {/* Payment method + promo code, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
        <Card title="Payment method" icon="lock">
          <div style={{ padding: 18 }}>
            <div style={{ borderRadius: 12, padding: '16px 18px', background: `linear-gradient(135deg, ${DS.accent}, ${DS.accentHover})`, color: '#fff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>{b.cardBrand || 'Card'}</span>
                <Icon name="lock" size={14} color="#fff" />
              </div>
              <div style={{ fontSize: 16, letterSpacing: '3px', marginTop: 20, fontFamily: 'JetBrains Mono, monospace' }}>•••• •••• •••• {b.cardLast4 || '––––'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11.5, opacity: 0.92 }}>
                <span>{b.cardName || 'Name on card'}</span>
                <span>{b.cardExpiry || 'MM/YY'}</span>
              </div>
            </div>
            <SetGrid>
              <Field label="Name on card"><Input value={b.cardName || ''} onChange={e => setB('cardName', e.target.value)} /></Field>
              <Field label="Card ending"><Input value={b.cardLast4 || ''} onChange={e => setB('cardLast4', e.target.value.replace(/\D/g, '').slice(-4))} placeholder="4242" /></Field>
              <Field label="Expiry"><Input value={b.cardExpiry || ''} onChange={e => setB('cardExpiry', e.target.value)} placeholder="MM/YY" /></Field>
              <Field label="Card brand"><Input value={b.cardBrand || ''} onChange={e => setB('cardBrand', e.target.value)} placeholder="Visa" /></Field>
            </SetGrid>
            <div style={{ fontSize: 11, color: DS.faint }}>Demo only — no real payment is taken.</div>
          </div>
        </Card>

        <Card title="Promo & trial code" icon="zap">
          <div style={{ padding: 18 }}>
            {sub.redeemedCode ? (
              <div style={{ borderRadius: 10, border: `1px solid ${ov.active ? DS.successBorder : DS.border}`, background: ov.active ? DS.successBg : DS.surface, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <code style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace', background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 6, padding: '4px 10px', color: DS.accent, fontWeight: 600 }}>{sub.redeemedCode.code}</code>
                  <Badge variant={ov.active ? 'success' : 'default'}>{ov.active ? 'Active' : 'Expired'}</Badge>
                </div>
                <div style={{ fontSize: 13, color: DS.text, marginTop: 10, fontWeight: 600 }}>{window.planCodeSummary(sub.redeemedCode)}</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{ov.active ? `Applies until ${fmtDate(ov.until)}` : 'No longer active'}</div>
                <Btn variant="secondary" small onClick={sub.removeCode} style={{ marginTop: 12 }}>Remove code</Btn>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, color: DS.muted, marginBottom: 12 }}>Have a promo or free-trial code from TutorOS? Enter it to update your price.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input value={codeInput} onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeMsg(null); }} placeholder="Enter code" style={{ flex: 1 }} />
                  <Btn variant="primary" small icon="check" onClick={onApply}>Apply</Btn>
                </div>
                {codeMsg && <div style={{ fontSize: 12.5, color: codeMsg.ok ? DS.success : DS.danger, marginTop: 10 }}>{codeMsg.text}</div>}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Billing details */}
      <SettingsSection title="Billing details" subtitle="Shown on your TutorOS subscription invoices" icon="book">
        <SetGrid>
          <Field label="Company / billing name">
            <Input value={b.company || ''} onChange={e => setB('company', e.target.value)} />
          </Field>
          <Field label="Billing email">
            <Input type="email" value={b.email || ''} onChange={e => setB('email', e.target.value)} />
          </Field>
          <Field label="VAT number">
            <Input value={b.vat || ''} onChange={e => setB('vat', e.target.value)} />
          </Field>
        </SetGrid>
        <Field label="Billing address" style={{ padding: '0 0 10px' }}>
          <Textarea value={b.address || ''} onChange={e => setB('address', e.target.value)} style={{ minHeight: 60 }} />
        </Field>
      </SettingsSection>

      {/* Purchase history */}
      <Card title="Purchase history" icon="invoice" style={{ marginBottom: 20 }}
        actions={[<Btn key="dl" variant="secondary" small icon="download" onClick={downloadAll}>Download all</Btn>]}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <Input value={histSearch} onChange={e => setHistSearch(e.target.value)} placeholder="Search invoices…" icon="search" style={{ maxWidth: 280 }} />
        </div>
        <Table
          cols={['Invoice', 'Amount', 'Date', 'Status', '']}
          rows={filteredHist.map(h => [
            <span style={{ fontSize: 13, fontWeight: 500, color: DS.text }}>{h.label}</span>,
            <span style={{ fontSize: 13, color: DS.sub }}>£{h.amount}</span>,
            <span style={{ fontSize: 12, color: DS.muted }}>{fmtDate(h.date)}</span>,
            <Badge variant={h.status === 'paid' ? 'success' : 'danger'}>{h.status === 'paid' ? 'Paid' : 'Declined'}</Badge>,
            <button onClick={() => downloadInvoice(h)} title="Download invoice" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.faint, display: 'flex', padding: 4 }}><Icon name="download" size={15} /></button>,
          ])}
        />
        {filteredHist.length === 0 && <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: DS.muted }}>No invoices match your search.</div>}
      </Card>
    </div>
  );
};

// ─── Tab registry per role ──────────────────────────────────────────────────────────
const ROLE_TABS = {
  superadmin: { label: 'Platform Owner', tab: { id: 'platform', label: 'Platform Defaults', Comp: PlatformTab } },
  admin:      { label: 'Centre Admin',   tab: { id: 'centre',   label: 'Centre',            Comp: CentreTab } },
  teacher:    { label: 'Teacher',        tab: { id: 'teaching', label: 'Teaching',          Comp: TeachingTab } },
  student:    { label: 'Student',        tab: { id: 'learning', label: 'Learning',          Comp: LearningTab } },
};

// ─── Page ───────────────────────────────────────────────────────────────────────────
// The active tab is driven by the sidebar "Settings" dropdown via the `section` prop
// (settings:centre, settings:notifications, …). Tab order here mirrors SETTINGS_SUB
// in shared.jsx so the dropdown and the page stay aligned.
const SettingsPage = ({ role = 'admin', section }) => {
  const { data, set, reset } = useSettingsStore(role);
  const roleMeta = ROLE_TABS[role] || ROLE_TABS.admin;
  const [saved, setSaved] = React.useState(false);

  // The signed-in staff identity may hold both admin + teacher at the active
  // centre — if so, the Account tab offers a view switch. Resolved from the same
  // onboarding membership list that drives the sidebar centre switcher.
  const onb = window.useOnboardingStore ? window.useOnboardingStore() : null;
  const activeCentreId = window.__getCentre ? window.__getCentre() : ((window.ONB_CENTRE && window.ONB_CENTRE.id) || 'bm');
  const viewRoles = React.useMemo(() => {
    if ((role !== 'admin' && role !== 'teacher') || !window.ONB_SESSION) return [];
    const email = window.ONB_SESSION.email.toLowerCase();
    const roles = [];
    // Use the canonical constant so newly-seeded memberships show without a cache
    // clear (the onboarding store reads from localStorage which may be stale).
    const memberships = window.ONB_MEMBERSHIPS || (onb && onb.memberships) || [];
    memberships.forEach(m => {
      if ((m.email || '').toLowerCase() !== email || m.centreId !== activeCentreId) return;
      if ((m.role === 'admin' || m.role === 'teacher') && !roles.includes(m.role)) roles.push(m.role);
    });
    return roles;
  }, [role, activeCentreId]);

  const tabs = [
    { id: roleMeta.tab.id, label: roleMeta.tab.label, render: () => <roleMeta.tab.Comp data={data} set={set} /> },
    // Admins get a 2nd role-specific tab: plan change · override code · billing details.
    ...(role === 'admin' ? [{ id: 'billing', label: 'Plans & Billing', render: () => <BillingTab /> }] : []),
    { id: 'notifications', label: 'Notifications', render: () => <NotificationsTab data={data} set={set} /> },
    { id: 'appearance',    label: 'Appearance',    render: () => <AppearanceTab data={data} set={set} role={role} /> },
    { id: 'account',       label: 'Account',       render: () => <AccountTab data={data} set={set} roleLabel={roleMeta.label} viewRoles={viewRoles} currentRole={role} onSwitchView={r => window.__navigate && window.__navigate(r, 'dashboard')} /> },
  ];
  const active = tabs.find(t => t.id === section) || tabs[0];

  // Changes persist live (localStorage); the Save button is a confirmation affordance.
  const onSave = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        title={active.label === roleMeta.tab.label ? 'Settings' : `Settings · ${active.label}`}
        subtitle={`Manage your ${roleMeta.label.toLowerCase()} account and preferences`}
        actions={[
          <Btn key="reset" variant="ghost" small onClick={reset}>Reset</Btn>,
          <Btn key="save" variant="primary" small icon={saved ? 'check' : undefined} onClick={onSave}>
            {saved ? 'Saved' : 'Save changes'}
          </Btn>,
        ]}
      />

      {active.render()}
    </div>
  );
};

Object.assign(window, {
  useSettingsStore, SettingsPage, CommsTab,
  AccountTab, NotificationsTab, AppearanceTab,
  PlatformTab, CentreTab, TeachingTab, LearningTab, BillingTab,
});

})();
