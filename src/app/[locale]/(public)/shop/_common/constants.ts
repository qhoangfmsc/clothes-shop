import { LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";

/** Products per page of the shop grids: the server renders the first page, "Xem thêm" fetches the next ones.
 *  Same size as every other list (the BE default). */
export const SHOP_PAGE_SIZE = LIST_DEFAULT_LIMIT;

/** Related products rendered under a product (sent to the BE as `relatedLimit`; one full row on wide screens). */
export const RELATED_PRODUCTS_LIMIT = 5;
