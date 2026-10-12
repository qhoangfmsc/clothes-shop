/** Message to show for a caught error: the server's own text when it sent one,
 *  otherwise the translated fallback. Client code throws `new Error("")` (no text)
 *  when it has nothing server-provided, so the UI can always localise the fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** BE `errorCode` of a caught error: a number on `ApiError` / media thunk rejections, a numeric
 *  string `code` on errors that went through Redux's serializer. */
export function errorCodeOf(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { errorCode, code } = err as { errorCode?: unknown; code?: unknown };
  if (typeof errorCode === "number") return errorCode;
  const numeric = typeof code === "string" ? Number(code) : NaN;
  return Number.isInteger(numeric) ? numeric : undefined;
}

/** Text of a caught error whether it is an `Error` or a plain `{ message }` (what `unwrap()` throws). */
export function errorText(err: unknown): string {
  if (typeof err !== "object" || err === null) return "";
  const { message } = err as { message?: unknown };
  return typeof message === "string" ? message : "";
}
