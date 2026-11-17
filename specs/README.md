# Tech specs — clothes-shop (FE)

Mỗi module có **một tech spec sống** tại `specs/<nhóm>/<module>.md` (cùng slug với `docs/<nhóm>/<module>.md` và `tests/<nhóm>/<module>/`). Spec là nơi **quyết định thiết kế được viết ra trước khi code**: mục tiêu, hợp đồng, kiến trúc, pattern áp dụng, lý do theo SOLID, và những luồng sống còn phải có test.

| Thứ | Trả lời câu hỏi | Viết khi nào | Nơi |
|---|---|---|---|
| **Spec** | Module *sẽ/được thiết kế* thế nào và vì sao? Luồng nào không được hỏng? | **Trước** khi code | `specs/` |
| **Test** | Những luồng đó còn chạy đúng không? | Cùng lúc với code (characterization test trước khi refactor) | `tests/` |
| **Docs** | Module *đang* làm gì? (sự thật về code, không kế hoạch) | **Sau** khi code | `docs/` |

Vòng lặp bắt buộc: `docs:who` → đọc doc + code → **cập nhật spec** → **viết/cập nhật test** → code → **cập nhật docs** → `yarn quality:check --changed` + `yarn docs:check --changed`. Chi tiết: `.agent/rules/quality-loop.md`, `.agent/skills/09-tech-specs.md`, `.agent/skills/10-testing.md`.

## Quy tắc

- Một module = một file spec. Không gộp, không tách. Mẫu: [`_template.md`](_template.md).
- Spec được phép có kế hoạch và lý do (khác `docs/`). Khi code xong, đổi **Trạng thái** thành `Implemented` và giữ spec khớp với thiết kế đã làm; quyết định đổi thì sửa tại chỗ và ghi một dòng vào mục *Lịch sử thay đổi*.
- Mục **5. Quyết định thiết kế** là bắt buộc và có đủ bốn mục con: Design pattern · Kiến trúc · SOLID · Conventions. Không áp dụng thì ghi rõ vì sao.
- Mục **6. Luồng sống còn & kế hoạch test** khai `Phạm vi`, `Chiều kiểm thử` (auth / permission có hay không, kèm lý do nếu không) và bảng luồng gán mỗi luồng một **tình huống** (`đúng`/`lỗi`) và một **danh tính** (`khách`, `user`, `admin đủ quyền`, `admin thiếu quyền`, `—`), kèm test phủ nó (đường dẫn thật dưới `tests/`). Gate kiểm tra ma trận đủ ô bắt buộc và các file test tồn tại; `yarn test:progress` cho biết module đã xong chưa.
- File bắt đầu bằng `_` là tài liệu chung, không phải spec của module: [`_critical-flows.md`](_critical-flows.md) (luồng sống còn toàn dự án), [`_roadmap.md`](_roadmap.md) (chương trình refactor các module cũ).

## Module chưa có spec

Module nằm trong `pending` của `scripts/quality-baseline.json` chưa có spec và test. Danh sách này **chỉ được ngắn đi**: chạm vào module đó (sửa code) thì phải tạo spec + test và gỡ nó khỏi danh sách trong cùng thay đổi. Cả dự án được làm theo batch (tối đa 5 module mỗi phiên): xem [`_roadmap.md`](_roadmap.md) và `yarn test:progress`.

## Mục lục

| Module | Spec | Trạng thái |
|---|---|---|
| Auth | [platform/auth.md](platform/auth.md) | Implemented |
| Data layer | [platform/data-layer.md](platform/data-layer.md) | Implemented |
| Tooling & deploy | [platform/dev-tooling.md](platform/dev-tooling.md) | Implemented |
