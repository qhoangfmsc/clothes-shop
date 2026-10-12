# 03 — Tailwind CSS Styling Convention

## Nguyên tắc

1. **Tất cả styling dùng Tailwind utility classes** — layout, spacing, màu, typography, border, shadow, responsive, hover, focus, transition.
2. **`globals.css` CHỈ cho `@keyframes`** — mọi animation custom định nghĩa trong `globals.css` dưới dạng `@keyframes`.
3. **Không tạo file `.css` / `.module.css` mới** — trừ khi thêm `@keyframes` mới vào `globals.css`.
4. **Inline `style={}` chỉ dùng cho giá trị động** — ví dụ: `style={{ opacity: loading ? 0.5 : 1 }}`.
5. **Không inline static styles** — màu tĩnh, spacing tĩnh, font tĩnh → dùng class.

---

## ✅ ĐÚNG — Tailwind classes

```tsx
// Layout + typography + màu + spacing — tất cả qua class
<div className="flex items-center gap-4 p-6 bg-secondary rounded-lg">
  <h2 className="font-display text-2xl text-heading tracking-tight">
    Title
  </h2>
  <p className="font-primary text-sm text-muted">
    Description text here
  </p>
  <button className="px-5 py-2.5 bg-accent-gold text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity">
    Action
  </button>
</div>
```

## ✅ ĐÚNG — Inline style cho dynamic values

```tsx
// Chỉ giá trị thay đổi theo state mới dùng inline
<div
  className="p-4 rounded-lg"
  style={{
    opacity: isVisible ? 1 : 0,
    transform: `translateY(${offset}px)`,
  }}
>
```

## ✅ ĐÚNG — `globals.css` cho animation

```css
/* globals.css */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

```tsx
<div className="animate-[fadeInUp_0.4s_cubic-bezier(0.25,0.1,0.25,1)_forwards]">
```

---

## ❌ SAI

```tsx
// ❌ Inline static styles
<div style={{ display: "flex", padding: "16px", color: "#C9A96E" }}>

// ✅ Dùng class
<div className="flex p-4 text-accent-gold">

// ❌ Hardcode hex
<div style={{ background: "#FBF8F1" }}>
<div className="bg-[#FBF8F1]">

// ✅ Dùng token class
<div className="bg-primary">

// ❌ Tạo file CSS riêng
// Component.module.css
// product-styles.css
```

---

## Khi nào dùng gì

| Trường hợp | Cách làm |
|------------|----------|
| Layout, flex, grid | `className="flex items-center gap-4"` |
| Spacing (margin, padding) | `className="p-4 mt-6"` |
| Màu sắc | `className="text-accent-gold bg-primary"` |
| Typography | `className="font-display text-2xl"` |
| Border, radius | `className="border border-subtle rounded-md"` |
| Responsive | `className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"` |
| Hover / Focus | `className="hover:opacity-90 focus:ring-2"` |
| Transition | `className="transition-opacity duration-200"` |
| Dynamic value (state) | `style={{ opacity: loading ? 0.4 : 1 }}` |
| Animation (`@keyframes`) | `globals.css` → class |
| Shadow | `className="shadow-md"` |

---

## Docs (mandatory)

This work changes a module, so it is part of the docs loop (`.agent/rules/module-docs.md`, `.agent/skills/07-module-docs.md`):

1. **Before editing** — `yarn docs:who <file|folder|module>`, read the owning doc(s) and the module's code; if they disagree, fix the doc first.
2. **After editing** — update the module doc in the same change (affected sections, `Cập nhật` date) and run `yarn docs:check --changed`. Not done until it passes.

