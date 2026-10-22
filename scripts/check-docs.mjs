#!/usr/bin/env node
/* Docs gate: `node scripts/check-docs.mjs [--changed [--base=X] | --who <path|module>]`.
   Every module has an as-built doc, and a changed module has a changed doc. Rules: .agent/rules/module-docs.md. */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep, basename } from "node:path";

const DOCS = join(ROOT, "docs");
const posix = (p) => relative(ROOT, p).split(sep).join("/");

import { ROOT, MODULES, IGNORED, CODE_ROOTS, CODE_FILES, CODE_EXT, ownerOf } from "./gate-env.mjs";

const REQUIRED_HEADINGS = [
  "## 1. Tóm tắt module",
  "## 2. Phục vụ gì / việc cần làm",
  "## 3. Submodule & chức năng hiện có",
  "## 4. Chi tiết",
];
const BANNED = /(?<![\p{L}\p{N}_])(TODO|FIXME|roadmap|kế hoạch|đề xuất)(?![\p{L}\p{N}_])/iu;

const errors = [];
const fail = (msg) => errors.push(msg);

/* ── Ownership ── */
const isIgnored = (file) => IGNORED.some((re) => re.test(file));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".next" || name === ".DS_Store") return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const repoFiles = [
  ...CODE_ROOTS.flatMap((d) => walk(join(ROOT, d))).map(posix),
  ...CODE_FILES.filter((f) => existsSync(join(ROOT, f))),
].filter((f) => CODE_EXT.test(f) && !isIgnored(f));

/* ── --who ── */
const args = process.argv.slice(2);
const whoIndex = args.indexOf("--who");
if (whoIndex >= 0) {
  const targets = args.slice(whoIndex + 1);
  if (targets.length === 0) {
    console.error("Usage: node scripts/check-docs.mjs --who <file|folder|module-name> …");
    process.exit(1);
  }
  let missing = false;
  for (const raw of targets) {
    const target = raw.replace(/^\.\//, "");
    const abs = resolve(ROOT, target);
    const rel = existsSync(abs) || target.includes("/") ? posix(abs) : target;
    const byName = MODULES.find((m) => m.doc === target || m.doc.endsWith(`/${target}`));
    const docs = new Set();
    if (byName) docs.add(byName.doc);
    else {
      const asDir = rel.endsWith("/") ? rel : `${rel}/`;
      const inside = repoFiles.filter((f) => f === rel || f.startsWith(asDir));
      for (const f of inside.length ? inside : [rel]) {
        const doc = ownerOf(f);
        if (doc) docs.add(doc);
      }
    }
    if (docs.size === 0) {
      console.log(`${raw}: no module owns this path — add it to MODULES in scripts/modules.mjs and document it`);
      missing = true;
      continue;
    }
    for (const doc of docs) {
      const mod = MODULES.find((m) => m.doc === doc);
      console.log(`${raw}\n  → docs/${doc}.md\n    owns: ${mod.paths.join("  ")}`);
    }
  }
  process.exit(missing ? 1 : 0);
}

/* ── Static checks ── */

/* 1. Every code file has an owner */
for (const file of repoFiles) {
  if (!ownerOf(file)) fail(`no module owns ${file} — add it to MODULES (scripts/modules.mjs) and document the module`);
}

/* 2. Every module entry has a doc, every doc has an entry, nothing else lives in docs/ */
const docFiles = walk(DOCS).map((f) => posix(f)).filter((f) => f.endsWith(".md"));
const expectedDocs = new Set(MODULES.map((m) => `docs/${m.doc}.md`));
for (const doc of expectedDocs) if (!existsSync(join(ROOT, doc))) fail(`${doc} is missing (module has code but no doc)`);
for (const doc of docFiles) {
  if (doc !== "docs/README.md" && !expectedDocs.has(doc)) fail(`${doc} is not a module doc — docs/ only holds module docs (delete it or add the module to MODULES)`);
}
for (const m of MODULES) {
  const live = m.paths.some((p) => (p.endsWith("/") ? existsSync(join(ROOT, p)) : existsSync(join(ROOT, p))));
  if (!live) fail(`docs/${m.doc}.md: none of its paths exist any more — delete the doc and its MODULES entry, or fix the paths`);
}

/* 3. README has a row for every module doc */
const readmePath = join(DOCS, "README.md");
const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
if (!readme) fail("docs/README.md is missing");
const readmeLinks = [...readme.matchAll(/\]\(([^)#\s]+\.md)\)/g)].map((m) => m[1]);
for (const doc of expectedDocs) {
  const count = readmeLinks.filter((l) => `docs/${l}` === doc).length;
  if (count < 1) fail(`docs/README.md has no row linking ${doc}`);
}

/* 4. Each doc: header, four sections in order, no plans, links and referenced files exist */
const knownNames = new Set(
  [...readdirSync(ROOT).filter((n) => statSync(join(ROOT, n)).isFile()), ...CODE_ROOTS.flatMap((d) => walk(join(ROOT, d))), ...walk(join(ROOT, "public")), ...walk(join(ROOT, ".agent")), ...walk(join(ROOT, "docs")), ...walk(join(ROOT, "tests")), ...walk(join(ROOT, "specs"))]
    .map((f) => basename(f))
);
for (const rel of docFiles) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split("\n");
  if (rel !== "docs/README.md") {
    if (!lines[0].startsWith("# ")) fail(`${rel}: first line must be the "# <module name>" title`);
    const header = lines.slice(0, 8).join("\n");
    if (!/> \*\*Nhóm:\*\*.*\*\*Cập nhật:\*\* \d{4}-\d{2}-\d{2}/.test(header)) fail(`${rel}: header needs "> **Nhóm:** … · **Cập nhật:** YYYY-MM-DD"`);
    if (!/> \*\*Code:\*\*/.test(header)) fail(`${rel}: header needs a "> **Code:** …" line`);
    let from = 0;
    for (const heading of REQUIRED_HEADINGS) {
      const at = lines.findIndex((l, i) => i >= from && l.trim() === heading);
      if (at < 0) fail(`${rel}: missing or out-of-order section "${heading}"`);
      else from = at + 1;
    }
    for (const [i, line] of lines.entries()) {
      if (BANNED.test(line)) fail(`${rel}:${i + 1}: planning language is not allowed in docs (as-built facts only): "${line.trim().slice(0, 80)}"`);
    }
  }
  for (const m of text.matchAll(/\]\(([^)#\s]+\.md)\)/g)) {
    if (!existsSync(resolve(dirname(join(ROOT, rel)), m[1]))) fail(`${rel}: broken link ${m[1]}`);
  }
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const token = m[1];
    if (/[*…<>{}\s]/.test(token) || token.startsWith(".") || !/\.(tsx?|mjs|json|css|md)$/.test(token)) continue;
    if (!knownNames.has(basename(token))) fail(`${rel}: refers to a file that does not exist: ${token}`);
  }
}

/* ── --changed: touched module ⇒ its doc updated ── */
if (args.includes("--changed")) {
  const baseArg = args.find((a) => a.startsWith("--base="));
  const base = baseArg ? baseArg.slice("--base=".length) : "HEAD";
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const split = (out) => out.split("\0").filter(Boolean);
  const changed = new Set([
    ...split(git("diff", "--name-only", "-z", base)),
    ...split(git("ls-files", "--others", "--exclude-standard", "-z")),
  ]);

  const touched = new Map(); // doc → files
  for (const file of changed) {
    if (isIgnored(file) || !CODE_EXT.test(file) || !(CODE_ROOTS.some((r) => file.startsWith(`${r}/`)) || CODE_FILES.includes(file))) continue;
    const doc = ownerOf(file);
    if (!doc) continue; // already reported as "no module owns"
    touched.set(doc, [...(touched.get(doc) ?? []), file]);
  }

  for (const [doc, files] of touched) {
    const docPath = `docs/${doc}.md`;
    if (!changed.has(docPath)) {
      fail(`${docPath} was not updated, but its module changed (${files.slice(0, 3).join(", ")}${files.length > 3 ? ", …" : ""}). Read the module, then update the doc.`);
      continue;
    }
    const tracked = (() => { try { execFileSync("git", ["ls-files", "--error-unmatch", docPath], { cwd: ROOT, stdio: "ignore" }); return true; } catch { return false; } })();
    if (!tracked) continue; // brand-new doc
    const diff = git("diff", "-U0", base, "--", docPath);
    /* A second edit on the same day cannot change the date, so a date that is already today (or later) also passes */
    const docDate = /\*\*Cập nhật:\*\*\s*(\d{4}-\d{2}-\d{2})/.exec(readFileSync(join(ROOT, docPath), "utf8"))?.[1] ?? "";
    const today = new Date().toLocaleDateString("sv-SE");
    if (!/^\+> \*\*Nhóm:\*\*.*\*\*Cập nhật:\*\*/m.test(diff) && docDate < today) {
      fail(`${docPath} was edited but its "Cập nhật" date was not bumped`);
    }
  }
  if (touched.size === 0 && errors.length === 0) console.log("docs check: no module code changed.");
}

if (errors.length) {
  console.error(`\nDocs check failed — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee .agent/rules/module-docs.md and .agent/skills/07-module-docs.md.\n");
  process.exit(1);
}
console.log(`docs check OK — ${MODULES.length} modules, ${repoFiles.length} code files owned${args.includes("--changed") ? ", changed modules documented" : ""}`);
