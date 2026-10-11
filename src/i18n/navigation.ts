import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware drop-ins for `next/link` and `next/navigation`.
 *  Always import Link / useRouter / usePathname / redirect from here, never from
 *  `next/link` or `next/navigation` (those would drop the `/<locale>` prefix).
 *  `useSearchParams`, `useParams`, `notFound` still come from `next/navigation`. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
