"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Carousel, { type CarouselHandle } from "@/src/app/[locale]/_components/Carousel";
import type { Product } from "@/src/types/product";
import ZoomableImage from "./ZoomableImage";

const loadImageViewer = () => import("./ImageViewer");
const ImageViewer = dynamic(loadImageViewer, { ssr: false });

/** The photos of a product: swipeable carousel with thumbnails, ←/→ keys, hover zoom and the full-screen viewer. */
export default function ProductGallery({ product }: { product: Product }) {
  const t = useTranslations("public.product.detail");
  const images = product.images;
  const [activeImage, setActiveImage] = useState(0);
  /* Full-screen viewer: null until the first open (keeps its chunk unloaded); the gallery stops auto-advancing while it is open */
  const [viewer, setViewer] = useState<{ open: boolean; index: number } | null>(null);
  const viewerIndexRef = useRef(0);

  /* ── Gallery carousel: swipe / drag / arrows / dots live in <Carousel>; thumbnails drive it via the ref ── */
  const galleryRef = useRef<CarouselHandle>(null);
  const selectImage = useCallback((index: number) => {
    setActiveImage(index);
    galleryRef.current?.scrollToPage(index);
  }, []);

  /* Fetch the viewer chunk while the browser is idle, so the first tap on a photo opens it without a wait */
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadImageViewer());
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => void loadImageViewer(), 2000);
    return () => clearTimeout(id);
  }, []);


  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") galleryRef.current?.prev();
      if (e.key === "ArrowRight") galleryRef.current?.next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
    <div className="relative flex flex-col gap-3 p-4 sm:p-6 lg:flex-1 lg:max-w-[55%] lg:py-6 lg:pr-4 lg:pl-8 lg:sticky lg:top-20 lg:h-162.5">
      {/* Main image — carousel */}
      <Carousel
        fill
        ariaLabel={t("carouselAria")}
        gap={0}
        arrows="hover"
        dots="overlay"
        keyboard={false}
        carouselRef={galleryRef}
        autoplay={viewer?.open ? false : undefined}
        onPageChange={setActiveImage}
        className="flex-1 rounded-lg overflow-hidden bg-[var(--bg-elevated)]"
        slideClassName="relative min-h-[25rem] lg:min-h-0 select-none"
      >
        {images.map((img, idx) => (
          <ZoomableImage
            key={img}
            src={img}
            alt={t("imageAlt", { name: product.name, index: idx + 1 })}
            priority={idx === 0}
            onOpen={() => {
              viewerIndexRef.current = idx;
              setViewer({ open: true, index: idx });
            }}
          />
        ))}
      </Carousel>

      {/* Thumbnails — desktop only */}
      <div className="hidden sm:flex gap-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            className={`relative w-16 h-20 rounded-md overflow-hidden border-2 p-0 cursor-pointer bg-[var(--bg-elevated)] transition-all duration-[150ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:opacity-85 ${
              activeImage === idx ? "border-[var(--accent-primary)]" : "border-transparent"
            }`}
            onClick={() => selectImage(idx)}
            aria-label={t("viewImage", { index: idx + 1 })}
          >
            <Image src={img} alt="" fill sizes="80px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>
    </div>
      {/* Full-screen photo viewer (pinch / pan / zoom bar) */}
      {viewer && (
        <ImageViewer
          images={images}
          productName={product.name}
          index={viewer.index}
          open={viewer.open}
          onView={(i) => {
            viewerIndexRef.current = i;
          }}
          onClose={() => {
            /* Land the gallery on the photo the visitor ended on */
            selectImage(viewerIndexRef.current);
            setViewer((v) => v && { ...v, open: false });
          }}
        />
      )}
    </>
  );
}
