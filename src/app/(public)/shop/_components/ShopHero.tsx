"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ShopHeroProps {
  label: string;
  title: string;
  description?: string;
  heroImage: string;
}

export default function ShopHero({
  label,
  title,
  description,
  heroImage,
}: ShopHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /* Entrance timeline */
      const tl = gsap.timeline({ delay: 0.15 });

      /* Hero image scale-in */
      const bgImg = el.querySelector(".shop-hero__bg img");
      if (bgImg) {
        tl.from(bgImg, { scale: 1.1, duration: 1.2, ease: "power2.out" });
      }

      /* Text reveals — staggered */
      const textEls = el.querySelectorAll(
        ".shop-hero__label, .shop-hero__title, .shop-hero__description"
      );
      gsap.set(textEls, { opacity: 0, y: 16 });
      tl.to(
        textEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
        },
        "-=0.5"
      );

      /* Parallax on scroll */
      if (bgImg) {
        gsap.to(bgImg, {
          y: "18%",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="shop-hero">
      {/* Background image */}
      <div className="shop-hero__bg">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Gradient overlay */}
      <div
        className="shop-hero__overlay"
        style={{
          background:
            "linear-gradient(to top, rgba(10, 10, 8, 0.85) 0%, rgba(10, 10, 8, 0.4) 50%, rgba(10, 10, 8, 0.2) 100%)",
        }}
      />

      {/* Content */}
      <div className="shop-hero__content">
        <span className="shop-hero__label">{label}</span>
        <h1 className="shop-hero__title">{title}</h1>
        {description && <p className="shop-hero__description">{description}</p>}
      </div>
    </section>
  );
}
