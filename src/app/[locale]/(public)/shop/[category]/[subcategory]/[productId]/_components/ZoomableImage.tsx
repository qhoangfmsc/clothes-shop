"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";

/** How much the photo is magnified while the mouse is over it. */
const ZOOM_SCALE = 2;
/** The mouse must rest this long on the photo before it zooms, so sweeping across it doesn't trigger a zoom. */
const ZOOM_INTENT_MS = 150;

interface ZoomableImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  /** Click / tap asks the parent to open the photo in the full-screen viewer (pinch, pan, zoom bar). */
  onOpen?: () => void;
}

/**
 * Photo that magnifies under a mouse cursor and follows it for close inspection.
 * The hover zoom is for mouse / pen only (touch keeps native swipe); a click or tap on any device opens the
 * full-screen viewer (`onOpen`). Pressing to drag the gallery drops the hover zoom until the button is released.
 * A small magnifier badge tells visitors the photo can be inspected; the zoom starts after a short hover and eases in.
 * Fills its (relative) slide. The gallery's autoplay already holds while the mouse hovers it, so zooming needs no extra pause.
 */
export default function ZoomableImage({ src, alt, priority, onOpen }: ZoomableImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);
  const intentRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoomed, setZoomed] = useState(false);
  /* Once the visitor zooms, ask for a sharper source so 2.5× doesn't look soft */
  const [armed, setArmed] = useState(false);

  const cancelIntent = () => {
    if (intentRef.current) clearTimeout(intentRef.current);
    intentRef.current = null;
  };

  useEffect(() => cancelIntent, []);

  const setZoom = (next: boolean) => {
    cancelIntent();
    setZoomed(next);
    if (next) setArmed(true);
  };

  const follow = (e: ReactPointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame || e.pointerType === "touch") return;
    if (pressedRef.current) return;
    const rect = frame.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    frame.style.setProperty("--zoom-origin", `${x}% ${y}%`);
    if (!zoomed && !intentRef.current) intentRef.current = setTimeout(() => setZoom(true), ZOOM_INTENT_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    pressedRef.current = true;
    setZoom(false);
    const release = () => {
      pressedRef.current = false;
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 overflow-hidden [@media(pointer:fine)]:cursor-zoom-in"
      onPointerEnter={follow}
      onPointerMove={follow}
      onPointerLeave={() => setZoom(false)}
      onPointerDown={onPointerDown}
      onClick={onOpen}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={armed ? "(max-width: 1024px) 250vw, 140vw" : "(max-width: 1024px) 100vw, 55vw"}
        className="pointer-events-none transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{
          objectFit: "cover",
          transform: zoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
          transformOrigin: "var(--zoom-origin, 50% 50%)",
        }}
      />
      {/* Hint that the photo can be magnified; fades out once it is */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity duration-200 ${
          zoomed ? "opacity-0" : "opacity-100"
        }`}
      >
        <ZoomIn size={16} />
      </span>
    </div>
  );
}
