import { describe, expect, it } from "vitest";
import { MAX_COMMENT_LINES, findLongComments, isCommentOnlyChange, validateCommentBaseline } from "@/scripts/comment-lib.mjs";

/* QG-11: comments stay short. Spec: specs/platform/dev-tooling.md. */

const kinds = (code: string) => findLongComments(code).map((c: { kind: string }) => c.kind);

describe("QG-11 findLongComments", () => {
  it("accepts one-line and short comments", () => {
    const code = ["// why, in one line", "const a = 1; /* inline */", "/** Adds. */", "/* two", "   lines */"].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it(`flags a block longer than ${MAX_COMMENT_LINES} lines, with where it starts and how long it is`, () => {
    const code = ["const a = 1;", "/*", " * one", " * two", " * three", " */", "const b = 2;"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "block", line: 2, length: 5 }]);
  });

  it("allows a block of exactly the maximum", () => {
    expect(findLongComments(["/*", " one", " */"].join("\n"))).toEqual([]);
  });

  it("does not count JSDoc tag lines, which are type annotations", () => {
    const typed = ["/**", " * Adds two numbers.", " * @param {number} a", " * @param {number} b", " * @returns {number}", " */"].join("\n");

    expect(findLongComments(typed)).toEqual([]);
  });

  it("flags a JSDoc block the same way", () => {
    const code = ["/**", " * a", " * b", " * c", " */", "export const x = 1;"].join("\n");

    expect(kinds(code)).toEqual(["block"]);
  });

  it("flags more than the maximum of // lines in a row, but not separate short runs", () => {
    const run = ["// a", "// b", "// c", "// d"].join("\n");
    const separate = ["// a", "// b", "const x = 1;", "// c", "// d", "const y = 2;"].join("\n");

    expect(findLongComments(run)).toEqual([{ kind: "line-run", line: 1, length: 4 }]);
    expect(findLongComments(separate)).toEqual([]);
  });

  it("flags a decorative banner even in a short comment", () => {
    expect(kinds("/* ═══════════ TITLE ═══════════ */")).toEqual(["banner"]);
    expect(kinds("// ═════════════")).toEqual(["banner"]);
  });

  it("does not count lines that are directives", () => {
    const code = ["// eslint-disable-next-line a", "// conventions-ignore: rule why", "// @ts-expect-error x", "// c", "// d"].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it("ignores text inside strings that looks like a comment", () => {
    const code = ['const url = "http://a.b//c";', 'const re = "/* not a comment";', "const t = `//`;", "const x = 1;"].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it("reads templates correctly when an interpolation ends right before the closing backtick or before /*", () => {
    const code = [
      "const a = `${base}`;",
      "const b = `${base}/*`;",
      "const c = `x ${y} z ${w}`;",
      "const d = `${a}${b}`;",
      "const e = `nested ${`inner ${deep}`} end`;",
      "const f = 1;",
      "// a short comment after all that",
    ].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it("still finds a long comment after a template that ends with an interpolation", () => {
    const code = ["const a = `${base}`;", "// 1", "// 2", "// 3", "// 4"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "line-run", line: 2, length: 4 }]);
  });

  it("does not take a regex literal for a comment, even one that looks like a block or a line comment", () => {
    const code = [
      "const block = /\\/\\*[\\s\\S]*?\\*\\//g;",
      "const slashes = /[/]{2}x/;",
      "const classy = /a[^/]b/;",
      "const call = text.replace(/\\/\\/.*$/, '');",
      "// a short comment",
    ].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it("tells division from a regex, so a comment after a division is still seen", () => {
    const code = ["const half = total / 2;", "// 1", "// 2", "// 3", "// 4"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "line-run", line: 2, length: 4 }]);
  });

  it("handles escaped quotes inside strings and braces inside template interpolations", () => {
    const code = ['const a = "say \\"//\\" now";', "const b = 'it\\'s /* not a comment */';", "const c = `${ { x: 1 }.x } /* still text */`;", "const d = 1;"].join("\n");

    expect(findLongComments(code)).toEqual([]);
  });

  it("an apostrophe in JSX text ends at the line, so the lines after it are still read correctly", () => {
    const code = ["const a = <p>Don't panic</p>;", "// 1", "// 2", "// 3", "// 4"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "line-run", line: 2, length: 4 }]);
  });

  it("a JSX closing tag is not a regex: lines are counted right after it and a comment on the same line is read", () => {
    const code = ["const a = (", "  <div>", "    <b>x</b>", "  </div>", ");", "// 1", "// 2", "// 3", "// 4"].join("\n");
    const banner = ["const a = <i>x</i>; // ═══════ banner"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "line-run", line: 6, length: 4 }]);
    expect(findLongComments(banner)).toEqual([{ kind: "banner", line: 1, length: 1 }]);
  });

  it("a slash that never closes a regex does not swallow the line break", () => {
    const code = ["const a = b + /x;", "// 1", "// 2", "// 3", "// 4"].join("\n");

    expect(findLongComments(code)).toEqual([{ kind: "line-run", line: 2, length: 4 }]);
  });

  it("reports several findings in order", () => {
    const code = ["// a", "// b", "// c", "// d", "const x = 1;", "/*", "1", "2", "3", "*/"].join("\n");

    expect(findLongComments(code).map((c: { line: number }) => c.line)).toEqual([1, 6]);
  });
});

describe("QG-11 validateCommentBaseline", () => {
  const offenders = ["src/a.ts", "src/b.ts"];

  it("accepts offenders that are all in the baseline", () => {
    expect(validateCommentBaseline(offenders, ["src/a.ts", "src/b.ts"])).toEqual([]);
  });

  it("refuses a file with long comments that is not in the baseline", () => {
    expect(validateCommentBaseline(offenders, ["src/a.ts"]).join("\n")).toContain("src/b.ts has comments longer than");
  });

  it("demands that a clean file leaves the baseline: the list only shrinks", () => {
    expect(validateCommentBaseline(["src/a.ts"], ["src/a.ts", "src/b.ts"]).join("\n")).toContain("src/b.ts no longer has long comments");
  });
});

describe("GATE-10 a change that only touches comments", () => {
  const only = (before: string, after: string, file = "src/a.ts") => isCommentOnlyChange(before, after, file);

  it("accepts comments added, shortened or removed, and different spacing", () => {
    expect(only("const a = 1;\n", "// why\nconst a = 1;\n")).toBe(true);
    expect(only("/* one\n two\n three\n four */\nconst a = 1;\n", "// short\nconst a = 1;\n")).toBe(true);
    expect(only("const a = 1; // trailing\n", "const a = 1;\n")).toBe(true);
    expect(only("const a=1;\n\n\nconst b = 2;", "const a = 1;\nconst b = 2;\n")).toBe(true);
  });

  it("accepts comments in TSX, including between JSX attributes", () => {
    const before = "export const A = () => (\n  <div // note\n    id=\"a\">x</div>\n);\n";
    const after = "export const A = () => (\n  <div id=\"a\">x</div>\n);\n";

    expect(only(before, after, "src/A.tsx")).toBe(true);
  });

  it("accepts a JSX comment line removed from between elements, which React never renders", () => {
    const before = "export const A = () => (\n  <div>\n    {/* section */}\n    <b>x</b>\n  </div>\n);\n";
    const after = "export const A = () => (\n  <div>\n    <b>x</b>\n  </div>\n);\n";
    const fragment = (body: string) => `export const A = () => (\n  <>\n${body}  </>\n);\n`;

    expect(only(before, after, "src/A.tsx")).toBe(true);
    expect(only(fragment("    {/* a */}\n    <b />\n"), fragment("    <b />\n"), "src/A.tsx")).toBe(true);
  });

  it("rejects JSX changes React does render: an expression, a space inside a line, text", () => {
    const wrap = (body: string) => `export const A = () => (\n  <div>\n${body}  </div>\n);\n`;

    expect(only(wrap("    {value}\n    <b />\n"), wrap("    <b />\n"), "src/A.tsx")).toBe(false);
    expect(only("export const A = () => <a> </a>;\n", "export const A = () => <a></a>;\n", "src/A.tsx")).toBe(false);
    expect(only(wrap("    one\n"), wrap("    one two\n"), "src/A.tsx")).toBe(false);
  });

  it("accepts the same text in .mjs and .mts files", () => {
    expect(only("// a\nexport const a = 1;\n", "export const a = 1;\n", "scripts/a.mjs")).toBe(true);
    expect(only("// a\nexport const a = 1;\n", "export const a = 1;\n", "src/a.mts")).toBe(true);
  });

  it("rejects a change to code, a type, an import, a string or JSX text", () => {
    expect(only("const a = 1;\n", "const a = 2;\n")).toBe(false);
    expect(only("const a: number = 1;\n", "const a: string = \"x\";\n")).toBe(false);
    expect(only("type T = { a: number };\n", "type T = { a: number; b: string };\n")).toBe(false);
    expect(only("import { a } from \"./a\";\n", "import { b } from \"./a\";\n")).toBe(false);
    expect(only("const s = \"http://a\";\n", "const s = \"http://b\";\n")).toBe(false);
    expect(only("export const A = () => <b>one</b>;\n", "export const A = () => <b>two</b>;\n", "src/A.tsx")).toBe(false);
  });

  it("rejects a comment change that hides a code change", () => {
    expect(only("// old\nconst a = 1;\n", "// new\nconst a = 2;\n")).toBe(false);
  });

  it("does not take text inside a string or a regex for a comment", () => {
    expect(only("const a = \"// kept\";\n", "const a = \"\";\n")).toBe(false);
    expect(only("const r = /a\\/\\/b/;\n", "const r = /a/;\n")).toBe(false);
  });

  it("rejects a new file, a deleted file and files that are not TypeScript or JavaScript", () => {
    expect(only(null as never, "const a = 1;\n")).toBe(false);
    expect(only("const a = 1;\n", null as never)).toBe(false);
    expect(only("a { color: red; }\n", "/* x */\na { color: red; }\n", "src/a.css")).toBe(false);
    expect(only("{\"a\": 1}\n", "{\"a\": 1}\n ", "src/a.json")).toBe(false);
  });
});
