import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Contract tests for scripts/carousel.sh. Docker is replaced by a fake executable that only
// records its arguments (NUL separated) and exits with a chosen code. No real runtime is used.

const ROOT = resolve(import.meta.dir, "..");
const WRAPPER = join(ROOT, "scripts", "carousel.sh");

const FAKE_DOCKER = `#!/bin/sh
printf '%s\\0' "$@" > "$FAKE_DOCKER_CAPTURE"
exit "\${FAKE_DOCKER_EXIT:-0}"
`;

const fixtures: string[] = [];

afterEach(async () => {
  while (fixtures.length > 0) await rm(fixtures.pop()!, { recursive: true, force: true });
});

interface Fixture {
  dir: string;
  slides: string;
  capture: string;
}

async function fixture(): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "carousel-wrapper-"));
  fixtures.push(dir);
  const bin = join(dir, "bin");
  await Bun.write(join(bin, "docker"), FAKE_DOCKER);
  await chmod(join(bin, "docker"), 0o755);
  const slides = join(dir, "slides.json");
  await writeFile(slides, "{}");
  return { dir, slides, capture: join(dir, "docker-args") };
}

function run(fx: Fixture, args: string[], dockerExit = 0) {
  const r = Bun.spawnSync(["bash", WRAPPER, ...args], {
    cwd: fx.dir,
    env: {
      ...process.env,
      PATH: `${join(fx.dir, "bin")}:${process.env.PATH ?? ""}`,
      FAKE_DOCKER_CAPTURE: fx.capture,
      FAKE_DOCKER_EXIT: String(dockerExit),
    },
  });
  return { code: r.exitCode, stdout: r.stdout.toString(), stderr: r.stderr.toString() };
}

async function dockerArgs(fx: Fixture): Promise<string[]> {
  const raw = await readFile(fx.capture, "utf8");
  return raw.split("\0").slice(0, -1);
}

function mounts(args: string[]): string[] {
  return args.flatMap((a, i) => (a === "--mount" ? args.slice(i + 1, i + 2) : []));
}

function warnings(stderr: string): string[] {
  return stderr.split("\n").filter((l) => l.startsWith("warning:"));
}

const FACTS = ["/nonexistent,dir/facts.json", "second-facts-value"] as const;
const FACT_ARGS = ["--facts", FACTS[0], "--facts", FACTS[1]];

function expectFactsNotForwarded(args: string[]) {
  expect(args).not.toContain("--facts");
  for (const a of args) for (const f of FACTS) expect(a).not.toContain(f);
}

function expectIsolation(args: string[]) {
  expect(args.join(" ")).toContain("--network none");
  expect(args).toContain("--read-only");
  expect(args.join(" ")).toContain("--cap-drop ALL");
}

describe("carousel.sh --facts is deprecated and ignored", () => {
  test("validate warns once and forwards neither option nor value", async () => {
    const fx = await fixture();
    const r = run(fx, ["validate", fx.slides, ...FACT_ARGS]);
    expect(r.code).toBe(0);
    expect(warnings(r.stderr)).toHaveLength(1);
    expect(warnings(r.stderr)[0]).toContain("--facts");
    expect(warnings(r.stderr)[0]).toContain("ignored");
    expect(warnings(r.stderr)[0]).toContain("numbers are no longer checked");

    const args = await dockerArgs(fx);
    expectFactsNotForwarded(args);
    expectIsolation(args);
    expect(args[0]).toBe("run");
    expect(mounts(args)).toEqual([
      `type=bind,src=${ROOT},dst=/app,readonly`,
      `type=bind,src=${fx.dir},dst=/in/slides,readonly`,
    ]);
    expect(args.slice(-3)).toEqual(["src/cli.ts", "validate", "/in/slides/slides.json"]);
  });

  test("render warns once, mounts only app, slides and output, and reports the absolute output dir", async () => {
    const fx = await fixture();
    const out = join(fx.dir, "result");
    const r = run(fx, ["render", fx.slides, ...FACT_ARGS, "--out", out]);
    expect(r.code).toBe(0);
    expect(warnings(r.stderr)).toHaveLength(1);
    expect(r.stdout).toContain(`Output directory: ${out}`);
    expect(existsSync(out)).toBe(true);

    const args = await dockerArgs(fx);
    expectFactsNotForwarded(args);
    expectIsolation(args);
    expect(mounts(args)).toEqual([
      `type=bind,src=${ROOT},dst=/app,readonly`,
      `type=bind,src=${fx.dir},dst=/in/slides,readonly`,
      `type=bind,src=${out},dst=/out`,
    ]);
    expect(args.slice(-5)).toEqual(["src/cli.ts", "render", "/in/slides/slides.json", "--out", "/out"]);
  });
});

describe("carousel.sh argument errors stop before Docker", () => {
  const cases: [string, (fx: Fixture) => string[]][] = [
    ["--facts without a value", (fx) => ["validate", fx.slides, "--facts"]],
    ["--facts followed by --out", (fx) => ["render", fx.slides, "--facts", "--out", join(fx.dir, "o")]],
    ["--out followed by --facts", (fx) => ["render", fx.slides, "--out", "--facts", "x"]],
  ];
  for (const [name, build] of cases) {
    test(name, async () => {
      const fx = await fixture();
      const r = run(fx, build(fx));
      expect(r.code).toBe(2);
      expect(existsSync(fx.capture)).toBe(false);
    });
  }
});

describe("carousel.sh container failures", () => {
  test("a nonzero docker exit code is returned and no success line is printed", async () => {
    const fx = await fixture();
    const r = run(fx, ["render", fx.slides, "--out", join(fx.dir, "result")], 3);
    expect(r.code).toBe(3);
    expect(r.stdout).not.toContain("Output directory");
    expect(existsSync(fx.capture)).toBe(true);
  });
});
