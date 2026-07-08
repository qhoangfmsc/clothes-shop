import SiteHeader from "@/src/app/_components/SiteHeader";
import SiteFooter from "@/src/app/_components/SiteFooter";

export const metadata = {
  title: "Order History — Ori Baebi",
  description: "View your order history and track deliveries from Ori Baebi.",
};

export default function OrdersLayout({
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
