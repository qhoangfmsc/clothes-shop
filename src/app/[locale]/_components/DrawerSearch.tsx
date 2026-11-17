"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { useAutocomplete } from "@/src/hooks/use-api";
import { useMoney } from "@/src/hooks/use-money";
import { hasPublicPrice } from "@/src/lib/product-purchase";
import { productPath } from "@/src/lib/product-url";

const SUGGESTIONS = 5;

/** The burger menu's search box: below `lg` the header has no search field, so suggestions are listed right in the drawer. */
export default function DrawerSearch({ close }: { close: () => void }) {
  const t = useTranslations("shared.header.search");
  const tCommon = useTranslations("common");
  const { fmt } = useMoney();
  const { results, isLoading, search } = useAutocomplete(SUGGESTIONS);
  const [query, setQuery] = useState("");
  const asked = query.trim().length >= 2;

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 flex flex-col gap-3 lg:hidden">
      <label className="flex items-center gap-3 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-4">
        <Search size={16} aria-hidden className="shrink-0 text-[color:var(--color-champagne-gold)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 border-0 bg-transparent font-primary text-[length:var(--text-md)] tracking-[-0.02em] text-[color:var(--color-pearl-cream)] outline-none placeholder:text-[rgba(255,255,255,0.4)] [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      {asked && isLoading && results.length === 0 && <p className="m-0 font-primary text-sm text-[rgba(255,255,255,0.5)]">{t("loading")}</p>}
      {asked && !isLoading && results.length === 0 && <p className="m-0 font-primary text-sm text-[rgba(255,255,255,0.5)]">{t("noResults", { query })}</p>}

      {results.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {results.map((item) => (
            <li key={item.id}>
              <Link href={productPath(item) ?? "/shop"} onClick={close} className="flex min-h-11 items-center gap-3 rounded-md py-1.5 no-underline">
                <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-[rgba(255,255,255,0.06)]">
                  {item.image && <Image src={item.image} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-primary text-[length:var(--text-md)] tracking-[-0.02em] text-[color:var(--color-pearl-cream)]">{item.name}</span>
                  <span className="font-primary text-xs tracking-[-0.02em] text-[color:var(--color-champagne-gold)]">
                    {hasPublicPrice(item.badge) ? fmt(item, "price") : tCommon("priceOnRequest")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
