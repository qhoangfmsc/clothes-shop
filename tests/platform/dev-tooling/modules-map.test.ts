import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ownerOf } from "@/scripts/gate-env.mjs";
import { IGNORED, MODULES } from "@/scripts/modules.mjs";

/* The map of which file belongs to which module (specs/platform/dev-tooling.md, flows GATE-1 and GATE-1E). It reads the real repository. */

const ROOT = process.cwd();

describe("GATE-1 the module map", () => {
  it("names each module as <group>/<name> with a known group, once", () => {
    const docs = MODULES.map((m: { doc: string }) => m.doc);

    expect(new Set(docs).size).toBe(docs.length);
    for (const doc of docs) expect(doc, doc).toMatch(/^(platform|admin|storefront)\/[a-z0-9-]+$/);
  });

  it("gives every module a doc, and at least one path that exists", () => {
    for (const { doc, paths } of MODULES as { doc: string; paths: string[] }[]) {
      expect(existsSync(join(ROOT, "docs", `${doc}.md`)), `docs/${doc}.md`).toBe(true);
      expect(paths.some((p) => existsSync(join(ROOT, p))), `${doc} paths`).toBe(true);
    }
  });

  it("gives every path to exactly one module", () => {
    const seen = new Map<string, string>();
    for (const { doc, paths } of MODULES as { doc: string; paths: string[] }[]) {
      for (const path of paths) {
        expect(seen.get(path), `${path} is owned by ${seen.get(path)} and ${doc}`).toBeUndefined();
        seen.set(path, doc);
      }
    }
  });

  it.each([
    ["src/lib/money.ts", "platform/currency"],
    ["src/hooks/use-api.ts", "platform/data-layer"],
    ["src/store/index.ts", "platform/data-layer"],
    ["src/i18n/metadata.ts", "platform/i18n"],
    ["src/middleware.ts", "platform/i18n"],
    ["src/lib/session.ts", "platform/auth"],
    ["scripts/gate-env.mjs", "platform/dev-tooling"],
    ["src/app/robots.ts", "platform/seo"],
  ])("%s belongs to %s", (file, doc) => {
    expect(ownerOf(file)).toBe(doc);
  });

  it("a folder owns what is inside it, and the longest path wins", () => {
    const shop = "src/app/[locale]/(public)/shop/";
    expect(ownerOf(`${shop}page.tsx`)).toBe("storefront/shop");
    expect(ownerOf(`${shop}[category]/page.tsx`)).toBe("storefront/shop");
    expect(ownerOf(`${shop}[category]/[subcategory]/[productId]/page.tsx`)).toBe("storefront/product-detail");
    expect(ownerOf(`${shop}[category]/[subcategory]/[productId]/_components/Gallery.tsx`)).toBe("storefront/product-detail");
  });

  it("a path that names a file owns only that file", () => {
    expect(ownerOf("src/lib/money.ts.bak")).toBeNull();
    expect(ownerOf("src/lib/money")).toBeNull();
  });
});

describe("GATE-1E files nobody owns", () => {
  it("returns null for a file outside every module", () => {
    expect(ownerOf("src/lib/does-not-exist.ts")).toBeNull();
    expect(ownerOf("README.md")).toBeNull();
  });

  it.each(["src/messages/vi/common.json", "src/i18n/registry.ts", "public/brand/logo.png", "src/app/icon.svg", "scripts/quality-baseline.json", "scripts/comment-baseline.json", ".next/server/x.js"])("%s is left out on purpose", (file) => {
    expect((IGNORED as RegExp[]).some((re) => re.test(file))).toBe(true);
  });

  it("does not leave out real code", () => {
    for (const file of ["src/lib/money.ts", "scripts/modules.mjs", "src/app/[locale]/page.tsx"]) expect((IGNORED as RegExp[]).some((re) => re.test(file)), file).toBe(false);
  });
});
