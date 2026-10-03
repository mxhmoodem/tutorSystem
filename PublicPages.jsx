// ══════════════════════════════════════════════════════════════════════════════
//  Klasio — public pages: status page, maintenance screen, and where to preview
// ──────────────────────────────────────────────────────────────────────────────
//  The pages people see outside the app, or instead of it:
//    • StatusPage        — ?view=status. A PREVIEW of the public status page. In
//                          production the external uptime monitor hosts it
//                          (runbook C6) and it stays private until an SLA
//                          (decision #36). It reads the same roll-up as System
//                          Health (SAHealth), but lists customer-facing
//                          components and incident wording — never infra names.
//    • MaintenanceScreen — replaces the app for every tenant while maintenance
//                          mode is on (decision #35); ?view=maintenance previews it.
//    • 404.html          — a standalone file at the repo root (no React, no
//                          Babel), so it renders at any address. Vercel serves
//                          it for every path that doesn't exist.
//    • PublicPagesCard   — Platform Controls' list of all of them, with previews.
//
//  Loads after SuperAdmin.jsx (usePlatformSettings, refreshPlatformSettings,
//  SAHealth). Wrapped in an IIFE; exports on window.
// ══════════════════════════════════════════════════════════════════════════════
(() => {

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const absUrl = (rel) => new URL(rel, window.location.href).href;
const openInNewTab = (rel) => window.open(absUrl(rel), '_blank', 'noopener');
const toneOf = (tone) => ({
  success: { c: DS.success, bg: DS.successBg, border: DS.successBorder, icon: 'check' },
  warning: { c: DS.warning, bg: DS.warningBg, border: DS.warningBorder, icon: 'alert' },
  danger:  { c: DS.danger,  bg: DS.dangerBg,  border: DS.dangerBorder,  icon: 'alert' },
}[tone] || { c: DS.muted, bg: DS.surface, border: DS.border, icon: 'info' });

// A dark strip across the top of a preview, so it can't be mistaken for the page.
const PreviewStrip = ({ children, right }) => (
  <div style={{ background: '#1F2937', color: '#F9FAFB', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.14)', padding: '2px 8px', borderRadius: 5 }}>Preview</span>
    <span style={{ flex: 1, minWidth: 220, color: '#E5E7EB', lineHeight: 1.45 }}>{children}</span>
    {right}
    <button onClick={() => window.__navigate && window.__navigate('superadmin', 'controls')}
      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      Owner console
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS PAGE (preview)
// ═══════════════════════════════════════════════════════════════════════════
const StatusPage = () => {
  const [platform] = window.usePlatformSettings();
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);
  const H = window.SAHealth;
  const now = new Date(window.SA_NOW || Date.now());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Array.from({ length: 90 }, (_, i) => new Date(today.getTime() - (89 - i) * DAY));
  const components = H.components();
  const overall = H.meta(H.overall());
  const overallTone = toneOf(overall.tone);
  const incidents = (window.SA_INCIDENTS || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const active = incidents.filter(i => i.status !== 'resolved');
  const past = incidents.filter(i => i.status === 'resolved');
  const componentName = (id) => (components.find(c => c.id === id) || {}).name || id;

  // One bar per day: an incident colours it by severity; today shows live status.
  const barFor = (c, d) => {
    const inc = incidents.find(i => i.component === c.id && i.date === isoDay(d));
    if (inc) return { color: inc.severity === 'major' ? DS.danger : DS.warning, tip: `${fmtDay(d)} — ${inc.public.title} (${inc.duration})` };
    if (isoDay(d) === isoDay(today) && c.status !== 'operational') return { color: toneOf(H.meta(c.status).tone).c, tip: `${fmtDay(d)} — ${H.meta(c.status).label}` };
    return { color: '#4ADE80', tip: `${fmtDay(d)} — No incidents` };
  };
  // Uptime over the 90 days: a major incident counts in full, a minor one a quarter.
  const uptimeFor = (c) => {
    const down = incidents
      .filter(i => i.component === c.id && new Date(i.date + 'T00:00:00') >= days[0])
      .reduce((n, i) => n + (i.minutes || 0) * (i.severity === 'major' ? 1 : 0.25), 0);
    const pct = 100 * (1 - down / (90 * 1440));
    return pct >= 99.995 ? '100%' : `${pct.toFixed(2)}%`;
  };

  const H2 = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '34px 0 12px' }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DS.text, letterSpacing: '-0.2px' }}>{children}</h2>
      {right && <span style={{ fontSize: 12.5, color: DS.faint }}>{right}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: '100%', background: DS.bg }}>
      <PreviewStrip>
        {platform.statusPagePublic
          ? <>Published at <b>{BRAND.statusDomain}</b>.</>
          : <>Private — nobody outside can see this. It publishes at <b>{BRAND.statusDomain}</b> only when “Public status page” is on in Platform Controls.</>}
        {' '}In production the uptime monitor hosts this page; this is the layout and wording to set up there.
      </PreviewStrip>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 56px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <KlasioLogo height={30} />
          <span style={{ width: 1, height: 22, background: DS.border }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: DS.muted }}>Status</span>
          <div style={{ marginLeft: 'auto' }}>
            <Btn variant="secondary" small icon="bell" onClick={() => setSubscribeOpen(o => !o)}>Get updates</Btn>
          </div>
        </div>
        {subscribeOpen && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: DS.surface, border: `1px solid ${DS.border}`, fontSize: 12.5, color: DS.sub, lineHeight: 1.5 }}>
            Email and text updates are handled by the page's host (the uptime monitor), so they work even when {BRAND.name} is down. Centres affected by an incident also hear about it from you as a platform announcement.
          </div>
        )}

        {/* Overall status */}
        <div style={{ marginTop: 26, padding: '20px 22px', borderRadius: 12, background: overallTone.bg, border: `1px solid ${overallTone.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: overallTone.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={overallTone.icon} size={19} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: DS.text, letterSpacing: '-0.3px' }}>{overall.headline}</div>
            <div style={{ fontSize: 12.5, color: DS.muted, marginTop: 2 }}>Last checked {fmtTime(now)} UK time, {fmtDay(now)}</div>
          </div>
        </div>

        {/* Active incidents */}
        {active.length > 0 && <>
          <H2>Active incidents</H2>
          {active.map(i => (
            <div key={i.date + i.title} style={{ padding: '14px 18px', borderRadius: 10, border: `1px solid ${DS.warningBorder}`, background: DS.warningBg, marginBottom: 10 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: DS.text }}>{i.public.title}</div>
              <div style={{ fontSize: 13.5, color: DS.sub, marginTop: 4, lineHeight: 1.55 }}>{i.public.body}</div>
              <div style={{ fontSize: 12, color: DS.muted, marginTop: 6 }}>Affects {componentName(i.component)} · Investigating</div>
            </div>
          ))}
        </>}

        {/* Components */}
        <H2 right="Uptime over the past 90 days">Services</H2>
        <div style={{ border: `1px solid ${DS.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {components.map((c, idx) => {
            const meta = H.meta(c.status);
            return (
              <div key={c.id} style={{ padding: '16px 20px', borderTop: idx ? `1px solid ${DS.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: DS.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: DS.muted, marginTop: 1 }}>{c.desc}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.status === 'operational' ? DS.success : toneOf(meta.tone).c, whiteSpace: 'nowrap' }}>{meta.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 2, height: 30, marginTop: 12 }} aria-label={`${c.name}: daily history for the past 90 days`}>
                  {days.map(d => {
                    const b = barFor(c, d);
                    return <div key={isoDay(d)} title={b.tip} style={{ flex: 1, minWidth: 1, borderRadius: 2, background: b.color }} />;
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: DS.faint, marginTop: 6 }}>
                  <span>90 days ago</span>
                  <span style={{ color: DS.muted, fontWeight: 600 }}>{uptimeFor(c)} uptime</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: DS.muted }}>
          {[['#4ADE80', 'No incidents'], [DS.warning, 'Minor incident'], [DS.danger, 'Major incident']].map(([c, l]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}</span>
          ))}
        </div>

        {/* Past incidents */}
        <H2>Past incidents</H2>
        {past.length === 0 && <div style={{ fontSize: 13.5, color: DS.muted }}>No incidents in the past 90 days.</div>}
        {past.map((i, idx) => (
          <div key={i.date + i.title} style={{ padding: '16px 0', borderTop: idx ? `1px solid ${DS.border}` : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fmtDay(new Date(i.date + 'T00:00:00'))}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: DS.text }}>{i.public.title}</span>
              <StatusPill tone={i.severity === 'major' ? 'negative' : 'warning'}>{i.severity === 'major' ? 'Major' : 'Minor'}</StatusPill>
            </div>
            <div style={{ fontSize: 13.5, color: DS.sub, marginTop: 5, lineHeight: 1.6 }}>{i.public.body}</div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 6 }}>Resolved · lasted {i.duration} · affected {componentName(i.component)}</div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 18, borderTop: `1px solid ${DS.border}`, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: DS.muted }}>
          <span>© {BRAND.name}</span>
          <span>Questions? <a href={`mailto:${BRAND.supportEmail}`} style={{ color: DS.accent }}>{BRAND.supportEmail}</a></span>
          <span style={{ marginLeft: 'auto' }}>All times are UK time</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAINTENANCE SCREEN
// ═══════════════════════════════════════════════════════════════════════════
//  What every tenant session gets instead of the app while maintenance mode is
//  on. `audience` picks the safeguarding signpost: staff are pointed at their
//  DSL, pupils at a trusted adult and Childline — maintenance takes the whole
//  app away for a few minutes, and nobody should wait for it in an emergency.
//  `preview` (?view=maintenance) renders it whether or not the switch is on.
const MaintenanceScreen = ({ preview = false, audience: audienceProp = 'staff' }) => {
  const [s] = window.usePlatformSettings();
  const [audience, setAudience] = React.useState(audienceProp);
  const [checked, setChecked] = React.useState(null);   // { at, on }
  const [, tick] = React.useState(0);

  const check = () => { const next = window.refreshPlatformSettings(); setChecked({ at: new Date(), on: next.maintenanceMode }); };
  // Production twin: poll v_platform_status every 30 seconds and reopen the app
  // the moment maintenance ends. In the prototype a change from another tab
  // arrives instantly anyway (the storage event).
  React.useEffect(() => {
    const t = setInterval(() => { if (!preview) check(); tick(n => n + 1); }, 30000);
    return () => clearInterval(t);
  }, [preview]);

  const now = new Date();
  const until = s.maintenanceUntil ? new Date(s.maintenanceUntil) : null;
  const late = !!until && until <= now;
  const untilText = until && !late
    ? (until.toDateString() === now.toDateString() ? `by ${fmtTime(until)}` : `by ${fmtTime(until)} on ${until.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`)
    : null;
  const notice = s.maintenanceNotice || `${BRAND.name} is down for planned maintenance and will be back shortly.`;
  const student = audience === 'student';

  return (
    <div style={{ minHeight: '100%', flex: 1, display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${DS.canvas} 0%, ${DS.bg} 70%)` }}>
      {preview && (
        <PreviewStrip right={<Segmented value={audience} onChange={setAudience} options={[{ id: 'staff', label: 'Staff' }, { id: 'student', label: 'Student' }]} />}>
          {s.maintenanceMode
            ? <>Maintenance mode is <b>on</b> — every centre sees this right now.</>
            : <>Maintenance mode is off — this is what every centre would see. Set the notice and expected end when you turn it on.</>}
        </PreviewStrip>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 16px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}><KlasioLogo height={34} /></div>

          <div style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 16, padding: '34px 30px 26px', boxShadow: '0 10px 34px rgba(17,24,39,0.07)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px', background: DS.accentLight, color: DS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={26} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: DS.text, letterSpacing: '-0.4px' }}>We’ll be right back</h1>
            <p style={{ margin: '10px auto 0', maxWidth: 400, fontSize: 15, color: DS.sub, lineHeight: 1.6 }}>{notice}</p>

            {untilText && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 16, padding: '6px 12px', borderRadius: 99, background: DS.surface, border: `1px solid ${DS.border}`, fontSize: 13, fontWeight: 600, color: DS.text }}>
                <Icon name="clock" size={14} color={DS.muted} /> Expected back {untilText}
              </div>
            )}
            {late && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 16, padding: '6px 12px', borderRadius: 99, background: DS.warningBg, border: `1px solid ${DS.warningBorder}`, fontSize: 13, fontWeight: 600, color: DS.warning }}>
                <Icon name="clock" size={14} color={DS.warning} /> Taking a little longer than planned — we’re on it
              </div>
            )}

            <div style={{ fontSize: 13, color: DS.muted, marginTop: 14 }}>
              {student ? 'Anything you’d already saved — like homework — is safe.' : 'Anything you’d already saved is safe.'}
            </div>

            <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: DS.muted, lineHeight: 1.5 }}>
                This page checks every 30 seconds and opens {BRAND.name} again as soon as it’s back — no need to refresh.
              </span>
              <Btn variant="secondary" small icon="clock" onClick={check}>Check now</Btn>
            </div>
            {checked && (
              <div style={{ marginTop: 10, fontSize: 12.5, textAlign: 'left', color: checked.on ? DS.muted : DS.success }}>
                {checked.on
                  ? `Still under maintenance · checked ${fmtTime(checked.at)}`
                  : `Maintenance has ended · checked ${fmtTime(checked.at)}${preview ? ' — a real session would open the app now.' : ''}`}
              </div>
            )}
            {s.statusPagePublic && (
              <div style={{ marginTop: 10, fontSize: 12.5, textAlign: 'left', color: DS.muted }}>
                Live updates at <a href={`https://${BRAND.statusDomain}`} target="_blank" rel="noopener" style={{ color: DS.accent }}>{BRAND.statusDomain}</a>
              </div>
            )}
          </div>

          {/* Safeguarding signpost — never make anyone wait for the app in an emergency. */}
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: DS.bg, border: `1px solid ${DS.border}`, borderLeft: `3px solid ${DS.danger}`, display: 'flex', gap: 12 }}>
            <Icon name="shield" size={18} color={DS.danger} />
            <div style={{ fontSize: 13, color: DS.sub, lineHeight: 1.55 }}>
              {student ? <>
                <b style={{ color: DS.text }}>Need help now?</b> If you’re worried about your safety or someone else’s, talk to a trusted adult. You can call Childline free on <b>0800 1111</b>, any time. If someone is in immediate danger, call <b>999</b>.
              </> : <>
                <b style={{ color: DS.text }}>Urgent safeguarding concern?</b> Don’t wait for {BRAND.name}. Follow your centre’s safeguarding procedure and speak to your DSL directly. If a child is in immediate danger, call <b>999</b>.
              </>}
            </div>
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: DS.muted }}>
            Questions? <a href={`mailto:${BRAND.supportEmail}`} style={{ color: DS.accent }}>{BRAND.supportEmail}</a>
          </div>

          {!preview && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${DS.border}`, textAlign: 'center', fontSize: 11.5, color: DS.faint }}>
              Prototype: every centre sees this while maintenance mode is on.{' '}
              <button onClick={() => window.__navigate && window.__navigate('superadmin', 'controls')} style={{ background: 'none', border: 'none', color: DS.accent, cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline', padding: 0 }}>Open the owner console</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC PAGES — every page outside (or instead of) the app, with previews
// ═══════════════════════════════════════════════════════════════════════════
const PublicPagesCard = ({ style }) => {
  const [s] = window.usePlatformSettings();
  const pages = [
    { id: 'login', name: 'Sign in', url: '?view=login', desc: 'Staff and student sign-in.' },
    { id: 'signup', name: 'Sign up', url: '?view=signup',
      desc: s.signupsEnabled ? 'Self-serve centre signup.' : 'New signups is off, so it shows “Signups are paused” instead of the form.',
      state: s.signupsEnabled ? ['Open', 'success'] : ['Paused', 'warning'] },
    { id: 'plan', name: 'Sign up from the marketing site', url: '?plan=growth', desc: 'The marketing site’s only link in: signup with the plan already chosen.' },
    { id: 'maintenance', name: 'Maintenance screen', url: '?view=maintenance',
      desc: 'Replaces the app for every centre while maintenance mode is on. The preview has staff and student versions.',
      state: s.maintenanceMode ? ['Showing now', 'danger'] : ['Off', 'default'] },
    { id: 'status', name: 'Status page', url: '?view=status',
      desc: 'Preview only — the uptime monitor hosts the real page, and it stays private until an SLA.',
      state: s.statusPagePublic ? ['Public', 'success'] : ['Private', 'default'] },
    { id: 'notfound', name: 'Page not found (404)', url: '404.html',
      desc: 'A standalone file, shown for any address that doesn’t exist. Vercel serves it automatically, and so does npx serve locally.',
      extra: { label: 'Try a broken link', url: 'this-page-does-not-exist', tip: 'Only shows the 404 where the server serves 404.html for missing paths (Vercel, npx serve).' } },
  ];
  const shown = (rel) => { const u = new URL(rel, window.location.href); return u.pathname + u.search; };
  return (
    <Card title="Public pages" subtitle="Every page people see outside the app, or instead of it. Previews open in a new tab." style={style}>
      {pages.map((p, i) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 20px', borderTop: i ? `1px solid ${DS.border}` : 'none', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: DS.text }}>
              {p.name}
              {p.state && <Badge variant={p.state[1]}>{p.state[0]}</Badge>}
            </div>
            <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{p.desc}</div>
            <code style={{ display: 'inline-block', marginTop: 5, fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: DS.sub, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 5, padding: '1px 6px' }}>{shown(p.url)}</code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.extra && (
              <button title={p.extra.tip} onClick={() => openInNewTab(p.extra.url)} style={{ background: 'none', border: 'none', padding: 0, color: DS.accent, cursor: 'pointer', fontSize: 12.5, textDecoration: 'underline' }}>{p.extra.label}</button>
            )}
            <Btn variant="secondary" small icon="eye" onClick={() => openInNewTab(p.url)}>Preview</Btn>
          </div>
        </div>
      ))}
    </Card>
  );
};

Object.assign(window, { StatusPage, MaintenanceScreen, PublicPagesCard });

})();
