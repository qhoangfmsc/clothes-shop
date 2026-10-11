import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pickMessages, type MessageScope } from "./messages";

/** Sends the shared groups plus one role group (`public` / `private` / `admin`) to the client,
 *  so a storefront visitor never downloads admin translations (and vice versa).
 *  Use once per route-group layout. */
export default async function ScopedMessages({
  scope,
  children,
}: {
  scope: Extract<MessageScope, "public" | "private" | "admin">;
  children: ReactNode;
}) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, ["common", "shared", "auth", scope])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
