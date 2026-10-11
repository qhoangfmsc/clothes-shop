/** Relative change from `previous` to `current` as a fraction (0.12 = +12%).
 *  `null` when there is nothing to compare against (previous is 0 or unknown). */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
