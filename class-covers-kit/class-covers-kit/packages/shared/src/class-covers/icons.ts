import { COVER_ICON_ENTRIES } from "./icons.generated";
import type { CoverFamily, CoverIconEntry } from "./types";

/** Stored in cover_icon_id when a teacher explicitly chooses "no icon". */
export const NO_ICON = "none";

const ICONS_BY_ID: ReadonlyMap<string, CoverIconEntry> = new Map(
  COVER_ICON_ENTRIES.map((entry) => [entry.id, entry] as const),
);

export const COVER_ICON_IDS: readonly string[] = COVER_ICON_ENTRIES.map((entry) => entry.id);

export function isKnownIconId(id: string): boolean {
  return ICONS_BY_ID.has(id);
}

export function getCoverIcon(id: string | null | undefined): CoverIconEntry | null {
  if (!id) return null;
  return ICONS_BY_ID.get(id) ?? null;
}

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

function matchesQuery(entry: CoverIconEntry, tokens: readonly string[]): boolean {
  const haystack = normalise([entry.id, entry.label].concat(entry.tags).join(" "));
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Icons for the picker: those suggested for the class's subject family first,
 * then everything else. A query filters both lists by label, id and tags.
 */
export function listCoverIcons(options: { family?: CoverFamily; query?: string } = {}): {
  suggested: CoverIconEntry[];
  others: CoverIconEntry[];
} {
  const tokens = normalise(options.query ?? "")
    .split(/\s+/)
    .filter((token) => token.length > 0);
  const suggested: CoverIconEntry[] = [];
  const others: CoverIconEntry[] = [];
  for (const entry of COVER_ICON_ENTRIES) {
    if (tokens.length > 0 && !matchesQuery(entry, tokens)) continue;
    if (options.family && entry.families.includes(options.family)) suggested.push(entry);
    else others.push(entry);
  }
  return { suggested, others };
}
