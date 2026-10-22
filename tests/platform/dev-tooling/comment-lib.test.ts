import { describe, expect, it } from "vitest";
import { MAX_COMMENT_LINES, findLongComments, validateCommentBaseline } from "@/scripts/comment-lib.mjs";

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
