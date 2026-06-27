// ══════════════════════════════════════════════════════════════
//  TutorOS — Public auth front door (Login · Signup)
// ══════════════════════════════════════════════════════════════
//
//  The app's unauthenticated entry. Two public, full-screen pages that share
//  one shell (SetupShell, reused from Onboarding.jsx — same chrome as the claim
//  pages) so the whole front door feels like one product:
//
//    • SignupPage  — admin-only. Creates the centre (tenant) + first admin and
//                    issues the centre code, then lands on the existing
//                    "Set up your centre" checklist. Teachers/students can NEVER
//                    self-signup (invited / staff-provisioned respectively).
//    • LoginPage   — role-aware. A Staff/Student toggle picks the path:
//                      Staff   → email + password / magic-link / OTP. No centre
//                                code. Multiple memberships ⇒ Slack-style centre
//                                switcher after auth.
//                      Student → centre code + username, then the credential the
//                                account is set to (6-digit PIN / password / QR).
//                                A remembered device skips the centre code.
//
//  Frontend-only, additive. No backend, no auth SDK, NO stored credentials — the
//  password/PIN fields are mock and nothing is persisted. Login assumes setup is
//  already complete (first-time setup is the invite/claim flow in Onboarding.jsx).
//  Reuses SetupShell / Mono / CopyChip / QRPlaceholder / isEmail / RAND and the
//  shared admin + onboarding stores. Loaded after Onboarding.jsx (see index.html).

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LAST_CENTRE_KEY = 'tutoros.lastCentre';   // remembered device → skip centre code
const readLastCentre  = () => { try { return localStorage.getItem(LAST_CENTRE_KEY) || null; } catch (e) { return null; } };
const writeLastCentre = id => { try { id ? localStorage.setItem(LAST_CENTRE_KEY, id) : localStorage.removeItem(LAST_CENTRE_KEY); } catch (e) {} };

// Initials + 3-digit number, e.g. "Bright Minds Tuition" → "BMT-204".
const genCentreCode = name => {
  const initials = (name || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('')
    .replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'CTR';
  return `${initials}-${RAND(3, '0123456789')}`;
};

// A student's effective daily sign-in method (per-student setting, age default).
const dailyMethodOf = a =>
  a.dailyMethod || (a.underThirteen ? 'pin' : a.setupMethod === 'pin' ? 'pin' : a.setupMethod === 'qr' ? 'qr' : 'password');

// Footer link row shared by the auth screens.
const AuthLink = ({ children, onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.accent, fontWeight: 600, fontSize: 12.5, padding: 0 }}>{children}</button>
);

const AuthToggle = ({ mode, setMode }) => (
  <div style={{ marginBottom: 20 }}>
    <Segmented fullWidth value={mode} onChange={setMode} options={[{ id: 'staff', label: 'Staff' }, { id: 'student', label: 'Student' }]} />
    <div style={{ fontSize: 11.5, color: DS.faint, textAlign: 'center', marginTop: 8 }}>
      {mode === 'staff' ? 'Admins & teachers sign in with their email' : 'Students sign in with their centre code + username'}
    </div>
  </div>
);

// A small "Enter to submit" helper for the single-action screens.
const onEnter = fn => e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } };

// ═══════════════════════════════════════════════════════════════════════════════
//  Staff login (admin / teacher) — email-first, no centre code
// ═══════════════════════════════════════════════════════════════════════════════
const StaffLogin = ({ mode, setMode, store, onb }) => {
  const [stage, setStage] = React.useState('enter');   // enter · sent · reset · switch
  const [method, setMethod] = React.useState('password'); // password · magic · otp
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [memberships, setMemberships] = React.useState([]);
  const [touched, setTouched] = React.useState(false);

  const centreName = id => id === onb.centreId ? onb.centre.name : ((ONB_CENTRE_DIRECTORY[id] || {}).name || id);
  const centreCity = id => id === onb.centreId ? '' : ((ONB_CENTRE_DIRECTORY[id] || {}).city || '');

  // Resolve every centre membership for this email. One identity, many centres —
  // never a duplicate account. Falls back to admin-of-current-centre for the demo.
  const resolveMemberships = e => {
    const lower = (e || '').toLowerCase();
    let ms = (onb.memberships || []).filter(m => m.email.toLowerCase() === lower);
    if (!ms.length) {
      const t = store.teachers.find(t => (t.email || '').toLowerCase() === lower);
      if (t) ms = [{ centreId: onb.centreId, role: 'teacher' }];
    }
    if (!ms.length) ms = [{ centreId: onb.centreId, role: 'admin' }];
    return ms;
  };

  const enter = (role, centreId) => window.__navigate(role, 'dashboard');
  const afterAuth = () => {
    const ms = resolveMemberships(email);
    if (ms.length > 1) { setMemberships(ms); setStage('switch'); }
    else enter(ms[0].role, ms[0].centreId);
  };

  const emailErr = touched && !isEmail(email) ? 'Enter a valid email' : '';
  const pwErr = touched && method === 'password' && !pw ? 'Enter your password' : '';

  const submit = () => {
    setTouched(true);
    if (!isEmail(email)) return;
    if (method === 'password') { if (!pw) return; afterAuth(); }
    else setStage('sent');
  };
  const forgot = () => { setTouched(true); if (!isEmail(email)) { setStage('enter'); return; } setStage('reset'); };

  // ── Centre switcher (Slack-style) ──
  if (stage === 'switch') {
    return (
      <SetupShell icon="book" accent="#0891B2" title="Choose a centre" subtitle={`${email} belongs to ${memberships.length} centres`}
        badge={<div style={{ marginBottom: 4 }}><Badge variant="info">One account · multiple centres</Badge></div>}
        footer={<AuthLink onClick={() => setStage('enter')}>← Use a different account</AuthLink>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {memberships.map((m, i) => (
            <button key={i} onClick={() => enter(m.role, m.centreId)} style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
              padding: '13px 14px', borderRadius: 11, width: '100%', border: `1px solid ${DS.border}`, background: DS.bg,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: '#0891B2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {centreName(m.centreId).slice(0, 1)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{centreName(m.centreId)}</div>
                <div style={{ fontSize: 12, color: DS.muted, textTransform: 'capitalize' }}>{m.role}{centreCity(m.centreId) ? ` · ${centreCity(m.centreId)}` : ''}</div>
              </div>
              <Icon name="chevron_r" size={16} color={DS.faint} />
            </button>
          ))}
        </div>
      </SetupShell>
    );
  }

  // ── Magic link / OTP confirm ──
  if (stage === 'sent') {
    const isOtp = method === 'otp';
    return (
      <SetupShell icon={isOtp ? 'pin' : 'mail'} accent="#0891B2"
        title={isOtp ? 'Enter your code' : 'Check your email'}
        subtitle={isOtp ? `We texted a 6-digit code to ${email}` : `We sent a magic link to ${email}`}
        footer={<AuthLink onClick={() => setStage('enter')}>← Use a different email</AuthLink>}>
        {isOtp ? (
          <Field label="6-digit code" required>
            <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={onEnter(() => /^\d{6}$/.test(otp) && afterAuth())}
              placeholder="••••••" autoFocus style={{ letterSpacing: '10px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 18 }} />
          </Field>
        ) : (
          <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>
            Open the link on this device to finish signing in. It expires in 15 minutes.
          </div>
        )}
        <Btn variant="primary" icon={isOtp ? 'check' : 'chevron_r'} style={{ width: '100%', justifyContent: 'center', marginTop: 14, ...(isOtp && !/^\d{6}$/.test(otp) ? { opacity: 0.5, pointerEvents: 'none' } : {}) }} onClick={afterAuth}>
          {isOtp ? 'Verify & continue' : "I've opened the link"}
        </Btn>
        <div style={{ fontSize: 11, color: DS.faint, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={12} />Prototype — any code works; nothing is stored.</div>
      </SetupShell>
    );
  }

  // ── Password reset (adult email recovery lane) ──
  if (stage === 'reset') {
    return (
      <SetupShell icon="mail" accent="#0891B2" title="Reset your password" subtitle={`A reset link is on its way to ${email}`}
        footer={<AuthLink onClick={() => setStage('enter')}>← Back to sign in</AuthLink>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>
          Open the link in that email to choose a new password. Adults always recover through their own inbox — no centre code needed.
        </div>
      </SetupShell>
    );
  }

  // ── Enter (default) ──
  const methods = [{ id: 'password', label: 'Password' }, { id: 'magic', label: 'Magic link' }, { id: 'otp', label: 'OTP' }];
  return (
    <SetupShell icon="user" accent="#0891B2" title="Staff sign in" subtitle="Admins & teachers"
      footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Btn variant="primary" icon="chevron_r" style={{ width: '100%', justifyContent: 'center' }} onClick={submit}>
          {method === 'password' ? 'Sign in' : method === 'otp' ? 'Send me a code' : 'Email me a link'}
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <AuthLink onClick={() => window.__navigate('signup')}>Create your centre</AuthLink>
          <AuthLink onClick={() => window.__navigate('landing')}>Back to site</AuthLink>
        </div>
      </div>}>
      <AuthToggle mode={mode} setMode={setMode} />
      <Field label="Sign-in method">
        <Segmented fullWidth value={method} onChange={setMethod} options={methods} />
      </Field>
      <Field label="Work email" required error={emailErr}>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onEnter(submit)} invalid={!!emailErr} icon="mail" placeholder="you@centre.co.uk" autoFocus />
      </Field>
      {method === 'password' && (
        <Field label="Password" required error={pwErr} hint="Prototype — nothing is stored">
          <Input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={onEnter(submit)} invalid={!!pwErr} placeholder="Your password" />
        </Field>
      )}
      {method === 'password' && (
        <div style={{ marginTop: -6, marginBottom: 4, textAlign: 'right' }}><AuthLink onClick={forgot}>Forgot password?</AuthLink></div>
      )}
      {/* Demo quick-fill — no real accounts in a prototype */}
      <div style={{ marginTop: 14, padding: '10px 12px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Try a demo account</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[['Admin · multi-centre', 'lisa.chen@brightminds.co.uk'], ['Teacher', 's.clarke@centre.co.uk']].map(([label, e]) => (
            <button key={e} onClick={() => { setEmail(e); setMethod('password'); setPw('demo'); }} style={{
              fontSize: 11.5, fontWeight: 500, color: DS.sub, background: DS.bg, border: `1px solid ${DS.border}`,
              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </div>
    </SetupShell>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Student login — centre code + username, then PIN / password / QR
// ═══════════════════════════════════════════════════════════════════════════════
const StudentLogin = ({ mode, setMode, store, onb }) => {
  const [stage, setStage] = React.useState('identify'); // identify · credential · recover
  const remembered = React.useState(readLastCentre)[0];
  const [forgetCentre, setForgetCentre] = React.useState(false); // user chose "not your centre?"
  const useRemembered = !!remembered && remembered === onb.centreId && !forgetCentre;
  const [code, setCode] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [student, setStudent] = React.useState(null);
  const [cred, setCred] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState('');

  // Codes that resolve a centre (current centre + directory). A code only SELECTS
  // a centre — it never creates an account.
  const resolveCentre = c => {
    const v = (c || '').trim().toUpperCase();
    if (!v) return null;
    if (v === (onb.centre.code || '').toUpperCase()) return onb.centreId;
    const hit = Object.values(ONB_CENTRE_DIRECTORY).find(d => (d.code || '').toUpperCase() === v);
    return hit ? hit.id : null;
  };

  const identify = () => {
    setTouched(true); setError('');
    const centreId = useRemembered ? remembered : resolveCentre(code);
    if (!centreId) { setError("We don't recognise that centre code. Check the code on your slip or ask your centre."); return; }
    if (!username.trim()) return;
    const uname = username.trim().toLowerCase();
    const found = store.students.find(s => centreId === (s.centreId || onb.centreId) && (acct(s).username || '').toLowerCase() === uname);
    if (!found) { setError(`We couldn't find “${username.trim()}” at ${onb.centre.name}.`); return; }
    if (acctStatus(found) !== 'active') { setError('That account isn’t set up yet — use the one-time claim slip from your centre to finish setup first.'); return; }
    writeLastCentre(centreId);          // remember this device for next time
    setStudent(found); setCred(''); setTouched(false); setStage('credential');
  };

  // ── Credential step ──
  if (stage === 'credential' && student) {
    const a = acct(student);
    const dm = dailyMethodOf(a);
    const credErr = touched ? (dm === 'pin' ? (!/^\d{6}$/.test(cred) ? 'Enter your 6-digit PIN' : '') : dm === 'password' ? (!cred ? 'Enter your password' : '') : '') : '';
    const signIn = () => { setTouched(true); if (dm === 'pin' && !/^\d{6}$/.test(cred)) return; if (dm === 'password' && !cred) return; window.__navigate('student', 'dashboard'); };
    return (
      <SetupShell icon="graduation" accent={DS.accent} title={`Hi ${student.firstName || studentName(student)} 👋`} subtitle={onb.centre.name}
        badge={<div style={{ marginBottom: 4 }}><Badge variant="success">Student sign in</Badge></div>}
        footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dm !== 'qr' && <Btn variant="primary" icon="chevron_r" style={{ width: '100%', justifyContent: 'center' }} onClick={signIn}>Sign in</Btn>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <AuthLink onClick={() => { setStage('identify'); setStudent(null); setTouched(false); }}>← Not you?</AuthLink>
            {dm !== 'qr' && <AuthLink onClick={() => setStage('recover')}>{dm === 'pin' ? 'Forgot PIN?' : 'Forgot password?'}</AuthLink>}
          </div>
        </div>}>
        <div style={{ marginBottom: 16, padding: '10px 12px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 9, fontSize: 12.5, color: DS.muted }}>
          Username <Mono color={DS.sub}>{a.username}</Mono>
        </div>
        {dm === 'pin' && (
          <Field label="Your 6-digit PIN" required error={credErr} hint="A quick unlock on this trusted device">
            <Input value={cred} onChange={e => setCred(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={onEnter(signIn)} invalid={!!credErr}
              placeholder="••••••" autoFocus style={{ letterSpacing: '10px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 18 }} />
          </Field>
        )}
        {dm === 'password' && (
          <Field label="Your password" required error={credErr}>
            <Input type="password" value={cred} onChange={e => setCred(e.target.value)} onKeyDown={onEnter(signIn)} invalid={!!credErr} placeholder="Your password" autoFocus />
          </Field>
        )}
        {dm === 'qr' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 11 }}>
            <QRPlaceholder />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: DS.sub, lineHeight: 1.5, marginBottom: 10 }}>Scan your QR badge or tap your name at the centre — no password needed.</div>
              <Btn variant="primary" small icon="check" onClick={() => window.__navigate('student', 'dashboard')}>Tap to sign in</Btn>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: DS.faint, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={12} />Prototype — nothing you type is stored.</div>
      </SetupShell>
    );
  }

  // ── Recovery lane (depends on age / email on file) ──
  if (stage === 'recover' && student) {
    const a = acct(student);
    const line = a.underThirteen
      ? `Ask a parent or guardian to open the reset link we send to ${student.guardianEmail || 'the parent email on file'}. Under-13 accounts always recover through a parent.`
      : student.email
        ? `We'll email a reset link to ${student.email}.`
        : 'Ask a teacher or your centre admin to reset it for you — most students sign in without an email, so staff reset is the quickest way back in.';
    return (
      <SetupShell icon="alert" accent={a.underThirteen ? '#7C3AED' : DS.accent} title={a.underThirteen || dailyMethodOf(a) === 'pin' ? 'Forgot your PIN?' : 'Forgot your password?'} subtitle={studentName(student)}
        footer={<AuthLink onClick={() => setStage('credential')}>← Back to sign in</AuthLink>}>
        <div style={{ fontSize: 13.5, color: DS.sub, lineHeight: 1.6 }}>{line}</div>
      </SetupShell>
    );
  }

  // ── Identify (default): centre code + username ──
  return (
    <SetupShell icon="graduation" accent={DS.accent} title="Student sign in" subtitle="Find your centre, then your username"
      footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Btn variant="primary" icon="chevron_r" style={{ width: '100%', justifyContent: 'center' }} onClick={identify}>Continue</Btn>
        <div style={{ textAlign: 'center' }}><AuthLink onClick={() => window.__navigate('landing')}>Back to site</AuthLink></div>
      </div>}>
      <AuthToggle mode={mode} setMode={setMode} />
      {useRemembered ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, padding: '11px 13px', background: DS.accentLight, border: `1px solid ${DS.accentBorder}`, borderRadius: 10 }}>
          <Icon name="check" size={16} color={DS.accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{onb.centre.name}</div>
            <div style={{ fontSize: 11.5, color: DS.muted }}>Remembered on this device</div>
          </div>
          <AuthLink onClick={() => { setForgetCentre(true); setError(''); }}>Not your centre?</AuthLink>
        </div>
      ) : (
        <Field label="Centre code" required error={touched && !resolveCentre(code) && code ? 'Unknown code' : ''} hint="On your claim slip, the whiteboard or a parent letter">
          <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={onEnter(identify)} icon="tag"
            placeholder="e.g. BMT-204" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }} autoFocus />
        </Field>
      )}
      <Field label="Username" required hint="The name on your claim slip (not an email)">
        <Input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={onEnter(identify)} icon="user"
          placeholder="e.g. ochen" style={{ fontFamily: "'JetBrains Mono', monospace" }} />
      </Field>
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: DS.dangerBg, border: `1px solid ${DS.dangerBorder}`, borderRadius: 9 }}>
          <Icon name="alert" size={14} color={DS.danger} />
          <span style={{ fontSize: 12.5, color: DS.danger, lineHeight: 1.5 }}>{error}</span>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: DS.faint, marginTop: 14, lineHeight: 1.5 }}>
        New here? Students can’t self sign-up — your centre provisions your account and gives you a one-time claim slip to finish setup.
      </div>
    </SetupShell>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LoginPage — role-aware shell hosting the Staff / Student paths
// ═══════════════════════════════════════════════════════════════════════════════
const LoginPage = () => {
  const store = useAdminStore();
  const onb = useOnboardingStore();
  // Default to Student when this device already remembers a centre (the common
  // case for a shared classroom machine); otherwise Staff.
  const [mode, setMode] = React.useState(() => readLastCentre() ? 'student' : 'staff');
  return mode === 'staff'
    ? <StaffLogin mode={mode} setMode={setMode} store={store} onb={onb} />
    : <StudentLogin mode={mode} setMode={setMode} store={store} onb={onb} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SignupPage — public, admin-only: creates the centre (tenant) + first admin
// ═══════════════════════════════════════════════════════════════════════════════
const SIGNUP_PLANS = [
  { id: 'Starter', label: 'Starter — up to 50 students', teacherSeats: 3,  studentSeats: 50 },
  { id: 'Growth',  label: 'Growth — up to 250 students', teacherSeats: 15, studentSeats: 250 },
  { id: 'Scale',   label: 'Scale — up to 600 students',  teacherSeats: 40, studentSeats: 600 },
];

const SignupPage = () => {
  const onb = useOnboardingStore();
  const [form, setForm] = React.useState({ centre: '', name: '', email: '', pw: '', pw2: '', plan: 'Growth' });
  const [touched, setTouched] = React.useState(false);
  const [done, setDone] = React.useState(null); // { code, name }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const errs = {
    centre: !form.centre.trim() ? 'Enter your centre name' : '',
    name: !form.name.trim() ? 'Enter your name' : '',
    email: !isEmail(form.email) ? 'Enter a valid work email' : '',
    pw: form.pw.length < 8 ? 'Use at least 8 characters' : '',
    pw2: form.pw2 !== form.pw ? 'Passwords do not match' : '',
  };
  const valid = !Object.values(errs).some(Boolean);

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const code = genCentreCode(form.centre);
    const plan = SIGNUP_PLANS.find(p => p.id === form.plan);
    onb.recordSignup({ name: form.centre.trim(), code, plan: { name: plan.id, teacherSeats: plan.teacherSeats, studentSeats: plan.studentSeats }, adminName: form.name.trim(), adminEmail: form.email.trim() });
    setDone({ code, name: form.centre.trim() });
  };

  // ── Success: surface the centre code + hand off to the setup checklist ──
  if (done) {
    return (
      <SetupShell icon="check" accent={DS.success} title="Your centre is live 🎉" subtitle={`${done.name} is ready to set up`}
        footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn variant="primary" icon="chevron_r" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.__navigate('admin', 'setup')}>Set up your centre</Btn>
          <div style={{ textAlign: 'center' }}><AuthLink onClick={() => window.__navigate('login')}>Go to sign in</AuthLink></div>
        </div>}>
        <div style={{ padding: '4px 0 2px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your centre code</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: `linear-gradient(135deg, ${DS.accent}12, transparent)`, border: `1px solid ${DS.accentBorder}`, borderRadius: 12, marginBottom: 18 }}>
            <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: '2px', color: DS.text }}>{done.code}</span>
            <CopyChip value={done.code} title="Copy centre code" />
          </div>
          <div style={{ fontSize: 13, color: DS.muted, lineHeight: 1.6, marginBottom: 14 }}>
            Share this code freely — students enter it once on a new device to find {done.name}. It only selects the centre; it never creates an account.
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: DS.faint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Next, in setup</div>
          {[['user', 'Invite your teachers'], ['users', 'Add your students'], ['book', 'Create classes & enrol']].map(([icon, label], i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: DS.surface, border: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.muted }}><Icon name={icon} size={14} /></div>
              <span style={{ fontSize: 13, color: DS.sub }}><b style={{ color: DS.faint, marginRight: 6 }}>{i + 1}</b>{label}</span>
            </div>
          ))}
        </div>
      </SetupShell>
    );
  }

  return (
    <SetupShell icon="zap" accent={DS.accent} title="Create your centre" subtitle="Start your 14-day free trial — no card required"
      badge={<div style={{ marginBottom: 4 }}><Badge variant="success">Centre owner · admin</Badge></div>}
      footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Btn variant="primary" icon="check" style={{ width: '100%', justifyContent: 'center' }} onClick={submit}>Create centre</Btn>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, color: DS.muted }}>Already have an account? <AuthLink onClick={() => window.__navigate('login')}>Sign in</AuthLink></span>
          <AuthLink onClick={() => window.__navigate('landing')}>Back to site</AuthLink>
        </div>
      </div>}>
      <div style={{ marginBottom: 16, padding: '10px 12px', background: DS.infoBg, border: '1px solid #BAE6FD', borderRadius: 9, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Icon name="alert" size={15} color={DS.info} />
        <span style={{ fontSize: 12, color: DS.sub, lineHeight: 1.5 }}>This creates the centre and its <b>first admin</b>. Teachers are added by invite and students by your staff — they can’t self-sign up.</span>
      </div>
      <Field label="Centre name" required error={touched && errs.centre}>
        <Input value={form.centre} onChange={e => set('centre', e.target.value)} invalid={touched && !!errs.centre} icon="book" placeholder="e.g. Bright Minds Tuition" autoFocus />
      </Field>
      <Field label="Your name" required error={touched && errs.name}>
        <Input value={form.name} onChange={e => set('name', e.target.value)} invalid={touched && !!errs.name} icon="user" placeholder="Your full name" />
      </Field>
      <Field label="Work email" required error={touched && errs.email} hint="Your global identity — you’ll verify it & can add 2FA later">
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} invalid={touched && !!errs.email} icon="mail" placeholder="you@centre.co.uk" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Password" required error={touched && errs.pw}>
          <Input type="password" value={form.pw} onChange={e => set('pw', e.target.value)} invalid={touched && !!errs.pw} placeholder="8+ characters" />
        </Field>
        <Field label="Confirm" required error={touched && errs.pw2}>
          <Input type="password" value={form.pw2} onChange={e => set('pw2', e.target.value)} invalid={touched && !!errs.pw2} placeholder="Re-enter" />
        </Field>
      </div>
      <Field label="Plan" hint="You can change this anytime — seats are demo caps">
        <Select value={form.plan} onChange={e => set('plan', e.target.value)}>
          {SIGNUP_PLANS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
      </Field>
      <div style={{ fontSize: 11, color: DS.faint, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={12} />Prototype — no password is stored, only your account status.</div>
    </SetupShell>
  );
};

// ─── Export ────────────────────────────────────────────────────────────────────
Object.assign(window, { LoginPage, SignupPage, genCentreCode });
