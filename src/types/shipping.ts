/* ── Shipping Types ── */

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  estimatedDays: string;
  price: number;
  freeAbove?: number;
  icon: "truck" | "express" | "store";
}

export interface ReturnPolicy {
  days: number;
  description: string;
  conditions: string[];
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  returnPolicy: ReturnPolicy;
  freeShippingThreshold: number;
  notes: string[];
}
