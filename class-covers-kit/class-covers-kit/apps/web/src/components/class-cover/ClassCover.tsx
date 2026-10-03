import type { ReactElement, ReactNode } from "react";
import type { CoverTheme, CoverVariant, ResolvedCover } from "@klasio/shared/class-covers";
import { CoverArt, coverStyleVars } from "./CoverArt";
import styles from "./ClassCover.module.css";

type ClassCoverProps = {
  cover: ResolvedCover;
  variant: CoverVariant;
  theme?: CoverTheme;
  className?: string;
  children?: ReactNode;
};

/**
 * Convenience wrapper: a positioned box with the cover art behind its children
 * and the --cover-* text colour variables set. Use it for new surfaces (picker
 * preview, gallery). Existing cards and banners should keep their own markup
 * and add <CoverArt> + coverStyleVars() instead.
 */
export function ClassCover(props: ClassCoverProps): ReactElement {
  const theme = props.theme ?? "light";
  const className = props.className ? `${styles.cover} ${props.className}` : styles.cover;
  return (
    <div className={className} style={coverStyleVars(props.cover, props.variant, theme)} data-variant={props.variant}>
      <CoverArt cover={props.cover} variant={props.variant} theme={theme} />
      <div className={styles.content}>{props.children}</div>
    </div>
  );
}
