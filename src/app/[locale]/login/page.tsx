import { GitBranch, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "auth.login",
  });
  return { title: t("pageTitle") };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveRequestLocale(params);
  const t = await getTranslations("auth.login");
  const hero = await getTranslations("marketing.hero");

  // A half-finished sign-in resumes where it stopped instead of asking for the password again.
  const pending = await getSession();
  const initialStep =
    pending?.state === "mfa-required"
      ? "code"
      : pending?.state === "mfa-enrolment-required"
        ? "enrol"
        : "credentials";

  const highlights = [
    { icon: GitBranch, label: t("highlights.lineage") },
    { icon: Lock, label: t("highlights.holds") },
    { icon: ShieldCheck, label: t("highlights.audit") },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel: the dark palette whatever the theme (`scope-dark`), dot grid, grain and two slow
          glows; no photography to download. */}
      <aside className="scope-dark grain relative hidden overflow-hidden bg-bg text-fg lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="dot-grid absolute inset-0 opacity-70 mask-[radial-gradient(ellipse_at_30%_25%,black,transparent_70%)]" />
          <div className="stage-aurora absolute -start-32 -top-32 size-[34rem] rounded-full bg-accent-soft blur-3xl" />
          <div className="stage-aurora absolute -end-40 -bottom-40 size-[30rem] rounded-full bg-accent-soft blur-3xl [animation-delay:-7s]" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-sm text-fg-secondary transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToHome")}
          </Link>

          <div>
            <BrandMark size={44} className="text-accent-text" />
            <h2 className="mt-8 max-w-lg text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance xl:text-6xl">
              {hero("titleLead")}{" "}
              <span className="font-serif font-normal tracking-[-0.02em] text-fg-secondary italic">
                {hero("titleTail")}
              </span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-secondary">
              {t("panelBody")}
            </p>

            <ol className="mt-10 max-w-md divide-y divide-border border-y border-border">
              {highlights.map((item, index) => (
                <li key={item.label} className="flex items-center gap-4 py-4 text-sm">
                  <span aria-hidden="true" className="font-mono text-xs text-fg-tertiary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <item.icon className="size-4 shrink-0 text-accent-text" aria-hidden />
                  <span className="font-medium">{item.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="font-mono text-xs tracking-[0.14em] text-fg-tertiary uppercase">
            {BRAND.name} · {BRAND.subtitle}
          </p>
        </div>
      </aside>

      <div className="relative flex flex-col bg-bg">
        <div className="absolute end-6 top-6 z-10 flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle compact />
        </div>

        <main
          id="main"
          className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10"
        >
          <div className="w-full max-w-md">
            <div className="mb-8">
              <BrandLogo size="lg" showSubtitle />
            </div>

            <div className="rounded-3xl border border-border bg-surface p-8 sm:p-10">
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-fg">{t("title")}</h1>
              <p className="mt-2 text-sm text-fg-secondary">{t("subtitle")}</p>

              <div className="mt-8">
                <Suspense fallback={null}>
                  <LoginForm initialStep={initialStep} />
                </Suspense>
              </div>
            </div>

            <p className="mt-6 text-center text-xs lg:hidden">
              <Link href="/" className="text-accent-text underline-offset-2 hover:underline">
                ← {t("backToHome")}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
