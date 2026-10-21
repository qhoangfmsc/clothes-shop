import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "@/tests/_support/coverage.json";

/* QG-12: the coverage data names files that exist, so a rename cannot silently drop a threshold. */

const ROOT = process.cwd();

function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? allFiles(full) : [full];
  });
}
const sourceFiles = allFiles(join(ROOT, "src")).map((f) => f.slice(ROOT.length + 1));

/** Expands `a/{B,C}.tsx` and `**\/Name.tsx` to the files they could match. */
function matches(pattern: string): string[] {
  const braces = /\{([^}]+)\}/.exec(pattern);
  if (braces) return braces[1].split(",").flatMap((alt) => matches(pattern.replace(braces[0], alt)));
  if (pattern.startsWith("**/")) return sourceFiles.filter((f) => f.endsWith(`/${pattern.slice(3)}`));
  if (pattern.endsWith("/**")) return sourceFiles.filter((f) => f.startsWith(pattern.slice(0, -2)));
  return existsSync(join(ROOT, pattern)) ? [pattern] : [];
}

describe("QG-12 coverage data", () => {
  it("every include entry matches at least one file", () => {
    const empty = coverage.include.filter((entry) => matches(entry).length === 0);

    expect(empty).toEqual([]);
  });

  it("every threshold names a file that exists", () => {
    const missing = Object.keys(coverage.thresholds).filter((key) => matches(key).length === 0);

    expect(missing).toEqual([]);
  });

  it("every threshold is a percentage between 0 and 100", () => {
    for (const [file, limits] of Object.entries(coverage.thresholds)) {
      for (const [metric, value] of Object.entries(limits as Record<string, number>)) {
        expect(["lines", "branches", "functions", "statements"], `${file}: ${metric}`).toContain(metric);
        expect(value, `${file}: ${metric}`).toBeGreaterThan(0);
        expect(value, `${file}: ${metric}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("matches what the pattern helper expands (guards the test itself)", () => {
    expect(matches("src/lib/session.ts")).toEqual(["src/lib/session.ts"]);
    expect(matches("**/VndInput.tsx")).toHaveLength(1);
    expect(matches("src/lib/does-not-exist.ts")).toEqual([]);
    expect(matches("**/NoSuchFile.tsx")).toEqual([]);
  });
});
