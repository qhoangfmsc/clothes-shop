# Ori Baebi — Design System

> Single source of truth for all visual decisions across the Ori Baebi store.
> Every page, component, and future feature **MUST** reference these tokens.

---

## 1. Color Palette

Ori Baebi's palette is built on **soft, washed-out pastels** — think morning light through sheer curtains. Colors should always feel like they've been gently diluted with milk. Never saturated, never harsh.

### 1.1 Core Brand Colors

```
┌──────────────────────────────────────────────────────────────┐
│  PINK FAMILY              BLUE FAMILY            YELLOW FAMILY│
│                                                               │
│  ██ Blush          ██ Sky Mist          ██ Butter             │
│  #F2D5D5          #D5E4EF              #F5ECC9               │
│                                                               │
│  ██ Petal          ██ Cloud             ██ Cream              │
│  #F8E3E0          #E8F0F6              #FAF3E0               │
│                                                               │
│  ██ Rose Milk      ██ Whisper Blue      ██ Vanilla            │
│  #FCEEED          #F0F5FA              #FDF8EC               │
│                                                               │
│  ██ Dusty Rose     ██ Sage Mist         ██ Honey Dew          │
│  #D4A5A5          #C5CEB5              #EDE4C5               │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 CSS Custom Properties (Design Tokens)

These are defined in `globals.css` under `:root`. All components must use these variables — **never hardcode hex values**.

```css
:root {
  /* ─── Pink Family ─── */
  --color-blush:        #F2D5D5;   /* Pastel pink — primary accent */
  --color-petal:        #F8E3E0;   /* Lighter pink — card backgrounds, hover states */
  --color-rose-milk:    #FCEEED;   /* Near-white pink — section backgrounds */
  --color-dusty-rose:   #D4A5A5;   /* Muted rose — buttons, active states */

  /* ─── Blue Family ─── */
  --color-sky-mist:     #D5E4EF;   /* Pastel blue — secondary accent */
  --color-cloud:        #E8F0F6;   /* Lighter blue — card backgrounds, tags */
  --color-whisper-blue: #F0F5FA;   /* Near-white blue — alternate section backgrounds */
  --color-sage-mist:    #C5CEB5;   /* Muted sage — subtle accents, nature-inspired */

  /* ─── Yellow Family ─── */
  --color-butter:       #F5ECC9;   /* Pastel yellow — warm highlights */
  --color-cream:        #FAF3E0;   /* Light cream — base warm background */
  --color-vanilla:      #FDF8EC;   /* Near-white warm — page background */
  --color-honey-dew:    #EDE4C5;   /* Muted gold — badges, premium indicators */

  /* ─── Lavender (Supporting) ─── */
  --color-lavender:     #E0D6EB;   /* Pastel lavender — tertiary accent */
  --color-lavender-mist:#F0ECF5;   /* Near-white lavender — subtle overlays */

  /* ─── Neutrals ─── */
  --color-ivory:        #F5F0E8;   /* Warm white — primary page background */
  --color-warm-white:   #FDFCFA;   /* Purest warm white — hero backgrounds */
  --color-warm-grey:    #9B9590;   /* Body text secondary */
  --color-taupe:        #B8A99A;   /* Borders, dividers, muted text */
  --color-charcoal:     #3D3531;   /* Primary text — warm near-black */
  --color-deep-brown:   #1A1714;   /* Headings, navigation text */
  --color-chocolate:    #4A3728;   /* Accent dark — leather goods vibe */

  /* ─── Pure ─── */
  --color-white:        #FFFFFF;
  --color-black:        #000000;

  /* ─── Semantic Aliases ─── */
  --bg-primary:         var(--color-ivory);
  --bg-secondary:       var(--color-cream);
  --bg-accent-pink:     var(--color-rose-milk);
  --bg-accent-blue:     var(--color-whisper-blue);
  --bg-accent-yellow:   var(--color-vanilla);
  --bg-dark:            var(--color-black);
  --bg-panel:           var(--color-deep-brown);

  --text-primary:       var(--color-charcoal);
  --text-secondary:     var(--color-warm-grey);
  --text-heading:       var(--color-deep-brown);
  --text-on-dark:       var(--color-white);
  --text-accent:        var(--color-dusty-rose);
  --text-muted:         var(--color-taupe);

  --border-light:       var(--color-petal);
  --border-default:     var(--color-taupe);
  --border-subtle:      rgba(181, 169, 154, 0.3);

  --accent-primary:     var(--color-dusty-rose);
  --accent-secondary:   var(--color-sky-mist);
  --accent-tertiary:    var(--color-butter);
}
```

### 1.3 Color Usage Rules

| Context | Token(s) to Use | Never Use |
|---|---|---|
| Page background (light pages) | `--bg-primary` or `--bg-secondary` | Pure white `#FFF` as full-page bg |
| Page background (dark pages) | `--bg-dark` or `--bg-panel` | Generic `#333` or `#222` |
| Section alternation | Rotate `--bg-accent-pink`, `--bg-accent-blue`, `--bg-accent-yellow` | Same bg for consecutive sections |
| Card backgrounds | `--color-petal`, `--color-cloud`, `--color-vanilla` | Generic greys |
| Primary buttons | `--accent-primary` bg, `--color-white` text | Saturated reds, blues |
| Secondary buttons | Transparent bg, `--accent-primary` border + text | Filled dark buttons |
| Body text | `--text-primary` | Pure black `#000` |
| Headings | `--text-heading` | Generic `#333` |
| Hover states | Shift to next lighter shade in same family | Completely different color |
| Hero/Landing (dark mode) | `--color-white` text with `mix-blend-mode: exclusion` | — |

### 1.4 Dark Mode (Gallery / Black Panel)

The landing page hero + gallery uses a dark scheme. For dark contexts:

```css
[data-theme="dark"],
.dark-context {
  --bg-primary:     var(--color-black);
  --text-primary:   var(--color-white);
  --text-heading:   var(--color-white);
  --border-light:   rgba(255, 255, 255, 0.1);
  --border-subtle:  rgba(255, 255, 255, 0.05);
}
```

---

## 2. Typography

### 2.1 Font Stack

```css
:root {
  --font-primary: "Inter Tight", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-weight:  500;   /* Single weight across all text */
}
```

- **Inter Tight** is loaded via Google Fonts with weight 500
- Never add additional weights without design approval
- Never use serif fonts — the brand is modern minimalist

### 2.2 Type Scale

| Token | Size | Use Case |
|---|---|---|
| `--text-xs` | `11px` | Footer, legal text, metadata |
| `--text-sm` | `12px` | Captions, labels, helper text |
| `--text-base` | `13px` | Body copy, descriptions |
| `--text-md` | `15px` | Navigation items, button text, sub-headings |
| `--text-lg` | `20px` | Section titles (mobile), product names |
| `--text-xl` | `25px` | Section titles (tablet), collection labels |
| `--text-2xl` | `30px` | Section titles (desktop) |
| `--text-3xl` | `42px` | Hero sub-headings |
| `--text-hero` | `60–110px` | Hero prices, CTA text (responsive) |

```css
:root {
  --text-xs:    11px;
  --text-sm:    12px;
  --text-base:  13px;
  --text-md:    15px;
  --text-lg:    20px;
  --text-xl:    25px;
  --text-2xl:   30px;
  --text-3xl:   42px;
}
```

### 2.3 Typography Rules

| Property | Value | Notes |
|---|---|---|
| `font-weight` | `500` always | Single weight brand rule |
| `letter-spacing` | `-0.04em` for headings, `-0.02em` for body | Tight tracking is brand identity |
| `line-height` | `100%` for headings, `140%` for body | Headings are compact, body is readable |
| `text-transform` | `uppercase` for navigation, labels, footer | Body copy stays mixed case |

---

## 3. Spacing System

Use a **4px base grid**. All spacing values are multiples of 4.

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

### Spacing Rules

| Context | Mobile | Tablet | Desktop |
|---|---|---|---|
| Page edge padding | `16px` | `24px` | `32px` |
| Section gap | `48px` | `64px` | `80px` |
| Card gap | `8px` | `12px` | `16px` |
| Component internal | `12px` | `16px` | `20px` |
| Fixed element inset | `16px` from edge | `24px` | `32px` from edge |

---

## 4. Responsive Breakpoints

```css
/* Mobile-first approach */
--bp-sm:   640px;    /* ≥ 640px: Tablet */
--bp-lg:   1024px;   /* ≥ 1024px: Desktop */
--bp-xl:   1440px;   /* ≥ 1440px: Large desktop */
```

| Breakpoint | Grid Columns | Max Content Width |
|---|---|---|
| `< 640px` | 2 columns | 100% |
| `640–1024px` | 3 columns | 100% |
| `≥ 1024px` | 4 columns | `1440px` centered |

### Tailwind Mapping

```
sm:  → 640px   (tablet)
lg:  → 1024px  (desktop)
xl:  → 1440px  (large desktop)
```

---

## 5. Animation & Motion

### 5.1 Easing

```css
:root {
  --ease-default:   cubic-bezier(0.25, 0.1, 0.25, 1);   /* Smooth standard */
  --ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);     /* Deceleration */
  --ease-in-out:    cubic-bezier(0.65, 0, 0.35, 1);     /* Symmetrical */
}
```

### 5.2 Duration Scale

| Token | Duration | Use Case |
|---|---|---|
| `--duration-fast` | `150ms` | Hover states, small toggles |
| `--duration-base` | `300ms` | Standard transitions, opacity |
| `--duration-slow` | `600ms` | Entry animations, page transitions |
| `--duration-slower` | `1000ms` | Hero reveals, scroll-driven |

### 5.3 Entry Animation Pattern

All fixed UI elements use staggered fade-in + slide-up on page load:

```ts
// Framer Motion standard entry
const entryAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.6,
    ease: [0.25, 0.1, 0.25, 1],
    delay: /* staggered per component */
  }
};
```

| Component | Delay |
|---|---|
| Logo | `0s` |
| HeaderNav | `0.15s` |
| Caption | `0.3s` |
| ProductInfo | `0.45s` |

### 5.4 Animation Rules

1. **Never** use `linear` easing for UI elements — always use `--ease-default` or `--ease-out-cubic`
2. `will-change` must be removed after animation completes (or use sparingly)
3. Scroll-driven animations use RAF, **never** scroll event listeners
4. Respect `prefers-reduced-motion` — provide `will-change: auto` and `transition: none` fallbacks
5. Maximum animation duration for any interaction: `600ms`

---

## 6. Visual Effects

### 6.1 mix-blend-mode: exclusion

All overlaid text on hero/video sections **MUST** use:
```css
mix-blend-mode: exclusion;
color: white;
```
This ensures readability over both light and dark video frames.

### 6.2 Borders & Dividers

```css
/* Light context */
border: 1px solid var(--border-subtle);

/* Decorative (cards, featured) */
border: 1px solid var(--border-light);

/* Dark context */
border: 1px solid rgba(255, 255, 255, 0.1);
```

### 6.3 Shadows

Shadows should be warm-toned, never pure black:

```css
:root {
  --shadow-sm:  0 1px 3px rgba(58, 49, 42, 0.06);
  --shadow-md:  0 4px 12px rgba(58, 49, 42, 0.08);
  --shadow-lg:  0 8px 32px rgba(58, 49, 42, 0.12);
  --shadow-xl:  0 16px 48px rgba(58, 49, 42, 0.16);
}
```

### 6.4 Border Radius

```css
:root {
  --radius-sm:    4px;     /* Tags, badges */
  --radius-md:    8px;     /* Cards, inputs */
  --radius-lg:    16px;    /* Larger cards, modals */
  --radius-xl:    24px;    /* Featured sections */
  --radius-pill:  9999px;  /* Buttons, pill shapes */
}
```

---

## 7. Component Patterns

### 7.1 Buttons

```
┌─────────────────────────────────────────────────┐
│  PRIMARY BUTTON                                  │
│  bg: var(--accent-primary)  → #D4A5A5           │
│  text: var(--color-white)                        │
│  border-radius: var(--radius-pill)               │
│  padding: 12px 32px                              │
│  hover: opacity 0.9, slight scale(1.02)          │
│  transition: var(--duration-fast)                 │
├─────────────────────────────────────────────────┤
│  SECONDARY BUTTON                                │
│  bg: transparent                                 │
│  text: var(--accent-primary)                     │
│  border: 1px solid var(--accent-primary)         │
│  hover: bg var(--color-rose-milk)                │
├─────────────────────────────────────────────────┤
│  GHOST BUTTON                                    │
│  bg: transparent                                 │
│  text: var(--text-primary)                       │
│  hover: bg var(--color-petal)                    │
├─────────────────────────────────────────────────┤
│  CTA PILL (Hero)                                 │
│  bg: var(--color-white)                          │
│  text: exclusion white                           │
│  border-radius: var(--radius-pill)               │
│  font-size: var(--text-hero) responsive          │
└─────────────────────────────────────────────────┘
```

### 7.2 Cards (Product / Gallery)

```css
.product-card {
  background: var(--color-petal);      /* or --color-cloud, --color-vanilla */
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: transform var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### 7.3 Navigation

- Fixed position, `z-index: 20`
- `pointer-events: none` on overlay contexts (hero)
- `mix-blend-mode: exclusion` on dark backgrounds
- Uppercase, `--text-md`, `letter-spacing: -0.02em`

### 7.4 Section Backgrounds — Rotation Pattern

When building multi-section pages, alternate section backgrounds to create visual rhythm:

```
Section 1: var(--bg-accent-pink)    →  #FCEEED  (rose milk)
Section 2: var(--bg-primary)         →  #F5F0E8  (ivory)
Section 3: var(--bg-accent-blue)    →  #F0F5FA  (whisper blue)
Section 4: var(--bg-secondary)       →  #FAF3E0  (cream)
Section 5: var(--bg-accent-yellow)  →  #FDF8EC  (vanilla)
```

---

## 8. Image & Media Guidelines

### Photography Style
- Always soft-lit, diffused — never harsh flash
- Warm color grading — slight yellow/pink shift in post
- Models: minimal makeup, undone hair, natural poses
- Background: clean, minimal, architectural or botanical

### Gallery Grid
- Aspect ratio: `2:3` for product/editorial images
- `object-fit: cover` always
- Lazy loading for below-fold images
- No borders on gallery images — let them breathe

### Overlays
- Dark overlay: `rgba(0, 0, 0, 0.4)` max — never fully opaque
- Light overlay: `rgba(255, 255, 255, opacity)` — controlled by scroll

---

## 9. z-index Scale

| Layer | z-index | Use |
|---|---|---|
| Base content | `0` | Page flow, sections |
| Video background | `0` | Hero video |
| Black panel | `10` | Gallery overlay |
| White overlay | `12` | Outro fade |
| Fixed UI elements | `20` | Logo, nav, footer, CTA |
| Cursor | `50` | Custom cursor |
| Modal / Drawer | `100` | Future overlays |
| Toast / Snackbar | `200` | Future notifications |

---

## 10. Accessibility Checklist

- [ ] All interactive elements have visible focus states using `--accent-primary`
- [ ] Color contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for headings
- [ ] `prefers-reduced-motion` disables all scroll-driven + entry animations
- [ ] `prefers-color-scheme: dark` — respect system preference where applicable
- [ ] All images have descriptive `alt` text
- [ ] Interactive elements: `pointer-events: auto` when clickable, `none` when decorative

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════╗
║  ORI BAEBI DESIGN — CHEAT SHEET                        ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  PINK:    #F2D5D5  #F8E3E0  #FCEEED  #D4A5A5           ║
║  BLUE:    #D5E4EF  #E8F0F6  #F0F5FA  #C5CEB5           ║
║  YELLOW:  #F5ECC9  #FAF3E0  #FDF8EC  #EDE4C5           ║
║  PURPLE:  #E0D6EB  #F0ECF5                              ║
║  NEUTRAL: #F5F0E8  #FDFCFA  #9B9590  #3D3531  #1A1714  ║
║                                                          ║
║  FONT: Inter Tight 500                                   ║
║  SPACING: 4px grid                                       ║
║  EASING: cubic-bezier(0.25, 0.1, 0.25, 1)              ║
║  RADIUS: pill=9999px  card=8px  tag=4px                 ║
║                                                          ║
║  RULE: Never hardcode colors. Use CSS variables.         ║
║  RULE: Never use pure black text. Use --text-primary.    ║
║  RULE: Alternate section BGs: pink → ivory → blue.      ║
║  RULE: All hero text: mix-blend-mode: exclusion.         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```
