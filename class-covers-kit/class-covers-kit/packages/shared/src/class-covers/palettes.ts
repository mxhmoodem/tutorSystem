import type { CoverPalette, CoverPaletteId } from "./types";

// Cover palettes are content colours, not UI tokens: they only ever paint class covers.
// Every ink/surface pair is checked for WCAG AA (4.5:1) in class-covers.test.ts —
// if you add or tweak a palette, run the tests.

export const COVER_PALETTES: Readonly<Record<CoverPaletteId, CoverPalette>> = {
  ember: {
    id: "ember",
    label: "Ember",
    card: { from: "#FCEEE2", to: "#F2CDAE", shape: "#E08A55", ink: "#6B2F12", inkMuted: "#7E4220" },
    cardDark: { from: "#2A1A12", to: "#3A2418", shape: "#E08A55", ink: "#FCEEE2", inkMuted: "#E9C3A6" },
    banner: { from: "#B25E30", to: "#843F1C", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  lavender: {
    id: "lavender",
    label: "Lavender",
    card: { from: "#F0ECFC", to: "#D6CDF6", shape: "#8A78E0", ink: "#2E2270", inkMuted: "#4F43A0" },
    cardDark: { from: "#1D1838", to: "#29224F", shape: "#8A78E0", ink: "#F0ECFC", inkMuted: "#C9C0F2" },
    banner: { from: "#6A57CC", to: "#4A38A2", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  sky: {
    id: "sky",
    label: "Sky",
    card: { from: "#E8F1FC", to: "#C3DAF4", shape: "#5B97DE", ink: "#16365A", inkMuted: "#345A82" },
    cardDark: { from: "#12233A", to: "#18314F", shape: "#5B97DE", ink: "#E8F1FC", inkMuted: "#AFCBEB" },
    banner: { from: "#2F76A0", to: "#235878", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  sage: {
    id: "sage",
    label: "Sage",
    card: { from: "#E6F4EC", to: "#C4E5D2", shape: "#4FA980", ink: "#173F2E", inkMuted: "#2F6149" },
    cardDark: { from: "#122620", to: "#18352B", shape: "#4FA980", ink: "#E6F4EC", inkMuted: "#AED8C0" },
    banner: { from: "#377A60", to: "#275843", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  rose: {
    id: "rose",
    label: "Rose",
    card: { from: "#FCEAF0", to: "#F2C7D5", shape: "#D66A90", ink: "#5A1830", inkMuted: "#83304F" },
    cardDark: { from: "#2B141D", to: "#3C1C29", shape: "#D66A90", ink: "#FCEAF0", inkMuted: "#EDB8CB" },
    banner: { from: "#B84C72", to: "#86304F", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  amber: {
    id: "amber",
    label: "Amber",
    card: { from: "#FBF2DD", to: "#F0DBA6", shape: "#D49A30", ink: "#4F3308", inkMuted: "#6E4A10" },
    cardDark: { from: "#261D0C", to: "#352912", shape: "#D49A30", ink: "#FBF2DD", inkMuted: "#E8D29E" },
    banner: { from: "#94651A", to: "#6E4A10", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  teal: {
    id: "teal",
    label: "Teal",
    card: { from: "#E2F5F4", to: "#B7E3E0", shape: "#2E9F97", ink: "#0E3E3B", inkMuted: "#1D5F5A" },
    cardDark: { from: "#0E2524", to: "#133432", shape: "#2E9F97", ink: "#E2F5F4", inkMuted: "#A5DAD6" },
    banner: { from: "#1F7F78", to: "#145955", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
  slate: {
    id: "slate",
    label: "Slate",
    card: { from: "#EDEFF3", to: "#D3D8E1", shape: "#6C7A92", ink: "#1F2737", inkMuted: "#3E4A60" },
    cardDark: { from: "#1A1E26", to: "#242A35", shape: "#6C7A92", ink: "#EDEFF3", inkMuted: "#C3CAD6" },
    banner: { from: "#4E5B73", to: "#303A4D", shape: "#FFFFFF", ink: "#FFFFFF", inkMuted: "#FFFFFF" },
  },
};
