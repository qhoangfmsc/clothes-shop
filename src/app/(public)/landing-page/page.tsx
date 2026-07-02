"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CustomCursor from "@/src/app/_components/CustomCursor";
import Logo from "@/src/app/_components/Logo";
import HeaderNav from "@/src/app/_components/HeaderNav";
import Footer from "@/src/app/_components/Footer";
import Caption from "./_components/Caption";
import ProductInfo from "./_components/ProductInfo";
import ViewButton from "./_components/ViewButton";

import VideoContainer from "./_components/VideoContainer";
import OutroSection from "./_components/OutroSection";
import CollectionShowcase from "./_components/CollectionShowcase";
import { SYMBOLS } from "./_common/constants";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  /* ── GSAP: slide black panel up during first 100vh ── */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panel,
        { y: "100vh" },
        {
          y: "0vh",
          ease: "none",
          scrollTrigger: {
            trigger: spacerRef.current,
            start: "top top",
            end: "100vh top",
            scrub: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  /* ── RAF loop: card scaling, panel offset, outro ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    const panel = panelRef.current;
    const spacer = spacerRef.current;
    if (!wrap || !panel || !spacer) return;

    let rafId: number;
    let maxScroll = 0;

    const recalc = () => {
      const vh = window.innerHeight;
      const wrapH = wrap.scrollHeight;
      maxScroll = Math.max(0, wrapH - vh);
      spacer.style.height = `${vh + maxScroll + 3 * vh}px`;
    };

    recalc();
    window.addEventListener("resize", recalc);

    const outroOverlay = document.getElementById("outro-overlay");
    const outroInfo = document.getElementById("outro-info");
    const outroBuy = document.getElementById("outro-buy");
    const outroFooter = document.getElementById("outro-footer");
    const mainCanvas = document.getElementById("main-canvas");
    const circleSymbol = document.getElementById("circle-symbol");
    let lastSymbolTime = 0;

    const tick = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      /* symbol randomizer (throttled 80ms) */
      const now = performance.now();
      if (circleSymbol && now - lastSymbolTime > 80) {
        circleSymbol.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        lastSymbolTime = now;
      }

      /* hide videos after first vh */
      if (mainCanvas) {
        mainCanvas.style.visibility = scrollY > vh ? "hidden" : "visible";
      }

      /* Phase 2: scroll inner wrapper */
      if (scrollY > vh) {
        wrap.style.transform = `translateY(${-(scrollY - vh)}px)`;
      } else {
        wrap.style.transform = "translateY(0)";
      }

      /* Card fade in/out */
      const cards = panel.querySelectorAll<HTMLElement>(".collection-card");

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const top = rect.top;
        const bottom = rect.bottom;

        if (bottom <= 0 || top >= vh) {
          card.style.opacity = "0";
          return;
        }

        /* Fade in over 30% of viewport from bottom edge */
        const enter = Math.max(0, Math.min(1, (vh - top) / (vh * 0.3)));
        /* Fade out over 20% of viewport at the top */
        const exit = Math.max(0, Math.min(1, bottom / (vh * 0.2)));

        const opacity = Math.min(enter, exit);
        card.style.opacity = String(opacity);
      });

      /* Outro phase */
      const outroStart = vh + maxScroll;
      if (scrollY > outroStart) {
        const progress = Math.min(1, (scrollY - outroStart) / (vh - 100));

        if (outroOverlay) outroOverlay.style.opacity = String(progress);

        if (outroInfo) {
          const offset = outroInfo.dataset.outroOffset
            ? Number(outroInfo.dataset.outroOffset)
            : 160;
          outroInfo.style.transform = `translateY(${-(offset - 80) * progress}px)`;
        }

        if (outroBuy) {
          outroBuy.style.transform = `scale(${progress})`;
        }

        if (outroFooter) outroFooter.style.opacity = String(progress);
      } else {
        if (outroOverlay) outroOverlay.style.opacity = "0";
        if (outroInfo) outroInfo.style.transform = "translateY(0)";
        if (outroBuy) outroBuy.style.transform = "scale(0)";

        if (outroFooter) outroFooter.style.opacity = "0";
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", recalc);
    };
  }, []);

  return (
    <div
      id="scroll-spacer"
      ref={spacerRef}
      style={{
        position: "relative",
        userSelect: "none",
        background: "var(--bg-primary)",
        height: "500vh",
        cursor: isTouch ? "default" : "none",
      }}
    >
      {/* Custom Cursor */}
      {!isTouch && <CustomCursor />}

      {/* Logo */}
      <Logo />

      {/* Caption */}
      <Caption />

      {/* Header Nav */}
      <HeaderNav />

      {/* Product Info */}
      <ProductInfo />

      {/* View Button */}
      <ViewButton />

      {/* Video Background */}
      <VideoContainer isTouch={isTouch} />

      {/* Outro Section (CTA + Contact) */}
      <OutroSection />

      {/* Footer */}
      <Footer />

      {/* Collection Showcase (Gallery) */}
      <CollectionShowcase panelRef={panelRef} wrapRef={wrapRef} />
    </div>
  );
}
