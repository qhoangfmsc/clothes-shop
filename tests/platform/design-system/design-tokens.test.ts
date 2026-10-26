import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* The token sheet and the global styles (specs/platform/design-system.md, flows DSN-1 to DSN-6E). They are CSS, so the tests read the files and check the promises the components rely on. */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const TOKENS = read("src/styles/design-system.css");
const GLOBALS = read("src/app/globals.css");

function sources(dir = "src"): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return name === "messages" ? [] : sources(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}
const FILES = sources().map((path) => ({ path, text: read(path) }));
const names = (pattern: RegExp, text: string) => Array.from(text.matchAll(pattern), (m) => m[1]);
const unique = (list: string[]) => Array.from(new Set(list));

/** The block of declarations of the first rule with this selector, comments removed */
function block(css: string, selector: string) {
  const start = css.search(new RegExp(`(?<!,\\n)^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`, "m"));
  if (start < 0) throw new Error(`no rule for ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i).replace(/\/\*[\s\S]*?\*\//g, "");
  }
  throw new Error(`rule ${selector} is not closed`);
}
/** The inside of every `@media (…) { … }` block with this query */
function mediaBlocks(css: string, query: string) {
  const found: string[] = [];
  let from = 0;
  for (let start = css.indexOf(`@media (${query}) {`, from); start >= 0; start = css.indexOf(`@media (${query}) {`, from)) {
    const open = css.indexOf("{", start);
    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}" && --depth === 0) break;
    }
    found.push(css.slice(open + 1, end));
    from = end;
  }
  return found;
}
const declarations = (body: string) => Array.from(body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (m) => [m[1], m[2].trim()] as const);
const ROOT_RULE = declarations(block(TOKENS, ":root"));
const DEFINED_IN_ROOT = new Set(ROOT_RULE.map(([name]) => name));
const value = (name: string) => ROOT_RULE.find(([n]) => n === name)?.[1];

/* Set while the page runs, not in a style sheet: the typeface by `next/font` */
const SET_AT_RUNTIME = ["--font-site"];

describe("DSN-1 every token that is used is defined", () => {
  const definedAnywhere = new Set<string>();
  for (const { text } of FILES) {
    for (const found of text.matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)) definedAnywhere.add(found[1]);
    for (const found of text.matchAll(/["'`](--[\w-]+)["'`]\s*:/g)) definedAnywhere.add(found[1]);
    for (const found of text.matchAll(/\[(--[\w-]+):/g)) definedAnywhere.add(found[1]);
  }

  it("has a definition, in a style sheet or set by a component, for every var(--name) with no fallback", () => {
    const missing = FILES.flatMap(({ path, text }) => names(/var\(\s*(--[\w-]+)\s*\)/g, text).filter((name) => !definedAnywhere.has(name) && !SET_AT_RUNTIME.includes(name)).map((name) => `${name} in ${path}`));

    expect(missing).toEqual([]);
  });

  it("makes every alias in the token sheet point at a token that exists", () => {
    const broken = ROOT_RULE.flatMap(([name, text]) => names(/var\(\s*(--[\w-]+)/g, text).filter((target) => !DEFINED_IN_ROOT.has(target) && !SET_AT_RUNTIME.includes(target)).map((target) => `${name} -> ${target}`));

    expect(broken).toEqual([]);
  });

  it("defines no token twice in the same rule", () => {
    const seen = ROOT_RULE.map(([name]) => name);

    expect(seen.filter((name, i) => seen.indexOf(name) !== i)).toEqual([]);
  });

  it("writes every colour of the palette as a hex value", () => {
    const palette = ROOT_RULE.filter(([name]) => name.startsWith("--color-"));

    expect(palette.length).toBeGreaterThan(40);
    expect(palette.filter(([, text]) => !/^#[0-9a-f]{6}$/i.test(text)).map(([name]) => name)).toEqual([]);
  });
});

describe("DSN-2 the values the components count on", () => {
  it("keeps the page column at 1920 px, with the edge worked out from it", () => {
    expect(value("--page-max-w")).toBe("1920px");
    expect(value("--page-edge")).toBe("max(0px, calc((100% - var(--page-max-w)) / 2))");
  });

  it("sizes the text in rem, from 0.6875 to 2.625", () => {
    const sizes = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"].map((size) => value(`--text-${size}`));

    expect(sizes).toEqual(["0.6875rem", "0.75rem", "0.8125rem", "0.9375rem", "1.25rem", "1.5625rem", "1.875rem", "2.625rem"]);
  });

  it("spaces and rounds in rem, on a 4 px grid, with the pill round", () => {
    expect(value("--space-1")).toBe("0.25rem");
    expect(value("--space-4")).toBe("1rem");
    expect(value("--radius-sm")).toMatch(/rem$/);
    expect(value("--radius-pill")).toBe("9999px");
  });

  it("keeps one typeface for both the text and the display font", () => {
    expect(value("--font-primary")).toContain("var(--font-site)");
    expect(value("--font-display")).toContain("var(--font-site)");
  });

  it("layers the page from the base to the toast, each above the one before", () => {
    const layers = ["base", "panel", "overlay", "fixed", "cursor", "modal", "toast"].map((layer) => Number(value(`--z-${layer}`)));

    expect(layers).toEqual([0, 10, 12, 20, 50, 100, 200]);
  });

  it("has the motion steps the animations use", () => {
    expect(["fast", "base", "slow", "slower", "cinematic"].map((step) => value(`--duration-${step}`))).toEqual(["150ms", "300ms", "600ms", "1000ms", "1200ms"]);
    expect(value("--ease-default")).toContain("cubic-bezier");
  });

  it("does not move the Tailwind breakpoints", () => {
    expect(FILES.filter(({ text }) => /--breakpoint-/.test(text) || /@theme/.test(text)).map(({ path }) => path)).toEqual([]);
  });
});

describe("DSN-3 the dark context", () => {
  const dark = declarations(block(TOKENS, '[data-theme="dark"],\n.dark-context'));

  it("changes only tokens that the light sheet defines", () => {
    expect(dark.length).toBeGreaterThan(0);
    expect(dark.filter(([name]) => !DEFINED_IN_ROOT.has(name)).map(([name]) => name)).toEqual([]);
  });

  it("turns the page dark and the text light", () => {
    const get = (name: string) => dark.find(([n]) => n === name)?.[1];

    expect(get("--bg-primary")).toBe("var(--color-noir)");
    expect(get("--text-primary")).toBe("var(--color-pearl-cream)");
  });
});

describe("DSN-4 the page scale", () => {
  it("grows the root size from 16 px to 20 px between 1536 px and 1920 px", () => {
    expect(block(GLOBALS, "html")).toContain("font-size: clamp(1rem, 1.0417vw, 1.25rem)");
  });

  it("puts the whole page in one centred column no wider than the page width", () => {
    const body = block(GLOBALS, "body");

    expect(body).toContain("max-width: var(--page-max-w)");
    expect(body).toContain("margin-inline: auto");
  });

  it("hides the sideways scroll, takes the text from the tokens and stops the browser from faking bold", () => {
    const base = block(GLOBALS, "html,\nbody");

    expect(base).toContain("overflow-x: hidden");
    expect(base).toContain("font-synthesis: none");
    expect(base).toContain("var(--font-primary)");
  });
});

describe("DSN-5 the animations", () => {
  const keyframes = new Set(names(/@keyframes\s+([\w-]+)/g, [GLOBALS, ...FILES.map((f) => f.text)].join("\n")));
  const used = unique(
    FILES.flatMap(({ text }) => [
      ...names(/animate-\[([a-zA-Z][a-zA-Z0-9-]*)_/g, text),
      ...names(/\[animation:([a-zA-Z][a-zA-Z0-9-]*)_/g, text),
      ...names(/animation(?:-name)?:\s*["'`]?\s*([a-zA-Z][\w-]*)\s/g, text),
    ])
  ).filter((name) => !["none", "inherit", "initial", "unset", "var"].includes(name));

  it("defines a keyframes rule for every animation a style or class asks for", () => {
    expect(used.length).toBeGreaterThan(5);
    expect(used.filter((name) => !keyframes.has(name))).toEqual([]);
  });

  it("has the keyframes the shell, the carts and the lists use", () => {
    for (const name of ["spin", "rt-in", "rt-out", "img-fade-in", "cart-shimmer", "skeleton-shimmer", "checkout-shimmer", "ni-pulse", "ni-ticker-scroll"]) expect(keyframes.has(name)).toBe(true);
  });

  it("switches the movement off for people who ask for less, for the drawer, the menus and the cards", () => {
    const calm = mediaBlocks(GLOBALS, "prefers-reduced-motion: reduce").join("\n");

    for (const selector of [".drawer-nav-link", ".drawer-category-link", ".mega-menu-item-link", ".user-avatar-btn", ".collection-card"]) expect(calm).toContain(selector);
    expect(calm).toContain("transition: none");
  });

  it("keeps the fade-in off the pictures that must not fade", () => {
    expect(GLOBALS).toContain("img[data-admin-img]");
    expect(GLOBALS).toContain("img[data-cursor-img]");
  });
});

describe("DSN-6E the cursor and the font", () => {
  it("hides the system pointer only while the drawn one is on", () => {
    expect(GLOBALS).toContain("html.custom-cursor-active");
    expect(GLOBALS).toMatch(/html\.custom-cursor-active[\s\S]*cursor:\s*none/);
  });

  it("finds the typeface files that the layout loads", () => {
    const layout = read("src/app/[locale]/layout.tsx");
    const src = layout.match(/src:\s*"([^"]+\.woff2)"/)?.[1];

    expect(src).toBeDefined();
    expect(existsSync(join(ROOT, "src/app/[locale]", src!))).toBe(true);
  });

  it("finds the three pictures of the drawn pointer", () => {
    for (const name of ["default", "pointer", "text"]) expect(existsSync(join(ROOT, `public/cursor/${name}.png`))).toBe(true);
  });
});
