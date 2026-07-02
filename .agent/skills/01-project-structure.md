# 01 — Cấu trúc thư mục & Module Architecture

## Cây thư mục chuẩn

```
src/
├── app/                            # App Router — pages, layouts, API routes
│   ├── layout.tsx                  # Root layout (Server Component)
│   ├── page.tsx                    # Root page — re-exports default public page
│   ├── globals.css                 # Design tokens + global overrides
│   ├── _components/                # Shared components dùng chung cross-page
│   │   ├── Logo.tsx
│   │   ├── HeaderNav.tsx
│   │   ├── Footer.tsx
│   │   └── CustomCursor.tsx
│   ├── (auth)/                     # Route group: auth
│   │   └── login/
│   │       ├── page.tsx
│   │       └── _components/
│   ├── (private)/                  # Route group: protected pages (future)
│   │   └── .gitkeep
│   └── (public)/                   # Route group: public pages
│       ├── layout.tsx              # Shared layout cho public pages
│       ├── landing-page/           # ← Module landing-page
│       │   ├── page.tsx
│       │   ├── _components/
│       │   │   ├── BlackPanel.tsx
│       │   │   ├── Caption.tsx
│       │   │   ├── ProductInfo.tsx
│       │   │   ├── VideoContainer.tsx
│       │   │   ├── ViewButton.tsx
│       │   │   └── WhiteOverlay.tsx
│       │   └── _common/
│       │       └── constants.ts
│       └── about/                  # ← Module about
│           ├── page.tsx
│           ├── _components/
│           │   ├── InvitationHero.tsx
│           │   ├── BrandStory.tsx
│           │   ├── ServicesSection.tsx
│           │   └── ContactCTA.tsx
│           └── _common/
│               └── constants.ts
```

## Module Architecture

Mỗi module (route) là **đơn vị độc lập**, chứa đủ code riêng. Tham khảo mô hình domain-driven.

```
app/(group)/module-name/
├── page.tsx
├── _components/        # Components riêng module
├── _types/             # Types/interfaces riêng module
├── _constants/         # Constants riêng module
├── _hooks/             # Custom hooks riêng module
└── _common/            # Utils, constants, helpers riêng module
```

### Sub-modules

Khi module có sub-modules → mỗi sub-module giữ `_types/` riêng. Parent chỉ chứa types **dùng chung**.

## Quy tắc

1. **Prefix `_`** — mọi folder private dùng `_` để Next.js không coi là route segment.
2. **Shared components** → `src/app/_components/`. Chỉ chứa components dùng ≥2 pages (Header, Footer, Logo, Cursor).
3. **Components riêng module** → `module/_components/`. KHÔNG đặt trong shared nếu chỉ dùng 1 module.
4. **Constants riêng module** → `module/_common/constants.ts`.
5. **Không tạo `src/components/`** — tất cả shared components nằm trong `src/app/_components/`.

## Import Rules

| Từ                 | Đến                                | Cách import         |
| ------------------ | ---------------------------------- | ------------------- |
| Trong cùng module  | `_components/`, `_common/`         | Relative `./` `../` |
| Sibling module     | `../../about/_components/`         | Relative            |
| Shared components  | `@/src/app/_components/`           | Absolute `@/`       |
| Root configs       | `@/src/app/globals.css`            | Absolute `@/`       |

## Đặt tên thư mục

| Loại            | Convention    | Ví dụ                     |
| --------------- | ------------- | ------------------------- |
| Route folders   | `kebab-case`  | `landing-page/`           |
| Route groups    | `(camelCase)` | `(public)/`, `(auth)/`    |
| Private folders | `_prefix`     | `_components/`, `_common/`|
| Component files | `PascalCase`  | `BlackPanel.tsx`          |
| Utility files   | `camelCase`   | `constants.ts`            |

## Design System

Mọi component UI **BẮT BUỘC** tham khảo `DESIGN.md` trước khi code. Tuân thủ:
- CSS custom properties (không hardcode hex)
- Inter Tight 500
- 4px spacing grid
- Section background rotation
- Warm-toned shadows
- `prefers-reduced-motion` fallbacks
