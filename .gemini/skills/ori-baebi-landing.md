# Ori Baebi — Luxury Fashion Landing Page

## Project Overview

This is a scroll-driven, full-screen fashion landing page for **Ori Baebi**, a luxury fashion brand specializing in haute couture bags, apparel, and accessories designed for global fashion shows. The site delivers a premium, immersive experience that reflects the brand's high-fashion identity.

## Tech Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **GSAP 3.15** + ScrollTrigger for scroll-driven panel animation
- **Framer Motion 12** for entry animations (staggered fade-in/slide-up)
- **Google Fonts**: Inter Tight (weight 500)

## Architecture

```
app/
├── layout.tsx          # Root layout with Inter Tight font, SEO metadata
├── page.tsx            # Main orchestrator: GSAP setup, RAF loop, scroll phases
├── globals.css         # Tailwind import, bp-card transition/will-change
└── components/
    ├── CustomCursor.tsx    # 48×48 SVG cursor, mix-blend-mode exclusion, desktop only
    ├── Logo.tsx            # Brand wordmark SVG, responsive widths, fade-in
    ├── Caption.tsx         # Brand tagline, delayed fade-in
    ├── HeaderNav.tsx       # ABOUT + hamburger + CART, responsive
    ├── ProductInfo.tsx     # Circle symbol randomizer + collection label + price
    ├── ViewButton.tsx      # Pill CTA, scales from 0→1 during outro
    ├── VideoContainer.tsx  # Dual video: cursor-scrub (desktop) / auto-alternate (mobile)
    ├── WhiteOverlay.tsx    # Full-screen white fade during outro
    ├── Footer.tsx          # Brand © + privacy
    └── BlackPanel.tsx      # Gallery with scattered grid + eased scale animations
```

## Key Behaviors

### Two-Phase Scroll Design
1. **Hero phase** (0 → 100vh scroll): Full-viewport video background with overlaid UI. A black panel slides up from below via GSAP ScrollTrigger (scrub, ease: none).
2. **Gallery phase** (100vh+): Black panel is fixed; inner wrapper scrolls up. Product images scale in/out with easeOutCubic easing. At the end, a white overlay fades in with a "view" CTA.

### Video Interaction
- **Desktop**: Videos are NOT auto-played. They scrub based on cursor X position with a dead zone at the center to prevent jitter. Only updates `currentTime` when `!video.seeking`.
- **Mobile/Tablet**: Videos auto-play alternately (left → right → left…). Respects `prefers-reduced-motion`.

### Gallery Card Animation
- Cards use `will-change: transform` and `transition: transform 0.2s cubic-bezier(...)` for smoothness.
- Scale is computed per-frame in RAF with easeOutCubic applied to both enter (80% vh zone) and exit (35% vh zone).
- Cards in the left half of the grid scale from `right bottom`; right half from `left bottom`.

### Outro Phase
When scroll exceeds `vh + maxScroll`:
- White overlay opacity fades 0→1
- Product info slides up by `outroOffset` px
- View button scales from 0→1
- Footer fades in

### Design Principles
- All text overlays use `mix-blend-mode: exclusion`
- `pointer-events-none` on all overlaid UI
- `user-select: none` on root container
- Circle symbol randomizes from `['8', '$', '^^', '%', '/']` on scroll (throttled 80ms)
- Entry animations staggered: logo (0s), nav (0.15s), caption (0.3s), product info (0.45s)

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
