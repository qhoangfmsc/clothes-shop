/** Message to show for a caught error: the server's own text when it sent one,
 *  otherwise the translated fallback. Client code throws `new Error("")` (no text)
 *  when it has nothing server-provided, so the UI can always localise the fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
