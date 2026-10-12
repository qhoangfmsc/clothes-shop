---
trigger: always_on
---

# Responsive — five device classes, two input types

Every page, feature and component must work on **all five device classes** below and with **both input types** (touch, mouse). A UI task is not done until it has been checked at the test widths (rule 10). The how-to, recipes and checklist are in `.agent/skills/08-responsive.md` (skill `responsive`).

## Device classes

Breakpoints are the **Tailwind v4 defaults** (`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`); the project does not override them. Never write another pixel threshold (`min-[…px]`, `window.innerWidth < …`) for layout.

| Class | Width | Tailwind | Typical devices | Test widths | Input |
|---|---|---|---|---|---|
| **Phone** | < 640 | unprefixed | iPhone / Android, portrait | 320 (floor), 360, 390, 430 | touch |
| **Tablet** | 640 – 1023 | `sm:` `md:` | iPad / iPad mini / Android tablet portrait, big phones in landscape | 768, 820, 834 | touch |
| **iPad landscape / small laptop** | 1024 – 1279 | `lg:` | iPad landscape (1024, 1180, 1194), 13″ laptop | 1024, 1180 | **touch or mouse** |
| **Desktop (PC)** | 1280 – 1535 | `xl:` | laptop, monitor | 1280, 1366, 1440 | mouse (iPad Pro 12.9″ landscape = 1366 is touch) |
| **Wide screen** | ≥ 1536 | `2xl:` | 24″+ / 4K monitor | 1920, 2560 | mouse |

Scope: **storefront and admin are held to the same standard** — all five classes, touch and mouse. The admin is a production client used by staff on laptops, iPads and phones; it goes through the same docs loop (`.agent/rules/module-docs.md`) and the same responsive gate (rule 10) as any customer page. Admin specifics: `DataTable` scrolls inside its own wrapper and hides low-priority columns per breakpoint; `AdminFormKit` modals fit 360 px wide and scroll inside (never the page); destructive actions keep their `useConfirm` dialog reachable by touch; permission-gated buttons (`RoleGuard`) don't leave empty gaps in the layout.
The admin shell is responsive (fixed sidebar from `lg`, off-canvas drawer below it — `docs/admin/admin-shell.md`); build admin pages inside it with the shared `DataTable`, `AdminFormKit` and `ConfirmDialog`, which already size for touch (`pointer-coarse:`). Hand-rolled modal frames must copy `ModalShell`'s sizing (`p-3 sm:p-6`, `max-h-[calc(100dvh-1.5rem)] sm:max-h-[85dvh]`) or, better, use `ModalShell`.

## Rules

1. **Mobile-first.** Unprefixed classes are the phone layout; add `sm:` → `2xl:` only to *upgrade* it. `max-*:` variants are the exception (use only when removing something is clearer, one-line reason).
2. **Width decides layout, input decides behaviour.** Width ≥ 1024 does not mean mouse (iPad landscape, iPad Pro) and a narrow window does not mean touch. Hover, cursor, drag and zoom-on-hover affordances are gated by input (`hover:` variants, `(hover: hover)`, `(pointer: fine)`, `pointerType` in handlers) — never by `innerWidth`.
3. **Every hover-only feature needs a touch equivalent.** Anything revealed or triggered by hover (arrows, zoom, tooltips, quick actions, mega menu) must stay reachable by tap: visible by default on touch, or replaced by a tap action (e.g. product gallery: mouse = hover zoom, touch = tap → full-screen viewer). No information exists only in `title` or on hover.
4. **Touch targets ≥ 44 × 44 px** on phone/tablet/iPad (visual size may be smaller if padding or a pseudo-element makes the hit area 44). Keep ≥ 8 px between neighbouring targets.
5. **Wide screens: grow the grid, not the text.** Page content sits in a centered max-width wrapper; add columns / more cards at `xl` and `2xl` instead of stretching one column; body text stays ≤ ~75 characters per line. Only heroes, banners and section backgrounds go full-bleed.
6. **No horizontal page scroll at any width.** `html, body` hide `overflow-x`, which *masks* overflow bugs — check that no element is wider than the viewport (long words, fixed widths, `w-screen`, absolutely positioned decorations). Scrolling happens inside a component (carousel, table) on purpose.
7. **Phone browser chrome.** Full-height layouts use `dvh` / `svh` (not `vh`); fixed bars, bottom sheets and drawers pad `env(safe-area-inset-*)`; sticky layouts must not trap content under the address bar or the on-screen keyboard.
8. **Both orientations.** Phones and tablets rotate: the layout must hold at the portrait and landscape width of the same device (iPad 820 ↔ 1180, phone 390 ↔ 844).
9. **Content, not mock-ups.** Check with real extremes: the longest Vietnamese and English strings, long product names, 1 / 2 / 12 items, missing images. Text containers have no fixed width; truncate or wrap deliberately.
10. **Definition of done — verify, then report.** Open the page in a browser (device toolbar / resized window) at least at **390, 768, 1024, 1440, 1920** and with one touch and one mouse check for every interactive feature. The final message has a one-line **Responsive** report: widths + input checked, or an explicit "not run in a browser — reasoned from code only". Never claim a layout works without one of the two. A "production bug" class of problem — overflow, clipped text, unreachable button on touch, layout jump — is a failure of this gate, not of testing luck.
11. **Reuse before inventing.** Use `Carousel` (`slidesPerView` / `gap` per breakpoint), `DataTable` (columns can hide per breakpoint), `ResponsiveBannerImage`, `next/image` with a `sizes` that matches the layout at each class. Prefer CSS variants over JS: `useBreakpoint` (`src/hooks/useMediaQuery.ts`, 640 / 1024) is for structure CSS cannot express, and it reflows after hydration — never use it for what a class can do.
12. **Docs.** When a change alters structure per class (columns, what is hidden, drawer vs inline, touch vs mouse behaviour), the module doc states it as fact in section 4 (see `.agent/skills/07-module-docs.md`).
