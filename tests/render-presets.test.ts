import { describe, expect, test } from "bun:test";
import { renderDeck, renderSlideSvg } from "../src/render";
import type { Deck, Slide } from "../src/types";

const SOURCE80 = "Fonte: ".padEnd(80, "x");

const ONE_OF_EACH: Slide[] = [
  { type: "hook", text: "Gancho de exemplo com algumas palavras", highlight: "Gancho", source: SOURCE80 },
  { type: "text", title: "Título", text: "Corpo do slide de exemplo com texto razoável.", source: SOURCE80 },
  { type: "number", value: "30.000", label: "mudanças por dia", source: SOURCE80 },
  { type: "list", title: "Lista", items: ["um item", "outro item", "mais um"], source: SOURCE80 },
  { type: "quote", text: "Uma citação curta de exemplo.", author: "Autor", source: SOURCE80 },
  { type: "cta", text: "Fim da conversa", handle: "@exemplo", source: SOURCE80 },
];
const deck: Deck = { slides: ONE_OF_EACH };

const SIZES = [
  { preset: "tiktok" as const, width: 720, height: 1280 },
  { preset: "generic" as const, width: 540, height: 540 },
  { preset: "generic" as const, width: 2160, height: 1080 },
  { preset: "instagram" as const, width: 1080, height: 1350 },
];

describe("every layout adapts to the output size", () => {
  for (const out of SIZES) {
    test(`${out.width}x${out.height}: all six layouts render at native size`, async () => {
      const slides = await renderDeck(deck, undefined, out);
      expect(slides).toHaveLength(6);
      for (const s of slides) {
        expect([s.width, s.height]).toEqual([out.width, out.height]);
        expect(s.rgba.length).toBe(out.width * out.height * 4);
      }
    });
  }

  test("the SVG root has the requested size and fonts follow min(width,height)/1080", async () => {
    const small = await renderSlideSvg(deck, 0, { width: 540, height: 540 });
    const base = await renderSlideSvg(deck, 0);
    expect([small.width, small.height]).toEqual([540, 540]);
    expect([base.width, base.height]).toEqual([1080, 1080]);
    const bbox = (svg: string) => {
      const m = svg.match(/viewBox="([^"]+)"/);
      return m?.[1];
    };
    expect(bbox(small.svg)).toBe("0 0 540 540");
    expect(bbox(base.svg)).toBe("0 0 1080 1080");
  });

  test("default signatures still work without an output", async () => {
    const [first] = await renderDeck({ slides: [ONE_OF_EACH[0] as Slide] });
    expect([first?.width, first?.height]).toEqual([1080, 1080]);
  });

  test("the slide counter and an 80 character source do not overlap in the footer", async () => {
    // Pixels in the footer band must stay inside the padding: nothing is painted in the outer margin.
    const out = { preset: "generic" as const, width: 540, height: 540 };
    const [s] = await renderDeck({ slides: [ONE_OF_EACH[1] as Slide] }, undefined, out);
    const bg = [s!.rgba[0]!, s!.rgba[1]!, s!.rgba[2]!];
    const margin = 16; // padding at this scale is 44px, so the outer 16px must be empty
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        if (x >= margin && x < out.width - margin && y >= margin && y < out.height - margin) continue;
        const i = (y * out.width + x) * 4;
        expect([s!.rgba[i], s!.rgba[i + 1], s!.rgba[i + 2]]).toEqual(bg);
      }
    }
  });
});
