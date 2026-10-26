# New in (hàng mới về) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-25 · **Trạng thái:** Implemented
> **Doc:** [storefront/new-in](../../docs/storefront/new-in.md) · **Test:** `tests/storefront/new-in/`

## 1. Bối cảnh & mục tiêu

Trang "hàng mới" kéo khách quay lại xem sản phẩm mới. Sai ở đây là xin sai huy hiệu (hiện sản phẩm không mới), một nút cuộn nhảy thay vì lướt, một khối đăng ký tin hứa mà không làm gì. Module gồm `page.tsx` (server, ISR 60 giây) và `_components/NewInClient.tsx`; lưới sản phẩm là `ShopProductsClient` của [shop](./shop.md) với phạm vi `badge: new`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách (trang công khai; thẻ trong lưới do shop khóa), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Trang server: sản phẩm `new` trang đầu, banner hero, metadata | Hàm lấy dữ liệu server: thuộc [data-layer](../platform/data-layer.md) |
| Hero, dải chữ, hai spotlight, nút lướt tới lưới, khối đăng ký | Lưới, lọc, sắp xếp, "Xem thêm", thẻ sản phẩm: thuộc [shop](./shop.md) |

## 3. Hợp đồng

- **Trang.** Hỏi `GET /api/products?badge=new&limit=25` và banner `NEW_IN_HERO_BANNERS` song song. Banner lỗi → hero trơn; sản phẩm không đọc được → ném lỗi. Metadata: tiêu đề kết thúc bằng thương hiệu, mô tả, `hreflang`, thẻ chia sẻ.
- **Hero.** Nhãn "đang diễn ra", tiêu đề hai dòng, phụ đề, watermark, nút mời xuống lưới; banner theo số lượng (0 = nền trơn, 1 = ảnh, nhiều = chấm + chuyển mờ). Bấm nút lướt mượt tới `#new-drops`; không có đích thì để trình duyệt xử lý.
- **Dải chữ.** Ba cụm, lặp hai lần.
- **Spotlight.** Hai sản phẩm đầu (một nếu chỉ có một, không có nếu rỗng): nhãn, tên, mô tả, giá theo ngôn ngữ (đặt may: "giá theo yêu cầu"), ảnh, nút "Mua ngay" tới trang sản phẩm (thiếu danh mục → `/shop`); màu nền riêng, khối thứ hai đảo bên.
- **Lưới.** `ShopProductsClient` với tổng của BE, phạm vi `badge: new`; "Xem thêm" hỏi trang kế vẫn với `badge=new`.
- **Đăng ký tin.** Ô email (có tên truy cập) và nút; gửi form chỉ chặn hành vi mặc định, không gửi đi đâu.

## 4. Thiết kế

```
page.tsx (server) ─► server-fetchers (data-layer) ─► BE
  └─ NewInClient ─► BannerFade · CarouselDots · GSAP
       └─ ShopProductsClient (shop) ─► GET /api/products?badge=new
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Dùng lại `ShopProductsClient` với phạm vi** | Lưới, lọc, sắp xếp và "Xem thêm" của shop đã đúng và được test; trang này chỉ thêm `badge: new` | Chép lưới sang đây |
| **Server render trang đầu** | Spotlight và lưới đầu có trong HTML cho công cụ tìm kiếm | Tải ở client |
| **GSAP dọn bằng `ctx.revert()`** | Rời trang không để lại hiệu ứng cuộn | Để hiệu ứng tự tắt |

### Kiến trúc

Trang (server) phụ thuộc xuống data layer; thành phần client phụ thuộc [shop](./shop.md) (lưới) và `BannerFade` / `CarouselDots` của [ui-kit](../platform/ui-kit.md). Không module nào khác import từ đây.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `NewInClient` chỉ dựng các khối của trang; lưới và dữ liệu ở nơi khác |
| O | Thêm spotlight = đổi `slice` và nhãn |
| L | `ShopProductsClient` dùng được với bất kỳ phạm vi nào |
| I | `ShopProductsClient` nhận sản phẩm đầu, tổng, phạm vi và tiêu đề |
| D | Thành phần phụ thuộc hook, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `public.newIn`; tiền qua `useMoney`. Test dùng `shop-kit.tsx` của [shop](./shop.md) (API công khai giả, hàm render) và bọc thành phần trong `<main>` như trang thật.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (trang công khai: không có hành động cần đăng nhập ở phần của module này; tim và nút giỏ nằm trong thẻ của shop) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| NI-1 | Trang server: hỏi `badge=new` 25 sản phẩm và banner, hero, tổng, banner lỗi vẫn hiện, báo ngôn ngữ, metadata | đúng | khách | integration | `tests/storefront/new-in/new-in.test.tsx` |
| NI-1E | Sản phẩm không đọc được: ném lỗi | lỗi | khách | integration | `tests/storefront/new-in/new-in.test.tsx` |
| NI-2 | Hero: nhãn, tiêu đề, phụ đề, watermark, banner (0 / 1 / nhiều), nút lướt tới lưới hoặc để trình duyệt xử lý; rời trang gỡ hiệu ứng | đúng | khách | component | `tests/storefront/new-in/new-in.test.tsx` |
| NI-3 | Dải chữ: ba cụm hai lần | đúng | khách | component | `tests/storefront/new-in/new-in.test.tsx` |
| NI-4 | Spotlight: hai / một / không sản phẩm, nhãn, giá, đặt may, link, màu nền, đảo bên | đúng | khách | component | `tests/storefront/new-in/new-in.test.tsx` |
| NI-5 | Lưới: tiêu đề, tổng, "Xem thêm" vẫn chỉ `badge=new` | đúng | khách | component | `tests/storefront/new-in/new-in.test.tsx` |
| NI-6 | Khối đăng ký: nội dung, trường email, gửi form không đi đâu | đúng | khách | component | `tests/storefront/new-in/new-in.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Khối đăng ký nhận tin hứa mà không gửi đi đâu: bấm "Đăng ký" không có phản hồi | Hành vi hiện tại, test khóa (NI-6); cần endpoint BE hoặc bỏ khối |
| Trang đầu server lỗi thì cả trang lỗi | Sản phẩm không đọc được ném lỗi để trang lỗi hiện (NI-1E); banner không bao giờ làm hỏng trang |
| Tim và nút giỏ trong lưới là của thẻ shop | Khóa ở [shop](./shop.md) (SHP-11, SHP-12) |

Thay đổi nhìn thấy được: không (không đổi hành vi nhìn thấy).

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 6), kiểm thử đột biến. Không đổi code của module.
