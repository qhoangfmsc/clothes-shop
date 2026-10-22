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

/** Renders a banner image as a <picture> with one <source media> per breakpoint that needs another image plus a fallback <img>, so the
 *  browser downloads one file (CSS-only show/hide still fetches hidden `priority` images and hurts LCP). Plain viewport media queries
 *  re-evaluate on rotation without a resize listener or hydration mismatch. Fallback chain: `resolveBannerImage`. */
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
