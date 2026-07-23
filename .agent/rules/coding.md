---
trigger: always_on
---

1. Focus on writing clean code that is easy to understand, simple to read, and readable to maintain.
2. Writing code based on Google, Facebook structure, focus on perfomance and optimization.
3. When fixing bugs, or having problems, research first and find issue, then write the roadmap and explain for me why it occurred, then find the solutions and fix it.
4. Asking at least 10 questions before starting to code.
5. Always check lint error after creating code without yarn build (Not break the session).
6. Always ensure a responsive design, prioritizing the interface layout in the order of Phone - Desktop - iPad.
7. Never use the index.ts file to import all the files.
8. **Module-first architecture.** Code dùng riêng cho 1 module phải nằm trong module đó (`_common/`, `_components/`). Không để slice, types form, constants của module ra ngoài root dir (`src/store/`, `src/types/`, `src/constants/`). Root dir CHỈ chứa code dùng chung ≥2 modules. Reference `.agent/skills/01-project-structure.md` và `.agent/skills/02-api-slice-pattern.md`.
9. **Tailwind-first styling.** Tất cả styling dùng Tailwind utility classes. Không tạo file `.css` mới. `globals.css` chỉ cho `@keyframes`. Inline `style={}` chỉ cho dynamic values. Reference `.agent/skills/03-tailwind-styling.md`.
10. BE path for debugging and doing task: /Users/quochoang/Documents/Projects/clothes-shop-api/. Make sure not to edit any code in BE project.
