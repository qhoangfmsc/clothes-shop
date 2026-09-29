import type { Metadata } from "next";

import NewInClient from "./_components/NewInClient";
import { getNewInProducts } from "../shop/_lib/server-fetchers";

export const metadata: Metadata = {
  title: "New In — DOOVAN",
  description:
    "Discover the latest arrivals at DOOVAN. Fresh drops, new silhouettes, and pieces designed for those who move first.",
};

export default async function NewInPage() {
  const newProducts = await getNewInProducts();

  return (
    <main style={{ minHeight: "100vh" }}>
      <NewInClient products={newProducts} />
    </main>
  );
}
