"use client";

import { useState, useEffect, useCallback } from "react";
import type { AutocompleteItem } from "@/src/hooks/use-api";

const STORAGE_KEY = "doovan-search-history";
export const SEARCH_HISTORY_MAX = 5;

function read(): AutocompleteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, SEARCH_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function write(items: AutocompleteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded or storage blocked — history is best-effort */ }
}

/**
 * Recently opened search results, newest first, persisted in localStorage.
 * Loaded after mount (server render is always empty) and kept in sync across tabs.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<AutocompleteItem[]>([]);

  useEffect(() => {
    setHistory(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Read-modify-write against storage so two tabs never overwrite each other with stale state */
  const update = useCallback((fn: (current: AutocompleteItem[]) => AutocompleteItem[]) => {
    const next = fn(read());
    write(next);
    setHistory(next);
  }, []);

  const add = useCallback(
    (item: AutocompleteItem) =>
      update((current) => [item, ...current.filter((h) => h.id !== item.id)].slice(0, SEARCH_HISTORY_MAX)),
    [update]
  );

  const remove = useCallback(
    (id: string) => update((current) => current.filter((h) => h.id !== id)),
    [update]
  );

  return { history, add, remove };
}
