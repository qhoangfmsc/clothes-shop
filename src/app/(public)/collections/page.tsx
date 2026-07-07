import type { Metadata } from "next";
import HeaderNav from "@/src/app/_components/HeaderNav";

import CollectionsClient from "./_components/CollectionsClient";
import { getCollections } from "../shop/_lib/server-fetchers";
import "./collections.css";
import "../shop/shop.css";

export const metadata: Metadata = {
  title: "Collections — Ori Baebi",
  description:
    "Explore the Ori Baebi collections. Curated seasonal edits and signature styles — each collection a chapter in the Ori Baebi narrative.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main style={{ minHeight: "100vh" }}>
      <HeaderNav />
      <CollectionsClient collections={collections} />
    </main>
  );
}
