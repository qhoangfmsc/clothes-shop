---
trigger: always_on
---

# Ori Baebi Design System — Mandatory Rules

> These rules are **non-negotiable**. Every component, page, and feature MUST follow them to maintain visual consistency across the Ori Baebi store.

## Reference

Always read `DESIGN.md` in the project root before writing any UI code. It contains the complete design token definitions.

## Color Rules

1. **NEVER hardcode hex colors** in components. Always use CSS custom properties (e.g., `var(--color-blush)`, `var(--text-primary)`).
2. **The brand palette is soft pastels** — pink (#F2D5D5, #F8E3E0, #FCEEED, #D4A5A5), blue (#D5E4EF, #E8F0F6, #F0F5FA), yellow (#F5ECC9, #FAF3E0, #FDF8EC), lavender (#E0D6EB, #F0ECF5). All pastel, all washed-out, all gentle.
3. **Never use pure black (#000000) for text.** Use `var(--text-primary)` (#3D3531) or `var(--text-heading)` (#1A1714).
4. **Never use pure white (#FFFFFF) as a full-page background.** Use `var(--bg-primary)` (#F5F0E8 ivory) or `var(--bg-secondary)` (#FAF3E0 cream).
5. **Exception**: Hero/landing dark contexts (video background, gallery) may use `#000` for backgrounds and `#FFF` for text with `mix-blend-mode: exclusion`.
6. **Section backgrounds must alternate** using the rotation pattern: `--bg-accent-pink` → `--bg-primary` → `--bg-accent-blue` → `--bg-secondary` → `--bg-accent-yellow`. Never use the same background for consecutive sections.
7. **Shadows must use warm-toned rgba** — `rgba(58, 49, 42, opacity)`, never `rgba(0, 0, 0, opacity)`.

## Typography Rules

1. **Font**: Always `"Inter Tight", sans-serif` at weight `500`. No other fonts or weights.
2. **Letter-spacing**: `-0.04em` for headings, `-0.02em` for body text and navigation.
3. **Line-height**: `100%` for headings, `140%` for body copy.
4. **Text-transform**: `uppercase` for navigation, labels, footer, badges. Mixed case for body content and descriptions.
5. **Use semantic type tokens** (`--text-xs` through `--text-hero`), not arbitrary pixel values.

## Spacing & Layout Rules

1. **4px base grid** — all spacing values must be multiples of 4.
2. **Page edge padding**: 16px (mobile) → 24px (tablet) → 32px (desktop).
3. **Responsive breakpoints**: `sm: 640px`, `lg: 1024px`, `xl: 1440px`. Mobile-first approach.
4. **Grid columns**: 2 (mobile) → 3 (tablet) → 4 (desktop).
5. **Image aspect ratio**: `2:3` for product/editorial images.

## Animation Rules

1. **Standard easing**: `cubic-bezier(0.25, 0.1, 0.25, 1)` — never `linear` for UI elements.
2. **Entry animations**: Staggered fade-in + slide-up (opacity 0→1, y 12→0) with component-specific delays.
3. **Max animation duration**: 600ms for any user interaction.
4. **Scroll animations**: RAF-driven, never scroll event listeners.
5. **Always respect** `prefers-reduced-motion` with `will-change: auto` and `transition: none` fallbacks.
6. **Hover effects**: Subtle only — `opacity 0.9`, `translateY(-2px)`, `scale(1.02)`. Never dramatic.

## Component Rules

1. **Buttons**: Always `border-radius: 9999px` (pill shape). Primary uses `--accent-primary`, secondary is outlined.
2. **Cards**: Use family-matching backgrounds — `--color-petal` (pink), `--color-cloud` (blue), `--color-vanilla` (yellow). Hover: lift + shadow.
3. **Fixed UI overlays** (hero): `pointer-events: none`, `z-index: 20`, `mix-blend-mode: exclusion`.
4. **z-index scale**: Content `0`, Panel `10`, Overlay `12`, Fixed UI `20`, Cursor `50`, Modal `100`.

## Code Style

1. **CSS variables** must be defined in `globals.css` under `:root`.
2. **No inline hex colors** in TSX/JSX — reference variables or Tailwind classes mapped to tokens.
3. **Tailwind custom theme** should extend (not replace) with the design tokens when using utility classes.
4. When creating a new page or component, check `DESIGN.md` first to select appropriate tokens.

## Before Submitting Any UI Code

Ask yourself:
- [ ] Am I using CSS variables, not hardcoded hex?
- [ ] Does the color palette feel soft and pastel?
- [ ] Is the typography consistently Inter Tight 500?
- [ ] Are section backgrounds alternating correctly?
- [ ] Do animations respect prefers-reduced-motion?
- [ ] Is the spacing on a 4px grid?
