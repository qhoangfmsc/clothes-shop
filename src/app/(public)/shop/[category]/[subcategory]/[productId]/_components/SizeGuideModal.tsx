"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSizeGuide } from "@/src/hooks/use-api";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface SizeGuideModalProps {
  category: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ category, isOpen, onClose }: SizeGuideModalProps) {
  const { sizeGuide, isLoading } = useSizeGuide(isOpen ? category : null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* SSR-safe mount + breakpoint check */
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* Close on Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  /* Build table column keys from the SizeGuideRow type */
  const getRowValue = (row: Record<string, string | undefined>, col: string): string => {
    const key = col.toLowerCase().replace(/\s+/g, "");
    /* Map common column names to row keys */
    const mapping: Record<string, string> = {
      size: "size", style: "size", ringsize: "size",
      bust: "bust", waist: "waist", hips: "hips",
      length: "length", width: "width", height: "height",
      depth: "depth", circumference: "circumference",
    };
    return row[mapping[key] ?? key] ?? "—";
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sg-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          {/* Modal — centered on desktop, bottom sheet on mobile */}
          <motion.div
            className="sg-modal"
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: isMobile ? 0.4 : 0.5, 
              ease: isMobile ? [0.32, 0.72, 0, 1] : [...ease] 
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Size Guide"
            onClick={(e) => e.stopPropagation()} /* Prevent closing when clicking inside the modal */
          >
            {/* Handle bar (mobile bottom-sheet feel) */}
            <div className="sg-modal__handle">
              <span className="sg-modal__handle-bar" />
            </div>

            {/* Header */}
            <div className="sg-modal__header">
              <h2 className="sg-modal__title">
                {sizeGuide?.title ?? "Size Guide"}
              </h2>
              <button
                type="button"
                className="sg-modal__close"
                onClick={onClose}
                aria-label="Close size guide"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="sg-modal__body">
              {isLoading ? (
                <div className="sg-modal__loading">
                  <span>Loading size guide…</span>
                </div>
              ) : sizeGuide ? (
                <>
                  <p className="sg-modal__description">{sizeGuide.description}</p>

                  {/* Unit badge */}
                  <span className="sg-modal__unit">
                    Measurements in {sizeGuide.unit}
                  </span>

                  {/* Table */}
                  <div className="sg-modal__table-wrap">
                    <table className="sg-modal__table">
                      <thead>
                        <tr>
                          {sizeGuide.columns.map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.rows.map((row, idx) => (
                          <tr key={idx}>
                            {sizeGuide.columns.map((col) => (
                              <td key={col}>
                                {getRowValue(row as unknown as Record<string, string | undefined>, col)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tips */}
                  {sizeGuide.tips.length > 0 && (
                    <div className="sg-modal__tips">
                      <span className="sg-modal__tips-label">Fit Tips</span>
                      <ul>
                        {sizeGuide.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="sg-modal__empty">Size guide not available for this category.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* Portal to body to escape any parent transform context */
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
