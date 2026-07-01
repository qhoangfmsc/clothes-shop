# Ori Baebi — Design System Skills

> This skill ensures design consistency when generating or modifying any UI code for the Ori Baebi store.

## When This Skill Activates

- Creating any new page or component
- Modifying existing UI elements
- Adding CSS styles or Tailwind classes
- Building new features with visual output
- Creating product pages, collection pages, or any storefront views

## Mandatory Pre-Check

Before writing any UI code, read these files:
1. `DESIGN.md` — Complete design token reference (colors, typography, spacing, animation)
2. `.agent/rules/design-system.md` — Enforcement rules
3. `.gemini/skills/ori-baebi-brand.md` — Brand identity and storytelling context

## Design Token Quick Reference

### Color Palette (Soft Pastels — the core identity)

**Pink family** (primary accent):
- `--color-blush: #F2D5D5` → accent, highlights
- `--color-petal: #F8E3E0` → card backgrounds, hover
- `--color-rose-milk: #FCEEED` → section backgrounds
- `--color-dusty-rose: #D4A5A5` → buttons, active states

**Blue family** (secondary accent):
- `--color-sky-mist: #D5E4EF` → secondary accent
- `--color-cloud: #E8F0F6` → card backgrounds, tags
- `--color-whisper-blue: #F0F5FA` → section backgrounds

**Yellow family** (warm highlights):
- `--color-butter: #F5ECC9` → warm highlights
- `--color-cream: #FAF3E0` → base warm background
- `--color-vanilla: #FDF8EC` → page background

**Lavender** (supporting):
- `--color-lavender: #E0D6EB` → tertiary accent
- `--color-lavender-mist: #F0ECF5` → subtle overlays

**Neutrals**:
- `--color-ivory: #F5F0E8` → primary page bg
- `--color-charcoal: #3D3531` → primary text
- `--color-deep-brown: #1A1714` → headings

### Typography
- Font: `"Inter Tight"` weight `500` only
- Letter-spacing: `-0.04em` headings, `-0.02em` body
- Line-height: `100%` headings, `140%` body

### Animation
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)`
- Entry: staggered fade-in + slide-up (0s → 0.15s → 0.3s → 0.45s)
- Max duration: 600ms
- Always respect `prefers-reduced-motion`

### Key Constraints
1. NEVER hardcode hex colors → use CSS custom properties
2. NEVER use pure black for text → `--text-primary` (#3D3531)
3. NEVER use pure white for page bg → `--bg-primary` (#F5F0E8)
4. Section backgrounds MUST alternate: pink → ivory → blue → cream → yellow
5. All hero text overlays MUST use `mix-blend-mode: exclusion`
6. Shadows MUST use warm rgba: `rgba(58, 49, 42, opacity)`
7. Buttons MUST be pill-shaped: `border-radius: 9999px`
8. Spacing MUST follow 4px grid
