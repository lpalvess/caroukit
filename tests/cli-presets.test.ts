import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FACTS_DEPRECATED, runRender, runValidate } from "../src/cli";

const DECK = {
  slides: [
    { type: "hook", text: "Gancho de exemplo", source: "Fonte: exemplo" },
    { type: "number", value: "30.000", label: "mudanças por dia" },
    { type: "text", title: "Título", text: "Corpo do slide de exemplo." },
    { type: "list", title: "Lista", items: ["um", "dois", "três"] },
    { type: "quote", text: "Uma citação curta.", author: "Autor" },
    { type: "cta", text: "Fim", handle: "@exemplo" },
  ],
};

async function setup(deck: unknown = DECK) {
  const dir = await mkdtemp(join(tmpdir(), "carousel-presets-"));
  const slides = join(dir, "slides.json");
  await writeFile(slides, JSON.stringify(deck));
  return { dir, slides, out: join(dir, "out") };
}

const ls = async (dir: string) => (await readdir(dir)).sort();

function pngSize(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function mediaBoxes(pdf: Buffer): string[] {
  return pdf.toString("latin1").match(/\/MediaBox \[[^\]]*\]/g) ?? [];
}

const BAD_OPTION_SETS: [string, string[]][] = [
  ["unknown preset", ["--preset", "myspace"]],
  ["prototype preset", ["--preset", "__proto__"]],
  ["missing preset value", ["--preset"]],
  ["preset value is an option", ["--preset", "--size", "800x800"]],
  ["missing size value", ["--size"]],
  ["size value is an option", ["--size", "--preset", "generic"]],
  ["repeated preset", ["--preset", "generic", "--preset", "generic"]],
  ["repeated size", ["--size", "800x800", "--size", "800x800"]],
  ["named preset with size", ["--preset", "tiktok", "--size", "800x800"]],
  ["partial size", ["--size", "800"]],
  ["decimal size", ["--size", "800.5x800"]],
  ["too small", ["--size", "539x800"]],
  ["too many pixels", ["--size", "2160x1200"]],
  ["bad ratio", ["--size", "540x1200"]],
];

describe("validate accepts and checks output options", () => {
  test("a valid preset and size do not change the validation result", async () => {
    const { slides } = await setup();
    const plain = await runValidate([slides]);
    expect(await runValidate([slides, "--preset", "tiktok"])).toEqual(plain);
    expect(await runValidate([slides, "--size", "900x900"])).toEqual(plain);
    expect(plain.code).toBe(0);
  });

  test.each(BAD_OPTION_SETS)("%s exits 2 with an explanation", async (_name, flags) => {
    const { slides } = await setup();
    const r = await runValidate([slides, ...flags]);
    expect(r.code).toBe(2);
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.lines.join("\n")).toContain("usage");
  });

  test("validation findings still win with valid options (code 1)", async () => {
    const { slides } = await setup({ slides: [{ type: "hook", text: "tem — travessão" }] });
    expect((await runValidate([slides, "--preset", "instagram"])).code).toBe(1);
  });
});

describe("render rejects bad options before touching anything", () => {
  test.each(BAD_OPTION_SETS)("%s exits 2 and writes and deletes nothing", async (_name, flags) => {
    const { slides, out } = await setup();
    await mkdir(out);
    await writeFile(join(out, "carousel.pdf"), "old");
    const r = await runRender([slides, "--out", out, ...flags]);
    expect(r.code).toBe(2);
    expect(r.lines.some((l) => l.startsWith("error:"))).toBe(true);
    expect(await ls(out)).toEqual(["carousel.pdf"]);
  });

  test("--facts still warns exactly once next to new options", async () => {
    const { slides, out } = await setup();
    const r = await runRender([slides, "--facts", "/no/such/file", "--preset", "tiktok", "--out", out]);
    expect(r.code).toBe(0);
    expect(r.lines.filter((l) => l === FACTS_DEPRECATED)).toHaveLength(1);
  });
});

describe("render uses the native size of the resolved output", () => {
  const cases: [string[], number, number][] = [
    [[], 1080, 1080],
    [["--preset", "instagram"], 1080, 1350],
    [["--preset", "tiktok"], 720, 1280],
    [["--preset", "linkedin"], 1080, 1350],
    [["--preset", "generic"], 1080, 1080],
    [["--size", "1200x628"], 1200, 628],
    [["--size", "540x1080"], 540, 1080],
  ];
  test.each(cases)("%p gives %ix%i PNGs and PDF pages", async (flags, width, height) => {
    const { slides, out } = await setup();
    const r = await runRender([slides, "--out", out, ...flags]);
    expect(r.code).toBe(0);
    const names = await ls(out);
    expect(names).toHaveLength(7);
    for (const n of names.filter((x) => x.endsWith(".png"))) {
      expect(pngSize(await readFile(join(out, n)))).toEqual({ width, height });
    }
    const boxes = mediaBoxes(await readFile(join(out, "carousel.pdf")));
    expect(boxes).toHaveLength(6);
    for (const b of boxes) expect(b).toBe(`/MediaBox [0 0 ${width} ${height}]`);
  });

  test("legacy meta.format portrait applies without flags and --preset overrides it", async () => {
    const deck = { meta: { format: "linkedin-portrait" }, slides: DECK.slides };
    const a = await setup(deck);
    expect((await runRender([a.slides, "--out", a.out])).code).toBe(0);
    expect(pngSize(await readFile(join(a.out, "01-hook.png")))).toEqual({ width: 1080, height: 1350 });
    const b = await setup(deck);
    expect((await runRender([b.slides, "--out", b.out, "--preset", "generic"])).code).toBe(0);
    expect(pngSize(await readFile(join(b.out, "01-hook.png")))).toEqual({ width: 1080, height: 1080 });
  });

  test("the output is passed to the render step, separate from slide content", async () => {
    const { slides, out } = await setup();
    let seen: unknown;
    await runRender([slides, "--out", out, "--preset", "tiktok"], undefined, {
      renderDeck: async (_deck, _progress, output) => {
        seen = output;
        throw new Error("stop");
      },
    });
    expect(seen).toMatchObject({ preset: "tiktok", width: 720, height: 1280 });
  });

  test("each preset is byte-deterministic", async () => {
    for (const preset of ["instagram", "tiktok", "linkedin", "generic"]) {
      const a = await setup();
      const b = await setup();
      await runRender([a.slides, "--out", a.out, "--preset", preset]);
      await runRender([b.slides, "--out", b.out, "--preset", preset]);
      expect((await readFile(join(a.out, "carousel.pdf"))).equals(await readFile(join(b.out, "carousel.pdf")))).toBe(true);
      expect((await readFile(join(a.out, "03-text.png"))).equals(await readFile(join(b.out, "03-text.png")))).toBe(true);
    }
  });
});

describe("linkedin PDF size cap", () => {
  test("a PDF over 100,000,000 bytes fails at the pdf step and leaves nothing", async () => {
    const { slides, out } = await setup();
    const r = await runRender([slides, "--out", out, "--preset", "linkedin"], undefined, {
      buildPdf: () => ({ length: 100_000_001 }) as unknown as Uint8Array,
    });
    expect(r.code).toBe(3);
    expect(r.lines[r.lines.length - 1]).toContain("error: pdf failed:");
    await expect(readdir(out)).rejects.toThrow();
  });

  test("exactly 100,000,000 bytes passes the cap and other presets are not capped", async () => {
    const big = () => new Uint8Array(100_000_000);
    const a = await setup();
    expect((await runRender([a.slides, "--out", a.out, "--preset", "linkedin"], undefined, { buildPdf: big })).code).toBe(0);
    const b = await setup();
    const over = () => new Uint8Array(100_000_001);
    expect((await runRender([b.slides, "--out", b.out, "--preset", "generic"], undefined, { buildPdf: over })).code).toBe(0);
  });
});

describe("stale outputs", () => {
  test("old product PNGs and PDF are removed before an invalid deck fails; unrelated files stay", async () => {
    const { dir, out } = await setup();
    const bad = join(dir, "bad.json");
    await writeFile(bad, "{ not json");
    await mkdir(out);
    for (const n of ["01-hook.png", "07-cta.png", "10-quote.png", "carousel.pdf", "notes.txt", "01-other.png", "1-hook.png", "01-hook.png.bak", "cover.png"]) {
      await writeFile(join(out, n), "old");
    }
    const r = await runRender([bad, "--out", out, "--preset", "tiktok"]);
    expect(r.code).toBe(1);
    expect(await ls(out)).toEqual(["01-hook.png.bak", "01-other.png", "1-hook.png", "cover.png", "notes.txt"]);
  });

  test("a shorter deck does not leave PNGs of a previous longer deck", async () => {
    const { dir, slides, out } = await setup();
    expect((await runRender([slides, "--out", out])).code).toBe(0);
    const short = join(dir, "short.json");
    await writeFile(short, JSON.stringify({ slides: [DECK.slides[0], DECK.slides[1], DECK.slides[5]] }));
    expect((await runRender([short, "--out", out])).code).toBe(0);
    expect(await ls(out)).toEqual(["01-hook.png", "02-number.png", "03-cta.png", "carousel.pdf"]);
  });

  test("a text overflow at a small size fails with code 3 and leaves no stale output", async () => {
    const { dir, out } = await setup();
    await mkdir(out);
    await writeFile(join(out, "carousel.pdf"), "old");
    const deck = join(dir, "long.json");
    await writeFile(deck, JSON.stringify({ slides: [DECK.slides[0], { type: "text", title: "T", text: "a".repeat(300) }, DECK.slides[5]] }));
    const r = await runRender([deck, "--out", out, "--size", "540x540"]);
    expect(r.code).toBe(3);
    expect(await ls(out)).toEqual([]);
  });
});
