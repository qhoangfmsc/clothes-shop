"use client";

import { useState, useCallback } from "react";
import { Truck, Zap, Home, ChevronDown, Check } from "lucide-react";
import { useShipping } from "@/src/hooks/use-api";

const ICON_MAP = {
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
    <div className="pdp-shipping">
      <button
        type="button"
        className={`pdp-shipping__trigger ${isOpen ? "pdp-shipping__trigger--open" : ""}`}
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <span className="pdp-shipping__trigger-label">Shipping & Returns</span>
        <ChevronDown className="pdp-shipping__chevron" size={14} />
      </button>

      {isOpen && (
        <div className="pdp-shipping__content">
          {/* Free shipping note */}
          <div className="pdp-shipping__free-note">
            <Check size={14} />
            Free shipping on orders over ${shipping.freeShippingThreshold}
          </div>

          {/* Methods */}
          <div className="pdp-shipping__methods">
            {shipping.methods.map((method) => {
              const Icon = ICON_MAP[method.icon];
              return (
                <div key={method.id} className="pdp-shipping__method">
                  <div className="pdp-shipping__method-icon">
                    <Icon />
                  </div>
                  <div className="pdp-shipping__method-info">
                    <span className="pdp-shipping__method-name">{method.name}</span>
                    <span className="pdp-shipping__method-desc">{method.description}</span>
                  </div>
                  <div className="pdp-shipping__method-meta">
                    <span className="pdp-shipping__method-days">{method.estimatedDays}</span>
                    <span className="pdp-shipping__method-price">
                      {method.price === 0 ? "Free" : `$${method.price}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Return policy */}
          <div className="pdp-shipping__returns">
            <span className="pdp-shipping__returns-label">Returns</span>
            <p className="pdp-shipping__returns-desc">{shipping.returnPolicy.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
