// ══════════════════════════════════════════════════════════════
//  TutorOS — Landing / Marketing Page
// ══════════════════════════════════════════════════════════════

const LandingPage = ({ onEnterApp }) => {
  const [hovNav, setHovNav] = React.useState(null);
  const [hovPlan, setHovPlan] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const features = [
    {
      icon: 'book',
      title: 'Teaching Tools',
      color: DS.accent,
      colorBg: DS.accentLight,
      items: [
        'One-click attendance marking',
        'Homework set, track & auto-mark',
        'AI-powered written feedback drafts',
        'Per-student progress scoring',
        'Class schedule management',
      ],
      desc: 'Everything a teacher needs, in one focused workspace. Spend less time on admin, more time teaching.',
    },
    {
      icon: 'chart',
      title: 'Analytics',
      color: '#0891B2',
      colorBg: '#F0F9FF',
      items: [
        'At-risk student early warnings',
        'Subject & cohort performance trends',
        'Revenue & enrolment dashboards',
        'Attendance rate tracking',
        'Exportable progress reports',
      ],
      desc: 'Data that drives action. See which students need support before they fall behind.',
    },
    {
      icon: 'message',
      title: 'Parent Engagement',
      color: '#0D9488',
      colorBg: '#F0FDFA',
      items: [
        'Real-time homework result visibility',
        'AI feedback parents can actually read',
        'Direct messaging with teachers',
        'Session reminders & scheduling',
        'Predicted grade summaries',
      ],
      desc: 'Parents who are informed are parents who stay. Give them the transparency they expect.',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      price: '£49',
      period: '/mo',
      desc: 'For small centres getting started',
      highlight: false,
      items: [
        'Up to 50 students',
        '3 teacher accounts',
        'Homework management',
        'Attendance tracking',
        'Parent portal (read-only)',
        'Email support',
      ],
      cta: 'Start free trial',
    },
    {
      name: 'Pro',
      price: '£129',
      period: '/mo',
      desc: 'For growing centres with multiple classes',
      highlight: true,
      items: [
        'Up to 200 students',
        'Unlimited teacher accounts',
        'AI feedback engine',
        'Full parent messaging',
        'Advanced analytics & reports',
        'Priority support',
      ],
      cta: 'Start free trial',
    },
    {
      name: 'Enterprise',
      price: '£299',
      period: '/mo',
      desc: 'For multi-site operations',
      highlight: false,
      items: [
        'Unlimited students',
        'Multi-site management',
        'Custom branding',
        'API access & integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Contact sales',
    },
  ];

  const testimonials = [
    {
      quote: 'We cut our admin time by 60% in the first month. The at-risk dashboard alone has saved us three students from dropping out.',
      name: 'Priya Mehta',
      role: 'Director, Apex Learning Centre',
    },
    {
      quote: "Parents are finally engaged. They log in every week to check homework results. Our retention is up 30% year on year.",
      name: 'David Okafor',
      role: 'Principal, BrightPath Tuition',
    },
    {
      quote: 'The AI feedback drafts have been a game changer. My teachers review and send — it takes seconds, not hours.',
      name: 'Sarah Lin',
      role: 'Lead Teacher, Nova Study Hub',
    },
  ];

  const navLinks = ['Features', 'Pricing', 'About', 'Blog'];

  return (
    <div style={{ fontFamily: 'inherit', color: DS.text, background: DS.bg, minHeight: '100vh' }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${DS.border}`,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 32px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, background: DS.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>T</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>TutorOS</span>
          </div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {navLinks.map(l => (
              <button key={l}
                onMouseEnter={() => setHovNav(l)}
                onMouseLeave={() => setHovNav(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 14px', borderRadius: 6, fontSize: 14,
                  color: hovNav === l ? DS.text : DS.muted,
                  background: hovNav === l ? DS.surface : 'none',
                  fontWeight: 500, transition: 'all 0.1s',
                }}>{l}</button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={onEnterApp} small>Log in</Btn>
            <Btn variant="primary" onClick={onEnterApp} small>Get started free</Btn>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '96px 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 20,
          background: DS.accentLight, border: `1px solid ${DS.accentBorder}`,
          fontSize: 12, color: DS.accent, fontWeight: 600,
          marginBottom: 28, letterSpacing: '0.02em',
        }}>
          <Icon name="zap" size={12} />
          Now with AI homework feedback
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800,
          color: DS.text, lineHeight: 1.1, letterSpacing: '-1.5px',
          margin: '0 0 24px',
          maxWidth: 780, marginLeft: 'auto', marginRight: 'auto',
        }}>
          The operating system for your tuition centre
        </h1>

        <p style={{
          fontSize: 18, color: DS.muted, lineHeight: 1.65,
          maxWidth: 560, margin: '0 auto 40px',
        }}>
          Manage students, teachers, homework, and parents from one clean dashboard.
          Built for centre owners who want to scale without the chaos.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" icon="arrow_right" onClick={onEnterApp}>
            Start free — no card required
          </Btn>
          <Btn variant="secondary" onClick={onEnterApp}>
            View live demo
          </Btn>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: DS.faint }}>
          14-day trial · No setup fee · Cancel anytime
        </p>

        {/* Hero UI preview */}
        <div style={{
          marginTop: 64, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${DS.border}`,
          background: DS.surface,
          padding: '0',
          maxWidth: 900, margin: '64px auto 0',
        }}>
          {/* fake browser bar */}
          <div style={{
            background: DS.bg, borderBottom: `1px solid ${DS.border}`,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#FC5753','#FDBC40','#33C748'].map(c => (
                <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{
              flex: 1, maxWidth: 320, height: 24, borderRadius: 5,
              background: DS.surface, border: `1px solid ${DS.border}`,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              fontSize: 11, color: DS.faint,
            }}>app.tutoross.io/admin</div>
          </div>
          {/* mini dashboard mockup */}
          <div style={{ display: 'flex', height: 260, background: DS.surface }}>
            {/* mini sidebar */}
            <div style={{
              width: 160, background: DS.bg, borderRight: `1px solid ${DS.border}`,
              padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, background: DS.accent, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>T</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>TutorOS</span>
              </div>
              {['Dashboard','Students','Classes','Reports'].map((l, i) => (
                <div key={l} style={{
                  padding: '5px 8px', borderRadius: 5, fontSize: 11,
                  background: i === 0 ? DS.accentLight : 'transparent',
                  color: i === 0 ? DS.accent : DS.muted,
                  fontWeight: i === 0 ? 600 : 400,
                }}>{l}</div>
              ))}
            </div>
            {/* mini content */}
            <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {[['142','Students'],['94%','Attendance'],['78%','Homework'],['3','At Risk']].map(([v,l]) => (
                  <div key={l} style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 10, color: DS.muted }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: DS.muted }}>AT-RISK STUDENTS</div>
                {[['Emma T.','Maths','3 absences'],['Noah F.','Science','Low scores']].map(([n,s,r]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${DS.border}` }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: DS.accent, fontWeight: 700 }}>{n[0]}</div>
                    <span style={{ fontSize: 11, flex: 1 }}>{n}</span>
                    <span style={{ fontSize: 10, color: DS.muted }}>{s}</span>
                    <span style={{ fontSize: 9, background: '#FEF2F2', color: DS.danger, padding: '1px 5px', borderRadius: 4 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos / Social proof strip ─────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}`, background: DS.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: DS.faint, whiteSpace: 'nowrap' }}>Trusted by centres across the UK</span>
          <div style={{ height: 1, flex: 1, background: DS.border }} />
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Apex Learning','BrightPath','Nova Study','Elite Tutors','Scholars Hub'].map(n => (
              <span key={n} style={{ fontSize: 13, fontWeight: 600, color: DS.borderDark, letterSpacing: '-0.2px' }}>{n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 12px' }}>
            Built for every role in your centre
          </h2>
          <p style={{ fontSize: 16, color: DS.muted, maxWidth: 480, margin: '0 auto' }}>
            One platform. Three focused experiences — for admins, teachers, and parents.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map(f => (
            <div key={f.title} style={{
              border: `1px solid ${DS.border}`, borderRadius: 12,
              padding: '28px', background: DS.bg,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: f.colorBg, color: f.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Icon name={f.icon} size={20} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.6, margin: '0 0 20px' }}>{f.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {f.items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: DS.sub }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: f.colorBg, color: f.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name="check" size={10} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section style={{ background: DS.surface, borderTop: `1px solid ${DS.border}`, borderBottom: `1px solid ${DS.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 32px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 48, letterSpacing: '-0.4px' }}>
            What centre owners say
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {testimonials.map(t => (
              <div key={t.name} style={{
                background: DS.bg, border: `1px solid ${DS.border}`,
                borderRadius: 10, padding: '24px',
              }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={14} color="#F59E0B" />)}
                </div>
                <p style={{ fontSize: 14, color: DS.sub, lineHeight: 1.65, margin: '0 0 20px', fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={t.name} size={36} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: DS.muted }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 12px' }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 16, color: DS.muted }}>All plans include a 14-day free trial. No credit card required.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
          {plans.map(p => (
            <div key={p.name} style={{
              border: `1px solid ${p.highlight ? DS.accent : DS.border}`,
              borderRadius: 12, padding: '32px',
              background: p.highlight ? DS.accentLight : DS.bg,
              position: 'relative', overflow: 'hidden',
            }}>
              {p.highlight && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  background: DS.accent, color: '#fff',
                  fontSize: 11, fontWeight: 600, padding: '4px 14px',
                  borderBottomLeftRadius: 8,
                }}>Most popular</div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.highlight ? DS.accent : DS.muted, marginBottom: 8 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', color: DS.text }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: DS.muted }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 14, color: DS.muted }}>{p.desc}</div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: DS.sub }}>
                    <Icon name="check" size={14} color={p.highlight ? DS.accent : DS.success} />
                    {item}
                  </li>
                ))}
              </ul>

              <Btn
                variant={p.highlight ? 'primary' : 'secondary'}
                onClick={onEnterApp}
              >{p.cta}</Btn>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section style={{
        background: DS.text, color: '#fff',
        borderTop: `1px solid ${DS.border}`,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '72px 32px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 16px' }}>
            Ready to run your centre smarter?
          </h2>
          <p style={{ fontSize: 16, color: '#9CA3AF', margin: '0 0 36px' }}>
            Join 200+ tuition centres already on TutorOS.
          </p>
          <Btn variant="primary" onClick={onEnterApp}>Start your free 14-day trial</Btn>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ background: DS.text, borderTop: `1px solid #1F2937` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 26, height: 26, background: DS.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>T</span>
                </div>
                <span style={{ color: '#fff', fontWeight: 700 }}>TutorOS</span>
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, maxWidth: 260 }}>
                The management platform built specifically for tuition centres. Manage everything from one place.
              </p>
            </div>
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { heading: 'Legal', links: ['Privacy', 'Terms', 'GDPR', 'Security'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.heading}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.links.map(l => (
                    <li key={l}><a href="#" style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none' }}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1F2937', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#4B5563' }}>© 2026 TutorOS Ltd. All rights reserved.</span>
            <span style={{ fontSize: 12, color: '#4B5563' }}>Made with care in London</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

Object.assign(window, { LandingPage });
