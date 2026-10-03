// Class cover types. Pure data — no React, safe to import from apps/web and apps/api.

export const COVER_FAMILIES = [
  "maths",
  "sciences",
  "english",
  "humanities",
  "languages",
  "social",
  "computing",
  "creative",
  "exam-prep",
  "general",
] as const;
export type CoverFamily = (typeof COVER_FAMILIES)[number];

export const COVER_PALETTE_IDS = ["ember", "lavender", "sky", "sage", "rose", "amber", "teal", "slate"] as const;
export type CoverPaletteId = (typeof COVER_PALETTE_IDS)[number];

export const COVER_PATTERN_IDS = ["orbit", "tiles", "diamond", "bubbles", "dots", "ripples"] as const;
export type CoverPatternId = (typeof COVER_PATTERN_IDS)[number];

export type CoverVariant = "card" | "banner";
export type CoverTheme = "light" | "dark";

/** Two-stop gradient plus the ink colours that must stay readable on top of it. */
export type CoverSurface = {
  readonly from: string;
  readonly to: string;
  /** Colour of the pattern shapes. */
  readonly shape: string;
  /** Title / headline text on this surface. */
  readonly ink: string;
  /** Secondary text (teacher, schedule, labels) on this surface. */
  readonly inkMuted: string;
};

export type CoverPalette = {
  readonly id: CoverPaletteId;
  /** Shown in the picker. Product copy — keep it plain. */
  readonly label: string;
  /** Small class card, light theme: pastel surface, dark ink. */
  readonly card: CoverSurface;
  /** Small class card, dark theme. */
  readonly cardDark: CoverSurface;
  /** Wide class banner (both themes): deep surface, white ink. */
  readonly banner: CoverSurface;
};

export type CoverIconPath = { readonly d: string; readonly opacity?: number };

type CoverIconBase = {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly string[];
  readonly families: readonly CoverFamily[];
};

/** A typographic symbol rendered in a serif face (∫, Σ, é …). */
export type CoverGlyphEntry = CoverIconBase & { readonly kind: "glyph"; readonly char: string };

/** A vector icon on a 256×256 grid (Phosphor duotone). */
export type CoverSvgIconEntry = CoverIconBase & { readonly kind: "icon"; readonly paths: readonly CoverIconPath[] };

export type CoverIconEntry = CoverGlyphEntry | CoverSvgIconEntry;

/**
 * What the database holds (both columns nullable).
 * - presetId null  → derive the preset from the class subject.
 * - iconId null    → derive the icon from the class subject.
 * - iconId "none"  → the teacher explicitly chose no icon.
 */
export type StoredCover = {
  readonly presetId: string | null;
  readonly iconId: string | null;
};

/** A fully chosen cover, as the picker edits it. iconId null means "no icon". */
export type CoverSelection = {
  readonly presetId: string;
  readonly iconId: string | null;
};

/** Everything a renderer needs, with unknown or stale ids already replaced by defaults. */
export type ResolvedCover = {
  readonly presetId: string;
  readonly palette: CoverPalette;
  readonly pattern: CoverPatternId;
  readonly icon: CoverIconEntry | null;
  /** True when nothing was stored and the whole cover came from the subject. */
  readonly isDerived: boolean;
};
