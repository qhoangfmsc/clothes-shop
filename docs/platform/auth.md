# Auth (đăng nhập, phiên, phân quyền)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-12
> **Code:** `src/contexts/auth-context.tsx` · `src/lib/auth-api.ts` · `src/lib/permissions.ts` · `src/hooks/use-api-auth.ts` · `src/hooks/use-auth-action.ts` · `src/app/[locale]/(auth)/login/` · `src/app/[locale]/unauthorized/` · các component `RoleGuard`, `LoginPromptModal`, `UnauthenticatedState`, `SystemPasswordPrompt`, `AdminPasswordGate` trong `src/app/[locale]/_components/`

## 1. Tóm tắt module

Module chịu trách nhiệm cho toàn bộ vòng đời danh tính của người dùng: đăng nhập bằng Google, giữ phiên bằng access/refresh token trong `localStorage`, tự refresh khi hết hạn, và kiểm soát quyền (role + permission) ở phía giao diện. Ngoài ra có thêm một lớp "mật khẩu hệ thống" chặn khu vực admin (speed bump phía FE).

Backend là nguồn sự thật của phiên và quyền. FE chỉ giữ token, hỏi `/api/auth/me` để biết user là ai, và ẩn/hiện UI theo quyền nhận về.

## 2. Phục vụ gì / việc cần làm

- Cho khách đăng nhập bằng tài khoản Google (không có đăng ký bằng email/mật khẩu).
- Giữ người dùng đăng nhập qua các lần tải trang; tự gia hạn token khi BE trả 401.
- Chặn các trang riêng tư (`/cart`, `/checkout`, `/account`, `/orders`, `/wishlist`) với khách chưa đăng nhập.
- Chặn các hành động cần đăng nhập ở trang công khai (thêm vào giỏ, thêm wishlist) bằng popup đăng nhập, rồi chạy tiếp hành động sau khi đăng nhập xong.
- Chặn khu vực `/admin` theo role/permission, cộng thêm mật khẩu hệ thống có TTL 15 phút.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File chính |
|---|---|---|
| Phiên đăng nhập | `AuthProvider` + `useAuth()`: `user`, `isLoading`, `isAuthenticated`, `login`, `logout`, `refresh` | `src/contexts/auth-context.tsx` |
| Trang đăng nhập | Trang `/login` (Google + checkbox đồng ý điều khoản) | `(auth)/login/LoginContent.tsx`, `_components/GoogleSignInButton.tsx` |
| Popup đăng nhập | Modal có thể đóng, mở bằng `useLoginPrompt()` hoặc `requireAuth()`; chạy callback sau khi đăng nhập | `_components/LoginPromptModal.tsx`, `src/hooks/use-auth-action.ts` |
| Chặn trang riêng tư | Modal không thể đóng, hiện trên trang private khi chưa đăng nhập | `_components/UnauthenticatedState.tsx` |
| HTTP client có token | `authApi` (cho thunk/SWR), `useApiAuth().apiFetch` (hook), `apiFetchStandalone` (thunk, không refresh) | `src/lib/auth-api.ts`, `src/hooks/use-api-auth.ts` |
| Permission | Hằng số role/permission, helper kiểm tra | `src/lib/permissions.ts` |
| Guard UI | `RoleGuard` (ẩn/hiện theo role/permission), `AdminGuard` (cả khu admin) | `_components/RoleGuard.tsx` |
| Mật khẩu hệ thống | Prompt nhập mật khẩu (Promise<boolean>), cổng vào admin, TTL 15 phút | `_components/SystemPasswordPrompt.tsx`, `AdminPasswordGate.tsx`, `src/lib/system-password*.ts` |
| Trang không có quyền | `/unauthorized` hiển thị role hiện tại và nút quay lại/đăng nhập | `unauthorized/UnauthorizedContent.tsx` |

## 4. Chi tiết

### 4.1 Đăng nhập Google

- `GoogleOAuthProvider` được bọc trong `Providers` (`clientId` = `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
- `GoogleSignInButton` dùng `useGoogleLogin({ flow: "auth-code" })`. Mã `code` Google trả về được gửi sang BE bằng `login(code)` → `POST /api/auth/google` với body `{ idToken: <code> }` (tên field là `idToken` nhưng giá trị là authorization code; BE tự đổi).
- Nút Google **bị khóa cho tới khi tick checkbox** đồng ý Điều khoản + Chính sách bảo mật (link mở tab mới `/terms`, `/privacy`). Checkbox không được nhớ: mỗi lần đăng nhập phải tick lại.
- Thành công: lưu `accessToken` + `refreshToken` vào `localStorage`, `setUser(data.user)`, điều hướng về `/`. Lỗi: hiển thị qua `useErrorMessage()` (fallback `auth.login.google.failed`); đóng popup Google → `auth.login.google.cancelled`.
- Trang `/login` có `robots: noindex`.

### 4.2 Lưu trữ token & khởi tạo phiên

- Khóa `localStorage`: `clothes_shop_access_token`, `clothes_shop_refresh_token`.
- Khi mount, `AuthProvider`: nếu có access token → `GET /api/auth/me` (`data.user`). Thất bại → thử `POST /api/auth/refresh` với refresh token (nhận `accessToken` + `user`). Vẫn thất bại → xóa cả hai token. Trong lúc đó `isLoading = true`.
- `logout()` chỉ xóa token + `user` phía FE (không gọi BE). Admin layout gọi `logout()` rồi `router.replace("/login")`.
- Refresh thất bại giữa phiên (ở `authApi` hoặc `useApiAuth`, kể cả khi không còn refresh token): `expireSession()` xóa token và phát `window` event `auth:session-expired` (`SESSION_EXPIRED_EVENT`); `AuthProvider` lắng nghe và `setUser(null)`, nên UI quay về trạng thái chưa đăng nhập. `apiFetchStandalone` không refresh nên không phát event này.
- Token do BE cấp có claim `type` (access/refresh). FE gửi access token ở header `Authorization` và chỉ gửi refresh token tới `/api/auth/refresh`; dùng lẫn loại sẽ nhận 401. Token cũ (không có `type`) bị từ chối cả hai loại, nên phiên cũ rơi vào nhánh refresh thất bại → xóa token → chưa đăng nhập.
- `AuthUser`: `id, email, name, image, provider, providerId, role, status, permissions?: string[], createdAt, updatedAt`.

### 4.3 Ba cách gọi API có token

| Client | Dùng ở | Refresh 401 | Ghi chú |
|---|---|---|---|
| `authApi` (`get/post/put/patch/delete`) | Redux thunk admin, SWR admin, `useAdminAnalytics` | Có, dedupe bằng một promise dùng chung ở module-level; refresh trả `null` → `expireSession()` (xóa token + phát event) + ném `ApiError("", 401)` | Không map URL media |
| `useApiAuth().apiFetch(path, { method, body, headers, public })` | Account, Checkout, Orders, Order detail | Có, dedupe theo từng instance hook; `public: true` bỏ qua header Authorization | Kết quả đi qua `mapMediaUrls` |
| `apiFetchStandalone` | Thunk của giỏ hàng và wishlist | **Không** | Đọc token thẳng từ `localStorage`; kết quả đi qua `mapMediaUrls` |

Cả ba ném `ApiError(message, status, errorCode)` khi `!res.ok` (xem [data-layer](./data-layer.md)). `uploadMediaFile` (upload ảnh) tự dùng `fetch` + `getAccessToken()` và **không** có refresh.

### 4.4 Phân quyền

- `ROLES`: `admin`, `user`.
- 19 permission dạng chuỗi, mỗi cái có mã số khớp BE: `PRODUCT_CREATE/UPDATE/DELETE` (6000–6002) và `PRODUCT_VIEW` (6003), `CATEGORY_*` (7000–7002) và `CATEGORY_VIEW` (7003), `COLLECTION_*` (8000–8002) và `COLLECTION_VIEW` (8003), `ORDER_ADMIN_VIEW` (9000), `ORDER_ADMIN_UPDATE_STATUS` (9001), `USER_ADMIN_VIEW` (10000), `USER_ADMIN_UPDATE` (10001), `SITE_CONFIG_VIEW/UPSERT/DELETE` (11000–11002).
- `ROLE_PERMISSIONS`: `admin` có đủ 19; `user` không có quyền nào.
- `hasPermission(user, p)`: nếu `user.permissions` có phần tử thì **chỉ** xét danh sách đó (ghi đè role); ngược lại xét theo role.
- `canAccessAdmin(user)`: role `admin` **hoặc** có ít nhất một permission.
- Helper khác: `hasRole`, `hasAllPermissions`, `hasAnyPermission`, `getUserPermissions`, `permissionsToCodes`, `codesToPermissions`, `PERMISSION_LABELS`, `PERMISSION_GROUPS`, `getRoleLabel`.
- Hiện trạng: `PERMISSION_LABELS`, `PERMISSION_GROUPS`, `permissionsToCodes`, `codesToPermissions`, `getRoleLabel`, `getUserPermissions`, `hasRole` có định nghĩa nhưng chưa có nơi nào trong `src/` gọi tới. Nhãn trong các hằng này là tiếng Anh cứng, không đi qua i18n.
- `RoleGuard` props: `role`, `permission`, `permissions` (tất cả), `anyPermission` (một trong), `fallback` (mặc định ẩn), `loading`. Đang tải phiên → spinner (`admin.components.guards.checking`). Chưa đăng nhập → render `fallback`. Chú thích ví dụ trong file dùng chuỗi kiểu `"products:write"`, nhưng giá trị hợp lệ là các hằng trong `PERMISSIONS`.
- `AdminGuard`: `canAccessAdmin(user)` sai → `UnauthorizedBlock` (hoặc `fallback`).

### 4.5 Popup đăng nhập & hành động cần đăng nhập

- `LoginPromptProvider` (mount ở root layout) giữ state mở/đóng, `action` (`continue | addToBag | saveToWishlist`, chọn câu phụ đề `shared.feedback.loginPrompt.subtitle.<action>`), và callback đang chờ.
- Hai cách mở: `useLoginPrompt().openLoginPrompt(onSuccess, action)` hoặc `useAuthAction().requireAuth(fn, action)`. `requireAuth` chạy `fn` ngay nếu đã đăng nhập, ngược lại phát `CustomEvent("login-prompt:open")` trên `window` để provider mở popup.
- Khi `isAuthenticated` chuyển từ false → true lúc popup đang mở: đóng popup, chạy callback sau 100 ms. Đóng popup (Esc, backdrop, nút) sẽ hủy callback.
- Popup dùng `GoogleSignInButton` giống trang `/login`, khóa scroll `html/body`, render qua portal.
- `requireAuth` hiện được dùng ở `ProductCard` (thêm giỏ nhanh, wishlist) và `ProductDetailClient` (wishlist).

### 4.6 Chặn trang riêng tư

- `UnauthenticatedState` là modal portal **không thể đóng** (không nút X, backdrop không bấm được), khóa scroll, có nút đăng nhập Google và "Về trang chủ". Dùng ở Cart, Checkout, Account, Orders, Order detail, Wishlist khi `!isAuthenticated`.
- Layout `(private)` đặt `robots: noindex, nofollow`.

### 4.7 Khu admin: guard theo thứ tự

Thứ tự trong `AdminLayoutClient` (xem [admin-shell](../admin/admin-shell.md)): `AdminGuard` (role/permission) → kiểm tra quyền theo route → `AdminPasswordGate`. Mục đích: người không đủ quyền không bao giờ bị hỏi mật khẩu hệ thống.

- Mật khẩu hệ thống là hằng cố định trong `src/lib/system-password.ts` (cùng một chuỗi cho mọi người, nằm trong source — chỉ là rào cản phụ, không phải ranh giới bảo mật).
- `isSystemUnlocked()` / `markSystemUnlocked()` lưu timestamp vào `sessionStorage` khóa `admin_system_unlocked_at`; hết hạn sau 15 phút.
- `AdminPasswordGate` kiểm tra lại mỗi lần đổi `pathname` trong `/admin`; chưa mở khóa → gọi `requestPassword()`; hủy → `router.replace("/")`.
- `useSystemPasswordPrompt()` trả về `() => Promise<boolean>`; dùng được ở chỗ khác (ví dụ nút "View" của Users). Nhập đúng sẽ gia hạn TTL cho cả cổng admin lẫn các prompt lẻ.

### 4.8 Trang `/unauthorized`

Hiển thị tiêu đề, câu khác nhau cho đã/chưa đăng nhập (`shared.errors.unauthorized.signedIn|signedOut`), role hiện tại (qua `useRoleLabel`), nút "Quay lại" (đã đăng nhập) hoặc "Đăng nhập" (chưa). `noindex`.

### 4.9 i18n & phụ thuộc

- Namespace: `auth.login.*`, `shared.feedback.loginPrompt|unauthenticated|systemPassword`, `shared.errors.unauthorized`, `admin.components.guards`.
- Biến môi trường: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Endpoint BE: `POST /api/auth/google`, `POST /api/auth/refresh`, `GET /api/auth/me`.
- Route handler `/api/analytics` tự xác thực admin bằng cách gọi `GET /api/auth/me` với bearer token của request (xem [analytics](../admin/analytics.md)).
