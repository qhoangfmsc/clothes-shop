import SiteHeader from "@/src/app/_components/SiteHeader";

export const metadata = {
  title: "Checkout — DOOVAN",
  description: "Complete your order from DOOVAN.",
};

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
