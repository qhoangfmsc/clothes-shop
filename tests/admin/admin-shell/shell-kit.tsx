import AdminLayoutClient from "@/src/app/[locale]/(admin)/AdminLayoutClient";
import { countsApi, unlockSystem, type CountsAnswer } from "@/tests/_support/admin";
export { countsApi };
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { IdentityName } from "@/tests/_support/identities";

/* The fake BE and the render function shared by the admin shell tests. */

export interface ShellOptions {
  as?: IdentityName | AuthUser;
  path?: string;
  locale?: "vi" | "en";
  /** What `GET /api/admin/pending-counts` answers (default: nothing waiting) */
  counts?: CountsAnswer;
  /** Skip the system password, as if it had just been entered (default true) */
  unlocked?: boolean;
  waitForAuth?: boolean;
}

export async function renderShell(options: ShellOptions = {}) {
  const { as = "adminFull", path = "/admin", locale, counts, unlocked = true, waitForAuth } = options;
  navigation.pathname = path;
  if (unlocked) unlockSystem();
  const calls = countsApi(counts);
  const view = await renderApp(
    <AdminLayoutClient>
      <p>page content</p>
    </AdminLayoutClient>,
    { as, locale, waitForAuth }
  );
  return { calls, ...view };
}
