#!/usr/bin/env node
/* Test process board: `node scripts/test-progress.mjs [--batch N | --verify N | --json]`.
   Rules: .agent/skills/13-test-process.md. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ROOT, MODULES, IGNORED, CODE_ROOTS, CODE_FILES, CODE_EXT, ownerOf } from "./gate-env.mjs";
import { TEST_FILE, parseSpec, validateMatrix } from "./quality-lib.mjs";
import { batchReport, classifyModule, scoreboard, validateBatches } from "./progress-lib.mjs";

const posix = (p) => relative(ROOT, p).split(sep).join("/");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel) => existsSync(join(ROOT, rel));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".next" || name === ".DS_Store") return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const docs = MODULES.map((m) => m.doc);
const plan = JSON.parse(read("scripts/test-batches.json"));
const pending = JSON.parse(read("scripts/quality-baseline.json")).pending ?? [];

const codeFiles = [...CODE_ROOTS.flatMap((d) => walk(join(ROOT, d))).map(posix), ...CODE_FILES.filter(exists)].filter((f) => CODE_EXT.test(f) && !IGNORED.some((re) => re.test(f)));

/** Counts `it(` / `test(` calls; an `it.each` table counts once, so this is a lower bound. */
const countTests = (text) => (text.match(/(^|[^\w.])(it|test)(\.each\([^)]*\))?\(/gm) ?? []).length;

function statusOf(doc) {
  const specPath = `specs/${doc}.md`;
  const testFiles = walk(join(ROOT, "tests", doc)).map(posix).filter((f) => TEST_FILE.test(f));
  const testCount = testFiles.reduce((sum, f) => sum + countTests(read(f)), 0);
  let spec = null;
  if (exists(specPath)) {
    const parsed = parseSpec(read(specPath));
    spec = { status: parsed.status, scope: parsed.scope, matrixProblems: validateMatrix(parsed), flowCount: parsed.rows.length };
  }
  return { ...classifyModule({ doc, spec, hasTests: testFiles.length > 0, testCount, pending: pending.includes(doc) }), testFiles: testFiles.length, testCount, flows: spec?.flowCount ?? 0 };
}

const planProblems = validateBatches(plan, docs);
if (planProblems.length) {
  console.error(planProblems.join("\n"));
  process.exit(1);
}

const statuses = Object.fromEntries(docs.map((doc) => [doc, statusOf(doc)]));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : null;
};
const ICON = { done: "✓", partial: "◐", pending: "·" };

/** Hint from where the module lives; the spec decides (auth/permission = có | không + reason). */
function hint(doc) {
  if (doc.startsWith("admin/")) return "admin page: guest, user, admin đủ quyền, admin thiếu quyền → auth = có, permission = có";
  if (["cart", "wishlist", "checkout", "customer-", "account"].some((k) => doc.includes(k))) return "private page: guest sees the sign-in wall, signed-in sees content → auth = có";
  if (doc.startsWith("storefront/")) return "public page: check actions that call requireAuth (cart, wishlist) → auth = có if any, else không (reason)";
  return "platform: auth/permission only if the module reads the session or permissions; otherwise không (reason)";
}

function worksheet(id) {
  const batch = plan.batches.find((b) => b.id === id);
  if (!batch) {
    console.error(`no batch ${id}. Batches: ${plan.batches.map((b) => b.id).join(", ")}`);
    process.exit(1);
  }
  console.log(`BATCH ${batch.id} — ${batch.title}\nwhy:   ${batch.why}\nfocus: ${batch.focus}\n`);
  for (const doc of batch.modules) {
    const st = statuses[doc];
    const files = codeFiles.filter((f) => ownerOf(f) === doc).map((f) => ({ f, lines: read(f).split("\n").length }));
    files.sort((a, b) => b.lines - a.lines);
    console.log(`${ICON[st.state]} ${doc}  [${st.state}]  ${files.length} files, ${files.reduce((s, x) => s + x.lines, 0)} lines`);
    console.log(`    doc: docs/${doc}.md   spec: specs/${doc}.md${exists(`specs/${doc}.md`) ? "" : " (to create)"}   tests: tests/${doc}/ (${st.testFiles} files, ~${st.testCount} tests, ${st.flows} flows)`);
    console.log(`    dimensions: ${hint(doc)}`);
    console.log(`    largest: ${files.slice(0, 8).map((x) => `${x.f.split("/").slice(-2).join("/")} (${x.lines})`).join(", ")}${files.length > 8 ? ", …" : ""}`);
    console.log(`    gaps: ${st.gaps.length ? st.gaps.join("; ") : "none"}\n`);
  }
}

if (args.includes("--verify")) {
  const report = batchReport(plan, statuses, arg("--verify"));
  console.log(report.lines.join("\n"));
  process.exit(report.ok ? 0 : 1);
} else if (args.includes("--batch")) {
  worksheet(arg("--batch"));
} else if (args.includes("--json")) {
  console.log(JSON.stringify({ plan, statuses, board: scoreboard(plan, statuses) }, null, 2));
} else {
  const board = scoreboard(plan, statuses);
  console.log(`TEST PROCESS — ${board.done}/${board.total} modules done   (✓ done  ◐ partial  · pending)\n`);
  const line = (doc) => `${ICON[statuses[doc].state]} ${doc}`;
  console.log(`done list: ${plan.done.map(line).join("   ")}\n`);
  for (const b of board.batches) {
    console.log(`Batch ${b.id} — ${b.title}   ${b.done}/${b.total}`);
    for (const m of b.modules) console.log(`   ${line(m.doc)}${statuses[m.doc].gaps.length && statuses[m.doc].state === "partial" ? `   — ${statuses[m.doc].gaps[0]}` : ""}`);
  }
  const next = board.batches.find((b) => b.done < b.total);
  console.log(next ? `\nNext: yarn test:progress --batch ${next.id}` : "\nAll batches done.");
}
