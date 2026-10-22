import type { ReactNode } from "react";
import { Link } from "@/src/i18n/navigation";
import { productPath } from "@/src/lib/product-url";

interface ProductLinkProps {
  /** The `ProductSummary` / `Product` of an order line or review; `null` once the product was deleted */
  product: { id: string; category?: { slug: string } | null; subcategory?: { slug: string } | null } | null | undefined;
  /** Open the product in a new tab: for places where leaving would lose work (an open form, the admin panel) */
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}

/** Link to a product's storefront page from its own category / sub-category slugs. Without them (deleted product, `category: null`)
 *  the children render in a plain `<span>`. */
export default function ProductLink({ product, newTab = false, className, children }: ProductLinkProps) {
  const href = product ? productPath(product) : null;
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link
      href={href}
      className={className}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Link>
  );
}
