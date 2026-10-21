#!/usr/bin/env node
/* Gate for specs/ and tests/: `node scripts/check-quality.mjs [--changed [--base=X]]`.
   Every module has a valid spec and tests; changed code needs a changed spec and tests. */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES, IGNORED, CODE_ROOTS, CODE_FILES, CODE_EXT } from "./modules.mjs";
import { TEST_FILE, validateBaseline, validateCriticalFlows, validateSpec } from "./quality-lib.mjs";
import { validateBatches } from "./progress-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SPECS = join(ROOT, "specs");
const TESTS = join(ROOT, "tests");
const BASELINE_PATH = "scripts/quality-baseline.json";
const posix = (p) => relative(ROOT, p).split(sep).join("/");
const exists = (rel) => existsSync(join(ROOT, rel));

const errors = [];
const fail = (msg) => errors.push(msg);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".DS_Store") return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const docs = MODULES.map((m) => m.doc);
const testFilesOf = (doc) => walk(join(TESTS, doc)).map(posix).filter((f) => TEST_FILE.test(f));

/* ── Ownership (same rule as check-docs: the longest matching path wins) ── */
const owners = MODULES.flatMap((m) => m.paths.map((p) => ({ prefix: p, doc: m.doc })));
function ownerOf(file) {
  let best = null;
  for (const o of owners) {
    const hit = o.prefix.endsWith("/") ? file.startsWith(o.prefix) : file === o.prefix;
    if (hit && (!best || o.prefix.length > best.prefix.length)) best = o;
  }
  return best?.doc ?? null;
}

/* ── 1. specs/ holds the README, shared `_*.md` files and one spec per module ── */
const specFiles = walk(SPECS).map(posix);
const expectedSpecs = new Set(docs.map((d) => `specs/${d}.md`));
for (const file of specFiles) {
  const name = file.split("/").pop();
  if (file === "specs/README.md" || (file.split("/").length === 2 && name.startsWith("_") && name.endsWith(".md"))) continue;
  if (!expectedSpecs.has(file)) fail(`${file} is not a module spec — specs/ holds <group>/<module>.md for modules in scripts/modules.mjs, README.md and _*.md`);
}

/* ── 2. tests/ holds _support, e2e journeys and one folder per module ── */
const moduleDirs = new Set(docs.map((d) => `tests/${d}`));
for (const file of walk(TESTS).map(posix)) {
  const parts = file.split("/");
  if (parts.length === 2) {
    if (file !== "tests/README.md") fail(`${file}: tests/ only holds README.md, _support/, e2e/ and <group>/<module>/`);
    continue;
  }
  if (parts[1] === "_support" || parts[1] === "e2e") continue;
  if (!moduleDirs.has(parts.slice(0, 3).join("/"))) fail(`${file} is not in a module folder — tests live in tests/<group>/<module>/ (modules: scripts/modules.mjs)`);
}

/* ── 3. Every spec is well formed ── */
for (const doc of docs) {
  const rel = `specs/${doc}.md`;
  if (!exists(rel)) continue;
  for (const p of validateSpec(readFileSync(join(ROOT, rel), "utf8"), { doc, fileExists: exists })) fail(p);
}
if (exists("specs/_critical-flows.md")) {
  for (const p of validateCriticalFlows(readFileSync(join(SPECS, "_critical-flows.md"), "utf8"), { modules: docs, fileExists: exists })) fail(p);
} else fail("specs/_critical-flows.md is missing");

/* ── 3b. The test process batch plan places every module exactly once ── */
try {
  for (const p of validateBatches(JSON.parse(readFileSync(join(ROOT, "scripts/test-batches.json"), "utf8")), docs)) fail(p);
} catch {
  fail("scripts/test-batches.json is missing or is not valid JSON");
}

/* ── 4. Baseline: modules without spec + tests are listed, covered ones are not ── */
let pending = [];
try {
  pending = JSON.parse(readFileSync(join(ROOT, BASELINE_PATH), "utf8")).pending ?? [];
} catch {
  fail(`${BASELINE_PATH} is missing or is not valid JSON ({ "pending": ["<group>/<module>", …] })`);
}
for (const p of validateBaseline(docs.map((doc) => ({ doc, hasSpec: exists(`specs/${doc}.md`), hasTests: testFilesOf(doc).length > 0 })), pending)) fail(p);

/* ── --changed: touched module ⇒ its spec updated and a test touched ── */
const args = process.argv.slice(2);
let touchedCount = 0;
if (args.includes("--changed")) {
  const baseArg = args.find((a) => a.startsWith("--base="));
  const base = baseArg ? baseArg.slice("--base=".length) : "HEAD";
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const split = (out) => out.split("\0").filter(Boolean);
  const changed = new Set([...split(git("diff", "--name-only", "-z", base)), ...split(git("ls-files", "--others", "--exclude-standard", "-z"))]);
  const tracked = (path) => {
    try {
      execFileSync("git", ["ls-files", "--error-unmatch", path], { cwd: ROOT, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };

  const touched = new Map(); // doc → files
  for (const file of changed) {
    const isCode = CODE_EXT.test(file) && (CODE_ROOTS.some((r) => file.startsWith(`${r}/`)) || CODE_FILES.includes(file));
    if (!isCode || IGNORED.some((re) => re.test(file))) continue;
    const doc = ownerOf(file);
    if (doc) touched.set(doc, [...(touched.get(doc) ?? []), file]);
  }
  touchedCount = touched.size;

  for (const [doc, files] of touched) {
    const spec = `specs/${doc}.md`;
    const sample = `${files.slice(0, 3).join(", ")}${files.length > 3 ? ", …" : ""}`;
    if (!changed.has(spec)) {
      fail(`${spec} was not updated, but its module changed (${sample}). Write or update the spec first (.agent/skills/09-tech-specs.md).`);
      continue;
    }
    const specText = readFileSync(join(ROOT, spec), "utf8");
    let waived = false;
    if (tracked(spec)) {
      const diff = git("diff", "-U0", base, "--", spec);
      const date = /\*\*Cập nhật:\*\*\s*(\d{4}-\d{2}-\d{2})/.exec(specText)?.[1] ?? "";
      const today = new Date().toLocaleDateString("sv-SE");
      if (!/^\+> \*\*Nhóm:\*\*.*\*\*Cập nhật:\*\*/m.test(diff) && date < today) fail(`${spec} was edited but its "Cập nhật" date was not bumped`);
      waived = /^\+.*no-test:\s*\S/m.test(diff);
    }
    const testsTouched = [...changed].some((f) => f.startsWith(`tests/${doc}/`) && TEST_FILE.test(f));
    if (!testsTouched && !waived) {
      fail(`no test under tests/${doc}/ was added or changed, but its module changed (${sample}). Add or update tests, or log "no-test: <reason>" in the spec's change history when behaviour is untouched.`);
    }
  }

  const before = (() => {
    try {
      return JSON.parse(git("show", `${base}:${BASELINE_PATH}`)).pending ?? [];
    } catch {
      return null; // baseline not in git yet
    }
  })();
  if (before) for (const doc of pending) if (!before.includes(doc)) fail(`${BASELINE_PATH}: "${doc}" was added — the baseline can only shrink`);

  const commentBase = (() => {
    try {
      return JSON.parse(git("show", `${base}:scripts/comment-baseline.json`)).files ?? [];
    } catch {
      return null;
    }
  })();
  if (commentBase) {
    const now = JSON.parse(readFileSync(join(ROOT, "scripts/comment-baseline.json"), "utf8")).files ?? [];
    for (const file of now) if (!commentBase.includes(file)) fail(`scripts/comment-baseline.json: "${file}" was added — shorten its comments instead`);
  }
}

if (errors.length) {
  console.error(`\nQuality check failed — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee .agent/rules/quality-loop.md, .agent/skills/09-tech-specs.md and .agent/skills/10-testing.md.\n");
  process.exit(1);
}
const covered = docs.length - pending.length;
console.log(`quality check OK — ${covered}/${docs.length} modules have a spec + tests (${pending.length} pending)${args.includes("--changed") ? `, ${touchedCount} changed module(s) covered` : ""}`);
