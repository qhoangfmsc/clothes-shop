import { describe, expect, it } from "vitest";
import { LIST_DEFAULT_LIMIT, LIST_MAX_LIMIT, buildListQuery, clampLimit } from "@/src/lib/list-query";
import { MAX_INLINE_CATEGORIES, PUBLIC_CATEGORIES_QUERY } from "@/src/lib/category-display";

/* The list contract every BE list endpoint shares (specs/platform/data-layer.md, flows LQ-1 and LQ-1E). */

describe("LQ-1 buildListQuery", () => {
  it("builds the query in a fixed order: search, filters, sort, page, limit", () => {
    const qs = buildListQuery({ search: "dress", sort: "-price", page: 3, limit: 50 }, { status: "active", category: "tops" });

    expect(qs).toBe("search=dress&status=active&category=tops&sort=-price&page=3&limit=50");
  });

  it("is empty when nothing is asked", () => {
    expect(buildListQuery({})).toBe("");
  });

  it("drops empty, null and undefined values", () => {
    expect(buildListQuery({ search: "" }, { a: "", b: null, c: undefined, d: "x" })).toBe("d=x");
  });

  it("keeps 0 and false, which are real filter values", () => {
    expect(buildListQuery({}, { minPrice: 0, inStock: false })).toBe("minPrice=0&inStock=false");
  });

  it("leaves page out on page 1 and for anything below it", () => {
    expect(buildListQuery({ page: 1 })).toBe("");
    expect(buildListQuery({ page: 0 })).toBe("");
    expect(buildListQuery({ page: -2 })).toBe("");
    expect(buildListQuery({ page: 2 })).toBe("page=2");
  });

  it("encodes values", () => {
    expect(buildListQuery({ search: "áo dài & váy" })).toBe("search=%C3%A1o+d%C3%A0i+%26+v%C3%A1y");
  });

  it("sends the sort as one field, ascending or descending", () => {
    expect(buildListQuery({ sort: "price" })).toBe("sort=price");
    expect(buildListQuery({ sort: "-createdAt" })).toBe("sort=-createdAt");
  });

  it("sends numbers and booleans as text", () => {
    expect(buildListQuery({}, { minRating: 4, flag: true })).toBe("minRating=4&flag=true");
  });
});

describe("LQ-1E page sizes the BE would refuse", () => {
  it("has the documented limits", () => {
    expect(LIST_DEFAULT_LIMIT).toBe(25);
    expect(LIST_MAX_LIMIT).toBe(200);
  });

  it.each([
    [undefined, 25],
    [0, 25],
    [-5, 25],
    [0.5, 25],
    [1, 1],
    [24.9, 24],
    [200, 200],
    [201, 200],
    [5000, 200],
  ])("clampLimit(%s) is %s", (asked, used) => {
    expect(clampLimit(asked)).toBe(used);
  });

  it("clampLimit gives the default for NaN", () => {
    expect(clampLimit(Number.NaN)).toBe(25);
  });

  it("buildListQuery clamps limit and omits it when absent, zero or NaN", () => {
    expect(buildListQuery({ limit: 5000 })).toBe("limit=200");
    expect(buildListQuery({ limit: -1 })).toBe("limit=25");
    expect(buildListQuery({ limit: 0 })).toBe("");
    expect(buildListQuery({ limit: Number.NaN })).toBe("");
  });
});

describe("public categories query", () => {
  it("asks for priority order and every category in one page", () => {
    expect(PUBLIC_CATEGORIES_QUERY).toBe("sort=priority&limit=200");
    expect(MAX_INLINE_CATEGORIES).toBe(4);
  });
});
