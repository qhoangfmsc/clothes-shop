# Site chrome (header, menu, tìm kiếm, footer, nút giỏ nổi)

> **Nhóm:** Platform · **Cập nhật:** 2026-10-18
> **Code:** `src/app/[locale]/_components/` — `SiteHeader.tsx`, `HeaderNav.tsx`, `HamburgerMenu.tsx`, `SearchBar.tsx`, `UserMenu.tsx`, `Logo.tsx`, `SiteFooter.tsx`, `LanguageSwitcher.tsx`, `SocialIcons.tsx`, `CartFAB.tsx`, `useSearchHistory.ts`

## 1. Tóm tắt module

Khung điều hướng của storefront: header cố định (logo, mega menu danh mục, tìm kiếm gợi ý, link chính, nút "Đặt thiết kế", burger menu), footer tối, nút giỏ hàng nổi và bộ chọn ngôn ngữ. Danh mục trong menu và banner "nổi bật" trong burger menu lấy từ BE.

## 2. Phục vụ gì / việc cần làm

- Đưa khách tới Shop, New In, Collections, Về DOOVAN (About), trang đặt thiết kế riêng ([contact](../storefront/contact.md)) và khu tài khoản từ mọi trang công khai.
- Tìm sản phẩm nhanh bằng ô tìm kiếm có gợi ý và lịch sử sản phẩm đã mở gần đây.
- Hiển thị danh mục/danh mục con thật từ API, có lối tắt "xem tất cả".
- Cho thấy số lượng trong giỏ và dẫn tới giỏ từ bất cứ đâu.
- Đổi ngôn ngữ giữ nguyên trang.

## 3. Submodule & chức năng hiện có

| Submodule | Chức năng | File |
|---|---|---|
| Header | Cố định, ẩn khi cuộn xuống/hiện khi cuộn lên, nền kính mờ sau khi cuộn | `SiteHeader.tsx` |
| Logo | Wordmark SVG `DOOVAN` màu thương hiệu, link về `/` | `Logo.tsx` |
| Thanh điều hướng | Link Shop/New In/Collections + nút "Đặt thiết kế" (≥ 1024 px), mega menu của Shop | `HeaderNav.tsx` |
| Tìm kiếm | Ô tìm kiếm mở rộng, gợi ý sản phẩm, lịch sử gần đây, điều hướng bằng phím | `SearchBar.tsx`, `useSearchHistory.ts` |
| Burger menu | Drawer toàn màn hình: nav, accordion danh mục, khu tài khoản, banner nổi bật | `HamburgerMenu.tsx` |
| Menu người dùng | Avatar + dropdown (hiện không gắn vào header), xuất `UserAvatar` | `UserMenu.tsx` |
| Footer | Thương hiệu + mạng xã hội, Explore, Policies (link pháp lý), Language, copyright | `SiteFooter.tsx` |
| Ngôn ngữ | `LanguageSwitcher` (xem [i18n](./i18n.md)) | `LanguageSwitcher.tsx` |
| Giỏ nổi | `CartFAB` | `CartFAB.tsx` |

## 4. Chi tiết

### 4.1 `SiteHeader`

`position: fixed`, `z-index 100`, `pointer-events: none` (con tự bật). Theo `useScroll`: `isScrolled` khi `scrollY > 60` (hiện nền `rgba(251,248,241,.95)` + blur + viền vàng mờ); ẩn (`y: -140`) khi cuộn xuống > 5 px và `scrollY > 80`, hiện khi cuộn lên > 5 px. Nền cũng hiện khi mega menu mở. Biến CSS `--header-bg-height` = 5 rem (<1024) / 5.625 rem (≥1024) (80 / 90 px ở gốc 16 px, lớn theo thang màn rộng); ẩn dịch lên `-9rem`. Kích thước trong style inline của header, mega menu, tìm kiếm, burger menu viết bằng `rem` để theo thang này. Chứa `Logo` và `HeaderNav`. `left`/`right` = `var(--page-edge)` nên header nằm trong cột `--page-max-w` của `body` (xem [design-system](./design-system.md) 4.3); panel mega menu của `HeaderNav` căn cùng cách.

### 4.2 `HeaderNav`

- `NAV_LINKS`: Shop (có mega menu), New In, Collections (trang About không nằm trên thanh nav, chỉ có trong drawer và footer); chỉ hiện ≥ 1024 px (`--nav-link-display`). `SearchBar` chỉ hiện ≥ 1024 px; trên mobile việc tìm kiếm không có ở thanh nav.
- Nút "Đặt thiết kế" (`nav.customOrder`): sau các link, viền bo tròn `currentColor`, cao 1.875 rem (30 px ở gốc 16 px), link tới `CONTACT_PATH` (`/contact`, không kèm sản phẩm); cùng điều kiện hiển thị ≥ 1024 px (`--nav-link-display`), hover/focus giảm opacity. Dưới 1024 px mục này nằm trong burger menu.
- Mega menu: mở sau 280 ms hover (hover-intent), đóng sau 150 ms rời link / 120 ms rời panel, cooldown 350 ms sau khi đóng, đóng bằng Esc/backdrop/khi header bị ẩn/khi bấm link. Panel trượt từ trên, render qua portal vào `body`.
- Dữ liệu: `useCategories()` → mỗi danh mục hiện tiêu đề (link `/shop/<cat>`), các danh mục con (`/shop/<cat>/<sub>`), "Xem tất cả". Chỉ hiện `MAX_INLINE_CATEGORIES = 4` cột; nhiều hơn thì thêm link "Xem thêm" tới `/shop`.
- `<UserMenu />` đang được comment trong `HeaderNav` (không hiển thị); phần tài khoản nằm trong burger menu.

### 4.3 `SearchBar`

Ô tìm kiếm thu gọn → mở rộng khi bấm; focus sau 200 ms. Dùng `useAutocomplete(limit)` (debounce 300 ms, ≥ 2 ký tự); `limit` theo màn hình qua `useBreakpoint`: mobile 5, tablet 8, desktop 10 (BE nhận 1–10). Dropdown (id `search-autocomplete-dropdown`) chỉ hiện sau khi animation mở rộng xong (`EXPAND_MS` = 300 ms, trạng thái `settled`) để đo vị trí theo ô input ở kích thước cuối, và hiện khi query ≥ 2 ký tự **hoặc** có lịch sử; mỗi dòng gồm ảnh, tên, giá. Danh sách = lịch sử khớp trước, rồi gợi ý từ BE không trùng `id` với lịch sử (theo kiểu Google). Query rỗng: chỉ hiện lịch sử dưới tiêu đề `recent`; đang gõ: lịch sử lọc theo tên chứa từ khóa (không phân biệt hoa thường) và không có tiêu đề. Dòng lịch sử có icon lịch sử (`History`) trước ảnh, còn dòng gợi ý có icon kính lúp (`Search`) cùng cỡ 14 px và màu `--text-disabled` để ảnh thẳng hàng và nút ✕ (`removeRecent`) xóa riêng mục đó. Phím: ↑/↓ chuyển mục trên cả danh sách gộp (vòng tròn), Enter mở mục đang chọn, Esc đóng và xóa. Bấm ra ngoài chỉ đóng khi query rỗng và không có kết quả. Chọn một dòng (gợi ý hay lịch sử) → thêm vào lịch sử, rồi `getProductUrl(id)` tra URL đầy đủ và `router.push`, thất bại → `/shop`. Từ khóa gõ không được lưu, chỉ lưu sản phẩm đã chọn. Chuỗi: `shared.header.search` (`placeholder`, `loading`, `noResults`, `clear`, `recent`, `removeRecent`).

**Lịch sử (`useSearchHistory`)**: mảng `AutocompleteItem` mới nhất trước, lưu ở `localStorage` khóa `doovan-search-history` (JSON thuần), tối đa `SEARCH_HISTORY_MAX = 5`. Thêm một mục sẽ bỏ bản trùng `id` và đưa lên đầu. Đọc sau khi mount (server luôn render rỗng) và đồng bộ giữa các tab qua sự kiện `storage`; mỗi lần ghi đọc lại từ storage trước để hai tab không đè nhau. Lỗi quota/storage bị chặn thì bỏ qua. Giá, ảnh, `badge` là bản chụp lúc lưu, không tự làm mới. Không đi qua Redux store.

### 4.4 `HamburgerMenu`

- Nút mở (`drawer.open`) và drawer qua portal; khóa scroll khi mở. Link: **Đặt thiết kế** (đầu danh sách; không có mục Home — logo đã dẫn về trang chủ), Shop (accordion), New In, Collections, Về DOOVAN (`nav.about`, link `/about`), không đánh số thứ tự; mỗi mục có mô tả `navDescription.<key>`. Mục Đặt thiết kế (`customOrder`, link `CONTACT_PATH`, đánh dấu `featured` trong `NAV_LINKS`) vẽ thành hàng nổi bật nhẹ (class `drawer-nav-featured` trong `globals.css`): nền vàng nhạt (alpha 0,08), viền vàng, icon kéo `Scissors` màu vàng (không vòng tròn), chữ vàng, mũi tên `ArrowRight` trượt khi hover; hover/focus đậm nền và viền hơn; không animation, không bóng (transition tắt khi `prefers-reduced-motion`).
- Accordion Shop liệt kê danh mục (`useCategories`) và danh mục con.
- `AuthDrawerSection`: chưa đăng nhập → nút "Sign in" tới `/login`; đã đăng nhập → hàng avatar + tên + email là nút thu/mở (`aria-expanded`, mũi tên ▾ xoay 180°) một panel collapse (`#drawer-account-panel`, animation chiều cao) chứa link My account / Wishlist / Orders và nút đăng xuất `SignOutButton variant="drawer"` (hỏi xác nhận bằng `ConfirmDialog` — nằm trên drawer nhờ `z-200` — rồi `logout()` và đóng drawer; hủy thì drawer giữ nguyên; component thuộc [auth](./auth.md)). Mặc định đóng; state nằm trong component nên đóng lại mỗi khi drawer đóng.
- Panel nổi bật (featured) dùng banner từ site config `NAV_MENU_BANNERS` (`useBannerConfig`); không có banner thì không hiển thị. CTA mở `ctaHref` (mặc định `/shop`).
- Drawer không có chân trang: sau khu nav/banner là hết; đổi ngôn ngữ, mạng xã hội, link pháp lý và copyright chỉ nằm ở `SiteFooter`.

### 4.5 `UserMenu`

Component dropdown hover (avatar → My account, Wishlist, Orders, Sign out; khách → nút đăng nhập). Hiện **không** được render trong header. File vẫn được dùng vì xuất `UserAvatar` (avatar tròn: ảnh Google hoặc chữ cái đầu; là `<button>` chỉ khi có `onClick`, còn lại là `<span>` để dùng được bên trong nút/link khác như hàng toggle của burger menu) cho burger menu và trang Account.

### 4.6 `SiteFooter`

Nền `--bg-dark`. Cột: Brand (wordmark, `tagline`, khối `<address>` gồm hai dòng có nhãn (`footer.address`, `footer.hotline`): địa chỉ `CONTACT_ADDRESS` — link `CONTACT_MAPS_URL` — và hotline `CONTACT_PHONE` — link `tel:` —, `SocialIcons`), Explore (Shop, New In, Collections, Về DOOVAN), Policies (tiêu đề `footer.policies.title` = "Chính sách" / "Policies", ba link `LEGAL_DOCS`: Terms, Privacy, Shipping & Returns — nhãn `shared.legal.<key>`), Language (`LanguageSwitcher variant="footer"`). Footer không còn cột tài khoản. Thanh dưới chỉ có `copyright` (năm hiện tại). Nhãn link Explore lấy từ `shared.header.nav` để khớp header; chuỗi footer ở `shared.footer`.

### 4.7 `CartFAB`

Nút tròn vàng góc dưới phải của cột nội dung (`z-20`, `right` = `--page-edge` + 1 rem / `sm:` 1.5 rem), chỉ hiện sau khi client mount và khi `totalItems > 0` (`selectTotalItems` của slice cart); badge số lượng, nảy 600 ms mỗi lần số đổi; link `/cart`; `aria-label` `shared.cart.fab.viewBag`. Ẩn khi đường dẫn là `/cart` hoặc bắt đầu bằng `/checkout` (các trang đó có nút thanh toán riêng, nút nổi chỉ che chúng). Mount ở root layout nên có mặt ở mọi trang kể cả `/admin`.

### 4.8 Nguồn dữ liệu

`useCategories` (`GET /api/categories?sort=priority&limit=200`), `useBannerConfig("NAV_MENU_BANNERS")`, `useAutocomplete` (`GET /api/products/autocomplete?q=&limit=`). Chi tiết: [data-layer](./data-layer.md). Banner `NAV_MENU_BANNERS` cấu hình ở [site-config](../admin/site-config.md).

- `AutocompleteItem` = `{ id, name, slug, priceVnd, priceUsd, image, badge }`; dropdown tìm kiếm hiện giá theo ngôn ngữ (`useMoney`) và ẩn giá sản phẩm `custom_order` theo `badge`. BE khớp tên/slug theo "chứa" (tên bắt đầu bằng từ khóa xếp trước), chỉ sản phẩm `active`. Danh sách cuộn khi cao quá `min(60vh, 560px)`.
