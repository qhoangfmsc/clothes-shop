#!/usr/bin/env node
/**
 * Mutation check, by hand-picked mutants: break the code on purpose and see whether the tests notice.
 *
 *   node scripts/test-mutants.mjs <module>          e.g. platform/auth  (reads tests/<module>/mutants.json)
 *
 * mutants.json: [{ "name": "…", "file": "src/…", "find": "exact text", "replace": "text" }, …]
 * Each mutant is applied to the real source file, the module's tests run, and the file is restored — also on
 * Ctrl-C or a crash. A mutant is *caught* when at least one test fails. Exit 1 if any mutant survives.
 * Why: green tests prove nothing until you have seen them go red (.agent/skills/10-testing.md, section 4).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyMutation, mutationSummary } from "./progress-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const doc = process.argv[2];
if (!doc) {
  console.error("Usage: node scripts/test-mutants.mjs <group>/<module>   (reads tests/<group>/<module>/mutants.json)");
  process.exit(1);
}
const listPath = join(ROOT, "tests", doc, "mutants.json");
if (!existsSync(listPath)) {
  console.error(`tests/${doc}/mutants.json does not exist`);
  process.exit(1);
}
const mutants = JSON.parse(readFileSync(listPath, "utf8"));

let restore = null;
const restoreNow = () => {
  if (restore) writeFileSync(restore.path, restore.original);
  restore = null;
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => (restoreNow(), process.exit(130)));
process.on("exit", restoreNow);

const results = [];
for (const mutant of mutants) {
  const path = join(ROOT, mutant.file);
  const original = readFileSync(path, "utf8");
  let mutated;
  try {
    mutated = applyMutation(original, mutant);
  } catch (error) {
    console.error(`✗ ${mutant.name}: ${error.message} (${mutant.file})`);
    results.push({ name: mutant.name, failing: -1 });
    continue;
  }
  restore = { path, original };
  writeFileSync(path, mutated);
  const report = join(mkdtempSync(join(tmpdir(), "mutant-")), "report.json");
  const run = spawnSync("yarn", ["-s", "vitest", "run", `tests/${doc}`, "--reporter=json", `--outputFile=${report}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  restoreNow();

  let failing;
  try {
    failing = JSON.parse(readFileSync(report, "utf8")).numFailedTests;
  } catch {
    failing = run.status === 0 ? 0 : 1; // no readable report: a non-zero exit still means "something failed"
  }
  results.push({ name: mutant.name, failing });
  console.log(`${failing > 0 ? "caught  " : "SURVIVED"} (${failing} failing)  ${mutant.name}`);
}

const summary = mutationSummary(results);
console.log(`\n${doc}: ${summary.caught}/${summary.total} mutants caught${summary.survivors.length ? `; survivors: ${summary.survivors.join(", ")}` : ""}`);
process.exit(summary.ok ? 0 : 1);
