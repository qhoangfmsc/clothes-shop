"use client";

import { useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { useTranslations } from "next-intl";

interface ReviewImageViewerProps {
  images: string[];
  index: number;
  open: boolean;
  onView: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen viewer for the photos of one review (yet-another-react-lightbox: pinch / double-tap / wheel zoom,
 * swipe or arrows between photos). Loaded on demand by `ReviewImageGrid` so the library stays out of the page bundle.
 */
export default function ReviewImageViewer({ images, index, open, onView, onClose }: ReviewImageViewerProps) {
  const t = useTranslations("shared.reviews");
  const slides = useMemo(
    () => images.map((src, i) => ({ src, alt: t("images.alt", { index: i + 1, count: images.length }) })),
    [images, t]
  );

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Counter]}
      on={{ view: ({ index: shown }) => onView(shown) }}
      zoom={{ maxZoom: 6, maxZoomPixelRatio: 2, scrollToZoom: true }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      labels={{
        Close: t("viewer.close"),
        Previous: t("viewer.previous"),
        Next: t("viewer.next"),
        "Zoom in": t("viewer.zoomIn"),
        "Zoom out": t("viewer.zoomOut"),
        Lightbox: t("viewer.lightbox"),
        "Photo gallery": t("viewer.gallery"),
        Slide: t("viewer.slide"),
        "{index} of {total}": t("viewer.slideOf", { index: "{index}", total: "{total}" }),
      }}
      render={images.length < 2 ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      styles={{ root: { "--yarl__color_backdrop": "color-mix(in srgb, var(--bg-dark) 96%, transparent)" } }}
    />
  );
}
