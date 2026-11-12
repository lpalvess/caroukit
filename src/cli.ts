import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPdf } from "./pdf";
import { type OutputSpec, resolveOutput } from "./presets";
import { renderDeck } from "./render";
import type { Finding } from "./schema";
import { parseAndValidate } from "./validate";

const OUTPUT_OPTIONS = "[--preset instagram|tiktok|linkedin|generic] [--size <WIDTHxHEIGHT>]";
const VALIDATE_USAGE = `usage: validate <slides-file> ${OUTPUT_OPTIONS}`;
const RENDER_USAGE = `usage: render <slides-file> [--out <directory>] ${OUTPUT_OPTIONS}`;

/** A LinkedIn document upload is limited to this many bytes. */
export const LINKEDIN_PDF_MAX_BYTES = 100_000_000;

/** Exact names this tool writes: NN-<type>.png and carousel.pdf. Nothing else is ever deleted. */
const PRODUCT_PNG = /^[0-9]{2}-(hook|text|number|list|quote|cta)\.png$/;

/** Legacy option, accepted only to warn. Its value is never read, stat'ed or resolved. */
export const FACTS_DEPRECATED =
  "warning: --facts is deprecated and ignored; numbers are no longer checked. Remove this option. It will be rejected in 2.0.0.";

const REVIEW_NOTE = "Review content before publishing; factual accuracy is not checked.";

export function formatFinding(f: Finding): string {
  return `${f.severity} slide ${f.slide} ${f.rule}: ${f.message}`;
}

async function readText(path: string): Promise<{ text: string } | { line: string }> {
  try {
    return { text: await readFile(path, "utf8") };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return { line: `error: cannot read ${path} (${detail})` };
  }
}

interface ParsedArgs {
  slidesPath: string;
  legacyFacts: boolean;
  outDir?: string;
  preset?: string;
  size?: string;
  /** Set when an output option is misused, with the reason. */
  optionError?: string;
}

/** Positional slides file plus the listed value flags. Returns undefined on any misuse. */
function parseArgs(args: string[], flags: readonly "--out"[]): ParsedArgs | undefined {
  let preset: string | undefined;
  let size: string | undefined;
  let optionError: string | undefined;
  let slidesPath: string | undefined;
  let legacyFacts = false;
  let outDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--facts") {
      // The value is skipped without being used. A missing value or another option is misuse.
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) return undefined;
      legacyFacts = true;
      i++;
    } else if (arg === "--preset" || arg === "--size") {
      const value = args[i + 1];
      const seen = arg === "--preset" ? preset : size;
      if (value === undefined || value.startsWith("--")) {
        optionError ??= `${arg} needs a value`;
      } else {
        i++;
        if (seen !== undefined) optionError ??= `${arg} was given more than once`;
        else if (arg === "--preset") preset = value;
        else size = value;
      }
    } else if (arg === "--out" && flags.includes("--out")) {
      outDir = args[i + 1];
      if (outDir === undefined || outDir.startsWith("--")) return undefined;
      i++;
    } else if (arg !== undefined && slidesPath === undefined && !arg.startsWith("--")) {
      slidesPath = arg;
    } else {
      return undefined;
    }
  }
  if (slidesPath === undefined) return undefined;
  const parsed: ParsedArgs = { slidesPath, legacyFacts };
  if (outDir !== undefined) parsed.outDir = outDir;
  if (preset !== undefined) parsed.preset = preset;
  if (size !== undefined) parsed.size = size;
  if (optionError !== undefined) parsed.optionError = optionError;
  return parsed;
}

/** Resolves the output options. Returns an error line when the options are invalid. */
function outputOf(
  parsed: ParsedArgs,
  meta: Parameters<typeof resolveOutput>[1],
): { output: OutputSpec } | { error: string } {
  if (parsed.optionError !== undefined) return { error: `error: ${parsed.optionError}` };
  const opts: { preset?: string; size?: string } = {};
  if (parsed.preset !== undefined) opts.preset = parsed.preset;
  if (parsed.size !== undefined) opts.size = parsed.size;
  const r = resolveOutput(opts, meta);
  return r.ok ? { output: r.output } : { error: `error: ${r.message}` };
}

/** Removes the files an earlier run wrote, so they cannot be mistaken for this run's output. */
async function removeStaleOutputs(outDir: string): Promise<void> {
  const names = await readdir(outDir).catch(() => [] as string[]);
  for (const name of names) {
    if (PRODUCT_PNG.test(name)) await rm(join(outDir, name), { force: true }).catch(() => undefined);
  }
  await rm(join(outDir, "carousel.pdf"), { force: true }).catch(() => undefined);
}

/**
 * validate <slides-file>
 * Exit code: 0 no errors (warnings do not count), 1 at least one error,
 * 2 a file could not be read or the arguments are wrong (including --preset and --size).
 * The deprecated --facts <file> only adds a warning; the file is never touched.
 */
export async function runValidate(args: string[]): Promise<{ code: number; lines: string[] }> {
  const parsed = parseArgs(args, []);
  if (parsed === undefined) return { code: 2, lines: [VALIDATE_USAGE] };

  const lines: string[] = parsed.legacyFacts ? [FACTS_DEPRECATED] : [];
  // Option validity does not depend on the deck, so bad options are reported first.
  const checked = outputOf(parsed, undefined);
  if ("error" in checked) return { code: 2, lines: [...lines, checked.error, VALIDATE_USAGE] };
  const slides = await readText(parsed.slidesPath);
  if ("line" in slides) return { code: 2, lines: [...lines, slides.line] };

  const { findings, deck } = parseAndValidate(slides.text);
  lines.push(...findings.map(formatFinding));
  if (deck === undefined) return { code: 1, lines };

  lines.push(`ok: ${deck.slides.length} slides passed technical validation`);
  return { code: 0, lines };
}

/** The two steps that can fail at run time. Tests replace them to prove the failure paths. */
export interface RenderDeps {
  renderDeck: typeof renderDeck;
  buildPdf: typeof buildPdf;
}

/** The step a render failure happened in, named in the error line. */
type Step = "render" | "pdf" | "write";

function failure(step: Step, err: unknown): string {
  const detail = err instanceof Error ? err.message : "unknown error";
  return `error: ${step} failed: ${detail}`;
}

/**
 * render <slides-file> [--out <directory>] [--preset <name>] [--size <WIDTHxHEIGHT>]
 * Validates first and stops with the validator's code on any error. Then writes one
 * PNG per slide (NN-<type>.png) and carousel.pdf into the output directory (default out).
 * Exit code: 0 done, 1 validation errors, 2 unreadable file or wrong arguments,
 * 3 a render, pdf or write step failed. A failed run never leaves carousel.pdf behind.
 * onLine receives each output line as it is produced, so progress shows while rendering.
 */
export async function runRender(
  args: string[],
  onLine?: (line: string) => void,
  deps: Partial<RenderDeps> = {},
): Promise<{ code: number; lines: string[] }> {
  const render = deps.renderDeck ?? renderDeck;
  const makePdf = deps.buildPdf ?? buildPdf;
  const lines: string[] = [];
  const emit = (line: string) => {
    lines.push(line);
    onLine?.(line);
  };
  const done = (code: number) => ({ code, lines });

  const parsed = parseArgs(args, ["--out"]);
  if (parsed === undefined) {
    emit(RENDER_USAGE);
    return done(2);
  }
  if (parsed.legacyFacts) emit(FACTS_DEPRECATED);
  const checked = outputOf(parsed, undefined);
  if ("error" in checked) {
    emit(checked.error);
    emit(RENDER_USAGE);
    return done(2);
  }
  const outDir = parsed.outDir ?? "out";
  const pdfPath = join(outDir, "carousel.pdf");

  // Files from an earlier run must never be mistaken for the output of this one.
  // If they cannot be removed (for example the output path is a file), the write step
  // reports the real problem later, so the error is deliberately not handled here.
  await removeStaleOutputs(outDir);

  const slides = await readText(parsed.slidesPath);
  if ("line" in slides) {
    emit(slides.line);
    return done(2);
  }
  const { findings, deck } = parseAndValidate(slides.text);
  for (const finding of findings) emit(formatFinding(finding));
  if (deck === undefined) return done(1);

  // Same options as above, now with the deck's legacy meta.format for the no-flag case.
  const resolved = outputOf(parsed, deck.meta);
  if ("error" in resolved) {
    emit(resolved.error);
    return done(2);
  }
  const output = resolved.output;

  let rendered;
  try {
    rendered = await render(deck, (i, n) => emit(`slide ${i}/${n}`), output);
  } catch (err) {
    emit(failure("render", err));
    return done(3);
  }

  let pdf: Uint8Array;
  try {
    pdf = makePdf(rendered.map((s) => ({ width: s.width, height: s.height, rgba: s.rgba })));
    if (output.preset === "linkedin" && pdf.length > LINKEDIN_PDF_MAX_BYTES) {
      throw new Error(`the PDF has ${pdf.length} bytes, LinkedIn allows at most ${LINKEDIN_PDF_MAX_BYTES}`);
    }
  } catch (err) {
    emit(failure("pdf", err));
    return done(3);
  }

  const tmpPath = `${pdfPath}.tmp`;
  try {
    await mkdir(outDir, { recursive: true });
    for (const s of rendered) {
      const name = `${String(s.index).padStart(2, "0")}-${s.type}.png`;
      await writeFile(join(outDir, name), s.png);
    }
    await writeFile(tmpPath, pdf);
    await rename(tmpPath, pdfPath);
  } catch (err) {
    // Cleanup is best effort: the original error is the one worth reporting.
    await rm(tmpPath, { force: true }).catch(() => undefined);
    await rm(pdfPath, { force: true }).catch(() => undefined);
    emit(failure("write", err));
    return done(3);
  }
  emit(`done: ${rendered.length} PNGs and carousel.pdf created`);
  emit(REVIEW_NOTE);
  return done(0);
}

if (import.meta.main) {
  const [command, ...rest] = Bun.argv.slice(2);
  if (command === "validate") {
    const r = await runValidate(rest);
    for (const line of r.lines) console.log(line);
    process.exit(r.code);
  }
  if (command === "render") {
    const r = await runRender(rest, (line) => console.log(line));
    process.exit(r.code);
  }
  console.error(`usage: cli.ts <validate|render> <slides-file> [--out <directory>] ${OUTPUT_OPTIONS}`);
  process.exit(2);
}
