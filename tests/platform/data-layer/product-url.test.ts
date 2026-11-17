import { describe, expect, it } from "vitest";
import { buildProductPath, productPath } from "@/src/lib/product-url";

/* Storefront product URLs (flows PRD-1 and PRD-1E). */

describe("PRD-1 product URLs", () => {
  it("builds /shop/<category>/<subcategory>/<id>", () => {
    expect(buildProductPath("p1", "tops", "shirts")).toBe("/shop/tops/shirts/p1");
  });

  it("productPath reads the slugs from a full product", () => {
    expect(productPath({ id: "p1", category: { slug: "tops" }, subcategory: { slug: "shirts" } })).toBe("/shop/tops/shirts/p1");
  });

  it("productPath accepts the short form that autocomplete and reviews carry", () => {
    expect(productPath({ id: "p9", category: { slug: "bags" }, subcategory: { slug: "totes" } })).toBe("/shop/bags/totes/p9");
  });
});

describe("PRD-1E a product without both slugs has no URL", () => {
  it.each([
    ["no category", { id: "p1", subcategory: { slug: "shirts" } }],
    ["no subcategory", { id: "p1", category: { slug: "tops" } }],
    ["null category", { id: "p1", category: null, subcategory: { slug: "shirts" } }],
    ["null subcategory", { id: "p1", category: { slug: "tops" }, subcategory: null }],
    ["nothing", { id: "p1" }],
  ])("productPath is null with %s", (_label, product) => {
    expect(productPath(product)).toBeNull();
  });

  it.each([
    [undefined, "shirts"],
    ["tops", undefined],
    [null, "shirts"],
    ["tops", null],
    ["", "shirts"],
    ["tops", ""],
  ])("buildProductPath(%j, %j) is null", (category, subcategory) => {
    expect(buildProductPath("p1", category, subcategory)).toBeNull();
  });
});
