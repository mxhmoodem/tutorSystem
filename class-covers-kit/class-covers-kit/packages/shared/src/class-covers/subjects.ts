import type { CoverFamily, CoverPaletteId, CoverPatternId } from "./types";

// Subject name → family. Order matters: the first rule that matches wins, so
// "Computer Science" hits computing before sciences, and "11+ Verbal Reasoning"
// hits exam prep before anything else.
const FAMILY_RULES: ReadonlyArray<readonly [CoverFamily, RegExp]> = [
  ["exam-prep", /11\s*\+|11\s*plus|eleven\s*plus|\bsats?\b|entrance|reasoning|\bucat\b|\bbmat\b|\blnat\b|\btsa\b|scholarship/],
  ["computing", /comput|\bict\b|coding|programm|\bcs\b|robotic|digital skills/],
  ["maths", /math|statistic|algebra|calculus|numeracy|arithmetic|geometry/],
  ["social", /econom|business|psycholog|sociolog|\blaw\b|politic|accounting|finance|citizenship/],
  ["sciences", /physic|chemi|biolog|science|\bstem\b|engineering|astronomy|electronics/],
  ["english", /english|literature|reading|writing|spelling|grammar|phonics|comprehension|creative writing/],
  ["languages", /french|spanish|german|italian|portuguese|arabic|urdu|punjabi|bengali|gujarati|polish|mandarin|chinese|japanese|korean|latin|greek|turkish|language|\besol\b|\beal\b/],
  ["humanities", /history|geograph|religio|\brs\b|\bre\b|classics|philosoph|theology/],
  ["creative", /\bart\b|\barts\b|music|drama|design|photograph|media|film|dance|theatre|textiles/],
];

export function subjectFamily(subjectName: string): CoverFamily {
  const name = subjectName.toLowerCase();
  for (const rule of FAMILY_RULES) {
    if (rule[1].test(name)) return rule[0];
  }
  return "general";
}

/** What a new class in each family looks like before a teacher changes anything. */
export const FAMILY_DEFAULTS: Readonly<
  Record<CoverFamily, { palettes: readonly CoverPaletteId[]; patterns: readonly CoverPatternId[]; icons: readonly string[] }>
> = {
  maths: { palettes: ["ember", "lavender"], patterns: ["tiles", "diamond"], icons: ["integral", "capital-sigma", "lowercase-pi", "function"] },
  sciences: { palettes: ["sky", "teal", "sage"], patterns: ["orbit", "bubbles"], icons: ["atom", "flask", "dna", "microscope"] },
  english: { palettes: ["rose", "lavender"], patterns: ["ripples", "bubbles"], icons: ["book-open", "feather", "letters-aa"] },
  humanities: { palettes: ["amber", "ember"], patterns: ["ripples", "tiles"], icons: ["hourglass", "globe-hemisphere-west", "scroll"] },
  languages: { palettes: ["lavender", "rose"], patterns: ["bubbles", "orbit"], icons: ["translate", "chats-circle", "globe"] },
  social: { palettes: ["slate", "sky"], patterns: ["dots", "diamond"], icons: ["chart-line-up", "brain", "briefcase"] },
  computing: { palettes: ["teal", "slate"], patterns: ["dots", "tiles"], icons: ["code", "cpu", "terminal"] },
  creative: { palettes: ["rose", "amber"], patterns: ["bubbles", "ripples"], icons: ["palette", "music-notes", "mask-happy"] },
  "exam-prep": { palettes: ["ember", "amber"], patterns: ["diamond", "tiles"], icons: ["target", "exam", "lightbulb"] },
  general: { palettes: ["sky", "sage"], patterns: ["orbit", "bubbles"], icons: ["lightbulb", "books", "star"] },
};

// A more specific icon than the family default, when the subject name says what it is.
const SUBJECT_ICON_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/further/, "capital-sigma"],
  [/statistic/, "chart-pie-slice"],
  [/physic/, "atom"],
  [/chemi/, "flask"],
  [/biolog/, "dna"],
  [/psycholog/, "brain"],
  [/econom/, "chart-line-up"],
  [/business/, "briefcase"],
  [/\blaw\b|politic/, "scales"],
  [/accounting|finance/, "calculator"],
  [/literature/, "book-open"],
  [/phonics|spelling|grammar/, "letters-aa"],
  [/french/, "e-acute"],
  [/spanish/, "inverted-question"],
  [/german/, "u-umlaut"],
  [/history|classics/, "hourglass"],
  [/geograph/, "globe-hemisphere-west"],
  [/music/, "music-notes"],
  [/\bart\b|\barts\b/, "palette"],
  [/drama|theatre/, "mask-happy"],
  [/photograph|media|film/, "camera"],
  [/11\s*\+|11\s*plus|eleven\s*plus|entrance/, "seal-check"],
  [/reasoning/, "puzzle-piece"],
];

/** FNV-1a — small, stable string hash so the same class always derives the same cover. */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], hash: number, salt: number): T {
  return items[(hash + salt) % items.length] as T;
}

/**
 * The cover a class gets when nothing is stored. Deterministic: same subject and
 * seed (use the class id) always give the same result, and two maths classes
 * with different ids usually look different.
 */
export function deriveCoverParts(
  subjectName: string,
  seed: string,
): { family: CoverFamily; paletteId: CoverPaletteId; patternId: CoverPatternId; iconId: string } {
  const family = subjectFamily(subjectName);
  const defaults = FAMILY_DEFAULTS[family];
  const hash = stableHash(seed);
  const name = subjectName.toLowerCase();
  let iconId = pick(defaults.icons, hash, 0);
  for (const rule of SUBJECT_ICON_RULES) {
    if (rule[0].test(name)) {
      iconId = rule[1];
      break;
    }
  }
  return {
    family,
    paletteId: pick(defaults.palettes, hash, 0),
    patternId: pick(defaults.patterns, hash, 1),
    iconId,
  };
}
