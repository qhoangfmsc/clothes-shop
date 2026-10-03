/* ═══════════════════════════════════════════════════════════
   SYSTEM PASSWORD — hardcoded gate for the admin area

   Not a real auth boundary (it's the same string for everyone,
   visible in source) — just a speed bump on top of the existing
   role-based AdminGuard. Change the string below to rotate it.
   ═══════════════════════════════════════════════════════════ */

export const SYSTEM_PASSWORD = "doovan@2026";
