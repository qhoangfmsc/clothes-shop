# BE Task — Giỏ hàng chọn từng item (bulk action) & đặt hàng theo item đã chọn

> **Ngày tạo:** 2026-10-11
> **Repo:** `clothes-shop-api` (module `order`, chỉ cần sửa `order`; `cart` và `wishlist` **không đổi**)
> **Mức độ:** 1 thay đổi nhỏ, **tương thích ngược**. Mọi API khác giữ nguyên.

## 1. Tóm tắt thay đổi phía FE

FE giỏ hàng thêm checkbox từng item + bulk action. Chỉ có **một** chỗ thay đổi hợp đồng với BE:

| API | Thay đổi so với cũ |
| --- | --- |
| `POST /api/orders` | **Thêm field tuỳ chọn `cartItemIds: string[]`** trong body. Các field cũ (`addressId`, `shippingMethod`, `note`) giữ nguyên. |

Tất cả API còn lại FE vẫn gọi **y như cũ**, không đổi body / response / thứ tự gọi:

| Hành động trên FE | API được gọi | Thay đổi |
| --- | --- | --- |
| Thêm vào giỏ | `POST /api/cart/items` | Không |
| Đổi số lượng | `PATCH /api/cart/items/:itemId` | Không |
| Bỏ 1 item khỏi giỏ (nút thùng rác, nay có popup confirm) | `DELETE /api/cart/items/:itemId` | Không |
| **Bulk: bỏ các item đã chọn khỏi giỏ** | `DELETE /api/cart/items/:itemId` **gọi lặp, mỗi item 1 request** (song song) | Không có endpoint mới |
| Bỏ hết giỏ | Nút "Xoá tất cả" **đã bỏ khỏi UI**; FE không còn gọi `DELETE /api/cart/clear` từ trang giỏ. Endpoint vẫn giữ nguyên. | Không |
| **Bulk: thêm item đã chọn vào yêu thích** | `POST /api/wishlist/:productId` (mỗi sản phẩm 1 lần, đã loại trùng) | Không |
| Bấm trái tim từng item (toggle) | `POST` / `DELETE /api/wishlist/:productId` | Không |
| Lấy giỏ / wishlist | `GET /api/cart`, `GET /api/wishlist` | Không |
| Tạo địa chỉ khi checkout | `POST /api/addresses` | Không |
| Đặt hàng | `POST /api/orders` | **Thêm `cartItemIds`** (mục 2) |

> Việc tick chọn item (selected / deselected) chỉ lưu ở FE (localStorage), **BE không lưu trạng thái chọn**.
> Các thao tác bulk không làm mất item trong giỏ trừ khi người dùng chủ động bỏ khỏi giỏ (thêm vào yêu thích **không** xoá item khỏi giỏ).

## 2. Việc cần làm ở BE — `POST /api/orders`

Hiện tại `OrderService.checkout` lấy **toàn bộ** `cart.items`, tạo order rồi `manager.delete(CartItem, { cartId })` xoá cả giỏ. FE giờ chỉ muốn đặt các item đã tick, phần còn lại **phải ở lại giỏ**.

### 2.1 `CreateOrderDto` (`order/dtos/order.dto.ts`)

Thêm field tuỳ chọn:

```ts
@ApiPropertyOptional({
  description: 'IDs of the cart items to order. Omit to order the whole cart.',
  type: [String],
})
@IsOptional()
@IsArray()
@ArrayNotEmpty()
@ArrayMaxSize(100)
@ArrayUnique()
@IsString({ each: true })
@IsNotEmpty({ each: true })
@MaxLength(16, { each: true })
cartItemIds?: string[];
```

> **Bắt buộc khai báo trong DTO**: `main.ts` đang bật `whitelist` + `forbidNonWhitelisted`, field lạ bị **400**.

### 2.2 `OrderService.checkout` (`order/order.service.ts`)

1. Load cart như hiện tại (`relations: ['items', 'items.product']`).
2. Xác định tập item sẽ đặt:
   - **Có `cartItemIds`** → `selectedItems = cart.items.filter(i => ids.includes(i.id))`.
     Nếu `selectedItems.length !== cartItemIds.length` (id không tồn tại hoặc không thuộc giỏ của user) → `BadRequestException`. Không tạo order, không xoá gì.
   - **Không có `cartItemIds`** → `selectedItems = cart.items` (**hành vi cũ, giữ nguyên**).
3. Giữ kiểm tra `Cart is empty` (áp dụng cho `selectedItems`).
4. Mọi bước sau chỉ dùng `selectedItems` thay cho `cart.items`:
   - kiểm tra `product.status === 'active'`;
   - `subtotal`, `FREE_SHIPPING_THRESHOLD`, `shippingFee`, `total` (miễn phí ship tính theo **subtotal của item đã chọn**, khớp với FE);
   - tạo `OrderItem`.
5. Thay bước xoá giỏ:
   ```ts
   // cũ:  await manager.delete(CartItem, { cartId: cart.id });
   await manager.delete(CartItem, { cartId: cart.id, id: In(selectedItems.map((i) => i.id)) });
   ```
   Khi không có `cartItemIds` thì `selectedItems` là cả giỏ nên kết quả giống hệt cũ.
6. Giữ nguyên transaction, response `{ data: order }`, và các endpoint `GET/PATCH/cancel` của order.

### 2.3 Swagger

Cập nhật mô tả `POST /api/orders` cho field mới (optional, mặc định đặt cả giỏ).

## 3. Ràng buộc: không được làm hỏng flow cũ

- `cartItemIds` **phải optional**. Client cũ / script / admin gọi `POST /api/orders` không có field này vẫn đặt cả giỏ như trước.
- Không đổi response shape, status code, tên field của order, order items, admin order (`admin-order.controller.ts`), `PATCH`/`cancel`.
- Không đổi `cart` module (`GET/POST/PATCH/DELETE`, `clear`) và `wishlist` module.
- Không đổi quy tắc tính phí ship; chỉ đổi tập item đưa vào phép tính khi có `cartItemIds`.

## 4. Test cần có

| Case | Kết quả mong đợi |
| --- | --- |
| Giỏ 3 item, gửi 2 id | Order có đúng 2 item, `subtotal`/`shippingFee`/`total` tính trên 2 item; giỏ còn đúng 1 item |
| **Không gửi `cartItemIds`** (hồi quy) | Order có cả 3 item, giỏ rỗng — giống hệt trước khi sửa |
| Gửi đủ id của cả giỏ | Giống không gửi: order đủ item, giỏ rỗng |
| Chọn một phần, tổng chưa tới ngưỡng free ship dù cả giỏ vượt ngưỡng | `shippingFee` > 0 (tính theo item đã chọn) |
| Gửi id của user khác | 400; giỏ và order không đổi (transaction rollback) |
| Gửi id không tồn tại | 400 |
| `cartItemIds: []` | 400 (`ArrayNotEmpty`) |
| `cartItemIds` trùng id | 400 (`ArrayUnique`) |
| Item đã chọn có product không còn `active` | 400 như hiện tại; item không chọn mà inactive **không** làm fail đơn |
| Gửi field lạ khác | 400 (`forbidNonWhitelisted` vẫn hoạt động) |

## 5. Thứ tự deploy

**Deploy BE trước, FE sau.** FE luôn gửi `cartItemIds` khi checkout; BE cũ sẽ trả 400 vì field lạ, nên checkout lỗi nếu FE lên trước. BE mới tương thích ngược nên deploy BE trước không ảnh hưởng FE cũ.

## 6. Lưu ý / ngoài phạm vi

- FE chặn đặt hàng nếu có item đã chọn chưa có `serverItemId` (chưa đồng bộ lên server), và báo "Giỏ hàng đang được đồng bộ" — BE không cần xử lý riêng.
- Bulk bỏ khỏi giỏ hiện gọi N request `DELETE /api/cart/items/:itemId`. Nếu sau này cần giảm số request có thể thêm `DELETE /api/cart/items` nhận danh sách id, **không bắt buộc** cho task này.
- Việc đồng ý Điều khoản / Chính sách khi đăng nhập hiện chỉ chặn ở FE (checkbox trước nút Google), BE chưa lưu bằng chứng consent. Nếu cần bằng chứng pháp lý: thêm `termsAcceptedAt` + `termsVersion` vào `User` và gửi kèm trong `POST /auth/google`.
