/**
 * Output presets. Pure resolution of the CLI output options (--preset, --size) and the
 * legacy meta.format into one canvas size. Slide content never carries output settings.
 */
import type { FormatId, Meta } from "./types";

export type PresetId = "instagram" | "tiktok" | "linkedin" | "generic";

export interface OutputSpec {
  /** The preset in effect. "legacy" means no flag was given and meta.format decided. */
  preset: PresetId | "legacy";
  width: number;
  height: number;
}

export const PRESETS: Readonly<Record<PresetId, { width: number; height: number }>> = {
  instagram: { width: 1080, height: 1350 },
  tiktok: { width: 720, height: 1280 },
  linkedin: { width: 1080, height: 1350 },
  generic: { width: 1080, height: 1080 },
};

/** Canvas of the legacy meta.format values. */
const LEGACY_FORMATS: Readonly<Record<FormatId, { width: number; height: number }>> = {
  "linkedin-square": { width: 1080, height: 1080 },
  "linkedin-portrait": { width: 1080, height: 1350 },
};

export const MIN_EDGE = 540;
export const MAX_EDGE = 2160;
export const MAX_PIXELS = 2_500_000;
export const MIN_RATIO = 0.5;
export const MAX_RATIO = 2;

export type OutputResult = { ok: true; output: OutputSpec } | { ok: false; message: string };

const fail = (message: string): OutputResult => ({ ok: false, message });

/** Plain decimal WIDTHxHEIGHT: ASCII digits only, no sign, no leading zero, lowercase x. */
const SIZE = /^([1-9][0-9]*)x([1-9][0-9]*)$/;

function parseSize(size: string): OutputResult {
  const m = SIZE.exec(size);
  if (m === null) return fail(`invalid --size "${size}": use WIDTHxHEIGHT in whole decimal pixels, for example 1080x1350`);
  const width = Number(m[1]);
  const height = Number(m[2]);
  for (const edge of [width, height]) {
    if (!Number.isSafeInteger(edge) || edge < MIN_EDGE || edge > MAX_EDGE) {
      return fail(`invalid --size "${size}": each edge must be between ${MIN_EDGE} and ${MAX_EDGE} pixels`);
    }
  }
  if (width * height > MAX_PIXELS) {
    return fail(`invalid --size "${size}": more than ${MAX_PIXELS} pixels`);
  }
  const ratio = width / height;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    return fail(`invalid --size "${size}": ratio width/height must be between ${MIN_RATIO} and ${MAX_RATIO}`);
  }
  return { ok: true, output: { preset: "generic", width, height } };
}

/**
 * Resolves the output canvas. --preset beats meta.format; --size alone means generic;
 * a named platform preset does not accept a size; without flags meta.format decides.
 */
export function resolveOutput(opts: { preset?: string; size?: string }, meta?: Meta): OutputResult {
  const { preset, size } = opts;
  if (preset !== undefined && !Object.hasOwn(PRESETS, preset)) {
    return fail(`unknown preset "${preset}": use instagram, tiktok, linkedin or generic`);
  }
  const id = preset as PresetId | undefined;
  if (id !== undefined && id !== "generic" && size !== undefined) {
    return fail(`preset ${id} has a fixed size and does not accept --size; use --preset generic with --size`);
  }
  if (size !== undefined) return parseSize(size);
  if (id !== undefined) return { ok: true, output: { preset: id, ...PRESETS[id] } };
  const format: FormatId = meta?.format === "linkedin-portrait" ? "linkedin-portrait" : "linkedin-square";
  return { ok: true, output: { preset: "legacy", ...LEGACY_FORMATS[format] } };
}
