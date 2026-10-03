/** Public, unauthenticated URL for a file stored in the s3host Appwrite
 *  bucket — safe to store directly on products/categories/collections and
 *  render on public pages (served by /api/media/[fileId]). */
export function publicMediaUrl(fileId: string): string {
  return `/api/media/${fileId}`;
}
