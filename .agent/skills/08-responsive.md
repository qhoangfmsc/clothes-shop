# 08 — Responsive workflow (phone · tablet · iPad landscape · desktop · wide)

The binding rule is `.agent/rules/responsive.md` (device classes, breakpoints, the 12 rules). This skill is the how-to: plan → build → verify → document. Use it for any new page or feature and for any change that touches layout, spacing, images, navigation or an interaction.

## 0. Vocabulary

| Class | Width | Prefix | Test widths | Input |
|---|---|---|---|---|
| Phone | < 640 | none | 320 · 360 · 390 · 430 | touch |
| Tablet | 640 – 1023 | `sm:` `md:` | 768 · 820 · 834 | touch |
| iPad landscape / small laptop | 1024 – 1279 | `lg:` | 1024 · 1180 | touch **or** mouse |
| Desktop (PC) | 1280 – 1535 | `xl:` | 1280 · 1366 · 1440 | mouse |
| Wide | ≥ 1536 | `2xl:` | 1920 · 2560 | mouse |

Tailwind v4 defaults: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Input is separate from width: `pointer-fine:` / `pointer-coarse:` (primary pointer), `hover:` (only applies where hover exists), `not-hover:` (no hover). A custom variant `carousel:` (phones **and** touch devices) lives in `globals.css`.

## 1. Plan (before the first class name)

Write the plan as a small table in your reply — one row per class, one line each — for what the feature does there. If a cell is "same as the previous one", say so; if it is "n/a", say why.

```
                     layout                       interaction
Phone (390)          1 col, thumbnails hidden     tap photo → viewer
Tablet (768)         1 col, thumbnails shown      tap photo → viewer
iPad landscape       2 col, sticky gallery        tap OR hover (input decides)
Desktop (1440)       2 col                        hover zoom
Wide (1920)          2 col, wrapper max-width     hover zoom
```

Decide in this order: **content priority on the phone → how it grows → what is different for touch → what the wide screen does with the extra room.**

## 2. Build — recipes

**Mobile-first classes.** `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5` (columns per `.agent/rules/design-system.md`: 2 → 3 → 4, plus a wide step). Spacing and type step up the same way (`p-4 sm:p-6 lg:p-8`, page edge 16 → 24 → 32 px).

**Wide screens.** Wrap page content in a centered max-width container (`mx-auto w-full max-w-[…]`) taken from the neighbouring pages of the same module so the site stays consistent; heroes/backgrounds are full-bleed with the content wrapper inside. Text blocks keep `max-w-[65ch]`-style limits. Check 1920 and 2560, not only 1440.

**Hover vs touch.**
```tsx
// reveal on hover where it exists, always visible where it does not
className="opacity-100 hover:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
// behaviour in handlers: look at the event, not the screen width
if (e.pointerType === "touch") return;          // hover-only logic
```
Every hover feature gets a touch path in the same change (see the product gallery: `ZoomableImage` hover-zoom for mouse/pen, tap → `ImageViewer` for touch; the badge tells both that the photo can be magnified).

**Touch targets.** `min-h-11 min-w-11` (44 px) or padding that reaches 44 px; keep 8 px between targets. Icon buttons: visual 32 px is fine if the clickable box is 44 px.

**Viewport units & phone chrome.** `h-dvh` / `min-h-dvh` / `max-h-[100dvh]` instead of `h-screen` / `vh` for anything that must fit the visible screen; `pb-[max(16px,env(safe-area-inset-bottom))]` on bottom bars, drawers and sheets; modals: centered ≥ `sm`, bottom sheet below (as `SizeGuideModal`, `QuickAddDrawer`). Avoid `position: sticky` + fixed height on phones unless the content fits in 100dvh.

**Images.** `next/image` with `sizes` that mirror the layout: `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"`-style, ending with the real column share on wide screens. Product/editorial ratio 2:3. Large hero art on phones uses a phone crop via `ResponsiveBannerImage`, not a squeezed desktop image.

**Tables and dense data.** Storefront: cards/stacked rows below `md`. Admin (`DataTable`): hide low-priority columns per breakpoint, keep the table scrolling inside its own wrapper, never the page. Admin forms (`AdminFormKit`): single column on phones, fields never wider than the modal, action row (`FormActions`) stays visible and ≥ 44 px tall.

**Image zoom / photo viewing.** Use the shared approach of the product gallery: hover zoom for mouse (`ZoomableImage`) and `yet-another-react-lightbox` (Zoom + Counter plugins, `next/dynamic`, `ssr: false`) for the full-screen viewer on every device — pinch, double-tap, Ctrl+wheel, drag-to-pan, zoom bar with the current level. Don't hand-roll pinch/pan code.

**Navigation & overlays.** Mega menu / dropdowns are mouse conveniences: below `lg` or on touch use the burger menu; popovers close on outside tap and on Esc; no flyout that needs hover to stay open.

**JS breakpoints** (`useBreakpoint`) only when structure differs (render a different component) — and render the CSS-only version first so SSR and first paint match; do not use it for spacing, visibility or columns.

## 3. Traps already present in this repo (check for them)

- `html, body { overflow-x: hidden }` hides overflow bugs: measure, don't trust the absence of a scrollbar (devtools → `document.documentElement.scrollWidth > innerWidth`).
- Admin pages live in a shell with a fixed sidebar from `lg` and an off-canvas drawer below (`docs/admin/admin-shell.md`); content gets `p-4 sm:p-6 lg:p-8`. Several admin modals are hand-rolled (`OrdersContent`, `UsersContent`) instead of `ModalShell` — copy its sizing or migrate.
- Thumbnails strip is `hidden sm:flex`; on phones the dots are the only gallery navigation.
- `vh` is used in several layouts (`lg:h-[calc(100vh-80px)]` for sticky galleries): fine on `lg`+ desktops, but check iPad landscape where browser chrome changes the visible height.
- Existing `[@media(pointer:fine)]:` arbitrary variants are the same as `pointer-fine:`; write the short form in new code.

## 4. Verify (the task is not done before this)

1. Run the page (`yarn dev`, or the project's browser skill) and resize / use the device toolbar at **390 · 768 · 1024 · 1440 · 1920** at minimum; add 320 for forms and menus, 1180 for iPad landscape, 2560 for pages with a max-width wrapper.
2. For each interactive feature: one **mouse** pass (hover, click, keyboard, Esc) and one **touch** pass (tap, swipe, scroll inside overlays, rotate) — devtools touch emulation counts.
3. Look for: horizontal scroll (`scrollWidth`), clipped text, overlapping fixed elements, targets < 44 px, content hidden behind the address bar / keyboard, empty-looking wide layouts, layout jump after hydration.
4. Try extremes (longest vi/en text, 1 and 12 items, missing image).
5. `npx tsc --noEmit`, `yarn conventions:check`, `yarn i18n:check` as usual.

If no browser can be run, say it: "Responsive: not run in a browser — layout reasoned from code (classes X, Y)". Never write "works on mobile" without one of the two.

## 5. Docs

A change that alters structure or behaviour per class updates the module doc (section 4, **facts only**): columns per class, what is hidden/shown, drawer vs inline, touch vs mouse behaviour, thresholds and constants. Platform-wide responsive facts (breakpoints, hooks, custom variants) live in `docs/platform/design-system.md`. Follow `.agent/skills/07-module-docs.md`, then `yarn docs:check --changed`.

## 6. Final report line

```
Responsive: Phone 390 ✓ · Tablet 768 ✓ · iPad landscape 1180 ✓ (touch + mouse) · Desktop 1440 ✓ · Wide 1920 ✓ — checked in <browser/devtools>; <anything not checked and why>.
```
