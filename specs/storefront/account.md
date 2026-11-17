# Account (tài khoản) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [storefront/account](../../docs/storefront/account.md) · **Test:** `tests/storefront/account/`

## 1. Bối cảnh & mục tiêu

Trang tài khoản là điểm vào khu "của tôi": hồ sơ lấy từ Google, ba đơn gần nhất và bốn sản phẩm yêu thích gần nhất, kèm nút đăng xuất. Sai ở đây là lộ trang cho người chưa đăng nhập, hiện "chưa có đơn" khi thật ra đọc đơn lỗi, hay đăng xuất mà không hỏi lại. Module gồm `page.tsx`, `layout.tsx` (metadata + header + footer) và `AccountContent.tsx`. Không có form chỉnh sửa hồ sơ. Danh sách yêu thích đọc thẳng từ store ([wishlist](./wishlist.md)); đơn lấy từ `GET /api/orders` ([customer-orders](./customer-orders.md)).

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập, kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Chặn khi chưa đăng nhập, khung chờ khi chưa biết phiên | Hộp đăng nhập `UnauthenticatedState`: thuộc [site-chrome](../platform/site-chrome.md) |
| Hồ sơ (tên, email, thành viên từ, ảnh đại diện), đăng xuất có xác nhận | Phiên và `logout()`: thuộc [auth](../platform/auth.md) |
| Ba đơn gần nhất (kể cả lỗi và đọc lại), bốn yêu thích gần nhất | Trang đơn và trang yêu thích đầy đủ: thuộc [customer-orders](./customer-orders.md), [wishlist](./wishlist.md) |

## 3. Hợp đồng

- **Ai được xem.** Khách thấy hộp mời đăng nhập và FE không hỏi BE gì; chưa biết phiên thì là khung xám.
- **Hồ sơ.** Tên (không có tên thì lời chào), email, "Thành viên từ <ngày dài>", ảnh đại diện (chữ cái đầu hoặc "?"). Đăng xuất: hỏi xác nhận; "Hủy" giữ phiên; xác nhận thì xóa phiên và trang chuyển sang hộp mời đăng nhập.
- **Đơn gần nhất.** `GET /api/orders` rồi lấy 3 đơn đầu; mỗi đơn là link `/orders/<id>` với ảnh của dòng đầu có ảnh (không có thì biểu tượng gói hàng), ngày (ngắn), số món, nhãn trạng thái (màu theo trạng thái, trạng thái lạ như "chờ"), nhãn thanh toán (chỉ khi có), tổng theo ngôn ngữ; số đơn trên tiêu đề; khung xám khi đang tải; trống → mời mua sắm; **lỗi → hộp lỗi + "Thử lại"** (không giả làm "chưa có đơn"); "Thử lại" hiện khung xám rồi đọc lại.
- **Yêu thích gần nhất.** Đọc từ store: 4 sản phẩm thêm sau cùng, mới nhất trước, trong `Carousel` có tên; mỗi thẻ link tới trang sản phẩm (thiếu danh mục thì tra địa chỉ khi bấm), tên, giá (đặt may: "giá theo yêu cầu"); số trên tiêu đề là tổng; trống → mời duyệt cửa hàng.

## 4. Thiết kế

```
AccountContent ─► useAuth · useApiAuth.apiFetch(/api/orders) · wishlist store (selectWishlistItems)
  ├─ ProfileHeader ─► UserAvatar · SignOutButton (xác nhận)
  ├─ OrdersSection
  └─ WishlistSection ─► Carousel · useProductLink
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Lỗi không giả làm trống** | Trước đây đọc đơn lỗi thì hiện "chưa có đơn, bắt đầu mua sắm" làm khách tưởng mất đơn; giờ có hộp lỗi và nút thử lại, như các trang khác | Nuốt lỗi âm thầm |
| **Yêu thích đọc từ store** | Không cần API riêng; store đã được `CartSync` đồng bộ với BE | Gọi `GET /api/wishlist` ở đây |
| **Xác nhận trước khi đăng xuất** | Chạm nhầm trên điện thoại không kết thúc phiên | Đăng xuất ngay |
| **Ba thành phần cho ba khối** | Hồ sơ, đơn, yêu thích độc lập, tự lo trạng thái tải của mình | Một thành phần lớn |

### Kiến trúc

Thành phần phụ thuộc `useAuth`, `useApiAuth`, store wishlist, `Carousel` của [ui-kit](../platform/ui-kit.md) và `SignOutButton`. Không module nào khác import từ đây.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Ba khối riêng: hồ sơ, đơn, yêu thích; trang chỉ xếp chúng |
| O | Thêm khối mới = thêm một section |
| L | — |
| I | Mỗi khối chỉ lấy dữ liệu nó dùng |
| D | Phụ thuộc hook và store, không phụ thuộc `fetch` |

### Conventions

Chuỗi qua `private.account`; tiền qua `useMoney`; nhãn trạng thái qua `useOrderStatusLabel`; lỗi qua `useErrorMessage`. Test dùng `renderApp` với danh tính thật, store wishlist đặt sẵn và API đơn giả trong `account.test.tsx`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (trang chỉ dành cho người đã đăng nhập: khách thấy hộp mời đăng nhập) · permission = không (trang của khách hàng, không có quyền riêng)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ACC-1 | Khách thấy hộp mời đăng nhập và không gọi BE; khung xám khi chưa biết phiên | đúng | khách | component | `tests/storefront/account/account.test.tsx` |
| ACC-2 | Hồ sơ: tên, email, thành viên từ, chữ cái đầu / "?", lời chào; tiếng Anh; đăng xuất hỏi lại, Hủy giữ phiên, xác nhận kết thúc phiên | đúng | user | component | `tests/storefront/account/account.test.tsx` |
| ACC-3 | Đơn gần nhất: ba đơn đầu, link, ngày, số món, trạng thái và màu, thanh toán, tổng, ảnh đầu, USD, "xem tất cả", khung xám, trống | đúng | user | component | `tests/storefront/account/account.test.tsx` |
| ACC-3E | Không đọc được đơn: hộp lỗi (không phải "chưa có đơn"), thử lại hiện khung xám rồi đọc lại, thành công thì thay hộp lỗi | lỗi | user | component | `tests/storefront/account/account.test.tsx` |
| ACC-4 | Yêu thích gần nhất: bốn cái sau cùng mới trước, link, giá, đặt may, tổng, tra địa chỉ khi thiếu danh mục, trống | đúng | user | component | `tests/storefront/account/account.test.tsx` |
| ACC-5 | Tiêu đề và mô tả của trang | đúng | user | integration | `tests/storefront/account/account.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Đọc đơn lỗi hiện "chưa có đơn", làm khách tưởng mất đơn | Đã sửa: hộp lỗi + thử lại (ACC-3E) |
| Đăng xuất chỉ xóa phiên phía FE, không gọi BE hủy token | Hành vi của `logout()` ([auth](../platform/auth.md)); xem rủi ro ở đó |
| Màu trạng thái đơn khai báo riêng trong component, tách khỏi nhãn | Khóa bằng test (ACC-3); trạng thái lạ rơi về màu "chờ" |
| Nhánh `if (!isAuthenticated) return` trong `OrdersSection` không bao giờ chạy vì khối chỉ vẽ khi đã đăng nhập | Vô hại; có thể bỏ khi sửa lần sau |

Thay đổi nhìn thấy được: có (nhỏ): đọc đơn lỗi thì có hộp lỗi và nút "Thử lại" thay vì "chưa có đơn".

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 7), kiểm thử đột biến.
- 2026-10-25 · Sửa: đọc đơn lỗi hiện hộp lỗi + "Thử lại" (khóa `private.account.orders.loadFailed`, `retry` ở cả hai ngôn ngữ) thay vì giả làm "chưa có đơn".
- 2026-10-26 · no-test: chỉ đổi đường dẫn import, không đổi hành vi; `UserAvatar` có test ở `tests/platform/site-chrome`. `UserAvatar` đổi nơi định nghĩa sang `_components/UserAvatar.tsx` (trước là `UserMenu.tsx`); không đổi hành vi (batch 8, site-chrome).
