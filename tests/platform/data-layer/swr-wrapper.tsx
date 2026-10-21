import type { ReactNode } from "react";
import { SWRConfig } from "swr";

/** A fresh SWR cache per render, and no retries after an error, so tests do not share data or leave timers behind. */
export function SwrIsolated({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), errorRetryCount: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}
