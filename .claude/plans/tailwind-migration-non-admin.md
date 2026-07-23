# Plan: Migrate Non-Admin Pages to Tailwind CSS

## Goal
Migrate all non-admin pages from BEM-based CSS files and inline styles to Tailwind CSS utility classes, following the same pattern already used in the admin section.

## Pattern Reference
Admin pages already use the correct pattern:
- Tailwind utility classes for layout/spacing (`flex`, `grid`, `gap-4`, `p-6`, etc.)
- CSS custom properties inline for colors: `text-[var(--text-heading)]`, `bg-[var(--bg-elevated)]`, `border-[var(--border-subtle)]`
- Responsive breakpoints via Tailwind: `sm:`, `md:`, `lg:`

---

## Phase 1: Small & Isolated Components (Quick wins)

### 1.1 Toast (`src/styles/toast.css` → `src/app/_components/Toast.tsx`)
- **CSS file**: 194 lines, toast container + individual toast + variant styles
- **Remove**: `src/styles/toast.css`
- **Remove import**: `import "@/src/styles/toast.css"` from Toast.tsx
- **Approach**: Replace BEM classes (`.toast-container`, `.toast--success`, `.toast__icon`, etc.) with Tailwind utility classes + `var(--xxx)` inline tokens

### 1.2 Route Transition (`src/styles/route-transition.css` → `src/app/_components/RouteTransition.tsx`)
- **CSS file**: 39 lines, just keyframe animations + 2 classes
- **Remove**: `src/styles/route-transition.css`
- **Remove import**: `import "@/src/styles/route-transition.css"` from RouteTransition.tsx
- **Approach**: Replace `.rt-fade` classes with Tailwind arbitrary animations or keep keyframes in globals.css

### 1.3 QuickAddDrawer (`src/styles/quick-add-drawer.css` → `src/app/_components/QuickAddDrawer.tsx`)
- **Remove**: `src/styles/quick-add-drawer.css`
- **Remove import**: `import "@/src/styles/quick-add-drawer.css"` from QuickAddDrawer.tsx
- **Approach**: Has some Tailwind already, replace remaining BEM classes with Tailwind

### 1.4 CartFAB (`src/styles/cart-fab.css` → `src/app/_components/CartFAB.tsx`)
- **Remove**: `src/styles/cart-fab.css`
- **Remove import**: `import "../styles/cart-fab.css"` from layout.tsx
- **Approach**: Replace BEM classes with Tailwind

### 1.5 UnauthorizedContent (inline styles → Tailwind)
- **File**: `src/app/unauthorized/UnauthorizedContent.tsx`
- **Approach**: Convert `styles` Record object (CSSProperties) to Tailwind className strings

---

## Phase 2: Private Pages (Account, Cart, Checkout)
These are somewhat isolated and self-contained pages.

### 2.1 Cart (`src/app/(private)/cart/cart.css` → `CartContent.tsx`)
- **CSS file**: ~503 lines. Classes: `.cart-page`, `.cart-item`, `.cart-qty`, `.cart-summary`, `.cart-empty`, `.cart-skeleton`
- **Remove**: `cart.css`, import from CartContent.tsx
- **Approach**: Replace all BEM classes with Tailwind. The component already has some Tailwind classes (mixed approach). Convert fully.

### 2.2 Checkout (`src/app/(private)/checkout/checkout.css` → `CheckoutContent.tsx`)
- **CSS file**: ~519 lines. Classes: `.checkout-page`, `.checkout-form`, `.checkout-review`, `.checkout-success`, `.checkout-empty`
- **Remove**: `checkout.css`, import from CheckoutContent.tsx
- **Approach**: Replace all BEM classes with Tailwind.

### 2.3 Account (`src/app/(private)/account/account.css` → `AccountContent.tsx`)
- **CSS file**: ~591 lines. Classes: `.account-page`, `.account-profile-header`, `.account-section`, `.account-wishlist-grid`, `.account-order-card`, `.account-signout-btn`, `.account-skeleton`
- **Remove**: `account.css`, import from AccountContent.tsx
- **Approach**: Replace all BEM classes with Tailwind.

---

## Phase 3: Public Shop Pages (largest scope)

### 3.1 Shop Components (BEM in `shop.css`)
These components currently use BEM classes from `shop.css`:

- `ShopHero.tsx` → `.shop-hero`, `.shop-hero__bg`, `.shop-hero__content`, etc.
- `BreadcrumbNav.tsx` → `.breadcrumb`, `.breadcrumb__link`, `.breadcrumb__current`, etc.
- `SubcategoryChips.tsx` → `.subcategory-chips`, `.subcategory-chip`, `.subcategory-chip--active`
- `ProductCard.tsx` → `.product-card`, `.product-card__image-wrap`, `.product-card__badge`, `.product-card__icons`, `.product-card__quick-add`, `.product-card__info`, `.product-card__price-row`, etc.
- Lookbook grid classes → `.lookbook-grid`, `.lookbook-grid__item`
- Empty state → `.shop-empty`, `.shop-empty__icon`, etc.
- Section title → `.shop-section-title`, `.shop-section-title__label`, etc.
- Category card → `.category-card`, `.category-card__image`, `.category-card__content`, etc.

**Remove imports** from:
- `shop/page.tsx`
- `shop/[category]/page.tsx`
- `shop/[category]/[subcategory]/page.tsx`
- `shop/[category]/[subcategory]/[productId]/page.tsx`

**Then delete**: `src/app/(public)/shop/shop.css`

### 3.2 Product Detail CSS
- `ProductDetailClient.tsx` already uses Tailwind in many parts
- **Remove**: `product-detail.css`, import from `[productId]/page.tsx`
- **Approach**: Replace remaining BEM classes in ProductDetailClient with Tailwind

### 3.3 Collections Pages
- `CollectionsClient.tsx` → BEM classes: `.col-hero`, `.col-horizontal`, `.col-spread`, `.col-marquee` (from `collections.css`)
- **Remove imports** from `collections/page.tsx`
- **Delete**: `src/app/(public)/collections/collections.css`
- `CollectionDetailClient.tsx` already uses Tailwind for sub-components
- **Remove**: `collection-detail.css`, import from `collections/[slug]/page.tsx`
- **Delete**: `src/app/(public)/collections/[slug]/collection-detail.css`

### 3.4 New-In Page
- `NewInClient.tsx` already uses Tailwind heavily (57 classes)
- **Remove imports** from `new-in/page.tsx`
- **Delete**: `src/app/(public)/new-in/new-in.css`

### 3.5 About Page Components (inline styles → Tailwind)
- `InvitationHero.tsx`, `BrandStory.tsx`, `ServicesSection.tsx`, `ContactCTA.tsx`
- All use `style={{}}` inline objects
- **Approach**: Convert inline `style={}` to Tailwind `className`

---

## Phase 4: Global / Layout CSS Cleanup

### 4.1 `src/app/globals.css`
Currently contains:
- `@import "tailwindcss"` — KEEP
- `@import "../styles/design-system.css"` — KEEP
- Global reset (html, body) — KEEP (or move to Tailwind config)
- Image fade-in animation — KEEP
- Drawer hover styles (`.drawer-nav-link:hover`, etc.) — MIGRATE to component Tailwind
- Mega menu hover styles — MIGRATE to component Tailwind
- Site footer styles — MIGRATE to Footer component Tailwind
- User menu hover styles — MIGRATE to UserMenu component Tailwind
- Reduced motion overrides — REPLACE with Tailwind `motion-reduce:` variants

### 4.2 `src/styles/design-system.css`
- **KEEP** — This is the design token system, used by Tailwind's `var(--xxx)` pattern
- The entire app depends on these CSS custom properties

---

## Files to DELETE (14 CSS files)

| # | File | Phase |
|---|------|-------|
| 1 | `src/styles/toast.css` | 1 |
| 2 | `src/styles/route-transition.css` | 1 |
| 3 | `src/styles/quick-add-drawer.css` | 1 |
| 4 | `src/styles/cart-fab.css` | 1 |
| 5 | `src/app/(private)/cart/cart.css` | 2 |
| 6 | `src/app/(private)/checkout/checkout.css` | 2 |
| 7 | `src/app/(private)/account/account.css` | 2 |
| 8 | `src/app/(public)/shop/shop.css` | 3 |
| 9 | `src/app/(public)/shop/.../product-detail.css` | 3 |
| 10 | `src/app/(public)/collections/collections.css` | 3 |
| 11 | `src/app/(public)/collections/[slug]/collection-detail.css` | 3 |
| 12 | `src/app/(public)/new-in/new-in.css` | 3 |
| 13 | `src/app/globals.css` | 4 (cleanup, not delete — keep essential parts) |
| 14 | `src/styles/design-system.css` | KEEP (design tokens) |

---

## Files to MODIFY (TSX only, ~25 files)

### Phase 1 (4 files)
- `src/app/_components/Toast.tsx` — replace BEM with Tailwind
- `src/app/_components/RouteTransition.tsx` — replace BEM with Tailwind
- `src/app/_components/QuickAddDrawer.tsx` — replace BEM with Tailwind
- `src/app/_components/CartFAB.tsx` — replace BEM with Tailwind
- `src/app/unauthorized/UnauthorizedContent.tsx` — inline styles → Tailwind
- `src/app/layout.tsx` — remove cart-fab.css import

### Phase 2 (3 files)
- `src/app/(private)/cart/CartContent.tsx`
- `src/app/(private)/checkout/CheckoutContent.tsx`
- `src/app/(private)/account/AccountContent.tsx`

### Phase 3 (~12 files)
- `src/app/(public)/shop/_components/ShopHero.tsx`
- `src/app/(public)/shop/_components/BreadcrumbNav.tsx`
- `src/app/(public)/shop/_components/SubcategoryChips.tsx`
- `src/app/(public)/shop/_components/ProductCard.tsx`
- `src/app/(public)/shop/page.tsx` — remove CSS import
- `src/app/(public)/shop/[category]/page.tsx` — remove CSS import
- `src/app/(public)/shop/[category]/[subcategory]/page.tsx` — remove CSS import
- `src/app/(public)/shop/[category]/[subcategory]/[productId]/page.tsx` — remove CSS import
- `src/app/(public)/collections/_components/CollectionsClient.tsx`
- `src/app/(public)/collections/[slug]/_components/CollectionDetailClient.tsx`
- `src/app/(public)/new-in/page.tsx` — remove CSS import
- `src/app/(public)/about/_components/*.tsx` (4 files) — inline styles → Tailwind

### Phase 4 (1 file + globals)
- `src/app/globals.css` — cleanup non-essential styles, keep only reset + imports + keyframes

---

## Key Conversion Rules

### Typography
| CSS | Tailwind |
|-----|----------|
| `font-family: var(--font-display), serif` | `font-display` |
| `font-family: var(--font-primary)` | `font-primary` |
| `font-size: var(--text-xs)` | `text-xs` |
| `font-size: var(--text-sm)` | `text-sm` |
| `font-size: var(--text-base)` | `text-base` |
| `font-size: var(--text-md)` | `text-[15px]` |
| `font-size: var(--text-lg)` | `text-lg` |
| `font-size: var(--text-xl)` | `text-xl` |
| `font-size: var(--text-2xl)` | `text-2xl` |
| `font-size: var(--text-3xl)` | `text-3xl` |
| `font-weight: var(--font-weight-display)` | `font-normal` |
| `font-weight: var(--font-weight-body)` | `font-medium` |
| `color: var(--text-heading)` | `text-[var(--text-heading)]` |
| `color: var(--text-muted)` | `text-[var(--text-muted)]` |
| `letter-spacing: -0.02em` | `tracking-[-0.02em]` |
| `letter-spacing: -0.04em` | `tracking-[-0.04em]` |
| `letter-spacing: 0.08em` | `tracking-[0.08em]` |
| `text-transform: uppercase` | `uppercase` |

### Spacing
| CSS | Tailwind |
|-----|----------|
| `padding: var(--space-4)` | `p-4` |
| `padding: var(--space-6)` | `p-6` |
| `gap: var(--space-3)` | `gap-3` |
| etc. | (space-N maps directly) |

### Colors
| CSS | Tailwind |
|-----|----------|
| `background: var(--bg-primary)` | `bg-[var(--bg-primary)]` |
| `background: var(--bg-elevated)` | `bg-[var(--bg-elevated)]` |
| `border: 1px solid var(--border-subtle)` | `border border-[var(--border-subtle)]` |
| `color: var(--accent-primary)` | `text-[var(--accent-primary)]` |

### Border Radius
| CSS | Tailwind |
|-----|----------|
| `border-radius: var(--radius-sm)` | `rounded-sm` |
| `border-radius: var(--radius-md)` | `rounded-md` |
| `border-radius: var(--radius-lg)` | `rounded-lg` |
| `border-radius: var(--radius-xl)` | `rounded-xl` |
| `border-radius: var(--radius-pill)` | `rounded-full` |

### Shadows
| CSS | Tailwind |
|-----|----------|
| `box-shadow: var(--shadow-sm)` | `shadow-[var(--shadow-sm)]` |
| `box-shadow: var(--shadow-gold-sm)` | `shadow-[var(--shadow-gold-sm)]` |
| `box-shadow: var(--shadow-gold-md)` | `shadow-[var(--shadow-gold-md)]` |

### Transitions
| CSS | Tailwind |
|-----|----------|
| `transition: color var(--duration-fast) var(--ease-default)` | Match existing pattern or use Tailwind `transition-colors duration-150` |

### Backdrop
| CSS | Tailwind |
|-----|----------|
| `backdrop-filter: blur(8px)` | `backdrop-blur-lg` |
| `backdrop-filter: blur(20px)` | `backdrop-blur-[20px]` |

---

## Execution Order
1. **Phase 1** first — small wins, build momentum, validate approach
2. **Phase 2** next — self-contained private pages
3. **Phase 3** — the big one, shop/public pages
4. **Phase 4** — final cleanup of globals.css

Each phase will be committed separately so it's easy to revert if needed.
