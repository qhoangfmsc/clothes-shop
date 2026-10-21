# 10 — Testing (Vitest · Testing Library · MSW · Playwright)

Rule bắt buộc: `.agent/rules/quality-loop.md`. Test sống **chỉ** dưới `tests/`, phản chiếu `docs/` và `specs/`: `tests/<nhóm>/<module>/`. Chạy: `yarn test`, `yarn test:watch`, `yarn test:coverage`, `yarn test:e2e`.

## 1. Chiến lược: bảo vệ luồng, không chạy theo con số

Theo mô hình *testing trophy* (Kent C. Dodds): nền là kiểm tra tĩnh (`tsc`, ESLint, `check-conventions`), phần lớn test là **integration** (component/hook + API giả ở tầng mạng), unit cho hàm thuần, ít E2E cho hành trình sống còn. Lý do: người dùng không quan tâm hàm nào được gọi; họ quan tâm "bấm thêm vào giỏ thì giỏ có hàng".

| Tầng | Công cụ | Dùng cho | Ví dụ trong repo |
|---|---|---|---|
| Unit | Vitest | Hàm thuần, reducer, validator: không React, không mạng | `tests/platform/auth/session.test.ts`, `tests/platform/data-layer/api-error.test.ts` |
| Integration | Vitest + MSW | Client HTTP, hook, thunk chạy qua `fetch` thật tới API giả | `tests/platform/auth/auth-api.test.ts` |
| Component | Vitest + Testing Library + MSW | Component/provider: hành vi người dùng thấy | `tests/platform/auth/auth-context.test.tsx` |
| E2E | Playwright (API thật) | Vài hành trình sống còn trên trình duyệt thật, cả desktop và phone | `tests/platform/auth/login.e2e.ts`, `tests/e2e/smoke.e2e.ts` |

**Mức rủi ro quyết định độ sâu** (ngưỡng tham khảo từ Google Testing Blog: 60% chấp nhận được, 75% tốt, 90% xuất sắc; không đặt một con số cho cả công ty):

| Tier | Là gì | Yêu cầu |
|---|---|---|
| T0 | Tiền, phiên/đăng nhập, quyền, trạng thái đơn/thanh toán, tồn kho | Mọi nhánh quan trọng có test; ngưỡng dòng ≥ 90% cho file lõi trong `vitest.config.mts`; kiểm thử đột biến thủ công |
| T1 | Luồng có trạng thái (giỏ, form, danh sách có lọc/sắp xếp/phân trang) | Luồng chính + lỗi chính; ngưỡng ≥ 75% cho file lõi |
| T2 | Trình bày thuần (banner, footer, trang tĩnh) | Smoke (E2E hoặc render) + kiểm tra a11y cơ bản; không đặt ngưỡng |

Coverage là **tín hiệu**, không phải mục tiêu: ngưỡng chỉ đặt cho file lõi đã có test và chỉ được **tăng**. Một test chỉ để đủ phần trăm mà không khẳng định gì là nợ, không phải tài sản.

## 2. Ba loại test theo hoàn cảnh

1. **Characterization test** (refactor code cũ): ghi lại hành vi *hiện tại*, chạy xanh trên code cũ, rồi refactor; test phải còn xanh. Đây là lưới an toàn của chương trình refactor (`specs/_roadmap.md`). Mẫu: `auth-api.test.ts` trước khi có `session.ts`.
2. **Test cho hành vi mới**: viết test đỏ trước (hoặc cùng lúc), rồi code cho xanh. Mẫu: `session-dedupe.test.ts` đỏ trên code cũ (3 lần refresh), xanh sau khi gộp.
3. **Test hồi quy cho bug**: tái hiện bug trước khi sửa. Không có test tái hiện thì chưa hiểu bug.

## 3. Quy tắc viết test

- **Đặt tên theo luồng trong spec**: `describe("SES-4 session expiry")`, `it("clears the tokens, announces the expiry…")`. Người đọc tìm được test từ spec và ngược lại.
- **Khẳng định hành vi nhìn thấy được** (kết quả, lỗi ném ra, `localStorage`, request gửi đi, chữ trên màn hình), không khẳng định chi tiết cài đặt (hàm nào được gọi bao nhiêu lần, state nội bộ).
- **Component: truy vấn theo cách người dùng thấy** (`getByRole`, `getByText`), không theo class/test-id trừ khi bất khả kháng.
- **Mạng: dùng MSW, không mock từng module.** `tests/_support/msw-server.ts` chạy ở chế độ `onUnhandledFrame: "error"`: request không có handler làm test đỏ, nên test không thể chạm mạng thật và có thể chứng minh "không gọi API này" bằng cách không khai báo handler. Mock module chỉ cho thứ không phải mạng (ví dụ `@/src/i18n/navigation`, như `auth-context.test.tsx`).
- **Mỗi test độc lập.** `tests/_support/setup.ts` dọn `localStorage`, `sessionStorage`, handler và DOM sau mỗi test. State ở mức module (như promise refresh) tự sạch vì `finally`; nếu module của bạn giữ state ở mức module thì cung cấp hàm reset cho test thay vì chia sẻ thứ tự chạy.
- **Không sleep, không timer thật dài.** Dùng `waitFor`, `await` đúng thứ; MSW `delay(10)` đủ để tạo đồng thời.
- **Ngày giờ, ngẫu nhiên, mạng** luôn được kiểm soát trong test. Flaky = lỗi: sửa hoặc xóa, không retry cho qua.
- **Một test hỏng vì lý do duy nhất.** Nhiều khẳng định về cùng một kết quả thì được; nhiều hành vi thì tách test.
- **Dữ liệu mẫu** tối thiểu và tên có nghĩa (`USER`, `STORAGE_URL`); helper dùng chung vào `tests/_support/`.
- **Đừng test thư viện** (Redux, SWR, Next). Test cách module *dùng* chúng.

## 4. Kiểm chứng test có bắt được lỗi (kiểm thử đột biến thủ công)

Test xanh chưa chứng minh test tốt. Với file T0, sau khi viết test: cố ý làm hỏng một dòng logic (bỏ dedupe, gửi sai token, bỏ điều kiện `public`), chạy `yarn test`, phải thấy test đỏ; rồi khôi phục. Mẫu đã làm cho `session.ts` (bỏ dedupe → 2 test đỏ; bỏ sự kiện hết phiên → 4 test đỏ).

Không làm tay: ghi các đột biến vào `tests/<module>/mutants.json` (`name`, `file`, `find`, `replace`) và chạy `yarn test:mutants <module>`. Công cụ áp từng đột biến lên file thật, chạy test của module, **khôi phục file** (kể cả khi Ctrl-C), rồi báo đột biến nào *sống sót*. Một đột biến mà `find` không còn khớp báo lỗi to thay vì lặng lẽ sống sót. Thoát 1 nếu còn sống sót. Đột biến mà test không bắt được là lỗ hổng *hoặc* đột biến tương đương (hành vi không đổi): xác định cái nào. Khi các module T0 đã có test, dùng công cụ tự động (Stryker) thay cho cách thủ công.

### Ma trận danh tính và bộ khung render

Mỗi module có ma trận (`13-test-process.md` mục 2): luồng `đúng`/`lỗi` × `khách`/`user`/`admin đủ quyền`/`admin thiếu quyền`. Test component dùng `renderApp` (`tests/_support/render.tsx`):

```tsx
await renderApp(<Page />, { as: "adminLimited" });   // guest | user | adminFull | adminLimited | một AuthUser riêng
```

- `renderApp` bọc component bằng bản dịch thật (`locale: "vi" | "en"`), `AuthProvider` thật (MSW trả `GET /api/auth/me` theo danh tính), và các provider theo đúng thứ tự của `app/[locale]/layout.tsx`. Mặc định chờ phiên xác định xong (`waitForAuth: false` để thấy trạng thái đang tải); trả thêm `user` và `rerender` giữ nguyên provider.
- `adminLimited` chỉ có `ORDER_ADMIN_VIEW`; mọi test "không có quyền" xin một quyền khác.
- Router và popup Google là bản giả cài sẵn cho mọi test: `navigation` (`tests/_support/navigation.ts`: `pathname`, `router.push/replace…`), `google` (`google.succeed(code)`, `google.fail()`).
- Chữ hiển thị lấy bằng `msg("namespace.key")`, không viết cứng.
- Cần Redux store, `next/navigation` (`useSearchParams`, `useParams`) hoặc thứ khác chưa có: mở rộng harness **một lần, dùng chung** và thêm test cho phần mở rộng.

## 5. E2E trên API thật

FE và BE chạy trên server nên E2E dùng **API thật**: kiểm chứng hợp đồng thật nhưng có rủi ro làm bẩn dữ liệu, nên:

- Mặc định **chỉ đọc**. Test ghi dữ liệu thật dùng `test` từ `tests/_support/e2e.ts` với fixture `requireWrites`, chỉ chạy khi `E2E_ALLOW_WRITES=1`, và chỉ bật khi API phía sau **không phải dữ liệu production**.
- Hai loại luồng: **chưa đăng nhập** (`*.e2e.ts`, luôn chạy) và **đã đăng nhập** (`*.auth.e2e.ts`, chạy sau project `setup`). Popup Google không tự động hóa được nên luồng đã đăng nhập dùng **refresh token của một tài khoản test riêng** trong `.env.e2e.local` (ngay ở root, đã gitignore; mẫu `.env.e2e.example`). Chỉ một token, sống 30 ngày; `setup` tự lấy access token và **dừng với thông báo rõ khi token hết hạn** (xem `tests/README.md`). Không bao giờ commit token, mật khẩu hay `.auth/`. Luồng đã đăng nhập tự `skip` khi chưa có token.
- Dữ liệu test tự tạo phải tự dọn trong fixture (kể cả khi test lỗi) và có tiền tố nhận diện (`e2e-<timestamp>-…`) để dọn tay được.
- Mỗi test độc lập, không phụ thuộc thứ tự; chạy ở cả hai project (`desktop` 1440 và `phone` Pixel 7). Test phải kiểm tra không có cuộn ngang khi liên quan bố cục.
- `E2E_BASE_URL` để chạy trên bản đã deploy; bỏ trống thì Playwright dùng/khởi động `yarn dev` (dùng API trong `.env.local`).
- Giữ ít, ổn định, chọn theo `specs/_critical-flows.md`. Logic nghiệp vụ kiểm ở tầng integration, không ở E2E.

## 6. Công cụ & cấu hình

| Thứ | Nơi |
|---|---|
| Vitest (jsdom, alias `@/`, `NEXT_PUBLIC_API_URL=http://api.test`, ngưỡng coverage theo file) | `vitest.config.mts` |
| Setup chung (jest-dom, MSW, dọn storage) | `tests/_support/setup.ts`, `msw-server.ts`, `api.ts` |
| Khung render (`renderApp`, `IDENTITIES`, `msg`, router/Google giả) | `tests/_support/render.tsx`, `identities.ts`, `messages.ts`, `navigation.ts`, `google.ts` |
| Playwright (desktop + phone, API thật) | `playwright.config.ts`, `tests/_support/e2e.ts`, `e2e-session.ts`, `auth.setup.ts` |
| CI | `.github/workflows/ci.yml` |

Phiên bản đang dùng có API khác bản cũ (ví dụ MSW 3 dùng `onUnhandledFrame`, không phải `onUnhandledRequest`): khi tài liệu mạng và code không khớp, đọc `.d.ts` trong `node_modules` rồi viết test nhỏ chứng minh hành vi.

## 7. Checklist cho một module

- [ ] Mỗi luồng ở mục 6 của spec có test và test nằm đúng `tests/<nhóm>/<module>/`.
- [ ] Đã thử phá code cố ý ở file T0 và test đã đỏ.
- [ ] Không test nào gọi mạng thật (unit/integration/component); E2E chỉ đọc nếu không bật `E2E_ALLOW_WRITES`.
- [ ] Ngưỡng coverage của file lõi đã thêm hoặc nâng; không hạ.
- [ ] `yarn test`, `npx tsc --noEmit`, `yarn quality:check --changed` xanh.
