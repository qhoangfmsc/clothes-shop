/* Pure logic for `yarn test:progress`. Progress is derived from the repo, never kept by hand. */

/** A batch is one working session: small enough to read and finish without losing track. */
export const MAX_BATCH_SIZE = 5;
const BASELINE_FILE = "scripts/quality-baseline.json";

/**
 * Where one module stands: `pending` (no spec or tests, or still in the baseline), `partial`, or `done`.
 * @param {{ doc: string, spec: null | { status: string | null, scope: { full: boolean, note: string } | null, matrixProblems: string[], flowCount: number }, hasTests: boolean, testCount: number, pending: boolean }} input
 * @returns {{ state: "pending" | "partial" | "done", gaps: string[] }}
 */
export function classifyModule({ spec, hasTests, testCount, pending }) {
  const gaps = [];
  if (!spec) gaps.push("no spec");
  if (!hasTests) gaps.push("no tests");
  if (pending) gaps.push(`still listed in ${BASELINE_FILE}`);

  if (spec) {
    if (spec.status !== "Implemented") gaps.push(`spec status is ${spec.status ?? "missing"}, not Implemented`);
    if (!spec.scope) gaps.push("spec has no valid scope line");
    else if (!spec.scope.full) gaps.push(`spec scope is partial: ${spec.scope.note}`);
    for (const problem of spec.matrixProblems) gaps.push(`matrix: ${problem}`);
    if (hasTests && testCount < spec.flowCount) gaps.push(`${testCount} test(s) for ${spec.flowCount} flow(s): every flow needs a test`);
  }

  if (!spec || !hasTests || pending) return { state: "pending", gaps };
  return { state: gaps.length ? "partial" : "done", gaps };
}

/**
 * The plan must place every module exactly once (in `done` or in one batch), with 1 to MAX_BATCH_SIZE modules per batch.
 * @param {{ done: string[], batches: { id: number, modules: string[] }[] }} plan
 * @param {string[]} docs every module slug
 */
export function validateBatches(plan, docs) {
  const problems = [];
  const known = new Set(docs);
  const seenIds = new Set();
  const placed = new Map();
  const place = (doc, where) => {
    if (!known.has(doc)) problems.push(`scripts/test-batches.json: "${doc}" is not a module`);
    else if (placed.has(doc)) problems.push(`scripts/test-batches.json: ${doc} appears more than once (${placed.get(doc)} and ${where})`);
    else placed.set(doc, where);
  };

  for (const doc of plan.done) place(doc, "done");
  for (const batch of plan.batches) {
    if (seenIds.has(batch.id)) problems.push(`scripts/test-batches.json: batch id ${batch.id} is used twice`);
    seenIds.add(batch.id);
    if (batch.modules.length === 0) problems.push(`scripts/test-batches.json: batch ${batch.id} has no modules`);
    if (batch.modules.length > MAX_BATCH_SIZE) problems.push(`scripts/test-batches.json: batch ${batch.id} has ${batch.modules.length} modules (max ${MAX_BATCH_SIZE})`);
    for (const doc of batch.modules) place(doc, `batch ${batch.id}`);
  }
  for (const doc of docs) if (!placed.has(doc)) problems.push(`scripts/test-batches.json: ${doc} is in no batch (and not in done)`);
  return problems;
}

/** Counts per batch and overall. `statuses` maps a module slug to the result of `classifyModule`. */
export function scoreboard(plan, statuses) {
  const batches = plan.batches.map((batch) => ({
    id: batch.id,
    title: batch.title,
    total: batch.modules.length,
    done: batch.modules.filter((doc) => statuses[doc]?.state === "done").length,
    modules: batch.modules.map((doc) => ({ doc, state: statuses[doc]?.state ?? "pending" })),
  }));
  const all = [...plan.done, ...plan.batches.flatMap((b) => b.modules)];
  return { batches, total: all.length, done: all.filter((doc) => statuses[doc]?.state === "done").length };
}

/** The end-of-batch gate: `ok` only when every module of the batch is done; `lines` is the short report to paste. */
export function batchReport(plan, statuses, id) {
  const batch = plan.batches.find((b) => b.id === id);
  if (!batch) throw new Error(`no batch ${id} in scripts/test-batches.json`);

  const done = batch.modules.filter((doc) => statuses[doc]?.state === "done").length;
  const lines = [`Batch ${batch.id} — ${batch.title}: ${done}/${batch.modules.length} modules done`];
  for (const doc of batch.modules) {
    const status = statuses[doc] ?? { state: "pending", gaps: ["not evaluated"] };
    lines.push(status.state === "done" ? `  ✓ ${doc}` : `  ✗ ${doc} (${status.state}) — ${status.gaps.join("; ")}`);
  }
  return { ok: done === batch.modules.length, lines };
}

/**
 * One mutant: the source text with `find` replaced by `replace` (first occurrence). Throws when `find` is not
 * there or the change is a no-op, so an out-of-date mutant fails loudly instead of "surviving" harmlessly.
 * @param {string} source
 * @param {{ find: string, replace: string }} mutation
 */
export function applyMutation(source, { find, replace }) {
  if (!source.includes(find)) throw new Error(`text to replace not found: ${JSON.stringify(find)}`);
  if (find === replace) throw new Error(`mutation changes nothing: ${JSON.stringify(find)}`);
  return source.replace(find, () => replace);
}

/** @param {{ name: string, failing: number }[]} results failing = number of tests that failed with the mutant in place */
export function mutationSummary(results) {
  const survivors = results.filter((r) => r.failing <= 0).map((r) => r.name);
  return { total: results.length, caught: results.length - survivors.length, survivors, ok: results.length > 0 && survivors.length === 0 };
}
