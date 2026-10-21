import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { useAutocomplete } from "@/src/hooks/use-api";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* The search box suggestions (specs/platform/data-layer.md, flows API-2 and API-2E). Real timers: the
   debounce is 300 ms, so the waits below are a little longer than that. */

const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media";
const SETTLE = { timeout: 2000 };
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function suggestions(answer: (q: string, limit: string | null) => Response | Promise<Response>) {
  const asked: { q: string; limit: string | null }[] = [];
  server.use(
    http.get(`${API}/api/products/autocomplete`, ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get("q") ?? "";
      asked.push({ q, limit: url.searchParams.get("limit") });
      return answer(q, url.searchParams.get("limit"));
    })
  );
  return asked;
}
const found = (items: unknown[]) => HttpResponse.json({ data: items });

describe("API-2 suggestions while typing", () => {
  it("waits 300 ms, asks once with the trimmed text and the limit, and maps media URLs", async () => {
    const asked = suggestions(() => found([{ id: "p1", name: "Dress", image: `${STORAGE}/a.jpg`, priceVnd: 1, priceUsd: 1 }]));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("  dre  "));
    expect(result.current).toMatchObject({ query: "  dre  ", isLoading: true, results: [] });
    await pause(150);
    expect(asked).toEqual([]);

    await waitFor(() => expect(result.current.results).toHaveLength(1), SETTLE);
    expect(asked).toEqual([{ q: "dre", limit: "5" }]);
    expect(result.current.results[0]).toMatchObject({ id: "p1", image: "/media/a.jpg" });
    expect(result.current.isLoading).toBe(false);
  });

  it("only the last text is asked when the visitor keeps typing", async () => {
    const asked = suggestions((q) => found([{ id: q }]));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("dr"));
    await pause(100);
    act(() => result.current.search("dre"));
    await pause(100);
    act(() => result.current.search("dres"));

    await waitFor(() => expect(result.current.results).toEqual([{ id: "dres" }]), SETTLE);
    expect(asked).toEqual([{ q: "dres", limit: "5" }]);
  });

  it("uses the latest limit even though the search callback is created once", async () => {
    const asked = suggestions(() => found([]));
    const { result, rerender } = renderHook(({ limit }) => useAutocomplete(limit), { initialProps: { limit: 3 } });

    rerender({ limit: 8 });
    act(() => result.current.search("dress"));

    await waitFor(() => expect(asked).toHaveLength(1), SETTLE);
    expect(asked[0].limit).toBe("8");
  });

  it("drops the answer of an older search that is still on its way", async () => {
    suggestions(async (q) => {
      if (q === "dre") await delay(400);
      return found([{ id: q }]);
    });
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("dre"));
    await pause(380); // the first request is now in flight
    act(() => result.current.search("dress"));

    await waitFor(() => expect(result.current.results).toEqual([{ id: "dress" }]), SETTLE);
    await pause(500);
    expect(result.current.results).toEqual([{ id: "dress" }]);
  });
});

describe("API-2E short text, failures and stopping", () => {
  it.each(["", "a", " a ", "  "])("does not ask for %j (under two characters) and clears the list", async (text) => {
    const asked = suggestions(() => found([{ id: "x" }]));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search(text));
    await pause(400);

    expect(asked).toEqual([]);
    expect(result.current).toMatchObject({ results: [], isLoading: false });
  });

  it("empties the list when the text becomes too short again", async () => {
    suggestions(() => found([{ id: "x" }]));
    const { result } = renderHook(() => useAutocomplete(5));
    act(() => result.current.search("dress"));
    await waitFor(() => expect(result.current.results).toHaveLength(1), SETTLE);

    act(() => result.current.search("d"));

    expect(result.current.results).toEqual([]);
  });

  it("shows no suggestions, and stops loading, when the API fails", async () => {
    suggestions(() => HttpResponse.json({ message: "down" }, { status: 500 }));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("dress"));

    await waitFor(() => expect(result.current.isLoading).toBe(false), SETTLE);
    expect(result.current.results).toEqual([]);
  });

  it("treats a missing data field as no results", async () => {
    suggestions(() => HttpResponse.json({}));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("dress"));

    await waitFor(() => expect(result.current.isLoading).toBe(false), SETTLE);
    expect(result.current.results).toEqual([]);
  });

  it("clear cancels a search that is still waiting and empties everything", async () => {
    const asked = suggestions(() => found([{ id: "x" }]));
    const { result } = renderHook(() => useAutocomplete(5));

    act(() => result.current.search("dress"));
    act(() => result.current.clear());
    await pause(450);

    expect(asked).toEqual([]);
    expect(result.current).toMatchObject({ query: "", results: [], isLoading: false });
  });

  it("clear also drops a request already in flight", async () => {
    suggestions(async () => {
      await delay(200);
      return found([{ id: "x" }]);
    });
    const { result } = renderHook(() => useAutocomplete(5));
    act(() => result.current.search("dress"));
    await pause(330);

    act(() => result.current.clear());
    await pause(400);

    expect(result.current.results).toEqual([]);
  });

  it("unmounting cancels a search that is still waiting", async () => {
    const asked = suggestions(() => found([]));
    const { result, unmount } = renderHook(() => useAutocomplete(5));
    act(() => result.current.search("dress"));

    unmount();
    await pause(450);

    expect(asked).toEqual([]);
  });
});
