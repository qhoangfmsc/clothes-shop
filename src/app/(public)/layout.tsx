import SiteFooter from "../_components/SiteFooter";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
