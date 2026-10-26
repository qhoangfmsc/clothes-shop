import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEARCH_HISTORY_MAX, useSearchHistory } from "@/src/app/[locale]/_components/useSearchHistory";
import type { AutocompleteItem } from "@/src/hooks/use-api";
import { productSummary } from "@/tests/_support/fixtures";

/* The products the visitor opened from the search box last (specs/platform/site-chrome.md, flows CHR-8 to CHR-9E). */

const KEY = "doovan-search-history";
const item = (id: string, name = `Item ${id}`): AutocompleteItem => ({ ...productSummary({ id, name }), priceVnd: 100_000, priceUsd: 5 });
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null");

afterEach(() => vi.restoreAllMocks());

describe("CHR-8 the history", () => {
  it("is empty at first", async () => {
    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it("is read from the browser when the page starts", async () => {
    localStorage.setItem(KEY, JSON.stringify([item("a"), item("b")]));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history.map((h) => h.id)).toEqual(["a", "b"]));
  });

  it("keeps at most five, the newest first", async () => {
    const { result } = renderHook(() => useSearchHistory());

    for (const id of ["1", "2", "3", "4", "5", "6"]) act(() => result.current.add(item(id)));

    expect(SEARCH_HISTORY_MAX).toBe(5);
    expect(result.current.history.map((h) => h.id)).toEqual(["6", "5", "4", "3", "2"]);
    expect(stored().map((h: AutocompleteItem) => h.id)).toEqual(["6", "5", "4", "3", "2"]);
  });

  it("puts a product opened again at the top, once", async () => {
    localStorage.setItem(KEY, JSON.stringify([item("a"), item("b"), item("c")]));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(3));

    act(() => result.current.add(item("c", "Renamed")));

    expect(result.current.history.map((h) => h.id)).toEqual(["c", "a", "b"]);
    expect(result.current.history[0].name).toBe("Renamed");
  });

  it("forgets one product", async () => {
    localStorage.setItem(KEY, JSON.stringify([item("a"), item("b")]));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(2));

    act(() => result.current.remove("a"));

    expect(result.current.history.map((h) => h.id)).toEqual(["b"]);
    expect(stored().map((h: AutocompleteItem) => h.id)).toEqual(["b"]);
  });

  it("does nothing when asked to forget a product that is not there", async () => {
    localStorage.setItem(KEY, JSON.stringify([item("a")]));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.remove("zzz"));

    expect(result.current.history.map((h) => h.id)).toEqual(["a"]);
  });

  it("reads what the other tab wrote before it writes, so that two tabs do not overwrite each other", async () => {
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toEqual([]));
    localStorage.setItem(KEY, JSON.stringify([item("other")]));

    act(() => result.current.add(item("mine")));

    expect(result.current.history.map((h) => h.id)).toEqual(["mine", "other"]);
  });

  it("follows another tab when it changes the history", async () => {
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toEqual([]));

    localStorage.setItem(KEY, JSON.stringify([item("x")]));
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: KEY })));

    expect(result.current.history.map((h) => h.id)).toEqual(["x"]);
  });

  it("ignores a change to something else in the browser's storage", async () => {
    localStorage.setItem(KEY, JSON.stringify([item("a")]));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    localStorage.setItem(KEY, JSON.stringify([item("b")]));

    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: "other" })));

    expect(result.current.history.map((h) => h.id)).toEqual(["a"]);
  });

  it("stops listening for other tabs once the page is gone", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useSearchHistory());

    unmount();

    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

describe("CHR-9E a history that cannot be read or written", () => {
  it("starts empty when what was stored is not readable", async () => {
    localStorage.setItem(KEY, "{broken");

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it("starts empty when what was stored is not a list", async () => {
    localStorage.setItem(KEY, JSON.stringify({ id: "a" }));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it("starts empty when what was stored is a piece of text", async () => {
    localStorage.setItem(KEY, JSON.stringify("hello"));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it("takes only the first five of a longer stored list", async () => {
    localStorage.setItem(KEY, JSON.stringify(["1", "2", "3", "4", "5", "6", "7"].map((id) => item(id))));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history.map((h) => h.id)).toEqual(["1", "2", "3", "4", "5"]));
  });

  it("still remembers for this visit when the browser refuses to store", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.add(item("a")));

    expect(result.current.history.map((h) => h.id)).toEqual(["a"]);
  });

  it("starts empty when the browser refuses to be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => expect(result.current.history).toEqual([]));
  });
});
