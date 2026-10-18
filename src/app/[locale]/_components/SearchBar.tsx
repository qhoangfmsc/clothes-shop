"use client";

import { Fragment, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "@/src/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import { History, Search, X } from "lucide-react";
import { useAutocomplete, getProductUrl, type AutocompleteItem } from "@/src/hooks/use-api";
import { useBreakpoint } from "@/src/hooks/useMediaQuery";
import { useSearchHistory } from "./useSearchHistory";

/* Matches the max-width transition of the search container below */
const EXPAND_MS = 300;

export default function SearchBar() {
  const t = useTranslations("shared.header.search");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  /* True once the expand animation is done, so the dropdown measures the final input position */
  const [settled, setSettled] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /* More suggestions where there is room: 5 on phones, 8 on tablets, 10 on desktop */
  const { isMobile, isTablet } = useBreakpoint();
  const { results, isLoading, search, clear: clearAutocomplete } = useAutocomplete(
    isMobile ? 5 : isTablet ? 8 : 10
  );
  const { history, add: addToHistory, remove: removeFromHistory } = useSearchHistory();

  /* Google-style list: matching history first, then suggestions not already shown as history */
  const { items, historyCount } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const historyMatches = needle ? history.filter((h) => h.name.toLowerCase().includes(needle)) : history;
    const suggestions = results.filter((r) => !historyMatches.some((h) => h.id === r.id));
    return { items: [...historyMatches, ...suggestions], historyCount: historyMatches.length };
  }, [history, results, query]);

  useEffect(() => {
    if (!expanded) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), EXPAND_MS);
    return () => clearTimeout(timer);
  }, [expanded]);

  /* Focus input after expand transition starts */
  useEffect(() => {
    if (expanded && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  /* Close on Escape */
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        setQuery("");
        setHighlightIdx(-1);
        clearAutocomplete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, clearAutocomplete]);

  /* Close on click outside (if query empty, no results, or dropdown not hovered) */
  useEffect(() => {
    if (!expanded) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      // Close if dropdown exists — check for autocomplete portal
      const dropdown = document.getElementById("search-autocomplete-dropdown");
      if (dropdown?.contains(target)) return;
      if (!query.trim() && results.length === 0) {
        setExpanded(false);
        setHighlightIdx(-1);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [expanded, query, results.length]);

  /* Reset highlight when the list changes */
  useEffect(() => {
    setHighlightIdx(-1);
  }, [items]);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      search(value);
    },
    [search]
  );

  const navigateToProduct = useCallback(
    async (item: AutocompleteItem) => {
      addToHistory(item);
      setExpanded(false);
      setQuery("");
      setHighlightIdx(-1);
      clearAutocomplete();
      const url = await getProductUrl(item.id);
      router.push(url ?? "/shop");
    },
    [router, clearAutocomplete, addToHistory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setHighlightIdx((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setHighlightIdx((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        }
        case "Enter": {
          if (highlightIdx >= 0 && highlightIdx < items.length) {
            e.preventDefault();
            navigateToProduct(items[highlightIdx]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setHighlightIdx(-1);
          break;
        }
      }
    },
    [items, highlightIdx, navigateToProduct]
  );

  const handleItemHover = useCallback((idx: number) => {
    setHighlightIdx(idx);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setHighlightIdx(-1);
    clearAutocomplete();
    inputRef.current?.focus();
  }, [clearAutocomplete]);

  const showDropdown = expanded && settled && (query.trim().length >= 2 || items.length > 0);

  return (
    <div
      ref={rootRef}
      style={{
        display: "flex",
        alignItems: "center",
        height: "34px",
        position: "relative",
      }}
    >
      {/* Outer container — max-width transition handles both expand & collapse */}
      <div
        ref={containerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: expanded ? "var(--bg-primary)" : "transparent",
          borderRadius: expanded ? "20px" : "30px",
          border: expanded ? "1px solid var(--border-subtle)" : "1px solid transparent",
          padding: expanded ? "0 10px" : "0",
          height: "34px",
          maxWidth: expanded ? "220px" : "34px",
          overflow: "hidden",
          cursor: expanded ? "text" : "pointer",
          transition:
            `max-width ${EXPAND_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1), background 200ms, border-color 200ms, padding 200ms`,
        }}
        onClick={() => {
          if (!expanded) setExpanded(true);
        }}
      >
        {/* Search icon — always visible */}
        <Search
          size={expanded ? 14 : 17}
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
            transition: "all 200ms",
            marginLeft: expanded ? "0" : "3px",
          }}
        />

        {/* Input + clear button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? "auto" : "none",
            transition: "opacity 200ms",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="search-autocomplete-dropdown"
            aria-activedescendant={highlightIdx >= 0 ? `search-result-${highlightIdx}` : undefined}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "13px",
              fontFamily: "var(--font-primary)",
              color: "var(--text-primary)",
              width: "100%",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={t("clear")}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "2px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete dropdown — rendered via portal so it escapes parent overflow */}
      {showDropdown && (
        <SearchDropdown
          anchorRef={containerRef}
          items={items}
          historyCount={historyCount}
          isLoading={isLoading}
          highlightIdx={highlightIdx}
          query={query}
          onSelect={navigateToProduct}
          onHover={handleItemHover}
          onRemoveHistory={removeFromHistory}
        />
      )}
    </div>
  );
}

/* ── Dropdown: portaled to body ── */
function SearchDropdown({
  anchorRef,
  items,
  historyCount,
  isLoading,
  highlightIdx,
  query,
  onSelect,
  onHover,
  onRemoveHistory,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  items: AutocompleteItem[];
  historyCount: number;
  isLoading: boolean;
  highlightIdx: number;
  query: string;
  onSelect: (item: AutocompleteItem) => void;
  onHover: (idx: number) => void;
  onRemoveHistory: (id: string) => void;
}) {
  const t = useTranslations("shared.header.search");
  const tCommon = useTranslations("common");
  const { fmt } = useMoney();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Calculate dropdown position relative to the search container */
  useEffect(() => {
    setMounted(true);
    const updatePosition = () => {
      const el = anchorRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 6,
          left: rect.left,
          width: Math.max(rect.width, 320),
        });
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [anchorRef]);

  if (!mounted) return null;

  const showLoading = isLoading && items.length === 0;
  const showNoResults = !isLoading && query.trim().length >= 2 && items.length === 0;

  return (
    <div
      id="search-autocomplete-dropdown"
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 100,
        background: "var(--bg-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(10, 10, 8, 0.12), 0 4px 12px rgba(10, 10, 8, 0.06)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Results list */}
      <div style={{ maxHeight: "min(60vh, 560px)", overflowY: "auto" }} role="listbox">
        {showLoading && (
          <div
            style={{
              padding: "16px 16px",
              textAlign: "center",
              fontFamily: "var(--font-primary)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {t("loading")}
          </div>
        )}

        {showNoResults && (
          <div
            style={{
              padding: "16px 16px",
              textAlign: "center",
              fontFamily: "var(--font-primary)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {t("noResults", { query })}
          </div>
        )}

        {items.map((item, idx) => {
          const isHistory = idx < historyCount;
          return (
            <Fragment key={item.id}>
              {isHistory && idx === 0 && !query.trim() && (
                <div
                  role="presentation"
                  style={{
                    padding: "10px 14px 4px",
                    fontFamily: "var(--font-primary)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("recent")}
                </div>
              )}
              <div
                onMouseEnter={() => onHover(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: highlightIdx === idx ? "var(--bg-elevated)" : "transparent",
                  transition: "background 100ms",
                }}
              >
                <button
                  id={`search-result-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={highlightIdx === idx}
                  onClick={() => onSelect(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    padding: isHistory ? "10px 4px 10px 14px" : "10px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-primary)",
                  }}
                >
                  {/* Same size and colour on both kinds of row so the thumbnails stay aligned */}
                  {isHistory ? (
                    <History size={14} aria-hidden style={{ color: "var(--text-disabled)", flexShrink: 0 }} />
                  ) : (
                    <Search size={14} aria-hidden style={{ color: "var(--text-disabled)", flexShrink: 0 }} />
                  )}

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 42,
                      height: 56,
                      borderRadius: 4,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--bg-elevated)",
                      position: "relative",
                    }}
                  >
                    <Image src={item.image} alt="" fill sizes="42px" style={{ objectFit: "cover" }} />
                  </div>

                  {/* Name + price */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.02em",
                        lineHeight: "135%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {hasPublicPrice(item.badge) ? fmt(item, "price") : tCommon("priceOnRequest")}
                    </span>
                  </div>
                </button>

                {/* Remove from history */}
                {isHistory && (
                  <button
                    type="button"
                    aria-label={t("removeRecent", { name: item.name })}
                    title={t("removeRecent", { name: item.name })}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onRemoveHistory(item.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: "10px 14px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
