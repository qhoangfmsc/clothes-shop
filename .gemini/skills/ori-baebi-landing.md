# Ori Baebi — Luxury Fashion Landing Page

## Project Overview

This is a scroll-driven, full-screen fashion landing page for **Ori Baebi**, a luxury boutique fashion brand specializing in haute couture bags, apparel, and accessories. The site delivers a premium, immersive editorial experience with a **warm champagne/cream + gold accent** aesthetic on regular pages, and **noir contrast** on gallery/hero sections.

## Tech Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss` (layout/spacing only — colors use CSS tokens)
- **GSAP 3.15** + ScrollTrigger for scroll-driven panel animation
- **Framer Motion 12** for entry animations (staggered fade-in/slide-up)
- **Design Tokens**: `src/styles/design-system.css` — single source of truth
- **Fonts**: Quiche Display 400 (editorial) + Inter Tight 500 (UI)

## Architecture

```
app/
├── layout.tsx          # Root layout with fonts, SEO metadata
├── page.tsx            # Re-exports default public page
├── globals.css         # Imports design-system.css + global overrides
└── (public)/
    └── landing-page/
        ├── page.tsx            # Main orchestrator: GSAP setup, RAF loop, scroll phases
        ├── _components/
        │   ├── Caption.tsx         # Brand tagline, delayed fade-in
        │   ├── CollectionShowcase.tsx  # Gallery with scattered grid + scale animations
        │   ├── OutroSection.tsx    # CTA section with gold accent heading
        │   ├── ProductInfo.tsx     # Circle symbol randomizer + collection label
        │   ├── VideoContainer.tsx  # Dual video: cursor-scrub (desktop) / auto-alternate (mobile)
        │   └── ViewButton.tsx      # Pill CTA, scales from 0→1 during outro
        └── _common/
            └── constants.ts        # Gallery images, video paths, symbols

src/styles/
└── design-system.css   # ★ Single source of truth for all design tokens

app/_components/        # Shared cross-page components
├── CustomCursor.tsx    # 48×48 SVG cursor, mix-blend-mode exclusion, desktop only
├── Logo.tsx            # Brand wordmark SVG, responsive widths, fade-in
├── HeaderNav.tsx       # Nav links + hamburger, responsive
├── HamburgerMenu.tsx   # Full-screen drawer menu (dark noir theme)
└── Footer.tsx          # Brand © + privacy
```

## Key Behaviors

### Two-Phase Scroll Design
1. **Hero phase** (0 → 100vh scroll): Full-viewport video background with overlaid UI (mix-blend-mode: exclusion). A black panel slides up from below via GSAP ScrollTrigger.
2. **Gallery phase** (100vh+): Black panel is fixed (noir bg for dramatic contrast); inner wrapper scrolls up. Product images scale in/out. At the end, outro overlay fades in.

### Video Interaction
- **Desktop**: Videos scrub based on cursor X position with dead zone. Updates `currentTime` when `!video.seeking`.
- **Mobile/Tablet**: Videos auto-play alternately. Respects `prefers-reduced-motion`.

### Design Principles
- **Champagne-first**: Regular pages use warm cream backgrounds
- **Noir for contrast**: Gallery panel, drawer, hero overlay use dark context
- All hero text overlays use `mix-blend-mode: exclusion`
- `pointer-events-none` on all overlaid UI
- Entry animations staggered: logo (0s), nav (0.15s), caption (0.3s), product info (0.45s)
- **Color tokens only** — no hardcoded hex, no Tailwind default colors

## Responsive Breakpoints
- **Mobile**: < 640px (2 gallery columns)
- **Tablet**: 640px–1024px (3 gallery columns)
- **Desktop**: ≥ 1024px (4 gallery columns)

## Running

```bash
yarn dev        # Start dev server (Turbopack)
yarn build      # Production build
yarn start      # Serve production build
```
