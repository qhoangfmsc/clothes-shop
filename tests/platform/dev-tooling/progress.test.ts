import { describe, expect, it } from "vitest";
import { MAX_BATCH_SIZE, applyMutation, batchReport, classifyModule, mutationSummary, scoreboard, validateBatches } from "@/scripts/progress-lib.mjs";

/* QG-7: how far each module is, and the batch plan that splits the work. Spec: specs/platform/dev-tooling.md. */

const MATRIX_OK = { problems: [] as string[] };

function spec(overrides: Record<string, unknown> = {}) {
  return {
    status: "Implemented",
    scope: { full: true, note: "" },
    matrixProblems: MATRIX_OK.problems,
    flowCount: 3,
    ...overrides,
  };
}

const base = { doc: "platform/x", hasTests: true, testCount: 5, pending: false };

describe("classifyModule", () => {
  it("is done when everything is in place", () => {
    expect(classifyModule({ ...base, spec: spec() })).toEqual({ state: "done", gaps: [] });
  });

  it("is pending, with every gap named, when it has no spec and no tests", () => {
    const result = classifyModule({ doc: "platform/x", spec: null, hasTests: false, testCount: 0, pending: true });

    expect(result.state).toBe("pending");
    expect(result.gaps).toEqual(expect.arrayContaining(["no spec", "no tests", "still listed in scripts/quality-baseline.json"]));
  });

  it("stays pending while it is in the baseline even with a spec and tests", () => {
    const result = classifyModule({ ...base, spec: spec(), pending: true });

    expect(result.state).toBe("pending");
    expect(result.gaps).toEqual(["still listed in scripts/quality-baseline.json"]);
  });

  it("is partial when the spec covers only part of the module", () => {
    const result = classifyModule({ ...base, spec: spec({ scope: { full: false, note: "chỉ phiên" } }) });

    expect(result.state).toBe("partial");
    expect(result.gaps).toEqual(["spec scope is partial: chỉ phiên"]);
  });

  it("is partial while the spec is not Implemented", () => {
    const result = classifyModule({ ...base, spec: spec({ status: "Approved" }) });

    expect(result).toEqual({ state: "partial", gaps: ["spec status is Approved, not Implemented"] });
  });

  it("reports the missing matrix cells", () => {
    const result = classifyModule({ ...base, spec: spec({ matrixProblems: ['needs at least one "lỗi" flow'] }) });

    expect(result.state).toBe("partial");
    expect(result.gaps).toEqual(['matrix: needs at least one "lỗi" flow']);
  });

  it("wants at least one test per flow", () => {
    const result = classifyModule({ ...base, testCount: 2, spec: spec({ flowCount: 3 }) });

    expect(result).toEqual({ state: "partial", gaps: ["2 test(s) for 3 flow(s): every flow needs a test"] });
  });

  it("collects several gaps at once", () => {
    const result = classifyModule({ ...base, testCount: 1, spec: spec({ status: "Draft", scope: { full: false, note: "x" } }) });

    expect(result.gaps).toHaveLength(3);
  });
});

describe("validateBatches", () => {
  const docs = ["a/one", "a/two", "a/three", "a/four"];
  const plan = (batches: { id: number; modules: string[] }[], done: string[] = []) => ({ done, batches: batches.map((b) => ({ title: "t", why: "w", focus: "f", ...b })) });

  it("accepts a plan that places every module exactly once", () => {
    expect(validateBatches(plan([{ id: 1, modules: ["a/two", "a/three"] }, { id: 2, modules: ["a/four"] }], ["a/one"]), docs)).toEqual([]);
  });

  it("flags a module that is in no batch", () => {
    expect(validateBatches(plan([{ id: 1, modules: ["a/two"] }], ["a/one"]), docs).join("\n")).toContain("a/three is in no batch");
  });

  it("flags a module placed twice", () => {
    expect(validateBatches(plan([{ id: 1, modules: ["a/two", "a/three"] }, { id: 2, modules: ["a/two", "a/four"] }], ["a/one"]), docs).join("\n")).toContain("a/two appears more than once");
  });

  it("flags an unknown module", () => {
    expect(validateBatches(plan([{ id: 1, modules: ["a/two", "a/three", "a/four", "x/ghost"] }], ["a/one"]), docs).join("\n")).toContain('"x/ghost" is not a module');
  });

  it(`rejects a batch of more than ${MAX_BATCH_SIZE} modules`, () => {
    const many = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) => `m/${i}`);

    expect(validateBatches(plan([{ id: 1, modules: many }]), many).join("\n")).toContain(`batch 1 has ${MAX_BATCH_SIZE + 1} modules`);
  });

  it("rejects an empty batch and repeated batch ids", () => {
    const problems = validateBatches(plan([{ id: 1, modules: [] }, { id: 1, modules: ["a/two", "a/three", "a/four"] }], ["a/one"]), docs).join("\n");

    expect(problems).toContain("batch 1 has no modules");
    expect(problems).toContain("batch id 1 is used twice");
  });
});

describe("scoreboard and batchReport", () => {
  const plan = {
    done: ["a/one"],
    batches: [
      { id: 1, title: "First", why: "w", focus: "f", modules: ["a/two", "a/three"] },
      { id: 2, title: "Second", why: "w", focus: "f", modules: ["a/four"] },
    ],
  };
  const statuses = {
    "a/one": { state: "done", gaps: [] },
    "a/two": { state: "done", gaps: [] },
    "a/three": { state: "partial", gaps: ["spec status is Draft, not Implemented"] },
    "a/four": { state: "pending", gaps: ["no spec"] },
  };

  it("counts done modules per batch and overall", () => {
    const board = scoreboard(plan, statuses);

    expect(board.batches.map((b: { id: number; done: number; total: number }) => [b.id, b.done, b.total])).toEqual([[1, 1, 2], [2, 0, 1]]);
    expect(board.total).toBe(4);
    expect(board.done).toBe(2);
  });

  it("verify fails while any module of the batch is not done, and names the gaps", () => {
    const report = batchReport(plan, statuses, 1);

    expect(report.ok).toBe(false);
    expect(report.lines.join("\n")).toContain("a/three");
    expect(report.lines.join("\n")).toContain("spec status is Draft");
  });

  it("verify passes when the whole batch is done", () => {
    const report = batchReport(plan, { ...statuses, "a/three": { state: "done", gaps: [] } }, 1);

    expect(report.ok).toBe(true);
    expect(report.lines.join("\n")).toContain("2/2");
  });

  it("throws for an unknown batch id", () => {
    expect(() => batchReport(plan, statuses, 9)).toThrow("no batch 9");
  });
});

describe("QG-10 mutants (breaking the code on purpose to see the tests fail)", () => {
  const source = "if (a) {\n  return 1;\n}\nif (a) {\n  return 2;\n}";

  it("replaces the first occurrence of the text", () => {
    expect(applyMutation(source, { find: "if (a)", replace: "if (true)" })).toBe("if (true) {\n  return 1;\n}\nif (a) {\n  return 2;\n}");
  });

  it("refuses a mutation whose text is not in the file, so a stale mutant cannot pass silently", () => {
    expect(() => applyMutation(source, { find: "if (b)", replace: "" })).toThrow('text to replace not found: "if (b)"');
  });

  it("refuses a mutation that changes nothing", () => {
    expect(() => applyMutation(source, { find: "return 1;", replace: "return 1;" })).toThrow("changes nothing");
  });

  it("summarises caught and surviving mutants", () => {
    const summary = mutationSummary([
      { name: "a", failing: 2 },
      { name: "b", failing: 0 },
      { name: "c", failing: 1 },
    ]);

    expect(summary).toEqual({ total: 3, caught: 2, survivors: ["b"], ok: false });
  });

  it("is ok only when every mutant is caught, and an empty list is not ok", () => {
    expect(mutationSummary([{ name: "a", failing: 1 }]).ok).toBe(true);
    expect(mutationSummary([]).ok).toBe(false);
  });
});
