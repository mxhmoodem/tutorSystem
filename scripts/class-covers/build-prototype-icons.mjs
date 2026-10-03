#!/usr/bin/env node
// Builds the prototype's classCoverIcons.js from the class-covers kit's generated
// icon registry (icons.generated.ts).
//
// The prototype has no bundler, so it cannot import the kit's TypeScript. This copies
// the generated array verbatim into a plain script that sets one global,
// window.KLASIO_COVER_ICON_ENTRIES, which classCovers.jsx reads. Never edit either
// file by hand. To change the icons: edit the kit's cover-icons.manifest.json, run the
// kit's generate-cover-icons.mjs, then run this from the repo root:
//
//   node scripts/class-covers/build-prototype-icons.mjs [--from <icons.generated.ts>]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const CANDIDATES = [
  "class-covers-kit/packages/shared/src/class-covers/icons.generated.ts",
  "class-covers-kit/class-covers-kit/packages/shared/src/class-covers/icons.generated.ts",
  "packages/shared/src/class-covers/icons.generated.ts",
];

const fromArg = process.argv.indexOf("--from");
const source = fromArg > -1 ? path.resolve(process.argv[fromArg + 1]) : CANDIDATES.map((p) => path.resolve(p)).find((p) => existsSync(p));
if (!source || !existsSync(source)) {
  console.error(`Could not find icons.generated.ts. Looked in:\n  ${CANDIDATES.join("\n  ")}\nPass --from <path>.`);
  process.exit(1);
}

const ts = readFileSync(source, "utf8");
const declaration = /^export const COVER_ICON_ENTRIES: readonly CoverIconEntry\[\] = \[$/m;
if (!declaration.test(ts)) {
  console.error(`${source} does not look like the generated icon registry (declaration line not found).`);
  process.exit(1);
}

// Licence header = every leading comment line; the array body = everything after the declaration.
const header = ts.split("\n").filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("//"))).join("\n");
const body = ts.slice(ts.search(declaration)).replace(declaration, "window.KLASIO_COVER_ICON_ENTRIES = [");

const out = `${header
  .replace(/^\/\/ Source:.*$/m, "// Source: the class-covers kit's scripts/class-covers/cover-icons.manifest.json")
  .replace(/^\/\/ Regenerate:.*$/m, "// Regenerate: node scripts/class-covers/build-prototype-icons.mjs (after the kit's generate-cover-icons.mjs)")}
//
// Prototype copy, built from ${path.relative(process.cwd(), source).split(path.sep).join("/")}.
// A plain script (not text/babel), so the ~100 KB of path data skips in-browser Babel.

${body}`;

// Parse check: the output must evaluate to a non-empty array of well-formed entries.
const sandbox = { window: {} };
vm.runInNewContext(out, sandbox);
const entries = sandbox.window.KLASIO_COVER_ICON_ENTRIES;
const bad = Array.isArray(entries) ? entries.filter((e) => !e || !e.id || (e.kind !== "icon" && e.kind !== "glyph")) : null;
if (!Array.isArray(entries) || entries.length === 0 || bad.length > 0) {
  console.error("Built file did not evaluate to a valid icon registry.");
  process.exit(1);
}

const outPath = path.resolve("classCoverIcons.js");
writeFileSync(outPath, out);
const glyphs = entries.filter((e) => e.kind === "glyph").length;
console.log(`Wrote ${entries.length} entries (${entries.length - glyphs} icons, ${glyphs} glyphs) to ${outPath}`);
