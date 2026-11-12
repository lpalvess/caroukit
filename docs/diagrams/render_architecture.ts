/** Export documentation SVGs with the existing local renderer; run inside the offline container. */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
const root = join(import.meta.dirname, "../..");
await initWasm(await readFile(join(root, "node_modules/@resvg/resvg-wasm/index_bg.wasm")));
const font = await readFile(join(root, "src/fonts/inter-latin-500-normal.woff2"));
const out = process.argv[2];
if (!out) throw new Error("Pass an existing output directory");
for (const lang of ["pt", "en"]) {
  const svg = await readFile(join(import.meta.dirname, `architecture.${lang}.drawio.svg`), "utf8");
  const renderer = new Resvg(svg, { font: { fontBuffers: [font], loadSystemFonts: false, defaultFontFamily: "Inter" } });
  const rendered = renderer.render();
  await writeFile(join(out, `architecture.${lang}.png`), rendered.asPng());
  rendered.free();
  renderer.free();
}
