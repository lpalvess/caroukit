import { describe, expect, test } from "bun:test";
import { parseDeck } from "../src/schema";
import { FORBIDDEN, parseAndValidate, validate } from "../src/validate";
import type { RawDeck } from "../src/validate";

/** A clean deck, with one slide replaced by `slide`. */
function deckWith(slide: Record<string, unknown>, at = 1): RawDeck {
  const base: Record<string, unknown>[] = [
    { type: "hook", text: "Abertura" },
    { type: "text", title: "Titulo", text: "Corpo" },
    { type: "cta", text: "Fim", handle: "@x" },
  ];
  base[at] = slide;
  return { slides: base };
}

const errors = (deck: RawDeck) => validate(deck).filter((f) => f.severity === "error");
const rulesOf = (deck: RawDeck) => errors(deck).map((f) => f.rule);

describe("numbers in any visible field are plain content", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["cta handle", { type: "cta", text: "Fim", handle: "@conta 77" }],
    ["cta text", { type: "cta", text: "Fim 77", handle: "@x" }],
    ["quote author", { type: "quote", text: "Frase", author: "Autor 77" }],
    ["quote text", { type: "quote", text: "Frase 77", author: "Autor" }],
    ["number label", { type: "number", value: "5", label: "de 77 casos" }],
    ["number value", { type: "number", value: "77", label: "casos" }],
    ["list item", { type: "list", title: "T", items: ["um", "dois 77"] }],
    ["list title", { type: "list", title: "T 77", items: ["um"] }],
    ["text title", { type: "text", title: "T 77", text: "Corpo" }],
    ["hook text", { type: "hook", text: "Gancho 77" }],
  ];
  for (const [name, slide] of cases) {
    test(`${name}: a number gives no finding at all`, () => {
      const deck = deckWith(slide, slide.type === "cta" ? 2 : slide.type === "hook" ? 0 : 1);
      expect(validate(deck).filter((f) => f.slide === (slide.type === "cta" ? 3 : slide.type === "hook" ? 1 : 2))).toEqual([]);
    });
  }

  test("percentages, units, signs, ranges and non-ASCII digits all pass", () => {
    const t = "42% 30.000 -3% 2020-2021 5K 3.5B 1\u00A0000 \uFF14\uFF12 \u0664\u0662";
    expect(validate(deckWith({ type: "text", title: "T", text: t }))).toEqual([]);
  });
});

describe("VAL-08 dashes and arrows beyond the first list", () => {
  const bad: [string, string][] = [
    ["U+2012 figure dash", "a \u2012 b"],
    ["U+2015 horizontal bar", "a \u2015 b"],
    ["U+FE58 small em dash", "a \uFE58 b"],
    ["U+FF0D fullwidth hyphen-minus", "a \uFF0D b"],
    ["U+2794 heavy arrow", "a \u2794 b"],
    ["U+27F6 long arrow", "a \u27F6 b"],
    ["U+2B62 arrow", "a \u2B62 b"],
    ["U+2190 left arrow", "a \u2190 b"],
    ["=> sequence", "a => b"],
    ["<- sequence", "a <- b"],
  ];
  for (const [name, text] of bad) {
    test(`${name} is rejected`, () => {
      expect(rulesOf(deckWith({ type: "text", title: "T", text }))).toContain("forbidden-char");
    });
  }

  test("a plain hyphen, a hyphen between words and a minus sign are allowed", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "guarda-chuva e \u22123 graus - ok" }))).toEqual([]);
  });
});

describe("blank detection", () => {
  test("a list item with only a zero width space counts as blank", () => {
    expect(rulesOf(deckWith({ type: "list", title: "T", items: ["ok", "\u200B"] }))).toContain("field-missing");
  });

  test("a title with only a zero width space counts as missing", () => {
    expect(rulesOf(deckWith({ type: "text", title: "\u200B\uFEFF", text: "Corpo" }))).toContain("field-missing");
  });
});

describe("VAL-07 the highlight must be in text that is actually drawn", () => {
  test("a highlight that only exists in the quote author is rejected", () => {
    expect(rulesOf(deckWith({ type: "quote", text: "Frase", author: "Maria", highlight: "Maria" }))).toEqual(["highlight-invalid"]);
  });

  test("a highlight that only exists in the cta handle is rejected", () => {
    expect(rulesOf(deckWith({ type: "cta", text: "Fim", handle: "@maria", highlight: "@maria" }))).toContain("highlight-invalid");
  });

  test("a highlight in the quote text, a number label and a list item is accepted", () => {
    expect(rulesOf(deckWith({ type: "quote", text: "Frase boa", author: "A", highlight: "boa" }))).toEqual([]);
    expect(rulesOf(deckWith({ type: "number", value: "5", label: "casos graves", highlight: "graves" }))).toEqual([]);
    expect(rulesOf(deckWith({ type: "list", title: "T", items: ["alfa", "beta"], highlight: "beta" }))).toEqual([]);
  });
});

describe("schema: a JSON byte order mark is tolerated", () => {
  test("a leading BOM does not make a valid file invalid", () => {
    const text = `\uFEFF${JSON.stringify({ slides: [{ type: "hook", text: "a" }] })}`;
    expect("deck" in parseDeck(text)).toBe(true);
  });
});

describe("findings come back ordered by slide", () => {
  test("slide numbers never decrease", () => {
    const deck: RawDeck = {
      slides: [
        { type: "hook", text: "a -> b" },
        { type: "text", title: "T", text: "tem 99 aqui" },
        { type: "text", title: "T", text: "tem 98 aqui e -> tambem" },
        { type: "cta", text: "Fim", handle: "@x" },
      ],
    };
    const slideNumbers = validate(deck).map((f) => f.slide);
    expect(slideNumbers).toEqual([...slideNumbers].sort((a, b) => a - b));
    expect(slideNumbers).toEqual([1, 3]);
  });
});

describe("parseAndValidate only returns a deck when there is no error", () => {
  test("a deck with numbers returns a deck, a deck with an error does not", () => {
    const ok = JSON.stringify(deckWith({ type: "text", title: "T", text: "Foram 42%" }));
    const bad = JSON.stringify(deckWith({ type: "text", title: "T", text: "Foram 42% — ok" }));
    expect(parseAndValidate(ok).deck).toBeDefined();
    expect(parseAndValidate(ok).findings).toEqual([]);
    expect(parseAndValidate(bad).deck).toBeUndefined();
  });
});

describe("VAL-08 every required forbidden sequence is rejected", () => {
  // A fixed list written here, not read from the module, so removing an entry from the
  // source cannot remove it from this test too.
  const REQUIRED = ["\u2012", "\u2013", "\u2014", "\u2015", "\uFE58", "\uFF0D", "\u2192", "\u21D2", "->", "=>", "<-"];
  for (const seq of REQUIRED) {
    test(`${seq.codePointAt(0)?.toString(16).toUpperCase() ?? seq} inside a text is rejected`, () => {
      expect(rulesOf(deckWith({ type: "text", title: "T", text: `antes ${seq} depois` }))).toContain("forbidden-char");
    });
  }
  test("the module's list covers every required sequence", () => {
    for (const seq of REQUIRED) expect(FORBIDDEN).toContain(seq);
  });
});
