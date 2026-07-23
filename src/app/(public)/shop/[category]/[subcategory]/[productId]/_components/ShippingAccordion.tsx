"use client";

import { useState, useCallback } from "react";
import { Truck, Zap, Home, ChevronDown, Check } from "lucide-react";
import { useShipping } from "@/src/hooks/use-api";

const ICON_MAP: Record<string, () => JSX.Element> = {
  truck: () => <Truck size={18} />,
  express: () => <Zap size={18} />,
  store: () => <Home size={18} />,
};

export default function ShippingAccordion() {
  const { shipping, isLoading } = useShipping();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  if (isLoading || !shipping) return null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex justify-between items-center w-full py-4 border-t border-[var(--border-subtle)] bg-transparent cursor-pointer rounded-none"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
          Shipping & Returns
        </span>
        <ChevronDown
          size={14}
          className="text-[var(--text-muted)] transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 pb-5">
          {/* Free shipping note */}
          <div className="flex items-center gap-2 font-primary text-xs font-medium text-[var(--color-deep-gold)] tracking-[-0.02em] bg-[rgba(201,169,110,0.08)] rounded-md px-3 py-2.5">
            <Check size={14} />
            Free shipping on orders over ${shipping.freeShippingThreshold}
          </div>

          {/* Shipping methods */}
          <div className="flex flex-col gap-3">
            {shipping.methods.map((method) => {
              const Icon = ICON_MAP[method.icon];
              return (
                <div
                  key={method.id}
                  className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] px-3.5 py-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] shrink-0">
                    {Icon ? <Icon /> : <Truck size={18} />}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                      {method.name}
                    </span>
                    <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                      {method.description}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-primary text-xs font-medium text-[var(--text-secondary)] tracking-[-0.02em]">
                      {method.estimatedDays}
                    </span>
                    <span className="font-primary text-xs font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                      {method.price === 0 ? "Free" : `$${method.price}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Return policy */}
          <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-4">
            <span className="font-primary text-xs font-medium text-[var(--text-muted)] tracking-[0.06em] uppercase">
              Returns
            </span>
            <p className="font-primary text-[13px] font-medium text-[var(--text-secondary)] tracking-[-0.02em] leading-[160%] m-0">
              {shipping.returnPolicy.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
