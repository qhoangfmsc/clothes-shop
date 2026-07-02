import type { Metadata } from "next";
import HeaderNav from "@/src/app/_components/HeaderNav";
import InvitationHero from "./_components/InvitationHero";
import BrandStory from "./_components/BrandStory";
import ServicesSection from "./_components/ServicesSection";
import ContactCTA from "./_components/ContactCTA";

export const metadata: Metadata = {
  title: "About — Ori Baebi",
  description:
    "Discover the story behind Ori Baebi. Where heritage artisanship meets avant-garde vision — luxury bags, apparel & accessories made with intention.",
};

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <HeaderNav />

      {/* Section 1: Hero — mood wallpaper + text */}
      <InvitationHero />

      {/* Section 2: Brand Story — clean editorial text */}
      <BrandStory />

      {/* Section 3: Services — pastel cards */}
      <ServicesSection />

      {/* Section 4: Contact CTA */}
      <ContactCTA />
    </main>
  );
}
