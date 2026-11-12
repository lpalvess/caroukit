import { describe, expect, test } from "bun:test";
import { PRESETS, resolveOutput } from "../src/presets";
import { resolveTheme } from "../src/theme";

function ok(opts: { preset?: string; size?: string }, meta?: Parameters<typeof resolveOutput>[1]) {
  const r = resolveOutput(opts, meta);
  if (!r.ok) throw new Error(`expected ok, got: ${r.message}`);
  return r.output;
}

function bad(opts: { preset?: string; size?: string }) {
  const r = resolveOutput(opts);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.message;
}

describe("preset definitions", () => {
  test("have the documented dimensions", () => {
    expect(PRESETS.instagram).toEqual({ width: 1080, height: 1350 });
    expect(PRESETS.tiktok).toEqual({ width: 720, height: 1280 });
    expect(PRESETS.linkedin).toEqual({ width: 1080, height: 1350 });
    expect(PRESETS.generic).toEqual({ width: 1080, height: 1080 });
  });
});

describe("resolveOutput", () => {
  test("without flags keeps legacy meta.format", () => {
    expect(ok({})).toMatchObject({ width: 1080, height: 1080 });
    expect(ok({}, { format: "linkedin-portrait" })).toMatchObject({ width: 1080, height: 1350 });
  });

  test("--preset overrides meta.format", () => {
    expect(ok({ preset: "tiktok" }, { format: "linkedin-portrait" })).toMatchObject({ preset: "tiktok", width: 720, height: 1280 });
    expect(ok({ preset: "generic" }, { format: "linkedin-portrait" })).toMatchObject({ width: 1080, height: 1080 });
  });

  test("--size alone implies generic, and generic accepts a size", () => {
    expect(ok({ size: "1200x628" })).toEqual({ preset: "generic", width: 1200, height: 628 });
    expect(ok({ preset: "generic", size: "800x1000" })).toEqual({ preset: "generic", width: 800, height: 1000 });
  });

  test.each(["instagram", "tiktok", "linkedin"])("named preset %s rejects a size", (preset) => {
    expect(bad({ preset, size: "1080x1080" })).toContain("size");
  });

  test.each(["", "nope", "Instagram", "__proto__", "constructor", "toString", "hasOwnProperty", "prototype"])(
    "unknown preset %p is rejected",
    (preset) => {
      expect(bad({ preset })).toContain("preset");
    },
  );

  test.each(["1080", "1080x", "x1080", "1080X1080", "1080 x 1080", " 1080x1080", "1080x1080 ", "1e3x1000", "0x10ax1000", "1080.0x1080", "1080.5x1080", "-1080x1080", "+1080x1080", "01080x1080", "1080x1080x1", "1080×1080", "", "٣٠٠٠x1000"])(
    "malformed size %p is rejected",
    (size) => {
      expect(bad({ size })).toContain("size");
    },
  );

  test.each(["539x540", "540x539", "2161x1080", "1080x2161", "100x100", "99999999999999999999x1000"])(
    "edge outside 540-2160 %p is rejected",
    (size) => {
      expect(bad({ size })).toContain("540");
    },
  );

  test("edges are inclusive", () => {
    expect(ok({ size: "540x540" })).toMatchObject({ width: 540, height: 540 });
    expect(ok({ size: "1080x2160" })).toMatchObject({ width: 1080, height: 2160 });
    expect(ok({ size: "2160x1080" })).toMatchObject({ width: 2160, height: 1080 });
  });

  test("pixel budget is 2,500,000 inclusive", () => {
    expect(ok({ size: "1600x1562" })).toMatchObject({ width: 1600, height: 1562 }); // 2,499,200
    expect(ok({ size: "2000x1250" })).toMatchObject({ width: 2000, height: 1250 }); // exactly 2,500,000
    expect(bad({ size: "2000x1251" })).toContain("pixel");
    expect(bad({ size: "2160x2160" })).toContain("pixel");
  });

  test("ratio must be within 0.5 to 2 inclusive", () => {
    expect(ok({ size: "540x1080" })).toMatchObject({ width: 540, height: 1080 });
    expect(ok({ size: "2160x1080" })).toMatchObject({ width: 2160, height: 1080 });
    expect(bad({ size: "540x1081" })).toContain("ratio");
    expect(bad({ size: "2000x999" })).toContain("ratio");
  });
});

describe("resolveTheme with an output", () => {
  test("without an output the 1080 tokens are unchanged", () => {
    const r = resolveTheme({ theme: "dark" });
    expect(r.tokens.padding).toBe(88);
    expect(r.tokens.size.hook).toBe(104);
    expect(r.tokens.scale).toBe(1);
  });

  test("tokens scale by min(width,height)/1080 and colors do not depend on output", () => {
    const small = resolveTheme({ theme: "light", accent: "#112233" }, { width: 720, height: 1280 });
    const base = resolveTheme({ theme: "light", accent: "#112233" });
    expect([small.width, small.height]).toEqual([720, 1280]);
    expect(small.tokens.scale).toBeCloseTo(720 / 1080, 5);
    expect(small.tokens.padding).toBe(Math.round(88 * (720 / 1080)));
    expect(small.tokens.size.hook).toBe(Math.round(104 * (720 / 1080)));
    expect(small.tokens.background).toBe(base.tokens.background);
    expect(small.tokens.accent).toBe("#112233");
    expect(small.tokens.textMuted).toBe(base.tokens.textMuted);
  });

  test("the footer reserve leaves room for an 80 character source next to the counter", () => {
    for (const [w, h] of [
      [540, 540],
      [720, 1280],
      [1080, 1080],
      [2160, 1080],
    ] as const) {
      const { tokens } = resolveTheme(undefined, { width: w, height: h });
      const avail = w - 2 * tokens.padding - 8 * tokens.size.footer * 0.6 - Math.round(24 * tokens.scale);
      const lines = Math.ceil((80 * tokens.size.footer * 0.6) / avail);
      expect(tokens.footerReserve).toBeGreaterThanOrEqual(lines * tokens.size.footer * tokens.lineHeight);
    }
  });
});
