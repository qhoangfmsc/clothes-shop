---
name: responsive
description: Make any page, feature or component work on phone, tablet, iPad landscape, desktop and wide screens, with both touch and mouse. Use whenever code under src/app renders layout, spacing, images, navigation, overlays or an interaction (hover, zoom, drag, carousel), when creating a page or module, and before reporting a UI task as done.
---

# responsive skill (clothes-shop)

The full procedure lives in **`.agent/skills/08-responsive.md`** — read it first and follow it. The binding rule is `.agent/rules/responsive.md`.

Five device classes (Tailwind v4 defaults, mobile-first): **Phone** < 640 · **Tablet** 640–1023 (`sm`/`md`) · **iPad landscape / small laptop** 1024–1279 (`lg`) · **Desktop** 1280–1535 (`xl`) · **Wide** ≥ 1536 (`2xl`). Width decides layout; **input** (touch / mouse) decides behaviour — iPads are ≥ 1024 wide and still touch.

1. **Plan** one line per class (layout + interaction) before writing classes.
2. **Build** mobile-first; every hover-only feature gets a touch path; targets ≥ 44 px; `dvh` + safe-area on phones; wide screens get a max-width wrapper and more columns, not stretched text; reuse `Carousel` / `DataTable` / `ResponsiveBannerImage`.
3. **Verify** in a browser at 390 · 768 · 1024 · 1440 · 1920 (+ touch pass and mouse pass per interaction). No horizontal page scroll.
4. **Document** per-class structure/behaviour in the module doc (facts only), then `yarn docs:check --changed`.
5. **Report** a one-line `Responsive:` result — or say plainly that no browser was run.

Storefront and admin are held to the same standard (all five classes, touch + mouse, same docs loop). The admin shell is responsive (drawer below `lg`); use the shared `DataTable` / `AdminFormKit` / `ConfirmDialog`, which already size for touch.
