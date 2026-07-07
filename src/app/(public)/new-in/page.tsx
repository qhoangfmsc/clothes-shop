import type { Metadata } from "next";
import HeaderNav from "@/src/app/_components/HeaderNav";

import NewInClient from "./_components/NewInClient";
import { getNewInProducts } from "../shop/_lib/server-fetchers";
import "./new-in.css";
import "../shop/shop.css";

export const metadata: Metadata = {
  title: "New In — Ori Baebi",
  description:
    "Discover the latest arrivals at Ori Baebi. Fresh drops, new silhouettes, and pieces designed for those who move first.",
};

export default async function NewInPage() {
  const newProducts = await getNewInProducts();

  return (
    <main style={{ minHeight: "100vh" }}>
      <HeaderNav />
      <NewInClient products={newProducts} />
    </main>
  );
}
