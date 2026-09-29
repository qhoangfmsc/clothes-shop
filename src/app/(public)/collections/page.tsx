import type { Metadata } from "next";


import CollectionsClient from "./_components/CollectionsClient";
import { getCollections } from "../shop/_lib/server-fetchers";

export const metadata: Metadata = {
  title: "Collections — DOOVAN",
  description:
    "Explore the DOOVAN collections. Curated seasonal edits and signature styles — each collection a chapter in the DOOVAN narrative.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main style={{ minHeight: "100vh" }}>

      <CollectionsClient collections={collections} />
    </main>
  );
}
