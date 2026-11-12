import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runValidate } from "../src/cli";

let dir: string;
const file = (name: string) => join(dir, name);

const good = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "A short body" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const withNumber = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "Grew 47 percent" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const bad = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "wait \u2014 here" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const warnOnly = {
  slides: [
    { type: "text", title: "a", text: "b" },
    { type: "text", title: "a", text: "b" },
    { type: "text", title: "a", text: "b" },
  ],
};

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
  await writeFile(file("good.json"), JSON.stringify(good));
  await writeFile(file("number.json"), JSON.stringify(withNumber));
  await writeFile(file("bad.json"), JSON.stringify(bad));
  await writeFile(file("warn.json"), JSON.stringify(warnOnly));
  await writeFile(file("broken.json"), "{oops");
  await writeFile(file("facts.md"), "Grew 47 percent last year.");
  await writeFile(file("empty-facts.md"), "");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const WARNING =
  "warning: --facts is deprecated and ignored; numbers are no longer checked. Remove this option. It will be rejected in 2.0.0.";

describe("runValidate (VAL-01)", () => {
  test("a clean deck exits 0 and reports technical validation", async () => {
    expect(await runValidate([file("good.json")])).toEqual({
      code: 0,
      lines: ["ok: 3 slides passed technical validation"],
    });
  });

  test("an error exits 1 and prints '<severity> slide <N> <rule-id>: <message>'", async () => {
    const r = await runValidate([file("bad.json")]);
    expect(r.code).toBe(1);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatch(/^error slide 2 forbidden-char: .+/);
  });

  test("warnings alone exit 0 and are printed in the same format", async () => {
    const r = await runValidate([file("warn.json")]);
    expect(r.code).toBe(0);
    expect(r.lines).toHaveLength(3);
    expect(r.lines[0]).toMatch(/^warning slide 1 structure: .+/);
    expect(r.lines[1]).toMatch(/^warning slide 3 structure: .+/);
    expect(r.lines[2]).toBe("ok: 3 slides passed technical validation");
  });

  test("a deck with numbers validates with no warning and no facts-skipped", async () => {
    const r = await runValidate([file("number.json")]);
    expect(r).toEqual({ code: 0, lines: ["ok: 3 slides passed technical validation"] });
    expect(r.lines.join("\n")).not.toContain("facts-skipped");
  });

  test("an error prints no ok line", async () => {
    const r = await runValidate([file("bad.json")]);
    expect(r.lines.some((l) => l.startsWith("ok:"))).toBe(false);
  });
});

describe("legacy --facts (deprecated, ignored)", () => {
  test("an existing facts file only adds the warning", async () => {
    const r = await runValidate([file("number.json"), "--facts", file("facts.md")]);
    expect(r).toEqual({ code: 0, lines: [WARNING, "ok: 3 slides passed technical validation"] });
  });

  test("a nonexistent facts path succeeds with the explicit warning, once", async () => {
    const r = await runValidate([file("number.json"), "--facts", file("does-not-exist.md")]);
    expect(r.code).toBe(0);
    expect(r.lines.filter((l) => l === WARNING)).toHaveLength(1);
  });

  test("an empty facts file does not fail the number", async () => {
    const r = await runValidate([file("number.json"), "--facts", file("empty-facts.md")]);
    expect(r.code).toBe(0);
  });

  test("--facts may come before the slides file", async () => {
    const r = await runValidate(["--facts", file("facts.md"), file("number.json")]);
    expect(r.code).toBe(0);
    expect(r.lines[0]).toBe(WARNING);
  });

  test("a deck with an error still fails and keeps the warning", async () => {
    const r = await runValidate([file("bad.json"), "--facts", file("facts.md")]);
    expect(r.code).toBe(1);
    expect(r.lines[0]).toBe(WARNING);
  });

  test("a directory as the facts value is not read, so it is not an error", async () => {
    expect((await runValidate([file("good.json"), "--facts", dir])).code).toBe(0);
  });

  test("the next option as the value is a usage error", async () => {
    const r = await runValidate([file("good.json"), "--facts", "--nope"]);
    expect(r.code).toBe(2);
    expect(r.lines[0]).toContain("usage");
  });
});

describe("schema errors (VAL-02)", () => {
  test("invalid JSON exits 1 with schema-invalid", async () => {
    const r = await runValidate([file("broken.json")]);
    expect(r.code).toBe(1);
    expect(r.lines[0]).toMatch(/^error slide 0 schema-invalid: /);
  });
});

describe("unreadable files (VAL-03)", () => {
  test("a missing slides file exits 2 and names the path", async () => {
    const p = file("missing.json");
    const r = await runValidate([p]);
    expect(r.code).toBe(2);
    expect(r.lines.join("\n")).toContain(p);
  });

  test("a directory instead of a file exits 2", async () => {
    expect((await runValidate([dir])).code).toBe(2);
  });
});

describe("argument errors", () => {
  test("no arguments exit 2 with a usage line", async () => {
    const r = await runValidate([]);
    expect(r.code).toBe(2);
    expect(r.lines[0]).toContain("usage");
  });

  test("--facts without a value exits 2", async () => {
    expect((await runValidate([file("good.json"), "--facts"])).code).toBe(2);
  });

  test("an unknown flag exits 2", async () => {
    expect((await runValidate([file("good.json"), "--nope"])).code).toBe(2);
  });
});

describe("real execution", () => {
  const run = async (args: string[]) => {
    const proc = Bun.spawn([process.execPath, join(import.meta.dir, "..", "src", "cli.ts"), ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { out, code };
  };

  test("bun src/cli.ts validate prints the lines and exits with the code", async () => {
    const r = await run(["validate", file("bad.json")]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^error slide 2 forbidden-char: /m);
  });

  test("a clean run exits 0 and prints the ok line", async () => {
    const r = await run(["validate", file("good.json")]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("ok: 3 slides passed technical validation");
  });

  test("a legacy --facts with a nonexistent file warns once and exits 0", async () => {
    const r = await run(["validate", file("number.json"), "--facts", file("nope.md")]);
    expect(r.code).toBe(0);
    expect(r.out.split(WARNING).length - 1).toBe(1);
  });

  test("--facts without a value exits 2", async () => {
    expect((await run(["validate", file("good.json"), "--facts"])).code).toBe(2);
  });

  test("an unreadable file exits 2", async () => {
    expect((await run(["validate", file("missing.json")])).code).toBe(2);
  });
});
