import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Same approach as wrapper.test.ts: Docker is a fake that records its arguments.
const ROOT = resolve(import.meta.dir, "..");
const WRAPPER = join(ROOT, "scripts", "carousel.sh");
const FAKE = `#!/bin/sh\nprintf '%s\\0' "$@" > "$FAKE_DOCKER_CAPTURE"\nexit 0\n`;

const dirs: string[] = [];
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop()!, { recursive: true, force: true });
});

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "carousel-wrapper-presets-"));
  dirs.push(dir);
  await Bun.write(join(dir, "bin", "docker"), FAKE);
  await chmod(join(dir, "bin", "docker"), 0o755);
  const slides = join(dir, "slides.json");
  await writeFile(slides, "{}");
  return { dir, slides, capture: join(dir, "args") };
}

function run(fx: Awaited<ReturnType<typeof fixture>>, args: string[]) {
  const r = Bun.spawnSync(["bash", WRAPPER, ...args], {
    cwd: fx.dir,
    env: { ...process.env, PATH: `${join(fx.dir, "bin")}:${process.env.PATH ?? ""}`, FAKE_DOCKER_CAPTURE: fx.capture },
  });
  return { code: r.exitCode, stdout: r.stdout.toString(), stderr: r.stderr.toString() };
}

const captured = async (fx: Awaited<ReturnType<typeof fixture>>) =>
  (await readFile(fx.capture, "utf8")).split("\0").slice(0, -1);

describe("carousel.sh forwards output options", () => {
  test("render forwards --preset and --size, keeps isolation and prints the output dir", async () => {
    const fx = await fixture();
    const out = join(fx.dir, "result");
    const r = run(fx, ["render", fx.slides, "--preset", "generic", "--size", "800x1000", "--out", out]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain(`Output directory: ${out}`);
    const args = await captured(fx);
    expect(args.slice(-9)).toEqual([
      "src/cli.ts", "render", "/in/slides/slides.json", "--preset", "generic", "--size", "800x1000", "--out", "/out",
    ]);
    expect(args.join(" ")).toContain("--network none");
    expect(args).toContain("--read-only");
    const mounts = args.flatMap((a, i) => (a === "--mount" ? [args[i + 1]] : []));
    expect(mounts).toEqual([
      `type=bind,src=${ROOT},dst=/app,readonly`,
      `type=bind,src=${fx.dir},dst=/in/slides,readonly`,
      `type=bind,src=${out},dst=/out`,
    ]);
  });

  test("validate forwards the options too", async () => {
    const fx = await fixture();
    expect(run(fx, ["validate", fx.slides, "--preset", "tiktok"]).code).toBe(0);
    expect((await captured(fx)).slice(-5)).toEqual(["src/cli.ts", "validate", "/in/slides/slides.json", "--preset", "tiktok"]);
  });

  test.each([
    ["missing preset value", ["--preset"]],
    ["option as preset value", ["--preset", "--size"]],
    ["missing size value", ["--size"]],
    ["repeated preset", ["--preset", "generic", "--preset", "generic"]],
    ["repeated size", ["--size", "800x800", "--size", "800x800"]],
  ])("%s stops before Docker with code 2 and no output dir report", async (_n, flags) => {
    const fx = await fixture();
    const out = join(fx.dir, "result");
    const r = run(fx, ["render", fx.slides, ...flags, "--out", out]);
    expect(r.code).toBe(2);
    expect(existsSync(fx.capture)).toBe(false);
    expect(existsSync(out)).toBe(false);
    expect(r.stdout).not.toContain("Output directory");
  });
});
