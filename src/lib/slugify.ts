/** URL slug of a name: lower case, accents removed (Vietnamese đ becomes d), every other run of characters one dash. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
