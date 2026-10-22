import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Project } from "@/tests/_support/gate-fixture";

/* `node scripts/i18n.mjs sync | check`, run for real (specs/platform/dev-tooling.md, flows GATE-7 and GATE-7E). */

let project: Project;
beforeEach(() => {
  project = new Project();
  project.write("src/i18n/routing.ts", 'export const routing = { locales: ["vi", "en"], defaultLocale: "vi" };\n');
  project.write("src/messages/en/a.json", JSON.stringify({ hello: "Hi {name}", nested: { title: "Title" } }));
  project.write("src/messages/en/deep/b.json", JSON.stringify({ x: "X" }));
  project.write("src/messages/vi/a.json", JSON.stringify({ hello: "Chào {name}", nested: { title: "Tiêu đề" } }));
  project.write("src/messages/vi/deep/b.json", JSON.stringify({ x: "Ẹ" }));
});
afterEach(() => project.dispose());

const i18n = (command?: string) => project.run("i18n.mjs", command ? [command] : []);
const synced = () => {
  i18n("sync");
  return project;
};

describe("GATE-7 sync and check", () => {
  it("sync writes the registry, one entry per English file, sorted", () => {
    const result = i18n("sync");

    expect(result.status).toBe(0);
    expect(result.out).toContain("i18n: registry updated");
    const registry = project.read("src/i18n/registry.ts");
    expect(registry).toContain("AUTO-GENERATED");
    expect(registry).toContain('"a": load<typeof import("../messages/en/a.json")>("a"),');
    expect(registry).toContain('"deep/b": load<typeof import("../messages/en/deep/b.json")>("deep/b"),');
    expect(registry.indexOf('"a"')).toBeLessThan(registry.indexOf('"deep/b"'));
  });

  it("sync says nothing when the registry is already right", () => {
    synced();

    expect(i18n("sync").out).not.toContain("registry updated");
  });

  it("sync follows the English files when one is added", () => {
    synced();
    project.write("src/messages/en/c.json", JSON.stringify({ y: "Y" }));

    expect(i18n("sync").out).toContain("registry updated");
    expect(project.read("src/i18n/registry.ts")).toContain('"c": load');
  });

  it("check passes when every language mirrors English and says how much it looked at", () => {
    synced();

    const result = i18n("check");

    expect(result.status).toBe(0);
    expect(result.out).toContain("i18n check OK — 2 locales × 2 files");
  });
});

describe("GATE-7E what check refuses", () => {
  it("a registry that is out of date", () => {
    expect(i18n("check").out).toContain("registry.ts is out of date");
  });

  it("a missing file, and a file English does not have", () => {
    synced();
    project.remove("src/messages/vi/deep/b.json");
    project.write("src/messages/vi/extra.json", "{}");

    const result = i18n("check");

    expect(result.status).toBe(1);
    expect(result.out).toContain("[vi] missing file deep/b.json");
    expect(result.out).toContain("[vi] extra.json has no counterpart in en/");
  });

  it("a missing key, an empty value, an unknown key and changed placeholders", () => {
    synced();
    project.write("src/messages/vi/a.json", JSON.stringify({ hello: "Chào {ten}", nested: { title: "" }, stray: "x" }));

    const result = i18n("check");

    expect(result.status).toBe(1);
    expect(result.out).toContain('"hello" placeholders differ: {name} vs {ten}');
    expect(result.out).toContain('empty value at "nested.title"');
    expect(result.out).toContain('has unknown key "stray"');
    expect(result.out).toContain("i18n check failed (3)");
  });

  it("a key that is missing", () => {
    synced();
    project.write("src/messages/vi/a.json", JSON.stringify({ hello: "Chào {name}" }));

    expect(i18n("check").out).toContain('missing key "nested.title"');
  });

  it("an unknown command", () => {
    const result = i18n("fly");

    expect(result.status).toBe(1);
    expect(result.out).toContain("Usage: node scripts/i18n.mjs <sync|check>");
  });

  it("no command at all", () => {
    expect(i18n().status).toBe(1);
  });

  it("a routing file whose locale list cannot be read", () => {
    project.write("src/i18n/routing.ts", "export const routing = {};\n");

    const result = i18n("check");

    expect(result.status).not.toBe(0);
    expect(result.out).toContain("Cannot find `locales: [...]`");
  });
});
