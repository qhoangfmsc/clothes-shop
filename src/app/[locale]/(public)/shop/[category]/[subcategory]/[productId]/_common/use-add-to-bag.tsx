import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { addItem, syncAddToCartItem } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useAppDispatch } from "@/src/store/hooks";
import { moneyProp, trackEvent } from "@/src/lib/analytics";
import { moneyOf } from "@/src/lib/money";
import { getPurchaseMode } from "@/src/lib/product-purchase";
import type { Product } from "@/src/types/product";
import type { ProductSelection } from "./use-product-selection";

/** Puts the chosen size / colour / quantity in the bag (after sign-in), syncs it with the BE and flags `addedToCart` for 2.2 s. */
export function useAddToBag(product: Product, selection: ProductSelection) {
  const t = useTranslations("public.product.detail");
  const locale = useLocale();
  const { toast } = useToast();
  const toErrorMessage = useErrorMessage();
  const dispatch = useAppDispatch();
  const { requireAuth } = useAuthAction();
  const [addedToCart, setAddedToCart] = useState(false);
  const { size: selectedSize, color: selectedColor, quantity, isComplete: isSelectionComplete } = selection;
  const purchaseMode = getPurchaseMode(product.badge);

  const addToBag = useCallback(() => {
    if (purchaseMode !== "cart" || addedToCart || !isSelectionComplete) return;
    requireAuth(() => {
      const colorName = product.colors.find((c) => c.hex === selectedColor)?.name ?? "";
      dispatch(
        addItem(
          {
            productId: product.id,
            name: product.name,
            priceVnd: product.priceVnd,
            priceUsd: product.priceUsd,
            image: product.images[0],
            size: selectedSize!,
            color: colorName,
            colorHex: selectedColor!,
            category: product.category?.slug ?? "",
            subcategory: product.subcategory?.slug ?? "",
            badge: product.badge,
          },
          quantity
        )
      );
      /* API sync in background; if the BE refuses, the line is taken back out of the bag and the shopper is told */
      dispatch(syncAddToCartItem({ productId: product.id, size: selectedSize!, color: colorName, quantity }))
        .unwrap()
        .catch((err: unknown) => toast.error(toErrorMessage(err, t("addFailed"))));
      /* Unit price: the BE prices the line only once the add is answered */
      trackEvent("add_to_cart", {
        productId: product.id,
        ...moneyProp(moneyOf(product, "price"), locale),
      });
      setAddedToCart(true);
      toast.success(
        t.rich("toastAdded", {
          name: product.name,
          details: `${selectedSize}, ${colorName}${quantity > 1 ? `, ×${quantity}` : ""}`,
          link: (chunks) => <Link href="/cart">{chunks}</Link>,
        })
      );
      setTimeout(() => setAddedToCart(false), 2200);
    }, "addToBag");
  }, [
    purchaseMode,
    addedToCart,
    isSelectionComplete,
    requireAuth,
    dispatch,
    product,
    selectedSize,
    selectedColor,
    quantity,
    toast,
    toErrorMessage,
    locale,
    t,
  ]);

  return { addedToCart, addToBag };
}
