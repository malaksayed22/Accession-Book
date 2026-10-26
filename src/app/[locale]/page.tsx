import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/BrandLogo";
import { ComplianceLedger } from "@/components/marketing/ComplianceLedger";
import { HelixHero } from "@/components/marketing/HelixHero";
import { LifecycleTrack } from "@/components/marketing/LifecycleTrack";
import { InsightCharts } from "@/components/marketing/InsightCharts";
import { Magnetic } from "@/components/marketing/Magnetic";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Marquee } from "@/components/marketing/Marquee";
import { PillLink } from "@/components/marketing/PillLink";
import { Reveal } from "@/components/marketing/motion";
import { PillarStage } from "@/components/marketing/PillarStage";
import { ScrollProgress } from "@/components/marketing/ScrollProgress";
import { ScrollText } from "@/components/marketing/ScrollText";
import { SectionIntro } from "@/components/marketing/SectionIntro";
import { SmoothScroll } from "@/components/marketing/SmoothScroll";
import { SpotlightGrid } from "@/components/marketing/SpotlightGrid";
import { Verticals } from "@/components/marketing/Verticals";
import { resolveRequestLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { getSessionUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The share card is a file route at the site root (see app/opengraph-image.tsx). It sits above the
 * root layout, so Next does not attach it to this page on its own.
 */
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${BRAND.name} · ${BRAND.tagline}`,
};

type Props = { params: Promise<{ locale: string }> };

/**
 * The root layout marks the whole site `noindex` so no signed-in page can be crawled. This is the
 * one public page, so it opts back in, in each language, and says where its translation lives.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveRequestLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  const languages = Object.fromEntries(routing.locales.map((code) => [code, `/${code}`]));

  return {
    title: { absolute: `${BRAND.name} · ${t("title")}` },
    description: t("description"),
    robots: { index: true, follow: true },
    alternates: { canonical: `/${locale}`, languages },
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      title: `${BRAND.name} · ${t("title")}`,
      description: t("description"),
      url: `/${locale}`,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      alternateLocale: locale === "fr" ? ["en_CA"] : ["fr_CA"],
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND.name} · ${t("title")}`,
      description: t("description"),
      images: [SHARE_IMAGE.url],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const locale = await resolveRequestLocale(params);
  const [user, t] = await Promise.all([
    getSessionUser(),
    getTranslations({ locale, namespace: "marketing" }),
  ]);
  const signedIn = user !== null;
  const entryHref = signedIn ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-bg text-fg">
      <SmoothScroll />
      <ScrollProgress />
      <MarketingHeader signedIn={signedIn} />

      <main id="main" tabIndex={-1} className="outline-none">
        <HelixHero signedIn={signedIn} />
        <Marquee />

        <Section
          id="platform"
          kicker={t("platform.kicker")}
          title={t("platform.title")}
          intro={t("platform.intro")}
        >
          <div className="mt-14">
            <PillarStage />
          </div>
        </Section>

        <Section
          id="insight"
          tinted
          compact
          kicker={t("insight.kicker")}
          title={t("insight.title")}
          intro={t("insight.intro")}
        >
          <div className="mt-10">
            <InsightCharts />
          </div>
        </Section>

        <Section
          id="industries"
          kicker={t("industries.kicker")}
          title={t("industries.title")}
          intro={t("industries.intro")}
        >
          <div className="mt-14">
            <Verticals />
          </div>
        </Section>

        <section
          id="lifecycle"
          aria-labelledby="lifecycle-title"
          className="scroll-mt-20 border-b border-border py-16 sm:py-20"
        >
          <LifecycleTrack>
            <SectionIntro
              id="lifecycle-title"
              kicker={t("lifecycle.kicker")}
              title={t("lifecycle.title")}
              intro={t("lifecycle.intro")}
            />
          </LifecycleTrack>
        </section>

        <Section
          id="system"
          className="power-scope"
          kicker={t("capabilities.kicker")}
          title={t("capabilities.title")}
        >
          <SpotlightGrid />
        </Section>

        <section
          aria-label={t("compliance.kicker")}
          className="border-b border-border py-24 sm:py-36"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <ScrollText
              text={t("statement.text")}
              className="text-3xl leading-[1.2] font-medium tracking-[-0.02em] text-fg sm:text-5xl"
            />
          </div>
        </section>

        <section
          id="compliance"
          aria-labelledby="compliance-title"
          className="scroll-mt-20 border-b border-border bg-surface py-20 sm:py-28"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-20">
            <div className="lg:sticky lg:top-28">
              <SectionIntro
                id="compliance-title"
                kicker={t("compliance.kicker")}
                title={t("compliance.title")}
              />
              <Reveal>
                <p className="mt-6 text-lg leading-relaxed text-fg-secondary">
                  {t("compliance.p1")}
                </p>
                <p className="mt-4 leading-relaxed text-fg-secondary">{t("compliance.p2")}</p>
              </Reveal>
            </div>
            <ComplianceLedger />
          </div>
        </section>

        <section
          aria-labelledby="cta-title"
          className="grain relative isolate overflow-hidden py-24 sm:py-32"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="dot-grid absolute inset-0 opacity-60 mask-[radial-gradient(ellipse_at_50%_50%,black,transparent_70%)]" />
          </div>
          <Reveal className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="mb-5 font-mono text-xs tracking-[0.14em] text-accent-text uppercase">
              {t("cta.kicker")}
            </p>
            <h2
              id="cta-title"
              className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance min-[400px]:text-5xl sm:text-7xl"
            >
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base text-fg-secondary sm:text-lg">{t("cta.body")}</p>
            <div className="mt-10 flex justify-center">
              <Magnetic className="max-sm:w-full max-sm:max-w-sm">
                <PillLink href={entryHref} size="lg" className="max-sm:w-full">
                  {signedIn ? t("header.openWorkspace") : t("header.signIn")}
                </PillLink>
              </Magnetic>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-fg-secondary sm:flex-row sm:px-6 sm:text-start">
          <BrandLogo size="sm" />
          <p>
            {t("footer.subtitle")} ·{" "}
            {t("footer.copyright", { year: String(new Date().getFullYear()) })}
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A titled band of the page. The heading is the section's accessible name. */
function Section({
  id,
  kicker,
  title,
  intro,
  tinted = false,
  compact = false,
  className,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  tinted?: boolean;
  /** Tighter vertical padding, for bands that carry a dense panel. */
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-20 border-b border-border",
        compact ? "py-14 sm:py-20" : "py-20 sm:py-28",
        tinted && "bg-surface",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionIntro id={headingId} kicker={kicker} title={title} intro={intro} />
        {children}
      </div>
    </section>
  );
}
