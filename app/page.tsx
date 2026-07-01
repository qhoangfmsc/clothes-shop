"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CustomCursor from "./components/CustomCursor";
import Logo from "./components/Logo";
import Caption from "./components/Caption";
import HeaderNav from "./components/HeaderNav";
import ProductInfo from "./components/ProductInfo";
import ViewButton from "./components/ViewButton";
import VideoContainer from "./components/VideoContainer";
import WhiteOverlay from "./components/WhiteOverlay";
import Footer from "./components/Footer";
import BlackPanel from "./components/BlackPanel";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
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
      spacer.style.height = `${vh + maxScroll + 2 * vh}px`;
    };

    recalc();
    window.addEventListener("resize", recalc);

    const outroOverlay = document.getElementById("outro-overlay");
    const outroInfo = document.getElementById("outro-info");
    const outroBuy = document.getElementById("outro-buy");
    const outroFooter = document.getElementById("outro-footer");
    const mainCanvas = document.getElementById("main-canvas");
    const circleSymbol = document.getElementById("circle-symbol");
    const symbols = ["8", "$", "^^", "%", "/"];
    let lastSymbolTime = 0;

    const tick = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      /* symbol randomizer (throttled 80ms) */
      const now = performance.now();
      if (circleSymbol && now - lastSymbolTime > 80) {
        circleSymbol.textContent =
          symbols[Math.floor(Math.random() * symbols.length)];
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

      /* Card scaling */
      const cards = panel.querySelectorAll<HTMLElement>(".bp-card");
      const panelOffset = scrollY <= vh ? vh - scrollY : 0;
      const phase2Offset = scrollY > vh ? -(scrollY - vh) : 0;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        let top = rect.top;
        let bottom = rect.bottom;

        if (scrollY <= vh) {
          top += panelOffset;
          bottom += panelOffset;
        }

        if (bottom <= 0 || top >= vh) {
          card.style.transform = "scale(0)";
          return;
        }

        const enter = Math.min(1, (vh - top) / (vh * 0.6));
        const exit = Math.min(1, bottom / (vh * 0.4));
        const scale = Math.max(0, Math.min(enter, exit));
        card.style.transform = `scale(${scale})`;
      });

      /* Outro phase */
      const outroStart = vh + maxScroll;
      if (scrollY > outroStart) {
        const progress = Math.min(
          1,
          (scrollY - outroStart) / (vh - 100)
        );

        if (outroOverlay) outroOverlay.style.opacity = String(progress);

        if (outroInfo) {
          const offset = outroInfo.dataset.outroOffset
            ? Number(outroInfo.dataset.outroOffset)
            : 166;
          outroInfo.style.transform = `translateY(${-offset * progress}px)`;
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
        background: "white",
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

      {/* White Overlay */}
      <WhiteOverlay />

      {/* Footer */}
      <Footer />

      {/* Black Panel (Gallery) */}
      <BlackPanel panelRef={panelRef} wrapRef={wrapRef} />
    </div>
  );
}
