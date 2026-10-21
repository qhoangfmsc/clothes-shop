# Chương trình refactor toàn dự án

Mục tiêu: đưa **mọi module** (hiện 39, trong đó 36 chưa có spec và test, xem `scripts/quality-baseline.json`) lên cùng một chuẩn, đã làm mẫu ở `platform/auth`: có tech spec với các quyết định thiết kế rõ ràng, có test bảo vệ luồng sống còn, rồi mới refactor theo Design pattern / Kiến trúc / Conventions / SOLID dưới lưới an toàn của test. Đây là kế hoạch; sự thật về code nằm ở `docs/`.

## Nguyên tắc chạy chương trình

1. **Test trước, refactor sau.** Với module cũ: viết *characterization test* (khóa hành vi hiện tại) → xanh trên code cũ → refactor → vẫn xanh. Mẫu đã làm trọn: [platform/auth](platform/auth.md).
2. **Một module mỗi lần, theo thứ tự rủi ro × giá trị** (bảng dưới). Mỗi lần: spec → test → code → docs → gate → gỡ khỏi baseline.
3. **Không refactor nếu chưa có luồng nào cần giữ.** Module thuần trình bày chỉ cần smoke test và spec ngắn.
4. **Baseline chỉ ngắn đi.** Gate không cho thêm module vào danh sách chưa phủ.
5. **Ngưỡng coverage chỉ tăng.** Khi một module vào chuẩn, thêm ngưỡng cho các file lõi của nó trong `vitest.config.mts`; không hạ ngưỡng để qua build.

## Thứ tự và cách chạy

Kế hoạch nằm ở `scripts/test-batches.json`: **8 batch, mỗi batch tối đa 5 module**, xếp theo rủi ro × giá trị (hàm thuần và tiền trước, rồi giỏ hàng/checkout, admin dùng chung, admin còn lại, trang đọc của khách, nội dung, khung giao diện). Lý do và trọng tâm của từng batch nằm trong chính file đó; tình hình thật luôn lấy bằng `yarn test:progress` (tiến độ được *tính* từ repo, không ghi tay).

**Mỗi phiên làm một batch rồi dừng**, theo `.agent/skills/13-test-process.md` (skill `test-process`). Việc refactor theo SOLID/pattern của từng module (ví dụ tách `ProductsContent`, `ProductDetailClient`, `HamburgerMenu`; một chiến lược server-state cho admin; factory cho bộ thunk lặp ở 11 slice; một nơi persist cho cart/wishlist) làm **sau khi** module có test, trong chính batch của nó, theo mục 5 và 7 của spec module.

## Các phần của nhánh `refactor/fe-overhaul`

Làm lần lượt; sau mỗi phần: chạy lại mọi cổng, commit lên nhánh, báo cáo, chờ chủ dự án xác nhận mới sang phần tiếp theo. Nhánh này được merge vào `main` hay không do chủ dự án quyết định.

| # | Phần | Nội dung | Trạng thái |
|---|---|---|---|
| 1 | Nhánh và commit nền | Chuyển toàn bộ code đang dở sang nhánh; tách commit: việc có sẵn từ `main`, hạ tầng test, lớp phiên auth, cổng chất lượng và quy trình | xong |
| 2 | Quy tắc comment | `.agent/rules/comments.md`, kiểm bằng `comment-length`, baseline chỉ ngắn đi; rút gọn comment ở các file của đợt refactor | xong |
| 3 | Rút gọn comment toàn dự án | 142 file trong `scripts/comment-baseline.json`, rút gọn dần cho tới khi baseline rỗng | chưa |
| 4–11 | Batch 1 đến 8 của quy trình test | Mỗi batch tối đa 5 module (`scripts/test-batches.json`, `.agent/skills/13-test-process.md`); mỗi batch là một phần | chưa |
| 12 | Nợ thiết kế đã biết | Sau khi có test: bỏ `baseCrudReducers` chết, factory cho bộ thunk, một nơi persist cho cart/wishlist, đảo hướng import của hai hook, chọn một chiến lược server-state cho admin | chưa |
| 13 | Component quá lớn và giao diện | Tách `HamburgerMenu`, `ProductDetailClient`, `ProductsContent`; thay `style={{}}` bằng Tailwind; thẻ `<main>` trang chủ; 14 chỗ `exhaustive-deps` | chưa |
| 14 | Kiểm tra cuối | `yarn build` (cần tắt dev server), rà CI, tổng kết | chưa |

## Xong một module nghĩa là

`yarn test:progress` hiện module ✓, tức là: spec `Implemented` cho toàn module; **ma trận đủ** (luồng đúng và lỗi; khách và người đã đăng nhập khi có auth; admin đủ quyền và admin thiếu quyền khi có permission; chiều nào bỏ thì có lý do); mỗi luồng có test; module đã rời `scripts/quality-baseline.json`. Cộng với những điều máy không kiểm: `yarn test:mutants <module>` bắt hết đột biến, mục 5 spec đủ bốn mục con với lý do, doc và `specs/_critical-flows.md` cập nhật, ngưỡng coverage của file lõi (T0 ≥ 90%, T1 ≥ 75%) đã đặt. Chi tiết: `.agent/skills/13-test-process.md` mục 1.

## Việc ngoài từng module (làm khi tới lượt)

- Quyết định sản phẩm: `apiFetchStandalone` (giỏ/wishlist) có nên tự refresh token? Hiện không (xem [auth](platform/auth.md) mục 2).
- Quy tắc mới trong `scripts/check-conventions.mjs` khi một quy ước lặp lại bị vi phạm (cách làm đã có sẵn).
- Mutation testing (Stryker) cho các file T0 sau khi đợt 1 xong, để kiểm tra *chất lượng* test chứ không chỉ độ phủ.
- E2E hành trình khách (duyệt → giỏ → checkout) khi có môi trường API cho phép ghi (xem `tests/README.md`).
