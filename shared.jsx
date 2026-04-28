// ══════════════════════════════════════════════════════════════
//  TutorOS — Shared Design System & Components
// ══════════════════════════════════════════════════════════════

const DS = {
  accent:       '#4F46E5',
  accentHover:  '#4338CA',
  accentLight:  '#EEF2FF',
  accentBorder: '#C7D2FE',
  bg:           '#FFFFFF',
  surface:      '#F9FAFB',
  surfaceHover: '#F3F4F6',
  border:       '#E5E7EB',
  borderDark:   '#D1D5DB',
  text:         '#111827',
  sub:          '#374151',
  muted:        '#6B7280',
  faint:        '#9CA3AF',
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  successBorder:'#BBF7D0',
  warning:      '#D97706',
  warningBg:    '#FFFBEB',
  warningBorder:'#FDE68A',
  danger:       '#DC2626',
  dangerBg:     '#FEF2F2',
  dangerBorder: '#FECACA',
  info:         '#0284C7',
  infoBg:       '#F0F9FF',
  sidebarW:     '232px',
};

// ─── Icon Library ─────────────────────────────────────────────────────────────
const PATHS = {
  dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  users:       'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  book:        'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  teacher:     'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  chart:       'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  invoice:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  settings:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bell:        'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  message:     'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  calendar:    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  check:       'M5 13l4 4L19 7',
  x:           'M6 18L18 6M6 6l12 12',
  plus:        'M12 4v16m8-8H4',
  chevron_r:   'M9 5l7 7-7 7',
  chevron_d:   'M19 9l-7 7-7-7',
  search:      'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  clock:       'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  trending_up: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  trending_dn: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
  alert:       'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  home:        'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  user:        'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout:      'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  brain:       'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  star:        'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  clip:        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  upload:      'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
  eye:         'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  download:    'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  zap:         'M13 10V3L4 14h7v7l9-11h-7z',
  edit:        'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.5 }) => (
  React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { flexShrink: 0 }
  },
    (PATHS[name] || '').split('M').filter(Boolean).map((seg, i) =>
      React.createElement('path', { key: i, d: 'M' + seg })
    )
  )
);

// ─── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ variant = 'default', children, size = 'sm' }) => {
  const variants = {
    default:  { bg: DS.surface,    color: DS.muted,    border: DS.border },
    accent:   { bg: DS.accentLight, color: DS.accent,  border: DS.accentBorder },
    success:  { bg: DS.successBg,  color: DS.success,  border: DS.successBorder },
    warning:  { bg: DS.warningBg,  color: DS.warning,  border: DS.warningBorder },
    danger:   { bg: DS.dangerBg,   color: DS.danger,   border: DS.dangerBorder },
    info:     { bg: DS.infoBg,     color: DS.info,     border: '#BAE6FD' },
  };
  const v = variants[variant] || variants.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: 20, fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 500, letterSpacing: '0.01em',
      background: v.bg, color: v.color,
      border: `1px solid ${v.border}`,
    }}>{children}</span>
  );
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 32, color }) => {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#818CF8','#6EE7B7','#FCD34D','#F9A8D4','#93C5FD','#A5B4FC','#6EE7B7'];
  const bg = color || colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
      letterSpacing: '0.02em',
    }}>{initials}</div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, trend, trendDir, icon, iconBg, accent }) => (
  <div style={{
    background: DS.bg, border: `1px solid ${DS.border}`,
    borderRadius: 10, padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 12, flex: 1,
    minWidth: 0,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, color: DS.muted, fontWeight: 500, letterSpacing: '0.01em' }}>{label}</span>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: iconBg || DS.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent || DS.accent,
        }}>
          <Icon name={icon} size={16} />
        </div>
      )}
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: DS.text, lineHeight: 1 }}>{value}</div>
      {(trend || sub) && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          {trend && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 12, fontWeight: 500,
              color: trendDir === 'up' ? DS.success : trendDir === 'down' ? DS.danger : DS.muted,
            }}>
              <Icon name={trendDir === 'up' ? 'trending_up' : trendDir === 'down' ? 'trending_dn' : 'clock'} size={13} />
              {trend}
            </span>
          )}
          {sub && <span style={{ fontSize: 12, color: DS.muted }}>{sub}</span>}
        </div>
      )}
    </div>
  </div>
);

// ─── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_CONFIG = {
  admin: {
    label: 'Centre Admin',
    color: DS.accent,
    items: [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { id: 'students',  icon: 'users',    label: 'Students' },
      { id: 'classes',   icon: 'book',     label: 'Classes' },
      { id: 'teachers',  icon: 'user',     label: 'Teachers' },
      { id: 'schedule',  icon: 'calendar', label: 'Schedule' },
      { id: 'invoices',  icon: 'invoice',  label: 'Invoices' },
      { id: 'reports',   icon: 'chart',    label: 'Reports' },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings' }],
  },
  teacher: {
    label: 'Teacher',
    color: '#0891B2',
    items: [
      { id: 'dashboard',       icon: 'dashboard', label: 'Dashboard' },
      { id: 'classes',         icon: 'calendar',  label: 'My Classes' },
      { id: 'lesson_planner',  icon: 'edit',      label: 'Lesson Planner' },
      { id: 'homework',        icon: 'clip',      label: 'Homework' },
      { id: 'attendance',      icon: 'check',     label: 'Attendance' },
      { id: 'progress',        icon: 'chart',     label: 'Progress' },
      { id: 'tracking',        icon: 'star',      label: 'Tracking' },
      { id: 'ai_queue',        icon: 'brain',     label: 'AI Feedback' },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings' }],
  },
  student: {
    label: 'Student',
    color: '#43b190',
    items: [
      { id: 'dashboard', icon: 'home',      label: 'Overview'   },
      { id: 'homework',  icon: 'clip',      label: 'Homework'   },
      { id: 'progress',  icon: 'chart',     label: 'My Progress'},
      { id: 'sessions',  icon: 'calendar',  label: 'Sessions'   },
      { id: 'feedback',  icon: 'brain',     label: 'AI Feedback'},
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings' }],
  },
};

const Sidebar = ({ role, active = 'dashboard', onNav, onRoleSwitch }) => {
  const cfg = NAV_CONFIG[role];
  const [hoveredItem, setHoveredItem] = React.useState(null);

  const NavItem = ({ item }) => {
    const isActive = active === item.id;
    const isHovered = hoveredItem === item.id;
    return (
      <button
        onClick={() => onNav && onNav(item.id)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 7, width: '100%',
          border: 'none', background: isActive ? DS.accentLight : isHovered ? DS.surfaceHover : 'transparent',
          color: isActive ? DS.accent : DS.sub,
          cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 400,
          textAlign: 'left', transition: 'background 0.12s',
        }}
      >
        <Icon name={item.icon} size={16} color={isActive ? DS.accent : DS.muted} />
        {item.label}
        {isActive && (
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: DS.accent, marginLeft: 'auto',
          }} />
        )}
      </button>
    );
  };

  return (
    <div style={{
      width: DS.sidebarW, flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      background: DS.bg, borderRight: `1px solid ${DS.border}`,
      display: 'flex', flexDirection: 'column',
      padding: '0 12px',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 4px 16px',
        borderBottom: `1px solid ${DS.border}`,
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: DS.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>T</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>TutorOS</div>
            <div style={{ fontSize: 10, color: DS.muted, marginTop: 1 }}>{cfg.label}</div>
          </div>
        </div>
      </div>

      {/* Role switcher (demo) */}
      {onRoleSwitch && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: DS.faint, padding: '4px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Switch view</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['admin','teacher','student'].map(r => (
              <button key={r} onClick={() => onRoleSwitch(r)} style={{
                flex: 1, padding: '4px 6px', borderRadius: 5, border: `1px solid ${role === r ? DS.accentBorder : DS.border}`,
                background: role === r ? DS.accentLight : DS.surface,
                color: role === r ? DS.accent : DS.muted,
                fontSize: 10, fontWeight: role === r ? 600 : 400, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{r}</button>
            ))}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cfg.items.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Bottom items */}
      <div style={{ paddingBottom: 12, borderTop: `1px solid ${DS.border}`, paddingTop: 8 }}>
        {cfg.bottom.map(item => <NavItem key={item.id} item={item} />)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginTop: 4 }}>
          <Avatar name="User" size={28} color={cfg.color} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role === 'admin' ? 'Lisa Chen' : role === 'teacher' ? 'Sarah Clarke' : 'Oliver Chen'}
            </div>
            <div style={{ fontSize: 11, color: DS.faint }}>{cfg.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page Header ───────────────────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 28,
  }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.text, margin: 0, letterSpacing: '-0.4px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: DS.muted, margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </div>
);

// ─── Button ────────────────────────────────────────────────────────────────────
const Btn = ({ variant = 'primary', children, icon, onClick, small }) => {
  const [hov, setHov] = React.useState(false);
  const styles = {
    primary: {
      bg: hov ? DS.accentHover : DS.accent, color: '#fff',
      border: 'transparent',
    },
    secondary: {
      bg: hov ? DS.surfaceHover : DS.bg, color: DS.sub,
      border: DS.border,
    },
    ghost: {
      bg: hov ? DS.surfaceHover : 'transparent', color: DS.muted,
      border: 'transparent',
    },
    danger: {
      bg: hov ? '#B91C1C' : DS.danger, color: '#fff',
      border: 'transparent',
    },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 12px' : '8px 16px',
        borderRadius: 7, border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        fontSize: small ? 13 : 14, fontWeight: 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background 0.12s',
      }}
    >
      {icon && <Icon name={icon} size={14} color={s.color} />}
      {children}
    </button>
  );
};

// ─── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, title, actions }) => (
  <div style={{
    background: DS.bg, border: `1px solid ${DS.border}`,
    borderRadius: 10, overflow: 'hidden', ...style,
  }}>
    {(title || actions) && (
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${DS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{title}</span>
        {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);

// ─── Table ─────────────────────────────────────────────────────────────────────
const Table = ({ cols, rows }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead>
      <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
        {cols.map((c, i) => (
          <th key={i} style={{
            padding: '10px 16px', textAlign: 'left',
            fontSize: 11, fontWeight: 600, color: DS.muted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: DS.surface,
          }}>{c}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <TableRow key={ri} cells={row} isLast={ri === rows.length - 1} />
      ))}
    </tbody>
  </table>
);

const TableRow = ({ cells, isLast }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: isLast ? 'none' : `1px solid ${DS.border}`,
        background: hov ? DS.surface : DS.bg,
        transition: 'background 0.1s',
      }}
    >
      {cells.map((cell, ci) => (
        <td key={ci} style={{ padding: '11px 16px', color: DS.sub }}>{cell}</td>
      ))}
    </tr>
  );
};

// ─── Sparkline ─────────────────────────────────────────────────────────────────
const Sparkline = ({ data = [], color = DS.accent, width = 80, height = 30 }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const last = pts.split(' ').pop().split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
};

// ─── Multi-series Line Chart ────────────────────────────────────────────────────
// Picks a "nice" round number ≥ raw, e.g. 12400 → 13000, 142 → 150.
const niceCeil = (raw) => {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * pow;
};
const niceFloor = (raw) => {
  if (raw <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const niceNorm = norm >= 5 ? 5 : norm >= 2 ? 2 : norm >= 1 ? 1 : 0;
  return niceNorm * pow;
};
const fmtTick = (v, isCurrency) => {
  if (isCurrency) return v >= 1000 ? `£${Math.round(v/1000)}k` : `£${Math.round(v)}`;
  return v >= 1000 ? `${(v/1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : Math.round(v).toString();
};

const LineChart = ({ labels = [], series = [], height = 200 }) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(600);
  const [measuredH, setMeasuredH] = React.useState(200);

  React.useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      setW(wrapRef.current.clientWidth || 600);
      if (height === 'auto') setMeasuredH(wrapRef.current.clientHeight || 200);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [height]);

  const pL = 52, pR = 16, pT = 14, pB = 28;
  const totalW = Math.max(w, 280);
  const svgH = height === 'auto' ? Math.max(measuredH, 120) : height;
  const chartH = svgH - pT - pB;
  const ticks = 4;

  // Decide whether series share an axis or each gets its own scale.
  // Auto-split when the ratio between the largest and smallest series-max exceeds 5×.
  const seriesMax = series.map(s => Math.max(...s.data));
  const seriesMin = series.map(s => Math.min(...s.data));
  const overallMax = Math.max(...seriesMax);
  const overallMinPos = Math.min(...seriesMax) || 1;
  const splitScales = series.length > 1 && overallMax / overallMinPos > 5;

  // Build a per-series scale: { min, max } in data units
  const scales = series.map((s, i) => {
    if (!splitScales) {
      const lo = niceFloor(Math.min(...seriesMin));
      const hi = niceCeil(overallMax * 1.05);
      return { min: lo, max: hi };
    }
    const lo = niceFloor(seriesMin[i]);
    const hi = niceCeil(seriesMax[i] * 1.1);
    return { min: lo, max: hi };
  });

  const yPos = (v, scale) => {
    const r = scale.max - scale.min || 1;
    return pT + (1 - (v - scale.min) / r) * chartH;
  };
  const xPos = (i, len) => pL + (i / (len - 1 || 1)) * (totalW - pL - pR);

  const isCurrency0 = (series[0]?.label || '').includes('£');

  return (
    <div ref={wrapRef} style={{ width: '100%', height: height === 'auto' ? '100%' : svgH }}>
      <svg width={totalW} height={svgH} style={{ display: 'block' }}>
        {/* Grid lines + left axis (uses series[0] scale) */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = pT + (i / ticks) * chartH;
          const val0 = scales[0].max - (i / ticks) * (scales[0].max - scales[0].min);
          return (
            <g key={i}>
              <line x1={pL} y1={y} x2={totalW - pR} y2={y} stroke={DS.border} strokeWidth="1" />
              <text x={pL - 8} y={y + 3} textAnchor="end" fontSize="10" fill={DS.faint}>
                {fmtTick(val0, isCurrency0)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={xPos(i, labels.length)} y={svgH - 8}
            textAnchor="middle" fontSize="10" fill={DS.faint}>{l}</text>
        ))}

        {/* Lines */}
        {series.map((s, si) => {
          const d = s.data.map((v, i) =>
            `${i === 0 ? 'M' : 'L'}${xPos(i, s.data.length)},${yPos(v, scales[si])}`
          ).join(' ');
          return (
            <path key={si} d={d} fill="none" stroke={s.color}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          );
        })}

        {/* Dots */}
        {series.map((s, si) =>
          s.data.map((v, i) => (
            <circle key={`${si}-${i}`}
              cx={xPos(i, s.data.length)} cy={yPos(v, scales[si])}
              r="3" fill={s.color} />
          ))
        )}
      </svg>
    </div>
  );
};

// ─── Bar Chart ─────────────────────────────────────────────────────────────────
const BarChart = ({ labels = [], data = [], color = DS.accent, height = 160 }) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(600);

  React.useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => setW(wrapRef.current.clientWidth || 600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(...data) * 1.1 || 1;
  const pL = 8, pR = 8, pT = 8, pB = 24;
  const totalW = Math.max(w, 240);
  const svgH = height;
  const chartH = svgH - pT - pB;
  const slot = (totalW - pL - pR) / Math.max(data.length, 1);
  const barW = slot * 0.6;

  return (
    <div ref={wrapRef} style={{ width: '100%', height: svgH }}>
      <svg width={totalW} height={svgH} style={{ display: 'block' }}>
        {data.map((v, i) => {
          const bh = (v / max) * chartH;
          const x = pL + i * slot + (slot - barW) / 2;
          const y = pT + chartH - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bh}
                rx="3" fill={color} opacity="0.85" />
              <text x={x + barW / 2} y={svgH - 6} textAnchor="middle" fontSize="10" fill={DS.faint}>
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Score Pill ────────────────────────────────────────────────────────────────
const ScorePill = ({ score }) => {
  const color = score >= 80 ? DS.success : score >= 60 ? DS.warning : DS.danger;
  const bg    = score >= 80 ? DS.successBg : score >= 60 ? DS.warningBg : DS.dangerBg;
  return (
    <span style={{
      display: 'inline-block', minWidth: 36, textAlign: 'center',
      padding: '2px 8px', borderRadius: 5,
      background: bg, color, fontSize: 12, fontWeight: 600,
    }}>{score}%</span>
  );
};

// ─── Divider ───────────────────────────────────────────────────────────────────
const Divider = ({ margin = '16px 0' }) => (
  <div style={{ borderTop: `1px solid ${DS.border}`, margin }} />
);

// ─── Export ────────────────────────────────────────────────────────────────────
Object.assign(window, {
  DS, Icon, Badge, Avatar, KPICard, Sidebar, PageHeader, Btn, Card,
  Table, TableRow, Sparkline, LineChart, BarChart, ScorePill, Divider, NAV_CONFIG,
});
