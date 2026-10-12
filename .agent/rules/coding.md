---
trigger: always_on
---

1. Focus on writing clean code that is easy to understand, simple to read, and readable to maintain.
2. Writing code based on Google, Facebook structure, focus on perfomance and optimization.
3. When fixing bugs, or having problems, research first and find issue, then write the roadmap and explain for me why it occurred, then find the solutions and fix it.
4. Asking at least 10 questions before starting to code.
5. Always check lint error after creating code without yarn build (Not break the session), and finish with `yarn docs:check --changed` (rule 15).
6. Always ensure a responsive design for every device class — phone, tablet, iPad landscape, desktop (PC), wide screen — and for both touch and mouse. Mobile-first; verify at the test widths and report it. Follow `.agent/rules/responsive.md` and `.agent/skills/08-responsive.md` (skill `responsive`).
7. Never use the index.ts file to import all the files.
8. **Module-first architecture.** Code dùng riêng cho 1 module phải nằm trong module đó (`_common/`, `_components/`). Không để slice, types form, constants của module ra ngoài root dir (`src/store/`, `src/types/`, `src/constants/`). Root dir CHỈ chứa code dùng chung ≥2 modules. Reference `.agent/skills/01-project-structure.md` và `.agent/skills/02-api-slice-pattern.md`.
9. **Tailwind-first styling.** Tất cả styling dùng Tailwind utility classes. Không tạo file `.css` mới. `globals.css` chỉ cho `@keyframes`. Inline `style={}` chỉ cho dynamic values. Reference `.agent/skills/03-tailwind-styling.md`.
10. BE path for debugging and doing task: /Users/quochoang/Documents/Projects/clothes-shop-api/. Make sure not to edit any code in BE project.
11. **Code in English, UI through i18n.** Source code (identifiers, comments, commits) is English. All user-facing text — labels, buttons, headings, toasts, confirm/error dialogs, placeholders, `aria-label`/`title`/`alt`, metadata — comes from `src/messages/<locale>/**` via `next-intl` (`vi` default, `en`). Never hardcode UI strings; add each new key to every locale and run `yarn i18n:check`. Reference `.agent/skills/04-i18n.md`.
12. **Locale-aware navigation.** Import `Link`, `useRouter`, `usePathname`, `redirect` from `@/src/i18n/navigation` (never `next/link` / `next/navigation` for those). Write paths without the locale prefix.
13. **Reuse shared components.** Carousels/sliders use `Carousel`, admin tables use `DataTable`, etc. — see `.agent/rules/components.md` before building any UI that might already exist.
14. **One way to do list pages, errors and toasts.** Follow `.agent/skills/05-list-pages.md` (tables, search, sort, filters, pagination, limits) and `.agent/skills/06-errors-and-toasts.md` (ApiError, `useErrorMessage`, toast keys, dialogs). Run `yarn conventions:check` with the lint check; it must pass.
15. **Docs → feature → docs (closed loop).** Before touching a module run `yarn docs:who <path>` and read its doc and code; after changing it update its doc in the same change and run `yarn docs:check --changed`. A task is not done while that gate fails. Follow `.agent/rules/module-docs.md` and `.agent/skills/07-module-docs.md`.
16. **Responsive on every device class.** Layout by width (Tailwind defaults `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`), behaviour by input (touch vs mouse — iPads are wide *and* touch); every hover feature has a touch path; wide screens get a max-width wrapper; check no horizontal scroll; verify at 390 / 768 / 1024 / 1440 / 1920 and end with a one-line `Responsive:` report (or say no browser was run). Follow `.agent/rules/responsive.md` and `.agent/skills/08-responsive.md`.
