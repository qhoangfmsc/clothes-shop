# <Tên module> — Tech spec

> **Nhóm:** Platform | Admin | Storefront · **Cập nhật:** YYYY-MM-DD · **Trạng thái:** Draft
> **Doc:** [<nhóm>/<module>](../../docs/<nhóm>/<module>.md) · **Test:** `tests/<nhóm>/<module>/`

## 1. Bối cảnh & mục tiêu

Vấn đề hiện tại (có bằng chứng: file, số liệu), mục tiêu đo được, vì sao làm bây giờ.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| … | … |

## 3. Hợp đồng

API công khai (export, props, hook, endpoint), hành vi bất biến phải giữ, mã lỗi/giá trị mặc định. Viết đủ để một người khác viết test mà không đọc code.

## 4. Thiết kế

Luồng dữ liệu, ranh giới giữa các tầng, file mới/đổi/xóa. Sơ đồ ASCII nếu giúp. Nêu hướng phụ thuộc (ai được import ai).

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| … | … | … |

### Kiến trúc

Module-first, hướng phụ thuộc UI → data → lib, server/client, state thuộc loại nào (server state, client state, UI state, URL state).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | … |
| O | … |
| L | … |
| I | … |
| D | … |

### Conventions

Quy ước dự án liên quan và cách module tuân thủ (hoặc ngoại lệ có lý do).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có | không (<lý do>) · permission = có | không (<lý do>)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| X-1 | … | đúng | khách / user / admin đủ quyền / admin thiếu quyền / — | unit / component / integration / e2e | `tests/<nhóm>/<module>/<file>.test.ts` |
| X-2 | … | lỗi | … | … | `tests/<nhóm>/<module>/<file>.test.ts` |

`Phạm vi` là `toàn module` hoặc `một phần — <phần đã phủ>` (một phần thì chưa tính là xong). `Tình huống` là `đúng` hoặc `lỗi`. Bắt buộc có luồng `đúng` và `lỗi`; `auth = có` cần luồng `khách` và luồng của người đã đăng nhập; `permission = có` cần `admin đủ quyền` và `admin thiếu quyền`; `không` phải kèm lý do trong ngoặc. Ô `Test` là ô cuối.

Ngưỡng coverage riêng của module (nếu có) và vì sao.

## 7. Rủi ro & triển khai

Điều có thể hỏng, cách phát hiện, cách quay lui. Thay đổi hành vi nhìn thấy được (nếu có).

## 8. Lịch sử thay đổi

- YYYY-MM-DD · <thay đổi> (dòng chứa `no-test: <lý do>` miễn yêu cầu test cho thay đổi không đổi hành vi)
