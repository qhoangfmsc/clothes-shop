import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Project, SPEC, TODAY } from "@/tests/_support/gate-fixture";

/* `yarn quality:check`, run for real on a throw-away project (specs/platform/dev-tooling.md, flows GATE-4 and GATE-4E). */

let project: Project;
beforeEach(() => void (project = new Project()));
afterEach(() => project.dispose());

const check = (...args: string[]) => project.run("check-quality.mjs", args);
const pending = (...docs: string[]) => project.write("scripts/quality-baseline.json", JSON.stringify({ pending: docs }));

describe("GATE-4 a consistent project", () => {
  it("passes and counts the modules that have a spec and tests", () => {
    const result = check();

    expect(result.status).toBe(0);
    expect(result.out).toContain("quality check OK — 1/1 modules have a spec + tests (0 pending)");
  });

  it("lets a module without spec and tests wait in the baseline", () => {
    project.remove("specs/g/m.md");
    project.remove("tests/g/m");
    project.edit("specs/_critical-flows.md", "`tests/g/m/m.test.ts`", "—"); // a flow with no test yet
    pending("g/m");

    const result = check();

    expect(result.status).toBe(0);
    expect(result.out).toContain("0/1 modules have a spec + tests (1 pending)");
  });

  it("--changed passes when nothing changed", () => {
    project.commitAll();

    expect(check("--changed").status).toBe(0);
  });

  it("--changed passes when the code, its spec (new date) and a test changed together", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("specs/g/m.md", SPEC(TODAY).replace("Viết spec.", "Đổi code."));
    project.write("tests/g/m/m.test.ts", "export const changed = true;\n");

    const result = check("--changed");

    expect(result.status).toBe(0);
    expect(result.out).toContain("1 changed module(s) covered");
  });

  it("--changed accepts a change without a test when the spec's history says why (no-test)", () => {
    project.commitAll();
    project.write("src/m.ts", "// comment\nexport const m = 1;\n");
    project.write("specs/g/m.md", SPEC(TODAY).replace("- 2020-01-01 · Viết spec.", "- 2020-01-01 · Viết spec.\n- 2026-10-22 · Sửa comment. no-test: chỉ sửa comment."));

    expect(check("--changed").status).toBe(0);
  });

  it("--changed does not count a change outside the module's code", () => {
    project.commitAll();
    project.write("README.md", "hello");

    expect(check("--changed").status).toBe(0);
  });
});

describe("GATE-4E modules without spec or tests", () => {
  it("fails for a module that has neither and is not in the baseline: the baseline cannot grow", () => {
    project.remove("specs/g/m.md");
    project.remove("tests/g/m");

    const result = check();

    expect(result.status).toBe(1);
    expect(result.out).toContain("g/m is missing specs/g/m.md and tests/g/m/");
  });

  it("fails for a module that has a spec but no test", () => {
    project.remove("tests/g/m");

    expect(check().out).toContain("g/m is missing tests/g/m/");
  });

  it("fails for a covered module that is still in the baseline: the list only shrinks", () => {
    pending("g/m");

    expect(check().out).toContain("g/m now has a spec and tests: remove it from scripts/quality-baseline.json");
  });

  it("fails for a baseline entry that is not a module", () => {
    pending("x/ghost");

    expect(check().out).toContain('"x/ghost" is not a module');
  });

  it("fails when the baseline file is broken", () => {
    project.write("scripts/quality-baseline.json", "{oops");

    expect(check().out).toContain("scripts/quality-baseline.json is missing or is not valid JSON");
  });
});

describe("GATE-4E files that do not belong", () => {
  it.each([
    ["specs/g/stray.md", "is not a module spec"],
    ["specs/loose.md", "is not a module spec"],
    ["specs/notes.txt", "is not a module spec"],
  ])("refuses %s in specs/", (path, message) => {
    project.write(path, "x");

    expect(check().out).toContain(message);
  });

  it("allows the shared underscore files in specs/", () => {
    project.write("specs/_extra.md", "# note\n");

    expect(check().status).toBe(0);
  });

  it("refuses a loose file in tests/ and a folder that is not a module", () => {
    project.write("tests/loose.test.ts", "export {};\n");
    project.write("tests/g/other/x.test.ts", "export {};\n");

    const out = check().out;

    expect(out).toContain("tests/loose.test.ts: tests/ only holds README.md");
    expect(out).toContain("tests/g/other/x.test.ts is not in a module folder");
  });

  it("allows tests/_support and tests/e2e", () => {
    project.write("tests/_support/helper.ts", "export {};\n");
    project.write("tests/e2e/journey.e2e.ts", "export {};\n");

    expect(check().status).toBe(0);
  });
});

describe("GATE-4E specs and plans that are wrong", () => {
  it("shows the problems of a spec with its path", () => {
    project.write("specs/g/m.md", SPEC().replace("### SOLID", ""));

    const result = check();

    expect(result.status).toBe(1);
    expect(result.out).toContain("specs/g/m.md: section 5 is missing");
  });

  it("wants the shared critical-flows file", () => {
    project.remove("specs/_critical-flows.md");

    expect(check().out).toContain("specs/_critical-flows.md is missing");
  });

  it("checks that the batch plan places every module", () => {
    project.write("scripts/test-batches.json", JSON.stringify({ done: [], batches: [] }));

    expect(check().out).toContain("g/m is in no batch");
  });

  it("fails when the batch plan is missing", () => {
    project.remove("scripts/test-batches.json");

    expect(check().out).toContain("scripts/test-batches.json is missing or is not valid JSON");
  });

  it("does not judge comments: that is conventions:check", () => {
    project.write("src/m.ts", "/*\n * a\n * b\n * c\n */\nexport const m = 1;\n");

    expect(check().status).toBe(0); // the comment rule belongs to conventions:check, not here
  });
});

describe("GATE-4E a module changed without its spec or tests", () => {
  it("names the module and asks for the spec first", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");

    const result = check("--changed");

    expect(result.status).toBe(1);
    expect(result.out).toContain("specs/g/m.md was not updated, but its module changed (src/m.ts)");
  });

  it("asks for a test when the spec changed but no test did", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("specs/g/m.md", SPEC(TODAY).replace("Viết spec.", "Đổi code."));

    expect(check("--changed").out).toContain("no test under tests/g/m/ was added or changed");
  });

  it("asks for a new date when an old spec is edited", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("specs/g/m.md", SPEC().replace("Viết spec.", "Đổi code."));
    project.write("tests/g/m/m.test.ts", "export const changed = true;\n");

    expect(check("--changed").out).toContain('"Cập nhật" date was not bumped');
  });

  it("a test file of another module does not count", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("specs/g/m.md", SPEC(TODAY).replace("Viết spec.", "Đổi code."));
    project.write("tests/e2e/other.e2e.ts", "export {};\n");

    expect(check("--changed").out).toContain("no test under tests/g/m/");
  });

  it("only a file that looks like a test counts (a fixture or a JSON does not)", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("specs/g/m.md", SPEC(TODAY).replace("Viết spec.", "Đổi code."));
    project.write("tests/g/m/fixture.json", "{}");

    expect(check("--changed").out).toContain("no test under tests/g/m/");
  });
});

describe("GATE-4E the baselines may only shrink", () => {
  it("refuses a module added to the quality baseline", () => {
    project.commitAll();
    project.remove("specs/g/m.md");
    project.remove("tests/g/m");
    pending("g/m");

    expect(check("--changed").out).toContain('scripts/quality-baseline.json: "g/m" was added — the baseline can only shrink');
  });

  it("refuses a file added to the comment baseline", () => {
    project.commitAll();
    project.write("scripts/comment-baseline.json", JSON.stringify({ files: ["src/m.ts"] }));

    expect(check("--changed").out).toContain('scripts/comment-baseline.json: "src/m.ts" was added — shorten its comments instead');
  });

  it("lets a baseline-grow line in the tooling spec's history waive both (for a fixed detector)", () => {
    project.write("specs/platform/dev-tooling.md", SPEC().replace("Viết spec.", "Viết spec."));
    project.commitAll();
    project.write("scripts/comment-baseline.json", JSON.stringify({ files: ["src/m.ts"] }));
    project.write("specs/platform/dev-tooling.md", SPEC(TODAY).replace("Viết spec.", "Viết spec.\n- baseline-grow: detector fixed, old file revealed"));

    const out = check("--changed").out;

    expect(out).not.toContain("was added");
  });
});
