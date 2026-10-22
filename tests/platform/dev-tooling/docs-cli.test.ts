import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DOC, Project, TODAY } from "@/tests/_support/gate-fixture";

/* `yarn docs:check`, run for real on a throw-away project (specs/platform/dev-tooling.md, flows GATE-3 and GATE-3E). */

let project: Project;
beforeEach(() => void (project = new Project()));
afterEach(() => project.dispose());

const check = (...args: string[]) => project.run("check-docs.mjs", args);

describe("GATE-3 a consistent project", () => {
  it("passes and says how many modules and code files it covered", () => {
    const result = check();

    expect(result.status).toBe(0);
    expect(result.out).toContain("docs check OK — 1 modules, 1 code files owned");
  });

  it("--who names the doc and the paths a file's module owns", () => {
    const result = check("--who", "src/m.ts");

    expect(result.status).toBe(0);
    expect(result.out).toContain("→ docs/g/m.md");
    expect(result.out).toContain("owns: src/m.ts");
  });

  it("--who accepts a module name", () => {
    expect(check("--who", "g/m").out).toContain("docs/g/m.md");
    expect(check("--who", "m").out).toContain("docs/g/m.md");
  });

  it("--changed passes when nothing changed", () => {
    project.commitAll();

    const result = check("--changed");

    expect(result.status).toBe(0);
    expect(result.out).toContain("no module code changed");
  });

  it("--changed passes when the code and its doc changed together, with a new date", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("docs/g/m.md", DOC(TODAY).replace("Một hàm.", "Một hàm, đã đổi."));

    expect(check("--changed").status).toBe(0);
  });

  it("--changed lets a doc written today be edited again the same day", () => {
    project.write("docs/g/m.md", DOC(TODAY));
    project.commitAll();
    project.write("src/m.ts", "export const m = 3;\n");
    project.write("docs/g/m.md", DOC(TODAY).replace("Một hàm.", "Một hàm nữa."));

    expect(check("--changed").status).toBe(0);
  });

  it("--changed ignores a change that is not code (a message file, a markdown note)", () => {
    project.commitAll();
    project.write("src/messages/vi.json", "{}");
    project.write("NOTES.md", "x");

    expect(check("--changed").status).toBe(0);
  });
});

describe("GATE-3E ownership and structure", () => {
  it("names a code file that no module owns", () => {
    project.write("src/orphan.ts", "export {};\n");

    const result = check();

    expect(result.status).toBe(1);
    expect(result.out).toContain("no module owns src/orphan.ts");
  });

  it("names a module whose doc is missing", () => {
    project.remove("docs/g/m.md");

    expect(check().out).toContain("docs/g/m.md is missing");
  });

  it("refuses a doc that belongs to no module", () => {
    project.write("docs/g/stray.md", DOC());

    expect(check().out).toContain("docs/g/stray.md is not a module doc");
  });

  it("notices a module whose paths no longer exist", () => {
    project.remove("src/m.ts");

    expect(check().out).toContain("none of its paths exist any more");
  });

  it("asks for a README row for every doc", () => {
    project.write("docs/README.md", "# Docs\n");

    expect(check().out).toContain("docs/README.md has no row linking docs/g/m.md");
  });
});

describe("GATE-3E what a doc must look like", () => {
  const broken = (change: (doc: string) => string) => {
    project.write("docs/g/m.md", change(DOC()));
    return check();
  };

  it("needs the title on the first line", () => {
    expect(broken((d) => d.replace("# M\n", "M\n")).out).toContain('first line must be the "# <module name>" title');
  });

  it("needs the group and date line, and the code line", () => {
    expect(broken((d) => d.replace("**Cập nhật:** 2020-01-01", "")).out).toContain('header needs "> **Nhóm:**');
    expect(broken((d) => d.replace("> **Code:** `src/m.ts`\n", "")).out).toContain('header needs a "> **Code:**');
  });

  it("needs the four sections in order", () => {
    expect(broken((d) => d.replace("## 3. Submodule & chức năng hiện có", "## 3. Khác")).out).toContain('missing or out-of-order section "## 3. Submodule & chức năng hiện có"');
    expect(broken((d) => d.replace("## 4. Chi tiết", "")).out).toContain('"## 4. Chi tiết"');
  });

  it.each(["TODO", "FIXME", "roadmap", "kế hoạch", "đề xuất"])("refuses the planning word %s: docs say what the code does", (word) => {
    const result = broken((d) => d.replace("Tính toán.", `Cần ${word} sau.`));

    expect(result.status).toBe(1);
    expect(result.out).toContain("planning language is not allowed");
  });

  it("refuses a link to a doc that does not exist", () => {
    expect(broken((d) => d.replace("Tính toán.", "Xem [khác](./nowhere.md).")).out).toContain("broken link ./nowhere.md");
  });

  it("refuses a file name in backticks that does not exist", () => {
    expect(broken((d) => d.replace("Tính toán.", "Dùng `ghost.ts`.")).out).toContain("refers to a file that does not exist: ghost.ts");
  });

  it("accepts a file name that exists anywhere in the project", () => {
    expect(broken((d) => d.replace("Tính toán.", "Dùng `m.ts` và `README.md`.")).status).toBe(0);
  });

  it("does not check names that are not file names (a code expression, a glob)", () => {
    expect(broken((d) => d.replace("Tính toán.", "Dùng `a.b()` và `src/*.ts` và `<x>.ts`.")).status).toBe(0);
  });
});

describe("GATE-3E a module changed without its doc", () => {
  it("--changed names the module and its files", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");

    const result = check("--changed");

    expect(result.status).toBe(1);
    expect(result.out).toContain("docs/g/m.md was not updated, but its module changed (src/m.ts)");
  });

  it("--changed also counts a new, untracked code file", () => {
    project.write("scripts/extra.mjs", "");
    project.write("scripts/modules.mjs", project.read("scripts/modules.mjs").replace('paths: ["src/m.ts"]', 'paths: ["src/m.ts", "src/new.ts"]'));
    project.commitAll();
    project.write("src/new.ts", "export {};\n");

    expect(check("--changed").out).toContain("docs/g/m.md was not updated");
  });

  it("--changed wants a new date when an old doc is edited", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.write("docs/g/m.md", DOC().replace("Một hàm.", "Một hàm, đã đổi."));

    const result = check("--changed");

    expect(result.status).toBe(1);
    expect(result.out).toContain('"Cập nhật" date was not bumped');
  });

  it("--changed compares with another base when asked", () => {
    project.commitAll();
    project.write("src/m.ts", "export const m = 2;\n");
    project.git("add", "-A");
    project.git("commit", "-q", "-m", "code only");

    expect(check("--changed").status).toBe(0); // against HEAD nothing is left
    expect(check("--changed", "--base=HEAD~1").out).toContain("docs/g/m.md was not updated");
  });
});

describe("GATE-3E --who with something unknown", () => {
  it("says that no module owns the path and exits 1", () => {
    const result = check("--who", "src/unknown.ts");

    expect(result.status).toBe(1);
    expect(result.out).toContain("no module owns this path");
  });

  it("needs a target", () => {
    const result = check("--who");

    expect(result.status).toBe(1);
    expect(result.out).toContain("Usage:");
  });
});
