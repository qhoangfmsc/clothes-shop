import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "@/src/hooks/use-debounce";

/* Flow DEB-1: a value that settles. */

afterEach(() => vi.useRealTimers());

describe("DEB-1 useDebounce", () => {
  it("starts with the value it is given", () => {
    expect(renderHook(() => useDebounce("a")).result.current).toBe("a");
  });

  it("updates only after the value has stood still for the delay (300 ms by default)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), { initialProps: { value: "a" } });

    rerender({ value: "ab" });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("ab");
  });

  it("restarts the wait on every change, so only the last value comes through", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), { initialProps: { value: "a" } });

    rerender({ value: "b" });
    act(() => void vi.advanceTimersByTime(80));
    rerender({ value: "c" });
    act(() => void vi.advanceTimersByTime(80));
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(20));
    expect(result.current).toBe("c");
  });

  it("uses a delay it is given", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), { initialProps: { value: 1 } });

    rerender({ value: 2 });
    act(() => void vi.advanceTimersByTime(999));
    expect(result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(2);
  });

  it("drops the pending update when it is unmounted", () => {
    vi.useFakeTimers();
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 100), { initialProps: { value: "a" } });
    rerender({ value: "b" });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
