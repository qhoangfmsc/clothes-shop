import SiteHeader from "@/src/app/_components/SiteHeader";
import SiteFooter from "@/src/app/_components/SiteFooter";

export const metadata = {
  title: "Shopping Bag — Ori Baebi",
  description: "Review your shopping bag and proceed to checkout.",
};

export default function CartLayout({
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
