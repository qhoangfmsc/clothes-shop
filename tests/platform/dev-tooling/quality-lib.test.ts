import { describe, expect, it } from "vitest";
import { hasWaiver, validateBaseline, validateCriticalFlows, validateSpec } from "@/scripts/quality-lib.mjs";

/* The rules behind `yarn quality:check`. Spec: specs/platform/dev-tooling.md, flows QG-1 … QG-4. */

const DOC = "platform/sample";

function makeSpec(overrides: { drop?: string[]; replace?: Record<string, string> } = {}) {
  let text = `# Sample — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Approved
> **Doc:** [platform/sample](../../docs/platform/sample.md) · **Test:** \`tests/platform/sample/\`

## 1. Bối cảnh & mục tiêu

Vấn đề.

## 2. Phạm vi

Làm gì.

## 3. Hợp đồng

Hành vi.

## 4. Thiết kế

Luồng.

## 5. Quyết định thiết kế

### Design pattern

Facade vì một nơi biết giao thức.

### Kiến trúc

Tầng lib, không phụ thuộc ngược lại.

### SOLID

Mỗi hàm một trách nhiệm rõ ràng.

### Conventions

Tiếng Anh, không UI text mới.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (hàm thuần) · permission = không (không có quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| S-1 | Làm A | đúng | — | unit | \`tests/platform/sample/a.test.ts\` |
| S-2 | Làm B | lỗi | — | unit | \`tests/platform/sample/b.test.ts\` |

## 7. Rủi ro & triển khai

Không có.

## 8. Lịch sử thay đổi

- 2026-10-21 · Viết spec.
`;
  for (const [from, to] of Object.entries(overrides.replace ?? {})) text = text.replace(from, to);
  for (const line of overrides.drop ?? []) text = text.replace(line, "");
  return text;
}

const existing = new Set(["docs/platform/sample.md", "tests/platform/sample/a.test.ts", "tests/platform/sample/b.test.ts"]);
const check = (text: string) => validateSpec(text, { doc: DOC, fileExists: (p: string) => existing.has(p) });

describe("QG-1 spec structure", () => {
  it("accepts a complete spec", () => {
    expect(check(makeSpec())).toEqual([]);
  });

  it("rejects a missing section", () => {
    expect(check(makeSpec({ drop: ["## 7. Rủi ro & triển khai"] })).join("\n")).toContain('missing or out-of-order section "## 7. Rủi ro & triển khai"');
  });

  it("rejects an unknown status", () => {
    expect(check(makeSpec({ replace: { "Approved": "Maybe" } })).join("\n")).toContain('status "Maybe"');
  });

  it("rejects a header without the test folder", () => {
    expect(check(makeSpec({ replace: { "`tests/platform/sample/`": "nothing" } })).join("\n")).toContain("**Test:**");
  });

  it("rejects a doc link to a doc that does not exist", () => {
    expect(validateSpec(makeSpec(), { doc: DOC, fileExists: () => false }).join("\n")).toContain("docs/platform/sample.md (its doc) does not exist");
  });
});

describe("QG-2 design decisions", () => {
  it.each(["### Design pattern", "### Kiến trúc", "### SOLID", "### Conventions"])("requires %s in section 5", (heading) => {
    const problems = check(makeSpec({ replace: { [`${heading}\n`]: "" } })).join("\n");
    expect(problems).toContain(heading);
  });

  it("rejects an empty sub-section", () => {
    const problems = check(makeSpec({ replace: { "Mỗi hàm một trách nhiệm rõ ràng.": "" } })).join("\n");
    expect(problems).toContain('"### SOLID" in section 5 is empty');
  });
});

describe("QG-3 flows and tests", () => {
  it("rejects a flow that names no test", () => {
    expect(check(makeSpec({ replace: { "`tests/platform/sample/b.test.ts`": "—" } })).join("\n")).toContain("flow S-2 names no test file");
  });

  it("rejects a flow whose test file does not exist", () => {
    expect(check(makeSpec({ replace: { "b.test.ts": "gone.test.ts" } })).join("\n")).toContain("tests/platform/sample/gone.test.ts, which does not exist");
  });

  it("rejects a repeated flow id", () => {
    expect(check(makeSpec({ replace: { "| S-2 |": "| S-1 |" } })).join("\n")).toContain("flow id S-1 appears twice");
  });

  it("rejects a section 6 without any flow", () => {
    const text = makeSpec({ replace: { "| S-1 | Làm A | đúng | — | unit | `tests/platform/sample/a.test.ts` |\n": "", "| S-2 | Làm B | lỗi | — | unit | `tests/platform/sample/b.test.ts` |\n": "" } });
    expect(check(text).join("\n")).toContain("section 6 needs a table with at least one flow");
  });
});

describe("QG-4 baseline and critical flows", () => {
  const covered = { doc: "a/covered", hasSpec: true, hasTests: true };
  const uncovered = { doc: "a/todo", hasSpec: false, hasTests: false };

  it("accepts covered modules outside the baseline and uncovered ones inside it", () => {
    expect(validateBaseline([covered, uncovered], ["a/todo"])).toEqual([]);
  });

  it("demands that a covered module leaves the baseline", () => {
    expect(validateBaseline([covered, uncovered], ["a/todo", "a/covered"]).join("\n")).toContain("a/covered now has a spec and tests");
  });

  it("refuses an uncovered module that is not in the baseline: the baseline cannot grow", () => {
    expect(validateBaseline([covered, uncovered], []).join("\n")).toContain("a/todo is missing specs/a/todo.md and tests/a/todo/");
  });

  it("treats a spec without tests as uncovered", () => {
    const half = { doc: "a/half", hasSpec: true, hasTests: false };
    expect(validateBaseline([half], []).join("\n")).toContain("a/half is missing tests/a/half/");
  });

  it("rejects baseline entries that are not modules, or are repeated", () => {
    const problems = validateBaseline([covered], ["x/ghost", "x/ghost"]).join("\n");
    expect(problems).toContain('"x/ghost" is not a module');
    expect(problems).toContain("duplicate entries");
  });

  const flows = (rows: string) => `| ID | Luồng | Tier | Module | Test |\n|---|---|---|---|---|\n${rows}\n`;
  const ctx = { modules: ["platform/auth"], fileExists: (p: string) => p === "tests/real.test.ts" };

  it("accepts flows with a real test or no test yet", () => {
    expect(validateCriticalFlows(flows("| F-1 | A | P0 | platform/auth | `tests/real.test.ts` |\n| F-2 | B | P1 | — | — |"), ctx)).toEqual([]);
  });

  it("flags a bad tier, an unknown module, and a missing test file", () => {
    const problems = validateCriticalFlows(flows("| F-1 | A | P9 | nowhere/x | `tests/gone.test.ts` |"), ctx).join("\n");
    expect(problems).toContain('tier "P9"');
    expect(problems).toContain('unknown module "nowhere/x"');
    expect(problems).toContain("tests/gone.test.ts, which does not exist");
  });
});

describe("QG-4 waivers logged in a spec", () => {
  it("accepts a no-test or baseline-grow line that was added with a reason", () => {
    expect(hasWaiver("+- 2026-10-21 · fix. no-test: comments only", "no-test")).toBe(true);
    expect(hasWaiver("+baseline-grow: detector fixed", "baseline-grow")).toBe(true);
  });

  it("ignores a waiver with no reason, one that was not added, or another tag", () => {
    expect(hasWaiver("+ no-test:", "no-test")).toBe(false);
    expect(hasWaiver("- no-test: removed line", "no-test")).toBe(false);
    expect(hasWaiver(" no-test: unchanged line", "no-test")).toBe(false);
    expect(hasWaiver("+ no-test: x", "baseline-grow")).toBe(false);
  });
});
