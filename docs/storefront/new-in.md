# New In (hàng mới về)

> **Nhóm:** Storefront (public) · **Route:** `/[locale]/new-in` · **Cập nhật:** 2026-10-18
> **Code:** `(public)/new-in/` — `page.tsx`, `loading.tsx`, `_components/NewInClient.tsx`
> **i18n:** `public.newIn`

## 1. Tóm tắt module

Trang "hàng mới": hero có banner xoay, dải chữ chạy ngang, hai sản phẩm nổi bật (spotlight), lưới tất cả sản phẩm mới có lọc/sắp xếp, và khối đăng ký nhận tin.

## 2. Phục vụ gì / việc cần làm

Giới thiệu những sản phẩm gắn badge `new` để khách quay lại thường xuyên xem hàng mới.

## 3. Submodule & chức năng hiện có

| Khối | Chức năng |
|---|---|
| Hero | Banner từ site config `NEW_IN_HERO_BANNERS` (xoay nếu ≥ 2), nhãn "live", tiêu đề 2 dòng, phụ đề, nút cuộn mượt tới `#new-drops`, số watermark |
| Ticker | Dải chữ `newDrop · limited · handcrafted` chạy ngang (`ni-ticker-scroll` 18 s, chỉ khi cho phép chuyển động) |
| Spotlight | Hai sản phẩm đầu: nhãn ("Editor's pick", "Most wanted"; dự phòng "Featured"), tên, mô tả, giá, ảnh, nút "Shop now" |
| Lưới sản phẩm (`#new-drops`) | Dùng lại `ShopProductsClient` (lọc theo mức giá VND/size/màu, sắp xếp, "Xem thêm" 25/lần, chỉ tải trang kế; `scope` `badge: "new"`) |
| Newsletter | Ô nhập email + nút; form chỉ chặn submit mặc định (`onSubmit` → `preventDefault`), chưa gửi đi đâu |

## 4. Chi tiết

- Server: `getProductsWithParams({ badge: "new", limit: SHOP_PAGE_SIZE })` = `GET /api/products?badge=new` (ISR 60 s; trang đầu 25 sản phẩm kèm `total`, `NewInClient` nhận `products` + `total`) và `getBannerConfig("NEW_IN_HERO_BANNERS")`. Metadata `public.newIn.meta`.
- Spotlight dùng `products.slice(0, 2)`; màu nền `--bg-section-2` và `--bg-section-5`; link tới trang sản phẩm; giá theo ngôn ngữ qua `useMoney` ([currency](../platform/currency.md)).
- Hiệu ứng: GSAP timeline hero (zoom ảnh 1.15 → 1, ngày, tiêu đề từng dòng, watermark, phụ đề, CTA) + parallax ảnh `y: 15%`; reveal ảnh/chữ của từng spotlight khi cuộn.
- Nút "Explore drops": `scrollIntoView` mượt vì header cố định (phần tử đích có `scroll-margin-top`).
- Có trong sitemap (`/new-in`, `lastModified` = sản phẩm cập nhật mới nhất). Không có JSON-LD breadcrumb riêng.
- Xem thêm: [shop](./shop.md) (lọc/lưới), [ui-kit](../platform/ui-kit.md) (banner).
- Sản phẩm badge `custom_order` không hiện giá: giá ở Spotlight (và thẻ trong lưới, qua `ProductCard`) hiện `common.priceOnRequest`.
