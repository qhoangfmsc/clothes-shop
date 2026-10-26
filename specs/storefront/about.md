# About (giới thiệu) — Tech spec

> **Nhóm:** Storefront · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [storefront/about](../../docs/storefront/about.md) · **Test:** `tests/storefront/about/`

## 1. Bối cảnh & mục tiêu

Trang giới thiệu kể câu chuyện thương hiệu và mời khách liên hệ. Là trang nội dung tĩnh: sai ở đây là một khối mất, màu thẻ không lên (đã từng xảy ra: lớp màu ghép chuỗi động nên Tailwind không sinh), hoặc nút liên hệ trỏ sai. Module gồm `page.tsx` (server), `_components/{InvitationHero,BrandStory,ServicesSection}.tsx` và `_common/constants.ts`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách (trang công khai), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Ba khối: lời mời, câu chuyện, dịch vụ kèm nút liên hệ; metadata | `buildMailto`: thuộc [contact](./contact.md) |
| Bố cục hai cột của câu chuyện theo bề rộng cửa sổ | Header và footer chung: thuộc [site-chrome](../platform/site-chrome.md) |

## 3. Hợp đồng

- **Trang.** Báo ngôn ngữ cho framework; ba khối theo thứ tự: lời mời, câu chuyện, dịch vụ. Metadata: tiêu đề kết thúc bằng thương hiệu, mô tả, `hreflang`, thẻ chia sẻ.
- **Lời mời.** Nhãn, `h1`, câu phụ, dòng "thành lập 2026"; hình nền trang trí (không có chữ thay thế).
- **Câu chuyện.** Dòng nhỏ, tiêu đề, bốn đoạn theo thứ tự, câu trích, ảnh có chữ thay thế; hai cột từ 1024 px trở lên, một cột dưới đó, đổi theo bề rộng cửa sổ lúc đổi cỡ và dừng nghe khi rời trang.
- **Dịch vụ.** Nhãn, tiêu đề, ba thẻ theo thứ tự (biểu tượng, tên, mô tả), mỗi thẻ màu nền, viền và màu biểu tượng riêng áp dụng thật bằng `style`; nút "Liên hệ" mở email gửi hộp thư của cửa hàng.

## 4. Thiết kế

```
page.tsx (server) ─► InvitationHero · BrandStory (client, theo bề rộng) · ServicesSection ─► buildMailto
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Màu thẻ bằng `style`, không ghép tên lớp** | Tailwind chỉ sinh lớp có chữ nguyên văn; `bg-[${màu}]` ghép lúc chạy không được sinh nên các thẻ dịch vụ từng không có màu. `style` luôn đúng | Liệt kê lớp đầy đủ |
| **Cấu trúc trong `constants.ts`, chữ trong bản dịch** | Thêm đoạn hay dịch vụ chỉ sửa danh sách khóa và bản dịch | Viết chữ trong component |
| **Bỏ khối chết** | `ContactCTA` không trang nào dùng (nút liên hệ nằm trong khối dịch vụ) nên đã xóa cùng hai khóa `cta.text`, `cta.copyright` | Giữ phòng khi cần |

### Kiến trúc

Trang (server) ghép các khối client; chỉ `ServicesSection` phụ thuộc `src/lib/contact.ts`. Không module nào khác import từ đây.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | Mỗi khối một việc |
| O | Thêm đoạn hay dịch vụ = thêm khóa vào `constants.ts` và bản dịch |
| L | — |
| I | Các khối không nhận props |
| D | Khối dịch vụ phụ thuộc `buildMailto`, không tự dựng địa chỉ thư |

### Conventions

Chuỗi qua `public.about`. Test gọi thẳng hàm trang server và dùng `renderApp`; bề rộng cửa sổ đặt bằng `window.innerWidth`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (trang nội dung công khai: không có hành động cần đăng nhập) · permission = không (trang công khai)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ABT-1 | Trang: ba khối theo thứ tự, tiếng Anh, báo ngôn ngữ, metadata | đúng | khách | integration | `tests/storefront/about/about.test.tsx` |
| ABT-2 | Lời mời: nhãn, tiêu đề, câu phụ, dòng thành lập, hình nền trang trí | đúng | khách | component | `tests/storefront/about/about.test.tsx` |
| ABT-3 | Câu chuyện: dòng nhỏ, tiêu đề, bốn đoạn theo thứ tự, câu trích, ảnh; hai cột từ 1024 px, đổi theo cỡ cửa sổ, dừng nghe khi rời | đúng | khách | component | `tests/storefront/about/about.test.tsx` |
| ABT-3E | Cửa sổ không có bề rộng dùng được (0 hoặc 320 px): câu chuyện vẫn một cột, không lỗi (trang tĩnh không có đường lỗi thật, đây là trường hợp biên) | lỗi | khách | component | `tests/storefront/about/about.test.tsx` |
| ABT-4 | Dịch vụ: ba thẻ theo thứ tự với biểu tượng, tên, mô tả; màu nền, viền và biểu tượng riêng áp dụng thật | đúng | khách | component | `tests/storefront/about/about.test.tsx` |
| ABT-5 | Nút liên hệ mở email gửi cửa hàng | đúng | khách | component | `tests/storefront/about/about.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Màu nền của ba thẻ dịch vụ từng không áp dụng (lớp ghép chuỗi động) | Đã sửa: màu và viền bằng `style` (ABT-4) |
| `ContactCTA` và hai khóa `cta.text`, `cta.copyright` không được dùng | Đã xóa |
| Hai cột của câu chuyện đổi bằng JavaScript (`innerWidth`), nên lần vẽ đầu ở máy rộng là một cột rồi mới đổi | Hành vi hiện tại (ABT-3); có thể chuyển sang lớp `lg:` của CSS |
| `min-height: 100vh` của `main` và `h-screen` ở một số khối theo chiều cao cửa sổ | Hành vi hiện tại; kiểm tay ở nhiều cỡ |

Thay đổi nhìn thấy được: có (nhỏ): ba thẻ dịch vụ có màu nền và viền riêng như thiết kế; bỏ khối `ContactCTA` không dùng.

## 8. Lịch sử thay đổi

- 2026-10-25 · Viết spec và test cho toàn module (batch 7), kiểm thử đột biến.
- 2026-10-25 · Sửa: màu nền và viền thẻ dịch vụ bằng `style` (lớp ghép động không được Tailwind sinh); xóa `ContactCTA` và khóa `cta.text`, `cta.copyright` không dùng.
- 2026-10-26 · no-test: kiểm bởi `tests/platform/design-system` (DSN-1). Khung ảnh của `BrandStory` dùng `--color-pearl-cream` (trước đây `--color-warm-white` chưa từng được định nghĩa nên khung trong suốt); ghi nhận trong batch 8 (design-system).
