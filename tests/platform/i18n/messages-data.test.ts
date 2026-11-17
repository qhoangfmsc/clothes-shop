import { describe, expect, it } from "vitest";
import { compareLocale, flatten } from "@/scripts/i18n-lib.mjs";

/* The real translation files, checked with the same rules as `yarn i18n:check`
   (specs/platform/i18n.md, flows I18-10 and I18-10E). */

const files = import.meta.glob("../../../src/messages/*/**/*.json", { eager: true, import: "default" }) as Record<string, object>;

function byLocale(locale: string): Record<string, object> {
  const prefix = `../../../src/messages/${locale}/`;
  return Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(prefix)).map(([path, json]) => [path.slice(prefix.length).replace(/\.json$/, ""), json]));
}
const en = byLocale("en");
const vi = byLocale("vi");

describe("I18-10 Vietnamese mirrors English", () => {
  it("has the same files", () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(en).length).toBeGreaterThan(40);
  });

  it("has the same keys and placeholders in every file", () => {
    const problems = Object.keys(en).flatMap((file) => compareLocale(file, "vi", en[file], vi[file] ?? {}));

    expect(problems).toEqual([]);
  });

  it("has a translation for every BE error code, in both languages", () => {
    const codes = Object.keys((en["shared/errors"] as { byCode: object }).byCode);

    expect(codes.length).toBeGreaterThanOrEqual(30);
    for (const locale of [en, vi]) {
      const byCode = flatten((locale["shared/errors"] as { byCode: object }).byCode) as Record<string, unknown>;
      for (const code of codes) expect(byCode[code], `code ${code}`).toBeTruthy();
    }
  });
});

describe("I18-10E no holes in either language", () => {
  it.each([["en", en], ["vi", vi]] as const)("%s has no empty text anywhere", (_name, tree) => {
    const empty = Object.entries(tree).flatMap(([file, json]) =>
      Object.entries(flatten(json)).filter(([, text]) => typeof text !== "string" || text.trim() === "").map(([key]) => `${file}:${key}`)
    );

    expect(empty).toEqual([]);
  });

  it("flags a hole when one is made (guards the test itself)", () => {
    expect(compareLocale("f", "vi", { a: "A" }, { a: "" })).not.toEqual([]);
  });
});
