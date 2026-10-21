/* Maps code to modules: one module = one doc (`docs/`) = one spec (`specs/`) = one test folder (`tests/`). */

const L = "src/app/[locale]/";
const ADMIN = `${L}(admin)/admin/`;
const PUBLIC = `${L}(public)/`;
const PRIVATE = `${L}(private)/`;
const COMP = `${L}_components/`;

/** A path ending in "/" owns the whole folder; any other path owns exactly that file. The longest match wins. */
export const MODULES = [
  /* ── Platform ── */
  { doc: "platform/app-shell", paths: [
    `${L}layout.tsx`, `${L}not-found.tsx`, `${L}[...rest]/`, `${L}unauthorized/`, `${L}(auth)/layout.tsx`,
    `${PUBLIC}layout.tsx`, `${PUBLIC}error.tsx`, `${PRIVATE}layout.tsx`,
    `${COMP}Providers.tsx`, `${COMP}RouteTransition.tsx`, `${COMP}VercelTelemetry.tsx`, `${COMP}cursor/`,
  ] },
  { doc: "platform/site-chrome", paths: [
    `${COMP}SiteHeader.tsx`, `${COMP}HeaderNav.tsx`, `${COMP}HamburgerMenu.tsx`, `${COMP}SearchBar.tsx`,
    `${COMP}UserMenu.tsx`, `${COMP}Logo.tsx`, `${COMP}SiteFooter.tsx`, `${COMP}LanguageSwitcher.tsx`,
    `${COMP}SocialIcons.tsx`, `${COMP}CartFAB.tsx`, `${COMP}useSearchHistory.ts`, "src/lib/socials.tsx",
  ] },
  { doc: "platform/auth", paths: [
    `${L}(auth)/`, "src/contexts/", "src/lib/auth-api.ts", "src/lib/permissions.ts",
    "src/lib/system-password.ts", "src/lib/system-password-session.ts", "src/lib/admin-events.ts", "src/lib/session.ts",
    "src/hooks/use-api-auth.ts", "src/hooks/use-auth-action.ts",
    `${COMP}RoleGuard.tsx`, `${COMP}SignOutButton.tsx`, `${COMP}LoginPromptModal.tsx`, `${COMP}UnauthenticatedState.tsx`,
    `${COMP}SystemPasswordPrompt.tsx`, `${COMP}AdminPasswordGate.tsx`,
  ] },
  { doc: "platform/i18n", paths: ["src/i18n/", "src/middleware.ts", "scripts/i18n.mjs"] },
  { doc: "platform/data-layer", paths: [
    "src/lib/api.ts", "src/lib/product-url.ts", "src/lib/list-query.ts", "src/lib/media-url.ts", "src/lib/category-display.ts",
    "src/hooks/use-api.ts", "src/hooks/use-admin-api.ts", "src/hooks/use-media-upload.ts", "src/hooks/use-debounce.ts",
    "src/store/", "src/app/media/", `${PUBLIC}shop/_lib/`,
    "src/types/",
  ] },
  { doc: "platform/ui-kit", paths: [
    `${COMP}DataTable.tsx`, `${COMP}AdminFormKit.tsx`, `${COMP}InfoHint.tsx`, `${COMP}Toast.tsx`, `${COMP}ConfirmDialog.tsx`,
    `${COMP}Carousel.tsx`, `${COMP}CarouselControls.tsx`, `${COMP}ImageUrlField.tsx`, `${COMP}ImageListField.tsx`,
    `${COMP}ImagePreviewLightbox.tsx`, `${COMP}ResponsiveBannerImage.tsx`,
    `${COMP}StarRating.tsx`, `${COMP}ProductRating.tsx`, `${COMP}ProductLink.tsx`, `${COMP}ReviewContent.tsx`, `${COMP}ReviewAvatar.tsx`,
    `${COMP}ReviewImageGrid.tsx`, `${COMP}ReviewImageViewer.tsx`, `${COMP}BannerFade.tsx`,
    `${COMP}Checkbox.tsx`, `${COMP}CopyButton.tsx`, `${COMP}JsonLd.tsx`, `${COMP}PendingActionNotice.tsx`, `${COMP}OrderDetailPanel.tsx`, `${COMP}OrderPaymentBadge.tsx`, `${COMP}ProductBagButton.tsx`,
    "src/hooks/use-sort-options.ts", "src/hooks/use-auto-advance.ts", "src/hooks/use-banner-rotation.ts",
    "src/hooks/useMediaQuery.ts", "src/lib/product-badge.ts", "src/lib/product-purchase.ts",
  ] },
  { doc: "platform/currency", paths: [
    "src/lib/money.ts", "src/hooks/use-money.ts", `${COMP}MoneyText.tsx`, `${COMP}VndInput.tsx`,
  ] },
  { doc: "platform/design-system", paths: ["src/styles/", "src/app/globals.css", "src/assets/"] },
  { doc: "platform/seo", paths: [
    "src/app/robots.ts", "src/app/sitemap.ts", "src/lib/structured-data.ts", "src/lib/site-url.ts", "src/lib/brand.ts",
  ] },
  { doc: "platform/dev-tooling", paths: [
    "scripts/check-conventions.mjs", "scripts/check-docs.mjs", "scripts/check-quality.mjs", "scripts/quality-lib.mjs", "scripts/comment-lib.mjs", "scripts/comment-baseline.json", "scripts/modules.mjs", "scripts/quality-baseline.json",
    "scripts/progress-lib.mjs", "scripts/test-progress.mjs", "scripts/test-mutants.mjs", "scripts/test-batches.json",
    "next.config.ts", "vercel.json", "vitest.config.mts", "playwright.config.ts", "src/app/api/cron/",
  ] },

  /* ── Admin ── */
  { doc: "admin/admin-shell", paths: [`${L}(admin)/layout.tsx`, `${L}(admin)/AdminLayoutClient.tsx`, `${COMP}PendingCountsProvider.tsx`] },
  { doc: "admin/dashboard", paths: [`${ADMIN}page.tsx`, `${ADMIN}DashboardContent.tsx`, `${ADMIN}_components/`] },
  { doc: "admin/analytics", paths: [
    `${ADMIN}analytics/`, "src/app/api/analytics/", "src/hooks/use-admin-analytics.ts",
    "src/lib/analytics.ts", "src/lib/percent-change.ts",
  ] },
  { doc: "admin/products", paths: [`${ADMIN}products/`] },
  { doc: "admin/categories", paths: [`${ADMIN}categories/`] },
  { doc: "admin/collections", paths: [`${ADMIN}collections/`] },
  { doc: "admin/orders", paths: [`${ADMIN}orders/`] },
  { doc: "admin/payments", paths: [`${ADMIN}payments/`] },
  { doc: "admin/refunds", paths: [`${ADMIN}refunds/`] },
  { doc: "admin/returns", paths: [`${ADMIN}returns/`] },
  { doc: "admin/reviews", paths: [`${ADMIN}reviews/`] },
  { doc: "admin/users", paths: [`${ADMIN}users/`] },
  { doc: "admin/media", paths: [`${ADMIN}media/`] },
  { doc: "admin/site-config", paths: [`${ADMIN}site-config/`] },

  /* ── Storefront ── */
  { doc: "storefront/landing-page", paths: [`${PUBLIC}page.tsx`, `${PUBLIC}landing-page/`] },
  { doc: "storefront/shop", paths: [`${PUBLIC}shop/`] },
  { doc: "storefront/product-detail", paths: [`${PUBLIC}shop/[category]/[subcategory]/[productId]/`] },
  { doc: "storefront/collections", paths: [`${PUBLIC}collections/`] },
  { doc: "storefront/new-in", paths: [`${PUBLIC}new-in/`] },
  { doc: "storefront/about", paths: [`${PUBLIC}about/`] },
  { doc: "storefront/contact", paths: [`${PUBLIC}contact/`, "src/lib/contact.ts"] },
  { doc: "storefront/legal", paths: [
    `${PUBLIC}legal/`, `${PUBLIC}terms/`, `${PUBLIC}privacy/`, `${PUBLIC}shipping-returns/`, "src/lib/legal.ts",
  ] },
  { doc: "storefront/cart", paths: [`${PRIVATE}cart/`, `${COMP}QuickAddDrawer.tsx`] },
  { doc: "storefront/wishlist", paths: [`${PRIVATE}wishlist/`] },
  { doc: "storefront/checkout", paths: [`${PRIVATE}checkout/`] },
  { doc: "storefront/customer-orders", paths: [`${PRIVATE}orders/`] },
  { doc: "storefront/customer-returns", paths: [`${PRIVATE}returns/`] },
  { doc: "storefront/customer-reviews", paths: [`${PRIVATE}reviews/`] },
  { doc: "storefront/account", paths: [`${PRIVATE}account/`] },
];

/* Not owned by a module on purpose: translations (they change with every module — the module's doc names the
   namespace), generated or binary files. */
export const IGNORED = [/^src\/messages\//, /^src\/i18n\/registry\.ts$/, /(^|\/)\.next\//, /\.(png|jpe?g|webp|svg|ico|woff2?|otf|mp4)$/];
export const CODE_ROOTS = ["src", "scripts"];
export const CODE_FILES = ["next.config.ts", "vercel.json", "vitest.config.mts", "playwright.config.ts"];
export const CODE_EXT = /\.(ts|tsx|mts|css|mjs|json)$/;

