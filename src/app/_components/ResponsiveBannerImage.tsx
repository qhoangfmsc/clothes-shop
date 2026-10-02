"use client";

import Image, { type ImageProps } from "next/image";
import { BANNER_BREAKPOINTS, resolveBannerImage, type BannerItem } from "@/src/types/site-config";

/* Tailwind prefix that turns a tier "on" at its min-width, keyed by the
   breakpoint that comes right after it in BANNER_BREAKPOINTS. Matches the
   site's existing sm/lg usage (Tailwind v4 defaults: 640/1024px). */
const TIER_ON_PREFIX: Record<string, string> = {
  tablet: "sm:",
  desktop: "lg:",
};

type ResponsiveBannerImageProps = {
  banner: BannerItem;
} & Omit<ImageProps, "src">;

/** Renders a banner's image, swapping to a different source per breakpoint
 *  (mobile/tablet/desktop/wide) via pure CSS visibility — no JS resize
 *  listeners, no hydration mismatch. Consecutive tiers that resolve to the
 *  same image are collapsed into a single <Image>, so a banner with no
 *  responsive overrides renders exactly one element, same as before. */
export default function ResponsiveBannerImage({ banner, alt, ...imageProps }: ResponsiveBannerImageProps) {
  const tierSrcs = BANNER_BREAKPOINTS.map(({ key }) => resolveBannerImage(banner, key));

  const runs: { start: number; end: number; src: string }[] = [];
  tierSrcs.forEach((src, i) => {
    const last = runs[runs.length - 1];
    if (last && last.src === src) {
      last.end = i;
    } else {
      runs.push({ start: i, end: i, src });
    }
  });

  return (
    <>
      {runs.map(({ start, end, src }) => {
        const classes: string[] = [start === 0 ? "block" : "hidden"];
        if (start > 0) classes.push(`${TIER_ON_PREFIX[BANNER_BREAKPOINTS[start].key]}block`);
        if (end < BANNER_BREAKPOINTS.length - 1) {
          classes.push(`${TIER_ON_PREFIX[BANNER_BREAKPOINTS[end + 1].key]}hidden`);
        }
        return (
          <Image
            key={`${start}-${src}`}
            src={src}
            alt={alt}
            {...imageProps}
            className={[classes.join(" "), imageProps.className].filter(Boolean).join(" ")}
          />
        );
      })}
    </>
  );
}
