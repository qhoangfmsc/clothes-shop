"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const LEFT_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154433_532a85d3-dabf-4265-b8bd-19ac6af31842.mp4";
const RIGHT_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154401_a664f076-b971-4557-8728-40ef9ea4c49b.mp4";

interface VideoContainerProps {
  isTouch: boolean;
}

export default function VideoContainer({ isTouch }: VideoContainerProps) {
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const loadCountRef = useRef(0);
  const activeSideRef = useRef<"left" | "right">("right");
  const mouseXRef = useRef(0);

  const onVideoReady = useCallback(() => {
    loadCountRef.current++;
    if (loadCountRef.current >= 2) {
      setLoaded(true);
    }
  }, []);

  /* Desktop: cursor-driven video scrubbing */
  useEffect(() => {
    if (isTouch) return;

    const onMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
    };
    window.addEventListener("mousemove", onMove);

    let rafId: number;

    const tick = () => {
      const left = leftRef.current;
      const right = rightRef.current;
      const container = containerRef.current;
      if (!left || !right || !container) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const width = container.offsetWidth;
      const center = width / 2;
      const deadZone = Math.max(30, width * 0.05);
      const x = mouseXRef.current;

      if (Math.abs(x - center) <= deadZone) {
        /* In dead zone — hold at 0 */
        if (!left.seeking) left.currentTime = 0;
        if (!right.seeking) right.currentTime = 0;
      } else if (x < center - deadZone) {
        /* Cursor left of dead zone → show RIGHT video */
        activeSideRef.current = "right";
        left.style.display = "none";
        right.style.display = "block";

        const range = center - deadZone;
        const dist = center - deadZone - x;
        const progress = Math.max(0, Math.min(1, dist / range));
        if (right.duration && !right.seeking) {
          right.currentTime = progress * right.duration;
        }
      } else {
        /* Cursor right of dead zone → show LEFT video */
        activeSideRef.current = "left";
        right.style.display = "none";
        left.style.display = "block";

        const range = width - (center + deadZone);
        const dist = x - (center + deadZone);
        const progress = Math.max(0, Math.min(1, dist / range));
        if (left.duration && !left.seeking) {
          left.currentTime = progress * left.duration;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
    };
  }, [isTouch]);

  /* Mobile: auto-play alternating */
  useEffect(() => {
    if (!isTouch) return;

    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const onLeftEnd = () => {
      left.style.display = "none";
      right.style.display = "block";
      right.currentTime = 0;
      right.play().catch(() => {});
    };

    const onRightEnd = () => {
      right.style.display = "none";
      left.style.display = "block";
      left.currentTime = 0;
      left.play().catch(() => {});
    };

    left.addEventListener("ended", onLeftEnd);
    right.addEventListener("ended", onRightEnd);

    /* Start with left */
    left.style.display = "block";
    right.style.display = "none";
    left.play().catch(() => {});

    return () => {
      left.removeEventListener("ended", onLeftEnd);
      right.removeEventListener("ended", onRightEnd);
    };
  }, [isTouch]);

  return (
    <div
      id="main-canvas"
      ref={containerRef}
      style={{
        pointerEvents: "none",
        position: "fixed",
        overflow: "hidden",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.3s ease",
        zIndex: 0,
      }}
      className="inset-0 w-full h-full max-sm:top-[220px] max-sm:left-0 max-sm:w-screen max-sm:h-[calc(100vh-220px)]"
    >
      {/* Left video */}
      <video
        ref={leftRef}
        src={LEFT_VIDEO}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={onVideoReady}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "none",
        }}
      />

      {/* Right video */}
      <video
        ref={rightRef}
        src={RIGHT_VIDEO}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={onVideoReady}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}
