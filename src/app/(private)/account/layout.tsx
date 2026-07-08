import SiteHeader from "@/src/app/_components/SiteHeader";
import SiteFooter from "@/src/app/_components/SiteFooter";

export const metadata = {
  title: "My Account — Ori Baebi",
  description: "Manage your Ori Baebi account, wishlist, and order history.",
};

export default function AccountLayout({
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
