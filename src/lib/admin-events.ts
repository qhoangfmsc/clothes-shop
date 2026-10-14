/* ═══════════════════════════════════════════════════════════
   ADMIN EVENTS — "an admin action just succeeded"

   `authApi` calls `notifyAdminMutation()` after every successful write (POST / PUT / PATCH / DELETE) to
   `/api/admin/…`. Things that depend on the data those writes change (the menu's "work waiting" badges)
   subscribe here and refresh themselves, so no screen has to remember to do it.
   ═══════════════════════════════════════════════════════════ */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Runs `listener` after each successful admin write. Returns the unsubscribe function. */
export function onAdminMutation(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAdminMutation(): void {
  listeners.forEach((listener) => listener());
}
