import { useId, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type {
  CoverIconEntry,
  CoverPatternId,
  CoverSurface,
  CoverTheme,
  CoverVariant,
  ResolvedCover,
} from "@klasio/shared/class-covers";
import styles from "./CoverArt.module.css";

// Artwork is drawn in a fixed coordinate space per variant and scaled with
// preserveAspectRatio="xMaxYMid slice": the pattern stays pinned to the right
// edge at any width, and the left side stays clear for text.
const GEOMETRY = {
  card: { width: 300, height: 200, cx: 236, cy: 66, r: 52, iconScale: 0.9 },
  banner: { width: 1000, height: 140, cx: 850, cy: 58, r: 80, iconScale: 0.72 },
} as const;

const SERIF_STACK = "Georgia, 'Times New Roman', Times, serif";

type Geometry = { width: number; height: number; cx: number; cy: number; r: number; iconScale: number };
type Ink = { color: string; strong: number; soft: number };
type Anchor = { x: number; y: number; size: number };

function f(value: number): number {
  return Math.round(value * 10) / 10;
}

export function coverSurface(cover: ResolvedCover, variant: CoverVariant, theme: CoverTheme): CoverSurface {
  if (variant === "banner") return cover.palette.banner;
  return theme === "dark" ? cover.palette.cardDark : cover.palette.card;
}

function inkFor(surface: CoverSurface, variant: CoverVariant, theme: CoverTheme): Ink {
  if (variant === "banner") return { color: surface.shape, strong: 0.22, soft: 0.13 };
  if (theme === "dark") return { color: surface.shape, strong: 0.75, soft: 0.3 };
  return { color: surface.shape, strong: 0.85, soft: 0.35 };
}

function renderPattern(
  pattern: CoverPatternId,
  g: Geometry,
  ink: Ink,
  withIcon: boolean,
): { shapes: ReactElement[]; anchor: Anchor } {
  const cx = g.cx;
  const cy = g.cy;
  const r = g.r;
  const c = ink.color;
  const shapes: ReactElement[] = [];
  const centreAnchor = { x: cx, y: cy, size: r * g.iconScale };
  const badgeR = r * 0.6;
  const badgeAnchor = { x: cx, y: cy + r * 0.14, size: badgeR * 1.05 };

  if (pattern === "orbit") {
    shapes.push(<circle key="ring" cx={f(cx)} cy={f(cy)} r={f(r)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.16)} />);
    shapes.push(
      <circle key="ring2" cx={f(cx + r * 0.6)} cy={f(cy + r * 0.55)} r={f(r * 0.72)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.12)} />,
    );
    shapes.push(<circle key="dot" cx={f(cx - r * 0.35)} cy={f(cy - r * 0.62)} r={f(r * 0.11)} fill={c} fillOpacity={ink.strong} />);
    if (withIcon) shapes.push(<circle key="core" cx={f(cx)} cy={f(cy)} r={f(r * 0.76)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: centreAnchor };
  }

  if (pattern === "tiles") {
    const s = r * 1.5;
    shapes.push(
      <rect key="back" x={f(cx - s / 2 + r * 0.14)} y={f(cy - s / 2 + r * 0.14)} width={f(s)} height={f(s)} rx={f(r * 0.28)} fill={c} fillOpacity={ink.soft} transform={`rotate(18 ${f(cx)} ${f(cy)})`} />,
    );
    shapes.push(
      <rect key="front" x={f(cx - s / 2)} y={f(cy - s / 2)} width={f(s)} height={f(s)} rx={f(r * 0.28)} fill={c} fillOpacity={ink.strong} transform={`rotate(8 ${f(cx)} ${f(cy)})`} />,
    );
    shapes.push(<circle key="dot" cx={f(cx - r * 1.05)} cy={f(cy + r * 0.95)} r={f(r * 0.14)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: centreAnchor };
  }

  if (pattern === "diamond") {
    const s = r * 1.35;
    const ox = cx + r * 0.6;
    const oy = cy + r * 0.75;
    shapes.push(
      <rect key="main" x={f(cx - s / 2)} y={f(cy - s / 2)} width={f(s)} height={f(s)} rx={f(r * 0.2)} fill={c} fillOpacity={ink.strong} transform={`rotate(45 ${f(cx)} ${f(cy)})`} />,
    );
    shapes.push(
      <rect key="outline" x={f(ox - s * 0.35)} y={f(oy - s * 0.35)} width={f(s * 0.7)} height={f(s * 0.7)} rx={f(r * 0.14)} fill="none" stroke={c} strokeOpacity={ink.soft} strokeWidth={f(r * 0.08)} transform={`rotate(45 ${f(ox)} ${f(oy)})`} />,
    );
    return { shapes, anchor: { x: cx, y: cy, size: r * g.iconScale * 0.92 } };
  }

  if (pattern === "bubbles") {
    const fx = cx + r * 0.55;
    const fy = cy + r * 0.5;
    shapes.push(<circle key="big" cx={f(cx)} cy={f(cy)} r={f(r * 0.95)} fill={c} fillOpacity={ink.soft} />);
    shapes.push(<circle key="front" cx={f(fx)} cy={f(fy)} r={f(r * 0.7)} fill={c} fillOpacity={ink.strong} />);
    shapes.push(<circle key="dot" cx={f(cx - r * 0.9)} cy={f(cy + r * 0.85)} r={f(r * 0.18)} fill={c} fillOpacity={ink.strong} />);
    return { shapes, anchor: { x: fx, y: fy, size: r * g.iconScale * 0.8 } };
  }

  if (pattern === "dots") {
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
  const radii = [1.1, 1.6, 2.1, 2.6];
  radii.forEach((k, i) => {
    shapes.push(
      <circle key={`ripple-${i}`} cx={g.width} cy={g.height} r={f(r * k)} fill="none" stroke={c} strokeOpacity={i % 2 === 0 ? ink.strong * 0.6 : ink.soft} strokeWidth={f(r * 0.12)} />,
    );
  });
  if (withIcon) shapes.push(<circle key="badge" cx={f(badgeAnchor.x)} cy={f(badgeAnchor.y)} r={f(badgeR)} fill={c} fillOpacity={ink.strong} />);
  return { shapes, anchor: badgeAnchor };
}

/** Draws an icon or glyph centred on (x, y) inside an existing <svg>. */
export function renderCoverIcon(icon: CoverIconEntry, x: number, y: number, size: number, color: string): ReactNode {
  if (icon.kind === "glyph") {
    const fontSize = icon.char.length > 1 ? size * 0.85 : size * 1.2;
    return (
      <text x={f(x)} y={f(y)} fontSize={f(fontSize)} fontFamily={SERIF_STACK} fill={color} textAnchor="middle" dominantBaseline="central">
        {icon.char}
      </text>
    );
  }
  return (
    <g transform={`translate(${f(x - size / 2)} ${f(y - size / 2)}) scale(${Math.round((size / 256) * 10000) / 10000})`} fill={color}>
      {icon.paths.map((p, i) => (
        <path key={i} d={p.d} opacity={p.opacity} />
      ))}
    </g>
  );
}

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

type CoverArtProps = {
  cover: ResolvedCover;
  variant: CoverVariant;
  theme?: CoverTheme;
  className?: string;
};

/**
 * The background layer of a class card or banner. Absolutely positioned: drop it
 * as the first child of any positioned container and put the content after it.
 */
export function CoverArt(props: CoverArtProps): ReactElement {
  const theme = props.theme ?? "light";
  const g = GEOMETRY[props.variant];
  const surface = coverSurface(props.cover, props.variant, theme);
  const ink = inkFor(surface, props.variant, theme);
  // Includes the preset so that, if two React roots ever produce the same useId,
  // the clashing gradients are identical anyway.
  const gradientId = safeId(`cover-${props.cover.presetId}-${props.variant}-${theme}-${useId()}`);
  const drawn = renderPattern(props.cover.pattern, g, ink, props.cover.icon !== null);
  const iconColor = props.variant === "banner" ? "#FFFFFF" : theme === "dark" ? surface.ink : "#FFFFFF";
  const className = props.className ? `${styles.art} ${props.className}` : styles.art;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${g.width} ${g.height}`}
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      data-cover-preset={props.cover.presetId}
      data-cover-icon={props.cover.icon ? props.cover.icon.id : "none"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2={props.variant === "banner" ? "0.35" : "1"}>
          <stop offset="0" stopColor={surface.from} />
          <stop offset="1" stopColor={surface.to} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={g.width} height={g.height} fill={`url(#${gradientId})`} />
      {drawn.shapes}
      {props.cover.icon ? (
        <g opacity={props.variant === "banner" ? 0.95 : 1}>{renderCoverIcon(props.cover.icon, drawn.anchor.x, drawn.anchor.y, drawn.anchor.size, iconColor)}</g>
      ) : null}
    </svg>
  );
}

type CoverIconMarkProps = {
  icon: CoverIconEntry;
  size?: number;
  className?: string;
};

/** A standalone icon/glyph in currentColor — used for picker tiles. */
export function CoverIconMark(props: CoverIconMarkProps): ReactElement {
  const size = props.size ?? 24;
  return (
    <svg className={props.className} width={size} height={size} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      {renderCoverIcon(props.icon, 128, 128, 232, "currentColor")}
    </svg>
  );
}

/**
 * Text colours for content placed on a cover, as CSS custom properties.
 * Assign the returned object to the container's style prop, then use the
 * variables in the container's CSS Module:
 *   <article style={coverStyleVars(cover, "card")}>   →   color: var(--cover-ink);
 */
export function coverStyleVars(cover: ResolvedCover, variant: CoverVariant, theme: CoverTheme = "light"): CSSProperties {
  const surface = coverSurface(cover, variant, theme);
  let chipBg = "rgba(255, 255, 255, 0.6)";
  let chipInk = surface.ink;
  if (variant === "banner") {
    // Dark translucent chips keep small white text above 4.5:1 on every banner palette.
    chipBg = "rgba(0, 0, 0, 0.18)";
    chipInk = "#FFFFFF";
  } else if (theme === "dark") {
    chipBg = "rgba(255, 255, 255, 0.08)";
  }
  const vars: Record<string, string> = {
    "--cover-ink": surface.ink,
    "--cover-ink-muted": surface.inkMuted,
    "--cover-chip-bg": chipBg,
    "--cover-chip-ink": chipInk,
  };
  return vars as CSSProperties;
}
