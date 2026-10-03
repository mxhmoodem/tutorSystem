import { describe, expect, it } from "vitest";
import {
  COVER_FAMILIES,
  COVER_ICON_ENTRIES,
  COVER_PALETTES,
  COVER_PALETTE_IDS,
  COVER_PRESET_IDS,
  FAMILY_DEFAULTS,
  NO_ICON,
  contrastRatio,
  deriveCoverParts,
  getCoverIcon,
  isValidPresetId,
  listCoverIcons,
  parsePresetId,
  resolveCover,
  selectionFromResolved,
  subjectFamily,
  toStoredCover,
  validateCoverSelection,
} from "./index";

const AA = 4.5;

describe("palettes", () => {
  for (const id of COVER_PALETTE_IDS) {
    const palette = COVER_PALETTES[id];
    const surfaces = [
      ["card", palette.card],
      ["cardDark", palette.cardDark],
      ["banner", palette.banner],
    ] as const;
    for (const surface of surfaces) {
      const name = surface[0];
      const s = surface[1];
      it(`${id} ${name}: ink and muted ink meet AA on both gradient stops`, () => {
        for (const bg of [s.from, s.to]) {
          expect(contrastRatio(s.ink, bg)).toBeGreaterThanOrEqual(AA);
          expect(contrastRatio(s.inkMuted, bg)).toBeGreaterThanOrEqual(AA);
        }
      });
    }
  }
});

describe("presets", () => {
  it("has 48 unique presets", () => {
    expect(COVER_PRESET_IDS).toHaveLength(48);
    expect(new Set(COVER_PRESET_IDS).size).toBe(48);
  });

  it("parses and rejects ids", () => {
    expect(parsePresetId("sky-orbit")).toEqual({ paletteId: "sky", patternId: "orbit" });
    expect(parsePresetId("sky-nope")).toBeNull();
    expect(parsePresetId("nope-orbit")).toBeNull();
    expect(parsePresetId("")).toBeNull();
    expect(isValidPresetId("ember-tiles")).toBe(true);
  });
});

describe("icon registry", () => {
  it("has unique kebab-case ids and no reserved id", () => {
    const ids = COVER_ICON_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(NO_ICON);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(ids.every((id) => id.length <= 40)).toBe(true);
  });

  it("every svg icon has path data and every glyph has a char", () => {
    for (const entry of COVER_ICON_ENTRIES) {
      if (entry.kind === "icon") expect(entry.paths.length).toBeGreaterThan(0);
      else expect(entry.char.length).toBeGreaterThan(0);
    }
  });

  it("every family default icon exists and every family has suggestions", () => {
    for (const family of COVER_FAMILIES) {
      for (const iconId of FAMILY_DEFAULTS[family].icons) expect(getCoverIcon(iconId)).not.toBeNull();
      expect(listCoverIcons({ family }).suggested.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("search matches labels and tags, suggested first", () => {
    const result = listCoverIcons({ family: "sciences", query: "chem" });
    expect(result.suggested.map((e) => e.id)).toContain("flask");
    const spanish = listCoverIcons({ query: "spanish" });
    expect(spanish.suggested.concat(spanish.others).map((e) => e.id)).toContain("inverted-question");
    expect(listCoverIcons({ query: "zzzz" }).others).toHaveLength(0);
  });
});

describe("subject families", () => {
  const cases: Array<[string, string]> = [
    ["A-Level Mathematics", "maths"],
    ["GCSE Further Maths", "maths"],
    ["A-Level Physics", "sciences"],
    ["Combined Science", "sciences"],
    ["Computer Science", "computing"],
    ["English Literature", "english"],
    ["KS2 Reading", "english"],
    ["GCSE History", "humanities"],
    ["Religious Studies", "humanities"],
    ["GCSE French", "languages"],
    ["Arabic", "languages"],
    ["A-Level Economics", "social"],
    ["Psychology", "social"],
    ["Art & Design", "creative"],
    ["Music Theory", "creative"],
    ["11+ Verbal Reasoning", "exam-prep"],
    ["11 Plus Maths", "exam-prep"],
    ["KS2 SATs", "exam-prep"],
    ["Homework Club", "general"],
  ];
  for (const c of cases) {
    it(`${c[0]} → ${c[1]}`, () => expect(subjectFamily(c[0])).toBe(c[1]));
  }
});

describe("derived defaults", () => {
  it("is deterministic for the same subject and seed", () => {
    expect(deriveCoverParts("A-Level Physics", "class_123")).toEqual(deriveCoverParts("A-Level Physics", "class_123"));
  });

  it("uses subject-specific icons", () => {
    expect(deriveCoverParts("A-Level Physics", "a").iconId).toBe("atom");
    expect(deriveCoverParts("GCSE Chemistry", "a").iconId).toBe("flask");
    expect(deriveCoverParts("A-Level Further Maths", "a").iconId).toBe("capital-sigma");
    expect(deriveCoverParts("GCSE Spanish", "a").iconId).toBe("inverted-question");
  });

  it("stays inside the family's palettes and patterns across many seeds", () => {
    const defaults = FAMILY_DEFAULTS.maths;
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const parts = deriveCoverParts("Maths", `class_${i}`);
      expect(defaults.palettes).toContain(parts.paletteId);
      expect(defaults.patterns).toContain(parts.patternId);
      seen.add(`${parts.paletteId}-${parts.patternId}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("resolveCover", () => {
  const ctx = { subjectName: "A-Level Physics", seed: "class_1" };

  it("derives everything when nothing is stored", () => {
    const resolved = resolveCover({ presetId: null, iconId: null }, ctx);
    expect(resolved.isDerived).toBe(true);
    expect(resolved.icon && resolved.icon.id).toBe("atom");
    expect(isValidPresetId(resolved.presetId)).toBe(true);
  });

  it("uses stored values", () => {
    const resolved = resolveCover({ presetId: "rose-dots", iconId: "flask" }, ctx);
    expect(resolved.presetId).toBe("rose-dots");
    expect(resolved.palette.id).toBe("rose");
    expect(resolved.pattern).toBe("dots");
    expect(resolved.icon && resolved.icon.id).toBe("flask");
    expect(resolved.isDerived).toBe(false);
  });

  it("respects an explicit no-icon choice", () => {
    expect(resolveCover({ presetId: "sky-orbit", iconId: NO_ICON }, ctx).icon).toBeNull();
  });

  it("falls back to defaults for unknown ids instead of failing", () => {
    const resolved = resolveCover({ presetId: "neon-zigzag", iconId: "deleted-icon" }, ctx);
    expect(isValidPresetId(resolved.presetId)).toBe(true);
    expect(resolved.icon && resolved.icon.id).toBe("atom");
  });

  it("round-trips through the picker shape", () => {
    const resolved = resolveCover({ presetId: "teal-tiles", iconId: NO_ICON }, ctx);
    const selection = selectionFromResolved(resolved);
    expect(selection).toEqual({ presetId: "teal-tiles", iconId: null });
    expect(toStoredCover(selection)).toEqual({ presetId: "teal-tiles", iconId: NO_ICON });
    expect(toStoredCover(null)).toEqual({ presetId: null, iconId: null });
  });
});

describe("validateCoverSelection", () => {
  it("accepts valid input and null", () => {
    expect(validateCoverSelection({ presetId: "sky-orbit", iconId: "atom" })).toEqual({
      ok: true,
      value: { presetId: "sky-orbit", iconId: "atom" },
    });
    expect(validateCoverSelection({ presetId: "sky-orbit", iconId: null }).ok).toBe(true);
    expect(validateCoverSelection(null)).toEqual({ ok: true, value: null });
  });

  it("rejects bad input", () => {
    expect(validateCoverSelection({ presetId: "sky-nope", iconId: null }).ok).toBe(false);
    expect(validateCoverSelection({ presetId: "sky-orbit", iconId: "nope" }).ok).toBe(false);
    expect(validateCoverSelection({ presetId: "sky-orbit", iconId: NO_ICON }).ok).toBe(false);
    expect(validateCoverSelection({ presetId: "sky-orbit", iconId: null, extra: 1 }).ok).toBe(false);
    expect(validateCoverSelection("sky-orbit").ok).toBe(false);
    expect(validateCoverSelection([]).ok).toBe(false);
  });
});
