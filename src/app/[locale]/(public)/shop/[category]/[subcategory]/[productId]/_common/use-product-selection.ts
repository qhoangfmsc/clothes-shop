import { useState } from "react";

/** What the shopper has picked on a product page: size, colour (its hex) and quantity 1-10. */
export function useProductSelection() {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  return { size, color, quantity, setSize, setColor, setQuantity, isComplete: size !== null && color !== null };
}

export type ProductSelection = ReturnType<typeof useProductSelection>;
