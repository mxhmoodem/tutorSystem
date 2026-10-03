// ══════════════════════════════════════════════════════════════
//  Klasio — Class covers (the background of class cards and banners)
// ══════════════════════════════════════════════════════════════
//
// A class's background is one of 48 presets (8 colours × 6 patterns) plus an
// optional subject icon. Only the explicit choice is stored, on the class record
// (`coverPresetId` / `coverIconId`, mirroring the `classes.cover_preset_id` /
// `cover_icon_id` columns); a class with nothing stored derives its cover from its
// subject at read time, deterministically per class id. Unknown or stale ids fall
// back to that default, so a cover can never fail to render.
//
// This is the prototype port of class-covers-kit (packages/shared/src/class-covers
// and apps/web/src/components/class-cover), which is what the production build
// uses. The registry below is a verbatim JS copy of the kit's; keep them in step.
// Icon path data comes from classCoverIcons.js (generated — never edit by hand).
//
// Who may change it: a centre admin, any class; a teacher, only the classes they
// teach; pupils never (canChangeBackground). Writes go through the admin store's
// setClassBackground — never the general updateClass.
//
// Wrapped in an IIFE so none of these names collide with the other scripts'
// globals; the API is window.klasioCovers plus the CoverArt / coverStyleVars /
// ClassBackgroundDialog components.

(() => {

// ── Registry: types, palettes, patterns ─────────────────────────────────────────

const COVER_FAMILIES = ['maths', 'sciences', 'english', 'humanities', 'languages', 'social', 'computing', 'creative', 'exam-prep', 'general'];
const COVER_PALETTE_IDS = ['ember', 'lavender', 'sky', 'sage', 'rose', 'amber', 'teal', 'slate'];
const COVER_PATTERN_IDS = ['orbit', 'tiles', 'diamond', 'bubbles', 'dots', 'ripples'];

// Cover palettes are content colours, not UI tokens: they only ever paint class
// covers (a recorded exception to "brand tokens only"). Every ink/surface pair
// meets WCAG AA (4.5:1) — the kit's tests check it; change them there first.
const COVER_PALETTES = {
  ember: {
    id: 'ember', label: 'Ember',
    card:     { from: '#FCEEE2', to: '#F2CDAE', shape: '#E08A55', ink: '#6B2F12', inkMuted: '#7E4220' },
    cardDark: { from: '#2A1A12', to: '#3A2418', shape: '#E08A55', ink: '#FCEEE2', inkMuted: '#E9C3A6' },
    banner:   { from: '#B25E30', to: '#843F1C', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  lavender: {
    id: 'lavender', label: 'Lavender',
    card:     { from: '#F0ECFC', to: '#D6CDF6', shape: '#8A78E0', ink: '#2E2270', inkMuted: '#4F43A0' },
    cardDark: { from: '#1D1838', to: '#29224F', shape: '#8A78E0', ink: '#F0ECFC', inkMuted: '#C9C0F2' },
    banner:   { from: '#6A57CC', to: '#4A38A2', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  sky: {
    id: 'sky', label: 'Sky',
    card:     { from: '#E8F1FC', to: '#C3DAF4', shape: '#5B97DE', ink: '#16365A', inkMuted: '#345A82' },
    cardDark: { from: '#12233A', to: '#18314F', shape: '#5B97DE', ink: '#E8F1FC', inkMuted: '#AFCBEB' },
    banner:   { from: '#2F76A0', to: '#235878', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  sage: {
    id: 'sage', label: 'Sage',
    card:     { from: '#E6F4EC', to: '#C4E5D2', shape: '#4FA980', ink: '#173F2E', inkMuted: '#2F6149' },
    cardDark: { from: '#122620', to: '#18352B', shape: '#4FA980', ink: '#E6F4EC', inkMuted: '#AED8C0' },
    banner:   { from: '#377A60', to: '#275843', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  rose: {
    id: 'rose', label: 'Rose',
    card:     { from: '#FCEAF0', to: '#F2C7D5', shape: '#D66A90', ink: '#5A1830', inkMuted: '#83304F' },
    cardDark: { from: '#2B141D', to: '#3C1C29', shape: '#D66A90', ink: '#FCEAF0', inkMuted: '#EDB8CB' },
    banner:   { from: '#B84C72', to: '#86304F', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  amber: {
    id: 'amber', label: 'Amber',
    card:     { from: '#FBF2DD', to: '#F0DBA6', shape: '#D49A30', ink: '#4F3308', inkMuted: '#6E4A10' },
    cardDark: { from: '#261D0C', to: '#352912', shape: '#D49A30', ink: '#FBF2DD', inkMuted: '#E8D29E' },
    banner:   { from: '#94651A', to: '#6E4A10', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  teal: {
    id: 'teal', label: 'Teal',
    card:     { from: '#E2F5F4', to: '#B7E3E0', shape: '#2E9F97', ink: '#0E3E3B', inkMuted: '#1D5F5A' },
    cardDark: { from: '#0E2524', to: '#133432', shape: '#2E9F97', ink: '#E2F5F4', inkMuted: '#A5DAD6' },
    banner:   { from: '#1F7F78', to: '#145955', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
  slate: {
    id: 'slate', label: 'Slate',
    card:     { from: '#EDEFF3', to: '#D3D8E1', shape: '#6C7A92', ink: '#1F2737', inkMuted: '#3E4A60' },
    cardDark: { from: '#1A1E26', to: '#242A35', shape: '#6C7A92', ink: '#EDEFF3', inkMuted: '#C3CAD6' },
    banner:   { from: '#4E5B73', to: '#303A4D', shape: '#FFFFFF', ink: '#FFFFFF', inkMuted: '#FFFFFF' },
  },
};

// Picker labels. Product copy — keep it plain.
const COVER_PATTERN_LABELS = { orbit: 'Orbit', tiles: 'Tiles', diamond: 'Diamond', bubbles: 'Bubbles', dots: 'Dots', ripples: 'Ripples' };

// ── Subjects → family → derived default ─────────────────────────────────────────

// Subject name → family. Order matters: the first rule that matches wins, so
// "Computer Science" hits computing before sciences, and "11+ Verbal Reasoning"
// hits exam prep before anything else.
const FAMILY_RULES = [
  ['exam-prep', /11\s*\+|11\s*plus|eleven\s*plus|\bsats?\b|entrance|reasoning|\bucat\b|\bbmat\b|\blnat\b|\btsa\b|scholarship/],
  ['computing', /comput|\bict\b|coding|programm|\bcs\b|robotic|digital skills/],
  ['maths', /math|statistic|algebra|calculus|numeracy|arithmetic|geometry/],
  ['social', /econom|business|psycholog|sociolog|\blaw\b|politic|accounting|finance|citizenship/],
  ['sciences', /physic|chemi|biolog|science|\bstem\b|engineering|astronomy|electronics/],
  ['english', /english|literature|reading|writing|spelling|grammar|phonics|comprehension|creative writing/],
  ['languages', /french|spanish|german|italian|portuguese|arabic|urdu|punjabi|bengali|gujarati|polish|mandarin|chinese|japanese|korean|latin|greek|turkish|language|\besol\b|\beal\b/],
  ['humanities', /history|geograph|religio|\brs\b|\bre\b|classics|philosoph|theology/],
  ['creative', /\bart\b|\barts\b|music|drama|design|photograph|media|film|dance|theatre|textiles/],
];

const subjectFamily = (subjectName) => {
  const name = String(subjectName || '').toLowerCase();
  for (const rule of FAMILY_RULES) {
    if (rule[1].test(name)) return rule[0];
  }
  return 'general';
};

// What a new class in each family looks like before anyone changes anything.
const FAMILY_DEFAULTS = {
  maths:       { palettes: ['ember', 'lavender'],     patterns: ['tiles', 'diamond'],   icons: ['integral', 'capital-sigma', 'lowercase-pi', 'function'] },
  sciences:    { palettes: ['sky', 'teal', 'sage'],   patterns: ['orbit', 'bubbles'],   icons: ['atom', 'flask', 'dna', 'microscope'] },
  english:     { palettes: ['rose', 'lavender'],      patterns: ['ripples', 'bubbles'], icons: ['book-open', 'feather', 'letters-aa'] },
  humanities:  { palettes: ['amber', 'ember'],        patterns: ['ripples', 'tiles'],   icons: ['hourglass', 'globe-hemisphere-west', 'scroll'] },
  languages:   { palettes: ['lavender', 'rose'],      patterns: ['bubbles', 'orbit'],   icons: ['translate', 'chats-circle', 'globe'] },
  social:      { palettes: ['slate', 'sky'],          patterns: ['dots', 'diamond'],    icons: ['chart-line-up', 'brain', 'briefcase'] },
  computing:   { palettes: ['teal', 'slate'],         patterns: ['dots', 'tiles'],      icons: ['code', 'cpu', 'terminal'] },
  creative:    { palettes: ['rose', 'amber'],         patterns: ['bubbles', 'ripples'], icons: ['palette', 'music-notes', 'mask-happy'] },
  'exam-prep': { palettes: ['ember', 'amber'],        patterns: ['diamond', 'tiles'],   icons: ['target', 'exam', 'lightbulb'] },
  general:     { palettes: ['sky', 'sage'],           patterns: ['orbit', 'bubbles'],   icons: ['lightbulb', 'books', 'star'] },
};

// A more specific icon than the family default, when the subject name says what it is.
const SUBJECT_ICON_RULES = [
  [/further/, 'capital-sigma'],
  [/statistic/, 'chart-pie-slice'],
  [/physic/, 'atom'],
  [/chemi/, 'flask'],
  [/biolog/, 'dna'],
  [/psycholog/, 'brain'],
  [/econom/, 'chart-line-up'],
  [/business/, 'briefcase'],
  [/\blaw\b|politic/, 'scales'],
  [/accounting|finance/, 'calculator'],
  [/literature/, 'book-open'],
  [/phonics|spelling|grammar/, 'letters-aa'],
  [/french/, 'e-acute'],
  [/spanish/, 'inverted-question'],
  [/german/, 'u-umlaut'],
  [/history|classics/, 'hourglass'],
  [/geograph/, 'globe-hemisphere-west'],
  [/music/, 'music-notes'],
  [/\bart\b|\barts\b/, 'palette'],
  [/drama|theatre/, 'mask-happy'],
  [/photograph|media|film/, 'camera'],
  [/11\s*\+|11\s*plus|eleven\s*plus|entrance/, 'seal-check'],
  [/reasoning/, 'puzzle-piece'],
];

// FNV-1a — small, stable string hash so the same class always derives the same cover.
const stableHash = (input) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const pick = (items, hash, salt) => items[(hash + salt) % items.length];

// The cover a class gets when nothing is stored. Deterministic: the same subject and
// seed (the class id) always give the same result, and two maths classes with
// different ids usually look different.
const deriveCoverParts = (subjectName, seed) => {
  const family = subjectFamily(subjectName);
  const defaults = FAMILY_DEFAULTS[family];
  const hash = stableHash(String(seed));
  const name = String(subjectName || '').toLowerCase();
  let iconId = pick(defaults.icons, hash, 0);
  for (const rule of SUBJECT_ICON_RULES) {
    if (rule[0].test(name)) { iconId = rule[1]; break; }
  }
  return { family, paletteId: pick(defaults.palettes, hash, 0), patternId: pick(defaults.patterns, hash, 1), iconId };
};

// ── Icon registry ───────────────────────────────────────────────────────────────

// Stored as the icon id when someone explicitly chooses "no icon".
const NO_ICON = 'none';
const COVER_ICON_ENTRIES = window.KLASIO_COVER_ICON_ENTRIES || [];
const ICONS_BY_ID = new Map(COVER_ICON_ENTRIES.map(entry => [entry.id, entry]));
const COVER_ICON_IDS = COVER_ICON_ENTRIES.map(entry => entry.id);

const isKnownIconId = (id) => ICONS_BY_ID.has(id);
const getCoverIcon = (id) => (id ? ICONS_BY_ID.get(id) || null : null);

const normalise = (text) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
const matchesQuery = (entry, tokens) => {
  const haystack = normalise([entry.id, entry.label].concat(entry.tags).join(' '));
  return tokens.every(token => haystack.includes(token));
};

// Icons for the picker: those suggested for the class's subject family first, then
// everything else. A query filters both lists by label, id and tags.
const listCoverIcons = (options = {}) => {
  const tokens = normalise(options.query || '').split(/\s+/).filter(token => token.length > 0);
  const suggested = [];
  const others = [];
  for (const entry of COVER_ICON_ENTRIES) {
    if (tokens.length > 0 && !matchesQuery(entry, tokens)) continue;
    if (options.family && entry.families.includes(options.family)) suggested.push(entry);
    else others.push(entry);
  }
  return { suggested, others };
};

// ── Presets, resolve, validate ──────────────────────────────────────────────────

const presetIdOf = (paletteId, patternId) => `${paletteId}-${patternId}`;

// Every preset: 8 palettes × 6 patterns = 48.
const COVER_PRESET_IDS = COVER_PALETTE_IDS.flatMap(paletteId => COVER_PATTERN_IDS.map(patternId => presetIdOf(paletteId, patternId)));

const parsePresetId = (presetId) => {
  const dash = presetId.indexOf('-');
  if (dash < 1) return null;
  const paletteId = presetId.slice(0, dash);
  const patternId = presetId.slice(dash + 1);
  if (!COVER_PALETTE_IDS.includes(paletteId)) return null;
  if (!COVER_PATTERN_IDS.includes(patternId)) return null;
  return { paletteId, patternId };
};

const isValidPresetId = (presetId) => parsePresetId(presetId) !== null;

// Stored fields → something renderable. Unknown ids (e.g. an icon later removed
// from the library) quietly fall back to the derived default.
const resolveCover = (stored, context) => {
  const derived = deriveCoverParts(context.subjectName, context.seed);
  const storedPreset = stored && stored.presetId ? parsePresetId(stored.presetId) : null;
  const paletteId = storedPreset ? storedPreset.paletteId : derived.paletteId;
  const patternId = storedPreset ? storedPreset.patternId : derived.patternId;

  const storedIconId = stored ? stored.iconId : null;
  let icon = getCoverIcon(derived.iconId);
  if (storedIconId === NO_ICON) icon = null;
  else if (storedIconId && isKnownIconId(storedIconId)) icon = getCoverIcon(storedIconId);

  return {
    presetId: presetIdOf(paletteId, patternId),
    palette: COVER_PALETTES[paletteId],
    pattern: patternId,
    icon,
    // True when nothing was stored and the whole cover came from the subject.
    isDerived: !storedPreset && !storedIconId,
  };
};

// The picker's starting value. iconId null = no icon.
const selectionFromResolved = (resolved) => ({ presetId: resolved.presetId, iconId: resolved.icon ? resolved.icon.id : null });

// Picker value → fields to store. null resets the class to its subject default.
const toStoredCover = (selection) => {
  if (!selection) return { presetId: null, iconId: null };
  return { presetId: selection.presetId, iconId: selection.iconId ?? NO_ICON };
};

// Validate an untrusted write: null (reset) or exactly { presetId, iconId } where
// iconId may be null (no icon). Anything else is refused and nothing is written.
const validateCoverSelection = (input) => {
  if (input === null) return { ok: true, value: null };
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'cover must be an object or null' };
  const extra = Object.keys(input).filter(key => key !== 'presetId' && key !== 'iconId');
  if (extra.length > 0) return { ok: false, error: `unexpected field: ${extra[0]}` };
  const presetId = input.presetId;
  const iconId = input.iconId;
  if (typeof presetId !== 'string' || !isValidPresetId(presetId)) return { ok: false, error: 'presetId is not a known preset' };
  if (iconId !== null && (typeof iconId !== 'string' || !isKnownIconId(iconId))) return { ok: false, error: 'iconId is not a known icon' };
  return { ok: true, value: { presetId, iconId } };
};

// WCAG 2.x contrast helpers (the kit's palette tests use them).
const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relativeLuminance = (hex) => {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error(`Expected #RRGGBB, got "${hex}"`);
  return 0.2126 * channel(parseInt(clean.slice(0, 2), 16)) + 0.7152 * channel(parseInt(clean.slice(2, 4), 16)) + 0.0722 * channel(parseInt(clean.slice(4, 6), 16));
};
const contrastRatio = (foreground, background) => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

// ── The class read path + who may change it ─────────────────────────────────────

const readSubjects = () => {
  try {
    const p = JSON.parse(localStorage.getItem('admin_store_v4') || 'null');
    if (p && p.subjects) return p.subjects;
  } catch (e) {}
  return window.SEED_SUBJECTS || [];
};

// The subject a class's cover derives from: its linked subject, else its name.
const coverSubjectName = (cls, subjects) => {
  if (!cls) return '';
  const linked = cls.subjectId ? (subjects || readSubjects()).find(s => s.id === cls.subjectId) : null;
  return (linked && linked.name) || cls.name || '';
};

// THE read path. Every surface — admin, teacher and pupil — resolves a class's cover
// here from the class record, so the same class looks the same everywhere and on
// every load. Components take the result; they never read the stored fields.
const classCover = (cls, subjects) => resolveCover(
  { presetId: (cls && cls.coverPresetId) || null, iconId: (cls && cls.coverIconId) || null },
  { subjectName: coverSubjectName(cls, subjects), seed: String((cls && cls.id) || '') },
);

// A centre admin may change any class's background in their centre; a teacher only
// the classes they teach (the class's own teacher — not a temporary cover teacher);
// pupils never. `actor` = { role: 'admin' | 'teacher' | 'student', name }.
const canChangeBackground = (actor, cls) => {
  if (!actor || !cls) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'teacher') return !!actor.name && cls.teacher === actor.name;
  return false;
};

// ── Rendering: CoverArt + text colours ──────────────────────────────────────────

// Artwork is drawn in a fixed coordinate space per variant and scaled with
// preserveAspectRatio="xMaxYMid slice": the pattern stays pinned to the right edge
// at any width, and the left side stays clear for text.
const GEOMETRY = {
  card:   { width: 300,  height: 200, cx: 236, cy: 66, r: 52, iconScale: 0.9 },
  banner: { width: 1000, height: 140, cx: 850, cy: 58, r: 80, iconScale: 0.72 },
};

const SERIF_STACK = "Georgia, 'Times New Roman', Times, serif";

const f = (value) => Math.round(value * 10) / 10;

const coverSurface = (cover, variant, theme) => {
  if (variant === 'banner') return cover.palette.banner;
  return theme === 'dark' ? cover.palette.cardDark : cover.palette.card;
};

const inkFor = (surface, variant, theme) => {
  if (variant === 'banner') return { color: surface.shape, strong: 0.22, soft: 0.13 };
  if (theme === 'dark') return { color: surface.shape, strong: 0.75, soft: 0.3 };
  return { color: surface.shape, strong: 0.85, soft: 0.35 };
};

const renderPattern = (pattern, g, ink, withIcon) => {
  const cx = g.cx;
  const cy = g.cy;
  const r = g.r;
  const c = ink.color;
  const shapes = [];
  const centreAnchor = { x: cx, y: cy, size: r * g.iconScale };
  const badgeR = r * 0.6;
  const badgeAnchor = { x: cx, y: cy + r * 0.14, size: badgeR * 1.05 };

  if (pattern === 'orbit') {
    shapes.push(<circle key="ring" cx={f(cx)} cy={f(cy)} r={f(r)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.16)} />);
    shapes.push(<circle key="ring2" cx={f(cx + r * 0.6)} cy={f(cy + r * 0.55)} r={f(r * 0.72)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.12)} />);
    shapes.push(<circle key="dot" cx={f(cx - r * 0.35)} cy={f(cy - r * 0.62)} r={f(r * 0.11)} fill={c} fillOpacity={ink.strong} />);
    if (withIcon) shapes.push(<circle key="core" cx={f(cx)} cy={f(cy)} r={f(r * 0.76)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: centreAnchor };
  }

  if (pattern === 'tiles') {
    const s = r * 1.5;
    shapes.push(<rect key="back" x={f(cx - s / 2 + r * 0.14)} y={f(cy - s / 2 + r * 0.14)} width={f(s)} height={f(s)} rx={f(r * 0.28)} fill={c} fillOpacity={ink.soft} transform={`rotate(18 ${f(cx)} ${f(cy)})`} />);
    shapes.push(<rect key="front" x={f(cx - s / 2)} y={f(cy - s / 2)} width={f(s)} height={f(s)} rx={f(r * 0.28)} fill={c} fillOpacity={ink.strong} transform={`rotate(8 ${f(cx)} ${f(cy)})`} />);
    shapes.push(<circle key="dot" cx={f(cx - r * 1.05)} cy={f(cy + r * 0.95)} r={f(r * 0.14)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: centreAnchor };
  }

  if (pattern === 'diamond') {
    const s = r * 1.35;
    const ox = cx + r * 0.6;
    const oy = cy + r * 0.75;
    shapes.push(<rect key="main" x={f(cx - s / 2)} y={f(cy - s / 2)} width={f(s)} height={f(s)} rx={f(r * 0.2)} fill={c} fillOpacity={ink.strong} transform={`rotate(45 ${f(cx)} ${f(cy)})`} />);
    shapes.push(<rect key="outline" x={f(ox - s * 0.35)} y={f(oy - s * 0.35)} width={f(s * 0.7)} height={f(s * 0.7)} rx={f(r * 0.14)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.08)} transform={`rotate(45 ${f(ox)} ${f(oy)})`} />);
    return { shapes, anchor: { x: cx, y: cy, size: r * g.iconScale * 0.92 } };
  }

  if (pattern === 'bubbles') {
    const fx = cx + r * 0.55;
    const fy = cy + r * 0.5;
    shapes.push(<circle key="big" cx={f(cx)} cy={f(cy)} r={f(r * 0.95)} fill={c} fillOpacity={ink.soft} />);
    shapes.push(<circle key="front" cx={f(fx)} cy={f(fy)} r={f(r * 0.7)} fill={c} fillOpacity={ink.strong} />);
    shapes.push(<circle key="dot" cx={f(cx - r * 0.9)} cy={f(cy + r * 0.85)} r={f(r * 0.18)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: { x: fx, y: fy, size: r * g.iconScale * 0.8 } };
  }

  if (pattern === 'dots') {
    const gap = r * 0.3;
    const span = r * 2.8;
    for (let x = g.width - gap * 0.5; x > g.width - span; x -= gap) {
      for (let y = gap * 0.5; y < g.height; y += gap) {
        const fade = (x - (g.width - span)) / span;
        shapes.push(<circle key={`${f(x)}-${f(y)}`} cx={f(x)} cy={f(y)} r={f(r * 0.05)} fill={c} fillOpacity={Math.round(ink.strong * fade * 100) / 100} />);
      }
    }
    if (withIcon) shapes.push(<circle key="badge" cx={f(badgeAnchor.x)} cy={f(badgeAnchor.y)} r={f(badgeR)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: badgeAnchor };
  }

  // ripples
  [1.1, 1.6, 2.1, 2.6].forEach((k, i) => {
    shapes.push(<circle key={`ripple-${i}`} cx={g.width} cy={g.height} r={f(r * k)} fill="none" stroke={c} strokeOpacity={i % 2 === 0 ? ink.strong * 0.6 : ink.soft} strokeWidth={f(r * 0.12)} />);
  });
  if (withIcon) shapes.push(<circle key="badge" cx={f(badgeAnchor.x)} cy={f(badgeAnchor.y)} r={f(badgeR)} fill={c} fillOpacity={ink.strong} />);
  return { shapes, anchor: badgeAnchor };
};

// Draws an icon or glyph centred on (x, y) inside an existing <svg>.
const renderCoverIcon = (icon, x, y, size, color) => {
  if (icon.kind === 'glyph') {
    const fontSize = icon.char.length > 1 ? size * 0.85 : size * 1.2;
    return (
      <text x={f(x)} y={f(y)} fontSize={f(fontSize)} fontFamily={SERIF_STACK} fill={color} textAnchor="middle" dominantBaseline="central">
        {icon.char}
      </text>
    );
  }
  return (
    <g transform={`translate(${f(x - size / 2)} ${f(y - size / 2)}) scale(${Math.round((size / 256) * 10000) / 10000})`} fill={color}>
      {icon.paths.map((p, i) => <path key={i} d={p.d} opacity={p.opacity} />)}
    </g>
  );
};

const safeId = (raw) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

// The background layer of a class card or banner. Absolutely positioned: drop it in
// as the first child of a positioned container and put the content after it.
// Decorative, so hidden from assistive tech.
const CoverArt = ({ cover, variant, theme = 'light', style }) => {
  const g = GEOMETRY[variant];
  const surface = coverSurface(cover, variant, theme);
  const ink = inkFor(surface, variant, theme);
  // Includes the preset so that, if two React roots ever produce the same useId,
  // the clashing gradients are identical anyway.
  const gradientId = safeId(`cover-${cover.presetId}-${variant}-${theme}-${React.useId()}`);
  const drawn = renderPattern(cover.pattern, g, ink, cover.icon !== null);
  const iconColor = variant === 'banner' ? '#FFFFFF' : theme === 'dark' ? surface.ink : '#FFFFFF';
  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      data-cover-preset={cover.presetId}
      data-cover-icon={cover.icon ? cover.icon.id : 'none'}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderRadius: 'inherit', pointerEvents: 'none', ...style }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2={variant === 'banner' ? '0.35' : '1'}>
          <stop offset="0" stopColor={surface.from} />
          <stop offset="1" stopColor={surface.to} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={g.width} height={g.height} fill={`url(#${gradientId})`} />
      {drawn.shapes}
      {cover.icon ? (
        <g opacity={variant === 'banner' ? 0.95 : 1}>{renderCoverIcon(cover.icon, drawn.anchor.x, drawn.anchor.y, drawn.anchor.size, iconColor)}</g>
      ) : null}
    </svg>
  );
};

// A standalone icon/glyph in currentColor — used for picker tiles.
const CoverIconMark = ({ icon, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
    {renderCoverIcon(icon, 128, 128, 232, 'currentColor')}
  </svg>
);

// Text colours for content placed on a cover, as CSS custom properties. Spread into
// the container's style, then colour its text with var(--cover-ink) etc.
const coverStyleVars = (cover, variant, theme = 'light') => {
  const surface = coverSurface(cover, variant, theme);
  let chipBg = 'rgba(255, 255, 255, 0.6)';
  let chipInk = surface.ink;
  if (variant === 'banner') {
    // Dark translucent chips keep small white text above 4.5:1 on every banner palette.
    chipBg = 'rgba(0, 0, 0, 0.18)';
    chipInk = '#FFFFFF';
  } else if (theme === 'dark') {
    chipBg = 'rgba(255, 255, 255, 0.08)';
  }
  return {
    '--cover-ink': surface.ink,
    '--cover-ink-muted': surface.inkMuted,
    '--cover-chip-bg': chipBg,
    '--cover-chip-ink': chipInk,
  };
};

// ── Stylesheet for the picker and preview boxes ─────────────────────────────────
// The kit's CSS Modules, with every token fallback replaced by the Klasio DS token.
// Built from DS at render so the admin-settable accent applies live. Native radio
// inputs stay in the DOM (visually hidden) so the picker is keyboard-operable.
const coverCss = () => `
.kc-cover { position: relative; overflow: hidden; isolation: isolate; border-radius: 16px; color: var(--cover-ink); }
.kc-cover-content { position: relative; z-index: 1; height: 100%; }

.kcp { display: flex; flex-direction: column; gap: 20px; font-family: inherit; }
.kcp-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.kcp-preview { display: grid; grid-template-columns: minmax(0, 1fr) 200px; gap: 12px; align-items: stretch; }
.kcp-preview-banner { min-height: 96px; }
.kcp-preview-card { aspect-ratio: 3 / 2; }
.kcp-preview-text { display: flex; flex-direction: column; justify-content: center; gap: 2px; height: 100%; max-width: 60%; padding: 16px 20px; box-sizing: border-box; }
.kcp-preview-card .kcp-preview-text { justify-content: flex-start; padding: 14px 16px; }
.kcp-preview-title { font-size: 18px; font-weight: 700; line-height: 1.2; color: var(--cover-ink); }
.kcp-preview-card .kcp-preview-title { font-size: 15px; }
.kcp-preview-subtitle { font-size: 13px; line-height: 1.4; color: var(--cover-ink-muted); }
.kcp-preview-card .kcp-preview-subtitle { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@media (max-width: 560px) {
  .kcp-preview { grid-template-columns: minmax(0, 1fr); }
  .kcp-preview-card { max-width: 240px; }
}

.kcp-section { margin: 0; padding: 0; border: 0; min-width: 0; }
.kcp-legend { margin-bottom: 8px; padding: 0; font-size: 13px; font-weight: 600; color: ${DS.muted}; }

.kcp-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.kcp-swatch-option { display: inline-flex; cursor: pointer; }
.kcp-swatch { width: 28px; height: 28px; border-radius: 50%; outline: 2px solid transparent; outline-offset: 2px; transition: outline-color 120ms ease; }
.kcp-swatch-option input:checked + .kcp-swatch { outline-color: ${DS.text}; }
.kcp-swatch-option input:focus-visible + .kcp-swatch { outline-color: ${DS.accent}; }

.kcp-patterns { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.kcp-pattern-option { cursor: pointer; }
.kcp-pattern-tile { display: flex; flex-direction: column; gap: 6px; padding: 4px; border: 1px solid ${DS.border}; border-radius: 12px; transition: border-color 120ms ease; }
.kcp-pattern-thumb { aspect-ratio: 3 / 2; border-radius: 8px; }
.kcp-pattern-label { padding: 0 4px 2px; font-size: 12px; color: ${DS.muted}; }
.kcp-pattern-option input:checked + .kcp-pattern-tile { border-color: ${DS.text}; }
.kcp-pattern-option input:focus-visible + .kcp-pattern-tile { outline: 2px solid ${DS.accent}; outline-offset: 2px; }

.kcp-search { width: 100%; max-width: 320px; height: 36px; margin-bottom: 12px; padding: 0 12px; border: 1px solid ${DS.border}; border-radius: 8px; font: inherit; font-size: 14px; color: ${DS.text}; background: ${DS.bg}; box-sizing: border-box; }
.kcp-search:focus-visible { outline: 2px solid ${DS.accent}; outline-offset: 1px; }
.kcp-group-heading { margin: 14px 0 8px; font-size: 12px; color: ${DS.muted}; }
.kcp-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; }
.kcp-icon-option { cursor: pointer; }
.kcp-icon-tile { display: flex; align-items: center; justify-content: center; height: 44px; border: 1px solid ${DS.border}; border-radius: 10px; color: ${DS.text}; transition: border-color 120ms ease, background-color 120ms ease; }
.kcp-icon-option:hover .kcp-icon-tile { background: ${DS.surfaceHover}; }
.kcp-icon-option input:checked + .kcp-icon-tile { border-color: ${DS.accent}; background: ${DS.accentLight}; color: ${DS.accent}; }
.kcp-icon-option input:focus-visible + .kcp-icon-tile { outline: 2px solid ${DS.accent}; outline-offset: 2px; }
.kcp-none-tile { font-size: 12px; color: ${DS.muted}; }
.kcp-empty { margin: 8px 0 0; font-size: 13px; color: ${DS.muted}; }

.kcp-reset { align-self: flex-start; padding: 8px 12px; border: 1px solid ${DS.border}; border-radius: 8px; background: transparent; font: inherit; font-size: 13px; color: ${DS.text}; cursor: pointer; }
.kcp-reset:hover { background: ${DS.surfaceHover}; }
.kcp-reset:focus-visible { outline: 2px solid ${DS.accent}; outline-offset: 2px; }
`;

const CoverStyles = () => <style>{coverCss()}</style>;

// A positioned box with the cover art behind its children and the --cover-* text
// variables set. For previews and the gallery only — real cards and banners keep
// their own markup and add <CoverArt> + coverStyleVars() instead.
const ClassCover = ({ cover, variant, theme = 'light', className, children }) => (
  <div className={className ? `kc-cover ${className}` : 'kc-cover'} style={coverStyleVars(cover, variant, theme)} data-variant={variant}>
    <CoverArt cover={cover} variant={variant} theme={theme} />
    <div className="kc-cover-content">{children}</div>
  </div>
);

// ── The picker ──────────────────────────────────────────────────────────────────

const FAMILY_LABELS = {
  maths: 'Maths',
  sciences: 'Science',
  english: 'English',
  humanities: 'Humanities',
  languages: 'Languages',
  social: 'Social sciences and business',
  computing: 'Computing',
  creative: 'Creative subjects',
  'exam-prep': 'Exam preparation',
  general: 'General',
};

// Colour, Pattern and Icon as three native radio groups. Changing the colour keeps
// the pattern and icon; changing the pattern keeps the colour.
const CoverPicker = ({ value, onChange, subjectName, previewTitle, previewSubtitle, onReset, theme = 'light' }) => {
  const groupName = safeId(React.useId());
  const [query, setQuery] = React.useState('');
  const family = subjectFamily(subjectName);
  const resolved = resolveCover(toStoredCover(value), { subjectName, seed: '' });
  const paletteId = resolved.palette.id;
  const patternId = resolved.pattern;
  const icons = React.useMemo(() => listCoverIcons({ family, query }), [family, query]);
  const noResults = icons.suggested.length === 0 && icons.others.length === 0;

  const setPreset = (nextPalette, nextPattern) => onChange({ presetId: presetIdOf(nextPalette, nextPattern), iconId: value.iconId });
  const setIcon = (iconId) => onChange({ presetId: value.presetId, iconId });
  const patternPreview = (pattern) => ({ presetId: presetIdOf(paletteId, pattern), palette: resolved.palette, pattern, icon: null, isDerived: false });

  const iconOption = (entry) => (
    <label key={entry.id} className="kcp-icon-option" title={entry.label}>
      <input className="kcp-sr" type="radio" name={`${groupName}-icon`} value={entry.id}
        checked={value.iconId === entry.id} onChange={() => setIcon(entry.id)} />
      <span className="kcp-icon-tile">
        <CoverIconMark icon={entry} size={24} />
        <span className="kcp-sr">{entry.label}</span>
      </span>
    </label>
  );

  return (
    <div className="kcp">
      <CoverStyles />
      <div className="kcp-preview">
        <ClassCover cover={resolved} variant="banner" theme={theme} className="kcp-preview-banner">
          <div className="kcp-preview-text">
            <span className="kcp-preview-title">{previewTitle}</span>
            {previewSubtitle ? <span className="kcp-preview-subtitle">{previewSubtitle}</span> : null}
          </div>
        </ClassCover>
        <ClassCover cover={resolved} variant="card" theme={theme} className="kcp-preview-card">
          <div className="kcp-preview-text">
            <span className="kcp-preview-title">{previewTitle}</span>
            {previewSubtitle ? <span className="kcp-preview-subtitle">{previewSubtitle}</span> : null}
          </div>
        </ClassCover>
      </div>

      <fieldset className="kcp-section">
        <legend className="kcp-legend">Colour</legend>
        <div className="kcp-swatches">
          {COVER_PALETTE_IDS.map(id => {
            const palette = COVER_PALETTES[id];
            return (
              <label key={id} className="kcp-swatch-option" title={palette.label}>
                <input className="kcp-sr" type="radio" name={`${groupName}-palette`} value={id}
                  checked={paletteId === id} onChange={() => setPreset(id, patternId)} />
                <span className="kcp-swatch" style={{ background: `linear-gradient(135deg, ${palette.banner.from}, ${palette.card.shape})` }} />
                <span className="kcp-sr">{palette.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="kcp-section">
        <legend className="kcp-legend">Pattern</legend>
        <div className="kcp-patterns">
          {COVER_PATTERN_IDS.map(pattern => (
            <label key={pattern} className="kcp-pattern-option">
              <input className="kcp-sr" type="radio" name={`${groupName}-pattern`} value={pattern}
                checked={patternId === pattern} onChange={() => setPreset(paletteId, pattern)} />
              <span className="kcp-pattern-tile">
                <ClassCover cover={patternPreview(pattern)} variant="card" theme={theme} className="kcp-pattern-thumb" />
                <span className="kcp-pattern-label">{COVER_PATTERN_LABELS[pattern]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="kcp-section">
        <legend className="kcp-legend">Icon</legend>
        <input className="kcp-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search icons" aria-label="Search icons" />

        <div className="kcp-icon-grid">
          <label className="kcp-icon-option" title="No icon">
            <input className="kcp-sr" type="radio" name={`${groupName}-icon`} value="none"
              checked={value.iconId === null} onChange={() => setIcon(null)} />
            <span className="kcp-icon-tile kcp-none-tile">None</span>
          </label>
        </div>

        {icons.suggested.length > 0 ? (
          <React.Fragment>
            <p className="kcp-group-heading">Suggested for {FAMILY_LABELS[family]}</p>
            <div className="kcp-icon-grid">{icons.suggested.map(iconOption)}</div>
          </React.Fragment>
        ) : null}

        {icons.others.length > 0 ? (
          <React.Fragment>
            <p className="kcp-group-heading">{query ? 'Other matches' : 'All icons'}</p>
            <div className="kcp-icon-grid">{icons.others.map(iconOption)}</div>
          </React.Fragment>
        ) : null}

        {noResults ? <p className="kcp-empty">No icons match “{query}”. Try a subject or topic.</p> : null}
      </fieldset>

      {onReset ? <button type="button" className="kcp-reset" onClick={onReset}>Use subject default</button> : null}
    </div>
  );
};

// ── "Change background" dialog ──────────────────────────────────────────────────
// The picker in the shared Modal, with Save and Cancel. Nothing is written until
// Save. "Use subject default" previews the default and, on Save, sends null so the
// class goes back to deriving from its subject (nothing is stored).
// `onSave(selection | null)` returns { ok } or { ok: false, error }.
const SAVE_ERRORS = {
  forbidden: 'Only the class teacher or a centre admin can change this background.',
  not_found: 'This class no longer exists.',
};

const ClassBackgroundDialog = ({ open, onClose, cover, classId, subjectName, title, subtitle, onSave }) => {
  const [draft, setDraft] = React.useState(() => selectionFromResolved(cover));
  const [reset, setReset] = React.useState(false);
  const [error, setError] = React.useState('');

  // Start from the class's current background every time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setDraft(selectionFromResolved(cover));
    setReset(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const initial = selectionFromResolved(cover);
  const dirty = reset ? !cover.isDerived : (draft.presetId !== initial.presetId || draft.iconId !== initial.iconId);
  const change = (next) => { setDraft(next); setReset(false); setError(''); };
  const useDefault = () => {
    setDraft(selectionFromResolved(resolveCover(null, { subjectName, seed: String(classId) })));
    setReset(true);
    setError('');
  };
  const save = () => {
    const result = onSave(reset ? null : draft);
    if (result && result.ok === false) { setError(SAVE_ERRORS[result.error] || 'That background couldn’t be saved. Try another colour or icon.'); return; }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Change background" subtitle={title} icon="image" width={720}
      footer={(
        <React.Fragment>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={!dirty}>Save</Btn>
        </React.Fragment>
      )}>
      <CoverPicker value={draft} onChange={change} subjectName={subjectName}
        previewTitle={title} previewSubtitle={subtitle} onReset={useDefault} />
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 12px', borderRadius: 8, background: DS.dangerBg, border: `1px solid ${DS.dangerBorder}`, fontSize: 13, color: DS.danger }}>
          <Icon name="alert" size={14} color={DS.danger} /> {error}
        </div>
      )}
    </Modal>
  );
};

window.klasioCovers = {
  // registry
  COVER_FAMILIES, COVER_PALETTE_IDS, COVER_PATTERN_IDS, COVER_PALETTES, COVER_PATTERN_LABELS,
  COVER_ICON_ENTRIES, COVER_ICON_IDS, COVER_PRESET_IDS, FAMILY_DEFAULTS, FAMILY_LABELS, NO_ICON,
  subjectFamily, deriveCoverParts, stableHash, getCoverIcon, isKnownIconId, listCoverIcons,
  presetIdOf, parsePresetId, isValidPresetId, resolveCover, selectionFromResolved, toStoredCover, validateCoverSelection,
  contrastRatio, relativeLuminance,
  // the class read path + who may change it
  coverSubjectName, classCover, canChangeBackground,
  // rendering
  coverSurface, coverStyleVars, renderCoverIcon, CoverArt, CoverIconMark, CoverStyles, ClassCover, CoverPicker, ClassBackgroundDialog,
};
Object.assign(window, { CoverArt, coverStyleVars, ClassBackgroundDialog });

})();
