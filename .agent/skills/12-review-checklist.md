# 12 — Checklist tự review trước khi xong / trước khi merge

Dùng sau khi code, trước khi báo xong; người review dùng cùng danh sách. Mỗi mục "không" phải có lý do được ghi trong spec (mục 5) hoặc trong PR.

## Quy trình
- [ ] Đã `yarn docs:who`, đọc doc + spec + code trước khi sửa; code và doc khớp (hoặc doc đã được sửa trước).
- [ ] Spec đã cập nhật **trước** khi code (mục 5 đủ bốn mục con, có lý do và phương án đã bỏ).
- [ ] Mỗi luồng sống còn trong spec có test; bug sửa có test tái hiện.
- [ ] Ma trận đủ: luồng `đúng` và `lỗi`; `khách` + người đã đăng nhập khi có auth; `admin đủ quyền` + `admin thiếu quyền` khi có permission (chiều nào bỏ thì có lý do).
- [ ] `yarn test:mutants <module>` bắt hết đột biến; `yarn test:progress` hiện module ✓.
- [ ] Gate xanh: `yarn quality:check --changed`, `yarn docs:check --changed`, `yarn test`, `npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`.

## Kiến trúc
- [ ] Code dùng riêng nằm trong module (`_common/`, `_components/`); chỉ code dùng ≥ 2 module mới lên `src/` root.
- [ ] Hướng phụ thuộc một chiều UI → hook/slice → lib; `lib/` không import module.
- [ ] State đúng loại (server / client toàn cục / UI / URL); không sao chép dữ liệu server vào store nếu không ai đọc.
- [ ] Không `index.ts` barrel; không `fetch` trực tiếp trong component; không URL/`process.env` trong component.

## Design pattern
- [ ] Mỗi pattern dùng đều giải quyết một nỗi đau cụ thể (trùng ≥ 3 chỗ, khó test, khó đổi). Không có pattern "cho đẹp".
- [ ] Không thêm cách thứ hai cho việc đã có cách chung (tiền, lỗi, phiên, list, toast, carousel, bảng).
- [ ] Abstraction mới có ít nhất hai nơi dùng hoặc một test cần nó.

## SOLID
- [ ] **S** — Mỗi component/hook/hàm mô tả được bằng một câu không có chữ "và". File > ~400 dòng hoặc component > ~8 hook thì đã cân nhắc tách.
- [ ] **O** — Biến thể mới thêm bằng prop/hàm, không `if` theo tên người dùng bên trong code dùng chung.
- [ ] **L** — Component bọc giữ hợp đồng của phần tử gốc, hoặc đổi có chủ đích và đã ghi.
- [ ] **I** — Props/tham số nhỏ, `Pick<>` thay vì cả object khi chỉ cần vài trường.
- [ ] **D** — Phụ thuộc vào hook/hàm công khai (không vào chi tiết cài đặt); test thay được phần dưới bằng MSW/props.

## Conventions
- [ ] Code/identifier/comment/commit tiếng Anh; chữ hiển thị qua i18n, có đủ mọi locale.
- [ ] Tailwind-first (không `.css` mới, `style={{}}` chỉ cho giá trị động); điều hướng qua `@/src/i18n/navigation`.
- [ ] Không `any`; ngoại lệ (`conventions-ignore`, `eslint-disable`) có lý do tại dòng đó.
- [ ] UI: đã kiểm 390 / 768 / 1024 / 1440 / 1920 hoặc nói rõ chưa chạy trình duyệt; mọi tính năng hover có đường cảm ứng.

## Báo cáo
- [ ] Liệt kê doc/spec đã đọc và đã cập nhật, test đã thêm.
- [ ] Có ghi chú "Vì sao" (pattern/nguyên tắc nào, ở đâu, tại sao) 2–6 dòng.
- [ ] Nói rõ gate nào chưa chạy hoặc chưa qua.
