# Auth (phiên đăng nhập) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented
> **Doc:** [platform/auth](../../docs/platform/auth.md) · **Test:** `tests/platform/auth/`

## 1. Bối cảnh & mục tiêu

**Vấn đề.** Việc "giữ phiên" (lưu token, làm mới token khi 401, hết phiên) đang được viết lại ở nhiều nơi:

| Nơi | Lặp lại gì |
|---|---|
| `src/lib/auth-api.ts` | `getToken`, `setToken`, `clearTokens`, `doRefresh`, `refreshOnce` (dedupe toàn cục), vòng 401 → refresh → thử lại |
| `src/hooks/use-api-auth.ts` | Bản sao y hệt các hàm trên, dedupe riêng theo từng instance hook, vòng 401 → refresh → thử lại thứ hai |
| `src/contexts/auth-context.tsx` | Hằng khóa token và `localStorage.get/set/removeItem` rải rác (9 chỗ) |
| `use-api-auth.ts` / `auth-api.ts` | Cùng một đoạn "đọc body lỗi → `new ApiError(...)`" (xem spec [data-layer](./data-layer.md)) |

Hậu quả: sửa lỗi refresh ở một nơi dễ quên nơi kia; hai bản dedupe có phạm vi khác nhau (toàn cục và theo instance) nên hai request đồng thời đi qua hai client khác nhau vẫn gọi refresh nhiều lần cho cùng một lần hết hạn. BE không xoay vòng refresh token (`auth.service.ts` của BE chỉ trả access token mới, refresh sống 30 ngày, access 1 ngày), nên các lần thừa không làm người dùng bị đăng xuất; hậu quả chỉ là request thừa và nhiều lần ghi cùng một token.

**Mục tiêu.**
1. Một nơi duy nhất sở hữu "phiên": lưu/đọc/xóa token, làm mới có dedupe, báo hết phiên.
2. `authApi`, `useApiAuth().apiFetch`, `apiFetchStandalone` và `AuthProvider` đều dùng nơi đó; không còn hằng khóa token hay `doRefresh` trùng.
3. **Không đổi hành vi nhìn thấy được** (trừ dedupe trở thành toàn cục, xem mục 7). Mọi hành vi hiện tại được khóa bằng test trước khi refactor.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Tạo `src/lib/session.ts` (token store + refresh có dedupe + `expireSession` + `requestWithSession`) | Cho `apiFetchStandalone` tự refresh: đây là quyết định sản phẩm (cart/wishlist sync nền có nên đẩy người dùng ra khỏi phiên?), không phải việc của refactor. Giữ nguyên "không refresh" |
| `authApi`, `useApiAuth`, `apiFetchStandalone` dùng `session.ts` | Đổi nơi lưu token sang cookie `httpOnly` (đổi mô hình bảo mật, cần BE) |
| `AuthProvider` dùng hàm token của `session.ts` | Gộp `fetchMe` / `tryRefresh` / `login` của `AuthProvider` vào `session.ts`: chúng cần `user` trong phản hồi và có quy tắc xóa token khác, thuộc trách nhiệm "trạng thái danh tính" |
| `use-media-upload.ts` lấy token từ `session.ts` | Thêm refresh cho upload (hiện không có, giữ nguyên) |
| Phủ test cả phần còn lại của module theo ma trận (guard, quyền, popup đăng nhập, mật khẩu hệ thống, đăng xuất, nút Google, màn chặn) | Đổi hành vi của các phần đó: chỉ khóa hành vi hiện tại bằng test. Các quan sát dưới mục 3 là *sự thật hiện tại*, không phải quyết định mới |

## 3. Hợp đồng

Hành vi bất biến (mỗi dòng có test ở mục 6):

- **Token**: access ở `localStorage["clothes_shop_access_token"]`, refresh ở `["clothes_shop_refresh_token"]`. Phía server (không có `window`) đọc trả `null`.
- **Gắn token**: request có phiên gửi `Authorization: Bearer <access>` khi có access token; không có thì không gửi header đó. `public: true` (chỉ `apiFetch`) không bao giờ gửi.
- **401 → refresh → thử lại một lần**: chỉ khi request có phiên. Refresh = `POST {API}/api/auth/refresh` body `{ refreshToken }`; thành công lưu `accessToken` mới và thử lại đúng một lần với token đó; thử lại vẫn 401 thì lỗi `ApiError("API error: 401", 401)` như mọi lỗi khác.
- **Hết phiên**: refresh không thể (không có refresh token, `!res.ok`, lỗi mạng) → `clearTokens()` + phát `window` event `auth:session-expired` + ném `ApiError("", 401)`. `!res.ok` hay lỗi mạng khi refresh còn xóa token ngay trong lúc refresh.
- **Dedupe**: các lần refresh chồng nhau dùng chung một request; xong thì cho phép refresh mới.
- **`apiFetchStandalone`**: gắn token nếu có, **không** refresh, **không** phát event hết phiên.
- **`authApi`**: `put/patch/delete/post` thành công tới đường dẫn bắt đầu `/api/admin/` gọi `notifyAdminMutation()`; `GET`, đường dẫn khác và request lỗi thì không.
- **Lỗi BE** → `ApiError(message || "API error: <status>", status, errorCode)`.
- **Kết quả**: `authApi` trả `res.json()` nguyên; `apiFetch` và `apiFetchStandalone` trả qua `mapMediaUrls` (trừ `raw: true` ở `apiFetch`). `FormData` được gửi nguyên (không `Content-Type`).

**Hành vi của phần danh tính và quyền (khóa bằng test, không đổi):**

- `hasPermission`: nếu `user.permissions` có phần tử thì **chỉ** xét danh sách đó (ghi đè role); mảng rỗng hoặc vắng thì xét theo role (`admin` có đủ 28, `user` không có gì). Role lạ hoặc quyền lạ → `false`. FE **không** xét `status` của tài khoản (BE từ chối các lệnh gọi).
- `canAccessAdmin`: role `admin` hoặc có ít nhất một permission. Một tài khoản `user` được cấp permission riêng vào được khu admin (nhân viên).
- `hasAllPermissions(user, [])` là `true` (điều kiện rỗng thì thỏa), `hasAnyPermission(user, [])` là `false`.
- `RoleGuard`: đang tải phiên → `loading` (mặc định chữ "đang kiểm tra"); khách → `fallback`; mọi điều kiện đã cho (`role`, `permission`, `permissions`, `anyPermission`) phải cùng thỏa; không có điều kiện thì mọi người đã đăng nhập đều qua. `AdminGuard`: không `canAccessAdmin` → khối từ chối (hoặc `fallback`).
- `requireAuth(action, loginAction)`: đã đăng nhập → chạy ngay; khách → phát `login-prompt:open` với `{ onSuccess: action, action: loginAction }` (mặc định `continue`) và **không** chạy. Popup: chạy `action` sau 100 ms khi chuyển từ khách sang đã đăng nhập lúc popup đang mở; đóng popup (nút, X, Esc, nền) hủy `action`.
- Mật khẩu hệ thống: mở khóa lưu timestamp ở `sessionStorage["admin_system_unlocked_at"]`, hết hạn đúng 15 phút (mốc 15:00 đã khóa); giá trị hỏng → khóa; server → khóa. Sai mật khẩu → báo lỗi, xóa ô nhập, vẫn khóa; hủy hoặc bấm nền → `false`. Cổng admin kiểm lại mỗi lần đổi `pathname`; hủy → `router.replace("/")`.
- `SignOutButton`: hỏi xác nhận (`alertdialog`); xác nhận → `logout()` rồi `onSignedOut`; hủy → không làm gì.
- Nút Google: khóa tới khi tick điều khoản; nhận mã từ popup → `login(code)`; trên `/login` (`redirectAfterLogin`) chuyển tới trang cuối cùng hoặc `/`; lỗi hiện thông điệp của API (hoặc `auth.login.google.failed`); popup bị đóng → `auth.login.google.cancelled`.
- Màn chặn khách (`UnauthenticatedState`) không đóng được và khóa cuộn trang; `/unauthorized` hiện câu và nút khác nhau cho khách và người đã đăng nhập, kèm nhãn role.

API mới của `src/lib/session.ts`:

```ts
getAccessToken(): string | null
getRefreshToken(): string | null
saveAccessToken(token: string): void
saveTokens(access: string, refresh: string): void
clearTokens(): void
SESSION_EXPIRED_EVENT: "auth:session-expired"
expireSession(): void                      // clearTokens + dispatch event
refreshAccessToken(): Promise<string | null>   // dedupe toàn cục
requestWithSession(
  send: (token: string | null) => Promise<Response>,
  options?: { authenticated?: boolean },   // mặc định true
): Promise<Response>                         // đã xử lý 401 → refresh → thử lại / hết phiên
```

## 4. Thiết kế

```
Component / thunk / SWR
   │
   ├─ authApi.get|post|…        ┐
   ├─ useApiAuth().apiFetch     ├─►  requestWithSession(send)  ─►  fetch
   └─ apiFetchStandalone        ┘         │   (không dùng requestWithSession: không refresh)
                                          ▼
AuthProvider ──► getAccessToken / saveTokens / clearTokens      session.ts  (token + refresh + hết phiên)
                                                                 api.ts      (ApiError, toApiError)
```

- Hướng phụ thuộc: `auth-api.ts`, `use-api-auth.ts`, `auth-context.tsx`, `use-media-upload.ts` → `session.ts` → `api.ts`. `api.ts` không import `session.ts` (không có vòng).
- `session.ts` là module thuần TS (không React, không `"use client"`), nên gọi được từ thunk, hook, và test không cần render.
- Mỗi client giữ phần riêng của nó: `authApi` (JSON, phát `notifyAdminMutation`), `apiFetch` (FormData, `public`, `raw`, `mapMediaUrls`), `apiFetchStandalone` (không refresh). Phần chung nằm ở `requestWithSession`.
- Xóa: `getToken/setToken/clearTokens/doRefresh/refreshOnce` trong `auth-api.ts` và `use-api-auth.ts`; hằng `TOKEN_KEY/REFRESH_KEY` ở cả ba file. `auth-api.ts` không còn export `getAccessToken`, `clearTokens`, `SESSION_EXPIRED_EVENT`, `expireSession` (người dùng import thẳng từ `session.ts`).

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Facade**: ba client (`authApi`, `apiFetch`, `apiFetchStandalone`) giữ API quen thuộc, che `session.ts` | Các chỗ gọi hiện có (rải ở khoảng 20 file) không phải đổi | Bắt mọi nơi gọi `requestWithSession` trực tiếp: lộ chi tiết, đổi hàng loạt file |
| **Higher-order function / Strategy**: `requestWithSession(send)` nhận *cách gửi* từ client, chỉ lo vòng phiên | Phần khác nhau giữa các client (body, header, parse) tách khỏi phần giống nhau (401 → refresh → thử lại) mà không cần kế thừa | Class `HttpClient` với cấu hình: nặng cho 3 caller, thêm một lớp khái niệm |
| **Singleton ở mức module** cho promise refresh | Một trình duyệt = một phiên; dedupe phải dùng chung giữa mọi client | `useRef` theo instance (đang có, sai phạm vi) |
| **Observer** (`window` event `auth:session-expired`) giữ nguyên | `AuthProvider` (React) và `session.ts` (không React) không biết nhau | Truyền callback/context vào `session.ts`: kéo React vào lớp thấp |
| **Test double ở biên** (MSW cho API, bản giả cho router và popup Google) thay vì mock từng module nội bộ | Component chạy qua `AuthProvider`, guard và provider thật; test phát hiện lỗi nối dây giữa chúng | Mock `useAuth` ở từng test (nhanh, nhưng không kiểm tra provider thật) |
| **Fixture danh tính** (`IDENTITIES`: khách, user, admin đủ quyền, admin thiếu quyền) | Ma trận test dùng đúng bốn người dùng ở mọi file | Mỗi test tự dựng user |

### Kiến trúc

- Tầng: UI → client (`authApi`/`apiFetch`) → `session.ts` → `api.ts`/`fetch`. `session.ts` nằm trong `src/lib/` vì được dùng bởi ≥ 2 module (auth, data-layer, cart, wishlist qua client).
- State thuộc loại **client state ngoài React** (token trong `localStorage`); user là state React trong `AuthProvider`. Hai thứ nối với nhau bằng event, không phải bằng import.
- Không tạo `index.ts` barrel (rule 7).

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `session.ts` chỉ làm một việc: vòng đời phiên. Client chỉ làm phần của riêng nó (dựng request, phân tích kết quả). `AuthProvider` giữ trạng thái danh tính |
| O | Thêm một client mới (ví dụ upload có refresh) = viết một `send` và gọi `requestWithSession`; không sửa `session.ts` |
| L | Không có kế thừa. Ba client có cùng ngữ nghĩa lỗi (`ApiError`), nên chỗ gọi đổi client không đổi cách xử lý lỗi |
| I | `session.ts` xuất hàm nhỏ, mỗi nơi chỉ import cái cần (`AuthProvider` chỉ cần token, không cần `requestWithSession`) |
| D | Client và `AuthProvider` phụ thuộc hàm của `session.ts` thay vì tự đọc `localStorage` và tự `fetch` refresh; test thay `fetch` bằng MSW, không mock từng module |

### Conventions

- Code, comment, tên tiếng Anh; không UI text mới nên không đụng i18n.
- Không `any`; `unknown` ở chỗ dữ liệu BE chưa kiểm chứng.
- Khối comment đầu file theo kiểu các file `lib/` hiện có; comment giải thích *vì sao* (ví dụ vì sao `expireSession` được gọi cả khi không có refresh token).
- Lỗi đi qua `ApiError` (xem [06-errors-and-toasts](../../.agent/skills/06-errors-and-toasts.md)).

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có · permission = có

Test đặc tả hành vi **chạy xanh trên code cũ trước khi refactor** và vẫn xanh sau đó (characterization → refactor an toàn). Các test có danh tính dùng `renderApp` (`tests/_support/render.tsx`).

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| SES-1 | Gắn Bearer khi có token; không gắn khi không có; POST gửi JSON | đúng | user | integration | `tests/platform/auth/auth-api.test.ts` |
| SES-2 | 401 → refresh → thử lại với token mới; token mới được lưu | đúng | user | integration | `tests/platform/auth/auth-api.test.ts` |
| SES-3 | Nhiều request 401 cùng lúc chỉ gọi refresh một lần (kể cả qua hai client khác nhau) | đúng | user | integration | `tests/platform/auth/session-dedupe.test.ts` |
| SES-4 | Không refresh được → xóa token, phát event, `ApiError("", 401)` | lỗi | user | integration | `tests/platform/auth/auth-api.test.ts` |
| SES-5 | `apiFetch`: `public` không gắn token và không refresh; `FormData` gửi nguyên; `raw` giữ URL; media được map | đúng | user | integration | `tests/platform/auth/use-api-auth.test.tsx` |
| SES-6 | `apiFetchStandalone` không refresh khi 401 và không phát event | lỗi | user | integration | `tests/platform/auth/use-api-auth.test.tsx` |
| SES-7 | `authApi` ghi thành công tới `/api/admin/` phát `notifyAdminMutation`; GET, đường dẫn khác, lỗi thì không | đúng | admin đủ quyền | integration | `tests/platform/auth/auth-api.test.ts` |
| SES-8 | Lỗi BE → `ApiError(message, status, errorCode)`, fallback `API error: <status>` | lỗi | — | integration | `tests/platform/auth/auth-api.test.ts` |
| SES-9 | Hàm token: đọc/ghi/xóa, `window` vắng thì `null` | đúng | — | unit | `tests/platform/auth/session.test.ts` |
| ID-1 | `AuthProvider` khôi phục phiên: `/me` ok → có `user`; không có token → khách | đúng | user | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-2 | `/me` lỗi → refresh ok → có `user`; refresh lỗi → xóa token, thành khách | lỗi | user | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-3 | `login` lưu token + email gợi ý, đặt `user` | đúng | khách | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-3E | `login` lỗi từ BE → `ApiError`, vẫn là khách | lỗi | khách | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-4 | `logout` xóa token và `user`, giữ email gợi ý | đúng | user | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-5 | Event hết phiên → `user = null` | lỗi | user | component | `tests/platform/auth/auth-context.test.tsx` |
| ID-6 | Trang cuối cùng: ghi đường dẫn + query; bỏ `/login`, `/unauthorized`; chặn giá trị không phải đường dẫn trong app | đúng | — | component | `tests/platform/auth/auth-context.test.tsx` |
| PERM-1 | Khách không có quyền, vai trò hay truy cập admin nào; điều kiện rỗng thì thỏa | đúng | khách | unit | `tests/platform/auth/permissions.test.ts` |
| PERM-2 | Khách hàng không có quyền; được cấp quyền riêng thì chỉ có quyền đó và vào được admin | đúng | user | unit | `tests/platform/auth/permissions.test.ts` |
| PERM-3 | Admin có đủ 28 quyền qua role; danh sách rỗng không giới hạn | đúng | admin đủ quyền | unit | `tests/platform/auth/permissions.test.ts` |
| PERM-4 | Admin có danh sách riêng chỉ có quyền trong đó; "tất cả" và "bất kỳ" | đúng | admin thiếu quyền | unit | `tests/platform/auth/permissions.test.ts` |
| PERM-5 | Role lạ, quyền lạ, trạng thái tài khoản bị bỏ qua | lỗi | — | unit | `tests/platform/auth/permissions.test.ts` |
| GUARD-1 | `RoleGuard` / `AdminGuard`: khách thấy fallback / khối từ chối | đúng | khách | component | `tests/platform/auth/role-guard.test.tsx` |
| GUARD-2 | Khách hàng bị từ chối ở mọi điều kiện admin, vào được khi có quyền riêng | đúng | user | component | `tests/platform/auth/role-guard.test.tsx` |
| GUARD-3 | Admin đủ quyền thấy nội dung ở mọi điều kiện | đúng | admin đủ quyền | component | `tests/platform/auth/role-guard.test.tsx` |
| GUARD-4 | Admin thiếu quyền: quyền ngoài danh sách bị từ chối, "bất kỳ" qua, "tất cả" thiếu một thì từ chối, vẫn vào được `AdminGuard` | lỗi | admin thiếu quyền | component | `tests/platform/auth/role-guard.test.tsx` |
| GUARD-5 | Đang kiểm tra phiên: chữ chờ (hoặc `loading` của caller), chưa lộ nội dung | đúng | — | component | `tests/platform/auth/role-guard.test.tsx` |
| GUARD-6 | Không xác nhận được phiên (`/me` và refresh đều lỗi) → coi như khách | lỗi | khách | component | `tests/platform/auth/role-guard.test.tsx` |
| ACT-1 | `requireAuth`: đã đăng nhập thì chạy ngay, không mở popup | đúng | user | component | `tests/platform/auth/login-prompt.test.tsx` |
| ACT-2 | `requireAuth`: khách thì giữ hành động và mở popup với câu theo `loginAction` | đúng | khách | component | `tests/platform/auth/login-prompt.test.tsx` |
| LP-1 | Popup: nút Google khóa tới khi tick điều khoản; đóng bằng nút, X, Esc; khóa cuộn | đúng | khách | component | `tests/platform/auth/login-prompt.test.tsx` |
| LP-2 | Đăng nhập khi popup đang mở: đóng popup và chạy hành động đã giữ | đúng | khách | component | `tests/platform/auth/login-prompt.test.tsx` |
| LP-3 | Đóng popup thì bỏ hành động; đăng nhập sau đó không chạy nó | lỗi | khách | component | `tests/platform/auth/login-prompt.test.tsx` |
| LP-4 | Sự kiện mở popup không kèm hành động vẫn mở với câu mặc định | đúng | khách | component | `tests/platform/auth/login-prompt.test.tsx` |
| SYS-1 | Mở khóa 15 phút: mốc, giá trị hỏng, server | đúng | — | unit | `tests/platform/auth/system-password.test.tsx` |
| SYS-2 | Hộp mật khẩu: đúng mật khẩu thì `true` và mở khóa | đúng | — | component | `tests/platform/auth/system-password.test.tsx` |
| SYS-2E | Hộp mật khẩu: sai thì báo lỗi, xóa ô, vẫn khóa; hủy / bấm nền thì `false` | lỗi | — | component | `tests/platform/auth/system-password.test.tsx` |
| SYS-3 | Cổng admin: hỏi mật khẩu, hiện khu vực khi đúng, không hỏi lại khi còn hạn | đúng | admin đủ quyền | component | `tests/platform/auth/system-password.test.tsx` |
| SYS-3E | Cổng admin: hủy thì về trang chủ; hết 15 phút thì hỏi lại ở trang admin kế | lỗi | admin đủ quyền | component | `tests/platform/auth/system-password.test.tsx` |
| OUT-1 | Đăng xuất (nút hồ sơ và nút menu): hỏi xác nhận, xác nhận thì xóa phiên và gọi `onSignedOut` | đúng | user | component | `tests/platform/auth/sign-out-button.test.tsx` |
| OUT-2 | Đăng xuất: hủy thì không làm gì | đúng | user | component | `tests/platform/auth/sign-out-button.test.tsx` |
| OUT-3 | Đăng xuất không cần `onSignedOut` | đúng | user | component | `tests/platform/auth/sign-out-button.test.tsx` |
| GSI-1 | Nút Google khóa tới khi tick điều khoản; link điều khoản và chính sách mở tab mới | đúng | khách | component | `tests/platform/auth/google-sign-in.test.tsx` |
| GSI-2 | Gợi ý tài khoản Google gần nhất | đúng | khách | component | `tests/platform/auth/google-sign-in.test.tsx` |
| GSI-3 | Đăng nhập thành công: lưu phiên, gửi mã, chuyển tới trang cuối hoặc `/` khi ở `/login` | đúng | khách | component | `tests/platform/auth/google-sign-in.test.tsx` |
| GSI-4 | Đăng nhập lỗi: thông điệp của API hoặc câu mặc định, popup bị đóng, xóa lỗi cũ khi thử lại | lỗi | khách | component | `tests/platform/auth/google-sign-in.test.tsx` |
| WALL-1 | Màn chặn khách: không đóng được, nút Google khóa, khóa cuộn rồi trả lại, hai ngôn ngữ | đúng | khách | component | `tests/platform/auth/access-screens.test.tsx` |
| DENIED-1 | `/unauthorized` cho khách: câu cần đăng nhập, nút tới `/login` | đúng | khách | component | `tests/platform/auth/access-screens.test.tsx` |
| DENIED-2 | `/unauthorized` cho khách hàng: email, nhãn role, nút về cửa hàng | đúng | user | component | `tests/platform/auth/access-screens.test.tsx` |
| DENIED-3 | `/unauthorized` cho admin thiếu quyền: nhãn admin; role lạ hiện nguyên | lỗi | admin thiếu quyền | component | `tests/platform/auth/access-screens.test.tsx` |
| PAGE-1 | Trang `/login`: lời chào, nút Google khóa, về trang chủ | đúng | khách | component | `tests/platform/auth/access-screens.test.tsx` |
| E2E-1 | Trang `/login` hiển thị và nút Google bị khóa cho tới khi tick điều khoản (chỉ đọc, API thật) | đúng | khách | e2e | `tests/platform/auth/login.e2e.ts` |
| E2E-2 | Khách vào trang riêng (tài khoản, giỏ, đơn, yêu thích) thấy màn chặn đăng nhập; không tràn ngang | đúng | khách | e2e | `tests/e2e/private-pages.e2e.ts` |
| E2E-3 | Tài khoản test đã đăng nhập vào được trang tài khoản và yêu thích, giữ phiên sau khi tải lại, access token cũ tự làm mới (cần `E2E_REFRESH_TOKEN`) | đúng | user | e2e | `tests/e2e/signed-in.auth.e2e.ts` |

Coverage: `session.ts`, `auth-api.ts`, `use-api-auth.ts` có ngưỡng dòng ≥ 90% trong `vitest.config.mts` vì đây là đường đi của mọi request có phiên; `auth-context.tsx` ≥ 85%. Các file quyền và guard được kiểm bằng kiểm thử đột biến thủ công (xem lịch sử thay đổi) thay vì ngưỡng.

## 7. Rủi ro & triển khai

| Rủi ro | Phát hiện | Quay lui |
|---|---|---|
| Dedupe toàn cục thay đổi thời điểm refresh | `session-dedupe.test.ts` | Đổi `refreshPromise` về theo instance (chỉ ở `session.ts`) |
| Đứt vòng import (`api.ts` ↔ `session.ts`) | `tsc`, test | `session.ts` chỉ import `ApiError` từ `api.ts` |
| `use-media-upload.ts` đọc token cũ | `tsc` (import đổi), E2E upload ở roadmap | Khôi phục export `getAccessToken` ở `auth-api.ts` |

Thay đổi nhìn thấy được: không. Một thay đổi hành vi nhỏ có chủ đích: hai request 401 đồng thời đi qua hai client khác nhau nay chỉ refresh một lần (trước đây hai lần).

Ghi chú sửa lỗi tài liệu: bản đầu của spec và comment trong `session.ts` nói BE xoay vòng refresh token. Đối chiếu với BE (chỉ đọc) thì sai; lý do dedupe được viết lại cho đúng ở mục 1.

## 8. Lịch sử thay đổi

- 2026-10-21 · Viết spec, chạy characterization test trên code cũ (33 test xanh, 4 đột biến cố ý đều bị bắt), rồi gộp logic phiên vào `session.ts`. Trạng thái `Implemented`: 69 test xanh, E2E chỉ đọc xanh ở desktop và phone.
- 2026-10-21 · Sửa nhận định sai về việc BE xoay vòng refresh token (mục 1, 7, comment trong `session.ts`, `session-dedupe.test.ts`). Không đổi hành vi code. no-test: chỉ sửa comment và tài liệu.
- 2026-10-21 · Thêm E2E-2 và E2E-3 (luồng chưa đăng nhập và đã đăng nhập trên API thật). no-test: chỉ thêm test, không đổi code của module.
- 2026-10-21 · Đưa cả module lên chuẩn ma trận (đúng/lỗi × khách/user/admin đủ quyền/admin thiếu quyền): thêm test cho quyền, guard, popup đăng nhập, mật khẩu hệ thống, đăng xuất, nút Google, màn chặn. Phá cố ý 9 chỗ (quyền, guard, `requireAuth`, popup, mật khẩu, đăng xuất, nút Google, cổng admin): cả 9 bị test bắt. Không đổi code của các phần này. no-test: chỉ thêm test.
