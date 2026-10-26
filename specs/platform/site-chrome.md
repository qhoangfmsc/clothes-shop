# Site chrome (header, menu, tìm kiếm, footer, nút giỏ nổi) — Tech spec

> **Nhóm:** Platform · **Cập nhật:** 2026-10-26 · **Trạng thái:** Implemented
> **Doc:** [platform/site-chrome](../../docs/platform/site-chrome.md) · **Test:** `tests/platform/site-chrome/`

## 1. Bối cảnh & mục tiêu

Site chrome là khung điều hướng mà khách thấy ở mọi trang công khai: header cố định (logo, các link, mega menu danh mục, ô tìm kiếm có gợi ý và lịch sử), burger menu (drawer với danh mục, khu tài khoản, banner nổi bật), footer tối với liên hệ và đổi ngôn ngữ, và nút giỏ hàng nổi. Sai ở đây là khách không tới được trang cần tới: menu không mở, tìm kiếm trả sai trang sản phẩm, không đăng xuất được, số lượng giỏ lệch, hoặc đổi ngôn ngữ mất trang đang xem. Danh mục và banner lấy từ BE; số lượng giỏ từ Redux; phiên từ `AuthProvider`.

**Mục tiêu.** Khóa hành vi hiện tại bằng test cho khách và người đã đăng nhập (khu tài khoản trong burger menu, nút giỏ nổi), kèm kiểm thử đột biến; sửa lỗi rõ ràng tìm thấy khi viết test; ghi các điểm đáng ngờ còn lại ở mục 7.

## 2. Phạm vi

| Làm | Không làm (và vì sao) |
|---|---|
| Header (cuộn ẩn / hiện), logo, thanh link, mega menu Shop | Danh sách danh mục và banner (`useCategories`, `useBannerConfig`): thuộc [data-layer](./data-layer.md); cấu hình banner: [site-config](../admin/site-config.md) |
| Ô tìm kiếm, gợi ý, lịch sử gần đây (`useSearchHistory`) | API gợi ý và debounce (`useAutocomplete`): thuộc [data-layer](./data-layer.md) |
| Burger menu: link, danh sách danh mục, khu tài khoản, banner nổi bật, khóa cuộn | `SignOutButton` và hộp xác nhận: thuộc [auth](./auth.md) |
| Footer, hàng icon liên hệ, đổi ngôn ngữ, nút giỏ nổi, `UserAvatar` | Nội dung các trang pháp lý và hằng số liên hệ (`src/lib/legal.ts`, `src/lib/contact.ts`): thuộc [legal](../storefront/legal.md), [seo](./seo.md) |

## 3. Hợp đồng

- **Thanh link.** Shop, New In, Collections và nút "Đặt thiết kế" (tới `CONTACT_PATH`); ô tìm kiếm và burger. Từ 1024 px mới thấy link và ô tìm kiếm (CSS); dưới đó chỉ có burger.
- **Mega menu.** Rê chuột vào Shop 280 ms thì mở (rời trước đó thì hủy); có danh mục thì mới mở; hiện tối đa 4 danh mục, mỗi cái kèm danh mục con và "xem tất cả", nhiều hơn 4 thì có "xem thêm" tới `/shop`. Đóng: 150 ms sau khi rời Shop (trừ khi chuột vào panel), 120 ms sau khi rời panel, Esc, bấm nền tối, bấm link, header bị ẩn. Sau khi đóng nghỉ 350 ms rồi mới mở lại được. Báo cho header (`onMenuToggle`) để hiện nền kính.
- **Header.** Cố định, `z-index 100`. Cuộn quá 60 px thì có nền; cuộn xuống quá 5 px khi đã quá 80 px thì trượt lên (ẩn); cuộn lên quá 5 px thì hiện lại. Mở mega menu cũng có nền.
- **Tìm kiếm.** Bấm thì mở ra (con trỏ vào ô sau 200 ms), Esc hoặc bấm ra ngoài khi chưa gõ gì thì thu lại. Từ 2 ký tự hỏi gợi ý (5 / 8 / 10 theo điện thoại / tablet / máy tính). Danh sách hiện sau khi ô đã mở xong: lịch sử khớp trước, gợi ý không trùng sau; ô trống thì chỉ lịch sử kèm tiêu đề; có chữ thì lọc lịch sử theo tên (không phân biệt hoa thường). ↑ ↓ đi vòng, Enter mở mục sáng, Esc bỏ sáng và đóng. Chọn một mục: ghi vào lịch sử, đóng, đi tới `/shop/<danh mục>/<danh mục con>/<id>`; mục thiếu danh mục thì tra URL theo id, không có thì `/shop`. Gợi ý lỗi hoặc không có thì báo "không có kết quả".
- **Lịch sử.** Tối đa 5 sản phẩm đã mở, mới nhất trước, không trùng, ở `localStorage` (`doovan-search-history`); đọc sau khi mount, theo dõi tab khác, mỗi lần ghi đọc lại trước; storage hỏng hoặc bị chặn thì rỗng / chỉ nhớ trong phiên.
- **Burger menu.** Mở bằng nút, đóng bằng nút X, Esc, nền tối hoặc chọn link; khi mở khóa cuộn trang (html và body) và chặn cuộn nền bằng ngón tay (chỉ cho cuộn phần có thể cuộn, chặn nảy ở đầu / cuối). Link: Đặt thiết kế (hàng nổi bật), Shop (xổ danh mục kèm số danh mục con và "xem tất cả"; đóng drawer thì gập lại), New In, Collections, About. Khách thấy nút đăng nhập; đang kiểm tra phiên thì chưa hiện gì; khách hàng thấy hàng tên + email bấm để mở tài khoản / yêu thích / đơn hàng / đăng xuất (hỏi xác nhận, đồng ý thì đăng xuất và đóng drawer). Banner nổi bật: chỉ khi site config có; hiện tiêu đề, phụ đề, nút (nhãn mặc định `drawer.discover`, đích mặc định `/shop`), chấm chọn khi có nhiều hơn 1; tự chuyển mỗi 4 s khi đang thấy, không bị rê chuột / chạm / vừa bấm chấm.
- **Footer.** Tên thương hiệu về trang chủ, địa chỉ (mở bản đồ tab mới) và hotline (`tel:`), hàng icon (email, rồi từng mạng xã hội, tab mới trừ email), Explore (4 link), Chính sách (3 tài liệu), Ngôn ngữ, năm hiện tại.
- **Đổi ngôn ngữ.** Giữ đường dẫn và query, không cuộn lên đầu; chọn ngôn ngữ đang mở thì không làm gì.
- **Nút giỏ nổi.** Chỉ khi giỏ có hàng; số là tổng số lượng (không phải số dòng); tới `/cart`; ẩn ở `/cart` và mọi đường dẫn bắt đầu bằng `/checkout`.
- **`UserAvatar`.** Chữ cái đầu của hai từ đầu (hoa), `?` nếu không có tên; ảnh khi có; là nút (có tên truy cập) chỉ khi có hành động.

## 4. Thiết kế

```
SiteHeader ─► Logo
           └► HeaderNav ─► SearchBar ─► useSearchHistory (localStorage)
                      ├► mega menu (useCategories)
                      └► HamburgerMenu ─► UserAvatar · SignOutButton · ResponsiveBannerImage
SiteFooter ─► SocialIcons · LanguageSwitcher
CartFAB ─► Redux (selectTotalItems)
```

## 5. Quyết định thiết kế

### Design pattern

| Quyết định | Lý do | Phương án đã bỏ |
|---|---|---|
| **Tách theo vai**: `SiteHeader` (cuộn), `HeaderNav` (link + mega menu), `SearchBar` + `useSearchHistory` (lịch sử là hook riêng), `HamburgerMenu` (drawer), `UserAvatar` (hiển thị) | Mỗi file đổi vì một lý do; lịch sử tìm kiếm và avatar dùng lại được ngoài chỗ gốc (`UserAvatar` còn ở trang Account) | Một component header 1.500 dòng |
| **`UserAvatar` là hàm trình bày thuần**, nút chỉ khi có `onClick` | Dùng được bên trong nút / link khác (hàng toggle của burger menu) mà không lồng `<button>` trong `<button>` | Luôn là `<button>` |
| **Hover-intent bằng bộ đếm giờ + ref** (mở 280 ms, đóng 150 / 120 ms, nghỉ 350 ms) | Tránh menu nháy khi chuột lướt qua; tách hẳn khỏi state để không render lại mỗi lần di chuột | Chỉ CSS `:hover` (không có nghỉ, không báo header được) |
| **Hằng số / dữ liệu thay vì nhánh**: `NAV_LINKS`, `ACCOUNT_LINKS`, `CONTACT_LINKS` | Thêm mục = thêm một dòng dữ liệu, không sửa JSX | Viết tay từng link |
| **Bỏ mã không dùng**: biến thể `drawer` của `LanguageSwitcher`, dropdown `UserMenu` (đã bị comment trong header), nên `UserMenu.tsx` đổi tên thành `UserAvatar.tsx` | Mã không ai gọi vẫn phải đọc, test và bảo trì; tên file phải nói đúng thứ nó chứa | Giữ lại "phòng khi cần" |

### Kiến trúc

Header, footer và nút giỏ nổi chỉ phụ thuộc xuống hooks dữ liệu (`useCategories`, `useBannerConfig`, `useAutocomplete`), `AuthProvider`, store giỏ hàng và `routing`; không module nào import ngược chúng, trừ `UserAvatar` (dùng ở trang Account). Banner và danh mục là dữ liệu của module khác, truyền vào qua hook.

### SOLID

| Nguyên tắc | Áp dụng thế nào ở module này |
|---|---|
| S | `SearchBar` lo giao diện tìm; lịch sử nằm ở `useSearchHistory`; `UserAvatar` chỉ vẽ; `HamburgerMenu` tách `AuthDrawerSection` |
| O | Thêm link menu / mạng xã hội = thêm một phần tử mảng (`NAV_LINKS`, `SOCIALS`) |
| L | — |
| I | `UserAvatar` nhận `{ name, image }`, không nhận cả `AuthUser`; `SocialIcons` nhận class và cỡ icon |
| D | Các thành phần phụ thuộc hook dữ liệu và `routing`, test thay API bằng MSW |

### Conventions

Chuỗi qua `shared.header`, `shared.footer`, `shared.cart.fab`, `common.language`. Test dùng `renderApp` và API giả của `chrome-kit.tsx` (danh mục, banner); `document.scrollingElement` được bù vì jsdom không có (framer-motion `useScroll` cần); phần banner nằm trong panel `display: none` nên truy vấn dùng `hidden: true`.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = có (burger menu: khách thấy nút đăng nhập, khách hàng thấy khu tài khoản; nút giỏ nổi chạy với khách hàng) · permission = không (khung storefront không kiểm quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| CHR-1 | Footer: thương hiệu, tagline, địa chỉ và hotline là link, 4 link Explore, 3 tài liệu, cột ngôn ngữ, hàng icon, năm, tiếng Anh | đúng | khách | component | `tests/platform/site-chrome/footer.test.tsx` |
| CHR-2 | Hàng icon: email rồi từng mạng xã hội, tab mới trừ email, tooltip, class, cỡ icon | đúng | khách | component | `tests/platform/site-chrome/footer.test.tsx` |
| CHR-3 | Đổi ngôn ngữ ở footer: giữ đường dẫn và query, không cuộn, không làm gì khi chọn ngôn ngữ đang mở | đúng | khách | component | `tests/platform/site-chrome/footer.test.tsx` |
| CHR-6 | Nút giỏ nổi: tổng số lượng, tới giỏ, hiện / ẩn theo số lượng, tiếng Anh | đúng | user | component | `tests/platform/site-chrome/cart-fab.test.tsx` |
| CHR-7 | Nút giỏ nổi ẩn ở `/cart` và `/checkout…`, hiện ở trang khác | đúng | user | component | `tests/platform/site-chrome/cart-fab.test.tsx` |
| CHR-8 | Lịch sử tìm kiếm: tối đa 5, mới nhất trước, không trùng, quên một mục, đọc trước khi ghi, theo dõi tab khác | đúng | khách | component | `tests/platform/site-chrome/search-history.test.tsx` |
| CHR-9E | Lịch sử không đọc / không ghi được: rỗng, không phải danh sách, quá 5, trình duyệt từ chối | lỗi | khách | component | `tests/platform/site-chrome/search-history.test.tsx` |
| CHR-10 | Ô tìm kiếm mở ra / thu lại: bấm, focus, Esc, bấm ra ngoài, bấm vào danh sách | đúng | khách | component | `tests/platform/site-chrome/search-bar.test.tsx` |
| CHR-11 | Gợi ý: từ 2 ký tự, số gợi ý theo màn hình, giá, giá theo yêu cầu, đang tìm, không có kết quả, API lỗi, nút xóa | lỗi | khách | component | `tests/platform/site-chrome/search-bar.test.tsx` |
| CHR-12 | Chọn gợi ý: đi tới trang sản phẩm, tra URL khi thiếu danh mục, về `/shop` khi không thấy, phím ↑ ↓ Enter Esc, rê chuột | đúng | khách | component | `tests/platform/site-chrome/search-bar.test.tsx` |
| CHR-13 | Tìm gần đây: hiện khi mở ô, lọc theo chữ, trước gợi ý, xóa một mục, mở bằng phím | đúng | khách | component | `tests/platform/site-chrome/search-bar.test.tsx` |
| CHR-14 | Vị trí danh sách: cửa sổ riêng trên trang, theo ô khi đổi cỡ / cuộn, gỡ khi đóng | đúng | khách | component | `tests/platform/site-chrome/search-bar.test.tsx` |
| CHR-15 | Thanh link: ba link và nút Đặt thiết kế, tiếng Anh, ô tìm kiếm và burger, style cân dấu ngoặc | đúng | khách | component | `tests/platform/site-chrome/header-nav.test.tsx` |
| CHR-16 | Mega menu mở sau 280 ms, danh mục và danh mục con, 4 cột + xem thêm, không mở khi hủy / không có danh mục / lỗi / link khác | lỗi | khách | component | `tests/platform/site-chrome/header-nav.test.tsx` |
| CHR-17 | Đóng mega menu: rời Shop, vào panel, Esc, nền tối, bấm link, header ẩn, nghỉ 350 ms, bộ đếm giờ khi dỡ | đúng | khách | component | `tests/platform/site-chrome/header-nav.test.tsx` |
| CHR-18 | Logo: link về trang chủ, tiếng Anh | đúng | khách | component | `tests/platform/site-chrome/header-nav.test.tsx` |
| CHR-19 | Header khi cuộn: nền sau 60 px, trượt lên khi cuộn xuống quá 80 px, hiện lại khi cuộn lên, bước nhỏ bị bỏ qua, nền khi mega menu mở | đúng | khách | component | `tests/platform/site-chrome/header-nav.test.tsx` |
| CHR-20 | Burger: mở / đóng bằng nút, X, Esc, nền tối; khóa cuộn trang; tiếng Anh | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-21 | Burger: các link và mô tả, chọn link thì đóng | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-22 | Burger: danh sách Shop (gập / xổ, số danh mục con, màu chấm, đóng khi chọn, gập lại khi mở lần sau) | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-23 | Burger: khu tài khoản — khách (đăng nhập), đang kiểm tra phiên, khách hàng (tên, email, link, đăng xuất có xác nhận, hủy, tên thiếu) | đúng | user | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-24 | Burger: banner nổi bật — không có / lỗi / một / nhiều, nhãn và đích mặc định, chọn bằng chấm, đóng khi chọn | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-25 | Burger: banner tự chuyển mỗi 4 s khi đang thấy, vòng lại, dừng khi chưa thấy hoặc vừa bấm chấm | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-26 | Burger: cuộn bằng ngón tay — chặn nền, cho cuộn phần cuộn được, chặn nảy đầu / cuối, gỡ khi đóng | đúng | khách | component | `tests/platform/site-chrome/hamburger.test.tsx` |
| CHR-27 | Avatar tròn: chữ cái đầu, dấu hỏi, ảnh, nút chỉ khi có hành động, cỡ và class | đúng | user | component | `tests/platform/site-chrome/user-avatar.test.tsx` |

Coverage: ngưỡng riêng cho các file của module trong `tests/_support/coverage.json`.

## 7. Rủi ro & triển khai

| Phát hiện | Hành vi hiện tại (test khóa) |
|---|---|
| Mega menu chỉ mở bằng rê chuột: trên iPad ngang (≥ 1024 px, cảm ứng) chạm vào Shop đi thẳng tới `/shop`, không mở panel | Hành vi hiện tại; danh mục vẫn mở được qua burger menu (hiện ở mọi cỡ màn hình) và ở `/shop` |
| Dưới 1024 px không có ô tìm kiếm (chỉ burger), kể cả khi `useAutocomplete` có hạn mức cho điện thoại / tablet | Hành vi hiện tại (CHR-11 kiểm hạn mức, ô chỉ hiện từ 1024 px qua CSS) |
| Esc trong ô tìm kiếm đóng cả ô (bộ nghe ở `window`), nên nhánh "bỏ sáng" của chính ô nhập không bao giờ chạy một mình | Hành vi hiện tại (CHR-12) |
| Trước đây nhãn nút của banner nổi bật mặc định là "Discover" viết cứng, không dịch | Đã sửa: `shared.header.drawer.discover` (vi "Khám phá", en "Discover") (CHR-24) |
| Trước đây `HeaderNav` có một dấu `}` thừa trong khối `<style>` làm hỏng luật gạch chân `.header-nav-link::after` | Đã sửa; test kiểm dấu ngoặc cân (CHR-15) |
| `UserMenu` (dropdown avatar, có chữ `"User"` viết cứng và đăng xuất không hỏi) và biến thể `drawer` của `LanguageSwitcher` không còn ai dùng | Đã xóa; `UserMenu.tsx` đổi tên `UserAvatar.tsx` |

Thay đổi nhìn thấy được: nhãn mặc định của nút banner nổi bật đổi sang bản dịch; gạch chân link header hiện đúng.

## 8. Lịch sử thay đổi

- 2026-10-26 · Viết spec và test cho toàn module (batch 8), kiểm thử đột biến; sửa dấu `}` thừa trong `HeaderNav`, nhãn "Discover" viết cứng, xóa `UserMenu` và biến thể `drawer` không dùng (đổi tên `UserMenu.tsx` → `UserAvatar.tsx`).
