import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/src/i18n/navigation";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";
import { buildMailto, CONTACT_EMAIL } from "@/src/lib/contact";
import { SOCIALS } from "@/src/lib/socials";
import { pageUrl } from "@/src/lib/structured-data";
import { getProductById } from "../shop/_lib/server-fetchers";
import OrderRequestForm from "./_components/OrderRequestForm";
import type { OrderProduct } from "./_common/types";

type ContactPageProps = {
  params: Promise<{ locale: AppLocale }>;
  /** `product` = id of the product the visitor wants to order (set by the "Order" buttons). */
  searchParams: Promise<{ product?: string | string[] }>;
};

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.contact.meta" });
  const title = withBrand(t("title"));
  return {
    title,
    description: t("description"),
    alternates: buildAlternates(locale, "/contact"),
    ...buildSocialMetadata({ locale, path: "/contact", title, description: t("description") }),
  };
}

const STEP_KEYS = ["tell", "design", "confirm"] as const;

const channelClass =
  "flex items-center gap-3 rounded-full border border-[var(--border-light)] bg-[var(--bg-elevated)] px-6 py-3.5 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-heading)] no-underline transition-colors duration-150 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] motion-reduce:transition-none";

/** The product to order, or `null` when none was given or the id is unknown (the form then works freely). */
async function loadOrderProduct(
  locale: AppLocale,
  param: string | string[] | undefined
): Promise<OrderProduct | null> {
  const id = (Array.isArray(param) ? param[0] : param)?.trim();
  if (!id) return null;
  const product = await getProductById(id);
  if (!product) return null;
  const path = `/shop/${product.category?.slug ?? ""}/${product.subcategory?.slug ?? ""}/${product.id}`;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    /* The API sends prices as decimal strings ("185.00") */
    price: Number(product.price),
    originalPrice: product.originalPrice == null ? null : Number(product.originalPrice),
    badge: product.badge,
    images: product.images,
    categoryTitle: product.category?.title ?? null,
    subcategoryLabel: product.subcategory?.label ?? null,
    description: product.description,
    material: product.material,
    url: pageUrl(locale, path),
  };
}

export default async function ContactPage({ params, searchParams }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "public.contact" });

  const { product: productParam } = await searchParams;
  const product = await loadOrderProduct(locale, productParam);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-[120px] pb-20">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-14 px-4 sm:px-6">
        <header className="flex flex-col gap-4">
          <span className="font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--accent-primary)]">
            {t("hero.label")}
          </span>
          <h1 className="m-0 font-display text-[clamp(32px,5vw,52px)] font-normal leading-[105%] tracking-[-0.04em] text-[var(--text-heading)]">
            {t("hero.heading")}
          </h1>
          <p className="m-0 max-w-[600px] font-primary text-base leading-[160%] tracking-[-0.02em] text-[var(--text-secondary)]">
            {t("hero.description")}
          </p>
        </header>

        <section aria-labelledby="contact-steps" className="flex flex-col gap-6">
          <h2
            id="contact-steps"
            className="m-0 font-display text-2xl font-normal tracking-[-0.04em] text-[var(--text-heading)]"
          >
            {t("steps.title")}
          </h2>
          <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
            {STEP_KEYS.map((key, index) => (
              <li
                key={key}
                className="flex flex-col gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-elevated)] p-5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] font-primary text-sm font-medium text-[var(--text-on-gold)]">
                  {index + 1}
                </span>
                <h3 className="m-0 font-primary text-base font-medium tracking-[-0.02em] text-[var(--text-heading)]">
                  {t(`steps.items.${key}.title`)}
                </h3>
                <p className="m-0 font-primary text-sm leading-[160%] tracking-[-0.02em] text-[var(--text-secondary)]">
                  {t(`steps.items.${key}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="contact-request" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2
              id="contact-request"
              className="m-0 font-display text-3xl font-normal tracking-[-0.04em] text-[var(--text-heading)]"
            >
              {t("form.title")}
            </h2>
          </div>
          <OrderRequestForm product={product} />
        </section>

        <section aria-labelledby="contact-channels" className="flex flex-col gap-5">
          <h2
            id="contact-channels"
            className="m-0 font-display text-2xl font-normal tracking-[-0.04em] text-[var(--text-heading)]"
          >
            {t("channels.title")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={buildMailto()} className={channelClass}>
              <Mail size={18} aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={channelClass}
              >
                <Icon size={18} />
                {label}
              </a>
            ))}
          </div>
          <p className="m-0 font-primary text-sm leading-[160%] tracking-[-0.02em] text-[var(--text-muted)]">
            {t("channels.note")}
          </p>
        </section>

        <Link
          href="/shop"
          className="self-start font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] no-underline hover:text-[var(--text-primary)]"
        >
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
