import { describe, expect, it } from "vitest";
import { compareLocale, flatten, placeholders } from "@/scripts/i18n-lib.mjs";

/* The rules `yarn i18n:check` applies (specs/platform/i18n.md, flows I18-9 and I18-9E). */

describe("I18-9 flatten", () => {
  it("turns nested JSON into dotted keys", () => {
    expect(flatten({ a: { b: { c: "x" }, d: "y" }, e: "z" })).toEqual({ "a.b.c": "x", "a.d": "y", e: "z" });
  });

  it("keeps an empty object as no keys and leaves arrays' items out of the tree walk", () => {
    expect(flatten({})).toEqual({});
    expect(flatten({ a: {} })).toEqual({});
  });
});

describe("I18-9 placeholders", () => {
  it.each([
    ["Hello", ""],
    ["Hello {name}", "name"],
    ["{b} and {a}", "a,b"],
    ["{count, plural, one {# item} other {# items}}", "count"],
    ["{a} {a}", "a"],
    ["<b>{name}</b>", "name"],
    ["{ spaced }", "spaced"],
  ])("%j has placeholders %j", (text, names) => {
    expect(placeholders(text)).toBe(names);
  });

  it("ignores names inside the branches of a plural", () => {
    expect(placeholders("{n, plural, one {{x} item} other {{y} items}}")).toBe("n");
  });
});

describe("I18-9 compareLocale", () => {
  const source = { greeting: "Hello {name}", nested: { title: "Title" } };

  it("accepts a translation with the same keys and placeholders", () => {
    expect(compareLocale("shared/x", "vi", source, { greeting: "Xin chào {name}", nested: { title: "Tiêu đề" } })).toEqual([]);
  });

  it("accepts the placeholders in another order", () => {
    expect(compareLocale("f", "vi", { a: "{x} {y}" }, { a: "{y} {x}" })).toEqual([]);
  });
});

describe("I18-9E what makes a translation fail", () => {
  const source = { greeting: "Hello {name}", nested: { title: "Title" } };
  const run = (target: object) => compareLocale("shared/x", "vi", source, target).join("\n");

  it("a missing key", () => {
    expect(run({ greeting: "Xin chào {name}" })).toContain('[vi] shared/x.json missing key "nested.title"');
  });

  it("an empty or blank value", () => {
    expect(run({ greeting: "", nested: { title: "T" } })).toContain('empty value at "greeting"');
    expect(run({ greeting: "   ", nested: { title: "T" } })).toContain('empty value at "greeting"');
  });

  it("a value that is not text", () => {
    expect(run({ greeting: 5, nested: { title: "T" } })).toContain('empty value at "greeting"');
  });

  it("a placeholder that was dropped, renamed or added", () => {
    expect(run({ greeting: "Xin chào", nested: { title: "T" } })).toContain('"greeting" placeholders differ: {name} vs {}');
    expect(run({ greeting: "Xin chào {ten}", nested: { title: "T" } })).toContain("{name} vs {ten}");
    expect(run({ greeting: "Xin chào {name} {extra}", nested: { title: "T" } })).toContain("placeholders differ");
  });

  it("a plural whose count argument was renamed", () => {
    expect(compareLocale("f", "vi", { a: "{n, plural, one {#} other {#}}" }, { a: "{m, plural, one {#} other {#}}" }).join()).toContain("placeholders differ");
  });

  it("a key that does not exist in the source", () => {
    expect(run({ greeting: "Xin chào {name}", nested: { title: "T" }, stray: "x" })).toContain('has unknown key "stray"');
  });

  it("reports every problem at once", () => {
    expect(compareLocale("f", "vi", { a: "A", b: "B" }, { a: "", c: "C" })).toHaveLength(3);
  });
});
