import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Project } from "@/tests/_support/gate-fixture";

/* `yarn test:mutants`, run for real against a tiny project with real tests (specs/platform/dev-tooling.md, flows GATE-6
   and GATE-6E). Each mutant runs the project's tests, so these tests take a few seconds. */

const SOURCE = "export function add(a: number, b: number) {\n  return a + b;\n}\n\nexport function untested() {\n  return 1;\n}\n";

let project: Project;
beforeEach(() => {
  project = new Project();
  project.write("src/m.ts", SOURCE);
  project.write(
    "tests/g/m/m.test.ts",
    'import { expect, it } from "vitest";\nimport { add } from "../../../src/m";\n\nit("adds", () => {\n  expect(add(1, 2)).toBe(3);\n});\n'
  );
});
afterEach(() => project.dispose());

const mutants = (list: { name: string; find: string; replace: string; tests?: string[] }[]) => project.write("tests/g/m/mutants.json", JSON.stringify(list.map((m) => ({ file: "src/m.ts", ...m }))));
const run = (...args: string[]) => project.run("test-mutants.mjs", args);

describe("GATE-6 a mutant the tests notice", () => {
  it("is reported as caught with the number of failing tests, the run passes, and the file is restored", () => {
    mutants([{ name: "add subtracts", find: "return a + b;", replace: "return a - b;" }]);

    const result = run("g/m");

    expect(result.status).toBe(0);
    expect(result.out).toContain("caught   (1 failing)  add subtracts");
    expect(result.out).toContain("g/m: 1/1 mutants caught");
    expect(project.read("src/m.ts")).toBe(SOURCE);
  });
});

describe("GATE-6 a mutant that names the tests to run", () => {
  it("runs only those tests: a test file that does not cover the change lets it survive", () => {
    project.write("tests/g/m/other.test.ts", 'import { it } from "vitest";\nit("unrelated", () => {});\n');
    mutants([
      { name: "caught by its own file", find: "return a + b;", replace: "return a - b;", tests: ["tests/g/m/m.test.ts"] },
      { name: "missed by an unrelated file", find: "return a + b;", replace: "return a - b;", tests: ["tests/g/m/other.test.ts"] },
    ]);

    const result = run("g/m");

    expect(result.out).toContain("caught   (1 failing)  caught by its own file");
    expect(result.out).toContain("SURVIVED (0 failing)  missed by an unrelated file");
    expect(result.status).toBe(1);
  });
});

describe("GATE-6E a mutant that survives or cannot be applied", () => {
  it("names the survivor, fails the run, and still restores the file", () => {
    mutants([
      { name: "add subtracts", find: "return a + b;", replace: "return a - b;" },
      { name: "untested changes", find: "return 1;", replace: "return 2;" },
    ]);

    const result = run("g/m");

    expect(result.status).toBe(1);
    expect(result.out).toContain("SURVIVED (0 failing)  untested changes");
    expect(result.out).toContain("g/m: 1/2 mutants caught; survivors: untested changes");
    expect(project.read("src/m.ts")).toBe(SOURCE);
  });

  it("reports a mutant whose text is no longer in the file instead of letting it survive silently", () => {
    mutants([{ name: "stale", find: "return a * b;", replace: "return 0;" }]);

    const result = run("g/m");

    expect(result.status).toBe(1);
    expect(result.out).toContain('✗ stale: text to replace not found: "return a * b;" (src/m.ts)');
    expect(result.out).toContain("0/1 mutants caught; survivors: stale");
    expect(project.read("src/m.ts")).toBe(SOURCE);
  });

  it("refuses a mutant that changes nothing", () => {
    mutants([{ name: "noop", find: "return a + b;", replace: "return a + b;" }]);

    expect(run("g/m").out).toContain("mutation changes nothing");
  });

  it("fails on an empty list: nothing was proved", () => {
    mutants([]);

    expect(run("g/m").status).toBe(1);
  });

  it("needs a module name", () => {
    const result = run();

    expect(result.status).toBe(1);
    expect(result.out).toContain("Usage: node scripts/test-mutants.mjs <group>/<module>");
  });

  it("needs the module's mutants.json", () => {
    const result = run("g/m");

    expect(result.status).toBe(1);
    expect(result.out).toContain("tests/g/m/mutants.json does not exist");
  });
});
