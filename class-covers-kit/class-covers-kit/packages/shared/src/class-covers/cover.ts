import { COVER_PALETTES } from "./palettes";
import { NO_ICON, getCoverIcon, isKnownIconId } from "./icons";
import { deriveCoverParts } from "./subjects";
import {
  COVER_PALETTE_IDS,
  COVER_PATTERN_IDS,
  type CoverPaletteId,
  type CoverPatternId,
  type CoverSelection,
  type ResolvedCover,
  type StoredCover,
} from "./types";

export function presetIdOf(paletteId: CoverPaletteId, patternId: CoverPatternId): string {
  return `${paletteId}-${patternId}`;
}

/** Every preset: 8 palettes × 6 patterns = 48. */
export const COVER_PRESET_IDS: readonly string[] = COVER_PALETTE_IDS.flatMap((paletteId) =>
  COVER_PATTERN_IDS.map((patternId) => presetIdOf(paletteId, patternId)),
);

export function parsePresetId(presetId: string): { paletteId: CoverPaletteId; patternId: CoverPatternId } | null {
  const dash = presetId.indexOf("-");
  if (dash < 1) return null;
  const paletteId = presetId.slice(0, dash);
  const patternId = presetId.slice(dash + 1);
  if (!(COVER_PALETTE_IDS as readonly string[]).includes(paletteId)) return null;
  if (!(COVER_PATTERN_IDS as readonly string[]).includes(patternId)) return null;
  return { paletteId: paletteId as CoverPaletteId, patternId: patternId as CoverPatternId };
}

export function isValidPresetId(presetId: string): boolean {
  return parsePresetId(presetId) !== null;
}

/**
 * Turn stored columns into something renderable. Unknown ids (e.g. an icon
 * removed from the library later) quietly fall back to the derived default,
 * so a cover can never fail to render.
 */
export function resolveCover(stored: StoredCover | null | undefined, context: { subjectName: string; seed: string }): ResolvedCover {
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
    isDerived: !storedPreset && !storedIconId,
  };
}

/** The picker's starting value for a class. */
export function selectionFromResolved(resolved: ResolvedCover): CoverSelection {
  return { presetId: resolved.presetId, iconId: resolved.icon ? resolved.icon.id : null };
}

/** Picker value → columns to write. Pass null to reset the class to its derived default. */
export function toStoredCover(selection: CoverSelection | null): StoredCover {
  if (!selection) return { presetId: null, iconId: null };
  return { presetId: selection.presetId, iconId: selection.iconId ?? NO_ICON };
}

export type CoverValidationResult = { ok: true; value: CoverSelection | null } | { ok: false; error: string };

/**
 * Validate an untrusted request body for the update-cover endpoint.
 * Accepts null (reset to default) or { presetId, iconId } where iconId may be null (no icon).
 */
export function validateCoverSelection(input: unknown): CoverValidationResult {
  if (input === null) return { ok: true, value: null };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "cover must be an object or null" };
  const record = input as Record<string, unknown>;
  const allowedKeys = ["presetId", "iconId"];
  const extra = Object.keys(record).filter((key) => !allowedKeys.includes(key));
  if (extra.length > 0) return { ok: false, error: `unexpected field: ${extra[0]}` };
  const presetId = record.presetId;
  const iconId = record.iconId;
  if (typeof presetId !== "string" || !isValidPresetId(presetId)) return { ok: false, error: "presetId is not a known preset" };
  if (iconId !== null && (typeof iconId !== "string" || !isKnownIconId(iconId))) {
    return { ok: false, error: "iconId is not a known icon" };
  }
  return { ok: true, value: { presetId, iconId: iconId as string | null } };
}
