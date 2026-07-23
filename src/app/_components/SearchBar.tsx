"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useAutocomplete, type AutocompleteItem } from "@/src/hooks/use-api";

export default function SearchBar() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, search, clear: clearAutocomplete } = useAutocomplete();

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

  /* Reset highlight when results change */
  useEffect(() => {
    setHighlightIdx(-1);
  }, [results]);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      search(value);
    },
    [search]
  );

  const navigateToProduct = useCallback(
    (item: AutocompleteItem) => {
      setExpanded(false);
      setQuery("");
      setHighlightIdx(-1);
      clearAutocomplete();
      router.push(`/shop/${item.slug}`);
    },
    [router, clearAutocomplete]
  );

  const navigateToSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setExpanded(false);
    setHighlightIdx(-1);
    clearAutocomplete();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router, clearAutocomplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setHighlightIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setHighlightIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        }
        case "Enter": {
          if (highlightIdx >= 0 && highlightIdx < results.length) {
            e.preventDefault();
            navigateToProduct(results[highlightIdx]);
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
    [results, highlightIdx, navigateToProduct]
  );

  const handleItemHover = useCallback((idx: number) => {
    setHighlightIdx(idx);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      navigateToSearch();
    },
    [query, navigateToSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setHighlightIdx(-1);
    clearAutocomplete();
    inputRef.current?.focus();
  }, [clearAutocomplete]);

  const showDropdown = expanded && query.trim().length >= 2;

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
            "max-width 300ms cubic-bezier(0.25, 0.1, 0.25, 1), background 200ms, border-color 200ms, padding 200ms",
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
        <form
          onSubmit={handleSubmit}
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
            placeholder="Search..."
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
        </form>
      </div>

      {/* Autocomplete dropdown — rendered via portal so it escapes parent overflow */}
      {showDropdown && (
        <SearchDropdown
          anchorRef={containerRef}
          results={results}
          isLoading={isLoading}
          highlightIdx={highlightIdx}
          query={query}
          onSelect={navigateToProduct}
          onHover={handleItemHover}
          onSearchAll={navigateToSearch}
        />
      )}
    </div>
  );
}

/* ── Dropdown: portaled to body ── */
function SearchDropdown({
  anchorRef,
  results,
  isLoading,
  highlightIdx,
  query,
  onSelect,
  onHover,
  onSearchAll,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  results: AutocompleteItem[];
  isLoading: boolean;
  highlightIdx: number;
  query: string;
  onSelect: (item: AutocompleteItem) => void;
  onHover: (idx: number) => void;
  onSearchAll: () => void;
}) {
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

  const showLoading = isLoading && results.length === 0;
  const showNoResults = !isLoading && query.length >= 2 && results.length === 0;

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
      <div style={{ maxHeight: 400, overflowY: "auto" }} role="listbox">
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
            Searching...
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
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {results.map((item, idx) => (
          <button
            key={item.id}
            id={`search-result-${idx}`}
            type="button"
            role="option"
            aria-selected={highlightIdx === idx}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHover(idx)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              border: "none",
              background: highlightIdx === idx ? "var(--bg-elevated)" : "transparent",
              padding: "10px 14px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-primary)",
              transition: "background 100ms",
            }}
          >
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
                ${item.price.toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* See all results footer */}
      {results.length > 0 && (
        <button
          type="button"
          onClick={onSearchAll}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            border: "none",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-primary)",
            padding: "11px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-primary)",
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            transition: "color 150ms, background 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent-primary)";
            e.currentTarget.style.background = "rgba(201, 169, 110, 0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "var(--bg-primary)";
          }}
        >
          See all results for &ldquo;{query}&rdquo;
          <Search size={12} />
        </button>
      )}
    </div>
  );
}
