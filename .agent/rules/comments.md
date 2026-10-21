---
trigger: always_on
---

# Comments — few, short, only the why

1. **Default: no comment.** Good names, types and small functions say *what* the code does.
2. Write one only for what the code cannot say: *why* it is done this way, a constraint or gotcha, a non-obvious behaviour, a workaround (and for what).
3. **One line when possible, never more than 3 lines** (a block, or `//` lines in a row), about 100 columns wide.
4. Exported function, hook or component: at most a one-line `/** summary */`. Types belong in TypeScript; `@param` / `@returns` only in `.mjs` files, which have no types.
5. **Never write:** banners or decoration (`═══`), usage examples (they live in docs, skills and tests), the obvious, the code restated in words, history ("added for…", "used to be…"), commented-out code, a TODO (put it in the spec, section 7).
6. A file header is at most one line, and only when the file name does not already say what it is.
7. A single-line divider `/* ── Name ── */` is fine in a long file; no ornaments around it.
8. English. Change or delete a comment in the same edit that makes it wrong.

Enforced by `yarn conventions:check` (rule `comment-length`: a block over 3 lines, more than 3 `//` lines in a row, or a `═` banner). Files that still break it are listed in `scripts/comment-baseline.json`; trimming a file means removing it from that list, and a file may never be added. Comments in code you write or change follow this rule; shorten the long ones you touch.
