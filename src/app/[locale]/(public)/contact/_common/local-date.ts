/** `YYYY-MM-DD` of the visitor's own calendar day, the format of `<input type="date">` (`toISOString` would give the UTC day). */
export function localDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
