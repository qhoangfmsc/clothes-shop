---
trigger: always_on
---

# Shared components — use these, don't re-implement

Before building UI, check this list. If a shared component covers the need, **use it** (extend it with an optional prop if it falls a little short — never fork a copy). All live in `src/app/[locale]/_components/` unless noted. Rules 7 & 8 of `coding.md` still apply: no `index.ts`, and code used by a single module stays in that module.

| Need | Use | Notes |
|---|---|---|
| Any carousel / slider / swipeable row | `Carousel` | Rule below. Never hand-roll `snap-x`, `scrollBy`, touch/drag handlers or dot indicators. |
| Crossfading banner background (hero) | `BannerFade` + `useBannerRotation` (`src/hooks`) + `CarouselDots` | Auto-rotates, dots included. |
| Position dots / prev-next buttons outside `Carousel` | `CarouselDots`, `CarouselArrow` (`CarouselControls`) | Same look + i18n labels as `Carousel`. |
| Any auto-advancing element | `useAutoAdvance` (`src/hooks`) | Pauses off-screen / hover / focus / touch / hidden tab / reduced motion. Don't write `setInterval` loops. |
| Admin list table | `DataTable` | Rule below. |
| Admin modal form | `AdminFormKit` (`ModalShell`, `FormTabs`, `FormSection`, `FormField`, `FormActions`, `inputClass`) | |
| Confirm / destructive action | `useConfirm` (`ConfirmDialog`) | Never `window.confirm`. |
| Toast feedback | `useToast` (`Toast`) | |
| Permission-gated admin UI | `RoleGuard` + `PERMISSIONS` (`src/lib/permissions.ts`) | |
| Image URL / upload fields | `ImageUrlField`, `ImageListField`; preview with `ImagePreviewLightbox` | Uploads go through `uploadMediaFile` (`src/hooks/use-media-upload.ts`). |
| Banner / responsive `<picture>` | `ResponsiveBannerImage` | |
| Checkbox | `Checkbox` | |
| Structured data | `JsonLd` + `src/lib/structured-data.ts` | |

## Carousel

`Carousel.tsx` is the only carousel. Each child is one slide.

```tsx
<Carousel
  ariaLabel={t("carouselAria")}                 // required, translated
  slidesPerView={{ base: 2, sm: 3, lg: 4 }}     // 1 | 1.25 | 2 | 2.5 | 3 | 4 | 5 | 6, optionally per breakpoint
  gap={{ base: 3, sm: 4, lg: 5 }}               // Tailwind spacing units: 0 | 2 | 3 | 4 | 5 | 6
  // arrows, dots, drag, autoplay (5 s) and loop are already on — only override to change them
  autoplay={2500}                               // e.g. a faster interval
>
  {items.map((item) => <Card key={item.id} {...item} />)}
</Carousel>
```

- **Project-wide defaults — every carousel has all of these on, just by rendering `<Carousel>`:**
  dot pagination (`dots`), prev/next arrows (`arrows`), mouse drag (`draggable`), autoplay (`autoplay`, 5000 ms) and **endless looping** (`loop`: past the last slide it keeps going to the first, and the other way round — by swipe, drag, arrows or autoplay; it clones slides at both ends, so no rewind). Don't re-pass the defaults.
- **Opting out is the exception**: pass `arrows={false}`, `dots={false}`, `draggable={false}`, `autoplay={false}` or `loop={false}` only with a one-line comment saying why (e.g. a product photo gallery that shouldn't move by itself). Looping only applies when there are more slides than fit on screen.
- Use a fractional `slidesPerView` (1.25, 2.5) on phones so the next slide peeks in.
- Other props: `arrows="hover"` / `dots="overlay"` variants, `arrowsTone` / `dotsTone` (`onImage` over photos / dark sections, `onSurface` on light backgrounds), `keyboard`, `fill` (stretch to the parent's height), `className`, `slideClassName`, `carouselRef` (`CarouselHandle`: `next` / `prev` / `scrollToPage`, e.g. for thumbnails) and `onPageChange` (fires with the page index, 0-based, wrap-aware).
- A new `slidesPerView` / `gap` value must be added to **both** the type and the class table at the top of `Carousel.tsx` (Tailwind needs literal class names).
- Slides are laid out by `Carousel`; the card inside only styles itself. Do not set widths on slides.
- Strings (`prev`, `next`, `dot`, `slide`) live in `shared/carousel.json`; the consumer only supplies `ariaLabel`.
- Scroll-driven *effects* that are not a carousel (GSAP pinned horizontal scroll, marquee tickers) stay as they are.

## DataTable (admin tables)

Every admin list uses `DataTable` — columns, `fetchData` (server mode) or `rows` (static), search, filters, sort, pagination, selection.

- **Records per page**: `pageSize` (default `DEFAULT_PAGE_SIZE` = 25, so tables are untouched unless they opt in). A page that must show everything at once passes a larger value (max = the BE limit, 200); pagination appears only when `total > pageSize`.
- **Drag-and-drop ordering**: pass `reorder={{ sortValue, onReorder }}`. Enabled only when sorted by `sortValue`, unfiltered, and all rows fit on one page (so combine with `pageSize`). `onReorder` receives the full list in its new order; throw to roll the table back.
- Sort values follow the BE: `field` = ascending, `-field` = descending.
- Don't add table-specific behaviour inside `DataTable`; add a generic optional prop instead.
