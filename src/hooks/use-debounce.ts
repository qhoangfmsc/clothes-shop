import { useState, useEffect } from "react";

/**
 * Debounces a value by `delay` ms.
 * Returns the debounced value that only updates after the input stops changing.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
