# 09 — Tech spec (viết trước khi code)

Spec là nơi **quyết định thiết kế được viết ra trước khi code**. `docs/` nói code *đang làm gì*; spec nói code *được thiết kế để làm gì và vì sao*. Rule bắt buộc: `.agent/rules/quality-loop.md`. Mẫu: `specs/_template.md`. Ví dụ hoàn chỉnh: `specs/platform/auth.md`.

## 1. Khi nào viết, viết ở đâu

- Mỗi module một file `specs/<nhóm>/<module>.md` (cùng slug với `docs/` và `tests/`). Không tạo file theo từng thay đổi.
- Chạm vào module (thêm tính năng, refactor, sửa bug đổi hành vi) thì **cập nhật spec trước khi code**: sửa mục liên quan, bump `Cập nhật`, thêm một dòng vào *Lịch sử thay đổi*.
- Module mới: tạo spec, thêm entry vào `MODULES` (`scripts/modules.mjs`), tạo doc, tạo `tests/<nhóm>/<module>/`.
- Module cũ chưa có spec (xem `scripts/quality-baseline.json`): lần đầu chạm vào, viết spec mô tả **thiết kế hiện tại + thay đổi định làm**, viết characterization test, rồi gỡ nó khỏi baseline.

## 2. Tám mục và cách viết từng mục

| Mục | Viết gì | Dấu hiệu viết tốt |
|---|---|---|
| 1. Bối cảnh & mục tiêu | Vấn đề *có bằng chứng* (file, số liệu), mục tiêu đo được | Người đọc kiểm tra được vấn đề bằng cách mở file |
| 2. Phạm vi | Bảng **Làm / Không làm (và vì sao)** | Cột "không làm" có lý do, không chỉ danh sách |
| 3. Hợp đồng | API công khai, hành vi bất biến, mặc định, mã lỗi | Đủ để viết test mà không đọc code |
| 4. Thiết kế | Luồng dữ liệu, ranh giới tầng, file mới/đổi/xóa, hướng phụ thuộc | Có sơ đồ ASCII khi có ≥ 3 thành phần |
| 5. Quyết định thiết kế | **Bốn mục con bắt buộc**: Design pattern · Kiến trúc · SOLID · Conventions | Mỗi quyết định có *lý do* và *phương án đã bỏ* |
| 6. Luồng sống còn & kế hoạch test | `Phạm vi`, `Chiều kiểm thử`, rồi bảng ID · luồng · **tình huống** (đúng/lỗi) · **danh tính** · tầng · **đường dẫn test thật** | Mỗi luồng ≥ 1 test; ma trận đủ ô bắt buộc; gate kiểm tra file tồn tại |
| 7. Rủi ro & triển khai | Điều có thể hỏng, cách phát hiện, cách quay lui; thay đổi nhìn thấy được | Mỗi rủi ro gắn với một test hoặc một lệnh |
| 8. Lịch sử thay đổi | Mỗi dòng một thay đổi có ngày | Dòng `no-test: <lý do>` miễn test cho thay đổi không đổi hành vi |

### Mục 5 — cách điền bốn mục con

- **Design pattern**: tên pattern, nó giải quyết cái gì *ở đây*, phương án đã bỏ. Không có pattern phù hợp thì ghi "không áp dụng pattern: hàm thuần là đủ" — đó là một quyết định tốt. Danh mục pattern và khi nào dùng: `11-design-principles.md`.
- **Kiến trúc**: module nằm tầng nào, ai được import ai, state thuộc loại nào (server state, client state, UI state, URL state), server hay client component.
- **SOLID**: bảng 5 dòng; dòng nào không áp dụng thì viết ngắn vì sao (ví dụ L: "không có kế thừa"). Đừng điền cho có: nếu một nguyên tắc bị vi phạm có chủ đích, ghi rõ đánh đổi.
- **Conventions**: quy ước dự án liên quan và ngoại lệ có lý do (i18n, Tailwind-first, `useMoney`, `DataTable`…).

### Mục 6 — ma trận test

Xem `13-test-process.md` mục 2. Tóm tắt: luôn có luồng `đúng` và `lỗi`; `auth = có` thêm `khách` + một danh tính đã đăng nhập; `permission = có` thêm `admin đủ quyền` + `admin thiếu quyền`. Chiều không áp dụng phải ghi `không (<lý do>)`. `Phạm vi: một phần — …` được phép nhưng module chưa tính là xong. Gate (`quality:check`) từ chối ma trận thiếu ô.

## 3. Trạng thái

`Draft` (đang nghĩ) → `Approved` (sẵn sàng code) → `Implemented` (code và test đã khớp). Sau khi code xong phải đưa về `Implemented` và đối chiếu lại mục 3–6 với những gì thực sự làm.

## 4. Sai lầm thường gặp

- Viết spec *sau* khi code (thành bản sao của docs). Spec phải có mục "Không làm" và "Phương án đã bỏ", thứ code không thể hiện.
- Mục 5 chung chung ("áp dụng SOLID"). Mỗi dòng phải trỏ vào một quyết định cụ thể của module.
- Luồng sống còn không có test thật, hoặc test không bắt được lỗi. Dùng *kiểm thử đột biến thủ công*: cố ý làm hỏng code, xem test có đỏ không (xem `10-testing.md`).
- Lẫn kế hoạch vào `docs/`. Kế hoạch ở spec hoặc `specs/_roadmap.md`; `docs/` chỉ có sự thật về code.

## 5. Gate

`yarn quality:check` kiểm tra cấu trúc spec (đủ mục, đủ bốn mục con không rỗng, bảng luồng có test tồn tại, header hợp lệ) và baseline. `yarn quality:check --changed` kiểm tra module đổi code thì spec đổi và có test đổi. Logic kiểm tra nằm ở `scripts/quality-lib.mjs` và được test trong `tests/platform/dev-tooling/`.
