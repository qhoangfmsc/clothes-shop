"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toMediaUrl } from "@/src/lib/media-url";

/* The lightbox library is only fetched when a photo is opened */
const ReviewImageViewer = dynamic(() => import("./ReviewImageViewer"), { ssr: false });

interface ReviewImageGridProps {
  /** URLs as the BE sent them; shown through the `/media` proxy */
  images: string[];
  className?: string;
}

/** Thumbnails of a review's photos; tap or click one to open the full-screen viewer. Renders nothing without photos. */
export default function ReviewImageGrid({ images, className = "" }: ReviewImageGridProps) {
  const t = useTranslations("shared.reviews.images");
  const [viewer, setViewer] = useState<{ open: boolean; index: number } | null>(null);
  if (images.length === 0) return null;

  const urls = images.map((url) => toMediaUrl(url));

  return (
    <>
      <ul className={`m-0 p-0 list-none flex flex-wrap gap-2 ${className}`}>
        {urls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <button
              type="button"
              onClick={() => setViewer({ open: true, index: i })}
              aria-label={t("open", { index: i + 1, count: urls.length })}
              className="block size-16 sm:size-20 overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0 cursor-pointer transition-opacity hover:opacity-80 motion-reduce:transition-none pointer-coarse:size-[72px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- review photos are small user uploads served through /media */}
              <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {viewer && (
        <ReviewImageViewer
          images={urls}
          index={viewer.index}
          open={viewer.open}
          onView={(index) => setViewer((v) => (v ? { ...v, index } : v))}
          onClose={() => setViewer((v) => (v ? { ...v, open: false } : v))}
        />
      )}
    </>
  );
}
