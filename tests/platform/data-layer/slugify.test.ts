import { describe, expect, it } from "vitest";
import { slugify } from "@/src/lib/slugify";

/* The one place a name becomes a URL slug, used by the products, categories and collections forms (specs/platform/data-layer.md, flow SLG-1). */

describe("SLG-1 a name becomes a slug", () => {
  it.each([
    ["Silk Dress", "silk-dress"],
    ["SHOES", "shoes"],
    ["Áo sơ mi", "ao-so-mi"],
    ["Đầm công sở", "dam-cong-so"],
    ["đồng phục", "dong-phuc"],
    ["Tops & Bottoms", "tops-bottoms"],
    ["a   b", "a-b"],
    ["size 38/40", "size-38-40"],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("takes dashes off both ends and leaves nothing for a name of only symbols", () => {
    expect(slugify("--Shoes!!")).toBe("shoes");
    expect(slugify("  Shoes  ")).toBe("shoes");
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("keeps digits and is stable when applied twice", () => {
    expect(slugify("Collection 2026")).toBe("collection-2026");
    expect(slugify(slugify("Áo Khoác Đẹp"))).toBe("ao-khoac-dep");
  });
});
