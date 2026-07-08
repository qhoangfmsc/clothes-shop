"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/src/store/cart";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function CartFAB() {
  const totalItems = useCartStore((s) => s.totalItems());
  const [mounted, setMounted] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Bounce on count change */
  useEffect(() => {
    if (totalItems > 0) {
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 600);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ duration: 0.4, ease: [...ease] }}
          className="cart-fab"
        >
          <Link href="/cart" className="cart-fab__link" aria-label={`View bag (${totalItems} items)`}>
            <motion.div
              animate={justUpdated ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.4, ease: [...ease] }}
              className="cart-fab__icon-wrap"
            >
              <ShoppingBag size={20} />
            </motion.div>
            <span className="cart-fab__badge">{totalItems}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
