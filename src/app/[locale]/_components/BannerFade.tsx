"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { BannerItem } from "@/src/types/site-config";
import ResponsiveBannerImage from "./ResponsiveBannerImage";

interface BannerFadeProps {
  banners: readonly BannerItem[];
  /** Index of the visible banner — drive it with `useBannerRotation`. */
  index: number;
  alt?: string;
  sizes: string;
  /** Classes for the `<img>` itself. */
  imageClassName?: string;
  /** Image opacity — banners sit slightly translucent over the champagne base so both colors show. */
  imageOpacity?: number;
  priority?: boolean;
}

/**
 * Crossfading banner stack that fills its (positioned) parent.
 * Pair with `useBannerRotation` + `CarouselDots` for hero backgrounds.
 */
export default function BannerFade({
  banners,
  index,
  alt = "",
  sizes,
  imageClassName,
  imageOpacity = 0.85,
  priority = true,
}: BannerFadeProps) {
  if (banners.length === 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={index}
        initial={{ opacity: banners.length > 1 ? 0 : 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <ResponsiveBannerImage
          banner={banners[index]}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", opacity: imageOpacity }}
          className={imageClassName}
        />
      </motion.div>
    </AnimatePresence>
  );
}
