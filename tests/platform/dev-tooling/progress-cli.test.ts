import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DOC, Project, SPEC } from "@/tests/_support/gate-fixture";

/* `yarn test:progress`, run for real (specs/platform/dev-tooling.md, flows GATE-5 and GATE-5E).
   The project has one finished module (g/m) and one waiting module (admin/n) in batch 1. */

let project: Project;
beforeEach(() => {
  project = new Project();
  project.write("scripts/modules.mjs", project.read("scripts/modules.mjs").replace('paths: ["src/m.ts"] }]', 'paths: ["src/m.ts"] }, { doc: "admin/n", paths: ["src/n.ts"] }]'));
  project.write("src/n.ts", "export const n = 1;\nexport const n2 = 2;\n");
  project.write("scripts/quality-baseline.json", JSON.stringify({ pending: ["admin/n"] }));
  project.write("scripts/test-batches.json", JSON.stringify({ done: ["g/m"], batches: [{ id: 1, title: "First", why: "Money moves here", focus: "Cover the totals", modules: ["admin/n"] }] }));
  project.write("docs/admin/n.md", DOC());
  project.write("tests/g/m/m.test.ts", 'it("a", () => {});\nit("b", () => {});\n');
});
afterEach(() => project.dispose());

const run = (...args: string[]) => project.run("test-progress.mjs", args);
const finishN = (status = "Implemented") => {
  const spec = SPEC().replaceAll("g/m", "admin/n").replaceAll("m.test.ts", "n.test.ts").replace("Implemented", status);
  project.write("specs/admin/n.md", spec);
  project.write("tests/admin/n/n.test.ts", 'it("a", () => {});\nit("b", () => {});\n');
  project.write("scripts/quality-baseline.json", JSON.stringify({ pending: [] }));
};

describe("GATE-5 the board", () => {
  it("shows how many modules are done, the finished list, each batch and what to open next", () => {
    const result = run();

    expect(result.status).toBe(0);
    expect(result.out).toContain("TEST PROCESS — 1/2 modules done");
    expect(result.out).toContain("done list: ✓ g/m");
    expect(result.out).toContain("Batch 1 — First   0/1");
    expect(result.out).toContain("· admin/n");
    expect(result.out).toContain("Next: yarn test:progress --batch 1");
  });

  it("shows a module that has a spec and tests but is not finished as partial, with the first gap", () => {
    finishN("Draft");

    expect(run().out).toContain("◐ admin/n   — spec status is Draft, not Implemented");
  });

  it("says all batches are done, and counts the module, once it is finished", () => {
    finishN();

    const result = run();

    expect(result.out).toContain("2/2 modules done");
    expect(result.out).toContain("All batches done.");
  });

  it("--json gives the plan, every module's status and the board", () => {
    const data = JSON.parse(run("--json").out);

    expect(Object.keys(data).sort()).toEqual(["board", "plan", "statuses"]);
    expect(data.statuses["g/m"].state).toBe("done");
    expect(data.statuses["admin/n"]).toMatchObject({ state: "pending", gaps: ["no spec", "no tests", "still listed in scripts/quality-baseline.json"] });
    expect(data.board).toMatchObject({ total: 2, done: 1 });
  });
});

describe("GATE-5 the worksheet of a batch", () => {
  it("names the batch, why and what to focus on", () => {
    const out = run("--batch", "1").out;

    expect(out).toContain("BATCH 1 — First");
    expect(out).toContain("why:   Money moves here");
    expect(out).toContain("focus: Cover the totals");
  });

  it("lists each module's doc, spec to create, test folder, files with their size and the gaps", () => {
    const out = run("--batch", "1").out;

    expect(out).toContain("admin/n  [pending]  1 files, 3 lines"); // the count includes the empty last line
    expect(out).toContain("doc: docs/admin/n.md   spec: specs/admin/n.md (to create)   tests: tests/admin/n/ (0 files, ~0 tests, 0 flows)");
    expect(out).toContain("largest: src/n.ts (3)");
    expect(out).toContain("gaps: no spec; no tests; still listed in scripts/quality-baseline.json");
  });

  it("hints which identities an admin module needs to cover", () => {
    expect(run("--batch", "1").out).toContain("admin page: guest, user, admin đủ quyền, admin thiếu quyền → auth = có, permission = có");
  });

  it("counts the tests and flows of a module that has them", () => {
    finishN();

    expect(run("--batch", "1").out).toContain("tests: tests/admin/n/ (1 files, ~2 tests, 2 flows)");
  });
});

describe("GATE-5 the end-of-batch gate", () => {
  it("--verify passes, and reports the batch, when every module is done", () => {
    finishN();

    const result = run("--verify", "1");

    expect(result.status).toBe(0);
    expect(result.out).toContain("Batch 1 — First: 1/1 modules done");
    expect(result.out).toContain("✓ admin/n");
  });
});

describe("GATE-5E things that go wrong", () => {
  it("--verify fails and names what is missing", () => {
    const result = run("--verify", "1");

    expect(result.status).toBe(1);
    expect(result.out).toContain("0/1 modules done");
    expect(result.out).toContain("✗ admin/n (pending) — no spec; no tests; still listed in scripts/quality-baseline.json");
  });

  it("--verify fails for a module that is only partly done", () => {
    finishN("Approved");

    const result = run("--verify", "1");

    expect(result.status).toBe(1);
    expect(result.out).toContain("spec status is Approved, not Implemented");
  });

  it("refuses a batch that does not exist", () => {
    const result = run("--batch", "9");

    expect(result.status).toBe(1);
    expect(result.out).toContain("no batch 9");
  });

  it("refuses to run with a plan that misses a module", () => {
    project.write("scripts/test-batches.json", JSON.stringify({ done: ["g/m"], batches: [] }));

    const result = run();

    expect(result.status).toBe(1);
    expect(result.out).toContain("admin/n is in no batch");
  });
});
