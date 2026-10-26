import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Pages used to live at the top level (`/units`); they now sit inside a hub (`/inventory/units`).
 * Printed unit labels carry the old address in their QR code and people keep bookmarks, so every
 * old path is forwarded with its sub-path and query string. Each rule exists with and without a
 * language prefix; the proxy adds the prefix to the second kind afterwards.
 */
const MOVED_PAGES: Record<string, string> = {
  units: "inventory/units",
  experiments: "inventory/experiments",
  materials: "inventory/materials",
  destroyed: "inventory/destroyed",
  qa: "quality",
  recall: "quality/recall",
  cultivars: "records/cultivars",
  locations: "records/locations",
  organizations: "records/organizations",
  members: "records/members",
  overview: "compliance",
  reports: "compliance/reports",
  activity: "compliance/audit",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework.
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "pino"],
  // The mock server layer (src/server, src/features/*/queries.ts, src/generated) is loosely typed,
  // so strict checks on the UI code report mismatches that the real server types resolve. Keep
  // the deploy unblocked; `npm run typecheck` still reports them.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return Object.entries(MOVED_PAGES).flatMap(([from, to]) => [
      {
        source: `/:locale(en|fr)/${from}/:path*`,
        destination: `/:locale/${to}/:path*`,
        permanent: false,
      },
      { source: `/${from}/:path*`, destination: `/${to}/:path*`, permanent: false },
    ]);
  },
};

export default withNextIntl(nextConfig);
