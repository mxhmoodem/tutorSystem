// ══════════════════════════════════════════════════════════════
//  TutorOS — Self-contained Homework module
//  Renders TeacherHomework / StudentHomework based on user.role
// ══════════════════════════════════════════════════════════════
(() => {

// ─── Design tokens ─────────────────────────────────────────────
const C = {
  bg:        '#FFFFFF',
  surface:   '#F8FAFC',
  surface2:  '#F1F5F9',
  border:    '#E2E8F0',
  borderD:   '#CBD5E1',
  text:      '#0F172A',
  sub:       '#334155',
  muted:     '#64748B',
  faint:     '#94A3B8',
  brand:     '#4F46E5',
  brandH:    '#4338CA',
  brandSoft: '#EEF2FF',
  brandBorder: '#C7D2FE',
  accent:    '#0EA5E9',
  accentSoft:'#E0F2FE',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  successBorder:'#BBF7D0',
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  amberBorder:'#FDE68A',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  dangerBorder:'#FECACA',
  shadow:    '0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)',
  shadowL:   '0 4px 20px -8px rgba(15,23,42,.18)',
};

const F = {
  head: "'Plus Jakarta Sans', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const T = 'all .15s';
const ring = (color) => `0 0 0 4px ${color}1F`;

const SUBJECTS = {
  'Math':    { color: '#4F46E5', soft: '#EEF2FF' },
  'Physics': { color: '#0EA5E9', soft: '#E0F2FE' },
  'Chem':    { color: '#10B981', soft: '#ECFDF5' },
  'Biology': { color: '#EAB308', soft: '#FEFCE8' },
  'English': { color: '#EC4899', soft: '#FDF2F8' },
};
const subColor = (name) => SUBJECTS[name] || { color: C.muted, soft: C.surface };

// ─── localStorage store ────────────────────────────────────────
const STORAGE_KEY = 'homework_store';

const seedStore = () => {
  const me = { id: 's_oliver', name: 'Oliver Chen', role: 'student' };
  const teacher = { id: 't_clarke', name: 'Sarah Clarke', role: 'teacher' };
  const students = [
    me,
    { id: 's_emma',   name: 'Emma Thompson', role: 'student' },
    { id: 's_sophia', name: 'Sophia Patel',  role: 'student' },
    { id: 's_james',  name: 'James Wilson',  role: 'student' },
  ];

  const folders = {
    f_gcse:   { id: 'f_gcse',   name: 'GCSE Maths',     color: '#4F46E5' },
    f_alevel: { id: 'f_alevel', name: 'A-Level Maths',  color: '#EC4899' },
    f_phys:   { id: 'f_phys',   name: 'Physics',        color: '#0EA5E9' },
  };

  const a1 = {
    id: 'a_alg_simul',
    title: 'Algebra: Simultaneous Equations',
    subject: 'Math',
    folderId: 'f_gcse',
    teacherId: teacher.id,
    studentIds: ['s_oliver','s_emma','s_sophia','s_james'],
    dueAt: '2026-05-04',
    status: 'active',
    createdAt: '2026-04-20',
    instructions: 'Show all working. Submit final answers as exact values where possible.',
    questions: [
      { id: 'q1', type: 'mcq',     prompt: 'If 2x + y = 10 and x − y = 2, what is x?',
        choices: ['2','3','4','5'], correctIndex: 2, points: 2, hint: 'Add the two equations to eliminate y.' },
      { id: 'q2', type: 'numeric', prompt: 'Solve for y when x = 4 in 2x + y = 10.',
        answer: 2, tolerance: 0.01, points: 2 },
      { id: 'q3', type: 'math',    prompt: 'Solve for x: 3x + 2 = 11. Enter x = …',
        answer: 'x=3', points: 3 },
      { id: 'q4', type: 'short',   prompt: 'In one line, describe the substitution method.',
        points: 3 },
      { id: 'q5', type: 'long',    prompt: 'Explain when elimination is preferable to substitution. Use an example.',
        points: 5 },
    ],
    submissions: {
      's_emma': {
        answers: { q1: 2, q2: 2, q3: 'x=3', q4: 'Replace one variable using the other equation.', q5: 'When the coefficients align nicely, e.g. 2x + y = 10 and 2x − y = 2 — adding eliminates y immediately.' },
        submittedAt: '2026-04-25T10:14:00Z',
        status: 'submitted',
        marks: { q1: 2, q2: 2, q3: 3, q4: null, q5: null },
        feedback: { q1: '', q2: '', q3: '', q4: '', q5: '' },
      },
    },
  };

  const a2 = {
    id: 'a_calc_diff',
    title: 'Calculus: Differentiation Basics',
    subject: 'Math',
    folderId: 'f_alevel',
    teacherId: teacher.id,
    studentIds: ['s_oliver','s_emma'],
    dueAt: '2026-05-08',
    status: 'active',
    createdAt: '2026-04-22',
    instructions: 'Use first principles where indicated.',
    questions: [
      { id: 'q1', type: 'mcq', prompt: 'Derivative of x²?',
        choices: ['x','2x','x²/2','2'], correctIndex: 1, points: 2 },
      { id: 'q2', type: 'math', prompt: 'Differentiate: 3x² + 5x. Enter d/dx as f\'(x) = …',
        answer: "f'(x)=6x+5", points: 3 },
      { id: 'q3', type: 'long', prompt: 'Differentiate sin(x) from first principles.',
        points: 5 },
      { id: 'q4', type: 'upload', prompt: 'Upload your photographed working for question 3.',
        points: 3 },
    ],
    submissions: {},
  };

  const a3 = {
    id: 'a_phys_motion',
    title: 'Mechanics: SUVAT Practice',
    subject: 'Physics',
    folderId: 'f_phys',
    teacherId: teacher.id,
    studentIds: ['s_emma','s_sophia','s_james'],
    dueAt: '2026-05-11',
    status: 'draft',
    createdAt: '2026-04-24',
    instructions: 'Treat g = 9.81 m/s² unless told otherwise.',
    questions: [
      { id: 'q1', type: 'numeric', prompt: 'A ball falls from rest for 2s. How far has it fallen (m)?',
        answer: 19.62, tolerance: 0.1, points: 3 },
      { id: 'q2', type: 'short', prompt: 'State two assumptions of SUVAT.', points: 2 },
    ],
    submissions: {},
  };

  return {
    currentUser: me,
    users: { [me.id]: me, [teacher.id]: teacher, ...Object.fromEntries(students.map(s => [s.id, s])) },
    folders,
    assignments: { [a1.id]: a1, [a2.id]: a2, [a3.id]: a3 },
    drafts: {},
  };
};

// Migrate older shapes from localStorage (added folder support).
const migrate = (s) => {
  if (!s) return s;
  if (!s.folders) s.folders = {};
  if (s.assignments) {
    Object.values(s.assignments).forEach(a => {
      if (!('folderId' in a)) a.folderId = null;
    });
  }
  return s;
};

const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seedStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return migrate(JSON.parse(raw));
  } catch (e) {
    const s = seedStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }
};

const saveStore = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
};

const useStore = () => {
  const [store, setStore] = React.useState(() => loadStore());
  const update = React.useCallback((mut) => {
    setStore(prev => {
      const next = typeof mut === 'function' ? mut(prev) : mut;
      saveStore(next);
      return next;
    });
  }, []);
  return [store, update];
};

// ─── Toast system ───────────────────────────────────────────────
const ToastCtx = React.createContext(null);
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((msg, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{
        position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:8, zIndex:9999,
      }}>
        {toasts.map(t => {
          const palette = t.kind === 'success' ? { bg: C.successBg, bd: C.successBorder, fg: C.success }
                       : t.kind === 'danger'  ? { bg: C.dangerBg,  bd: C.dangerBorder,  fg: C.danger  }
                       : t.kind === 'warn'    ? { bg: C.amberBg,   bd: C.amberBorder,   fg: C.amber   }
                       : { bg: C.bg, bd: C.border, fg: C.sub };
          return (
            <div key={t.id} style={{
              padding:'10px 14px', borderRadius:8,
              background: palette.bg, border:`1px solid ${palette.bd}`,
              color: palette.fg, fontSize:13, fontFamily:F.body, fontWeight:500,
              boxShadow: C.shadowL, minWidth:200, maxWidth:340,
            }}>{t.msg}</div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => React.useContext(ToastCtx) || (() => {});

// ─── Pill ───────────────────────────────────────────────────────
const Pill = ({ children, tone = 'default', icon }) => {
  const tones = {
    default: { bg: C.surface,    fg: C.sub,    bd: C.border },
    brand:   { bg: C.brandSoft,  fg: C.brand,  bd: C.brandBorder },
    success: { bg: C.successBg,  fg: C.success,bd: C.successBorder },
    amber:   { bg: C.amberBg,    fg: C.amber,  bd: C.amberBorder },
    danger:  { bg: C.dangerBg,   fg: C.danger, bd: C.dangerBorder },
    info:    { bg: C.accentSoft, fg: C.accent, bd: '#BAE6FD' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'2px 8px', borderRadius:999, fontFamily:F.body,
      fontSize:11, fontWeight:600, letterSpacing:'.02em',
      background:t.bg, color:t.fg, border:`1px solid ${t.bd}`,
    }}>{icon}{children}</span>
  );
};

// ─── Btn ────────────────────────────────────────────────────────
const Btn = ({ variant = 'primary', children, icon, onClick, disabled, small, type = 'button', style = {} }) => {
  const [hov, setHov] = React.useState(false);
  const [foc, setFoc] = React.useState(false);
  const variants = {
    primary: { bg: hov ? '#0F172A' : C.text, fg: '#fff', bd: 'transparent', ring: C.text },
    brand:   { bg: hov ? C.brandH : C.brand, fg: '#fff', bd: 'transparent', ring: C.brand },
    ghost:   { bg: hov ? C.surface : 'transparent', fg: C.sub, bd: 'transparent', ring: C.muted },
    soft:    { bg: hov ? C.surface2 : C.surface, fg: C.sub, bd: C.border, ring: C.muted },
    danger:  { bg: hov ? '#B91C1C' : C.danger, fg: '#fff', bd: 'transparent', ring: C.danger },
  };
  const s = variants[variant] || variants.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
        padding: small ? '6px 12px' : '9px 16px',
        borderRadius:8, border:`1px solid ${s.bd}`,
        background: disabled ? C.surface2 : s.bg,
        color: disabled ? C.faint : s.fg,
        fontFamily: F.body, fontSize: small ? 12 : 13, fontWeight:600,
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace:'nowrap',
        transition: T, opacity: disabled ? 0.7 : 1,
        boxShadow: foc ? ring(s.ring) : 'none',
        outline: 'none',
        ...style,
      }}>{icon}{children}</button>
  );
};

// ─── Card ───────────────────────────────────────────────────────
const Card = ({ children, style = {}, hoverable, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHov(true)}
      onMouseLeave={() => hoverable && setHov(false)}
      onClick={onClick}
      style={{
        background: C.bg, border: `1px solid ${hov ? C.borderD : C.border}`,
        borderRadius: 12, transition: T,
        boxShadow: hov ? C.shadowL : C.shadow,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}>{children}</div>
  );
};

// ─── Label ──────────────────────────────────────────────────────
const Label = ({ children, htmlFor, hint }) => (
  <label htmlFor={htmlFor} style={{
    display:'block', fontFamily:F.body, fontSize:12, fontWeight:600,
    color:C.sub, marginBottom:6, letterSpacing:'.01em',
  }}>
    {children}
    {hint && <span style={{ color:C.faint, fontWeight:400, marginLeft:6 }}>{hint}</span>}
  </label>
);

// ─── Input ──────────────────────────────────────────────────────
const Input = React.forwardRef(({ value, onChange, placeholder, type = 'text', multiline, rows = 3, style = {}, autoFocus, suffix, prefix, disabled }, ref) => {
  const [foc, setFoc] = React.useState(false);
  const base = {
    width: '100%', boxSizing:'border-box',
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${foc ? C.brand : C.border}`,
    background: disabled ? C.surface : C.bg,
    color: C.text, fontFamily: F.body, fontSize: 13,
    transition: T, outline: 'none',
    boxShadow: foc ? ring(C.brand) : 'none',
    ...style,
  };
  if (multiline) {
    return (
      <textarea ref={ref} value={value || ''} rows={rows} disabled={disabled}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        placeholder={placeholder} autoFocus={autoFocus}
        style={{ ...base, resize:'vertical', fontFamily: F.body, lineHeight: 1.5 }} />
    );
  }
  if (prefix || suffix) {
    return (
      <div style={{
        display:'flex', alignItems:'stretch',
        border:`1px solid ${foc ? C.brand : C.border}`,
        borderRadius:8, background:C.bg,
        boxShadow: foc ? ring(C.brand) : 'none', transition: T,
      }}>
        {prefix && <span style={{ display:'flex', alignItems:'center', padding:'0 10px', color:C.faint, fontSize:13, fontFamily:F.body, borderRight:`1px solid ${C.border}` }}>{prefix}</span>}
        <input ref={ref} type={type} value={value ?? ''} disabled={disabled}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          placeholder={placeholder} autoFocus={autoFocus}
          style={{ ...base, border:'none', boxShadow:'none', flex:1, background:'transparent' }} />
        {suffix && <span style={{ display:'flex', alignItems:'center', padding:'0 10px', color:C.faint, fontSize:13, fontFamily:F.body, borderLeft:`1px solid ${C.border}` }}>{suffix}</span>}
      </div>
    );
  }
  return (
    <input ref={ref} type={type} value={value ?? ''} disabled={disabled}
      onChange={e => onChange && onChange(e.target.value)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      placeholder={placeholder} autoFocus={autoFocus}
      style={base} />
  );
});

// ─── Math display & editor ──────────────────────────────────────
const MathDisplay = ({ tex, inline, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    try {
      const html = window.katex && window.katex.renderToString
        ? window.katex.renderToString(tex || '', { throwOnError: false, displayMode: !inline })
        : '';
      ref.current.innerHTML = html;
    } catch (e) {
      if (ref.current) ref.current.innerText = tex || '';
    }
  }, [tex, inline]);
  return <span ref={ref} style={{ fontFamily: F.mono, color: C.text, ...style }} />;
};

const MathEditor = ({ value, onChange, placeholder = 'Enter math…' }) => {
  const ref = React.useRef(null);
  const [foc, setFoc] = React.useState(false);
  const lastVal = React.useRef(value || '');

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const v = el.value || '';
      if (v !== lastVal.current) {
        lastVal.current = v;
        onChange && onChange(v);
      }
    };
    const onFocus = () => setFoc(true);
    const onBlur = () => setFoc(false);
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('input', sync);
      el.removeEventListener('change', sync);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, [onChange]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((value || '') !== (el.value || '')) {
      el.value = value || '';
      lastVal.current = value || '';
    }
  }, [value]);

  return (
    <div style={{
      border: `1px solid ${foc ? C.brand : C.border}`,
      borderRadius: 8, padding: 8, background: C.bg,
      boxShadow: foc ? ring(C.brand) : 'none', transition: T,
    }}>
      {React.createElement('math-field', {
        ref,
        placeholder,
        style: {
          display:'block', minHeight: 36, fontSize: 16,
          padding: 4, border: 'none', outline: 'none',
        },
        'virtual-keyboard-mode': 'manual',
      })}
    </div>
  );
};

// ─── Auto-marking helpers ───────────────────────────────────────
const normalizeMath = (s) => {
  if (s == null) return '';
  let x = String(s);
  // Remove \left and \right
  x = x.replace(/\\left/g, '').replace(/\\right/g, '');
  // Convert fractions \frac{a}{b} -> (a)/(b)
  let prev;
  do {
    prev = x;
    x = x.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  } while (x !== prev);
  // Convert \sqrt{x} -> sqrt(x)
  do {
    prev = x;
    x = x.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
  } while (x !== prev);
  // Symbols
  x = x.replace(/\\cdot|\\times/g, '*');
  x = x.replace(/\\pi/g, 'pi');
  x = x.replace(/\\theta/g, 'theta');
  x = x.replace(/\\alpha/g, 'alpha').replace(/\\beta/g, 'beta');
  // Strip remaining backslashes from common commands
  x = x.replace(/\\,|\\!|\\;|\\:/g, '');
  // Unify operators
  x = x.replace(/×/g, '*').replace(/·/g, '*');
  // Whitespace
  x = x.replace(/\s+/g, '');
  // Lowercase
  x = x.toLowerCase();
  return x;
};

const autoMark = (q, ans) => {
  if (ans == null || ans === '') return null;
  if (q.type === 'mcq') {
    return ans === q.correctIndex ? q.points : 0;
  }
  if (q.type === 'numeric') {
    const n = parseFloat(ans);
    if (Number.isNaN(n)) return 0;
    const tol = q.tolerance ?? 0.01;
    return Math.abs(n - q.answer) <= tol ? q.points : 0;
  }
  if (q.type === 'math') {
    return normalizeMath(ans) === normalizeMath(q.answer) ? q.points : 0;
  }
  return null;
};

const isAuto = (t) => t === 'mcq' || t === 'numeric' || t === 'math';

// ─── Question type catalog ──────────────────────────────────────
const QTYPES = [
  { type: 'mcq',     label: 'Multiple choice', desc: 'Auto-marked',         marker: 'auto' },
  { type: 'numeric', label: 'Numeric',         desc: 'Auto-marked',         marker: 'auto' },
  { type: 'math',    label: 'Math',            desc: 'Auto-marked (LaTeX)', marker: 'auto' },
  { type: 'short',   label: 'Short answer',    desc: 'Teacher-marked',      marker: 'manual' },
  { type: 'long',    label: 'Long answer',     desc: 'Teacher-marked',      marker: 'manual' },
  { type: 'upload',  label: 'File upload',     desc: 'Teacher-marked',      marker: 'manual' },
];
const qtypeMeta = (t) => QTYPES.find(x => x.type === t) || QTYPES[0];

// ─── Icon library (inline svg) ──────────────────────────────────
const Ico = ({ name, size = 16, color = 'currentColor' }) => {
  const paths = {
    plus:    'M12 4v16M4 12h16',
    check:   'M5 12l5 5L20 7',
    x:       'M6 6l12 12M18 6L6 18',
    edit:    'M4 20h4l11-11-4-4L4 16v4z',
    trash:   'M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14',
    eye:     'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z',
    clock:   'M12 8v4l3 3 M12 22a10 10 0 100-20 10 10 0 000 20z',
    upload:  'M12 16V4 M5 11l7-7 7 7 M3 20h18',
    file:    'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z M14 3v6h6',
    chevR:   'M9 6l6 6-6 6',
    chevL:   'M15 6l-6 6 6 6',
    chevD:   'M6 9l6 6 6-6',
    search:  'M21 21l-5-5 M11 17a6 6 0 100-12 6 6 0 000 12z',
    sparkle: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z',
    flame:   'M12 2c1 4 4 5 4 9a4 4 0 11-8 0c0-2 1-3 1-5 0 2 1 3 3 3-1-3 0-5 0-7z',
    book:    'M4 4h7a3 3 0 013 3v13H7a3 3 0 01-3-3V4z M20 4h-7a3 3 0 00-3 3v13h7a3 3 0 003-3V4z',
    pencil:  'M3 21l3-1 11-11-2-2L4 18l-1 3z M14 5l2 2',
    user:    'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0',
    arrowR:  'M5 12h14 M13 6l6 6-6 6',
    arrowL:  'M19 12H5 M11 6l-6 6 6 6',
    download:'M12 4v12 M5 13l7 7 7-7 M3 22h18',
    save:    'M5 3h11l3 3v15H5V3z M9 3v6h7V3 M7 14h10v7H7v-7z',
    grid:    'M3 3h8v8H3V3z M13 3h8v8h-8V3z M3 13h8v8H3v-8z M13 13h8v8h-8v-8z',
    list:    'M4 6h16 M4 12h16 M4 18h16',
    inbox:   'M3 13h4l2 3h6l2-3h4 M3 13l3-9h12l3 9 M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6',
    award:   'M12 15a6 6 0 100-12 6 6 0 000 12z M9 14l-1 7 4-2 4 2-1-7',
    star:    'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z',
    bell:    'M6 9a6 6 0 1112 0v5l1 2H5l1-2V9z M10 19a2 2 0 004 0',
    book2:   'M4 4v16c2-1 5-2 8-2s6 1 8 2V4c-2-1-5-2-8-2S6 3 4 4z',
    info:    'M12 8h.01 M11 12h1v5h1 M12 22a10 10 0 100-20 10 10 0 000 20z',
    layers:  'M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5 M3 18l9 5 9-5',
  };
  const d = paths[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink:0, display:'block' }}>
      {d.split(' M').filter(Boolean).map((seg, i) =>
        <path key={i} d={(i === 0 && d.startsWith('M') ? '' : 'M') + seg} />
      )}
    </svg>
  );
};

// ─── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
const daysUntil = (iso) => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86400000);
};
const submissionStatus = (asn, studentId) => {
  const sub = asn.submissions[studentId];
  if (!sub) return 'not_started';
  if (sub.status === 'approved') return 'approved';
  return 'submitted';
};
const totalPoints = (asn) => asn.questions.reduce((s, q) => s + (q.points || 0), 0);
const autoTotal = (asn) => asn.questions.filter(q => isAuto(q.type)).reduce((s, q) => s + (q.points || 0), 0);
const manualTotal = (asn) => asn.questions.filter(q => !isAuto(q.type)).reduce((s, q) => s + (q.points || 0), 0);
const submissionScore = (asn, sub) => {
  if (!sub) return 0;
  return asn.questions.reduce((s, q) => {
    const m = sub.marks?.[q.id];
    return s + (typeof m === 'number' ? m : 0);
  }, 0);
};
const autoScore = (asn, sub) => {
  if (!sub) return 0;
  return asn.questions.filter(q => isAuto(q.type)).reduce((s, q) => {
    const m = sub.marks?.[q.id];
    return s + (typeof m === 'number' ? m : 0);
  }, 0);
};
const fullyMarked = (asn, sub) => {
  if (!sub) return false;
  return asn.questions.every(q => typeof sub.marks?.[q.id] === 'number');
};

// ════════════════════════════════════════════════════════════════
// PDF Import (simulated parser)
// Picks one of several question banks based on filename heuristics.
// ════════════════════════════════════════════════════════════════
const PDF_BANKS = {
  algebra: [
    { type:'mcq',     prompt:'Which is a solution to x² − 5x + 6 = 0?',
      choices:['x = 1','x = 2','x = 4','x = 5'], correctIndex:1, points:2 },
    { type:'numeric', prompt:'Solve for x: 3x + 7 = 22.', answer:5, tolerance:0, points:2 },
    { type:'math',    prompt:'Factorise x² − 9. Enter your factorisation.',
      answer:'(x-3)(x+3)', points:3 },
    { type:'short',   prompt:'In one line, state the quadratic formula.', points:2 },
    { type:'long',    prompt:'Solve 2x² − 7x + 3 = 0 by factorising. Show full working.', points:5 },
  ],
  calculus: [
    { type:'mcq',     prompt:'What is d/dx (x³)?',
      choices:['x²','3x²','3x','x³/3'], correctIndex:1, points:2 },
    { type:'math',    prompt:'Differentiate 4x² + 3x − 7. Enter f\'(x) = …',
      answer:"f'(x)=8x+3", points:3 },
    { type:'numeric', prompt:'Evaluate the gradient of y = x² at x = 5.',
      answer:10, tolerance:0, points:2 },
    { type:'long',    prompt:'Differentiate cos(x) from first principles.', points:6 },
    { type:'upload',  prompt:'Upload your photographed working for question 4.', points:3 },
  ],
  physics: [
    { type:'numeric', prompt:'A car accelerates from rest at 3 m/s² for 4s. Final velocity (m/s)?',
      answer:12, tolerance:0.1, points:2 },
    { type:'numeric', prompt:'A 2 kg mass on Earth has weight (N)? Use g = 9.81.',
      answer:19.62, tolerance:0.1, points:2 },
    { type:'mcq',     prompt:'SI unit of force?',
      choices:['joule','watt','newton','pascal'], correctIndex:2, points:1 },
    { type:'short',   prompt:'State Newton\'s second law in one sentence.', points:2 },
    { type:'long',    prompt:'Explain why a falling object reaches terminal velocity.', points:5 },
  ],
  trig: [
    { type:'mcq',     prompt:'Value of sin(30°)?',
      choices:['0','1/2','√3/2','1'], correctIndex:1, points:1 },
    { type:'mcq',     prompt:'Value of cos(60°)?',
      choices:['0','1/2','√3/2','1'], correctIndex:1, points:1 },
    { type:'math',    prompt:'Simplify: sin²(θ) + cos²(θ).',
      answer:'1', points:2 },
    { type:'numeric', prompt:'Hypotenuse of a right triangle with legs 3 and 4.',
      answer:5, tolerance:0, points:2 },
    { type:'long',    prompt:'Prove the sine rule for a triangle ABC.', points:5 },
  ],
  general: [
    { type:'mcq',     prompt:'Pick the prime number.',
      choices:['9','15','17','21'], correctIndex:2, points:1 },
    { type:'numeric', prompt:'Compute 12 × 7.', answer:84, tolerance:0, points:1 },
    { type:'math',    prompt:'Solve: 2x − 5 = 11. Enter x=…',
      answer:'x=8', points:2 },
    { type:'short',   prompt:'Define "function" in your own words.', points:2 },
    { type:'long',    prompt:'Describe one real-world application of statistics.', points:4 },
  ],
};

const pickBankForFilename = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('alg') || n.includes('quad') || n.includes('linear')) return 'algebra';
  if (n.includes('calc') || n.includes('diff') || n.includes('integ')) return 'calculus';
  if (n.includes('phys') || n.includes('mech') || n.includes('suvat')) return 'physics';
  if (n.includes('trig') || n.includes('sin') || n.includes('cos'))    return 'trig';
  return 'general';
};

const PdfImportModal = ({ open, onClose, onImport }) => {
  const [phase, setPhase] = React.useState('idle'); // idle | parsing | review
  const [parsed, setParsed] = React.useState([]);
  const [picked, setPicked] = React.useState({});
  const [filename, setFilename] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [bankKey, setBankKey] = React.useState('general');
  const fileRef = React.useRef(null);

  // Reset state every time the modal opens.
  React.useEffect(() => {
    if (open) {
      setPhase('idle');
      setParsed([]);
      setPicked({});
      setFilename('');
      setDragOver(false);
      setBankKey('general');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  if (!open) return null;

  const startParse = (name) => {
    const safeName = name || 'paper.pdf';
    setFilename(safeName);
    const key = pickBankForFilename(safeName);
    setBankKey(key);
    setPhase('parsing');
    window.setTimeout(() => {
      const bank = PDF_BANKS[key] || PDF_BANKS.general;
      const withIds = bank.map((q, i) => ({ ...q, id: 'p_' + i + '_' + Math.random().toString(36).slice(2, 6) }));
      setParsed(withIds);
      setPicked(Object.fromEntries(withIds.map(q => [q.id, true])));
      setPhase('review');
    }, 1400);
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type && f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      // still accept — simulate parse
    }
    startParse(f.name);
  };

  const onFileChange = (e) => {
    handleFiles(e.target.files);
    // Reset value so re-selecting the same file fires onChange again.
    if (fileRef.current) fileRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer?.files);
  };

  const togglePick = (id) => {
    setPicked(p => ({ ...p, [id]: !p[id] }));
  };
  const allOn = parsed.length > 0 && parsed.every(q => picked[q.id]);
  const toggleAll = () => {
    setPicked(allOn ? {} : Object.fromEntries(parsed.map(q => [q.id, true])));
  };

  const importNow = () => {
    const chosen = parsed.filter(q => picked[q.id]).map(q => {
      const { id, ...rest } = q;
      return { ...rest, id: 'q_' + Math.random().toString(36).slice(2, 8) };
    });
    onImport(chosen);
    onClose();
  };

  const reparseWithBank = (key) => {
    setBankKey(key);
    const bank = PDF_BANKS[key] || PDF_BANKS.general;
    const withIds = bank.map((q, i) => ({ ...q, id: 'p_' + i + '_' + Math.random().toString(36).slice(2, 6) }));
    setParsed(withIds);
    setPicked(Object.fromEntries(withIds.map(q => [q.id, true])));
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.5)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:640, maxHeight:'85vh', background:C.bg,
        borderRadius:14, border:`1px solid ${C.border}`,
        boxShadow:C.shadowL, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:F.head, fontSize:16, fontWeight:700, color:C.text }}>Import from PDF</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.muted, marginTop:2 }}>
              {phase === 'idle' && 'Upload a past paper to extract questions automatically.'}
              {phase === 'parsing' && 'Parsing document…'}
              {phase === 'review' && `Found ${parsed.length} question${parsed.length === 1 ? '' : 's'} in ${filename}`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width:30, height:30, borderRadius:7, border:`1px solid ${C.border}`,
            background:C.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Ico name="x" size={14} color={C.muted} />
          </button>
        </div>

        <div style={{ padding:20, overflow:'auto', flex:1 }}>
          {phase === 'idle' && (
            <div>
              <div
                onClick={() => fileRef.current && fileRef.current.click()}
                onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  gap:10, padding:'44px 20px',
                  border:`2px dashed ${dragOver ? C.brand : C.border}`,
                  borderRadius:10,
                  background: dragOver ? C.brandSoft : C.surface,
                  cursor:'pointer', transition: T,
                }}
              >
                <div style={{
                  width:52, height:52, borderRadius:'50%',
                  background:C.brandSoft, display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Ico name="upload" size={22} color={C.brand} />
                </div>
                <div style={{ fontFamily:F.body, fontSize:14, fontWeight:600, color:C.text }}>
                  {dragOver ? 'Release to upload' : 'Drop a PDF here'}
                </div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>
                  {dragOver ? ' ' : 'or click to browse'}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display:'none' }}
                  onChange={onFileChange}
                />
              </div>

              <div style={{
                marginTop:14, padding:'10px 12px', background:C.surface, borderRadius:8,
                border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10,
              }}>
                <Ico name="info" size={13} color={C.muted} />
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted, flex:1 }}>
                  No PDF? Try a sample bank instead:
                </span>
                <select
                  value={bankKey}
                  onChange={e => {
                    const k = e.target.value;
                    setBankKey(k);
                    startParse(k + '.pdf');
                  }}
                  style={{
                    padding:'5px 8px', borderRadius:6, border:`1px solid ${C.border}`,
                    background:C.bg, color:C.text, fontFamily:F.body, fontSize:12, cursor:'pointer',
                  }}>
                  <option value="general">Choose a sample…</option>
                  <option value="algebra">Algebra paper</option>
                  <option value="calculus">Calculus paper</option>
                  <option value="trig">Trigonometry paper</option>
                  <option value="physics">Physics / SUVAT paper</option>
                </select>
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{
                margin:'0 auto 16px', width:36, height:36, borderRadius:'50%',
                border:`3px solid ${C.brandSoft}`, borderTopColor: C.brand,
                animation:'hwSpin 0.8s linear infinite',
              }} />
              <div style={{ fontFamily:F.body, fontSize:13, color:C.sub }}>Extracting questions from {filename}…</div>
              <style>{`@keyframes hwSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {phase === 'review' && (
            <div>
              <div style={{
                display:'flex', alignItems:'center', gap:8, marginBottom:12,
                padding:'8px 10px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}`,
              }}>
                <button onClick={toggleAll} style={{
                  padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`,
                  background:C.bg, color:C.sub, fontFamily:F.body, fontSize:12, fontWeight:500,
                  cursor:'pointer',
                }}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </button>
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>
                  {Object.values(picked).filter(Boolean).length} of {parsed.length} selected
                </span>
                <div style={{ flex:1 }} />
                <span style={{ fontFamily:F.body, fontSize:12, color:C.muted }}>Question bank:</span>
                <select value={bankKey} onChange={e => reparseWithBank(e.target.value)}
                  style={{
                    padding:'4px 8px', borderRadius:6, border:`1px solid ${C.border}`,
                    background:C.bg, color:C.text, fontFamily:F.body, fontSize:12, cursor:'pointer',
                  }}>
                  <option value="algebra">Algebra</option>
                  <option value="calculus">Calculus</option>
                  <option value="trig">Trigonometry</option>
                  <option value="physics">Physics</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {parsed.map((q, i) => {
                  const m = qtypeMeta(q.type);
                  const on = !!picked[q.id];
                  return (
                    <div key={q.id} role="button" tabIndex={0}
                      onClick={() => togglePick(q.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePick(q.id); } }}
                      style={{
                        display:'flex', gap:12, padding:12, borderRadius:8,
                        border:`1px solid ${on ? C.brandBorder : C.border}`,
                        background: on ? C.brandSoft : C.bg, cursor:'pointer',
                        transition: T, alignItems:'flex-start',
                      }}>
                      <span style={{
                        marginTop:2, width:18, height:18, borderRadius:5, flexShrink:0,
                        border:`1.5px solid ${on ? C.brand : C.borderD}`,
                        background: on ? C.brand : C.bg,
                        display:'flex', alignItems:'center', justifyContent:'center', transition: T,
                      }}>
                        {on && <Ico name="check" size={12} color="#fff" />}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontFamily:F.mono, fontSize:11, color:C.muted }}>Q{i+1}</span>
                          <Pill tone={m.marker === 'auto' ? 'brand' : 'amber'}>{m.label}</Pill>
                          <span style={{ marginLeft:'auto', fontFamily:F.mono, fontSize:11, color:C.muted }}>{q.points} pt</span>
                        </div>
                        <div style={{ fontFamily:F.body, fontSize:13, color:C.text, lineHeight: 1.5 }}>{q.prompt}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {phase === 'review' && (
          <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:C.surface }}>
            <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />}
              onClick={() => { setPhase('idle'); setParsed([]); setPicked({}); setFilename(''); if (fileRef.current) fileRef.current.value = ''; }}>
              Choose another file
            </Btn>
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="soft" small onClick={onClose}>Cancel</Btn>
              <Btn variant="brand" small icon={<Ico name="plus" size={13} color="#fff" />} onClick={importNow}
                disabled={!Object.values(picked).some(Boolean)}>
                Import {Object.values(picked).filter(Boolean).length} question{Object.values(picked).filter(Boolean).length === 1 ? '' : 's'}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Question rendering — student answer inputs
// ════════════════════════════════════════════════════════════════
const QuestionAnswerInput = ({ question, value, onChange }) => {
  const q = question;
  if (q.type === 'mcq') {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {q.choices.map((c, i) => {
          const on = value === i;
          return (
            <label key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              border: `1px solid ${on ? C.brand : C.border}`,
              background: on ? C.brandSoft : C.bg,
              borderRadius:10, cursor:'pointer', transition: T,
              boxShadow: on ? ring(C.brand) : 'none',
            }}>
              <span style={{
                width:20, height:20, borderRadius:'50%',
                border:`2px solid ${on ? C.brand : C.borderD}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: on ? C.brand : C.bg,
              }}>
                {on && <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
              </span>
              <span style={{ fontFamily: F.mono, fontSize:12, color: on ? C.brand : C.muted, fontWeight:600 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ fontFamily: F.body, fontSize:14, color: C.text }}>{c}</span>
              <input type="radio" name={q.id} checked={on} onChange={() => onChange(i)} style={{ display:'none' }} />
            </label>
          );
        })}
      </div>
    );
  }
  if (q.type === 'numeric') {
    return (
      <div style={{ maxWidth: 280 }}>
        <Input type="number" value={value ?? ''} onChange={(v) => onChange(v === '' ? null : v)} placeholder="Enter your answer"
          style={{ fontSize: 24, fontWeight: 600, padding:'14px 16px', fontFamily: F.mono, textAlign:'left' }} />
      </div>
    );
  }
  if (q.type === 'math') {
    return <MathEditor value={value || ''} onChange={onChange} placeholder="Type or use the keyboard" />;
  }
  if (q.type === 'short') {
    return <Input value={value || ''} onChange={onChange} placeholder="Your answer" />;
  }
  if (q.type === 'long') {
    return <Input multiline rows={6} value={value || ''} onChange={onChange} placeholder="Write your answer here…" />;
  }
  if (q.type === 'upload') {
    const has = !!value;
    return (
      <label style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        padding:'24px 20px', border:`2px dashed ${has ? C.brandBorder : C.border}`,
        background: has ? C.brandSoft : C.surface,
        borderRadius:10, cursor:'pointer', transition: T,
      }}>
        <Ico name={has ? 'file' : 'upload'} size={18} color={has ? C.brand : C.muted} />
        <span style={{ fontFamily:F.body, fontSize:13, color: has ? C.brand : C.sub, fontWeight:500 }}>
          {has ? value : 'Drop a file or click to upload'}
        </span>
        <input type="file" style={{ display:'none' }} onChange={e => {
          const f = e.target.files?.[0];
          if (f) onChange(f.name);
        }} />
      </label>
    );
  }
  return null;
};

// Read-only display of a student's answer (for review/results)
const QuestionAnswerDisplay = ({ question, answer }) => {
  const q = question;
  if (answer == null || answer === '') {
    return <span style={{ fontFamily:F.body, fontSize:13, color: C.faint, fontStyle:'italic' }}>No answer submitted</span>;
  }
  if (q.type === 'mcq') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:F.body, fontSize:14, color:C.text }}>
        <Pill tone="brand">{String.fromCharCode(65 + answer)}</Pill>
        <span>{q.choices[answer]}</span>
      </div>
    );
  }
  if (q.type === 'numeric') {
    return <span style={{ fontFamily:F.mono, fontSize:18, fontWeight:600, color:C.text }}>{answer}</span>;
  }
  if (q.type === 'math') {
    return (
      <div style={{
        padding:'10px 14px', background: C.surface, borderRadius:8,
        border:`1px solid ${C.border}`, fontFamily: F.mono, fontSize: 14,
      }}>
        <MathDisplay tex={answer} inline />
        <span style={{ marginLeft:8, color: C.faint, fontSize: 11 }}>· raw: {answer}</span>
      </div>
    );
  }
  if (q.type === 'upload') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}` }}>
        <Ico name="file" size={14} color={C.brand} />
        <span style={{ fontFamily:F.body, fontSize:13, color:C.sub }}>{answer}</span>
      </div>
    );
  }
  return (
    <div style={{
      padding:'10px 14px', background:C.surface, borderRadius:8, border:`1px solid ${C.border}`,
      fontFamily:F.body, fontSize: 14, color: C.text, whiteSpace:'pre-wrap', lineHeight: 1.5,
    }}>{answer}</div>
  );
};

// ════════════════════════════════════════════════════════════════
// TEACHER MODULE
// ════════════════════════════════════════════════════════════════
const TeacherHomework = () => {
  const [store, update] = useStore();
  const [view, setView] = React.useState({ name: 'list' }); // list | builder | review
  const me = Object.values(store.users).find(u => u.role === 'teacher') || { id: 't_clarke', name: 'Sarah Clarke' };

  const myAssignments = Object.values(store.assignments).filter(a => a.teacherId === me.id);
  const folders = Object.values(store.folders || {});

  const createFolder = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const id = 'f_' + Math.random().toString(36).slice(2, 8);
    const palette = ['#4F46E5','#0EA5E9','#10B981','#EAB308','#EC4899','#F97316','#8B5CF6'];
    const color = palette[Object.keys(store.folders || {}).length % palette.length];
    const folder = { id, name: trimmed, color };
    update(s => ({ ...s, folders: { ...(s.folders || {}), [id]: folder } }));
    return folder;
  };

  const renameFolder = (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    update(s => ({ ...s, folders: { ...(s.folders || {}), [id]: { ...(s.folders?.[id] || { id }), name: trimmed } } }));
  };

  const deleteFolder = (id) => {
    update(s => {
      const nextFolders = { ...(s.folders || {}) };
      delete nextFolders[id];
      const nextAsn = { ...s.assignments };
      Object.keys(nextAsn).forEach(k => {
        if (nextAsn[k].folderId === id) nextAsn[k] = { ...nextAsn[k], folderId: null };
      });
      return { ...s, folders: nextFolders, assignments: nextAsn };
    });
  };

  const moveAssignment = (id, folderId) => {
    update(s => ({ ...s, assignments: { ...s.assignments, [id]: { ...s.assignments[id], folderId: folderId || null } } }));
  };

  const duplicateAssignment = (id) => {
    const src = store.assignments[id];
    if (!src) return;
    const newId = 'a_' + Math.random().toString(36).slice(2, 9);
    const clone = JSON.parse(JSON.stringify(src));
    clone.id = newId;
    clone.title = src.title ? `${src.title} (copy)` : 'Untitled (copy)';
    clone.status = 'draft';
    clone.submissions = {};
    clone.studentIds = [];
    clone.dueAt = '';
    clone.createdAt = new Date().toISOString().slice(0, 10);
    // Re-id questions so submissions don't accidentally collide later.
    clone.questions = (clone.questions || []).map(q => ({ ...q, id: 'q_' + Math.random().toString(36).slice(2, 8) }));
    update(s => ({ ...s, assignments: { ...s.assignments, [newId]: clone } }));
    setView({ name: 'builder', id: newId });
  };

  if (view.name === 'builder') {
    return <TeacherBuilder
      assignment={view.id ? store.assignments[view.id] : null}
      defaultFolderId={view.folderId || null}
      students={Object.values(store.users).filter(u => u.role === 'student')}
      folders={folders}
      onCreateFolder={createFolder}
      onCancel={() => setView({ name: 'list' })}
      onSave={(asn) => {
        update(s => ({ ...s, assignments: { ...s.assignments, [asn.id]: asn } }));
        setView({ name: 'list' });
      }}
    />;
  }

  if (view.name === 'review') {
    return <TeacherReview
      assignment={store.assignments[view.id]}
      users={store.users}
      onClose={() => setView({ name: 'list' })}
      onUpdateSubmission={(sid, sub) => {
        update(s => {
          const asn = { ...s.assignments[view.id] };
          asn.submissions = { ...asn.submissions, [sid]: sub };
          return { ...s, assignments: { ...s.assignments, [view.id]: asn } };
        });
      }}
    />;
  }

  return <TeacherList
    assignments={myAssignments}
    folders={folders}
    onNew={(folderId) => setView({ name: 'builder', folderId: folderId || null })}
    onEdit={(id) => setView({ name: 'builder', id })}
    onReview={(id) => setView({ name: 'review', id })}
    onDuplicate={duplicateAssignment}
    onMove={moveAssignment}
    onCreateFolder={createFolder}
    onRenameFolder={renameFolder}
    onDeleteFolder={deleteFolder}
    onDelete={(id) => {
      if (!confirm('Delete this assignment?')) return;
      update(s => {
        const next = { ...s.assignments };
        delete next[id];
        return { ...s, assignments: next };
      });
    }}
  />;
};

// ─── Teacher list view ──────────────────────────────────────────
const TeacherList = ({
  assignments, folders = [],
  onNew, onEdit, onReview, onDuplicate, onDelete,
  onMove, onCreateFolder, onRenameFolder, onDeleteFolder,
}) => {
  const toast = useToast();
  const [tab, setTab] = React.useState('all');
  const [folderId, setFolderId] = React.useState('all'); // 'all' | 'unfiled' | <folder id>
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameValue, setRenameValue] = React.useState('');

  // Counts (computed across all assignments — independent of folder/tab filters)
  const counts = {
    all: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    marking: assignments.filter(a =>
      a.status === 'active' &&
      Object.values(a.submissions).some(s => s.status === 'submitted')
    ).length,
    draft: assignments.filter(a => a.status === 'draft').length,
    closed: assignments.filter(a => a.status === 'closed').length,
  };

  const folderCount = (fid) => {
    if (fid === 'all') return assignments.length;
    if (fid === 'unfiled') return assignments.filter(a => !a.folderId).length;
    return assignments.filter(a => a.folderId === fid).length;
  };

  const inFolder = assignments.filter(a => {
    if (folderId === 'all') return true;
    if (folderId === 'unfiled') return !a.folderId;
    return a.folderId === folderId;
  });

  const filtered = inFolder.filter(a => {
    if (tab === 'all') return true;
    if (tab === 'active') return a.status === 'active';
    if (tab === 'draft') return a.status === 'draft';
    if (tab === 'closed') return a.status === 'closed';
    if (tab === 'marking') return a.status === 'active' && Object.values(a.submissions).some(s => s.status === 'submitted');
    return true;
  });

  const totalAssigned = assignments.reduce((s, a) => s + a.studentIds.length, 0);
  const totalSubmitted = assignments.reduce((s, a) => s + Object.values(a.submissions).length, 0);
  const submissionRate = totalAssigned ? Math.round(totalSubmitted / totalAssigned * 100) : 0;

  const activeFolder = folders.find(f => f.id === folderId);
  const folderLabel = folderId === 'all' ? 'All assignments'
                    : folderId === 'unfiled' ? 'Unfiled'
                    : (activeFolder?.name || 'Folder');

  const tryCreateFolder = () => {
    const f = onCreateFolder && onCreateFolder(newFolderName);
    if (f) {
      setNewFolderName('');
      setCreatingFolder(false);
      setFolderId(f.id);
      toast(`Folder "${f.name}" created`, 'success');
    } else {
      toast('Enter a folder name', 'danger');
    }
  };

  const tryRename = () => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    onRenameFolder && onRenameFolder(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28, gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>Homework</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>
            {counts.active} active · {counts.marking} awaiting marking
          </p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <Btn variant="brand" icon={<Ico name="plus" size={14} color="#fff" />}
            onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
            New assignment
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active', value: counts.active, icon: 'flame', tone: 'brand' },
          { label: 'Awaiting marking', value: counts.marking, icon: 'clock', tone: 'amber' },
          { label: 'Drafts', value: counts.draft, icon: 'pencil', tone: 'default' },
          { label: 'Submission rate', value: `${submissionRate}%`, icon: 'sparkle', tone: 'success' },
        ].map(s => {
          const tones = {
            brand: { bg: C.brandSoft, fg: C.brand },
            amber: { bg: C.amberBg, fg: C.amber },
            success: { bg: C.successBg, fg: C.success },
            default: { bg: C.surface, fg: C.muted },
          };
          const t = tones[s.tone];
          return (
            <Card key={s.label} style={{ padding: 18 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, color: t.fg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ico name={s.icon} size={15} color={t.fg} />
                </span>
              </div>
              <div style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, color: C.text }}>{s.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Two-column: folder rail + main */}
      <div style={{ display:'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems:'flex-start' }}>
        {/* Folder rail */}
        <Card style={{ padding: 12, position:'sticky', top: 20 }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'4px 6px 8px', borderBottom:`1px solid ${C.border}`, marginBottom: 8,
          }}>
            <span style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: C.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>Folders</span>
            <button onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}
              title="New folder"
              style={{
                width: 22, height: 22, borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Ico name="plus" size={13} color={C.muted} />
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap: 2 }}>
            <FolderRailItem
              icon="layers" label="All assignments" count={folderCount('all')}
              active={folderId === 'all'} onClick={() => setFolderId('all')} />
            <FolderRailItem
              icon="inbox" label="Unfiled" count={folderCount('unfiled')}
              active={folderId === 'unfiled'} onClick={() => setFolderId('unfiled')} />

            {folders.length > 0 && (
              <div style={{ height: 1, background: C.border, margin: '6px 4px' }} />
            )}

            {folders.map(f => (
              <FolderRailItem
                key={f.id}
                color={f.color}
                label={f.name}
                count={folderCount(f.id)}
                active={folderId === f.id}
                onClick={() => setFolderId(f.id)}
                renaming={renamingId === f.id}
                renameValue={renameValue}
                onRenameValue={setRenameValue}
                onSubmitRename={tryRename}
                onCancelRename={() => { setRenamingId(null); setRenameValue(''); }}
                onStartRename={() => { setRenamingId(f.id); setRenameValue(f.name); }}
                onDelete={() => {
                  const n = folderCount(f.id);
                  const msg = n > 0
                    ? `Delete "${f.name}"? ${n} assignment${n === 1 ? '' : 's'} will become unfiled.`
                    : `Delete "${f.name}"?`;
                  if (!confirm(msg)) return;
                  onDeleteFolder && onDeleteFolder(f.id);
                  if (folderId === f.id) setFolderId('all');
                }}
              />
            ))}

            {creatingFolder && (
              <div style={{ display:'flex', gap: 4, padding: '6px 4px', alignItems:'center' }}>
                <Input value={newFolderName} onChange={setNewFolderName} placeholder="Folder name" autoFocus />
                <button onClick={tryCreateFolder} title="Create" style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.brand}`,
                  background: C.brand, color:'#fff', cursor:'pointer', flexShrink: 0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Ico name="check" size={13} color="#fff" /></button>
                <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} title="Cancel" style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
                  background: C.bg, cursor:'pointer', flexShrink: 0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Ico name="x" size={13} color={C.muted} /></button>
              </div>
            )}
          </div>
        </Card>

        {/* Main panel */}
        <div>
          {/* Tabs + folder header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16, gap: 12, flexWrap:'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700, color: C.text }}>{folderLabel}</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>
                {filtered.length} assignment{filtered.length === 1 ? '' : 's'}
              </div>
            </div>

            <div style={{ display:'flex', gap: 4, padding: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              {[
                ['all', 'All', inFolder.length],
                ['active', 'Active', inFolder.filter(a => a.status === 'active').length],
                ['marking', 'Marking', inFolder.filter(a => a.status === 'active' && Object.values(a.submissions).some(s => s.status === 'submitted')).length],
                ['draft', 'Draft', inFolder.filter(a => a.status === 'draft').length],
                ['closed', 'Closed', inFolder.filter(a => a.status === 'closed').length],
              ].map(([id, lab, n]) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)} style={{
                    padding: '7px 14px', border: 'none', cursor:'pointer',
                    borderRadius: 7, background: on ? C.bg : 'transparent',
                    boxShadow: on ? C.shadow : 'none',
                    fontFamily: F.body, fontSize: 13, fontWeight: on ? 600 : 500,
                    color: on ? C.text : C.muted, transition: T,
                    display:'inline-flex', alignItems:'center', gap: 6,
                  }}>
                    {lab}
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 999,
                      background: on ? C.brandSoft : C.surface2,
                      color: on ? C.brand : C.muted,
                    }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <Card style={{ padding: '60px 20px', textAlign:'center' }}>
              <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                {folderId === 'all' ? 'No assignments yet' : `Nothing in ${folderLabel}`}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                {folderId === 'all' ? 'Create one to get started.' : 'Create one or move existing assignments here.'}
              </div>
              <Btn variant="brand" small icon={<Ico name="plus" size={13} color="#fff" />}
                onClick={() => onNew(folderId !== 'all' && folderId !== 'unfiled' ? folderId : null)}>
                New assignment
              </Btn>
            </Card>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {filtered.map(a => (
                <TeacherListCard key={a.id} a={a}
                  folders={folders}
                  onEdit={onEdit} onReview={onReview} onDelete={onDelete}
                  onDuplicate={onDuplicate} onMove={onMove} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FolderRailItem = ({
  icon, color, label, count, active, onClick,
  onStartRename, onDelete,
  renaming, renameValue, onRenameValue, onSubmitRename, onCancelRename,
}) => {
  const [hov, setHov] = React.useState(false);

  if (renaming) {
    return (
      <div style={{ display:'flex', gap: 4, padding: '6px 4px', alignItems:'center' }}>
        <Input value={renameValue} onChange={onRenameValue} autoFocus />
        <button onClick={onSubmitRename} title="Save" style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.brand}`,
          background: C.brand, cursor:'pointer', flexShrink: 0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><Ico name="check" size={13} color="#fff" /></button>
        <button onClick={onCancelRename} title="Cancel" style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
          background: C.bg, cursor:'pointer', flexShrink: 0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><Ico name="x" size={13} color={C.muted} /></button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap: 8,
        padding: '6px 8px', borderRadius: 6,
        background: active ? C.brandSoft : (hov ? C.surface : 'transparent'),
        transition: T, cursor:'pointer',
      }}
    >
      <button onClick={onClick} style={{
        flex: 1, display:'flex', alignItems:'center', gap: 8,
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0, fontFamily: F.body, fontSize: 13, fontWeight: active ? 600 : 500,
        color: active ? C.brand : C.sub, textAlign:'left', minWidth: 0,
      }}>
        {color
          ? <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          : <Ico name={icon} size={14} color={active ? C.brand : C.muted} />}
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <span style={{
          fontFamily: F.mono, fontSize: 11, color: active ? C.brand : C.faint,
          padding: '0 6px', borderRadius: 999,
          background: active ? C.bg : 'transparent',
        }}>{count}</span>
      </button>

      {(onStartRename || onDelete) && (
        <div style={{ display:'flex', gap: 2, opacity: hov ? 1 : 0, transition: T, pointerEvents: hov ? 'auto' : 'none' }}>
          {onStartRename && (
            <button onClick={onStartRename} title="Rename" style={{
              width: 22, height: 22, borderRadius: 5, border: 'none',
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}><Ico name="edit" size={11} color={C.muted} /></button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Delete folder" style={{
              width: 22, height: 22, borderRadius: 5, border: 'none',
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}><Ico name="trash" size={11} color={C.danger} /></button>
          )}
        </div>
      )}
    </div>
  );
};

const TeacherListCard = ({ a, folders = [], onEdit, onReview, onDelete, onDuplicate, onMove }) => {
  const subc = subColor(a.subject);
  const submitted = Object.values(a.submissions).length;
  const approved = Object.values(a.submissions).filter(s => s.status === 'approved').length;
  const awaitingMark = Object.values(a.submissions).filter(s => s.status === 'submitted').length;
  const total = a.studentIds.length;
  const pct = total ? (submitted / total) * 100 : 0;
  const dDays = daysUntil(a.dueAt);
  const folder = a.folderId ? folders.find(f => f.id === a.folderId) : null;

  let statusPill;
  if (a.status === 'draft')      statusPill = <Pill tone="default" icon={<Ico name="pencil" size={10} />}>Draft</Pill>;
  else if (a.status === 'closed') statusPill = <Pill tone="default">Closed</Pill>;
  else if (awaitingMark > 0)      statusPill = <Pill tone="amber" icon={<Ico name="clock" size={10} />}>{awaitingMark} to mark</Pill>;
  else if (submitted === total)   statusPill = <Pill tone="success" icon={<Ico name="check" size={10} />}>All in</Pill>;
  else                            statusPill = <Pill tone="brand">Active</Pill>;

  return (
    <Card hoverable style={{ overflow:'hidden' }}>
      <div style={{ height: 4, background: subc.color }} />
      <div style={{ padding: 18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom: 6, flexWrap:'wrap' }}>
              <Pill tone="default" icon={<span style={{ width:6, height:6, background:subc.color, borderRadius:'50%' }} />}>{a.subject}</Pill>
              {folder && (
                <Pill tone="default" icon={<span style={{ width:6, height:6, background: folder.color || C.brand, borderRadius:2 }} />}>
                  {folder.name}
                </Pill>
              )}
              {statusPill}
            </div>
            <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{a.title}</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 4 }}>
              {a.questions.length} questions · {totalPoints(a)} pts
              {a.dueAt && <> · Due {fmtDate(a.dueAt)}{dDays >= 0 && a.status === 'active' ? ` (${dDays}d)` : ''}</>}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color: C.muted, marginBottom: 5, fontWeight:500 }}>
            <span>Submissions</span>
            <span>{submitted} / {total} {approved > 0 && <span style={{ color: C.success, marginLeft: 6 }}>· {approved} approved</span>}</span>
          </div>
          <div style={{ height: 6, background: C.surface2, borderRadius: 999, overflow:'hidden' }}>
            <div style={{ height:'100%', width: `${pct}%`, background: subc.color, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap: 6, alignItems:'center', flexWrap:'wrap' }}>
          <Btn variant="ghost" small icon={<Ico name="edit" size={13} />} onClick={() => onEdit(a.id)}>Edit</Btn>
          <Btn variant="soft" small icon={<Ico name="eye" size={13} />} onClick={() => onReview(a.id)}>Review</Btn>
          {onDuplicate && (
            <Btn variant="ghost" small icon={<Ico name="layers" size={13} />} onClick={() => onDuplicate(a.id)}>Duplicate</Btn>
          )}
          <div style={{ flex:1 }} />
          {onMove && (
            <select
              value={a.folderId || ''}
              onChange={e => onMove(a.id, e.target.value || null)}
              title="Move to folder"
              style={{
                padding: '5px 8px', borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.bg, color: C.muted,
                fontFamily: F.body, fontSize: 12, cursor:'pointer', maxWidth: 130,
              }}
            >
              <option value="">Unfiled</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <Btn variant="ghost" small icon={<Ico name="trash" size={13} color={C.danger} />} onClick={() => onDelete(a.id)} />
        </div>
      </div>
    </Card>
  );
};

// ─── Teacher builder ───────────────────────────────────────────
const blankAssignment = (teacherId, folderId = null) => ({
  id: 'a_' + Math.random().toString(36).slice(2, 9),
  title: '',
  subject: 'Math',
  folderId,
  teacherId,
  studentIds: [],
  dueAt: '',
  status: 'draft',
  createdAt: new Date().toISOString().slice(0, 10),
  instructions: '',
  questions: [],
  submissions: {},
});

const blankQuestion = (type) => {
  const base = { id: 'q_' + Math.random().toString(36).slice(2, 8), type, prompt: '', points: 2 };
  if (type === 'mcq')     return { ...base, choices: ['', '', '', ''], correctIndex: 0 };
  if (type === 'numeric') return { ...base, answer: 0, tolerance: 0.01 };
  if (type === 'math')    return { ...base, answer: '' };
  return base;
};

const TeacherBuilder = ({ assignment, students, folders = [], defaultFolderId = null, onCreateFolder, onCancel, onSave }) => {
  const toast = useToast();
  const [a, setA] = React.useState(() => assignment
    ? JSON.parse(JSON.stringify(assignment))
    : blankAssignment('t_clarke', defaultFolderId));
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');

  const setField = (k, v) => setA(prev => ({ ...prev, [k]: v }));
  const setQ = (id, patch) => setA(prev => ({
    ...prev,
    questions: prev.questions.map(q => q.id === id ? { ...q, ...patch } : q),
  }));
  const addQ = (type) => setA(prev => ({ ...prev, questions: [...prev.questions, blankQuestion(type)] }));
  const delQ = (id) => setA(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  const moveQ = (id, dir) => setA(prev => {
    const idx = prev.questions.findIndex(q => q.id === id);
    if (idx < 0) return prev;
    const j = idx + dir;
    if (j < 0 || j >= prev.questions.length) return prev;
    const arr = [...prev.questions];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    return { ...prev, questions: arr };
  });
  const importQuestions = (qs) => setA(prev => ({ ...prev, questions: [...prev.questions, ...qs] }));

  const errors = [];
  if (!a.title.trim()) errors.push('Title is required');
  if (a.questions.length === 0) errors.push('Add at least one question');
  a.questions.forEach((q, i) => {
    if (!q.prompt.trim()) errors.push(`Q${i + 1}: prompt required`);
  });

  const trySave = (status) => {
    if (errors.length > 0) {
      toast(errors[0], 'danger');
      return;
    }
    onSave({ ...a, status });
  };

  const toggleStudent = (sid) => setA(prev => ({
    ...prev,
    studentIds: prev.studentIds.includes(sid)
      ? prev.studentIds.filter(x => x !== sid)
      : [...prev.studentIds, sid],
  }));

  return (
    <div style={{ padding: '24px 32px 80px', fontFamily: F.body, color: C.text }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, gap: 12 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onCancel}>Back</Btn>
          <span style={{ fontFamily: F.head, fontSize: 20, fontWeight: 700 }}>
            {assignment ? 'Edit assignment' : 'New assignment'}
          </span>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <Btn variant="soft" small icon={<Ico name="save" size={13} />} onClick={() => trySave('draft')}>Save draft</Btn>
          <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />} onClick={() => trySave('active')}>Publish</Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          {/* Settings */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Assignment details</div>
            <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
              <div>
                <Label htmlFor="t-title">Title</Label>
                <Input value={a.title} onChange={(v) => setField('title', v)} placeholder="e.g. Algebra: Simultaneous Equations" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
                <div>
                  <Label>Subject</Label>
                  <select value={a.subject} onChange={e => setField('subject', e.target.value)} style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontSize: 13, fontFamily: F.body, cursor:'pointer',
                  }}>
                    {Object.keys(SUBJECTS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input type="date" value={a.dueAt} onChange={(v) => setField('dueAt', v)} />
                </div>
              </div>

              {/* Folder picker */}
              <div>
                <Label>Folder <span style={{ color: C.faint, fontWeight: 400 }}>(save here for later reuse)</span></Label>
                {newFolderOpen ? (
                  <div style={{ display:'flex', gap:8 }}>
                    <Input value={newFolderName} onChange={setNewFolderName} placeholder="New folder name" autoFocus />
                    <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />}
                      onClick={() => {
                        const f = onCreateFolder && onCreateFolder(newFolderName);
                        if (f) {
                          setField('folderId', f.id);
                          setNewFolderName('');
                          setNewFolderOpen(false);
                          toast(`Folder "${f.name}" created`, 'success');
                        } else {
                          toast('Enter a folder name', 'danger');
                        }
                      }}>Create</Btn>
                    <Btn variant="soft" small onClick={() => { setNewFolderOpen(false); setNewFolderName(''); }}>Cancel</Btn>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <select
                      value={a.folderId || ''}
                      onChange={e => {
                        if (e.target.value === '__new__') {
                          setNewFolderOpen(true);
                        } else {
                          setField('folderId', e.target.value || null);
                        }
                      }}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 8,
                        border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                        fontSize: 13, fontFamily: F.body, cursor:'pointer',
                      }}>
                      <option value="">Unfiled</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      <option value="__new__">+ New folder…</option>
                    </select>
                    {a.folderId && folders.find(f => f.id === a.folderId) && (
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:6,
                        padding:'0 12px', borderRadius:8,
                        border:`1px solid ${C.border}`, background:C.surface,
                        fontFamily:F.body, fontSize:12, color:C.sub,
                      }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background: folders.find(f => f.id === a.folderId).color || C.brand }} />
                        {folders.find(f => f.id === a.folderId).name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Instructions <span style={{ color: C.faint, fontWeight: 400 }}>(optional)</span></Label>
                <Input multiline rows={2} value={a.instructions} onChange={(v) => setField('instructions', v)} placeholder="Tell students how to approach this assignment" />
              </div>
              <div>
                <Label>Assigned students</Label>
                <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
                  {students.map(s => {
                    const on = a.studentIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleStudent(s.id)} style={{
                        padding: '5px 10px', borderRadius: 999,
                        border: `1px solid ${on ? C.brand : C.border}`,
                        background: on ? C.brandSoft : C.bg,
                        color: on ? C.brand : C.sub,
                        fontFamily: F.body, fontSize: 12, fontWeight: 500,
                        cursor:'pointer', transition: T,
                      }}>{on ? '✓ ' : ''}{s.name}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Questions */}
          <Card style={{ padding: 20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text }}>
                Questions <span style={{ color: C.muted, fontWeight: 500 }}>({a.questions.length})</span>
              </div>
              <Btn variant="soft" small icon={<Ico name="upload" size={13} />} onClick={() => setPdfOpen(true)}>Import from PDF</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
              {a.questions.map((q, i) => (
                <QuestionEditor key={q.id} q={q} index={i}
                  onChange={(patch) => setQ(q.id, patch)}
                  onDelete={() => delQ(q.id)}
                  onUp={() => moveQ(q.id, -1)}
                  onDown={() => moveQ(q.id, 1)} />
              ))}
              {a.questions.length === 0 && (
                <div style={{ padding: '24px 0', textAlign:'center', color: C.muted, fontSize: 13 }}>
                  No questions yet — add one below.
                </div>
              )}
            </div>

            {/* Add grid */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom: 10 }}>
                Add question
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8 }}>
                {QTYPES.map(t => (
                  <button key={t.type} onClick={() => addQ(t.type)} style={{
                    padding: '12px 14px', borderRadius: 9,
                    border: `1px solid ${C.border}`, background: C.bg,
                    cursor:'pointer', textAlign:'left', transition: T,
                    display:'flex', flexDirection:'column', gap: 3,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.borderD; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}>
                    <span style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius:'50%',
                        background: t.marker === 'auto' ? C.brand : C.amber,
                      }} />
                      <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>{t.label}</span>
                    </span>
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 14 }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — outline */}
        <div style={{ display:'flex', flexDirection:'column', gap: 12, position:'sticky', top: 20, alignSelf:'start' }}>
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Outline</div>
            {a.questions.length === 0
              ? <div style={{ fontSize: 12, color: C.muted }}>No questions yet</div>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                  {a.questions.map((q, i) => {
                    const m = qtypeMeta(q.type);
                    return (
                      <div key={q.id} style={{
                        display:'flex', alignItems:'center', gap: 8,
                        padding: '6px 8px', borderRadius: 6, background: C.surface,
                      }}>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, width: 18 }}>Q{i + 1}</span>
                        <span style={{
                          width: 6, height: 6, borderRadius:'50%',
                          background: m.marker === 'auto' ? C.brand : C.amber,
                        }} />
                        <span style={{ fontFamily: F.body, fontSize: 12, color: C.sub, flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {q.prompt || <em style={{ color: C.faint }}>Untitled</em>}
                        </span>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.points}p</span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Marks</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Total points</span>
              <span style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, color: C.text }}>{totalPoints(a)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.brand }} />
                <span style={{ fontSize: 12, color: C.sub, flex: 1 }}>Auto-marked</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.text }}>{autoTotal(a)}p</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius:'50%', background: C.amber }} />
                <span style={{ fontSize: 12, color: C.sub, flex: 1 }}>Teacher-marked</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.text }}>{manualTotal(a)}p</span>
              </div>
            </div>
            {/* split bar */}
            {totalPoints(a) > 0 && (
              <div style={{ height: 6, marginTop: 14, borderRadius: 999, overflow:'hidden', display:'flex' }}>
                <div style={{ flex: autoTotal(a), background: C.brand }} />
                <div style={{ flex: manualTotal(a), background: C.amber }} />
              </div>
            )}
          </Card>

          {errors.length > 0 && (
            <Card style={{ padding: 14, background: C.amberBg, borderColor: C.amberBorder }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.amber, marginBottom: 6, display:'flex', alignItems:'center', gap: 6 }}>
                <Ico name="info" size={12} color={C.amber} /> {errors.length} issue{errors.length > 1 ? 's' : ''} to fix
              </div>
              <ul style={{ margin: 0, padding:'0 0 0 18px', fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
                {errors.slice(0, 4).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <PdfImportModal open={pdfOpen} onClose={() => setPdfOpen(false)} onImport={importQuestions} />
    </div>
  );
};

const QuestionEditor = ({ q, index, onChange, onDelete, onUp, onDown }) => {
  const m = qtypeMeta(q.type);
  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 10, overflow:'hidden',
      background: C.bg,
    }}>
      <div style={{
        padding: '10px 14px', background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6,
          background: C.bg, border: `1px solid ${C.border}`,
          fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.muted,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{index + 1}</span>
        <Pill tone={m.marker === 'auto' ? 'brand' : 'amber'}>{m.label}</Pill>
        <span style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>{m.desc}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onUp} title="Move up" style={iconBtnStyle()}><Ico name="chevD" size={13} color={C.muted} /></button>
        <button onClick={onDown} title="Move down" style={iconBtnStyle()}><Ico name="chevD" size={13} color={C.muted} /></button>
        <button onClick={onDelete} title="Delete" style={iconBtnStyle()}><Ico name="trash" size={13} color={C.danger} /></button>
      </div>

      <div style={{ padding: 14, display:'flex', flexDirection:'column', gap: 12 }}>
        <div>
          <Label>Prompt</Label>
          <Input multiline rows={2} value={q.prompt} onChange={(v) => onChange({ prompt: v })} placeholder="What are you asking?" />
        </div>

        {q.type === 'mcq' && (
          <div>
            <Label>Choices <span style={{ color:C.faint, fontWeight:400 }}>(select correct)</span></Label>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {q.choices.map((c, i) => (
                <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                  <button onClick={() => onChange({ correctIndex: i })} style={{
                    width: 20, height: 20, borderRadius:'50%',
                    border:`2px solid ${q.correctIndex === i ? C.success : C.borderD}`,
                    background: q.correctIndex === i ? C.success : C.bg,
                    cursor:'pointer', flexShrink: 0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {q.correctIndex === i && <Ico name="check" size={10} color="#fff" />}
                  </button>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, width: 14 }}>{String.fromCharCode(65 + i)}</span>
                  <Input value={c} onChange={(v) => {
                    const arr = [...q.choices]; arr[i] = v; onChange({ choices: arr });
                  }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  {q.choices.length > 2 && (
                    <button onClick={() => {
                      const arr = q.choices.filter((_, j) => j !== i);
                      const ci = q.correctIndex >= arr.length ? arr.length - 1 : q.correctIndex;
                      onChange({ choices: arr, correctIndex: ci });
                    }} style={iconBtnStyle()}><Ico name="x" size={12} color={C.muted} /></button>
                  )}
                </div>
              ))}
              {q.choices.length < 6 && (
                <button onClick={() => onChange({ choices: [...q.choices, ''] })} style={{
                  marginLeft: 28, padding: '4px 8px', border: `1px dashed ${C.border}`,
                  borderRadius: 6, background: 'transparent', cursor:'pointer',
                  fontFamily: F.body, fontSize: 12, color: C.muted, width: 'fit-content',
                }}>+ Add choice</button>
              )}
            </div>
          </div>
        )}

        {q.type === 'numeric' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
            <div>
              <Label>Correct answer</Label>
              <Input type="number" value={q.answer} onChange={(v) => onChange({ answer: parseFloat(v) || 0 })} />
            </div>
            <div>
              <Label>Tolerance ±</Label>
              <Input type="number" value={q.tolerance} onChange={(v) => onChange({ tolerance: parseFloat(v) || 0 })} />
            </div>
          </div>
        )}

        {q.type === 'math' && (
          <div>
            <Label>Correct answer (LaTeX)</Label>
            <MathEditor value={q.answer || ''} onChange={(v) => onChange({ answer: v })} placeholder="e.g. x=3" />
            <div style={{ marginTop: 6, fontSize: 11, color: C.muted, fontFamily: F.mono }}>
              raw: {q.answer || <span style={{ color: C.faint }}>—</span>}
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap: 12 }}>
          <div>
            <Label>Points</Label>
            <Input type="number" value={q.points} onChange={(v) => onChange({ points: parseInt(v, 10) || 0 })} />
          </div>
          <div>
            <Label>Hint <span style={{ color: C.faint, fontWeight: 400 }}>(optional)</span></Label>
            <Input value={q.hint || ''} onChange={(v) => onChange({ hint: v })} placeholder="Shown to students if they ask" />
          </div>
        </div>
      </div>
    </div>
  );
};

const iconBtnStyle = () => ({
  width: 26, height: 26, borderRadius: 6,
  border: `1px solid ${C.border}`, background: C.bg,
  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  transition: T,
});

// ─── Teacher review queue ──────────────────────────────────────
const TeacherReview = ({ assignment, users, onClose, onUpdateSubmission }) => {
  const toast = useToast();
  const subStudents = assignment.studentIds.filter(sid => assignment.submissions[sid]);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const activeSid = subStudents[activeIdx];
  const sub = activeSid ? assignment.submissions[activeSid] : null;
  const student = activeSid ? users[activeSid] : null;

  const setMark = (qid, mark) => {
    const max = assignment.questions.find(q => q.id === qid)?.points || 0;
    let m = parseFloat(mark);
    if (Number.isNaN(m)) m = null;
    else m = Math.max(0, Math.min(max, m));
    onUpdateSubmission(activeSid, { ...sub, marks: { ...sub.marks, [qid]: m } });
  };
  const setFb = (qid, text) => onUpdateSubmission(activeSid, { ...sub, feedback: { ...sub.feedback, [qid]: text } });

  const approve = () => {
    if (!fullyMarked(assignment, sub)) {
      toast('Mark every question before approving', 'danger');
      return;
    }
    onUpdateSubmission(activeSid, { ...sub, status: 'approved', approvedAt: new Date().toISOString() });
    toast(`${student.name} approved`, 'success');
    if (activeIdx < subStudents.length - 1) {
      setTimeout(() => setActiveIdx(activeIdx + 1), 200);
    }
  };

  if (subStudents.length === 0) {
    return (
      <div style={{ padding: 32, fontFamily: F.body }}>
        <div style={{ marginBottom: 20 }}>
          <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back</Btn>
        </div>
        <Card style={{ padding: 60, textAlign:'center' }}>
          <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No submissions yet</div>
          <div style={{ fontSize: 13, color: C.muted }}>Students haven't submitted {assignment.title} yet.</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily: F.body }}>
      {/* Header */}
      <div style={{
        padding: '16px 32px', borderBottom: `1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap: 12, background: C.bg,
      }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700, color: C.text }}>Review · {assignment.title}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{subStudents.length} submission{subStudents.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ display:'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 240, borderRight: `1px solid ${C.border}`, background: C.surface, overflow:'auto' }}>
          {subStudents.map((sid, i) => {
            const s = users[sid];
            const sb = assignment.submissions[sid];
            const on = i === activeIdx;
            const score = submissionScore(assignment, sb);
            const total = totalPoints(assignment);
            const done = fullyMarked(assignment, sb);
            const approved = sb.status === 'approved';
            return (
              <button key={sid} onClick={() => setActiveIdx(i)} style={{
                width: '100%', padding: '12px 14px', border: 'none',
                borderBottom: `1px solid ${C.border}`,
                background: on ? C.bg : 'transparent',
                cursor:'pointer', textAlign:'left', transition: T,
                display:'flex', flexDirection:'column', gap: 4,
                borderLeft: on ? `3px solid ${C.brand}` : '3px solid transparent',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Avatar name={s.name} />
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</span>
                  {approved && <Ico name="check" size={13} color={C.success} />}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color: C.muted, marginLeft: 32 }}>
                  <span>{score}/{total} pts</span>
                  <span style={{ color: approved ? C.success : done ? C.brand : C.amber, fontWeight:600 }}>
                    {approved ? 'Approved' : done ? 'Ready' : 'Marking'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflow:'auto', padding: '24px 32px' }}>
          {/* Student header */}
          <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 20 }}>
            <Avatar name={student.name} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 700 }}>{student.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                Submitted {fmtDate(sub.submittedAt)} · {submissionScore(assignment, sub)} / {totalPoints(assignment)} pts
              </div>
            </div>
            <div style={{ display:'flex', gap: 8 }}>
              <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />}
                onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0}>Prev</Btn>
              <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />} onClick={approve}>
                {sub.status === 'approved' ? 'Re-approve' : 'Approve'}
              </Btn>
              <Btn variant="soft" small icon={<Ico name="arrowR" size={13} />}
                onClick={() => setActiveIdx(Math.min(subStudents.length - 1, activeIdx + 1))}
                disabled={activeIdx === subStudents.length - 1}>Next</Btn>
            </div>
          </div>

          {/* Questions */}
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            {assignment.questions.map((q, i) => {
              const a = sub.answers?.[q.id];
              const m = sub.marks?.[q.id];
              const fb = sub.feedback?.[q.id] || '';
              const isAutoQ = isAuto(q.type);
              const correct = isAutoQ && typeof m === 'number' && m === q.points;
              const wrong   = isAutoQ && typeof m === 'number' && m === 0;
              const pillTone = isAutoQ ? 'brand' : 'amber';
              return (
                <Card key={q.id} style={{ padding: 18 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, background: C.surface,
                      fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.muted,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display:'flex', gap: 6, alignItems:'center', marginBottom: 6 }}>
                        <Pill tone={pillTone}>{qtypeMeta(q.type).label}</Pill>
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.points} pt</span>
                        {isAutoQ && (correct
                          ? <Pill tone="success" icon={<Ico name="check" size={10} />}>Correct</Pill>
                          : wrong
                            ? <Pill tone="danger" icon={<Ico name="x" size={10} />}>Incorrect</Pill>
                            : null)}
                      </div>
                      <div style={{ fontFamily: F.body, fontSize: 14, color: C.text, lineHeight: 1.5 }}>{q.prompt}</div>
                    </div>
                  </div>

                  <div style={{ marginLeft: 38, paddingLeft: 14, borderLeft: `2px solid ${C.surface2}` }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 6 }}>
                        Student answer
                      </div>
                      <QuestionAnswerDisplay question={q} answer={a} />
                      {isAutoQ && q.type === 'mcq' && (
                        <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
                          Correct: <strong style={{ color: C.success }}>{String.fromCharCode(65 + q.correctIndex)} · {q.choices[q.correctIndex]}</strong>
                        </div>
                      )}
                      {isAutoQ && q.type === 'numeric' && (
                        <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
                          Correct: <strong style={{ color: C.success }}>{q.answer}</strong> (±{q.tolerance})
                        </div>
                      )}
                      {isAutoQ && q.type === 'math' && (
                        <div style={{ marginTop: 6, fontSize: 12, color: C.muted, fontFamily: F.mono }}>
                          Correct: <strong style={{ color: C.success }}>{q.answer}</strong>
                        </div>
                      )}
                    </div>

                    {/* Marking */}
                    <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
                      <div style={{ width: 120 }}>
                        <Label>Marks</Label>
                        {isAutoQ ? (
                          <div style={{
                            padding: '9px 12px', borderRadius: 8,
                            background: C.surface, border: `1px solid ${C.border}`,
                            fontFamily: F.mono, fontSize: 14, fontWeight: 600, color: C.text,
                          }}>
                            {typeof m === 'number' ? m : '—'} / {q.points}
                          </div>
                        ) : (
                          <Input type="number" value={m ?? ''} onChange={(v) => setMark(q.id, v)}
                            placeholder="0" suffix={`/ ${q.points}`} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Label>Feedback {!isAutoQ && <span style={{ color: C.faint, fontWeight: 400 }}>(visible to student)</span>}</Label>
                        <Input multiline rows={2} value={fb} onChange={(v) => setFb(q.id, v)}
                          placeholder={isAutoQ ? 'Optional comment…' : 'Tell the student what they did well, and what to improve.'} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ name = '', size = 28 }) => {
  const initials = (name || '').split(' ').slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  const palette = ['#818CF8','#6EE7B7','#FCD34D','#F9A8D4','#93C5FD','#A5B4FC'];
  const idx = (name.charCodeAt(0) || 0) % palette.length;
  return (
    <span style={{
      width: size, height: size, borderRadius:'50%', background: palette[idx],
      color: '#fff', fontFamily: F.head, fontSize: size * 0.42, fontWeight: 700,
      display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
      letterSpacing: '.02em',
    }}>{initials || '?'}</span>
  );
};

// ════════════════════════════════════════════════════════════════
// STUDENT MODULE
// ════════════════════════════════════════════════════════════════
const StudentHomework = () => {
  const [store, update] = useStore();
  const me = store.currentUser;
  const [view, setView] = React.useState({ name: 'list' });

  const myAssignments = Object.values(store.assignments).filter(a =>
    a.studentIds.includes(me.id) && a.status !== 'draft'
  );

  if (view.name === 'attempt') {
    return <StudentAttempt
      assignment={store.assignments[view.id]}
      me={me}
      draft={store.drafts[view.id] || {}}
      onUpdateDraft={(d) => update(s => ({ ...s, drafts: { ...s.drafts, [view.id]: d } }))}
      onCancel={() => setView({ name: 'list' })}
      onSubmit={(answers) => {
        const asn = store.assignments[view.id];
        const marks = {};
        const feedback = {};
        asn.questions.forEach(q => {
          marks[q.id] = isAuto(q.type) ? autoMark(q, answers[q.id]) : null;
          feedback[q.id] = '';
        });
        const sub = {
          answers,
          submittedAt: new Date().toISOString(),
          status: 'submitted',
          marks,
          feedback,
        };
        update(s => {
          const next = { ...s };
          next.assignments = { ...next.assignments };
          next.assignments[view.id] = { ...next.assignments[view.id] };
          next.assignments[view.id].submissions = { ...next.assignments[view.id].submissions, [me.id]: sub };
          next.drafts = { ...next.drafts };
          delete next.drafts[view.id];
          return next;
        });
        setView({ name: 'results', id: view.id });
      }}
    />;
  }

  if (view.name === 'results') {
    return <StudentResults
      assignment={store.assignments[view.id]}
      me={me}
      onClose={() => setView({ name: 'list' })}
    />;
  }

  return <StudentList
    me={me}
    assignments={myAssignments}
    onOpen={(asn) => {
      const sub = asn.submissions[me.id];
      if (sub) setView({ name: 'results', id: asn.id });
      else setView({ name: 'attempt', id: asn.id });
    }}
  />;
};

// ─── Student list ──────────────────────────────────────────────
const StudentList = ({ me, assignments, onOpen }) => {
  return (
    <div style={{ padding: '32px 32px 64px', fontFamily: F.body, color: C.text }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>My Homework</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} · {assignments.filter(a => !a.submissions[me.id]).length} to do
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card style={{ padding: '60px 20px', textAlign:'center' }}>
          <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 600 }}>You're all caught up!</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>No homework assigned right now.</div>
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {assignments.map(a => <StudentListCard key={a.id} a={a} me={me} onOpen={() => onOpen(a)} />)}
        </div>
      )}
    </div>
  );
};

const StudentListCard = ({ a, me, onOpen }) => {
  const subc = subColor(a.subject);
  const status = submissionStatus(a, me.id);
  const sub = a.submissions[me.id];
  const dDays = daysUntil(a.dueAt);

  let ctaLabel = 'Start';
  let pill = null;
  if (status === 'not_started') {
    pill = dDays >= 0
      ? <Pill tone={dDays <= 1 ? 'danger' : dDays <= 3 ? 'amber' : 'default'} icon={<Ico name="clock" size={10} />}>
          {dDays === 0 ? 'Due today' : dDays < 0 ? 'Overdue' : `${dDays}d left`}
        </Pill>
      : <Pill tone="danger">Overdue</Pill>;
  } else if (status === 'submitted') {
    pill = <Pill tone="info" icon={<Ico name="clock" size={10} />}>Awaiting marking</Pill>;
    ctaLabel = 'View';
  } else {
    pill = <Pill tone="success" icon={<Ico name="check" size={10} />}>Feedback ready</Pill>;
    ctaLabel = 'See feedback';
  }

  const score = sub && status === 'approved' ? submissionScore(a, sub) : null;
  const total = totalPoints(a);

  return (
    <Card hoverable onClick={onOpen} style={{ overflow: 'hidden' }}>
      <div style={{ height: 4, background: subc.color }} />
      <div style={{ padding: 18 }}>
        <div style={{ display:'flex', gap: 6, alignItems:'center', marginBottom: 10 }}>
          <Pill tone="default" icon={<span style={{ width: 6, height: 6, background: subc.color, borderRadius: '50%' }} />}>
            {a.subject}
          </Pill>
          {pill}
        </div>

        <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{a.title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {a.questions.length} questions · {total} pts {a.dueAt && <>· Due {fmtDate(a.dueAt)}</>}
        </div>

        {score != null && (
          <div style={{ marginBottom: 14, padding: 12, background: C.successBg, borderRadius: 8, border: `1px solid ${C.successBorder}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>Final score</span>
              <span style={{ fontFamily: F.head, fontSize: 22, fontWeight: 700, color: C.success }}>{score} / {total}</span>
            </div>
          </div>
        )}

        <Btn variant={status === 'not_started' ? 'brand' : 'soft'} small
          icon={<Ico name={status === 'not_started' ? 'arrowR' : 'eye'} size={13} color={status === 'not_started' ? '#fff' : C.sub} />}
          onClick={onOpen} style={{ width: '100%', justifyContent: 'center' }}>
          {ctaLabel}
        </Btn>
      </div>
    </Card>
  );
};

// ─── Student attempt ───────────────────────────────────────────
const StudentAttempt = ({ assignment, me, draft, onUpdateDraft, onCancel, onSubmit }) => {
  const toast = useToast();
  const [answers, setAnswers] = React.useState(() => draft.answers || {});
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [showHint, setShowHint] = React.useState(false);

  // auto-save draft
  React.useEffect(() => {
    onUpdateDraft({ answers });
  }, [answers]);

  const setAnswer = (qid, v) => setAnswers(a => ({ ...a, [qid]: v }));

  const q = assignment.questions[activeIdx];
  const completed = assignment.questions.filter(qq => {
    const v = answers[qq.id];
    return v !== undefined && v !== null && v !== '';
  }).length;
  const allDone = completed === assignment.questions.length;

  const trySubmit = () => {
    if (!allDone) {
      toast('Answer every question before submitting', 'danger');
      return;
    }
    onSubmit(answers);
  };

  return (
    <div style={{ display:'flex', flexDirection: 'column', height:'100%', fontFamily: F.body }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 32px', borderBottom: `1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap: 12, background: C.bg,
      }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onCancel}>Save & exit</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700 }}>{assignment.title}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{assignment.subject} · auto-saved</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>
          {completed} / {assignment.questions.length} answered
        </span>
        <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />} onClick={trySubmit} disabled={!allDone}>
          Submit
        </Btn>
      </div>

      <div style={{ display:'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 220, borderRight: `1px solid ${C.border}`, background: C.surface, display:'flex', flexDirection:'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform:'uppercase', color: C.muted, letterSpacing:'.06em', marginBottom: 6 }}>
              Progress
            </div>
            <div style={{ height: 6, background: C.surface2, borderRadius: 999, overflow:'hidden' }}>
              <div style={{ width: `${(completed / assignment.questions.length) * 100}%`, height:'100%', background: C.brand, transition: 'width .3s' }} />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {assignment.questions.map((qq, i) => {
              const ans = answers[qq.id];
              const has = ans !== undefined && ans !== null && ans !== '';
              const on = i === activeIdx;
              const m = qtypeMeta(qq.type);
              return (
                <button key={qq.id} onClick={() => { setActiveIdx(i); setShowHint(false); }} style={{
                  width: '100%', padding: '8px 10px', borderRadius: 7,
                  border: 'none', textAlign:'left', cursor:'pointer',
                  background: on ? C.bg : 'transparent',
                  boxShadow: on ? C.shadow : 'none',
                  display:'flex', alignItems:'center', gap: 8, marginBottom: 2,
                  transition: T,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius:'50%',
                    background: has ? C.brand : C.surface2,
                    color: has ? '#fff' : C.muted,
                    fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
                  }}>{has ? <Ico name="check" size={11} color="#fff" /> : (i + 1)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: on ? C.text : C.sub, fontWeight: on ? 600 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {qq.prompt || `Question ${i + 1}`}
                  </span>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: m.marker === 'auto' ? C.brand : C.amber,
                  }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflow:'auto' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px' }}>
            {assignment.instructions && activeIdx === 0 && (
              <div style={{
                padding: '12px 14px', background: C.brandSoft, border:`1px solid ${C.brandBorder}`,
                borderRadius: 8, marginBottom: 20, display:'flex', gap: 10, alignItems:'flex-start',
              }}>
                <Ico name="info" size={14} color={C.brand} />
                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{assignment.instructions}</div>
              </div>
            )}

            <div style={{ marginBottom: 12, display:'flex', alignItems:'center', gap: 8 }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>
                Question {activeIdx + 1} of {assignment.questions.length}
              </span>
              <Pill tone={qtypeMeta(q.type).marker === 'auto' ? 'brand' : 'amber'}>
                {qtypeMeta(q.type).label}
              </Pill>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{q.points} pt</span>
            </div>

            <h2 style={{ fontFamily: F.head, fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.4, margin: '0 0 20px', letterSpacing: '-.2px' }}>
              {q.prompt}
            </h2>

            <div style={{ marginBottom: 20 }}>
              <QuestionAnswerInput question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
            </div>

            {q.hint && (
              <div style={{ marginBottom: 24 }}>
                {showHint ? (
                  <div style={{ padding: '12px 14px', background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, display:'flex', gap: 10 }}>
                    <Ico name="info" size={14} color={C.amber} />
                    <div style={{ flex: 1, fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{q.hint}</div>
                  </div>
                ) : (
                  <Btn variant="ghost" small icon={<Ico name="info" size={13} />} onClick={() => setShowHint(true)}>Show hint</Btn>
                )}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <Btn variant="soft" small icon={<Ico name="arrowL" size={13} />}
                onClick={() => { setActiveIdx(Math.max(0, activeIdx - 1)); setShowHint(false); }}
                disabled={activeIdx === 0}>Previous</Btn>
              {activeIdx < assignment.questions.length - 1 ? (
                <Btn variant="brand" small icon={<Ico name="arrowR" size={13} color="#fff" />}
                  onClick={() => { setActiveIdx(activeIdx + 1); setShowHint(false); }}>Next question</Btn>
              ) : (
                <Btn variant="brand" small icon={<Ico name="check" size={13} color="#fff" />} onClick={trySubmit} disabled={!allDone}>
                  Submit assignment
                </Btn>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Student results ───────────────────────────────────────────
const StudentResults = ({ assignment, me, onClose }) => {
  const sub = assignment.submissions[me.id];
  if (!sub) {
    return (
      <div style={{ padding: 32, fontFamily: F.body }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back</Btn>
        <Card style={{ padding: 60, textAlign:'center', marginTop: 20 }}>
          <div style={{ fontFamily: F.head, fontSize: 16, fontWeight: 600 }}>No submission found</div>
        </Card>
      </div>
    );
  }
  const approved = sub.status === 'approved';
  const score = approved ? submissionScore(assignment, sub) : autoScore(assignment, sub);
  const total = approved ? totalPoints(assignment) : autoTotal(assignment);
  const pct = total ? Math.round((score / total) * 100) : 0;

  const pctTone = pct >= 80 ? 'success' : pct >= 60 ? 'amber' : 'danger';
  const pctColor = pctTone === 'success' ? C.success : pctTone === 'amber' ? C.amber : C.danger;
  const pctBg = pctTone === 'success' ? C.successBg : pctTone === 'amber' ? C.amberBg : C.dangerBg;

  return (
    <div style={{ padding: '24px 32px 64px', fontFamily: F.body, color: C.text }}>
      <div style={{ marginBottom: 20 }}>
        <Btn variant="ghost" small icon={<Ico name="arrowL" size={13} />} onClick={onClose}>Back to homework</Btn>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 8 }}>
        <Pill tone="default" icon={<span style={{ width: 6, height: 6, background: subColor(assignment.subject).color, borderRadius:'50%' }} />}>
          {assignment.subject}
        </Pill>
        {approved
          ? <Pill tone="success" icon={<Ico name="check" size={10} />}>Marked</Pill>
          : <Pill tone="info" icon={<Ico name="clock" size={10} />}>Awaiting teacher marking</Pill>}
      </div>
      <h1 style={{ fontFamily: F.head, fontSize: 24, fontWeight: 700, margin: '0 0 24px', letterSpacing:'-.3px' }}>
        {assignment.title}
      </h1>

      {/* Score card */}
      <Card style={{ padding: 24, marginBottom: 20, background: pctBg, borderColor: pctTone === 'success' ? C.successBorder : pctTone === 'amber' ? C.amberBorder : C.dangerBorder }}>
        <div style={{ display:'flex', alignItems:'center', gap: 24, flexWrap:'wrap' }}>
          <div style={{
            width: 96, height: 96, borderRadius:'50%',
            background: C.bg, border: `4px solid ${pctColor}`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: F.head, fontSize: 26, fontWeight: 800, color: pctColor, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{score}/{total}</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 700, color: pctColor }}>
              {approved ? (pct >= 80 ? 'Excellent work' : pct >= 60 ? 'Good effort' : 'Needs work') : 'Auto-marked score so far'}
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>
              {approved
                ? `Your teacher has reviewed and approved this submission.`
                : `Auto-marked questions only · your teacher will mark the rest.`}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
              Submitted {fmtDate(sub.submittedAt)}{approved && sub.approvedAt ? ` · Approved ${fmtDate(sub.approvedAt)}` : ''}
            </div>
          </div>
        </div>
      </Card>

      {/* Per-question */}
      <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
        {assignment.questions.map((q, i) => {
          const a = sub.answers?.[q.id];
          const m = sub.marks?.[q.id];
          const fb = sub.feedback?.[q.id];
          const isAutoQ = isAuto(q.type);
          const correct = isAutoQ && typeof m === 'number' && m === q.points;
          const wrong   = isAutoQ && typeof m === 'number' && m === 0;
          const awaiting = !isAutoQ && (m == null);

          return (
            <Card key={q.id} style={{ padding: 18 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap: 10, marginBottom: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, background: C.surface,
                  fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.muted,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
                }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 6, flexWrap:'wrap' }}>
                    <Pill tone={isAutoQ ? 'brand' : 'amber'}>{qtypeMeta(q.type).label}</Pill>
                    {isAutoQ && correct  && <Pill tone="success" icon={<Ico name="check" size={10} />}>Correct · {q.points}p</Pill>}
                    {isAutoQ && wrong    && <Pill tone="danger" icon={<Ico name="x" size={10} />}>Incorrect · 0p</Pill>}
                    {!isAutoQ && awaiting && <Pill tone="info" icon={<Ico name="clock" size={10} />}>Awaiting feedback</Pill>}
                    {!isAutoQ && !awaiting && <Pill tone="success">{m} / {q.points} pt</Pill>}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 14, color: C.text, lineHeight: 1.5 }}>{q.prompt}</div>
                </div>
              </div>

              <div style={{ marginLeft: 38, paddingLeft: 14, borderLeft: `2px solid ${C.surface2}` }}>
                <div style={{ marginBottom: fb || (isAutoQ && wrong) ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 6 }}>
                    Your answer
                  </div>
                  <QuestionAnswerDisplay question={q} answer={a} />
                </div>

                {isAutoQ && wrong && (
                  <div style={{ padding:'10px 14px', background: C.successBg, borderRadius: 8, border:`1px solid ${C.successBorder}`, marginBottom: fb ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.success, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 4 }}>
                      Correct answer
                    </div>
                    <div style={{ fontFamily: q.type === 'math' ? F.mono : F.body, fontSize: 14, color: C.text }}>
                      {q.type === 'mcq' ? `${String.fromCharCode(65 + q.correctIndex)} · ${q.choices[q.correctIndex]}`
                        : q.type === 'numeric' ? q.answer
                        : q.answer}
                    </div>
                  </div>
                )}

                {fb && (
                  <div style={{ padding:'10px 14px', background: C.brandSoft, borderRadius: 8, border:`1px solid ${C.brandBorder}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.brand, textTransform:'uppercase', letterSpacing:'.05em', marginBottom: 4 }}>
                      Teacher feedback
                    </div>
                    <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, whiteSpace:'pre-wrap' }}>{fb}</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ─── Wrap with toast provider ──────────────────────────────────
const TeacherHomeworkRoot = () => (
  <ToastProvider><TeacherHomework /></ToastProvider>
);
const StudentHomeworkRoot = () => (
  <ToastProvider><StudentHomework /></ToastProvider>
);

// ─── Helpers exposed for nav badges ────────────────────────────
const getHomeworkBadges = () => {
  const s = loadStore();
  const me = s.currentUser;
  const teacher = Object.values(s.users).find(u => u.role === 'teacher');
  const teacherToMark = teacher
    ? Object.values(s.assignments).filter(a => a.teacherId === teacher.id)
        .flatMap(a => Object.values(a.submissions))
        .filter(sub => sub.status === 'submitted').length
    : 0;
  const studentUnreadFeedback = me
    ? Object.values(s.assignments).filter(a =>
        a.studentIds.includes(me.id) &&
        a.submissions[me.id]?.status === 'approved'
      ).length
    : 0;
  return { teacherToMark, studentUnreadFeedback };
};

// ─── Export to window ──────────────────────────────────────────
Object.assign(window, {
  TeacherHomework: TeacherHomeworkRoot,
  StudentHomework: StudentHomeworkRoot,
  getHomeworkBadges,
});

})();
