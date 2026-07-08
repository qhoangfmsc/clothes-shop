import SiteHeader from "@/src/app/_components/SiteHeader";
import SiteFooter from "@/src/app/_components/SiteFooter";

export const metadata = {
  title: "My Wishlist — Ori Baebi",
  description: "View and manage your saved items from Ori Baebi.",
};

export default function WishlistLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
