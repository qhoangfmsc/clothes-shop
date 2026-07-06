# Ori Baebi — Design System Skills

> This skill ensures design consistency when generating or modifying any UI code for the Ori Baebi store.

## When This Skill Activates

- Creating any new page or component
- Modifying existing UI elements
- Adding CSS styles or Tailwind classes
- Building new features with visual output

## Mandatory Pre-Check

Before writing any UI code, read these files:
1. `src/styles/design-system.css` — **Single source of truth** for all tokens
2. `DESIGN.md` — Complete design documentation
3. `.agent/rules/design-system.md` — Enforcement rules

## Design Token Quick Reference

### Color Palette (Champagne Canvas + Diverse Accents)

**Champagne family** (core canvas):
- `--color-pearl-cream: #FBF8F1` → primary page bg
- `--color-champagne-cream: #F5EFE0` → secondary bg
- `--color-warm-linen: #EDE5D4` → cards, panels
- `--color-soft-beige: #E5DBCA` → elevated surfaces
- `--color-sand: #DDD1BC` → inputs, wells

**Gold** (primary accent): `#C9A96E` / `#D4B978` / `#E8D5A3` / `#8B7335`
**Dusty Rose** (romantic): `#D4A5A5` / `#E8C4C0` / `#F5E0DC` / `#B07878`
**Sage** (nature): `#A3B18A` / `#C5CEB5` / `#E2E8D5` / `#7A8B65`
**Lavender** (evening): `#B8A5C8` / `#D4C8E0` / `#EDE6F2` / `#8A7399`
**Dusty Blue** (bags): `#8FA3B4` / `#B5C8D6` / `#DAE4EC` / `#6B8499`
**Chocolate** (leather): `#5C4033` / `#8B7060` / `#C4AE98` / `#3D2B1F`
**Soft Yellow** (summer): `#F0E4A6` / `#FAF3DC` / `#D4C07A`
**Noir** (contrast): `#0A0A08` / `#1A1917` / `#2C2926` / `#4A4540` / `#6B6560`

### Product Category → Color Mapping
- Tops/Camisoles → Rose family
- Skirts → Sage family
- Bags/Accessories → Blue family
- Jewelry → Gold family
- Evening Wear → Lavender family
- Leather Goods → Chocolate family
- Summer Collection → Yellow family

### Key Constraints
1. NEVER hardcode hex colors → use CSS custom properties from `design-system.css`
2. NEVER use Tailwind default colors → only layout/spacing utilities
3. Background canvas is CHAMPAGNE by default → `--bg-primary` (#FBF8F1)
4. Noir is ONLY for contrast sections (gallery, drawer, hero)
5. Use DIVERSE section backgrounds → rotate through tinted creams (rose, sage, lavender, etc.)
6. Match product categories to their color family
7. Gold is the PRIMARY accent, but other accent colors are encouraged for variety
8. Shadows use warm brown rgba: `rgba(58, 49, 42, opacity)`
9. Buttons MUST be pill-shaped: `border-radius: 9999px`
10. Spacing MUST follow 4px grid
11. New tokens MUST be added to `design-system.css` first
