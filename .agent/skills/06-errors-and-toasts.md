# 06 — Errors, toasts and dialogs (admin **and** storefront)

One way to fail, one way to tell the user. Same rules for admin pages, checkout, orders, uploads, login.

`yarn conventions:check` enforces the mechanical parts.

## 1. Where errors come from

Every request helper throws **`ApiError`** (`src/lib/api.ts`): `message` (server text or `""`), `status`, `errorCode` (BE code, e.g. `1606`) and `code` (the same as a string — Redux's error serializer keeps `code`, so the BE code survives `dispatch(thunk).unwrap()`).

- `authApi` (admin / Redux), `api` (public), `useApiAuth().apiFetch` (client pages), `uploadMediaFile`, `auth-context.login` all throw `ApiError` with the BE `errorCode`. A new request helper must do the same.
- Thunks may `rejectWithValue({ message, errorCode })` (media does) — `useErrorMessage` reads both shapes.
- Client code that has nothing server-provided throws `new Error("")` (no text).

## 2. Turning an error into text — `useErrorMessage()` only

```tsx
const toErrorMessage = useErrorMessage();   // @/src/i18n/use-error-message — stable between renders
...
} catch (err) {
  toast.error(toErrorMessage(err, t("toast.saveFailed")));
}
```

Order: translation for the BE code (`shared.errors.byCode.<code>`) → the server's own text → the translated fallback. **Never** import the bare `errorMessage` helper in `src/app` (convention `error-message`): it ignores error codes and the plain objects `unwrap()` throws.

New BE error code the user can hit → add `shared.errors.byCode.<code>` in **en + vi** (already: 1101 1106 1107 1108 1603 1605 1606).

## 3. Toasts

`const { toast } = useToast()` → `success | error | info | warning`. Text always from `t(...)` (convention `toast-i18n`).

| Situation | Toast | Message key |
|---|---|---|
| Create / update / delete OK | `success` | `toast.created` · `toast.updated` · `toast.deleted` (name the thing: "Category deleted") |
| Save / delete failed | `error` | `toErrorMessage(err, t("toast.saveFailed" \| "toast.deleteFailed"))` |
| Module-specific action | success / error | `toast.<verb>` + `toast.<verb>Failed` (`roleUpdated`/`roleFailed`, `statusChanged`/`statusFailed`, `reordered`/`reorderFailed`) |
| Validation the user can fix | `error` | `toast.<reason>` (no `toErrorMessage`) |
| Neutral feedback (wishlist toggled, link copied) | `info` / `success` | `toast.<event>` |
| Page **data fails to load** (orders, order detail) | `error` | `toErrorMessage(err, t("toast.loadFailed"))` — never swallow into an empty state |
| Table list fails to load | `DataTable` `onError` (empty table) or an inline error panel with retry (media) | — |
| Optional widget (header categories, recent-orders card) | silent, with a one-line comment | — |

A modal form that fails **stays open** (keep the user's input); close it only on success.

## 4. Dialogs

Destructive / irreversible → `await confirm({ title, message, confirmLabel, danger: true })` from `useConfirm()`. Never `window.confirm`, `alert`, `prompt` (convention `native-dialog`). Bulk actions report partial failure with one success and one failure toast (`deletedMany` / `deleteFailedMany`).

## 5. Effects & callbacks

`toErrorMessage`, `t` and `toast` are stable, so they are safe in dependency arrays — include them (the lint rule `react-hooks/exhaustive-deps` is not optional).

## 6. Checklist

1. Request helper throws `ApiError` with `errorCode`.
2. `useErrorMessage` + `toast.error` with a translated fallback.
3. Toast keys follow §3 and exist in en + vi (`yarn i18n:check`).
4. New BE codes mapped in `shared.errors.byCode`.
5. `yarn conventions:check`.
