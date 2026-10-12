---
name: errors-and-toasts
description: Show an error, toast or confirm dialog anywhere in the app (admin or storefront) — API errors, BE error codes, toast keys, load failures, confirmations. Use whenever code has a catch block, toast.*, useConfirm, or a request helper that can fail.
---

# errors-and-toasts skill (clothes-shop)

The full convention lives in **`.agent/skills/06-errors-and-toasts.md`** — read it first and follow it exactly.

Quick checklist:

1. Request helpers throw `ApiError` (carries the BE `errorCode`).
2. Convert errors with `useErrorMessage()` (`toErrorMessage(err, t("toast.xFailed"))`) — never the bare `errorMessage` helper.
3. Toast text always from `t(...)`; CRUD keys are `toast.created / updated / deleted / saveFailed / deleteFailed`.
4. A page whose data fails to load shows an error toast (or inline error) — never silently an empty state.
5. Confirmations use `useConfirm()`; no `window.confirm` / `alert`.
6. New BE error code → `shared.errors.byCode.<code>` in en + vi.
7. Run `yarn i18n:check`, `yarn conventions:check`, `npx tsc --noEmit`.
