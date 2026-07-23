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
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(10, 10, 8, 0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          {/* Modal — centered on desktop, bottom sheet on mobile */}
          <motion.div
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
            onClick={(e) => e.stopPropagation()}
            style={isMobile ? {
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "90vh",
              background: "var(--bg-primary)",
              borderRadius: "12px 12px 0 0",
              boxShadow: "0 -8px 40px rgba(58, 49, 42, 0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            } : {
              width: "100%",
              maxWidth: 640,
              maxHeight: "85vh",
              background: "var(--bg-primary)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(10, 10, 8, 0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Handle bar (mobile bottom-sheet feel) */}
            <div className="flex justify-center py-2.5 sm:hidden">
              <span className="w-9 h-1 rounded-sm" style={{ background: "var(--border-medium)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b sm:px-6 sm:py-5 shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
              <h2
                className="m-0"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(20px, 3vw, 26px)",
                  fontWeight: 400,
                  color: "var(--text-heading)",
                  letterSpacing: "-0.04em",
                  lineHeight: "110%",
                }}
              >
                {sizeGuide?.title ?? "Size Guide"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="w-9 h-9 rounded-full border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-all duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                  e.currentTarget.style.color = "var(--text-heading)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-6" style={{ overscrollBehavior: "contain" }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span
                    className="font-primary text-sm"
                    style={{ color: "var(--text-muted)", letterSpacing: "-0.02em" }}
                  >
                    Loading size guide…
                  </span>
                </div>
              ) : sizeGuide ? (
                <>
                  <p
                    className="font-primary text-sm font-medium leading-[160%] tracking-[-0.02em] m-0 mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {sizeGuide.description}
                  </p>

                  {/* Unit badge */}
                  <span
                    className="inline-block px-3 py-1.5 rounded-full font-primary text-xs font-medium tracking-[0.06em] uppercase mb-5"
                    style={{
                      color: "var(--text-muted)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    Measurements in {sizeGuide.unit}
                  </span>

                  {/* Table */}
                  <div className="overflow-x-auto -mx-1 mb-6 rounded-md border" style={{ borderColor: "var(--border-subtle)" }}>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontFamily: "var(--font-primary)",
                      fontSize: 13,
                    }}>
                      <thead>
                        <tr>
                          {sizeGuide.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3.5 py-3 text-left font-primary text-xs font-medium tracking-[0.06em] uppercase border-b"
                              style={{
                                color: "var(--text-muted)",
                                background: "var(--bg-section-2)",
                                borderColor: "var(--border-subtle)",
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b last:border-b-0"
                            style={{
                              background: idx % 2 === 0 ? "var(--bg-primary)" : "var(--bg-section-1)",
                              borderColor: "var(--border-subtle)",
                            }}
                          >
                            {sizeGuide.columns.map((col) => (
                              <td
                                key={col}
                                className="px-3.5 py-3 font-primary text-sm font-medium tracking-[-0.02em]"
                                style={{ color: "var(--text-primary)" }}
                              >
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
                    <div
                      className="rounded-md p-4 sm:p-5"
                      style={{ background: "var(--bg-section-1)" }}
                    >
                      <span
                        className="block font-primary text-xs font-medium tracking-[0.06em] uppercase mb-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Fit Tips
                      </span>
                      <ul className="m-0 pl-4 flex flex-col gap-2">
                        {sizeGuide.tips.map((tip, idx) => (
                          <li
                            key={idx}
                            className="font-primary text-[13px] font-medium leading-[160%] tracking-[-0.02em]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p
                  className="font-primary text-sm font-medium text-center py-10 m-0 tracking-[-0.02em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Size guide not available for this category.
                </p>
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
