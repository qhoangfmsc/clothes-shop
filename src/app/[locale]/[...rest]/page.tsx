import { notFound } from "next/navigation";

/** Catches every URL under /<locale>/ that no route matches, so the localized
 *  `not-found.tsx` renders (with the right language) instead of the framework default. */
export default function CatchAllNotFound() {
  notFound();
}
