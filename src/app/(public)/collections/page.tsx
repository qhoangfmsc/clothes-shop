import type { Metadata } from "next";
import HeaderNav from "@/src/app/_components/HeaderNav";
import ShopFooter from "../shop/_components/ShopFooter";
import CollectionsClient from "./_components/CollectionsClient";
import "./collections.css";
import "../shop/shop.css";

export const metadata: Metadata = {
  title: "Collections — Ori Baebi",
  description:
    "Explore the Ori Baebi collections. Curated seasonal edits and signature styles — each collection a chapter in the Ori Baebi narrative.",
};

export default function CollectionsPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <HeaderNav />
      <CollectionsClient />
      <ShopFooter />
    </main>
  );
}
