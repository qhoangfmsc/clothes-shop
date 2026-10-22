import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Project } from "@/tests/_support/gate-fixture";

/* `yarn conventions:check`, run for real on throw-away files (specs/platform/dev-tooling.md, flows GATE-2 and GATE-2E). */

let project: Project;
beforeEach(() => void (project = new Project()));
afterEach(() => project.dispose());

/** Writes `code` to `path` and returns the check's verdict. */
function verdict(path: string, code: string) {
  project.remove("src"); // each verdict looks at this one file (plus the module's own)
  project.write("src/m.ts", "export const m = 1;\n");
  project.write(path, code);
  return project.run("check-conventions.mjs");
}
const flagged = (path: string, code: string, rule: string) => {
  const result = verdict(path, code);
  return result.status === 1 && result.out.includes(`[${rule}]`) && result.out.includes(path);
};
const clean = (path: string, code: string) => verdict(path, code).status === 0;

const APP = "src/app/x/Page.tsx";

describe("GATE-2 code that follows the conventions", () => {
  it("passes and says how many files it looked at", () => {
    const result = project.run("check-conventions.mjs");

    expect(result.status).toBe(0);
    expect(result.out).toContain("conventions check OK");
  });

  it("ignores what is inside comments and strings that only look like a violation", () => {
    expect(clean(APP, '// alert("x") and .toFixed(2) and setInterval(f, 1)\n/* window.confirm("x") */\nexport const a = 1;\n')).toBe(true);
  });

  it("lets one line opt out with a reason, on the line or the line above", () => {
    expect(clean(APP, '// conventions-ignore: native-dialog legacy import screen\nalert("x");\n')).toBe(true);
    expect(clean("src/app/x/Other.tsx", 'alert("x"); // conventions-ignore: native-dialog legacy import screen\n')).toBe(true);
  });

  it("an opt-out names one rule only", () => {
    expect(flagged(APP, '// conventions-ignore: money-format reason\nalert("x");\n', "native-dialog")).toBe(true);
  });

  it("does not look at message files", () => {
    expect(clean("src/messages/vi/x.ts", 'alert("x");\n')).toBe(true);
  });
});

describe("GATE-2E error text goes through the hook (error-message)", () => {
  it("refuses the bare helper in a component", () => {
    expect(flagged(APP, 'import { errorMessage } from "@/src/i18n/error-message";\n', "error-message")).toBe(true);
  });

  it("allows it outside components, and the other helpers everywhere", () => {
    expect(clean("src/lib/x.ts", 'import { errorMessage } from "@/src/i18n/error-message";\n')).toBe(true);
    expect(clean(APP, 'import { errorCodeOf } from "@/src/i18n/error-message";\n')).toBe(true);
  });
});

describe("GATE-2E money is formatted in one place (money-format)", () => {
  it.each(['new Intl.NumberFormat("vi")', "price.toFixed(2)", "price.toLocaleString()", 'format.number(v, "price")', 'format.number(v, "vnd")'])("refuses %s in a component", (snippet) => {
    expect(flagged(APP, `export const a = ${snippet};\n`, "money-format")).toBe(true);
  });

  it("refuses it in hooks and lib too, but not in the one file that formats money", () => {
    expect(flagged("src/hooks/use-x.ts", "export const a = n.toFixed(1);\n", "money-format")).toBe(true);
    expect(flagged("src/lib/other.ts", "export const a = n.toFixed(1);\n", "money-format")).toBe(true);
    expect(clean("src/lib/money.ts", 'export const a = new Intl.NumberFormat("vi");\n')).toBe(true);
  });

  it("allows other number formats and other folders", () => {
    expect(clean(APP, 'export const a = format.number(v, "decimal1");\n')).toBe(true);
    expect(clean("src/types/x.ts", "export const a = n.toFixed(1);\n")).toBe(true);
  });
});

describe("GATE-2E themed dialogs only (native-dialog)", () => {
  it.each(['alert("x");', 'window.confirm("x");', 'prompt("x");', 'const ok = confirm("sure?");'])("refuses %s", (code) => {
    expect(flagged(APP, `${code}\n`, "native-dialog")).toBe(true);
  });

  it("allows a method that merely has the name, and the confirm returned by useConfirm", () => {
    expect(clean(APP, "dialog.confirm('x');\nobj.alert('y');\n")).toBe(true);
    expect(clean(APP, "const confirm = useConfirm();\nawait confirm({ message: 'x' });\n")).toBe(true);
  });

  it("still refuses window.confirm in a file that uses useConfirm", () => {
    expect(flagged(APP, "const c = useConfirm();\nwindow.confirm('x');\n", "native-dialog")).toBe(true);
  });
});

describe("GATE-2E one sort syntax and one list query (old-sort-syntax, list-query, max-limit)", () => {
  it.each(['"price_asc"', "'name_desc'", '"title_asc"', '"rating_desc"', '"sorts"'])("refuses the old sort %s", (snippet) => {
    expect(flagged(APP, `export const a = ${snippet};\n`, "old-sort-syntax")).toBe(true);
  });

  it("allows the new sort syntax", () => {
    expect(clean(APP, 'export const a = "-price";\nexport const b = "name";\n')).toBe(true);
  });

  it.each(['p.set("limit", "5")', "p.set('page', '2')", 'p.set("sort", "x")', 'p.set("search", q)'])("refuses building a list URL by hand: %s", (snippet) => {
    expect(flagged(APP, `${snippet};\n`, "list-query")).toBe(true);
  });

  it("allows it in the list-query file and for other parameters", () => {
    expect(clean("src/lib/list-query.ts", 'qs.set("limit", "5");\n')).toBe(true);
    expect(clean(APP, 'p.set("category", "tops");\n')).toBe(true);
  });

  it.each(["limit: 500", "pageSize = 300", "limit={250}", "limit: 201"])("refuses a limit above 200: %s", (snippet) => {
    expect(flagged(APP, `const a = { ${snippet} };\n`, "max-limit")).toBe(true);
  });

  it.each(["limit: 200", "limit: 25", "pageSize = 99", "limit: LIST_MAX_LIMIT"])("allows %s", (snippet) => {
    expect(clean(APP, `const a = { ${snippet} };\n`)).toBe(true);
  });
});

describe("GATE-2E one carousel and one timer (carousel, auto-advance)", () => {
  it.each(['className="snap-x"', "'snap-mandatory'", "scroll-snap-type: x"])("refuses a hand-rolled carousel: %s", (snippet) => {
    expect(flagged(APP, `const a = "${snippet}";\n`, "carousel")).toBe(true);
  });

  it("allows it inside Carousel.tsx", () => {
    expect(clean("src/app/_components/Carousel.tsx", 'const a = "snap-x";\n')).toBe(true);
  });

  it("refuses setInterval everywhere but the shared hook", () => {
    expect(flagged(APP, "setInterval(() => {}, 1000);\n", "auto-advance")).toBe(true);
    expect(clean("src/hooks/use-auto-advance.ts", "setInterval(() => {}, 1000);\n")).toBe(true);
  });
});

describe("GATE-2E toast text comes from messages (toast-i18n)", () => {
  it.each(["success", "error", "info", "warning"])("refuses a string literal in toast.%s", (kind) => {
    expect(flagged(APP, `toast.${kind}("Saved");\n`, "toast-i18n")).toBe(true);
    expect(flagged("src/app/x/B.tsx", `toast.${kind}(\`Saved\`);\n`, "toast-i18n")).toBe(true);
  });

  it("allows translated text, and string literals outside components", () => {
    expect(clean(APP, 'toast.success(t("saved"));\n')).toBe(true);
    expect(clean("src/lib/x.ts", 'toast.success("Saved");\n')).toBe(true);
  });
});

describe("GATE-2E server tables need search and sort (data-table)", () => {
  const table = (props: string) => `export function A() {\n  return (\n    <DataTable<Row>\n${props}    />\n  );\n}\n`;

  it("refuses a server table without sort options or without a search placeholder", () => {
    expect(flagged(APP, table("      fetchData={f}\n      searchPlaceholder={p}\n"), "data-table")).toBe(true);
    expect(flagged("src/app/x/B.tsx", table("      fetchData={f}\n      sortOptions={s}\n"), "data-table")).toBe(true);
  });

  it("allows a complete server table, a table without search by choice, and a static table", () => {
    expect(clean(APP, table("      fetchData={f}\n      sortOptions={s}\n      searchPlaceholder={p}\n"))).toBe(true);
    expect(clean("src/app/x/B.tsx", table("      fetchData={f}\n      sortOptions={s}\n      searchable={false}\n"))).toBe(true);
    expect(clean("src/app/x/C.tsx", table("      rows={rows}\n"))).toBe(true);
  });

  it("reports the line where the table starts", () => {
    const result = verdict(APP, table("      fetchData={f}\n"));

    expect(result.out).toMatch(/Page\.tsx:3 /);
  });
});

describe("GATE-2E comments stay short (comment-length)", () => {
  const LONG = "/*\n * a\n * b\n * c\n */\nexport const a = 1;\n";

  it("refuses a long comment in a file that is not in the baseline", () => {
    expect(flagged("src/lib/long.ts", LONG, "comment-length")).toBe(true);
  });

  it("looks at scripts, tests and the config files too", () => {
    expect(flagged("scripts/x.mjs", LONG, "comment-length")).toBe(true);
    expect(flagged("tests/g/m/long.test.ts", LONG, "comment-length")).toBe(true);
    expect(flagged("vitest.config.mts", LONG, "comment-length")).toBe(true);
  });

  it("lets a file in the baseline keep it, and says how many are left to trim", () => {
    project.write("src/lib/long.ts", LONG);
    project.write("scripts/comment-baseline.json", JSON.stringify({ files: ["src/lib/long.ts"] }));

    const result = project.run("check-conventions.mjs");

    expect(result.status).toBe(0);
    expect(result.out).toContain("(1 still to trim)");
  });

  it("makes a file leave the baseline once its comments are short", () => {
    project.write("scripts/comment-baseline.json", JSON.stringify({ files: ["src/m.ts"] }));

    const result = project.run("check-conventions.mjs");

    expect(result.status).toBe(1);
    expect(result.out).toContain("src/m.ts no longer has long comments");
  });

  it("refuses a banner even in a short comment", () => {
    expect(flagged("src/lib/banner.ts", "/* ═══════ TITLE ═══════ */\nexport const a = 1;\n", "comment-length")).toBe(true);
  });
});
