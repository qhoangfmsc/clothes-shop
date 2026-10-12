import { LIST_MAX_LIMIT } from "./list-query";

/** Max categories shown inline: the /shop grid becomes a carousel and the header
 *  mega menu adds a "view more" link once there are more than this many. */
export const MAX_INLINE_CATEGORIES = 4;

/** Public categories query: priority order (1 = first), every category in one page (BE max). */
export const PUBLIC_CATEGORIES_QUERY = `sort=priority&limit=${LIST_MAX_LIMIT}`;
