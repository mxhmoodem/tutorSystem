#!/usr/bin/env node
// Regenerates packages/shared/src/class-covers/icons.generated.ts from
// cover-icons.manifest.json.
//
// Phosphor is only needed while generating; it is never a runtime dependency.
// Run from the repo root:
//   npm i --no-save @phosphor-icons/core
//   node scripts/class-covers/generate-cover-icons.mjs
//
// Icons: Phosphor Icons (duotone weight), MIT licence, (c) Phosphor Icons.
// https://github.com/phosphor-icons/core

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, "cover-icons.manifest.json");

const outArgIndex = process.argv.indexOf("--out");
const outPath =
  outArgIndex > -1
    ? path.resolve(process.argv[outArgIndex + 1])
    : path.resolve(scriptDir, "../../packages/shared/src/class-covers/icons.generated.ts");

const FAMILIES = new Set([
  "maths",
  "sciences",
  "english",
  "humanities",
  "languages",
  "social",
  "computing",
  "creative",
  "exam-prep",
  "general",
]);

const localRequire = createRequire(path.join(process.cwd(), "noop.js"));
let duotoneDir;
try {
  // The package's exports map exposes the SVG assets but not package.json.
  duotoneDir = path.dirname(localRequire.resolve("@phosphor-icons/core/assets/duotone/atom-duotone.svg"));
} catch (error) {
  console.error("Could not find @phosphor-icons/core. Run: npm i --no-save @phosphor-icons/core");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const seen = new Set();
const problems = [];

function extractPaths(id) {
  const file = path.join(duotoneDir, `${id}-duotone.svg`);
  if (!existsSync(file)) {
    problems.push(`${id}: no Phosphor duotone icon with this name`);
    return [];
  }
  const svg = readFileSync(file, "utf8");
  const pathTagCount = (svg.match(/<path\b/g) || []).length;
  const otherShapes = svg.match(/<(circle|rect|line|polyline|polygon|ellipse|g)\b/g);
  if (otherShapes) problems.push(`${id}: contains non-path elements (${otherShapes.join(", ")})`);
  const found = [];
  const re = /<path d="([^"]+)"(?: opacity="([^"]+)")?\s*\/>/g;
  let match = re.exec(svg);
  while (match) {
    const entry = { d: match[1] };
    if (match[2] !== undefined) entry.opacity = Number(match[2]);
    found.push(entry);
    match = re.exec(svg);
  }
  if (found.length !== pathTagCount) problems.push(`${id}: parsed ${found.length} of ${pathTagCount} paths`);
  return found;
}

const lines = [];
for (const entry of manifest.entries) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.id)) problems.push(`${entry.id}: id must be kebab-case`);
  if (seen.has(entry.id)) problems.push(`${entry.id}: duplicate id`);
  seen.add(entry.id);
  if (!entry.label) problems.push(`${entry.id}: missing label`);
  if (!Array.isArray(entry.families) || entry.families.length === 0) problems.push(`${entry.id}: needs at least one family`);
  for (const family of entry.families || []) {
    if (!FAMILIES.has(family)) problems.push(`${entry.id}: unknown family "${family}"`);
  }
  const common = `id: ${JSON.stringify(entry.id)}, label: ${JSON.stringify(entry.label)}, tags: ${JSON.stringify(entry.tags || [])}, families: ${JSON.stringify(entry.families)}`;
  if (entry.kind === "glyph") {
    if (!entry.char) problems.push(`${entry.id}: glyph needs a char`);
    lines.push(`  { kind: "glyph", ${common}, char: ${JSON.stringify(entry.char)} },`);
  } else if (entry.kind === "icon") {
    const paths = extractPaths(entry.id);
    const pathsSrc = paths
      .map((p) => (p.opacity === undefined ? `{ d: ${JSON.stringify(p.d)} }` : `{ d: ${JSON.stringify(p.d)}, opacity: ${p.opacity} }`))
      .join(", ");
    lines.push(`  { kind: "icon", ${common}, paths: [${pathsSrc}] },`);
  } else {
    problems.push(`${entry.id}: kind must be "icon" or "glyph"`);
  }
}

if (problems.length > 0) {
  console.error(`Manifest problems:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

const header = `// GENERATED FILE — do not edit by hand.
// Source: scripts/class-covers/cover-icons.manifest.json
// Regenerate: node scripts/class-covers/generate-cover-icons.mjs
//
// Icon artwork: Phosphor Icons, duotone weight (viewBox 0 0 256 256).
// MIT License, Copyright (c) 2023 Phosphor Icons — https://github.com/phosphor-icons/core
// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files, to deal in the Software without restriction.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

import type { CoverIconEntry } from "./types";

export const COVER_ICON_ENTRIES: readonly CoverIconEntry[] = [
`;

writeFileSync(outPath, `${header}${lines.join("\n")}\n];\n`);
const glyphs = manifest.entries.filter((e) => e.kind === "glyph").length;
console.log(`Wrote ${manifest.entries.length} entries (${manifest.entries.length - glyphs} icons, ${glyphs} glyphs) to ${outPath}`);
