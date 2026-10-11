# Project rules

- **Code in English, UI through i18n.** All source code (identifiers, comments, commit messages) is English. Every piece of user-facing text — labels, buttons, headings, toasts, confirm/error dialogs, placeholders, `aria-label`/`title`/`alt`, page metadata — must come from the message files in `src/messages/<locale>/**` (languages: `vi` default, `en`, `fr`) via `next-intl`; never hardcode a string in a component, constant or slice, and add every new key to **all** locales. Follow `.agent/skills/04-i18n.md` (also available as the `i18n` skill) for structure, navigation helpers (`@/src/i18n/navigation`) and the `yarn i18n:check` workflow.

See `.agent/rules/coding.md` for the rest of this project's coding conventions (also followed by other AI tools used on this repo).
