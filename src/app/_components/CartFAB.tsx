"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useAppSelector } from "@/src/store/hooks";
import { selectTotalItems } from "@/src/app/(private)/cart/_common/moduleSlice";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function CartFAB() {
  const totalItems = useAppSelector(selectTotalItems);
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
          className="fixed bottom-6 right-4 z-20 sm:bottom-8 sm:right-6"
        >
          <Link href="/cart" className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] no-underline shadow-[var(--shadow-gold-lg)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-gold-lg),0_4px_16px_rgba(201,169,110,0.3)] transition-all duration-150" aria-label={`View bag (${totalItems} items)`}>
            <motion.div
              animate={justUpdated ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.4, ease: [...ease] }}
              className="flex items-center justify-center"
            >
              <ShoppingBag size={20} />
            </motion.div>
            <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-[var(--color-deep-rose)] text-[var(--color-pearl-cream)] font-primary text-[11px] font-semibold tracking-[-0.02em] flex items-center justify-center px-1.5 border-2 border-[var(--bg-primary)]">{totalItems}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
