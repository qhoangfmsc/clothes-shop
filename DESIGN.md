# Ori Baebi — Design System

> Single source of truth for all visual decisions across the Ori Baebi store.
> Every page, component, and future feature **MUST** reference these tokens.
> All tokens are defined in `src/styles/design-system.css`.

---

## 1. Color Palette

Ori Baebi's palette is a **diverse, warm luxury palette** — champagne canvas with rich accent families inspired by the actual product universe: dusty rose for romantic pieces, sage for spring collections, lavender for evening lace, dusty blue for bags, chocolate for leather goods, soft yellow for summer gingham, and gold for premium highlights.

### 1.1 Core Color Families

```
┌──────────────────────────────────────────────────────────────┐
│  CHAMPAGNE (Canvas)                 GOLD (Primary Accent)    │
│  ██ Pearl Cream    #FBF8F1          ██ Champagne Gold #C9A96E│
│  ██ Champagne Cream#F5EFE0          ██ Pale Gold     #D4B978│
│  ██ Warm Linen     #EDE5D4          ██ Soft Gold     #E8D5A3│
│  ██ Soft Beige     #E5DBCA          ██ Deep Gold     #8B7335│
│  ██ Sand           #DDD1BC          ██ Antique Gold  #A6894A│
├──────────────────────────────────────────────────────────────┤
│  DUSTY ROSE (Romantic)              SAGE (Nature)            │
│  ██ Dusty Rose     #D4A5A5          ██ Sage          #A3B18A│
│  ██ Blush          #E8C4C0          ██ Sage Mist     #C5CEB5│
│  ██ Rose Milk      #F5E0DC          ██ Sage Cream    #E2E8D5│
│  ██ Deep Rose      #B07878          ██ Deep Sage     #7A8B65│
├──────────────────────────────────────────────────────────────┤
│  LAVENDER (Evening)                 DUSTY BLUE (Bags/Denim)  │
│  ██ Lavender       #B8A5C8          ██ Dusty Blue    #8FA3B4│
│  ██ Lavender Mist  #D4C8E0          ██ Sky Mist      #B5C8D6│
│  ██ Lavender Cream #EDE6F2          ██ Cloud         #DAE4EC│
│  ██ Deep Lavender  #8A7399          ██ Deep Blue     #6B8499│
├──────────────────────────────────────────────────────────────┤
│  CHOCOLATE (Leather)                SOFT YELLOW (Summer)     │
│  ██ Chocolate      #5C4033          ██ Butter        #F0E4A6│
│  ██ Mocha          #8B7060          ██ Vanilla       #FAF3DC│
│  ██ Latte          #C4AE98          ██ Honey         #D4C07A│
│  ██ Espresso       #3D2B1F          │                        │
├──────────────────────────────────────────────────────────────┤
│  NOIR (Contrast — use sparingly)                             │
│  ██ Noir #0A0A08  ██ Obsidian #1A1917  ██ Charcoal #2C2926  │
│  ██ Slate #4A4540  ██ Ash #6B6560                            │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Color Usage Rules

| Context | Token(s) to Use | Notes |
|---|---|---|
| Page background | `--bg-primary` (pearl cream) | Warm, inviting canvas |
| Section alternation | Rotate through `--bg-section-1` to `--bg-section-8` | Each has a different color tint for variety |
| Card backgrounds | `--bg-elevated` (warm linen) or color-tinted cream | Match product category to color family |
| Primary buttons | `--accent-primary` (gold) bg + `--text-on-gold` text | Default CTA style |
| Category accent | Use matching color family (`--accent-rose`, `--accent-sage`, etc.) | Tops→rose, Bags→blue, Jewelry→lavender |
| Body text | `--text-primary` (obsidian `#1A1917`) | Never pure black |
| Headings | `--text-heading` (noir `#0A0A08`) | Darkest text |
| Gallery / Hero / Drawer | `--bg-dark` (noir) + `--text-on-dark` | Dark contrast sections only |
| Hero overlays | `#FFF` text with `mix-blend-mode: exclusion` | — |

### 1.3 Section Rotation Pattern

Use diverse tinted backgrounds for visual rhythm — never repeat the same bg consecutively:

```
Section 1: --bg-section-1  →  #FBF8F1  (pearl cream)
Section 2: --bg-section-2  →  #F5E0DC  (rose milk)
Section 3: --bg-section-3  →  #F5EFE0  (champagne cream)
Section 4: --bg-section-4  →  #E2E8D5  (sage cream)
Section 5: --bg-section-5  →  #FAF3DC  (vanilla)
Section 6: --bg-section-6  →  #EDE6F2  (lavender cream)
Section 7: --bg-section-7  →  #DAE4EC  (cloud)
Section 8: --bg-section-8  →  #EDE5D4  (warm linen)
Contrast:  --bg-section-noir → #0A0A08 (noir — statement section)
```

### 1.4 Product Category → Color Mapping

| Category | Accent Color | Card Tint | Use For |
|---|---|---|---|
| **Tops & Camisoles** | `--accent-rose` | `--color-rose-milk` | Romantic, feminine pieces |
| **Skirts** | `--accent-sage` | `--color-sage-cream` | Nature, flowing silhouettes |
| **Bags & Accessories** | `--accent-blue` | `--color-cloud` | Structured, hardware pieces |
| **Jewelry** | `--accent-primary` (gold) | `--color-soft-gold` | Premium, gilded items |
| **Evening Wear** | `--accent-lavender` | `--color-lavender-cream` | Lace, evening glamour |
| **Leather Goods** | `--accent-chocolate` | `--color-latte` | Rich, tactile pieces |
| **Summer Collection** | `--accent-butter` | `--color-vanilla` | Light, fresh, playful |

### 1.5 Dark Context

Gallery panel, drawer, hero overlays use `.dark-context` class:
```css
[data-theme="dark"], .dark-context {
  --bg-primary: var(--color-noir);
  --text-primary: var(--color-pearl-cream);
}
```

---

## 2. Typography

### 2.1 Font Stack

- **Quiche Display 400** — Editorial: hero headings, collection titles, product names
- **Inter Tight 500** — UI: navigation, buttons, body, labels, captions

### 2.2 Type Scale

| Token | Size | Use Case |
|---|---|---|
| `--text-xs` | `11px` | Footer, legal, metadata |
| `--text-sm` | `12px` | Captions, labels |
| `--text-base` | `13px` | Body copy |
| `--text-md` | `15px` | Nav items, buttons |
| `--text-lg` | `20px` | Section titles (mobile) |
| `--text-xl` | `25px` | Section titles (tablet) |
| `--text-2xl` | `30px` | Section titles (desktop) |
| `--text-3xl` | `42px` | Hero sub-headings |

### 2.3 Typography Rules

| Property | Value |
|---|---|
| `letter-spacing` | `-0.04em` headings, `-0.02em` body, `0.12em` uppercase labels |
| `line-height` | `100%` headings, `140%` body |
| `text-transform` | `uppercase` for nav/labels/footer, mixed for body |

---

## 3. Spacing, Breakpoints, Animation

See `src/styles/design-system.css` for full token definitions:
- **Spacing**: 4px grid (`--space-1` through `--space-20`)
- **Breakpoints**: `sm: 640px`, `lg: 1024px`, `xl: 1440px` (mobile-first)
- **Easing**: `--ease-default`, `--ease-luxury` (cinematic reveals)
- **Duration**: `--duration-fast` (150ms) through `--duration-cinematic` (1200ms)
- **Radius**: `--radius-sm` (4px) through `--radius-pill` (9999px)

---

## 4. Component Patterns

### Buttons
- **Primary**: `--accent-primary` bg, `--text-on-gold` text, pill shape
- **Secondary**: Transparent bg, `--accent-primary` border
- **Category**: Can use matching accent color (e.g., `--accent-rose` for tops)

### Cards
- **Default**: `--bg-elevated` bg, `--border-light` border, gold hover glow
- **Category-tinted**: Use matching cream tint as bg (e.g., `--color-rose-milk`)

### Dark Sections
- Gallery, drawer, hero: `--bg-dark` bg, `--text-on-dark` text

### Shadows
- Warm brown `rgba(58, 49, 42, opacity)` for standard depth
- Gold `rgba(201, 169, 110, opacity)` for premium glow

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════╗
║  ORI BAEBI DESIGN — CHEAT SHEET                        ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  CANVAS:    #FBF8F1  #F5EFE0  #EDE5D4  #E5DBCA  #DDD1BC║
║  GOLD:      #C9A96E  #D4B978  #E8D5A3  #8B7335  #A6894A║
║  ROSE:      #D4A5A5  #E8C4C0  #F5E0DC  #B07878         ║
║  SAGE:      #A3B18A  #C5CEB5  #E2E8D5  #7A8B65         ║
║  LAVENDER:  #B8A5C8  #D4C8E0  #EDE6F2  #8A7399         ║
║  BLUE:      #8FA3B4  #B5C8D6  #DAE4EC  #6B8499         ║
║  CHOCOLATE: #5C4033  #8B7060  #C4AE98  #3D2B1F         ║
║  YELLOW:    #F0E4A6  #FAF3DC  #D4C07A                  ║
║  NOIR:      #0A0A08  #1A1917  #2C2926  #4A4540  #6B6560║
║                                                          ║
║  FONT: Quiche Display 400 + Inter Tight 500             ║
║  SOURCE: src/styles/design-system.css                    ║
║                                                          ║
║  RULE: Champagne canvas, diverse accents.                ║
║  RULE: Match product category to color family.           ║
║  RULE: Noir only for gallery, drawer, hero.              ║
║  RULE: Never hardcode hex. Use CSS tokens.               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```
