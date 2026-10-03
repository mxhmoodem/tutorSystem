// ══════════════════════════════════════════════════════════════
//  Klasio — Class cover gallery (development only)
// ══════════════════════════════════════════════════════════════
//
// Internal curation tool from the class-covers kit: every preset in both formats, so
// weak combinations can be spotted and removed before teachers see them. Not a
// product page. index.html loads this file only on a local host and opens it at
// ?view=cover-gallery; the deployed prototype never fetches it.

(() => {

const SAMPLE_ICONS = ['integral', 'atom', 'book-open', 'hourglass', 'translate', 'chart-line-up', 'code', 'palette'];

const galleryCss = () => `
.kcg { display: flex; flex-direction: column; gap: 28px; padding: 24px; font-family: inherit; color: ${DS.text}; background: ${DS.bg}; min-height: 100%; }
.kcg-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; font-size: 14px; }
.kcg-control { display: inline-flex; align-items: center; gap: 6px; }
.kcg-count { color: ${DS.muted}; }
.kcg-row-title { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
.kcg-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.kcg-item { display: flex; flex-direction: column; gap: 8px; margin: 0; }
.kcg-card { aspect-ratio: 3 / 2; }
.kcg-banner { height: 72px; }
.kcg-card-text, .kcg-banner-text { display: flex; flex-direction: column; gap: 2px; max-width: 60%; padding: 14px 16px; box-sizing: border-box; }
.kcg-banner-text { justify-content: center; height: 100%; padding: 0 16px; }
.kcg-title { font-size: 14px; font-weight: 700; color: var(--cover-ink); }
.kcg-subtitle { font-size: 12px; color: var(--cover-ink-muted); }
.kcg-caption { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: ${DS.muted}; }
`;

const CoverGallery = () => {
  const C = window.klasioCovers;
  const [theme, setTheme] = React.useState('light');
  const [showIcons, setShowIcons] = React.useState(true);
  const sample = (paletteId, pattern, iconId) => ({
    presetId: C.presetIdOf(paletteId, pattern),
    palette: C.COVER_PALETTES[paletteId],
    pattern,
    icon: iconId ? C.getCoverIcon(iconId) : null,
    isDerived: false,
  });

  return (
    <div className="kcg">
      <C.CoverStyles />
      <style>{galleryCss()}</style>
      <div className="kcg-controls">
        <strong>Class covers — gallery (development only)</strong>
        <label className="kcg-control">
          <input type="checkbox" checked={showIcons} onChange={e => setShowIcons(e.target.checked)} />
          Show sample icons
        </label>
        <label className="kcg-control">
          <input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} />
          Dark cards
        </label>
        <span className="kcg-count">
          {C.COVER_PALETTE_IDS.length * C.COVER_PATTERN_IDS.length} presets · {Object.keys(C.FAMILY_DEFAULTS).length} subject families · {C.COVER_ICON_ENTRIES.length} icons
        </span>
      </div>

      {C.COVER_PALETTE_IDS.map((paletteId, paletteIndex) => (
        <section key={paletteId}>
          <h2 className="kcg-row-title">{C.COVER_PALETTES[paletteId].label}</h2>
          <div className="kcg-cards">
            {C.COVER_PATTERN_IDS.map((pattern, patternIndex) => {
              const iconId = showIcons ? SAMPLE_ICONS[(paletteIndex + patternIndex) % SAMPLE_ICONS.length] : null;
              const cover = sample(paletteId, pattern, iconId);
              return (
                <figure key={pattern} className="kcg-item">
                  <C.ClassCover cover={cover} variant="card" theme={theme} className="kcg-card">
                    <div className="kcg-card-text">
                      <span className="kcg-title">A-Level Mathematics</span>
                      <span className="kcg-subtitle">Heebz A · Fri 10 Jul</span>
                    </div>
                  </C.ClassCover>
                  <C.ClassCover cover={cover} variant="banner" className="kcg-banner">
                    <div className="kcg-banner-text">
                      <span className="kcg-title">A-Level Mathematics</span>
                      <span className="kcg-subtitle">Year 12 · Friday 13:00–14:30</span>
                    </div>
                  </C.ClassCover>
                  <figcaption className="kcg-caption">{cover.presetId}</figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

window.CoverGallery = CoverGallery;

})();
