---
trigger: always_on
---

# Ori Baebi Design System — Mandatory Rules

> These rules are **non-negotiable**. Every component, page, and feature MUST follow them to maintain visual consistency across the Ori Baebi store.

## Reference

1. Read `src/styles/design-system.css` — **Single source of truth** for all design tokens
2. Read `DESIGN.md` — Complete design documentation with usage guidelines
3. Read `.gemini/skills/ori-baebi-brand.md` — Brand identity context

## Color Rules

1. **NEVER hardcode hex colors** in components. Always use CSS custom properties from `design-system.css`.
2. **NEVER use Tailwind default colors** (e.g., `text-white`, `bg-black`, `text-gray-500`). Map to design tokens instead.
3. **The brand palette is DIVERSE and warm** — Champagne canvas (#FBF8F1, #F5EFE0, #EDE5D4), Gold accent (#C9A96E), Dusty Rose (#D4A5A5), Sage (#A3B18A), Lavender (#B8A5C8), Dusty Blue (#8FA3B4), Chocolate (#5C4033), Soft Yellow (#F0E4A6), Noir for contrast (#0A0A08). Each color family has light/cream/deep tones.
4. **Backgrounds are champagne/cream by default.** Page bg: `var(--bg-primary)` (#FBF8F1 pearl cream). Light, warm, boutique-like.
5. **Noir/black is ONLY for contrast sections** — gallery panel, drawer menu, hero overlays. Use `--bg-dark` or `.dark-context` class for these.
6. **Never use pure white (#FFFFFF) as full-page background.** Use `var(--bg-primary)` (pearl cream) or `var(--bg-secondary)` (champagne cream).
7. **Never use pure black (#000000) for body text.** Use `var(--text-primary)` (#1A1917 obsidian) or `var(--text-heading)` (#0A0A08 noir).
8. **Section backgrounds should be DIVERSE** — rotate through tinted creams: `--bg-section-1` (pearl cream) → `--bg-section-2` (rose milk) → `--bg-section-3` (champagne) → `--bg-section-4` (sage cream) → `--bg-section-5` (vanilla) → `--bg-section-6` (lavender cream) → `--bg-section-7` (cloud blue). Never use the same background for consecutive sections.
9. **Match product categories to color families** — Tops→Rose, Skirts→Sage, Bags→Blue, Jewelry→Gold, Evening→Lavender, Leather→Chocolate, Summer→Yellow.
9. **Shadows must use warm brown rgba** — `rgba(58, 49, 42, opacity)` for depth, `rgba(201, 169, 110, opacity)` for gold glow. Never `rgba(0, 0, 0, opacity)`.
10. **Hero/landing overlays** may use `#FFF` text with `mix-blend-mode: exclusion`.

## Typography Rules

1. **Display font**: `Quiche Display 400` for hero headings, collection titles, editorial. Via `var(--font-display)`.
2. **Body font**: `Inter Tight 500` for navigation, buttons, body, labels. Via `var(--font-primary)`.
3. **Letter-spacing**: `-0.04em` for headings, `-0.02em` for body text, `0.12em` for uppercase labels.
4. **Line-height**: `100%` for headings, `140%` for body copy.
5. **Text-transform**: `uppercase` for navigation, labels, footer, badges. Mixed case for body content.
6. **Use semantic type tokens** (`--text-xs` through `--text-3xl`), not arbitrary pixel values.

## Spacing & Layout Rules

1. **4px base grid** — all spacing values must be multiples of 4.
2. **Page edge padding**: 16px (mobile) → 24px (tablet) → 32px (desktop).
3. **Responsive breakpoints**: `sm: 640px`, `lg: 1024px`, `xl: 1440px`. Mobile-first approach.
4. **Grid columns**: 2 (mobile) → 3 (tablet) → 4 (desktop).
5. **Image aspect ratio**: `2:3` for product/editorial images.

## Animation Rules

1. **Standard easing**: `cubic-bezier(0.25, 0.1, 0.25, 1)` — never `linear` for UI elements.
2. **Luxury easing**: `cubic-bezier(0.16, 1, 0.3, 1)` — for editorial reveals and page transitions.
3. **Entry animations**: Staggered fade-in + slide-up (opacity 0→1, y 12→0) with component-specific delays.
4. **Max animation duration**: 600ms for user interactions, 1200ms for cinematic reveals.
5. **Scroll animations**: RAF-driven, never scroll event listeners.
6. **Always respect** `prefers-reduced-motion` with `will-change: auto` and `transition: none` fallbacks.
7. **Hover effects**: Subtle only — `opacity 0.9`, `translateY(-2px)`, `scale(1.02)`, gold shadow glow. Never dramatic.

## Component Rules

1. **Buttons**: Always `border-radius: 9999px` (pill shape). Primary uses `--accent-primary` (gold) bg + `--text-on-gold` text. Can use category-matching accent color for variety.
2. **Cards**: Use warm light surfaces — `--bg-elevated` (warm linen) or category-tinted cream (e.g., `--color-rose-milk`, `--color-sage-cream`). Hover: lift + gold shadow glow.
3. **Dark context sections** (gallery, drawer, hero): Use `.dark-context` class or `--bg-dark`. Text uses `--text-on-dark`.
4. **Fixed UI overlays** (hero): `pointer-events: none`, `z-index: 20`, `mix-blend-mode: exclusion`.
5. **z-index scale**: Base `0`, Panel `10`, Overlay `12`, Fixed `20`, Cursor `50`, Modal `100`, Toast `200`.

## Code Style

1. **CSS tokens** must be defined in `src/styles/design-system.css` under `:root`.
2. **No inline hex colors** in TSX/JSX — reference CSS custom properties only.
3. **No Tailwind default colors** — only use Tailwind for layout/spacing utilities, never for colors.
4. When creating a new page or component, check `design-system.css` and `DESIGN.md` first.
5. **When adding new tokens** — add to `design-system.css` first, update `DESIGN.md`, then use in components.

## Before Submitting Any UI Code

Ask yourself:
- [ ] Am I using CSS variables from `design-system.css`, not hardcoded hex?
- [ ] Am I avoiding Tailwind default color classes?
- [ ] Does the palette feel warm, light, and luxurious (like a boutique store)?
- [ ] Is noir/black used ONLY for contrast sections (gallery, drawer, hero)?
- [ ] Is typography using Quiche Display (editorial) / Inter Tight (UI)?
- [ ] Are section backgrounds alternating correctly (cream → champagne → linen → ...)?
- [ ] Are accents champagne gold, not other colors?
- [ ] Do animations respect prefers-reduced-motion?
- [ ] Is the spacing on a 4px grid?
