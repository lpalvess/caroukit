import type { FormatId, Meta, Theme } from "./types";

/** Pixel size of the canvas. Structurally the same as OutputSpec without the preset name. */
export interface Canvas {
  width: number;
  height: number;
}

/** Font files bundled in the repository. Nothing is fetched at run time. */
export const FONTS: readonly { name: "Inter"; weight: 500 | 700 | 800; file: string }[] = [
  { name: "Inter", weight: 500, file: "src/fonts/inter-latin-500-normal.woff2" },
  { name: "Inter", weight: 700, file: "src/fonts/inter-latin-700-normal.woff2" },
  { name: "Inter", weight: 800, file: "src/fonts/inter-latin-800-normal.woff2" },
];

export const FORMATS: Record<FormatId, { width: number; height: number }> = {
  "linkedin-square": { width: 1080, height: 1080 },
  "linkedin-portrait": { width: 1080, height: 1350 },
};

export interface ThemeTokens {
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Padding around the slide, in px. */
  padding: number;
  /** Base font sizes per role, in px, before fontScale is applied. */
  size: {
    hook: number;
    title: number;
    body: number;
    value: number;
    label: number;
    quote: number;
    item: number;
    footer: number;
  };
  /** Font weights per role. Only 500, 700 and 800 are bundled. */
  weight: {
    body: 500 | 700 | 800;
    title: 500 | 700 | 800;
    hook: 500 | 700 | 800;
    value: 500 | 700 | 800;
    highlight: 500 | 700 | 800;
    footer: 500 | 700 | 800;
  };
  lineHeight: number;
  /** min(width, height) / 1080. Every pixel constant is multiplied by it. */
  scale: number;
  /** Height of the footer row under the content, in px. Fits two lines of source text. */
  footerReserve: number;
}

export const DEFAULT_THEME: Theme = "dark";
export const DEFAULT_FORMAT: FormatId = "linkedin-square";

const BASE = {
  padding: 88,
  size: { hook: 104, title: 64, body: 44, value: 260, label: 52, quote: 60, item: 40, footer: 24 },
  weight: { body: 500, title: 700, hook: 800, value: 800, highlight: 800, footer: 500 },
  lineHeight: 1.25,
} as const;

/**
 * Default accent is chosen per theme so the highlight stays readable on both
 * backgrounds (a single yellow would be too faint on a light background).
 */
const PALETTES: Record<Theme, Pick<ThemeTokens, "background" | "text" | "textMuted" | "accent">> = {
  dark: { background: "#0B0F14", text: "#F5F7FA", textMuted: "#9AA4B2", accent: "#FFC83D" },
  light: { background: "#FAFAF7", text: "#11151A", textMuted: "#4B5563", accent: "#B45309" },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Smallest footer font, so text stays legible on the smallest canvases. */
const MIN_FOOTER = 14;
/** Longest source the validator allows, and a pessimistic glyph width for it. */
const MAX_SOURCE_CHARS = 80;
const GLYPH_EM = 0.6;

const scaled = (value: number, scale: number): number => Math.max(1, Math.round(value * scale));

/**
 * Resolves theme colors (independent of the output) and size tokens. Without `output` the
 * canvas comes from meta.format at the base 1080 scale, as before.
 */
export function resolveTheme(
  meta: Meta | undefined,
  output?: Canvas,
): {
  tokens: ThemeTokens;
  width: number;
  height: number;
  theme: Theme;
  format: FormatId;
} {
  const theme: Theme = meta?.theme === "light" ? "light" : DEFAULT_THEME;
  const format: FormatId = meta?.format === "linkedin-portrait" ? "linkedin-portrait" : DEFAULT_FORMAT;
  const palette = PALETTES[theme];
  const accent = typeof meta?.accent === "string" && HEX_COLOR.test(meta.accent) ? meta.accent : palette.accent;
  const { width, height } = output ?? FORMATS[format];
  const scale = Math.min(width, height) / 1080;
  const size = Object.fromEntries(
    Object.entries(BASE.size).map(([k, v]) => [k, scaled(v, scale)]),
  ) as unknown as ThemeTokens["size"];
  size.footer = Math.max(MIN_FOOTER, size.footer);
  if (scale === 1) size.footer = BASE.size.footer;
  const padding = scaled(BASE.padding, scale);
  // Footer: the source gets the width left beside the slide counter (up to 8 glyphs) and the gap.
  const gap = scaled(24, scale);
  const sourceWidth = width - 2 * padding - 8 * size.footer * GLYPH_EM - gap;
  const lines = Math.max(1, Math.ceil((MAX_SOURCE_CHARS * size.footer * GLYPH_EM) / Math.max(1, sourceWidth)));
  const footerReserve = Math.ceil(lines * size.footer * BASE.lineHeight) + gap;
  return {
    tokens: {
      ...palette,
      accent,
      padding,
      size,
      weight: { ...BASE.weight },
      lineHeight: BASE.lineHeight,
      scale,
      footerReserve,
    },
    width,
    height,
    theme,
    format,
  };
}
