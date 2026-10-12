"use client";

import { useMemo } from "react";
import Lightbox, { IconButton, type ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";

/** Highest zoom, as a multiple of the "fit to screen" size. */
const MAX_ZOOM = 8;
/** Photo pixels may be shown up to this many times larger than their natural size (sharpness limit of the zoom). */
const MAX_ZOOM_PIXEL_RATIO = 2;
/** Floating point slack when comparing the current zoom with the fit-to-screen level. */
const ZOOM_EPSILON = 0.01;

interface ImageViewerProps {
  images: string[];
  productName: string;
  /** Photo shown when the viewer opens. */
  index: number;
  open: boolean;
  /** Called with the photo currently shown whenever the visitor moves to another one. */
  onView: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen photo viewer (yet-another-react-lightbox) for phones, tablets and desktops.
 * Pinch, double-tap / double-click, Ctrl + wheel, drag to pan, ± keys; swipe or arrows to change photo;
 * toolbar with zoom out / current zoom (tap = back to fit) / zoom in, and a photo counter.
 * Loaded on demand (`next/dynamic`) so the library stays out of the initial page bundle.
 */
export default function ImageViewer({ images, productName, index, open, onView, onClose }: ImageViewerProps) {
  const t = useTranslations("public.product.detail");

  const slides = useMemo(
    () => images.map((src, i) => ({ src, alt: t("imageAlt", { name: productName, index: i + 1 }) })),
    [images, productName, t]
  );

  const single = images.length < 2;

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Zoom, Counter]}
      on={{ view: ({ index: shown }) => onView(shown) }}
      zoom={{ maxZoom: MAX_ZOOM, maxZoomPixelRatio: MAX_ZOOM_PIXEL_RATIO, scrollToZoom: true }}
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
      render={{
        ...(single && { buttonPrev: () => null, buttonNext: () => null }),
        buttonZoom: (zoomRef) => <ZoomBar zoomRef={zoomRef} resetLabel={t("viewer.resetZoom")} />,
      }}
      // Library theming hook: the backdrop colour is a CSS variable of the lightbox root
      styles={{ root: { "--yarl__color_backdrop": "color-mix(in srgb, var(--bg-dark) 96%, transparent)" } }}
    />
  );
}

/** Toolbar widget: zoom out · current zoom (tap to fit the screen again) · zoom in. */
function ZoomBar({ zoomRef, resetLabel }: { zoomRef: ZoomRef; resetLabel: string }) {
  const { zoom, minZoom, maxZoom, disabled, zoomIn, zoomOut, changeZoom } = zoomRef;
  const atFit = zoom <= minZoom + ZOOM_EPSILON;

  return (
    <>
      <IconButton
        label="Zoom out"
        icon={ZoomOut}
        renderIcon={() => <ZoomOut className="yarl__icon" />}
        disabled={disabled || atFit}
        onClick={zoomOut}
      />
      <button
        type="button"
        className="yarl__button min-w-14 text-sm tabular-nums"
        aria-label={resetLabel}
        disabled={disabled || atFit}
        onClick={() => changeZoom(minZoom)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton
        label="Zoom in"
        icon={ZoomIn}
        renderIcon={() => <ZoomIn className="yarl__icon" />}
        disabled={disabled || zoom >= maxZoom - ZOOM_EPSILON}
        onClick={zoomIn}
      />
    </>
  );
}
