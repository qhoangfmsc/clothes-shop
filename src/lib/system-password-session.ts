/* ═══════════════════════════════════════════════════════════
   SYSTEM PASSWORD SESSION — 15-minute TTL for the admin password

   Shared by both the full admin area gate and any one-off
   re-prompt (e.g. the Users "View" action), so entering the
   password once covers everything for the next 15 minutes.
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = "admin_system_unlocked_at";
const TTL_MS = 15 * 60 * 1000;

export function isSystemUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const unlockedAt = Number(raw);
  if (!Number.isFinite(unlockedAt)) return false;
  return Date.now() - unlockedAt < TTL_MS;
}

export function markSystemUnlocked(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
}
