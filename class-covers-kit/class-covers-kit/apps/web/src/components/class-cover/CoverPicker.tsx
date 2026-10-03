import { useId, useMemo, useState, type ReactElement } from "react";
import {
  COVER_PALETTES,
  COVER_PALETTE_IDS,
  COVER_PATTERN_IDS,
  COVER_PATTERN_LABELS,
  listCoverIcons,
  presetIdOf,
  resolveCover,
  subjectFamily,
  toStoredCover,
  type CoverFamily,
  type CoverIconEntry,
  type CoverPaletteId,
  type CoverPatternId,
  type CoverSelection,
  type CoverTheme,
  type ResolvedCover,
} from "@klasio/shared/class-covers";
import { ClassCover } from "./ClassCover";
import { CoverIconMark } from "./CoverArt";
import styles from "./CoverPicker.module.css";

const FAMILY_LABELS: Readonly<Record<CoverFamily, string>> = {
  maths: "Maths",
  sciences: "Science",
  english: "English",
  humanities: "Humanities",
  languages: "Languages",
  social: "Social sciences and business",
  computing: "Computing",
  creative: "Creative subjects",
  "exam-prep": "Exam preparation",
  general: "General",
};

type CoverPickerProps = {
  /** Current choice. iconId null = no icon. */
  value: CoverSelection;
  onChange: (next: CoverSelection) => void;
  /** The class's subject name — drives suggested icons. */
  subjectName: string;
  /** Class name, shown in the preview. */
  previewTitle: string;
  /** Secondary line in the preview, e.g. teacher and schedule. */
  previewSubtitle?: string;
  /** When provided, shows "Use subject default", which should store null. */
  onReset?: () => void;
  theme?: CoverTheme;
};

export function CoverPicker(props: CoverPickerProps): ReactElement {
  const theme = props.theme ?? "light";
  const groupName = useId();
  const [query, setQuery] = useState("");
  const family = subjectFamily(props.subjectName);
  const resolved = resolveCover(toStoredCover(props.value), { subjectName: props.subjectName, seed: "" });
  const paletteId = resolved.palette.id;
  const patternId = resolved.pattern;
  const icons = useMemo(() => listCoverIcons({ family, query }), [family, query]);
  const noResults = icons.suggested.length === 0 && icons.others.length === 0;

  function setPreset(nextPalette: CoverPaletteId, nextPattern: CoverPatternId): void {
    props.onChange({ presetId: presetIdOf(nextPalette, nextPattern), iconId: props.value.iconId });
  }

  function setIcon(iconId: string | null): void {
    props.onChange({ presetId: props.value.presetId, iconId });
  }

  function patternPreview(pattern: CoverPatternId): ResolvedCover {
    return { presetId: presetIdOf(paletteId, pattern), palette: resolved.palette, pattern, icon: null, isDerived: false };
  }

  function iconOption(entry: CoverIconEntry): ReactElement {
    return (
      <label key={entry.id} className={styles.iconOption} title={entry.label}>
        <input
          className={styles.srOnly}
          type="radio"
          name={`${groupName}-icon`}
          value={entry.id}
          checked={props.value.iconId === entry.id}
          onChange={() => setIcon(entry.id)}
        />
        <span className={styles.iconTile}>
          <CoverIconMark icon={entry} size={24} />
          <span className={styles.srOnly}>{entry.label}</span>
        </span>
      </label>
    );
  }

  return (
    <div className={styles.picker}>
      <div className={styles.preview}>
        <ClassCover cover={resolved} variant="banner" theme={theme} className={styles.previewBanner}>
          <div className={styles.previewText}>
            <span className={styles.previewTitle}>{props.previewTitle}</span>
            {props.previewSubtitle ? <span className={styles.previewSubtitle}>{props.previewSubtitle}</span> : null}
          </div>
        </ClassCover>
        <ClassCover cover={resolved} variant="card" theme={theme} className={styles.previewCard}>
          <div className={styles.previewText}>
            <span className={styles.previewTitle}>{props.previewTitle}</span>
            {props.previewSubtitle ? <span className={styles.previewSubtitle}>{props.previewSubtitle}</span> : null}
          </div>
        </ClassCover>
      </div>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Colour</legend>
        <div className={styles.swatches}>
          {COVER_PALETTE_IDS.map((id) => {
            const palette = COVER_PALETTES[id];
            return (
              <label key={id} className={styles.swatchOption} title={palette.label}>
                <input
                  className={styles.srOnly}
                  type="radio"
                  name={`${groupName}-palette`}
                  value={id}
                  checked={paletteId === id}
                  onChange={() => setPreset(id, patternId)}
                />
                <span
                  className={styles.swatch}
                  style={{ background: `linear-gradient(135deg, ${palette.banner.from}, ${palette.card.shape})` }}
                />
                <span className={styles.srOnly}>{palette.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Pattern</legend>
        <div className={styles.patterns}>
          {COVER_PATTERN_IDS.map((pattern) => (
            <label key={pattern} className={styles.patternOption}>
              <input
                className={styles.srOnly}
                type="radio"
                name={`${groupName}-pattern`}
                value={pattern}
                checked={patternId === pattern}
                onChange={() => setPreset(paletteId, pattern)}
              />
              <span className={styles.patternTile}>
                <ClassCover cover={patternPreview(pattern)} variant="card" theme={theme} className={styles.patternThumb} />
                <span className={styles.patternLabel}>{COVER_PATTERN_LABELS[pattern]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Icon</legend>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search icons"
          aria-label="Search icons"
        />

        <div className={styles.iconGrid}>
          <label className={styles.iconOption} title="No icon">
            <input
              className={styles.srOnly}
              type="radio"
              name={`${groupName}-icon`}
              value="none"
              checked={props.value.iconId === null}
              onChange={() => setIcon(null)}
            />
            <span className={`${styles.iconTile} ${styles.noneTile}`}>None</span>
          </label>
        </div>

        {icons.suggested.length > 0 ? (
          <>
            <p className={styles.groupHeading}>Suggested for {FAMILY_LABELS[family]}</p>
            <div className={styles.iconGrid}>{icons.suggested.map(iconOption)}</div>
          </>
        ) : null}

        {icons.others.length > 0 ? (
          <>
            <p className={styles.groupHeading}>{query ? "Other matches" : "All icons"}</p>
            <div className={styles.iconGrid}>{icons.others.map(iconOption)}</div>
          </>
        ) : null}

        {noResults ? <p className={styles.empty}>No icons match “{query}”. Try a subject or topic.</p> : null}
      </fieldset>

      {props.onReset ? (
        <button type="button" className={styles.reset} onClick={props.onReset}>
          Use subject default
        </button>
      ) : null}
    </div>
  );
}
