# Data layer — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented
> **Doc:** [platform/data-layer](../../docs/platform/data-layer.md) · **Test:** `tests/platform/data-layer/`

## 1. Bối cảnh & mục tiêu

Phạm vi spec này là phần của data layer mà đợt refactor [auth](./auth.md) chạm tới. Các phần khác (SWR hooks, Redux slices, `list-query`, proxy `/media`) vào spec sau theo `specs/_roadmap.md`.

**Vấn đề.** Đoạn "đọc body lỗi của BE rồi dựng `ApiError`" được viết lại ở `api.ts`, `auth-api.ts` và hai nơi trong `use-api-auth.ts`. Hợp đồng lỗi (`message`, `status`, `errorCode`, fallback `API error: <status>`) nên có một nơi sở hữu.

**Mục tiêu.** Thêm `toApiError(res)` vào `src/lib/api.ts` và dùng ở bốn nơi trên; hành vi giữ nguyên.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| `toApiError(res)` trong `api.ts` | Đổi `AuthProvider.login` sang `toApiError`: nó dùng fallback `""` (không phải `API error: …`) và là hợp đồng riêng của đăng nhập |
| `use-media-upload.ts` đọc token từ `session.ts` (import đổi, không đổi hành vi) | Thêm refresh cho upload |

## 3. Hợp đồng

```ts
toApiError(res: Response): Promise<ApiError>
// body = await res.json() (lỗi parse → {})
// → new ApiError(body.message || `API error: ${res.status}`, res.status, body.errorCode)
```

`ApiError` giữ nguyên: `status`, `errorCode?`, `code?` (= `String(errorCode)`), `name = "ApiError"`.

## 4. Thiết kế

`api.ts` (ApiError + `toApiError`) là lá của đồ thị phụ thuộc: không import module nào khác của dự án. `auth-api.ts`, `use-api-auth.ts` và `session.ts` import từ nó.

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Factory function** `toApiError` tạo `ApiError` từ `Response` | Một nơi biết hình dạng body lỗi của BE | Hàm `assertOk(res)` ném lỗi: ẩn việc ném, khó dùng khi caller cần xử lý 401 trước |

### Kiến trúc

Lớp lá của tầng lib: không phụ thuộc ngược. Giữ ở `api.ts` vì `ApiError` đã ở đó.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `api.ts` sở hữu "lỗi từ BE là gì"; các client không còn tự đoán hình dạng body lỗi |
| O | BE thêm trường lỗi mới → sửa một hàm |
| L | Mọi lỗi HTTP là `ApiError`; caller `catch` một kiểu |
| I | Hàm nhỏ nhận `Response`, không phụ thuộc client nào |
| D | Client phụ thuộc hàm này, không tự `res.json().catch(...)` |

### Conventions

Tiếng Anh; không UI text (người dùng vẫn thấy lỗi qua `useErrorMessage`).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** một phần — chỉ `toApiError` / `ApiError` và client công khai `api`; chưa phủ `list-query`, `media-url`, `product-url`, các hook SWR, `store/` và proxy `/media`
**Chiều kiểm thử:** auth = không (client công khai không có danh tính; phiên và danh tính được phủ ở spec auth) · permission = không (lớp truy cập dữ liệu không quyết định quyền, BE quyết định)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| ERR-1 | Body có `message`/`errorCode` → `ApiError` đủ trường; `code` là chuỗi | lỗi | — | unit | `tests/platform/data-layer/api-error.test.ts` |
| ERR-2 | Body không phải JSON hoặc thiếu `message` → `API error: <status>` | lỗi | — | unit | `tests/platform/data-layer/api-error.test.ts` |
| ERR-3 | `api.get/post/patch/delete` (client công khai) không gửi token, gửi JSON, trả `res.json()` | đúng | — | integration | `tests/platform/data-layer/api.test.ts` |
| ERR-4 | `api` không refresh khi 401: ném `ApiError` | lỗi | — | integration | `tests/platform/data-layer/api.test.ts` |

## 7. Rủi ro & triển khai

Không đổi hành vi nhìn thấy được. Rủi ro: một client đổi fallback message. Phát hiện bằng `ERR-2` và các test lỗi ở [auth](./auth.md).

## 8. Lịch sử thay đổi

- 2026-10-21 · Viết spec cùng đợt refactor auth.
- 2026-10-21 · Chuyển bảng luồng sang định dạng ma trận (tình huống × danh tính), khai phạm vi một phần; chưa tính là xong trong `test:progress` (batch 1). no-test: chỉ đổi định dạng spec.
