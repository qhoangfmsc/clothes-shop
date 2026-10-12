"use client";

import type { MouseEvent, ReactNode } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { buildOrderInquiryHref, getPurchaseMode } from "@/src/lib/product-purchase";
import type { Product } from "@/src/types/product";

interface ProductBagButtonProps {
  product: Pick<Product, "id" | "badge">;
  /** `icon` = round icon-only button, `text` = icon + label. */
  variant: "icon" | "text";
  /** Runs for a normal product (opens quick add). Never runs for sold-out / custom-order products. */
  onAddToBag: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Layout / colours, always applied. */
  className: string;
  /** Hover / active effects, applied only while the button can be used. */
  enabledClassName?: string;
  iconSize?: number;
}

/** The bag button of a product card, by badge: `sold_out` → disabled "Sold out",
 *  `custom_order` → "Order" button to the contact page, anything else → add to bag.
 *  Rendered inside a card `<Link>`, so every click stops the link from navigating. */
export default function ProductBagButton({
  product,
  variant,
  onAddToBag,
  className,
  enabledClassName = "",
  iconSize = 16,
}: ProductBagButtonProps) {
  const t = useTranslations("shared.cart.productAction");
  const router = useRouter();
  const mode = getPurchaseMode(product.badge);
  const soldOut = mode === "soldOut";

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (mode === "cart") return onAddToBag(e);
    e.preventDefault();
    e.stopPropagation();
    if (mode === "customOrder") router.push(buildOrderInquiryHref(product.id));
  };

  const Icon = mode === "customOrder" ? MessageCircle : ShoppingBag;
  const label: ReactNode =
    mode === "soldOut" ? t("soldOut") : mode === "customOrder" ? t("customOrder") : t("addToBag");
  const ariaLabel =
    mode === "soldOut"
      ? t("soldOutAria")
      : mode === "customOrder"
        ? t("customOrderAria")
        : t("addToBagAria");

  return (
    <button
      type="button"
      className={`${className} ${soldOut ? "!cursor-not-allowed opacity-50" : enabledClassName}`}
      onClick={handleClick}
      disabled={soldOut}
      aria-label={variant === "icon" ? ariaLabel : undefined}
    >
      <Icon size={iconSize} />
      {variant === "text" && label}
    </button>
  );
}
