#!/usr/bin/env node
/**
 * Project conventions check — keeps every list page, table, carousel, toast and error
 * handler on the shared building blocks. Runs before `yarn build` (and via `yarn conventions:check`).
 *
 * Each rule says what to use instead; the full reasoning lives in:
 *   .agent/rules/components.md · .agent/skills/05-list-pages.md · .agent/skills/06-errors-and-toasts.md
 *
 * Opt out of one line (rarely, with a reason):  // conventions-ignore: <rule-id> <why>
 * on the offending line or the line above it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const MAX_LIMIT = 200;

const posix = (p) => relative(ROOT, p).split(sep).join("/");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "messages" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** Source with comments blanked out (same length, so line numbers stay valid). */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, pre) => pre + " ".repeat(m.length - pre.length));
}

const violations = [];

function report(rule, file, index, code, message) {
  const line = code.slice(0, index).split("\n").length;
  const lines = readFileSync(file, "utf8").split("\n");
  const ignored = [lines[line - 1], lines[line - 2]].some((l) => l?.includes(`conventions-ignore: ${rule}`));
  if (!ignored) violations.push({ rule, file: posix(file), line, message });
}

const files = walk(SRC);

for (const file of files) {
  const rel = posix(file);
  const raw = readFileSync(file, "utf8");
  const code = stripComments(raw);
  const isApp = rel.startsWith("src/app/");

  /* error-message: components use the hook, never the bare helper */
  if (isApp) {
    for (const m of code.matchAll(/import\s*\{[^}]*\berrorMessage\b[^}]*\}\s*from\s*["']@\/src\/i18n\/error-message["']/g)) {
      report("error-message", file, m.index, code, "Use `useErrorMessage()` (@/src/i18n/use-error-message) — it maps BE errorCodes and plain thunk errors.");
    }
  }

  /* money-format: amounts are formatted in one place (src/lib/money.ts, via useMoney) */
  if (isApp || rel.startsWith("src/hooks/") || rel.startsWith("src/lib/")) {
    if (rel !== "src/lib/money.ts") {
      for (const m of code.matchAll(/\bIntl\.NumberFormat\b|\.toLocaleString\s*\(|\.toFixed\s*\(|format\.number\([^)]*["'](?:price|priceFixed|vnd)["']/g)) {
        report("money-format", file, m.index, code, "Format money with useMoney() (@/src/hooks/use-money) or <MoneyText>; src/lib/money.ts is the only place that formats or rounds an amount, and the FE never converts, adds or multiplies money.");
      }
    }
  }

  /* native-dialog: themed dialogs only */
  for (const m of code.matchAll(/(window\.)?\b(alert|confirm|prompt)\s*\(/g)) {
    const [, windowPrefix, name] = m;
    if (!windowPrefix && /[.\w$]/.test(code[m.index - 1] ?? "")) continue; // a method like `x.confirm(`
    // bare `confirm(...)` is fine when it is the function returned by useConfirm()
    if (!windowPrefix && name === "confirm" && /\buseConfirm\b/.test(code)) continue;
    report("native-dialog", file, m.index, code, `No \`${name}()\` — use useConfirm() / useToast().`);
  }

  /* old-sort-syntax: sort is `field` / `-field` (one field) */
  for (const m of code.matchAll(/["'](?:price|name|title|rating)_(?:asc|desc)["']|["']sorts["']/g)) {
    report("old-sort-syntax", file, m.index, code, "Sort syntax is `field` (ascending) / `-field` (descending), param name `sort` — see src/lib/list-query.ts.");
  }

  /* list-query: list URLs go through buildListQuery */
  if (rel !== "src/lib/list-query.ts") {
    for (const m of code.matchAll(/\.set\(\s*["'](limit|page|sort|search)["']/g)) {
      report("list-query", file, m.index, code, `Build list URLs with buildListQuery() (@/src/lib/list-query), not .set("${m[1]}").`);
    }
  }

  /* max-limit: the BE rejects limit > 200 */
  for (const m of code.matchAll(/\b(?:limit|pageSize)\s*[:=]\s*\{?\s*(\d{3,})\b/g)) {
    if (Number(m[1]) > MAX_LIMIT) report("max-limit", file, m.index, code, `Limit ${m[1]} is above the BE maximum (${MAX_LIMIT}) — use LIST_MAX_LIMIT.`);
  }

  /* carousel: one implementation */
  if (!rel.endsWith("/Carousel.tsx")) {
    for (const m of code.matchAll(/\bsnap-(?:x|mandatory|proximity)\b|scroll-snap-type/g)) {
      report("carousel", file, m.index, code, "Don't hand-roll a scroll-snap carousel — use <Carousel> (src/app/[locale]/_components/Carousel.tsx).");
    }
  }
  if (rel !== "src/hooks/use-auto-advance.ts") {
    for (const m of code.matchAll(/\bsetInterval\s*\(/g)) {
      report("auto-advance", file, m.index, code, "Auto-advancing UI uses useAutoAdvance() / useBannerRotation() (src/hooks) — it pauses off-screen, on hover/touch and for reduced motion.");
    }
  }

  /* toast-i18n: toast text comes from messages */
  if (isApp) {
    for (const m of code.matchAll(/toast\.(?:success|error|info|warning)\(\s*(["'`])/g)) {
      report("toast-i18n", file, m.index, code, "Toast text must come from next-intl (`toast.error(t(\"…\"))`), never a string literal.");
    }
  }

  /* data-table: server tables need search + sort wired up */
  for (const m of code.matchAll(/^([ \t]*)<DataTable<[^\n]*$/gm)) {
    const indent = m[1];
    const rest = code.slice(m.index);
    const end = rest.search(new RegExp(`\\n${indent}/>`));
    if (end < 0) continue;
    const block = rest.slice(0, end);
    if (!/\bfetchData=/.test(block)) continue; // static mode
    if (!/\bsortOptions=/.test(block)) report("data-table", file, m.index, code, "Server-mode DataTable needs `sortOptions` (useSortOptions(<MODULE>_SORT_OPTIONS)).");
    if (!/\bsearchPlaceholder=/.test(block) && !/searchable=\{false\}/.test(block)) report("data-table", file, m.index, code, "Server-mode DataTable needs `searchPlaceholder` (or `searchable={false}` with a reason).");
  }
}

if (violations.length) {
  console.error(`\nConventions check failed — ${violations.length} problem(s):\n`);
  for (const v of violations) console.error(`  ${v.file}:${v.line}  [${v.rule}]\n    ${v.message}`);
  console.error("\nSee .agent/rules/components.md and .agent/skills/05-list-pages.md / 06-errors-and-toasts.md.\n");
  process.exit(1);
}
console.log(`conventions check OK — ${files.length} files`);
