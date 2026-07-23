# 🧠 STRATEGIC ADVISORY — Brainstorm Phát triển Dự án

> **Ngày:** 2026-07-22
> **Tác giả:** BA/PO — 10 năm kinh nghiệm E-Commerce & Fashion Boutique
> **Mục đích:** Đánh giá toàn diện dự án, chỉ ra những gì còn thiếu, cần sync, và cố vấn chiến lược phát triển

---

## 📋 EXECUTIVE SUMMARY

Dự án Ori Baebi đã đạt được nền tảng kỹ thuật vững chắc: BE NestJS với 22 admin endpoints + 32 client endpoints, FE Next.js với SSR/ISR + CSR hybrid, hệ thống phân quyền hoạt động đồng bộ 2 chiều. **Tuy nhiên, từ góc nhìn của một sản phẩm E-Commerce thực tế, dự án mới hoàn thành ~60% những gì cần thiết để vận hành thương mại.**

Báo cáo này không liệt kê lại những gì đã làm (xem `ADMIN_PROGRESS.md` và `CLIENT_PROGRESS.md`), mà tập trung vào:

1. **Sync Gaps** — Những điểm lệch pha giữa BE và FE đang gây lãng phí hoặc rủi ro
2. **Chưa làm** — Danh sách tính năng/phần việc cụ thể chưa được triển khai
3. **Cố vấn chiến lược** — Góc nhìn từ senior dev 10 năm về kiến trúc, kỹ thuật, sản phẩm
4. **Còn thiếu** — Những mảng lớn chưa có trong dự án

---

## 1. 🔄 SYNC GAPS — LỆCH PHA BE↔FE

Đây là những điểm BE đã làm nhưng FE chưa dùng, hoặc FE đã làm nhưng chưa khớp BE. Mỗi gap là một cơ hội bị bỏ phí.

### 1.1 BE có → FE chưa dùng (Lãng phí công sức BE)

| # | BE Endpoint | Đã làm | FE Chưa có | Impact |
| --- | --- | --- | --- | --- |
| 1 | `PATCH /api/orders/:orderId/cancel` | Cancel Order API | Order Detail không có nút Cancel | Không thể hủy đơn hàng từ FE |
| 2 | `GET /api/wishlist/check/:productId` | Check wishlist status | Dùng Zustand localStorage thay vì gọi BE | PDP heart có thể sai trạng thái khi đổi thiết bị |
| 3 | `PATCH /api/admin/users/:id` | Update User API | Redux thunk có sẵn, UI thiếu Edit Form | Không sửa được role/status user trong admin |
| 4 | `GET /api/admin/users/:id` | User Detail API | FE không gọi endpoint này | Phải fetch qua list hoặc orders |

> ⚠️ **Address CRUD** (`GET/PATCH/DELETE /api/addresses/`): Không cần sync. Đã quyết định **bỏ Address Book** khỏi FE — xem phân tích pháp lý ở mục 2.2. BE giữ Address entity để lưu shipping address trong Order (cần cho giao hàng), nhưng FE sẽ pre-fill từ đơn hàng gần nhất thay vì quản lý Address Book riêng.

### 1.2 BE Admin có → BE Public chưa có (Thiếu nhất quán)

Admin API đã có Search + Pagination + Filter + Sort chuẩn chỉnh. Public API thì chưa:

| Tính năng | BE Admin | BE Public | Ảnh hưởng đến FE |
| --- | --- | --- | --- |
| **Search** | ✅ `search` param ILIKE | ❌ Chưa có | FE không thể làm search |
| **Pagination** | ✅ `page` + `limit` | ❌ Chỉ có `limit` | FE không thể phân trang shop |
| **Filter by status** | ✅ Có | ❌ Chưa có (tự filter active) | Public luôn filter `status=active` cứng trong service |
| **Sort options** | ✅ 6 options | ✅ 3 options (price_asc/desc, newest) | Cơ bản đủ dùng |

→ **Action:** Thêm `search`, `page` vào `GET /api/products` (public). Copy logic từ `admin-product.controller` — ước tính 2-4 giờ làm.

### 1.3 FE dùng 2 hệ thống state management — ĐÃ CHỐT HƯỚNG

| Dùng cho | Công nghệ | Pattern |
| --- | --- | --- |
| Admin (5 modules) | Redux Toolkit | `createAsyncThunk` + `baseSlice` |
| Client Cart + Wishlist | Redux Toolkit | `createAsyncThunk` + `createSlice` + localStorage subscribe |
| Client SWR | `useSWR` | Stale-while-revalidate cho read-only data |
| Auth | React Context → **sẽ migrate sang Redux** | `useState` + `useEffect` |

**Quyết định:** Chọn **Option A** — Redux Toolkit cho toàn bộ state cần sync BE (Cart, Wishlist, Auth), SWR cho data fetching read-only (products, categories, reviews).

**Action items từ quyết định này:**
1. Auth: migrate từ React Context → Redux slice (`authSlice`), giữ `AuthProvider` làm wrapper mỏng
2. `use-admin-api.ts`: audit SWR hooks nào đang bị trùng lặp với Redux admin slices → loại bỏ SWR ở những chỗ admin đã dùng Redux, chỉ giữ SWR ở những chỗ Dashboard cần fetch data read-only
3. Chuẩn hóa: tất cả state shared giữa các component → Redux; data fetching 1 component dùng riêng → SWR

### 1.4 Permission System — Mapping thủ công dễ vỡ

```
BE: Permission enum (numeric 6000–10001)
FE: PERMISSIONS constants (string "PRODUCT_CREATE")
```

Hiện mapping hoàn toàn thủ công trong `lib/permissions.ts`. Nếu BE thêm permission mới, FE phải cập nhật tay 2 nơi (constant + mapping object).

**Rủi ro:** BE thêm `PRODUCT_EXPORT = 6003`, FE quên map → tính năng export không hoạt động, khó debug.

**Đề xuất:**
- BE expose 1 endpoint `GET /api/admin/permissions` trả về toàn bộ permission list
- FE gọi 1 lần khi admin login, cache vào memory
- Hoặc: generate TypeScript types từ BE Swagger spec

---

## 2. ❌ CHƯA LÀM — DANH SÁCH CỤ THỂ

Sắp xếp theo priority thực tế cho một fashion boutique store.

### 2.1 🔴 CRITICAL — ĐÃ HOÀN THÀNH (2026-07-23)

| # | Hạng mục | Trạng thái | Triển khai |
| --- | --- | --- | --- |
| 1 | **Search sản phẩm** | ✅ Done | BE: `PublicProductQueryDto.search` (ILIKE name/slug/description). FE: `SearchBar` component trên Header → `/search?q=` (dynamic SSR) → pagination server-side |
| 2 | **Filter & Sort shop** | ✅ Done | BE: `minPrice`, `maxPrice`, `sizes`, `colors`, `sort` params. FE: `ShopFilters` client component — SortSelect + FilterBar (Price Range, Size checkboxes, Color swatches) |
| 3 | **Pagination shop** | ✅ Done | BE: `page` + `limit` params. FE: `ShopProductsClient` — Load More button (24 items/page) |

### 2.2 🟡 HIGH — Khách hàng mong đợi có

| # | Hạng mục | Phạm vi | Mô tả |
| --- | --- | --- | --- |
| 4 | **Address Book** | ~~FE Account~~ | ~~Trang quản lý địa chỉ...~~ → **ĐÃ QUYẾT ĐỊNH BỎ** — xem phân tích pháp lý bên dưới |
| 5 | **Cancel Order** | FE Orders | Nút "Cancel Order" trong Order Detail (chỉ hiện khi status=pending) |
| 6 | **SEO Package** | FE | Dynamic `sitemap.xml` (products, categories, collections), `robots.ts`, JSON-LD `Product` schema, Open Graph meta tags |
| 7 | **Error Boundaries** | FE | React Error Boundary cho PDP, Cart, Checkout — tránh crash toàn trang |

> **Về Address Book & Pháp lý — ĐÃ QUYẾT ĐỊNH BỎ:**

Cần phân biệt 2 khía cạnh:

| Khía cạnh | Phân tích |
| --- | --- |
| **Lưu địa chỉ để checkout** | ✅ Hợp pháp và cần thiết — mọi nền tảng E-Commerce đều lưu shipping address. Đây là dữ liệu cần cho việc thực hiện hợp đồng mua bán, thuộc trường hợp được phép xử lý dữ liệu cá nhân không cần consent (Nghị định 13/2023/NĐ-CP, Điều 17.2.b). |
| **Lưu địa chỉ lâu dài (Address Book)** | ⚠️ Cần consent rõ ràng — nếu lưu để "tiện cho lần sau", đây không còn là dữ liệu cần thiết để thực hiện hợp đồng nữa, mà là tiện ích phụ. Cần checkbox "Lưu địa chỉ cho lần sau" với ngôn ngữ rõ ràng. |

**Khuyến nghị thực tế cho Boutique Store:**

Với quy mô hiện tại (boutique, không phải marketplace), Address Book mang lại ít giá trị vì:
- Khách hàng boutique thường mua 1-2 lần, không cần quản lý nhiều địa chỉ
- Địa chỉ giao hàng thường chỉ có 1 (nhà riêng hoặc văn phòng)
- Thêm Address Book = thêm UI phức tạp + thêm rủi ro pháp lý về lưu trữ dữ liệu

→ **Đề xuất:** Bỏ hẳn Address Book. Checkout vẫn lưu địa chỉ vào Order (cần cho giao hàng), nhưng không lưu riêng vào Address entity cho lần sau. Chỉ pre-fill form bằng địa chỉ từ đơn hàng gần nhất (cache phía FE, không lưu DB riêng).

### 2.3 🟢 NICE TO HAVE — Hoàn thiện trải nghiệm

| # | Hạng mục | Mô tả |
| --- | --- | --- |
| 8 | **User Edit Form (Admin)** | Thêm dropdown Role + Status vào Edit User Modal |
| 9 | **Wishlist Check API** | Gọi `GET /api/wishlist/check/:productId` khi vào PDP để sync trạng thái |
| 10 | **Page Transitions** | Áp dụng `RouteTransition` component cho toàn bộ page |

---

## 3. 🧭 CỐ VẤN CHIẾN LƯỢC — GÓC NHÌN SENIOR DEV 10 NĂM

### 3.1 KIẾN TRÚC & KỸ THUẬT

#### 3.1.1 Thiếu Testing — Rủi ro lớn nhất hiện tại

```
FE: 0 tests
BE: 0 tests (có script jest nhưng passWithNoTests)
```

Một dự án E-Commerce vận hành thực tế mà không có test là **rủi ro không chấp nhận được**. Một bug checkout có thể gây mất đơn hàng, mất tiền thật.

**Lộ trình đề xuất:**

| Giai đoạn | Loại test | Target |
| --- | --- | --- |
| Ngay bây giờ | BE: Unit test cho services (Cart, Order, Auth) | 80% coverage critical path |
| Tuần tới | BE: Integration test cho checkout flow | Happy path + edge cases |
| 2 tuần | FE: Component test cho PDP, Cart, Checkout | User interaction flows |
| 1 tháng | E2E: Playwright/Cypress cho purchase flow | 1 test case = search → add → checkout |

**Chi tiết BE test cần viết ngay:**

```
CartService:
  - addItem: thêm item mới → tạo cart item
  - addItem: same product+size+color → tăng quantity
  - addItem: product disabled → throw error
  - addItem: product not found → throw 404
  - removeItem: xóa item → cart cập nhật
  - clearCart: xóa toàn bộ items

OrderService:
  - checkout: happy path → create order, clear cart
  - checkout: cart empty → throw error
  - checkout: product disabled → throw error, rollback
  - checkout: address not found → throw error
  - updateStatus: pending → confirmed ✅
  - updateStatus: completed → shipping ❌ (invalid transition)
  - findAll/findOne: phân trang đúng, filter đúng

AuthService:
  - googleLogin: user mới → tạo user + tokens
  - googleLogin: user cũ → trả về user + tokens
  - refresh: token hợp lệ → access token mới
  - refresh: token hết hạn → throw error
```

#### 3.1.2 Thiếu CI/CD — Deploy thủ công = rủi ro

Không có GitHub Actions, không có Docker. Deploy = copy-paste thủ công.

```
Cần thiết lập:
├── .github/workflows/
│   ├── be-test.yml         → Chạy BE test trên mỗi PR
│   ├── be-deploy.yml       → Build + deploy BE lên production
│   ├── fe-test.yml         → Build check + lint FE
│   └── fe-deploy.yml       → Build + deploy FE (Vercel/Netlify)
├── Dockerfile (BE)         → Multi-stage build NestJS
├── Dockerfile (FE)         → Standalone Next.js output
└── docker-compose.yml      → Local dev: BE + DB + FE
```

#### 3.1.3 Token trong localStorage — Lỗ hổng bảo mật

```
localStorage.setItem("clothes_shop_access_token", token)
```

Token lưu trong localStorage dễ bị XSS attack (script injection có thể đọc token). Đây là vấn đề phổ biến của SPA.

**Giải pháp cho production:**
- **Short-term:** Set cookie `httpOnly` + `secure` + `sameSite=strict` từ BE, FE không cần quản lý token
- **Medium-term:** BFF (Backend For Frontend) pattern — Next.js API routes làm proxy, token ở server-side
- **Alternative:** Token trong memory (closure variable) + refresh token trong cookie httpOnly

#### 3.1.4 SSR không có pagination — Rủi ro performance

```typescript
// server-fetchers.ts
export async function getAllProducts(): Promise<Product[]> {
  const { data } = await apiFetch<...>("/api/products"); // ← fetch TOÀN BỘ
  return data;
}
```

Khi cửa hàng có 500+ sản phẩm, mỗi lần vào `/shop` sẽ fetch 500 products + join relations. Response time sẽ tăng tuyến tính.

**Đề xuất:** Pagination SSR ngay khi có >50 sản phẩm. Mỗi page 24 items.

#### 3.1.5 Refactor Product Variants

Hiện tại product variant được quản lý theo mô hình phẳng:

```
Product.sizes = ['S', 'M', 'L', 'XL']
Product.colors = [{ name: 'Red', hex: '#FF0000' }, ...]
```

Mô hình này có hạn chế:
- Không thể set giá khác nhau cho từng size (VD: XL giá cao hơn S)
- Không thể theo dõi tồn kho theo variant
- Không thể disable một variant cụ thể (VD: size M màu Đỏ hết hàng)

**Đề xuất (Phase 2):** Chuẩn hóa variant thành entity riêng:

```
ProductVariant {
  id, productId, sku, size, color, colorHex,
  price (override), stock, status (active/disabled)
}
```

Việc này ảnh hưởng đến Cart (phải lưu variantId thay vì size+color string), Order items, PDP UI.

### 3.2 SẢN PHẨM — GÓC NHÌN FASHION E-COMMERCE

#### 3.2.1 Guest Checkout — Bắt buộc cho tỉ lệ chuyển đổi

Fashion boutique store có tỉ lệ bỏ giỏ hàng rất cao nếu bắt buộc đăng nhập. Số liệu ngành: **bắt đăng nhập → mất 23-35% khách hàng tại checkout.**

**Đề xuất:** Guest Checkout flow:
```
Cart → Checkout → Nhập email + địa chỉ → Đặt hàng → Gửi email xác nhận
                                                       ↘ Link tạo tài khoản (optional)
```

BE đã có `Order.userId` nullable → sẵn sàng cho guest order.

#### 3.2.2 Abandoned Cart Recovery

Không có cơ chế nào để nhắc khách hàng quay lại khi bỏ giỏ hàng.

**Đề xuất đơn giản (không cần email):**
- Lưu `cart.updatedAt` timestamp
- FE: Khi user quay lại sau >2 tiếng → hiển thị "Your bag is waiting" banner nhẹ
- BE: Endpoint `GET /api/cart/remind` kiểm tra cart cũ

#### 3.2.3 Size Guide nên gắn với Product

Hiện tại size guide là static data map theo category. Thực tế mỗi sản phẩm có thể có bảng size riêng (đặc biệt với đồ thiết kế, boutique).

**Đề xuất:** Cho phép admin gán `sizeGuideId` vào Product khi tạo form. Nếu không có → dùng default theo category.

#### 3.2.4 Wishlist → Save for Later + Share

- **Save for Later:** Di chuyển item từ Cart → Wishlist (và ngược lại)
- **Share Wishlist:** Generate link chia sẻ wishlist (public, read-only)
- **Back in Stock:** Đăng ký nhận thông báo khi item hết hàng có lại

#### 3.2.5 Social Proof & Urgency

Những yếu tố tâm lý quan trọng trong fashion EC còn thiếu:

| Yếu tố | Cách làm |
| --- | --- |
| **Social Proof** | "X people are viewing this", "Y people bought this week" |
| **Urgency** | "Only Z left in stock", "Sale ends in 2 days" countdown |
| **Trust** | Return policy inline, secure checkout badge, customer reviews count |

#### 3.2.6 Mobile-First Optimization

Fashion boutique có >70% traffic từ mobile. Cần audit:

- PDP carousel: test swipe/touch trên iOS Safari
- Checkout form: test keyboard behavior, autofill
- Filter: mobile phải là bottom sheet, không phải sidebar
- Cart: mobile cần tối ưu layout item (ảnh nhỏ hơn, info stacked)

### 3.3 PERFORMANCE

#### 3.3.1 GSAP Animations Audit

Landing page dùng GSAP ScrollTrigger + RAF loop (80ms interval cho symbol randomizer). Trên mobile cấp thấp (iPhone 11 trở xuống, Android tầm trung), đây có thể gây:

- Pin battery drain nhanh
- Scroll jank (không mượt)
- Frame drop dưới 30fps

**Đề xuất:**
- Giảm RAF interval từ 80ms → 200ms trên mobile
- Dùng `ScrollTrigger.matchMedia()` để disable animation nặng trên mobile
- Test với Chrome DevTools Performance tab, target 60fps consistent

#### 3.3.2 Image Optimization

Product images đang dùng URL raw, resize bằng Next.js Image với `fill` + `object-cover`. Tốt nhưng có thể làm hơn:

- Thêm `sizes` attribute đúng cho responsive
- Dùng `priority` cho ảnh hero/first fold
- Dùng `placeholder="blur"` với `blurDataURL` cho loading đẹp hơn
- BE nên có image upload qua Cloudinary — upload widget + auto-copy URL, tận dụng `f_auto,q_auto` transformation

### 3.4 CODE QUALITY

#### 3.4.1 Type Generation từ BE Swagger

```
BE: @nestjs/swagger decorators → OpenAPI spec đầy đủ
FE: types viết tay trong src/types/*.ts
```

Hai bộ type dễ drift. BE đổi field → FE không biết → runtime error.

**Đề xuất:** Dùng `openapi-typescript` hoặc `@hey-api/openapi-ts` để generate FE types từ BE Swagger spec tự động:

```bash
# BE expose Swagger JSON tại /api/docs-json
# FE CI step:
npx openapi-typescript http://localhost:7001/api/docs-json -o src/types/api.generated.ts
```

#### 3.4.2 API Client có type safety

Hiện tại:

```typescript
const res = await authApi.get<ListResponse<Product>>(`/api/admin/products?${qs}`);
```

Đây là type assertion thủ công. Khi BE thay đổi response shape, FE không báo lỗi compile-time.

**Đề xuất:** Kết hợp với type generation → API client có type safety tự động. VD dùng `@hey-api/client-fetch`.

#### 3.4.3 Environment Configuration

```
FE: .env.local (1 file)
BE: .env (1 file)
```

Không có cấu trúc env cho các môi trường khác nhau (dev, staging, production).

**Đề xuất:**
```
FE: .env.development, .env.staging, .env.production
BE: .env.development, .env.staging, .env.production (NestJS ConfigModule)
```

---

## 4. 🔮 CÒN THIẾU — NHỮNG MẢNG LỚN

Đây là những tính năng/capability mà một fashion boutique store chuyên nghiệp cần có, nhưng dự án chưa bắt đầu.

### 4.1 THIẾU MẢNG KINH DOANH

| # | Hạng mục | Priority | Mô tả |
| --- | --- | --- | --- |
| 1 | **Inventory Management** | 🔴 High | Theo dõi tồn kho theo variant (size+color), tự động đánh dấu out-of-stock |
| 2 | **Discount/Promo Engine** | 🔴 High | Mã giảm giá: % off, fixed amount, free shipping, min order, expiry date, usage limit |
| 3 | **Return/Refund Flow** | 🟡 Medium | Khách yêu cầu trả hàng → Admin duyệt → Hoàn tiền/Gửi hàng mới |
| 4 | **Email Notifications** | 🔴 High | Order confirmation, shipping update, back-in-stock, welcome email |
| 5 | **Multi-language (i18n)** | 🟡 Medium | Tiếng Việt + tiếng Anh. Thị trường VN cần cả 2 |
| 6 | **Multi-currency** | 🟢 Low | VND + USD |
| 7 | **Analytics** | 🔴 High | GA4, Facebook Pixel, conversion tracking |
| 8 | **Customer Service** | 🟡 Medium | Chat widget (Tawk.to/Facebook Messenger), Contact form |

### 4.2 THIẾU MẢNG KỸ THUẬT

| # | Hạng mục | Priority | Mô tả |
| --- | --- | --- | --- |
| 9 | **Automated Testing** | 🔴 Critical | 0 tests hiện tại (xem mục 3.1.1) |
| 10 | **CI/CD Pipeline** | 🔴 Critical | Tự động test + deploy (xem mục 3.1.2) |
| 11 | **Docker Setup** | 🟡 High | Docker Compose cho local dev (BE + PostgreSQL + FE) |
| 12 | **API Rate Limiting** | 🟡 High | `@nestjs/throttler` cho public API, tránh abuse |
| 13 | **Monitoring & Logging** | 🟡 Medium | Sentry/Datadog cho error tracking, structured logging |
| 14 | **Database Backup** | 🔴 High | Automated daily backup PostgreSQL |
| 15 | **Image Upload** | 🟡 High | Upload ảnh lên Cloudinary — copy URL tự động sau khi upload, tích hợp Media Library widget vào Admin form |
| 16 | **Staging Environment** | 🟡 Medium | Môi trường test riêng trước khi deploy production |

### 4.3 THIẾU MẢNG TRẢI NGHIỆM

| # | Hạng mục | Priority | Mô tả |
| --- | --- | --- | --- |
| 17 | **Cookie Consent** | 🟡 Medium | GDPR compliance, đặc biệt nếu bán sang EU |
| 18 | **Accessibility (a11y)** | 🟡 Medium | WCAG 2.1 AA: keyboard nav, screen reader, contrast ratios |
| 19 | **PWA Support** | 🟢 Low | Service worker + manifest.json → cài lên mobile home screen |

---

## 5. 📊 ROADMAP ĐỀ XUẤT

Dựa trên phân tích trên, đây là lộ trình ưu tiên cho 3 tháng tới:

### Sprint 1-2 (2 tuần): CRITICAL FIXES — Để bán được hàng

```
Week 1:
├── BE: Thêm search + pagination vào public product API
├── FE: SearchBar component + Search Results page
└── FE: Pagination (Load More) cho ProductGrid

Week 2:
├── FE: FilterBar + SortSelect cho shop page
├── FE: Cancel Order button trong Order Detail
└── FE: Page Transitions (RouteTransition)
```

### Sprint 3-4 (2 tuần): SEO + Email + Quality

```
Week 3:
├── SEO: sitemap.xml, robots.txt, JSON-LD Product schema
├── BE: Email service (NestJS Mailer) cho order confirmation
└── FE: Error Boundaries cho PDP, Cart, Checkout

Week 4:
├── BE Tests: CartService + OrderService (critical path)
├── CI/CD: GitHub Actions cho test + lint
└── Docker: docker-compose.yml cho local dev
```

### Sprint 5-6 (2 tuần): Conversion Optimization

```
Week 5:
├── Guest Checkout flow
├── FE: Image lazy loading + responsive sizes audit
└── Cookie Consent banner

Week 6:
├── BE: Discount/Promo engine (basic: % off + fixed amount)
├── Analytics: GA4 + Facebook Pixel integration
└── Error Boundaries cho PDP, Cart, Checkout
```

### Sprint 7-8 (2 tuần): Operations

```
Week 7:
├── Admin: Image Upload (Cloudinary — upload widget + copy URL)
├── Inventory: Stock tracking per variant
└── Database: Automated backup script

Week 8:
├── Monitoring: Sentry error tracking
├── API Rate Limiting
├── Staging environment setup
└── E2E Tests: 1 purchase flow
```

---

## 6. 🎯 KẾT LUẬN

Dự án có nền tảng kỹ thuật **tốt** — BE thiết kế chuẩn (NestJS + TypeORM + DTO validation), FE sử dụng công nghệ hiện đại (Next.js 15 + SSR/ISR). Code quality ổn, có pattern nhất quán, phân quyền hoạt động đúng.

**Tuy nhiên, từ góc độ sản phẩm E-Commerce, dự án mới ở mức "có thể bán hàng cơ bản".** Ba khoảng trống lớn nhất đã được giải quyết:

| # | Khoảng trống | Trạng thái |
| --- | --- | --- |
| 1 | **Search + Filter + Pagination** | ✅ ĐÃ HOÀN THÀNH (2026-07-23) |
| 2 | **Testing (0 tests)** | 🔴 Chưa có — deploy là canh bạc |
| 3 | **Email + Analytics** | 🔴 Chưa có — không biết khách hàng là ai |

**Đề xuất ưu tiên số 1:** Hoàn thiện Search/Filter/Pagination trước (1-2 tuần). Sau đó đầu tư viết test cho critical path (checkout flow). Song song thiết lập CI/CD. Rồi mới nghĩ đến các tính năng mới.

> 📎 **File liên quan:**
> - [`ADMIN_PROGRESS.md`](ADMIN_PROGRESS.md) — Chi tiết tiến độ Admin Panel (BE + FE)
> - [`CLIENT_PROGRESS.md`](CLIENT_PROGRESS.md) — Chi tiết tiến độ Client App (BE + FE)
