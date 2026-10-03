"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   IMAGE PREVIEW LIGHTBOX — shared full-screen image review

   Portaled to <body> so it isn't clipped by whatever modal or
   scroll container it's opened from. Callers supply the actual
   image element as `children` (plain <img> for public URLs,
   <AuthedImage> for routes that need an Authorization header) —
   this component only owns the overlay chrome.

   Usage:
     <ImagePreviewLightbox open={open} onClose={() => setOpen(false)} caption="...">
       <img src={url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-md" />
     </ImagePreviewLightbox>
   ═══════════════════════════════════════════════════════════ */

export function ImagePreviewLightbox({
  open,
  onClose,
  caption,
  children,
}: {
  open: boolean;
  onClose: () => void;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-200 p-8"
      onClick={onClose}
    >
      <button
        className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border-0 text-white cursor-pointer"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] flex flex-col gap-3 items-center"
      >
        {children}
        {caption && (
          <div className="flex items-center gap-4 text-sm text-white/80 font-primary">
            {caption}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
