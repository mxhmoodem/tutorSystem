import { useState, type ReactElement } from "react";
import {
  COVER_PALETTES,
  COVER_PALETTE_IDS,
  COVER_PATTERN_IDS,
  FAMILY_DEFAULTS,
  getCoverIcon,
  presetIdOf,
  type CoverPaletteId,
  type CoverPatternId,
  type CoverTheme,
  type ResolvedCover,
} from "@klasio/shared/class-covers";
import { ClassCover } from "./ClassCover";
import styles from "./CoverGallery.module.css";

// Internal curation tool: every preset in both formats, so weak combinations
// can be spotted and removed before teachers see them. Dev-only route.

const SAMPLE_ICONS = ["integral", "atom", "book-open", "hourglass", "translate", "chart-line-up", "code", "palette"];

function sample(paletteId: CoverPaletteId, pattern: CoverPatternId, iconId: string | null): ResolvedCover {
  return {
    presetId: presetIdOf(paletteId, pattern),
    palette: COVER_PALETTES[paletteId],
    pattern,
    icon: iconId ? getCoverIcon(iconId) : null,
    isDerived: false,
  };
}

export function CoverGallery(): ReactElement {
  const [theme, setTheme] = useState<CoverTheme>("light");
  const [showIcons, setShowIcons] = useState(true);

  return (
    <div className={styles.gallery}>
      <div className={styles.controls}>
        <label className={styles.control}>
          <input type="checkbox" checked={showIcons} onChange={(event) => setShowIcons(event.target.checked)} />
          Show sample icons
        </label>
        <label className={styles.control}>
          <input type="checkbox" checked={theme === "dark"} onChange={(event) => setTheme(event.target.checked ? "dark" : "light")} />
          Dark cards
        </label>
        <span className={styles.count}>
          {COVER_PALETTE_IDS.length * COVER_PATTERN_IDS.length} presets · {Object.keys(FAMILY_DEFAULTS).length} subject families
        </span>
      </div>

      {COVER_PALETTE_IDS.map((paletteId, paletteIndex) => (
        <section key={paletteId} className={styles.row}>
          <h2 className={styles.rowTitle}>{COVER_PALETTES[paletteId].label}</h2>
          <div className={styles.cards}>
            {COVER_PATTERN_IDS.map((pattern, patternIndex) => {
              const iconId = showIcons ? SAMPLE_ICONS[(paletteIndex + patternIndex) % SAMPLE_ICONS.length] ?? null : null;
              const cover = sample(paletteId, pattern, iconId);
              return (
                <figure key={pattern} className={styles.item}>
                  <ClassCover cover={cover} variant="card" theme={theme} className={styles.card}>
                    <div className={styles.cardText}>
                      <span className={styles.title}>A-Level Mathematics</span>
                      <span className={styles.subtitle}>Heebz A · Fri 10 Jul</span>
                    </div>
                  </ClassCover>
                  <ClassCover cover={cover} variant="banner" className={styles.banner}>
                    <div className={styles.bannerText}>
                      <span className={styles.title}>A-Level Mathematics</span>
                      <span className={styles.subtitle}>Year 12 · Friday 13:00–14:30</span>
                    </div>
                  </ClassCover>
                  <figcaption className={styles.caption}>{cover.presetId}</figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
