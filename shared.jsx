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
  sidebarWmin:  '64px',
  // Page chrome: the content area is white, so white cards can't lift off it
  // with shadow alone. Cards get a visible (slightly darker than DS.border)
  // outline plus a soft shadow so each surface reads as distinct on white.
  page:         '#FFFFFF',
  // Navbar/sidebar and the breadcrumb header are white; the scrolling content
  // area sits on a soft grey "canvas" so white cards lift off it.
  sidebarBg:    '#FFFFFF',
  canvas:       '#F3F4F6',
  card:         '#FFFFFF',
  cardBorder:   '#DADDE3',
  cardShadow:   '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.08)',
  cardShadowHi: '0 1px 2px rgba(16,24,40,0.05), 0 6px 16px rgba(16,24,40,0.10)',
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
  mail:        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone:       'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  copy:        'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  link:        'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  filter:      'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
  dots:        'M5 12h.01M12 12h.01M19 12h.01',
  graduation:  'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-6-3.5V11l6 3 6-3v2.5',
  pin:         'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  folder:      'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  folder_open: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7zm0 3h18l-1.5 7a2 2 0 01-2 1.6H6.5a2 2 0 01-2-1.6L3 10z',
  archive:     'M4 7h16M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 11h6M4 7l1.5-3h13L20 7',
  tag:         'M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 7V5a2 2 0 012-2z',
  print:       'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z',
  file:        'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6',
  trash:       'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z',
  grid:        'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  list:        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  bold:        'M6 4h7a4 4 0 010 8H6V4zm0 8h8a4 4 0 010 8H6v-8z',
  heading:     'M6 4v16M18 4v16M6 12h12',
  bullet:      'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  flag:        'M4 21V4h13l-2 4 2 4H4',
  send:        'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  megaphone:   'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  sidebar:     'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M9 4v16',
  shield:      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  lock:        'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  video:       'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  mic:         'M19 11a7 7 0 01-14 0m7 7v4m0-4a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z',
  image:       'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  cloud:       'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z',
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
    background: DS.card, boxShadow: DS.cardShadow,
    border: `1px solid ${DS.cardBorder}`,
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

// ─── Colour helper ───────────────────────────────────────────────────────────────
// Lighten (positive pct) or darken (negative pct) a hex colour. Used to build the
// two-stop gradients on stat cards / hero so they re-theme with the live accent.
const shadeColor = (hex, pct) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
// Clean KPI tile (dashboards): hairline border, generous space, a quiet muted
// glyph and strong number typography. Colour appears only on the delta — the rest
// stays monochrome so a row of these reads calm and premium, not decorated. Same
// props as KPICard so it's a drop-in.
const StatCard = ({ label, value, sub, trend, trendDir, icon }) => {
  const [hov, setHov] = React.useState(false);
  const dcol = trendDir === 'up' ? DS.success : trendDir === 'down' ? DS.danger : DS.muted;
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: DS.card, boxShadow: DS.cardShadow,
        border: `1px solid ${hov ? DS.borderDark : DS.cardBorder}`,
        borderRadius: 12, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0,
        transition: 'border-color 0.14s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: DS.muted, fontWeight: 500 }}>{label}</span>
        {icon && <Icon name={icon} size={16} color={DS.faint} />}
      </div>
      <div>
        <div style={{ fontSize: 29, fontWeight: 700, color: DS.text, lineHeight: 1, letterSpacing: '-0.6px' }}>{value}</div>
        {(trend || sub) && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            {trend && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 500, color: dcol }}>
                <Icon name={trendDir === 'up' ? 'trending_up' : trendDir === 'down' ? 'trending_dn' : 'clock'} size={13} />
                {trend}
              </span>
            )}
            {sub && <span style={{ fontSize: 12.5, color: DS.muted }}>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sidebar ───────────────────────────────────────────────────────────────────
// Settings is one shared tabbed page per role: a role-specific first tab, then the
// common Notifications / Appearance / Account tabs. Build the sidebar sub-items so
// the dropdown mirrors that tab order. Tab ids must match Settings.jsx ROLE_TABS.
const SETTINGS_ROLE_TAB = {
  superadmin: { id: 'platform', label: 'Platform Defaults', icon: 'settings' },
  admin:      { id: 'centre',   label: 'Centre',            icon: 'book' },
  teacher:    { id: 'teaching', label: 'Teaching',          icon: 'teacher' },
  student:    { id: 'learning', label: 'Learning',          icon: 'brain' },
};
const SETTINGS_SUB = (role) => {
  const first = SETTINGS_ROLE_TAB[role] || SETTINGS_ROLE_TAB.admin;
  // Admins get a 2nd role-specific tab (plan + billing) after the Centre tab.
  const billing = role === 'admin' ? [{ id: 'billing', label: 'Plans & Billing', icon: 'invoice' }] : [];
  return [first, ...billing,
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'appearance',    label: 'Appearance',    icon: 'grid' },
    { id: 'account',       label: 'Account',       icon: 'user' },
  ].map(t => ({ id: `settings:${t.id}`, label: t.label, icon: t.icon }));
};

// Communications is one shared module across roles. Every role gets Announcements +
// Messages; admins additionally get the Safeguarding (DSL oversight) section, and
// the superadmin keeps the platform Support section. The composer + DSL view are
// gated inside the page by the permission helpers. Compound ids follow the
// `<parent>:<section>` dropdown convention.
const COMMS_BASE = [
  { id: 'comms:announcements', label: 'Announcements', icon: 'megaphone' },
  { id: 'comms:messages',      label: 'Messages',      icon: 'mail' },
];
const commsSub = (role) => {
  if (role === 'admin')      return [...COMMS_BASE, { id: 'comms:safeguarding', label: 'Safeguarding', icon: 'shield' }, { id: 'comms:settings', label: 'Comms settings', icon: 'settings' }];
  if (role === 'superadmin') return [...COMMS_BASE, { id: 'comms:support',      label: 'Support',      icon: 'message' }];
  return COMMS_BASE;
};

const NAV_CONFIG = {
  superadmin: {
    label: 'Platform Owner',
    color: '#7C3AED',
    items: [
      { id: 'dashboard',     icon: 'dashboard',   label: 'Overview' },
      { id: 'centres',       icon: 'book',        label: 'Centres' },
      { id: 'users',         icon: 'users',       label: 'Users' },
      { id: 'revenue',       icon: 'invoice',     label: 'Revenue' },
      { id: 'engagement',    icon: 'chart',       label: 'Engagement' },
      { id: 'system',        icon: 'zap',         label: 'System Health' },
      { id: 'comms',         icon: 'message',     label: 'Communications', sub: commsSub('superadmin') },
      { id: 'security',      icon: 'alert',       label: 'Security & Audit' },
      { id: 'controls',      icon: 'settings',    label: 'Platform Controls' },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings', sub: SETTINGS_SUB('superadmin') }],
  },
  admin: {
    label: 'Centre Admin',
    color: DS.accent,
    items: [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { id: 'centres',   icon: 'grid',     label: 'Centres' },
      { id: 'students',  icon: 'users',    label: 'Students' },
      { id: 'people',    icon: 'send',     label: 'People & invites' },
      { id: 'classes',   icon: 'book',     label: 'Classes', sub: [
        { id: 'classes:classes',  label: 'Classes',  icon: 'grid' },
        { id: 'classes:subjects', label: 'Subjects', icon: 'book' },
      ] },
      // Staff grouping — operational staff admin (Teachers + Timesheets) under one
      // dropdown. Subs keep their own page ids (`teachers`, `timesheets:review`) which
      // don't share the parent id, so the sidebar/breadcrumb resolve a group by
      // matching the active page against its subs (see subMatches in Sidebar).
      { id: 'staff', icon: 'users', label: 'Staff', sub: [
        { id: 'teachers',          label: 'Teachers',   icon: 'teacher' },
        { id: 'timesheets:review', label: 'Timesheets', icon: 'clock' },
      ] },
      { id: 'schedule',  icon: 'calendar', label: 'Schedule' },
      { id: 'invoices',  icon: 'invoice',  label: 'Invoices' },
      { id: 'reports',   icon: 'chart',    label: 'Reports', sub: [
        { id: 'reports:overview', label: 'Overview',    icon: 'dashboard' },
        { id: 'reports:browse',   label: 'All Reports', icon: 'list' },
        { id: 'reports:generate', label: 'Generate',    icon: 'plus' },
        { id: 'reports:settings', label: 'Settings',    icon: 'settings' },
      ] },
      { id: 'comms',     icon: 'message',  label: 'Communications', sub: commsSub('admin') },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings', sub: SETTINGS_SUB('admin') }],
  },
  teacher: {
    label: 'Teacher',
    color: '#0891B2',
    items: [
      { id: 'dashboard',       icon: 'dashboard', label: 'Dashboard' },
      { id: 'classes',         icon: 'book',      label: 'My Classes' },
      { id: 'timetable',       icon: 'calendar',  label: 'Timetable' },
      { id: 'lesson_planner',  icon: 'edit',      label: 'Lesson Planner' },
      { id: 'homework',        icon: 'clip',      label: 'Homework', sub: [
        { id: 'homework:assignments', label: 'Assignments', icon: 'clip' },
        { id: 'homework:analytics',   label: 'Analytics',   icon: 'chart' },
      ] },
      { id: 'attendance',      icon: 'check',     label: 'Attendance' },
      { id: 'timesheet',       icon: 'clock',     label: 'Timesheet' },
      { id: 'progress',        icon: 'chart',     label: 'Progress' },
      { id: 'tracking',        icon: 'star',      label: 'Tracking' },
      { id: 'reports',         icon: 'file',      label: 'Reports' },
      { id: 'comms',           icon: 'message',   label: 'Communications', sub: commsSub('teacher') },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings', sub: SETTINGS_SUB('teacher') }],
  },
  student: {
    label: 'Student',
    color: '#43b190',
    items: [
      { id: 'dashboard', icon: 'home',      label: 'Overview'   },
      { id: 'homework',  icon: 'clip',      label: 'Homework', sub: [
        { id: 'homework:assignments', label: 'Assignments', icon: 'clip' },
        { id: 'homework:submitted',   label: 'Submitted',   icon: 'upload' },
        { id: 'homework:results',     label: 'Results',     icon: 'eye' },
      ] },
      { id: 'progress',  icon: 'chart',     label: 'My Progress'},
      { id: 'sessions',  icon: 'calendar',  label: 'Sessions'   },
      { id: 'reports',   icon: 'file',      label: 'Reports'},
      { id: 'comms',     icon: 'message',   label: 'Communications', sub: commsSub('student') },
    ],
    bottom: [{ id: 'settings', icon: 'settings', label: 'Settings', sub: SETTINGS_SUB('student') }],
  },
};

// The page id is the part before any `:` — sub-sections use a `<parent>:<sub>`
// convention (e.g. reports:browse) while ordinary sub-pages use `<id>_<detail>`
// (e.g. students_add). Both fold back to the parent for nav highlighting.
const navParentId = (active) => (active || '').split(':')[0].split('_')[0];

// Hover states on the grey sidebar need a *lighter* (white-ish) wash than the
// page primitives' DS.surfaceHover, which is nearly the same grey as the bar.
// Hover wash for items on the (now white) sidebar — a faint neutral grey so it
// reads on white. (Was a translucent white that only showed on the old grey bar.)
const SIDE_HOVER = 'rgba(17,24,39,0.045)';

// Workspace-style centre switcher in the sidebar header. A staff account can be
// linked to several centres (each its own subscription); clicking the centre name
// opens a dropdown to switch between them or start a new one. Module-scoped (not
// nested in Sidebar) so its open/dropdown state survives parent re-renders. The
// open/close + click-away mirror NotificationBell (Communications.jsx).
const CentreSwitcher = ({ collapsed, centre, centres, onSwitchCentre, onAddCentre, roleLabel, planUsage }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (id) => { setOpen(false); if (id !== centre.id) onSwitchCentre && onSwitchCentre(id); };
  const add  = () => { setOpen(false); onAddCentre && onAddCentre(); };
  const tile = (name, active) => (
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: active ? DS.accent : DS.muted,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>{(name || 'C').slice(0, 1).toUpperCase()}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={collapsed ? centre.name : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: open ? SIDE_HOVER : 'transparent', border: 'none',
          borderRadius: 8, padding: collapsed ? '8px 0' : '6px 8px', cursor: 'pointer',
          textAlign: 'left', transition: 'background 0.12s',
        }}>
        {tile(centre.name, true)}
        {!collapsed && (
          <React.Fragment>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DS.text, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{centre.name}</div>
              <div style={{ fontSize: 10.5, color: DS.muted, marginTop: 1 }}>{roleLabel}</div>
            </div>
            <Icon name="chevron_d" size={15} color={DS.faint} />
          </React.Fragment>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 60,
          ...(collapsed ? { left: '100%', top: 0, marginLeft: 10, width: 248 } : { left: 0, right: 0, top: '100%', marginTop: 6 }),
          background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 11,
          boxShadow: DS.cardShadowHi, padding: 6, animation: 'tos-fade 0.1s ease',
        }}>
          <div style={{ fontSize: 10, color: DS.faint, padding: '4px 8px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your centres</div>
          {centres.map(c => {
            const active = c.id === centre.id;
            return (
              <button key={c.id} onClick={() => pick(c.id)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = DS.surfaceHover; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? DS.accentLight : 'transparent', textAlign: 'left',
                }}>
                {tile(c.name, active)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? DS.accent : DS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: DS.muted, textTransform: 'capitalize' }}>{c.roles.join(' · ')}{c.city ? ` · ${c.city}` : ''}</div>
                </div>
                {active && <Icon name="check" size={15} color={DS.accent} />}
              </button>
            );
          })}
          {planUsage && (
            <div style={{ fontSize: 10.5, color: DS.faint, padding: '6px 8px 2px' }}>
              {planUsage.used} of {planUsage.max} centre{planUsage.max === 1 ? '' : 's'} used
            </div>
          )}
          <div style={{ height: 1, background: DS.border, margin: '6px 4px' }} />
          <button onClick={add}
            onMouseEnter={e => { e.currentTarget.style.background = DS.surfaceHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', textAlign: 'left',
            }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, border: `1px dashed ${DS.borderDark}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.muted }}>
              <Icon name="plus" size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>Add a centre</div>
              <div style={{ fontSize: 11, color: DS.faint }}>Add or manage centres</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ role, active = 'dashboard', onNav, onRoleSwitch, badges, collapsed = false, centre, centres, onSwitchCentre, onAddCentre, identityName, planUsage, cloudStorage }) => {
  const cfg = NAV_CONFIG[role];
  const [hoveredItem, setHoveredItem] = React.useState(null);

  // A sub-item matches the active page when it's an exact compound-section match
  // (e.g. reports:browse) OR a "whole page" sub (e.g. Teachers) whose page-parent
  // folds onto it — `teacher_profile` → `teacher` → `teachers`. Compound sub ids
  // contain ':' so the folding clauses can never false-match them.
  // The last clause folds a drill-in page onto a compound sub: `timesheet_detail`
  // → `timesheet` → `timesheets` matches the Staff sub `timesheets:review`.
  const subMatches = (sub) => active === sub.id || navParentId(active) === sub.id || navParentId(active) + 's' === sub.id || navParentId(active) + 's' === sub.id.split(':')[0];
  const itemIsActive = (item) => {
    const base = navParentId(active);
    if (active === item.id || base === item.id || base + 's' === item.id) return true;
    return Array.isArray(item.sub) && item.sub.some(subMatches);
  };

  // Which parent dropdowns are open. The item owning the active page starts
  // expanded — resolved via itemIsActive so groups whose subs don't share the
  // parent id (e.g. Staff) still auto-open.
  const allNavItems = [...(cfg.items || []), ...(cfg.bottom || [])];
  const activeItemId = (allNavItems.find(itemIsActive) || {}).id || navParentId(active);
  const [expanded, setExpanded] = React.useState(() => ({ [activeItemId]: true }));
  React.useEffect(() => { setExpanded(e => ({ ...e, [activeItemId]: true })); }, [activeItemId]);

  // When collapsed the bar is icon-only; hovering an item reveals a floating
  // flyout (its label, or the sub-item menu for parents). Tracks which item's
  // flyout is open + a small close delay so travelling into the flyout is smooth.
  const [flyout, setFlyout] = React.useState(null);
  const flyoutTimer = React.useRef(null);
  const openFlyout = (id) => { clearTimeout(flyoutTimer.current); setFlyout(id); };
  const closeFlyout = () => { flyoutTimer.current = setTimeout(() => setFlyout(null), 120); };

  const NavItem = ({ item }) => {
    const hasSub = Array.isArray(item.sub) && item.sub.length > 0;
    const isActive = itemIsActive(item);
    const isHovered = hoveredItem === item.id;
    const isOpen = hasSub && !!expanded[item.id];
    const badgeCount = badges && badges[item.id] ? badges[item.id] : 0;
    const showFlyout = collapsed && flyout === item.id;

    // Clicking a parent with sub-items expands it and navigates to its first
    // section; clicking the chevron only toggles the dropdown.
    const onParentClick = () => {
      if (hasSub) {
        setExpanded(e => ({ ...e, [item.id]: true }));
        if (!isActive) onNav && onNav(item.sub[0].id);
      } else {
        onNav && onNav(item.id);
      }
    };
    const onChevron = (e) => { e.stopPropagation(); setExpanded(ex => ({ ...ex, [item.id]: !isOpen })); };

    return (
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => collapsed && openFlyout(item.id)}
        onMouseLeave={() => collapsed && closeFlyout()}
      >
        <button
          onClick={onParentClick}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          title={collapsed ? item.label : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 0' : '8px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 7, width: '100%',
            border: 'none', background: isActive ? DS.accentLight : isHovered ? SIDE_HOVER : 'transparent',
            color: isActive ? DS.accent : DS.sub,
            cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 400,
            textAlign: 'left', transition: 'background 0.12s', position: 'relative',
          }}
        >
          <Icon name={item.icon} size={16} color={isActive ? DS.accent : DS.muted} />
          {!collapsed && <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>}
          {/* When collapsed, surface unread counts as a small corner dot */}
          {collapsed && badgeCount > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 9,
              width: 7, height: 7, borderRadius: '50%',
              background: DS.danger, border: `1.5px solid ${DS.sidebarBg}`,
            }} />
          )}
          {!collapsed && badgeCount > 0 && (
            <span style={{
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
              background: DS.danger, color: '#fff', fontSize: 10.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
            }}>{badgeCount > 9 ? '9+' : badgeCount}</span>
          )}
          {!collapsed && (hasSub ? (
            <span
              onClick={onChevron}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 'auto', padding: 2, borderRadius: 4,
                transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Icon name="chevron_d" size={15} color={isActive ? DS.accent : DS.faint} />
            </span>
          ) : isActive && (
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: DS.accent, marginLeft: 'auto',
            }} />
          ))}
        </button>

        {/* Expanded sub-items — indented under a vertical guide line */}
        {!collapsed && hasSub && isOpen && (
          <div style={{
            position: 'relative', margin: '2px 0 4px',
            paddingLeft: 23, display: 'flex', flexDirection: 'column', gap: 1,
          }}>
            <div style={{
              position: 'absolute', left: 13, top: 4, bottom: 4,
              width: 1, background: DS.border,
            }} />
            {item.sub.map(s => <SubNavItem key={s.id} sub={s} />)}
          </div>
        )}

        {/* Collapsed flyout — label-only for leaf items, a sub-menu for parents */}
        {showFlyout && (
          <div
            onMouseEnter={() => openFlyout(item.id)}
            onMouseLeave={closeFlyout}
            style={{
              position: 'absolute', left: '100%', top: -2, marginLeft: 10, zIndex: 50,
              minWidth: hasSub ? 184 : 'auto', padding: hasSub ? 6 : 0,
              background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10,
              boxShadow: DS.cardShadowHi,
              animation: 'tos-fade 0.1s ease',
            }}
          >
            <div style={{
              padding: hasSub ? '6px 10px 8px' : '8px 12px',
              fontSize: 13, fontWeight: 600, color: DS.text,
              whiteSpace: 'nowrap',
              borderBottom: hasSub ? `1px solid ${DS.border}` : 'none',
              cursor: 'pointer',
            }} onClick={onParentClick}>{item.label}</div>
            {hasSub && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 4 }}>
                {item.sub.map(s => <SubNavItem key={s.id} sub={s} flyout />)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const SubNavItem = ({ sub, flyout: inFlyout }) => {
    const isActive = subMatches(sub);
    const isHovered = hoveredItem === sub.id;
    return (
      <button
        onClick={() => onNav && onNav(sub.id)}
        onMouseEnter={() => setHoveredItem(sub.id)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '7px 10px', borderRadius: 6, border: 'none',
          background: isActive ? DS.accentLight : isHovered ? (inFlyout ? DS.surfaceHover : SIDE_HOVER) : 'transparent',
          color: isActive ? DS.accent : DS.muted,
          cursor: 'pointer', fontSize: 13.5, fontWeight: isActive ? 600 : 400,
          textAlign: 'left', transition: 'background 0.12s', whiteSpace: 'nowrap',
        }}
      >
        <Icon name={sub.icon} size={13} color={isActive ? DS.accent : DS.faint} />
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.label}</span>
      </button>
    );
  };

  const userName = identityName || (role === 'superadmin' ? 'Marcus Hale' : role === 'admin' ? 'Lisa Chen' : role === 'teacher' ? 'Sarah Clarke' : 'Oliver Chen');
  // Centre switcher (top-left) shows for staff identities whose account resolves
  // to one or more centres; otherwise the header is the static product logo.
  const switcherOn = !!(centre && centres && centres.length);

  return (
    <div style={{
      width: collapsed ? DS.sidebarWmin : DS.sidebarW, flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      background: DS.sidebarBg, borderRight: `1px solid ${DS.border}`,
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '0 10px' : '0 12px',
      transition: 'width 0.16s ease',
    }}>
      {/* Header — centre switcher for staff identities, else the product logo.
          Fixed to 52px (matching the TopBar height) so its bottom border lines
          up exactly with the header's, forming one continuous line across the
          sidebar + content header. */}
      <div style={{
        height: 52, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        borderBottom: `1px solid ${DS.border}`,
        marginBottom: 8,
      }}>
        {switcherOn ? (
          <CentreSwitcher collapsed={collapsed} centre={centre} centres={centres} planUsage={planUsage}
            onSwitchCentre={onSwitchCentre} onAddCentre={onAddCentre} roleLabel={cfg.label} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, padding: collapsed ? 0 : '0 4px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: DS.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.5px' }}>T</span>
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>TutorOS</div>
                <div style={{ fontSize: 10, color: DS.muted, marginTop: 1 }}>{cfg.label}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role switcher (demo) — hidden while collapsed */}
      {onRoleSwitch && !collapsed && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: DS.faint, padding: '4px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Switch view</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['superadmin','Owner'],['admin','Admin'],['teacher','Teacher'],['student','Student']].map(([r,lbl]) => (
              <button key={r} onClick={() => onRoleSwitch(r)} style={{
                padding: '4px 6px', borderRadius: 5, border: `1px solid ${role === r ? DS.accentBorder : DS.border}`,
                background: role === r ? DS.accentLight : DS.bg,
                color: role === r ? DS.accent : DS.muted,
                fontSize: 10, fontWeight: role === r ? 600 : 400, cursor: 'pointer',
              }}>{lbl}</button>
            ))}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: collapsed ? 'visible' : 'auto' }}>
        {cfg.items.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Bottom items */}
      <div style={{ paddingBottom: 12, borderTop: `1px solid ${DS.border}`, paddingTop: 8 }}>
        {cfg.bottom.map(item => <NavItem key={item.id} item={item} />)}

        {/* Cloud-storage usage — admin only, just above the user profile.
            Quota comes from the account's plan (cloudStorage.totalGb). */}
        {cloudStorage && !collapsed && (() => {
          const { usedGb = 0, totalGb = 0 } = cloudStorage;
          const pct = totalGb ? Math.min(100, Math.round((usedGb / totalGb) * 100)) : 0;
          return (
            <div style={{ margin: '8px 0 4px', padding: '12px 14px', borderRadius: 12, background: DS.accent, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Icon name="cloud" size={16} color="#fff" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Cloud storage</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#fff', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 11.5, marginTop: 8, color: 'rgba(255,255,255,0.92)' }}>
                {usedGb} GB of {totalGb} GB used
              </div>
            </div>
          );
        })()}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10, padding: collapsed ? '8px 0' : '8px 12px', marginTop: 4,
        }} title={collapsed ? userName : undefined}>
          <Avatar name="User" size={28} color={cfg.color} />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: DS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </div>
              <div style={{ fontSize: 11, color: DS.faint }}>{cfg.label}</div>
            </div>
          )}
        </div>
        {/* Platform wordmark — the top-left slot now belongs to the centre, so
            the "TutorOS" branding lives here as a quiet "powered by" footer. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          paddingTop: 8, marginTop: 4, borderTop: `1px solid ${DS.border}`,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.faint, letterSpacing: '-0.2px' }}>
            {collapsed ? 'T' : 'TutorOS'}
          </span>
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
const Btn = ({ variant = 'primary', children, icon, onClick, small, style = {} }) => {
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
        transition: 'background 0.12s', ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} color={s.color} />}
      {children}
    </button>
  );
};

// ─── Card ──────────────────────────────────────────────────────────────────────
// `icon` + `accent` are optional: when given, the header gains a small gradient
// glyph chip in the accent colour, so a stack of section cards reads as distinct,
// colour-coded surfaces. Omitting them keeps the original plain header (no change
// for the many existing callers).
const Card = ({ children, style = {}, title, subtitle, actions, icon, accent }) => {
  const ac = accent || DS.accent;
  return (
    <div style={{
      background: DS.card, boxShadow: DS.cardShadow,
      border: `1px solid ${DS.cardBorder}`,
      borderRadius: 10, overflow: 'hidden', ...style,
    }}>
      {(title || actions) && (
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${DS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: icon ? `linear-gradient(180deg, ${ac}0A, transparent)` : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            {icon && (
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${ac}, ${shadeColor(ac, -16)})`,
                color: '#fff', boxShadow: `0 3px 8px ${ac}3A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={icon} size={15} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{title}</span>
              {subtitle && <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

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

const LineChart = ({ labels = [], series = [], height = 200, area = false }) => {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
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
        {/* Optional gradient area fill beneath each line */}
        {area && (
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`tos-area-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.24" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
        )}
        {area && series.map((s, si) => {
          const baseline = pT + chartH;
          const dArea = `M ${xPos(0, s.data.length)},${baseline} ` +
            s.data.map((v, i) => `L ${xPos(i, s.data.length)},${yPos(v, scales[si])}`).join(' ') +
            ` L ${xPos(s.data.length - 1, s.data.length)},${baseline} Z`;
          return <path key={`area-${si}`} d={dArea} fill={`url(#tos-area-${uid}-${si})`} stroke="none" />;
        })}

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

// ─── Modal ─────────────────────────────────────────────────────────────────────
// Centred dialog with backdrop, header, scrollable body and a sticky footer.
const Modal = ({ open, onClose, title, subtitle, icon, iconColor, width = 520, footer, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const ic = iconColor || DS.accent;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'tos-fade 0.12s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '100%', maxHeight: '90vh',
          background: DS.bg, borderRadius: 14, border: `1px solid ${DS.border}`,
          boxShadow: '0 24px 64px rgba(17,24,39,0.22), 0 2px 8px rgba(17,24,39,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'tos-pop 0.14s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 22px 16px' }}>
          {icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: ic + '18', color: ic,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={icon} size={19} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DS.text, letterSpacing: '-0.2px' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: DS.muted, marginTop: 2, lineHeight: 1.5 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: DS.faint,
            padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0,
          }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '4px 22px 20px', overflow: 'auto', flex: 1 }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '14px 22px', borderTop: `1px solid ${DS.border}`, background: DS.surface,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
};

// ─── Form field primitives ───────────────────────────────────────────────────────
const Field = ({ label, hint, required, error, children, style }) => (
  <div style={{ marginBottom: 16, ...style }}>
    {label && (
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: DS.sub }}>{label}</span>
        {required && <span style={{ color: DS.danger, fontSize: 12 }}>*</span>}
      </label>
    )}
    {children}
    {error
      ? <div style={{ fontSize: 11.5, color: DS.danger, marginTop: 5 }}>{error}</div>
      : hint && <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 5 }}>{hint}</div>}
  </div>
);

const inputBase = (invalid, focused) => ({
  width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
  border: `1px solid ${invalid ? DS.dangerBorder : focused ? DS.accent : DS.border}`,
  boxShadow: focused ? `0 0 0 3px ${DS.accentLight}` : 'none',
  fontSize: 13.5, color: DS.text, background: DS.bg, outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s', fontFamily: 'inherit',
});

const Input = ({ invalid, icon, style, ...props }) => {
  const [focused, setFocused] = React.useState(false);
  const input = (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus && props.onFocus(e); }}
      onBlur={e => { setFocused(false); props.onBlur && props.onBlur(e); }}
      style={{ ...inputBase(invalid, focused), ...(icon ? { paddingLeft: 36 } : {}), ...style }}
    />
  );
  if (!icon) return input;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: DS.faint, display: 'flex' }}>
        <Icon name={icon} size={15} />
      </div>
      {input}
    </div>
  );
};

const Textarea = ({ invalid, style, ...props }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus && props.onFocus(e); }}
      onBlur={e => { setFocused(false); props.onBlur && props.onBlur(e); }}
      style={{ ...inputBase(invalid, focused), resize: 'vertical', minHeight: 76, ...style }}
    />
  );
};

const Select = ({ invalid, style, children, ...props }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select
        {...props}
        onFocus={e => { setFocused(true); props.onFocus && props.onFocus(e); }}
        onBlur={e => { setFocused(false); props.onBlur && props.onBlur(e); }}
        style={{
          ...inputBase(invalid, focused), appearance: 'none', paddingRight: 34,
          cursor: 'pointer',
          // never wrap the selected value — clip with an ellipsis when the control is narrow
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          ...style,
        }}
      >{children}</select>
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: DS.faint, pointerEvents: 'none', display: 'flex' }}>
        <Icon name="chevron_d" size={15} />
      </div>
    </div>
  );
};

// ─── Segmented control ───────────────────────────────────────────────────────────
const Segmented = ({ options, value, onChange, fullWidth }) => (
  <div style={{
    display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : undefined, padding: 3, gap: 2,
    background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9,
  }}>
    {options.map(o => {
      const id = o.id ?? o.value ?? o;
      const label = o.label ?? o;
      const active = value === id;
      return (
        <button key={id} onClick={() => onChange(id)} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          flex: fullWidth ? 1 : undefined,
          padding: '6px 13px', borderRadius: 7, border: 'none',
          background: active ? DS.bg : 'transparent',
          boxShadow: active ? '0 1px 2px rgba(17,24,39,0.08)' : 'none',
          color: active ? DS.text : DS.muted,
          fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
          transition: 'all 0.12s', whiteSpace: 'nowrap',
        }}>
          {label}
          {o.count != null && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '0 6px', borderRadius: 10,
              background: active ? DS.accentLight : DS.border,
              color: active ? DS.accent : DS.muted, minWidth: 18, textAlign: 'center',
            }}>{o.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── Search input ────────────────────────────────────────────────────────────────
const SearchInput = ({ value, onChange, placeholder = 'Search…', style }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flex: 1,
      background: DS.bg, borderRadius: 8, padding: '8px 12px',
      border: `1px solid ${focused ? DS.accent : DS.border}`,
      boxShadow: focused ? `0 0 0 3px ${DS.accentLight}` : 'none',
      transition: 'border-color 0.12s, box-shadow 0.12s', ...style,
    }}>
      <Icon name="search" size={15} color={DS.faint} />
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ border: 'none', outline: 'none', fontSize: 13.5, color: DS.text, flex: 1, background: 'transparent' }}
      />
    </div>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────────
const EmptyState = ({ icon = 'search', title, message, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '56px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 14, marginBottom: 16,
      background: DS.surface, border: `1px solid ${DS.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.faint,
    }}>
      <Icon name={icon} size={22} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 600, color: DS.text }}>{title}</div>
    {message && <div style={{ fontSize: 13, color: DS.muted, marginTop: 4, maxWidth: 320, lineHeight: 1.5 }}>{message}</div>}
    {action && <div style={{ marginTop: 18 }}>{action}</div>}
  </div>
);

// ─── Divider ───────────────────────────────────────────────────────────────────
const Divider = ({ margin = '16px 0' }) => (
  <div style={{ borderTop: `1px solid ${DS.border}`, margin }} />
);

// ─── Dashboard customisation ─────────────────────────────────────────────────────
// A small per-user preference store (localStorage) that records which dashboard
// sections each role wants visible. `sections` is the catalogue of toggleable
// blocks: [{ id, label, hint }]. Anything not yet in the saved map defaults to on,
// so adding a new section later is backward-compatible.
const useDashboardPrefs = (storageKey, sections) => {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
    catch (e) { return {}; }
  };
  const [prefs, setPrefs] = React.useState(read);
  const isOn = (id) => prefs[id] !== false;   // default-on
  const setOn = (id, on) => setPrefs(prev => {
    const next = { ...prev, [id]: on };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}
    return next;
  });
  const reset = () => {
    setPrefs({});
    try { localStorage.removeItem(storageKey); } catch (e) {}
  };
  return { sections, isOn, setOn, reset, hiddenCount: sections.filter(s => prefs[s.id] === false).length };
};

// Toggle list inside a Modal — pair with a "Customise" button in the page header.
const CustomiseModal = ({ open, onClose, prefs, title = 'Customise dashboard', subtitle = 'Choose which sections appear on your dashboard.' }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    icon="settings"
    width={440}
    footer={
      <>
        <Btn variant="ghost" small onClick={prefs.reset}>Reset to default</Btn>
        <Btn variant="primary" small onClick={onClose}>Done</Btn>
      </>
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {prefs.sections.map((s, i) => {
        const on = prefs.isOn(s.id);
        return (
          <button
            key={s.id}
            onClick={() => prefs.setOn(s.id, !on)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
              padding: '12px 6px', border: 'none', background: 'transparent', cursor: 'pointer',
              borderBottom: i < prefs.sections.length - 1 ? `1px solid ${DS.border}` : 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: DS.text }}>{s.label}</div>
              {s.hint && <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{s.hint}</div>}
            </div>
            <Toggle on={on} />
          </button>
        );
      })}
    </div>
  </Modal>
);

// Small on/off switch used by the customisation list.
const Toggle = ({ on }) => (
  <span style={{
    width: 38, height: 22, borderRadius: 11, flexShrink: 0, position: 'relative',
    background: on ? DS.accent : DS.borderDark, transition: 'background 0.15s',
  }}>
    <span style={{
      position: 'absolute', top: 2, left: on ? 18 : 2,
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s',
    }} />
  </span>
);

// ─── Export ────────────────────────────────────────────────────────────────────
Object.assign(window, {
  DS, Icon, Badge, Avatar, KPICard, StatCard, shadeColor, Sidebar, PageHeader, Btn, Card,
  Table, TableRow, Sparkline, LineChart, BarChart, ScorePill, Divider, NAV_CONFIG, navParentId,
  Modal, Field, Input, Textarea, Select, Segmented, SearchInput, EmptyState,
  useDashboardPrefs, CustomiseModal, Toggle,
});
