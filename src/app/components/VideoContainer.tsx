"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const LEFT_VIDEO = "/videos/model_rotate_left.mp4";
const RIGHT_VIDEO = "/videos/model_rotate_right.mp4";

/** Duration of the crossfade transition in ms */
const FADE_MS = 600;

interface VideoContainerProps {
  isTouch: boolean;
}

export default function VideoContainer({ isTouch }: VideoContainerProps) {
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const activeSideRef = useRef<"left" | "right">("right");
  const mouseXRef = useRef(0);

  const onVideoReady = useCallback(() => {
    if (!loaded) {
      setLoaded(true);
    }
  }, [loaded]);

  /* Fallback: show container after 2s even if videos haven't loaded */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loaded) setLoaded(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [loaded]);

  /* Desktop: cursor-driven video scrubbing */
  useEffect(() => {
    if (isTouch) return;

    /* Desktop uses display toggle for instant scrub response */
    const left = leftRef.current;
    const right = rightRef.current;
    if (left) {
      left.style.transition = "none";
      left.style.opacity = "1";
      left.style.display = "none";
    }
    if (right) {
      right.style.transition = "none";
      right.style.opacity = "1";
      right.style.display = "block";
    }

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

  /* Mobile/Tablet: auto-play alternating with crossfade */
  useEffect(() => {
    if (!isTouch) return;

    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* Setup: both videos visible (stacked), use opacity for transitions */
    const fadeDuration = prefersReduced ? 0 : FADE_MS;
    const easing = "cubic-bezier(0.25, 0.1, 0.25, 1)";
    const transitionValue = prefersReduced
      ? "none"
      : `opacity ${fadeDuration}ms ${easing}`;

    left.style.display = "block";
    right.style.display = "block";
    left.style.transition = transitionValue;
    right.style.transition = transitionValue;

    /* Start: left visible on top, right hidden behind */
    left.style.opacity = "1";
    left.style.zIndex = "2";
    right.style.opacity = "0";
    right.style.zIndex = "1";

    let fadeTimer: ReturnType<typeof setTimeout>;

    const crossfadeTo = (
      incoming: HTMLVideoElement,
      outgoing: HTMLVideoElement
    ) => {
      /* Prepare the incoming video behind the outgoing one */
      incoming.currentTime = 0;
      incoming.style.zIndex = "1";
      outgoing.style.zIndex = "2";

      /* Fade out the outgoing video to reveal incoming */
      incoming.style.opacity = "1";
      outgoing.style.opacity = "0";

      /* Start incoming playback slightly delayed so fade is visible */
      incoming.play().catch(() => {});

      /* After fade completes, reset z-index so incoming is on top */
      fadeTimer = setTimeout(() => {
        incoming.style.zIndex = "2";
        outgoing.style.zIndex = "1";
      }, fadeDuration);
    };

    const onLeftEnd = () => crossfadeTo(right, left);
    const onRightEnd = () => crossfadeTo(left, right);

    left.addEventListener("ended", onLeftEnd);
    right.addEventListener("ended", onRightEnd);

    /* Kick off autoplay with left video */
    left.play().catch(() => {});

    return () => {
      clearTimeout(fadeTimer);
      left.removeEventListener("ended", onLeftEnd);
      right.removeEventListener("ended", onRightEnd);
    };
  }, [isTouch]);

  /** Base styles shared by both video elements */
  const videoBaseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <div
      id="main-canvas"
      ref={containerRef}
      style={{
        pointerEvents: "none",
        position: "fixed",
        overflow: "hidden",
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        zIndex: 0,
      }}
      className="inset-0 w-full h-full max-sm:top-[220px] max-sm:left-0 max-sm:w-screen max-sm:h-[calc(100vh-220px)] bg-white"
    >
      {/* Left video */}
      <video
        ref={leftRef}
        src={LEFT_VIDEO}
        muted
        playsInline
        preload="auto"
        onLoadedData={onVideoReady}
        style={{
          ...videoBaseStyle,
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
        onLoadedData={onVideoReady}
        style={{
          ...videoBaseStyle,
          display: "block",
        }}
      />
    </div>
  );
}

