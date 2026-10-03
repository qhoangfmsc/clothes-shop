# Project rules

- **English-only UI.** Every piece of user-facing text in this app — labels, buttons, headings, toasts, confirm/error dialogs, placeholders, `aria-label`/`title`/`alt` attributes, API error messages returned to the client — must be written in English. No Vietnamese (or any other language) in rendered strings, anywhere under `src/app/**`, including the admin area. This applies when writing new code and when touching existing code. Code comments are not shipped to the client and are exempt, but prefer English there too for consistency.

See `.agent/rules/coding.md` for the rest of this project's coding conventions (also followed by other AI tools used on this repo).
