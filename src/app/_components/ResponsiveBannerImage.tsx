import { getImageProps, type ImageProps } from "next/image";
import { resolveBannerImage, type BannerItem } from "@/src/types/site-config";

type ResponsiveBannerImageProps = {
  banner: BannerItem;
} & Omit<ImageProps, "src">;

/** Builds just the `srcSet` Next.js would emit for this src, so we can hang
 *  it off a <source> without rendering a second <img>. */
function srcSetFor(src: string, alt: string, imageProps: Omit<ImageProps, "src" | "alt">): string {
  const { props } = getImageProps({ ...imageProps, alt, src });
  return props.srcSet ?? props.src;
}

/** Renders a banner's image as a <picture> with one <source media=...> per
 *  breakpoint that actually needs a different image, plus a single
 *  fallback <img> for the rest — so the BROWSER's native resource
 *  selection picks exactly one file to download, the same way it would for
 *  a hand-written responsive <picture>. This matters most for priority
 *  (above-the-fold) hero banners: a CSS-only show/hide approach still
 *  renders N separate <img> elements, and a `priority` one gets preloaded
 *  and fetched even while hidden — wasting bandwidth and hurting LCP.
 *
 *  Breakpoints are plain viewport-width media queries (mirroring the
 *  sm/lg tiers used across the site's Tailwind classes), so rotating a
 *  phone or iPad re-evaluates them live with no JS resize listener and no
 *  hydration mismatch — landscape phones/tablets naturally fall into
 *  whichever tier actually matches their current width.
 *
 *  Fallback chain (handled by `resolveBannerImage`): mobile → tablet →
 *  desktop, tablet → desktop. A banner with no responsive overrides at all
 *  collapses back to a single plain <img>, same as before this component
 *  existed. */
export default function ResponsiveBannerImage({
  banner,
  alt = "",
  ...imageProps
}: ResponsiveBannerImageProps) {
  const mobileSrc = resolveBannerImage(banner, "mobile");
  const tabletSrc = resolveBannerImage(banner, "tablet");
  const desktopSrc = banner.image;

  const { props: desktopProps } = getImageProps({ ...imageProps, alt, src: desktopSrc });

  /* List narrowest-first: <picture> uses the FIRST <source> whose `media`
     matches, so a source's `max-width` only "wins" for viewports not
     already claimed by an earlier, more specific source. */
  const sources: { media: string; src: string }[] = [];
  if (mobileSrc !== tabletSrc) {
    sources.push({ media: "(max-width: 639px)", src: mobileSrc });
  }
  if (tabletSrc !== desktopSrc) {
    sources.push({ media: "(max-width: 1023px)", src: tabletSrc });
  }

  return (
    <picture>
      {sources.map(({ media, src }) => (
        <source
          key={media}
          media={media}
          sizes={imageProps.sizes}
          srcSet={srcSetFor(src, alt, imageProps)}
        />
      ))}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from desktopProps */}
      <img {...desktopProps} />
    </picture>
  );
}
