"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/* ═══════════════════════════════ Info hint ═══════════════════════════════
   Small "i" icon that reveals a short explanation, so forms stay simple to read
   without long inline captions under every field. Mouse: hover. Keyboard: focus.
   Touch: tap to open, tap anywhere else to close. The bubble is nudged so it never
   leaves the screen, whatever the field's position. */

const HINT_EDGE_PX = 8;

export function InfoHint({ text, size = 13 }: { text: string; /** Icon size in px; from 16 up the touch hit area is a full 44 px (headings), smaller ones stay 24 px (form labels) */ size?: number }) {
  const [open, setOpen] = useState(false);
  const pointerRef = useRef<string>("mouse");
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  /* Keep the bubble inside the viewport (it is centred on the icon by default) */
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || !bubble) return;
    bubble.style.translate = "0px";
    const { left, right } = bubble.getBoundingClientRect();
    const max = document.documentElement.clientWidth - HINT_EDGE_PX;
    const shift = left < HINT_EDGE_PX ? HINT_EDGE_PX - left : right > max ? max - right : 0;
    bubble.style.translate = `${shift}px`;
  }, [open]);

  /* Touch: a tap outside closes the bubble */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={`flex items-center justify-center border-0 bg-transparent p-0 text-[var(--text-disabled)] cursor-help ${size >= 16 ? "w-5 h-5 pointer-coarse:w-11 pointer-coarse:h-11 pointer-coarse:-m-3" : "w-3.5 h-3.5 pointer-coarse:w-6 pointer-coarse:h-6 pointer-coarse:-m-1.5"}`}
        onPointerDown={(e) => {
          pointerRef.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        /* Keyboard focus opens it; a touch tap also focuses the button, but its click is what toggles it (otherwise the focus would open it and the click close it at once) */
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          if (pointerRef.current !== "mouse") setOpen((o) => !o);
        }}
        aria-label={text}
        aria-expanded={open}
      >
        <Info size={size} />
      </button>
      {open && (
        <span
          ref={bubbleRef}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-56 whitespace-normal rounded-md bg-[var(--text-heading)] px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg text-center z-20"
        >
          {text}
        </span>
      )}
    </span>
  );
}
