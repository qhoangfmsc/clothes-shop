import type { BannerItem } from "@/src/types/site-config";

export const EMPTY_BANNER_ITEM: BannerItem = {
  image: "",
  responsiveImages: {},
  label: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
};

/** Banners of a saved BANNER value; an empty list when nothing is saved or the value is broken */
export function parseBannerValue(value: string | undefined): BannerItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
