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

const AccountTab = ({ data, set, roleLabel }) => {
  const a = data.account || {};
  return (
    <div>
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

  // Role-specific tab first, then the common tabs.
  const tabs = [
    { id: roleMeta.tab.id, label: roleMeta.tab.label, render: () => <roleMeta.tab.Comp data={data} set={set} /> },
    { id: 'notifications', label: 'Notifications', render: () => <NotificationsTab data={data} set={set} /> },
    { id: 'appearance',    label: 'Appearance',    render: () => <AppearanceTab data={data} set={set} role={role} /> },
    { id: 'account',       label: 'Account',       render: () => <AccountTab data={data} set={set} roleLabel={roleMeta.label} /> },
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
  useSettingsStore, SettingsPage,
  AccountTab, NotificationsTab, AppearanceTab,
  PlatformTab, CentreTab, TeachingTab, LearningTab,
});

})();
