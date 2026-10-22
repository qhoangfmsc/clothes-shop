/* `authApi` calls `notifyAdminMutation()` after every successful admin write (POST / PUT / PATCH / DELETE to `/api/admin/…`).
   Things that depend on that data (the menu's "work waiting" badges) subscribe and refresh themselves. */

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
